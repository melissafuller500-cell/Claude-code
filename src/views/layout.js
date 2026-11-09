'use strict';
const { html, raw } = require('../html');
const seo = require('../seo');
const { icon, logoMark, flash, csrfField } = require('./components');
const categories = require('../data/categories');

const ASSET_V = '1';

function docHead(ctx, headMarkup, extraCss = []) {
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

function header(ctx) {
  const nav = [
    ['/assets', ctx.t('Invest', 'Investir')],
    ['/invest', ctx.t('Asset classes', "Classes d'actifs")],
    ['/how-it-works', ctx.t('How it works', 'Fonctionnement')],
    ['/security', ctx.t('Security', 'Sécurité')],
    ['/faq', 'FAQ'],
    ['/about', ctx.t('About', 'À propos')],
  ];
  const isOn = (p) => ctx.path === p || ctx.path.startsWith(p + '/');
  return html`
<a class="skip" href="#main">${ctx.t('Skip to content', 'Aller au contenu')}</a>
<header class="site-header" data-header>
  <div class="wrap nav">
    <a class="logo" href="${ctx.u('/')}" aria-label="Invest n Returns – ${ctx.t('home', 'accueil')}">${logoMark} <span>Invest <b>n</b> Returns</span></a>
    <nav aria-label="${ctx.t('Main', 'Principal')}" class="main-nav">
      <ul>
        ${nav.map(([p, l]) => html`<li><a href="${ctx.u(p)}" ${isOn(p) ? raw('aria-current="page"') : ''}>${l}</a></li>`)}
      </ul>
    </nav>
    <div class="nav-tools">
      ${langSwitch(ctx)}
      ${themeToggle(ctx)}
      ${ctx.user
        ? html`<a class="btn btn-gold btn-sm" href="${ctx.user.role === 'admin' ? '/admin' : '/dashboard'}">${icon('grid', 16)} ${ctx.user.role === 'admin' ? 'Admin' : ctx.t('Dashboard', 'Tableau de bord')}</a>`
        : html`<a class="nav-login" href="${ctx.u('/login')}">${ctx.t('Log in', 'Connexion')}</a><a class="btn btn-gold btn-sm" href="${ctx.u('/register')}">${ctx.t('Open account', 'Ouvrir un compte')}</a>`}
      <button type="button" class="icon-btn menu-btn" data-menu-open aria-label="${ctx.t('Open menu', 'Ouvrir le menu')}" aria-controls="drawer" aria-expanded="false">${icon('menu')}</button>
    </div>
  </div>
  <div class="scroll-progress" aria-hidden="true"><i data-progress></i></div>
</header>
<div class="drawer" id="drawer" hidden>
  <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
    <button type="button" class="icon-btn drawer-close" data-menu-close aria-label="${ctx.t('Close menu', 'Fermer le menu')}">${icon('x')}</button>
    <ul>
      ${nav.map(([p, l]) => html`<li><a href="${ctx.u(p)}">${l}</a></li>`)}
      <li><a href="${ctx.u('/submit-project')}">${ctx.t('Submit a project', 'Soumettre un projet')}</a></li>
      <li><a href="${ctx.u('/contact')}">Contact</a></li>
    </ul>
    <div class="drawer-cta">
      ${ctx.user
        ? html`<a class="btn btn-gold" href="${ctx.user.role === 'admin' ? '/admin' : '/dashboard'}">${ctx.t('Go to dashboard', 'Mon tableau de bord')}</a>`
        : html`<a class="btn btn-gold" href="${ctx.u('/register')}">${ctx.t('Open account', 'Ouvrir un compte')}</a><a class="btn btn-ghost" href="${ctx.u('/login')}">${ctx.t('Log in', 'Connexion')}</a>`}
    </div>
  </div>
</div>`;
}

function footer(ctx) {
  return html`
<footer class="site-footer">
  <div class="wrap">
    <div class="foot">
      <div>
        <a class="logo" href="${ctx.u('/')}">${logoMark} <span>Invest <b>n</b> Returns</span></a>
        <p>${ctx.t("Africa's top assets: property, farms, companies, mining, energy, infrastructure, tech and hard-currency assets abroad. Open to investors worldwide.", "Les meilleurs actifs d'Afrique : immobilier, agriculture, entreprises, mines, énergie, infrastructures, tech et actifs en devises fortes. Ouvert aux investisseurs du monde entier.")}</p>
        <form class="newsletter" method="post" action="${ctx.u('/subscribe')}">
          ${csrfField(ctx)}
          <label for="nl-email">${ctx.t('New projects in your inbox', 'Nouveaux projets par email')}</label>
          <div><input id="nl-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com"><button class="btn btn-gold btn-sm" type="submit">${ctx.t('Subscribe', "S'abonner")}</button></div>
        </form>
      </div>
      <div>
        <h2 class="foot-h">${ctx.t('Invest', 'Investir')}</h2>
        <ul>${categories.map((c) => html`<li><a href="${ctx.u('/invest/' + c.slug)}">${ctx.t.o(c.name)}</a></li>`)}</ul>
      </div>
      <div>
        <h2 class="foot-h">${ctx.t('Platform', 'Plateforme')}</h2>
        <ul>
          <li><a href="${ctx.u('/assets')}">${ctx.t('All projects', 'Tous les projets')}</a></li>
          <li><a href="${ctx.u('/how-it-works')}">${ctx.t('How it works', 'Fonctionnement')}</a></li>
          <li><a href="${ctx.u('/returns-calculator')}">${ctx.t('Returns calculator', 'Simulateur de rendement')}</a></li>
          <li><a href="${ctx.u('/payments')}">${ctx.t('Crypto & cash', 'Crypto & cash')}</a></li>
          <li><a href="${ctx.u('/security')}">${ctx.t('Security & risks', 'Sécurité & risques')}</a></li>
          <li><a href="${ctx.u('/roadmap')}">${ctx.t('Roadmap', 'Feuille de route')}</a></li>
          <li><a href="${ctx.u('/submit-project')}">${ctx.t('Submit a project', 'Soumettre un projet')}</a></li>
        </ul>
      </div>
      <div>
        <h2 class="foot-h">${ctx.t('Company', 'Société')}</h2>
        <ul>
          <li><a href="${ctx.u('/about')}">${ctx.t('About us', 'À propos')}</a></li>
          <li><a href="${ctx.u('/faq')}">FAQ</a></li>
          <li><a href="${ctx.u('/contact')}">Contact</a></li>
          <li><a href="${ctx.u('/legal/terms')}">${ctx.t('Terms', 'Conditions')}</a></li>
          <li><a href="${ctx.u('/legal/privacy')}">${ctx.t('Privacy', 'Confidentialité')}</a></li>
          <li><a href="${ctx.u('/legal/risk')}">${ctx.t('Risk disclosure', 'Avertissement sur les risques')}</a></li>
        </ul>
      </div>
    </div>
    <p class="legal">${ctx.t('Invest n Returns · Registered office: Douala, Cameroon. Investing carries risk, including loss of capital. Target returns are estimates and not guaranteed. Past performance does not predict future results. Nothing on this site is an offer in any jurisdiction where such an offer would be unlawful. Investment services are provided subject to the applicable approvals of the competent authorities.', "Invest n Returns · Siège : Douala, Cameroun. Investir comporte des risques, y compris de perte en capital. Les rendements cibles sont des estimations non garanties. Les performances passées ne préjugent pas des performances futures. Rien sur ce site ne constitue une offre dans un pays où elle serait illégale. Les services d'investissement sont fournis sous réserve des agréments des autorités compétentes.")}</p>
    <p class="legal">© ${new Date().getFullYear()} Invest n Returns</p>
  </div>
</footer>`;
}

// Public, indexable page.
function page(ctx, { seo: s, body, bodyClass = '' }) {
  return html`${docHead(ctx, seo.head(ctx, s))}
<body class="${bodyClass}">
${header(ctx)}
<main id="main">
${flash(ctx)}
${body}
</main>
${footer(ctx)}
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
  const t = ctx.t;
  const userNav = [
    ['/dashboard', 'home', t('Overview', "Vue d'ensemble")],
    ['/dashboard/reservations', 'ticket', t('My investments', 'Mes investissements')],
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
    ['/admin/withdrawals', 'wallet', 'Withdrawals', false, counts.pendingWd],
    ['/admin/payouts', 'coins', 'Payouts'],
    ['/admin/submissions', 'briefcase', 'Project submissions', false, counts.newSub],
    ['/admin/messages', 'inbox', 'Messages', false, counts.newMsg],
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

module.exports = { page, authPage, appPage, errorPage };
