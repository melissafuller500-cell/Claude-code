// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { loadCatalog } from './lib/catalog.mjs';
import { formatReport } from './lib/report.mjs';

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
        const result = loadCatalog();
        const report = formatReport(result);
        if (!result.errors.length) {
          logger.info(report);
          return;
        }
        if (command === 'build') throw new Error(`\n${report}\n\nFix data/products.csv or data/kits.csv and run the build again.`);
        logger.error(report); // dev: keep the server up so the error overlay can show it
      },
    },
  };
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://baystockparts.com',
  trailingSlash: 'always',
  output: 'static', // every page is pre-rendered; only /api/ routes opt out with `prerender = false`
  adapter: node({ mode: 'standalone' }),
  integrations: [catalogValidation(), preact()],
  build: { format: 'directory' },
  env: {
    schema: {
      PAYMENT_MODE: envField.enum({ context: 'server', access: 'public', values: ['whatsapp', 'stripe'], default: 'whatsapp' }),
      WHATSAPP_NUMBER: envField.string({ context: 'server', access: 'public', default: '{WHATSAPP_NUMBER}' }),
    },
  },
  vite: { plugins: [tailwindcss()] },
});
