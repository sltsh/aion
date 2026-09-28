import { escapeHtml } from './html.js';

export function dimensionLine(o: {
  x0: number; y0: number; x1: number; y1: number;
  label?: string; tone?: 'text' | 'error'; gap?: boolean;
}): string {
  const length = Math.hypot(o.x1 - o.x0, o.y1 - o.y0);
  const angle = Math.atan2(o.y1 - o.y0, o.x1 - o.x0) * 180 / Math.PI;
  const key = Math.min(14, length / 4);
  const labelWidth = (o.label?.length ?? 0) * 7 + 12;
  const radians = angle * Math.PI / 180;
  const labelExtent = Math.abs(Math.cos(radians)) * labelWidth + Math.abs(Math.sin(radians)) * 24;
  const gap = Boolean(o.label) && o.gap !== false && labelExtent <= length - key - 16;
  const middle = length / 2;
  const structure = gap ? `M${key} 0H${middle - labelExtent / 2}M${middle + labelExtent / 2} 0H${length}`
    : `M${key} 0H${length}`;
  const distance = gap ? middle : length + 12;
  const unitX = length ? (o.x1 - o.x0) / length : 1;
  const unitY = length ? (o.y1 - o.y0) / length : 0;
  const label = o.label === undefined ? '' : `<text class="dimension-label${o.tone === 'error' ? ' dimension-label-error' : ''}" x="${o.x0 + distance * unitX}" y="${o.y0 + distance * unitY}" text-anchor="${gap || Math.abs(unitX) < .01 ? 'middle' : unitX < 0 ? 'end' : 'start'}" dominant-baseline="middle">${escapeHtml(o.label)}</text>`;
  return `<g class="dimension-line"><g transform="translate(${o.x0} ${o.y0}) rotate(${angle})"><path d="M0 0H${key}" stroke="var(--a-gold)"/><path d="${structure}" stroke="var(--n-divider)"/><path d="M${length - 4} -4L${length + 4} 4" stroke="var(--n-divider)"/></g>${label}</g>`;
}
