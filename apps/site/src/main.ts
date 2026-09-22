import '@sltsh/aion-css/aion.css';
import '@sltsh/site-mark/register';
import './styles.css';
import { initializeTheme, syncFavicons } from './theme.js';

// A readable confirmation dwell, not an animation duration.
const COPIED_MS = 2000;
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
const animate = (target: HTMLElement, frames: Keyframe[], time = feedback): Animation | undefined => {
  effects.get(target)?.cancel();
  effects.delete(target);
  if (!canMove() || !target.isConnected || typeof target.animate !== 'function') return;
  try {
    const effect = target.animate(frames, { duration: time, easing: ease });
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
const disposeTheme = initializeTheme({
  root,
  control: document.querySelector<HTMLFieldSetElement>('[data-theme-switch]'),
  inputs: document.querySelectorAll<HTMLInputElement>('[data-theme-choice]'),
  media: window.matchMedia('(prefers-color-scheme: light)'),
  storage: themeStorage(),
  updateAssets: (theme) => syncFavicons(document.querySelectorAll<HTMLLinkElement>('link[data-theme-favicon]'), theme),
});

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((source) => {
  source.disabled = false;
});

const seam = document.querySelector<HTMLElement>('.stage-seam');
const settleSeam = (): void => { if (seam) delete seam.dataset['scene']; };
seam?.addEventListener('animationend', settleSeam, { signal });
seam?.addEventListener('animationcancel', settleSeam, { signal });
if (seam && canMove()) seam.dataset['scene'] = 'play';

const siteHead = document.querySelector<HTMLElement>('.site-head');
const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('.site-menu');
const phone = window.matchMedia('(max-width: 520px)');
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
siteHead?.querySelector('.site-nav')?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) setMenu(false);
}, { signal });
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !siteHead?.contains(event.target)) setMenu(false);
}, { signal });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuOpen) { setMenu(false); menuToggle?.focus({ preventScroll: true }); }
}, { signal });
phone.addEventListener('change', () => setMenu(false, false), { signal });
window.addEventListener('resize', settleMenu, { signal });

const status = document.querySelector<HTMLElement>('.copy-status');
let statusTimer: ReturnType<typeof setTimeout> | undefined;
const copiedTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
let copyRequest = 0;
const clearCopy = (source: HTMLElement): void => {
  const previous = copiedTimers.get(source);
  if (previous !== undefined) clearTimeout(previous);
  copiedTimers.delete(source);
  delete source.dataset['copied'];
  delete source.dataset['copyStatus'];
};
const clearStatus = (): void => {
  clearTimeout(statusTimer);
  if (!status) return;
  status.textContent = '';
  status.removeAttribute('data-visible');
  status.removeAttribute('data-status');
};
const announce = (message: string, visible: boolean, kind: 'success' | 'error'): void => {
  clearStatus();
  if (!status) return;
  status.textContent = message;
  status.toggleAttribute('data-visible', visible);
  status.dataset['status'] = kind;
  statusTimer = setTimeout(clearStatus, COPIED_MS);
};
const showCopyResult = (source: HTMLElement, success: boolean, unavailable = false): void => {
  clearCopy(source);
  source.dataset['copyStatus'] = success ? 'success' : 'error';
  if (success) source.dataset['copied'] = 'true';
  announce(success ? 'Copied to clipboard' : unavailable ? 'Copy is unavailable. Select and copy the text instead.' : 'Could not copy. Select and copy the text instead.', !success, success ? 'success' : 'error');
  copiedTimers.set(source, setTimeout(() => clearCopy(source), COPIED_MS));
  const indicator = source.querySelector<HTMLElement>('.copy-indicator, .swatch-copy');
  if (indicator) animate(indicator, [{ transform: 'translateY(2px)' }, { transform: 'translateY(0)' }]);
  const edge = source.querySelector<HTMLElement>('.swatch-chip') ?? source;
  const styles = getComputedStyle(edge);
  animate(edge, [
    { borderColor: styles.getPropertyValue(success ? '--aion-status-success-solid' : '--aion-status-error-solid').trim() },
    { borderColor: styles.borderColor },
  ]);
};

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const source = event.target.closest<HTMLElement>('[data-copy]');
  if (!source || source.matches(':disabled')) return;
  const scheme = root.dataset['theme'] === 'light' ? 'light' : 'dark';
  const value = source.dataset['text'] ?? source.dataset[scheme] ?? source.dataset['dark'];
  if (value === undefined) return;
  const request = ++copyRequest;
  for (const previous of copiedTimers.keys()) clearCopy(previous);
  clearStatus();
  const done = (success: boolean, unavailable = false): void => {
    if (request === copyRequest && source.isConnected && !signal.aborted && !document.hidden) showCopyResult(source, success, unavailable);
  };
  if (!navigator.clipboard) { done(false, true); return; }
  try { void navigator.clipboard.writeText(value).then(() => done(true), () => done(false)); }
  catch { done(false); }
}, { signal });

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
  let active = tracked[0];
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
  settleSeam();
  settleMenu();
  for (const effect of effects.values()) effect.cancel();
  effects.clear();
  // CSS transitions are owned here too, so a live preference change settles now.
  for (const effect of document.getAnimations()) effect.cancel();
};
const settlePage = (): void => {
  settleMotion();
  ++copyRequest;
  for (const source of copiedTimers.keys()) clearCopy(source);
  clearStatus();
  if (navigationFrame !== undefined) cancelAnimationFrame(navigationFrame);
  navigationFrame = undefined;
};
reducedMotion.addEventListener('change', (event) => { if (event.matches) settleMotion(); }, { signal });
document.addEventListener('visibilitychange', () => { if (document.hidden) settlePage(); }, { signal });
window.addEventListener('pageshow', (event) => { if (event.persisted) settlePage(); scheduleNavigation(); }, { signal });
window.addEventListener('pagehide', (event) => {
  settlePage();
  if (!event.persisted) { disposeTheme(); lifetime.abort(); }
}, { signal });
