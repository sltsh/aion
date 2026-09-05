# Aion — theme review follow-up

Date: 2026-09-05. Status: findings documented; remediation pending.

## Objective and scope

Make Aion's everyday editor and terminal behaviour support its stated contrast and
interface rules. Preserve the current visual direction: cool dark surfaces, gold
interaction accents, teal secondary accents, familiar syntax, and no italics.

This handover records a review and proposed implementation work. Creating it did not
implement or approve a new palette direction. Read `AGENTS.md`, `DESIGN.md`, and the
current state in `PLAN.md` before implementation. Recheck Git state: the reviewed branch
was `design/palette-exploration`, with extensive staged, unstaged, and untracked work.

The colour system and visual direction are worth retaining. The immediate problem is
coverage of real rendering states and claims that exceed that coverage. A redesign,
new theme variants, additional editor ports, and release automation changes are outside
this follow-up.

## Review baseline

The review inspected token generation, VS Code mappings, tests, documentation, and all
five rendered browser-lab surfaces. These checks passed on 2026-09-05:

- `npm test`: 95 tests across five packages.
- `npm run typecheck`.
- `npm run verify`: 127 pass, 0 fail, 2 exempt, 25 informational checks.

Native VS Code installation, Windows Terminal installation, and sustained use were not
verified. A passing lab or package build is not evidence of those outcomes.

Ratios below were calculated from emitted values using `contrastEmitted`. For an alpha
background, composite its emitted RGB channels over the underlying emitted background
using the emitted alpha byte, round to 8-bit channels, then measure the resulting
colour. These are configured-colour calculations; confirm native foreground overrides,
decoration stacking, and terminal contrast correction before claiming exact rendered
results. Recalculate after any changes; the values below are baseline evidence.

## 1. Cover syntax on decorated and embedded surfaces — high priority

**Evidence:** `packages/tokens/src/report.ts` checks syntax against the plain editor,
primary text against diff fills, and records overlays as informational. The VS Code
tests also skip alpha pairs. The resulting gate misses common reading states.

| Comment background | Baseline contrast |
|---|---:|
| `editor.background` | 4.534:1 |
| `editor.lineHighlightBackground` over editor | 4.367:1 |
| `peekViewEditor.background` | 4.410:1 |
| `editorHoverWidget.background` | 3.951:1 |
| `diffEditor.insertedLineBackground` | 3.317:1 |
| `diffEditor.removedLineBackground` | 4.159:1 |
| `editor.findMatchBackground` over editor | 2.122:1 |
| `editor.findMatchHighlightBackground` over editor | 3.185:1 |

**Relevant files:**

- `packages/tokens/src/{oklch,palette,semantic,preview,report}.ts`
- `packages/tokens/test/{invariants,report,preview,semantic}.test.ts`
- `packages/vscode/src/{colors,tokens}.ts`
- `packages/vscode/test/theme.test.ts`
- `apps/lab/src/render/code.ts` and `apps/lab/src/styles.css`

**Work:**

1. Add reproducible failing checks for the applicable combinations above, covering all
   syntax foregrounds rather than only comments. Include word-level diff overlays on
   line fills and selection/search overlaps that the native editor actually renders.
2. Reuse or add one tested emitted-colour compositing helper. Gates must account for
   alpha; unknown backgrounds need an explicit mapping rather than silently skipping.
3. Tune token definitions and mappings to restore readable states. Prefer targeted
   overlay changes or appropriate foreground overrides before brightening the entire
   palette. Preserve the visual hierarchy between comments and executable code.
4. Check selected text in the native dark theme. `editor.selectionForeground` is
   documented for high contrast; the lab's forced primary foreground does not prove
   that setting applies to ordinary dark-theme selections. VS Code also exposes
   explicit current/other find-match foreground keys.
5. Feed the new supported-state checks into the shipping verification workflow. Where
   a renderer requires a deliberate exception, document the exact state and rationale;
   classify it openly instead of presenting it as a passing 4.5:1 pair.

**Done when:** supported text/background states meet 4.5:1 on emitted composites, the
relevant regressions fail against the old configuration, and native checks confirm the
assumed foregrounds and background layers. Final reporting distinguishes calculations
from native observations and names any remaining exception.

