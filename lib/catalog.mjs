// Product and kit file loader + validator.
// Plain ESM so it runs in the Astro build, the CLI script, and node:test alike.
// The build stops on any error returned here (see astro.config.mjs).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

export const PRODUCT_COLUMNS = [
  'sku', 'name', 'slug', 'category', 'short_description', 'description', 'fitment',
  'oe_refs', 'specs', 'pack_size', 'price_1', 'price_3', 'price_10', 'price_50',
  'case_qty', 'weight_lb', 'in_stock', 'image_main', 'image_type', 'warranty_months',
  'prop65', 'ca_restricted', 'brand', 'gtin', 'sold_as', 'bought_with', 'sample',
];

const PRODUCT_REQUIRED = [
  'sku', 'name', 'slug', 'category', 'short_description', 'description', 'fitment',
  'pack_size', 'price_1', 'price_3', 'price_10', 'price_50', 'weight_lb', 'in_stock',
  'image_main', 'image_type', 'warranty_months', 'prop65', 'brand', 'sold_as',
];

export const KIT_COLUMNS = [
  'kit_sku', 'name', 'slug', 'components', 'price_1', 'price_3', 'price_10', 'price_50',
  'description', 'sample',
];

const KIT_REQUIRED = [
  'kit_sku', 'name', 'slug', 'components', 'price_1', 'price_3', 'price_10', 'price_50',
  'description',
];

export const TIERS = [
  { key: 'price_1', min: 1 },
  { key: 'price_3', min: 3 },
  { key: 'price_10', min: 10 },
  { key: 'price_50', min: 50 },
];

const SKU_RE = /^BS-[A-Z]{2,4}-\d{4}$/;
const KIT_SKU_RE = /^BS-KIT-\d{4}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_RE = /^\d+(?:\.\d{1,2})?$/;
const BOOL_VALUES = ['true', 'false'];

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const toCents = (s) => Math.round(Number(s) * 100);

export function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "Toyota:Camry:2018-2024; Universal" -> [{make, model, from, to}] | ['Universal'] */
export function parseFitment(raw) {
  const entries = [];
  const errors = [];
  const thisYear = new Date().getFullYear();
  for (const part of raw.split(';').map((p) => p.trim()).filter(Boolean)) {
    if (part === 'Universal') {
      entries.push({ universal: true });
      continue;
    }
    const bits = part.split(':').map((b) => b.trim());
    if (bits.length !== 3 || !bits[0] || !bits[1]) {
      errors.push(`fitment entry "${part}" must be Make:Model:YYYY-YYYY or Universal`);
      continue;
    }
    const m = bits[2].match(/^(\d{4})(?:-(\d{4}))?$/);
    if (!m) {
      errors.push(`fitment entry "${part}" has an invalid year range "${bits[2]}"`);
      continue;
    }
    const from = Number(m[1]);
    const to = Number(m[2] ?? m[1]);
    if (from < 1950 || to > thisYear + 2 || from > to) {
      errors.push(`fitment entry "${part}" has an implausible year range`);
      continue;
    }
    entries.push({ make: bits[0], model: bits[1], from, to });
  }
  if (!entries.length && !errors.length) errors.push('fitment is empty');
  if (entries.some((e) => e.universal) && entries.length > 1) {
    errors.push('fitment "Universal" cannot be combined with specific vehicles');
  }
  return { entries, errors };
}

/** "Material: activated carbon; Dimensions: 215 x 194 x 30 mm" -> [{key, value}] */
export function parseSpecs(raw) {
  const specs = [];
  const errors = [];
  for (const part of raw.split(';').map((p) => p.trim()).filter(Boolean)) {
    const i = part.indexOf(':');
    if (i < 1 || !part.slice(i + 1).trim()) {
      errors.push(`specs entry "${part}" must be "Key: value"`);
      continue;
    }
    specs.push({ key: part.slice(0, i).trim(), value: part.slice(i + 1).trim() });
  }
  return { specs, errors };
}

const splitList = (raw) => raw.split(';').map((s) => s.trim()).filter(Boolean);

