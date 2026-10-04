import { useEffect, useMemo, useState } from 'preact/hooks';
import { quoteOrder, nextTierNudge, formatLb } from '../../lib/pricing.mjs';
import {
  getCart, setQty, removeFromCart, clearCart, loadCatalogData, usd,
  type CartLine, type CatalogData,
} from '../scripts/store';
import { track } from '../scripts/analytics';

interface Props {
  variant: 'page' | 'drawer';
  paymentMode: 'whatsapp' | 'stripe';
  copy: { aboveOrderButton: string; orderButton: string; cartEmpty: string; prop65: string };
}

// The 48 contiguous states plus DC. Alaska, Hawaii, and territories are not served.
export const STATES: [string, string][] = [
  ['AL', 'Alabama'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'],
  ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'],
  ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
  ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

interface Form {
  name: string; business: string; email: string; phone: string;
  address1: string; address2: string; city: string; state: string; zip: string; website: string;
}
const emptyForm: Form = { name: '', business: '', email: '', phone: '', address1: '', address2: '', city: '', state: '', zip: '', website: '' };

export default function Cart({ variant, paymentMode, copy }: Props) {
  const [cart, setCartState] = useState<CartLine[]>([]);
  const [data, setData] = useState<CatalogData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setCartState(getCart());
    sync();
    loadCatalogData().then(setData).catch(() => setLoadError(true));
    window.addEventListener('cart:change', sync);
    window.addEventListener('storage', sync);
    if (variant === 'drawer') {
      const openDrawer = () => setOpen(true);
      window.addEventListener('cart:open', openDrawer);
      return () => {
        window.removeEventListener('cart:change', sync);
        window.removeEventListener('storage', sync);
        window.removeEventListener('cart:open', openDrawer);
      };
    }
    return () => {
      window.removeEventListener('cart:change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (variant !== 'drawer') return;
    document.documentElement.classList.toggle('overflow-hidden', open);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const quote = useMemo(() => (data ? quoteOrder(cart, data.items, data.shipping) : null), [cart, data]);
  const unknown = data ? cart.filter((l) => !data.items[l.sku]) : [];

  // Drop SKUs that no longer exist in the catalog
  useEffect(() => {
    if (data && unknown.length) unknown.forEach((l) => removeFromCart(l.sku));
  }, [data, unknown.length]);

  const threshold = data?.shipping.free_shipping_threshold ?? 250;
  const pct = quote ? Math.min(100, (quote.subtotal / threshold) * 100) : 0;
  const anyProp65 = quote?.lines.some((l) => l.item.prop65);
  const caBlocked = form.state === 'CA' ? quote?.lines.filter((l) => l.item.caRestricted) ?? [] : [];
  const outOfStock = quote?.errors.filter((e) => e.code === 'out_of_stock') ?? [];

  const set = (k: keyof Form) => (e: Event) => setForm({ ...form, [k]: (e.target as HTMLInputElement).value });

  const validate = (): boolean => {
    const fe: Partial<Record<keyof Form, string>> = {};
    if (form.name.trim().length < 2) fe.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) fe.email = 'Enter a valid email address.';
    if (form.phone.replace(/\D/g, '').length < 10) fe.phone = 'Enter a phone number with area code.';
    if (form.address1.trim().length < 3) fe.address1 = 'Enter the street address.';
    if (/\b(p\.?\s*o\.?\s*box|post office box)\b/i.test(form.address1 + ' ' + form.address2)) fe.address1 = 'We do not ship to PO boxes.';
    if (form.city.trim().length < 2) fe.city = 'Enter the city.';
    if (!form.state) fe.state = 'Choose a state.';
    if (!/^\d{5}(-\d{4})?$/.test(form.zip.trim())) fe.zip = 'Enter a 5-digit ZIP code.';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    if (!quote || !quote.lines.length) return;
    if (!validate()) {
      setError('Please check the highlighted fields.');
      return;
    }
    if (caBlocked.length) {
      setError(`Some parts in your cart cannot ship to California: ${caBlocked.map((l) => l.sku).join(', ')}.`);
      return;
    }
    setSubmitting(true);
    track('begin_checkout', { value: quote.subtotal });
    try {
      const res = await fetch('/api/checkout/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: cart, customer: form }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Your order could not be placed. Please try again.');
        if (body.fieldErrors) setFieldErrors(body.fieldErrors);
        setSubmitting(false);
        return;
      }
      if (body.mode === 'stripe' && body.url) {
        sessionStorage.setItem('bs-pending-order', JSON.stringify(body.order));
        window.location.href = body.url;
        return;
      }
      sessionStorage.setItem('bs-last-order', JSON.stringify({ ...body.order, whatsappUrl: body.whatsappUrl }));
      track('purchase', { value: body.order.total, transaction_id: body.order.orderNumber });
      clearCart();
      window.location.href = '/checkout/success/';
    } catch {
      setError('Network error. Your order was not placed. Please try again.');
      setSubmitting(false);
    }
  };

  const progress = quote && quote.lines.length > 0 && (
    <div class="rounded-md border border-line-200 bg-surface-0 p-4">
      <p class="text-sm" aria-live="polite">
        {quote.freeShipping
          ? <span class="font-semibold text-ok-green">Free shipping unlocked.</span>
          : <>Add <span class="tag-mono font-medium">{usd(quote.amountToFree)}</span> more for free shipping.</>}
      </p>
      <div class="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-surface-50" role="progressbar" aria-label="Progress toward free shipping" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={quote.subtotal}>
        <div class={`h-full rounded-full transition-[width] duration-500 ${quote.freeShipping ? 'bg-ok-green' : 'bg-line-yellow'}`} style={{ width: `${pct}%` }} />
        {!quote.freeShipping && <div class="absolute inset-y-0 right-0 w-10" style={{ background: 'var(--hazard)', opacity: 0.55 }} />}
      </div>
    </div>
  );

  const lineList = quote && (
    <ul class="divide-y divide-line-200 rounded-md border border-line-200 bg-surface-0">
      {quote.lines.map((l) => {
        const nudge = nextTierNudge(l.item.prices, l.qty);
        return (
          <li class="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
            <div class="min-w-0">
              <p class="tag-mono text-[0.75rem] text-text-600">{l.sku}</p>
              <a href={l.item.url} class="block font-semibold leading-snug no-underline hover:underline">{l.name}</a>
              <p class="text-[0.8125rem] text-text-600">{l.item.fitmentLine}</p>
              {l.item.label && <p class="tag-mono mt-1 inline-block rounded-sm bg-surface-50 px-1.5 py-0.5 text-[0.6875rem]">{l.item.label}</p>}
              {l.item.caRestricted && <p class="mt-1 text-[0.8125rem] font-medium text-alert-red">Not for sale in California</p>}
              {nudge && <p class="mt-1.5 text-[0.8125rem] font-medium text-text-900">Add {nudge.n} more to pay <span class="tag-mono">{usd(nudge.price)}</span> each.</p>}
            </div>
            <div class="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
              <div class="flex items-center rounded border border-line-200">
                <button type="button" class="h-10 w-10 text-lg" aria-label={`Decrease quantity of ${l.sku}`} onClick={() => setQty(l.sku, l.qty - 1)}>−</button>
                <input type="number" min={1} max={9999} inputMode="numeric" aria-label={`Quantity of ${l.sku}`} class="tag-mono h-10 w-14 border-x border-line-200 text-center"
                  value={l.qty}
                  onChange={(e) => {
                    const v = Number((e.target as HTMLInputElement).value);
                    if (Number.isInteger(v) && v >= 1 && v <= 9999) setQty(l.sku, v);
                    else (e.target as HTMLInputElement).value = String(l.qty);
                  }} />
                <button type="button" class="h-10 w-10 text-lg" aria-label={`Increase quantity of ${l.sku}`} onClick={() => setQty(l.sku, Math.min(9999, l.qty + 1))}>+</button>
              </div>
              <div class="text-right">
                <p class="tag-mono text-[0.8125rem] text-text-600">{usd(l.unitPrice)} × {l.qty}</p>
                <p class="tag-mono font-medium">{usd(l.lineTotal)}</p>
                <button type="button" class="mt-0.5 text-[0.8125rem] text-link-blue underline" onClick={() => removeFromCart(l.sku)}>Remove</button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const summary = quote && (
    <dl class="space-y-2 text-[0.9375rem]">
      <div class="flex justify-between"><dt>Subtotal</dt><dd class="tag-mono">{usd(quote.subtotal)}</dd></div>
      <div class="flex justify-between">
        <dt>{quote.freeShipping ? 'Shipping' : `Shipping (${formatLb(quote.weightLb)} lb)`}</dt>
        <dd class={`tag-mono ${quote.freeShipping ? 'font-semibold text-ok-green' : ''}`}>{quote.freeShipping ? 'Free' : usd(quote.shipping)}</dd>
      </div>
      <div class="flex justify-between border-t border-line-200 pt-2 text-lg font-semibold"><dt>Total</dt><dd class="tag-mono">{usd(quote.total)}</dd></div>
      <p class="text-[0.8125rem] text-text-600">Sales tax, where it applies, is shown on your payment request.</p>
    </dl>
  );

  const empty = (
    <div class="rounded-md border border-dashed border-line-200 bg-surface-0 px-6 py-12 text-center">
      <p class="text-lg">{copy.cartEmpty}</p>
      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" class="btn btn-primary" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('vehicle:open')); }}>Find parts for my vehicle</button>
        <a href="/parts/" class="btn border border-line-200 bg-surface-0 text-text-900 no-underline">Browse categories</a>
      </div>
    </div>
  );

  if (variant === 'drawer') {
    if (!open) return null;
    return (
      <div class="fixed inset-0 z-[60] hidden md:block" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <div class="absolute inset-0 bg-ink-900/60" onClick={() => setOpen(false)} />
        <div class="drawer-panel absolute inset-y-0 right-0 flex w-[min(100%,460px)] flex-col bg-surface-50 shadow-2xl">
          <div class="dark-frame flex items-center justify-between bg-ink-900 px-5 py-4 text-white">
            <h2 id="cart-drawer-title" class="text-2xl text-white">Your cart</h2>
            <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded" onClick={() => setOpen(false)} autofocus>
              <span class="sr-only">Close cart</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div class="bay-line" aria-hidden="true" />
          <div class="flex-1 space-y-4 overflow-y-auto p-5">
            {!data && !loadError && <p class="text-text-600">Loading…</p>}
            {loadError && <p class="text-alert-red">The cart could not load. Please refresh the page.</p>}
            {data && !quote?.lines.length && empty}
            {quote && quote.lines.length > 0 && <>{progress}{lineList}</>}
          </div>
          {quote && quote.lines.length > 0 && (
            <div class="border-t border-line-200 bg-surface-0 p-5">
              {summary}
              <a href="/cart/" class="btn btn-primary mt-4 w-full no-underline">Review cart and place order</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Full cart page ──
  const input = (k: keyof Form, label: string, props: Record<string, unknown> = {}) => (
    <div class={(props.class as string) ?? ''}>
      <label for={`f-${k}`} class="mb-1.5 block text-sm font-medium">{label}</label>
      <input id={`f-${k}`} name={k} value={form[k]} onInput={set(k)}
        aria-invalid={!!fieldErrors[k]} aria-describedby={fieldErrors[k] ? `f-${k}-err` : undefined}
        class={`h-12 w-full rounded border bg-surface-0 px-3 text-base ${fieldErrors[k] ? 'border-alert-red' : 'border-line-200'}`}
        {...props} />
      {fieldErrors[k] && <p id={`f-${k}-err`} class="mt-1 text-[0.8125rem] text-alert-red">{fieldErrors[k]}</p>}
    </div>
  );

  if (!data && !loadError) return <p class="text-text-600">Loading your cart…</p>;
  if (loadError) return <p class="text-alert-red">The cart could not load. Please refresh the page.</p>;
  if (!quote?.lines.length && !outOfStock.length) return empty;

  return (
    <div class="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
      <div class="space-y-4">
        {progress}
        {outOfStock.length > 0 && (
          <div class="rounded-md border border-alert-red/40 bg-[#fdecea] p-4 text-sm text-alert-red" role="alert">
            {outOfStock.map((e) => (
              <p class="flex items-center justify-between gap-3">
                <span>{e.message} Out of stock. Message us for a restock date.</span>
                <button type="button" class="underline" onClick={() => removeFromCart(e.sku)}>Remove</button>
              </p>
            ))}
          </div>
        )}
        {lineList}
        {anyProp65 && (
          <p class="flex gap-2 rounded-md border border-line-200 bg-surface-0 p-4 text-[0.8125rem]">
            <svg class="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 1 21h22L12 2Z" fill="#FFC400" stroke="#14181D" stroke-width="1.5" stroke-linejoin="round" /><path d="M12 9v5M12 17v.5" stroke="#14181D" stroke-width="2" stroke-linecap="round" /></svg>
            <span><strong>California residents:</strong> {copy.prop65}</span>
          </p>
        )}
      </div>

      <form onSubmit={submit} noValidate class="space-y-5 rounded-md border border-line-200 bg-surface-0 p-5 lg:sticky lg:top-36">
        <h2 class="text-3xl">Order summary</h2>
        {summary}
        <fieldset class="space-y-4 border-t border-line-200 pt-5">
          <legend class="label-section mb-3 text-text-600">Contact</legend>
          {input('name', 'Contact name', { autocomplete: 'name', required: true })}
          {input('business', 'Business name (optional)', { autocomplete: 'organization' })}
          {input('email', 'Email', { type: 'email', autocomplete: 'email', required: true })}
          {input('phone', 'Phone', { type: 'tel', autocomplete: 'tel', required: true })}
        </fieldset>
        <fieldset class="space-y-4 border-t border-line-200 pt-5">
          <legend class="label-section mb-3 text-text-600">Shipping address</legend>
          {input('address1', 'Street address', { autocomplete: 'address-line1', required: true })}
          {input('address2', 'Apartment, suite, unit (optional)', { autocomplete: 'address-line2' })}
          {input('city', 'City', { autocomplete: 'address-level2', required: true })}
          <div class="grid grid-cols-[1fr_8rem] gap-3">
            <div>
              <label for="f-state" class="mb-1.5 block text-sm font-medium">State</label>
              <select id="f-state" name="state" value={form.state} onChange={set('state')} autocomplete="address-level1" required
                aria-invalid={!!fieldErrors.state}
                class={`h-12 w-full rounded border bg-surface-0 px-3 text-base ${fieldErrors.state ? 'border-alert-red' : 'border-line-200'}`}>
                <option value="">Choose</option>
                {STATES.map(([c, n]) => <option value={c}>{n}</option>)}
              </select>
              {fieldErrors.state && <p class="mt-1 text-[0.8125rem] text-alert-red">{fieldErrors.state}</p>}
            </div>
            {input('zip', 'ZIP code', { inputMode: 'numeric', autocomplete: 'postal-code', required: true })}
          </div>
          <p class="text-[0.8125rem] text-text-600">We ship to the 48 contiguous states only. No PO boxes.</p>
          {caBlocked.length > 0 && (
            <p class="rounded bg-[#fdecea] p-3 text-[0.8125rem] font-medium text-alert-red" role="alert">
              Not for sale in California: {caBlocked.map((l) => `${l.name} (${l.sku})`).join(', ')}. Remove these parts or choose another address.
            </p>
          )}
        </fieldset>
        {/* Honeypot: hidden from people, filled in by bots */}
        <div class="absolute -left-[9999px]" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autocomplete="off" value={form.website} onInput={set('website')} /></label>
        </div>
        {error && <p class="rounded bg-[#fdecea] p-3 text-sm font-medium text-alert-red" role="alert">{error}</p>}
        {paymentMode === 'whatsapp' && <p class="rounded bg-surface-50 p-3 text-sm">{copy.aboveOrderButton}</p>}
        <button type="submit" class="btn btn-primary w-full text-base" disabled={submitting || !quote?.lines.length || outOfStock.length > 0}>
          {submitting ? 'Placing order…' : paymentMode === 'whatsapp' ? copy.orderButton : 'Continue to secure payment'}
        </button>
      </form>
    </div>
  );
}
