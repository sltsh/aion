import { dark, light } from '@sltsh/aion-css';
import { SITE_PAIRS } from '../src/pairs.js';
import type { ThemeController } from '../src/theme.js';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildPalette, lightPalette, readingStates, SYNTAX, lightSyntax, hex, contrastEmitted, hexToOklch } from '@sltsh/aion-tokens';
import { probeSurfaces, worstSurface, failDirection, floorLimit, SOLVED_CHIPS } from '../src/chapters/probe.js';
import { renderSolved, solvedScale, solvedStrip } from '../src/render/solved.js';
for (const source of [buildPalette(), lightPalette]) {
  test(`seven probe surfaces are gated reading states, editor L=${source.neutral.editor[0]}`, () => {
    const surfaces = probeSurfaces(source); expect(surfaces).toHaveLength(7);
    for (const surface of surfaces) expect(readingStates(source).some((row) => JSON.stringify(row.background) === JSON.stringify(surface.background))).toBe(true);
  });
  test(`chips keep syntax roles and shipped accents pass, editor L=${source.neutral.editor[0]}`, () => {
    expect(new Set(SOLVED_CHIPS.map((chip) => chip.accent)).size).toBe(7);
    for (const chip of SOLVED_CHIPS) {
      expect(SYNTAX[chip.role]).toBe(chip.accent); expect(lightSyntax[chip.role]).toEqual(lightPalette.accents[chip.accent]);
      const base = source.accents[chip.accent], surfaces = probeSurfaces(source), dir = failDirection(source);
      expect(dir).toBe(source === lightPalette ? 1 : -1);
      expect(worstSurface(base, surfaces).ratio).toBeGreaterThanOrEqual(4.5);
      expect(worstSurface([base[0] + dir * 0.005, base[1], base[2]], surfaces).ratio).toBeLessThan(worstSurface(base, surfaces).ratio);
      const limit = floorLimit(base, surfaces, dir);
      expect(worstSurface([limit, base[1], base[2]], surfaces).ratio).toBeGreaterThanOrEqual(4.5);
      expect(worstSurface([limit + dir * 0.0005, base[1], base[2]], surfaces).ratio).toBeLessThan(4.5);
    }
  });
}
for (const released of [true,false]) test(`Solved controls and marker, released=${released}`, () => {
  const html = renderSolved({released}); expect(html).toContain('aria-label="Accent lightness"'); expect(html).toContain('aria-valuetext=');
  expect(html).toContain('data-solved-hold'); expect(html).toContain('data-solved-marker');
  expect(solvedScale(5, 6)).toContain('shipped 6.00:1'); expect(solvedScale(5,6,300)).toContain('x2="260"'); expect(solvedScale(5, 6)).toContain('translate(210.9090909090909 60)');
});
test('responsive split has controls first and sticky only at 1100px', () => {
  const css = readFileSync(new URL('../src/styles/probes.css',import.meta.url),'utf8');
  expect(css).toContain('@media (min-width: 1100px)'); expect(css).toContain('.solved-controls{position:sticky');
  expect(css).toContain('grid-template-columns:1fr');
});

test('hold snaps back after crossing the floor and theme commits retain the selected accent', async () => {
  const { mountSolved } = await import('../src/chapters/solved.js');
  class Node extends EventTarget {
    dataset:Record<string,string>={}; style={background:'',color:''}; attrs=new Map<string,string>();
    value=''; min=''; max=''; checked=false; disabled=true; textContent=''; innerHTML='';
    setAttribute(k:string,v:string){this.attrs.set(k,v);}
  }
  const slider=new Node(),hold=new Node(),probe=new Node(),word=new Node(),hx=new Node(),verdict=new Node(),svg=new Node();
  const chips=SOLVED_CHIPS.map(chip=>{const node=new Node();node.dataset['solvedAccent']=chip.accent;return node;});
  const nodes:Record<string,Node>={'[data-solved-lightness]':slider,'[data-solved-hold]':hold,'[data-solved-probe]':probe,'[data-solved-word]':word,'[data-solved-hex]':hx,'[data-solved-verdict]':verdict};
  const root={querySelector:(s:string)=>nodes[s],querySelectorAll:(s:string)=>s==='.solved-scale'?[svg]:chips};
  let scheme:'dark'|'light'='dark';let notify=()=>{};
  const controller={get theme(){return scheme;},generation:0,request:()=>{},subscribe:(fn:Parameters<ThemeController['subscribe']>[0])=>{notify=()=>fn(scheme,'request');return ()=>{notify=()=>{};};},dispose:()=>{}};
  const inputs={dark:buildPalette(),light:lightPalette};const dispose=mountSolved(root as unknown as HTMLElement,controller,inputs);
  for (const next of ['dark', 'light'] as const) {
    scheme=next;notify();
    for (const [index,chip] of SOLVED_CHIPS.entries()) {
      chips[index]!.dispatchEvent(new Event('click'));
      for (const L of [inputs[scheme].accents[chip.accent][0], scheme==='dark'?0.25:0.95]) {
        slider.value=String(L);slider.dispatchEvent(new Event('input'));
        const base=inputs[scheme].accents[chip.accent], worst=worstSurface([L,base[1],base[2]],probeSurfaces(inputs[scheme]));
        expect(probe.innerHTML).toContain(`data-surface="${worst.name}" data-worst`);
        expect(verdict.textContent).toContain(`${worst.name}: ${worst.ratio.toFixed(2)}:1`);
      }
    }
  }
  scheme='dark';notify();
  chips[1]!.dispatchEvent(new Event('click'));expect(probe.innerHTML).toContain('>entry</span>');
  slider.value='0.25';slider.dispatchEvent(new Event('input'));expect(verdict.dataset['verdict']).toBe('fail');
  hold.checked=true;hold.dispatchEvent(new Event('change'));expect(verdict.dataset['verdict']).toBe('pass');
  chips[2]!.dispatchEvent(new Event('click'));slider.value='0.25';slider.dispatchEvent(new Event('input'));expect(verdict.dataset['verdict']).toBe('pass');
  chips[1]!.dispatchEvent(new Event('click'));slider.value='0.25';slider.dispatchEvent(new Event('input'));expect(verdict.dataset['verdict']).toBe('pass');
  const steps=(Number(slider.value)-Number(slider.min))/0.0005;expect(steps).toBeCloseTo(Math.round(steps),8);
  scheme='light';notify();expect(probe.innerHTML).toContain('>entry</span>');expect(Number(slider.value)).toBe(lightPalette.accents.coral[0]);
  expect(chips[1]!.attrs.get('aria-pressed')).toBe('true');expect(slider.attrs.get('aria-valuetext')).toContain('Accent lightness');
  dispose();const before=probe.innerHTML;chips[0]!.dispatchEvent(new Event('click'));expect(probe.innerHTML).toBe(before);
});

