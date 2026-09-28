import { editorSurface } from '@sltsh/aion-lab/render/editor';
import type { SiteFlags } from '../flags.js';
import { CONTENT } from '../content.js';
import { renderHeader } from './shell.js';
import { escapeHtml } from './html.js';

export function renderHero(flags: SiteFlags): string {
  const layer = (picture: boolean): string => `${renderHeader('home', flags, picture ? 'picture' : 'live')}
    <div class="hero-copy"><${picture ? 'div' : 'h1'} class="hero-headline"${picture ? '' : ' id="hero-title"'}>${CONTENT.hero.headline.map((line, i) => `<span>${escapeHtml(line)}${i === 2 ? '<span class="hero-caret" aria-hidden="true"></span>' : ''}</span>`).join('')}</${picture ? 'div' : 'h1'}>
    <p class="hero-sub">${CONTENT.hero.sub}</p><div class="hero-actions">${picture
      ? `<span class="hero-primary">${CONTENT.hero.install}</span><span class="hero-secondary">${CONTENT.hero.openVsx}</span>`
      : `<a class="hero-primary" href="${CONTENT.hero.marketplace}">${CONTENT.hero.install}</a><a class="hero-secondary" href="${CONTENT.hero.registry}">${CONTENT.hero.openVsx}</a>`}</div></div>
    <div class="hero-editor" inert><div class="hero-editor-frame">${editorSurface()}</div></div>`;
  return `<div class="hero-shell"><section class="diptych" id="overview" aria-labelledby="hero-title" data-hero>
    <div class="hero-layer hero-base" data-hero-base>${layer(false)}</div>
    <div class="hero-layer hero-far" data-hero-far data-theme="light" aria-hidden="true" inert>${layer(true)}</div>
    <svg class="hero-seam-svg" aria-hidden="true"><line data-hero-seam data-theme="dark" /><line data-hero-seam-far data-theme="light" /></svg>
    <div class="hero-handle" data-hero-handle role="slider" tabindex="0" aria-label="${CONTENT.hero.slider}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0% ${CONTENT.hero.lightName}"><span data-handle-scheme data-theme="dark">${CONTENT.hero.darkName}</span><span data-handle-scheme data-theme="light">${CONTENT.hero.lightName}</span></div>
  </section><div class="hero-menu-portal"></div></div>`;
}
