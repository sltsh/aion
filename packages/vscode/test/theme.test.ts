import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import {
  ACCENTS, ANSI_ORDER, CONTRAST_FLOOR, NON_TEXT_FLOOR, accentScale, ansi, compositeEmitted,
  contrastEmitted, diff, diffWash, findMatch, hex, hexAlpha, hexToOklch, neutral, overlay,
  readingForegrounds, readingStates,
} from '@sltio/aion-tokens';
import type { Oklch } from '@sltio/aion-tokens';
import { theme } from '../src/theme.js';
import { colors } from '../src/colors.js';
import { semanticTokenColors, tokenColors } from '../src/tokens.js';

const built = theme();
const opaque = (value: string): boolean => value.length === 7;

// The committed themes/aion.json is the snapshot. A palette change shows up as a JSON diff.
test('the committed theme file matches the generated theme', () => {
  const onDisk = JSON.parse(readFileSync(new URL('../themes/aion.json', import.meta.url), 'utf8'));
  expect(onDisk).toEqual(JSON.parse(JSON.stringify(built)));
});

test('the theme covers the surface VS Code asks for', () => {
  expect(Object.keys(built.colors).length).toBeGreaterThanOrEqual(300);
  expect(built.tokenColors.length).toBeGreaterThanOrEqual(40);
  expect(built.semanticHighlighting).toBe(true);
  expect(built.type).toBe('dark');
});

