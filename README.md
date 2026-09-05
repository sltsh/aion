# Aion

A dark theme and a colour system for editors, terminals and web interfaces.

The name comes from the Ancient Greek αἰών: an age, an epoch, a span of existence. An
ancient word with a futuristic appearance, which is where the gold and the teal come from.

**Familiar syntax, distinct chrome.** Syntax follows the One Dark Pro role map, so muscle
memory survives. Identity comes from the base, the gold chrome and the structure: the
editor is the **darkest** surface and the sidebar is raised above it.

| Theme | Editor | Sidebar | Order |
|---|---|---|---|
| One Dark Pro | `#282c34` | `#21252b` | sidebar below editor |
| Ayu Mirage | `#242936` | `#1f2430` | sidebar below editor |
| Nord | `#2e3440` | `#2e3440` | one surface |
| Catppuccin Mocha | `#1e1e2e` | `#1e1e2e` | one surface |

**The contrast floor is a gate, not a claim.** Every token is defined in OKLCH and checked
against the surface it sits on, decorations composited the way the renderer composites
them. `npm run verify` exits non-zero on a token below its floor, and CI runs it on every
branch, so a colour below the floor cannot be released. The gate covers a named set of
reading states, not every state a renderer can produce; §3.1 of `DESIGN.md` is the set,
and there are three documented exemptions.

| What the gate checks | Count |
|---|---:|
| Rows measured | 611 |
| Below their floor | 0 |
| Exempt rows, all documented | 5 |
| Reading states per syntax colour | 35 |
| Lowest ratio in a reading state | 4.50:1 |
| Interface keys the theme sets | 622 |
| TextMate rules | 64 |
| Semantic tokens | 32 |

| Theme | Lowest ratio | Below 4.5:1 | Source |
|---|---|---|---|
| Aion | 6.95 | none | — |
| One Dark Pro | 3.73 | comment, variable | [One Dark Pro](https://github.com/Binaryify/OneDark-Pro/blob/main/themes/OneDark-Pro.json) @ `54c3280` |
| Ayu Mirage | 3.42 | comment | [Ayu Mirage](https://github.com/ayu-theme/vscode-ayu/blob/master/ayu-mirage.json) @ `444ef92` |
| Nord | 2.43 | comment, number | [Nord](https://github.com/nordtheme/visual-studio-code/blob/develop/themes/nord-color-theme.json) @ `8ead098` |
| Catppuccin Mocha | 5.81 | none | [Catppuccin Mocha](https://github.com/catppuccin/vscode/blob/main/packages/catppuccin-vsc/src/theme/tokens/index.ts) @ `befc9e6` |

Eight syntax roles on a plain editor line, against each theme's own editor background,
read on 2026-09-05 at the revision named. Every table here is generated: `npm run
sync:design` rewrites them from the token package and the emitted theme, so the copy
cannot drift from the emitter. This compares eight colours, not accessibility and not
usability.

## Packages

| Package | What it ships |
|---|---|
| `packages/tokens` | `@sltio/aion-tokens` — the OKLCH definitions and the build gate |
| `packages/vscode` | the VS Code extension: the theme, its gate and its scope fixtures |
| `packages/terminal` | the Windows Terminal fragment and settings snippet |
| `packages/css` | custom properties and a Tailwind v4 `@theme` block |
| `apps/lab` | the surface gallery: five surfaces, one palette, six live sliders |

## Commands

```bash
npm install
npm run build       # every package emits its artefact
npm test            # every workspace, plus the release and bootstrap tests at the root
npm run typecheck
npm run verify      # the contrast gate; exits non-zero on any failure
npm run sync:design # regenerates the generated tables in DESIGN.md and both READMEs
npm run dev -w ./apps/lab   # the surface gallery on http://localhost:8421
```

CI runs the same gate on every branch and pull request under Node 22 and Node 24, and
fails when a build or a `sync:design` changes a tracked file. A `v*.*.*` tag publishes.

## Documents

- `DESIGN.md` — the specification. Every table in it is generated.
- `PLAN.md` — the order of work, what is done, and every defect the code found.
- `RELEASING.md` — the secrets, the tag procedure and the dry run.
- `ADVERSARIAL_REVIEW.md` — the 2026-09-05 review, with what each finding turned into.

## Rules

Do not edit a hex value by hand anywhere in this repository. Change the OKLCH definition
in `packages/tokens` and rebuild. If a document and the emitted values disagree, the
emitted values are right and the document is stale; run `npm run sync:design`.

## Licence

MIT. Archivo and Monaspace Neon are SIL OFL 1.1; see `apps/lab/public/fonts/LICENSE.txt`.
