import type { SiteFlags } from '../flags.js';
import type { Group, SwatchData } from '../groups.js';
import { escapeHtml } from './html.js';

const PREFIX = '--aion-';

const shortName = (variable: string): string =>
  variable.startsWith(PREFIX) ? variable.slice(PREFIX.length) : variable;

// Four dark values carry an alpha byte. The chip sits on the site's own surface, which is
// one step above the editor, so painting the value straight onto it would composite a
// decoration over a background the gate never measured. The chip lays the value over the
// page colour instead, and that is the surface the ratio was read on.
export function swatch(data: SwatchData, flags: SiteFlags): string {
  const name = escapeHtml(data.variable);
  const lightAttr = flags.lightVisible ? ` data-light="${data.light}"` : '';
  return `<button type="button" class="swatch" data-copy data-dark="${data.dark}"${lightAttr} title="${name}">
    <span class="swatch-chip" style="--site-swatch:var(${name})"></span>
    <span class="swatch-meta">
      <code class="swatch-name">${escapeHtml(shortName(data.variable))}</code>
      <code class="swatch-hex">${data.dark}</code>
    </span>
  </button>`;
}

export function swatchGrid(group: Group, flags: SiteFlags): string {
  return `<div class="swatch-grid">${group.swatches.map((s) => swatch(s, flags)).join('')}</div>`;
}
