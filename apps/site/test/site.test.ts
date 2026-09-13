import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dark, light } from '@sltsh/aion-css';
import { checks, flatten, readingStates, semantic, semanticLight, accentScale, neutral, contrastEmitted, hexToOklch } from '@sltsh/aion-tokens';
import { FLAGS } from '../src/flags.js';
import { escapeAttr, escapeHtml } from '../src/render/html.js';
import { landing, palette } from '../src/render/index.js';
import { ANSI_SLOTS, GROUP_IDS, colourBlock, essentials, groups } from '../src/groups.js';
import { INSTALL, UNRELEASED_NOTE } from '../src/content.js';
import { gateSummary } from '../src/gate.js';
import { renderHero } from '../src/samples/hero.js';
import { swatch } from '../src/render/swatch.js';
import { initializeTheme, readTheme, resolveTheme, syncFavicons, THEME_STORAGE_KEY, themeBootstrap } from '../src/theme.js';

const root = fileURLToPath(new URL('..', import.meta.url));

it('ships the release flag off', () => {
  expect(FLAGS).toEqual({ released: false });
});

it('escapes text and copy attributes', () => {
  expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href="x"&gt;&amp;&lt;/a&gt;');
  expect(escapeAttr('a "b"\nc')).toBe('a &quot;b&quot;&#10;c');
});

