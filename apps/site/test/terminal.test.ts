import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { ANSI_ORDER, buildPalette, lightPalette, contrastEmitted } from '@sltsh/aion-tokens';
import { renderTerminal, terminalCaption } from '../src/render/terminal.js';
import { terminalPairs, SITE_PAIRS } from '../src/pairs.js';
import { measures } from '../src/measures.js';
for (const released of [true, false]) test(`two sessions and16 slots with both ratios/lower bold, released=${released}`, () => {
  const html = renderTerminal({ released });
  expect(html.match(/data-terminal-session=/g)).toHaveLength(4); expect(html.match(/data-terminal-slot=/g)).toHaveLength(32);
  for (const scheme of ['dark', 'light'] as const) {
    const source = scheme === 'dark' ? buildPalette() : lightPalette, figures = measures(scheme).terminal;
    for (const background of figures.backgrounds) expect(html).toContain(background.name);
    for (const slot of figures.slots) {
      const ratios = figures.backgrounds.map(bg => contrastEmitted(source.ansi[slot.slot], bg.oklch));
      expect(ratios).toEqual(slot.ratios);
      expect(html).toContain(`<strong>${Math.min(...ratios).toFixed(2)}</strong>`);
    }
    for (const pair of terminalPairs(source, figures.backgrounds)) expect(contrastEmitted(pair.fg, pair.bg), pair.where).toBeGreaterThanOrEqual(pair.floor);
  }
  expect(html).not.toContain('terminalSelection'); expect(ANSI_ORDER).toHaveLength(16);
});
test('exemption caption follows gate state and names SGR30 honestly', () => {
  expect(terminalCaption(measures('dark').terminal)).toContain('Slot 0'); expect(terminalCaption(measures('dark').terminal)).toContain('SGR 30');
  expect(terminalCaption(measures('light').terminal)).toContain('No slot is exempt');
  expect(terminalCaption(measures('light').terminal)).toContain(Math.min(...measures('light').terminal.slots.flatMap(s => s.ratios)).toFixed(2));
});
test('registers meter/toolbar/background/slot text and responsive slot grid', () => {
  for (const label of ['States meters', 'States toolbar', 'States background label', 'Terminal slot labels']) expect(SITE_PAIRS.some(p => p.where.includes(label))).toBe(true);
  const css = readFileSync(new URL('../src/styles/terminal.css', import.meta.url), 'utf8');
  expect(css).toContain('repeat(8,1fr)'); expect(css).toContain('repeat(4,1fr)'); expect(css).toContain('repeat(2,1fr)');
});
