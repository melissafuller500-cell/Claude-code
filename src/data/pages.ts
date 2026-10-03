import type { Lang, RouteKey } from '../i18n/routes';

/**
 * Titres et descriptions des pages fixes. Source unique pour le <head>, les images Open Graph
 * et les fils d'Ariane. Titre : 60 caractères max. Description : 150 à 160 caractères.
 */
export type PageMeta = { title: string; description: string; crumb: string; og?: string };

export const PAGES: Record<RouteKey, Record<Lang, PageMeta>> = {
  home: {
    fr: {
      title: 'Noé Tech Growth · Encaissez plus vite',
      crumb: 'Accueil',
      og: 'Encaissez plus vite.',
      description: 'PME B2B au Cameroun : contrats solides, suivi des impayés, relances à date fixe pour encaisser plus vite. Diagnostic gratuit de 45 minutes, prix affichés.',
    },
    en: {
      title: 'Noé Tech Growth · Get paid faster',
      crumb: 'Home',
      og: 'Get paid faster.',
      description: 'B2B SMEs in Cameroon: solid contracts, tracking of unpaid invoices and reminders on fixed dates to get paid faster. Free 45-minute diagnostic, clear prices.',
    },
  },
  diagnostic: {
    fr: {
      title: 'Diagnostic trésorerie PME gratuit, 45 minutes',
      crumb: 'Diagnostic',
      description: 'Diagnostic gratuit de 45 minutes : vos délais de paiement réels, un contrat type, et une estimation chiffrée de ce que les retards coûtent à votre PME.',
    },
    en: {
      title: 'Free 45-minute SME cash-flow diagnostic',
      crumb: 'Diagnostic',
      description: 'A free 45-minute diagnostic: your actual payment times, one standard contract, and a figure for what late payments cost your SME each month in Cameroon.',
    },
  },
  merci: {
    fr: { title: 'Demande reçue', crumb: 'Demande reçue', description: 'Votre demande de diagnostic gratuit de 45 minutes est bien reçue. Noé Mbwang vous répond dans la journée, par WhatsApp, par téléphone ou par e-mail.' },
    en: { title: 'Request received', crumb: 'Request received', description: 'Your request for the free 45-minute diagnostic has been received. Noé Mbwang will reply within the day, by WhatsApp, phone or email, wherever you are.' },
  },
  offres: {
    fr: {
      title: 'Offres et prix : audit des créances, système, suivi',
      crumb: 'Offres',
      description: 'Trois étapes, prix affichés en FCFA : audit trésorerie et contrats 50 000, système encaissement dès 150 000, suivi mensuel 35 000. Diagnostic gratuit.',
    },
    en: {
      title: 'Pricing: receivables audit, system, follow-up',
      crumb: 'Pricing',
      description: 'Three steps, prices shown in FCFA: cash and contracts audit 50,000, collection system from 150,000, monthly follow-up 35,000. The diagnostic is free.',
    },
  },
  outils: {
    fr: {
      title: 'Outils gratuits pour encaisser plus vite',
      crumb: 'Outils',
      description: 'Quatre outils gratuits pour PME B2B : calculateur du coût des retards de paiement, test de contrat, modèle de conditions de paiement, calendrier de relances.',
    },
    en: {
      title: 'Free tools to get paid faster',
      crumb: 'Tools',
      description: 'Four free tools for B2B SMEs: late-payment cost calculator, contract test, payment-terms template and payment reminder schedule. Nothing is saved or sent.',
    },
  },
  calculateur: {
    fr: {
      title: 'Calculateur du coût d’un retard de paiement',
      crumb: 'Calculateur',
      description: 'Combien d’argent dort chez vos clients ? Calculez en FCFA la trésorerie immobilisée et le coût annuel des retards de paiement. Gratuit, rien n’est enregistré.',
    },
    en: {
      title: 'Late payment cost calculator',
      crumb: 'Calculator',
      description: 'How much of your money is sleeping at your clients’? Work out the cash tied up and the yearly cost of late payment, in FCFA. Free, and nothing is saved.',
    },
  },
  test: {
    fr: {
      title: 'Test : votre contrat vous protège-t-il ?',
      crumb: 'Test contrat',
      description: 'Six questions, une minute : vérifiez si vos contrats vous protègent des retards de paiement. Délai, pénalité, acompte, litiges, relances. Résultat immédiat.',
    },
    en: {
      title: 'Test: does your contract protect you?',
      crumb: 'Contract test',
      description: 'Six questions, one minute: check whether your contracts protect you from late payment. Terms, penalty, deposit, disputes and reminders. Instant result.',
    },
  },
  clauses: {
    fr: {
      title: 'Modèle de clause de conditions de paiement',
      crumb: 'Modèle de clauses',
      description: 'Composez un article « Conditions de paiement » : délai, pénalité de retard, acompte, preuve de livraison, réserve de propriété, litiges. Modèle à copier.',
    },
    en: {
      title: 'Payment terms clause template',
      crumb: 'Clause template',
      description: 'Build a “Payment terms” article: due date, late-payment penalty, deposit, proof of delivery, retention of title, disputes. A copy-ready template to adapt.',
    },
  },
  relances: {
    fr: {
      title: 'Modèles de relance de facture impayée',
      crumb: 'Calendrier de relances',
      description: 'Calendrier de relance de J-5 à J+30 et cinq modèles prêts à copier : rappel WhatsApp, e-mail, appel au comptable, mise en demeure de payer une facture.',
    },
    en: {
      title: 'Unpaid invoice reminder templates',
      crumb: 'Reminder schedule',
      description: 'A reminder schedule from D-5 to D+30 with five copy-ready templates: WhatsApp reminder, email, call to the accountant and a formal notice to pay an invoice.',
    },
  },
  ressources: {
    fr: {
      title: 'Ressources : guides, secteurs, glossaire',
      crumb: 'Ressources',
      description: 'Guides sur l’injonction de payer OHADA, le paiement par l’État et la balance âgée, pièges d’encaissement par secteur et glossaire de la trésorerie des PME.',
    },
    en: {
      title: 'Resources: guides, sectors, glossary',
      crumb: 'Resources',
      description: 'Guides on the OHADA payment order, getting paid by the State and the aging report, payment traps by sector, and a glossary of SME cash-flow terms in Cameroon.',
    },
  },
  guides: {
    fr: {
      title: 'Guides : recouvrement, État, balance âgée',
      crumb: 'Guides',
      description: 'Trois guides de fond pour les PME B2B au Cameroun : l’injonction de payer OHADA, le circuit de paiement de l’État et la balance âgée des créances clients.',
    },
    en: {
      title: 'Guides: recovery, the State, aging report',
      crumb: 'Guides',
      description: 'Three in-depth guides for B2B SMEs in Cameroon: the OHADA payment order, the State payment circuit, and the aging report of your customer receivables.',
    },
  },
  secteurs: {
    fr: {
      title: 'Impayés par secteur : BTP, services, négoce…',
      crumb: 'Secteurs',
      description: 'Chaque métier a ses pièges d’encaissement. BTP, services, négoce, transport, agences : où l’argent se bloque et les clauses qui comptent, avec un exemple en FCFA.',
    },
    en: {
      title: 'Late payment by sector: construction and more',
      crumb: 'Sectors',
      description: 'Every trade has its own payment traps. Construction, services, trading, transport, agencies: where the money gets stuck and the clauses that matter, in FCFA.',
    },
  },
  glossaire: {
    fr: {
      title: 'Glossaire de la trésorerie et du recouvrement',
      crumb: 'Glossaire',
      description: 'Les mots qui comptent pour votre trésorerie : délai moyen de paiement, balance âgée, acompte, pénalité de retard, mise en demeure, injonction de payer OHADA.',
    },
    en: {
      title: 'Glossary of cash flow and debt recovery',
      crumb: 'Glossary',
      description: 'The words that matter for your cash: average payment time, aging report, deposit, late-payment penalty, formal notice and the OHADA payment order, explained.',
    },
  },
  blog: {
    fr: {
      title: 'Blog : retards de paiement et recouvrement',
      crumb: 'Blog',
      description: 'Des réponses courtes et sourcées aux questions des dirigeants de PME au Cameroun : contrats, suivi des impayés, relances, clients publics, OHADA, trésorerie.',
    },
    en: {
      title: 'Blog: late payment and debt recovery',
      crumb: 'Blog',
      description: 'Short, sourced answers to the questions SME owners in Cameroon ask: contracts, tracking unpaid invoices, reminders, public clients, OHADA and cash flow.',
    },
  },
  apropos: {
    fr: {
      title: 'Noé Mbwang, fondateur de Noé Tech Growth',
      crumb: 'À propos',
      description: 'Noé Mbwang, juriste de formation, aide les PME B2B du Cameroun à encaisser plus vite. Son parcours, sa méthode, ses certifications et sa façon de travailler.',
    },
    en: {
      title: 'Noé Mbwang, founder of Noé Tech Growth',
      crumb: 'About',
      description: 'Noé Mbwang, trained in law, helps B2B SMEs in Cameroon get paid faster. His background, his method, his certifications and the way he works with clients.',
    },
  },
  mentions: {
    fr: { title: 'Mentions légales', crumb: 'Mentions légales', description: 'Mentions légales du site noetechgrowth.com : éditeur, directeur de la publication, hébergeur, propriété intellectuelle et contact de Noé Tech Growth.' },
    en: { title: 'Legal notice', crumb: 'Legal notice', description: 'Legal notice for noetechgrowth.com: publisher, publication director, hosting provider, intellectual property and how to contact Noé Tech Growth.' },
  },
  confidentialite: {
    fr: { title: 'Politique de confidentialité', crumb: 'Confidentialité', description: 'Données collectées par le formulaire de diagnostic, finalité, durée de conservation, mesure d’audience sans cookies et vos droits. Ce que fait Noé Tech Growth.' },
    en: { title: 'Privacy policy', crumb: 'Privacy', description: 'Data collected by the diagnostic form, purpose, retention period, cookie-free audience measurement and your rights. What Noé Tech Growth does with your data.' },
  },
};
