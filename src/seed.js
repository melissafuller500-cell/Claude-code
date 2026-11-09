'use strict';
const { q, tx, now } = require('./db');
const config = require('./config');
const { hashPassword } = require('./security');
const projects = require('./data/projects');
const categories = require('./data/categories');
const { countries, fx } = require('./data/catalog');
const { uniqueSlug, toUsd } = require('./services/assets');

const catByCode = Object.fromEntries(categories.map((c) => [c.code, c]));

// Category-specific copy used to generate full project files for the seed catalogue.
const COPY = {
  re: {
    en: (p) => [`${p.en} in ${p.city}, ${countries[p.cc].en}. The property is held in a dedicated project company (SPV) and let to vetted tenants under written leases.`, `Net rent, after maintenance, insurance and property management, is distributed to investors. At the end of the ${p.term}-month term the property is sold or refinanced and the net gain is shared pro rata.`],
    fr: (p) => [`${p.fr} à ${p.city}, ${countries[p.cc].fr}. Le bien est logé dans une société de projet dédiée (SPV) et loué à des locataires sélectionnés sous bail écrit.`, `Le loyer net, après entretien, assurance et gestion, est distribué aux investisseurs. À la fin des ${p.term} mois, le bien est revendu ou refinancé et la plus-value nette est partagée au prorata.`],
    h: { en: ['Land title verified', 'Occupancy and rent roll reviewed', 'Independent valuation on file', 'Property insurance in place'], fr: ['Titre foncier vérifié', 'Occupation et état locatif analysés', 'Évaluation indépendante au dossier', 'Assurance du bien souscrite'] },
  },
  ag: {
    en: (p) => [`${p.en} in ${p.city}, ${countries[p.cc].en}, operated by an experienced local producer. The harvest is pre-sold to a contracted off-taker at an agreed price.`, `Funds pay for inputs, labour and equipment and are released in stages against proof of planting, growth and harvest. Investors receive a share of the harvest sale at the end of each cycle.`],
    fr: (p) => [`${p.fr} à ${p.city}, ${countries[p.cc].fr}, exploité par un producteur local expérimenté. La récolte est pré-vendue à un acheteur sous contrat à un prix convenu.`, `Les fonds financent intrants, main-d'œuvre et équipement et sont libérés par étapes sur preuve de plantation, de croissance et de récolte. Les investisseurs perçoivent une part de la vente à chaque fin de cycle.`],
    h: { en: ['Signed off-take contract', 'Staged release of funds', 'Agronomist site visits', 'Dated photo reports each month'], fr: ["Contrat d'achat signé", 'Libération des fonds par étapes', "Visites d'agronome", 'Rapports photo datés chaque mois'] },
  },
  co: {
    en: (p) => [`A fixed-rate loan to an established business in ${p.city}, ${countries[p.cc].en}, with more than two years of audited accounts and a registered company (RCCM).`, `The company repays capital and interest monthly from its revenue over ${p.term} months. The loan is secured on stock, equipment or receivables.`],
    fr: (p) => [`Un prêt à taux fixe à une entreprise établie à ${p.city}, ${countries[p.cc].fr}, avec plus de deux ans de comptes et une société immatriculée (RCCM).`, `L'entreprise rembourse capital et intérêts chaque mois sur son chiffre d'affaires pendant ${p.term} mois. Le prêt est garanti par du stock, de l'équipement ou des créances.`],
    h: { en: ['2+ years of accounts reviewed', 'Secured on stock or equipment', 'Monthly repayment schedule', 'Director personal guarantee'], fr: ['Plus de 2 ans de comptes analysés', 'Garanti par stock ou équipement', 'Échéancier mensuel', 'Caution personnelle du dirigeant'] },
  },
  te: {
    en: (p) => [`An equity stake (or convertible note) in a revenue-generating start-up based in ${p.city}, ${countries[p.cc].en}.`, `There are no regular payouts. Returns come from an exit, a later funding round at a higher valuation or dividends, typically after ${Math.round(p.term / 12)} years. High risk: you can lose all of your capital.`],
    fr: (p) => [`Une participation (ou obligation convertible) dans une start-up générant déjà du chiffre d'affaires, basée à ${p.city}, ${countries[p.cc].fr}.`, `Pas de versements réguliers. Le rendement vient d'une sortie, d'une levée à valorisation supérieure ou de dividendes, généralement après ${Math.round(p.term / 12)} ans. Risque élevé : vous pouvez perdre tout votre capital.`],
    h: { en: ['Revenue-generating today', 'Investor rights agreement', 'Quarterly KPI reporting', 'Pro-rata rights in later rounds'], fr: ["Chiffre d'affaires déjà réel", "Pacte d'investisseurs", 'Reporting trimestriel des KPI', 'Droit de suite aux levées suivantes'] },
  },
  fo: {
    en: (p) => [`${p.en} in ${p.city}, ${countries[p.cc].en}. Rent is collected in ${p.cur} and paid out in the currency you choose, giving your savings a hard-currency anchor.`, `The property is held in its own company, professionally managed, and sold or refinanced at the end of the ${p.term}-month term.`],
    fr: (p) => [`${p.fr} à ${p.city}, ${countries[p.cc].fr}. Les loyers sont encaissés en ${p.cur} et versés dans la devise de votre choix : un ancrage en devises fortes pour votre épargne.`, `Le bien est logé dans sa propre société, géré par des professionnels, et revendu ou refinancé au terme des ${p.term} mois.`],
    h: { en: ['Rent in hard currency', 'Professional property manager', 'Title deed verified', 'Exit or refinance at term'], fr: ['Loyers en devises fortes', 'Gestionnaire professionnel', 'Titre de propriété vérifié', 'Sortie ou refinancement au terme'] },
  },
  mi: {
    en: (p) => [`A royalty on output from a licensed operation near ${p.city}, ${countries[p.cc].en}. Investors fund equipment or working capital and receive a fixed share of revenue on every unit sold.`, `Royalties pay from the first sale and rank ahead of the mine's shareholders. The site holds a valid mining licence and environmental permit.`],
    fr: (p) => [`Une redevance sur la production d'une exploitation agréée près de ${p.city}, ${countries[p.cc].fr}. Les investisseurs financent équipement ou fonds de roulement et reçoivent une part fixe du chiffre d'affaires sur chaque unité vendue.`, `La redevance paie dès la première vente et passe avant les actionnaires de la mine. Le site détient un permis minier et un permis environnemental valides.`],
    h: { en: ['Valid mining licence', 'Environmental permit on file', 'Independent resource estimate', 'Weekly sales reporting'], fr: ['Permis minier valide', 'Permis environnemental au dossier', 'Estimation indépendante des ressources', 'Reporting hebdomadaire des ventes'] },
  },
  en: {
    en: (p) => [`${p.en} serving customers in and around ${p.city}, ${countries[p.cc].en}. Customers pay for power or fuel daily, which produces steady weekly cash flow.`, `Revenue is collected digitally (mobile money and metering) and shared with investors over a ${p.term}-month term.`],
    fr: (p) => [`${p.fr} desservant des clients à ${p.city} et alentours, ${countries[p.cc].fr}. Les clients paient l'énergie ou le carburant chaque jour, ce qui génère des flux hebdomadaires réguliers.`, `Les revenus sont collectés numériquement (mobile money et compteurs) et partagés avec les investisseurs sur ${p.term} mois.`],
    h: { en: ['Daily customer payments', 'Smart metering and remote monitoring', 'Equipment insured', 'Experienced EPC contractor'], fr: ['Paiements clients quotidiens', 'Compteurs intelligents et télésuivi', 'Équipement assuré', 'Installateur expérimenté'] },
  },
  in: {
    en: (p) => [`${p.en} in ${p.city}, ${countries[p.cc].en}, earning income from long contracts with creditworthy tenants and customers.`, `Contracted income is distributed to investors over a ${p.term}-month term, followed by a sale or refinancing of the asset.`],
    fr: (p) => [`${p.fr} à ${p.city}, ${countries[p.cc].fr}, percevant des revenus de contrats longs avec des locataires et clients solvables.`, `Les revenus contractuels sont distribués aux investisseurs sur ${p.term} mois, suivis d'une revente ou d'un refinancement de l'actif.`],
    h: { en: ['Long-term contracts signed', 'Creditworthy anchor tenant', 'Construction and asset insurance', 'Monthly operating reports'], fr: ['Contrats longs signés', 'Locataire principal solvable', 'Assurance construction et actif', "Rapports d'exploitation mensuels"] },
  },
};

