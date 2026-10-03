import { compute, CALC_DEFAULTS, type CalcInput } from '../lib/calc';

/** Remplissage de la jauge à l'entrée dans l'écran, puis suivi des valeurs du calculateur. */
export function init(el: HTMLElement) {
  const en = el.dataset.lang === 'en';
  const u = en ? 'd' : 'j';
  const set = (c: CalcInput) => {
    const R = compute(c);
    const real = Math.max(1, Math.round(c.real));
    const term = Math.min(Math.max(0, Math.round(c.term)), real);
    el.style.setProperty('--g', String(R.projected / real));
    el.style.setProperty('--t', `${(term / real) * 100}%`);
    el.querySelector('[data-g="num"]')!.textContent = String(Math.round(R.projected));
    el.querySelector('[data-g="from"]')!.textContent = `${real} ${u}`;
    el.querySelector('[data-g="cap"]')!.textContent = en
      ? `Average payment time. Your clients pay at ${real} d; your contract says ${term} d. Target with the three workstreams: ${Math.round(R.projected)} d.`
      : `Délai moyen de paiement. Vos clients paient à ${real} j ; votre contrat prévoit ${term} j. Objectif avec les trois chantiers : ${Math.round(R.projected)} j.`;
  };
  // Départ « plein » (délai réel), puis descente vers l'objectif.
  el.setAttribute('data-start', '');
  requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute('data-start')));
  document.addEventListener('ntg:calc', (e) => set((e as CustomEvent<CalcInput>).detail));
  set((window as unknown as { ntgCalc?: CalcInput }).ntgCalc ?? CALC_DEFAULTS);
}
