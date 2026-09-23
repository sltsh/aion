# Obsidian: more colour, same Aion — design proposal

Status: **proposal, revised after [review](2026-09-23-obsidian-colour-design-review.md).**
Nothing here has changed `packages/obsidian` or the shipped `theme.css`. The captures
below are Obsidian 1.13.7 on Linux (Xvfb, 1024×800, reading view) rendering the current
`theme.css` plus a prototype CSS snippet generated from `@sltsh/aion-css`. They are native
renders of a prototype, not of a shipped build. The captures predate the review
revisions, which change states and edge cases that a static capture does not show: hover,
drag, highlighted emphasis, wrapped titles. Each revision was measured natively instead;
see [Verification](#verification).

## Goal

The Dark and Light themes read as correct but flat: only H1 (gold) and H2 (teal) carry
colour, bold and italic are plain text, every tag is gold, and the file explorer is one
grey column. Coming from Catppuccin, the missing thing is **scanning by colour**: telling
heading levels, emphasis, tags and folders apart without reading them.

Keep Aion's character: the seven existing accents only, gold as the focus colour, the
editor as the darkest surface, no italics added by the theme, violet out of chrome.

Decided in review:

| Question | Answer |
|---|---|
| Heading colour | H1–H4 coloured, H5/H6 stay neutral |
| Explorer | Each top-level folder takes the next accent; its subtree inherits it |
| Violet | Allowed in note content, never in chrome |
| Scope | Headings, explorer, bold/italic/highlight, callouts, tags, tabs/ribbon/status bar, content spacing |

## Before and after

### Dark

| Current | Proposed |
|---|---|
| ![Current dark](2026-09-23-obsidian-colour/before-dark.png) | ![Proposed dark](2026-09-23-obsidian-colour/after-dark.png) |
| ![Current dark callouts](2026-09-23-obsidian-colour/before-dark-callouts.png) | ![Proposed dark callouts](2026-09-23-obsidian-colour/after-dark-callouts.png) |

### Light

| Current | Proposed |
|---|---|
| ![Current light](2026-09-23-obsidian-colour/before-light.png) | ![Proposed light](2026-09-23-obsidian-colour/after-light.png) |
| ![Current light callouts](2026-09-23-obsidian-colour/before-light-callouts.png) | ![Proposed light callouts](2026-09-23-obsidian-colour/after-light-callouts.png) |

## Proposed changes

### 1. Headings: H1–H4 in alternating warm and cool

| Level | Now | Proposed | Why |
|---|---|---|---|
| H1 | gold | gold | Signature colour, unchanged; also the inline title |
| H2 | teal | teal | Unchanged: "gold for focus, teal for structure" |
| H3 | primary text | **copper** | Warm again, so neighbouring levels never share a temperature |
| H4 | primary text | **violet** | Content-only use of violet, as agreed |
| H5 | secondary text | secondary text | Unchanged |
| H6 | secondary text | secondary text | Unchanged |

Alternating warm/cool gives every adjacent pair the largest hue jump available, which is
what makes a level recognisable without reading the size. Headings are fixed palette
roles and do not follow Obsidian's accent picker, as today.

### 2. Bold, italic and highlight

- `--bold-color` → **coral**, `--italic-color` → **green**. Emphasis becomes findable
  when skimming, the way Catppuccin's does.
- **The highlight owns the foreground.** Highlighted text is primary text whatever
  emphasis it carries, in reading view, Live Preview and Source mode. Obsidian's editor
  already does this: its `.cm-highlight` rule sets `--text-normal` and outranks
  `.cm-strong` and `.cm-em`. Reading view does not, because `<mark><strong>` lets the
  child take `--bold-color`. One rule closes the gap:

  ```css
  .markdown-rendered mark :is(strong, b, em, i) { color: inherit; }
  ```

  This keeps the three modes identical and removes the proposal's tightest pair, coral on
  the dark highlight at 4.51:1. Highlighted text reads at 9.65:1 in Dark and 14.43:1 in
  Light.
- This is the loudest change. If it feels busy after a week, the fallback is bold coral
  and italic left as primary text.

### 3. Tags: blue pills instead of gold

| Variable | Now (Obsidian default) | Proposed |
|---|---|---|
| `--tag-color` | gold (theme) | blue |
| `--tag-background` | gold subtle (theme) | blue subtle |
| `--tag-color-hover` | `--text-accent`, so gold or the picked accent | **primary text** |
| `--tag-background-hover` | accent at 20% | **blue subtle** |

Gold tags sat next to the gold highlight and the gold active file and read as the same
thing; blue separates "metadata" from "emphasis". On hover the pill keeps its fill and the
text brightens to primary, so hover stays blue and never flips to the accent. Links stay
the blue underline, so a tag (pill) and a link (underline) still differ in shape. Note
tags and property tag pills share these variables through Obsidian's `--pill-*` mapping,
and both were checked. Tags do not follow the accent picker.

The four variables must also be declared under `.is-mobile.theme-dark` and
`.is-mobile.theme-light`. Obsidian's own `.is-mobile.theme-dark { --tag-background: … }`
outranks a `.theme-dark` declaration. The shipped theme loses to it today: on a phone its
tag fill is Obsidian's accent mix, not Aion's.

### 4. Callouts

Obsidian 1.13 already derives callout colours from `--color-*`, so callouts are already in
Aion hues (see the "Current" captures). The only colour defect is that **question** and
**warning** both resolve to copper. Proposed: `--callout-question` → **gold**. Everything
else stays as Obsidian maps it (example is already violet today).

**Icon alignment.** `.callout-title` is a flex row aligned to the start, so the icon
already stays beside the first line of a wrapped title. The drift is inside that line.
Obsidian gives the icon's box the height of one text line (a zero-width space in
`.callout-icon::after`) and centres the SVG in it, so the SVG sits at the middle of the
line box, not the middle of the capitals. Where the capitals sit in the line box depends on
each font's ascent and descent. The fix keeps Obsidian's start alignment, trims the title's
outer edges to cap height and baseline, then moves the SVG from the line box centre to the
cap centre:

