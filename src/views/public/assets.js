'use strict';
const { html, raw, json } = require('../../html');
const seo = require('../../seo');
const { page } = require('../layout');
const { assetCard, icon, riskMeter, targetLabel, termLabel, cover, csrfField } = require('../components');
const parts = require('./parts');
const categories = require('../../data/categories');
const { countries, payoutFreq, payMethods } = require('../../data/catalog');
const config = require('../../config');

function list(ctx, { items, filters, saved, countryOptions }) {
  const t = ctx.t;
  const cat = categories.find((c) => c.code === filters.category);
  const title = cat ? t(`${cat.name.en} projects open for investment`, `Projets ${cat.name.fr.toLowerCase()} ouverts à l'investissement`) : t('Investment projects in Africa', "Projets d'investissement en Afrique");
  const description = t(
    `Browse ${items.length} vetted projects: real estate, agriculture, SME loans, mining, energy, infrastructure, tech and foreign property. Filter by sector, country and risk. Reserve from 100 USD.`,
    `Parcourez ${items.length} projets vérifiés : immobilier, agriculture, PME, mines, énergie, infrastructures, tech et immobilier étranger. Filtrez par secteur, pays et risque. Réservez dès 100 USD.`
  );
  const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');
  const body = html`
${parts.pageHero(ctx, {
    eyebrow: t('Marketplace', 'Place de marché'),
    title,
    lead: t('Every project below passed our five checks. Each shows the target return, term, payout frequency, risk level from 1 to 5 and how much is already reserved.', 'Chaque projet ci-dessous a passé nos cinq contrôles. Chacun affiche le rendement cible, la durée, la fréquence des versements, le risque de 1 à 5 et la part déjà réservée.'),
    crumbs: [{ name: t('Projects', 'Projets'), url: ctx.u('/assets') }],
  })}
<section class="section-tight">
  <div class="wrap">
    <form class="filter-bar" method="get" action="${ctx.u('/assets')}" data-live-filter role="search">
      <div class="fb-search">${icon('search', 18)}<label class="sr" for="f-q">${t('Search', 'Rechercher')}</label><input id="f-q" name="q" type="search" value="${filters.search || ''}" placeholder="${t('Search city, crop, sector…', 'Ville, culture, secteur…')}"></div>
      <label class="sr" for="f-cat">${t('Asset class', "Classe d'actifs")}</label>
      <select id="f-cat" name="category"><option value="">${t('All asset classes', 'Toutes les classes')}</option>${categories.map((c) => html`<option value="${c.code}" ${sel(filters.category, c.code)}>${t.o(c.name)}</option>`)}</select>
      <label class="sr" for="f-country">${t('Country', 'Pays')}</label>
      <select id="f-country" name="country"><option value="">${t('All countries', 'Tous les pays')}</option>${countryOptions.map((c) => html`<option value="${c}" ${sel(filters.country, c)}>${t.o(countries[c]) || c}</option>`)}</select>
      <label class="sr" for="f-risk">${t('Max risk', 'Risque max')}</label>
      <select id="f-risk" name="risk"><option value="">${t('Any risk', 'Tout risque')}</option>${[1, 2, 3, 4].map((r) => html`<option value="${r}" ${sel(filters.risk, r)}>${t('Risk ≤', 'Risque ≤')} ${r}/5</option>`)}</select>
      <label class="sr" for="f-sort">${t('Sort', 'Trier')}</label>
      <select id="f-sort" name="sort">
        <option value="">${t('Featured', 'À la une')}</option>
        <option value="return" ${sel(filters.sort, 'return')}>${t('Highest return', 'Meilleur rendement')}</option>
        <option value="risk" ${sel(filters.sort, 'risk')}>${t('Lowest risk', 'Risque le plus faible')}</option>
        <option value="funded" ${sel(filters.sort, 'funded')}>${t('Almost funded', 'Presque financés')}</option>
        <option value="term" ${sel(filters.sort, 'term')}>${t('Shortest term', 'Durée la plus courte')}</option>
        <option value="newest" ${sel(filters.sort, 'newest')}>${t('Newest', 'Plus récents')}</option>
      </select>
      <button class="btn btn-gold btn-sm" type="submit">${t('Apply', 'Appliquer')}</button>
    </form>
    <div class="filters chips-row" role="group" aria-label="${t('Quick filter', 'Filtre rapide')}">
      <a href="${ctx.u('/assets')}" aria-pressed="${!filters.category ? 'true' : 'false'}">${t('All', 'Tous')}</a>
      ${categories.map((c) => html`<a href="${ctx.u('/assets')}?category=${c.code}" aria-pressed="${filters.category === c.code ? 'true' : 'false'}">${c.emoji} ${t.o(c.name)}</a>`)}
    </div>
    <p class="result-count" aria-live="polite"><b data-result-count>${items.length}</b> ${t('projects', 'projets')}</p>
    ${items.length
      ? html`<div class="projects" data-grid>${items.map((a) => assetCard(ctx, a, { saved: saved.has(a.id) }))}</div>`
      : html`<div class="empty"><p>${t('No project matches these filters yet.', 'Aucun projet ne correspond encore à ces filtres.')}</p><a class="btn btn-ghost" href="${ctx.u('/assets')}">${t('Reset filters', 'Réinitialiser')}</a></div>`}
    <p class="empty" data-empty hidden>${t('No project matches your search.', 'Aucun projet ne correspond à votre recherche.')}</p>
    <p class="sample-note">${t('Projects shown are illustrative while the platform is in pre-launch. Live projects open to verified investors.', 'Les projets affichés sont illustratifs pendant la phase de pré-lancement. Les projets réels s’ouvrent aux investisseurs vérifiés.')}</p>
  </div>
</section>
${parts.ctaBand(ctx)}`;

  return page(ctx, {
    seo: {
      title, description, path: '/assets',
      jsonld: [
        seo.webPage(ctx, { name: title, description, path: '/assets', type: 'CollectionPage' }),
        seo.breadcrumbs(ctx, [{ name: t('Home', 'Accueil'), url: ctx.u('/') }, { name: t('Projects', 'Projets'), url: ctx.u('/assets') }]),
        seo.itemList(ctx, items, title),
      ],
    },
    body,
  });
}

