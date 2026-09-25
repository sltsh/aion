import type { Oklch } from './oklch.js';
import { compositeEmitted } from './oklch.js';
import type { DiffWashName, NeutralName, Overlay, OverlayName, SyntaxRole } from './palette.js';
import { ACCENTS, SYNTAX, comment, diffWash, findMatch, neutral, overlay } from './palette.js';
import {
  lightComment, lightDecoration, lightDiffWash, lightEditorNeutral, lightFindMatch, lightOverlay,
  lightSyntax,
} from './light.js';
import type { LightDecorationName } from './light.js';

export interface ReadingState {
  readonly name: string;
  readonly background: Oklch;
}

// The palette the states are read from. The shipped one is the default; the lab passes its
// preview palette, so the live readout measures the same states the build gate does rather
// than a second list that drifts from this one.
export interface StateSource {
  readonly neutral: Record<NeutralName, Oklch>;
  readonly overlay: Record<OverlayName, Overlay>;
  readonly diffWash: Record<DiffWashName, Overlay>;
  readonly findMatch: { readonly current: Oklch };
  readonly syntax: Record<SyntaxRole, Oklch>;
  readonly comment: Oklch;
  /** Light only: Dark's editor decorations are gated one at a time in the theme test. */
  readonly decoration?: Record<LightDecorationName, Overlay>;
}

export const SHIPPED: StateSource = {
  neutral, overlay, diffWash, findMatch, comment,
  syntax: Object.fromEntries(
    (Object.keys(SYNTAX) as SyntaxRole[]).map((role) => [role, ACCENTS[SYNTAX[role]]]),
  ) as Record<SyntaxRole, Oklch>,
};

export const LIGHT_SHIPPED: StateSource = {
  neutral: lightEditorNeutral,
  overlay: lightOverlay,
  diffWash: lightDiffWash,
  findMatch: lightFindMatch,
  comment: lightComment,
  syntax: lightSyntax,
  decoration: lightDecoration,
};

const surfaces = (source: StateSource) => ({
  editor: source.neutral.editor,
  peekEditor: source.neutral.terminal,
  hoverWidget: source.neutral.widget,
  // The current find match is opaque, so it is a surface rather than an overlay. Nothing
  // it covers can raise it, which is why it may be the loudest decoration in the editor.
  findMatch: source.findMatch.current,
});

export type SurfaceName = keyof ReturnType<typeof surfaces>;

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

// The decorations VS Code paints in `DecorationsOverlay` land over the current line or the
// selection. The inactive selection replaces the selection and, being a selection, never
// shares a line with the current-line fill.
const DECORATION_BASES: Record<LightDecorationName, readonly (readonly OverlayName[])[]> = {
  selectionHighlight: [[], ['lineHighlight'], ['selection']],
  findRange: [[], ['lineHighlight'], ['selection']],
  rangeHighlight: [[], ['lineHighlight'], ['selection']],
  fold: [[], ['lineHighlight'], ['selection']],
  inactiveSelection: [[]],
};

// The complete set of backgrounds the contrast guarantee covers. Anything absent here is
// outside the claim, and `README.md` says so rather than implying every state passes.
export function readingStates(source: StateSource = SHIPPED): ReadingState[] {
  const stackOn = (base: Oklch, names: readonly OverlayName[]): Oklch =>
    names.reduce((under, name) =>
      compositeEmitted(source.overlay[name].color, source.overlay[name].alpha, under), base);
  const washOn = (base: Oklch, names: readonly DiffWashName[]): Oklch =>
    names.reduce((under, name) =>
      compositeEmitted(source.diffWash[name].color, source.diffWash[name].alpha, under), base);

  const surface = surfaces(source);
  const rows: ReadingState[] = [];
  for (const [name, base] of Object.entries(surface) as [SurfaceName, Oklch][]) {
    for (const stack of STACKS[name]) {
      rows.push({ name: [name, ...stack].join(' + '), background: stackOn(base, stack) });
    }
  }
  for (const base of DIFF_BASES) {
    for (const layer of DIFF_LAYERS) {
      rows.push({
        name: ['editor', ...base, ...layer].join(' + '),
        background: washOn(stackOn(surface.editor, base), layer),
      });
    }
  }
  for (const base of OTHER_MATCH_BASES) {
    for (const name of ['editor', 'peekEditor'] as const) {
      rows.push({
        name: [name, ...base, 'findMatchOther'].join(' + '),
        background: stackOn(stackOn(surface[name], base), ['findMatchOther']),
      });
    }
  }
  if (source.decoration !== undefined) {
    const decoration = source.decoration;
    for (const [name, bases] of Object.entries(DECORATION_BASES) as [LightDecorationName, readonly (readonly OverlayName[])[]][]) {
      for (const base of bases) {
        for (const surfaceName of ['editor', 'peekEditor'] as const) {
          rows.push({
            name: [surfaceName, ...base, name].join(' + '),
            background: compositeEmitted(
              decoration[name].color, decoration[name].alpha, stackOn(surface[surfaceName], base)),
          });
        }
      }
    }
  }
  return rows;
}

export const readingForegrounds = (source: StateSource = SHIPPED): Record<string, Oklch> => ({
  comment: source.comment,
  punctuation: source.neutral.textSecondary,
  ...source.syntax,
});
