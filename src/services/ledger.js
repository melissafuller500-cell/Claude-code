'use strict';
// All money-moving operations live here and run inside DB transactions.
const crypto = require('crypto');
const { q, tx, now } = require('../db');
const config = require('../config');
const assets = require('./assets');
const { payMethods } = require('../data/catalog');

class UserError extends Error {
  constructor(en, fr) { super(en); this.fr = fr || en; this.status = 400; this.userFacing = true; }
}
const msg = (err, lang) => (lang === 'fr' && err.fr ? err.fr : err.message);

function audit(actorId, action, target = '', details = '') {
  q.run('INSERT INTO audit (actor_id, action, target, details, created_at) VALUES (?,?,?,?,?)', actorId || null, action, String(target), typeof details === 'string' ? details : JSON.stringify(details), now());
}
function notify(userId, title, body = '', link = '') {
  q.run('INSERT INTO notifications (user_id,title,body,link,created_at) VALUES (?,?,?,?,?)', userId, title, body, link, now());
}
// No email provider is wired in: messages are written to the outbox table (visible in Admin → Outbox).
// Plug an SMTP/API provider into this one function to send for real.
function sendMail(to, subject, body) {
  q.run('INSERT INTO outbox (to_email, subject, body, created_at) VALUES (?,?,?,?)', to, subject, body, now());
  if (!config.isProd) console.log(`[mail] to=${to} subject="${subject}"`);
}

