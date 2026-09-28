import { hex } from '@sltsh/aion-tokens';
import type { Oklch } from '@sltsh/aion-tokens';
import type { ThemeController } from '../theme.js';
import { CONTENT } from '../content.js';
import { floorLimit, failDirection, probeSurfaces, worstSurface, SOLVED_CHIPS } from './probe.js';
import type { ProbeInputs } from './probe.js';
import { solvedScale, solvedStrip } from '../render/solved.js';

export function mountSolved(root: HTMLElement, controller: ThemeController, inputs: ProbeInputs): () => void {
  const lifetime = new AbortController(), {signal} = lifetime;
  const slider = root.querySelector<HTMLInputElement>('[data-solved-lightness]')!;
  const hold = root.querySelector<HTMLInputElement>('[data-solved-hold]')!;
  const probe = root.querySelector<HTMLElement>('[data-solved-probe]')!;
  let selected = SOLVED_CHIPS[0]!, source = inputs[controller.theme];
  let base = source.accents[selected.accent], surfaces = probeSurfaces(source), dir = failDirection(source), limit = floorLimit(base,surfaces,dir);
  const draw = (): void => {
    let L = Number(slider.value);
    if (hold.checked && (L-limit)*dir>0) { L=limit; slider.value=String(L); }
    const colour: Oklch = [L,base[1],base[2]], worst=worstSurface(colour,surfaces), shipped=worstSurface(base,surfaces);
    probe.innerHTML=solvedStrip(colour,source);
    root.querySelector<HTMLElement>('[data-solved-hex]')!.textContent=`${hex(colour)} ${CONTENT.solved.on} ${worst.name}`;
    const verdict=root.querySelector<HTMLElement>('[data-solved-verdict]')!;
    verdict.dataset['verdict']=worst.ratio>=4.5?'pass':'fail';
    verdict.textContent=`${worst.ratio>=4.5?CONTENT.solved.passes:CONTENT.solved.fails} ${worst.name}: ${worst.ratio.toFixed(2)}:1`;
    const width=Math.max(200,root.querySelector<HTMLElement>('.solved-figure')?.clientWidth || 660);
    root.querySelectorAll<SVGElement>('.solved-scale').forEach(svg=>{svg.setAttribute('viewBox',`0 0 ${width} 200`);svg.innerHTML=solvedScale(worst.ratio,shipped.ratio,width);});
    slider.setAttribute('aria-valuetext',`${L.toFixed(4)} ${CONTENT.solved.lightness}; ${worst.ratio.toFixed(2)}:1 ${CONTENT.solved.on} ${worst.name}`);
  };
  const reset = (): void => {
    source=inputs[controller.theme]; base=source.accents[selected.accent]; surfaces=probeSurfaces(source); dir=failDirection(source); limit=floorLimit(base,surfaces,dir);
    slider.min=String(base[0]-Math.floor((base[0]-0.25)/0.0005)*0.0005);
    slider.max=String(base[0]+Math.floor((0.95-base[0])/0.0005)*0.0005);
    slider.value=String(base[0]); root.querySelectorAll<HTMLButtonElement>('[data-solved-accent]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset['solvedAccent']===selected.accent))); draw();
  };
  root.querySelectorAll<HTMLButtonElement>('[data-solved-accent]').forEach(button=>{button.disabled=false;button.addEventListener('click',()=>{selected=SOLVED_CHIPS.find(chip=>chip.accent===button.dataset['solvedAccent'])!;reset();},{signal});});
  slider.hidden=false;slider.disabled=false;hold.disabled=false;
  slider.addEventListener('input',draw,{signal});hold.addEventListener('change',draw,{signal});
  root.ownerDocument?.defaultView?.addEventListener('resize',draw,{signal});
  const unsubscribe=controller.subscribe(reset); reset();
  return ()=>{lifetime.abort();unsubscribe();};
}
