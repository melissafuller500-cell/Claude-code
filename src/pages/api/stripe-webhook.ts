import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { loadPending, appendOrderLog } from '../../server/orders';
import { sendOrderEmails } from '../../server/email';
import { serverEnv, json } from '../../server/env';

export const prerender = false;

// Stripe mode only. The signature is verified before anything is recorded.
export const POST: APIRoute = async ({ request }) => {
  if (!serverEnv.stripeSecret || !serverEnv.stripeWebhookSecret) return json({ error: 'Not configured' }, 503);
  const sig = request.headers.get('stripe-signature');
  if (!sig) return json({ error: 'Missing signature' }, 400);
  const raw = await request.text();
  const stripe = new Stripe(serverEnv.stripeSecret);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, serverEnv.stripeWebhookSecret);
  } catch {
    return json({ error: 'Invalid signature' }, 400);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderNumber = session.metadata?.orderNumber ?? '';
    const order = loadPending(orderNumber);
    if (!order) {
      appendOrderLog({ event: 'webhook_unknown_order', orderNumber, sessionId: session.id });
      return json({ received: true });
    }
    if (session.payment_status === 'paid') {
      order.status = 'paid';
      appendOrderLog({ event: 'order_paid', order, amountTotal: (session.amount_total ?? 0) / 100, tax: (session.total_details?.amount_tax ?? 0) / 100 });
      const mail = await sendOrderEmails(order);
      if (mail.error) appendOrderLog({ event: 'email_problem', orderNumber, detail: mail.error });
    }
  }
  return json({ received: true });
};
