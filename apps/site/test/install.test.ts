import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { obsidianColors } from '@sltsh/aion-obsidian/colors';
import { renderInstall } from '../src/render/install.js';
import { INSTALL, UNRELEASED_NOTE } from '../src/content.js';
import { escapeAttr } from '../src/render/html.js';
for(const released of [false,true]) test(`five ordered targets copy exactly their shown instructions (${released})`,()=>{
 const html=renderInstall({released});
 expect([...html.matchAll(/data-install-target="([^"]+)"/g)].map(m=>m[1])).toEqual(['vscode','obsidian','ovsx','wt','css']);
 for(const target of INSTALL){ const command=released?target.command:target.localCommand;expect(html).toContain(`<h3>${target.label}</h3>`);expect(html).toContain(`data-text="${escapeAttr(command)}"`);for(const badge of target.badges) expect(html).toContain(`href="${badge.href}"`); }
 expect(html).not.toContain('Herdr');expect(html).toContain('Every target here is generated from the same tokens and passes the same gate.');
 expect(html).toContain('data-terminal-preview="dark"');expect([...html.matchAll(/class="install-dual"/g)]).toHaveLength(4);
 for(const scheme of ['dark','light'] as const) for(const [name,value]of Object.entries(obsidianColors(scheme)))expect(html).toContain(`${name}:${value};`);
});
test('install rows align with subgrid at exact D8 thresholds',()=>{
 const css=readFileSync(new URL('../src/styles/install.css',import.meta.url),'utf8');
 for(const value of ['grid-template-rows:subgrid','grid-row:span 4','repeat(5,minmax(0,1fr))','repeat(3,minmax(0,1fr))','repeat(2,minmax(0,1fr))','@media(max-width:1279px)','@media(max-width:599px)']) expect(css).toContain(value);
});


test('Windows Terminal gives the fragment folder and says to restart and select Aion',()=>{
 const target=INSTALL.find(target=>target.id==='wt')!;
 expect(target.command).toBe('%LOCALAPPDATA%\\Microsoft\\Windows Terminal\\Fragments\\sltsh');
 expect(target.localCommand).toBe(target.command);
 expect(target.note).toMatch(/restart.*select Aion/i);
 const download=JSON.parse(readFileSync(new URL('../../../packages/terminal/fragments/aion.json',import.meta.url),'utf8'));
 expect(download.schemes).toEqual(expect.arrayContaining([expect.objectContaining({name:'Aion'})]));
 for(const released of [false,true]) expect(renderInstall({released})).not.toContain('settings.json');
});
test('each tile ends with badges then Copy in one shared action track',()=>{
 const html=renderInstall({released:true});
 const tiles=html.split('<article class="install-tile"').slice(1).map(tile=>tile.slice(0,tile.lastIndexOf('</article>')));
 expect(tiles).toHaveLength(5);
 for(const tile of tiles){
  expect(tile.match(/class="install-actions"/g)).toHaveLength(1);
  const actions=tile.slice(tile.indexOf('class="install-actions"'));
  expect(actions).toMatch(/class="install-badge"[\s\S]*<button[^>]*class="install-copy"/);
  expect(tile.slice(0,tile.indexOf('class="install-actions"'))).not.toMatch(/<a\s/);
  expect(actions).toMatch(/<\/button><\/div>$/);
 }
 const css=readFileSync(new URL('../src/styles/install.css',import.meta.url),'utf8');
 expect(css).toMatch(/\.install-actions\{[^}]*grid-row:4/);
});
test('badges link to their channels with monochrome glyphs',()=>{
 expect(INSTALL.map(target=>target.badges.map(badge=>badge.href))).toEqual([
  ['https://marketplace.visualstudio.com/items?itemName=sltsh.aion-theme'],
  ['https://obsidian.md/themes?search=Aion'],
  ['https://open-vsx.org/extension/sltsh/aion-theme'],
  ['/downloads/aion.json'],
  ['https://www.npmjs.com/package/@sltsh/aion-css'],
 ]);
 const html=renderInstall({released:true});
 expect(html.match(/class="install-badge"/g)).toHaveLength(5);
 const badges=[...html.matchAll(/<a class="install-badge"[\s\S]*?<\/a>/g)].map(match=>match[0]);
 for(const badge of badges) expect(badge).toContain('<svg class="icon"');
 expect(html).toContain('currentColor');
 expect(html).not.toContain('<img');
 expect(UNRELEASED_NOTE).toContain('local CSS build');
 expect(renderInstall({released:false})).toContain('npm run build');
});
test('badge text and edge are paired on both schemes',async()=>{
 const {SITE_PAIRS}=await import('../src/pairs.js');
 const {variables}=await import('@sltsh/aion-lab/variables');
 const {buildPalette,lightPalette,contrastEmitted,hexToOklch}=await import('@sltsh/aion-tokens');
 const pairs=SITE_PAIRS.filter(pair=>pair.where.startsWith('install badge'));
 expect(pairs).toEqual(expect.arrayContaining([
  expect.objectContaining({fg:'--n-text-primary',bg:'--n-sidebar',floor:4.5}),
  expect.objectContaining({fg:'--n-border',bg:'--n-editor',floor:3}),
 ]));
 for(const palette of [buildPalette(),lightPalette]){
  const values=variables(palette);
  for(const pair of pairs) expect(contrastEmitted(hexToOklch(values[pair.fg]!),hexToOklch(values[pair.bg]!)),pair.where).toBeGreaterThanOrEqual(pair.floor);
 }
});

test('one copy controller copies text/scheme values, clears at2s, and reports unavailable safely',async()=>{
 const {vi}=await import('vitest');const {mountCopy}=await import('../src/chapters/copy.js');vi.useFakeTimers();
 class Node extends EventTarget {
  dataset:Record<string,string>={};disabled=true;isConnected=true;textContent='';nodeType=1;attrs=new Map<string,string>();
  closest(){return this}matches(){return this.disabled}querySelector(){return null}removeAttribute(n:string){this.attrs.delete(n)}toggleAttribute(n:string,on:boolean){if(on)this.attrs.set(n,'');else this.attrs.delete(n)}
 }
 vi.stubGlobal('Element',Node);
 const doc=new Node() as Node & {ownerDocument:unknown;defaultView:unknown;documentElement:unknown;hidden:boolean;querySelectorAll:()=>Node[]};doc.nodeType=9;doc.hidden=false;
 const status=new Node(),source=new Node();source.dataset['text']='npm install @sltsh/aion-css';
 const clipboard={writeText:vi.fn().mockResolvedValue(undefined)};const view=Object.assign(new EventTarget(),{navigator:{clipboard:clipboard as typeof clipboard|undefined},getComputedStyle:()=>({getPropertyValue:()=>'',borderColor:''})});
 doc.defaultView=view;doc.documentElement={dataset:{theme:'light'}};doc.querySelector=()=>status as never;doc.querySelectorAll=()=>[source];
 const dispose=mountCopy(doc as unknown as Document);
 const click=()=>{const e=new Event('click');Object.defineProperty(e,'target',{value:source});doc.dispatchEvent(e)};
 click();await Promise.resolve();expect(clipboard.writeText).toHaveBeenCalledOnce();expect(clipboard.writeText).toHaveBeenCalledWith(source.dataset['text']);expect(source.dataset['copied']).toBe('true');
 await vi.advanceTimersByTimeAsync(1999);expect(source.dataset['copied']).toBe('true');await vi.advanceTimersByTimeAsync(1);expect(source.dataset['copied']).toBeUndefined();
 delete source.dataset['text'];source.dataset['dark']='dark value';source.dataset['light']='light value';click();await Promise.resolve();expect(clipboard.writeText).toHaveBeenLastCalledWith('light value');
 view.navigator.clipboard=undefined;click();expect(status.textContent).toContain('Copy is unavailable');expect(source.dataset['copied']).toBeUndefined();
 dispose();expect(vi.getTimerCount()).toBe(0);click();expect(clipboard.writeText).toHaveBeenCalledTimes(2);vi.unstubAllGlobals();vi.useRealTimers();
});
