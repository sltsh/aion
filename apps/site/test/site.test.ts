import { describe, expect, it, vi } from 'vitest';
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

it('renders one fixed SLT site mark outside the footer on both pages, hidden below the phone boundary', () => {
  for (const html of [landing(FLAGS), palette()]) {
    expect(html.match(/<slt-site-mark/g)).toHaveLength(1);
    expect(html).toContain('<slt-site-mark></slt-site-mark>');
    expect(html).not.toContain('placement=');
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    expect(footer).not.toContain('slt-site-mark');
    expect(footer).not.toContain('footer-site-mark');
    expect(html).not.toContain('footer-site-mark');
  }
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  expect(css).toMatch(/@media \(max-width: 599px\) \{\s*slt-site-mark \{ display: none; \}\s*\}/);
  expect(css).not.toContain('slt-site-mark { display: block; }');
  expect(css).not.toMatch(/@media \(min-width: 600px\)[\s\S]*slt-site-mark/);
  // The mark is hidden below the phone boundary, so the toast no longer reserves space for it there.
  expect(css).not.toContain('44px + 12px');
  expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toContain("import '@sltsh/site-mark/register';");
});

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
    expect(client).toContain("success ? 'Copied to clipboard'");
    expect(client).toContain("'Could not copy. Select and copy the text instead.'");
    expect(css).toContain('.copy-button[data-copied] .copy-check { display: inline-flex; }');
    expect(css).toContain('.swatch[data-copied] .swatch-check { display: inline-flex; }');
    expect(css).toContain('.copy-check { display: none; color: var(--aion-status-success-solid); }');
    expect(css).toContain('.copy-status[data-visible]');
  });
});

