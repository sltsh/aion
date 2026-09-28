import '@sltsh/aion-css/aion.css';
import '@sltsh/site-mark/register';
import './styles.css';
import './styles/shell.css';
import './styles/chip.css';
import './styles/intro.css';
import '@sltsh/aion-lab/render/editor.css';
import './styles/hero.css';
import './styles/claims.css';
import './styles/depth.css';
import './styles/probes.css';
import './styles/states.css';
import './styles/terminal.css';
import './styles/palette-chapter.css';
import './styles/install.css';
import { mountPaletteChapter } from './chapters/palette.js';
import { mountCopy } from './chapters/copy.js';
import { mountStates } from './chapters/states.js';
import { mountSolved } from './chapters/solved.js';
import { mountRounded } from './chapters/rounded.js';
import { readProbeInputs } from './chapters/probe.js';
import { mountDepth } from './chapters/depth.js';
import { mountHero } from './hero/controller.js';
import { mountChip } from './chip.js';
import { mountRail } from './rail.js';
import { initializeTheme, syncFavicons } from './theme.js';
import { isHomepagePath, runIntro, shouldPlayIntro } from './intro.js';
import type { SchemeMeasures } from './measures.js';

const root = document.documentElement;
const lifetime = new AbortController();
const { signal } = lifetime;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionStyle = getComputedStyle(root);
const duration = (name: string, fallback: number): number => {
  const value = motionStyle.getPropertyValue(name).trim();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed * (value.endsWith('ms') ? 1 : 1000) : fallback;
};
const feedback = duration('--slt-motion-feedback', 160);
const disclosure = duration('--slt-motion-disclosure', 360);
const ease = motionStyle.getPropertyValue('--slt-ease-out').trim() || 'cubic-bezier(.22, 1, .36, 1)';
const effects = new Map<Element, Animation>();
const canMove = (): boolean => !reducedMotion.matches && !document.hidden;
const animate = (target: HTMLElement, frames: Keyframe[], time = feedback, options: KeyframeAnimationOptions = {}): Animation | undefined => {
  effects.get(target)?.cancel();
  effects.delete(target);
  if (!canMove() || !target.isConnected || typeof target.animate !== 'function') return;
  try {
    const effect = target.animate(frames, { ...options, duration: time, easing: ease });
    effects.set(target, effect);
    void effect.finished.catch(() => {}).finally(() => {
      if (effects.get(target) === effect) effects.delete(target);
    });
    return effect;
  } catch {
    return;
  }
};

const themeStorage = (): Storage | null => {
  try { return window.localStorage; } catch { return null; }
};
const theme = initializeTheme({
  root,
  storageEvents: window,
  media: window.matchMedia('(prefers-color-scheme: light)'),
  storage: themeStorage(),
  updateAssets: (theme) => syncFavicons(document.querySelectorAll<HTMLLinkElement>('link[data-theme-favicon]'), theme),
});

