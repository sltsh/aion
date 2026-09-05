import { CONTRAST_FLOOR, contrastEmitted, hex } from '@sltio/aion-tokens';
import type { Oklch, Palette } from '@sltio/aion-tokens';

interface Row { readonly label: string; readonly colour: Oklch; readonly surface: Oklch }

const rows = (palette: Palette): Row[] => [
  ...Object.entries(palette.syntax).map(([label, colour]) => ({ label, colour, surface: palette.neutral.editor })),
  { label: 'comment', colour: palette.comment, surface: palette.neutral.editor },
  { label: 'dim text', colour: palette.dim, surface: palette.neutral.widget },
  { label: 'secondary', colour: palette.neutral.textSecondary, surface: palette.neutral.sidebar },
  { label: 'primary', colour: palette.neutral.textPrimary, surface: palette.neutral.sidebar },
];

// The floor is the point of the theme, so the lab shows it failing the moment a control
// pushes a token under it.
export function renderReadout(root: HTMLElement, palette: Palette): void {
  const measured = rows(palette).map((row) => ({
    ...row,
    ratio: contrastEmitted(row.colour, row.surface),
  }));
  const failing = measured.filter((row) => row.ratio < CONTRAST_FLOOR).length;
  root.innerHTML = `
    <h3>Contrast <span class="${failing ? 'readout-fail' : 'readout-pass'}">${
      failing ? `${failing} below 4.5:1` : 'all clear'}</span></h3>
    <table class="readout-table">
      ${measured.map((row) => `
        <tr class="${row.ratio < CONTRAST_FLOOR ? 'is-fail' : ''}">
          <td><span class="swatch" style="background:${hex(row.colour)}"></span>${row.label}</td>
          <td class="readout-hex">${hex(row.colour)}</td>
          <td class="readout-ratio">${row.ratio.toFixed(2)}</td>
        </tr>`).join('')}
    </table>`;
}
