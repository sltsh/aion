import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import {
  CONTRAST_FLOOR, NON_TEXT_FLOOR, compositeEmitted, contrastEmitted, hexToOklch,
} from '@sltio/aion-tokens';
import type { Oklch } from '@sltio/aion-tokens';
import { dark, light } from '../src/variables.js';

const read = (name: string): string =>
  readFileSync(new URL(`../css/${name}`, import.meta.url), 'utf8');

const sheet = read('aion.css');
const tailwind = read('aion.theme.css');
const opaque = (value: string): boolean => value.length === 7;

test('both schemes define exactly the same variable names', () => {
  expect(Object.keys(dark()).sort()).toEqual(Object.keys(light()).sort());
});

test('every variable value is a hex colour', () => {
  for (const variables of [dark(), light()]) {
    for (const [name, value] of Object.entries(variables)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
    }
  }
});

test('the stylesheet carries all four scheme selectors', () => {
  expect(sheet).toContain(':root {');
  expect(sheet).toContain('@media (prefers-color-scheme: light)');
  expect(sheet).toContain(':root:not([data-theme])');
  expect(sheet).toContain('[data-theme="light"] {');
  expect(sheet).toContain('[data-theme="dark"] {');
  expect(sheet).toContain('color-scheme: dark;');
  expect(sheet).toContain('color-scheme: light;');
});

test('the committed stylesheet contains every generated variable', () => {
  for (const [name, value] of Object.entries(dark())) expect(sheet, name).toContain(`${name}: ${value};`);
  for (const [name, value] of Object.entries(light())) expect(sheet, name).toContain(`${name}: ${value};`);
});

test('the base layer styles a page that sets no colours of its own', () => {
  for (const selector of ['html {', 'body {', '::selection', '::placeholder', ':focus-visible', 'a {', 'pre {', 'input, textarea, select {', 'button {']) {
    expect(sheet, selector).toContain(selector);
  }
  expect(sheet).toContain('background-color: var(--aion-bg-page)');
  expect(sheet).toContain('color: var(--aion-fg-primary)');
});

