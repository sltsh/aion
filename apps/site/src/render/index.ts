import { dark } from '@sltsh/aion-css';
import { ACCENT_NAMES } from '@sltsh/aion-tokens';
import type { SiteFlags } from '../flags.js';
import {
  CONVENTIONS, INSTALL, LIGHT_NOTE, MANUAL_INTRO, MANUAL_RULES, PALETTE_INTRO, PITCH,
  PRINCIPLES, UNRELEASED_NOTE,
} from '../content.js';
import { gateSummary } from '../gate.js';
import { groups } from '../groups.js';
import type { GroupId } from '../groups.js';
import { ANSI_SLOTS, ansiBlock, ansiRows, coreBlock, coreRows } from '../manual.js';
import { renderHero } from '../samples/hero.js';
import { renderAccents, renderRamp } from '../tables.js';
import { escapeAttr, escapeHtml } from './html.js';
import { swatchGrid } from './swatch.js';

const REPO = 'https://github.com/sltsh/aion';

const EXTRA: Partial<Record<GroupId, () => string>> = {
  surface: renderRamp,
  accent: renderAccents,
};

type Page = 'home' | 'palette';

const NAV: readonly (readonly [label: string, href: string, page: Page | undefined])[] = [
  ['Palette', '/palette.html', 'palette'],
  ['Install', '/#install', undefined],
  ['Any other app', '/#manual', undefined],
  ['Source', REPO, undefined],
];

const chrome = (current: Page): string => {
  const links = NAV.map(([label, href, page]) => {
    const mark = page === current ? ' aria-current="page"' : '';
    return `<a href="${href}"${mark}>${escapeHtml(label)}</a>`;
  }).join('');
  return `<header class="site-head">
    <a class="mark" href="/">Aion</a>
    <nav class="site-nav">${links}</nav>
  </header>`;
};

const footer = (): string => `<footer class="site-foot">
  <p><a href="${REPO}">Source</a> · <a href="/palette.html">Palette</a> · <a href="${REPO}/blob/main/DESIGN.md">Design notes</a></p>
  <p class="note">Archivo and Monaspace Neon are used under the SIL Open Font License 1.1.</p>
</footer>`;

const accentStrip = (): string => {
  const bars = ACCENT_NAMES.map((name) =>
    `<span class="strip-bar" style="--site-swatch:var(--aion-${name}-solid)" title="${name}"></span>`).join('');
  return `<a class="strip" href="/palette.html#accent" aria-label="See the palette">${bars}</a>`;
};

const copyBlock = (id: string, title: string, text: string): string => `<div class="block">
  <div class="block-head">
    <h3>${escapeHtml(title)}</h3>
    <button type="button" class="copy-button" data-copy data-text="${escapeAttr(text)}">Copy</button>
  </div>
  <pre id="${id}"><code>${escapeHtml(text)}</code></pre>
</div>`;

function manual(): string {
  const core = coreRows().map((row) => `<tr>
    <td class="cell-bar"><span class="bar" style="--site-swatch:var(${row.variable})"></span></td>
    <td>${escapeHtml(row.role)}</td>
    <td><code>${row.hex}</code></td>
    <td class="note">${escapeHtml(row.note)}</td>
  </tr>`).join('');

  const ansi = ansiRows().map((row) => `<li>
    <span class="bar" style="--site-swatch:var(${row.variable})"></span>
    <code class="slot">${row.slot}</code>
    <code class="slot-name">${escapeHtml(row.name)}</code>
    <code class="slot-hex">${row.hex}</code>
  </li>`).join('');

  return `<section class="manual" id="manual">
    <div class="band">
      <h2>Any other app</h2>
      <p class="lede">${escapeHtml(MANUAL_INTRO)}</p>
    </div>
    <div class="manual-grid">
      <div>
        <h3>The colours every app asks for</h3>
        <table class="roles"><tbody>${core}</tbody></table>
      </div>
      <div>
        <h3>The sixteen ANSI slots</h3>
        <ol class="ansi-list">${ansi}</ol>
      </div>
    </div>
    <div class="blocks">
      ${copyBlock('manual-core', 'Core colours', coreBlock())}
      ${copyBlock('manual-ansi', 'ANSI slots', ansiBlock())}
    </div>
    <h3>Four things to keep</h3>
    <ol class="rules">${MANUAL_RULES.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ol>
  </section>`;
}

