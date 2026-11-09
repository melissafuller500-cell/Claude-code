'use strict';
const { html, raw, json } = require('../../html');
const { appPage } = require('../layout');
const { icon, badge, csrfField, targetLabel, termLabel, riskMeter, assetCard } = require('../components');
const { countries, payMethods, payoutFreq, statusLabels, tierFor } = require('../../data/catalog');
const categories = require('../../data/categories');
const config = require('../../config');

const catName = (ctx, code) => { const c = categories.find((x) => x.code === code); return c ? ctx.t.o(c.name) : code; };

function overview(ctx, { pf, user, recentTx, featured, unread }) {
  const t = ctx.t;
  const f = ctx.f;
  const tier = tierFor(pf.invested / 100);
  const alloc = Object.entries(pf.byCat).map(([code, cents]) => ({ label: catName(ctx, code), value: cents / 100, code }));
  // Cumulative payouts by week for the chart.
  const series = [];
  let cum = 0;
  for (const tx of recentTx.payoutsAsc) { cum += tx.amount_cents; series.push({ x: tx.created_at, y: cum / 100 }); }
  const firstName = user.name.split(' ')[0];
  const body = html`
${user.kyc_status !== 'verified' ? html`<div class="notice ${user.kyc_status === 'pending' ? 'notice-info' : 'notice-warn'}">
  ${icon('shield', 20)}
  <div><b>${user.kyc_status === 'pending' ? t('Identity check in progress', 'Vérification en cours') : user.kyc_status === 'rejected' ? t('Identity check needs attention', 'Vérification à corriger') : t('Verify your identity', 'Vérifiez votre identité')}</b>
  <p>${user.kyc_status === 'pending' ? t('We usually review documents within one business day.', 'Nous examinons les documents sous un jour ouvré.') : t('Required before your investments can be activated and before withdrawals.', 'Requis pour activer vos investissements et pour les retraits.')}</p></div>
  ${user.kyc_status !== 'pending' ? html`<a class="btn btn-gold btn-sm" href="/dashboard/kyc">${t('Verify now', 'Vérifier')}</a>` : ''}
</div>` : ''}

<section class="welcome">
  <div>
    <p class="eyebrow">${t('Welcome back', 'Bon retour')}, ${firstName}</p>
    <h2 class="h-xl">${t('Your money is working.', 'Votre argent travaille.')}</h2>
  </div>
  <a class="btn btn-gold" href="${ctx.u('/assets')}">${icon('plus', 16)} ${t('New investment', 'Nouvel investissement')}</a>
</section>

<section class="stat-grid">
  <div class="stat-card accent">
    <span>${t('Available balance', 'Solde disponible')}</span>
    <b class="num" data-count="${user.balance_cents / 100}" data-prefix="${ctx.lang === 'fr' ? '' : '$'}" data-suffix="${ctx.lang === 'fr' ? ' $' : ''}" data-dec="2">${f.usd(user.balance_cents)}</b>
    <a href="/dashboard/wallet" class="link">${t('Withdraw', 'Retirer')} ${icon('arrow', 14)}</a>
  </div>
  <div class="stat-card">
    <span>${t('Invested (active)', 'Investi (actif)')}</span>
    <b class="num">${f.usd(pf.invested, 0)}</b>
    <small>${pf.active.length} ${t('active positions', 'positions actives')} · ${t('Tier', 'Palier')} ${tier.name}</small>
  </div>
  <div class="stat-card">
    <span>${t('Total paid out', 'Total versé')}</span>
    <b class="num pos">${f.usd(pf.paidOut)}</b>
    <small>${t('Next weekly payout', 'Prochain versement')} ≈ <b>${f.usd(pf.weekly)}</b></small>
  </div>
  <div class="stat-card live-card">
    <span><i class="dot"></i> ${t('Accruing right now', 'En cours de génération')}</span>
    <b class="num pos" data-accrual data-annual-cents="${Math.round(pf.annualYield)}" data-since="${pf.lastPayoutAt || Date.now()}" data-lang="${ctx.lang}">${f.usd(0, 4)}</b>
    <small>${t('since the last weekly payout', 'depuis le dernier versement')}</small>
  </div>
</section>

<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>${t('Cumulative payouts', 'Versements cumulés')}</h2><span class="muted">${t('All time', 'Depuis le début')}</span></div>
    ${series.length ? html`<div class="chart" data-line-chart>${raw('')}<script type="application/json">${json({ series, lang: ctx.lang })}</script></div>`
      : html`<div class="empty-chart"><p>${t('Your first payout will appear here after your first active week.', 'Votre premier versement apparaîtra ici après votre première semaine active.')}</p></div>`}
  </div>
  <div class="panel">
    <div class="panel-head"><h2>${t('Allocation', 'Répartition')}</h2><span class="muted">${t('Active investments', 'Investissements actifs')}</span></div>
    ${alloc.length ? html`<div class="donut-wrap" data-donut><script type="application/json">${json({ items: alloc, lang: ctx.lang })}</script></div>`
      : html`<div class="empty-chart"><p>${t('No active investment yet.', 'Aucun investissement actif.')}</p><a class="btn btn-ghost btn-sm" href="${ctx.u('/assets')}">${t('Browse projects', 'Voir les projets')}</a></div>`}
  </div>
</section>

<section class="panel">
  <div class="panel-head"><h2>${t('My investments', 'Mes investissements')}</h2><a class="link" href="/dashboard/reservations">${t('See all', 'Tout voir')} ${icon('arrow', 14)}</a></div>
  ${positionsTable(ctx, pf.rows.filter((r) => ['active', 'pending'].includes(r.status)).slice(0, 6))}
</section>

<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>${t('Recent activity', 'Activité récente')}</h2><a class="link" href="/dashboard/wallet">${t('Wallet', 'Portefeuille')} ${icon('arrow', 14)}</a></div>
    ${txList(ctx, recentTx.latest)}
  </div>
  <div class="panel">
    <div class="panel-head"><h2>${t('Recommended for you', 'Recommandé pour vous')}</h2></div>
    <ul class="mini-assets">${featured.map((a) => html`<li><a href="${ctx.u('/assets/' + a.slug)}"><span class="chip ${a.category}">${a.cat.emoji}</span><span><b>${t(a.title_en, a.title_fr)}</b><small>${a.city} · ${termLabel(ctx, a.term_months)}</small></span><em class="hl">${targetLabel(ctx, a)}</em></a></li>`)}</ul>
  </div>
</section>`;
  return appPage(ctx, { title: t('Overview', "Vue d'ensemble"), active: '/dashboard', body, unread });
}