// The rule text as it ships, not the variable names the package happens to define. The
// control border was checked through `--aion-border-ui` while the rule used the hairline,
// so the test passed and the field shipped a 1.21:1 edge.
const rule = (selector: string): string => {
  const start = sheet.indexOf(`${selector} {`);
  expect(start, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return sheet.slice(start, sheet.indexOf('}', start));
};

const SURFACES = ['page', 'surface', 'raised', 'input', 'hover'] as const;

const over = (value: string, under: Oklch): Oklch =>
  value.length === 9
    ? compositeEmitted(hexToOklch(value.slice(0, 7)), parseInt(value.slice(7), 16) / 255, under)
    : hexToOklch(value);

// An unlayered element rule beats every layered one, whatever its specificity, so the base
// `button` background won over a Tailwind `bg-bg-raised` utility. Tailwind v4 puts its
// utilities in the `utilities` layer; these have to be in a layer to lose to it.
test('every element rule is inside the base cascade layer', () => {
  const base = sheet.slice(sheet.indexOf('@layer base {'));
  const outside = sheet.slice(0, sheet.indexOf('@layer base {'));
  expect(base, 'the base layer is not emitted').toContain('@layer base {');
  for (const selector of ['html', 'body', '::selection', 'input, textarea, select', 'button']) {
    expect(base, selector).toContain(`${selector} {`);
  }
  // Only the four scheme blocks may sit outside a layer, and they define variables alone.
  const selectors = [...outside.matchAll(/^\s*([^@\s][^{\n]*)\{/gm)].map((m) => m[1]!.trim());
  expect(selectors).toEqual([':root', ':root:not([data-theme])', '[data-theme="light"]', '[data-theme="dark"]']);
});

// A Tailwind alias resolves where it is defined. A plain `@theme` block defines them at
// the root, so a utility inside a nested `[data-theme="light"]` region kept the root's
// dark value. `inline` substitutes the var() into the utility instead.
test('the Tailwind aliases resolve at the element that uses them', () => {
  expect(tailwind).toContain('@theme inline {');
});

// The selection is the one decoration in this sheet that replaces the foreground under it,
// so the pair to measure is its own foreground on it, on every surface it can land on.
test('selected text clears the floor in both schemes', () => {
  expect(rule('::selection')).toContain('color: var(--aion-fg-primary)');
  for (const [name, variables] of [['dark', dark()], ['light', light()]] as const) {
    for (const surface of SURFACES) {
      const background = over(variables['--aion-overlay-selection']!, hexToOklch(variables[`--aion-bg-${surface}`]!));
      const ratio = contrastEmitted(hexToOklch(variables['--aion-fg-primary']!), background);
      expect(ratio, `${name} selected text on bg-${surface} = ${ratio.toFixed(2)}`)
        .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

// The edge of a control a keyboard user has to find, measured on the field it encloses and
// on each surface the field can sit on. A ratio against the page alone is how the light
// border shipped at 2.56:1 against the input it delimits.
test('the control rules use a functional border and clear the non-text floor', () => {
  for (const selector of ['input, textarea, select', 'button[data-variant="secondary"]']) {
    expect(rule(selector), selector).toContain('var(--aion-border-ui)');
  }
  for (const [name, variables] of [['dark', dark()], ['light', light()]] as const) {
    const edge = hexToOklch(variables['--aion-border-ui']!);
    for (const surface of ['input', 'page', 'surface', 'raised'] as const) {
      const ratio = contrastEmitted(edge, hexToOklch(variables[`--aion-bg-${surface}`]!));
      expect(ratio, `${name} border-ui on bg-${surface} = ${ratio.toFixed(2)}`)
        .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    }
  }
});

test('the Tailwind theme maps every colour variable except the overlays', () => {
  for (const name of Object.keys(dark())) {
    const alias = `--color-${name.replace('--aion-', '')}`;
    if (name.startsWith('--aion-overlay')) {
      expect(tailwind, name).not.toContain(`${alias}:`);
      continue;
    }
    expect(tailwind, name).toContain(`${alias}: var(${name});`);
  }
});

test('surfaces stay monotonic in both schemes', () => {
  const order = ['page', 'surface', 'raised', 'input', 'hover'];
  const lightness = (variables: Record<string, string>, name: string): number =>
    hexToOklch(variables[`--aion-bg-${name}`]!)[0];
  const darkValues = order.map((name) => lightness(dark(), name));
  const lightValues = order.map((name) => lightness(light(), name));
  for (let i = 1; i < order.length; i += 1) {
    expect(darkValues[i]!, `dark ${order[i]}`).toBeGreaterThan(darkValues[i - 1]!);
    expect(lightValues[i]!, `light ${order[i]}`).toBeLessThan(lightValues[i - 1]!);
  }
});

test('text and syntax clear the floor on the page in both schemes', () => {
  for (const [name, variables] of [['dark', dark()], ['light', light()]] as const) {
    const page = hexToOklch(variables['--aion-bg-page']!);
    const text = Object.entries(variables).filter(([key]) =>
      key.startsWith('--aion-fg-') || key.startsWith('--aion-syntax-'));
    for (const [key, value] of text) {
      if (key === '--aion-fg-on-accent' || key === '--aion-fg-muted') continue;
      const ratio = contrastEmitted(hexToOklch(value), page);
      expect(ratio, `${name} ${key} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

test('text clears the floor on every surface it can sit on', () => {
  for (const [name, variables] of [['dark', dark()], ['light', light()]] as const) {
    for (const surface of ['page', 'surface', 'raised']) {
      for (const text of ['primary', 'secondary']) {
        const ratio = contrastEmitted(
          hexToOklch(variables[`--aion-fg-${text}`]!),
          hexToOklch(variables[`--aion-bg-${surface}`]!),
        );
        expect(ratio, `${name} fg-${text} on bg-${surface} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
      }
    }
  }
});

test('the focus ring and the UI border clear the non-text floor', () => {
  for (const [name, variables] of [['dark', dark()], ['light', light()]] as const) {
    const page = hexToOklch(variables['--aion-bg-page']!);
    for (const border of ['focus', 'ui']) {
      const value = variables[`--aion-border-${border}`]!;
      if (!opaque(value)) continue;
      const ratio = contrastEmitted(hexToOklch(value), page);
      expect(ratio, `${name} border-${border} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    }
  }
});

test('status text clears the floor on its own subtle fill', () => {
  for (const [name, variables] of [['dark', dark()], ['light', light()]] as const) {
    for (const level of ['success', 'warning', 'error', 'info']) {
      const ratio = contrastEmitted(
        hexToOklch(variables[`--aion-status-${level}-text`]!),
        hexToOklch(variables[`--aion-status-${level}-subtle`]!),
      );
      expect(ratio, `${name} status-${level} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});
