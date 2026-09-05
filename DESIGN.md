# Aion — design specification

Aion is a dark theme and a colour system for editors, terminals and web interfaces.
The name comes from the Ancient Greek αἰών: an age, an epoch, a span of existence.

Every value in this document is produced by `packages/tokens` and verified by its test
suite. Do not edit a hex value by hand; change the OKLCH definition and regenerate.

---

## 1. Principles

1. **Colour is computed, not chosen.** Tokens are defined in OKLCH. Generators emit sRGB
   hex per target. This turns "vibrant but not neon" and "clear contrast" into numbers a
   build can enforce. It does not decide whether the result looks good: computation
   validates the constraints that were chosen, and only a rendered review settles balance.
2. **The contrast floor is a build step.** A token below the floor fails the build.
3. **One palette, every surface.** The editor, the terminal and the web layer read the
   same token module.
4. **Familiar syntax, distinct chrome.** Syntax follows the One Dark Pro role map, so
   muscle memory survives. Identity comes from the base, the gold chrome and the
   structure.

## 2. Identity

| | |
|---|---|
| Signature | Gold — §5 carries the value |
| Secondary | Teal — §5 carries the value |
| Base hue | 264° — the same hue as Ayu Dark, at higher lightness |
| Structure | Raised sidebar: the editor is the darkest surface |
| Violet | A syntax hue. Four interface keys carry it, listed in §6. |

## 3. Rules the build enforces

| Rule | Value |
|---|---|
| Text contrast floor | 4.5:1 against the surface the text sits on |
| Non-text floor | 3:1 for focus rings and UI borders |
| Chroma band, default | 0.09 – 0.15 |
| Chroma ceiling, gold and green | 0.17 |
| Chroma ceiling, blue and violet | 0.13 |
| Hue drift from One Dark Pro | ≤ ±15° |
| Meaning-pair lightness gap | ≥ 0.06 |
| Gamut | every colour inside sRGB |

**What the floor covers.** A syntax colour has to clear 4.5:1 on the editor, the peek
editor, a hover or suggest widget, and under a current-line highlight, a selection, a word
highlight, or any stack of the three. It has to clear it again with a diff line wash, or a
line wash and a word wash, painted on top of any of those. The gate composites each decoration the way the renderer composites it and
measures the result. Twenty-five states are covered and the worst reads 4.50:1. A state
that is not in that set is not covered by the claim, and `packages/tokens/src/states.ts`
is the list.

**Keys a dark theme must not set.** VS Code registers 47 colours with `light: null,
dark: null` and a value only for the high contrast themes. An outline round every match is
the point there and noise here: `editor.wordHighlightBorder` boxes every occurrence of the
word under the caret. Aion sets sixteen of them, all structural — one edge between two
regions, plus `input.border` and the terminal's current-match outline —
and `test/high-contrast-only.json` fails the build on a seventeenth.

**Documented exemptions.** Three, and only three.

- **Inactive line numbers** sit at 4.25:1. They are decorative; the active line number
  uses primary text. The exemption is dark only; the light ramp clears the floor.
- **Hairline and divider borders** separate regions that already read as separate, so no
  non-text floor applies. The edge of a control does not use them; it uses `border`,
  which clears 3:1 on the field inside it and on the chrome behind it.
- **ANSI slot 0** reads 1.31:1 as a foreground. SGR 30 does select it, so this is a
  limitation, not a claim that no application uses the slot for text. §10 gives the
  trade-off and what slot 0 does guarantee.

**How a ratio is measured.** Every ratio in this document reads the emitted 8-bit hex,
not the ideal OKLCH, because that hex is what a user sees. The two readings differ by up
to 0.06. A translucent decoration is composited as 8-bit bytes first, by
`compositeEmitted`, and measured afterwards. `npm run verify` prints the same numbers and
decides whether the build passes. `npm run sync:design` regenerates every generated table
from the token package, in this document and in both READMEs.

## 4. Neutral ramp — dark

