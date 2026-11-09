'use strict';
const crypto = require('crypto');
const config = require('./config');
const { q, now } = require('./db');

// ---------- passwords (scrypt, per-user salt) ----------
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, salt.toString('base64'), key.toString('base64')].join('$');
}
function verifyPassword(pw, stored) {
  try {
    const [algo, N, saltB64, keyB64] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const key = Buffer.from(keyB64, 'base64');
    const test = crypto.scryptSync(String(pw), Buffer.from(saltB64, 'base64'), key.length, { N: Number(N), r: SCRYPT.r, p: SCRYPT.p });
    return crypto.timingSafeEqual(key, test);
  } catch {
    return false;
  }
}
// Used to keep login timing constant when the email does not exist.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

function passwordProblem(pw, t) {
  if (typeof pw !== 'string' || pw.length < 10) return t('Password must be at least 10 characters.', 'Le mot de passe doit contenir au moins 10 caractères.');
  if (pw.length > 200) return t('Password is too long.', 'Mot de passe trop long.');
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return t('Use at least one letter and one number.', 'Utilisez au moins une lettre et un chiffre.');
  return null;
}

// ---------- cookies ----------
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore malformed cookie */ }
  }
  return out;
}
function cookieOpts(maxAgeMs) {
  return { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/', ...(maxAgeMs ? { maxAge: maxAgeMs } : {}) };
}

// ---------- sessions (opaque token in cookie, SHA-256 hash in DB) ----------
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const SESSION_COOKIE = 'inr_sid';

function createSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = config.sessionDays * 864e5;
  q.run('INSERT INTO sessions (id,user_id,created_at,expires_at,ip,ua) VALUES (?,?,?,?,?,?)',
    sha256(token), userId, now(), now() + ttl, String(req.ip || '').slice(0, 64), String(req.get('user-agent') || '').slice(0, 200));
  res.cookie(SESSION_COOKIE, token, cookieOpts(ttl));
}
function destroySession(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) q.run('DELETE FROM sessions WHERE id = ?', sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}
function destroyAllSessions(userId) {
  q.run('DELETE FROM sessions WHERE user_id = ?', userId);
}

let lastSweep = 0;
function loadUser(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  req.user = null;
  if (now() - lastSweep > 36e5) {
    lastSweep = now();
    q.run('DELETE FROM sessions WHERE expires_at < ?', now());
  }
  const token = req.cookies[SESSION_COOKIE];
  if (token && token.length < 100) {
    const row = q.get('SELECT u.*, s.expires_at AS s_exp FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?', sha256(token));
    if (row && row.s_exp > now() && row.status === 'active') {
      req.user = row;
    } else {
      res.clearCookie(SESSION_COOKIE, { path: '/' });
    }
  }
  res.locals.user = req.user;
  next();
}

// ---------- CSRF (stateless double-submit, HMAC-bound to an HttpOnly cookie) ----------
const CSRF_COOKIE = 'inr_csrf';
const hmac = (v) => crypto.createHmac('sha256', config.secret).update(v).digest('base64url');
function csrf(req, res, next) {
  let seed = req.cookies[CSRF_COOKIE];
  const ensureSeed = () => {
    if (!seed || seed.length !== 32) {
      seed = crypto.randomBytes(16).toString('hex');
      req.cookies[CSRF_COOKIE] = seed;
      if (!res.headersSent) res.cookie(CSRF_COOKIE, seed, cookieOpts(365 * 864e5));
    }
    return seed;
  };
  res.locals.csrfToken = () => hmac(ensureSeed());
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = String((req.body && req.body._csrf) || req.get('x-csrf-token') || '');
  const expected = seed ? hmac(seed) : '';
  const ok = expected && sent.length === expected.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!ok) {
    const err = new Error('Your form expired. Please reload the page and try again.');
    err.status = 403;
    err.code = 'CSRF';
    return next(err);
  }
  next();
}

// ---------- rate limiting (fixed window, in memory) ----------
function rateLimit({ windowMs, max, key = (req) => req.ip }) {
  const hits = new Map();
  setInterval(() => { const t = now(); for (const [k, v] of hits) if (v.reset < t) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const k = key(req);
    const t = now();
    let h = hits.get(k);
    if (!h || h.reset < t) { h = { n: 0, reset: t + windowMs }; hits.set(k, h); }
    h.n++;
    if (h.n > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - t) / 1000)));
      const err = new Error('Too many attempts. Please wait a few minutes and try again.');
      err.status = 429;
      return next(err);
    }
    next();
  };
}

// ---------- guards ----------
function requireAuth(req, res, next) {
  if (req.user) return next();
  return res.redirect(303, '/login?next=' + encodeURIComponent(req.originalUrl));
}
function requireAdmin(req, res, next) {
  if (!req.user) return requireAuth(req, res, next);
  if (req.user.role !== 'admin') {
    const err = new Error('This area is for administrators only.');
    err.status = 403;
    return next(err);
  }
  next();
}

// Only allow same-site relative redirects (blocks open redirects like //evil.com).
function safeNext(n, fallback = '/dashboard') {
  if (typeof n !== 'string' || !n.startsWith('/') || n.startsWith('//') || n.startsWith('/\\')) return fallback;
  return n;
}

module.exports = {
  hashPassword, verifyPassword, DUMMY_HASH, passwordProblem, sha256,
  createSession, destroySession, destroyAllSessions, loadUser, csrf, rateLimit,
  requireAuth, requireAdmin, safeNext, parseCookies,
};
