'use strict';
const { html, raw, json } = require('../../html');
const { appPage } = require('../layout');
const { icon, badge, csrfField, pagination } = require('../components');
const { countries, payMethods, payoutFreq } = require('../../data/catalog');
const categories = require('../../data/categories');

const page = (ctx, title, active, body, counts) => appPage(ctx, { title, area: 'admin', active, body, counts });
const catName = (code) => (categories.find((c) => c.code === code) || { name: { en: code } }).name.en;
const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');

function overview(ctx, { k, counts, daily, byCat, recent, pendingRes, pendingKyc }) {
  const f = ctx.f;
  const body = html`
<section class="stat-grid">
  <div class="stat-card accent"><span>Assets under management</span><b class="num">${f.usd(k.aum, 0)}</b><small>Active investments</small></div>
  <div class="stat-card"><span>Investors</span><b class="num" data-count="${k.investors}">${k.investors}</b><small>${k.verified} verified · ${k.newWeek} new this week</small></div>
  <div class="stat-card"><span>Pending reservations</span><b class="num">${f.usd(k.pendingAmt, 0)}</b><small>${counts.pendingRes || 0} awaiting payment</small></div>
  <div class="stat-card"><span>Paid out (all time)</span><b class="num pos">${f.usd(k.paidOut, 0)}</b><small>User balances ${f.usd(k.balances, 0)}</small></div>
</section>
<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>Reservations · last 30 days</h2><span class="muted">USD committed per day</span></div>
    <div class="chart" data-bar-chart><script type="application/json">${json({ series: daily, lang: ctx.lang })}</script></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h2>AUM by asset class</h2></div>
    ${byCat.length ? html`<div class="donut-wrap" data-donut><script type="application/json">${json({ items: byCat, lang: ctx.lang })}</script></div>` : html`<p class="muted">No active investments yet.</p>`}
  </div>
</section>
<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>Needs your attention</h2></div>
    <ul class="todo">
      <li><a href="/admin/reservations?status=pending">${icon('ticket', 18)} <span>Reservations awaiting payment confirmation</span><em class="count">${counts.pendingRes || 0}</em></a></li>
      <li><a href="/admin/users?kyc=pending">${icon('shield', 18)} <span>KYC reviews</span><em class="count">${counts.pendingKyc || 0}</em></a></li>
      <li><a href="/admin/withdrawals">${icon('wallet', 18)} <span>Withdrawals to process</span><em class="count">${counts.pendingWd || 0}</em></a></li>
      <li><a href="/admin/submissions">${icon('briefcase', 18)} <span>New project submissions</span><em class="count">${counts.newSub || 0}</em></a></li>
      <li><a href="/admin/messages">${icon('inbox', 18)} <span>Unread messages</span><em class="count">${counts.newMsg || 0}</em></a></li>
    </ul>
    ${pendingKyc.length ? html`<h3 class="mt">Latest KYC submissions</h3><ul class="mini-list">${pendingKyc.map((u) => html`<li><a href="/admin/users/${u.id}"><b>${u.name}</b> <small>${u.email} · ${countries[u.country] ? countries[u.country].en : u.country}</small></a></li>`)}</ul>` : ''}
    ${pendingRes.length ? html`<h3 class="mt">Latest pending reservations</h3><ul class="mini-list">${pendingRes.map((r) => html`<li><a href="/admin/reservations?status=pending"><b class="num">${r.ref}</b> ${r.name} · ${f.usd(r.amount_cents, 0)} <small>${r.title_en}</small></a></li>`)}</ul>` : ''}
  </div>
  <div class="panel">
    <div class="panel-head"><h2>Recent activity</h2><a class="link" href="/admin/audit">Audit log ${icon('arrow', 14)}</a></div>
    <ul class="audit-list">${recent.map((a) => html`<li><code>${a.action}</code> <span>${a.target}</span> <small>${a.actor || 'system'} · ${f.dateTime(a.created_at)}</small></li>`)}</ul>
  </div>
</section>`;
  return page(ctx, 'Admin overview', '/admin', body, counts);
}

