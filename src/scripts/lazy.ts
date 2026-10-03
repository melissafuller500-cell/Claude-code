/** Charge un module seulement quand son élément approche de l'écran (îlot différé). */
export function lazy(selector: string, load: () => Promise<{ init: (el: HTMLElement) => void }>) {
  const els = document.querySelectorAll<HTMLElement>(selector);
  if (!els.length) return;
  const start = (el: HTMLElement) => load().then((m) => m.init(el));
  if (!('IntersectionObserver' in window)) return els.forEach(start);
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); start(e.target as HTMLElement); } }),
    { rootMargin: '300px 0px' },
  );
  els.forEach((el) => io.observe(el));
}
