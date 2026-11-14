'use strict';
const { html, raw } = require('../html');
const seo = require('../seo');
const { icon, logoMark, flash, csrfField } = require('./components');
const categories = require('../data/categories');
const { countries } = require('../data/catalog');

const ASSET_V = "4";

// Search-engine verification + analytics (public pages only). IDs are validated when saved.
function trackingTags(ctx) {
  const st = require('../services/settings');
  const g = st.get('google_verification'); const b = st.get('bing_verification');
  const ga4 = st.get('ga4_id'); const gtm = st.get('gtm_id'); const px = st.get('meta_pixel_id');
  return html`${g ? html`<meta name="google-site-verification" content="${g}">` : ''}${b ? html`<meta name="msvalidate.01" content="${b}">` : ''}${ga4 || gtm || px ? html`<script src="/js/analytics.js?v=${ASSET_V}" data-ga4="${ga4}" data-gtm="${gtm}" data-pixel="${px}" async></script>` : ''}`;
}

function docHead(ctx, headMarkup, extraCss = [], tracking = false) {
  return html`<!DOCTYPE html>
<html lang="${ctx.lang}" data-theme-init>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#10221d">
<meta name="color-scheme" content="light dark">
<meta name="csrf-token" content="${ctx.csrf()}">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/logo-512.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/main.css?v=${ASSET_V}">
${extraCss.map((c) => html`<link rel="stylesheet" href="${c}?v=${ASSET_V}">`)}
<link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt">
<script src="/js/theme.js?v=${ASSET_V}"></script>
${tracking ? trackingTags(ctx) : ''}
${headMarkup}
</head>`;
}

function langSwitch(ctx) {
  // Public pages link to the equivalent URL in the other language; app pages set a cookie.
  const enHref = ctx.path;
  const frHref = ctx.path === '/' ? '/fr/' : '/fr' + ctx.path;
  return html`<div class="lang" role="group" aria-label="${ctx.t('Language', 'Langue')}">
    <a href="${enHref}" hreflang="en" lang="en" aria-current="${ctx.lang === 'en' ? 'true' : 'false'}" data-lang="en">EN</a>
    <a href="${frHref}" hreflang="fr" lang="fr" aria-current="${ctx.lang === 'fr' ? 'true' : 'false'}" data-lang="fr">FR</a>
  </div>`;
}

function themeToggle(ctx) {
  return html`<button type="button" class="icon-btn theme-toggle" data-theme-toggle aria-label="${ctx.t('Toggle dark mode', 'Basculer le mode sombre')}">
    <span class="t-sun">${icon('sun', 18)}</span><span class="t-moon">${icon('moon', 18)}</span></button>`;
}

