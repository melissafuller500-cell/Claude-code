'use strict';
const { html, raw } = require('../../html');
const seo = require('../../seo');
const { page } = require('../layout');
const { assetCard, icon, csrfField } = require('../components');
const parts = require('./parts');
const categories = require('../../data/categories');
const faq = require('../../data/faq');

const crumbsLd = (ctx, items) => seo.breadcrumbs(ctx, [{ name: ctx.t('Home', 'Accueil'), url: ctx.u('/') }, ...items]);

function simple(ctx, { path, eyebrow, title, h1, lead, description, body, extraLd = [], crumb }) {
  return page(ctx, {
    seo: { title, description, path, jsonld: [seo.webPage(ctx, { name: title, description, path }), crumbsLd(ctx, [{ name: crumb || h1 || title, url: ctx.u(path) }]), ...extraLd] },
    body: html`${parts.pageHero(ctx, { eyebrow, title: h1 || title, lead, crumbs: [{ name: crumb || h1 || title, url: ctx.u(path) }] })}${body}`,
  });
}

// ---------- asset classes ----------
function classIndex(ctx, { counts }) {
  const t = ctx.t;
  const title = t('Asset classes: what you can invest in across Africa', "Classes d'actifs : dans quoi investir en Afrique");
  return simple(ctx, {
    path: '/invest', eyebrow: t('Asset classes', "Classes d'actifs"), title,
    lead: t('Invest n Returns offers eight asset classes: real estate, agriculture, SME loans, tech start-ups, foreign property, mining royalties, energy and infrastructure. Each earns from a different source, so combining them smooths your income.', "Invest n Returns propose huit classes d'actifs : immobilier, agriculture, prêts PME, start-ups tech, immobilier étranger, redevances minières, énergie et infrastructures. Chacune tire ses revenus d'une source différente : les combiner lisse vos revenus."),
    description: t('Compare the 8 asset classes on Invest n Returns: target returns, terms, payout frequency and risks for African real estate, farms, SME loans, mining, energy, infrastructure, tech and foreign property.', "Comparez les 8 classes d'actifs : rendements cibles, durées, fréquence des versements et risques pour l'immobilier, l'agriculture, les PME, les mines, l'énergie, les infrastructures, la tech et l'immobilier étranger."),
    body: html`
<section class="section-tight"><div class="wrap">
  <div class="table-scroll reveal"><table class="compare">
    <caption class="sr">${t('Comparison of asset classes', "Comparaison des classes d'actifs")}</caption>
    <thead><tr><th scope="col">${t('Asset class', 'Classe')}</th><th scope="col">${t('Return from', 'Source')}</th><th scope="col">${t('Target', 'Cible')}</th><th scope="col">${t('Term', 'Durée')}</th><th scope="col">${t('Payouts', 'Versements')}</th><th scope="col">${t('Open', 'Ouverts')}</th></tr></thead>
    <tbody>${categories.map((c) => html`<tr><th scope="row"><a href="${ctx.u('/invest/' + c.slug)}">${c.emoji} ${t.o(c.name)}</a></th><td>${t.o(c.returnFrom)}</td><td class="num hl">${t.o(c.target)}</td><td class="num">${t.o(c.term)}</td><td>${t.o(c.payouts)}</td><td class="num">${counts[c.code] || 0}</td></tr>`)}</tbody>
  </table></div>
  <div class="assets" style="margin-top:40px">${categories.map((c) => parts.classCard(ctx, c))}</div>
</div></section>
${parts.ctaBand(ctx)}`,
  });
}

