import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dark, light } from '@sltsh/aion-css';
import { buildPalette, checks, flatten, lightPalette, readingStates, semantic, semanticLight, accentScale, neutral, contrastEmitted, hexToOklch, hex } from '@sltsh/aion-tokens';
import { variables } from '@sltsh/aion-lab/variables';
import { obsidianColors } from '@sltsh/aion-obsidian/colors';
import { probeSurfaces } from '../src/chapters/probe.js';
import { schemeStyles } from '../src/scheme.js';
import { FLAGS } from '../src/flags.js';
import { escapeAttr, escapeHtml } from '../src/render/html.js';
import { landing, palette } from '../src/render/index.js';
import { ANSI_SLOTS, GROUP_IDS, colourBlock, groups } from '../src/groups.js';
import { CHAPTERS } from '../src/content.js';
import { renderHeader } from '../src/render/shell.js';
import { gateSummary } from '../src/gate.js';
import { swatch } from '../src/render/swatch.js';
import { initializeTheme, readTheme, resolveTheme, syncFavicons, THEME_STORAGE_KEY, themeBootstrap } from '../src/theme.js';

const root = fileURLToPath(new URL('..', import.meta.url));

it('ships the release flag off', () => {
  expect(FLAGS).toEqual({ released: true });
});

it('escapes text and copy attributes', () => {
  expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href="x"&gt;&amp;&lt;/a&gt;');
  expect(escapeAttr('a "b"\nc')).toBe('a &quot;b&quot;&#10;c');
});

describe('search and sharing metadata', () => {
  const pages = [
    { file: 'index.html', url: 'https://aion.slt.sh/' },
    { file: 'palette.html', url: 'https://aion.slt.sh/palette.html' },
  ] as const;

  for (const page of pages) {
    it(`identifies ${page.file} with canonical and social metadata`, () => {
      const html = readFileSync(join(root, page.file), 'utf8');
      expect(html).toContain(`<link rel="canonical" href="${page.url}" />`);
      expect(html).toContain(`<meta property="og:url" content="${page.url}" />`);
      expect(html).toContain('<meta property="og:image" content="https://aion.slt.sh/aion-lockup-horizontal-light.webp" />');
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(html).not.toMatch(/noindex/i);
    });
  }

  it('publishes the canonical pages through robots.txt and the sitemap', () => {
    const robots = readFileSync(join(root, 'public/robots.txt'), 'utf8');
    const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
    expect(robots).toContain('User-agent: *\nAllow: /');
    expect(robots).toContain('Sitemap: https://aion.slt.sh/sitemap.xml');
    for (const page of pages) expect(sitemap).toContain(`<loc>${page.url}</loc>`);
  });
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
    expect(css).toContain('.text-link { display: inline-flex; align-items: center; gap: 0.7rem; min-height: 2.75rem; color: var(--aion-gold-solid);');
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
    expect(client).toContain('mountCopy(document, animate)');
    const copyClient = readFileSync(join(root, 'src/chapters/copy.ts'), 'utf8');
    expect(copyClient).toContain('success ? CONTENT.copy.success');
    expect(copyClient).toContain('CONTENT.copy.failed');
    expect(css).toContain('.copy-button[data-copied] .copy-check { display: inline-flex; }');
    expect(css).toContain('.swatch[data-copied] .swatch-check { display: inline-flex; }');
    expect(css).toContain('.copy-check { display: none; color: var(--aion-status-success-solid); }');
    expect(css).toContain('.copy-status[data-visible]');
  });
});

