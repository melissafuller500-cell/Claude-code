#!/usr/bin/env node
/**
 * Vérifications du site construit (section 18). À lancer après `npm run build` :
 *   node scripts/verify.mjs
 * Contrôle : liens internes, hreflang réciproques, canonique, un seul <h1>, titres sans saut,
 * JSON-LD valide, FAQPage identique au texte affiché, texte français résiduel sur /en/, budgets JS.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = 'dist';
const SITE = 'https://noetechgrowth.com';
const errors = [];
const warn = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const exists = new Set(files.map((f) => '/' + path.relative(DIST, f).split(path.sep).join('/')));
const urlOf = (f) => '/' + path.relative(DIST, f).split(path.sep).join('/').replace(/index\.html$/, '').replace(/\.html$/, '/');
const resolves = (p) => {
  const clean = decodeURI(p.split('#')[0].split('?')[0]);
  if (clean === '' ) return true;
  return exists.has(clean) || exists.has(clean.replace(/\/?$/, '/') + 'index.html') || exists.has(clean + '.html');
};
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');
const hreflangMap = {};
const FR_WORDS = /\b(les|des|vous|votre|vos|pour|avec|dans|une|est|sont|nous|facture|paiement|délai|jours|retard|être|à la|aux)\b/gi;

for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const url = urlOf(f);
  const is404 = url.startsWith('/404');
  // h1 unique
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${url} : ${h1} <h1>`);
  // hiérarchie des titres (dans <main>)
  const main = html.split('<main')[1]?.split('</main>')[0] ?? '';
  const levels = [...main.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) { errors.push(`${url} : saut de titre h${levels[i - 1]} → h${levels[i]}`); break; }
  // canonique
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canon || !canon.startsWith(SITE)) errors.push(`${url} : canonique absente ou relative`);
  else if (!is404 && new URL(canon).pathname !== url) errors.push(`${url} : canonique ${canon}`);
  // lang
  const lang = html.match(/<html lang="([a-z]+)"/)?.[1];
  if (!lang) errors.push(`${url} : attribut lang manquant`);
  if (url.startsWith('/en/') && lang !== 'en') errors.push(`${url} : lang=${lang}`);
  // og:image
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!og || !resolves(new URL(og).pathname)) errors.push(`${url} : og:image manquante (${og})`);
  // description
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!desc) errors.push(`${url} : description manquante`);
  // hreflang
  const alts = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)"/g)].map((m) => [m[1], new URL(m[2]).pathname]));
  if (Object.keys(alts).length) hreflangMap[url] = alts;
  // liens internes
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const p = m[1];
    if (p.startsWith('/api/') || p.startsWith('//')) continue;
    if (!resolves(p)) errors.push(`${url} : lien cassé ${p}`);
  }
  // JSON-LD
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      for (const node of data['@graph'] || []) {
        if (node['@type'] === 'FAQPage') {
          const text = strip(main);
          for (const q of node.mainEntity) {
            const norm = (s) => s.replace(/\s+/g, ' ').trim();
            if (!text.includes(norm(q.name).replace(/&/g, ' ')) && !main.includes(q.name)) errors.push(`${url} : question FAQ JSON-LD absente du texte : ${q.name}`);
            if (!main.includes(q.acceptedAnswer.text)) errors.push(`${url} : réponse FAQ JSON-LD différente du texte affiché`);
          }
        }
      }
    } catch (e) { errors.push(`${url} : JSON-LD invalide (${e.message})`); }
  }
  // français résiduel sur les pages anglaises
  if (url.startsWith('/en/')) {
    const text = strip(main).replace(/[«“][^»”]*[»”]/g, ' ');
    const hits = (text.match(FR_WORDS) || []).length;
    const words = text.split(' ').length;
    if (hits / words > 0.02) warn.push(`${url} : ${hits} mots français possibles sur ${words}`);
  }
  // budgets JavaScript (scripts externes du site, compressés)
  const scripts = [...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+)"/g)].map((m) => m[1]);
  const inline = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('');
  // dépendances importées dynamiquement ou statiquement
  const seen = new Set();
  const collect = (p) => {
    if (seen.has(p)) return;
    seen.add(p);
    const fp = path.join(DIST, p);
    if (!fs.existsSync(fp)) return;
    const js = fs.readFileSync(fp, 'utf8');
    for (const im of js.matchAll(/["'`](\.\/[\w.-]+\.js)["'`]/g)) collect(path.posix.join(path.posix.dirname(p), im[1]));
    for (const im of js.matchAll(/["'`](_astro\/[\w.-]+\.js)["'`]/g)) collect('/' + im[1]);
  };
  scripts.forEach(collect);
  for (const im of inline.matchAll(/["'](\/_astro\/[^"']+\.js)["']/g)) collect(im[1]);
  const bytes = [...seen].reduce((s, p) => s + (fs.existsSync(path.join(DIST, p)) ? zlib.gzipSync(fs.readFileSync(path.join(DIST, p))).length : 0), 0) + (inline ? zlib.gzipSync(inline).length : 0);
  if (url === '/' || url === '/en/') console.log(`JS accueil ${url} : ${(bytes / 1024).toFixed(1)} Ko gzip`);
  if (url === '/' && bytes > 40 * 1024) errors.push(`/ : JavaScript ${bytes} o > 40 Ko`);
  if (/^\/(en\/)?blog\/[^/]+\/$/.test(url) && !/\/blog\/\d+\/$/.test(url)) console.log(`JS article ${url} : ${(bytes / 1024).toFixed(1)} Ko gzip`);
  if (/\/(guides|secteurs|sectors|glossaire|glossary)\/[^/]+\/$/.test(url)) {
    if (bytes > 3 * 1024 && !html.includes('data-aging')) warn.push(`${url} : ${bytes} o de JS`);
  }
}

// hreflang réciproques
for (const [url, alts] of Object.entries(hreflangMap)) {
  for (const [l, target] of Object.entries(alts)) {
    if (l === 'x-default') continue;
    const back = hreflangMap[target];
    if (!back) { errors.push(`${url} : hreflang ${l} → ${target} sans retour`); continue; }
    if (back.fr !== alts.fr || back.en !== alts.en) errors.push(`${url} : hreflang non réciproque avec ${target}`);
  }
  if (!alts['x-default']) errors.push(`${url} : x-default manquant`);
}
// toute page anglaise doit avoir son équivalent déclaré
for (const f of pages) {
  const url = urlOf(f);
  if (url.startsWith('/en/') && !hreflangMap[url] && !/\/en\/blog\/(\d+|category)\b/.test(url)) warn.push(`${url} : page anglaise sans hreflang`);
}

// poids de l'accueil
const home = fs.readFileSync(path.join(DIST, 'index.html'));
console.log(`HTML accueil : ${(zlib.gzipSync(home).length / 1024).toFixed(1)} Ko gzip`);
console.log(`${pages.length} pages contrôlées`);
warn.forEach((w) => console.log('⚠', w));
errors.forEach((e) => console.log('✗', e));
console.log(errors.length ? `${errors.length} erreur(s)` : '✓ aucune erreur');
process.exit(errors.length ? 1 : 0);
