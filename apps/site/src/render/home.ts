import type { SiteFlags } from '../flags.js';
import { CHAPTERS, CONTENT, SHELL } from '../content.js';
import { renderHeader, renderFooter } from './shell.js';
import { renderChip } from './chip.js';

export function landing(flags: SiteFlags): string {
  return `${renderHeader('home', flags, 'live')}<main class="landing" id="content">
    <section class="hero-placeholder" id="overview" aria-labelledby="overview-title"><h1 id="overview-title">${SHELL.darkLabel}</h1><p>${CONTENT.pitch}</p></section>
    ${CHAPTERS.map((chapter) => `<section class="chapter section" id="${chapter.id}" aria-labelledby="${chapter.id}-title"><h2 id="${chapter.id}-title"><span class="chapter-number">${chapter.number}</span>${chapter.title}</h2></section>`).join('')}
  </main><nav class="chapter-rail" aria-label="${SHELL.chapters}" hidden>${CHAPTERS.map((chapter) => `<a href="#${chapter.id}">${chapter.number} ${chapter.title}</a>`).join('')}</nav>
  ${renderFooter(flags)}${renderChip()}<p class="copy-status" role="status" aria-live="polite"></p>`;
}