function menus(ctx) {
  const t = ctx.t;
  const st = require('../services/settings');
  const offices = st.offices();
  return [
    { href: '/assets', label: t('Invest', 'Investir'), items: [
      { href: '/assets', label: t('All projects', 'Tous les projets'), desc: t('Open projects, filters by sector, country and risk', 'Projets ouverts, filtres par secteur, pays et risque') },
      { href: '/countries', label: t('Projects by country', 'Projets par pays'), desc: t('Cameroon, Côte d’Ivoire, Nigeria, Kenya and more', 'Cameroun, Côte d’Ivoire, Nigeria, Kenya et plus') },
      { href: '/returns-calculator', label: t('Returns calculator', 'Simulateur de rendement'), desc: t('Income in FCFA or USD by term', 'Revenus en FCFA ou USD selon la durée') },
      { href: '/submit-project', label: t('Get your project funded', 'Faire financer votre projet'), desc: t('For project owners and SMEs', 'Pour les porteurs de projet et PME') },
    ] },
    { href: '/invest', label: t('Asset classes', "Classes d'actifs"), mega: true, items: [
      ...categories.map((c) => ({ href: '/invest/' + c.slug, label: `${c.emoji} ${t.o(c.name)}`, desc: t.o(c.target) })),
      { href: '/invest', label: t('Compare all asset classes', 'Comparer toutes les classes'), desc: t('Returns, terms and payouts side by side', 'Rendements, durées et versements côte à côte') },
    ] },
    { href: '/how-it-works', label: t('How it works', 'Fonctionnement'), items: [
      { href: '/how-it-works', label: t('How investing works', 'Comment investir'), desc: t('From account to payouts in 5 steps', 'Du compte aux versements en 5 étapes') },
      { href: '/payments', label: t('Crypto & cash payments', 'Paiements crypto & cash'), desc: 'USDT · BTC · Mobile Money · Bank' },
      { href: '/security', label: t('Security & risks', 'Sécurité & risques'), desc: t('5 checks, SPV, escrow', '5 contrôles, SPV, séquestre') },
      { href: '/roadmap', label: t('Roadmap', 'Feuille de route'), desc: t('Sectors opening in 2027', 'Secteurs ouverts en 2027') },
      { href: '/faq', label: t('FAQ', 'FAQ'), desc: t('Returns, fees, withdrawals, KYC', 'Rendements, frais, retraits, KYC') },
    ] },
    { href: '/about', label: t('About', 'À propos'), items: [
      { href: '/about', label: t('About us', 'Qui sommes-nous'), desc: t('Our mission and principles', 'Notre mission et nos principes') },
      { href: '/offices', label: t('Our offices', 'Nos bureaux'), desc: offices.map((o) => o.city).join(' · ') },
      ...offices.map((o) => ({ href: '/offices/' + officeSlug(o), label: `${t('Office', 'Bureau')} ${o.city}`, desc: o.street })),
      { href: '/contact', label: 'Contact', desc: st.contactEmail() },
    ] },
  ];
}

