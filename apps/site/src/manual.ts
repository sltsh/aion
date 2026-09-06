import { dark } from '@sltsh/aion-css';

export interface RoleRow {
  readonly role: string;
  readonly variable: string;
  readonly hex: string;
  readonly note: string;
}

const emitted = (variable: string): string => {
  const value = dark()[variable];
  if (value === undefined) throw new Error(`@sltsh/aion-css emits no ${variable}`);
  return value;
};

const CORE: readonly (readonly [role: string, variable: string, note: string])[] = [
  ['Background', '--aion-bg-page', 'The editor. The darkest surface in the theme.'],
  ['Panel', '--aion-bg-raised', 'Sidebar, status bar, any chrome that sits above the editor.'],
  ['Foreground', '--aion-fg-primary', 'Body text.'],
  ['Dim foreground', '--aion-fg-secondary', 'Labels and anything deliberately quieter.'],
  ['Cursor', '--aion-caret', 'Gold, so it never collides with a syntax colour.'],
  ['Selection', '--aion-overlay-selection', 'Eight digits: the last byte is alpha.'],
  ['Selection, opaque', '--aion-bg-hover', 'Use this where an alpha byte is not accepted.'],
  ['Line highlight', '--aion-overlay-line-highlight', 'Also carries an alpha byte.'],
  ['Border', '--aion-border-ui', 'The edge of a control someone has to find with a keyboard.'],
  ['Focus ring', '--aion-border-focus', 'Never the same colour as the border it replaces.'],
  ['Link', '--aion-fg-link', 'Blue, matching the function colour in code.'],
];

export function coreRows(): readonly RoleRow[] {
  return CORE.map(([role, variable, note]) => ({ role, variable, hex: emitted(variable), note }));
}

export const ANSI_SLOTS = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'bright-black', 'bright-red', 'bright-green', 'bright-yellow',
  'bright-blue', 'bright-magenta', 'bright-cyan', 'bright-white',
] as const;

export interface AnsiRow {
  readonly slot: number;
  readonly name: string;
  readonly variable: string;
  readonly hex: string;
}

export function ansiRows(): readonly AnsiRow[] {
  return ANSI_SLOTS.map((name, slot) => {
    const variable = `--aion-ansi-${name}`;
    return { slot, name, variable, hex: emitted(variable) };
  });
}

const pad = (rows: readonly string[][]): string => {
  const width = Math.max(...rows.map((row) => row[0]?.length ?? 0));
  return rows.map((row) => `${(row[0] ?? '').padEnd(width)}  ${row[1] ?? ''}`).join('\n');
};

export const coreBlock = (): string =>
  pad(coreRows().map((row) => [row.variable, row.hex]));

export const ansiBlock = (): string =>
  pad(ansiRows().map((row) => [`${row.slot} ${row.name}`, row.hex]));
