import { editorSurface } from '@sltsh/aion-lab/render/editor';
import { DEPTH_SCALE } from '../chapters/depth.js';
import { CHAPTERS, CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { measures } from '../measures.js';
import { escapeHtml } from './html.js';

const ratio = (index: number, parts = false): string => (['dark', 'light'] as const).map((scheme) => {
  const row = (parts ? measures(scheme).parts : measures(scheme).strata)[index]!;
  return `<span data-theme-value="${scheme}">${row.ratio.toFixed(2)}:1</span>`;
}).join('');

export function renderDepth(flags: SiteFlags): string {
  const copy = CONTENT.depth;
  return `<section class="chapter depth-chapter" id="depth" aria-labelledby="depth-title" data-depth data-released="${flags.released}" style="--site-depth-scale:${DEPTH_SCALE}">
    <div class="depth-heading"><div><span class="chapter-eyebrow">${CHAPTERS[0]!.number} ${CHAPTERS[0]!.title}</span><h2 id="depth-title">${copy.title}</h2></div><p>${(['dark', 'light'] as const).map((scheme) => `<span data-theme-value="${scheme}">${copy.lede[scheme]}</span>`).join('')}</p></div>
    <div class="depth-controls"><div class="depth-ruler" role="group" aria-label="${copy.ruler}">${measures('dark').strata.map((row, index) => `<button type="button" data-stratum="${row.name}"><i style="background:var(--n-${row.neutral})" aria-hidden="true"></i>${row.name}<b>${ratio(index)}</b></button>`).join('')}</div><button class="depth-assemble" type="button" data-depth-assemble aria-pressed="true" hidden>${copy.takeApart}</button></div>
    <div class="depth-stage" data-depth-stage aria-hidden="true" inert><div class="depth-frame" data-depth-frame><div class="depth-mover depth-base" data-depth-base data-stratum="editor">${editorSurface()}</div></div></div>
    <ul class="depth-list" aria-label="${copy.parts}">${measures('dark').strata.map((row, stratumIndex) => `<li class="depth-stratum" data-stratum="${row.name}"><div class="depth-stratum-heading"><i style="background:var(--n-${row.neutral})" aria-hidden="true"></i><span>${row.name}</span><b>${ratio(stratumIndex)}</b></div><ul>${measures('dark').parts.map((part, index) => part.stratum === row.name ? `<li data-depth-part="${index}" data-stratum="${part.stratum}"><span>${escapeHtml(part.name)}</span><b>${ratio(index, true)}</b></li>` : '').join('')}</ul></li>`).join('')}</ul>
  </section>`;
}
