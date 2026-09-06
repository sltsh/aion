import { ANSI_ORDER, hex, hexAlpha } from '@sltsh/aion-tokens';
import type { Palette } from '@sltsh/aion-tokens';

const kebab = (value: string): string => value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function variables(palette: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, colour] of Object.entries(palette.neutral)) out[`--n-${kebab(name)}`] = hex(colour);
  out['--n-dim'] = hex(palette.dim);
  for (const [name, scale] of Object.entries(palette.scales)) {
    out[`--a-${name}`] = hex(scale.solid);
    out[`--a-${name}-border`] = hex(scale.border);
    out[`--a-${name}-subtle`] = hex(scale.subtle);
  }
  for (const [role, colour] of Object.entries(palette.syntax)) out[`--s-${role}`] = hex(colour);
  out['--s-comment'] = hex(palette.comment);
  out['--s-punctuation'] = hex(palette.neutral.textSecondary);
  for (const slot of ANSI_ORDER) out[`--ansi-${kebab(slot)}`] = hex(palette.ansi[slot]);
  for (const [name, value] of Object.entries(palette.overlay)) {
    out[`--o-${kebab(name)}`] = hexAlpha(value.color, value.alpha);
  }
  for (const [name, colour] of Object.entries(palette.diff)) out[`--d-${kebab(name)}`] = hex(colour);
  // The diff washes carry an alpha byte, so they take the overlay prefix. VS Code paints
  // them over the selection, which is why they cannot be opaque.
  for (const [name, value] of Object.entries(palette.diffWash)) {
    out[`--o-${kebab(name)}`] = hexAlpha(value.color, value.alpha);
  }
  for (const [name, colour] of Object.entries(palette.findMatch)) {
    out[`--find-${kebab(name)}`] = hex(colour);
  }
  palette.brackets.forEach((colour, index) => { out[`--bracket-${index + 1}`] = hex(colour); });
  out['--caret'] = hex(palette.cursor);
  return out;
}

export function applyVariables(root: HTMLElement, palette: Palette): void {
  for (const [name, value] of Object.entries(variables(palette))) root.style.setProperty(name, value);
}
