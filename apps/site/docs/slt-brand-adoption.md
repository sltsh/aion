# Aion site SLT-family adoption

Status: product-specific adoption record for the public Aion site. The
verified local snapshot in `.slt/brand/` is the family source consulted for
this record; this file records Aion decisions rather than reproducing it.

## Decisions

- **Required principles adopted:** constructed hierarchy, readable open
  silhouettes, semantic colour roles, approved factual assets, and a complete
  still state when effects or optional resources are unavailable.
- **Colour roles:** Aion's emitted tokens assign the field and structure/text
  roles; gold is the primary identity and focus signal, teal is subordinate,
  and status feedback uses the status success, error, warning, and info roles.
  Site links remain the product's gold presentation role; the portable link
  role remains blue in the palette reference.
- **Composition:** the homepage stage is the dominant mass: asymmetric copy
  and code artifact, one gold continuity seam, and a subordinate teal terminal.
  Essentials and swatches use open rectangular fields. Installation is three
  open columns with functional seams. Palette uses an asymmetric page head,
  negative space, and one sticky section rail. Developer note and footer use
  alignment and open edges rather than repeated cards.
- **Typography:** Archivo carries headings and reading copy; Monaspace Neon is
  limited to code, commands, and emitted values. Reading order and line length
  remain primary at narrow widths.
- **Responsive behavior:** the homepage stage stacks copy, seam, and artifact;
  installation columns stack; palette content keeps its section anchors and
  sticky horizontal jump rail on narrow screens; wide code remains reachable
  by horizontal scrolling rather than being squeezed.
- **Assets and provenance:** source artwork is the approved Aion material in
  `assets/` as listed by `assets/APPROVED_ASSETS.md`. Site derivatives are
  lossless WebP exports of the supplied horizontal lockups at 1440x480 and
  wordmarks at 480x160, plus 128x128 PNG glyphs derived from `aion-logo.png`
  with proportional Lanczos resizing. Light derivatives preserve geometry and
  use the emitted dark editor base for light surfaces. No asset was modified
  in this adoption.
- **Motion boundary:** the shared explicit-theme Replace scene is adopted from
  verified brand v1.1.0. The incoming root reveals diagonally over
  `--slt-motion-scene` with the family linear exception. `theme.ts` owns
  latest-choice interruption, synchronous fallback settlement, and cleanup;
  the control, preference, favicon, artwork and displayed values commit as
  one incoming state. Initial/system/restored themes never play the wipe.
- **Local operations:** mobile navigation uses `--slt-motion-disclosure` to
  reveal its vertical structure, commits `aria-expanded` immediately, and
  restores intrinsic layout after settlement. Copy controls commit the result
  and accessible status before `--slt-motion-feedback` replaces the copy/check
  indicator and briefly keys the edge with the relevant status role. A newer
  request supersedes old asynchronous feedback. Buttons and direct links use
  a local two-pixel Register press; section links commit `aria-current` before
  their rail settles. Scrolling remains native. The palette link retains its
  inner-content shift and draws its top rail without moving the boundary.
- **Product scene:** the hero's decorative gold seam hands off to the teal
  terminal within one `--slt-motion-scene`, using `--slt-ease-out`. All ordinary
  copy, artwork and code are complete in the first frame. The scene runs once;
  reduced motion, hiding and restoration settle it without replay.
- **Lifecycle and timing:** `main.ts` settles local animation work on live
  reduced motion and page hiding, clears stale copy work, and removes its
  listeners on teardown while preserving history-restored interaction. The
  two-second copy confirmation dwell is a product status lifetime, not an
  animation duration. Shared feedback, disclosure and scene timings retain
  their canonical fallbacks. There are no ambient loops, typing effects,
  scroll-triggered reading entrances, or page-wide route fades.
- **Responsive site mark:** the package has no phone-width collision rule of
  its own, so the host page hides `<slt-site-mark>` below the package's own
  600px phone boundary with a single `@media (max-width: 599px) { display:
  none; }` rule scoped to that host element. At and above 600px the host adds
  no display rule, so the package's own `:host` display and any future
  standard attribute (such as `hidden`) govern the element unopposed. This
  changes no package internals or registration; the mark stays in the
  prerendered document on both pages at every width.
- **Prohibited-default decisions:** no generic arrow presentation icons,
  repeated chamfers or rails, gradients, shadows, soft card silhouettes, or
  pseudo-editor ornament. The editor chrome is retained only as an approved
  factual demonstration of Aion syntax and interface roles.
- **Approved existing choices:** retain the accepted T2 hero composition,
  exact theme-specific token values, deep anchors, keyboard menu behavior, and
  the fixed package-owned SLT site mark. These are existing product decisions,
  not new family-wide defaults.
- **Adaptable choices:** this site chooses its own copy, navigation, density,
  palette mapping, and technical reference boundaries while adopting the
  family principles above; another product must make its own record.

## Accessibility and validation

Copy controls are disabled in prerendered HTML and enabled during client
initialization. If Clipboard API access is unavailable or fails, the site
announces an explicit selectable-text fallback. Each control owns and replaces
its own confirmation timer. Each meaningful theme-specific image carries the
same concise alternative text on both variants; only the active variant is
rendered, and its label remains available if the resource fails. Functional
control edges use the UI border role and controls retain 44px reachability.

The focused site test, typecheck, and production build cover rendered
structure, exact token values, no-JS copy semantics, status roles, anchors,
and generated output. Browser acceptance covered Chromium 153.0.8010.12,
Firefox 155.0, and WebKit 26.6 on both pages and themes at 1440x900, 768x1024,
390x844, and 320x568, including the production no-JS build and reduced motion.
The earlier owner approval in the project adoption note covers the fixed site
mark only. Final owner visual approval is still required for this composition;
this record does not claim it.

## Motion next pass

The 2026-09-22 motion implementation adopts the shared theme scene without
changing palette values, packages, or approved artwork. Current rendered
acceptance and reproducible commands are recorded in `motion-validation.md`;
older browser evidence above describes the earlier composition review.
