'use strict';
// Crawler- and AI-facing endpoints: sitemap.xml, robots.txt, llms.txt (GEO), web manifest.
const express = require('express');
const config = require('../config');
const assets = require('../services/assets');
const categories = require('../data/categories');
const faq = require('../data/faq');
const { payoutFreq, countries } = require('../data/catalog');

const router = express.Router();
const STATIC_PAGES = ['/', '/assets', '/invest', '/how-it-works', '/security', '/payments', '/roadmap', '/about', '/faq', '/returns-calculator', '/contact', '/submit-project', '/legal/terms', '/legal/privacy', '/legal/risk'];
const xmlEsc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

router.get('/sitemap.xml', (req, res) => {
  const site = config.siteUrl;
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];
  const add = (path, lastmod, priority, changefreq) => {
    const en = site + path;
    const fr = site + (path === '/' ? '/fr/' : '/fr' + path);
    for (const loc of [en, fr]) {
      entries.push(`<url><loc>${xmlEsc(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority>` +
        `<xhtml:link rel="alternate" hreflang="en" href="${xmlEsc(en)}"/><xhtml:link rel="alternate" hreflang="fr" href="${xmlEsc(fr)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(en)}"/></url>`);
    }
  };
  STATIC_PAGES.forEach((p) => add(p, today, p === '/' ? '1.0' : p === '/assets' ? '0.9' : '0.6', p === '/' || p === '/assets' ? 'daily' : 'monthly'));
  categories.forEach((c) => add(`/invest/${c.slug}`, today, '0.8', 'weekly'));
  assets.list({ status: ['open', 'funded', 'closed'] }).forEach((a) => add(`/assets/${a.slug}`, new Date(a.updated_at).toISOString().slice(0, 10), a.status === 'open' ? '0.8' : '0.4', 'weekly'));
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>`
  );
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=86400').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /dashboard',
      'Disallow: /admin',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /forgot-password',
      'Disallow: /reset-password',
      'Disallow: /fr/login',
      'Disallow: /fr/register',
      'Disallow: /fr/forgot-password',
      'Disallow: /fr/reset-password',
      '',
      '# AI and answer engines are welcome to read public pages.',
      'User-agent: GPTBot',
      'Allow: /',
      'Disallow: /dashboard',
      'Disallow: /admin',
      'User-agent: ClaudeBot',
      'Allow: /',
      'Disallow: /dashboard',
      'Disallow: /admin',
      'User-agent: PerplexityBot',
      'Allow: /',
      'Disallow: /dashboard',
      'Disallow: /admin',
      'User-agent: Google-Extended',
      'Allow: /',
      '',
      `Sitemap: ${config.siteUrl}/sitemap.xml`,
      '',
    ].join('\n')
  );
});

function llms(full) {
  const site = config.siteUrl;
  const s = assets.stats();
  const list = assets.list();
  const lines = [
    '# Invest n Returns',
    '',
    '> Invest n Returns is an investment platform for African real assets. Investors from Africa, the diaspora and worldwide can invest from 100 USD in vetted rental property, farms with a guaranteed buyer, loans to profitable SMEs, tech start-ups, mining royalties, solar and fuel energy, infrastructure, and hard-currency property abroad (Dubai, Lisbon, Paris, Texas). Payments in crypto (USDT, USDC, BTC, ETH) or cash (MTN Mobile Money, Orange Money, card, bank transfer). Income is credited weekly. Based in Douala, Cameroon. English and French.',
    '',
    '## Key facts',
    `- Open projects: ${s.assets} across 8 asset classes in ${s.countries} countries`,
    `- Average target return: ${s.avgRate.toFixed(1)}% per year (targets, not guaranteed)`,
    '- Minimum investment: 100 USD (500 USD for tech start-up rounds)',
    '- Reservation hold: 72 hours while the investor pays',
    '- Payout frequency: weekly credit to balance for yield assets; tech equity pays at exit',
    '- Protection: 5 checks per project (title, site visit, numbers review, one SPV per project, staged escrow)',
    '- Identity verification (KYC) required before activation and withdrawal',
    '- Withdrawals: crypto, Mobile Money or bank, usually within 3 business days',
    '',
    '## Main pages',
    `- [Home](${site}/): overview, live payout simulator`,
    `- [All projects](${site}/assets): marketplace with filters by sector, country, risk`,
    `- [Asset classes](${site}/invest): comparison of the 8 classes`,
    `- [How it works](${site}/how-it-works): step-by-step process`,
    `- [Security & risks](${site}/security)`,
    `- [Payments](${site}/payments): crypto and cash methods`,
    `- [Returns calculator](${site}/returns-calculator)`,
    `- [FAQ](${site}/faq)`,
    `- [Submit a project](${site}/submit-project): for project owners seeking funding`,
    `- French version: ${site}/fr/`,
    '',
    '## Asset classes',
    ...categories.map((c) => `- [${c.name.en}](${site}/invest/${c.slug}): ${c.short.en} Target ${c.target.en}; term ${c.term.en}; payouts ${c.payouts.en.toLowerCase()}.`),
  ];
  if (full) {
    lines.push('', '## Open projects');
    for (const a of list) {
      lines.push(`- [${a.title_en}](${site}/assets/${a.slug}) — ${a.city}, ${countries[a.country_code] ? countries[a.country_code].en : a.country_code}; ${a.cat.name.en}; ${a.target_rate ? a.target_rate + '% target/yr' : a.target_multiple + '× target multiple'}; ${a.term_months} months; ${payoutFreq[a.payout_freq].en.toLowerCase()} payouts; risk ${a.risk}/5; ${a.pct}% reserved; min ${a.min_usd} USD.`);
    }
    lines.push('', '## FAQ');
    for (const f of faq) lines.push(`### ${f.q.en}`, f.a.en, '');
  } else {
    lines.push('', '## Optional', `- [Full details incl. every open project and FAQ](${site}/llms-full.txt)`);
  }
  lines.push('', '## Risk', 'Investing carries risk, including loss of capital. Target returns are estimates and not guaranteed.', '');
  return lines.join('\n');
}
router.get('/llms.txt', (req, res) => res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(llms(false)));
router.get('/llms-full.txt', (req, res) => res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(llms(true)));

router.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json').send(JSON.stringify({
    name: 'Invest n Returns', short_name: 'InvestNR', start_url: '/dashboard', display: 'standalone',
    background_color: '#10221d', theme_color: '#10221d', description: "Invest in Africa's top assets and get paid weekly.",
    icons: [{ src: '/img/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: '/img/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }));
});

router.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain').send(`Contact: mailto:${config.brand.email}\nExpires: ${new Date(Date.now() + 365 * 864e5).toISOString()}\nPreferred-Languages: en, fr\nCanonical: ${config.siteUrl}/.well-known/security.txt\n`);
});

module.exports = router;
