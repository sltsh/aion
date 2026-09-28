import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { measures } from '../src/measures.js';
import { SITE_PAIRS } from '../src/pairs.js';
import { INTRO_KEY, introMarkup, isHomepagePath, runIntro, shouldPlayIntro } from '../src/intro.js';
import type { IntroEnv } from '../src/intro.js';
import { themeBootstrap } from '../src/theme.js';

const scriptBody = (): string => themeBootstrap().replace(/^<script>|<\/script>$/g, '');

function bootstrap(pathname = '/', hash = '', reducedMotion = false, sessionStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: () => null,
  setItem: () => {},
}) {
  const dataset: Record<string, string> = {};
  const timers: { callback: () => void; delay: number }[] = [];
  const document = {
    documentElement: { dataset },
    querySelectorAll: () => [],
  };
  const window = {
    location: { pathname, hash },
    localStorage: { getItem: () => null },
    sessionStorage,
    matchMedia: (query: string) => ({ matches: query.includes('reduce') && reducedMotion }),
    setTimeout: (callback: () => void, delay: number) => { timers.push({ callback, delay }); return timers.length; },
  };
  runInNewContext(scriptBody(), { window, document, localStorage: window.localStorage, matchMedia: window.matchMedia });
  return { dataset, timers };
}

function introHarness() {
  const removeAttribute = vi.fn();
  const body = { append: vi.fn() };
  const animations: { cancel: ReturnType<typeof vi.fn> }[] = [];
  const slats = Array.from({ length: 8 }, () => ({ style: {}, querySelector: () => ({ style: {} }) }));
  const overlay = {
    setAttribute: vi.fn(),
    innerHTML: '',
    querySelectorAll: () => slats,
    querySelector: () => ({}),
    remove: vi.fn(),
  };
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    body,
    documentElement: { removeAttribute, dataset: { theme: 'dark' } },
    createElement: () => overlay,
  }) as unknown as Document;
  const reducedMotion = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
  let generation = 1;
  const themeListeners = new Set<() => void>();
  const options: KeyframeAnimationOptions[] = [];
  const env: IntroEnv = {
    reducedMotion,
    easing: 'token-ease',
    themeGeneration: () => generation,
    subscribeTheme(listener: () => void) { themeListeners.add(listener); return () => themeListeners.delete(listener); },
    animate: vi.fn((_target: HTMLElement, _frames: Keyframe[], effect: KeyframeAnimationOptions) => {
      options.push(effect);
      const animation = { cancel: vi.fn() };
      animations.push(animation);
      return animation;
    }),
  };
  return {
    document, overlay, removeAttribute, body, animations, options, env,
    changeTheme() { generation += 1; themeListeners.forEach((listener) => listener()); },
  };
}

describe('once-per-session intro eligibility', () => {
  it('plays once per session and never on a deep link, reduced motion or blocked storage', () => {
    const values = new Map<string, string>();
    const session = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    expect(INTRO_KEY).toBe('aion-site-intro');
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session })).toBe(true);
    expect(values.get(INTRO_KEY)).toBe('played');
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '#install', session: { getItem: () => null, setItem: vi.fn() } })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: true, hash: '', session: { getItem: () => null, setItem: vi.fn() } })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session: null })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session: { getItem: () => null, setItem: () => { throw new Error('blocked'); } } })).toBe(false);
  });

  it('keeps palette navigation out of the homepage intro without changing its interface', () => {
    expect(isHomepagePath('/')).toBe(true);
    expect(isHomepagePath('/index.html')).toBe(true);
    expect(isHomepagePath('/palette.html')).toBe(false);
  });
});