function positionsTable(ctx, rows) {
  const t = ctx.t;
  const f = ctx.f;
  if (!rows.length) return html`<div class="empty"><p>${t('You have no investments yet.', "Vous n'avez pas encore d'investissement.")}</p><a class="btn btn-gold btn-sm" href="${ctx.u('/assets')}">${t('Find a project', 'Trouver un projet')}</a></div>`;
  return html`<div class="table-scroll"><table class="table">
    <thead><tr><th>${t('Project', 'Projet')}</th><th>${t('Reference', 'Référence')}</th><th class="ta-r">${t('Amount', 'Montant')}</th><th>${t('Target', 'Cible')}</th><th class="ta-r">${t('Paid out', 'Versé')}</th><th>${t('Status', 'Statut')}</th><th><span class="sr">${t('Actions', 'Actions')}</span></th></tr></thead>
    <tbody>${rows.map((r) => html`<tr>
      <td><a href="${ctx.u('/assets/' + r.slug)}" class="cell-title"><span class="chip ${r.category}">${catName(ctx, r.category)}</span> ${t(r.title_en, r.title_fr)}</a></td>
      <td class="num">${r.ref}</td>
      <td class="ta-r num">${f.usd(r.amount_cents, 0)}</td>
      <td class="num hl">${r.target_rate ? f.pct(r.target_rate, 1) : r.target_multiple + '×'}</td>
      <td class="ta-r num pos">${f.usd(r.paid_out_cents)}</td>
      <td>${badge(ctx, r.status)}${r.status === 'pending' ? html`<small class="countdown" data-countdown="${r.expires_at}"></small>` : ''}</td>
      <td class="ta-r"><a class="btn btn-ghost btn-xs" href="/dashboard/reservations/${r.ref}">${r.status === 'pending' ? t('Pay', 'Payer') : t('Details', 'Détails')}</a></td>
    </tr>`)}</tbody></table></div>`;
}

