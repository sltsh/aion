import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { renderDepth } from '../src/render/depth.js';
import { measures } from '../src/measures.js';
import { DEPTH_SCALE, fitDepthScale } from '../src/chapters/depth.js';

test('the editor uses DEPTH_SCALE times its fitted size where the column allows it', () => {
  for (const width of [1440, 1280, 1100, 768]) {
    const fitted = Math.min(1, Math.max(.1, (width - 180) / 1244));
    const bounded = Math.min(fitted * DEPTH_SCALE, width / (1244 + 90 + 52));
    expect(fitDepthScale(width)).toBeCloseTo(bounded, 8);
    expect(fitDepthScale(width)).toBeGreaterThan(fitted);
  }
});

test('the scaled editor stays within its column when assembled and exploded', () => {
  for (const width of [1440, 1280, 1100, 768]) {
    const scale = fitDepthScale(width);
    const assembledLeft = (width - 1244 * scale) / 2;
    const explodedRight = (90 + 1244 + 52) * scale;
    expect(assembledLeft).toBeGreaterThanOrEqual(0);
    expect(assembledLeft + 1244 * scale).toBeLessThanOrEqual(width + 1e-8);
    expect(explodedRight).toBeLessThanOrEqual(width + 1e-8);
  }
});

for (const released of [false, true]) test(`the ruler and every part carry both schemes' ratios (${released})`, () => {
  const html = renderDepth({ released });
  for (const scheme of ['dark', 'light'] as const) {
    for (const row of [...measures(scheme).strata, ...measures(scheme).parts]) {
      expect(html).toContain(row.name);
      expect(html).toContain(`data-theme-value="${scheme}">${row.ratio.toFixed(2)}:1`);
    }
  }
  expect([...html.matchAll(/class="depth-stratum" data-stratum="([^"]+)"/g)].map((match) => match[1])).toEqual(['editor', 'panel', 'bars', 'widgets']);
  for (const [index, part] of measures('dark').parts.entries()) expect(html).toContain(`data-depth-part="${index}" data-stratum="${part.stratum}"`);
  expect(html).toContain('class="depth-stratum-heading"><i style="background:var(--n-editor)');
  expect(html).toContain('data-depth-base');
  expect(html).toContain(`style="--site-depth-scale:${DEPTH_SCALE}"`);
  expect(html).not.toContain('data-depth-apart');
  expect(html).toContain('aria-pressed="true"');
});
test('below 760px the stratum list replaces the exploded picture and motion is gated', () => {
  const css = readFileSync(new URL('../src/styles/depth.css', import.meta.url), 'utf8');
  expect(css).toContain('@media (max-width: 759px)');
  expect(css).toContain('.depth-stage { display: none; }');
  expect(css).toContain('.depth-list { display: grid; }');
  expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
  expect(css).toContain('var(--slt-motion-scene, 720ms)');
  expect(css).toContain('[data-highlight] .depth-outline');
  expect(css).toContain('.depth-chapter:not([data-depth-mounted]) .depth-frame{zoom:min(var(--site-depth-scale,1),tan(atan2(100cqw,1244px)))}');
  expect(css).toContain('aspect-ratio:1244/686');
});

test('assembly, stratum focus and pointer highlighting dispose cleanly', async () => {
  const { mountDepth } = await import('../src/chapters/depth.js');
  class Node extends EventTarget {
    dataset: Record<string, string> = {};
    attrs = new Map<string, string>();
    style = Object.assign(new Map<string, string>(), { clipPath: '', visibility: '',
      setProperty(this: Map<string, string>, name: string, value: string) { this.set(name, value); },
      removeProperty(this: Map<string, string>, name: string) { this.delete(name); } });
    hidden = true;
    textContent = '';
    clientWidth = 0;
    toggleAttribute(name: string, on: boolean) { if (on) this.attrs.set(name, ''); else this.attrs.delete(name); }
    setAttribute(name: string, value: string) { this.attrs.set(name, value); }
    removeAttribute(name: string) { this.attrs.delete(name); }
    getBoundingClientRect() { return { width: 1244, left: 0, top: 0 }; }
    querySelector() { return null; }
  }
  const stage = new Node(), frame = new Node(), base = new Node(), editor = new Node(), button = new Node(), ruler = new Node(), part = new Node();
  ruler.dataset['stratum'] = part.dataset['stratum'] = 'bars';
  const view = new EventTarget();
  const root = new Node() as Node & { ownerDocument: unknown };
  root.ownerDocument = { defaultView: view, fonts: { ready: Promise.resolve() } };
  base.querySelector = () => editor as never;
  const nodes: Record<string, Node> = { '[data-depth-stage]': stage, '[data-depth-frame]': frame, '[data-depth-base]': base, '[data-depth-assemble]': button };
  root.querySelector = (selector?: string) => nodes[selector ?? ''] as never;
  Object.assign(root, { querySelectorAll: (selector: string) => selector === '.depth-ruler [data-stratum]' ? [ruler] : [part] });
  let deliverResize = () => {};
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { deliverResize = callback; }
    observe() {}
    disconnect() {}
  });
  stage.clientWidth = 1000;
  const measured = vi.spyOn(editor, 'getBoundingClientRect');
  const dispose = mountDepth(root as unknown as HTMLElement);
  await Promise.resolve();
  const initialMeasurements = measured.mock.calls.length;
  deliverResize();
  expect(measured).toHaveBeenCalledTimes(initialMeasurements);
  stage.clientWidth = 1100;
  deliverResize();
  expect(measured).toHaveBeenCalledTimes(initialMeasurements);
  expect(button.hidden).toBe(false);
  expect(root.attrs.has('data-depth-mounted')).toBe(true);
  button.dispatchEvent(new Event('click'));
  expect(button.attrs.get('aria-pressed')).toBe('true');
  button.dispatchEvent(new Event('click'));
  expect(button.attrs.get('aria-pressed')).toBe('false');
  expect(root.attrs.has('data-depth-apart')).toBe(true);
  const assemblyMeasurements = measured.mock.calls.length;
  deliverResize();
  deliverResize();
  expect(measured).toHaveBeenCalledTimes(assemblyMeasurements);
  expect(root.style.get('--site-depth-scale')).toBe(String(fitDepthScale(1100)));
  ruler.dispatchEvent(new Event('pointerenter'));
  expect(part.attrs.has('data-highlight')).toBe(true);
  ruler.dispatchEvent(new Event('focus'));
  ruler.dispatchEvent(new Event('pointerleave'));
  expect(part.attrs.has('data-highlight')).toBe(true);
  ruler.dispatchEvent(new Event('blur'));
  expect(part.attrs.has('data-highlight')).toBe(false);
  dispose();
  expect(button.hidden).toBe(true);
  expect(root.attrs.has('data-depth-mounted')).toBe(false);
  expect(root.attrs.has('data-depth-apart')).toBe(false);
  expect(root.attrs.has('data-depth-moved')).toBe(false);
  expect(root.style.has('--site-depth-scale')).toBe(false);
  button.dispatchEvent(new Event('click'));
  expect(button.attrs.get('aria-pressed')).toBe('true');
  await Promise.resolve();
  vi.unstubAllGlobals();
});

