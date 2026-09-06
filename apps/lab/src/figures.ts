import { CONTRAST_FLOOR, checks, readingStates } from '@sltsh/aion-tokens';
import type { Check, CheckState } from '@sltsh/aion-tokens';

const rows = checks();
const count = (state: CheckState): number => rows.filter((row) => row.state === state).length;
const lowest = (section: string): number =>
  Math.min(...rows.filter((row) => row.section === section && row.state === 'pass').map((row) => row.ratio));
const ratio = (value: number): string => `${value.toFixed(2)}:1`;

// The lab quotes these on a surface. They come from the same `checks()` the build gate
// runs, so a palette change moves the copy with it. A figure the lab invents to fill a
// mock UI carries the word SAMPLE, and a test counts those.
export const figures = {
  floor: `${CONTRAST_FLOOR.toFixed(1)}:1`,
  gated: rows.length,
  passed: count('pass'),
  failed: count('fail'),
  exempt: count('exempt'),
  readingStates: readingStates().length,
  textLowest: ratio(lowest('text')),
  decoratedLowest: ratio(lowest('decorated')),
} as const;

export const exemptRows: readonly Check[] = rows.filter((row) => row.state === 'exempt');

const SECTIONS = [...new Set(rows.map((row) => row.section))]
  .filter((section) => rows.some((row) => row.section === section && row.state === 'pass'));

// The dashboard used to draw twelve invented bars and claim the gate had not been below
// the floor since 0.0.9. There is no such record. These are the sections the gate has and
// the lowest ratio each one produced, which is a figure the run can actually support.
export const sections: readonly { name: string; count: number; lowest: number }[] =
  SECTIONS.map((name) => ({
    name,
    count: rows.filter((row) => row.section === name).length,
    lowest: lowest(name),
  }));

// The passing row with the least room left in each section: the pairs a palette change
// would break first. The Pairs table used to hardcode six, one of them a failure the gate
// never produced.
export const tightest: readonly Check[] = SECTIONS
  .map((name) => rows
    .filter((row) => row.section === name && row.state === 'pass')
    .sort((a, b) => (a.ratio - a.floor) - (b.ratio - b.floor))[0]!)
  .sort((a, b) => (a.ratio - a.floor) - (b.ratio - b.floor))
  .slice(0, 6);
