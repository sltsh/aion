import { INTRO_KEY } from './intro.js';

export const THEME_STORAGE_KEY = 'aion-site-theme';

export type Theme = 'dark' | 'light';
export type ThemeCause = 'request' | 'system' | 'storage' | 'restore';
export interface ThemeController {
  readonly theme: Theme;
  readonly generation: number;
  request(next: Theme, options?: { scene?: 'wipe' | 'none' }): void;
  subscribe(listener: (theme: Theme, cause: ThemeCause) => void): () => void;
  dispose(): void;
}

export interface ThemeViewTransition {
  readonly ready: Promise<unknown>;
  readonly finished: Promise<unknown>;
  skipTransition: () => void;
}

export interface ThemeMotionAnimation {
  readonly finished?: Promise<unknown>;
  readonly ready?: Promise<unknown>;
  startTime?: CSSNumberish | null;
  cancel: () => void;
}

export interface ThemeMotionEnvironment {
  readonly document?: Document;
  readonly window?: Window;
  readonly reducedMotion?: MediaQueryList | null;
  readonly startViewTransition?: (update: () => void) => ThemeViewTransition;
  readonly animate?: (root: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => ThemeMotionAnimation;
  readonly now?: () => number;
}

export interface ThemeEnvironment {
  readonly root: HTMLElement;
  readonly media: MediaQueryList;
  readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  readonly storageEvents?: EventSourceLike;
  readonly updateAssets: (theme: Theme) => void;
  readonly motion?: ThemeMotionEnvironment;
}

export const syncFavicons = (icons: Iterable<HTMLLinkElement>, theme: Theme): void => {
  for (const icon of icons) icon.media = icon.dataset['themeFavicon'] === theme ? 'all' : 'not all';
};

const isTheme = (value: string | null): value is Theme => value === 'dark' || value === 'light';

export const readTheme = (storage: Pick<Storage, 'getItem'> | null): Theme | undefined => {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isTheme(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

export const resolveTheme = (saved: Theme | undefined, systemIsLight: boolean): Theme =>
  saved ?? (systemIsLight ? 'light' : 'dark');

export const themeBootstrap = (): string => `<script>(function(){function set(theme){document.documentElement.dataset.theme=theme;document.querySelectorAll('link[data-theme-favicon]').forEach(function(link){link.media=link.getAttribute('data-theme-favicon')===theme?'all':'not all'})}try{var key='${THEME_STORAGE_KEY}',saved;try{saved=localStorage.getItem(key)}catch(e){}set(saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}catch(e){set(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}try{var path=window.location.pathname;if((path==='/'||path==='/index.html')&&!window.location.hash&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&window.sessionStorage.getItem('${INTRO_KEY}')===null){document.documentElement.dataset.intro='pending';window.setTimeout(function(){if(document.documentElement.dataset.intro==='pending')delete document.documentElement.dataset.intro},4000)}}catch(e){}})();</script>`;

const scheduleFrame = (callback: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
    const handle = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(handle);
  }
  const handle = setTimeout(callback, 0);
  return () => clearTimeout(handle);
};

interface EventSourceLike {
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

interface MediaQueryLike extends EventSourceLike {
  readonly matches: boolean;
}

interface ActiveThemeScene {
  generation: number;
  readonly theme: Theme;
  readonly outgoing: Theme;
  transition: ThemeViewTransition | undefined;
  animation: ThemeMotionAnimation | undefined;
  start: number | undefined;
  duration: number;
  width: number;
  height: number;
}

const addListener = (target: EventSourceLike | null | undefined, type: string, listener: EventListener): void => {
  target?.addEventListener?.(type, listener);
};

const removeListener = (target: EventSourceLike | null | undefined, type: string, listener: EventListener): void => {
  target?.removeEventListener?.(type, listener);
};

const addMediaListener = (media: MediaQueryLike | null | undefined, listener: EventListener): void => {
  if (media?.addEventListener) media.addEventListener('change', listener);
  else (media as MediaQueryList & { addListener?: (callback: EventListener) => void } | null | undefined)?.addListener?.(listener);
};

const removeMediaListener = (media: MediaQueryLike | null | undefined, listener: EventListener): void => {
  if (media?.removeEventListener) media.removeEventListener('change', listener);
  else (media as MediaQueryList & { removeListener?: (callback: EventListener) => void } | null | undefined)?.removeListener?.(listener);
};

const safeSkip = (transition: ThemeViewTransition | undefined): void => {
  try {
    transition?.skipTransition();
  } catch {
    // A transition that has already settled needs no further work.
  }
};

const safeCancel = (animation: ThemeMotionAnimation | undefined): void => {
  try {
    animation?.cancel();
  } catch {
    // A cancelled animation can reject while its owner is being torn down.
  }
};

export function initializeTheme(environment: ThemeEnvironment): ThemeController {
  let explicit = readTheme(environment.storage);
  const subscribers = new Set<(theme: Theme, cause: ThemeCause) => void>();
  let requestedCause: ThemeCause = 'restore';
  let cancelSuppressionRelease: (() => void) | undefined;
  let disposed = false;
  let generation = 0;
  let activeScene: ActiveThemeScene | undefined;
  let pendingStoredTheme: Theme | undefined;
  let renderedTheme: Theme;
  let requestedTheme: Theme;

  const ownerDocument = environment.motion?.document ?? environment.root.ownerDocument;
  const ownerWindow = environment.motion?.window ?? ownerDocument?.defaultView ?? undefined;
  const reducedMotion = environment.motion?.reducedMotion
    ?? ownerWindow?.matchMedia?.('(prefers-reduced-motion: reduce)');

  const sceneDuration = (): number => {
    try {
      const style = ownerWindow?.getComputedStyle(environment.root);
      const value = style?.getPropertyValue('--slt-motion-scene').trim() ?? '';
      const match = /^(\d+(?:\.\d+)?)(ms|s)?$/i.exec(value);
      if (match) {
        const amount = Number(match[1]);
        return match[2]?.toLowerCase() === 's' ? amount * 1000 : amount;
      }
    } catch {
      // A style read is advisory; the shared scene default remains valid.
    }
    return 720;
  };

  const viewport = (): { width: number; height: number } => {
    const width = ownerWindow?.innerWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
    const height = ownerWindow?.innerHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 0);
    return {
      width: Number.isFinite(width) ? Math.max(0, width) : 0,
      height: Number.isFinite(height) ? Math.max(0, height) : 0,
    };
  };

  const rootAnimation = (keyframes: Keyframe[], options: KeyframeAnimationOptions): ThemeMotionAnimation | undefined => {
    if (environment.motion?.animate) return environment.motion.animate(environment.root, keyframes, options);
    const animate = (environment.root as HTMLElement & {
      animate?: (frames: Keyframe[], timing: KeyframeAnimationOptions) => ThemeMotionAnimation;
    }).animate;
    return animate?.call(environment.root, keyframes, options);
  };

  const startViewTransition = (update: () => void): ThemeViewTransition | undefined => {
    if (environment.motion?.startViewTransition) return environment.motion.startViewTransition(update);
    const start = (ownerDocument as Document & {
      startViewTransition?: (callback: () => void) => ThemeViewTransition;
    } | undefined)?.startViewTransition;
    return start?.call(ownerDocument, update);
  };

  const supportsViewTransition = (): boolean => {
    if (environment.motion?.startViewTransition) return true;
    return typeof (ownerDocument as Document & { startViewTransition?: unknown } | undefined)?.startViewTransition === 'function';
  };

  const supportsRootAnimation = (): boolean => {
    if (environment.motion?.animate) return true;
    return typeof (environment.root as HTMLElement & { animate?: unknown }).animate === 'function';
  };

  const motionIsReduced = (): boolean => reducedMotion?.matches === true;

  const now = (): number => environment.motion?.now?.() ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const releaseSuppression = (): void => {
    cancelSuppressionRelease = undefined;
    delete environment.root.dataset['themeSwap'];
  };

  const persistPending = (theme: Theme): void => {
    if (pendingStoredTheme !== theme) return;
    pendingStoredTheme = undefined;
    try {
      environment.storage?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Switching remains local to the current document when storage is unavailable.
    }
  };

  const apply = (theme: Theme, cause: ThemeCause = requestedCause, scene?: ActiveThemeScene): void => {
    generation += 1;
    if (scene && activeScene === scene) scene.generation = generation;
    cancelSuppressionRelease?.();
    environment.root.dataset['themeSwap'] = '';
    environment.root.dataset.theme = theme;
    environment.updateAssets(theme);
    renderedTheme = theme;
    persistPending(theme);
    cancelSuppressionRelease = scheduleFrame(releaseSuppression);
    for (const listener of subscribers) listener(theme, cause);
  };

  // Swaps the painted scheme without a commit: a resumed scene shows its outgoing scheme for the snapshot, then the rendered one.
  const paintScheme = (theme: Theme): void => {
    cancelSuppressionRelease?.();
    environment.root.dataset['themeSwap'] = '';
    environment.root.dataset.theme = theme;
    cancelSuppressionRelease = scheduleFrame(releaseSuppression);
  };

  const clearSceneMarker = (): void => {
    delete environment.root.dataset['themeTransition'];
    delete environment.root.dataset['themeCssScene'];
    environment.root.style?.removeProperty('--site-theme-width');
    environment.root.style?.removeProperty('--site-theme-height');
    environment.root.style?.removeProperty('--site-theme-delay');
    if (renderedTheme !== undefined && environment.root.dataset.theme !== renderedTheme) paintScheme(renderedTheme);
  };

  const invalidateScene = (): void => {
    const scene = activeScene;
    activeScene = undefined;
    if (!scene) {
      clearSceneMarker();
      return;
    }
    safeCancel(scene.animation);
    safeSkip(scene.transition);
    clearSceneMarker();
  };

  const settleLatest = (): void => {
    invalidateScene();
    if (renderedTheme !== requestedTheme || pendingStoredTheme !== undefined) apply(requestedTheme);
  };

  const finishScene = (scene: ActiveThemeScene): void => {
    if (activeScene !== scene) return;
    activeScene = undefined;
    clearSceneMarker();
    if (!disposed && renderedTheme !== requestedTheme) apply(requestedTheme);
  };

  const watchPromise = (promise: Promise<unknown> | undefined, onFulfilled: () => void, onRejected: () => void): void => {
    if (!promise) return;
    void promise.then(onFulfilled, onRejected).catch(onRejected);
  };

  const runSceneAnimation = (scene: ActiveThemeScene): void => {
    if (activeScene !== scene || scene.generation !== generation || disposed || motionIsReduced()) return;
    const { width, height } = viewport();
    scene.start ??= now();
    const elapsed = Math.max(0, now() - scene.start);
    if (elapsed >= scene.duration) {
      safeSkip(scene.transition);
      finishScene(scene);
      return;
    }
    let animation: ThemeMotionAnimation | undefined;
    try {
      animation = rootAnimation([
        { clipPath: `polygon(${-height}px 0, ${-height}px 0, 0 100%, 0 100%)` },
        { clipPath: `polygon(${-height}px 0, ${width}px 0, ${width + height}px 100%, 0 100%)` },
      ], { duration: scene.duration, easing: 'linear', pseudoElement: '::view-transition-new(root)' });
    } catch {
      safeSkip(scene.transition);
      settleLatest();
      return;
    }
    if (!animation) {
      safeSkip(scene.transition);
      settleLatest();
      return;
    }
    const transition = scene.transition;
    // A resumed reveal shares the first one's start time on the document timeline, so it keeps the original deadline.
    const anchor = (reveal: ThemeMotionAnimation): void => {
      if (elapsed > 0) reveal.startTime = scene.start ?? null;
      else watchPromise(reveal.ready, () => {
        if (current(scene, transition) && typeof reveal.startTime === 'number') scene.start = reveal.startTime;
      }, () => {});
    };
    // Firefox can accept the pseudoElement option without painting its clip.
    // The same scene expressed in CSS keeps the native snapshot transition.
    if (ownerWindow?.getComputedStyle(environment.root, '::view-transition-new(root)').clipPath === 'none') {
      void animation.finished?.catch(() => {});
      safeCancel(animation);
      environment.root.style.setProperty('--site-theme-width', `${width}px`);
      environment.root.style.setProperty('--site-theme-height', `${height}px`);
      environment.root.dataset['themeCssScene'] = '';
      const reveal = ownerDocument?.getAnimations?.().find((candidate) => (candidate.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)');
      if (reveal) anchor(reveal);
      else environment.root.style.setProperty('--site-theme-delay', `${-elapsed}ms`);
      return;
    }
    scene.animation = animation;
    anchor(animation);
    watchPromise(animation.finished, () => {}, () => {
      if (!current(scene, transition)) return;
      safeSkip(transition);
      finishScene(scene);
    });
  };

  const current = (scene: ActiveThemeScene, transition: ThemeViewTransition | undefined): boolean =>
    activeScene === scene && scene.transition === transition && scene.generation === generation && !disposed;

  const resized = (scene: ActiveThemeScene): boolean => {
    const { width, height } = viewport();
    return width !== scene.width || height !== scene.height;
  };

  // Every engine skips a root view transition when the viewport changes size. A skip this controller did not ask for, before the
  // scene's deadline, is resumed: the outgoing scheme is painted again for a new snapshot at the new size, and the reveal
  // continues from the progress it had, so the scene still ends at its original deadline.
  const resumable = (scene: ActiveThemeScene): boolean =>
    ownerDocument?.visibilityState !== 'hidden' && !motionIsReduced() && resized(scene)
    && (scene.start === undefined || now() < scene.start + scene.duration);

  const startSceneTransition = (scene: ActiveThemeScene, resumed: boolean): void => {
    const size = viewport();
    scene.width = size.width;
    scene.height = size.height;
    scene.animation = undefined;
    let transition: ThemeViewTransition | undefined;
    const settleWithout = (): void => {
      if (activeScene !== scene || scene.generation !== generation) return;
      if (renderedTheme !== scene.theme || pendingStoredTheme !== undefined) apply(scene.theme);
      invalidateScene();
    };
    try {
      transition = startViewTransition(() => {
        if (!current(scene, transition)) return;
        if (resumed) paintScheme(renderedTheme);
        else apply(scene.theme, 'request', scene);
      });
    } catch {
      settleWithout();
      return;
    }
    if (!transition) {
      settleWithout();
      return;
    }
    const started = transition;
    scene.transition = started;
    const resume = (): void => {
      if (renderedTheme !== scene.theme) apply(scene.theme, 'request', scene);
      delete environment.root.dataset['themeCssScene'];
      paintScheme(scene.outgoing);
      startSceneTransition(scene, true);
    };
    watchPromise(started.ready, () => {
      if (current(scene, started)) runSceneAnimation(scene);
    }, () => {
      if (!current(scene, started)) return;
      if (resumable(scene)) {
        resume();
        return;
      }
      if (renderedTheme !== scene.theme || pendingStoredTheme !== undefined) apply(scene.theme, 'request', scene);
      safeSkip(started);
      finishScene(scene);
    });
    watchPromise(started.finished, () => {
      if (!current(scene, started)) return;
      if (resumable(scene)) {
        safeCancel(scene.animation);
        resume();
        return;
      }
      finishScene(scene);
    }, () => {
      if (!current(scene, started)) return;
      safeCancel(scene.animation);
      if (renderedTheme !== requestedTheme) apply(requestedTheme);
      finishScene(scene);
    });
    if (!current(scene, started)) safeSkip(started);
  };

  const beginScene = (theme: Theme): void => {
    const sceneGeneration = generation;
    invalidateScene();
    environment.root.dataset['themeTransition'] = '';
    const scene: ActiveThemeScene = {
      generation: sceneGeneration,
      theme,
      outgoing: renderedTheme,
      transition: undefined,
      animation: undefined,
      start: undefined,
      duration: sceneDuration(),
      width: 0,
      height: 0,
    };
    activeScene = scene;
    startSceneTransition(scene, false);
  };

  const request = (next: Theme, { scene = 'wipe' }: { scene?: 'wipe' | 'none' } = {}): void => {
    if (disposed) return;
    generation += 1;
    explicit = next;
    pendingStoredTheme = next;
    requestedTheme = next;
    requestedCause = 'request';
    if (scene === 'none' || next === renderedTheme || motionIsReduced() || !supportsViewTransition() || !supportsRootAnimation()) {
      invalidateScene();
      apply(next);
      return;
    }
    beginScene(next);
  };

  const onStorage: EventListener = (event) => {
    const change = event as StorageEvent;
    if (disposed || (change.key !== THEME_STORAGE_KEY && change.key !== null)) return;
    if (change.storageArea && change.storageArea !== environment.storage) return;
    if (change.newValue !== null && !isTheme(change.newValue)) return;
    explicit = isTheme(change.newValue) ? change.newValue : undefined;
    pendingStoredTheme = undefined;
    requestedTheme = resolveTheme(explicit, environment.media.matches);
    requestedCause = 'storage';
    invalidateScene();
    apply(requestedTheme);
  };

  const onSystemChange = (event: MediaQueryListEvent): void => {
    if (disposed || explicit !== undefined) return;
    requestedTheme = event.matches ? 'light' : 'dark';
    requestedCause = 'system';
    invalidateScene();
    apply(requestedTheme);
  };

  const onReducedMotionChange: EventListener = (event) => {
    if (disposed) return;
    const matches = 'matches' in event ? Boolean((event as MediaQueryListEvent).matches) : motionIsReduced();
    if (matches) settleLatest();
  };

  const onVisibilityChange: EventListener = () => {
    if (disposed || ownerDocument?.visibilityState !== 'hidden') return;
    settleLatest();
  };

  const onPageHide: EventListener = () => {
    if (!disposed) settleLatest();
  };

  const onPageShow: EventListener = (event) => {
    if (disposed || !(event as PageTransitionEvent).persisted) return;
    try {
      if (environment.storage) {
        const saved = environment.storage.getItem(THEME_STORAGE_KEY);
        explicit = isTheme(saved) ? saved : undefined;
      }
    } catch {
      // Keep this document's local choice when storage is blocked on restoration.
    }
    pendingStoredTheme = undefined;
    requestedTheme = resolveTheme(explicit, environment.media.matches);
    requestedCause = 'restore';
    invalidateScene();
    apply(requestedTheme);
  };

  requestedTheme = resolveTheme(explicit, environment.media.matches);
  apply(requestedTheme);
  environment.media.addEventListener('change', onSystemChange);
  addMediaListener(reducedMotion, onReducedMotionChange);
  addListener(ownerDocument, 'visibilitychange', onVisibilityChange);
  const storageEvents = environment.storageEvents ?? ownerWindow;
  addListener(storageEvents, 'storage', onStorage);
  addListener(ownerWindow, 'pagehide', onPageHide);
  addListener(ownerWindow, 'pageshow', onPageShow);

  const dispose = (): void => {
    if (disposed) return;
    settleLatest();
    disposed = true;
    environment.media.removeEventListener('change', onSystemChange);
    removeMediaListener(reducedMotion, onReducedMotionChange);
    removeListener(ownerDocument, 'visibilitychange', onVisibilityChange);
    removeListener(storageEvents, 'storage', onStorage);
    subscribers.clear();
    removeListener(ownerWindow, 'pagehide', onPageHide);
    removeListener(ownerWindow, 'pageshow', onPageShow);
    cancelSuppressionRelease?.();
    releaseSuppression();
    clearSceneMarker();
  };
  return {
    get theme() { return renderedTheme; },
    get generation() { return generation; },
    request,
    subscribe(listener) {
      if (disposed) return () => {};
      subscribers.add(listener);
      return () => { subscribers.delete(listener); };
    },
    dispose,
  };
}
