// Browser state: cart (SKU + quantity only) and the chosen vehicle.
// Prices are never stored here; they come from /data/catalog.json (built from
// the product file) for display, and the server recalculates at checkout.
import type { Item } from '../lib/catalog';

export interface CartLine { sku: string; qty: number }
export interface Vehicle { year: number; make: string; model: string }
export interface ShippingConfig { free_shipping_threshold: number; rates: { max_lb: number | null; price: number }[] }
export interface CatalogData { items: Record<string, Item>; shipping: ShippingConfig }

const CART_KEY = 'bs-cart';
const VEHICLE_KEY = 'bs-vehicle';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: state lasts for this page only */
  }
}

// ── Cart ─────────────────────────────────────────────────────
export function getCart(): CartLine[] {
  const raw = read<unknown>(CART_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is CartLine => !!l && typeof l.sku === 'string' && Number.isInteger(l.qty) && l.qty > 0)
    .map((l) => ({ sku: l.sku, qty: Math.min(l.qty, 9999) }));
}
export function setCart(lines: CartLine[]) {
  write(CART_KEY, lines.filter((l) => l.qty > 0));
  window.dispatchEvent(new CustomEvent('cart:change'));
}
export function addToCart(sku: string, qty: number) {
  if (!Number.isInteger(qty) || qty < 1) return;
  const cart = getCart();
  const line = cart.find((l) => l.sku === sku);
  if (line) line.qty = Math.min(line.qty + qty, 9999);
  else cart.push({ sku, qty });
  setCart(cart);
  window.dispatchEvent(new CustomEvent('cart:added', { detail: { sku, qty } }));
}
export function setQty(sku: string, qty: number) {
  setCart(getCart().map((l) => (l.sku === sku ? { ...l, qty } : l)).filter((l) => l.qty > 0));
}
export const removeFromCart = (sku: string) => setCart(getCart().filter((l) => l.sku !== sku));
export const clearCart = () => setCart([]);

// ── Vehicle ──────────────────────────────────────────────────
export const getVehicle = () => read<Vehicle | null>(VEHICLE_KEY, null);
export function setVehicle(v: Vehicle | null) {
  write(VEHICLE_KEY, v);
  window.dispatchEvent(new CustomEvent('vehicle:change'));
}
export const vehicleLabel = (v: Vehicle) => `${v.year} ${v.make} ${v.model}`;

/** Does an encoded fitment ("Make|Model|from|to;..." or "U") fit the vehicle? */
export function fitsVehicle(attr: string | undefined, v: Vehicle): boolean {
  if (!attr) return false;
  if (attr === 'U') return true;
  return attr.split(';').some((e) => {
    const [make, model, from, to] = e.split('|');
    return make === v.make && model === v.model && v.year >= Number(from) && v.year <= Number(to);
  });
}

// ── Catalog data (lazy) ──────────────────────────────────────
let catalogPromise: Promise<CatalogData> | null = null;
export function loadCatalogData(): Promise<CatalogData> {
  catalogPromise ??= fetch('/data/catalog.json').then((r) => {
    if (!r.ok) throw new Error('catalog');
    return r.json();
  });
  return catalogPromise;
}

export const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
