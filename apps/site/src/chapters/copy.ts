import { CONTENT } from '../content.js';
type CopyAnimation = (target: HTMLElement, frames: Keyframe[]) => unknown;
const COPIED_MS = 2000;
export function mountCopy(root: Document | HTMLElement, animate: CopyAnimation = () => {}): () => void {
  const doc = root.nodeType === 9 ? root as Document : root.ownerDocument!;
  const view = doc.defaultView;
  const lifetime = new AbortController();
  const { signal } = lifetime;
  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((source) => { source.disabled = false; });
  const status = doc.querySelector<HTMLElement>('.copy-status');
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  const copiedTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  let copyRequest = 0;
  const clearCopy = (source: HTMLElement): void => {
    const previous = copiedTimers.get(source);
    if (previous !== undefined) clearTimeout(previous);
    copiedTimers.delete(source);
    delete source.dataset['copied'];
    delete source.dataset['copyStatus'];
  };
  const clearStatus = (): void => {
    clearTimeout(statusTimer);
    if (!status) return;
    status.textContent = '';
    status.removeAttribute('data-visible');
    status.removeAttribute('data-status');
  };
  const announce = (message: string, visible: boolean, kind: 'success' | 'error'): void => {
    clearStatus();
    if (!status) return;
    status.textContent = message;
    status.toggleAttribute('data-visible', visible);
    status.dataset['status'] = kind;
    statusTimer = setTimeout(clearStatus, COPIED_MS);
  };
  const showCopyResult = (source: HTMLElement, success: boolean, unavailable = false): void => {
    clearCopy(source);
    source.dataset['copyStatus'] = success ? 'success' : 'error';
    if (success) source.dataset['copied'] = 'true';
    announce(success ? CONTENT.copy.success : unavailable ? CONTENT.copy.unavailable : CONTENT.copy.failed, !success, success ? 'success' : 'error');
    copiedTimers.set(source, setTimeout(() => clearCopy(source), COPIED_MS));
    const indicator = source.querySelector<HTMLElement>('.copy-indicator, .swatch-copy');
    if (indicator) animate(indicator, [{ transform: 'translateY(2px)' }, { transform: 'translateY(0)' }]);
    const edge = source.querySelector<HTMLElement>('.swatch-chip') ?? source;
    const styles = view?.getComputedStyle(edge);
    if (!styles) return;
    animate(edge, [
      { borderColor: styles.getPropertyValue(success ? '--aion-status-success-solid' : '--aion-status-error-solid').trim() },
      { borderColor: styles.borderColor },
    ]);
  };

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const source = event.target.closest<HTMLElement>('[data-copy]');
    if (!source || source.matches(':disabled')) return;
    const scheme = doc.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
    const value = source.dataset['text'] ?? source.dataset[scheme] ?? source.dataset['dark'];
    if (value === undefined) return;
    const request = ++copyRequest;
    for (const previous of copiedTimers.keys()) clearCopy(previous);
    clearStatus();
    const done = (success: boolean, unavailable = false): void => {
      if (request === copyRequest && source.isConnected && !signal.aborted && !doc.hidden) showCopyResult(source, success, unavailable);
    };
    if (!view?.navigator.clipboard) { done(false, true); return; }
    try { void view?.navigator.clipboard.writeText(value).then(() => done(true), () => done(false)); }
    catch { done(false); }
  }, { signal });
  const reset = (): void => {
    ++copyRequest;
    for (const source of copiedTimers.keys()) clearCopy(source);
    clearStatus();
  };
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) reset(); }, { signal });
  view?.addEventListener('pagehide', reset, { signal });
  view?.addEventListener('pageshow', (event) => { if (event.persisted) reset(); }, { signal });
  return () => { lifetime.abort(); reset(); };
}
