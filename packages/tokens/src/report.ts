import type { Oklch } from './oklch.js';
import type { Overlay } from './palette.js';
import { hex, hexAlpha, compositeEmitted, contrastEmitted } from './oklch.js';
import type { AccentName, AnsiSlot, DiffWashName, SyntaxRole, TerminalBackgroundName } from './palette.js';
import {
  ACCENTS, ACCENT_NAMES, ANSI_BLACK_TEXT, ANSI_ORDER, CONTRAST_FLOOR, NEUTRAL_LIGHTNESS,
  NON_TEXT_FLOOR, ONE_DARK_PRO_HUE, SYNTAX, TERMINAL_BACKGROUNDS, accentScale, ansi, comment,
  diff, diffWash, dimText, findMatch, neutral, overlay, terminalSelection,
} from './palette.js';
import { LIGHT_LIGHTNESS, lightAccentScale, lightNeutral } from './light.js';
import { status, statusLight } from './status.js';
import { BOUNDARY_PAIRS, BOUNDARY_PAIRS_LIGHT, bg, bgLight, border, borderLight } from './semantic.js';
import { readingForegrounds, readingStates } from './states.js';
import { RIVALS, contrastHex, measure, surfaceOrder } from './rivals.js';

export type CheckState = 'pass' | 'fail' | 'exempt' | 'info';

export interface Check {
  readonly section: string;
  readonly token: string;
  readonly hex: string;
  readonly surface: string;
  readonly surfaceHex: string;
  readonly ratio: number;
  readonly floor: number;
  readonly state: CheckState;
}

const build = (
  section: string, token: string, colour: Oklch,
  surface: string, surfaceColour: Oklch, floor: number,
  state?: CheckState,
): Check => {
  const ratio = contrastEmitted(colour, surfaceColour);
  return {
    section, token, hex: hex(colour), surface, surfaceHex: hex(surfaceColour), ratio, floor,
    state: state ?? (ratio >= floor ? 'pass' : 'fail'),
  };
};

const compositeOverlay = (name: keyof typeof overlay, under: Oklch): Oklch =>
  compositeEmitted(overlay[name].color, overlay[name].alpha, under);

const NEUTRAL_ROLE: Record<keyof typeof NEUTRAL_LIGHTNESS, string> = {
  editor: 'editor',
  terminal: 'terminal, panel',
  sidebar: 'sidebar, activity bar, status bar, tab bar',
  widget: 'widget, menu, hover card, notification',
  input: 'input, inactive tab',
  hover: 'hover state',
  hairline: 'hairline border',
  divider: 'divider',
  border: 'UI border, focus edge',
  muted: 'muted text, line number',
  textSecondary: 'secondary text',
  textPrimary: 'primary text',
};

const TEXT_STEPS = ['textSecondary', 'textPrimary'] as const;
const SURFACES = ['editor', 'terminal', 'sidebar', 'widget'] as const;

