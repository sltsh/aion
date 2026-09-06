import { dark } from '@sltsh/aion-css';
import {
  ACCENTS, ACCENT_NAMES, NEUTRAL_LIGHTNESS, NEUTRAL_ROLE, accentScale, hex, neutral,
} from '@sltsh/aion-tokens';
import type { AccentName, NeutralName } from '@sltsh/aion-tokens';
import { escapeHtml } from './render/html.js';

export interface RampRow {
  readonly step: number;
  readonly role: string;
  readonly lightness: string;
  readonly hex: string;
  readonly variable: string | undefined;
}

// The CSS layer names surfaces by depth, so it emits five of the twelve steps under
// --aion-bg-*. The rest surface as text or border names, and `sidebar` has no web
// equivalent at all. Matching on the emitted hex finds the name whatever it is called.
const variableFor = (colour: string, emitted: Record<string, string>): string | undefined =>
  Object.keys(emitted).find((name) => emitted[name] === colour);

export function rampRows(): readonly RampRow[] {
  const emitted = dark();
  return (Object.keys(NEUTRAL_LIGHTNESS) as NeutralName[]).map((name, index) => {
    const value = hex(neutral[name]);
    return {
      step: index + 1,
      role: NEUTRAL_ROLE[name],
      lightness: NEUTRAL_LIGHTNESS[name].toFixed(3),
      hex: value,
      variable: variableFor(value, emitted),
    };
  });
}

const hexCell = (value: string): string =>
  `<button type="button" class="hex-cell" data-copy data-dark="${value}"><code>${value}</code></button>`;

const bar = (value: string): string => `<span class="bar" style="--site-swatch:${value}"></span>`;

export function renderRamp(): string {
  const rows = rampRows().map((row) => `<tr>
    <td class="cell-bar">${bar(row.hex)}</td>
    <td>${row.step}</td>
    <td>${escapeHtml(row.role)}</td>
    <td><code>${row.lightness}</code></td>
    <td>${hexCell(row.hex)}</td>
    <td>${row.variable === undefined ? '<span class="note">VS Code only</span>' : `<code>${escapeHtml(row.variable)}</code>`}</td>
  </tr>`).join('');
  return `<table class="ramp">
    <thead><tr><th></th><th>Step</th><th>Role</th><th>Lightness</th><th>Hex</th><th>CSS variable</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export interface AccentRow {
  readonly name: AccentName;
  readonly hue: number;
  readonly chroma: string;
  readonly solid: string;
  readonly border: string;
  readonly subtle: string;
}

export function accentRows(): readonly AccentRow[] {
  return ACCENT_NAMES.map((name) => {
    const [, chroma, hue] = ACCENTS[name];
    const scale = accentScale(name);
    return {
      name,
      hue,
      chroma: chroma.toFixed(4),
      solid: hex(scale.solid),
      border: hex(scale.border),
      subtle: hex(scale.subtle),
    };
  });
}

export function renderAccents(): string {
  const rows = accentRows().map((row) => `<tr>
    <td><span class="dot" style="--site-swatch:${row.solid}"></span>${row.name}</td>
    <td><code>${row.hue}°</code></td>
    <td><code>${row.chroma}</code></td>
    <td>${hexCell(row.solid)}</td>
    <td>${hexCell(row.border)}</td>
    <td>${hexCell(row.subtle)}</td>
  </tr>`).join('');
  return `<table class="accents">
    <thead><tr><th>Accent</th><th>Hue</th><th>Chroma</th><th>Solid</th><th>Border</th><th>Subtle</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}
