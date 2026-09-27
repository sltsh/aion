import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import {
  LIGHT_SHIPPED, SHIPPED, RENDER_ORDER, compositeCssAlpha, compositeEmitted,
  covered, orderStack, paintedAlpha, producible, readingStates, stackBackground, stackName,
} from '../src/index.js';
import type { StackLayer, StateSource } from '../src/index.js';

interface LayerFact {
  name: StackLayer;
  viewPart: number;
  isWholeLine: boolean;
  zIndex: number;
  className: string;
  sourcePath: string;
  sourceUrl: string;
}
const fixture = JSON.parse(readFileSync(new URL('./render-order.json', import.meta.url), 'utf8')) as {
  revision: string;
  layers: LayerFact[];
};

test('render order follows the pinned renderer fixture', () => {
  expect(fixture.revision).toBe('4336606aa949efdcddb89b3db3e216562730b2bf');
  expect(fixture.layers.every((entry) => entry.sourceUrl.includes(fixture.revision))).toBe(true);
  const sorted = [...fixture.layers].sort((a, b) =>
    a.viewPart - b.viewPart || Number(b.isWholeLine) - Number(a.isWholeLine) ||
    a.zIndex - b.zIndex || (a.className < b.className ? -1 : a.className > b.className ? 1 : 0));
  expect(RENDER_ORDER).toEqual(sorted.map((entry) => entry.name));
});

test('a word highlight and another find match land above every diff layer', () => {
  for (const name of ['wordHighlight', 'findMatchOther'] as const) {
    for (const diff of ['addedLine', 'addedWord', 'removedLine', 'removedWord'] as const) {
      expect(RENDER_ORDER.indexOf(name)).toBeGreaterThan(RENDER_ORDER.indexOf(diff));
    }
  }
});

const bases: readonly (readonly StackLayer[])[] = [[], ['lineHighlight'], ['selection'], ['inactiveSelection']];
const diffs: readonly (readonly StackLayer[])[] = [[], ['addedLine'], ['addedLine', 'addedWord'],
  ['removedLine'], ['removedLine', 'removedWord']];
const readingTops = ['wordHighlight', 'findMatchOther', 'selectionHighlight'] as const;
const otherTops = [
  'findRange', 'rangeHighlight', 'fold', 'hover', 'symbol', 'strongWord', 'stackFrame',
  'focusedStackFrame', 'bracketMatch', 'commentRange', 'activeCommentRange', 'unchangedCode',
  'mergeCurrentHeader', 'mergeIncomingHeader', 'mergeCommonHeader', 'mergeChange',
  'mergeChangeWord', 'searchMatch', 'covered', 'uncovered',
] as const;

const coverage = (): Set<StackLayer>[] => {
  const sets: Set<StackLayer>[] = [];
  for (const base of bases) for (const diff of diffs) {
    for (let mask = 0; mask < 8; mask += 1) {
      const layers = new Set<StackLayer>([...base, ...diff]);
      readingTops.forEach((name, bit) => { if (mask & (1 << bit)) layers.add(name); });
      sets.push(layers);
    }
    for (const name of otherTops) {
      if (diff.length === 0 || !['unchangedCode', 'mergeChange', 'mergeChangeWord'].includes(name)) {
        sets.push(new Set<StackLayer>([...base, ...diff, name]));
      }
    }
  }
  return sets;
};

const directBackground = (source: StateSource, layers: readonly StackLayer[]) =>
  layers.reduce((under, name) => {
    const value = name in source.overlay ? source.overlay[name as keyof typeof source.overlay]
      : name in source.diffWash ? source.diffWash[name as keyof typeof source.diffWash]
        : name in source.decoration ? source.decoration[name as keyof typeof source.decoration]
          : source.secondaryDecoration[name as keyof typeof source.secondaryDecoration];
    const parsed = Math.round(Math.round(value.alpha * 255) / 255 * 1000) / 1000;
    const final = name === 'selectionHighlight' ? Math.round(parsed * 0.5 * 1000) / 1000 : parsed;
    return compositeCssAlpha(value.color, Number(final.toFixed(2)), under);
  }, source.neutral.editor);

test.each([['dark', SHIPPED], ['light', LIGHT_SHIPPED]] as const)(
  'gates every covered stack on the editor in %s', (_scheme, source) => {
    const expected = coverage().map((set) => stackName('editor', orderStack(set)));
    const rows = readingStates(source).filter((row) => row.name.startsWith('editor'));
    expect(new Set(rows.map((row) => row.name))).toEqual(new Set(expected));
    expect(rows).toHaveLength(expected.length);
    for (const set of coverage()) {
      const layers = orderStack(set);
      const row = rows.find((entry) => entry.name === stackName('editor', layers));
      expect(row?.background).toEqual(directBackground(source, layers));
      expect(row?.background).toEqual(stackBackground(source, source.neutral.editor, layers));
    }
  },
);

