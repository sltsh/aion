import type { SiteFlags } from '../flags.js';
import { FLAGS } from '../flags.js';
import { CONTENT } from '../content.js';
import { groups } from '../groups.js';
import { escapeHtml } from './html.js';
import { copyColours, swatchGrid } from './swatch.js';
import { renderHeader, renderFooter, link, REPO } from './shell.js';
import { renderChip } from './chip.js';

export function palette(flags: SiteFlags = FLAGS): string {
  const all = groups();
  const sections = all.map((group) => `<section class="palette-group" id="${group.id}" aria-labelledby="${group.id}-title">
    <div class="section-heading"><div><h2 id="${group.id}-title">${group.title}</h2><p>${escapeHtml(group.description)}</p></div>${copyColours(group.swatches, `Copy ${group.title.toLowerCase()}`)}</div>
    ${group.id === 'terminal' ? `<h3 class="set-label">Standard <span>Slots 0–7</span></h3>${swatchGrid(group.swatches.slice(0, 8))}<h3 class="set-label">Bright <span>Slots 8–15</span></h3>${swatchGrid(group.swatches.slice(8))}
      <p class="terminal-note">Use Background and Text from Foundations for the terminal’s default colours. <span data-theme-value="dark">ANSI black (slot 0) is intended as a background; applications using it as foreground text may be hard to read.</span><span data-theme-value="light">In the light scheme, ANSI black (slot 0) is intended as foreground text; its dark-scheme background guarantee does not carry over.</span></p>
      ${link('/#install', 'Get the Windows Terminal dark theme')}` : swatchGrid(group.swatches)}
  </section>`).join('');
  return `${renderHeader('palette', flags, 'live')}<main class="palette" id="content">
    <header class="page-head"><h1>A palette to make<br>your own.</h1><p class="lede">The colours that make Aion, with names that tell you where they belong.<br>${CONTENT.copyHint}</p></header>
    <div class="palette-layout"><nav class="jump" aria-label="Palette sections">${all.map((group, index) => `<a href="#${group.id}" data-section="${group.id}"${index === 0 ? ' aria-current="location"' : ''}><span>${group.title}</span><span class="nav-count">${group.swatches.length}</span></a>`).join('')}</nav>
    <div class="palette-sections">${sections}
      <aside class="developer-note"><h2>Building something deeper?</h2><p>Component states, selections, diff overlays, and the full neutral ramp live in the technical reference. They’re specific to how an interface renders.</p>${link(`${REPO}/tree/main/packages/css`, 'CSS & token reference')}${link(`${REPO}/blob/main/DESIGN.md`, 'Colour specification')}</aside>
    </div></div>
  </main>${renderFooter(flags)}${renderChip()}<p class="copy-status" role="status" aria-live="polite"></p>`;
}
