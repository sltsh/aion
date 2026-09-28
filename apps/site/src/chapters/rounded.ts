import { contrast, contrastEmitted, hex, roundingFlip, solveLightness, srgbChannels } from '@sltsh/aion-tokens';
import type { Oklch } from '@sltsh/aion-tokens';
import type { ThemeController } from '../theme.js';
import type { ProbeInputs } from './probe.js';
import { CONTENT } from '../content.js';
export const roundedFloor = (base: Oklch, background: Oklch): number => solveLightness(base[1],base[2],background,4.5,base[0]>background[0]?'up':'down');
export const roundedFlip = (base: Oklch, background: Oklch): number | null => roundingFlip(base,background);
export function channelRows(colour: Oklch): readonly { name: string; exact: number; byte: number; direction: 'up'|'down'|'exact' }[] {
  const channels=srgbChannels(colour);
  return ['R','G','B'].map((name,i)=>{const exact=channels.exact[i]!,byte=channels.bytes[i]!;return {name,exact,byte,direction:byte>exact?'up':byte<exact?'down':'exact'};});
}
export function roundedStep(key: string, L: number): number | null {
  const steps: Record<string,number>={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:10,PageDown:-10};
  return steps[key]===undefined?null:L+steps[key]*0.00005;
}
export function roundedView(base: Oklch, background: Oklch, L: number, showHex = false): string {
  const copy=CONTENT.rounded,colour:Oklch=[L,base[1],base[2]],exact=contrast(colour,background),emitted=contrastEmitted(colour,background),gap=emitted-exact;
  const verdict=(ratio:number):string=>`<span data-verdict="${ratio>=4.5?'pass':'fail'}">${ratio>=4.5?copy.pass:copy.fail}</span>`;
  return `<div class="rounded-channels">${channelRows(colour).map(row=>`<div class="rounded-channel"><b>${row.name}</b><span class="channel-exact">${row.exact.toFixed(2)}</span><span>${copy.directions[row.direction]}</span><b class="channel-byte">${row.byte}</b></div>`).join('')}</div>
    ${showHex?`<div class="rounded-hex"><i style="background:${hex(colour)}" aria-hidden="true"></i>${hex(colour)}</div>`:''}
    <div class="rounded-pair"><div><span>${copy.exact}</span><b>${exact.toFixed(3)}<small>:1</small></b>${verdict(exact)}</div><div class="rounded-gap"><span>${copy.gap}</span><b>${gap>=0?'+':'−'}${Math.abs(gap).toFixed(3)}</b></div><div><span>${copy.screen}</span><b>${emitted.toFixed(3)}<small>:1</small></b>${verdict(emitted)}</div></div>
    <p class="rounded-note">${exact>=4.5&&emitted<4.5?copy.flipNote:exact<4.5&&emitted>=4.5?copy.helpNote:copy.dragNote}</p>`;
}
export function mountRounded(root: HTMLElement, controller: ThemeController, inputs: ProbeInputs): () => void {
  const lifetime=new AbortController(),{signal}=lifetime;
  const slider=root.querySelector<HTMLInputElement>('[data-rounded-lightness]')!,find=root.querySelector<HTMLButtonElement>('[data-rounded-find]')!;
  let base=inputs[controller.theme].comment,background=inputs[controller.theme].neutral.editor,flip:number|null=null;
  const draw=():void=>{
    const L=Number(slider.value);
    root.querySelectorAll<HTMLElement>('[data-rounded-values]').forEach(node=>{node.innerHTML=roundedView(base,background,L,true);});
    slider.setAttribute('aria-valuetext',`${L.toFixed(5)} ${CONTENT.rounded.lightness}`);
  };
  const reset=():void=>{
    const source=inputs[controller.theme];base=source.comment;background=source.neutral.editor;
    const floor=roundedFloor(base,background);slider.min=String(Math.max(0,floor-0.02));slider.max=String(Math.min(1,floor+0.02));slider.value=String(floor);
    flip=roundedFlip(base,background);find.disabled=flip===null;draw();
  };
  slider.hidden=false;slider.disabled=false;
  slider.addEventListener('input',draw,{signal});
  slider.addEventListener('keydown',event=>{const next=roundedStep(event.key,Number(slider.value));if(next===null)return;event.preventDefault();slider.value=String(Math.max(Number(slider.min),Math.min(Number(slider.max),next)));draw();},{signal});
  find.addEventListener('click',()=>{if(flip!==null){slider.value=String(flip);draw();}},{signal});
  const unsubscribe=controller.subscribe(reset);reset();
  return ()=>{lifetime.abort();unsubscribe();};
}
