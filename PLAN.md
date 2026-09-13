# Aion — implementation plan

Read `DESIGN.md` first. It is the specification. This document is the order of work and
the record of what is done.

The 2026-09-05 adversarial review found fourteen defects and all fourteen are
implemented. `CHANGELOG.md` records each one, alongside the theme review of the same
date, defects 10 to 15 below. Every ratio here is a calculation over configured colours.
"Native acceptance" below records what was then checked in the applications themselves.
The CSS package was checked separately, in Chromium 151: its cascade, its nested-theme
case and its selection foreground.

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
| 9. `apps/site` — the public site | **done** | two pages, `apps/site/test` |

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
what the calculation assumes. "Native acceptance" below records that separately.

## Defects that running the code found

Fifteen, none of which was visible by inspection. This is why the plan is executed, not
read.

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

`main` is the working and default GitHub branch. The package release workflow is tag-driven,
while `pages.yml` deploys the public site from pushes to `main`.

```
aion/
  package.json            # npm workspaces root
  DESIGN.md  LIGHT.md  PLAN.md  README.md  LICENSE  CHANGELOG.md
  AGENTS.md  CLAUDE.md    # git-ignored; CLAUDE.md imports AGENTS.md
  assets/                 # the icon sources and the derivation note in assets/README.md
  test/                   # bootstrap, release notes and workflow tests
  scripts/
    sync-design.mjs       # regenerates the DESIGN.md tables
    fetch-fonts.mjs       # Archivo and Monaspace Neon, both OFL
    unzip.mjs             # single-entry zip reader; this machine has no unzip
    check-version.mjs     # the tag and every package agree
    release-notes.mjs     # changelog section plus the commits since the previous tag
    pack-dev.mjs          # a numbered development .vsix, from .dev-version
  packages/
    tokens/               # @sltsh/aion-tokens — the product
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
| `light.ts` | independent light ramp, native editor roles, overlays, diff, ANSI and `lightAccentScale` |
| `semantic.ts` | 71 dark aliases, 37 light aliases |
| `status.ts` | 4 statuses × 5 values, both schemes |
| `preview.ts` | `buildPalette(overrides)` and `buildLightPalette(overrides)` — parameterised scheme palettes |
| `report.ts` | the build gate and the `DESIGN.md` tables |
| `rivals.ts` | the four rival themes, so the README table is reproducible |
| `flatten.ts` | dotted name → hex |

`buildPalette()` with no overrides is asserted to equal the shipped palette exactly. That
assertion is what stops the lab advertising a theme the extension does not ship.

## Task 2 — the contrast report — done

`npm run verify` prints every check, its hex, its surface and its ratio, and exits
non-zero on any failure. `npm run sync:design` writes every generated table in
`DESIGN.md` and the rival tables in both READMEs from the same data, so no hex and no
ratio in any of those documents is typed by hand. The command prints how many it wrote.

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

`themes/aion-light.json` is generated from the complete light palette through the same
colour, TextMate and semantic-token factories. It contributes as `Aion Light` with
`uiTheme: vs`; its colour keys, selectors and semantic-token names stay identical to the
dark theme. The light palette is covered by the same emitted-colour and composite-state
calculations. Native light-editor rendering was checked and approved in VS Code on
2026-09-12 after the final palette, diff, minimap and inline Git blame adjustments.

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

GitHub Pages ships the public site, not the lab. The lab stays local. See Task 9.

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

A `0.x` tag publishes with `--pre-release`; versions `1.0.0` and later publish to the
stable channel. The flag is baked into the `.vsix` at package time.

Read `RELEASING.md` for the release prerequisites, tag procedure and dry run.

## Task 8 — listing

`packages/vscode/README.md` is written and carries the rival contrast table, because that
table is the reason to install Aion over One Dark Pro.

Still open:

- **Four screenshots:** editor, diff, terminal, sidebar. Capture them from the installed
  extension. The lab is a good rehearsal, but a marketplace screenshot has to be the
  editor itself. Nothing is committed for them yet.

---

## Task 9 — `apps/site` — done

The public site at https://aion.slt.sh. A landing page and a curated palette: foundations,
main colours with their syntax roles, and terminal slots, all read from `@sltsh/aion-css`.
The homepage shares the essentials selection and provides a generated terminal download.
The full token inventory and authored tables remain in the technical documentation.
Vite multi-page, no framework, HTML pre-rendered at build time, so the page reads with
JavaScript disabled. Navigation highlights the visible section on both pages.

The public site exposes both independently tuned schemes through a persistent header
switch. A first visit follows the system preference until the visitor explicitly chooses
a scheme; that choice then persists across both public pages. The VS Code package also
contributes `Aion Light` from the same light palette.

Read `apps/site/README.md` for the presentation scope and validation contract.

Still open: the DNS `CNAME` from `aion.slt.sh` to `sltsh.github.io`, and GitHub Pages
enabled for the repository with the custom domain. Neither lives in this repository.

## Task 10 — site light/dark theme switch — done

Added a persistent light/dark theme switch to the shared site header. The implementation
exposes the independently tuned light palette that already ships through
`@sltsh/aion-css`; it did not change either palette. Browser acceptance covered both
pages and themes at 1280px, 760px and 375px, including persistence, system following,
no-JavaScript rendering, active copy values, focus and responsive header behavior.

### Approved product contract

- On a first visit with no saved choice, follow `prefers-color-scheme`. Continue following
  system changes until the visitor explicitly chooses light or dark.
- A visitor's explicit choice persists across reloads and across the landing and palette
  pages. The preference is local UI state, not part of the URL.
- Put one compact two-option theme switch in the shared header, beside the GitHub action.
  Native radio inputs labelled Dark and Light expose the selected scheme directly.
- Switch the whole site together: page chrome, controls, code preview, homepage essentials,
  full palette, displayed colour values, copied colour values and brand artwork.
- Keep the palette's groups, roles and ordering identical between schemes. Each scheme
  reads only the values emitted for that scheme.
- The light palette may show its ANSI slots. The Windows Terminal download remains the
  existing dark Aion scheme and must be labelled accordingly; a light terminal release is
  outside this task.
- Use the approved `assets/aion-logo-light.png` and
  `assets/aion-wordmark-light.png` on light surfaces. Produce the missing light horizontal
  lockup from those approved assets and the approved horizontal composition, without
  reinterpreting the mark. Switch the header mark, hero lockup, footer wordmark and favicon.
- Ship the baseline with an immediate theme change. If motion is added during a later
  visual pass, keep it to one brief user-triggered phase change in the control or brand:
  precise, technical and recognizably Aion. Respect `prefers-reduced-motion` and avoid a
  page-wide colour transition.

### Visual contract

Colour continues to come only from the active scheme's emitted CSS variables. Archivo
remains the interface and display face; Monaspace Neon remains the code face. Preserve the
current page layout and add a compact trailing action group to the header:

```text
wide:   [Aion mark]          [navigation]          [Dark | Light] [GitHub]
narrow: [Aion mark]                         [Dark | Light] [GitHub]
        [navigation]
