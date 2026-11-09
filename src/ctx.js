'use strict';
// Per-request rendering context passed to every view.
const { makeT, fmt } = require('./i18n');
const config = require('./config');

const FLASH = 'inr_flash';

function ctxMiddleware(req, res, next) {
  // Flash messages survive exactly one redirect.
  let flash = null;
  if (req.cookies[FLASH]) {
    try { flash = JSON.parse(req.cookies[FLASH]); } catch { flash = null; }
    res.clearCookie(FLASH, { path: '/' });
  }
  res.flash = (type, text) => {
    res.cookie(FLASH, JSON.stringify({ type, text: String(text).slice(0, 300) }), { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/', maxAge: 60e3 });
  };
  res.ctx = () => {
    const lang = req.lang || 'en';
    const prefix = lang === 'fr' ? '/fr' : '';
    const t = makeT(lang);
    // Path without the /fr prefix, used for canonical/hreflang.
    const basePath = (req.baseUrl === '/fr' ? req.path : req.originalUrl.split('?')[0]) || '/';
    return {
      req, res, t, lang, prefix,
      f: fmt(lang),
      user: req.user,
      flash,
      path: basePath === '' ? '/' : basePath,
      // Localize a public path.
      u: (p) => (lang === 'fr' ? (p === '/' ? '/fr/' : '/fr' + p) : p),
      csrf: () => res.locals.csrfToken(),
      site: config.siteUrl,
      brand: config.brand,
    };
  };
  res.page = (markup, status = 200) => res.status(status).type('html').send(String(markup));
  next();
}

module.exports = { ctxMiddleware };
