# Aion palette reference site — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public two-page static site at `https://aion.slt.sh` — a landing page that presents the theme, and a palette reference page that documents all 91 emitted CSS variables with the convention that governs each group.

**Architecture:** A new npm workspace app at `apps/site`. Vite multi-page, no framework. Every section is a pure function that takes data and returns an HTML string, so the tests run in Node. A Vite plugin calls those functions at build time and substitutes the result into the two HTML files, so the shipped page needs no JavaScript to be read. Every colour value comes from `@sltio/aion-css`, whose `dark()` and `light()` return a map of CSS variable name to emitted hex — a swatch's name and its value therefore come from one object and cannot disagree.

**Tech Stack:** TypeScript, Vite 8, Vitest 5, npm workspaces. No runtime dependency beyond the three workspace packages.

**Spec:** `docs/superpowers/specs/2026-09-06-palette-site-design.md`

## Global Constraints

- **Never type a hex value.** Change the OKLCH definition in `packages/tokens/src` and rebuild. A test rejects any hex literal in `apps/site/src`.
- `@sltio/aion-css` emits **91** variables from `dark()` and **91** from `light()`, and the two key sets are identical. Measured, and asserted in Task 1.
- `apps/site` is `private: true`. It adds **no** dependency outside the workspace.
- `packages/tokens` gains **no** runtime dependency.
- TypeScript is strict, with `noUncheckedIndexedAccess`, `noUnusedLocals` and `noUnusedParameters`. Follow `apps/lab/tsconfig.json`.
- Type is Archivo (display and body) and Monaspace Neon (code), both SIL OFL 1.1, both self-hosted. Never a CDN.
- `FLAGS.released` and `FLAGS.lightVisible` are both `false` at launch. Render functions take `SiteFlags` as a parameter; only `vite.config.ts` and the tests read `FLAGS`.
- No rival comparison on either page.
- Imperative mood in commit messages. Commit at the end of every task.

---

### Task 1: Export what the site consumes

Three packages expose slightly less than the site needs. This task opens exactly those three doors and proves each one.

**Files:**
- Modify: `packages/tokens/src/report.ts:44` — export `NEUTRAL_ROLE`
- Modify: `packages/tokens/src/index.ts:41` — re-export it
- Modify: `packages/css/tsconfig.json` — `declaration: true`
- Modify: `packages/css/package.json` — root export and `files`
- Modify: `apps/lab/package.json` — `exports` for the code renderer
- Test: `packages/css/test/css.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `NEUTRAL_ROLE: Record<NeutralName, string>` from `@sltio/aion-tokens`
  - `dark(): Record<string, string>` and `light(): Record<string, string>` from `@sltio/aion-css`
  - `renderCode`, `CodeLine`, `Token` and the token helpers `kw fn ty st nu va op cm pn co es sp b1 b2 b3` from `@sltio/aion-lab/render/code`

- [ ] **Step 1: Write the failing test**

Append to `packages/css/test/css.test.ts`. That file imports `test` and `expect` from
vitest and does not use `describe`, so these are flat `test` calls:

```ts
test('the package root export emits the same names in both schemes', async () => {
  const entry = await import('@sltio/aion-css');
  const darkKeys = Object.keys(entry.dark()).sort();
  const lightKeys = Object.keys(entry.light()).sort();
  expect(darkKeys).toEqual(lightKeys);
  expect(darkKeys.length).toBeGreaterThan(0);
});

// Four dark variables and one light variable carry an alpha byte: the selection, the
// line highlight and the two diff fills. VS Code paints a diff fill over the selection,
// so an opaque one would hide it.
test('the package root export emits a hex for every variable, with or without alpha', async () => {
  const entry = await import('@sltio/aion-css');
  for (const scheme of [entry.dark(), entry.light()]) {
    for (const [name, value] of Object.entries(scheme)) {
      expect(value, name).toMatch(/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/);
    }
  }
});
```

Import from `@sltio/aion-css`, not from `../src/variables.js`. The existing tests import
the source; these two exist to prove the package's root export resolves.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-css`
Expected: FAIL. `@sltio/aion-css` has no root export, so the import cannot resolve.

- [ ] **Step 3: Open the three doors**

`packages/tokens/src/report.ts` line 44 — add the keyword only:

```ts
export const NEUTRAL_ROLE: Record<keyof typeof NEUTRAL_LIGHTNESS, string> = {
```

`packages/tokens/src/index.ts` — extend the existing `report.js` export line:

```ts
export type { Check, CheckState } from './report.js';
export { checks, failures, designTables, NEUTRAL_ROLE } from './report.js';
```

`packages/css/tsconfig.json` — one value:

```json
"declaration": true,
```

`packages/css/package.json` — replace `exports` and `files`:

```json
  "exports": {
    ".": {
      "types": "./dist/variables.d.ts",
      "default": "./dist/variables.js"
    },
    "./aion.css": "./css/aion.css",
    "./aion.theme.css": "./css/aion.theme.css"
  },
  "files": [
    "css",
    "dist"
  ],
```

`apps/lab/package.json` — add `exports` after `"type": "module"`:

```json
  "exports": {
    "./render/code": "./src/render/code.ts"
  },
```

- [ ] **Step 4: Run the test and the whole suite**

Run: `npm run build && npm test && npm run typecheck`
Expected: PASS throughout. `packages/css/dist/variables.d.ts` now exists.

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/report.ts packages/tokens/src/index.ts \
        packages/css/tsconfig.json packages/css/package.json \
        packages/css/test/css.test.ts apps/lab/package.json
git commit -m "Export the emitter surface the site consumes

The site reads the CSS variable map, the neutral role names and the lab
code renderer. None of the three was reachable from outside its package.

Turn on declaration emit for the CSS package so the new root export can
carry types, matching the shape packages/tokens already uses."
```

---

### Task 2: Site skeleton and the pre-render pipeline

Prove the whole pipeline before any content exists: a Vite multi-page build that substitutes rendered HTML into both pages at build time.

**Files:**
- Create: `apps/site/package.json`, `apps/site/tsconfig.json`, `apps/site/vite.config.ts`
- Create: `apps/site/index.html`, `apps/site/palette.html`
- Create: `apps/site/src/flags.ts`, `apps/site/src/render/html.ts`, `apps/site/src/render/index.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 yet
- Produces:
  - `SiteFlags { released: boolean; lightVisible: boolean }` and `FLAGS: SiteFlags` from `src/flags.ts`
  - `escapeHtml(value: string): string` from `src/render/html.ts`
  - `landing(flags: SiteFlags): string` and `palette(flags: SiteFlags): string` from `src/render/index.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/site/test/site.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FLAGS } from '../src/flags.js';
import { escapeHtml } from '../src/render/html.js';
import { landing, palette } from '../src/render/index.js';

describe('the render entry points', () => {
  it('returns a string for each page', () => {
    expect(typeof landing(FLAGS)).toBe('string');
    expect(typeof palette(FLAGS)).toBe('string');
  });

  it('ships both flags off', () => {
    expect(FLAGS.released).toBe(false);
    expect(FLAGS.lightVisible).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes the three characters that break markup', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href="x"&gt;&amp;&lt;/a&gt;');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL. The workspace does not exist yet.

- [ ] **Step 3: Create the workspace**

`apps/site/package.json`:

```json
{
  "name": "@sltio/aion-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@sltio/aion-css": "*",
    "@sltio/aion-lab": "*",
    "@sltio/aion-tokens": "*"
  }
}
```

`apps/site/tsconfig.json` — copied from `apps/lab/tsconfig.json`, which is the established pattern:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "vite.config.ts"]
}
```

`apps/site/src/flags.ts`:

```ts
export interface SiteFlags {
  readonly released: boolean;
  readonly lightVisible: boolean;
}

export const FLAGS: SiteFlags = { released: false, lightVisible: false };
```

`apps/site/src/render/html.ts`:

```ts
export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
```

`apps/site/src/render/index.ts`:

```ts
import type { SiteFlags } from '../flags.js';

export const landing = (_flags: SiteFlags): string => '<section class="hero"><h1>Aion</h1></section>';

export const palette = (_flags: SiteFlags): string => '<section class="groups"></section>';
```

- [ ] **Step 4: Run the test**

Run: `npm install && npm test -w @sltio/aion-site`
Expected: PASS, three tests.

- [ ] **Step 5: Write the failing build test**

