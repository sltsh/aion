import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import {
  hex, hexAlpha, neutral, ACCENTS, ACCENT_NAMES, accentScale, comment, diff, ansi,
  ANSI_ORDER, overlay, diffWash, dimText, findMatch,
} from '../src/index.js';
import { lightNeutral, lightAccents, lightAccentScale } from '../src/light.js';
import { readingStates } from '../src/states.js';
import { RIVALS } from '../src/rivals.js';

const emitted = (): Set<string> => {
  const out = new Set<string>();
  for (const c of Object.values(neutral)) out.add(hex(c));
  for (const c of Object.values(lightNeutral)) out.add(hex(c));
  for (const name of ACCENT_NAMES) {
    out.add(hex(ACCENTS[name]));
    for (const c of Object.values(accentScale(name))) out.add(hex(c));
    for (const c of Object.values(lightAccentScale(name))) out.add(hex(c));
    out.add(hex(lightAccents[name]));
  }
  for (const slot of ANSI_ORDER) out.add(hex(ansi[slot]));
  for (const c of Object.values(diff)) out.add(hex(c));
  for (const o of Object.values(overlay)) out.add(hexAlpha(o.color, o.alpha));
  for (const w of Object.values(diffWash)) out.add(hexAlpha(w.color, w.alpha));
  for (const c of Object.values(findMatch)) out.add(hex(c));
  out.add(hex(comment));
  out.add(hex(dimText));
  // The covered-state table quotes each composited background, so those are emitted too.
  for (const state of readingStates()) out.add(hex(state.background));
  // A rival's hex is a foreign value, but it is still generated: the documents quote it
  // from `rivals.ts`, so a hand-typed one still fails here.
  for (const rival of RIVALS) {
    out.add(rival.background);
    out.add(rival.sideBar);
    for (const colour of Object.values(rival.syntax)) out.add(colour);
  }
  return out;
};

// The emitted values win when a document disagrees with them. This is what notices.
const DOCUMENTS = [
  ['DESIGN.md', '../../../DESIGN.md', 50],
  ['README.md', '../../../README.md', 0],
  ['packages/vscode/README.md', '../../vscode/README.md', 10],
  ['packages/terminal/README.md', '../../terminal/README.md', 16],
  ['packages/tokens/README.md', '../README.md', 0],
  ['packages/css/README.md', '../../css/README.md', 0],
] as const;

test.each(DOCUMENTS)('every hex quoted in %s is a value this package emits', (name, path, least) => {
  const text = readFileSync(new URL(path, import.meta.url), 'utf8');
  // Every hex in the file, not only the ones inside backticks: the token README quoted a
  // superseded gold inside a code sample, where the backtick form never looked at it.
  const quoted = [...text.matchAll(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/g)].map((m) => m[0]);
  expect(quoted.length, `${name} quotes too few hex values`).toBeGreaterThanOrEqual(least);
  const shipped = emitted();
  const stale = [...new Set(quoted)].filter((value) => !shipped.has(value));
  expect(stale, `stale in ${name}: ${stale.join(', ')}`).toEqual([]);
});