describe('curated colours', () => {
  it('organizes colours into foundations, accents, interface roles, syntax, and terminal', () => {
    expect(groups().map((group) => group.id)).toEqual([...GROUP_IDS]);
    expect(groups().map((group) => group.swatches.length)).toEqual([13, 21, 5, 11, 16]);
    const variables = groups().flatMap((group) => group.swatches.map((row) => row.variable));
    expect(new Set(variables).size).toBe(variables.length);
    expect(variables.filter((name) => name === '--aion-fg-link')).toHaveLength(1);
    expect(variables.some((name) => /overlay|diff/.test(name))).toBe(false);
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

  it('retains the compact essentials set on the homepage only', () => {
    const rows = essentials();
    expect(rows).toHaveLength(11);
    expect(rows.slice(0, 4).map((row) => [row.label, row.variable])).toEqual([
      ['Background', '--aion-bg-page'],
      ['Surface', '--aion-bg-surface'],
      ['Text', '--aion-fg-primary'],
      ['Secondary text', '--aion-fg-secondary'],
    ]);
    expect(rows.slice(4).map((row) => [row.label, row.role, row.variable])).toEqual([
      ['Gold', 'Primary accent', '--aion-gold-solid'],
      ['Teal', 'Secondary accent', '--aion-teal-solid'],
      ['Coral', 'Errors & variables', '--aion-coral-solid'],
      ['Copper', 'Warnings & numbers', '--aion-copper-solid'],
      ['Green', 'Success & strings', '--aion-green-solid'],
      ['Blue', 'Links & functions', '--aion-blue-solid'],
      ['Violet', 'Keywords & emphasis', '--aion-violet-solid'],
    ]);
    for (const row of rows) expect(landing(FLAGS)).toContain(swatch(row));
    expect(palette()).not.toContain('id="essentials"');
  });

  it('exposes the complete foundation roles needed for hierarchy and controls', () => {
    const foundations = groups().find((group) => group.id === 'foundations');
    expect(foundations).toBeDefined();
    const vars = foundations!.swatches.map((row) => row.variable);
    // Surface ladder
    for (const surface of ['page', 'surface', 'raised', 'input', 'hover']) {
      expect(vars).toContain(`--aion-bg-${surface}`);
    }
    // Text hierarchy
    for (const text of ['primary', 'secondary', 'dim', 'on-accent']) {
      expect(vars).toContain(`--aion-fg-${text}`);
    }
    // Functional border and focus. Link is owned by Interface roles.
    expect(vars).toContain('--aion-border-ui');
    expect(vars).toContain('--aion-border-focus');
    expect(vars).not.toContain('--aion-fg-link');
  });

  it('exposes accents with canonical hue names and solid, subtle, and border variants', () => {
    const accents = groups().find((group) => group.id === 'accents');
    expect(accents).toBeDefined();
    expect(accents!.swatches).toHaveLength(21);
    const hues = ['coral', 'copper', 'gold', 'green', 'teal', 'blue', 'violet'];
    for (const hue of hues) {
      for (const variant of ['solid', 'subtle', 'border']) {
        expect(accents!.swatches.some((row) => row.variable === `--aion-${hue}-${variant}`)).toBe(true);
      }
    }
  });

  it('includes status mappings and makes blue the portable link role while preserving gold site links', () => {
    const iface = groups().find((group) => group.id === 'interface');
    expect(iface).toBeDefined();
    const vars = iface!.swatches.map((row) => row.variable);
    for (const statusName of ['success', 'warning', 'error', 'info']) {
      expect(vars).toContain(`--aion-status-${statusName}-solid`);
    }
    expect(vars).toContain('--aion-fg-link');
    // Marketing site preserves gold links
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.text-link { display: inline-flex; align-items: center; gap: 0.7rem; color: var(--aion-gold-solid);');
  });

  it('includes core syntax roles plus comment and punctuation', () => {
    const syntaxGroup = groups().find((group) => group.id === 'syntax');
    expect(syntaxGroup).toBeDefined();
    const vars = syntaxGroup!.swatches.map((row) => row.variable);
    const expected = [
      'variable', 'number', 'constant', 'type', 'string',
      'operator', 'escape', 'function', 'keyword', 'comment', 'punctuation',
    ];
    for (const role of expected) {
      expect(vars).toContain(`--aion-syntax-${role}`);
    }
  });

  it('keeps the complete ANSI set in slot order', () => {
    const terminal = groups().find((group) => group.id === 'terminal');
    expect(terminal?.swatches.map((row) => row.variable)).toEqual(ANSI_SLOTS.map((name) => `--aion-ansi-${name}`));
    expect(terminal?.swatches.map((row) => row.variable).sort()).toEqual(Object.keys(dark()).filter((name) => name.startsWith('--aion-ansi-')).sort());
    expect(palette()).toContain('data-theme-value="dark">ANSI black (slot 0) is intended as a background');
    expect(palette()).toContain('data-theme-value="light">In the light scheme, ANSI black (slot 0) is intended as foreground text');
  });

  it('copies the same named values it displays', () => {
    for (const group of groups()) {
      for (const scheme of ['dark', 'light'] as const) {
        expect(colourBlock(group.swatches, scheme).split('\n')).toEqual(group.swatches.map((row) => `${row.label}: ${row[scheme]}`));
      }
      for (const row of group.swatches) {
        const html = swatch(row);
        expect(html).toContain(`aria-label="Copy ${row.label}"`);
        expect(html).toContain(`data-dark="${row.dark}"`);
        expect(html).toContain('class="swatch-check"');
      }
    }
  });

  it('confirms successful copies in place and reserves the toast for errors', () => {
    const client = readFileSync(join(root, 'src/main.ts'), 'utf8');
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(client).toContain("announce('Copied to clipboard', false)");
    expect(client).toContain("announce('Could not copy. Select and copy the text instead.')");
    expect(css).toContain('.copy-button[data-copied] .copy-check { display: inline-flex; }');
    expect(css).toContain('.swatch[data-copied] .swatch-check { display: inline-flex; }');
    expect(css).toContain('.copy-check { display: none; color: var(--aion-green-solid); }');
    expect(css).toContain('.copy-status[data-visible]');
  });
});

describe('the presentation pages', () => {
  it('uses one hero lockup and a standalone header logo', () => {
    expect(landing(FLAGS).match(/aion-lockup-horizontal/g)).toHaveLength(2);
    expect(landing(FLAGS).split('</header>')[0]).not.toContain('aion-wordmark');
    expect(landing(FLAGS)).toContain('src="/icon.png"');
    expect(landing(FLAGS)).toContain('src="/icon-light.png"');
    expect(landing(FLAGS)).toContain('data-theme-toggle');
  });

  it('replaces the manual inventory with essentials and a palette link', () => {
    const html = landing(FLAGS);
    expect(html).not.toContain('Selection, opaque');
    expect(html).not.toContain('Any other app');
    expect(html).toContain('id="essentials"');
    expect(html).toContain('id="manual"');
    expect(html).toContain('class="palette-link"');
  });

  it('places matching dividers on the section boundaries', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.essentials + .install, .install + .gate { border-top: 1px solid var(--aion-border-hairline); }');
    expect(css).not.toMatch(/\.palette-link \{[^}]*border-bottom/);
  });

  it('renders a role-first reference without repeating essentials or using engineering tables', () => {
    const html = palette();
    expect(html.match(/class="swatch"/g)).toHaveLength(groups().flatMap((group) => group.swatches).length);
    expect(html).not.toContain('<table');
    for (const group of groups()) {
      expect(html).toContain(escapeHtml(group.description));
      for (const row of group.swatches) expect(html).toContain(swatch(row));
    }
    expect(html).toContain('CSS &amp; token reference');
  });

  it('keeps accent variants together in three columns on mobile', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.palette-group:not(#accents) .swatch-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    expect(css).toContain('#accents .swatch-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }');
  });

  it('provides active page and section navigation with matching targets', () => {
    expect(palette()).toContain('href="#content" aria-current="page"');
    for (const [html, ids] of [[landing(FLAGS), ['overview', 'essentials', 'install']], [palette(), [...GROUP_IDS]]] as const) {
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
      const html = landing({ released });
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

describe('the persistent site theme', () => {
  it('keeps the switch hidden before initialization and changes themes immediately', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.theme-toggle[hidden] { display: none; }');
    expect(css).toContain('[data-theme-value] { display: none; }');
    expect(css).not.toContain('transition:');
  });

  it('renders both emitted values for every swatch and copy payload', () => {
    const html = palette();
    for (const group of groups()) {
      for (const row of group.swatches) {
        expect(html).toContain(`data-dark="${row.dark}"`);
        expect(html).toContain(`data-light="${row.light}"`);
        expect(html).toContain(`data-theme-value="dark">${row.dark}`);
        expect(html).toContain(`data-theme-value="light">${row.light}`);
      }
      expect(html).toContain(`data-light="${escapeAttr(colourBlock(group.swatches, 'light'))}"`);
    }
  });

  it('resolves saved choices before system preference and falls back safely', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme(undefined, true)).toBe('light');
    expect(resolveTheme(undefined, false)).toBe('dark');
    expect(readTheme({ getItem: () => 'invalid' })).toBeUndefined();
    expect(readTheme({ getItem: () => { throw new Error('blocked'); } })).toBeUndefined();
    expect(themeBootstrap()).toContain(THEME_STORAGE_KEY);
    expect(themeBootstrap()).toContain('data-theme-favicon');
  });

  it('keeps system changes until a user choice, then persists safely', () => {
    const listeners = new Map<string, EventListener>();
    const attributes: Record<string, string> = {};
    const root = { dataset: {} } as HTMLElement;
    const button = {
      dataset: {}, hidden: true, title: '', setAttribute: (name: string, value: string) => { attributes[name] = value; },
      addEventListener: (name: string, callback: EventListener) => listeners.set(name, callback),
      removeEventListener: () => undefined,
    } as unknown as HTMLButtonElement;
    const writes: string[] = [];
    const media = {
      matches: true,
      addEventListener: (name: string, callback: EventListener) => listeners.set(name, callback),
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
    const assets: string[] = [];
    initializeTheme({ root, button, media, storage: { getItem: () => null, setItem: (_key, value) => writes.push(value) }, updateAssets: (theme) => assets.push(theme) });
    expect(root.dataset.theme).toBe('light');
    listeners.get('change')!({ matches: false } as MediaQueryListEvent);
    expect(root.dataset.theme).toBe('dark');
    listeners.get('click')!({} as Event);
    expect(root.dataset.theme).toBe('light');
    expect(writes).toEqual(['light']);
    listeners.get('change')!({ matches: false } as MediaQueryListEvent);
    expect(root.dataset.theme).toBe('light');
    expect(button.hidden).toBe(false);
    expect(attributes['aria-label']).toBe('Use dark theme');
    expect(button.title).toBe('Use dark theme');
    expect(button.dataset['destination']).toBe('dark');
    expect(assets).toEqual(['light', 'dark', 'light']);
  });

  it('switches safely when persistence writes fail and synchronizes favicon media', () => {
    const listeners = new Map<string, EventListener>();
    const root = { dataset: {} } as HTMLElement;
    const button = { dataset: {}, hidden: true, title: '', setAttribute: () => undefined, addEventListener: (name: string, callback: EventListener) => listeners.set(name, callback), removeEventListener: () => undefined } as unknown as HTMLButtonElement;
    const media = { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as MediaQueryList;
    initializeTheme({ root, button, media, storage: { getItem: () => null, setItem: () => { throw new Error('blocked'); } }, updateAssets: () => undefined });
    listeners.get('click')!({} as Event);
    expect(root.dataset.theme).toBe('light');
    expect(button.title).toBe('Use dark theme');
    const dark = { dataset: { themeFavicon: 'dark' }, media: '' } as unknown as HTMLLinkElement;
    const light = { dataset: { themeFavicon: 'light' }, media: '' } as unknown as HTMLLinkElement;
    syncFavicons([dark, light], 'light');
    expect([dark.media, light.media]).toEqual(['not all', 'all']);
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
      for (const surface of ['--aion-bg-page', '--aion-bg-surface', '--aion-bg-raised'] as const) {
        expect(contrastEmitted(hexToOklch(light()[`--aion-${name}-solid`]!), hexToOklch(light()[surface]!)), `${name} on light ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastEmitted(hexToOklch(light()[`--aion-${name}-solid`]!), hexToOklch(light()[`--aion-${name}-subtle`]!)), `${name} on light button fill`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

it('builds complete HTML and ships the exact generated terminal download', () => {
  execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'pipe' });
  for (const [filename, html] of [['index', landing(FLAGS)], ['palette', palette()]]) {
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
      landing({ released: true }),
      palette(),
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