function assetsList(ctx, { items, counts, filter }) {
  const f = ctx.f;
  const body = html`
<div class="toolbar">
  <div class="seg">${['all', 'open', 'funded', 'closed', 'draft'].map((s) => html`<a href="?status=${s}" aria-selected="${filter === s ? 'true' : 'false'}">${s}</a>`)}</div>
  <a class="btn btn-gold btn-sm" href="/admin/assets/new">${icon('plus', 16)} New asset</a>
</div>
<section class="panel"><div class="table-scroll"><table class="table">
  <thead><tr><th>Asset</th><th>Class</th><th>Location</th><th class="ta-r">Goal (USD)</th><th>Funded</th><th>Target</th><th>Risk</th><th>Status</th><th></th></tr></thead>
  <tbody>${items.map((a) => html`<tr>
    <td><b>${a.title_en}</b>${a.featured ? html` <em class="badge badge-featured">★ featured</em>` : ''}<br><small class="muted">/${a.slug}</small></td>
    <td><span class="chip ${a.category}">${catName(a.category)}</span></td>
    <td>${a.city}, ${a.country_code}</td>
    <td class="ta-r num">${f.usdWhole(a.goal_usd)}</td>
    <td><div class="bar sm"><i style="--w:${a.pct}%"></i></div><small class="num">${a.pct}% · ${a.investor_count} inv.</small></td>
    <td class="num">${a.target_rate ? a.target_rate + '%' : a.target_multiple + '×'}</td>
    <td class="num">${a.risk}/5</td>
    <td>${badge(ctx, a.status)}</td>
    <td class="ta-r nowrap"><a class="btn btn-ghost btn-xs" href="/admin/assets/${a.id}/edit">Edit</a> <a class="btn btn-ghost btn-xs" href="/assets/${a.slug}" target="_blank" rel="noopener">View</a></td>
  </tr>`)}</tbody></table></div></section>`;
  return page(ctx, 'Assets', '/admin/assets', body, counts);
}

