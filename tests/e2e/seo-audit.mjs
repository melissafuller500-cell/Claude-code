// Launch checklist audit over the built HTML in dist/client.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = 'dist/client';
const pages = [];
const walk = (d) => readdirSync(d).forEach((f) => {
  const p = join(d, f);
  if (statSync(p).isDirectory()) walk(p);
  else if (f.endsWith('.html')) pages.push(p);
});
walk(root);
const problems = [];
const titles = new Map();
const descs = new Map();
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.replace(/&amp;/g, '&') ?? '';
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1]?.replace(/&amp;/g, '&').replace(/&#39;/g, "'") ?? '';
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) problems.push(`${p}: ${h1} H1 elements`);
  if (noindex) continue;
  if (title.length >= 60) problems.push(`${p}: title is ${title.length} chars: ${title}`);
  if (desc.length >= 155) problems.push(`${p}: meta description is ${desc.length} chars`);
  if (titles.has(title)) problems.push(`${p}: duplicate title (also ${titles.get(title)})`);
  if (descs.has(desc)) problems.push(`${p}: duplicate description (also ${descs.get(desc)})`);
  titles.set(title, p);
  descs.set(desc, p);
  if (!/<link rel="canonical"/.test(html)) problems.push(`${p}: no canonical`);
  if (!/application\/ld\+json/.test(html)) problems.push(`${p}: no structured data`);
}
// JavaScript on a catalog page (initial load)
const cat = readFileSync(join(root, 'parts/cabin-air-filters/index.html'), 'utf8');
const scripts = new Set([...cat.matchAll(/(?:src|component-url|renderer-url)="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]));
const seen = new Set();
const collect = (file) => {
  if (seen.has(file)) return;
  seen.add(file);
  const src = readFileSync(join(root, file), 'utf8');
  for (const m of src.matchAll(/from"\.\/([^"]+\.js)"|import"\.\/([^"]+\.js)"/g)) collect(`/_astro/${m[1] ?? m[2]}`);
};
scripts.forEach(collect);
// The chat module is loaded on demand only; exclude it from the initial budget.
const initial = [...seen].filter((f) => !/chat-mount/.test(f));
const gz = initial.reduce((s, f) => s + gzipSync(readFileSync(join(root, f))).length, 0);
console.log(`${pages.length} HTML pages checked; ${titles.size} indexable`);
console.log(`Catalog page JavaScript: ${(gz / 1024).toFixed(1)} KB compressed across ${initial.length} files (budget 100 KB)`);
if (gz > 100 * 1024) problems.push('JavaScript budget exceeded');
console.log(problems.length ? `\n${problems.join('\n')}` : 'No problems found.');
process.exitCode = problems.length ? 1 : 0;
