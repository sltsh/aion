import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import {
  ACCENTS, ANSI_BLACK_TEXT, ANSI_ORDER, CONTRAST_FLOOR, TERMINAL_BACKGROUNDS, ansi,
  contrastEmitted, hex, hexToOklch, neutral, terminalBackground, terminalSelection,
} from '@sltio/aion-tokens';
import { fragment, scheme, settingsSnippet } from '../src/scheme.js';

const built = scheme();

test('the committed fragment matches the generated fragment', () => {
  const onDisk = JSON.parse(readFileSync(new URL('../fragments/aion.json', import.meta.url), 'utf8'));
  expect(onDisk).toEqual(JSON.parse(JSON.stringify(fragment())));
});

test('the committed settings snippet matches the generated snippet', () => {
  const onDisk = JSON.parse(readFileSync(new URL('../snippets/settings.json', import.meta.url), 'utf8'));
  expect(onDisk).toEqual(JSON.parse(JSON.stringify(settingsSnippet())));
});

test('the scheme carries all sixteen slots plus the four surface colours', () => {
  expect(Object.keys(built)).toHaveLength(21);
  for (const [key, value] of Object.entries(built)) {
    if (key === 'name') continue;
    expect(value, key).toMatch(/^#[0-9a-f]{6}$/);
  }
});

// The terminal and the editor are one palette. This is what stops them drifting apart.
test('the bright eight are byte-identical to the syntax accents', () => {
  const pairs: [keyof typeof built, keyof typeof ACCENTS][] = [
    ['brightRed', 'coral'], ['brightGreen', 'green'], ['brightYellow', 'gold'],
    ['brightBlue', 'blue'], ['brightPurple', 'violet'], ['brightCyan', 'teal'],
  ];
  for (const [slot, accent] of pairs) {
    expect(built[slot], `${slot} drifted from ${accent}`).toBe(hex(ACCENTS[accent]));
  }
});

test('the normal eight sit one lightness step below the bright eight', () => {
  const pairs: [keyof typeof built, keyof typeof built][] = [
    ['red', 'brightRed'], ['green', 'brightGreen'], ['yellow', 'brightYellow'],
    ['blue', 'brightBlue'], ['purple', 'brightPurple'], ['cyan', 'brightCyan'],
  ];
  for (const [normal, bright] of pairs) {
    const gap = hexToOklch(built[bright]!)[0] - hexToOklch(built[normal]!)[0];
    expect(gap, `${normal} to ${bright} gap ${gap.toFixed(3)}`).toBeGreaterThan(0.04);
    expect(gap).toBeLessThan(0.08);
  }
});

// A slot lands on the standalone background and on the lighter VS Code panel. Gating only
// the darker of the two is how slot 8 shipped at 4.49:1 in the integrated terminal.
test('every slot except slot 0 clears the floor on both supported backgrounds', () => {
  for (const [name, background] of Object.entries(TERMINAL_BACKGROUNDS)) {
    for (const slot of ANSI_ORDER) {
      if (slot === 'black') continue;
      const ratio = contrastEmitted(ansi[slot], background);
      expect(ratio, `${slot} on ${name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

// SGR 30 puts text in slot 0 and it is not legible on either background. What Aion does
// guarantee is the other direction, which is what SGR 40 and reverse video actually use.
test('slot 0 carries the two white slots as a background', () => {
  for (const slot of ANSI_BLACK_TEXT) {
    const ratio = contrastEmitted(ansi[slot], ansi.black);
    expect(ratio, `${slot} on ansi.black = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

// Reverse video paints the default foreground as the background. Both defaults have to
// survive the swap, because a prompt uses it for the selected item in a menu.
test('reverse video keeps the floor in both directions', () => {
  for (const background of Object.values(TERMINAL_BACKGROUNDS)) {
    const ratio = contrastEmitted(background, neutral.textSecondary);
    expect(ratio, `reverse video = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

// Slot 0 is the one slot with no guarantee as a foreground. Naming it here stops a later
// change from quietly turning the exemption into a claim.
test('slot 0 is the only foreground exemption, and it is below the floor', () => {
  const ratio = contrastEmitted(ansi.black, terminalBackground);
  expect(ratio, `ansi.black = ${ratio.toFixed(2)}`).toBeLessThan(CONTRAST_FLOOR);
});

test('the standalone terminal uses the editor value, not the VS Code panel value', () => {
  expect(built.background).toBe(hex(terminalBackground));
  expect(built.background).toBe(hex(neutral.editor));
  expect(built.background).not.toBe(hex(neutral.terminal));
});

// Windows Terminal paints the selection opaque behind the glyphs, so unlike the editor's
// translucent overlay this value carries every slot on its own. The neutral it used
// before read 1.40:1 under ANSI red, and no step of the neutral ramp clears the floor.
test('every slot except slot 0 clears the floor on the opaque selection', () => {
  expect(built.selectionBackground).toBe(hex(terminalSelection));
  for (const slot of ANSI_ORDER) {
    if (slot === 'black') continue;
    const ratio = contrastEmitted(ansi[slot], terminalSelection);
    expect(ratio, `${slot} on the selection = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});