function txList(ctx, rows) {
  const t = ctx.t;
  const labels = { deposit: t('Investment funded', 'Investissement financé'), payout: t('Weekly payout', 'Versement hebdo'), withdrawal: t('Withdrawal', 'Retrait'), refund: t('Capital returned', 'Capital rendu'), adjustment: t('Adjustment', 'Ajustement') };
  if (!rows.length) return html`<p class="muted">${t('No activity yet.', "Pas encore d'activité.")}</p>`;
  return html`<ul class="tx-list">${rows.map((x) => html`<li>
    <span class="tx-ico tx-${x.type}">${icon(x.type === 'payout' ? 'coins' : x.type === 'withdrawal' ? 'send' : x.type === 'deposit' ? 'ticket' : 'wallet', 16)}</span>
    <span class="tx-main"><b>${labels[x.type]}</b><small>${x.details || ''} · ${ctx.f.date(x.created_at)}</small></span>
    <span class="tx-amt num ${x.type === 'withdrawal' ? 'neg' : x.type === 'deposit' ? '' : 'pos'}">${x.type === 'deposit' ? '' : x.amount_cents > 0 ? '+' : ''}${ctx.f.usd(x.amount_cents)}${x.status !== 'completed' ? html` <em class="badge badge-${x.status}">${ctx.t.o(statusLabels[x.status] || { en: x.status, fr: x.status })}</em>` : ''}</span>
  </li>`)}</ul>`;
}

function reservations(ctx, { pf, unread, filter }) {
  const t = ctx.t;
  const tabs = [['all', t('All', 'Toutes')], ['active', t('Active', 'Actives')], ['pending', t('Pending', 'En attente')], ['closed', t('Closed', 'Clôturées')]];
  const rows = pf.rows.filter((r) => filter === 'all' || (filter === 'closed' ? ['completed', 'cancelled', 'expired', 'rejected'].includes(r.status) : r.status === filter));
  const body = html`
<div class="seg" role="tablist">${tabs.map(([k, l]) => html`<a role="tab" href="?status=${k}" aria-selected="${filter === k ? 'true' : 'false'}">${l} <em>${k === 'all' ? pf.rows.length : pf.rows.filter((r) => (k === 'closed' ? ['completed', 'cancelled', 'expired', 'rejected'].includes(r.status) : r.status === k)).length}</em></a>`)}</div>
<section class="panel">${positionsTable(ctx, rows)}</section>`;
  return appPage(ctx, { title: t('My investments', 'Mes investissements'), active: '/dashboard/reservations', body, unread });
}

