# Aion site

The public site at https://aion.slt.sh introduces the theme through six measured chapters:
Depth, Solved, Rounded, States, Terminal and Palette, followed by installation for five targets.
The homepage and the separate role-first palette reference render at build time. Text, links,
current-scheme figures and installation commands remain available without JavaScript.

```bash
npm run dev -w ./apps/site
npm run build -w ./apps/site
npm test -w ./apps/site
```

## Structure

`src/render` owns the HTML and `src/content.ts` owns homepage copy. The hero shows the shared
lab editor twice, with an inert opposite-scheme picture behind a draggable diagonal seam.
The single live header, fixed scheme chip, chapter rail and mobile menu retain their own
interaction boundaries. A first-visit splash can be skipped and releases the page when the
client fails to load. Reduced motion settles animations immediately.

`src/chapters` owns the interactive chapters: editor strata, an accent's worst-surface probe,
the emitted-byte rounding demonstration, valid renderer stacks, and syntax cross-highlighting.
`src/measures.ts` calculates build-time figures and writes the JSON island; clients consume
that island rather than running the full gate. `src/theme.ts` orders theme requests and
synchronizes saved choices, system preference, cross-tab changes and page motion.

The site reads emitted CSS tokens, lab palette variables and Obsidian exports. Native reading
stacks use the shared `stackBackground` and `orderStack` helpers. Contrast uses emitted bytes;
the Rounded chapter deliberately shows continuous contrast beside the emitted result.
`src/pairs.ts` lists the site's readable foreground/surface pairs. Examples that demonstrate
a failing contrast ratio are labelled demonstrations rather than shipping readability claims.

The `/palette.html` reference remains organized by foundations, accents, interface roles,
syntax and terminal. `src/groups.ts` defines its selection and shared copy values. Swatches
show emitted hex values; authored OKLCH tables belong in the design documentation.

## Assets and installation

Archivo and Monaspace Neon are bundled WOFF2 assets. Archivo's Latin variable subset covers
weight 100–900 and width 62–125%; verify actual glyph rendering when replacing it.
Wordmarks live in `public`, with original artwork in `assets`. The inline SLT mark stays dark
in both hero layers. The hero and Depth chapter reuse the exported lab editor and scope flat
site overrides without changing the lab's rendering.

The Vite plugin serves the generated terminal fragment during development and emits identical
bytes at `/downloads/aion.json`. The Windows Terminal download remains the dark Aion scheme.
`released` selects published installation copy or local-build instructions; tests cover both.
The public theme follows the system until a visitor chooses a scheme, then shares that choice
between pages and tabs. Clipboard controls enhance selectable installation commands.

## Validation

Run `npm run verify`, `npm test` and `npm run typecheck` from the repository root. Build the
site and run a production preview before the browser harness:

```bash
npm run preview -w ./apps/site -- --host 0.0.0.0 --port 4192
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
SITE_URL=http://127.0.0.1:4192 EVIDENCE_DIR=/tmp/aion-site-evidence \
node apps/site/test/browser/site.mjs
```

The harness runs Chromium, Firefox and WebKit concurrently with separate engine directories.
`BROWSER=chromium` selects one engine; `CASE_FILTER` is a regular expression for a focused
retry. `motion.mjs` remains a compatibility entry point with the same environment contract.
Every case writes pass/fail evidence and a screenshot; a failure does not suppress later cases.
Retain the original run and put retries in a fresh evidence directory.

The matrix covers both pages and schemes at 1440, 1280, 1100, 768, 600, 599, 390 and 320px,
plus focused keyboard, splash, storage, motion, touch admission, resize and rail checks.
Chromium verifies a native touch swipe through CDP. Firefox and WebKit verify an unprevented
emulated touch press plus native scrolling because Playwright exposes only touch tap there.
Round 2 added cases for each behaviour a calculation cannot show: `resize-settle-*` (a resize
starts no motion and an in-flight intro, glide or chip wipe keeps its own timeline),
`intro-reload`, `intro-reload-hash`, `intro-hard-reload` and `intro-handoff` (replay on reload, with or without a hash, never on back/forward, no blank frame),
`intro-exit-frames` (dropped frames in the entrance and exit windows; asserted in Firefox, recorded in Chromium and WebKit),
`throw-flick-*` (native flick commit), `theme-keeps-seam-*` (a scheme-chip change keeps the hero seam's share), `chip-labels-*`, `chip-artefact-*`,
`chip-wipe-visible-*` and `chip-motion-*` (the chip's seam, its wipe on the page scene's clock
and its interruption rules), `states-placement-*` (per-toggle placement), `states-light-visible` (Light bracket match, merge conflict and added word differ from their surroundings by 0.03 in OKLab), `solved-strip-*`,
`depth-scale-*`, `dimension-upright`, `palette-margin`, `install-align`, `install-cta-*`, `light-frames`,
`nav-current-*`, `rounded-spacing-colour-*`, `hover-nav-*`, `hover-hero-*` and
`nav-centred-*` (round 3: hover states, and the nav on the header's centre line).
Browser results and the calculation gates are recorded separately in `PLAN.md`; neither
establishes native VS Code or Obsidian acceptance. Owner visual approval remains separate.
