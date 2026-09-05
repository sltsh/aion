import { test, expect } from 'vitest';
import {
  bg, fg, border, syntax, accent, brackets, semantic, semanticLight, BOUNDARY_PAIRS,
  status, statusLight, flatten, contrastEmitted, neutral, CONTRAST_FLOOR, NON_TEXT_FLOOR,
  CONTRAST_EXEMPT,
} from '../src/index.js';
import { lightNeutral } from '../src/light.js';

const STATUS_NAMES = ['success', 'warning', 'error', 'info'] as const;

test('the semantic layer emits a valid hex for every alias', () => {
  const tokens = { ...flatten(semantic), ...flatten({ status }) };
  for (const [name, value] of Object.entries(tokens)) {
    expect(value, name).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
  }
});

test('the semantic layer holds about 45 aliases', () => {
  const count = Object.keys({
    ...flatten({ bg, fg, border, syntax, brackets }),
    ...flatten({ status: Object.fromEntries(STATUS_NAMES.map((n) => [n, status[n].solid])) }),
  }).length;
  expect(count).toBeGreaterThanOrEqual(40);
  expect(count).toBeLessThanOrEqual(55);
});

test('every dark semantic foreground clears the floor on its darkest surface', () => {
  for (const [name, colour] of Object.entries(fg)) {
    if (name === 'onAccent' || CONTRAST_EXEMPT.has(name)) continue;
    const ratio = contrastEmitted(colour, bg.editor);
    expect(ratio, `fg.${name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('every syntax alias clears the floor on the editor', () => {
  for (const [name, colour] of Object.entries(syntax)) {
    const ratio = contrastEmitted(colour, bg.editor);
    expect(ratio, `syntax.${name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

// A functional edge has a surface on each side of it. Measuring only the outer one is how
// the input border shipped at 1.41:1 against the field it was supposed to delimit.
test('every functional boundary clears the non-text floor on both surfaces it touches', () => {
  for (const { edge, inside, outside } of BOUNDARY_PAIRS) {
    for (const side of [inside, outside] as const) {
      const ratio = contrastEmitted(border[edge], bg[side]);
      expect(ratio, `border.${edge} on ${side} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    }
  }
});

test('the focus border clears the non-text floor on every dark surface', () => {
  for (const surface of Object.values(bg)) {
    expect(contrastEmitted(border.focus, surface)).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test('every status scale is legible in both schemes', () => {
  for (const name of STATUS_NAMES) {
    expect(contrastEmitted(status[name].text, bg.editor), `${name} dark text`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    expect(contrastEmitted(status[name].onSolid, status[name].solid), `${name} dark on solid`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    expect(contrastEmitted(status[name].border, bg.editor), `${name} dark border`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    expect(contrastEmitted(statusLight[name].text, lightNeutral.page), `${name} light text`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    expect(contrastEmitted(lightNeutral.textPrimary, statusLight[name].subtle), `${name} light on subtle`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('the light semantic layer clears the floor on the light page', () => {
  for (const [name, colour] of Object.entries(semanticLight.fg)) {
    if (name === 'onAccent') continue;
    // The light ramp needs no muted exemption: it is tuned separately, and clears the floor.
    const ratio = contrastEmitted(colour, semanticLight.bg.page);
    expect(ratio, `light fg.${name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('bracket pairs are three distinct colours', () => {
  const emitted = new Set(brackets.map((c) => c.join()));
  expect(emitted.size).toBe(3);
});

test('accent scales exist for every accent in both schemes', () => {
  expect(Object.keys(accent)).toEqual(Object.keys(semanticLight.accent));
});

test('flatten produces dotted names', () => {
  const tokens = flatten({ bg });
  expect(tokens['bg.editor']).toBe('#11151c');
  expect(tokens['bg.sidebar']).toBe('#171b22');
  expect(flatten({ overlay: semantic.overlay })['overlay.findMatchOther']).toHaveLength(9);
});

test('the editor is darker than the sidebar', () => {
  expect(neutral.editor[0]).toBeLessThan(neutral.sidebar[0]);
});
