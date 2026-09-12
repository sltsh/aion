import {
  ACCENTS, accentScale, ansi, comment, cursor, diff, diffWash, dimText, findMatch, hex,
  hexAlpha, neutral, overlay, status, terminalSelection,
} from '@sltsh/aion-tokens';
import type { Palette, StatusName } from '@sltsh/aion-tokens';

const n = neutral;
const a = ACCENTS;
const s = (name: keyof typeof ACCENTS) => accentScale(name);

const editor = hex(n.editor);
const panel = hex(n.terminal);
const chrome = hex(n.sidebar);
const widget = hex(n.widget);
const inputBg = hex(n.input);
const hover = hex(n.hover);
const hairline = hex(n.hairline);
const divider = hex(n.divider);
// A decorative separator uses `hairline` or `divider`. The edge of a control a keyboard
// user has to find uses `control`, which clears 3:1 on the field and on the chrome behind.
const control = hex(n.border);
// Step 10 is decorative. Dimmed UI text uses the dim token, which clears the floor on
// every dark surface; the line number keeps step 10 under the documented exemption.
const lineNumber = hex(n.muted);
const dim = hex(dimText);
const secondary = hex(n.textSecondary);
const primary = hex(n.textPrimary);

const gold = hex(a.gold);
const teal = hex(a.teal);
const blue = hex(a.blue);
const green = hex(a.green);
const coral = hex(a.coral);
const copper = hex(a.copper);
const violet = hex(a.violet);

const warning = hex(status.warning.text);
const error = hex(status.error.text);
const info = hex(status.info.text);

const wash = (name: keyof typeof diffWash): string =>
  hexAlpha(diffWash[name].color, diffWash[name].alpha);
const transparent = '#00000000';

const alpha = (colour: Parameters<typeof hexAlpha>[0], value: number) => hexAlpha(colour, value);

export const base = {
  foreground: secondary,
  descriptionForeground: dim,
  errorForeground: error,
  disabledForeground: dim,
  focusBorder: gold,
  'widget.border': hairline,
  'widget.shadow': alpha(n.editor, 0.6),
  // A workbench selection carries secondary text as well as primary, and gold at 0.30
  // put secondary at 3.02:1 on the field it selects in.
  'selection.background': alpha(a.gold, 0.12),
  'icon.foreground': secondary,
  'sash.hoverBorder': gold,
  'toolbar.hoverBackground': hover,
  'toolbar.activeBackground': hex(n.hairline),
  'textLink.foreground': blue,
  'textLink.activeForeground': teal,
  'textPreformat.foreground': gold,
  'textPreformat.background': hex(s('gold').subtle),
  'textBlockQuote.background': widget,
  'textBlockQuote.border': hex(s('teal').border),
  'textCodeBlock.background': widget,
  'textSeparator.foreground': divider,
  'scrollbar.shadow': alpha(n.editor, 0.7),
  'scrollbarSlider.background': alpha(n.border, 0.28),
  'scrollbarSlider.hoverBackground': alpha(n.border, 0.42),
  'scrollbarSlider.activeBackground': alpha(n.border, 0.56),
  'progressBar.background': gold,
  'badge.background': hex(s('gold').solid),
  'badge.foreground': editor,
};

export const window = {
  'titleBar.activeBackground': chrome,
  'titleBar.activeForeground': secondary,
  'titleBar.inactiveBackground': chrome,
  'titleBar.inactiveForeground': dim,
  'titleBar.border': hairline,
  'menubar.selectionBackground': hover,
  'menubar.selectionForeground': primary,
  'menubar.selectionBorder': hairline,
  'menu.background': widget,
  'menu.foreground': secondary,
  'menu.selectionBackground': hex(s('gold').subtle),
  'menu.selectionForeground': gold,
  'menu.selectionBorder': hex(s('gold').border),
  'menu.separatorBackground': hairline,
  'menu.border': hairline,
  'banner.background': widget,
  'banner.foreground': secondary,
  'banner.iconForeground': gold,
};

export const activityBar = {
  'activityBar.background': chrome,
  'activityBar.foreground': gold,
  'activityBar.inactiveForeground': dim,
  'activityBar.border': hairline,
  'activityBar.activeBorder': gold,
  'activityBar.activeBackground': hex(s('gold').subtle),
  'activityBar.dropBorder': gold,
  'activityBarBadge.background': gold,
  'activityBarBadge.foreground': editor,
  'activityBarTop.foreground': gold,
  'activityBarTop.activeBorder': gold,
  'activityBarTop.inactiveForeground': dim,
  'activityBarTop.dropBorder': gold,
};

export const sideBar = {
  'sideBar.background': chrome,
  'sideBar.foreground': secondary,
  'sideBar.border': hairline,
  'sideBar.dropBackground': alpha(a.gold, 0.12),
  'sideBarTitle.foreground': dim,
  'sideBarTitle.background': chrome,
  'sideBarSectionHeader.background': chrome,
  'sideBarSectionHeader.foreground': secondary,
  'sideBarSectionHeader.border': hairline,
  'sideBarActivityBarTop.border': hairline,
};

export const lists = {
  'list.activeSelectionBackground': hex(n.input),
  'list.activeSelectionForeground': primary,
  'list.activeSelectionIconForeground': gold,
  'list.inactiveSelectionBackground': widget,
  'list.inactiveSelectionForeground': secondary,
  'list.hoverBackground': widget,
  'list.hoverForeground': primary,
  'list.focusBackground': hex(n.input),
  'list.focusForeground': primary,
  'list.focusOutline': gold,
  'list.focusAndSelectionOutline': gold,
  'list.inactiveFocusBackground': widget,
  'list.inactiveFocusOutline': control,
  'list.highlightForeground': gold,
  'list.focusHighlightForeground': gold,
  'list.dropBackground': alpha(a.gold, 0.12),
  'list.errorForeground': error,
  'list.warningForeground': warning,
  'list.deemphasizedForeground': dim,
  'list.filterMatchBackground': alpha(a.gold, 0.12),
  'list.filterMatchBorder': hex(s('gold').border),
  'listFilterWidget.background': widget,
  'listFilterWidget.outline': gold,
  'listFilterWidget.noMatchesOutline': hex(s('coral').border),
  'listFilterWidget.shadow': alpha(n.editor, 0.6),
  'tree.indentGuidesStroke': hairline,
  'tree.inactiveIndentGuidesStroke': hex(n.hover),
  'tree.tableColumnsBorder': hairline,
  'tree.tableOddRowsBackground': alpha(n.widget, 0.5),
};

