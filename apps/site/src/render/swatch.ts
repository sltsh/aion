import type { SiteFlags } from '../flags.js';
import type { SwatchData } from '../groups.js';
import { colourBlock } from '../groups.js';
import { escapeAttr, escapeHtml } from './html.js';
import { icon } from './icons.js';

export const copyIndicator = (): string =>
  `<span class="copy-indicator"><span class="copy-icon">${icon('copy')}</span><span class="copy-check">${icon('check')}</span></span>`;

export function swatch(data: SwatchData, flags: SiteFlags): string {
  const lightAttr = flags.lightVisible ? ` data-light="${data.light}"` : '';
  return `<button type="button" class="swatch" data-copy data-dark="${data.dark}"${lightAttr} aria-label="Copy ${escapeAttr(data.label)}" title="${escapeAttr(data.variable)}">
    <span class="swatch-chip" style="--site-swatch:var(${data.variable})"><span class="swatch-copy">${icon('copy')}</span></span>
    <span class="swatch-meta"><span class="swatch-name">${escapeHtml(data.label)}</span><span class="swatch-value"><code class="swatch-hex">${data.dark}</code><span class="swatch-check">${icon('check')}</span></span></span>
    <span class="swatch-role">${escapeHtml(data.role)}</span>
  </button>`;
}

export const swatchGrid = (rows: readonly SwatchData[], flags: SiteFlags): string =>
  `<div class="swatch-grid">${rows.map((row) => swatch(row, flags)).join('')}</div>`;

export const copyColours = (rows: readonly SwatchData[], flags: SiteFlags, label = 'Copy all'): string =>
  `<button type="button" class="copy-button" data-copy data-dark="${escapeAttr(colourBlock(rows, 'dark'))}"${flags.lightVisible ? ` data-light="${escapeAttr(colourBlock(rows, 'light'))}"` : ''}>${copyIndicator()}${escapeHtml(label)}</button>`;
