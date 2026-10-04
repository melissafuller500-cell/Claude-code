import type { APIRoute } from 'astro';
import { answer, type ChatMsg } from '../../server/chat';
import { rateLimit } from '../../server/rate-limit';
import { json, clientIp } from '../../server/env';
import { SITE } from '../../config/site';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const rl = rateLimit(`chat:${clientIp(request, clientAddress)}`, 20, 60 * 60_000);
  if (!rl.ok) {
    return json({ reply: `You have reached the limit of 20 messages per hour. Please try again later, or contact us at ${SITE.supportEmail}.` }, 429, { 'Retry-After': String(rl.retryAfter) });
  }
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const raw = Array.isArray(b?.messages) ? b.messages.slice(-12) : [];
  const history: ChatMsg[] = raw
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim())
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'Please type a question.' }, 400);
  const reply = await answer(history);
  return json({ reply });
};
