'use strict';
const { html, json } = require('../../html');
const seo = require('../../seo');
const { page } = require('../layout');
const { assetCard, icon } = require('../components');
const parts = require('./parts');
const faq = require('../../data/faq');
const categories = require('../../data/categories');

module.exports = function home(ctx, { featured, simAssets, stats, saved }) {
  const t = ctx.t;
  const title = t("Invest in Africa's top assets, get paid weekly", "Investir dans les meilleurs actifs d'Afrique, payé chaque semaine");
  const description = t(
    'Invest from 100 USD in vetted African real estate, farms, SME loans, mining royalties, solar energy, infrastructure and tech start-ups. Pay in USDT, BTC or Mobile Money. Weekly income, full reporting.',
    "Investissez dès 100 USD dans l'immobilier, l'agriculture, les PME, les mines, l'énergie solaire, les infrastructures et la tech en Afrique. Payez en USDT, BTC ou Mobile Money. Revenus hebdomadaires, reporting complet."
  );
  const homeFaq = faq.slice(0, 6);
  const sim = simAssets.map((a) => ({ en: `${a.title_en} · ${a.city.split(',').pop().trim()}`, fr: `${a.title_fr} · ${a.city.split(',').pop().trim()}`, r: a.target_rate, slug: a.slug }));

  const body = html`
<section class="hero">
  <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="grid-lines" aria-hidden="true"></div>
  <div class="wrap">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="eyebrow reveal">${t("Africa's top assets · one platform", "Les meilleurs actifs d'Afrique · une plateforme")}</p>
        <h1 class="reveal">${t('Get paid ', 'Soyez payé ')}<em class="shine">${t('every week', 'chaque semaine')}</em>${t(" from Africa's top assets.", " par les meilleurs actifs d'Afrique.")}</h1>
        <p class="lead reveal">${t('Property, farms, mining, energy, infrastructure, working companies and tech across Africa, plus hard-currency assets abroad. Invest in crypto or cash from 100 USD. Rent, harvest and interest income is credited to your balance every week, and you can watch it grow in real time.', "Immobilier, agriculture, mines, énergie, infrastructures, entreprises et tech à travers l'Afrique, plus des actifs en devises fortes. Investissez en crypto ou en cash dès 100 USD. Loyers, récoltes et intérêts sont crédités chaque semaine, et vous les voyez progresser en temps réel.")}</p>
        <div class="ctas reveal">
          <a class="btn btn-gold btn-lg magnetic" href="${ctx.user ? ctx.u('/assets') : ctx.u('/register')}">${ctx.user ? t('Reserve an asset', 'Réserver un actif') : t('Open my free account', 'Ouvrir mon compte gratuit')} ${icon('arrow', 18)}</a>
          <a class="btn btn-ghost btn-lg" href="${ctx.u('/assets')}">${t('Browse projects', 'Voir les projets')}</a>
        </div>
        <ul class="hero-proof reveal">
          <li>${icon('check', 16)} ${t('Identity-verified investors', 'Investisseurs vérifiés')}</li>
          <li>${icon('check', 16)} ${t('One SPV per project', 'Une SPV par projet')}</li>
          <li>${icon('check', 16)} ${t('Escrow until fully funded', "Séquestre jusqu'au financement")}</li>
        </ul>
      </div>
      <aside class="payout glass tilt reveal" aria-label="${t('Weekly payout simulator', 'Simulateur de versement hebdomadaire')}">
        <div class="po-head"><h2 class="mini-h">${t('Weekly payout · live', 'Versement hebdo · en direct')}</h2><span class="live"><i></i>LIVE</span></div>
        <div><label for="p-asset">${t('Asset', 'Actif')}</label><select id="p-asset"></select></div>
        <div><label for="p-amt">${t('Amount invested (USD)', 'Montant investi (USD)')}</label><input id="p-amt" inputmode="decimal" value="10000" autocomplete="off"></div>
        <div class="po-out">
          <div><span>${t('Paid to you every week', 'Versé chaque semaine')}</span><b class="big" id="p-week">$0</b></div>
          <div><span>${t('Target per year', 'Cible par an')}</span><b class="num" id="p-rate">0%</b></div>
        </div>
        <div class="tick"><span>${t('Earned since you opened this page', "Gagné depuis l'ouverture de cette page")}</span><b class="num" id="p-tick">$0.000000</b></div>
        <div class="chart-wrap"><svg id="p-chart" viewBox="0 0 520 150" role="img" aria-label="${t('Cumulative payouts over 52 weeks', 'Versements cumulés sur 52 semaines')}"></svg>
          <div class="chart-cap"><span>${t('Week 1', 'Sem. 1')}</span><span id="p-total"></span><span>${t('Week 52', 'Sem. 52')}</span></div></div>
        <a class="btn btn-gold btn-block" id="p-cta" href="${ctx.u('/assets')}">${t('Reserve this asset', 'Réserver cet actif')}</a>
        <script type="application/json" id="sim-data">${json({ lang: ctx.lang, assets: sim, base: ctx.u('/assets/') })}</script>
      </aside>
    </div>
    <div class="strip">
      <div class="reveal"><b class="num" data-count="${stats.assets}">0</b><span>${t('open projects across 8 asset classes', 'projets ouverts dans 8 classes d’actifs')}</span></div>
      <div class="reveal"><b class="num" data-count="${stats.committedUsd}" data-prefix="$" data-compact>0</b><span>${t('committed by investors', 'engagés par les investisseurs')}</span></div>
      <div class="reveal"><b class="num" data-count="${Math.round(stats.avgRate * 10) / 10}" data-suffix="%" data-dec="1">0</b><span>${t('average target return per year', 'rendement cible moyen par an')}</span></div>
      <div class="reveal"><b class="num" data-count="${stats.countries}">0</b><span>${t('countries · Africa and abroad', 'pays · Afrique et étranger')}</span></div>
    </div>
  </div>
</section>

${parts.marquee(ctx)}

<section class="answer-band">
  <div class="wrap answer-grid">
    <div class="reveal">
      <p class="eyebrow">${t('In one sentence', 'En une phrase')}</p>
      <h2>${t('What is Invest n Returns?', "Qu'est-ce qu'Invest n Returns ?")}</h2>
    </div>
    <p class="answer reveal">${t.o(faq[0].a)}</p>
  </div>
</section>

${parts.steps(ctx)}

<section id="projects" class="section-tight">
  <div class="wrap">
    <div class="head">
      <div><p class="eyebrow">${t('Open for reservation', 'Ouverts à la réservation')}</p><h2>${t('Featured projects', 'Projets à la une')}</h2></div>
      <a class="btn btn-ghost" href="${ctx.u('/assets')}">${t('See all projects', 'Tous les projets')} ${icon('arrow', 16)}</a>
    </div>
    <div class="projects">${featured.map((a) => assetCard(ctx, a, { saved: saved.has(a.id) }))}</div>
  </div>
</section>

<section id="assets">
  <div class="wrap">
    <div class="head">
      <div><p class="eyebrow">${t('What you can invest in', 'Dans quoi investir')}</p><h2>${t('Eight asset classes, every major sector in Africa', "Huit classes d'actifs, tous les grands secteurs d'Afrique")}</h2></div>
      <p>${t('Mix them: steady rent and interest, seasonal harvests, long-term growth in tech, and hard-currency income abroad.', 'Combinez-les : loyers et intérêts réguliers, récoltes saisonnières, croissance long terme dans la tech, et revenus en devises fortes.')}</p>
    </div>
    <div class="assets">${categories.map((c) => parts.classCard(ctx, c))}</div>
  </div>
</section>

${parts.calculator(ctx)}
${parts.payments(ctx)}
${parts.trust(ctx)}

<section id="faq" class="section-tight">
  <div class="wrap faq-wrap">
    <div class="head"><div><p class="eyebrow">FAQ</p><h2>${t('Questions investors ask first', "Les questions qu'on nous pose d'abord")}</h2></div>
      <a class="btn btn-ghost" href="${ctx.u('/faq')}">${t('All questions', 'Toutes les questions')} ${icon('arrow', 16)}</a></div>
    ${parts.faqList(ctx, homeFaq)}
  </div>
</section>

${parts.ctaBand(ctx)}`;

  return page(ctx, {
    seo: {
      title, description, path: '/',
      keywords: t('invest in Africa, African real estate investment, crypto investment Africa, USDT investment, Mobile Money investment, weekly passive income, Cameroon investment, Douala real estate, agriculture investment Africa, mining royalties, solar mini-grid investment', 'investir en Afrique, investissement immobilier Afrique, investir en crypto Afrique, investissement USDT, investir Mobile Money, revenu passif hebdomadaire, investir au Cameroun, immobilier Douala, investissement agricole, redevances minières'),
      jsonld: [seo.webPage(ctx, { name: title, description, path: '/' }), seo.faqPage(ctx, homeFaq), seo.itemList(ctx, featured, t('Featured projects', 'Projets à la une'))],
    },
    body,
    bodyClass: 'home',
  });
};
