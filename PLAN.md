# Aion — implementation plan

Read `DESIGN.md` first. It is the specification. This document is the order of work and
the record of what is done.

For the 2026-09-05 adversarial review, read
[`ADVERSARIAL_REVIEW.md`](ADVERSARIAL_REVIEW.md); its fourteen findings are implemented,
and `CHANGELOG.md` records each one. The theme review of the same date is recorded in the
`Unreleased` section of `CHANGELOG.md`, defects 10 to 15 below. **Native
acceptance is still open:** nothing below has been seen inside VS Code or Windows
Terminal. Every ratio in this repository is a calculation over configured colours, not an
observation of a rendered pixel. The CSS package is the one exception: its cascade, its
nested-theme case and its selection foreground were checked in Chromium 151.

## State on 2026-09-05

| Task | State | Where |
|---|---|---|
| 1. `packages/tokens` — the colour core | **done** | `packages/tokens/test` |
| 2. The contrast report | **done** | `npm run verify` |
| 3. `packages/vscode` | **done** | `packages/vscode/test/theme.test.ts` |
| 4. `packages/terminal` | **done** | `packages/terminal/test` |
| 5. `packages/css` | **done** | `packages/css/test` |
| 6. `apps/lab` | **done** | five surfaces, `apps/lab/test` |
| 7. Release pipeline | **done** | two workflows, four scripts, `test/` at the root |
| 8. Marketplace listing | README done, icon done, screenshots pending | |

A count of tests or of gate rows is not written here. Both move with the palette, and a
stale one in a document is a defect this repository has already shipped twice. Run the
commands:

```
npm run build      every package emits its artefact
npm test           every workspace, plus the release and bootstrap tests at the root
npm run typecheck   strict, noUncheckedIndexedAccess, noUnusedLocals
npm run verify     the contrast gate; the last line prints the counts
npm run sync:design  regenerates every generated table from the emitter
```

Green here means the calculation passes. It is not evidence that a native editor renders
what the calculation assumes; see "What is still unverified" below.

## Defects that running the code found

Nine, none of which was visible by inspection. This is why the plan is executed, not read.

**Before Task 1 started**, running the design-phase modules found three:

1. The light page at lightness 0.995 with a base tint left the sRGB gamut. Fixed by a
   tint that tapers toward white.
2. `lightAccent` rounded lightness after solving for the floor, landing at 4.4996:1.
   Fixed by rounding in the direction that increases contrast.
3. A 1.35× chroma boost on light accents left the gamut for copper, gold, green and teal.
   Fixed by walking chroma down until both the floor and the gamut hold.

**Task 1** found two more:

4. `contrast` read the ideal OKLCH, but a user sees the rounded 8-bit hex. The two
   readings differ by up to 0.06. `contrastEmitted` now measures the shipped hex and every
   gate asserts against it; `solveLightness` keeps the continuous form, because bisection
   needs one. No shipped colour breached a floor, so no dark value moved.
5. Light muted at lightness 0.600 reached 3.84:1, below the floor and undocumented.
   Lowered to 0.560, which clears 4.5:1. The light ramp now needs no exemption.

**Task 3** found two:

6. Step 10 is a solid-hover step in the Radix model, not a text step. Dimmed UI text used
   it and dropped to 4.01:1 on the sidebar and 3.70:1 on a widget. Added `dimText` at
   lightness 0.630, `#848993`, which clears 4.5:1 on all four dark surfaces. Step 10 keeps
   the line number under its documented exemption.
7. `editorInlayHint.foreground` sat on an accent subtle fill at 4.44:1, and
   `input.placeholderForeground` on the input surface at 4.10:1. The inlay hint chip is
   now neutral; the placeholder uses secondary text.

**Task 5** found two:

8. Light `border` at lightness 0.700 read 2.60:1 against the page, below the 3:1 non-text
   floor. Lowered to 0.650, which reads 3.15:1.
9. Light accents were solved against `page`, the lightest surface, so they failed on a
   card or on their own subtle fill at about 3.95:1. They now solve against `raised` and
   read about 4.5:1 there and 5.15:1 on the page.

**The 2026-09-05 review and the gate it asked for** found six more. Each was invisible by
inspection and each came from measuring a pair the old gate did not measure.

10. The old gate measured a syntax colour only against a plain background. Once
    decorations were composited, the comment read 3.32:1 on an inserted diff line, 3.95:1
    in a hover widget and 2.12:1 on a find match. The comment moved to lightness 0.656 and
    every overlay alpha came down to meet it.
11. Fourteen further alpha keys put the comment below the floor once composited: the
    stack-frame and symbol highlights, the bracket match, all three merge headers, the
    coverage fills, the strong word highlight, the hover highlight and the comments range.
12. `selection.background`, the workbench selection outside the editor, put secondary text
    at 3.02:1 on the field it selects in. `list.filterMatchBackground` put it at 3.72:1.
