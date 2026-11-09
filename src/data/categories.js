'use strict';
// The eight asset classes. Each has a public landing page at /invest/:slug.
module.exports = [
  {
    code: 're', slug: 'real-estate', emoji: '🏢', hue: 38,
    name: { en: 'Real estate', fr: 'Immobilier' },
    title: { en: 'Rental buildings and plots', fr: 'Immeubles locatifs et terrains' },
    short: {
      en: 'Apartments, shops, offices and student housing in Douala, Abidjan, Lagos, Nairobi, Accra and Kigali. You earn a share of the rent, plus a share of the gain if the property is sold.',
      fr: "Appartements, commerces, bureaux et cités universitaires à Douala, Abidjan, Lagos, Nairobi, Accra et Kigali. Vous percevez une part des loyers, plus une part de la plus-value à la revente.",
    },
    returnFrom: { en: 'Rent + resale', fr: 'Loyers + revente' },
    term: { en: '24–60 months', fr: '24–60 mois' },
    payouts: { en: 'Quarterly', fr: 'Trimestriels' },
    target: { en: '8–12 % / year', fr: '8–12 % / an' },
    body: {
      en: [
        'African cities are growing faster than anywhere else on earth, and housing supply has not kept up. That gap keeps occupancy high and rents rising in districts like Bonamoussadi in Douala, Cocody and the Plateau in Abidjan, and Molyko in Buea.',
        'Each property sits in its own special-purpose company (SPV). Investors own shares of that company in proportion to what they put in. Net rent, after maintenance, insurance and management, is distributed every quarter. When the property is sold at the end of the term, the net gain is shared the same way.',
        'Before a building is listed we verify the land title (titre foncier), visit the site, review the rent roll and set the target return from real lease data.',
      ],
      fr: [
        "Les villes africaines croissent plus vite que partout ailleurs, et l'offre de logements ne suit pas. Ce déficit maintient l'occupation élevée et les loyers en hausse dans des quartiers comme Bonamoussadi à Douala, Cocody et le Plateau à Abidjan, ou Molyko à Buea.",
        "Chaque bien est logé dans sa propre société (SPV). Les investisseurs détiennent des parts de cette société au prorata de leur apport. Le loyer net, après entretien, assurance et gestion, est distribué chaque trimestre. À la revente en fin de durée, la plus-value nette est partagée de la même façon.",
        "Avant toute mise en ligne, nous vérifions le titre foncier, visitons le site, analysons l'état locatif et fixons le rendement cible à partir des baux réels.",
      ],
    },
    faq: [
      { q: { en: 'How much can I earn from African rental property?', fr: "Combien rapporte l'immobilier locatif en Afrique ?" },
        a: { en: 'Projects on Invest n Returns target 8–12 % a year from net rent, plus a share of any resale gain. Targets are not guaranteed.', fr: "Les projets visent 8–12 % par an issus des loyers nets, plus une part de la plus-value éventuelle. Les cibles ne sont pas garanties." } },
      { q: { en: 'Do I own the building?', fr: "Suis-je propriétaire de l'immeuble ?" },
        a: { en: 'You own shares of the company (SPV) that owns the building, in proportion to your investment.', fr: "Vous détenez des parts de la société (SPV) propriétaire de l'immeuble, au prorata de votre investissement." } },
    ],
  },
  {
    code: 'ag', slug: 'agriculture', emoji: '🌱', hue: 145,
    name: { en: 'Agriculture', fr: 'Agriculture' },
    title: { en: 'Farms with an off-taker', fr: 'Exploitations avec acheteur garanti' },
    short: {
      en: 'Cocoa, cashew, plantain, cassava, maize, poultry and fish farming. We fund only farms with a signed buyer for the harvest. You earn a share of the harvest sale each cycle.',
      fr: "Cacao, anacarde, plantain, manioc, maïs, volaille et pisciculture. Nous finançons uniquement des exploitations ayant un acheteur sous contrat. Vous percevez une part de la vente à chaque cycle.",
    },
    returnFrom: { en: 'Harvest sales', fr: 'Vente des récoltes' },
    term: { en: '4–12 months / cycle', fr: '4–12 mois / cycle' },
    payouts: { en: 'End of each cycle', fr: 'Fin de chaque cycle' },
    target: { en: '12–18 % / year', fr: '12–18 % / an' },
    body: {
      en: [
        'Agriculture employs more than half of Africa\'s workforce, yet most farms cannot get bank credit for seed, feed or equipment. Investors fill that gap and share in the harvest.',
        'We only list farms that already have a signed purchase contract (an off-taker) for the crop, so the sale price and the buyer are known before you invest. Funds are released in stages against proof of planting, growth and harvest.',
        'Weather, disease and price are real risks. Diversify across crops and regions, and favour cycles with insurance where available.',
      ],
      fr: [
        "L'agriculture emploie plus de la moitié des actifs africains, mais la plupart des exploitations n'obtiennent pas de crédit bancaire pour les semences, l'aliment ou l'équipement. Les investisseurs comblent ce manque et partagent la récolte.",
        "Nous ne listons que des exploitations disposant d'un contrat d'achat signé pour la récolte : le prix et l'acheteur sont connus avant votre investissement. Les fonds sont libérés par étapes sur preuve de plantation, de croissance et de récolte.",
        "Météo, maladies et prix sont des risques réels. Diversifiez cultures et régions, et privilégiez les cycles assurés lorsque c'est possible.",
      ],
    },
    faq: [
      { q: { en: 'What is an off-taker?', fr: "Qu'est-ce qu'un acheteur garanti (off-taker) ?" },
        a: { en: 'A buyer who has signed a contract to purchase the harvest at an agreed price before planting starts.', fr: "Un acheteur qui a signé un contrat d'achat de la récolte à un prix convenu avant la plantation." } },
      { q: { en: 'When are farm returns paid?', fr: 'Quand les rendements agricoles sont-ils versés ?' },
        a: { en: 'Income accrues weekly to your balance; the harvest sale settles at the end of each cycle, typically 4 to 12 months.', fr: 'Les revenus sont crédités chaque semaine ; la vente de la récolte est réglée en fin de cycle, généralement 4 à 12 mois.' } },
    ],
  },
  {
    code: 'co', slug: 'sme-loans', emoji: '🏪', hue: 200,
    name: { en: 'Working companies', fr: 'Entreprises' },
    title: { en: 'Loans to profitable SMEs', fr: 'Prêts à des PME rentables' },
    short: {
      en: 'Distributors, workshops, transport and clinics with at least two years of accounts. They repay capital plus interest monthly from their revenue.',
      fr: "Distributeurs, ateliers, transporteurs et cliniques avec au moins deux ans de comptes. Ils remboursent capital et intérêts chaque mois sur leur chiffre d'affaires.",
    },
    returnFrom: { en: 'Interest', fr: 'Intérêts' },
    term: { en: '6–24 months', fr: '6–24 mois' },
    payouts: { en: 'Monthly', fr: 'Mensuels' },
    target: { en: '14–19 % / year', fr: '14–19 % / an' },
    body: {
      en: [
        'Small and medium businesses are the engine of African economies, but bank loans often cost more than 20 % and take months. We lend to established companies with real revenue, at fixed rates and short terms.',
        'Every borrower has at least two years of accounts, a registered company (RCCM) and a clear repayment source: inventory turnover, service contracts or receivables. Loans are secured on stock, equipment or receivables where possible.',
      ],
      fr: [
        "Les PME sont le moteur des économies africaines, mais le crédit bancaire coûte souvent plus de 20 % et prend des mois. Nous prêtons à des entreprises établies, avec un vrai chiffre d'affaires, à taux fixe et sur des durées courtes.",
        "Chaque emprunteur a au moins deux ans de comptes, une société immatriculée (RCCM) et une source de remboursement claire : rotation de stock, contrats de service ou créances. Les prêts sont garantis par du stock, de l'équipement ou des créances lorsque c'est possible.",
      ],
    },
    faq: [
      { q: { en: 'What happens if an SME stops repaying?', fr: "Que se passe-t-il si une PME ne rembourse plus ?" },
        a: { en: 'We enforce the security (stock, equipment, receivables) and recover what we can for that loan\'s investors. Losses are possible.', fr: "Nous faisons jouer les garanties (stock, équipement, créances) et récupérons ce qui est possible pour les investisseurs du prêt. Des pertes sont possibles." } },
    ],
  },
  {
    code: 'te', slug: 'tech-startups', emoji: '💻', hue: 225,
    name: { en: 'Tech companies', fr: 'Entreprises tech' },
    title: { en: 'Shares in African tech start-ups', fr: 'Parts dans des start-ups tech africaines' },
    short: {
      en: 'Fintech, logistics, agritech, health and e-commerce start-ups already earning revenue. You buy a stake or a convertible note. Returns come when the company is sold, raises at a higher value or pays dividends.',
      fr: "Fintech, logistique, agritech, santé et e-commerce, avec un chiffre d'affaires déjà réel. Vous achetez une participation ou une obligation convertible. Le rendement vient d'une revente, d'une levée à valorisation supérieure ou de dividendes.",
    },
    returnFrom: { en: 'Exit, revaluation, dividends', fr: 'Sortie, revalorisation, dividendes' },
    term: { en: '3–7 years', fr: '3–7 ans' },
    payouts: { en: 'At exit', fr: 'À la sortie' },
    target: { en: '2–5× capital · high risk', fr: '2–5× le capital · risque élevé' },
    body: {
      en: [
        'African start-ups raised billions in the last decade, but most of that capital came from abroad. We let investors on the continent and in the diaspora own a piece of the companies building Africa\'s digital economy.',
        'This is the highest-risk asset class on the platform. Many start-ups fail. There are no weekly payouts: returns arrive only at exit, often after several years. Keep tech to a small slice of your portfolio.',
      ],
      fr: [
        "Les start-ups africaines ont levé des milliards en dix ans, mais l'essentiel venait de l'étranger. Nous permettons aux investisseurs du continent et de la diaspora de détenir une part des entreprises qui construisent l'économie numérique africaine.",
        "C'est la classe d'actifs la plus risquée de la plateforme. Beaucoup de start-ups échouent. Pas de versements hebdomadaires : le rendement n'arrive qu'à la sortie, souvent après plusieurs années. Gardez la tech pour une petite part du portefeuille.",
      ],
    },
    faq: [
      { q: { en: 'How risky are African tech start-ups?', fr: 'Les start-ups tech africaines sont-elles risquées ?' },
        a: { en: 'Very. Many fail, and payouts only come at exit. Keep tech to a small part of your portfolio.', fr: "Oui, fortement. Beaucoup échouent et les gains n'arrivent qu'à la sortie. Limitez la tech à une petite part du portefeuille." } },
    ],
  },
  {
    code: 'fo', slug: 'foreign-property', emoji: '🌍', hue: 15,
    name: { en: 'Foreign assets', fr: 'Actifs étrangers' },
    title: { en: 'Hard-currency property abroad', fr: "Immobilier en devises fortes à l'étranger" },
    short: {
      en: 'Rental property in Dubai, Lisbon, Paris and Texas. Protects part of your savings against currency moves, with rent paid in USD, EUR or AED.',
      fr: "Immobilier locatif à Dubaï, Lisbonne, Paris et au Texas. Protège une partie de votre épargne contre les variations de change, avec des loyers en USD, EUR ou AED.",
    },
    returnFrom: { en: 'Rent in USD/EUR/AED + resale', fr: 'Loyers USD/EUR/AED + revente' },
    term: { en: '36–84 months', fr: '36–84 mois' },
    payouts: { en: 'Quarterly', fr: 'Trimestriels' },
    target: { en: '6–9 % / year', fr: '6–9 % / an' },
    body: {
      en: [
        'Many investors in Africa earn in local currency and want part of their savings anchored in dollars, euros or dirhams. Foreign property gives you that anchor from 100 USDT.',
        'We apply the same checks as on the continent: title, site visit, rent roll and a separate company per property. Rent is collected in hard currency and paid out in the currency you choose.',
      ],
      fr: [
        "Beaucoup d'investisseurs en Afrique gagnent en monnaie locale et veulent ancrer une partie de leur épargne en dollars, euros ou dirhams. L'immobilier étranger offre cet ancrage dès 100 USDT.",
        "Nous appliquons les mêmes contrôles que sur le continent : titre, visite, état locatif et une société par bien. Les loyers sont encaissés en devises fortes et versés dans la devise de votre choix.",
      ],
    },
    faq: [
      { q: { en: 'Why invest in foreign property through an African platform?', fr: "Pourquoi de l'immobilier étranger via une plateforme africaine ?" },
        a: { en: 'To hold part of your savings in USD, EUR or AED with the same checks and reporting as African projects, starting from 100 USDT.', fr: "Pour détenir une part de votre épargne en USD, EUR ou AED avec les mêmes contrôles et rapports que les projets africains, dès 100 USDT." } },
    ],
  },
  {
    code: 'mi', slug: 'mining-royalties', emoji: '⛏️', hue: 30,
    name: { en: 'Mining', fr: 'Mines' },
    title: { en: 'Gold, copper and lithium royalties', fr: 'Redevances or, cuivre et lithium' },
    short: {
      en: 'Licensed small and mid-size mines in Ghana, Tanzania, Zambia and Côte d\'Ivoire. You fund equipment or production and receive a royalty on every tonne or ounce sold.',
      fr: "Mines agréées de petite et moyenne taille au Ghana, en Tanzanie, en Zambie et en Côte d'Ivoire. Vous financez l'équipement ou la production et recevez une redevance sur chaque tonne ou once vendue.",
    },
    returnFrom: { en: 'Royalty on output sold', fr: 'Redevance sur la production' },
    term: { en: '24–48 months', fr: '24–48 mois' },
    payouts: { en: 'Weekly', fr: 'Hebdomadaires' },
    target: { en: '18–25 % / year', fr: '18–25 % / an' },
    body: {
      en: [
        'Africa holds a large share of the world\'s gold, copper, cobalt and lithium. Licensed small and mid-size mines need equipment and working capital that banks rarely provide.',
        'A royalty pays you a fixed share of revenue on every ounce or tonne sold, without owning the mine. Royalties pay from the first sale and are senior to equity. We list only licensed operations with environmental permits and independent resource estimates.',
      ],
      fr: [
        "L'Afrique détient une grande part de l'or, du cuivre, du cobalt et du lithium mondiaux. Les mines agréées de petite et moyenne taille ont besoin d'équipement et de fonds de roulement que les banques financent rarement.",
        "Une redevance vous verse une part fixe du chiffre d'affaires sur chaque once ou tonne vendue, sans détenir la mine. Elle paie dès la première vente et passe avant les actionnaires. Nous ne listons que des exploitations agréées, avec permis environnemental et estimation indépendante des ressources.",
      ],
    },
    faq: [
      { q: { en: 'What is a mining royalty?', fr: "Qu'est-ce qu'une redevance minière ?" },
        a: { en: 'A contract that pays a fixed share of revenue on each unit of metal sold, from the first sale, without owning the mine.', fr: "Un contrat qui verse une part fixe du chiffre d'affaires sur chaque unité de métal vendue, dès la première vente, sans détenir la mine." } },
    ],
  },
  {
    code: 'en', slug: 'energy', emoji: '⚡', hue: 50,
    name: { en: 'Energy', fr: 'Énergie' },
    title: { en: 'Solar, mini-grids and fuel distribution', fr: 'Solaire, mini-réseaux et distribution de carburant' },
    short: {
      en: 'Solar farms, village mini-grids, pay-as-you-go home solar and fuel and gas depots in Nigeria, Kenya, Senegal and Cameroon. Customers pay for power and fuel every day.',
      fr: "Centrales solaires, mini-réseaux villageois, solaire domestique prépayé et dépôts de carburant et de gaz au Nigeria, au Kenya, au Sénégal et au Cameroun. Les clients paient l'énergie chaque jour.",
    },
    returnFrom: { en: 'Power and fuel sales', fr: "Ventes d'énergie et de carburant" },
    term: { en: '36–84 months', fr: '36–84 mois' },
    payouts: { en: 'Weekly', fr: 'Hebdomadaires' },
    target: { en: '12–19 % / year', fr: '12–19 % / an' },
    body: {
      en: [
        'Around 600 million Africans still lack reliable electricity. Solar mini-grids and pay-as-you-go kits sell power by the day, which turns into steady, predictable cash flow.',
        'Fuel and LPG depots sell essential products with daily turnover. Both models fit weekly payouts naturally because customers pay every day.',
      ],
      fr: [
        "Environ 600 millions d'Africains n'ont toujours pas d'électricité fiable. Mini-réseaux solaires et kits prépayés vendent l'énergie au jour le jour, ce qui crée des flux réguliers et prévisibles.",
        "Les dépôts de carburant et de gaz vendent des produits essentiels avec une rotation quotidienne. Les deux modèles se prêtent naturellement aux versements hebdomadaires.",
      ],
    },
    faq: [
      { q: { en: 'Why do energy projects pay weekly?', fr: 'Pourquoi les projets énergie paient-ils chaque semaine ?' },
        a: { en: 'Customers pay for power and fuel daily, so revenue arrives continuously and can be distributed weekly.', fr: "Les clients paient l'énergie et le carburant chaque jour : les revenus arrivent en continu et peuvent être distribués chaque semaine." } },
    ],
  },
  {
    code: 'in', slug: 'infrastructure', emoji: '🚢', hue: 180,
    name: { en: 'Infrastructure & more', fr: 'Infrastructures & plus' },
    title: { en: 'Logistics, telecom, hotels, health, industry', fr: 'Logistique, télécoms, hôtels, santé, industrie' },
    short: {
      en: 'Port warehouses, cold storage, telecom towers, data centres, hotels, private clinics, schools and factories. Long contracts with paying tenants and customers.',
      fr: "Entrepôts portuaires, chambres froides, pylônes télécoms, data centers, hôtels, cliniques, écoles et usines. Contrats longs avec des locataires et clients solvables.",
    },
    returnFrom: { en: 'Contract and user fees', fr: "Contrats et redevances d'usage" },
    term: { en: '24–84 months', fr: '24–84 mois' },
    payouts: { en: 'Weekly or monthly', fr: 'Hebdo ou mensuels' },
    target: { en: '10–19 % / year', fr: '10–19 % / an' },
    body: {
      en: [
        'Africa needs an estimated 100 billion dollars a year of new infrastructure. Mid-size assets such as warehouses, towers, clinics and hotels are too small for big funds and too large for local banks.',
        'These assets earn from long contracts with creditworthy tenants (logistics firms, mobile operators, hospitals), which makes their income steady and easy to forecast.',
      ],
      fr: [
        "L'Afrique a besoin d'environ 100 milliards de dollars d'infrastructures nouvelles par an. Les actifs de taille moyenne (entrepôts, pylônes, cliniques, hôtels) sont trop petits pour les grands fonds et trop gros pour les banques locales.",
        "Ces actifs perçoivent des revenus de contrats longs avec des locataires solvables (logisticiens, opérateurs mobiles, hôpitaux), ce qui rend leurs revenus réguliers et prévisibles.",
      ],
    },
    faq: [
      { q: { en: 'What kinds of infrastructure can I invest in?', fr: "Dans quelles infrastructures puis-je investir ?" },
        a: { en: 'Port warehouses, cold storage, telecom towers, data centres, hotels, private clinics, schools and factories.', fr: "Entrepôts portuaires, chambres froides, pylônes télécoms, data centers, hôtels, cliniques, écoles et usines." } },
    ],
  },
];
