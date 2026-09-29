import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildPalette, lightPalette, hex, stackBackground, distanceEmitted, contrastEmitted, hexToOklch } from '@sltsh/aion-tokens';
import { variables } from '@sltsh/aion-lab/variables';
import { TOOLBAR, PLACEMENT, enabledAt, drawnBackgrounds, togglePlacement, placementRatios, toolbarStack } from '../src/chapters/placement.js';
import type { ToolbarLayer } from '../src/chapters/placement.js';
import { cancelCount, countTo } from '../src/chapters/states.js';
import type { CountEnvironment } from '../src/chapters/states.js';
import { renderStates, stateFragments } from '../src/render/states.js';
import { CONTENT, STATE_SAMPLE } from '../src/content.js';
for (const layer of TOOLBAR) test(`fragments preserve every token under ${layer}`, () => {
  const on = togglePlacement(new Set(), layer);
  for (const source of [buildPalette(), lightPalette]) {
    const backgrounds = drawnBackgrounds(on, source);
    for (const [line, tokens] of STATE_SAMPLE.entries()) {
      const fragments = stateFragments(line);
      expect(fragments.map(fragment => fragment.text).join('')).toBe(tokens.map(([, text]) => text).join(''));
      for (const fragment of fragments) expect(backgrounds.some(row => row.span.line === line && row.span.from <= fragment.from && row.span.to >= fragment.to)).toBe(true);
      for (const [role] of tokens) expect(fragments.some(fragment => fragment.role === role)).toBe(true);
    }
    expect(placementRatios(source, on).every(row => row.ratio >= 4.5)).toBe(true);
  }
});
test('spatially separate added and removed states remain eligible', () => {
  expect(enabledAt(new Set(['addedLine']), 'removedWord')).toBe(true);
  expect(enabledAt(new Set(['lineHighlight']), 'selection')).toBe(false);
});
test('meters count in 560ms, show a delta for 1.8s and settle reduced motion immediately', () => {
  let now = 0, value = 0, delta: number | null = null, next = 0;
  const frames = new Map<number, (time: number) => void>(), timers = new Map<number, { due: number; run: () => void }>();
  const env: CountEnvironment = { now: () => now, reducedMotion: () => false,
    raf: fn => { frames.set(++next, fn); return next; }, cancelRaf: id => { frames.delete(id); },
    setTimer: (fn, ms) => { timers.set(++next, { due: now + ms, run: fn }); return next; },
    clearTimer: id => { timers.delete(id); }, value: n => { value = n; }, delta: n => { delta = n; } };
  countTo(4, 8, env); expect(delta).toBe(4);
  now = 280; const tick = [...frames.values()][0]!; frames.clear(); tick(now); expect(value).toBeCloseTo(7.8455301912, 6);
  now = 560; const last = [...frames.values()][0]!; frames.clear(); last(now); expect(value).toBe(8); expect(delta).toBe(4);
  expect([...timers.values()][0]!.due).toBe(1800); now = 1800; [...timers.values()][0]!.run(); expect(delta).toBeNull();
  timers.clear();
  countTo(4, 8, env); const stale = [...frames.values()][0]!;
  countTo(4, 6, env); stale(2200); expect(value).toBe(4);
  cancelCount(env); expect(value).toBe(6); expect(frames.size).toBe(0); expect(timers.size).toBe(0);
  countTo(8, 5, { ...env, reducedMotion: () => true }); expect(value).toBe(5); expect(delta).toBeNull();
});
for (const released of [true, false]) test(`complete code sample, scroll access and no obsolete action, released=${released}`, () => {
  const html = renderStates({ released });
  expect(html.match(/data-state-line=/g)).toHaveLength(STATE_SAMPLE.length * 2);
  expect(html).toContain('tabindex="0"'); expect(html).toContain(CONTENT.states.codeLabel);
  expect(html).not.toContain('Show it'); expect(html).not.toContain('open question');
  expect(html).not.toContain('data-delta-visible');
  expect(html).toContain('data-state-toggle="mergeConflict"');
  expect(html).not.toContain('mergeChangeWord');
  for (const source of [buildPalette(), lightPalette]) for (const layer of TOOLBAR) expect(html).toContain(hex(stackBackground(source, source.neutral.editor, toolbarStack(layer))));
  const css = readFileSync(new URL('../src/styles/states.css', import.meta.url), 'utf8');
  expect(css).toMatch(/font:[^;]*22px/); expect(css).toContain('max-width:599px'); expect(css).toContain('font-size:16px');
});

