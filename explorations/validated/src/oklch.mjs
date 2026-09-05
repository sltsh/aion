export function oklchToLinearSrgb(L, C, H) {
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
export const inGamut = (c) =>
  oklchToLinearSrgb(...c).every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);

const clamp = (v) => Math.min(1, Math.max(0, v));
const encode = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);

export function hex(c) {
  const channels = oklchToLinearSrgb(...c).map(clamp).map(encode);
  return '#' + channels.map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0')).join('');
}

export function hexAlpha(c, alpha) {
  return hex(c) + Math.round(clamp(alpha) * 255).toString(16).padStart(2, '0');
}

export const luminance = (c) => {
  const [r, g, b] = oklchToLinearSrgb(...c).map(clamp);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function hexToOklch(value) {
  const n = parseInt(value.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => v / 255)
    .map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const H = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), H < 0 ? H + 360 : H];
}

export function solveLightness(chroma, hue, background, target, direction) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const ok = contrast([mid, chroma, hue], background) >= target;
    if (direction === 'up' ? ok : !ok) hi = mid;
    else lo = mid;
  }
  return direction === 'up' ? hi : lo;
}
