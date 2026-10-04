// Pre-built search index: product name, SKU, original part numbers, vehicle.
import type { APIRoute } from 'astro';
import { products, kits, productUrl, kitUrl, primaryFitment, categoryName } from '../../lib/catalog';

export const GET: APIRoute = () => {
  const entries = [
    ...products.map((p) => ({
      s: p.sku, n: p.name, u: productUrl(p), f: `Fits ${primaryFitment(p)}${p.fitment.length > 1 ? ` + ${p.fitment.length - 1} more` : ''}`,
      o: p.oeRefs.join(' '), v: p.fitment.map((f) => (f.universal ? 'universal' : `${f.make} ${f.model} ${f.from} ${f.to} ${yearsList(f.from!, f.to!)}`)).join(' '),
      c: categoryName(p.category), p: p.prices[0].price,
    })),
    ...kits.map((k) => ({
      s: k.sku, n: k.name, u: kitUrl(k), f: `Kit · Fits ${primaryFitment(k)}`, o: '',
      v: k.fitment.map((f) => (f.universal ? 'universal' : `${f.make} ${f.model} ${yearsList(f.from!, f.to!)}`)).join(' '),
      c: 'kit kits', p: k.prices[0].price,
    })),
  ];
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } });
};
function yearsList(a: number, b: number) {
  const out: number[] = [];
  for (let y = a; y <= b; y++) out.push(y);
  return out.join(' ');
}
