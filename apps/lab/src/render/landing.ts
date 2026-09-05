import { figures } from '../figures.js';
import { icons } from './icons.js';

const FEATURES = [
  { icon: 'ruler', accent: 'gold', title: 'Measured, not chosen', body: 'Every pair is solved against a 4.5:1 floor on the surface it can actually land on. The build fails when one slips.' },
  { icon: 'bolt', accent: 'green', title: 'One source, five targets', body: 'The editor, the terminal, the CSS layer and this page read one OKLCH module. No hex is ever typed by hand.' },
  { icon: 'shield', accent: 'blue', title: 'Meaning is never hue alone', body: 'Added and removed separate by lightness as well as hue, and each carries a gutter glyph. A palette invariant, not a tested claim about colour vision.' },
] as const;

const features = FEATURES.map(
  (feature) => `
  <article class="card" data-accent="${feature.accent}">
    <span class="card-icon">${icons[feature.icon]}</span>
    <h3>${feature.title}</h3>
    <p>${feature.body}</p>
    <a class="card-link" href="#">Read the rule ${icons.chevron}</a>
  </article>`,
).join('');

export function landingSurface(): string {
  return `
  <div class="window site">
    <header class="site-nav">
      <span class="site-mark">Aion</span>
      <nav>
        <a href="#" class="is-active">Palette</a>
        <a href="#">Contrast</a>
        <a href="#">Install</a>
        <a href="#">Changelog</a>
      </nav>
      <span class="site-nav-actions">
        <button class="button button-ghost" type="button">Docs</button>
        <button class="button button-solid" type="button">Get the theme</button>
      </span>
    </header>

    <section class="hero">
      <span class="eyebrow">Version 0.1.0 — pre-release</span>
      <h1>A dark theme with a floor you can measure.</h1>
      <p class="lede">Familiar syntax from One Dark Pro. Chrome that is nobody else's.
        Every colour in Aion is solved in OKLCH and checked against WCAG on the exact
        surface it ships on.</p>
      <div class="hero-actions">
        <button class="button button-solid" type="button">Install for VS Code</button>
        <button class="button button-ghost" type="button">${icons.copy} npx aion init</button>
      </div>
      <dl class="hero-stats">
        <div><dt>Contrast floor</dt><dd>${figures.floor}</dd></div>
        <div><dt>Checks gated</dt><dd>${figures.gated}</dd></div>
        <div><dt>Reading states</dt><dd>${figures.readingStates}</dd></div>
        <div><dt>Hand-typed hex</dt><dd>0</dd></div>
      </dl>
    </section>

    <section class="feature-grid">${features}</section>

    <section class="quote">
      <blockquote>Three of the nine defects in this repository were found by pairing a
        foreground with its own background. None of them was visible by inspection.</blockquote>
      <cite>DESIGN.md, the contrast chapter</cite>
    </section>

    <footer class="site-foot">
      <span>Aion — MIT</span>
      <span class="site-foot-links">
        <a href="#">Marketplace ${icons.external}</a>
        <a href="#">Open VSX ${icons.external}</a>
        <a href="#">Source ${icons.external}</a>
      </span>
    </footer>
  </div>`;
}
