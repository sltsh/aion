import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mountHero } from '../src/hero/controller.js';
import { mountChip } from '../src/chip.js';
import { initializeTheme } from '../src/theme.js';
import { renderHero } from '../src/render/hero.js';
import { FLICK, glide, restingShare, seamGeometry } from '../src/hero/seam.js';

class Node extends EventTarget {
  dataset: Record<string, string> = {}; style = { clipPath: '', left: '', top: '', setProperty: vi.fn(), removeProperty: vi.fn() };
  attributes = new Map<string, string>(); classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() };
  textContent = ''; hidden = false; ownerDocument!: Document;
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string) { this.attributes.delete(name); }
  hasAttribute(name: string) { return this.attributes.has(name); }
  querySelector(_selector: string): Node | null { return null; }
  querySelectorAll(_selector: string): Node[] { return []; }
  closest(_selector: string): Node | null { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600, bottom: 600, right: 800 }; }
  focus = vi.fn(); setPointerCapture = vi.fn(); releasePointerCapture = vi.fn();
}
function harness(reduce = false) {
  let time = 0, id = 0;
  const frames = new Map<number, (time: number) => void>();
  const reduced = Object.assign(new EventTarget(), { matches: reduce });
  const resize = Object.assign(new EventTarget(), { innerHeight: 900, matchMedia: () => reduced });
  const document = Object.assign(new EventTarget(), { hidden: false, defaultView: resize });
  const page = new Node(); page.ownerDocument = document as unknown as Document;
  const system = Object.assign(new EventTarget(), { matches: false });
  const figure = new Node();
  const controller = initializeTheme({ root: page as unknown as HTMLElement, media: system as unknown as MediaQueryList, storage: null, storageEvents: resize, updateAssets: (theme) => { figure.dataset['themeValue'] = theme; } });
  const request = vi.spyOn(controller, 'request');
  const root = new Node(); root.ownerDocument = page.ownerDocument;
  const base = new Node(), far = new Node(), handle = new Node(), line = new Node(), farLine = new Node();
  const labels = [new Node(), new Node()]; handle.querySelectorAll = () => labels;
  handle.closest = (selector) => selector.includes('data-hero-handle') ? handle : null;
  root.querySelector = (selector) => ({ '[data-hero-base]': base, '[data-hero-far]': far, '[data-hero-handle]': handle, '[data-hero-seam]': line, '[data-hero-seam-far]': farLine })[selector] ?? null;
  let width = 800, height = 600; root.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, bottom: height, right: width });
  const hero = mountHero(root as unknown as HTMLElement, controller, { now: () => time, raf: (callback) => { frames.set(++id, callback); return id; }, cancelRaf: (key) => { frames.delete(key); }, reducedMotion: reduced as unknown as MediaQueryList, resize });
  const advance = (amount: number) => { time += amount; const queued = [...frames.values()]; frames.clear(); queued.forEach((callback) => callback(time)); };
  const pointer = (type: string, x: number, target: Node = handle) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { clientX: x, clientY: 360, pointerId: 1, pointerType: 'mouse', button: 0 });
    Object.defineProperty(event, 'target', { value: target }); root.dispatchEvent(event); return event;
  };
  const key = (name: string) => handle.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: name }));
  const storage = (theme: 'light' | 'dark') => resize.dispatchEvent(Object.assign(new Event('storage'), { key: 'aion-site-theme', newValue: theme }));
  return { root, base, far, handle, line, controller, request, hero, advance, pointer, key, storage, reduced, resize, frames, page, figure, setWidth: (next: number) => { width = next; }, setHeight: (next: number) => { height = next; }, chipClock: { now: () => time, raf: (callback: (time: number) => void) => { frames.set(++id, callback); return id; }, cancelRaf: (key: number) => { frames.delete(key); }, supportsViewTransitions: true } };
}

function releaseAt(h: ReturnType<typeof harness>, from: number, velocity: number, width = 1440, height = 900, type = 'pointerup') {
  h.setWidth(width); h.setHeight(height); h.resize.dispatchEvent(new Event('resize'));
  const x = (p: number) => (1 - p) * (width + height) - 360;
  h.pointer('pointerdown', x(Number(h.root.dataset['heroShare'])));
  h.advance(100); h.pointer('pointermove', x(from - velocity * 20));
  const first = Number(h.root.dataset['heroShare']);
  h.advance(20); h.pointer('pointermove', x(from));
  const actualFrom = Number(h.root.dataset['heroShare']);
  h.pointer(type, x(from));
  return { from: actualFrom, velocity: type === 'pointercancel' ? 0 : (actualFrom - first) / 20 };
}