Base hue 264°, base chroma 0.016. Twelve steps, Radix model. Ratios are against the
editor surface.

| Step | Role | Lightness | Hex | Ratio |
|---|---|---|---|---|
| 1 | editor | 0.195 | `#11151c` | — |
| 2 | terminal, panel | 0.207 | `#14181f` | 1.03 |
| 3 | sidebar, activity bar, status bar, tab bar | 0.220 | `#171b22` | 1.06 |
| 4 | widget, menu, hover card, notification | 0.250 | `#1e222a` | 1.15 |
| 5 | input, inactive tab | 0.285 | `#262a32` | 1.27 |
| 6 | hover state | 0.320 | `#2f333b` | 1.44 |
| 7 | hairline border | 0.375 | `#3d414a` | 1.79 |
| 8 | divider | 0.440 | `#4e535c` | 2.37 |
| 9 | UI border, focus edge | 0.560 | `#70757e` | 3.95 |
| 10 | muted text, line number | 0.580 | `#757a84` | 4.25 |
| 11 | secondary text | 0.745 | `#a7acb7` | 8.04 |
| 12 | primary text | 0.930 | `#e2e8f3` | 14.87 |

The editor is **darker** than the sidebar. Most dark themes do the reverse. This is
deliberate and it is the strongest structural signature Aion carries.

**Dim text sits outside the ramp.** Step 10 is a solid-hover step in the Radix model, not
a text step. The line number borrows it under the documented exemption. Dimmed UI text
cannot, because it also sits on the widget surface, where step 10 reads 3.70:1. Dim text
is therefore its own token at lightness 0.630, `#848993`, which clears 4.5:1 on all four
dark surfaces.

| Surface | editor | terminal | sidebar | widget |
|---|---|---|---|---|
| `#848993` | 5.21 | 5.07 | 4.92 | 4.54 |

## 5. Accents

Three values per accent: a subtle fill, a border, and a solid.

| Accent | Hue | Chroma | Solid | Border | Subtle | Ratio |
|---|---|---|---|---|---|---|
| coral | 22° | 0.134 | `#ed807e` | `#935553` | `#391716` | 6.96 |
| copper | 52° | 0.124 | `#ea955f` | `#8c5c3e` | `#361b08` | 7.81 |
| gold | 90° | 0.129 | `#e4c058` | `#7b672e` | `#2d2100` | 10.44 |
| green | 148° | 0.129 | `#7bce88` | `#47764e` | `#0e2a13` | 9.61 |
| teal | 192° | 0.104 | `#59cdc8` | `#367572` | `#002928` | 9.58 |
| blue | 255° | 0.114 | `#7db2f7` | `#4d6b91` | `#122339` | 8.35 |
| violet | 305° | 0.124 | `#bd96e9` | `#735d8d` | `#291c37` | 7.58 |

Primary text on any solid fill uses the editor colour `#11151c`.

## 6. Syntax

The One Dark Pro **role map**, with every hex re-derived inside the drift limit.

| Role | Accent | Hex | One Dark Pro hue | Aion hue | Drift | Ratio |
|---|---|---|---|---|---|---|
| variable, property, parameter | coral | `#ed807e` | 17.0° | 22° | +5.0° | 6.96 |
| number, constant | copper | `#ea955f` | 63.8° | 52° | −11.8° | 7.81 |
| type, class | gold | `#e4c058` | 82.3° | 90° | +7.7° | 10.44 |
| string | green | `#7bce88` | 133.0° | 148° | +15.0° | 9.61 |
| operator, escape | teal | `#59cdc8` | 206.3° | 192° | −14.3° | 9.58 |
| function, method | blue | `#7db2f7` | 245.3° | 255° | +9.7° | 8.35 |
| keyword | violet | `#bd96e9` | 318.2° | 305° | −13.2° | 7.58 |
| comment | — | `#98a0af` | — | 264° | — | **6.95** |
| punctuation | — | `#a7acb7` | — | 264° | — | 8.04 |