export function landing(flags: SiteFlags): string {
  const summary = gateSummary();
  const figures: readonly (readonly [string, string])[] = [
    [String(summary.rowsMeasured), 'pairings measured'],
    [String(summary.belowFloor), 'below their floor'],
    [String(summary.readingStates), 'reading states per syntax colour'],
    [`${summary.lowestDecorated}:1`, 'worst ratio in any of them'],
  ];

  const principles = PRINCIPLES.map((p) => `<li>
    <h3>${escapeHtml(p.title)}</h3>
    <p>${escapeHtml(p.body)}</p>
  </li>`).join('');

  const install = INSTALL.map((entry) => `<li>
    <h3>${escapeHtml(entry.label)}</h3>
    <pre><code>${escapeHtml(entry.command)}</code></pre>
    <p>${escapeHtml(entry.note)}</p>
  </li>`).join('');

  return `${chrome('home')}
  <article class="landing">
    <section class="hero">
      <h1>Aion</h1>
      <p class="lede">${escapeHtml(PITCH)}</p>
      <p class="actions">
        <a class="button" href="/palette.html">See the palette</a>
        <a class="button ghost" href="#install">Install</a>
      </p>
      ${accentStrip()}
    </section>

    <figure class="editor" id="sample">
      <figcaption class="editor-bar">
        <span class="editor-title">gate.ts</span>
      </figcaption>
      <div class="editor-body">${renderHero()}</div>
    </figure>

    <section class="principles">
      <ul class="card-list">${principles}</ul>
    </section>

    <section class="gate" id="gate">
      <div class="band">
        <h2>The floor is a gate, not a claim</h2>
        <p class="lede">The check runs in CI on every branch and exits non-zero on a colour
        below its floor, so a colour that fails cannot ship. It covers a named set of reading
        states, not every state a renderer can produce.</p>
      </div>
      <dl class="figures">${figures.map(([value, label]) =>
        `<div><dt>${value}</dt><dd>${escapeHtml(label)}</dd></div>`).join('')}</dl>
    </section>

    <section class="install" id="install">
      <div class="band">
        <h2>Install</h2>
        ${flags.released ? '' : `<p class="note">${escapeHtml(UNRELEASED_NOTE)}</p>`}
      </div>
      <ul class="install-list">${install}</ul>
    </section>

    ${manual()}
  </article>
  ${footer()}`;
}

export function palette(flags: SiteFlags): string {
  const all = groups();

  const jump = all.map((group) =>
    `<a href="#${group.id}">${escapeHtml(group.title)}</a>`).join('');

  const sections = all.map((group) => {
    const extra = EXTRA[group.id];
    return `<section class="group" id="${group.id}">
      <div class="group-head">
        <h2>${escapeHtml(group.title)}</h2>
        <p class="convention">${escapeHtml(CONVENTIONS[group.id])}</p>
      </div>
      ${swatchGrid(group, flags)}
      ${extra === undefined ? '' : extra()}
    </section>`;
  }).join('');

  const toggle = flags.lightVisible
    ? `<p class="actions"><button type="button" class="toggle" data-scheme-toggle>Light</button></p>
       <p class="note">${escapeHtml(LIGHT_NOTE)}</p>`
    : '';

  const counts: readonly (readonly [string, string])[] = [
    [String(Object.keys(dark()).length), 'variables'],
    [String(ACCENT_NAMES.length), 'accent hues'],
    [String(ANSI_SLOTS.length), 'ANSI slots'],
  ];

  return `${chrome('palette')}
  <article class="palette">
    <header class="page-head">
      <h1>The palette</h1>
      <p class="lede">${escapeHtml(PALETTE_INTRO)}</p>
      <dl class="figures small">${counts.map(([value, label]) =>
        `<div><dt>${value}</dt><dd>${escapeHtml(label)}</dd></div>`).join('')}</dl>
      ${toggle}
    </header>
    <nav class="jump">${jump}</nav>
    ${sections}
  </article>
  ${footer()}`;
}