// The resize drift: every width change rebuilt the parts and rewrote transitioned height, left, top and transform.
test('a resize rescales the Depth stage without rebuilding it or starting a transition', async () => {
  const css = readFileSync(new URL('../src/styles/depth.css', import.meta.url), 'utf8');
  const transitions = [...css.matchAll(/transition:([^;}]+)/g)].map((match) => match[1]!.trim().split(/\s+/)[0]);
  expect(transitions).toEqual(['--site-depth-f']);
  expect(css).toMatch(/\[data-depth-moved\][^{]*\{transition:--site-depth-f/);
  expect(css).toContain('@property --site-depth-f');
  const { mountDepth } = await import('../src/chapters/depth.js');
  const written: string[] = [];
  const node = (name: string) => {
    const target = new EventTarget() as EventTarget & Record<string, unknown>;
    const style = new Proxy({ setProperty: (key: string) => { written.push(`${name}.${key}`); }, removeProperty: () => {} } as Record<string, unknown>, {
      set: (object, key, value) => { if (typeof key === 'string' && key !== 'clipPath' && key !== 'visibility') written.push(`${name}.${key}`); object[key as string] = value; return true; },
    });
    return Object.assign(target, { name, dataset: {}, style, hidden: true, textContent: '', clientWidth: 0, attrs: new Map<string, string>(),
      toggleAttribute(key: string, on: boolean) { if (on) this.attrs.set(key, ''); else this.attrs.delete(key); written.push(`${name}[${key}]`); },
      setAttribute(key: string, value: string) { this.attrs.set(key, value); written.push(`${name}[${key}]`); },
      removeAttribute(key: string) { this.attrs.delete(key); },
      getBoundingClientRect: () => ({ width: 1244, left: 0, top: 0 }), querySelector: ((): unknown => null) as (selector: string) => unknown, querySelectorAll: () => [], append: () => { written.push(`${name}.append`); } });
  };
  const stage = node('stage'), frame = node('frame'), base = node('base'), editor = node('editor'), button = node('button');
  const root = node('root');
  const view = new EventTarget();
  base['querySelector'] = () => editor;
  root['ownerDocument'] = { defaultView: view, fonts: { ready: new Promise(() => {}) }, createElement: () => node('mover') };
  const nodes: Record<string, unknown> = { '[data-depth-stage]': stage, '[data-depth-frame]': frame, '[data-depth-base]': base, '[data-depth-assemble]': button };
  root['querySelector'] = (selector: string) => nodes[selector] ?? null;
  let deliverResize = () => {};
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { deliverResize = callback; } observe() {} disconnect() {} });
  stage.clientWidth = 1100;
  const measured = vi.spyOn(editor as unknown as { getBoundingClientRect: () => unknown }, 'getBoundingClientRect');
  const dispose = mountDepth(root as unknown as HTMLElement);
  const built = measured.mock.calls.length;
  for (const width of [900, 1440, 760, 1100]) {
    written.length = 0;
    stage.clientWidth = width;
    deliverResize();
    view.dispatchEvent(new Event('resize'));
    expect(written).toEqual(['root.--site-depth-scale']);
    expect((root.attrs as Map<string, string>).has('data-depth-moved')).toBe(false);
  }
  expect(measured).toHaveBeenCalledTimes(built);
  stage.clientWidth = 0;
  deliverResize();
  stage.clientWidth = 1244;
  written.length = 0;
  deliverResize();
  expect(written).toEqual(['root.--site-depth-scale']);
  expect(measured).toHaveBeenCalledTimes(built);
  button.dispatchEvent(new Event('click'));
  expect((root.attrs as Map<string, string>).has('data-depth-moved')).toBe(true);
  dispose();
  vi.unstubAllGlobals();
});

