import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  ACCENTS, ANSI_ORDER, CONTRAST_FLOOR, LIGHT_PREVIEW_DEFAULTS, MEANING_PAIR_GAP, PREVIEW_DEFAULTS,
  buildLightPalette, buildPalette, checks, contrastEmitted, hex, neutral,
  readingForegrounds, readingStates, terminalBackground,
} from '@sltsh/aion-tokens';
import { figures, tightest } from '../src/figures.js';
import { readoutRows, renderReadout } from '../src/readout.js';
import { variables } from '../src/variables.js';
import { SURFACES } from '../src/render/index.js';
import { createLabController } from '../src/state.js';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = SURFACES.map((surface) => surface.html()).join('\n');
const tokens = variables(buildPalette());

const names = (source: string, pattern: RegExp): Set<string> =>
  new Set([...source.matchAll(pattern)].map((match) => match[1]!));

const used = names(`${css}\n${html}`, /var\((--[a-z0-9-]+)\)/g);
const declared = new Set([
  ...names(css, /(?:^|[;{"\s])(--[a-z0-9-]+)\s*:/gm),
  ...names(html, /(?:^|[;"\s])(--[a-z0-9-]+)\s*:/g),
]);

const kebab = (value: string): string => value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const declaration = (selector: string, property: string): string => {
  // Anchor at the start of a rule so a selector cannot match a longer selector by substring.
  const block = css.match(new RegExp(`(?:^|\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  expect(block, `${selector} is not in the stylesheet`).not.toBeNull();
  const found = block![1]!.match(new RegExp(`(?:^|;)\\s*${property}:[^;]*?var\\((--[a-z0-9-]+)\\)`));
  expect(found, `${selector} does not set ${property} from a token`).not.toBeNull();
  return found![1]!;
};

describe('the variables the lab writes', () => {
  test('every one is a six-digit hex, with alpha only on an overlay', () => {
    for (const [name, value] of Object.entries(tokens)) {
      const expected = name.startsWith('--o-') ? /^#[0-9a-f]{8}$/ : /^#[0-9a-f]{6}$/;
      expect(value, name).toMatch(expected);
    }
  });

  test('they are wired to the tokens they claim', () => {
    expect(tokens['--n-editor']).toBe(hex(neutral.editor));
    expect(tokens['--n-text-primary']).toBe(hex(neutral.textPrimary));
    expect(tokens['--s-keyword']).toBe(hex(ACCENTS.violet));
    expect(tokens['--ansi-bright-green']).toBe(hex(ACCENTS.green));
    expect(tokens['--bracket-1']).toBe(hex(ACCENTS.gold));
  });

  test('the standalone terminal sits on the editor value, not the panel value', () => {
    expect(hex(terminalBackground)).toBe(tokens['--n-editor']);
    expect(css).toContain('.terminal { background: var(--n-editor); }');
  });
});

// A misspelled custom property renders as nothing at all, which no screenshot catches.
describe('the stylesheet and the tokens agree', () => {
  test('every var() the stylesheet reads is emitted or declared here', () => {
    const missing = [...used].filter((name) => !(name in tokens) && !declared.has(name));
    expect(missing).toEqual([]);
  });

  test('violet is a syntax hue only: its accent scale never reaches the interface', () => {
    const violet = Object.keys(tokens).filter((name) => name.startsWith('--a-violet'));
    expect(violet).toHaveLength(3);
    expect(violet.filter((name) => used.has(name))).toEqual([]);
    expect(used.has('--s-keyword')).toBe(true);
  });

  test('every syntax and ANSI class the stylesheet defines is applied by a surface', () => {
    const applied = new Set(
      [...html.matchAll(/class="([^"]+)"/g)].flatMap((match) => match[1]!.trim().split(/\s+/)),
    );
    const defined = [...css.matchAll(/^\.((?:t-|ansi-|b[123]\b)[a-z0-9-]*)/gm)].map((match) => match[1]!);
    expect(defined.length).toBeGreaterThan(30);
    expect(defined.filter((name) => !applied.has(name))).toEqual([]);
  });

  test('every other token reaches a surface or the stylesheet', () => {
    const unused = Object.keys(tokens)
      .filter((name) => !name.startsWith('--a-violet'))
      .filter((name) => !used.has(name));
    expect(unused).toEqual([]);
  });
});

describe('the lab never hard-codes a colour', () => {
  const sources = ['.', 'render'].flatMap((dir) =>
    readdirSync(new URL(`../src/${dir}`, import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => `src/${dir === '.' ? '' : `${dir}/`}${entry.name}`),
  );

  test.each(sources)('%s contains no hex literal', (path) => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    expect(source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });

  test('the stylesheet contains no hex literal', () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});

// The lab is the only place a reviewer sees these mappings before installing anything, so
// a lab that renders a conflict in a different colour from the extension is a false
// picture. This pins each demonstrated state to the key the extension actually ships.
describe('the lab demonstrates the mappings the extension ships', () => {
  const theme = JSON.parse(
    readFileSync(new URL('../../../packages/vscode/themes/aion.json', import.meta.url), 'utf8'),
  ) as { colors: Record<string, string> };

  const GIT_KEY: Record<string, string> = {
    untracked: 'gitDecoration.untrackedResourceForeground',
    modified: 'gitDecoration.modifiedResourceForeground',
    conflict: 'gitDecoration.conflictingResourceForeground',
    deleted: 'gitDecoration.deletedResourceForeground',
  };

  const gitStates = [...new Set(
    [...html.matchAll(/class="tree-row[^"]*\bis-(\w+)/g)].map((match) => match[1]!),
  )].filter((state) => state !== 'folder' && state !== 'active');

  test('every Git state the tree renders is a state the extension maps', () => {
    expect(gitStates.length).toBeGreaterThan(2);
    expect(gitStates.filter((state) => GIT_KEY[state] === undefined)).toEqual([]);
  });

  test.each(gitStates)('the %s row matches its gitDecoration key', (state) => {
    const value = tokens[declaration(`.tree-row.is-${state} .tree-label`, 'color')];
    expect(theme.colors[GIT_KEY[state]!], GIT_KEY[state]).toBe(value);
  });

  // Conflict and deleted share coral. Nothing but the badge letter tells them apart, so
  // the lab has to show both, and they have to differ.
  // The lab drew the selection over the diff wash while VS Code draws it under. Nothing in
  // a screenshot catches that; the order is what makes a selection visible on a diff line.
  // findWidget.ts applies each find-match foreground key to the other one's decoration, so
  // the extension sets neither. A lab that recoloured the text would show a match nobody
  // gets.
  test('a find match keeps the syntax colour under it', () => {
    for (const key of ['editor.findMatchForeground', 'editor.findMatchHighlightForeground']) {
      expect(theme.colors[key], key).toBeUndefined();
    }
    for (const selector of ['.t-find-other', '.t-find-current']) {
      const block = css.match(new RegExp(`(?:^|\\n)\\${selector}\\s*\\{([^}]*)\\}`));
      expect(block, `${selector} is not in the stylesheet`).not.toBeNull();
      expect(block![1]!, `${selector} recolours the text`).not.toContain('color:');
    }
  });

  test('a diff wash is the top layer of a selected word, not the selection', () => {
    for (const side of ['added', 'removed']) {
      const block = css.match(new RegExp(`\\.code-row\\.is-${side} \\.t-selected\\s*\\{([^}]*)\\}`));
      expect(block, `${side} has no selected-word rule`).not.toBeNull();
      const layers = [...block![1]!.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]!);
      expect(layers[0], `${side} paints the wash under the selection`).toBe(`--o-${side}-line`);
      expect(layers).toContain('--o-selection');
    }
  });

  test('two Git states that share a colour are separated by their badge', () => {
    expect(theme.colors['gitDecoration.conflictingResourceForeground'])
      .toBe(theme.colors['gitDecoration.deletedResourceForeground']);
    expect(html).toContain('>C<');
    expect(html).toContain('>D<');
  });

  const pairs: [string, string, string][] = [
    ['.activity-item.is-active', 'color', 'activityBar.foreground'],
    ['.code-line.is-current', 'background', 'editor.lineHighlightBackground'],
    ['.t-selected', 'background', 'editor.selectionBackground'],
    ['.t-word-highlight', 'background', 'editor.wordHighlightBackground'],
    ['.t-find-other', 'background', 'editor.findMatchHighlightBackground'],
    ['.t-find-current', 'background', 'editor.findMatchBackground'],
    ['.code-row.is-added', 'background', 'diffEditor.insertedLineBackground'],
    ['.code-row.is-removed', 'background', 'diffEditor.removedLineBackground'],
    ['.code-row.is-added .diff-word', 'background', 'diffEditor.insertedTextBackground'],
    ['.code-row.is-removed .diff-word', 'background', 'diffEditor.removedTextBackground'],
    ['.code-row.is-added .code-gutter', 'background', 'diffEditorGutter.insertedLineBackground'],
    ['.code-row.is-removed .code-gutter', 'background', 'diffEditorGutter.removedLineBackground'],
    ['.code-row.is-added .t-selected', 'background', 'diffEditor.insertedLineBackground'],
    ['.code-row.is-removed .t-selected', 'background', 'diffEditor.removedLineBackground'],
  ];

  test.each(pairs)('%s %s matches %s', (selector, property, key) => {
    const value = tokens[declaration(selector, property)];
    expect(value, `${selector} has no emitted value`).toBeDefined();
    expect(theme.colors[key], key).toBe(value);
  });

  // The lab once drew a 1px outline round a changed word in a diff, from a key the
  // extension has since dropped. It looked neat here because the sample marks one word;
  // VS Code marks a whole inserted line as one changed range and drew a box round every
  // line. A token rule that paints an edge has to name the key that pays for it.
  test('no token rule paints an edge the extension does not ship', () => {
    const edges = [...css.matchAll(/^\.(t-[a-z0-9-]+)\s*\{([^}]*)\}/gm)]
      .filter(([, , body]) => /(?:^|;)\s*(?:box-shadow|outline|border)\s*:/.test(body!))
      .map(([, name]) => name!);
    const paid = new Set<string>();
    expect(edges.filter((name) => !paid.has(name)),
      `these paint an edge with no extension key behind them: ${edges.join(', ')}`).toEqual([]);
  });

  // VS Code applies `editor.selectionForeground` only in the high contrast themes, so a
  // lab that recolours selected text shows a legibility the extension does not deliver.
  test('selected and highlighted code keep their syntax colour', () => {
    for (const selector of ['.t-selected', '.t-word-highlight']) {
      const block = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))![1]!;
      expect(block, selector).not.toContain('color:');
    }
    expect(theme.colors['editor.selectionForeground']).toBeUndefined();
  });
});

describe('the lab demonstrates the mappings Aion Light ships', () => {
  const lightTheme = JSON.parse(
    readFileSync(new URL('../../../packages/vscode/themes/aion-light.json', import.meta.url), 'utf8'),
  ) as {
    colors: Record<string, string>;
    tokenColors: { name: string; settings: { foreground?: string } }[];
  };
  const lightTokens = variables(buildLightPalette());

  const GIT_KEY: Record<string, string> = {
    untracked: 'gitDecoration.untrackedResourceForeground',
    modified: 'gitDecoration.modifiedResourceForeground',
    conflict: 'gitDecoration.conflictingResourceForeground',
    deleted: 'gitDecoration.deletedResourceForeground',
  };

  const gitStates = [...new Set(
    [...html.matchAll(/class="tree-row[^"]*\bis-(\w+)/g)].map((match) => match[1]!),
  )].filter((state) => state !== 'folder' && state !== 'active');

  test.each(gitStates)('the %s row matches its gitDecoration key in Aion Light', (state) => {
    const value = lightTokens[declaration(`.tree-row.is-${state} .tree-label`, 'color')];
    expect(lightTheme.colors[GIT_KEY[state]!], GIT_KEY[state]).toBe(value);
  });

  const pairs: [string, string, string][] = [
    ['.activity-item.is-active', 'color', 'activityBar.foreground'],
    ['.code-line.is-current', 'background', 'editor.lineHighlightBackground'],
    ['.t-selected', 'background', 'editor.selectionBackground'],
    ['.t-word-highlight', 'background', 'editor.wordHighlightBackground'],
    ['.t-find-other', 'background', 'editor.findMatchHighlightBackground'],
    ['.t-find-current', 'background', 'editor.findMatchBackground'],
    ['.code-row.is-added', 'background', 'diffEditor.insertedLineBackground'],
    ['.code-row.is-removed', 'background', 'diffEditor.removedLineBackground'],
    ['.code-row.is-added .diff-word', 'background', 'diffEditor.insertedTextBackground'],
    ['.code-row.is-removed .diff-word', 'background', 'diffEditor.removedTextBackground'],
    ['.code-row.is-added .code-gutter', 'background', 'diffEditorGutter.insertedLineBackground'],
    ['.code-row.is-removed .code-gutter', 'background', 'diffEditorGutter.removedLineBackground'],
    ['.code-row.is-added .t-selected', 'background', 'diffEditor.insertedLineBackground'],
    ['.code-row.is-removed .t-selected', 'background', 'diffEditor.removedLineBackground'],
  ];

  test.each(pairs)('%s %s matches %s in Aion Light', (selector, property, key) => {
    const value = lightTokens[declaration(selector, property)];
    expect(value, `${selector} has no emitted value`).toBeDefined();
    expect(lightTheme.colors[key], key).toBe(value);
  });

  test('bracket pairs match editorBracketHighlight in Aion Light', () => {
    for (let i = 1; i <= 3; i += 1) {
      const key = `editorBracketHighlight.foreground${i}`;
      expect(lightTheme.colors[key], key).toBe(lightTokens[`--bracket-${i}`]);
    }
  });

  test('ANSI slots match terminal.ansi keys in Aion Light', () => {
    for (const slot of ANSI_ORDER) {
      const pascal = slot[0]!.toUpperCase() + slot.slice(1);
      const key = `terminal.ansi${pascal}`;
      const varName = `--ansi-${kebab(slot)}`;
      expect(lightTheme.colors[key], key).toBe(lightTokens[varName]);
    }
  });

  const syntaxRoles: [string, string][] = [
    ['Keyword and storage', '--s-keyword'],
    ['Function and method', '--s-function'],
    ['Type and class', '--s-type'],
    ['String', '--s-string'],
    ['Number and constant', '--s-number'],
    ['Variable, property, parameter', '--s-variable'],
    ['Operator and escape', '--s-operator'],
    ['Comment', '--s-comment'],
    ['Punctuation', '--s-punctuation'],
  ];

  test.each(syntaxRoles)('%s matches %s in Aion Light', (ruleName, varName) => {
    const rule = lightTheme.tokenColors.find((r) => r.name === ruleName);
    expect(rule, `${ruleName} rule missing in aion-light.json`).toBeDefined();
    expect(rule!.settings.foreground, ruleName).toBe(lightTokens[varName]);
  });

  test('terminal surface copy distinguishes standalone dark from integrated light', () => {
    const term = SURFACES.find((s) => s.id === 'terminal')!;
    expect(term.title).toBe('Terminal');
    expect(term.note).toContain('Dark previews the standalone Windows Terminal fragment');
    expect(term.note).toContain("Light previews Aion Light's integrated-terminal palette");
    expect(term.note).toContain('standalone Windows Terminal ships in dark only');
  });
});

// A number the lab renders next to a colour reads as a measurement. These come from the
// same `checks()` the build gate runs, so a palette change moves them; anything the lab
// invents to fill a mock UI says SAMPLE instead.
describe('the live readout', () => {
  // Finding 11: the readout checked each syntax colour against the plain editor alone, so
  // a comment at lightness 0.600 read 4.62:1 there and the lab said ALL CLEAR while the
  // same colour failed on a selected word inside an added diff line.
  test('measures every reading state, not the plain editor alone', () => {
    const palette = buildPalette({ commentLightness: 0.600 });
    const comment = readoutRows(palette, 'dark').find((row) => row.label === 'comment')!;
    expect(contrastEmitted(palette.comment, palette.neutral.editor)).toBeGreaterThan(CONTRAST_FLOOR);
    expect(comment.ratio).toBeLessThan(CONTRAST_FLOOR);
    expect(comment.against).toContain('selection');
  });

  test('the shipped palette is all clear', () => {
    const failing = readoutRows(buildPalette(), 'dark').filter((row) => row.ratio < row.floor);
    expect(failing.map((row) => `${row.label} on ${row.against}`)).toEqual([]);
  });

  test('it reads the reading states rather than a second list of its own', () => {
    const palette = buildPalette();
    const names = new Set(readingStates(palette).map((state) => state.name));
    const covered = readoutRows(palette, 'dark').filter((row) => names.has(row.against));
    expect(covered.length).toBeGreaterThanOrEqual(Object.keys(readingForegrounds(palette)).length - 2);
  });

  test('the shipped light palette is all clear', () => {
    const failing = readoutRows(buildLightPalette(), 'light').filter((row) => row.ratio < row.floor);
    expect(failing.map((row) => `${row.label} on ${row.against}`)).toEqual([]);
  });

  test('a deliberately failing light adjustment is reported', () => {
    const lightFailing = readoutRows(buildLightPalette({ commentLightness: 0.600 }), 'light');
    const comment = lightFailing.find((row) => row.label === 'comment')!;
    expect(comment.ratio).toBeLessThan(CONTRAST_FLOOR);
    expect(comment.against).toContain('removedWord');
  });

  test('reports a light accent that fails on the input surface', () => {
    const adjusted = readoutRows(buildLightPalette({ accentLightness: 0.02 }), 'light');
    const accentFailure = adjusted.find((row) =>
      row.label.startsWith('accent ') && row.ratio < row.floor);
    expect(accentFailure?.against).toBe('input');
  });

  test('renderReadout clearly identifies active scheme and reflects failures', () => {
    const div = { innerHTML: '' } as unknown as HTMLElement;
    renderReadout(div, buildPalette(), 'dark');
    expect(div.innerHTML).toContain('Contrast (Dark)');
    expect(div.innerHTML).toContain('all clear');

    renderReadout(div, buildLightPalette(), 'light');
    expect(div.innerHTML).toContain('Contrast (Light)');
    expect(div.innerHTML).toContain('all clear');

    renderReadout(div, buildLightPalette({ commentLightness: 0.600 }), 'light');
    expect(div.innerHTML).toContain('Contrast (Light)');
    expect(div.innerHTML).toContain('1 below the floor');
    expect(div.innerHTML).toContain('is-fail');
  });
});

describe('the lab state controller and scheme switching', () => {
  test('initializes with dark scheme and shipped dark defaults', () => {
    const controller = createLabController();
    expect(controller.getActiveScheme()).toBe('dark');
    expect(controller.getActiveOptions()).toEqual(PREVIEW_DEFAULTS);
    expect(controller.getActivePalette()).toEqual(buildPalette());
  });

  test('slider adjustments in dark affect dark options only and preserve light defaults', () => {
    const controller = createLabController();
    controller.setControl('baseHue', 180);
    expect(controller.getActiveOptions().baseHue).toBe(180);
    expect(controller.getState().options.dark.baseHue).toBe(180);
    expect(controller.getState().options.light.baseHue).toBe(LIGHT_PREVIEW_DEFAULTS.baseHue);
  });

  test('switching to light activates light palette and preserves unsaved dark exploration', () => {
    const controller = createLabController();
    controller.setControl('baseHue', 180);
    controller.setScheme('light');
    expect(controller.getActiveScheme()).toBe('light');
    expect(controller.getActiveOptions()).toEqual(LIGHT_PREVIEW_DEFAULTS);
    expect(controller.getActivePalette()).toEqual(buildLightPalette());
    expect(controller.getState().options.dark.baseHue).toBe(180);
  });

  test('slider adjustments in light affect light options only and preserve dark edits', () => {
    const controller = createLabController();
    controller.setControl('baseHue', 180);
    controller.setScheme('light');
    controller.setControl('accentChroma', 1.3);
    expect(controller.getActiveOptions().accentChroma).toBe(1.3);
    expect(controller.getState().options.light.accentChroma).toBe(1.3);
    expect(controller.getState().options.dark.baseHue).toBe(180);
    expect(controller.getState().options.dark.accentChroma).toBe(PREVIEW_DEFAULTS.accentChroma);
  });

  test('switching back to dark restores unsaved dark exploration and preserves light edits', () => {
    const controller = createLabController();
    controller.setControl('baseHue', 180);
    controller.setScheme('light');
    controller.setControl('accentChroma', 1.3);
    controller.setScheme('dark');
    expect(controller.getActiveScheme()).toBe('dark');
    expect(controller.getActiveOptions().baseHue).toBe(180);
    expect(controller.getState().options.light.accentChroma).toBe(1.3);
  });

  test('reset active restores only active shipped defaults', () => {
    const controller = createLabController();
    controller.setControl('baseHue', 180);
    controller.setScheme('light');
    controller.setControl('accentChroma', 1.3);

    controller.setScheme('dark');
    controller.resetActive();
    expect(controller.getActiveOptions().baseHue).toBe(PREVIEW_DEFAULTS.baseHue);
    expect(controller.getState().options.light.accentChroma).toBe(1.3);

    controller.setScheme('light');
    expect(controller.getActiveOptions().accentChroma).toBe(1.3);
    controller.resetActive();
    expect(controller.getActiveOptions().accentChroma).toBe(LIGHT_PREVIEW_DEFAULTS.accentChroma);
  });

  test('controller notifies subscribers on state transitions', () => {
    const controller = createLabController();
    let calls = 0;
    const unsub = controller.subscribe((state, palette) => {
      calls += 1;
      expect(state.activeScheme).toBeDefined();
      expect(palette.neutral).toBeDefined();
    });

    controller.setControl('baseHue', 200);
    expect(calls).toBe(1);
    controller.setScheme('light');
    expect(calls).toBe(2);
    controller.resetActive();
    expect(calls).toBe(3);

    unsub();
    controller.setControl('baseHue', 220);
    expect(calls).toBe(3);
  });
});

describe('the figures the lab quotes', () => {
  test('every ratio on a surface is one the gate produced', () => {
    const quoted = [...html.matchAll(/(\d+\.\d+):1/g)].map((match) => match[0]);
    expect(quoted.length).toBeGreaterThan(2);
    const produced = new Set([
      ...Object.values(figures).map(String),
      ...checks().map((row) => `${row.ratio.toFixed(2)}:1`),
    ]);
    expect(quoted.filter((value) => !produced.has(value))).toEqual([]);
  });

  // Finding 14: the dashboard hardcoded a token count, four deltas, twelve chart bars, a
  // claim about releases since 0.0.9, and a Pairs table with a failing row no run produced.
  test('the dashboard quotes no number the gate did not produce', () => {
    const dashboard = SURFACES.find((surface) => surface.id === 'dashboard')!.html();
    for (const row of tightest) {
      expect(dashboard, row.token).toContain(row.token);
      expect(dashboard, `${row.token} ratio`).toContain(row.ratio.toFixed(2));
    }
    expect(dashboard).toContain(String(figures.gated));
    expect(dashboard).not.toContain('0.0.9');
    // Every cell of the Pairs table is a row of the gate, so none of them can be a failure.
    expect(tightest.every((row) => row.state === 'pass')).toBe(true);
  });

  test('the counts match the gate, not a transcribed number', () => {
    const rows = checks();
    expect(figures.gated).toBe(rows.length);
    expect(figures.failed).toBe(0);
    expect(figures.exempt).toBe(rows.filter((row) => row.state === 'exempt').length);
    expect(html).toContain(String(figures.readingStates));
  });

  test('every invented figure is labelled', () => {
    const invented = [...html.matchAll(/SAMPLE[^<]*/g)];
    expect(invented.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('sample-tag');
  });
});

describe('accessible scheme switch and single-render invariant', () => {
  test('data-theme and color-scheme rules exist in stylesheet', () => {
    expect(css).toContain(":root[data-theme='light']");
    expect(css).toContain(":root[data-theme='dark']");
    expect(css).toContain('color-scheme: light;');
    expect(css).toContain('color-scheme: dark;');
  });

  test('focus-visible and reduced motion styles are defined', () => {
    expect(css).toContain('.scheme-option input:focus-visible');
    expect(css).toContain('.rail button:focus-visible');
    expect(css).toContain(".control input[type='range']:focus-visible");
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('responsive mobile layout is supported', () => {
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('@media (max-width: 1180px)');
  });

  test('single-render invariant: light and dark emit identical custom property sets', () => {
    const darkKeys = Object.keys(tokens).sort();
    const lightKeys = Object.keys(variables(buildLightPalette())).sort();
    expect(lightKeys).toEqual(darkKeys);
    expect(lightKeys.length).toBe(90);
  });

  test('status surfaces use scheme-specific status roles', () => {
    for (const [name, palette] of [['dark', buildPalette()], ['light', buildLightPalette()]] as const) {
      const gap = palette.statuses.success.solid[0] - palette.statuses.error.solid[0];
      expect(gap, `${name} status gap`).toBeGreaterThanOrEqual(MEANING_PAIR_GAP);
      const values = variables(palette);
      for (const role of ['text', 'subtle', 'border'] as const) {
        expect(css, `${name} ${role}`).toContain(`var(--status-success-${role})`);
        expect(css, `${name} ${role}`).toContain(`var(--status-error-${role})`);
        expect(values[`--status-success-${role}`]).toBeDefined();
        expect(values[`--status-error-${role}`]).toBeDefined();
      }
    }
  });
});
