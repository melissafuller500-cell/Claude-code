# BayStock Auto Parts — baystockparts.com

Online store for auto parts, built to the BayStock website specification
(cahier des charges): Astro, pre-rendered pages, a small Node.js server for
ordering and the parts assistant, hosted on Hostinger.

**To put the site online, follow [DEPLOY.md](DEPLOY.md).**

## What is in the site

- Home, all categories, 16 category pages, product pages, kit index and kit pages, vehicle pages by make and model
- Price tiers (1+, 3+, 10+, 50+) with a live calculator on every card and product page
- Vehicle selector (year, make, model) with fitment filtering and a "Fits your vehicle" badge
- Instant search by name, SKU, original part number, or vehicle
- Cart (slide-over on desktop, full page on mobile) with the free-shipping bar, weight-based shipping, and tier nudges
- Quick order: type or paste SKU and quantity lines
- Order form with WhatsApp handoff (`PAYMENT_MODE=whatsapp`), order number `BS-YYMMDD-0001`, order emails to customer and owner; Stripe Checkout built in and switched off
- Parts assistant (Claude API) that answers only from catalog and policy data
- Written pages: pricing, shipping, returns, warranty, FAQ, about, contact, privacy and terms (drafts for attorney review), blog with three articles
- SEO: titles and meta descriptions from the spec, JSON-LD (Organization, WebSite, BreadcrumbList, ItemList, Product, FAQPage, Article), sitemap, robots.txt with AI crawlers allowed, llms.txt, Google Merchant feed
- Cookie consent before GA4, Google Ads, and Meta Pixel; security headers; rate limits; honeypot on forms

## Editing content

| What | Where |
| --- | --- |
| Products and kits | `data/products.csv`, `data/kits.csv` (validated on every build) |
| Shipping rates | `data/shipping-rates.json` |
| Company details and placeholders | `src/config/site.ts` |
| Page copy from the spec | `src/content/copy.ts` |
| Blog articles | `src/content/blog/*.md` |
| Images | `src/assets/` (see `src/assets/README.md`) |

## Placeholders still to fill

These stay in curly braces until the owner supplies the real values:
`{LEGAL_NAME}`, `{US_ADDRESS}`, `{PHONE}`, `{SUPPORT_EMAIL}`, `{SUPPORT_HOURS}`,
`{SHIPPING_WINDOW}` (in `src/config/site.ts`), `{EFFECTIVE_DATE}` and
`{GOVERNING_STATE}` (in `src/pages/privacy.astro` and `src/pages/terms.astro`),
and `WHATSAPP_NUMBER` (environment variable).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run build` | Validates the catalog, then builds to `dist/` |
| `npm start` | Runs the production server (`server.mjs`) |
| `npm run validate` | Checks the product and kit files only |
| `npm test` | Catalog validator and pricing tests |
| `npm run test:e2e` | Server checks against the built site (checkout, emails, WhatsApp, limits, chatbot request) |
| `npm run check` | Type check |

Browser checks (vehicle selector, calculator, quick order, search, full order)
are in `tests/e2e/browser.mjs` and need Playwright.

Requires Node 22.12 or later.
