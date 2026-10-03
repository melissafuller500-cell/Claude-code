import { compute, type CalcInput } from '../lib/calc';
import { fmtF, fmtN } from '../lib/format';
import { waLink } from '../data/site';
import { track, bindClickTracking } from './track';

const num = (v: string) => parseFloat(v.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

export function message(c: CalcInput, lang: 'fr' | 'en') {
  const R = compute(c);
  return lang === 'en'
    ? `Hello Noé, here is my calculation:\n- Monthly B2B invoicing: ${fmtF(c.bill, lang)}\n- Actual payment time: ${c.real} d (contract: ${c.term} d)\n- Cash tied up: ${fmtF(R.locked, lang)}\n- Of which due to late payment: ${fmtF(R.lateAmount, lang)}\n- Freed if clients pay ${R.days} d sooner: ${fmtF(R.freed, lang)}\nI'd like to book the free 45-min diagnostic.`
    : `Bonjour Noé, voici mon calcul :\n- Facturation B2B mensuelle : ${fmtF(c.bill, lang)}\n- Délai réel : ${c.real} j (contrat : ${c.term} j)\n- Trésorerie immobilisée : ${fmtF(R.locked, lang)}\n- Dont part due au retard : ${fmtF(R.lateAmount, lang)}\n- Libérée si mes clients paient ${R.days} j plus tôt : ${fmtF(R.freed, lang)}\nJe souhaite réserver le diagnostic gratuit de 45 min.`;
}

export function init(form: HTMLElement) {
  bindClickTracking();
  const lang = (form.dataset.lang === 'en' ? 'en' : 'fr') as 'fr' | 'en';
  const d = lang === 'en' ? 'd' : 'j';
  const $ = <T extends HTMLElement>(s: string) => form.querySelector<T>(s)!;
  const out = (k: string) => form.querySelector<HTMLElement>(`[data-out="${k}"]`)!;
  const field = (n: string) => $<HTMLInputElement>(`[name="${n}"]`);
  const range = field('days');
  let used = false;
  let liveTimer: number | undefined;

  const read = (): CalcInput => ({
    bill: num(field('bill').value),
    real: num(field('real').value),
    term: num(field('term').value),
    rate: num(field('rate').value),
    days: +range.value,
  });

  const render = () => {
    const c = read();
    range.max = String(Math.max(1, Math.round(c.real)));
    if (+range.value > +range.max) range.value = range.max;
    c.days = +range.value;
    range.style.setProperty('--p', `${(c.days / +range.max) * 100}%`);
    const R = compute(c);
    out('daysV').textContent = `${c.days} ${d}`;
    out('locked').textContent = fmtF(R.locked, lang);
    out('late').textContent = fmtF(R.lateAmount, lang);
    out('freedL').textContent = lang === 'en' ? `Cash freed if your clients pay ${c.days} days sooner` : `Trésorerie libérée si vos clients paient ${c.days} jours plus tôt`;
    out('freed').textContent = fmtF(R.freed, lang);
    out('cost').textContent = fmtF(R.yearlyCost, lang);
    out('pct').textContent = `${Math.round(R.absorbed * 100)} %`;
    form.querySelector<HTMLElement>('.tank')!.style.setProperty('--lvl', String(R.absorbed));
    const msg = message(c, lang);
    (out('wa') as HTMLAnchorElement).href = waLink(msg);
    try { sessionStorage.setItem('ntg-calc', JSON.stringify({ lang, msg })); } catch { /* stockage indisponible */ }
    (window as unknown as { ntgCalc?: CalcInput }).ntgCalc = c;
    document.dispatchEvent(new CustomEvent('ntg:calc', { detail: c }));
    // Annonce pour lecteurs d'écran, après une courte pause de saisie.
    clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => {
      out('live').textContent = lang === 'en'
        ? `Cash tied up: ${fmtF(R.locked, lang)}. Freed if paid ${c.days} days sooner: ${fmtF(R.freed, lang)}. Yearly cost: ${fmtF(R.yearlyCost, lang)}.`
        : `Trésorerie immobilisée : ${fmtF(R.locked, lang)}. Libérée si vos clients paient ${c.days} jours plus tôt : ${fmtF(R.freed, lang)}. Coût annuel : ${fmtF(R.yearlyCost, lang)}.`;
    }, 700);
  };

  form.addEventListener('input', () => {
    if (!used) { used = true; track('calculator_use'); }
    render();
  });
  field('bill').addEventListener('blur', (e) => {
    const el = e.target as HTMLInputElement;
    el.value = fmtN(num(el.value), lang);
  });
  render();
}
