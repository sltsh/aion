import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, nextHighWater, type Station } from '../src/predict.ts';
import { CONSTITUENTS, periodHours } from '../src/constituents.ts';
import example from '../stations/EX-0001.json' with { type: 'json' };

const station = example as Station;
const start = new Date(Date.UTC(2026, 8, 27, 6));

test('returns the datum when every amplitude is zero', () => {
  const still = { ...station, harmonics: { M2: { amplitude: 0, phase: 0 } } };
  assert.equal(heightAt(still, start), station.datum);
});

test('repeats after one M2 period on a pure M2 station', () => {
  const m2 = { ...station, harmonics: { M2: station.harmonics.M2! } };
  const later = new Date(start.getTime() + periodHours(CONSTITUENTS[0]!) * 3_600_000);
  assert.ok(Math.abs(heightAt(m2, start) - heightAt(m2, later)) < 1e-6);
});

test('finds the next high water within half a day', () => {
  const high = nextHighWater(station, start);
  assert.ok(high);
  assert.ok(high.time.getTime() - start.getTime() < 13 * 3_600_000);
  assert.ok(high.level > station.datum);
});
