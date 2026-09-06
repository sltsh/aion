# Aion site — design

A public two-page static site at `https://aion.slt.sh`. A landing page that presents the
theme, and a palette reference page that documents every colour, its name and the
convention that governs it.

This closes the GitHub Pages item that `PLAN.md` Task 6 leaves open, and it satisfies the
"lab site" already named in `DESIGN.md` §13.

## Why the lab is not the site

`apps/lab` is `private: true`, has no deploy workflow, and exists to drive six OKLCH
sliders against five surfaces. It is a local instrument. The site is a public artefact
with a different job: it sells the theme and it documents the palette. They share the
token package and one renderer, and nothing else.

## 1. Placement and build

A new workspace app at `apps/site`, matching the existing `apps/*` workspace glob.

| Item | Value |
|---|---|
| Package name | `@sltio/aion-site`, `private: true` |
| Bundler | Vite, multi-page, no framework |
| Entry points | `index.html`, `palette.html` |
| Output | `apps/site/dist` |
| `base` | `/` |
| Dev port | 8422 (the lab holds 8421) |
| Dependencies | `@sltio/aion-tokens`, `@sltio/aion-css`, `@sltio/aion-lab` |

`apps/site/public/CNAME` holds the single line `aion.slt.sh`.

Type follows `DESIGN.md` §13: Archivo for display and body, Monaspace Neon for code. Both
are SIL OFL 1.1 and both are self-hosted, never fetched from a CDN.
`scripts/fetch-fonts.mjs` gains `apps/site/src/fonts/` as a second target, and
`apps/site/public/fonts/LICENSE.txt` ships the two licences beside the site.

**The trade-off:** this tracks a second copy of both files, 536 KB. The alternative is a
shared `assets/fonts/` that both apps read, which moves working files out of `apps/lab`
and changes its Vite resolution for no gain to the site. A copy is the smaller change,
and `fetch-fonts.mjs` keeps the two in step.

### Pre-render, not runtime render

Every section of the site is a pure function that takes data and returns an HTML string.
None of them reads a DOM global, so `apps/site/test/site.test.ts` runs in Node. This is
the pattern `apps/lab` already proves.

`vite.config.ts` declares one local plugin. Its `transformIndexHtml` hook calls those
functions with the shipped palette and substitutes the result for a marker in each HTML
file:

```html
<main id="app"><!--@aion:landing--></main>
```

The shipped HTML therefore carries every swatch and every hex. A reader without
JavaScript sees the whole page, and a crawler indexes it.

`src/main.ts` carries three behaviours and nothing else:

1. A delegated click handler that copies a swatch's hex to the clipboard.
2. A toggle that reveals the OKLCH triple on every swatch in a section.
3. The dark/light toggle on the palette page, when the build emits it. See §5.

The light toggle re-renders nothing. Both value sets are pre-rendered into the HTML and
the toggle sets one class on `<body>`, so the toggle needs no palette import at runtime
and cannot disagree with the build.

### Flags

`src/flags.ts` declares the two build flags and their shipped values:

```ts
export interface SiteFlags {
  readonly released: boolean;
  readonly lightVisible: boolean;
}

export const FLAGS: SiteFlags = { released: false, lightVisible: false };
```

Every render function takes `SiteFlags` as a parameter. No module reads `FLAGS` except
`vite.config.ts` and the tests, so the tests exercise both settings of both flags. A
hidden path is therefore built and proven, not merely written.

## 2. Where the values come from

`@sltio/aion-css` exports `dark()` and `light()`. Each returns `Record<string, string>`
from CSS custom property name to emitted hex — 91 entries covering surfaces, text,
borders, the seven accent scales, the four status scales, syntax, the caret, the link,
three overlays, the four diff values and the sixteen ANSI slots.

That map is the spine of the palette page. A swatch's variable name and its hex come from
one object, so they cannot disagree.

**Required change to `packages/css/package.json`:**

```json
"exports": {
  ".": {
    "types": "./dist/variables.d.ts",
    "default": "./dist/variables.js"
  },
  "./aion.css": "./css/aion.css",
  "./aion.theme.css": "./css/aion.theme.css"
},
"files": ["css", "dist"]
```

The shape matches `packages/tokens/package.json`, which already exports `types` beside
`default`. `tsconfig.build.json` must emit declarations for `dist/variables.d.ts` to
exist; if it does not already, that flag is part of this change.

This publishes the emitter to consumers of the npm package, not only to this repository.
`packages/css/test/css.test.ts` gains an assertion that the root export resolves and that
`dark()` and `light()` return the same 91 keys.

Values the CSS set does not carry come from `@sltio/aion-tokens` directly: the twelve-step
neutral ramp with its role names, and each accent's hue and chroma.

## 3. The landing page — `index.html`

