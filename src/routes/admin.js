'use strict';
const express = require('express');
const crypto = require('crypto');
const { q, now } = require('../db');
const config = require('../config');
const sec = require('../security');
const assets = require('../services/assets');
const ledger = require('../services/ledger');
const views = require('../views/admin/admin');
const { countries, payoutFreq, fx } = require('../data/catalog');

const router = express.Router();
router.use(sec.requireAdmin);
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); res.locals.counts = counts(); next(); });

const str = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
const PAGE = 25;

function counts() {
  assets.expireStale();
  return {
    pendingRes: q.get("SELECT COUNT(*) n FROM reservations WHERE status='pending'").n,
    pendingKyc: q.get("SELECT COUNT(*) n FROM users WHERE kyc_status='pending'").n,
    pendingWd: q.get("SELECT COUNT(*) n FROM transactions WHERE type='withdrawal' AND status='pending'").n,
    newSub: q.get("SELECT COUNT(*) n FROM submissions WHERE status='new'").n,
    newMsg: q.get("SELECT COUNT(*) n FROM messages WHERE status='new'").n,
  };
}

// Wrap a mutating action: run it, flash the outcome, redirect back.
const act = (fn, back) => (req, res) => {
  try {
    const okMsg = fn(req, res);
    res.flash('ok', okMsg || 'Done.');
  } catch (e) {
    if (!e.userFacing) throw e;
    res.flash('error', e.message);
  }
  res.redirect(303, typeof back === 'function' ? back(req) : back);
};

router.get('/', (req, res) => {
  const k = {
    aum: q.get("SELECT COALESCE(SUM(amount_cents),0) v FROM reservations WHERE status='active'").v,
    investors: q.get("SELECT COUNT(*) n FROM users WHERE role='investor'").n,
    verified: q.get("SELECT COUNT(*) n FROM users WHERE role='investor' AND kyc_status='verified'").n,
    newWeek: q.get("SELECT COUNT(*) n FROM users WHERE created_at > ?", now() - 7 * 864e5).n,
    pendingAmt: q.get("SELECT COALESCE(SUM(amount_cents),0) v FROM reservations WHERE status='pending'").v,
    paidOut: q.get("SELECT COALESCE(SUM(amount_cents),0) v FROM transactions WHERE type='payout'").v,
    balances: q.get('SELECT COALESCE(SUM(balance_cents),0) v FROM users').v,
  };
  const start = now() - 29 * 864e5;
  const rows = q.all("SELECT created_at, amount_cents FROM reservations WHERE created_at >= ? AND status IN ('pending','active','completed')", start);
  const daily = [];
  for (let i = 0; i < 30; i++) {
    const d0 = new Date(start + i * 864e5); d0.setHours(0, 0, 0, 0);
    const d1 = d0.getTime() + 864e5;
    daily.push({ x: d0.getTime(), y: rows.filter((r) => r.created_at >= d0.getTime() && r.created_at < d1).reduce((s, r) => s + r.amount_cents, 0) / 100 });
  }
  const byCat = q.all("SELECT a.category, SUM(r.amount_cents) v FROM reservations r JOIN assets a ON a.id = r.asset_id WHERE r.status='active' GROUP BY a.category ORDER BY v DESC")
    .map((r) => ({ label: assets.catByCode[r.category] ? assets.catByCode[r.category].name.en : r.category, value: r.v / 100, code: r.category }));
  const recent = q.all('SELECT a.*, u.email actor FROM audit a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 12');
  const pendingRes = q.all("SELECT r.ref, r.amount_cents, u.name, a.title_en FROM reservations r JOIN users u ON u.id=r.user_id JOIN assets a ON a.id=r.asset_id WHERE r.status='pending' ORDER BY r.created_at DESC LIMIT 5");
  const pendingKyc = q.all("SELECT id, name, email, country FROM users WHERE kyc_status='pending' ORDER BY created_at DESC LIMIT 5");
  res.page(views.overview(res.ctx(), { k, counts: res.locals.counts, daily, byCat, recent, pendingRes, pendingKyc }));
});

// ---------- assets ----------
router.get('/assets', (req, res) => {
  const filter = ['open', 'funded', 'closed', 'draft'].includes(req.query.status) ? req.query.status : 'all';
  const items = assets.list({ status: filter === 'all' ? 'all' : [filter], sort: 'newest' });
  res.page(views.assetsList(res.ctx(), { items, counts: res.locals.counts, filter }));
});
router.get('/assets/new', (req, res) => {
  let a = { status: 'draft' };
  const sub = req.query.from ? q.get('SELECT * FROM submissions WHERE id = ?', Number(req.query.from)) : null;
  if (sub) a = { ...a, title_en: sub.company || sub.name, title_fr: sub.company || sub.name, city: sub.city, summary_en: sub.description.slice(0, 380), summary_fr: '', description_en: sub.description };
  res.page(views.assetForm(res.ctx(), { a, counts: res.locals.counts }));
});

