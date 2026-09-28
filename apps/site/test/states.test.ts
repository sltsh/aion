import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildPalette, lightPalette, orderStack, readingStates, stackName } from '@sltsh/aion-tokens';
import type { StackLayer } from '@sltsh/aion-tokens';
import { TOOLBAR, disabledReason, enabled, stackBackground, toggle } from '../src/chapters/stack.js';
import { cancelCount, countTo } from '../src/chapters/states.js';
import type { CountEnvironment } from '../src/chapters/states.js';
import { renderStates } from '../src/render/states.js';
import { CONTENT } from '../src/content.js';
for (const source of [buildPalette(), lightPalette]) test(`every reachable toolbar stack is gated, editor L=${source.neutral.editor[0]}`, () => {
  const rows = new Map(readingStates(source).map(row => [row.name, row.background]));
  const queue: Set<StackLayer>[] = [new Set()], seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const on = queue[i]!, name = stackName('editor', orderStack(on));
    if (seen.has(name)) continue;
    seen.add(name); expect(stackBackground(source, on)).toEqual(rows.get(name));
    for (const layer of TOOLBAR) if (enabled(on, layer)) queue.push(toggle(on, layer));
  }
  expect(seen.size).toBe(60);
});
test('words bring lines, and removing lines removes words without mutating input', () => {
  const on = new Set<StackLayer>(); const word = toggle(on, 'addedWord');
  expect(word).toEqual(new Set(['addedLine', 'addedWord'])); expect(on.size).toBe(0);
  expect(toggle(word, 'addedLine').size).toBe(0);
});
test('disabled toggles explain current-line/selection and added/removed exclusions from content', () => {
  expect(disabledReason(new Set(['selection']), 'lineHighlight')).toBe('currentSelection');
  expect(disabledReason(new Set(['addedLine']), 'removedWord')).toBe('diffSides');
  expect(CONTENT.states.reasons.currentSelection).toContain('never stack');
  expect(disabledReason(new Set(), 'selection')).toBeNull();
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
for (const released of [true, false]) test(`three code lines, scroll access and no obsolete action, released=${released}`, () => {
  const html = renderStates({ released });
  expect(html.match(/data-state-line=/g)).toHaveLength(6);
  expect(html).toContain('tabindex="0"'); expect(html).toContain(CONTENT.states.codeLabel);
  expect(html).not.toContain('Show it'); expect(html).not.toContain('open question');
  expect(html).not.toContain('data-delta-visible');
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
    querySelectorAll() { return [new Node(), new Node()]; }
  }
  const buttons = TOOLBAR.map(layer => { const node = new Node(); node.dataset['stateToggle'] = layer; return node; });
  const variants = Object.fromEntries((['dark', 'light'] as const).map(scheme => {
    const variant = new Node();
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
  expect(buttons.find(button => button.dataset['stateToggle'] === 'removedLine')!.disabled).toBe(true);
  scheme = 'light'; notify(); expect(word.attrs.get('aria-pressed')).toBe('true');
  const selected = new Set<StackLayer>(['addedLine', 'addedWord']);
  expect(variants['light']!.children.get('[data-state-bghex]')!.textContent).toBe((await import('@sltsh/aion-tokens')).hex(stackBackground(lightPalette, selected)));
  expect(variants['light']!.children.get('[data-state-meter="comment"]')!.children.get('[data-state-delta]')!.textContent).toBe('');
  dispose(); word.dispatchEvent(new Event('click')); expect(word.attrs.get('aria-pressed')).toBe('true');
});
