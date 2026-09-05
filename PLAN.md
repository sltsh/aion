# Aion — implementation plan

Read `DESIGN.md` first. It is the specification. This document is the order of work.

## Status of the plan itself

The colour core of this plan has already been written and executed. It lives in
`explorations/validated/` and its 14 invariant tests pass:

```
cd explorations/validated && node --test "test/*.test.mjs"
# tests 14 | pass 14 | fail 0
```

Running it found three defects that were in the plan before any task started:

1. The light page at lightness 0.995 with a base tint left the sRGB gamut.
   Fixed by a tint that tapers toward white.
2. `lightAccent` rounded lightness after solving for the floor, landing at 4.4996:1.
   Fixed by rounding in the safe direction.
3. A 1.35× chroma boost on light accents left the gamut for copper, gold, green and
   teal. Fixed by walking chroma down until both the floor and the gamut hold.

Task 1 below **ports these files**. It does not re-derive them. Do not paste the code
from this document; there is none to paste.

## Repository

Branch from `main`. Never commit on `main`.

```
aion/
  package.json            # npm workspaces root
  DESIGN.md  README.md  LICENSE  CHANGELOG.md
  AGENTS.md  CLAUDE.md          # git-ignored; CLAUDE.md contains only "@AGENTS.md"
  packages/
    tokens/               # @sltio/aion-tokens — the product
    vscode/               # the .vsix
    terminal/             # Windows Terminal fragment + snippet
    css/                  # custom properties + Tailwind v4 @theme
  apps/
    lab/                  # Vite + TypeScript, no framework
  explorations/           # the design-phase pages; keep, do not build
```

TypeScript, `culori`, `vitest`. npm workspaces, because this machine has npm 11 and no
pnpm.

---

## Task 1 — `packages/tokens`, the colour core

**Port** `explorations/validated/src/{oklch,palette,light}.mjs` to TypeScript at
`packages/tokens/src/`. Port `test/invariants.test.mjs` to `vitest`. Add types; change
no numbers and no logic.

Then add, in this package:

- `semantic.ts` — about 45 aliases over the literal palette, per `DESIGN.md` §12.
- `status.ts` — success, warning, error, info, each with text, solid, subtle and border.
- `index.ts` — the public surface.

**Done when:** all ported tests pass under `vitest`, and `npm run build` emits a typed
ESM package.

**Watch for:** `culori` and the ported `oklch.ts` must agree. Assert that in a test
rather than trusting it; if they disagree, the ported module wins, because its output
is what `DESIGN.md` documents.

## Task 2 — the contrast report

A `verify` script that prints every token, its hex, its surface, and its ratio, and
exits non-zero on any failure. This is what gates the release, and it is the source of
the table in the marketplace README.

**Done when:** `npm run verify` prints the tables in `DESIGN.md` §4 to §11 and exits 0.

## Task 3 — `packages/vscode`

Generate `themes/aion.json` from the token module. About 300 keys, per `DESIGN.md` §13.

Order: editor and syntax first, then sidebar, tabs and status bar, then lists, inputs
and buttons, then diff, merge and peek, then notebooks and testing.

Then the six language overrides: Markdown, JSON, YAML, HTML, CSS, JSX/TSX. Semantic
token map mirroring the TextMate map. No italics.

`package.json`: publisher `sltio`, name `aion`, display name `Aion`, gallery banner
`#11151c` with a dark theme, categories `Themes`.

**Done when:** the extension loads in VS Code, and a snapshot test covers every emitted
key so a one-line palette change appears as a reviewable diff.

**Watch for:** the raised sidebar. `editor.background` is step 1 and `sideBar.background`
is step 3. Every VS Code theme does the reverse, so the default fallbacks will fight the
structure. `panel.background` is step 2 and `terminal.background` is step 2.

## Task 4 — `packages/terminal`

Emit the Windows Terminal fragment extension, and the `settings.json` snippet for the
README. Background `#11151c`, not the panel value.

**Done when:** the fragment installs the scheme without the user editing settings, and a
test asserts the bright eight are byte-identical to the syntax accents.

## Task 5 — `packages/css`

Emit `aion.css` (custom properties, dark and light under `prefers-color-scheme` and a
`[data-theme]` attribute) and `aion.theme.css` (Tailwind v4 `@theme`).

**Done when:** a page that sets no colours of its own renders correctly in both schemes.

## Task 6 — `apps/lab`

Vite plus TypeScript, no framework. It **imports `packages/tokens` directly**, so it
cannot show a palette the extension does not ship. That import is the point of the app.

Five surfaces: VS Code editor, Windows Terminal, a landing page, an admin dashboard, a
documentation page. Live OKLCH controls that re-render all five.

Type: Archivo for display and body, Monaspace Neon for code, both self-hosted. Terminal
glyphs as inline SVG, not the Nerd Font web build.

Local only for now. GitHub Pages later.

**Reuse:** `explorations/` already contains working mock markup for the editor, the
terminal, the landing page and the comparison table. Port it; do not rewrite it.

## Task 7 — release

GitHub Actions on a tag: verify, test, build, package, publish to the Microsoft
marketplace and to Open VSX, and generate the changelog from the commits.

`npm run verify` gates the publish step. Without that gate the contrast floor is a
suggestion.

Version 0.1.0. Publish under the marketplace pre-release flag until real editors stop
surfacing problems the lab cannot, then 1.0.0.

## Task 8 — listing

Icon: the astrolabe mark, supplied by the user, 128×128 and 1024×1024. Gallery banner
`#11151c`. Four screenshots: editor, diff, terminal, sidebar. The README carries the
contrast table from Task 2, because it is the reason to install Aion over One Dark Pro.

---

## Order and parallelism

Tasks 1 and 2 are sequential and block everything. Tasks 3, 4 and 5 are independent of
each other and can run in parallel once Task 2 is green. Task 6 needs Task 5. Tasks 7
and 8 come last.

## Definition of done for the whole plan

- `npm run verify` exits 0.
- Every test passes, including the snapshots.
- The `.vsix` installs and renders correctly in VS Code.
- The Windows Terminal fragment installs and renders correctly.
- The lab renders all five surfaces from the same token module.
- `DESIGN.md` and the emitted values agree. If they disagree, the emitted values are
  right and `DESIGN.md` is stale.