function payInstructions(ctx, r) {
  const t = ctx.t;
  const m = payMethods[r.pay_method];
  const envKey = { usdt: 'PAY_USDT_ADDRESS', usdc: 'PAY_USDC_ADDRESS', btc: 'PAY_BTC_ADDRESS', eth: 'PAY_ETH_ADDRESS', momo: 'PAY_MOMO_NUMBER', orange: 'PAY_ORANGE_NUMBER', bank: 'PAY_BANK_IBAN', card: 'PAY_CARD_LINK' }[r.pay_method];
  const dest = process.env[envKey];
  return html`<div class="pay-box">
    <h3>${t('How to pay', 'Comment payer')} · ${m.label}</h3>
    <ol class="pay-steps">
      <li>${t('Amount to send', 'Montant à envoyer')}: <b class="num">${ctx.f.usd(r.amount_cents)}</b> ${m.kind === 'crypto' ? t('(equivalent at today’s rate)', '(équivalent au cours du jour)') : ''}</li>
      <li>${dest ? html`${t('Send to', 'Envoyer à')}: <code class="copy" data-copy="${dest}">${dest}</code>` : t('Our payments team sends the deposit details to your email and WhatsApp within one hour (business hours).', 'Notre équipe paiements vous envoie les coordonnées de dépôt par email et WhatsApp sous une heure (heures ouvrées).')}</li>
      <li>${t('Use this reference in the payment note', 'Indiquez cette référence dans le motif')}: <code class="copy" data-copy="${r.ref}">${r.ref}</code></li>
      <li>${t('We confirm receipt and activate your investment. You get a notification.', 'Nous confirmons la réception et activons votre investissement. Vous recevez une notification.')}</li>
    </ol>
  </div>`;
}

function reservationDetail(ctx, { r, unread, user }) {
  const t = ctx.t;
  const f = ctx.f;
  const weekly = r.target_rate ? Math.floor((r.amount_cents * r.target_rate) / 100 / 52) : 0;
  const steps = [
    ['reserved', t('Reserved', 'Réservé'), true],
    ['paid', t('Payment received', 'Paiement reçu'), ['active', 'completed'].includes(r.status)],
    ['active', t('Earning weekly', 'Revenus hebdo'), ['active', 'completed'].includes(r.status)],
    ['done', t('Capital returned', 'Capital rendu'), r.status === 'completed'],
  ];
  const body = html`
<a class="back" href="/dashboard/reservations">← ${t('All investments', 'Tous les investissements')}</a>
<section class="panel res-head">
  <div>
    <p class="eyebrow num">${r.ref}</p>
    <h2 class="h-lg"><a href="${ctx.u('/assets/' + r.slug)}">${t(r.title_en, r.title_fr)}</a></h2>
    <p class="muted">${r.city}, ${t.o(countries[r.country_code])} · ${catName(ctx, r.category)}</p>
  </div>
  <div class="ta-r">${badge(ctx, r.status)}${r.status === 'pending' ? html`<p class="countdown big" data-countdown="${r.expires_at}"></p>` : ''}</div>
</section>
${['rejected', 'cancelled', 'expired'].includes(r.status) ? '' : html`<ol class="progress-steps">${steps.map(([k, l, done]) => html`<li class="${done ? 'done' : ''}"><i>${done ? icon('check', 14) : ''}</i><span>${l}</span></li>`)}</ol>`}
<section class="panel-grid">
  <div class="panel">
    <dl class="facts">
      <dt>${t('Amount', 'Montant')}</dt><dd class="num">${f.usd(r.amount_cents)}</dd>
      <dt>${t('Target', 'Cible')}</dt><dd class="num hl">${r.target_rate ? f.pct(r.target_rate, 1) + t(' / yr', ' / an') : r.target_multiple + '×'}</dd>
      <dt>${t('Term', 'Durée')}</dt><dd>${termLabel(ctx, r.term_months)}</dd>
      <dt>${t('Payouts', 'Versements')}</dt><dd>${t.o(payoutFreq[r.payout_freq])}</dd>
      ${weekly ? html`<dt>${t('Expected weekly', 'Hebdo attendu')}</dt><dd class="num pos">${f.usd(weekly)}</dd>` : ''}
      <dt>${t('Paid out so far', 'Déjà versé')}</dt><dd class="num pos">${f.usd(r.paid_out_cents)}</dd>
      <dt>${t('Payment method', 'Moyen de paiement')}</dt><dd>${payMethods[r.pay_method] ? payMethods[r.pay_method].label : r.pay_method}</dd>
      <dt>${t('Created', 'Créée le')}</dt><dd>${f.dateTime(r.created_at)}</dd>
      ${r.decided_at ? html`<dt>${t('Updated', 'Mise à jour')}</dt><dd>${f.dateTime(r.decided_at)}</dd>` : ''}
      ${r.note ? html`<dt>Note</dt><dd>${r.note}</dd>` : ''}
    </dl>
  </div>
  <div class="panel">
    ${r.status === 'pending' ? html`
      ${user.kyc_status !== 'verified' ? html`<div class="notice notice-warn">${icon('shield', 18)}<div><b>${t('Identity verification required', "Vérification d'identité requise")}</b><p>${t('We can only activate your investment once your identity is verified.', 'Nous ne pouvons activer votre investissement qu’après vérification de votre identité.')} <a class="link" href="/dashboard/kyc">${t('Verify now', 'Vérifier')}</a></p></div></div>` : ''}
      ${payInstructions(ctx, r)}
      <form method="post" action="/dashboard/reservations/${r.ref}/cancel" data-confirm="${t('Cancel this reservation?', 'Annuler cette réservation ?')}">${csrfField(ctx)}<button class="btn btn-ghost btn-sm danger" type="submit">${t('Cancel reservation', 'Annuler la réservation')}</button></form>`
    : r.status === 'active' ? html`<h3>${t('Earning now', 'Rapporte maintenant')}</h3><p class="muted">${t('Income is credited to your balance every week.', 'Les revenus sont crédités chaque semaine.')}</p>
      <div class="big-accrual"><b class="num pos" data-accrual data-annual-cents="${r.target_rate ? Math.round((r.amount_cents * r.target_rate) / 100) : 0}" data-since="${r.decided_at || r.created_at}" data-base-cents="${r.paid_out_cents}" data-lang="${ctx.lang}">${f.usd(r.paid_out_cents, 4)}</b><span class="muted">${t('earned on this investment (live estimate)', 'gagné sur cet investissement (estimation en direct)')}</span></div>`
    : html`<p class="muted">${t('This reservation is closed.', 'Cette réservation est clôturée.')}</p><a class="btn btn-gold btn-sm" href="${ctx.u('/assets')}">${t('Find another project', 'Trouver un autre projet')}</a>`}
  </div>
</section>`;
  return appPage(ctx, { title: r.ref, active: '/dashboard/reservations', body, unread });
}

