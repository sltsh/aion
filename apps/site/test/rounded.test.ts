import type { ThemeController } from '../src/theme.js';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildPalette, lightPalette, contrast, contrastEmitted, solveLightness, srgbChannels } from '@sltsh/aion-tokens';
import { roundedFloor, roundedFlip, channelRows, roundedStep } from '../src/chapters/rounded.js';
import { renderRounded } from '../src/render/rounded.js';
for (const source of [buildPalette(), lightPalette]) test(`floor, flip and channel bytes, editor L=${source.neutral.editor[0]}`, () => {
 const base=source.comment,bg=source.neutral.editor;
 expect(roundedFloor(base,bg)).toBe(solveLightness(base[1],base[2],bg,4.5,base[0]>bg[0]?'up':'down'));
 const L=roundedFlip(base,bg); expect(L).not.toBeNull(); const colour=[L!,base[1],base[2]] as const;
 expect(contrast(colour,bg)).toBeGreaterThanOrEqual(4.5); expect(contrastEmitted(colour,bg)).toBeLessThan(4.5);
 const channels=srgbChannels(colour); channelRows(colour).forEach((row,i)=>{expect(row.exact).toBe(channels.exact[i]);expect(row.byte).toBe(channels.bytes[i]);expect(row.direction).toBe(row.byte>row.exact?'up':row.byte<row.exact?'down':'exact');});
});
for(const released of [true,false]) test(`Rounded named slider, released=${released}`,()=>{const html=renderRounded({released});expect(html).toContain('step="0.00005"');expect(html).toContain('aria-label="Lightness of the example colour"');expect(html).toContain('aria-valuetext=');expect(html).toContain('data-rounded-find');});
test('Page steps stay within the fine rounding window',()=>{expect(roundedStep('PageUp',0.5)).toBe(0.5005);expect(roundedStep('PageDown',0.5)).toBe(0.4995);expect(roundedStep('ArrowRight',0.5)).toBe(0.50005);expect(roundedStep('Tab',0.5)).toBeNull();});
test('only Rounded reads continuous contrast in site source',()=>{
 const scan=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(`${dir}/${e.name}`):e.name.endsWith('.ts')?[`${dir}/${e.name}`]:[]);
 for(const file of scan(new URL('../src',import.meta.url).pathname)) if(/\bcontrast\(/.test(readFileSync(file,'utf8'))) expect(file).toContain('/chapters/rounded.ts');
});

test('client opens at the floor, finds a flip, handles page steps and resets on commit', async()=>{
 const {mountRounded}=await import('../src/chapters/rounded.js');
 class Node extends EventTarget{value='';min='';max='';disabled=true;innerHTML='';attrs=new Map<string,string>();setAttribute(k:string,v:string){this.attrs.set(k,v);}}
 const slider=new Node(),find=new Node(),values=new Node();const root={querySelector:(s:string)=>s==='[data-rounded-lightness]'?slider:find,querySelectorAll:()=>[values]};
 let scheme:'dark'|'light'='dark';let notify=()=>{};const controller={get theme(){return scheme;},generation:0,request:()=>{},subscribe:(fn:Parameters<ThemeController['subscribe']>[0])=>{notify=()=>fn(scheme,'request');return ()=>{notify=()=>{};};},dispose:()=>{}};
 const inputs={dark:buildPalette(),light:lightPalette};const dispose=mountRounded(root as unknown as HTMLElement,controller,inputs);
 expect(Number(slider.value)).toBe(roundedFloor(inputs.dark.comment,inputs.dark.neutral.editor));
 find.dispatchEvent(new Event('click'));expect(Number(slider.value)).toBe(roundedFlip(inputs.dark.comment,inputs.dark.neutral.editor));expect(values.innerHTML).toContain('The exact colour passes');
 const before=Number(slider.value);const event=Object.assign(new Event('keydown',{cancelable:true}),{key:'PageUp'});slider.dispatchEvent(event);expect(Number(slider.value)).toBeCloseTo(before+0.0005,8);expect(event.defaultPrevented).toBe(true);
 scheme='light';notify();expect(Number(slider.value)).toBe(roundedFloor(inputs.light.comment,inputs.light.neutral.editor));
 dispose();const previous=slider.value;find.dispatchEvent(new Event('click'));expect(slider.value).toBe(previous);
});

const css=readFileSync(new URL('../src/styles/probes.css',import.meta.url),'utf8');
const rule=(selector:string):string=>{const at=css.split('\n').find(line=>line.startsWith(`${selector}{`));expect(at,selector).toBeDefined();return at!;};
const colourOf=(selector:string):string=>{const match=/(?:^|[{;])color:var\((--aion-[a-z-]+)\)/.exec(rule(selector));expect(match,`${selector} colour`).not.toBeNull();return match![1]!;};
test('exact, byte and gap figures take distinct paired colours',async()=>{
 const {SITE_PAIRS}=await import('../src/pairs.js');
 const {dark,light}=await import('@sltsh/aion-css');
 const {hexToOklch}=await import('@sltsh/aion-tokens');
 for(const released of [true,false]) expect(renderRounded({released})).toContain('class="channel-exact"');
 const figures={exact:colourOf('.rounded-channel .channel-exact'),byte:colourOf('.rounded-channel .channel-byte'),gap:colourOf('.rounded-pair .rounded-gap b')};
 expect(new Set(Object.values(figures)).size).toBe(3);
 for(const [name,fg] of Object.entries(figures)){
  const pair=SITE_PAIRS.find(p=>p.fg===fg&&p.bg==='--aion-bg-raised'&&p.where.startsWith('Rounded')&&p.where.includes(name));
  expect(pair,`${name} ${fg} paired on raised`).toBeDefined();
  for(const values of [dark(),light()]){expect(contrastEmitted(hexToOklch(values[fg]!),hexToOklch(values['--aion-bg-raised']!)),`${name} ${fg}`).toBeGreaterThanOrEqual(4.5);}
 }
});
test('the right column spaces its channels',()=>{
 const px=(name:string):number=>{const match=new RegExp(`${name}:(\\d+)px`).exec(css);expect(match,name).not.toBeNull();return Number(match![1]);};
 expect(rule('.rounded-channels')).toMatch(/gap:var\(--site-rounded-channel-gap\)/);
 expect(rule('.rounded-channel')).toMatch(/gap:var\(--site-rounded-row-gap\)/);
 expect(px('--site-rounded-channel-gap')).toBeGreaterThan(0);
 expect(px('--site-rounded-row-gap')).toBeGreaterThan(4);
});
