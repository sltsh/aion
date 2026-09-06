import type { Oklch } from './oklch.js';
import { compositeEmitted, contrastEmitted, hex, hexToOklch, inGamut } from './oklch.js';
import type { OverlayName } from './palette.js';
import { overlay } from './palette.js';

export interface Marker {
  /** Hues to try, in degrees. A marker keeps its meaning inside a narrow band. */
  readonly hues: readonly number[];
  /** The surface the marker has to separate from. */
  readonly against: Oklch;
  /** Every foreground that can land on the marker, named. */
  readonly foregrounds: Record<string, Oklch>;
  /** Overlay stacks the renderer can paint over the marker. `[]` is the bare marker. */
  readonly stacks: readonly (readonly OverlayName[])[];
  readonly floor: number;
  /** Emitted chroma below this reads as grey rather than as the hue. */
  readonly minChroma?: number;
  readonly lightness?: readonly [number, number];
  readonly chroma?: readonly [number, number];
}

export interface Solution {
  readonly colour: Oklch;
  readonly hex: string;
  /** OKLab distance from `against`. This is what a reader sees, not the ratio. */
  readonly distance: number;
  readonly ratio: number;
  /** The foreground and stack that stop the marker going further. */
  readonly binds: { readonly foreground: string; readonly stack: string; readonly ratio: number };
}

const STEP = { lightness: 0.002, chroma: 0.002 } as const;

const stackOn = (base: Oklch, names: readonly OverlayName[]): Oklch =>
  names.reduce((under, name) => compositeEmitted(overlay[name].color, overlay[name].alpha, under), base);

const toLab = (c: Oklch): [number, number, number] =>
  [c[0], c[1] * Math.cos((c[2] * Math.PI) / 180), c[1] * Math.sin((c[2] * Math.PI) / 180)];

/** Distance between the colours a screen shows, not between the ones the palette asks for. */
export function distanceEmitted(a: Oklch, b: Oklch): number {
  const [al, aa, ab] = toLab(hexToOklch(hex(a)));
  const [bl, ba, bb] = toLab(hexToOklch(hex(b)));
  return Math.hypot(al - bl, aa - ba, ab - bb);
}

/** The foreground and stack with the least room left, and how much room that is. */
export function binding(colour: Oklch, marker: Marker): Solution['binds'] {
  let worst: Solution['binds'] | null = null;
  for (const stack of marker.stacks) {
    const background = stackOn(colour, stack);
    for (const [foreground, value] of Object.entries(marker.foregrounds)) {
      const ratio = contrastEmitted(value, background);
      if (worst === null || ratio < worst.ratio) {
        worst = { foreground, stack: stack.length === 0 ? 'bare' : stack.join(' + '), ratio };
      }
    }
  }
  if (worst === null) throw new Error('a marker needs at least one foreground and one stack');
  return worst;
}

/**
 * The most visible colour a marker can take without dropping a foreground below the floor.
 *
 * Contrast is read from the emitted 8-bit hex, after the gamut clip and the rounding, so it
 * is not a smooth function of lightness and cannot be inverted. This searches instead. It
 * reports what binds, because that is the question worth asking next: a marker held back by
 * the comment wants a lighter comment, and one held back by an accent has nothing left.
 */
export function solveMarker(marker: Marker): Solution | null {
  const [minL, maxL] = marker.lightness ?? [0.06, 0.45];
  const [minC, maxC] = marker.chroma ?? [0.01, 0.18];
  const minChroma = marker.minChroma ?? 0;
  let best: Solution | null = null;
  for (const hue of marker.hues) {
    for (let l = minL; l <= maxL; l += STEP.lightness) {
      for (let c = minC; c <= maxC; c += STEP.chroma) {
        const colour: Oklch = [l, c, hue];
        if (!inGamut(colour) || hexToOklch(hex(colour))[1] < minChroma) continue;
        const binds = binding(colour, marker);
        if (binds.ratio < marker.floor) continue;
        const distance = distanceEmitted(colour, marker.against);
        if (best !== null && distance <= best.distance) continue;
        best = { colour, hex: hex(colour), distance, ratio: contrastEmitted(colour, marker.against), binds };
      }
    }
  }
  return best;
}
