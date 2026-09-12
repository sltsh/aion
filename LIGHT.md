# Aion Light

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/aion-wordmark.png">
    <img src="assets/aion-wordmark-light.png" alt="Aion" width="540">
  </picture>
</p>

Aion Light is the daylight counterpart to Aion, not an inverted dark palette. It keeps
the same semantic roles, syntax mapping and restraint, then solves each colour again for
light surfaces.

## Design intent

The dark theme makes the editor the deepest surface and raises the surrounding chrome.
Copying that numeric order into a light theme would make the workspace feel muddy, so
Aion Light preserves the relationship instead: the editor is the cleanest, lightest
canvas, while the sidebar, panels, widgets and inputs deepen in small steps. Code remains
the visual focus and adjacent regions remain distinct.

The syntax hues retain the One Dark Pro role map, but their lightness and chroma are
solved independently for the light editor. Gold still marks focus and navigation, violet
remains primarily a syntax hue, comments are the quietest reading role, and nothing is
italicised.

Decorations follow the same evidence-first rules as the dark theme. Accent text is
solved against the darkest light surface on which it can appear. Translucent overlays are
measured after emitted-byte compositing. Diff line and word fills carry the change in the
code area; the opaque gutter strips use restrained chroma and a lightness difference, with
glyphs providing a second cue beyond hue.

## How it is built

`packages/tokens/src/light.ts` is the authored source. It defines the light neutral ramp,
reading roles, accents, editor overlays, diff treatment and integrated-terminal slots.
The scheme is then consumed by:

- `@sltsh/aion-tokens`, through the `*Light` semantic exports, `lightPalette` and
  `buildLightPalette()`;
- `@sltsh/aion-css`, through automatic system preference and explicit
  `[data-theme="light"]` selectors;
- the VS Code extension, as the generated **Aion Light** theme;
- the local lab, where Dark and Light keep separate tuning state.

The dark and light VS Code themes share their TextMate selectors and semantic-token
names. Only the scheme palette changes, so a language role does not change meaning when
the user switches themes.

## Availability

| Target | Repository state | Published state on 2026-09-12 |
| --- | --- | --- |
| Token package | Complete refined Light exports | npm `0.3.1` has the earlier Light API |
| CSS package | Dark and Light variables | npm `0.3.1` has the earlier Light palette |
| VS Code | **Aion** and **Aion Light** | Marketplace and Open VSX `0.3.1` are dark-only |
| VS Code terminal | Light ANSI palette included in Aion Light | Ships with the next extension release |
| Windows Terminal | Dark standalone scheme only | Dark standalone scheme only |
| Lab | Dark and Light preview and tuning | Local development tool; not deployed |
| Public site | Light data path is built and tested | Hidden while `lightVisible` is disabled |

The refined Light palette therefore needs a new tagged version before package-manager or
marketplace users receive it. Published versions are immutable; the existing `0.3.1`
artifacts cannot be replaced in place.

## Try the repository version

Build and install the current extension locally:

```bash
npm ci
npm run pack:dev
```

In VS Code, choose **Extensions: Install from VSIX**, select the package generated under
`packages/vscode`, then choose **Aion Light** with **Preferences: Color Theme**.

To inspect or tune the scheme in the lab:

```bash
npm run dev -w ./apps/lab
```

## Validation and acceptance

The emitted colours, contrast floors, composited reading states, generated theme parity
and package exports are covered by the repository gates:

```bash
npm run build
npm run verify
npm test
npm run typecheck
npm run sync:design
```

Those checks validate the calculated and browser-previewed palette. The packaged Light
theme was checked and approved in VS Code on 2026-09-12 after the final palette, diff,
minimap and inline Git blame adjustments. Any later palette change requires fresh native
acceptance.

See [RELEASING.md](RELEASING.md) for the tag-driven publication process and
[DESIGN.md](DESIGN.md) for the complete colour and contrast specification.
