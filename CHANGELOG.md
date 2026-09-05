# Changelog

All notable changes to Aion are recorded here. The format follows Keep a Changelog and
the versions follow Semantic Versioning.

## Unreleased

The 2026-09-05 theme review found that the contrast gate measured a colour only against a
plain background, and that several claims ran ahead of what it checked. An adversarial
review on the same date found fourteen more; `ADVERSARIAL_REVIEW.md` is that report.

### Added

- `solveMarker`, `binding` and `distanceEmitted` in `packages/tokens/src/solve.ts`. A
  decoration's value cannot be inverted: contrast is read from the emitted 8-bit hex,
  after the gamut clip and the rounding. The solver searches instead, and reports which
  foreground and which overlay stack stop the marker going further, because that is what
  decides whether a brighter decoration is affordable at all. `test/solve.test.ts` asserts
  every diff marker is within 5% of the most visible colour its own floor allows, and
  names the foreground that holds it there.
- `compositeEmitted`, which blends a translucent decoration as 8-bit bytes before the
  ratio is read, and `readingStates`, the named set of backgrounds the guarantee covers.
  The gate grew from 154 checks to 463 and now measures every syntax colour on a current
  line, a selection, a word highlight, a diff fill and every stack of those.
- `editor.findMatchForeground` and `editor.findMatchHighlightForeground`. A find match is
  the one decoration allowed to replace the colour under it.
- A gate over functional boundaries that measures a control edge on both surfaces it
  touches, not only against the editor.
- A test that fails on violet in any interface key outside a four-key allowlist.
- Terminal gates over both supported backgrounds, over ANSI slot 0 as a background, and
  over reverse video.
- `npm run sync:design` now regenerates the rival tables in `README.md` and
  `packages/vscode/README.md` as well as `DESIGN.md`.
- `packages/vscode/test/high-contrast-only.json`, the 47 colour keys VS Code registers
  with `light: null, dark: null` and a value only for the high contrast themes. A test
  fails on any of them set outside a structural allowlist, because an outline round every
  match is a high contrast affordance, not a dark-theme decoration.
- `packages/vscode/test/scopes.json`, every scope the six declared grammars emit, read
  from the VS Code repository at a recorded revision. A test fails on a scope no rule
  matches and on a scope the uncoloured list names that no grammar emits any more.

### Changed

- Accents dropped 0.030 in lightness and rose to 1.1× chroma. Every one stays in gamut
  and inside its chroma band; the dimmest is coral at 6.96:1 on the editor.
- The comment moved to lightness 0.656, `#8a91a0`, solved against the lightest supported
  stack rather than the plain editor. It reads 5.78:1 on the editor and 4.55:1 in the
  worst state the gate covers.
- The selection is tinted blue and reads 1.28:1 against the editor, up from 1.13:1. A
  neutral selection inside the comment's budget landed within 0.05 of the current line,
  so the two read as one decoration. The three passive marks now form a ladder: word
  highlight 1.08, current line 1.19, selection 1.28. The last step was bought from the
  added-diff wash, which fell to 1.06:1, rather than from the comment.
- The comment moved again, to lightness 0.672 and 6.15:1, which is what buys that ladder.
  The dimmest code colour is coral at 6.96:1.
- The current line reads 1.19:1 against the editor, up from 1.04:1. VS Code renders the
  current-line background only while every selection is empty, so the gate no longer
  measures it stacked under a selection. That phantom state was what capped the fill.
- The selection and word-highlight overlays dropped to 12% and 28%, and fourteen further
  alpha keys came down to the same budget. The current line blends toward `widget` at 42%
  rather than `sidebar` at 60%: `sidebar` is one step off the editor, so no alpha of it
  separates the current line from the page.
- A diff now marks three things at three strengths: the gutter column at 1.40:1 and
  1.41:1 against the editor, the characters that changed at 1.21:1 and 1.43:1, and the
  line that holds them at 1.08:1 and 1.25:1. The gutter column carries the line number and
  no body text, so it answers to 3:1 against that rather than to the comment, which is why
  it can be the loudest. The added side is dimmer than the removed side at every step,
  because green costs more luminance per unit of chroma than red does.
- The search match dropped its two foreground keys and quietened its fill. VS Code applies
  `editor.findMatchForeground` to the other matches and `editor.findMatchHighlightForeground`
  to the current one, which is the reverse of both names and both descriptions, so Aion was
  shipping near-white text on solid gold at 1.42:1 and near-black text on a wash at 1.39:1.
  The current match is now an opaque dark gold, `#463500` at 1.54:1 against the editor, and
  the other matches a dark amber wash at 40%. Both carry every syntax colour above the
  floor without replacing any of it.
