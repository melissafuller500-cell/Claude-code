'use strict';
const config = require('./src/config');
const app = require('./src/app');
const { db } = require('./src/db');

const server = app.listen(config.port, () => {
  console.log(`Invest n Returns running on ${config.siteUrl} (port ${config.port}, ${config.isProd ? 'production' : 'development'})`);
});

function shutdown(sig) {
  console.log(`${sig} received, shutting down…`);
  server.close(() => {
    try { db.close(); } catch { /* already closed */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
