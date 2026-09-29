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
}, navigationType?: 'navigate' | 'reload' | 'back_forward' | 'prerender') {
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
    performance: { getEntriesByType: () => navigationType ? [{ type: navigationType }] : [] },
    matchMedia: (query: string) => ({ matches: query.includes('reduce') && reducedMotion }),
    setTimeout: (callback: () => void, delay: number) => { timers.push({ callback, delay }); return timers.length; },
  };
  runInNewContext(scriptBody(), { window, document, localStorage: window.localStorage, matchMedia: window.matchMedia });
  return { dataset, timers };
}

function introHarness() {
  const dataset: Record<string, string> = { theme: 'dark', intro: 'pending' };
  const removeAttribute = vi.fn((name: string) => { if (name === 'data-intro') delete dataset['intro']; });
  const body = { append: vi.fn() };
  const animations: { cancel: ReturnType<typeof vi.fn> }[] = [];
  const slats = Array.from({ length: 8 }, () => ({ style: {}, querySelector: () => ({ style: {} }) }));
  const backdrop = {};
  const plate = {};
  const overlay = {
    setAttribute: vi.fn(),
    innerHTML: '',
    querySelectorAll: () => slats,
    querySelector: (selector: string) => selector === '.splash-intro__backdrop' ? backdrop : plate,
    remove: vi.fn(),
  };
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    defaultView: Object.assign(new EventTarget(), { innerWidth: 1440, innerHeight: 900 }),
    body,
    documentElement: { removeAttribute, dataset },
    createElement: () => overlay,
  }) as unknown as Document;
  const reducedMotion = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
  let generation = 1;
  const themeListeners = new Set<() => void>();
  const options: KeyframeAnimationOptions[] = [];
  const effects: { target: HTMLElement; frames: Keyframe[]; options: KeyframeAnimationOptions; introPending: boolean }[] = [];
  const env: IntroEnv = {
    reducedMotion,
    easing: 'token-ease',
    themeGeneration: () => generation,
    subscribeTheme(listener: () => void) { themeListeners.add(listener); return () => themeListeners.delete(listener); },
    animate: vi.fn((target: HTMLElement, frames: Keyframe[], effect: KeyframeAnimationOptions) => {
      options.push(effect);
      effects.push({ target, frames, options: effect, introPending: dataset['intro'] === 'pending' });
      const animation = { cancel: vi.fn() };
      animations.push(animation);
      return animation;
    }),
  };
  return {
    document, overlay, backdrop, plate, slats, reducedMotion, removeAttribute, body, animations, options, effects, env,
    changeTheme() { generation += 1; themeListeners.forEach((listener) => listener()); },
  };
}