function classPage(ctx, { c, items, saved }) {
  const t = ctx.t;
  const title = t(`Invest in ${c.name.en.toLowerCase()} in Africa — ${c.target.en}`, `Investir dans ${c.name.fr.toLowerCase() === 'immobilier' ? "l'immobilier" : c.name.fr.toLowerCase()} en Afrique — ${c.target.fr}`);
  const description = `${t.o(c.short)} ${t('Target', 'Cible')} ${t.o(c.target)}.`.slice(0, 300);
  const path = `/invest/${c.slug}`;
  const body = html`
${parts.pageHero(ctx, { eyebrow: `${c.emoji} ${t.o(c.name)}`, title: t.o(c.title), lead: t.o(c.short), crumbs: [{ name: t('Asset classes', "Classes d'actifs"), url: ctx.u('/invest') }, { name: t.o(c.name), url: ctx.u(path) }] })}
<section class="section-tight"><div class="wrap">
  <div class="kpis kpis-4">
    <div class="kpi reveal"><span>${t('Return from', 'Rendement issu de')}</span><b>${t.o(c.returnFrom)}</b></div>
    <div class="kpi reveal"><span>${t('Target', 'Cible')}</span><b class="hl">${t.o(c.target)}</b></div>
    <div class="kpi reveal"><span>${t('Typical term', 'Durée type')}</span><b>${t.o(c.term)}</b></div>
    <div class="kpi reveal"><span>${t('Payouts', 'Versements')}</span><b>${t.o(c.payouts)}</b></div>
  </div>
  <div class="two-col">
    <div class="prose-block">
      <h2>${t('How it works', 'Comment ça marche')}</h2>
      ${t.o(c.body).map((p) => html`<p class="prose">${p}</p>`)}
    </div>
    <div>
      <h2>${t('Common questions', 'Questions fréquentes')}</h2>
      ${parts.faqList(ctx, c.faq)}
    </div>
  </div>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="head"><div><p class="eyebrow">${t('Open now', 'Ouverts maintenant')}</p><h2>${t(`${items.length} ${c.name.en.toLowerCase()} projects`, `${items.length} projets ${c.name.fr.toLowerCase()}`)}</h2></div>
    <a class="btn btn-ghost" href="${ctx.u('/assets')}?category=${c.code}">${t('Filter & sort', 'Filtrer & trier')} ${icon('arrow', 16)}</a></div>
  ${items.length ? html`<div class="projects">${items.map((a) => assetCard(ctx, a, { saved: saved.has(a.id) }))}</div>` : html`<p class="empty">${t('New projects in this class are coming soon. Subscribe below to be notified.', 'De nouveaux projets arrivent bientôt. Abonnez-vous pour être prévenu.')}</p>`}
</div></section>
${parts.ctaBand(ctx)}`;
  return page(ctx, {
    seo: {
      title, description, path,
      jsonld: [seo.webPage(ctx, { name: title, description, path, type: 'CollectionPage' }), crumbsLd(ctx, [{ name: t('Asset classes', "Classes d'actifs"), url: ctx.u('/invest') }, { name: t.o(c.name), url: ctx.u(path) }]), seo.faqPage(ctx, c.faq), seo.itemList(ctx, items, t.o(c.title))],
    },
    body,
  });
}

// ---------- content pages ----------
function howItWorks(ctx) {
  const t = ctx.t;
  const howTo = {
    '@type': 'HowTo',
    name: t('How to invest in African assets with Invest n Returns', 'Comment investir dans des actifs africains avec Invest n Returns'),
    totalTime: 'PT15M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: 100 },
    step: [
      [t('Open your account', 'Ouvrez votre compte'), t('Register with your email and create a password.', 'Inscrivez-vous avec votre email et un mot de passe.')],
      [t('Verify your identity', 'Vérifiez votre identité'), t('Submit your ID details for KYC review.', "Soumettez vos informations d'identité pour la vérification KYC.")],
      [t('Reserve a project', 'Réservez un projet'), t('Choose a project and enter your amount; your share is held 72 hours.', 'Choisissez un projet et votre montant ; votre part est bloquée 72 heures.')],
      [t('Pay', 'Payez'), t('Pay in crypto, Mobile Money, card or bank transfer using your reservation reference.', 'Payez en crypto, Mobile Money, carte ou virement avec votre référence de réservation.')],
      [t('Earn weekly', 'Gagnez chaque semaine'), t('Income is credited to your balance every week; withdraw any time.', 'Les revenus sont crédités chaque semaine ; retirez quand vous voulez.')],
    ].map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text })),
  };
  return simple(ctx, {
    path: '/how-it-works', eyebrow: t('How it works', 'Fonctionnement'),
    title: t('How investing with Invest n Returns works, step by step', 'Comment investir avec Invest n Returns, étape par étape'),
    h1: t('How it works', 'Comment ça marche'),
    lead: t('You open a free account, verify your identity, reserve a share of a vetted project, pay in crypto or cash, and receive income every week. The whole process takes about 15 minutes.', "Vous ouvrez un compte gratuit, vérifiez votre identité, réservez une part d'un projet vérifié, payez en crypto ou en cash, et recevez des revenus chaque semaine. Le tout prend environ 15 minutes."),
    description: t('Open an account, verify your ID, reserve a project from 100 USD, pay in USDT, BTC or Mobile Money and earn weekly income. Learn how Invest n Returns works.', 'Ouvrez un compte, vérifiez votre identité, réservez un projet dès 100 USD, payez en USDT, BTC ou Mobile Money et percevez des revenus chaque semaine.'),
    extraLd: [howTo],
    body: html`${parts.steps(ctx)}
<section class="section-tight"><div class="wrap two-col">
  <div class="prose-block">
    <h2>${t('What happens after you reserve', 'Ce qui se passe après la réservation')}</h2>
    <ol class="timeline">
      <li class="reveal"><b>${t('Hour 0 — Reservation', 'Heure 0 — Réservation')}</b><span>${t('Your share is held and you get a reference (e.g. INR-4F2A91C0) with payment instructions.', 'Votre part est bloquée et vous recevez une référence (ex. INR-4F2A91C0) avec les instructions de paiement.')}</span></li>
      <li class="reveal"><b>${t('Within 72 h — Payment', 'Sous 72 h — Paiement')}</b><span>${t('Pay using the reference. Crypto confirms in minutes; bank transfers in 1–3 days.', 'Payez avec la référence. La crypto est confirmée en minutes ; les virements en 1 à 3 jours.')}</span></li>
      <li class="reveal"><b>${t('Confirmation — Active', 'Confirmation — Actif')}</b><span>${t('Once funds arrive and your KYC is verified, the investment turns active and appears in your portfolio.', 'Dès réception des fonds et KYC vérifié, l’investissement devient actif dans votre portefeuille.')}</span></li>
      <li class="reveal"><b>${t('Every week — Payouts', 'Chaque semaine — Versements')}</b><span>${t('Income is credited to your balance. Watch it tick up live in your dashboard.', 'Les revenus sont crédités sur votre solde. Suivez-les en direct dans votre tableau de bord.')}</span></li>
      <li class="reveal"><b>${t('End of term — Capital back', 'Fin de durée — Capital rendu')}</b><span>${t('Your capital (plus any resale gain) returns to your balance, ready to withdraw or reinvest.', 'Votre capital (plus une éventuelle plus-value) revient sur votre solde, prêt à être retiré ou réinvesti.')}</span></li>
    </ol>
  </div>
  <div>${parts.riskBox(ctx)}</div>
</div></section>
${parts.calculator(ctx)}
${parts.ctaBand(ctx)}`,
  });
}

