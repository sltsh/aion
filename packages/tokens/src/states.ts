import type { Oklch } from './oklch.js';
import { compositeEmitted } from './oklch.js';
import type { DiffWashName, OverlayName, SyntaxRole } from './palette.js';
import { ACCENTS, SYNTAX, comment, diffWash, findMatch, neutral, overlay } from './palette.js';

export interface ReadingState {
  readonly name: string;
  readonly background: Oklch;
}

const SURFACE = {
  editor: neutral.editor,
  peekEditor: neutral.terminal,
  hoverWidget: neutral.widget,
  // The current find match is opaque, so it is a surface rather than an overlay. Nothing
  // it covers can raise it, which is why it may be the loudest decoration in the editor.
  findMatch: findMatch.current,
} as const satisfies Record<string, Oklch>;

export type SurfaceName = keyof typeof SURFACE;

// A stack is the decorations the native editor paints over one another on the same
// characters. A selection and a word highlight can both land on a word the caret is
// already inside, so that pair is real.
//
// The current line and a selection cannot stack: VS Code renders the current-line
// background only while every selection is empty, in `_shouldRenderInContent`. Gating a
// state the renderer never produces held the current line at 1.05:1 against the editor
// for no reader's benefit.
const EDITOR_STACKS: readonly (readonly OverlayName[])[] = [
  [],
  ['lineHighlight'],
  ['selection'],
  ['wordHighlight'],
  ['lineHighlight', 'wordHighlight'],
  ['selection', 'wordHighlight'],
];

const STACKS: Record<SurfaceName, readonly (readonly OverlayName[])[]> = {
  editor: EDITOR_STACKS,
  peekEditor: EDITOR_STACKS,
  hoverWidget: [[]],
  findMatch: [[], ['wordHighlight']],
};

// A diff wash goes on top of the selection, not under it. VS Code registers
// `DecorationsOverlay` after `SelectionsOverlay` and both render into the same line
// element in registration order, so the wash is the last layer before the glyph. The
// bases it sits on are the plain line, the current line and the selection.
const DIFF_LAYERS: readonly (readonly DiffWashName[])[] = [
  ['addedLine'],
  ['addedLine', 'addedWord'],
  ['removedLine'],
  ['removedLine', 'removedWord'],
];

const DIFF_BASES: readonly (readonly OverlayName[])[] = [[], ['lineHighlight'], ['selection']];

// The other matches are a wash, and their own registration says they must be, so that the
// decorations under them still read. The decoration renders in an editor, so the surfaces
// are the editor and the peek editor, not a widget.
const OTHER_MATCH_BASES: readonly (readonly OverlayName[])[] = [
  [], ['lineHighlight'], ['selection'], ['selection', 'wordHighlight'],
];

const stackOn = (base: Oklch, names: readonly OverlayName[]): Oklch =>
  names.reduce((under, name) => compositeEmitted(overlay[name].color, overlay[name].alpha, under), base);

const washOn = (base: Oklch, names: readonly DiffWashName[]): Oklch =>
  names.reduce((under, name) => compositeEmitted(diffWash[name].color, diffWash[name].alpha, under), base);

// The complete set of backgrounds the contrast guarantee covers. Anything absent here is
// outside the claim, and `README.md` says so rather than implying every state passes.
export function readingStates(): ReadingState[] {
  const rows: ReadingState[] = [];
  for (const [surface, base] of Object.entries(SURFACE) as [SurfaceName, Oklch][]) {
    for (const stack of STACKS[surface]) {
      rows.push({ name: [surface, ...stack].join(' + '), background: stackOn(base, stack) });
    }
  }
  for (const base of DIFF_BASES) {
    for (const layer of DIFF_LAYERS) {
      rows.push({
        name: ['editor', ...base, ...layer].join(' + '),
        background: washOn(stackOn(SURFACE.editor, base), layer),
      });
    }
  }
  for (const base of OTHER_MATCH_BASES) {
    for (const surface of ['editor', 'peekEditor'] as const) {
      rows.push({
        name: [surface, ...base, 'findMatchOther'].join(' + '),
        background: stackOn(stackOn(SURFACE[surface], base), ['findMatchOther']),
      });
    }
  }
  return rows;
}

export const readingForegrounds = (): Record<string, Oklch> => ({
  comment,
  punctuation: neutral.textSecondary,
  ...Object.fromEntries(
    (Object.keys(SYNTAX) as SyntaxRole[]).map((role) => [role, ACCENTS[SYNTAX[role]]]),
  ),
});
