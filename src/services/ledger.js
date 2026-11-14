'use strict';
// All money-moving operations live here and run inside DB transactions.
const crypto = require('crypto');
const { q, tx, now } = require('../db');
const config = require('../config');
const assets = require('./assets');
const settings = require('./settings');
const { payMethods, payoutSchedules, payoutFreq, nextPayoutAt } = require('../data/catalog');

class UserError extends Error {
  constructor(en, fr) { super(en); this.fr = fr || en; this.status = 400; this.userFacing = true; }
}
const msg = (err, lang) => (lang === 'fr' && err.fr ? err.fr : err.message);
const usd = (cents) => `$${(cents / 100).toFixed(2)}`;

function audit(actorId, action, target = '', details = '') {
  q.run('INSERT INTO audit (actor_id, action, target, details, created_at) VALUES (?,?,?,?,?)', actorId || null, action, String(target), typeof details === 'string' ? details : JSON.stringify(details), now());
}
function notify(userId, title, body = '', link = '') {
  q.run('INSERT INTO notifications (user_id,title,body,link,created_at) VALUES (?,?,?,?,?)', userId, title, body, link, now());
}
// No email provider is wired in: messages are written to the outbox table (visible in Admin → Email outbox).
// Plug an SMTP/API provider into this one function to send for real.
function sendMail(to, subject, body) {
  q.run('INSERT INTO outbox (to_email, subject, body, created_at) VALUES (?,?,?,?)', to, subject, body, now());
  if (!config.isProd) console.log(`[mail] to=${to} subject="${subject}"`);
}
// A message in the user's conversation with the platform team.
function chat(userId, sender, body, { kind = 'message', adminId = null, reservationId = null } = {}) {
  q.run('INSERT INTO chat_messages (user_id, sender, admin_id, kind, body, reservation_id, read_by_user, read_by_admin, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    userId, sender, adminId, kind, String(body).slice(0, 5000), reservationId, sender === 'user' ? 1 : 0, sender === 'admin' ? 1 : 0, now());
}

function newRef() {
  return 'INR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

const effectiveRate = (r) => (r.rate_override != null ? r.rate_override : r.target_rate);
const periodCents = (amountCents, rate, freq) => Math.floor((amountCents * rate) / 100 / (payoutSchedules[freq] || payoutSchedules.monthly).perYear);

function validFreq(a, freq) {
  if (!a.yield_based) return 'exit';
  if (!payoutSchedules[freq]) throw new UserError('Choose how often you want to be paid.', 'Choisissez la fréquence de vos versements.');
  return freq;
}

// ---------- reservations ----------
// opts: { payoutFreq, rate (custom rate from a proposal), proposalId }
function reserve(user, assetId, amountUsd, method, opts = {}) {
  return tx(() => {
    const a = assets.byId(assetId);
    if (!a || a.status !== 'open') throw new UserError('This project is not open for reservations.', "Ce projet n'est pas ouvert aux réservations.");
    if (!payMethods[method]) throw new UserError('Choose a payment method.', 'Choisissez un moyen de paiement.');
    const freq = validFreq(a, opts.payoutFreq || 'monthly');
    const amount = Math.round(Number(amountUsd) * 100);
    if (!Number.isFinite(amount) || amount <= 0) throw new UserError('Enter a valid amount.', 'Saisissez un montant valide.');
    if (amount < a.min_usd * 100) throw new UserError(`The minimum for this project is $${a.min_usd}.`, `Le minimum pour ce projet est de ${a.min_usd} $.`);
    if (amount > 5_000_000_00) throw new UserError('Amount too large for an online reservation. Contact us.', 'Montant trop élevé pour une réservation en ligne. Contactez-nous.');
    if (amount > a.remaining_cents) {
      const left = Math.floor(a.remaining_cents / 100);
      throw new UserError(`Only $${left} is left to reserve on this project.`, `Il ne reste que ${left} $ à réserver sur ce projet.`);
    }
    const t = now();
    const ref = newRef();
    const rate = opts.rate != null ? opts.rate : null;

    if (method === 'balance') {
      const fresh = q.get('SELECT balance_cents, kyc_status FROM users WHERE id = ?', user.id);
      if (fresh.kyc_status !== 'verified') throw new UserError('Verify your identity before investing from your balance.', 'Vérifiez votre identité avant d’investir depuis votre solde.');
      if (fresh.balance_cents < amount) throw new UserError(`Your balance (${usd(fresh.balance_cents)}) is too low. Choose another payment method.`, `Votre solde (${usd(fresh.balance_cents)}) est insuffisant. Choisissez un autre moyen de paiement.`);
      q.run('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?', amount, user.id);
      const r = q.run(`INSERT INTO reservations (ref,user_id,asset_id,amount_cents,pay_method,status,created_at,expires_at,decided_at,payout_freq,rate_override,next_payout_at,proposal_id,paid_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, ref, user.id, a.id, amount, method, 'active', t, t, t, freq, rate, a.yield_based ? nextPayoutAt(t, freq) : null, opts.proposalId || null, t);
      q.run("INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,method,details,created_at) VALUES (?,?,?,?,?,?,?,?)",
        user.id, 'deposit', amount, 'completed', Number(r.lastInsertRowid), 'balance', `Invested from balance · ${ref} · ${a.title_en}`, t);
      markFundedIfFull(a.id);
      notify(user.id, `Investment ${ref} is active`, `${usd(amount)} invested in ${a.title_en} from your balance.`, `/dashboard/reservations/${ref}`);
      audit(user.id, 'reservation.create_from_balance', ref, { asset: a.slug, amount });
      return { id: Number(r.lastInsertRowid), ref, active: true };
    }

    const open = q.get("SELECT COUNT(*) n FROM reservations WHERE user_id = ? AND status = 'pending'", user.id).n;
    if (open >= 10) throw new UserError('You have 10 pending reservations. Pay or cancel some first.', 'Vous avez 10 réservations en attente. Réglez-en ou annulez-en d’abord.');
    const r = q.run(`INSERT INTO reservations (ref,user_id,asset_id,amount_cents,pay_method,status,created_at,expires_at,payout_freq,rate_override,proposal_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, ref, user.id, a.id, amount, method, 'pending', t, t + config.reservationHoldHours * 36e5, freq, rate, opts.proposalId || null);
    const hasDetails = !!settings.payDefault(method);
    notify(user.id, `Reservation ${ref} created`, hasDetails ? 'Payment details are on your reservation page.' : 'Our team will send you the payment details shortly.', `/dashboard/reservations/${ref}`);
    chat(user.id, 'user', `New reservation ${ref}: ${usd(amount)} in "${a.title_en}", paying by ${payMethods[method].label}. ${hasDetails ? '' : 'Please send me the payment details.'}`.trim(), { kind: 'payment', reservationId: Number(r.lastInsertRowid) });
    sendMail(user.email, `Your reservation ${ref}`, `Hello ${user.name},\n\nYou reserved ${usd(amount)} in "${a.title_en}". Your hold is valid for ${config.reservationHoldHours} hours.\nReference: ${ref}\n${hasDetails ? 'Payment details are on your reservation page.' : 'Our team will send you the payment details shortly.'}\n\nInvest n Returns`);
    audit(user.id, 'reservation.create', ref, { asset: a.slug, amount, freq });
    return { id: Number(r.lastInsertRowid), ref, active: false };
  });
}

function markFundedIfFull(assetId) {
  const after = assets.byId(assetId);
  if (after && after.status === 'open' && after.raised_cents >= after.goal_usd * 100) q.run("UPDATE assets SET status='funded', updated_at=? WHERE id=?", now(), after.id);
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

// Admin sends the payment instructions that match the investor's chosen method.
function sendPaymentDetails(admin, id, details) {
  return tx(() => {
    const text = String(details || '').trim().slice(0, 2000);
    if (text.length < 4) throw new UserError('Write the payment details to send.');
    const r = q.get('SELECT r.*, u.email, u.name, a.title_en FROM reservations r JOIN users u ON u.id = r.user_id JOIN assets a ON a.id = r.asset_id WHERE r.id = ?', Number(id));
    if (!r) throw new UserError('Reservation not found.');
    if (r.status !== 'pending') throw new UserError(`Reservation is ${r.status}; payment details are only for pending reservations.`);
    const t = now();
    // Give the investor a fresh 72h window from the moment they receive the details.
    q.run('UPDATE reservations SET pay_details = ?, pay_details_at = ?, expires_at = MAX(expires_at, ?) WHERE id = ?', text, t, t + config.reservationHoldHours * 36e5, r.id);
    chat(r.user_id, 'admin', `Payment details for ${r.ref} (${usd(r.amount_cents)} · ${payMethods[r.pay_method] ? payMethods[r.pay_method].label : r.pay_method}):\n\n${text}\n\nPlease use ${r.ref} as the payment reference.`, { kind: 'payment', adminId: admin.id, reservationId: r.id });
    notify(r.user_id, `Payment details for ${r.ref}`, 'Your payment instructions are ready. Pay within 72 hours.', `/dashboard/reservations/${r.ref}`);
    sendMail(r.email, `Payment details for your reservation ${r.ref}`, `Hello ${r.name},\n\nHere is how to pay ${usd(r.amount_cents)} for "${r.title_en}":\n\n${text}\n\nReference to include: ${r.ref}\n\nInvest n Returns`);
    audit(admin.id, 'reservation.pay_details', r.ref);
  });
}

// Investor says "I have paid" and gives the transaction reference.
function declarePaid(user, ref, txRef) {
  return tx(() => {
    const r = q.get('SELECT * FROM reservations WHERE ref = ? AND user_id = ?', ref, user.id);
    if (!r) throw new UserError('Reservation not found.', 'Réservation introuvable.');
    if (r.status !== 'pending') throw new UserError('This reservation is not awaiting payment.', "Cette réservation n'attend pas de paiement.");
    const val = String(txRef || '').trim().slice(0, 200);
    if (val.length < 3) throw new UserError('Enter the transaction ID, hash or receipt number.', 'Indiquez l’ID de transaction, le hash ou le numéro de reçu.');
    q.run('UPDATE reservations SET paid_ref = ?, paid_at = ? WHERE id = ?', val, now(), r.id);
    chat(user.id, 'user', `I have paid ${usd(r.amount_cents)} for ${r.ref}. Transaction reference: ${val}`, { kind: 'payment', reservationId: r.id });
    audit(user.id, 'reservation.declare_paid', ref, val);
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
    const t = now();
    q.run("UPDATE reservations SET status='active', decided_at=?, next_payout_at=? WHERE id=?", t, a.yield_based ? nextPayoutAt(t, r.payout_freq) : null, r.id);
    q.run("INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,method,details,created_at) VALUES (?,?,?,?,?,?,?,?)",
      r.user_id, 'deposit', r.amount_cents, 'completed', r.id, r.pay_method, `Funding ${r.ref} · ${a.title_en}${r.paid_ref ? ' · ' + r.paid_ref : ''}`, t);
    markFundedIfFull(r.asset_id);
    notify(r.user_id, `Payment received · ${r.ref}`, `Your investment in ${a.title_en} is now active.`, `/dashboard/reservations/${r.ref}`);
    chat(r.user_id, 'admin', `Payment received for ${r.ref}. Your investment of ${usd(r.amount_cents)} in "${a.title_en}" is now active.`, { kind: 'payment', adminId: admin.id, reservationId: r.id });
    sendMail(r.email, `Investment active · ${r.ref}`, `Hello ${r.name},\n\nWe received your payment. Your investment of ${usd(r.amount_cents)} in "${a.title_en}" is now active.\n\nInvest n Returns`);
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
    if (note) chat(r.user_id, 'admin', `Reservation ${r.ref} was rejected: ${note}`, { adminId: admin.id, reservationId: r.id });
    audit(admin.id, 'reservation.reject', r.ref, note);
  });
}

// Close an active position: return capital to balance.
function completeReservation(admin, id) {
  return tx(() => {
    const r = q.get('SELECT * FROM reservations WHERE id = ?', Number(id));
    if (!r) throw new UserError('Reservation not found.');
    if (r.status !== 'active') throw new UserError('Only active investments can be completed.');
    q.run("UPDATE reservations SET status='completed', decided_at=?, next_payout_at=NULL WHERE id=?", now(), r.id);
    q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', r.amount_cents, r.user_id);
    q.run("INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,details,created_at) VALUES (?,?,?,?,?,?,?)",
      r.user_id, 'refund', r.amount_cents, 'completed', r.id, `Capital returned · ${r.ref}`, now());
    notify(r.user_id, `Investment ${r.ref} completed`, 'Your capital has been returned to your balance.', '/dashboard/wallet');
    audit(admin.id, 'reservation.complete', r.ref);
  });
}

// Admin changes the return rate of one investment (e.g. a loyalty bonus or a renegotiated deal).
function setInvestmentTerms(admin, id, { rate, payoutFreq, reason }) {
  return tx(() => {
    const r = q.get('SELECT r.*, a.target_rate, a.title_en FROM reservations r JOIN assets a ON a.id = r.asset_id WHERE r.id = ?', Number(id));
    if (!r) throw new UserError('Investment not found.');
    if (!['pending', 'active'].includes(r.status)) throw new UserError('Only pending or active investments can be changed.');
    if (r.target_rate == null) throw new UserError('This is an equity investment without periodic income.');
    const changes = [];
    let newRate = r.rate_override;
    if (rate !== undefined && rate !== '') {
      const n = Number(rate);
      if (!Number.isFinite(n) || n < 0 || n > 100) throw new UserError('Rate must be between 0 and 100%.');
      const prev = effectiveRate(r);
      newRate = Math.abs(n - r.target_rate) < 1e-9 ? null : n;
      if (Math.abs(n - prev) > 1e-9) changes.push(`return ${prev}% → ${n}% per year`);
    }
    let freq = r.payout_freq;
    if (payoutFreq && payoutFreq !== r.payout_freq) {
      if (!payoutSchedules[payoutFreq]) throw new UserError('Unknown payout schedule.');
      freq = payoutFreq;
      changes.push(`payouts ${payoutSchedules[r.payout_freq] ? payoutSchedules[r.payout_freq].en.toLowerCase() : r.payout_freq} → ${payoutSchedules[freq].en.toLowerCase()}`);
    }
    if (!changes.length) throw new UserError('Nothing changed.');
    const base = r.status === 'active' ? now() : null;
    q.run('UPDATE reservations SET rate_override = ?, payout_freq = ?, next_payout_at = CASE WHEN ? IS NULL THEN next_payout_at ELSE ? END WHERE id = ?',
      newRate, freq, freq !== r.payout_freq && base ? 1 : null, freq !== r.payout_freq && base ? nextPayoutAt(base, freq) : null, r.id);
    const why = String(reason || '').trim().slice(0, 300);
    const text = `Your investment ${r.ref} in "${r.title_en}" was updated: ${changes.join('; ')}.${why ? ' Reason: ' + why : ''}`;
    chat(r.user_id, 'admin', text, { adminId: admin.id, reservationId: r.id });
    notify(r.user_id, `Investment ${r.ref} updated`, changes.join('; '), `/dashboard/reservations/${r.ref}`);
    audit(admin.id, 'reservation.terms', r.ref, { changes, reason: why });
    return changes;
  });
}

// ---------- payouts: each active position pays on its own schedule ----------
function duePayouts(at = now()) {
  return q.all(`SELECT r.id, r.ref, r.user_id, r.amount_cents, r.payout_freq, r.next_payout_at, r.rate_override, a.target_rate, a.title_en
    FROM reservations r JOIN assets a ON a.id = r.asset_id
    WHERE r.status = 'active' AND r.next_payout_at IS NOT NULL AND r.next_payout_at <= ? AND COALESCE(r.rate_override, a.target_rate) > 0`, at);
}

function runDuePayouts(admin, at = now()) {
  return tx(() => {
    const rows = duePayouts(at);
    let total = 0;
    let periods = 0;
    const perUser = new Map();
    for (const r of rows) {
      const rate = effectiveRate(r);
      let next = r.next_payout_at;
      let paid = 0;
      // Catch up missed periods (max 60) if payouts were not run for a while.
      for (let i = 0; next <= at && i < 60; i++) {
        const c = periodCents(r.amount_cents, rate, r.payout_freq);
        if (c > 0) {
          q.run("INSERT INTO transactions (user_id,type,amount_cents,status,reservation_id,details,created_at) VALUES (?,?,?,?,?,?,?)",
            r.user_id, 'payout', c, 'completed', r.id, `${(payoutFreq[r.payout_freq] || {}).en || 'Scheduled'} payout · ${r.title_en}`, now());
          paid += c;
          periods++;
        }
        next = nextPayoutAt(next, r.payout_freq);
      }
      q.run('UPDATE reservations SET paid_out_cents = paid_out_cents + ?, next_payout_at = ? WHERE id = ?', paid, next, r.id);
      if (paid) {
        q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', paid, r.user_id);
        perUser.set(r.user_id, (perUser.get(r.user_id) || 0) + paid);
        total += paid;
      }
    }
    for (const [uid, c] of perUser) notify(uid, 'Payout received', `${usd(c)} was credited to your balance.`, '/dashboard/wallet');
    if (rows.length) {
      q.run('INSERT INTO payout_runs (week, actor_id, total_cents, count, created_at) VALUES (?,?,?,?,?)', `run-${now()}-${crypto.randomBytes(3).toString('hex')}`, admin ? admin.id : null, total, periods, now());
      audit(admin && admin.id, 'payout.run', '', { total, positions: rows.length, periods, auto: !admin });
    }
    return { total, positions: rows.length, periods, investors: perUser.size };
  });
}

// ---------- withdrawals (balance is held at request time, refunded if rejected) ----------
function requestWithdrawal(user, amountUsd, method, destination) {
  return tx(() => {
    const amount = Math.round(Number(amountUsd) * 100);
    if (!Number.isFinite(amount) || amount < 1000) throw new UserError('Minimum withdrawal is $10.', 'Retrait minimum : 10 $.');
    if (!payMethods[method] || method === 'balance') throw new UserError('Choose a withdrawal method.', 'Choisissez un moyen de retrait.');
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
      notify(t.user_id, 'Withdrawal sent', `${usd(-t.amount_cents)} is on its way.`, '/dashboard/wallet');
    } else {
      q.run("UPDATE transactions SET status='rejected', decided_at=?, details = details || ? WHERE id=?", now(), note ? ` · ${String(note).slice(0, 200)}` : '', t.id);
      q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', -t.amount_cents, t.user_id);
      notify(t.user_id, 'Withdrawal rejected', note || 'The amount was returned to your balance.', '/dashboard/wallet');
    }
    audit(admin.id, approve ? 'withdrawal.approve' : 'withdrawal.reject', String(t.id), note);
  });
}

// Credit (fund) or debit a user's balance, with the payment method and reference for reconciliation.
function adjustBalance(admin, userId, amountUsd, reason, { method = '', reference = '' } = {}) {
  return tx(() => {
    const amount = Math.round(Number(amountUsd) * 100);
    if (!Number.isFinite(amount) || amount === 0) throw new UserError('Enter a non-zero amount.');
    const u = q.get('SELECT id, balance_cents, email, name FROM users WHERE id = ?', Number(userId));
    if (!u) throw new UserError('User not found.');
    if (u.balance_cents + amount < 0) throw new UserError('Debit would make the balance negative.');
    const why = String(reason || '').trim().slice(0, 200);
    if (why.length < 3) throw new UserError('Give a reason (e.g. "MoMo deposit received").');
    const m = payMethods[method] && method !== 'balance' ? method : '';
    const refTxt = String(reference || '').trim().slice(0, 120);
    q.run('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?', amount, u.id);
    q.run("INSERT INTO transactions (user_id,type,amount_cents,status,method,details,created_at) VALUES (?,?,?,?,?,?,?)",
      u.id, 'adjustment', amount, 'completed', m, `${why}${refTxt ? ' · ref ' + refTxt : ''}`, now());
    if (amount > 0) {
      notify(u.id, 'Account funded', `${usd(amount)} was added to your balance. You can invest it instantly.`, '/dashboard/wallet');
      chat(u.id, 'admin', `${usd(amount)} was credited to your account balance (${why}${refTxt ? ', ref ' + refTxt : ''}). You can now invest it in any open project using "Account balance" as the payment method.`, { adminId: admin.id });
    } else {
      notify(u.id, 'Balance adjusted', `${usd(-amount)} was debited: ${why}`, '/dashboard/wallet');
    }
    audit(admin.id, amount > 0 ? 'balance.credit' : 'balance.debit', u.email, { amount, method: m, reference: refTxt, reason: why });
  });
}

// ---------- portfolio summary for a user ----------
function portfolio(userId) {
  assets.expireStale();
  const rows = q.all(`SELECT r.*, a.slug, a.title_en, a.title_fr, a.category, a.target_rate, a.target_multiple, a.term_months, a.payout_freq AS asset_payout_freq, a.city, a.country_code, a.risk, a.images
    FROM reservations r JOIN assets a ON a.id = r.asset_id WHERE r.user_id = ? ORDER BY r.created_at DESC`, userId);
  for (const r of rows) {
    r.rate = effectiveRate(r);
    r.period_cents = r.rate ? periodCents(r.amount_cents, r.rate, r.payout_freq) : 0;
  }
  const active = rows.filter((r) => r.status === 'active');
  const invested = active.reduce((s, r) => s + r.amount_cents, 0);
  const pending = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount_cents, 0);
  const annualYield = active.reduce((s, r) => s + (r.rate ? (r.amount_cents * r.rate) / 100 : 0), 0);
  const paidOut = q.get("SELECT COALESCE(SUM(amount_cents),0) v FROM transactions WHERE user_id = ? AND type='payout'", userId).v;
  const byCat = {};
  for (const r of active) byCat[r.category] = (byCat[r.category] || 0) + r.amount_cents;
  // Accrual counter starts at the user's last payout, or when their first position went active.
  const lastPay = q.get("SELECT MAX(created_at) v FROM transactions WHERE user_id = ? AND type='payout'", userId).v;
  const firstActive = active.reduce((m, r) => Math.min(m, r.decided_at || r.created_at), Infinity);
  const lastPayoutAt = lastPay || (Number.isFinite(firstActive) ? firstActive : null);
  const upcoming = active.filter((r) => r.next_payout_at && r.period_cents).sort((x, y) => x.next_payout_at - y.next_payout_at);
  const next = upcoming[0] || null;
  return { rows, active, invested, pending, annualYield, weekly: Math.floor(annualYield / 52), paidOut, byCat, lastPayoutAt, next };
}

module.exports = {
  UserError, msg, audit, notify, sendMail, chat, reserve, cancelReservation, sendPaymentDetails, declarePaid,
  confirmReservation, rejectReservation, completeReservation, setInvestmentTerms, duePayouts, runDuePayouts,
  requestWithdrawal, decideWithdrawal, adjustBalance, portfolio, effectiveRate, periodCents,
};
