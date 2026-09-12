# Brand assets

The PNG files are the supplied originals. Use the horizontal lockup for the README and
site hero, the wordmark for compact navigation, and the standalone logo for app icons.
The vertical lockup is available for square placements.

Derived assets are committed: the site carries lossless WebP exports of the horizontal
lockup and wordmark; VS Code, the lab and the site carry 128px PNG icons derived from
`aion-logo.png`. Resize proportionally with Lanczos resampling when replacing originals.
Rebuild the packages after refreshing these files. Theme colours remain token-generated;
brand artwork is independent of the palette.

`aion-logo-light.png` and `aion-wordmark-light.png` preserve the supplied geometry and
alpha while replacing the pale structure with the emitted dark editor base. The lab's
`icon-light.png` is the corresponding 128px glyph and is selected with the light scheme.
