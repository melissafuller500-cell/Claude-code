// Written copy from the specification, used exactly as given.
// Pages, structured data, llms.txt, and the chatbot all read from here so the
// same facts are worded the same way everywhere.
import { SITE, RULES } from '../config/site';

export interface Reason { id: string; title: string; copy: string; short: string; icon: string }

const allReasons: Reason[] = [
  {
    id: 'factory-direct',
    title: 'Factory-direct prices',
    copy: 'We buy straight from the manufacturers in Asia that make the parts, with no importer or distributor in between. That saving goes into the price you pay.',
    short: 'Factory-direct prices',
    icon: 'factory',
  },
  {
    id: 'checked',
    title: 'Checked before it is stocked',
    copy: 'We sample and inspect every product before it goes on our shelf.',
    short: 'Checked before it is stocked',
    icon: 'check',
  },
  {
    id: 'fitment',
    title: 'Fitment you can check first',
    copy: 'Every listing shows the makes, models, and years it fits, plus the original part numbers it replaces.',
    short: 'Fitment you can check first',
    icon: 'car',
  },
  {
    id: 'warranty',
    title: 'Backed after the sale',
    copy: 'Every part carries a 12-month warranty and can be returned unused within 30 days.',
    short: '12-month warranty',
    icon: 'shield',
  },
  {
    id: 'us',
    title: 'Ships from the US',
    copy: `Orders leave our US warehouse and usually arrive in ${SITE.shippingWindow}.`,
    short: 'Ships from the US',
    icon: 'truck',
  },
  {
    id: 'quantity',
    title: 'Lower prices in quantity',
    copy: 'Car owners and shops see the same price list, and the unit price drops at 3, 10, and 50.',
    short: 'Lower prices in quantity',
    icon: 'tag',
  },
  {
    id: 'person',
    title: 'A real person to talk to',
    copy: 'Questions before or after you order are answered on WhatsApp or by email.',
    short: 'A real person to talk to',
    icon: 'chat',
  },
];

/** "Checked before it is stocked" is published only once the owner confirms inspection. */
export const REASONS = allReasons.filter((r) => r.id !== 'checked' || RULES.inspectionConfirmed);

/** Product and kit page strip: four short reasons with icons. */
export const PRODUCT_STRIP = [
  { icon: 'factory', text: 'Factory-direct prices' },
  { icon: 'shield', text: '12-month warranty' },
  { icon: 'box', text: '30-day returns' },
  { icon: 'truck', text: 'Ships from the US' },
];

export const FACT_STRIP = ['Factory-direct prices', 'Free shipping over $250', '12-month warranty', 'No minimum order'];

export interface QA { q: string; a: string }

export const FAQ: QA[] = [
  { q: 'Who can buy from BayStock?', a: 'Anyone in the contiguous US: car owners, repair shops, installers, and resellers. You do not need an account.' },
  { q: 'Why are your prices lower?', a: 'We buy straight from the manufacturers in Asia that make the parts, with no importer or distributor in between.' },
  { q: 'Is there a minimum order?', a: 'No. You can buy a single part.' },
  { q: 'How much is shipping?', a: 'Shipping is charged by order weight, starting at $9, and the amount is shown in your cart. Orders of $250 or more ship free.' },
  { q: 'How do I pay?', a: 'You are not charged on the website. After you place your order, we confirm it on WhatsApp and send payment instructions. If you do not use WhatsApp, reply to your confirmation email instead.' },
  { q: 'When does my order ship?', a: `Once payment is received. Orders ship from our US warehouse by ground and usually arrive in ${SITE.shippingWindow}.` },
  { q: 'How do the volume discounts work?', a: 'Each product has four unit prices: 1–2, 3–9, 10–49, and 50 or more. The price drops automatically as you raise the quantity of that product.' },
  { q: 'Can I mix products to reach a lower tier?', a: 'No. Tiers apply to the quantity of each product. Any mix of products counts toward free shipping at $250.' },
  { q: 'Why are some parts sold only in pairs?', a: 'Parts such as sway bar links, tie rod ends, and wiper blades wear at the same rate on both sides, so they are replaced together. The price shown is for the pair.' },
  { q: 'What is a kit?', a: 'A kit groups the different parts needed for one job, such as the oil, engine air, and cabin filters for one vehicle, at a lower price than buying them separately.' },
  { q: 'Do you ship outside the contiguous US?', a: 'Not at this time.' },
  { q: 'How do I know a part fits?', a: 'Each listing shows the makes, models, and years it fits and the original part numbers it replaces. If you are unsure, send us the vehicle’s year, make, model, and engine before ordering.' },
  { q: 'Are these original manufacturer parts?', a: 'No. They are aftermarket replacement parts built to fit the listed vehicles. Original part numbers are shown for reference only.' },
  { q: 'What is the warranty?', a: '12 months against defects in materials and workmanship. See the warranty page for details.' },
  { q: 'Can I return parts?', a: 'Yes, unused and in original packaging, within 30 days of delivery.' },
  { q: 'Do you charge sales tax?', a: 'Where sales tax applies, it is shown on your payment request before you pay.' },
];

