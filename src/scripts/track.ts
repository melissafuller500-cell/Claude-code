/**
 * Mesure d'audience des événements (section 13), sans cookie ni domaine tiers :
 * envoi vers /api/event (fonction Cloudflare Pages, voir functions/api/event.js).
 */
export function track(name: string, data: Record<string, string | number> = {}) {
  try {
    const body = JSON.stringify({ name, path: location.pathname, lang: document.documentElement.lang, ...data });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
    else fetch('/api/event', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
  } catch {
    /* la mesure ne doit jamais casser la page */
  }
}

let bound = false;
/** Écoute délégée des clics sur [data-track] (appel principal, WhatsApp, e-mail). */
export function bindClickTracking() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-track]');
    if (el && el.dataset.track !== 'template_copy') track(el.dataset.track!, el.dataset.src ? { src: el.dataset.src } : {});
  });
}
