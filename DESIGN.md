# Aion — design specification

Aion is a dark theme and a colour system for editors, terminals and web interfaces.
The name comes from the Ancient Greek αἰών: an age, an epoch, a span of existence.

Every value in this document is produced by `packages/tokens` and verified by its test
suite. Do not edit a hex value by hand; change the OKLCH definition and regenerate.

---

## 1. Principles

1. **Colour is computed, not chosen.** Tokens are defined in OKLCH. Generators emit sRGB
   hex per target. This is what makes "vibrant but not neon" and "clear contrast"
   enforceable numbers rather than opinions.
2. **The contrast floor is a build step.** A token below the floor fails the build.
3. **One palette, every surface.** The editor, the terminal and the web layer read the
   same token module.
4. **Familiar syntax, distinct chrome.** Syntax follows the One Dark Pro role map, so
   muscle memory survives. Identity comes from the base, the gold chrome and the
   structure.

## 2. Identity

| | |
|---|---|
| Signature | Gold `#ebc75e` |
| Secondary | Teal `#5fd3cf` |
| Base hue | 264° — the same hue as Ayu Dark, at higher lightness |
| Structure | Raised sidebar: the editor is the darkest surface |
| Violet | A syntax hue only. It never appears in the UI. |

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

**Documented exemptions.** Two, and only two.

- **Inactive line numbers** sit at 4.27:1. They are decorative; the active line number
  uses primary text.
- **Hairline borders and ANSI slot 0** are non-text separators, so no text floor applies.

## 4. Neutral ramp — dark

Base hue 264°, base chroma 0.016. Twelve steps, Radix model. Ratios are against the
editor surface.

| Step | Role | Lightness | Hex | Ratio |
|---|---|---|---|---|
| 1 | editor | 0.195 | `#11151c` | — |
| 2 | terminal | 0.207 | `#14181f` | 1.03 |
| 3 | sidebar, activity bar, status bar, tab bar | 0.220 | `#171b22` | 1.06 |
| 4 | widget, menu, hover card, notification | 0.250 | `#1e222a` | 1.14 |
| 5 | input, inactive tab | 0.285 | `#262a32` | 1.27 |
| 6 | hover state | 0.320 | `#2f333b` | 1.44 |
| 7 | hairline border | 0.375 | `#3d414a` | 1.79 |
| 8 | divider | 0.440 | `#4e535c` | 2.35 |
| 9 | UI border, focus edge | 0.520 | `#646972` | 3.32 |
| 10 | muted text, line number | 0.580 | `#757a84` | 4.27 |
| 11 | secondary text | 0.745 | `#a7acb7` | 8.07 |
| 12 | primary text | 0.930 | `#e2e8f3` | 14.88 |

The editor is **darker** than the sidebar. Most dark themes do the reverse. This is
deliberate and it is the strongest structural signature Aion carries.

## 5. Accents

Three values per accent: a subtle fill, a border, and a solid.

| Accent | Hue | Chroma | Solid | Border | Subtle | Ratio |
|---|---|---|---|---|---|---|
| coral | 22° | 0.135 | `#f48684` | `#935553` | `#391716` | 7.48 |
| copper | 52° | 0.125 | `#f19b65` | `#8c5c3e` | `#361b08` | 8.37 |
| gold | 90° | 0.130 | `#ebc75e` | `#7b672d` | `#2d2100` | 11.18 |
| green | 148° | 0.130 | `#80d58d` | `#47764e` | `#0d2a13` | 10.27 |
| teal | 192° | 0.105 | `#5fd3cf` | `#367573` | `#002928` | 10.22 |
| blue | 255° | 0.115 | `#83b9fe` | `#4c6b92` | `#12233a` | 8.99 |
| violet | 305° | 0.125 | `#c49cf1` | `#735d8d` | `#291c37` | 8.16 |

Primary text on any solid fill uses the editor colour `#11151c`.

## 6. Syntax

The One Dark Pro **role map**, with every hex re-derived inside the drift limit.

| Role | Accent | Hex | One Dark Pro hue | Aion hue | Drift | Ratio |
|---|---|---|---|---|---|---|
| variable, property, parameter | coral | `#f48684` | 17.0° | 22° | +5.0° | 7.48 |
| number, constant | copper | `#f19b65` | 63.8° | 52° | −11.8° | 8.37 |
| type, class | gold | `#ebc75e` | 82.3° | 90° | +7.7° | 11.18 |
| string | green | `#80d58d` | 133.0° | 148° | +15.0° | 10.27 |
| operator, escape | teal | `#5fd3cf` | 206.3° | 192° | −14.3° | 10.22 |
| function, method | blue | `#83b9fe` | 245.3° | 255° | +9.7° | 8.99 |
| keyword | violet | `#c49cf1` | 318.2° | 305° | −13.2° | 8.16 |
| comment | — | `#79808f` | — | 264° | — | **4.63** |
| punctuation | — | `#a7acb7` | — | 264° | — | 8.07 |