// Fonts arriving during an assembly re-measured by deleting every transitioning mover and cloning replacements at the end state.
test('fonts arriving mid-assembly re-cut the existing movers in place', async () => {
  const { mountDepth } = await import('../src/chapters/depth.js');
  let shift = 0;
  const removed: string[] = [];
  const node = (name: string, box = { left: 0, top: 0, width: 1244, height: 686 }) => {
    const target = new EventTarget() as EventTarget & Record<string, unknown>;
    const style: Record<string, unknown> = { setProperty(key: string, value: string) { style[key] = value; }, removeProperty(key: string) { delete style[key]; } };
    const children: unknown[] = [];
    return Object.assign(target, { name, dataset: { stratum: 'bars' } as Record<string, string>, style, children, hidden: true, textContent: '', innerHTML: name, clientWidth: 0, attrs: new Map<string, string>(),
      toggleAttribute(key: string, on: boolean) { if (on) this.attrs.set(key, ''); else this.attrs.delete(key); },
      setAttribute(key: string, value: string) { this.attrs.set(key, value); },
      removeAttribute(key: string) { this.attrs.delete(key); },
      getBoundingClientRect: () => ({ ...box, left: box.left + (name === 'editor' ? 0 : shift), top: box.top }),
      querySelector: ((): unknown => null) as (selector: string) => unknown, querySelectorAll: (): unknown[] => [],
      append(...nodes: unknown[]) { children.push(...nodes); }, remove() { removed.push(name); }, cloneNode: () => node(`${name}-clone`) });
  };
  const stage = node('stage'), frame = node('frame'), base = node('base'), editor = node('editor'), button = node('button');
  const parts = new Map([['.vscode-title', node('title', { left: 0, top: 0, width: 1244, height: 30 })], ['.status-bar', node('status', { left: 0, top: 664, width: 1244, height: 22 })]]);
  editor['querySelector'] = (selector: string) => parts.get(selector) ?? null;
  const labels = [node('label-0'), node('label-5')];
  const root = node('root');
  const view = new EventTarget();
  let fontsLoaded = () => {};
  base['querySelector'] = () => editor;
  root['ownerDocument'] = { defaultView: view, fonts: { ready: new Promise<void>((resolve) => { fontsLoaded = resolve; }) }, createElement: (tag: string) => node(tag) };
  const nodes: Record<string, unknown> = { '[data-depth-stage]': stage, '[data-depth-frame]': frame, '[data-depth-base]': base, '[data-depth-assemble]': button, '[data-depth-part="0"]': labels[0], '[data-depth-part="5"]': labels[1] };
  root['querySelector'] = (selector: string) => nodes[selector] ?? null;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  stage.clientWidth = 1100;
  const dispose = mountDepth(root as unknown as HTMLElement);
  const movers = [...(frame['children'] as Array<Record<string, unknown>>)];
  expect(movers).toHaveLength(2);
  expect(button.hidden).toBe(false);
  expect((root.attrs as Map<string, string>).has('data-depth-mounted')).toBe(true);
  const clones = movers.map((mover) => (mover['children'] as Array<Record<string, Record<string, unknown>>>)[0]!);
  const before = clones.map((clone) => clone['style']!['clipPath']);
  button.dispatchEvent(new Event('click'));
  expect(button.attrs.get('aria-pressed')).toBe('true');
  expect((root.attrs as Map<string, string>).has('data-depth-apart')).toBe(false);
  expect((root.attrs as Map<string, string>).has('data-depth-moved')).toBe(true);
  shift = 12;
  fontsLoaded();
  await Promise.resolve();
  await Promise.resolve();
  expect(removed).toEqual([]);
  expect(frame['children']).toEqual(movers);
  expect(movers.map((mover) => (mover['children'] as unknown[])[0])).toEqual(clones);
  const after = clones.map((clone) => clone['style']!['clipPath']);
  expect(after).not.toEqual(before);
  expect(after[0]).toBe('inset(0px -12px 656px 12px)');
  expect(movers.map((mover) => (mover['style'] as Record<string, unknown>)['--site-depth-x'])).toEqual(['0px', '0px']);
  expect(movers.map((mover) => (mover['style'] as Record<string, unknown>)['--site-depth-y'])).toEqual(['-156px', '104px']);
  expect((root.attrs as Map<string, string>).has('data-depth-apart')).toBe(false);
  expect((root.attrs as Map<string, string>).has('data-depth-moved')).toBe(true);
  expect(button.attrs.get('aria-pressed')).toBe('true');
  dispose();
  expect(removed).toEqual(['div', 'div']);
  vi.unstubAllGlobals();
});

