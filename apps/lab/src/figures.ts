import { CONTRAST_FLOOR, checks, readingStates } from '@sltio/aion-tokens';
import type { Check, CheckState } from '@sltio/aion-tokens';

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