- **No italics.** Not on comments, not on keywords.
- **Bracket pairs** nest gold → teal → violet, then repeat.
- **Cursor** is gold `#ebc75e`.
- **Semantic tokens are on**, mirroring the TextMate map. No extra distinctions.
- **Language overrides** for six languages only: Markdown, JSON, YAML, HTML, CSS,
  JSX/TSX. These are the six where a generic map looks wrong. Others follow user
  reports from the pre-release channel.

The comment is the load-bearing token. One Dark Pro reaches 2.32:1, Nord 2.43:1,
Catppuccin Mocha 3.36:1, Ayu Mirage 3.42:1. All four fail. Aion clears the floor.

## 7. Overlays

VS Code draws these over syntax, so they must be translucent.

| Token | Value | Alpha |
|---|---|---|
| selection | `#64697238` | 22% |
| find match | `#ebc75e4d` | 30% |
| find match, other | `#ebc75e29` | 16% |
| word highlight | `#2f333b8c` | 55% |
| current line | `#171b22a6` | 65% |

The selection is neutral, so it never distorts a token's hue. The search hit takes the
signature gold, because a search hit deserves it and an ordinary selection does not.

## 8. Diff and merge

| Token | Hex | Lightness |
|---|---|---|
| added, fill | `#19351e` | 0.300 |
| removed, fill | `#371112` | 0.240 |
| added, gutter | `#80d58d` | 0.800 |
| removed, gutter | `#f48684` | 0.740 |

The two fills separate by 0.060 in lightness. That gap is what keeps added and removed
distinguishable under deuteranopia, and it is asserted by the test suite.

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
| 0 | black | `#2a2e36` | exempt | | 8 | bright black | `#7b808a` | 4.63 |
| 1 | red | `#df7372` | 5.97 | | 9 | bright red | `#f48684` | 7.48 |
| 2 | green | `#6dc17b` | 8.34 | | 10 | bright green | `#80d58d` | 10.27 |
| 3 | yellow | `#d8b349` | 9.12 | | 11 | bright yellow | `#ebc75e` | 11.18 |
| 4 | blue | `#70a6ea` | 7.24 | | 12 | bright blue | `#83b9fe` | 8.99 |
| 5 | magenta | `#b189dd` | 6.54 | | 13 | bright magenta | `#c49cf1` | 8.16 |
| 6 | cyan | `#49c0bc` | 8.30 | | 14 | bright cyan | `#5fd3cf` | 10.22 |
| 7 | white | `#a7acb7` | 8.07 | | 15 | bright white | `#e2e8f3` | 14.88 |

Slot 8 is raised to 4.63:1 because prompts put timestamps and git status in it.

The VS Code integrated terminal uses the panel surface `#14181f`. The standalone Windows
Terminal uses `#11151c`. The two differ by one step.

Windows Terminal ships two ways: a JSON fragment extension, and a `settings.json`
snippet in the README.

## 11. Light ramp — web only

The light theme is **tuned separately, not mirrored.** A mirrored ramp does not work:
the dark accents sit near lightness 0.80, which fails badly on a white page.

Two constraints fight each other on light. The floor pushes lightness down; sRGB cannot
hold the resulting chroma at that lightness. The generator walks chroma down until a
colour satisfies both.

| Role | Hex | | Accent | Hex | Ratio |
|---|---|---|---|---|---|
| page | `#fafcfe` | | coral | `#d13f47` | 4.51 |
| surface | `#f2f5fb` | | copper | `#ba5900` | 4.50 |
| raised | `#eaedf2` | | gold | `#8f7100` | 4.50 |
| input | `#e2e5ea` | | green | `#008733` | 4.51 |
| hover | `#d8dbe0` | | teal | `#00827f` | 4.51 |
| hairline | `#ced1d6` | | blue | `#2975ce` | 4.51 |
| divider | `#bec1c6` | | violet | `#925ac9` | 4.51 |
| border | `#9c9ea4` | | | | |
| muted | `#7e8085` | | | | |
| secondary text | `#53555a` | | | | |
| primary text | `#191b1e` | | | | |

**Known consequence.** Light gold is `#8f7100`, which reads olive rather than gold. A
yellow hue cannot be both light and 4.5:1 against near-white. The light layer therefore
does not carry Aion's signature the way the dark layer does. Light ships in the CSS
layer only. There is no light VS Code theme in v1.

The neutral tint tapers toward white, because sRGB cannot hold chroma next to white.

## 12. Naming

Two layers.

- **Literal** — `aion.gold.solid`, `aion.neutral.7`. What the colour is.
- **Semantic** — about 45 aliases. `bg.editor`, `fg.muted`, `border.focus`,
  `status.error.fill`. What the colour is for.

Consumers use the semantic layer. Changing what "keyword" means is one line.

## 13. Scope of v1

**In.** Colour. VS Code (about 300 keys), Windows Terminal, a CSS layer with custom
properties and a Tailwind v4 `@theme` block, and the lab site.

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