```

The switch should feel like part of the existing instrument-like chrome, not a generic
settings control. The header remains legible and operable at the current narrowest
breakpoint without hiding navigation or reducing the pointer target below the surrounding
header actions.

### Implementation sequence

1. Prepare theme-specific public assets. Export optimized light variants for the header,
   hero, footer and favicon; retain the approved source PNGs under `assets/` and record
   the approved light logo and wordmark in `assets/APPROVED_ASSETS.md`. Generate the light
   horizontal lockup from the approved parts, then obtain explicit visual approval before
   recording or using it. Verify transparent edges and its spacing against the approved
   dark composition.
2. Establish one theme-state owner around `document.documentElement.dataset.theme`.
   Resolve a saved choice before first paint, otherwise use the system scheme. Handle
   unavailable storage without breaking rendering or interaction.
3. Render the Dark/Light radio-style switch from the shared header used by both pages.
   Initialize its selected option from the effective scheme and persist explicit changes.
4. Make brand artwork resolve from the same effective scheme. The pre-rendered page must
   show system-matched artwork when JavaScript is unavailable; expose the interactive
   switch only when its behavior is ready.
5. Replace the palette-only toggle path. Make homepage and palette swatches show and copy
   the active scheme's emitted value, including after navigation, reload and a theme
   change. Remove `lightVisible`; the site theme is no longer a build-time feature flag.
6. Replace dark-only titles, descriptions, pitch and light-availability notes with
   theme-neutral copy. Update `apps/site/README.md` and this task's status when the feature
   is complete. Leave the unrelated `released` flag unchanged.
7. Extend site tests for initial resolution, persistence, system changes before an
   explicit choice, storage failure, accessible radio state, theme-specific assets,
   active swatch values and copy payloads. Measure the site's gold and teal uses on their
   actual light surfaces with `contrastEmitted`, as well as the existing dark cases.
8. Run `npm run verify`, `npm test` and `npm run typecheck`. `npm run sync:design` is needed
   only if implementation unexpectedly changes the palette, which requires separate user
   approval.

### Browser acceptance

- Check both pages in light and dark at desktop, the mobile breakpoint and the narrowest
  supported width. There is no header overflow, wrapping, overlap or clipped focus ring.
- With no saved preference, first paint, controls, artwork, swatches and copied values all
  match the system scheme. There is no flash of the other theme.
- An explicit choice survives reload, movement between both pages and a system-theme
  change. Clearing it restores system behavior.
- Keyboard focus is visible, the selected Dark or Light option is announced correctly,
  and reduced-motion behavior is immediate.
- Header mark, hero lockup, footer wordmark and favicon use the intended variant in both
  themes, load at their declared dimensions and remain sharp on high-density displays.
- JavaScript-disabled rendering retains readable, system-matched content and artwork;
  only the interactive switch and clipboard enhancement are absent.
- The light and dark code previews and marketing controls use their emitted scheme values,
  and every visible or copied palette value matches the active scheme.

Native editor acceptance is not required because this task does not change palette values.
Any palette adjustment discovered during site review stops this task for separate approval
and makes the affected calculation and native acceptance current again.

## Order and parallelism

Tasks 1 to 7, Task 9 and Task 10 are done. Task 8 needs four screenshots from a real
editor.

## Native acceptance

Checked in the applications themselves on 2026-09-05, not in a calculation:

- **VS Code, dense TypeScript and TSX**, semantic highlighting on and off, the six
  language overrides, and an installed font rather than the lab font.
- **Every state the gate covers**: comment search, selection, the current line, hover and
  peek code, line and word diffs, and overlapping decorations.
- **Keyboard navigation** through lists and controls, so the raised `border` and the
  solid gold `list.focusOutline` mark the focused item.
- **Git conflicts and the debugging state**, now that violet has left both.
- **Unused code**, which keeps its colour and takes the dashed underline from
  `editorUnnecessaryCode.border`.
- **The terminal scenarios**: SGR 30, bright black prompt text, coloured backgrounds and
  reverse video, in the VS Code panel and in Windows Terminal.
- **A sustained working session** at the user's own brightness and scaling.

The Aion Light theme was checked and approved in VS Code on 2026-09-12 after the final
palette, diff, minimap and inline Git blame adjustments. Any later palette change makes
the affected native acceptance a calculation again. The gate covers the named set of
reading states in §3.1 of `DESIGN.md`, not every state a renderer can produce.

## Definition of done for the whole plan

- `npm run verify` exits 0. **Met.**
- Every test passes, including the snapshots. **Met.**
- The `.vsix` installs and both themes render correctly in VS Code. **Met.** Aion was
  checked on 2026-09-05; both themes and the final inline-blame adjustment were checked
  on 2026-09-12.
- The Windows Terminal fragment installs and renders correctly. **Met.**
- The lab renders all five surfaces from the same token module. **Met.**
- `DESIGN.md` and the emitted values agree. **Met, and asserted by a test.**
- Every shared claim agrees with the emitter. **Met: every table and every count in
  `DESIGN.md` and the three READMEs is generated, and a test rejects any hex in six
  documents that the token package does not emit.**
