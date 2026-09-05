import type { Oklch } from './oklch.js';
import { mapValues } from './util.js';

export const BASE_HUE = 264;
export const BASE_CHROMA = 0.016;

// `hairline` and `divider` are decorative: they separate regions that already read as
// separate. `border` draws the edge of a control a keyboard user must find, so it clears
// the 3:1 non-text floor on `input`, the lightest surface a control sits on.
export const NEUTRAL_LIGHTNESS = {
  editor: 0.195, terminal: 0.207, sidebar: 0.220, widget: 0.250,
  input: 0.285, hover: 0.320, hairline: 0.375, divider: 0.440,
  border: 0.560, muted: 0.580, textSecondary: 0.745, textPrimary: 0.930,
} as const;

export type NeutralName = keyof typeof NEUTRAL_LIGHTNESS;

export const neutral: Record<NeutralName, Oklch> = mapValues(
  NEUTRAL_LIGHTNESS,
  (L): Oklch => [L, BASE_CHROMA, BASE_HUE],
);

export const ACCENTS = {
  coral:  [0.720, 0.1337,  22],
  copper: [0.745, 0.1238,  52],
  gold:   [0.820, 0.1287,  90],
  green:  [0.780, 0.1287, 148],
  teal:   [0.780, 0.1040, 192],
  blue:   [0.755, 0.1139, 255],
  violet: [0.740, 0.1238, 305],
} as const satisfies Record<string, Oklch>;

export type AccentName = keyof typeof ACCENTS;

export const ACCENT_NAMES = Object.keys(ACCENTS) as AccentName[];

export interface AccentScale {
  readonly subtle: Oklch;
  readonly border: Oklch;
  readonly solid: Oklch;
}

export const ACCENT_SUBTLE_LIGHTNESS = 0.255;
export const ACCENT_BORDER_LIGHTNESS = 0.520;

export const scaleOf = ([L, C, H]: Oklch): AccentScale => ({
  subtle: [ACCENT_SUBTLE_LIGHTNESS, Math.min(C * 0.42, 0.055), H],
  border: [ACCENT_BORDER_LIGHTNESS, Math.min(C * 0.62, 0.085), H],
  solid: [L, C, H],
});

export const accentScale = (name: AccentName): AccentScale => scaleOf(ACCENTS[name]);

export const SYNTAX = {
  variable: 'coral', number: 'copper', constant: 'copper', type: 'gold',
  string: 'green', operator: 'teal', escape: 'teal', function: 'blue', keyword: 'violet',
} as const satisfies Record<string, AccentName>;

export type SyntaxRole = keyof typeof SYNTAX;

export const ONE_DARK_PRO_HUE = {
  variable: 17.0, number: 63.8, constant: 63.8, type: 82.3,
  string: 133.0, operator: 206.3, escape: 206.3, function: 245.3, keyword: 318.2,
} as const satisfies Record<SyntaxRole, number>;

// The comment is the dimmest thing a reader has to read, so it sets the budget for every
// decoration that can sit under it. It is solved against the lightest supported stack —
// a selected word inside a highlighted current line — not against the plain editor.
//
// It stops one notch under `variable`, the dimmest accent. Below that the comment alone
// caps every decoration; above it `variable` binds instead and the extra lightness buys
// nothing. At 0.672 the diff fill could reach 1.07:1 against the editor, which no reader
// could see; here it reaches 1.22:1.
export const comment: Oklch = [0.704, BASE_CHROMA + 0.008, BASE_HUE];

// Step 10 is a solid-hover step in the Radix model, not a text step. Line numbers borrow
// it under a documented exemption. Dimmed UI text cannot: it sits on the widget surface
// too, where step 10 reads 3.70:1. This clears the floor on all four dark surfaces.
export const dimText: Oklch = [0.630, BASE_CHROMA, BASE_HUE];

export const STATUS = {
  success: 'green', warning: 'copper', error: 'coral', info: 'blue',
} as const satisfies Record<string, AccentName>;

export type StatusName = keyof typeof STATUS;

