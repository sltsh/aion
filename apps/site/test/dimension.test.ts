import { expect, test } from 'vitest';
import { dimensionLine } from '../src/render/dimension.js';

test('keys the origin in gold', () => {
  expect(dimensionLine({ x0: 10, y0: 20, x1: 110, y1: 20 })).toContain('d="M0 0H14" stroke="var(--a-gold)"');
  expect(dimensionLine({ x0: 0, y0: 0, x1: 20, y1: 0 })).toContain('d="M0 0H5"');
});
test('cuts the far end at 45 degrees', () => {
  expect(dimensionLine({ x0: 0, y0: 0, x1: 100, y1: 0 })).toContain('d="M96 -4L104 4"');
});
test('sets the label in the gap only when it fits', () => {
  expect(dimensionLine({ x0: 0, y0: 0, x1: 200, y1: 0, label: '4.5:1' })).toContain('text-anchor="middle"');
  expect(dimensionLine({ x0: 0, y0: 0, x1: 20, y1: 0, label: '4.5:1' })).toContain('text-anchor="start"');
  expect(dimensionLine({ x0: 0, y0: 0, x1: 200, y1: 0, label: '4.5:1', gap: false })).toContain('text-anchor="start"');
});
test('uses no hex and escapes labels', () => {
  const fragment = dimensionLine({ x0: 0, y0: 0, x1: 0, y1: 100, label: '<bad>', tone: 'error' });
  expect(fragment).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  expect(fragment).toContain('&lt;bad&gt;');
  expect(fragment).toContain('var(--status-error-text)');
});
