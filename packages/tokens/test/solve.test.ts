import { test, expect } from 'vitest';
import {
  MEANING_PAIR_GAP, NON_TEXT_FLOOR, diff, distanceEmitted, neutral, solveMarker,
} from '../src/index.js';
import type { Marker, Oklch } from '../src/index.js';

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
