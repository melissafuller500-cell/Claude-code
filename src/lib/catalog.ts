// Build-time access to the validated catalog. Throws if the data is invalid,
// so a bad row can never reach a rendered page.
import { loadCatalog } from '../../lib/catalog.mjs';
import { formatReport } from '../../lib/report.mjs';

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

const result = loadCatalog();
if (result.errors.length) throw new Error(formatReport(result));

export const products = result.products as Product[];
export const kits = result.kits as Kit[];

export function fitmentLabel(f: FitmentEntry): string {
  if (f.universal) return 'Universal';
  const years = f.from === f.to ? `${f.from}` : `${f.from}–${f.to}`;
  return `${years} ${f.make} ${f.model}`;
}

export const primaryFitment = (p: { fitment: FitmentEntry[] }) => fitmentLabel(p.fitment[0]);

export function soldAsLabel(p: Pick<Product, 'soldAs' | 'packSize'>): string | null {
  if (p.soldAs === 'pair') return 'Sold as a pair (2 pieces)';
  if (p.soldAs === 'set') return `Set of ${p.packSize}`;
  return null;
}

export const productCount = (category: string) => products.filter((p) => p.category === category).length;
