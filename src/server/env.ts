// Server-only settings, read from environment variables at run time.
// None of these values ever reach client code.
const env = (k: string) => (process.env[k] ?? '').trim();

export const serverEnv = {
  get paymentMode(): 'whatsapp' | 'stripe' { return env('PAYMENT_MODE') === 'stripe' ? 'stripe' : 'whatsapp'; },
  get whatsappNumber() { return env('WHATSAPP_NUMBER'); },
  get siteUrl() { return (env('SITE_URL') || 'https://baystockparts.com').replace(/\/+$/, ''); },
  get smtp() {
    return {
      host: env('SMTP_HOST'),
      port: Number(env('SMTP_PORT') || 465),
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
      from: env('SMTP_FROM') || env('SMTP_USER'),
    };
  },
  get orderNotifyEmail() { return env('ORDER_NOTIFY_EMAIL'); },
  get orderLogDir() { return env('ORDER_LOG_DIR') || './orders'; },
  get orderTimezone() { return env('ORDER_TIMEZONE') || 'America/New_York'; },
  get anthropicKey() { return env('ANTHROPIC_API_KEY'); },
  get chatModel() { return env('CHAT_MODEL') || 'claude-opus-5-5'; },
  get stripeSecret() { return env('STRIPE_SECRET_KEY'); },
  get stripeWebhookSecret() { return env('STRIPE_WEBHOOK_SECRET'); },
};

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

/** Client IP for rate limiting. Uses the address appended by the nearest proxy
 *  (the last X-Forwarded-For entry), which a visitor cannot forge. */
export function clientIp(request: Request, fallback?: string): string {
  const fwd = request.headers.get('x-forwarded-for');
  const last = fwd?.split(',').map((s) => s.trim()).filter(Boolean).pop();
  return (last || request.headers.get('x-real-ip') || fallback || 'unknown').trim();
}

export const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Strip control characters and trim to a maximum length. */
export const clean = (s: unknown, max = 200) =>
  String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
