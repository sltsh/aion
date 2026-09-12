import type {
  AccentName, AccentScale, AnsiChromaticSlot, AnsiSlot, NeutralName, StatusName, SyntaxRole,
} from './palette.js';
import {
  ACCENTS, ANSI_HUE, BASE_CHROMA, BASE_HUE, BRIGHT_TO_NORMAL, NEUTRAL_LIGHTNESS, STATUS, SYNTAX,
  bracketPairs, capitalise, comment as shippedComment, diff as shippedDiff,
  diffWash as shippedWash,
  findMatch as shippedFindMatch,
  overlay as shippedOverlay, dimText as shippedDim, scaleOf, terminalSelection,
} from './palette.js';
import {
  lightAccents, lightAnsi, lightBrackets, lightComment, lightDiff, lightDiffWash,
  lightDimText, lightEditorNeutral, lightFindMatch, lightOverlay, lightAccentScale,
  lightCursor, lightTerminalSelection,
} from './light.js';
import type { StatusScale } from './status.js';
import { statusLightFor } from './status.js';
import type { Oklch, Overlay } from './index.js';
import { mapValues } from './util.js';

const reHue = (marker: Oklch, accent: Oklch): Oklch => [marker[0], marker[1], accent[2]];
const reWash = (wash: Overlay, accent: Oklch): Overlay =>
  ({ color: reHue(wash.color, accent), alpha: wash.alpha });

export interface PreviewOptions {
  readonly baseHue: number;
  readonly baseChroma: number;
  readonly surfaceShift: number;
  readonly accentChroma: number;
  readonly accentLightness: number;
  readonly commentLightness: number;
}

export const PREVIEW_DEFAULTS: PreviewOptions = {
  baseHue: BASE_HUE,
  baseChroma: BASE_CHROMA,
  surfaceShift: 0,
  accentChroma: 1,
  accentLightness: 0,
  commentLightness: shippedComment[0],
};

// Light controls intentionally use the same names as the dark preview. This keeps the
// lab's later scheme switch small while allowing an exploratory value to fail its own
// contrast readout; the shipped defaults are pinned to `lightPalette` below.
export type LightPreviewOptions = PreviewOptions;
export const LIGHT_PREVIEW_DEFAULTS: LightPreviewOptions = {
  baseHue: BASE_HUE,
  baseChroma: BASE_CHROMA,
  surfaceShift: -0.010,
  accentChroma: 1.10,
  accentLightness: 0.006,
  commentLightness: lightComment[0],
};

export interface Palette {
  readonly neutral: Record<NeutralName, Oklch>;
  readonly dim: Oklch;
  readonly accents: Record<AccentName, Oklch>;
  readonly scales: Record<AccentName, AccentScale>;
  readonly syntax: Record<SyntaxRole, Oklch>;
  readonly comment: Oklch;
  readonly ansi: Record<AnsiSlot, Oklch>;
  readonly diff: Record<keyof typeof shippedDiff, Oklch>;
  readonly diffWash: Record<keyof typeof shippedWash, Overlay>;
  readonly overlay: Record<keyof typeof shippedOverlay, Overlay>;
  readonly findMatch: Record<keyof typeof shippedFindMatch, Oklch>;
  readonly brackets: readonly Oklch[];
  readonly cursor: Oklch;
  readonly terminalSelection: Oklch;
  readonly statuses: Record<StatusName, StatusScale>;
}

