import { dark, light } from '@sltsh/aion-css';

export interface SwatchData {
  readonly label: string;
  readonly role: string;
  readonly variable: string;
  readonly dark: string;
  readonly light: string;
}

export const GROUP_IDS = ['surface', 'accent', 'terminal'] as const;
export type GroupId = (typeof GROUP_IDS)[number];
export interface Group {
  readonly id: GroupId;
  readonly title: string;
  readonly description: string;
  readonly swatches: readonly SwatchData[];
}

type ColourDefinition = readonly [label: string, role: string, key: string];

const FOUNDATIONS: readonly ColourDefinition[] = [
  ['Background', 'Editor & main canvas', 'bg-page'],
  ['Surface', 'Raised panels & menus', 'bg-raised'],
  ['Text', 'Primary foreground', 'fg-primary'],
  ['Muted text', 'Secondary foreground', 'fg-secondary'],
];

const COLOURS: readonly ColourDefinition[] = [
  ['Red', 'Variables', 'syntax-variable'],
  ['Orange', 'Numbers', 'syntax-number'],
  ['Gold', 'Types & constants', 'syntax-type'],
  ['Green', 'Strings', 'syntax-string'],
  ['Teal', 'Operators', 'syntax-operator'],
  ['Blue', 'Functions', 'syntax-function'],
  ['Violet', 'Keywords', 'syntax-keyword'],
];

export const ANSI_SLOTS = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'bright-black', 'bright-red', 'bright-green', 'bright-yellow',
  'bright-blue', 'bright-magenta', 'bright-cyan', 'bright-white',
] as const;

const TERMINAL: readonly ColourDefinition[] = ANSI_SLOTS.map((name, slot) => [
  name.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase()),
  `ANSI ${slot}`, `ansi-${name}`,
]);

const swatches = (definitions: readonly ColourDefinition[]): readonly SwatchData[] => {
  const d = dark();
  const l = light();
  return definitions.map(([label, role, key]) => {
    const variable = `--aion-${key}`;
    const darkValue = d[variable];
    const lightValue = l[variable];
    if (darkValue === undefined || lightValue === undefined) throw new Error(`Missing colour: ${variable}`);
    return { label, role, variable, dark: darkValue, light: lightValue };
  });
};

export const essentials = (): readonly SwatchData[] => swatches([...FOUNDATIONS, ...COLOURS]);

export const colourBlock = (rows: readonly SwatchData[], scheme: 'dark' | 'light'): string =>
  rows.map((row) => `${row.label}: ${row[scheme]}`).join('\n');

export const groups = (): readonly Group[] => [
  { id: 'surface', title: 'Foundations',
    description: 'A dark canvas, a raised surface, and two levels of text. Start here when bringing Aion to another app.',
    swatches: swatches(FOUNDATIONS) },
  { id: 'accent', title: 'Colours',
    description: 'Gold gives Aion its signature; teal is its counterpart. In code, each colour has a familiar role.',
    swatches: swatches(COLOURS) },
  { id: 'terminal', title: 'Terminal',
    description: 'The standard and bright ANSI colours, in slot order. For a terminal without an Aion theme file, copy these into its colour settings.',
    swatches: swatches(TERMINAL) },
];
