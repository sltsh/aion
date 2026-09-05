import { icons } from './icons.js';
import { kw, fn, nu, va, op, cm, pn, sp, st, b1, b2, renderCode } from './code.js';

const TOC = [
  ['Getting started', false], ['Install', false], ['The one rule', true],
  ['Contrast', false], ['Adding a colour', false], ['Exemptions', false], ['Reference', false],
] as const;

// `solveLightness` returns a lightness, not a colour, and it takes the direction to move
// in. It bisects the continuous contrast, which is the one place the ideal OKLCH belongs;
// the emitted pair is what the assertion on the next line reads.
const SNIPPET = [
  { tokens: [cm('// solve, never choose')] },
  { tokens: [kw('const'), sp(' '), va('lightness'), sp(' '), op('='), sp(' '), fn('solveLightness'), b1('('), nu('0.130'), pn(', '), nu('90'), pn(', '), va('editor'), pn(', '), nu('4.5'), pn(', '), st("'up'"), b1(')'), pn(';')] },
  { tokens: [kw('const'), sp(' '), va('gold'), sp(' '), op('='), sp(' '), b1('['), va('lightness'), pn(', '), nu('0.130'), pn(', '), nu('90'), b1(']'), pn(';')] },
  { tokens: [] },
  { tokens: [cm('// the gate reads the emitted hex, so the solved value is checked again')] },
  { tokens: [fn('expect'), b1('('), fn('contrastEmitted'), b2('('), va('gold'), pn(', '), va('editor'), b2(')'), b1(')'), pn('.'), fn('toBeGreaterThanOrEqual'), b1('('), nu('4.5'), b1(')'), pn(';')] },
  { tokens: [fn('console'), pn('.'), fn('log'), b1('('), fn('hex'), b2('('), va('gold'), b2(')'), b1(')'), pn(';'), sp('  '), cm('// the rounded value a reader sees')] },
] as const;

export function docsSurface(): string {
  return `
  <div class="window docs">
    <header class="docs-head">
      <span class="site-mark">Aion docs</span>
      <label class="field docs-search">
        ${icons.search}<input class="input" type="text" placeholder="Search the specification" />
      </label>
      <span class="pill">v0.1.0</span>
    </header>

    <div class="docs-body">
      <nav class="docs-toc">
        <h5 class="side-heading">Contents</h5>
        ${TOC.map(([label, active]) => `<a href="#" class="${active ? 'is-active' : ''}">${label}</a>`).join('')}
      </nav>

      <article class="prose">
        <span class="eyebrow">Specification</span>
        <h1>The one rule</h1>
        <p class="lede">Never type a hex value. Change the OKLCH definition and rebuild.
          Every other package reads that one module.</p>

        <p>A colour in Aion is a triple of lightness, chroma and hue. The emitter turns that
          triple into sRGB for each target, and <code>npm run verify</code> decides whether
          the result is allowed to ship. A value that fails the gate is not a style
          question; it does not build.</p>

        <div class="callout callout-warning">
          ${icons.warning}
          <div><b>Use <code>contrastEmitted</code>, never <code>contrast</code>.</b>
            <p><code>contrast</code> reads the ideal OKLCH. A reader sees the rounded hex,
              and the two differ by up to 0.06 at a 4.5:1 floor.</p></div>
        </div>

        <h2>Solving a token</h2>
        <p>Pass the chroma, the hue, the background, the floor and the direction to move
          in. It returns a lightness, not a colour: build the triple from it, then measure
          that triple with <code>contrastEmitted</code>. The solver bisects the continuous
          contrast, because bisection needs a smooth function, and the emitted 8-bit pair
          is what the assertion reads.</p>

        ${renderCode(SNIPPET)}

        <h2>Where each floor applies</h2>
        <table class="table">
          <thead><tr><th>Kind</th><th class="is-numeric">Floor</th><th>Applies to</th></tr></thead>
          <tbody>
            <tr><td>Body text</td><td class="is-numeric is-mono">4.5:1</td><td>every foreground on every named reading state, decorations composited</td></tr>
            <tr><td>Non-text</td><td class="is-numeric is-mono">3:1</td><td>focus rings and control edges, on both surfaces they touch</td></tr>
            <tr><td>Decorative</td><td class="is-numeric is-mono">—</td><td>hairlines, dividers, the line number, ANSI slot 0</td></tr>
          </tbody>
        </table>

        <div class="callout callout-info">
          ${icons.info}
          <div><b>Solve an accent against the worst surface it can land on.</b>
            <p>An accent that only clears the floor on the easiest surface fails the moment
              it lands on a card, a subtle fill or a selected line.</p></div>
        </div>

        <h2>Adding a colour</h2>
        <ol class="prose-list">
          <li>Add the OKLCH triple to <code>packages/tokens/src/palette.ts</code>.</li>
          <li>Pair the foreground with its own background in a test.</li>
          <li>Run <code>npm run verify</code>, then <code>npm run sync:design</code>.</li>
        </ol>

        <p class="prose-foot">Next: <a href="#">Contrast ${icons.chevron}</a></p>
      </article>
    </div>
  </div>`;
}