| Section | Content | Source of every number |
|---|---|---|
| Hero | The name, the αἰών line, the one-line pitch. Archivo width axis on the headline. | Static prose |
| Editor sample | A tokenised code block on the real editor surface | `renderCode` from `@sltio/aion-lab`, sample in `src/samples/hero.ts` |
| The gate | Rows measured, rows below the floor, exempt rows, the lowest ratio in a reading state | `checks()` from `@sltio/aion-tokens` |
| Install | VS Code, Windows Terminal, `@sltio/aion-css`, `@sltio/aion-tokens` | `src/content.ts` |
| Footer | Repository, `DESIGN.md`, MIT, the two font licences | Static prose |

The hero sample is new and deliberately clean. The lab's `TYPESCRIPT` sample stacks a
diff, a selection, a find match and a word highlight on one screen, which is a diagnostic
display. The hero shows ordinary code: comment, keyword, type, function, string, number,
constant, operator and three bracket depths, and nothing else.

`src/samples/hero.ts` imports `kw`, `fn`, `ty`, `st`, `nu`, `va`, `op`, `cm`, `pn`, `co`,
`es`, `sp`, `b1`, `b2`, `b3` and `renderCode` from `@sltio/aion-lab/render/code`. No
second copy of the renderer exists.

**Required change to `apps/lab/package.json`:**

```json
"exports": {
  "./render/code": "./src/render/code.ts"
}
```

`apps/lab/src/render/code.ts` imports nothing and touches no DOM global, so it needs no
build step. Vite and Vitest both treat a linked workspace package as source and transform
its TypeScript.

**The risk, and the fallback.** If either tool refuses to transform TypeScript resolved
through `node_modules`, the fallback is a `tsc` build of that one file into
`apps/lab/dist/render/code.js` with the export pointed at it. Prove the direct import
works in the first task of the plan, before any page depends on it.

No rival comparison appears on either page. The rival data stays in
`packages/tokens/src/rivals.ts` and in the two READMEs, where it belongs to the argument
for the theme rather than to the site.

### Install links before the first release

No `v*` tag exists and no package is on npm, so every install target in this table is
unpublished today. `FLAGS.released` is `false`. While it is `false` the install section
renders each command with a short note that the first release has not shipped. Setting it
to `true` is a one-line change at release time.

| Target | Command or link |
|---|---|
| VS Code | `code --install-extension sltio.aion` |
| Windows Terminal | The fragment from `packages/terminal`, linked to its README |
| CSS | `npm install @sltio/aion-css` |
| Tokens | `npm install @sltio/aion-tokens` |

## 4. The palette page — `palette.html`

Six sections in this order. Each carries a short paragraph that states the convention,
then its swatches. All six show the dark scheme.

| # | Section | Rows | Convention stated |
|---|---|---|---|
| 1 | Neutral ramp | 12 steps of `NEUTRAL_LIGHTNESS`, each with its role and lightness | The editor is the darkest surface and the sidebar is raised above it. Step 10 is a solid-hover step, not a text step; dimmed text uses `dimText`. `hairline` and `divider` are decorative and exempt from the 3:1 floor. |
| 2 | Accents | 7 hues × `subtle`, `border`, `solid`, plus hue and chroma | An accent is solved against the worst surface it can land on. Violet is a syntax hue: five interface keys carry it and no sixth. |
| 3 | Syntax | 9 roles plus `comment` and `punctuation`, each shown as the token it colours | The role map follows One Dark Pro, so muscle memory survives. The comment is the dimmest thing a reader reads, so it sets the budget for every decoration. No italics. |
| 4 | Status | 4 statuses × `text`, `solid`, `subtle`, `border`, `onSolid` | A status pairs its own foreground with its own fill. |
| 5 | Diff and overlays | The four diff values and the three overlays, each shown composited over the editor | The renderer blends bytes, so `compositeEmitted` measures the result. A diff fill paints over the selection, so it must carry an alpha byte. Green costs more luminance per unit of chroma than red does. |
| 6 | Terminal | 16 ANSI slots in `ANSI_ORDER`, on both terminal backgrounds | Every slot is gated on both backgrounds and the VS Code panel binds. Slot 0 is not a text colour; slots 7 and 15 are guaranteed on top of it. |

### The light scheme ships hidden

`dark()` and `light()` emit the same 91 keys — asserted, not assumed — so the light
scheme is never a seventh grid. It is a page-level toggle: each swatch carries both
values and one class on `<body>` selects which one it shows.

**`FLAGS.lightVisible` is `false` at launch.** When it is `false` the build emits no
toggle control, no light value and no light paragraph. The page is dark only, and a
reader who reads the source finds nothing about light.

The reason is in `DESIGN.md` §11 in the project's own words: light gold is `#846800`,
which reads olive, so "the light layer does not carry Aion's signature the way the dark
layer does". A promotional page should not lead with the weakest thing the project
ships. There is also no light VS Code theme, and a toggle invites a reader to expect one.

The render path is still written and still tested, at both settings of the flag. Setting
`lightVisible` to `true` is then a one-line change, not a new feature. When it is `true`
the toggle appears and one paragraph states the convention: light ships in the CSS layer
only, there is no light VS Code theme, and light gold reads olive.