Append to `apps/site/test/site.test.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('the build', () => {
  it('substitutes the rendered body into both pages', () => {
    execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'pipe' });
    const index = readFileSync(`${root}dist/index.html`, 'utf8');
    const palettePage = readFileSync(`${root}dist/palette.html`, 'utf8');
    expect(index).toContain(landing(FLAGS));
    expect(palettePage).toContain(palette(FLAGS));
    expect(index).not.toContain('@aion:');
    expect(palettePage).not.toContain('@aion:');
  }, 60_000);
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL. There is no `vite.config.ts` and no HTML file.

- [ ] **Step 7: Add the pages and the plugin**

`apps/site/index.html`:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aion — a dark theme measured against its own floor</title>
    <meta name="description" content="A dark theme and a colour system for editors, terminals and web interfaces. Every colour is defined in OKLCH and gated on the surface it sits on." />
    <link rel="icon" href="/icon.png" />
  </head>
  <body>
    <main id="app"><!--@aion:landing--></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`apps/site/palette.html`:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aion — the palette</title>
    <meta name="description" content="Every colour Aion emits, its CSS custom property and the convention that governs it." />
    <link rel="icon" href="/icon.png" />
  </head>
  <body>
    <main id="app"><!--@aion:palette--></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`apps/site/vite.config.ts`:

```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { FLAGS } from './src/flags.js';
import { landing, palette } from './src/render/index.js';

const MARKERS: Record<string, () => string> = {
  '<!--@aion:landing-->': () => landing(FLAGS),
  '<!--@aion:palette-->': () => palette(FLAGS),
};

export default defineConfig({
  base: '/',
  server: { host: true, port: 8422 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        palette: resolve(import.meta.dirname, 'palette.html'),
      },
    },
  },
  plugins: [
    {
      name: 'aion-prerender',
      transformIndexHtml(html: string): string {
        let out = html;
        for (const [marker, render] of Object.entries(MARKERS)) out = out.replace(marker, render());
        return out;
      },
    },
  ],
});
```

Create `apps/site/src/main.ts` with the minimum the HTML references:

```ts
export {};
```

- [ ] **Step 8: Run the test**

Run: `npm test -w @sltio/aion-site`
Expected: PASS, four tests. `apps/site/dist/index.html` holds `<h1>Aion</h1>` in the file itself.

- [ ] **Step 9: Commit**

```bash
git add apps/site
git commit -m "Add the site workspace and its pre-render pipeline

Two HTML entry points, a Vite plugin that substitutes a rendered body
into each at build time, and a flags record every render function takes
as a parameter. The shipped HTML therefore carries the page rather than
a script that builds it."
```

---

### Task 3: Variable groups and total coverage

Partition all 91 variables into the six sections by name prefix, and prove the partition is total in both directions. This is the guard that stops a new token reaching the CSS package and never appearing on the page.

**Files:**
- Create: `apps/site/src/groups.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: `dark`, `light` from `@sltio/aion-css`; `ACCENT_NAMES` from `@sltio/aion-tokens`
- Produces:
  - `SwatchData { variable: string; dark: string; light: string }`
  - `Group { id: GroupId; title: string; swatches: readonly SwatchData[] }`
  - `GROUP_IDS: readonly GroupId[]`, `groupOf(variable: string): GroupId | undefined`, `groups(): readonly Group[]`

- [ ] **Step 1: Write the failing test**

Append to `apps/site/test/site.test.ts`:

```ts
import { dark, light } from '@sltio/aion-css';
import { GROUP_IDS, groupOf, groups } from '../src/groups.js';

describe('the variable groups', () => {
  it('assigns every emitted variable to a group', () => {
    for (const variable of Object.keys(dark())) {
      expect(groupOf(variable), variable).toBeDefined();
    }
  });

  it('shows every emitted variable exactly once', () => {
    const shown = groups().flatMap((group) => group.swatches.map((s) => s.variable));
    expect(shown.slice().sort()).toEqual(Object.keys(dark()).sort());
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('leaves no group empty', () => {
    for (const group of groups()) expect(group.swatches.length, group.id).toBeGreaterThan(0);
  });

  it('carries both schemes on every swatch', () => {
    const l = light();
    for (const group of groups()) {
      for (const s of group.swatches) {
        expect(s.dark, s.variable).toBe(dark()[s.variable]);
        expect(s.light, s.variable).toBe(l[s.variable]);
      }
    }
  });

  it('orders the groups as the page reads them', () => {
    expect(groups().map((g) => g.id)).toEqual([...GROUP_IDS]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL with "Cannot find module '../src/groups.js'".

- [ ] **Step 3: Write the implementation**

`apps/site/src/groups.ts`:

```ts
import { dark, light } from '@sltio/aion-css';
import { ACCENT_NAMES } from '@sltio/aion-tokens';

export interface SwatchData {
  readonly variable: string;
  readonly dark: string;
  readonly light: string;
}

export const GROUP_IDS = ['surface', 'accent', 'syntax', 'status', 'decoration', 'terminal'] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export interface Group {
  readonly id: GroupId;
  readonly title: string;
  readonly swatches: readonly SwatchData[];
}

export const GROUP_TITLES: Record<GroupId, string> = {
  surface: 'Surfaces, text and borders',
  accent: 'Accents',
  syntax: 'Syntax',
  status: 'Status',
  decoration: 'Diff and overlays',
  terminal: 'Terminal',
};

// The partition is by name prefix and it is total. `groupOf` returns undefined rather
// than a default group, so a variable the CSS package adds under a new prefix fails a
// test instead of landing silently among the accents.
const PREFIXES: readonly (readonly [string, GroupId])[] = [
  ['--aion-bg-', 'surface'],
  ['--aion-fg-', 'surface'],
  ['--aion-border-', 'surface'],
  ['--aion-syntax-', 'syntax'],
  ['--aion-caret', 'syntax'],
  ['--aion-status-', 'status'],
  ['--aion-diff-', 'decoration'],
  ['--aion-overlay-', 'decoration'],
  ['--aion-ansi-', 'terminal'],
  ...ACCENT_NAMES.map((name): readonly [string, GroupId] => [`--aion-${name}-`, 'accent']),
];

export function groupOf(variable: string): GroupId | undefined {
  for (const [prefix, id] of PREFIXES) if (variable.startsWith(prefix)) return id;
  return undefined;
}

