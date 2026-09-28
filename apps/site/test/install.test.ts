import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { obsidianColors } from '@sltsh/aion-obsidian/colors';
import { renderInstall } from '../src/render/install.js';
import { INSTALL } from '../src/content.js';
import { escapeAttr } from '../src/render/html.js';
for(const released of [false,true]) test(`five ordered targets copy exactly their shown instructions (${released})`,()=>{
 const html=renderInstall({released});
 expect([...html.matchAll(/data-install-target="([^"]+)"/g)].map(m=>m[1])).toEqual(['vscode','obsidian','ovsx','wt','css']);
 for(const target of INSTALL){ const command=released?target.command:target.localCommand;expect(html).toContain(`<h3>${target.label}</h3>`);expect(html).toContain(`data-text="${escapeAttr(command)}"`);expect(html).toContain(target.href); }
 expect(html).not.toContain('Herdr');expect(html).toContain('Every target here is generated from the same tokens and passes the same gate.');
 expect(html).toContain('data-terminal-preview="dark"');expect([...html.matchAll(/class="install-dual"/g)]).toHaveLength(4);
 for(const scheme of ['dark','light'] as const) for(const [name,value]of Object.entries(obsidianColors(scheme)))expect(html).toContain(`${name}:${value};`);
});
test('install rows align with subgrid at exact D8 thresholds',()=>{
 const css=readFileSync(new URL('../src/styles/install.css',import.meta.url),'utf8');
 for(const value of ['grid-template-rows:subgrid','grid-row:span 3','repeat(5,minmax(0,1fr))','repeat(3,minmax(0,1fr))','repeat(2,minmax(0,1fr))','@media(max-width:1279px)','@media(max-width:599px)']) expect(css).toContain(value);
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
