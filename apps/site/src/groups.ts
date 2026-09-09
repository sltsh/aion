import { dark, light } from '@sltsh/aion-css';

export interface SwatchData {
  readonly label: string;
  readonly role: string;
  readonly variable: string;
  readonly dark: string;
  readonly light: string;
}

export const GROUP_IDS = ['foundations', 'accents', 'interface', 'syntax', 'terminal'] as const;
export type GroupId = (typeof GROUP_IDS)[number];
export interface Group {
  readonly id: GroupId;
  readonly title: string;
  readonly description: string;
  readonly swatches: readonly SwatchData[];
}

type ColourDefinition = readonly [label: string, role: string, key: string];

const ESSENTIAL_FOUNDATIONS: readonly ColourDefinition[] = [
  ['Background', 'Editor & main canvas', 'bg-page'],
  ['Surface', 'Sidebar & panels', 'bg-surface'],
  ['Text', 'Primary foreground', 'fg-primary'],
  ['Secondary text', 'Secondary foreground', 'fg-secondary'],
];

const ESSENTIAL_COLOURS: readonly ColourDefinition[] = [
  ['Gold', 'Primary accent', 'gold-solid'],
  ['Teal', 'Secondary accent', 'teal-solid'],
  ['Coral', 'Errors & variables', 'coral-solid'],
  ['Copper', 'Warnings & numbers', 'copper-solid'],
  ['Green', 'Success & strings', 'green-solid'],
  ['Blue', 'Links & functions', 'blue-solid'],
  ['Violet', 'Keywords & emphasis', 'violet-solid'],
];

const FOUNDATIONS: readonly ColourDefinition[] = [
  ['Canvas', 'Main editor & canvas', 'bg-page'],
  ['Surface', 'Raised panels & menus', 'bg-surface'],
  ['Elevated', 'Popups & dropdowns', 'bg-raised'],
  ['Input', 'Form controls & fields', 'bg-input'],
  ['Hover', 'Interactive hover surface', 'bg-hover'],
  ['Primary text', 'Primary foreground', 'fg-primary'],
  ['Secondary text', 'Supporting labels', 'fg-secondary'],
  ['Dim text', 'Tertiary information', 'fg-dim'],
  ['Text on accent', 'Filled controls & tags', 'fg-on-accent'],
  ['Hairline', 'Subtle boundary', 'border-hairline'],
  ['Divider', 'Section separator', 'border-divider'],
  ['Control edge', 'Functional control boundary', 'border-ui'],
  ['Focus', 'Keyboard focus ring', 'border-focus'],
];

const ACCENT_HUES = ['coral', 'copper', 'gold', 'green', 'teal', 'blue', 'violet'] as const;

const ACCENTS: readonly ColourDefinition[] = ACCENT_HUES.flatMap((name) => {
  const cap = name[0]!.toUpperCase() + name.slice(1);
  return [
    [`${cap} solid`, 'Solid & text', `${name}-solid`],
    [`${cap} subtle`, 'Subtle fill', `${name}-subtle`],
    [`${cap} border`, 'Accent border', `${name}-border`],
  ] as const;
});

const INTERFACE_ROLES: readonly ColourDefinition[] = [
  ['Link', 'Portable link role (blue)', 'fg-link'],
  ['Success', 'Positive state / completed', 'status-success-solid'],
  ['Warning', 'Caution / pending', 'status-warning-solid'],
  ['Error', 'Negative state / critical', 'status-error-solid'],
  ['Info', 'Informational highlight', 'status-info-solid'],
];

const SYNTAX_ROLES: readonly ColourDefinition[] = [
  ['Variables', 'Identifiers & parameters', 'syntax-variable'],
  ['Numbers', 'Numeric literals', 'syntax-number'],
  ['Constants', 'Constants & booleans', 'syntax-constant'],
  ['Types', 'Types, classes & interfaces', 'syntax-type'],
  ['Strings', 'String literals', 'syntax-string'],
  ['Operators', 'Operators & regex', 'syntax-operator'],
  ['Escapes', 'Escape sequences', 'syntax-escape'],
  ['Functions', 'Functions & methods', 'syntax-function'],
  ['Keywords', 'Control keywords & storage', 'syntax-keyword'],
  ['Comments', 'Comments & documentation', 'syntax-comment'],
  ['Punctuation', 'Delimiters & punctuation', 'syntax-punctuation'],
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

export const essentials = (): readonly SwatchData[] => swatches([...ESSENTIAL_FOUNDATIONS, ...ESSENTIAL_COLOURS]);

export const colourBlock = (rows: readonly SwatchData[], scheme: 'dark' | 'light'): string =>
  rows.map((row) => `${row.label}: ${row[scheme]}`).join('\n');

export const groups = (): readonly Group[] => [
  {
    id: 'foundations',
    title: 'Foundations',
    description: 'The surface ladder, text hierarchy, functional boundaries, and focus indicator. Start here when bringing Aion to another app.',
    swatches: swatches(FOUNDATIONS),
  },
  {
    id: 'accents',
    title: 'Accents',
    description: 'The seven canonical Aion hues in their solid, subtle, and border forms. Solid accents identify roles; subtle fills provide tinted emphasis; borders frame interactive elements.',
    swatches: swatches(ACCENTS),
  },
  {
    id: 'interface',
    title: 'Interface roles',
    description: 'Status mappings for positive, caution, critical, and informational feedback. Aion’s portable link role remains blue, distinct from this marketing site’s gold links.',
    swatches: swatches(INTERFACE_ROLES),
  },
  {
    id: 'syntax',
    title: 'Syntax',
    description: 'The core editor syntax mapping, plus comments and punctuation. Map an editor’s language token categories to these roles.',
    swatches: swatches(SYNTAX_ROLES),
  },
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'The standard and bright ANSI colours, in slot order. For a terminal without an Aion theme file, copy these into its colour settings.',
    swatches: swatches(TERMINAL),
  },
];
