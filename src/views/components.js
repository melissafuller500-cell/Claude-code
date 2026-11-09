'use strict';
const { html, raw } = require('../html');
const { countries, payoutFreq, statusLabels } = require('../data/catalog');

// Lucide-style stroke icons (MIT-compatible geometry drawn by hand).
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 0-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2"/><path d="M22 11h-5a2 2 0 0 0 0 4h5z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  heart: '<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-5-6"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  log: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  coins: '<circle cx="8" cy="8" r="5"/><path d="M18.1 10.4A5 5 0 1 1 10.4 18"/><path d="M7 6h1v4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  external: '<path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
};
const icon = (name, size = 20) => raw(`<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`);

const logoMark = raw('<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="16" width="5" height="10" rx="1" fill="#b8862b"/><rect x="11.5" y="10" width="5" height="16" rx="1" fill="#2f7a55"/><rect x="21" y="3" width="5" height="23" rx="1" fill="currentColor"/></svg>');

function riskMeter(ctx, risk) {
  const bars = [1, 2, 3, 4, 5].map((i) => html`<i class="${i <= risk ? 'on' : ''}"></i>`);
  return html`<span class="risk" role="img" aria-label="${ctx.t('Risk', 'Risque')} ${risk}/5">${bars}</span>`;
}

function badge(ctx, status) {
  const l = statusLabels[status] || { en: status, fr: status };
  return html`<span class="badge badge-${status}">${ctx.t.o(l)}</span>`;
}

function targetLabel(ctx, a) {
  if (a.target_rate) return ctx.f.pct(a.target_rate, 1);
  if (a.target_multiple) return `${ctx.f.num(a.target_multiple, a.target_multiple % 1 ? 1 : 0)}×`;
  return '—';
}

function termLabel(ctx, months) {
  if (months >= 36 && months % 12 === 0) return ctx.t(`${months / 12} yr`, `${months / 12} ans`);
  return ctx.t(`${months} mo`, `${months} mois`);
}

// Deterministic decorative cover per asset (no external images needed).
function cover(a, cls = 'cover') {
  const hue = a.cat.hue;
  let seed = 0;
  for (const ch of a.slug) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const shapes = [];
  for (let i = 0; i < 7; i++) {
    const x = Math.round(rnd() * 400);
    const w = 30 + Math.round(rnd() * 60);
    const h = 40 + Math.round(rnd() * 110);
    shapes.push(`<rect x="${x}" y="${200 - h}" width="${w}" height="${h}" rx="4" fill="hsla(${hue},45%,${55 + Math.round(rnd() * 20)}%,${(0.18 + rnd() * 0.25).toFixed(2)})"/>`);
  }
  return raw(`<div class="${cls}" style="--h:${hue}" aria-hidden="true"><svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g${a.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},40%,16%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},45%,24%)"/></linearGradient></defs><rect width="400" height="200" fill="url(#g${a.id})"/><circle cx="${320 - Math.round(rnd() * 60)}" cy="${50 + Math.round(rnd() * 30)}" r="${26 + Math.round(rnd() * 16)}" fill="hsla(${(hue + 20) % 360},80%,70%,.35)"/>${shapes.join('')}</svg><span class="cover-emoji">${a.cat.emoji}</span></div>`);
}

function assetCard(ctx, a, { saved = false } = {}) {
  const loc = `${a.city}, ${ctx.t.o(countries[a.country_code]) || a.country_code}`;
  return html`
<article class="proj reveal" data-cat="${a.category}" data-risk="${a.risk}" data-search="${(a.title_en + ' ' + a.title_fr + ' ' + a.city + ' ' + a.region).toLowerCase()}">
  <a class="proj-link" href="${ctx.u('/assets/' + a.slug)}" aria-label="${ctx.t(a.title_en, a.title_fr)}">
    ${cover(a)}
  </a>
  <div class="proj-top">
    <div>
      <h3><a href="${ctx.u('/assets/' + a.slug)}">${ctx.t(a.title_en, a.title_fr)}</a></h3>
      <small>${icon('pin', 14)} ${loc}</small>
    </div>
    <span class="chip ${a.category}">${ctx.t.o(a.cat.name)}</span>
  </div>
  <div class="proj-body">
    <div><span>${a.yield_based ? ctx.t('Target return / yr', 'Rendement cible / an') : ctx.t('Target multiple', 'Multiple cible')}</span><b class="hl">${targetLabel(ctx, a)}</b></div>
    <div><span>${ctx.t('Term', 'Durée')}</span><b>${termLabel(ctx, a.term_months)}</b></div>
    <div><span>${ctx.t('Payouts', 'Versements')}</span><b>${ctx.t.o(payoutFreq[a.payout_freq])}</b></div>
    <div><span>${ctx.t('Risk', 'Risque')} ${a.risk}/5</span>${riskMeter(ctx, a.risk)}</div>
  </div>
  <div class="bar" role="progressbar" aria-valuenow="${a.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${ctx.t('Funded', 'Financé')}"><i style="--w:${a.pct}%"></i></div>
  <div class="proj-foot">
    <span>${ctx.t('Goal', 'Objectif')} <span class="num">${ctx.f.money(a.goal_local, a.currency)}</span></span>
    <span class="num">${a.pct}% ${a.status === 'funded' ? ctx.t('funded', 'financé') : ctx.t('reserved', 'réservé')}</span>
  </div>
  ${ctx.user ? html`<button type="button" class="save-btn${saved ? ' on' : ''}" data-save="${a.slug}" aria-pressed="${saved ? 'true' : 'false'}" aria-label="${ctx.t('Save to watchlist', 'Ajouter aux favoris')}">${icon('heart', 18)}</button>` : ''}
</article>`;
}

function flash(ctx) {
  if (!ctx.flash) return '';
  return html`<div class="flash flash-${ctx.flash.type === 'error' ? 'error' : 'ok'}" role="status" data-autohide>${ctx.flash.text}</div>`;
}

function csrfField(ctx) {
  return html`<input type="hidden" name="_csrf" value="${ctx.csrf()}">`;
}

function pagination(ctx, { page, pages, base }) {
  if (pages <= 1) return '';
  const sep = base.includes('?') ? '&' : '?';
  const links = [];
  for (let i = 1; i <= pages; i++) links.push(html`<a href="${base}${sep}page=${i}" class="${i === page ? 'on' : ''}" ${i === page ? raw('aria-current="page"') : ''}>${i}</a>`);
  return html`<nav class="pager" aria-label="Pagination">${links}</nav>`;
}

module.exports = { icon, logoMark, riskMeter, badge, targetLabel, termLabel, assetCard, cover, flash, csrfField, pagination };
