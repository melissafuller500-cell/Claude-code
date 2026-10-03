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

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  let raw;
  try { raw = await readBody(request); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  const { data, errors, spam } = validate(raw);
  const done = () => (wantsJson ? json({ ok: true }) : Response.redirect(new URL(THANKS[data.lang], request.url).href, 303));
  if (spam) return done(); // champ piège rempli : on fait semblant d'accepter
  if (errors.length) return json({ ok: false, errors }, 422);
  try {
    await deliver(env, data);
  } catch (e) {
    console.error('diagnostic delivery failed', e);
    return json({ ok: false, error: 'delivery_failed' }, 502);
  }
  return done();
}