export const editorCore = {
  'editor.background': editor,
  'editor.foreground': secondary,
  'editorLineNumber.foreground': lineNumber,
  'editorLineNumber.activeForeground': primary,
  'editorLineNumber.dimmedForeground': hex(n.divider),
  'editorCursor.foreground': hex(cursor),
  'editorCursor.background': editor,
  'editor.selectionBackground': hexAlpha(overlay.selection.color, overlay.selection.alpha),
  'editor.inactiveSelectionBackground': alpha(n.border, 0.08),
  'editor.selectionHighlightBackground': alpha(n.border, 0.12),
  'editor.wordHighlightBackground': hexAlpha(overlay.wordHighlight.color, overlay.wordHighlight.alpha),
  'editor.wordHighlightStrongBackground': alpha(a.teal, 0.12),
  // Opaque, so it takes the full budget whatever sits under it, and dark enough that the
  // syntax colours it covers stay above the floor. `editor.findMatchForeground` and
  // `editor.findMatchHighlightForeground` are deliberately unset: `findWidget.ts` applies
  // each of them to the other one's decoration, so a theme that sets them ships two
  // unreadable pairings.
  'editor.findMatchBackground': hex(findMatch.current),
  // No border. Every per-match outline below is a high contrast affordance that boxes a
  // dark editor, and the fill already marks the match.
  'editor.findMatchBorder': transparent,
  'editor.findMatchHighlightBackground': hexAlpha(overlay.findMatchOther.color, overlay.findMatchOther.alpha),

  'editor.findRangeHighlightBackground': alpha(n.border, 0.12),
  'editor.hoverHighlightBackground': alpha(a.blue, 0.12),
  'editor.lineHighlightBackground': hexAlpha(overlay.lineHighlight.color, overlay.lineHighlight.alpha),
  'editor.lineHighlightBorder': transparent,
  'editor.rangeHighlightBackground': alpha(n.hover, 0.5),
  'editor.symbolHighlightBackground': alpha(a.gold, 0.10),
  'editor.foldBackground': alpha(n.hover, 0.4),
  'editor.stackFrameHighlightBackground': alpha(a.gold, 0.10),
  'editor.focusedStackFrameHighlightBackground': alpha(a.green, 0.12),
  'editorLink.activeForeground': teal,
  'editorWhitespace.foreground': hex(n.hairline),
  'editorIndentGuide.background1': hex(n.hover),
  'editorIndentGuide.activeBackground1': hex(n.divider),
  'editorRuler.foreground': hex(n.hover),
  'editorCodeLens.foreground': dim,
  'editorBracketMatch.background': alpha(a.gold, 0.10),
  'editorBracketMatch.border': hex(s('gold').border),
  'editorBracketHighlight.foreground1': gold,
  'editorBracketHighlight.foreground2': teal,
  'editorBracketHighlight.foreground3': violet,
  'editorBracketHighlight.foreground4': gold,
  'editorBracketHighlight.foreground5': teal,
  'editorBracketHighlight.foreground6': violet,
  'editorBracketHighlight.unexpectedBracket.foreground': coral,
  'editorBracketPairGuide.background1': hex(s('gold').border),
  'editorBracketPairGuide.activeBackground1': gold,
  // `codeEditorWidget.ts` turns the alpha byte of `editorUnnecessaryCode.opacity` into a
  // CSS `opacity` on the glyph, so it fades the text rather than tinting what is behind
  // it. The comment already sits on the floor in the worst state the gate covers, so any
  // fade at all drops a syntax colour under it: VS Code's own dark default of `#000a`
  // reads 2.69:1. Unused code keeps its colour and `editor.css` marks it with the dashed
  // underline VS Code documents for the high contrast themes instead.
  'editorUnnecessaryCode.border': dim,
  'editorUnnecessaryCode.opacity': '#000000ff',
  'editorInlayHint.background': widget,
  'editorInlayHint.foreground': dim,
  'editorInlayHint.typeBackground': widget,
  'editorInlayHint.typeForeground': dim,
  'editorInlayHint.parameterBackground': widget,
  'editorInlayHint.parameterForeground': dim,
  'editorStickyScroll.background': hex(n.terminal),
  'editorStickyScroll.border': hairline,
  'editorStickyScrollHover.background': widget,
  'editorLightBulb.foreground': gold,
  'editorLightBulbAutoFix.foreground': teal,
  'editorLightBulbAi.foreground': blue,
  'editorPane.background': editor,
  'editorGroup.border': hairline,
  'editorGroup.dropBackground': alpha(a.gold, 0.10),
  'editorGroup.emptyBackground': editor,
  'editorGroupHeader.tabsBackground': chrome,
  'editorGroupHeader.tabsBorder': hairline,
  'editorGroupHeader.noTabsBackground': chrome,
  'editorGroupHeader.border': hairline,
};

