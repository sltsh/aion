import type { Oklch } from './oklch.js';
import type { StatusName } from './palette.js';
import { STATUS, accentScale, neutral } from './palette.js';
import { lightAccentScale, lightNeutral } from './light.js';
import { mapValues } from './util.js';

export interface StatusScale {
  readonly text: Oklch;
  readonly solid: Oklch;
  readonly subtle: Oklch;
  readonly border: Oklch;
  readonly onSolid: Oklch;
}

export const status: Record<StatusName, StatusScale> = mapValues(STATUS, (accent) => {
  const scale = accentScale(accent);
  return { text: scale.solid, solid: scale.solid, subtle: scale.subtle, border: scale.border, onSolid: neutral.editor };
});

export const statusLight: Record<StatusName, StatusScale> = mapValues(STATUS, (accent) => {
  const scale = lightAccentScale(accent);
  return { text: scale.solid, solid: scale.solid, subtle: scale.subtle, border: scale.border, onSolid: lightNeutral.page };
});
