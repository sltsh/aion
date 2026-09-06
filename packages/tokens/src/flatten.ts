import type { Oklch } from './oklch.js';
import { hex, hexAlpha } from './oklch.js';

const isOklch = (value: unknown): value is Oklch =>
  Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number');

const isOverlay = (value: unknown): value is { color: Oklch; alpha: number } =>
  typeof value === 'object' && value !== null && 'color' in value && 'alpha' in value &&
  isOklch((value as { color: unknown }).color);

export function flatten(tree: unknown, prefix = ''): Record<string, string> {
  if (isOklch(tree)) return { [prefix]: hex(tree) };
  if (isOverlay(tree)) return { [prefix]: hexAlpha(tree.color, tree.alpha) };
  if (typeof tree !== 'object' || tree === null) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    Object.assign(out, flatten(value, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}
