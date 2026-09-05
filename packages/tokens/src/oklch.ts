export type Oklch = readonly [lightness: number, chroma: number, hue: number];
export type LinearSrgb = readonly [red: number, green: number, blue: number];
export type SolveDirection = 'up' | 'down';

export function oklchToLinearSrgb(L: number, C: number, H: number): LinearSrgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const GAMUT_EPSILON = 0.002;
export const inGamut = (c: Oklch): boolean =>
  oklchToLinearSrgb(...c).every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
const encode = (u: number): number => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);
const byte = (v: number): string => Math.round(clamp(v) * 255).toString(16).padStart(2, '0');

export function hex(c: Oklch): string {
  const channels = oklchToLinearSrgb(...c).map(clamp).map(encode);
  return '#' + channels.map(byte).join('');
}

export function hexAlpha(c: Oklch, alpha: number): string {
  return hex(c) + byte(alpha);
}

export const luminance = (c: Oklch): number => {
  const [r, g, b] = oklchToLinearSrgb(...c).map(clamp) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const srgbLuminance = (channels: readonly number[]): number => {
  const [r, g, b] = channels.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

// A user measures the 8-bit hex that ships, not the ideal OKLCH. Rounding moves the ratio
// by up to 0.06, so the build gate uses this and the solvers use the continuous form.
export function contrastEmitted(a: Oklch, b: Oklch): number {
  const quantise = (c: Oklch): number[] =>
    oklchToLinearSrgb(...c).map(clamp).map(encode).map((v) => Math.round(clamp(v) * 255) / 255);
  const [hi, lo] = [srgbLuminance(quantise(a)), srgbLuminance(quantise(b))].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const emittedChannels = (c: Oklch): [number, number, number] => {
  const [r, g, b] = oklchToLinearSrgb(...c).map(clamp).map(encode)
    .map((v) => Math.round(clamp(v) * 255));
  return [r!, g!, b!];
};

// A decoration ships as an 8-bit colour and an 8-bit alpha byte, and the renderer blends
// those bytes. Compositing in OKLCH instead would miss the rounding on both operands.
export function compositeEmitted(over: Oklch, alpha: number, under: Oklch): Oklch {
  const a = Math.round(clamp(alpha) * 255) / 255;
  const front = emittedChannels(over);
  const back = emittedChannels(under);
  const blend = front.map((v, i) => Math.round(v * a + back[i]! * (1 - a)));
  return hexToOklch('#' + blend.map((v) => v.toString(16).padStart(2, '0')).join(''));
}

export function hexToOklch(value: string): Oklch {
  const n = parseInt(value.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => v / 255)
    .map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const H = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), H < 0 ? H + 360 : H];
}

export function solveLightness(
  chroma: number,
  hue: number,
  background: Oklch,
  target: number,
  direction: SolveDirection,
): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const ok = contrast([mid, chroma, hue], background) >= target;
    if (direction === 'up' ? ok : !ok) hi = mid;
    else lo = mid;
  }
  return direction === 'up' ? hi : lo;
}
