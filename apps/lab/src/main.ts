import type { Palette } from '@sltsh/aion-tokens';
import { applyVariables } from './variables.js';
import { renderControls } from './controls.js';
import { renderReadout } from './readout.js';
import { createLabController } from './state.js';
import type { LabState } from './state.js';
import { SURFACES } from './render/index.js';
import './styles.css';

const rail = document.querySelector<HTMLElement>('#rail')!;
const surfaces = document.querySelector<HTMLElement>('#surfaces')!;
const mastheadMark = document.querySelector<HTMLImageElement>('#masthead-mark')!;

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

const controller = createLabController();

const apply = (state: LabState, palette: Palette): void => {
  document.documentElement.dataset.theme = state.activeScheme;
  document.documentElement.style.colorScheme = state.activeScheme;
  mastheadMark.src = state.activeScheme === 'light' ? './icon-light.png' : './icon.png';
  applyVariables(document.documentElement, palette);
  const readout = document.querySelector<HTMLElement>('#readout');
  if (readout) {
    renderReadout(readout, palette, state.activeScheme);
  }
};

renderControls(rail, controller);

rail.insertAdjacentHTML('beforeend', `
  <nav class="rail-jump">
    <h3>Surfaces</h3>
    ${SURFACES.map((surface) => `<a href="#surface-${surface.id}">${surface.title}</a>`).join('')}
  </nav>`);

controller.subscribe(apply);
apply(controller.getState(), controller.getActivePalette());