test('an idle late font load refreshes geometry in place and disposal removes the movers', async () => {
  const { mountDepth } = await import('../src/chapters/depth.js');
  let shift = 0;
  const removed: string[] = [];
  const node = (name: string, box = { left: 0, top: 0, width: 1244, height: 686 }) => {
    const target = new EventTarget() as EventTarget & Record<string, unknown>;
    const style: Record<string, unknown> = { setProperty(key: string, value: string) { style[key] = value; }, removeProperty(key: string) { delete style[key]; } };
    const children: unknown[] = [];
    return Object.assign(target, { name, dataset: { stratum: 'bars' } as Record<string, string>, style, children, hidden: true, textContent: '', innerHTML: name, clientWidth: 0, attrs: new Map<string, string>(),
      toggleAttribute(key: string, on: boolean) { if (on) this.attrs.set(key, ''); else this.attrs.delete(key); },
      setAttribute(key: string, value: string) { this.attrs.set(key, value); },
      removeAttribute(key: string) { this.attrs.delete(key); },
      getBoundingClientRect: () => ({ ...box, left: box.left + (name === 'editor' ? 0 : shift), top: box.top }),
      querySelector: ((): unknown => null) as (selector: string) => unknown, querySelectorAll: (): unknown[] => [],
      append(...nodes: unknown[]) { children.push(...nodes); }, remove() { removed.push(name); }, cloneNode: () => node(`${name}-clone`) });
  };
  const stage = node('stage'), frame = node('frame'), base = node('base'), editor = node('editor'), button = node('button');
  const parts = new Map([['.vscode-title', node('title', { left: 0, top: 0, width: 1244, height: 30 })], ['.status-bar', node('status', { left: 0, top: 664, width: 1244, height: 22 })]]);
  editor['querySelector'] = (selector: string) => parts.get(selector) ?? null;
  const labels = [node('label-0'), node('label-5')];
  const root = node('root');
  base['querySelector'] = () => editor;
  let fontsLoaded = () => {};
  root['ownerDocument'] = { defaultView: new EventTarget(), fonts: { ready: new Promise<void>((resolve) => { fontsLoaded = resolve; }) }, createElement: (tag: string) => node(tag) };
  const nodes: Record<string, unknown> = { '[data-depth-stage]': stage, '[data-depth-frame]': frame, '[data-depth-base]': base, '[data-depth-assemble]': button, '[data-depth-part="0"]': labels[0], '[data-depth-part="5"]': labels[1] };
  root['querySelector'] = (selector: string) => nodes[selector] ?? null;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  stage.clientWidth = 1100;
  const dispose = mountDepth(root as unknown as HTMLElement);
  const movers = [...(frame['children'] as Array<Record<string, unknown>>)];
  expect(movers).toHaveLength(2);
  expect(button.hidden).toBe(false);
  const clones = movers.map((mover) => (mover['children'] as Array<Record<string, Record<string, unknown>>>)[0]!);
  const before = clones.map((clone) => clone['style']!['clipPath']);
  shift = 12;
  fontsLoaded();
  await Promise.resolve();
  await Promise.resolve();
  expect(frame['children']).toEqual(movers);
  expect(clones.map((clone) => clone['style']!['clipPath'])).not.toEqual(before);
  expect(clones[0]!['style']!['clipPath']).toBe('inset(0px -12px 656px 12px)');
  expect(removed).toEqual([]);
  expect((root.attrs as Map<string, string>).has('data-depth-apart')).toBe(true);
  expect((root.attrs as Map<string, string>).has('data-depth-moved')).toBe(false);
  expect(button.attrs.get('aria-pressed')).toBe('false');
  dispose();
  expect(removed).toEqual(['div', 'div']);
  expect(button.hidden).toBe(true);
  vi.unstubAllGlobals();
});