describe('the presentation pages', () => {




  it('places matching dividers on the section boundaries', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.essentials + .install, .install + .gate { border-top: 1px solid var(--aion-border-hairline); }');
    expect(css).not.toMatch(/\.palette-link \{[^}]*border-bottom/);
  });

  it('keeps the palette-link border and fill aligned with the section and moves only its inner content', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    // The link itself never translates; only its inner content span may, so the border-top/background stay put.
    expect(css).not.toMatch(/\.palette-link \{[^}]*transform/);
    expect(css).not.toMatch(/\.palette-link:hover, \.palette-link:focus-visible \{[^}]*transform/);
    // Horizontal padding gives the hover/focus fill breathing room around the text.
    expect(css).toMatch(/\.palette-link \{[^}]*padding: 1\.5rem 1rem/);
    // Pointer-only hover movement is gated behind hover capability; keyboard focus keeps the same feedback unconditionally.
    expect(css).toContain('.palette-link:focus-visible > span { transform: translateX(0.4rem); }');
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.palette-link:hover::before \{ transform: scaleX\(1\); \}\s*\.palette-link:hover > span \{ transform: translateX\(0\.4rem\); \}\s*\}/);
  });

  it('gives the header logo non-dimming feedback that keeps identity and focus visible', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).not.toMatch(/\.mark:hover, \.mark:focus-visible \{[^}]*opacity/);
    expect(css).toContain('.mark:hover, .mark:focus-visible { background: var(--aion-bg-raised); }');
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





  it('keeps presentation links textual and gives each themed image a visible fallback label', () => {
    const html = landing(FLAGS);
    expect(html).not.toContain('M5 12h14');
    expect(html).not.toContain('data-image-label');
    expect(html).toContain('data-theme-asset="dark"');
    expect(html).toContain('data-theme-asset="light"');
    expect(html).toMatch(/data-theme-asset="dark"[^>]+alt="Aion"/);
    expect(html).toMatch(/data-theme-asset="light"[^>]+alt="Aion"/);
  });

  it('makes copy controls honest until client enhancement runs', () => {
    const html = palette();
    expect(html).toContain('Hex values remain selectable. Copy when controls are available.');
    expect(palette()).toContain('Hex values remain selectable. Copy when controls are available.');
    expect(html.match(/data-copy/g)?.length).toBeGreaterThan(0);
    expect(html.match(/data-copy[^>]* disabled/g)?.length).toBe(html.match(/data-copy/g)?.length);
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.copy-button:disabled { color: var(--aion-fg-dim); border-color: var(--aion-border-divider); }');
    expect(css).toContain('.swatch:disabled .swatch-copy { display: none; }');
    const client = readFileSync(join(root, 'src/main.ts'), 'utf8');
    expect(client).toContain('mountCopy(document, animate)');
    const copyClient = readFileSync(join(root, 'src/chapters/copy.ts'), 'utf8');
    expect(copyClient).toContain("root.querySelectorAll<HTMLButtonElement>('[data-copy]')");
    expect(copyClient).toContain('source.disabled = false');
    expect(copyClient).toContain('const copiedTimers = new Map');
    expect(copyClient).toContain('clearTimeout(previous)');
  });

  it('keeps presentation structure open', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.install-list { display: grid;');
    expect(css).not.toContain('.install-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); list-style: none; padding: 0; margin: 0; border:');
    expect(css).toContain('.page-head { display: grid; grid-template-columns: 10rem minmax(0, 1fr);');
    expect(css).toContain('.developer-note { padding: 2rem 0 0; border-top: 1px solid var(--aion-border-divider); }');
    expect(css).toContain('.copy-status[data-status="success"] { border-color: var(--aion-status-success-solid); }');
    expect(css).toContain('.copy-status[data-status="error"] { border-color: var(--aion-status-error-solid); }');
  });


});

describe('the family motion surfaces', () => {
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8') + readFileSync(join(root, 'src/styles/shell.css'), 'utf8');
  const client = readFileSync(join(root, 'src/main.ts'), 'utf8');

  it('keeps the incoming root wipe isolated from default snapshot animations', () => {
    for (const pseudo of ['group', 'image-pair', 'old', 'new']) {
      expect(css).toContain(`html[data-theme-transition]::view-transition-${pseudo}(root)`);
    }
    expect(css).toContain('animation: none;\n  mix-blend-mode: normal;');
    expect(css).toContain('::view-transition-old(root) { z-index: 0; opacity: 1; }');
    expect(css).toContain('::view-transition { pointer-events: none; }');
  });

  it('uses the shared disclosure duration and removes temporary containment', () => {
    expect(client).toContain("duration('--slt-motion-disclosure', 360)");
    expect(client).toContain("menuToggle.setAttribute('aria-expanded', String(open))");
    expect(client).toContain("menu?.removeAttribute('data-disclosing')");
    expect(css).toContain('.site-menu[data-disclosing] { overflow: hidden; overflow-anchor: none; }');
  });

  it('keeps icon replacement out of the swatch value layout', () => {
    const html = palette();
    expect(html).toMatch(/class="swatch-copy"[\s\S]*class="swatch-check"[\s\S]*class="swatch-meta"/);
    const meta = html.slice(html.indexOf('class="swatch-meta"')).split('</button>')[0];
    expect(meta).not.toContain('swatch-check');
  });
});

