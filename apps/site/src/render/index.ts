import type { SiteFlags } from '../flags.js';
import { INSTALL, PITCH, UNRELEASED_NOTE } from '../content.js';
import { gateSummary } from '../gate.js';
import { essentials, groups } from '../groups.js';
import { renderHero } from '../samples/hero.js';
import { escapeAttr, escapeHtml } from './html.js';
import { icon } from './icons.js';
import { copyColours, copyIndicator, swatchGrid } from './swatch.js';

const REPO = 'https://github.com/sltsh/aion';

type Page = 'home' | 'palette';

const themedImage = (className: string, dark: string, light: string, label: string, width: number, height: number): string =>
  `<span class="theme-image ${className}"${label ? ` role="img" aria-label="${escapeAttr(label)}"` : ''}><img data-theme-asset="dark" src="${dark}" alt="" width="${width}" height="${height}"><img data-theme-asset="light" src="${light}" alt="" width="${width}" height="${height}"></span>`;

const chrome = (current: Page): string => `<a class="skip-link" href="#content">Skip to content</a>
  <header class="site-head">
    <a class="mark" href="${current === 'home' ? '#overview' : '/#overview'}" aria-label="Aion home">${themedImage('mark-image', '/icon.png', '/icon-light.png', '', 44, 44)}</a>
    <nav class="site-nav" aria-label="Main navigation">
      <a href="${current === 'home' ? '#overview' : '/#overview'}"${current === 'home' ? ' data-section="overview" aria-current="location"' : ''}>Overview</a>
      <a href="${current === 'home' ? '#essentials' : '/#essentials'}"${current === 'home' ? ' data-section="essentials"' : ''}>Colours</a>
      <a href="${current === 'home' ? '#install' : '/#install'}"${current === 'home' ? ' data-section="install"' : ''}>Install</a>
      <a href="${current === 'palette' ? '#content' : '/palette.html'}"${current === 'palette' ? ' aria-current="page"' : ''}>Palette</a>
    </nav>
    <button type="button" class="theme-toggle" data-theme-toggle hidden aria-label="Use light theme" title="Use light theme"><span data-theme-icon="light">${icon('sun')}</span><span data-theme-icon="dark">${icon('moon')}</span></button>
    <a class="source-link" href="${REPO}" aria-label="Aion on GitHub" title="Aion on GitHub">${icon('github')}</a>
  </header>`;

const footer = (): string => `<footer class="site-foot">
  <div class="footer-intro">${themedImage('footer-wordmark', '/aion-wordmark.webp', '/aion-wordmark-light.webp', 'Aion', 144, 48)}<span>Gold, teal, and room to focus.</span></div>
  <nav class="footer-links" aria-label="Footer navigation">
    <a href="/palette.html"><span>Explore the palette<small>Find your colours</small></span>${icon('arrow')}</a>
    <a href="${REPO}"><span>GitHub<small>Source & contributions</small></span>${icon('external')}</a>
    <a href="${REPO}/blob/main/DESIGN.md"><span>Design notes<small>The thinking behind the theme</small></span>${icon('external')}</a>
  </nav>
  <div class="footer-meta"><span>Open source. MIT licensed.</span><span>Archivo & Monaspace Neon · SIL Open Font License 1.1</span></div>
</footer>`;

const link = (href: string, text: string): string =>
  `<a class="text-link" href="${href}">${escapeHtml(text)}${icon('arrow')}</a>`;

function renderEssentials(): string {
  const rows = essentials();
  return `<section class="essentials section" id="essentials" aria-labelledby="essentials-title">
    <span id="manual" class="anchor-alias" aria-hidden="true"></span>
    <div class="section-heading"><div><h2 id="essentials-title">Make it yours.</h2>
      <p>The essentials for bringing Aion to another app.<br>Click a colour to copy its hex, or take the whole set.</p></div>
      ${copyColours(rows)}</div>
    <div class="essentials-foundations">${swatchGrid(rows.slice(0, 4))}</div>
    <div class="essentials-colours">${swatchGrid(rows.slice(4))}</div>
    <a class="palette-link" href="/palette.html"><span><strong>Explore the palette</strong><span>Colour roles, terminal colours, and everything you need to get started.</span></span>${icon('arrow')}</a>
  </section>`;
}

