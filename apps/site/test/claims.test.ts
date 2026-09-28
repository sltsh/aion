import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { renderClaims } from '../src/render/claims.js';
import { measures } from '../src/measures.js';
import { CONTENT } from '../src/content.js';

for (const released of [false, true]) test(`renders six numbered claim cards in order without install (${released})`, () => {
  const html = renderClaims({ released });
  const ids = [...html.matchAll(/class="claim-card" href="#([a-z]+)"/g)].map((match) => match[1]);
  expect(ids).toEqual(['depth', 'solved', 'rounded', 'states', 'terminal', 'palette']);
  for (const scheme of ['dark', 'light'] as const) {
    const figures = measures(scheme);
    expect(html).toContain(`data-theme-value="${scheme}">${figures.lowestSyntax.ratio.toFixed(2)}:1`);
    expect(html).toContain(`data-theme-value="${scheme}">${figures.rounding.shift.toFixed(2)}`);
    expect(html).toContain(`${figures.counts.ansiSlots} × ${figures.counts.terminalBackgrounds}`);
    expect(html).toContain(`data-theme-value="${scheme}">${figures.counts.syntaxShown}`);
    expect(html).toContain(CONTENT.claims.extremes[figures.editorExtreme].sentence);
  }
});
test('every card figure moves on hover only when motion is allowed', () => {
  const css = readFileSync(new URL('../src/styles/claims.css', import.meta.url), 'utf8');
  expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
  expect(css).toContain('.claim-card:hover .claim-visual');
  expect(css.slice(0, css.indexOf('@media (prefers-reduced-motion: no-preference)'))).not.toContain('transition:');
});

 test('claims use the D8 three/two/one grid with flexible tracks and figures', () => {
  const css = readFileSync(new URL('../src/styles/claims.css', import.meta.url), 'utf8');
  expect(css).toContain('repeat(3,minmax(0,1fr))');
  expect(css).toContain('@media (max-width: 1099px)');
  expect(css).toContain('repeat(2,minmax(0,1fr))');
  expect(css).toContain('@media (max-width: 599px)');
  expect(css).toContain('grid-template-columns:minmax(0,1fr)');
  expect(css).toContain('.claim-visual svg{display:block;width:100%');
  expect(css).toContain('min-width:0;display:flex');
});