- The diff washes became translucent, and the reading states were re-derived around the
  renderer's layer order. VS Code registers `DecorationsOverlay` after `SelectionsOverlay`
  and renders both into one line element in registration order, so a diff fill paints over
  the selection. Aion shipped those fills opaque, which hid the selection on every changed
  line. The alphas now leave the selection reading at 60% of its plain-line shift through
  the strongest wash. `states.ts` stacks a diff on top of a base rather than treating it as
  a base of its own.
- The colour-vision lightness gap moved from the line fills to the gutter strips. A green
  wash dark enough to open a 0.06 gap under a red one is invisible; the strips are opaque,
  always drawn and never covered, so they can hold it. The strips are `#1d3721` and
  `#490006`, and each gives up about a third of the distance it could reach alone.
- The selection became a dark saturated blue at 39%, `#0153c9`, from a pale blue at 26%.
  A translucent overlay moves a surface by `alpha x (overlay - surface)`, so the pale wash
  that lifted the editor barely touched a diff fill and read as nothing on one. The worst
  surface it lands on now shifts 0.117 in OKLab against 0.049, and a removed word shifts
  0.146 against 0.049. It reads 1.35:1 on the editor, up from 1.28:1.
- The removed word fill rose to `#750014`, 1.54:1 against the editor. The new selection
  replaces more of what sits under it, so the removed fill is no longer capped by the
  comment under a selection and could take the room back.
- The comment moved a third time, to lightness 0.704 and 6.95:1, one notch under
  `variable` at 6.96:1. That is where a brighter comment stops buying anything, since
  `variable` binds beyond it. The diff is what the step bought: the added word fill could
  reach 1.07:1 at the old comment and reaches 1.21:1 at this one.
- `neutral.border` rose to lightness 0.560, so a control edge clears 3:1 on the field
  inside it and on the chrome behind it. `input.border` read 1.41:1 before this.
- `list.focusOutline` uses solid gold. It read 2.61:1 against the row it outlines.
- ANSI slot 8 rose to lightness 0.652. It read 4.49:1 on the VS Code panel.
- Rival comparison values were re-read from each theme at a recorded revision. One Dark
  Pro's comment and Catppuccin's comment had both moved; Catppuccin Mocha now clears the
  floor on all eight roles, so the claim that no rival does was removed rather than kept.

- `terminalSelection`, its own token. Windows Terminal and the VS Code panel both paint
  the selection opaque behind the glyphs, and an ANSI slot sits on it rather than a syntax
  colour. The neutral both used read 1.40:1 under ANSI red. Every slot now clears 4.80:1,
  and the gate covers it.

### Removed

- `editor.selectionForeground`. VS Code applies it only in the high contrast themes, so
  a dark theme that sets it claims a legibility it does not get.
- Nine per-match outlines, for the same reason: `diffEditor.insertedTextBorder` and
  `removedTextBorder`, `editor.findMatchBorder`, `findMatchHighlightBorder`,
  `selectionHighlightBorder`, `wordHighlightBorder`, `wordHighlightStrongBorder`,
  `peekViewEditor.matchHighlightBorder` and `terminal.findMatchHighlightBorder`. Each
  boxed every matching range: the word-highlight border outlined every occurrence of the
  word under the caret, and the diff borders outlined every line of a diff, because a
  whole inserted line is one changed range.
- `diffWordBorder`. A diff marks a changed word with a fill rather than an edge.
- `aion.txt`, a first-person note on the name. The root README carries the etymology.
- `HANDOVER.md`. It said "remediation pending" for five findings that shipped;
  `CHANGELOG.md` and `PLAN.md` are the record.
- `explorations/`, the design-phase HTML pages and the legacy invariant suite. No
  workspace built or tested them, and their duplicated calculations were not evidence for
  a release.

### Fixed

- Ten TextMate rules were written with a language suffix that stopped them matching their
  own variants: `constant.character.entity.html` never matched
  `constant.character.entity.numeric.decimal.html`, and the same held for the regular
  expression character classes and the JSX attribute names.
- Markdown had no rule for tables, strikethrough, indented code or reference links. The
  table rules now carry a colour and the cells keep body text.

- Violet left `editorLightBulbAi.foreground`, `gitDecoration.conflictingResourceForeground`,
  `scmGraph.historyItemBaseRefColor` and `scmGraph.foreground5`.
