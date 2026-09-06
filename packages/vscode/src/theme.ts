import { colors } from './colors.js';
import { semanticTokenColors, tokenColors } from './tokens.js';

export interface Theme {
  readonly $schema: string;
  readonly name: string;
  readonly type: 'dark';
  readonly semanticHighlighting: true;
  readonly colors: Record<string, string>;
  readonly semanticTokenColors: Record<string, string>;
  readonly tokenColors: ReturnType<typeof tokenColors.slice>;
}

export const theme = (): Theme => ({
  $schema: 'vscode://schemas/color-theme',
  name: 'Aion',
  type: 'dark',
  semanticHighlighting: true,
  colors: Object.fromEntries(Object.entries(colors).sort(([a], [b]) => a.localeCompare(b))),
  semanticTokenColors,
  tokenColors: tokenColors.slice(),
});
