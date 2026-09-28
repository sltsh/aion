import { describe, expect, it, vi } from 'vitest';
import { mountChip } from '../src/chip.js';
import { initializeTheme, type ThemeEnvironment, type ThemeMotionAnimation, type ThemeMotionEnvironment, type ThemeViewTransition } from '../src/theme.js';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const source = () => {
  const listeners = new Map<string, Set<EventListener>>();
  return {
    addEventListener(type: string, listener: EventListener): void {
      const callbacks = listeners.get(type) ?? new Set<EventListener>();
      callbacks.add(listener);
      listeners.set(type, callbacks);
    },
    removeEventListener(type: string, listener: EventListener): void {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type: string, event: Event): void {
      listeners.get(type)?.forEach(listener => listener(event));
    },
  };
};

const harness = (options: { scene?: boolean; reduced?: boolean; css?: boolean } = {}) => {
  const system = Object.assign(source(), { matches: false });
  const reduced = Object.assign(source(), { matches: options.reduced === true });
  const page = source();
  const documentLike = {
    ...source(),
    visibilityState: 'visible' as DocumentVisibilityState,
  };
  const windowLike = {
    ...page,
    innerWidth: 800,
    innerHeight: 600,
    getComputedStyle: () => ({ clipPath: options.css ? 'none' : undefined, getPropertyValue: (name: string) => name === '--slt-motion-scene' ? '720ms' : '' }),
  };
  const properties = new Map<string, string>();
  const root = {
    dataset: {},
    ownerDocument: documentLike,
    style: {
      setProperty: (name: string, value: string) => { properties.set(name, value); },
      removeProperty: (name: string) => { properties.delete(name); },
    },
  } as unknown as HTMLElement;
  const stored = new Map<string, string>();
  const writes: string[] = [];
  const assets: string[] = [];
  const transitions: Array<{ transition: ThemeViewTransition; update: () => void; ready: Deferred<void>; finished: Deferred<void> }> = [];
  const animations: ThemeMotionAnimation[] = [];
  const animationCompletions: Deferred<void>[] = [];
  const startViewTransition = vi.fn((update: () => void): ThemeViewTransition => {
    const ready = deferred<void>();
    const finished = deferred<void>();
    const transition: ThemeViewTransition = { ready: ready.promise, finished: finished.promise, skipTransition: vi.fn() };
    transitions.push({ transition, update, ready, finished });
    return transition;
  });
  const animate = vi.fn((): ThemeMotionAnimation => {
    const completion = deferred<void>();
    const animation: ThemeMotionAnimation = { finished: completion.promise, cancel: vi.fn() };
    animations.push(animation);
    animationCompletions.push(completion);
    return animation;
  });
  const motion: ThemeMotionEnvironment | undefined = options.scene ? {
    document: documentLike as unknown as Document,
    window: windowLike as unknown as Window,
    reducedMotion: reduced as unknown as MediaQueryList,
    startViewTransition,
    animate,
  } : {
    document: documentLike as unknown as Document,
    window: windowLike as unknown as Window,
    reducedMotion: reduced as unknown as MediaQueryList,
  };
  const environment: ThemeEnvironment = {
    root,
    storageEvents: page,
    media: system as unknown as MediaQueryList,
    storage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { writes.push(value); stored.set(key, value); },
    },
    updateAssets: theme => assets.push(theme),
    motion,
  };
  return {
    environment,
    windowLike,
    root,
    properties,
    system,
    reduced,
    documentLike,
    page,
    transitions,
    animations,
    animationCompletions,
    startViewTransition,
    animate,
    writes,
    stored,
    assets,
  };
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('explicit theme Replace scenes', () => {
  it('runs the shared 720ms linear diagonal scene in both directions', async () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    expect(h.root.dataset.theme).toBe('dark');

    controller.request('light');
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
    expect(h.root.dataset.theme).toBe('dark');
    expect(controller.theme).toBe('dark');
    h.transitions[0]!.update();
    expect(h.root.dataset.theme).toBe('light');
    h.transitions[0]!.ready.resolve();
    await flush();
    expect(h.animate).toHaveBeenCalledWith(h.root, [
      { clipPath: 'polygon(-600px 0, -600px 0, 0 100%, 0 100%)' },
      { clipPath: 'polygon(-600px 0, 800px 0, 1400px 100%, 0 100%)' },
    ], { duration: 720, easing: 'linear', pseudoElement: '::view-transition-new(root)' });
    expect(h.root.dataset.theme).toBe('light');
    h.animationCompletions[0]!.resolve();
    await flush();
    expect(h.root.dataset['themeTransition']).toBe('');
    h.transitions[0]!.finished.resolve();
    await flush();
    expect(h.root.dataset['themeTransition']).toBeUndefined();

    controller.request('dark');
    expect(h.startViewTransition).toHaveBeenCalledTimes(2);
    h.transitions[1]!.update();
    expect(h.root.dataset.theme).toBe('dark');
  });

  it('signals the scene start once its animation runs, never before ready or without a scene', async () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    const started = vi.fn();
    controller.request('light', { scene: 'wipe', onSceneStart: started });
    h.transitions[0]!.update();
    expect(started).not.toHaveBeenCalled();
    h.transitions[0]!.ready.resolve();
    await flush();
    expect(started).toHaveBeenCalledOnce();
    expect(started).toHaveBeenCalledWith(h.animations[0]);

    const skipped = vi.fn();
    const rejected = harness({ scene: true });
    initializeTheme(rejected.environment).request('light', { scene: 'wipe', onSceneStart: skipped });
    rejected.transitions[0]!.ready.reject(new Error('ready'));
    await flush();
    const unsupported = harness();
    initializeTheme(unsupported.environment).request('light', { scene: 'wipe', onSceneStart: skipped });
    expect(skipped).not.toHaveBeenCalled();
  });

  it('commits system, unchanged, reduced and unsupported changes without a scene', () => {
    const h = harness();
    const controller = initializeTheme(h.environment);
    h.system.matches = true;
    h.system.dispatch('change', { matches: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('light');
    expect(h.startViewTransition).not.toHaveBeenCalled();

    controller.request('light');
    expect(h.root.dataset.theme).toBe('light');
    expect(h.writes).toEqual(['light']);

    const reduced = harness({ scene: true, reduced: true });
    const reducedController = initializeTheme(reduced.environment);
    reducedController.request('light');
    expect(reduced.root.dataset.theme).toBe('light');
    expect(reduced.startViewTransition).not.toHaveBeenCalled();
  });

  it('lets the latest request supersede a deferred callback', () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    controller.request('light');
    const first = h.transitions[0]!;
    controller.request('dark');

    expect(first.transition.skipTransition).toHaveBeenCalledTimes(1);
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    first.update();
    expect(h.root.dataset.theme).toBe('dark');
    expect(controller.theme).toBe('dark');
  });

  it('settles ready rejection, animation failure, blocked storage and missing APIs', async () => {
    const rejected = harness({ scene: true });
    const rejectedController = initializeTheme(rejected.environment);
    rejectedController.request('light');
    rejected.transitions[0]!.ready.reject(new Error('ready'));
    await flush();
    expect(rejected.root.dataset.theme).toBe('light');
    expect(rejected.root.dataset['themeTransition']).toBeUndefined();

    const broken = harness({ scene: true });
    broken.animate.mockImplementation(() => { throw new Error('animate'); });
    const brokenController = initializeTheme(broken.environment);
    brokenController.request('light');
    broken.transitions[0]!.update();
    broken.transitions[0]!.ready.resolve();
    await flush();
    expect(broken.root.dataset.theme).toBe('light');
    expect(broken.root.dataset['themeTransition']).toBeUndefined();

    const finished = harness({ scene: true });
    const finishedController = initializeTheme(finished.environment);
    finishedController.request('light');
    finished.transitions[0]!.update();
    finished.transitions[0]!.ready.resolve();
    await flush();
    finished.transitions[0]!.finished.reject(new Error('finished'));
    await flush();
    expect(finished.root.dataset.theme).toBe('light');
    expect(finished.root.dataset['themeTransition']).toBeUndefined();
    expect(finished.animations[0]!.cancel).toHaveBeenCalledTimes(1);

    const blocked = harness();
    const blockedController = initializeTheme({ ...blocked.environment, storage: { getItem: () => null, setItem: () => { throw new Error('blocked'); } } });
    blockedController.request('light');
    expect(blocked.root.dataset.theme).toBe('light');

    const unavailable = harness();
    const unavailableController = initializeTheme(unavailable.environment);
    unavailableController.request('light');
    expect(unavailable.root.dataset.theme).toBe('light');
    expect(unavailable.root.dataset['themeTransition']).toBeUndefined();
  });

  it('does not notify a second commit when readiness rejects after the update callback', async () => {
    const h = harness({ scene: true }); const controller = initializeTheme(h.environment);
    const heard = vi.fn(); controller.subscribe(heard); controller.request('light');
    h.transitions[0]!.update(); const committed = controller.generation;
    h.transitions[0]!.ready.reject(new Error('snapshot failed')); await flush();
    expect(controller.generation).toBe(committed); expect(heard).toHaveBeenCalledTimes(1);
    expect(h.root.dataset['themeTransition']).toBeUndefined(); controller.dispose();
  });

  it('settles synchronously when reduced motion or lifecycle interrupts a scene', () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    controller.request('light');
    h.reduced.matches = true;
    h.reduced.dispatch('change', { matches: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('light');
    expect(h.root.dataset['themeTransition']).toBeUndefined();

    h.reduced.matches = false;
    h.reduced.dispatch('change', { matches: false } as unknown as Event);
    controller.request('dark');
    expect(h.root.dataset['themeTransition']).toBe('');
    h.documentLike.visibilityState = 'hidden';
    h.documentLike.dispatch('visibilitychange', new Event('visibilitychange'));
    expect(h.root.dataset.theme).toBe('dark');

    h.documentLike.visibilityState = 'visible';
    controller.request('light');
    expect(h.root.dataset['themeTransition']).toBe('');
    h.page.dispatch('pagehide', new Event('pagehide'));
    expect(h.root.dataset.theme).toBe('light');
    h.page.dispatch('pageshow', { persisted: true } as unknown as Event);
    expect(h.root.dataset['themeTransition']).toBeUndefined();

    controller.request('dark');
    controller.dispose();
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    h.system.dispatch('change', { matches: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('dark');
  });
  it('restores the latest stored choice and system following without replay', () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    h.stored.set('aion-site-theme', 'light');
    h.page.dispatch('pageshow', { persisted: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('light');
    expect(controller.theme).toBe('light');
    expect(h.startViewTransition).not.toHaveBeenCalled();
    h.stored.delete('aion-site-theme');
    h.page.dispatch('pageshow', { persisted: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('dark');
    h.system.dispatch('change', { matches: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('light');
  });

});


describe('theme controller ordering and subscriptions', () => {
  it('follows the system only without an explicit choice', () => {
    const h = harness(); const controller = initializeTheme(h.environment);
    h.system.dispatch('change', { matches: true } as unknown as Event);
    expect(controller.theme).toBe('light');
    controller.request('dark');
    h.system.dispatch('change', { matches: true } as unknown as Event);
    expect(controller.theme).toBe('dark');
  });
  it('honours storage changes, removal and invalid values without a scene', () => {
    const h = harness({ scene: true }); const controller = initializeTheme(h.environment);
    controller.request('light'); const pending = h.transitions[0]!;
    h.page.dispatch('storage', { key: 'aion-site-theme', newValue: 'dark' } as unknown as Event);
    pending.update(); expect(controller.theme).toBe('dark');
    expect(pending.transition.skipTransition).toHaveBeenCalledTimes(1);
    h.page.dispatch('storage', { key: 'aion-site-theme', newValue: 'invalid' } as unknown as Event);
    expect(controller.theme).toBe('dark');
    h.system.matches = true;
    h.page.dispatch('storage', { key: 'aion-site-theme', newValue: null } as unknown as Event);
    expect(controller.theme).toBe('light');
    h.system.dispatch('change', { matches: false } as unknown as Event);
    expect(controller.theme).toBe('dark');
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
  });
  it('increments on requests and commits; subscribers run after the DOM update once per commit', () => {
    const h = harness({ scene: true }); const controller = initializeTheme(h.environment);
    const start = controller.generation; const heard: string[] = [];
    const unsubscribe = controller.subscribe((theme, cause) => {
      expect(h.root.dataset.theme).toBe(theme); heard.push(theme + ':' + cause);
    });
    controller.request('light'); expect(controller.generation).toBe(start + 1);
    h.transitions[0]!.update(); expect(controller.generation).toBe(start + 2);
    h.page.dispatch('storage', { key: 'aion-site-theme', newValue: 'dark' } as unknown as Event);
    expect(controller.generation).toBe(start + 3);
    expect(heard).toEqual(['light:request', 'dark:storage']);
    unsubscribe(); controller.request('dark'); expect(heard).toHaveLength(2);
    controller.dispose();
  });
});

describe('a viewport resize during the page scene', () => {
  it('settles an active wipe without recapture, replay or another theme publication', async () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    const heard = vi.fn(); controller.subscribe(heard);
    controller.request('light'); h.transitions[0]!.update(); h.transitions[0]!.ready.resolve(); await flush();
    const committed = controller.generation;
    h.windowLike.innerWidth = 759; h.windowLike.dispatch('resize', new Event('resize'));
    expect(h.root.dataset.theme).toBe('light');
    expect(controller.theme).toBe('light');
    expect(controller.generation).toBe(committed);
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    expect(h.animations[0]!.cancel).toHaveBeenCalledTimes(1);
    expect(h.transitions[0]!.transition.skipTransition).toHaveBeenCalledTimes(1);
    h.animationCompletions[0]!.reject(new Error('cancelled'));
    h.transitions[0]!.finished.reject(new Error('obsolete')); await flush();
    expect(h.transitions[0]!.transition.skipTransition).toHaveBeenCalledTimes(1);
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
    expect(h.animate).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(h.writes).toEqual(['light']);
    expect(h.assets).toEqual(['dark', 'light']);
    controller.dispose();
  });

  it('commits the latest pending choice on resize and ignores every deferred old callback', async () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    const heard = vi.fn(); controller.subscribe(heard);
    controller.request('light');
    h.windowLike.dispatch('resize', new Event('resize'));
    expect(h.root.dataset.theme).toBe('light');
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    controller.request('dark');
    h.windowLike.dispatch('resize', new Event('resize'));
    h.transitions[0]!.update(); h.transitions[0]!.ready.reject(new Error('obsolete')); h.transitions[0]!.finished.resolve();
    h.transitions[1]!.update(); h.transitions[1]!.ready.resolve(); h.transitions[1]!.finished.reject(new Error('obsolete')); await flush();
    expect(h.root.dataset.theme).toBe('dark');
    expect(controller.theme).toBe('dark');
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    expect(h.startViewTransition).toHaveBeenCalledTimes(2);
    expect(h.animate).not.toHaveBeenCalled();
    expect(h.transitions.every(({ transition }) => vi.mocked(transition.skipTransition).mock.calls.length === 1)).toBe(true);
    expect(heard.mock.calls.map(([theme]) => theme)).toEqual(['light', 'dark']);
    expect(h.writes).toEqual(['light', 'dark']);
    expect(h.assets).toEqual(['dark', 'light', 'dark']);
    controller.dispose();
  });

  it('clears the CSS fallback on resize without replacing its transition', async () => {
    const h = harness({ scene: true, css: true });
    const controller = initializeTheme(h.environment);
    controller.request('light'); h.transitions[0]!.update(); h.transitions[0]!.ready.resolve(); await flush();
    expect(h.root.dataset['themeCssScene']).toBe('');
    expect(h.properties.get('--site-theme-width')).toBe('800px');
    h.windowLike.dispatch('resize', new Event('resize'));
    expect(h.root.dataset.theme).toBe('light');
    expect(h.root.dataset['themeCssScene']).toBeUndefined();
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    expect(h.properties.size).toBe(0);
    expect(h.transitions[0]!.transition.skipTransition).toHaveBeenCalledTimes(1);
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('starts no work when the scene has completed or the controller is disposed', async () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    const heard = vi.fn(); controller.subscribe(heard);
    controller.request('light'); h.transitions[0]!.update(); h.transitions[0]!.ready.resolve(); await flush();
    h.transitions[0]!.finished.resolve(); await flush();
    h.windowLike.dispatch('resize', new Event('resize'));
    expect(h.transitions[0]!.transition.skipTransition).not.toHaveBeenCalled();
    expect(h.animations[0]!.cancel).not.toHaveBeenCalled();
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledTimes(1);
    controller.dispose();
    h.windowLike.dispatch('resize', new Event('resize'));
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
    expect(h.assets).toEqual(['dark', 'light']);
  });
});


describe('chip during the page scene', () => {
  it('keeps its own wipe through the deferred request publication, then settles an external commit', () => {
    const h = harness({ scene: true }); const controller = initializeTheme(h.environment);
    let time = 0, id = 0;
    const frames = new Map<number, (time: number) => void>();
    const base = { dataset: {}, querySelectorAll: () => [] };
    const incoming = { ...base, dataset: {}, style: { clipPath: '' }, hidden: true };
    const attributes = new Map<string, string>();
    const button = Object.assign(source(), {
      ownerDocument: h.documentLike, dataset: {}, hidden: true, focus: vi.fn(),
      setAttribute: (key: string, value: string) => { attributes.set(key, value); },
      querySelector: (selector: string) => selector === '[data-chip-base]' ? base : incoming,
      getBoundingClientRect: () => ({ width: 144, height: 52 }),
    });
    const dispose = mountChip(button as unknown as HTMLButtonElement, controller, null, {
      now: () => time, raf: callback => { frames.set(++id, callback); return id; }, cancelRaf: key => { frames.delete(key); },
      reducedMotion: h.reduced as unknown as MediaQueryList, supportsViewTransitions: true,
    });
    button.dispatch('click', new Event('click'));
    expect(incoming.hidden).toBe(false); expect(h.root.dataset.theme).toBe('dark');
    h.transitions[0]!.update(); expect(attributes.get('aria-checked')).toBe('true'); expect(incoming.hidden).toBe(false);
    time = 360; const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(time));
    expect(incoming.style.clipPath).toBe('polygon(0 0, 98px 0, 46px 100%, 0 100%)');
    h.page.dispatch('storage', { key: 'aion-site-theme', newValue: 'dark' } as unknown as Event);
    expect(incoming.hidden).toBe(true); expect(frames.size).toBe(0); expect(attributes.get('aria-checked')).toBe('false');
    queued.forEach(callback => callback(720)); expect(frames.size).toBe(0); expect(incoming.hidden).toBe(true);
    dispose(); controller.dispose();
  });
});
