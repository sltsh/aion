# Aion adversarial review

Reviewed 2026-09-05 at `3b143a1`, branch `design/palette-exploration`.

Expanded after a coverage audit on the same date. The original six-finding pass concentrated on VS Code and its gate; it was **not a complete project review**. This revision adds the CSS package, browser behavior, lab readout and claims, terminal installation instructions, clean workspace bootstrap, and release failure handling. There are **14 findings**. The coverage table below distinguishes reviewed source, executed checks and work that remains unverified.

**All fourteen findings are implemented.** Each one carries a **Resolved** line naming
what changed and the test that holds it. `CHANGELOG.md` carries the same record in
release form. Nothing below has been edited otherwise: the report is the report.

**Verdict:** the core colour calculations are useful, but the green suite does not substantiate the advertised contrast guarantee. Shipped VS Code and CSS styles produce reproducible sub-floor text; a fresh CI checkout cannot reach the gate in the current command order; and a later release prerequisite can fail without stopping publication. Fix those boundaries before further palette tuning or expansion of the theme.

This is a source, generated-artifact, calculation, browser and configuration review. No native VS Code or Windows Terminal rendering was observed. Prior native-renderer assertions in comments were not independently confirmed across the supported VS Code version range. No implementation changes or publishing were performed.

## Findings

### 1. High — Four shipped TextMate rules escape the decorated-text gate

**Resolved.** The four rules take the comment, the dimmest colour a rule may use.
`theme.test.ts` derives every foreground from the emitted theme, rejects one
`readingForegrounds()` does not name, and measures each on every covered state.

**Locations:** `packages/vscode/src/tokens.ts:55,81,92,109`; `packages/tokens/src/states.ts:100`; `packages/vscode/test/theme.test.ts:406`.

`Deprecated`, `Markdown separator`, `Markdown strikethrough` and `HTML doctype` use `c.dim`. `readingForegrounds()` includes comments, punctuation and the accent role map, but excludes this colour. The test named “the token rules agree with the reading states the gate covers” checks that same reduced list rather than the token rules. The separate test that actually iterates the rules checks only the plain editor.

Measuring the emitted foreground against the existing, explicitly covered states gives:

| Background | Contrast of these four rules |
|---|---:|
| Editor + current line | 4.374:1 |
| Editor + selection | 3.847:1 |
| Current find match | 3.380:1 |
| Editor + selection + added line + added word | 3.372:1 |

Selecting an HTML doctype or searching struck-through Markdown therefore violates the claim without needing an exotic decoration combination. All current tests pass.

**Fix:** test every distinct emitted TextMate and semantic foreground against the covered states. Either give these rules a reading-safe foreground or include their dim colour in the budget and solve accordingly. Add a completeness assertion so a new foreground cannot silently bypass the gate. Do not merely raise the comment again: it is not the dimmest syntax colour being shipped.

### 2. High — Unused-code opacity is incorrectly classified as non-reading decoration

**Resolved.** `codeEditorWidget.ts` writes the alpha byte as a CSS `opacity` on the
glyph, so the key is modelled as a foreground opacity and not as a wash. No fade is
affordable — VS Code's own `#000a` default reads 2.69:1 — so unused code keeps its colour
and takes the dashed underline `editor.css` draws from `editorUnnecessaryCode.border`.

**Locations:** `packages/vscode/src/colors.ts:216`; `packages/vscode/test/theme.test.ts:252,266,319`.

