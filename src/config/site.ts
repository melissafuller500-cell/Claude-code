// Single source for business facts. Every page, the structured data, llms.txt,
// and the chatbot read these values so the same facts appear everywhere.
// Values in {CURLY_BRACES} are placeholders until the owner supplies them.

import categories from '../../data/categories.json';
import shippingRates from '../../data/shipping-rates.json';

export const SITE = {
  name: 'BayStock Auto Parts',
  shortName: 'BayStock',
  domain: 'baystockparts.com',
  locale: 'en-US',
  legalName: '{LEGAL_NAME}',
  address: '{US_ADDRESS}',
  phone: '{PHONE}',
  supportEmail: '{SUPPORT_EMAIL}',
  supportHours: '{SUPPORT_HOURS}',
  shippingWindow: '{SHIPPING_WINDOW}',
} as const;

export const RULES = {
  currency: 'USD',
  minimumOrder: 0,
  tiers: [1, 3, 10, 50] as const,
  freeShippingThreshold: shippingRates.free_shipping_threshold,
  shippingFrom: shippingRates.rates[0].price,
  warrantyMonths: 12,
  returnDays: 30,
  shipsTo: 'the 48 contiguous states',
  // "Checked before it is stocked" is published only once the owner confirms inspection takes place.
  inspectionConfirmed: false,
} as const;

export const CATEGORIES = categories;
export const SHIPPING_RATES = shippingRates.rates;

export const DISCLAIMER =
  'Vehicle makes and models are named for compatibility only. BayStock is not affiliated with any vehicle manufacturer.';

export const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export const CATEGORY_ICONS: Record<string, string> = {
  sensors: 'sensor', 'ignition-coils': 'coil', 'spark-plugs': 'plug', 'ignition-kits': 'ignkit',
  'brake-pads': 'brake', 'cabin-air-filters': 'filter', 'engine-air-filters': 'airfilter', 'oil-filters': 'oil',
  'wiper-blades': 'wiper', 'bulbs-leds': 'bulb', 'clips-fasteners': 'clip', suspension: 'spring',
  'mounts-bushings': 'mount', 'switches-handles': 'switch', 'cooling-fuel': 'cooling', 'shop-supplies': 'toolbox',
};