## 2. Separate functional boundaries from decorative separators — high priority

**Evidence:** the configured `list.focusOutline` against `list.focusBackground` is
2.606:1. `input.border` against `input.background` is 1.407:1. The current border tests
mostly exercise bright gold markers against dark surfaces, missing these mappings.

**Relevant files:** `packages/vscode/src/colors.ts`,
`packages/vscode/test/theme.test.ts`, `packages/tokens/src/semantic.ts`, and
`packages/css/src/build.ts` for the corresponding web-control usage.

**Work:** inspect list keyboard focus, input/dropdown/checkbox boundaries, and equivalent
web controls. Map functional edges to tokens that clear 3:1 against the relevant
adjacent surfaces. Keep decorative hairlines subtle. Check both sides where a focus
outline touches different surfaces; a ratio against the editor alone is insufficient.

**Done when:** functional boundary mappings have explicit surface-pair checks and clear
keyboard-focus identification in the native editor. Decorative exemptions identify
their use; they do not cover every key containing the word `border`.

## 3. Enforce the violet rule and align the lab — medium priority

**Evidence:** violet is used for `editorLightBulbAi.foreground`,
`gitDecoration.conflictingResourceForeground`, `scmGraph.historyItemBaseRefColor`,
`scmGraph.foreground5`, and `charts.purple`. Audit other interface uses, including symbol
icons. The lab renders conflicting filenames in coral while VS Code maps them to violet.
Its active activity icon also uses primary text where VS Code uses gold.

**Relevant files:** `packages/vscode/src/colors.ts`,
`packages/vscode/test/theme.test.ts`, `apps/lab/src/render/{editor,code}.ts`,
`apps/lab/src/styles.css`, and `apps/lab/test/lab.test.ts`.

**Work:** use the existing non-violet palette for interface roles. Coral is a natural
candidate for conflicts; choose graph colours for distinguishability and lightbulb
colours for their action role. Preserve violet syntax and the specified bracket cycle.
Add a test over the emitted VS Code interface mapping with a small, explicit syntax
allowlist. Check actual semantic mappings in the lab, including Git decorations,
activity state, selections, word highlights, and find matches.

**Done when:** violet appears only in permitted syntax contexts, the lab represents the
same demonstrated mappings as the extension, and a regression to an interface violet
or a mismatched preview fails a focused test. Keep the lab's one-time surface rendering
and root custom-property updates intact. A manually tokenised sample still does not
replace native grammar and semantic-token verification.

## 4. Verify terminal semantics — high priority

**Evidence:** ANSI black is described as a separator that never carries text, but SGR
30 explicitly selects black foreground. The configured contrast is 1.307:1 on the
integrated-terminal background. Bright black is 4.488:1 there; the existing ANSI gate
uses the darker standalone-terminal background instead.

**Relevant files:** `packages/tokens/src/{palette,report}.ts`,
`packages/vscode/src/colors.ts`, `packages/vscode/test/theme.test.ts`,
`packages/terminal/test/scheme.test.ts`, and both terminal-facing READMEs.

**Work:**

- Check normal and bright foreground slots against both supported terminal backgrounds.
  Adjust bright black to clear the floor on both.
- Exercise SGR 30, bright black prompt text, coloured backgrounds, and reverse video in
  both native terminals. Record any terminal minimum-contrast setting that modifies the
  requested colours.
- Treat ANSI black as a compatibility decision: raising it can change backgrounds and
  reverse-video appearance. Record the chosen compromise and exact supported guarantee.
  A narrow, honest limitation is preferable to asserting that applications cannot use
  the slot for text. Retain editor/terminal accent parity where the design specifies it.

**Done when:** both background gates cover the appropriate foreground slots, native
terminal evidence is recorded, and the ANSI black policy accurately describes the
trade-off. Do not claim all possible ANSI foreground/background combinations are safe.

## 5. Correct claims and colour-vision evidence — medium priority

**Relevant files:** `DESIGN.md`, `README.md`, `packages/vscode/README.md`, `PLAN.md`,
`packages/tokens/src/{report,rivals}.ts`,
`packages/tokens/test/{invariants,design-parity}.test.ts`, and lab render modules.

