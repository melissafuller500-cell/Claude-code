'use strict';
const { html, raw, json } = require('../../html');
const seo = require('../../seo');
const { page } = require('../layout');
const { assetCard, icon, riskMeter, targetLabel, termLabel, cover, photoImg, csrfField } = require('../components');
const parts = require('./parts');
const categories = require('../../data/categories');
const { countries, payoutFreq, payMethods, payoutSchedules, countrySlug } = require('../../data/catalog');
const config = require('../../config');
const { SECTORS, PROTECTIONS, timeline } = require('../../data/projectDetails');
const faq = require('../../data/faq');

function list(ctx, { items, filters, saved, countryOptions }) {
  const t = ctx.t;
  const qa = [faq[2], faq[3], faq[4], faq[5]];
  const cat = categories.find((c) => c.code === filters.category);
  const title = cat ? t(`${cat.name.en} projects open for investment`, `Projets ${cat.name.fr.toLowerCase()} ouverts à l'investissement`) : t('Investment projects in Africa', "Projets d'investissement en Afrique");
  const description = t(
    `Browse ${items.length} vetted projects: real estate, agriculture, SME loans, mining, energy, infrastructure, tech and foreign property. Filter by sector, country and risk. Reserve from 500 USD.`,
    `Parcourez ${items.length} projets vérifiés : immobilier, agriculture, PME, mines, énergie, infrastructures, tech et immobilier étranger. Filtrez par secteur, pays et risque. Réservez dès 500 USD.`
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
<section class="section-tight"><div class="wrap faq-wrap"><h2>${t('Before you invest', 'Avant d’investir')}</h2>${parts.faqList(ctx, qa)}</div></section>
${parts.ctaBand(ctx)}`;

  return page(ctx, {
    seo: {
      title, description, path: '/assets',
      jsonld: [
        seo.webPage(ctx, { name: title, description, path: '/assets', type: 'CollectionPage' }),
        seo.breadcrumbs(ctx, [{ name: t('Home', 'Accueil'), url: ctx.u('/') }, { name: t('Projects', 'Projets'), url: ctx.u('/assets') }]),
        seo.itemList(ctx, items, title),
        seo.faqPage(ctx, qa),
      ],
    },
    body,
  });
}

function detail(ctx, { a, saved, related, myReservations }) {
  const t = ctx.t;
  const name = t(a.title_en, a.title_fr);
  const loc = `${a.city}, ${t.o(countries[a.country_code]) || a.country_code}`;
  const target = (fr) => (a.target_rate ? (fr ? `${a.target_rate} %/an visés` : `${a.target_rate}%/yr target`) : `${a.target_multiple}× ${fr ? 'visé' : 'target'}`);
  const title = t(`${a.title_en}, ${a.city} — ${target(false)}`, `${a.title_fr}, ${a.city} — ${target(true)}`);
  // Keep under 160 characters: the most useful facts first.
  const description = t(
    `Invest in ${a.title_en} (${loc}): ${target(false)}, ${a.term_months} months, risk ${a.risk}/5. From ${a.min_usd} USD in USDT or Mobile Money.`,
    `Investissez dans ${a.title_fr} (${loc}) : ${target(true)}, ${a.term_months} mois, risque ${a.risk}/5. Dès ${a.min_usd} USD en USDT ou Mobile Money.`
  );
  const weekly = a.target_rate ? (1000 * a.target_rate) / 100 / 52 : 0;
  const facts = [
    { q: t(`What return does ${a.title_en} target?`, `Quel rendement vise ${a.title_fr} ?`), a: a.target_rate ? t(`${a.target_rate}% per year, net of fees. You choose to be paid every week, month, 3 months, 6 months or year. For 1 000 USD that is about ${(1000 * a.target_rate / 100 / 12).toFixed(2)} USD a month. Not guaranteed.`, `${a.target_rate} % par an, net de frais. Vous choisissez d’être payé chaque semaine, mois, trimestre, semestre ou année. Pour 1 000 USD, environ ${(1000 * a.target_rate / 100 / 12).toFixed(2)} USD par mois. Non garanti.`) : t(`A ${a.target_multiple}× multiple of capital at exit, typically after ${Math.round(a.term_months / 12)} years. High risk.`, `Un multiple de ${a.target_multiple}× le capital à la sortie, généralement après ${Math.round(a.term_months / 12)} ans. Risque élevé.`) },
    { q: t('What is the minimum investment?', "Quel est l'investissement minimum ?"), a: t(`${a.min_usd} USD, payable in USDT, USDC, BTC, ETH, Mobile Money, card or bank transfer.`, `${a.min_usd} USD, payables en USDT, USDC, BTC, ETH, Mobile Money, carte ou virement.`) },
    { q: t('How long is my money committed?', 'Combien de temps mon argent est-il engagé ?'), a: t(`${a.term_months} months. Early exit is not guaranteed.`, `${a.term_months} mois. Une sortie anticipée n'est pas garantie.`) },
  ];
  const D = SECTORS[a.category] || SECTORS.re;
  const tl = timeline(a.category, a.term_months);
  const AMOUNTS = [1000, 5000, 10000];
  const sections = [
    ['summary', t('In short', 'En bref')], ...(a.photos.length ? [['photos', t('Photos', 'Photos')]] : []), ['about', t('About', 'À propos')],
    ...(t(a.why_en, a.why_fr) ? [['location', t('Location', 'Localisation')]] : []), ['revenue', t('Revenue model', 'Modèle de revenus')],
    ['funds', t('Use of funds', 'Utilisation des fonds')], ['timeline', t('Timeline', 'Calendrier')], ['payouts', t('Payouts', 'Versements')],
    ['scenarios', t('Scenarios', 'Scénarios')], ['facts', t('Key facts', 'Chiffres clés')], ...(a.highlights[ctx.lang] && a.highlights[ctx.lang].length ? [['checks', t('Checks', 'Contrôles')]] : []),
    ['risks', t('Risks', 'Risques')], ['protection', t('Protection', 'Protection')], ['exit', t('Exit', 'Sortie')], ['documents', t('Documents', 'Documents')], ['faq', 'FAQ'],
  ];
  const canReserve = a.status === 'open' && a.remaining_cents >= a.min_usd * 100;
  const body = html`
<section class="asset-hero${a.photos.length ? ' with-photo' : ''}">
  ${a.photos.length ? html`<div class="asset-cover has-photo">${photoImg(a.photos[0], `${name} — ${loc}`, { eager: true, sizes: '100vw' })}</div>` : cover(a, 'asset-cover')}
  <div class="wrap">
    ${parts.breadcrumbsNav(ctx, [{ name: t('Projects', 'Projets'), url: ctx.u('/assets') }, { name: t.o(a.cat.name), url: ctx.u('/invest/' + a.cat.slug) }, { name, url: ctx.u('/assets/' + a.slug) }])}
    <div class="asset-head">
      <div>
        <span class="chip ${a.category}">${a.cat.emoji} ${t.o(a.cat.name)}</span>
        <h1>${name}</h1>
        <p class="loc">${icon('pin', 16)} ${loc}${a.region ? ` · ${a.region}` : ''}</p>
        <p class="answer hero-answer">${a.yield_based
          ? t(`In short: ${a.target_rate}% a year target over ${a.term_months} months, from ${a.min_usd} USD, risk ${a.risk}/5. You choose to be paid weekly, monthly, quarterly, half-yearly or yearly.`, `En bref : ${a.target_rate} % par an visés sur ${a.term_months} mois, dès ${a.min_usd} USD, risque ${a.risk}/5. Versements au choix : hebdomadaires, mensuels, trimestriels, semestriels ou annuels.`)
          : t(`In short: ${a.target_multiple}× target on capital at exit (about ${Math.round(a.term_months / 12)} years), from ${a.min_usd} USD, risk ${a.risk}/5 — high risk.`, `En bref : ${a.target_multiple}× le capital visé à la sortie (environ ${Math.round(a.term_months / 12)} ans), dès ${a.min_usd} USD, risque ${a.risk}/5 — risque élevé.`)}</p>
      </div>
      ${ctx.user ? html`<button type="button" class="save-btn big${saved ? ' on' : ''}" data-save="${a.slug}" aria-pressed="${saved ? 'true' : 'false'}" aria-label="${t('Save to watchlist', 'Ajouter aux favoris')}">${icon('heart', 20)} <span>${saved ? t('Saved', 'Enregistré') : t('Save', 'Enregistrer')}</span></button>` : ''}
    </div>
  </div>
</section>
<section class="section-tight asset-body">
  <div class="wrap asset-grid">
    <div class="asset-main">
      <nav class="toc" aria-label="${t('On this page', 'Sur cette page')}"><b>${t('On this page', 'Sur cette page')}</b>
        ${sections.map(([id, label], k) => html`<a href="#${id}"><span class="num">${String(k + 1).padStart(2, '0')}</span> ${label}</a>`)}
      </nav>

      <section id="summary" class="dsec">
        <h2><span class="num">01</span> ${t('In short', 'En bref')}</h2>
        <p class="answer lead-sm">${t(a.summary_en, a.summary_fr)}</p>
        <div class="kpis">
          <div class="kpi"><span>${a.yield_based ? t('Target return / yr', 'Rendement cible / an') : t('Target multiple', 'Multiple cible')}</span><b class="hl">${targetLabel(ctx, a)}</b></div>
          <div class="kpi"><span>${t('Term', 'Durée')}</span><b>${termLabel(ctx, a.term_months)}</b></div>
          <div class="kpi"><span>${t('Payouts', 'Versements')}</span><b>${a.yield_based ? t('Your choice: weekly → yearly', 'Au choix : hebdo → annuel') : t('At exit', 'À la sortie')}</b></div>
          <div class="kpi"><span>${t('Risk', 'Risque')} ${a.risk}/5</span>${riskMeter(ctx, a.risk)}</div>
          <div class="kpi"><span>${t('Minimum', 'Minimum')}</span><b>${ctx.f.usdWhole(a.min_usd)}</b></div>
          <div class="kpi"><span>${t('Investors', 'Investisseurs')}</span><b>${a.investor_count}</b></div>
        </div>
      </section>

      ${a.photos.length ? html`<section id="photos" class="dsec"><h2><span class="num">02</span> ${t('Photos', 'Photos')}</h2>
        <div class="gallery" data-gallery>${a.photos.map((ph, k) => html`<a href="${ph.src}" class="g-item${k === 0 ? ' g-main' : ''}" data-lightbox aria-label="${t('Open photo', 'Ouvrir la photo')} ${k + 1}">${photoImg(ph, `${name} — ${t('photo', 'photo')} ${k + 1}`, { sizes: k === 0 ? '(max-width: 960px) 100vw, 60vw' : '200px' })}</a>`)}</div>
        <p class="fine-sm">${t('Photos illustrate the type of asset financed and may not show the exact site.', 'Les photos illustrent le type d’actif financé et peuvent ne pas montrer le site exact.')}</p></section>` : ''}

      <section id="about" class="dsec"><h2><span class="num">03</span> ${t('About this project', 'À propos du projet')}</h2>
        ${String(t(a.description_en, a.description_fr)).split(/\n{2,}/).map((x) => html`<p class="prose">${x}</p>`)}</section>

      ${t(a.why_en, a.why_fr) ? html`<section id="location" class="dsec"><h2><span class="num">04</span> ${t(`Why ${a.city.split(',').pop().trim()}?`, `Pourquoi ${a.city.split(',').pop().trim()} ?`)}</h2>
        <p class="prose">${t(a.why_en, a.why_fr)}</p>
        <p class="loc">${icon('pin', 16)} ${loc}${a.region ? ` · ${a.region}` : ''}</p></section>` : ''}

      <section id="revenue" class="dsec"><h2><span class="num">05</span> ${t('How it makes money', 'Comment il génère des revenus')}</h2>
        <p class="prose">${t.o(D.revenue)}</p></section>

      <section id="funds" class="dsec"><h2><span class="num">06</span> ${t('Indicative use of funds', 'Utilisation indicative des fonds')}</h2>
        <div class="table-scroll"><table class="compare">
          <thead><tr><th scope="col">${t('Item', 'Poste')}</th><th scope="col">%</th><th scope="col">${a.currency === 'USD' ? 'USD' : ctx.f.money(0, a.currency).replace(/^0 /, '')}</th><th scope="col">≈ USD</th></tr></thead>
          <tbody>${D.funds.map(([label, pc]) => html`<tr><th scope="row">${t.o(label)}</th><td class="num">${pc}%</td><td class="num">${ctx.f.money(a.goal_local * pc / 100, a.currency)}</td><td class="num">${ctx.f.usdWhole(a.goal_usd * pc / 100)}</td></tr>`)}
          <tr class="total"><th scope="row">${t('Funding goal', 'Objectif de financement')}</th><td class="num">100%</td><td class="num">${ctx.f.money(a.goal_local, a.currency)}</td><td class="num">${ctx.f.usdWhole(a.goal_usd)}</td></tr></tbody>
        </table></div>
        <p class="fine-sm">${t('Indicative split for this type of project; the final budget is shared with verified investors in the project file.', 'Répartition indicative pour ce type de projet ; le budget final est communiqué aux investisseurs vérifiés dans le dossier du projet.')}</p></section>

      <section id="timeline" class="dsec"><h2><span class="num">07</span> ${t('Timeline', 'Calendrier')}</h2>
        <ol class="timeline">${tl.map((m) => html`<li><b>${m.month === 0 ? t('Start', 'Démarrage') : t(`Month ${m.month}`, `Mois ${m.month}`)}</b><span>${t.o(m.label)}</span></li>`)}</ol></section>

      <section id="payouts" class="dsec"><h2><span class="num">08</span> ${a.yield_based ? t('What you receive, by payout schedule', 'Ce que vous recevez, selon la fréquence') : t('How returns are paid', 'Comment le rendement est versé')}</h2>
        ${a.yield_based ? html`<p class="prose">${t(`At the ${a.target_rate}% annual target, each payout is the amount invested × ${a.target_rate}% ÷ the number of payouts per year. You choose the schedule when you reserve, and can change it later with our team.`, `Avec un objectif de ${a.target_rate} % par an, chaque versement vaut le montant investi × ${a.target_rate} % ÷ le nombre de versements par an. Vous choisissez la fréquence à la réservation et pouvez la modifier ensuite avec notre équipe.`)}</p>
        <div class="table-scroll"><table class="compare">
          <thead><tr><th scope="col">${t('Schedule', 'Fréquence')}</th>${AMOUNTS.map((u) => html`<th scope="col">${ctx.f.usdWhole(u)}</th>`)}<th scope="col">1 000 000 FCFA</th></tr></thead>
          <tbody>${Object.entries(payoutSchedules).map(([k, sc]) => html`<tr><th scope="row">${t.o(sc)}</th>${AMOUNTS.map((u) => html`<td class="num">${ctx.f.usd(Math.round(u * 100 * a.target_rate / 100 / sc.perYear))}</td>`)}<td class="num">${ctx.f.int(1e6 * a.target_rate / 100 / sc.perYear)} FCFA</td></tr>`)}</tbody>
        </table></div>` : html`<p class="prose">${t.o(D.exit)}</p>`}</section>

      <section id="scenarios" class="dsec"><h2><span class="num">09</span> ${t('Total target over the term', 'Total visé sur la durée')}</h2>
        <div class="table-scroll"><table class="compare">
          <thead><tr><th scope="col">${t('Invested', 'Investi')}</th><th scope="col">${t('Target income over', 'Revenu visé sur')} ${termLabel(ctx, a.term_months)}</th><th scope="col">${t('If returns are 50% lower', 'Si le rendement est 50 % plus bas')}</th></tr></thead>
          <tbody>${AMOUNTS.map((u) => { const base = a.yield_based ? u * a.target_rate / 100 * a.term_months / 12 : u * (a.target_multiple - 1); return html`<tr><th scope="row" class="num">${ctx.f.usdWhole(u)}</th><td class="num pos">+${ctx.f.usdWhole(base)}</td><td class="num">+${ctx.f.usdWhole(base / 2)}</td></tr>`; })}</tbody>
        </table></div>
        <p class="fine-sm">${t('Simple, illustrative calculation before currency effects. Targets are not guaranteed: you can also lose part or all of your capital.', 'Calcul simple et illustratif, hors effets de change. Les objectifs ne sont pas garantis : vous pouvez aussi perdre tout ou partie du capital.')}</p></section>

      <section id="facts" class="dsec"><h2><span class="num">10</span> ${t('Key facts', 'Chiffres clés')}</h2>
        <dl class="facts">
          <dt>${t('Funding goal', 'Objectif de financement')}</dt><dd class="num">${ctx.f.money(a.goal_local, a.currency)} <small>(≈ ${ctx.f.usdWhole(a.goal_usd)})</small></dd>
          <dt>${t('Reserved so far', 'Déjà réservé')}</dt><dd class="num">${a.pct}%</dd>
          <dt>${t('Asset class', 'Classe d’actifs')}</dt><dd><a href="${ctx.u('/invest/' + a.cat.slug)}">${t.o(a.cat.name)}</a></dd>
          <dt>${t('Return from', 'Rendement issu de')}</dt><dd>${t.o(a.cat.returnFrom)}</dd>
          <dt>${t('Location', 'Localisation')}</dt><dd>${a.city}${a.region ? ` · ${a.region}` : ''}, <a href="${ctx.u('/countries/' + countrySlug(a.country_code))}">${t.o(countries[a.country_code])}</a></dd>
          <dt>${t('Currency of the project', 'Devise du projet')}</dt><dd>${a.currency === 'XAF' || a.currency === 'XOF' ? 'FCFA (' + a.currency + ')' : a.currency}</dd>
          <dt>${t('Structure', 'Structure')}</dt><dd>${t('Dedicated project company (SPV)', 'Société de projet dédiée (SPV)')}</dd>
          <dt>${t('Status', 'Statut')}</dt><dd>${a.status === 'open' ? t('Open for reservation', 'Ouvert à la réservation') : a.status === 'funded' ? t('Fully funded', 'Entièrement financé') : t('Closed', 'Clôturé')}</dd>
          <dt>${t('Last updated', 'Mise à jour')}</dt><dd>${ctx.f.date(a.updated_at)}</dd>
        </dl></section>

      ${a.highlights[ctx.lang] && a.highlights[ctx.lang].length ? html`<section id="checks" class="dsec"><h2><span class="num">11</span> ${t('Checks completed', 'Contrôles effectués')}</h2>
        <ul class="ticks">${a.highlights[ctx.lang].map((h) => html`<li>${icon('check', 16)} ${h}</li>`)}</ul></section>` : ''}

      <section id="risks" class="dsec"><h2><span class="num">12</span> ${t('Main risks and how they are managed', 'Principaux risques et leur gestion')}</h2>
        <div class="table-scroll"><table class="compare risks-table">
          <thead><tr><th scope="col">${t('Risk', 'Risque')}</th><th scope="col">${t('How it is managed', 'Comment il est géré')}</th></tr></thead>
          <tbody>${D.risks.map(([r, m]) => html`<tr><td>${t.o(r)}</td><td>${t.o(m)}</td></tr>`)}</tbody>
        </table></div></section>

      <section id="protection" class="dsec"><h2><span class="num">13</span> ${t('How your money is protected', 'Comment votre argent est protégé')}</h2>
        <ul class="ticks">${PROTECTIONS.map((x) => html`<li>${icon('shield', 16)} ${t.o(x)}</li>`)}</ul></section>

      <section id="exit" class="dsec"><h2><span class="num">14</span> ${t('Exit and return of capital', 'Sortie et remboursement du capital')}</h2>
        <p class="prose">${t.o(D.exit)}</p></section>

      <section id="documents" class="dsec"><h2><span class="num">15</span> ${t('Documents in the project file', 'Documents du dossier')}</h2>
        <ul class="ticks">${D.docs.map((d) => html`<li>${icon('log', 16)} ${t.o(d)}</li>`)}</ul>
        <p class="fine-sm">${t('Available to identity-verified investors on request from our team.', 'Disponibles sur demande auprès de notre équipe pour les investisseurs vérifiés.')}</p></section>

      <section id="faq" class="dsec"><h2><span class="num">16</span> ${t('Questions about this project', 'Questions sur ce projet')}</h2>
        ${parts.faqList(ctx, facts.map((f) => ({ q: { en: f.q, fr: f.q }, a: { en: f.a, fr: f.a } })))}</section>

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
                <div class="quick-amts">${[a.min_usd, 1000, 2500, 5000, 10000].filter((v, i, arr) => arr.indexOf(v) === i && v * 100 <= a.remaining_cents).map((v) => html`<button type="button" data-amt="${v}">${ctx.f.usdWhole(v)}</button>`)}</div>
                ${a.yield_based ? html`<span class="lbl" id="r-freq-lbl">${t('How often do you want to be paid?', 'À quelle fréquence voulez-vous être payé ?')}</span>
                <div class="freq-pills" role="radiogroup" aria-labelledby="r-freq-lbl">
                  ${Object.entries(payoutSchedules).map(([k, sc]) => html`<label class="pill"><input type="radio" name="payout_freq" value="${k}" data-per-year="${sc.perYear}" ${k === 'monthly' ? raw('checked') : ''}><span>${t.o(sc)}</span></label>`)}
                </div>` : ''}
                <label for="r-method">${t('Payment method', 'Moyen de paiement')}</label>
                <select id="r-method" name="method" required>${Object.entries(payMethods).map(([k, m]) => k === 'balance'
                  ? (ctx.user.balance_cents > 0 ? html`<option value="balance">${t('Account balance', 'Solde du compte')} (${ctx.f.usd(ctx.user.balance_cents)}) — ${t('instant', 'instantané')}</option>` : '')
                  : html`<option value="${k}">${m.label}</option>`)}</select>
                ${a.yield_based ? html`<div class="r-out"><div><span>${t('Each payout', 'Chaque versement')}</span><b id="r-week">—</b></div><div><span>${t('Per year', 'Par an')}</span><b id="r-year">—</b></div></div>` : ''}
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
      image: a.photos[0] ? config.siteUrl + (a.photos[0].og || a.photos[0].src) : undefined,
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
