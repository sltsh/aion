import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CONTRAST_FLOOR, contrastEmitted, hexToOklch } from '@sltsh/aion-tokens';
import { herdrColours, herdrConfig } from '../src/herdr.js';

const colours = herdrColours();

test('the committed Herdr config matches the generated config', () => {
  const onDisk = readFileSync(new URL('../herdr/aion.toml', import.meta.url), 'utf8');
  expect(onDisk).toBe(herdrConfig());
});

test('every Herdr colour is a six-digit hex', () => {
  for (const [key, value] of Object.entries(colours)) expect(value, key).toMatch(/^#[0-9a-f]{6}$/);
});

test('Herdr text clears the floor on every surface it lands on', () => {
  const surfaces = ['panel_bg', 'sidebar_bg', 'active_row_bg', 'surface0', 'surface1', 'selection_bg'];
  const foregrounds = ['text', 'subtext0', 'overlay0', 'overlay1', 'accent', 'mauve', 'green', 'yellow', 'red', 'blue', 'teal', 'peach'];
  for (const surface of surfaces) {
    for (const foreground of foregrounds) {
      const ratio = contrastEmitted(hexToOklch(colours[foreground]!), hexToOklch(colours[surface]!));
      expect(ratio, `${foreground} on ${surface}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});
