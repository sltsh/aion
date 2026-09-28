import { hex } from '@sltsh/aion-tokens';
import { CHAPTERS, CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { measures } from '../measures.js';
import type { SchemeMeasures } from '../measures.js';
import { escapeHtml } from './html.js';
export function terminalCaption(figures: SchemeMeasures['terminal']): string {
  const exempt = figures.slots.flatMap((slot, i) => slot.exempt ? [i] : []);
  return exempt.length ? CONTENT.terminal.exemptCaption(exempt.join(', ')) : CONTENT.terminal.noExemptCaption(Math.min(...figures.slots.flatMap(s => s.ratios)).toFixed(2));
}
const kebab = (value: string): string => value.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());
export function renderTerminal(flags: SiteFlags): string {
  const copy = CONTENT.terminal, chapter = CHAPTERS[4]!;
  const session = copy.session.map(line => `<div>${line.map(([slot,text]) => `<span style="color:var(--ansi-${kebab(slot)})">${escapeHtml(text)}</span>`).join('')}</div>`).join('');
  return `<section class="chapter terminal-chapter" id="terminal" aria-labelledby="terminal-title" data-released="${flags.released}"><span class="chapter-eyebrow">${chapter.number} ${chapter.title}</span><h2 id="terminal-title">${copy.title}</h2>
    ${(['dark','light'] as const).map(scheme => {
      const figures = measures(scheme).terminal;
      return `<div data-theme-value="${scheme}"><p class="terminal-lede">${scheme==='dark'?copy.lede:copy.lightLede}</p><p class="terminal-count"><b>${figures.slots.length} × ${figures.backgrounds.length}</b> ${copy.measured}</p><div class="terminal-sessions">${figures.backgrounds.map(bg => `<div class="terminal-session" data-terminal-session="${scheme}" style="background:${hex(bg.oklch)}"><div class="terminal-session-label">${escapeHtml(bg.name)} <b>${hex(bg.oklch)}</b></div><div class="terminal-session-code" tabindex="0" role="region" aria-label="${escapeHtml(copy.sessionLabel(bg.name))}">${session}</div></div>`).join('')}</div>
      <div class="terminal-slots">${figures.slots.map((slot,i) => `<div class="terminal-slot" data-terminal-slot="${scheme}-${slot.slot}"><i style="background:var(--ansi-${kebab(slot.slot)})" aria-hidden="true"></i><span class="terminal-slot-name">${i} ${kebab(slot.slot)}</span>${slot.ratios.map((ratio,j) => `<span>${escapeHtml(figures.backgrounds[j]!.name)} ${ratio===Math.min(...slot.ratios)?`<strong>${ratio.toFixed(2)}</strong>`:ratio.toFixed(2)}:1</span>`).join('')}${slot.exempt?`<span class="terminal-exempt">${copy.exempt}</span>`:''}</div>`).join('')}</div><p class="terminal-caption">${terminalCaption(figures)}</p></div>`;
    }).join('')}</section>`;
}