function security(ctx) {
  const t = ctx.t;
  return simple(ctx, {
    path: '/security', eyebrow: t('Security & risks', 'Sécurité & risques'),
    title: t('How Invest n Returns protects investors: 5 checks, SPVs and escrow', 'Comment Invest n Returns protège les investisseurs : 5 contrôles, SPV et séquestre'),
    h1: t('How we protect your money', 'Comment nous protégeons votre argent'),
    lead: t('Every project passes five checks before it goes live, sits in its own company (SPV), and receives funds in stages from escrow against proof of work. Your account is protected by hashed passwords, secure sessions and identity verification.', "Chaque projet passe cinq contrôles avant sa mise en ligne, est logé dans sa propre société (SPV) et reçoit les fonds par étapes depuis un séquestre, sur preuve d'avancement. Votre compte est protégé par des mots de passe chiffrés, des sessions sécurisées et la vérification d'identité."),
    description: t('Five due-diligence checks, one SPV per project, staged escrow releases and identity verification. Read how Invest n Returns protects investors and the risks you should know.', 'Cinq contrôles, une SPV par projet, séquestre par étapes et vérification d’identité. Découvrez comment Invest n Returns protège les investisseurs et les risques à connaître.'),
    body: html`${parts.trust(ctx)}
<section class="section-tight"><div class="wrap">
  <div class="head"><div><p class="eyebrow">${t('Account security', 'Sécurité du compte')}</p><h2>${t('Your account, locked down', 'Votre compte, verrouillé')}</h2></div></div>
  <div class="feature-grid">
    ${[
      [t('Strong password hashing', 'Mots de passe chiffrés'), t('Passwords are hashed with scrypt and a unique salt. We never store or see your password.', 'Les mots de passe sont hachés avec scrypt et un sel unique. Nous ne les stockons ni ne les voyons jamais.')],
      [t('Secure sessions', 'Sessions sécurisées'), t('HttpOnly, SameSite cookies, CSRF protection on every form, and sessions you can revoke from your profile.', 'Cookies HttpOnly et SameSite, protection CSRF sur chaque formulaire, et sessions révocables depuis votre profil.')],
      [t('Identity verification', "Vérification d'identité"), t('Every investor is verified before an investment becomes active or a withdrawal is paid.', 'Chaque investisseur est vérifié avant activation d’un investissement ou paiement d’un retrait.')],
      [t('Audit trail', "Piste d'audit"), t('Every reservation, payout and withdrawal decision is logged with who made it and when.', 'Chaque réservation, versement et retrait est journalisé avec son auteur et sa date.')],
    ].map(([h, p]) => html`<div class="feature reveal">${icon('shield', 22)}<h3>${h}</h3><p>${p}</p></div>`)}
  </div>
</div></section>
${parts.ctaBand(ctx)}`,
  });
}

