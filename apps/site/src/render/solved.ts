import { buildPalette, lightPalette, hex, contrastEmitted } from '@sltsh/aion-tokens';
import type { Oklch, StateSource } from '@sltsh/aion-tokens';
import { escapeHtml } from './html.js';
import { CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { SOLVED_CHIPS, probeSurfaces, worstSurface } from '../chapters/probe.js';
import { dimensionLine } from './dimension.js';
export function solvedStrip(colour: Oklch, source: StateSource): string {
  const surfaces = probeSurfaces(source), worst = worstSurface(colour, surfaces);
  const chip = SOLVED_CHIPS.find(row => {
    const syntax = source.syntax[row.role];
    return syntax[1] === colour[1] && syntax[2] === colour[2];
  }) ?? SOLVED_CHIPS[0]!;
  return `<div class="solved-strip">${surfaces.map(surface => {
    const ratio = contrastEmitted(colour, surface.background);
    return `<div class="solved-tile" data-surface="${surface.name}"${surface.name === worst.name ? ' data-worst' : ''}><span class="solved-word" data-solved-word style="color:${hex(colour)};background:${hex(surface.background)}">${escapeHtml(chip.word)}</span><span class="solved-surface">${surface.name}</span><span class="solved-ratio" data-verdict="${ratio >= 4.5 ? 'pass' : 'fail'}">${ratio.toFixed(2)}:1</span></div>`;
  }).join('')}</div>`;
}
function staticExperiment(part: 'strip' | 'verdict' | 'hex'): string {
  return (['dark', 'light'] as const).map(scheme => {
    const source = scheme === 'dark' ? buildPalette() : lightPalette;
    const colour = source.accents.gold, worst = worstSurface(colour, probeSurfaces(source));
    const value = part === 'strip' ? solvedStrip(colour, source) : part === 'hex' ? `${hex(colour)} ${CONTENT.solved.on} ${worst.name}`
      : `${worst.ratio >= 4.5 ? CONTENT.solved.passes : CONTENT.solved.fails} ${worst.name}: ${worst.ratio.toFixed(2)}:1`;
    const tag = part === 'strip' ? 'div' : 'span';
    return `<${tag} data-theme-value="${scheme}"${part === 'verdict' ? ` data-verdict="${worst.ratio >= 4.5 ? 'pass' : 'fail'}"` : ''}>${value}</${tag}>`;
  }).join('');
}
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
      <div class="solved-chips" role="group" aria-label="${copy.accents}">${SOLVED_CHIPS.map((chip,i)=>`<button type="button" data-solved-accent="${chip.accent}" aria-pressed="${i===0}" disabled><i style="background:var(--a-${chip.accent})" aria-hidden="true"></i><span class="solved-accent-name" style="color:var(--aion-${chip.accent}-solid)">${chip.accent}</span><small>${chip.role}</small></button>`).join('')}</div>
      <label class="probe-label" for="solved-lightness">${copy.lightness}</label><input id="solved-lightness" data-solved-lightness hidden type="range" min="0.25" max="0.95" step="0.0005" value="${buildPalette().accents.gold[0]}" aria-label="${copy.lightness}" aria-valuetext="${buildPalette().accents.gold[0].toFixed(4)} ${copy.lightness}" disabled>
      <noscript>${(['dark','light'] as const).map(scheme=>{const source=scheme==='dark'?buildPalette():lightPalette;return `<span data-theme-value="${scheme}"><input type="range" min="0.25" max="0.95" step="0.0005" value="${source.accents.gold[0]}" aria-label="${copy.lightness}" aria-valuetext="${source.accents.gold[0].toFixed(4)} ${copy.lightness}" disabled></span>`;}).join('')}</noscript>
      <label class="probe-hold"><input type="checkbox" data-solved-hold disabled>${copy.hold}</label><p class="probe-verdict" data-solved-verdict>${staticExperiment('verdict')}</p></div>
    <div class="solved-figure"><div class="solved-probe" data-solved-probe>${staticExperiment('strip')}</div><div class="probe-hex" data-solved-hex>${staticExperiment('hex')}</div>
      ${(['dark','light'] as const).map(scheme=>{const source=scheme==='dark'?buildPalette():lightPalette;const ratio=worstSurface(source.accents.gold,probeSurfaces(source)).ratio;return `<svg class="solved-scale" viewBox="0 0 660 200" role="img" aria-label="${copy.scale}" data-theme-value="${scheme}">${solvedScale(ratio,ratio)}</svg>`;}).join('')}
      <p class="probe-caption">${copy.caption}</p></div></section>`;
}
