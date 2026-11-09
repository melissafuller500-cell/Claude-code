'use strict';
// Reusable public-page sections.
const { html, raw } = require('../../html');
const { icon } = require('../components');
const { countries } = require('../../data/catalog');

function pageHero(ctx, { eyebrow, title, lead, crumbs = [], children = '' }) {
  return html`
<section class="page-hero">
  <div class="aurora soft" aria-hidden="true"><i></i><i></i></div>
  <div class="wrap">
    ${crumbs.length ? breadcrumbsNav(ctx, crumbs) : ''}
    ${eyebrow ? html`<p class="eyebrow reveal">${eyebrow}</p>` : ''}
    <h1 class="reveal">${title}</h1>
    ${lead ? html`<p class="lead answer reveal">${lead}</p>` : ''}
    ${children}
  </div>
</section>`;
}

function breadcrumbsNav(ctx, crumbs) {
  const all = [{ name: ctx.t('Home', 'Accueil'), url: ctx.u('/') }, ...crumbs];
  return html`<nav class="crumbs" aria-label="${ctx.t('Breadcrumb', "Fil d'Ariane")}"><ol>
    ${all.map((c, i) => (i === all.length - 1 ? html`<li aria-current="page">${c.name}</li>` : html`<li><a href="${c.url}">${c.name}</a></li>`))}
  </ol></nav>`;
}

function marquee(ctx) {
  const codes = ['CM', 'CI', 'SN', 'NG', 'GH', 'KE', 'RW', 'MA', 'ML', 'ZM', 'TZ', 'ET', 'EG', 'ZA', 'GA', 'BJ', 'AE', 'PT', 'FR', 'US'];
  const items = codes.map((c) => html`<span><b>${c}</b>${ctx.t.o(countries[c])}</span>`);
  return html`<div class="marquee" aria-label="${ctx.t('Markets covered', 'Marchés couverts')}"><div class="marquee-track">${items}<span aria-hidden="true" class="dup">${items}</span></div></div>`;
}

function steps(ctx) {
  const t = ctx.t;
  const s = [
    [t('Open your account', 'Ouvrez votre compte'), t('Sign up in two minutes and verify your identity (ID + selfie). Required for every investor, in every country.', "Inscription en deux minutes et vérification d'identité (pièce + selfie). Obligatoire pour tout investisseur, dans tous les pays.")],
    [t('Reserve a project', 'Réservez un projet'), t('Read the file: location, budget, target return, term, risks and audit summary. Reserve your share; it is held for 72 hours.', 'Consultez le dossier : localisation, budget, rendement cible, durée, risques et audit. Réservez votre part ; elle est bloquée 72 heures.')],
    [t('Fund it', 'Financez'), t('Pay in USDT, BTC, ETH, Mobile Money, card or bank transfer. Funds wait in escrow until the project is fully funded.', "Payez en USDT, BTC, ETH, Mobile Money, carte ou virement. Les fonds restent sous séquestre jusqu'au financement complet.")],
    [t('Collect weekly returns', 'Recevez vos revenus chaque semaine'), t('Rent, harvest, interest and royalty income lands in your balance every week. Withdraw in crypto or cash.', 'Loyers, récoltes, intérêts et redevances arrivent sur votre solde chaque semaine. Retrait en crypto ou en cash.')],
  ];
  return html`
<section id="how">
  <div class="wrap">
    <div class="head">
      <div><p class="eyebrow">${t('How it works', 'Fonctionnement')}</p><h2>${t('From your wallet to a working asset', 'De votre portefeuille à un actif qui travaille')}</h2></div>
      <p>${t('Four steps, the same for every project. You see the asset, the numbers and the payout calendar before you commit a franc or a satoshi.', "Quatre étapes, les mêmes pour chaque projet. Vous voyez l'actif, les chiffres et le calendrier de versements avant d'engager le moindre franc ou satoshi.")}</p>
    </div>
    <ol class="steps">
      ${s.map(([h, p], i) => html`<li class="step reveal" style="--d:${i * 90}ms"><span class="num">0${i + 1}</span><h3>${h}</h3><p>${p}</p></li>`)}
    </ol>
  </div>
</section>`;
}

function classCard(ctx, c) {
  const t = ctx.t;
  return html`
<article class="asset reveal tilt">
  <span class="tag">${c.emoji} ${t.o(c.name)}</span>
  <h3><a href="${ctx.u('/invest/' + c.slug)}" class="stretched">${t.o(c.title)}</a></h3>
  <p>${t.o(c.short)}</p>
  <dl>
    <dt>${t('Return from', 'Rendement issu de')}</dt><dd>${t.o(c.returnFrom)}</dd>
    <dt>${t('Typical term', 'Durée type')}</dt><dd class="num">${t.o(c.term)}</dd>
    <dt>${t('Payouts', 'Versements')}</dt><dd>${t.o(c.payouts)}</dd>
    <dt>${t('Target', 'Cible')}</dt><dd class="num hl">${t.o(c.target)}</dd>
  </dl>
</article>`;
}