// A diff marks three things. The gutter strip fills the margin column, which carries only
// the line number, so it is gated at `NON_TEXT_FLOOR` against that. The line wash covers a
// changed line and the word wash covers the characters that changed inside it.
//
// The two washes are translucent, and that is not a stylistic choice. VS Code renders the
// diff decorations in `DecorationsOverlay`, which it registers after `SelectionsOverlay`,
// so a diff fill paints over the selection rather than under it. An opaque fill hides the
// selection completely on every changed line. The alphas are solved so the selection still
// reads through the strongest fill at 60% of the shift it makes on a plain line.
//
// The colour-vision separation lives on the strips, which are opaque, always drawn and
// never covered: they hold a 0.06 lightness gap. The washes cannot, because a wash dark
// enough to open that gap under a red one is invisible. The gutter glyph carries the
// meaning as shape in either case.
const ADDED_WASH: Oklch = [0.450, 0.130, ACCENTS.green[2]];
const REMOVED_WASH: Oklch = [0.550, 0.190, ACCENTS.coral[2]];

export const diffWash = {
  addedLine:   { color: ADDED_WASH, alpha: 0.12 },
  addedWord:   { color: ADDED_WASH, alpha: 0.16 },
  removedLine: { color: REMOVED_WASH, alpha: 0.16 },
  removedWord: { color: REMOVED_WASH, alpha: 0.17 },
} as const satisfies Record<string, Overlay>;

export type DiffWashName = keyof typeof diffWash;

export const diff = {
  addedStrip:    [0.308, 0.050, ACCENTS.green[2]],
  removedStrip:  [0.248, 0.110, ACCENTS.coral[2]],
  addedGutter:   ACCENTS.green,
  removedGutter: ACCENTS.coral,
} as const satisfies Record<string, Oklch>;

export type DiffName = keyof typeof diff;

export interface Overlay {
  readonly color: Oklch;
  readonly alpha: number;
}

// Every alpha here is a contrast budget, not a taste. These three stack under running
// code, so the gate composites them and measures the syntax colours on the result.
// `lineHighlight` blends toward `hairline` at a low alpha rather than toward a near
// surface at a high one: `sidebar` is one step off the editor, so no alpha of it
// separates the current line, and a high alpha of anything erases the diff fill under it.
export const overlay = {
  // The selection is tinted rather than neutral. A neutral selection inside this budget
  // landed within 0.05 of the current line, so the two read as one decoration; a hue
  // separates them at a luminance the comment can still afford.
  //
  // A translucent overlay moves a surface by `alpha x (overlay - surface)`, so a pale wash
  // that lifts the editor barely touches the diff fills, which are already lighter and
  // already coloured. This is a dark, saturated blue at a high alpha instead: it replaces
  // more of what is under it, so the shift is close to even across every surface the
  // selection can land on. The worst of those went from 0.049 to 0.117 in OKLab.
  //
  // The hue stops at 260. The gamut opens up towards 285, and the search wants to go
  // there, but a wash that close to violet flattens the violet keywords sitting on it.
  selection:      { color: [0.480, 0.195, 260], alpha: 0.39 },
  // The other matches take the same dark-wash treatment as the selection, for the same
  // reason: a pale gold at a low alpha is what the budget allows and it reads as nothing.
  // This is solved to keep the selection reading through it at half its plain-line shift.
  findMatchOther: { color: [0.400, 0.075, ACCENTS.gold[2]], alpha: 0.40 },
  wordHighlight:  { color: neutral.hover,  alpha: 0.28 },
  lineHighlight:  { color: neutral.hairline, alpha: 0.36 },
} as const satisfies Record<string, Overlay>;


export type OverlayName = keyof typeof overlay;

// A find match keeps the syntax colours under it. It used to replace them, through
// `editor.findMatchForeground` and `editor.findMatchHighlightForeground`, and that cannot
// be made to work: `findWidget.ts` applies `editorFindMatchForeground` to `.findMatchInline`
// and `editorFindMatchHighlightForeground` to `.currentFindMatchInline`, which is the
// opposite of what both names and both descriptions say. A theme that sets them ships dark
// text on the pale match and pale text on the dark one. Aion measured 1.42:1 and 1.39:1.
//
// So the fill has to carry the whole job on its own. The current match is opaque, which
// VS Code's own dark default is too, so it takes the full budget however many decorations
// sit under it. The other matches stay translucent, as their description requires.
export const findMatch = {
  current: [0.338, 0.072, ACCENTS.gold[2]],
} as const satisfies Record<string, Oklch>;