function newRef() {
  return 'INR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ---------- reservations ----------
function reserve(user, assetId, amountUsd, method) {
  return tx(() => {
    const a = assets.byId(assetId);
    if (!a || a.status !== 'open') throw new UserError('This project is not open for reservations.', "Ce projet n'est pas ouvert aux réservations.");
    if (!payMethods[method]) throw new UserError('Choose a payment method.', 'Choisissez un moyen de paiement.');
    const amount = Math.round(Number(amountUsd) * 100);
    if (!Number.isFinite(amount) || amount <= 0) throw new UserError('Enter a valid amount.', 'Saisissez un montant valide.');
    if (amount < a.min_usd * 100) throw new UserError(`The minimum for this project is $${a.min_usd}.`, `Le minimum pour ce projet est de ${a.min_usd} $.`);
    if (amount > 5_000_000_00) throw new UserError('Amount too large for an online reservation. Contact us.', 'Montant trop élevé pour une réservation en ligne. Contactez-nous.');
    if (amount > a.remaining_cents) {
      const left = Math.floor(a.remaining_cents / 100);
      throw new UserError(`Only $${left} is left to reserve on this project.`, `Il ne reste que ${left} $ à réserver sur ce projet.`);
    }
    const open = q.get("SELECT COUNT(*) n FROM reservations WHERE user_id = ? AND status = 'pending'", user.id).n;
    if (open >= 10) throw new UserError('You have 10 pending reservations. Pay or cancel some first.', 'Vous avez 10 réservations en attente. Réglez-en ou annulez-en d’abord.');
    const ref = newRef();
    const t = now();
    const r = q.run('INSERT INTO reservations (ref,user_id,asset_id,amount_cents,pay_method,status,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)',
      ref, user.id, a.id, amount, method, 'pending', t, t + config.reservationHoldHours * 36e5);
    notify(user.id, `Reservation ${ref} created`, `${a.title_en}: hold valid ${config.reservationHoldHours}h. Follow the payment instructions to confirm.`, `/dashboard/reservations/${ref}`);
    sendMail(user.email, `Your reservation ${ref}`, `Hello ${user.name},\n\nYou reserved $${(amount / 100).toFixed(2)} in "${a.title_en}". Your hold is valid for ${config.reservationHoldHours} hours.\nReference: ${ref}\n\nInvest n Returns`);
    audit(user.id, 'reservation.create', ref, { asset: a.slug, amount });
    // Auto-mark as funded when fully committed.
    return { id: Number(r.lastInsertRowid), ref };
  });
}

function cancelReservation(user, ref) {
  return tx(() => {
    const r = q.get('SELECT * FROM reservations WHERE ref = ? AND user_id = ?', ref, user.id);
    if (!r) throw new UserError('Reservation not found.', 'Réservation introuvable.');
    if (r.status !== 'pending') throw new UserError('Only pending reservations can be cancelled.', 'Seules les réservations en attente peuvent être annulées.');
    q.run("UPDATE reservations SET status='cancelled', decided_at=? WHERE id=?", now(), r.id);
    audit(user.id, 'reservation.cancel', ref);
  });
}

function confirmReservation(admin, id, { force = false } = {}) {
  return tx(() => {
    assets.expireStale();
    const r = q.get('SELECT r.*, u.kyc_status, u.email, u.name FROM reservations r JOIN users u ON u.id = r.user_id WHERE r.id = ?', Number(id));
    if (!r) throw new UserError('Reservation not found.');
    if (r.status !== 'pending') throw new UserError(`Reservation is ${r.status}, not pending.`);
    if (r.kyc_status !== 'verified' && !force) throw new UserError('Investor identity (KYC) is not verified yet. Verify the user first.');
    const a = assets.byId(r.asset_id);
    q.run("UPDATE reservations SET status='active', decided_at=? WHERE id=?", now(), r.id);
    q.run("INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,method,details,created_at) VALUES (?,?,?,?,?,?,?,?)",
      r.user_id, 'deposit', r.amount_cents, 'completed', r.id, r.pay_method, `Funding ${r.ref} · ${a.title_en}`, now());
    const after = assets.byId(r.asset_id);
    if (after.raised_cents >= after.goal_usd * 100 && after.status === 'open') {
      q.run("UPDATE assets SET status='funded', updated_at=? WHERE id=?", now(), after.id);
    }
    notify(r.user_id, `Payment received · ${r.ref}`, `Your investment in ${a.title_en} is now active. Returns start accruing this week.`, `/dashboard/reservations/${r.ref}`);
    sendMail(r.email, `Investment active · ${r.ref}`, `Hello ${r.name},\n\nWe received your payment. Your investment of $${(r.amount_cents / 100).toFixed(2)} in "${a.title_en}" is now active.\n\nInvest n Returns`);
    audit(admin.id, 'reservation.confirm', r.ref);
  });
}

function rejectReservation(admin, id, note = '') {
  return tx(() => {
    const r = q.get('SELECT * FROM reservations WHERE id = ?', Number(id));
    if (!r) throw new UserError('Reservation not found.');
    if (r.status !== 'pending') throw new UserError(`Reservation is ${r.status}, not pending.`);
    q.run("UPDATE reservations SET status='rejected', note=?, decided_at=? WHERE id=?", String(note).slice(0, 500), now(), r.id);
    notify(r.user_id, `Reservation ${r.ref} rejected`, note || 'Contact support for details.', `/dashboard/reservations/${r.ref}`);
    audit(admin.id, 'reservation.reject', r.ref, note);
  });
}

// Close an active position: return capital to balance.
function completeReservation(admin, id) {
  return tx(() => {
    const r = q.get('SELECT * FROM reservations WHERE id = ?', Number(id));
    if (!r) throw new UserError('Reservation not found.');
    if (r.status !== 'active') throw new UserError('Only active investments can be completed.');
    q.run("UPDATE reservations SET status='completed', decided_at=? WHERE id=?", now(), r.id);
    q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', r.amount_cents, r.user_id);
    q.run("INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,details,created_at) VALUES (?,?,?,?,?,?,?)",
      r.user_id, 'refund', r.amount_cents, 'completed', r.id, `Capital returned · ${r.ref}`, now());
    notify(r.user_id, `Investment ${r.ref} completed`, 'Your capital has been returned to your balance.', '/dashboard/wallet');
    audit(admin.id, 'reservation.complete', r.ref);
  });
}

// ---------- payouts ----------
function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 864e5 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const weeklyCents = (amountCents, rate) => Math.floor((amountCents * rate) / 100 / 52);

function runWeeklyPayout(admin, { week = isoWeek() } = {}) {
  return tx(() => {
    if (q.get('SELECT id FROM payout_runs WHERE week = ?', week)) throw new UserError(`Payouts for ${week} were already credited.`);
    const rows = q.all(`SELECT r.id, r.ref, r.user_id, r.amount_cents, a.target_rate, a.title_en
      FROM reservations r JOIN assets a ON a.id = r.asset_id
      WHERE r.status = 'active' AND a.target_rate IS NOT NULL AND a.target_rate > 0`);
    let total = 0;
    const perUser = new Map();
    for (const r of rows) {
      const c = weeklyCents(r.amount_cents, r.target_rate);
      if (c <= 0) continue;
      total += c;
      q.run('UPDATE reservations SET paid_out_cents = paid_out_cents + ? WHERE id = ?', c, r.id);
      q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', c, r.user_id);
      q.run("INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,details,created_at) VALUES (?,?,?,?,?,?,?)",
        r.user_id, 'payout', c, 'completed', r.id, `Weekly payout ${week} · ${r.title_en}`, now());
      perUser.set(r.user_id, (perUser.get(r.user_id) || 0) + c);
    }
    for (const [uid, c] of perUser) notify(uid, `Weekly payout ${week}`, `$${(c / 100).toFixed(2)} was credited to your balance.`, '/dashboard/wallet');
    q.run('INSERT INTO payout_runs (week, actor_id, total_cents, count, created_at) VALUES (?,?,?,?,?)', week, admin ? admin.id : null, total, rows.length, now());
    audit(admin && admin.id, 'payout.run', week, { total, count: rows.length });
    return { week, total, count: rows.length, investors: perUser.size };
  });
}

// ---------- withdrawals (balance is held at request time, refunded if rejected) ----------
function requestWithdrawal(user, amountUsd, method, destination) {
  return tx(() => {
    const amount = Math.round(Number(amountUsd) * 100);
    if (!Number.isFinite(amount) || amount < 1000) throw new UserError('Minimum withdrawal is $10.', 'Retrait minimum : 10 $.');
    if (!payMethods[method]) throw new UserError('Choose a withdrawal method.', 'Choisissez un moyen de retrait.');
    const dest = String(destination || '').trim();
    if (dest.length < 4 || dest.length > 140) throw new UserError('Enter the wallet address, phone number or IBAN to pay.', "Indiquez l'adresse, le numéro ou l'IBAN de destination.");
    const fresh = q.get('SELECT balance_cents, kyc_status FROM users WHERE id = ?', user.id);
    if (fresh.kyc_status !== 'verified') throw new UserError('Verify your identity before withdrawing.', "Vérifiez votre identité avant tout retrait.");
    if (amount > fresh.balance_cents) throw new UserError('Amount exceeds your available balance.', 'Montant supérieur à votre solde disponible.');
    q.run('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?', amount, user.id);
    q.run("INSERT INTO transactions (user_id,type,amount_cents,status,method,details,created_at) VALUES (?,?,?,?,?,?,?)",
      user.id, 'withdrawal', -amount, 'pending', method, dest, now());
    audit(user.id, 'withdrawal.request', '', { amount, method });
  });
}

function decideWithdrawal(admin, txId, approve, note = '') {
  return tx(() => {
    const t = q.get("SELECT * FROM transactions WHERE id = ? AND type = 'withdrawal'", Number(txId));
    if (!t) throw new UserError('Withdrawal not found.');
    if (t.status !== 'pending') throw new UserError('Withdrawal already processed.');
    if (approve) {
      q.run("UPDATE transactions SET status='completed', decided_at=? WHERE id=?", now(), t.id);
      notify(t.user_id, 'Withdrawal sent', `$${(-t.amount_cents / 100).toFixed(2)} is on its way.`, '/dashboard/wallet');
    } else {
      q.run("UPDATE transactions SET status='rejected', decided_at=?, details = details || ? WHERE id=?", now(), note ? ` · ${String(note).slice(0, 200)}` : '', t.id);
      q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', -t.amount_cents, t.user_id);
      notify(t.user_id, 'Withdrawal rejected', note || 'The amount was returned to your balance.', '/dashboard/wallet');
    }
    audit(admin.id, approve ? 'withdrawal.approve' : 'withdrawal.reject', String(t.id), note);
  });
}

function adjustBalance(admin, userId, amountUsd, reason) {
  return tx(() => {
    const amount = Math.round(Number(amountUsd) * 100);
    if (!Number.isFinite(amount) || amount === 0) throw new UserError('Enter a non-zero amount.');
    const u = q.get('SELECT balance_cents FROM users WHERE id = ?', Number(userId));
    if (!u) throw new UserError('User not found.');
    if (u.balance_cents + amount < 0) throw new UserError('Adjustment would make the balance negative.');
    q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', amount, Number(userId));
    q.run("INSERT INTO transactions (user_id,type,amount_cents,status,details,created_at) VALUES (?,?,?,?,?,?)", Number(userId), 'adjustment', amount, 'completed', String(reason || 'Manual adjustment').slice(0, 200), now());
    audit(admin.id, 'balance.adjust', String(userId), { amount, reason });
  });
}

// ---------- portfolio summary for a user ----------
function portfolio(userId) {
  assets.expireStale();
  const rows = q.all(`SELECT r.*, a.slug, a.title_en, a.title_fr, a.category, a.target_rate, a.target_multiple, a.term_months, a.payout_freq, a.city, a.country_code, a.risk
    FROM reservations r JOIN assets a ON a.id = r.asset_id WHERE r.user_id = ? ORDER BY r.created_at DESC`, userId);
  const active = rows.filter((r) => r.status === 'active');
  const invested = active.reduce((s, r) => s + r.amount_cents, 0);
  const pending = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount_cents, 0);
  const annualYield = active.reduce((s, r) => s + (r.target_rate ? (r.amount_cents * r.target_rate) / 100 : 0), 0);
  const paidOut = q.get("SELECT COALESCE(SUM(amount_cents),0) v FROM transactions WHERE user_id = ? AND type='payout'", userId).v;
  const byCat = {};
  for (const r of active) byCat[r.category] = (byCat[r.category] || 0) + r.amount_cents;
  // Accrual counter starts at the user's last payout, or when their first position went active.
  const lastPay = q.get("SELECT MAX(created_at) v FROM transactions WHERE user_id = ? AND type='payout'", userId).v;
  const firstActive = active.reduce((m, r) => Math.min(m, r.decided_at || r.created_at), Infinity);
  const lastPayoutAt = lastPay || (Number.isFinite(firstActive) ? firstActive : null);
  return { rows, active, invested, pending, annualYield, weekly: Math.floor(annualYield / 52), paidOut, byCat, lastPayoutAt };
}

module.exports = {
  UserError, msg, audit, notify, sendMail, reserve, cancelReservation, confirmReservation, rejectReservation,
  completeReservation, runWeeklyPayout, requestWithdrawal, decideWithdrawal, adjustBalance, portfolio, isoWeek, weeklyCents,
};
