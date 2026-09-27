import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatHeight, formatTime } from '../src/format.ts';

test('formats a level to two decimals in metres', () => {
  assert.equal(formatHeight(4.8712), '4.87 m');
});

test('formats a time in the station zone', () => {
  assert.equal(formatTime(new Date(Date.UTC(2026, 8, 27, 13, 36)), 'Europe/London'), '14:36');
});
