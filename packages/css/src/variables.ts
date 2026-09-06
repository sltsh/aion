import {
  ACCENTS, ACCENT_NAMES, ANSI_ORDER, SYNTAX, accentScale, ansi, comment, cursor, dimText, diff, diffWash,
  findMatch, hex, hexAlpha, lightAccentScale, lightNeutral, neutral, overlay, status, statusLight,
} from '@sltsh/aion-tokens';
import type { AccentName, Oklch, SyntaxRole } from '@sltsh/aion-tokens';

export type Variables = Record<string, string>;

const kebab = (value: string): string => value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

// A web page names its surfaces by depth, not by editor part. Both schemes stay monotonic.
const DARK_SURFACE: Record<string, Oklch> = {
  page: neutral.editor, surface: neutral.terminal, raised: neutral.widget,
  input: neutral.input, hover: neutral.hover,
};

const LIGHT_SURFACE: Record<string, Oklch> = {
  page: lightNeutral.page, surface: lightNeutral.surface, raised: lightNeutral.raised,
  input: lightNeutral.input, hover: lightNeutral.hover,
};

const scheme = (
  surfaces: Record<string, Oklch>,
  text: { primary: Oklch; secondary: Oklch; dim: Oklch; muted: Oklch; onAccent: Oklch },
  borders: { hairline: Oklch; divider: Oklch; ui: Oklch; focus: Oklch },
  accent: (name: AccentName) => { subtle: Oklch; border: Oklch; solid: Oklch },
  statuses: typeof status,
): Variables => {
  const out: Variables = {};
  for (const [name, colour] of Object.entries(surfaces)) out[`--aion-bg-${name}`] = hex(colour);
  for (const [name, colour] of Object.entries(text)) out[`--aion-fg-${kebab(name)}`] = hex(colour);
  for (const [name, colour] of Object.entries(borders)) out[`--aion-border-${name}`] = hex(colour);
  for (const name of ACCENT_NAMES) {
    const scale = accent(name);
    out[`--aion-${name}-subtle`] = hex(scale.subtle);
    out[`--aion-${name}-border`] = hex(scale.border);
    out[`--aion-${name}-solid`] = hex(scale.solid);
  }
  for (const [name, scale] of Object.entries(statuses)) {
    out[`--aion-status-${name}-text`] = hex(scale.text);
    out[`--aion-status-${name}-solid`] = hex(scale.solid);
    out[`--aion-status-${name}-subtle`] = hex(scale.subtle);
    out[`--aion-status-${name}-border`] = hex(scale.border);
    out[`--aion-status-${name}-on-solid`] = hex(scale.onSolid);
  }
  return out;
};

const syntax = (colour: (role: SyntaxRole) => Oklch, commentColour: Oklch, punctuation: Oklch): Variables => {
  const out: Variables = {};
  for (const role of Object.keys(SYNTAX) as SyntaxRole[]) out[`--aion-syntax-${role}`] = hex(colour(role));
  out['--aion-syntax-comment'] = hex(commentColour);
  out['--aion-syntax-punctuation'] = hex(punctuation);
  return out;
};

export const dark = (): Variables => ({
  ...scheme(
    DARK_SURFACE,
    { primary: neutral.textPrimary, secondary: neutral.textSecondary, dim: dimText, muted: neutral.muted, onAccent: neutral.editor },
    { hairline: neutral.hairline, divider: neutral.divider, ui: neutral.border, focus: ACCENTS.gold },
    accentScale,
    status,
  ),
  ...syntax((role) => ACCENTS[SYNTAX[role]], comment, neutral.textSecondary),
  '--aion-fg-link': hex(ACCENTS.blue),
  '--aion-caret': hex(cursor),
  '--aion-overlay-selection': hexAlpha(overlay.selection.color, overlay.selection.alpha),
  '--aion-overlay-find-match': hex(findMatch.current),
  '--aion-overlay-line-highlight': hexAlpha(overlay.lineHighlight.color, overlay.lineHighlight.alpha),
  '--aion-diff-added': hexAlpha(diffWash.addedLine.color, diffWash.addedLine.alpha),
  '--aion-diff-removed': hexAlpha(diffWash.removedLine.color, diffWash.removedLine.alpha),
  '--aion-diff-added-gutter': hex(diff.addedGutter),
  '--aion-diff-removed-gutter': hex(diff.removedGutter),
  ...Object.fromEntries(ANSI_ORDER.map((slot) => [`--aion-ansi-${kebab(slot)}`, hex(ansi[slot])])),
});

export const light = (): Variables => ({
  ...scheme(
    LIGHT_SURFACE,
    { primary: lightNeutral.textPrimary, secondary: lightNeutral.textSecondary, dim: lightNeutral.muted, muted: lightNeutral.muted, onAccent: lightNeutral.page },
    { hairline: lightNeutral.hairline, divider: lightNeutral.divider, ui: lightNeutral.border, focus: lightAccentScale('gold').solid },
    lightAccentScale,
    statusLight,
  ),
  ...syntax((role) => lightAccentScale(SYNTAX[role]).solid, lightNeutral.muted, lightNeutral.textSecondary),
  '--aion-fg-link': hex(lightAccentScale('blue').solid),
  '--aion-caret': hex(lightAccentScale('gold').solid),
  '--aion-overlay-selection': hexAlpha(lightNeutral.hover, 0.9),
  '--aion-overlay-find-match': hex(lightAccentScale('gold').subtle),
  '--aion-overlay-line-highlight': hex(lightNeutral.surface),
  '--aion-diff-added': hex(lightAccentScale('green').subtle),
  '--aion-diff-removed': hex(lightAccentScale('coral').subtle),
  '--aion-diff-added-gutter': hex(lightAccentScale('green').solid),
  '--aion-diff-removed-gutter': hex(lightAccentScale('coral').solid),
  ...Object.fromEntries(ANSI_ORDER.map((slot) => [`--aion-ansi-${kebab(slot)}`, hex(ansi[slot])])),
});
