# Aion — design specification

Aion is a dark and light theme system for editors, terminals and web interfaces.
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
| Violet | A syntax hue. Five interface keys carry it, listed in §6. |

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

**What the floor covers.** A syntax colour has to clear 4.5:1 on every state in §3.1. The
gate composites the selected renderer registrations in their paint order and measures the
result. The editor set is one base (plain, current line, active or inactive selection)
times one diff state (none, added line with or without its word fill, or removed line with
or without its word fill), times every subset of word highlight, other find match and
selection highlight. It also checks each other text decoration alone over every
producible base and diff pair. The peek editor retains the legacy base, reading-highlight
and decoration stacks without diff fills; the new secondary contexts are not claimed
there. The hover widget and current find match have separate rows. The renderer excludes
the current line under a selection, opposing diff sides, a word fill without its line,
unchanged-region fill on changed lines, and Merge Editor change fills in Diff Editor
widgets. Coverage is the stated bound intersected with those renderer exclusions.
Other combinations the renderer permits,
including word highlight with hover highlight and a find range over a selected diff word,
are outside this named coverage set. The selected normal find-match registration has
z-index 10; VS Code's mode above 1,000 matches and whole-line diff word variants are
outside this ordering claim. `packages/tokens/test/render-order.json` records the pinned
source and variants. Alpha follows the emitted byte through VS Code’s parsed Color and
two-decimal CSS formatter; selection highlight also halves it. The existing visibility
invariants still measure raw emitted keys; selection highlight also clears the painted
visibility floor through the shared CSS-alpha compositor. These are calculations, not
native editor acceptance.
`LIGHT_SHIPPED` runs the same layer set for Aion Light, and light
ANSI slots are measured separately on the light panel and its terminal selection.

| What the gate checks | Count |
|---|---:|
| Rows measured | 12633 |
| Below their floor | 0 |
| Exempt rows, all documented | 5 |
| Reading states per syntax colour | 559 |
| Lowest ratio in a reading state | 4.50:1 |
| Interface keys the theme sets | 623 |
| TextMate rules | 64 |
| Semantic tokens | 32 |

**Keys a dark theme must not set.** VS Code registers 47 colours with `light: null,
dark: null` and a value only for the high contrast themes. An outline round every match is
the point there and noise here: `editor.wordHighlightBorder` boxes every occurrence of the
word under the caret. Aion sets only structural ones — one edge between two regions, plus
`input.border`, the terminal's current-match outline and the unused-code underline — and
`test/high-contrast-only.json` fails the build on any other.

**Documented exemptions.** Three kinds, and only three.

- **Inactive line numbers** sit at 4.25:1. They are decorative; the active line number
  uses primary text. The exemption is dark only; the light ramp clears the floor.
- **Hairline and divider borders** separate regions that already read as separate, so no
  non-text floor applies. The edge of a control does not use them; it uses `border`,
  which clears 3:1 on the field inside it and on the chrome behind it.
- **ANSI slot 0** reads 1.17:1 as a foreground on the panel. SGR 30 does select it, so this is a
  limitation, not a claim that no application uses the slot for text. §10 gives the
  trade-off and what slot 0 does guarantee.

### 3.1 The states the floor covers

Every background a syntax colour is guaranteed on, composited the way the renderer
composites it, with the foreground that reads worst on each. Generated from
`readingStates()`.

