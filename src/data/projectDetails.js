'use strict';
// Sector templates for the detailed project page. They describe how each type of project works
// on the platform; project-specific facts (location context, figures) come from the project itself.
const L = (en, fr) => ({ en, fr });

const SECTORS = {
  re: {
    revenue: L('Tenants pay rent under written leases. After maintenance, insurance, property management and the platform fee, the net rent is distributed to investors on the schedule each investor chooses. When the property is sold or refinanced at the end of the term, the net gain is shared in proportion to each investment.',
      'Les locataires paient un loyer sous bail écrit. Après entretien, assurance, gestion et frais de plateforme, le loyer net est distribué aux investisseurs selon le calendrier choisi par chacun. À la revente ou au refinancement en fin de durée, la plus-value nette est partagée au prorata.'),
    funds: [[L('Acquisition or construction', 'Acquisition ou construction'), 70], [L('Fit-out and furnishing', 'Aménagement et ameublement'), 15], [L('Legal, title and taxes', 'Frais juridiques, titre et taxes'), 7], [L('Cash reserve (vacancy, repairs)', 'Réserve de trésorerie (vacance, réparations)'), 8]],
    risks: [[L('Vacancy: units stay empty longer than planned.', 'Vacance : des logements restent vides plus longtemps que prévu.'), L('Cash reserve and professional letting agent.', 'Réserve de trésorerie et agent de location professionnel.')],
      [L('Construction or renovation delays.', 'Retards de construction ou de rénovation.'), L('Funds released in stages against site reports.', 'Fonds libérés par étapes sur rapports de chantier.')],
      [L('Title or ownership dispute.', 'Litige sur le titre ou la propriété.'), L('Land title checked before listing.', 'Titre foncier vérifié avant la mise en ligne.')],
      [L('Lower resale price at the end of the term.', 'Prix de revente plus bas en fin de durée.'), L('Option to refinance or extend instead of selling.', 'Possibilité de refinancer ou prolonger au lieu de vendre.')]],
    exit: L('At the end of the term the property is sold or refinanced. Your capital and your share of any gain are credited to your balance.', 'En fin de durée, le bien est revendu ou refinancé. Votre capital et votre part de la plus-value sont crédités sur votre solde.'),
    docs: [L('Land title (titre foncier) or lease', 'Titre foncier ou bail'), L('Independent valuation', 'Évaluation indépendante'), L('Rent roll and lease template', 'État locatif et modèle de bail'), L('Insurance certificate', 'Attestation d’assurance')],
    steps: [L('Funding round closes; SPV acquires or starts works', 'Clôture du financement ; la SPV acquiert ou lance les travaux'), L('Fit-out completed and units let', 'Aménagement terminé et logements loués'), L('Regular rent distributions', 'Distributions régulières des loyers'), L('Sale or refinancing; capital returned', 'Revente ou refinancement ; capital rendu')],
  },
  fo: {
    revenue: L('Rent is collected in hard currency (USD, EUR or AED) by a licensed property manager. Net rent after management, service charges and fees is distributed to investors; the property is sold or refinanced at the end of the term.',
      'Les loyers sont encaissés en devises fortes (USD, EUR ou AED) par un gestionnaire agréé. Le loyer net après gestion, charges et frais est distribué aux investisseurs ; le bien est revendu ou refinancé en fin de durée.'),
    funds: [[L('Property purchase', 'Achat du bien'), 78], [L('Furnishing and licensing', 'Ameublement et licences'), 8], [L('Transfer fees and legal', 'Frais de mutation et juridiques'), 8], [L('Cash reserve', 'Réserve de trésorerie'), 6]],
    risks: [[L('Lower occupancy or rents in the local market.', 'Baisse de l’occupation ou des loyers sur le marché local.'), L('Professional manager and cash reserve.', 'Gestionnaire professionnel et réserve de trésorerie.')],
      [L('Changes in short-term rental rules.', 'Évolution des règles de location courte durée.'), L('Licence held; switch to long-term letting possible.', 'Licence obtenue ; passage en location longue possible.')],
      [L('Currency moves against your home currency.', 'Variation de change défavorable à votre devise.'), L('Income stays in hard currency until you withdraw.', 'Les revenus restent en devise forte jusqu’au retrait.')],
      [L('Lower resale value at exit.', 'Valeur de revente plus faible à la sortie.'), L('Refinancing or term extension as alternatives.', 'Refinancement ou prolongation comme alternatives.')]],
    exit: L('The property is sold or refinanced at the end of the term; capital and any gain are returned in the currency you choose.', 'Le bien est revendu ou refinancé en fin de durée ; capital et plus-value sont rendus dans la devise de votre choix.'),
    docs: [L('Title deed', 'Titre de propriété'), L('Management agreement', 'Contrat de gestion'), L('Rental licence', 'Licence de location'), L('Valuation report', 'Rapport d’évaluation')],
    steps: [L('Funding closes; purchase completed', 'Clôture du financement ; achat finalisé'), L('Furnished and listed for rent', 'Meublé et mis en location'), L('Regular distributions in hard currency', 'Distributions régulières en devise forte'), L('Sale or refinancing', 'Revente ou refinancement')],
  },
  ag: {
    revenue: L('The harvest is pre-sold to a contracted buyer (off-taker) at an agreed price or formula. Sale proceeds repay costs first, then investors receive their share each cycle; income accrues on the schedule each investor chooses.',
      'La récolte est pré-vendue à un acheteur sous contrat à un prix ou une formule convenus. Le produit de la vente couvre d’abord les coûts, puis les investisseurs reçoivent leur part à chaque cycle ; les revenus sont crédités selon le calendrier choisi.'),
    funds: [[L('Inputs (seedlings, feed, fertiliser)', 'Intrants (plants, aliment, engrais)'), 40], [L('Labour and field operations', 'Main-d’œuvre et travaux'), 25], [L('Equipment and irrigation', 'Équipement et irrigation'), 20], [L('Insurance, transport and reserve', 'Assurance, transport et réserve'), 15]],
    risks: [[L('Weather: drought or heavy rain reduces the harvest.', 'Météo : sécheresse ou fortes pluies réduisent la récolte.'), L('Irrigation where possible; crop insurance when available.', 'Irrigation si possible ; assurance récolte quand disponible.')],
      [L('Pests and disease.', 'Ravageurs et maladies.'), L('Agronomist visits and treatment plan.', 'Visites d’agronome et plan de traitement.')],
      [L('Price falls or buyer default.', 'Baisse des prix ou défaillance de l’acheteur.'), L('Signed off-take contract with an established buyer.', 'Contrat d’achat signé avec un acheteur établi.')],
      [L('Delays between planting and sale.', 'Retards entre plantation et vente.'), L('Staged release of funds tied to field reports.', 'Libération des fonds par étapes liée aux rapports de terrain.')]],
    exit: L('Each cycle ends with the sale of the harvest. Your capital is returned at the end of the term, or rolled into the next cycle if you choose.', 'Chaque cycle se termine par la vente de la récolte. Votre capital est rendu en fin de durée, ou réinvesti dans le cycle suivant si vous le souhaitez.'),
    docs: [L('Off-take (purchase) contract', 'Contrat d’achat (off-take)'), L('Land lease or title', 'Bail ou titre foncier'), L('Crop budget and calendar', 'Budget et calendrier de culture'), L('Dated field photos', 'Photos de terrain datées')],
    steps: [L('Funding closes; inputs purchased', 'Clôture du financement ; achat des intrants'), L('Planting / stocking and monthly field reports', 'Plantation / mise en élevage et rapports mensuels'), L('Harvest and sale to the off-taker', 'Récolte et vente à l’acheteur'), L('Distribution and capital return', 'Distribution et remboursement du capital')],
  },
  co: {
    revenue: L('The company repays a fixed-rate loan from its revenue in monthly instalments. Interest, after the platform fee, is distributed to investors on their chosen schedule; capital is repaid over the term.',
      'L’entreprise rembourse un prêt à taux fixe sur son chiffre d’affaires par mensualités. Les intérêts, après frais de plateforme, sont distribués selon le calendrier choisi ; le capital est remboursé sur la durée.'),
    funds: [[L('Stock or equipment purchase', 'Achat de stock ou d’équipement'), 85], [L('Installation, training and delivery', 'Installation, formation et livraison'), 10], [L('Fees and guarantees', 'Frais et garanties'), 5]],
    risks: [[L('The company’s sales fall and it misses repayments.', 'Les ventes baissent et l’entreprise manque des échéances.'), L('Two years of accounts reviewed; monthly repayment tracking.', 'Deux ans de comptes analysés ; suivi mensuel des remboursements.')],
      [L('Key-person or management risk.', 'Risque lié aux dirigeants.'), L('Personal guarantee from the director.', 'Caution personnelle du dirigeant.')],
      [L('Collateral worth less than the loan.', 'Garantie inférieure au montant du prêt.'), L('Security over stock, equipment or receivables.', 'Sûretés sur stock, équipement ou créances.')],
      [L('Currency moves for USD investors.', 'Variation de change pour les investisseurs en USD.'), L('Rate set to absorb typical moves; risk disclosed.', 'Taux fixé pour absorber les variations usuelles ; risque signalé.')]],
    exit: L('The loan is fully repaid by the end of the term. Capital comes back gradually with each instalment and is credited to your balance.', 'Le prêt est entièrement remboursé en fin de durée. Le capital revient progressivement à chaque échéance et est crédité sur votre solde.'),
    docs: [L('RCCM registration', 'Immatriculation RCCM'), L('Last two years of accounts', 'Deux derniers exercices comptables'), L('Loan and security agreement', 'Contrat de prêt et de sûretés'), L('Repayment schedule', 'Échéancier de remboursement')],
    steps: [L('Loan disbursed against invoices', 'Prêt décaissé sur factures'), L('Monthly repayments start', 'Début des remboursements mensuels'), L('Mid-term review of accounts', 'Revue des comptes à mi-parcours'), L('Final repayment', 'Dernier remboursement')],
  },
  te: {
    revenue: L('You buy a stake (or a convertible note) in a start-up that already earns revenue. There are no regular payouts: value is created if the company grows and is sold, raises money at a higher valuation or pays dividends.',
      'Vous achetez une participation (ou une obligation convertible) dans une start-up qui génère déjà du chiffre d’affaires. Pas de versements réguliers : la valeur se crée si l’entreprise grandit et est revendue, lève des fonds à une valorisation supérieure ou verse des dividendes.'),
    funds: [[L('Product and engineering', 'Produit et développement'), 40], [L('Sales and marketing', 'Ventes et marketing'), 35], [L('Operations and compliance', 'Opérations et conformité'), 15], [L('Working capital', 'Fonds de roulement'), 10]],
    risks: [[L('The start-up fails and the stake is worth nothing.', 'La start-up échoue et la participation ne vaut plus rien.'), L('Only revenue-generating companies; small allocation advised.', 'Uniquement des entreprises avec chiffre d’affaires ; petite allocation conseillée.')],
      [L('No liquidity for several years.', 'Aucune liquidité pendant plusieurs années.'), L('Exit expected only at a sale or later round.', 'Sortie attendue seulement lors d’une cession ou d’une levée.')],
      [L('Dilution in later funding rounds.', 'Dilution lors des levées suivantes.'), L('Pro-rata rights where negotiated.', 'Droits de suite lorsqu’ils sont négociés.')],
      [L('Regulatory change in fintech or data.', 'Évolution réglementaire (fintech, données).'), L('Licences and compliance reviewed before listing.', 'Licences et conformité vérifiées avant la mise en ligne.')]],
    exit: L('Returns arrive only at exit: a sale of the company, a later round that buys out early investors, or dividends. This can take several years or never happen.', 'Le rendement n’arrive qu’à la sortie : cession de l’entreprise, levée ultérieure rachetant les premiers investisseurs, ou dividendes. Cela peut prendre plusieurs années ou ne jamais arriver.'),
    docs: [L('Company registration and cap table', 'Immatriculation et table de capitalisation'), L('Financial statements and KPIs', 'États financiers et indicateurs'), L('Investment agreement', 'Pacte d’investissement'), L('Quarterly investor reports', 'Rapports trimestriels aux investisseurs')],
    steps: [L('Round closes; shares or notes issued', 'Clôture du tour ; émission des parts ou obligations'), L('Quarterly KPI reporting', 'Reporting trimestriel des indicateurs'), L('Follow-on round or growth milestones', 'Levée suivante ou jalons de croissance'), L('Exit, revaluation or dividends', 'Sortie, revalorisation ou dividendes')],
  },
  mi: {
    revenue: L('Investors fund equipment or working capital and receive a royalty: a fixed share of revenue on every unit of metal or ore sold, paid from the first sale and before the mine’s shareholders.',
      'Les investisseurs financent équipement ou fonds de roulement et reçoivent une redevance : une part fixe du chiffre d’affaires sur chaque unité de métal ou de minerai vendue, dès la première vente et avant les actionnaires de la mine.'),
    funds: [[L('Mining and processing equipment', 'Équipement d’extraction et de traitement'), 55], [L('Working capital (fuel, labour)', 'Fonds de roulement (carburant, main-d’œuvre)'), 25], [L('Environmental and safety measures', 'Mesures environnementales et sécurité'), 10], [L('Assays, permits and reserve', 'Analyses, permis et réserve'), 10]],
    risks: [[L('Lower output than estimated.', 'Production inférieure aux estimations.'), L('Independent resource estimate and weekly production reports.', 'Estimation indépendante des ressources et rapports de production hebdomadaires.')],
      [L('Metal price falls.', 'Baisse du cours des métaux.'), L('Royalty on revenue, paid from the first sale.', 'Redevance sur le chiffre d’affaires, payée dès la première vente.')],
      [L('Permit, licence or community issues.', 'Problèmes de permis, de licence ou avec les communautés.'), L('Valid licence and environmental permit verified.', 'Permis minier et environnemental vérifiés.')],
      [L('Security and theft risk on site.', 'Risque de sécurité et de vol sur site.'), L('Insured equipment and controlled sales channels.', 'Équipement assuré et circuits de vente contrôlés.')]],
    exit: L('Royalties are paid until the end of the term, and the original capital is returned from sales over the term. If output stops, recovery depends on selling the financed equipment.', 'Les redevances sont versées jusqu’à la fin de la durée, et le capital est rendu à partir des ventes sur la durée. Si la production s’arrête, le recouvrement dépend de la revente de l’équipement financé.'),
    docs: [L('Mining licence', 'Permis minier'), L('Environmental permit', 'Permis environnemental'), L('Independent resource estimate', 'Estimation indépendante des ressources'), L('Royalty agreement', 'Contrat de redevance')],
    steps: [L('Equipment purchased and installed', 'Achat et installation de l’équipement'), L('Production ramp-up', 'Montée en production'), L('Royalties from every sale', 'Redevances sur chaque vente'), L('Capital fully returned', 'Capital entièrement remboursé')],
  },
  en: {
    revenue: L('Customers pay for electricity or fuel daily through mobile money and smart meters. Revenue after operating costs is shared with investors, which suits frequent payouts.',
      'Les clients paient l’électricité ou le carburant chaque jour via mobile money et compteurs intelligents. Les revenus après coûts d’exploitation sont partagés avec les investisseurs, ce qui se prête à des versements fréquents.'),
    funds: [[L('Panels, batteries, tanks or equipment', 'Panneaux, batteries, cuves ou équipement'), 65], [L('Installation and connections', 'Installation et raccordements'), 18], [L('Metering and monitoring', 'Comptage et télésuivi'), 7], [L('Permits, insurance and reserve', 'Permis, assurance et réserve'), 10]],
    risks: [[L('Customers pay less or later than expected.', 'Les clients paient moins ou plus tard que prévu.'), L('Prepaid metering: no payment, no power.', 'Compteurs prépayés : pas de paiement, pas d’énergie.')],
      [L('Equipment failure or theft.', 'Panne ou vol d’équipement.'), L('Insurance, remote monitoring and maintenance contract.', 'Assurance, télésuivi et contrat de maintenance.')],
      [L('Tariff or regulatory change.', 'Changement de tarif ou de réglementation.'), L('Licences in place; tariffs agreed with authorities where required.', 'Licences obtenues ; tarifs validés par les autorités si nécessaire.')],
      [L('Grid arrives and competes.', 'Arrivée du réseau national en concurrence.'), L('Sites chosen far from planned grid extensions.', 'Sites choisis loin des extensions de réseau prévues.')]],
    exit: L('Capital is returned gradually from customer payments over the term. At the end, assets may be sold to the operator or to the national utility.', 'Le capital est rendu progressivement à partir des paiements des clients sur la durée. En fin de durée, les actifs peuvent être cédés à l’opérateur ou à l’opérateur national.'),
    docs: [L('Generation or distribution licence', 'Licence de production ou de distribution'), L('EPC and maintenance contracts', 'Contrats EPC et de maintenance'), L('Customer and payment data', 'Données clients et paiements'), L('Insurance certificate', 'Attestation d’assurance')],
    steps: [L('Equipment ordered and delivered', 'Commande et livraison de l’équipement'), L('Installation and first customers connected', 'Installation et premiers clients raccordés'), L('Revenue sharing begins', 'Début du partage des revenus'), L('Capital returned; assets transferred or sold', 'Capital rendu ; actifs transférés ou cédés')],
  },
  in: {
    revenue: L('The asset earns from long contracts with creditworthy tenants or users (logistics firms, mobile operators, hospitals, travellers). Contracted income after operating costs is distributed to investors.',
      'L’actif perçoit des revenus de contrats longs avec des locataires ou utilisateurs solvables (logisticiens, opérateurs mobiles, hôpitaux, voyageurs). Les revenus contractuels après coûts d’exploitation sont distribués aux investisseurs.'),
    funds: [[L('Construction or acquisition', 'Construction ou acquisition'), 72], [L('Equipment and systems', 'Équipements et systèmes'), 15], [L('Permits, studies and legal', 'Permis, études et juridique'), 6], [L('Cash reserve', 'Réserve de trésorerie'), 7]],
    risks: [[L('Anchor tenant or customer leaves.', 'Départ du locataire ou client principal.'), L('Long contracts signed before funding.', 'Contrats longs signés avant le financement.')],
      [L('Construction delays or cost overruns.', 'Retards ou dépassements de coûts.'), L('Fixed-price contractor and staged releases.', 'Entreprise au forfait et libérations par étapes.')],
      [L('Lower demand than forecast.', 'Demande inférieure aux prévisions.'), L('Conservative occupancy assumptions.', 'Hypothèses d’occupation prudentes.')],
      [L('Currency moves on local-currency income.', 'Variation de change sur les revenus en monnaie locale.'), L('Some contracts indexed to USD where possible.', 'Certains contrats indexés sur l’USD lorsque possible.')]],
    exit: L('At the end of the term the asset is sold, refinanced or bought back by the operator, and capital is returned.', 'En fin de durée, l’actif est revendu, refinancé ou racheté par l’exploitant, et le capital est rendu.'),
    docs: [L('Building permit and title', 'Permis de construire et titre'), L('Signed tenant or user contracts', 'Contrats locataires ou utilisateurs signés'), L('Construction contract', 'Contrat de construction'), L('Insurance and operating reports', 'Assurance et rapports d’exploitation')],
    steps: [L('Funding closes; works start', 'Clôture du financement ; début des travaux'), L('Completion and handover to tenants', 'Achèvement et remise aux locataires'), L('Contracted income distributed', 'Distribution des revenus contractuels'), L('Sale, refinancing or buy-back', 'Revente, refinancement ou rachat')],
  },
};

const PROTECTIONS = [
  L('A dedicated company (SPV) holds the project, so it is ring-fenced from other projects.', 'Une société dédiée (SPV) détient le projet : il est isolé des autres projets.'),
  L('Funds wait in escrow until the round is fully funded, then are released in stages against proof of work.', 'Les fonds restent sous séquestre jusqu’au financement complet, puis sont libérés par étapes sur preuve d’avancement.'),
  L('Every investor is identity-verified (KYC) before an investment becomes active.', 'Chaque investisseur est vérifié (KYC) avant l’activation d’un investissement.'),
  L('You receive a report every payout period and can follow every payment in your dashboard.', 'Vous recevez un rapport à chaque période de versement et suivez chaque paiement dans votre tableau de bord.'),
];

// Milestones spread over the term: month numbers for the four sector steps.
function timeline(cat, term) {
  const s = (SECTORS[cat] || SECTORS.re).steps;
  const at = [0, Math.max(1, Math.round(term * 0.15)), Math.max(2, Math.round(term * 0.3)), term];
  return s.map((label, i) => ({ month: at[i], label }));
}

module.exports = { SECTORS, PROTECTIONS, timeline };
