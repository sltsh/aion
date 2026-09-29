import { test, expect } from 'vitest';
import { compositeEmitted, contrastEmitted, contrastEmitted as contrast, inGamut, hex } from '../src/oklch.js';
import type { Oklch, AccentName, SyntaxRole, StackLayer } from '../src/index.js';
import {
  neutral, ACCENTS, ACCENT_NAMES, accentScale, SYNTAX, ONE_DARK_PRO_HUE, comment, diff, diffWash,
  overlay, ansi, ANSI_BADGE,
  findMatch, terminalBackground, CHROMA_CEILING, CHROMA_DEFAULT, HUE_DRIFT_LIMIT,
  CONTRAST_FLOOR, NON_TEXT_FLOOR, MEANING_PAIR_GAP, STATUS,
} from '../src/palette.js';
import {
  lightAccent, lightAccentScale, lightAnsi, lightDiff, lightDiffWash, lightEditorNeutral,
  lightAnsiBrightBlack, lightAnsiWhite, lightComment, lightDecoration, lightDimText, lightNeutral,
  lightOverlay,
  LIGHT_CHROMA_FLOOR_EXCEPTION, lightTerminalSelection, lightAccents, LIGHT_ACCENT_MARGIN,
  LIGHT_HUE_DRIFT, LIGHT_SYNTAX_FLOOR,
} from '../src/light.js';
import { lightPalette } from '../src/preview.js';
import { LIGHT_SHIPPED, SHIPPED, orderStack, readingForegrounds, readingStates, stackBackground } from '../src/states.js';
import { distanceEmitted } from '../src/solve.js';

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

// The gate proves text reads on an overlay; nothing proved the overlay could be seen. The
// light set shipped at 0.013 in OKLab or less, invisible in VS Code, while every row it
// sat under passed. The light diff wash, confirmed visible natively, sits near 0.03.
const OVERLAY_VISIBILITY = 0.03;

test('every reading-state overlay moves its editor far enough to be seen, in both schemes', () => {
  for (const [scheme, set, editor] of [
    ['dark', overlay, neutral.editor],
    ['light', lightOverlay, lightEditorNeutral.editor],
  ] as const) {
    for (const [name, value] of Object.entries(set)) {
      const shift = distanceEmitted(compositeEmitted(value.color, value.alpha, editor), editor);
      expect(shift, `${scheme} ${name} moves the editor by ${shift.toFixed(4)}`)
        .toBeGreaterThanOrEqual(OVERLAY_VISIBILITY);
    }
  }
});

test.each([['dark', SHIPPED], ['light', LIGHT_SHIPPED]] as const)(
  '%s selection highlight clears visibility after its native alpha transformation', (_scheme, source) => {
    const editor = source.neutral.editor;
    const painted = stackBackground(source, editor, ['selectionHighlight']);
    expect(distanceEmitted(painted, editor)).toBeGreaterThanOrEqual(OVERLAY_VISIBILITY);
  },
);

test('moved dark decorations clear visibility after native painting', () => {
  const editor = SHIPPED.neutral.editor;
  const names = [...Object.keys(SHIPPED.decoration), ...Object.keys(SHIPPED.secondaryDecoration)]
    .filter((name) => name !== 'inactiveSelection' && name !== 'unchangedCode') as StackLayer[];
  for (const name of names) {
    expect(distanceEmitted(stackBackground(SHIPPED, editor, [name]), editor), name)
      .toBeGreaterThanOrEqual(OVERLAY_VISIBILITY);
  }
});

test('every light editor decoration moves the editor far enough to be seen', () => {
  const editor = lightEditorNeutral.editor;
  for (const [name, value] of Object.entries(lightDecoration)) {
    const shift = distanceEmitted(compositeEmitted(value.color, value.alpha, editor), editor);
    expect(shift, `light ${name} moves the editor by ${shift.toFixed(4)}`)
      .toBeGreaterThanOrEqual(OVERLAY_VISIBILITY);
  }
});

test('every light secondary decoration moves the editor far enough to be seen, after native painting', () => {
  const editor = LIGHT_SHIPPED.neutral.editor;
  for (const name of Object.keys(LIGHT_SHIPPED.secondaryDecoration) as StackLayer[]) {
    const shift = distanceEmitted(stackBackground(LIGHT_SHIPPED, editor, [name]), editor);
    expect(shift, `light ${name} moves the editor by ${shift.toFixed(4)}`)
      .toBeGreaterThanOrEqual(OVERLAY_VISIBILITY);
  }
});

test('a diff word stands out from its own line, in both schemes', () => {
  for (const [scheme, source] of [['dark', SHIPPED], ['light', LIGHT_SHIPPED]] as const) {
    const editor = source.neutral.editor;
    for (const [line, word] of [['addedLine', 'addedWord'], ['removedLine', 'removedWord']] as const) {
      const shift = distanceEmitted(
        stackBackground(source, editor, [line, word]),
        stackBackground(source, editor, [line]),
      );
      expect(shift, `${scheme} ${word} over ${line} moves it by ${shift.toFixed(4)}`)
        .toBeGreaterThanOrEqual(OVERLAY_VISIBILITY);
    }
  }
});

test('no secondary decoration outshines the selection, in both schemes', () => {
  for (const [scheme, source] of [['dark', SHIPPED], ['light', LIGHT_SHIPPED]] as const) {
    const editor = source.neutral.editor;
    const selection = distanceEmitted(stackBackground(source, editor, ['selection']), editor);
    for (const name of Object.keys(source.secondaryDecoration) as StackLayer[]) {
      const shift = distanceEmitted(stackBackground(source, editor, [name]), editor);
      expect(shift, `${scheme} ${name} against the selection's ${selection.toFixed(4)}`)
        .toBeLessThan(selection);
    }
  }
});