| State | Background | Worst foreground | Ratio |
|---|---|---|---:|
| editor | `#11151c` | comment | 6.95 |
| editor + wordHighlight | `#0b1f5c` | comment | 5.85 |
| editor + findMatchOther | `#282412` | comment | 5.91 |
| editor + wordHighlight + findMatchOther | `#242a39` | comment | 5.45 |
| editor + selectionHighlight | `#091b59` | comment | 6.08 |
| editor + selectionHighlight + wordHighlight | `#06227e` | comment | 5.19 |
| editor + selectionHighlight + findMatchOther | `#232837` | comment | 5.58 |
| editor + selectionHighlight + wordHighlight + findMatchOther | `#212c4d` | comment | 5.21 |
| editor + findRange | `#091a57` | comment | 6.15 |
| editor + rangeHighlight | `#091c59` | comment | 6.04 |
| editor + fold | `#091a57` | comment | 6.15 |
| editor + hover | `#0e243f` | comment | 5.94 |
| editor + symbol | `#272211` | comment | 6.03 |
| editor + strongWord | `#202529` | comment | 5.88 |
| editor + stackFrame | `#1f1c10` | comment | 6.48 |
| editor + focusedStackFrame | `#092216` | comment | 6.38 |
| editor + bracketMatch | `#241f10` | comment | 6.24 |
| editor + commentRange | `#272211` | comment | 6.03 |
| editor + activeCommentRange | `#272211` | comment | 6.03 |
| editor + mergeCurrentHeader | `#092216` | comment | 6.38 |
| editor + mergeIncomingHeader | `#09203d` | comment | 6.21 |
| editor + mergeCommonHeader | `#091a57` | comment | 6.15 |
| editor + mergeChange | `#0e2e1d` | comment | 5.59 |
| editor + mergeChangeWord | `#0e2e1d` | comment | 5.59 |
| editor + searchMatch | `#272211` | comment | 6.03 |
| editor + covered | `#092918` | comment | 5.95 |
| editor + uncovered | `#400c1a` | comment | 6.21 |
| editor + unchangedCode | `#191d25` | comment | 6.42 |
| editor + addedLine | `#0e1f1d` | comment | 6.48 |
| editor + addedLine + wordHighlight | `#09255c` | comment | 5.58 |
| editor + addedLine + findMatchOther | `#262a13` | comment | 5.61 |
| editor + addedLine + wordHighlight + findMatchOther | `#232e39` | comment | 5.25 |
| editor + addedLine + selectionHighlight | `#07205a` | comment | 5.86 |
| editor + addedLine + selectionHighlight + wordHighlight | `#05257e` | comment | 5.08 |
| editor + addedLine + selectionHighlight + findMatchOther | `#222b38` | comment | 5.43 |
| editor + addedLine + selectionHighlight + wordHighlight + findMatchOther | `#212e4d` | comment | 5.11 |
| editor + findRange + addedLine | `#072351` | comment | 5.83 |
| editor + addedLine + rangeHighlight | `#072259` | comment | 5.78 |
| editor + fold + addedLine | `#072351` | comment | 5.83 |
| editor + addedLine + hover | `#0c2a3f` | comment | 5.63 |
| editor + addedLine + symbol | `#252812` | comment | 5.74 |
| editor + addedLine + strongWord | `#1e2b29` | comment | 5.57 |
| editor + stackFrame + addedLine | `#1b2513` | comment | 6.04 |
| editor + focusedStackFrame + addedLine | `#072a18` | comment | 5.90 |
| editor + addedLine + bracketMatch | `#222511` | comment | 5.95 |
| editor + addedLine + commentRange | `#252812` | comment | 5.74 |
| editor + addedLine + activeCommentRange | `#252812` | comment | 5.74 |
| editor + mergeCurrentHeader + addedLine | `#072a18` | comment | 5.90 |
| editor + mergeIncomingHeader + addedLine | `#07293a` | comment | 5.75 |
| editor + mergeCommonHeader + addedLine | `#072351` | comment | 5.83 |
| editor + addedLine + searchMatch | `#252812` | comment | 5.74 |
| editor + addedLine + covered | `#072f18` | comment | 5.59 |
| editor + addedLine + uncovered | `#3e121b` | comment | 6.11 |
| editor + addedLine + addedWord | `#0b2b1e` | comment | 5.79 |
| editor + addedLine + addedWord + wordHighlight | `#082b5d` | comment | 5.27 |
| editor + addedLine + addedWord + findMatchOther | `#243114` | comment | 5.24 |
| editor + addedLine + addedWord + wordHighlight + findMatchOther | `#223139` | comment | 5.10 |
| editor + addedLine + addedWord + selectionHighlight | `#05265a` | comment | 5.58 |
| editor + addedLine + addedWord + selectionHighlight + wordHighlight | `#04287e` | comment | 4.96 |
| editor + addedLine + addedWord + selectionHighlight + findMatchOther | `#212e38` | comment | 5.28 |
| editor + addedLine + addedWord + selectionHighlight + wordHighlight + findMatchOther | `#20304d` | comment | 5.02 |
| editor + findRange + addedLine + addedWord | `#052e4a` | comment | 5.34 |
| editor + addedLine + rangeHighlight + addedWord | `#052d50` | comment | 5.33 |
| editor + fold + addedLine + addedWord | `#052e4a` | comment | 5.34 |
| editor + addedLine + addedWord + hover | `#0b3040` | comment | 5.28 |
| editor + addedLine + addedWord + symbol | `#232f13` | comment | 5.37 |
| editor + addedLine + addedWord + strongWord | `#1d312a` | comment | 5.23 |
| editor + stackFrame + addedLine + addedWord | `#163015` | comment | 5.44 |
| editor + focusedStackFrame + addedLine + addedWord | `#05341a` | comment | 5.28 |
| editor + addedLine + bracketMatch + addedWord | `#1c3014` | comment | 5.39 |
| editor + addedLine + addedWord + commentRange | `#232f13` | comment | 5.37 |
| editor + addedLine + addedWord + activeCommentRange | `#232f13` | comment | 5.37 |
| editor + mergeCurrentHeader + addedLine + addedWord | `#05341a` | comment | 5.28 |
| editor + mergeIncomingHeader + addedLine + addedWord | `#053336` | comment | 5.21 |
| editor + mergeCommonHeader + addedLine + addedWord | `#052e4a` | comment | 5.34 |
| editor + addedLine + addedWord + searchMatch | `#232f13` | comment | 5.37 |
| editor + addedLine + addedWord + covered | `#063519` | comment | 5.21 |
| editor + addedLine + addedWord + uncovered | `#3c191c` | comment | 5.92 |
| editor + removedLine | `#2e1820` | comment | 6.30 |
| editor + removedLine + wordHighlight | `#1b215e` | comment | 5.60 |
| editor + removedLine + findMatchOther | `#392615` | comment | 5.46 |
| editor + removedLine + wordHighlight + findMatchOther | `#2e2b3a` | comment | 5.24 |
| editor + removedLine + selectionHighlight | `#181c5c` | comment | 5.87 |
| editor + removedLine + selectionHighlight + wordHighlight | `#0f237f` | comment | 5.09 |
| editor + removedLine + selectionHighlight + findMatchOther | `#2c2839` | comment | 5.43 |
| editor + removedLine + selectionHighlight + wordHighlight + findMatchOther | `#272d4e` | comment | 5.08 |
| editor + findRange + removedLine | `#271c52` | comment | 5.81 |
| editor + removedLine + rangeHighlight | `#191e5b` | comment | 5.79 |
| editor + fold + removedLine | `#271c52` | comment | 5.81 |
| editor + removedLine + hover | `#1e2641` | comment | 5.67 |
| editor + removedLine + symbol | `#382414` | comment | 5.58 |
| editor + removedLine + strongWord | `#30272b` | comment | 5.50 |
| editor + stackFrame + removedLine | `#3a1e16` | comment | 5.80 |
| editor + focusedStackFrame + removedLine | `#27231b` | comment | 5.95 |
| editor + removedLine + bracketMatch | `#352113` | comment | 5.79 |
| editor + removedLine + commentRange | `#382414` | comment | 5.58 |
| editor + removedLine + activeCommentRange | `#382414` | comment | 5.58 |
| editor + mergeCurrentHeader + removedLine | `#27231b` | comment | 5.95 |
| editor + mergeIncomingHeader + removedLine | `#27213c` | comment | 5.83 |
| editor + mergeCommonHeader + removedLine | `#271c52` | comment | 5.81 |
| editor + removedLine + searchMatch | `#382414` | comment | 5.58 |
| editor + removedLine + covered | `#192b1a` | comment | 5.69 |
| editor + removedLine + uncovered | `#510e1d` | comment | 5.58 |
| editor + removedLine + removedWord | `#481b24` | comment | 5.48 |
| editor + removedLine + removedWord + wordHighlight | `#292260` | comment | 5.35 |
| editor + removedLine + removedWord + findMatchOther | `#492817` | comment | 4.99 |
| editor + removedLine + removedWord + wordHighlight + findMatchOther | `#362c3b` | comment | 5.05 |
| editor + removedLine + removedWord + selectionHighlight | `#261e5e` | comment | 5.58 |
| editor + removedLine + removedWord + selectionHighlight + wordHighlight | `#162480` | comment | 4.99 |
| editor + removedLine + removedWord + selectionHighlight + findMatchOther | `#342a3a` | comment | 5.19 |
| editor + removedLine + removedWord + selectionHighlight + wordHighlight + findMatchOther | `#2b2d4f` | comment | 5.02 |
| editor + findRange + removedLine + removedWord | `#421f4e` | comment | 5.19 |
| editor + removedLine + rangeHighlight + removedWord | `#362055` | comment | 5.34 |
| editor + fold + removedLine + removedWord | `#421f4e` | comment | 5.19 |
| editor + removedLine + removedWord + hover | `#2c2743` | comment | 5.40 |
| editor + removedLine + removedWord + symbol | `#482616` | comment | 5.10 |
| editor + removedLine + removedWord + strongWord | `#3e282d` | comment | 5.16 |
| editor + stackFrame + removedLine + removedWord | `#52201c` | comment | 5.05 |
| editor + focusedStackFrame + removedLine + removedWord | `#422520` | comment | 5.26 |
| editor + removedLine + bracketMatch + removedWord | `#4e2319` | comment | 5.06 |
| editor + removedLine + removedWord + commentRange | `#482616` | comment | 5.10 |
| editor + removedLine + removedWord + activeCommentRange | `#482616` | comment | 5.10 |
| editor + mergeCurrentHeader + removedLine + removedWord | `#422520` | comment | 5.26 |
| editor + mergeIncomingHeader + removedLine + removedWord | `#42233b` | comment | 5.20 |
| editor + mergeCommonHeader + removedLine + removedWord | `#421f4e` | comment | 5.19 |
| editor + removedLine + removedWord + searchMatch | `#482616` | comment | 5.10 |
| editor + removedLine + removedWord + covered | `#272c1c` | comment | 5.46 |
| editor + removedLine + removedWord + uncovered | `#61101f` | comment | 4.98 |
| editor + lineHighlight | `#20242c` | comment | 5.91 |
| editor + lineHighlight + wordHighlight | `#132765` | comment | 5.30 |
| editor + lineHighlight + findMatchOther | `#312d1c` | comment | 5.24 |
| editor + lineHighlight + wordHighlight + findMatchOther | `#292f3e` | comment | 5.08 |
| editor + lineHighlight + selectionHighlight | `#112362` | comment | 5.54 |
| editor + lineHighlight + selectionHighlight + wordHighlight | `#0b2782` | comment | 4.91 |
| editor + lineHighlight + selectionHighlight + findMatchOther | `#282d3c` | comment | 5.21 |
| editor + lineHighlight + selectionHighlight + wordHighlight + findMatchOther | `#242f50` | comment | 5.00 |
| editor + lineHighlight + findRange | `#112260` | comment | 5.62 |
| editor + lineHighlight + rangeHighlight | `#112462` | comment | 5.50 |
| editor + lineHighlight + fold | `#112260` | comment | 5.62 |
| editor + lineHighlight + hover | `#162c48` | comment | 5.36 |
| editor + lineHighlight + symbol | `#302b1b` | comment | 5.37 |
| editor + lineHighlight + strongWord | `#282d32` | comment | 5.28 |
| editor + lineHighlight + stackFrame | `#28251a` | comment | 5.83 |
| editor + lineHighlight + focusedStackFrame | `#112a1f` | comment | 5.81 |
| editor + lineHighlight + bracketMatch | `#2d281a` | comment | 5.58 |
| editor + lineHighlight + commentRange | `#302b1b` | comment | 5.37 |
| editor + lineHighlight + activeCommentRange | `#302b1b` | comment | 5.37 |
| editor + lineHighlight + mergeCurrentHeader | `#112a1f` | comment | 5.81 |
| editor + lineHighlight + mergeIncomingHeader | `#112846` | comment | 5.64 |
| editor + lineHighlight + mergeCommonHeader | `#112260` | comment | 5.62 |
| editor + lineHighlight + mergeChange | `#163626` | comment | 5.02 |
| editor + lineHighlight + mergeChangeWord | `#163626` | comment | 5.02 |
| editor + lineHighlight + searchMatch | `#302b1b` | comment | 5.37 |
| editor + lineHighlight + covered | `#113121` | comment | 5.37 |
| editor + lineHighlight + uncovered | `#491524` | comment | 5.64 |
| editor + lineHighlight + unchangedCode | `#242830` | comment | 5.62 |
| editor + lineHighlight + addedLine | `#1c2c2b` | comment | 5.53 |
| editor + lineHighlight + addedLine + wordHighlight | `#112c64` | comment | 5.09 |
| editor + lineHighlight + addedLine + findMatchOther | `#2e321b` | comment | 5.03 |
| editor + lineHighlight + addedLine + wordHighlight + findMatchOther | `#28323e` | comment | 4.94 |
| editor + lineHighlight + addedLine + selectionHighlight | `#0e2761` | comment | 5.39 |
| editor + lineHighlight + addedLine + selectionHighlight + wordHighlight | `#092982` | comment | 4.83 |
| editor + lineHighlight + addedLine + selectionHighlight + findMatchOther | `#262f3c` | comment | 5.14 |
| editor + lineHighlight + addedLine + selectionHighlight + wordHighlight + findMatchOther | `#233050` | comment | 4.96 |
| editor + lineHighlight + findRange + addedLine | `#0e2a59` | comment | 5.34 |
| editor + lineHighlight + addedLine + rangeHighlight | `#0f2961` | comment | 5.29 |
| editor + lineHighlight + fold + addedLine | `#0e2a59` | comment | 5.34 |
| editor + lineHighlight + addedLine + hover | `#143147` | comment | 5.12 |
| editor + lineHighlight + addedLine + symbol | `#2d301a` | comment | 5.15 |
| editor + lineHighlight + addedLine + strongWord | `#263231` | comment | 5.04 |
| editor + lineHighlight + stackFrame + addedLine | `#232d1b` | comment | 5.46 |
| editor + lineHighlight + focusedStackFrame + addedLine | `#0e3120` | comment | 5.40 |
| editor + lineHighlight + addedLine + bracketMatch | `#2a2d19` | comment | 5.37 |
| editor + lineHighlight + addedLine + commentRange | `#2d301a` | comment | 5.15 |
| editor + lineHighlight + addedLine + activeCommentRange | `#2d301a` | comment | 5.15 |
| editor + lineHighlight + mergeCurrentHeader + addedLine | `#0e3120` | comment | 5.40 |
| editor + lineHighlight + mergeIncomingHeader + addedLine | `#0e3042` | comment | 5.25 |
| editor + lineHighlight + mergeCommonHeader + addedLine | `#0e2a59` | comment | 5.34 |
| editor + lineHighlight + addedLine + searchMatch | `#2d301a` | comment | 5.15 |
| editor + lineHighlight + addedLine + covered | `#0f3620` | comment | 5.09 |
| editor + lineHighlight + addedLine + uncovered | `#461a23` | comment | 5.57 |
| editor + lineHighlight + addedLine + addedWord | `#17352a` | comment | 5.06 |
| editor + lineHighlight + addedLine + addedWord + wordHighlight | `#0e3164` | comment | 4.86 |
| editor + lineHighlight + addedLine + addedWord + findMatchOther | `#2b371b` | comment | 4.79 |
| editor + lineHighlight + addedLine + addedWord + wordHighlight + findMatchOther | `#26353e` | comment | 4.81 |
| editor + lineHighlight + addedLine + addedWord + selectionHighlight | `#0c2c61` | comment | 5.15 |
| editor + lineHighlight + addedLine + addedWord + selectionHighlight + wordHighlight | `#082c82` | comment | 4.72 |
| editor + lineHighlight + addedLine + addedWord + selectionHighlight + findMatchOther | `#25323c` | comment | 4.99 |
| editor + lineHighlight + addedLine + addedWord + selectionHighlight + wordHighlight + findMatchOther | `#223250` | comment | 4.87 |
| editor + lineHighlight + findRange + addedLine + addedWord | `#0b3450` | comment | 4.92 |
| editor + lineHighlight + addedLine + rangeHighlight + addedWord | `#0c3357` | comment | 4.91 |
| editor + lineHighlight + fold + addedLine + addedWord | `#0b3450` | comment | 4.92 |
| editor + lineHighlight + addedLine + addedWord + hover | `#113647` | comment | 4.86 |
| editor + lineHighlight + addedLine + addedWord + symbol | `#2a351a` | comment | 4.92 |
| editor + lineHighlight + addedLine + addedWord + strongWord | `#233731` | comment | 4.80 |
| editor + lineHighlight + stackFrame + addedLine + addedWord | `#1d361c` | comment | 5.00 |
| editor + lineHighlight + focusedStackFrame + addedLine + addedWord | `#0b3a20` | comment | 4.87 |
| editor + lineHighlight + addedLine + bracketMatch + addedWord | `#23361a` | comment | 4.95 |
| editor + lineHighlight + addedLine + addedWord + commentRange | `#2a351a` | comment | 4.92 |
| editor + lineHighlight + addedLine + addedWord + activeCommentRange | `#2a351a` | comment | 4.92 |
| editor + lineHighlight + mergeCurrentHeader + addedLine + addedWord | `#0b3a20` | comment | 4.87 |
| editor + lineHighlight + mergeIncomingHeader + addedLine + addedWord | `#0b393d` | comment | 4.79 |
| editor + lineHighlight + mergeCommonHeader + addedLine + addedWord | `#0b3450` | comment | 4.92 |
| editor + lineHighlight + addedLine + addedWord + searchMatch | `#2a351a` | comment | 4.92 |
| editor + lineHighlight + addedLine + addedWord + covered | `#0c3b20` | comment | 4.80 |
| editor + lineHighlight + addedLine + addedWord + uncovered | `#431f23` | comment | 5.47 |
| editor + lineHighlight + removedLine | `#3a252d` | comment | 5.38 |
| editor + lineHighlight + removedLine + wordHighlight | `#212865` | comment | 5.13 |
| editor + lineHighlight + removedLine + findMatchOther | `#402e1d` | comment | 4.91 |
| editor + lineHighlight + removedLine + wordHighlight + findMatchOther | `#31303e` | comment | 4.92 |
| editor + lineHighlight + removedLine + selectionHighlight | `#1e2362` | comment | 5.42 |
| editor + lineHighlight + removedLine + selectionHighlight + wordHighlight | `#122782` | comment | 4.87 |
| editor + lineHighlight + removedLine + selectionHighlight + findMatchOther | `#302d3c` | comment | 5.10 |
| editor + lineHighlight + removedLine + selectionHighlight + wordHighlight + findMatchOther | `#282f50` | comment | 4.95 |
| editor + lineHighlight + findRange + removedLine | `#2e2359` | comment | 5.32 |
| editor + lineHighlight + removedLine + rangeHighlight | `#1f2562` | comment | 5.32 |
| editor + lineHighlight + fold + removedLine | `#2e2359` | comment | 5.32 |
| editor + lineHighlight + removedLine + hover | `#242d48` | comment | 5.17 |
| editor + lineHighlight + removedLine + symbol | `#3f2c1c` | comment | 5.03 |
| editor + lineHighlight + removedLine + strongWord | `#362e32` | comment | 5.01 |
| editor + lineHighlight + stackFrame + removedLine | `#41261e` | comment | 5.25 |
| editor + lineHighlight + focusedStackFrame + removedLine | `#2e2a23` | comment | 5.42 |
| editor + lineHighlight + removedLine + bracketMatch | `#3c291b` | comment | 5.23 |
| editor + lineHighlight + removedLine + commentRange | `#3f2c1c` | comment | 5.03 |
| editor + lineHighlight + removedLine + activeCommentRange | `#3f2c1c` | comment | 5.03 |
| editor + lineHighlight + mergeCurrentHeader + removedLine | `#2e2a23` | comment | 5.42 |
| editor + lineHighlight + mergeIncomingHeader + removedLine | `#2e2843` | comment | 5.32 |
| editor + lineHighlight + mergeCommonHeader + removedLine | `#2e2359` | comment | 5.32 |
| editor + lineHighlight + removedLine + searchMatch | `#3f2c1c` | comment | 5.03 |
| editor + lineHighlight + removedLine + covered | `#1f3221` | comment | 5.20 |
| editor + lineHighlight + removedLine + uncovered | `#581625` | comment | 5.13 |
| editor + lineHighlight + removedLine + removedWord | `#52262f` | comment | 4.76 |
| editor + lineHighlight + removedLine + removedWord + wordHighlight | `#2f2866` | comment | 4.94 |
| editor + lineHighlight + removedLine + removedWord + findMatchOther | `#4f2e1e` | comment | 4.58 |
| editor + lineHighlight + removedLine + removedWord + wordHighlight + findMatchOther | `#3a303f` | comment | 4.77 |
| editor + lineHighlight + removedLine + removedWord + selectionHighlight | `#2b2463` | comment | 5.20 |
| editor + lineHighlight + removedLine + removedWord + selectionHighlight + wordHighlight | `#192783` | comment | 4.81 |
| editor + lineHighlight + removedLine + removedWord + selectionHighlight + findMatchOther | `#372d3d` | comment | 4.97 |
| editor + lineHighlight + removedLine + removedWord + selectionHighlight + wordHighlight + findMatchOther | `#2d2f50` | comment | 4.89 |
| editor + lineHighlight + findRange + removedLine + removedWord | `#482554` | comment | 4.79 |
| editor + lineHighlight + removedLine + rangeHighlight + removedWord | `#3b265b` | comment | 4.94 |
| editor + lineHighlight + fold + removedLine + removedWord | `#482554` | comment | 4.79 |
| editor + lineHighlight + removedLine + removedWord + hover | `#322d49` | comment | 4.97 |
| editor + lineHighlight + removedLine + removedWord + symbol | `#4e2c1d` | comment | 4.69 |
| editor + lineHighlight + removedLine + removedWord + strongWord | `#442e33` | comment | 4.74 |
| editor + lineHighlight + stackFrame + removedLine + removedWord | `#582722` | comment | 4.62 |
| editor + lineHighlight + focusedStackFrame + removedLine + removedWord | `#482a27` | comment | 4.88 |
| editor + lineHighlight + removedLine + bracketMatch + removedWord | `#532a20` | comment | 4.64 |
| editor + lineHighlight + removedLine + removedWord + commentRange | `#4e2c1d` | comment | 4.69 |
| editor + lineHighlight + removedLine + removedWord + activeCommentRange | `#4e2c1d` | comment | 4.69 |
| editor + lineHighlight + mergeCurrentHeader + removedLine + removedWord | `#482a27` | comment | 4.88 |
| editor + lineHighlight + mergeIncomingHeader + removedLine + removedWord | `#482941` | comment | 4.78 |
| editor + lineHighlight + mergeCommonHeader + removedLine + removedWord | `#482554` | comment | 4.79 |
| editor + lineHighlight + removedLine + removedWord + searchMatch | `#4e2c1d` | comment | 4.69 |
| editor + lineHighlight + removedLine + removedWord + covered | `#2d3222` | comment | 5.02 |
| editor + lineHighlight + removedLine + removedWord + uncovered | `#671626` | comment | 4.64 |
| editor + selection | `#0a2c5f` | comment | 5.19 |
| editor + selection + wordHighlight | `#072c81` | comment | 4.73 |
| editor + selection + findMatchOther | `#24323b` | comment | 5.01 |
| editor + selection + wordHighlight + findMatchOther | `#22324f` | comment | 4.88 |
| editor + selection + selectionHighlight | `#05277d` | comment | 5.01 |
| editor + selection + selectionHighlight + wordHighlight | `#042991` | comment | 4.61 |
| editor + selection + selectionHighlight + findMatchOther | `#212f4d` | comment | 5.06 |
| editor + selection + selectionHighlight + wordHighlight + findMatchOther | `#203059` | comment | 4.90 |
| editor + selection + findRange | `#05277c` | comment | 5.03 |
| editor + selection + rangeHighlight | `#05297e` | comment | 4.91 |
| editor + selection + fold | `#05277c` | comment | 5.03 |
| editor + selection + hover | `#0a3164` | comment | 4.88 |
| editor + selection + symbol | `#23303a` | comment | 5.13 |
| editor + selection + strongWord | `#1c324e` | comment | 4.94 |
| editor + selection + stackFrame | `#1b2a39` | comment | 5.56 |
| editor + selection + focusedStackFrame | `#052f3b` | comment | 5.41 |
| editor + selection + bracketMatch | `#202d39` | comment | 5.34 |
| editor + selection + commentRange | `#23303a` | comment | 5.13 |
| editor + selection + activeCommentRange | `#23303a` | comment | 5.13 |
| editor + selection + mergeCurrentHeader | `#052f3b` | comment | 5.41 |
| editor + selection + mergeIncomingHeader | `#052d62` | comment | 5.12 |
| editor + selection + mergeCommonHeader | `#05277c` | comment | 5.03 |
| editor + selection + mergeChange | `#0a3b42` | comment | 4.65 |
| editor + selection + mergeChangeWord | `#0a3b42` | comment | 4.65 |
| editor + selection + searchMatch | `#23303a` | comment | 5.13 |
| editor + selection + covered | `#05363d` | comment | 4.98 |
| editor + selection + uncovered | `#3c1a43` | comment | 5.62 |
| editor + selection + unchangedCode | `#142d54` | comment | 5.21 |
| editor + selection + addedLine | `#083358` | comment | 4.91 |
| editor + selection + addedLine + wordHighlight | `#06307d` | comment | 4.62 |
| editor + selection + addedLine + findMatchOther | `#223636` | comment | 4.84 |
| editor + selection + addedLine + wordHighlight + findMatchOther | `#21344d` | comment | 4.80 |
| editor + selection + addedLine + selectionHighlight | `#042b79` | comment | 4.91 |
| editor + selection + addedLine + selectionHighlight + wordHighlight | `#042b8f` | comment | 4.57 |
| editor + selection + addedLine + selectionHighlight + findMatchOther | `#20314a` | comment | 4.99 |
| editor + selection + addedLine + selectionHighlight + wordHighlight + findMatchOther | `#203158` | comment | 4.86 |
| editor + selection + findRange + addedLine | `#042f71` | comment | 4.84 |
| editor + selection + addedLine + rangeHighlight | `#042d7a` | comment | 4.80 |
| editor + selection + fold + addedLine | `#042f71` | comment | 4.84 |
| editor + selection + addedLine + hover | `#093560` | comment | 4.72 |
| editor + selection + addedLine + symbol | `#213435` | comment | 4.97 |
| editor + selection + addedLine + strongWord | `#1b364a` | comment | 4.77 |
| editor + selection + stackFrame + addedLine | `#173137` | comment | 5.21 |
| editor + selection + focusedStackFrame + addedLine | `#043638` | comment | 5.02 |
| editor + selection + addedLine + bracketMatch | `#1e3134` | comment | 5.17 |
| editor + selection + addedLine + commentRange | `#213435` | comment | 4.97 |
| editor + selection + addedLine + activeCommentRange | `#213435` | comment | 4.97 |
| editor + selection + mergeCurrentHeader + addedLine | `#043638` | comment | 5.02 |
| editor + selection + mergeIncomingHeader + addedLine | `#04345b` | comment | 4.85 |
| editor + selection + mergeCommonHeader + addedLine | `#042f71` | comment | 4.84 |
| editor + selection + addedLine + searchMatch | `#213435` | comment | 4.97 |
| editor + selection + addedLine + covered | `#043a39` | comment | 4.78 |
| editor + selection + addedLine + uncovered | `#3a1e3e` | comment | 5.56 |
| editor + selection + addedLine + addedWord | `#063b4f` | comment | 4.57 |
| editor + selection + addedLine + addedWord + wordHighlight | `#053478` | comment | 4.51 |
| editor + selection + addedLine + addedWord + findMatchOther | `#213b31` | comment | 4.60 |
| editor + selection + addedLine + addedWord + wordHighlight + findMatchOther | `#21374a` | comment | 4.67 |
| editor + selection + addedLine + addedWord + selectionHighlight | `#032f74` | comment | 4.80 |
| editor + selection + addedLine + addedWord + selectionHighlight + wordHighlight | `#032d8c` | comment | 4.54 |
| editor + selection + addedLine + addedWord + selectionHighlight + findMatchOther | `#1f3447` | comment | 4.87 |
| editor + selection + addedLine + addedWord + selectionHighlight + wordHighlight + findMatchOther | `#1f3356` | comment | 4.79 |
| editor + selection + findRange + addedLine + addedWord | `#033864` | comment | 4.55 |
| editor + selection + addedLine + rangeHighlight + addedWord | `#03366c` | comment | 4.57 |
| editor + selection + fold + addedLine + addedWord | `#033864` | comment | 4.55 |
| editor + selection + addedLine + addedWord + hover | `#08395b` | comment | 4.57 |
| editor + selection + addedLine + addedWord + symbol | `#203930` | comment | 4.73 |
| editor + selection + addedLine + addedWord + strongWord | `#1a3a45` | comment | 4.60 |
| editor + selection + stackFrame + addedLine + addedWord | `#133a34` | comment | 4.74 |
| editor + selection + focusedStackFrame + addedLine + addedWord | `#033e35` | comment | 4.58 |
| editor + selection + addedLine + bracketMatch + addedWord | `#193a31` | comment | 4.72 |
| editor + selection + addedLine + addedWord + commentRange | `#203930` | comment | 4.73 |
| editor + selection + addedLine + addedWord + activeCommentRange | `#203930` | comment | 4.73 |
| editor + selection + mergeCurrentHeader + addedLine + addedWord | `#033e35` | comment | 4.58 |
| editor + selection + mergeIncomingHeader + addedLine + addedWord | `#033c52` | comment | 4.50 |
| editor + selection + mergeCommonHeader + addedLine + addedWord | `#033864` | comment | 4.55 |
| editor + selection + addedLine + addedWord + searchMatch | `#203930` | comment | 4.73 |
| editor + selection + addedLine + addedWord + covered | `#033e34` | comment | 4.58 |
| editor + selection + addedLine + addedWord + uncovered | `#392339` | comment | 5.42 |
| editor + selection + removedLine | `#282b58` | comment | 5.06 |
| editor + selection + removedLine + wordHighlight | `#182b7d` | comment | 4.75 |
| editor + selection + removedLine + findMatchOther | `#363136` | comment | 4.84 |
| editor + selection + removedLine + wordHighlight + findMatchOther | `#2c314d` | comment | 4.83 |
| editor + selection + removedLine + selectionHighlight | `#152679` | comment | 5.04 |
| editor + selection + removedLine + selectionHighlight + wordHighlight | `#0d288f` | comment | 4.65 |
| editor + selection + removedLine + selectionHighlight + findMatchOther | `#2a2e4a` | comment | 5.03 |
| editor + selection + removedLine + selectionHighlight + wordHighlight + findMatchOther | `#253058` | comment | 4.86 |
| editor + selection + findRange + removedLine | `#242771` | comment | 4.98 |
| editor + selection + removedLine + rangeHighlight | `#16287a` | comment | 4.93 |
| editor + selection + fold + removedLine | `#242771` | comment | 4.98 |
| editor + selection + removedLine + hover | `#1b3060` | comment | 4.87 |
| editor + selection + removedLine + symbol | `#352f35` | comment | 4.96 |
| editor + selection + removedLine + strongWord | `#2d314a` | comment | 4.84 |
| editor + selection + stackFrame + removedLine | `#362a38` | comment | 5.17 |
| editor + selection + focusedStackFrame + removedLine | `#242e3a` | comment | 5.23 |
| editor + selection + removedLine + bracketMatch | `#322c34` | comment | 5.17 |
| editor + selection + removedLine + commentRange | `#352f35` | comment | 4.96 |
| editor + selection + removedLine + activeCommentRange | `#352f35` | comment | 4.96 |
| editor + selection + mergeCurrentHeader + removedLine | `#242e3a` | comment | 5.23 |
| editor + selection + mergeIncomingHeader + removedLine | `#242c5b` | comment | 5.03 |
| editor + selection + mergeCommonHeader + removedLine | `#242771` | comment | 4.98 |
| editor + selection + removedLine + searchMatch | `#352f35` | comment | 4.96 |
| editor + selection + removedLine + covered | `#163539` | comment | 4.98 |
| editor + selection + removedLine + uncovered | `#4e193e` | comment | 5.21 |
| editor + selection + removedLine + removedWord | `#432b53` | comment | 4.67 |
| editor + selection + removedLine + removedWord + wordHighlight | `#262b7a` | comment | 4.67 |
| editor + selection + removedLine + removedWord + findMatchOther | `#463133` | comment | 4.57 |
| editor + selection + removedLine + removedWord + wordHighlight + findMatchOther | `#34314b` | comment | 4.73 |
| editor + selection + removedLine + removedWord + selectionHighlight | `#232677` | comment | 4.94 |
| editor + selection + removedLine + removedWord + selectionHighlight + wordHighlight | `#15288e` | comment | 4.62 |
| editor + selection + removedLine + removedWord + selectionHighlight + findMatchOther | `#332e49` | comment | 4.90 |
| editor + selection + removedLine + removedWord + selectionHighlight + wordHighlight + findMatchOther | `#2a3057` | comment | 4.81 |
| editor + selection + findRange + removedLine + removedWord | `#3f2868` | comment | 4.66 |
| editor + selection + removedLine + rangeHighlight + removedWord | `#34296f` | comment | 4.72 |
| editor + selection + fold + removedLine + removedWord | `#3f2868` | comment | 4.66 |
| editor + selection + removedLine + removedWord + hover | `#29305d` | comment | 4.77 |
| editor + selection + removedLine + removedWord + symbol | `#452f32` | comment | 4.68 |
| editor + selection + removedLine + removedWord + strongWord | `#3b3147` | comment | 4.65 |
| editor + selection + stackFrame + removedLine + removedWord | `#4e2a38` | comment | 4.66 |
| editor + selection + focusedStackFrame + removedLine + removedWord | `#3f2e3a` | comment | 4.80 |
| editor + selection + removedLine + bracketMatch + removedWord | `#4b2c35` | comment | 4.67 |
| editor + selection + removedLine + removedWord + commentRange | `#452f32` | comment | 4.68 |
| editor + selection + removedLine + removedWord + activeCommentRange | `#452f32` | comment | 4.68 |
| editor + selection + mergeCurrentHeader + removedLine + removedWord | `#3f2e3a` | comment | 4.80 |
| editor + selection + mergeIncomingHeader + removedLine + removedWord | `#3f2c55` | comment | 4.69 |
| editor + selection + mergeCommonHeader + removedLine + removedWord | `#3f2868` | comment | 4.66 |
| editor + selection + removedLine + removedWord + searchMatch | `#452f32` | comment | 4.68 |
| editor + selection + removedLine + removedWord + covered | `#243536` | comment | 4.87 |
| editor + selection + removedLine + removedWord + uncovered | `#5e193b` | comment | 4.76 |
| editor + inactiveSelection | `#181c23` | comment | 6.49 |
| editor + inactiveSelection + wordHighlight | `#0f2360` | comment | 5.58 |
| editor + inactiveSelection + findMatchOther | `#2c2817` | comment | 5.61 |
| editor + inactiveSelection + wordHighlight + findMatchOther | `#272d3b` | comment | 5.24 |
| editor + inactiveSelection + selectionHighlight | `#0c1e5d` | comment | 5.87 |
| editor + inactiveSelection + selectionHighlight + wordHighlight | `#082480` | comment | 5.07 |
| editor + inactiveSelection + selectionHighlight + findMatchOther | `#252a39` | comment | 5.43 |
| editor + inactiveSelection + selectionHighlight + wordHighlight + findMatchOther | `#222d4f` | comment | 5.13 |
| editor + inactiveSelection + findRange | `#0d1e5b` | comment | 5.90 |
| editor + inactiveSelection + rangeHighlight | `#0d205d` | comment | 5.78 |
| editor + inactiveSelection + fold | `#0d1e5b` | comment | 5.90 |
| editor + inactiveSelection + hover | `#122843` | comment | 5.66 |
| editor + inactiveSelection + symbol | `#2b2616` | comment | 5.74 |
| editor + inactiveSelection + strongWord | `#24292d` | comment | 5.58 |
| editor + inactiveSelection + stackFrame | `#232015` | comment | 6.19 |
| editor + inactiveSelection + focusedStackFrame | `#0d261a` | comment | 6.10 |
| editor + inactiveSelection + bracketMatch | `#282315` | comment | 5.95 |
| editor + inactiveSelection + commentRange | `#2b2616` | comment | 5.74 |
| editor + inactiveSelection + activeCommentRange | `#2b2616` | comment | 5.74 |
| editor + inactiveSelection + mergeCurrentHeader | `#0d261a` | comment | 6.10 |
| editor + inactiveSelection + mergeIncomingHeader | `#0d2441` | comment | 5.93 |
| editor + inactiveSelection + mergeCommonHeader | `#0d1e5b` | comment | 5.90 |
| editor + inactiveSelection + mergeChange | `#123221` | comment | 5.31 |
| editor + inactiveSelection + mergeChangeWord | `#123221` | comment | 5.31 |
| editor + inactiveSelection + searchMatch | `#2b2616` | comment | 5.74 |
| editor + inactiveSelection + covered | `#0d2d1c` | comment | 5.66 |
| editor + inactiveSelection + uncovered | `#44101f` | comment | 5.96 |
| editor + inactiveSelection + unchangedCode | `#1e222a` | comment | 6.06 |
| editor + inactiveSelection + addedLine | `#152523` | comment | 6.04 |
| editor + inactiveSelection + addedLine + wordHighlight | `#0d2860` | comment | 5.36 |
| editor + inactiveSelection + addedLine + findMatchOther | `#2a2e17` | comment | 5.32 |
| editor + inactiveSelection + addedLine + wordHighlight + findMatchOther | `#25303b` | comment | 5.10 |
| editor + inactiveSelection + addedLine + selectionHighlight | `#0b235d` | comment | 5.65 |
| editor + inactiveSelection + addedLine + selectionHighlight + wordHighlight | `#082780` | comment | 4.95 |
| editor + inactiveSelection + addedLine + selectionHighlight + findMatchOther | `#242d39` | comment | 5.29 |
| editor + inactiveSelection + addedLine + selectionHighlight + wordHighlight + findMatchOther | `#222f4f` | comment | 5.03 |
| editor + inactiveSelection + findRange + addedLine | `#0b2754` | comment | 5.57 |
| editor + inactiveSelection + addedLine + rangeHighlight | `#0b255d` | comment | 5.56 |
| editor + inactiveSelection + fold + addedLine | `#0b2754` | comment | 5.57 |
| editor + inactiveSelection + addedLine + hover | `#102d43` | comment | 5.40 |
| editor + inactiveSelection + addedLine + symbol | `#292c16` | comment | 5.44 |
| editor + inactiveSelection + addedLine + strongWord | `#222e2d` | comment | 5.33 |
| editor + inactiveSelection + stackFrame + addedLine | `#1e2917` | comment | 5.76 |
| editor + inactiveSelection + focusedStackFrame + addedLine | `#0b2e1b` | comment | 5.62 |
| editor + inactiveSelection + addedLine + bracketMatch | `#262915` | comment | 5.66 |
| editor + inactiveSelection + addedLine + commentRange | `#292c16` | comment | 5.44 |
| editor + inactiveSelection + addedLine + activeCommentRange | `#292c16` | comment | 5.44 |
| editor + inactiveSelection + mergeCurrentHeader + addedLine | `#0b2e1b` | comment | 5.62 |
| editor + inactiveSelection + mergeIncomingHeader + addedLine | `#0b2c3e` | comment | 5.53 |
| editor + inactiveSelection + mergeCommonHeader + addedLine | `#0b2754` | comment | 5.57 |
| editor + inactiveSelection + addedLine + searchMatch | `#292c16` | comment | 5.44 |
| editor + inactiveSelection + addedLine + covered | `#0b321c` | comment | 5.37 |
| editor + inactiveSelection + addedLine + uncovered | `#42161f` | comment | 5.84 |
| editor + inactiveSelection + addedLine + addedWord | `#113023` | comment | 5.43 |
| editor + inactiveSelection + addedLine + addedWord + wordHighlight | `#0b2e60` | comment | 5.07 |
| editor + inactiveSelection + addedLine + addedWord + findMatchOther | `#283417` | comment | 5.01 |
| editor + inactiveSelection + addedLine + addedWord + wordHighlight + findMatchOther | `#24333b` | comment | 4.95 |
| editor + inactiveSelection + addedLine + addedWord + selectionHighlight | `#09295d` | comment | 5.37 |
| editor + inactiveSelection + addedLine + addedWord + selectionHighlight + wordHighlight | `#062a80` | comment | 4.84 |
| editor + inactiveSelection + addedLine + addedWord + selectionHighlight + findMatchOther | `#233039` | comment | 5.14 |
| editor + inactiveSelection + addedLine + addedWord + selectionHighlight + wordHighlight + findMatchOther | `#21314f` | comment | 4.94 |
| editor + inactiveSelection + findRange + addedLine + addedWord | `#09314c` | comment | 5.13 |
| editor + inactiveSelection + addedLine + rangeHighlight + addedWord | `#093054` | comment | 5.11 |
| editor + inactiveSelection + fold + addedLine + addedWord | `#09314c` | comment | 5.13 |
| editor + inactiveSelection + addedLine + addedWord + hover | `#0e3343` | comment | 5.07 |
| editor + inactiveSelection + addedLine + addedWord + symbol | `#273216` | comment | 5.14 |
| editor + inactiveSelection + addedLine + addedWord + strongWord | `#20342d` | comment | 5.02 |
| editor + inactiveSelection + stackFrame + addedLine + addedWord | `#193319` | comment | 5.22 |
| editor + inactiveSelection + focusedStackFrame + addedLine + addedWord | `#09371c` | comment | 5.07 |
| editor + inactiveSelection + addedLine + bracketMatch + addedWord | `#1f3317` | comment | 5.17 |
| editor + inactiveSelection + addedLine + addedWord + commentRange | `#273216` | comment | 5.14 |
| editor + inactiveSelection + addedLine + addedWord + activeCommentRange | `#273216` | comment | 5.14 |
| editor + inactiveSelection + mergeCurrentHeader + addedLine + addedWord | `#09371c` | comment | 5.07 |
| editor + inactiveSelection + mergeIncomingHeader + addedLine + addedWord | `#09353a` | comment | 5.05 |
| editor + inactiveSelection + mergeCommonHeader + addedLine + addedWord | `#09314c` | comment | 5.13 |
| editor + inactiveSelection + addedLine + addedWord + searchMatch | `#273216` | comment | 5.14 |
| editor + inactiveSelection + addedLine + addedWord + covered | `#09381c` | comment | 5.01 |
| editor + inactiveSelection + addedLine + addedWord + uncovered | `#401c1f` | comment | 5.69 |
| editor + inactiveSelection + removedLine | `#341e26` | comment | 5.87 |
| editor + inactiveSelection + removedLine + wordHighlight | `#1e2461` | comment | 5.39 |
| editor + inactiveSelection + removedLine + findMatchOther | `#3d2a18` | comment | 5.17 |
| editor + inactiveSelection + removedLine + wordHighlight + findMatchOther | `#302d3c` | comment | 5.10 |
| editor + inactiveSelection + removedLine + selectionHighlight | `#1b1f5f` | comment | 5.67 |
| editor + inactiveSelection + removedLine + selectionHighlight + wordHighlight | `#102581` | comment | 4.98 |
| editor + inactiveSelection + removedLine + selectionHighlight + findMatchOther | `#2e2a3b` | comment | 5.28 |
| editor + inactiveSelection + removedLine + selectionHighlight + wordHighlight + findMatchOther | `#272e4f` | comment | 5.02 |
| editor + inactiveSelection + findRange + removedLine | `#2a2055` | comment | 5.56 |
| editor + inactiveSelection + removedLine + rangeHighlight | `#1c215e` | comment | 5.59 |
| editor + inactiveSelection + fold + removedLine | `#2a2055` | comment | 5.56 |
| editor + inactiveSelection + removedLine + hover | `#212944` | comment | 5.45 |
| editor + inactiveSelection + removedLine + symbol | `#3c2817` | comment | 5.29 |
| editor + inactiveSelection + removedLine + strongWord | `#332a2e` | comment | 5.28 |
| editor + inactiveSelection + stackFrame + removedLine | `#3d211a` | comment | 5.58 |
| editor + inactiveSelection + focusedStackFrame + removedLine | `#2a261e` | comment | 5.72 |
| editor + inactiveSelection + removedLine + bracketMatch | `#392516` | comment | 5.50 |
| editor + inactiveSelection + removedLine + commentRange | `#3c2817` | comment | 5.29 |
| editor + inactiveSelection + removedLine + activeCommentRange | `#3c2817` | comment | 5.29 |
| editor + inactiveSelection + mergeCurrentHeader + removedLine | `#2a261e` | comment | 5.72 |
| editor + inactiveSelection + mergeIncomingHeader + removedLine | `#2a253f` | comment | 5.56 |
| editor + inactiveSelection + mergeCommonHeader + removedLine | `#2a2055` | comment | 5.56 |
| editor + inactiveSelection + removedLine + searchMatch | `#3c2817` | comment | 5.29 |
| editor + inactiveSelection + removedLine + covered | `#1c2e1d` | comment | 5.48 |
| editor + inactiveSelection + removedLine + uncovered | `#551220` | comment | 5.34 |
| editor + inactiveSelection + removedLine + removedWord | `#4d2029` | comment | 5.14 |
| editor + inactiveSelection + removedLine + removedWord + wordHighlight | `#2c2563` | comment | 5.14 |
| editor + inactiveSelection + removedLine + removedWord + findMatchOther | `#4c2b1a` | comment | 4.79 |
| editor + inactiveSelection + removedLine + removedWord + wordHighlight + findMatchOther | `#382e3d` | comment | 4.91 |
| editor + inactiveSelection + removedLine + removedWord + selectionHighlight | `#282160` | comment | 5.41 |
| editor + inactiveSelection + removedLine + removedWord + selectionHighlight + wordHighlight | `#182681` | comment | 4.89 |
| editor + inactiveSelection + removedLine + removedWord + selectionHighlight + findMatchOther | `#362b3b` | comment | 5.10 |
| editor + inactiveSelection + removedLine + removedWord + selectionHighlight + wordHighlight + findMatchOther | `#2c2e4f` | comment | 4.96 |
| editor + inactiveSelection + findRange + removedLine + removedWord | `#442250` | comment | 5.02 |
| editor + inactiveSelection + removedLine + rangeHighlight + removedWord | `#392358` | comment | 5.13 |
| editor + inactiveSelection + fold + removedLine + removedWord | `#442250` | comment | 5.02 |
| editor + inactiveSelection + removedLine + removedWord + hover | `#2f2a46` | comment | 5.18 |
| editor + inactiveSelection + removedLine + removedWord + symbol | `#4b2919` | comment | 4.90 |
| editor + inactiveSelection + removedLine + removedWord + strongWord | `#412b30` | comment | 4.95 |
| editor + inactiveSelection + stackFrame + removedLine + removedWord | `#54231f` | comment | 4.88 |
| editor + inactiveSelection + focusedStackFrame + removedLine + removedWord | `#442722` | comment | 5.12 |
| editor + inactiveSelection + removedLine + bracketMatch + removedWord | `#51261c` | comment | 4.86 |
| editor + inactiveSelection + removedLine + removedWord + commentRange | `#4b2919` | comment | 4.90 |
| editor + inactiveSelection + removedLine + removedWord + activeCommentRange | `#4b2919` | comment | 4.90 |
| editor + inactiveSelection + mergeCurrentHeader + removedLine + removedWord | `#442722` | comment | 5.12 |
| editor + inactiveSelection + mergeIncomingHeader + removedLine + removedWord | `#44263e` | comment | 5.01 |
| editor + inactiveSelection + mergeCommonHeader + removedLine + removedWord | `#442250` | comment | 5.02 |
| editor + inactiveSelection + removedLine + removedWord + searchMatch | `#4b2919` | comment | 4.90 |
| editor + inactiveSelection + removedLine + removedWord + covered | `#2a2f1f` | comment | 5.23 |
| editor + inactiveSelection + removedLine + removedWord + uncovered | `#641322` | comment | 4.81 |
| peekEditor | `#14181f` | comment | 6.76 |
| peekEditor + wordHighlight | `#0d215e` | comment | 5.72 |
| peekEditor + findMatchOther | `#2a2614` | comment | 5.76 |
| peekEditor + wordHighlight + findMatchOther | `#252b3a` | comment | 5.37 |
| peekEditor + selectionHighlight | `#0a1c5b` | comment | 6.00 |
| peekEditor + selectionHighlight + wordHighlight | `#07237f` | comment | 5.13 |
| peekEditor + selectionHighlight + findMatchOther | `#242838` | comment | 5.56 |
| peekEditor + selectionHighlight + wordHighlight + findMatchOther | `#222d4e` | comment | 5.14 |
| peekEditor + findRange | `#0b1c59` | comment | 6.03 |
| peekEditor + rangeHighlight | `#0b1e5b` | comment | 5.91 |
| peekEditor + fold | `#0b1c59` | comment | 6.03 |
| peekEditor + lineHighlight | `#22262e` | comment | 5.76 |
| peekEditor + lineHighlight + wordHighlight | `#142866` | comment | 5.23 |
| peekEditor + lineHighlight + findMatchOther | `#322e1d` | comment | 5.17 |
| peekEditor + lineHighlight + wordHighlight + findMatchOther | `#2a303f` | comment | 5.01 |
| peekEditor + lineHighlight + selectionHighlight | `#122463` | comment | 5.47 |
| peekEditor + lineHighlight + selectionHighlight + wordHighlight | `#0b2783` | comment | 4.89 |
| peekEditor + lineHighlight + selectionHighlight + findMatchOther | `#282d3d` | comment | 5.21 |
| peekEditor + lineHighlight + selectionHighlight + wordHighlight + findMatchOther | `#242f50` | comment | 5.00 |
| peekEditor + lineHighlight + findRange | `#122361` | comment | 5.55 |
| peekEditor + lineHighlight + rangeHighlight | `#122563` | comment | 5.43 |
| peekEditor + lineHighlight + fold | `#122361` | comment | 5.55 |
| peekEditor + selection | `#0c2e61` | comment | 5.06 |
| peekEditor + selection + wordHighlight | `#082d82` | comment | 4.67 |
| peekEditor + selection + findMatchOther | `#25333c` | comment | 4.94 |
| peekEditor + selection + wordHighlight + findMatchOther | `#223350` | comment | 4.82 |
| peekEditor + selection + selectionHighlight | `#06287e` | comment | 4.95 |
| peekEditor + selection + selectionHighlight + wordHighlight | `#052a92` | comment | 4.55 |
| peekEditor + selection + selectionHighlight + findMatchOther | `#21304d` | comment | 5.01 |
| peekEditor + selection + selectionHighlight + wordHighlight + findMatchOther | `#213159` | comment | 4.84 |
| peekEditor + selection + findRange | `#06287d` | comment | 4.97 |
| peekEditor + selection + rangeHighlight | `#062a7f` | comment | 4.85 |
| peekEditor + selection + fold | `#06287d` | comment | 4.97 |
| peekEditor + inactiveSelection | `#1b1f26` | comment | 6.28 |
| peekEditor + inactiveSelection + wordHighlight | `#102561` | comment | 5.47 |
| peekEditor + inactiveSelection + findMatchOther | `#2e2a18` | comment | 5.47 |
| peekEditor + inactiveSelection + wordHighlight + findMatchOther | `#272e3c` | comment | 5.18 |
| peekEditor + inactiveSelection + selectionHighlight | `#0e205f` | comment | 5.74 |
| peekEditor + inactiveSelection + selectionHighlight + wordHighlight | `#092581` | comment | 5.01 |
| peekEditor + inactiveSelection + selectionHighlight + findMatchOther | `#262b3b` | comment | 5.35 |
| peekEditor + inactiveSelection + selectionHighlight + wordHighlight + findMatchOther | `#232e4f` | comment | 5.07 |
| peekEditor + inactiveSelection + findRange | `#0e205c` | comment | 5.79 |
| peekEditor + inactiveSelection + rangeHighlight | `#0e225e` | comment | 5.66 |
| peekEditor + inactiveSelection + fold | `#0e205c` | comment | 5.79 |
| hoverWidget | `#1e222a` | comment | 6.06 |
| findMatch | `#463500` | comment | 4.51 |
| findMatch + wordHighlight | `#463500` | comment | 4.51 |

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
- **Violet in the interface** reaches exactly five keys, and a test fails on a sixth:
  `editorBracketHighlight.foreground3` and `foreground6` for the cycle above,
  `symbolIcon.keywordForeground`, which mirrors the keyword colour, `charts.purple`,
  where an extension asks for the hue by name, and `terminal.ansiBrightMagenta`, which is
  slot 13 and is the violet accent by design.
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
| find match, other | `#4b3b0566` | 40% |
| word highlight | `#052daa73` | 45% |
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
decorations". The dark amber wash remains translucent, and the selection retains more
than half its plain-line shift through it.

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
| 0 | black | `#22262e` | exempt | | 8 | bright black | `#8b909a` | 5.71 |
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
it as a foreground, and on either background it reads about 1.2:1, so an application that
writes black text on the default background is not legible. Raising slot 0 far enough to
change that would take it past the point where `SGR 40` and reverse video still carry
text: at lightness 0.400 it still reads only 1.99:1 as a foreground while ANSI white on it
falls from 6.66:1 to 4.04:1, below the floor. Aion keeps it dark and guarantees the other
direction. `ANSI_BLACK_TEXT` names the pair the gate measures.

