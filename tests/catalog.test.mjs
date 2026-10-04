import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from './helpers.mjs';
import { validateCatalog, loadCatalog, intersectFitment, parseFitment } from '../lib/catalog.mjs';

const read = (f) => readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8');
const categories = JSON.parse(read('categories.json'));
const blockedTerms = JSON.parse(read('blocked-terms.json')).terms;
const productRows = parse(read('products.csv'), { columns: true });
const kitRows = parse(read('kits.csv'), { columns: true });

const run = ({ products = productRows, kits = kitRows, production = false } = {}) =>
  validateCatalog({ productsCsv: stringify(products), kitsCsv: stringify(kits), categories, blockedTerms, production });

const withRow = (i, patch) => productRows.map((r, j) => (j === i ? { ...r, ...patch } : r));

test('the starter file has 20 valid sample products across four categories', () => {
  const r = loadCatalog();
  assert.deepEqual(r.errors, []);
  assert.equal(r.products.length, 20);
  assert.ok(r.products.every((p) => p.sample));
  assert.equal(new Set(r.products.map((p) => p.category)).size, 4);
});

test('production build excludes sample rows', () => {
  const r = run({ production: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.products.length, 0);
  assert.equal(r.kits.length, 0);
  assert.equal(r.excludedSamples, 22);
});

test('a missing required field fails', () => {
  for (const field of ['sku', 'name', 'fitment', 'price_50', 'weight_lb', 'image_type', 'sold_as']) {
    const r = run({ products: withRow(0, { [field]: '' }) });
    assert.ok(r.errors.some((e) => e.includes(`"${field}" is empty`)), `expected error for ${field}`);
  }
});

test('a tier price higher than the tier before it fails', () => {
  const r = run({ products: withRow(0, { price_10: '7.00' }) });
  assert.ok(r.errors.some((e) => e.includes('price_10 (7.00) is higher than price_3')));
});

test('equal tier prices are allowed', () => {
  const r = run({ products: withRow(0, { price_3: '7.90' }) });
  assert.deepEqual(r.errors, []);
});

test('duplicate SKU and slug fail', () => {
  const r = run({ products: withRow(1, { sku: productRows[0].sku, slug: productRows[0].slug }) });
  assert.ok(r.errors.some((e) => e.includes('sku "BS-CAF-0012" is already used')));
  assert.ok(r.errors.some((e) => e.includes('slug') && e.includes('already used')));
});

test('unknown category, bad fitment, and bad sku format fail', () => {
  assert.ok(run({ products: withRow(0, { category: 'tires' }) }).errors.some((e) => e.includes('not one of the 16')));
  assert.ok(run({ products: withRow(0, { fitment: 'Toyota Camry 2018' }) }).errors.some((e) => e.includes('Make:Model')));
  assert.ok(run({ products: withRow(0, { fitment: 'Toyota:Camry:2024-2018' }) }).errors.some((e) => e.includes('implausible')));
  assert.ok(run({ products: withRow(0, { sku: 'CAF-12' }) }).errors.some((e) => e.includes('must look like')));
});

test('blocked emission-defeat terms fail', () => {
  const r = run({ products: withRow(0, { name: 'EGR Delete Kit' }) });
  assert.ok(r.errors.some((e) => e.includes('blocked term')));
});

test('a vehicle brand in the product name fails', () => {
  const r = run({ products: withRow(0, { name: 'Toyota Cabin Air Filter' }) });
  assert.ok(r.errors.some((e) => e.includes('vehicle brand')));
});

test('pair products must have pack_size 2', () => {
  const i = productRows.findIndex((r) => r.sold_as === 'pair');
  const r = run({ products: withRow(i, { pack_size: '1' }) });
  assert.ok(r.errors.some((e) => e.includes('pack_size 2')));
});

test('short_description length and description word count are enforced', () => {
  assert.ok(run({ products: withRow(0, { short_description: 'x'.repeat(160) }) }).errors.some((e) => e.includes('under 160')));
  assert.ok(run({ products: withRow(0, { description: 'Too short.' }) }).errors.some((e) => e.includes('80–150')));
});

test('bought_with must reference existing SKUs', () => {
  const r = run({ products: withRow(0, { bought_with: 'BS-XYZ-9999' }) });
  assert.ok(r.errors.some((e) => e.includes('BS-XYZ-9999 does not exist')));
});

test('kit price_1 must be lower than the components bought separately', () => {
  const kits = kitRows.map((k, i) => (i === 0 ? { ...k, price_1: '64.80' } : k));
  assert.ok(run({ kits }).errors.some((e) => e.includes('must be lower than the components')));
});

test('kit components must exist', () => {
  const kits = kitRows.map((k, i) => (i === 0 ? { ...k, components: 'BS-SUS-0301 x1; BS-SUS-9999 x1' } : k));
  assert.ok(run({ kits }).errors.some((e) => e.includes('BS-SUS-9999 does not exist')));
});

test('kit fitment is the vehicles every component fits; stock needs every part', () => {
  const r = run({ products: withRow(productRows.findIndex((p) => p.sku === 'BS-SUS-0302'), { in_stock: 'false' }) });
  const kit = r.kits.find((k) => k.sku === 'BS-KIT-0001');
  assert.deepEqual(kit.fitment, [{ make: 'Toyota', model: 'Camry', from: 2018, to: 2024 }]);
  assert.equal(kit.inStock, false);
  assert.equal(kit.separatePrice, 64.8);
});

test('fitment intersection narrows year ranges and ignores universal parts', () => {
  const a = parseFitment('Toyota:Camry:2018-2024; Toyota:RAV4:2019-2024').entries;
  const b = parseFitment('Toyota:Camry:2020-2026').entries;
  const u = parseFitment('Universal').entries;
  assert.deepEqual(intersectFitment([a, b, u]), [{ make: 'Toyota', model: 'Camry', from: 2020, to: 2024 }]);
});
