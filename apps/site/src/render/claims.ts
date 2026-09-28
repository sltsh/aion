import { ANSI_ORDER } from '@sltsh/aion-tokens';
import { CHAPTERS, CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { measures } from '../measures.js';
import type { Scheme } from '../measures.js';
import { dimensionLine } from './dimension.js';
import { escapeHtml } from './html.js';

const pair = (value: (scheme: Scheme) => string): string => (['dark', 'light'] as const)
  .map((scheme) => `<span data-theme-value="${scheme}">${value(scheme)}</span>`).join('');
const visual = (index: number): string => {
  if (index === 0) return `<span class="claim-layers">${['editor', 'terminal', 'sidebar', 'widget'].map((name, i) => `<i style="background:var(--n-${name});--site-claim-index:${i}"></i>`).join('')}</span>`;
  if (index === 1) return pair((scheme) => `<svg width="240" height="44" aria-hidden="true">${dimensionLine({ x0: 10, y0: 22, x1: 10 + measures(scheme).lowestSyntax.ratio * 22, y1: 22 })}</svg>`);
  if (index === 2) return '<span class="claim-round"><i></i><i></i></span>';
  if (index === 3) return `<span class="claim-layers claim-states">${['selection', 'word-highlight', 'removed-line', 'find-match-other'].map((name, i) => `<i style="background:var(--o-${name});--site-claim-index:${i}"></i>`).join('')}</span>`;
  if (index === 4) return `<span class="claim-ansi">${['editor', 'terminal'].map((surface) => `<span style="background:var(--n-${surface})">${ANSI_ORDER.map((slot) => `<i style="background:var(--ansi-${slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})"></i>`).join('')}</span>`).join('')}</span>`;
  return pair((scheme) => `<span class="claim-syntax">${measures(scheme).syntax.map((row) => `<i style="background:var(--s-${row.role});height:${Math.max(8, row.ratio * 5).toFixed(1)}px"></i>`).join('')}</span>`);
};

export function renderClaims(flags: SiteFlags): string {
  const copy = CONTENT.claims;
  const figures = [
    pair((scheme) => copy.extremes[measures(scheme).editorExtreme].figure),
    pair((scheme) => `${measures(scheme).lowestSyntax.ratio.toFixed(2)}:1`),
    pair((scheme) => measures(scheme).rounding.shift.toFixed(2)), '4.5:1',
    pair((scheme) => `${measures(scheme).counts.ansiSlots} × ${measures(scheme).counts.terminalBackgrounds}`),
    pair((scheme) => String(measures(scheme).counts.syntaxShown)),
  ];
  const sentences = [pair((scheme) => copy.extremes[measures(scheme).editorExtreme].sentence),
    copy.solved, copy.rounded, copy.states, pair((scheme) => copy.terminal[scheme]), copy.palette];
  return `<section class="claims-index" id="claims" aria-labelledby="claims-title" data-released="${flags.released}">
    <span class="chapter-eyebrow">${copy.eyebrow}</span><h2 id="claims-title">${copy.title}</h2>
    <div class="claims-grid">${CHAPTERS.filter((chapter) => chapter.number).map((chapter, index) =>
      `<a class="claim-card" href="#${chapter.id}"><span class="claim-number">${chapter.number} ${chapter.title}</span><span class="claim-visual" aria-hidden="true">${visual(index)}</span><span class="claim-figure">${figures[index]}</span><span class="claim-sentence">${sentences[index]}</span><span class="claim-action">${escapeHtml(copy.actions[index]!)}</span></a>`).join('')}</div>
  </section>`;
}
