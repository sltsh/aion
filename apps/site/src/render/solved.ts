import { buildPalette, lightPalette } from '@sltsh/aion-tokens';
import { CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { SOLVED_CHIPS, probeSurfaces, worstSurface } from '../chapters/probe.js';
import { dimensionLine } from './dimension.js';
export function solvedScale(ratio: number, shipped: number, width = 660): string {
  const X = (r: number): number => 20 + (Math.max(1, Math.min(r, 12)) - 1) / 11 * (width - 60);
  const copy = CONTENT.solved;
  return `<line x1="20" y1="120" x2="${width-40}" y2="120" class="probe-rule"/>${[1,3,4.5,7,12].map((r) => `<line x1="${X(r)}" y1="115" x2="${X(r)}" y2="125" class="probe-rule"/><text x="${X(r)}" y="150" text-anchor="middle">${r}:1</text>`).join('')}
    <line x1="${X(4.5)}" y1="10" x2="${X(4.5)}" y2="164" class="probe-floor"/><text x="${X(4.5)+8}" y="22">${copy.floor}</text>
    <line data-solved-marker x1="${X(shipped)}" y1="104" x2="${X(shipped)}" y2="136" class="probe-shipped"/><text x="${X(shipped)}" y="177" text-anchor="middle">${copy.shipped} ${shipped.toFixed(2)}:1</text>
    <line x1="${X(ratio)}" y1="60" x2="${X(ratio)}" y2="120" class="probe-floor"/>${dimensionLine({x0:X(4.5),y0:60,x1:X(ratio),y1:60,label:`${ratio>=4.5?'+':'−'}${Math.abs(ratio-4.5).toFixed(2)}`,tone:ratio>=4.5?'text':'error'}).replaceAll('--n-text-secondary','--aion-fg-secondary').replaceAll('--status-error-text','--aion-status-error-text').replaceAll('--a-gold','--aion-gold-solid').replaceAll('--n-divider','--aion-border-hairline')}`;
}
export function renderSolved(flags: SiteFlags): string {
  const copy = CONTENT.solved;
  return `<section class="chapter probe-chapter solved-chapter" id="solved" aria-labelledby="solved-title" data-solved data-released="${flags.released}">
    <div class="solved-controls"><span class="chapter-eyebrow">02 Solved</span><h2 id="solved-title">${copy.title}</h2><p>${copy.lede}</p>
      <div class="solved-chips" role="group" aria-label="${copy.accents}">${SOLVED_CHIPS.map((chip,i)=>`<button type="button" data-solved-accent="${chip.accent}" aria-pressed="${i===0}" disabled><i style="background:var(--a-${chip.accent})" aria-hidden="true"></i>${chip.accent}<small>${chip.role}</small></button>`).join('')}</div>
      <label class="probe-label" for="solved-lightness">${copy.lightness}</label><input id="solved-lightness" data-solved-lightness hidden type="range" min="0.25" max="0.95" step="0.0005" value="${buildPalette().accents.gold[0]}" aria-label="${copy.lightness}" aria-valuetext="${buildPalette().accents.gold[0].toFixed(4)} ${copy.lightness}" disabled>
      <noscript>${(['dark','light'] as const).map(scheme=>{const source=scheme==='dark'?buildPalette():lightPalette;return `<span data-theme-value="${scheme}"><input type="range" min="0.25" max="0.95" step="0.0005" value="${source.accents.gold[0]}" aria-label="${copy.lightness}" aria-valuetext="${source.accents.gold[0].toFixed(4)} ${copy.lightness}" disabled></span>`;}).join('')}</noscript>
      <label class="probe-hold"><input type="checkbox" data-solved-hold disabled>${copy.hold}</label><p class="probe-verdict" data-solved-verdict></p></div>
    <div class="solved-figure"><div class="solved-probe" data-solved-probe><span data-solved-word>${SOLVED_CHIPS[0]!.word}</span></div><div class="probe-hex" data-solved-hex></div>
      ${(['dark','light'] as const).map(scheme=>{const source=scheme==='dark'?buildPalette():lightPalette;const ratio=worstSurface(source.accents.gold,probeSurfaces(source)).ratio;return `<svg class="solved-scale" viewBox="0 0 660 200" role="img" aria-label="${copy.scale}" data-theme-value="${scheme}">${solvedScale(ratio,ratio)}</svg>`;}).join('')}
      <p class="probe-caption">${copy.caption}</p></div></section>`;
}
