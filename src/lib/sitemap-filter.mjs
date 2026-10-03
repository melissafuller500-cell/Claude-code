import fs from 'node:fs';
/** Lit src/data/editorial.ts pour savoir si l'identité légale est complète (D8). */
export function legalNoindexPaths() {
  const src = fs.readFileSync(new URL('../data/editorial.ts', import.meta.url), 'utf8');
  const block = src.match(/export const LEGAL = \{([\s\S]*?)host:/);
  const incomplete = !block || /:\s*TODO/.test(block[1]);
  return incomplete ? ['/mentions-legales/', '/en/legal-notice/'] : [];
}