test('every colour value is a hex string', () => {
  for (const [key, value] of Object.entries(built.colors)) {
    expect(value, key).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
  }
  for (const [key, value] of Object.entries(semanticTokenColors)) {
    expect(value, key).toMatch(/^#[0-9a-f]{6}$/);
  }
});

test('the sidebar is raised above the editor', () => {
  const lightness = (value: string): number => hexToOklch(value)[0];
  expect(lightness(colors['editor.background']!)).toBeLessThan(lightness(colors['sideBar.background']!));
  expect(lightness(colors['editor.background']!)).toBeLessThan(lightness(colors['panel.background']!));
  expect(lightness(colors['panel.background']!)).toBeLessThan(lightness(colors['sideBar.background']!));
  expect(colors['tab.activeBackground']).toBe(colors['editor.background']);
  expect(colors['terminal.background']).toBe(colors['panel.background']);
});

test('the integrated terminal ships the sixteen ANSI slots unchanged', () => {
  const key = (slot: string): string =>
    `terminal.ansi${slot.charAt(0).toUpperCase()}${slot.slice(1)}`.replace('ansiBright', 'ansiBright');
  for (const slot of ANSI_ORDER) {
    expect(colors[key(slot)], slot).toBe(hex(ansi[slot]));
  }
});

test('every token rule clears the contrast floor on the editor', () => {
  for (const rule of tokenColors) {
    const value = rule.settings.foreground;
    if (value === undefined) continue;
    const ratio = contrastEmitted(hexToOklch(value), neutral.editor);
    expect(ratio, `${rule.name} ${value} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('every semantic token clears the contrast floor on the editor', () => {
  for (const [name, value] of Object.entries(semanticTokenColors)) {
    const ratio = contrastEmitted(hexToOklch(value), neutral.editor);
    expect(ratio, `${name} ${value} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('opaque foreground keys clear the floor on the surface they sit on', () => {
  const pairs: [string, string][] = [
    ['editor.foreground', 'editor.background'],
    ['editorLineNumber.activeForeground', 'editor.background'],
    ['sideBar.foreground', 'sideBar.background'],
    ['sideBarSectionHeader.foreground', 'sideBarSectionHeader.background'],
    ['statusBar.foreground', 'statusBar.background'],
    ['titleBar.activeForeground', 'titleBar.activeBackground'],
    ['tab.activeForeground', 'tab.activeBackground'],
    ['tab.inactiveForeground', 'tab.inactiveBackground'],
    ['terminal.foreground', 'terminal.background'],
    ['panelTitle.activeForeground', 'panel.background'],
    ['list.activeSelectionForeground', 'list.activeSelectionBackground'],
    ['list.hoverForeground', 'list.hoverBackground'],
    ['quickInput.foreground', 'quickInput.background'],
    ['quickInputList.focusForeground', 'quickInputList.focusBackground'],
    ['menu.foreground', 'menu.background'],
    ['menu.selectionForeground', 'menu.selectionBackground'],
    ['input.foreground', 'input.background'],
    ['dropdown.foreground', 'dropdown.background'],
    ['button.foreground', 'button.background'],
    ['button.secondaryForeground', 'button.secondaryBackground'],
    ['badge.foreground', 'badge.background'],
    ['activityBarBadge.foreground', 'activityBarBadge.background'],
    ['notifications.foreground', 'notifications.background'],
    ['editorSuggestWidget.foreground', 'editorSuggestWidget.background'],
    ['editorSuggestWidget.selectedForeground', 'editorSuggestWidget.selectedBackground'],
    ['editorHoverWidget.foreground', 'editorHoverWidget.background'],
    ['peekViewResult.fileForeground', 'peekViewResult.background'],
    ['statusBarItem.remoteForeground', 'statusBarItem.remoteBackground'],
    ['statusBarItem.errorForeground', 'statusBarItem.errorBackground'],
    ['statusBarItem.warningForeground', 'statusBarItem.warningBackground'],
    ['statusBar.debuggingForeground', 'statusBar.debuggingBackground'],
    ['extensionButton.prominentForeground', 'extensionButton.prominentBackground'],
    ['debugView.exceptionLabelForeground', 'debugView.exceptionLabelBackground'],
  ];
  for (const [fg, bg] of pairs) {
    const front = colors[fg];
    const back = colors[bg];
    expect(front, fg).toBeDefined();
    expect(back, bg).toBeDefined();
    if (!opaque(front!) || !opaque(back!)) continue;
    const ratio = contrastEmitted(hexToOklch(front!), hexToOklch(back!));
    expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

// Any key named X.foreground that has a matching X.background is a real text pairing.
// Pairing them automatically is what caught dimmed text sitting below the floor.
test('every automatically paired foreground clears the floor on its own background', () => {
  const pairs = Object.keys(colors)
    .filter((key) => key.endsWith('oreground'))
    .map((key) => [key, key.replace(/[fF]oreground$/, (m) => (m === 'Foreground' ? 'Background' : 'background'))] as const)
    .filter(([, bg]) => colors[bg] !== undefined);
  expect(pairs.length).toBeGreaterThan(15);
  for (const [fg, bg] of pairs) {
    if (!opaque(colors[fg]!) || !opaque(colors[bg]!)) continue;
    const ratio = contrastEmitted(hexToOklch(colors[fg]!), hexToOklch(colors[bg]!));
    expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('dimmed chrome text clears the floor on the chrome it sits on', () => {
  const pairs: [string, string][] = [
    ['descriptionForeground', 'editorWidget.background'],
    ['disabledForeground', 'editorWidget.background'],
    ['sideBarTitle.foreground', 'sideBar.background'],
    ['activityBar.inactiveForeground', 'activityBar.background'],
    ['activityBarTop.inactiveForeground', 'activityBar.background'],
    ['breadcrumb.foreground', 'breadcrumb.background'],
    ['panelTitle.inactiveForeground', 'panel.background'],
    ['titleBar.inactiveForeground', 'titleBar.inactiveBackground'],
    ['tab.inactiveForeground', 'tab.inactiveBackground'],
    ['tab.unfocusedInactiveForeground', 'tab.unfocusedInactiveBackground'],
    
    ['editorCodeLens.foreground', 'editor.background'],
    ['list.deemphasizedForeground', 'sideBar.background'],
    ['peekViewTitleDescription.foreground', 'peekViewTitle.background'],
    ['editorSuggestWidgetStatus.foreground', 'editorSuggestWidget.background'],
    ['debugConsole.sourceForeground', 'panel.background'],
    ['search.resultsInfoForeground', 'sideBar.background'],
    ['gitDecoration.ignoredResourceForeground', 'sideBar.background'],
    ['statusBar.noFolderForeground', 'statusBar.noFolderBackground'],
    ['editorGhostText.foreground', 'editor.background'],
    ['diffEditor.unchangedRegionForeground', 'diffEditor.unchangedRegionBackground'],
  ];
  for (const [fg, bg] of pairs) {
    expect(colors[fg], fg).toBeDefined();
    expect(colors[bg], bg).toBeDefined();
    const ratio = contrastEmitted(hexToOklch(colors[fg]!), hexToOklch(colors[bg]!));
    expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});

test('focus and structural borders clear the non-text floor', () => {
  const pairs: [string, string][] = [
    ['focusBorder', 'editor.background'],
    ['activityBar.activeBorder', 'activityBar.background'],
    ['tab.activeBorderTop', 'editorGroupHeader.tabsBackground'],
    ['panelTitle.activeBorder', 'panel.background'],
    ['editorCursor.foreground', 'editor.background'],
    ['progressBar.background', 'editor.background'],
  ];
  for (const [border, surface] of pairs) {
    const ratio = contrastEmitted(hexToOklch(colors[border]!), hexToOklch(colors[surface]!));
    expect(ratio, `${border} on ${surface} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
});

test('no token rule uses italic', () => {
  for (const rule of tokenColors) {
    expect(rule.settings.fontStyle ?? '', rule.name).not.toContain('italic');
  }
});

test('bracket pairs cycle gold, teal and violet', () => {
  expect(colors['editorBracketHighlight.foreground1']).toBe(colors['editorBracketHighlight.foreground4']);
  expect(colors['editorBracketHighlight.foreground2']).toBe(colors['editorBracketHighlight.foreground5']);
  expect(colors['editorBracketHighlight.foreground3']).toBe(colors['editorBracketHighlight.foreground6']);
});

test('the six language overrides are present', () => {
  const names = tokenColors.map((r) => r.name).join(' ');
  for (const language of ['Markdown', 'JSON', 'YAML', 'HTML', 'CSS', 'JSX']) {
    expect(names, language).toContain(language);
  }
});

// Every key whose value carries an alpha byte, and the opaque key it is painted over.
// The old suite skipped these, which is how a comment at 2.12:1 on a find match shipped.
// A new alpha key with no entry here fails the classification test below.
const OVER: Record<string, { under: string; reads: 'code' | 'terminal' | 'uiText' | 'none' }> = {
  'editor.findRangeHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.focusedStackFrameHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.hoverHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.inactiveSelectionBackground': { under: 'editor.background', reads: 'code' },
  'editor.foldBackground': { under: 'editor.background', reads: 'code' },
  'editor.lineHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.rangeHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.selectionBackground': { under: 'editor.background', reads: 'code' },
  // A diff wash paints over the selection rather than under it, so the worst case is not
  // the editor background. `readingStates` measures the real stack; this entry names the
  // opaque key the wash is guaranteed against on its own.
  'diffEditor.insertedLineBackground': { under: 'editor.background', reads: 'code' },
  'diffEditor.removedLineBackground': { under: 'editor.background', reads: 'code' },
  'diffEditor.insertedTextBackground': { under: 'editor.background', reads: 'code' },
  'diffEditor.removedTextBackground': { under: 'editor.background', reads: 'code' },
  'editor.selectionHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.stackFrameHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.symbolHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.wordHighlightBackground': { under: 'editor.background', reads: 'code' },
  'editor.wordHighlightStrongBackground': { under: 'editor.background', reads: 'code' },
  'editorBracketMatch.background': { under: 'editor.background', reads: 'code' },
  'editorCommentsWidget.rangeBackground': { under: 'editor.background', reads: 'code' },
  'editorCommentsWidget.rangeActiveBackground': { under: 'editor.background', reads: 'code' },
  'diffEditor.unchangedCodeBackground': { under: 'editor.background', reads: 'code' },
  'merge.currentHeaderBackground': { under: 'editor.background', reads: 'code' },
  'merge.incomingHeaderBackground': { under: 'editor.background', reads: 'code' },
  'merge.commonHeaderBackground': { under: 'editor.background', reads: 'code' },
  'mergeEditor.change.background': { under: 'editor.background', reads: 'code' },
  'mergeEditor.change.word.background': { under: 'editor.background', reads: 'code' },
  'notebook.symbolHighlightBackground': { under: 'notebook.editorBackground', reads: 'code' },
  'notebook.cellHoverBackground': { under: 'notebook.cellEditorBackground', reads: 'code' },
  'notebook.focusedCellBackground': { under: 'notebook.cellEditorBackground', reads: 'code' },
  'peekViewEditor.matchHighlightBackground': { under: 'peekViewEditor.background', reads: 'code' },
  'peekViewResult.matchHighlightBackground': { under: 'peekViewResult.background', reads: 'code' },
  'searchEditor.findMatchBackground': { under: 'editor.background', reads: 'code' },
  'testing.coveredBackground': { under: 'editor.background', reads: 'code' },
  'testing.uncoveredBackground': { under: 'editor.background', reads: 'code' },
  'terminal.inactiveSelectionBackground': { under: 'terminal.background', reads: 'terminal' },
  'terminal.findMatchBackground': { under: 'terminal.background', reads: 'terminal' },
  'terminal.findMatchHighlightBackground': { under: 'terminal.background', reads: 'terminal' },
  'list.filterMatchBackground': { under: 'list.focusBackground', reads: 'uiText' },
  'settings.focusedRowBackground': { under: 'editor.background', reads: 'uiText' },
  'settings.rowHoverBackground': { under: 'editor.background', reads: 'uiText' },
  'keybindingTable.rowsBackground': { under: 'keybindingTable.headerBackground', reads: 'uiText' },
  'tree.tableOddRowsBackground': { under: 'sideBar.background', reads: 'uiText' },
  'selection.background': { under: 'input.background', reads: 'uiText' },
  // A find match is the one decoration allowed to replace what it covers, so the pair to
  // measure is its own foreground key, checked separately below.
  'editor.findMatchHighlightBackground': { under: 'editor.background', reads: 'none' },
  // Nothing is ever drawn on top of these: rulers, sliders, shadows and drop targets sit
  // beside the text or behind it, never under a glyph. A key that scales the glyph itself
  // is not in this table at all; see the unused-code test below.
  'button.separator': { under: 'button.background', reads: 'none' },
  'extensionButton.separator': { under: 'extensionButton.background', reads: 'none' },
  'diffEditorOverview.insertedForeground': { under: 'editor.background', reads: 'none' },
  'diffEditorOverview.removedForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.addedForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.deletedForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.findMatchForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.modifiedForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.rangeHighlightForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.selectionHighlightForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.wordHighlightForeground': { under: 'editor.background', reads: 'none' },
  'editorOverviewRuler.wordHighlightStrongForeground': { under: 'editor.background', reads: 'none' },
  // The minimap draws one or two pixels per character rather than a glyph a reader reads.
  'minimap.foregroundOpacity': { under: 'minimap.background', reads: 'none' },
  'minimap.findMatchHighlight': { under: 'minimap.background', reads: 'none' },
  'minimap.selectionHighlight': { under: 'minimap.background', reads: 'none' },
  'minimap.selectionOccurrenceHighlight': { under: 'minimap.background', reads: 'none' },
  'minimapSlider.background': { under: 'minimap.background', reads: 'none' },
  'minimapSlider.hoverBackground': { under: 'minimap.background', reads: 'none' },
  'minimapSlider.activeBackground': { under: 'minimap.background', reads: 'none' },
  'mergeEditor.conflict.handled.minimapOverViewRuler': { under: 'editor.background', reads: 'none' },
  'mergeEditor.conflict.unhandled.minimapOverViewRuler': { under: 'editor.background', reads: 'none' },
  'scrollbar.shadow': { under: 'editor.background', reads: 'none' },
  'scrollbarSlider.background': { under: 'editor.background', reads: 'none' },
  'scrollbarSlider.hoverBackground': { under: 'editor.background', reads: 'none' },
  'scrollbarSlider.activeBackground': { under: 'editor.background', reads: 'none' },
  'notebookScrollbarSlider.background': { under: 'notebook.editorBackground', reads: 'none' },
  'notebookScrollbarSlider.hoverBackground': { under: 'notebook.editorBackground', reads: 'none' },
  'notebookScrollbarSlider.activeBackground': { under: 'notebook.editorBackground', reads: 'none' },
  'widget.shadow': { under: 'editor.background', reads: 'none' },
  'listFilterWidget.shadow': { under: 'editorWidget.background', reads: 'none' },
  'list.dropBackground': { under: 'sideBar.background', reads: 'none' },
  'sideBar.dropBackground': { under: 'sideBar.background', reads: 'none' },
  'editorGroup.dropBackground': { under: 'editor.background', reads: 'none' },
  'panelSection.dropBackground': { under: 'panel.background', reads: 'none' },
  'terminal.dropBackground': { under: 'terminal.background', reads: 'none' },
};

// An alpha byte means one of two different things. In most keys it is the opacity of a
// wash the renderer blends into the surface, and the text on top reads against the blend.
// In these it is the opacity of the glyph itself, so the pair to measure is the faded
// foreground against the surface it stands on. They have their own tests.
const FOREGROUND_OPACITY = new Set(['editorUnnecessaryCode.opacity']);

const alphaKeys = (): string[] =>
  Object.entries(colors)
    .filter(([key]) => !FOREGROUND_OPACITY.has(key))
    .filter(([, value]) => value.length === 9 && !value.endsWith('00'))
    .map(([key]) => key);

test('every alpha key names the surface it is painted over', () => {
  const unclassified = alphaKeys().filter((key) => OVER[key] === undefined);
  expect(unclassified, `classify these in OVER: ${unclassified.join(', ')}`).toEqual([]);
  const stale = Object.keys(OVER).filter((key) => colors[key] === undefined);
  expect(stale, `OVER names keys the theme no longer emits: ${stale.join(', ')}`).toEqual([]);
});

const composited = (key: string): Oklch => {
  const value = colors[key]!;
  const under = hexToOklch(colors[OVER[key]!.under]!);
  return compositeEmitted(hexToOklch(value.slice(0, 7)), parseInt(value.slice(7), 16) / 255, under);
};

// The whole point of finding 1: a decoration that tints the background changes what the
// text on top of it reads at, and the gate has to measure the tinted value.
test('text keeps the floor on every decoration painted under it', () => {
  const groups: Record<string, Record<string, Oklch>> = {
    code: readingForegrounds(),
    terminal: Object.fromEntries(ANSI_ORDER.filter((s) => s !== 'black').map((s) => [s, ansi[s]])),
    uiText: { primary: neutral.textPrimary, secondary: neutral.textSecondary },
  };
  for (const key of alphaKeys()) {
    const { reads } = OVER[key]!;
    if (reads === 'none') continue;
    const background = composited(key);
    for (const [name, colour] of Object.entries(groups[reads]!)) {
      const ratio = contrastEmitted(colour, background);
      expect(ratio, `${name} on ${key} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

// `findWidget.ts` applies `editorFindMatchForeground` to `.findMatchInline`, the class on
// the OTHER matches, and `editorFindMatchHighlightForeground` to `.currentFindMatchInline`.
// Both names and both descriptions say the opposite. A theme that sets them ships each
// foreground on the wrong fill; Aion measured 1.42:1 and 1.39:1 that way. So the fills
// carry the job alone and every syntax colour is gated on them.
test('the find match keys set no foreground, and the fills carry the syntax under them', () => {
  expect(colors['editor.findMatchForeground'], 'findWidget.ts puts this on the other matches').toBeUndefined();
  expect(colors['editor.findMatchHighlightForeground'], 'findWidget.ts puts this on the current match').toBeUndefined();
  expect(colors['editor.findMatchBackground']).toBe(hex(findMatch.current));
  expect(opaque(colors['editor.findMatchBackground']!), 'the current match takes the full budget').toBe(true);
  // The other matches are registered with "The color must not be opaque so as not to hide
  // underlying decorations", so this one keeps an alpha byte.
  expect(opaque(colors['editor.findMatchHighlightBackground']!)).toBe(false);
  for (const [role, colour] of Object.entries(readingForegrounds())) {
    const current = contrastEmitted(colour, findMatch.current);
    expect(current, `${role} on the current match = ${current.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    const other = contrastEmitted(colour, composited('editor.findMatchHighlightBackground'));
    expect(other, `${role} on an other match = ${other.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  }
});


// `editor.selectionForeground` only applies to the high contrast themes, so a dark theme
// that sets it is claiming a legibility it does not get. The selection has to work
// without it, which is what the composited gate above proves.
test('the theme does not lean on the high contrast selection foreground', () => {
  expect(colors['editor.selectionForeground']).toBeUndefined();
});

// A ratio against the editor alone says nothing about the field the border encloses.
test('functional boundaries clear the non-text floor on both surfaces they touch', () => {
  const pairs: [string, string, string][] = [
    ['input.border', 'input.background', 'editorWidget.background'],
    ['dropdown.border', 'dropdown.background', 'editorWidget.background'],
    ['checkbox.border', 'checkbox.background', 'editorWidget.background'],
    ['settings.textInputBorder', 'settings.textInputBackground', 'editor.background'],
    ['settings.dropdownBorder', 'settings.dropdownBackground', 'editor.background'],
    ['settings.checkboxBorder', 'settings.checkboxBackground', 'editor.background'],
    ['panelInput.border', 'input.background', 'panel.background'],
    ['searchEditor.textInputBorder', 'input.background', 'sideBar.background'],
    ['list.focusOutline', 'list.focusBackground', 'sideBar.background'],
    ['list.focusAndSelectionOutline', 'list.activeSelectionBackground', 'sideBar.background'],
    ['list.inactiveFocusOutline', 'list.inactiveFocusBackground', 'sideBar.background'],
    ['focusBorder', 'input.background', 'editor.background'],
    ['focusBorder', 'quickInput.background', 'editor.background'],
  ];
  for (const [edge, inside, outside] of pairs) {
    for (const surface of [inside, outside]) {
      const ratio = contrastEmitted(hexToOklch(colors[edge]!), hexToOklch(colors[surface]!));
      expect(ratio, `${edge} on ${surface} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    }
  }
});

// Violet is a syntax hue. These are the only interface keys allowed to carry it: the
// bracket cycle the design specifies, the symbol icon that mirrors the keyword colour,
// and the chart key that names the hue an extension asks for by name.
const VIOLET_ALLOWED = new Set([
  'editorBracketHighlight.foreground3',
  'editorBracketHighlight.foreground6',
  'symbolIcon.keywordForeground',
  'charts.purple',
  // Slot 13 is the violet accent by design: the terminal and the editor are one palette.
  'terminal.ansiBrightMagenta',
]);

test('violet reaches no interface key outside the documented allowlist', () => {
  const violet = hex(ACCENTS.violet);
  const scale = accentScale('violet');
  const shades = new Set([violet, hex(scale.solid), hex(scale.border), hex(scale.subtle)]);
  const found = Object.entries(colors)
    .filter(([, value]) => shades.has(value.slice(0, 7)))
    .map(([key]) => key)
    .filter((key) => !VIOLET_ALLOWED.has(key));
  expect(found, `violet leaked into: ${found.join(', ')}`).toEqual([]);
  for (const key of VIOLET_ALLOWED) expect(colors[key], key).toBe(violet);
});

// Every foreground the theme emits, derived from the theme rather than listed beside it.
// Four rules shipped `dimText`, which `readingForegrounds()` does not name, so the gate
// never measured them and no overlay was ever solved against them: they read 3.37:1 on a
// selected word inside an added diff line. A rule may only take a colour the budget names.
test('every emitted foreground is in the budget and clears the floor on every state', () => {
  const emitted = new Map<string, string[]>();
  const add = (value: string, name: string) =>
    emitted.set(value, [...(emitted.get(value) ?? []), name]);
  for (const rule of tokenColors) {
    if (rule.settings.foreground !== undefined) add(rule.settings.foreground, rule.name);
  }
  for (const [token, value] of Object.entries(semanticTokenColors)) add(value, token);

  const budget = new Map(
    Object.entries(readingForegrounds()).map(([role, colour]) => [hex(colour), role]),
  );
  const outside = [...emitted].filter(([value]) => !budget.has(value));
  expect(
    outside.map(([value, names]) => `${value} (${names.join(', ')})`),
    'these ship as code and no decoration was solved against them',
  ).toEqual([]);

  for (const [value, names] of emitted) {
    for (const state of readingStates()) {
      const ratio = contrastEmitted(hexToOklch(value), state.background);
      expect(ratio, `${names.join(', ')} on ${state.name} = ${ratio.toFixed(2)}`)
        .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
});

// `codeEditorWidget.ts` writes `opacity: <alpha>` on the inline decoration from
// `editorUnnecessaryCode.opacity`, so the key fades the glyph rather than tinting the
// background under it. The comment sits exactly on the floor in the worst state the gate
// covers, so no fade is affordable at all. `editor.css` draws a dashed underline from
// `editorUnnecessaryCode.border`, which is what VS Code's own description recommends.
test('unused code keeps its colour and takes an underline instead of a fade', () => {
  expect(colors['editorUnnecessaryCode.opacity']).toBe('#000000ff');
  const border = hexToOklch(colors['editorUnnecessaryCode.border']!);
  for (const state of readingStates()) {
    const ratio = contrastEmitted(border, state.background);
    expect(ratio, `the unused underline on ${state.name} = ${ratio.toFixed(2)}`)
      .toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
  }
  // Why the key is set at all: VS Code's dark default is `#000a`, a fade to 0.667.
  const faded = Object.values(readingForegrounds())
    .flatMap((colour) => readingStates().map((state) =>
      contrastEmitted(compositeEmitted(colour, 0xaa / 255, state.background), state.background)));
  expect(Math.min(...faded), 'the inherited default fades code below the floor')
    .toBeLessThan(CONTRAST_FLOOR);
});

// The colours the budget names have to clear the floor on every state, whether or not a
// rule uses them: the decorations are solved against all of them.
test('the reading budget clears the floor on every state the gate covers', () => {
  const foregrounds = readingForegrounds();
  for (const state of readingStates()) {
    for (const [role, colour] of Object.entries(foregrounds)) {
      const ratio = contrastEmitted(colour, state.background);
      expect(ratio, `${role} on ${state.name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    }
  }
  expect(colors['editor.lineHighlightBackground']).toBe(
    hexAlpha(overlay.lineHighlight.color, overlay.lineHighlight.alpha),
  );
  expect(colors['editor.selectionBackground']).toBe(
    hexAlpha(overlay.selection.color, overlay.selection.alpha),
  );
});

// A diff has no word level marker. A second wash on the line fill leaves no syntax colour
// above the floor even at 6% alpha, and the outline VS Code offers instead is a high
// contrast affordance that boxes every line. The gutter and the line fill carry it.
test('a diff washes words and lines, and outlines neither', () => {
  // The two border keys are registered for the high contrast themes only. A whole inserted
  // line is one changed range, so setting them in a dark theme boxes every line of a diff.
  for (const key of ['diffEditor.insertedTextBorder', 'diffEditor.removedTextBorder']) {
    expect(colors[key], key).toBe('#00000000');
  }
  // The two washes carry an alpha byte. VS Code paints them over the selection, so an
  // opaque value would hide it on every changed line.
  for (const key of [
    'diffEditor.insertedLineBackground', 'diffEditor.removedLineBackground',
    'diffEditor.insertedTextBackground', 'diffEditor.removedTextBackground',
  ]) {
    expect(colors[key], key).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/);
    expect(opaque(colors[key]!), `${key} is opaque and would hide the selection`).toBe(false);
  }
  // A changed word reads louder than the line it sits on, and the gutter strip is opaque
  // because nothing paints over the margin.
  for (const side of ['added', 'removed'] as const) {
    const line = compositeEmitted(diffWash[`${side}Line`].color, diffWash[`${side}Line`].alpha, neutral.editor);
    const word = compositeEmitted(diffWash[`${side}Word`].color, diffWash[`${side}Word`].alpha, line);
    expect(contrastEmitted(word, neutral.editor), `${side} word over line`)
      .toBeGreaterThan(contrastEmitted(line, neutral.editor));
  }
  expect(colors['diffEditorGutter.insertedLineBackground']).toBe(hex(diff.addedStrip));
  expect(colors['diffEditorGutter.removedLineBackground']).toBe(hex(diff.removedStrip));
  expect(colors['editorGutter.addedBackground']).toBe(hex(diff.addedGutter));
  expect(colors['editorGutter.deletedBackground']).toBe(hex(diff.removedGutter));
});


// Every scope the six declared grammars emit, read from the VS Code repository at the
// revision recorded in the fixture. A theme is only "supports Markdown" to the extent
// that its selectors match what the grammar actually produces, and a selector written
// with a language suffix silently stops matching its own variants: `constant.character
// .entity.html` never matched `constant.character.entity.numeric.decimal.html`.
const scopes = JSON.parse(
  readFileSync(new URL('./scopes.json', import.meta.url), 'utf8'),
) as { revision: string; read: string; grammars: Record<string, string[]> };

// A TextMate selector matches a scope when it is a dotted prefix of it. A selector with
// spaces is a descendant match: every part has to match some scope in the stack.
const selectorMatches = (selector: string, scope: string): boolean => {
  const parts = selector.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return parts.every((part) => scope.split(/\s+/).some((s) => selectorMatches(part, s)));
  }
  return scope === selector || scope.startsWith(`${selector}.`);
};

// These carry no colour on purpose. A heading or a list scope wraps a whole block, so
// colouring it would tint the text inside rather than the marker; the `*.expr.tsx` scopes
// are structural and have no visible token of their own.
const UNCOLOURED = new Set([
  'heading.1.markdown', 'heading.2.markdown', 'heading.3.markdown',
  'heading.4.markdown', 'heading.5.markdown', 'heading.6.markdown',
  'markup.list.numbered.markdown', 'markup.list.unnumbered.markdown',
  'case-clause.expr.tsx', 'new.expr.tsx',
  'switch-block.expr.tsx', 'switch-expression.expr.tsx', 'switch-statement.expr.tsx',
]);

test('the scope fixture records where it came from', () => {
  expect(scopes.revision).toMatch(/^[0-9a-f]{40}$/);
  expect(scopes.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(Object.keys(scopes.grammars).sort())
    .toEqual(['css', 'html', 'json', 'markdown', 'tsx', 'yaml']);
});

test.each(Object.keys(scopes.grammars))('every %s scope is coloured or listed as uncoloured', (language) => {
  const selectors = tokenColors.flatMap((r) => r.scope);
  const uncovered = scopes.grammars[language]!
    .filter((scope) => !UNCOLOURED.has(scope))
    .filter((scope) => !selectors.some((selector) => selectorMatches(selector, scope)));
  expect(uncovered, `${language} scopes no rule matches: ${uncovered.join(', ')}`).toEqual([]);
});

test('nothing in the uncoloured list is a scope the grammars stopped emitting', () => {
  const all = new Set(Object.values(scopes.grammars).flat());
  const stale = [...UNCOLOURED].filter((scope) => !all.has(scope));
  expect(stale, `UNCOLOURED names scopes no grammar emits: ${stale.join(', ')}`).toEqual([]);
});

// VS Code registers these with `light: null, dark: null` and a value only for the high
// contrast themes. Setting one in a dark theme draws something VS Code deliberately does
// not: `editor.wordHighlightBorder` boxes every occurrence of the word under the caret,
// and `diffEditor.insertedTextBorder` boxes every line of a diff, because a whole
// inserted line is one changed range.
const highContrastOnly = JSON.parse(
  readFileSync(new URL('./high-contrast-only.json', import.meta.url), 'utf8'),
) as { revision: string; read: string; keys: string[] };

// A border between two regions is a different thing from an outline round every match.
// These draw one edge, so a dark theme may set them; each is part of Aion's chrome.
const STRUCTURAL = new Set([
  'activityBar.border', 'diffEditor.border', 'editorGroupHeader.border',
  'editorStickyScroll.border', 'menu.border', 'menu.selectionBorder',
  'menubar.selectionBorder', 'merge.border', 'notebook.inactiveSelectedCellBorder',
  'sideBar.border', 'statusBar.border', 'titleBar.border', 'widget.border',
  // The edge of a control a keyboard user has to find. This is the point of §3.
  'input.border',
  // A background, not an outline.
  'dropdown.listBackground',
  // One match at a time, and the terminal wash has to stay translucent, so it is faint
  // enough that the border is what makes the current match findable.
  'terminal.findMatchBorder',
  // One dashed underline under one unused range, and the only cue left once the fade is
  // gone. `editor.css` draws it as `border-bottom`, not as an outline round the range.
  'editorUnnecessaryCode.border',
]);

test('the high contrast key fixture records where it came from', () => {
  expect(highContrastOnly.revision).toMatch(/^[0-9a-f]{40}$/);
  expect(highContrastOnly.keys.length).toBeGreaterThan(30);
});

test('no high contrast only key is set outside the structural allowlist', () => {
  const drawn = highContrastOnly.keys
    .filter((key) => colors[key] !== undefined && colors[key] !== '#00000000')
    .filter((key) => !STRUCTURAL.has(key));
  expect(drawn, `these outline every match in a dark editor: ${drawn.join(', ')}`).toEqual([]);
});

test('the structural allowlist names no key that stopped being high contrast only', () => {
  const stale = [...STRUCTURAL].filter((key) => !highContrastOnly.keys.includes(key));
  expect(stale, `no longer high contrast only: ${stale.join(', ')}`).toEqual([]);
});
