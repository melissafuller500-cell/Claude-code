// Order validation and pricing. Everything is recalculated from the product file.
import { quoteOrder } from '../../lib/pricing.mjs';
import { items } from '../lib/catalog';
import shippingConfig from '../../data/shipping-rates.json';
import { clean } from './env';
import type { Customer, Order, OrderLine } from './orders';

export const CONTIGUOUS = new Set(['AL','AZ','AR','CA','CO','CT','DE','DC','FL','GA','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);

export function validateCustomer(raw: any): { customer: Customer; fieldErrors: Record<string, string> } {
  const c: Customer = {
    name: clean(raw?.name, 100), business: clean(raw?.business, 120), email: clean(raw?.email, 200).toLowerCase(),
    phone: clean(raw?.phone, 40), address1: clean(raw?.address1, 200), address2: clean(raw?.address2, 200),
    city: clean(raw?.city, 100), state: clean(raw?.state, 2).toUpperCase(), zip: clean(raw?.zip, 10),
  };
  const fe: Record<string, string> = {};
  if (c.name.length < 2) fe.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) fe.email = 'Enter a valid email address.';
  if (c.phone.replace(/\D/g, '').length < 10) fe.phone = 'Enter a phone number with area code.';
  if (c.address1.length < 3) fe.address1 = 'Enter the street address.';
  if (/\b(p\.?\s*o\.?\s*box|post office box)\b/i.test(`${c.address1} ${c.address2}`)) fe.address1 = 'We do not ship to PO boxes.';
  if (c.city.length < 2) fe.city = 'Enter the city.';
  if (!CONTIGUOUS.has(c.state)) fe.state = 'We ship to the 48 contiguous states only.';
  if (!/^\d{5}(-\d{4})?$/.test(c.zip)) fe.zip = 'Enter a 5-digit ZIP code.';
  return { customer: c, fieldErrors: fe };
}

export type BuildResult =
  | { ok: true; order: Omit<Order, 'orderNumber' | 'createdAt' | 'status' | 'paymentMode'> }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };

export function buildOrder(body: any): BuildResult {
  if (!body || typeof body !== 'object') return { ok: false, status: 400, error: 'Invalid request.' };
  const lines = Array.isArray(body.lines) ? body.lines.slice(0, 200) : [];
  if (!lines.length) return { ok: false, status: 400, error: 'Your cart is empty.' };

  const { customer, fieldErrors } = validateCustomer(body.customer);
  if (Object.keys(fieldErrors).length) return { ok: false, status: 400, error: 'Please check the highlighted fields.', fieldErrors };

  // Only SKU and quantity are read from the browser; any price fields are ignored.
  const q = quoteOrder(lines.map((l: any) => ({ sku: l?.sku, qty: l?.qty })), items, shippingConfig);
  if (q.errors.length) {
    const oos = q.errors.filter((x) => x.code === 'out_of_stock');
    const msg = oos.length
      ? `${oos.map((x) => x.message).join(' ')} Remove it from your cart to continue. No order was created.`
      : `${q.errors.map((x) => x.message).join(' ')} No order was created.`;
    return { ok: false, status: 409, error: msg };
  }
  if (!q.lines.length) return { ok: false, status: 400, error: 'Your cart is empty.' };

  if (customer.state === 'CA') {
    const blocked = q.lines.filter((l) => l.item.caRestricted);
    if (blocked.length) {
      return { ok: false, status: 409, error: `Not for sale in California: ${blocked.map((l) => `${l.name} (${l.sku})`).join(', ')}. No order was created.`, fieldErrors: { state: 'Some parts cannot ship to California.' } };
    }
  }

  const orderLines: OrderLine[] = q.lines.map((l) => ({
    sku: l.sku, name: l.name, qty: l.qty, unitPrice: l.unitPrice, lineTotal: l.lineTotal,
    weightLb: l.weightLb, label: l.item.label, fitmentLine: l.item.fitmentLine,
  }));
  return {
    ok: true,
    order: {
      customer, lines: orderLines, subtotal: q.subtotal, shipping: q.shipping, total: q.total,
      weightLb: q.weightLb, prop65: q.lines.some((l) => l.item.prop65),
    },
  };
}

/** What the browser is allowed to see about an order. */
export const publicOrder = (o: Order) => ({
  orderNumber: o.orderNumber, email: o.customer.email, status: o.status,
  lines: o.lines.map(({ sku, name, qty, unitPrice, lineTotal }) => ({ sku, name, qty, unitPrice, lineTotal })),
  subtotal: o.subtotal, shipping: o.shipping, total: o.total, weightLb: o.weightLb,
});
