import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPalette, contrastEmitted, hexToOklch, lightPalette } from '@sltsh/aion-tokens';
import { variables } from '@sltsh/aion-lab/variables';

const style = (name: string): string => readFileSync(fileURLToPath(new URL(`../src/styles/${name}`, import.meta.url)), 'utf8');
const hover = /@media \(hover: hover\) \{([^@]*(?:\{[^}]*\}[^@]*)*)\}/g;
const inside = (css: string): string => [...css.matchAll(hover)].map(m => m[1]).join('\n');

it('nav and hero actions declare a hover state inside a hover-capable media query', () => {
  const shell = style('shell.css'), hero = style('hero.css');
  const resting = (css: string) => css.replace(hover, '').replace(/@media \(hover: none\) \{[^\n]*\} \}/g, '');
  for (const [css, needle] of [[shell, '.site-nav a:hover'], [shell, '.site-nav a:hover::after'], [hero, '.hero-primary:hover::after'], [hero, '.hero-secondary:hover::after'], [hero, '.diptych .site-nav a:hover']] as const) {
    expect(inside(css), needle).toContain(needle);
    expect(resting(css), `${needle} outside a hover query`).not.toContain(needle);
  }
  expect(inside(shell)).toMatch(/\.site-nav a:hover::after \{ transform: scaleX\(1\); \}/);
  expect(shell).toMatch(/\.site-nav a:focus-visible::after/);
  expect(hero).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{ \.hero-primary::after, \.hero-secondary::after \{ transition: opacity var\(--slt-motion-feedback, 160ms\)/);
  expect(hero.split('\n').filter(l => /::after/.test(l))).not.toContainEqual(expect.stringMatching(/box-shadow/));
});

it('hero hover foreground reads on its hover background in both schemes', () => {
  const hero = style('hero.css');
  expect(hero).toMatch(/\.hero-primary::after \{[^}]*background: var\(--n-editor\)/);
  expect(hero).toMatch(/\.hero-secondary::after \{[^}]*background: var\(--a-gold\)/);
  for (const palette of [buildPalette(), lightPalette]) {
    const v = variables(palette), c = (fg: string, bg: string) => contrastEmitted(hexToOklch(v[fg]!), hexToOklch(v[bg]!));
    expect(c('--n-editor', '--a-gold'), 'primary label on its fill, unchanged on hover').toBeGreaterThanOrEqual(4.5);
    expect(c('--n-editor', '--a-gold'), 'primary hover edge on the fill').toBeGreaterThanOrEqual(3);
    expect(c('--n-text-primary', '--n-editor'), 'secondary label').toBeGreaterThanOrEqual(4.5);
    expect(c('--a-gold', '--n-editor'), 'secondary hover edge on the editor').toBeGreaterThanOrEqual(3);
  }
});
