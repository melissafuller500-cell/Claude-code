import { compute, CALC_DEFAULTS, type CalcInput } from '../lib/calc';

/** Remplissage de la jauge à l'entrée dans l'écran, puis suivi des valeurs du calculateur. */
export function init(el: HTMLElement) {
  const en = el.dataset.lang === 'en';
  const u = en ? 'd' : 'j';
  // Le chiffre baisse chantier après chantier, au fil du défilement (0 à 3 chantiers « traversés »).
  let stage = 0;
  let last: CalcInput = CALC_DEFAULTS;
  const steps = [...el.querySelectorAll<HTMLElement>('.g-steps li')];
  const set = (c: CalcInput) => {
    last = c;
    const full = compute(c);
    const R = { ...full, projected: c.real - (c.real - full.projected) * (stage / 3) };
    const real = Math.max(1, Math.round(c.real));
    const term = Math.min(Math.max(0, Math.round(c.term)), real);
    el.style.setProperty('--g', String(R.projected / real));
    el.style.setProperty('--t', `${(term / real) * 100}%`);
    el.querySelector('[data-g="num"]')!.textContent = String(Math.round(R.projected));
    el.querySelector('[data-g="from"]')!.textContent = `${real} ${u}`;
    el.querySelector('[data-g="cap"]')!.textContent = en
      ? `Average payment time. Your clients pay at ${real} d; your contract says ${term} d. Target with the three workstreams: ${Math.round(full.projected)} d.`
      : `Délai moyen de paiement. Vos clients paient à ${real} j ; votre contrat prévoit ${term} j. Objectif avec les trois chantiers : ${Math.round(full.projected)} j.`;
  };
  // Départ « plein » (délai réel), puis descente vers l'objectif.
  el.setAttribute('data-start', '');
  requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute('data-start')));
  document.addEventListener('ntg:calc', (e) => set((e as CustomEvent<CalcInput>).detail));
  const cards = [...document.querySelectorAll<HTMLElement>('[data-step]')];
  if (cards.length) {
    // Un chantier compte comme « traversé » quand son haut passe au-dessus de 60 % de la hauteur d'écran.
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = innerHeight * 0.6;
      const n = cards.filter((c) => c.getBoundingClientRect().top < line).length;
      if (n !== stage) {
        stage = n;
        steps.forEach((li, i) => li.classList.toggle('on', i < stage));
        set(last);
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  } else stage = 3;
  set((window as unknown as { ntgCalc?: CalcInput }).ntgCalc ?? CALC_DEFAULTS);
}