function install(flags: SiteFlags): string {
  const cards = INSTALL.map((entry) => {
    const terminal = entry.id === 'terminal';
    const useInstallCommand = flags.released || entry.id === 'vscode';
    const command = useInstallCommand ? entry.command : entry.localCommand;
    const note = flags.released && entry.id === 'vscode'
      ? 'Familiar syntax, gold focus accents, and no italics. Install the extension, then select Aion as your colour theme.'
      : flags.released && entry.id === 'css'
        ? 'The same palette for your own interfaces. CSS custom properties and a Tailwind theme, ready to import.'
        : entry.note;
    return `<li class="install-card">
      <h3>${escapeHtml(entry.label)}</h3><p>${escapeHtml(note)}</p>
      <div class="command-block"><div class="command-head"><span>${terminal ? 'Destination folder' : useInstallCommand ? 'Install command' : 'Run from the repository'}</span>
        <button type="button" class="copy-button" data-copy data-text="${escapeAttr(command)}" aria-label="Copy ${escapeAttr(entry.label)} ${terminal ? 'folder' : 'command'}">${copyIndicator()}Copy</button></div>
        <pre><code>${escapeHtml(command)}</code></pre></div>
      <div class="install-action"><a class="${terminal ? 'button' : 'text-link'}" href="${entry.href}"${terminal ? ' download="aion.json"' : ''}>${escapeHtml(entry.action)}${icon(terminal ? 'download' : 'arrow')}</a></div>
    </li>`;
  }).join('');
  return `<section class="install section" id="install" aria-labelledby="install-title">
    <div class="section-heading"><div><h2 id="install-title">Aion, in your workspace.</h2><p>Choose your app. Bring the same colours with you.</p></div></div>
    ${flags.released ? '' : `<p class="release-note">${escapeHtml(UNRELEASED_NOTE)} ${link(REPO, 'Get the source')}</p>`}
    <ul class="install-list">${cards}</ul>
    <p class="package-note">Working directly with colour? ${link(`${REPO}/tree/main/packages/tokens`, 'Explore the token package')}</p>
  </section>`;
}

export function landing(flags: SiteFlags): string {
  const summary = gateSummary();
  return `${chrome('home')}<article class="landing" id="content">
    <section class="hero" id="overview">
      <h1>${themedImage('hero-brand', '/aion-lockup-horizontal.webp', '/aion-lockup-horizontal-light.webp', 'Aion', 1440, 480)}</h1>
      <p class="hero-pitch">${escapeHtml(PITCH)}</p>
      <p class="hero-detail">Gold accents. Cool surfaces. Familiar syntax. No italics.</p>
      <div class="actions"><a class="button" href="#install">Get Aion ${icon('download')}</a><a class="button secondary" href="#essentials">Find your colours ${icon('arrow')}</a></div>
    </section>
    <figure class="editor" id="sample">
      <figcaption class="editor-bar"><span class="editor-tab">gate.ts</span><span>TypeScript <span class="editor-badge">Aion</span></span></figcaption>
      <div class="editor-body">${renderHero()}</div>
      <div class="editor-foot"><span>Familiar syntax. No italics.</span><span>One palette, every surface.</span></div>
    </figure>
    ${renderEssentials()}
    ${install(flags)}
    <section class="gate section" id="design">
      <div><h2>Colour with a purpose.</h2><p>Readable text, clear focus, and decorations that keep code legible.
      Aion checks contrast across a named set of reading states. It doesn’t claim to cover every state an app can produce.</p>
      ${link(`${REPO}/blob/main/DESIGN.md`, 'Read the design notes')}</div>
      <dl class="figures"><div><dt>${summary.rowsMeasured}</dt><dd>pairings measured</dd></div><div><dt>${summary.lowestDecorated}:1</dt><dd>lowest contrast in the covered reading states</dd></div></dl>
    </section>
  </article>${footer()}<p class="copy-status" role="status" aria-live="polite"></p>`;
}

export function palette(): string {
  const all = groups();
  const sections = all.map((group) => `<section class="palette-group" id="${group.id}" aria-labelledby="${group.id}-title">
    <div class="section-heading"><div><h2 id="${group.id}-title">${group.title}</h2><p>${escapeHtml(group.description)}</p></div>${copyColours(group.swatches, `Copy ${group.title.toLowerCase()}`)}</div>
    ${group.id === 'terminal' ? `<h3 class="set-label">Standard <span>Slots 0–7</span></h3>${swatchGrid(group.swatches.slice(0, 8))}<h3 class="set-label">Bright <span>Slots 8–15</span></h3>${swatchGrid(group.swatches.slice(8))}
      <p class="terminal-note">Use Background and Text from Foundations for the terminal’s default colours. <span data-theme-value="dark">ANSI black (slot 0) is intended as a background; applications using it as foreground text may be hard to read.</span><span data-theme-value="light">In the light scheme, ANSI black (slot 0) is intended as foreground text; its dark-scheme background guarantee does not carry over.</span></p>
      ${link('/#install', 'Get the Windows Terminal dark theme')}` : swatchGrid(group.swatches)}
  </section>`).join('');
  return `${chrome('palette')}<article class="palette" id="content">
    <header class="page-head"><h1>A palette to make<br>your own.</h1><p class="lede">The colours that make Aion, with names that tell you where they belong.<br>Click any swatch to copy its hex.</p></header>
    <div class="palette-layout"><nav class="jump" aria-label="Palette sections">${all.map((group, index) => `<a href="#${group.id}" data-section="${group.id}"${index === 0 ? ' aria-current="location"' : ''}><span>${group.title}</span><span class="nav-count">${group.swatches.length}</span></a>`).join('')}</nav>
    <div class="palette-sections">${sections}
      <aside class="developer-note"><h2>Building something deeper?</h2><p>Component states, selections, diff overlays, and the full neutral ramp live in the technical reference. They’re specific to how an interface renders.</p>${link(`${REPO}/tree/main/packages/css`, 'CSS & token reference')}${link(`${REPO}/blob/main/DESIGN.md`, 'Colour specification')}</aside>
    </div></div>
  </article>${footer()}<p class="copy-status" role="status" aria-live="polite"></p>`;
}
