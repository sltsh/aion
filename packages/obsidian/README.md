# Aion for Obsidian

One community theme with **Dark** and **Light** modes. The repository-root
[`theme.css`](../../theme.css) and [`manifest.json`](../../manifest.json) are the files
Obsidian loads; this package generates the CSS from Aion's emitted palette. Do not edit
colors in the generated sheet. Change `packages/tokens/src` and rebuild.

## Try it locally

1. In your vault, create `.obsidian/themes/Aion/`.
2. Copy the repository-root `manifest.json` and `theme.css` into that folder.
3. In Obsidian, open **Settings → Appearance → Themes** and select **Aion**.
4. Switch **Base color scheme** between **Dark** and **Light** to see both variants.

The theme maps Obsidian's documented variables for surfaces, controls, text, Markdown,
code, navigation, tabs and dialogs. It does not ship fonts, images, scripts or remote
imports. Your existing font and density settings remain in control.

## Build and release

From the repository root, run `npm run build -w @sltsh/aion-obsidian` after building the
token and CSS packages. The normal `npm run build` handles dependency order. The root
test suite checks that the committed CSS matches its generator, both variants contain
the same keys, and selected reading and focus pairs clear their contrast floors.

The repository-root manifest and stylesheet are prepared for an Obsidian community
release. A release tag must match the manifest version; the release workflow attaches
both files. A real Obsidian screenshot and native review of reading, live preview,
source mode, menus, dialogs and mobile layout are still required before submission.
The [Obsidian submission guide](https://docs.obsidian.md/themes/app-themes/submit-theme)
also requires a community listing submission after the GitHub release.
