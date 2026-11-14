'use strict';
// Admin-editable site settings stored in the database (no redeploy needed).
const { q } = require('../db');

const PAY_KEYS = {
  usdt: 'PAY_USDT_ADDRESS', usdc: 'PAY_USDC_ADDRESS', btc: 'PAY_BTC_ADDRESS', eth: 'PAY_ETH_ADDRESS',
  momo: 'PAY_MOMO_NUMBER', orange: 'PAY_ORANGE_NUMBER', bank: 'PAY_BANK_IBAN', card: 'PAY_CARD_LINK',
};

function get(key, fallback = '') {
  const r = q.get('SELECT value FROM settings WHERE key = ?', key);
  return r ? r.value : fallback;
}
function set(key, value) {
  q.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
}

// Default payment instructions for a method: admin setting first, then environment variable.
function payDefault(method) {
  return get('pay_' + method, '') || process.env[PAY_KEYS[method]] || '';
}

module.exports = { get, set, payDefault, PAY_KEYS };
