import { buildPalette, PREVIEW_DEFAULTS } from '@sltio/aion-tokens';
import type { PreviewOptions } from '@sltio/aion-tokens';
import { applyVariables } from './variables.js';
import { renderControls } from './controls.js';
import { renderReadout } from './readout.js';
import { SURFACES } from './render/index.js';
import './styles.css';

const rail = document.querySelector<HTMLElement>('#rail')!;
const surfaces = document.querySelector<HTMLElement>('#surfaces')!;

// The surfaces are written once. A control change sets custom properties on the root and
// nothing else; that is what proves every surface reads the tokens rather than a copy.
surfaces.innerHTML = SURFACES.map(
  (surface) => `
  <section class="surface" id="surface-${surface.id}">
    <header class="surface-head">
      <h2>${surface.title}</h2>
      <p>${surface.note}</p>
    </header>
    ${surface.html()}
  </section>`,
).join('');

const apply = (options: PreviewOptions): void => {
  const palette = buildPalette(options);
  applyVariables(document.documentElement, palette);
  renderReadout(document.querySelector<HTMLElement>('#readout')!, palette);
};

renderControls(rail, PREVIEW_DEFAULTS, apply);

rail.insertAdjacentHTML('beforeend', `
  <nav class="rail-jump">
    <h3>Surfaces</h3>
    ${SURFACES.map((surface) => `<a href="#surface-${surface.id}">${surface.title}</a>`).join('')}
  </nav>`);

apply(PREVIEW_DEFAULTS);