export const SHIPPING_COPY = `Orders of $250 or more ship free by ground to the 48 contiguous states. Smaller orders pay shipping by weight, starting at $9, and the exact amount is shown in your cart before you place the order. Orders ship from our US warehouse once payment is received and usually arrive in ${SITE.shippingWindow}. You receive a tracking number when the order leaves the warehouse. We do not currently ship to Alaska, Hawaii, US territories, PO boxes, or addresses outside the United States.`;

export const RETURNS_COPY = `You can return unused parts in their original packaging within 30 days of delivery. Email ${SITE.supportEmail} with your order number to get a return authorization. If we sent the wrong part or it arrived damaged, we pay the return shipping. Refunds go back to the original payment method after the parts are received and checked.`;

export const WARRANTY_COPY = `Every part is covered for 12 months from delivery against defects in materials and workmanship. To make a claim, email ${SITE.supportEmail} with your order number, the SKU, and a photo of the part. We replace the part or refund its price. The warranty does not cover wear from normal use, incorrect installation, labor costs, or damage caused by other failed components.`;

export const ABOUT_COPY = `BayStock sells the replacement parts cars need most, at the same clear prices for everyone. We buy straight from the manufacturers in Asia that make the parts, with no importer or distributor in between, and hold stock in a US warehouse. Car owners can buy a single part or a kit for one job. Repair shops can stock up by the case and pay less per unit. BayStock is operated by ${SITE.legalName}, ${SITE.address}.`;

export const WHOLESALE_SECTIONS: { h: string; p: string }[] = [
  { h: 'Four prices on every part', p: 'Each product lists a unit price for 1–2, 3–9, 10–49, and 50 or more. The tier is set by the quantity of that product in your cart.' },
  { h: 'Why our prices are lower', p: 'We buy straight from the manufacturers in Asia that make the parts, with no importer or distributor in between. That saving goes into the price you pay.' },
  { h: 'No minimum order', p: 'Buy a single part for your own car or a full case for your shop. The unit price drops as the quantity goes up.' },
  { h: 'Shipping', p: 'Orders of $250 or more ship free by ground. Smaller orders pay shipping by weight, starting at $9.' },
  { h: 'Pairs and kits', p: 'Parts that are replaced together are sold as a pair or a set, and the price shown covers all the pieces. Kits group the different parts for one job at a lower price than buying them separately.' },
  { h: 'Who can order', p: 'Anyone in the contiguous US: car owners, repair shops, installers, and resellers. No account or approval needed.' },
  { h: 'How you pay', p: 'You are not charged on the website. After you place your order, we confirm it with you on WhatsApp and send payment instructions. Your order ships once payment is received.' },
  { h: 'Sales tax and resale certificates', p: 'Where sales tax applies, it is shown on your payment request. If you hold a resale certificate, tell us when we confirm your order.' },
];

