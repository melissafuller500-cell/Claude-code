import { useEffect, useState } from 'preact/hooks';
import { usd } from '../scripts/store';

interface Line { sku: string; name: string; qty: number; unitPrice: number; lineTotal: number }
interface Order {
  orderNumber: string; email: string; lines: Line[]; subtotal: number; shipping: number; total: number;
  weightLb: number; whatsappUrl?: string; status: string;
}
interface Props { copy: { orderPlaced: string; noWhatsApp: string }; mode: 'whatsapp' | 'stripe' }

export default function CheckoutSuccess({ copy, mode }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('session_id')) {
        setPaid(true);
        const pending = sessionStorage.getItem('bs-pending-order');
        if (pending) setOrder(JSON.parse(pending));
        localStorage.removeItem('bs-cart');
      } else {
        const raw = sessionStorage.getItem('bs-last-order');
        if (raw) {
          const o = JSON.parse(raw) as Order;
          setOrder(o);
          // On phones, open WhatsApp straight away; the page stays in history.
          const key = `bs-wa-opened-${o.orderNumber}`;
          if (o.whatsappUrl && window.matchMedia('(pointer: coarse)').matches && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            setTimeout(() => (window.location.href = o.whatsappUrl!), 900);
          }
        }
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  if (!loaded) return null;
  if (!order) {
    return (
      <div class="rounded-md border border-line-200 bg-surface-0 p-6">
        <p>{paid ? 'Payment received. Your confirmation email is on its way.' : 'We could not find a recent order in this browser. If you placed one, check your email for the confirmation.'}</p>
        <a href="/" class="link mt-3 inline-block">Back to the home page</a>
      </div>
    );
  }

  const message = copy.orderPlaced.replace('{orderNumber}', order.orderNumber).replace('{email}', order.email);

  return (
    <div class="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <div>
        {paid
          ? <p class="text-lg">Payment received for order <span class="tag-mono">{order.orderNumber}</span>. A copy is on its way to {order.email}.</p>
          : <p class="text-lg">{message}</p>}
        {!paid && mode === 'whatsapp' && (
          <>
            <a href={order.whatsappUrl} target="_blank" rel="noopener" class="btn mt-6 h-14 bg-[#17773F] px-6 text-base text-white no-underline hover:bg-[#146C39]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>
              Continue on WhatsApp
            </a>
            <p class="mt-4 text-sm text-text-600">{copy.noWhatsApp}</p>
          </>
        )}
      </div>
      <div class="rounded-md border border-line-200 bg-surface-0">
        <div class="flex items-center justify-between border-b border-line-200 px-5 py-4">
          <div>
            <p class="label-section text-text-600">Order</p>
            <p class="tag-mono mt-1 text-lg">{order.orderNumber}</p>
          </div>
          <span class={`rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${paid ? 'bg-[#e7f5ec] text-ok-green' : 'bg-line-yellow text-ink-900'}`}>
            {paid ? 'Paid' : 'Awaiting payment'}
          </span>
        </div>
        <ul class="divide-y divide-line-200 px-5">
          {order.lines.map((l) => (
            <li class="flex justify-between gap-3 py-3 text-sm">
              <span><span class="tag-mono block text-[0.75rem] text-text-600">{l.sku}</span>{l.name}<span class="tag-mono block text-[0.8125rem] text-text-600">{l.qty} × {usd(l.unitPrice)}</span></span>
              <span class="tag-mono">{usd(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl class="space-y-1.5 border-t border-line-200 px-5 py-4 text-sm">
          <div class="flex justify-between"><dt>Subtotal</dt><dd class="tag-mono">{usd(order.subtotal)}</dd></div>
          <div class="flex justify-between"><dt>Shipping</dt><dd class="tag-mono">{order.shipping === 0 ? 'Free' : usd(order.shipping)}</dd></div>
          <div class="flex justify-between border-t border-line-200 pt-2 text-base font-semibold"><dt>Total</dt><dd class="tag-mono">{usd(order.total)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
