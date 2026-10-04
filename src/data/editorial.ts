/** Repère chiffré (section 6.6). Source retrouvée : article Financial Afrik du 26 février 2026. */
export const BENCHMARK = {
  show: true,
  value: 200,
  fr: {
    title: 'En 2025, l’État camerounais a mis plus de 200 jours à payer ses prestataires.',
    text: 'Contre 120 jours en 2023 et 160 jours en 2024. Quand le plus gros client du pays paie aussi tard, toute la chaîne attend : vos clients vous paient tard parce qu’on les paie tard. Vous ne changerez pas leur trésorerie. Vous pouvez changer votre place dans leur file de paiement.',
    bars: [
      { label: '2023 · 120 j', value: 120 },
      { label: '2024 · 160 j', value: 160 },
      { label: '2025 · 200+ j', value: 200 },
    ],
    source: 'Source : direction de la Trésorerie du ministère des Finances (Minfi), réunion de coordination du 6 février 2026, citée par Financial Afrik le 26 février 2026.',
    linkLabel: 'Lire l’article de Financial Afrik',
  },
  en: {
    title: 'In 2025, the Cameroonian State took more than 200 days to pay its suppliers.',
    text: 'Up from 120 days in 2023 and 160 days in 2024. When the largest client in the country pays this late, every company in the chain waits too: your clients pay you late because they are being paid late themselves. You can’t change their cash flow. You can change your place in their payment queue.',
    bars: [
      { label: '2023 · 120 d', value: 120 },
      { label: '2024 · 160 d', value: 160 },
      { label: '2025 · 200+ d', value: 200 },
    ],
    source: 'Source: Treasury Directorate, Ministry of Finance (Minfi), coordination meeting of 6 February 2026, reported by Financial Afrik on 26 February 2026 (in French).',
    linkLabel: 'Read the Financial Afrik article',
  },
  url: 'https://www.financialafrik.com/2026/02/26/cameroun-les-retards-de-paiement-depassent-200-jours-en-2025/',
};

/**
 * Preuves (section 6.7) : témoignages ou cas chiffrés RÉELS fournis par Noé.
 * Tant que la liste est vide, la section n'est pas affichée. Ne rien inventer.
 */
export type Proof = { quote: { fr: string; en: string }; author: string; company?: string; result?: { fr: string; en: string } };
export const PROOFS: Proof[] = [];

/** D8 : identité légale. Tant qu'un champ vaut TODO, la page est en noindex et hors sitemap. */
export const TODO = 'À COMPLÉTER';
export const LEGAL = {
  form: 'SARLU · AI Systems for Business Growth SARLU (nom commercial : Noé Tech Growth)',
  rccm: TODO,
  niu: TODO,
  address: TODO,
  director: 'Noé Mbwang',
  host: {
    name: 'Cloudflare, Inc.',
    address: '101 Townsend St, San Francisco, CA 94107, États-Unis',
    url: 'https://www.cloudflare.com/',
  },
};
export const legalComplete = () => [LEGAL.form, LEGAL.rccm, LEGAL.niu, LEGAL.address].every((v) => v !== TODO);

/** Catégories du blog, avec un texte d'introduction unique par page de catégorie. */
export const CATEGORIES = {
  contrats: {
    fr: { slug: 'contrats', name: 'Contrats', intro: 'Les clauses qui décident de la date à laquelle vous êtes payé : délai, pénalité, acompte, preuve de livraison, réserve de propriété. Des formulations concrètes, à adapter et à faire relire.' },
    en: { slug: 'contracts', name: 'Contracts', intro: 'The clauses that decide when you get paid: terms, penalty, deposit, proof of delivery, retention of title. Concrete wording, to adapt and have reviewed.' },
  },
  suivi: {
    fr: { slug: 'suivi', name: 'Suivi des impayés', intro: 'Savoir, chaque semaine, qui vous doit combien et depuis quand. Balance âgée, délai moyen de paiement, tableau Excel : les gestes simples qui évitent qu’une facture vieillisse.' },
    en: { slug: 'tracking', name: 'Tracking', intro: 'Knowing every week who owes you how much, and since when. Aging report, average payment time, an Excel tracker: the simple habits that stop invoices from ageing.' },
  },
  relances: {
    fr: { slug: 'relances', name: 'Relances', intro: 'Relancer à date fixe, sans froisser le client : calendrier, messages WhatsApp et e-mail, appel au bon interlocuteur, mise en demeure. Des modèles prêts à copier.' },
    en: { slug: 'reminders', name: 'Reminders', intro: 'Following up on fixed dates without upsetting the client: schedule, WhatsApp and email messages, calling the right person, formal notice. Copy-ready templates.' },
  },
  'clients-publics': {
    fr: { slug: 'clients-publics', name: 'Clients publics', intro: 'Être payé par l’État, une collectivité ou une entreprise publique au Cameroun : le circuit de la dépense, le dossier complet, le suivi étape par étape.' },
    en: { slug: 'public-clients', name: 'Public clients', intro: 'Getting paid by the State, a local authority or a public company in Cameroon: the spending circuit, the complete file, stage-by-stage tracking.' },
  },
  ohada: {
    fr: { slug: 'ohada', name: 'OHADA', intro: 'Ce que le droit OHADA prévoit pour recouvrer une créance, expliqué simplement et sourcé article par article. Information générale, pas un conseil juridique.' },
    en: { slug: 'ohada', name: 'OHADA', intro: 'What OHADA law provides to recover a claim, explained simply and sourced article by article. General information, not legal advice.' },
  },
  tresorerie: {
    fr: { slug: 'tresorerie', name: 'Trésorerie', intro: 'Ce que les retards de paiement coûtent vraiment à une PME : découvert, fournisseurs, commandes refusées. Des calculs en FCFA pour décider.' },
    en: { slug: 'cash-flow', name: 'Cash flow', intro: 'What late payments really cost an SME: overdraft, suppliers, orders turned down. Calculations in FCFA to help you decide.' },
  },
} as const;
export type CategoryKey = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

/** Options du formulaire de diagnostic (section 13). */
export const FORM_OPTIONS = {
  sectors: [
    { fr: 'BTP / second œuvre', en: 'Construction / finishing works' },
    { fr: 'Services aux entreprises', en: 'B2B services' },
    { fr: 'Négoce / fournisseur', en: 'Trading / supplier' },
    { fr: 'Transport / logistique', en: 'Transport / logistics' },
    { fr: 'Agence / cabinet / bureau d’études', en: 'Agency / firm / engineering' },
    { fr: 'Autre', en: 'Other' },
  ],
  late: [
    { v: 'oui', fr: 'Oui', en: 'Yes' },
    { v: 'non', fr: 'Non', en: 'No' },
    { v: 'parfois', fr: 'Parfois', en: 'Sometimes' },
  ],
  size: [
    { v: 'moins-10', fr: 'Moins de 10', en: 'Under 10' },
    { v: '10-50', fr: '10 à 50', en: '10 to 50' },
    { v: '50-100', fr: '50 à 100', en: '50 to 100' },
    { v: 'plus-100', fr: 'Plus de 100', en: 'Over 100' },
  ],
};
