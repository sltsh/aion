import { SHELL } from '../content.js';

export function renderChip(): string {
  return `<button type="button" class="scheme-chip" role="switch" aria-label="${SHELL.lightTheme}" aria-checked="false" data-scheme-chip hidden>
    <span class="chip-half chip-half-dark chip-key" data-chip-half data-theme="dark">${SHELL.darkLabel}</span>
    <span class="chip-half chip-half-light" data-chip-half data-theme="light">${SHELL.lightLabel}</span><span class="chip-seam" aria-hidden="true"></span>
  </button>`;
}
