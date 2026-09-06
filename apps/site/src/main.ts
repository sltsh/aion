import '@sltsh/aion-css/aion.css';
import './styles.css';

const COPIED_MS = 2000;

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const source = target.closest<HTMLElement>('[data-copy]');
  if (source) {
    const scheme = document.body.dataset['scheme'] === 'light' ? 'light' : 'dark';
    const value = source.dataset['text'] ?? source.dataset[scheme] ?? source.dataset['dark'];
    if (value === undefined) return;
    void navigator.clipboard.writeText(value).then(() => {
      source.dataset['copied'] = 'true';
      setTimeout(() => { delete source.dataset['copied']; }, COPIED_MS);
    });
    return;
  }

  if (target.closest('[data-scheme-toggle]')) {
    const next = document.body.dataset['scheme'] === 'light' ? 'dark' : 'light';
    document.body.dataset['scheme'] = next;
    document.documentElement.dataset['theme'] = next;
    for (const node of document.querySelectorAll<HTMLElement>('.swatch')) {
      const hexNode = node.querySelector('.swatch-hex');
      const value = node.dataset[next];
      if (hexNode && value !== undefined) hexNode.textContent = value;
    }
  }
});
