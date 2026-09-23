import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { formatHex } from 'culori';
import {
  CONTRAST_FLOOR, NON_TEXT_FLOOR, compositeEmitted, contrastEmitted, hex,
  distanceEmitted, hexToOklch, lightNeutral, obsidianLightActiveRow,
  obsidianLightHighlight, obsidianLightSelection,
} from '@sltsh/aion-tokens';
import { dark, light } from '@sltsh/aion-css';
import { obsidianColors, themeCss } from '../src/theme.js';

const css = readFileSync(new URL('../../../theme.css', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../../manifest.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const colors = [obsidianColors('dark'), obsidianColors('light')];

const ratio = (foreground: string, background: string): number =>
  contrastEmitted(hexToOklch(foreground), hexToOklch(background));

const resolved = (scheme: 'dark' | 'light', name: string): string => {
  const variables = obsidianColors(scheme);
  const gold = (scheme === 'dark' ? dark() : light())['--aion-gold-solid']!;
  if (name === '--color-accent') return gold;
  if (name === '--color-accent-1' || name === '--color-accent-2') {
    const step = name.endsWith('-1') ? 1 : 2;
    const hue = Number(variables['--accent-h']);
    const saturation = Number.parseFloat(variables['--accent-s']!) / 100;
    const lightness = Number.parseFloat(variables['--accent-l']!) / 100;
    const adjustment = scheme === 'light'
      ? step === 1 ? [1, 1.01, 1.075] : [3, 1.02, 1.15]
      : step === 1 ? [3, 1.02, 1.15] : [5, 1.05, 1.29];
    return formatHex({
      mode: 'hsl', h: hue - adjustment[0]!,
      s: Math.min(1, saturation * adjustment[1]!),
      l: Math.min(1, lightness * adjustment[2]!),
    });
  }
  const value = variables[name]!;
  const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  return reference ? resolved(scheme, reference[1]!) : value;
};

test('the installable sheet is generated from both Aion variants', () => {
  expect(css).toBe(themeCss());
  expect(css).toContain('.theme-dark {');
  expect(css).toContain('.theme-light {');
  expect(Object.keys(colors[0]!).sort()).toEqual(Object.keys(colors[1]!).sort());
  expect(css).not.toMatch(/@import|url\(/);
  expect(css).not.toMatch(/!important/);
  for (const scheme of colors) {
    for (const [name, value] of Object.entries(scheme)) {
      if (name === '--accent-h') expect(value, name).toMatch(/^\d+(\.\d+)?$/);
      else if (name === '--accent-s' || name === '--accent-l') expect(value, name).toMatch(/^\d+(\.\d+)?%$/);
      else if (name === '--link-unresolved-opacity') expect(value).toBe('1');
      else if (name === '--link-unresolved-decoration-style') expect(value).toBe('dashed');
      else if (name === '--input-shadow') expect(value).toBe('inset 0 0 0 1px var(--background-modifier-border-hover)');
      else if (name === '--input-shadow-hover') expect(value).toBe('inset 0 0 0 1px var(--aion-obsidian-hover-edge)');
      else expect(value, name).toMatch(/^(#[0-9a-f]{6}([0-9a-f]{2})?|var\(--[a-z0-9-]+\))$/);
      expect(css).toContain(`${name}: ${value};`);
    }
  }
});

test.each(['dark', 'light'] as const)('%s lets Obsidian derive the chosen accent', (scheme) => {
  const c = obsidianColors(scheme);
  const gold = (scheme === 'dark' ? dark() : light())['--aion-gold-solid']!;
  expect(formatHex({
    mode: 'hsl',
    h: Number(c['--accent-h']),
    s: Number.parseFloat(c['--accent-s']!) / 100,
    l: Number.parseFloat(c['--accent-l']!) / 100,
  })).toBe(gold);
  for (const name of ['--color-accent', '--color-accent-1', '--color-accent-2']) {
    expect(c).not.toHaveProperty(name);
  }
  expect(c['--interactive-accent']).toBe('var(--color-accent)');
  expect(c['--interactive-accent-hover']).toBe('var(--color-accent-1)');
  expect(c['--text-accent']).toBe('var(--color-accent)');
  expect(c['--checkbox-color']).toBe('var(--interactive-accent)');
});

test('the manifest describes a community theme release', () => {
  expect(manifest).toMatchObject({ name: 'Aion', version: packageManifest.version, minAppVersion: '1.13.0' });
  expect(manifest).toHaveProperty('author');
});

test.each(['dark', 'light'] as const)('%s reading pairs clear the emitted contrast floor', (scheme) => {
  const c = obsidianColors(scheme);
  const pairs = [
    ['--text-normal', '--background-primary'],
    ['--text-normal', '--background-secondary'],
    ['--text-normal', '--modal-background'],
    ['--text-muted', '--background-secondary'],
    ['--text-faint', '--modal-background'],
    ['--text-faint', '--background-modifier-hover'],
    ['--text-accent', '--background-primary'],
    ['--nav-item-color-active', '--nav-item-background-active'],
    ['--text-on-accent', '--interactive-accent'],
    ['--text-on-accent', '--interactive-accent-hover'],
    ['--text-accent-hover', '--background-primary'],
    ['--text-on-accent', '--background-modifier-error'],
    ['--text-on-accent', '--background-modifier-error-hover'],
    ['--text-on-accent', '--background-modifier-success'],
    ['--link-unresolved-color', '--background-primary'],
    ['--code-normal', '--code-background'],
    ['--code-comment', '--code-background'],
    ['--code-function', '--code-background'],
    ['--code-keyword', '--code-background'],
    ['--code-property', '--code-background'],
    ['--code-string', '--code-background'],
    ['--code-value', '--code-background'],
    ['--code-important', '--code-background'],
    ['--code-operator', '--code-background'],
    ['--code-punctuation', '--code-background'],
    ['--code-tag', '--code-background'],
  ] as const;
  for (const [foreground, background] of pairs) {
    const measured = ratio(resolved(scheme, foreground), resolved(scheme, background));
    expect(measured, `${scheme} ${foreground} on ${background}: ${measured.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }

  const selection = c['--text-selection']!;
  if (scheme === 'light') {
    expect(selection).toBe(hex(obsidianLightSelection));
    expect(c['--text-highlight-bg']).toBe(hex(obsidianLightHighlight));
  }
  const selected = selection.length === 9
    ? compositeEmitted(hexToOklch(selection.slice(0, 7)), parseInt(selection.slice(7), 16) / 255,
      hexToOklch(c['--background-primary']!))
    : hexToOklch(selection);
  expect(contrastEmitted(hexToOklch(c['--text-normal']!), selected), `${scheme} selected text`)
    .toBeGreaterThanOrEqual(CONTRAST_FLOOR);

  const codeSelection = selection.length === 9
    ? compositeEmitted(hexToOklch(selection.slice(0, 7)), parseInt(selection.slice(7), 16) / 255,
      hexToOklch(c['--code-background']!))
    : hexToOklch(selection);
  for (const foreground of ['--code-normal', '--code-comment', '--code-function', '--code-keyword',
    '--code-property', '--code-string', '--code-value', '--code-important', '--code-operator',
    '--code-punctuation', '--code-tag']) {
    const color = hexToOklch(c[foreground]!);
    const selectedRatio = contrastEmitted(color, codeSelection);
    const matchRatio = contrastEmitted(color, hexToOklch(c['--text-highlight-bg']!));
    expect(selectedRatio, `${scheme} ${foreground} on selected code: ${selectedRatio.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    expect(matchRatio, `${scheme} ${foreground} on search match: ${matchRatio.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }

  for (const background of ['--background-modifier-form-field', '--modal-background']) {
    const measured = ratio(c['--background-modifier-border-focus']!, c[background]!);
    expect(measured, `${scheme} focus edge on ${background}: ${measured.toFixed(2)}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test.each(['dark', 'light'] as const)('%s Obsidian 1.13.7 consumer pairs and defaults', (scheme) => {
  const c = obsidianColors(scheme);
  const page = resolved(scheme, '--background-primary');
  for (const name of [
    '--callout-quote', '--color-red', '--color-orange', '--color-green',
    '--color-cyan', '--color-blue', '--color-purple',
  ]) {
    const title = hexToOklch(c[name]!);
    const tint = compositeEmitted(title, 0.1, hexToOklch(page));
    expect(contrastEmitted(title, tint), `${scheme} ${name} title`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
  expect(c['--link-unresolved-opacity']).toBe('1');
  expect(c['--link-unresolved-decoration-style']).toBe('dashed');
  for (const name of [
    '--callout-quote', '--link-unresolved-opacity', '--background-modifier-warning',
    '--input-shadow', '--input-shadow-hover', '--prompt-background',
  ]) expect(c).toHaveProperty(name);
  expect(c['--background-modifier-active-hover']).not.toBe(c['--background-modifier-hover']);
  const canvasLight = resolved(scheme, '--aion-obsidian-canvas-label-light');
  const canvasDark = resolved(scheme, '--aion-obsidian-canvas-label-dark');
  expect(hexToOklch(canvasLight)[0]).toBeGreaterThan(hexToOklch(canvasDark)[0]);
  expect(ratio(scheme === 'dark' ? canvasDark : canvasLight, c['--color-yellow']!))
    .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  expect(css).toContain('mod-foreground-light {\n  color: var(--aion-obsidian-canvas-label-light);');
  expect(css).toContain('mod-foreground-dark {\n  color: var(--aion-obsidian-canvas-label-dark);');
  expect(c['--color-pink']).not.toBe(c['--color-red']);
  expect(c['--prompt-background']).toBe(c['--modal-background']);
  const fieldEdge = c['--background-modifier-border-hover']!;
  expect(css).toContain('input[type="text"], input[type="search"]');
  expect(css).toContain('):not(:hover):not(:focus):not(:active)');
  expect(css).toContain('border-color: var(--background-modifier-border-hover);');
  for (const surface of ['--background-modifier-form-field', '--background-primary', '--modal-background']) {
    expect(ratio(fieldEdge, c[surface]!), `${scheme} field edge on ${surface}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
  const hoverEdge = c['--aion-obsidian-hover-edge']!;
  for (const surface of ['--interactive-hover', '--modal-background']) {
    expect(ratio(hoverEdge, c[surface]!), `${scheme} button hover edge on ${surface}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test('Light selection, highlight and Dark code retain visible surface separation', () => {
  const light = obsidianColors('light');
  const dark = obsidianColors('dark');
  for (const surface of ['--background-primary', '--code-background']) {
    const separation = distanceEmitted(hexToOklch(light['--text-selection']!), hexToOklch(light[surface]!));
    expect(separation, `selection against ${surface}`).toBeGreaterThanOrEqual(0.04);
  }
  expect(distanceEmitted(hexToOklch(light['--text-highlight-bg']!), lightNeutral.page)).toBeGreaterThanOrEqual(0.08);
  for (const text of ['--text-normal', '--link-color']) {
    expect(ratio(light[text]!, light['--text-highlight-bg']!)).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
  expect(distanceEmitted(hexToOklch(dark['--code-background']!), hexToOklch(dark['--background-primary']!)))
    .toBeGreaterThanOrEqual(0.05);
  expect(light['--text-highlight-bg']).not.toBe(light['--tag-background']);
  expect(light['--nav-item-background-active']).toBe(hex(obsidianLightActiveRow));
  expect(light['--nav-item-background-active']).not.toBe(light['--tag-background']);
  expect(distanceEmitted(hexToOklch(light['--nav-item-background-active']!), lightNeutral.surface))
    .toBeGreaterThanOrEqual(0.06);
  expect(light['--color-base-05']).not.toBe(light['--color-base-10']);
});