function calculator(ctx) {
  const t = ctx.t;
  return html`
<section id="plan" class="vault">
  <div class="wrap plan">
    <div class="reveal">
      <p class="eyebrow">${t('Plan your returns', 'Planifiez vos rendements')}</p>
      <h2>${t('Invest longer, invest more, keep more', 'Plus longtemps, plus gros, plus de gains')}</h2>
      <p class="plan-lead">${t('Total target return grows with your investment period, from 20% over 12 months to 60% over 60 months. Larger amounts move you up a tier and pay lower fees.', 'Le rendement total cible augmente avec la durée, de 20 % sur 12 mois à 60 % sur 60 mois. Les montants plus élevés vous font monter de palier et paient moins de frais.')}</p>
      <div class="tiers">
        <div><b>Standard</b><span>&lt; 1 000 USD</span><em>+0</em></div>
        <div><b>Silver</b><span>1 000 USD +</span><em>+1 pt</em></div>
        <div><b>Gold</b><span>10 000 USD +</span><em>+2 pts</em></div>
        <div><b>Platinum</b><span>50 000 USD +</span><em>+4 pts</em></div>
      </div>
    </div>
    <aside class="calc glass reveal" aria-label="${t('Return calculator', 'Simulateur de rendement')}" data-calc data-lang="${ctx.lang}">
      <h3 class="mini-h">${t('Target return calculator', 'Simulateur de rendement cible')}</h3>
      <div><label for="c-amt">${t('Amount you invest', 'Montant investi')}</label>
        <div class="amt"><input id="c-amt" inputmode="decimal" value="5000" autocomplete="off"><select id="c-cur" aria-label="${t('Currency', 'Devise')}"><option>USD</option><option>USDT</option><option>EUR</option><option>XAF</option></select></div></div>
      <div><span class="lbl" id="term-lbl">${t('Investment period', 'Durée de placement')}</span>
        <div class="terms" role="group" aria-labelledby="term-lbl">
          ${[12, 24, 36, 48, 60].map((m) => html`<button type="button" data-m="${m}" aria-pressed="${m === 36 ? 'true' : 'false'}">${m} ${t('mo', 'mois')}</button>`)}
        </div></div>
      <div class="ladder" aria-hidden="true"><i style="height:33%"></i><i style="height:50%"></i><i style="height:67%"></i><i style="height:83%"></i><i style="height:100%"></i></div>
      <div class="out">
        <div><span>${t('Target total return', 'Rendement total cible')}</span><b class="big" id="c-pct">42%</b></div>
        <div><span>${t('Target gain over the period', 'Gain cible sur la période')}</span><b class="num" id="c-gain">+2 100 USD</b><span id="c-yr"></span></div>
      </div>
      <p class="stmt-note" id="c-tier"></p>
      <p class="stmt-note">${t('Illustrative targets, net of platform fees. Not guaranteed.', 'Cibles indicatives, nettes de frais. Non garanties.')}</p>
    </aside>
  </div>
</section>`;
}

function payments(ctx) {
  const t = ctx.t;
  return html`
<section id="payments" class="vault vault-2">
  <div class="wrap">
    <div class="head">
      <div><p class="eyebrow">${t('Crypto & cash', 'Crypto & cash')}</p><h2>${t('Invest the way you hold your money', "Investissez avec l'argent que vous détenez")}</h2></div>
      <p>${t('Every deposit is converted and booked in your project at the rate shown on screen. Payouts go back in the currency you choose.', 'Chaque dépôt est converti et affecté à votre projet au taux affiché. Les versements reviennent dans la devise de votre choix.')}</p>
    </div>
    <div class="pay">
      <div class="pay-col reveal">
        <h3>Crypto</h3>
        <p>${t('Deposit from any wallet or exchange.', "Dépôt depuis n'importe quel portefeuille ou plateforme.")}</p>
        <div class="pay-list">
          <div class="pay-item"><b>USDT</b><span>TRC-20 · ERC-20</span></div>
          <div class="pay-item"><b>USDC</b><span>ERC-20 · Polygon</span></div>
          <div class="pay-item"><b>BTC</b><span>Bitcoin · Lightning</span></div>
          <div class="pay-item"><b>ETH</b><span>Ethereum</span></div>
        </div>
      </div>
      <div class="pay-col reveal">
        <h3>Cash</h3>
        <p>${t('Local and international rails.', 'Canaux locaux et internationaux.')}</p>
        <div class="pay-list">
          <div class="pay-item"><b>MTN MoMo</b><span>XAF · XOF · GHS</span></div>
          <div class="pay-item"><b>Orange Money</b><span>XAF · XOF</span></div>
          <div class="pay-item"><b>${t('Card', 'Carte')}</b><span>Visa · Mastercard</span></div>
          <div class="pay-item"><b>${t('Bank transfer', 'Virement')}</b><span>SWIFT · SEPA</span></div>
        </div>
      </div>
    </div>
    <p class="fine">${t('Which projects and payment methods you can use depends on your country of residence. We confirm eligibility during identity verification.', "Les projets et moyens de paiement accessibles dépendent de votre pays de résidence. L'éligibilité est confirmée lors de la vérification d'identité.")}</p>
  </div>
</section>`;
}