function assetForm(ctx, { a = {}, counts, error }) {
  const isNew = !a.id;
  const v = (k, d = '') => (a[k] ?? d);
  const hl = (lang) => { try { return JSON.parse(a['highlights_' + lang] || '[]').join('\n'); } catch { return ''; } };
  const body = html`
<a class="back" href="/admin/assets">← All assets</a>
<form method="post" action="${isNew ? '/admin/assets' : `/admin/assets/${a.id}`}" class="panel form-grid" data-validate novalidate>
  ${csrfField(ctx)}
  ${error ? html`<p class="error show full" role="alert">${error}</p>` : ''}
  <h2 class="full">Basics</h2>
  <div class="field"><label for="a-ten">Title (English)</label><input id="a-ten" name="title_en" required maxlength="120" value="${v('title_en')}"></div>
  <div class="field"><label for="a-tfr">Title (French)</label><input id="a-tfr" name="title_fr" required maxlength="120" value="${v('title_fr')}"></div>
  <div class="field"><label for="a-cat">Asset class</label><select id="a-cat" name="category" required>${categories.map((c) => html`<option value="${c.code}" ${sel(v('category'), c.code)}>${c.name.en}</option>`)}</select></div>
  <div class="field"><label for="a-status">Status</label><select id="a-status" name="status">${['draft', 'open', 'funded', 'closed'].map((s) => html`<option value="${s}" ${sel(v('status', 'draft'), s)}>${s}</option>`)}</select></div>
  <div class="field"><label for="a-slug">URL slug ${isNew ? '(auto if empty)' : ''}</label><input id="a-slug" name="slug" maxlength="80" pattern="[a-z0-9-]*" value="${v('slug')}"></div>
  <label class="consent"><input type="checkbox" name="featured" value="1" ${v('featured') ? raw('checked') : ''}> <span>Feature on home page</span></label>

  <h2 class="full">Location</h2>
  <div class="field"><label for="a-city">City / district</label><input id="a-city" name="city" required maxlength="80" value="${v('city')}"></div>
  <div class="field"><label for="a-region">Region</label><input id="a-region" name="region" maxlength="80" value="${v('region')}"></div>
  <div class="field"><label for="a-cc">Country</label><select id="a-cc" name="country_code" required>${Object.entries(countries).map(([c, n]) => html`<option value="${c}" ${sel(v('country_code', 'CM'), c)}>${n.en}</option>`)}</select></div>

  <h2 class="full">Economics</h2>
  <div class="field"><label for="a-cur">Local currency</label><select id="a-cur" name="currency">${['USD', 'XAF', 'XOF', 'EUR', 'AED', 'MAD', 'GHS', 'NGN', 'KES'].map((c) => html`<option ${sel(v('currency', 'USD'), c)}>${c}</option>`)}</select></div>
  <div class="field"><label for="a-goal">Funding goal (local currency)</label><input id="a-goal" name="goal_local" required inputmode="numeric" value="${v('goal_local')}"></div>
  <div class="field"><label for="a-rate">Target annual return % (yield assets)</label><input id="a-rate" name="target_rate" inputmode="decimal" value="${v('target_rate')}" placeholder="e.g. 12"></div>
  <div class="field"><label for="a-mult">Target multiple × (equity, leave rate empty)</label><input id="a-mult" name="target_multiple" inputmode="decimal" value="${v('target_multiple')}" placeholder="e.g. 3"></div>
  <div class="field"><label for="a-term">Term (months)</label><input id="a-term" name="term_months" required inputmode="numeric" value="${v('term_months', 24)}"></div>
  <div class="field"><label for="a-pay">Payout frequency</label><select id="a-pay" name="payout_freq">${Object.entries(payoutFreq).map(([k, l]) => html`<option value="${k}" ${sel(v('payout_freq', 'monthly'), k)}>${l.en}</option>`)}</select></div>
  <div class="field"><label for="a-risk">Risk (1–5)</label><select id="a-risk" name="risk">${[1, 2, 3, 4, 5].map((r) => html`<option ${sel(v('risk', 3), r)}>${r}</option>`)}</select></div>
  <div class="field"><label for="a-min">Minimum investment (USD)</label><input id="a-min" name="min_usd" required inputmode="numeric" value="${v('min_usd', 100)}"></div>
  <div class="field"><label for="a-off">Raised outside platform (USD)</label><input id="a-off" name="offline_raised_usd" inputmode="numeric" value="${v('offline_raised_usd', 0)}"></div>

  <h2 class="full">Content (SEO: write a clear first sentence — it becomes the quick answer)</h2>
  <div class="field full"><label for="a-sen">Summary (English, 1–2 sentences)</label><textarea id="a-sen" name="summary_en" required maxlength="400" rows="2">${v('summary_en')}</textarea></div>
  <div class="field full"><label for="a-sfr">Summary (French)</label><textarea id="a-sfr" name="summary_fr" required maxlength="400" rows="2">${v('summary_fr')}</textarea></div>
  <div class="field full"><label for="a-den">Description (English; blank line between paragraphs)</label><textarea id="a-den" name="description_en" maxlength="6000" rows="6">${v('description_en')}</textarea></div>
  <div class="field full"><label for="a-dfr">Description (French)</label><textarea id="a-dfr" name="description_fr" maxlength="6000" rows="6">${v('description_fr')}</textarea></div>
  <div class="field"><label for="a-hen">Checks completed (English, one per line)</label><textarea id="a-hen" name="highlights_en" maxlength="1200" rows="4">${hl('en')}</textarea></div>
  <div class="field"><label for="a-hfr">Checks completed (French, one per line)</label><textarea id="a-hfr" name="highlights_fr" maxlength="1200" rows="4">${hl('fr')}</textarea></div>
  <div class="form-actions"><button class="btn btn-gold" type="submit">${isNew ? 'Create asset' : 'Save changes'}</button><a class="btn btn-ghost" href="/admin/assets">Cancel</a></div>
</form>
${!isNew ? html`<form method="post" action="/admin/assets/${a.id}/delete" class="panel danger-zone" data-confirm="Delete this asset permanently? Only possible if it has no reservations.">${csrfField(ctx)}
  <div><h3>Delete asset</h3><p class="muted">Assets with reservations cannot be deleted — set them to "closed" instead.</p></div><button class="btn btn-ghost btn-sm danger" type="submit">Delete</button></form>` : ''}`;
  return page(ctx, isNew ? 'New asset' : `Edit · ${a.title_en}`, '/admin/assets', body, counts);
}

