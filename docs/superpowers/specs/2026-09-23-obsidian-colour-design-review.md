# Review: Obsidian colour design

Reviewed 2026-09-23 against `d68bedffd0592ea9bfed44c0f82d1ae83ee84235` on
`feature/obsidian-review-fixes`.

**Result: revise before deriving the implementation plan.** Seven issues below can
produce incorrect behaviour or misleading acceptance tests. All are P2: corrections
needed during planning and implementation. This review does not approve the open
product choices or change the theme.

References to spec lines refer to
[the reviewed proposal](2026-09-23-obsidian-colour-design.md) at that revision.

## 1. Folder colours must yield to drag states, not only hover

**Spec:** lines 104–110, 179–187.

The plan covers ordinary and hovered folder rows, but Obsidian also paints a dragged
row with `--interactive-accent` and switches its text to `--text-on-accent`:

```css
.tree-item-self.is-being-dragged {
  color: var(--text-on-accent);
  background-color: var(--interactive-accent);
}
```

The prototype's `.nav-files-container .nav-folder .nav-folder-title` colour rule
overrides that foreground. In a Chromium fixture using the extracted Obsidian
stylesheet and prototype, the dragged coral folder retained coral text on gold.
Using `contrastEmitted`, the six proposed folder colours on the default gold drag
fill measure **1.00–1.50:1 in Dark and 1.00–1.01:1 in Light**. The gold folder
becomes gold on gold.

**Plan correction:** explicitly preserve Obsidian's drag foreground and define
precedence for hover, selection, rename and drag-target states. The latter states
need inspection, not an assumption that every one is broken. Add the actual drag
pair and the hover fallback to the tests; the proposed sidebar-only folder gate
cannot catch this failure. Check a drag with default and custom accents.

## 2. The callout fix contradicts the wrapped-title promise

**Spec:** lines 82–97.

