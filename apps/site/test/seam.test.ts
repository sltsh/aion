import { expect, test } from 'vitest';
import { FLICK, MAGNET, commitsOnRelease, normalSpeed, restingShare, glide, settle, releaseVelocity, keyStep, seamGeometry, shareAt, inGrabBand } from '../src/hero/seam.js';

test('release commits at the normal flick speed even with a short projection', () => {
  const v = FLICK * Math.SQRT2 / (1440 + 900);
  expect(normalSpeed(v, 1440, 900)).toBe(FLICK);
  expect(settle(0.42 + v * 320)).toBeLessThan(1);
  expect(commitsOnRelease(0.42, v, 1440, 900)).toBe(true);
  expect(commitsOnRelease(0.42, v * 0.99, 1440, 900)).toBe(false);
  expect(commitsOnRelease(0.42, v, 390, 500)).toBe(false);
});
test('backward releases never commit, and their far-magnet rest stays inside', () => {
  expect(commitsOnRelease(0.42, -0.1, 1440, 900)).toBe(false);
  expect(commitsOnRelease(0.99, -0.00001, 1440, 900)).toBe(false);
  expect(restingShare(0.99, -0.00001)).toBe(1 - MAGNET);
  expect(commitsOnRelease(0.96, 0, 1440, 900)).toBe(true);
  expect(restingShare(0.02, 0)).toBe(0);
  expect(restingShare(0.42, -0.001)).toBeCloseTo(0.1, 12);
  expect(restingShare(0.42, -0.1)).toBe(0);
  expect(restingShare(0.42, 0.1)).toBe(1 - MAGNET);
});

test('glide follows the exponential displacement and initial velocity', () => {
  const curve = glide(10, -0.2);
  expect(curve(0)).toBe(10);
  expect(curve(3200)).toBeCloseTo(10 - 0.2 * 320, 2);
  expect((curve(0.001) - curve(0)) / 0.001).toBeCloseTo(-0.2, 5);
});
test('magnetic ends take only the last six percent', () => {
  expect([0.95, 0.93, 0.05, 0.07].map(settle)).toEqual([1, 0.93, 0, 0.07]);
});
test('velocity reads only the last 90ms and keeps its sign', () => {
  expect(releaseVelocity([[0, 900], [110, 40], [150, 20]], 160)).toBe(-0.5);
  expect(releaseVelocity([[110, 40], [150, 20]], 160)).toBe(-0.5);
  expect(releaseVelocity([[0, 900]], 160)).toBe(0);
});
test('keyboard steps clamp and ignore unrelated keys', () => {
  const changes = { ArrowLeft: 0.05, ArrowUp: 0.05, ArrowRight: -0.05, ArrowDown: -0.05, PageUp: 0.25, PageDown: -0.25 };
  for (const p of [0, 0.5, 1]) {
    for (const [key, delta] of Object.entries(changes)) expect(keyStep(key, p)).toBe(Math.max(0, Math.min(1, p + delta)));
    expect(keyStep('Home', p)).toBe(0); expect(keyStep('End', p)).toBe(1); expect(keyStep('Tab', p)).toBeNull();
  }
});
test('seam geometry and inverse agree on its entire line, including the header', () => {
  for (const p of [0, 0.42, 0.5, 1]) {
    const g = seamGeometry(p, 1440, 900);
    expect(g.top - g.bottom).toBe(900);
    for (const y of [0, 40, 76, 450, 900]) expect(shareAt(g.top - y, y, 1440, 900)).toBeCloseTo(p, 12);
  }
  expect(seamGeometry(0.5, 1440, 900).top).toBeLessThan(1440);
});
test('mouse grabs within a horizontal 48px band; touch only on the tab', () => {
  const x = seamGeometry(0.5, 800, 600).top - 200;
  expect(inGrabBand({ x: x + 47, y: 200, pointerType: 'mouse', onTab: false }, 0.5, 800, 600)).toBe(true);
  expect(inGrabBand({ x: x + 49, y: 200, pointerType: 'mouse', onTab: false }, 0.5, 800, 600)).toBe(false);
  expect(inGrabBand({ x, y: 200, pointerType: 'touch', onTab: false }, 0.5, 800, 600)).toBe(false);
  expect(inGrabBand({ x: 0, y: 0, pointerType: 'touch', onTab: true }, 0.5, 800, 600)).toBe(true);
});
