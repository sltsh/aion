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
  const control = { hidden: true } as HTMLFieldSetElement;
  const inputListeners = new Map<string, EventListener>();
  const input = (value: string): HTMLInputElement => ({
    value,
    checked: false,
    addEventListener: (_type: string, listener: EventListener) => { inputListeners.set(value, listener); },
    removeEventListener: (_type: string, _listener: EventListener) => { inputListeners.delete(value); },
  } as unknown as HTMLInputElement);
  const dark = input('dark');
  const light = input('light');
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
    control,
    inputs: [dark, light],
    media: system as unknown as MediaQueryList,
    storage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { writes.push(value); stored.set(key, value); },
    },
    updateAssets: theme => assets.push(theme),
    motion,
  };
  const click = (theme: 'dark' | 'light'): void => {
    const choice = theme === 'dark' ? dark : light;
    choice.checked = true;
    inputListeners.get(theme)?.({ currentTarget: choice } as unknown as Event);
  };
  return {
    environment,
    root,
    control,
    dark,
    light,
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
    assets,
    click,
  };
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('explicit theme Replace scenes', () => {
  it('runs the shared 720ms linear diagonal scene in both directions', async () => {
    const h = harness({ scene: true });
    initializeTheme(h.environment);
    expect(h.root.dataset.theme).toBe('dark');

    h.click('light');
    expect(h.startViewTransition).toHaveBeenCalledTimes(1);
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.light.checked).toBe(false);
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
    h.transitions[0]!.finished.resolve();
    await flush();
    expect(h.root.dataset['themeTransition']).toBeUndefined();

    h.click('dark');
    expect(h.startViewTransition).toHaveBeenCalledTimes(2);
    h.transitions[1]!.update();
    expect(h.root.dataset.theme).toBe('dark');
  });

  it('commits system, unchanged, reduced and unsupported changes without a scene', () => {
    const h = harness();
    initializeTheme(h.environment);
    h.system.matches = true;
    h.system.dispatch('change', { matches: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('light');
    expect(h.startViewTransition).not.toHaveBeenCalled();

    h.click('light');
    expect(h.root.dataset.theme).toBe('light');
    expect(h.writes).toEqual(['light']);

    const reduced = harness({ scene: true, reduced: true });
    initializeTheme(reduced.environment);
    reduced.click('light');
    expect(reduced.root.dataset.theme).toBe('light');
    expect(reduced.startViewTransition).not.toHaveBeenCalled();
  });

  it('lets the latest radio choice supersede a deferred callback', () => {
    const h = harness({ scene: true });
    initializeTheme(h.environment);
    h.click('light');
    const first = h.transitions[0]!;
    h.click('dark');

    expect(first.transition.skipTransition).toHaveBeenCalledTimes(1);
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    first.update();
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.dark.checked).toBe(true);
    expect(h.light.checked).toBe(false);
  });

  it('settles ready rejection, animation failure, blocked storage and missing APIs', async () => {
    const rejected = harness({ scene: true });
    initializeTheme(rejected.environment);
    rejected.click('light');
    rejected.transitions[0]!.ready.reject(new Error('ready'));
    await flush();
    expect(rejected.root.dataset.theme).toBe('light');
    expect(rejected.root.dataset['themeTransition']).toBeUndefined();

    const broken = harness({ scene: true });
    broken.animate.mockImplementation(() => { throw new Error('animate'); });
    initializeTheme(broken.environment);
    broken.click('light');
    broken.transitions[0]!.update();
    broken.transitions[0]!.ready.resolve();
    await flush();
    expect(broken.root.dataset.theme).toBe('light');
    expect(broken.root.dataset['themeTransition']).toBeUndefined();

    const finished = harness({ scene: true });
    initializeTheme(finished.environment);
    finished.click('light');
    finished.transitions[0]!.update();
    finished.transitions[0]!.ready.resolve();
    await flush();
    finished.transitions[0]!.finished.reject(new Error('finished'));
    await flush();
    expect(finished.root.dataset.theme).toBe('light');
    expect(finished.root.dataset['themeTransition']).toBeUndefined();
    expect(finished.animations[0]!.cancel).toHaveBeenCalledTimes(1);

    const blocked = harness();
    initializeTheme({ ...blocked.environment, storage: { getItem: () => null, setItem: () => { throw new Error('blocked'); } } });
    blocked.click('light');
    expect(blocked.root.dataset.theme).toBe('light');

    const unavailable = harness();
    initializeTheme(unavailable.environment);
    unavailable.click('light');
    expect(unavailable.root.dataset.theme).toBe('light');
    expect(unavailable.root.dataset['themeTransition']).toBeUndefined();
  });

  it('settles synchronously when reduced motion or lifecycle interrupts a scene', () => {
    const h = harness({ scene: true });
    const teardown = initializeTheme(h.environment);
    h.click('light');
    h.reduced.matches = true;
    h.reduced.dispatch('change', { matches: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('light');
    expect(h.root.dataset['themeTransition']).toBeUndefined();

    h.click('dark');
    h.documentLike.visibilityState = 'hidden';
    h.documentLike.dispatch('visibilitychange', new Event('visibilitychange'));
    expect(h.root.dataset.theme).toBe('dark');

    h.click('light');
    h.page.dispatch('pagehide', new Event('pagehide'));
    expect(h.root.dataset.theme).toBe('light');
    h.page.dispatch('pageshow', { persisted: true } as unknown as Event);
    expect(h.root.dataset['themeTransition']).toBeUndefined();

    h.click('dark');
    teardown();
    expect(h.root.dataset.theme).toBe('dark');
    expect(h.root.dataset['themeTransition']).toBeUndefined();
    h.system.dispatch('change', { matches: true } as unknown as Event);
    expect(h.root.dataset.theme).toBe('dark');
  });
});
