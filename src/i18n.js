'use strict';
// Language handling.
// Public pages: English at /path, French at /fr/path (separate crawlable URLs + hreflang).
// App pages (/dashboard, /admin): language from the user's profile or the inr_lang cookie.

const LANGS = ['en', 'fr'];

function makeT(lang) {
  const t = (en, fr) => (lang === 'fr' && fr != null ? fr : en);
  // Pick from a {en, fr} object.
  t.o = (obj) => (obj ? (lang === 'fr' ? obj.fr ?? obj.en : obj.en) : '');
  t.lang = lang;
  return t;
}

const NF = {
  en: new Intl.NumberFormat('en-US'),
  fr: new Intl.NumberFormat('fr-FR'),
};
const clean = (s) => s.replace(/[  ]/g, ' ');

function fmt(lang) {
  const nf = NF[lang] || NF.en;
  return {
    num: (n, d = 0) => clean(new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0)),
    int: (n) => clean(nf.format(Math.round(n || 0))),
    usd: (cents, d = 2) => {
      const v = (cents || 0) / 100;
      const s = clean(new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v)));
      const sign = v < 0 ? '−' : '';
      return lang === 'fr' ? `${sign}${s} $` : `${sign}$${s}`;
    },
    usdWhole: (dollars) => {
      const s = clean(nf.format(Math.round(dollars || 0)));
      return lang === 'fr' ? `${s} $` : `$${s}`;
    },
    money: (amount, cur) => `${clean(nf.format(Math.round(amount || 0)))} ${cur}`,
    pct: (n, d = 0) => (lang === 'fr' ? `${clean(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(n))} %` : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(n)}%`),
    date: (ms) => (ms ? new Date(ms).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
    dateTime: (ms) => (ms ? new Date(ms).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'),
  };
}

// Middleware for the public router: sets req.lang from the mount point.
const publicLang = (lang) => (req, res, next) => {
  req.lang = lang;
  req.langPrefix = lang === 'fr' ? '/fr' : '';
  next();
};

// Middleware for app routes: user preference > cookie > Accept-Language.
function appLang(req, res, next) {
  let lang = req.user && LANGS.includes(req.user.lang) ? req.user.lang : null;
  if (!lang && LANGS.includes(req.cookies.inr_lang)) lang = req.cookies.inr_lang;
  if (!lang) lang = String(req.get('accept-language') || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  req.lang = lang;
  req.langPrefix = lang === 'fr' ? '/fr' : '';
  next();
}

module.exports = { LANGS, makeT, fmt, publicLang, appLang };
