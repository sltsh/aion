import { dark, light } from '@sltsh/aion-css';
import type { Variables } from '@sltsh/aion-css';
import {
  hex, lightNeutral, neutral, obsidianCodeBackground, obsidianHoverEdge, obsidianLightActiveRow,
  obsidianLightHighlight, obsidianLightSelection, obsidianPink,
} from '@sltsh/aion-tokens';

type Scheme = 'dark' | 'light';

export const FOLDER_CYCLE = ['coral', 'copper', 'gold', 'green', 'teal', 'blue'] as const;

const value = (colors: Variables, name: string): string => {
  const color = colors[`--aion-${name}`];
  if (!color) throw new Error(`Missing Aion color: ${name}`);
  return color;
};

const hslChannels = (color: string): [string, string, string] => {
  const channels = [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = channels as [number, number, number];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return [hue.toFixed(4), `${(saturation * 100).toFixed(4)}%`, `${(lightness * 100).toFixed(4)}%`];
};

const tagColors = (colors: Variables): Record<string, string> => ({
  '--tag-color': value(colors, 'blue-solid'),
  '--tag-background': value(colors, 'blue-subtle'),
  '--tag-color-hover': 'var(--text-normal)',
  '--tag-background-hover': value(colors, 'blue-subtle'),
});

export const obsidianColors = (scheme: Scheme): Record<string, string> => {
  const colors = scheme === 'dark' ? dark() : light();
  const c = (name: string): string => value(colors, name);
  const sidebar = scheme === 'dark' ? hex(neutral.sidebar) : hex(lightNeutral.surface);
  const [accentHue, accentSaturation, accentLightness] = hslChannels(c('gold-solid'));

  return {
    '--color-base-00': c('bg-page'),
    '--color-base-05': scheme === 'dark' ? c('bg-surface') : c('bg-raised'),
    '--color-base-10': sidebar,
    '--color-base-20': c('bg-raised'),
    '--color-base-25': c('bg-input'),
    '--color-base-30': c('bg-hover'),
    '--color-base-35': c('border-hairline'),
    '--color-base-40': c('border-divider'),
    '--color-base-50': c('border-ui'),
    '--color-base-60': c('fg-dim'),
    '--color-base-70': c('fg-secondary'),
    '--color-base-100': c('fg-primary'),
    '--accent-h': accentHue,
    '--accent-s': accentSaturation,
    '--accent-l': accentLightness,
    '--color-red': c('coral-solid'),
    '--color-orange': c('copper-solid'),
    '--color-yellow': c('gold-solid'),
    '--color-green': c('green-solid'),
    '--color-cyan': c('teal-solid'),
    '--color-blue': c('blue-solid'),
    '--color-purple': c('violet-solid'),
    '--color-pink': hex(obsidianPink[scheme]),

    '--background-primary': c('bg-page'),
    '--background-primary-alt': c('bg-surface'),
    '--background-secondary': sidebar,
    '--background-secondary-alt': c('bg-raised'),
    '--background-modifier-hover': c('bg-hover'),
    '--background-modifier-active-hover': c('gold-subtle'),
    '--background-modifier-border': c('border-hairline'),
    '--background-modifier-border-hover': c('border-ui'),
    '--background-modifier-border-focus': c('border-focus'),
    '--background-modifier-form-field': c('bg-input'),
    '--background-modifier-error': c('status-error-solid'),
    '--background-modifier-error-hover': c('status-error-solid'),
    '--background-modifier-success': c('status-success-solid'),
    '--background-modifier-warning': c('copper-solid'),
    '--background-modifier-message': c('bg-raised'),

    '--interactive-normal': c('bg-input'),
    '--interactive-hover': c('bg-hover'),
    '--interactive-accent': 'var(--color-accent)',
    '--interactive-accent-hover': 'var(--color-accent-1)',
    '--aion-obsidian-hover-edge': hex(obsidianHoverEdge[scheme]),
    '--input-shadow': 'inset 0 0 0 1px var(--background-modifier-border-hover)',
    '--input-shadow-hover': 'inset 0 0 0 1px var(--aion-obsidian-hover-edge)',
    '--text-normal': c('fg-primary'),
    '--text-muted': c('fg-secondary'),
    '--text-faint': c('fg-secondary'),
    '--text-on-accent': c('fg-on-accent'),
    '--text-on-accent-inverted': c('fg-primary'),
    '--aion-obsidian-canvas-label-light': scheme === 'dark' ? c('fg-primary') : c('fg-on-accent'),
    '--aion-obsidian-canvas-label-dark': scheme === 'dark' ? c('fg-on-accent') : c('fg-primary'),
    '--text-accent': 'var(--color-accent)',
    '--text-accent-hover': 'var(--color-accent-1)',
    '--text-success': c('status-success-text'),
    '--text-warning': c('status-warning-text'),
    '--text-error': c('status-error-text'),
    '--text-selection': scheme === 'dark' ? c('overlay-selection') : hex(obsidianLightSelection),
    '--text-highlight-bg': scheme === 'dark' ? c('overlay-find-match') : hex(obsidianLightHighlight),
    '--caret-color': c('caret'),
    '--link-color': c('fg-link'),
    '--link-color-hover': c('teal-solid'),
    '--link-external-color': c('fg-link'),
    '--link-external-color-hover': c('teal-solid'),
    '--link-unresolved-color': 'var(--text-accent)',
    '--link-unresolved-opacity': '1',
    '--link-unresolved-decoration-style': 'dashed',
    '--callout-quote': c('fg-secondary'),
    '--callout-question': 'var(--color-yellow)',

    '--h1-color': c('gold-solid'),
    '--h2-color': c('teal-solid'),
    '--h3-color': c('copper-solid'),
    '--h4-color': c('violet-solid'),
    '--h5-color': c('fg-secondary'),
    '--h6-color': c('fg-secondary'),
    '--bold-color': c('coral-solid'),
    '--italic-color': c('green-solid'),
    '--blockquote-border-color': c('teal-border'),
    '--hr-color': c('border-divider'),
    '--code-background': hex(obsidianCodeBackground[scheme]),
    '--code-normal': c('fg-primary'),
    '--code-comment': c('syntax-comment'),
    '--code-function': c('syntax-function'),
    '--code-keyword': c('syntax-keyword'),
    '--code-property': c('syntax-variable'),
    '--code-string': c('syntax-string'),
    '--code-value': c('syntax-number'),
    '--code-important': c('syntax-type'),
    '--code-operator': c('syntax-operator'),
    '--code-punctuation': c('syntax-punctuation'),
    '--code-tag': c('syntax-type'),
    ...tagColors(colors),
    '--checkbox-color': 'var(--interactive-accent)',
    '--checkbox-color-hover': 'var(--interactive-accent-hover)',
    '--checkbox-border-color': c('border-ui'),

    '--nav-item-background-active': scheme === 'dark' ? c('gold-subtle') : hex(obsidianLightActiveRow),
    '--aion-obsidian-active-file-background': scheme === 'dark' ? c('gold-subtle') : hex(obsidianLightActiveRow),
    '--nav-item-color-active': 'var(--text-accent)',
    '--nav-item-color-hover': c('fg-primary'),
    '--tab-container-background': sidebar,
    '--tab-background-active': c('bg-page'),
    '--tab-text-color': c('fg-secondary'),
    '--tab-text-color-focused-active-current': c('fg-primary'),
    '--tab-divider-color': c('border-hairline'),
    '--tab-outline-color': c('border-hairline'),
    '--titlebar-background': sidebar,
    '--titlebar-background-focused': sidebar,
    '--modal-background': c('bg-raised'),
    '--prompt-background': c('bg-raised'),
    '--modal-border-color': c('border-divider'),
    '--prompt-border-color': c('border-divider'),
    '--icon-color': c('fg-secondary'),
    '--icon-color-hover': c('fg-primary'),
    ...Object.fromEntries(FOLDER_CYCLE.flatMap((accent) => [
      [`--aion-obsidian-folder-${accent}`, c(`${accent}-solid`)],
      [`--aion-obsidian-folder-${accent}-guide`, c(`${accent}-border`)],
    ])),
  };
};

const declarations = (entries: Record<string, string>): string =>
  Object.entries(entries).map(([name, color]) => `  ${name}: ${color};`).join('\n');

const block = (selector: string, scheme: Scheme): string =>
  `${selector} {\n  color-scheme: ${scheme};\n${declarations(obsidianColors(scheme))}\n}`;

// Obsidian's .is-mobile.theme-dark sets --tag-background and outranks .theme-dark.
const mobileTags = (scheme: Scheme): string =>
  `.is-mobile.theme-${scheme} {\n${declarations(tagColors(scheme === 'dark' ? dark() : light()))}\n}`;

export const themeRules: string[] = [
  '/* Obsidian uses its decorative border for text fields; the functional edge needs the UI border. */',
  '.theme-dark :is(textarea, .multi-select-container, input.metadata-input-text, input[type="date"], input[type="datetime-local"], input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="number"]):not(:hover):not(:focus):not(:active),\n.theme-light :is(textarea, .multi-select-container, input.metadata-input-text, input[type="date"], input[type="datetime-local"], input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="number"]):not(:hover):not(:focus):not(:active) {\n  border-color: var(--background-modifier-border-hover);\n}',
  '.canvas-node-group.is-themed .canvas-group-label:not([contenteditable="true"]).mod-foreground-light {\n  color: var(--aion-obsidian-canvas-label-light);\n}',
  '.canvas-node-group.is-themed .canvas-group-label:not([contenteditable="true"]).mod-foreground-dark {\n  color: var(--aion-obsidian-canvas-label-dark);\n}',
  '.markdown-rendered mark {\n  background-color: var(--text-highlight-bg);\n  border-radius: 10px;\n  color: var(--color-yellow);\n}',
  '.markdown-rendered mark :is(strong, b, em, i) {\n  color: inherit;\n}',
  '.community-item .flair {\n  --flair-background: var(--interactive-accent);\n  --flair-color: var(--text-on-accent);\n}',
  ...FOLDER_CYCLE.map((accent, index) =>
    `.nav-files-container > div > .nav-folder:nth-child(${FOLDER_CYCLE.length}n+${index + 1} of .nav-folder) {\n  --aion-folder: var(--aion-obsidian-folder-${accent});\n  --aion-folder-guide: var(--aion-obsidian-folder-${accent}-guide);\n}`),
  '.nav-files-container .nav-folder-title {\n  --nav-item-color: var(--aion-folder, var(--text-muted));\n}',
  '.nav-files-container .nav-file-title.is-active {\n  --nav-item-background-active: transparent;\n}',
  '.nav-files-container .nav-file-title.is-active .nav-file-title-content {\n  background-color: var(--aion-obsidian-active-file-background);\n  border-radius: var(--nav-item-radius);\n  margin-inline-start: calc(-1 * var(--size-4-2));\n  padding-inline: var(--size-4-2);\n}',
  '/* Selected, dragged and drag-target rows keep Obsidian\'s own chevron over the accent fill. */',
  '.nav-files-container .nav-folder:not(.is-being-dragged-over) > .nav-folder-title:not(.is-selected, .is-being-dragged) {\n  --nav-collapse-icon-color: var(--aion-folder, var(--text-muted));\n  --nav-collapse-icon-color-collapsed: var(--aion-folder, var(--text-muted));\n}',
  '.nav-files-container .nav-folder > .tree-item-children {\n  --nav-indentation-guide-color: var(--aion-folder-guide, var(--background-modifier-border));\n}',
  '.workspace-split.mod-root .workspace-tab-header-container .workspace-tab-header.is-active {\n  box-shadow: inset 0 2px 0 var(--color-yellow), 0 0 0 var(--tab-outline-width) var(--tab-outline-color);\n}',
  '.workspace-split:is(.mod-left-split, .mod-right-split) .workspace-tab-header.is-active {\n  --icon-color-focused: var(--color-yellow);\n  --tab-text-color-focused-active-current: var(--color-yellow);\n}',
  '.side-dock-ribbon-action:hover {\n  color: var(--color-yellow);\n}',
  '.metadata-property-icon {\n  color: var(--color-cyan);\n}',
  '.status-bar {\n  color: var(--text-muted);\n  border-top: 1px solid var(--background-modifier-border);\n}',
  '.markdown-rendered :is(p, pre, table, ul, ol) + h3,\n.markdown-rendered div:is(.el-blockquote, .el-p, .el-pre, .el-table, .el-ul, .el-ol) + div > h3 {\n  margin-top: calc(var(--heading-spacing) * 0.8);\n}',
  '.markdown-rendered :is(p, pre, table, ul, ol) + :is(h4, h5, h6),\n.markdown-rendered div:is(.el-blockquote, .el-p, .el-pre, .el-table, .el-ul, .el-ol) + div > :is(h4, h5, h6) {\n  margin-top: calc(var(--heading-spacing) * 0.6);\n}',
  '/* Live Preview\'s .mod-cm6 .callout-content .callout margin outranks both generic rules for a nested callout. */',
  '.callout-content > :last-child,\n.markdown-source-view.mod-cm6 .callout-content > .callout:last-child {\n  margin-bottom: 0;\n}',
  '.callout-title + .callout-content > :first-child,\n.markdown-source-view.mod-cm6 .callout-title + .callout-content > .callout:first-child {\n  margin-top: var(--size-4-2);\n}',
  '.callout-title {\n  align-items: center;\n}',
];

export const themeCss = (): string => [
  '/* Aion for Obsidian. Generated from @sltsh/aion-tokens; do not edit emitted colors. */',
  block('.theme-dark', 'dark'),
  block('.theme-light', 'light'),
  mobileTags('dark'),
  mobileTags('light'),
  ...themeRules,
].join('\n\n') + '\n';
