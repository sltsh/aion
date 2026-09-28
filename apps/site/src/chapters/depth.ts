import { CONTENT } from '../content.js';

const PARTS = [
  { selector: '.vscode-title', x: 0, y: -156 },
  { selector: '.activity-bar', x: -80, y: 0 },
  { selector: '.side-bar', x: -40, y: 0 },
  { selector: '.tab-bar', x: 0, y: -104 },
  { selector: '.panel', x: 0, y: 52 },
  { selector: '.status-bar', x: 0, y: 104 },
  { selector: '.find-widget', x: 52, y: -52 },
  { selector: '.hover-card', x: 52, y: 52 },
] as const;

export function mountDepth(root: HTMLElement): () => void {
  const stage = root.querySelector<HTMLElement>('[data-depth-stage]');
  const frame = root.querySelector<HTMLElement>('[data-depth-frame]');
  const base = root.querySelector<HTMLElement>('[data-depth-base]');
  const editor = base?.querySelector<HTMLElement>('.window');
  const button = root.querySelector<HTMLButtonElement>('[data-depth-assemble]');
  const view = root.ownerDocument.defaultView;
  if (!stage || !frame || !base || !editor || !button || !view) return () => {};
  const lifetime = new AbortController();
  const { signal } = lifetime;
  let disposed = false;
  let apart = true;
  let hovered = '';
  let focused = '';
  let scale = 1;
  const movers: HTMLElement[] = [];
  const widgets = ['.find-widget', '.hover-card'].map((selector) => editor.querySelector<HTMLElement>(selector));
  const originalVisibility = widgets.map((widget) => widget?.style.visibility ?? '');
  const originalBaseClip = base.style.clipPath;
  const highlight = (): void => {
    const stratum = focused || hovered;
    root.querySelectorAll<HTMLElement>('[data-stratum]').forEach((node) => node.toggleAttribute('data-highlight', !!stratum && node.dataset['stratum'] === stratum));
  };
  const position = (): void => {
    root.toggleAttribute('data-depth-apart', apart);
    button.setAttribute('aria-pressed', String(!apart));
    button.textContent = apart ? CONTENT.depth.putTogether : CONTENT.depth.takeApart;
    frame.style.left = `${apart ? 90 * scale : (stage.clientWidth - 1244 * scale) / 2}px`;
    frame.style.top = `${(apart ? 176 : 20) * scale}px`;
    stage.style.height = `${(apart ? 946 : 726) * scale}px`;
    movers.forEach((mover, index) => { const part = PARTS[index]; if (part) mover.style.transform = apart ? `translate(${part.x}px,${part.y}px)` : 'translate(0,0)'; });
  };
  const measure = (): void => {
    if (disposed || !stage.clientWidth) return;
    movers.splice(0).forEach((node) => node.remove());
    widgets.forEach((widget, index) => { if (widget) widget.style.visibility = originalVisibility[index] ?? ''; });
    base.style.clipPath = originalBaseClip;
    scale = Math.min(1, Math.max(.1, (stage.clientWidth - 180) / 1244));
    frame.style.transform = `scale(${scale})`;
    const bounds = editor.getBoundingClientRect();
    const unit = bounds.width / 1244 || scale;
    const clip = (element: HTMLElement): { x: number; y: number; width: number; height: number; inset: string } => {
      const rect = element.getBoundingClientRect();
      const x = (rect.left - bounds.left) / unit;
      const y = (rect.top - bounds.top) / unit;
      const width = rect.width / unit;
      const height = rect.height / unit;
      return { x, y, width, height, inset: `inset(${y}px ${1244 - x - width}px ${686 - y - height}px ${x}px)` };
    };
    PARTS.forEach((part, index) => {
      const element = editor.querySelector<HTMLElement>(part.selector);
      const label = root.querySelector<HTMLElement>(`[data-depth-part="${index}"]`);
      if (!element || !label) return;
      const rect = clip(element);
      const mover = root.ownerDocument.createElement('div');
      mover.className = 'depth-mover';
      mover.dataset['stratum'] = label.dataset['stratum'];
      const clone = editor.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
      clone.style.clipPath = rect.inset;
      const outline = root.ownerDocument.createElement('div');
      outline.className = 'depth-outline';
      Object.assign(outline.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      const tag = root.ownerDocument.createElement('div');
      tag.className = 'depth-tag';
      tag.innerHTML = label.innerHTML;
      Object.assign(tag.style, { left: `${rect.x}px`, top: `${rect.y - 34}px` });
      mover.append(clone, outline, tag);
      frame.append(mover);
      movers.push(mover);
    });
    const code = editor.querySelector<HTMLElement>('.editor');
    if (code) base.style.clipPath = clip(code).inset;
    widgets.forEach((widget) => { if (widget) widget.style.visibility = 'hidden'; });
    position();
    highlight();
  };
  button.hidden = false;
  button.addEventListener('click', () => { apart = !apart; position(); }, { signal });
  root.querySelectorAll<HTMLElement>('.depth-ruler [data-stratum]').forEach((node) => {
    node.addEventListener('pointerenter', () => { hovered = node.dataset['stratum'] ?? ''; highlight(); }, { signal });
    node.addEventListener('pointerleave', () => { hovered = ''; highlight(); }, { signal });
    node.addEventListener('focus', () => { focused = node.dataset['stratum'] ?? ''; highlight(); }, { signal });
    node.addEventListener('blur', () => { focused = ''; highlight(); }, { signal });
  });
  view.addEventListener('resize', measure, { signal });
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  observer?.observe(stage);
  measure();
  void root.ownerDocument.fonts?.ready.then(measure);
  return () => {
    disposed = true;
    lifetime.abort();
    observer?.disconnect();
    movers.forEach((node) => node.remove());
    widgets.forEach((widget, index) => { if (widget) widget.style.visibility = originalVisibility[index] ?? ''; });
    base.style.clipPath = originalBaseClip;
    root.removeAttribute('data-depth-apart');
    button.hidden = true;
    button.setAttribute('aria-pressed', 'true');
    button.textContent = CONTENT.depth.takeApart;
    frame.removeAttribute('style');
    stage.removeAttribute('style');
    root.querySelectorAll('[data-highlight]').forEach((node) => node.removeAttribute('data-highlight'));
  };
}