`.callout-title` is a flex row. Changing it to `align-items: center` centres the icon
against the entire multiline title. `text-box: trim-both cap alphabetic` trims the
outer text edges; it does not make flex alignment use the first text line. This
follows the [flex alignment definition](https://www.w3.org/TR/css-flexbox-1/#align-items-property)
and [text-box trimming definition](https://www.w3.org/TR/css-inline-3/#text-box-trim).

A 180px-wide fixture with a wrapped title produced a 52.61px title box and an
18px icon starting 17.30px below its top: the centres coincide. That contradicts
“A title that wraps keeps its icon beside the first line.” The extracted default
also uses `align-items: flex-start`, so the opening description of Obsidian's
centering needs to distinguish the icon's internal line box from the title row.

**Plan correction:** choose a layout that anchors both the icon and fold control to
the first line while retaining the intended optical adjustment. Add wrapped and
collapsible titles at narrow widths to acceptance. Keep the measured five-font
claim scoped to those fonts; specify a usable fallback where `text-box` is ignored.

## 3. Tag hover colours are omitted

**Spec:** lines 68–73, 175–187.

Changing `--tag-color` and `--tag-background` does not change the independent hover
variables. Obsidian's defaults are:

```css
--tag-color-hover: var(--text-accent);
--tag-background-hover: color-mix(in oklch, var(--interactive-accent) 20%, transparent);
```

`a.tag:hover` consumes both. The planned blue pill therefore becomes an accent pill
on hover: gold by default, or the user's accent. The prototype additionally sets
`--tag-background-hover` to blue subtle, which the implementation outline omits,
but still leaves the foreground at the accent colour. The static captures and
ordinary tag contrast test do not establish the promised blue metadata treatment.

**Plan correction:** specify both hover variables and test the chosen foreground
against its actual hover fill. Check note tags and property tag pills, which share
these variables. Record whether tag hover intentionally follows the accent picker.

## 4. Highlighted emphasis has different precedence across modes

**Spec:** lines 59–64, 169, 184–192.

The proposed variables alone do not make highlighted emphasis coral/green in all
three modes. In reading view, `<mark><strong>text</strong></mark>` lets the child
use `--bold-color`. In the editor, the more specific rule below wins over `.cm-strong`
and `.cm-em` when the same span carries the highlight class:

```css
.cm-s-obsidian span.cm-formatting-highlight,
.cm-s-obsidian span.cm-highlight {
  background-color: var(--text-highlight-bg);
  color: var(--text-normal);
}
```

The fixture confirmed coral for the reading example and primary text for
`<span class="cm-highlight cm-strong">` under `.cm-s-obsidian`. Reading markup in
the opposite nesting order can also let the inner `mark` take precedence. This is
a behaviour mismatch, not evidence of a contrast failure: the reported Dark coral
pair itself reproduces at **4.5149:1**.

**Plan correction:** define whether emphasis or highlighting owns the foreground.
If mode parity is required, include the necessary selector changes rather than
only variables. Accept explicit Markdown cases such as `==**bold**==`,
`**==bold==**`, italic equivalents and combined emphasis in reading view, Live
Preview and Source mode. Keep computed contrast tests, but add rendered checks of
the foreground that actually wins.

## 5. The explorer selector is both mistyped and insufficiently scoped

**Spec:** lines 101–114, 179–180.

`nav-folder:nth-child(6n+k of .nav-folder)` lacks the leading class dot. With an
actual integer substituted for `k`, it selects `nav-folder` elements, not
Obsidian's `div.nav-folder` nodes. Correcting only the dot is insufficient: an
unqualified `.nav-folder:nth-child(...)` assigns colours at every nesting level,
overriding the promised inheritance from the top-level folder.

**Plan correction:** record the full top-level selector against the observed DOM.
The local prototype uses
`.nav-files-container > div > .nav-folder:nth-child(6n+1 of .nav-folder)` for its
first colour; verify that wrapper relationship in the supported views before
adopting it. Set the cycle only on top-level folders and let descendants inherit.
Test two nested levels, interleaved root files and a seventh top-level folder.

## 6. Colouring the chevron container does not colour its SVG

**Spec:** lines 104–110, 179–181.

The prototype sets `color` on `.nav-folder-collapse-indicator`. Obsidian assigns a
colour directly to its child:

```css
.collapse-icon svg.svg-icon {
  color: var(--nav-collapse-icon-color);
}
```

That declaration wins over inherited container colour. The fixture produced a
coral folder title and a secondary-neutral SVG. The promise that the chevron
retains the folder identity when the hovered title becomes neutral therefore
cannot be implemented by copying the prototype's container rule.

**Plan correction:** bind the consumed collapse-icon variable in the folder scope,
or deliberately target the SVG. Verify the SVG's computed colour for expanded,
collapsed and hovered folders, including nested folders and the state precedence
from finding 1. A check that the rule contains no violet cannot establish this.

## 7. H5's current value and proposed change disagree with the outline

**Spec:** lines 53–54, 175–177.

The table says H5 is primary text today and remains primary text. In
[`obsidianColors`](../../../packages/obsidian/src/theme.ts), both `--h5-color` and
`--h6-color` currently use `fg-secondary`. The outline changes only H3 and H4, so
following it leaves H5 secondary, contrary to the proposed table.

**Plan correction:** either correct both H5 table cells to secondary text, or
explicitly include an H5 change to primary text and test that mapping. “Stay
neutral” alone does not select between the two token roles.

## Decisions to carry into the plan

The proposal still leaves emphasis colour, folder order and heading behaviour
under the accent picker open. Record their accepted values before fixing expected
outputs. Also distinguish fixed gold chrome from controls that follow the picker:
the active file foreground already resolves through `--text-accent`, while its
background is fixed. These are product choices, not additional defect findings.

Scope the 12 / 8 / 12px callout spacing and 24px height reduction to the measured
paragraph fixture. Empty, collapsed, list-ending and nested callouts need explicit
spacing acceptance; they do not all have the same trailing paragraph margin.

## Evidence and limits

- Repository sources: the reviewed spec, `DESIGN.md`, `PLAN.md`,
  `packages/obsidian/src/theme.ts`, its tests and README, and the token emitters.
- Consumer evidence: the locally extracted Obsidian 1.13.7 stylesheet at
  `/tmp/aion-review/app/app.css`, SHA-256
  `f612f1e8f36486fa57f3b8bd45f0c848409d5b168002e757a13c6d286a7b4c41`.
  Relevant consumers are quoted above so the review survives scratch-file cleanup.
- Prototype evidence: `/tmp/aion-colour-proposal/aion-proposal.css`, its generator
  and font-alignment probe. The prototype is supporting evidence, not a committed
  implementation contract.
- Fresh verification: emitted contrast calculations and an isolated headless
  Chromium fixture loading the extracted stylesheet, current `theme.css`, prototype
  and proposed callout rules. Temporary fixture and measurements are under
  `/tmp/aion-colour-spec-review/`. These establish CSS behaviour on representative
  markup, not fresh native Obsidian acceptance. The previous prototype's native
  debugging endpoint was no longer running.
- This commit changes only this review document. No implementation gates or full
  suites were rerun; they cannot validate a prose-only review. Before deriving the
  plan, resolve findings 1–7 and the named product decisions, then retain the
  proposal's required build, test, contrast, typecheck and native acceptance work.
