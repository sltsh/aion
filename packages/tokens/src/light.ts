import type { Oklch } from './oklch.js';
import { solveLightness, inGamut, contrastEmitted } from './oklch.js';
import type {
  AccentName, AccentScale, AnsiChromaticSlot, AnsiSlot, NeutralName, Overlay, SyntaxRole,
} from './palette.js';
import {
  ACCENTS, ANSI_HUE, BASE_CHROMA, BASE_HUE, BRIGHT_TO_NORMAL, CHROMA_CEILING,
  CHROMA_DEFAULT, CONTRAST_FLOOR, NON_TEXT_FLOOR, SYNTAX, bracketPairs, capitalise,
} from './palette.js';
import { mapValues } from './util.js';

// `border` is solved against `input`, the darkest surface a control edge encloses, not
// against `page`. A light border is darker than every surface it touches, so the darkest
// surface is the one that binds; `LIGHT_LIGHTNESS.border` is authored at 0.595.
export const LIGHT_LIGHTNESS = {
  page: 0.980, surface: 0.960, raised: 0.935, input: 0.910, hover: 0.880,
  hairline: 0.850, divider: 0.800, border: 0.595, muted: 0.550,
  textSecondary: 0.440, textPrimary: 0.210,
} as const;

export type LightNeutralName = keyof typeof LIGHT_LIGHTNESS;

// sRGB cannot hold chroma next to white, so the tint tapers as lightness approaches 1.
const tint = (L: number): number => Math.min(BASE_CHROMA * 0.5, (1 - L) * 0.35);

export const lightNeutral: Record<LightNeutralName, Oklch> = mapValues(
  LIGHT_LIGHTNESS,
  (L): Oklch => [L, tint(L), BASE_HUE],
);

const lightNeutralRole = (L: number): Oklch => [L, tint(L), BASE_HUE];

// VS Code names the light editor surfaces differently from the web layer. Keep this
// adapter here so the native theme and the preview use the same authored ramp without
// making the editor generator know about web-specific names.
export const lightEditorNeutral: Record<NeutralName, Oklch> = {
  editor: lightNeutral.page,
  terminal: lightNeutral.surface,
  sidebar: lightNeutral.surface,
  widget: lightNeutral.raised,
  input: lightNeutral.input,
  hover: lightNeutral.hover,
  hairline: lightNeutral.hairline,
  divider: lightNeutral.divider,
  border: lightNeutral.border,
  muted: lightNeutral.muted,
  textSecondary: lightNeutral.textSecondary,
  textPrimary: lightNeutral.textPrimary,
};

// These are separate reading roles even though they share the same neutral hue. The
// light ramp's secondary text is the punctuation colour; comments sit one step quieter,
// dim chrome is a little quieter again, and ANSI white/bright-black retain their terminal
// roles instead of inheriting whichever neutral happened to be emitted first.
export const lightComment: Oklch = lightNeutralRole(0.516);
export const lightDimText: Oklch = lightNeutralRole(0.510);
export const lightAnsiWhite: Oklch = lightNeutralRole(0.340);
export const lightAnsiBrightBlack: Oklch = lightNeutralRole(0.505);

const CHROMA_BOOST = 1.35;
// The first lab pass asked for 1.10x accent chroma. Feed that preference into the
// solver rather than multiplying its result: several hues sit on the sRGB boundary,
// and the emitted colour must still clear the darker light-theme input surface.
const LIGHT_ACCENT_CHROMA_SCALE = 1.10;
const CHROMA_STEP = 0.98;
const LIGHTNESS_STEP = 0.001;
const LIGHTNESS_SEARCH_STEPS = 50;
const floorTo = (value: number, places: number): number =>
  Math.floor(value * 10 ** places) / 10 ** places;

const gamutSafe = (lightness: number, chroma: number, hue: number, label: string): Oklch => {
  let candidateChroma = chroma;
  for (let i = 0; i < 240; i += 1) {
    const candidate: Oklch = [lightness, Math.round(candidateChroma * 10000) / 10000, hue];
    if (inGamut(candidate)) return candidate;
    candidateChroma *= CHROMA_STEP;
  }
  throw new Error(`no in-gamut light colour for ${label}`);
};

// Dark accents lose contrast on a light page, so lightness drops and chroma rises.
// The two constraints fight: more chroma leaves the sRGB gamut at the lightness the
// floor demands. Walk chroma down until a colour satisfies both, then verify against
// the emitted hex, because rounding to 8 bits can cost up to 0.06 of the ratio.
//
// The reference surface is `input`, not `page`: an accent that only clears the floor on
// a light surface fails the moment it lands on a native control. `hover` is darker, but
// hover rows use neutral text; `input` is the darkest surface where accent text lands.
// Teal's high-lightness sRGB gamut boundary sits above the 4.5:1 solution even at the
// lower end of the authored band. Its low-lightness branch would make a nearly-black
// cyan, so the light scheme records the narrow, evidenced exception instead.
export const LIGHT_CHROMA_FLOOR_EXCEPTION: Partial<Record<AccentName, number>> = {
  teal: 0.08,
};

const solveOnLightSurface = (
  name: AccentName, hue: number, startChroma: number, floor: number, minimumChroma = 0,
): Oklch => {
  let chroma = startChroma;
  for (let i = 0; i < 60; i += 1) {
    const rounded = Math.round(chroma * 10000) / 10000;
    // Lower lightness means more contrast here, so rounding down never breaks the floor.
    let L = floorTo(solveLightness(rounded, hue, lightNeutral.input, floor, 'down'), 3);
    for (let step = 0; step <= LIGHTNESS_SEARCH_STEPS; step += 1) {
      const colour: Oklch = [L, rounded, hue];
      if (inGamut(colour) && contrastEmitted(colour, lightNeutral.input) >= floor) return colour;
      L -= LIGHTNESS_STEP;
    }
    // An in-gamut branch can occur below the continuous contrast boundary. The modest
    // lower-lightness window above is intentional: it retains more of the authored band
    // for copper and green without selecting their near-black branch.
    if (rounded <= minimumChroma) break;
    chroma *= CHROMA_STEP;
  }
  throw new Error(`no in-gamut light colour for ${name} at ${floor}:1`);
};

