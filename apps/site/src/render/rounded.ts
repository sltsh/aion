import { buildPalette, lightPalette } from '@sltsh/aion-tokens';
import { CONTENT } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { roundedFloor, roundedView } from '../chapters/rounded.js';
export function renderRounded(flags: SiteFlags): string {
  const copy=CONTENT.rounded,base=buildPalette().comment,background=buildPalette().neutral.editor,floor=roundedFloor(base,background);
  return `<section class="chapter probe-chapter rounded-chapter" id="rounded" aria-labelledby="rounded-title" data-rounded data-released="${flags.released}">
    <div class="rounded-controls"><span class="chapter-eyebrow">03 Rounded</span><h2 id="rounded-title">${copy.title}</h2><ol class="rounded-steps">${copy.steps.map(step=>`<li><b>${step.title}</b> ${step.body}</li>`).join('')}</ol>
      <label class="probe-label" for="rounded-lightness">${copy.lightness}</label><input type="range" id="rounded-lightness" data-rounded-lightness hidden min="${floor-0.02}" max="${floor+0.02}" step="0.00005" value="${floor}" aria-label="${copy.lightness}" aria-valuetext="${floor.toFixed(5)} ${copy.lightness}" disabled>
      <noscript>${(['dark','light'] as const).map(scheme=>{const source=scheme==='dark'?buildPalette():lightPalette;const L=roundedFloor(source.comment,source.neutral.editor);return `<span data-theme-value="${scheme}"><input type="range" min="${L-0.02}" max="${L+0.02}" step="0.00005" value="${L}" aria-label="${copy.lightness}" aria-valuetext="${L.toFixed(5)} ${copy.lightness}" disabled></span>`;}).join('')}</noscript>
      <button type="button" data-rounded-find disabled>${copy.find}</button></div>
    <div class="rounded-demo">${(['dark','light'] as const).map(scheme=>{const source=scheme==='dark'?buildPalette():lightPalette;return `<div data-rounded-values data-theme-value="${scheme}">${roundedView(source.comment,source.neutral.editor,roundedFloor(source.comment,source.neutral.editor))}</div>`;}).join('')}<p class="probe-caption">${copy.caption}</p></div></section>`;
}