const heroRoot = document.querySelector<HTMLElement>('[data-hero]');
const heroController = heroRoot ? mountHero(heroRoot, theme, { now: () => performance.now(), raf: (callback) => requestAnimationFrame(callback), cancelRaf: (id) => cancelAnimationFrame(id), reducedMotion, resize: window }) : null;
root.classList.add('js');
const introHome = isHomepagePath(window.location.pathname);
const introSession = (): Storage | null => { try { return window.sessionStorage; } catch { return null; } };
const introEligible = introHome && shouldPlayIntro({ reducedMotion: reducedMotion.matches, hash: window.location.hash, session: introSession(), navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type });
const introGeneration = theme.generation;
const arriveIfCurrent = (): void => { if (theme.generation === introGeneration) heroController?.arrive(); };
if (introEligible) {
  try {
    const island = JSON.parse(document.querySelector<HTMLScriptElement>('#aion-measures')?.textContent ?? '') as Partial<Record<'dark' | 'light', { figures?: SchemeMeasures }>>;
    const figures = island[theme.theme]?.figures;
    if (!figures) throw new Error('The splash figures are missing.');
    void runIntro(document, figures, theme.theme, {
      reducedMotion,
      easing: ease,
      themeGeneration: () => theme.generation,
      subscribeTheme: (listener) => theme.subscribe(listener),
      animate: (target, frames, options) => animate(target, frames, typeof options.duration === 'number' ? options.duration : feedback, options),
    }).then(arriveIfCurrent);
  } catch {
    root.removeAttribute('data-intro');
    arriveIfCurrent();
  }
} else {
  root.removeAttribute('data-intro');
  arriveIfCurrent();
}
const paletteRoot = document.querySelector<HTMLElement>('[data-palette-chapter]');
const disposePalette = paletteRoot ? mountPaletteChapter(paletteRoot) : () => {};
const depthRoot = document.querySelector<HTMLElement>('[data-depth]');
const disposeDepth = depthRoot ? mountDepth(depthRoot) : () => {};
const probeInputs = readProbeInputs(document);
const solvedRoot = document.querySelector<HTMLElement>('[data-solved]');
const roundedRoot = document.querySelector<HTMLElement>('[data-rounded]');
const disposeSolved = solvedRoot && probeInputs ? mountSolved(solvedRoot, theme, probeInputs) : () => {};
const statesRoot = document.querySelector<HTMLElement>('[data-states]');
const disposeStates = statesRoot && probeInputs ? mountStates(statesRoot, theme, probeInputs, { reducedMotion, visibility: document }) : () => {};
const disposeRounded = roundedRoot && probeInputs ? mountRounded(roundedRoot, theme, probeInputs) : () => {};
const chip = document.querySelector<HTMLButtonElement>('[data-scheme-chip]');
const disposeChip = chip ? mountChip(chip, theme, heroController) : () => {};
const rail = document.querySelector<HTMLElement>('.chapter-rail');
const hero = document.getElementById('overview');
const disposeRail = rail && hero ? mountRail(rail, hero) : () => {};


const siteHead = document.querySelector<HTMLElement>('.site-head');
const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('.site-menu');
const phone = window.matchMedia('(max-width: 599px)');
const menuHome = menu?.parentElement;
const menuPortal = document.querySelector<HTMLElement>('.hero-menu-portal');
const placeMenu = (): void => {
  if (!menu || !menuHome || !menuPortal) return;
  (phone.matches ? menuPortal : menuHome).append(menu);
};
placeMenu();
let menuEffect: Animation | undefined;
let menuOpen = false;
const settleMenu = (): void => {
  const previous = menuEffect;
  menuEffect = undefined;
  previous?.cancel();
  menu?.removeAttribute('data-disclosing');
};
const setMenu = (open: boolean, motion = true): void => {
  if (!siteHead || !menuToggle || !menu) return;
  const changed = menuOpen !== open;
  const from = menu.getBoundingClientRect().height;
  settleMenu();
  menuOpen = open;
  siteHead.dataset['menu'] = open ? 'open' : 'closed';
  menuToggle.setAttribute('aria-expanded', String(open));
  if (!open && phone.matches && menu.contains(document.activeElement)) menuToggle.focus({ preventScroll: true });
  menu.inert = phone.matches && !open;
  if (!motion || !changed || !phone.matches || !canMove() || typeof menu.animate !== 'function') return;
  menu.dataset['disclosing'] = '';
  const style = getComputedStyle(menu);
  const height = menu.getBoundingClientRect().height;
  const top = style.paddingTop;
  const bottom = style.paddingBottom;
  // An absolute region can reveal structurally without moving the reading flow.
  const effect = animate(menu, [
    { height: `${from}px`, paddingTop: from ? top : '0px', paddingBottom: from ? bottom : '0px', clipPath: from ? 'inset(0)' : 'inset(0 0 100% 0)' },
    { height: `${open ? height : 0}px`, paddingTop: open ? top : '0px', paddingBottom: open ? bottom : '0px', clipPath: open ? 'inset(0)' : 'inset(0 0 100% 0)' },
  ], disclosure);
  menuEffect = effect;
  if (!effect) { settleMenu(); return; }
  void effect.finished.catch(() => {}).finally(() => { if (menuEffect === effect) settleMenu(); });
};
setMenu(false, false);
menuToggle?.addEventListener('click', () => setMenu(!menuOpen), { signal });
menu?.querySelector('.site-nav')?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) setMenu(false);
}, { signal });
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !siteHead?.contains(event.target) && !menu?.contains(event.target)) setMenu(false);
}, { signal });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuOpen) { setMenu(false); menuToggle?.focus({ preventScroll: true }); }
}, { signal });
phone.addEventListener('change', () => { placeMenu(); setMenu(false, false); }, { signal });
window.addEventListener('resize', settleMenu, { signal });

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest<HTMLElement>('.button, .open-link, .text-link, .source-link, .menu-toggle, .footer-links a');
  if (control) animate(control, [{ transform: 'translateY(2px)' }, { transform: 'translateY(0)' }]);
}, { signal });