Slot 0 is also badge text: `SGR 30` on a chromatic background, which test runners print.
It sits at lightness 0.270 so it clears the floor on all twelve chromatic slots; at 0.300
it read 4.13:1 on red. `ANSI_BADGE` names them. A bold badge lands in slot 8 under VS
Code's default `drawBoldTextInBrightColors`, and no grey reads both on the panel and on
every colour; the light chromatic slots are too dark for any black. Both are measured as
information, and VS Code's default `minimumContrastRatio` of 4.5 repairs them per cell.

A terminal that applies a minimum-contrast correction changes these requested colours
before drawing them. The table describes what Aion asks for, not what every emulator
draws.

Windows Terminal ships two ways: a JSON fragment extension, and a `settings.json`
snippet in the README.

## 11. Light ramp — independent light scheme

The light theme is **tuned separately, not mirrored.** A mirrored ramp does not work:
the dark accents sit near lightness 0.80, which fails badly on a white page.

Two constraints fight each other on light. The floor pushes lightness down; sRGB cannot
hold the resulting chroma at that lightness. The generator first searches a modest
lower-lightness window for an in-gamut colour at the authored chroma, then walks chroma
down until a colour satisfies both.

**The reference surface is `input`, not `page`.** An accent solved against a light
surface can fail the moment it lands on a native control. Solving against `input` gives
at least 4.5:1 on the darkest editor surface and more on the page. Accent text on the
`hover` surface is outside this guarantee; hover rows use neutral text.