test('scheme changes retain covered toggles, clear deltas and disposal removes interaction', async () => {
  const { mountStates } = await import('../src/chapters/states.js');
  class Node extends EventTarget {
    textContent = ''; disabled = true; title = ''; style: Record<string, string> = {};
    dataset: Record<string, string> = {}; attrs = new Map<string, string>();
    children = new Map<string, Node>();
    setAttribute(name: string, value: string) { this.attrs.set(name, value); }
    removeAttribute(name: string) { this.attrs.delete(name); }
    toggleAttribute(name: string, on: boolean) { if (on) this.attrs.set(name, ''); else this.attrs.delete(name); }
    querySelector(selector: string) { return this.children.get(selector); }
    fragments: Node[] = [];
    rows: Node[] = [];
    querySelectorAll(selector?: string) { return selector === '[data-state-line]' ? this.rows : this.fragments; }
  }
  const buttons = TOOLBAR.map(layer => { const node = new Node(); node.dataset['stateToggle'] = layer; return node; });
  const variants = Object.fromEntries((['dark', 'light'] as const).map(scheme => {
    const variant = new Node();
    for (const [line] of STATE_SAMPLE.entries()) {
      const row = new Node(); row.dataset['stateLine'] = String(line); row.children.set('code', new Node()); variant.rows.push(row);
    }
    for (const [line] of STATE_SAMPLE.entries()) for (const fragment of stateFragments(line)) {
      const node = new Node(); node.textContent = fragment.text; node.dataset = { line: String(line), from: String(fragment.from), to: String(fragment.to), role: fragment.role }; variant.fragments.push(node);
    }
    for (const role of ['comment', 'keyword', 'variable', 'operator', 'punctuation', 'function']) {
      const meter = new Node();
      for (const key of ['value', 'delta', 'lowest', 'fill']) meter.children.set(`[data-state-${key}]`, new Node());
      variant.children.set(`[data-state-meter="${role}"]`, meter);
    }
    variant.children.set('[data-state-bghex]', new Node()); variant.children.set('[data-state-bg-swatch]', new Node());
    return [scheme, variant];
  }));
  const root = new Node(); for (const key of ['reasons', 'note']) root.children.set(`[data-state-${key}]`, new Node());
  root.children.set('[data-state-scheme="dark"]', variants['dark']!); root.children.set('[data-state-scheme="light"]', variants['light']!);
  root.querySelectorAll = () => buttons;
  let scheme: 'dark' | 'light' = 'dark', notify = () => {};
  const controller = { get theme() { return scheme; }, generation: 0, request: () => {}, dispose: () => {},
    subscribe: (fn: (theme: 'dark' | 'light', cause: 'request') => void) => { notify = () => fn(scheme, 'request'); return () => { notify = () => {}; }; } };
  const reduced = Object.assign(new EventTarget(), { matches: true });
  const dispose = mountStates(root as unknown as HTMLElement, controller, { dark: buildPalette(), light: lightPalette }, { reducedMotion: reduced as unknown as MediaQueryList });
  const word = buttons.find(button => button.dataset['stateToggle'] === 'addedWord')!;
  word.dispatchEvent(new Event('click')); expect(word.attrs.get('aria-pressed')).toBe('true');
  expect(buttons.find(button => button.dataset['stateToggle'] === 'removedLine')!.disabled).toBe(false);
  expect(variants['dark']!.rows[2]!.children.get('code')!.style['backgroundColor']).toBe(hex(stackBackground(buildPalette(), buildPalette().neutral.editor, ['addedLine'])));
  expect(variants['dark']!.rows[2]!.children.get('code')!.dataset['lineLayers']).toBe('addedLine');
  scheme = 'light'; notify(); expect(word.attrs.get('aria-pressed')).toBe('true');
  expect(variants['light']!.rows[2]!.children.get('code')!.style['backgroundColor']).toBe(hex(stackBackground(lightPalette, lightPalette.neutral.editor, ['addedLine'])));
  const selected = new Set<ToolbarLayer>(['addedLine', 'addedWord']);
  expect(variants['light']!.children.get('[data-state-bghex]')!.textContent).toBe([...new Set(drawnBackgrounds(selected, lightPalette).map(row => hex(row.background)))].join(', '));
  expect(variants['light']!.children.get('[data-state-meter="comment"]')!.children.get('[data-state-delta]')!.textContent).toBe('');
  const current = buttons.find(button => button.dataset['stateToggle'] === 'lineHighlight')!;
  const selection = buttons.find(button => button.dataset['stateToggle'] === 'selection')!;
  current.dispatchEvent(new Event('click'));
  expect(selection.disabled).toBe(false); expect(selection.attrs.get('aria-disabled')).toBe('true');
  expect(selection.attrs.get('aria-describedby')).toBe('states-reasons'); expect(selection.title).toContain('Line 2, columns');
  selection.dispatchEvent(new Event('click')); expect(selection.attrs.get('aria-pressed')).toBe('false');
  for (const layer of TOOLBAR) {
    const button = buttons.find(button => button.dataset['stateToggle'] === layer)!;
    button.dispatchEvent(new Event('click'));
    const on = new Set(buttons.filter(button => button.attrs.get('aria-pressed') === 'true').map(button => button.dataset['stateToggle'] as ToolbarLayer));
    const drawn = drawnBackgrounds(on, lightPalette);
    for (const fragment of variants['light']!.fragments) {
      const row = drawn.find(row => row.span.line === Number(fragment.dataset['line']) && row.span.from <= Number(fragment.dataset['from']) && row.span.to >= Number(fragment.dataset['to']))!;
      expect(fragment.style['backgroundColor']).toBe(hex(row.background));
      expect(fragment.dataset['layers']).toBe(row.layers.join(' '));
    }
    for (const { role, ratio } of placementRatios(lightPalette, on)) expect(Number(variants['light']!.children.get(`[data-state-meter="${role}"]`)!.children.get('[data-state-value]')!.dataset['value'])).toBe(ratio);
    for (const [line, tokens] of STATE_SAMPLE.entries()) expect(variants['light']!.fragments.filter(fragment => fragment.dataset['line'] === String(line)).map(fragment => fragment.textContent).join('')).toBe(tokens.map(([, text]) => text).join(''));
  }
  word.dispatchEvent(new Event('click'));
  const pressed = word.attrs.get('aria-pressed');
  dispose(); word.dispatchEvent(new Event('click')); expect(word.attrs.get('aria-pressed')).toBe(pressed);
});

