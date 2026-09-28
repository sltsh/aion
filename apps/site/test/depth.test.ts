import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { renderDepth } from '../src/render/depth.js';
import { measures } from '../src/measures.js';

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
});

test('assembly, stratum focus and pointer highlighting dispose cleanly', async () => {
  const { mountDepth } = await import('../src/chapters/depth.js');
  class Node extends EventTarget {
    dataset: Record<string, string> = {};
    attrs = new Map<string, string>();
    style = { clipPath: '', visibility: '' };
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
  expect(measured).toHaveBeenCalledTimes(initialMeasurements + 1);
  expect(button.hidden).toBe(false);
  button.dispatchEvent(new Event('click'));
  expect(button.attrs.get('aria-pressed')).toBe('true');
  button.dispatchEvent(new Event('click'));
  expect(button.attrs.get('aria-pressed')).toBe('false');
  expect(root.attrs.has('data-depth-apart')).toBe(true);
  const assemblyMeasurements = measured.mock.calls.length;
  deliverResize();
  deliverResize();
  expect(measured).toHaveBeenCalledTimes(assemblyMeasurements);
  expect(stage.style).toHaveProperty('height', `${1010 * (1100 - 180) / 1244}px`);
  expect(frame.style).toHaveProperty('top', `${200 * (1100 - 180) / 1244}px`);
  ruler.dispatchEvent(new Event('pointerenter'));
  expect(part.attrs.has('data-highlight')).toBe(true);
  ruler.dispatchEvent(new Event('focus'));
  ruler.dispatchEvent(new Event('pointerleave'));
  expect(part.attrs.has('data-highlight')).toBe(true);
  ruler.dispatchEvent(new Event('blur'));
  expect(part.attrs.has('data-highlight')).toBe(false);
  dispose();
  expect(button.hidden).toBe(true);
  expect(root.attrs.has('data-depth-apart')).toBe(false);
  button.dispatchEvent(new Event('click'));
  expect(button.attrs.get('aria-pressed')).toBe('true');
  await Promise.resolve();
  vi.unstubAllGlobals();
});
