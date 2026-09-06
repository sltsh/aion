# Aion lab

Five surfaces, one palette. The lab imports `@sltio/aion-tokens` directly, so it cannot
show a colour the extension does not ship.

```
npm run dev -w ./apps/lab       # http://localhost:8421
npm run build -w ./apps/lab     # static output in dist/
npm test -w ./apps/lab          # 52 tests
```

## How it works

`src/main.ts` writes the surfaces once, then never rebuilds them. A control change calls
`buildPalette(options)` and sets the result as CSS custom properties on the document root.
Every surface reads `var(--…)` only. That is what proves the surfaces read the tokens
rather than a copy of them.

| Module | Holds |
|---|---|
| `src/variables.ts` | palette → custom properties on the root |
| `src/controls.ts` | six OKLCH sliders and a reset to the shipped values |
| `src/readout.ts` | live contrast table over the reading states, ANSI slots and chrome |
| `src/render/code.ts` | the tokenised code sample and its renderer |
| `src/render/icons.ts` | inline SVG glyphs, never a Nerd Font web build |
| `src/render/*.ts` | one module per surface |
| `src/styles.css` | layout, both `@font-face` rules, every surface |
| `src/fonts/` | Archivo and Monaspace Neon, both variable, both SIL OFL 1.1 |
| `public/fonts/LICENSE.txt` | the two font licences, served with the site |

The fonts live in `src/fonts/` rather than `public/`, so Vite rewrites their URLs and the
build works under any `base`. GitHub Pages will need only the `base` option in
`vite.config.ts`.

## The surfaces

| Surface | Shows |
|---|---|
| VS Code | raised sidebar, tabs, diff hunk, nested brackets, selection, word highlight, find match, hover card, terminal panel, status bar |
| Windows Terminal | prompt with git status, coloured listing, an error, all sixteen ANSI slots |
| Landing page | hero, feature cards, buttons, pull quote |
| Admin dashboard | KPI cards, chart, alerts in all four statuses, table with status pills. Measurements are labelled as fixed shipped-palette results; slider changes are measured in the live Contrast readout. The two invented alerts say SAMPLE |
| Documentation | prose, callouts, a code block on the editor surface, a reference table |

## What the tests hold in place

`test/lab.test.ts` runs in node, because every surface is a pure function that returns HTML.

- Every emitted value is a six-digit hex, and only an overlay carries alpha.
- Every `var(--…)` the stylesheet reads is a token the lab emits or a variable it declares.
  A misspelled custom property renders as nothing at all, which no screenshot catches.
- Every syntax and ANSI class the stylesheet defines is applied by a surface.
- **Violet is a syntax hue only.** The test asserts the violet accent scale never reaches
  the interface, and that `--s-keyword` does.
- No source file and no stylesheet contains a hex literal.
- The readout measures the palette the sliders build against `readingStates()`, the same
  set the build gate uses, rather than a second list of its own. A test drops the comment
  to lightness 0.600, which still clears 4.5:1 on the plain editor, and asserts the readout
  reports the failure it has on a selected word inside an added diff line.
- Every number the dashboard prints is a row `checks()` produced.

## Still open

GitHub Pages. The build is static and needs only a `base` and a workflow.