**Work:**

- Regenerate the Aion minimum: the READMEs say 4.61, while the reviewed comment is 4.534.
  Generate shared comparison values or add parity coverage so listing copy cannot drift.
- Replace “every other dark theme does the reverse.” Nord's current editor and sidebar
  use the same background. Describe Aion's own hierarchy without a universal claim.
- Scope the contrast guarantee to the tested states and documented exceptions. Remove
  “room to spare” unless the final measurements justify it. A count of 628 interface
  keys does not establish that no key can fall back to a VS Code default.
- Record source URLs, theme variants, and preferably commit identifiers for rival
  measurements. Distinguish a comparison of eight syntax roles from whole-theme
  accessibility or usability. Refresh data when refreshing the comparison.
- The colour-vision test checks a 0.06 OKLCH lightness gap for two pairs; that alone does
  not establish deuteranopia usability. Retain it as a palette invariant, narrow the
  claim, and verify labels/icons/diff markers carry meaning alongside colour. Any
  simulation evidence must identify its method and limitations.
- Treat “colour is computed, not chosen” as positioning, not proof of visual quality.
  Computation validates chosen constraints; rendered review determines balance.
- Keep illustrative lab figures clearly distinguishable from live measurements. Update
  stale examples and reconcile `PLAN.md` completion claims with the new evidence.

**Done when:** shared numerical claims agree with generated output, comparison sources
are traceable, and accessibility statements match what was actually checked.

## Visual decisions to preserve or revisit separately

The review found the dark base, gold, and teal coherent. Syntax is colourful and crisp;
coral variables are visually prominent. The sidebar/editor contrast is only 1.060:1,
so gold markers and borders provide more immediate identity than surface elevation.
The overall impression is familiar syntax with restrained warm interface accents;
Ayu Dark is a close interface relative.

Keep that direction during remediation. A stronger sidebar separation, quieter coral,
or a wider departure from One Dark Pro's hue map would be an additional design choice.
If pursued later, compare the same real code and UI states before changing the rules.
The current hue-drift limit trades originality for familiarity; neither goal is an
automatic correctness requirement. Light web gold's olive appearance is an existing
documented consequence, not a reason to add a light editor theme to this task.

## Verification and handoff

Use focused tests while addressing each finding. After the final palette/mapping changes,
build the affected outputs, run `npm run sync:design`, then run the required full checks
from `AGENTS.md` once. Inspect generated diffs and keep preview defaults equal to the
shipped palette. Preserve existing user changes when checking generated-file drift.

For native acceptance, record application versions, relevant settings, and evidence for:

- Dense TypeScript/TSX with semantic highlighting on and off, plus the six declared
  language overrides; ordinary installed fonts as well as the lab font.
- Comment search, selection, current-line highlighting, hover/peek code, line and word
  diffs, and overlapping decorations.
- Keyboard navigation through lists and controls, Git conflicts, and debugging state.
- The terminal scenarios in section 4, in VS Code and Windows Terminal.
- A sustained working session for hierarchy, distraction, and readability at the user's
  normal brightness and scaling. Label subjective feedback separately from measurements.

Produce the four native marketplace screenshots already required by `PLAN.md` when the
corresponding surfaces pass. If a native environment is unavailable, finish independent
code and documentation work, then identify the exact unchecked scenarios; leave native
acceptance open. Completion reports should list resolved findings, validation evidence,
remaining exceptions, and any design decisions requiring user input.

## External references

- [VS Code editor colours and foreground overrides](https://code.visualstudio.com/api/references/theme-color#editor-colors)
- [Windows console text formatting and ANSI foreground semantics](https://learn.microsoft.com/en-us/windows/console/console-virtual-terminal-sequences#text-formatting)
- [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C use of colour](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [Nord theme definition](https://github.com/nordtheme/visual-studio-code/blob/develop/themes/nord-color-theme.json)
- [Ayu VS Code](https://github.com/ayu-theme/vscode-ayu)
- [One Dark Pro](https://github.com/Binaryify/OneDark-Pro)
- [Catppuccin VS Code](https://github.com/catppuccin/vscode)

These references were consulted during the review; upstream branches can change.
