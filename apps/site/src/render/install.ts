import { editorSurface } from '@sltsh/aion-lab/render/editor';
import { obsidianColors } from '@sltsh/aion-obsidian/colors';
import { CONTENT, INSTALL } from '../content.js';
import type { SiteFlags } from '../flags.js';
import { icon } from './icons.js';
import { escapeAttr, escapeHtml } from './html.js';
const declarations = (values: Record<string, string>): string => Object.entries(values).map(([name,value]) => `${name}:${value};`).join('');
const obsidian = (scheme: 'dark'|'light'): string => {
 const p=CONTENT.install.preview;
 return `<div class="install-obsidian" style="${declarations(obsidianColors(scheme))}"><aside><b>${p.vault}</b><span>${p.daily}</span><span>${p.notes}</span><span>${p.reading}</span></aside><article><h4>${p.heading}</h4><p>${p.body} <a>${p.link}</a> <span class="obsidian-tag">${p.tag}</span></p><h5>${p.subheading}</h5><blockquote>${p.quote}</blockquote><pre><span style="color:var(--code-keyword)">const</span> <span style="color:var(--code-property)">floor</span> <span style="color:var(--code-operator)">=</span> <span style="color:var(--code-value)">4.5</span>;</pre></article></div>`;
};
const preview = (id: string, scheme: 'dark'|'light'): string => {
 if(id==='obsidian')return obsidian(scheme);
 if(id==='vscode'||id==='ovsx')return `<div class="install-editor">${editorSurface()}</div>`;
 if(id==='wt')return `<div class="install-terminal" data-terminal-preview="dark">${CONTENT.terminal.session.map(line=>`<div>${line.map(([slot,text])=>`<span style="color:var(--ansi-${slot.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())})">${escapeHtml(text)}</span>`).join('')}</div>`).join('')}</div>`;
 return `<div class="install-css"><pre>${escapeHtml(CONTENT.install.cssCode)}</pre><div>${['editor','sidebar','widget'].map(name=>`<i style="background:var(--n-${name})"></i>`).join('')}${['gold','teal','blue','violet','coral'].map(name=>`<i style="background:var(--a-${name})"></i>`).join('')}</div></div>`;
};
export function renderInstall(flags: SiteFlags): string {
 return `<section class="chapter install-chapter" id="install" aria-labelledby="install-title"><div class="install-heading"><div><span class="chapter-eyebrow">Install</span><h2 id="install-title">${CONTENT.install.title}</h2></div><p>${CONTENT.install.scope}</p></div><div class="install-tiles">${INSTALL.map(target=>{
 const command=flags.released?target.command:target.localCommand;
 const picture=target.id==='wt'?`<div class="install-single" data-theme="dark">${preview(target.id,'dark')}</div>`:`<div class="install-dual">${(['dark','light'] as const).map(scheme=>`<div class="install-preview-half" data-theme="${scheme}">${preview(target.id,scheme)}</div>`).join('')}</div>`;
 return `<article class="install-tile" data-install-target="${target.id}"><header><h3>${target.label}</h3><p>${escapeHtml(target.note)}</p></header><div class="install-thumbnail" aria-hidden="true" inert>${picture}</div><div class="install-command"><code>${escapeHtml(command)}</code></div><div class="install-actions"><div class="install-badges">${target.badges.map(badge=>`<a class="install-badge" href="${escapeAttr(badge.href)}">${icon(badge.icon)}<span>${escapeHtml(badge.label)}</span></a>`).join('')}</div><button type="button" class="install-copy" data-copy data-text="${escapeAttr(command)}" disabled><span class="copy-label">${CONTENT.copy.label}</span><span class="copied-label">${CONTENT.copy.copied}</span></button></div></article>`;
 }).join('')}</div></section>`;
}
