# @sltsh/aion-tokens

The Aion colour system. OKLCH definitions, contrast invariants and sRGB emitters.

Every other Aion package reads this one. Nothing downstream defines a colour.

```ts
import { hex, bg, fg, accent, contrastEmitted, flatten, semantic } from '@sltsh/aion-tokens';

hex(bg.editor);            // '#11151c'
hex(accent.gold.solid);    // '#e4c058'
contrastEmitted(fg.primary, bg.editor);  // 14.87
flatten(semantic);         // { 'bg.editor': '#11151c', ... }
```

## Light variant

The Light scheme is independently authored rather than calculated by inverting the dark
values. Consumers normally use `semanticLight` for fixed roles or `lightPalette` when
they need the complete editor palette. `buildLightPalette()` powers the lab and returns
the shipped Light palette when called with its defaults.

```ts
import {
  buildLightPalette, lightPalette, semanticLight, statusLight,
} from '@sltsh/aion-tokens';

const preview = buildLightPalette();
const keyword = preview.syntax.keyword;
const shippedKeyword = lightPalette.syntax.keyword;
const page = semanticLight.bg.page;
const error = statusLight.error.text;
```

Light accents are solved against the darkest light control surface on which accent text
appears. Decorations and reading states are measured after emitted-byte compositing, just
like the dark scheme. See the repository's [Light variant guide](../../docs/LIGHT.md) for the
design rationale and availability by target.

## Two contrast functions, on purpose

`contrast` reads the ideal OKLCH. `contrastEmitted` reads the rounded 8-bit hex that
actually ships. `roundingShift(background)` measures their largest observed gap near
the floor on the documented grid; it is not a universal rounding bound.

Use `contrastEmitted` for any gate or report; a user measures the hex. `solveLightness`
uses the continuous form, because bisection needs one.

## Rounding API

- `srgbChannels(colour)` returns `{ exact, bytes }`: clamped, gamma-encoded sRGB channels
  multiplied by 255 before rounding, and the three integer bytes that `hex` emits.
- `roundingShift(background, floor = 4.5)` returns `{ shift, colour }`, the largest
  absolute continuous/emitted contrast difference observed with `|contrast - floor| ≤ 0.1`.
  The grid includes hue `3i` (`i = 0…119`), chroma `0.01j` (`j = 0…20`), and lightness
  `0.00005k` (`k = 0…20000`). Only points whose un-clipped linear sRGB channels all lie
  in `[0, 1]` qualify. Ties keep the first point in hue, chroma, lightness order.
  Bisection brackets the bands before visiting their integer lightness indices.
  It throws if the floor is invalid or no point qualifies.
- `roundingFlip(base, background, { window = 0.02, step = 0.00005, floor = 4.5 } = {})`
  returns the first sampled lightness that passes continuous contrast and fails emitted
  contrast, or `null`. Samples ascend from `L₀ - window` in integer multiples of `step`
  through `L₀ + window`, restricted to `[0, 1]`; `L₀` is solved in the base colour's
  contrast direction by `solveLightness`. Invalid options throw. Both helpers require
  a finite floor of at least 1.

## Layers

- **Literal** — `neutral`, `ACCENTS`, `accentScale`, `ansi`, `lightNeutral`. What the
  colour is.
- **Semantic** — `bg`, `fg`, `border`, `syntax`, `accent`, `status`, and the `*Light`
  counterparts. What the colour is for. Consumers use this layer.
- **Preview** — `buildPalette(overrides)` and `buildLightPalette(overrides)` recompute the
  complete dark or light palette from six parameters. `PREVIEW_DEFAULTS` and
  `LIGHT_PREVIEW_DEFAULTS` reproduce their shipped palettes exactly; the light builder is
  the source used by the generated Aion Light editor theme.

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
