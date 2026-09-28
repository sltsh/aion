import type { SiteFlags } from '../flags.js';
import { CHAPTERS, SHELL } from '../content.js';
import { renderFooter } from './shell.js';
import { renderChip } from './chip.js';
import { renderHero } from './hero.js';

export function landing(flags: SiteFlags): string {
  return `${renderHero(flags)}<main class="landing" id="content">
    ${CHAPTERS.map((chapter) => `<section class="chapter section" id="${chapter.id}" aria-labelledby="${chapter.id}-title"><h2 id="${chapter.id}-title"><span class="chapter-number">${chapter.number}</span>${chapter.title}</h2></section>`).join('')}
  </main><nav class="chapter-rail" aria-label="${SHELL.chapters}" hidden>${CHAPTERS.map((chapter) => `<a href="#${chapter.id}">${chapter.number} ${chapter.title}</a>`).join('')}</nav>
  ${renderFooter(flags)}${renderChip()}<p class="copy-status" role="status" aria-live="polite"></p>`;
}
