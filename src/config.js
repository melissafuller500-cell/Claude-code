'use strict';
const path = require('path');
const crypto = require('crypto');

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const secret = env.SESSION_SECRET || (isProd ? null : 'dev-only-secret-change-me-' + 'x'.repeat(16));
if (!secret) {
  // Fail closed in production: a random per-boot secret would silently log everyone out on restart.
  console.error('[config] SESSION_SECRET is required in production.');
  process.exit(1);
}

module.exports = {
  isProd,
  port: Number(env.PORT) || 3000,
  siteUrl: (env.SITE_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/+$/, ''),
  dbFile: env.DB_FILE || path.join(__dirname, '..', 'data', 'inr.db'),
  secret,
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  adminEmail: (env.ADMIN_EMAIL || 'admin@investnreturns.com').toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD || 'Admin!2026change',
  seedDemo: env.SEED_DEMO !== 'false',
  sessionDays: 14,
  reservationHoldHours: 72,
  brand: {
    name: 'Invest n Returns',
    email: 'contact@investnreturns.com',
    city: 'Douala',
    country: 'CM',
  },
  randomId: (n = 16) => crypto.randomBytes(n).toString('hex'),
};