function parseAsset(body, existing) {
  const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : NaN; };
  const lines = (v) => JSON.stringify(String(v || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 12).map((s) => s.slice(0, 120)));
  const d = {
    title_en: str(body.title_en, 120), title_fr: str(body.title_fr, 120), category: str(body.category, 2),
    status: ['draft', 'open', 'funded', 'closed'].includes(body.status) ? body.status : 'draft', featured: body.featured === '1' ? 1 : 0,
    city: str(body.city, 80), region: str(body.region, 80), country_code: str(body.country_code, 2),
    currency: fx[body.currency] ? body.currency : 'USD', goal_local: Math.round(num(body.goal_local)),
    target_rate: str(body.target_rate) === '' ? null : num(body.target_rate), target_multiple: str(body.target_multiple) === '' ? null : num(body.target_multiple),
    term_months: Math.round(num(body.term_months)), payout_freq: payoutFreq[body.payout_freq] ? body.payout_freq : 'monthly', risk: Math.round(num(body.risk)),
    min_usd: Math.round(num(body.min_usd)), offline_raised_usd: Math.round(num(body.offline_raised_usd || 0)),
    summary_en: str(body.summary_en, 400), summary_fr: str(body.summary_fr, 400), description_en: str(body.description_en, 6000), description_fr: str(body.description_fr, 6000),
    highlights_en: lines(body.highlights_en), highlights_fr: lines(body.highlights_fr), slugInput: str(body.slug, 80).toLowerCase(),
  };
  const errs = [];
  if (d.title_en.length < 3 || d.title_fr.length < 3) errs.push('Both titles are required.');
  if (!assets.catByCode[d.category]) errs.push('Choose an asset class.');
  if (!d.city) errs.push('City is required.');
  if (!countries[d.country_code]) errs.push('Choose a country.');
  if (!(d.goal_local > 0)) errs.push('Funding goal must be a positive number.');
  if (d.target_rate == null && d.target_multiple == null) errs.push('Set a target annual return or a target multiple.');
  if (d.target_rate != null && !(d.target_rate > 0 && d.target_rate <= 100)) errs.push('Target return must be between 0 and 100%.');
  if (d.target_multiple != null && !(d.target_multiple > 1 && d.target_multiple <= 50)) errs.push('Target multiple must be between 1 and 50.');
  if (!(d.term_months >= 1 && d.term_months <= 240)) errs.push('Term must be 1–240 months.');
  if (!(d.risk >= 1 && d.risk <= 5)) errs.push('Risk must be 1–5.');
  if (!(d.min_usd >= 1)) errs.push('Minimum investment must be at least 1 USD.');
  if (!(d.offline_raised_usd >= 0)) errs.push('Offline raised must be 0 or more.');
  if (!d.summary_en || !d.summary_fr) errs.push('Both summaries are required.');
  if (d.slugInput && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slugInput)) errs.push('Slug may contain only lowercase letters, numbers and hyphens.');
  d.goal_usd = Math.max(1, Math.round(d.goal_local / (fx[d.currency] || 1)));
  if (d.offline_raised_usd > d.goal_usd) errs.push('Offline raised cannot exceed the goal.');
  if (!d.description_en) d.description_en = d.summary_en;
  if (!d.description_fr) d.description_fr = d.summary_fr;
  d.slug = assets.uniqueSlug(d.slugInput || (existing && existing.slug) || `${d.title_en} ${d.city.split(',')[0]}`, existing && existing.id);
  return { d, errs };
}
const COLS = ['slug', 'category', 'title_en', 'title_fr', 'summary_en', 'summary_fr', 'description_en', 'description_fr', 'highlights_en', 'highlights_fr', 'city', 'region', 'country_code', 'currency', 'goal_local', 'goal_usd', 'offline_raised_usd', 'target_rate', 'target_multiple', 'term_months', 'payout_freq', 'risk', 'min_usd', 'status', 'featured'];

