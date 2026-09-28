import type { SiteFlags } from '../flags.js';
import { CHAPTERS, SHELL } from '../content.js';
import { renderFooter } from './shell.js';
import { renderChip } from './chip.js';
import { renderHero } from './hero.js';
import { renderClaims } from './claims.js';
import { renderSolved } from './solved.js';
import { renderRounded } from './rounded.js';
import { renderDepth } from './depth.js';
import { renderStates } from './states.js';
import { renderTerminal } from './terminal.js';
import { renderPaletteChapter } from './palette-chapter.js';
import { renderInstall } from './install.js';

export function landing(flags: SiteFlags): string {
  return `${renderHero(flags)}<main class="landing" id="content">
    ${renderClaims(flags)}
    ${CHAPTERS.map((chapter) => ({ depth: renderDepth, solved: renderSolved, rounded: renderRounded, states: renderStates, terminal: renderTerminal, palette: renderPaletteChapter, install: renderInstall })[chapter.id](flags)).join('')}
  </main><nav class="chapter-rail" aria-label="${SHELL.chapters}" hidden>${CHAPTERS.map((chapter) => `<a href="#${chapter.id}">${chapter.number} ${chapter.title}</a>`).join('')}</nav>
  ${renderFooter(flags)}${renderChip()}<p class="copy-status" role="status" aria-live="polite"></p>`;
}
