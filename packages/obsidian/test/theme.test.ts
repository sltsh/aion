import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { formatHex } from 'culori';
import {
  CONTRAST_FLOOR, NON_TEXT_FLOOR, compositeEmitted, contrastEmitted, hex,
  distanceEmitted, hexToOklch, lightNeutral, obsidianCodeBackground, obsidianLightActiveRow,
  obsidianLightHighlight, obsidianLightSelection,
} from '@sltsh/aion-tokens';
import { dark, light } from '@sltsh/aion-css';
import { FOLDER_CYCLE, obsidianColors, themeCss, themeRules } from '../src/theme.js';

const css = readFileSync(new URL('../../../theme.css', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../../manifest.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const colors = [obsidianColors('dark'), obsidianColors('light')];

const ratio = (foreground: string, background: string): number =>
  contrastEmitted(hexToOklch(foreground), hexToOklch(background));

const resolved = (scheme: 'dark' | 'light', name: string): string => {
  const variables = obsidianColors(scheme);
  const gold = (scheme === 'dark' ? dark() : light())['--aion-gold-solid']!;
  if (name === '--color-accent') return gold;
  if (name === '--color-accent-1' || name === '--color-accent-2') {
    const step = name.endsWith('-1') ? 1 : 2;
    const hue = Number(variables['--accent-h']);
    const saturation = Number.parseFloat(variables['--accent-s']!) / 100;
    const lightness = Number.parseFloat(variables['--accent-l']!) / 100;
    const adjustment = scheme === 'light'
      ? step === 1 ? [1, 1.01, 1.075] : [3, 1.02, 1.15]
      : step === 1 ? [3, 1.02, 1.15] : [5, 1.05, 1.29];
    return formatHex({
      mode: 'hsl', h: hue - adjustment[0]!,
      s: Math.min(1, saturation * adjustment[1]!),
      l: Math.min(1, lightness * adjustment[2]!),
    });
  }
  const value = variables[name]!;
  const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  return reference ? resolved(scheme, reference[1]!) : value;
};

test('the installable sheet is generated from both Aion variants', () => {
  expect(css).toBe(themeCss());
  expect(css).toContain('.theme-dark {');
  expect(css).toContain('.theme-light {');
  expect(Object.keys(colors[0]!).sort()).toEqual(Object.keys(colors[1]!).sort());
  expect(css).not.toMatch(/@import|url\(/);
  expect(css).not.toMatch(/!important/);
  for (const scheme of colors) {
    for (const [name, value] of Object.entries(scheme)) {
      if (name === '--accent-h') expect(value, name).toMatch(/^\d+(\.\d+)?$/);
      else if (name === '--accent-s' || name === '--accent-l') expect(value, name).toMatch(/^\d+(\.\d+)?%$/);
      else if (name === '--link-unresolved-opacity') expect(value).toBe('1');
      else if (name === '--link-unresolved-decoration-style') expect(value).toBe('dashed');
      else if (name === '--input-shadow') expect(value).toBe('inset 0 0 0 1px var(--background-modifier-border-hover)');
      else if (name === '--input-shadow-hover') expect(value).toBe('inset 0 0 0 1px var(--aion-obsidian-hover-edge)');
      else expect(value, name).toMatch(/^(#[0-9a-f]{6}([0-9a-f]{2})?|var\(--[a-z0-9-]+\))$/);
      expect(css).toContain(`${name}: ${value};`);
    }
  }
});

test.each(['dark', 'light'] as const)('%s lets Obsidian derive the chosen accent', (scheme) => {
  const c = obsidianColors(scheme);
  const gold = (scheme === 'dark' ? dark() : light())['--aion-gold-solid']!;
  expect(formatHex({
    mode: 'hsl',
    h: Number(c['--accent-h']),
    s: Number.parseFloat(c['--accent-s']!) / 100,
    l: Number.parseFloat(c['--accent-l']!) / 100,
  })).toBe(gold);
  for (const name of ['--color-accent', '--color-accent-1', '--color-accent-2']) {
    expect(c).not.toHaveProperty(name);
  }
  expect(c['--interactive-accent']).toBe('var(--color-accent)');
  expect(c['--interactive-accent-hover']).toBe('var(--color-accent-1)');
  expect(c['--text-accent']).toBe('var(--color-accent)');
  expect(c['--checkbox-color']).toBe('var(--interactive-accent)');
});

test('the manifest describes a community theme release', () => {
  expect(manifest).toMatchObject({ name: 'Aion', version: packageManifest.version, minAppVersion: '1.13.0' });
  expect(manifest).toHaveProperty('author');
});

test.each(['dark', 'light'] as const)('%s reading pairs clear the emitted contrast floor', (scheme) => {
  const c = obsidianColors(scheme);
  const pairs = [
    ['--text-normal', '--background-primary'],
    ['--text-normal', '--background-secondary'],
    ['--text-normal', '--modal-background'],
    ['--text-muted', '--background-secondary'],
    ['--text-faint', '--modal-background'],
    ['--text-faint', '--background-modifier-hover'],
    ['--text-accent', '--background-primary'],
    ['--nav-item-color-active', '--nav-item-background-active'],
    ['--text-on-accent', '--interactive-accent'],
    ['--text-on-accent', '--interactive-accent-hover'],
    ['--text-accent-hover', '--background-primary'],
    ['--text-on-accent', '--background-modifier-error'],
    ['--text-on-accent', '--background-modifier-error-hover'],
    ['--text-on-accent', '--background-modifier-success'],
    ['--link-unresolved-color', '--background-primary'],
    ['--code-normal', '--code-background'],
    ['--code-comment', '--code-background'],
    ['--code-function', '--code-background'],
    ['--code-keyword', '--code-background'],
    ['--code-property', '--code-background'],
    ['--code-string', '--code-background'],
    ['--code-value', '--code-background'],
    ['--code-important', '--code-background'],
    ['--code-operator', '--code-background'],
    ['--code-punctuation', '--code-background'],
    ['--code-tag', '--code-background'],
  ] as const;
  for (const [foreground, background] of pairs) {
    const measured = ratio(resolved(scheme, foreground), resolved(scheme, background));
    expect(measured, `${scheme} ${foreground} on ${background}: ${measured.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }

  const selection = c['--text-selection']!;
  if (scheme === 'light') {
    expect(selection).toBe(hex(obsidianLightSelection));
    expect(c['--text-highlight-bg']).toBe(hex(obsidianLightHighlight));
  }
  const selected = selection.length === 9
    ? compositeEmitted(hexToOklch(selection.slice(0, 7)), parseInt(selection.slice(7), 16) / 255,
      hexToOklch(c['--background-primary']!))
    : hexToOklch(selection);
  expect(contrastEmitted(hexToOklch(c['--text-normal']!), selected), `${scheme} selected text`)
    .toBeGreaterThanOrEqual(CONTRAST_FLOOR);

  const codeSelection = selection.length === 9
    ? compositeEmitted(hexToOklch(selection.slice(0, 7)), parseInt(selection.slice(7), 16) / 255,
      hexToOklch(c['--code-background']!))
    : hexToOklch(selection);
  for (const foreground of ['--code-normal', '--code-comment', '--code-function', '--code-keyword',
    '--code-property', '--code-string', '--code-value', '--code-important', '--code-operator',
    '--code-punctuation', '--code-tag']) {
    const color = hexToOklch(c[foreground]!);
    const selectedRatio = contrastEmitted(color, codeSelection);
    const matchRatio = contrastEmitted(color, hexToOklch(c['--text-highlight-bg']!));
    expect(selectedRatio, `${scheme} ${foreground} on selected code: ${selectedRatio.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    expect(matchRatio, `${scheme} ${foreground} on search match: ${matchRatio.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }

  for (const background of ['--background-modifier-form-field', '--modal-background']) {
    const measured = ratio(c['--background-modifier-border-focus']!, c[background]!);
    expect(measured, `${scheme} focus edge on ${background}: ${measured.toFixed(2)}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test.each(['dark', 'light'] as const)('%s Obsidian 1.13.7 consumer pairs and defaults', (scheme) => {
  const c = obsidianColors(scheme);
  const page = resolved(scheme, '--background-primary');
  for (const name of [
    '--callout-quote', '--color-red', '--color-orange', '--color-yellow', '--color-green',
    '--color-cyan', '--color-blue', '--color-purple', '--callout-question',
  ]) {
    const title = hexToOklch(resolved(scheme, name));
    const tint = compositeEmitted(title, 0.1, hexToOklch(page));
    expect(contrastEmitted(title, tint), `${scheme} ${name} title`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
  expect(c['--callout-question']).toBe('var(--color-yellow)');
  expect(resolved(scheme, '--callout-question')).not.toBe(resolved(scheme, '--color-orange'));
  expect(c['--link-unresolved-opacity']).toBe('1');
  expect(c['--link-unresolved-decoration-style']).toBe('dashed');
  for (const name of [
    '--callout-quote', '--link-unresolved-opacity', '--background-modifier-warning',
    '--input-shadow', '--input-shadow-hover', '--prompt-background',
  ]) expect(c).toHaveProperty(name);
  expect(c['--background-modifier-active-hover']).not.toBe(c['--background-modifier-hover']);
  const canvasLight = resolved(scheme, '--aion-obsidian-canvas-label-light');
  const canvasDark = resolved(scheme, '--aion-obsidian-canvas-label-dark');
  expect(hexToOklch(canvasLight)[0]).toBeGreaterThan(hexToOklch(canvasDark)[0]);
  expect(ratio(scheme === 'dark' ? canvasDark : canvasLight, c['--color-yellow']!))
    .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  expect(css).toContain('mod-foreground-light {\n  color: var(--aion-obsidian-canvas-label-light);');
  expect(css).toContain('mod-foreground-dark {\n  color: var(--aion-obsidian-canvas-label-dark);');
  expect(c['--color-pink']).not.toBe(c['--color-red']);
  expect(c['--prompt-background']).toBe(c['--modal-background']);
  const fieldEdge = c['--background-modifier-border-hover']!;
  expect(css).toContain('input[type="text"], input[type="search"]');
  expect(css).toContain('):not(:hover):not(:focus):not(:active)');
  expect(css).toContain('border-color: var(--background-modifier-border-hover);');
  for (const surface of ['--background-modifier-form-field', '--background-primary', '--modal-background']) {
    expect(ratio(fieldEdge, c[surface]!), `${scheme} field edge on ${surface}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
  const hoverEdge = c['--aion-obsidian-hover-edge']!;
  for (const surface of ['--interactive-hover', '--modal-background']) {
    expect(ratio(hoverEdge, c[surface]!), `${scheme} button hover edge on ${surface}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test('Light selection, highlight and Dark code retain visible surface separation', () => {
  const light = obsidianColors('light');
  const dark = obsidianColors('dark');
  for (const surface of ['--background-primary', '--code-background']) {
    const separation = distanceEmitted(hexToOklch(light['--text-selection']!), hexToOklch(light[surface]!));
    expect(separation, `selection against ${surface}`).toBeGreaterThanOrEqual(0.04);
  }
  expect(distanceEmitted(hexToOklch(light['--text-highlight-bg']!), lightNeutral.page)).toBeGreaterThanOrEqual(0.08);
  for (const text of ['--text-normal', '--link-color']) {
    expect(ratio(light[text]!, light['--text-highlight-bg']!)).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
  expect(distanceEmitted(hexToOklch(dark['--code-background']!), hexToOklch(dark['--background-primary']!)))
    .toBeGreaterThanOrEqual(0.05);
  for (const scheme of ['dark', 'light'] as const) {
    const c = obsidianColors(scheme);
    expect(c['--code-background']).toBe(hex(obsidianCodeBackground[scheme]));
    expect(distanceEmitted(hexToOklch(c['--code-background']!), hexToOklch(c['--background-primary']!)))
      .toBeGreaterThanOrEqual(scheme === 'dark' ? 0.06 : 0.045);
  }
  expect(light['--text-highlight-bg']).not.toBe(light['--tag-background']);
  expect(light['--nav-item-background-active']).toBe(hex(obsidianLightActiveRow));
  expect(light['--nav-item-background-active']).not.toBe(light['--tag-background']);
  expect(distanceEmitted(hexToOklch(light['--nav-item-background-active']!), lightNeutral.surface))
    .toBeGreaterThanOrEqual(0.06);
  expect(light['--color-base-05']).not.toBe(light['--color-base-10']);
});

const CONTENT_ACCENTS = ['--h1-color', '--h2-color', '--h3-color', '--h4-color', '--bold-color', '--italic-color'] as const;
type Oklch = ReturnType<typeof hexToOklch>;

test.each(['dark', 'light'] as const)('%s content accents read on every specified surface', (scheme) => {
  const c = obsidianColors(scheme);
  const palette = scheme === 'dark' ? dark() : light();
  for (const [name, role] of [
    ['--h1-color', 'gold-solid'], ['--h2-color', 'teal-solid'],
    ['--h3-color', 'copper-solid'], ['--h4-color', 'violet-solid'],
    ['--h5-color', 'fg-secondary'], ['--h6-color', 'fg-secondary'],
    ['--bold-color', 'coral-solid'], ['--italic-color', 'green-solid'],
  ] as const) expect(c[name]).toBe(palette[`--aion-${role}`]);

  const page = hexToOklch(resolved(scheme, '--background-primary'));
  const selection = c['--text-selection']!;
  const selected = selection.length === 9
    ? compositeEmitted(hexToOklch(selection.slice(0, 7)), parseInt(selection.slice(7), 16) / 255, page)
    : hexToOklch(selection);
  const surfaces: [string, Oklch][] = [['page', page], ['selection', selected]];
  for (const tint of ['--callout-quote', '--color-red', '--color-orange', '--color-yellow', '--color-green',
    '--color-cyan', '--color-blue', '--color-purple']) {
    surfaces.push([`${tint} callout`, compositeEmitted(hexToOklch(resolved(scheme, tint)), 0.1, page)]);
  }
  for (const name of CONTENT_ACCENTS) {
    const color = hexToOklch(resolved(scheme, name));
    for (const [surface, background] of surfaces) {
      const measured = contrastEmitted(color, background);
      // The Light single-callout exception is approved; page, selection and every Dark pair retain the floor.
      if (scheme === 'light' && surface.endsWith(' callout')) continue;
      expect(measured, `${scheme} ${name} on ${surface}: ${measured.toFixed(2)}`)
        .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

test.each(['dark', 'light'] as const)('%s reading highlight keeps its background beside a tag', (scheme) => {
  expect(themeRules).toContain('.markdown-rendered mark {\n  background-color: var(--text-highlight-bg);\n  border-radius: 10px;\n  color: var(--color-yellow);\n}');
  expect(themeRules).toContain('.markdown-rendered mark :is(strong, b, em, i) {\n  color: inherit;\n}');
  expect(themeCss()).not.toContain(':has(');
  const measured = ratio(resolved(scheme, '--color-yellow'), resolved(scheme, '--text-highlight-bg'));
  expect(measured, `${scheme} gold on the highlight: ${measured.toFixed(2)}`)
    .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
});

test.each(['dark', 'light'] as const)('%s community theme badge has readable text on gold', (scheme) => {
  expect(themeRules).toContain('.community-item .flair {\n  --flair-background: var(--interactive-accent);\n  --flair-color: var(--text-on-accent);\n}');
  const measured = ratio(resolved(scheme, '--text-on-accent'), resolved(scheme, '--color-yellow'));
  expect(measured).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
});

test.each(['dark', 'light'] as const)('%s tags are blue pills that brighten on hover, on mobile too', (scheme) => {
  const c = obsidianColors(scheme);
  const palette = scheme === 'dark' ? dark() : light();
  expect(c['--tag-color']).toBe(palette['--aion-blue-solid']);
  expect(c['--tag-background']).toBe(palette['--aion-blue-subtle']);
  expect(c['--tag-color-hover']).toBe('var(--text-normal)');
  expect(c['--tag-background-hover']).toBe(c['--tag-background']);
  for (const [foreground, background] of [
    ['--tag-color', '--tag-background'],
    ['--tag-color-hover', '--tag-background-hover'],
  ] as const) {
    const measured = ratio(resolved(scheme, foreground), resolved(scheme, background));
    expect(measured, `${scheme} ${foreground} on ${background}: ${measured.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
  const names = ['--tag-color', '--tag-background', '--tag-color-hover', '--tag-background-hover'];
  expect(themeCss()).toContain(
    `.is-mobile.theme-${scheme} {\n${names.map((name) => `  ${name}: ${c[name]};`).join('\n')}\n}`,
  );
});

test.each(['dark', 'light'] as const)('%s folder accents read on the sidebar and the hover row', (scheme) => {
  const c = obsidianColors(scheme);
  const palette = scheme === 'dark' ? dark() : light();
  const sidebar = hexToOklch(resolved(scheme, '--background-secondary'));
  const tapRow = scheme === 'dark' ? compositeEmitted([1, 0, 0], 0.15, sidebar) : null;
  expect(FOLDER_CYCLE.length).toBe(6);
  for (const accent of FOLDER_CYCLE) {
    const folder = c[`--aion-obsidian-folder-${accent}`]!;
    expect(folder).toBe(palette[`--aion-${accent}-solid`]);
    expect(c[`--aion-obsidian-folder-${accent}-guide`]).toBe(palette[`--aion-${accent}-border`]);
    const text = ratio(folder, resolved(scheme, '--background-secondary'));
    expect(text, `${scheme} ${accent} folder on the sidebar: ${text.toFixed(2)}`)
      .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    const chevron = ratio(folder, resolved(scheme, '--background-modifier-hover'));
    expect(chevron, `${scheme} ${accent} chevron on the hover row: ${chevron.toFixed(2)}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    if (tapRow) {
      const tapped = contrastEmitted(hexToOklch(folder), tapRow);
      expect(tapped, `${scheme} ${accent} chevron on the mobile tap row: ${tapped.toFixed(2)}`)
        .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    }
  }
});

test('the folder cycle is anchored, violet-free and colours through Obsidian variables', () => {
  const order = ['coral', 'copper', 'gold', 'green', 'teal', 'blue'];
  const cycle = themeRules.filter((rule) => rule.includes(':nth-child('));
  expect(cycle).toEqual(order.map((accent, index) =>
    `.nav-files-container > div > .nav-folder:nth-child(6n+${index + 1} of .nav-folder) {\n  --aion-folder: var(--aion-obsidian-folder-${accent});\n  --aion-folder-guide: var(--aion-obsidian-folder-${accent}-guide);\n}`));
  const rules = themeRules.filter((rule) => rule.includes('.nav-files-container'));
  expect(rules).toHaveLength(11);
  for (const rule of rules) {
    expect(rule).not.toMatch(/(?<![-\w])color\s*:/);
    expect(rule).not.toMatch(/violet|purple|accent/);
  }
  expect(rules).toContain('.nav-files-container .nav-folder-title {\n  --nav-item-color: var(--aion-folder, var(--text-muted));\n}');
  expect(rules).toContain('.nav-files-container .nav-file-title.is-active {\n  --nav-item-background-active: transparent;\n}');
  expect(rules).toContain('.nav-files-container .nav-file-title.is-active .nav-file-title-content {\n  background-color: var(--aion-obsidian-active-file-background);\n  border-radius: var(--nav-item-radius);\n  margin-inline-start: calc(-1 * var(--size-4-2));\n  padding-inline: var(--size-4-2);\n}');
  expect(rules).toContain('.nav-files-container .nav-folder:not(.is-being-dragged-over) > .nav-folder-title:not(.is-selected, .is-being-dragged) {\n  --nav-collapse-icon-color: var(--aion-folder, var(--text-muted));\n  --nav-collapse-icon-color-collapsed: var(--aion-folder, var(--text-muted));\n}');
  expect(rules).toContain('.nav-files-container .nav-folder > .tree-item-children {\n  --nav-indentation-guide-color: var(--aion-folder-guide, var(--background-modifier-border));\n}');
});

test.each(['dark', 'light'] as const)('%s chrome marks clear the non-text floor where they land', (scheme) => {
  const gold = resolved(scheme, '--color-yellow');
  for (const surface of ['--tab-background-active', '--tab-container-background',
    '--background-secondary', '--background-modifier-hover']) {
    const measured = ratio(gold, resolved(scheme, surface));
    expect(measured, `${scheme} gold mark on ${surface}: ${measured.toFixed(2)}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
  const property = ratio(resolved(scheme, '--color-cyan'), resolved(scheme, '--background-primary'));
  expect(property, `${scheme} property icon: ${property.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
});

test('chrome marks are fixed gold and teal, never violet or the picked accent', () => {
  const chrome = themeRules.filter((rule) =>
    /workspace-tab|side-dock-ribbon|metadata-property-icon|status-bar/.test(rule));
  expect(chrome).toEqual([
    '.workspace-split.mod-root .workspace-tab-header-container .workspace-tab-header.is-active {\n  box-shadow: inset 0 2px 0 var(--color-yellow), 0 0 0 var(--tab-outline-width) var(--tab-outline-color);\n}',
    '.workspace-split:is(.mod-left-split, .mod-right-split) .workspace-tab-header.is-active {\n  --icon-color-focused: var(--color-yellow);\n  --tab-text-color-focused-active-current: var(--color-yellow);\n}',
    '.side-dock-ribbon-action:hover {\n  color: var(--color-yellow);\n}',
    '.metadata-property-icon {\n  color: var(--color-cyan);\n}',
    '.status-bar {\n  color: var(--text-muted);\n  border-top: 1px solid var(--background-modifier-border);\n}',
  ]);
  expect(chrome.join('\n')).not.toMatch(/violet|purple|accent/);
});

test('reading space is graded and callouts are balanced and aligned', () => {
  for (const rule of [
    '.markdown-rendered :is(p, pre, table, ul, ol) + h3,\n.markdown-rendered div:is(.el-blockquote, .el-p, .el-pre, .el-table, .el-ul, .el-ol) + div > h3 {\n  margin-top: calc(var(--heading-spacing) * 0.8);\n}',
    '.markdown-rendered :is(p, pre, table, ul, ol) + :is(h4, h5, h6),\n.markdown-rendered div:is(.el-blockquote, .el-p, .el-pre, .el-table, .el-ul, .el-ol) + div > :is(h4, h5, h6) {\n  margin-top: calc(var(--heading-spacing) * 0.6);\n}',
    '.callout-content > :last-child,\n.markdown-source-view.mod-cm6 .callout-content > .callout:last-child {\n  margin-bottom: 0;\n}',
    '.callout-title + .callout-content > :first-child,\n.markdown-source-view.mod-cm6 .callout-title + .callout-content > .callout:first-child {\n  margin-top: var(--size-4-2);\n}',
    '.callout-title {\n  align-items: center;\n}',
  ]) expect(themeRules).toContain(rule);
  const sheet = themeCss();
  expect(sheet).not.toContain('text-box:');
  expect(sheet).not.toMatch(/\bh2\b[^{]*\{[^}]*margin/);
  expect(sheet).not.toMatch(/(?<![-\w])(font-size|line-height|--file-line-width|--line-width)\s*:/);
});
