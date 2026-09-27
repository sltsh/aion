import type { Oklch } from './oklch.js';
import { compositeCssAlpha } from './oklch.js';
import type { DecorationName, DiffWashName, NeutralName, Overlay, OverlayName, SecondaryDecorationName, SyntaxRole } from './palette.js';
import { ACCENTS, SYNTAX, comment, decoration, diffWash, findMatch, neutral, overlay, secondaryDecoration } from './palette.js';
import {
  lightComment, lightDecoration, lightDiffWash, lightEditorNeutral, lightFindMatch, lightOverlay, lightSecondaryDecoration,
  lightSyntax,
} from './light.js';

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
  readonly decoration: Record<DecorationName, Overlay>;
  readonly secondaryDecoration: Record<SecondaryDecorationName, Overlay>;
}

export const SHIPPED: StateSource = {
  neutral, overlay, diffWash, findMatch, comment, decoration, secondaryDecoration,
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
  secondaryDecoration: lightSecondaryDecoration,
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

// view.ts registers current line, selections, then DecorationsOverlay. decorations.ts
// paints whole-line decorations first and sorts each group by zIndex and className.
// This order selects the inline char-insert/char-delete variants; the pinned fixture
// records the whole-line variants separately.
export type StackLayer = OverlayName | DiffWashName | DecorationName | SecondaryDecorationName;
export const RENDER_ORDER = [
  'lineHighlight', 'selection', 'inactiveSelection',
  'mergeCurrentHeader', 'mergeCommonHeader', 'mergeIncomingHeader',
  'focusedStackFrame', 'stackFrame', 'unchangedCode', 'findRange', 'fold',
  'removedLine', 'addedLine', 'mergeChange', 'rangeHighlight',
  'bracketMatch', 'removedWord', 'addedWord', 'covered', 'uncovered', 'hover',
  'mergeChangeWord', 'searchMatch', 'selectionHighlight', 'symbol',
  'wordHighlight', 'strongWord', 'findMatchOther', 'commentRange', 'activeCommentRange',
] as const satisfies readonly StackLayer[];

const BASES = [[], ['lineHighlight'], ['selection'], ['inactiveSelection']] as const;
const DIFFS = [[], ['addedLine'], ['addedLine', 'addedWord'], ['removedLine'],
  ['removedLine', 'removedWord']] as const;
const READING_TOPS = ['wordHighlight', 'findMatchOther', 'selectionHighlight'] as const;
const OTHER_TOPS = [
  'findRange', 'rangeHighlight', 'fold', 'hover', 'symbol', 'strongWord', 'stackFrame',
  'focusedStackFrame', 'bracketMatch', 'commentRange', 'activeCommentRange',
  'mergeCurrentHeader', 'mergeIncomingHeader', 'mergeCommonHeader', 'mergeChange',
  'mergeChangeWord', 'searchMatch', 'covered', 'uncovered', 'unchangedCode',
] as const satisfies readonly StackLayer[];
const BASE = new Set<StackLayer>(['lineHighlight', 'selection', 'inactiveSelection']);
const ADDED = new Set<StackLayer>(['addedLine', 'addedWord']);
const REMOVED = new Set<StackLayer>(['removedLine', 'removedWord']);
const TOP = new Set<StackLayer>(READING_TOPS);
const OTHER = new Set<StackLayer>(OTHER_TOPS);
const MERGE_EDITOR = new Set<StackLayer>(['mergeChange', 'mergeChangeWord']);

// hideUnchangedRegionsFeature.ts applies diff-unchanged-lines to unchanged
// ranges, so it cannot occupy a character with an inserted or removed line.
// Merge Editor CodeEditorView creates its own widgets and applies editor-owned
// decorations; DiffEditorEditors creates separate widgets for the diff collections.
export function producible(layers: ReadonlySet<StackLayer>): boolean {
  if ([...layers].some((name) => MERGE_EDITOR.has(name)) &&
      [...layers].some((name) => ADDED.has(name) || REMOVED.has(name) || name === 'unchangedCode' || name === 'fold')) return false;
  if (layers.has('unchangedCode') &&
      [...layers].some((name) => ADDED.has(name) || REMOVED.has(name))) return false;
  if ([...layers].filter((name) => BASE.has(name)).length > 1) return false;
  if ([...layers].some((name) => ADDED.has(name)) &&
      [...layers].some((name) => REMOVED.has(name))) return false;
  if (layers.has('addedWord') && !layers.has('addedLine')) return false;
  if (layers.has('removedWord') && !layers.has('removedLine')) return false;
  return true;
}

// Coverage is the stated combinatorial bound intersected with producible.
// This co-occurrence bound is a product decision, not a renderer exclusion.
// The renderer permits more inline combinations than the guarantee enumerates.
export function covered(layers: ReadonlySet<StackLayer>): boolean {
  if (!producible(layers)) return false;
  const others = [...layers].filter((name) => OTHER.has(name));
  return others.length <= 1 && (others.length === 0 ||
    ![...layers].some((name) => TOP.has(name)));
}
export const orderStack = (layers: ReadonlySet<StackLayer>): StackLayer[] =>
  RENDER_ORDER.filter((name) => layers.has(name));
export const stackName = (surface: SurfaceName, layers: readonly StackLayer[]): string =>
  [surface, ...layers].join(' + ');

const coveredStacks = (): StackLayer[][] => {
  const stacks: StackLayer[][] = [];
  for (const base of BASES) for (const diff of DIFFS) {
    const pair: StackLayer[] = [...base, ...diff];
    for (let mask = 0; mask < (1 << READING_TOPS.length); mask += 1) {
      const layers = new Set<StackLayer>(pair);
      READING_TOPS.forEach((name, index) => { if (mask & (1 << index)) layers.add(name); });
      if (covered(layers)) stacks.push(orderStack(layers));
    }
    for (const name of OTHER_TOPS) {
      const layers = new Set<StackLayer>([...pair, name]);
      if (covered(layers)) stacks.push(orderStack(layers));
    }
  }
  return stacks;
};
const EDITOR_STACKS = coveredStacks();
// Peek retains the legacy base/reading-top/decoration domain. New secondary
// contexts are not claimed without positive applicability evidence for a peek widget.
const SECONDARY = new Set<StackLayer>(Object.keys(secondaryDecoration) as StackLayer[]);
const PEEK_STACKS = EDITOR_STACKS.filter((stack) =>
  !stack.some((name) => ADDED.has(name) || REMOVED.has(name) || SECONDARY.has(name)));

// colorThemeCss.ts emits Color.toString() for CSS variables; direct theming rules
// interpolate the same Color. HexA parsing rounds alpha to three decimals, then
// CSS.formatRGBA rounds to two. Selection highlight additionally calls transparent(.5).
export function paintedAlpha(name: StackLayer, authored: number): number {
  const emitted = Math.round(authored * 255) / 255;
  const parsed = Math.round(emitted * 1000) / 1000;
  const painted = name === 'selectionHighlight' ? Math.round(parsed * 0.5 * 1000) / 1000 : parsed;
  return Number(painted.toFixed(2));
}

export function stackBackground(source: StateSource, base: Oklch, layers: readonly StackLayer[]): Oklch {
  return layers.reduce((under, name) => {
    const value: Overlay = name in source.overlay ? source.overlay[name as OverlayName]
      : name in source.diffWash ? source.diffWash[name as DiffWashName]
        : name in source.decoration ? source.decoration[name as DecorationName]
          : source.secondaryDecoration[name as SecondaryDecorationName];
    return compositeCssAlpha(value.color, paintedAlpha(name, value.alpha), under);
  }, base);
}

export function readingStates(source: StateSource = SHIPPED): ReadingState[] {
  const surface = surfaces(source);
  const rows: ReadingState[] = [];
  for (const stack of EDITOR_STACKS) {
    rows.push({ name: stackName('editor', stack), background: stackBackground(source, surface.editor, stack) });
  }
  for (const stack of PEEK_STACKS) {
    rows.push({ name: stackName('peekEditor', stack), background: stackBackground(source, surface.peekEditor, stack) });
  }
  rows.push({ name: 'hoverWidget', background: surface.hoverWidget });
  rows.push({ name: 'findMatch', background: surface.findMatch });
  rows.push({ name: 'findMatch + wordHighlight', background: surface.findMatch });
  return rows;
}

export const readingForegrounds = (source: StateSource = SHIPPED): Record<string, Oklch> => ({
  comment: source.comment,
  punctuation: source.neutral.textSecondary,
  ...source.syntax,
});
