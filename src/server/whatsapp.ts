import type { Order } from './orders';
import { serverEnv } from './env';

const usd = (n: number) => `$${n.toFixed(2)}`;
export const MAX_WA_LINES = 15;

/** Pre-filled WhatsApp message. Totals always come from the server-side order. */
export function whatsappMessage(order: Order): string {
  const lines = order.lines.slice(0, MAX_WA_LINES).map((l) => `- ${l.sku} ${l.name} x${l.qty} @ ${usd(l.unitPrice)}`);
  const out = [
    `Hello BayStock, I would like to confirm order ${order.orderNumber}.`,
    '',
    ...lines,
  ];
  if (order.lines.length > MAX_WA_LINES) out.push('Full details are in your confirmation email.');
  out.push(
    '',
    `Subtotal: ${usd(order.subtotal)}`,
    `Shipping: ${order.shipping === 0 ? 'Free' : usd(order.shipping)}`,
    `Total: ${usd(order.total)}`,
    '',
    `Name: ${order.customer.name}`,
    `City: ${order.customer.city}, ${order.customer.state}`,
  );
  return out.join('\n');
}

export function whatsappUrl(order: Order): string {
  const digits = serverEnv.whatsappNumber.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage(order))}`;
}
