import { editorSurface } from './editor.js';
import { terminalSurface } from './terminal.js';
import { landingSurface } from './landing.js';
import { dashboardSurface } from './dashboard.js';
import { docsSurface } from './docs.js';

export interface Surface {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly html: () => string;
}

export const SURFACES: readonly Surface[] = [
  {
    id: 'editor',
    title: 'VS Code',
    note: 'The editor is the darkest surface and the sidebar is raised above it. Of the four themes DESIGN.md compares, two put the sidebar below the editor and two use one colour for both.',
    html: editorSurface,
  },
  {
    id: 'terminal',
    title: 'Windows Terminal',
    note: 'The bright eight are byte-identical to the syntax accents. The background is the editor value, not the panel value.',
    html: terminalSurface,
  },
  {
    id: 'landing',
    title: 'Landing page',
    note: 'The same accents carry a marketing page. Violet is absent: it is a syntax hue only.',
    html: landingSurface,
  },
  {
    id: 'dashboard',
    title: 'Admin dashboard',
    note: 'Status colours separate by lightness as well as hue. The alerts carry sample data, labelled as such; the counts beside them come from the build gate.',
    html: dashboardSurface,
  },
  {
    id: 'docs',
    title: 'Documentation',
    note: 'Long-form prose on the raised surface, with code blocks on the editor surface underneath it.',
    html: docsSurface,
  },
];
