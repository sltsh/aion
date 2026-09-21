# SLT site mark adoption

Initial proof (2026-09-20): this feature branch installed the then-unpublished
`@sltsh/site-mark` version `0.1.0` as a tarball from package commit `407773f`.
That proof artifact's SHA-512 integrity was
`sha512-wKr/myI0Buo0HRPRk3tEWLtgG1rQ+8l70F2fyibBXSc4uoquaB9iKJkwLo6/EG10f5ciAjjLkVJsEG/qTiy9JA==`.
It was installed as a tarball rather than a source path.

Release update (2026-09-21): Aion installs the exact public registry
version `@sltsh/site-mark@0.1.0`, released from tagged package commit `03d4e60`.
The lockfile records the published artifact integrity
`sha512-OQbSkT3E2Rc37IrmxqMfWUp7/LM2aouMNYjI7N2DN3Cg3cs72RF/EkmRFXsBJMw/DQYeF5dzYE/oohvDDd/rrw==`.
The installed `register.js` matches the release build byte for byte. This
integration is committed source work, not a production deployment.

Placement update (2026-09-21): the earlier inline decision is
replaced by the approved fixed placement. Aion renders one bare
`<slt-site-mark></slt-site-mark>` at the top level of the homepage and palette
page, outside the footer and without a `placement` attribute. The package owns
the fixed bottom-right offsets, safe-area handling, stacking, styling, and
interaction, so Aion has no wrapper, slot, or CSS for the mark. The verified
private SLT brand snapshot is v1.0.0. The footer's MIT statement still names
**Aion source** so it does not imply a license for the SLT name or glyph.

The 0.1.1 spacing patch is not yet installed from the registry. `package.json`
and `package-lock.json` still name `@sltsh/site-mark@0.1.0`. Installing the
published 0.1.1 release is a coordinator step that follows publication. Until
then, the fixed markup was validated against the reviewed local 0.1.1 tarball
with no file dependency or lockfile change.

The canonical family authorities are the [SLT brand guide](https://github.com/sltsh/slt.sh/blob/main/slt-brand-design.md)
and [SLT motion guide](https://github.com/sltsh/slt.sh/blob/main/slt-family-motion.md).
This note records only Aion's adoption choices and evidence.

## Fixed placement evidence

Validated on 2026-09-21 in Chromium with the local 0.1.1 tarball, on both pages
in dark and light themes at 1440×900, 390×844, and 320×568 (12 rows). Every
row had exactly one mark, outside the footer, with `position: fixed`, and a
44px high link about 127px wide (127.4px). The mark stayed at the same
viewport position at the top, middle, and bottom of the scroll range, at 20px
from the right and bottom edges at 1440px and 16px at 390px and 320px. No row
had horizontal overflow. Keyboard focus reached the mark and showed a 2px
gold outline with a 3px offset, inside the viewport. With the mobile menu
open at 390px and 320px, the menu did not overlap the mark.

The host resolves its two fixed-placement collisions without styling the mark.
At widths up to 340px, the palette introduction uses less bottom padding so
the jump navigation clears the mark at the top of the page. At widths up to
599px, the copy confirmation toast sits above the mark and the safe-area inset.
The fixed mark can overlay ordinary scrolling content, but it does not obscure
the palette navigation, mobile menu, or copy fallback guidance.

## Inline-placement browser evidence (superseded)

The evidence below documents the superseded inline placement and remains as
historical record. The screenshot links stay valid. The [measurement file](site-mark-evidence/measurements.json) and screenshots
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

## Local checks (0.1.0 release, superseded inline placement)

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
release build. The release added license and brand terms without changing runtime code.
