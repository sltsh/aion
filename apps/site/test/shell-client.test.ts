import { describe, expect, it, vi } from 'vitest';
import { mountChip, type Hero } from '../src/chip.js';
import { mountRail } from '../src/rail.js';
import type { Theme, ThemeCause, ThemeController } from '../src/theme.js';

vi.mock('../src/theme.js', () => ({
  initializeTheme: () => ({ theme: 'dark', generation: 0, request() {}, subscribe: () => () => {}, dispose() {} }),
  syncFavicons() {},
}));
vi.mock('../src/intro.js', () => ({ isHomepagePath: () => true, shouldPlayIntro: () => false, runIntro: async () => {} }));

function chipHarness(onScreen: boolean) {
  const document = Object.assign(new EventTarget(), { hidden: false, defaultView: null });
  const halves = ['dark', 'light'].map((theme) => ({ dataset: { theme }, classList: { toggle: vi.fn() } }));
  const attributes = new Map<string, string>();
  const button = Object.assign(new EventTarget(), {
    ownerDocument: document, hidden: true, focus: vi.fn(),
    setAttribute: (name: string, value: string) => { attributes.set(name, value); },
    querySelectorAll: () => halves, querySelector: () => null,
  });
  const listeners = new Set<(theme: Theme, cause: ThemeCause) => void>();
  const order: string[] = [];
  let theme: Theme = 'dark'; let generation = 0;
  const controller: ThemeController = {
    get theme() { return theme; }, get generation() { return generation; },
    request(next, options) { order.push('request:' + options?.scene); theme = next; generation += 2; listeners.forEach((listener) => listener(theme, 'request')); },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }, dispose() {},
  };
  let finish!: (result: 'committed' | 'superseded') => void;
  const hero: Hero = {
    onScreen: () => onScreen,
    throwAcross() {
      order.push('throw');
      return new Promise<'committed' | 'superseded'>((resolve) => { finish = resolve; }).then((result) => {
        if (result === 'committed') controller.request('light', { scene: 'none' });
        return result;
      });
    },
    cancelThrow() { order.push('cancel'); finish('superseded'); }, arrive() {}, dispose() {},
  };
  const dispose = mountChip(button as unknown as HTMLButtonElement, controller, hero);
  return { button, controller, hero, attributes, halves, order, finish: () => finish('committed'), dispose };
}

