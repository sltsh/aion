# @sltsh/aion-css

Aion as CSS custom properties and a Tailwind v4 `@theme` block.

```css
@import "@sltsh/aion-css/aion.css";
@import "@sltsh/aion-css/aion.theme.css";  /* optional, Tailwind v4 only */
```

`aion.css` sets both schemes and a base layer, so a page that sets no colours of its own
already renders correctly. The element rules live in the `base` cascade layer, so any
utility or component layer overrides them.

## Schemes

| Selector | Effect |
|---|---|
| `:root` | dark, the default |
| `@media (prefers-color-scheme: light)` on `:root:not([data-theme])` | follows the system |
| `[data-theme="light"]` | forces light |
| `[data-theme="dark"]` | forces dark |

An explicit `data-theme` always wins over the system preference.

## Variables

| Prefix | Example |
|---|---|
| `--aion-bg-` | `--aion-bg-page`, `--aion-bg-surface`, `--aion-bg-raised` |
| `--aion-fg-` | `--aion-fg-primary`, `--aion-fg-secondary`, `--aion-fg-dim` |
| `--aion-border-` | `--aion-border-hairline`, `--aion-border-ui`, `--aion-border-focus` |
| `--aion-<accent>-` | `--aion-gold-solid`, `--aion-gold-border`, `--aion-gold-subtle` |
| `--aion-status-` | `--aion-status-error-text`, `--aion-status-error-subtle` |
| `--aion-syntax-` | `--aion-syntax-keyword`, `--aion-syntax-comment` |
| `--aion-ansi-` | `--aion-ansi-red`, `--aion-ansi-bright-red` |
| `--aion-overlay-` | `--aion-overlay-selection`, `--aion-overlay-find-match` |
| `--aion-diff-` | `--aion-diff-added`, `--aion-diff-removed-gutter` |

Surfaces stay monotonic in both schemes: `page`, `surface`, `raised`, `input`, `hover`.

## Tailwind

Import Tailwind first, then both Aion files:

```css
@import "tailwindcss";
@import "@sltsh/aion-css/aion.css";
@import "@sltsh/aion-css/aion.theme.css";
```

The order is not a preference. Tailwind's preflight and Aion's element rules are both in
the `base` layer, so whichever comes last wins: with Aion first, preflight resets the
button background Aion just set. `aion.theme.css` reads the variables `aion.css` defines,
so it comes after it.

`aion.theme.css` maps every variable with `@theme inline`, so `bg-bg-raised` and
`text-fg-primary` resolve at the element that carries the class. A plain `@theme` alias
resolves at the root instead, and a utility inside a nested `[data-theme="light"]` region
then keeps the root's dark value.

## The selection

`::selection` sets a foreground as well as a background, so selected text is primary text
on the selection fill in both schemes. Selected code loses its syntax colour, which is
what a browser's own selection does. The alternative is a selection pale enough for every
foreground this package ships, and in the light scheme that is one step off the page.

## Known limits

Accent text is guaranteed legible on `page`, `surface`, `raised` and on its own subtle
fill. It is not guaranteed on `hover`; hover rows use neutral text.

`--aion-border-ui` clears the 3:1 non-text floor on `input`, `raised`, `surface` and
`page`. A control edge on `hover` is outside that; this package paints no control there.

Every ratio here is a calculation over the emitted hex. Chromium 151 was used to check
the cascade, the nested-theme case and the selection foreground. No other browser and no
assistive technology was checked.

## Licence

MIT.

## Reading the variables from code

The package also exports its emitter, so a tool can read the variable map directly rather
than parse the stylesheet:

```js
import { dark, light } from '@sltsh/aion-css';
```

Both return a map of custom property name to emitted hex, and both return the same keys.
Four dark values and one light value carry an alpha byte.