export const diagnostics = {
  'editorError.foreground': error,
  'editorError.border': transparent,
  'editorWarning.foreground': warning,
  'editorWarning.border': transparent,
  'editorInfo.foreground': info,
  'editorInfo.border': transparent,
  'editorHint.foreground': dim,
  'editorHint.border': transparent,
  'editorGutter.background': editor,
  'editorGutter.modifiedBackground': hex(a.copper),
  'editorGutter.addedBackground': hex(diff.addedGutter),
  'editorGutter.deletedBackground': hex(diff.removedGutter),
  'editorGutter.commentRangeForeground': dim,
  'editorGutter.foldingControlForeground': secondary,
  'editorOverviewRuler.border': transparent,
  'editorOverviewRuler.background': editor,
  'editorOverviewRuler.findMatchForeground': alpha(a.gold, 0.6),
  'editorOverviewRuler.rangeHighlightForeground': alpha(n.border, 0.5),
  'editorOverviewRuler.selectionHighlightForeground': alpha(n.border, 0.4),
  'editorOverviewRuler.wordHighlightForeground': alpha(a.teal, 0.5),
  'editorOverviewRuler.wordHighlightStrongForeground': alpha(a.teal, 0.7),
  'editorOverviewRuler.bracketMatchForeground': hex(s('gold').border),
  'editorOverviewRuler.modifiedForeground': alpha(a.copper, 0.7),
  'editorOverviewRuler.addedForeground': alpha(a.green, 0.7),
  'editorOverviewRuler.deletedForeground': alpha(a.coral, 0.7),
  'editorOverviewRuler.errorForeground': error,
  'editorOverviewRuler.warningForeground': warning,
  'editorOverviewRuler.infoForeground': info,
  'problemsErrorIcon.foreground': error,
  'problemsWarningIcon.foreground': warning,
  'problemsInfoIcon.foreground': info,
};

export const tabs = {
  'tab.activeBackground': editor,
  'tab.activeForeground': primary,
  'tab.inactiveBackground': chrome,
  'tab.inactiveForeground': dim,
  'tab.border': hairline,
  'tab.activeBorder': editor,
  'tab.activeBorderTop': gold,
  'tab.unfocusedActiveBorderTop': hex(s('gold').border),
  'tab.unfocusedActiveBackground': editor,
  'tab.unfocusedActiveForeground': secondary,
  'tab.unfocusedInactiveBackground': chrome,
  'tab.unfocusedInactiveForeground': dim,
  'tab.hoverBackground': hex(n.input),
  'tab.hoverForeground': primary,
  'tab.hoverBorder': hex(s('gold').border),
  'tab.activeModifiedBorder': copper,
  'tab.inactiveModifiedBorder': hex(s('copper').border),
  'tab.unfocusedActiveModifiedBorder': hex(s('copper').border),
  'tab.unfocusedInactiveModifiedBorder': hex(s('copper').border),
  'tab.lastPinnedBorder': divider,
  'tab.dragAndDropBorder': gold,
  'breadcrumb.background': editor,
  'breadcrumb.foreground': dim,
  'breadcrumb.focusForeground': primary,
  'breadcrumb.activeSelectionForeground': gold,
  'breadcrumbPicker.background': widget,
};

export const widgets = {
  'editorWidget.background': widget,
  'editorWidget.foreground': secondary,
  'editorWidget.border': hairline,
  'editorWidget.resizeBorder': gold,
  'editorSuggestWidget.background': widget,
  'editorSuggestWidget.border': hairline,
  'editorSuggestWidget.foreground': secondary,
  'editorSuggestWidget.selectedBackground': hex(n.input),
  'editorSuggestWidget.selectedForeground': primary,
  'editorSuggestWidget.selectedIconForeground': gold,
  'editorSuggestWidget.highlightForeground': gold,
  'editorSuggestWidget.focusHighlightForeground': gold,
  'editorSuggestWidgetStatus.foreground': dim,
  'editorHoverWidget.background': widget,
  'editorHoverWidget.foreground': secondary,
  'editorHoverWidget.border': hairline,
  'editorHoverWidget.highlightForeground': gold,
  'editorHoverWidget.statusBarBackground': hex(n.input),
  'editorGhostText.foreground': dim,
  'editorGhostText.border': transparent,
  'debugExceptionWidget.background': hex(s('coral').subtle),
  'debugExceptionWidget.border': hex(s('coral').border),
  'editorMarkerNavigation.background': widget,
  'editorMarkerNavigationError.background': error,
  'editorMarkerNavigationWarning.background': warning,
  'editorMarkerNavigationInfo.background': info,
  'peekView.border': hex(s('gold').border),
  'peekViewEditor.background': panel,
  // Peek has no match-foreground key, so the wash itself has to stay inside the budget
  // the comment sets. The results list moves onto the panel for the same reason.
  'peekViewEditor.matchHighlightBackground': alpha(a.gold, 0.10),
  'peekViewEditorGutter.background': panel,
  'peekViewResult.background': panel,
  'peekViewResult.fileForeground': primary,
  'peekViewResult.lineForeground': secondary,
  'peekViewResult.matchHighlightBackground': alpha(a.gold, 0.10),
  'peekViewResult.selectionBackground': hex(n.input),
  'peekViewResult.selectionForeground': primary,
  'peekViewTitle.background': widget,
  'peekViewTitleDescription.foreground': dim,
  'peekViewTitleLabel.foreground': primary,
};

export const inputs = {
  'input.background': inputBg,
  'input.foreground': primary,
  'input.border': control,
  'input.placeholderForeground': secondary,
  'inputOption.activeBackground': hex(s('gold').subtle),
  'inputOption.activeBorder': hex(s('gold').border),
  'inputOption.activeForeground': gold,
  'inputOption.hoverBackground': hover,
  'inputValidation.errorBackground': hex(s('coral').subtle),
  'inputValidation.errorForeground': error,
  'inputValidation.errorBorder': hex(s('coral').border),
  'inputValidation.warningBackground': hex(s('copper').subtle),
  'inputValidation.warningForeground': warning,
  'inputValidation.warningBorder': hex(s('copper').border),
  'inputValidation.infoBackground': hex(s('blue').subtle),
  'inputValidation.infoForeground': info,
  'inputValidation.infoBorder': hex(s('blue').border),
  'dropdown.background': inputBg,
  'dropdown.listBackground': widget,
  'dropdown.foreground': primary,
  'dropdown.border': control,
  'button.background': gold,
  'button.foreground': editor,
  'button.hoverBackground': hex(s('gold').solid),
  'button.border': transparent,
  'button.separator': alpha(n.editor, 0.4),
  'button.secondaryBackground': hex(n.input),
  'button.secondaryForeground': primary,
  'button.secondaryHoverBackground': hover,
  'checkbox.background': inputBg,
  'checkbox.foreground': gold,
  'checkbox.border': control,
  'checkbox.selectBackground': hex(s('gold').subtle),
  'checkbox.selectBorder': hex(s('gold').border),
  'keybindingLabel.background': hex(n.input),
  'keybindingLabel.foreground': secondary,
  'keybindingLabel.border': hairline,
  'keybindingLabel.bottomBorder': divider,
  'keybindingTable.headerBackground': widget,
  'keybindingTable.rowsBackground': alpha(n.widget, 0.5),
};

