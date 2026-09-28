import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mountHero } from '../src/hero/controller.js';
import { mountChip } from '../src/chip.js';
import { initializeTheme } from '../src/theme.js';
import { renderHero } from '../src/render/hero.js';
import { seamGeometry } from '../src/hero/seam.js';

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
  return { root, base, far, handle, line, controller, request, hero, advance, pointer, key, storage, reduced, resize, frames, page, figure, setWidth: (next: number) => { width = next; }, setHeight: (next: number) => { height = next; } };
}

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
  it('throws in 720ms; a storage commit supersedes the pending throw without another commit', async () => {
    const h = harness(); const complete = h.hero.throwAcross(); h.advance(719); expect(h.request).not.toHaveBeenCalled(); h.advance(1);
    expect(await complete).toBe('committed'); expect(h.controller.theme).toBe('light');
    const stale = h.hero.throwAcross(); h.advance(100); h.storage('dark'); expect(await stale).toBe('superseded'); h.advance(720);
    expect(h.request).toHaveBeenCalledTimes(1); expect(h.root.dataset['heroShare']).toBe('0'); h.hero.dispose();
  });
  it('chip cancellation commits nothing; three rapid presses leave chip, page and layers consistent', async () => {
    const h = harness(); const chip = new Node(); chip.ownerDocument = h.root.ownerDocument;
    const disposeChip = mountChip(chip as unknown as HTMLButtonElement, h.controller, h.hero);
    chip.dispatchEvent(new Event('click')); h.advance(100); chip.dispatchEvent(new Event('click')); h.advance(360);
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
