export const THEME_STORAGE_KEY = 'aion-site-theme';

export type Theme = 'dark' | 'light';

export interface ThemeViewTransition {
  readonly ready: Promise<unknown>;
  readonly finished: Promise<unknown>;
  skipTransition: () => void;
}

export interface ThemeMotionAnimation {
  readonly finished?: Promise<unknown>;
  cancel: () => void;
}

export interface ThemeMotionEnvironment {
  readonly document?: Document;
  readonly window?: Window;
  readonly reducedMotion?: MediaQueryList | null;
  readonly startViewTransition?: (update: () => void) => ThemeViewTransition;
  readonly animate?: (root: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => ThemeMotionAnimation;
}

export interface ThemeEnvironment {
  readonly root: HTMLElement;
  readonly control: HTMLFieldSetElement | null;
  readonly inputs: Iterable<HTMLInputElement>;
  readonly media: MediaQueryList;
  readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;
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

export const themeBootstrap = (): string => `<script>(function(){function set(theme){document.documentElement.dataset.theme=theme;document.querySelectorAll('link[data-theme-favicon]').forEach(function(link){link.media=link.getAttribute('data-theme-favicon')===theme?'all':'not all'})}try{var key='${THEME_STORAGE_KEY}',saved;try{saved=localStorage.getItem(key)}catch(e){}set(saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}catch(e){set(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}})();</script>`;

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
  readonly generation: number;
  readonly theme: Theme;
  transition: ThemeViewTransition | undefined;
  animation: ThemeMotionAnimation | undefined;
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

export function initializeTheme(environment: ThemeEnvironment): () => void {
  let explicit = readTheme(environment.storage);
  const inputs = [...environment.inputs];
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

  const apply = (theme: Theme): void => {
    cancelSuppressionRelease?.();
    environment.root.dataset['themeSwap'] = '';
    environment.root.dataset.theme = theme;
    environment.updateAssets(theme);
    for (const input of inputs) input.checked = input.value === theme;
    if (environment.control) environment.control.hidden = false;
    renderedTheme = theme;
    persistPending(theme);
    cancelSuppressionRelease = scheduleFrame(releaseSuppression);
  };

  const clearSceneMarker = (): void => {
    delete environment.root.dataset['themeTransition'];
    delete environment.root.dataset['themeCssScene'];
    environment.root.style?.removeProperty('--site-theme-width');
    environment.root.style?.removeProperty('--site-theme-height');
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
    generation += 1;
    invalidateScene();
    apply(requestedTheme);
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
    let animation: ThemeMotionAnimation | undefined;
    try {
      animation = rootAnimation([
        { clipPath: `polygon(${-height}px 0, ${-height}px 0, 0 100%, 0 100%)` },
        { clipPath: `polygon(${-height}px 0, ${width}px 0, ${width + height}px 100%, 0 100%)` },
      ], { duration: sceneDuration(), easing: 'linear', pseudoElement: '::view-transition-new(root)' });
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
    // Firefox can accept the pseudoElement option without painting its clip.
    // The same scene expressed in CSS keeps the native snapshot transition.
    if (ownerWindow?.getComputedStyle(environment.root, '::view-transition-new(root)').clipPath === 'none') {
      void animation.finished?.catch(() => {});
      safeCancel(animation);
      environment.root.style.setProperty('--site-theme-width', `${width}px`);
      environment.root.style.setProperty('--site-theme-height', `${height}px`);
      environment.root.dataset['themeCssScene'] = '';
      return;
    }
    scene.animation = animation;
    watchPromise(animation.finished, () => {}, () => {
      safeSkip(scene.transition);
      finishScene(scene);
    });
  };

  const beginScene = (theme: Theme): void => {
    generation += 1;
    const sceneGeneration = generation;
    invalidateScene();
    environment.root.dataset['themeTransition'] = '';
    const scene: ActiveThemeScene = {
      generation: sceneGeneration,
      theme,
      transition: undefined,
      animation: undefined,
    };
    activeScene = scene;

    let transition: ThemeViewTransition | undefined;
    try {
      transition = startViewTransition(() => {
        if (disposed || scene.generation !== generation) return;
        apply(scene.theme);
      });
    } catch {
      if (activeScene === scene && scene.generation === generation) {
        apply(theme);
        invalidateScene();
      }
      return;
    }
    if (!transition) {
      apply(theme);
      invalidateScene();
      return;
    }
    scene.transition = transition;
    watchPromise(transition.ready, () => runSceneAnimation(scene), () => {
      if (activeScene !== scene || scene.generation !== generation || disposed) return;
      apply(theme);
      safeSkip(transition);
      finishScene(scene);
    });
    watchPromise(transition.finished, () => finishScene(scene), () => {
      if (activeScene !== scene || scene.generation !== generation || disposed) return;
      safeCancel(scene.animation);
      if (renderedTheme !== requestedTheme) apply(requestedTheme);
      finishScene(scene);
    });
    if (activeScene !== scene || scene.generation !== generation || disposed) safeSkip(transition);
  };

  const setExplicitTheme = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input || !isTheme(input.value)) return;
    const next = input.value;
    explicit = next;
    pendingStoredTheme = next;
    requestedTheme = next;
    if (next === renderedTheme || motionIsReduced() || !supportsViewTransition() || !supportsRootAnimation()) {
      generation += 1;
      invalidateScene();
      apply(next);
      return;
    }
    // The browser checks the clicked radio before dispatching click. Keep the
    // controls aligned with the currently rendered theme until the update
    // callback commits the incoming state.
    for (const choice of inputs) choice.checked = choice.value === renderedTheme;
    beginScene(next);
  };

