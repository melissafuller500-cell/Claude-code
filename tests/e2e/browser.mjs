// Browser acceptance checks (spec section 7). Needs the server on BASE (default http://127.0.0.1:4321).
//   node tests/e2e/browser.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const errors = [];
let passed = 0;
const check = async (name, fn) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errors.push(`${name}: ${m.text()}`));
  try {
    await fn(page);
    passed++;
    console.log(`ok - ${name}`);
  } catch (e) {
    console.log(`not ok - ${name}\n  ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await ctx.close();
  }
};

await check('vehicle selector: 2019 Toyota Camry shows only matching and universal parts, and survives reload', async (page) => {
  await page.goto(`${BASE}/parts/cabin-air-filters/`, { waitUntil: 'networkidle' });
  const total = await page.locator('[data-fitment]').count();
  await page.locator('header [data-vehicle-open]').first().click();
  await page.selectOption('#dlg-year', '2019');
  await page.selectOption('#dlg-make', 'Toyota');
  await page.selectOption('#dlg-model', 'Camry');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  const visible = page.locator('[data-fitment]:not([hidden])');
  await page.waitForFunction(() => document.querySelectorAll('[data-fitment][hidden]').length > 0);
  const fits = await visible.evaluateAll((els) => els.map((e) => e.getAttribute('data-fitment')));
  assert.ok(fits.length > 0 && fits.length < total, `visible ${fits.length} of ${total}`);
  for (const f of fits) assert.ok(f === 'U' || /Toyota\|Camry\|(\d+)\|(\d+)/.test(f) && f.split(';').some((e) => { const [mk, md, a, b] = e.split('|'); return mk === 'Toyota' && md === 'Camry' && 2019 >= +a && 2019 <= +b; }), f);
  assert.equal(await page.locator('[data-fitment]:not([hidden]) [data-fit-badge]:not([hidden])').count(), fits.filter((f) => f !== 'U').length);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('[data-fitment][hidden]').length > 0);
  assert.equal(await page.locator('[data-fitment]:not([hidden])').count(), fits.length);
  assert.match(await page.locator('[data-vehicle-label]').textContent(), /2019 Toyota Camry/);
});

await check('price calculator: 1, 3, 10, 50 show the product-file prices; 0 and negative are rejected', async (page) => {
  await page.goto(`${BASE}/parts/cabin-air-filters/cabin-air-filter-toyota-camry-2018-2024-bs-caf-0012/`, { waitUntil: 'networkidle' });
  const qty = page.locator('#buy-qty');
  const unit = page.locator('main [data-buy] [data-unit-price]').first();
  for (const [q, price] of [[1, '$7.90'], [3, '$6.90'], [10, '$5.90'], [50, '$4.90']]) {
    await qty.fill(String(q));
    await page.waitForTimeout(650);
    assert.equal(await unit.textContent(), price, `qty ${q}`);
  }
  await qty.fill('12');
  assert.match(await page.locator('main [data-buy] [data-nudge]').first().textContent(), /Add 38 more to pay \$4\.90 each\./);
  for (const bad of ['0', '-3']) {
    await qty.fill(bad);
    assert.equal(await page.locator('main [data-buy] [data-add]').first().isDisabled(), true, `qty ${bad} blocked`);
    assert.equal(await page.locator('main [data-buy] [data-qty-error]').first().isVisible(), true);
  }
});

await check('quick order: 20 pasted lines with two bad SKUs adds 18 and lists the 2 errors', async (page) => {
  await page.goto(`${BASE}/quick-order/`, { waitUntil: 'networkidle' });
  const good = ['BS-CAF-0012', 'BS-CAF-0013', 'BS-CAF-0021', 'BS-CAF-0022', 'BS-CAF-0030', 'BS-IGC-0101', 'BS-IGC-0102', 'BS-IGC-0110', 'BS-IGC-0111', 'BS-IGC-0120', 'BS-BRK-0201', 'BS-BRK-0202', 'BS-BRK-0210', 'BS-BRK-0220', 'BS-BRK-0230', 'BS-SUS-0301', 'BS-SUS-0302', 'BS-SUS-0310'];
  const lines = [...good.map((s, i) => `${s}, ${i + 1}`), 'BS-NOPE-0001, 2', 'XYZ-123\t4'];
  await page.fill('#qo-paste', lines.join('\n'));
  await page.getByRole('button', { name: 'Check these lines' }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.getByText('SKU not found').count(), 2);
  await page.getByRole('button', { name: /Add all to cart/ }).click();
  await page.getByText('18 products added to cart.').waitFor();
  assert.equal(await page.locator('[role=status] li').count(), 2);
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('bs-cart')));
  assert.equal(cart.length, 18);
});

await check('search: an original part number returns the product that replaces it', async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const input = page.locator('#site-search');
  await input.click();
  await input.fill('87139-06140');
  const first = page.locator('#site-search-results [role=option]').first();
  await first.waitFor();
  assert.match(await first.textContent(), /BS-CAF-0012/);
  await input.fill('8713906140');
  await page.waitForTimeout(200);
  assert.match(await page.locator('#site-search-results [role=option]').first().textContent(), /BS-CAF-0012/);
});

await check('full order: add to cart, place order, confirmation with WhatsApp link', async (page) => {
  await page.goto(`${BASE}/parts/ignition-coils/`, { waitUntil: 'networkidle' });
  const card = page.locator('[data-buy][data-sku="BS-IGC-0101"]');
  await card.locator('[data-qty]').fill('10');
  await card.locator('[data-add]').click();
  await page.getByText('Added 10 to cart.').waitFor();
  await page.goto(`${BASE}/cart/`, { waitUntil: 'networkidle' });
  await page.getByText('Shipping (9 lb)').waitFor();
  assert.ok(await page.locator('main').getByText('Add $51.00 more for free shipping.').isVisible());
  await page.fill('#f-name', 'Pat Driver');
  await page.fill('#f-email', 'pat@example.com');
  await page.fill('#f-phone', '(555) 123-4567');
  await page.fill('#f-address1', '200 Oak Ave');
  await page.fill('#f-city', 'Dallas');
  await page.selectOption('#f-state', 'TX');
  await page.fill('#f-zip', '75201');
  assert.ok(await page.getByText('You will not be charged now. Confirm your order on WhatsApp to receive the payment details for it.').isVisible());
  await page.getByRole('button', { name: 'Place order and continue on WhatsApp' }).click();
  await page.waitForURL('**/checkout/success/');
  await page.getByText('Awaiting payment').waitFor();
  const text = await page.locator('main').textContent();
  assert.match(text, /Order BS-\d{6}-\d{4} received\. Continue on WhatsApp to confirm it and get payment instructions\. A copy is on its way to pat@example\.com\./);
  assert.match(text, /No WhatsApp\? Reply to your confirmation email and we will send payment details there\./);
  const href = await page.getByRole('link', { name: 'Continue on WhatsApp' }).getAttribute('href');
  assert.match(href, /^https:\/\/wa\.me\/15550001111\?text=/);
  assert.equal(await page.evaluate(() => localStorage.getItem('bs-cart')), '[]');
});

await check('cart: $250 threshold switches to "Free shipping unlocked."', async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('bs-cart', JSON.stringify([{ sku: 'BS-CAF-0012', qty: 26 }, { sku: 'BS-CAF-0030', qty: 14 }])));
  await page.goto(`${BASE}/cart/`, { waitUntil: 'networkidle' });
  await page.getByText('Free shipping unlocked.').first().waitFor();
  assert.match(await page.locator('main').textContent(), /Total\$250\.00/);
});

await check('California-restricted and Prop 65: Prop 65 warning shown once more in the cart', async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('bs-cart', JSON.stringify([{ sku: 'BS-BRK-0201', qty: 1 }])));
  await page.goto(`${BASE}/cart/`, { waitUntil: 'networkidle' });
  await page.getByText(/Cancer and Reproductive Harm/).waitFor();
});

await check('desktop slide-over cart opens from the header', async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('bs-cart', JSON.stringify([{ sku: 'BS-CAF-0012', qty: 3 }])));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-cart-link]').click();
  await page.getByRole('dialog', { name: 'Your cart' }).waitFor();
  assert.match(await page.locator('[data-cart-total]').first().textContent(), /\$20\.70/);
});

await check('every page has exactly one H1', async (page) => {
  for (const path of ['/', '/parts/', '/parts/brake-pads/', '/parts/sensors/', '/kits/', '/kits/front-end-kit-toyota-camry-2018-2024/', '/vehicles/', '/vehicles/honda/', '/vehicles/honda/civic/', '/wholesale/', '/shipping/', '/returns/', '/warranty/', '/faq/', '/about/', '/contact/', '/blog/', '/privacy/', '/terms/', '/cart/', '/quick-order/', '/search/?q=coil', '/nope/']) {
    await page.goto(BASE + path);
    assert.equal(await page.locator('h1').count(), 1, path);
  }
});

console.log(errors.length ? `\nBrowser errors:\n${errors.join('\n')}` : '\nNo browser errors.');
if (errors.length) process.exitCode = 1;
console.log(`${passed} passed`);
await browser.close();
