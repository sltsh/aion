import {
  contrast, contrastEmitted, luminance, oklchToLinearSrgb, solveLightness, type Oklch,
} from './oklch.js';

const LIGHTNESS_STEP = 0.00005;
const LIGHTNESS_LAST = 20000;
const BAND = 0.1;
type Channels = readonly [number, number, number];

/** Clamped, gamma-encoded sRGB channels before and after the emitter's byte rounding. */
export function srgbChannels(c: Oklch): { exact: Channels; bytes: Channels } {
  const exact = oklchToLinearSrgb(...c).map((value) => {
    const u = Math.min(1, Math.max(0, value));
    const encoded = u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, encoded)) * 255;
  }) as [number, number, number];
  return { exact, bytes: exact.map(Math.round) as [number, number, number] };
}

const rawLuminance = (L: number, C: number, H: number): number => {
  const [r, g, b] = oklchToLinearSrgb(L, C, H);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Unclipped luminance is cubic in L. Partition at its stationary points so bisection
// retains every band, including both sides of the background and low-L reversals.
function monotoneEndpoints(C: number, H: number): number[] {
  const a = C * Math.cos(H * Math.PI / 180);
  const b = C * Math.sin(H * Math.PI / 180);
  const offsets = [
    0.3963377774 * a + 0.2158037573 * b,
    -0.1055613458 * a - 0.0638541728 * b,
    -0.0894841775 * a - 1.2914855480 * b,
  ];
  const weights = [
    0.2126 * 4.0767416621 - 0.7152 * 1.2684380046 - 0.0722 * 0.0041960863,
    -0.2126 * 3.3077115913 + 0.7152 * 2.6097574011 - 0.0722 * 0.7034186147,
    0.2126 * 0.2309699292 - 0.7152 * 0.3413193965 + 0.0722 * 1.7076147010,
  ];
  const A = weights.reduce((sum, w) => sum + w, 0);
  const B = weights.reduce((sum, w, i) => sum + 2 * w * offsets[i]!, 0);
  const D = weights.reduce((sum, w, i) => sum + w * offsets[i]! ** 2, 0);
  const discriminant = B * B - 4 * A * D;
  const roots = discriminant >= 0
    ? [(-B - Math.sqrt(discriminant)) / (2 * A), (-B + Math.sqrt(discriminant)) / (2 * A)]
    : [];
  return [0, ...roots.filter((v) => v > 0 && v < 1), 1].sort((x, y) => x - y);
}

function crossing(C: number, H: number, target: number, start: number, end: number): number {
  let lo = start, hi = end;
  const ascending = rawLuminance(end, C, H) >= rawLuminance(start, C, H);
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    if ((rawLuminance(mid, C, H) < target) === ascending) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Largest observed rounding shift on the documented strict-gamut grid near the floor. */
export function roundingShift(background: Oklch, floor = 4.5): { shift: number; colour: Oklch } {
  return roundingShiftOnGrid(background, floor);
}

/** @internal Hue-index stride for the independent full-scan test oracle. */
export function roundingShiftOnGrid(
  background: Oklch, floor = 4.5, hueStride = 1,
): { shift: number; colour: Oklch } {
  if (!Number.isFinite(floor) || floor < 1) throw new RangeError('floor must be at least 1');
  if (!Number.isInteger(hueStride) || hueStride < 1) throw new RangeError('hue stride must be a positive integer');
  const bg = luminance(background) + 0.05;
  const lower = Math.max(1, floor - BAND), upper = floor + BAND;
  const bands = [[bg / upper - 0.05, bg / lower - 0.05], [lower * bg - 0.05, upper * bg - 0.05]];
  let shift = -1;
  let colour: Oklch = [0, 0, 0];
  for (let i = 0; i < 120; i += hueStride) {
    const H = 3 * i;
    for (let j = 0; j <= 20; j += 1) {
      const C = 0.01 * j;
      const endpoints = monotoneEndpoints(C, H);
      const ranges: [number, number][] = [];
      for (let e = 1; e < endpoints.length; e += 1) {
        const start = endpoints[e - 1]!, end = endpoints[e]!;
        const first = rawLuminance(start, C, H), last = rawLuminance(end, C, H);
        for (const [bandLo, bandHi] of bands as [number, number][]) {
          const lo = Math.max(bandLo, Math.min(first, last));
          const hi = Math.min(bandHi, Math.max(first, last));
          if (lo > hi) continue;
          const x = crossing(C, H, lo, start, end), y = crossing(C, H, hi, start, end);
          // Include neighbours before applying the exact predicate: bisection and
          // algebraic band boundaries can round differently at a grid endpoint.
          ranges.push([
            Math.max(0, Math.floor(Math.min(x, y) / LIGHTNESS_STEP) - 1),
            Math.min(LIGHTNESS_LAST, Math.ceil(Math.max(x, y) / LIGHTNESS_STEP) + 1),
          ]);
        }
      }
      ranges.sort((a, b) => a[0] - b[0]);
      let visited = -1;
      for (const [start, end] of ranges) {
        for (let k = Math.max(start, visited + 1); k <= end; k += 1) {
          visited = k;
          const candidate: Oklch = [LIGHTNESS_STEP * k, C, H];
          if (!oklchToLinearSrgb(...candidate).every((v) => v >= 0 && v <= 1)) continue;
          const exact = contrast(candidate, background);
          if (Math.abs(exact - floor) > BAND) continue;
          const gap = Math.abs(contrastEmitted(candidate, background) - exact);
          if (gap > shift) { shift = gap; colour = candidate; }
        }
      }
    }
  }
  if (shift < 0) throw new RangeError('no strictly in-gamut grid point lies in the contrast band');
  return { shift, colour };
}

/** First sampled lightness that passes continuous contrast but fails emitted contrast. */
export function roundingFlip(
  base: Oklch, background: Oklch,
  { window = 0.02, step = LIGHTNESS_STEP, floor = 4.5 }: { window?: number; step?: number; floor?: number } = {},
): number | null {
  if (!Number.isFinite(window) || window < 0) throw new RangeError('window must be non-negative');
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('step must be positive');
  if (!Number.isFinite(floor) || floor < 1) throw new RangeError('floor must be at least 1');
  const direction = luminance(base) >= luminance(background) ? 'up' : 'down';
  const centre = solveLightness(base[1], base[2], background, floor, direction);
  const start = centre - window, end = centre + window;
  for (let i = 0; i <= Math.floor((2 * window) / step); i += 1) {
    const L = start + i * step;
    if (L < 0 || L > 1 || L > end) continue;
    const candidate: Oklch = [L, base[1], base[2]];
    if (contrast(candidate, background) >= floor && contrastEmitted(candidate, background) < floor) return L;
  }
  return null;
}
