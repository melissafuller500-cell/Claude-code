'use strict';
// Reference data shared by views, validation and seeding.
const countries = {
  CM: { en: 'Cameroon', fr: 'Cameroun' }, CI: { en: "Côte d'Ivoire", fr: "Côte d'Ivoire" }, SN: { en: 'Senegal', fr: 'Sénégal' },
  NG: { en: 'Nigeria', fr: 'Nigeria' }, GH: { en: 'Ghana', fr: 'Ghana' }, KE: { en: 'Kenya', fr: 'Kenya' },
  RW: { en: 'Rwanda', fr: 'Rwanda' }, MA: { en: 'Morocco', fr: 'Maroc' }, ML: { en: 'Mali', fr: 'Mali' },
  ZM: { en: 'Zambia', fr: 'Zambie' }, TZ: { en: 'Tanzania', fr: 'Tanzanie' }, ET: { en: 'Ethiopia', fr: 'Éthiopie' },
  EG: { en: 'Egypt', fr: 'Égypte' }, ZA: { en: 'South Africa', fr: 'Afrique du Sud' }, GA: { en: 'Gabon', fr: 'Gabon' },
  BJ: { en: 'Benin', fr: 'Bénin' }, AE: { en: 'United Arab Emirates', fr: 'Émirats arabes unis' }, PT: { en: 'Portugal', fr: 'Portugal' },
  FR: { en: 'France', fr: 'France' }, US: { en: 'United States', fr: 'États-Unis' },
};

// Local currency units per 1 USD (indicative, used for display and conversions only).
const fx = { USD: 1, XAF: 600, XOF: 600, EUR: 0.92, AED: 3.6725, MAD: 10, GHS: 15, NGN: 1550, KES: 129 };

const payoutFreq = {
  weekly: { en: 'Weekly', fr: 'Hebdo' },
  monthly: { en: 'Monthly', fr: 'Mensuel' },
  quarterly: { en: 'Quarterly', fr: 'Trimestriel' },
  semiannual: { en: 'Every 6 months', fr: 'Semestriel' },
  annual: { en: 'Yearly', fr: 'Annuel' },
  cycle: { en: 'End of cycle', fr: 'Fin de cycle' },
  harvest: { en: 'Per harvest', fr: 'Par récolte' },
  exit: { en: 'At exit', fr: 'À la sortie' },
};

// Payout schedules an investor can choose for an income-producing investment.
const payoutSchedules = {
  weekly: { perYear: 52, months: 0, days: 7, en: 'Every week', fr: 'Chaque semaine' },
  monthly: { perYear: 12, months: 1, en: 'Every month', fr: 'Chaque mois' },
  quarterly: { perYear: 4, months: 3, en: 'Every 3 months', fr: 'Tous les 3 mois' },
  semiannual: { perYear: 2, months: 6, en: 'Every 6 months', fr: 'Tous les 6 mois' },
  annual: { perYear: 1, months: 12, en: 'Every year', fr: 'Chaque année' },
};
function nextPayoutAt(from, freq) {
  const s = payoutSchedules[freq] || payoutSchedules.monthly;
  if (s.days) return from + s.days * 864e5;
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + s.months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}

const MIN_INVEST_USD = 500;

// Local currency per country (for country pages).
const localCurrency = { CM: 'FCFA (XAF)', GA: 'FCFA (XAF)', CI: 'FCFA (XOF)', SN: 'FCFA (XOF)', ML: 'FCFA (XOF)', BJ: 'FCFA (XOF)', NG: 'Naira (NGN)', GH: 'Cedi (GHS)', KE: 'Kenyan shilling (KES)', RW: 'Rwandan franc (RWF)', MA: 'Dirham (MAD)', ZM: 'Kwacha (ZMW)', TZ: 'Tanzanian shilling (TZS)', ET: 'Birr (ETB)', EG: 'Egyptian pound (EGP)', ZA: 'Rand (ZAR)', AE: 'Dirham (AED)', PT: 'Euro (EUR)', FR: 'Euro (EUR)', US: 'US dollar (USD)' };
const countrySlug = (code) => (countries[code] ? countries[code].en : code).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const payMethods = {
  balance: { label: 'Account balance (instant)', kind: 'balance' },
  usdt: { label: 'USDT (TRC-20 / ERC-20)', kind: 'crypto' },
  usdc: { label: 'USDC (ERC-20 / Polygon)', kind: 'crypto' },
  btc: { label: 'BTC (Bitcoin / Lightning)', kind: 'crypto' },
  eth: { label: 'ETH (Ethereum)', kind: 'crypto' },
  momo: { label: 'MTN Mobile Money', kind: 'cash' },
  orange: { label: 'Orange Money', kind: 'cash' },
  card: { label: 'Visa / Mastercard', kind: 'cash' },
  bank: { label: 'Bank transfer (SWIFT / SEPA)', kind: 'cash' },
};

const statusLabels = {
  pending: { en: 'Pending payment', fr: 'Paiement en attente' },
  withdrawn: { en: 'Withdrawn', fr: 'Retirée' },
  active: { en: 'Active', fr: 'Actif' },
  rejected: { en: 'Rejected', fr: 'Refusé' },
  cancelled: { en: 'Cancelled', fr: 'Annulé' },
  expired: { en: 'Expired', fr: 'Expiré' },
  completed: { en: 'Completed', fr: 'Terminé' },
  open: { en: 'Open', fr: 'Ouvert' },
  funded: { en: 'Funded', fr: 'Financé' },
  closed: { en: 'Closed', fr: 'Clôturé' },
  draft: { en: 'Draft', fr: 'Brouillon' },
  none: { en: 'Not started', fr: 'Non commencé' },
  verified: { en: 'Verified', fr: 'Vérifié' },
  new: { en: 'New', fr: 'Nouveau' },
  reviewing: { en: 'Reviewing', fr: 'En revue' },
  accepted: { en: 'Accepted', fr: 'Accepté' },
  declined: { en: 'Declined', fr: 'Refusé' },
  read: { en: 'Read', fr: 'Lu' },
  archived: { en: 'Archived', fr: 'Archivé' },
  completed_tx: { en: 'Completed', fr: 'Effectué' },
  suspended: { en: 'Suspended', fr: 'Suspendu' },
};

const tiers = [
  { min: 50000, bonus: 4, name: 'Platinum' },
  { min: 10000, bonus: 2, name: 'Gold' },
  { min: 1000, bonus: 1, name: 'Silver' },
  { min: 0, bonus: 0, name: 'Standard' },
];
const tierFor = (usd) => tiers.find((t) => usd >= t.min);

module.exports = { localCurrency, countrySlug, countries, fx, payoutFreq, payoutSchedules, nextPayoutAt, MIN_INVEST_USD, payMethods, statusLabels, tiers, tierFor };
