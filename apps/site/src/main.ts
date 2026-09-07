import '@sltsh/aion-css/aion.css';
import './styles.css';

const COPIED_MS = 2000;
let statusTimer: ReturnType<typeof setTimeout> | undefined;
const status = document.querySelector<HTMLElement>('.copy-status');

const announce = (message: string): void => {
  if (!status) return;
  clearTimeout(statusTimer);
  status.textContent = message;
  statusTimer = setTimeout(() => { status.textContent = ''; }, COPIED_MS);
};

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const source = target.closest<HTMLElement>('[data-copy]');
  if (source) {
    const scheme = document.body.dataset['scheme'] === 'light' ? 'light' : 'dark';
    const value = source.dataset['text'] ?? source.dataset[scheme] ?? source.dataset['dark'];
    if (value === undefined) return;
    if (!navigator.clipboard) {
      announce('Copy is unavailable. Select and copy the text instead.');
      return;
    }
    void navigator.clipboard.writeText(value).then(() => {
      source.dataset['copied'] = 'true';
      announce('Copied to clipboard');
      setTimeout(() => { delete source.dataset['copied']; }, COPIED_MS);
    }).catch(() => { announce('Could not copy. Select and copy the text instead.'); });
    return;
  }
  const toggle = target.closest('[data-scheme-toggle]');
  if (toggle) {
    const next = document.body.dataset['scheme'] === 'light' ? 'dark' : 'light';
    document.body.dataset['scheme'] = next;
    document.documentElement.dataset['theme'] = next;
    toggle.setAttribute('aria-pressed', String(next === 'light'));
    toggle.textContent = next === 'light' ? 'Show dark palette' : 'Show light palette';
    for (const node of document.querySelectorAll<HTMLElement>('.swatch')) {
      const hexNode = node.querySelector('.swatch-hex');
      const value = node.dataset[next];
      if (hexNode && value !== undefined) hexNode.textContent = value;
    }
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