function reservationsList(ctx, { items, counts, filter, search }) {
  const f = ctx.f;
  const body = html`
<div class="toolbar">
  <div class="seg">${['pending', 'active', 'completed', 'rejected', 'cancelled', 'expired', 'all'].map((s) => html`<a href="?status=${s}" aria-selected="${filter === s ? 'true' : 'false'}">${s}</a>`)}</div>
  <form method="get" class="search-mini"><input type="hidden" name="status" value="${filter}"><label class="sr" for="rs">Search</label><input id="rs" name="q" value="${search}" placeholder="Ref, email, asset…"><button class="btn btn-ghost btn-sm">Search</button></form>
</div>
<section class="panel"><div class="table-scroll"><table class="table">
  <thead><tr><th>Ref</th><th>Investor</th><th>Asset</th><th class="ta-r">Amount</th><th>Method</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
  <tbody>${items.length ? items.map((r) => html`<tr>
    <td class="num">${r.ref}</td>
    <td><a href="/admin/users/${r.user_id}"><b>${r.name}</b></a><br><small>${r.email}</small> ${r.kyc_status === 'verified' ? html`<em class="badge badge-verified">KYC ✓</em>` : html`<em class="badge badge-${r.kyc_status}">KYC ${r.kyc_status}</em>`}</td>
    <td>${r.title_en}</td>
    <td class="ta-r num">${f.usd(r.amount_cents, 0)}</td>
    <td>${payMethods[r.pay_method] ? payMethods[r.pay_method].label.split(' ')[0] : r.pay_method}</td>
    <td><small>${f.dateTime(r.created_at)}</small>${r.status === 'pending' ? html`<br><small class="countdown" data-countdown="${r.expires_at}"></small>` : ''}</td>
    <td>${badge(ctx, r.status)}</td>
    <td class="nowrap">
      ${r.status === 'pending' ? html`
        <form method="post" action="/admin/reservations/${r.id}/confirm" class="inline" data-confirm="Confirm payment received for ${r.ref}?">${csrfField(ctx)}${r.kyc_status !== 'verified' ? html`<input type="hidden" name="force" value="1">` : ''}<button class="btn btn-gold btn-xs" type="submit">${r.kyc_status === 'verified' ? 'Confirm paid' : 'Confirm (override KYC)'}</button></form>
        <form method="post" action="/admin/reservations/${r.id}/reject" class="inline" data-prompt="Reason for rejection (sent to investor):" data-prompt-field="note">${csrfField(ctx)}<input type="hidden" name="note" value=""><button class="btn btn-ghost btn-xs danger" type="submit">Reject</button></form>` : ''}
      ${r.status === 'active' ? html`<form method="post" action="/admin/reservations/${r.id}/complete" class="inline" data-confirm="Close ${r.ref} and return capital to the investor's balance?">${csrfField(ctx)}<button class="btn btn-ghost btn-xs" type="submit">Complete &amp; return capital</button></form>` : ''}
    </td>
  </tr>`) : html`<tr><td colspan="8" class="muted center">Nothing here.</td></tr>`}</tbody></table></div></section>`;
  return page(ctx, 'Reservations', '/admin/reservations', body, counts);
}

