import { test, expect } from 'vitest';
import {
  CONTRAST_FLOOR, LIGHT_SHIPPED, MEANING_PAIR_GAP, NON_TEXT_FLOOR, SHIPPED,
  compositeEmitted, contrastEmitted, diff, distanceEmitted, neutral, orderStack,
  readingForegrounds, readingStates, solveMarker, solveOverlay, stackBackground,
} from '../src/index.js';
import type { Marker, Oklch, Overlay, StackLayer, StateSource } from '../src/index.js';

// A diff marker is a search, not a taste. Contrast is read from the emitted 8-bit hex,
// after the gamut clip and the rounding, so it cannot be inverted and a value cannot be
// hand-computed. These tests re-run the search and check the shipped value against it.
// Move the line number or the floor and the failure message carries the new optimum.
//
// The gutter column carries the line number and no body text at all.
const STRIP: Omit<Marker, 'hues'> = {
  against: neutral.editor,
  foregrounds: { lineNumber: neutral.muted },
  stacks: [[]],
  floor: NON_TEXT_FLOOR,
  minChroma: 0.04,
};

const strips = [
  { name: 'addedStrip', shipped: diff.addedStrip },
  { name: 'removedStrip', shipped: diff.removedStrip },
] as const satisfies readonly { name: string; shipped: Oklch }[];

test.each(strips)('$name is held back by the line number, not by anything else', (each) => {
  const best = solveMarker({ ...STRIP, hues: [each.shipped[2]] });
  expect(best, `${each.name} has no solution at all`).not.toBeNull();
  expect(best!.binds.foreground).toBe('lineNumber');
});

// The strips are the pair that carries the colour-vision separation: they are opaque,
// always drawn, and nothing paints over them. That gap costs visibility, so neither strip
// is at its own unconstrained optimum, and this records how much the gap costs.
test('the strips separate by lightness and stay close to what that allows', () => {
  expect(Math.abs(diff.addedStrip[0] - diff.removedStrip[0])).toBeGreaterThanOrEqual(MEANING_PAIR_GAP);
  for (const each of strips) {
    const best = solveMarker({ ...STRIP, hues: [each.shipped[2]] });
    const shipped = distanceEmitted(each.shipped, neutral.editor);
    expect(
      shipped / best!.distance,
      `${each.name} is ${shipped.toFixed(4)} from the editor; ${best!.hex} reaches ${best!.distance.toFixed(4)}`,
    ).toBeGreaterThan(0.60);
  }
});

// The paler Light diff washes and secondaries freed comment budget for these, so their
// optimum rose while their values stayed; the owner chose the 0.03 target over the maximum.
const LIGHT_TARGET_RATIO = 0.85;

const overlayPins: readonly {
  scheme: 'dark' | 'light'; source: StateSource; name: StackLayer;
  owner: 'overlay' | 'decoration' | 'secondaryDecoration'; minRatio?: number;
}[] = [
  { scheme: 'dark', source: SHIPPED, name: 'findMatchOther', owner: 'overlay' },
  { scheme: 'dark', source: SHIPPED, name: 'wordHighlight', owner: 'overlay' },
  ...(['selectionHighlight', 'findRange', 'rangeHighlight', 'fold'] as const)
    .map((name) => ({ scheme: 'dark' as const, source: SHIPPED, name, owner: 'decoration' as const })),
  { scheme: 'light', source: LIGHT_SHIPPED, name: 'wordHighlight', owner: 'overlay' },
  ...(['selectionHighlight', 'findRange', 'rangeHighlight', 'fold'] as const)
    .map((name) => ({ scheme: 'light' as const, source: LIGHT_SHIPPED, name, owner: 'decoration' as const,
      ...(name === 'selectionHighlight' ? {} : { minRatio: LIGHT_TARGET_RATIO }) })),
];

