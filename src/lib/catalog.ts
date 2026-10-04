// Validated catalog, shared by pages (build time) and /api/ routes (run time).
// The CSV files are bundled as text, so the deployed server never reads data/ from disk.
import { validateCatalog, slugify } from '../../lib/catalog.mjs';
import { formatReport } from '../../lib/report.mjs';
import productsCsv from '../../data/products.csv?raw';
import kitsCsv from '../../data/kits.csv?raw';
import categories from '../../data/categories.json';
import blocked from '../../data/blocked-terms.json';

export interface FitmentEntry { make?: string; model?: string; from?: number; to?: number; universal?: boolean }
export interface Tier { min: number; price: number }
export interface Product {
  sku: string; name: string; slug: string; category: string;
  shortDescription: string; description: string;
  fitment: FitmentEntry[]; universal: boolean; oeRefs: string[];
  specs: { key: string; value: string }[];
  packSize: number; prices: Tier[]; caseQty: number | null; weightLb: number;
  inStock: boolean; imageMain: string; imageType: 'illustrative' | 'actual';
  warrantyMonths: number; prop65: boolean; caRestricted: boolean; brand: string;
  gtin: string | null; soldAs: 'each' | 'pair' | 'set'; boughtWith: string[]; sample: boolean;
}
export interface Kit {
  sku: string; name: string; slug: string; components: { sku: string; qty: number }[];
  prices: Tier[]; description: string; fitment: FitmentEntry[]; universal: boolean;
  separatePrice: number; weightLb: number; inStock: boolean; prop65: boolean; caRestricted: boolean; sample: boolean;
}
/** Anything that can go in the cart: a product or a kit. */
export interface Item {
  sku: string; kind: 'product' | 'kit'; name: string; url: string; fitmentLine: string;
  label: string | null; prices: Tier[]; weightLb: number; inStock: boolean;
  caRestricted: boolean; prop65: boolean;
}

declare const __BAYSTOCK_PRODUCTION__: boolean;

const result = validateCatalog({
  productsCsv,
  kitsCsv,
  categories,
  blockedTerms: blocked.terms,
  production: typeof __BAYSTOCK_PRODUCTION__ !== 'undefined' && __BAYSTOCK_PRODUCTION__,
});
if (result.errors.length) throw new Error(formatReport(result));

export const products = result.products as Product[];
export const kits = result.kits as Kit[];
export const IS_SAMPLE_CATALOG = products.some((p) => p.sample);

export const productsBySku = new Map(products.map((p) => [p.sku, p]));
export const kitsBySku = new Map(kits.map((k) => [k.sku, k]));

// ── Labels ───────────────────────────────────────────────────
export function fitmentLabel(f: FitmentEntry): string {
  if (f.universal) return 'Universal';
  const years = f.from === f.to ? `${f.from}` : `${f.from}–${f.to}`;
  return `${years} ${f.make} ${f.model}`;
}
export const primaryFitment = (p: { fitment: FitmentEntry[] }) => fitmentLabel(p.fitment[0]);

/** "This part fits the 2018–2024 Toyota Camry and the 2019–2024 Toyota RAV4." */
export function fitsSentence(p: { fitment: FitmentEntry[]; universal: boolean }, noun = 'This part'): string {
  if (p.universal) return `${noun} is universal and is not specific to one vehicle.`;
  const parts = p.fitment.map((f) => `the ${fitmentLabel(f)}`);
  const list = parts.length <= 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
  return `${noun} fits ${list}.`;
}

export function soldAsLabel(p: Pick<Product, 'soldAs' | 'packSize'>): string | null {
  if (p.soldAs === 'pair') return 'Sold as a pair (2 pieces)';
  if (p.soldAs === 'set') return `Set of ${p.packSize}`;
  return null;
}
export const unitWord = (p: Pick<Product, 'soldAs'>) => (p.soldAs === 'pair' ? 'pair' : p.soldAs === 'set' ? 'set' : 'each');

