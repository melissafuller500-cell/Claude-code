/** Bouton « Copier » : seul JavaScript autorisé sur les articles (section 14). */
import { track } from './track';

const announce = (msg: string) => {
  let live = document.getElementById('copy-live');
  if (!live) {
    live = Object.assign(document.createElement('p'), { id: 'copy-live', className: 'sr-only' });
    live.setAttribute('role', 'status');
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => (live!.textContent = msg), 30);
};

export function bindCopy() {
  const html = document.documentElement;
  if (html.dataset.copyBound) return;
  html.dataset.copyBound = '1';
  const en = html.lang === 'en';
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-copy]');
    if (!b) return;
    const src = document.querySelector<HTMLElement>(b.dataset.copy!);
    if (!src) return;
    const label = b.textContent;
    const ok = () => {
      b.classList.add('done');
      b.textContent = en ? 'Copied' : 'Copié';
      announce(en ? 'Copied to clipboard' : 'Copié dans le presse-papiers');
      track('template_copy', { target: b.dataset.copy! });
      setTimeout(() => { b.classList.remove('done'); b.textContent = label; }, 1600);
    };
    const fallback = () => {
      const range = document.createRange();
      range.selectNodeContents(src);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      announce(en ? 'Text selected: copy it' : 'Texte sélectionné : copiez-le');
    };
    const text = 'value' in src ? (src as HTMLTextAreaElement).value : src.innerText;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  });
}