function officeSlug(o) {
  return String(o.city || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function header(ctx) {
  const t = ctx.t;
  const isOn = (p) => ctx.path === p || ctx.path.startsWith(p + '/');
  const ms = menus(ctx);
  return html`
<a class="skip" href="#main">${t('Skip to content', 'Aller au contenu')}</a>
<header class="site-header" data-header>
  <div class="wrap nav">
    <a class="logo" href="${ctx.u('/')}" aria-label="Invest n Returns – ${t('home', 'accueil')}">${logoMark} <span>Invest <b>n</b> Returns</span></a>
    <nav aria-label="${t('Main', 'Principal')}" class="main-nav">
      <ul class="menu">
        ${ms.map((m, i) => html`<li class="has-sub${m.mega ? ' mega' : ''}">
          <a href="${ctx.u(m.href)}" ${isOn(m.href) || m.items.some((x) => isOn(x.href)) ? raw('aria-current="page"') : ''}>${m.label}</a>
          <button type="button" class="sub-toggle" aria-expanded="false" aria-controls="sub-${i}" aria-label="${t('Show', 'Afficher')} ${m.label}">${icon('arrow', 12)}</button>
          <div class="sub" id="sub-${i}"><ul>
            ${m.items.map((x) => html`<li><a href="${ctx.u(x.href)}"><b>${x.label}</b>${x.desc ? html`<small>${x.desc}</small>` : ''}</a></li>`)}
          </ul></div>
        </li>`)}
        <li><a href="${ctx.u('/contact')}" ${isOn('/contact') ? raw('aria-current="page"') : ''}>Contact</a></li>
      </ul>
    </nav>
    <div class="nav-tools">
      ${langSwitch(ctx)}
      ${themeToggle(ctx)}
      ${ctx.user
        ? html`<a class="btn btn-gold btn-sm" href="${ctx.user.role === 'admin' ? '/admin' : '/dashboard'}">${icon('grid', 16)} ${ctx.user.role === 'admin' ? 'Admin' : t('Dashboard', 'Tableau de bord')}</a>`
        : html`<a class="nav-login" href="${ctx.u('/login')}">${t('Log in', 'Connexion')}</a><a class="btn btn-gold btn-sm" href="${ctx.u('/register')}">${t('Open account', 'Ouvrir un compte')}</a>`}
      <button type="button" class="icon-btn menu-btn" data-menu-open aria-label="${t('Open menu', 'Ouvrir le menu')}" aria-controls="drawer" aria-expanded="false">${icon('menu')}</button>
    </div>
  </div>
  <div class="scroll-progress" aria-hidden="true"><i data-progress></i></div>
</header>
<div class="drawer" id="drawer" hidden>
  <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
    <button type="button" class="icon-btn drawer-close" data-menu-close aria-label="${t('Close menu', 'Fermer le menu')}">${icon('x')}</button>
    <ul class="drawer-menu">
      ${ms.map((m) => html`<li><details><summary>${m.label}</summary><ul>${m.items.map((x) => html`<li><a href="${ctx.u(x.href)}">${x.label}</a></li>`)}</ul></details></li>`)}
      <li><a href="${ctx.u('/contact')}">Contact</a></li>
    </ul>
    <div class="drawer-cta">
      ${ctx.user
        ? html`<a class="btn btn-gold" href="${ctx.user.role === 'admin' ? '/admin' : '/dashboard'}">${t('Go to dashboard', 'Mon tableau de bord')}</a>`
        : html`<a class="btn btn-gold" href="${ctx.u('/register')}">${t('Open account', 'Ouvrir un compte')}</a><a class="btn btn-ghost" href="${ctx.u('/login')}">${t('Log in', 'Connexion')}</a>`}
    </div>
  </div>
</div>`;
}

const SOCIAL_ICONS = {
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  linkedin: '<path d="M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h4v2c.6-1.1 2-2.3 4-2.3 3.4 0 4 2.2 4 5.2V21h-4v-6c0-1.5 0-3.3-2-3.3s-2.3 1.6-2.3 3.2V21H10z"/>',
  x: '<path d="M4 4l16 16M20 4 4 20"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
  tiktok: '<path d="M14 3v11a4 4 0 1 1-4-4"/><path d="M14 3c.5 2.5 2.5 4.5 5 5"/>',
};

function mapLink(o) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([o.street, o.city, o.region, o.postal, o.country].filter(Boolean).join(', '));
}

function footer(ctx) {
  const t = ctx.t;
  const st = require('../services/settings');
  const offices = st.offices();
  const phone = st.get('phone');
  const legal = st.legalLine();
  const license = st.get('license');
  const hq = offices[0];
  return html`
<footer class="site-footer">
  <div class="wrap">
    <div class="foot">
      <div class="foot-brand">
        <a class="logo" href="${ctx.u('/')}">${logoMark} <span>Invest <b>n</b> Returns</span></a>
        <p>${t("Invest in Africa's real assets — property, farms, companies, mining, energy, infrastructure and tech — plus hard-currency property abroad. Open to investors worldwide.", "Investissez dans les actifs réels d'Afrique — immobilier, agriculture, entreprises, mines, énergie, infrastructures et tech — et dans l'immobilier en devises fortes. Ouvert aux investisseurs du monde entier.")}</p>
        <form class="newsletter" method="post" action="${ctx.u('/subscribe')}">
          ${csrfField(ctx)}
          <label for="nl-email">${t('New projects in your inbox', 'Nouveaux projets par email')}</label>
          <div><input id="nl-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com"><button class="btn btn-gold btn-sm" type="submit">${t('Subscribe', "S'abonner")}</button></div>
        </form>
        ${st.social().length ? html`<ul class="social">${st.social().map((x) => html`<li><a href="${x.url}" target="_blank" rel="noopener me" aria-label="${x.k}">${raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOCIAL_ICONS[x.k]}</svg>`)}</a></li>`)}</ul>` : ''}
      </div>
      <div>
        <h2 class="foot-h">${t('Invest', 'Investir')}</h2>
        <ul>${categories.map((c) => html`<li><a href="${ctx.u('/invest/' + c.slug)}">${t.o(c.name)}</a></li>`)}<li><a href="${ctx.u('/countries')}">${t('By country', 'Par pays')}</a></li></ul>
      </div>
      <div>
        <h2 class="foot-h">${t('Platform', 'Plateforme')}</h2>
        <ul>
          <li><a href="${ctx.u('/assets')}">${t('All projects', 'Tous les projets')}</a></li>
          <li><a href="${ctx.u('/how-it-works')}">${t('How it works', 'Fonctionnement')}</a></li>
          <li><a href="${ctx.u('/returns-calculator')}">${t('Returns calculator', 'Simulateur de rendement')}</a></li>
          <li><a href="${ctx.u('/payments')}">${t('Crypto & cash', 'Crypto & cash')}</a></li>
          <li><a href="${ctx.u('/security')}">${t('Security & risks', 'Sécurité & risques')}</a></li>
          <li><a href="${ctx.u('/roadmap')}">${t('Roadmap', 'Feuille de route')}</a></li>
          <li><a href="${ctx.u('/faq')}">FAQ</a></li>
          <li><a href="${ctx.u('/submit-project')}">${t('Submit a project', 'Soumettre un projet')}</a></li>
        </ul>
      </div>
      <div>
        <h2 class="foot-h">${t('Company', 'Société')}</h2>
        <ul>
          <li><a href="${ctx.u('/about')}">${t('About us', 'À propos')}</a></li>
          <li><a href="${ctx.u('/offices')}">${t('Our offices', 'Nos bureaux')}</a></li>
          <li><a href="${ctx.u('/contact')}">Contact</a></li>
          <li><a href="${ctx.u('/legal/terms')}">${t('Terms', 'Conditions')}</a></li>
          <li><a href="${ctx.u('/legal/privacy')}">${t('Privacy', 'Confidentialité')}</a></li>
          <li><a href="${ctx.u('/legal/risk')}">${t('Risk disclosure', 'Avertissement sur les risques')}</a></li>
        </ul>
      </div>
      <div class="foot-offices">
        <h2 class="foot-h">${t('Offices', 'Bureaux')}</h2>
        <ul>
          ${offices.map((o) => html`<li><a href="${ctx.u('/offices/' + officeSlug(o))}"><b>${o.name}</b></a><address>${o.street}<br>${[o.postal, o.city].filter(Boolean).join(' ')}${o.region ? `, ${o.region}` : ''} · ${ctx.t.o(countries[o.country]) || o.country}</address>${o.phone ? html`<a href="tel:${st.digits(o.phone) ? '+' + st.digits(o.phone) : ''}">${o.phone}</a>` : ''}</li>`)}
          <li><a href="mailto:${st.contactEmail()}">${st.contactEmail()}</a>${phone ? html`<br><a href="tel:+${st.digits(phone)}">${phone}</a>` : ''}</li>
        </ul>
      </div>
    </div>
    <p class="legal">${legal ? legal + ' · ' : ''}${hq ? t(`Head office: ${hq.street}, ${hq.city}. `, `Siège : ${hq.street}, ${hq.city}. `) : ''}${license ? license + ' ' : ''}${t('Investing carries risk, including loss of capital. Target returns are estimates and not guaranteed. Past performance does not predict future results. Nothing on this site is an offer in any jurisdiction where such an offer would be unlawful. Investment services are provided subject to the applicable approvals of the competent authorities.', "Investir comporte des risques, y compris de perte en capital. Les rendements cibles sont des estimations non garanties. Les performances passées ne préjugent pas des performances futures. Rien sur ce site ne constitue une offre dans un pays où elle serait illégale. Les services d'investissement sont fournis sous réserve des agréments des autorités compétentes.")}</p>
    <p class="legal">© ${new Date().getFullYear()} Invest n Returns</p>
  </div>
</footer>`;
}

function whatsappFloat(ctx) {
  const link = require('../services/settings').whatsappLink(ctx.lang);
  if (!link) return '';
  return html`<a class="wa-float" href="${link}" target="_blank" rel="noopener" aria-label="${ctx.t('Chat with us on WhatsApp', 'Discuter avec nous sur WhatsApp')}">
    ${raw('<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-1-2.2-1s-.5-.2-.7.2l-1 1.2c-.2.2-.4.3-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3.1 4.9 4.4 1.8.8 2.5.8 3.4.7.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.3.2-1.5l-.6-.3z"/></svg>')}
    <span>${ctx.t('WhatsApp', 'WhatsApp')}</span>
  </a>`;
}

// Public, indexable page.
function page(ctx, { seo: s, body, bodyClass = '' }) {
  return html`${docHead(ctx, seo.head(ctx, s), [], true)}
<body class="${bodyClass}">
${header(ctx)}
<main id="main">
${flash(ctx)}
${body}
</main>
${footer(ctx)}
${whatsappFloat(ctx)}
<div class="toast-zone" aria-live="polite"></div>
<script src="/js/main.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

// Minimal centered layout for auth pages.
function authPage(ctx, { title, description, body }) {
  return html`${docHead(ctx, seo.head(ctx, { title, description, noindex: true }))}
<body class="auth-body">
<a class="skip" href="#main">${ctx.t('Skip to content', 'Aller au contenu')}</a>
<div class="auth-bg" aria-hidden="true"><i></i><i></i><i></i></div>
<main id="main" class="auth-main">
  <div class="auth-top">
    <a class="logo" href="${ctx.u('/')}">${logoMark} <span>Invest <b>n</b> Returns</span></a>
    <div class="nav-tools">${langSwitch(ctx)}${themeToggle(ctx)}</div>
  </div>
  ${flash(ctx)}
  ${body}
</main>
<div class="toast-zone" aria-live="polite"></div>
<script src="/js/main.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

// Private app shell (investor dashboard and admin), never indexed.
function appPage(ctx, { title, area = 'user', active = '', body, unread = 0, counts = {} }) {
  counts = counts && Object.keys(counts).length ? counts : (ctx.res.locals && ctx.res.locals.counts) || {};
  const t = ctx.t;
  const b = (ctx.res.locals && ctx.res.locals.badges) || {};
  if (area === 'user' && !unread) unread = b.notif || 0;
  const userNav = [
    ['/dashboard', 'home', t('Overview', "Vue d'ensemble")],
    ['/dashboard/reservations', 'ticket', t('My investments', 'Mes investissements')],
    ['/dashboard/offers', 'briefcase', t('Offers', 'Propositions'), false, b.offers],
    ['/dashboard/messages', 'inbox', t('Messages', 'Messages'), false, b.msgs],
    ['/assets', 'grid', t('Browse projects', 'Parcourir les projets'), true],
    ['/dashboard/watchlist', 'heart', t('Watchlist', 'Favoris')],
    ['/dashboard/wallet', 'wallet', t('Wallet', 'Portefeuille')],
    ['/dashboard/kyc', 'shield', t('Identity (KYC)', 'Identité (KYC)')],
    ['/dashboard/notifications', 'bell', t('Notifications', 'Notifications'), false, unread],
    ['/dashboard/profile', 'user', t('Profile & security', 'Profil & sécurité')],
  ];
  const adminNav = [
    ['/admin', 'chart', 'Overview'],
    ['/admin/assets', 'building', 'Assets'],
    ['/admin/reservations', 'ticket', 'Reservations', false, counts.pendingRes],
    ['/admin/users', 'users', 'Users & KYC', false, counts.pendingKyc],
    ['/admin/inbox', 'inbox', 'Inbox', false, counts.inbox],
    ['/admin/proposals', 'briefcase', 'Proposals'],
    ['/admin/broadcast', 'send', 'Announcements'],
    ['/admin/withdrawals', 'wallet', 'Withdrawals', false, counts.pendingWd],
    ['/admin/payouts', 'coins', 'Payouts', false, counts.duePay],
    ['/admin/submissions', 'building', 'Project submissions', false, counts.newSub],
    ['/admin/messages', 'log', 'Contact forms', false, counts.newMsg],
    ['/admin/settings', 'shield', 'Settings'],
    ['/admin/outbox', 'send', 'Email outbox'],
    ['/admin/audit', 'log', 'Audit log'],
  ];
  const nav = area === 'admin' ? adminNav : userNav;
  return html`${docHead(ctx, seo.head(ctx, { title, description: 'Invest n Returns account area', noindex: true, localized: false }), ['/css/app.css'])}
<body class="app-body area-${area}">
<a class="skip" href="#main">${t('Skip to content', 'Aller au contenu')}</a>
<div class="app">
  <aside class="side" id="side" data-side>
    <a class="logo" href="${area === 'admin' ? '/admin' : '/dashboard'}">${logoMark} <span>Invest <b>n</b> Returns</span></a>
    ${area === 'admin' ? html`<span class="side-tag">Admin console</span>` : ''}
    <nav aria-label="${area === 'admin' ? 'Admin' : t('Account', 'Compte')}">
      <ul>
        ${nav.map(([href, ic, label, ext, n]) => html`<li><a href="${ext ? ctx.u(href) : href}" ${active === href ? raw('aria-current="page"') : ''}>${icon(ic, 18)}<span>${label}</span>${n ? html`<em class="count">${n}</em>` : ''}</a></li>`)}
      </ul>
    </nav>
    <div class="side-foot">
      ${ctx.user.role === 'admin' ? html`<a href="${area === 'admin' ? '/dashboard' : '/admin'}" class="side-switch">${icon(area === 'admin' ? 'user' : 'chart', 16)} ${area === 'admin' ? t('Investor view', 'Vue investisseur') : 'Admin console'}</a>` : ''}
      <a href="${ctx.u('/')}" class="side-switch">${icon('external', 16)} ${t('Public website', 'Site public')}</a>
      <form method="post" action="/logout">${csrfField(ctx)}<button type="submit" class="side-switch">${icon('logout', 16)} ${t('Log out', 'Déconnexion')}</button></form>
    </div>
  </aside>
  <div class="app-main">
    <header class="topbar">
      <button type="button" class="icon-btn side-btn" data-side-toggle aria-controls="side" aria-expanded="false" aria-label="Menu">${icon('menu')}</button>
      <h1 class="topbar-title">${title}</h1>
      <div class="nav-tools">
        <form method="post" action="/lang" class="lang-form">${csrfField(ctx)}
          <input type="hidden" name="next" value="${ctx.req.originalUrl}">
          <div class="lang" role="group" aria-label="${t('Language', 'Langue')}">
            <button name="lang" value="en" aria-current="${ctx.lang === 'en' ? 'true' : 'false'}">EN</button>
            <button name="lang" value="fr" aria-current="${ctx.lang === 'fr' ? 'true' : 'false'}">FR</button>
          </div>
        </form>
        ${themeToggle(ctx)}
        ${area === 'user' ? html`<a class="icon-btn bell" href="/dashboard/notifications" aria-label="${t('Notifications', 'Notifications')}">${icon('bell', 18)}${unread ? html`<em>${unread}</em>` : ''}</a>` : ''}
        <span class="avatar" title="${ctx.user.email}">${(ctx.user.name || '?').trim().charAt(0).toUpperCase()}</span>
      </div>
    </header>
    <main id="main" class="app-content">
      ${flash(ctx)}
      ${body}
    </main>
  </div>
</div>
${area === 'user' ? whatsappFloat(ctx) : ''}
<div class="toast-zone" aria-live="polite"></div>
<script src="/js/main.js?v=${ASSET_V}" defer></script>
<script src="/js/app.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

function errorPage(ctx, status, message) {
  const t = ctx.t;
  const title = status === 404 ? t('Page not found', 'Page introuvable') : status === 403 ? t('Access denied', 'Accès refusé') : status === 429 ? t('Slow down', 'Doucement') : t('Something went wrong', 'Une erreur est survenue');
  return page(ctx, {
    seo: { title, description: message || title, noindex: true },
    body: html`<section class="error-page"><div class="wrap">
      <p class="eyebrow num">${status}</p>
      <h1>${title}</h1>
      <p class="lead">${message || t('The page you are looking for does not exist or has moved.', "La page demandée n'existe pas ou a été déplacée.")}</p>
      <div class="ctas"><a class="btn btn-gold" href="${ctx.u('/')}">${t('Back to home', "Retour à l'accueil")}</a><a class="btn btn-ghost" href="${ctx.u('/assets')}">${t('Browse projects', 'Voir les projets')}</a></div>
    </div></section>`,
  });
}

module.exports = { page, authPage, appPage, errorPage, officeSlug, mapLink, whatsappFloat };