export function groups(): readonly Group[] {
  const darkValues = dark();
  const lightValues = light();
  const collected: Record<GroupId, SwatchData[]> = {
    surface: [], accent: [], syntax: [], status: [], decoration: [], terminal: [],
  };

  for (const [variable, darkValue] of Object.entries(darkValues)) {
    const id = groupOf(variable);
    if (id === undefined) throw new Error(`no group for ${variable}`);
    const lightValue = lightValues[variable];
    if (lightValue === undefined) throw new Error(`no light value for ${variable}`);
    collected[id].push({ variable, dark: darkValue, light: lightValue });
  }

  return GROUP_IDS.map((id) => ({ id, title: GROUP_TITLES[id], swatches: collected[id] }));
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -w @sltio/aion-site`
Expected: PASS, nine tests.

- [ ] **Step 5: Commit**

```bash
git add apps/site/src/groups.ts apps/site/test/site.test.ts
git commit -m "Partition the emitted variables into the page sections

groupOf returns undefined for an unrecognised prefix rather than a
default group, so a variable added to the CSS package under a new prefix
fails a test instead of landing silently among the accents."
```

---

### Task 4: The swatch, the ramp table and the accent table

**Files:**
- Create: `apps/site/src/render/swatch.ts`, `apps/site/src/tables.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: `SwatchData`, `Group` from Task 3; `escapeHtml` from Task 2
- Produces:
  - `swatch(data: SwatchData): string`, `swatchGrid(group: Group): string`
  - `RampRow { step: number; role: string; lightness: string; hex: string; variable: string | undefined }`
  - `rampRows(): readonly RampRow[]`, `renderRamp(): string`
  - `AccentRow { name: string; hue: number; chroma: string; solid: string; border: string; subtle: string }`
  - `accentRows(): readonly AccentRow[]`, `renderAccents(): string`

- [ ] **Step 1: Write the failing test**

Append to `apps/site/test/site.test.ts`:

```ts
import { NEUTRAL_LIGHTNESS, ACCENT_NAMES, neutral, hex } from '@sltio/aion-tokens';
import { swatch, swatchGrid } from '../src/render/swatch.js';
import { accentRows, rampRows, renderAccents, renderRamp } from '../src/tables.js';

describe('a swatch', () => {
  it('carries the name, both values and a copy target', () => {
    const html = swatch({ variable: '--aion-bg-page', dark: '#11151c', light: '#fafcfe' }, FLAGS);
    expect(html).toContain('--aion-bg-page');
    expect(html).toContain('data-dark="#11151c"');
    expect(html).toContain('data-copy');
  });

  it('renders one swatch per variable in a group', () => {
    const group = groups()[0];
    if (group === undefined) throw new Error('no first group');
    const html = swatchGrid(group, FLAGS);
    for (const s of group.swatches) expect(html).toContain(s.variable);
  });
});

describe('the neutral ramp table', () => {
  it('holds every step of the ramp in order', () => {
    expect(rampRows().map((r) => r.role.length > 0).every(Boolean)).toBe(true);
    expect(rampRows()).toHaveLength(Object.keys(NEUTRAL_LIGHTNESS).length);
  });

  it('names the authored lightness, not one recovered from the hex', () => {
    for (const row of rampRows()) {
      const name = row.step - 1;
      const authored = Object.values(NEUTRAL_LIGHTNESS)[name];
      if (authored === undefined) throw new Error(`no lightness for step ${row.step}`);
      expect(row.lightness).toBe(authored.toFixed(3));
    }
  });

  it('marks the one step the CSS layer does not emit', () => {
    const sidebar = rampRows().find((r) => r.hex === hex(neutral.sidebar));
    expect(sidebar?.variable).toBeUndefined();
    const others = rampRows().filter((r) => r.hex !== hex(neutral.sidebar));
    for (const row of others) expect(row.variable, row.role).toBeDefined();
  });

  it('says so on the page', () => {
    expect(renderRamp()).toContain('VS Code only');
  });
});

describe('the accent table', () => {
  it('holds every accent with its authored hue and chroma', () => {
    expect(accentRows().map((r) => r.name)).toEqual([...ACCENT_NAMES]);
    for (const row of accentRows()) expect(renderAccents()).toContain(`${row.hue}°`);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL with "Cannot find module '../src/render/swatch.js'".

- [ ] **Step 3: Write the swatch**

`apps/site/src/render/swatch.ts`:

```ts
import type { SiteFlags } from '../flags.js';
import type { Group, SwatchData } from '../groups.js';
import { escapeHtml } from './html.js';

// Four dark values carry an alpha byte. A chip sits on a raised card, so painting the
// value straight onto it would composite a decoration over the wrong surface. The chip
// paints the value over the page colour instead, which is the editor, so what a reader
// sees is what the gate measured. `styles.css` does the compositing.
export function swatch(data: SwatchData, flags: SiteFlags): string {
  const name = escapeHtml(data.variable);
  const lightAttr = flags.lightVisible ? ` data-light="${data.light}"` : '';
  return `<button type="button" class="swatch" data-copy data-dark="${data.dark}"${lightAttr}>
    <span class="swatch-chip" style="--site-swatch:var(${name})"></span>
    <code class="swatch-name">${name}</code>
    <code class="swatch-hex">${data.dark}</code>
  </button>`;
}

export function swatchGrid(group: Group, flags: SiteFlags): string {
  return `<div class="swatch-grid">${group.swatches.map((s) => swatch(s, flags)).join('')}</div>`;
}
```

The flags parameter is here from the start rather than added in Task 9. Introducing it
later would mean rewriting this file and both call sites for no gain.

- [ ] **Step 4: Write the tables**

`apps/site/src/tables.ts`:

```ts
import { dark } from '@sltio/aion-css';
import {
  ACCENTS, ACCENT_NAMES, NEUTRAL_LIGHTNESS, NEUTRAL_ROLE, accentScale, hex, neutral,
} from '@sltio/aion-tokens';
import type { AccentName, NeutralName } from '@sltio/aion-tokens';
import { escapeHtml } from './render/html.js';

export interface RampRow {
  readonly step: number;
  readonly role: string;
  readonly lightness: string;
  readonly hex: string;
  readonly variable: string | undefined;
}

// The CSS layer names surfaces by depth, so it emits five of the twelve steps under
// --aion-bg-*. The rest surface as text or border names, and `sidebar` has no web
// equivalent at all. Matching on the emitted hex finds the name whatever it is called.
const variableFor = (colour: string, emitted: Record<string, string>): string | undefined =>
  Object.keys(emitted).find((name) => emitted[name] === colour);

export function rampRows(): readonly RampRow[] {
  const emitted = dark();
  return (Object.keys(NEUTRAL_LIGHTNESS) as NeutralName[]).map((name, index) => {
    const lightness = NEUTRAL_LIGHTNESS[name];
    const value = hex(neutral[name]);
    return {
      step: index + 1,
      role: NEUTRAL_ROLE[name],
      lightness: lightness.toFixed(3),
      hex: value,
      variable: variableFor(value, emitted),
    };
  });
}

export function renderRamp(): string {
  const rows = rampRows().map((row) => `<tr>
    <td>${row.step}</td>
    <td>${escapeHtml(row.role)}</td>
    <td><code>${row.lightness}</code></td>
    <td><code>${row.hex}</code></td>
    <td>${row.variable === undefined ? '<span class="note">VS Code only</span>' : `<code>${escapeHtml(row.variable)}</code>`}</td>
  </tr>`).join('');
  return `<table class="ramp">
    <thead><tr><th>Step</th><th>Role</th><th>Lightness</th><th>Hex</th><th>CSS variable</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export interface AccentRow {
  readonly name: AccentName;
  readonly hue: number;
  readonly chroma: string;
  readonly solid: string;
  readonly border: string;
  readonly subtle: string;
}

export function accentRows(): readonly AccentRow[] {
  return ACCENT_NAMES.map((name) => {
    const [, chroma, hue] = ACCENTS[name];
    const scale = accentScale(name);
    return {
      name,
      hue,
      chroma: chroma.toFixed(4),
      solid: hex(scale.solid),
      border: hex(scale.border),
      subtle: hex(scale.subtle),
    };
  });
}

export function renderAccents(): string {
  const rows = accentRows().map((row) => `<tr>
    <td><span class="dot" style="--site-swatch:var(--aion-${row.name}-solid)"></span>${row.name}</td>
    <td><code>${row.hue}°</code></td>
    <td><code>${row.chroma}</code></td>
    <td><code>${row.solid}</code></td>
    <td><code>${row.border}</code></td>
    <td><code>${row.subtle}</code></td>
  </tr>`).join('');
  return `<table class="accents">
    <thead><tr><th>Accent</th><th>Hue</th><th>Chroma</th><th>Solid</th><th>Border</th><th>Subtle</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -w @sltio/aion-site`
Expected: PASS, fifteen tests.

- [ ] **Step 6: Commit**

```bash
git add apps/site/src/render/swatch.ts apps/site/src/tables.ts apps/site/test/site.test.ts
git commit -m "Add the swatch and the two authored-value tables

The ramp table reports the authored lightness from NEUTRAL_LIGHTNESS and
the accent table the authored hue and chroma from ACCENTS. Neither is
recovered from the emitted hex, because hexToOklch returns the rounded
value and would disagree with DESIGN.md on every row."
```

---

### Task 5: The palette page

**Files:**
- Create: `apps/site/src/content.ts`
- Modify: `apps/site/src/render/index.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: `groups`, `GROUP_IDS` from Task 3; `renderRamp`, `renderAccents`, `swatchGrid` from Task 4
- Produces: `CONVENTIONS: Record<GroupId, string>` from `src/content.ts`; `palette(flags)` now returns the real page

- [ ] **Step 1: Write the failing test**

Append to `apps/site/test/site.test.ts`:

```ts
import { CONVENTIONS } from '../src/content.js';

describe('the palette page', () => {
  const html = () => palette(FLAGS);

  it('carries a section for every group, in order', () => {
    const positions = GROUP_IDS.map((id) => html().indexOf(`id="${id}"`));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    expect(positions.slice().sort((a, b) => a - b)).toEqual(positions);
  });

  it('states the convention for every group', () => {
    for (const id of GROUP_IDS) {
      const text = CONVENTIONS[id];
      expect(text.length, id).toBeGreaterThan(0);
      expect(html()).toContain(escapeHtml(text));
    }
  });

  it('shows every emitted variable', () => {
    for (const variable of Object.keys(dark())) expect(html()).toContain(variable);
  });

  it('carries the ramp table and the accent table', () => {
    expect(html()).toContain('VS Code only');
    expect(html()).toContain('<table class="accents">');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL with "Cannot find module '../src/content.js'".

- [ ] **Step 3: Write the prose**

`apps/site/src/content.ts`:

```ts
import type { GroupId } from './groups.js';

export const CONVENTIONS: Record<GroupId, string> = {
  surface:
    'The editor is the darkest surface and the sidebar is raised above it, which is the '
    + 'reverse of every VS Code default fallback. Step 10 of the ramp is a solid-hover '
    + 'step, not a text step: dimmed text uses its own value and only the line number '
    + 'borrows step 10, under a documented exemption. The hairline and the divider are '
    + 'decorative and exempt from the 3:1 floor; the edge of a control a keyboard user '
    + 'has to find is a border, and it is measured on both surfaces it touches.',
  accent:
    'An accent is solved against the worst surface it can land on: the lightest on dark, '
    + 'the darkest on light. Each one carries three steps. Subtle is a fill, border is an '
    + 'edge, and solid is the colour itself. Violet is a syntax hue, so exactly five '
    + 'interface keys carry it and a test fails on a sixth.',
  syntax:
    'The role map follows One Dark Pro, so muscle memory survives a switch. The comment '
    + 'is the dimmest thing a reader has to read, which makes it the budget for every '
    + 'decoration that can sit under running code: every overlay alpha is solved against '
    + 'it rather than chosen. There are no italics anywhere.',
  status:
    'A status carries its own foreground, its own fill and its own edge, so a pill or a '
    + 'callout never pairs a status colour with a surface nobody measured. Text and '
    + 'on-solid are the two foregrounds, and each is gated against the fill beneath it.',
  decoration:
    'A decoration is composited before it is measured, because the renderer blends bytes '
    + 'and blending in OKLCH misses the rounding on both operands. A diff fill paints over '
    + 'the selection rather than under it, so it has to carry an alpha byte or it would '
    + 'hide the selection on every changed line. Green costs more luminance per unit of '
    + 'chroma than red does, so a green marker and a red marker at the same contrast ratio '
    + 'do not carry the same amount of colour. That gap is the sRGB gamut, not a mistake.',
  terminal:
    'Every foreground slot is gated on both backgrounds it can land on: the standalone '
    + 'terminal and the lighter VS Code panel, which is the one that binds. Slot 0 is not '
    + 'a text colour and raising it far enough to be legible would break SGR 40 and '
    + 'reverse video. What it guarantees is the other direction: slots 7 and 15 clear the '
    + 'text floor on top of it.',
};

export const PALETTE_INTRO =
  'Every value below is emitted by @sltio/aion-css. Nothing here is typed by hand: change '
  + 'the OKLCH definition in the token package and every one of these moves with it. Click '
  + 'a swatch to copy its hex.';
```

- [ ] **Step 4: Assemble the page**

Replace `apps/site/src/render/index.ts`:

```ts
import type { SiteFlags } from '../flags.js';
import { CONVENTIONS, PALETTE_INTRO } from '../content.js';
import { groups } from '../groups.js';
import { renderAccents, renderRamp } from '../tables.js';
import { escapeHtml } from './html.js';
import { swatchGrid } from './swatch.js';

const EXTRA: Partial<Record<GroupId, () => string>> = {
  surface: renderRamp,
  accent: renderAccents,
};

export const landing = (_flags: SiteFlags): string => '<section class="hero"><h1>Aion</h1></section>';

export function palette(_flags: SiteFlags): string {
  const sections = groups().map((group) => {
    const extra = EXTRA[group.id];
    return `<section class="group" id="${group.id}">
      <h2>${escapeHtml(group.title)}</h2>
      <p class="convention">${escapeHtml(CONVENTIONS[group.id])}</p>
      ${swatchGrid(group)}
      ${extra === undefined ? '' : extra()}
    </section>`;
  }).join('');

  return `<article class="palette">
    <header class="page-head">
      <h1>The palette</h1>
      <p class="lede">${escapeHtml(PALETTE_INTRO)}</p>
    </header>
    ${sections}
  </article>`;
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -w @sltio/aion-site`
Expected: PASS, nineteen tests.

- [ ] **Step 6: Commit**

```bash
git add apps/site/src/content.ts apps/site/src/render/index.ts apps/site/test/site.test.ts
git commit -m "Assemble the palette page from the grouped variables

Each section states its convention above its swatches. A test asserts
every emitted variable reaches the page, so a token added to the CSS
package cannot ship undocumented."
```

---

### Task 6: The gate summary and the landing page

**Files:**
- Create: `apps/site/src/gate.ts`
- Modify: `apps/site/src/content.ts`, `apps/site/src/render/index.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: `checks`, `readingStates` from `@sltio/aion-tokens`; `SiteFlags` from Task 2
- Produces:
  - `GateSummary { rowsMeasured: number; belowFloor: number; exemptRows: number; readingStates: number; lowestDecorated: string }`
  - `gateSummary(): GateSummary`
  - `INSTALL: readonly InstallEntry[]`, `UNRELEASED_NOTE: string`

- [ ] **Step 1: Write the failing test**

Append to `apps/site/test/site.test.ts`:

```ts
import { checks, readingStates } from '@sltio/aion-tokens';
import { gateSummary } from '../src/gate.js';
import { INSTALL, UNRELEASED_NOTE } from '../src/content.js';

describe('the gate summary', () => {
  it('derives every number from checks(), not from a literal', () => {
    const rows = checks();
    const summary = gateSummary();
    expect(summary.rowsMeasured).toBe(rows.length);
    expect(summary.belowFloor).toBe(rows.filter((r) => r.state === 'fail').length);
    expect(summary.exemptRows).toBe(rows.filter((r) => r.state === 'exempt').length);
    expect(summary.readingStates).toBe(readingStates().length);
    const decorated = rows.filter((r) => r.section === 'decorated' && r.state === 'pass');
    expect(summary.lowestDecorated).toBe(Math.min(...decorated.map((r) => r.ratio)).toFixed(2));
  });

  it('reports no failure, which is the claim the page makes', () => {
    expect(gateSummary().belowFloor).toBe(0);
  });
});

describe('the landing page', () => {
  it('prints the gate numbers it derived', () => {
    const html = landing(FLAGS);
    const summary = gateSummary();
    expect(html).toContain(String(summary.rowsMeasured));
    expect(html).toContain(summary.lowestDecorated);
  });

  it('lists every install target', () => {
    const html = landing(FLAGS);
    for (const entry of INSTALL) expect(html).toContain(escapeHtml(entry.label));
  });

  it('carries the unreleased note exactly when released is false', () => {
    expect(landing({ released: false, lightVisible: false })).toContain(escapeHtml(UNRELEASED_NOTE));
    expect(landing({ released: true, lightVisible: false })).not.toContain(escapeHtml(UNRELEASED_NOTE));
  });

  it('names no rival theme', () => {
    const html = landing(FLAGS).toLowerCase();
    for (const rival of ['one dark', 'ayu', 'nord', 'catppuccin']) expect(html).not.toContain(rival);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL with "Cannot find module '../src/gate.js'".

- [ ] **Step 3: Write the gate summary**

`apps/site/src/gate.ts`:

```ts
import { checks, readingStates } from '@sltio/aion-tokens';

export interface GateSummary {
  readonly rowsMeasured: number;
  readonly belowFloor: number;
  readonly exemptRows: number;
  readonly readingStates: number;
  readonly lowestDecorated: string;
}

// The same derivation scripts/sync-design.mjs uses for the table in DESIGN.md and both
// READMEs. The lowest ratio is taken over the decorated rows that pass, because that is
// the worst reading state the gate covers rather than the worst row of any kind.
export function gateSummary(): GateSummary {
  const rows = checks();
  const decorated = rows.filter((row) => row.section === 'decorated' && row.state === 'pass');
  return {
    rowsMeasured: rows.length,
    belowFloor: rows.filter((row) => row.state === 'fail').length,
    exemptRows: rows.filter((row) => row.state === 'exempt').length,
    readingStates: readingStates().length,
    lowestDecorated: Math.min(...decorated.map((row) => row.ratio)).toFixed(2),
  };
}
```

- [ ] **Step 4: Add the install content**

Append to `apps/site/src/content.ts`:

```ts
export interface InstallEntry {
  readonly label: string;
  readonly command: string;
  readonly note: string;
}

export const INSTALL: readonly InstallEntry[] = [
  {
    label: 'VS Code',
    command: 'code --install-extension sltio.aion',
    note: 'The theme, six language overrides and no italics.',
  },
  {
    label: 'Windows Terminal',
    command: 'Copy fragments/aion.json into the Fragments directory',
    note: 'Installs the scheme without a settings edit.',
  },
  {
    label: 'CSS',
    command: 'npm install @sltio/aion-css',
    note: 'Custom properties and a Tailwind v4 @theme block, both schemes.',
  },
  {
    label: 'Tokens',
    command: 'npm install @sltio/aion-tokens',
    note: 'The OKLCH definitions, the solver and the contrast gate.',
  },
];

export const UNRELEASED_NOTE =
  'Aion has not had its first release yet, so these commands do not resolve. Build it from '
  + 'the repository in the meantime.';

export const PITCH =
  'A dark theme and a colour system for editors, terminals and web interfaces. Every colour '
  + 'is defined in OKLCH and measured against the surface it actually sits on, with every '
  + 'decoration composited the way the renderer composites it.';
```

- [ ] **Step 5: Write the landing page**

Replace the `landing` function in `apps/site/src/render/index.ts`, and add the imports:

```ts
import { INSTALL, PITCH, UNRELEASED_NOTE } from '../content.js';
import { gateSummary } from '../gate.js';
```

```ts
export function landing(flags: SiteFlags): string {
  const summary = gateSummary();
  const figures: readonly (readonly [string, string])[] = [
    [String(summary.rowsMeasured), 'rows measured'],
    [String(summary.belowFloor), 'below their floor'],
    [String(summary.readingStates), 'reading states per syntax colour'],
    [`${summary.lowestDecorated}:1`, 'lowest ratio in a reading state'],
  ];

  const install = INSTALL.map((entry) => `<li>
    <h3>${escapeHtml(entry.label)}</h3>
    <pre><code>${escapeHtml(entry.command)}</code></pre>
    <p>${escapeHtml(entry.note)}</p>
  </li>`).join('');

  return `<article class="landing">
    <section class="hero">
      <h1>Aion</h1>
      <p class="lede">${escapeHtml(PITCH)}</p>
      <p class="actions"><a class="button" href="/palette.html">See the palette</a></p>
    </section>
    <section class="sample" id="sample"></section>
    <section class="gate" id="gate">
      <h2>The floor is a gate, not a claim</h2>
      <dl class="figures">${figures.map(([value, label]) =>
        `<div><dt>${value}</dt><dd>${escapeHtml(label)}</dd></div>`).join('')}</dl>
      <p>The gate exits non-zero on a colour below its floor, and CI runs it on every
      branch, so a colour below the floor cannot be released. It covers a named set of
      reading states, not every state a renderer can produce.</p>
    </section>
    <section class="install" id="install">
      <h2>Install</h2>
      ${flags.released ? '' : `<p class="note">${escapeHtml(UNRELEASED_NOTE)}</p>`}
      <ul class="install-list">${install}</ul>
    </section>
  </article>`;
}
```

- [ ] **Step 6: Run the test**

Run: `npm test -w @sltio/aion-site`
Expected: PASS, twenty-five tests.

- [ ] **Step 7: Commit**

```bash
git add apps/site/src/gate.ts apps/site/src/content.ts apps/site/src/render/index.ts apps/site/test/site.test.ts
git commit -m "Add the landing page and derive its figures from the gate

Every number on the page comes from checks() and readingStates(), using
the derivation scripts/sync-design.mjs already uses for DESIGN.md. A
test compares each one against that derivation rather than a literal."
```

---

### Task 7: The hero code sample

**Files:**
- Create: `apps/site/src/samples/hero.ts`
- Modify: `apps/site/src/render/index.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: `renderCode` and the token helpers from `@sltio/aion-lab/render/code`
- Produces: `HERO_SAMPLE: readonly CodeLine[]`, `renderHero(): string`

- [ ] **Step 1: Write the failing test**

Append to `apps/site/test/site.test.ts`:

```ts
import { renderHero } from '../src/samples/hero.js';

describe('the hero sample', () => {
  it('renders through the lab renderer', () => {
    expect(renderHero()).toContain('class="code"');
    expect(renderHero()).toContain('code-row');
  });

  it('shows every syntax class the palette page documents', () => {
    const html = renderHero();
    for (const role of ['keyword', 'function', 'type', 'string', 'number', 'comment']) {
      expect(html, role).toContain(`t-${role}`);
    }
  });

  it('shows no diff, no selection and no find match', () => {
    const html = renderHero();
    for (const noisy of ['is-added', 'is-removed', 't-selected', 't-find-current', 't-find-other']) {
      expect(html, noisy).not.toContain(noisy);
    }
  });

  it('reaches the landing page', () => {
    expect(landing(FLAGS)).toContain(renderHero());
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL with "Cannot find module '../src/samples/hero.js'".

- [ ] **Step 3: Write the sample**

`apps/site/src/samples/hero.ts` — create the directory first, it does not exist:

```ts
import {
  b1, b2, cm, co, es, fn, kw, nu, op, pn, renderCode, sp, st, ty, va,
} from '@sltio/aion-lab/render/code';
import type { CodeLine } from '@sltio/aion-lab/render/code';

// Ordinary code. The lab's sample stacks a diff, a selection, a find match and a word
// highlight on one screen to exercise the gate; a hero shows what a reader actually reads.
export const HERO_SAMPLE: readonly CodeLine[] = [
  { tokens: [cm('// Every colour is solved against the surface it lands on.')] },
  { tokens: [kw('import'), sp(' '), b1('{'), sp(' '), va('solveMarker'), pn(', '), va('contrastEmitted'), sp(' '), b1('}'), sp(' '), kw('from'), sp(' '), st("'@sltio/aion-tokens'"), pn(';')] },
  { tokens: [] },
  { tokens: [kw('const'), sp(' '), co('FLOOR'), sp(' '), op('='), sp(' '), nu('4.5'), pn(';')] },
  { tokens: [] },
  { tokens: [kw('export'), sp(' '), kw('function'), sp(' '), fn('gate'), b1('('), va('token'), pn(': '), ty('Oklch'), pn(', '), va('surface'), pn(': '), ty('Oklch'), b1(')'), pn(': '), ty('boolean'), sp(' '), b1('{')] },
  { tokens: [sp('  '), kw('const'), sp(' '), va('ratio'), sp(' '), op('='), sp(' '), fn('contrastEmitted'), b2('('), va('token'), pn(', '), va('surface'), b2(')'), pn(';')] },
  { tokens: [sp('  '), kw('return'), sp(' '), va('ratio'), sp(' '), op('>='), sp(' '), co('FLOOR'), pn(';')] },
  { tokens: [b1('}')] },
  { tokens: [] },
  { tokens: [cm('// A newline in a string still reads: '), cm(String.raw`\n`)] },
];

export const renderHero = (): string => renderCode(HERO_SAMPLE);
```

Note: `es` is imported and used by no line, which `noUnusedLocals` rejects. Remove `es` from the import list if the sample does not use it. The list above uses `b1 b2 cm co fn kw nu op pn renderCode sp st ty va` — import exactly those.

- [ ] **Step 4: Place it on the landing page**

In `apps/site/src/render/index.ts`, add the import and fill the empty sample section:

```ts
import { renderHero } from '../samples/hero.js';
```

Replace `<section class="sample" id="sample"></section>` with:

```ts
    <section class="sample" id="sample">${renderHero()}</section>
```

- [ ] **Step 5: Run the test**

Run: `npm test -w @sltio/aion-site && npm run typecheck -w @sltio/aion-site`
Expected: PASS. The typecheck proves the cross-workspace TypeScript import resolves.

- [ ] **Step 6: Commit**

```bash
git add apps/site/src/samples/hero.ts apps/site/src/render/index.ts apps/site/test/site.test.ts
git commit -m "Show ordinary code in the hero

Reuse the lab renderer rather than copy it, and write a sample that
carries no diff, no selection and no find match. The lab sample stacks
those to exercise the gate, which is a diagnostic display."
```

---

### Task 8: The stylesheet, the fonts and the two source guards

**Files:**
- Create: `apps/site/src/styles.css`, `apps/site/src/fonts/Archivo.woff2`, `apps/site/src/fonts/MonaspaceNeon.woff2`, `apps/site/public/fonts/LICENSE.txt`, `apps/site/public/icon.png`
- Modify: `scripts/fetch-fonts.mjs`, `apps/site/src/main.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: `dark` from `@sltio/aion-css`
- Produces: a stylesheet that reads `var(--aion-…)` and declares its own layout variables under a `--site-` prefix

- [ ] **Step 1: Write the failing test**

Append to `apps/site/test/site.test.ts`:

```ts
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] => readdirSync(dir).flatMap((entry) => {
  const full = join(dir, entry);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

describe('the source guards', () => {
  const sources = () => walk(join(root, 'src')).filter((f) => f.endsWith('.ts') || f.endsWith('.css'));

  it('holds no hex literal in any source file', () => {
    expect(sources().length).toBeGreaterThan(0);
    for (const file of sources()) {
      const text = readFileSync(file, 'utf8');
      expect(text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], file).toEqual([]);
    }
  });

  it('reads only variables the CSS package emits or the site declares', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    const emitted = new Set(Object.keys(dark()));
    const declared = new Set(css.match(/--site-[a-z0-9-]+/g) ?? []);
    const read = css.match(/var\((--[a-z0-9-]+)/g) ?? [];
    expect(read.length).toBeGreaterThan(0);
    for (const entry of read) {
      const name = entry.slice(4);
      expect(emitted.has(name) || declared.has(name), name).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL. `src/styles.css` does not exist.

- [ ] **Step 3: Copy the fonts and the icon**

```bash
mkdir -p apps/site/src/fonts apps/site/public/fonts
cp apps/lab/src/fonts/Archivo.woff2 apps/site/src/fonts/
cp apps/lab/src/fonts/MonaspaceNeon.woff2 apps/site/src/fonts/
cp apps/lab/public/fonts/LICENSE.txt apps/site/public/fonts/
cp apps/lab/public/icon.png apps/site/public/
```

- [ ] **Step 4: Teach `fetch-fonts.mjs` the second target**

In `scripts/fetch-fonts.mjs`, replace the two single-target constants and the two write paths so both apps are refreshed. Change:

```js
const target = fileURLToPath(new URL('../apps/lab/src/fonts/', import.meta.url));
const licenceTarget = fileURLToPath(new URL('../apps/lab/public/fonts/', import.meta.url));
mkdirSync(target, { recursive: true });
mkdirSync(licenceTarget, { recursive: true });
```

to:

```js
const APPS = ['lab', 'site'];
const targets = APPS.map((app) => fileURLToPath(new URL(`../apps/${app}/src/fonts/`, import.meta.url)));
const licenceTargets = APPS.map((app) => fileURLToPath(new URL(`../apps/${app}/public/fonts/`, import.meta.url)));
for (const dir of [...targets, ...licenceTargets]) mkdirSync(dir, { recursive: true });
```

Then in `fetchArchivo`, `fetchMonaspace` and the licence write, loop over the targets and write the same bytes to each. Download once, write twice.

- [ ] **Step 5: Write the stylesheet**

`apps/site/src/styles.css`. It reads `--aion-*` for every colour and declares its own layout values under `--site-`:

```css
@font-face {
  font-family: 'Archivo';
  src: url('./fonts/Archivo.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-stretch: 62% 125%;
  font-display: swap;
}

@font-face {
  font-family: 'Monaspace Neon';
  src: url('./fonts/MonaspaceNeon.woff2') format('woff2-variations');
  font-weight: 200 800;
  font-display: swap;
}

:root {
  --site-measure: 68ch;
  --site-gap: 1.5rem;
  --site-radius: 10px;
  --site-page: 72rem;
  color-scheme: dark;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 0 var(--site-gap) 6rem;
  background: var(--aion-bg-page);
  color: var(--aion-fg-primary);
  font-family: 'Archivo', system-ui, sans-serif;
  line-height: 1.6;
}

#app { max-width: var(--site-page); margin: 0 auto; }

h1 {
  font-stretch: 125%;
  font-weight: 700;
  font-size: clamp(2.5rem, 8vw, 5rem);
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
}

h2 {
  font-stretch: 112%;
  font-weight: 650;
  font-size: 1.75rem;
  margin: 3rem 0 0.5rem;
}

h3 { font-size: 1rem; margin: 0 0 0.5rem; }

.lede { max-width: var(--site-measure); color: var(--aion-fg-secondary); font-size: 1.15rem; }
.convention { max-width: var(--site-measure); color: var(--aion-fg-secondary); }
.note { color: var(--aion-fg-dim); font-size: 0.9rem; }

a { color: var(--aion-fg-link); }

.button {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--aion-border-focus);
  border-radius: var(--site-radius);
  color: var(--aion-gold-solid);
  text-decoration: none;
  font-weight: 600;
}

.hero { padding: 5rem 0 3rem; border-bottom: 1px solid var(--aion-border-hairline); }

.figures { display: flex; flex-wrap: wrap; gap: var(--site-gap); margin: 0 0 1rem; padding: 0; }
.figures div { min-width: 9rem; }
.figures dt { font-size: 2rem; font-weight: 700; font-stretch: 112%; color: var(--aion-gold-solid); }
.figures dd { margin: 0; color: var(--aion-fg-secondary); font-size: 0.9rem; }

.install-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--site-gap); grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
.install-list li { padding: 1.25rem; background: var(--aion-bg-raised); border: 1px solid var(--aion-border-hairline); border-radius: var(--site-radius); }
.install-list p { margin: 0.5rem 0 0; color: var(--aion-fg-secondary); font-size: 0.9rem; }

pre, code { font-family: 'Monaspace Neon', ui-monospace, monospace; }
pre { margin: 0; padding: 0.6rem 0.75rem; background: var(--aion-bg-surface); border-radius: 6px; overflow-x: auto; font-size: 0.85rem; }

.sample { margin: 3rem 0; padding: 1.25rem; background: var(--aion-bg-page); border: 1px solid var(--aion-border-hairline); border-radius: var(--site-radius); overflow-x: auto; }

.swatch-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); margin: 1.5rem 0; }

