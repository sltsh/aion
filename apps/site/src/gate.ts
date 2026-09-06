import { checks, readingStates } from '@sltsh/aion-tokens';

export interface GateSummary {
  readonly rowsMeasured: number;
  readonly belowFloor: number;
  readonly exemptRows: number;
  readonly readingStates: number;
  readonly lowestDecorated: string;
}

// The same derivation scripts/sync-design.mjs uses for the table in DESIGN.md and both
// READMEs. The lowest ratio is taken over the decorated rows that pass, because that is
// the worst reading state the gate covers rather than the worst row of any kind.
export function gateSummary(): GateSummary {
  const rows = checks();
  const decorated = rows.filter((row) => row.section === 'decorated' && row.state === 'pass');
  return {
    rowsMeasured: rows.length,
    belowFloor: rows.filter((row) => row.state === 'fail').length,
    exemptRows: rows.filter((row) => row.state === 'exempt').length,
    readingStates: readingStates().length,
    lowestDecorated: Math.min(...decorated.map((row) => row.ratio)).toFixed(2),
  };
}