export const quickInput = {
  'quickInput.background': widget,
  'quickInput.foreground': secondary,
  'quickInputList.focusBackground': hex(n.input),
  'quickInputList.focusForeground': primary,
  'quickInputList.focusIconForeground': gold,
  'quickInputTitle.background': hex(n.input),
  'pickerGroup.border': hairline,
  'pickerGroup.foreground': gold,
  'commandCenter.background': hex(n.input),
  'commandCenter.foreground': secondary,
  'commandCenter.activeBackground': hover,
  'commandCenter.activeForeground': primary,
  'commandCenter.border': hairline,
  'commandCenter.activeBorder': hex(s('gold').border),
  'commandCenter.inactiveBorder': hairline,
};

export const notifications = {
  'notificationCenter.border': hairline,
  'notificationCenterHeader.background': hex(n.input),
  'notificationCenterHeader.foreground': secondary,
  'notifications.background': widget,
  'notifications.foreground': secondary,
  'notifications.border': hairline,
  'notificationLink.foreground': blue,
  'notificationsErrorIcon.foreground': error,
  'notificationsWarningIcon.foreground': warning,
  'notificationsInfoIcon.foreground': info,
  'notificationToast.border': hairline,
};

export const diffAndMerge = {
  // Translucent, and it has to be. VS Code registers `DecorationsOverlay` after
  // `SelectionsOverlay` and renders both into the same line element in registration
  // order, so a diff fill paints over the selection. An opaque fill hides the selection
  // on every changed line. These alphas leave the selection reading at 60% of the shift
  // it makes on a plain line. The word wash lands on the line wash, never on the editor.
  'diffEditor.insertedTextBackground': wash('addedWord'),
  'diffEditor.removedTextBackground': wash('removedWord'),
  'diffEditor.insertedLineBackground': wash('addedLine'),
  'diffEditor.removedLineBackground': wash('removedLine'),
  // VS Code defines these only for the high contrast themes. A whole inserted line is one
  // changed range, so in a dark theme they draw a box around every line of a diff.
  'diffEditor.insertedTextBorder': transparent,
  'diffEditor.removedTextBorder': transparent,
  'diffEditor.border': hairline,
  'diffEditor.diagonalFill': hex(n.hover),
  'diffEditor.unchangedRegionBackground': panel,
  'diffEditor.unchangedRegionForeground': dim,
  'diffEditor.unchangedCodeBackground': alpha(n.hover, 0.3),
  // The gutter column carries the line number and no body text, so it is gated at 3:1
  // against that alone and is the loudest of the three diff markers.
  'diffEditorGutter.insertedLineBackground': hex(diff.addedStrip),
  'diffEditorGutter.removedLineBackground': hex(diff.removedStrip),
  'diffEditorOverview.insertedForeground': alpha(a.green, 0.7),
  'diffEditorOverview.removedForeground': alpha(a.coral, 0.7),
  'merge.currentHeaderBackground': alpha(a.green, 0.12),
  'merge.currentContentBackground': hex(s('green').subtle),
  'merge.incomingHeaderBackground': alpha(a.blue, 0.12),
  'merge.incomingContentBackground': hex(s('blue').subtle),
  'merge.commonHeaderBackground': alpha(n.border, 0.20),
  'merge.commonContentBackground': widget,
  'merge.border': hairline,
  'mergeEditor.change.background': alpha(diff.addedGutter, 0.10),
  'mergeEditor.change.word.background': alpha(diff.addedGutter, 0.12),
  'mergeEditor.conflict.unhandledUnfocused.border': hex(s('copper').border),
  'mergeEditor.conflict.unhandledFocused.border': copper,
  'mergeEditor.conflict.handledUnfocused.border': hex(s('green').border),
  'mergeEditor.conflict.handledFocused.border': green,
  'mergeEditor.conflict.handled.minimapOverViewRuler': alpha(a.green, 0.7),
  'mergeEditor.conflict.unhandled.minimapOverViewRuler': alpha(a.copper, 0.7),
};

