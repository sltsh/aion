import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
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


import { mountPaletteChapter } from '../src/chapters/palette.js';
class Node extends EventTarget {
 dataset:Record<string,string>={}; linked=false; innerHTML=''; attrs=new Map<string,string>();
 toggleAttribute(_name:string,on:boolean){this.linked=on} removeAttribute(){this.linked=false}
 setAttribute(name:string,value:string){this.attrs.set(name,value)}
 getBoundingClientRect(){return {left:24,top:40,bottom:304,width:600,height:264}}
}
function fixture() {
 const window=new EventTarget();let mobile=false;
 Object.assign(window,{matchMedia:()=>({matches:mobile})});
 const charts=(["dark","light"] as const).map(scheme=>{
  const rows=measures(scheme).syntax;
  const columns=rows.map(row=>{const node=new Node();node.dataset={paletteColumn:row.role,ratio:String(row.ratio)};return node});
  const chart=new Node(),svg=new Node(),plot=new Node();
  chart.dataset['paletteCeiling']=String(Math.ceil(Math.max(...rows.map(row=>row.ratio))+.5));
  Object.assign(chart,{querySelector:(selector:string)=>selector==='[data-palette-margin]'?svg:selector==='.palette-columns'?plot:columns.find(node=>selector.includes(`"${node.dataset['paletteColumn']}"`))});
  return {chart,svg,columns};
 });
 const tokens=CONTENT.paletteChapter.file.flat().filter(([role])=>role!=='plain').map(([role])=>{const node=new Node();node.dataset['paletteToken']=role;return node});
 const nodes=[...charts.flatMap(chart=>chart.columns),...tokens];
 const root={ownerDocument:{defaultView:window},querySelectorAll:(selector:string)=>selector==='.palette-chart'?charts.map(c=>c.chart):nodes};
 const dispose=mountPaletteChapter(root as unknown as HTMLElement);
 return {charts,tokens,nodes,dispose,resize:(rows:boolean)=>{mobile=rows;window.dispatchEvent(new Event('resize'))}};
}
for (const scheme of ['dark','light'] as const) test(`pointing at every colour draws its emitted margin (${scheme})`,()=>{
 const f=fixture(),selected=f.charts[scheme==='dark'?0:1]!;
 for(const row of measures(scheme).syntax){
  const column=selected.columns.find(c=>c.dataset['paletteColumn']===row.role)!;
  column.dispatchEvent(new Event('pointerenter'));
  expect(selected.svg.innerHTML.match(/class="dimension-line"/g)).toHaveLength(1);
  expect(selected.svg.innerHTML).toContain(`+${(row.ratio-4.5).toFixed(2)}</text>`);
  expect(f.tokens.filter(t=>t.dataset['paletteToken']===row.role).every(t=>t.linked)).toBe(true);
  column.dispatchEvent(new Event('pointerleave'));
  expect(selected.svg.innerHTML).toBe('');expect(f.nodes.some(n=>n.linked)).toBe(false);
 }
 f.dispose();
});
test('focus and file pointers draw the same margin and focus survives pointer clearing',()=>{
 const f=fixture(),selected=f.charts[0]!,column=selected.columns[0]!,token=f.tokens.find(t=>t.dataset['paletteToken']===column.dataset['paletteColumn'])!;
 token.dispatchEvent(new Event('pointerenter'));const pointerMargin=selected.svg.innerHTML;
 column.dispatchEvent(new Event('focus'));token.dispatchEvent(new Event('pointerleave'));
 expect(selected.svg.innerHTML).toBe(pointerMargin);
 column.dispatchEvent(new Event('blur'));expect(selected.svg.innerHTML).toBe('');
 token.dispatchEvent(new Event('pointerenter'));f.dispose();expect(selected.svg.innerHTML).toBe('');
 token.dispatchEvent(new Event('pointerenter'));expect(f.nodes.some(n=>n.linked)).toBe(false);
});
test('resize crosses the row boundary while preserving a selected margin in both schemes',()=>{
 const f=fixture();f.charts[0]!.columns[0]!.dispatchEvent(new Event('focus'));
 for(const selected of f.charts)expect(selected.svg.innerHTML).toContain('rotate(-90)');
 f.resize(true);for(const selected of f.charts)expect(selected.svg.innerHTML).toContain('rotate(0)');
 f.resize(false);for(const selected of f.charts)expect(selected.svg.innerHTML).toContain('rotate(-90)');
 f.dispose();
});
test('matching file tokens are underlined, not boxed',()=>{
 const css=readFileSync(new URL('../src/styles/palette-chapter.css',import.meta.url),'utf8');
 const rule=css.match(/\.palette-file \[data-linked\]\{([^}]+)\}/)![1]!;
 expect(rule).toContain('text-decoration:underline');expect(rule).not.toMatch(/outline|border/);
});

test('revealing a scheme redraws selected margins and disconnects the layout observer',()=>{
 let changed=()=>{},disconnected=false;const observed:unknown[]=[];
 vi.stubGlobal('ResizeObserver',class {
  constructor(callback:()=>void){changed=callback}
  observe(node:unknown){observed.push(node)}
  disconnect(){disconnected=true}
 });
 try {
  const f=fixture();f.charts[0]!.columns[0]!.dispatchEvent(new Event('focus'));
  expect(observed).toEqual(f.charts.map(c=>c.chart));
  const selected=f.charts[1]!,before=selected.svg.innerHTML;
  selected.chart.getBoundingClientRect=()=>({left:24,top:0,bottom:500,width:600,height:500});
  changed();expect(selected.svg.innerHTML).not.toBe(before);
  f.dispose();expect(disconnected).toBe(true);
 } finally {vi.unstubAllGlobals()}
});