.swatch {
  display: grid;
  grid-template-columns: 2.25rem 1fr;
  grid-template-areas: 'chip name' 'chip hex';
  gap: 0 0.75rem;
  align-items: center;
  padding: 0.6rem;
  background: var(--aion-bg-raised);
  border: 1px solid var(--aion-border-hairline);
  border-radius: var(--site-radius);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.swatch:hover { background: var(--aion-bg-hover); }
.swatch:focus-visible { outline: 2px solid var(--aion-border-focus); outline-offset: 2px; }
/* A translucent value composites over the page colour, which is the editor, rather than
   over the raised card the chip sits on. That is the surface the gate measured it on. */
.swatch-chip, .dot {
  background-image: linear-gradient(var(--site-swatch), var(--site-swatch));
  background-color: var(--aion-bg-page);
}

.swatch-chip { grid-area: chip; width: 2.25rem; height: 2.25rem; border-radius: 6px; border: 1px solid var(--aion-border-hairline); }
.swatch-name { grid-area: name; font-size: 0.8rem; }
.swatch-hex { grid-area: hex; font-size: 0.8rem; color: var(--aion-fg-secondary); }
.swatch[data-copied] .swatch-hex { color: var(--aion-status-success-text); }

table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; font-size: 0.85rem; }
th, td { text-align: left; padding: 0.4rem 0.75rem 0.4rem 0; border-bottom: 1px solid var(--aion-border-hairline); }
th { color: var(--aion-fg-dim); font-weight: 600; }
.dot { display: inline-block; width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: 0.5rem; vertical-align: -1px; }

