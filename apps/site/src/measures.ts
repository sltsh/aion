import { ACCENT_NAMES, ANSI_ORDER, buildPalette, checks, contrastEmitted, hexToOklch,
  lightPalette, luminance, roundingFlip, roundingShift } from '@sltsh/aion-tokens';
import type { AnsiSlot, Check, NeutralName, Oklch } from '@sltsh/aion-tokens';
import type { Theme } from './theme.js';

export type Scheme = Theme;
export type ShownRole = 'keyword' | 'function' | 'type' | 'string' | 'number' | 'variable' | 'operator' | 'comment';
export type StratumName = 'editor' | 'panel' | 'bars' | 'widgets';

export interface SchemeMeasures {
  readonly syntax: readonly { role: ShownRole; ratio: number }[];
  readonly lowestSyntax: { role: ShownRole; ratio: number };
  readonly strata: readonly { name: StratumName; neutral: NeutralName; ratio: number }[];
  readonly parts: readonly { name: string; stratum: StratumName; ratio: number }[];
  readonly editorExtreme: 'darkest' | 'lightest';
  readonly rounding: { shift: number; flipFrom: number | null };
  readonly terminal: {
    readonly backgrounds: readonly { name: string; oklch: Oklch }[];
    readonly slots: readonly { slot: AnsiSlot; ratios: readonly number[]; exempt: boolean }[];
  };
  readonly counts: { accents: number; ansiSlots: number; terminalBackgrounds: number; syntaxShown: number };
}

const ROLES: readonly ShownRole[] = ['keyword', 'function', 'type', 'string', 'number', 'variable', 'operator', 'comment'];
const STRATA = [
  { name: 'editor', neutral: 'editor' }, { name: 'panel', neutral: 'terminal' },
  { name: 'bars', neutral: 'sidebar' }, { name: 'widgets', neutral: 'widget' },
] as const;
const PARTS: readonly { name: string; stratum: StratumName }[] = [
  { name: 'title bar', stratum: 'bars' }, { name: 'activity bar', stratum: 'bars' },
  { name: 'sidebar', stratum: 'bars' }, { name: 'tabs', stratum: 'bars' },
  { name: 'panel', stratum: 'panel' }, { name: 'status bar', stratum: 'bars' },
  { name: 'find widget', stratum: 'widgets' }, { name: 'hover card', stratum: 'widgets' },
];
const palettes = { dark: buildPalette(), light: lightPalette };
const cache = new Map<Scheme, SchemeMeasures>();
let gate: Check[] | undefined;

const terminalRows = (scheme: Scheme, rows: readonly Check[]): readonly Check[] => rows.filter((row) =>
  scheme === 'dark' ? row.section === 'ansi' && /^ansi\.[a-zA-Z]+$/.test(row.token)
    : row.section === 'light' && /^light ansi\.[a-zA-Z]+(?: on selection)?$/.test(row.token));

export function measures(scheme: Scheme): SchemeMeasures {
  const cached = cache.get(scheme);
  if (cached) return cached;
  const palette = palettes[scheme];
  const editor = palette.neutral.editor;
  const syntax = ROLES.map((role) => ({ role,
    ratio: contrastEmitted(role === 'comment' ? palette.comment : palette.syntax[role], editor) }));
  const strata = STRATA.map((row) => ({ ...row, ratio: contrastEmitted(palette.neutral[row.neutral], editor) }));
  const parts = PARTS.map((row) => ({ ...row, ratio: strata.find((stratum) => stratum.name === row.stratum)!.ratio }));
  const rows = terminalRows(scheme, gate ??= checks());
  const backgrounds = [...new Map(rows.map((row) =>
    [row.surface, { name: row.surface, oklch: hexToOklch(row.surfaceHex) }])).values()];
  const slots = ANSI_ORDER.map((slot) => {
    const prefix = scheme === 'light' ? 'light ' : '';
    const slotRows = rows.filter((row) => row.token === `${prefix}ansi.${slot}`
      || row.token === `light ansi.${slot} on selection`);
    return { slot, ratios: slotRows.map((row) => row.ratio), exempt: slotRows.some((row) => row.state === 'exempt') };
  });
  const otherLuminances = STRATA.slice(1).map((row) => luminance(palette.neutral[row.neutral]));
  const editorLuminance = luminance(editor);
  if (!otherLuminances.every((value) => editorLuminance < value)
    && !otherLuminances.every((value) => editorLuminance > value)) throw new Error('The editor is not an extreme surface');
  const editorExtreme = otherLuminances.every((value) => editorLuminance < value) ? 'darkest' : 'lightest';
  const result: SchemeMeasures = {
    syntax, lowestSyntax: syntax.reduce((lowest, row) => row.ratio < lowest.ratio ? row : lowest),
    strata, parts, editorExtreme,
    rounding: { shift: roundingShift(editor).shift, flipFrom: roundingFlip(palette.comment, editor) },
    terminal: { backgrounds, slots },
    counts: { accents: ACCENT_NAMES.length, ansiSlots: ANSI_ORDER.length,
      terminalBackgrounds: backgrounds.length, syntaxShown: syntax.length },
  };
  cache.set(scheme, result);
  return result;
}

export function measureIsland(): string {
  const inputs = Object.fromEntries(Object.entries(palettes).map(([scheme, palette]) => [scheme, {
    editor: palette.neutral.editor, surfaces: palette.neutral, overlays: palette.overlay,
    washes: palette.diffWash, decoration: palette.decoration, secondaryDecoration: palette.secondaryDecoration,
    accents: palette.accents, comment: palette.comment, figures: measures(scheme as Scheme),
  }]));
  return `<script type="application/json" id="aion-measures">${JSON.stringify(inputs)}</script>`;
}
