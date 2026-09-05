import {
  ANSI_BLACK_TEXT, ANSI_ORDER, CONTRAST_FLOOR, NON_TEXT_FLOOR, contrastEmitted, hex,
  readingForegrounds, readingStates,
} from '@sltio/aion-tokens';
import type { AnsiSlot, Oklch, Palette } from '@sltio/aion-tokens';

export interface Row {
  readonly label: string;
  readonly colour: Oklch;
  readonly against: string;
  readonly ratio: number;
  readonly floor: number;
}

const worst = (
  label: string,
  colour: Oklch,
  backgrounds: readonly { name: string; background: Oklch }[],
  floor: number,
): Row => {
  const measured = backgrounds
    .map(({ name, background }) => ({ name, ratio: contrastEmitted(colour, background) }))
    .sort((a, b) => a.ratio - b.ratio)[0]!;
  return { label, colour, against: measured.name, ratio: measured.ratio, floor };
};

// The readout measures the same states the build gate does, on the palette the sliders
// build. It used to read each syntax colour against the plain editor alone, which is the
// blind spot the gate was rewritten to close: a comment at lightness 0.600 cleared 4.5:1
// on the editor, failed at 2.99:1 on a selected word in an added diff line, and the lab
// still said ALL CLEAR.
export const readoutRows = (palette: Palette): Row[] => {
  const states = readingStates(palette).map((state) => ({ name: state.name, background: state.background }));
  const surface = (name: string, background: Oklch) => [{ name, background }];
  const terminals = [
    { name: 'terminal', background: palette.neutral.editor },
    { name: 'panel', background: palette.neutral.terminal },
  ];
  // The four surfaces the gate claims for chrome text. `input` is outside that claim:
  // `dimText` reads 4.10:1 on it, and no dimmed text is drawn inside a field.
  const chrome = ['editor', 'terminal', 'sidebar', 'widget'] as const;

  return [
    ...Object.entries(readingForegrounds(palette))
      .map(([label, colour]) => worst(label, colour, states, CONTRAST_FLOOR)),
    ...ANSI_ORDER.filter((slot) => slot !== 'black')
      .map((slot) => worst(`ansi ${slot}`, palette.ansi[slot], terminals, CONTRAST_FLOOR)),
    ...ANSI_BLACK_TEXT.map((slot: AnsiSlot) =>
      worst(`ansi ${slot} on black`, palette.ansi[slot], surface('ansi black', palette.ansi.black), CONTRAST_FLOOR)),
    worst('dim text', palette.dim, chrome.map((name) => ({ name, background: palette.neutral[name] })), CONTRAST_FLOOR),
    worst('secondary', palette.neutral.textSecondary, chrome.map((name) => ({ name, background: palette.neutral[name] })), CONTRAST_FLOOR),
    worst('primary', palette.neutral.textPrimary, chrome.map((name) => ({ name, background: palette.neutral[name] })), CONTRAST_FLOOR),
    worst('border', palette.neutral.border,
      (['input', 'widget', 'sidebar', 'editor'] as const)
        .map((name) => ({ name, background: palette.neutral[name] })), NON_TEXT_FLOOR),
  ];
};

// The floor is the point of the theme, so the lab shows it failing the moment a control
// pushes a token under it.
export function renderReadout(root: HTMLElement, palette: Palette): void {
  const measured = readoutRows(palette);
  const failing = measured.filter((row) => row.ratio < row.floor);
  root.innerHTML = `
    <h3>Contrast <span class="${failing.length ? 'readout-fail' : 'readout-pass'}">${
      failing.length ? `${failing.length} below the floor` : 'all clear'}</span></h3>
    <p class="readout-scope">${measured.length} colours, each on the worst of the ${
      readingStates(palette).length} reading states and its own chrome.</p>
    <table class="readout-table">
      ${measured.map((row) => `
        <tr class="${row.ratio < row.floor ? 'is-fail' : ''}">
          <td><span class="swatch" style="background:${hex(row.colour)}"></span>${row.label}
            <span class="readout-against">${row.against}</span></td>
          <td class="readout-hex">${hex(row.colour)}</td>
          <td class="readout-ratio">${row.ratio.toFixed(2)}</td>
        </tr>`).join('')}
    </table>`;
}
