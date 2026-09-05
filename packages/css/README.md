# @sltio/aion-css

Aion as CSS custom properties and a Tailwind v4 `@theme` block.

```css
@import "@sltio/aion-css/aion.css";
@import "@sltio/aion-css/aion.theme.css";  /* optional, Tailwind v4 only */
```

`aion.css` sets both schemes and a base layer, so a page that sets no colours of its own
already renders correctly.

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

`aion.theme.css` maps every variable by reference, so `bg-bg-raised` and
`text-fg-primary` follow the active scheme instead of freezing one of them. Import
`aion.css` first.

## Known limit

Accent text is guaranteed legible on `page`, `surface`, `raised` and on its own subtle
fill. It is not guaranteed on `hover`; hover rows use neutral text.

## Licence

MIT.