- **No italics.** Not on comments, not on keywords.
- **Bracket pairs** nest gold → teal → violet, then repeat.
- **Violet in the interface** reaches exactly four keys, and a test fails on a fifth:
  `editorBracketHighlight.foreground3` and `foreground6` for the cycle above,
  `symbolIcon.keywordForeground`, which mirrors the keyword colour, `charts.purple`,
  where an extension asks for the hue by name, and ANSI slot 13.
- **Cursor** is gold.
- **Semantic tokens are on**, mirroring the TextMate map. No extra distinctions.
- **Language overrides** for six languages only: Markdown, JSON, YAML, HTML, CSS,
  JSX/TSX. These are the six where a generic map looks wrong. Others follow user
  reports from the pre-release channel.

The comment is the load-bearing token: it is the dimmest thing a reader has to read, so
it sets the budget for every decoration that can sit under it. It stops one notch under
`variable`, the dimmest accent, at 6.95:1 against 6.96:1. Below that the comment alone
caps every decoration, and above it `variable` binds instead and the extra lightness buys
nothing. The diff fills are what the last step bought: at 6.15:1 the added word could
reach 1.07:1 against the editor, which no reader could see, and at 6.95:1 it reaches
1.21:1. Measured across the same
eight roles, against each theme's own editor background, on a plain editor line:

