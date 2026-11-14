'use strict';
const path = require('path');
const crypto = require('crypto');

const env = process.env;
const isProd = env.NODE_ENV === 'production';

// In production without SESSION_SECRET, db.init() generates one and stores it in the database.
const secret = env.SESSION_SECRET || (isProd ? null : 'dev-only-secret-change-me-' + 'x'.repeat(16));

const config = {
  isProd,
  port: Number(env.PORT) || 3000,
  dbFile: env.DB_FILE || path.join(__dirname, '..', 'data', 'inr.db'),
  // Uploaded photos live next to the database so they persist across redeploys.
  uploadsDir: env.UPLOADS_DIR || (env.DB_FILE === ':memory:' ? path.join(require('os').tmpdir(), 'inr-uploads') : path.join(path.dirname(env.DB_FILE || path.join(__dirname, '..', 'data', 'inr.db')), 'uploads')),
  secret,
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  adminEmail: (env.ADMIN_EMAIL || 'admin@investnreturns.com').toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD || 'Admin!2026change',
  seedDemo: env.SEED_DEMO !== 'false',
  sessionDays: 14,
  reservationHoldHours: 72,
  brand: {
    name: 'Invest n Returns',
    // Live value from Admin → Settings.
    get email() { return require('./services/settings').contactEmail(); },
    city: 'Douala',
    country: 'CM',
  },
  randomId: (n = 16) => crypto.randomBytes(n).toString('hex'),
};
// Website address: Admin → Settings, then SITE_URL, then a sensible default.
Object.defineProperty(config, 'siteUrl', { enumerable: true, get() { return require('./services/settings').siteUrl(); } });
module.exports = config;
