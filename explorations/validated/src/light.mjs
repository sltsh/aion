import { solveLightness, inGamut } from './oklch.mjs';
import { ACCENTS, BASE_CHROMA, BASE_HUE, CONTRAST_FLOOR } from './palette.mjs';

export const LIGHT_LIGHTNESS = {
  page: 0.990, surface: 0.970, raised: 0.945, input: 0.920, hover: 0.890,
  hairline: 0.860, divider: 0.810, border: 0.700, muted: 0.600,
  textSecondary: 0.450, textPrimary: 0.220,
};

// sRGB cannot hold chroma next to white, so the tint tapers as lightness approaches 1.
const tint = (L) => Math.min(BASE_CHROMA * 0.5, (1 - L) * 0.35);

export const lightNeutral = Object.fromEntries(
  Object.entries(LIGHT_LIGHTNESS).map(([k, L]) => [k, [L, tint(L), BASE_HUE]]),
);

const CHROMA_BOOST = 1.35;
const CHROMA_STEP = 0.98;
const floorTo = (value, places) => Math.floor(value * 10 ** places) / 10 ** places;

// Dark accents lose contrast on a light page, so lightness drops and chroma rises.
// The two constraints fight: more chroma leaves the sRGB gamut at the lightness the
// floor demands. Walk chroma down until a colour satisfies both.
export const lightAccent = (name) => {
  const [, chroma, hue] = ACCENTS[name];
  let candidate = Math.min(chroma * CHROMA_BOOST, 0.19);
  for (let i = 0; i < 60; i += 1) {
    // Lower lightness means more contrast here, so rounding down never breaks the floor.
    const L = floorTo(solveLightness(candidate, hue, lightNeutral.page, CONTRAST_FLOOR, 'down'), 3);
    const colour = [L, Math.round(candidate * 10000) / 10000, hue];
    if (inGamut(colour)) return colour;
    candidate *= CHROMA_STEP;
  }
  throw new Error(`no in-gamut light accent for ${name}`);
};
