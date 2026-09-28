export function mountRail(nav: HTMLElement, hero: Element): () => void {
  const document = nav.ownerDocument;
  const window = document.defaultView;
  if (!window) return () => {};
  const anchors = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const targets = anchors.map((anchor) => document.getElementById(anchor.hash.slice(1)));
  const update = (): void => {
    const box = hero.getBoundingClientRect();
    const gutter = targets[0]?.getBoundingClientRect().left ?? box.left;
    nav.hidden = gutter < 190 || box.bottom > 0;
    nav.style.left = `${Math.max(16, gutter - 174)}px`;
    let active = 0;
    targets.forEach((target, index) => { if (target && target.getBoundingClientRect().top <= window.innerHeight * 0.45) active = index; });
    anchors.forEach((anchor, index) => {
      if (index === active) anchor.setAttribute('aria-current', 'location');
      else anchor.removeAttribute('aria-current');
    });
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('hashchange', update);
  return () => {
    window.removeEventListener('resize', update); window.removeEventListener('scroll', update);
    window.removeEventListener('hashchange', update);
  };
}
