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
- **Motion boundary:** no site-local scenes, entrances, ambient loops, or
  transitions. Native same-page smooth scrolling under `no-preference` and
  package-owned site-mark Register feedback are the complete motion surface.
  Reduced motion leaves settled content and controls.
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