.code { font-family: 'Monaspace Neon', ui-monospace, monospace; font-size: 0.85rem; line-height: 1.7; }
.code-row { display: flex; }
.code-gutter { display: inline-flex; gap: 0.5rem; width: 3rem; flex: none; justify-content: flex-end; padding-right: 1rem; color: var(--aion-fg-muted); }
.code-line { white-space: pre; }

.t-keyword { color: var(--aion-syntax-keyword); }
.t-function { color: var(--aion-syntax-function); }
.t-type { color: var(--aion-syntax-type); }
.t-string { color: var(--aion-syntax-string); }
.t-number { color: var(--aion-syntax-number); }
.t-constant { color: var(--aion-syntax-constant); }
.t-variable { color: var(--aion-syntax-variable); }
.t-operator { color: var(--aion-syntax-operator); }
.t-escape { color: var(--aion-syntax-escape); }
.t-comment { color: var(--aion-syntax-comment); }
.t-punctuation, .t-plain { color: var(--aion-fg-secondary); }
.b1 { color: var(--aion-gold-solid); }
.b2 { color: var(--aion-teal-solid); }
.b3 { color: var(--aion-violet-solid); }
```

- [ ] **Step 6: Load the stylesheet**

`apps/site/src/main.ts`:

```ts
import '@sltio/aion-css/aion.css';
import './styles.css';
```

- [ ] **Step 7: Run the test and the build**

Run: `npm test -w @sltio/aion-site && npm run build -w @sltio/aion-site`
Expected: PASS. The build emits `dist/index.html`, `dist/palette.html`, a CSS asset and the two font files.

- [ ] **Step 8: Commit**

```bash
git add apps/site/src/styles.css apps/site/src/main.ts apps/site/src/fonts apps/site/public \
        apps/site/test/site.test.ts scripts/fetch-fonts.mjs