describe('release physics', () => {
  const flick = FLICK * Math.SQRT2 / 2340;
  it('a flick at FLICK commits though its projection falls short of the magnet, within 720ms', () => {
    const h = harness(); releaseAt(h, 0.42, flick * (1 + 1e-12));
    h.advance(719); expect(h.request).not.toHaveBeenCalled();
    h.advance(17); expect(h.request).toHaveBeenCalledTimes(1); expect(h.controller.theme).toBe('light');
    expect(h.frames.size).toBe(0); h.advance(1000); expect(h.request).toHaveBeenCalledTimes(1); h.hero.dispose();
  });
  it('just under FLICK with a short projection does not commit and ends at its projection', () => {
    const h = harness(); const release = releaseAt(h, 0.42, flick * 0.99);
    h.advance(3200); expect(h.request).not.toHaveBeenCalled();
    expect(Number(h.root.dataset['heroShare'])).toBeCloseTo(restingShare(release.from, release.velocity), 6);
    expect(h.frames.size).toBe(0); h.hero.dispose();
  });
  it('a committing throw keeps its measured velocity until arrival', () => {
    const h = harness(); const release = releaseAt(h, 0.42, 0.004);
    const curve = glide(release.from, release.velocity);
    for (const elapsed of [20, 60, 120]) {
      h.advance(elapsed === 20 ? 20 : elapsed === 60 ? 40 : 60);
      expect(Number(h.root.dataset['heroShare'])).toBeCloseTo(curve(elapsed), 6);
      expect(h.request).not.toHaveBeenCalled();
    }
    h.advance(100); expect(h.request).toHaveBeenCalledTimes(1); expect(h.frames.size).toBe(0); h.hero.dispose();
  });
  it('a non-committing throw glides at its measured velocity before its magnet settle', () => {
    const h = harness(); const release = releaseAt(h, 0.1, -0.0002);
    h.advance(160); expect(Number(h.root.dataset['heroShare'])).toBeCloseTo(glide(release.from, release.velocity)(160), 6);
    h.advance(2000); expect(Number(h.root.dataset['heroShare'])).toBe(0); expect(h.request).not.toHaveBeenCalled(); expect(h.frames.size).toBe(0); h.hero.dispose();
  });
  it('hands over under half a normal pixel from the physical endpoint, before settling into a magnet', () => {
    const h = harness(); const release = releaseAt(h, 0.1, -0.0002);
    const endpoint = release.from + release.velocity * 320;
    const handover = 320 * Math.log(Math.abs(release.velocity) * 320 * 2340 / Math.SQRT2 / 0.5);
    h.advance(handover - 1);
    expect(Number(h.root.dataset['heroShare'])).toBeCloseTo(glide(release.from, release.velocity)(handover - 1), 6);
    h.advance(2); expect(Number(h.root.dataset['heroShare'])).toBeLessThanOrEqual(endpoint);
    expect(Number(h.root.dataset['heroShare'])).toBeGreaterThan(0); expect(h.frames.size).toBe(1);
    h.advance(159); expect(Number(h.root.dataset['heroShare'])).toBe(0); expect(h.frames.size).toBe(0); h.hero.dispose();
  });
  it.each([[0.42, -0.01], [0.99, -0.00001], [0.1, -0.0002], [0.02, 0], [0.42, 0], [0.1, -0.01]])('every non-committing release ends: p=%s v=%s', (from, velocity) => {
    const h = harness(); const release = releaseAt(h, from, velocity);
    const endpoint = Math.max(0, Math.min(1, release.from + release.velocity * 320));
    const remaining = Math.abs(endpoint - release.from);
    const distance = 0.5 * Math.SQRT2 / 2340;
    const handover = remaining <= distance ? 0 : -320 * Math.log(1 - (remaining - distance) / (Math.abs(release.velocity) * 320));
    h.advance(handover + 161);
    expect(Number(h.root.dataset['heroShare'])).toBeCloseTo(restingShare(release.from, release.velocity), 6);
    expect(h.request).not.toHaveBeenCalled(); expect(h.frames.size).toBe(0); h.hero.dispose();
  });
  it('a still release inside the far magnet commits', () => {
    const h = harness(); releaseAt(h, 0.96, 0); h.advance(736); expect(h.request).toHaveBeenCalledTimes(1); h.hero.dispose();
  });
  it('storage supersedes a flick and reduced motion finishes a flick immediately', () => {
    const h = harness(); releaseAt(h, 0.42, flick); h.advance(100); h.storage('light'); h.advance(1000);
    expect(h.request).not.toHaveBeenCalled(); expect(h.root.dataset['heroShare']).toBe('0'); expect(h.frames.size).toBe(0); h.hero.dispose();
    const reduced = harness(); releaseAt(reduced, 0.42, flick * (1 + 1e-12)); reduced.advance(100);
    reduced.reduced.matches = true; reduced.reduced.dispatchEvent(new Event('change'));
    expect(reduced.request).toHaveBeenCalledTimes(1); expect(reduced.frames.size).toBe(0); reduced.hero.dispose();
  });
  it('reduced motion ends a magnet glide at its final rest and pointercancel discards velocity', () => {
    const h = harness(); releaseAt(h, 0.99, -0.00001); h.advance(100);
    h.reduced.matches = true; h.reduced.dispatchEvent(new Event('change'));
    expect(Number(h.root.dataset['heroShare'])).toBe(0.94); expect(h.request).not.toHaveBeenCalled(); expect(h.frames.size).toBe(0); h.hero.dispose();
    const cancel = harness(); releaseAt(cancel, 0.42, 0.01, 1440, 900, 'pointercancel'); cancel.advance(1000);
    expect(Number(cancel.root.dataset['heroShare'])).toBeCloseTo(0.42, 6); expect(cancel.request).not.toHaveBeenCalled(); expect(cancel.frames.size).toBe(0); cancel.hero.dispose();
  });
  it('resize keeps both release phases on their original share timeline', () => {
    const h = harness(); const control = harness(); releaseAt(h, 0.1, -0.0002); releaseAt(control, 0.1, -0.0002);
    for (const elapsed of [100, 1450, 180, 160]) {
      h.advance(elapsed); control.advance(elapsed);
      const before = h.root.dataset['heroShare']; h.setWidth(390); h.setHeight(500); h.resize.dispatchEvent(new Event('resize'));
      expect(h.root.dataset['heroShare']).toBe(before); expect(h.root.dataset['heroShare']).toBe(control.root.dataset['heroShare']);
    }
    expect(h.frames.size).toBe(0); h.hero.dispose(); control.hero.dispose();
  });
  it('a flick started at zero and on a phone commits once, and resize preserves its velocity timeline', () => {
    for (const [width, height] of [[1440, 900], [390, 500]]) {
      const h = harness(); const control = harness();
      const release = releaseAt(h, 0.1, 0.004, width, height); releaseAt(control, 0.1, 0.004, width, height);
      h.advance(100); control.advance(100); expect(Number(h.root.dataset['heroShare'])).toBeCloseTo(glide(release.from, release.velocity)(100), 6);
      const before = h.root.dataset['heroShare']; h.setWidth(700); h.setHeight(650); h.resize.dispatchEvent(new Event('resize'));
      expect(h.root.dataset['heroShare']).toBe(before);
      h.advance(100); control.advance(100); expect(h.root.dataset['heroShare']).toBe(control.root.dataset['heroShare']);
      h.advance(536); control.advance(536); expect(h.request).toHaveBeenCalledTimes(1); expect(control.request).toHaveBeenCalledTimes(1);
      expect(h.frames.size).toBe(0); h.hero.dispose(); control.hero.dispose();
    }
  });
  it('a new drag and storage during magnet settling supersede the remaining release frames', () => {
    const h = harness(); releaseAt(h, 0.1, -0.0002); h.advance(1750); expect(h.frames.size).toBe(1);
    h.pointer('pointerdown', 440); expect(h.frames.size).toBe(0); h.advance(500); expect(h.request).not.toHaveBeenCalled(); h.hero.dispose();
    const storage = harness(); releaseAt(storage, 0.99, -0.00001); storage.advance(800); expect(storage.frames.size).toBe(1);
    storage.storage('light'); storage.advance(1000); expect(storage.root.dataset['heroShare']).toBe('0'); expect(storage.frames.size).toBe(0); expect(storage.request).not.toHaveBeenCalled(); storage.hero.dispose();
  });
});

