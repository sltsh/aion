import {
  b1, b2, cm, co, fn, kw, nu, op, pn, renderCode, sp, st, ty, va,
} from '@sltsh/aion-lab/render/code';
import type { CodeLine } from '@sltsh/aion-lab/render/code';

// Ordinary code. The lab's sample stacks a diff, a selection, a find match and a word
// highlight on one screen to exercise the gate; a hero shows what a reader actually reads.
export const HERO_SAMPLE: readonly CodeLine[] = [
  { tokens: [cm('// Every colour is solved against the surface it lands on.')] },
  { tokens: [kw('import'), sp(' '), b1('{'), sp(' '), va('contrastEmitted'), sp(' '), b1('}'), sp(' '), kw('from'), sp(' '), st("'@sltsh/aion-tokens'"), pn(';')] },
  { tokens: [] },
  { tokens: [kw('const'), sp(' '), co('FLOOR'), sp(' '), op('='), sp(' '), nu('4.5'), pn(';')] },
  { tokens: [] },
  { tokens: [kw('export'), sp(' '), kw('function'), sp(' '), fn('gate'), b1('('), va('token'), pn(': '), ty('Oklch'), pn(', '), va('surface'), pn(': '), ty('Oklch'), b1(')'), pn(': '), ty('boolean'), sp(' '), b1('{')] },
  { tokens: [sp('  '), kw('const'), sp(' '), va('ratio'), sp(' '), op('='), sp(' '), fn('contrastEmitted'), b2('('), va('token'), pn(', '), va('surface'), b2(')'), pn(';')] },
  { tokens: [sp('  '), kw('return'), sp(' '), va('ratio'), sp(' '), op('>='), sp(' '), co('FLOOR'), pn(';')] },
  { tokens: [b1('}')] },
];

export const renderHero = (): string => renderCode(HERO_SAMPLE);
