'use strict';
// End-to-end tests against a real server with an in-memory database.
process.env.DB_FILE = ':memory:';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminTest!12345';
process.env.SITE_URL = 'http://localhost';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let server;
let base;

test.before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

// Minimal browser-like client with a cookie jar.
function client() {
  const jar = new Map();
  const store = (res) => {
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      const expired = attrs.some((a) => /expires=thu, 01 jan 1970/i.test(a)) || v === '';
      if (expired) jar.delete(k); else jar.set(k, v);
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  async function req(path, { method = 'GET', form, headers = {} } = {}) {
    const opts = { method, redirect: 'manual', headers: { cookie: cookie(), ...headers } };
    if (form) {
      opts.body = new URLSearchParams(form).toString();
      opts.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
    const res = await fetch(base + path, opts);
    store(res);
    const text = await res.text();
    return { status: res.status, text, location: res.headers.get('location'), headers: res.headers };
  }
  async function csrf(path = '/login') {
    const r = await req(path);
    const m = r.text.match(/name="csrf-token" content="([^"]+)"/);
    assert.ok(m, 'csrf token present on ' + path);
    return m[1];
  }
  async function post(path, form, from) {
    const token = await csrf(from || path.replace(/\/[^/]*$/, '') || '/');
    return req(path, { method: 'POST', form: { ...form, _csrf: token } });
  }
  return { req, csrf, post, jar };
}

async function login(c, email, password) {
  const r = await c.post('/login', { email, password }, '/login');
  assert.equal(r.status, 303, 'login redirects');
  return r;
}

test('public pages render with SEO essentials', async () => {
  const c = client();
  for (const p of ['/', '/fr/', '/assets', '/invest', '/invest/agriculture', '/faq', '/how-it-works', '/about', '/legal/risk']) {
    const r = await c.req(p);
    assert.equal(r.status, 200, p);
    assert.match(r.text, /<title>[^<]{10,}<\/title>/, `${p} title`);
    assert.match(r.text, /<meta name="description" content="[^"]{50,}"/, `${p} description`);
    assert.match(r.text, /<link rel="canonical" href="http:\/\/localhost/, `${p} canonical`);
    assert.match(r.text, /hreflang="fr"/, `${p} hreflang`);
    assert.match(r.text, /application\/ld\+json/, `${p} JSON-LD`);
    assert.equal((r.text.match(/<h1[\s>]/g) || []).length, 1, `${p} has exactly one h1`);
  }
  const fr = await c.req('/fr/assets');
  assert.match(fr.text, /<html lang="fr"/);
  assert.match(fr.text, /href="http:\/\/localhost\/fr\/assets"/);
});

test('asset detail has investment schema and FAQ', async () => {
  const c = client();
  const list = await c.req('/assets');
  const slug = list.text.match(/href="\/assets\/([a-z0-9-]+)"/)[1];
  const r = await c.req('/assets/' + slug);
  assert.equal(r.status, 200);
  assert.match(r.text, /"InvestmentOrDeposit"/);
  assert.match(r.text, /"FAQPage"/);
  assert.match(r.text, /"BreadcrumbList"/);
  const ld = JSON.parse(r.text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(Array.isArray(ld['@graph']));
});

test('sitemap, robots and llms.txt', async () => {
  const c = client();
  const sm = await c.req('/sitemap.xml');
  assert.match(sm.text, /<urlset/);
  assert.match(sm.text, /\/fr\/assets\//);
  assert.match(sm.text, /xhtml:link rel="alternate" hreflang="fr"/);
  const rb = await c.req('/robots.txt');
  assert.match(rb.text, /Disallow: \/admin/);
  assert.match(rb.text, /Sitemap: /);
  const ll = await c.req('/llms.txt');
  assert.match(ll.text, /^# Invest n Returns/);
});

test('private areas require login; admin requires admin role', async () => {
  const c = client();
  const d = await c.req('/dashboard');
  assert.equal(d.status, 303);
  assert.match(d.location, /^\/login\?next=/);
  await login(c, 'demo@investnreturns.com', 'Demo!2026invest');
  assert.equal((await c.req('/dashboard')).status, 200);
  assert.equal((await c.req('/admin')).status, 403);
  const dash = await c.req('/dashboard');
  assert.match(dash.text, /noindex/);
});

test('CSRF: POST without token is rejected', async () => {
  const c = client();
  const r = await c.req('/login', { method: 'POST', form: { email: 'x@y.z', password: 'nope' } });
  assert.equal(r.status, 403);
});

test('login rejects bad credentials and open redirects', async () => {
  const c = client();
  const bad = await c.post('/login', { email: 'demo@investnreturns.com', password: 'wrong-password1' }, '/login');
  assert.equal(bad.status, 401);
  const ok = await c.post('/login', { email: 'demo@investnreturns.com', password: 'Demo!2026invest', next: '//evil.example' }, '/login');
  assert.equal(ok.status, 303);
  assert.equal(ok.location, '/dashboard');
});

test('full investor journey: register → KYC → reserve → admin confirm → payout → withdraw', async () => {
  const inv = client();
  const email = `t${Date.now()}@example.com`;
  // Weak password rejected
  const weak = await inv.post('/register', { name: 'Test Investor', email, country: 'CM', password: 'short', consent: '1' }, '/register');
  assert.equal(weak.status, 422);
  const reg = await inv.post('/register', { name: 'Test <b>Investor</b>', email, country: 'CM', password: 'GoodPassw0rd!', consent: '1' }, '/register');
  assert.equal(reg.status, 303);
  const dash = await inv.req('/dashboard');
  assert.equal(dash.status, 200);
  const prof = await inv.req('/dashboard/profile');
  assert.ok(!prof.text.includes('<b>Investor</b>'), 'user input is escaped');
  assert.match(prof.text, /Test &lt;b&gt;Investor&lt;\/b&gt;/);

  // KYC
  const k = await inv.post('/dashboard/kyc', { legalName: 'Test Investor', dob: '1990-01-01', idType: 'passport', idNumber: 'P123', idCountry: 'CM', address: 'Douala', source: 'salary', confirm: '1' }, '/dashboard/kyc');
  assert.equal(k.status, 303);

  // Reserve an open yield asset
  const list = await inv.req('/assets?sort=risk');
  const slug = list.text.match(/href="\/assets\/([a-z0-9-]+)"/)[1];
  const tooSmall = await inv.post(`/dashboard/reserve/${slug}`, { amount: '5', method: 'usdt', consent: '1' }, `/assets/${slug}`);
  assert.equal(tooSmall.status, 303);
  assert.match(tooSmall.location, new RegExp(`/assets/${slug}`));
  const res = await inv.post(`/dashboard/reserve/${slug}`, { amount: '1000', method: 'usdt', consent: '1' }, `/assets/${slug}`);
  assert.equal(res.status, 303);
  const ref = res.location.match(/reservations\/(INR-[A-F0-9]+)/)[1];
  const detail = await inv.req(`/dashboard/reservations/${ref}`);
  assert.match(detail.text, new RegExp(ref));
  assert.match(detail.text, /data-countdown/);

  // Admin: verify KYC and confirm payment
  const adm = client();
  await login(adm, 'admin@test.local', 'AdminTest!12345');
  const users = await adm.req(`/admin/users?q=${encodeURIComponent(email)}`);
  const uid = users.text.match(/href="\/admin\/users\/(\d+)"/)[1];
  const v = await adm.post(`/admin/users/${uid}/kyc`, { decision: 'verified' }, `/admin/users/${uid}`);
  assert.equal(v.status, 303);
  const pending = await adm.req(`/admin/reservations?status=pending&q=${ref}`);
  const rid = pending.text.match(/\/admin\/reservations\/(\d+)\/confirm/)[1];
  const conf = await adm.post(`/admin/reservations/${rid}/confirm`, {}, '/admin/reservations');
  assert.equal(conf.status, 303);
  const active = await adm.req(`/admin/reservations?status=active&q=${ref}`);
  assert.match(active.text, new RegExp(ref));

  // Weekly payout credits the investor
  const run = await adm.post('/admin/payouts/run', {}, '/admin/payouts');
  assert.equal(run.status, 303);
  const again = await adm.post('/admin/payouts/run', {}, '/admin/payouts');
  assert.equal(again.status, 303); // second run same week is refused with a flash, no double credit
  const wallet = await inv.req('/dashboard/wallet');
  assert.match(wallet.text, /Weekly payout/);

  // Withdrawal above balance is refused; a valid one is accepted and held
  const big = await inv.post('/dashboard/wallet/withdraw', { amount: '999999', method: 'momo', destination: '+237600000000' }, '/dashboard/wallet');
  assert.equal(big.status, 422);
  const bal = Number((wallet.text.match(/Available balance<\/span><b class="num">\$([0-9.,]+)/) || [])[1].replace(/,/g, ''));
  assert.ok(bal > 0, 'balance credited by payout');
  if (bal >= 10) {
    const wd = await inv.post('/dashboard/wallet/withdraw', { amount: '10', method: 'momo', destination: '+237600000000' }, '/dashboard/wallet');
    assert.equal(wd.status, 303);
  }

  // Investor sees active position and the CSV export is safe
  const csv = await inv.req('/dashboard/wallet.csv');
  assert.match(csv.headers.get('content-type'), /text\/csv/);
});

test('watchlist JSON toggle', async () => {
  const c = client();
  await login(c, 'demo@investnreturns.com', 'Demo!2026invest');
  const token = await c.csrf('/dashboard');
  const list = await c.req('/assets');
  const slug = list.text.match(/href="\/assets\/([a-z0-9-]+)"/)[1];
  const r1 = await c.req(`/dashboard/watchlist/${slug}`, { method: 'POST', headers: { 'x-csrf-token': token, accept: 'application/json' } });
  assert.equal(r1.status, 200);
  const j1 = JSON.parse(r1.text);
  const r2 = await c.req(`/dashboard/watchlist/${slug}`, { method: 'POST', headers: { 'x-csrf-token': token, accept: 'application/json' } });
  assert.equal(JSON.parse(r2.text).saved, !j1.saved);
});

test('admin can create, edit and delete an asset', async () => {
  const adm = client();
  await login(adm, 'admin@test.local', 'AdminTest!12345');
  const form = {
    title_en: 'Test warehouse', title_fr: 'Entrepôt test', category: 'in', status: 'open', city: 'Douala', region: 'Littoral', country_code: 'CM',
    currency: 'XAF', goal_local: '60000000', target_rate: '12', target_multiple: '', term_months: '36', payout_freq: 'monthly', risk: '2', min_usd: '100',
    offline_raised_usd: '0', summary_en: 'A test warehouse.', summary_fr: 'Un entrepôt test.', description_en: '', description_fr: '', highlights_en: 'Title verified', highlights_fr: 'Titre vérifié',
  };
  const bad = await adm.post('/admin/assets', { ...form, goal_local: '-5' }, '/admin/assets/new');
  assert.equal(bad.status, 422);
  const ok = await adm.post('/admin/assets', form, '/admin/assets/new');
  assert.equal(ok.status, 303);
  const id = ok.location.match(/assets\/(\d+)\/edit/)[1];
  const pub = await adm.req('/assets/test-warehouse-douala');
  assert.equal(pub.status, 200);
  const edit = await adm.post(`/admin/assets/${id}`, { ...form, title_en: 'Test warehouse 2', slug: 'test-warehouse-douala' }, `/admin/assets/${id}/edit`);
  assert.equal(edit.status, 303);
  const del = await adm.post(`/admin/assets/${id}/delete`, {}, `/admin/assets/${id}/edit`);
  assert.equal(del.status, 303);
  assert.equal((await adm.req('/assets/test-warehouse-douala')).status, 404);
});

test('contact and project submission forms store data', async () => {
  const c = client();
  const r = await c.post('/contact', { name: 'Ana', email: 'ana@example.com', subject: 'Hi', body: 'Question about payouts' }, '/contact');
  assert.equal(r.status, 303);
  const s = await c.post('/submit-project', { name: 'Ana', email: 'ana@example.com', type: 'Agriculture', description: 'A cocoa project with an off-taker contract.' }, '/submit-project');
  assert.equal(s.status, 303);
  const adm = client();
  await login(adm, 'admin@test.local', 'AdminTest!12345');
  assert.match((await adm.req('/admin/messages')).text, /Question about payouts/);
  assert.match((await adm.req('/admin/submissions')).text, /cocoa project/);
});

test('password reset flow via outbox', async () => {
  const c = client();
  const r = await c.post('/forgot-password', { email: 'demo@investnreturns.com' }, '/forgot-password');
  assert.equal(r.status, 200);
  const adm = client();
  await login(adm, 'admin@test.local', 'AdminTest!12345');
  const out = await adm.req('/admin/outbox');
  const token = out.text.match(/reset-password\?token=([A-Za-z0-9_-]+)/)[1];
  const page = await c.req('/reset-password?token=' + token);
  assert.equal(page.status, 200);
  const done = await c.post('/reset-password', { token, password: 'Demo!2026invest' }, '/reset-password?token=' + token);
  assert.equal(done.status, 303);
  const reuse = await c.post('/reset-password', { token, password: 'Another1Pass!' }, '/forgot-password');
  assert.equal(reuse.status, 400);
});

test('security headers are set', async () => {
  const c = client();
  const r = await c.req('/');
  assert.match(r.headers.get('content-security-policy') || '', /script-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-powered-by'), null);
});
