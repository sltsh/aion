# SLT site mark adoption

Initial proof (2026-09-20): this feature branch installed the then-unpublished
`@sltsh/site-mark` version `0.1.0` as a tarball from package commit `407773f`.
That proof artifact's SHA-512 integrity was
`sha512-wKr/myI0Buo0HRPRk3tEWLtgG1rQ+8l70F2fyibBXSc4uoquaB9iKJkwLo6/EG10f5ciAjjLkVJsEG/qTiy9JA==`.
It was installed as a tarball rather than a source path.

Release update (2026-09-21): Aion now installs the exact public registry
version `@sltsh/site-mark@0.1.0`, released from tagged package commit `03d4e60`.
The lockfile records the published artifact integrity
`sha512-OQbSkT3E2Rc37IrmxqMfWUp7/LM2aouMNYjI7N2DN3Cg3cs72RF/EkmRFXsBJMw/DQYeF5dzYE/oohvDDd/rrw==`.
The installed `register.js` matches the release build byte for byte. This
integration is committed source work, not a production deployment.

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

The focus-only contrast correction in the final tarball was checked on Aion's
light theme in [Chromium](site-mark-evidence/chromium/home-light-focus-390x844.png),
[Firefox](site-mark-evidence/firefox/home-light-focus-390x844.png), and
[WebKit](site-mark-evidence/webkit/home-light-focus-390x844.png). Each rendered
the 2px gold outline with a 3px offset and a 2px dark outer ring. The resting
matrix above remains valid because this correction changes only the focused
state.

Forced-colors rendering of the final packed artifact was checked on Aion's
light page in Chromium, Firefox, and WebKit. Each used a white `Canvas` field
and black `CanvasText`, a 21:1 text pair, and retained a visible focused
outline: [Chromium](site-mark-evidence/chromium/home-forced-colors-focus-390x844.png),
[Firefox](site-mark-evidence/firefox/home-forced-colors-focus-390x844.png), and
[WebKit](site-mark-evidence/webkit/home-forced-colors-focus-390x844.png).

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
- After installing the final tarball, the site build and site typecheck
  passed again, as did all 37 focused site tests. The installed `register.js`
  matched the package's built file byte for byte.
- After replacing the tarball with the published exact version, a fresh
  `npm ci` passed. Root build and typecheck passed, all 296 tests passed, and
  `npm run verify` again reported 1,024 passing contrast rows, no failures,
  five documented exemptions, and 28 informational rows.

The package code installed from the registry is byte-identical to the reviewed
release build, so the existing rendered evidence remains current. The release
added license and brand terms without changing runtime code.
