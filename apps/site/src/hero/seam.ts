const clamp = (p: number): number => Math.max(0, Math.min(1, p));
export const FLICK = 1;
export const MAGNET = 0.06;
export const TAU = 320;
export const glide = (x0: number, v: number, tau = TAU): ((t: number) => number) =>
  (t) => x0 + v * tau * (1 - Math.exp(-Math.max(0, t) / tau));
export const settle = (p: number): number => p >= 1 - MAGNET ? 1 : p <= MAGNET ? 0 : p;
export const normalSpeed = (v: number, width: number, height: number): number => v * (width + height) / Math.SQRT2;
export const commitsOnRelease = (p: number, v: number, width: number, height: number): boolean =>
  v >= 0 && (settle(p + v * TAU) === 1 || normalSpeed(v, width, height) >= FLICK);
export const restingShare = (p: number, v: number): number => Math.min(1 - MAGNET, settle(p + v * TAU));
export function releaseVelocity(samples: readonly (readonly [t: number, x: number])[], now: number, window = 90): number {
  const recent = samples.filter(([t]) => now - t >= 0 && now - t <= window);
  if (recent.length < 2) return 0;
  const first = recent[0]!, last = recent[recent.length - 1]!;
  return (last[1] - first[1]) / Math.max(16, last[0] - first[0]);
}
export function keyStep(key: string, p: number): number | null {
  if (key === 'Home') return 0;
  if (key === 'End') return 1;
  const steps: Record<string, number> = { ArrowLeft: 0.05, ArrowUp: 0.05, ArrowRight: -0.05, ArrowDown: -0.05, PageUp: 0.25, PageDown: -0.25 };
  const step = steps[key];
  return step === undefined ? null : clamp(p + step);
}
export function seamGeometry(p: number, width: number, height: number): { top: number; bottom: number; clip: string } {
  const top = (1 - clamp(p)) * (width + height), bottom = top - height;
  const right = Math.max(width, top);
  return { top, bottom, clip: `polygon(${top}px 0, ${right}px 0, ${right}px ${height}px, ${bottom}px ${height}px)` };
}
export const shareAt = (x: number, y: number, width: number, height: number): number =>
  width + height > 0 ? clamp(1 - (x + y) / (width + height)) : 0;
export function inGrabBand(
  event: { x: number; y: number; pointerType: string; onTab: boolean },
  p: number, width: number, height: number, band = 48,
): boolean {
  if (event.onTab) return true;
  return event.pointerType !== 'touch' && Math.abs(event.x - (seamGeometry(p, width, height).top - event.y)) <= band;
}
