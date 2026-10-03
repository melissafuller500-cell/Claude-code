import fs from 'node:fs';
import path from 'node:path';
/**
 * Dates de dernière modification pour le sitemap, lues dans le frontmatter des contenus
 * (updatedDate, sinon pubDate). Les brouillons sont ignorés.
 */
const BASE = {
  blog: { fr: '/blog/', en: '/en/blog/' },
  guides: { fr: '/guides/', en: '/en/guides/' },
  secteurs: { fr: '/secteurs/', en: '/en/sectors/' },
  glossaire: { fr: '/glossaire/', en: '/en/glossary/' },
};
export function contentLastmod() {
  const map = new Map();
  for (const [col, base] of Object.entries(BASE)) {
    for (const lang of ['fr', 'en']) {
      const dir = path.resolve('src/content', col, lang);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
        const fm = fs.readFileSync(path.join(dir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
        if (/^draft:\s*true/m.test(fm)) continue;
        const d = (fm.match(/^updatedDate:\s*"?([\d-]+)/m) || fm.match(/^pubDate:\s*"?([\d-]+)/m) || [])[1];
        if (d) map.set(`${base[lang]}${f.replace(/\.md$/, '')}/`, new Date(d).toISOString());
      }
    }
  }
  return map;
}