// The lab drives this. At the default options it must equal the shipped palette exactly,
// which a test asserts; that is what stops the lab showing a colour the extension lacks.
export function buildPalette(overrides: Partial<PreviewOptions> = {}): Palette {
  const o = { ...PREVIEW_DEFAULTS, ...overrides };
  const shift = (L: number): number => Math.min(1, Math.max(0, L + o.surfaceShift));

  const neutral = mapValues(NEUTRAL_LIGHTNESS, (L): Oklch => [shift(L), o.baseChroma, o.baseHue]);
  const dim: Oklch = [shift(shippedDim[0]), o.baseChroma, o.baseHue];
  const accents = mapValues(ACCENTS, ([L, C, H]): Oklch => [
    Math.min(1, Math.max(0, L + o.accentLightness)),
    Math.max(0, C * o.accentChroma),
    H,
  ]);
  const scales = mapValues(accents, (colour) => scaleOf(colour));
  const statuses = mapValues(STATUS, (accent) => {
    const scale = scales[accent];
    return {
      text: scale.solid, solid: scale.solid, subtle: scale.subtle, border: scale.border,
      onSolid: neutral.editor,
    };
  });

  const ansi = {} as Record<AnsiSlot, Oklch>;
  for (const [slot, accent] of Object.entries(ANSI_HUE) as [AnsiChromaticSlot, AccentName][]) {
    const [L, C, H] = accents[accent];
    ansi[slot] = [L - BRIGHT_TO_NORMAL, C, H];
    ansi[`bright${capitalise(slot)}`] = [L, C, H];
  }
  ansi.black = [shift(0.300), o.baseChroma, o.baseHue];
  ansi.brightBlack = [shift(0.652), o.baseChroma, o.baseHue];
  ansi.white = neutral.textSecondary;
  ansi.brightWhite = neutral.textPrimary;

  const overlay: Record<keyof typeof shippedOverlay, Overlay> = {
    // Bespoke rather than a step of the blue scale: it carries more chroma than any accent
    // is allowed, which is what keeps it visible over a diff fill.
    selection: { color: [shippedOverlay.selection.color[0], shippedOverlay.selection.color[1],
      o.baseHue - BASE_HUE + shippedOverlay.selection.color[2]], alpha: shippedOverlay.selection.alpha },
    findMatchOther: { color: reHue(shippedOverlay.findMatchOther.color, accents.gold),
      alpha: shippedOverlay.findMatchOther.alpha },
    wordHighlight: { color: neutral.hover, alpha: shippedOverlay.wordHighlight.alpha },
    lineHighlight: { color: neutral.hairline, alpha: shippedOverlay.lineHighlight.alpha },
  };

  return {
    neutral,
    dim,
    accents,
    scales,
    syntax: mapValues(SYNTAX, (accent) => accents[accent]),
    comment: [o.commentLightness, o.baseChroma + 0.008, o.baseHue],
    ansi,
    diff: {
      addedStrip: reHue(shippedDiff.addedStrip, accents.green),
      removedStrip: reHue(shippedDiff.removedStrip, accents.coral),
      addedGutter: accents.green,
      removedGutter: accents.coral,
    },
    diffWash: {
      addedLine: reWash(shippedWash.addedLine, accents.green),
      addedWord: reWash(shippedWash.addedWord, accents.green),
      removedLine: reWash(shippedWash.removedLine, accents.coral),
      removedWord: reWash(shippedWash.removedWord, accents.coral),
    },
    overlay,
    findMatch: { current: reHue(shippedFindMatch.current, accents.gold) },
    brackets: bracketPairs.map((name) => accents[name]),
    cursor: accents.gold,
    terminalSelection,
    statuses,
  };
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const shiftHue = (colour: Oklch, hueDelta: number, lightnessDelta = 0, chromaScale = 1): Oklch => [
  clamp(colour[0] + lightnessDelta), colour[1] * chromaScale, colour[2] + hueDelta,
];

const shiftOverlay = (value: Overlay, hueDelta: number, chromaScale: number): Overlay => ({
  color: shiftHue(value.color, hueDelta, 0, chromaScale), alpha: value.alpha,
});

/** Build the native light palette used by the light preview and VS Code adapter. */
export function buildLightPalette(overrides: Partial<LightPreviewOptions> = {}): Palette {
  const o = { ...LIGHT_PREVIEW_DEFAULTS, ...overrides };
  const hueDelta = o.baseHue - LIGHT_PREVIEW_DEFAULTS.baseHue;
  const chromaScale = o.baseChroma / LIGHT_PREVIEW_DEFAULTS.baseChroma;
  const surfaceDelta = o.surfaceShift - LIGHT_PREVIEW_DEFAULTS.surfaceShift;
  const accentChromaScale = o.accentChroma / LIGHT_PREVIEW_DEFAULTS.accentChroma;
  const accentLightnessDelta = o.accentLightness - LIGHT_PREVIEW_DEFAULTS.accentLightness;
  const neutral = mapValues(lightEditorNeutral, (colour): Oklch =>
    shiftHue(colour, hueDelta, surfaceDelta, chromaScale));
  const accents = mapValues(lightAccents, (colour): Oklch =>
    shiftHue(colour, 0, accentLightnessDelta, accentChromaScale));
  const scales = mapValues(lightAccents, (_colour, name): AccentScale => {
    const source = lightAccentScale(name);
    return {
      subtle: shiftHue(source.subtle, 0, accentLightnessDelta * 0.2, accentChromaScale),
      border: shiftHue(source.border, 0, accentLightnessDelta, accentChromaScale),
      solid: accents[name],
    };
  });
  const statuses = statusLightFor(scales, neutral.editor);

  const ansi = {} as Record<AnsiSlot, Oklch>;
  for (const [slot, accent] of Object.entries(ANSI_HUE) as [AnsiChromaticSlot, AccentName][]) {
    const [L, C, H] = accents[accent];
    ansi[slot] = shiftHue(lightAnsi[slot], 0, accentLightnessDelta, accentChromaScale);
    ansi[`bright${capitalise(slot)}`] = [L, C, H];
  }
  ansi.black = shiftHue(lightAnsi.black, hueDelta, surfaceDelta, chromaScale);
  ansi.brightBlack = shiftHue(lightAnsi.brightBlack, hueDelta, surfaceDelta, chromaScale);
  ansi.white = shiftHue(lightAnsi.white, hueDelta, surfaceDelta, chromaScale);
  ansi.brightWhite = shiftHue(lightAnsi.brightWhite, hueDelta, surfaceDelta, chromaScale);

  const overlay: Record<keyof typeof shippedOverlay, Overlay> = {
    selection: shiftOverlay(lightOverlay.selection, 0, chromaScale),
    findMatchOther: shiftOverlay(lightOverlay.findMatchOther, 0, chromaScale),
    wordHighlight: shiftOverlay(lightOverlay.wordHighlight, 0, chromaScale),
    // This is the only light overlay authored from the neutral base hue.
    lineHighlight: shiftOverlay(lightOverlay.lineHighlight, hueDelta, chromaScale),
  };
  const diffWash = mapValues(lightDiffWash, (value): Overlay =>
    shiftOverlay(value, 0, accentChromaScale));
  const diff = mapValues(lightDiff, (value): Oklch =>
    shiftHue(value, 0, accentLightnessDelta, accentChromaScale));
  const findMatch = mapValues(lightFindMatch, (value): Oklch =>
    shiftHue(value, 0, accentLightnessDelta * 0.2, accentChromaScale));

  return {
    neutral,
    dim: shiftHue(lightDimText, hueDelta, surfaceDelta, chromaScale),
    accents,
    scales,
    syntax: mapValues(SYNTAX, (accent) => accents[accent]),
    comment: shiftHue(
      lightComment,
      hueDelta,
      o.commentLightness - LIGHT_PREVIEW_DEFAULTS.commentLightness,
      chromaScale,
    ),
    ansi,
    diff,
    diffWash,
    overlay,
    findMatch,
    brackets: lightBrackets.map((colour) =>
      shiftHue(colour, 0, accentLightnessDelta, accentChromaScale)),
    cursor: shiftHue(lightCursor, 0, accentLightnessDelta, accentChromaScale),
    terminalSelection: shiftHue(lightTerminalSelection, hueDelta, surfaceDelta, chromaScale),
    statuses,
  };
}

// The default is the single source used by the VS Code light theme. Keep this export
// separate from the builder so consumers can compare a preview to the shipped object.
export const lightPalette: Palette = buildLightPalette();

export type ColourScheme = 'dark' | 'light';
export const buildSchemePalette = (
  scheme: ColourScheme,
  overrides: Partial<PreviewOptions> = {},
): Palette => scheme === 'light' ? buildLightPalette(overrides) : buildPalette(overrides);
