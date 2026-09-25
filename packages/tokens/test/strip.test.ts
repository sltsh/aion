import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { paletteStrip } from '../src/index.js';

test.each(['dark', 'light'] as const)('the committed %s palette strip is the emitted one', (scheme) => {
  const committed = readFileSync(new URL(`../../../assets/palette-${scheme}.svg`, import.meta.url), 'utf8');
  expect(committed, 'run npm run sync:design').toBe(paletteStrip(scheme));
});
