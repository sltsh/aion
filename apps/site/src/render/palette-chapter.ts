import { CHAPTERS, CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { measures } from '../measures.js';
import { escapeHtml } from './html.js';

export function renderPaletteChapter(flags: SiteFlags): string {
  const copy = CONTENT.paletteChapter;
  const chapter = CHAPTERS[5]!;
  const file = copy.file.map((line) => `<div>${line.map(([role, text]) => `<span class="t-${role}"${role === 'plain' ? '' : ` data-palette-token="${role}"`}>${escapeHtml(text)}</span>`).join('')}</div>`).join('');
  return `<section class="chapter palette-chapter" id="palette" aria-labelledby="palette-title" data-palette-chapter data-released="${flags.released}"><div class="palette-heading"><div><span class="chapter-eyebrow">${chapter.number} ${chapter.title}</span><h2 id="palette-title">${copy.title}</h2></div><p>${copy.lede}</p></div>
    ${(['dark', 'light'] as const).map((scheme) => {
      const rows = measures(scheme).syntax;
      const ceiling = Math.ceil(Math.max(...rows.map((row) => row.ratio)) + .5);
      const floor = 4.5 / ceiling * 100;
      return `<div data-theme-value="${scheme}"><div class="palette-chart" style="--site-floor:${floor}%;--site-floor-fraction:${4.5 / ceiling}"><div class="palette-guides" aria-hidden="true">${Array.from({ length: Math.floor(ceiling / 2) }, (_, i) => (i + 1) * 2).map((ratio) => `<div style="bottom:${ratio / ceiling * 100}%">${ratio}:1</div>`).join('')}</div><div class="palette-floor" data-floor="4.5"><span>${copy.floor}</span></div><div class="palette-columns">${rows.map((row) => `<div class="palette-column" tabindex="0" data-palette-column="${row.role}" data-ratio="${row.ratio}" style="--site-height:${row.ratio / ceiling * 100}%"><span class="palette-example t-${row.role}">${escapeHtml(copy.examples[row.role])}</span><div class="palette-column-label"><span>${row.role}</span><b>${row.ratio.toFixed(2)}:1</b><small><span data-uses="${row.role}">${copy.file.flat().filter(([role]) => role === row.role).length}</span> ${copy.uses}</small></div></div>`).join('')}</div></div></div>`;
    }).join('')}<div class="palette-file-label">${copy.fileName}</div><div class="palette-file" tabindex="0" role="region" aria-label="${copy.fileName}">${file}</div></section>`;
}