export const lightAccent = (name: AccentName): Oklch => {
  const [, chroma, hue] = ACCENTS[name];
  const ceiling = CHROMA_CEILING[name] ?? CHROMA_DEFAULT[1];
  const minimum = LIGHT_CHROMA_FLOOR_EXCEPTION[name] ?? CHROMA_DEFAULT[0];
  return solveOnLightSurface(
    name,
    hue,
    Math.min(chroma * CHROMA_BOOST * LIGHT_ACCENT_CHROMA_SCALE, ceiling),
    CONTRAST_FLOOR,
    minimum,
  );
};

export const lightAccents: Record<AccentName, Oklch> = mapValues(ACCENTS, (_value, name) =>
  lightAccent(name),
);

export const lightSyntax: Record<SyntaxRole, Oklch> = mapValues(
  SYNTAX,
  (accent): Oklch => lightAccents[accent],
);

const LIGHT_SUBTLE_LIGHTNESS = 0.9562;

// A subtle fill carries no text of its own, so only the gamut constrains it.
const lightSubtle = (name: AccentName): Oklch => {
  const [, chroma, hue] = ACCENTS[name];
  let candidate = Math.min(
    chroma * 0.35 * LIGHT_ACCENT_CHROMA_SCALE,
    (1 - LIGHT_SUBTLE_LIGHTNESS) * 0.6 * LIGHT_ACCENT_CHROMA_SCALE,
  );
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
    border: solveOnLightSurface(
      name,
      hue,
      Math.min(chroma * 0.5 * LIGHT_ACCENT_CHROMA_SCALE, 0.09),
      NON_TEXT_FLOOR,
    ),
    solid: lightAccent(name),
  };
};

// Native light decorations have their own budget. The blue selection and gold match
// remain visible through hue while staying on the light side of the syntax budget.
export const lightOverlay = {
  selection: { color: gamutSafe(0.990, 0.040, 255, 'selection'), alpha: 0.60 },
  findMatchOther: { color: gamutSafe(0.990, 0.060, 90, 'other find match'), alpha: 0.55 },
  wordHighlight: { color: gamutSafe(0.990, 0.040, 90, 'word highlight'), alpha: 0.50 },
  lineHighlight: { color: gamutSafe(0.990, 0.020, BASE_HUE, 'current line'), alpha: 0.55 },
} as const satisfies Record<string, Overlay>;

export const lightFindMatch = {
  current: lightAccentScale('gold').subtle,
} as const;

const LIGHT_DIFF_WASH_COLOR = {
  added: lightAccents.green,
  removed: lightAccents.coral,
} as const;

// Pale subtle fills moved the editor by less than 0.01 in OKLab and disappeared in a
// rendered diff. Low-alpha solid accents make the line and changed word perceptible while
// every syntax role stays above 4.5:1 and at least half the selection cue survives.
export const lightDiffWash = {
  addedLine: { color: LIGHT_DIFF_WASH_COLOR.added, alpha: 0.07 },
  addedWord: { color: LIGHT_DIFF_WASH_COLOR.added, alpha: 0.035 },
  removedLine: { color: LIGHT_DIFF_WASH_COLOR.removed, alpha: 0.07 },
  removedWord: { color: LIGHT_DIFF_WASH_COLOR.removed, alpha: 0.035 },
} as const satisfies Record<string, Overlay>;

// The strips are the only opaque diff marker. Their restrained chroma keeps the gutter
// quieter than the body washes while the 0.06 lightness separation distinguishes meaning.
export const lightDiff = {
  addedStrip: gamutSafe(0.266, 0.076, ACCENTS.green[2], 'added strip'),
  removedStrip: gamutSafe(0.206, 0.076, ACCENTS.coral[2], 'removed strip'),
  addedGutter: lightAccents.green,
  removedGutter: lightAccents.coral,
} as const satisfies Record<string, Oklch>;

export const lightBrackets: readonly Oklch[] = bracketPairs.map((name) => lightAccents[name]);
export const lightCursor: Oklch = lightAccents.gold;

// Integrated-terminal colours are measured on the light panel (`surface`). The standalone
// Windows Terminal fragment intentionally keeps the dark slots from `palette.ts`.
export const lightAnsi: Record<AnsiSlot, Oklch> = (() => {
  const out = {} as Record<AnsiSlot, Oklch>;
  for (const [slot, accent] of Object.entries(ANSI_HUE) as [AnsiChromaticSlot, AccentName][]) {
    const [L, C, H] = lightAccents[accent];
    out[slot] = gamutSafe(L - BRIGHT_TO_NORMAL, C, H, `ansi ${slot}`);
    out[`bright${capitalise(slot)}`] = [L, C, H];
  }
  out.black = [0.190, BASE_CHROMA, BASE_HUE];
  out.brightBlack = lightAnsiBrightBlack;
  out.white = lightAnsiWhite;
  out.brightWhite = lightNeutral.textPrimary;
  return out;
})();

// Terminal selections are opaque in native terminals, so this is a light neutral rather
// than the translucent editor selection. It leaves every non-black ANSI slot readable.
export const lightTerminalSelection: Oklch = lightNeutral.raised;