test('peek retains the bounded legacy layer domain without new secondary contexts', () => {
  const permitted = new Set<StackLayer>([...bases.flat(), ...readingTops, 'findRange', 'rangeHighlight', 'fold']);
  for (const row of readingStates().filter((state) => state.name.startsWith('peekEditor'))) {
    for (const name of row.name.split(' + ').slice(1)) expect(permitted.has(name as StackLayer)).toBe(true);
  }
});

test('every covered stack is producible and names omitted combinations', () => {
  for (const set of coverage()) {
    expect(covered(set)).toBe(true);
    expect(producible(set)).toBe(true);
  }
  for (const names of [
    ['wordHighlight', 'hover'],
    ['selection', 'removedLine', 'removedWord', 'findMatchOther', 'findRange'],
  ] as StackLayer[][]) {
    const set = new Set(names);
    expect(producible(set)).toBe(true);
    expect(covered(set)).toBe(false);
  }
});

test('never gates a stack the renderer cannot draw', () => {
  const names = readingStates().map((row) => row.name);
  for (const name of names) {
    const layers = new Set(name.split(' + '));
    expect(layers.has('lineHighlight') && layers.has('selection')).toBe(false);
    expect(layers.has('addedLine') && layers.has('removedLine')).toBe(false);
    expect(layers.has('addedWord') && !layers.has('addedLine')).toBe(false);
    expect(layers.has('removedWord') && !layers.has('removedLine')).toBe(false);
    expect(layers.has('unchangedCode') && (layers.has('addedLine') || layers.has('removedLine'))).toBe(false);
    expect((layers.has('mergeChange') || layers.has('mergeChangeWord')) &&
      (layers.has('addedLine') || layers.has('removedLine'))).toBe(false);
  }
});

test('excludes editor-owned merge fills from diff widgets but retains model-owned search matches', () => {
  for (const merge of ['mergeChange', 'mergeChangeWord'] as const) {
    for (const diff of ['addedLine', 'removedLine', 'unchangedCode', 'fold'] as const) {
      expect(producible(new Set<StackLayer>([merge, diff]))).toBe(false);
    }
  }
  expect(producible(new Set<StackLayer>(['addedLine', 'searchMatch']))).toBe(true);
  // MergeDiffComputer's containment assertion is disabled at the pinned revision.
  expect(producible(new Set<StackLayer>(['mergeChangeWord']))).toBe(true);
});

test('keeps every existing row name', () => {
  const prior = new Set<string>();
  const oldBases = [[], ['lineHighlight'], ['selection'], ['wordHighlight'],
    ['lineHighlight', 'wordHighlight'], ['selection', 'wordHighlight']] as StackLayer[][];
  for (const surface of ['editor', 'peekEditor'] as const) {
    for (const stack of oldBases) prior.add(stackName(surface, stack));
  }
  for (const diff of diffs.slice(1)) for (const base of [[], ['lineHighlight'], ['selection']] as StackLayer[][]) {
    prior.add(stackName('editor', [...base, ...diff]));
  }
  for (const base of [[], ['lineHighlight'], ['selection'], ['selection', 'wordHighlight']] as StackLayer[][]) {
    for (const surface of ['editor', 'peekEditor'] as const) {
      prior.add(stackName(surface, [...base, 'findMatchOther']));
    }
  }
  for (const surface of ['editor', 'peekEditor'] as const) {
    for (const top of ['selectionHighlight', 'findRange', 'rangeHighlight', 'fold'] as const) {
      for (const base of [[], ['lineHighlight'], ['selection']] as StackLayer[][]) {
        prior.add(stackName(surface, [...base, top]));
      }
    }
  }
  prior.add('editor + inactiveSelection');
  prior.add('peekEditor + inactiveSelection');
  prior.add('hoverWidget');
  prior.add('findMatch');
  prior.add('findMatch + wordHighlight');
  const actual = new Set(readingStates(LIGHT_SHIPPED).map((row) => row.name));
  for (const name of prior) expect(actual.has(name), name).toBe(true);
});

test('selection highlight uses the painted CSS alpha after byte parsing', () => {
  expect(paintedAlpha('selectionHighlight', 0.25)).toBe(0.13);
  expect(paintedAlpha('wordHighlight', 0.45)).toBe(0.45);
  expect(paintedAlpha('selectionHighlight', 176 / 255)).toBe(Number((0.345).toFixed(2)));
  const source: StateSource = {
    ...LIGHT_SHIPPED,
    decoration: {
      ...LIGHT_SHIPPED.decoration,
      selectionHighlight: { color: LIGHT_SHIPPED.overlay.selection.color, alpha: 0.25 },
    },
  };
  const layers = orderStack(new Set<StackLayer>(['selection', 'selectionHighlight']));
  const painted = stackBackground(source, source.neutral.editor, layers);
  const rawHalf = layers.reduce((under, name) => {
    const value = name === 'selectionHighlight' ? source.decoration.selectionHighlight
      : source.overlay[name as 'selection' | 'wordHighlight'];
    return compositeEmitted(value.color, name === 'selectionHighlight' ? value.alpha * 0.5 : value.alpha, under);
  }, source.neutral.editor);
  expect(painted).not.toEqual(rawHalf);
});