describe('theme bootstrap intro visibility', () => {
  it('marks only eligible homepage visits pending without consuming the session key', () => {
    const setItem = vi.fn();
    const getItem = vi.fn(() => null);
    const routeStorage = { getItem, setItem };
    expect(bootstrap().dataset['intro']).toBe('pending');
    expect(bootstrap('/', '#depth').dataset['intro']).toBeUndefined();
    expect(bootstrap('/', '', true).dataset['intro']).toBeUndefined();
    expect(bootstrap('/palette.html', '', false, routeStorage).dataset['intro']).toBeUndefined();
    expect(getItem).not.toHaveBeenCalled();
    expect(bootstrap('/', '', false, { getItem: () => 'played', setItem }).dataset['intro']).toBeUndefined();
    expect(setItem).not.toHaveBeenCalled();
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem };
    expect(bootstrap('/', '', false, blocked).dataset['intro']).toBeUndefined();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('releases a pending page after four seconds when the client never starts', () => {
    const h = bootstrap();
    expect(h.timers.map((timer) => timer.delay)).toContain(4000);
    h.timers.find((timer) => timer.delay === 4000)!.callback();
    expect(h.dataset['intro']).toBeUndefined();
  });
});

describe('splash markup and animation lifecycle', () => {
  it.each(['dark', 'light'] as const)('shows the eight measured role slats in %s', (scheme) => {
    const figures = measures(scheme);
    const html = introMarkup(figures, scheme);
    expect((html.match(/data-intro-role=/g) ?? []).length).toBe(8);
    expect(html).toContain('data-intro-scheme="' + scheme + '"');
    expect(html).toContain(`src="${scheme === 'light' ? '/aion-wordmark.webp' : '/aion-wordmark-light.webp'}"`);
    for (const row of figures.syntax) {
      expect(html).toContain(`data-intro-role="${row.role}"`);
      expect(html).toContain(row.ratio.toFixed(2));
      expect(html).toContain(`var(--s-${row.role})`);
      expect(SITE_PAIRS).toContainEqual(expect.objectContaining({ fg: '--n-editor', bg: `--s-${row.role}`, floor: 4.5 }));
    }
    expect(SITE_PAIRS).toContainEqual(expect.objectContaining({ fg: '--n-editor', bg: '--a-gold', floor: 4.5 }));
  });

  it('completes naturally with approved timings for entry, exit and plate', async () => {
    vi.useFakeTimers();
    const h = introHarness();
    const pending = runIntro(h.document, measures('dark'), 'dark', h.env);
    await vi.runAllTimersAsync();
    await pending;
    expect(h.options).toHaveLength(17);
    for (const effects of [h.options.slice(0, 8), h.options.slice(8, 16)]) {
      expect(effects.map((effect) => effect.delay)).toEqual([0, 70, 140, 210, 280, 350, 420, 490]);
      expect(effects.every((effect) => effect.duration === 560)).toBe(true);
    }
    expect(h.options[16]?.duration).toBe(160);
    expect(h.overlay.remove).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('any key or press skips, cancels animations, removes the overlay and resolves', async () => {
    vi.useFakeTimers();
    const h = introHarness();
    const pending = runIntro(h.document, measures('dark'), 'dark', h.env);
    expect(h.animations.length).toBe(8);
    h.document.dispatchEvent(new Event('keydown'));
    await expect(pending).resolves.toBeUndefined();
    expect(h.animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    expect(h.overlay.remove).toHaveBeenCalledOnce();
    expect(h.removeAttribute).toHaveBeenCalledWith('data-intro');
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('finishes when hidden or when a later theme generation invalidates the intro', async () => {
    vi.useFakeTimers();
    const hidden = introHarness();
    const hiddenIntro = runIntro(hidden.document, measures('dark'), 'dark', hidden.env);
    Object.assign(hidden.document, { hidden: true });
    hidden.document.dispatchEvent(new Event('visibilitychange'));
    await expect(hiddenIntro).resolves.toBeUndefined();
    const changed = introHarness();
    const themeIntro = runIntro(changed.document, measures('dark'), 'dark', changed.env);
    changed.changeTheme();
    await expect(themeIntro).resolves.toBeUndefined();
    expect(changed.overlay.remove).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('fails open synchronously if animation is missing or throws', async () => {
    const missing = (): Pick<Animation, 'cancel'> | undefined => undefined;
    const throwing = (): Pick<Animation, 'cancel'> | undefined => { throw new Error('unavailable'); };
    for (const animate of [missing, throwing]) {
      const h = introHarness();
      const env = { ...h.env, animate: vi.fn(animate) };
      const pending = runIntro(h.document, measures('dark'), 'dark', env);
      expect(h.overlay.remove).toHaveBeenCalledOnce();
      expect(h.removeAttribute).toHaveBeenCalledWith('data-intro');
      await expect(pending).resolves.toBeUndefined();
    }
  });

  it('hides the pending page with visibility and uses the shared easing for every exit', async () => {
    const css = readFileSync(new URL('../src/styles/intro.css', import.meta.url), 'utf8');
    expect(css).toContain('visibility: hidden');
    expect(css).toContain('visibility: visible');
    expect(css).not.toMatch(/main\s*\{[^}]*display:\s*none/s);
    const h = introHarness();
    const pending = runIntro(h.document, measures('dark'), 'dark', h.env);
    expect(h.options.every((option) => option.easing === h.env.easing)).toBe(true);
    h.document.dispatchEvent(new Event('keydown'));
    await expect(pending).resolves.toBeUndefined();
  });
});