export const panelAndTerminal = {
  'panel.background': panel,
  'panel.border': hairline,
  'panel.dropBorder': gold,
  'panelTitle.activeBorder': gold,
  'panelTitle.activeForeground': primary,
  'panelTitle.inactiveForeground': dim,
  'panelSection.border': hairline,
  'panelSection.dropBackground': alpha(a.gold, 0.10),
  'panelSectionHeader.background': panel,
  'panelSectionHeader.foreground': secondary,
  'panelSectionHeader.border': hairline,
  'panelInput.border': control,
  'terminal.background': panel,
  'terminal.foreground': secondary,
  // A terminal selection carries ANSI text, not syntax, and the dimmest slot is what
  // binds it. The editor's overlay put ANSI red at 4.38:1, so the terminal takes the
  // opaque value the standalone scheme uses and every slot clears the floor on it.
  'terminal.selectionBackground': hex(terminalSelection),
  'terminal.inactiveSelectionBackground': alpha(terminalSelection, 0.5),
  'terminal.border': hairline,
  'terminal.dropBackground': alpha(a.gold, 0.10),
  'terminal.tab.activeBorder': gold,
  // VS Code requires both terminal match colours to stay translucent, and the terminal
  // has no foreground override, so the border carries the signal the wash cannot.
  'terminal.findMatchBackground': alpha(a.gold, 0.09),
  'terminal.findMatchBorder': gold,
  'terminal.findMatchHighlightBackground': alpha(a.gold, 0.06),
  'terminalCursor.foreground': hex(cursor),
  'terminalCursor.background': panel,
  'terminalCommandDecoration.defaultBackground': dim,
  'terminalCommandDecoration.successBackground': green,
  'terminalCommandDecoration.errorBackground': coral,
  'terminal.ansiBlack': hex(ansi.black),
  'terminal.ansiRed': hex(ansi.red),
  'terminal.ansiGreen': hex(ansi.green),
  'terminal.ansiYellow': hex(ansi.yellow),
  'terminal.ansiBlue': hex(ansi.blue),
  'terminal.ansiMagenta': hex(ansi.magenta),
  'terminal.ansiCyan': hex(ansi.cyan),
  'terminal.ansiWhite': hex(ansi.white),
  'terminal.ansiBrightBlack': hex(ansi.brightBlack),
  'terminal.ansiBrightRed': hex(ansi.brightRed),
  'terminal.ansiBrightGreen': hex(ansi.brightGreen),
  'terminal.ansiBrightYellow': hex(ansi.brightYellow),
  'terminal.ansiBrightBlue': hex(ansi.brightBlue),
  'terminal.ansiBrightMagenta': hex(ansi.brightMagenta),
  'terminal.ansiBrightCyan': hex(ansi.brightCyan),
  'terminal.ansiBrightWhite': hex(ansi.brightWhite),
};

export const statusBar = {
  'statusBar.background': chrome,
  'statusBar.foreground': secondary,
  'statusBar.border': hairline,
  'statusBar.focusBorder': gold,
  'statusBar.debuggingBackground': hex(s('copper').solid),
  'statusBar.debuggingForeground': editor,
  'statusBar.debuggingBorder': hex(s('copper').border),
  'statusBar.noFolderBackground': chrome,
  'statusBar.noFolderForeground': dim,
  'statusBar.noFolderBorder': hairline,
  'statusBarItem.hoverBackground': hover,
  'statusBarItem.hoverForeground': primary,
  'statusBarItem.activeBackground': hex(n.hairline),
  'statusBarItem.focusBorder': gold,
  'statusBarItem.prominentBackground': hex(s('gold').subtle),
  'statusBarItem.prominentForeground': gold,
  'statusBarItem.prominentHoverBackground': hex(s('gold').border),
  'statusBarItem.remoteBackground': hex(s('teal').solid),
  'statusBarItem.remoteForeground': editor,
  'statusBarItem.remoteHoverBackground': teal,
  'statusBarItem.remoteHoverForeground': editor,
  'statusBarItem.errorBackground': hex(s('coral').solid),
  'statusBarItem.errorForeground': editor,
  'statusBarItem.errorHoverBackground': coral,
  'statusBarItem.warningBackground': hex(s('copper').solid),
  'statusBarItem.warningForeground': editor,
  'statusBarItem.warningHoverBackground': copper,
  'statusBarItem.compactHoverBackground': hex(n.hairline),
  'statusBarItem.offlineBackground': hex(s('coral').solid),
  'statusBarItem.offlineForeground': editor,
};

export const minimap = {
  'minimap.background': editor,
  'minimap.foregroundOpacity': '#000000c0',
  'minimap.findMatchHighlight': alpha(a.gold, 0.55),
  'minimap.selectionHighlight': alpha(n.border, 0.45),
  'minimap.selectionOccurrenceHighlight': alpha(n.border, 0.3),
  'minimap.errorHighlight': error,
  'minimap.warningHighlight': warning,
  'minimap.infoHighlight': info,
  'minimapSlider.background': alpha(n.border, 0.16),
  'minimapSlider.hoverBackground': alpha(n.border, 0.26),
  'minimapSlider.activeBackground': alpha(n.border, 0.36),
  'minimapGutter.addedBackground': hex(diff.addedGutter),
  'minimapGutter.modifiedBackground': copper,
  'minimapGutter.deletedBackground': hex(diff.removedGutter),
};

export const git = {
  'git.blame.editorDecorationForeground': dim,
  'gitDecoration.addedResourceForeground': green,
  'gitDecoration.modifiedResourceForeground': copper,
  'gitDecoration.deletedResourceForeground': coral,
  'gitDecoration.renamedResourceForeground': teal,
  'gitDecoration.untrackedResourceForeground': teal,
  'gitDecoration.ignoredResourceForeground': dim,
  'gitDecoration.conflictingResourceForeground': coral,
  'gitDecoration.stageDeletedResourceForeground': coral,
  'gitDecoration.stageModifiedResourceForeground': copper,
  'gitDecoration.submoduleResourceForeground': blue,
  'scmGraph.historyItemRefColor': gold,
  'scmGraph.historyItemRemoteRefColor': teal,
  'scmGraph.historyItemBaseRefColor': blue,
  'scmGraph.foreground1': gold,
  'scmGraph.foreground2': teal,
  'scmGraph.foreground3': blue,
  'scmGraph.foreground4': green,
  'scmGraph.foreground5': coral,
};

