# Aion site

The public site at https://aion.slt.sh. Two pages: a landing page and the palette
reference. It imports `@sltsh/aion-css`, so it cannot show a colour the packages do not
emit.

```
npm run dev -w ./apps/site       # http://localhost:8422
npm run build -w ./apps/site     # static output in dist/
npm test -w ./apps/site
```

## How it works

Every section is a pure function that returns an HTML string, so the tests run in node. A
Vite plugin calls them at build time and substitutes the result into `index.html` and
`palette.html`. The shipped HTML carries the page; the runtime script only copies a hex and
switches the scheme.

| Module | Holds |
|---|---|
| `src/flags.ts` | the two build flags every render function takes |
| `src/groups.ts` | the emitted variables, partitioned into the six page sections |
| `src/gate.ts` | the four figures on the landing page, derived from `checks()` |
| `src/tables.ts` | the neutral ramp and the accent table, at their authored OKLCH |
| `src/manual.ts` | the core roles and the sixteen ANSI slots, for an app with no theme file |
| `src/content.ts` | the prose: one convention per section, the principles, the install entries |
| `src/samples/hero.ts` | the hero code sample, through the lab renderer |
| `src/render/*.ts` | the swatch, the two pages, and HTML escaping |
| `src/styles.css` | layout, both `@font-face` rules, the syntax classes |

The site paints its own chrome on `--aion-bg-surface`, one step above the editor, so the
code sample can drop to `--aion-bg-page` and read as a window rather than as more page. Both
surfaces carry text the gate measures. A chip still composites a translucent value over
`--aion-bg-page`, because that is the surface the ratio was read on.

`released` adds a note to the install section until the first tag ships. `lightVisible` is
off, so the build emits no light value and no scheme toggle. The tests run both settings of
both flags, so the hidden path stays proven rather than merely written.

A swatch shows no OKLCH. `dark()` returns hex, and `hexToOklch` recovers the emitted value
rather than the authored one — the editor is authored at hue 264 and reads back at 261.57.
The authored OKLCH appears only where the authored source exists: the lightness column of
the ramp table and the hue and chroma columns of the accent table.

## What the tests hold in place

- Every hex on either page is a hex the token package emits. The CSS layer is not the whole
  source: the ramp prints `neutral.sidebar`, which has no web equivalent.
- No source file and no stylesheet holds a hex literal.
- Every `var(--…)` the stylesheet reads is emitted by `@sltsh/aion-css` or declared here
  under `--site-`. A misspelled custom property renders as nothing at all, which no
  screenshot catches.
- Every variable `dark()` emits appears in exactly one swatch, and every swatch names a
  variable that exists. `groupOf` returns undefined for an unknown prefix rather than a
  default group.
- Every figure on the landing page equals the value derived from `checks()`.
- `ANSI_SLOTS` covers exactly the `--aion-ansi-` variables `dark()` emits, in slot order, and
  every value in the manual setup section and its two copy blocks is read from the emitter.
- Every hex in the ramp table and the accent table is a copy target, and so is every swatch.
- The landing page names no rival theme.

## Still open

The DNS `CNAME` from `aion.slt.sh` to `sltsh.github.io`, and GitHub Pages enabled for the
repository with the custom domain. Neither lives in this repository.
