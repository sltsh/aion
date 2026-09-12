import type { ColourScheme, PreviewOptions } from '@sltsh/aion-tokens';
import type { LabController } from './state.js';

export interface Control {
  readonly key: keyof PreviewOptions;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: string;
}

export const CONTROLS: readonly Control[] = [
  { key: 'baseHue', label: 'Base hue', min: 0, max: 360, step: 1, unit: '°' },
  { key: 'baseChroma', label: 'Base chroma', min: 0, max: 0.06, step: 0.001, unit: '' },
  { key: 'surfaceShift', label: 'Surface lightness', min: -0.06, max: 0.08, step: 0.001, unit: '' },
  { key: 'accentChroma', label: 'Accent chroma', min: 0.4, max: 1.6, step: 0.01, unit: '×' },
  { key: 'accentLightness', label: 'Accent lightness', min: -0.12, max: 0.08, step: 0.001, unit: '' },
  { key: 'commentLightness', label: 'Comment lightness', min: 0.45, max: 0.78, step: 0.001, unit: '' },
];

const format = (control: Control, value: number): string =>
  control.step >= 1 ? `${value}${control.unit}` : `${value.toFixed(3)}${control.unit}`;

export function renderControls(
  root: HTMLElement,
  controller: LabController,
): void {
  const state = controller.getState();
  const scheme = state.activeScheme;
  const options = state.options[scheme];

  root.innerHTML = `
    <div class="scheme-section">
      <div class="scheme-switch" role="radiogroup" aria-label="Colour scheme">
        <label class="scheme-option" for="scheme-dark">
          <input type="radio" name="scheme" id="scheme-dark" value="dark"${scheme === 'dark' ? ' checked' : ''} />
          <span>Dark</span>
        </label>
        <label class="scheme-option" for="scheme-light">
          <input type="radio" name="scheme" id="scheme-light" value="light"${scheme === 'light' ? ' checked' : ''} />
          <span>Light</span>
        </label>
      </div>
    </div>
    <h2>Controls</h2>
    <p class="rail-note">Surfaces render once; controls and scheme switches update root custom
      properties. Reset returns the shipped values. Light accent inputs are solver-bound by
      the contrast floor.</p>
    ${CONTROLS.map((control) => `
      <label class="control" for="c-${control.key}">
        <span class="control-label">${control.label}</span>
        <span class="control-value" id="v-${control.key}">${format(control, options[control.key])}</span>
        <input id="c-${control.key}" type="range" min="${control.min}" max="${control.max}"
               step="${control.step}" value="${options[control.key]}" />
      </label>`).join('')}
    <button id="reset" type="button" data-variant="secondary">Reset ${scheme === 'light' ? 'Light' : 'Dark'} to shipped</button>
    <div id="readout" class="readout"></div>`;

  const radios = root.querySelectorAll<HTMLInputElement>('input[name="scheme"]');
  for (const radio of radios) {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        controller.setScheme(radio.value as ColourScheme);
      }
    });
  }

  for (const control of CONTROLS) {
    const input = root.querySelector<HTMLInputElement>(`#c-${control.key}`)!;
    const value = root.querySelector<HTMLElement>(`#v-${control.key}`)!;
    input.addEventListener('input', () => {
      const num = Number(input.value);
      controller.setControl(control.key, num);
      value.textContent = format(control, num);
    });
  }

  const resetBtn = root.querySelector<HTMLButtonElement>('#reset')!;
  resetBtn.addEventListener('click', () => {
    controller.resetActive();
  });

  controller.subscribe((nextState) => {
    const nextScheme = nextState.activeScheme;
    const nextOptions = nextState.options[nextScheme];

    const darkRadio = root.querySelector<HTMLInputElement>('#scheme-dark');
    const lightRadio = root.querySelector<HTMLInputElement>('#scheme-light');
    if (darkRadio && lightRadio) {
      darkRadio.checked = nextScheme === 'dark';
      lightRadio.checked = nextScheme === 'light';
    }

    for (const control of CONTROLS) {
      const input = root.querySelector<HTMLInputElement>(`#c-${control.key}`);
      const value = root.querySelector<HTMLElement>(`#v-${control.key}`);
      if (input && value) {
        const val = nextOptions[control.key];
        if (Number(input.value) !== val) {
          input.value = String(val);
        }
        value.textContent = format(control, val);
      }
    }

    if (resetBtn) {
      resetBtn.textContent = `Reset ${nextScheme === 'light' ? 'Light' : 'Dark'} to shipped`;
    }
  });
}
