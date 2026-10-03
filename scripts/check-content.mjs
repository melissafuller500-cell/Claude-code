/** Contrôle rapide des longueurs (titre, description, answer) avant le build : node scripts/check-content.mjs */
import fs from 'node:fs';
import path from 'node:path';
const root = 'src/content';
let bad = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(root).filter((f) => f.endsWith('.md'))) {
  const fm = fs.readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1];
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1];
  const t = get('title'), d = get('description'), a = get('answer');
  const issues = [];
  if (t && t.length > 60) issues.push(`title ${t.length}`);
  if (d && (d.length < 150 || d.length > 160)) issues.push(`description ${d.length}`);
  if (a) { const w = a.trim().split(/\s+/).length; if (w < 40 || w > 60) issues.push(`answer ${w} mots`); }
  if (issues.length) { bad++; console.log(f, '→', issues.join(', ')); }
}
console.log(bad ? `${bad} fichier(s) à corriger` : 'OK');