// Light's word highlight and other find matches once outshone its selection, which then
// read as the weakest cue in the editor. Dark never did.
test('the selection is the loudest reading overlay, in both schemes', () => {
  for (const [scheme, set, extra, editor] of [
    ['dark', overlay, {}, neutral.editor],
    ['light', lightOverlay, lightDecoration, lightEditorNeutral.editor],
  ] as const) {
    const shift = (value: { color: Oklch; alpha: number }): number =>
      distanceEmitted(compositeEmitted(value.color, value.alpha, editor), editor);
    const selection = shift(set.selection);
    for (const [name, value] of [...Object.entries(set), ...Object.entries(extra)]) {
      if (name === 'selection') continue;
      expect(shift(value), `${scheme} ${name} against the selection's ${selection.toFixed(4)}`)
        .toBeLessThan(selection);
    }
  }
});

// A word or another find match lands on a selection, and an overly strong wash hides it.
test('the selection still reads through word and find highlights, in both schemes', () => {
  for (const [scheme, set, editor] of [
    ['dark', overlay, neutral.editor],
    ['light', lightOverlay, lightEditorNeutral.editor],
  ] as const) {
    const selected = compositeEmitted(set.selection.color, set.selection.alpha, editor);
    for (const name of ['wordHighlight', 'findMatchOther'] as const) {
      const layer = set[name];
      const over = (base: Oklch): Oklch => compositeEmitted(layer.color, layer.alpha, base);
      const through = distanceEmitted(over(selected), over(editor));
      expect(through, `${scheme} selection through ${name}`)
        .toBeGreaterThan(distanceEmitted(selected, editor) * 0.5);
    }
  }
});

test('a text decoration preserves at least half the selection cue beneath it', () => {
  for (const [scheme, source] of [['dark', SHIPPED], ['light', LIGHT_SHIPPED]] as const) {
    const editor = source.neutral.editor;
    const selected = compositeEmitted(source.overlay.selection.color, source.overlay.selection.alpha, editor);
    const floor = distanceEmitted(selected, editor) * 0.5;
    const names = [...Object.keys(source.decoration), ...Object.keys(source.secondaryDecoration)]
      .filter((name) => name !== 'inactiveSelection') as StackLayer[];
    for (const name of names) {
      const plain = stackBackground(source, editor, orderStack(new Set([name])));
      const through = stackBackground(source, editor, orderStack(new Set(['selection', name])));
      expect(distanceEmitted(through, plain), `${scheme} selection through ${name}`)
        .toBeGreaterThan(floor);
    }
  }
});

const greys = (): Oklch[] =>
  Array.from({ length: 201 }, (_, i): Oklch => [i / 200, ansi.brightBlack[1], ansi.brightBlack[2]]);

// VS Code draws bold text in the bright slot by default, so a bold SGR 30 badge is slot 8
// on a colour. Slot 8 also has to read on the panel. No grey does both, which is why the
// bold badge is information in the gate and not a row the palette could be made to pass.
test('no grey can be slot 8 on the dark panel and bold badge text on every colour', () => {
  const both = greys().filter((grey) =>
    contrastEmitted(grey, neutral.terminal) >= CONTRAST_FLOOR
    && ANSI_BADGE.every((slot) => contrastEmitted(grey, ansi[slot]) >= CONTRAST_FLOOR));
  expect(both.map(hex)).toEqual([]);
});

// The light chromatic slots are text on a pale panel, so they are dark, and the darkest
// black the display can show still falls short on them. VS Code's default minimum contrast
// ratio repairs the badge per cell; the palette cannot.
test('no light black reads on a light chromatic slot at the floor', () => {
  const blackest: Oklch = [0, 0, 0];
  for (const slot of ANSI_BADGE) {
    const ratio = contrastEmitted(blackest, lightAnsi[slot]);
    expect(ratio, `pure black on light ${slot} = ${ratio.toFixed(2)}`).toBeLessThan(CONTRAST_FLOOR);
  }
});

test('every light accent sits the approved margin above the comment', () => {
  const editor = LIGHT_SHIPPED.neutral.editor;
  const floor = contrastEmitted(LIGHT_SHIPPED.comment, editor) * LIGHT_ACCENT_MARGIN;
  for (const name of ACCENT_NAMES) {
    const accent = lightPalette.accents[name];
    const onEditor = contrastEmitted(accent, editor);
    expect(onEditor, `light ${name} on editor ${onEditor.toFixed(3)} vs ${floor.toFixed(3)}`)
      .toBeGreaterThanOrEqual(floor);
    const onInput = contrastEmitted(accent, lightNeutral.input);
    expect(onInput, `light ${name} on input ${onInput.toFixed(3)}`)
      .toBeGreaterThanOrEqual(LIGHT_SYNTAX_FLOOR);
  }
});

test('the light comment stays apart from secondary text', () => {
  const gap = distanceEmitted(LIGHT_SHIPPED.comment, LIGHT_SHIPPED.neutral.textSecondary);
  expect(gap).toBeGreaterThanOrEqual(0.03);
});

test('every light accent keeps its Dark hue within the drift allowance', () => {
  for (const name of ACCENT_NAMES) {
    const drift = Math.abs(lightAccents[name][2] - ACCENTS[name][2]);
    expect(drift, `light ${name} hue drift`).toBeLessThanOrEqual(8);
    expect(drift, `light ${name} hue drift`).toBeCloseTo(Math.abs(LIGHT_HUE_DRIFT[name] ?? 0), 6);
  }
});

test('the emitted light palette carries the solved comment and accents', () => {
  expect(lightPalette.comment).toEqual(lightComment);
  for (const name of ACCENT_NAMES) expect(lightPalette.accents[name], name).toEqual(lightAccents[name]);
});