function watchlist(ctx, { items, unread }) {
  const t = ctx.t;
  const body = items.length
    ? html`<div class="projects">${items.map((a) => assetCard(ctx, a, { saved: true }))}</div>`
    : html`<div class="panel empty"><p>${t('Tap the heart on any project to follow it here.', 'Touchez le cœur d’un projet pour le suivre ici.')}</p><a class="btn btn-gold btn-sm" href="${ctx.u('/assets')}">${t('Browse projects', 'Voir les projets')}</a></div>`;
  return appPage(ctx, { title: t('Watchlist', 'Favoris'), active: '/dashboard/watchlist', body, unread });
}

function wallet(ctx, { user, txs, unread, pendingWd, error }) {
  const t = ctx.t;
  const f = ctx.f;
  const body = html`
<section class="stat-grid three">
  <div class="stat-card accent"><span>${t('Available balance', 'Solde disponible')}</span><b class="num">${f.usd(user.balance_cents)}</b></div>
  <div class="stat-card"><span>${t('Pending withdrawals', 'Retraits en attente')}</span><b class="num">${f.usd(-pendingWd)}</b></div>
  <div class="stat-card"><span>${t('Withdrawal time', 'Délai de retrait')}</span><b>${t('≤ 3 business days', '≤ 3 jours ouvrés')}</b></div>
</section>
<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>${t('Withdraw', 'Retirer')}</h2></div>
    ${user.kyc_status !== 'verified' ? html`<div class="notice notice-warn">${icon('shield', 18)}<div><p>${t('Verify your identity to enable withdrawals.', 'Vérifiez votre identité pour activer les retraits.')} <a class="link" href="/dashboard/kyc">${t('Verify now', 'Vérifier')}</a></p></div></div>` : ''}
    <form method="post" action="/dashboard/wallet/withdraw" class="stack" data-validate novalidate>
      ${csrfField(ctx)}
      ${error ? html`<p class="error show" role="alert">${error}</p>` : ''}
      <div class="field"><label for="w-amt">${t('Amount (USD)', 'Montant (USD)')}</label><div class="amt-input"><span>$</span><input id="w-amt" name="amount" inputmode="decimal" required placeholder="50.00"></div>
        <button type="button" class="link small" data-fill="#w-amt" data-value="${(user.balance_cents / 100).toFixed(2)}">${t('Withdraw all', 'Tout retirer')} (${f.usd(user.balance_cents)})</button></div>
      <div class="field"><label for="w-method">${t('Method', 'Moyen')}</label><select id="w-method" name="method" required>${Object.entries(payMethods).filter(([k]) => k !== 'card').map(([k, m]) => html`<option value="${k}">${m.label}</option>`)}</select></div>
      <div class="field"><label for="w-dest">${t('Wallet address, phone number or IBAN', 'Adresse, numéro ou IBAN')}</label><input id="w-dest" name="destination" required maxlength="140" autocomplete="off"></div>
      <button class="btn btn-gold" type="submit" ${user.kyc_status !== 'verified' ? raw('disabled') : ''}>${t('Request withdrawal', 'Demander le retrait')}</button>
    </form>
  </div>
  <div class="panel">
    <div class="panel-head"><h2>${t('Transactions', 'Transactions')}</h2><a class="link" href="/dashboard/wallet.csv">${t('Export CSV', 'Exporter CSV')}</a></div>
    ${txList(ctx, txs)}
  </div>
</section>`;
  return appPage(ctx, { title: t('Wallet', 'Portefeuille'), active: '/dashboard/wallet', body, unread });
}

