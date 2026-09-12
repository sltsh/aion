import { buildColors, colors } from './colors.js';
import { semanticTokenColors, semanticTokenColorsFor, tokenColors, tokenColorsFor } from './tokens.js';
import { lightPalette } from '@sltsh/aion-tokens';
import type { Palette } from '@sltsh/aion-tokens';

export type ColourScheme = 'dark' | 'light';

export interface Theme {
  readonly $schema: string;
  readonly name: string;
  readonly type: 'dark' | 'light';
  readonly semanticHighlighting: true;
  readonly colors: Record<string, string>;
  readonly semanticTokenColors: Record<string, string>;
  readonly tokenColors: ReturnType<typeof tokenColors.slice>;
}

const darkTheme = (): Theme => ({
  $schema: 'vscode://schemas/color-theme',
  name: 'Aion',
  type: 'dark',
  semanticHighlighting: true,
  colors: Object.fromEntries(Object.entries(colors).sort(([a], [b]) => a.localeCompare(b))),
  semanticTokenColors,
  tokenColors: tokenColors.slice(),
});

const themeFor = (name: string, type: Theme['type'], palette: Palette): Theme => ({
  $schema: 'vscode://schemas/color-theme',
  name,
  type,
  semanticHighlighting: true,
  colors: Object.fromEntries(Object.entries(buildColors(palette)).sort(([a], [b]) => a.localeCompare(b))),
  semanticTokenColors: semanticTokenColorsFor(palette),
  tokenColors: tokenColorsFor(palette),
});

export const theme = (scheme: ColourScheme = 'dark'): Theme =>
  scheme === 'dark' ? darkTheme() : themeFor('Aion Light', 'light', lightPalette);

export const lightTheme = (): Theme => theme('light');
