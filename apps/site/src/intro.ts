import { CONTENT } from './content.js';
import type { SchemeMeasures, ShownRole } from './measures.js';
import type { Theme } from './theme.js';

export const INTRO_KEY = 'aion-site-intro';

export const isHomepagePath = (pathname: string): boolean => pathname === '/' || pathname === '/index.html';

export function shouldPlayIntro(env: {
  readonly reducedMotion: boolean;
  readonly hash: string;
  readonly session: Pick<Storage, 'getItem' | 'setItem'> | null;
  readonly navigationType?: 'navigate' | 'reload' | 'back_forward' | 'prerender';
}): boolean {
  if (env.reducedMotion || env.navigationType === 'back_forward') return false;
  if (env.hash && env.navigationType !== 'reload') return false;
  let played = false;
  try { played = env.session?.getItem(INTRO_KEY) != null; } catch { /* Unavailable storage behaves like a first visit. */ }
  if (env.navigationType !== 'reload' && played) return false;
  try { env.session?.setItem(INTRO_KEY, 'played'); } catch { /* The intro can play without persisting its session marker. */ }
  return true;
}

export interface IntroEnv {
  readonly reducedMotion: Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;
  readonly easing: string;
  readonly themeGeneration: () => number;
  readonly subscribeTheme: (listener: () => void) => () => void;
  readonly animate: (target: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) => Pick<Animation, 'cancel'> | undefined;
}

const ROLES: readonly ShownRole[] = ['keyword', 'function', 'type', 'string', 'number', 'variable', 'operator', 'comment'];

export function introMarkup(measures: SchemeMeasures, scheme: Theme): string {
  const slats = ROLES.map((role, index) => {
    const value = measures.syntax.find((entry) => entry.role === role)!;
    return `<div class="splash-intro__slat" data-intro-slat data-index="${index}" style="background:var(--s-${role})" aria-label="${role} ${value.ratio.toFixed(2)}"><span class="splash-intro__label" data-intro-role="${role}">${role}<b>${value.ratio.toFixed(2)}</b></span></div>`;
  }).join('');
  return `<div class="splash-intro" data-intro-scheme="${scheme}" role="img" aria-label="${CONTENT.intro.label}"><div class="splash-intro__backdrop" aria-hidden="true"></div><div class="splash-intro__slats">${slats}</div><div class="splash-intro__center"><div class="splash-intro__plate"><img class="splash-intro__wordmark" src="${scheme === 'light' ? '/aion-wordmark.webp' : '/aion-wordmark-light.webp'}" alt="${CONTENT.intro.wordmark}" width="144" height="48"></div></div><span class="splash-intro__skip">${CONTENT.intro.skip}</span></div>`;
}

export function runIntro(doc: Document, measures: SchemeMeasures, scheme: Theme, env: IntroEnv): Promise<void> {
  const generation = env.themeGeneration();
  if (doc.hidden || env.reducedMotion.matches) {
    doc.documentElement.removeAttribute('data-intro');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    let overlay: HTMLElement | undefined;
    let unsubscribeTheme = (): void => {};
    const animations: Pick<Animation, 'cancel'>[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const clearTimers = (): void => { for (const timer of timers) clearTimeout(timer); timers.length = 0; };
    const finish = (): void => {
      if (done) return;
      done = true;
      clearTimers();
      doc.removeEventListener('keydown', finish);
      doc.removeEventListener('pointerdown', finish);
      doc.removeEventListener('visibilitychange', onVisibility);
      env.reducedMotion.removeEventListener('change', onMotion);
      unsubscribeTheme();
      for (const animation of animations) {
        try { animation.cancel(); } catch { /* A settled animation needs no further work. */ }
      }
      overlay?.remove();
      doc.documentElement.removeAttribute('data-intro');
      resolve();
    };
    const onVisibility = (): void => { if (doc.hidden) finish(); };
    const onMotion = (): void => { if (env.reducedMotion.matches) finish(); };
    const animate = (element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions): boolean => {
      try {
        const animation = env.animate(element, frames, { ...options, easing: env.easing });
        if (!animation) return false;
        animations.push(animation);
        return true;
      } catch {
        return false;
      }
    };

    try {
      const width = doc.defaultView?.innerWidth || 1440;
      const height = doc.defaultView?.innerHeight || 900;
      overlay = doc.createElement('div');
      overlay.innerHTML = introMarkup(measures, scheme);
      doc.body.append(overlay);
      const slats = [...overlay.querySelectorAll<HTMLElement>('[data-intro-slat]')];
      if (slats.length !== 8) { finish(); return; }
      const band = (width + height) / 8 + 2;
      slats.forEach((slat, index) => {
        const left = index * (band - 2) - height;
        const center = index * (band - 2) + band / 2;
        const y = Math.max(70, Math.min(height - 80, center - 90));
        const labelCenter = Math.max(60, Math.min(width - 60, center - y));
        slat.style.left = `${Math.round(left)}px`;
        slat.style.width = `${Math.round(band + height)}px`;
        slat.style.clipPath = `polygon(${height}px 0,100% 0,calc(100% - ${height}px) 100%,0 100%)`;
        const label = slat.querySelector<HTMLElement>('.splash-intro__label');
        if (label) {
          label.style.left = `${Math.round(labelCenter - left - 50)}px`;
          label.style.top = `${Math.round(y)}px`;
        }
      });
      doc.addEventListener('keydown', finish);
      doc.addEventListener('pointerdown', finish);
      doc.addEventListener('visibilitychange', onVisibility);
      env.reducedMotion.addEventListener('change', onMotion);
      unsubscribeTheme = env.subscribeTheme(() => {
        if (env.themeGeneration() !== generation || doc.documentElement.dataset['theme'] !== scheme) finish();
      });
      for (const [index, slat] of slats.entries()) {
        if (!animate(slat, [{ transform: `translateX(${-width - height}px)` }, { transform: 'none' }], {
          duration: 560, delay: 70 * index, fill: 'backwards',
        })) { finish(); return; }
      }
      const exitAfter = 80 + 7 * 70 + 560 + 700;
      timers.push(setTimeout(() => {
        if (done) return;
        // The page must already paint beneath every translucent exit frame.
        doc.documentElement.removeAttribute('data-intro');
        for (const [index, slat] of slats.entries()) {
          if (!animate(slat, [{ transform: 'none', opacity: 1 }, { transform: `translateX(${width + height}px)`, opacity: 0 }], {
            duration: 560, delay: 70 * index, fill: 'forwards',
          })) { finish(); return; }
        }
        const plate = overlay?.querySelector<HTMLElement>('.splash-intro__plate');
        if (plate && !animate(plate, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })) { finish(); return; }
        const backdrop = overlay?.querySelector<HTMLElement>('.splash-intro__backdrop');
        if (backdrop && !animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })) { finish(); return; }
        timers.push(setTimeout(finish, 70 * 7 + 560));
      }, exitAfter));
    } catch {
      finish();
    }
  });
}