export const debugAndTesting = {
  'debugToolBar.background': widget,
  'debugToolBar.border': hairline,
  'debugIcon.breakpointForeground': coral,
  'debugIcon.breakpointDisabledForeground': hex(s('coral').border),
  'debugIcon.breakpointUnverifiedForeground': dim,
  'debugIcon.breakpointCurrentStackframeForeground': gold,
  'debugIcon.breakpointStackframeForeground': copper,
  'debugIcon.startForeground': green,
  'debugIcon.pauseForeground': gold,
  'debugIcon.stopForeground': coral,
  'debugIcon.disconnectForeground': coral,
  'debugIcon.restartForeground': green,
  'debugIcon.stepOverForeground': blue,
  'debugIcon.stepIntoForeground': blue,
  'debugIcon.stepOutForeground': blue,
  'debugIcon.continueForeground': green,
  'debugIcon.stepBackForeground': blue,
  'debugConsole.infoForeground': info,
  'debugConsole.warningForeground': warning,
  'debugConsole.errorForeground': error,
  'debugConsole.sourceForeground': dim,
  'debugConsoleInputIcon.foreground': gold,
  'debugView.stateLabelBackground': hex(n.input),
  'debugView.stateLabelForeground': secondary,
  'debugView.valueChangedHighlight': hex(s('gold').border),
  'debugView.exceptionLabelBackground': hex(s('coral').solid),
  'debugView.exceptionLabelForeground': editor,
  'testing.iconPassed': green,
  'testing.iconFailed': coral,
  'testing.iconErrored': coral,
  'testing.iconQueued': copper,
  'testing.iconSkipped': dim,
  'testing.iconUnset': dim,
  'testing.runAction': green,
  'testing.peekBorder': hex(s('coral').border),
  'testing.peekHeaderBackground': hex(s('coral').subtle),
  'testing.message.error.decorationForeground': error,
  'testing.message.error.lineBackground': hex(s('coral').subtle),
  'testing.message.info.decorationForeground': info,
  'testing.message.info.lineBackground': hex(s('blue').subtle),
  'testing.coveredBackground': alpha(a.green, 0.12),
  'testing.coveredBorder': hex(s('green').border),
  'testing.uncoveredBackground': alpha(a.coral, 0.14),
  'testing.uncoveredBorder': hex(s('coral').border),
  'testing.coverCountBadgeBackground': hex(s('gold').subtle),
  'testing.coverCountBadgeForeground': gold,
};

export const notebook = {
  'notebook.editorBackground': editor,
  'notebook.cellBorderColor': hairline,
  'notebook.cellEditorBackground': panel,
  'notebook.cellHoverBackground': alpha(n.terminal, 0.6),
  'notebook.cellInsertionIndicator': gold,
  'notebook.cellStatusBarItemHoverBackground': hover,
  'notebook.cellToolbarSeparator': hairline,
  'notebook.focusedCellBackground': alpha(n.terminal, 0.8),
  'notebook.focusedCellBorder': hex(s('gold').border),
  'notebook.focusedEditorBorder': hex(s('gold').border),
  'notebook.inactiveFocusedCellBorder': hairline,
  'notebook.inactiveSelectedCellBorder': hairline,
  'notebook.outputContainerBackgroundColor': panel,
  'notebook.outputContainerBorderColor': hairline,
  'notebook.selectedCellBackground': widget,
  'notebook.selectedCellBorder': hairline,
  'notebook.symbolHighlightBackground': alpha(a.gold, 0.10),
  'notebookStatusErrorIcon.foreground': error,
  'notebookStatusRunningIcon.foreground': gold,
  'notebookStatusSuccessIcon.foreground': green,
  'notebookScrollbarSlider.background': alpha(n.border, 0.28),
  'notebookScrollbarSlider.hoverBackground': alpha(n.border, 0.42),
  'notebookScrollbarSlider.activeBackground': alpha(n.border, 0.56),
  'notebookEditorOverviewRuler.runningCellForeground': gold,
};

export const settingsAndWelcome = {
  'settings.headerForeground': primary,
  'settings.modifiedItemIndicator': gold,
  'settings.dropdownBackground': inputBg,
  'settings.dropdownForeground': primary,
  'settings.dropdownBorder': control,
  'settings.dropdownListBorder': control,
  'settings.checkboxBackground': inputBg,
  'settings.checkboxForeground': gold,
  'settings.checkboxBorder': control,
  'settings.textInputBackground': inputBg,
  'settings.textInputForeground': primary,
  'settings.textInputBorder': control,
  'settings.numberInputBackground': inputBg,
  'settings.numberInputForeground': copper,
  'settings.numberInputBorder': control,
  'settings.focusedRowBackground': alpha(n.widget, 0.6),
  'settings.rowHoverBackground': alpha(n.widget, 0.4),
  'settings.focusedRowBorder': hex(s('gold').border),
  'settings.headerBorder': hairline,
  'settings.sashBorder': hairline,
  'welcomePage.background': editor,
  'welcomePage.progress.background': hex(n.input),
  'welcomePage.progress.foreground': gold,
  'welcomePage.tileBackground': widget,
  'welcomePage.tileHoverBackground': hex(n.input),
  'welcomePage.tileBorder': hairline,
  'walkThrough.embeddedEditorBackground': panel,
  'walkthrough.stepTitle.foreground': primary,
  'extensionButton.prominentBackground': gold,
  'extensionButton.prominentForeground': editor,
  'extensionButton.prominentHoverBackground': hex(s('gold').solid),
  'extensionButton.background': gold,
  'extensionButton.foreground': editor,
  'extensionButton.hoverBackground': hex(s('gold').solid),
  'extensionButton.separator': alpha(n.editor, 0.4),
  'extensionBadge.remoteBackground': teal,
  'extensionBadge.remoteForeground': editor,
  'extensionIcon.starForeground': gold,
  'extensionIcon.verifiedForeground': teal,
  'extensionIcon.preReleaseForeground': copper,
  'extensionIcon.sponsorForeground': coral,
  'ports.iconRunningProcessForeground': green,
  'searchEditor.findMatchBackground': alpha(a.gold, 0.10),
  'searchEditor.textInputBorder': control,
  'search.resultsInfoForeground': dim,
  'commentsView.resolvedIcon': dim,
  'commentsView.unresolvedIcon': gold,
  'editorCommentsWidget.resolvedBorder': hairline,
  'editorCommentsWidget.unresolvedBorder': hex(s('gold').border),
  'editorCommentsWidget.rangeBackground': alpha(a.gold, 0.10),
  'editorCommentsWidget.rangeActiveBackground': alpha(a.gold, 0.10),
};

export const charts = {
  'charts.foreground': secondary,
  'charts.lines': hairline,
  'charts.red': coral,
  'charts.blue': blue,
  'charts.yellow': gold,
  'charts.orange': copper,
  'charts.green': green,
  'charts.purple': violet,
  'chart.line': gold,
  'chart.axis': hairline,
  'chart.guide': hex(n.hover),
};