- The lab drew a 1px outline round a changed word in a diff. It looked right here because
  the sample marks a single word; the extension marked a whole inserted line as one range
  and boxed every line. A test now fails on a token rule that paints an edge with no
  extension key behind it.
- The lab rendered an untracked file in green where the extension ships teal. Its Git
  parity test now derives every state the tree renders instead of listing one, and the
  tree shows a deleted file so the coral it shares with a conflict is visible.
- The icon ships as the transparent disc, cleaned of stray pixels outside its edge,
  centred and downscaled to 128 px at 88% coverage. `assets/README.md` records the
  derivation; the earlier opaque tile stays as `assets/icon-square.png`.
- The lab rendered a Git conflict and an active activity icon in colours the extension
  does not ship, and recoloured selected text. A test now pins each demonstrated state to
  the key the extension emits.
- The READMEs quoted 4.61 as the lowest syntax ratio when the emitter said 4.53, claimed
  that every other dark theme puts the sidebar below the editor when two of the four
  compared use one colour for both, and read a count of interface keys as proof that no
  key falls back to a VS Code default.
- A clean checkout could not reach the gate. `npm run typecheck` and `npm run build` walk
  the workspaces in declaration order, which starts with the CSS package, so every
  consumer failed to resolve `@sltio/aion-tokens` before the token package had emitted
  `dist`. Both root scripts now build the token package by name first, `prepare` builds it
  after an install, and both workflows build before they check.
- The release workflow piped the notes script through `tee`, so a tag with no changelog
  section produced an empty notes file and a step that passed. The step now redirects
  under `shell: bash` with `pipefail`, and a root test runs the step's own script body
  against a failing tag.
- `scripts/pack-dev.mjs` deleted every `.vsix` in the extension directory whose name
  lacked `-dev.`, including a release candidate it did not create. It now removes only its
  own earlier development archives, and reads its counter from `.dev-version` rather than
  from the archive names, so cleaning the directory cannot hand VS Code a version it still
  has cached.
- Four TextMate rules shipped `dimText`, a chrome colour the reading budget does not
  name: `Deprecated`, `Markdown separator`, `Markdown strikethrough` and `HTML doctype`.
  No decoration was ever solved against them, and they read 3.37:1 on a selected word
  inside an added diff line. They take the comment, which is the dimmest colour a rule is
  allowed to use. A test now derives every foreground from the emitted theme, rejects one
  the budget does not name, and measures each on every state the gate covers.
- `editorUnnecessaryCode.opacity` faded unused code to 50%, which put a variable at
  2.63:1 on the plain editor. `codeEditorWidget.ts` writes that alpha byte as a CSS
  `opacity` on the glyph, so the key scales the text rather than tinting the surface, and
  the alpha table in the theme test had classified it as a background wash that carries no
  text. The comment already sits on the floor in the worst state the gate covers, so no
  fade is affordable: VS Code's own dark default of `#000a` reads 2.69:1. Unused code now
  keeps its colour and takes the dashed underline from `editorUnnecessaryCode.border`,
  which is what that key's description recommends.
- The CSS selection changed the background and left the foreground alone, so ordinary text
  the package styles itself failed the floor under a selection: dim text read 3.47:1 in
  the light scheme and 2.98:1 in the dark one, and a link 3.95:1. `::selection` now sets
  the foreground as well, and the pair is measured on every surface the selection can land
  on. A browser supplies no corrective selection foreground here, which a Chromium probe
  of `getComputedStyle(element, '::selection')` confirmed.
- The CSS form controls drew their edge with the decorative hairline token, which read
  1.41:1 against the dark field and 1.21:1 against the light one. They use the UI border,
  and the test reads the generated rule rather than a token the rule does not mention.
- The light `border` moved to lightness 0.605, `#7f8287`. It was solved against `page`,
  the lightest surface, so it read 2.56:1 against the input it delimits. A light border is
  darker than every surface it touches, so the darkest one binds. `BOUNDARY_PAIRS_LIGHT`
  puts the light scheme under the same both-surfaces gate as the dark one.
- The CSS element rules moved into the `base` cascade layer. An unlayered rule beats every
  layered one whatever its specificity, so the base `button` background won over a
  Tailwind `bg-bg-raised` utility. Verified with Tailwind 4.3.3 in Chromium 151. Tailwind
  has to be imported before `aion.css`, because its preflight is in the same layer, and
  `packages/css/README.md` now documents that order and the reason.
- The Tailwind aliases use `@theme inline`. A plain alias resolves where it is defined, at
  the root, so `bg-bg-raised` inside a nested `[data-theme="light"]` region kept the dark
  root value even though the region's own Aion variables were light.
