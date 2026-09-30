import type { Hero } from '../chip.js';
import type { Theme, ThemeController } from '../theme.js';
import { CONTENT } from '../content.js';
import { TAU, commitsOnRelease, glide, inGrabBand, keyStep, releaseVelocity, restingShare, seamGeometry, shareAt, settle } from './seam.js';
export type { Hero } from '../chip.js';

interface EventSource { addEventListener(type: string, listener: EventListener): void; removeEventListener(type: string, listener: EventListener): void }
export interface HeroEnv {
  now(): number;
  raf(callback: (time: number) => void): number;
  cancelRaf(id: number): void;
  reducedMotion: MediaQueryList;
  resize: EventSource;
}
type Motion = { kind: 'throw' | 'arrival' | 'flick' | 'glide' | 'settle' | 'cancel' | 'key'; generation: number; start: number; from: number; target: number; duration: number; endpoint?: number; curve?: (time: number) => number; resolve?: (result: 'committed' | 'superseded') => void };
const commits = (kind: Motion['kind']): boolean => kind === 'throw' || kind === 'flick' || kind === 'key';
const clamp = (p: number): number => Math.max(0, Math.min(1, p));
const other = (theme: Theme): Theme => theme === 'dark' ? 'light' : 'dark';
// Evaluate the shared cubic-bezier(.22,1,.36,1) for the injected RAF clock.
const ease = (x: number): number => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i += 1) {
    const t = (lo + hi) / 2, u = 1 - t;
    if (3 * u * u * t * 0.22 + 3 * u * t * t * 0.36 + t ** 3 < x) lo = t; else hi = t;
  }
  return x >= 1 ? 1 : 1 - (1 - (lo + hi) / 2) ** 3;
};

