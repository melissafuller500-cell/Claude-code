'use strict';
const express = require('express');
const { q, now } = require('../db');
const sec = require('../security');
const assets = require('../services/assets');
const ledger = require('../services/ledger');
const views = require('../views/app/user');
const { countries } = require('../data/catalog');

const router = express.Router();
router.use(sec.requireAuth);
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

const unread = (uid) => q.get('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read = 0', uid).n;
const str = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
const fresh = (req) => q.get('SELECT * FROM users WHERE id = ?', req.user.id);
const wantsJson = (req) => (req.get('accept') || '').includes('application/json');

router.get('/', (req, res) => {
  const ctx = res.ctx();
  const user = fresh(req);
  const pf = ledger.portfolio(user.id);
  const recentTx = {
    latest: q.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 6', user.id),
    payoutsAsc: q.all("SELECT amount_cents, created_at FROM transactions WHERE user_id = ? AND type = 'payout' ORDER BY created_at ASC", user.id),
  };
  const held = new Set(pf.rows.filter((r) => ['active', 'pending'].includes(r.status)).map((r) => r.asset_id));
  const featured = assets.list({ sort: 'funded' }).filter((a) => a.status === 'open' && !held.has(a.id)).slice(0, 5);
  res.page(views.overview(ctx, { pf, user, recentTx, featured, unread: unread(user.id) }));
});

router.get('/reservations', (req, res) => {
  const filter = ['all', 'active', 'pending', 'closed'].includes(req.query.status) ? req.query.status : 'all';
  res.page(views.reservations(res.ctx(), { pf: ledger.portfolio(req.user.id), unread: unread(req.user.id), filter }));
});

router.get('/reservations/:ref', (req, res, next) => {
  assets.expireStale();
  const r = q.get(`SELECT r.*, a.slug, a.title_en, a.title_fr, a.category, a.target_rate, a.target_multiple, a.term_months, a.payout_freq, a.city, a.country_code
    FROM reservations r JOIN assets a ON a.id = r.asset_id WHERE r.ref = ? AND r.user_id = ?`, str(req.params.ref, 20), req.user.id);
  if (!r) return next();
  res.page(views.reservationDetail(res.ctx(), { r, unread: unread(req.user.id), user: fresh(req) }));
});

router.post('/reserve/:slug', (req, res) => {
  const ctx = res.ctx();
  const a = assets.bySlug(req.params.slug);
  const back = a ? ctx.u('/assets/' + a.slug) + '#reserve' : ctx.u('/assets');
  if (!a) return res.redirect(303, ctx.u('/assets'));
  if (req.body.consent !== '1') {
    res.flash('error', ctx.t('Please confirm you understand the risks.', 'Merci de confirmer que vous comprenez les risques.'));
    return res.redirect(303, back);
  }
  try {
    const amount = Number(String(req.body.amount || '').replace(/[^0-9.]/g, ''));
    const { ref } = ledger.reserve(req.user, a.id, amount, str(req.body.method, 10));
    res.flash('ok', ctx.t(`Reservation ${ref} created. Your share is held for 72 hours.`, `Réservation ${ref} créée. Votre part est bloquée 72 heures.`));
    res.redirect(303, `/dashboard/reservations/${ref}`);
  } catch (e) {
    if (!e.userFacing) throw e;
    res.flash('error', ledger.msg(e, ctx.lang));
    res.redirect(303, back);
  }
});

router.post('/reservations/:ref/cancel', (req, res) => {
  const ctx = res.ctx();
  try {
    ledger.cancelReservation(req.user, str(req.params.ref, 20));
    res.flash('ok', ctx.t('Reservation cancelled.', 'Réservation annulée.'));
  } catch (e) {
    if (!e.userFacing) throw e;
    res.flash('error', ledger.msg(e, ctx.lang));
  }
  res.redirect(303, '/dashboard/reservations');
});

router.get('/watchlist', (req, res) => {
  const ids = new Set(q.all('SELECT asset_id FROM watchlist WHERE user_id = ?', req.user.id).map((r) => r.asset_id));
  const items = assets.list({ status: 'all' }).filter((a) => ids.has(a.id) && a.status !== 'draft');
  res.page(views.watchlist(res.ctx(), { items, unread: unread(req.user.id) }));
});

