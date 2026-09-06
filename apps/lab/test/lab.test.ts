import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  ACCENTS, CONTRAST_FLOOR, buildPalette, checks, contrastEmitted, hex, neutral,
  readingForegrounds, readingStates, terminalBackground,
} from '@sltio/aion-tokens';
import { figures, tightest } from '../src/figures.js';
import { readoutRows } from '../src/readout.js';
import { variables } from '../src/variables.js';
import { SURFACES } from '../src/render/index.js';

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

  const declaration = (selector: string, property: string): string => {
    // Anchored at the start of a rule: `.t-selected` is a substring of
    // `.code-row.is-added .t-selected`, and an unanchored match reads the wrong block.
    const block = css.match(new RegExp(`(?:^|\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
    expect(block, `${selector} is not in the stylesheet`).not.toBeNull();
    const found = block![1]!.match(new RegExp(`(?:^|;)\\s*${property}:[^;]*?var\\((--[a-z0-9-]+)\\)`));
    expect(found, `${selector} does not set ${property} from a token`).not.toBeNull();
    return found![1]!;
  };

  // Listing one Git state was how the lab kept rendering an untracked file in green while
  // the extension shipped teal. Every state the tree renders is derived and pinned.
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

// A number the lab renders next to a colour reads as a measurement. These come from the
// same `checks()` the build gate runs, so a palette change moves them; anything the lab
// invents to fill a mock UI says SAMPLE instead.
describe('the live readout', () => {
  // Finding 11: the readout checked each syntax colour against the plain editor alone, so
  // a comment at lightness 0.600 read 4.62:1 there and the lab said ALL CLEAR while the
  // same colour failed on a selected word inside an added diff line.
  test('measures every reading state, not the plain editor alone', () => {
    const palette = buildPalette({ commentLightness: 0.600 });
    const comment = readoutRows(palette).find((row) => row.label === 'comment')!;
    expect(contrastEmitted(palette.comment, palette.neutral.editor)).toBeGreaterThan(CONTRAST_FLOOR);
    expect(comment.ratio).toBeLessThan(CONTRAST_FLOOR);
    expect(comment.against).toContain('selection');
  });

  test('the shipped palette is all clear', () => {
    const failing = readoutRows(buildPalette()).filter((row) => row.ratio < row.floor);
    expect(failing.map((row) => `${row.label} on ${row.against}`)).toEqual([]);
  });

  test('it reads the reading states rather than a second list of its own', () => {
    const palette = buildPalette();
    const names = new Set(readingStates(palette).map((state) => state.name));
    const covered = readoutRows(palette).filter((row) => names.has(row.against));
    expect(covered.length).toBeGreaterThanOrEqual(Object.keys(readingForegrounds(palette)).length - 2);
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