export const bracketPairs = ['gold', 'teal', 'violet'] as const satisfies readonly AccentName[];
export const cursor: Oklch = ACCENTS.gold;

export const BRIGHT_TO_NORMAL = 0.06;

export const ANSI_HUE = {
  red: 'coral', green: 'green', yellow: 'gold',
  blue: 'blue', magenta: 'violet', cyan: 'teal',
} as const satisfies Record<string, AccentName>;

export type AnsiChromaticSlot = keyof typeof ANSI_HUE;

export const capitalise = <S extends string>(value: S): Capitalize<S> =>
  (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<S>;

export type AnsiSlot =
  | AnsiChromaticSlot
  | `bright${Capitalize<AnsiChromaticSlot>}`
  | 'black' | 'brightBlack' | 'white' | 'brightWhite';

export const ansi: Record<AnsiSlot, Oklch> = (() => {
  const out = {} as Record<AnsiSlot, Oklch>;
  for (const [slot, accent] of Object.entries(ANSI_HUE) as [AnsiChromaticSlot, AccentName][]) {
    const [L, C, H] = ACCENTS[accent];
    out[slot] = [L - BRIGHT_TO_NORMAL, C, H];
    out[`bright${capitalise(slot)}`] = [L, C, H];
  }
  // Slot 8 clears the text floor on both backgrounds and under a selection or a find
  // match wash, because a prompt puts the time and the git status in it and the terminal
  // has no foreground override to fall back on. Slot 0 cannot: see TERMINAL_BACKGROUNDS.
  out.black = [0.300, BASE_CHROMA, BASE_HUE];
  out.brightBlack = [0.652, BASE_CHROMA, BASE_HUE];
  out.white = neutral.textSecondary;
  out.brightWhite = neutral.textPrimary;
  return out;
})();

export const ANSI_ORDER = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
  'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
] as const satisfies readonly AnsiSlot[];

// A slot can land on either of these, so every foreground slot is gated on both. The
// VS Code panel is the lighter of the two and therefore the one that binds.
export const TERMINAL_BACKGROUNDS = {
  standalone: neutral.editor,
  vscodePanel: neutral.terminal,
} as const satisfies Record<string, Oklch>;

export type TerminalBackgroundName = keyof typeof TERMINAL_BACKGROUNDS;

export const terminalBackground: Oklch = TERMINAL_BACKGROUNDS.standalone;

// Windows Terminal paints the selection opaque behind the glyphs, so unlike the editor
// overlay this value carries every ANSI slot on its own. The neutral it used before read
// 1.40:1 under ANSI red, and no step of the neutral ramp clears the floor for all sixteen.
export const terminalSelection: Oklch = accentScale('blue').subtle;

// SGR 30 selects slot 0 as a foreground, so the old claim that no application puts text
// in it was wrong. It reads about 1.3:1 on either background, and raising it far enough
// to be legible would take it past the point where SGR 40 and reverse video still carry
// text. Aion keeps slot 0 dark and guarantees the other direction instead: slots 7 and 15
// clear the text floor on top of it. `ANSI_BLACK_TEXT` is what that gate measures.
export const ANSI_BLACK_TEXT = ['white', 'brightWhite'] as const satisfies readonly AnsiSlot[];

export const CHROMA_CEILING: Partial<Record<AccentName, number>> = {
  gold: 0.17, green: 0.17, blue: 0.13, violet: 0.13,
};
export const CHROMA_DEFAULT: readonly [number, number] = [0.09, 0.15];
export const HUE_DRIFT_LIMIT = 15;
export const CONTRAST_FLOOR = 4.5;
export const NON_TEXT_FLOOR = 3.0;
export const MEANING_PAIR_GAP = 0.06;
// Semantic foreground and border names that the text floor does not apply to, because
// they never carry body text. `muted` is the line number, under its own exemption.
export const CONTRAST_EXEMPT = new Set(['muted', 'hairline', 'divider']);
