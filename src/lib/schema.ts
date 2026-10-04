// Structured data builders (schema.org JSON-LD).
import { SITE, RULES } from '../config/site';
import { SHIPPING_RATES } from '../config/site';

export function offerFor(opts: { url: string; price: number; inStock: boolean; site: URL }) {
  return {
    '@type': 'Offer',
    url: new URL(opts.url, opts.site).href,
    priceCurrency: 'USD',
    price: opts.price.toFixed(2),
    availability: opts.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: SITE.name },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: SHIPPING_RATES[0].price.toFixed(2), currency: 'USD' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'US',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: RULES.returnDays,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnShippingFees',
    },
  };
}

export function itemList(items: { name: string; url: string }[], site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: new URL(it.url, site).href })),
  };
}
