import {
  ACCENT_NAMES, ANSI_BLACK_TEXT, ANSI_ORDER, CONTRAST_FLOOR, NON_TEXT_FLOOR,
  contrastEmitted, hex,
  readingForegrounds, readingStates,
} from '@sltsh/aion-tokens';
import type { AnsiSlot, ColourScheme, Oklch, Palette } from '@sltsh/aion-tokens';

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

// Measure the same named reading states as the build gate. The scheme is explicit because
// dark and light make different terminal guarantees.
export const readoutRows = (palette: Palette, scheme: ColourScheme): Row[] => {
  const isLight = scheme === 'light';
  const states = readingStates(palette).map((state) => ({ name: state.name, background: state.background }));
  const surface = (name: string, background: Oklch) => [{ name, background }];
  const terminals = isLight
    ? [
        { name: 'panel', background: palette.neutral.terminal },
        { name: 'selection', background: palette.terminalSelection },
      ]
    : [
        { name: 'terminal', background: palette.neutral.editor },
        { name: 'panel', background: palette.neutral.terminal },
      ];
  // The four surfaces the gate claims for chrome text. `input` is outside that claim:
  // `dimText` reads 4.10:1 on it, and no dimmed text is drawn inside a field.
  const chrome = ['editor', 'terminal', 'sidebar', 'widget'] as const;
  const lightAccentRows = isLight
    ? ACCENT_NAMES.flatMap((name) => {
        const scale = palette.scales[name];
        return [
          worst(`accent ${name}`, scale.solid, [
            ...surface('page', palette.neutral.editor),
            ...surface('raised', palette.neutral.widget),
            ...surface('input', palette.neutral.input),
            ...surface(`${name} subtle`, scale.subtle),
          ], CONTRAST_FLOOR),
          worst(`accent ${name} border`, scale.border, [
            ...surface('page', palette.neutral.editor),
            ...surface('raised', palette.neutral.widget),
            ...surface('input', palette.neutral.input),
          ], NON_TEXT_FLOOR),
          worst(`text on ${name} subtle`, palette.neutral.textPrimary,
            surface(`${name} subtle`, scale.subtle), CONTRAST_FLOOR),
        ];
      })
    : [];
  const lightStatusRows = isLight
    ? Object.entries(palette.statuses).flatMap(([name, status]) => [
        worst(`status ${name}`, status.text, [
          ...surface('page', palette.neutral.editor),
          ...surface(`${name} subtle`, status.subtle),
        ], CONTRAST_FLOOR),
        worst(`status ${name} border`, status.border, [
          ...surface('page', palette.neutral.editor),
          ...surface('input', palette.neutral.input),
        ], NON_TEXT_FLOOR),
        worst(`text on ${name} solid`, status.onSolid,
          surface(`${name} solid`, status.solid), CONTRAST_FLOOR),
      ])
    : [];

  return [
    ...Object.entries(readingForegrounds(palette))
      .map(([label, colour]) => worst(label, colour, states, CONTRAST_FLOOR)),
    ...(isLight ? ANSI_ORDER : ANSI_ORDER.filter((slot) => slot !== 'black'))
      .map((slot) => worst(`ansi ${slot}`, palette.ansi[slot], terminals, CONTRAST_FLOOR)),
    ...(isLight
      ? []
      : ANSI_BLACK_TEXT.map((slot: AnsiSlot) =>
          worst(`ansi ${slot} on black`, palette.ansi[slot], surface('ansi black', palette.ansi.black), CONTRAST_FLOOR))),
    worst('dim text', palette.dim, chrome.map((name) => ({ name, background: palette.neutral[name] })), CONTRAST_FLOOR),
    worst('secondary', palette.neutral.textSecondary, chrome.map((name) => ({ name, background: palette.neutral[name] })), CONTRAST_FLOOR),
    worst('primary', palette.neutral.textPrimary, chrome.map((name) => ({ name, background: palette.neutral[name] })), CONTRAST_FLOOR),
    worst('border', palette.neutral.border,
      (['input', 'widget', 'sidebar', 'editor'] as const)
        .map((name) => ({ name, background: palette.neutral[name] })), NON_TEXT_FLOOR),
    ...lightAccentRows,
    ...lightStatusRows,
  ];
};

export function renderReadout(root: HTMLElement, palette: Palette, scheme: ColourScheme): void {
  const isLight = scheme === 'light';
  const measured = readoutRows(palette, scheme);
  const failing = measured.filter((row) => row.ratio < row.floor);
  const schemeLabel = isLight ? 'Light' : 'Dark';
  root.innerHTML = `
    <h3>Contrast (${schemeLabel}) <span class="${failing.length ? 'readout-fail' : 'readout-pass'}">${
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
