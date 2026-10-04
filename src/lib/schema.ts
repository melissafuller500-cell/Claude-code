import { SITE } from '../data/site';
import type { Lang } from '../i18n/routes';
import type { QA } from '../data/faq';

/** Données structurées. Règle : rien qui ne soit visible sur la page. */
const abs = (path: string) => new URL(path, SITE.url).href;

export const ORG_ID = `${SITE.url}/#organization`;
export const SITE_ID = `${SITE.url}/#website`;
export const PERSON_ID = `${SITE.url}/#noe-mbwang`;
export const LOGO = abs('/images/logo-512.png');

export function organization(lang: Lang) {
  return {
    '@type': 'ProfessionalService',
    '@id': ORG_ID,
    name: SITE.name,
    legalName: 'AI Systems for Business Growth SARLU',
    foundingDate: '2025-02',
    url: SITE.url + '/',
    logo: { '@type': 'ImageObject', url: LOGO, width: 512, height: 512 },
    image: LOGO,
    description: SITE.tagline[lang],
    areaServed: { '@type': 'Country', name: SITE.areaServed[lang] },
    address: { '@type': 'PostalAddress', addressCountry: SITE.country },
    email: SITE.email,
    telephone: '+' + SITE.whatsapp.number,
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: lang === 'en' ? 'customer service' : 'service client',
      email: SITE.email,
      telephone: '+' + SITE.whatsapp.number,
      availableLanguage: ['French', 'English'],
      areaServed: SITE.country,
    }],
    knowsAbout: lang === 'en'
      ? ['Late payment', 'Accounts receivable', 'Debt collection', 'Payment terms', 'Aging report', 'OHADA payment order', 'SME cash flow']
      : ['Retards de paiement', 'Créances clients', 'Recouvrement amiable', 'Conditions de paiement', 'Balance âgée', 'Injonction de payer OHADA', 'Trésorerie des PME'],
    slogan: lang === 'en' ? 'Get paid faster.' : 'Encaissez plus vite.',
    founder: { '@id': PERSON_ID },
    knowsLanguage: ['fr', 'en'],
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };
}

export function website(lang: Lang) {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE.url + '/',
    name: SITE.name,
    description: SITE.tagline[lang],
    inLanguage: ['fr', 'en'],
    publisher: { '@id': ORG_ID },
  };
}

export function person(lang: Lang) {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.founder.name,
    image: abs('/images/noe-mbwang.jpg'),
    jobTitle: SITE.founder.jobTitle[lang],
    url: abs(lang === 'en' ? '/en/about/' : '/a-propos/'),
    worksFor: { '@id': ORG_ID },
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'degree', name: SITE.founder.education[lang] },
      ...SITE.founder.certifications.map((name) => ({ '@type': 'EducationalOccupationalCredential', credentialCategory: 'certificate', name })),
    ],
    knowsAbout: lang === 'en'
      ? ['Late payment', 'Accounts receivable', 'Payment reminders', 'Payment terms', 'OHADA']
      : ['Retards de paiement', 'Créances clients', 'Relances', 'Conditions de paiement', 'OHADA'],
    ...(SITE.founder.sameAs.length ? { sameAs: SITE.founder.sameAs } : {}),
  };
}

export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.url) })),
  };
}

export function faqPage(items: QA[], lang: Lang) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q[lang],
      acceptedAnswer: { '@type': 'Answer', text: it.a[lang] },
    })),
  };
}

type ArticleInput = {
  type: 'BlogPosting' | 'Article';
  keywords?: string[];
  section?: string;
  wordCount?: number;
  title: string;
  description: string;
  url: string;
  image: string;
  lang: Lang;
  published: Date;
  modified?: Date;
};
export function article(a: ArticleInput) {
  return {
    '@type': a.type,
    headline: a.title,
    description: a.description,
    url: abs(a.url),
    mainEntityOfPage: abs(a.url),
    image: abs(a.image),
    inLanguage: a.lang,
    datePublished: a.published.toISOString().slice(0, 10),
    dateModified: (a.modified ?? a.published).toISOString().slice(0, 10),
    author: { '@id': PERSON_ID, '@type': 'Person', name: SITE.founder.name, url: abs(a.lang === 'en' ? '/en/about/' : '/a-propos/') },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': SITE_ID },
    ...(a.keywords?.length ? { keywords: a.keywords.join(', ') } : {}),
    ...(a.section ? { articleSection: a.section } : {}),
    ...(a.wordCount ? { wordCount: a.wordCount } : {}),
  };
}

export function definedTerm(t: { name: string; description: string; url: string; setUrl: string; setName: string; lang: Lang }) {
  return {
    '@type': 'DefinedTerm',
    name: t.name,
    description: t.description,
    url: abs(t.url),
    inLanguage: t.lang,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: t.setName, url: abs(t.setUrl) },
  };
}

export function definedTermSet(s: { name: string; url: string; lang: Lang; terms: { name: string; description: string; url: string }[] }) {
  return {
    '@type': 'DefinedTermSet',
    name: s.name,
    url: abs(s.url),
    inLanguage: s.lang,
    hasDefinedTerm: s.terms.map((t) => ({ '@type': 'DefinedTerm', name: t.name, description: t.description, url: abs(t.url) })),
  };
}

export { abs };
