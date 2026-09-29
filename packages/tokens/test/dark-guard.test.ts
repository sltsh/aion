import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import { SHIPPED, flatten, semantic } from '../src/index.js';

const SNAPSHOT = new URL('./dark-emitted.json', import.meta.url);
const DARK_THEME = new URL('../../vscode/themes/aion.json', import.meta.url);

const walk = (value: unknown, prefix: string, out: Record<string, string>): void => {
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) walk(child, `${prefix}.${key}`, out);
  } else out[prefix] = String(value);
};

const themeEntries = (): Record<string, string> => {
  const { colors, tokenColors, semanticTokenColors } = JSON.parse(readFileSync(DARK_THEME, 'utf8'));
  const out: Record<string, string> = {};
  walk(colors, 'vscode.colors', out);
  walk(tokenColors, 'vscode.tokenColors', out);
  walk(semanticTokenColors, 'vscode.semanticTokenColors', out);
  return out;
};

const emit = (): Record<string, string> => {
  const parts = {
    ...Object.fromEntries(Object.entries(flatten(semantic)).map(([k, v]) => [`semantic.${k}`, v])),
    ...Object.fromEntries(Object.entries(flatten(SHIPPED)).map(([k, v]) => [`shipped.${k}`, v])),
    ...themeEntries(),
  };
  return Object.fromEntries(Object.entries(parts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
};

if (process.env.AION_UPDATE_DARK === '1') {
  writeFileSync(SNAPSHOT, JSON.stringify(emit(), null, 2) + '\n');
}

test('every Dark emitted value matches the recorded snapshot', () => {
  const recorded = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as Record<string, string>;
  const fresh = emit();
  const changed = [...new Set([...Object.keys(recorded), ...Object.keys(fresh)])]
    .filter((key) => recorded[key] !== fresh[key])
    .map((key) => `${key}: ${recorded[key] ?? '(absent)'} -> ${fresh[key] ?? '(absent)'}`);
  expect(changed, `Dark changed; regenerate only on purpose with AION_UPDATE_DARK=1`).toEqual([]);
  expect(recorded).toEqual(fresh);
});

test('the snapshot holds exactly the emitted Dark keys', () => {
  const recorded = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as Record<string, string>;
  const theme = themeEntries();
  const expected =
    Object.keys(flatten(semantic)).length + Object.keys(flatten(SHIPPED)).length + Object.keys(theme).length;
  expect(Object.keys(recorded).length).toBe(expected);
});
