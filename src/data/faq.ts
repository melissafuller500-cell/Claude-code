/**
 * FAQ réparties sans doublon : 6 questions sur l'accueil, les autres sur /diagnostic/ et /offres/.
 * Le JSON-LD FAQPage est généré à partir de ces mêmes textes (strictement identiques à l'affichage).
 */
export type QA = { q: { fr: string; en: string }; a: { fr: string; en: string } };

const free: QA = {
  q: { fr: 'Le diagnostic de 45 minutes est-il gratuit ?', en: 'Is the 45-minute diagnostic free?' },
  a: {
    fr: 'Oui. Le diagnostic de 45 minutes est gratuit. Vous repartez avec une estimation de ce que les retards de paiement vous coûtent, que vous travailliez ensuite avec moi ou non.',
    en: 'Yes. The 45-minute diagnostic is free. You leave with an estimate of what late payment costs you, whether or not we work together afterwards.',
  },
};

export const FAQ_HOME: QA[] = [
  free,
  {
    q: { fr: 'Mes clients sont de grandes entreprises. Je ne veux pas les froisser.', en: 'My clients are large companies. I don’t want to upset them.' },
    a: {
      fr: 'Une relance prévue au contrat et envoyée à date fixe n’a rien d’agressif. Elle montre que votre entreprise est organisée. Les scripts sont écrits pour garder la relation.',
      en: 'A reminder set out in the contract and sent on a fixed date is not aggressive. It shows your company is organised. The scripts are written to protect the relationship.',
    },
  },
  {
    q: { fr: 'Mon client est l’État ou une grande entreprise publique. Qu’est-ce que ça change ?', en: 'My client is the State or a public company. What changes?' },
    a: {
      fr: 'Leurs circuits de paiement sont longs et vous ne les contrôlez pas. Ce que vous contrôlez : un dossier complet dès le premier dépôt, une preuve de livraison signée, et un suivi qui sait à quelle étape se trouve chaque facture. Un dossier incomplet rallonge un délai déjà long.',
      en: 'Their payment chains are long and you don’t control them. What you do control: a complete file from the first submission, signed proof of delivery, and tracking that knows which stage each invoice is at. An incomplete file lengthens a delay that is already long.',
    },
  },
  {
    q: { fr: 'Quel résultat puis-je attendre ?', en: 'What result can I expect?' },
    a: {
      fr: 'Je ne promets pas de chiffre. Nous mesurons votre délai moyen de paiement au départ, puis chaque mois. C’est ce chiffre qui dit si le travail porte.',
      en: 'I don’t promise a number. We measure your average payment time at the start, then every month. That number tells us whether the work is paying off.',
    },
  },
  {
    q: { fr: 'Au bout de combien de temps voit-on un effet ?', en: 'How soon will I see an effect?' },
    a: {
      fr: 'Le suivi hebdomadaire et les relances à date fixe agissent sur les factures déjà en cours, dès le premier mois. Les nouvelles conditions contractuelles agissent sur les nouvelles commandes, donc leur effet s’installe sur les mois suivants. La mesure mensuelle vous montre les deux.',
      en: 'Weekly tracking and fixed-date reminders act on invoices already outstanding, from the first month. New contract terms act on new orders, so their effect builds up over the following months. The monthly measurement shows you both.',
    },
  },
  {
    q: { fr: 'Je ne suis pas à Douala ni à Yaoundé. Peut-on travailler ensemble ?', en: 'I’m not in Douala or Yaoundé. Can we still work together?' },
    a: {
      fr: 'Oui. Le diagnostic, les documents et le suivi mensuel passent par WhatsApp et l’e-mail, où que soit votre entreprise.',
      en: 'Yes. The diagnostic, the documents and the monthly follow-up work over WhatsApp and email, wherever your company is based.',
    },
  },
];

export const FAQ_DIAGNOSTIC: QA[] = [
  {
    q: { fr: 'Que se passe-t-il pendant le diagnostic ?', en: 'What happens during the diagnostic?' },
    a: {
      fr: 'Nous regardons vos délais de paiement clients et un contrat type. Vous repartez avec une estimation de ce que les retards vous coûtent par mois.',
      en: 'We look at your clients’ payment times and one standard contract. You leave with an estimate of what late payment costs you each month.',
    },
  },
  {
    q: { fr: 'Je travaille avec des bons de commande et des accords sur WhatsApp, sans contrat.', en: 'I work with purchase orders and WhatsApp agreements, no contract.' },
    a: {
      fr: 'C’est un point de départ. Un bon de commande signé et des conditions de paiement écrites sur le devis et sur la facture couvrent déjà l’essentiel. On part de vos documents actuels.',
      en: 'That’s a starting point. A signed purchase order and payment terms written on the quote and the invoice already cover the essentials. We start from your current documents.',
    },
  },
  {
    q: { fr: 'Dois-je acheter un logiciel ?', en: 'Do I need to buy software?' },
    a: {
      fr: 'Non. Le suivi tient dans Excel, et les relances partent de WhatsApp et de l’e-mail, des outils que votre équipe utilise déjà.',
      en: 'No. Tracking fits in Excel, and reminders go out through WhatsApp and email, tools your team already uses.',
    },
  },
  {
    q: { fr: 'Pourquoi utiliser l’IA ?', en: 'Why use AI?' },
    a: {
      fr: 'Pour préparer plus vite les relances, les contrats types et les rapports. Chaque document est relu avant de vous être remis.',
      en: 'To prepare reminders, template contracts and reports faster. Every document is reviewed before it reaches you.',
    },
  },
];

export const FAQ_OFFRES: QA[] = [
  {
    q: { fr: 'Et si un client refuse de signer de nouvelles conditions ?', en: 'What if a client refuses to sign new terms?' },
    a: {
      fr: 'On ne renégocie pas tout d’un coup. Les nouvelles conditions s’appliquent aux nouvelles commandes, en commençant par les clients qui paient le plus tard.',
      en: 'We don’t renegotiate everything at once. New terms apply to new orders, starting with the clients who pay latest.',
    },
  },
  {
    q: { fr: 'Faites-vous du recouvrement judiciaire ?', en: 'Do you handle court recovery?' },
    a: {
      fr: 'Non. Je mets en place les contrats, le suivi et les relances pour que vous arriviez rarement à ce stade. Si une procédure devient nécessaire, elle relève d’un avocat ou d’un huissier.',
      en: 'No. I set up the contracts, tracking and reminders so that you rarely get there. If a procedure becomes necessary, it’s a matter for a lawyer or a bailiff.',
    },
  },
  {
    q: { fr: 'Comment payer ?', en: 'How do I pay?' },
    a: { fr: 'Par Orange Money, MTN MoMo ou virement.', en: 'By Orange Money, MTN MoMo or bank transfer.' },
  },
];
