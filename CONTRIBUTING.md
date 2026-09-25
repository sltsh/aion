# Contributing to Aion

Bug reports and port contributions are welcome. For a rendering issue, include the app
version, a screenshot, and the steps needed to reproduce it.

## The one rule

Do not edit a hex value by hand anywhere in this repository. Change the OKLCH definition
in `packages/tokens` and rebuild. If a document and the emitted values disagree, the
emitted values are right and the document is stale; run `npm run sync:design`.

## Packages

| Package             | What it ships                                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| `packages/tokens`   | `@sltsh/aion-tokens` — both scheme palettes, OKLCH definitions and the build gate  |
| `packages/vscode`   | the VS Code extension: Aion, Aion Light, their gates and scope fixtures            |
| `packages/terminal` | the dark Windows Terminal fragment, settings snippet and Herdr theme               |
| `packages/css`      | both schemes as custom properties and a Tailwind v4 `@theme` block                 |
| `packages/obsidian` | generates the Dark and Light Obsidian community theme stylesheet                   |
| `apps/lab`          | the surface gallery: five surfaces, one palette, six live sliders                  |
| `apps/site`         | the public site at https://aion.slt.sh: the landing page and the palette reference |

## Commands

```bash
npm install
npm run build       # every package emits its artefact
npm test            # every workspace, plus the release and bootstrap tests at the root
npm run typecheck
npm run verify      # the contrast gate; exits non-zero on any failure
npm run sync:design # regenerates the generated tables in DESIGN.md and the READMEs
npm run dev -w ./apps/lab   # the surface gallery on http://localhost:8421
npm run dev -w ./apps/site  # the public site on http://localhost:8422
```

CI runs the same gate on every branch and pull request under Node 22 and Node 24, and
fails when a build or a `sync:design` changes a tracked file.

The gate is a calculation. A palette change also needs checking in the applications
themselves; `PLAN.md` records what was checked natively and when.

## Releasing

`npm run release -- <patch|minor|major>` is the whole procedure: write the `## Unreleased`
changelog entry first, then run it from the feature branch. Pushes to `main` deploy
`apps/site` to GitHub Pages; the version tag publishes the npm packages, the VSIX to both
marketplaces and the GitHub release. See [RELEASING.md](docs/RELEASING.md).

## Documents

- `DESIGN.md` — the specification. Every table in it is generated.
- `docs/LIGHT.md` — the Light variant's philosophy, implementation and availability.
- `docs/APP-THEMING.md` — the portable colour mapping for apps without a package.
- `PLAN.md` — the order of work, what is done, and every defect the code found.
- `docs/RELEASING.md` — the release prerequisites, tag procedure and dry run.
