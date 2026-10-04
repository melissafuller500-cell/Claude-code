// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { loadCatalog } from './lib/catalog.mjs';
import { formatReport } from './lib/report.mjs';

const production = process.env.BAYSTOCK_ENV === 'production';

/** Validates data/*.csv before every build. A bad row stops the build. */
function catalogValidation() {
  return {
    name: 'baystock-catalog-validation',
    hooks: {
      /** @param {any} options */
      'astro:config:setup': ({ addWatchFile, logger, command }) => {
        for (const f of ['products.csv', 'kits.csv', 'categories.json', 'blocked-terms.json', 'shipping-rates.json']) {
          addWatchFile(new URL(`./data/${f}`, import.meta.url));
        }
        const result = loadCatalog({ production });
        const report = formatReport(result, production);
        if (!result.errors.length) {
          logger.info(report);
          return;
        }
        if (command === 'build') throw new Error(`\n${report}\n\nFix data/products.csv or data/kits.csv and run the build again.`);
        logger.error(report);
      },
    },
  };
}

// Pages that must never be indexed or listed in the sitemap
const NOINDEX = ['/cart/', '/checkout/', '/quick-order/', '/search/', '/404'];

export default defineConfig({
  site: process.env.SITE_URL || 'https://baystockparts.com',
  trailingSlash: 'always',
  output: 'static', // every page is pre-rendered; only /api/ routes opt out with `prerender = false`
  adapter: node({ mode: 'standalone' }),
  integrations: [
    catalogValidation(),
    preact(),
    sitemap({ filter: (page) => !NOINDEX.some((p) => new URL(page).pathname.startsWith(p)) }),
  ],
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  security: { checkOrigin: true },
  env: {
    schema: {
      PAYMENT_MODE: envField.enum({ context: 'server', access: 'public', values: ['whatsapp', 'stripe'], default: 'whatsapp' }),
      WHATSAPP_NUMBER: envField.string({ context: 'server', access: 'public', default: '{WHATSAPP_NUMBER}' }),
      PUBLIC_GA4_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GOOGLE_ADS_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_META_PIXEL_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_BING_SITE_VERIFICATION: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    define: { __BAYSTOCK_PRODUCTION__: JSON.stringify(production) },
  },
});
