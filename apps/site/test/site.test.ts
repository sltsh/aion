import { describe, expect, it } from 'vitest';
import { FLAGS } from '../src/flags.js';
import { escapeAttr, escapeHtml } from '../src/render/html.js';
import { landing, palette } from '../src/render/index.js';

describe('the render entry points', () => {
  it('returns a string for each page', () => {
    expect(typeof landing(FLAGS)).toBe('string');
    expect(typeof palette(FLAGS)).toBe('string');
  });

  it('ships both flags off', () => {
    expect(FLAGS.released).toBe(false);
    expect(FLAGS.lightVisible).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes the three characters that break markup', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href="x"&gt;&amp;&lt;/a&gt;');
  });

  it('escapes the quote and the newline an attribute cannot carry', () => {
    expect(escapeAttr('a "b"\nc')).toBe('a &quot;b&quot;&#10;c');
  });
});

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('the build', () => {
  it('substitutes the rendered body into both pages', () => {
    execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'pipe' });
    const index = readFileSync(`${root}dist/index.html`, 'utf8');
    const palettePage = readFileSync(`${root}dist/palette.html`, 'utf8');
    expect(index).toContain(landing(FLAGS));
    expect(palettePage).toContain(palette(FLAGS));
    expect(index).not.toContain('@aion:');
    expect(palettePage).not.toContain('@aion:');
  }, 60_000);
});

import { dark, light } from '@sltsh/aion-css';
import { GROUP_IDS, groupOf, groups } from '../src/groups.js';