function usersList(ctx, { items, counts, filter, search, pageInfo }) {
  const f = ctx.f;
  const body = html`
<div class="toolbar">
  <div class="seg">${[['all', 'All'], ['pending', 'KYC pending'], ['verified', 'Verified'], ['none', 'No KYC'], ['rejected', 'Rejected'], ['admin', 'Admins'], ['suspended', 'Suspended']].map(([k, l]) => html`<a href="?kyc=${k}" aria-selected="${filter === k ? 'true' : 'false'}">${l}</a>`)}</div>
  <form method="get" class="search-mini"><input type="hidden" name="kyc" value="${filter}"><label class="sr" for="us">Search</label><input id="us" name="q" value="${search}" placeholder="Name or email"><button class="btn btn-ghost btn-sm">Search</button></form>
</div>
<section class="panel"><div class="table-scroll"><table class="table">
  <thead><tr><th>User</th><th>Country</th><th>Role</th><th>KYC</th><th class="ta-r">Invested</th><th class="ta-r">Balance</th><th>Joined</th><th></th></tr></thead>
  <tbody>${items.length ? items.map((u) => html`<tr>
    <td><b>${u.name}</b><br><small>${u.email}</small></td>
    <td>${countries[u.country] ? countries[u.country].en : u.country || '—'}</td>
    <td>${u.role}${u.status === 'suspended' ? html` <em class="badge badge-rejected">suspended</em>` : ''}</td>
    <td>${badge(ctx, u.kyc_status)}</td>
    <td class="ta-r num">${f.usd(u.invested, 0)}</td>
    <td class="ta-r num">${f.usd(u.balance_cents)}</td>
    <td><small>${f.date(u.created_at)}</small></td>
    <td class="ta-r"><a class="btn btn-ghost btn-xs" href="/admin/users/${u.id}">Open</a></td>
  </tr>`) : html`<tr><td colspan="8" class="muted center">No users found.</td></tr>`}</tbody></table></div>
  ${pagination(ctx, pageInfo)}
</section>`;
  return page(ctx, 'Users & KYC', '/admin/users', body, counts);
}