`editorUnnecessaryCode.opacity` sets alpha to 128/255. Its `OVER` entry says `reads: 'none'`, so the tests skip it. The nearby comment says opacity masks sit beside or behind text. This particular key fades the text itself; that behavior is documented in the [VS Code theme-color reference](https://code.visualstudio.com/api/references/theme-color#editor-colors).

Compositing an emitted variable foreground at that opacity over the plain editor gives **2.627:1**. A keyword gives **2.819:1**. An unused variable reported by the language service is a normal way to encounter this, with no selection or other overlay required.

**Fix:** model foreground opacity separately from background washes. Solve the opacity against the supported foreground/background pairs, retain full-opacity text with another unnecessary-code cue, or explicitly disclose an additional exemption. Removing the key alone is insufficient unless the inherited default is also checked. The current “three exemptions, and only three” claim excludes this behavior.

### 3. High — CI and release typecheck before their required generated dependency exists

**Resolved.** The root `build` and `typecheck` build the token package by name first,
`prepare` builds it after an install, and both workflows build before they check.
Reproduced and re-checked in a disposable checkout with no `dist`.

**Locations:** `.github/workflows/ci.yml:29-41`; `.github/workflows/release.yml:52-62`; `packages/tokens/package.json:8-14`; `package.json:12`.

Both workflows run typecheck before verify/build. Consumers resolve `@sltio/aion-tokens` through `dist/index.d.ts` and `dist/index.js`. `dist` is ignored and untracked, and there is no install hook that creates it.

A temporary copy of the CSS and token packages, with workspace resolution pointed at the copied tokens and no `dist`, reproduces TypeScript exit 2:

```text
packages/css/src/variables.ts(4,8): error TS2307: Cannot find module '@sltio/aion-tokens' or its corresponding type declarations.
```

The prepared local checkout passes because generated files already exist. This is a dependency-order failure, not evidence that the runner needs different credentials.

Simply moving the existing root build earlier is also insufficient: the observed workspace order starts CSS before tokens. The root build is not a dependency-aware build.

**Expanded verification:** repeated this using a complete `git archive HEAD` checkout in `/tmp/aion-full-clean-review-4p65wjmz`, with external installed dependencies linked in and workspace aliases pointed at the copied packages. Initial root typecheck and root build both exited 2 with missing token-module errors in CSS and Terminal. After that build eventually reached the token emitter, typecheck exited 0. This isolates generated dependency order without relying on the earlier two-package fixture. This was not a fresh network `npm ci` run.

**Fix:** explicitly build tokens before checking or building consumers. Moving `npm run verify` before typecheck supplies that prerequisite in CI, since verify builds tokens. Make the public root build work from a clean checkout as well. Validate that bootstrap in a disposable checkout without generated files.

### 4. Medium — The colour-vision paragraph describes a palette that is no longer shipped

**Resolved.** The listing names the opaque gutter strips as the measured pair, which is
what the invariant test asserts, and a second test records what the line washes separate
by.

**Location:** `packages/vscode/README.md:89-95`; compare `packages/tokens/src/palette.ts:95-108`.

The listing says diff fills separate by 0.06 in OKLCH lightness, with the added fill above the editor and removed fill below it. The emitted line washes, composited on the editor, measure:

| Surface | OKLCH lightness |
|---|---:|
| Editor definition | 0.195 |
| Added line wash | 0.2243 |
| Removed line wash | 0.2464 |

Both fills are lighter than the editor, and their gap is approximately **0.0221**, not 0.06. The implementation explicitly moved the separation guarantee to the opaque gutter strips. The listing still attributes it to the fills.

**Fix:** identify the gutter strips as the measured pair and remove the above/below assertion about line fills. Keep the existing caveat that lightness separation is not a demonstrated colour-vision usability result. Test or generate this claim from its actual operands.

### 5. Medium — The published state guarantee is broader than the executable contract

**Resolved.** §3.1 of `DESIGN.md` lists every covered state and the foreground that
reads worst on it, generated from `readingStates()`. A generated counts table replaced
every hardcoded count in `DESIGN.md` and the three READMEs; `PLAN.md` names the command
instead. The build claim now names `verify` and CI.

**Locations:** `packages/vscode/README.md:70-76`; `DESIGN.md:45-53`; `packages/tokens/src/states.ts:39-64`.

The documents promise “any stack” of current line, selection and word highlight, followed by diff washes on any of those. The implementation deliberately excludes current-line-plus-selection and permits only plain/current-line/selection as diff bases. It does not include word highlights in those diff bases, or diff stacks on the peek editor.

That does not establish that every omitted combination is a native bug; some exclusions may be correct renderer modeling. It establishes that the prose promises a larger set than the one checked. The stale state count is 25; the function now returns **35**.

Other drift survived a successful `sync:design`:

| Claim | Current artifact or result |
|---|---|
| 630 interface keys | 622 |
| 54 TextMate rules in the listing | 64 |
| 122 tests in root README / 141 in PLAN | 155 |
| 397 checks in PLAN | 600 report rows |
| Four violet interface keys | Allowlist contains five, including ANSI bright magenta |

The root README also says a below-floor token fails “the build.” `npm run build` runs emitters, while `verify` and tests are separate commands. The workflow intends to combine them, but the build command itself is not that gate.

**Fix:** generate the covered-state description and counts, or remove counts that add no user value. State that validation/CI enforces contrast. Preserve renderer-based exclusions and describe them accurately instead of expanding the state space just to match stale copy.

### 6. Medium — The development packer deletes unrelated release artifacts and can reuse versions

**Resolved.** The script removes only its own development archives and keeps its counter
in `packages/vscode/.dev-version`.

**Location:** `scripts/pack-dev.mjs:16-32`.

After packaging a development build, the script deletes every `.vsix` in the extension directory whose name lacks `-dev.`. That includes a deliberately retained release candidate or an unrelated extension archive. Creating a development package does not require this cleanup.

Its “every test build gets its own version” promise also depends on keeping every prior development archive in that directory. Removing those ignored files resets the counter, even if that version remains installed in VS Code. This defeats the script's stated cache-avoidance strategy. The sequence defect is established by inspection; the cache symptom was not reproduced in a native editor.

**Fix:** remove broad artifact deletion. Use a build identity that survives archive cleanup, or explicitly manage a persistent counter. Keep development artifacts clearly separated from release artifacts without modifying unrelated files.

### 7. High — The CSS selection style makes ordinary light-theme text fail the floor

**Resolved.** `::selection` sets a foreground as well as a background, and the pair is
measured on every surface a selection can land on, in both schemes. Confirmed in Chromium
151.

**Locations:** `packages/css/src/build.ts:25`; `packages/css/src/variables.ts`, `light()`; `packages/css/test/css.test.ts:85-120`.

The stylesheet applies a global selection background without changing the foreground. In light mode that overlay uses the relatively dark hover surface at 90% opacity. The CSS tests measure text on the plain page, not on its selection.

Compositing the emitted selection over the light page gives **3.468:1** for `.aion-dim`/`small` and syntax comments, **3.951:1** for a link, and **3.937:1** for syntax variables. Dark-mode dim text also drops to **3.847:1** under selection. These are styles the package provides itself, not arbitrary consumer colour combinations.

A separate Chromium probe confirmed that `getComputedStyle(element, '::selection').color` retains the original link and small-text foregrounds in both schemes; the browser does not supply a corrective selection foreground here.

**Fix:** test selection in both schemes against the foregrounds the base layer actually uses. Solve separate selection budgets or explicitly set a compatible selection foreground in the CSS layer. A VS Code workaround forbidding syntax foreground overrides is not a browser limitation.

### 8. Medium — CSS form controls retain the boundary defect fixed in VS Code

**Resolved.** The control rules use `--aion-border-ui`, the light border moved to
lightness 0.605, and `BOUNDARY_PAIRS_LIGHT` puts the light scheme under the same
both-surfaces gate as the dark one. The test reads the generated rule, not the token.

**Locations:** `packages/css/src/build.ts:68-85`; `packages/css/test/css.test.ts`, the focus/UI-border test; `packages/tokens/src/light.ts:13`.

Inputs, textareas, selects and secondary buttons use the decorative hairline token. That border measures **1.407:1** against the dark input and **1.212:1** against the light input. A Chromium computed-style probe confirmed that the generated input rule is actually applied.

The CSS test checks the unused-in-this-rule `border-ui` token against the page, so it cannot catch this mapping error. Merely switching the rule to that token fixes dark mode but leaves the light UI border at **2.563:1** against the light input. The light token itself was solved/tested against an easier surface.

**Fix:** use a functional boundary token and solve the light boundary against both input and surrounding surfaces. Assert the actual generated control rule and both pairs. This is a concrete violation of Aion's own boundary contract, independent of any broader accessibility certification.

### 9. Medium — Unlayered CSS defaults override Tailwind utilities

**Resolved.** The element rules are in the `base` cascade layer. Tailwind has to be
imported first, because its preflight is in the same layer; `packages/css/README.md`
documents the order and the reason. Checked with Tailwind 4.3.3 in Chromium 151.

**Location:** `packages/css/src/build.ts:12-97`.

The base element rules are emitted outside a cascade layer. Tailwind v4 utilities live in the `utilities` layer, so the base `button` background wins over `bg-bg-raised` even though the utility targets a class.

Compiled the shipped CSS and theme block with **Tailwind 4.3.3**, then loaded the result in **Chromium 151.0.7922.34**. A button with `class="bg-bg-raised"` remained gold instead of using the raised surface. A consumer following the documented integration cannot reliably customize the package's base elements with normal utilities.

**Fix:** put defaults in an appropriate base layer, document import/layer order, and test a real compiled utility on a base-styled element. Presence checks for CSS variable names do not test the cascade.

### 10. Medium — Tailwind colour aliases freeze the ancestor's theme in nested theme regions

**Resolved.** The aliases use `@theme inline`. A nested `[data-theme="light"]` region
now resolves `bg-bg-raised` and `text-fg-primary` against itself, confirmed in the same
browser fixture.

**Location:** `packages/css/src/build.ts:99-110`; `packages/css/README.md`, Schemes and Tailwind.

The package supports `[data-theme]` selectors on elements but emits ordinary `@theme` aliases that reference Aion custom properties. Those aliases resolve where they are defined, at the root, and their computed values are inherited.

In the same compiled browser fixture, a light region inside an explicitly dark root retained the dark raised background and dark-scheme primary text through `bg-bg-raised text-fg-primary`, even though the region's direct Aion variables were light. Root-only switching works; nested regions are the failing case.

**Fix:** emit `@theme inline` for aliases, so utilities reference the Aion variables at the consuming element. This is the case addressed by [Tailwind's guidance on referencing other variables](https://tailwindcss.com/docs/theme#referencing-other-variables). Add a nested-theme integration check.

### 11. Medium — The live lab reports “all clear” for a palette that fails decorated text

**Resolved.** `readingStates()` and `readingForegrounds()` take the palette they
measure, so the lab passes its preview palette to the same evaluator the gate uses. At
comment lightness 0.600 the readout reports the failure at 2.99:1 rather than ALL CLEAR.

**Locations:** `apps/lab/src/readout.ts:6-23`; `packages/tokens/src/preview.ts`; `apps/lab/README.md`.

The live readout checks syntax and comments only against the editor, with three extra plain UI pairs. It does not evaluate selections, find matches, diff stacks, terminal slots or boundaries. That recreates the exact plain-background blind spot the project says it fixed.

In Chromium, set Comment lightness to **0.600**. The readout still shows **ALL CLEAR**. The resulting comment measures **4.615:1** on the editor but **3.407:1** on the palette's selected-editor background. This is a calculation over the displayed preview palette, not a native VS Code observation. Lowering comments can therefore appear approved by the tool even though the advertised reading-state guarantee would fail.

**Fix:** let the existing reading-state evaluator consume the preview palette, or explicitly label this as a limited plain-surface readout. Do not create another independent list of states. The surface DOM identity remained unchanged through the slider update, and reset worked: preserve that useful behavior.

### 12. High — The release-notes pipeline swallows a failed prerequisite

**Resolved.** The step runs under `shell: bash` with `pipefail` and redirects instead of
piping. A root test executes the step's own script body against a tag with no changelog
section and asserts a non-zero exit.

**Location:** `.github/workflows/release.yml:79-80`; `scripts/release-notes.mjs`.

The workflow runs `node scripts/release-notes.mjs "$TAG" | tee release-notes.md` without specifying `shell: bash` or enabling `pipefail`. For an unspecified Linux shell, GitHub uses `bash -e`; explicit Bash also enables pipeline failure propagation. See [GitHub's shell behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsshell).

The notes script correctly exits non-zero for a missing tag or changelog heading, but a successful `tee` turns that pipeline into exit **0**. Reproduced locally under `bash -e`: the notes script printed a missing-tag error, the output notes file was empty, and the pipeline passed. The same mechanism masks the missing-heading branch relevant to a real release.

After fixing the earlier bootstrap failure, a tag lacking its changelog section can consequently reach publishing, despite RELEASING.md promising the release stops first.

**Fix:** set `shell: bash`, enable `set -o pipefail`, or write notes with direct output redirection and display them in a separate command. Exercise the missing-section failure path, not just successful note generation.

### 13. Medium — Both alternative Windows Terminal installation instructions are incorrect

**Resolved.** The Store path is gone; the README names the two directories the loader
reads, at a recorded revision, and tells a reader to merge the wrapper or copy the object
inside its `schemes` array. A test holds the README to the shape the package emits.

**Location:** `packages/terminal/README.md:24-29`; `packages/terminal/src/scheme.ts`, `settingsSnippet()`.

The main PowerShell fragment path is consistent with Microsoft's documented user fragment directory. The Store-specific alternative switches to `LocalState/Fragments`, however. The [official fragment instructions](https://learn.microsoft.com/en-us/windows/terminal/json-fragment-extensions#applications-installed-from-the-web) use the shared user directory, and the [current Terminal loader](https://github.com/microsoft/terminal/blob/main/src/cascadia/TerminalSettingsModel/CascadiaSettingsSerialization.cpp) enumerates that directory under LocalAppData and ProgramData. The documented Store alternative is not that discovery path.

The manual alternative says to paste the object in `snippets/settings.json` into the `schemes` array. That file contains a wrapper object with its own `schemes` array. Following the instruction literally produces a nested wrapper instead of a named colour scheme.

**Fix:** remove the unsupported Store path and instruct users to merge the wrapper at the settings root or copy only its `schemes[0]` object into the existing array. Native Windows installation remains untested; the JSON shape and documented/source discovery-path mismatches are independently verifiable.

### 14. Medium — The lab presents invented results as project history and current measurements

**Resolved.** The KPIs, the chart and the Pairs table are generated from `checks()`. The
invented history is gone, and a test asserts every row of the table is a row the gate
produced.

**Locations:** `apps/lab/src/render/dashboard.ts:10-25,72`; `apps/lab/src/figures.ts`; `apps/lab/test/lab.test.ts`, sample-data checks.

The dashboard hardcodes 154 checked tokens, two exemptions, numeric deltas, historical chart bars and a claim that the gate has stayed above the floor since 0.0.9. Its Pairs table also hardcodes a failing boundary ratio. These sections are not marked as samples; the nearby alerts alone carry that label and partly use generated real results. The actual gate currently has 600 rows and five exempt rows.

The existing sample-label tests pass because they count labels around the invented alerts. They do not establish that every invented claim is labeled. This is particularly misleading in a lab whose purpose is to provide evidence for the colour system.

**Fix:** label the entire dashboard as illustrative, or generate the current metrics and remove unsupported historical claims. Label generated shipped-palette metrics as such when sliders are active; those fixed surface figures do not update with the preview.

## Flags and renderer-sensitive decisions

- **`semanticHighlighting: true` is a reasonable choice.** It means a language service can supersede TextMate colours. The current tests prove configured colour ratios, not agreement between real semantic classifications and grammar scopes. Include at least one native TypeScript sample with semantic highlighting enabled and disabled before claiming those layers stay in step.
- **`uiTheme: vs-dark` and `type: dark` are consistent.** The absence of an explicit italic style is also consistent with the intended theme. User customizations and extension-provided styling are outside this review's guarantee.
- **The release channel flags are placed sensibly.** Packaging with `--pre-release` for 0.x and publishing that VSIX is consistent with the installed vsce implementation and [VS Code's publishing guidance](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions). Numeric release versions are correctly distinguished from local `-dev.N` versions; those development suffixes should not be promoted to Marketplace releases. CI's artifact uses the plain package command, so it does not rehearse the 0.x pre-release flag baked into the release artifact.
- **`--no-dependencies` fits the generated theme.** Its runtime payload is JSON; the token package is a build dependency for this artifact. No native install-script approval is necessary to establish that. `--skip-duplicate` supports retries, but does not prove an existing remote version has identical bytes.
- **The 47-key high-contrast fixture is a design policy, not a VS Code prohibition.** A key having no default in a dark theme does not by itself make an explicit value invalid. Keep the useful anti-clutter decision, but justify exceptions by their visual function rather than treating upstream defaults as an API ban.
- **Renderer workarounds need a version boundary.** The find-foreground swap and overlay-order comments describe specific source behavior, while the manifest allows VS Code from 1.80 onward. The current tests assert the chosen configuration, not that each supported editor implements that behavior. Record the source revision and validate a named editor version; this review does not establish that the workaround is wrong.

## Design and complexity assessment

The dependency-free token core, emitted-byte contrast measurements, compositing helpers, generated consumers and explicit border pairs are justified by the product. A rewrite or new abstraction layer would not address these findings.

The excessive part is maintaining **622 explicit workbench overrides plus parallel lists of assumed surfaces, foregrounds, exceptions and grammar scopes without corresponding renderer evidence**. A test requiring at least 300 colour keys rewards quantity, not correct coverage. A test proving every grammar scope matches *some* selector cannot establish that the most specific winning rule gives the intended colour. The omitted dim foreground demonstrates the cost of parallel inventories directly.

Prefer these reductions:

1. Make foreground completeness derive from the emitted theme, then measure those values with the existing token helpers.
2. Keep explicit overrides that establish Aion's identity, repair a measured fallback, or enforce a verified pair. Evaluate redundant overrides incrementally; raised chrome makes blind deletion unsafe.
3. Replace minimum-count and self-consistency claims with a few representative outcomes: doctype/search, unused variable, selected diff, semantic token precedence and keyboard focus.
4. Retain the solver as a design tool, but distinguish “satisfies constraints” from “maximizes a chosen mathematical objective.” A maximum-distance marker is not necessarily the best-looking marker.

Gold identity and the dark-editor/raised-sidebar arrangement are coherent choices. Their plain surface separation is intentionally subtle: the generated design table reports editor-to-sidebar contrast of 1.06:1. That is neither a text-contrast violation nor evidence the hierarchy reads clearly. Similarly, solving washes near a 4.5:1 text budget can make state markers hard to find. These trade-offs require native visual inspection, not another assertion that a ratio passes.

The rival comparison is responsibly limited to eight colours on one background; it should remain a descriptive snapshot rather than evidence that Aion is more usable. This review checked the comparison machinery and caveats, not a fresh extraction of all four pinned rival revisions. Revision labels are valuable, but immutable source links would make the snapshots easier to audit.

Additional maintenance observations, below the severity of the numbered findings:

- `packages/tokens/README.md` still quotes the old gold output and is omitted from `sync-design.mjs` and the document parity list. Generated-table correctness does not cover every package README.
- The documentation lab's “Solving a token” example omits `solveLightness`'s required direction, treats its numeric lightness return as a colour triple, and describes emitted-byte solving although this primitive intentionally uses continuous contrast. Correct or label the illustration before treating the lab as API documentation.
- `scripts/fetch-fonts.mjs` writes into `apps/lab/public/fonts`, while shipped `@font-face` URLs load `apps/lab/src/fonts`. A font refresh through that script does not update the fonts the built app uses. Review the fetch path and subset selection when maintaining those assets; the current files were loaded successfully.

## Validation and reproduction

### Coverage audit

The 119 tracked files were inventoried. Every shipped package and supporting-tool category was included in the expanded review. This is coverage of the repository's implementation areas, not a claim that every renderer state, dependency or historical mockup has been exhaustively verified.

| Area | Review and evidence | Remaining limits |
|---|---|---|
| Token core | Conversion, quantization/compositing, gamut tolerance, light solver, palette/status/semantic aliases, marker solver, flattening, public exports, preview, report, rivals and test strategy inspected; existing tests and new emitted-pair probes | No independent colour-science certification; frozen rival values not re-extracted from all four pinned revisions |
| VS Code | Colour groups, TextMate/semantic mappings, state inventories, alpha classification, border/HC exceptions, scope fixtures, manifest, generator and package contents reviewed; existing tests and missed-foreground probes | No native install or renderer acceptance; no complete supported-version matrix or real grammar/semantic tokenization pass |
| CSS | Dark/light variables, base styles, generated CSS, package exports, Tailwind adapter and tests reviewed; contrast probes and actual Tailwind compilation/browser computed styles | Chromium-only integration check; no Firefox/Safari or assistive-technology pass |
| Terminal | Scheme/fragment/snippet generation, ANSI mapping, both backgrounds, selection tests, package contents and install docs reviewed | No Windows Terminal runtime, SGR/reverse-video screen inspection or minimum-contrast-setting experiment |
| Lab | Entry/config, sliders/reset, palette-to-variable adapter, readout, figures, five surface renderers, code escaping, CSS and tests reviewed; all five surfaces loaded in Chromium | It remains a simulation of native applications; no full keyboard/screen-reader or prolonged usability session |
| Build/release | Root/workspace manifests, TS configs, tracked/ignored outputs, both workflows, version/notes/pack/sync scripts and VSIX whitelist reviewed; clean bootstrap and failing pipeline reproduced; VSIX built and inspected | No remote GitHub Actions execution, secret/environment-policy audit or Marketplace/Open VSX publication |
| Assets and maintenance tools | Icon references/copies, font paths, fetch/extraction scripts and packaging paths inspected; shipped lab assets loaded in browser | Fonts not downloaded again; binary license metadata and the full transitive dependency supply chain were not audited |
| Historical explorations | Inventory and entrypoints checked; separate legacy invariant suite executed, 14 passing tests | Five archived HTML experiments are not shipping outputs and did not receive a separate visual/claims audit; their old duplicated calculations are not evidence for current releases |
| Project documentation | DESIGN, PLAN, HANDOVER, CHANGELOG, release instructions and package READMEs compared with current implementation and generated output | This report records drift; it does not rewrite those documents |

The original broad validation results below were reused because production source did not change. Follow-up checks addressed previously uncovered behavior instead of rerunning the same passing suite.

In the existing prepared checkout:

| Check | Result |
|---|---|
| `npm run verify` | 600 rows: 567 pass, 0 fail, 5 exempt, 28 informational |
| `npm test` | 155 tests passed across five workspaces |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run sync:design` | Passed; no tracked generated changes |
| Fresh token/CSS fixture without `dist` | Typecheck failed with TS2307 |
| Native editors / Marketplace publish | Not run |

Additional evidence from the expanded pass:

| Check | Result |
|---|---|
| Complete archived checkout, first root typecheck/build | Both exit 2; typecheck passes after token build has occurred |
| `check-version.mjs v0.1.0` | All four package versions match |
| Local pre-release VSIX package | Succeeded: 7 archive files; 622 theme keys; pre-release metadata is `true` |
| Notes-script failure piped through `tee` under default shell semantics | Pipeline incorrectly exits 0 |
| Tailwind 4.3.3 + Chromium 151.0.7922.34 | Base-style override and nested-theme failures reproduced |
| Built lab browser smoke | Five surfaces; no page errors; slider preserves surface DOM; reset works |
| Viewports | 1440×1000 and 390×844: no document-level horizontal overflow; viewport screenshots inspected |
| Archived exploration tests, isolation disabled | 14 passed; separate from the 155 workspace tests |

Temporary reproduction materials: `/tmp/aion-browser-review.mjs`, `/tmp/aion-browser-review.json`, `/tmp/aion-tailwind-compiled.css`, `/tmp/aion-review-prerelease.vsix`, `/tmp/aion-lab-review-desktop-viewport.png`, `/tmp/aion-lab-review-mobile-viewport.png`, and the complete clean fixture named in finding 3. Tailwind was installed only under `/tmp`, with install scripts disabled. No project dependency changed.

The first sync attempt encountered a sandbox subprocess restriction; the permitted rerun succeeded. That was an environment limitation, not a project finding.

The following read-only probe reproduces the missed syntax states and unused-variable ratio after building tokens. It reads all colours from emitted artifacts:

```js
// Run with: node --input-type=module < probe.mjs
import { readFileSync } from 'node:fs';
import {
  compositeEmitted, contrastEmitted, hexToOklch, readingStates,
} from './packages/tokens/dist/index.js';

const theme = JSON.parse(readFileSync('packages/vscode/themes/aion.json', 'utf8'));
for (const rule of theme.tokenColors) {
  if (!rule.settings.foreground) continue;
  const foreground = hexToOklch(rule.settings.foreground);
  const worst = readingStates().map(state => ({
    state: state.name,
    ratio: contrastEmitted(foreground, state.background),
  })).sort((a, b) => a.ratio - b.ratio)[0];
  if (worst.ratio < 4.5) console.log(rule.name, worst);
}

const background = hexToOklch(theme.colors['editor.background']);
const opacity = parseInt(theme.colors['editorUnnecessaryCode.opacity'].slice(7), 16) / 255;
const variable = hexToOklch(theme.semanticTokenColors.variable);
console.log('Unused variable', contrastEmitted(
  compositeEmitted(variable, opacity, background), background,
));
```

**Recommended order:** repair clean bootstrap and release failure handling; fix foreground/fading, selection and control-boundary coverage; repair the CSS integration and lab feedback; correct claims; then perform native editor acceptance. More palette optimization before those steps risks optimizing against the same incomplete model.