| Role | Hex | | Accent | Hex | Ratio |
|---|---|---|---|---|---|
| page | `#f6f8fd` | | coral | `#aa373c` | 5.95 |
| surface | `#eff2f7` | | copper | `#9a4800` | 5.99 |
| raised | `#e7eaef` | | gold | `#765d00` | 5.92 |
| input | `#dee1e7` | | green | `#006f28` | 5.98 |
| hover | `#d5d7dd` | | teal | `#006b69` | 5.98 |
| hairline | `#cbced3` | | blue | `#2460a8` | 5.96 |
| divider | `#bbbec3` | | violet | `#754d9e` | 5.97 |
| border | `#7c7f84` | | | | |
| muted | `#6f7276` | | | | |
| secondary text | `#505357` | | | | |
| primary text | `#16181c` | | | | |

Light muted sits at lightness 0.550, lower than the dark ramp's tenth step, so the light
layer needs no muted exemption. Light border sits at 0.595, which clears the 3:1 non-text
floor against the page.

**Known consequence.** Light gold reads olive rather than gold. A
yellow hue cannot be both light and 4.5:1 against near-white. The light layer therefore
does not carry Aion's signature the way the dark layer does. The same independently tuned
palette now drives the CSS layer and the generated `Aion Light` VS Code theme. Its native
editor rendering is still open acceptance after this palette change; the ratios above are
calculation evidence, not a claim that an editor has been visually reviewed.

