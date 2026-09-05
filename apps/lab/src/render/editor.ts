import { figures } from '../figures.js';
import { TYPESCRIPT, renderCode } from './code.js';
import { icons } from './icons.js';

const activity = (['files', 'search', 'branch', 'debug', 'blocks'] as const)
  .map((name, index) => `<button class="activity-item${index === 0 ? ' is-active' : ''}"
     type="button" aria-label="${name}">${icons[name]}</button>`)
  .join('');

const tree = [
  { depth: 0, label: 'aion', kind: 'folder', open: true },
  { depth: 1, label: 'packages', kind: 'folder', open: true },
  { depth: 2, label: 'tokens.ts', kind: 'file' },
  { depth: 2, label: 'registry.ts', kind: 'file', active: true },
  { depth: 2, label: 'epoch.ts', kind: 'file', git: 'untracked' },
  { depth: 2, label: 'theme.json', kind: 'file', git: 'modified' },
  { depth: 2, label: 'legacy.ts', kind: 'file', git: 'deleted' },
  { depth: 1, label: 'README.md', kind: 'file' },
  { depth: 1, label: 'package.json', kind: 'file', git: 'conflict' },
] as const;

// VS Code's own badge letters. Conflict and deleted share coral, so the letter and the
// strike-through are what separate them; showing both here is the point of the row.
const GIT_MARK = { untracked: 'U', modified: 'M', conflict: 'C', deleted: 'D' } as const;

const explorer = tree
  .map((row) => {
    const classes = ['tree-row'];
    if (row.kind === 'folder') classes.push('is-folder');
    if ('active' in row && row.active) classes.push('is-active');
    if ('git' in row) classes.push(`is-${row.git}`);
    return `<div class="${classes.join(' ')}" style="--depth:${row.depth}">
      ${row.kind === 'folder' ? icons.caretDown : '<span class="tree-spacer"></span>'}
      <span class="tree-label">${row.label}</span>
      ${'git' in row ? `<span class="tree-git">${GIT_MARK[row.git]}</span>` : ''}
    </div>`;
  })
  .join('');

const tabs = ['epoch.ts', 'registry.ts', 'theme.json']
  .map((label, index) => `<div class="tab${index === 1 ? ' is-active' : ''}">
     <span class="tab-dot${index === 2 ? ' is-dirty' : ''}"></span>${label}${
       index === 1 ? `<span class="tab-close">${icons.close}</span>` : ''
     }</div>`)
  .join('');

const terminalPanel = `
  <div class="panel-tabs">
    <span>Problems <b class="badge-error">2</b></span>
    <span class="is-active">Terminal</span>
    <span>Output</span>
    <span>Ports</span>
  </div>
  <div class="panel-terminal">
    <div class="term-line"><span class="term-prompt">${icons.prompt}</span><span class="ansi-bright-blue">aion</span> <span class="ansi-bright-yellow">git:(</span><span class="ansi-bright-red">main</span><span class="ansi-bright-yellow">)</span> npm run verify</div>
    <div class="term-line t-comment">&gt; aion@0.1.0 verify — packages/tokens</div>
    <div class="term-line"><span class="ansi-bright-green">✓</span> states   <span class="term-dim">${figures.readingStates} reading states</span></div>
    <div class="term-line"><span class="ansi-bright-green">✓</span> contrast <span class="term-dim">${figures.passed} pass, ${figures.failed} fail, ${figures.exempt} exempt</span></div>
    <div class="term-line"><span class="ansi-bright-yellow">!</span> vsix     <span class="term-dim">SAMPLE — an invented warning</span></div>
  </div>`;

export function editorSurface(): string {
  return `
  <div class="window vscode">
    <div class="vscode-title">
      <span class="traffic"><i class="dot-red"></i><i class="dot-amber"></i><i class="dot-green"></i></span>
      <span class="vscode-title-text">registry.ts — aion</span>
    </div>
    <div class="vscode-body">
      <nav class="activity-bar">${activity}
        <button class="activity-item activity-foot" type="button" aria-label="settings">${icons.gear}</button>
      </nav>
      <aside class="side-bar">
        <h5 class="side-heading">Explorer</h5>
        <div class="tree">${explorer}</div>
        <div class="side-foot">
          <div class="side-foot-label">Contrast budget</div>
          <div class="meter"><i style="width:82%"></i></div>
        </div>
      </aside>
      <div class="vscode-main">
        <div class="tab-bar">${tabs}</div>
        <div class="breadcrumb">
          packages ${icons.chevron} core ${icons.chevron}
          <span class="t-type">registry.ts</span> ${icons.chevron}
          <span class="t-function">loadEpoch</span>
        </div>
        <div class="editor">
          ${renderCode(TYPESCRIPT)}
          <div class="find-widget">
            <span class="find-input">entry<span class="find-caret"></span></span>
            <span class="find-count">2 of 5</span>
          </div>
          <div class="hover-card">
            <div class="hover-signature"><span class="t-function">loadEpoch</span><span class="t-punctuation">(</span><span class="t-variable">id</span><span class="t-punctuation">: </span><span class="t-type">string</span><span class="t-punctuation">)</span></div>
            <p class="hover-body">Resolves an age from the registry. Throws when the identifier is unknown.</p>
            <div class="hover-tags">
              <span class="pill pill-solid">async</span>
              <span class="pill">core</span>
            </div>
          </div>
        </div>
        <div class="panel">${terminalPanel}</div>
        <div class="status-bar">
          <span class="status-branch">${icons.branch} main*</span>
          <span>↻ 0↓ 2↑</span>
          <span class="status-error">${icons.cross} 2</span>
          <span class="status-warning">${icons.warning} 5</span>
          <span class="status-spacer"></span>
          <span>Ln 13, Col 34</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span class="status-language">TypeScript</span>
          <span>${icons.bell}</span>
        </div>
      </div>
    </div>
  </div>`;
}