describe('scheme chip client', () => {
  it('commits immediately with a wipe off screen and keeps its key and focus synchronized', () => {
    const h = chipHarness(false);
    expect(h.button.hidden).toBe(false);
    h.button.dispatchEvent(new Event('click'));
    expect(h.order).toEqual(['request:wipe']);
    expect(h.attributes.get('aria-checked')).toBe('true');
    expect(h.button.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(h.halves[1]!.classList.toggle).toHaveBeenLastCalledWith('chip-key', true);
    h.dispose(); h.button.dispatchEvent(new Event('click')); expect(h.order).toHaveLength(1);
  });
  it('throws first on screen and lets the hero commit without a second wipe', async () => {
    const h = chipHarness(true); h.button.dispatchEvent(new Event('click'));
    expect(h.order).toEqual(['throw']); expect(h.controller.theme).toBe('dark');
    h.finish(); await Promise.resolve(); await Promise.resolve();
    expect(h.order).toEqual(['throw', 'request:none']); expect(h.controller.theme).toBe('light'); h.dispose();
  });
  it('cancels an in-flight throw on another press without committing', async () => {
    const h = chipHarness(true); h.button.dispatchEvent(new Event('click')); h.button.dispatchEvent(new Event('click'));
    await Promise.resolve(); await Promise.resolve();
    expect(h.order).toEqual(['throw', 'cancel']); expect(h.controller.theme).toBe('dark'); h.dispose();
  });
});

it('shows the chapter rail only after the hero exits and the left gutter reaches 190px', () => {
  const window = Object.assign(new EventTarget(), { innerWidth: 1380, innerHeight: 800 });
  const attributes = new Map<string, string>();
  const anchor = { hash: '#depth', setAttribute: (key: string, value: string) => { attributes.set(key, value); }, removeAttribute: (key: string) => attributes.delete(key) };
  let bottom = -1;
  const document = { defaultView: window, getElementById: () => ({ getBoundingClientRect: () => ({ top: 0 }) }) };
  const nav = { ownerDocument: document, hidden: true, style: { left: '' }, querySelectorAll: () => [anchor] };
  const hero = { getBoundingClientRect: () => ({ left: (window.innerWidth - 1000) / 2, bottom }) };
  const dispose = mountRail(nav as unknown as HTMLElement, hero as unknown as Element);
  expect(nav.hidden).toBe(false); expect(attributes.get('aria-current')).toBe('location');
  window.innerWidth = 1378; window.dispatchEvent(new Event('resize')); expect(nav.hidden).toBe(true);
  window.innerWidth = 1380; bottom = 1; window.dispatchEvent(new Event('scroll')); expect(nav.hidden).toBe(true);
  bottom = -1; window.dispatchEvent(new Event('scroll')); expect(nav.hidden).toBe(false);
  dispose(); window.innerWidth = 1000; window.dispatchEvent(new Event('resize')); expect(nav.hidden).toBe(false);
});

it('moves the live header current link with the chapter in view and clears it above Depth', async () => {
  vi.resetModules();
  const positions = new Map([['depth', 300], ['solved', 900], ['install', 1700]]);
  const anchors = ['depth', 'solved', 'install'].map((id) => {
    const attributes = new Map<string, string>();
    return Object.assign(new EventTarget(), {
      dataset: { section: id },
      attributes,
      setAttribute: (name: string, value: string) => { attributes.set(name, value); },
      removeAttribute: (name: string) => { attributes.delete(name); },
    });
  });
  const sections = new Map([...positions].map(([id]) => [id, {
    getBoundingClientRect: () => ({ top: positions.get(id)! }),
  }]));
  const header = { getBoundingClientRect: () => ({ bottom: 64 }) };
  const frames: FrameRequestCallback[] = [];
  const root = {
    classList: { add() {} }, removeAttribute() {}, dataset: {}, scrollHeight: 5000,
  };
  const window = Object.assign(new EventTarget(), {
    location: { pathname: '/', hash: '' }, innerHeight: 800, innerWidth: 1200, scrollY: 0,
    localStorage: null, sessionStorage: null,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  const document = Object.assign(new EventTarget(), {
    nodeType: 9, defaultView: window, documentElement: root, hidden: false, fonts: { ready: Promise.resolve() },
    querySelector: (selector: string) => selector === '.site-head' ? header : null,
    querySelectorAll: (selector: string) => selector === '[data-section]' ? anchors : [],
    getElementById: (id: string) => sections.get(id) ?? null,
  });
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', document);
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '', display: 'none' }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const flushFrames = (): void => { while (frames.length) frames.shift()!(0); };

  try {
    await import('../src/main.js');
    await Promise.resolve(); flushFrames();
    expect(anchors.filter((anchor) => anchor.attributes.has('aria-current'))).toHaveLength(0);

    const chapters = ['depth', 'solved', 'rounded', 'states', 'terminal', 'palette', 'install'];
    for (const chapter of chapters) {
      window.scrollY = chapters.indexOf(chapter) * 350;
      positions.set('depth', chapter === 'depth' ? 100 : -300);
      positions.set('solved', chapter === 'depth' ? 900 : chapter === 'solved' ? 100 : -200);
      positions.set('install', chapter === 'install' ? 100 : 1700);
      window.dispatchEvent(new Event('scroll'));
      flushFrames();
      const current = anchors.filter((anchor) => anchor.attributes.get('aria-current') === 'location');
      expect(current).toHaveLength(1);
      expect(current[0]!.dataset.section).toBe(chapter === 'depth' ? 'depth' : chapter === 'install' ? 'install' : 'solved');
    }
  } finally {
    window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: false }));
    vi.unstubAllGlobals();
  }
});
