import type { Oklch } from './oklch.js';
import { hex } from './oklch.js';
import type { AccentName } from './palette.js';
import { ACCENTS, ACCENT_NAMES, comment, neutral } from './palette.js';
import { lightAccents, lightComment, lightEditorNeutral } from './light.js';

export type StripScheme = 'dark' | 'light';

const SWATCH = 88;
const GAP = 16;
const PAD = 24;

// The README shows the palette through this image rather than quoting hex it would have to
// keep in step. `npm run sync:design` writes it; a test fails if the committed file drifts.
export function paletteStrip(scheme: StripScheme): string {
  const surface = scheme === 'dark' ? neutral : lightEditorNeutral;
  const accent = (name: AccentName): Oklch => scheme === 'dark' ? ACCENTS[name] : lightAccents[name];
  const swatches: { label: string; colour: Oklch }[] = [
    ...ACCENT_NAMES.map((name) => ({ label: name, colour: accent(name) })),
    { label: 'comment', colour: scheme === 'dark' ? comment : lightComment },
  ];
  const width = PAD * 2 + swatches.length * SWATCH + (swatches.length - 1) * GAP;
  const height = PAD * 2 + SWATCH + 56;
  const primary = hex(surface.textPrimary);
  const secondary = hex(surface.textSecondary);
  const cells = swatches.map((swatch, i) => {
    const x = PAD + i * (SWATCH + GAP);
    const middle = x + SWATCH / 2;
    const value = hex(swatch.colour);
    return [
      `  <rect x="${x}" y="${PAD}" width="${SWATCH}" height="${SWATCH}" rx="12" fill="${value}"/>`,
      `  <text x="${middle}" y="${PAD + SWATCH + 22}" fill="${primary}" font-size="14">${swatch.label}</text>`,
      `  <text x="${middle}" y="${PAD + SWATCH + 42}" fill="${secondary}" font-size="12">${value}</text>`,
    ].join('\n');
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Aion ${scheme === 'dark' ? 'Dark' : 'Light'} palette">`,
    `  <rect width="${width}" height="${height}" rx="16" fill="${hex(surface.editor)}"/>`,
    `  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" text-anchor="middle">`,
    ...cells,
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
}