| Theme | Lowest ratio | Below 4.5:1 | Source |
|---|---|---|---|
| Aion | 6.95 | none | — |
| One Dark Pro | 3.73 | comment, variable | [One Dark Pro](https://github.com/Binaryify/OneDark-Pro/blob/main/themes/OneDark-Pro.json) @ `54c3280` |
| Ayu Mirage | 3.42 | comment | [Ayu Mirage](https://github.com/ayu-theme/vscode-ayu/blob/master/ayu-mirage.json) @ `444ef92` |
| Nord | 2.43 | comment, number | [Nord](https://github.com/nordtheme/visual-studio-code/blob/develop/themes/nord-color-theme.json) @ `8ead098` |
| Catppuccin Mocha | 5.81 | none | [Catppuccin Mocha](https://github.com/catppuccin/vscode/blob/main/packages/catppuccin-vsc/src/theme/tokens/index.ts) @ `befc9e6` |

Two of the four clear the floor on this test and two do not. The comparison covers eight
colours on one background; it says nothing about a theme's accessibility, its usability,
or how any of them behave under a selection or a diff fill, which none of them gate. The
values live in `packages/tokens/src/rivals.ts` with the revision each was read at, and
this table is generated from them.

Surface order, from the same definitions:

| Theme | Editor | Sidebar | Order |
|---|---|---|---|
| One Dark Pro | `#282c34` | `#21252b` | sidebar below editor |
| Ayu Mirage | `#242936` | `#1f2430` | sidebar below editor |
| Nord | `#2e3440` | `#2e3440` | one surface |
| Catppuccin Mocha | `#1e1e2e` | `#1e1e2e` | one surface |

## 7. Overlays

VS Code draws these over syntax, so they must be translucent.

| Token | Value | Alpha |
|---|---|---|
| selection | `#0153c963` | 39% |
| find match, other | `#57450c66` | 40% |
| word highlight | `#2f333b47` | 28% |
| current line | `#3d414a5c` | 36% |
| find match, current | `#463500` | solid |

The selection is tinted blue. It was neutral, on the reasoning that a neutral never
distorts a token's hue, but inside the comment's budget a neutral selection landed within
0.05 of the current line and the two read as one decoration. A hue separates them at a
luminance the comment can still afford. The three passive marks form a ladder against the
editor: word highlight 1.08, current line 1.19, selection 1.35.

That ladder measures one surface. A translucent overlay moves a surface by
`alpha x (overlay - surface)`, so the same wash that lifts the editor barely touches a
diff fill, which is already lighter and already coloured. The selection was a pale blue at
26%: it moved the editor by 0.093 in OKLab and a removed word by 0.049, and on a diff it
read as nothing. It is now a dark saturated blue at 39%, which replaces more of what sits
under it, so the shift is close to even across every surface it can land on:

| Surface | Was | Now |
|---|---|---|
| editor | 0.093 | 0.138 |
| hover widget | 0.076 | 0.117 |
| added line | 0.085 | 0.135 |
| added word | 0.072 | 0.124 |
| removed line | 0.061 | 0.134 |
| removed word | 0.049 | 0.146 |

The chroma is 0.195, above the 0.13 ceiling the blue accent keeps. That ceiling governs
text, and the selection is not text. The hue stops at 260. The sRGB gamut opens up towards
285 and the search wants to go there, because more chroma buys more separation from a red
fill, but a wash that close to violet flattens the violet keywords sitting on it.

A selection has to stay legible and it also has to leave the diff underneath legible.
Added and removed still separate by 0.118 under a selection, against 0.220 without one.

The search hit takes the signature gold, because a search hit deserves it and an ordinary
selection does not. It carries no foreground of its own, and that is forced. VS Code
registers `editor.findMatchForeground` as "Text color of the current search match" and
`editor.findMatchHighlightForeground` as "Foreground color of the other search matches",
then applies each to the other one's decoration in `findWidget.ts`:

```ts
collector.addRule(`.monaco-editor .findMatchInline { color: ${findMatchForeground}; }`);
collector.addRule(`.monaco-editor .currentFindMatchInline { color: ${findMatchHighlightForeground}; }`);
```

`.findMatchInline` is the other matches and `.currentFindMatchInline` is the current one.
A theme that sets both ships each foreground on the wrong fill. Aion did: it put near-white
text on solid gold at 1.42:1, and near-black text on a dark wash at 1.39:1. Both keys are
now unset, and both fills carry every syntax colour above the floor on their own.

The current match is opaque, `#463500`, which is what VS Code's own dark default is. An
opaque fill takes the whole budget however many decorations sit under it, and it reads
1.54:1 against the editor. The other matches keep an alpha byte, because their own
registration says the colour "must not be opaque so as not to hide underlying
decorations"; they are a dark amber at 40%, 0.094 from the editor, and a selection still
reads through them at half its plain-line shift.

A terminal selection is a different problem: Windows Terminal and the VS Code panel both
paint it opaque behind the glyphs, and what sits on it is an ANSI slot rather than a
syntax colour. `terminalSelection` is its own token for that reason. The neutral it used
before read 1.40:1 under ANSI red, and no step of the neutral ramp clears the floor for
all sixteen slots.

The current line reads 1.19:1 against the editor. It blends toward `hairline` at a low
alpha rather than toward a near surface at a high one: `sidebar` is one step off the
editor, so no alpha of it separates anything, and a high alpha of anything erases the
diff fill underneath.

What allows that strength is §3's rule about states the renderer produces. VS Code draws
the current-line background only while every selection is empty, in
`_shouldRenderInContent`. The gate used to measure the current line stacked under a
selection, which cannot render, and that phantom state held the fill at 1.05:1 for no
reader's benefit.

## 8. Diff and merge

| Token | Hex | Lightness |
|---|---|---|
| added, line wash | `#0168261f` | 12% |
| added, word wash | `#01682629` | 16% |
| removed, line wash | `#c92e3b29` | 16% |
| removed, word wash | `#c92e3b2b` | 17% |
| added, gutter strip | `#1d3721` | solid |
| added, change bar | `#7bce88` | solid |
| removed, gutter strip | `#490006` | solid |
| removed, change bar | `#ed807e` | solid |

A diff wash paints **over** the selection, not under it. VS Code registers
`DecorationsOverlay` after `SelectionsOverlay` in `view.ts`, and `ViewOverlayLine.renderLine`
concatenates every overlay into one line element in registration order, so the later one
paints last. An opaque diff fill therefore hides the selection on every changed line, which
is why VS Code's own dark theme ships these keys with an alpha byte. Aion shipped them
opaque and the selection disappeared on a diff.

So a diff marks three things, and only one of them is opaque:

| Marker | Added | Removed | Painted over | Gated against |
|---|---|---|---|---|
| gutter strip | 0.128 | 0.128 | the margin, alone | the line number, at 3:1 |
| word wash | 0.083 | 0.127 | the line wash | the comment, over a selection |
| line wash | 0.038 | 0.066 | the selection | the comment, over a selection |

Those figures are OKLab distance from the editor, not a contrast ratio, because a ratio
reads only luminance and a diff is mostly hue. The two washes are solved so that a
selection still reads at 60% of its plain-line shift through the strongest of them: 0.095
for added and 0.083 for removed, against 0.138 on an unwashed line.

The gutter strip is the loudest marker and the only opaque one. Nothing paints over the
margin, and the column carries the line number and no body text, so the strip answers to
3:1 against that alone.

**The colour-vision separation lives on the strips.** They hold a 0.060 lightness gap, at
`#1d3721` and `#490006`. The washes cannot: a green wash dark enough to open that gap
against a red one is invisible, and forcing it took the added word from 0.083 down to
0.038. Neither strip is at its own optimum as a result, and each gives up about a third of
the distance it could reach alone. That is a palette invariant, not evidence of
deuteranopia usability: no simulator and no user has checked it. The meaning does not rest
on colour at all — a changed line carries a `+` or a `-` glyph in the gutter.

`diffEditor.insertedTextBorder` stays transparent. It is a high contrast affordance that
boxes every line, since a whole inserted line is one changed range.

## 9. Status

Status colours reuse the accent hues, tuned separately for UI rather than for code.

| Status | Accent |
|---|---|
| success | green |
| warning | copper |
| error | coral |
| info | blue |

## 10. Terminal

Background `#11151c`, the editor value. The **bright eight are the syntax accents
exactly**, so the terminal and the editor are one palette. The normal eight are the same
hues at 0.06 lower lightness.

| # | Slot | Hex | Ratio | | # | Slot | Hex | Ratio |
|---|---|---|---|---|---|---|---|---|
| 0 | black | `#2a2e36` | exempt | | 8 | bright black | `#8b909a` | 5.71 |
| 1 | red | `#d86e6c` | 5.55 | | 9 | bright red | `#ed807e` | 6.96 |
| 2 | green | `#67ba75` | 7.72 | | 10 | bright green | `#7bce88` | 9.61 |
| 3 | yellow | `#d1ad43` | 8.51 | | 11 | bright yellow | `#e4c058` | 10.44 |
| 4 | blue | `#6b9fe2` | 6.69 | | 12 | bright blue | `#7db2f7` | 8.35 |
| 5 | magenta | `#aa84d5` | 6.07 | | 13 | bright magenta | `#bd96e9` | 7.58 |
| 6 | cyan | `#43b9b5` | 7.71 | | 14 | bright cyan | `#59cdc8` | 9.58 |
| 7 | white | `#a7acb7` | 8.04 | | 15 | bright white | `#e2e8f3` | 14.87 |

The table reads against the standalone background. A slot lands on two backgrounds: the
VS Code integrated terminal uses the panel surface `#14181f`, and the standalone Windows
Terminal uses `#11151c`. Every slot except 0 is gated on both, and the panel is the one
that binds. Slot 8 is raised until it clears the floor on the panel and under a selection
or a find-match wash as well, because a prompt puts the time and the git status in it and
a terminal has no foreground override key to fall back on.

**Slot 0 is an exemption because of a trade-off, not because of a rule.** `SGR 30` selects
it as a foreground, and on either background it reads about 1.3:1, so an application that
writes black text on the default background is not legible. Raising slot 0 far enough to
change that would take it past the point where `SGR 40` and reverse video still carry
text: at lightness 0.400 it still reads only 1.99:1 as a foreground while ANSI white on it
falls from 5.98:1 to 4.04:1, below the floor. Aion keeps it dark and guarantees the other
direction. `ANSI_BLACK_TEXT` names the pair the gate measures.

A terminal that applies a minimum-contrast correction changes these requested colours
before drawing them. The table describes what Aion asks for, not what every emulator
draws.

Windows Terminal ships two ways: a JSON fragment extension, and a `settings.json`
snippet in the README.

## 11. Light ramp — web only

The light theme is **tuned separately, not mirrored.** A mirrored ramp does not work:
the dark accents sit near lightness 0.80, which fails badly on a white page.

Two constraints fight each other on light. The floor pushes lightness down; sRGB cannot
hold the resulting chroma at that lightness. The generator walks chroma down until a
colour satisfies both.

**The reference surface is `raised`, not `page`.** An accent solved against the lightest
surface fails the moment it lands on a card or on its own subtle fill. Solving against
`raised` gives 4.5:1 there and about 5.15:1 on the page. Accent text on the `hover`
surface is outside this guarantee; hover rows use neutral text.

| Role | Hex | | Accent | Hex | Ratio |
|---|---|---|---|---|---|
| page | `#fafcfe` | | coral | `#c5353f` | 5.16 |
| surface | `#f2f5fb` | | copper | `#ac5200` | 5.16 |
| raised | `#eaedf2` | | gold | `#846800` | 5.15 |
| input | `#e2e5ea` | | green | `#007d2e` | 5.14 |
| hover | `#d8dbe0` | | teal | `#007876` | 5.17 |
| hairline | `#ced1d6` | | blue | `#1f6bc2` | 5.18 |
| divider | `#bec1c6` | | violet | `#8851bd` | 5.16 |
| border | `#8d8f94` | | | | |
| muted | `#727479` | | | | |
| secondary text | `#53555a` | | | | |
| primary text | `#191b1e` | | | | |

Light muted sits at lightness 0.560, lower than the dark ramp's tenth step, so the light
layer needs no muted exemption. Light border sits at 0.650, which clears the 3:1 non-text
floor against the page.

**Known consequence.** Light gold is `#846800`, which reads olive rather than gold. A
yellow hue cannot be both light and 4.5:1 against near-white. The light layer therefore
does not carry Aion's signature the way the dark layer does. Light ships in the CSS
layer only. There is no light VS Code theme in v1.

The neutral tint tapers toward white, because sRGB cannot hold chroma next to white.

## 12. Naming

Two layers.

- **Literal** — `aion.gold.solid`, `aion.neutral.7`. What the colour is.
- **Semantic** — `bg.editor`, `fg.dim`, `border.focus`, `status.error.solid`. What the
  colour is for. 71 dark aliases and 36 light ones.

Consumers use the semantic layer. Changing what "keyword" means is one line.

## 13. Scope of v1

**In.** Colour. VS Code (630 keys, 54 token rules, 32 semantic tokens), Windows Terminal,
a CSS layer with custom properties and a Tailwind v4 `@theme` block, and the lab site.

**Out.** Typography, spacing, radius, elevation and motion as shipped tokens. A light VS
Code theme. JetBrains and Neovim. Italic variants. More than six language overrides.

Type appears in this project only for the lab and the site: **Archivo** for display and
body, using its width axis for headlines, and **Monaspace Neon** for code.

## 14. Rejected, and why

| Rejected | Reason |
|---|---|
| Warm sepia base (hue 80) | Reads brown, not "warm grey" |
| Violet base tint | The user rejects violet in the UI |
| Untinted neutral base | Shows banding on OLED, and looks lifeless |
| Rose or gold keywords | The One Dark Pro role map keeps violet in syntax |
| A 3:1 comment exemption | Measurement showed the floor was reachable with headroom |
| Copying One Dark Pro hex values | Imports the contrast defect Aion exists to fix |
| Mirroring the dark ramp for light | Produces an unreadable light theme |
| Six bracket-pair colours | Competes with the syntax for attention |
