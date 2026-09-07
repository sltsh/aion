import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dark, light } from '@sltsh/aion-css';
import { checks, flatten, readingStates, semantic, semanticLight, accentScale, neutral, contrastEmitted } from '@sltsh/aion-tokens';
import { FLAGS } from '../src/flags.js';
import { escapeAttr, escapeHtml } from '../src/render/html.js';
import { landing, palette } from '../src/render/index.js';
import { ANSI_SLOTS, GROUP_IDS, colourBlock, essentials, groups } from '../src/groups.js';
import { INSTALL, UNRELEASED_NOTE } from '../src/content.js';
import { gateSummary } from '../src/gate.js';
import { renderHero } from '../src/samples/hero.js';
import { swatch } from '../src/render/swatch.js';

const root = fileURLToPath(new URL('..', import.meta.url));

it('ships the release and light flags off', () => {
  expect(FLAGS).toEqual({ released: false, lightVisible: false });
});

it('escapes text and copy attributes', () => {
  expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href="x"&gt;&amp;&lt;/a&gt;');
  expect(escapeAttr('a "b"\nc')).toBe('a &quot;b&quot;&#10;c');
});

describe('curated colours', () => {
  it('shows foundations, the main colours and terminal slots once each', () => {
    expect(groups().map((group) => group.id)).toEqual([...GROUP_IDS]);
    expect(groups().map((group) => group.swatches.length)).toEqual([4, 7, 16]);
    const variables = groups().flatMap((group) => group.swatches.map((row) => row.variable));
    expect(new Set(variables).size).toBe(variables.length);
    expect(variables.some((name) => /status|overlay|diff|subtle/.test(name))).toBe(false);
  });

  it('gets every displayed value from its named CSS token in both schemes', () => {
    for (const group of groups()) {
      for (const row of group.swatches) {
        expect(row.dark).toBe(dark()[row.variable]);
        expect(row.light).toBe(light()[row.variable]);
        expect(row.label.length).toBeGreaterThan(0);
        expect(row.role.length).toBeGreaterThan(0);
      }
    }
  });

  it('uses the same essentials on the homepage and palette', () => {
    expect(essentials()).toEqual(groups().filter((group) => group.id !== 'terminal').flatMap((group) => group.swatches));
    for (const row of essentials()) expect(landing(FLAGS)).toContain(swatch(row, FLAGS));
  });

  it('keeps the complete ANSI set in slot order', () => {
    const terminal = groups().find((group) => group.id === 'terminal');
    expect(terminal?.swatches.map((row) => row.variable)).toEqual(ANSI_SLOTS.map((name) => `--aion-ansi-${name}`));
    expect(terminal?.swatches.map((row) => row.variable).sort()).toEqual(Object.keys(dark()).filter((name) => name.startsWith('--aion-ansi-')).sort());
    expect(palette(FLAGS)).toContain('applications using it as foreground text may be hard to read');
  });

  it('copies the same named values it displays', () => {
    for (const group of groups()) {
      for (const scheme of ['dark', 'light'] as const) {
        expect(colourBlock(group.swatches, scheme).split('\n')).toEqual(group.swatches.map((row) => `${row.label}: ${row[scheme]}`));
      }
      for (const row of group.swatches) {
        const html = swatch(row, FLAGS);
        expect(html).toContain(`aria-label="Copy ${row.label}"`);
        expect(html).toContain(`data-dark="${row.dark}"`);
      }
    }
  });
});

