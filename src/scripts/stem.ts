/** La tige : position du bouton et croissance du fil liées au défilement, une feuille par section. */
const LEAF = '<svg viewBox="0 0 40 24"><path d="M0 12C8 0 26-2 40 12 26 26 8 24 0 12Z"/></svg>';

export function init() {
  const stem = document.querySelector<HTMLElement>('[data-stemnav]');
  if (!stem) return;
  const nodesBox = stem.querySelector<HTMLElement>('[data-nodes]')!;
  const bud = stem.querySelector<HTMLElement>('[data-bud]')!;
  let marks = [...document.querySelectorAll<HTMLElement>('[data-stem]')];
  if (!marks.length) marks = [...document.querySelectorAll<HTMLElement>('main .prose h2[id]')];
  let nodes: HTMLElement[] = [];
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const docH = () => document.documentElement.scrollHeight - innerHeight;

  const layout = () => {
    const h = docH();
    nodesBox.textContent = '';
    nodes = marks.map((m, i) => {
      const a = document.createElement('a');
      a.className = `node${i % 2 ? ' even' : ''}`;
      a.href = `#${m.id}`;
      a.tabIndex = -1;
      const top = h > 0 ? clamp((m.getBoundingClientRect().top + scrollY - innerHeight * 0.3) / h) : 0;
      a.style.top = `${top * 100}%`;
      const label = (m.dataset.stem || m.textContent || '').trim();
      a.innerHTML = `<i></i>${LEAF}<b></b>`;
      a.querySelector('b')!.textContent = label.length > 38 ? `${label.slice(0, 36)}…` : label;
      nodesBox.append(a);
      return a;
    });
    frame();
  };

  let ticking = false;
  const frame = () => {
    ticking = false;
    const h = docH();
    const p = h > 0 ? clamp(scrollY / h) : 0;
    stem.style.setProperty('--grow', p.toFixed(4));
    bud.style.top = `${p * 100}%`;
    let cur = -1;
    nodes.forEach((n, i) => { const on = parseFloat(n.style.top) / 100 <= p + 0.002; n.classList.toggle('on', on); if (on) cur = i; });
    nodes.forEach((n, i) => n.classList.toggle('cur', i === cur));
    stem.classList.toggle('bloom', p > 0.985);
  };

  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  let t: number | undefined;
  const relayout = () => { clearTimeout(t); t = window.setTimeout(layout, 150); };
  addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(document.body);
  layout();
}
