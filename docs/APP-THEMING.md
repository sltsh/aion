# Porting Aion to another app

Use this guide to reskin a native editor, desktop tool or dashboard without CSS.
It defines the dark colour scheme; it does not require Aion's fonts, layout or components.
The essentials palette is a starting subset. The roles below explain where colours belong.

This file is a complete, copyable dark-palette reference. No Aion package, stylesheet,
repository file or build command is required in the destination project. Use the hex
values below directly in the application's theme format. Token names are reference
labels, not imports or settings the target app must support.

The tables are generated in the source Aion project. Treat this copy as a palette
snapshot: keep its values intact and record application-specific mappings separately.
To adopt a later palette, replace this guide with the newer copy and recheck the port.

## Map roles, not setting names

Keep the main reading area darkest, with panels and navigation raised above it. Use
neutral surfaces for most of the interface. Gold identifies focus, active navigation
and occasional primary emphasis; teal is secondary emphasis. Neither should colour
every border or label. Blue is for links. Violet belongs to syntax, not general chrome.
Preserve meaningful status distinctions instead of making every indicator gold.
Do not introduce italics in editor syntax rules.

| App role | Token | Hex |
| --- | --- | --- |
| Main content | neutral.editor | `#11151c` |
| Panel | neutral.terminal | `#14181f` |
| Sidebar / navigation | neutral.sidebar | `#171b22` |
| Elevated popup | neutral.widget | `#1e222a` |
| Input | neutral.input | `#262a32` |
| Hover | neutral.hover | `#2f333b` |
| Primary text | fg.primary | `#e2e8f3` |
| Secondary text | fg.secondary | `#a7acb7` |
| Dim text | fg.dim | `#848993` |
| Text on accent | fg.onAccent | `#11151c` |
| Hairline | border.hairline | `#3d414a` |
| Divider | border.divider | `#4e535c` |
| Control edge | border.control | `#70757e` |
| Focus | border.focus | `#e4c058` |
| Link | fg.link | `#7db2f7` |
| Caret | cursor | `#e4c058` |
| Selection on main content | selection composited over neutral.editor | `#0b2d5f` |
| Current line on main content | lineHighlight composited over neutral.editor | `#21252d` |

Use primary text for content, secondary for supporting labels, and dim text for tertiary
information. Do not use the neutral ramp's muted / step 10 colour as ordinary text.
For disabled controls, start with dim text and retain the app's disabled behaviour;
avoid multiplying opacity across the entire control and accidentally dimming its surface too.

Hairlines and dividers are decorative. A control boundary that must be visible uses
the control edge, checked against both the control's interior and its surrounding panel.
Use neutral text on hover backgrounds; accent text is not guaranteed there.

## Accents and statuses

| Accent | Text / solid | Subtle fill | Border |
| --- | --- | --- | --- |
| coral | `#ed807e` | `#391716` | `#935553` |
| copper | `#ea955f` | `#361b08` | `#8c5c3e` |
| gold | `#e4c058` | `#2d2100` | `#7b672e` |
| green | `#7bce88` | `#0e2a13` | `#47764e` |
| teal | `#59cdc8` | `#002928` | `#367572` |
| blue | `#7db2f7` | `#122339` | `#4d6b91` |
| violet | `#bd96e9` | `#291c37` | `#735d8d` |

Use a solid accent sparingly for an icon, text or filled control. A filled control pairs
with the text-on-accent role, not primary text by default. A subtle fill is a background
for emphasis; its accent colour can supply the foreground. An accent border is not a
substitute for the functional control edge without checking its contrast.

| Status | Text | Subtle fill | Solid fill | Text on solid | Border |
| --- | --- | --- | --- | --- | --- |
| success | `#7bce88` | `#0e2a13` | `#7bce88` | `#11151c` | `#47764e` |
| warning | `#ea955f` | `#361b08` | `#ea955f` | `#11151c` | `#8c5c3e` |
| error | `#ed807e` | `#391716` | `#ed807e` | `#11151c` | `#935553` |
| info | `#7db2f7` | `#122339` | `#7db2f7` | `#11151c` | `#4d6b91` |

Keep these foreground/background pairs together. Use labels or icons as well as colour
for errors, warnings and success. Preserve an app's established domain meanings, such as
recording indicators or meter thresholds, and document any intentional departure.

## Editor syntax

| Syntax role | Hex |
| --- | --- |
| variable | `#ed807e` |
| number | `#ea955f` |
| constant | `#ea955f` |
| type | `#e4c058` |
| string | `#7bce88` |
| operator | `#59cdc8` |
| escape | `#59cdc8` |
| function | `#7db2f7` |
| keyword | `#bd96e9` |
| comment | `#98a0af` |
| punctuation | `#a7acb7` |

