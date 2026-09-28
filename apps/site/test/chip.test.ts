import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mountChip, type ChipEnvironment, type Hero } from '../src/chip.js';
import type { Theme, ThemeCause, ThemeController } from '../src/theme.js';
import { renderChip } from '../src/render/chip.js';

class Node extends EventTarget {
  dataset: Record<string, string> = {}; style = { clipPath: '' }; hidden = false;
  attributes = new Map<string, string>(); classList = { toggle: vi.fn() };
  ownerDocument!: Document; focus = vi.fn();
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name); }
  contains(node: unknown) { return node === this; }
  querySelector(_selector: string): Node | null { return null; }
  querySelectorAll(_selector: string): Node[] { return []; }
  getBoundingClientRect() { return { left: 0, right: 144, top: 0, bottom: 52, width: 144, height: 52 }; }
}
const ease = (x: number) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) { const t = (lo + hi) / 2, u = 1 - t; if (3 * u * u * t * .22 + 3 * u * t * t * .36 + t ** 3 < x) lo = t; else hi = t; }
  return x >= 1 ? 1 : 1 - (1 - (lo + hi) / 2) ** 3;
};
function harness(onScreen = false, supported = true) {
  let time = 0, id = 0, theme: Theme = 'dark', resolveThrow: ((result: 'committed' | 'superseded') => void) | undefined;
  const frames = new Map<number, (time: number) => void>(), stale: Array<(time: number) => void> = [];
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const document = Object.assign(new EventTarget(), { scene: false, hidden: false, defaultView: { matchMedia: () => reduced }, documentElement: { hasAttribute: () => document.scene } });
  const button = new Node(), base = new Node(), incoming = new Node();
  button.ownerDocument = document as unknown as Document;
  base.querySelectorAll = incoming.querySelectorAll = () => ['dark', 'light'].map(scheme => Object.assign(new Node(), { dataset: { theme: scheme } }));
  button.querySelector = selector => selector === '[data-chip-base]' ? base : selector === '[data-chip-incoming]' ? incoming : null;
  const listeners = new Set<(theme: Theme, cause: ThemeCause) => void>();
  const publish = (next: Theme, cause: ThemeCause = 'request') => { theme = next; listeners.forEach(listener => listener(next, cause)); };
  const request = vi.fn((next: Theme, _options?: { scene?: 'wipe' | 'none'; onSceneStart?: (animation?: { readonly startTime?: CSSNumberish | null; readonly playState?: AnimationPlayState }) => void }) => publish(next));
  const controller: ThemeController = { get theme() { return theme; }, generation: 0, request, subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, dispose: vi.fn() };
  const hero: Hero = { onScreen: () => onScreen, throwAcross: vi.fn(() => new Promise<'committed' | 'superseded'>(resolve => { resolveThrow = resolve; })), cancelThrow: vi.fn(() => resolveThrow?.('superseded')), arrive: vi.fn(), dispose: vi.fn() };
  const environment: ChipEnvironment = { now: () => time, raf: callback => { frames.set(++id, callback); stale.push(callback); return id; }, cancelRaf: key => { frames.delete(key); }, reducedMotion: reduced as unknown as MediaQueryList, supportsViewTransitions: supported };
  const dispose = mountChip(button as unknown as HTMLButtonElement, controller, hero, environment);
  const advance = (amount: number) => { time += amount; const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(time)); };
  const press = () => button.dispatchEvent(new Event('click'));
  const commit = () => { publish('light'); resolveThrow?.('committed'); };
  return { button, base, incoming, frames, stale, request, hero, document, reduced, controller, press, advance, publish, commit, dispose, progress: () => Number(button.dataset['chipProgress']) };
}