function userDetail(ctx, { u, kyc, res, txs, counts, isSelf }) {
  const f = ctx.f;
  const body = html`
<a class="back" href="/admin/users">← All users</a>
<section class="panel res-head">
  <div><p class="eyebrow">${u.role}${u.status === 'suspended' ? ' · suspended' : ''}</p><h2 class="h-lg">${u.name}</h2><p class="muted">${u.email} · ${u.phone || 'no phone'} · ${countries[u.country] ? countries[u.country].en : u.country}</p></div>
  <div class="ta-r"><span class="muted">Balance</span><b class="num big-num">${f.usd(u.balance_cents)}</b></div>
</section>
<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>Identity (KYC)</h2>${badge(ctx, u.kyc_status)}</div>
    ${Object.keys(kyc).length ? html`<dl class="facts">${Object.entries(kyc).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>` : html`<p class="muted">No KYC details submitted.</p>`}
    ${u.kyc_note ? html`<p class="muted">Note: ${u.kyc_note}</p>` : ''}
    <div class="btn-row">
      ${u.kyc_status !== 'verified' ? html`<form method="post" action="/admin/users/${u.id}/kyc" class="inline">${csrfField(ctx)}<input type="hidden" name="decision" value="verified"><button class="btn btn-gold btn-sm" type="submit">${icon('check', 14)} Verify identity</button></form>` : ''}
      ${u.kyc_status !== 'rejected' ? html`<form method="post" action="/admin/users/${u.id}/kyc" class="inline" data-prompt="What should the investor correct?" data-prompt-field="note">${csrfField(ctx)}<input type="hidden" name="decision" value="rejected"><input type="hidden" name="note" value=""><button class="btn btn-ghost btn-sm danger" type="submit">Reject KYC</button></form>` : ''}
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h2>Account controls</h2></div>
    ${isSelf ? html`<p class="muted">You cannot change your own role or status.</p>` : html`
    <div class="btn-row">
      <form method="post" action="/admin/users/${u.id}/role" class="inline" data-confirm="Change role for ${u.email}?">${csrfField(ctx)}<input type="hidden" name="role" value="${u.role === 'admin' ? 'investor' : 'admin'}"><button class="btn btn-ghost btn-sm" type="submit">${u.role === 'admin' ? 'Remove admin rights' : 'Make admin'}</button></form>
      <form method="post" action="/admin/users/${u.id}/status" class="inline" data-confirm="${u.status === 'active' ? 'Suspend' : 'Reactivate'} ${u.email}?">${csrfField(ctx)}<input type="hidden" name="status" value="${u.status === 'active' ? 'suspended' : 'active'}"><button class="btn btn-ghost btn-sm ${u.status === 'active' ? 'danger' : ''}" type="submit">${u.status === 'active' ? 'Suspend account' : 'Reactivate account'}</button></form>
      <form method="post" action="/admin/users/${u.id}/reset" class="inline" data-confirm="Email a password reset link to ${u.email}?">${csrfField(ctx)}<button class="btn btn-ghost btn-sm" type="submit">Send password reset</button></form>
    </div>`}
    <h3 class="mt">Adjust balance</h3>
    <form method="post" action="/admin/users/${u.id}/adjust" class="inline-form" data-confirm="Apply this balance adjustment?">${csrfField(ctx)}
      <label class="sr" for="adj-a">Amount</label><input id="adj-a" name="amount" inputmode="decimal" placeholder="+25.00 or -10" required>
      <label class="sr" for="adj-r">Reason</label><input id="adj-r" name="reason" placeholder="Reason" maxlength="200" required>
      <button class="btn btn-ghost btn-sm" type="submit">Apply</button></form>
    <dl class="facts mt"><dt>Joined</dt><dd>${f.dateTime(u.created_at)}</dd><dt>Last login</dt><dd>${f.dateTime(u.last_login_at)}</dd><dt>Language</dt><dd>${u.lang}</dd></dl>
  </div>
</section>
<section class="panel"><div class="panel-head"><h2>Reservations</h2></div>
  <div class="table-scroll"><table class="table"><thead><tr><th>Ref</th><th>Asset</th><th class="ta-r">Amount</th><th class="ta-r">Paid out</th><th>Status</th><th>Created</th></tr></thead>
  <tbody>${res.length ? res.map((r) => html`<tr><td class="num">${r.ref}</td><td>${r.title_en}</td><td class="ta-r num">${f.usd(r.amount_cents, 0)}</td><td class="ta-r num">${f.usd(r.paid_out_cents)}</td><td>${badge(ctx, r.status)}</td><td><small>${f.dateTime(r.created_at)}</small></td></tr>`) : html`<tr><td colspan="6" class="muted center">None</td></tr>`}</tbody></table></div></section>
<section class="panel"><div class="panel-head"><h2>Transactions</h2></div>
  <div class="table-scroll"><table class="table"><thead><tr><th>Date</th><th>Type</th><th class="ta-r">Amount</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>${txs.length ? txs.map((t) => html`<tr><td><small>${f.dateTime(t.created_at)}</small></td><td>${t.type}</td><td class="ta-r num">${f.usd(t.amount_cents)}</td><td>${t.status}</td><td><small>${t.details}</small></td></tr>`) : html`<tr><td colspan="5" class="muted center">None</td></tr>`}</tbody></table></div></section>`;
  return page(ctx, u.name, '/admin/users', body, counts);
}

function withdrawals(ctx, { pending, recent, counts }) {
  const f = ctx.f;
  const row = (w, actions) => html`<tr><td><small>${f.dateTime(w.created_at)}</small></td><td><a href="/admin/users/${w.user_id}"><b>${w.name}</b></a><br><small>${w.email}</small></td><td class="ta-r num">${f.usd(-w.amount_cents)}</td><td>${payMethods[w.method] ? payMethods[w.method].label : w.method}</td><td><code>${w.details}</code></td><td>${actions ? html`
    <form method="post" action="/admin/withdrawals/${w.id}" class="inline" data-confirm="Mark ${f.usd(-w.amount_cents)} as sent?">${csrfField(ctx)}<input type="hidden" name="decision" value="approve"><button class="btn btn-gold btn-xs">Mark as sent</button></form>
    <form method="post" action="/admin/withdrawals/${w.id}" class="inline" data-prompt="Reason (funds return to balance):" data-prompt-field="note">${csrfField(ctx)}<input type="hidden" name="decision" value="reject"><input type="hidden" name="note" value=""><button class="btn btn-ghost btn-xs danger">Reject</button></form>` : badge(ctx, w.status === 'completed' ? 'active' : 'rejected')}</td></tr>`;
  const body = html`
<section class="panel"><div class="panel-head"><h2>Pending</h2></div><div class="table-scroll"><table class="table">
  <thead><tr><th>Requested</th><th>Investor</th><th class="ta-r">Amount</th><th>Method</th><th>Destination</th><th>Actions</th></tr></thead>
  <tbody>${pending.length ? pending.map((w) => row(w, true)) : html`<tr><td colspan="6" class="muted center">No pending withdrawals.</td></tr>`}</tbody></table></div></section>
<section class="panel"><div class="panel-head"><h2>Recently processed</h2></div><div class="table-scroll"><table class="table">
  <thead><tr><th>Requested</th><th>Investor</th><th class="ta-r">Amount</th><th>Method</th><th>Destination</th><th>Result</th></tr></thead>
  <tbody>${recent.length ? recent.map((w) => row(w, false)) : html`<tr><td colspan="6" class="muted center">None yet.</td></tr>`}</tbody></table></div></section>`;
  return page(ctx, 'Withdrawals', '/admin/withdrawals', body, counts);
}

function payouts(ctx, { preview, runs, week, done, counts }) {
  const f = ctx.f;
  const body = html`
<section class="panel payout-run">
  <div>
    <p class="eyebrow">Week ${week}</p>
    <h2 class="h-lg">${done ? 'Payouts already credited this week' : 'Weekly payout ready'}</h2>
    <p class="muted">Credits each active investment with amount × target rate ÷ 52 to the investor's balance and notifies them. Runs once per ISO week.</p>
  </div>
  <div class="stat-row">
    <div><span>Active positions</span><b class="num">${preview.count}</b></div>
    <div><span>Investors</span><b class="num">${preview.investors}</b></div>
    <div><span>Total to credit</span><b class="num pos">${f.usd(preview.total)}</b></div>
  </div>
  <form method="post" action="/admin/payouts/run" data-confirm="Credit ${f.usd(preview.total)} to ${preview.investors} investors for ${week}?">${csrfField(ctx)}<button class="btn btn-gold btn-lg" type="submit" ${done || !preview.count ? raw('disabled') : ''}>${icon('coins', 18)} Run payout for ${week}</button></form>
</section>
<section class="panel"><div class="panel-head"><h2>History</h2></div><div class="table-scroll"><table class="table">
  <thead><tr><th>Week</th><th>Run at</th><th class="ta-r">Positions</th><th class="ta-r">Total credited</th></tr></thead>
  <tbody>${runs.length ? runs.map((r) => html`<tr><td class="num">${r.week}</td><td>${f.dateTime(r.created_at)}</td><td class="ta-r num">${r.count}</td><td class="ta-r num pos">${f.usd(r.total_cents)}</td></tr>`) : html`<tr><td colspan="4" class="muted center">No payout runs yet.</td></tr>`}</tbody></table></div></section>`;
  return page(ctx, 'Payouts', '/admin/payouts', body, counts);
}

function submissions(ctx, { items, counts }) {
  const f = ctx.f;
  const body = html`<section class="cards-list">${items.length ? items.map((s) => html`<article class="panel sub-card">
    <div class="panel-head"><div><h2>${s.company || s.name}</h2><p class="muted">${s.type} · ${s.city || '—'} · ${s.need || 'amount n/a'}</p></div>${badge(ctx, s.status)}</div>
    <p class="prose">${s.description}</p>
    <p class="muted"><b>${s.name}</b> · <a href="mailto:${s.email}">${s.email}</a> ${s.phone ? `· ${s.phone}` : ''} · ${f.dateTime(s.created_at)}</p>
    <form method="post" action="/admin/submissions/${s.id}" class="inline-form">${csrfField(ctx)}<label class="sr" for="ss${s.id}">Status</label><select id="ss${s.id}" name="status">${['new', 'reviewing', 'accepted', 'declined'].map((x) => html`<option ${sel(s.status, x)}>${x}</option>`)}</select><button class="btn btn-ghost btn-sm">Update</button>
    ${s.status === 'accepted' ? html`<a class="btn btn-gold btn-sm" href="/admin/assets/new?from=${s.id}">Create asset from this</a>` : ''}</form>
  </article>`) : html`<div class="panel empty"><p>No submissions yet.</p></div>`}</section>`;
  return page(ctx, 'Project submissions', '/admin/submissions', body, counts);
}

function messages(ctx, { items, counts }) {
  const f = ctx.f;
  const body = html`<section class="cards-list">${items.length ? items.map((m) => html`<article class="panel sub-card ${m.status === 'new' ? 'unread' : ''}">
    <div class="panel-head"><div><h2>${m.subject || '(no subject)'}</h2><p class="muted">${m.name} · <a href="mailto:${m.email}">${m.email}</a> · ${f.dateTime(m.created_at)}</p></div>${badge(ctx, m.status)}</div>
    <p class="prose">${m.body}</p>
    <div class="btn-row"><a class="btn btn-gold btn-sm" href="mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message'))}">Reply by email</a>
    ${m.status !== 'read' ? html`<form method="post" action="/admin/messages/${m.id}" class="inline">${csrfField(ctx)}<input type="hidden" name="status" value="read"><button class="btn btn-ghost btn-sm">Mark read</button></form>` : ''}
    ${m.status !== 'archived' ? html`<form method="post" action="/admin/messages/${m.id}" class="inline">${csrfField(ctx)}<input type="hidden" name="status" value="archived"><button class="btn btn-ghost btn-sm">Archive</button></form>` : ''}</div>
  </article>`) : html`<div class="panel empty"><p>No messages.</p></div>`}</section>`;
  return page(ctx, 'Messages', '/admin/messages', body, counts);
}

function outbox(ctx, { items, counts, subscribers }) {
  const f = ctx.f;
  const body = html`
<div class="notice notice-info">${icon('send', 18)}<div><b>No email provider connected</b><p>Emails are stored here. Connect SMTP or an email API in <code>src/services/ledger.js → sendMail()</code> to deliver them. Newsletter subscribers: <b>${subscribers}</b> · <a class="link" href="/admin/subscribers.csv">export CSV</a></p></div></div>
<section class="cards-list">${items.length ? items.map((m) => html`<article class="panel sub-card"><div class="panel-head"><div><h2>${m.subject}</h2><p class="muted">To ${m.to_email} · ${f.dateTime(m.created_at)}</p></div></div><pre class="mail">${m.body}</pre></article>`) : html`<div class="panel empty"><p>Outbox is empty.</p></div>`}</section>`;
  return page(ctx, 'Email outbox', '/admin/outbox', body, counts);
}

function audit(ctx, { items, counts, pageInfo }) {
  const f = ctx.f;
  const body = html`<section class="panel"><div class="table-scroll"><table class="table">
  <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
  <tbody>${items.map((a) => html`<tr><td><small>${f.dateTime(a.created_at)}</small></td><td>${a.actor || 'system'}</td><td><code>${a.action}</code></td><td class="num">${a.target}</td><td><small class="clip">${a.details}</small></td></tr>`)}</tbody></table></div>
  ${pagination(ctx, pageInfo)}</section>`;
  return page(ctx, 'Audit log', '/admin/audit', body, counts);
}

module.exports = { overview, assetsList, assetForm, reservationsList, usersList, userDetail, withdrawals, payouts, submissions, messages, outbox, audit };
