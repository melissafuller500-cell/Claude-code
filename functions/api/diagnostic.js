/**
 * Cloudflare Pages Function : réception du formulaire de diagnostic (D5).
 * Même domaine que le site : aucune requête du navigateur vers un tiers.
 *
 * Variables d'environnement (Cloudflare Pages > Settings > Variables) :
 *   RESEND_API_KEY   clé API Resend (envoi d'e-mail transactionnel)
 *   FORM_TO          adresse qui reçoit les demandes (ex. contact@noetechgrowth.com)
 *   FORM_FROM        expéditeur vérifié chez Resend (ex. "Site NTG <site@noetechgrowth.com>")
 *   FORM_WEBHOOK_URL (optionnel) URL qui reçoit aussi la demande en JSON (Make, Zapier, Google Apps Script…)
 */
const FIELDS = ['secteur', 'retard', 'taille', 'prenom', 'entreprise', 'ville', 'contact', 'message', 'lang'];
const LIMITS = { prenom: 80, entreprise: 120, ville: 80, contact: 120, message: 2000, secteur: 120, retard: 20, taille: 20, lang: 2 };
const CONTACT_RE = /^\s*(\+?[0-9][0-9 ().-]{7,19}|[^@\s]+@[^@\s]+\.[^@\s]+)\s*$/;
const THANKS = { fr: '/diagnostic/merci/', en: '/en/diagnostic/thank-you/' };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return await request.json();
  const fd = await request.formData();
  return Object.fromEntries(fd.entries());
}

export function validate(raw) {
  const data = {};
  for (const k of FIELDS) data[k] = String(raw[k] ?? '').trim().slice(0, LIMITS[k]);
  data.lang = data.lang === 'en' ? 'en' : 'fr';
  const errors = [];
  if (!data.prenom) errors.push('prenom');
  if (!CONTACT_RE.test(data.contact)) errors.push('contact');
  return { data, errors, spam: Boolean(String(raw.website ?? '').trim()) };
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function summary(d) {
  return [
    `Prénom : ${d.prenom}`,
    `Entreprise : ${d.entreprise || '—'}`,
    `Ville : ${d.ville || '—'}`,
    `Contact : ${d.contact}`,
    `Secteur : ${d.secteur}`,
    `Clients en retard : ${d.retard}`,
    `Taille de l'équipe : ${d.taille}`,
    `Langue : ${d.lang}`,
    '',
    d.message || '(pas de message)',
  ].join('\n');
}

async function deliver(env, d) {
  const sent = [];
  if (env.RESEND_API_KEY && env.FORM_TO) {
    const text = summary(d);
    const replyTo = d.contact.includes('@') ? d.contact : undefined;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.FORM_FROM || 'Noé Tech Growth <site@noetechgrowth.com>',
        to: [env.FORM_TO],
        subject: `Diagnostic : ${d.prenom}${d.entreprise ? ` (${d.entreprise})` : ''}`,
        text,
        html: `<pre style="font:15px/1.5 system-ui">${escapeHtml(text)}</pre>`,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
    sent.push('email');
  }
  if (env.FORM_WEBHOOK_URL) {
    const r = await fetch(env.FORM_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, receivedAt: new Date().toISOString() }) });
    if (!r.ok) throw new Error(`webhook ${r.status}`);
    sent.push('webhook');
  }
  if (!sent.length) throw new Error('no delivery configured');
  return sent;
}

/** Page d'erreur minimale pour les navigateurs sans JavaScript (le formulaire a été posté normalement). */
function htmlError(lang, invalid) {
  const en = lang === 'en';
  const msg = invalid
    ? (en ? 'Please go back and check your first name and your phone number or email.' : 'Revenez en arrière et vérifiez votre prénom et votre téléphone ou e-mail.')
    : (en ? 'The message could not be sent. Please write to me on WhatsApp or by email instead.' : 'Le message n’a pas pu partir. Écrivez-moi plutôt sur WhatsApp ou par e-mail.');
  const body = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Noé Tech Growth</title><style>body{margin:0;background:#06110B;color:#EDF3E6;font:18px/1.6 system-ui,sans-serif;padding:32px 16px}main{max-width:560px;margin:auto}a{color:#A3D65C}</style></head><body><main><h1>${en ? 'Something went wrong' : 'Un problème est survenu'}</h1><p>${msg}</p><p><a href="https://wa.me/237653400504">WhatsApp +237 653 40 05 04</a><br><a href="mailto:contact@noetechgrowth.com">contact@noetechgrowth.com</a></p><p><a href="${en ? '/en/diagnostic/' : '/diagnostic/'}">${en ? 'Back to the form' : 'Retour au formulaire'}</a></p></main></body></html>`;
  return new Response(body, { status: invalid ? 422 : 502, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  let raw;
  try { raw = await readBody(request); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  const { data, errors, spam } = validate(raw);
  const done = () => (wantsJson ? json({ ok: true }) : Response.redirect(new URL(THANKS[data.lang], request.url).href, 303));
  if (spam) return done(); // champ piège rempli : on fait semblant d'accepter
  if (errors.length) return wantsJson ? json({ ok: false, errors }, 422) : htmlError(data.lang, true);
  try {
    await deliver(env, data);
  } catch (e) {
    console.error('diagnostic delivery failed', e);
    return wantsJson ? json({ ok: false, error: 'delivery_failed' }, 502) : htmlError(data.lang, false);
  }
  return done();
}