  const onSnapshotClick: EventListener = (event) => {
    if (!activeScene || event.target !== environment.root || !(event instanceof MouseEvent)) return;
    // Captured root content is excluded from hit-testing by the View Transition
    // API. Route a real click at a visible radio back to that same control.
    const input = inputs.find((choice) => {
      if (choice.disabled || environment.control?.disabled || choice.closest('[inert]')) return false;
      const box = choice.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && event.clientX >= box.left
        && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    });
    if (input) {
      event.stopImmediatePropagation();
      event.preventDefault();
      input.focus({ preventScroll: true });
      input.click();
    }
  };

  const onSystemChange = (event: MediaQueryListEvent): void => {
    if (disposed || explicit !== undefined) return;
    requestedTheme = event.matches ? 'light' : 'dark';
    generation += 1;
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
    settleLatest();
  };

  requestedTheme = resolveTheme(explicit, environment.media.matches);
  apply(requestedTheme);
  for (const input of inputs) input.addEventListener('click', setExplicitTheme);
  environment.media.addEventListener('change', onSystemChange);
  addMediaListener(reducedMotion, onReducedMotionChange);
  addListener(ownerDocument, 'visibilitychange', onVisibilityChange);
  addListener(ownerDocument, 'click', onSnapshotClick);
  addListener(ownerWindow, 'pagehide', onPageHide);
  addListener(ownerWindow, 'pageshow', onPageShow);

  return () => {
    if (disposed) return;
    settleLatest();
    disposed = true;
    for (const input of inputs) input.removeEventListener('click', setExplicitTheme);
    environment.media.removeEventListener('change', onSystemChange);
    removeMediaListener(reducedMotion, onReducedMotionChange);
    removeListener(ownerDocument, 'visibilitychange', onVisibilityChange);
    removeListener(ownerDocument, 'click', onSnapshotClick);
    removeListener(ownerWindow, 'pagehide', onPageHide);
    removeListener(ownerWindow, 'pageshow', onPageShow);
    cancelSuppressionRelease?.();
    releaseSuppression();
    clearSceneMarker();
  };
}
