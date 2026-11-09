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
  cycle: { en: 'End of cycle', fr: 'Fin de cycle' },
  harvest: { en: 'Per harvest', fr: 'Par récolte' },
  exit: { en: 'At exit', fr: 'À la sortie' },
};

const payMethods = {
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

module.exports = { countries, fx, payoutFreq, payMethods, statusLabels, tiers, tierFor };