function kyc(ctx, { user, unread, error }) {
  const t = ctx.t;
  let data = {};
  try { data = JSON.parse(user.kyc_data || '{}'); } catch { data = {}; }
  const states = {
    none: [t('Not started', 'Non commencé'), t('Submit your details to unlock investments and withdrawals.', 'Soumettez vos informations pour débloquer investissements et retraits.')],
    pending: [t('Under review', 'En cours de vérification'), t('We received your details and will review them within one business day.', 'Nous avons reçu vos informations et les examinerons sous un jour ouvré.')],
    verified: [t('Verified', 'Vérifié'), t('Your identity is verified. Thank you!', 'Votre identité est vérifiée. Merci !')],
    rejected: [t('Needs correction', 'À corriger'), user.kyc_note || t('Please check your details and submit again.', 'Vérifiez vos informations et soumettez à nouveau.')],
  };
  const editable = ['none', 'rejected'].includes(user.kyc_status);
  const sel = (a, b) => (a === b ? raw('selected') : '');
  const body = html`
<section class="panel kyc-status kyc-${user.kyc_status}">
  ${icon('shield', 28)}
  <div><h2>${states[user.kyc_status][0]}</h2><p>${states[user.kyc_status][1]}</p></div>
</section>
<section class="panel">
  <form method="post" action="/dashboard/kyc" class="form-grid" data-validate novalidate>
    ${csrfField(ctx)}
    ${error ? html`<p class="error show full" role="alert">${error}</p>` : ''}
    <fieldset ${editable ? '' : raw('disabled')} class="full form-grid">
      <legend class="sr">KYC</legend>
      <div class="field"><label for="k-name">${t('Legal full name', 'Nom légal complet')}</label><input id="k-name" name="legalName" required maxlength="120" value="${data.legalName || user.name}"></div>
      <div class="field"><label for="k-dob">${t('Date of birth', 'Date de naissance')}</label><input id="k-dob" name="dob" type="date" required value="${data.dob || ''}" max="${new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)}"></div>
      <div class="field"><label for="k-type">${t('ID document', "Pièce d'identité")}</label><select id="k-type" name="idType" required><option value="">—</option>
        <option value="national_id" ${sel(data.idType, 'national_id')}>${t('National ID card', "Carte nationale d'identité")}</option>
        <option value="passport" ${sel(data.idType, 'passport')}>${t('Passport', 'Passeport')}</option>
        <option value="residence" ${sel(data.idType, 'residence')}>${t('Residence permit', 'Titre de séjour')}</option>
        <option value="driver" ${sel(data.idType, 'driver')}>${t("Driver's licence", 'Permis de conduire')}</option></select></div>
      <div class="field"><label for="k-num">${t('Document number', 'Numéro du document')}</label><input id="k-num" name="idNumber" required maxlength="40" value="${data.idNumber || ''}" autocomplete="off"></div>
      <div class="field"><label for="k-country">${t('Issuing country', 'Pays de délivrance')}</label><select id="k-country" name="idCountry" required><option value="">—</option>${Object.entries(countries).map(([c, n]) => html`<option value="${c}" ${sel(data.idCountry || user.country, c)}>${t.o(n)}</option>`)}</select></div>
      <div class="field"><label for="k-occ">${t('Occupation', 'Profession')}</label><input id="k-occ" name="occupation" maxlength="80" value="${data.occupation || ''}"></div>
      <div class="field full"><label for="k-addr">${t('Residential address', 'Adresse de résidence')}</label><input id="k-addr" name="address" required maxlength="200" value="${data.address || ''}"></div>
      <div class="field full"><label for="k-src">${t('Source of funds', 'Origine des fonds')}</label><select id="k-src" name="source" required><option value="">—</option>
        ${[['salary', t('Salary', 'Salaire')], ['business', t('Business income', "Revenus d'entreprise")], ['savings', t('Savings', 'Épargne')], ['investments', t('Investments', 'Placements')], ['other', t('Other', 'Autre')]].map(([v, l]) => html`<option value="${v}" ${sel(data.source, v)}>${l}</option>`)}</select></div>
      <label class="consent full"><input type="checkbox" name="confirm" value="1" required ${editable ? '' : raw('checked')}> <span>${t('I confirm these details are accurate and belong to me.', 'Je confirme que ces informations sont exactes et me concernent.')}</span></label>
      ${editable ? html`<div class="form-actions"><button class="btn btn-gold" type="submit">${t('Submit for verification', 'Soumettre')}</button></div>` : ''}
    </fieldset>
  </form>
  <p class="fine-sm">${t('In production, document photos and a selfie are collected through a certified KYC provider. Your data is encrypted in transit and only visible to our compliance team.', 'En production, photos du document et selfie sont collectés via un prestataire KYC certifié. Vos données sont chiffrées en transit et visibles uniquement par notre équipe conformité.')}</p>
</section>`;
  return appPage(ctx, { title: t('Identity (KYC)', 'Identité (KYC)'), active: '/dashboard/kyc', body, unread });
}

