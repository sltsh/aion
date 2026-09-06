import { checks, designTables, failures } from './report.js';
import type { Check, CheckState } from './report.js';

const MARK: Record<CheckState, string> = { pass: 'PASS', fail: 'FAIL', exempt: 'EXMT', info: '    ' };

const pad = (value: string, width: number): string => value.padEnd(width);
const padLeft = (value: string, width: number): string => value.padStart(width);

function printChecks(rows: Check[]): void {
  const sections = [...new Set(rows.map((r) => r.section))];
  for (const section of sections) {
    const group = rows.filter((r) => r.section === section);
    console.log(`\n${section.toUpperCase()}`);
    for (const row of group) {
      const measured = row.state === 'info' ? '' : `${row.ratio.toFixed(2)}:1`;
      const floor = row.floor > 0 && row.state !== 'info' ? `floor ${row.floor.toFixed(1)}` : '';
      console.log(
        `  ${MARK[row.state]}  ${pad(row.token, 30)} ${pad(row.hex, 10)} on ${pad(row.surface, 16)} ` +
        `${pad(row.surfaceHex, 9)} ${padLeft(measured, 8)}  ${floor}`,
      );
    }
  }
}

function main(): void {
  if (process.argv.includes('--markdown')) {
    for (const [name, table] of Object.entries(designTables())) {
      console.log(`<!-- ${name} -->`);
      console.log(table);
      console.log();
    }
    return;
  }

  const rows = checks();
  printChecks(rows);

  const failed = failures(rows);
  const counted = (state: CheckState): number => rows.filter((r) => r.state === state).length;
  console.log(
    `\n${rows.length} tokens: ${counted('pass')} pass, ${counted('fail')} fail, ` +
    `${counted('exempt')} exempt, ${counted('info')} informational`,
  );

  if (failed.length > 0) {
    console.error('\nThe contrast floor is a build step. These tokens are below it:');
    for (const row of failed) {
      console.error(`  ${row.token} ${row.hex} on ${row.surface} = ${row.ratio.toFixed(2)}:1, floor ${row.floor}`);
    }
    process.exit(1);
  }
}

main();