test('client consumes the shared JSON island, including the gated find surface', async()=>{
  const { readProbeInputs }=await import('../src/chapters/probe.js');
  const { measureIsland }=await import('../src/measures.js');
  const json=measureIsland().replace(/^.*?>/,'').replace(/<\/script>$/,'');
  const inputs=readProbeInputs({querySelector:()=>({textContent:json})} as unknown as Document)!;
  expect(inputs).not.toBeNull();expect(probeSurfaces(inputs.dark)).toEqual(probeSurfaces(buildPalette()));
  expect(probeSurfaces(inputs.light)).toEqual(probeSurfaces(lightPalette));
  expect(readProbeInputs({querySelector:()=>({textContent:'invalid'})} as unknown as Document)).toBeNull();
});

for (const [scheme, source] of [['dark', buildPalette()], ['light', lightPalette]] as const) {
  test(`the strip shows every measured painted pair and worst tile: ${scheme}`, () => {
    const surfaces = probeSurfaces(source);
    for (const chip of SOLVED_CHIPS) {
      const base = source.accents[chip.accent];
      for (const L of [base[0], scheme === 'dark' ? 0.25 : 0.95]) {
        const colour = [L, base[1], base[2]] as const;
        const strip = solvedStrip(colour, source);
        expect([...strip.matchAll(/data-surface="([^"]+)"/g)].map(m => m[1])).toEqual(surfaces.map(s => s.name));
        for (const surface of surfaces) {
          expect(strip).toContain(`color:${hex(colour)};background:${hex(surface.background)}`);
          expect(strip).toContain(`${contrastEmitted(colour, surface.background).toFixed(2)}:1`);
        }
        expect(strip).toContain(`data-surface="${worstSurface(colour, surfaces).name}" data-worst`);
      }
    }
  });
  test(`static experiment and coloured copy are paired: ${scheme}`, () => {
    const values = scheme === 'dark' ? dark() : light();
    for (const released of [false, true]) {
      const html = renderSolved({released}), worst = worstSurface(source.accents.gold, probeSurfaces(source));
      expect(html).toContain(solvedStrip(source.accents.gold, source));
      expect(html).toContain(`${worst.name}: ${worst.ratio.toFixed(2)}:1`);
      expect(html).toContain(`${hex(source.accents.gold)} on ${worst.name}`);
    }
    const css = readFileSync(new URL('../src/styles/probes.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.solved-tile\{[^}]*border:1px solid var\(--aion-border-ui\)/);
    expect(css).toContain('repeat(auto-fit,minmax(min(100%,140px),1fr))');
    for (const fg of ['--aion-border-ui', '--aion-status-success-text', '--aion-status-error-text', ...SOLVED_CHIPS.map(c => `--aion-${c.accent}-solid`)]) {
      expect(SITE_PAIRS).toContainEqual(expect.objectContaining({fg, bg:'--aion-bg-raised'}));
      expect(contrastEmitted(hexToOklch(values[fg]!), hexToOklch(values['--aion-bg-raised']!))).toBeGreaterThanOrEqual(fg === '--aion-border-ui' ? 3 : 4.5);
      if (fg !== '--aion-border-ui') expect(css + renderSolved({released:true})).toContain(`var(${fg})`);
    }
  });
}
test('ties retain the first measured surface', () => {
  const source = buildPalette(), background = source.neutral.editor;
  expect(worstSurface(source.accents.gold, [{name:'first', background}, {name:'second', background}]).name).toBe('first');
});
