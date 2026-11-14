'use strict';
// Email delivery through the SMTP account configured in Admin → Settings.
// Every email is first stored in the outbox; delivery runs in the background and records its result.
const { q, now } = require('../db');
const settings = require('./settings');

let cached = { sig: '', transport: null };

function smtpConfig() {
  const host = settings.get('smtp_host');
  const user = settings.get('smtp_user');
  if (!host || !user) return null;
  return {
    host,
    port: Number(settings.get('smtp_port')) || 465,
    secure: settings.get('smtp_secure') === '1',
    auth: { user, pass: settings.get('smtp_pass') },
    from: settings.get('mail_from') || user,
  };
}

function transport(cfg) {
  const sig = JSON.stringify([cfg.host, cfg.port, cfg.secure, cfg.auth.user, cfg.auth.pass]);
  if (cached.sig !== sig) {
    // nodemailer needs Node 20+; load lazily so the rest of the site works on any Node version.
    const nodemailer = require('nodemailer');
    cached = { sig, transport: nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.secure, auth: cfg.auth, connectionTimeout: 15000, greetingTimeout: 15000 }) };
  }
  return cached.transport;
}

async function deliver(id, to, subject, text) {
  const cfg = smtpConfig();
  if (!cfg) return { ok: false, status: 'stored' };
  try {
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    if (nodeMajor < 20) throw new Error('Email sending needs Node.js 20 or newer (choose Node 22 in your hosting panel).');
    await transport(cfg).sendMail({ from: `"Invest n Returns" <${cfg.from}>`, to, subject, text });
    if (id) q.run("UPDATE outbox SET status = 'sent', error = '' WHERE id = ?", id);
    return { ok: true, status: 'sent' };
  } catch (e) {
    const err = String((e && e.message) || e).slice(0, 300);
    if (id) q.run("UPDATE outbox SET status = 'failed', error = ? WHERE id = ?", err, id);
    console.error('[mail] delivery failed:', err);
    return { ok: false, status: 'failed', error: err };
  }
}

// Store, then deliver in the background (never blocks or breaks the request).
function send(to, subject, body) {
  const cfg = smtpConfig();
  const r = q.run('INSERT INTO outbox (to_email, subject, body, created_at, status) VALUES (?,?,?,?,?)', to, subject, body, now(), cfg ? 'queued' : 'stored');
  if (cfg) setImmediate(() => { deliver(Number(r.lastInsertRowid), to, subject, body).catch(() => {}); });
  else if (process.env.NODE_ENV !== 'production') console.log(`[mail] stored (no SMTP) to=${to} subject="${subject}"`);
}

module.exports = { send, deliver, smtpConfig };
