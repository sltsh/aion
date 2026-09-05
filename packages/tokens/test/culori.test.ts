import { test, expect } from 'vitest';
import { formatHex, oklch as culoriOklch, wcagContrast } from 'culori';
import type { Oklch } from '../src/index.js';
import {
  hex, contrast, contrastEmitted, compositeEmitted, hexToOklch, ACCENTS, neutral, ansi, comment,
} from '../src/index.js';
import { lightNeutral, lightAccents } from '../src/light.js';

const sample = (): [string, Oklch][] => [
  ...Object.entries(neutral), ...Object.entries(ACCENTS), ...Object.entries(ansi),
  ...Object.entries(lightNeutral), ...Object.entries(lightAccents), ['comment', comment],
];

test('the ported emitter agrees with culori on every shipped colour', () => {
  for (const [name, [l, c, h]] of sample()) {
    const reference = formatHex({ mode: 'oklch', l, c, h });
    expect(hex([l, c, h]), `${name}`).toBe(reference);
  }
});

test('the emitted contrast function agrees with culori on every shipped colour', () => {
  for (const [name, colour] of sample()) {
    const reference = wcagContrast(hex(colour), hex(neutral.editor));
    expect(contrastEmitted(colour, neutral.editor), `${name}`).toBeCloseTo(reference, 9);
  }
});

// The continuous form reads the ideal OKLCH, so it drifts from the shipped hex. That
// drift is why the build gate uses the emitted form; this bounds it.
test('the continuous contrast function stays within 0.1 of the emitted one', () => {
  for (const [name, colour] of sample()) {
    const drift = contrast(colour, neutral.editor) - contrastEmitted(colour, neutral.editor);
    expect(Math.abs(drift), `${name} drifts ${drift.toFixed(4)}`).toBeLessThan(0.1);
  }
});

test('hexToOklch inverts hex', () => {
  for (const [name, colour] of sample()) {
    const value = hex(colour);
    const round = culoriOklch(value);
    const ours = hexToOklch(value);
    expect(ours[0], `${name} lightness`).toBeCloseTo(round!.l, 6);
    expect(ours[1], `${name} chroma`).toBeCloseTo(round!.c, 6);
  }
});

// culori has no alpha compositing, so the reference is the blend rule itself, read off the
// parsed bytes. What this pins is that the helper blends the emitted bytes, not the OKLCH.
test('compositeEmitted blends the emitted bytes the way a renderer does', () => {
  const bytes = (value: string): number[] =>
    [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  for (const alpha of [0, 0.12, 0.28, 0.6, 1]) {
    for (const [over, under] of [[ACCENTS.gold, neutral.editor], [neutral.border, neutral.widget]] as const) {
      const a = Math.round(alpha * 255) / 255;
      const expected = bytes(hex(over))
        .map((v, i) => Math.round(v * a + bytes(hex(under))[i]! * (1 - a)));
      const actual = bytes(hex(compositeEmitted(over, alpha, under)));
      expect(actual, `alpha ${alpha}`).toEqual(expected);
    }
  }
});
