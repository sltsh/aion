import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const HEADERS = {
  gate: '| What the gate checks | Count |',
  states: '| State | Background | Worst foreground | Ratio |',
  rivals: '| Theme | Lowest ratio | Below 4.5:1 | Source |',
  surfaces: '| Theme | Editor | Sidebar | Order |',
  listing: '| | Hex | | | Hex |',
  slots: '| # | Slot | Hex | # | Slot | Hex |',
  neutral: '| Step | Role | Lightness | Hex | Ratio |',
  accent: '| Accent | Hue | Chroma | Solid | Border | Subtle | Ratio |',
  syntax: '| Role | Accent | Hex | One Dark Pro hue | Aion hue | Drift | Ratio |',
  overlay: '| Token | Value | Alpha |',
  diff: '| Token | Hex | Lightness |',
  ansi: '| # | Slot | Hex | Ratio | | # | Slot | Hex | Ratio |',
  light: '| Role | Hex | | Accent | Hex | Ratio |',
};

// Every document that quotes a generated number reads it from here, so listing copy
// cannot drift from the emitter the way the 4.61 in the READMEs did.
const DOCUMENTS = [
  ['DESIGN.md', ['gate', 'states', 'rivals', 'surfaces', 'neutral', 'accent', 'syntax',
    'overlay', 'diff', 'ansi', 'light']],
  ['README.md', ['gate', 'rivals', 'surfaces']],
  ['packages/vscode/README.md', ['gate', 'rivals', 'listing']],
  ['packages/terminal/README.md', ['slots']],
];

const emitted = execFileSync('node', ['packages/tokens/dist/verify.js', '--markdown'], { encoding: 'utf8' });

const tables = {};
let current = null;
for (const line of emitted.split('\n')) {
  const marker = line.match(/^<!-- (\w+) -->$/);
  if (marker) { current = marker[1]; tables[current] = []; continue; }
  if (current && line.startsWith('|')) tables[current].push(line);
}

// The counts every document quotes. They are read from the gate and from the emitted
// theme, never typed: the prose said 630 interface keys, 54 TextMate rules and 25 covered
// states while the code produced 622, 64 and 35.
const { checks, readingStates } = await import('../packages/tokens/dist/index.js');
const theme = JSON.parse(readFileSync('packages/vscode/themes/aion.json', 'utf8'));
const rows = checks();
const count = (state) => rows.filter((row) => row.state === state).length;
const lowest = Math.min(...rows.filter((row) => row.section === 'decorated' && row.state === 'pass')
  .map((row) => row.ratio));

tables.gate = [
  `| Rows measured | ${rows.length} |`,
  `| Below their floor | ${count('fail')} |`,
  `| Exempt rows, all documented | ${count('exempt')} |`,
  `| Reading states per syntax colour | ${readingStates().length} |`,
  `| Lowest ratio in a reading state | ${lowest.toFixed(2)}:1 |`,
  `| Interface keys the theme sets | ${Object.keys(theme.colors).length} |`,
  `| TextMate rules | ${theme.tokenColors.length} |`,
  `| Semantic tokens | ${Object.keys(theme.semanticTokenColors).length} |`,
];

const missing = Object.keys(HEADERS).filter((name) => !tables[name]);
if (missing.length > 0) throw new Error(`no emitted table for: ${missing.join(', ')}`);

for (const [path, wanted] of DOCUMENTS) {
  const file = new URL(`../${path}`, import.meta.url);
  const lines = readFileSync(file, 'utf8').split('\n');
  const output = [];
  let replaced = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const name = wanted.find((key) => HEADERS[key] === line);
    if (!name) { output.push(line); continue; }
    output.push(line, lines[i + 1]);
    let j = i + 2;
    while (j < lines.length && lines[j].startsWith('|')) j += 1;
    output.push(...tables[name]);
    replaced += 1;
    i = j - 1;
  }

  if (replaced !== wanted.length) {
    throw new Error(`matched ${replaced} of ${wanted.length} tables in ${path}`);
  }
  writeFileSync(file, output.join('\n'));
  console.log(`${path}: ${replaced} tables regenerated from the token package`);
}
