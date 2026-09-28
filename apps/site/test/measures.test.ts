import { expect, test } from 'vitest';
import { ACCENT_NAMES, ANSI_ORDER, buildPalette, checks, contrastEmitted, hexToOklch,
  lightPalette, luminance, roundingShift } from '@sltsh/aion-tokens';
import { dark, light } from '@sltsh/aion-css';
import { variables } from '@sltsh/aion-lab/variables';
import { measures, measureIsland } from '../src/measures.js';
import { SITE_PAIRS } from '../src/pairs.js';
import { schemeStyles } from '../src/scheme.js';

for (const scheme of ['dark', 'light'] as const) {
  const palette = scheme === 'dark' ? buildPalette() : lightPalette;
  test(`measures every syntax figure with contrastEmitted in ${scheme}`, () => {
    const result = measures(scheme);
    expect(result.syntax.map((row) => row.role)).toEqual(
      ['keyword', 'function', 'type', 'string', 'number', 'variable', 'operator', 'comment']);
    for (const row of result.syntax) expect(row.ratio).toBe(contrastEmitted(
      row.role === 'comment' ? palette.comment : palette.syntax[row.role], palette.neutral.editor));
    expect(result.lowestSyntax.ratio).toBe(Math.min(...result.syntax.map((row) => row.ratio)));
  });
  test(`names the editor as the extreme surface in ${scheme}`, () => {
    const result = measures(scheme);
    const editor = luminance(palette.neutral.editor);
    expect(result.editorExtreme).toBe(scheme === 'dark' ? 'darkest' : 'lightest');
    for (const row of result.strata.slice(1)) {
      if (scheme === 'dark') expect(editor).toBeLessThan(luminance(palette.neutral[row.neutral]));
      else expect(editor).toBeGreaterThan(luminance(palette.neutral[row.neutral]));
    }
  });
  test(`reads terminal backgrounds and exemptions from the gate in ${scheme}`, () => {
    const rows = checks().filter((row) => ANSI_ORDER.some((slot) => scheme === 'dark'
      ? row.section === 'ansi' && row.token === `ansi.${slot}`
      : row.section === 'light' && (row.token === `light ansi.${slot}` || row.token === `light ansi.${slot} on selection`)));
    const result = measures(scheme).terminal;
    expect(result.backgrounds).toEqual([...new Map(rows.map((row) =>
      [row.surface, { name: row.surface, oklch: hexToOklch(row.surfaceHex) }])).values()]);
    for (const slot of result.slots) {
      const matching = rows.filter((row) => row.token === `${scheme === 'light' ? 'light ' : ''}ansi.${slot.slot}`
        || row.token === `light ansi.${slot.slot} on selection`);
      expect(slot.ratios).toEqual(matching.map((row) => row.ratio));
      expect(slot.exempt).toBe(matching.some((row) => row.state === 'exempt'));
      if (scheme === 'light') expect(slot.exempt).toBe(false);
    }
  });
  test(`takes rounding figures and counts from the tokens in ${scheme}`, () => {
    const result = measures(scheme);
    expect(result.rounding.shift).toBe(roundingShift(palette.neutral.editor).shift);
    expect(measures(scheme)).toBe(result);
    expect(result.counts).toEqual({ accents: ACCENT_NAMES.length, ansiSlots: ANSI_ORDER.length,
      terminalBackgrounds: result.terminal.backgrounds.length, syntaxShown: result.syntax.length });
  });
  test(`every site text pair passes in ${scheme}`, () => {
    const values = { ...(scheme === 'dark' ? dark() : light()), ...variables(palette) };
    for (const pair of SITE_PAIRS) expect(contrastEmitted(
      hexToOklch(values[pair.fg]!), hexToOklch(values[pair.bg]!)), pair.where).toBeGreaterThanOrEqual(pair.floor);
  });
}

test('ships OKLCH inputs, never hex, in the measures island', () => {
  const island = measureIsland();
  expect(island).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  const data = JSON.parse(island.replace(/^<script[^>]*>|<\/script>$/g, ''));
  expect(data.dark.editor).toEqual(buildPalette().neutral.editor);
  expect(data.light.editor).toEqual(lightPalette.neutral.editor);
  expect(data.dark.overlays).toEqual(buildPalette().overlay);
});

test('scheme styles cover explicit schemes and the system fallback without element rules', () => {
  const styles = schemeStyles();
  expect(styles).toContain(':root[data-theme="dark"], [data-theme="dark"]');
  expect(styles).toContain(':root[data-theme="light"], [data-theme="light"]');
  expect(styles).toContain('@media (prefers-color-scheme: light)');
  expect(styles).toContain(':root:not([data-theme])');
  for (const [name, value] of Object.entries(variables(buildPalette()))) expect(styles).toContain(`${name}: ${value};`);
  for (const [name, value] of Object.entries(variables(lightPalette))) expect(styles).toContain(`${name}: ${value};`);
});