Map each language's actual token categories to these roles. If an editor combines
categories, choose the role of the dominant category and record that compromise.
Leave unsupported categories on primary text rather than inventing extra colours.

## Terminal colours

For a terminal or embedded terminal, use main content as the background and primary
text as the default foreground. Map the numbered ANSI slots below exactly; syntax
accents do not replace this mapping. Start with the blue subtle fill for terminal
selection, then check how the application handles selected text and reverse video.

| # | Slot | Hex | # | Slot | Hex |
| --- | --- | --- | --- | --- | --- |
| 0 | black | `#2a2e36` | 8 | bright black | `#8b909a` |
| 1 | red | `#d86e6c` | 9 | bright red | `#ed807e` |
| 2 | green | `#67ba75` | 10 | bright green | `#7bce88` |
| 3 | yellow | `#d1ad43` | 11 | bright yellow | `#e4c058` |
| 4 | blue | `#6b9fe2` | 12 | bright blue | `#7db2f7` |
| 5 | purple | `#aa84d5` | 13 | bright purple | `#bd96e9` |
| 6 | cyan | `#43b9b5` | 14 | bright cyan | `#59cdc8` |
| 7 | white | `#a7acb7` | 15 | bright white | `#e2e8f3` |

ANSI slot 0 is intentionally dark and is not legible as text on the dark background.
Applications can select it as a foreground with SGR 30; this is a real limitation.
It serves as a background for the white and bright-white slots. Do not claim that
every terminal foreground/background combination passes contrast.

## Selection, hover and limited theme settings

The selection and current-line values above are opaque results of Aion's overlays on
the main content background. They are useful where an app accepts only an opaque fill.
They are not transferable overlay colours: do not apply transparency to them again.
Use these fills at full opacity. On another surface they still produce the same colour,
but their visual prominence and the text they must support can change, so check both.
If the target accepts only translucent overlays, retain its native treatment until you
can measure the rendered result; these opaque values do not specify an overlay recipe.

Check whether selection preserves syntax colours, replaces the foreground, or stacks
with current-line and search highlighting. Aion's VS Code reading states do not prove
those combinations in another editor. For selected plain text, primary text is a starting
foreground; preserve syntax only after checking every syntax colour on the selected fill.
Gold can mark an active item with a small indicator; selection remains a separate state.

When settings are limited:

- One background: use main content. Two: add sidebar / navigation for chrome.
- One foreground: use primary text. Two: add secondary text.
- One accent: use gold; retain separate status colours wherever the app permits them.
- One border: prefer the control edge if it also outlines interactive controls.
- No state settings: retain native interaction feedback and inspect it against the new colours.

Do not change application behaviour, layout or content to force a palette mapping.
First establish which parts are themeable; operating-system chrome may be outside it.

## Record and check each port

Keep a small mapping alongside the theme file, using the app's exact setting names:

| Target setting | Aion role / token | Use and limitation |
| --- | --- | --- |
| Actual key from the target format | Token from a table above | Surface painted; any fallback |

Record the application version, the date this guide was copied (and Aion release or
commit if known), theme format and installation steps. All table values use six-digit
RGB hex: the first byte is red, then green, then blue, with no alpha channel.
Convert the values to RGB channels or the target's channel order when
needed; do not adjust the palette by eye during format conversion.

Inspect a representative screen with content, panels, inputs, hover, keyboard focus,
selection and statuses. For an editor, include comments, syntax, search matches and
current-line highlighting, both separately and where the app stacks them.
Use a WCAG contrast checker that accepts sRGB hex values to measure the actual
foreground/background pairs: target 4.5:1 for reading text and 3:1 for functional edges
and focus indicators. Check both surfaces touching a control edge. For transparency,
measure the final rendered colours, not the unblended foreground and background inputs.
For a flat, standard sRGB alpha blend, each resulting RGB byte is
`round(alpha * foregroundByte + (1 - alpha) * backgroundByte)`, with alpha from 0 to 1.
Apply stacked layers in paint order; if the renderer blends differently, sample its
actual output. Sample flat colour regions, not antialiased glyph edges.
If a pair fails, change its role mapping or retain a working native treatment and record
the limitation. If you must introduce a custom colour, label it as a local departure
from Aion, keep it outside these reference tables, and validate its actual pairings.

Report calculated contrast and actual application inspection separately. Record what
was checked and any unthemeable or unverified states. This guide supplies mappings,
not native acceptance for Notepad++, OBS Studio, Glance or any other new port.
