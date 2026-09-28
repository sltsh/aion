import { buildPalette, hex, lightPalette, stackBackground } from '@sltsh/aion-tokens';
import { CHAPTERS, CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { TOOLBAR, PLACEMENT, expandSpan, placementRatios } from '../chapters/placement.js';
import { escapeHtml } from './html.js';
export function stateFragments(line: number): { role: string; text: string; from: number; to: number }[] {
  const boundaries = Object.values(PLACEMENT).flat().filter(span => span.line === line).flatMap(span => {
    const { from, to } = expandSpan(span); return [from, to];
  });
  let offset = 0;
  return CONTENT.states.code[line]!.flatMap(([role, text]) => {
    const start = offset, end = offset + text.length; offset = end;
    const points = [...new Set([start, end, ...boundaries.filter(point => point > start && point < end)])].sort((a, b) => a-b);
    return points.slice(0, -1).map((from, index) => ({ role, from, to: points[index+1]!, text: text.slice(from-start, points[index+1]!-start) }));
  });
}
export function renderStates(flags: SiteFlags): string {
  const copy = CONTENT.states, chapter = CHAPTERS[3]!;
  return `<section class="chapter states-chapter" id="states" aria-labelledby="states-title" data-states data-released="${flags.released}">
    <span class="chapter-eyebrow">${chapter.number} ${chapter.title}</span><h2 id="states-title">${copy.title}</h2><p class="states-lede">${copy.lede}</p>
    ${(['dark', 'light'] as const).map(scheme => {
      const source = scheme === 'dark' ? buildPalette() : lightPalette, ratios = placementRatios(source, new Set()), lowest = Math.min(...ratios.map(r => r.ratio));
      return `<div data-theme-value="${scheme}" data-state-scheme="${scheme}"><div class="states-code" tabindex="0" role="region" aria-label="${copy.codeLabel}">${copy.code.map((_, i) => `<div class="states-code-row" data-state-line="${i}"><span class="states-line-number" aria-hidden="true">${i+1}</span><code>${stateFragments(i).map(({ role, text, from, to }) => `<span data-state-fragment data-line="${i}" data-from="${from}" data-to="${to}" data-layers="" data-role="${role}">${escapeHtml(text)}</span>`).join('')}</code></div>`).join('')}</div>
      <div class="states-toolbar" role="group" aria-label="${copy.toolbar}">${TOOLBAR.map(layer => `<button type="button" data-state-toggle="${layer}" aria-pressed="false" disabled><i style="background:${hex(stackBackground(source, source.neutral.editor, [layer === 'mergeConflict' ? 'mergeCurrentHeader' : layer]))}" aria-hidden="true"></i>${copy.labels[layer as keyof typeof copy.labels]}</button>`).join('')}</div><div class="states-meters">${ratios.map(({ role, ratio }) => `<div class="states-meter" data-state-meter="${role}" data-lowest="${ratio===lowest}"><div class="states-meter-heading"><span><i style="background:var(--s-${role})" aria-hidden="true"></i>${role}</span><span class="states-delta" data-state-delta></span></div><b data-state-value data-value="${ratio}">${ratio.toFixed(2)}:1</b><div class="states-meter-bar"><i data-state-fill style="width:${Math.min(100,(ratio-1)/11*100)}%;background:var(--s-${role})"></i><span class="states-floor" title="${copy.floor}"></span></div><small data-state-lowest>${ratio===lowest?copy.lowest:''}</small></div>`).join('')}</div>
      <div class="states-bghex"><i data-state-bg-swatch style="background:var(--n-editor)" aria-hidden="true"></i><span>${copy.background}</span> <span data-state-bghex>${hex(source.neutral.editor)}</span></div></div>`;
    }).join('')}

    <p class="states-note" data-state-note>${copy.empty}</p><p class="states-reasons" id="states-reasons" data-state-reasons role="status" aria-live="polite"></p><p class="states-caption">${copy.caption}</p><noscript><p>${copy.noScript}</p></noscript>
  </section>`;
}