### The swatch

```
┌────────────────────────────┐
│ ████  bg.editor            │   name    — the token name
│ ████  #14171d              │   hex     — click copies it
│ ████  --aion-bg-page       │   variable — from dark()
└────────────────────────────┘
```

The OKLCH triple is present in the HTML and hidden by CSS. The section toggle reveals it.
A copy writes the hex to the clipboard and the swatch confirms it for two seconds.

Names that carry alpha render their eight-digit value and, beside it, the six-digit hex
they composite to over the editor. A reader sees both what is declared and what is seen.

## 5. Tests — `apps/site/test/site.test.ts`

Runs in Node, because every render function is pure.

1. **Parity.** Every hex in the two rendered HTML strings is a hex the token package
   emits. This extends the rule in `AGENTS.md` from the six documents to the site.
2. **No literal.** No source file and no stylesheet under `apps/site/src` holds a hex
   literal.
3. **Every variable read is emitted.** Every `var(--…)` the stylesheet reads is a variable
   `@sltio/aion-css` emits or one the site declares in `:root`.
4. **Every variable emitted is shown.** Every key `dark()` returns appears in a swatch on
   the palette page. A token added to the CSS package and not to the page fails here.
5. **Every swatch names a real variable.** The inverse of 4, so a renamed variable fails
   rather than renders a dead name.
6. **Counts are generated.** The four numbers in the gate section equal the values derived
   from `checks()` at test time.
7. **Violet stays a syntax hue.** The landing page applies no violet accent scale to the
   interface, matching the lab's assertion.
8. **The release note.** The install section carries the unreleased note exactly when
   `released` is `false`.
9. **Light is absent when hidden.** With `lightVisible` false, the rendered palette page
   contains no toggle control and no hex that `light()` emits and `dark()` does not.
10. **Light is complete when shown.** With `lightVisible` true, every key `light()`
    returns appears in a swatch, and the toggle control is present. This is what keeps
    the hidden path correct while nobody looks at it.

Assertions 4, 5, 9 and 10 run the render functions directly with each flag set, so a
hidden path is proven rather than assumed. `FLAGS` supplies only the shipped default.

## 6. Publication

A new workflow, `.github/workflows/pages.yml`:

- Trigger: a push to `main`, and `workflow_dispatch`.
- Steps: checkout, Node 22, `npm ci`, `npm run build`, `npm run build -w ./apps/site`,
  `actions/upload-pages-artifact` on `apps/site/dist`, `actions/deploy-pages`.
- Permissions: `pages: write`, `id-token: write`.
- Concurrency group `pages`, so a second push cancels a queued deploy.

`.github/workflows/ci.yml` gains the site build and the site tests. `npm run build` and
`npm test` at the root already recurse through workspaces, so the site joins both by
existing. CI already fails when a build changes a tracked file, and the site output is
git-ignored, so no new drift check is needed there.

**Two steps belong to the repository owner, not to this change:**

1. A DNS `CNAME` record from `aion.slt.sh` to `sltio.github.io`.
2. GitHub Pages enabled for the repository, source "GitHub Actions", custom domain
   `aion.slt.sh`, "Enforce HTTPS" on.

## 7. Documents this change updates

| Document | Change |
|---|---|
| `README.md` | `apps/site` in the package table, the site URL, the dev command |
| `PLAN.md` | Task 9 for the site; the Pages item under Task 6 resolved |
| `DESIGN.md` §13 | "the lab site" becomes "the lab and the public site" |
| `AGENTS.md` | A short `## The site` section, one line per rule |
| `packages/css/README.md` | The new root export |

`DESIGN.md` is generated in part. The §13 edit is prose, not a generated table, so
`npm run sync:design` is unaffected. The change still runs it, because `AGENTS.md`
requires it after any palette change and the parity test reads all six documents.

## 8. Out of scope

No framework. No search. No analytics. No per-accent detail page. No rival table. No
semantic alias table of 71 dark and 37 light names; the variable on each swatch replaces
it. No blog, no changelog page; `CHANGELOG.md` on GitHub stays the record.

The light scheme is not out of scope, but it is not visible at launch. `lightVisible`
governs that, and §4 gives the reason.

## 9. Definition of done

- `npm run build -w ./apps/site` emits `dist/index.html` and `dist/palette.html`, both
  with swatch markup in the file rather than in a script.
- `npm test` passes, including the ten new assertions.
- `npm run typecheck` passes under `noUncheckedIndexedAccess` and `noUnusedLocals`.
- `npm run verify` still exits 0.
- `npm run sync:design` changes nothing.
- The site renders correctly in Chromium with JavaScript disabled, and the copy action
  works with it enabled.
- Every claim on the landing page is a number `checks()` produced.
- The shipped `dist/palette.html` holds no light value and no toggle control, and the
  test suite still proves the light path at `lightVisible: true`.
