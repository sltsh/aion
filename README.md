<p align="center">
  <img src="assets/aion-lockup-horizontal.png" alt="Aion" width="720">
</p>

<p align="center">A dark theme for editors, terminals and the web.<br>Gold accents, cool surfaces, familiar syntax. No italics.</p>

<p align="center">
  <a href="https://aion.slt.sh">Explore Aion</a> ·
  <a href="https://aion.slt.sh/#essentials">Copy colours</a> ·
  <a href="#install">Install</a> ·
  <a href="https://aion.slt.sh/palette.html">Full palette</a>
</p>

## A familiar place to work

Aion follows the One Dark Pro syntax role map, with gold for focus and navigation and
teal as a secondary accent. The editor is the darkest surface; the raised sidebar and
panels keep the workspace easy to read.

Explore the [live code preview](https://aion.slt.sh/#sample) to see the palette in use.
The name comes from the Ancient Greek αἰών: an age, an epoch, a span of existence.

## Install

Aion is preparing for its first release. Marketplace and npm installation will be
available after the first tag; for now, build from this repository.

| Use Aion in      | Get started                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VS Code          | Run `code --install-extension sltsh.aion-theme`, then select **Aion** as your colour theme. To build locally, run `npm install` and `npm run pack:dev`, then use **Extensions → Install from VSIX** with the generated package. |
| Windows Terminal | [Download aion.json](https://aion.slt.sh/downloads/aion.json), then follow the steps below.                                                             |
| CSS / Tailwind   | Build locally; see the [CSS package](packages/css/README.md) for custom properties and Tailwind integration.                                            |
| Another app      | [Copy the essentials](https://aion.slt.sh/#essentials), or use the [terminal colours](https://aion.slt.sh/palette.html#terminal).                       |

For Windows Terminal, save `aion.json` in
`%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\sltsh` (create the folder if needed).
Restart Terminal, then select **Aion** under **Settings → Profiles → Appearance → Colour
scheme**. The [terminal guide](packages/terminal/README.md) also covers manual settings.

## Built for readable code

Syntax, interface text and decorations are checked against their intended surfaces.
The contrast gate runs in CI and blocks colours below their floor. It covers a named set
of reading states, not every state an application can produce; see the
[design specification](DESIGN.md#31-the-states-the-floor-covers) for the scope and exemptions.

<details>
<summary>Contrast measurements and theme comparisons</summary>

| Theme            | Editor    | Sidebar   | Order                |
| ---------------- | --------- | --------- | -------------------- |
| One Dark Pro     | `#282c34` | `#21252b` | sidebar below editor |
| Ayu Mirage       | `#242936` | `#1f2430` | sidebar below editor |
| Nord             | `#2e3440` | `#2e3440` | one surface          |
| Catppuccin Mocha | `#1e1e2e` | `#1e1e2e` | one surface          |

**The contrast floor is a gate, not a claim.** Every token is defined in OKLCH and checked
against the surface it sits on, decorations composited the way the renderer composites
them. `npm run verify` exits non-zero on a token below its floor, and CI runs it on every
branch, so a colour below the floor cannot be released. The gate covers a named set of
reading states, not every state a renderer can produce; §3.1 of `DESIGN.md` is the set,
and three kinds of exemption are documented.

| What the gate checks             |  Count |
| -------------------------------- | -----: |
| Rows measured                    |    611 |
| Below their floor                |      0 |
| Exempt rows, all documented      |      5 |
| Reading states per syntax colour |     35 |
| Lowest ratio in a reading state  | 4.50:1 |
| Interface keys the theme sets    |    622 |
| TextMate rules                   |     64 |
| Semantic tokens                  |     32 |

| Theme            | Lowest ratio | Below 4.5:1       | Source                                                                                                                           |
| ---------------- | ------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Aion             | 6.95         | none              | —                                                                                                                                |
| One Dark Pro     | 3.73         | comment, variable | [One Dark Pro](https://github.com/Binaryify/OneDark-Pro/blob/main/themes/OneDark-Pro.json) @ `54c3280`                           |
| Ayu Mirage       | 3.42         | comment           | [Ayu Mirage](https://github.com/ayu-theme/vscode-ayu/blob/master/ayu-mirage.json) @ `444ef92`                                    |
| Nord             | 2.43         | comment, number   | [Nord](https://github.com/nordtheme/visual-studio-code/blob/develop/themes/nord-color-theme.json) @ `8ead098`                    |
| Catppuccin Mocha | 5.81         | none              | [Catppuccin Mocha](https://github.com/catppuccin/vscode/blob/main/packages/catppuccin-vsc/src/theme/tokens/index.ts) @ `befc9e6` |

Eight syntax roles on a plain editor line, against each theme's own editor background,
read on 2026-09-05 at the revision named. Every table here is generated: `npm run
sync:design` rewrites them from the token package and the emitted theme, so the copy
cannot drift from the emitter. This compares eight colours, not accessibility and not
usability.

</details>

## Contributing

Bug reports and port contributions are welcome. For a rendering issue, include the app
version, a screenshot, and the steps needed to reproduce it. For palette changes, edit
the OKLCH source in `packages/tokens`; generated colours should never be edited by hand.

## Packages

| Package             | What it ships                                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| `packages/tokens`   | `@sltsh/aion-tokens` — the OKLCH definitions and the build gate                    |
| `packages/vscode`   | the VS Code extension: the theme, its gate and its scope fixtures                  |
| `packages/terminal` | the Windows Terminal fragment and settings snippet                                 |
| `packages/css`      | custom properties and a Tailwind v4 `@theme` block                                 |
| `apps/lab`          | the surface gallery: five surfaces, one palette, six live sliders                  |
| `apps/site`         | the public site at https://aion.slt.sh: the landing page and the palette reference |

## Commands

```bash
npm install
npm run build       # every package emits its artefact
npm test            # every workspace, plus the release and bootstrap tests at the root
npm run typecheck
npm run verify      # the contrast gate; exits non-zero on any failure
npm run sync:design # regenerates the generated tables in DESIGN.md and both READMEs
npm run dev -w ./apps/lab   # the surface gallery on http://localhost:8421
npm run dev -w ./apps/site  # the public site on http://localhost:8422
```

CI runs the same gate on every branch and pull request under Node 22 and Node 24, and
fails when a build or a `sync:design` changes a tracked file. A `v*.*.*` tag publishes.

## Documents

- `DESIGN.md` — the specification. Every table in it is generated.
- `PLAN.md` — the order of work, what is done, and every defect the code found.
- `RELEASING.md` — the secrets, the tag procedure and the dry run.

## Rules

Do not edit a hex value by hand anywhere in this repository. Change the OKLCH definition
in `packages/tokens` and rebuild. If a document and the emitted values disagree, the
emitted values are right and the document is stale; run `npm run sync:design`.

## Licence

MIT. Archivo and Monaspace Neon are SIL OFL 1.1; see `apps/lab/public/fonts/LICENSE.txt`.
