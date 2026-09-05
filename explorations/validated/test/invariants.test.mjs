import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, inGamut, hex } from '../src/oklch.mjs';
import {
  neutral, ACCENTS, accentScale, SYNTAX, ONE_DARK_PRO_HUE, comment, diff, ansi,
  terminalBackground, CHROMA_CEILING, CHROMA_DEFAULT, HUE_DRIFT_LIMIT,
  CONTRAST_FLOOR, NON_TEXT_FLOOR, MEANING_PAIR_GAP, STATUS,
} from '../src/palette.mjs';
import { lightNeutral, lightAccent } from '../src/light.mjs';

const syntaxColor = (role) => ACCENTS[SYNTAX[role]];

test('every syntax token clears the contrast floor on the editor', () => {
  for (const role of Object.keys(SYNTAX)) {
    const ratio = contrast(syntaxColor(role), neutral.editor);
    assert.ok(ratio >= CONTRAST_FLOOR, `${role} ${hex(syntaxColor(role))} = ${ratio.toFixed(2)}`);
  }
});

test('the comment clears the floor', () => {
  const ratio = contrast(comment, neutral.editor);
  assert.ok(ratio >= CONTRAST_FLOOR, `comment = ${ratio.toFixed(2)}`);
});

test('UI text clears the floor on every surface it can sit on', () => {
  const surfaces = ['editor', 'terminal', 'sidebar', 'widget'];
  for (const text of ['textPrimary', 'textSecondary']) {
    for (const surface of surfaces) {
      const ratio = contrast(neutral[text], neutral[surface]);
      assert.ok(ratio >= CONTRAST_FLOOR, `${text} on ${surface} = ${ratio.toFixed(2)}`);
    }
  }
});

test('focus ring and UI border clear the non-text floor', () => {
  assert.ok(contrast(ACCENTS.gold, neutral.editor) >= NON_TEXT_FLOOR);
  assert.ok(contrast(neutral.border, neutral.editor) >= NON_TEXT_FLOOR);
});

test('every colour is inside the sRGB gamut', () => {
  const all = [...Object.values(neutral), ...Object.values(ACCENTS), ...Object.values(ansi),
    comment, diff.addedFill, diff.removedFill, ...Object.values(lightNeutral)];
  for (const name of Object.keys(ACCENTS)) all.push(...Object.values(accentScale(name)), lightAccent(name));
  for (const c of all) assert.ok(inGamut(c), `out of gamut: ${c.join(', ')}`);
});

test('accent chroma stays inside its band', () => {
  for (const [name, [, chroma]] of Object.entries(ACCENTS)) {
    const ceiling = CHROMA_CEILING[name] ?? CHROMA_DEFAULT[1];
    assert.ok(chroma >= CHROMA_DEFAULT[0], `${name} chroma ${chroma} below floor`);
    assert.ok(chroma <= ceiling, `${name} chroma ${chroma} above ceiling ${ceiling}`);
  }
});

test('syntax hues stay within the drift limit of One Dark Pro', () => {
  for (const [role, accent] of Object.entries(SYNTAX)) {
    const drift = ACCENTS[accent][2] - ONE_DARK_PRO_HUE[role];
    assert.ok(Math.abs(drift) <= HUE_DRIFT_LIMIT, `${role} drift ${drift.toFixed(1)}`);
  }
});

test('meaning pairs separate by lightness for colour vision', () => {
  const pairs = [
    [ACCENTS[STATUS.success], ACCENTS[STATUS.error]],
    [diff.addedFill, diff.removedFill],
  ];
  for (const [a, b] of pairs) {
    assert.ok(Math.abs(a[0] - b[0]) >= MEANING_PAIR_GAP,
      `gap ${Math.abs(a[0] - b[0]).toFixed(3)} below ${MEANING_PAIR_GAP}`);
  }
});

test('every ANSI slot except the two dim ones clears the floor', () => {
  for (const [slot, colour] of Object.entries(ansi)) {
    if (slot === 'black') continue;
    const ratio = contrast(colour, terminalBackground);
    assert.ok(ratio >= CONTRAST_FLOOR, `ansi.${slot} ${hex(colour)} = ${ratio.toFixed(2)}`);
  }
});

test('the bright ANSI eight are exactly the syntax accents', () => {
  const map = { brightRed: 'coral', brightGreen: 'green', brightYellow: 'gold',
    brightBlue: 'blue', brightMagenta: 'violet', brightCyan: 'teal' };
  for (const [slot, accent] of Object.entries(map)) {
    assert.deepEqual(ansi[slot], ACCENTS[accent], `${slot} drifted from ${accent}`);
  }
});

test('accent fills carry primary text', () => {
  for (const name of Object.keys(ACCENTS)) {
    const ratio = contrast(neutral.editor, accentScale(name).solid);
    assert.ok(ratio >= CONTRAST_FLOOR, `editor text on ${name} solid = ${ratio.toFixed(2)}`);
  }
});

test('accent borders clear the non-text floor', () => {
  for (const name of Object.keys(ACCENTS)) {
    const ratio = contrast(accentScale(name).border, neutral.editor);
    assert.ok(ratio >= NON_TEXT_FLOOR, `${name} border = ${ratio.toFixed(2)}`);
  }
});

test('the light ramp clears the floor on the light page', () => {
  for (const name of Object.keys(ACCENTS)) {
    const ratio = contrast(lightAccent(name), lightNeutral.page);
    assert.ok(ratio >= CONTRAST_FLOOR, `light ${name} = ${ratio.toFixed(2)}`);
  }
  for (const text of ['textPrimary', 'textSecondary']) {
    const ratio = contrast(lightNeutral[text], lightNeutral.page);
    assert.ok(ratio >= CONTRAST_FLOOR, `light ${text} = ${ratio.toFixed(2)}`);
  }
});

test('diff fills stay quiet against the editor', () => {
  for (const fill of [diff.addedFill, diff.removedFill]) {
    const ratio = contrast(fill, neutral.editor);
    assert.ok(ratio > 1.05 && ratio < 2.0, `diff fill ratio ${ratio.toFixed(2)} outside 1.05..2.0`);
  }
});
