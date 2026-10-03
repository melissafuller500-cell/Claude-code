/**
 * Cloudflare Pages Function : événements de conversion (section 13), sans cookie ni identifiant.
 * Liaison facultative « EVENTS » vers un dataset Workers Analytics Engine (Settings > Bindings).
 * Sans liaison, la requête est acceptée et ignorée.
 */
const ALLOWED = new Set(['cta_click', 'form_submit', 'whatsapp_click', 'email_click', 'calculator_use', 'quiz_complete', 'template_copy']);

export async function onRequestPost({ request, env }) {
  try {
    const e = await request.json();
    if (!ALLOWED.has(e.name)) return new Response(null, { status: 204 });
    const clip = (v) => String(v ?? '').slice(0, 200);
    env.EVENTS?.writeDataPoint({
      blobs: [clip(e.name), clip(e.path), clip(e.lang), clip(e.src ?? e.target ?? e.score ?? '')],
      doubles: [1],
      indexes: [clip(e.name)],
    });
  } catch { /* corps invalide : ignoré */ }
  return new Response(null, { status: 204 });
}
