// End-to-end checks against the built server (run `npm run build` first):
//   node tests/e2e/api.mjs
// Starts a local SMTP sink and the production server, then exercises the
// acceptance criteria from spec section 7 for checkout, contact, and chat limits.
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const work = mkdtempSync(join(tmpdir(), 'bs-e2e-'));
const mailDir = join(work, 'mail');
const PORT = 4399;
const base = `http://127.0.0.1:${PORT}`;
const procs = [];
const start = (args, env = {}) => {
  const p = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(p);
  return new Promise((res) => p.stdout.on('data', (d) => /listening|sink on/.test(String(d)) && res(p)));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ipN = 1;
// Each request gets its own client address so the checkout rate limit (10 per 10 minutes) does not interfere.
const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `198.51.100.${ipN++ % 250}`, ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));

const customer = { name: 'Test Buyer', business: 'Test Garage', email: 'buyer@example.com', phone: '555-010-2000', address1: '1 Main St', address2: '', city: 'Austin', state: 'TX', zip: '73301' };
let passed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (e) {
    console.log(`not ok - ${name}\n  ${e.message}`);
    process.exitCode = 1;
  }
};

try {
  await start(['tests/e2e/smtp-sink.mjs', mailDir, '2599']);
  await start(['server.mjs'], {
    PORT: String(PORT), HOST: '127.0.0.1', ORDER_LOG_DIR: join(work, 'orders'), PAYMENT_MODE: 'whatsapp',
    WHATSAPP_NUMBER: '+1 (555) 000-1111', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2599', SMTP_USER: 'shop@example.com',
    SMTP_PASS: 'x', ORDER_NOTIFY_EMAIL: 'owner@example.com', ANTHROPIC_API_KEY: '',
  });

  await check('tampered browser prices are ignored', async () => {
    const r = await post('/api/checkout/', { lines: [{ sku: 'BS-CAF-0012', qty: 1, price: 0.01, unitPrice: 0.01, total: 0.01 }], customer });
    assert.equal(r.status, 200);
    assert.equal(r.body.order.lines[0].unitPrice, 7.9);
    assert.equal(r.body.order.subtotal, 7.9);
  });

  await check('a 1.5 lb order under $250 is charged $9', async () => {
    // 3 x 0.4 lb + 1 x 0.35 lb = 1.55 lb; plus a test of exactly 1.5 lb: 3 x 0.5? use 0.4*2 + 0.35*2 = 1.5
    const r = await post('/api/checkout/', { lines: [{ sku: 'BS-CAF-0012', qty: 2 }, { sku: 'BS-CAF-0013', qty: 2 }], customer });
    assert.equal(r.status, 200);
    assert.equal(r.body.order.weightLb, 1.5);
    assert.equal(r.body.order.shipping, 9);
  });

  await check('a $250.00 order ships free', async () => {
    const r = await post('/api/checkout/', { lines: [{ sku: 'BS-CAF-0012', qty: 26 }, { sku: 'BS-CAF-0030', qty: 14 }], customer });
    assert.equal(r.status, 200);
    assert.equal(r.body.order.subtotal, 250);
    assert.equal(r.body.order.shipping, 0);
    assert.equal(r.body.order.total, 250);
  });

  await check('order numbers follow BS-YYMMDD-0001 and increase', async () => {
    const a = await post('/api/checkout/', { lines: [{ sku: 'BS-IGC-0101', qty: 1 }], customer });
    const b = await post('/api/checkout/', { lines: [{ sku: 'BS-IGC-0101', qty: 1 }], customer });
    assert.match(a.body.order.orderNumber, /^BS-\d{6}-\d{4}$/);
    assert.equal(Number(b.body.order.orderNumber.slice(-4)), Number(a.body.order.orderNumber.slice(-4)) + 1);
  });

  await check('WhatsApp message shows the same order number and total as the confirmation email', async () => {
    const r = await post('/api/checkout/', { lines: [{ sku: 'BS-SUS-0301', qty: 3 }, { sku: 'BS-KIT-0001', qty: 1 }], customer });
    assert.equal(r.status, 200);
    const { orderNumber, total } = r.body.order;
    const url = new URL(r.body.whatsappUrl);
    assert.equal(url.origin + url.pathname, 'https://wa.me/15550001111');
    const text = url.searchParams.get('text');
    assert.ok(text.includes(orderNumber), 'order number in WhatsApp text');
    assert.ok(text.includes(`Total: $${total.toFixed(2)}`), 'total in WhatsApp text');
    assert.ok(text.includes('BS-SUS-0301') && text.includes('x3'), 'line in WhatsApp text');
    assert.ok(text.includes('Name: Test Buyer') && text.includes('City: Austin, TX'), 'customer in WhatsApp text');
    await sleep(300);
    const mails = readdirSync(mailDir).map((f) => readFileSync(join(mailDir, f), 'utf8')).filter((m) => m.includes(orderNumber));
    assert.equal(mails.length, 2, 'customer and owner emails');
    assert.ok(mails.some((m) => /To: buyer@example.com/i.test(m)) && mails.some((m) => /To: owner@example.com/i.test(m)));
    for (const m of mails) assert.ok(m.includes(`$${total.toFixed(2)}`), 'email shows same total');
  });

  await check('orders over 15 lines list 15 and point to the email', async () => {
    const skus = ['BS-CAF-0012', 'BS-CAF-0013', 'BS-CAF-0021', 'BS-CAF-0022', 'BS-CAF-0030', 'BS-IGC-0101', 'BS-IGC-0102', 'BS-IGC-0110', 'BS-IGC-0111', 'BS-IGC-0120', 'BS-BRK-0201', 'BS-BRK-0202', 'BS-BRK-0210', 'BS-BRK-0220', 'BS-BRK-0230', 'BS-SUS-0301', 'BS-SUS-0302'];
    const r = await post('/api/checkout/', { lines: skus.map((sku) => ({ sku, qty: 1 })), customer });
    const text = new URL(r.body.whatsappUrl).searchParams.get('text');
    assert.equal((text.match(/^- BS-/gm) ?? []).length, 15);
    assert.ok(text.includes('Full details are in your confirmation email.'));
  });

  await check('unknown SKU is rejected and no order is created', async () => {
    const r = await post('/api/checkout/', { lines: [{ sku: 'BS-XXX-9999', qty: 1 }], customer });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /not found/);
  });

  await check('quantity 0 or negative is rejected', async () => {
    const r = await post('/api/checkout/', { lines: [{ sku: 'BS-CAF-0012', qty: -2 }], customer });
    assert.equal(r.status, 409);
  });

  await check('addresses outside the contiguous US and PO boxes are rejected', async () => {
    const ak = await post('/api/checkout/', { lines: [{ sku: 'BS-CAF-0012', qty: 1 }], customer: { ...customer, state: 'AK' } });
    assert.equal(ak.status, 400);
    assert.ok(ak.body.fieldErrors.state);
    const po = await post('/api/checkout/', { lines: [{ sku: 'BS-CAF-0012', qty: 1 }], customer: { ...customer, address1: 'PO Box 12' } });
    assert.equal(po.status, 400);
  });

  await check('contact form sends an email; honeypot is silently dropped', async () => {
    const before = readdirSync(mailDir).length;
    const ok = await post('/api/contact/', { name: 'Jo', email: 'jo@example.com', message: 'Does BS-CAF-0012 fit a 2020 Camry?' });
    assert.equal(ok.status, 200);
    const bot = await post('/api/contact/', { name: 'Bot', email: 'bot@example.com', message: 'spam spam', website: 'http://spam' });
    assert.equal(bot.status, 200);
    await sleep(300);
    assert.equal(readdirSync(mailDir).length, before + 1);
  });

  await check('chat returns a polite limit message after 20 messages', async () => {
    const headers = { 'X-Forwarded-For': '203.0.113.9' };
    let last;
    for (let i = 0; i < 21; i++) last = await post('/api/chat/', { messages: [{ role: 'user', content: `question ${i}` }] }, headers);
    assert.equal(last.status, 429);
    assert.match(last.body.reply, /limit of 20 messages per hour/);
  });

  await check('checkout is rate limited per visitor', async () => {
    const headers = { 'X-Forwarded-For': '203.0.113.50' };
    let last;
    for (let i = 0; i < 11; i++) last = await post('/api/checkout/', { lines: [] }, headers);
    assert.equal(last.status, 429);
  });

  await check('order log is written outside the public folder', async () => {
    const log = readFileSync(join(work, 'orders', 'orders.jsonl'), 'utf8');
    assert.ok(log.split('\n').filter(Boolean).length >= 6);
  });
} finally {
  for (const p of procs) p.kill();
  console.log(`\n${passed} passed`);
}