export function mountHero(root: HTMLElement, controller: ThemeController, env: HeroEnv): Hero {
  const base = root.querySelector<HTMLElement>('[data-hero-base]')!;
  const far = root.querySelector<HTMLElement>('[data-hero-far]')!;
  const handle = root.querySelector<HTMLElement>('[data-hero-handle]')!;
  const line = root.querySelector<SVGLineElement>('[data-hero-seam]')!;
  const farLine = root.querySelector<SVGLineElement>('[data-hero-seam-far]');
  const svg = line.ownerSVGElement;
  const initialGeneration = controller.generation;
  let interacted = false, arrived = false;
  let p = 0, rest = 0, width = 0, height = 0, handleY = 0;
  let disposed = false, frame: number | undefined, motion: Motion | undefined;
  let drag: { id: number; offset: number; start: number; samples: [number, number][] } | undefined;
  let throwStart = 0;

  const paint = (): void => {
    const geometry = seamGeometry(p, width, height);
    far.style.clipPath = geometry.clip;
    line.setAttribute('x1', String(geometry.top)); line.setAttribute('y1', '0');
    line.setAttribute('x2', String(geometry.bottom)); line.setAttribute('y2', String(height));
    if (farLine) {
      for (const name of ['x1', 'y1', 'x2', 'y2']) farLine.setAttribute(name, line.getAttribute(name)!);
      farLine.style.clipPath = geometry.clip;
    }
    const margin = Math.min(80, width / 2);
    handle.style.left = `${Math.max(margin, Math.min(width - margin, geometry.top - handleY))}px`;
    handle.style.top = `${handleY}px`;
    handle.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    handle.setAttribute('aria-valuetext', `${Math.round(p * 100)}% ${other(controller.theme) === 'light' ? CONTENT.hero.lightName : CONTENT.hero.darkName}`);
    root.dataset['heroShare'] = String(p);
  };
  const measure = (): void => {
    width = root.getBoundingClientRect().width;
    for (const editor of root.querySelectorAll<HTMLElement>('.hero-editor')) editor.style.setProperty('--site-hero-scale', String(Math.max(0, width - 32) / 1244));
    const box = root.getBoundingClientRect(); width = box.width; height = box.height;
    const editor = base.querySelector<HTMLElement>('.hero-editor');
    const actions = base.querySelector<HTMLElement>('.hero-actions');
    const editorTop = editor ? editor.getBoundingClientRect().top - box.top : undefined;
    handleY = editorTop === undefined ? height * 0.6
      : width <= 600 ? editorTop + 26
      : actions ? (actions.getBoundingClientRect().bottom - box.top + editorTop) / 2 : editorTop - 30;
    handleY = Math.max(60, Math.min(height - 30, handleY));
    svg?.setAttribute('width', String(width)); svg?.setAttribute('height', String(height)); paint();
  };
  const stop = (): void => {
    if (frame !== undefined) env.cancelRaf(frame);
    frame = undefined;
    const previous = motion; motion = undefined; previous?.resolve?.('superseded');
  };
  const endDrag = (): void => {
    if (drag) {
      try { root.releasePointerCapture(drag.id); } catch { /* Capture can already be released by the browser. */ }
    }
    drag = undefined; root.classList.remove('hero-dragging');
  };
  const commit = (): void => { controller.request(other(controller.theme), { scene: 'wipe' }); };
  const tick = (time: number): void => {
    frame = undefined;
    let active = motion;
    if (!active || disposed) return;
    if (active.generation !== controller.generation) { stop(); p = rest; paint(); return; }
    let elapsed = Math.max(0, time - active.start);
    if (active.kind === 'glide' && elapsed >= active.duration && active.endpoint !== active.target) {
      active = { ...active, kind: 'settle', start: active.start + active.duration, from: active.endpoint!, duration: 160, curve: undefined };
      motion = active; elapsed = Math.max(0, time - active.start);
    }
    const done = elapsed >= active.duration;
    p = done ? active.target : active.curve ? clamp(active.curve(elapsed)) : active.from + (active.target - active.from) * ease(elapsed / active.duration);
    paint();
    if (!done) { frame = env.raf(tick); return; }
    motion = undefined;
    if (p === 1 && commits(active.kind)) commit(); else rest = p;
    active.resolve?.('committed');
  };
  const animate = (next: Motion): void => {
    stop(); motion = next;
    if (env.reducedMotion.matches || (next.target === next.from && !next.curve)) {
      p = next.target; paint(); motion = undefined;
      if (p === 1 && commits(next.kind)) commit(); else rest = p;
      next.resolve?.('committed');
    } else frame = env.raf(tick);
  };
  const tween = (target: number, duration: number, kind: Motion['kind']): void => animate({ kind, generation: controller.generation, start: env.now(), from: p, target, duration });
  const sync = (): void => {
    stop(); endDrag(); p = rest;
    base.dataset['theme'] = controller.theme; far.dataset['theme'] = other(controller.theme);
    line.dataset['theme'] = controller.theme; if (farLine) farLine.dataset['theme'] = other(controller.theme);
    const labels = handle.querySelectorAll<HTMLElement>('[data-handle-scheme]');
    labels.forEach((label, index) => {
      const scheme = index === 0 ? controller.theme : other(controller.theme);
      label.dataset['theme'] = scheme; label.textContent = scheme === 'light' ? CONTENT.hero.lightName : CONTENT.hero.darkName;
    });
    paint();
  };
  const onDown = (event: PointerEvent): void => {
    if (disposed || event.button !== 0) return;
    const target = event.target as Element | null;
    if (target?.closest?.('a, button, [data-menu-toggle]')) return;
    const box = root.getBoundingClientRect(), x = event.clientX - box.left, y = event.clientY - box.top;
    const onTab = Boolean(target?.closest?.('[data-hero-handle]'));
    if ((width <= 600 && !onTab) || !inGrabBand({ x, y, onTab, pointerType: event.pointerType }, p, width, height)) return;
    event.preventDefault(); interacted = true; stop();
    drag = { id: event.pointerId, offset: x - (seamGeometry(p, width, height).top - y), start: p, samples: [[env.now(), p]] };
    root.setPointerCapture(event.pointerId); root.classList.add('hero-dragging');
  };
  const onMove = (event: PointerEvent): void => {
    if (!drag || drag.id !== event.pointerId) return;
    const box = root.getBoundingClientRect();
    p = shareAt(event.clientX - box.left - drag.offset, event.clientY - box.top, width, height);
    drag.samples.push([env.now(), p]); drag.samples = drag.samples.filter(([t]) => env.now() - t <= 90);
    paint();
  };
  const onRelease = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.id) return;
    const velocity = event.type === 'pointercancel' ? 0 : releaseVelocity(drag.samples, env.now());
    const gestureStart = drag.start;
    endDrag();
    const from = p;
    if (commitsOnRelease(from, velocity, width, height)) {
      rest = gestureStart;
      const minimum = (1 - from) / (TAU * (1 - Math.exp(-720 / TAU)));
      const speed = Math.max(velocity, minimum);
      const duration = from === 1 ? 0 : Math.min(720, -TAU * Math.log1p(-(1 - from) / (speed * TAU)));
      animate({ kind: 'flick', generation: controller.generation, start: env.now(), from, target: 1, duration, curve: glide(from, speed) });
      return;
    }
    const endpoint = clamp(from + velocity * TAU), target = restingShare(from, velocity);
    const remaining = Math.abs(endpoint - from), tolerance = 0.5 * Math.SQRT2 / (width + height);
    // Fix hand-over time in share coordinates so resizing cannot restart either release phase.
    const duration = remaining <= tolerance ? 0 : -TAU * Math.log1p(-(remaining - tolerance) / (Math.abs(velocity) * TAU));
    animate({ kind: 'glide', generation: controller.generation, start: env.now(), from, target, endpoint, duration, curve: glide(from, velocity) });
  };
  const onKey = (event: KeyboardEvent): void => {
    const target = keyStep(event.key, p); if (target === null || disposed) return;
    event.preventDefault(); interacted = true; endDrag(); tween(target, event.key === 'Home' || event.key === 'End' ? 360 : 160, 'key');
  };
  const onReduced: EventListener = () => {
    if (!env.reducedMotion.matches || !motion) return;
    const active = motion; motion = undefined;
    if (frame !== undefined) env.cancelRaf(frame); frame = undefined;
    if (active.generation !== controller.generation) { p = rest; paint(); active.resolve?.('superseded'); return; }
    p = active.target; paint();
    if (p === 1 && commits(active.kind)) commit(); else rest = p;
    active.resolve?.('committed');
  };
  const onResize: EventListener = measure;
  const onHide: EventListener = () => { if (root.ownerDocument.hidden) { stop(); endDrag(); p = settle(p); paint(); } };
  const onPageHide: EventListener = () => { stop(); endDrag(); p = settle(p); paint(); };
  const unsubscribe = controller.subscribe(sync);
  root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onRelease); root.addEventListener('pointercancel', onRelease);
  handle.addEventListener('keydown', onKey);
  env.reducedMotion.addEventListener('change', onReduced); env.resize.addEventListener('resize', onResize);
  root.ownerDocument.addEventListener('visibilitychange', onHide);
  root.ownerDocument.defaultView?.addEventListener('pagehide', onPageHide);
  sync(); measure();
  const sizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (!disposed) measure(); });
  sizeObserver?.observe(root);
  void root.ownerDocument.fonts?.ready.then(() => { if (!disposed) measure(); });
  return {
    throwAcross(start = env.now()) {
      if (disposed) return Promise.resolve('superseded');
      interacted = true; endDrag(); throwStart = p; rest = p;
      return new Promise((resolve) => animate({ kind: 'throw', generation: controller.generation, start, from: p, target: 1, duration: 720, resolve }));
    },
    cancelThrow() { if (motion?.kind !== 'throw') return; stop(); tween(throwStart, 360, 'cancel'); },
    arrive() { if (disposed || interacted || arrived || controller.generation !== initialGeneration) return; arrived = true; p = 0; paint(); tween(0.42, 720, 'arrival'); },
    onScreen() { const box = root.getBoundingClientRect(); return box.bottom > 0 && box.top < (root.ownerDocument.defaultView?.innerHeight ?? Infinity); },
    dispose() {
      if (disposed) return; disposed = true; stop(); endDrag(); unsubscribe(); sizeObserver?.disconnect();
      root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onRelease); root.removeEventListener('pointercancel', onRelease);
      handle.removeEventListener('keydown', onKey); env.reducedMotion.removeEventListener('change', onReduced);
      env.resize.removeEventListener('resize', onResize); root.ownerDocument.removeEventListener('visibilitychange', onHide);
      root.ownerDocument.defaultView?.removeEventListener('pagehide', onPageHide);
    },
  };
}