export const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
export const productUrl = (p: Pick<Product, 'category' | 'slug'>) => `/parts/${p.category}/${p.slug}/`;
export const kitUrl = (k: Pick<Kit, 'slug'>) => `/kits/${k.slug}/`;
export const productCount = (category: string) => products.filter((p) => p.category === category).length;

/** Pick the first title candidate under 60 characters. */
export function fitTitle(...candidates: string[]): string {
  return candidates.find((c) => c.length < 60) ?? candidates[candidates.length - 1].slice(0, 59);
}
/** Trim a meta description to under 155 characters at a word boundary. */
export function fitDescription(s: string): string {
  if (s.length < 155) return s;
  const cut = s.slice(0, 152);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

// ── Purchasable items (cart, quick order, checkout) ──────────
export const items: Record<string, Item> = {};
for (const p of products) {
  items[p.sku] = {
    sku: p.sku, kind: 'product', name: p.name, url: productUrl(p), fitmentLine: `Fits ${primaryFitment(p)}`,
    label: soldAsLabel(p), prices: p.prices, weightLb: p.weightLb, inStock: p.inStock,
    caRestricted: p.caRestricted, prop65: p.prop65,
  };
}
for (const k of kits) {
  items[k.sku] = {
    sku: k.sku, kind: 'kit', name: k.name, url: kitUrl(k), fitmentLine: `Fits ${primaryFitment(k)}`,
    label: 'Kit', prices: k.prices, weightLb: k.weightLb, inStock: k.inStock,
    caRestricted: k.caRestricted, prop65: k.prop65,
  };
}

// ── Vehicles ─────────────────────────────────────────────────
export interface VehicleModel { make: string; makeSlug: string; model: string; modelSlug: string; years: number[] }

function buildVehicles(): VehicleModel[] {
  const map = new Map<string, VehicleModel>();
  for (const p of [...products, ...kits]) {
    for (const f of p.fitment) {
      if (f.universal || !f.make || !f.model) continue;
      const key = `${f.make}|${f.model}`;
      const v: VehicleModel = map.get(key) ?? { make: f.make, makeSlug: slugify(f.make), model: f.model, modelSlug: slugify(f.model), years: [] };
      for (let y = f.from!; y <= f.to!; y++) if (!v.years.includes(y)) v.years.push(y);
      map.set(key, v);
    }
  }
  return [...map.values()]
    .map((v) => ({ ...v, years: v.years.sort((a, b) => b - a) }))
    .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
}
export const vehicles = buildVehicles();
export const makes = [...new Map(vehicles.map((v) => [v.makeSlug, v.make])).entries()].map(([slug, name]) => ({ slug, name }));

export function fits(p: { fitment: FitmentEntry[] }, make: string, model: string, year?: number): boolean {
  return p.fitment.some(
    (f) => f.universal || (f.make === make && f.model === model && (year === undefined || (year >= f.from! && year <= f.to!))),
  );
}
export const productsForVehicle = (make: string, model: string) =>
  products.filter((p) => !p.universal && fits(p, make, model));
export const kitsForVehicle = (make: string, model: string) => kits.filter((k) => !k.universal && fits(k, make, model));

/** Compact fitment for data attributes: "Toyota|Camry|2018|2024;..." or "U". */
export const fitmentAttr = (p: { fitment: FitmentEntry[]; universal: boolean }) =>
  p.universal ? 'U' : p.fitment.map((f) => `${f.make}|${f.model}|${f.from}|${f.to}`).join(';');

export const kitsContaining = (sku: string) => kits.filter((k) => k.components.some((c) => c.sku === sku));

/** Related: same vehicle first, then same category. */
export function relatedProducts(p: Product, n = 4): Product[] {
  const main = p.fitment[0];
  const others = products.filter((o) => o.sku !== p.sku);
  const sameVehicle = main?.make ? others.filter((o) => fits(o, main.make!, main.model!)) : [];
  const sameCat = others.filter((o) => o.category === p.category);
  const out: Product[] = [];
  for (const o of [...sameVehicle.filter((o) => o.category !== p.category), ...sameCat, ...sameVehicle]) {
    if (!out.includes(o)) out.push(o);
    if (out.length === n) break;
  }
  return out;
}
