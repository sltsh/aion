import { describe, expect, it } from 'vitest';
import { contrastEmitted, covered, LIGHT_SHIPPED, orderStack, SHIPPED, stackBackground } from '@sltsh/aion-tokens';
import type { SyntaxRole } from '@sltsh/aion-tokens';
import { STATE_SAMPLE } from '../src/content.js';
import { STATE_ROLES } from '../src/chapters/stack.js';
import { disabledReasonAt, drawnBackgrounds, enabledAt, expandSpan, PLACEMENT, placementRatios, STATE_IDENTIFIER, STATE_SEARCH, STATE_TOKENS, togglePlacement, TOOLBAR } from '../src/chapters/placement.js';
import type { Span, ToolbarLayer } from '../src/chapters/placement.js';

const lines = STATE_SAMPLE.map(line => line.map(([, text]) => text).join(''));
const empty = new Set<ToolbarLayer>();
const textAt = (span: Span): string => lines[span.line]!.slice(span.from ?? 0, span.to ?? lines[span.line]!.length);
const occurrences = (term: string): Span[] => lines.flatMap((text, line) => [...text.matchAll(new RegExp(`\\b${term}\\b`, 'g'))].map(match => ({ line, from: match.index, to: match.index + term.length })));
const intersects = (a: Span, b: Span): boolean => {
  const left = expandSpan(a); const right = expandSpan(b);
  return left.line === right.line && left.from < right.to && right.from < left.to;
};

