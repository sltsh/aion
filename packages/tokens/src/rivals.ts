import { CONTRAST_FLOOR } from './palette.js';

export interface Rival {
  readonly name: string;
  readonly variant: string;
  readonly source: string;
  readonly revision: string;
  readonly read: string;
  readonly background: string;
  readonly sideBar: string;
  readonly syntax: Readonly<Record<string, string>>;
}

// Read from each theme's own definition at the revision named here, on the date named
// here. A published theme changes: One Dark Pro's comment moved from #5c6370 to #7f848e
// and Catppuccin's from overlay0 to overlay2 between this table and the one before it,
// which is why the revision is part of the record and not a footnote.
export const RIVALS: readonly Rival[] = [
  {
    name: 'One Dark Pro',
    variant: 'One Dark Pro',
    source: 'https://github.com/Binaryify/OneDark-Pro/blob/main/themes/OneDark-Pro.json',
    revision: '54c3280b29f2c2ed9751e5ca4e071380b7b42205',
    read: '2026-09-05',
    background: '#282c34',
    sideBar: '#21252b',
    syntax: { comment: '#7f848e', keyword: '#c678dd', function: '#61afef', string: '#98c379',
      number: '#d19a66', type: '#e5c07b', variable: '#e06c75', punctuation: '#abb2bf' },
  },
  {
    name: 'Ayu Mirage',
    variant: 'Ayu Mirage',
    source: 'https://github.com/ayu-theme/vscode-ayu/blob/master/ayu-mirage.json',
    revision: '444ef92911cb75c3933c8003e3a7c79b6b6c914f',
    read: '2026-09-05',
    background: '#242936',
    sideBar: '#1f2430',
    syntax: { comment: '#6e7c8f', keyword: '#ffa659', function: '#ffcd66', string: '#d5ff80',
      number: '#dfbfff', type: '#5ccfe6', variable: '#cccac2', punctuation: '#cccac2' },
  },
  {
    name: 'Nord',
    variant: 'Nord',
    source: 'https://github.com/nordtheme/visual-studio-code/blob/develop/themes/nord-color-theme.json',
    revision: '8ead09822c02d0d49d0f764104505e5a34d3689f',
    read: '2026-09-05',
    background: '#2e3440',
    sideBar: '#2e3440',
    syntax: { comment: '#616e88', keyword: '#81a1c1', function: '#88c0d0', string: '#a3be8c',
      number: '#b48ead', type: '#8fbcbb', variable: '#d8dee9', punctuation: '#eceff4' },
  },
  {
    name: 'Catppuccin Mocha',
    variant: 'Catppuccin Mocha',
    source: 'https://github.com/catppuccin/vscode/blob/main/packages/catppuccin-vsc/src/theme/tokens/index.ts',
    revision: 'befc9e6fc41980f4241408f7049755d47c06ff45',
    read: '2026-09-05',
    background: '#1e1e2e',
    sideBar: '#1e1e2e',
    syntax: { comment: '#9399b2', keyword: '#cba6f7', function: '#89b4fa', string: '#a6e3a1',
      number: '#fab387', type: '#f9e2af', variable: '#cdd6f4', punctuation: '#9399b2' },
  },
];

export const SYNTAX_ROLES_COMPARED = 8;

const channel = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const relativeLuminance = (value: string): number => {
  const n = parseInt(value.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => channel(v / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrastHex(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export interface RivalResult {
  readonly name: string;
  readonly lowest: number;
  readonly below: readonly string[];
}

export const measure = (rival: Rival): RivalResult => {
  const ratios = Object.entries(rival.syntax)
    .map(([role, colour]) => [role, contrastHex(colour, rival.background)] as const);
  return {
    name: rival.name,
    lowest: Math.min(...ratios.map(([, ratio]) => ratio)),
    below: ratios.filter(([, ratio]) => ratio < CONTRAST_FLOOR).map(([role]) => role),
  };
};

export type SurfaceOrder = 'sidebar above editor' | 'sidebar below editor' | 'one surface';

// Aion raises the sidebar above the editor. Saying that every other theme does the
// reverse was wrong: two of these four use one colour for both.
export const surfaceOrder = (rival: Rival): SurfaceOrder => {
  const editor = relativeLuminance(rival.background);
  const sideBar = relativeLuminance(rival.sideBar);
  if (sideBar > editor) return 'sidebar above editor';
  if (sideBar < editor) return 'sidebar below editor';
  return 'one surface';
};
