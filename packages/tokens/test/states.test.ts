import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { LIGHT_SHIPPED, hex, readingStates } from '../src/index.js';

const snapshot = (light: boolean): string => {
  const rows = readingStates(light ? LIGHT_SHIPPED : undefined)
    .map(({ name, background }) => [name, hex(background)]);
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
};

test('Task 0 leaves the reading states untouched', () => {
  expect(snapshot(false)).toBe('feb8a9586c10c0fd67f6995888748aa9904e9eb28676b1212afaa89f1ea4dc93');
  expect(snapshot(true)).toBe('e40cd0d692c4cdd428287575f776bda05e2d5c9827ede6bb607120d70b01f1e6');
});
