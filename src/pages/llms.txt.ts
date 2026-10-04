import type { APIRoute } from 'astro';
import { SITE, CATEGORIES, SHIPPING_RATES } from '../config/site';
import { REASONS, FAQ } from '../content/copy';
import { products, kits, vehicles, productCount } from '../lib/catalog';

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.name} (${SITE.domain}) sells aftermarket replacement auto parts to independent repair shops and everyday car owners in the contiguous United States, bought direct from the manufacturers in Asia that make them and shipped from a US warehouse. Every part has four unit prices that drop at 3, 10, and 50 units.`,
    '',
    '## Business rules',
    '- Minimum order: none. Any order size is accepted, from a single part.',
    '- Pricing: four unit prices per product, for 1–2, 3–9, 10–49, and 50 or more. The tier is set by the quantity of each product line, not by the whole cart.',
    `- Shipping: free ground shipping on orders of $250 or more (subtotal). Below $250, shipping is charged by order weight, starting at $${SHIPPING_RATES[0].price}. Contiguous US only; no Alaska, Hawaii, US territories, or PO boxes. Delivery usually takes ${SITE.shippingWindow}.`,
    '- Warranty: 12 months from delivery against defects in materials and workmanship.',
    '- Returns: unused parts in original packaging within 30 days of delivery.',
    '- Pairs, sets, and kits: parts replaced together are sold as a pair or set; kits group the different parts for one job at a lower price than buying them separately.',
    '- Payment: no payment is taken on the website. Orders are confirmed on WhatsApp or by email with payment instructions, and ship once payment is received.',
    '- Not sold: emissions-defeat products (delete kits, defeat tuners). Not offered: urgent same-day delivery.',
    '- Parts are aftermarket replacements. Original part numbers are shown for reference only. Vehicle makes are named for compatibility only; BayStock is not affiliated with any vehicle manufacturer.',
    '',
    '## Why customers buy from BayStock',
    ...REASONS.map((r) => `- ${r.title}: ${r.copy}`),
    '',
    '## Key pages',
    `- [Home](${u('/')})`,
    `- [All parts](${u('/parts/')}): ${products.length} products`,
    `- [Service kits](${u('/kits/')}): ${kits.length} kits`,
    `- [Shop by vehicle](${u('/vehicles/')}): ${vehicles.length} models`,
    `- [How pricing works](${u('/wholesale/')})`,
    `- [Shipping](${u('/shipping/')})`,
    `- [Returns](${u('/returns/')})`,
    `- [Warranty](${u('/warranty/')})`,
    `- [FAQ](${u('/faq/')})`,
    `- [About](${u('/about/')})`,
    `- [Contact](${u('/contact/')})`,
    `- [Blog](${u('/blog/')})`,
    '',
    '## Categories',
    ...CATEGORIES.map((c) => `- [${c.name}](${u(`/parts/${c.slug}/`)}): ${productCount(c.slug)} products`),
    '',
    '## Frequently asked questions',
    ...FAQ.map((f) => `- ${f.q} ${f.a}`),
    '',
    '## Company',
    `- Operated by ${SITE.legalName}, ${SITE.address}`,
    `- Phone: ${SITE.phone}`,
    `- Email: ${SITE.supportEmail}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
