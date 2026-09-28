import type { Oklch } from './oklch.js';
import { solveLightness, inGamut, contrastEmitted } from './oklch.js';
import type {
  AccentName, AccentScale, AnsiChromaticSlot, AnsiSlot, DecorationName, NeutralName, Overlay,
  SecondaryDecorationName, SyntaxRole,
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
// The comment is the budget every light overlay is solved against. At 0.516 no tinted
// selection fitted under a diff wash; 0.490 buys that room and stays quieter than dim text.
export const lightComment: Oklch = lightNeutralRole(0.490);
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
// the emitted hex; roundingShift measures the gap near the floor on its grid.
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

// Light syntax clears 4.8:1 on `input`, not 4.5:1. The selection sits under running code,
// and at 4.5:1 no blue fill could move the editor by more than 0.033 in OKLab; this margin
// is what lets the selection be seen.
export const LIGHT_SYNTAX_FLOOR = 4.8;

export const lightAccent = (name: AccentName): Oklch => {
  const [, chroma, hue] = ACCENTS[name];
  const ceiling = CHROMA_CEILING[name] ?? CHROMA_DEFAULT[1];
  const minimum = LIGHT_CHROMA_FLOOR_EXCEPTION[name] ?? CHROMA_DEFAULT[0];
  return solveOnLightSurface(
    name,
    hue,
    Math.min(chroma * CHROMA_BOOST * LIGHT_ACCENT_CHROMA_SCALE, ceiling),
    LIGHT_SYNTAX_FLOOR,
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

// Near the light editor, sRGB leaves little room for visible pale fills. The hue supplies
// separation while the comment and syntax accents bound lightness on every covered
// stack. The selection remains the strongest reading cue, including through a word or
// another find match.
export const lightOverlay = {
  selection: { color: [0.900, 0.050, 250], alpha: 0.700 },
  findMatchOther: { color: gamutSafe(0.916, 0.078, 90, 'other find match'), alpha: 0.40 },
  wordHighlight: { color: [0.900, 0.100, 200], alpha: 0.450 },
  lineHighlight: { color: gamutSafe(0.948, 0.024, BASE_HUE, 'current line'), alpha: 0.95 },
} as const satisfies Record<string, Overlay>;

// Find and folded ranges need a cyan hue to stay visible without hiding a selection on
// a diff word. Selection highlight is halved by VS Code's CSS after its key is emitted.
export const lightDecoration: Record<DecorationName, Overlay> = {
  selectionHighlight: { color: [0.910, 0.000, 250], alpha: 0.900 },
  // Keep the inactive fill's emitted colour when re-solving the active selection.
  inactiveSelection: { color: gamutSafe(0.835, 0.085, 250, 'inactive selection'), alpha: 0.25 },
  findRange: { color: [0.920, 0.070, 210], alpha: 0.450 },
  rangeHighlight: { color: [0.910, 0.040, 264], alpha: 0.500 },
  fold: { color: [0.920, 0.070, 210], alpha: 0.450 },
};

export const lightSecondaryDecoration: Record<SecondaryDecorationName, Overlay> = {
  hover: { color: lightAccentScale('blue').subtle, alpha: 0.12 },
  symbol: { color: lightAccentScale('gold').subtle, alpha: 0.10 },
  strongWord: { color: lightAccentScale('teal').subtle, alpha: 0.12 },
  stackFrame: { color: lightAccentScale('gold').subtle, alpha: 0.10 },
  focusedStackFrame: { color: lightAccentScale('green').subtle, alpha: 0.12 },
  bracketMatch: { color: lightAccentScale('gold').subtle, alpha: 0.10 },
  commentRange: { color: lightAccentScale('gold').subtle, alpha: 0.10 },
  activeCommentRange: { color: lightAccentScale('gold').subtle, alpha: 0.10 },
  unchangedCode: { color: lightOverlay.lineHighlight.color, alpha: 0.3 },
  mergeCurrentHeader: { color: lightAccentScale('green').subtle, alpha: 0.12 },
  mergeIncomingHeader: { color: lightAccentScale('blue').subtle, alpha: 0.12 },
  mergeCommonHeader: { color: lightOverlay.lineHighlight.color, alpha: 0.20 },
  mergeChange: { color: lightAccentScale('green').subtle, alpha: 0.10 },
  mergeChangeWord: { color: lightAccentScale('green').subtle, alpha: 0.12 },
  searchMatch: { color: lightAccentScale('gold').subtle, alpha: 0.10 },
  covered: { color: lightAccentScale('green').subtle, alpha: 0.12 },
  uncovered: { color: lightAccentScale('coral').subtle, alpha: 0.14 },
};

export type LightDecorationName = DecorationName;

export const lightFindMatch = {
  current: lightAccentScale('gold').subtle,
} as const;

const LIGHT_DIFF_WASH_COLOR = {
  added: lightAccents.green,
  removed: lightAccents.coral,
} as const;

// The native byte compositor exhausts the comment budget on a selected added word.
// A pale, more chromatic green line preserves its semantic hue and selection cue while
// recovering luminance for the reading overlays. The word keeps the solid accent.
// Both line searches retain the existing visibility and selection-cue constraints.
export const lightDiffWash = {
  addedLine: { color: [0.890, 0.200, 148], alpha: 0.430 },
  addedWord: { color: LIGHT_DIFF_WASH_COLOR.added, alpha: 0.03 },
  removedLine: { color: [0.890, 0.040, 22], alpha: 0.500 },
  removedWord: { color: LIGHT_DIFF_WASH_COLOR.removed, alpha: 0.03 },
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
