'use strict';
// SEO / AEO / GEO helpers: meta tags, canonical + hreflang, Open Graph, and schema.org JSON-LD.
const { html, json } = require('./html');
const config = require('./config');

const ORG_ID = `${config.siteUrl}/#organization`;
const SITE_ID = `${config.siteUrl}/#website`;

function head(ctx, { title, description, path = ctx.path, type = 'website', image, noindex = false, jsonld = [], localized = true, keywords }) {
  const site = config.siteUrl;
  const enUrl = site + (path === '/' ? '/' : path);
  const frUrl = site + (path === '/' ? '/fr/' : '/fr' + path);
  const canonical = localized && ctx.lang === 'fr' ? frUrl : enUrl;
  const fullTitle = title.includes(config.brand.name) ? title : `${title} | ${config.brand.name}`;
  const img = image || `${site}/img/og-image.png`;
  const graph = [organization(), website(ctx), ...jsonld].filter(Boolean);
  return html`
<title>${fullTitle}</title>
<meta name="description" content="${description}">
${keywords ? html`<meta name="keywords" content="${keywords}">` : ''}
<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
<link rel="canonical" href="${canonical}">
${localized && !noindex ? html`<link rel="alternate" hreflang="en" href="${enUrl}">
<link rel="alternate" hreflang="fr" href="${frUrl}">
<link rel="alternate" hreflang="x-default" href="${enUrl}">` : ''}
<meta property="og:site_name" content="${config.brand.name}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${ctx.lang === 'fr' ? 'fr_FR' : 'en_US'}">
<meta property="og:locale:alternate" content="${ctx.lang === 'fr' ? 'en_US' : 'fr_FR'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${fullTitle}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${img}">
${noindex ? '' : html`<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': graph })}</script>`}`;
}

function organization() {
  return {
    '@type': ['Organization', 'FinancialService'],
    '@id': ORG_ID,
    name: config.brand.name,
    url: config.siteUrl + '/',
    logo: { '@type': 'ImageObject', url: `${config.siteUrl}/img/logo-512.png`, width: 512, height: 512 },
    image: `${config.siteUrl}/img/og-image.png`,
    email: config.brand.email,
    description: 'Invest n Returns is an investment platform for African real assets: rental property, farms, SME loans, tech start-ups, mining royalties, energy, infrastructure and hard-currency property abroad. Investors pay in crypto (USDT, USDC, BTC, ETH) or cash (Mobile Money, card, bank) and receive income weekly.',
    address: { '@type': 'PostalAddress', addressLocality: 'Douala', addressRegion: 'Littoral', addressCountry: 'CM' },
    areaServed: ['Africa', 'Europe', 'North America', 'Asia'],
    knowsLanguage: ['en', 'fr'],
    knowsAbout: ['Real estate investing in Africa', 'Agricultural investment', 'SME lending', 'Mining royalties', 'Solar mini-grids', 'Crypto investing', 'Mobile Money'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: config.brand.email, availableLanguage: ['English', 'French'] },
  };
}

function website(ctx) {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: config.siteUrl + '/',
    name: config.brand.name,
    inLanguage: ctx.lang,
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${config.siteUrl}${ctx.u('/assets')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbs(ctx, items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: config.siteUrl + it.url })),
  };
}

function faqPage(ctx, faqs) {
  return {
    '@type': 'FAQPage',
    inLanguage: ctx.lang,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: ctx.t.o(f.q), acceptedAnswer: { '@type': 'Answer', text: ctx.t.o(f.a) } })),
  };
}

function webPage(ctx, { name, description, path = ctx.path, type = 'WebPage', speakable = true, dateModified }) {
  const url = config.siteUrl + ctx.u(path);
  return {
    '@type': type,
    '@id': url + '#webpage',
    url, name, description, inLanguage: ctx.lang,
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    dateModified: new Date(dateModified || Date.now()).toISOString().slice(0, 10),
    ...(speakable ? { speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.answer'] } } : {}),
  };
}

function investment(ctx, a) {
  const url = config.siteUrl + ctx.u(`/assets/${a.slug}`);
  return {
    '@type': 'InvestmentOrDeposit',
    '@id': url + '#investment',
    name: ctx.t(a.title_en, a.title_fr),
    description: ctx.t(a.summary_en, a.summary_fr),
    url,
    category: ctx.t.o(a.cat.name),
    provider: { '@id': ORG_ID },
    areaServed: a.country_code,
    ...(a.target_rate ? { annualPercentageRate: a.target_rate, interestRate: a.target_rate } : {}),
    amount: { '@type': 'MonetaryAmount', currency: 'USD', minValue: a.min_usd, maxValue: a.goal_usd },
    feesAndCommissionsSpecification: ctx.t('Platform fee depends on investment tier; see the fee schedule.', 'Les frais dépendent du palier ; voir la grille tarifaire.'),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: a.min_usd,
      availability: a.status === 'open' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      seller: { '@id': ORG_ID },
    },
  };
}

function itemList(ctx, assetsList, name) {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: assetsList.length,
    itemListElement: assetsList.slice(0, 50).map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: config.siteUrl + ctx.u(`/assets/${a.slug}`), name: ctx.t(a.title_en, a.title_fr) })),
  };
}

module.exports = { head, breadcrumbs, faqPage, webPage, investment, itemList, organization };
