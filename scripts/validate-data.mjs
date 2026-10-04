#!/usr/bin/env node
// Validates data/products.csv and data/kits.csv. Exits 1 on any error.
// Usage: npm run validate            (development: sample rows included)
//        BAYSTOCK_ENV=production npm run validate
import { loadCatalog } from '../lib/catalog.mjs';
import { formatReport } from '../lib/report.mjs';

const result = loadCatalog();
console.log(formatReport(result));
process.exit(result.errors.length ? 1 : 0);
