// Order numbers (BS-YYMMDD-0001) and the order log, stored outside the public folder.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { serverEnv } from './env';

export interface OrderLine { sku: string; name: string; qty: number; unitPrice: number; lineTotal: number; weightLb: number; label: string | null; fitmentLine: string }
export interface Customer { name: string; business: string; email: string; phone: string; address1: string; address2: string; city: string; state: string; zip: string }
export interface Order {
  orderNumber: string;
  createdAt: string;
  status: 'awaiting_payment' | 'pending_stripe' | 'paid';
  paymentMode: 'whatsapp' | 'stripe';
  customer: Customer;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  weightLb: number;
  prop65: boolean;
  stripeSessionId?: string;
}

const dir = () => {
  const d = resolve(serverEnv.orderLogDir);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
};

function datePart(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: serverEnv.orderTimezone, year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}${get('month')}${get('day')}`;
}

/** Next order number for today. Synchronous file I/O keeps it race-free in one process. */
export function nextOrderNumber(now = new Date()): string {
  const day = datePart(now);
  const file = join(dir(), 'counter.json');
  let counters: Record<string, number> = {};
  try {
    counters = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    /* first order */
  }
  const n = (counters[day] ?? 0) + 1;
  // Keep only recent days
  counters = Object.fromEntries(Object.entries({ ...counters, [day]: n }).sort().slice(-60));
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(counters));
  renameSync(tmp, file);
  return `BS-${day}-${String(n).padStart(4, '0')}`;
}

export function appendOrderLog(entry: Record<string, unknown>) {
  appendFileSync(join(dir(), 'orders.jsonl'), JSON.stringify({ loggedAt: new Date().toISOString(), ...entry }) + '\n');
}

export function savePending(order: Order) {
  writeFileSync(join(dir(), `pending-${order.orderNumber}.json`), JSON.stringify(order));
}
export function loadPending(orderNumber: string): Order | null {
  if (!/^BS-\d{6}-\d{4,}$/.test(orderNumber)) return null;
  try {
    return JSON.parse(readFileSync(join(dir(), `pending-${orderNumber}.json`), 'utf8'));
  } catch {
    return null;
  }
}
