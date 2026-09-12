# Approved visual references

This manifest is the source of truth for assets that may guide future SLT and
product-specific visual work.

Only the user can approve an asset. New generations, refinements, and experiments
remain unapproved until the user explicitly describes them as approved or final.

## Global SLT references

| Repository file | Plugin filename | Role | Status | Notes |
|---|---|---|---|---|
| `slt-wordmark.png` | `SLT__wordmark-presentation.png` | Typography, construction, presentation | Approved | Primary reference for custom letter construction, bar weight, chamfers, seams, and spacing. The raster includes a dark presentation field and is not a flat vector master. |
| `slt_glyph.png` | `SLT__glyph-presentation.png` | Glyph construction, negative space, accent integration, presentation | Approved | Primary reference for compact abstract construction and structural relationships. The raster includes a dark presentation field and is not a flat vector master. |

These references define how SLT work is constructed. Their literal geometry must
not be reused to create a different product mark.

## Aion references

| Repository file | Plugin filename | Role | Status | Notes |
|---|---|---|---|---|
| `aion-logo.png` | `AION__logo.png` | Product glyph, construction | Approved | Standalone Aion product mark and primary product-specific glyph reference. |
| `aion-wordmark.png` | `AION__wordmark.png` | Product typography | Approved | Approved Aion wordmark. |
| `aion-lockup-horizontal.png` | `AION__lockup-horizontal.png` | Product composition, presentation | Approved | Preferred horizontal lockup for wide placements. |
| `aion-lockup-vertical.png` | `AION__lockup-vertical.png` | Product composition, presentation | Approved | Preferred lockup for square or vertically balanced placements. |

Aion references apply only to Aion work unless the user explicitly requests
otherwise. Aion's concept and symbolism must not influence another SLT product.

## Missing construction masters

Flat transparent SVG construction masters for the SLT wordmark and glyph have
not been added yet. When approved masters become available, add them here as
primary construction references and retain the current raster files as
presentation references.

## Adding an approved asset

After the user explicitly approves an asset, add one row containing:

- its repository filename;
- its normalized plugin filename;
- its global or product scope;
- the specific reference role it should serve;
- `Approved` status;
- any limits on how it may influence future work.

Do not add rejected or superseded experiments to this manifest as references.