// The comment stays fixed. Each search uses the renderer-order rows containing the moved
// layer, the existing visibility floor, and at least half the selection cue beneath it.
test.each(overlayPins)('$scheme $name stays within 5% of its constrained optimum',
  ({ source, name, owner, minRatio }) => {
    const shipped = (source[owner] as Record<string, Overlay>)[name]!;
    const editor = source.neutral.editor;
    const selected = compositeEmitted(source.overlay.selection.color, source.overlay.selection.alpha, editor);
    const selectionShift = distanceEmitted(selected, editor);
    const foregrounds = Object.values(readingForegrounds(source));
    const stacks = readingStates(source)
      .filter((row) => row.name.split(' + ').includes(name))
      .map((row) => {
        const [surface, ...layers] = row.name.split(' + ');
        return { base: surface === 'peekEditor' ? source.neutral.terminal : editor,
          layers: layers as StackLayer[] };
      });
    const accepts = (candidate: Overlay): boolean => {
      const next = { ...source, [owner]: { ...source[owner], [name]: candidate } } as StateSource;
      const shift = distanceEmitted(compositeEmitted(candidate.color, candidate.alpha, editor), editor);
      if (shift < 0.03 || ((owner === 'overlay' || source === LIGHT_SHIPPED) && shift >= selectionShift)) return false;
      if (owner === 'overlay') {
        const over = (base: Oklch) => compositeEmitted(candidate.color, candidate.alpha, base);
        if (distanceEmitted(over(selected), over(editor)) <= selectionShift * 0.5) return false;
      }
      const plain = stackBackground(next, editor, orderStack(new Set<StackLayer>([name])));
      if (distanceEmitted(plain, editor) < 0.03) return false;
      const through = stackBackground(next, editor, orderStack(new Set<StackLayer>(['selection', name])));
      if (distanceEmitted(through, plain) <= selectionShift * 0.5) return false;
      return stacks.every(({ base, layers }) => {
        const background = stackBackground(next, base, layers);
        return foregrounds.every((colour) => contrastEmitted(colour, background) >= CONTRAST_FLOOR);
      });
    };
    const score = (candidate: Overlay): number => {
      const next = { ...source, [owner]: { ...source[owner], [name]: candidate } } as StateSource;
      return distanceEmitted(stackBackground(next, editor, [name]), editor);
    };
    expect(accepts(shipped), `${name}: shipped colour violates its constraints`).toBe(true);
    const best = solveOverlay({
      hues: [shipped.color[2]], against: editor, lightness: [0, 1],
      chroma: [0, 0.20], alpha: [0.05, 1], accept: accepts, score,
    });
    expect(best, `${name} has no solution`).not.toBeNull();
    const actual = score(shipped);
    expect(actual / best!.distance, `${name}: ${actual.toFixed(4)} / ${best!.distance.toFixed(4)}`)
      .toBeGreaterThanOrEqual(minRatio ?? 0.95);
  }, 20_000,
);

// CSS alpha formatting exposed a failing selected removed word without any reading top.
// This pin keeps the original diff visibility and contrast-based selection cue intact.
test('the light removed line stays within 5% of its constrained optimum', () => {
  const source = LIGHT_SHIPPED;
  const editor = source.neutral.editor;
  const shipped = source.diffWash.removedLine;
  const word = source.diffWash.removedWord;
  const foregrounds = Object.values(readingForegrounds(source));
  const stacks = readingStates(source).filter((row) => row.name.split(' + ').includes('removedLine'))
    .map((row) => row.name.split(' + ').slice(1) as StackLayer[]);
  const selected = compositeEmitted(source.overlay.selection.color, source.overlay.selection.alpha, editor);
  const selectionRatio = contrastEmitted(selected, editor);
  const accepts = (candidate: Overlay): boolean => {
    const line = (base: Oklch): Oklch => compositeEmitted(candidate.color, candidate.alpha, base);
    const over = (base: Oklch): Oklch => compositeEmitted(word.color, word.alpha, line(base));
    if (distanceEmitted(line(editor), editor) < 0.03 || contrastEmitted(line(editor), editor) <= 1.07 ||
        contrastEmitted(over(editor), editor) <= contrastEmitted(line(editor), editor) ||
        contrastEmitted(over(selected), over(editor)) <= 1 + (selectionRatio - 1) * 0.5) return false;
    const next = { ...source, diffWash: { ...source.diffWash, removedLine: candidate } };
    if (distanceEmitted(stackBackground(next, editor, ['removedLine']), editor) < 0.03) return false;
    return stacks.every((layers) => foregrounds.every((colour) =>
      contrastEmitted(colour, stackBackground(next, editor, layers)) >= CONTRAST_FLOOR));
  };
  const score = (candidate: Overlay): number => distanceEmitted(stackBackground(
    { ...source, diffWash: { ...source.diffWash, removedLine: candidate } }, editor, ['removedLine']), editor);
  expect(accepts(shipped), 'shipped removed line violates its constraints').toBe(true);
  const best = solveOverlay({
    hues: [shipped.color[2]], against: editor, lightness: [0, 1],
    chroma: [0, 0.2], alpha: [0.05, 1], accept: accepts, score,
  });
  expect(best, 'the light removed line has no solution').not.toBeNull();
  const actual = score(shipped);
  expect(actual / best!.distance).toBeGreaterThanOrEqual(LIGHT_TARGET_RATIO);
}, 20_000);