```css
@supports (text-box: trim-both cap alphabetic) {
  .callout-title-inner { text-box: trim-both cap alphabetic; }
  .callout-icon .svg-icon,
  .callout-fold .svg-icon { translate: 0 calc(0.5cap - 0.5lh); }
}
```

`cap` and `lh` resolve from the font in use, so no font is special-cased. Trimming only
removes space above the first line and below the last, so a wrapped title keeps its icon
and fold chevron on line one. Where `text-box` is unsupported, the `@supports` block
drops out whole and Obsidian's layout is unchanged. Nothing is half-applied. This relies
on the icon being no taller than one line of the title, true at Obsidian's defaults of
18px against 20.8px.

The first draft's version set `align-items: center` on the title. That centred the icon
against the whole title, so it contradicted the wrapped-title promise, and it is dropped.

### 5. File explorer: per-folder accent

Top-level folders cycle **coral → copper → gold → green → teal → blue**, then repeat.
Violet is excluded because the explorer is chrome.

- The folder name and its chevron take the accent; nested folder names inherit it.
- The indentation guide for that subtree uses the accent's **border** step.
- Files stay neutral text. The active file keeps today's row.

**Selector.** In 1.13.7 the top-level folders are children of an unclassed `div` inside
`.nav-files-container`. Only those carry the cycle; descendants inherit the custom
property:

```css
.nav-files-container > div > .nav-folder:nth-child(6n+1 of .nav-folder) {
  --aion-folder: /* coral solid */; --aion-folder-guide: /* coral border */;
}
/* … 6n+2 to 6n+6 for copper, gold, green, teal, blue */
```

`of .nav-folder` counts folders only, so a root file in between cannot shift the cycle.
Obsidian also sorts folders before files.

**States, through Obsidian's variables rather than `color`.** The folder title sets
`--nav-item-color`, which `.tree-item-self` reads for its plain state. It does not set
`color` itself. Every Obsidian state rule that sets `color` therefore still wins:

```css
.nav-files-container .nav-folder-title {
  --nav-item-color: var(--aion-folder, var(--text-muted));
}
.nav-files-container .nav-folder:not(.is-being-dragged-over)
  > .nav-folder-title:not(.is-selected, .is-being-dragged) {
  --nav-collapse-icon-color: var(--aion-folder, var(--text-muted));
  --nav-collapse-icon-color-collapsed: var(--aion-folder, var(--text-muted));
}
.nav-files-container .nav-folder > .tree-item-children {
  --nav-indentation-guide-color: var(--aion-folder-guide, var(--background-modifier-border));
}
```

The chevron is coloured through `--nav-collapse-icon-color`, the variable Obsidian's
`.collapse-icon svg.svg-icon` rule reads. Colouring the container has no effect on the SVG.