function paymentsPage(ctx) {
  const t = ctx.t;
  return simple(ctx, {
    path: '/payments', eyebrow: t('Crypto & cash', 'Crypto & cash'),
    title: t('Invest with USDT, BTC, ETH, Mobile Money, card or bank transfer', 'Investir en USDT, BTC, ETH, Mobile Money, carte ou virement'),
    h1: t('Pay in crypto or cash', 'Payez en crypto ou en cash'),
    lead: t('You can fund any project with USDT, USDC, BTC or ETH, or with MTN Mobile Money, Orange Money, Visa/Mastercard or a bank transfer. Payouts and withdrawals go back to the method you choose.', 'Vous pouvez financer tout projet en USDT, USDC, BTC ou ETH, ou via MTN Mobile Money, Orange Money, Visa/Mastercard ou virement. Versements et retraits reviennent sur le moyen de votre choix.'),
    description: t('Fund African investments with USDT (TRC-20/ERC-20), USDC, BTC, ETH, MTN MoMo, Orange Money, card or SWIFT/SEPA. Withdraw within 3 business days.', 'Financez vos investissements en USDT, USDC, BTC, ETH, MTN MoMo, Orange Money, carte ou SWIFT/SEPA. Retraits sous 3 jours ouvrés.'),
    body: html`${parts.payments(ctx)}
<section class="section-tight"><div class="wrap">${parts.faqList(ctx, faq.filter((f) => /withdraw|payment|retrait|paiement/i.test(f.q.en)))}</div></section>
${parts.ctaBand(ctx)}`,
  });
}

function roadmap(ctx) {
  const t = ctx.t;
  const road = [
    ['Q1 2027', t('Launch', 'Lancement'), [t('Real estate: Douala, Abidjan, Dakar', 'Immobilier : Douala, Abidjan, Dakar'), t('Agriculture: cocoa, plantain, fish', 'Agriculture : cacao, plantain, poisson'), t('Weekly payouts, crypto & Mobile Money', 'Versements hebdo, crypto & Mobile Money')]],
    ['Q2 2027', t('Companies & energy', 'Entreprises & énergie'), [t('SME loans in 6 countries', 'Prêts PME dans 6 pays'), t('Solar mini-grids, fuel depots', 'Mini-réseaux solaires, dépôts de carburant'), t('Mobile app (Android & iOS)', 'Application mobile (Android & iOS)')]],
    ['Q3 2027', t('Mining & infrastructure', 'Mines & infrastructures'), [t('Gold, copper, lithium royalties', 'Redevances or, cuivre, lithium'), t('Ports, cold chain, telecom towers', 'Ports, chaîne du froid, pylônes'), t('Auto-invest across sectors', 'Investissement automatique multi-secteurs')]],
    ['Q4 2027', t('Tech, foreign & trading', 'Tech, étranger & revente'), [t('Tech start-up rounds', 'Levées de start-ups tech'), t('Dubai, Lisbon, Paris, Texas property', 'Immobilier Dubaï, Lisbonne, Paris, Texas'), t('Resale market: sell your stake early', 'Marché secondaire : revendez vos parts')]],
  ];
  return simple(ctx, {
    path: '/roadmap', eyebrow: t('Roadmap', 'Feuille de route'),
    title: t('Roadmap: every sector of Africa’s economy, one account', "Feuille de route : tous les secteurs de l'économie africaine"),
    h1: t('Every sector of Africa’s economy, one account', "Tous les secteurs de l'économie africaine, un seul compte"),
    lead: t('We open sectors in waves so each launches with checked projects and local partners on the ground.', 'Nous ouvrons les secteurs par vagues, pour que chacun démarre avec des projets vérifiés et des partenaires locaux.'),
    description: t('See what is coming to Invest n Returns in 2027: real estate and agriculture at launch, then SME loans, energy, mining, infrastructure, tech, foreign property and a resale market.', 'Ce qui arrive sur Invest n Returns en 2027 : immobilier et agriculture au lancement, puis PME, énergie, mines, infrastructures, tech, immobilier étranger et marché secondaire.'),
    body: html`<section class="section-tight"><div class="wrap"><div class="road">${road.map(([q, h, items], i) => html`<div class="reveal" style="--d:${i * 90}ms"><span class="num">${q}</span><h2 class="h3">${h}</h2><ul>${items.map((x) => html`<li>${x}</li>`)}</ul></div>`)}</div></div></section>${parts.ctaBand(ctx)}`,
  });
}

