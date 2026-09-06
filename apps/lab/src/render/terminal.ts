import { exemptRows, figures } from '../figures.js';
import { icons } from './icons.js';

const SLOTS = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'bright-black', 'bright-red', 'bright-green', 'bright-yellow',
  'bright-blue', 'bright-magenta', 'bright-cyan', 'bright-white',
] as const;

const palette = SLOTS.map(
  (slot) => `<span class="ansi-chip ansi-${slot}"><i class="ansi-swatch ansi-bg-${slot}"></i>${slot}</span>`,
).join('');

// The line preserves whitespace, so the prompt must be emitted without a line break.
const prompt = (command: string): string =>
  '<div class="term-line">'
  + `<span class="term-prompt">${icons.prompt}</span>`
  + '<span class="ansi-bright-blue">~/dev/aion</span> '
  + '<span class="ansi-bright-yellow">git:(</span>'
  + '<span class="ansi-bright-red">design/palette</span>'
  + '<span class="ansi-bright-yellow">)</span> '
  + `<span class="ansi-bright-white">${command}</span>`
  + '</div>';

const listing = [
  ['ansi-bright-blue', 'packages/'],
  ['ansi-bright-blue', 'apps/'],
  ['ansi-bright-green', 'build.sh'],
  ['ansi-bright-white', 'DESIGN.md'],
  ['ansi-bright-white', 'PLAN.md'],
  ['ansi-bright-cyan', 'aion.css'],
  ['ansi-bright-magenta', 'tokens.json'],
  ['ansi-bright-black', 'node_modules/'],
]
  .map(([cls, name]) => `<span class="${cls}">${name}</span>`)
  .join('  ');

export function terminalSurface(): string {
  return `
  <div class="window terminal">
    <div class="terminal-tabs">
      <span class="terminal-tab is-active">${icons.prompt} pwsh</span>
      <span class="terminal-tab">${icons.branch} bash</span>
      <span class="terminal-tab">${icons.blocks} wsl</span>
      <span class="terminal-add">+</span>
      <span class="terminal-caret">${icons.caretDown}</span>
    </div>
    <div class="terminal-body">
      ${prompt('ls')}
      <div class="term-line term-listing">${listing}</div>
      ${prompt('npm run verify')}
      <div class="term-line t-comment">&gt; aion@0.1.0 verify</div>
      <div class="term-line"><span class="ansi-bright-green">✓</span> text      <span class="ansi-white">${figures.gated} checks</span> <span class="ansi-bright-black">min ${figures.textLowest}</span></div>
      <div class="term-line"><span class="ansi-bright-green">✓</span> syntax    <span class="ansi-white">${figures.readingStates} states</span>  <span class="ansi-bright-black">min ${figures.decoratedLowest}</span></div>
      <div class="term-line"><span class="ansi-bright-yellow">!</span> exempt    <span class="ansi-white">${figures.exempt} checks</span>  <span class="ansi-bright-black">${exemptRows.map((row) => row.token).join(', ')}</span></div>
      ${prompt('node dist/verify.js --strict')}
      <div class="term-line"><span class="ansi-bright-red">error</span><span class="ansi-white">: SAMPLE — an invented failure, to show the error colours</span></div>
      <div class="term-line ansi-bright-black">  the real gate reports ${figures.failed} failures</div>
      <div class="term-line"><span class="term-prompt">${icons.prompt}</span><span class="ansi-bright-blue">~/dev/aion</span> <span class="caret"></span></div>
    </div>
    <div class="terminal-palette">${palette}</div>
  </div>`;
}