13. VS Code requires `terminal.findMatchBackground` to stay translucent, so the editor's
    solid find match could not be reused there. Under the wash that remained, ANSI bright
    black fell below the floor, which is what forced slot 8 up to lightness 0.652.
14. The first parameter set that cleared every decorated state broke an older invariant:
    added fill 0.225 and removed fill 0.245 separate by 0.020, under the 0.06
    meaning-pair gap. The fills now sit on opposite sides of the editor, 0.075 apart.
15. The rival table was stale. One Dark Pro's comment had moved from `#5c6370` to
    `#7f848e` and Catppuccin's from `overlay0` to `overlay2`, so Catppuccin Mocha now
    clears the floor on all eight roles and the claim that no rival does was false. Each
    rival now records the revision its values were read at.

Defects 6, 8 and 9 were found by tests that pair a foreground with its own background
automatically. Defects 10 to 13 were found by extending that pattern to composite a
decoration first. Keep both patterns when adding a surface or an overlay.

## Repository

Branch from `main`. Never commit on `main`. The current branch is
`design/palette-exploration` and **nothing is committed yet.**

```
aion/
  package.json            # npm workspaces root
  DESIGN.md  PLAN.md  README.md  LICENSE  CHANGELOG.md
  AGENTS.md  CLAUDE.md    # git-ignored; CLAUDE.md imports AGENTS.md
  assets/                 # aion-icon.png source, icon.png 128, icon-1024.png
  scripts/
    sync-design.mjs       # regenerates the DESIGN.md tables
    fetch-fonts.mjs       # Archivo and Monaspace Neon, both OFL
    unzip.mjs             # single-entry zip reader; this machine has no unzip
    check-version.mjs     # the tag and every package agree
    release-notes.mjs     # changelog section plus the commits since the previous tag
  packages/
    tokens/               # @sltio/aion-tokens — the product
    vscode/               # the .vsix
    terminal/             # Windows Terminal fragment plus snippet
    css/                  # custom properties and Tailwind v4 @theme
  .github/workflows/      # ci.yml on every branch, release.yml on a v*.*.* tag
  RELEASING.md            # secrets, the tag procedure, the dry run
  apps/
    lab/                  # Vite plus TypeScript, no framework
```

TypeScript, `culori` (test only), `vitest`, `vite`. npm workspaces, because this machine
has npm 11 and no pnpm.

---

## Task 1 — `packages/tokens` — done

`packages/tokens/src/` is the source of truth.

| File | Holds |
|---|---|
| `oklch.ts` | conversion, gamut, `contrast`, `contrastEmitted`, `solveLightness` |
| `palette.ts` | dark ramp, accents, syntax map, ANSI 16, `dimText`, the rules |
| `light.ts` | light ramp, `lightAccent`, `lightAccentScale` |
| `semantic.ts` | 71 dark aliases, 36 light aliases |
| `status.ts` | 4 statuses × 5 values, both schemes |
| `preview.ts` | `buildPalette(overrides)` — the parameterised palette the lab drives |
| `report.ts` | the build gate and the `DESIGN.md` tables |
| `rivals.ts` | the four rival themes, so the README table is reproducible |
| `flatten.ts` | dotted name → hex |

`buildPalette()` with no overrides is asserted to equal the shipped palette exactly. That
assertion is what stops the lab advertising a theme the extension does not ship.

## Task 2 — the contrast report — done

`npm run verify` prints every check, its hex, its surface and its ratio, and exits
non-zero on any failure. `npm run sync:design` writes nine tables in `DESIGN.md` and the
rival tables in both READMEs from the same data, so no hex and no ratio in any of those
documents is typed by hand.

Since the review the gate composites decorations. A translucent overlay is blended as
8-bit bytes by `compositeEmitted` and the ratio is read afterwards, and `states.ts` names
the set of backgrounds that a syntax colour is guaranteed on. That is what took the gate
from a plain-background check to one over every state, and `readingStates()` takes the
palette it measures, so the lab reports the same set rather than a list of its own.

## Task 3 — `packages/vscode` — done

Language overrides for Markdown, JSON, YAML, HTML, CSS and JSX/TSX. No italics. The key,
rule and token counts are in the generated table in §3 of `DESIGN.md`.

A rule may only use a colour `readingForegrounds()` names, and a test derives that list
from the emitted theme. Four rules used `dimText`, which is chrome, so no decoration was
solved against them and no test measured them.

Every key whose value carries an alpha byte names the opaque key it is painted over, in
the `OVER` table in the theme test. A new alpha key with no entry fails a test rather
than being skipped.

`themes/aion.json` is committed and is the snapshot: a test asserts it equals the
generated theme, so a one-line palette change appears as a reviewable JSON diff.

`npx vsce package --no-dependencies` succeeds and carries the listing icon.

## Task 4 — `packages/terminal` — done

