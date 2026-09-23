import type { Oklch } from './oklch.js';
import { CONTRAST_FLOOR } from './palette.js';
import { lightAccentScale, lightComment, lightNeutral, lightSyntax } from './light.js';
import { fgLight } from './semantic.js';
import { solveMarker } from './solve.js';

// Obsidian's page and code selection must remain visible while its comment text stays readable.
export const obsidianLightSelection: Oklch = solveMarker({
  hues: [210], against: lightNeutral.raised,
  foregrounds: { normal: fgLight.primary, comment: lightComment, ...lightSyntax },
  stacks: [[]], floor: CONTRAST_FLOOR,
  lightness: [0.930, 0.950], chroma: [0.040, 0.060],
})?.colour ?? (() => { throw new Error('No readable Obsidian light selection'); })();

// Obsidian uses the same highlight beneath note text and sidebar search results.
export const obsidianLightHighlight: Oklch = solveMarker({
  hues: [90], against: lightNeutral.page,
  foregrounds: { normal: fgLight.primary, link: fgLight.link, comment: lightComment, ...lightSyntax },
  stacks: [[]], floor: CONTRAST_FLOOR,
  lightness: [0.930, 0.950], chroma: [0.060, 0.080],
})?.colour ?? (() => { throw new Error('No readable Obsidian light highlight'); })();

export const obsidianLightActiveRow: Oklch = solveMarker({
  hues: [90], against: lightNeutral.surface,
  foregrounds: { active: lightAccentScale('gold').solid },
  stacks: [[]], floor: CONTRAST_FLOOR,
  lightness: [0.900, 0.950], chroma: [0.030, 0.080],
})?.colour ?? (() => { throw new Error('No readable Obsidian light active row'); })();

export const obsidianPink = {
  dark: [0.750, 0.145, 345],
  light: [0.540, 0.170, 345],
} as const satisfies Record<'dark' | 'light', Oklch>;
