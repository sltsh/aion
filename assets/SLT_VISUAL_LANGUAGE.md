# SLT visual language

This is the canonical visual specification for the SLT identity and products
created under it.

## Brand hierarchy

SLT is the parent identity and visual system.

Individual products may have their own name, concept, icon or glyph, wordmark,
accent treatment, and supporting visual motifs. Products inherit the SLT
construction language while remaining distinct from one another.

Aion is one SLT product. Its conceptual origin, visual symbolism, and approved
assets are product-specific and must not influence other SLT products unless the
user explicitly requests that relationship.

## Reference hierarchy

Files prefixed `SLT__` are global brand references.

The approved SLT wordmark is the primary reference for:

- custom typography;
- geometric letter construction;
- stroke and bar weight;
- chamfers;
- structural seams;
- spacing character.

The approved SLT glyph is the primary reference for:

- abstract glyph construction;
- structural relationships;
- negative space;
- accent integration;
- compact icon proportions.

Files prefixed with a product name, such as `AION__`, apply only when working on
that product unless the user explicitly names them as references for another
task.

Create a different product from its own concept. Do not copy, rotate, trace,
remix, or recombine literal geometry from an existing mark.

## Construction language

The global SLT design language uses:

- bold, flat geometric construction;
- thick structural rails and filled masses;
- sharp corners;
- primarily 0-degree, 45-degree, and 90-degree geometry;
- selective 45-degree terminals and chamfers;
- deliberate structural seams;
- strong negative-space channels;
- controlled asymmetry;
- very few major elements;
- clear silhouettes;
- precise engineered construction;
- open compositions rather than decorative enclosing frames;
- a custom-drawn appearance rather than generic fonts or stock symbols.

Geometry should feel machined, structural, quiet, durable, and contemporary.
Technical character comes from construction and proportion rather than
decorative science-fiction styling.

## Color language

The current SLT core colors match the emitted Aion palette:

| Role | Color |
|---|---|
| Primary white | `#e2e8f3` |
| Gold | `#e4c058` |
| Teal | `#59cdc8` |
| Dark field | `#11151c` |

White normally carries the dominant structure.

Gold is normally the primary accent. Integrate it structurally as a keyed
segment, terminal, handoff, rail, or related secondary form.

Teal is secondary and normally carries less visual weight than gold.

A product may establish a restricted palette while remaining in the SLT
family. Do not require every product to use every core color.

## Product identities

When creating a product identity:

1. Begin with the product's own concept and purpose.
2. Find an abstract structural interpretation rather than an obvious icon.
3. Express that interpretation using the SLT construction language.
4. Keep the product recognizably related to SLT without turning it into a
   variation of the SLT glyph.
5. Give the product enough individual character to coexist with other product
   marks without appearing to be an alternate version of the same logo.

The product concept determines what is constructed. SLT determines how it is
constructed. Do not transfer one product's conceptual symbolism into another
product.

## Default exclusions

Prefer sparse structural forms. Exclude the following unless the user
explicitly requests a justified exception:

- generic technology-logo styling;
- decorative futuristic motifs;
- enclosing octagons, rings, shields, or containers;
- floating diamonds;
- arbitrary crossing slashes;
- generic arrows or chevrons;
- lightning bolts;
- play or navigation symbols;
- Q-like constructions;
- circuit-board decoration;
- decorative nodes;
- gradients;
- glow;
- shadows;
- bevels;
- textures;
- pseudo-3D treatment.

Use literal metaphor only when explicitly requested. A concept involving time,
for example, should not automatically become a clock, hourglass, infinity
symbol, or ring.

## Generation workflow

Before generating an asset:

1. Determine whether it is global SLT work or work for a specific product.
2. For global work, use only approved `SLT__` assets as primary visual
   references unless the user explicitly names another reference.
3. For product work, use approved `SLT__` references for the global construction
   language and approved references for that product as secondary references.
4. Do not use assets from unrelated products unless explicitly requested.
5. Preserve approved assets when refining them. Do not redesign aspects the user
   has not asked to change.
6. Prefer one strong structural idea over several decorative ideas.
7. Keep glyphs sparse, usually with two to four major geometric masses.

For a new concept, generate three directions unless the user requests another
count. Each direction must use a different structural idea rather than a recolor
of the same composition. Return each direction as a separate image, label it in
the chat response rather than inside the artwork, and wait for selection before
final production work.

Treat generated raster images as visual concepts until explicitly approved and
reconstructed as production vector assets.

## Refinement

When the user provides or selects an existing generated asset:

- treat it as the direct refinement target;
- identify what remains unchanged;
- compare it with the relevant approved references;
- recommend or apply only changes that materially improve family resemblance,
  composition, legibility, or production suitability;
- preserve composition and structural relationships unless explicitly asked to
  change them.

Do not redesign an asset simply because another direction might also work.

## Final formats

Only begin production finalization after the user explicitly calls a direction
approved or final.

For a geometric identity asset:

- reconstruct the approved design as editable vector geometry;
- make the SVG the production source of truth;
- do not embed the generated raster inside the SVG;
- export transparent PNG files from the SVG when a reliable renderer is
  available;
- verify that the SVG and PNG silhouettes match;
- default to 1024-pixel and 512-pixel PNG exports unless the user requests other
  dimensions.

## Prompt writing

When asked to write an image-generation prompt:

- provide a ready-to-paste prompt;
- state which approved files should be attached or referenced;
- distinguish parent-brand references from product references;
- describe the product concept separately from the SLT visual language;
- omit irrelevant parts of the global specification;
- include explicit exclusions when the concept has obvious cliché solutions.

## Approval

Only assets the user explicitly describes as approved or final become visual
references for future work. Positive feedback alone is not approval. Rejected
generations and experiments must not become style references.

Record approved references in `APPROVED_ASSETS.md`. New assets remain unapproved
until the user explicitly changes their status.
