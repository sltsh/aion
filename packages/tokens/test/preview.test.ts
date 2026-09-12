import { test, expect } from 'vitest';
import {
  buildLightPalette, buildPalette, LIGHT_PREVIEW_DEFAULTS, lightPalette, PREVIEW_DEFAULTS,
} from '../src/preview.js';
import {
  ACCENTS, BASE_HUE, SYNTAX, accentScale, ansi, bracketPairs, comment, cursor, diff,
  dimText, findMatch, neutral, overlay,
} from '../src/palette.js';
import type { AccentName, SyntaxRole } from '../src/palette.js';

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

// The lab drives buildPalette. If its defaults ever drift from the shipped palette, the
// lab starts advertising a theme the extension does not ship.
test('the default preview palette is the shipped palette', () => {
  const built = buildPalette();
  expect(plain(built.neutral)).toEqual(plain(neutral));
  expect(plain(built.accents)).toEqual(plain(ACCENTS));
  expect(plain(built.comment)).toEqual(plain(comment));
  expect(plain(built.dim)).toEqual(plain(dimText));
  expect(plain(built.ansi)).toEqual(plain(ansi));
  expect(plain(built.overlay)).toEqual(plain(overlay));
  expect(plain(built.diff)).toEqual(plain(diff));
  expect(plain(built.findMatch)).toEqual(plain(findMatch));
  expect(plain(built.cursor)).toEqual(plain(cursor));
  expect(plain(built.brackets)).toEqual(plain(bracketPairs.map((name) => ACCENTS[name])));
  for (const name of Object.keys(ACCENTS) as AccentName[]) {
    expect(plain(built.scales[name]), name).toEqual(plain(accentScale(name)));
  }
  for (const role of Object.keys(SYNTAX) as SyntaxRole[]) {
    expect(plain(built.syntax[role]), role).toEqual(plain(ACCENTS[SYNTAX[role]]));
  }
});

test('an explicit default option object changes nothing', () => {
  expect(plain(buildPalette(PREVIEW_DEFAULTS))).toEqual(plain(buildPalette()));
});

test('the light preview defaults are the complete light palette', () => {
  expect(LIGHT_PREVIEW_DEFAULTS).toEqual({
    baseHue: 264,
    baseChroma: 0.016,
    surfaceShift: -0.010,
    accentChroma: 1.10,
    accentLightness: 0.006,
    commentLightness: 0.516,
  });
  expect(plain(buildLightPalette(LIGHT_PREVIEW_DEFAULTS))).toEqual(plain(lightPalette));
});

test('each control moves the palette it is meant to move', () => {
  expect(buildPalette({ baseHue: 200 }).neutral.editor[2]).toBe(200);
  expect(buildPalette({ baseChroma: 0.04 }).neutral.sidebar[1]).toBe(0.04);
  expect(buildPalette({ surfaceShift: 0.02 }).neutral.editor[0]).toBeCloseTo(0.215, 6);
  expect(buildPalette({ accentChroma: 0.5 }).accents.gold[1]).toBeCloseTo(ACCENTS.gold[1] * 0.5, 6);
  expect(buildPalette({ accentLightness: -0.05 }).accents.blue[0]).toBeCloseTo(ACCENTS.blue[0] - 0.05, 6);
  expect(buildPalette({ commentLightness: 0.7 }).comment[0]).toBe(0.7);
});

test('light base hue only changes neutral-derived hues', () => {
  const moved = buildLightPalette({ baseHue: 200 });
  expect(moved.neutral.editor[2]).toBe(200);
  expect(moved.dim[2]).toBe(200);
  expect(moved.comment[2]).toBe(200);
  expect(moved.terminalSelection[2]).toBe(200);

  for (const name of Object.keys(ACCENTS) as AccentName[]) {
    expect(moved.accents[name][2], `${name} accent`).toBe(lightPalette.accents[name][2]);
    expect(moved.scales[name].subtle[2], `${name} subtle`).toBe(lightPalette.scales[name].subtle[2]);
    expect(moved.scales[name].border[2], `${name} border`).toBe(lightPalette.scales[name].border[2]);
    expect(moved.scales[name].solid[2], `${name} solid`).toBe(lightPalette.scales[name].solid[2]);
  }
  expect(moved.overlay.selection.color[2]).toBe(lightPalette.overlay.selection.color[2]);
  expect(moved.overlay.findMatchOther.color[2]).toBe(lightPalette.overlay.findMatchOther.color[2]);
  expect(moved.overlay.wordHighlight.color[2]).toBe(lightPalette.overlay.wordHighlight.color[2]);
  expect(moved.overlay.lineHighlight.color[2]).toBe(
    lightPalette.overlay.lineHighlight.color[2] + (200 - BASE_HUE),
  );
  expect(moved.findMatch.current[2]).toBe(lightPalette.findMatch.current[2]);
  expect(moved.cursor[2]).toBe(lightPalette.cursor[2]);
});

test('the bright ANSI eight track the accents through a change', () => {
  const built = buildPalette({ accentChroma: 0.6, accentLightness: 0.02 });
  expect(plain(built.ansi.brightYellow)).toEqual(plain(built.accents.gold));
  expect(built.ansi.yellow[0]).toBeCloseTo(built.accents.gold[0] - 0.06, 6);
});