function detail(ctx, { a, saved, related, myReservations }) {
  const t = ctx.t;
  const name = t(a.title_en, a.title_fr);
  const loc = `${a.city}, ${t.o(countries[a.country_code]) || a.country_code}`;
  const title = t(`${a.title_en} in ${a.city} — ${a.target_rate ? a.target_rate + '% target return' : a.target_multiple + '× target'}`, `${a.title_fr} à ${a.city} — ${a.target_rate ? 'rendement cible ' + a.target_rate + ' %' : 'cible ' + a.target_multiple + '×'}`);
  const description = t(
    `${a.title_en} (${loc}): ${a.cat.name.en.toLowerCase()} project with a ${a.target_rate ? a.target_rate + '% annual target' : a.target_multiple + '× target multiple'}, ${a.term_months}-month term, ${payoutFreq[a.payout_freq].en.toLowerCase()} payouts and risk ${a.risk}/5. Reserve from ${a.min_usd} USD.`,
    `${a.title_fr} (${loc}) : projet ${a.cat.name.fr.toLowerCase()} avec ${a.target_rate ? 'un rendement cible de ' + a.target_rate + ' % par an' : 'un multiple cible de ' + a.target_multiple + '×'}, durée ${a.term_months} mois, versements ${payoutFreq[a.payout_freq].fr.toLowerCase()} et risque ${a.risk}/5. Réservez dès ${a.min_usd} USD.`
  );
  const weekly = a.target_rate ? (1000 * a.target_rate) / 100 / 52 : 0;
  const facts = [
    { q: t(`What return does ${a.title_en} target?`, `Quel rendement vise ${a.title_fr} ?`), a: a.target_rate ? t(`${a.target_rate}% per year, net of fees, paid ${payoutFreq[a.payout_freq].en.toLowerCase()} and credited weekly. For 1 000 USD that is about ${weekly.toFixed(2)} USD a week. Not guaranteed.`, `${a.target_rate} % par an, net de frais, versé ${payoutFreq[a.payout_freq].fr.toLowerCase()} et crédité chaque semaine. Pour 1 000 USD, environ ${weekly.toFixed(2)} USD par semaine. Non garanti.`) : t(`A ${a.target_multiple}× multiple of capital at exit, typically after ${Math.round(a.term_months / 12)} years. High risk.`, `Un multiple de ${a.target_multiple}× le capital à la sortie, généralement après ${Math.round(a.term_months / 12)} ans. Risque élevé.`) },
    { q: t('What is the minimum investment?', "Quel est l'investissement minimum ?"), a: t(`${a.min_usd} USD, payable in USDT, USDC, BTC, ETH, Mobile Money, card or bank transfer.`, `${a.min_usd} USD, payables en USDT, USDC, BTC, ETH, Mobile Money, carte ou virement.`) },
    { q: t('How long is my money committed?', 'Combien de temps mon argent est-il engagé ?'), a: t(`${a.term_months} months. Early exit is not guaranteed.`, `${a.term_months} mois. Une sortie anticipée n'est pas garantie.`) },
  ];
  const canReserve = a.status === 'open' && a.remaining_cents >= a.min_usd * 100;
  const body = html`
<section class="asset-hero">
  ${cover(a, 'asset-cover')}
  <div class="wrap">
    ${parts.breadcrumbsNav(ctx, [{ name: t('Projects', 'Projets'), url: ctx.u('/assets') }, { name: t.o(a.cat.name), url: ctx.u('/invest/' + a.cat.slug) }, { name, url: ctx.u('/assets/' + a.slug) }])}
    <div class="asset-head">
      <div>
        <span class="chip ${a.category}">${a.cat.emoji} ${t.o(a.cat.name)}</span>
        <h1>${name}</h1>
        <p class="loc">${icon('pin', 16)} ${loc}${a.region ? ` · ${a.region}` : ''}</p>
      </div>
      ${ctx.user ? html`<button type="button" class="save-btn big${saved ? ' on' : ''}" data-save="${a.slug}" aria-pressed="${saved ? 'true' : 'false'}" aria-label="${t('Save to watchlist', 'Ajouter aux favoris')}">${icon('heart', 20)} <span>${saved ? t('Saved', 'Enregistré') : t('Save', 'Enregistrer')}</span></button>` : ''}
    </div>
  </div>
</section>
<section class="section-tight asset-body">
  <div class="wrap asset-grid">
    <div class="asset-main">
      <div class="kpis">
        <div class="kpi reveal"><span>${a.yield_based ? t('Target return / yr', 'Rendement cible / an') : t('Target multiple', 'Multiple cible')}</span><b class="hl">${targetLabel(ctx, a)}</b></div>
        <div class="kpi reveal"><span>${t('Term', 'Durée')}</span><b>${termLabel(ctx, a.term_months)}</b></div>
        <div class="kpi reveal"><span>${t('Payouts', 'Versements')}</span><b>${t.o(payoutFreq[a.payout_freq])}</b></div>
        <div class="kpi reveal"><span>${t('Risk', 'Risque')} ${a.risk}/5</span>${riskMeter(ctx, a.risk)}</div>
        <div class="kpi reveal"><span>${t('Minimum', 'Minimum')}</span><b>${ctx.f.usdWhole(a.min_usd)}</b></div>
        <div class="kpi reveal"><span>${t('Investors', 'Investisseurs')}</span><b>${a.investor_count}</b></div>
      </div>

      <h2>${t('Quick answer', 'Réponse rapide')}</h2>
      <p class="answer lead-sm">${t(a.summary_en, a.summary_fr)}</p>

      <h2>${t('About this project', 'À propos du projet')}</h2>
      ${String(t(a.description_en, a.description_fr)).split(/\n{2,}/).map((p) => html`<p class="prose">${p}</p>`)}

      ${a.highlights[ctx.lang] && a.highlights[ctx.lang].length ? html`<h2>${t('Checks completed', 'Contrôles effectués')}</h2>
      <ul class="ticks">${a.highlights[ctx.lang].map((h) => html`<li>${icon('check', 16)} ${h}</li>`)}</ul>` : ''}

      <h2>${t('Key facts', 'Chiffres clés')}</h2>
      <dl class="facts">
        <dt>${t('Funding goal', 'Objectif de financement')}</dt><dd class="num">${ctx.f.money(a.goal_local, a.currency)} <small>(≈ ${ctx.f.usdWhole(a.goal_usd)})</small></dd>
        <dt>${t('Return from', 'Rendement issu de')}</dt><dd>${t.o(a.cat.returnFrom)}</dd>
        <dt>${t('Structure', 'Structure')}</dt><dd>${t('Dedicated project company (SPV)', 'Société de projet dédiée (SPV)')}</dd>
        <dt>${t('Country', 'Pays')}</dt><dd>${t.o(countries[a.country_code])}</dd>
        <dt>${t('Status', 'Statut')}</dt><dd>${a.status === 'open' ? t('Open for reservation', 'Ouvert à la réservation') : a.status === 'funded' ? t('Fully funded', 'Entièrement financé') : t('Closed', 'Clôturé')}</dd>
      </dl>

      <h2>${t('Questions about this project', 'Questions sur ce projet')}</h2>
      ${parts.faqList(ctx, facts.map((f) => ({ q: { en: f.q, fr: f.q }, a: { en: f.a, fr: f.a } })))}

      ${parts.riskBox(ctx)}
    </div>

    <aside class="asset-side">
      <div class="reserve-card glass-light" id="reserve">
        <div class="rc-top">
          <div><span class="muted">${t('Reserved', 'Réservé')}</span><b class="num big-num" data-count="${a.pct}" data-suffix="%">${a.pct}%</b></div>
          <div class="ta-r"><span class="muted">${t('Still available', 'Encore disponible')}</span><b class="num">${ctx.f.usdWhole(a.remaining_cents / 100)}</b></div>
        </div>
        <div class="bar lg" role="progressbar" aria-valuenow="${a.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${t('Reserved', 'Réservé')}"><i style="--w:${a.pct}%"></i></div>
        ${myReservations.length ? html`<p class="mine">${icon('check', 16)} ${t('You hold', 'Vous détenez')} <b>${ctx.f.usd(myReservations.reduce((s, r) => s + r.amount_cents, 0), 0)}</b> ${t('in this project', 'dans ce projet')} · <a href="/dashboard/reservations">${t('view', 'voir')}</a></p>` : ''}
        ${canReserve
          ? ctx.user
            ? html`<form method="post" action="/dashboard/reserve/${a.slug}" class="reserve-form" data-reserve data-rate="${a.target_rate || 0}" data-min="${a.min_usd}" data-max="${Math.floor(a.remaining_cents / 100)}" data-lang="${ctx.lang}">
                ${csrfField(ctx)}
                <label for="r-amt">${t('Amount (USD)', 'Montant (USD)')}</label>
                <div class="amt-input"><span>$</span><input id="r-amt" name="amount" inputmode="decimal" required value="${Math.max(a.min_usd, 1000)}" autocomplete="off"></div>
                <div class="quick-amts">${[a.min_usd, 1000, 5000, 10000].filter((v, i, arr) => arr.indexOf(v) === i && v * 100 <= a.remaining_cents).map((v) => html`<button type="button" data-amt="${v}">${ctx.f.usdWhole(v)}</button>`)}</div>
                <label for="r-method">${t('Payment method', 'Moyen de paiement')}</label>
                <select id="r-method" name="method" required>${Object.entries(payMethods).map(([k, m]) => html`<option value="${k}">${m.label}</option>`)}</select>
                ${a.yield_based ? html`<div class="r-out"><div><span>${t('Weekly income', 'Revenu hebdo')}</span><b id="r-week">—</b></div><div><span>${t('Per year', 'Par an')}</span><b id="r-year">—</b></div></div>` : ''}
                <label class="consent"><input type="checkbox" name="consent" value="1" required> <span>${t('I understand returns are not guaranteed and I may lose capital.', 'Je comprends que les rendements ne sont pas garantis et que je peux perdre du capital.')}</span></label>
                <button class="btn btn-gold btn-block btn-lg" type="submit">${t('Reserve my share', 'Réserver ma part')}</button>
                <p class="fine-sm">${t(`Your share is held for ${config.reservationHoldHours} hours while you pay. No fee to reserve.`, `Votre part est bloquée ${config.reservationHoldHours} heures le temps de payer. Aucun frais de réservation.`)}</p>
              </form>`
            : html`<div class="reserve-guest">
                <p>${t('Create a free account to reserve your share. It takes two minutes.', 'Créez un compte gratuit pour réserver votre part. Deux minutes suffisent.')}</p>
                <a class="btn btn-gold btn-block btn-lg" href="${ctx.u('/register')}?next=${encodeURIComponent(ctx.u('/assets/' + a.slug))}">${t('Open account & reserve', 'Ouvrir un compte et réserver')}</a>
                <a class="btn btn-ghost btn-block" href="${ctx.u('/login')}?next=${encodeURIComponent(ctx.u('/assets/' + a.slug))}">${t('I already have an account', "J'ai déjà un compte")}</a>
              </div>`
          : html`<p class="closed-note">${t('This project is no longer open for new reservations.', "Ce projet n'est plus ouvert aux nouvelles réservations.")}</p><a class="btn btn-ghost btn-block" href="${ctx.u('/assets')}">${t('See open projects', 'Voir les projets ouverts')}</a>`}
      </div>
    </aside>
  </div>
</section>

${related.length ? html`<section class="section-tight"><div class="wrap">
  <div class="head"><div><p class="eyebrow">${t('Similar projects', 'Projets similaires')}</p><h2>${t('You may also like', 'Vous aimerez aussi')}</h2></div></div>
  <div class="projects">${related.map((r) => assetCard(ctx, r))}</div>
</div></section>` : ''}`;

  return page(ctx, {
    seo: {
      title, description, path: `/assets/${a.slug}`, type: 'product',
      jsonld: [
        seo.webPage(ctx, { name, description, path: `/assets/${a.slug}`, type: 'ItemPage', dateModified: a.updated_at }),
        seo.investment(ctx, a),
        seo.breadcrumbs(ctx, [{ name: t('Home', 'Accueil'), url: ctx.u('/') }, { name: t('Projects', 'Projets'), url: ctx.u('/assets') }, { name: t.o(a.cat.name), url: ctx.u('/invest/' + a.cat.slug) }, { name, url: ctx.u('/assets/' + a.slug) }]),
        seo.faqPage(ctx, facts.map((f) => ({ q: { en: f.q, fr: f.q }, a: { en: f.a, fr: f.a } }))),
      ],
    },
    body,
  });
}

module.exports = { list, detail };
