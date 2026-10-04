// Google Merchant Center feed. Products with illustrative images are left out,
// because Shopping ads require an image of the actual product. Submit it to
// Merchant Center only when Stripe mode is live.
import type { APIRoute } from 'astro';
import { products, productUrl, categoryName } from '../../lib/catalog';
import { imageUrl } from '../../lib/images';

const x = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export const GET: APIRoute = async ({ site }) => {
  const items: string[] = [];
  for (const p of products.filter((p) => p.imageType === 'actual')) {
    const img = await imageUrl('products', p.imageMain, site!);
    if (!img) continue;
    items.push(`    <item>
      <g:id>${x(p.sku)}</g:id>
      <g:title>${x(`${p.name} for ${p.fitment[0].universal ? 'universal fit' : `${p.fitment[0].from}-${p.fitment[0].to} ${p.fitment[0].make} ${p.fitment[0].model}`}`.slice(0, 150))}</g:title>
      <g:description>${x(p.description)}</g:description>
      <g:link>${x(new URL(productUrl(p), site).href)}</g:link>
      <g:image_link>${x(img)}</g:image_link>
      <g:price>${p.prices[0].price.toFixed(2)} USD</g:price>
      <g:availability>${p.inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${x(p.brand)}</g:brand>
      ${p.gtin ? `<g:gtin>${x(p.gtin)}</g:gtin>` : `<g:mpn>${x(p.sku)}</g:mpn>\n      <g:identifier_exists>no</g:identifier_exists>`}
      <g:shipping_weight>${p.weightLb} lb</g:shipping_weight>
      <g:google_product_category>Vehicles &amp; Parts &gt; Vehicle Parts &amp; Accessories</g:google_product_category>
      <g:product_type>${x(categoryName(p.category))}</g:product_type>
    </item>`);
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>BayStock Auto Parts</title>
    <link>${x(new URL('/', site).href)}</link>
    <description>BayStock Auto Parts product feed</description>
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
