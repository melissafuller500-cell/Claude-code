/** Offres : prix et termes repris tels quels du site actuel (interdit de les modifier). */
export type Offer = {
  step: { fr: string; en: string };
  name: { fr: string; en: string };
  price: number;
  /** Fourchette annoncée (document maître : 150 000 – 250 000 FCFA, à tester). */
  maxPrice?: number;
  from?: boolean;
  perMonth?: boolean;
  summary: { fr: string; en: string };
  items: { fr: string; en: string }[];
  note?: { fr: string; en: string };
  featured?: boolean;
};

export const OFFERS: Offer[] = [
  {
    step: { fr: 'Étape 1', en: 'Step 1' },
    name: { fr: 'Audit Trésorerie et Contrats', en: 'Cash & Contracts Audit' },
    price: 50000,
    summary: {
      fr: 'État de vos créances, principales failles contractuelles, plan d’action.',
      en: 'State of your receivables, main contract gaps, action plan.',
    },
    items: [
      { fr: 'Vos factures en attente, classées par âge et par client', en: 'Your outstanding invoices, sorted by age and by client' },
      { fr: 'La lecture de vos contrats, devis et bons de commande', en: 'A review of your contracts, quotes and purchase orders' },
      { fr: 'Les failles classées de la plus coûteuse à la moins coûteuse', en: 'Gaps ranked from most to least costly' },
      { fr: 'Un plan d’action écrit : qui fait quoi, et quand', en: 'A written action plan: who does what, and when' },
    ],
  },
  {
    step: { fr: 'Étape 2', en: 'Step 2' },
    name: { fr: 'Système Encaissement', en: 'Collection System' },
    price: 150000,
    maxPrice: 250000,
    from: true,
    featured: true,
    summary: {
      fr: 'Modèles de contrats, tableau de suivi des créances, scripts de relance WhatsApp, formation de votre équipe.',
      en: 'Contract templates, receivables tracker, WhatsApp reminder scripts, team training.',
    },
    items: [
      { fr: 'Modèles de contrat et de conditions de paiement adaptés à votre activité', en: 'Contract and payment-terms templates fitted to your business' },
      { fr: 'Tableau de suivi des créances, prêt à remplir', en: 'Receivables tracker, ready to fill in' },
      { fr: 'Scripts de relance WhatsApp et e-mail, du rappel courtois à la mise en demeure', en: 'WhatsApp and email reminder scripts, from polite reminder to formal notice' },
      { fr: 'Formation de la personne qui tiendra le suivi', en: 'Training for the person who will run the tracking' },
    ],
    note: {
      fr: 'Le prix dépend de votre situation, dans cette fourchette. L’audit sert à le chiffrer précisément.',
      en: 'The price depends on your situation, within this range. The audit is used to quote it precisely.',
    },
  },
  {
    step: { fr: 'Étape 3', en: 'Step 3' },
    name: { fr: 'Suivi mensuel', en: 'Monthly follow-up' },
    price: 35000,
    perMonth: true,
    summary: {
      fr: 'Un point chaque mois sur vos créances et vos relances.',
      en: 'A monthly review of your receivables and reminders.',
    },
    items: [
      { fr: 'La mesure de votre délai moyen de paiement', en: 'Measurement of your average payment time' },
      { fr: 'La revue des factures les plus anciennes', en: 'Review of the oldest invoices' },
      { fr: 'L’ajustement des relances et des modèles', en: 'Fine-tuning of reminders and templates' },
    ],
  },
];

export const PAYMENT_METHODS = { fr: ['Orange Money', 'MTN MoMo', 'Virement'], en: ['Orange Money', 'MTN MoMo', 'Bank transfer'] };

/** Méthode (ancienne section fusionnée avec les offres). */
export const METHOD = [
  {
    k: { fr: '45 minutes · gratuit', en: '45 minutes · free' },
    h: { fr: 'Diagnostic', en: 'Diagnostic' },
    p: {
      fr: 'Nous regardons vos délais de paiement clients et un contrat type. Vous repartez avec une estimation de ce que les retards vous coûtent par mois.',
      en: 'We look at your clients’ payment times and one standard contract. You leave with an estimate of what late payment costs you each month.',
    },
  },
  {
    k: { fr: 'Étape 1', en: 'Step 1' },
    h: { fr: 'Audit', en: 'Audit' },
    p: { fr: 'État de vos créances, failles de vos contrats, plan d’action écrit.', en: 'State of your receivables, gaps in your contracts, written action plan.' },
  },
  {
    k: { fr: 'Étapes 2 + 3', en: 'Steps 2 + 3' },
    h: { fr: 'Système et suivi', en: 'System and follow-up' },
    p: {
      fr: 'Contrats types, tableau de suivi, scripts de relance, formation de votre équipe. Puis un suivi chaque mois.',
      en: 'Template contracts, tracker, reminder scripts, team training. Then a check-in every month.',
    },
  },
];

/** Déroulé du diagnostic. */
export const TIMELINE = [
  { min: 10, label: '0–10 min', fr: 'Votre activité, vos clients, votre façon de facturer.', en: 'Your business, your clients, how you invoice.' },
  { min: 15, label: '10–25 min', fr: 'Vos délais réels, facture par facture.', en: 'Your actual payment times, invoice by invoice.' },
  { min: 10, label: '25–35 min', fr: 'La lecture de votre contrat type.', en: 'A read-through of your standard contract.' },
  { min: 10, label: '35–45 min', fr: 'L’estimation de ce que les retards vous coûtent, et la suite possible.', en: 'The estimate of what late payment costs you, and possible next steps.' },
];

export const PREP = [
  { fr: 'La liste de vos factures en attente, même sur papier.', en: 'The list of your outstanding invoices, even on paper.' },
  { fr: 'Un contrat, un devis ou un bon de commande que vous utilisez vraiment.', en: 'A contract, quote or purchase order you actually use.' },
  { fr: 'Les noms de vos cinq plus gros clients.', en: 'The names of your five largest clients.' },
];
