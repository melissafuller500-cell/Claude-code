'use strict';
const express = require('express');
const { q, now } = require('../db');
const config = require('../config');
const assets = require('../services/assets');
const ledger = require('../services/ledger');
const sec = require('../security');
const home = require('../views/public/home');
const assetViews = require('../views/public/assets');
const pages = require('../views/public/pages');
const authViews = require('../views/public/auth');
const { countries } = require('../data/catalog');

const router = express.Router();
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const str = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
const savedSet = (req) => new Set(req.user ? q.all('SELECT asset_id FROM watchlist WHERE user_id = ?', req.user.id).map((r) => r.asset_id) : []);

const authLimiter = sec.rateLimit({ windowMs: 15 * 60e3, max: 20 });
const formLimiter = sec.rateLimit({ windowMs: 60 * 60e3, max: 15 });

// Pages carry a per-visitor CSRF cookie, so they must never be cached by shared proxies.
router.use((req, res, next) => {
  res.set('Cache-Control', req.user ? 'private, no-store' : 'private, no-cache');
  next();
});

router.get('/', (req, res) => {
  const ctx = res.ctx();
  const featured = assets.list({ featured: true, limit: 6 });
  const simAssets = assets.list({ sort: 'return' }).filter((a) => a.yield_based).slice(0, 14);
  res.page(home(ctx, { featured, simAssets, stats: assets.stats(), saved: savedSet(req) }));
});

router.get('/assets', (req, res) => {
  const ctx = res.ctx();
  const filters = {
    category: assets.catByCode[req.query.category] ? req.query.category : '',
    country: countries[req.query.country] ? req.query.country : '',
    risk: [1, 2, 3, 4].includes(Number(req.query.risk)) ? Number(req.query.risk) : '',
    sort: ['return', 'risk', 'funded', 'term', 'newest'].includes(req.query.sort) ? req.query.sort : '',
    search: str(req.query.q, 60),
  };
  const items = assets.list(filters);
  const countryOptions = q.all("SELECT DISTINCT country_code c FROM assets WHERE status IN ('open','funded') ORDER BY c").map((r) => r.c);
  res.page(assetViews.list(ctx, { items, filters, saved: savedSet(req), countryOptions }));
});

router.get('/assets/:slug', (req, res, next) => {
  const a = assets.bySlug(req.params.slug);
  if (!a || a.status === 'draft') return next();
  const ctx = res.ctx();
  const related = assets.list({ category: a.category, limit: 4 }).filter((r) => r.id !== a.id).slice(0, 3);
  const myReservations = req.user ? q.all("SELECT amount_cents FROM reservations WHERE user_id = ? AND asset_id = ? AND status IN ('pending','active')", req.user.id, a.id) : [];
  res.page(assetViews.detail(ctx, { a, saved: savedSet(req).has(a.id), related, myReservations }));
});

router.get('/invest', (req, res) => {
  const counts = Object.fromEntries(q.all("SELECT category, COUNT(*) n FROM assets WHERE status='open' GROUP BY category").map((r) => [r.category, r.n]));
  res.page(pages.classIndex(res.ctx(), { counts }));
});
router.get('/invest/:slug', (req, res, next) => {
  const c = assets.catBySlug[req.params.slug];
  if (!c) return next();
  res.page(pages.classPage(res.ctx(), { c, items: assets.list({ category: c.code }), saved: savedSet(req) }));
});

router.get('/how-it-works', (req, res) => res.page(pages.howItWorks(res.ctx())));
router.get('/security', (req, res) => res.page(pages.security(res.ctx())));
router.get('/payments', (req, res) => res.page(pages.paymentsPage(res.ctx())));
router.get('/roadmap', (req, res) => res.page(pages.roadmap(res.ctx())));
router.get('/about', (req, res) => res.page(pages.about(res.ctx(), { stats: assets.stats() })));
router.get('/faq', (req, res) => res.page(pages.faqPage(res.ctx())));
router.get('/returns-calculator', (req, res) => res.page(pages.calculatorPage(res.ctx())));
router.get('/legal/:key', (req, res, next) => (pages.LEGAL[req.params.key] ? res.page(pages.legal(res.ctx(), req.params.key)) : next()));

