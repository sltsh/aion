import { test, expect } from 'vitest';
import { checks, failures, designTables } from '../src/report.js';
import { RIVALS, SYNTAX_ROLES_COMPARED, measure, surfaceOrder } from '../src/rivals.js';
import { CONTRAST_FLOOR, ACCENTS, SYNTAX, comment, neutral, contrastEmitted } from '../src/index.js';
import type { SyntaxRole } from '../src/index.js';

test('the build gate reports no failure', () => {
  const failed = failures(checks());
  expect(failed.map((f) => `${f.token} on ${f.surface} = ${f.ratio.toFixed(2)}`)).toEqual([]);
});

test('the report covers every section', () => {
  const sections = new Set(checks().map((row) => row.section));
  expect([...sections].sort()).toEqual(
    ['accent', 'ansi', 'boundary', 'decorated', 'diff', 'light', 'neutral', 'overlay',
      'status', 'syntax', 'text'],
  );
});

test('every design table has one row per token', () => {
  const tables = designTables();
  const rows = (name: string): number => tables[name]!.split('\n').length;
  expect(rows('neutral')).toBe(12);
  expect(rows('accent')).toBe(7);
  expect(rows('syntax')).toBe(9);
  expect(rows('ansi')).toBe(8);
  expect(rows('light')).toBe(11);
  expect(rows('rivals')).toBe(RIVALS.length + 1);
  expect(rows('surfaces')).toBe(RIVALS.length);
});

// Aion clears the floor on eight roles. Some rivals do too, and the old form of this
// test asserted that none of them could, which turned a measurement into a boast that a
// rival's own release could falsify. What Aion claims is the gate, not the ranking.
test('Aion clears the floor on every syntax role', () => {
  const aion = Math.min(
    ...(Object.keys(SYNTAX) as SyntaxRole[]).map((role) => contrastEmitted(ACCENTS[SYNTAX[role]], neutral.editor)),
    contrastEmitted(comment, neutral.editor),
    contrastEmitted(neutral.textSecondary, neutral.editor),
  );
  expect(aion).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
});

// Every rival value is read from a named revision. A row without one cannot be checked.
test('every rival records where its values came from', () => {
  for (const rival of RIVALS) {
    expect(rival.source, rival.name).toMatch(/^https:\/\/github\.com\//);
    expect(rival.revision, rival.name).toMatch(/^[0-9a-f]{40}$/);
    expect(rival.read, rival.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(rival.syntax), rival.name).toHaveLength(SYNTAX_ROLES_COMPARED);
    expect(measure(rival).lowest, rival.name).toBeGreaterThan(1);
  }
});

// The README used to say every other dark theme puts the sidebar below the editor. Two
// of these four use one colour for both, so the claim is a table, not a sentence.
test('the surface order of each rival is recorded, and none matches Aion', () => {
  for (const rival of RIVALS) {
    expect(surfaceOrder(rival), rival.name).not.toBe('sidebar above editor');
  }
  expect(neutral.editor[0]).toBeLessThan(neutral.sidebar[0]);
});