- The lab's live readout measured each syntax colour against the plain editor and three
  plain UI pairs, which is the blind spot the gate was rewritten to close. It reported ALL
  CLEAR for a comment at lightness 0.600 that reads 4.62:1 on the editor and 2.99:1 on a
  selected word inside an added diff line. `readingStates` and `readingForegrounds` now
  take the palette they measure, so the lab passes its preview palette to the same
  evaluator the build gate uses instead of keeping a second list of states.
- The lab dashboard presented invented numbers as measurements: a token count of 154, four
  deltas, twelve chart bars, a claim that the gate had stayed above the floor since 0.0.9,
  and a Pairs table with a failing boundary row no run produced. The KPIs, the chart and
  the table are generated from `checks()`; the chart shows the lowest ratio each section of
  the gate produced and the table the passing row with the least room left in each.
- Every count a document quotes is generated. The prose said 630 interface keys, 54
  TextMate rules, 25 covered states, 122 tests and 397 gate rows while the code produced
  622, 64, 35, 155 and 600. `npm run sync:design` writes a counts table into `DESIGN.md`,
  `README.md` and the extension README, and §3.1 of `DESIGN.md` lists every state the
  floor covers with the foreground that reads worst on it. `PLAN.md` quotes no count at
  all: it names the command that prints one.
- The colour-vision paragraph in the extension README described a palette that was
  replaced. The 0.06 lightness gap moved to the opaque diff gutter strips when the line
  washes became translucent, and both washes are lighter than the editor and about 0.02
  apart. The README says what the test asserts, and a second test records what the washes
  do separate by.
- The claim that a colour below the floor fails "the build" named the wrong command.
  `npm run build` runs the emitters; `npm run verify` is the gate, and CI runs it on every
  branch.
- Both alternative Windows Terminal install instructions were wrong. The Store path named
  a `LocalState/Fragments` directory the loader does not read — it enumerates
  `\Microsoft\Windows Terminal\Fragments` under LocalAppData and ProgramData, and
  nothing else — and the snippet instruction told a reader to paste a wrapper object into
  the `schemes` array, which nests a second wrapper. A test holds the README to the shape
  the package emits.
- The violet allowlist has five keys, not four. ANSI slot 13 is the violet accent by
  design and was already in the test; the documents had not counted it.
- `packages/tokens/README.md` quoted a superseded gold inside a code sample. The parity
  test now reads every hex in six documents rather than only the ones inside backticks.
- The lab's "Solving a token" example dropped `solveLightness`'s required direction and
  passed its numeric return where a colour was expected. It builds the triple from the
  solved lightness and measures that.
- `scripts/fetch-fonts.mjs` wrote the two `.woff2` files into `apps/lab/public/fonts`
  while `styles.css` loads them from `apps/lab/src/fonts`, so a font refresh never reached
  the built app. It writes the fonts where they are loaded from and the licence where it
  is served from.

## 0.1.0

### Added

- `packages/tokens` — the OKLCH colour core, the semantic layer, the status scales, the
  parameterised preview palette and the contrast report.
- `packages/vscode` — the theme, 628 interface keys, 54 TextMate rules, 32 semantic
  tokens and six language overrides.
- `packages/terminal` — the Windows Terminal fragment extension and the settings snippet.
- `packages/css` — custom properties for both schemes and a Tailwind v4 `@theme` block.
- `apps/lab` — five surfaces driven by six OKLCH sliders, every one reading the token
  module through CSS custom properties.
- A release pipeline: the gate on every branch under Node 22 and Node 24, and a tag that
  packages, publishes to both marketplaces and creates the GitHub release.
- `npm run verify`, the contrast gate that fails the build on any token below its floor.
- `npm run sync:design`, which regenerates every table in `DESIGN.md` from the tokens.
- `dimText` at `#848993`, a text colour for dimmed chrome that clears 4.5:1 on all four
  dark surfaces.

### Changed

- Contrast is measured on the emitted 8-bit hex, not the ideal OKLCH. The two readings
  differ by up to 0.06.
- Light accents solve against the `raised` surface rather than `page`, so they stay
  legible on a card and on their own subtle fill.
- Light muted moved to lightness 0.560 and light border to 0.650, so the light ramp needs
  no contrast exemption.
- Every accent lifted 0.010 in lightness and dropped to 0.9 of its chroma, and comments
  moved to lightness 0.594. The values come from a session in the lab.

### Known

- The lab is local only. GitHub Pages needs a `base` and a workflow.
