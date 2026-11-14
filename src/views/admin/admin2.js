'use strict';
// Admin screens for payments, conversations, proposals, announcements and settings.
const { html, raw } = require('../../html');
const { appPage } = require('../layout');
const { icon, badge, csrfField } = require('../components');
const { countries, payMethods, payoutSchedules } = require('../../data/catalog');
const { chatBubble } = require('../app/user');

const page = (ctx, title, active, body) => appPage(ctx, { title, area: 'admin', active, body });
const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');
const schedLabel = (f) => (payoutSchedules[f] ? payoutSchedules[f].en : f === 'exit' ? 'At exit' : f);

function reservationDetail(ctx, { r, defaultDetails, thread }) {
  const f = ctx.f;
  const rate = r.rate_override != null ? r.rate_override : r.target_rate;
  const per = rate && payoutSchedules[r.payout_freq] ? Math.floor((r.amount_cents * rate) / 100 / payoutSchedules[r.payout_freq].perYear) : 0;
  const body = html`
<a class="back" href="/admin/reservations?status=${r.status}">← Reservations</a>
<section class="panel res-head">
  <div><p class="eyebrow num">${r.ref}</p><h2 class="h-lg">${r.title_en}</h2>
    <p class="muted"><a href="/admin/users/${r.user_id}">${r.name}</a> · ${r.email} · KYC ${r.kyc_status}</p></div>
  <div class="ta-r">${badge(ctx, r.status)}<p class="big-num num">${f.usd(r.amount_cents, 0)}</p></div>
</section>
<section class="panel-grid">
  <div class="panel">
    <div class="panel-head"><h2>Terms</h2></div>
    <dl class="facts">
      <dt>Payment method</dt><dd>${payMethods[r.pay_method] ? payMethods[r.pay_method].label : r.pay_method}</dd>
      <dt>Return</dt><dd class="num hl">${rate ? rate + '% / yr' : (r.target_multiple || '—') + '×'}${r.rate_override != null ? html` <em class="badge badge-featured">custom (project ${r.target_rate}%)</em>` : ''}</dd>
      <dt>Payout schedule</dt><dd>${schedLabel(r.payout_freq)}${per ? ` · ${f.usd(per)} each` : ''}</dd>
      ${r.next_payout_at ? html`<dt>Next payout</dt><dd>${f.dateTime(r.next_payout_at)}</dd>` : ''}
      <dt>Paid out</dt><dd class="num pos">${f.usd(r.paid_out_cents)}</dd>
      <dt>Created</dt><dd>${f.dateTime(r.created_at)}</dd>
      ${r.status === 'pending' ? html`<dt>Hold expires</dt><dd>${r.paid_at ? 'never (payment declared)' : f.dateTime(r.expires_at)}</dd>` : ''}
      ${r.paid_ref ? html`<dt>Investor's payment ref</dt><dd><code>${r.paid_ref}</code><br><small>${f.dateTime(r.paid_at)}</small></dd>` : ''}
      ${r.proposal_id ? html`<dt>From proposal</dt><dd>#${r.proposal_id}</dd>` : ''}
    </dl>
    ${r.status === 'pending' ? html`<div class="btn-row">
      <form method="post" action="/admin/reservations/${r.id}/confirm" class="inline" data-confirm="Confirm you received ${f.usd(r.amount_cents)} for ${r.ref}?">${csrfField(ctx)}${r.kyc_status !== 'verified' ? html`<input type="hidden" name="force" value="1">` : ''}<button class="btn btn-gold btn-sm">${icon('check', 14)} ${r.kyc_status === 'verified' ? 'Payment received — activate' : 'Activate (override KYC)'}</button></form>
      <form method="post" action="/admin/reservations/${r.id}/reject" class="inline" data-prompt="Reason for rejection (sent to investor):" data-prompt-field="note">${csrfField(ctx)}<input type="hidden" name="note" value=""><button class="btn btn-ghost btn-sm danger">Reject</button></form></div>` : ''}
    ${r.status === 'active' ? html`<div class="btn-row"><form method="post" action="/admin/reservations/${r.id}/complete" class="inline" data-confirm="Close ${r.ref} and return ${f.usd(r.amount_cents)} capital to the investor's balance?">${csrfField(ctx)}<button class="btn btn-ghost btn-sm">Complete &amp; return capital</button></form></div>` : ''}

    ${['pending', 'active'].includes(r.status) && r.target_rate != null ? html`
    <h3 class="mt">Change return % or payout schedule</h3>
    <form method="post" action="/admin/reservations/${r.id}/terms" class="stack" data-confirm="Apply new terms to ${r.ref}? The investor is notified.">${csrfField(ctx)}
      <div class="grid-2">
        <div class="field"><label for="t-rate">Annual return % (project default ${r.target_rate}%)</label><input id="t-rate" name="rate" inputmode="decimal" value="${rate}"></div>
        <div class="field"><label for="t-freq">Payout schedule</label><select id="t-freq" name="payout_freq">${Object.entries(payoutSchedules).map(([k, s]) => html`<option value="${k}" ${sel(r.payout_freq, k)}>${s.en}</option>`)}</select></div>
      </div>
      <div class="field"><label for="t-why">Reason (shown to investor)</label><input id="t-why" name="reason" maxlength="300" placeholder="e.g. Loyalty bonus +1 pt"></div>
      <button class="btn btn-ghost btn-sm" type="submit">Update terms</button>
    </form>` : ''}
  </div>
  <div class="panel">
    ${r.status === 'pending' ? html`
    <div class="panel-head"><h2>${icon('send', 18)} Send payment details</h2>${r.pay_details_at ? html`<span class="badge badge-active">sent ${f.dateTime(r.pay_details_at)}</span>` : html`<span class="badge badge-pending">not sent</span>`}</div>
    <p class="muted">The investor chose <b>${payMethods[r.pay_method] ? payMethods[r.pay_method].label : r.pay_method}</b>. They receive these details on their reservation page, by message and by email, and get a fresh 72-hour window.</p>
    <form method="post" action="/admin/reservations/${r.id}/details" class="stack">${csrfField(ctx)}
      <label class="sr" for="pd">Payment details</label>
      <textarea id="pd" name="details" rows="7" required maxlength="2000" placeholder="${{ usdt: 'USDT TRC-20 address: T…', usdc: 'USDC ERC-20 address: 0x…', btc: 'BTC address: bc1…', eth: 'ETH address: 0x…', momo: 'MTN MoMo: +237 6xx xx xx xx (Name)', orange: 'Orange Money: +237 6xx xx xx xx (Name)', bank: 'Bank / IBAN / SWIFT / Account name', card: 'Secure card payment link: https://…' }[r.pay_method] || ''}">${r.pay_details || defaultDetails}</textarea>
      <button class="btn btn-gold" type="submit">${icon('send', 16)} ${r.pay_details_at ? 'Resend payment details' : 'Send payment details'}</button>
      ${defaultDetails && !r.pay_details ? html`<p class="fine-sm">Pre-filled from Settings → default ${payMethods[r.pay_method].label} details.</p>` : ''}
    </form>` : ''}
    <div class="panel-head mt"><h2>Conversation</h2><a class="link" href="/admin/inbox/${r.user_id}">Open inbox ${icon('arrow', 14)}</a></div>
    <div class="chat chat-sm">${thread.length ? thread.map((m) => chatBubble(ctx, { ...m, user_name: r.name }, 'admin')) : html`<p class="muted">No messages yet.</p>`}</div>
  </div>
</section>`;
  return page(ctx, `Reservation ${r.ref}`, '/admin/reservations', body);
}

function inbox(ctx, { rows, filter, search }) {
  const f = ctx.f;
  const body = html`
<div class="toolbar">
  <div class="seg"><a href="?filter=all" aria-selected="${filter === 'all' ? 'true' : 'false'}">All conversations</a><a href="?filter=unread" aria-selected="${filter === 'unread' ? 'true' : 'false'}">Unread</a></div>
  <form method="get" class="search-mini"><input type="hidden" name="filter" value="${filter}"><label class="sr" for="is">Search</label><input id="is" name="q" value="${search}" placeholder="Name or email"><button class="btn btn-ghost btn-sm">Search</button></form>
  <a class="btn btn-gold btn-sm" href="/admin/broadcast">${icon('send', 14)} New announcement</a>
</div>
<section class="panel"><ul class="inbox-list">${rows.length ? rows.map((r) => html`<li class="${r.unread ? 'unread' : ''}"><a href="/admin/inbox/${r.id}">
  <span class="avatar sm">${(r.name || '?').charAt(0).toUpperCase()}</span>
  <span class="ib-main"><b>${r.name}</b> <small>${r.email}</small><span class="ib-last">${r.last_sender === 'admin' ? 'You: ' : ''}${String(r.last_body || '').slice(0, 140)}</span></span>
  <span class="ib-side"><small>${f.dateTime(r.last_at)}</small>${r.unread ? html`<em class="count">${r.unread}</em>` : ''}</span></a></li>`) : html`<li class="muted center">No conversations yet. Start one from a user's page.</li>`}</ul></section>`;
  return page(ctx, 'Inbox', '/admin/inbox', body);
}

function conversation(ctx, { u, items, pending, active }) {
  const f = ctx.f;
  const body = html`
<a class="back" href="/admin/inbox">← Inbox</a>
<section class="panel-grid">
  <div class="panel chat-panel">
    <div class="panel-head"><h2>${u.name}</h2><a class="link" href="/admin/users/${u.id}">Profile ${icon('arrow', 14)}</a></div>
    <div class="chat" data-chat>${items.length ? items.map((m) => chatBubble(ctx, { ...m, user_name: u.name }, 'admin')) : html`<p class="muted center">No messages yet.</p>`}</div>
    <form method="post" action="/admin/inbox/${u.id}" class="chat-form" data-validate novalidate>${csrfField(ctx)}
      <label class="sr" for="ab">Message</label>
      <textarea id="ab" name="body" rows="3" required maxlength="5000" placeholder="Write to ${u.name}… (also emailed)" data-enter-submit></textarea>
      <button class="btn btn-gold" type="submit">${icon('send', 16)} Send</button>
    </form>
  </div>
  <div class="panel">
    <div class="panel-head"><h2>Investor</h2>${badge(ctx, u.kyc_status)}</div>
    <dl class="facts"><dt>Email</dt><dd>${u.email}</dd><dt>Phone</dt><dd>${u.phone || '—'}</dd><dt>Country</dt><dd>${countries[u.country] ? countries[u.country].en : u.country || '—'}</dd><dt>Balance</dt><dd class="num">${f.usd(u.balance_cents)}</dd></dl>
    <div class="btn-row"><a class="btn btn-ghost btn-sm" href="/admin/proposals/new?user=${u.id}">${icon('briefcase', 14)} Send a proposal</a><a class="btn btn-ghost btn-sm" href="/admin/users/${u.id}#fund">${icon('wallet', 14)} Fund account</a></div>
    ${pending.length ? html`<h3 class="mt">Awaiting payment</h3><ul class="mini-list">${pending.map((r) => html`<li><a href="/admin/reservations/${r.id}"><b class="num">${r.ref}</b> ${f.usd(r.amount_cents, 0)} · ${r.title_en} ${r.paid_at ? html`<em class="badge badge-active">paid?</em>` : r.pay_details_at ? html`<em class="badge">details sent</em>` : html`<em class="badge badge-pending">send details</em>`}</a></li>`)}</ul>` : ''}
    ${active.length ? html`<h3 class="mt">Active investments</h3><ul class="mini-list">${active.map((r) => html`<li><a href="/admin/reservations/${r.id}"><b class="num">${r.ref}</b> ${f.usd(r.amount_cents, 0)} · ${r.title_en} · ${r.rate_override != null ? r.rate_override : r.target_rate}%</a></li>`)}</ul>` : ''}
  </div>
</section>`;
  return page(ctx, `Conversation · ${u.name}`, '/admin/inbox', body);
}

function broadcast(ctx, { segments, countryCodes, counts, error, values = {} }) {
  const body = html`
<section class="panel">
  <div class="panel-head"><h2>Send an announcement</h2></div>
  <p class="muted">The message appears in each investor's Messages and notifications. Tick "email" to also queue an email.</p>
  <form method="post" action="/admin/broadcast" class="form-grid" data-confirm="Send this announcement now?">${csrfField(ctx)}
    ${error ? html`<p class="error show full" role="alert">${error}</p>` : ''}
    <div class="field"><label for="b-seg">Audience</label><select id="b-seg" name="segment">${Object.entries(segments).map(([k, s]) => html`<option value="${k}" ${sel(values.segment, k)}>${s.label} (${counts[k]})</option>`)}</select></div>
    <div class="field"><label for="b-cc">Country (optional)</label><select id="b-cc" name="country"><option value="">All countries</option>${countryCodes.map((c) => html`<option value="${c}" ${sel(values.country, c)}>${countries[c] ? countries[c].en : c}</option>`)}</select></div>
    <div class="field full"><label for="b-t">Title</label><input id="b-t" name="title" required maxlength="120" value="${values.title || ''}" placeholder="New project open: Solar farm, 5 MW"></div>
    <div class="field full"><label for="b-b">Message</label><textarea id="b-b" name="body" required rows="7" maxlength="5000">${values.body || ''}</textarea></div>
    <label class="consent full"><input type="checkbox" name="email" value="1" ${values.email ? raw('checked') : ''}> <span>Also send by email</span></label>
    <div class="form-actions"><button class="btn btn-gold" type="submit">${icon('send', 16)} Send announcement</button></div>
  </form>
</section>`;
  return page(ctx, 'Announcements', '/admin/broadcast', body);
}

function proposals(ctx, { items, filter }) {
  const f = ctx.f;
  const body = html`
<div class="toolbar">
  <div class="seg">${['pending', 'accepted', 'declined', 'expired', 'withdrawn', 'all'].map((s) => html`<a href="?status=${s}" aria-selected="${filter === s ? 'true' : 'false'}">${s}</a>`)}</div>
  <a class="btn btn-gold btn-sm" href="/admin/proposals/new">${icon('plus', 14)} New proposal</a>
</div>
<section class="panel"><div class="table-scroll"><table class="table">
  <thead><tr><th>Investor</th><th>Project</th><th class="ta-r">Amount</th><th>Return</th><th>Payouts</th><th>Expires</th><th>Status</th><th></th></tr></thead>
  <tbody>${items.length ? items.map((p) => html`<tr>
    <td><a href="/admin/users/${p.user_id}"><b>${p.name}</b></a><br><small>${p.email}</small></td>
    <td>${p.title_en}</td><td class="ta-r num">${f.usd(p.amount_cents, 0)}</td>
    <td class="num hl">${p.rate != null ? p.rate + '%' : 'equity'}</td><td>${schedLabel(p.payout_freq)}</td>
    <td><small>${f.dateTime(p.expires_at)}</small></td><td>${badge(ctx, p.status)}${p.ref ? html`<br><small class="num">${p.ref}</small>` : ''}</td>
    <td class="ta-r">${p.status === 'pending' ? html`<form method="post" action="/admin/proposals/${p.id}/withdraw" class="inline" data-confirm="Withdraw this proposal?">${csrfField(ctx)}<button class="btn btn-ghost btn-xs danger">Withdraw</button></form>` : ''}</td>
  </tr>`) : html`<tr><td colspan="8" class="muted center">No proposals.</td></tr>`}</tbody></table></div></section>`;
  return page(ctx, 'Investment proposals', '/admin/proposals', body);
}

function proposalForm(ctx, { users, assetsList, values = {}, error }) {
  const body = html`
<a class="back" href="/admin/proposals">← Proposals</a>
<section class="panel">
  <div class="panel-head"><h2>New personal investment proposal</h2></div>
  <p class="muted">The investor gets it in Offers, Messages and by email, and can accept with one click (paying by balance, crypto or cash). You can set a custom return. Always keep it honest: returns are targets.</p>
  <form method="post" action="/admin/proposals" class="form-grid" data-proposal>${csrfField(ctx)}
    ${error ? html`<p class="error show full" role="alert">${error}</p>` : ''}
    <div class="field"><label for="p-user">Investor</label><select id="p-user" name="user_id" required><option value="">—</option>${users.map((u) => html`<option value="${u.id}" ${sel(values.user_id, u.id)}>${u.name} · ${u.email}${u.kyc_status !== 'verified' ? ' (KYC ' + u.kyc_status + ')' : ''} · bal $${(u.balance_cents / 100).toFixed(0)}</option>`)}</select></div>
    <div class="field"><label for="p-asset">Project</label><select id="p-asset" name="asset_id" required><option value="">—</option>${assetsList.map((a) => html`<option value="${a.id}" data-rate="${a.target_rate || ''}" data-min="${a.min_usd}" ${sel(values.asset_id, a.id)}>${a.title_en} · ${a.city} · ${a.target_rate ? a.target_rate + '%' : a.target_multiple + '×'} · min $${a.min_usd}</option>`)}</select></div>
    <div class="field"><label for="p-amt">Amount (USD)</label><input id="p-amt" name="amount" inputmode="decimal" required value="${values.amount || '1000'}"></div>
    <div class="field"><label for="p-rate">Annual return % (empty = project rate)</label><input id="p-rate" name="rate" inputmode="decimal" value="${values.rate || ''}" placeholder="e.g. 14"></div>
    <div class="field"><label for="p-freq">Payout schedule</label><select id="p-freq" name="payout_freq">${Object.entries(payoutSchedules).map(([k, s]) => html`<option value="${k}" ${sel(values.payout_freq || 'monthly', k)}>${s.en}</option>`)}</select></div>
    <div class="field"><label for="p-days">Valid for (days)</label><input id="p-days" name="days" inputmode="numeric" value="${values.days || '7'}"></div>
    <div class="field full"><label for="p-msg">Personal message</label><textarea id="p-msg" name="message" rows="4" maxlength="2000" placeholder="Dear …, based on your interest in energy projects…">${values.message || ''}</textarea></div>
    <div class="form-actions"><button class="btn btn-gold" type="submit">${icon('send', 16)} Send proposal</button></div>
  </form>
</section>`;
  return page(ctx, 'New proposal', '/admin/proposals', body);
}

function settingsPage(ctx, { settings, errors = [], smtpOk, preview }) {
  const field = (f) => {
    const id = 's-' + f.key;
    const stored = settings.get(f.key, '');
    if (f.type === 'bool') return html`<label class="consent full"><input type="checkbox" name="${f.key}" value="1" ${settings.get(f.key) === '1' ? raw('checked') : ''}> <span>${f.label}</span></label>`;
    const help = f.help ? html`<small class="fhelp">${f.help}</small>` : '';
    if (f.type === 'textarea') return html`<div class="field full"><label for="${id}">${f.label}</label><textarea id="${id}" name="${f.key}" rows="3" maxlength="2000">${stored}</textarea>${help}</div>`;
    if (f.type === 'secret') return html`<div class="field"><label for="${id}">${f.label}</label><input id="${id}" name="${f.key}" type="password" autocomplete="new-password" placeholder="${stored ? '•••••••• saved — leave empty to keep' : 'Not set'}">${help}</div>`;
    const t = { email: 'email', url: 'url', tel: 'tel' }[f.type] || 'text';
    return html`<div class="field"><label for="${id}">${f.label}</label><input id="${id}" name="${f.key}" type="${t}" value="${stored || (f.key === 'site_url' ? settings.siteUrl() : '')}" placeholder="${f.def || ''}" maxlength="300">${help}</div>`;
  };
  const body = html`
${errors.length ? html`<div class="notice notice-warn">${icon('shield', 18)}<div><b>Some values were not saved</b><p>${errors.join(' · ')}</p></div></div>` : ''}
<div class="settings-layout">
  <nav class="settings-nav panel" aria-label="Settings sections">${settings.SCHEMA.map((sec) => html`<a href="#sec-${sec.id}">${sec.title}</a>`)}</nav>
  <form method="post" action="/admin/settings" class="settings-form">${csrfField(ctx)}
    ${settings.SCHEMA.map((sec) => html`<section class="panel form-grid" id="sec-${sec.id}">
      <div class="full"><h2>${sec.title}</h2>${sec.help ? html`<p class="muted">${sec.help}</p>` : ''}</div>
      ${sec.fields.map(field)}
      ${sec.id === 'general' ? html`<p class="fine-sm full">WhatsApp button: ${preview.whatsapp ? html`<a class="link" href="${preview.whatsapp}" target="_blank" rel="noopener">test the link</a>` : 'hidden until a WhatsApp number is saved.'}</p>` : ''}
      ${sec.id === 'mobile' || sec.id === 'bank' ? html`<details class="full"><summary>Preview the default payment details investors will receive</summary><pre class="mail">${preview.pay}</pre></details>` : ''}
      ${sec.id === 'email' ? html`<p class="fine-sm full">Status: ${smtpOk ? html`<b class="pos">SMTP configured</b>` : html`<b>not configured — emails are kept in the outbox only</b>`}</p>` : ''}
    </section>`)}
    <div class="settings-save"><button class="btn btn-gold btn-lg" type="submit">Save all settings</button></div>
  </form>
</div>
<form method="post" action="/admin/settings/test-email" class="panel inline-form" data-confirm="Send a test email to ${ctx.user.email}?">${csrfField(ctx)}
  <span><b>Test email sending</b> — sends a message to ${ctx.user.email} using the saved SMTP settings.</span>
  <button class="btn btn-ghost btn-sm" type="submit">${icon('send', 14)} Send test email</button>
</form>`;
  return page(ctx, 'Settings', '/admin/settings', body);
}

module.exports = { reservationDetail, inbox, conversation, broadcast, proposals, proposalForm, settingsPage };
