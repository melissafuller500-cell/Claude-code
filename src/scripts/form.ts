import { track, bindClickTracking } from './track';

/** Amélioration du formulaire : envoi sans rechargement, erreurs annoncées, bouton flottant masqué. */
export function init(form: HTMLFormElement) {
  bindClickTracking();
  form.noValidate = true; // validation native sans JS ; avec JS, erreurs affichées sous chaque champ
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const msg = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');

  // Arrivée sur la page diagnostic depuis un appel à l'action d'une autre page (mesure sans JS ailleurs).
  if (location.pathname.includes('/diagnostic/') && document.referrer.startsWith(location.origin)) {
    const from = new URL(document.referrer).pathname;
    if (from !== location.pathname) track('cta_click', { src: from });
  }

  // Le résultat du calculateur accompagne le message, s'il existe.
  try {
    const saved = JSON.parse(sessionStorage.getItem('ntg-calc') || 'null');
    if (saved?.msg && msg && !msg.value) msg.value = saved.msg.split('\n').slice(1, -1).join('\n');
  } catch { /* rien */ }

  // Bouton flottant WhatsApp masqué quand le formulaire est à l'écran.
  const fab = document.getElementById('fab');
  if (fab && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => fab.classList.toggle('hide', e.isIntersecting), { threshold: 0.1 }).observe(form);
  }

  const showErrors = () => {
    let first: HTMLElement | null = null;
    form.querySelectorAll<HTMLInputElement>('input[required], select[required]').forEach((el) => {
      const err = document.getElementById(`${el.id}-err`);
      const bad = !el.checkValidity();
      if (el.type !== 'radio') el.setAttribute('aria-invalid', String(bad));
      if (err) { err.hidden = !bad; err.textContent = bad ? el.validationMessage : ''; }
      if (bad && !first) first = el;
    });
    return first as HTMLElement | null;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const first = showErrors();
    if (first) {
      status.className = 'status error';
      status.textContent = form.dataset.msgInvalid!;
      first.focus();
      return;
    }
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = form.dataset.msgSending!;
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      track('form_submit');
      form.querySelectorAll<HTMLElement>('.field, fieldset, button[type="submit"]').forEach((el) => (el.hidden = true));
      status.className = 'status ok';
      status.textContent = form.dataset.msgOk!;
      status.focus();
      try { sessionStorage.removeItem('ntg-calc'); } catch { /* rien */ }
    } catch {
      status.className = 'status error';
      status.textContent = form.dataset.msgError!;
      status.focus();
      btn.disabled = false;
      btn.textContent = label;
    }
  });
  form.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.getAttribute('aria-invalid') === 'true' && el.checkValidity()) {
      el.setAttribute('aria-invalid', 'false');
      const err = document.getElementById(`${el.id}-err`);
      if (err) err.hidden = true;
    }
  });
}