describe('the variable groups', () => {
  it('assigns every emitted variable to a group', () => {
    for (const variable of Object.keys(dark())) {
      expect(groupOf(variable), variable).toBeDefined();
    }
  });

  it('shows every emitted variable exactly once', () => {
    const shown = groups().flatMap((group) => group.swatches.map((s) => s.variable));
    expect(shown.slice().sort()).toEqual(Object.keys(dark()).sort());
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('leaves no group empty', () => {
    for (const group of groups()) expect(group.swatches.length, group.id).toBeGreaterThan(0);
  });

  it('carries both schemes on every swatch', () => {
    const l = light();
    for (const group of groups()) {
      for (const s of group.swatches) {
        expect(s.dark, s.variable).toBe(dark()[s.variable]);
        expect(s.light, s.variable).toBe(l[s.variable]);
      }
    }
  });

  it('orders the groups as the page reads them', () => {
    expect(groups().map((g) => g.id)).toEqual([...GROUP_IDS]);
  });
});

import { ACCENT_NAMES, NEUTRAL_LIGHTNESS, hex, neutral } from '@sltsh/aion-tokens';
import { swatch, swatchGrid } from '../src/render/swatch.js';
import { accentRows, rampRows, renderAccents, renderRamp } from '../src/tables.js';

describe('a swatch', () => {
  it('carries the name, the value and a copy target', () => {
    const html = swatch({ variable: '--aion-bg-page', dark: '#11151c', light: '#fafcfe' }, FLAGS);
    expect(html).toContain('--aion-bg-page');
    expect(html).toContain('data-dark="#11151c"');
    expect(html).toContain('data-copy');
  });

  it('renders one swatch per variable in a group', () => {
    const group = groups()[0];
    if (group === undefined) throw new Error('no first group');
    const html = swatchGrid(group, FLAGS);
    for (const s of group.swatches) expect(html).toContain(s.variable);
  });
});

describe('the neutral ramp table', () => {
  it('holds every step of the ramp, each with a role', () => {
    expect(rampRows()).toHaveLength(Object.keys(NEUTRAL_LIGHTNESS).length);
    for (const row of rampRows()) expect(row.role.length, String(row.step)).toBeGreaterThan(0);
  });

  it('names the authored lightness, not one recovered from the hex', () => {
    const authored = Object.values(NEUTRAL_LIGHTNESS);
    for (const row of rampRows()) {
      const value = authored[row.step - 1];
      if (value === undefined) throw new Error(`no lightness for step ${row.step}`);
      expect(row.lightness, String(row.step)).toBe(value.toFixed(3));
    }
  });

  it('marks the one step the CSS layer does not emit', () => {
    const sidebar = rampRows().find((r) => r.hex === hex(neutral.sidebar));
    expect(sidebar?.variable).toBeUndefined();
    for (const row of rampRows().filter((r) => r.hex !== hex(neutral.sidebar))) {
      expect(row.variable, row.role).toBeDefined();
    }
  });

  it('says so on the page', () => {
    expect(renderRamp()).toContain('VS Code only');
  });
});

describe('the accent table', () => {
  it('holds every accent with its authored hue', () => {
    expect(accentRows().map((r) => r.name)).toEqual([...ACCENT_NAMES]);
    for (const row of accentRows()) expect(renderAccents()).toContain(`${row.hue}°`);
  });
});

import { checks, flatten, readingStates, semantic, semanticLight } from '@sltsh/aion-tokens';
import { CONVENTIONS, INSTALL, UNRELEASED_NOTE } from '../src/content.js';
import { gateSummary } from '../src/gate.js';
import { renderHero } from '../src/samples/hero.js';

describe('the palette page', () => {
  const html = () => palette(FLAGS);

  it('carries a section for every group, in order', () => {
    const positions = GROUP_IDS.map((id) => html().indexOf(`id="${id}"`));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    expect(positions.slice().sort((a, b) => a - b)).toEqual(positions);
  });

  it('states the convention for every group', () => {
    for (const id of GROUP_IDS) {
      expect(CONVENTIONS[id].length, id).toBeGreaterThan(0);
      expect(html()).toContain(escapeHtml(CONVENTIONS[id]));
    }
  });

  it('shows every emitted variable', () => {
    for (const variable of Object.keys(dark())) expect(html()).toContain(variable);
  });

  it('carries the ramp table and the accent table', () => {
    expect(html()).toContain('VS Code only');
    expect(html()).toContain('<table class="accents">');
  });
});

describe('the gate summary', () => {
  it('derives every number from checks(), not from a literal', () => {
    const rows = checks();
    const summary = gateSummary();
    expect(summary.rowsMeasured).toBe(rows.length);
    expect(summary.belowFloor).toBe(rows.filter((r) => r.state === 'fail').length);
    expect(summary.exemptRows).toBe(rows.filter((r) => r.state === 'exempt').length);
    expect(summary.readingStates).toBe(readingStates().length);
    const decorated = rows.filter((r) => r.section === 'decorated' && r.state === 'pass');
    expect(summary.lowestDecorated).toBe(Math.min(...decorated.map((r) => r.ratio)).toFixed(2));
  });

  it('reports no failure, which is the claim the page makes', () => {
    expect(gateSummary().belowFloor).toBe(0);
  });
});

describe('the landing page', () => {
  it('prints the gate numbers it derived', () => {
    const summary = gateSummary();
    expect(landing(FLAGS)).toContain(String(summary.rowsMeasured));
    expect(landing(FLAGS)).toContain(summary.lowestDecorated);
  });

  it('lists every install target', () => {
    for (const entry of INSTALL) expect(landing(FLAGS)).toContain(escapeHtml(entry.label));
  });

  it('carries the unreleased note exactly when released is false', () => {
    expect(landing({ released: false, lightVisible: false })).toContain(escapeHtml(UNRELEASED_NOTE));
    expect(landing({ released: true, lightVisible: false })).not.toContain(escapeHtml(UNRELEASED_NOTE));
  });

  it('names no rival theme', () => {
    const html = landing(FLAGS).toLowerCase();
    for (const rival of ['one dark', 'ayu', 'nord', 'catppuccin']) expect(html, rival).not.toContain(rival);
  });
});

describe('the hero sample', () => {
  it('renders through the lab renderer', () => {
    expect(renderHero()).toContain('class="code"');
    expect(renderHero()).toContain('code-row');
  });

  it('shows every syntax class the palette page documents', () => {
    for (const role of ['keyword', 'function', 'type', 'string', 'number', 'comment']) {
      expect(renderHero(), role).toContain(`t-${role}`);
    }
  });

  it('shows no diff, no selection and no find match', () => {
    for (const noisy of ['is-added', 'is-removed', 't-selected', 't-find-current', 't-find-other']) {
      expect(renderHero(), noisy).not.toContain(noisy);
    }
  });

  it('reaches the landing page', () => {
    expect(landing(FLAGS)).toContain(renderHero());
  });
});

describe('the light flag', () => {
  const onlyLight = () => {
    const d = new Set(Object.values(dark()));
    return [...new Set(Object.values(light()))].filter((value) => !d.has(value));
  };

  it('emits no light value and no toggle when hidden', () => {
    const html = palette({ released: false, lightVisible: false });
    expect(html).not.toContain('data-scheme-toggle');
    for (const value of onlyLight()) expect(html, value).not.toContain(value);
  });

  it('emits every light value and the toggle when shown', () => {
    const html = palette({ released: false, lightVisible: true });
    expect(html).toContain('data-scheme-toggle');
    for (const [variable, value] of Object.entries(light())) {
      expect(html, variable).toContain(value);
    }
  });

  it('shows every variable in both settings', () => {
    for (const lightVisible of [false, true]) {
      const html = palette({ released: false, lightVisible });
      for (const variable of Object.keys(dark())) expect(html, variable).toContain(variable);
    }
  });
});

import { ANSI_SLOTS, ansiBlock, ansiRows, coreBlock, coreRows } from '../src/manual.js';
import { MANUAL_RULES } from '../src/content.js';

describe('the manual setup section', () => {
  it('covers every ANSI slot the CSS package emits, in slot order', () => {
    const emitted = Object.keys(dark()).filter((name) => name.startsWith('--aion-ansi-'));
    expect(ansiRows().map((row) => row.variable).sort()).toEqual(emitted.sort());
    expect(ansiRows().map((row) => row.slot)).toEqual(ANSI_SLOTS.map((_, index) => index));
  });

  it('reads every value from the emitter', () => {
    const values = dark();
    for (const row of [...ansiRows(), ...coreRows()]) {
      expect(row.hex, row.variable).toBe(values[row.variable]);
    }
  });

  it('names a role for every core row and a note that says something', () => {
    expect(coreRows().length).toBeGreaterThan(0);
    for (const row of coreRows()) {
      expect(row.role.length, row.variable).toBeGreaterThan(0);
      expect(row.note.length, row.variable).toBeGreaterThan(0);
    }
  });

  it('puts every value in a copy block', () => {
    for (const row of coreRows()) expect(coreBlock(), row.variable).toContain(row.hex);
    for (const row of ansiRows()) expect(ansiBlock(), row.variable).toContain(row.hex);
  });

  it('reaches the landing page with both blocks and every rule', () => {
    const html = landing(FLAGS);
    expect(html).toContain('id="manual"');
    expect(html).toContain(escapeAttr(coreBlock()));
    expect(html).toContain(escapeAttr(ansiBlock()));
    for (const rule of MANUAL_RULES) expect(html).toContain(escapeHtml(rule));
  });
});

describe('the copy targets', () => {
  const targets = (html: string): number => (html.match(/data-copy\b/g) ?? []).length;

  it('gives every hex in the ramp and the accent table its own button', () => {
    expect(targets(renderRamp())).toBe(rampRows().length);
    expect(targets(renderAccents())).toBe(accentRows().length * 3);
  });

  it('gives every swatch and both copy blocks a target too', () => {
    const swatches = groups().reduce((total, group) => total + group.swatches.length, 0);
    expect(targets(palette(FLAGS))).toBe(
      swatches + rampRows().length + accentRows().length * 3,
    );
    expect(targets(landing(FLAGS))).toBe(2);
  });
});

describe('the site chrome', () => {
  it('puts the same header and footer on both pages', () => {
    for (const html of [landing(FLAGS), palette(FLAGS)]) {
      expect(html).toContain('class="site-head"');
      expect(html).toContain('class="site-foot"');
      expect(html).toContain('href="/palette.html"');
    }
  });

  it('marks the palette link as current only on the palette page', () => {
    expect(palette(FLAGS)).toContain('aria-current="page"');
    expect(landing(FLAGS)).not.toContain('aria-current="page"');
  });

  it('gives the palette page a jump link to every group', () => {
    for (const id of GROUP_IDS) expect(palette(FLAGS), id).toContain(`href="#${id}"`);
  });
});

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] => readdirSync(dir).flatMap((entry) => {
  const full = join(dir, entry);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

describe('the source guards', () => {
  const sources = () => walk(join(root, 'src')).filter((f) => f.endsWith('.ts') || f.endsWith('.css'));

  it('holds no hex literal in any source file', () => {
    expect(sources().length).toBeGreaterThan(0);
    for (const file of sources()) {
      const text = readFileSync(file, 'utf8');
      expect(text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], file).toEqual([]);
    }
  });

  it('reads only variables the CSS package emits or the site declares', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    const emitted = new Set(Object.keys(dark()));
    const declared = new Set(css.match(/--site-[a-z0-9-]+/g) ?? []);
    const read = css.match(/var\((--[a-z0-9-]+)/g) ?? [];
    expect(read.length).toBeGreaterThan(0);
    for (const entry of read) {
      const name = entry.slice(4);
      expect(emitted.has(name) || declared.has(name), name).toBe(true);
    }
  });
});

describe('parity with the emitter', () => {
  it('quotes no hex the packages do not emit', () => {
    // The CSS layer emits 91 values, but the ramp table prints neutral.sidebar, which has
    // no web equivalent. The token package's semantic map is the wider source, and it is
    // what the rule in AGENTS.md means by "a hex the token package does not emit".
    const emitted = new Set(
      [
        ...Object.values(dark()),
        ...Object.values(light()),
        ...Object.values(flatten(semantic)),
        ...Object.values(flatten(semanticLight)),
      ].map((v) => v.toLowerCase()),
    );
    const pages = [
      landing(FLAGS),
      landing({ released: true, lightVisible: false }),
      palette(FLAGS),
      palette({ released: false, lightVisible: true }),
    ];
    let seen = 0;
    for (const page of pages) {
      for (const found of page.match(/#[0-9a-fA-F]{6,8}\b/g) ?? []) {
        seen += 1;
        expect(emitted.has(found.toLowerCase()), found).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
