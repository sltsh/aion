import type { Oklch, } from './oklch.js';
import type { AccentName, SyntaxRole } from './palette.js';
import {
  ACCENTS, SYNTAX, accentScale, bracketPairs, comment, cursor, diff, dimText, neutral, overlay,
} from './palette.js';
import { lightAccentScale, lightNeutral } from './light.js';
import { mapValues } from './util.js';

const syntaxColour = (role: SyntaxRole): Oklch => ACCENTS[SYNTAX[role]];

export const bg = {
  editor: neutral.editor,
  terminal: neutral.terminal,
  panel: neutral.terminal,
  sidebar: neutral.sidebar,
  activityBar: neutral.sidebar,
  statusBar: neutral.sidebar,
  tabBar: neutral.sidebar,
  tabActive: neutral.editor,
  tabInactive: neutral.input,
  widget: neutral.widget,
  menu: neutral.widget,
  notification: neutral.widget,
  input: neutral.input,
  hover: neutral.hover,
} as const satisfies Record<string, Oklch>;

export const fg = {
  primary: neutral.textPrimary,
  secondary: neutral.textSecondary,
  dim: dimText,
  muted: neutral.muted,
  onAccent: neutral.editor,
  comment,
  punctuation: neutral.textSecondary,
  cursor,
  link: ACCENTS.blue,
} as const satisfies Record<string, Oklch>;

// `hairline` and `divider` are decorative and exempt from the non-text floor. `ui`,
// `control` and `focus` draw functional edges, so each clears 3:1 on both surfaces it
// touches; a ratio against the editor alone would miss the lighter inner surface.
export const border = {
  hairline: neutral.hairline,
  divider: neutral.divider,
  ui: neutral.border,
  control: neutral.border,
  focus: ACCENTS.gold,
} as const satisfies Record<string, Oklch>;

// Each functional edge and the two surfaces it separates. The gate reads this.
export const BOUNDARY_PAIRS = [
  { edge: 'control', inside: 'input', outside: 'widget' },
  { edge: 'control', inside: 'input', outside: 'sidebar' },
  { edge: 'control', inside: 'input', outside: 'editor' },
  { edge: 'ui', inside: 'widget', outside: 'editor' },
  { edge: 'focus', inside: 'input', outside: 'sidebar' },
  { edge: 'focus', inside: 'widget', outside: 'editor' },
] as const satisfies readonly { edge: keyof typeof border; inside: keyof typeof bg; outside: keyof typeof bg }[];

export const syntax: Record<SyntaxRole | 'comment' | 'punctuation', Oklch> = {
  ...mapValues(SYNTAX, (_accent, role) => syntaxColour(role)),
  comment,
  punctuation: neutral.textSecondary,
};

export const accent: Record<AccentName, ReturnType<typeof accentScale>> = mapValues(
  ACCENTS,
  (_value, name) => accentScale(name),
);

export const brackets: readonly Oklch[] = bracketPairs.map((name) => ACCENTS[name]);

export const semantic = { bg, fg, border, syntax, accent, brackets, diff, overlay } as const;

export const bgLight = {
  page: lightNeutral.page,
  surface: lightNeutral.surface,
  raised: lightNeutral.raised,
  input: lightNeutral.input,
  hover: lightNeutral.hover,
} as const satisfies Record<string, Oklch>;

export const fgLight = {
  primary: lightNeutral.textPrimary,
  secondary: lightNeutral.textSecondary,
  dim: lightNeutral.muted,
  muted: lightNeutral.muted,
  onAccent: lightNeutral.page,
  link: lightAccentScale('blue').solid,
} as const satisfies Record<string, Oklch>;

export const borderLight = {
  hairline: lightNeutral.hairline,
  divider: lightNeutral.divider,
  ui: lightNeutral.border,
  input: lightNeutral.border,
  focus: lightAccentScale('gold').solid,
} as const satisfies Record<string, Oklch>;

export const accentLight: Record<AccentName, ReturnType<typeof lightAccentScale>> = mapValues(
  ACCENTS,
  (_value, name) => lightAccentScale(name),
);

export const semanticLight = {
  bg: bgLight, fg: fgLight, border: borderLight, accent: accentLight,
} as const;