git commit -m "Style the site from the emitted variables only

Two tests hold the rule: no source file carries a hex literal, and every
var() the stylesheet reads is a variable the CSS package emits or one the
site declares under its own --site- prefix. A misspelled custom property
renders as nothing at all, which no screenshot catches.

Teach fetch-fonts.mjs the second app, so one download refreshes both."
```

---

### Task 9: The runtime script and the light flag

**Files:**
- Modify: `apps/site/src/main.ts`, `apps/site/src/render/index.ts`, `apps/site/src/render/swatch.ts`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: `SiteFlags` from Task 2, `groups` from Task 3
- Produces: the copy behaviour and the scheme toggle, both delegated from `document`

- [ ] **Step 1: Write the failing test**

Append to `apps/site/test/site.test.ts`:

```ts
import { light as lightValues } from '@sltio/aion-css';

describe('the light flag', () => {
  const onlyLight = () => {
    const d = new Set(Object.values(dark()));
    return [...new Set(Object.values(lightValues()))].filter((value) => !d.has(value));
  };

  it('emits no light value and no toggle when hidden', () => {
    const html = palette({ released: false, lightVisible: false });
    expect(html).not.toContain('data-scheme-toggle');
    for (const value of onlyLight()) expect(html, value).not.toContain(value);
  });

  it('emits every light value and the toggle when shown', () => {
    const html = palette({ released: false, lightVisible: true });
    expect(html).toContain('data-scheme-toggle');
    for (const [variable, value] of Object.entries(lightValues())) {
      expect(html, variable).toContain(value);
    }
  });

  it('shows every variable in both settings', () => {
    for (const lightVisible of [false, true]) {
      const html = palette({ released: false, lightVisible });
      for (const variable of Object.keys(dark())) expect(html, variable).toContain(variable);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -w @sltio/aion-site`
Expected: FAIL. `swatch` always writes `data-light`, so the hidden case leaks light values.

- [ ] **Step 3: Confirm the swatch already honours the flag**

Task 4 gave `swatch` and `swatchGrid` their `SiteFlags` parameter, and `swatch` writes
`data-light` only when `lightVisible` is true. No change is needed here. Read
`apps/site/src/render/swatch.ts` and confirm it before moving on.

- [ ] **Step 4: Add the toggle to the page**

In `apps/site/src/render/index.ts`, change `palette` to take the flag through, and add the toggle to the page header:

```ts
export function palette(flags: SiteFlags): string {
  const sections = groups().map((group) => {
    const extra = EXTRA[group.id];
    return `<section class="group" id="${group.id}">
      <h2>${escapeHtml(group.title)}</h2>
      <p class="convention">${escapeHtml(CONVENTIONS[group.id])}</p>
      ${swatchGrid(group, flags)}
      ${extra === undefined ? '' : extra()}
    </section>`;
  }).join('');

  const toggle = flags.lightVisible
    ? `<button type="button" class="toggle" data-scheme-toggle>Light</button>
       <p class="note">${escapeHtml(LIGHT_NOTE)}</p>`
    : '';

  return `<article class="palette">
    <header class="page-head">
      <h1>The palette</h1>
      <p class="lede">${escapeHtml(PALETTE_INTRO)}</p>
      ${toggle}
    </header>
    ${sections}
  </article>`;
}
```

Add to `apps/site/src/content.ts`:

```ts
export const LIGHT_NOTE =
  'Light ships in the CSS layer only. There is no light VS Code theme, and light gold is '
  + 'olive rather than gold: a yellow hue cannot be both light and 4.5:1 against near-white.';
```

- [ ] **Step 5: Write the runtime script**

Replace `apps/site/src/main.ts`:

```ts
import '@sltio/aion-css/aion.css';
import './styles.css';

const COPIED_MS = 2000;

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const swatch = target.closest<HTMLElement>('[data-copy]');
  if (swatch) {
    const scheme = document.body.dataset['scheme'] === 'light' ? 'light' : 'dark';
    const value = swatch.dataset[scheme] ?? swatch.dataset['dark'];
    if (value === undefined) return;
    void navigator.clipboard.writeText(value).then(() => {
      swatch.dataset['copied'] = 'true';
      setTimeout(() => { delete swatch.dataset['copied']; }, COPIED_MS);
    });
    return;
  }

  if (target.closest('[data-scheme-toggle]')) {
    const next = document.body.dataset['scheme'] === 'light' ? 'dark' : 'light';
    document.body.dataset['scheme'] = next;
    document.documentElement.dataset['theme'] = next;
    for (const node of document.querySelectorAll<HTMLElement>('[data-copy]')) {
      const hexNode = node.querySelector('.swatch-hex');
      const value = node.dataset[next];
      if (hexNode && value !== undefined) hexNode.textContent = value;
    }
  }
});
```

- [ ] **Step 6: Run the test and the typecheck**

Run: `npm test -w @sltio/aion-site && npm run typecheck -w @sltio/aion-site`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/site/src apps/site/test/site.test.ts
git commit -m "Add the copy action and the hidden light path

The build emits no light value and no toggle while lightVisible is
false, and a test asserts both directions, so the hidden path stays
correct while nobody looks at it. Making light visible is then a
one-line change rather than new work."
```

---

### Task 10: Parity, publication and the documents

**Files:**
- Create: `apps/site/public/CNAME`, `.github/workflows/pages.yml`, `apps/site/README.md`
- Modify: `.github/workflows/ci.yml`, `README.md`, `PLAN.md`, `DESIGN.md`, `AGENTS.md`, `packages/css/README.md`
- Test: `apps/site/test/site.test.ts`

**Interfaces:**
- Consumes: everything above
- Produces: a deployable artefact and the documents that point at it

- [ ] **Step 1: Write the failing parity test**

Append to `apps/site/test/site.test.ts`:

```ts
describe('parity with the emitter', () => {
  it('quotes no hex the packages do not emit', () => {
    // The CSS layer emits 91 values, but the ramp table prints neutral.sidebar, which has
    // no web equivalent. The token package's semantic map is the wider source, and it is
    // what the rule in AGENTS.md means by "a hex the token package does not emit".
    const emitted = new Set(
      [
        ...Object.values(dark()),
        ...Object.values(light()),
        ...Object.values(flatten(semantic)),
        ...Object.values(flatten(semanticLight)),
      ].map((v) => v.toLowerCase()),
    );
    const pages = [
      landing(FLAGS),
      landing({ released: true, lightVisible: false }),
      palette(FLAGS),
      palette({ released: false, lightVisible: true }),
    ];
    let seen = 0;
    for (const page of pages) {
      for (const found of page.match(/#[0-9a-fA-F]{6,8}\b/g) ?? []) {
        seen += 1;
        expect(emitted.has(found.toLowerCase()), found).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
```

Extend the Task 6 import line to `import { checks, flatten, readingStates, semantic, semanticLight } from '@sltio/aion-tokens';`.

`flatten(semantic)` returns 71 entries, all hex strings, and it is the only source that
carries `bg.sidebar`. Without it this test fails on `#171b22` — measured, not predicted.
The `seen` counter is there so the test cannot pass by matching nothing.

- [ ] **Step 2: Run it**

Run: `npm test -w @sltio/aion-site`
Expected: PASS, thirty-six tests. If it fails, the named hex is one a render function typed by hand — fix the render function, never the test.

- [ ] **Step 3: Add the domain and the deploy workflow**

`apps/site/public/CNAME`, one line, no trailing content:

```
aion.slt.sh
```

`.github/workflows/pages.yml`:

```yaml
name: pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/site/dist
      - id: deploy
        uses: actions/deploy-pages@v4
```

`npm run build` at the root already recurses through workspaces, so it builds the site.

- [ ] **Step 4: Confirm CI covers the site**

`.github/workflows/ci.yml` runs `npm run build`, `npm run typecheck`, `npm run verify`, `npm test` and `npm run sync:design` at the root. All of them recurse through workspaces, so the site joins every one by existing. **No edit to `ci.yml` is needed** — confirmed by reading it. Its "Generated files match the commit" step is unaffected, because `dist/` is git-ignored.

- [ ] **Step 5: Write the app README**

`apps/site/README.md`:

```markdown
# Aion site

The public site at https://aion.slt.sh. Two pages: a landing page and the palette
reference. It imports `@sltio/aion-css`, so it cannot show a colour the packages do not
emit.

```
npm run dev -w ./apps/site       # http://localhost:8422
npm run build -w ./apps/site     # static output in dist/
npm test -w ./apps/site
```

## How it works

Every section is a pure function that returns an HTML string, so the tests run in Node. A
Vite plugin calls them at build time and substitutes the result into `index.html` and
`palette.html`. The shipped HTML carries the page; the runtime script only copies a hex
and switches the scheme.

`src/flags.ts` holds the two build flags. `released` adds a note to the install section
until the first tag ships. `lightVisible` is off, so the build emits no light value and no
scheme toggle. Every render function takes the flags as a parameter, and the tests run
both settings, so the hidden path stays proven.

## What the tests hold in place

- Every hex on either page is a hex the token package emits.
- No source file and no stylesheet holds a hex literal.
- Every `var(--…)` the stylesheet reads is emitted by `@sltio/aion-css` or declared here
  under `--site-`.
- Every variable `dark()` emits appears in exactly one swatch, and every swatch names a
  variable that exists.
- Every figure on the landing page is derived from `checks()`.
- The landing page names no rival theme.
```

- [ ] **Step 6: Update the repository documents**

`README.md` — add to the package table, after the `apps/lab` row:

```markdown
| `apps/site` | the public site at https://aion.slt.sh: the landing page and the palette reference |
```

and to the commands block:

```bash
npm run dev -w ./apps/site   # the public site on http://localhost:8422
```

`DESIGN.md` §13 — change `and the lab site.` to `the lab, and the public site.`

`PLAN.md` — under Task 6, replace `Still open: GitHub Pages...` with `GitHub Pages ships the site, not the lab. See Task 9.` Then add before `## Order and parallelism`:

```markdown
## Task 9 — `apps/site` — done

The public site at https://aion.slt.sh. A landing page and a palette reference over the 91
variables `@sltio/aion-css` emits. Vite multi-page, no framework, HTML pre-rendered at
build time so the page reads without JavaScript.

The light scheme is built and tested but not visible: `FLAGS.lightVisible` is `false`,
because there is no light VS Code theme and light gold is olive. Read `apps/site/README.md`
for the module map and the rules the tests hold in place.

Still open: the DNS `CNAME` from `aion.slt.sh` to `sltio.github.io`, and GitHub Pages
enabled with the custom domain. Neither is in the repository.
```

`AGENTS.md` — add before `## Do not`:

```markdown
## The site

`apps/site` is public and `apps/lab` is not. The site reads `@sltio/aion-css`, so every
swatch's name and its value come from one object; never render a colour from anywhere
else. Its tests fail on a hex literal in any source file, on a `var(--…)` that no token
emits, and on a variable `dark()` emits that no swatch shows.

Both build flags live in `src/flags.ts` and every render function takes them as a
parameter, so the tests exercise a hidden path at both settings. `lightVisible` is off:
light has no VS Code theme and light gold is olive. `released` is off until the first tag.

No rival comparison on the site. That table belongs to the READMEs.
```

`packages/css/README.md` — document the new root export:

```markdown
The package also exports its emitter, so a tool can read the variable map directly:

```js
import { dark, light } from '@sltio/aion-css';
```

Both return a map of custom property name to emitted hex, with the same keys.
```

- [ ] **Step 7: Run everything**

Run: `npm run build && npm test && npm run typecheck && npm run verify && npm run sync:design && git status --porcelain`
Expected: every command exits 0, and `git status` shows only the files this task edits. `sync:design` must change nothing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Publish the site to aion.slt.sh and record it in the documents

A parity test extends the repository's rule to the new surface: every hex
on either page is one the token package emits.

The DNS record and the Pages setting are not in the repository. PLAN.md
names both as still open."
```

---

## Execution record

This plan was executed once, in full, on 2026-09-06, before it was handed to anyone. The
corrections below are already folded into the tasks above. Every number in this plan is a
value a command printed, not one a person worked out.

**Defects the execution found, none of which was visible by reading:**

1. **The Task 1 test used `describe`.** `packages/css/test/css.test.ts` imports only `test`
   and `expect` from vitest, so the file failed to load with `describe is not defined` and
   ran no tests at all. The plan now uses flat `test` calls.
2. **The Task 1 test asserted a six-digit hex.** Four dark variables and one light variable
   carry an alpha byte: `--aion-overlay-selection`, `--aion-overlay-line-highlight`,
   `--aion-diff-added`, `--aion-diff-removed`, and light `--aion-overlay-selection`.
   The consequence reached the stylesheet: a chip painted straight onto a raised card
   would composite a decoration over the wrong surface, so `.swatch-chip` now paints the
   value over `--aion-bg-page`, which is the editor and the surface the gate measured.
3. **The parity test failed on `#171b22`.** That is `neutral.sidebar`, which the ramp table
   prints and the CSS layer does not emit, because the CSS layer names surfaces by depth.
   The parity source now reads `flatten(semantic)` and `flatten(semanticLight)` as well.
   This is the defect the gate exists to catch: the test was correct and its source set
   was too narrow, and no amount of reading would have shown it.
4. **Tasks 4 and 9 fought over the swatch signature.** The plan built `swatch(data)` in
   Task 4 and rewrote it as `swatch(data, flags)` in Task 9, along with both call sites and
   a test. Task 4 now takes the flags from the start.
5. **The CSS guard needed an exception for `--swatch-colour`.** Renamed to `--site-swatch`,
   so every variable the site declares carries the `--site-` prefix and the guard needs no
   special case.
6. **`EXTRA` was typed `Partial<Record<string, …>>`.** It is keyed by `GroupId`.
7. **Two tests could have passed vacuously.** The no-hex guard and the `var()` guard now
   assert they found something to check. The light-only value set was measured at 33
   entries, so the "no light value when hidden" test is not vacuous either.
8. **`ci.yml` needs no edit.** The plan asked the executor to decide; reading the file
   settles it, and the plan now says so.

**What the run produced, measured:**

| Command | Result |
|---|---|
| `npm test` | every workspace passes; the site adds 36 tests |
| `npm run typecheck` | passes under `noUncheckedIndexedAccess` and `noUnusedLocals` |
| `npm run verify` | `611 tokens: 578 pass, 0 fail, 5 exempt, 28 informational` |
| `npm run sync:design` | idempotent; changes nothing the plan did not change |
| `npm run build -w @sltio/aion-site` | `dist/index.html` 6.25 kB, `dist/palette.html` 32.76 kB |

The shipped `dist/palette.html` holds **91** swatches in the file itself, **no**
`data-scheme-toggle`, and **none** of the 33 light-only values. `dist/CNAME` reads
`aion.slt.sh`.

All of that is a calculation. It is not evidence that a browser renders it.

## Verification of the whole plan

Run at the root, in this order:

```bash
npm run build       # every package and both apps emit their artefact
npm test            # every workspace, plus the release and bootstrap tests
npm run typecheck   # strict, noUncheckedIndexedAccess, noUnusedLocals
npm run verify      # the contrast gate; exits non-zero on any failure
npm run sync:design # must change nothing
```

Then, in a browser, on `npm run dev -w ./apps/site`:

- The landing page reads with JavaScript disabled, and the palette page does too.
- A click on a swatch copies its hex and the value confirms for two seconds.
- `dist/palette.html` holds no light value and no `data-scheme-toggle`.

That last group is what the calculation cannot tell you. Record which of the two you have.
