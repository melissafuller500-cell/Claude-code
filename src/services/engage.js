'use strict';
// Investor engagement: conversations, announcements and personal investment proposals.
const { q, tx, now } = require('../db');
const ledger = require('./ledger');
const assets = require('./assets');
const { payoutSchedules } = require('../data/catalog');

const { UserError } = ledger;
const usd = (cents) => `$${(cents / 100).toFixed(2)}`;

// ---------- conversations ----------
function thread(userId, limit = 200) {
  return q.all('SELECT * FROM (SELECT * FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC', userId, limit);
}
function unreadForUser(userId) {
  return q.get("SELECT COUNT(*) n FROM chat_messages WHERE user_id = ? AND sender = 'admin' AND read_by_user = 0", userId).n;
}
function unreadForAdmin() {
  return q.get("SELECT COUNT(DISTINCT user_id) n FROM chat_messages WHERE sender = 'user' AND read_by_admin = 0").n;
}
function markReadByUser(userId) { q.run("UPDATE chat_messages SET read_by_user = 1 WHERE user_id = ? AND read_by_user = 0", userId); }
function markReadByAdmin(userId) { q.run("UPDATE chat_messages SET read_by_admin = 1 WHERE user_id = ? AND read_by_admin = 0", userId); }

function userSend(user, body) {
  const text = String(body || '').trim();
  if (text.length < 1) throw new UserError('Write a message.', 'Écrivez un message.');
  if (text.length > 5000) throw new UserError('Message too long (5 000 characters max).', 'Message trop long (5 000 caractères max).');
  ledger.chat(user.id, 'user', text);
}
function adminSend(admin, userId, body) {
  const text = String(body || '').trim();
  if (!text) throw new UserError('Write a message.');
  const u = q.get('SELECT id, email, name FROM users WHERE id = ?', Number(userId));
  if (!u) throw new UserError('User not found.');
  ledger.chat(u.id, 'admin', text, { adminId: admin.id });
  markReadByAdmin(u.id);
  ledger.notify(u.id, 'New message from Invest n Returns', text.slice(0, 140), '/dashboard/messages');
  ledger.sendMail(u.email, 'New message from Invest n Returns', `Hello ${u.name},\n\n${text}\n\nReply from your dashboard: Messages.\n\nInvest n Returns`);
  ledger.audit(admin.id, 'message.send', u.email);
}

// Inbox: one row per user who has a conversation, newest first.
function inbox({ filter = 'all', search = '' } = {}) {
  const p = [];
  let where = '';
  if (search) { where = 'WHERE (u.email LIKE ? OR u.name LIKE ?)'; const s = `%${search.replace(/[%_]/g, '')}%`; p.push(s, s); }
  const rows = q.all(`SELECT u.id, u.name, u.email, u.kyc_status,
      (SELECT body FROM chat_messages c WHERE c.user_id = u.id ORDER BY c.id DESC LIMIT 1) last_body,
      (SELECT sender FROM chat_messages c WHERE c.user_id = u.id ORDER BY c.id DESC LIMIT 1) last_sender,
      (SELECT MAX(created_at) FROM chat_messages c WHERE c.user_id = u.id) last_at,
      (SELECT COUNT(*) FROM chat_messages c WHERE c.user_id = u.id AND c.sender = 'user' AND c.read_by_admin = 0) unread
    FROM users u ${where} ORDER BY last_at IS NULL, last_at DESC LIMIT 300`, ...p);
  return rows.filter((r) => r.last_at && (filter !== 'unread' || r.unread > 0));
}

const SEGMENTS = {
  all: { label: 'All investors', sql: "role = 'investor' AND status = 'active'" },
  verified: { label: 'Verified investors (KYC approved)', sql: "role = 'investor' AND status = 'active' AND kyc_status = 'verified'" },
  unverified: { label: 'Investors who still need to verify identity', sql: "role = 'investor' AND status = 'active' AND kyc_status != 'verified'" },
  active: { label: 'Investors with an active investment', sql: "role = 'investor' AND status = 'active' AND id IN (SELECT user_id FROM reservations WHERE status = 'active')" },
  noinvest: { label: 'Registered but never invested', sql: "role = 'investor' AND status = 'active' AND id NOT IN (SELECT user_id FROM reservations WHERE status IN ('active','completed'))" },
};
function segmentUsers(segment, country) {
  const s = SEGMENTS[segment] || SEGMENTS.all;
  if (country) return q.all(`SELECT id, email, name FROM users WHERE ${s.sql} AND country = ?`, country);
  return q.all(`SELECT id, email, name FROM users WHERE ${s.sql}`);
}
function broadcast(admin, { segment, country, title, body, email }) {
  return tx(() => {
    const t = String(title || '').trim().slice(0, 120);
    const b = String(body || '').trim().slice(0, 5000);
    if (t.length < 3 || b.length < 5) throw new UserError('Write a title and a message.');
    const users = segmentUsers(segment, country);
    if (!users.length) throw new UserError('No investor matches this audience.');
    for (const u of users) {
      ledger.chat(u.id, 'admin', `📢 ${t}\n\n${b}`, { kind: 'announcement', adminId: admin.id });
      ledger.notify(u.id, t, b.slice(0, 140), '/dashboard/messages');
      if (email) ledger.sendMail(u.email, t, `Hello ${u.name},\n\n${b}\n\nInvest n Returns`);
    }
    ledger.audit(admin.id, 'broadcast', segment + (country ? ':' + country : ''), { title: t, recipients: users.length });
    return users.length;
  });
}

// ---------- proposals ----------
function expireProposals() {
  q.run("UPDATE proposals SET status = 'expired', decided_at = ? WHERE status = 'pending' AND expires_at < ?", now(), now());
}

