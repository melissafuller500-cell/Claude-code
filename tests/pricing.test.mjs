import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { quoteOrder, unitPrice, nextTierNudge, shippingFor, isValidQty } from '../lib/pricing.mjs';
import { loadCatalog } from '../lib/catalog.mjs';

const ship = JSON.parse(readFileSync(new URL('../data/shipping-rates.json', import.meta.url)));
const { products } = loadCatalog();
const items = Object.fromEntries(products.map((p) => [p.sku, p]));
const caf = items['BS-CAF-0012'];

test('quantities 1, 3, 10, and 50 use the matching tier price', () => {
  assert.equal(unitPrice(caf.prices, 1), 7.9);
  assert.equal(unitPrice(caf.prices, 2), 7.9);
  assert.equal(unitPrice(caf.prices, 3), 6.9);
  assert.equal(unitPrice(caf.prices, 10), 5.9);
  assert.equal(unitPrice(caf.prices, 49), 5.9);
  assert.equal(unitPrice(caf.prices, 50), 4.9);
});

test('quantity 0 or negative is rejected', () => {
  assert.equal(isValidQty(0), false);
  assert.equal(isValidQty(-3), false);
  assert.equal(isValidQty(1.5), false);
  const q = quoteOrder([{ sku: 'BS-CAF-0012', qty: 0 }], items, ship);
  assert.equal(q.lines.length, 0);
  assert.equal(q.errors[0].code, 'bad_qty');
});

test('tier nudge', () => {
  assert.deepEqual(nextTierNudge(caf.prices, 1), { n: 2, price: 6.9 });
  assert.deepEqual(nextTierNudge(caf.prices, 12), { n: 38, price: 4.9 });
  assert.equal(nextTierNudge(caf.prices, 50), null);
});

test('a 1.5 lb order under $250 is charged $9', () => {
  assert.equal(shippingFor(1.5, 40, ship), 9);
  const q = quoteOrder([{ sku: 'BS-CAF-0012', qty: 3 }, { sku: 'BS-CAF-0013', qty: 1 }], items, ship); // 1.55 lb
  assert.equal(q.weightLb, 1.55);
  assert.equal(q.shipping, 9);
});

test('weight bands', () => {
  assert.equal(shippingFor(2, 0, ship), 9);
  assert.equal(shippingFor(2.01, 0, ship), 13);
  assert.equal(shippingFor(10, 0, ship), 18);
  assert.equal(shippingFor(40.5, 0, ship), 55);
});

test('a $250.00 order ships free, $249.99 does not', () => {
  assert.equal(shippingFor(30, 250, ship), 0);
  assert.equal(shippingFor(30, 249.99, ship), 38);
});

test('tiers count per product line, not across the cart', () => {
  const q = quoteOrder([{ sku: 'BS-CAF-0012', qty: 2 }, { sku: 'BS-CAF-0021', qty: 2 }], items, ship);
  assert.equal(q.lines[0].unitPrice, 7.9);
  assert.equal(q.lines[1].unitPrice, 8.4);
});

test('duplicate lines for one SKU are merged before the tier is set', () => {
  const q = quoteOrder([{ sku: 'bs-caf-0012', qty: 2 }, { sku: 'BS-CAF-0012', qty: 1 }], items, ship);
  assert.equal(q.lines.length, 1);
  assert.equal(q.lines[0].qty, 3);
  assert.equal(q.lines[0].unitPrice, 6.9);
});

test('prices sent by the browser are ignored', () => {
  const q = quoteOrder([{ sku: 'BS-CAF-0012', qty: 1, price: 0.01, unitPrice: 0.01 }], items, ship);
  assert.equal(q.subtotal, 7.9);
});

test('unknown and out-of-stock SKUs are errors', () => {
  const q = quoteOrder([{ sku: 'BS-XXX-0001', qty: 1 }], { ...items, 'BS-CAF-0013': { ...items['BS-CAF-0013'], inStock: false } }, ship);
  assert.equal(q.errors[0].code, 'not_found');
  const q2 = quoteOrder([{ sku: 'BS-CAF-0013', qty: 1 }], { ...items, 'BS-CAF-0013': { ...items['BS-CAF-0013'], inStock: false } }, ship);
  assert.equal(q2.errors[0].code, 'out_of_stock');
});
