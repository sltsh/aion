import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { renderPaletteChapter } from '../src/render/palette-chapter.js';
import { measures } from '../src/measures.js';
import { CONTENT } from '../src/content.js';
for (const released of [true,false]) test(`palette chart carries both schemes and file counts (${released})`, () => {
 const html=renderPaletteChapter({released});
 for(const scheme of ['dark','light'] as const) for(const row of measures(scheme).syntax) {
  expect(html).toContain(`data-palette-column="${row.role}" data-ratio="${row.ratio}"`);
  const count=CONTENT.paletteChapter.file.flat().filter(([role])=>role===row.role).length;
  expect(html).toContain(`data-uses="${row.role}">${count}`);
 }
 expect(html).toContain('data-floor="4.5"');
 expect(html).toContain('data-theme-value="dark"');expect(html).toContain('data-theme-value="light"');
 expect(html).not.toContain('data-scheme-toggle');
});
test('palette switches to rows with a vertical floor below600',()=>{
 const css=readFileSync(new URL('../src/styles/palette-chapter.css',import.meta.url),'utf8');
 expect(css).toContain('@media(max-width:599px)');expect(css).toContain('.palette-floor{top:0;bottom:0;');
});

test('file pointers and column focus link all matching occurrences and dispose',async()=>{
 const {mountPaletteChapter}=await import('../src/chapters/palette.js');
 class Node extends EventTarget { dataset:Record<string,string>={}; linked=false;toggleAttribute(_name:string,on:boolean){this.linked=on}removeAttribute(){this.linked=false} }
 const col=new Node(),token1=new Node(),token2=new Node(),other=new Node();col.dataset['paletteColumn']='keyword';token1.dataset['paletteToken']=token2.dataset['paletteToken']='keyword';other.dataset['paletteToken']='number';
 const root={querySelectorAll:()=>[col,token1,token2,other]};const dispose=mountPaletteChapter(root as unknown as HTMLElement);
 token1.dispatchEvent(new Event('pointerenter'));expect([col,token1,token2].every(n=>n.linked)).toBe(true);expect(other.linked).toBe(false);
 col.dispatchEvent(new Event('focus'));token1.dispatchEvent(new Event('pointerleave'));expect(token2.linked).toBe(true);
 col.dispatchEvent(new Event('blur'));expect(token2.linked).toBe(false);dispose();token1.dispatchEvent(new Event('pointerenter'));expect(col.linked).toBe(false);
});
