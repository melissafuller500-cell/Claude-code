#!/usr/bin/env node
/**
 * Prépare les paquets prêts à déployer, après `npm run build` :
 *   release/noetechgrowth-hebergement-classique.zip  → contenu à envoyer dans public_html (Apache + PHP, cPanel…)
 *   release/noetechgrowth-cloudflare-pages.zip       → dist/ + functions/ + wrangler.toml (wrangler pages deploy)
 * Le .htaccess est généré à partir de public/_redirects et public/_headers (une seule source de vérité).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const OUT = 'release';
const APACHE = path.join(OUT, 'hebergement-classique');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(APACHE, { recursive: true });
fs.cpSync('dist', APACHE, { recursive: true });
fs.cpSync('hosting/apache/api', path.join(APACHE, 'api'), { recursive: true });
for (const f of ['_redirects', '_headers']) fs.rmSync(path.join(APACHE, f), { force: true });

// Redirections : _redirects → RewriteRule
const rules = fs.readFileSync('public/_redirects', 'utf8').split('\n')
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split(/\s+/))
  .filter(([from, to]) => from && to);
const seen = new Set();
const rewrite = [];
for (const [from, to, code = '301'] of rules) {
  let pattern;
  if (from.endsWith('/*')) pattern = `^${esc(from.slice(1, -2))}(/.*)?$`;
  else pattern = `^${esc(from.slice(1).replace(/\/$/, ''))}/?$`;
  if (seen.has(pattern)) continue;
  seen.add(pattern);
  rewrite.push(`RewriteRule ${pattern} ${to} [R=${code},L]`);
}
function esc(s) { return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); }

const htaccess = `# Noé Tech Growth — généré par scripts/package.mjs (ne pas modifier à la main)
Options -Indexes -MultiViews
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddDefaultCharset utf-8
AddType application/manifest+json .webmanifest
AddType image/avif .avif
AddType font/woff2 .woff2

<IfModule mod_rewrite.c>
RewriteEngine On

# Domaine sans www, puis HTTPS (compatible avec un proxy qui termine le TLS)
RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]
RewriteCond %{HTTPS} off
RewriteCond %{HTTP:X-Forwarded-Proto} !https
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Données internes et sources non publiques
RewriteRule ^api/data/ - [F,L]

# Formulaire et événements (équivalents PHP des fonctions Cloudflare)
RewriteRule ^api/diagnostic/?$ api/diagnostic.php [L]
RewriteRule ^api/event/?$ api/event.php [L]

# Redirections 301 de l'ancien site (depuis public/_redirects)
${rewrite.join('\n')}

# Barre oblique finale pour les dossiers (URL canoniques)
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^(.*[^/])$ /$1/ [R=301,L]
</IfModule>

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
Header always set X-Frame-Options "SAMEORIGIN"
<FilesMatch "\\.(js|css|woff2|avif|webp|jpg|png|svg)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\\.(html|xml|txt)$">
Header set Cache-Control "public, max-age=0, must-revalidate"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript text/xml application/xml application/rss+xml text/plain image/svg+xml application/json application/manifest+json
</IfModule>
`;
fs.writeFileSync(path.join(APACHE, '.htaccess'), htaccess);
fs.writeFileSync(path.join(APACHE, 'api', '.htaccess'), '<FilesMatch "\\.(csv|log)$">\nRequire all denied\n</FilesMatch>\n');

// Les fichiers OG sont générés à la demande sous /og/ : rien à faire. Archives :
execSync(`cd ${APACHE} && zip -qr ../noetechgrowth-hebergement-classique.zip . -x '*.DS_Store'`);
const CF = path.join(OUT, 'cloudflare-pages');
fs.mkdirSync(CF, { recursive: true });
fs.cpSync('dist', path.join(CF, 'dist'), { recursive: true });
fs.cpSync('functions', path.join(CF, 'functions'), { recursive: true });
fs.copyFileSync('wrangler.toml', path.join(CF, 'wrangler.toml'));
execSync(`cd ${CF} && zip -qr ../noetechgrowth-cloudflare-pages.zip .`);
const size = (f) => `${(fs.statSync(f).size / 1024 / 1024).toFixed(1)} Mo`;
console.log(`✓ ${OUT}/noetechgrowth-hebergement-classique.zip (${size(`${OUT}/noetechgrowth-hebergement-classique.zip`)})`);
console.log(`✓ ${OUT}/noetechgrowth-cloudflare-pages.zip (${size(`${OUT}/noetechgrowth-cloudflare-pages.zip`)})`);
console.log(`  ${rewrite.length} redirections converties pour Apache.`);
