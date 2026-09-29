import { contrastEmitted, covered, orderStack, stackBackground } from '@sltsh/aion-tokens';
import type { Oklch, StackLayer, StateSource, SyntaxRole } from '@sltsh/aion-tokens';
import { STATE_SAMPLE } from '../content.js';
import { STATE_ROLES } from './stack.js';

export const TOOLBAR = ['lineHighlight', 'selection', 'wordHighlight', 'findMatchOther', 'addedLine', 'addedWord', 'removedLine', 'removedWord', 'bracketMatch', 'findRange', 'mergeConflict'] as const;
export type ToolbarLayer = (typeof TOOLBAR)[number];
// A word fill is only ever drawn over its line fill, so its swatch shows the pair.
export const toolbarStack = (layer: ToolbarLayer): StackLayer[] =>
  layer === 'mergeConflict' ? ['mergeCurrentHeader'] : layer === 'addedWord' ? ['addedLine', 'addedWord'] : layer === 'removedWord' ? ['removedLine', 'removedWord'] : [layer];
export type Span = { line: number; from?: number; to?: number };
export type TextSpan = { line: number; from: number; to: number };
export const STATE_IDENTIFIER = 'entry';
export const STATE_SEARCH = 'cache';

const lines = STATE_SAMPLE.map(line => line.map(([, text]) => text).join(''));

export function expandSpan(span: Span): TextSpan {
  return { line: span.line, from: span.from ?? 0, to: span.to ?? lines[span.line]!.length };
}

export const STATE_TOKENS = STATE_SAMPLE.flatMap((tokens, line) => {
  let from = 0;
  return tokens.map(([role, text]) => {
    const span = { line, from, to: from + text.length };
    from = span.to;
    return { role, text, span };
  });
});

const occurrences = (term: string): Span[] => lines.flatMap((text, line) =>
  [...text.matchAll(new RegExp(`\\b${term}\\b`, 'g'))].map(match => ({ line, from: match.index, to: match.index + term.length })));
const tokenSpan = (line: number, text: string): Span => STATE_TOKENS.find(token => token.span.line === line && token.text === text)!.span;
const openBracket = lines[1]!.indexOf('(');
const closeBracket = lines[1]!.indexOf(')');

const MERGE_PLACEMENT = [
  { span: { line: 4 }, layer: 'mergeCurrentHeader' },
  { span: { line: 5 }, layer: 'mergeChange' },
  { span: { line: 6 }, layer: 'mergeCommonHeader' },
  { span: { line: 7 }, layer: 'mergeChange' },
  { span: { line: 9 }, layer: 'mergeChange' },
  { span: { line: 10 }, layer: 'mergeIncomingHeader' },
] as const satisfies readonly { span: Span; layer: StackLayer }[];

export const PLACEMENT: Readonly<Record<ToolbarLayer, readonly Span[]>> = {
  lineHighlight: [{ line: 1 }],
  selection: [tokenSpan(1, STATE_IDENTIFIER)],
  wordHighlight: occurrences(STATE_IDENTIFIER),
  findMatchOther: occurrences(STATE_SEARCH),
  addedLine: [{ line: 2 }],
  addedWord: [tokenSpan(2, 'next')],
  removedLine: [{ line: 3 }],
  removedWord: [tokenSpan(3, 'prev')],
  bracketMatch: [{ line: 1, from: openBracket, to: openBracket + 1 }, { line: 1, from: closeBracket, to: closeBracket + 1 }],
  findRange: [{ line: 1, from: lines[1]!.indexOf(STATE_SEARCH), to: closeBracket + 1 }],
  mergeConflict: MERGE_PLACEMENT.map(({ span }) => span),
};

export function togglePlacement(on: ReadonlySet<ToolbarLayer>, layer: ToolbarLayer): Set<ToolbarLayer> {
  const next = new Set(on);
  if (next.has(layer)) {
    next.delete(layer);
    if (layer === 'addedLine') next.delete('addedWord');
    if (layer === 'removedLine') next.delete('removedWord');
  } else {
    next.add(layer);
    if (layer === 'addedWord') next.add('addedLine');
    if (layer === 'removedWord') next.add('removedLine');
  }
  return next;
}

function intervals(on: ReadonlySet<ToolbarLayer>): { span: TextSpan; layers: StackLayer[] }[] {
  const placements = [...on].flatMap(layer => layer === 'mergeConflict'
    ? MERGE_PLACEMENT.map(row => ({ span: expandSpan(row.span), layer: row.layer as StackLayer }))
    : PLACEMENT[layer].map(span => ({ span: expandSpan(span), layer })));
  return lines.flatMap((text, line) => {
    const local = placements.filter(row => row.span.line === line);
    const boundaries = [...new Set([0, text.length, ...local.flatMap(row => [row.span.from, row.span.to])])].sort((a, b) => a - b);
    return boundaries.slice(0, -1).map((from, index) => {
      const to = boundaries[index + 1]!;
      return { span: { line, from, to }, layers: orderStack(new Set(local.filter(row => row.span.from < to && from < row.span.to).map(row => row.layer))) };
    });
  });
}

export function drawnBackgrounds(on: ReadonlySet<ToolbarLayer>, source: StateSource): readonly { span: TextSpan; background: Oklch; layers: readonly StackLayer[] }[] {
  return intervals(on).map(row => ({ ...row, background: stackBackground(source, source.neutral.editor, row.layers) }));
}

export function disabledReasonAt(on: ReadonlySet<ToolbarLayer>, layer: ToolbarLayer): { span: Span; reason: 'currentSelection' | 'diffSides' | 'outsideCoverage' } | null {
  for (const row of intervals(togglePlacement(on, layer))) {
    const layers = new Set(row.layers);
    if (covered(layers)) continue;
    const reason = layers.has('lineHighlight') && layers.has('selection') ? 'currentSelection'
      : layers.has('addedLine') && layers.has('removedLine') ? 'diffSides' : 'outsideCoverage';
    return { span: row.span, reason };
  }
  return null;
}

export const enabledAt = (on: ReadonlySet<ToolbarLayer>, layer: ToolbarLayer): boolean => disabledReasonAt(on, layer) === null;

export function placementRatios(source: StateSource, on: ReadonlySet<ToolbarLayer>): readonly { role: typeof STATE_ROLES[number]; ratio: number }[] {
  const backgrounds = drawnBackgrounds(on, source);
  return STATE_ROLES.map(role => {
    const foreground = role === 'comment' ? source.comment : role === 'punctuation' ? source.neutral.textSecondary : source.syntax[role as SyntaxRole];
    const ratios = STATE_TOKENS.filter(token => token.role === role).flatMap(token => backgrounds
      .filter(row => row.span.line === token.span.line && row.span.from < token.span.to && token.span.from < row.span.to)
      .map(row => contrastEmitted(foreground, row.background)));
    return { role, ratio: ratios.length ? Math.min(...ratios) : contrastEmitted(foreground, source.neutral.editor) };
  });
}
