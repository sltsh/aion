import { PREVIEW_DEFAULTS } from '@sltsh/aion-tokens';
import type { PreviewOptions } from '@sltsh/aion-tokens';

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
  options: PreviewOptions,
  onChange: (next: PreviewOptions) => void,
): void {
  root.innerHTML = `
    <h2>Controls</h2>
    <p class="rail-note">Every surface below re-renders from one palette. Reset returns the
      shipped values.</p>
    ${CONTROLS.map((control) => `
      <label class="control" for="c-${control.key}">
        <span class="control-label">${control.label}</span>
        <span class="control-value" id="v-${control.key}">${format(control, options[control.key])}</span>
        <input id="c-${control.key}" type="range" min="${control.min}" max="${control.max}"
               step="${control.step}" value="${options[control.key]}" />
      </label>`).join('')}
    <button id="reset" type="button" data-variant="secondary">Reset to shipped</button>
    <div id="readout" class="readout"></div>`;

  const current = { ...options };

  for (const control of CONTROLS) {
    const input = root.querySelector<HTMLInputElement>(`#c-${control.key}`)!;
    const value = root.querySelector<HTMLElement>(`#v-${control.key}`)!;
    input.addEventListener('input', () => {
      current[control.key] = Number(input.value);
      value.textContent = format(control, current[control.key]);
      onChange({ ...current });
    });
  }

  root.querySelector<HTMLButtonElement>('#reset')!.addEventListener('click', () => {
    Object.assign(current, PREVIEW_DEFAULTS);
    for (const control of CONTROLS) {
      root.querySelector<HTMLInputElement>(`#c-${control.key}`)!.value = String(current[control.key]);
      root.querySelector<HTMLElement>(`#v-${control.key}`)!.textContent = format(control, current[control.key]);
    }
    onChange({ ...current });
  });
}
