// Tier, shipping, and order math. Shared by the browser (display) and the
// server (the only source of truth for what an order costs).
// All arithmetic is done in cents to avoid floating-point drift.

export const toCents = (n) => Math.round(Number(n) * 100);
export const fromCents = (c) => Math.round(c) / 100;

/** Index of the tier that applies to `qty` (tiers sorted by min ascending). */
export function tierIndex(prices, qty) {
  let idx = 0;
  for (let i = 0; i < prices.length; i++) if (qty >= prices[i].min) idx = i;
  return idx;
}

export const unitPrice = (prices, qty) => prices[tierIndex(prices, qty)].price;

/** { n, price } for "Add {n} more to pay ${price} each", or null at the top tier. */
export function nextTierNudge(prices, qty) {
  const i = tierIndex(prices, qty);
  if (i >= prices.length - 1) return null;
  const next = prices[i + 1];
  return { n: next.min - qty, price: next.price };
}

export const isValidQty = (qty) => Number.isInteger(qty) && qty >= 1 && qty <= 9999;

/** Shipping in dollars for a weight (lb) and subtotal (dollars). */
export function shippingFor(weightLb, subtotal, config) {
  if (toCents(subtotal) >= toCents(config.free_shipping_threshold)) return 0;
  const w = Math.round(weightLb * 1000) / 1000;
  for (const r of config.rates) {
    if (r.max_lb === null || w <= r.max_lb) return r.price;
  }
  return config.rates[config.rates.length - 1].price;
}

/**
 * Price an order from catalog data. `items` maps SKU -> { prices, weightLb, inStock, ... }.
 * Unknown SKUs and invalid quantities are reported, never silently priced.
 */
export function quoteOrder(lines, items, shippingConfig) {
  const errors = [];
  const out = [];
  const merged = new Map();
  for (const l of lines ?? []) {
    const sku = String(l?.sku ?? '').trim().toUpperCase();
    const qty = Number(l?.qty);
    if (!sku) continue;
    if (!isValidQty(qty)) {
      errors.push({ sku, code: 'bad_qty', message: `Quantity for ${sku} must be a whole number from 1 to 9999.` });
      continue;
    }
    merged.set(sku, (merged.get(sku) ?? 0) + qty);
  }
  let subtotalC = 0;
  let weight = 0;
  for (const [sku, qty] of merged) {
    const item = items[sku];
    if (!item) {
      errors.push({ sku, code: 'not_found', message: `SKU ${sku} was not found.` });
      continue;
    }
    if (!item.inStock) {
      errors.push({ sku, code: 'out_of_stock', message: `${item.name} (${sku}) is out of stock.` });
      continue;
    }
    const unit = unitPrice(item.prices, qty);
    const lineC = toCents(unit) * qty;
    subtotalC += lineC;
    weight += item.weightLb * qty;
    out.push({ sku, name: item.name, qty, unitPrice: unit, lineTotal: fromCents(lineC), weightLb: item.weightLb, item });
  }
  const subtotal = fromCents(subtotalC);
  weight = Math.round(weight * 1000) / 1000;
  const shipping = out.length ? shippingFor(weight, subtotal, shippingConfig) : 0;
  return {
    lines: out,
    errors,
    subtotal,
    weightLb: weight,
    shipping,
    total: fromCents(subtotalC + toCents(shipping)),
    freeShipping: out.length > 0 && shipping === 0,
    amountToFree: Math.max(0, fromCents(toCents(shippingConfig.free_shipping_threshold) - subtotalC)),
  };
}

/** Format a weight for display: 1.5 -> "1.5", 2 -> "2". */
export const formatLb = (w) => String(Math.round(w * 10) / 10);
