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
  expect(fragment).toContain('dimension-label-error');
});

for (const [x1, y1] of [[200, 20], [-190, 20], [10, 210], [10, -190]]) test(`a label reads upright toward ${x1},${y1}`, () => {
  const markup = dimensionLine({ x0: 10, y0: 20, x1: x1!, y1: y1!, label: '+1.23' });
  const groups = markup.match(/<g[^>]*>[\s\S]*?<\/g>/g)!;
  expect(groups.find(group => group.includes('rotate('))).not.toContain('<text');
  const label = markup.match(/<text[^>]+>/)![0];
  expect(label).toContain(`x="${(10 + x1!) / 2}"`);
  expect(label).toContain(`y="${(20 + y1!) / 2}"`);
  expect(label).not.toContain('transform=');
});
test('label classes own passing and failing tones without presentation fills', () => {
  for (const tone of ['text', 'error'] as const) {
    const label = dimensionLine({x0: 0, y0: 0, x1: 200, y1: 0, label: 'margin', tone}).match(/<text[^>]+>/)![0];
    expect(label).toContain('dimension-label');
    expect(label.includes('dimension-label-error')).toBe(tone === 'error');
    expect(label).not.toContain('fill=');
  }
});

test('a margin shorter than its label uses the no-gap form', () => {
  const fragment=dimensionLine({x0:30,y0:40,x1:28,y1:40,label:'+0.01'});
  expect(fragment).toContain('text-anchor="end"');
  expect(fragment).toContain('x="16" y="40"');
  expect(fragment).toContain('d="M0.5 0H2"');
});
