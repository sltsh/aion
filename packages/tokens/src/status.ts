import type { Oklch } from './oklch.js';
import { inGamut } from './oklch.js';
import type { AccentName, AccentScale, StatusName } from './palette.js';
import { ACCENT_NAMES, MEANING_PAIR_GAP, STATUS, accentScale, neutral } from './palette.js';
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

const lightStatusError = (success: Oklch, error: Oklch): Oklch => {
  const lightness = Math.max(0, Math.min(error[0], success[0] - MEANING_PAIR_GAP));
  let chroma = error[1];
  for (let i = 0; i < 240; i += 1) {
    const candidate: Oklch = [lightness, Math.round(chroma * 10000) / 10000, error[2]];
    if (inGamut(candidate)) return candidate;
    chroma *= 0.98;
  }
  throw new Error('no in-gamut light error status');
};

// Light success and error are not the same as the syntax accents: success must remain
// lighter than error by the documented gap, while both still use their own accent scale
// for subtle and border pairings. The light error solid is therefore a deliberate darker
// role value, not an accidental alias of the coral accent.
export const statusLightFor = (
  scales: Record<AccentName, AccentScale>,
  onSolid: Oklch = lightNeutral.page,
): Record<StatusName, StatusScale> => {
  const success = scales[STATUS.success].solid;
  const error = lightStatusError(success, scales[STATUS.error].solid);
  return mapValues(STATUS, (accent) => {
    const scale = scales[accent];
    const solid = accent === STATUS.error ? error : scale.solid;
    return { text: solid, solid, subtle: scale.subtle, border: scale.border, onSolid };
  });
};

const lightScales = Object.fromEntries(
  ACCENT_NAMES.map((name) => [name, lightAccentScale(name)]),
) as Record<AccentName, AccentScale>;

export const statusLight: Record<StatusName, StatusScale> = statusLightFor(lightScales);