describe('Diptych controller', () => {
  it('arrives to 42% in 720ms, and settles immediately with reduced motion', () => {
    const h = harness(); h.hero.arrive(); expect(h.root.dataset['heroShare']).toBe('0'); h.advance(720); expect(h.root.dataset['heroShare']).toBe('0.42'); h.hero.dispose();
    const reduced = harness(true); reduced.hero.arrive(); expect(reduced.root.dataset['heroShare']).toBe('0.42'); reduced.hero.dispose();
  });
  it('hover never moves the seam; zero-velocity and 93% releases do not commit', () => {
    const h = harness(); h.hero.arrive(); h.advance(720); const before = h.root.dataset['heroShare'];
    h.pointer('pointermove', 300, h.root); expect(h.root.dataset['heroShare']).toBe(before);
    h.pointer('pointerdown', 452); h.advance(100); h.pointer('pointermove', -262); h.advance(100); h.pointer('pointerup', -262); h.advance(3200);
    expect(Number(h.root.dataset['heroShare'])).toBeCloseTo(0.93); expect(h.request).not.toHaveBeenCalled(); h.hero.dispose();
  });
  it('a leftward throw reaches commit, and keyboard End also commits', () => {
    const h = harness(); h.hero.arrive(); h.advance(720); h.pointer('pointerdown', 452); h.advance(20); h.pointer('pointermove', -310); h.pointer('pointerup', -310); h.advance(3200);
    expect(h.request).toHaveBeenCalledWith('light', { scene: 'wipe' }); expect(h.base.dataset['theme']).toBe('light'); expect(h.far.dataset['theme']).toBe('dark');
    h.key('End'); h.advance(360); expect(h.controller.theme).toBe('dark'); h.hero.dispose();
  });
  it('storage commits cancel a drag and a glide, re-seat schemes and permit another reveal', () => {
    const h = harness(); h.hero.arrive(); h.advance(720); h.pointer('pointerdown', 452); h.storage('light');
    expect(h.root.releasePointerCapture).toHaveBeenCalledWith(1); expect(h.root.dataset['heroShare']).toBe('0');
    expect(h.page.dataset['theme']).toBe('light'); expect(h.base.dataset['theme']).toBe('light'); expect(h.far.dataset['theme']).toBe('dark');
    h.pointer('pointermove', 0); expect(h.root.dataset['heroShare']).toBe('0');
    h.key('PageUp'); h.advance(160); expect(h.root.dataset['heroShare']).toBe('0.25');
    h.pointer('pointerdown', 690); h.advance(20); h.pointer('pointermove', 620); h.pointer('pointerup', 620); h.storage('dark'); h.advance(3200);
    expect(h.root.dataset['heroShare']).toBe('0'); expect(h.request).not.toHaveBeenCalled(); h.hero.dispose();
  });
  it('a theme change keeps the resting share and swaps the schemes', () => {
    const h = harness(); h.hero.arrive(); h.advance(720); h.key('ArrowRight'); h.advance(160); h.key('ArrowRight'); h.advance(160);
    const rested = h.root.dataset['heroShare']; expect(Number(rested)).toBeCloseTo(0.32, 6);
    h.controller.request('light'); expect(h.root.dataset['heroShare']).toBe(rested);
    expect(h.base.dataset['theme']).toBe('light'); expect(h.far.dataset['theme']).toBe('dark'); h.hero.dispose();
  });
  it('a theme change from storage keeps the resting share', () => {
    const h = harness(); h.hero.arrive(); h.advance(720); const rested = h.root.dataset['heroShare']; expect(rested).toBe('0.42');
    h.storage('light'); expect(h.root.dataset['heroShare']).toBe(rested); expect(h.base.dataset['theme']).toBe('light');
    h.storage('dark'); expect(h.root.dataset['heroShare']).toBe(rested); expect(h.base.dataset['theme']).toBe('dark'); h.hero.dispose();
  });
  it('a thrown commit comes back at the throw\'s starting share', async () => {
    const h = harness(); h.hero.arrive(); h.advance(720); const complete = h.hero.throwAcross(); h.advance(720);
    expect(await complete).toBe('committed'); expect(h.controller.theme).toBe('light');
    expect(h.root.dataset['heroShare']).toBe('0.42'); expect(h.base.dataset['theme']).toBe('light'); expect(h.far.dataset['theme']).toBe('dark');
    h.pointer('pointerdown', 452); h.advance(20); h.pointer('pointermove', -310); h.pointer('pointerup', -310); h.advance(3200);
    expect(h.controller.theme).toBe('dark'); expect(h.root.dataset['heroShare']).toBe('0.42'); h.hero.dispose();
  });
  it('reduced motion keeps the share too', async () => {
    const h = harness(true); h.hero.arrive(); expect(h.root.dataset['heroShare']).toBe('0.42');
    h.controller.request('light'); expect(h.root.dataset['heroShare']).toBe('0.42');
    const complete = h.hero.throwAcross(); expect(await complete).toBe('committed');
    expect(h.controller.theme).toBe('dark'); expect(h.root.dataset['heroShare']).toBe('0.42'); h.hero.dispose();
  });
  it('the first paint before arrival is still 0', () => {
    const h = harness(); expect(h.root.dataset['heroShare']).toBe('0'); h.storage('light'); expect(h.root.dataset['heroShare']).toBe('0'); h.hero.dispose();
  });
  it('throws in 720ms; a storage commit supersedes the pending throw without another commit', async () => {
    const h = harness(); const complete = h.hero.throwAcross(); h.advance(719); expect(h.request).not.toHaveBeenCalled(); h.advance(1);
    expect(await complete).toBe('committed'); expect(h.controller.theme).toBe('light');
    const stale = h.hero.throwAcross(); h.advance(100); h.storage('dark'); expect(await stale).toBe('superseded'); h.advance(720);
    expect(h.request).toHaveBeenCalledTimes(1); expect(h.root.dataset['heroShare']).toBe('0'); h.hero.dispose();
  });
  it('a throw given its caller\'s start keeps that clock', async () => {
    const h = harness(); h.advance(40); const complete = h.hero.throwAcross(30); h.advance(709); expect(h.request).not.toHaveBeenCalled(); h.advance(1);
    expect(await complete).toBe('committed'); h.hero.dispose();
  });
  it('chip cancellation commits nothing; three rapid presses leave chip, page and layers consistent', async () => {
    const h = harness(); const chip = new Node(); chip.ownerDocument = h.root.ownerDocument;
    const chipBase = new Node(), chipIncoming = new Node();
    chip.querySelector = selector => selector === '[data-chip-base]' ? chipBase : selector === '[data-chip-incoming]' ? chipIncoming : null;
    const disposeChip = mountChip(chip as unknown as HTMLButtonElement, h.controller, h.hero, h.chipClock);
    chip.dispatchEvent(new Event('click')); h.advance(100);
    expect(Number(chip.dataset['chipProgress'])).toBeCloseTo(Number(h.root.dataset['heroShare']), 7);
    chip.dispatchEvent(new Event('click')); h.advance(180);
    expect(Number(chip.dataset['chipProgress'])).toBeCloseTo(Number(h.root.dataset['heroShare']), 7);
    h.advance(180);
    expect(h.request).not.toHaveBeenCalled(); expect(h.root.dataset['heroShare']).toBe('0');
    chip.dispatchEvent(new Event('click')); chip.dispatchEvent(new Event('click')); chip.dispatchEvent(new Event('click')); h.advance(720); await Promise.resolve(); await Promise.resolve();
    expect(h.controller.theme).toBe('light'); expect(h.page.dataset['theme']).toBe('light'); expect(chip.getAttribute('aria-checked')).toBe('true'); expect(h.base.dataset['theme']).toBe('light'); expect(h.far.dataset['theme']).toBe('dark');
    const throwAgain = h.hero.throwAcross(); h.storage('dark'); expect(await throwAgain).toBe('superseded'); expect(chip.getAttribute('aria-checked')).toBe('false'); expect(h.figure.dataset['themeValue']).toBe('dark');
    disposeChip(); h.hero.dispose();
  });
  it('disposal supersedes a throw; reduced motion commits it synchronously', async () => {
    const h = harness(); const cancelled = h.hero.throwAcross(); h.advance(100); h.hero.dispose(); expect(await cancelled).toBe('superseded'); expect(h.request).not.toHaveBeenCalled();
    const reduced = harness(); const complete = reduced.hero.throwAcross(); reduced.advance(100); reduced.reduced.matches = true; reduced.reduced.dispatchEvent(new Event('change'));
    expect(reduced.controller.theme).toBe('light'); expect(await complete).toBe('committed'); reduced.hero.dispose();
  });
  it('resize preserves share and recomputes geometry; arrival cannot override user intent', () => {
    const h = harness(); h.hero.arrive(); h.advance(720); h.setWidth(1200); h.resize.dispatchEvent(new Event('resize'));
    expect(h.root.dataset['heroShare']).toBe('0.42'); expect(h.far.style.clipPath).toBe(seamGeometry(0.42, 1200, 600).clip);
    expect(Number.parseFloat(h.handle.style.left)).toBeGreaterThanOrEqual(80); expect(Number.parseFloat(h.handle.style.left)).toBeLessThanOrEqual(1120);
    h.key('Home'); h.advance(360); h.hero.arrive(); h.advance(720); expect(h.root.dataset['heroShare']).toBe('0'); h.hero.dispose();
  });
  it('presses on links do not grab and pointercancel releases capture and settles', () => {
    const h = harness(); const link = new Node(); link.closest = () => link; h.pointer('pointerdown', 300, link); expect(h.root.setPointerCapture).not.toHaveBeenCalled();
    h.pointer('pointerdown', 440); h.pointer('pointercancel', 440); expect(h.root.releasePointerCapture).toHaveBeenCalledWith(1); h.hero.dispose();
  });
});