const disposeCopy = mountCopy(document, animate);

const tracked = [...document.querySelectorAll<HTMLAnchorElement>('[data-section]')].flatMap((anchor) => {
  const id = anchor.dataset['section'];
  const section = id ? document.getElementById(id) : null;
  return section ? [{ anchor, section }] : [];
});
const selectSection = (active: typeof tracked[number] | undefined): void => {
  for (const entry of tracked) {
    if (entry === active) entry.anchor.setAttribute('aria-current', 'location');
    else entry.anchor.removeAttribute('aria-current');
  }
};
let navigationFrame: number | undefined;
const updateNavigation = (): void => {
  navigationFrame = undefined;
  const header = siteHead?.getBoundingClientRect().bottom ?? 0;
  const jump = document.querySelector('.jump');
  const mobileJump = jump && getComputedStyle(jump).display === 'flex' ? jump.getBoundingClientRect().height : 0;
  const threshold = header + mobileJump + 48;
  let active: typeof tracked[number] | undefined;
  for (const entry of tracked) if (entry.section.getBoundingClientRect().top <= threshold) active = entry;
  if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) active = tracked.at(-1);
  selectSection(active);
};
const scheduleNavigation = (): void => {
  if (navigationFrame === undefined && !signal.aborted) navigationFrame = requestAnimationFrame(updateNavigation);
};
for (const entry of tracked) entry.anchor.addEventListener('click', () => selectSection(entry), { signal });
window.addEventListener('scroll', scheduleNavigation, { passive: true, signal });
window.addEventListener('resize', scheduleNavigation, { signal });
window.addEventListener('hashchange', scheduleNavigation, { signal });
window.addEventListener('load', scheduleNavigation, { signal });
void document.fonts.ready.then(scheduleNavigation);
scheduleNavigation();

const settleMotion = (): void => {
  settleMenu();
  for (const effect of effects.values()) effect.cancel();
  effects.clear();
  // CSS transitions are owned here too, so a live preference change settles now.
  for (const effect of document.getAnimations?.() ?? []) effect.cancel();
};
const settlePage = (): void => {
  settleMotion();
  if (navigationFrame !== undefined) cancelAnimationFrame(navigationFrame);
  navigationFrame = undefined;
};
reducedMotion.addEventListener('change', (event) => { if (event.matches) settleMotion(); }, { signal });
document.addEventListener('visibilitychange', () => { if (document.hidden) settlePage(); }, { signal });
window.addEventListener('pageshow', (event) => { if (event.persisted) settlePage(); scheduleNavigation(); }, { signal });
window.addEventListener('pagehide', (event) => {
  settlePage();
  if (!event.persisted) { disposeCopy(); disposePalette(); disposeDepth(); disposeSolved(); disposeRounded(); disposeStates(); disposeChip(); disposeRail(); heroController?.dispose(); theme.dispose(); lifetime.abort(); }
}, { signal });
