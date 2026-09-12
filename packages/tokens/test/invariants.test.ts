import { test, expect } from 'vitest';
import { compositeEmitted, contrastEmitted, contrastEmitted as contrast, inGamut, hex } from '../src/oklch.js';
import type { Oklch, AccentName, SyntaxRole } from '../src/index.js';
import {
  neutral, ACCENTS, ACCENT_NAMES, accentScale, SYNTAX, ONE_DARK_PRO_HUE, comment, diff, diffWash,
  overlay, ansi,
  findMatch, terminalBackground, CHROMA_CEILING, CHROMA_DEFAULT, HUE_DRIFT_LIMIT,
  CONTRAST_FLOOR, NON_TEXT_FLOOR, MEANING_PAIR_GAP, STATUS,
} from '../src/palette.js';
import {
  lightAccent, lightAccentScale, lightAnsi, lightDiff, lightDiffWash, lightEditorNeutral,
  lightAnsiBrightBlack, lightAnsiWhite, lightComment, lightDimText, lightNeutral, lightOverlay,
  LIGHT_CHROMA_FLOOR_EXCEPTION, lightTerminalSelection,
} from '../src/light.js';
import { readingForegrounds, readingStates } from '../src/states.js';

const syntaxColor = (role: SyntaxRole): Oklch => ACCENTS[SYNTAX[role]];
const roles = Object.keys(SYNTAX) as SyntaxRole[];