function trust(ctx) {
  const t = ctx.t;
  const checks = [
    [t('Owner and title check', 'Propriété et titres'), t('Land title, lease or company registration (RCCM) verified on file.', 'Titre foncier, bail ou immatriculation (RCCM) vérifiés.')],
    [t('Site visit', 'Visite sur site'), t('Our team visits the building, farm or premises and publishes dated photos.', 'Notre équipe visite l’immeuble, la ferme ou les locaux et publie des photos datées.')],
    [t('Numbers review', 'Revue des chiffres'), t('Budget, cash flow and accounts reviewed; return targets set from real data.', 'Budget, trésorerie et comptes analysés ; cibles fixées sur données réelles.')],
    [t('Separate company per project', 'Une société par projet'), t("Each project sits in its own SPV, so one project's problems never touch another.", 'Chaque projet est logé dans sa propre SPV : un problème ne contamine pas les autres.')],
    [t('Escrow and reporting', 'Séquestre et reporting'), t('Funds released in stages against proof of work. Reports every payout period.', "Fonds libérés par tranches sur preuve d'avancement. Rapport à chaque période.")],
  ];
  return html`
<section id="trust">
  <div class="wrap trust">
    <div>
      <p class="eyebrow">${t('How we protect your money', 'Comment nous protégeons votre argent')}</p>
      <h2>${t('Five checks before any project goes live', 'Cinq contrôles avant toute mise en ligne')}</h2>
      <ol class="checks">${checks.map(([b, s]) => html`<li class="reveal"><b>${b}</b><span>${s}</span></li>`)}</ol>
    </div>
    <div>${riskBox(ctx)}</div>
  </div>
</section>`;
}

function riskBox(ctx) {
  const t = ctx.t;
  return html`<div class="risks reveal">
    <h3>${t('Know the risks', 'Connaître les risques')}</h3>
    <ul>
      <li>${t('Returns are targets, not guarantees. You can lose part or all of your capital.', 'Les rendements sont des objectifs, pas des garanties. Vous pouvez perdre tout ou partie du capital.')}</li>
      <li>${t('Farms face weather, disease and price risk. Buildings face vacancy and delay risk.', 'Les exploitations sont exposées à la météo, aux maladies et aux prix. L’immobilier, à la vacance et aux retards.')}</li>
      <li>${t('Crypto prices move. Your deposit is fixed at the conversion rate on the day you invest.', 'Le cours des cryptos varie. Votre dépôt est figé au taux du jour de l’investissement.')}</li>
      <li>${t('Money is committed for the project term. Early exit is not guaranteed.', "L'argent est engagé pour la durée du projet. Une sortie anticipée n'est pas garantie.")}</li>
      <li>${t('Only invest money you will not need during the term, and spread it across projects.', "N'investissez que de l'argent dont vous n'aurez pas besoin, et répartissez-le entre plusieurs projets.")}</li>
    </ul>
    <a href="${ctx.u('/legal/risk')}" class="link">${t('Read the full risk disclosure', "Lire l'avertissement complet")} ${icon('arrow', 14)}</a>
  </div>`;
}

function faqList(ctx, items) {
  return html`<div class="faq">${items.map((f, i) => html`<details class="reveal" ${i === 0 ? raw('open') : ''}><summary><h3>${ctx.t.o(f.q)}</h3><span class="plus" aria-hidden="true"></span></summary><p class="answer">${ctx.t.o(f.a)}</p></details>`)}</div>`;
}

function ctaBand(ctx) {
  const t = ctx.t;
  return html`
<section class="cta-band">
  <div class="aurora" aria-hidden="true"><i></i><i></i></div>
  <div class="wrap cta-inner reveal">
    <div>
      <h2>${t('Your first weekly payout starts with one reservation.', 'Votre premier versement hebdo commence par une réservation.')}</h2>
      <p>${t('Free account. No fee to reserve. Start from 100 USD.', 'Compte gratuit. Aucun frais de réservation. Dès 100 USD.')}</p>
    </div>
    <div class="ctas">
      <a class="btn btn-gold btn-lg magnetic" href="${ctx.user ? ctx.u('/assets') : ctx.u('/register')}">${ctx.user ? t('Browse projects', 'Voir les projets') : t('Open my account', 'Ouvrir mon compte')} ${icon('arrow', 18)}</a>
      <a class="btn btn-ghost btn-lg" href="${ctx.u('/submit-project')}">${t('I have a project to fund', "J'ai un projet à financer")}</a>
    </div>
  </div>
</section>`;
}

module.exports = { pageHero, breadcrumbsNav, marquee, steps, classCard, calculator, payments, trust, riskBox, faqList, ctaBand };
