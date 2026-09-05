import type { AccentName, AccentScale, AnsiChromaticSlot, AnsiSlot, NeutralName, SyntaxRole } from './palette.js';
import {
  ACCENTS, ANSI_HUE, BASE_CHROMA, BASE_HUE, BRIGHT_TO_NORMAL, NEUTRAL_LIGHTNESS, SYNTAX,
  bracketPairs, capitalise, comment as shippedComment, diff as shippedDiff,
  diffWash as shippedWash,
  findMatch as shippedFindMatch,
  overlay as shippedOverlay, dimText as shippedDim, scaleOf,
} from './palette.js';
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
  };
}

