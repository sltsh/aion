import { SHELL } from '../content.js';

export function renderChip(): string {
  const state = (incoming: boolean): string => `<span class="chip-reveal" ${incoming ? 'data-chip-incoming hidden aria-hidden="true"' : 'data-chip-base'} data-chip-state="dark"><span class="chip-state">
    <span class="chip-half chip-half-dark chip-key" data-chip-half data-theme="dark"><span class="chip-label">${SHELL.darkLabel}</span></span>
    <span class="chip-half chip-half-light" data-chip-half data-theme="light"><span class="chip-label">${SHELL.lightLabel}</span></span>
  </span></span>`;
  return `<button type="button" class="scheme-chip" role="switch" aria-label="${SHELL.lightTheme}" aria-checked="false" data-scheme-chip hidden>${state(false)}${state(true)}</button>`;
}