export const CATEGORY_INTROS: Record<string, string> = {
  sensors: 'Oxygen, ABS wheel speed, camshaft, crankshaft, and tire pressure sensors for the vehicles shops see most. Each listing shows the connector type and the original numbers it replaces, so you can match it before you order.',
  'ignition-coils': 'Direct-fit ignition coils sold singly and in full engine sets. Stock the common four-, six-, and eight-cylinder applications and pay less per coil at 10 and 50.',
  'spark-plugs': 'Iridium and platinum spark plugs in sets matched to the engine. Gap and thread size are listed on every product.',
  'ignition-kits': 'Ignition coils and spark plugs packed together for a complete tune-up on one engine. One SKU per job keeps your shelf simple.',
  'brake-pads': 'Ceramic brake pad sets for popular cars and light trucks, with hardware where listed. Front and rear sets are sold separately.',
  'cabin-air-filters': 'Cabin air filters in standard and activated-carbon versions. One of the fastest-moving service items, priced to buy by the case.',
  'engine-air-filters': 'Engine air filters sized to the original housing. Dimensions are listed so you can confirm the fit against the part you remove.',
  'oil-filters': 'Spin-on and cartridge oil filters for common engines, sold in case quantities for shops doing daily oil changes.',
  'wiper-blades': 'Beam and conventional wiper blades in every common length, with adapter types listed. Stock a full range of sizes in one order.',
  'bulbs-leds': 'Headlight, brake, turn signal, and interior bulbs in standard and LED versions, sold in multi-packs.',
  'clips-fasteners': 'Trim clips, push retainers, oil drain plugs, and crush washers in assortments and bulk bags. The small parts that stop a job when you run out.',
  suspension: 'Sway bar links, tie rod ends, and ball joints for high-volume cars and trucks, with greaseable options where listed.',
  'mounts-bushings': 'Engine mounts, transmission mounts, and bushing kits, sold singly and in vehicle sets.',
  'switches-handles': 'Window switches, door handles, and related interior parts that fail often on high-mileage vehicles.',
  'cooling-fuel': 'Thermostats, radiator caps, and small fuel system parts for routine service.',
  'shop-supplies': 'Battery terminals, fuses, gloves, and other consumables your shop uses every day.',
};

export const COPY = {
  cartBelow: (amount: string) => `Add ${amount} more for free shipping.`,
  cartFree: 'Free shipping unlocked.',
  cartShipping: (weight: string, amount: string) => `Shipping (${weight} lb): ${amount}`,
  cartEmpty: 'Your cart is empty. Start with your vehicle or a category.',
  tierNudge: (n: number, price: string) => `Add ${n} more to pay ${price} each.`,
  pairLabel: 'Sold as a pair (2 pieces)',
  kitSaving: (amount: string) => `Save ${amount} against buying these parts separately.`,
  aboveOrderButton: 'You will not be charged now. Confirm your order on WhatsApp to receive the payment details for it.',
  orderButton: 'Place order and continue on WhatsApp',
  orderPlaced: (orderNumber: string, email: string) =>
    `Order ${orderNumber} received. Continue on WhatsApp to confirm it and get payment instructions. A copy is on its way to ${email}.`,
  noWhatsApp: 'No WhatsApp? Reply to your confirmation email and we will send payment details there.',
  outOfStock: 'Out of stock. Message us for a restock date.',
  shippingLine: 'Shipping from $9, by weight. Free over $250.',
  oeNote: 'Original numbers are for reference only.',
  illustrative: 'Image for illustration. Check fitment and specifications before ordering.',
  // Short-form Proposition 65 warning. The exact wording needs attorney review.
  prop65: 'WARNING: Cancer and Reproductive Harm – www.P65Warnings.ca.gov.',
  caRestricted: 'Not for sale in California',
  chatbotFallback: `I can't confirm that from our catalog. Please contact us at ${SITE.supportEmail} with the year, make, model, and engine.`,
};