function about(ctx, { stats }) {
  const t = ctx.t;
  return simple(ctx, {
    path: '/about', eyebrow: t('About us', 'À propos'),
    title: t('About Invest n Returns — African real-asset investing from Douala', 'À propos d’Invest n Returns — investir dans les actifs réels africains'),
    h1: t('Built in Douala, for investors everywhere', 'Conçu à Douala, pour les investisseurs du monde entier'),
    lead: t('Invest n Returns connects savers in Africa and the diaspora with the real assets that power the continent: homes, farms, companies, mines, power plants and infrastructure. We believe African growth should pay Africans first.', "Invest n Returns relie les épargnants d'Afrique et de la diaspora aux actifs réels qui font tourner le continent : logements, fermes, entreprises, mines, centrales et infrastructures. Nous pensons que la croissance africaine doit d'abord profiter aux Africains."),
    description: t('Invest n Returns is a Douala-based investment platform giving investors in Africa and the diaspora access to vetted real assets with weekly income.', "Invest n Returns est une plateforme d'investissement basée à Douala qui donne accès à des actifs réels vérifiés avec revenus hebdomadaires."),
    body: html`
<section class="section-tight"><div class="wrap">
  <div class="kpis kpis-4">
    <div class="kpi reveal"><span>${t('Open projects', 'Projets ouverts')}</span><b data-count="${stats.assets}">0</b></div>
    <div class="kpi reveal"><span>${t('Countries', 'Pays')}</span><b data-count="${stats.countries}">0</b></div>
    <div class="kpi reveal"><span>${t('Asset classes', "Classes d'actifs")}</span><b data-count="8">0</b></div>
    <div class="kpi reveal"><span>${t('Committed', 'Engagés')}</span><b data-count="${stats.committedUsd}" data-prefix="$" data-compact>0</b></div>
  </div>
  <div class="two-col">
    <div class="prose-block">
      <h2>${t('Our mission', 'Notre mission')}</h2>
      <p class="prose">${t('Africa has the fastest-growing cities, the youngest population and a huge share of the world’s farmland and minerals. Yet most of the profit from these assets flows to foreign funds. Local savers, meanwhile, are stuck with low-yield bank accounts and currencies that lose value.', "L'Afrique a les villes à la croissance la plus rapide, la population la plus jeune et une grande part des terres agricoles et des minerais du monde. Pourtant, l'essentiel des profits part vers des fonds étrangers, tandis que les épargnants locaux restent coincés avec des comptes peu rémunérés et des monnaies qui perdent de la valeur.")}</p>
      <p class="prose">${t('We fix that by splitting quality assets into shares from 100 USD, checking them on the ground, and paying income weekly in the currency investors choose — including crypto and Mobile Money.', 'Nous changeons cela en divisant des actifs de qualité en parts dès 100 USD, en les vérifiant sur le terrain, et en versant les revenus chaque semaine dans la devise choisie — crypto et Mobile Money compris.')}</p>
    </div>
    <div class="prose-block">
      <h2>${t('What we stand for', 'Nos principes')}</h2>
      <ul class="ticks">
        <li>${icon('check', 16)} ${t('Real assets with real cash flow — never paying investors with other investors’ money.', 'Des actifs réels avec de vrais revenus — jamais payer un investisseur avec l’argent d’un autre.')}</li>
        <li>${icon('check', 16)} ${t('Plain-language risk: every project shows a 1–5 risk score.', 'Des risques expliqués simplement : chaque projet a une note de 1 à 5.')}</li>
        <li>${icon('check', 16)} ${t('Local teams on the ground in every market we open.', 'Des équipes locales sur le terrain dans chaque marché ouvert.')}</li>
        <li>${icon('check', 16)} ${t('Bilingual by default: English and French.', 'Bilingue par défaut : anglais et français.')}</li>
      </ul>
    </div>
  </div>
</div></section>
${parts.ctaBand(ctx)}`,
  });
}

function faqPage(ctx) {
  const t = ctx.t;
  const all = [...faq, ...categories.flatMap((c) => c.faq)];
  const title = t('Investor FAQ: returns, risks, payments and withdrawals', 'FAQ investisseurs : rendements, risques, paiements et retraits');
  const description = t('Answers to the most common questions about investing with Invest n Returns: minimum amount, where returns come from, payouts, crypto and Mobile Money, KYC, fees and risks.', 'Réponses aux questions fréquentes : montant minimum, origine des rendements, versements, crypto et Mobile Money, KYC, frais et risques.');
  return page(ctx, {
    seo: { title, description, path: '/faq', jsonld: [seo.webPage(ctx, { name: title, description, path: '/faq' }), crumbsLd(ctx, [{ name: 'FAQ', url: ctx.u('/faq') }]), seo.faqPage(ctx, all)] },
    body: html`${parts.pageHero(ctx, { eyebrow: 'FAQ', title: t('Questions investors ask first', "Les questions qu'on nous pose d'abord"), lead: t('Short, direct answers. Still unsure? Write to us and a person will reply within one business day.', 'Des réponses courtes et directes. Un doute ? Écrivez-nous, une personne vous répondra sous un jour ouvré.'), crumbs: [{ name: 'FAQ', url: ctx.u('/faq') }] })}
<section class="section-tight"><div class="wrap faq-wrap">
  <h2>${t('General', 'Général')}</h2>
  ${parts.faqList(ctx, faq)}
  ${categories.map((c) => html`<h2 class="faq-cat">${c.emoji} ${t.o(c.name)}</h2>${parts.faqList(ctx, c.faq)}`)}
  <p class="faq-more">${t('Did not find your answer?', 'Pas trouvé votre réponse ?')} <a class="link" href="${ctx.u('/contact')}">${t('Contact us', 'Contactez-nous')} ${icon('arrow', 14)}</a></p>
</div></section>`,
  });
}

