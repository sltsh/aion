import '@sltsh/aion-css/aion.css';
import './styles.css';
import { initializeTheme, syncFavicons } from './theme.js';

const COPIED_MS = 2000;
let statusTimer: ReturnType<typeof setTimeout> | undefined;
const status = document.querySelector<HTMLElement>('.copy-status');

const updateThemeAssets = (theme: 'dark' | 'light'): void =>
  syncFavicons(document.querySelectorAll<HTMLLinkElement>('link[data-theme-favicon]'), theme);

const themeStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

initializeTheme({
  root: document.documentElement,
  button: document.querySelector<HTMLButtonElement>('[data-theme-toggle]'),
  media: window.matchMedia('(prefers-color-scheme: light)'),
  storage: themeStorage(),
  updateAssets: updateThemeAssets,
});

const announce = (message: string, visible = true): void => {
  if (!status) return;
  clearTimeout(statusTimer);
  status.textContent = message;
  status.toggleAttribute('data-visible', visible);
  statusTimer = setTimeout(() => {
    status.textContent = '';
    status.removeAttribute('data-visible');
  }, COPIED_MS);
};

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const source = target.closest<HTMLElement>('[data-copy]');
  if (source) {
    const scheme = document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
    const value = source.dataset['text'] ?? source.dataset[scheme] ?? source.dataset['dark'];
    if (value === undefined) return;
    if (!navigator.clipboard) {
      announce('Copy is unavailable. Select and copy the text instead.');
      return;
    }
    void navigator.clipboard.writeText(value).then(() => {
      source.dataset['copied'] = 'true';
      announce('Copied to clipboard', false);
      setTimeout(() => { delete source.dataset['copied']; }, COPIED_MS);
    }).catch(() => { announce('Could not copy. Select and copy the text instead.'); });
    return;
  }
});

const tracked = [...document.querySelectorAll<HTMLAnchorElement>('[data-section]')].flatMap((anchor) => {
  const id = anchor.dataset['section'];
  const section = id ? document.getElementById(id) : null;
  return section ? [{ anchor, section }] : [];
});

let pending = false;
const updateNavigation = (): void => {
  pending = false;
  const header = document.querySelector('.site-head')?.getBoundingClientRect().bottom ?? 0;
  const jump = document.querySelector('.jump');
  const mobileJump = jump && getComputedStyle(jump).display === 'flex' ? jump.getBoundingClientRect().height : 0;
  const threshold = header + mobileJump + 48;
  let active = tracked[0];
  for (const entry of tracked) {
    if (entry.section.getBoundingClientRect().top <= threshold) active = entry;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) active = tracked.at(-1);
  for (const entry of tracked) {
    if (entry === active) entry.anchor.setAttribute('aria-current', 'location');
    else entry.anchor.removeAttribute('aria-current');
  }
};
const scheduleNavigation = (): void => {
  if (!pending) {
    pending = true;
    requestAnimationFrame(updateNavigation);
  }
};
window.addEventListener('scroll', scheduleNavigation, { passive: true });
window.addEventListener('resize', scheduleNavigation);
window.addEventListener('hashchange', scheduleNavigation);
window.addEventListener('load', scheduleNavigation);
void document.fonts.ready.then(scheduleNavigation);
scheduleNavigation();
