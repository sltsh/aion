import type { Theme, ThemeController } from './theme.js';

export interface Hero {
  throwAcross(): Promise<'committed' | 'superseded'>;
  cancelThrow(): void;
  arrive(): void;
  onScreen(): boolean;
  dispose(): void;
}

export interface ChipEnvironment {
  now(): number;
  raf(callback: (time: number) => void): number;
  cancelRaf(id: number): void;
  readonly reducedMotion?: MediaQueryList;
  readonly supportsViewTransitions?: boolean;
}

// Match the hero's cubic-bezier(.22,1,.36,1) on the same RAF clock.
const ease = (x: number): number => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i += 1) {
    const t = (lo + hi) / 2, u = 1 - t;
    if (3 * u * u * t * .22 + 3 * u * t * t * .36 + t ** 3 < x) lo = t; else hi = t;
  }
  return x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - (lo + hi) / 2) ** 3;
};
const other = (theme: Theme): Theme => theme === 'dark' ? 'light' : 'dark';

export function mountChip(button: HTMLButtonElement, controller: ThemeController, hero: Hero | null, environment?: ChipEnvironment): () => void {
  const document = button.ownerDocument, window = document.defaultView;
  const clock: ChipEnvironment = environment ?? {
    now: () => window!.performance.now(), raf: callback => window!.requestAnimationFrame(callback), cancelRaf: id => window!.cancelAnimationFrame(id),
  };
  const reduced = environment?.reducedMotion ?? window?.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsTransitions = environment?.supportsViewTransitions ?? typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function';
  const base = button.querySelector<HTMLElement>('[data-chip-base]');
  const incoming = button.querySelector<HTMLElement>('[data-chip-incoming]');
  let disposed = false, throwing = false, operation = 0, frame: number | undefined, animation = 0, progress = 0;
  let displayed = controller.theme, expected: Theme | undefined, target = displayed;
  const state = (layer: HTMLElement | null, theme: Theme): void => {
    if (!layer) return;
    layer.dataset['chipState'] = theme;
    for (const half of layer.querySelectorAll<HTMLElement>('[data-chip-half]')) half.classList.toggle('chip-key', half.dataset['theme'] === theme);
  };
  const paint = (next: number): void => {
    progress = next; button.dataset['chipProgress'] = String(next);
    if (!incoming) return;
    const { width, height } = button.getBoundingClientRect();
    const edge = -height + (width + height) * next;
    incoming.style.clipPath = `polygon(0 0, ${edge + height}px 0, ${edge}px 100%, 0 100%)`;
  };
  const stop = (): void => {
    ++animation;
    if (frame !== undefined) clock.cancelRaf(frame);
    frame = undefined;
  };
  const settle = (theme: Theme): void => {
    stop(); displayed = theme; state(base, theme);
    if (incoming) incoming.hidden = true;
  };
  const run = (from: number, to: number, duration: number, eased: boolean): void => {
    stop(); const current = animation, start = clock.now();
    paint(from);
    if (!incoming || !base) return;
    incoming.hidden = false;
    const tick = (time: number): void => {
      if (disposed || current !== animation) return;
      frame = undefined;
      const fraction = Math.max(0, Math.min(1, (time - start) / duration));
      paint(from + (to - from) * (eased ? ease(fraction) : fraction));
      if (fraction === 1) {
        if (to === 1 && throwing) return;
        settle(to === 1 ? target : displayed);
        if (!throwing && controller.theme === target) expected = undefined;
        return;
      }
      frame = clock.raf(tick);
    };
    frame = clock.raf(tick);
  };
  const invalidateThrow = (): void => {
    ++operation;
    if (throwing) hero?.cancelThrow();
    throwing = false;
  };
  const press = (): void => {
    if (disposed) return;
    button.focus({ preventScroll: true });
    if (throwing) {
      invalidateThrow(); expected = undefined;
      run(progress, 0, 360, true);
      return;
    }
    const next = other(expected ?? controller.theme);
    invalidateThrow(); expected = next; target = next;
    if (!supportsTransitions || reduced?.matches || document.hidden) {
      expected = undefined; controller.request(next, { scene: 'none' }); settle(controller.theme);
      return;
    }
    state(base, displayed); state(incoming, next);
    const onScreen = hero?.onScreen() === true;
    run(0, 1, 720, onScreen);
    if (!onScreen) { controller.request(next, { scene: 'wipe' }); return; }
    throwing = true; const current = operation;
    const finishThrow = (result: 'committed' | 'superseded'): void => {
      if (disposed || current !== operation) return;
      throwing = false; expected = undefined; settle(controller.theme);
      if (result === 'committed') paint(1);
    };
    void hero!.throwAcross().then(finishThrow, () => finishThrow('superseded'));
  };
  // Root snapshots exclude captured controls from hit-testing; route their chip
  // coordinates back to the live button so the latest choice remains operable.
  const snapshotPress = (event: MouseEvent): void => {
    if (!document.documentElement.hasAttribute('data-theme-transition') || button.contains(event.target as Node)) return;
    const rect = button.getBoundingClientRect();
    if (button.hidden || rect.width <= 0 || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    event.preventDefault(); event.stopImmediatePropagation(); press();
  };
  const unsubscribe = controller.subscribe((theme, cause) => {
    button.setAttribute('aria-checked', String(theme === 'light'));
    if (cause === 'request' && theme === expected && !reduced?.matches && !document.hidden) {
      if (throwing) { throwing = false; ++operation; expected = undefined; paint(1); settle(theme); }
      else if (frame === undefined) { expected = undefined; settle(theme); }
      return;
    }
    invalidateThrow(); expected = undefined; settle(theme);
  });
  const onReduced = (): void => {
    if (!reduced?.matches) return;
    const next = expected;
    invalidateThrow(); expected = undefined;
    if (next && controller.theme !== next) controller.request(next, { scene: 'none' });
    settle(controller.theme);
  };
  const onHide = (): void => { if (document.hidden) { invalidateThrow(); expected = undefined; settle(controller.theme); } };
  button.setAttribute('aria-checked', String(controller.theme === 'light'));
  settle(controller.theme); paint(0); button.hidden = false;
  button.addEventListener('click', press);
  document.addEventListener('click', snapshotPress, true);
  reduced?.addEventListener('change', onReduced);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    disposed = true; invalidateThrow(); expected = undefined; settle(controller.theme); unsubscribe();
    button.removeEventListener('click', press); document.removeEventListener('click', snapshotPress, true);
    reduced?.removeEventListener('change', onReduced); document.removeEventListener('visibilitychange', onHide);
  };
}
