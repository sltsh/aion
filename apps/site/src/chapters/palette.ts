import { dimensionLine } from '../render/dimension.js';

export function mountPaletteChapter(root: HTMLElement): () => void {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  let pointer = '', focus = '';
  const charts = [...root.querySelectorAll<HTMLElement>('.palette-chart')];
  const draw = (role: string): void => {
    for (const chart of charts) {
      const svg = chart.querySelector<SVGElement>('[data-palette-margin]')!;
      svg.innerHTML = '';
      if (!role) continue;
      const column = chart.querySelector<HTMLElement>(`[data-palette-column="${role}"]`)!;
      const columns = chart.querySelector<HTMLElement>('.palette-columns')!;
      const bounds = chart.getBoundingClientRect(), plot = columns.getBoundingClientRect();
      const selected = column.getBoundingClientRect();
      const ratio = Number(column.dataset['ratio']), ceiling = Number(chart.dataset['paletteCeiling']);
      const rows = root.ownerDocument?.defaultView?.matchMedia('(max-width: 599px)').matches ?? false;
      const left = plot.left - bounds.left, bottom = plot.bottom - bounds.top;
      const x = selected.left - bounds.left + 12;
      const y = selected.bottom - bounds.top - 19;
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      svg.innerHTML = dimensionLine(rows
        ? {x0: left + plot.width * 4.5 / ceiling, y0: y, x1: left + plot.width * ratio / ceiling, y1: y,
          label: `${ratio >= 4.5 ? '+' : '−'}${Math.abs(ratio - 4.5).toFixed(2)}`}
        : {x0: x, y0: bottom - plot.height * 4.5 / ceiling, x1: x, y1: bottom - plot.height * ratio / ceiling,
          label: `${ratio >= 4.5 ? '+' : '−'}${Math.abs(ratio - 4.5).toFixed(2)}`});
    }
  };
  const set = (): void => {
    const role = focus || pointer;
    draw(role);
    root.querySelectorAll<HTMLElement>('[data-palette-column], [data-palette-token]').forEach((node) => {
      node.toggleAttribute('data-linked', !!role && (node.dataset['paletteColumn'] ?? node.dataset['paletteToken']) === role);
    });
  };
  root.querySelectorAll<HTMLElement>('[data-palette-column], [data-palette-token]').forEach((node) => {
    const role = node.dataset['paletteColumn'] ?? node.dataset['paletteToken'] ?? '';
    node.addEventListener('pointerenter', () => { pointer = role; set(); }, { signal });
    node.addEventListener('pointerleave', () => { pointer = ''; set(); }, { signal });
    node.addEventListener('focus', () => { focus = role; set(); }, { signal });
    node.addEventListener('blur', () => { focus = ''; set(); }, { signal });
  });
  root.ownerDocument?.defaultView?.addEventListener('resize', set, { signal });
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(set);
  charts.forEach(chart => observer?.observe(chart));
  return () => { lifetime.abort(); observer?.disconnect(); draw(''); root.querySelectorAll('[data-linked]').forEach((node) => node.removeAttribute('data-linked')); };
}
