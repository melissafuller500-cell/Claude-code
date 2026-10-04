import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { buildOrder, publicOrder } from '../../server/checkout';
import { nextOrderNumber, appendOrderLog, savePending, type Order } from '../../server/orders';
import { sendOrderEmails } from '../../server/email';
import { whatsappUrl } from '../../server/whatsapp';
import { rateLimit } from '../../server/rate-limit';
import { serverEnv, json, clientIp } from '../../server/env';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientIp(request, clientAddress);
  const rl = rateLimit(`checkout:${ip}`, 10, 10 * 60_000);
  if (!rl.ok) return json({ error: 'Too many order attempts. Please wait a few minutes and try again.' }, 429, { 'Retry-After': String(rl.retryAfter) });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  if (body?.customer?.website) return json({ error: 'Invalid request.' }, 400); // honeypot

  const built = buildOrder(body);
  if (!built.ok) return json({ error: built.error, fieldErrors: built.fieldErrors }, built.status);

  const mode = serverEnv.paymentMode;
  const order: Order = {
    ...built.order,
    orderNumber: nextOrderNumber(),
    createdAt: new Date().toISOString(),
    status: mode === 'stripe' ? 'pending_stripe' : 'awaiting_payment',
    paymentMode: mode,
  };

  if (mode === 'stripe') {
    if (!serverEnv.stripeSecret) return json({ error: 'Card checkout is not available right now. Please contact us.' }, 503);
    const stripe = new Stripe(serverEnv.stripeSecret);
    try {
      const site = serverEnv.siteUrl;
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.lines.map((l) => ({
        quantity: l.qty,
        price_data: { currency: 'usd', unit_amount: Math.round(l.unitPrice * 100), tax_behavior: 'exclusive', product_data: { name: `${l.name} (${l.sku})`, metadata: { sku: l.sku } } },
      }));
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        customer_email: order.customer.email,
        automatic_tax: { enabled: true },
        shipping_address_collection: { allowed_countries: ['US'] },
        shipping_options: [{
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: order.shipping === 0 ? 'Free ground shipping' : `Ground shipping (${order.weightLb} lb)`,
            fixed_amount: { amount: Math.round(order.shipping * 100), currency: 'usd' },
            tax_behavior: 'exclusive',
          },
        }],
        metadata: { orderNumber: order.orderNumber },
        client_reference_id: order.orderNumber,
        success_url: `${site}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/checkout/cancelled/`,
      });
      order.stripeSessionId = session.id;
      savePending(order);
      appendOrderLog({ event: 'checkout_started', order });
      return json({ mode, url: session.url, order: publicOrder(order) });
    } catch (err) {
      console.error('[checkout] Stripe error', err);
      return json({ error: 'Card checkout could not be started. Please try again.' }, 502);
    }
  }

  // WhatsApp mode: save, email, hand off.
  appendOrderLog({ event: 'order_placed', order });
  const mail = await sendOrderEmails(order);
  if (mail.error) {
    console.error(`[checkout] ${order.orderNumber}: ${mail.error}`);
    appendOrderLog({ event: 'email_problem', orderNumber: order.orderNumber, detail: mail.error });
  }
  return json({ mode, order: publicOrder(order), whatsappUrl: whatsappUrl(order) });
};

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
