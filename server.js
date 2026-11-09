'use strict';
const config = require('./src/config');
const { db, init } = require('./src/db');

process.on('unhandledRejection', (e) => { console.error('[fatal] unhandled rejection', e); });

(async () => {
  const backend = await init();
  const app = require('./src/app');
  const server = app.listen(config.port, () => {
    console.log(`Invest n Returns running on ${config.siteUrl} (port ${config.port}, ${config.isProd ? 'production' : 'development'}, Node ${process.version}, db ${backend})`);
  });
  const shutdown = (sig) => {
    console.log(`${sig} received, shutting down…`);
    server.close(() => { try { db.close(); } catch { /* already closed */ } process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((e) => {
  // Keep a minimal server up so the host shows the cause instead of a bare 503.
  console.error('[fatal] could not start:', e);
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, 'data');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'startup-error.log'), `${new Date().toISOString()} Node ${process.version}\n${e && e.stack ? e.stack : e}\n`);
  } catch { /* ignore */ }
  const msg = String((e && e.message) || e).replace(/[<>&]/g, '');
  require('http').createServer((req, res) => {
    res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>Startup error</title><body style="font-family:system-ui;padding:40px;max-width:720px"><h1>Invest n Returns could not start</h1><p>Node ${process.version}</p><pre style="white-space:pre-wrap;background:#f3f4ef;padding:16px;border-radius:8px">${msg}</pre><p>Full details are in <code>data/startup-error.log</code> and the host's runtime log.</p></body>`);
  }).listen(config.port);
});