for (const released of [true, false]) it(`renders two complete layers with one accessible header and live CTA set, released=${released}`, () => {
  const html = renderHero({ released }); const far = html.split('<div class="hero-layer hero-far"')[1]!.split('</section>')[0]!;
  expect(html.match(/class="window vscode"/g)).toHaveLength(2); expect(html.match(/<header class="site-head">/g)).toHaveLength(1);
  expect(far).toContain('aria-hidden="true" inert'); expect(far.split('<svg')[0]).not.toMatch(/\bid=|<a\b/);
  expect(html).toContain('class="hero-editor" inert'); expect(html).toContain('role="slider" tabindex="0"');
  expect(html).toContain('aria-valuenow="0"'); expect(html.match(/href="https:\/\/open-vsx.org/g)).toHaveLength(1);
});

it('keeps the editor unselectable and gates both far picture and seam on JavaScript', () => {
  const css = readFileSync(new URL('../src/styles/hero.css', import.meta.url), 'utf8');
  expect(css).toMatch(/\.hero-editor\s*\{[^}]*pointer-events: none;[^}]*user-select: none/s);
  expect(css).toMatch(/\.hero-far\s*\{[^}]*pointer-events: none/s);
  expect(css).toContain('.hero-far, .hero-seam-svg, .hero-handle { display: none; }');
  expect(css).toContain('.js .hero-far, .js .hero-seam-svg, .js .hero-handle { display: block; }');
  const geometry = seamGeometry(0.5, 800, 600);
  expect(geometry.top).toBeLessThan(800); expect(geometry.top - 76).toBeGreaterThan(0);
});

it('measures the intrinsic height after setting editor scale, preserving share', () => {
 const h=harness();h.hero.arrive();h.advance(720);const editor=new Node();
 editor.style.setProperty=vi.fn(()=>{h.setHeight(750);});h.root.querySelectorAll=()=>[editor];
 h.resize.dispatchEvent(new Event('resize'));
 expect(h.root.dataset['heroShare']).toBe('0.42');expect(h.far.style.clipPath).toBe(seamGeometry(0.42,800,750).clip);h.hero.dispose();
});
it('observes later intrinsic size changes and disconnects on disposal', () => {
 let deliver=()=>{};const disconnect=vi.fn();
 vi.stubGlobal('ResizeObserver',class {constructor(callback:()=>void){deliver=callback;}observe(){}disconnect=disconnect;});
 try {const h=harness();h.hero.arrive();h.advance(720);h.setHeight(790);deliver();expect(h.root.dataset['heroShare']).toBe('0.42');expect(h.far.style.clipPath).toBe(seamGeometry(0.42,800,790).clip);h.hero.dispose();expect(disconnect).toHaveBeenCalledOnce();}finally{vi.unstubAllGlobals();}
});

// The measure loop: on phones the editor's height was 686px times the scale the controller writes from the hero's width,
// so the write resized the hero its ResizeObserver watches and WebKit reported an undelivered loop.
it('keeps the phone editor height independent of the scale the controller writes', () => {
  const css = readFileSync(new URL('../src/styles/hero.css', import.meta.url), 'utf8');
  const phone = css.slice(css.indexOf('@media (max-width: 600px)'));
  const editor = /\.hero-editor\s*\{([^}]*)\}/.exec(phone)?.[1] ?? '';
  expect(editor).toMatch(/aspect-ratio:\s*1244\s*\/\s*686/);
  expect(editor).toMatch(/width:\s*calc\(100% - 32px\)/);
  expect(editor).not.toMatch(/height:[^;]*--site-hero-scale/);
  expect(editor).not.toMatch(/min-height|max-height/);
});
