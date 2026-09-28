import type { Theme, ThemeController } from './theme.js';

/** Forward contract for the hero controller; choreography is implemented by Task 6. */
export interface Hero {
  throwAcross(): Promise<'committed' | 'superseded'>;
  cancelThrow(): void;
  arrive(): void;
  onScreen(): boolean;
  dispose(): void;
}

export function mountChip(button: HTMLButtonElement, controller: ThemeController, hero: Hero | null): () => void {
  let disposed = false;
  let throwing = false;
  let operation = 0;
  let effect: Animation | undefined;
  const document = button.ownerDocument;
  const window = document.defaultView;
  const reduced = window?.matchMedia('(prefers-reduced-motion: reduce)');
  const sync = (theme: Theme): void => {
    button.setAttribute('aria-checked', String(theme === 'light'));
    for (const half of button.querySelectorAll<HTMLElement>('[data-chip-half]')) half.classList.toggle('chip-key', half.dataset['theme'] === theme);
  };
  const settle = (): void => { effect?.cancel(); effect = undefined; };
  const register = (): void => {
    settle();
    const seam = button.querySelector<HTMLElement>('.chip-seam');
    if (reduced?.matches || document.hidden || !seam?.animate) return;
    effect = seam.animate([{ transform: 'translateX(-52px) skewX(-45deg)' }, { transform: 'translateX(52px) skewX(-45deg)' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
    void effect.finished.catch(() => {});
  };
  const press = (): void => {
    if (disposed) return;
    button.focus({ preventScroll: true });
    register();
    if (throwing) {
      ++operation;
      throwing = false;
      hero?.cancelThrow();
      return;
    }
    if (!hero?.onScreen()) {
      controller.request(controller.theme === 'dark' ? 'light' : 'dark', { scene: 'wipe' });
      return;
    }
    throwing = true;
    const current = ++operation;
    void hero.throwAcross().then(() => {
      if (current === operation) throwing = false;
    }, () => {
      if (current === operation) throwing = false;
    });
  };
  // Root snapshots exclude their captured controls from hit-testing. Route a click
  // at the visible chip back to its live button while the family wipe is active.
  const snapshotPress = (event: MouseEvent): void => {
    if (event.target !== document.documentElement || !document.documentElement.hasAttribute('data-theme-transition')) return;
    const rect = button.getBoundingClientRect();
    if (button.hidden || rect.width <= 0 || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    event.preventDefault(); event.stopImmediatePropagation(); press();
  };
  const unsubscribe = controller.subscribe((theme) => { throwing = false; ++operation; sync(theme); });
  const onReduced = (): void => { if (reduced?.matches) settle(); };
  const onHide = (): void => { if (document.hidden) settle(); };
  sync(controller.theme);
  button.hidden = false;
  button.addEventListener('click', press);
  document.addEventListener('click', snapshotPress, true);
  reduced?.addEventListener('change', onReduced);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    disposed = true; ++operation; if (throwing) hero?.cancelThrow(); throwing = false;
    settle(); unsubscribe(); button.removeEventListener('click', press);
    document.removeEventListener('click', snapshotPress, true);
    reduced?.removeEventListener('change', onReduced); document.removeEventListener('visibilitychange', onHide);
  };
}
