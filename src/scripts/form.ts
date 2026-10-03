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

  // Le résultat du calculateur accompagne le message, tant que la personne ne l'a pas modifié.
  let edited = false;
  const fill = (full?: string) => { if (msg && full && !edited) msg.value = full.split('\n').slice(1, -1).join('\n'); };
  try { fill(JSON.parse(sessionStorage.getItem('ntg-calc') || 'null')?.msg); } catch { /* rien */ }
  msg?.addEventListener('input', () => (edited = true));
  document.addEventListener('ntg:calc', () => { try { fill(JSON.parse(sessionStorage.getItem('ntg-calc') || 'null')?.msg); } catch { /* rien */ } });

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
      // Plan B : le message déjà rédigé part sur WhatsApp en un clic.
      const d = new FormData(form);
      const en = d.get('lang') === 'en';
      const text = [
        en ? 'Hello Noé, I would like to book the free 45-min diagnostic.' : 'Bonjour Noé, je souhaite réserver le diagnostic gratuit de 45 min.',
        `${en ? 'First name' : 'Prénom'} : ${d.get('prenom')}`,
        d.get('entreprise') ? `${en ? 'Company' : 'Entreprise'} : ${d.get('entreprise')}` : '',
        d.get('ville') ? `${en ? 'City' : 'Ville'} : ${d.get('ville')}` : '',
        `${en ? 'Sector' : 'Secteur'} : ${d.get('secteur')}`,
        `${en ? 'Clients pay late' : 'Clients en retard'} : ${d.get('retard')} · ${en ? 'Team' : 'Équipe'} : ${d.get('taille')}`,
        `${en ? 'Contact' : 'Contact'} : ${d.get('contact')}`,
        String(d.get('message') || ''),
      ].filter(Boolean).join('\n');
      const a = document.createElement('a');
      a.className = 'btn sm';
      a.href = `https://wa.me/237653400504?text=${encodeURIComponent(text)}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.dataset.track = 'whatsapp_click';
      a.dataset.src = 'form-fallback';
      a.textContent = en ? 'Send it on WhatsApp' : 'L’envoyer sur WhatsApp';
      a.style.marginTop = '10px';
      status.append(document.createElement('br'), a);
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
