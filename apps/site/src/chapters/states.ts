import { hex } from '@sltsh/aion-tokens';
import type { ThemeController } from '../theme.js';
import type { ProbeInputs } from './probe.js';
import { CONTENT } from '../content.js';
import { disabledReasonAt, enabledAt, drawnBackgrounds, placementRatios, togglePlacement, expandSpan } from './placement.js';
import type { ToolbarLayer } from './placement.js';
export interface CountEnvironment {
  now(): number;
  reducedMotion(): boolean;
  raf(callback: (time: number) => void): number;
  cancelRaf(id: number): void;
  setTimer(callback: () => void, ms: number): number;
  clearTimer(id: number): void;
  value(value: number): void;
  delta(value: number | null): void;
}
interface Count { to: number; frame?: number; timer?: number }
const counts = new WeakMap<CountEnvironment, Count>();
export function cancelCount(env: CountEnvironment, settle = true): void {
  const count = counts.get(env);
  if (!count) return;
  if (count.frame !== undefined) env.cancelRaf(count.frame);
  if (count.timer !== undefined) env.clearTimer(count.timer);
  counts.delete(env);
  if (settle) env.value(count.to);
  env.delta(null);
}
// The shared cubic-bezier's x is time; solve its parameter before evaluating y.
const easeOut = (progress: number): number => {
  if (progress <= 0 || progress >= 1) return progress;
  let low = 0, high = 1;
  for (let i = 0; i < 24; i++) {
    const t = (low+high)/2, rest = 1-t;
    const x = 3*rest*rest*t*0.22 + 3*rest*t*t*0.36 + t*t*t;
    if (x < progress) low = t; else high = t;
  }
  return 1-(1-(low+high)/2)**3;
};
export function countTo(from: number, to: number, env: CountEnvironment): void {
  cancelCount(env, false);
  env.delta(null);
  if (env.reducedMotion() || Math.abs(to-from) < 0.005) { env.value(to); return; }
  const count: Count = { to }, started = env.now();
  counts.set(env, count); env.value(from); env.delta(to-from);
  count.timer = env.setTimer(() => {
    if (counts.get(env) !== count) return;
    env.delta(null); count.timer = undefined;
    if (count.frame === undefined) counts.delete(env);
  }, 1800);
  const tick = (now: number): void => {
    if (counts.get(env) !== count) return;
    const progress = Math.min(1, Math.max(0, (now-started)/560));
    env.value(from + (to-from)*easeOut(progress));
    if (progress < 1) count.frame = env.raf(tick);
    else { count.frame = undefined; if (count.timer === undefined) counts.delete(env); }
  };
  count.frame = env.raf(tick);
}
export function mountStates(root: HTMLElement, controller: ThemeController, inputs: ProbeInputs,
  environment: { reducedMotion: Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>; visibility?: Document }): () => void {
  const lifetime = new AbortController(), { signal } = lifetime;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-state-toggle]')];
  const counters = new Map<HTMLElement, CountEnvironment>();
  let on = new Set<ToolbarLayer>();
  const settle = (): void => { for (const env of counters.values()) cancelCount(env); };
  const draw = (animate: boolean): void => {
    const source = inputs[controller.theme], backgrounds = drawnBackgrounds(on, source);
    const variant = root.querySelector<HTMLElement>(`[data-state-scheme="${controller.theme}"]`)!;
    for (const fragment of variant.querySelectorAll<HTMLElement>('[data-state-fragment]')) {
      const line = Number(fragment.dataset['line']), from = Number(fragment.dataset['from']), to = Number(fragment.dataset['to']);
      const row = backgrounds.find(row => row.span.line === line && row.span.from <= from && row.span.to >= to)!;
      fragment.style.backgroundColor = hex(row.background);
      fragment.dataset['layers'] = row.layers.join(' ');
    }
    const ratios = placementRatios(source, on), lowest = Math.min(...ratios.map(r => r.ratio));
    for (const { role, ratio } of ratios) {
      const meter = variant.querySelector<HTMLElement>(`[data-state-meter="${role}"]`)!;
      const value = meter.querySelector<HTMLElement>('[data-state-value]')!, delta = meter.querySelector<HTMLElement>('[data-state-delta]')!;
      let env = counters.get(value);
      if (!env) {
        env = { now: () => performance.now(), reducedMotion: () => environment.reducedMotion.matches || !!environment.visibility?.hidden,
          raf: callback => requestAnimationFrame(callback), cancelRaf: id => cancelAnimationFrame(id),
          setTimer: (callback, ms) => window.setTimeout(callback, ms), clearTimer: id => window.clearTimeout(id),
          value: number => { value.textContent = `${number.toFixed(2)}:1`; value.dataset['value'] = String(number); },
          delta: number => { delta.textContent = number===null ? '' : `${number>0?'+':'−'}${Math.abs(number).toFixed(2)}`; delta.toggleAttribute('data-delta-visible', number!==null); delta.dataset['direction'] = number!==null && number>0 ? 'up' : 'down'; },
        }; counters.set(value, env);
      }
      countTo(animate ? Number(value.dataset['value']) : ratio, ratio, env);
      meter.dataset['lowest'] = String(ratio===lowest);
      meter.querySelector<HTMLElement>('[data-state-lowest]')!.textContent = ratio===lowest ? CONTENT.states.lowest : '';
      meter.querySelector<HTMLElement>('[data-state-fill]')!.style.width = `${Math.min(100,(ratio-1)/11*100)}%`;
    }
    const reasons = new Set<string>();
    for (const button of buttons) {
      const layer = button.dataset['stateToggle'] as ToolbarLayer, failure = disabledReasonAt(on, layer);
      const span = failure ? expandSpan(failure.span) : null;
      const reason = failure && span ? CONTENT.states.failedSpan(CONTENT.states.reasons[failure.reason], span.line, span.from, span.to) : '';
      button.disabled = false; button.setAttribute('aria-disabled', String(!enabledAt(on, layer))); button.setAttribute('aria-pressed', String(on.has(layer)));
      button.title = reason;
      if (reason) { button.setAttribute('aria-describedby', 'states-reasons'); reasons.add(reason); }
      else button.removeAttribute('aria-describedby');
    }
    root.querySelector<HTMLElement>('[data-state-reasons]')!.textContent = [...reasons].join(' ');
    root.querySelector<HTMLElement>('[data-state-note]')!.textContent = on.size ? CONTENT.states.stacked([...on].map(layer => CONTENT.states.labels[layer as keyof typeof CONTENT.states.labels]).join(', ')) : CONTENT.states.empty;
    variant.querySelector<HTMLElement>('[data-state-bghex]')!.textContent = [...new Set(backgrounds.map(row => hex(row.background)))].join(', ');
    variant.querySelector<HTMLElement>('[data-state-bg-swatch]')!.style.backgroundColor = hex(backgrounds[0]!.background);
  };
  for (const button of buttons) button.addEventListener('click', () => {
    const layer = button.dataset['stateToggle'] as ToolbarLayer;
    if (!enabledAt(on, layer)) return;
    on = togglePlacement(on, layer); draw(true);
  }, { signal });
  const unsubscribe = controller.subscribe(() => { settle(); draw(false); });
  const preference = (): void => { if (environment.reducedMotion.matches) settle(); };
  environment.reducedMotion.addEventListener('change', preference);
  environment.visibility?.addEventListener('visibilitychange', () => { if (environment.visibility?.hidden) settle(); }, { signal });
  environment.visibility?.defaultView?.addEventListener('pagehide', settle, { signal });
  environment.visibility?.defaultView?.addEventListener('pageshow', settle, { signal });
  draw(false);
  return () => { settle(); lifetime.abort(); unsubscribe(); environment.reducedMotion.removeEventListener('change', preference); };
}