export function checks(): Check[] {
  const rows: Check[] = [];

  for (const [name, colour] of Object.entries(neutral)) {
    const isText = (TEXT_STEPS as readonly string[]).includes(name);
    rows.push(build('neutral', `neutral.${name}`, colour, 'editor', neutral.editor,
      isText ? CONTRAST_FLOOR : 0, name === 'editor' ? 'info' : isText ? undefined : 'info'));
  }
  // Documented exemption: the line number is decorative, so the text floor does not apply.
  rows.push(build('neutral', 'neutral.muted (line number)', neutral.muted, 'editor', neutral.editor,
    CONTRAST_FLOOR, 'exempt'));

  for (const step of TEXT_STEPS) {
    for (const surface of SURFACES) {
      rows.push(build('text', `neutral.${step}`, neutral[step], surface, neutral[surface], CONTRAST_FLOOR));
    }
  }
  for (const surface of SURFACES) {
    rows.push(build('text', 'dimText', dimText, surface, neutral[surface], CONTRAST_FLOOR));
  }

  for (const role of Object.keys(SYNTAX) as SyntaxRole[]) {
    rows.push(build('syntax', role, ACCENTS[SYNTAX[role]], 'editor', neutral.editor, CONTRAST_FLOOR));
  }
  rows.push(build('syntax', 'comment', comment, 'editor', neutral.editor, CONTRAST_FLOOR));
  rows.push(build('syntax', 'punctuation', neutral.textSecondary, 'editor', neutral.editor, CONTRAST_FLOOR));

  for (const name of ACCENT_NAMES) {
    const scale = accentScale(name);
    rows.push(build('accent', `${name}.solid`, scale.solid, 'editor', neutral.editor, CONTRAST_FLOOR));
    rows.push(build('accent', `${name}.border`, scale.border, 'editor', neutral.editor, NON_TEXT_FLOOR));
    rows.push(build('accent', `text on ${name}.solid`, neutral.editor, `${name}.solid`, scale.solid, CONTRAST_FLOOR));
    rows.push(build('accent', `text on ${name}.subtle`, neutral.textPrimary, `${name}.subtle`, scale.subtle, CONTRAST_FLOOR));
  }

  // Every syntax colour against every background the guarantee covers, decorations
  // composited as the renderer composites them. Three of the nine defects in this
  // repository came from pairing a foreground with a background it actually lands on.
  for (const state of readingStates()) {
    for (const [role, colour] of Object.entries(readingForegrounds())) {
      rows.push(build('decorated', role, colour, state.name, state.background, CONTRAST_FLOOR));
    }
  }

  // The find match replaces the syntax colour rather than tinting it, so the pair to
  // measure is the override against the match, not the syntax against the match.
  for (const [role, colour] of Object.entries(readingForegrounds())) {
    rows.push(build('decorated', role, colour, 'find match, current', findMatch.current, CONTRAST_FLOOR));
  }

  for (const { edge, inside, outside } of BOUNDARY_PAIRS) {
    for (const side of [inside, outside]) {
      rows.push(build('boundary', `border.${edge}`, border[edge], side, bg[side], NON_TEXT_FLOOR));
    }
  }
  for (const name of ['hairline', 'divider'] as const) {
    // Documented exemption: these separate regions that already read as separate. They
    // are not the edge of anything a keyboard user has to find.
    rows.push(build('boundary', `border.${name} (decorative)`, border[name], 'widget', bg.widget,
      NON_TEXT_FLOOR, 'exempt'));
  }

  for (const [background, surface] of Object.entries(TERMINAL_BACKGROUNDS) as [TerminalBackgroundName, Oklch][]) {
    for (const slot of ANSI_ORDER) {
      // Documented exemption: SGR 30 selects slot 0 as a foreground and it is not legible
      // on either default background. Slot 0 is guaranteed as a background instead.
      rows.push(build('ansi', `ansi.${slot}`, ansi[slot], background, surface,
        CONTRAST_FLOOR, slot === 'black' ? 'exempt' : undefined));
    }
  }
  for (const slot of ANSI_BLACK_TEXT) {
    rows.push(build('ansi', `ansi.${slot} on ansi.black`, ansi[slot], 'ansi.black', ansi.black, CONTRAST_FLOOR));
  }
  // Windows Terminal paints its selection opaque, so every slot has to survive it.
  for (const slot of ANSI_ORDER) {
    if (slot === 'black') continue;
    rows.push(build('ansi', `ansi.${slot} on the selection`, ansi[slot], 'terminalSelection',
      terminalSelection, CONTRAST_FLOOR));
  }

  for (const [name, colour] of Object.entries(diff)) {
    const strip = name.endsWith('Strip');
    rows.push(build('diff', `diff.${name}`, colour, 'editor', neutral.editor,
      strip ? 0 : CONTRAST_FLOOR, strip ? 'info' : undefined));
  }
  // A word wash renders over its own line wash, never straight onto the editor, so the
  // reported colour is the pair composited in that order.
  for (const [name, value] of Object.entries(diffWash) as [DiffWashName, Overlay][]) {
    const line = diffWash[name.endsWith('Word')
      ? (`${name.slice(0, -4)}Line` as DiffWashName) : name];
    const under = line === value ? neutral.editor
      : compositeEmitted(line.color, line.alpha, neutral.editor);
    rows.push(build('diff', `diffWash.${name}`, compositeEmitted(value.color, value.alpha, under),
      'editor', neutral.editor, 0, 'info'));
  }
  // The gutter column carries the line number and nothing else, so the strip is gated on
  // that one foreground rather than on the comment. It is why the strip may be the loudest
  // part of a diff: no body text ever lands on it.
  for (const name of ['addedStrip', 'removedStrip'] as const) {
    rows.push(build('diff', 'editorLineNumber.foreground', neutral.muted, `diff.${name}`,
      diff[name], NON_TEXT_FLOOR));
  }

  for (const [name, value] of Object.entries(overlay)) {
    rows.push({
      section: 'overlay', token: `overlay.${name}`, hex: hexAlpha(value.color, value.alpha),
      surface: 'editor', surfaceHex: hex(compositeOverlay(name as keyof typeof overlay, neutral.editor)),
      ratio: 0, floor: 0, state: 'info',
    });
  }

  for (const [name, scale] of Object.entries(status)) {
    rows.push(build('status', `status.${name}.text`, scale.text, 'editor', neutral.editor, CONTRAST_FLOOR));
    rows.push(build('status', `status.${name}.border`, scale.border, 'editor', neutral.editor, NON_TEXT_FLOOR));
    rows.push(build('status', `status.${name}.onSolid`, scale.onSolid, `${name}.solid`, scale.solid, CONTRAST_FLOOR));
  }

  for (const [name, colour] of Object.entries(lightNeutral)) {
    const isText = (TEXT_STEPS as readonly string[]).includes(name) || name === 'muted';
    rows.push(build('light', `light.${name}`, colour, 'page', lightNeutral.page,
      isText ? CONTRAST_FLOOR : 0, name === 'page' ? 'info' : isText ? undefined : 'info'));
  }
  for (const { edge, inside, outside } of BOUNDARY_PAIRS_LIGHT) {
    for (const side of [inside, outside]) {
      rows.push(build('light', `light.border.${edge}`, borderLight[edge], `light.${side}`,
        bgLight[side], NON_TEXT_FLOOR));
    }
  }
  for (const name of ACCENT_NAMES) {
    const scale = lightAccentScale(name);
    rows.push(build('light', `light.${name}.solid`, scale.solid, 'page', lightNeutral.page, CONTRAST_FLOOR));
    rows.push(build('light', `light.${name}.solid`, scale.solid, 'raised', lightNeutral.raised, CONTRAST_FLOOR));
    rows.push(build('light', `light.${name}.solid`, scale.solid, `light.${name}.subtle`, scale.subtle, CONTRAST_FLOOR));
    rows.push(build('light', `light.${name}.border`, scale.border, 'raised', lightNeutral.raised, NON_TEXT_FLOOR));
    rows.push(build('light', `text on light.${name}.subtle`, lightNeutral.textPrimary, `light.${name}.subtle`, scale.subtle, CONTRAST_FLOOR));
  }
  for (const [name, scale] of Object.entries(statusLight)) {
    rows.push(build('light', `light.status.${name}.text`, scale.text, 'page', lightNeutral.page, CONTRAST_FLOOR));
  }

  return rows;
}

