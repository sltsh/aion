# SLT site mark adoption proof

Date: 2026-09-20. This is a local feature-branch integration of the **unpublished**
`@sltsh/site-mark` version `0.1.0`, packed from local package commit `d1fe26e`.
The installed tarball's SHA-512 integrity is
`sha512-Q+cB9Owu6hW1Ac37cMs56hLa39/7QrDWMAickUjO72bWBeQpMnDrVRxUA9xPBsiwOUaAgO2H9/JaE5fihP3JRg==`.
It was installed as a tarball, not from a source path. The package is not
published and this branch is not a production deployment.

The mark uses `placement="inline"` in the shared footer of the homepage and
palette page. The footer provides a `120px` by `44px` slot, so custom-element
upgrade does not move content. No fixed offset or stacking override is needed.
This placement keeps the mark away from the mobile navigation, copy feedback,
footer links, and page content. The package owns the glyph, label, link, and
styles; Aion supplies no mark-specific colors or markup copies. The footer's
MIT statement names **Aion source** so it does not imply a license for the SLT
name or glyph.

The canonical family authorities are the [SLT brand guide](https://github.com/sltsh/slt.sh/blob/main/slt-brand-design.md)
and [SLT motion guide](https://github.com/sltsh/slt.sh/blob/main/slt-family-motion.md).
This note records only Aion's adoption choices and evidence.

## Browser evidence

The [measurement file](site-mark-evidence/measurements.json) and screenshots
cover both pages, dark and light themes, and 1440×900, 768×1024, 390×844, and
320×568 viewports in each browser. Every row has a full viewport screenshot
and a `-mark.png` crop with the same filename stem.

| Browser | Version | Home 390×844 | Palette 320×568 | No JavaScript |
| --- | --- | --- | --- | --- |
| Chromium | 153.0.8010.12 | [light](site-mark-evidence/chromium/home-light-390x844.png) · [dark](site-mark-evidence/chromium/home-dark-390x844.png) | [light](site-mark-evidence/chromium/palette-light-320x568.png) · [dark](site-mark-evidence/chromium/palette-dark-320x568.png) | [home](site-mark-evidence/chromium/home-no-js-390x844.png) · [palette](site-mark-evidence/chromium/palette-no-js-390x844.png) |
| Firefox | 155.0 | [light](site-mark-evidence/firefox/home-light-390x844.png) · [dark](site-mark-evidence/firefox/home-dark-390x844.png) | [light](site-mark-evidence/firefox/palette-light-320x568.png) · [dark](site-mark-evidence/firefox/palette-dark-320x568.png) | [home](site-mark-evidence/firefox/home-no-js-390x844.png) · [palette](site-mark-evidence/firefox/palette-no-js-390x844.png) |
| WebKit | 26.6 | [light](site-mark-evidence/webkit/home-light-390x844.png) · [dark](site-mark-evidence/webkit/home-dark-390x844.png) | [light](site-mark-evidence/webkit/palette-light-320x568.png) · [dark](site-mark-evidence/webkit/palette-dark-320x568.png) | [home](site-mark-evidence/webkit/home-no-js-390x844.png) · [palette](site-mark-evidence/webkit/palette-no-js-390x844.png) |

All 48 rendered rows measured a `120×44px` mark inside a `120×44px` slot,
zero horizontal overflow, the expected theme, and no overlap with any footer
link. At 390×844, footer height was identical with JavaScript enabled and
disabled on both pages in all three browsers. With JavaScript disabled the
empty element measured `0×0`, had no link or hit target, and the three footer
links remained present. The visual review found the mark readable on Aion's
light and dark surfaces and subordinate to Aion's own brand.

Edge and physical touch devices were unavailable. These Playwright builds do
not certify native Safari rendering. The package review records fixed
placement, safe-area emulation, motion, focus, forced-colors, and busy-surface
evidence separately.

## Local checks

- `npm run build`: passed, including the public site build with the packed module.
- `npm test -w @sltsh/aion-site`: 37/37 passed. The first sandboxed run hit
  `spawnSync npx EPERM`; the same unchanged test passed in the host environment.
- `npm run typecheck`: passed across the root and all workspaces.
- `npm test`: passed across the root and all workspaces (296 tests).
- `npm run verify`: passed; 1,024 contrast rows passed, none failed,
  five documented exemptions, and 28 informational rows.

The temporary file dependency in this branch must be replaced with the
published version after the release gate approves the package metadata,
licensing, and publication. Do not merge or deploy this consumer branch with
the temporary tarball path.
