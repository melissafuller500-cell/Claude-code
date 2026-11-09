# Invest n Returns

A complete website for investing in African real assets: a public site in English and French, investor accounts, asset reservations, an investor dashboard and an admin console.

Built with Node.js 22, Express and the built-in SQLite engine (`node:sqlite`). There are no native modules, no build step and only three runtime dependencies.

## Quick start

```bash
npm install
cp .env.example .env      # optional for local development
npm start                 # http://localhost:3000
npm test                  # end-to-end test suite
```

On first boot the database (`data/inr.db`) is created and seeded with 28 example projects, an admin account and a demo investor.

| Account | Email | Password |
|---|---|---|
| Admin | `ADMIN_EMAIL` (default `admin@investnreturns.com`) | `ADMIN_PASSWORD` (default `Admin!2026change`, **change it**) |
| Demo investor | `demo@investnreturns.com` | `Demo!2026invest` |

Set `SEED_DEMO=false` in production to skip the demo users.

## What's included

### Public site (SEO, AEO, GEO)
- Home page with a live weekly-payout simulator, animated stats, featured projects, a returns calculator, payment methods, trust checks and an FAQ.
- A marketplace (`/assets`) with search, filters by asset class, country and risk, and sorting.
- A detail page for each project (`/assets/:slug`) with KPIs, an animated funding bar, a live income estimate and a reservation form.
- A landing page for each of the 8 asset classes (`/invest/:slug`) plus a comparison table.
- How it works, Security, Payments, Roadmap, About, FAQ, Returns calculator, Contact, Submit a project, and legal pages.
- **SEO:** every page has its own title and description, a canonical URL, `hreflang` EN/FR/x-default, Open Graph and Twitter cards, a 1200×630 OG image, and `sitemap.xml` with language alternates and `robots.txt`.
- **AEO (answer engines):** schema.org JSON-LD for Organization, WebSite with SearchAction, WebPage with `speakable`, BreadcrumbList, FAQPage, HowTo, ItemList, CollectionPage and InvestmentOrDeposit. Pages lead with a direct "quick answer" paragraph and use semantic Q&A markup.
- **GEO (generative engines):** `/llms.txt` and `/llms-full.txt` give a factual summary, the key numbers, every open project and the FAQ. `robots.txt` explicitly allows AI crawlers on public pages.
- French is served at separate crawlable URLs (`/fr/...`), not toggled client-side.

### Accounts and security
- Register, log in, log out, forgot and reset password, change password, and revoke other sessions.
- Passwords hashed with scrypt and a per-user salt. Sessions are opaque tokens stored as SHA-256 hashes, with HttpOnly SameSite cookies.
- CSRF protection on every form and on JSON calls. Rate limiting on auth and public forms. Honeypots against spam.
- Helmet with a strict CSP (`script-src 'self'`, no inline scripts), HSTS in production, safe redirects that block open redirects, CSV exports protected against formula injection, and auto-escaped HTML templates.
- An audit log of every sensitive action.

### Investor dashboard (`/dashboard`)
- Overview: balance, amount invested, total paid out, a live counter of income accruing since the last payout, a cumulative-payout chart, an allocation donut, positions and recommendations.
- Reservations: a 72-hour hold with a countdown, payment instructions, cancel, and a progress timeline.
- Watchlist (heart toggle), a wallet with withdrawals and CSV export, a KYC form, notifications, and profile and language settings.

### Admin console (`/admin`)
- Overview KPIs (AUM, investors, pending items, total paid out), a 30-day reservations chart, AUM by asset class, and a to-do queue.
- Assets: create, edit and delete projects, with bilingual content, status, a featured flag and validation.
- Reservations: confirm payment (blocked until KYC is verified, with an explicit override), reject with a reason, or complete and return capital.
- Users and KYC: verify or reject identity, promote or demote, suspend, send a reset link, and adjust balances.
- Withdrawals: mark as sent, or reject so the funds go back to the investor's balance.
- Weekly payouts: credits amount × rate ÷ 52 to every active position and is idempotent per ISO week.
- Project submissions (with "create asset from this"), contact messages, the email outbox, a newsletter CSV export, and the audit log.

### Reservation lifecycle
`pending` (72h hold, counts toward funding) → `active` (admin confirms payment; KYC required) → weekly payouts → `completed` (capital returned to balance). A pending reservation can also become `cancelled`, `rejected` or `expired`. A project switches to `funded` automatically when it is fully confirmed.

## Configuration

See `.env.example`. Key variables:

| Variable | Purpose |
|---|---|
| `NODE_ENV=production` | Secure cookies, HSTS, and requires `SESSION_SECRET` |
| `SESSION_SECRET` | Long random string used for CSRF signing |
| `SITE_URL` | Public URL used for canonical links, the sitemap and OG tags (e.g. `https://investnreturns.com`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First admin account, created on first boot |
| `DB_FILE` | SQLite file path (default `data/inr.db`) |
| `PAY_USDT_ADDRESS`, `PAY_MOMO_NUMBER`, … | Deposit details shown to investors. If unset, investors are told the details will be sent to them |
| `TRUST_PROXY` | Number of reverse proxies in front of the app (default 1 in production) |

## Going live checklist
1. Set `NODE_ENV=production`, `SESSION_SECRET`, `SITE_URL`, `ADMIN_*` and `SEED_DEMO=false`, and delete or replace the example projects in the admin console.
2. Put the app behind HTTPS (nginx, Caddy, or a platform like Render or Fly) and persist the `data/` volume.
3. Connect an email provider in `src/services/ledger.js → sendMail()`. Until then, emails go to Admin → Email outbox.
4. Fill in the legal entity details, licences and payment rails. KYC document upload should go through a certified KYC provider.
5. Submit `SITE_URL/sitemap.xml` to Google Search Console and Bing Webmaster Tools.

## Docker
```bash
docker build -t invest-n-returns .
docker run -p 3000:3000 -v inr-data:/app/data -e SESSION_SECRET=change-me -e SITE_URL=http://localhost:3000 invest-n-returns
```

## Project layout
```
server.js              entry point
src/app.js             middleware, security headers, routing, errors
src/db.js, seed.js     schema and seed data
src/security.js        passwords, sessions, CSRF, rate limits, guards
src/services/          assets (funding maths) and ledger (all money movements, in transactions)
src/routes/            public, dashboard, admin, seo (sitemap/robots/llms)
src/views/             server-rendered views (auto-escaping html`` templates)
public/                css, js (no frameworks), images
test/                  end-to-end tests (node:test)
```