function calculatorPage(ctx) {
  const t = ctx.t;
  return simple(ctx, {
    path: '/returns-calculator', eyebrow: t('Calculator', 'Simulateur'),
    title: t('Investment returns calculator: weekly income and total return', 'Simulateur de rendement : revenu hebdomadaire et rendement total'),
    h1: t('Returns calculator', 'Simulateur de rendement'),
    lead: t('Total target return grows with the term: 20% over 12 months, 30% over 24, 40% over 36, 50% over 48 and up to 60% over 60 months. Larger amounts add 1 to 4 points through lower fees.', 'Le rendement total cible augmente avec la durée : 20 % sur 12 mois, 30 % sur 24, 40 % sur 36, 50 % sur 48 et jusqu’à 60 % sur 60 mois. Les montants élevés ajoutent 1 à 4 points grâce à des frais réduits.'),
    description: t('Estimate your weekly income and total return on African real-asset investments by amount, currency and term. Free calculator with tier bonuses.', 'Estimez votre revenu hebdomadaire et votre rendement total selon le montant, la devise et la durée. Simulateur gratuit avec bonus de palier.'),
    body: html`${parts.calculator(ctx)}${parts.ctaBand(ctx)}`,
  });
}

function contact(ctx, { values = {}, error, sent }) {
  const t = ctx.t;
  return simple(ctx, {
    path: '/contact', eyebrow: 'Contact',
    title: t('Contact Invest n Returns', 'Contacter Invest n Returns'),
    h1: t('Talk to a person', 'Parlez à une personne'),
    lead: t('Questions about a project, payments or your account? Write to us. We reply in English or French within one business day.', 'Une question sur un projet, un paiement ou votre compte ? Écrivez-nous. Réponse en français ou en anglais sous un jour ouvré.'),
    description: t('Contact the Invest n Returns team in Douala by email or form. Answers within one business day, in English or French.', "Contactez l'équipe Invest n Returns à Douala. Réponse sous un jour ouvré, en français ou en anglais."),
    body: html`
<section class="section-tight"><div class="wrap two-col">
  <div class="form-shell reveal">
    ${sent ? html`<div class="result show"><b>${t('Message sent.', 'Message envoyé.')}</b> ${t('We will reply within one business day.', 'Nous répondrons sous un jour ouvré.')}</div>` : html`
    <form method="post" action="${ctx.u('/contact')}" class="form-grid" data-validate novalidate>
      ${csrfField(ctx)}
      <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
      ${error ? html`<p class="error show full" role="alert">${error}</p>` : ''}
      <div class="field"><label for="c-name">${t('Full name', 'Nom complet')}</label><input id="c-name" name="name" required maxlength="100" autocomplete="name" value="${values.name || ''}"></div>
      <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" required maxlength="160" autocomplete="email" value="${values.email || ''}"></div>
      <div class="field full"><label for="c-subject">${t('Subject', 'Objet')}</label><input id="c-subject" name="subject" maxlength="150" value="${values.subject || ''}"></div>
      <div class="field full"><label for="c-body">Message</label><textarea id="c-body" name="body" required maxlength="4000" rows="6">${values.body || ''}</textarea></div>
      <div class="form-actions"><button class="btn btn-gold" type="submit">${t('Send message', 'Envoyer')}</button></div>
    </form>`}
  </div>
  <div class="contact-card reveal">
    <h2>${t('Other ways to reach us', 'Autres moyens de nous joindre')}</h2>
    <dl class="facts">
      <dt>Email</dt><dd><a href="mailto:${ctx.brand.email}">${ctx.brand.email}</a></dd>
      <dt>${t('Office', 'Bureau')}</dt><dd>Douala, Cameroun</dd>
      <dt>${t('Hours', 'Horaires')}</dt><dd>${t('Mon–Fri, 8:00–18:00 WAT', 'Lun–Ven, 8h00–18h00 WAT')}</dd>
      <dt>${t('Languages', 'Langues')}</dt><dd>English · Français</dd>
    </dl>
    <a class="btn btn-ghost" href="${ctx.u('/faq')}">${t('Read the FAQ', 'Lire la FAQ')}</a>
  </div>
</div></section>`,
  });
}