export const failures = (rows: Check[] = checks()): Check[] => rows.filter((r) => r.state === 'fail');

const ratio = (value: number): string => value.toFixed(2);
const round = (value: number, places: number): string => value.toFixed(places);

export function designTables(): Record<string, string> {
  const against = (c: Oklch): string => ratio(contrastEmitted(c, neutral.editor));
  const onPage = (c: Oklch): string => ratio(contrastEmitted(c, lightNeutral.page));

  const neutralRows = (Object.keys(NEUTRAL_LIGHTNESS) as (keyof typeof NEUTRAL_LIGHTNESS)[])
    .map((name, index) => {
      const colour = neutral[name];
      const shown = name === 'editor' ? '—' : against(colour);
      return `| ${index + 1} | ${NEUTRAL_ROLE[name]} | ${round(colour[0], 3)} | \`${hex(colour)}\` | ${shown} |`;
    }).join('\n');

  const accentRows = ACCENT_NAMES.map((name) => {
    const scale = accentScale(name);
    const [, chroma, hue] = ACCENTS[name];
    return `| ${name} | ${hue}° | ${round(chroma, 3)} | \`${hex(scale.solid)}\` | \`${hex(scale.border)}\` | \`${hex(scale.subtle)}\` | ${against(scale.solid)} |`;
  }).join('\n');

  const SYNTAX_LABEL: Record<SyntaxRole, string> = {
    variable: 'variable, property, parameter', number: 'number, constant', constant: '',
    type: 'type, class', string: 'string', operator: 'operator, escape', escape: '',
    function: 'function, method', keyword: 'keyword',
  };
  const syntaxRows = (Object.keys(SYNTAX) as SyntaxRole[])
    .filter((role) => SYNTAX_LABEL[role] !== '')
    .map((role) => {
      const accent = SYNTAX[role];
      const colour = ACCENTS[accent];
      const drift = colour[2] - ONE_DARK_PRO_HUE[role];
      const sign = drift >= 0 ? '+' : '−';
      return `| ${SYNTAX_LABEL[role]} | ${accent} | \`${hex(colour)}\` | ${round(ONE_DARK_PRO_HUE[role], 1)}° | ${colour[2]}° | ${sign}${round(Math.abs(drift), 1)}° | ${against(colour)} |`;
    })
    .concat([
      `| comment | — | \`${hex(comment)}\` | — | 264° | — | **${against(comment)}** |`,
      `| punctuation | — | \`${hex(neutral.textSecondary)}\` | — | 264° | — | ${against(neutral.textSecondary)} |`,
    ]).join('\n');

  const OVERLAY_LABEL: Record<string, string> = {
    selection: 'selection', findMatchOther: 'find match, other',
    wordHighlight: 'word highlight', lineHighlight: 'current line',
  };
  const overlayRows = Object.entries(overlay)
    .map(([name, value]) =>
      `| ${OVERLAY_LABEL[name] ?? name} | \`${hexAlpha(value.color, value.alpha)}\` | ${Math.round(value.alpha * 100)}% |`)
    .concat([`| find match, current | \`${hex(findMatch.current)}\` | solid |`])
    .join('\n');

  const DIFF_LABEL: Record<string, string> = {
    addedLine: 'added, line wash', addedWord: 'added, word wash',
    removedLine: 'removed, line wash', removedWord: 'removed, word wash',
  };
  const diffRows = Object.entries(diffWash)
    .map(([name, value]) =>
      `| ${DIFF_LABEL[name]} | \`${hexAlpha(value.color, value.alpha)}\` | ${Math.round(value.alpha * 100)}% |`)
    .concat(([
      ['added, gutter strip', diff.addedStrip], ['added, change bar', diff.addedGutter],
      ['removed, gutter strip', diff.removedStrip], ['removed, change bar', diff.removedGutter],
    ] as [string, Oklch][]).map(([label, colour]) => `| ${label} | \`${hex(colour)}\` | solid |`))
    .join('\n');

  const ANSI_LABEL: Record<string, string> = {
    black: 'black', red: 'red', green: 'green', yellow: 'yellow', blue: 'blue',
    magenta: 'magenta', cyan: 'cyan', white: 'white',
  };
  const label = (slot: AnsiSlot): string =>
    slot.startsWith('bright') ? `bright ${ANSI_LABEL[slot.slice(6).toLowerCase()]}` : ANSI_LABEL[slot]!;
  const ansiRows = ANSI_ORDER.slice(0, 8).map((normal, index) => {
    const brightSlot = ANSI_ORDER[index + 8]!;
    const normalRatio = normal === 'black' ? 'exempt' : against(ansi[normal]);
    return `| ${index} | ${label(normal)} | \`${hex(ansi[normal])}\` | ${normalRatio} | | ${index + 8} | ${label(brightSlot)} | \`${hex(ansi[brightSlot])}\` | ${against(ansi[brightSlot])} |`;
  }).join('\n');

  const LIGHT_LABEL: Record<keyof typeof LIGHT_LIGHTNESS, string> = {
    page: 'page', surface: 'surface', raised: 'raised', input: 'input', hover: 'hover',
    hairline: 'hairline', divider: 'divider', border: 'border', muted: 'muted',
    textSecondary: 'secondary text', textPrimary: 'primary text',
  };
  const lightNames = Object.keys(LIGHT_LIGHTNESS) as (keyof typeof LIGHT_LIGHTNESS)[];
  const lightRows = lightNames.map((name, index) => {
    const accent = ACCENT_NAMES[index];
    const left = `| ${LIGHT_LABEL[name]} | \`${hex(lightNeutral[name])}\` |`;
    if (!accent) return `${left} | | | |`;
    const solid = lightAccentScale(accent).solid;
    return `${left} | ${accent} | \`${hex(solid)}\` | ${onPage(solid)} |`;
  }).join('\n');

  const aionRatios = [
    ...(Object.keys(SYNTAX) as SyntaxRole[]).map((role) => contrastEmitted(ACCENTS[SYNTAX[role]], neutral.editor)),
    contrastEmitted(comment, neutral.editor),
    contrastEmitted(neutral.textSecondary, neutral.editor),
  ];
  const rivalRows = [
    { name: 'Aion', lowest: Math.min(...aionRatios), below: [] as readonly string[], source: '—' },
    ...RIVALS.map((rival) => ({
      ...measure(rival),
      source: `[${rival.variant}](${rival.source}) @ \`${rival.revision.slice(0, 7)}\``,
    })),
  ].map((r) => `| ${r.name} | ${ratio(r.lowest)} | ${r.below.length === 0 ? 'none' : r.below.join(', ')} | ${r.source} |`).join('\n');

  const surfaceRows = RIVALS
    .map((rival) => `| ${rival.variant} | \`${rival.background}\` | \`${rival.sideBar}\` | ${surfaceOrder(rival)} |`)
    .join('\n');

  // The listing tables. They quoted hand-typed hex until a palette change made every one
  // of them wrong at once, so they are generated like everything else.
  const LISTING_SURFACE: [string, Oklch][] = [
    ['editor', neutral.editor], ['panel, terminal', neutral.terminal],
    ['sidebar, status bar', neutral.sidebar], ['widget, menu', neutral.widget],
    ['primary text', neutral.textPrimary], ['secondary text', neutral.textSecondary],
    ['comment', comment],
  ];
  const LISTING_ACCENT: [string, AccentName][] = [
    ['coral, variables', 'coral'], ['copper, numbers', 'copper'], ['gold, types', 'gold'],
    ['green, strings', 'green'], ['teal, operators', 'teal'], ['blue, functions', 'blue'],
    ['violet, keywords', 'violet'],
  ];
  const listingRows = LISTING_SURFACE.map(([label, colour], index) => {
    const [accentLabel, accent] = LISTING_ACCENT[index]!;
    return `| ${label} | \`${hex(colour)}\` | | ${accentLabel} | \`${hex(ACCENTS[accent])}\` |`;
  }).join('\n');

  // Windows Terminal calls the magenta slots "purple", and this table ships in its README.
  const wt = (slot: AnsiSlot): string => label(slot).replace('magenta', 'purple');
  const slotRows = ANSI_ORDER.slice(0, 8).map((normal, index) => {
    const bright = ANSI_ORDER[index + 8]!;
    return `| ${index} | ${wt(normal)} | \`${hex(ansi[normal])}\` | ${index + 8} | ${wt(bright)} | \`${hex(ansi[bright])}\` |`;
  }).join('\n');

  return { rivals: rivalRows, surfaces: surfaceRows, listing: listingRows, slots: slotRows, neutral: neutralRows, accent: accentRows, syntax: syntaxRows, overlay: overlayRows, diff: diffRows, ansi: ansiRows, light: lightRows };
}
