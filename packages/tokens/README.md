# @sltio/aion-tokens

The Aion colour system. OKLCH definitions, contrast invariants and sRGB emitters.

Every other Aion package reads this one. Nothing downstream defines a colour.

```ts
import { hex, bg, fg, accent, contrastEmitted, flatten, semantic } from '@sltio/aion-tokens';

hex(bg.editor);            // '#11151c'
hex(accent.gold.solid);    // '#e4c058'
contrastEmitted(fg.primary, bg.editor);  // 14.87
flatten(semantic);         // { 'bg.editor': '#11151c', ... }
```

## Two contrast functions, on purpose

`contrast` reads the ideal OKLCH. `contrastEmitted` reads the rounded 8-bit hex that
actually ships. They differ by up to 0.06, which matters at a 4.5:1 floor.

Use `contrastEmitted` for any gate or report; a user measures the hex. `solveLightness`
uses the continuous form, because bisection needs one.

## Layers

- **Literal** — `neutral`, `ACCENTS`, `accentScale`, `ansi`, `lightNeutral`. What the
  colour is.
- **Semantic** — `bg`, `fg`, `border`, `syntax`, `accent`, `status`, and the `*Light`
  counterparts. What the colour is for. Consumers use this layer.
- **Preview** — `buildPalette(overrides)` recomputes the whole palette from six
  parameters. With no overrides it equals the shipped palette exactly, and a test asserts
  that.

## The gate

```bash
npm run verify   # every token, its surface and its ratio; non-zero on any failure
npm run tables   # the same data as the markdown tables in DESIGN.md
```

## Rules it enforces

Text 4.5:1, non-text 3:1, chroma inside its per-hue band, hue within ±15° of the One Dark
Pro role map, a 0.06 lightness gap on meaning pairs, and every colour inside sRGB.

## Licence

MIT.
