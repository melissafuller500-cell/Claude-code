// Production entry point for Hostinger (Node.js web app).
// Wraps the Astro standalone handler to add security headers (spec section 11).
// Start with: node server.mjs   (PORT and HOST are read from the environment)
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';

// Load .env when present (local runs / hosts without an env-variable panel).
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://*.google.com",
  "font-src 'self'",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net",
  "frame-src https://www.googletagmanager.com",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

createServer((req, res) => {
  // HTTPS-only headers are sent when the request arrived over HTTPS (Hostinger's proxy sets X-Forwarded-Proto).
  const https = req.headers['x-forwarded-proto'] === 'https' || process.env.FORCE_HTTPS === 'true';
  res.setHeader('Content-Security-Policy', https ? `${CSP}; upgrade-insecure-requests` : CSP);
  if (https) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  const url = req.url || '/';
  if (url.startsWith('/_astro/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  else if (url.startsWith('/data/')) res.setHeader('Cache-Control', 'public, max-age=300');
  handler(req, res);
}).listen(port, host, () => {
  console.log(`BayStock server listening on http://${host}:${port} (PAYMENT_MODE=${process.env.PAYMENT_MODE || 'whatsapp'})`);
});
