# Aion

A dark theme with a measured contrast floor. Familiar syntax, distinct chrome.

Syntax follows the One Dark Pro role map, so muscle memory survives. Identity comes from
the base, the gold chrome and the structure.

## Two things make Aion different

**The editor is the darkest surface.** The sidebar, the activity bar and the status bar
sit one step above it, and the panel sits between the two. Your code is the deepest thing
on the screen. Of the four themes compared below, two put the sidebar under the editor and
two use one colour for both.

**The contrast floor is a build step, not a claim.** Every colour is defined in OKLCH and
checked against the surface it sits on. A colour below 4.5:1 fails the build, and so does
a syntax colour that falls below it under a current line, a selection, a word highlight or
a diff fill. Those decorated states are the part no comparison below covers.

Measured across the same eight syntax roles, against each theme's own editor background,
on a plain editor line:

| Theme | Lowest ratio | Below 4.5:1 | Source |
|---|---|---|---|
| Aion | 6.95 | none | — |
| One Dark Pro | 3.73 | comment, variable | [One Dark Pro](https://github.com/Binaryify/OneDark-Pro/blob/main/themes/OneDark-Pro.json) @ `54c3280` |
| Ayu Mirage | 3.42 | comment | [Ayu Mirage](https://github.com/ayu-theme/vscode-ayu/blob/master/ayu-mirage.json) @ `444ef92` |
| Nord | 2.43 | comment, number | [Nord](https://github.com/nordtheme/visual-studio-code/blob/develop/themes/nord-color-theme.json) @ `8ead098` |
| Catppuccin Mocha | 5.81 | none | [Catppuccin Mocha](https://github.com/catppuccin/vscode/blob/main/packages/catppuccin-vsc/src/theme/tokens/index.ts) @ `befc9e6` |

This compares eight syntax roles on one background. It is not a measure of a theme's
accessibility or of its usability, and two of the four clear the floor on this test.
The values were read from each definition on 2026-09-05, at the revision named. A theme
changes: One Dark Pro's comment and Catppuccin's comment both moved between this table and
the one before it, which is why the revision is recorded.

## The palette

| | Hex | | | Hex |
|---|---|---|---|---|
| editor | `#11151c` | | coral, variables | `#ed807e` |
| panel, terminal | `#14181f` | | copper, numbers | `#ea955f` |
| sidebar, status bar | `#171b22` | | gold, types | `#e4c058` |
| widget, menu | `#1e222a` | | green, strings | `#7bce88` |
| primary text | `#e2e8f3` | | teal, operators | `#59cdc8` |
| secondary text | `#a7acb7` | | blue, functions | `#7db2f7` |
| comment | `#98a0af` | | violet, keywords | `#bd96e9` |

Gold is the signature: the cursor, the focus ring, the search hit and the active tab
marker. Violet is a syntax hue. It reaches four interface keys and no others: the two
bracket-cycle steps, the keyword symbol icon that mirrors the syntax colour, `charts.purple`
where an extension asks for the hue by name, and ANSI slot 13.

## What is inside

- 630 interface keys. VS Code still falls back to its own default for any key not set.
- 54 TextMate rules and 32 semantic tokens, kept in step with each other.
- Language overrides for Markdown, JSON, YAML, HTML, CSS and JSX/TSX.
- Bracket pairs that nest gold → teal → violet.
- A terminal whose bright eight are byte-identical to the syntax accents.
- **No italics.** Not on comments, not on keywords.

## Matching terminal

The same sixteen ANSI slots ship for Windows Terminal, as a fragment extension that needs
no settings edit. See the repository.

## What the contrast floor covers

Every syntax colour clears 4.5:1 on the editor, the peek editor, a hover or suggest
widget, and under a current-line highlight, a selection, a word highlight, and any stack
of the three. It clears it again with a diff line wash, or a line wash and a word wash,
painted on top of any of those. Twenty-five states are covered and the worst of them reads
4.50:1. A find match keeps the colour under it: VS Code applies each of its two foreground
override keys to the other one's decoration, so the fills carry every syntax colour on
their own.

Three exemptions are named rather than hidden:

- The inactive line number sits at 4.25:1. It is decorative.
- Hairline and divider borders sit below 3:1. They separate regions that already read as
  separate; the edges of controls do not use them.
- ANSI slot 0 reads 1.31:1 as a foreground. SGR 30 does select it, so that is a real
  limitation and not a claim that no application uses it. No dark scheme can fix it and
  keep slot 0 usable as a background, which is what SGR 40 and reverse video need. What
  slot 0 does guarantee is the other direction: ANSI white reads 5.98:1 on it and bright
  white 11.07:1.

## Colour vision

Success and error separate by 0.06 in OKLCH lightness as well as by hue, and so do the
diff fills; the added fill sits above the editor and the removed fill below it. A test
asserts that gap. That is a palette invariant, not a claim of deuteranopia usability: it
has not been checked with a simulator or with users. Diff lines and problem markers carry
a gutter glyph and an icon as well as a colour, so the meaning does not rest on hue alone.

## Licence

MIT.
