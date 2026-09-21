import '@sltsh/aion-css/aion.css';
import '@sltsh/site-mark/register';
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
  control: document.querySelector<HTMLFieldSetElement>('[data-theme-switch]'),
  inputs: document.querySelectorAll<HTMLInputElement>('[data-theme-choice]'),
  media: window.matchMedia('(prefers-color-scheme: light)'),
  storage: themeStorage(),
  updateAssets: updateThemeAssets,
});

// Copy controls are disabled in the server-rendered document so a missing
// script never presents an action that cannot work.
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((source) => {
  source.disabled = false;
});

const siteHead = document.querySelector<HTMLElement>('.site-head');
const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
if (siteHead && menuToggle) {
  const setMenu = (open: boolean): void => {
    siteHead.dataset['menu'] = open ? 'open' : 'closed';
    menuToggle.setAttribute('aria-expanded', String(open));
  };
  setMenu(false);
  menuToggle.addEventListener('click', () => { setMenu(siteHead.dataset['menu'] !== 'open'); });
  siteHead.querySelector('.site-nav')?.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !siteHead.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || siteHead.dataset['menu'] !== 'open') return;
    setMenu(false);
    menuToggle.focus();
  });
  window.matchMedia('(max-width: 520px)').addEventListener('change', () => { setMenu(false); });
}

const announce = (message: string, visible = true): void => {
  if (!status) return;
  clearTimeout(statusTimer);
  status.textContent = message;
  status.toggleAttribute('data-visible', visible);
  statusTimer = setTimeout(() => {
    status.textContent = '';
    status.removeAttribute('data-visible');
    status.removeAttribute('data-status');
  }, COPIED_MS);
};

const copiedTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
const confirmCopy = (source: HTMLElement): void => {
  const previous = copiedTimers.get(source);
  if (previous !== undefined) clearTimeout(previous);
  source.dataset['copied'] = 'true';
  copiedTimers.set(source, setTimeout(() => {
    delete source.dataset['copied'];
    copiedTimers.delete(source);
  }, COPIED_MS));
};
const setStatusKind = (kind: 'success' | 'error'): void => {
  status?.setAttribute('data-status', kind);
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
      setStatusKind('error');
      return;
    }
    void navigator.clipboard.writeText(value).then(() => {
      confirmCopy(source);
      announce('Copied to clipboard', false);
      setStatusKind('success');
    }).catch(() => {
      announce('Could not copy. Select and copy the text instead.');
      setStatusKind('error');
    });
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