`fragments/aion.json` installs the scheme without a settings edit.
`snippets/settings.json` is a whole settings fragment, so a reader merges it at the root
or copies the object inside its `schemes` array; a test holds the README to that shape and
to the two directories the loader reads. A test asserts the bright eight are
byte-identical to the syntax accents.

## Task 5 — `packages/css` — done

`css/aion.css` carries both schemes under `prefers-color-scheme` and `[data-theme]`, plus
a base layer, so a page that sets no colours of its own renders correctly.
`css/aion.theme.css` maps every variable into a Tailwind v4 `@theme inline` block, so a
utility resolves at the element that carries it and a nested `[data-theme]` region works.
The element rules live in the `base` cascade layer, so a utility overrides them; Tailwind
has to be imported first, because its preflight is in the same layer.

---

## Task 6 — `apps/lab` — done

Vite plus TypeScript, no framework. Five surfaces: VS Code, Windows Terminal, a landing
page, an admin dashboard and a documentation page. Six OKLCH sliders drive all five.

The surfaces are written once. A control change sets custom properties on the document
root and nothing else, so a re-render is a variable update rather than a DOM rebuild.
Read `apps/lab/README.md` for the module map and the rules the tests hold in place.

Still open: GitHub Pages. The build is static and needs only a `base` and a workflow.

## Task 7 — release — done

`.github/workflows/ci.yml` runs the gate on every branch and pull request under Node 22
and Node 24, then packages the extension and uploads it.
`.github/workflows/release.yml` runs on a `v*.*.*` tag: it checks the version, runs every
gate, packages, publishes to the Visual Studio Marketplace and to Open VSX, and creates
the GitHub release.

Both workflows assert that a build and a `sync:design` change nothing in the tree. A
generated file that drifts from its source fails the build.

`scripts/check-version.mjs` compares the tag against every package under `packages/`.
`scripts/release-notes.mjs` takes the `CHANGELOG.md` section for the version and appends
the commits since the previous tag, grouped by the verb that opens each subject line. It
exits non-zero when the changelog has no section for the version.

A `0.x` tag publishes with `--pre-release`; the first `1.0.0` publishes to the stable
channel. The flag is baked into the `.vsix` at package time.

Read `RELEASING.md` for the secrets, the one-time Open VSX namespace and the dry run.

## Task 8 — listing

`packages/vscode/README.md` is written and carries the rival contrast table, because that
table is the reason to install Aion over One Dark Pro.

Still open:

- **Four screenshots:** editor, diff, terminal, sidebar. Install the `.vsix` in a real
  VS Code window and capture them there. The lab is a good rehearsal, but a marketplace
  screenshot has to be the editor itself. Nothing is committed for them yet.

---

## Order and parallelism

Tasks 1 to 7 are done. Task 8 needs four screenshots from a real editor.

## What is still unverified

Every number in this repository is calculated from configured colours. None of it has
been seen rendered. These remain open, in the order they matter:

- **VS Code, dense TypeScript and TSX**, semantic highlighting on and off, the six
  language overrides, and an ordinary installed font rather than the lab font.
- **The states the gate now covers**, confirmed in the editor rather than in a
  calculation: comment search, selection, the current line, hover and peek code, line and
  word diffs, and overlapping decorations. In particular, confirm that VS Code applies
  `editor.findMatchForeground` and `editor.findMatchHighlightForeground` as the docs say,
  and that a peek editor takes `peekViewEditor.background` under its code.
- **Keyboard navigation** through lists and controls, so the raised `border` and the
  solid gold `list.focusOutline` are visibly the focused item.
- **Git conflicts and debugging state**, now that violet has left both.
- **Unused code.** The fade is gone, because no opacity keeps a syntax colour above the
  floor, and `editorUnnecessaryCode.border` draws a dashed underline instead. Confirm the
  underline is visible and that the language service still marks an unused import.
- **The terminal scenarios**: SGR 30, bright black prompt text, coloured backgrounds and
  reverse video, in the VS Code panel and in Windows Terminal. Record whether either
  applies a minimum-contrast correction that changes the requested colours.
- **A sustained working session** at the user's own brightness and scaling, for
  hierarchy, distraction and readability. The comment moved from 4.53:1 to 5.78:1 and the
  decorations came down to meet it; whether that reads as intended is a judgement, not a
  measurement. Label that feedback separately from the numbers.

## Definition of done for the whole plan

- `npm run verify` exits 0. **Met.**
- Every test passes, including the snapshots. **Met.**
- The `.vsix` installs and renders correctly in VS Code. **Packages; not yet installed.**
- The Windows Terminal fragment installs and renders correctly. **Not yet installed.**
- The lab renders all five surfaces from the same token module. **Met.**
- `DESIGN.md` and the emitted values agree. **Met, and asserted by a test.**
- Every shared claim agrees with the emitter. **Met: every table and every count in
  `DESIGN.md` and the three READMEs is generated, and a test rejects any hex in six
  documents that the token package does not emit.**