function notifications(ctx, { items, unread }) {
  const t = ctx.t;
  const body = html`<section class="panel">
    <div class="panel-head"><h2>${t('Notifications', 'Notifications')}</h2>
      ${items.some((n) => !n.read) ? html`<form method="post" action="/dashboard/notifications/read">${csrfField(ctx)}<button class="btn btn-ghost btn-xs" type="submit">${t('Mark all as read', 'Tout marquer comme lu')}</button></form>` : ''}</div>
    ${items.length ? html`<ul class="notif-list">${items.map((n) => html`<li class="${n.read ? '' : 'unread'}"><i class="dot"></i><div><b>${n.title}</b><p>${n.body}</p><small>${ctx.f.dateTime(n.created_at)}</small></div>${n.link ? html`<a class="btn btn-ghost btn-xs" href="${n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : '/dashboard'}">${t('Open', 'Ouvrir')}</a>` : ''}</li>`)}</ul>` : html`<p class="muted">${t('No notifications.', 'Aucune notification.')}</p>`}
  </section>`;
  return appPage(ctx, { title: t('Notifications', 'Notifications'), active: '/dashboard/notifications', body, unread });
}

function profile(ctx, { user, sessions, unread, error, pwError }) {
  const t = ctx.t;
  const sel = (a, b) => (a === b ? raw('selected') : '');
  const body = html`
<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>${t('Profile', 'Profil')}</h2></div>
    <form method="post" action="/dashboard/profile" class="stack" data-validate novalidate>
      ${csrfField(ctx)}
      ${error ? html`<p class="error show" role="alert">${error}</p>` : ''}
      <div class="field"><label for="p-name">${t('Full name', 'Nom complet')}</label><input id="p-name" name="name" required maxlength="100" value="${user.name}"></div>
      <div class="field"><label>Email</label><input value="${user.email}" disabled></div>
      <div class="field"><label for="p-phone">${t('WhatsApp / phone', 'WhatsApp / téléphone')}</label><input id="p-phone" name="phone" type="tel" maxlength="40" value="${user.phone || ''}"></div>
      <div class="field"><label for="p-country">${t('Country of residence', 'Pays de résidence')}</label><select id="p-country" name="country">${Object.entries(countries).map(([c, n]) => html`<option value="${c}" ${sel(user.country, c)}>${t.o(n)}</option>`)}<option value="OT" ${sel(user.country, 'OT')}>${t('Other', 'Autre')}</option></select></div>
      <div class="field"><label for="p-lang">${t('Language', 'Langue')}</label><select id="p-lang" name="lang"><option value="en" ${sel(user.lang, 'en')}>English</option><option value="fr" ${sel(user.lang, 'fr')}>Français</option></select></div>
      <button class="btn btn-gold" type="submit">${t('Save changes', 'Enregistrer')}</button>
    </form>
  </div>
  <div class="panel">
    <div class="panel-head"><h2>${t('Change password', 'Changer le mot de passe')}</h2></div>
    <form method="post" action="/dashboard/password" class="stack" data-validate novalidate>
      ${csrfField(ctx)}
      ${pwError ? html`<p class="error show" role="alert">${pwError}</p>` : ''}
      <div class="field"><label for="pw-cur">${t('Current password', 'Mot de passe actuel')}</label><input id="pw-cur" name="current" type="password" required autocomplete="current-password"></div>
      <div class="field"><label for="pw-new">${t('New password', 'Nouveau mot de passe')}</label><input id="pw-new" name="password" type="password" required minlength="10" autocomplete="new-password"></div>
      <div class="pw-meter" aria-hidden="true"><i data-pw-meter></i></div>
      <button class="btn btn-gold" type="submit">${t('Update password', 'Mettre à jour')}</button>
    </form>
    <div class="panel-head mt"><h2>${t('Active sessions', 'Sessions actives')}</h2></div>
    <ul class="sess-list">${sessions.map((s) => html`<li><span><b>${(s.ua || 'Unknown device').slice(0, 60)}</b><small>${s.ip || ''} · ${ctx.f.dateTime(s.created_at)}</small></span>${s.current ? html`<em class="badge badge-active">${t('This device', 'Cet appareil')}</em>` : ''}</li>`)}</ul>
    <form method="post" action="/dashboard/sessions/revoke" data-confirm="${t('Sign out all other devices?', 'Déconnecter tous les autres appareils ?')}">${csrfField(ctx)}<button class="btn btn-ghost btn-sm" type="submit">${t('Sign out other devices', 'Déconnecter les autres appareils')}</button></form>
  </div>
</section>`;
  return appPage(ctx, { title: t('Profile & security', 'Profil & sécurité'), active: '/dashboard/profile', body, unread });
}

module.exports = { overview, reservations, reservationDetail, watchlist, wallet, kyc, notifications, profile, txList };
