import data from '../data/clauses.json';
import { bindClickTracking } from './track';

export function init(el: HTMLElement) {
  bindClickTracking();
  const lang = el.dataset.lang === 'en' ? 'en' : 'fr';
  const boxes = [...el.querySelectorAll<HTMLInputElement>('input[name="clause"]')];
  const pre = el.querySelector<HTMLElement>('#cl-draft')!;
  const meter = [...el.querySelectorAll<HTMLElement>('[data-meter] i')];
  const render = () => {
    const on = data.clauses.filter((_, i) => boxes[i].checked);
    pre.textContent = on.length ? `${data.heading[lang]}\n\n${on.map((c, i) => `${i + 1}. ${c[lang].text}`).join('\n\n')}` : data.empty[lang];
    meter.forEach((m, i) => m.classList.toggle('on', boxes[i].checked));
  };
  el.addEventListener('change', render);
  render();
}