describe('chip local wipe', () => {
  it('off screen starts on the click and runs 720 ms linear alongside its own theme notification', () => {
    const h = harness(); h.press();
    expect(h.request).toHaveBeenCalledWith('light', expect.objectContaining({ scene: 'wipe' })); expect(h.progress()).toBe(0); expect(h.incoming.hidden).toBe(false);
    h.advance(180); expect(h.progress()).toBe(.25); h.advance(180); expect(h.progress()).toBe(.5);
    h.advance(180); expect(h.progress()).toBe(.75); h.advance(180); expect(h.incoming.hidden).toBe(true); expect(h.base.dataset['chipState']).toBe('light'); h.dispose();
  });
  it('off screen restarts its 720 ms clock on the page scene\'s first frame', () => {
    const h = harness(); h.press(); h.advance(300); expect(h.progress()).toBeCloseTo(300 / 720, 7);
    const options = h.request.mock.calls[0]![1]!; options.onSceneStart!();
    h.advance(16); expect(h.progress()).toBe(0); h.advance(180); expect(h.progress()).toBe(.25); h.advance(360); expect(h.progress()).toBe(.75);
    h.advance(180); expect(h.incoming.hidden).toBe(true); expect(h.base.dataset['chipState']).toBe('light');
    options.onSceneStart!(); expect(h.frames.size).toBe(0); h.dispose();
  });
  it('off screen follows the page scene animation\'s resolved start and keeps it once cancelled', () => {
    const h = harness(); h.press(); h.advance(300);
    const scene: { startTime: number | null } = { startTime: null }; h.request.mock.calls[0]![1]!.onSceneStart!(scene);
    h.advance(16); expect(h.progress()).toBe(0); h.advance(16); expect(h.progress()).toBe(0); scene.startTime = 332 + 16; h.advance(16); expect(h.progress()).toBe(0);
    h.advance(180); expect(h.progress()).toBeCloseTo(180 / 720, 7); scene.startTime = null; h.advance(180); expect(h.progress()).toBeCloseTo(360 / 720, 7);
    h.advance(360); expect(h.incoming.hidden).toBe(true); h.dispose();
  });
  it('off screen runs on from its hold when the scene is cancelled before its start resolves', () => {
    const h = harness(); h.press(); h.request.mock.calls[0]![1]!.onSceneStart!({ startTime: null, playState: 'running' });
    h.advance(16); h.advance(16); expect(h.progress()).toBe(0);
    h.dispose();
    const g = harness(); g.press(); const pending: { startTime: null; playState: AnimationPlayState } = { startTime: null, playState: 'running' };
    g.request.mock.calls[0]![1]!.onSceneStart!(pending); g.advance(16); pending.playState = 'idle'; g.advance(180); expect(g.progress()).toBe(.25);
    g.advance(540); expect(g.incoming.hidden).toBe(true); g.dispose();
  });
  it('on screen starts on the click, follows the throw curve and is complete at its commit', () => {
    const h = harness(true); h.press(); expect(h.progress()).toBe(0); expect(h.request).not.toHaveBeenCalled();
    h.advance(360); expect(h.progress()).toBeCloseTo(ease(.5), 7); h.advance(360); expect(h.progress()).toBe(1);
    h.commit(); expect(h.base.dataset['chipState']).toBe('light'); expect(h.frames.size).toBe(0); h.advance(720); expect(h.frames.size).toBe(0); h.dispose();
  });
  it('a click immediately after the throw commit starts a new choice without cancelling it', () => {
    const h = harness(true); h.press(); h.advance(720); h.commit(); h.press();
    expect(h.hero.throwAcross).toHaveBeenCalledTimes(2); expect(h.hero.cancelThrow).not.toHaveBeenCalled(); h.dispose();
  });
  it('a second click reverses from current progress with the hero 360 ms cancel tween and commits nothing', async () => {
    const h = harness(true); h.press(); h.advance(180); const from = h.progress(); h.press();
    expect(h.hero.cancelThrow).toHaveBeenCalledOnce(); expect(h.progress()).toBe(from);
    await Promise.resolve(); h.advance(180); expect(h.progress()).toBeCloseTo(from * (1 - ease(.5)), 7);
    h.advance(180); expect(h.base.dataset['chipState']).toBe('dark'); expect(h.incoming.hidden).toBe(true); expect(h.request).not.toHaveBeenCalled(); h.dispose();
  });
  it.each(['request', 'storage', 'system', 'restore'] as const)('%s commits not started by the chip set it without a wipe', cause => {
    const h = harness(); expect(h.frames.size).toBe(0); h.publish('light', cause); expect(h.base.dataset['chipState']).toBe('light'); expect(h.incoming.hidden).toBe(true); expect(h.frames.size).toBe(0); h.dispose();
  });
  it('the latest choice mid-wipe wins over every stale frame', () => {
    const h = harness(); h.press(); h.advance(180); const obsolete = h.stale[0]!; h.press(); obsolete(720);
    h.advance(720); expect(h.controller.theme).toBe('dark'); expect(h.base.dataset['chipState']).toBe('dark'); expect(h.incoming.hidden).toBe(true); h.dispose();
  });
  it.each(['storage', 'system'] as const)('an external %s change cancels the throw and all stale callbacks', async cause => {
    const h = harness(true); h.press(); h.advance(180); const obsolete = h.stale[0]!; h.publish('light', cause); obsolete(720); await Promise.resolve();
    expect(h.hero.cancelThrow).toHaveBeenCalledOnce(); expect(h.frames.size).toBe(0); expect(h.base.dataset['chipState']).toBe('light'); expect(h.incoming.hidden).toBe(true); h.dispose();
  });
  it('reduced motion mid-wipe settles at once and never replays', () => {
    const h = harness(); h.press(); h.advance(180); const obsolete = h.stale[0]!; h.reduced.matches = true; h.reduced.dispatchEvent(new Event('change'));
    expect(h.incoming.hidden).toBe(true); expect(h.base.dataset['chipState']).toBe('light'); obsolete(720);
    h.reduced.matches = false; h.reduced.dispatchEvent(new Event('change')); expect(h.frames.size).toBe(0); h.dispose();
  });
  it('reduced motion during a hero throw commits the latest choice immediately', async () => {
    const h = harness(true); h.press(); h.advance(180); h.reduced.matches = true; h.reduced.dispatchEvent(new Event('change')); await Promise.resolve();
    expect(h.request).toHaveBeenCalledWith('light', { scene: 'none' }); expect(h.base.dataset['chipState']).toBe('light'); expect(h.frames.size).toBe(0); h.dispose();
  });
  it('hiding and disposing invalidate stale frames and pending throws', async () => {
    const h = harness(true); h.press(); const obsolete = h.stale[0]!; h.document.hidden = true; h.document.dispatchEvent(new Event('visibilitychange')); obsolete(720); await Promise.resolve();
    expect(h.frames.size).toBe(0); expect(h.incoming.hidden).toBe(true); expect(h.hero.cancelThrow).toHaveBeenCalledOnce(); h.dispose();
    const disposed = harness(true); disposed.press(); const late = disposed.stale[0]!; disposed.dispose(); late(720); await Promise.resolve(); expect(disposed.frames.size).toBe(0); expect(disposed.request).not.toHaveBeenCalled();
  });
  it('routes scene clicks retargeted outside the live chip to the latest choice only once', () => {
    const h = harness(); h.press(); h.advance(180); h.document.scene = true;
    const click = Object.assign(new Event('click', { cancelable: true }), { clientX: 72, clientY: 26 });
    h.document.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true); expect(h.request).toHaveBeenCalledTimes(2);
    expect(h.controller.theme).toBe('dark'); h.advance(720);
    const direct = Object.assign(new Event('click', { cancelable: true }), { clientX: 72, clientY: 26 });
    Object.defineProperty(direct, 'target', { value: h.button }); h.document.dispatchEvent(direct);
    expect(direct.defaultPrevented).toBe(false); expect(h.request).toHaveBeenCalledTimes(2); h.dispose();
  });
  it('without View Transitions commits immediately without a chip wipe or hero throw', () => {
    const h = harness(true, false); h.press(); expect(h.request).toHaveBeenCalledWith('light', { scene: 'none' }); expect(h.hero.throwAcross).not.toHaveBeenCalled(); expect(h.frames.size).toBe(0); expect(h.base.dataset['chipState']).toBe('light'); h.dispose();
  });
  it('renders an opaque base and one incoming state without the diagnosed hairline', () => {
    const html = renderChip(); expect(html).toContain('data-chip-base'); expect(html).toContain('data-chip-incoming'); expect(html).not.toContain('chip-seam');
  });
  it('keeps the incoming dark backing out from under the light half the wipe crosses', () => {
    const css = readFileSync(new URL('../src/styles/chip.css', import.meta.url), 'utf8');
    const seam = /\.chip-half-light \{[^}]*clip-path: polygon\(calc\(50% \+ (\d+)px\) 0, 100% 0, 100% 100%, calc\(50% - (\d+)px\) 100%\)/.exec(css);
    const backing = /\[data-chip-incoming\] \.chip-half-dark \{ clip-path: polygon\(0 0, calc\(50% \+ (\d+)px\) 0, calc\(50% - (\d+)px\) 100%, 0 100%\); \}/.exec(css);
    expect(seam).not.toBeNull(); expect(backing).not.toBeNull();
    expect(Number(backing![1]) - Number(seam![1])).toBe(1); expect(Number(seam![2]) - Number(backing![2])).toBe(1);
  });
});
