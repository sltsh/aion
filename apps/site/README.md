# Aion site

The public site at https://aion.slt.sh: a theme introduction and a curated palette.
Both pages render at build time. JavaScript adds clipboard feedback, scheme switching,
and section-aware navigation; content and anchor links work without it.

```bash
npm run dev -w ./apps/site
npm run build -w ./apps/site
npm test -w ./apps/site
```

## Content

The homepage shows the brand, code preview, compact essentials, installation, and a short contrast
explanation. The palette page is a non-duplicative, role-first reference organized into five sections:
expanded Foundations (surfaces, text hierarchy, functional boundaries, and focus), Accents (canonical
hue names with solid, subtle, and border variants), Interface roles (status mappings and the portable blue link role),
Syntax (core syntax mapping, comments, and punctuation), and Terminal (the complete ANSI palette in slot order).
Swatches show readable names, roles, and hex values.
Raw overlays and authored OKLCH tables belong in the linked package and
design documentation, not the public palette.

`src/groups.ts` defines the public selection; both pages and their copy buttons use
it. Every value comes from its named `@sltsh/aion-css` token. Tests check those pairings,
complete ANSI coverage, hidden light values, and the absence of handwritten hex values.

`src/render` owns the HTML; `src/content.ts` owns installation copy. `src/main.ts` tracks
section positions to update navigation without changing browser history, and provides
clipboard feedback for keyboard and pointer users. The palette navigation becomes a
sticky horizontal bar on narrow screens.

## Brand and downloads

The header uses the standalone logo; the hero uses the horizontal lockup. Committed
exports live in `public`; original artwork lives in the repository's `assets` directory.

The Vite plugin serves the generated terminal fragment in development and emits the same
bytes at `/downloads/aion.json` in production. Build the terminal package before building
the site. Tests verify parity with the generated fragment.

`released` stays off until the first release. VS Code always links to the Marketplace and shows its install command. The CSS card
shows a local build command before release and an npm command afterward. `lightVisible` stays
off until light is ready for presentation. Tests exercise both settings of both flags.

## Validation

Run the root build, test, typecheck, and contrast gate. Browser checks should cover desktop
and mobile layouts, copy and download actions, keyboard focus, and section highlighting
when scrolling, clicking anchors, and loading a deep link. Numerical contrast checks do
not replace native editor acceptance.

Archivo and Monaspace Neon are bundled WOFF2 assets, loaded by `@font-face`; visitors do
not need local font installations. Same-page navigation uses native anchors with smooth
scrolling unless reduced motion is requested.

The site uses the Latin variable subset of Archivo from Google Fonts (v25), covering
weight 100–900 and width 62–125%. The previous file was the Vietnamese subset and lacked
most English letters. Verify actual rendered fonts in browser developer tools when
replacing a font; a successful font request alone does not prove glyph coverage.
