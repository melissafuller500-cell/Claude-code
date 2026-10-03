import quiz from '../data/quiz.json';
import { waLink } from '../data/site';
import { track, bindClickTracking } from './track';

export function init(form: HTMLFormElement) {
  bindClickTracking();
  const en = form.dataset.lang === 'en';
  const q = (k: string) => form.querySelector<HTMLElement>(`[data-q="${k}"]`)!;
  let reported = false;
  const render = () => {
    const answers = quiz.questions.map((_, i) => form.querySelector<HTMLInputElement>(`input[name="q${i}"]:checked`)?.value);
    const done = answers.every((a) => a !== undefined);
    const yes = answers.filter((a) => a === '1').length;
    q('n').textContent = String(yes);
    const ring = q('ring') as unknown as SVGCircleElement;
    ring.style.strokeDashoffset = String(326.7 * (1 - yes / 6));
    const v = quiz.verdicts.find((x) => yes >= x.min)!;
    ring.style.stroke = done ? `var(--${v.tone})` : 'var(--spark)';
    const box = q('verdict');
    if (!done) {
      const left = answers.filter((a) => a === undefined).length;
      box.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = en ? `${left} question${left > 1 ? 's' : ''} left.` : `Encore ${left} question${left > 1 ? 's' : ''}.`;
      box.append(p);
    } else {
      const [title, text] = en ? v.en : v.fr;
      box.innerHTML = '';
      const h = document.createElement('h3');
      h.textContent = `${title} · ${yes}/6`;
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = text;
      box.append(h, p);
      if (!reported) { reported = true; track('quiz_complete', { score: yes }); }
      (q('wa') as HTMLAnchorElement).href = waLink(en
        ? `Hello Noé, I took the “Do your contracts protect you?” test: ${yes}/6. I'd like to discuss it in the free 45-min diagnostic.`
        : `Bonjour Noé, j'ai fait le test « Vos contrats vous protègent-ils ? » : ${yes}/6. Je souhaite en parler lors du diagnostic gratuit de 45 min.`);
    }
    const list = q('advice');
    list.innerHTML = '';
    answers.forEach((a, i) => {
      if (a !== '0') return;
      const li = document.createElement('li');
      li.textContent = en ? quiz.questions[i].adviceEn : quiz.questions[i].adviceFr;
      list.append(li);
    });
    q('adviceBox').hidden = !done || !list.children.length;
    q('ctas').hidden = !done;
  };
  form.addEventListener('change', render);
  form.addEventListener('reset', () => {
    reported = false;
    setTimeout(() => { render(); form.querySelector<HTMLInputElement>('input')?.focus(); });
  });
}
