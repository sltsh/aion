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
like the dark scheme. See the repository's [Light variant guide](../../LIGHT.md) for the
design rationale and availability by target.

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