describe('States placements', () => {
  it('uses real repeated identifiers, search matches and a matching bracket pair', () => {
    expect(STATE_IDENTIFIER).toBe('entry');
    expect(STATE_SEARCH).toBe('cache');
    expect(occurrences('entry')).toHaveLength(3);
    expect(occurrences('cache')).toHaveLength(4);
    expect(PLACEMENT.wordHighlight).toEqual(occurrences('entry'));
    expect(PLACEMENT.findMatchOther).toEqual(occurrences('cache'));
    expect(PLACEMENT.bracketMatch.map(textAt)).toEqual(['(', ')']);
    expect(PLACEMENT.bracketMatch[0]!.line).toBe(PLACEMENT.bracketMatch[1]!.line);
    expect(textAt({ line: 1, from: PLACEMENT.bracketMatch[0]!.to, to: PLACEMENT.bracketMatch[1]!.from })).toBe('id');
    expect(PLACEMENT.lineHighlight).toEqual([{ line: 1 }]);
    expect(PLACEMENT.addedLine).toEqual([{ line: 2 }]);
    expect(PLACEMENT.removedLine).toEqual([{ line: 3 }]);
    expect(PLACEMENT.addedWord.map(textAt)).toEqual(['next']);
    expect(PLACEMENT.removedWord.map(textAt)).toEqual(['prev']);
    for (const [word, line] of [['addedWord', 'addedLine'], ['removedWord', 'removedLine']] as const) {
      expect(PLACEMENT[word].every(span => PLACEMENT[line].some(under => intersects(span, under)))).toBe(true);
    }
  });

  it('expands merge headers separately and bodies without mergeChangeWord', () => {
    const drawn = drawnBackgrounds(togglePlacement(empty, 'mergeConflict'), SHIPPED);
    expect(drawn.filter(row => row.layers.length).map(row => [textAt(row.span), row.layers])).toEqual([
      ['<<<<<<< current', ['mergeCurrentHeader']],
      ['return local;', ['mergeChange']],
      ['||||||| common', ['mergeCommonHeader']],
      ['return base;', ['mergeChange']],
      ['return remote;', ['mergeChange']],
      ['>>>>>>> incoming', ['mergeIncomingHeader']],
    ]);
    expect(drawn.find(row => row.span.line === 8)!.layers).toEqual([]);
  });

  it('paints every toggle only on its placements, including prerequisite diff lines', () => {
    for (const layer of TOOLBAR) {
      const on = togglePlacement(empty, layer);
      const drawn = drawnBackgrounds(on, SHIPPED);
      for (const row of drawn) {
        const expected = [...on].filter(name => PLACEMENT[name].some(span => intersects(span, row.span)));
        if (layer !== 'mergeConflict') expect(row.layers).toEqual(orderStack(new Set(expected.filter((name): name is Exclude<ToolbarLayer, 'mergeConflict'> => name !== 'mergeConflict'))));
        expect(row.background).toEqual(stackBackground(SHIPPED, SHIPPED.neutral.editor, row.layers));
      }
      for (const [line, text] of lines.entries()) {
        const intervals = drawn.filter(row => row.span.line === line);
        expect(intervals[0]!.span.from).toBe(0);
        expect(intervals.at(-1)!.span.to).toBe(text.length);
        for (let i = 1; i < intervals.length; i++) expect(intervals[i]!.span.from).toBe(intervals[i - 1]!.span.to);
      }
    }
  });

  it('keeps disjoint combinations legal and rejects unsupported overlaps with the failing span', () => {
    const diff = togglePlacement(togglePlacement(empty, 'addedLine'), 'removedLine');
    expect(covered(new Set(['addedLine', 'removedLine']))).toBe(false);
    expect(enabledAt(new Set(['addedLine']), 'removedLine')).toBe(true);
    expect(drawnBackgrounds(diff, SHIPPED).every(row => covered(new Set(row.layers)))).toBe(true);
    expect(enabledAt(new Set(['mergeConflict']), 'findRange')).toBe(true);
    expect(disabledReasonAt(new Set(['lineHighlight']), 'selection')).toEqual({ span: { line: 1, from: 6, to: 11 }, reason: 'currentSelection' });
    const bracketFailure = disabledReasonAt(new Set(['findRange']), 'bracketMatch');
    expect(bracketFailure?.reason).toBe('outsideCoverage');
    expect(textAt(bracketFailure!.span)).toBe('(');
    expect(enabledAt(new Set(['bracketMatch']), 'bracketMatch')).toBe(true);
    expect(disabledReasonAt(new Set(['bracketMatch']), 'bracketMatch')).toBeNull();
  });

  it('preserves immutable toggles and nested diff dependencies', () => {
    const on = new Set<ToolbarLayer>(['selection']);
    const next = togglePlacement(on, 'addedWord');
    expect([...on]).toEqual(['selection']);
    expect([...next]).toEqual(['selection', 'addedWord', 'addedLine']);
    expect([...togglePlacement(next, 'addedWord')]).toEqual(['selection', 'addedLine']);
    expect([...togglePlacement(next, 'addedLine')]).toEqual(['selection']);
    const removed = togglePlacement(empty, 'removedWord');
    expect(removed.has('removedLine')).toBe(true);
    expect([...togglePlacement(removed, 'removedLine')]).toEqual([]);
  });

  it('allows every new toggle alone and covers every reachable interval in both schemes', () => {
    const seen = new Set<string>(['']);
    const queue = [empty];
    for (let index = 0; index < queue.length; index++) {
      const on = queue[index]!;
      for (const source of [SHIPPED, LIGHT_SHIPPED]) {
        expect(drawnBackgrounds(on, source).every(row => covered(new Set(row.layers)))).toBe(true);
      }
      for (const layer of TOOLBAR) {
        if (!enabledAt(on, layer)) continue;
        const next = togglePlacement(on, layer);
        const key = TOOLBAR.filter(name => next.has(name)).join(',');
        if (!seen.has(key)) { seen.add(key); queue.push(next); }
      }
    }
    for (const layer of ['bracketMatch', 'findRange', 'mergeConflict'] as const) expect(enabledAt(empty, layer)).toBe(true);
    expect(seen.size).toBeGreaterThan(100);
  });

  it('measures each role only where its own tokens intersect painted intervals', () => {
    for (const source of [SHIPPED, LIGHT_SHIPPED]) {
      for (const on of [empty, new Set<ToolbarLayer>(['addedLine', 'addedWord', 'removedLine', 'removedWord', 'wordHighlight', 'findMatchOther']), new Set<ToolbarLayer>(['mergeConflict', 'findRange'])]) {
        const backgrounds = drawnBackgrounds(on, source);
        const actual = placementRatios(source, on);
        for (const role of STATE_ROLES) {
          const foreground = role === 'comment' ? source.comment : role === 'punctuation' ? source.neutral.textSecondary : source.syntax[role as SyntaxRole];
          let ratios: number[] = [];
          STATE_SAMPLE.forEach((line, lineIndex) => {
            let from = 0;
            for (const [tokenRole, text] of line) {
              const to = from + text.length;
              if (tokenRole === role) ratios.push(...backgrounds.filter(row => row.span.line === lineIndex && row.span.from! < to && from < row.span.to!).map(row => contrastEmitted(foreground, row.background)));
              from = to;
            }
          });
          if (!ratios.length) ratios = [contrastEmitted(foreground, source.neutral.editor)];
          expect(actual.find(row => row.role === role)!.ratio).toBe(Math.min(...ratios));
          if (!on.size) expect(actual.find(row => row.role === role)!.ratio).toBe(contrastEmitted(foreground, source.neutral.editor));
        }
      }
    }
    expect(STATE_TOKENS.map(token => token.text).join('')).toBe(lines.join(''));
  });
});
