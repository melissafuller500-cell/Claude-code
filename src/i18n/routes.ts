/**
 * Table des routes fixes. Chaque clé relie la page française et sa traduction anglaise
 * (slugs traduits). Les pages de contenu (blog, guides, secteurs, glossaire) sont reliées
 * par leur champ `translationKey`.
 */
export type Lang = 'fr' | 'en';
export const LANGS: Lang[] = ['fr', 'en'];

export const ROUTES = {
  home: { fr: '/', en: '/en/' },
  diagnostic: { fr: '/diagnostic/', en: '/en/diagnostic/' },
  merci: { fr: '/diagnostic/merci/', en: '/en/diagnostic/thank-you/' },
  offres: { fr: '/offres/', en: '/en/pricing/' },
  outils: { fr: '/outils/', en: '/en/tools/' },
  calculateur: { fr: '/outils/calculateur-retard-paiement/', en: '/en/tools/late-payment-calculator/' },
  test: { fr: '/outils/test-contrat/', en: '/en/tools/contract-test/' },
  clauses: { fr: '/outils/modele-conditions-paiement/', en: '/en/tools/payment-terms-template/' },
  relances: { fr: '/outils/calendrier-relances/', en: '/en/tools/payment-reminder-schedule/' },
  ressources: { fr: '/ressources/', en: '/en/resources/' },
  guides: { fr: '/guides/', en: '/en/guides/' },
  secteurs: { fr: '/secteurs/', en: '/en/sectors/' },
  glossaire: { fr: '/glossaire/', en: '/en/glossary/' },
  blog: { fr: '/blog/', en: '/en/blog/' },
  apropos: { fr: '/a-propos/', en: '/en/about/' },
  mentions: { fr: '/mentions-legales/', en: '/en/legal-notice/' },
  confidentialite: { fr: '/confidentialite/', en: '/en/privacy/' },
} as const satisfies Record<string, Record<Lang, string>>;

export type RouteKey = keyof typeof ROUTES;

export const r = (key: RouteKey, lang: Lang) => ROUTES[key][lang];

/** Base des collections, par langue. */
export const COLLECTION_BASE = {
  blog: { fr: '/blog/', en: '/en/blog/' },
  guides: { fr: '/guides/', en: '/en/guides/' },
  secteurs: { fr: '/secteurs/', en: '/en/sectors/' },
  glossaire: { fr: '/glossaire/', en: '/en/glossary/' },
} as const;

export type CollectionName = keyof typeof COLLECTION_BASE;

export const BLOG_CATEGORY_BASE = { fr: '/blog/categorie/', en: '/en/blog/category/' } as const;

/** Une entrée a pour id « fr/mon-slug » : on garde la dernière partie. */
export const slugOf = (id: string) => id.split('/').pop()!;
export const langOf = (id: string): Lang => (id.startsWith('en/') ? 'en' : 'fr');

export const entryUrl = (collection: CollectionName, id: string) =>
  `${COLLECTION_BASE[collection][langOf(id)]}${slugOf(id)}/`;