function readCsv(text, file, expectedColumns, errors) {
  let rows;
  try {
    rows = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (e) {
    errors.push(`${file}: could not be parsed as CSV (${e.message})`);
    return [];
  }
  const header = rows.length ? Object.keys(rows[0]) : [];
  const missing = expectedColumns.filter((c) => !header.includes(c) && c !== 'sample');
  const unknown = header.filter((c) => !expectedColumns.includes(c));
  if (rows.length && missing.length) errors.push(`${file}: missing column(s) ${missing.join(', ')}`);
  if (unknown.length) errors.push(`${file}: unknown column(s) ${unknown.join(', ')}`);
  return rows;
}

function checkBlocked(row, fields, blockedTerms, where, errors) {
  const haystack = fields.map((f) => row[f] ?? '').join(' ').toLowerCase();
  for (const term of blockedTerms) {
    if (haystack.includes(term.toLowerCase())) {
      errors.push(`${where}: contains the blocked term "${term}" (emission-control removal or defeat products are not sold)`);
    }
  }
}

function checkTiers(row, where, errors) {
  let prev = null;
  for (const { key } of TIERS) {
    const v = row[key];
    if (!v) continue; // reported as missing elsewhere
    if (!PRICE_RE.test(v) || Number(v) <= 0) {
      errors.push(`${where}: ${key} "${v}" must be a positive USD amount like 7.90`);
      prev = null;
      continue;
    }
    if (prev && toCents(v) > toCents(row[prev])) {
      errors.push(`${where}: ${key} (${v}) is higher than ${prev} (${row[prev]}); each tier must be the same or lower than the one before`);
    }
    prev = key;
  }
}

function validateProductRow(row, line, ctx) {
  const { errors, categories, blockedTerms } = ctx;
  const where = `products.csv line ${line}${row.sku ? ` (${row.sku})` : ''}`;
  const rowErrors = [];
  const err = (m) => rowErrors.push(`${where}: ${m}`);

  for (const f of PRODUCT_REQUIRED) if (!row[f]) err(`required field "${f}" is empty`);

  if (row.sku && !SKU_RE.test(row.sku)) err(`sku "${row.sku}" must look like BS-CAF-0012`);
  if (row.sku && KIT_SKU_RE.test(row.sku)) err('sku uses the BS-KIT prefix, which is reserved for kits.csv');
  if (row.slug && !SLUG_RE.test(row.slug)) err(`slug "${row.slug}" must be lowercase words joined by hyphens`);
  if (row.category && !categories.has(row.category)) err(`category "${row.category}" is not one of the 16 category slugs`);
  if (row.name && /\b(toyota|honda|nissan|ford|chevrolet|chevy|ram|dodge|gmc|jeep|hyundai|kia|subaru|mazda|volkswagen|bmw|mercedes|lexus|acura)\b/i.test(row.name)) {
    err('name must not contain a vehicle brand (put the vehicle in fitment)');
  }
  if (row.short_description && row.short_description.length >= 160) {
    err(`short_description is ${row.short_description.length} characters; it must be under 160`);
  }
  if (row.description) {
    const n = wordCount(row.description);
    if (n < 80 || n > 150) err(`description is ${n} words; it must be 80–150`);
  }

  let fitment = [];
  if (row.fitment) {
    const r = parseFitment(row.fitment);
    r.errors.forEach(err);
    fitment = r.entries;
  }
  let specs = [];
  if (row.specs) {
    const r = parseSpecs(row.specs);
    r.errors.forEach(err);
    specs = r.specs;
  }

  checkTiers(row, where, rowErrors);

  const intField = (f, min = 1) => {
    if (!row[f]) return;
    if (!/^\d+$/.test(row[f]) || Number(row[f]) < min) err(`${f} "${row[f]}" must be a whole number of at least ${min}`);
  };
  intField('pack_size');
  intField('case_qty', 2);
  intField('warranty_months');

  if (row.weight_lb && (!/^\d+(?:\.\d+)?$/.test(row.weight_lb) || Number(row.weight_lb) <= 0)) {
    err(`weight_lb "${row.weight_lb}" must be a positive number`);
  }
  for (const f of ['in_stock', 'prop65']) {
    if (row[f] && !BOOL_VALUES.includes(row[f])) err(`${f} must be true or false`);
  }
  for (const f of ['ca_restricted', 'sample']) {
    if (row[f] && !BOOL_VALUES.includes(row[f])) err(`${f} must be true, false, or empty`);
  }
  if (row.image_type && !['illustrative', 'actual'].includes(row.image_type)) {
    err('image_type must be illustrative or actual');
  }
  if (row.image_main && !/^\/images\/products\/[a-z0-9-]+\.(webp|jpg|jpeg|png|avif)$/.test(row.image_main)) {
    err(`image_main "${row.image_main}" must be a path like /images/products/bs-caf-0012.webp`);
  }
  if (row.gtin && !/^(\d{8}|\d{12,14})$/.test(row.gtin)) err('gtin must be 8, 12, 13, or 14 digits');
  if (row.sold_as && !['each', 'pair', 'set'].includes(row.sold_as)) err('sold_as must be each, pair, or set');
  if (row.sold_as === 'pair' && row.pack_size && row.pack_size !== '2') err('sold_as pair requires pack_size 2');
  if (row.sold_as === 'set' && row.pack_size && Number(row.pack_size) < 2) err('sold_as set requires pack_size of 2 or more');

  checkBlocked(row, ['name', 'short_description', 'description', 'specs'], blockedTerms, where, rowErrors);

  errors.push(...rowErrors);
  if (rowErrors.length) return null;

  return {
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    category: row.category,
    shortDescription: row.short_description,
    description: row.description,
    fitment,
    universal: fitment.some((f) => f.universal),
    oeRefs: row.oe_refs ? splitList(row.oe_refs) : [],
    specs,
    packSize: Number(row.pack_size),
    prices: TIERS.map(({ key, min }) => ({ min, price: Number(row[key]) })),
    caseQty: row.case_qty ? Number(row.case_qty) : null,
    weightLb: Number(row.weight_lb),
    inStock: row.in_stock === 'true',
    imageMain: row.image_main,
    imageType: row.image_type,
    warrantyMonths: Number(row.warranty_months),
    prop65: row.prop65 === 'true',
    caRestricted: row.ca_restricted === 'true',
    brand: row.brand,
    gtin: row.gtin || null,
    soldAs: row.sold_as,
    boughtWith: row.bought_with ? splitList(row.bought_with) : [],
    sample: row.sample === 'true',
    _line: line,
  };
}

/** Vehicles that every component fits. Universal components do not narrow the result. */
export function intersectFitment(fitments) {
  const specific = fitments.filter((f) => !f.some((e) => e.universal));
  if (!specific.length) return [{ universal: true }];
  let result = specific[0].map((e) => ({ ...e }));
  for (const next of specific.slice(1)) {
    const out = [];
    for (const a of result) {
      for (const b of next) {
        if (a.make !== b.make || a.model !== b.model) continue;
        const from = Math.max(a.from, b.from);
        const to = Math.min(a.to, b.to);
        if (from <= to) out.push({ make: a.make, model: a.model, from, to });
      }
    }
    result = out;
  }
  return result;
}

function validateKitRow(row, line, ctx, productsBySku) {
  const { errors, blockedTerms } = ctx;
  const where = `kits.csv line ${line}${row.kit_sku ? ` (${row.kit_sku})` : ''}`;
  const rowErrors = [];
  const err = (m) => rowErrors.push(`${where}: ${m}`);

  for (const f of KIT_REQUIRED) if (!row[f]) err(`required field "${f}" is empty`);
  if (row.kit_sku && !KIT_SKU_RE.test(row.kit_sku)) err(`kit_sku "${row.kit_sku}" must look like BS-KIT-0004`);
  if (row.slug && !SLUG_RE.test(row.slug)) err(`slug "${row.slug}" must be lowercase words joined by hyphens`);
  if (row.description) {
    const n = wordCount(row.description);
    if (n < 60 || n > 120) err(`description is ${n} words; it must be 60–120`);
  }
  if (row.sample && !BOOL_VALUES.includes(row.sample)) err('sample must be true, false, or empty');
  checkTiers(row, where, rowErrors);
  checkBlocked(row, ['name', 'description'], blockedTerms, where, rowErrors);

  const components = [];
  if (row.components) {
    for (const part of splitList(row.components)) {
      const m = part.match(/^(BS-[A-Z]{2,4}-\d{4})\s*x\s*(\d+)$/i);
      if (!m || Number(m[2]) < 1) {
        err(`component "${part}" must look like BS-OIL-0007 x1`);
        continue;
      }
      const product = productsBySku.get(m[1]);
      if (!product) {
        err(`component ${m[1]} does not exist in products.csv${ctx.production ? ' (sample products are excluded from production)' : ''}`);
        continue;
      }
      if (components.some((c) => c.sku === m[1])) err(`component ${m[1]} is listed twice`);
      components.push({ sku: m[1], qty: Number(m[2]), product });
    }
    if (components.length && components.length < 2 && components[0]?.qty < 2) {
      err('a kit needs at least two different products');
    }
  }

  let fitment = [];
  let separatePrice = 0;
  if (components.length && !rowErrors.length) {
    separatePrice = components.reduce((sum, c) => sum + toCents(String(c.product.prices[0].price)) * c.qty, 0) / 100;
    if (toCents(row.price_1) >= Math.round(separatePrice * 100)) {
      err(`price_1 (${row.price_1}) must be lower than the components' combined single price (${separatePrice.toFixed(2)})`);
    }
    fitment = intersectFitment(components.map((c) => c.product.fitment));
    if (!fitment.length) err('components share no common vehicle, so the kit fits nothing');
  }

  errors.push(...rowErrors);
  if (rowErrors.length) return null;

  return {
    sku: row.kit_sku,
    name: row.name,
    slug: row.slug,
    components: components.map(({ sku, qty }) => ({ sku, qty })),
    prices: TIERS.map(({ key, min }) => ({ min, price: Number(row[key]) })),
    description: row.description,
    fitment,
    universal: fitment.some((f) => f.universal),
    separatePrice,
    weightLb: Math.round(components.reduce((s, c) => s + c.product.weightLb * c.qty, 0) * 1000) / 1000,
    inStock: components.every((c) => c.product.inStock),
    prop65: components.some((c) => c.product.prop65),
    caRestricted: components.some((c) => c.product.caRestricted),
    sample: row.sample === 'true',
    _line: line,
  };
}

/**
 * Validate catalog text. Pure: no file access, so tests can feed fixtures.
 * @returns {{ products: object[], kits: object[], errors: string[], warnings: string[], excludedSamples: number }}
 */
export function validateCatalog({ productsCsv, kitsCsv = '', categories, blockedTerms, production = false }) {
  const errors = [];
  const warnings = [];
  const ctx = { errors, categories: new Set(categories.map((c) => c.slug)), blockedTerms, production };

  const productRows = readCsv(productsCsv, 'products.csv', PRODUCT_COLUMNS, errors);
  const kitRows = kitsCsv.trim() ? readCsv(kitsCsv, 'kits.csv', KIT_COLUMNS, errors) : [];
  if (errors.length) return { products: [], kits: [], errors, warnings, excludedSamples: 0 };

  // Line numbers count the header as line 1.
  let products = productRows.map((row, i) => validateProductRow(row, i + 2, ctx)).filter(Boolean);

  const seen = (list, key, file) => {
    const map = new Map();
    for (const item of list) {
      if (map.has(item[key])) errors.push(`${file} line ${item._line}: ${key} "${item[key]}" is already used on line ${map.get(item[key])}`);
      else map.set(item[key], item._line);
    }
  };
  seen(products, 'sku', 'products.csv');
  seen(products, 'slug', 'products.csv');
  seen(products, 'description', 'products.csv');

  let excludedSamples = 0;
  if (production) {
    excludedSamples = products.filter((p) => p.sample).length;
    products = products.filter((p) => !p.sample);
  }
  const productsBySku = new Map(products.map((p) => [p.sku, p]));

  for (const p of products) {
    for (const sku of p.boughtWith) {
      if (sku === p.sku) errors.push(`products.csv line ${p._line} (${p.sku}): bought_with lists the product itself`);
      else if (!productsBySku.has(sku) && !KIT_SKU_RE.test(sku)) {
        errors.push(`products.csv line ${p._line} (${p.sku}): bought_with SKU ${sku} does not exist`);
      }
    }
  }

  let kits = kitRows
    .map((row, i) => ({ row, line: i + 2 }))
    .filter(({ row }) => !(production && row.sample === 'true'))
    .map(({ row, line }) => validateKitRow(row, line, ctx, productsBySku))
    .filter(Boolean);
  if (production) excludedSamples += kitRows.filter((r) => r.sample === 'true').length;
  seen(kits, 'sku', 'kits.csv');
  seen(kits, 'slug', 'kits.csv');
  const kitSkus = new Set(kits.map((k) => k.sku));
  for (const p of products) {
    for (const sku of p.boughtWith) {
      if (KIT_SKU_RE.test(sku) && !kitSkus.has(sku)) {
        errors.push(`products.csv line ${p._line} (${p.sku}): bought_with kit ${sku} does not exist`);
      }
    }
  }
  const productSlugs = new Set(products.map((p) => p.slug));
  for (const k of kits) {
    if (productSlugs.has(k.slug)) warnings.push(`kits.csv line ${k._line}: slug "${k.slug}" is also used by a product`);
  }

  if (production && !products.length) {
    warnings.push('production build has no products: products.csv contains only sample rows');
  }

  return { products, kits, errors, warnings, excludedSamples };
}

/** Read the data/ folder and validate it. */
export function loadCatalog({ root = process.cwd(), production = process.env.BAYSTOCK_ENV === 'production' } = {}) {
  const read = (f) => readFileSync(resolve(root, 'data', f), 'utf8');
  let kitsCsv = '';
  try {
    kitsCsv = read('kits.csv');
  } catch {
    // kits.csv is optional
  }
  return validateCatalog({
    productsCsv: read('products.csv'),
    kitsCsv,
    categories: JSON.parse(read('categories.json')),
    blockedTerms: JSON.parse(read('blocked-terms.json')).terms,
    production,
  });
}
