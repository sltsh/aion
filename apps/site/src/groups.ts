import { dark, light } from '@sltsh/aion-css';
import { ACCENT_NAMES } from '@sltsh/aion-tokens';

export interface SwatchData {
  readonly variable: string;
  readonly dark: string;
  readonly light: string;
}

export const GROUP_IDS = ['surface', 'accent', 'syntax', 'status', 'decoration', 'terminal'] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export interface Group {
  readonly id: GroupId;
  readonly title: string;
  readonly swatches: readonly SwatchData[];
}

export const GROUP_TITLES: Record<GroupId, string> = {
  surface: 'Surfaces, text and borders',
  accent: 'Accents',
  syntax: 'Syntax',
  status: 'Status',
  decoration: 'Diff and overlays',
  terminal: 'Terminal',
};

// The partition is by name prefix and it is total. `groupOf` returns undefined rather
// than a default group, so a variable the CSS package adds under a new prefix fails a
// test instead of landing silently among the accents.
const PREFIXES: readonly (readonly [string, GroupId])[] = [
  ['--aion-bg-', 'surface'],
  ['--aion-fg-', 'surface'],
  ['--aion-border-', 'surface'],
  ['--aion-syntax-', 'syntax'],
  ['--aion-caret', 'syntax'],
  ['--aion-status-', 'status'],
  ['--aion-diff-', 'decoration'],
  ['--aion-overlay-', 'decoration'],
  ['--aion-ansi-', 'terminal'],
  ...ACCENT_NAMES.map((name): readonly [string, GroupId] => [`--aion-${name}-`, 'accent']),
];

export function groupOf(variable: string): GroupId | undefined {
  for (const [prefix, id] of PREFIXES) if (variable.startsWith(prefix)) return id;
  return undefined;
}

export function groups(): readonly Group[] {
  const darkValues = dark();
  const lightValues = light();
  const collected: Record<GroupId, SwatchData[]> = {
    surface: [], accent: [], syntax: [], status: [], decoration: [], terminal: [],
  };

  for (const [variable, darkValue] of Object.entries(darkValues)) {
    const id = groupOf(variable);
    if (id === undefined) throw new Error(`no group for ${variable}`);
    const lightValue = lightValues[variable];
    if (lightValue === undefined) throw new Error(`no light value for ${variable}`);
    collected[id].push({ variable, dark: darkValue, light: lightValue });
  }

  return GROUP_IDS.map((id) => ({ id, title: GROUP_TITLES[id], swatches: collected[id] }));
}