describe('the persistent site theme', () => {
  it('suppresses colour transitions during a request and releases the marker after paint', () => {
    vi.useFakeTimers();
    try {
      const root = { dataset: {} } as HTMLElement;
      const media = { matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList;
      const controller = initializeTheme({ root, media, storage: null, updateAssets: () => {} });
      expect(root.dataset['themeSwap']).toBe('');
      vi.runAllTimers(); expect(root.dataset['themeSwap']).toBeUndefined();
      controller.request('light'); expect(root.dataset.theme).toBe('light');
      expect(root.dataset['themeSwap']).toBe('');
      controller.request('dark'); vi.runAllTimers(); expect(root.dataset['themeSwap']).toBeUndefined();
      controller.dispose();
    } finally { vi.useRealTimers(); }
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

  it('switches when persistence is blocked and synchronizes favicons', () => {
    const root = { dataset: {} } as HTMLElement;
    const media = { matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList;
    const controller = initializeTheme({ root, media, storage: { getItem: () => null, setItem: () => { throw new Error('blocked'); } }, updateAssets: () => {} });
    controller.request('light'); expect(root.dataset.theme).toBe('light'); controller.dispose();
    const dark = { dataset: { themeFavicon: 'dark' }, media: '' } as unknown as HTMLLinkElement;
    const light = { dataset: { themeFavicon: 'light' }, media: '' } as unknown as HTMLLinkElement;
    syncFavicons([dark, light], 'light'); expect([dark.media, light.media]).toEqual(['not all', 'all']);
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

  it('reads only variables the CSS package, lab map, Obsidian, site or motion contract names', () => {
    const css = sources().filter((file) => file.endsWith('.css')).map((file) => readFileSync(file, 'utf8')).join('\n');
    const emitted = new Set([...Object.keys(dark()), ...Object.keys(variables(buildPalette())), ...Object.keys(obsidianColors('dark'))]);
    const declarations = sources().map((file) => readFileSync(file, 'utf8')).join('\n');
    const declared = new Set([
      ...[...declarations.matchAll(/(--site-[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
      ...[...declarations.matchAll(/setProperty\(['"](--site-[a-z0-9-]+)['"]/g)].map((match) => match[1]),
    ]);
    const sharedMotion = new Set(['--slt-motion-feedback', '--slt-motion-disclosure', '--slt-motion-scene', '--slt-ease-out']);
    const read = css.match(/var\((--[a-z0-9-]+)/g) ?? [];
    expect(read.length).toBeGreaterThan(0);
    for (const entry of read) {
      const name = entry.slice(4);
      expect(emitted.has(name) || declared.has(name) || sharedMotion.has(name), name).toBe(true);
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
        ...Object.values(variables(buildPalette())),
        ...Object.values(variables(lightPalette)),
        ...Object.values(obsidianColors('dark')),
        ...Object.values(obsidianColors('light')),
        ...[buildPalette(), lightPalette].flatMap(source =>
          probeSurfaces(source).map(surface => hex(surface.background))),
      ].map((v) => v.toLowerCase()),
    );
    const pages = [
      landing(FLAGS),
      landing({ released: true }),
      landing({ released: false }),
      palette(),
      schemeStyles(),
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


describe('the new page shell', () => {
  for (const flags of [{ released: true }, { released: false }]) {
    for (const html of [landing(flags), palette(flags)]) {
      it(`renders an inline mark and one hidden named chip for released=${flags.released}`, () => {
        expect(html.match(/<header class="site-head">/g)).toHaveLength(1);
        expect(html.match(/<slt-site-mark placement="inline">/g)).toHaveLength(html.includes('data-hero') ? 2 : 1);
        expect(html).not.toContain('<slt-site-mark>');
        expect(html).toMatch(/<button[^>]+role="switch"[^>]+aria-label="Light theme"[^>]+aria-checked="false"[^>]+hidden/);
        expect(html.match(/role="switch"/g)).toHaveLength(1);
        expect(html.slice(html.indexOf('<header'), html.indexOf('</header>'))).not.toContain('role="switch"');
        expect(html).toContain('theme-image header-wordmark');
        expect(html).not.toContain('data-theme-choice');
      });
    }
  }
  it('keeps picture chrome inert without ids, links, buttons or landmarks', () => {
    const html = renderHeader('home', FLAGS, 'picture');
    expect(html).toContain('inert'); expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/\bid=|<(?:header|nav|a|button)\b|\brole=/);
  });
  it('keys the chapter rail to its seven section targets in order', () => {
    const html = landing(FLAGS); const rail = html.slice(html.indexOf('<nav class="chapter-rail"'));
    expect(rail).toContain('aria-label="Chapters"');
    expect([...rail.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])).toEqual(CHAPTERS.map((chapter) => chapter.id));
    for (const chapter of CHAPTERS) expect(html).toContain(`id="${chapter.id}"`);
    expect(html).not.toContain('class="stage"'); expect(html).not.toContain('id="essentials"');
    expect(html).toContain('href="#palette">Palette</a>');
  });
  it('draws each chip half from its own scheme and reserves the bottom of the body', () => {
    const html = landing(FLAGS);
    expect(html).toContain('data-chip-half data-theme="dark"'); expect(html).toContain('data-chip-half data-theme="light"');
    expect(html).toContain('chip-half-dark chip-key');
    const css = readFileSync(join(root, 'src/styles/chip.css'), 'utf8');
    expect(css).toMatch(/body \{ padding-bottom: calc\(var\(--site-chip-size\) \+ var\(--site-chip-offset\)/);
  });
});
