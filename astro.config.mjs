// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { rehypeContent } from './src/lib/rehype-content.mjs';
import { legalNoindexPaths } from './src/lib/sitemap-filter.mjs';
import { contentLastmod } from './src/lib/sitemap-lastmod.mjs';

const lastmod = contentLastmod();

export default defineConfig({
  site: 'https://noetechgrowth.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  markdown: {
    syntaxHighlight: false,
    // Processeur unified officiel : nécessaire pour le plugin rehype maison (modèles, glossaire).
    processor: unified({ rehypePlugins: [rehypeContent] }),
  },
  integrations: [
    sitemap({
      // Exclut la page 404, les confirmations et les pages légales tant qu'elles sont incomplètes (D8).
      filter: (page) => {
        const p = new URL(page).pathname;
        if (p.startsWith('/404') || p.includes('/merci/') || p.includes('/thank-you/')) return false;
        return !legalNoindexPaths().includes(p);
      },
      // Date réelle de dernière modification pour les contenus (guides, secteurs, glossaire, articles).
      serialize: (item) => {
        const d = lastmod.get(new URL(item.url).pathname);
        return d ? { ...item, lastmod: d } : item;
      },
    }),
  ],
});
