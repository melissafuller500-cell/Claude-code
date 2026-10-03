#!/usr/bin/env node
/**
 * Génère les redirections 301 de l'ancien site WordPress vers les nouvelles pages.
 *   node scripts/build-redirects.mjs ancien-sitemap.xml   (ou un fichier texte : une URL par ligne)
 * Chaque ancienne URL est associée à la page la plus proche par mots-clés, ou à « / » à défaut.
 * Les lignes sont insérées dans public/_redirects ; relire le résultat avant de pousser.
 */
import fs from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('Usage : node scripts/build-redirects.mjs ancien-sitemap.xml'); process.exit(1); }
const raw = fs.readFileSync(src, 'utf8');
const urls = [...new Set((raw.match(/https?:\/\/[^\s<"]+/g) || raw.split(/\s+/)).filter(Boolean))];

// Pages du nouveau site (doivent rester alignées avec src/i18n/routes.ts).
const KEEP = new Set(['/', '/diagnostic/', '/offres/', '/outils/', '/blog/', '/a-propos/', '/guides/', '/secteurs/', '/glossaire/', '/ressources/', '/mentions-legales/', '/confidentialite/', '/en/']);
const RULES = [
  [/injonction|ohada|recouvrement/, '/guides/injonction-de-payer-ohada/'],
  [/etat|public|marche|tresor/, '/guides/paiement-etat-cameroun/'],
  [/balance|suivi|impaye|creance/, '/guides/balance-agee/'],
  [/relance|rappel/, '/outils/calendrier-relances/'],
  [/clause|contrat|condition/, '/outils/modele-conditions-paiement/'],
  [/calcul|cout|tresorerie/, '/outils/calculateur-retard-paiement/'],
  [/btp|construction|batiment/, '/secteurs/btp/'],
  [/transport|logistique/, '/secteurs/transport/'],
  [/negoce|fournisseur|distribution/, '/secteurs/negoce/'],
  [/agence|cabinet|etude/, '/secteurs/agences-cabinets/'],
  [/service|offre|tarif|prix|audit/, '/offres/'],
  [/contact|devis|rendez|diagnostic/, '/diagnostic/'],
  [/propos|about|noe|equipe/, '/a-propos/'],
  [/mention|legal/, '/mentions-legales/'],
  [/confidential|privacy|donnees/, '/confidentialite/'],
  [/blog|article|actualite|news|\/20\d\d\//, '/blog/'],
];
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const lines = [];
for (const u of urls) {
  let p;
  try { p = new URL(u, 'https://noetechgrowth.com').pathname; } catch { continue; }
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/';
  if (KEEP.has(p)) continue;
  const target = (RULES.find(([re]) => re.test(norm(p))) || [null, '/'])[1];
  lines.push(`${p.padEnd(60)} ${target.padEnd(42)} 301`);
  if (p.endsWith('/') && p !== '/') lines.push(`${p.slice(0, -1).padEnd(60)} ${target.padEnd(42)} 301`);
}
const file = 'public/_redirects';
const marker = '# --- URL de l\'ancien site (générées par scripts/build-redirects.mjs) ---';
const cur = fs.readFileSync(file, 'utf8');
const [head, rest] = cur.split(marker);
const tail = rest.slice(rest.indexOf('# --- Règles génériques'));
fs.writeFileSync(file, `${head}${marker}\n${lines.join('\n')}\n\n${tail}`);
console.log(`${lines.length} redirections écrites dans ${file}. Relisez-les avant de pousser.`);