describe('the presentation pages', () => {
  it('uses one hero lockup and a standalone header logo', () => {
    expect(landing(FLAGS).match(/aion-lockup-horizontal/g)).toHaveLength(1);
    expect(landing(FLAGS).split('</header>')[0]).not.toContain('aion-wordmark');
    expect(landing(FLAGS)).toContain('src="/icon.png"');
  });

  it('replaces the manual inventory with essentials and a palette link', () => {
    const html = landing(FLAGS);
    expect(html).not.toContain('Selection, opaque');
    expect(html).not.toContain('Any other app');
    expect(html).toContain('id="essentials"');
    expect(html).toContain('id="manual"');
    expect(html).toContain('class="palette-link"');
  });

  it('offers essentials before the detailed colours without engineering tables', () => {
    const html = palette(FLAGS);
    expect(html.match(/class="swatch"/g)).toHaveLength(essentials().length + groups().flatMap((group) => group.swatches).length);
    expect(html).not.toContain('<table');
    expect(html).not.toContain('status-error-subtle');
    for (const group of groups()) {
      expect(html).toContain(escapeHtml(group.description));
      for (const row of group.swatches) expect(html).toContain(swatch(row, FLAGS));
    }
    expect(html).toContain('CSS &amp; token reference');
  });

  it('provides active page and section navigation with matching targets', () => {
    expect(palette(FLAGS)).toContain('href="#content" aria-current="page"');
    for (const [html, ids] of [[landing(FLAGS), ['overview', 'essentials', 'install']], [palette(FLAGS), ['essentials', ...GROUP_IDS]]] as const) {
      for (const id of ids) {
        expect(html).toContain(`data-section="${id}"`);
        expect(html).toContain(`id="${id}"`);
      }
      expect(html).toContain('aria-label="Main navigation"');
      expect(html).toContain('aria-label="Footer navigation"');
      expect(html).toContain('role="status"');
    }
  });

  it('uses local anchors for the homepage and a labelled GitHub icon', () => {
    const html = landing(FLAGS);
    expect(html).toContain('class="mark" href="#overview"');
    for (const id of ['overview', 'essentials', 'install']) expect(html).toContain(`href="#${id}" data-section="${id}"`);
    expect(html).toContain('aria-label="Aion on GitHub"');
    expect(html).toContain('https://marketplace.visualstudio.com/items?itemName=sltsh.aion-theme');
    expect(html).not.toContain('npm run pack:dev');
  });

  it('retains the code preview and excludes rivals and overlays', () => {
    expect(landing(FLAGS)).toContain(renderHero());
    for (const role of ['keyword', 'function', 'type', 'string', 'number', 'comment']) expect(renderHero()).toContain(`t-${role}`);
    for (const text of ['one dark', 'ayu', 'nord', 'catppuccin', 'is-added', 'is-removed', 't-selected']) expect(landing(FLAGS).toLowerCase()).not.toContain(text);
  });
});

describe('installation', () => {
  for (const released of [false, true]) {
    it(`copies usable commands with released=${released}`, () => {
      const html = landing({ released, lightVisible: false });
      for (const entry of INSTALL) {
        const command = released || entry.id === 'vscode' ? entry.command : entry.localCommand;
        expect(html).toContain(escapeHtml(entry.label));
        expect(html).toContain(`data-text="${escapeAttr(command)}"`);
        expect(html).toContain(`<code>${escapeHtml(command)}</code>`);
      }
      expect(html.includes(escapeHtml(UNRELEASED_NOTE))).toBe(!released);
      expect(html).toContain('href="/downloads/aion.json" download="aion.json"');
    });
  }
});

describe('the hidden light scheme', () => {
  it('excludes the light values when disabled', () => {
    const html = palette(FLAGS);
    const darkValues = new Set(Object.values(dark()));
    expect(html).not.toContain('data-scheme-toggle');
    for (const value of Object.values(light()).filter((value) => !darkValues.has(value))) expect(html).not.toContain(value);
  });

  it('includes matching copy targets and values for every curated colour when enabled', () => {
    const html = palette({ released: false, lightVisible: true });
    expect(html).toContain('data-scheme-toggle');
    for (const group of groups()) {
      for (const row of group.swatches) expect(html).toContain(`data-light="${row.light}"`);
      expect(html).toContain(`data-light="${escapeAttr(colourBlock(group.swatches, 'light'))}"`);
    }
  });
});

describe('contrast and claims', () => {
  it('derives the published figures from the gate', () => {
    const rows = checks();
    const summary = gateSummary();
    expect(summary.rowsMeasured).toBe(rows.length);
    expect(summary.belowFloor).toBe(rows.filter((row) => row.state === 'fail').length);
    expect(summary.readingStates).toBe(readingStates().length);
    const decorated = rows.filter((row) => row.section === 'decorated' && row.state === 'pass');
    expect(summary.lowestDecorated).toBe(Math.min(...decorated.map((row) => row.ratio)).toFixed(2));
    expect(landing(FLAGS)).toContain(String(summary.rowsMeasured));
    expect(landing(FLAGS)).toContain(summary.lowestDecorated);
  });

  it('keeps teal and gold text readable on their actual website surfaces', () => {
    for (const name of ['teal', 'gold'] as const) {
      const accent = accentScale(name);
      for (const surface of [neutral.editor, neutral.terminal, neutral.widget, accent.subtle]) {
        expect(contrastEmitted(accent.solid, surface), `${name} on website surface`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

it('builds complete HTML and ships the exact generated terminal download', () => {
  execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'pipe' });
  for (const [filename, html] of [['index', landing(FLAGS)], ['palette', palette(FLAGS)]]) {
    const built = readFileSync(`${root}dist/${filename}.html`, 'utf8');
    expect(built).toContain(html);
    expect(built).not.toContain('@aion:');
  }
  expect(readFileSync(`${root}dist/downloads/aion.json`, 'utf8')).toBe(readFileSync(`${root}../../packages/terminal/fragments/aion.json`, 'utf8'));
}, 60_000);

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
