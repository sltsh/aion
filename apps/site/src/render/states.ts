import { buildPalette, hex, lightPalette } from '@sltsh/aion-tokens';
import { CHAPTERS, CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { toolbarOrder, stateRatios } from '../chapters/stack.js';
import { escapeHtml } from './html.js';
export function renderStates(flags: SiteFlags): string {
  const copy = CONTENT.states, chapter = CHAPTERS[3]!;
  return `<section class="chapter states-chapter" id="states" aria-labelledby="states-title" data-states data-released="${flags.released}">
    <span class="chapter-eyebrow">${chapter.number} ${chapter.title}</span><h2 id="states-title">${copy.title}</h2><p class="states-lede">${copy.lede}</p>
    ${(['dark', 'light'] as const).map(scheme => {
      const source = scheme === 'dark' ? buildPalette() : lightPalette, ratios = stateRatios(source), lowest = Math.min(...ratios.map(r => r.ratio));
      return `<div data-theme-value="${scheme}" data-state-scheme="${scheme}"><div class="states-code" tabindex="0" role="region" aria-label="${copy.codeLabel}">${copy.code.map((line, i) => `<div class="states-code-row" data-state-line="${i}"><span class="states-line-number" aria-hidden="true">${i+4}</span><code>${line.map(([role, text]) => `<span data-role="${role}">${escapeHtml(text)}</span>`).join('')}</code></div>`).join('')}</div>
      <div class="states-toolbar" role="group" aria-label="${copy.toolbar}">${toolbarOrder.map(layer => `<button type="button" data-state-toggle="${layer}" aria-pressed="false" disabled><i style="background:var(--o-${layer.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())})" aria-hidden="true"></i>${copy.labels[layer as keyof typeof copy.labels]}</button>`).join('')}</div><div class="states-meters">${ratios.map(({ role, ratio }) => `<div class="states-meter" data-state-meter="${role}" data-lowest="${ratio===lowest}"><div class="states-meter-heading"><span><i style="background:var(--s-${role})" aria-hidden="true"></i>${role}</span><span class="states-delta" data-state-delta></span></div><b data-state-value data-value="${ratio}">${ratio.toFixed(2)}:1</b><div class="states-meter-bar"><i data-state-fill style="width:${Math.min(100,(ratio-1)/11*100)}%;background:var(--s-${role})"></i><span class="states-floor" title="${copy.floor}"></span></div><small data-state-lowest>${ratio===lowest?copy.lowest:''}</small></div>`).join('')}</div>
      <div class="states-bghex"><i data-state-bg-swatch style="background:var(--n-editor)" aria-hidden="true"></i><span>${copy.background}</span> <span data-state-bghex>${hex(source.neutral.editor)}</span></div></div>`;
    }).join('')}

    <p class="states-note" data-state-note>${copy.empty}</p><p class="states-reasons" id="states-reasons" data-state-reasons role="status" aria-live="polite"></p><p class="states-caption">${copy.caption}</p><noscript><p>${copy.noScript}</p></noscript>
  </section>`;
}
