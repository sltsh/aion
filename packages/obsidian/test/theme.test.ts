import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  CONTRAST_FLOOR, NON_TEXT_FLOOR, compositeEmitted, contrastEmitted, hex, hexAlpha,
  hexToOklch, lightFindMatch, lightOverlay,
} from '@sltsh/aion-tokens';
import { obsidianColors, themeCss } from '../src/theme.js';

const css = readFileSync(new URL('../../../theme.css', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../../manifest.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const colors = [obsidianColors('dark'), obsidianColors('light')];

const ratio = (foreground: string, background: string): number =>
  contrastEmitted(hexToOklch(foreground), hexToOklch(background));

test('the installable sheet is generated from both Aion variants', () => {
  expect(css).toBe(themeCss());
  expect(css).toContain('.theme-dark {');
  expect(css).toContain('.theme-light {');
  expect(Object.keys(colors[0]!).sort()).toEqual(Object.keys(colors[1]!).sort());
  expect(css).not.toMatch(/@import|url\(/);
  expect(css).not.toMatch(/!important/);
  for (const scheme of colors) {
    for (const [name, value] of Object.entries(scheme)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
      expect(css).toContain(`${name}: ${value};`);
    }
  }
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
    ['--text-accent', '--background-primary'],
    ['--nav-item-color-active', '--nav-item-background-active'],
    ['--text-on-accent', '--interactive-accent'],
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
    const measured = ratio(c[foreground]!, c[background]!);
    expect(measured, `${scheme} ${foreground} on ${background}: ${measured.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }

  const selection = c['--text-selection']!;
  if (scheme === 'light') {
    expect(selection).toBe(hexAlpha(lightOverlay.selection.color, lightOverlay.selection.alpha));
    expect(c['--text-highlight-bg']).toBe(hex(lightFindMatch.current));
  }
  const selected = selection.length === 9
    ? compositeEmitted(hexToOklch(selection.slice(0, 7)), parseInt(selection.slice(7), 16) / 255,
      hexToOklch(c['--background-primary']!))
    : hexToOklch(selection);
  expect(contrastEmitted(hexToOklch(c['--text-normal']!), selected), `${scheme} selected text`)
    .toBeGreaterThanOrEqual(CONTRAST_FLOOR);

  const codeSelection = compositeEmitted(
    hexToOklch(selection.slice(0, 7)), parseInt(selection.slice(7), 16) / 255,
    hexToOklch(c['--code-background']!),
  );
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
