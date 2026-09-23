# Aion for Obsidian

One community theme with **Dark** and **Light** modes. The repository-root
[`theme.css`](../../theme.css) and [`manifest.json`](../../manifest.json) are the files
Obsidian loads; this package generates the CSS from Aion's emitted palette. Do not edit
colors in the generated sheet. Change `packages/tokens/src` and rebuild.

![Aion Dark in Obsidian](../../screenshots/obsidian-dark.png)
![Aion Light in Obsidian](../../screenshots/obsidian-light.png)

### Phone layout preview

These captures use Obsidian's [built-in mobile emulation](https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development)
at a 390px viewport. They are not screenshots from an Android or iOS device.

![Aion Dark in Obsidian's phone emulator](../../screenshots/obsidian-phone-emulated-dark.png)
![Aion Light in Obsidian's phone emulator](../../screenshots/obsidian-phone-emulated-light.png)

## Install from Obsidian

Open **Settings → Appearance → Themes → Manage**, search for **Aion**, and select
**Install and use**. Switch **Base color scheme** between **Dark** and **Light** to use
both variants.

## Install manually

1. In your vault, create `.obsidian/themes/Aion/`.
2. Download `manifest.json` and `theme.css` from the [1.1.1 Obsidian release](https://github.com/sltsh/aion/releases/tag/1.1.1) into that folder.
3. In Obsidian, open **Settings → Appearance → Themes** and select **Aion**.
4. Switch **Base color scheme** between **Dark** and **Light** to see both variants.

The theme maps Obsidian's documented variables for surfaces, controls, text, Markdown,
code, navigation, tabs and dialogs. It does not ship fonts, images, scripts or remote
imports. Your existing font and density settings remain in control.

Headings run gold, teal, copper and violet from H1 to H4; H5 and H6 stay secondary text.
Bold is coral and italic green, except inside a highlight, which keeps primary text in
every mode. Tags are blue pills. In the file explorer each top-level folder takes the next
of coral, copper, gold, green, teal and blue; the folders nested inside it, their
chevrons and the indentation guide inherit it, and files stay neutral. The cycle follows
Obsidian's sort, so renaming or reordering a folder can change its colour. Reading view
grades the space above H3 and H4–H6 and balances callout padding.

Heading and emphasis colours are checked on the page and under the selection. In Dark,
they also clear 4.5:1 inside one callout of each colour. In Light, heading and emphasis
colours inside a callout may fall below 4.5:1. Nested callouts stack tints and are outside
the contrast gate in both modes.

Obsidian's accent picker changes control accents such as buttons, checkboxes and accent
text. Aion's headings, tags, folder colours, the gold tab and ribbon marks, the active
file background, caret, focus ring and highlights keep their palette roles when a custom
accent is selected.
Custom accent colours are supplied by Obsidian and are outside Aion's contrast gate.

## Build and release

From the repository root, run `npm run build -w @sltsh/aion-obsidian` after building the
token and CSS packages. The normal `npm run build` handles dependency order. The root
test suite checks that the committed CSS matches its generator, both variants contain
the same keys, and selected reading and focus pairs clear their contrast floors.

The repository-root manifest and stylesheet are included in the 1.1.1 Obsidian release.
The screenshots above were captured from the built sheet in an isolated Obsidian 1.13.7
vault. Desktop reading, Live Preview and Source mode were checked in both variants;
the built-in phone emulator was checked at 390px. Android and iOS hardware remain unchecked.
The [Obsidian submission guide](https://docs.obsidian.md/themes/app-themes/submit-theme)
also requires a community listing submission after the GitHub release.
