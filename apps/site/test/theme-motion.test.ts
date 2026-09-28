import { describe, expect, it, vi } from 'vitest';
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

const harness = (options: { scene?: boolean; reduced?: boolean } = {}) => {
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
    getComputedStyle: () => ({ getPropertyValue: (name: string) => name === '--slt-motion-scene' ? '720ms' : '' }),
  };
  const root = { dataset: {}, ownerDocument: documentLike } as unknown as HTMLElement;
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
  const clock = { now: 0 };
  // An animation starts on the frame after it is created, as in the engines.
  const animate = vi.fn((): ThemeMotionAnimation => {
    const completion = deferred<void>();
    const animation: ThemeMotionAnimation = { finished: completion.promise, ready: Promise.resolve(), startTime: clock.now + 16, cancel: vi.fn() };
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
    now: () => clock.now,
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
    clock,
    windowLike,
    root,
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

// Every engine skips a root view transition when the viewport changes size, which cut the page wipe short mid-scene.
describe('a viewport resize during the page scene', () => {
  const resized = async () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    const heard = vi.fn(); controller.subscribe(heard);
    controller.request('light');
    h.transitions[0]!.update();
    h.transitions[0]!.ready.resolve(); await flush();
    const committed = controller.generation;
    h.clock.now = 300; h.windowLike.innerWidth = 759;
    h.transitions[0]!.finished.resolve(); await flush();
    return { h, controller, heard, committed };
  };

  it('resumes the wipe from its progress on the new viewport and ends at the original deadline', async () => {
    const { h, controller, heard, committed } = await resized();
    expect(h.startViewTransition).toHaveBeenCalledTimes(2);
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.root.dataset['themeTransition']).toBe('');
    expect(h.animations[0]!.cancel).toHaveBeenCalled();
    h.animationCompletions[0]!.reject(new Error('cancelled')); await flush();
    expect(h.transitions[1]!.transition.skipTransition).not.toHaveBeenCalled();
    h.transitions[1]!.update();
    expect(h.root.dataset.theme).toBe('light');
    expect(controller.theme).toBe('light');
    expect(controller.generation).toBe(committed);
    expect(heard).toHaveBeenCalledTimes(1);
    h.clock.now = 330;
    h.transitions[1]!.ready.resolve(); await flush();
    expect(h.animate).toHaveBeenLastCalledWith(h.root, [
      { clipPath: 'polygon(-600px 0, -600px 0, 0 100%, 0 100%)' },
      { clipPath: 'polygon(-600px 0, 759px 0, 1359px 100%, 0 100%)' },
    ], { duration: 720, easing: 'linear', pseudoElement: '::view-transition-new(root)' });
    expect(h.animations[1]!.startTime).toBe(16);
    h.transitions[0]!.finished.resolve(); await flush();
    expect(h.root.dataset['themeTransition']).toBe('');
    h.clock.now = 720;
    h.transitions[1]!.finished.resolve(); await flush();
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    expect(h.root.dataset.theme).toBe('light');
    expect(h.startViewTransition).toHaveBeenCalledTimes(2);
  });

  it('resumes again when the resumed snapshot is itself resized away', async () => {
    const { h } = await resized();
    h.transitions[1]!.update();
    h.clock.now = 400; h.windowLike.innerWidth = 1100;
    h.transitions[1]!.ready.reject(new Error('skipped')); await flush();
    expect(h.startViewTransition).toHaveBeenCalledTimes(3);
    expect(h.root.dataset.theme).toBe('dark');
    h.transitions[2]!.update(); h.transitions[2]!.ready.resolve(); await flush();
    expect(h.animations.at(-1)!.startTime).toBe(16);
  });

  it('ends a skip without a resize, or past the deadline, without resuming', async () => {
    const h = harness({ scene: true });
    const controller = initializeTheme(h.environment);
    controller.request('light'); h.transitions[0]!.update(); h.transitions[0]!.ready.resolve(); await flush();
    h.clock.now = 300; h.transitions[0]!.finished.resolve(); await flush();
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
    expect(h.root.dataset['themeTransition']).toBeUndefined();

    controller.request('dark'); h.transitions[1]!.update(); h.transitions[1]!.ready.resolve(); await flush();
    h.clock.now = 1100; h.windowLike.innerWidth = 759; h.transitions[1]!.finished.resolve(); await flush();
    expect(h.startViewTransition).toHaveBeenCalledTimes(2);
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.root.dataset['themeTransition']).toBeUndefined();
  });

  it('settles a resumed scene on the latest scheme on a new choice, reduced motion, hiding and storage', async () => {
    const choice = await resized();
    choice.controller.request('dark');
    expect(choice.h.root.dataset.theme).toBe('light');
    expect(choice.h.transitions[1]!.transition.skipTransition).toHaveBeenCalled();
    choice.h.transitions[1]!.update();
    expect(choice.h.root.dataset.theme).toBe('light');
    choice.h.transitions[2]!.update();
    expect(choice.h.root.dataset.theme).toBe('dark');

    const reduced = await resized();
    reduced.h.reduced.matches = true; reduced.h.reduced.dispatch('change', { matches: true } as unknown as Event);
    expect(reduced.h.root.dataset.theme).toBe('light');
    expect(reduced.h.root.dataset['themeTransition']).toBeUndefined();
    reduced.h.transitions[1]!.update();
    expect(reduced.h.root.dataset.theme).toBe('light');

    const hidden = await resized();
    hidden.h.documentLike.visibilityState = 'hidden'; hidden.h.documentLike.dispatch('visibilitychange', new Event('visibilitychange'));
    expect(hidden.h.root.dataset.theme).toBe('light');
    expect(hidden.h.root.dataset['themeTransition']).toBeUndefined();

    const storage = await resized();
    storage.h.page.dispatch('storage', { key: 'aion-site-theme', newValue: 'dark', storageArea: storage.h.environment.storage } as unknown as Event);
    expect(storage.h.root.dataset.theme).toBe('dark');
    expect(storage.h.root.dataset['themeTransition']).toBeUndefined();
  });
});
