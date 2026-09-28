import { contrastEmitted, stackBackground, SYNTAX } from '@sltsh/aion-tokens';
import type { AccentName, Oklch, StateSource, SyntaxRole, Palette } from '@sltsh/aion-tokens';
import type { Theme } from '../theme.js';
export const SOLVED_CHIPS: readonly { accent: AccentName; role: SyntaxRole; word: string }[] = [
  { accent: 'gold', role: 'type', word: 'Epoch' }, { accent: 'coral', role: 'variable', word: 'entry' },
  { accent: 'copper', role: 'number', word: '1_440' }, { accent: 'green', role: 'string', word: "'utf8'" },
  { accent: 'teal', role: 'operator', word: '=>' }, { accent: 'blue', role: 'function', word: 'solve' },
  { accent: 'violet', role: 'keyword', word: 'async' },
];
export function probeSurfaces(source: StateSource): readonly { name: string; background: Oklch }[] {
  const editor = source.neutral.editor;
  return [
    { name: 'editor', background: editor },
    { name: 'current line', background: stackBackground(source, editor, ['lineHighlight']) },
    { name: 'selection', background: stackBackground(source, editor, ['selection']) },
    { name: 'word highlight', background: stackBackground(source, editor, ['wordHighlight']) },
    { name: 'selection + word highlight', background: stackBackground(source, editor, ['selection', 'wordHighlight']) },
    { name: 'hover widget', background: source.neutral.widget },
    { name: 'find match', background: source.findMatch.current },
  ];
}
export function worstSurface(colour: Oklch, surfaces: ReturnType<typeof probeSurfaces>): { name: string; ratio: number } {
  return surfaces.reduce((worst, surface) => {
    const ratio = contrastEmitted(colour, surface.background);
    return ratio < worst.ratio ? { name: surface.name, ratio } : worst;
  }, { name: '', ratio: Infinity });
}
export const failDirection = (source: StateSource): 1 | -1 => source.comment[0] > source.neutral.editor[0] ? -1 : 1;
export function floorLimit(base: Oklch, surfaces: ReturnType<typeof probeSurfaces>, direction: 1 | -1, step = 0.0005): number {
  let last = base[0];
  for (let i = 1; i * step <= 1; i += 1) {
    const L = base[0] + i * step * direction;
    if (L < 0 || L > 1 || worstSurface([L, base[1], base[2]], surfaces).ratio < 4.5) break;
    last = L;
  }
  return last;
}
export type ProbeInputs = Record<Theme, StateSource & { accents: Palette['accents'] }>;
export function readProbeInputs(document: Document): ProbeInputs | null {
  const script = document.querySelector<HTMLScriptElement>('#aion-measures');
  if (!script) return null;
  try {
    const raw = JSON.parse(script.textContent ?? '') as Record<Theme, {
      surfaces: StateSource['neutral']; overlays: StateSource['overlay']; washes: StateSource['diffWash'];
      decoration: StateSource['decoration']; secondaryDecoration: StateSource['secondaryDecoration'];
      findMatch: StateSource['findMatch']; comment: Oklch; accents: Palette['accents'];
    }>;
    return Object.fromEntries((['dark', 'light'] as const).map((scheme) => {
      const row = raw[scheme];
      if (!row?.findMatch?.current || !row.accents || !row.surfaces) throw new Error('Missing probe inputs');
      return [scheme, { neutral: row.surfaces, overlay: row.overlays, diffWash: row.washes,
        decoration: row.decoration, secondaryDecoration: row.secondaryDecoration, findMatch: row.findMatch,
        comment: row.comment, accents: row.accents,
        syntax: Object.fromEntries(Object.entries(SYNTAX).map(([role, accent]) => [role, row.accents[accent]])),
      }];
    })) as ProbeInputs;
  } catch { return null; }
}
