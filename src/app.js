'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const sec = require('./security');
const { publicLang, appLang, makeT } = require('./i18n');
const { ctxMiddleware } = require('./ctx');
const { errorPage } = require('./views/layout');
const { seed } = require('./seed');

seed();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : config.isProd ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:'],
      'connect-src': ["'self'"],
      'form-action': ["'self'", 'mailto:'],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': config.cookieSecure ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: config.cookieSecure ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((req, res, next) => { res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); next(); });
app.use(compression());

// Canonical host/trailing-slash normalisation (except root and /fr/).
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.length > 1 && req.path.endsWith('/') && req.path !== '/fr/') {
    const q = req.originalUrl.slice(req.path.length);
    return res.redirect(301, req.path.replace(/\/+$/, '') + q);
  }
  if (req.method === 'GET' && req.path === '/fr') return res.redirect(301, '/fr/');
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.isProd ? '7d' : 0,
  setHeaders: (res, file) => { if (/\.(css|js)$/.test(file) && config.isProd) res.set('Cache-Control', 'public, max-age=604800'); },
}));
app.use(express.urlencoded({ extended: false, limit: '64kb', parameterLimit: 100 }));
app.use(express.json({ limit: '16kb' }));

app.use(sec.loadUser);
app.use(sec.csrf);
app.use(ctxMiddleware);

app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use(require('./routes/seo'));

// Logout and app language switch.
app.post('/logout', (req, res) => {
  sec.destroySession(req, res);
  res.redirect(303, '/');
});
app.post('/lang', (req, res) => {
  const lang = req.body.lang === 'fr' ? 'fr' : 'en';
  res.cookie('inr_lang', lang, { sameSite: 'lax', path: '/', maxAge: 365 * 864e5, secure: config.cookieSecure });
  if (req.user) require('./db').q.run('UPDATE users SET lang = ? WHERE id = ?', lang, req.user.id);
  res.redirect(303, sec.safeNext(req.body.next, '/dashboard'));
});

app.use('/dashboard', appLang, require('./routes/dashboard'));
app.use('/admin', appLang, require('./routes/admin'));
const publicRouter = require('./routes/public');
app.use('/fr', publicLang('fr'), publicRouter);
app.use('/', publicLang('en'), publicRouter);

// 404
app.use((req, res) => {
  if (!req.lang) appLang(req, res, () => {});
  res.status(404);
  if (req.accepts(['html', 'json']) === 'json') return res.json({ ok: false, error: 'Not found' });
  res.page(errorPage(res.ctx(), 404), 404);
});

// Errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err);
  if (res.headersSent) return;
  if (!req.lang) { try { appLang(req, res, () => {}); } catch { req.lang = 'en'; } }
  if (!res.ctx) return res.status(status).send('Error');
  const t = makeT(req.lang || 'en');
  let message = status >= 500 ? t('An unexpected error occurred. Please try again.', "Une erreur inattendue s'est produite. Réessayez.") : err.message;
  if (err.code === 'CSRF') message = t('Your form expired. Please go back, reload the page and try again.', 'Votre formulaire a expiré. Revenez en arrière, rechargez la page et réessayez.');
  if (status === 429) message = t('Too many attempts. Please wait a few minutes and try again.', 'Trop de tentatives. Patientez quelques minutes.');
  if (err.type === 'entity.too.large') message = t('The form is too large.', 'Le formulaire est trop volumineux.');
  if (req.accepts(['html', 'json']) === 'json') return res.status(status).json({ ok: false, error: message });
  res.page(errorPage(res.ctx(), status, message), status);
});

module.exports = app;