function seedAssets() {
  if (q.get('SELECT COUNT(*) n FROM assets').n > 0) return;
  const t = now();
  tx(() => {
    projects.forEach((p, i) => {
      const c = COPY[p.c];
      const goalUsd = toUsd(p.goal, p.cur);
      const slug = uniqueSlug(`${p.en} ${p.city.split(',')[0]}`);
      const descEn = c.en(p);
      const descFr = c.fr(p);
      q.run(`INSERT INTO assets (slug,category,title_en,title_fr,summary_en,summary_fr,description_en,description_fr,highlights_en,highlights_fr,
        city,region,country_code,currency,goal_local,goal_usd,offline_raised_usd,target_rate,target_multiple,term_months,payout_freq,risk,min_usd,status,featured,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      slug, p.c, p.en, p.fr, descEn[0], descFr[0], descEn.join('\n\n'), descFr.join('\n\n'),
      JSON.stringify(c.h.en), JSON.stringify(c.h.fr), p.city, p.region, p.cc, p.cur, p.goal, goalUsd,
      Math.round((goalUsd * p.pct) / 100), p.rate ?? null, p.mult ?? null, p.term, p.pay, p.risk,
      p.c === 'te' ? 500 : 100, 'open', p.featured ? 1 : 0, t - (projects.length - i) * 864e5, t);
    });
  });
  console.log(`[seed] ${projects.length} assets created`);
}

function seedUsers() {
  const admin = q.get('SELECT id FROM users WHERE email = ?', config.adminEmail);
  if (!admin) {
    q.run(`INSERT INTO users (email,password_hash,name,role,kyc_status,country,created_at) VALUES (?,?,?,?,?,?,?)`,
      config.adminEmail, hashPassword(config.adminPassword), 'Platform Admin', 'admin', 'verified', 'CM', now());
    console.log(`[seed] admin created: ${config.adminEmail}${process.env.ADMIN_PASSWORD ? '' : ' (default password, change it now!)'}`);
  }
  if (!config.seedDemo || q.get("SELECT id FROM users WHERE email = 'demo@investnreturns.com'")) return;

  const day = 864e5;
  const t = now();
  tx(() => {
    const u = q.run(`INSERT INTO users (email,password_hash,name,phone,country,role,kyc_status,kyc_data,created_at,balance_cents) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      'demo@investnreturns.com', hashPassword('Demo!2026invest'), 'Amara Nkem', '+237 6 70 00 00 00', 'CM', 'investor', 'verified',
      JSON.stringify({ idType: 'passport', idNumber: 'P•••••21', dob: '1990-04-12', address: 'Bonapriso, Douala' }), t - 70 * day, 0);
    const uid = Number(u.lastInsertRowid);
    const pick = (slugPart) => q.get('SELECT * FROM assets WHERE slug LIKE ?', `%${slugPart}%`);
    const plan = [
      { a: pick('6-rental-flats'), usd: 5000, ago: 63, m: 'usdt' },
      { a: pick('solar-mini-grid'), usd: 2500, ago: 49, m: 'momo' },
      { a: pick('gold-royalty'), usd: 1500, ago: 42, m: 'btc' },
      { a: pick('studio-apartments'), usd: 3000, ago: 35, m: 'bank' },
    ];
    let balance = 0;
    plan.forEach((p, i) => {
      if (!p.a) return;
      const created = t - p.ago * day;
      const cents = p.usd * 100;
      const r = q.run(`INSERT INTO reservations (ref,user_id,asset_id,amount_cents,pay_method,status,created_at,expires_at,decided_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        `INR-DEMO${i + 1}0`, uid, p.a.id, cents, p.m, 'active', created, created + 72 * 36e5, created + day);
      const rid = Number(r.lastInsertRowid);
      q.run(`INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,method,details,created_at) VALUES (?,?,?,?,?,?,?,?)`,
        uid, 'deposit', cents, 'completed', rid, p.m, `Funding INR-DEMO${i + 1}0 · ${p.a.title_en}`, created + day);
      // Past weekly payouts.
      const weeks = Math.floor((p.ago - 1) / 7);
      const wk = Math.floor((cents * p.a.target_rate) / 100 / 52);
      for (let w = 1; w <= weeks; w++) {
        q.run(`INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,details,created_at) VALUES (?,?,?,?,?,?,?)`,
          uid, 'payout', wk, 'completed', rid, `Weekly payout · ${p.a.title_en}`, created + day + w * 7 * day);
      }
      q.run('UPDATE reservations SET paid_out_cents = ? WHERE id = ?', wk * weeks, rid);
      balance += wk * weeks;
    });
    // A withdrawal already paid.
    q.run(`INSERT INTO transactions (user_id,type,amount_cents,status,method,details,created_at,decided_at) VALUES (?,?,?,?,?,?,?,?)`,
      uid, 'withdrawal', -15000, 'completed', 'momo', '+237 6 70 00 00 00', t - 10 * day, t - 9 * day);
    balance -= 15000;
    q.run('UPDATE users SET balance_cents = ? WHERE id = ?', Math.max(0, balance), uid);
    // One pending reservation awaiting payment.
    const farm = pick('plantain-farm');
    if (farm) {
      q.run(`INSERT INTO reservations (ref,user_id,asset_id,amount_cents,pay_method,status,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)`,
        'INR-DEMO50', uid, farm.id, 100000, 'orange', 'pending', t - 3600e3, t + 71 * 36e5);
    }
    const ww = pick('port-warehouse');
    if (ww) q.run('INSERT INTO watchlist (user_id, asset_id, created_at) VALUES (?,?,?)', uid, ww.id, t);
    q.run('INSERT INTO notifications (user_id,title,body,link,created_at) VALUES (?,?,?,?,?)', uid, 'Welcome to Invest n Returns', 'Your identity is verified. You can reserve any open project.', '/assets', t - 70 * day);

    // A second investor awaiting KYC review, so the admin queue is not empty.
    const u2 = q.run(`INSERT INTO users (email,password_hash,name,phone,country,kyc_status,kyc_data,created_at) VALUES (?,?,?,?,?,?,?,?)`,
      'kofi@example.com', hashPassword('Kofi!2026invest'), 'Kofi Mensah', '+233 20 000 0000', 'GH', 'pending',
      JSON.stringify({ idType: 'national_id', idNumber: 'GHA-•••-882', dob: '1986-09-02', address: 'East Legon, Accra' }), t - 2 * day);
    const clinic = pick('private-clinic');
    if (clinic) q.run(`INSERT INTO reservations (ref,user_id,asset_id,amount_cents,pay_method,status,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)`,
      'INR-DEMO60', Number(u2.lastInsertRowid), clinic.id, 750000, 'usdc', 'pending', t - 5 * 3600e3, t + 67 * 36e5);

    q.run(`INSERT INTO submissions (name,email,company,type,city,need,description,created_at) VALUES (?,?,?,?,?,?,?,?)`,
      'Chantal Ebode', 'chantal@example.com', 'Ebode Agro SARL', 'Agriculture', 'Ebolowa', '60 000 000 XAF', 'Cocoa drying and fermentation centre for 400 smallholders, with an export buyer under contract.', t - day);
    q.run(`INSERT INTO messages (name,email,subject,body,created_at) VALUES (?,?,?,?,?)`,
      'Jean-Paul Fotso', 'jp@example.com', 'Diaspora investing', 'I live in Paris. Can I invest in euros and receive payouts on a French bank account?', t - 6 * 3600e3);
  });
  console.log('[seed] demo investor: demo@investnreturns.com / Demo!2026invest');
}

function seed() {
  seedAssets();
  seedUsers();
}

module.exports = { seed, COPY };

if (require.main === module) require('./db').init().then(seed);