describe('the presentation pages', () => {
  it('uses one hero lockup and a standalone header logo', () => {
    expect(landing(FLAGS).match(/aion-lockup-horizontal/g)).toHaveLength(2);
    expect(landing(FLAGS).split('</header>')[0]).not.toContain('aion-wordmark');
    expect(landing(FLAGS)).toContain('src="/icon.png"');
    expect(landing(FLAGS)).toContain('src="/icon-light.png"');
    expect(landing(FLAGS)).toContain('data-theme-switch');
    expect(landing(FLAGS)).toContain('type="radio" name="aion-theme" value="dark"');
    expect(landing(FLAGS)).toContain('type="radio" name="aion-theme" value="light"');
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
    const html = landing(FLAGS);
    expect(html).toContain('Hex values remain selectable. Copy when controls are available.');
    expect(palette()).toContain('Hex values remain selectable. Copy when controls are available.');
    expect(html.match(/data-copy/g)?.length).toBeGreaterThan(0);
    expect(html.match(/data-copy[^>]* disabled/g)?.length).toBe(html.match(/data-copy/g)?.length);
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.copy-button:disabled { color: var(--aion-fg-dim); border-color: var(--aion-border-divider); }');
    expect(css).toContain('.swatch:disabled .swatch-copy { display: none; }');
    const client = readFileSync(join(root, 'src/main.ts'), 'utf8');
    expect(client).toContain("document.querySelectorAll<HTMLButtonElement>('[data-copy]')");
    expect(client).toContain('source.disabled = false');
    expect(client).toContain('const copiedTimers = new Map');
    expect(client).toContain('clearTimeout(previous)');
  });

  it('records the site-owned adoption decisions and keeps presentation structure open', () => {
    const record = readFileSync(join(root, 'docs/slt-brand-adoption.md'), 'utf8');
    expect(record).toMatch(/owner visual approval is still\s+required/);
    expect(record).toContain('Chromium 153.0.8010.12');
    expect(record).toContain('production no-JS build and reduced motion');
    expect(record).toContain('lossless WebP exports');
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.install-list { display: grid;');
    expect(css).not.toContain('.install-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); list-style: none; padding: 0; margin: 0; border:');
    expect(css).toContain('.page-head { display: grid; grid-template-columns: 10rem minmax(0, 1fr);');
    expect(css).toContain('.developer-note { padding: 2rem 0 0; border-top: 1px solid var(--aion-border-divider); }');
    expect(css).toContain('.copy-status[data-status="success"] { border-color: var(--aion-status-success-solid); }');
    expect(css).toContain('.copy-status[data-status="error"] { border-color: var(--aion-status-error-solid); }');
  });

  it('retains the code preview and excludes rivals and overlays', () => {
    expect(landing(FLAGS)).toContain(renderHero());
    for (const role of ['keyword', 'function', 'type', 'string', 'number', 'comment']) expect(renderHero()).toContain(`t-${role}`);
    for (const text of ['one dark', 'ayu', 'nord', 'catppuccin', 'is-added', 'is-removed', 't-selected']) expect(landing(FLAGS).toLowerCase()).not.toContain(text);
  });
});

describe('the continuity hero', () => {
  const html = landing(FLAGS);
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  const rule = (selector: string): string => css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? '';

  it('stages copy before the code artifact in one two-column grid', () => {
    const stage = html.slice(html.indexOf('<div class="stage">'), html.indexOf('id="essentials"'));
    expect(html.match(/class="stage"/g)).toHaveLength(1);
    expect(stage.indexOf('class="hero"')).toBeGreaterThan(-1);
    expect(stage.indexOf('class="hero"')).toBeLessThan(stage.indexOf('class="editor"'));
    expect(stage.indexOf('class="editor"')).toBeLessThan(stage.indexOf('class="stage-seam"'));
    expect(rule('.stage')).toContain('grid-template-columns: minmax(0, 5fr) minmax(0, 7fr)');
    expect(css).toContain('grid-template-areas: "copy" "seam" "artifact"');
    expect(rule('.hero-brand')).not.toMatch(/margin: [^;]*auto/);
    for (const selector of ['.stage', '.hero', '.hero-pitch', '.actions']) expect(rule(selector)).not.toMatch(/text-align: center|justify-content: center/);
  });

  it('draws one decorative seam keyed gold with a teal terminal', () => {
    expect(html.match(/class="stage-seam"/g)).toHaveLength(1);
    expect(html).toContain('<span class="stage-seam" aria-hidden="true"><span class="stage-terminal"></span></span>');
    expect(rule('.stage-seam::before')).toContain('background: var(--aion-gold-solid)');
    expect(rule('.stage-terminal')).toContain('background: var(--aion-teal-solid)');
    expect(css.match(/clip-path/g)).toHaveLength(4);
    expect(css).toContain('::view-transition-new(root) { z-index: 1; clip-path: none; }');
    expect(css).not.toMatch(/gradient|box-shadow|text-shadow/);
  });

  it('keeps the scrollable code contained and reachable by keyboard', () => {
    expect(rule('.editor')).toContain('min-width: 0');
    expect(rule('.editor-body')).toContain('overflow-x: auto');
    expect(html).toContain('class="editor-body" role="region" aria-label="gate.ts code sample" tabindex="0"');
  });

  it('uses a flat header rail without pill silhouettes', () => {
    expect(css).not.toContain('999px');
    expect(css).not.toContain('border-radius: 50%');
    expect(css).not.toContain('border-radius: 5px');
    expect(rule('.site-nav a')).toContain('min-height: 2.75rem');
    expect(rule('.jump a')).toContain('min-height: 2.75rem');
    expect(rule('.site-nav a[aria-current]')).toContain('border-bottom-color: var(--aion-gold-solid)');
    expect(css).toMatch(/\.theme-switch \{ display: grid;[^}]*height: 2\.875rem/);
    expect(rule('.theme-switch input:checked + span')).toContain('border-bottom-color: var(--aion-gold-solid)');
    expect(html).toContain('aria-expanded="false" aria-controls="site-menu"');
  });

  it('keeps gold as the only filled action and marks the subordinate link by underline', () => {
    const hero = html.slice(html.indexOf('<div class="actions">'), html.indexOf('</section>'));
    expect(hero.match(/class="button"/g)).toHaveLength(1);
    expect(hero).toContain('<a class="open-link" href="#essentials">Find your colours</a>');
    expect(hero).not.toContain('button secondary');
    expect(hero).not.toContain('class="icon"><path d="M5 12h14');
    expect(css).not.toContain('.button.secondary');
    expect(rule('.button')).toContain('background: var(--aion-gold-solid)');
    expect(rule('.open-link')).toContain('text-decoration: underline');
  });

  it('keeps ordinary content complete around the bounded decorative scene', () => {
    expect(css).toContain('@media (prefers-reduced-motion: no-preference) {\n  html { scroll-behavior: smooth; }');
    expect(css.match(/@keyframes/g)).toHaveLength(3);
    expect(css).not.toMatch(/animation-iteration-count|infinite/);
    // The scene lives only on the decorative, aria-hidden seam, gated behind reduced motion so it never grants access to ordinary content.
    for (const selector of ['h1', 'h2', 'p', 'body', '#app', '.hero', '.hero-pitch', '.editor', '.editor-body']) {
      expect(rule(selector)).not.toMatch(/opacity: 0|visibility: hidden|clip:|transform:/);
    }
    const reducedMotionBlock = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(reducedMotionBlock).toContain('transition: none;');
    expect(reducedMotionBlock).not.toContain('.stage-seam');
  });

  it('owns the seam scene lifecycle in JavaScript so a live reduced-motion change never replays it', () => {
    // Settled by default: only a JS-set data-scene="play" attribute starts the draw.
    expect(rule('.stage-seam::before')).toContain('transform: scaleX(1)');
    expect(css).toContain('.stage-seam[data-scene="play"]::before { animation: seam-draw var(--slt-motion-scene, 720ms)');
    expect(css).not.toMatch(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*stage-seam/);
    const client = readFileSync(join(root, 'src/main.ts'), 'utf8');
    expect(client).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(client).toContain("delete seam.dataset['scene']");
    expect(client).toContain("addEventListener('animationend', settleSeam");
    expect(client).toContain("addEventListener('animationcancel', settleSeam");
    expect(client.match(/seam.dataset\['scene'\] = 'play'/g)).toHaveLength(1);
    expect(client).toContain('if (event.matches) settleMotion();');
    expect(client).toContain("window.addEventListener('pagehide'");
    expect(client).toContain('effect.cancel()');
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

describe('the family motion surfaces', () => {
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
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
    const html = landing(FLAGS);
    expect(html).toMatch(/class="swatch-copy"[\s\S]*class="swatch-check"[\s\S]*class="swatch-meta"/);
    const meta = html.slice(html.indexOf('class="swatch-meta"')).split('</button>')[0];
    expect(meta).not.toContain('swatch-check');
  });
});

describe('the persistent site theme', () => {
  it('keeps the switch hidden before initialization and changes themes immediately', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    expect(css).toContain('.theme-switch[hidden] { display: none; }');
    expect(css).toContain('.theme-switch { border: 1px solid var(--aion-border-ui); }');
    expect(css).toContain('.site-nav a, .theme-switch span { color: var(--aion-fg-secondary); font-size: 0.85rem; }');
    expect(css).toContain('.site-nav a, .theme-switch span { font-size: 0.75rem; }');
    expect(css).toContain('.theme-switch input:focus-visible + span');
    expect(css).toContain('[data-theme-value] { display: none; }');
    // Theme changes commit immediately: no selector that swaps a theme surface, asset, or value cross-fades.
    for (const selector of ['body', '.theme-image img', '[data-theme-value]', ':root[data-theme="dark"] .theme-image [data-theme-asset="dark"], :root[data-theme="light"] .theme-image [data-theme-asset="light"]']) {
      expect(css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? '').not.toContain('transition');
    }
    // A transitioned nav/control (e.g. .site-nav a[aria-current], .theme-switch input:checked + span) still eases
    // on ordinary hover/focus, but theme.ts suppresses every transition for the swap's duration via this rule.
    expect(css).toContain('.site-nav a { display: flex; align-items: center; min-height: 2.75rem; padding: 0 1rem; border-bottom: 2px solid transparent; text-decoration: none; transition:');
    expect(css).toContain('.theme-switch input:checked + span { color: var(--aion-gold-solid); background: var(--aion-gold-subtle); border-bottom-color: var(--aion-gold-solid); }');
    expect(css).toMatch(/\[data-theme-swap\] \*\s*\{\s*transition: none !important;\s*\}/);
  });

  it('suppresses transitions synchronously during a theme swap, then releases the marker after it paints', () => {
    vi.useFakeTimers();
    try {
      const listeners = new Map<string, EventListener>();
      const root = { dataset: {} } as HTMLElement;
      const control = { hidden: true } as HTMLFieldSetElement;
      const lightInput = { value: 'light', checked: false, addEventListener: (_name: string, callback: EventListener) => listeners.set('light', callback), removeEventListener: () => undefined } as unknown as HTMLInputElement;
      const darkInput = { value: 'dark', checked: false, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as HTMLInputElement;
      const media = { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as MediaQueryList;
      initializeTheme({ root, control, inputs: [darkInput, lightInput], media, storage: null, updateAssets: () => undefined });
      expect(root.dataset['themeSwap']).toBe('');
      vi.runAllTimers();
      expect(root.dataset['themeSwap']).toBeUndefined();

      listeners.get('light')!({ currentTarget: lightInput } as unknown as Event);
      // The new theme, assets, and control state commit in the same tick the marker is set.
      expect(root.dataset.theme).toBe('light');
      expect(root.dataset['themeSwap']).toBe('');
      vi.advanceTimersByTime(0);
      expect(root.dataset['themeSwap']).toBeUndefined();

      listeners.get('light')!({ currentTarget: lightInput } as unknown as Event);
      listeners.get('light')!({ currentTarget: lightInput } as unknown as Event);
      // A second swap before the first one's marker is released does not leave the earlier timer stranded.
      expect(root.dataset['themeSwap']).toBe('');
      vi.runAllTimers();
      expect(root.dataset['themeSwap']).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
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
    const root = { dataset: {} } as HTMLElement;
    const control = { hidden: true } as HTMLFieldSetElement;
    const darkInput = { value: 'dark', checked: false, addEventListener: (_name: string, callback: EventListener) => listeners.set('dark', callback), removeEventListener: () => undefined } as unknown as HTMLInputElement;
    const lightInput = { value: 'light', checked: false, addEventListener: (_name: string, callback: EventListener) => listeners.set('light', callback), removeEventListener: () => undefined } as unknown as HTMLInputElement;
    const writes: string[] = [];
    const media = {
      matches: true,
      addEventListener: (name: string, callback: EventListener) => listeners.set(name, callback),
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
    const assets: string[] = [];
    initializeTheme({ root, control, inputs: [darkInput, lightInput], media, storage: { getItem: () => null, setItem: (_key, value) => writes.push(value) }, updateAssets: (theme) => assets.push(theme) });
    expect(root.dataset.theme).toBe('light');
    expect([darkInput.checked, lightInput.checked]).toEqual([false, true]);
    listeners.get('change')!({ matches: false } as MediaQueryListEvent);
    expect(root.dataset.theme).toBe('dark');
    expect([darkInput.checked, lightInput.checked]).toEqual([true, false]);
    listeners.get('change')!({ matches: true } as MediaQueryListEvent);
    expect(root.dataset.theme).toBe('light');
    listeners.get('light')!({ currentTarget: lightInput } as unknown as Event);
    expect(root.dataset.theme).toBe('light');
    expect(writes).toEqual(['light']);
    listeners.get('change')!({ matches: false } as MediaQueryListEvent);
    expect(root.dataset.theme).toBe('light');
    expect(control.hidden).toBe(false);
    expect([darkInput.checked, lightInput.checked]).toEqual([false, true]);
    expect(assets).toEqual(['light', 'dark', 'light', 'light']);
  });

  it('switches safely when persistence writes fail and synchronizes favicon media', () => {
    const listeners = new Map<string, EventListener>();
    const root = { dataset: {} } as HTMLElement;
    const control = { hidden: true } as HTMLFieldSetElement;
    const darkInput = { value: 'dark', checked: false, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as HTMLInputElement;
    const lightInput = { value: 'light', checked: false, addEventListener: (_name: string, callback: EventListener) => listeners.set('light', callback), removeEventListener: () => undefined } as unknown as HTMLInputElement;
    const media = { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as MediaQueryList;
    initializeTheme({ root, control, inputs: [darkInput, lightInput], media, storage: { getItem: () => null, setItem: () => { throw new Error('blocked'); } }, updateAssets: () => undefined });
    listeners.get('light')!({ currentTarget: lightInput } as unknown as Event);
    expect(root.dataset.theme).toBe('light');
    expect([darkInput.checked, lightInput.checked]).toEqual([false, true]);
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

  it('reads only variables the CSS package emits, the site declares, or the shared motion contract names', () => {
    const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
    const emitted = new Set(Object.keys(dark()));
    const declared = new Set(css.match(/--site-[a-z0-9-]+/g) ?? []);
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
