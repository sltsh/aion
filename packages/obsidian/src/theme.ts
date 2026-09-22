import { dark, light } from '@sltsh/aion-css';
import type { Variables } from '@sltsh/aion-css';
import { hex, hexAlpha, lightFindMatch, lightNeutral, lightOverlay, neutral } from '@sltsh/aion-tokens';

type Scheme = 'dark' | 'light';

const value = (colors: Variables, name: string): string => {
  const color = colors[`--aion-${name}`];
  if (!color) throw new Error(`Missing Aion color: ${name}`);
  return color;
};

export const obsidianColors = (scheme: Scheme): Record<string, string> => {
  const colors = scheme === 'dark' ? dark() : light();
  const c = (name: string): string => value(colors, name);
  const sidebar = scheme === 'dark' ? hex(neutral.sidebar) : hex(lightNeutral.surface);

  return {
    '--color-base-00': c('bg-page'),
    '--color-base-05': c('bg-surface'),
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
    '--color-accent': c('gold-solid'),
    '--color-accent-1': c('gold-solid'),
    '--color-accent-2': c('gold-solid'),
    '--color-red': c('coral-solid'),
    '--color-orange': c('copper-solid'),
    '--color-yellow': c('gold-solid'),
    '--color-green': c('green-solid'),
    '--color-cyan': c('teal-solid'),
    '--color-blue': c('blue-solid'),
    '--color-purple': c('violet-solid'),
    '--color-pink': c('coral-solid'),

    '--background-primary': c('bg-page'),
    '--background-primary-alt': c('bg-surface'),
    '--background-secondary': sidebar,
    '--background-secondary-alt': c('bg-raised'),
    '--background-modifier-hover': c('bg-hover'),
    '--background-modifier-active-hover': c('bg-hover'),
    '--background-modifier-border': c('border-hairline'),
    '--background-modifier-border-hover': c('border-ui'),
    '--background-modifier-border-focus': c('border-focus'),
    '--background-modifier-form-field': c('bg-input'),
    '--background-modifier-error': c('status-error-subtle'),
    '--background-modifier-error-hover': c('status-error-subtle'),
    '--background-modifier-success': c('status-success-subtle'),
    '--background-modifier-message': c('bg-raised'),

    '--interactive-normal': c('bg-input'),
    '--interactive-hover': c('bg-hover'),
    '--interactive-accent': c('gold-solid'),
    '--interactive-accent-hover': c('gold-solid'),
    '--text-normal': c('fg-primary'),
    '--text-muted': c('fg-secondary'),
    '--text-faint': c('fg-dim'),
    '--text-on-accent': c('fg-on-accent'),
    '--text-on-accent-inverted': c('fg-on-accent'),
    '--text-accent': c('gold-solid'),
    '--text-accent-hover': c('gold-solid'),
    '--text-success': c('status-success-text'),
    '--text-warning': c('status-warning-text'),
    '--text-error': c('status-error-text'),
    '--text-selection': scheme === 'dark'
      ? c('overlay-selection')
      : hexAlpha(lightOverlay.selection.color, lightOverlay.selection.alpha),
    '--text-highlight-bg': scheme === 'dark' ? c('overlay-find-match') : hex(lightFindMatch.current),
    '--caret-color': c('caret'),
    '--link-color': c('fg-link'),
    '--link-color-hover': c('teal-solid'),
    '--link-external-color': c('fg-link'),
    '--link-external-color-hover': c('teal-solid'),

    '--h1-color': c('gold-solid'),
    '--h2-color': c('fg-primary'),
    '--h3-color': c('teal-solid'),
    '--h4-color': c('fg-primary'),
    '--h5-color': c('fg-secondary'),
    '--h6-color': c('fg-secondary'),
    '--bold-color': c('fg-primary'),
    '--italic-color': c('fg-primary'),
    '--blockquote-border-color': c('teal-border'),
    '--hr-color': c('border-divider'),
    '--code-background': c('bg-surface'),
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
    '--checkbox-color': c('gold-solid'),
    '--checkbox-color-hover': c('gold-solid'),
    '--checkbox-border-color': c('border-ui'),

    '--nav-item-background-active': c('gold-subtle'),
    '--nav-item-color-active': c('gold-solid'),
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
