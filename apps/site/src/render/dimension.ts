import { escapeHtml } from './html.js';

export function dimensionLine(o: {
  x0: number; y0: number; x1: number; y1: number;
  label?: string; tone?: 'text' | 'error'; gap?: boolean;
}): string {
  const length = Math.hypot(o.x1 - o.x0, o.y1 - o.y0);
  const angle = Math.atan2(o.y1 - o.y0, o.x1 - o.x0) * 180 / Math.PI;
  const key = Math.min(14, length / 4);
  const labelWidth = (o.label?.length ?? 0) * 7 + 12;
  const gap = Boolean(o.label) && o.gap !== false && labelWidth <= length - key - 16;
  const middle = length / 2;
  const structure = gap ? `M${key} 0H${middle - labelWidth / 2}M${middle + labelWidth / 2} 0H${length}`
    : `M${key} 0H${length}`;
  const label = o.label === undefined ? '' : `<text x="${gap ? middle : length + 12}" y="0" text-anchor="${gap ? 'middle' : 'start'}" dominant-baseline="middle" fill="var(${o.tone === 'error' ? '--status-error-text' : '--n-text-secondary'})">${escapeHtml(o.label)}</text>`;
  return `<g transform="translate(${o.x0} ${o.y0}) rotate(${angle})"><path d="M0 0H${key}" stroke="var(--a-gold)"/><path d="${structure}" stroke="var(--n-divider)"/><path d="M${length - 4} -4L${length + 4} 4" stroke="var(--n-divider)"/>${label}</g>`;
}
