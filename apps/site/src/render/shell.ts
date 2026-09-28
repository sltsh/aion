import type { SiteFlags } from '../flags.js';
import { CONTENT, SHELL } from '../content.js';
import { escapeAttr, escapeHtml } from './html.js';
import { icon } from './icons.js';

export const REPO = 'https://github.com/sltsh/aion';
export const link = (href: string, text: string): string => `<a class="text-link" href="${href}">${escapeHtml(text)}</a>`;
export const themedImage = (className: string, dark: string, light: string, label: string, width: number, height: number): string =>
  `<span class="theme-image ${className}"><img data-theme-asset="dark" src="${dark}" alt="${escapeAttr(label)}" width="${width}" height="${height}"><img data-theme-asset="light" src="${light}" alt="${escapeAttr(label)}" width="${width}" height="${height}"></span>`;

export function renderHeader(page: 'home' | 'palette', _flags: SiteFlags, mode: 'live' | 'picture'): string {
  const picture = mode === 'picture';
  const links = [
    { id: 'depth', label: SHELL.navDepth }, { id: 'solved', label: SHELL.navProof },
    { id: 'install', label: SHELL.navInstall }, { id: 'palette', label: SHELL.navPalette },
  ] as const;
  const nav = links.map(({ id, label }) => picture ? `<span>${label}</span>` :
    `<a href="${id === 'palette' ? page === 'palette' ? '#content' : '#palette' : `${page === 'home' ? '' : '/'}#${id}`}"${page === 'home' && id !== 'palette' ? ` data-section="${id}"` : ''}${page === 'palette' && id === 'palette' ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const wordmark = themedImage('header-wordmark', '/aion-wordmark.webp', '/aion-wordmark-light.webp', SHELL.darkLabel, 144, 48);
  const path = `<div class="site-path"><slt-site-mark placement="inline"></slt-site-mark>${picture ? `<span class="mark">${wordmark}</span>` : `<a class="mark" href="${page === 'home' ? '#overview' : '/#overview'}" aria-label="${SHELL.home}">${wordmark}</a>`}</div>`;
  if (picture) return `<div class="site-head site-head-picture" aria-hidden="true" inert>${path}<span class="menu-toggle picture-menu-toggle">${icon('menu')}${icon('close')}</span><div class="site-menu"><div class="site-nav">${nav}</div><div class="site-controls"><span class="source-link">${icon('github')}</span></div></div></div>`;
  return `<a class="skip-link" href="#content">${SHELL.skip}</a><header class="site-head">${path}
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="${SHELL.menu}" data-menu-toggle>${icon('menu')}${icon('close')}</button>
    <div class="site-menu" id="site-menu"><nav class="site-nav" aria-label="${SHELL.navigation}">${nav}</nav>
    <div class="site-controls"><a class="source-link" href="${REPO}" aria-label="${SHELL.github}" title="${SHELL.github}">${icon('github')}</a></div></div></header>`;
}

export function renderFooter(_flags: SiteFlags): string {
  return `<footer class="site-foot">
  <div class="footer-intro">${themedImage('footer-wordmark', '/aion-wordmark.webp', '/aion-wordmark-light.webp', SHELL.darkLabel, 144, 48)}<span>${CONTENT.footerPitch}</span></div>
  <nav class="footer-links" aria-label="${SHELL.footerNavigation}">
    <a href="/palette.html"><span>${SHELL.explore}<small>${CONTENT.footerPaletteHint}</small></span></a>
    <a href="${REPO}"><span>${SHELL.source}<small>${CONTENT.footerSourceHint}</small></span>${icon('external')}</a>
    <a href="${REPO}/blob/main/DESIGN.md"><span>${SHELL.design}<small>${CONTENT.footerDesignHint}</small></span>${icon('external')}</a>
  </nav><div class="footer-meta"><span>${CONTENT.sourceLicense}</span><span>${CONTENT.fontLicense}</span></div></footer>`;
}
