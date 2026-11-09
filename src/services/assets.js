'use strict';
const { q, now } = require('../db');
const categories = require('../data/categories');
const { fx } = require('../data/catalog');

const catByCode = Object.fromEntries(categories.map((c) => [c.code, c]));
const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

// Funding figures are computed live: offline raise + active/completed reservations (confirmed)
// and pending reservations (held for 72h).
const FUNDING_SQL = `
  SELECT a.*,
    a.offline_raised_usd * 100 + COALESCE((SELECT SUM(amount_cents) FROM reservations r WHERE r.asset_id = a.id AND r.status IN ('active','completed')), 0) AS raised_cents,
    COALESCE((SELECT SUM(amount_cents) FROM reservations r WHERE r.asset_id = a.id AND r.status = 'pending'), 0) AS held_cents,
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM reservations r WHERE r.asset_id = a.id AND r.status IN ('active','completed','pending')), 0) AS investor_count
  FROM assets a`;

function decorate(a) {
  if (!a) return a;
  const goalCents = a.goal_usd * 100;
  a.cat = catByCode[a.category] || categories[0];
  a.committed_cents = a.raised_cents + a.held_cents;
  a.pct = goalCents ? Math.min(100, Math.round((a.committed_cents / goalCents) * 100)) : 0;
  a.remaining_cents = Math.max(0, goalCents - a.committed_cents);
  a.yield_based = a.target_rate != null && a.target_rate > 0;
  a.highlights = { en: safeJson(a.highlights_en, []), fr: safeJson(a.highlights_fr, []) };
  return a;
}
function safeJson(s, d) { try { return JSON.parse(s); } catch { return d; } }

function expireStale() {
  q.run("UPDATE reservations SET status='expired', decided_at=? WHERE status='pending' AND expires_at < ?", now(), now());
}

function list({ category, country, risk, sort, search, status = ['open', 'funded'], featured, limit } = {}) {
  expireStale();
  const where = [];
  const params = [];
  if (status && status !== 'all') { where.push(`a.status IN (${status.map(() => '?').join(',')})`); params.push(...status); }
  if (category) { where.push('a.category = ?'); params.push(category); }
  if (country) { where.push('a.country_code = ?'); params.push(country); }
  if (risk) { where.push('a.risk <= ?'); params.push(Number(risk)); }
  if (featured) where.push('a.featured = 1');
  if (search) {
    where.push('(a.title_en LIKE ? OR a.title_fr LIKE ? OR a.city LIKE ? OR a.region LIKE ?)');
    const s = `%${String(search).slice(0, 60).replace(/[%_]/g, '')}%`;
    params.push(s, s, s, s);
  }
  const order = {
    return: 'COALESCE(a.target_rate, a.target_multiple * 10) DESC',
    risk: 'a.risk ASC, a.target_rate DESC',
    newest: 'a.created_at DESC',
    funded: '(CAST(raised_cents + held_cents AS REAL) / (a.goal_usd * 100)) DESC',
    term: 'a.term_months ASC',
  }[sort] || 'a.featured DESC, a.id ASC';
  let sql = `SELECT * FROM (${FUNDING_SQL}) a ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`;
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  return q.all(sql, ...params).map(decorate);
}

function bySlug(slug) {
  expireStale();
  return decorate(q.get(`SELECT * FROM (${FUNDING_SQL}) a WHERE a.slug = ?`, String(slug)));
}
function byId(id) {
  expireStale();
  return decorate(q.get(`SELECT * FROM (${FUNDING_SQL}) a WHERE a.id = ?`, Number(id)));
}

function slugify(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'asset';
}
function uniqueSlug(base, exceptId) {
  let slug = slugify(base);
  let i = 2;
  while (q.get('SELECT id FROM assets WHERE slug = ? AND id != ?', slug, exceptId || 0)) slug = `${slugify(base)}-${i++}`;
  return slug;
}

const toUsd = (amountLocal, cur) => Math.round(amountLocal / (fx[cur] || 1));

function stats() {
  expireStale();
  const a = q.get(`SELECT COUNT(*) n, COUNT(DISTINCT country_code) countries, AVG(target_rate) avg_rate, SUM(goal_usd) goal FROM assets WHERE status IN ('open','funded')`);
  const r = q.get(`SELECT COALESCE(SUM(amount_cents),0) committed FROM reservations WHERE status IN ('active','completed','pending')`);
  const off = q.get(`SELECT COALESCE(SUM(offline_raised_usd),0) v FROM assets WHERE status IN ('open','funded')`);
  const inv = q.get(`SELECT COUNT(*) n FROM users WHERE role='investor'`);
  const paid = q.get(`SELECT COALESCE(SUM(amount_cents),0) v FROM transactions WHERE type='payout' AND status='completed'`);
  return {
    assets: a.n, countries: a.countries, avgRate: a.avg_rate || 0, goalUsd: a.goal || 0,
    committedUsd: Math.round(r.committed / 100) + off.v, investors: inv.n, paidOutUsd: Math.round(paid.v / 100),
  };
}

module.exports = { list, bySlug, byId, decorate, uniqueSlug, slugify, toUsd, stats, expireStale, catByCode, catBySlug, categories };
