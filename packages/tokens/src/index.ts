export type { Oklch, LinearSrgb, SolveDirection } from './oklch.js';
export {
  oklchToLinearSrgb, inGamut, hex, hexAlpha, luminance, contrast, contrastEmitted,
  compositeEmitted, hexToOklch, solveLightness,
} from './oklch.js';

export type {
  NeutralName, AccentName, AccentScale, SyntaxRole, StatusName, DiffName, Overlay, OverlayName,
  AnsiSlot, TerminalBackgroundName, DiffWashName,
} from './palette.js';
export {
  BASE_HUE, BASE_CHROMA, NEUTRAL_LIGHTNESS, neutral, ACCENTS, ACCENT_NAMES, accentScale, scaleOf,
  SYNTAX, ONE_DARK_PRO_HUE, comment, dimText, STATUS, diff, diffWash, overlay, findMatch,
  bracketPairs, cursor, ansi, ANSI_ORDER, ANSI_BLACK_TEXT, terminalBackground,
  terminalSelection, TERMINAL_BACKGROUNDS, CHROMA_CEILING, CHROMA_DEFAULT, HUE_DRIFT_LIMIT,
  CONTRAST_FLOOR, NON_TEXT_FLOOR, MEANING_PAIR_GAP, CONTRAST_EXEMPT,
} from './palette.js';

export type { LightNeutralName } from './light.js';
export {
  LIGHT_LIGHTNESS, lightNeutral, lightEditorNeutral, lightDimText, lightComment, lightSyntax,
  lightAnsiWhite, lightAnsiBrightBlack, LIGHT_CHROMA_FLOOR_EXCEPTION,
  lightAccent, lightAccents, lightAccentScale, lightOverlay, lightFindMatch, lightDiff,
  lightDiffWash, lightBrackets, lightCursor, lightAnsi, lightTerminalSelection,
} from './light.js';

export type { StatusScale } from './status.js';
export { status, statusLight } from './status.js';

export {
  bg, fg, border, syntax, accent, brackets, semantic, BOUNDARY_PAIRS,
  bgLight, fgLight, borderLight, accentLight, semanticLight, BOUNDARY_PAIRS_LIGHT,
} from './semantic.js';

export type { Marker, Solution } from './solve.js';
export { solveMarker, binding, distanceEmitted } from './solve.js';

export type { ReadingState, StateSource, SurfaceName } from './states.js';
export { readingStates, readingForegrounds, SHIPPED, LIGHT_SHIPPED } from './states.js';

export { flatten } from './flatten.js';

export type { Check, CheckState } from './report.js';
export { checks, failures, designTables, NEUTRAL_ROLE } from './report.js';

export type { Palette, PreviewOptions, LightPreviewOptions, ColourScheme } from './preview.js';
export {
  buildPalette, PREVIEW_DEFAULTS, buildLightPalette, LIGHT_PREVIEW_DEFAULTS, lightPalette,
  buildSchemePalette,
} from './preview.js';

export type { Rival, RivalResult, SurfaceOrder } from './rivals.js';
export { RIVALS, SYNTAX_ROLES_COMPARED, contrastHex, measure, surfaceOrder } from './rivals.js';