// JSON toggle used by the heart buttons (falls back to redirect without JS).
router.post('/watchlist/:slug', (req, res) => {
  const a = assets.bySlug(req.params.slug);
  if (!a) return res.status(404).json({ ok: false });
  const exists = q.get('SELECT 1 FROM watchlist WHERE user_id = ? AND asset_id = ?', req.user.id, a.id);
  if (exists) q.run('DELETE FROM watchlist WHERE user_id = ? AND asset_id = ?', req.user.id, a.id);
  else q.run('INSERT INTO watchlist (user_id, asset_id, created_at) VALUES (?,?,?)', req.user.id, a.id, now());
  if (wantsJson(req)) return res.json({ ok: true, saved: !exists });
  let back = '/dashboard/watchlist';
  try { back = sec.safeNext(new URL(req.get('referer') || '', 'http://x').pathname, back); } catch { /* keep default */ }
  res.redirect(303, back);
});

function renderWallet(req, res, error, status = 200) {
  const user = fresh(req);
  const txs = q.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', user.id);
  const pendingWd = q.get("SELECT COALESCE(SUM(amount_cents),0) v FROM transactions WHERE user_id = ? AND type='withdrawal' AND status='pending'", user.id).v;
  res.page(views.wallet(res.ctx(), { user, txs, unread: unread(user.id), pendingWd, error }), status);
}
router.get('/wallet', (req, res) => renderWallet(req, res));
router.post('/wallet/withdraw', (req, res) => {
  const ctx = res.ctx();
  try {
    const amount = Number(String(req.body.amount || '').replace(/[^0-9.]/g, ''));
    ledger.requestWithdrawal(req.user, amount, str(req.body.method, 10), str(req.body.destination, 140));
    res.flash('ok', ctx.t('Withdrawal requested. We will process it within 3 business days.', 'Retrait demandé. Traitement sous 3 jours ouvrés.'));
    res.redirect(303, '/dashboard/wallet');
  } catch (e) {
    if (!e.userFacing) throw e;
    renderWallet(req, res, ledger.msg(e, ctx.lang), 422);
  }
});
router.get('/wallet.csv', (req, res) => {
  const rows = q.all('SELECT created_at, type, amount_cents, status, method, details FROM transactions WHERE user_id = ? ORDER BY created_at DESC', req.user.id);
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // prevent CSV formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = ['date,type,amount_usd,status,method,details', ...rows.map((r) => [new Date(r.created_at).toISOString(), r.type, (r.amount_cents / 100).toFixed(2), r.status, r.method, r.details].map(cell).join(','))].join('\r\n');
  res.set('Content-Disposition', 'attachment; filename="invest-n-returns-transactions.csv"').type('text/csv').send(csv);
});

router.get('/kyc', (req, res) => res.page(views.kyc(res.ctx(), { user: fresh(req), unread: unread(req.user.id) })));
router.post('/kyc', (req, res) => {
  const ctx = res.ctx();
  const t = ctx.t;
  const user = fresh(req);
  if (!['none', 'rejected'].includes(user.kyc_status)) return res.redirect(303, '/dashboard/kyc');
  const d = {
    legalName: str(req.body.legalName, 120), dob: str(req.body.dob, 10), idType: str(req.body.idType, 20), idNumber: str(req.body.idNumber, 40),
    idCountry: str(req.body.idCountry, 2), occupation: str(req.body.occupation, 80), address: str(req.body.address, 200), source: str(req.body.source, 20),
  };
  const dob = Date.parse(d.dob);
  const adult = Number.isFinite(dob) && dob < Date.now() - 18 * 365.25 * 864e5 && dob > Date.parse('1900-01-01');
  let error = null;
  if (d.legalName.length < 3 || !d.idNumber || !d.address) error = t('Please complete all required fields.', 'Merci de compléter tous les champs obligatoires.');
  else if (!adult) error = t('You must be at least 18 years old.', 'Vous devez avoir au moins 18 ans.');
  else if (!['national_id', 'passport', 'residence', 'driver'].includes(d.idType)) error = t('Choose an ID document type.', "Choisissez un type de pièce d'identité.");
  else if (!countries[d.idCountry]) error = t('Choose the issuing country.', 'Choisissez le pays de délivrance.');
  else if (!['salary', 'business', 'savings', 'investments', 'other'].includes(d.source)) error = t('Choose your source of funds.', "Choisissez l'origine des fonds.");
  else if (req.body.confirm !== '1') error = t('Please confirm your details are accurate.', 'Merci de confirmer l’exactitude de vos informations.');
  if (error) return res.page(views.kyc(ctx, { user: { ...user, kyc_data: JSON.stringify(d) }, unread: unread(user.id), error }), 422);
  q.run("UPDATE users SET kyc_status='pending', kyc_data=?, kyc_note='' WHERE id=?", JSON.stringify(d), user.id);
  ledger.audit(user.id, 'kyc.submit');
  res.flash('ok', t('Details submitted. We will review them within one business day.', 'Informations soumises. Vérification sous un jour ouvré.'));
  res.redirect(303, '/dashboard/kyc');
});