The neutral tint tapers toward white, because sRGB cannot hold chroma next to white.

Light keeps the reading roles separate: punctuation and secondary text use the secondary
neutral, comments use their own quieter role, and dim chrome uses `lightDimText`. ANSI white
and bright-black have dedicated terminal values as well, so a shared emitted neutral cannot
silently decide which role wins.

The light accent solver enforces the documented per-accent chroma ceilings and the 0.09
floor. Teal is the one narrow exception: its high-lightness in-gamut branch cannot retain
that floor at the input contrast target without becoming a near-black cyan, so its explicit
light floor is recorded in the token source and tested separately.

Light status success is authored lighter than error by at least the meaning-pair gap. The
error solid is a dedicated status role; its subtle and border values still come from the
coral scale, so all status pairings retain their own measured surfaces.

The integrated light terminal reverses the dark slot-0 trade-off. Slot 0 is a dark
foreground and is gated on both the light panel and the opaque terminal selection. The dark
scheme's `ANSI_BLACK_TEXT` background guarantee does not carry over: the light white slots
cannot clear 4.5:1 on both a near-white panel and a conventional dark slot-0 background.
The light claim is therefore foreground-only for slot 0.

## 12. Naming

Two layers.

- **Literal** — `aion.gold.solid`, `aion.neutral.7`. What the colour is.
- **Semantic** — `bg.editor`, `fg.dim`, `border.focus`, `status.error.solid`. What the
  colour is for. 71 dark aliases and 37 light ones.

Consumers use the semantic layer. Changing what "keyword" means is one line.

## 13. Scope of v1

**In.** Colour. VS Code, Windows Terminal, a CSS layer with custom properties and a
Tailwind v4 `@theme inline` block, the lab, and the public site. §3 counts what the theme sets.

**Out.** Typography, spacing, radius, elevation and motion as shipped tokens. JetBrains
and Neovim. Italic variants. More than six language overrides.

Type appears in this project only for the lab and the public site: **Archivo** for display and
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
