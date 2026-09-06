import type { GroupId } from './groups.js';

export const CONVENTIONS: Record<GroupId, string> = {
  surface:
    'The editor is the darkest surface and the sidebar sits above it. VS Code assumes the '
    + 'opposite, so both get checked whenever a key is added. Hairlines and dividers are '
    + 'decoration and skip the 3:1 floor. The edge of a control does not, and it is measured '
    + 'against both surfaces it touches.',
  accent:
    'Seven hues, three steps each. Subtle fills a shape, border draws its edge, solid is the '
    + 'colour itself. Every step is solved against the worst surface it can land on. Violet '
    + 'stays a syntax hue: five interface keys use it, and a test fails on a sixth.',
  syntax:
    'One colour per role, and no italics anywhere. Comments are the dimmest thing anyone has '
    + 'to read, so they set '
    + 'the budget for everything that sits under running code. Overlay alphas are solved '
    + 'against the comment rather than picked by eye.',
  status:
    'Four statuses, five keys each. A pill gets its own text colour, its own fill, its own '
    + 'edge and its own foreground for the solid, so it never has to borrow one and land on a '
    + 'background nobody measured.',
  decoration:
    'These are translucent, and they are measured after compositing. A renderer blends bytes, '
    + 'so blending in OKLCH would miss the rounding on both sides. A diff fill paints over the '
    + 'selection rather than under it, which is why it carries alpha instead of hiding it. '
    + 'Green costs more lightness per unit of chroma than red, so two markers at the same '
    + 'ratio do not carry the same amount of colour.',
  terminal:
    'Sixteen slots, each checked on both backgrounds it can land on: the standalone terminal '
    + 'and the lighter VS Code panel. The panel is the one that binds. Slot 0 is a background, '
    + 'not a text colour, and lifting it far enough to read would break SGR 40 and reverse '
    + 'video.',
};

export const PALETTE_INTRO =
  'Every value here comes out of @sltsh/aion-css. None of it is typed by hand: move the OKLCH '
  + 'in the token package and the whole page moves with it. Click any colour to copy its hex.';

export const LIGHT_NOTE =
  'Light ships in the CSS layer only. There is no light VS Code theme yet, and light gold '
  + 'reads as olive: a yellow cannot be both light and 4.5:1 against near-white.';

export interface Principle {
  readonly title: string;
  readonly body: string;
}

export const PRINCIPLES: readonly Principle[] = [
  {
    title: 'OKLCH is the source',
    body: 'Colours are authored as lightness, chroma and hue. Hex is output. Nothing in the '
      + 'repository types a hex by hand, and a test fails on one that does.',
  },
  {
    title: 'Measured where it lands',
    body: 'A foreground is paired with the background it will really sit on, and the worst '
      + 'surface decides. An accent is solved against the lightest surface on dark.',
  },
  {
    title: 'Decorations are composited first',
    body: 'A selection or a diff fill is blended over its surface before the ratio is read, '
      + 'the same way the renderer blends it. Nothing replaces the colour under it.',
  },
  {
    title: 'The gate runs in CI',
    body: 'The contrast check exits non-zero on any colour below its floor, on every branch. '
      + 'A colour that fails cannot be released.',
  },
];

export interface InstallEntry {
  readonly label: string;
  readonly command: string;
  readonly note: string;
}

export const INSTALL: readonly InstallEntry[] = [
  {
    label: 'VS Code',
    command: 'code --install-extension sltsh.aion-theme',
    note: 'The theme, six language overrides, no italics.',
  },
  {
    label: 'Windows Terminal',
    command: 'Copy fragments/aion.json into the Fragments directory',
    note: 'Adds the scheme without a settings edit.',
  },
  {
    label: 'CSS and Tailwind',
    command: 'npm install @sltsh/aion-css',
    note: 'Custom properties and a Tailwind v4 @theme block, both schemes.',
  },
  {
    label: 'Tokens',
    command: 'npm install @sltsh/aion-tokens',
    note: 'The OKLCH definitions, the solver and the contrast gate.',
  },
];

export const UNRELEASED_NOTE =
  'Aion has not been tagged yet, so these commands do not resolve. Build it from the '
  + 'repository until the first release.';

export const PITCH =
  'A dark theme for editors, terminals and the web. Every colour starts as OKLCH, and every '
  + 'pairing is measured on the surface it really lands on, decorations composited the way a '
  + 'renderer composites them.';

export const MANUAL_INTRO =
  'Most editors and terminals take a handful of colours and sixteen ANSI slots. That is the '
  + 'whole theme for anything Aion does not ship a file for. Copy the two blocks below into '
  + 'whatever the application calls its colour settings.';

export const MANUAL_RULES: readonly string[] = [
  'Put text on the background it will really sit on. The same grey reads differently on the '
    + 'editor and on a panel one step lighter.',
  'Slot 0 is a background. Some applications will let you select it with SGR 30; the palette '
    + 'does not guarantee it as text, and no amount of tuning fixes that without breaking SGR 40.',
  'If the application cannot take an alpha byte, use the opaque fallback given for the '
    + 'selection. A selection that replaces the colour under it hides the syntax it selects.',
  'Bright is not bold. Map slots 8 to 15 to the bright values, and leave the bold attribute to '
    + 'the font.',
];
