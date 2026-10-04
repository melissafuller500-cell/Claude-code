import type { APIRoute } from 'astro';
import { sendContactEmail, emailConfigured } from '../../server/email';
import { rateLimit } from '../../server/rate-limit';
import { json, clientIp, clean } from '../../server/env';
import { SITE } from '../../config/site';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const rl = rateLimit(`contact:${clientIp(request, clientAddress)}`, 5, 10 * 60_000);
  if (!rl.ok) return json({ error: 'Too many messages. Please wait a few minutes.' }, 429, { 'Retry-After': String(rl.retryAfter) });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  if (b?.website) return json({ ok: true }); // honeypot: pretend success
  const msg = {
    name: clean(b?.name, 100), business: clean(b?.business, 120), email: clean(b?.email, 200),
    phone: clean(b?.phone, 40), order: clean(b?.order, 30),
    message: String(b?.message ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, 5000),
  };
  if (msg.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email) || msg.message.length < 5) {
    return json({ error: 'Please enter your name, a valid email, and a message.' }, 400);
  }
  if (!emailConfigured()) return json({ error: `Messages cannot be sent right now. Please email ${SITE.supportEmail}.` }, 503);
  try {
    await sendContactEmail(msg);
    return json({ ok: true });
  } catch (err) {
    console.error('[contact] send failed', err);
    return json({ error: `Your message could not be sent. Please email ${SITE.supportEmail}.` }, 502);
  }
};