function submitProject(ctx, { values = {}, error, sent }) {
  const t = ctx.t;
  const types = ['Real estate', 'Agriculture', 'Working company', 'Tech company', 'Mining', 'Energy', 'Infrastructure', 'Property abroad'];
  const typesFr = ['Immobilier', 'Agriculture', 'Entreprise', 'Entreprise tech', 'Mines', 'Énergie', 'Infrastructures', 'Immobilier à l’étranger'];
  return simple(ctx, {
    path: '/submit-project', eyebrow: t('For project owners', 'Porteurs de projet'),
    title: t('Get your project funded by investors across Africa and the diaspora', 'Faites financer votre projet par des investisseurs d’Afrique et de la diaspora'),
    h1: t('Get your project funded', 'Faites financer votre projet'),
    lead: t('We fund property, farms with a buyer, profitable SMEs, tech start-ups with revenue, licensed mines, energy and infrastructure. Tell us about your project; our team replies within 5 business days.', "Nous finançons immobilier, exploitations avec acheteur, PME rentables, start-ups avec chiffre d'affaires, mines agréées, énergie et infrastructures. Présentez votre projet ; notre équipe répond sous 5 jours ouvrés."),
    description: t('Raise capital for your real estate, farm, SME, mine, energy or infrastructure project from investors in Africa and the diaspora. Submit your project in 5 minutes.', 'Levez des fonds pour votre projet immobilier, agricole, PME, minier, énergie ou infrastructure. Soumettez votre projet en 5 minutes.'),
    crumb: t('Submit a project', 'Soumettre un projet'),
    body: html`
<section class="section-tight"><div class="wrap">
  <div class="form-shell reveal">
    ${sent ? html`<div class="result show"><b>${t('Project received.', 'Projet reçu.')}</b> ${t('Our team will review it and reply within 5 business days.', 'Notre équipe l’étudiera et vous répondra sous 5 jours ouvrés.')}</div>` : html`
    <form method="post" action="${ctx.u('/submit-project')}" class="form-grid" data-validate novalidate>
      ${csrfField(ctx)}
      <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
      ${error ? html`<p class="error show full" role="alert">${error}</p>` : ''}
      <div class="field"><label for="s-name">${t('Your name', 'Votre nom')}</label><input id="s-name" name="name" required maxlength="100" value="${values.name || (ctx.user ? ctx.user.name : '')}"></div>
      <div class="field"><label for="s-email">Email</label><input id="s-email" name="email" type="email" required maxlength="160" value="${values.email || (ctx.user ? ctx.user.email : '')}"></div>
      <div class="field"><label for="s-phone">${t('WhatsApp / phone', 'WhatsApp / téléphone')}</label><input id="s-phone" name="phone" type="tel" maxlength="40" value="${values.phone || ''}"></div>
      <div class="field"><label for="s-company">${t('Company / farm name', 'Société / exploitation')}</label><input id="s-company" name="company" maxlength="120" value="${values.company || ''}"></div>
      <div class="field"><label for="s-type">${t('Project type', 'Type de projet')}</label><select id="s-type" name="type" required><option value="">—</option>${types.map((ty, i) => html`<option value="${ty}" ${values.type === ty ? raw('selected') : ''}>${ctx.lang === 'fr' ? typesFr[i] : ty}</option>`)}</select></div>
      <div class="field"><label for="s-city">${t('City / region', 'Ville / région')}</label><input id="s-city" name="city" maxlength="100" value="${values.city || ''}"></div>
      <div class="field full"><label for="s-need">${t('Amount needed (with currency)', 'Montant recherché (avec devise)')}</label><input id="s-need" name="need" maxlength="60" placeholder="25 000 000 XAF" value="${values.need || ''}"></div>
      <div class="field full"><label for="s-desc">${t('Describe the project and how it makes money', 'Décrivez le projet et comment il génère des revenus')}</label><textarea id="s-desc" name="description" required maxlength="5000" rows="6">${values.description || ''}</textarea></div>
      <div class="form-actions"><button class="btn btn-gold" type="submit">${t('Submit my project', 'Soumettre mon projet')}</button></div>
    </form>`}
  </div>
</div></section>`,
  });
}