export const symbolIcons = {
  'symbolIcon.arrayForeground': secondary,
  'symbolIcon.booleanForeground': copper,
  'symbolIcon.classForeground': gold,
  'symbolIcon.colorForeground': secondary,
  'symbolIcon.constantForeground': copper,
  'symbolIcon.constructorForeground': blue,
  'symbolIcon.enumeratorForeground': gold,
  'symbolIcon.enumeratorMemberForeground': copper,
  'symbolIcon.eventForeground': copper,
  'symbolIcon.fieldForeground': coral,
  'symbolIcon.fileForeground': secondary,
  'symbolIcon.folderForeground': secondary,
  'symbolIcon.functionForeground': blue,
  'symbolIcon.interfaceForeground': gold,
  'symbolIcon.keyForeground': coral,
  'symbolIcon.keywordForeground': violet,
  'symbolIcon.methodForeground': blue,
  'symbolIcon.moduleForeground': secondary,
  'symbolIcon.namespaceForeground': gold,
  'symbolIcon.nullForeground': copper,
  'symbolIcon.numberForeground': copper,
  'symbolIcon.objectForeground': gold,
  'symbolIcon.operatorForeground': teal,
  'symbolIcon.packageForeground': secondary,
  'symbolIcon.propertyForeground': coral,
  'symbolIcon.referenceForeground': blue,
  'symbolIcon.snippetForeground': secondary,
  'symbolIcon.stringForeground': green,
  'symbolIcon.structForeground': gold,
  'symbolIcon.textForeground': secondary,
  'symbolIcon.typeParameterForeground': gold,
  'symbolIcon.unitForeground': secondary,
  'symbolIcon.variableForeground': coral,
};

export const colors: Record<string, string> = {
  ...base, ...window, ...activityBar, ...sideBar, ...lists, ...editorCore, ...diagnostics,
  ...tabs, ...widgets, ...inputs, ...quickInput, ...notifications, ...diffAndMerge,
  ...panelAndTerminal, ...statusBar, ...minimap, ...git, ...debugAndTesting, ...notebook,
  ...settingsAndWelcome, ...charts, ...symbolIcons,
};

export const syntaxHex = {
  variable: coral, number: copper, constant: copper, type: gold, string: green,
  operator: teal, escape: teal, function: blue, keyword: violet,
  comment: hex(comment), punctuation: secondary, dim, secondary, primary,
  coral, copper, gold, green, teal, blue, violet,
};

export type SyntaxHex = typeof syntaxHex;

export const syntaxHexFor = (palette: Palette): SyntaxHex => ({
  variable: hex(palette.accents.coral), number: hex(palette.accents.copper),
  constant: hex(palette.accents.copper), type: hex(palette.accents.gold),
  string: hex(palette.accents.green), operator: hex(palette.accents.teal),
  escape: hex(palette.accents.teal), function: hex(palette.accents.blue),
  keyword: hex(palette.accents.violet), comment: hex(palette.comment),
  punctuation: hex(palette.neutral.textSecondary), dim: hex(palette.dim),
  secondary: hex(palette.neutral.textSecondary), primary: hex(palette.neutral.textPrimary),
  coral: hex(palette.accents.coral), copper: hex(palette.accents.copper),
  gold: hex(palette.accents.gold), green: hex(palette.accents.green),
  teal: hex(palette.accents.teal), blue: hex(palette.accents.blue),
  violet: hex(palette.accents.violet),
});

// The dark object above remains the snapshot source. A light scheme reuses this map and
// substitutes each emitted token value from a complete palette, so key coverage cannot
// drift between schemes and the dark JSON stays byte-for-byte stable.
const addPair = (pairs: Map<string, string>, from: string, to: string): void => {
  pairs.set(from, to);
};

interface PalettePairs {
  readonly colours: Map<string, string>;
  readonly alphaColours: Map<string, string>;
  readonly exact: Map<string, string>;
  readonly keyColours: Map<string, string>;
}

const STATUS_KEYS: Record<StatusName, {
  text: readonly string[];
  subtle: readonly string[];
  border: readonly string[];
  solid: readonly string[];
  onSolid: readonly string[];
}> = {
  success: {
    text: ['testing.iconPassed', 'testing.runAction', 'notebookStatusSuccessIcon.foreground',
      'ports.iconRunningProcessForeground'],
    subtle: [], border: [],
    solid: ['terminalCommandDecoration.successBackground'], onSolid: [],
  },
  warning: {
    text: [
      'list.warningForeground', 'editorWarning.foreground', 'editorOverviewRuler.warningForeground',
      'problemsWarningIcon.foreground', 'editorMarkerNavigationWarning.background',
      'inputValidation.warningForeground', 'notificationsWarningIcon.foreground',
      'minimap.warningHighlight', 'debugConsole.warningForeground',
    ],
    subtle: ['inputValidation.warningBackground'],
    border: ['inputValidation.warningBorder'],
    solid: ['statusBarItem.warningBackground', 'statusBarItem.warningHoverBackground'],
    onSolid: ['statusBarItem.warningForeground'],
  },
  error: {
    text: [
      'errorForeground', 'list.errorForeground', 'editorError.foreground',
      'editorOverviewRuler.errorForeground', 'problemsErrorIcon.foreground',
      'editorMarkerNavigationError.background', 'inputValidation.errorForeground',
      'notificationsErrorIcon.foreground', 'minimap.errorHighlight', 'debugConsole.errorForeground',
      'testing.message.error.decorationForeground', 'notebookStatusErrorIcon.foreground',
      'testing.iconFailed', 'testing.iconErrored',
    ],
    subtle: ['inputValidation.errorBackground', 'testing.message.error.lineBackground',
      'debugExceptionWidget.background', 'testing.peekHeaderBackground'],
    border: ['inputValidation.errorBorder', 'debugExceptionWidget.border', 'testing.peekBorder',
      'testing.uncoveredBorder'],
    solid: ['statusBarItem.errorBackground', 'statusBarItem.errorHoverBackground',
      'terminalCommandDecoration.errorBackground', 'statusBarItem.offlineBackground',
      'debugView.exceptionLabelBackground'],
    onSolid: ['statusBarItem.errorForeground', 'statusBarItem.offlineForeground',
      'debugView.exceptionLabelForeground'],
  },
  info: {
    text: [
      'editorInfo.foreground', 'editorOverviewRuler.infoForeground', 'problemsInfoIcon.foreground',
      'editorMarkerNavigationInfo.background', 'inputValidation.infoForeground',
      'notificationsInfoIcon.foreground', 'minimap.infoHighlight', 'debugConsole.infoForeground',
      'testing.message.info.decorationForeground',
    ],
    subtle: ['inputValidation.infoBackground', 'testing.message.info.lineBackground'],
    border: ['inputValidation.infoBorder'],
    solid: [], onSolid: [],
  },
};

