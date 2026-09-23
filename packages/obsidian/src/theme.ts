import { dark, light } from '@sltsh/aion-css';
import type { Variables } from '@sltsh/aion-css';
import {
  hex, lightNeutral, neutral, obsidianLightActiveRow, obsidianLightHighlight,
  obsidianLightSelection, obsidianPink,
} from '@sltsh/aion-tokens';

type Scheme = 'dark' | 'light';

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
    '--input-shadow': 'inset 0 0 0 1px var(--background-modifier-border-hover)',
    '--input-shadow-hover': 'inset 0 0 0 1px var(--background-modifier-border-hover)',
    '--text-normal': c('fg-primary'),
    '--text-muted': c('fg-secondary'),
    '--text-faint': c('fg-secondary'),
    '--text-on-accent': c('fg-on-accent'),
    '--text-on-accent-inverted': c('fg-primary'),
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

    '--h1-color': c('gold-solid'),
    '--h2-color': c('teal-solid'),
    '--h3-color': c('fg-primary'),
    '--h4-color': c('fg-primary'),
    '--h5-color': c('fg-secondary'),
    '--h6-color': c('fg-secondary'),
    '--bold-color': c('fg-primary'),
    '--italic-color': c('fg-primary'),
    '--blockquote-border-color': c('teal-border'),
    '--hr-color': c('border-divider'),
    '--code-background': c('bg-raised'),
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
    '--tag-color': c('gold-solid'),
    '--tag-background': c('gold-subtle'),
    '--checkbox-color': 'var(--interactive-accent)',
    '--checkbox-color-hover': 'var(--interactive-accent-hover)',
    '--checkbox-border-color': c('border-ui'),

    '--nav-item-background-active': scheme === 'dark' ? c('gold-subtle') : hex(obsidianLightActiveRow),
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
  };
};

const block = (selector: string, scheme: Scheme): string => {
  const entries = Object.entries(obsidianColors(scheme));
  return `${selector} {\n  color-scheme: ${scheme};\n${entries.map(([name, color]) => `  ${name}: ${color};`).join('\n')}\n}`;
};

export const themeCss = (): string => [
  '/* Aion for Obsidian. Generated from @sltsh/aion-tokens; do not edit emitted colors. */',
  block('.theme-dark', 'dark'),
  block('.theme-light', 'light'),
].join('\n\n') + '\n';
