# BayStock Auto Parts — baystockparts.com

Astro site with a small Node server, built to the BayStock website specification (cahier des charges).

**Status: phase 1 of 6 (Foundation).** The page at `/` is a temporary foundation preview. Phase 2 replaces it with the home page.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run build` | Validates the catalog, then builds to `dist/` (sample rows included) |
| `npm run build:production` | Same, with sample products and kits excluded |
| `npm start` | Runs the built standalone Node server |
| `npm run validate` | Validates `data/products.csv` and `data/kits.csv` only |
| `npm test` | Validator test suite |

Requires Node 22.12 or later.

## Where things live

- `data/products.csv`, `data/kits.csv`: the catalog (20 sample products and 2 sample kits, all `sample: true`)
- `data/categories.json`, `data/shipping-rates.json`, `data/blocked-terms.json`: categories, shipping rates, and the emissions-defeat terms the validator rejects
- `lib/catalog.mjs`: the loader and validator. **The build fails on any bad row.**
- `src/config/site.ts`: the one shared file for business facts and placeholders
- `src/styles/global.css`: design tokens (spec section 3)
- `src/components/`: header, footer, bay line, tier strip, bin-tag product card
- `.env.example`: environment variables. `PAYMENT_MODE=whatsapp` at launch.

## Placeholders

These stay in curly braces until the owner supplies the real values: `{LEGAL_NAME}`, `{US_ADDRESS}`, `{PHONE}`, `{SUPPORT_EMAIL}`, `{SUPPORT_HOURS}`, `{SHIPPING_WINDOW}`, `{WHATSAPP_NUMBER}`.