describe('navigation-aware intro eligibility', () => {
  it('plays once per session and skips deep links and reduced motion even with unavailable storage', () => {
    const values = new Map<string, string>();
    const session = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    expect(INTRO_KEY).toBe('aion-site-intro');
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session })).toBe(true);
    expect(values.get(INTRO_KEY)).toBe('played');
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '#install', session: { getItem: () => null, setItem: vi.fn() } })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: true, hash: '', session: { getItem: () => null, setItem: vi.fn() } })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session: null })).toBe(true);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session: { getItem: () => null, setItem: () => { throw new Error('blocked'); } } })).toBe(true);
  });

  it('holds bootstrap and client to the same navigation and storage truth table', () => {
    for (const navigationType of [undefined, 'navigate', 'reload', 'back_forward', 'prerender'] as const)
      for (const marker of [false, true]) for (const available of [true, false])
        for (const reducedMotion of [false, true]) for (const hash of ['', '#install']) {
          const setItem = vi.fn();
          const session = { getItem: () => { if (!available) throw new Error('blocked'); return marker ? 'played' : null; }, setItem };
          const expected = !reducedMotion && navigationType !== 'back_forward'
            && (navigationType === 'reload' || (!hash && (!available || !marker)));
          const beforePaint = bootstrap('/', hash, reducedMotion, session, navigationType);
          expect(beforePaint.dataset['intro'] === 'pending').toBe(expected);
          expect(setItem).not.toHaveBeenCalled();
          expect(shouldPlayIntro({ reducedMotion, hash, session, navigationType })).toBe(expected);
          expect(setItem).toHaveBeenCalledTimes(expected ? 1 : 0);
        }
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session: null, navigationType: 'reload' })).toBe(true);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session: null, navigationType: 'back_forward' })).toBe(false);
  });

  const fresh = () => ({ getItem: () => null, setItem: vi.fn() });

  it('a reload plays the intro even with a hash', () => {
    const played = { getItem: () => 'played', setItem: vi.fn() };
    expect(shouldPlayIntro({ reducedMotion: false, hash: '#install', session: played, navigationType: 'reload' })).toBe(true);
    expect(bootstrap('/', '#install', false, played, 'reload').dataset['intro']).toBe('pending');
  });

  it('a deep link with a hash still skips it', () => {
    expect(shouldPlayIntro({ reducedMotion: false, hash: '#install', session: fresh(), navigationType: 'navigate' })).toBe(false);
    expect(bootstrap('/', '#install', false, fresh(), 'navigate').dataset['intro']).toBeUndefined();
  });

  it('back and forward still skip it', () => {
    expect(shouldPlayIntro({ reducedMotion: false, hash: '#install', session: fresh(), navigationType: 'back_forward' })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: false, hash: '', session: fresh(), navigationType: 'back_forward' })).toBe(false);
  });

  it('reduced motion still skips a reload', () => {
    expect(shouldPlayIntro({ reducedMotion: true, hash: '#install', session: fresh(), navigationType: 'reload' })).toBe(false);
    expect(bootstrap('/', '#install', true, fresh(), 'reload').dataset['intro']).toBeUndefined();
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
    expect(bootstrap('/', '', false, blocked).dataset['intro']).toBe('pending');
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
    expect(h.options).toHaveLength(18);
    for (const effects of [h.options.slice(0, 8), h.options.slice(8, 16)]) {
      expect(effects.map((effect) => effect.delay)).toEqual([0, 70, 140, 210, 280, 350, 420, 490]);
      expect(effects.every((effect) => effect.duration === 560)).toBe(true);
    }
    expect(h.options[16]?.duration).toBe(160);
    expect(h.options[17]?.duration).toBe(160);
    expect(h.overlay.remove).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('reveals the page before the exit fades and hands off arrival before the next frame', async () => {
    vi.useFakeTimers();
    try {
      const h = introHarness();
      const arrive = vi.fn();
      const pending = runIntro(h.document, measures('dark'), 'dark', h.env).then(arrive);
      await vi.advanceTimersByTimeAsync(1829);
      expect(h.document.documentElement.dataset['intro']).toBe('pending');
      await vi.advanceTimersByTimeAsync(1);
      expect(h.document.documentElement.dataset['intro']).toBeUndefined();
      expect(h.overlay.remove).not.toHaveBeenCalled();
      expect(arrive).not.toHaveBeenCalled();
      const exits = h.effects.slice(8, 16);
      expect(exits.every((effect) => !effect.introPending)).toBe(true);
      for (const effect of exits) {
        expect(effect.frames.map((frame) => frame.opacity)).toEqual([1, 0]);
        expect(effect.options.duration).toBeGreaterThanOrEqual(2 * 1000 / 60);
      }
      const backdrop = h.effects.find((effect) => effect.target === h.backdrop);
      expect(backdrop?.introPending).toBe(false);
      expect(backdrop?.frames).toEqual([{ opacity: 1 }, { opacity: 0 }]);
      expect(backdrop?.options.duration).toBe(160);
      await vi.advanceTimersByTimeAsync(1049);
      expect(h.overlay.remove).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(h.overlay.remove).toHaveBeenCalledOnce();
      expect(arrive).toHaveBeenCalledOnce();
      expect(h.overlay.remove.mock.invocationCallOrder[0]).toBeLessThan(arrive.mock.invocationCallOrder[0]!);
      expect(vi.getTimerCount()).toBe(0);
      expect(h.animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['keydown', 'pointerdown', 'motion', 'theme'] as const)('settles an exiting intro on %s without replay or pending timers', async (trigger) => {
    vi.useFakeTimers();
    try {
      const h = introHarness();
      const pending = runIntro(h.document, measures('dark'), 'dark', h.env);
      await vi.advanceTimersByTimeAsync(1830);
      if (trigger === 'motion') {
        Object.assign(h.env.reducedMotion, { matches: true });
        h.reducedMotion.dispatchEvent(new Event('change'));
      } else if (trigger === 'theme') h.changeTheme();
      else h.document.dispatchEvent(new Event(trigger));
      await expect(pending).resolves.toBeUndefined();
      expect(h.overlay.remove).toHaveBeenCalledOnce();
      expect(h.animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      Object.assign(h.env.reducedMotion, { matches: false });
      h.reducedMotion.dispatchEvent(new Event('change'));
      h.changeTheme();
      await vi.runAllTimersAsync();
      expect(h.effects).toHaveLength(18);
      expect(h.overlay.remove).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the original intro timeline through resize during entry and exit', async () => {
    vi.useFakeTimers();
    try {
      const h = introHarness();
      const pending = runIntro(h.document, measures('dark'), 'dark', h.env);
      await vi.advanceTimersByTimeAsync(300);
      Object.assign(h.document.defaultView!, { innerWidth: 390, innerHeight: 844 });
      h.document.defaultView!.dispatchEvent(new Event('resize'));
      expect(h.effects).toHaveLength(8);
      await vi.advanceTimersByTimeAsync(1530);
      Object.assign(h.document.defaultView!, { innerWidth: 768, innerHeight: 1024 });
      h.document.defaultView!.dispatchEvent(new Event('resize'));
      expect(h.effects).toHaveLength(18);
      expect(h.effects[8]?.frames[1]?.transform).toBe('translateX(2340px)');
      await vi.advanceTimersByTimeAsync(1050);
      await pending;
      expect(h.overlay.remove).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('settles reduced motion during entry and fails open if an exit animation is unavailable', async () => {
    vi.useFakeTimers();
    try {
      const reduced = introHarness();
      const reducedIntro = runIntro(reduced.document, measures('dark'), 'dark', reduced.env);
      Object.assign(reduced.reducedMotion, { matches: true });
      reduced.reducedMotion.dispatchEvent(new Event('change'));
      await expect(reducedIntro).resolves.toBeUndefined();
      expect(reduced.overlay.remove).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);

      const failed = introHarness();
      const animate = failed.env.animate;
      const pending = runIntro(failed.document, measures('dark'), 'dark', {
        ...failed.env,
        animate: (target, frames, options) => failed.effects.length === 8 ? undefined : animate(target, frames, options),
      });
      await vi.advanceTimersByTimeAsync(1830);
      await expect(pending).resolves.toBeUndefined();
      expect(failed.overlay.remove).toHaveBeenCalledOnce();
      expect(failed.document.documentElement.dataset['intro']).toBeUndefined();
      expect(failed.animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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
