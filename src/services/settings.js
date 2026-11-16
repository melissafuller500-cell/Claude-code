'use strict';
// Admin-editable site settings stored in the database (Admin → Settings). No redeploy needed.
// SCHEMA drives both the admin form and validation. Values are cached in memory and the cache
// is cleared on every write.
const { q } = require('../db');

const PAY_KEYS = {
  usdt: 'PAY_USDT_ADDRESS', usdc: 'PAY_USDC_ADDRESS', btc: 'PAY_BTC_ADDRESS', eth: 'PAY_ETH_ADDRESS',
  momo: 'PAY_MOMO_NUMBER', orange: 'PAY_ORANGE_NUMBER', bank: 'PAY_BANK_IBAN', card: 'PAY_CARD_LINK',
};

const isProd = process.env.NODE_ENV === 'production';
const defaultSite = (process.env.SITE_URL || (isProd ? 'https://investnreturns.com' : `http://localhost:${Number(process.env.PORT) || 3000}`)).replace(/\/+$/, '');

// type: text | email | url | tel | textarea | secret | bool | select
const SCHEMA = [
  { id: 'general', title: 'Website & contact', help: 'Shown in the header, footer, contact page, emails and search-engine data.', fields: [
    { key: 'site_url', label: 'Website address (domain)', type: 'url', def: defaultSite, help: 'Used for canonical links, sitemap and social previews. Example: https://investnreturns.com' },
    { key: 'contact_email', label: 'Public contact email', type: 'email', def: 'admin@investnreturns.com' },
    { key: 'support_email', label: 'Investor support email (optional)', type: 'email', def: '' },
    { key: 'phone', label: 'Main phone number', type: 'tel', def: '', help: 'International format, e.g. +237 6 XX XX XX XX' },
    { key: 'whatsapp', label: 'WhatsApp number (floating button)', type: 'tel', def: '', help: 'International format with country code. The green WhatsApp button appears on every page once this is filled.' },
    { key: 'whatsapp_message', label: 'WhatsApp pre-filled message', type: 'text', def: 'Hello Invest n Returns, I would like information about investing.' },
    { key: 'hours', label: 'Opening hours', type: 'text', def: '', help: 'e.g. Mon–Fri 08:00–18:00 (WAT)' },
  ] },
  { id: 'offices', title: 'Offices', help: 'Addresses appear in the footer, contact page, office pages and Google structured data.', fields: [
    { key: 'office1_name', label: 'Head office — name', type: 'text', def: 'Douala (head office)' },
    { key: 'office1_street', label: 'Head office — street', type: 'text', def: '1389 Bd de la Liberté' },
    { key: 'office1_city', label: 'Head office — city', type: 'text', def: 'Douala' },
    { key: 'office1_region', label: 'Head office — region', type: 'text', def: 'Littoral' },
    { key: 'office1_postal', label: 'Head office — postal code', type: 'text', def: '' },
    { key: 'office1_country', label: 'Head office — country code', type: 'text', def: 'CM' },
    { key: 'office1_phone', label: 'Head office — phone', type: 'tel', def: '' },
    { key: 'office2_name', label: 'Office 2 — name', type: 'text', def: 'Kigali' },
    { key: 'office2_street', label: 'Office 2 — street', type: 'text', def: '1st Floor, Kigali City Tower (KCT), KN 81 Street' },
    { key: 'office2_city', label: 'Office 2 — city', type: 'text', def: 'Kigali' },
    { key: 'office2_region', label: 'Office 2 — region', type: 'text', def: '' },
    { key: 'office2_postal', label: 'Office 2 — postal code', type: 'text', def: '' },
    { key: 'office2_country', label: 'Office 2 — country code', type: 'text', def: 'RW' },
    { key: 'office2_phone', label: 'Office 2 — phone', type: 'tel', def: '' },
    { key: 'office3_name', label: 'Office 3 — name', type: 'text', def: 'New York' },
    { key: 'office3_street', label: 'Office 3 — street', type: 'text', def: '120 Wall Street' },
    { key: 'office3_city', label: 'Office 3 — city', type: 'text', def: 'New York' },
    { key: 'office3_region', label: 'Office 3 — state', type: 'text', def: 'NY' },
    { key: 'office3_postal', label: 'Office 3 — postal code', type: 'text', def: '10005' },
    { key: 'office3_country', label: 'Office 3 — country code', type: 'text', def: 'US' },
    { key: 'office3_phone', label: 'Office 3 — phone', type: 'tel', def: '' },
  ] },
  { id: 'legal', title: 'Company & legal', help: 'Shown in the footer legal line and terms. Leave empty what you do not have yet.', fields: [
    { key: 'legal_name', label: 'Registered company name', type: 'text', def: 'Invest n Returns' },
    { key: 'legal_form', label: 'Legal form (SA, SARL, LLC…)', type: 'text', def: '' },
    { key: 'rccm', label: 'RCCM / company registration number', type: 'text', def: '' },
    { key: 'tax_id', label: 'Tax ID (NIU / EIN)', type: 'text', def: '' },
    { key: 'license', label: 'Licence or regulatory status', type: 'textarea', def: '', help: 'Exact wording of any approval (e.g. COSUMAF, CMA). Leave empty until you hold one.' },
  ] },
  { id: 'bank', title: 'Bank account (deposits)', help: 'Used to build the default "Bank transfer" payment details sent to investors.', fields: [
    { key: 'bank_name', label: 'Bank name', type: 'text', def: '' },
    { key: 'bank_account_name', label: 'Account holder', type: 'text', def: '' },
    { key: 'bank_account_number', label: 'Account number', type: 'text', def: '' },
    { key: 'bank_iban', label: 'IBAN', type: 'text', def: '' },
    { key: 'bank_swift', label: 'SWIFT / BIC', type: 'text', def: '' },
    { key: 'bank_address', label: 'Bank address', type: 'text', def: '' },
  ] },
  { id: 'mobile', title: 'Mobile Money & crypto (deposits)', help: 'Used to build default payment details. You can still send custom details per reservation.', fields: [
    { key: 'momo_number', label: 'MTN Mobile Money number', type: 'tel', def: '' },
    { key: 'momo_name', label: 'MTN MoMo account name', type: 'text', def: '' },
    { key: 'orange_number', label: 'Orange Money number', type: 'tel', def: '' },
    { key: 'orange_name', label: 'Orange Money account name', type: 'text', def: '' },
    { key: 'usdt_trc20', label: 'USDT TRC-20 address', type: 'text', def: '' },
    { key: 'usdt_erc20', label: 'USDT ERC-20 address', type: 'text', def: '' },
    { key: 'usdc_address', label: 'USDC address (ERC-20 / Polygon)', type: 'text', def: '' },
    { key: 'btc_address', label: 'BTC address', type: 'text', def: '' },
    { key: 'eth_address', label: 'ETH address', type: 'text', def: '' },
    { key: 'card_link', label: 'Card payment link', type: 'url', def: '' },
  ] },
  { id: 'payinstr', title: 'Custom payment instructions (optional)', help: 'Only if you want to replace the automatic text built from the fields above, for one method.', fields: [
    { key: 'pay_usdt', label: 'USDT instructions', type: 'textarea', def: '' },
    { key: 'pay_usdc', label: 'USDC instructions', type: 'textarea', def: '' },
    { key: 'pay_btc', label: 'BTC instructions', type: 'textarea', def: '' },
    { key: 'pay_eth', label: 'ETH instructions', type: 'textarea', def: '' },
    { key: 'pay_momo', label: 'MTN MoMo instructions', type: 'textarea', def: '' },
    { key: 'pay_orange', label: 'Orange Money instructions', type: 'textarea', def: '' },
    { key: 'pay_bank', label: 'Bank transfer instructions', type: 'textarea', def: '' },
    { key: 'pay_card', label: 'Card payment instructions', type: 'textarea', def: '' },
  ] },
  { id: 'social', title: 'Social media', help: 'Links appear in the footer and in Google structured data (sameAs).', fields: [
    { key: 'social_facebook', label: 'Facebook URL', type: 'url', def: '' },
    { key: 'social_instagram', label: 'Instagram URL', type: 'url', def: '' },
    { key: 'social_linkedin', label: 'LinkedIn URL', type: 'url', def: '' },
    { key: 'social_x', label: 'X (Twitter) URL', type: 'url', def: '' },
    { key: 'social_youtube', label: 'YouTube URL', type: 'url', def: '' },
    { key: 'social_tiktok', label: 'TikTok URL', type: 'url', def: '' },
  ] },
  { id: 'seo', title: 'Analytics & search engines', help: 'Paste only the IDs. Scripts load on public pages only, never in the dashboard or admin.', fields: [
    { key: 'ga4_id', label: 'Google Analytics 4 ID', type: 'text', def: '', pattern: /^G-[A-Z0-9]{4,12}$/, help: 'Format G-XXXXXXX' },
    { key: 'gtm_id', label: 'Google Tag Manager ID', type: 'text', def: 'GTM-5H3TS84D', pattern: /^GTM-[A-Z0-9]{4,10}$/, help: 'Format GTM-XXXXXX. Loaded first in <head> on every public page.' },
    { key: 'meta_pixel_id', label: 'Meta (Facebook) Pixel ID', type: 'text', def: '', pattern: /^\d{8,20}$/ },
    { key: 'google_verification', label: 'Google Search Console verification code', type: 'text', def: '', pattern: /^[A-Za-z0-9_-]{10,100}$/, help: 'Only the content="…" value of the meta tag' },
    { key: 'bing_verification', label: 'Bing Webmaster verification code', type: 'text', def: '', pattern: /^[A-Za-z0-9]{10,64}$/ },
  ] },
  { id: 'email', title: 'Email sending (SMTP)', help: 'Without SMTP, emails are only stored in Admin → Email outbox. With Hostinger email: host smtp.hostinger.com, port 465, secure on, user = your mailbox.', fields: [
    { key: 'smtp_host', label: 'SMTP host', type: 'text', def: '' },
    { key: 'smtp_port', label: 'SMTP port', type: 'text', def: '465', pattern: /^\d{2,5}$/ },
    { key: 'smtp_secure', label: 'Use SSL/TLS (port 465)', type: 'bool', def: '1' },
    { key: 'smtp_user', label: 'SMTP username', type: 'text', def: '' },
    { key: 'smtp_pass', label: 'SMTP password', type: 'secret', def: '' },
    { key: 'mail_from', label: 'From address', type: 'email', def: 'admin@investnreturns.com' },
  ] },
  { id: 'gateways', title: 'Payment gateway API keys', help: 'Saved in your site database; secret keys are never displayed again after saving. Automatic checkout with these gateways is not connected yet: payments are still confirmed manually.', fields: [
    { key: 'flutterwave_public', label: 'Flutterwave public key', type: 'text', def: '' },
    { key: 'flutterwave_secret', label: 'Flutterwave secret key', type: 'secret', def: '' },
    { key: 'cinetpay_site_id', label: 'CinetPay site ID', type: 'text', def: '' },
    { key: 'cinetpay_api_key', label: 'CinetPay API key', type: 'secret', def: '' },
    { key: 'nowpayments_api_key', label: 'NOWPayments API key (crypto)', type: 'secret', def: '' },
  ] },
  { id: 'payouts', title: 'Payouts', fields: [
    { key: 'auto_payouts', label: 'Automatic payouts: credit due payouts every 15 minutes', type: 'bool', def: '0' },
  ] },
];
const FIELDS = Object.fromEntries(SCHEMA.flatMap((s) => s.fields.map((f) => [f.key, f])));