router.post('/assets', (req, res) => {
  const { d, errs } = parseAsset(req.body);
  if (errs.length) return res.page(views.assetForm(res.ctx(), { a: { ...req.body, ...d, highlights_en: d.highlights_en, highlights_fr: d.highlights_fr }, counts: res.locals.counts, error: errs.join(' ') }), 422);
  const r = q.run(`INSERT INTO assets (${COLS.join(',')}, created_at, updated_at) VALUES (${COLS.map(() => '?').join(',')}, ?, ?)`, ...COLS.map((c) => d[c]), now(), now());
  ledger.audit(req.user.id, 'asset.create', d.slug);
  res.flash('ok', `Asset "${d.title_en}" created.`);
  res.redirect(303, `/admin/assets/${r.lastInsertRowid}/edit`);
});
router.get('/assets/:id/edit', (req, res, next) => {
  const a = q.get('SELECT * FROM assets WHERE id = ?', Number(req.params.id));
  if (!a) return next();
  res.page(views.assetForm(res.ctx(), { a, counts: res.locals.counts }));
});
router.post('/assets/:id', (req, res, next) => {
  const existing = q.get('SELECT * FROM assets WHERE id = ?', Number(req.params.id));
  if (!existing) return next();
  const { d, errs } = parseAsset(req.body, existing);
  if (errs.length) return res.page(views.assetForm(res.ctx(), { a: { ...existing, ...req.body, highlights_en: d.highlights_en, highlights_fr: d.highlights_fr }, counts: res.locals.counts, error: errs.join(' ') }), 422);
  q.run(`UPDATE assets SET ${COLS.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...COLS.map((c) => d[c]), now(), existing.id);
  ledger.audit(req.user.id, 'asset.update', d.slug);
  res.flash('ok', 'Asset saved.');
  res.redirect(303, `/admin/assets/${existing.id}/edit`);
});
router.post('/assets/:id/delete', act((req) => {
  const id = Number(req.params.id);
  if (q.get('SELECT 1 FROM reservations WHERE asset_id = ? LIMIT 1', id)) throw new ledger.UserError('This asset has reservations. Set it to "closed" instead.');
  const a = q.get('SELECT slug FROM assets WHERE id = ?', id);
  if (!a) throw new ledger.UserError('Asset not found.');
  q.run('DELETE FROM assets WHERE id = ?', id);
  ledger.audit(req.user.id, 'asset.delete', a.slug);
  return 'Asset deleted.';
}, '/admin/assets'));

// ---------- reservations ----------
router.get('/reservations', (req, res) => {
  assets.expireStale();
  const valid = ['pending', 'active', 'completed', 'rejected', 'cancelled', 'expired', 'all'];
  const filter = valid.includes(req.query.status) ? req.query.status : 'pending';
  const search = str(req.query.q, 60);
  const where = [];
  const p = [];
  if (filter !== 'all') { where.push('r.status = ?'); p.push(filter); }
  if (search) { where.push('(r.ref LIKE ? OR u.email LIKE ? OR u.name LIKE ? OR a.title_en LIKE ?)'); const s = `%${search.replace(/[%_]/g, '')}%`; p.push(s, s, s, s); }
  const items = q.all(`SELECT r.*, u.name, u.email, u.kyc_status, a.title_en FROM reservations r JOIN users u ON u.id = r.user_id JOIN assets a ON a.id = r.asset_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.created_at DESC LIMIT 200`, ...p);
  res.page(views.reservationsList(res.ctx(), { items, counts: res.locals.counts, filter, search }));
});
const backRes = (req) => sec.safeNext(req.get('referer') ? safePath(req.get('referer')) : '', '/admin/reservations');
router.post('/reservations/:id/confirm', act((req) => { ledger.confirmReservation(req.user, req.params.id, { force: req.body.force === '1' }); return 'Payment confirmed. Investment is now active.'; }, backRes));
router.post('/reservations/:id/reject', act((req) => { ledger.rejectReservation(req.user, req.params.id, str(req.body.note, 500)); return 'Reservation rejected.'; }, backRes));
router.post('/reservations/:id/complete', act((req) => { ledger.completeReservation(req.user, req.params.id); return 'Investment completed and capital returned.'; }, backRes));

function safePath(ref) {
  try { const u = new URL(ref, config.siteUrl); return u.pathname + u.search; } catch { return ''; }
}

// ---------- users ----------
router.get('/users', (req, res) => {
  const filter = ['all', 'pending', 'verified', 'none', 'rejected', 'admin', 'suspended'].includes(req.query.kyc) ? req.query.kyc : 'all';
  const search = str(req.query.q, 60);
  const page = Math.max(1, Number(req.query.page) || 1);
  const where = [];
  const p = [];
  if (['pending', 'verified', 'none', 'rejected'].includes(filter)) { where.push('u.kyc_status = ?'); p.push(filter); }
  if (filter === 'admin') where.push("u.role = 'admin'");
  if (filter === 'suspended') where.push("u.status = 'suspended'");
  if (search) { where.push('(u.email LIKE ? OR u.name LIKE ?)'); const s = `%${search.replace(/[%_]/g, '')}%`; p.push(s, s); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = q.get(`SELECT COUNT(*) n FROM users u ${w}`, ...p).n;
  const items = q.all(`SELECT u.*, COALESCE((SELECT SUM(amount_cents) FROM reservations r WHERE r.user_id = u.id AND r.status='active'),0) invested FROM users u ${w} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, ...p, PAGE, (page - 1) * PAGE);
  const base = `/admin/users?kyc=${filter}${search ? '&q=' + encodeURIComponent(search) : ''}`;
  res.page(views.usersList(res.ctx(), { items, counts: res.locals.counts, filter, search, pageInfo: { page, pages: Math.ceil(total / PAGE), base } }));
});
router.get('/users/:id', (req, res, next) => {
  const u = q.get('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!u) return next();
  let kyc = {};
  try { kyc = JSON.parse(u.kyc_data || '{}'); } catch { kyc = {}; }
  const resv = q.all('SELECT r.*, a.title_en FROM reservations r JOIN assets a ON a.id = r.asset_id WHERE r.user_id = ? ORDER BY r.created_at DESC', u.id);
  const txs = q.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', u.id);
  res.page(views.userDetail(res.ctx(), { u, kyc, res: resv, txs, counts: res.locals.counts, isSelf: u.id === req.user.id }));
});
const backUser = (req) => `/admin/users/${Number(req.params.id)}`;
router.post('/users/:id/kyc', act((req) => {
  const u = q.get('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!u) throw new ledger.UserError('User not found.');
  const decision = req.body.decision === 'verified' ? 'verified' : 'rejected';
  const note = str(req.body.note, 300);
  q.run('UPDATE users SET kyc_status = ?, kyc_note = ? WHERE id = ?', decision, decision === 'rejected' ? note : '', u.id);
  ledger.notify(u.id, decision === 'verified' ? 'Identity verified' : 'Identity check: action needed', decision === 'verified' ? 'You can now activate investments and withdraw.' : note || 'Please review your details and resubmit.', '/dashboard/kyc');
  ledger.sendMail(u.email, decision === 'verified' ? 'Your identity is verified' : 'Identity verification: action needed', `Hello ${u.name},\n\n${decision === 'verified' ? 'Your identity has been verified. You can now activate investments and withdraw.' : 'We could not verify your identity. ' + (note || 'Please review your details and resubmit.')}\n\nInvest n Returns`);
  ledger.audit(req.user.id, 'kyc.' + decision, u.email, note);
  return decision === 'verified' ? 'Identity verified.' : 'KYC rejected; the investor was notified.';
}, backUser));
router.post('/users/:id/role', act((req) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new ledger.UserError('You cannot change your own role.');
  const role = req.body.role === 'admin' ? 'admin' : 'investor';
  q.run('UPDATE users SET role = ? WHERE id = ?', role, id);
  ledger.audit(req.user.id, 'user.role', String(id), role);
  return `Role set to ${role}.`;
}, backUser));
router.post('/users/:id/status', act((req) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new ledger.UserError('You cannot suspend yourself.');
  const status = req.body.status === 'suspended' ? 'suspended' : 'active';
  q.run('UPDATE users SET status = ? WHERE id = ?', status, id);
  if (status === 'suspended') sec.destroyAllSessions(id);
  ledger.audit(req.user.id, 'user.status', String(id), status);
  return status === 'suspended' ? 'Account suspended and signed out.' : 'Account reactivated.';
}, backUser));
router.post('/users/:id/reset', act((req) => {
  const u = q.get('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!u) throw new ledger.UserError('User not found.');
  const token = crypto.randomBytes(32).toString('base64url');
  q.run('INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,?)', sec.sha256(token), u.id, now() + 24 * 36e5);
  ledger.sendMail(u.email, 'Reset your Invest n Returns password', `Hello ${u.name},\n\nAn administrator sent you a password reset link (valid 24h):\n${config.siteUrl}/reset-password?token=${token}`);
  ledger.audit(req.user.id, 'user.reset_link', u.email);
  return 'Reset link queued in the email outbox.';
}, backUser));
router.post('/users/:id/adjust', act((req) => {
  ledger.adjustBalance(req.user, req.params.id, String(req.body.amount || '').replace(/[^0-9.\-]/g, ''), str(req.body.reason, 200));
  return 'Balance adjusted.';
}, backUser));

// ---------- withdrawals ----------
router.get('/withdrawals', (req, res) => {
  const base = "SELECT t.*, u.name, u.email FROM transactions t JOIN users u ON u.id = t.user_id WHERE t.type = 'withdrawal'";
  res.page(views.withdrawals(res.ctx(), {
    pending: q.all(`${base} AND t.status = 'pending' ORDER BY t.created_at ASC`),
    recent: q.all(`${base} AND t.status != 'pending' ORDER BY t.created_at DESC LIMIT 30`),
    counts: res.locals.counts,
  }));
});
router.post('/withdrawals/:id', act((req) => {
  const approve = req.body.decision === 'approve';
  ledger.decideWithdrawal(req.user, req.params.id, approve, str(req.body.note, 200));
  return approve ? 'Withdrawal marked as sent.' : 'Withdrawal rejected; funds returned to balance.';
}, '/admin/withdrawals'));

// ---------- payouts ----------
router.get('/payouts', (req, res) => {
  const week = ledger.isoWeek();
  const rows = q.all("SELECT r.user_id, r.amount_cents, a.target_rate FROM reservations r JOIN assets a ON a.id = r.asset_id WHERE r.status='active' AND a.target_rate > 0");
  const preview = { count: rows.length, investors: new Set(rows.map((r) => r.user_id)).size, total: rows.reduce((s, r) => s + ledger.weeklyCents(r.amount_cents, r.target_rate), 0) };
  const runs = q.all('SELECT * FROM payout_runs ORDER BY created_at DESC LIMIT 52');
  res.page(views.payouts(res.ctx(), { preview, runs, week, done: !!q.get('SELECT 1 FROM payout_runs WHERE week = ?', week), counts: res.locals.counts }));
});
router.post('/payouts/run', act((req) => {
  const r = ledger.runWeeklyPayout(req.user);
  return `Credited $${(r.total / 100).toFixed(2)} across ${r.count} positions to ${r.investors} investors for ${r.week}.`;
}, '/admin/payouts'));

// ---------- submissions, messages, outbox, audit ----------
router.get('/submissions', (req, res) => res.page(views.submissions(res.ctx(), { items: q.all("SELECT * FROM submissions ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, created_at DESC LIMIT 200"), counts: res.locals.counts })));
router.post('/submissions/:id', act((req) => {
  const status = ['new', 'reviewing', 'accepted', 'declined'].includes(req.body.status) ? req.body.status : 'reviewing';
  q.run('UPDATE submissions SET status = ? WHERE id = ?', status, Number(req.params.id));
  ledger.audit(req.user.id, 'submission.status', String(req.params.id), status);
  return 'Submission updated.';
}, '/admin/submissions'));

router.get('/messages', (req, res) => res.page(views.messages(res.ctx(), { items: q.all("SELECT * FROM messages ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'read' THEN 1 ELSE 2 END, created_at DESC LIMIT 200"), counts: res.locals.counts })));
router.post('/messages/:id', act((req) => {
  const status = ['new', 'read', 'archived'].includes(req.body.status) ? req.body.status : 'read';
  q.run('UPDATE messages SET status = ? WHERE id = ?', status, Number(req.params.id));
  return 'Message updated.';
}, '/admin/messages'));

router.get('/outbox', (req, res) => res.page(views.outbox(res.ctx(), { items: q.all('SELECT * FROM outbox ORDER BY id DESC LIMIT 100'), counts: res.locals.counts, subscribers: q.get('SELECT COUNT(*) n FROM subscribers').n })));
router.get('/subscribers.csv', (req, res) => {
  const rows = q.all('SELECT email, lang, created_at FROM subscribers ORDER BY created_at DESC');
  const csv = ['email,lang,subscribed_at', ...rows.map((r) => `"${r.email.replace(/"/g, '""')}",${r.lang},${new Date(r.created_at).toISOString()}`)].join('\r\n');
  res.set('Content-Disposition', 'attachment; filename="subscribers.csv"').type('text/csv').send(csv);
});

router.get('/audit', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const total = q.get('SELECT COUNT(*) n FROM audit').n;
  const items = q.all('SELECT a.*, u.email actor FROM audit a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 50 OFFSET ?', (page - 1) * 50);
  res.page(views.audit(res.ctx(), { items, counts: res.locals.counts, pageInfo: { page, pages: Math.ceil(total / 50), base: '/admin/audit' } }));
});

module.exports = router;
