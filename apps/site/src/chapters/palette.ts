export function mountPaletteChapter(root: HTMLElement): () => void {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  let pointer = '', focus = '';
  const set = (): void => {
    const role = focus || pointer;
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
  return () => { lifetime.abort(); root.querySelectorAll('[data-linked]').forEach((node) => node.removeAttribute('data-linked')); };
}
