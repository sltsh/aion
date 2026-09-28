import { describe, expect, it } from 'vitest';
import {
  ACCENT_NAMES, accentScale, comment, contrast, contrastEmitted, hex, lightAccents,
  lightAccentScale, lightComment, lightEditorNeutral, lightNeutral, neutral, oklchToLinearSrgb,
  roundingFlip, roundingShift, solveLightness, srgbChannels, type Oklch,
} from '../src/index.js';
import { roundingShiftOnGrid } from '../src/rounding.js';

const backgrounds = [neutral.editor, lightEditorNeutral.editor];

function fullScan(background: Oklch, floor: number) {
  let shift = -1;
  let colour: Oklch = [0, 0, 0];
  for (let i = 0; i < 120; i += 10) {
    for (let j = 0; j <= 20; j += 1) {
      for (let k = 0; k <= 20000; k += 1) {
        const candidate: Oklch = [0.00005 * k, 0.01 * j, 3 * i];
        if (!oklchToLinearSrgb(...candidate).every((v) => v >= 0 && v <= 1)) continue;
        const exact = contrast(candidate, background);
        if (Math.abs(exact - floor) > 0.1) continue;
        const gap = Math.abs(contrastEmitted(candidate, background) - exact);
        if (gap > shift) { shift = gap; colour = candidate; }
      }
    }
  }
  return { shift, colour };
}

describe('rounding measurements', () => {
  it('srgbChannels agrees with hex', () => {
    const colours = [
      ...Object.values(neutral), ...Object.values(lightNeutral),
      ...Object.values(lightEditorNeutral), comment, lightComment,
      ...ACCENT_NAMES.flatMap((name) => Object.values(accentScale(name))),
      ...Object.values(lightAccents),
      ...ACCENT_NAMES.flatMap((name) => Object.values(lightAccentScale(name))),
    ];
    for (const colour of colours) {
      const { exact, bytes } = srgbChannels(colour);
      expect('#' + bytes.map((v) => v.toString(16).padStart(2, '0')).join('')).toBe(hex(colour));
      exact.forEach((v, i) => expect(Math.abs(v - bytes[i]!)).toBeLessThanOrEqual(0.5));
    }
  });

  it('roundingShift equals a full scan of its grid in both schemes', () => {
    for (const background of backgrounds) {
      expect(roundingShiftOnGrid(background, 4.5, 10)).toEqual(fullScan(background, 4.5));
    }
  }, 30000);

  it('retains both contrast branches and overlapping bands near unity', () => {
    const background: Oklch = [0.55, 0.02, 264];
    for (const floor of [1, 2]) {
      expect(roundingShiftOnGrid(background, floor, 10)).toEqual(fullScan(background, floor));
    }
  }, 30000);

  it('the reported colour satisfies the grid predicates and is deterministic', () => {
    for (const background of backgrounds) {
      const result = roundingShift(background);
      expect(roundingShift(background)).toEqual(result);
      expect(oklchToLinearSrgb(...result.colour).every((v) => v >= 0 && v <= 1)).toBe(true);
      expect(Math.abs(contrast(result.colour, background) - 4.5)).toBeLessThanOrEqual(0.1);
      expect(result.shift).toBe(Math.abs(contrastEmitted(result.colour, background) - contrast(result.colour, background)));
    }
  }, 10000);

  it('returns the first flip with custom samples, or null when no sample flips', () => {
    const options = { window: 0.01, step: 0.0001, floor: 3 };
    for (const [base, background, direction] of [
      [comment, neutral.editor, 'up'], [lightComment, lightEditorNeutral.editor, 'down'],
    ] as const) {
      const centre = solveLightness(base[1], base[2], background, options.floor, direction);
      const samples = Array.from({ length: 202 }, (_, i) => centre - options.window + i * options.step)
        .filter((L) => L >= 0 && L <= 1 && L <= centre + options.window);
      const first = samples.find((L) => {
        const candidate: Oklch = [L, base[1], base[2]];
        return contrast(candidate, background) >= options.floor
          && contrastEmitted(candidate, background) < options.floor;
      });
      expect(roundingFlip(base, background, options)).toBe(first ?? null);
      expect(roundingFlip(base, background, { floor: 21 })).toBeNull();
    }
  });

  it('a colour at the comment hue passes before rounding and fails after in both schemes', () => {
    for (const [base, background] of [[comment, neutral.editor], [lightComment, lightEditorNeutral.editor]] as const) {
      const lightness = roundingFlip(base, background);
      expect(lightness).not.toBeNull();
      const colour: Oklch = [lightness!, base[1], base[2]];
      expect(contrast(colour, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastEmitted(colour, background)).toBeLessThan(4.5);
    }
  });
});