let cache = null;
function load() {
  if (!cache) {
    cache = new Map();
    try { for (const r of q.all('SELECT key, value FROM settings')) cache.set(r.key, r.value); } catch { /* DB not ready */ cache = null; return new Map(); }
  }
  return cache;
}
function get(key, fallback) {
  const m = load();
  if (m.has(key) && m.get(key) !== '') return m.get(key);
  if (fallback !== undefined) return fallback;
  return FIELDS[key] ? FIELDS[key].def : '';
}
function set(key, value) {
  q.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
  cache = null;
}

// Validate and save a submitted settings form. Secrets left empty keep their current value.
function saveForm(body) {
  const errors = [];
  for (const f of Object.values(FIELDS)) {
    let v = body[f.key];
    if (f.type === 'bool') { set(f.key, v === '1' ? '1' : '0'); continue; }
    v = String(v == null ? '' : v).trim().slice(0, f.type === 'textarea' ? 2000 : 300);
    if (f.type === 'secret' && v === '') continue;
    if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { errors.push(`${f.label}: invalid email`); continue; }
    if (v && f.type === 'url' && !/^https?:\/\/[^\s<>"']+$/i.test(v)) { errors.push(`${f.label}: must start with https://`); continue; }
    if (v && f.type === 'tel' && !/^\+?[0-9 ().-]{6,25}$/.test(v)) { errors.push(`${f.label}: invalid phone number`); continue; }
    if (v && f.pattern && !f.pattern.test(v)) { errors.push(`${f.label}: wrong format`); continue; }
    if (f.key === 'site_url') v = v.replace(/\/+$/, '');
    set(f.key, v);
  }
  return errors;
}

// ---------- derived helpers ----------
const siteUrl = () => (get('site_url') || defaultSite).replace(/\/+$/, '');
const contactEmail = () => get('contact_email') || 'admin@investnreturns.com';
const digits = (s) => String(s || '').replace(/[^\d]/g, '');

function offices() {
  return [1, 2, 3].map((i) => ({
    id: i, name: get(`office${i}_name`), street: get(`office${i}_street`), city: get(`office${i}_city`),
    region: get(`office${i}_region`), postal: get(`office${i}_postal`), country: get(`office${i}_country`).toUpperCase(), phone: get(`office${i}_phone`),
  })).filter((o) => o.street && o.city);
}
function social() {
  return ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok'].map((k) => ({ k, url: get('social_' + k) })).filter((s) => s.url);
}
function whatsappLink(lang) {
  const n = digits(get('whatsapp'));
  if (n.length < 8) return '';
  const msg = lang === 'fr' ? "Bonjour Invest n Returns, j'aimerais des informations pour investir." : get('whatsapp_message');
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}
function legalLine() {
  const parts = [get('legal_name'), get('legal_form'), get('rccm') && `RCCM ${get('rccm')}`, get('tax_id') && `${get('office1_country') === 'CM' ? 'NIU' : 'Tax ID'} ${get('tax_id')}`].filter(Boolean);
  return parts.join(' · ');
}

// Default payment instructions for a method: explicit text, then structured fields, then env.
function payDefault(method) {
  const explicit = get('pay_' + method, '');
  if (explicit) return explicit;
  const L = (label, v) => (v ? `${label}: ${v}` : '');
  const join = (...a) => a.filter(Boolean).join('\n');
  let built = '';
  if (method === 'bank') built = get('bank_iban') || get('bank_account_number') ? join(L('Bank', get('bank_name')), L('Account holder', get('bank_account_name')), L('Account number', get('bank_account_number')), L('IBAN', get('bank_iban')), L('SWIFT/BIC', get('bank_swift')), L('Bank address', get('bank_address'))) : '';
  if (method === 'momo') built = get('momo_number') ? join(L('MTN Mobile Money', get('momo_number')), L('Name', get('momo_name'))) : '';
  if (method === 'orange') built = get('orange_number') ? join(L('Orange Money', get('orange_number')), L('Name', get('orange_name'))) : '';
  if (method === 'usdt') built = join(L('USDT TRC-20', get('usdt_trc20')), L('USDT ERC-20', get('usdt_erc20')));
  if (method === 'usdc') built = L('USDC', get('usdc_address'));
  if (method === 'btc') built = L('BTC', get('btc_address'));
  if (method === 'eth') built = L('ETH', get('eth_address'));
  if (method === 'card') built = L('Pay by card', get('card_link'));
  return built || process.env[PAY_KEYS[method]] || '';
}

module.exports = { SCHEMA, FIELDS, get, set, saveForm, payDefault, PAY_KEYS, siteUrl, contactEmail, offices, social, whatsappLink, legalLine, digits, clearCache: () => { cache = null; } };
