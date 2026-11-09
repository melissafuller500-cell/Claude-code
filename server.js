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
  console.error('[fatal] could not start:', e);
  process.exit(1);
});