const palettePairs = (palette: Palette): PalettePairs => {
  const colours = new Map<string, string>();
  const alphaColours = new Map<string, string>();
  const exact = new Map<string, string>();
  const keyColours = new Map<string, string>();
  const add = (from: string, to: string): void => addPair(colours, from, to);
  for (const name of Object.keys(neutral) as (keyof typeof neutral)[]) {
    add(hex(neutral[name]), hex(palette.neutral[name]));
    // A translucent border is used as a reading-state wash in a few editor keys. Use the
    // light line wash for that form; the opaque border still maps to the functional edge.
    alphaColours.set(hex(neutral[name]), name === 'border' || name === 'hover'
      ? hex(palette.overlay.lineHighlight.color) : hex(palette.neutral[name]));
  }
  add(hex(dimText), hex(palette.dim));
  add(hex(comment), hex(palette.comment));
  for (const name of Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]) {
    add(hex(ACCENTS[name]), hex(palette.accents[name]));
    // Opaque accent roles stay saturated; translucent decorations need the light subtle
    // fill, otherwise a dark light-theme wash can lower syntax contrast on the page.
    alphaColours.set(hex(ACCENTS[name]), hex(palette.scales[name].subtle));
    const source = accentScale(name);
    const target = palette.scales[name];
    add(hex(source.subtle), hex(target.subtle));
    add(hex(source.border), hex(target.border));
    add(hex(source.solid), hex(target.solid));
  }
  for (const name of Object.keys(ansi) as (keyof typeof ansi)[]) {
    // ANSI white shares its dark emitted value with secondary text. Keep every terminal
    // slot key-specific so that a light role cannot be replaced by the last literal alias.
    keyColours.set(`terminal.ansi${name.charAt(0).toUpperCase()}${name.slice(1)}`, hex(palette.ansi[name]));
  }
  for (const name of Object.keys(diff) as (keyof typeof diff)[]) {
    add(hex(diff[name]), hex(palette.diff[name]));
  }
  for (const name of Object.keys(diffWash) as (keyof typeof diffWash)[]) {
    exact.set(hexAlpha(diffWash[name].color, diffWash[name].alpha),
      hexAlpha(palette.diffWash[name].color, palette.diffWash[name].alpha));
  }
  for (const name of Object.keys(overlay) as (keyof typeof overlay)[]) {
    exact.set(hexAlpha(overlay[name].color, overlay[name].alpha),
      hexAlpha(palette.overlay[name].color, palette.overlay[name].alpha));
  }
  // The general translucent-border substitution becomes a pale reading-state wash on
  // Light. A minimap slider carries no text, so keep it on the darker functional border
  // and use the opacity ladder authored for the main scrollbar.
  keyColours.set('minimapSlider.background', hexAlpha(palette.neutral.border, 0.28));
  keyColours.set('minimapSlider.hoverBackground', hexAlpha(palette.neutral.border, 0.42));
  keyColours.set('minimapSlider.activeBackground', hexAlpha(palette.neutral.border, 0.56));
  // Inline blame is persistent editor metadata, not incidental chrome. The dim role is
  // too quiet on Light, so promote it to secondary text without competing with primary.
  keyColours.set('git.blame.editorDecorationForeground', hex(palette.neutral.textSecondary));
  for (const name of Object.keys(findMatch) as (keyof typeof findMatch)[]) {
    add(hex(findMatch[name]), hex(palette.findMatch[name]));
  }
  add(hex(cursor), hex(palette.cursor));
  // The dark source deliberately shares blue subtle with the opaque terminal selection.
  // Preserve the role at the key boundary instead of allowing either literal to win.
  keyColours.set('terminal.selectionBackground', hex(palette.terminalSelection));
  keyColours.set('terminal.inactiveSelectionBackground', hexAlpha(palette.terminalSelection, 0.5));
  for (const [name, keys] of Object.entries(STATUS_KEYS) as [StatusName, typeof STATUS_KEYS[StatusName]][]) {
    const scale = palette.statuses[name];
    for (const key of keys.text) keyColours.set(key, hex(scale.text));
    for (const key of keys.subtle) keyColours.set(key, hex(scale.subtle));
    for (const key of keys.border) keyColours.set(key, hex(scale.border));
    for (const key of keys.solid) keyColours.set(key, hex(scale.solid));
    for (const key of keys.onSolid) keyColours.set(key, hex(scale.onSolid));
  }
  return { colours, alphaColours, exact, keyColours };
};

const substitute = (key: string, value: string, pairs: PalettePairs): string => {
  const byKey = pairs.keyColours.get(key);
  if (byKey !== undefined) return byKey;
  const exact = pairs.exact.get(value);
  if (exact !== undefined) return exact;
  const source = value.slice(0, 7);
  const colour = value.length === 9
    ? pairs.alphaColours.get(source) ?? pairs.colours.get(source) ?? source
    : pairs.colours.get(source) ?? source;
  return value.length === 9 ? `${colour}${value.slice(7)}` : colour;
};

export const buildColors = (palette: Palette): Record<string, string> => {
  const pairs = palettePairs(palette);
  return Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, substitute(key, value, pairs)]));
};