router.get('/notifications', (req, res) => {
  const items = q.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', req.user.id);
  const n = unread(req.user.id);
  res.page(views.notifications(res.ctx(), { items, unread: n }));
});
router.post('/notifications/read', (req, res) => {
  q.run('UPDATE notifications SET read = 1 WHERE user_id = ?', req.user.id);
  res.redirect(303, '/dashboard/notifications');
});

function renderProfile(req, res, extra = {}, status = 200) {
  const current = sec.sha256(req.cookies.inr_sid || '');
  const sessions = q.all('SELECT id, ip, ua, created_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC', req.user.id, now()).map((s) => ({ ...s, current: s.id === current }));
  res.page(views.profile(res.ctx(), { user: fresh(req), sessions, unread: unread(req.user.id), ...extra }), status);
}
router.get('/profile', (req, res) => renderProfile(req, res));
router.post('/profile', (req, res) => {
  const ctx = res.ctx();
  const name = str(req.body.name, 100);
  const country = str(req.body.country, 2).toUpperCase();
  const lang = req.body.lang === 'fr' ? 'fr' : 'en';
  if (name.length < 2) return renderProfile(req, res, { error: ctx.t('Please enter your name.', 'Merci d’indiquer votre nom.') }, 422);
  q.run('UPDATE users SET name=?, phone=?, country=?, lang=? WHERE id=?', name, str(req.body.phone, 40), countries[country] || country === 'OT' ? country : req.user.country, lang, req.user.id);
  res.cookie('inr_lang', lang, { sameSite: 'lax', path: '/', maxAge: 365 * 864e5 });
  res.flash('ok', lang === 'fr' ? 'Profil enregistré.' : 'Profile saved.');
  res.redirect(303, '/dashboard/profile');
});
router.post('/password', sec.rateLimit({ windowMs: 15 * 60e3, max: 10 }), (req, res) => {
  const ctx = res.ctx();
  const user = fresh(req);
  if (!sec.verifyPassword(String(req.body.current || ''), user.password_hash)) return renderProfile(req, res, { pwError: ctx.t('Current password is incorrect.', 'Mot de passe actuel incorrect.') }, 422);
  const err = sec.passwordProblem(String(req.body.password || ''), ctx.t);
  if (err) return renderProfile(req, res, { pwError: err }, 422);
  q.run('UPDATE users SET password_hash = ? WHERE id = ?', sec.hashPassword(String(req.body.password)), user.id);
  // Keep this session, revoke the others.
  q.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', user.id, sec.sha256(req.cookies.inr_sid || ''));
  ledger.audit(user.id, 'auth.change_password');
  res.flash('ok', ctx.t('Password updated. Other devices were signed out.', 'Mot de passe modifié. Les autres appareils ont été déconnectés.'));
  res.redirect(303, '/dashboard/profile');
});
router.post('/sessions/revoke', (req, res) => {
  q.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', req.user.id, sec.sha256(req.cookies.inr_sid || ''));
  res.flash('ok', res.ctx().t('Other devices signed out.', 'Autres appareils déconnectés.'));
  res.redirect(303, '/dashboard/profile');
});

module.exports = router;
