/**
 * Identité de l'entité : une seule source pour le site, les données structurées et llms.txt.
 * Toute valeur « À COMPLÉTER » est listée dans RAPPORT.md.
 */
export const SITE = {
  url: 'https://noetechgrowth.com',
  name: 'Noé Tech Growth',
  /** Description en une phrase, identique partout (site, JSON-LD, profils externes). */
  tagline: {
    fr: 'J’aide les PME B2B à encaisser plus vite : contrats solides, suivi des impayés, relances systématiques.',
    en: 'I help B2B SMEs get paid faster: solid contracts, tracking of unpaid invoices, systematic reminders.',
  },
  founder: {
    name: 'Noé Mbwang',
    jobTitle: { fr: 'Fondateur de Noé Tech Growth', en: 'Founder of Noé Tech Growth' },
    education: {
      fr: 'Master en Droit Public International et Science Politique',
      en: 'Master’s in Public International Law and Political Science',
    },
    certifications: [
      'IBM Data Analytics Professional Certificate',
      'IBM Data Literacy',
      'Anthropic AI Fluency for Small Businesses',
    ],
    /** Profils publics (LinkedIn, etc.). À COMPLÉTER : ajouter les URL réelles, rien n'est inventé. */
    sameAs: [] as string[],
  },
  /** Profils publics de l'organisation. À COMPLÉTER. */
  sameAs: [] as string[],
  whatsapp: {
    number: '237653400504',
    display: '+237 653 40 05 04',
  },
  /** D4 : adresse professionnelle à créer chez l'hébergeur de messagerie. */
  email: 'contact@noetechgrowth.com',
  areaServed: { fr: 'Cameroun', en: 'Cameroon' },
  country: 'CM',
  /** D1 : diagnostic gratuit. Passer à false changerait les libellés partout. */
  diagnosticFree: true,
  /** D2 */
  blogRhythm: {
    fr: '1 question-réponse courte par jour ouvré, 1 article de fond par semaine',
    en: '1 short Q&A per working day, 1 in-depth article per week',
  },
} as const;

export const waLink = (message?: string) =>
  `https://wa.me/${SITE.whatsapp.number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

export const mailLink = (subject?: string) =>
  `mailto:${SITE.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