// ---------- forms ----------
router.get('/contact', (req, res) => res.page(pages.contact(res.ctx(), { sent: req.query.sent === '1' })));
router.post('/contact', formLimiter, (req, res) => {
  const ctx = res.ctx();
  const t = ctx.t;
  const v = { name: str(req.body.name, 100), email: str(req.body.email, 160).toLowerCase(), subject: str(req.body.subject, 150), body: str(req.body.body, 4000) };
  if (req.body.website) return res.redirect(303, ctx.u('/contact') + '?sent=1'); // honeypot
  if (!v.name || !EMAIL_RE.test(v.email) || v.body.length < 5) {
    return res.page(pages.contact(ctx, { values: v, error: t('Please enter your name, a valid email and a message.', 'Merci d’indiquer votre nom, un email valide et un message.') }), 422);
  }
  q.run('INSERT INTO messages (name,email,subject,body,created_at) VALUES (?,?,?,?,?)', v.name, v.email, v.subject, v.body, now());
  res.redirect(303, ctx.u('/contact') + '?sent=1');
});

router.get('/submit-project', (req, res) => res.page(pages.submitProject(res.ctx(), { sent: req.query.sent === '1' })));
router.post('/submit-project', formLimiter, (req, res) => {
  const ctx = res.ctx();
  const t = ctx.t;
  const v = {
    name: str(req.body.name, 100), email: str(req.body.email, 160).toLowerCase(), phone: str(req.body.phone, 40), company: str(req.body.company, 120),
    type: str(req.body.type, 40), city: str(req.body.city, 100), need: str(req.body.need, 60), description: str(req.body.description, 5000),
  };
  if (req.body.website) return res.redirect(303, ctx.u('/submit-project') + '?sent=1');
  if (!v.name || !EMAIL_RE.test(v.email) || !v.type || v.description.length < 20) {
    return res.page(pages.submitProject(ctx, { values: v, error: t('Please fill in your name, a valid email, the project type and a description (20+ characters).', 'Merci de renseigner votre nom, un email valide, le type de projet et une description (20+ caractères).') }), 422);
  }
  q.run('INSERT INTO submissions (user_id,name,email,phone,company,type,city,need,description,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    req.user ? req.user.id : null, v.name, v.email, v.phone, v.company, v.type, v.city, v.need, v.description, now());
  res.redirect(303, ctx.u('/submit-project') + '?sent=1');
});

router.post('/subscribe', formLimiter, (req, res) => {
  const ctx = res.ctx();
  const email = str(req.body.email, 160).toLowerCase();
  if (EMAIL_RE.test(email)) {
    q.run('INSERT OR IGNORE INTO subscribers (email, lang, created_at) VALUES (?,?,?)', email, ctx.lang, now());
    res.flash('ok', ctx.t('Subscribed. You will hear about new projects first.', 'Abonné. Vous serez informé en premier des nouveaux projets.'));
  } else {
    res.flash('error', ctx.t('Please enter a valid email.', 'Merci de saisir un email valide.'));
  }
  const back = sec.safeNext(req.get('referer') ? new URL(req.get('referer'), config.siteUrl).pathname : '', ctx.u('/'));
  res.redirect(303, back);
});

// ---------- auth ----------
router.get('/login', (req, res) => {
  if (req.user) return res.redirect(303, sec.safeNext(req.query.next, req.user.role === 'admin' ? '/admin' : '/dashboard'));
  res.page(authViews.login(res.ctx(), { next: sec.safeNext(req.query.next, ''), showDemo: config.seedDemo }));
});
router.post('/login', authLimiter, (req, res) => {
  const ctx = res.ctx();
  const email = str(req.body.email, 160).toLowerCase();
  const password = String(req.body.password || '').slice(0, 200);
  const next = sec.safeNext(req.body.next, '');
  const user = q.get('SELECT * FROM users WHERE email = ?', email);
  const ok = sec.verifyPassword(password, user ? user.password_hash : sec.DUMMY_HASH) && !!user;
  if (!ok || user.status !== 'active') {
    const error = user && ok && user.status !== 'active'
      ? ctx.t('This account is suspended. Contact support.', 'Ce compte est suspendu. Contactez le support.')
      : ctx.t('Wrong email or password.', 'Email ou mot de passe incorrect.');
    return res.page(authViews.login(ctx, { error, email, next, showDemo: config.seedDemo }), 401);
  }
  sec.createSession(res, req, user.id);
  q.run('UPDATE users SET last_login_at = ? WHERE id = ?', now(), user.id);
  ledger.audit(user.id, 'auth.login', user.email);
  res.redirect(303, next || (user.role === 'admin' ? '/admin' : '/dashboard'));
});

router.get('/register', (req, res) => {
  if (req.user) return res.redirect(303, '/dashboard');
  res.page(authViews.register(res.ctx(), { next: sec.safeNext(req.query.next, '') }));
});
router.post('/register', authLimiter, (req, res) => {
  const ctx = res.ctx();
  const t = ctx.t;
  const v = { name: str(req.body.name, 100), email: str(req.body.email, 160).toLowerCase(), phone: str(req.body.phone, 40), country: str(req.body.country, 2).toUpperCase() };
  const next = sec.safeNext(req.body.next, '');
  const password = String(req.body.password || '');
  const fail = (error) => res.page(authViews.register(ctx, { error, values: v, next }), 422);
  if (req.body.website) return res.redirect(303, ctx.u('/'));
  if (v.name.length < 2) return fail(t('Please enter your full name.', 'Merci d’indiquer votre nom complet.'));
  if (!EMAIL_RE.test(v.email)) return fail(t('Please enter a valid email address.', 'Merci de saisir un email valide.'));
  if (!countries[v.country] && v.country !== 'OT') return fail(t('Please choose your country of residence.', 'Merci de choisir votre pays de résidence.'));
  const pwErr = sec.passwordProblem(password, t);
  if (pwErr) return fail(pwErr);
  if (req.body.consent !== '1') return fail(t('Please accept the terms and risk statement.', 'Merci d’accepter les conditions et l’avertissement sur les risques.'));
  if (q.get('SELECT id FROM users WHERE email = ?', v.email)) return fail(t('An account already exists with this email. Log in instead.', 'Un compte existe déjà avec cet email. Connectez-vous.'));
  const r = q.run('INSERT INTO users (email,password_hash,name,phone,country,lang,created_at,last_login_at) VALUES (?,?,?,?,?,?,?,?)',
    v.email, sec.hashPassword(password), v.name, v.phone, v.country, ctx.lang, now(), now());
  const uid = Number(r.lastInsertRowid);
  ledger.notify(uid, t('Welcome to Invest n Returns', 'Bienvenue sur Invest n Returns'), t('Next step: verify your identity so your investments can be activated.', 'Prochaine étape : vérifiez votre identité pour activer vos investissements.'), '/dashboard/kyc');
  ledger.sendMail(v.email, 'Welcome to Invest n Returns', `Hello ${v.name},\n\nYour account is ready. Verify your identity to activate investments: ${config.siteUrl}/dashboard/kyc\n\nInvest n Returns`);
  ledger.audit(uid, 'auth.register', v.email);
  sec.createSession(res, req, uid);
  res.flash('ok', t('Account created. Welcome!', 'Compte créé. Bienvenue !'));
  res.redirect(303, next || '/dashboard');
});

router.get('/forgot-password', (req, res) => res.page(authViews.forgot(res.ctx(), {})));
router.post('/forgot-password', authLimiter, (req, res) => {
  const ctx = res.ctx();
  const email = str(req.body.email, 160).toLowerCase();
  const user = EMAIL_RE.test(email) ? q.get("SELECT * FROM users WHERE email = ? AND status = 'active'", email) : null;
  if (user) {
    const token = require('crypto').randomBytes(32).toString('base64url');
    q.run('INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,?)', sec.sha256(token), user.id, now() + 36e5);
    const link = `${config.siteUrl}${ctx.u('/reset-password')}?token=${token}`;
    ledger.sendMail(user.email, 'Reset your Invest n Returns password', `Hello ${user.name},\n\nUse this link within one hour to choose a new password:\n${link}\n\nIf you did not ask for this, ignore this email.`);
  }
  // Same response either way to avoid revealing which emails are registered.
  res.page(authViews.forgot(ctx, { sent: true }));
});
router.get('/reset-password', (req, res) => {
  const token = str(req.query.token, 100);
  const row = token ? q.get('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?', sec.sha256(token), now()) : null;
  res.page(authViews.reset(res.ctx(), { token, invalid: !row }));
});
router.post('/reset-password', authLimiter, (req, res) => {
  const ctx = res.ctx();
  const token = str(req.body.token, 100);
  const row = token ? q.get('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?', sec.sha256(token), now()) : null;
  if (!row) return res.page(authViews.reset(ctx, { invalid: true }), 400);
  const pwErr = sec.passwordProblem(String(req.body.password || ''), ctx.t);
  if (pwErr) return res.page(authViews.reset(ctx, { token, error: pwErr }), 422);
  q.run('UPDATE users SET password_hash = ? WHERE id = ?', sec.hashPassword(String(req.body.password)), row.user_id);
  q.run('UPDATE password_resets SET used = 1 WHERE user_id = ?', row.user_id);
  sec.destroyAllSessions(row.user_id);
  ledger.audit(row.user_id, 'auth.reset_password');
  res.flash('ok', ctx.t('Password updated. Please log in.', 'Mot de passe modifié. Connectez-vous.'));
  res.redirect(303, ctx.u('/login'));
});

module.exports = router;
