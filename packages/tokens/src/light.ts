import type { Oklch } from './oklch.js';
import { solveLightness, inGamut, contrastEmitted } from './oklch.js';
import type { AccentName, AccentScale } from './palette.js';
import { ACCENTS, BASE_CHROMA, BASE_HUE, CONTRAST_FLOOR, NON_TEXT_FLOOR } from './palette.js';
import { mapValues } from './util.js';

// `border` is solved against `input`, the darkest surface a control edge encloses, not
// against `page`. A light border is darker than every surface it touches, so the darkest
// surface is the one that binds: at 0.650 it read 3.15:1 on the page and 2.56:1 on the
// field it was supposed to delimit.
export const LIGHT_LIGHTNESS = {
  page: 0.990, surface: 0.970, raised: 0.945, input: 0.920, hover: 0.890,
  hairline: 0.860, divider: 0.810, border: 0.605, muted: 0.560,
  textSecondary: 0.450, textPrimary: 0.220,
} as const;

export type LightNeutralName = keyof typeof LIGHT_LIGHTNESS;

// sRGB cannot hold chroma next to white, so the tint tapers as lightness approaches 1.
const tint = (L: number): number => Math.min(BASE_CHROMA * 0.5, (1 - L) * 0.35);

export const lightNeutral: Record<LightNeutralName, Oklch> = mapValues(
  LIGHT_LIGHTNESS,
  (L): Oklch => [L, tint(L), BASE_HUE],
);

const CHROMA_BOOST = 1.35;
const CHROMA_STEP = 0.98;
const LIGHTNESS_STEP = 0.001;
const floorTo = (value: number, places: number): number =>
  Math.floor(value * 10 ** places) / 10 ** places;

// Dark accents lose contrast on a light page, so lightness drops and chroma rises.
// The two constraints fight: more chroma leaves the sRGB gamut at the lightness the
// floor demands. Walk chroma down until a colour satisfies both, then verify against
// the emitted hex, because rounding to 8 bits can cost up to 0.06 of the ratio.
//
// The reference surface is `raised`, not `page`: an accent that only clears the floor on
// the lightest surface fails the moment it lands on a card or a subtle fill. Accent text
// on the `hover` surface is outside this guarantee; hover rows use neutral text.
const solveOnLightSurface = (name: AccentName, hue: number, startChroma: number, floor: number): Oklch => {
  let chroma = startChroma;
  for (let i = 0; i < 60; i += 1) {
    const rounded = Math.round(chroma * 10000) / 10000;
    // Lower lightness means more contrast here, so rounding down never breaks the floor.
    let L = floorTo(solveLightness(rounded, hue, lightNeutral.raised, floor, 'down'), 3);
    for (let step = 0; step < 10; step += 1) {
      const colour: Oklch = [L, rounded, hue];
      if (!inGamut(colour)) break;
      if (contrastEmitted(colour, lightNeutral.raised) >= floor) return colour;
      L -= LIGHTNESS_STEP;
    }
    chroma *= CHROMA_STEP;
  }
  throw new Error(`no in-gamut light colour for ${name} at ${floor}:1`);
};

export const lightAccent = (name: AccentName): Oklch => {
  const [, chroma, hue] = ACCENTS[name];
  return solveOnLightSurface(name, hue, Math.min(chroma * CHROMA_BOOST, 0.19), CONTRAST_FLOOR);
};

export const lightAccents: Record<AccentName, Oklch> = mapValues(ACCENTS, (_value, name) =>
  lightAccent(name),
);

const LIGHT_SUBTLE_LIGHTNESS = 0.955;

// A subtle fill carries no text of its own, so only the gamut constrains it.
const lightSubtle = (name: AccentName): Oklch => {
  const [, chroma, hue] = ACCENTS[name];
  let candidate = Math.min(chroma * 0.35, (1 - LIGHT_SUBTLE_LIGHTNESS) * 0.6);
  for (let i = 0; i < 60; i += 1) {
    const colour: Oklch = [LIGHT_SUBTLE_LIGHTNESS, Math.round(candidate * 10000) / 10000, hue];
    if (inGamut(colour)) return colour;
    candidate *= CHROMA_STEP;
  }
  throw new Error(`no in-gamut light subtle fill for ${name}`);
};

export const lightAccentScale = (name: AccentName): AccentScale => {
  const [, chroma, hue] = ACCENTS[name];
  return {
    subtle: lightSubtle(name),
    border: solveOnLightSurface(name, hue, Math.min(chroma * 0.5, 0.09), NON_TEXT_FLOOR),
    solid: lightAccent(name),
  };
};