const LEGAL = {
  terms: {
    title: { en: 'Terms of use', fr: "Conditions d'utilisation" },
    sections: [
      [{ en: '1. Who we are', fr: '1. Qui sommes-nous' }, { en: 'Invest n Returns ("we") operates this website and the investment platform available through it, from Douala, Cameroon.', fr: 'Invest n Returns (« nous ») exploite ce site et la plateforme d’investissement accessible depuis celui-ci, depuis Douala, Cameroun.' }],
      [{ en: '2. Eligibility', fr: '2. Éligibilité' }, { en: 'You must be at least 18, have legal capacity, and complete identity verification. Access to some projects depends on your country of residence.', fr: 'Vous devez avoir au moins 18 ans, la capacité juridique, et compléter la vérification d’identité. L’accès à certains projets dépend de votre pays de résidence.' }],
      [{ en: '3. Reservations', fr: '3. Réservations' }, { en: 'A reservation holds a share of a project for 72 hours. It becomes a binding investment only when we confirm receipt of your funds and your identity is verified. Unpaid reservations expire automatically.', fr: 'Une réservation bloque une part de projet pendant 72 heures. Elle devient un investissement ferme uniquement après confirmation de la réception des fonds et vérification de votre identité. Les réservations non payées expirent automatiquement.' }],
      [{ en: '4. Payouts and withdrawals', fr: '4. Versements et retraits' }, { en: 'Income is credited to your balance weekly according to each project’s performance. Withdrawals are processed after verification, usually within 3 business days.', fr: 'Les revenus sont crédités chaque semaine selon la performance de chaque projet. Les retraits sont traités après vérification, généralement sous 3 jours ouvrés.' }],
      [{ en: '5. No guarantee', fr: '5. Absence de garantie' }, { en: 'Target returns are estimates. We do not guarantee returns or the return of capital.', fr: 'Les rendements cibles sont des estimations. Nous ne garantissons ni les rendements ni le remboursement du capital.' }],
      [{ en: '6. Account security', fr: '6. Sécurité du compte' }, { en: 'Keep your password confidential. Tell us immediately if you suspect unauthorised access.', fr: 'Gardez votre mot de passe confidentiel. Prévenez-nous immédiatement en cas de suspicion d’accès non autorisé.' }],
    ],
  },
  privacy: {
    title: { en: 'Privacy policy', fr: 'Politique de confidentialité' },
    sections: [
      [{ en: 'Data we collect', fr: 'Données collectées' }, { en: 'Account data (name, email, phone, country), identity verification data, investment and transaction history, and technical data needed to keep your session secure.', fr: 'Données de compte (nom, email, téléphone, pays), données de vérification d’identité, historique d’investissements et de transactions, et données techniques nécessaires à la sécurité de votre session.' }],
      [{ en: 'Why we use it', fr: 'Finalités' }, { en: 'To run your account, comply with anti-money-laundering law, process payments and payouts, and send you service messages.', fr: 'Gérer votre compte, respecter la réglementation anti-blanchiment, traiter paiements et versements, et vous envoyer des messages de service.' }],
      [{ en: 'Cookies', fr: 'Cookies' }, { en: 'We use only strictly necessary cookies: a session cookie, a security (CSRF) cookie, and your language and theme preferences. No advertising trackers.', fr: 'Nous utilisons uniquement des cookies strictement nécessaires : session, sécurité (CSRF), et préférences de langue et de thème. Aucun traceur publicitaire.' }],
      [{ en: 'Your rights', fr: 'Vos droits' }, { en: 'You can access, correct or request deletion of your data by writing to contact@investnreturns.com, subject to legal retention obligations.', fr: 'Vous pouvez accéder à vos données, les corriger ou demander leur suppression en écrivant à contact@investnreturns.com, sous réserve des obligations légales de conservation.' }],
    ],
  },
  risk: {
    title: { en: 'Risk disclosure', fr: 'Avertissement sur les risques' },
    sections: [
      [{ en: 'Loss of capital', fr: 'Perte en capital' }, { en: 'All investments carry risk. You may lose some or all of the money you invest.', fr: 'Tout investissement comporte des risques. Vous pouvez perdre tout ou partie des sommes investies.' }],
      [{ en: 'Illiquidity', fr: 'Illiquidité' }, { en: 'Your money is committed for the project term. There is no guarantee you can sell your share early.', fr: 'Votre argent est engagé pour la durée du projet. Rien ne garantit une revente anticipée de votre part.' }],
      [{ en: 'Sector risks', fr: 'Risques sectoriels' }, { en: 'Real estate: vacancy, delays, title disputes. Agriculture: weather, disease, prices. SMEs: default. Tech: failure of the start-up. Mining: geology, permits, commodity prices. Energy and infrastructure: construction, regulation, counterparty default.', fr: 'Immobilier : vacance, retards, litiges fonciers. Agriculture : météo, maladies, prix. PME : défaut. Tech : échec de la start-up. Mines : géologie, permis, cours des matières. Énergie et infrastructures : construction, réglementation, défaut des contreparties.' }],
      [{ en: 'Currency and crypto risk', fr: 'Risques de change et crypto' }, { en: 'Exchange rates and crypto prices move. Deposits are fixed at the conversion rate on the day you invest.', fr: 'Les taux de change et les cours des cryptos varient. Les dépôts sont figés au taux du jour de l’investissement.' }],
      [{ en: 'Diversification', fr: 'Diversification' }, { en: 'Only invest money you can afford to lock away, and spread it across several projects and sectors.', fr: 'N’investissez que l’argent que vous pouvez immobiliser, et répartissez-le entre plusieurs projets et secteurs.' }],
    ],
  },
};

function legal(ctx, key) {
  const d = LEGAL[key];
  const t = ctx.t;
  const path = `/legal/${key}`;
  return simple(ctx, {
    path, eyebrow: t('Legal', 'Mentions légales'), title: `${t.o(d.title)} — Invest n Returns`, h1: t.o(d.title), crumb: t.o(d.title),
    lead: t('Last updated: November 2026.', 'Dernière mise à jour : novembre 2026.'),
    description: `${t.o(d.title)}: ${t.o(d.sections[0][1])}`.slice(0, 160),
    body: html`<section class="section-tight"><div class="wrap legal-body">${d.sections.map(([h, p]) => html`<h2>${t.o(h)}</h2><p class="prose">${t.o(p)}</p>`)}</div></section>`,
  });
}

module.exports = { classIndex, classPage, howItWorks, security, paymentsPage, roadmap, about, faqPage, calculatorPage, contact, submitProject, legal, LEGAL };