| State | Folder text | Chevron |
|---|---|---|
| Plain | accent | accent |
| Hover | primary text (Obsidian's hover colour) | accent: non-text, 4.10:1 minimum on the Light hover row, over the 3:1 floor |
| Selected | Obsidian's selected colour | Obsidian's default |
| Being dragged | Obsidian's on-accent on the accent fill | Obsidian's default |
| Drag target | Obsidian's highlighted accent | Obsidian's default |
| Renaming | accent, then Obsidian's active colour while focused (from the stylesheet, not measured) | accent |

The first draft set `color` directly and kept coral text on the gold drag fill, measured
by the review at 1.00–1.50:1. That no longer happens. On the dragged row the chevron shows
Obsidian's own neutral on the accent fill. That is stock Obsidian behaviour and the
shipped theme already has it, so this proposal does not change it.

The cycle follows Obsidian's sort, so renaming or reordering a folder can change its
colour. That is the cost of doing this without a plugin or per-folder configuration.

### 6. Chrome: small gold marks

- Active tab in the main area: a 2px gold top edge.
- Active side-panel icon and hovered ribbon icon: gold.
- Property icons: teal.
- Status bar: secondary text and a hairline top border, no colour.

These are fixed gold and do not follow the accent picker. That differs from the active
file row, whose text already resolves through `--text-accent` (the picker) while its fill
is fixed. Whether the new marks should follow the picker too is open decision 3 below.

## Content spacing

Aion sets no spacing today; everything is Obsidian's default. Measured in reading view at
16px text:

| Measure | Value | Verdict |
|---|---|---|
| Line length | 624px, about 70–75 characters | Good |
| Line height | 1.5 | Good |
| Paragraph gap | 16px | Good |
| Space above any heading after body text | 40px for **every** level | Flat: an H4 breaks the page as hard as an H2 |
| Heading sizes H2 / H3 / H4 | 23.4 / 21.1 / 19.0px | Close together, so the gaps and colours carry the hierarchy |
| Callout padding top / title-to-body / bottom | 12 / 16 / **28**px | Unbalanced when the callout ends in a block with a bottom margin |
| Explorer row | 25px | Good |
| List item | 26px | Good |

| Current | Proposed |
|---|---|
| ![Current spacing](2026-09-23-obsidian-colour/spacing-before-dark.png) | ![Proposed spacing](2026-09-23-obsidian-colour/spacing-after-dark.png) |

Proposed:

1. **Graded heading space**: H2 keeps `--heading-spacing` (40px), H3 gets 0.8× (32px),
   H4–H6 0.6× (24px). The rules copy Obsidian's own reading-view selector, which only
   applies after body blocks, so a heading directly under another keeps Obsidian's
   spacing. They scale with the user's density and font settings. Reading view only;
   Live Preview heading spacing is unchanged.
2. **Balanced callouts**: the last child loses its bottom margin, and the first child
   after a title gets 8px. Live Preview needs one extra selector, because Obsidian's
   `.markdown-source-view.mod-cm6 .callout-content .callout { margin: 1em 0 }` outranks
   the generic reset for a nested callout that ends its parent:

   ```css
   .callout-content > :last-child,
   .markdown-source-view.mod-cm6 .callout-content > .callout:last-child { margin-bottom: 0; }
   .callout-title + .callout-content > :first-child { margin-top: var(--size-4-2); }
   ```

   Measured bottom padding, current → proposed, in both reading view and Live Preview:

   | Callout | Current | Proposed |
   |---|---|---|
   | Ends in a paragraph | 28 | 12 |
   | Ends in a list | 28 | 12 |
   | Ends in a nested callout (outer and inner) | 28 | 12 |
   | Title only | 12 | 12 |
   | Collapsed | 12 | 12 |

   A paragraph callout is 24px shorter. The other kinds lose what their trailing margin
   was.

Font size, line height and line width are left alone. The Obsidian README promises that
the user's font and density settings stay in control.

## Contrast

Calculated with `contrastEmitted` on the emitted hex. Callout titles are composited with
`compositeEmitted` at Obsidian's 10% fill. These are calculations, not native acceptance.

| Pair | Dark (min) | Light (min) |
|---|---|---|
| Any accent as text on the page (headings, bold, italic) | 6.96 (coral) | 5.55 (blue) |
| Folder accents on the sidebar | 6.57 (coral) | 5.26 (blue) |
| Folder accent chevron on the hover row (non-text, 3:1) | 4.82 (coral) | 4.10 |
| Tag text on tag fill (blue) | 7.23 | 5.21 |
| Tag hover: primary text on blue subtle | 12.88 | 15.69 |
| Callout title on its own fill | 6.05 (coral) | 4.80 (copper) |
| Highlighted text (primary on the highlight) | 9.65 | 14.43 |

Folder text on the hover row, drag fill, selection and drag target is Obsidian's state
colour, not an accent. Those pairs are the ones the shipped theme already has.

## Verification

Measured natively in Obsidian 1.13.7 against the revised prototype, in Dark and Light,
from computed styles:

- **Explorer**: the selector matched only top-level folders. Nested folders at three
  levels inherited the top-level accent, the 7th and 8th folders wrapped to coral and
  copper, and files stayed neutral. Chevron SVGs computed to the folder accent. Hover
  gave primary text with an accent chevron; selected, dragged and drag-target rows
  computed to Obsidian's own state colours. The drag was simulated with Obsidian's state
  classes, not a real pointer drag. A custom accent was not checked.
- **Emphasis in highlights**: `==**b**==`, `**==b==**`, `==*i*==`, `*==i==*` and
  `==***b***==` computed to primary text in reading view, Live Preview and Source mode.
- **Tags**: a note tag and a property tag pill computed blue on blue subtle, and primary
  on blue subtle under a real pointer hover. With `is-mobile` on the body, the proposal's
  tag fill held, and the shipped theme's lost to Obsidian's mobile rule.
- **Callouts**: at a 300px line width, titles wrapping to 3–4 lines kept the icon and the
  fold chevron on line one. First-line icon offset from the cap centre, current →
  proposed: DejaVu Sans, Liberation Sans, FreeSans and Monaspace 1.39 → 0.00–0.48px;
  Droid Sans Fallback 0.39 → 0.27px. These five fonts are the measured set, not a
  guarantee for every font. The `@supports` fallback was not exercised, because this
  Chromium supports `text-box`.
- **Spacing**: the callout table above, in reading view and Live Preview.

## Implementation outline

All of this lives in `packages/obsidian/src/theme.ts`; no token changes and no new hex.

- **Variables** in `obsidianColors`: `--h3-color`, `--h4-color`, `--bold-color`,
  `--italic-color`, `--callout-question`, the four tag variables, and per-accent
  `--aion-obsidian-folder-*` values (solid and border) for the explorer cycle.
- **Mobile tag block**: the four tag variables under `.is-mobile.theme-dark` and
  `.is-mobile.theme-light`.
- **Rules** appended to `themeCss`, in the style of the existing Canvas rules: the
  explorer cycle and state variables, the highlight foreground rule, the chrome marks,
  heading spacing, callout balance, and the `@supports` icon alignment, all as written
  above.
- **Tests** in `packages/obsidian/test/theme.test.ts`, each pairing a foreground with the
  background it lands on: accents on the page, folder accents on the sidebar, the
  chevron on the hover row at 3:1, tag and tag hover on blue subtle, the question title on
  its composited fill, primary text on the highlight. Structural tests: no explorer or
  chrome rule references violet; folder rules set `--nav-item-color` and
  `--nav-collapse-icon-color`, never `color`; the cycle selector is anchored to
  `.nav-files-container > div >`; the mobile tag block exists.
- **Native acceptance**, which a calculation cannot replace: a real pointer drag of a
  coloured folder with the default and a custom accent; hover, selection, rename and drag
  target; nested folders and the wrap to a 7th folder; highlighted-emphasis cases in all
  three modes; tag and property-pill hover; wrapped, collapsible, title-only, list-ending
  and nested callouts at a narrow width in reading view and Live Preview; the phone
  emulator for the mobile tag block.
- Then `npm run build`, `npm run verify`, `npm test`, `npm run typecheck`,
  `npm run sync:design`, re-capture `screenshots/obsidian-*.png`. Update the Obsidian
  README, which currently says headings and tags keep "authored palette roles", and add a
  CHANGELOG entry.

## Open for your review

1. Bold coral + italic green, or bold only?
2. Explorer cycle order: rainbow (proposed) or maximum-contrast neighbours
   (e.g. coral, teal, gold, blue, copper, green)?
3. Should the Obsidian accent picker also recolour the heading ladder and the new gold
   chrome marks, or should both stay fixed palette roles like today's headings?