function createProposal(admin, { userId, assetId, amountUsd, rate, payoutFreq, message, days }) {
  return tx(() => {
    const u = q.get('SELECT id, email, name, status FROM users WHERE id = ?', Number(userId));
    if (!u || u.status !== 'active') throw new UserError('Choose an active investor.');
    const a = assets.byId(assetId);
    if (!a || a.status !== 'open') throw new UserError('Choose a project that is open.');
    const amount = Math.round(Number(amountUsd) * 100);
    if (!(amount >= a.min_usd * 100)) throw new UserError(`Amount must be at least the project minimum ($${a.min_usd}).`);
    if (amount > a.remaining_cents) throw new UserError(`Only $${Math.floor(a.remaining_cents / 100)} is left on this project.`);
    let r = null;
    let freq = 'exit';
    if (a.yield_based) {
      r = rate === '' || rate == null ? a.target_rate : Number(rate);
      if (!Number.isFinite(r) || r <= 0 || r > 100) throw new UserError('Return must be between 0 and 100% per year.');
      freq = payoutSchedules[payoutFreq] ? payoutFreq : 'monthly';
    }
    const d = Math.min(30, Math.max(1, Number(days) || 7));
    const text = String(message || '').trim().slice(0, 2000);
    const res = q.run('INSERT INTO proposals (user_id, asset_id, amount_cents, rate, payout_freq, message, admin_id, expires_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      u.id, a.id, amount, r, freq, text, admin.id, now() + d * 864e5, now());
    const id = Number(res.lastInsertRowid);
    const terms = a.yield_based ? `${r}% per year, paid ${payoutSchedules[freq].en.toLowerCase()}` : `${a.target_multiple}× target at exit`;
    ledger.chat(u.id, 'admin', `💼 Investment proposal: ${usd(amount)} in "${a.title_en}" (${a.city}) at ${terms}. Valid ${d} days.${text ? '\n\n' + text : ''}\n\nOpen "Offers" in your dashboard to accept or decline.`, { kind: 'proposal', adminId: admin.id });
    ledger.notify(u.id, 'You have a new investment proposal', `${usd(amount)} in ${a.title_en} · ${terms}`, '/dashboard/offers');
    ledger.sendMail(u.email, 'A personal investment proposal for you', `Hello ${u.name},\n\nWe prepared a proposal for you: ${usd(amount)} in "${a.title_en}" at ${terms}. It is valid for ${d} days.\n${text ? '\n' + text + '\n' : ''}\nReview it in your dashboard under Offers. Returns are targets and not guaranteed.\n\nInvest n Returns`);
    ledger.audit(admin.id, 'proposal.create', u.email, { asset: a.slug, amount, rate: r, freq });
    return id;
  });
}

function withdrawProposal(admin, id) {
  const p = q.get('SELECT * FROM proposals WHERE id = ?', Number(id));
  if (!p) throw new UserError('Proposal not found.');
  if (p.status !== 'pending') throw new UserError(`Proposal is already ${p.status}.`);
  q.run("UPDATE proposals SET status = 'withdrawn', decided_at = ? WHERE id = ?", now(), p.id);
  ledger.audit(admin.id, 'proposal.withdraw', String(p.id));
}

function userProposals(userId) {
  expireProposals();
  return q.all(`SELECT p.*, a.slug, a.title_en, a.title_fr, a.city, a.country_code, a.category, a.risk, a.term_months, a.target_multiple, a.images, a.status asset_status
    FROM proposals p JOIN assets a ON a.id = p.asset_id WHERE p.user_id = ? ORDER BY p.status = 'pending' DESC, p.created_at DESC`, userId);
}
function pendingCount(userId) {
  expireProposals();
  return q.get("SELECT COUNT(*) n FROM proposals WHERE user_id = ? AND status = 'pending'", userId).n;
}

function respond(user, id, accept, method) {
  return tx(() => {
    expireProposals();
    const p = q.get('SELECT * FROM proposals WHERE id = ? AND user_id = ?', Number(id), user.id);
    if (!p) throw new UserError('Proposal not found.', 'Proposition introuvable.');
    if (p.status !== 'pending') throw new UserError('This proposal is no longer open.', "Cette proposition n'est plus ouverte.");
    if (!accept) {
      q.run("UPDATE proposals SET status = 'declined', decided_at = ? WHERE id = ?", now(), p.id);
      ledger.chat(user.id, 'user', 'I decline the investment proposal, thank you.', { kind: 'proposal' });
      ledger.audit(user.id, 'proposal.decline', String(p.id));
      return null;
    }
    const r = ledger.reserve(user, p.asset_id, p.amount_cents / 100, method, { payoutFreq: p.payout_freq === 'exit' ? 'monthly' : p.payout_freq, rate: p.rate, proposalId: p.id });
    q.run("UPDATE proposals SET status = 'accepted', decided_at = ?, reservation_id = ? WHERE id = ?", now(), r.id, p.id);
    ledger.audit(user.id, 'proposal.accept', String(p.id), r.ref);
    return r;
  });
}

function allProposals(status) {
  expireProposals();
  const where = status && status !== 'all' ? 'WHERE p.status = ?' : '';
  return q.all(`SELECT p.*, u.name, u.email, a.title_en, r.ref FROM proposals p JOIN users u ON u.id = p.user_id JOIN assets a ON a.id = p.asset_id
    LEFT JOIN reservations r ON r.id = p.reservation_id ${where} ORDER BY p.created_at DESC LIMIT 300`, ...(where ? [status] : []));
}

module.exports = {
  thread, unreadForUser, unreadForAdmin, markReadByUser, markReadByAdmin, userSend, adminSend, inbox, SEGMENTS, segmentUsers, broadcast,
  createProposal, withdrawProposal, userProposals, pendingCount, respond, allProposals, expireProposals,
};