test('every syntax token clears the contrast floor on the editor', () => {
  for (const role of roles) {
    const ratio = contrast(syntaxColor(role), neutral.editor);
    expect(ratio, `${role} ${hex(syntaxColor(role))} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('the comment clears the floor', () => {
  const ratio = contrast(comment, neutral.editor);
  expect(ratio, `comment = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
});

// A plain editor background is the easiest state a reader ever sees. This is the one that
// caught the old comment at 3.32:1 on an inserted diff line and 2.12:1 on a find match.
test('every syntax colour clears the floor on every supported reading state', () => {
  const foregrounds = Object.entries(readingForegrounds());
  const states = readingStates();
  // Naming the states beats counting them: a count still passes when the set silently
  // loses the surface that used to bind it.
  const names = new Set(states.map((state) => state.name));
  for (const required of [
    'editor', 'peekEditor', 'hoverWidget',
    'editor + lineHighlight', 'editor + selection', 'editor + wordHighlight',
    'editor + lineHighlight + wordHighlight', 'editor + selection + wordHighlight',
    'editor + addedLine', 'editor + addedLine + addedWord',
    'editor + removedLine', 'editor + removedLine + removedWord',
    'editor + selection + addedLine + addedWord',
    'editor + selection + removedLine + removedWord',
    'editor + lineHighlight + removedLine + removedWord',
  ]) {
    expect(names, `${required} left the supported set`).toContain(required);
  }
  // VS Code hides the current-line background while a selection is non-empty, so this
  // pair cannot render and must not be gated as though it could.
  expect(names).not.toContain('editor + lineHighlight + selection');
  for (const state of states) {
    for (const [role, colour] of foregrounds) {
      const ratio = contrast(colour, state.background);
      expect(ratio, `${role} on ${state.name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

// The find match is the one decoration allowed to replace the colour under it, so what
// has to clear the floor is the override, not the syntax colour it hides.
// A find match keeps the syntax colours under it, so every one of them has to clear the
// floor on the fill. The two foreground override keys are unusable: `findWidget.ts`
// applies each to the other one's decoration.
test('every syntax colour clears the floor on the current find match', () => {
  for (const [role, colour] of Object.entries(readingForegrounds())) {
    const ratio = contrast(colour, findMatch.current);
    expect(ratio, `${role} on the find match = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('UI text clears the floor on every surface it can sit on', () => {
  const surfaces = ['editor', 'terminal', 'sidebar', 'widget'] as const;
  for (const text of ['textPrimary', 'textSecondary'] as const) {
    for (const surface of surfaces) {
      const ratio = contrast(neutral[text], neutral[surface]);
      expect(ratio, `${text} on ${surface} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

test('focus ring and UI border clear the non-text floor', () => {
  expect(contrast(ACCENTS.gold, neutral.editor)).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  expect(contrast(neutral.border, neutral.editor)).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
});

test('every colour is inside the sRGB gamut', () => {
  const all: Oklch[] = [
    ...Object.values(neutral), ...Object.values(ACCENTS), ...Object.values(ansi),
    comment, ...Object.values(diff), ...Object.values(diffWash).map((w) => w.color),
    ...Object.values(lightNeutral), ...Object.values(lightEditorNeutral),
    ...Object.values(lightAnsi), ...Object.values(lightDiff),
    ...Object.values(lightDiffWash).map((w) => w.color),
    ...Object.values(lightOverlay).map((w) => w.color), lightTerminalSelection,
  ];
  for (const name of ACCENT_NAMES) {
    all.push(...Object.values(accentScale(name)), lightAccent(name), ...Object.values(lightAccentScale(name)));
  }
  for (const c of all) expect(inGamut(c), `out of gamut: ${c.join(', ')}`).toBe(true);
});

test('accent chroma stays inside its band', () => {
  for (const [name, [, chroma]] of Object.entries(ACCENTS) as [AccentName, Oklch][]) {
    const ceiling = CHROMA_CEILING[name] ?? CHROMA_DEFAULT[1];
    expect(chroma, `${name} chroma ${chroma} below floor`).toBeGreaterThanOrEqual(CHROMA_DEFAULT[0]);
    expect(chroma, `${name} chroma ${chroma} above ceiling ${ceiling}`).toBeLessThanOrEqual(ceiling);
  }
});

test('syntax hues stay within the drift limit of One Dark Pro', () => {
  for (const role of roles) {
    const drift = ACCENTS[SYNTAX[role]][2] - ONE_DARK_PRO_HUE[role];
    expect(Math.abs(drift), `${role} drift ${drift.toFixed(1)}`).toBeLessThanOrEqual(HUE_DRIFT_LIMIT);
  }
});

test('meaning pairs separate by lightness for colour vision', () => {
  const pairs: [Oklch, Oklch][] = [
    [ACCENTS[STATUS.success], ACCENTS[STATUS.error]],
    [diff.addedStrip, diff.removedStrip],
  ];
  for (const [a, b] of pairs) {
    const gap = Math.abs(a[0] - b[0]);
    expect(gap, `gap ${gap.toFixed(3)} below ${MEANING_PAIR_GAP}`).toBeGreaterThanOrEqual(MEANING_PAIR_GAP);
  }
});

// The line washes cannot hold that gap, and no document claims they do any more: a green
// wash dark enough to open 0.06 under a red one is invisible. This records what they do
// separate by, composited the way the renderer composites them.
test('the diff line washes sit above the editor, close together', () => {
  const on = (name: 'addedLine' | 'removedLine'): Oklch =>
    compositeEmitted(diffWash[name].color, diffWash[name].alpha, neutral.editor);
  const [added, removed] = [on('addedLine'), on('removedLine')];
  expect(added[0]).toBeGreaterThan(neutral.editor[0]);
  expect(removed[0]).toBeGreaterThan(neutral.editor[0]);
  expect(Math.abs(added[0] - removed[0])).toBeLessThan(MEANING_PAIR_GAP);
});

test('every ANSI slot except the two dim ones clears the floor', () => {
  for (const [slot, colour] of Object.entries(ansi)) {
    if (slot === 'black') continue;
    const ratio = contrast(colour, terminalBackground);
    expect(ratio, `ansi.${slot} ${hex(colour)} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('the bright ANSI eight are exactly the syntax accents', () => {
  const map = {
    brightRed: 'coral', brightGreen: 'green', brightYellow: 'gold',
    brightBlue: 'blue', brightMagenta: 'violet', brightCyan: 'teal',
  } as const;
  for (const [slot, accent] of Object.entries(map) as ['brightRed', AccentName][]) {
    expect(ansi[slot], `${slot} drifted from ${accent}`).toEqual([...ACCENTS[accent]]);
  }
});

test('accent fills carry primary text', () => {
  for (const name of ACCENT_NAMES) {
    const ratio = contrast(neutral.editor, accentScale(name).solid);
    expect(ratio, `editor text on ${name} solid = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('accent borders clear the non-text floor', () => {
  for (const name of ACCENT_NAMES) {
    const ratio = contrast(accentScale(name).border, neutral.editor);
    expect(ratio, `${name} border = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test('the light ramp clears the floor on the light page', () => {
  for (const name of ACCENT_NAMES) {
    const ratio = contrastEmitted(lightAccent(name), lightNeutral.page);
    expect(ratio, `light ${name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    const inputRatio = contrastEmitted(lightAccent(name), lightNeutral.input);
    expect(inputRatio, `light ${name} on input = ${inputRatio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
  for (const text of ['textPrimary', 'textSecondary'] as const) {
    const ratio = contrastEmitted(lightNeutral[text], lightNeutral.page);
    expect(ratio, `light ${text} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('light reading roles retain distinct emitted values', () => {
  const roles = {
    comment: lightComment,
    punctuation: lightNeutral.textSecondary,
    dim: lightDimText,
    ansiWhite: lightAnsiWhite,
    ansiBrightBlack: lightAnsiBrightBlack,
  } as const;
  expect(hex(roles.punctuation)).toBe(hex(lightNeutral.textSecondary));
  expect(new Set(Object.values(roles).map(hex)).size).toBe(Object.keys(roles).length);
  for (const [name, colour] of Object.entries(roles)) {
    const ratio = contrastEmitted(colour, lightNeutral.raised);
    expect(ratio, `${name} on raised = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('light accent chroma honors its band, with only the documented teal exception', () => {
  for (const name of ACCENT_NAMES) {
    const chroma = lightAccent(name)[1];
    const ceiling = CHROMA_CEILING[name] ?? CHROMA_DEFAULT[1];
    const minimum = LIGHT_CHROMA_FLOOR_EXCEPTION[name] ?? CHROMA_DEFAULT[0];
    expect(chroma, `${name} chroma ${chroma} above ceiling ${ceiling}`).toBeLessThanOrEqual(ceiling);
    expect(chroma, `${name} chroma ${chroma} below floor ${minimum}`).toBeGreaterThanOrEqual(minimum);
  }
  expect(lightAccent('teal')[1]).toBeLessThan(CHROMA_DEFAULT[0]);
  expect(Object.keys(LIGHT_CHROMA_FLOOR_EXCEPTION)).toEqual(['teal']);
});

test('light accent borders clear the non-text floor on the light page', () => {
  for (const name of ACCENT_NAMES) {
    const ratio = contrastEmitted(lightAccentScale(name).border, lightNeutral.page);
    expect(ratio, `light ${name} border = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    const inputRatio = contrastEmitted(lightAccentScale(name).border, lightNeutral.input);
    expect(inputRatio, `light ${name} border on input = ${inputRatio.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test('light subtle fills carry light primary text', () => {
  for (const name of ACCENT_NAMES) {
    const ratio = contrastEmitted(lightNeutral.textPrimary, lightAccentScale(name).subtle);
    expect(ratio, `light text on ${name} subtle = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

// A diff wash paints over the selection, so it has to let the selection through. The
// alphas that leave it readable are low, which is also what keeps the wash quiet.
test('a diff wash stays quiet against the editor and lets the selection through', () => {
  const selected = compositeEmitted(overlay.selection.color, overlay.selection.alpha, neutral.editor);
  const alone = contrastEmitted(selected, neutral.editor);
  for (const side of ['added', 'removed'] as const) {
    const line = (base: Oklch): Oklch =>
      compositeEmitted(diffWash[`${side}Line`].color, diffWash[`${side}Line`].alpha, base);
    const word = (base: Oklch): Oklch =>
      compositeEmitted(diffWash[`${side}Word`].color, diffWash[`${side}Word`].alpha, line(base));
    const ratio = contrastEmitted(word(neutral.editor), neutral.editor);
    expect(ratio, `${side} wash ratio ${ratio.toFixed(2)} outside 1.05..2.0`).toBeGreaterThan(1.05);
    expect(ratio).toBeLessThan(2.0);
    const through = contrastEmitted(word(selected), word(neutral.editor));
    expect(through, `${side}: the selection reads ${through.toFixed(3)} through the wash`)
      .toBeGreaterThan(1 + (alone - 1) * 0.5);
  }
});

test('the light diff wash is visible and keeps its selection cue', () => {
  const selected = compositeEmitted(
    lightOverlay.selection.color,
    lightOverlay.selection.alpha,
    lightNeutral.page,
  );
  const selectionShift = contrastEmitted(selected, lightNeutral.page);

  for (const side of ['added', 'removed'] as const) {
    const line = (base: Oklch): Oklch => compositeEmitted(
      lightDiffWash[`${side}Line`].color,
      lightDiffWash[`${side}Line`].alpha,
      base,
    );
    const word = (base: Oklch): Oklch => compositeEmitted(
      lightDiffWash[`${side}Word`].color,
      lightDiffWash[`${side}Word`].alpha,
      line(base),
    );
    const lineRatio = contrastEmitted(line(lightNeutral.page), lightNeutral.page);
    const wordRatio = contrastEmitted(word(lightNeutral.page), lightNeutral.page);
    expect(lineRatio, `${side} line wash`).toBeGreaterThan(1.07);
    expect(wordRatio, `${side} word wash`).toBeGreaterThan(lineRatio);
    expect(
      contrastEmitted(word(selected), word(lightNeutral.page)),
      `${side} selection through wash`,
    ).toBeGreaterThan(1 + (selectionShift - 1) * 0.5);
  }
});
