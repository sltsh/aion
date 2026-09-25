import { test, expect } from 'vitest';
import {
  CONTRAST_FLOOR, LIGHT_SHIPPED, compositeEmitted, contrastEmitted, distanceEmitted, lightDiffWash,
  readingForegrounds, readingStates, solveOverlay,
} from '../src/index.js';
import type { Oklch, Overlay, OverlayName } from '../src/index.js';

// A Light overlay is a search, not a taste. These re-run it against the shipped palette,
// so a change to the syntax floor, the comment or a wash reports the new optimum.
const editor = LIGHT_SHIPPED.neutral.editor;
const foregrounds = Object.values(readingForegrounds(LIGHT_SHIPPED));

const passesGate = (name: OverlayName, candidate: Overlay): boolean => {
  const source = { ...LIGHT_SHIPPED, overlay: { ...LIGHT_SHIPPED.overlay, [name]: candidate } };
  return readingStates(source).every((state) =>
    foregrounds.every((colour) => contrastEmitted(colour, state.background) >= CONTRAST_FLOOR));
};

// The selection has to survive what is painted over it: half its shift, through a word
// highlight and through each diff wash, as `invariants.test.ts` asserts of the shipped one.
const selectionCue = (candidate: Overlay): boolean => {
  const selected = compositeEmitted(candidate.color, candidate.alpha, editor);
  const shift = distanceEmitted(selected, editor);
  const over = (layers: readonly Overlay[]) => (base: Oklch): Oklch =>
    layers.reduce((under, layer) => compositeEmitted(layer.color, layer.alpha, under), base);
  const covers = [
    over([LIGHT_SHIPPED.overlay.wordHighlight]),
    over([lightDiffWash.addedLine, lightDiffWash.addedWord]),
    over([lightDiffWash.removedLine, lightDiffWash.removedWord]),
  ];
  return covers.every((cover) => distanceEmitted(cover(selected), cover(editor)) > shift * 0.5);
};

const shift = (value: Overlay): number =>
  distanceEmitted(compositeEmitted(value.color, value.alpha, editor), editor);

test('the light selection is within 5% of the most visible blue the gate allows', () => {
  const shipped = LIGHT_SHIPPED.overlay.selection;
  const best = solveOverlay({
    hues: [shipped.color[2]],
    against: editor,
    accept: (candidate) => passesGate('selection', candidate) && selectionCue(candidate),
  });
  expect(best, 'no selection passes the gate').not.toBeNull();
  expect(shift(shipped) / best!.distance, `the search reaches ${best!.distance.toFixed(4)}`)
    .toBeGreaterThanOrEqual(0.95);
});