test('every states toolbar swatch differs from the editor in both schemes', () => {
  for (const [scheme, source] of [['dark', buildPalette()], ['light', lightPalette]] as const) for (const layer of TOOLBAR) {
    const word = layer === 'addedWord' ? 'addedLine' : layer === 'removedWord' ? 'removedLine' : null;
    const against = word ? stackBackground(source, source.neutral.editor, [word]) : source.neutral.editor;
    const swatch = stackBackground(source, source.neutral.editor, toolbarStack(layer));
    expect(distanceEmitted(swatch, against), `${scheme} ${layer}`).toBeGreaterThanOrEqual(0.03);
  }
});

test('bracket match draws the border VS Code draws', () => {
  const css = readFileSync(new URL('../src/styles/states.css', import.meta.url), 'utf8');
  const rule = /\[data-layers~="bracketMatch"\]\{([^}]*)\}/.exec(css);
  expect(rule, 'a rule keyed on the bracketMatch layer').not.toBeNull();
  expect(rule![1]).toContain('var(--a-gold-border)');
  expect(PLACEMENT.bracketMatch).toHaveLength(2);
  for (const [scheme, source] of [['dark', buildPalette()], ['light', lightPalette]] as const) {
    const values = variables(source);
    expect(values['--a-gold-border']).toBe(hex(source.scales.gold.border));
    expect(contrastEmitted(hexToOklch(values['--a-gold-border']!), source.neutral.editor), `${scheme} border on editor`).toBeGreaterThanOrEqual(3);
  }
});
