# Deploying baystockparts.com to Hostinger

The site is an Astro project with a small Node.js server. Every catalog page is
pre-built HTML; only `/api/` (checkout, contact, chatbot, Stripe webhook) runs
on the server. You need a **Hostinger Business** (or Cloud) plan, which
supports Node.js web apps.

## 1. Create the Node.js app

In hPanel: **Websites → Add website → Node.js Apps**, then pick one:

- **Upload files:** upload `baystockparts-site.zip` (this folder, zipped).
- **GitHub (recommended):** connect the repository and branch. Every push then rebuilds and redeploys the site.

Build settings:

| Setting | Value |
| --- | --- |
| Node.js version | 22.x or later |
| Install command | `npm install` (default) |
| Build command | `npm run build` |
| Start command | `npm run start` |
| Entry file (if asked) | `server.mjs` |

## 2. Add the environment variables

Enter the variables from `.env.example` in the app's **Environment variables**
panel **before the first build**. The required ones at launch:

| Variable | What to enter |
| --- | --- |
| `SITE_URL` | `https://baystockparts.com` |
| `PAYMENT_MODE` | `whatsapp` |
| `WHATSAPP_NUMBER` | WhatsApp Business number, digits with country code (e.g. `15551234567`) |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.hostinger.com` / `465` |
| `SMTP_USER` / `SMTP_PASS` | The mailbox that sends order emails (create it under Emails in hPanel) |
| `ORDER_NOTIFY_EMAIL` | Where your copy of each order and contact message goes |
| `ORDER_LOG_DIR` | A folder outside the app that survives redeploys, e.g. `/home/USERNAME/baystock-orders` |
| `ANTHROPIC_API_KEY` | Claude API key for the parts assistant, with a monthly spending cap set in the Claude Console |

Some values are read **when the site is built**, so redeploy after changing them:
`PAYMENT_MODE` (button wording), `BAYSTOCK_ENV`, `SITE_URL`, and all `PUBLIC_*`
analytics IDs.

## 3. Connect the domain

Point `baystockparts.com` at the Node.js app in hPanel and turn on the free SSL
certificate. The server sends HSTS and the other security headers on HTTPS
requests.

## 4. Check it works

1. Open the site: the home page, a category, and a product page load.
2. Place a test order with your own email: the confirmation page opens, the WhatsApp link shows the order, and both emails arrive.
3. Send a message from the contact form.
4. Ask the parts assistant: "What is the price of BS-CAF-0012 at quantity 10?"

## Replacing the sample catalog

The site ships with 20 sample products and 2 sample kits so it builds and can be
tested. While they are live, a yellow banner says the products are samples.

1. Fill `data/products.csv` and `data/kits.csv` with the real catalog (same columns; see section 5 of the specification). Leave the `sample` column empty or `false`.
2. Run `npm run validate` locally. The build stops with the file, line, SKU, and reason if any row is invalid.
3. Set `BAYSTOCK_ENV=production` so sample rows are always left out, and redeploy.
4. Add images to `src/assets/` (see `src/assets/README.md`).

Stock, prices, and products change by editing the CSV and redeploying. There is
no admin panel at launch.

## Orders

Each order is appended to `ORDER_LOG_DIR/orders.jsonl`, and the full order is
emailed to the customer and to `ORDER_NOTIFY_EMAIL`. Those two emails are the
working record. Confirm and ship an order only after you record the payment.

## Turning on card checkout later

Create the Stripe account in the company's name, enable Stripe Tax, add a
webhook endpoint `https://baystockparts.com/api/stripe-webhook/` for the
`checkout.session.completed` event, then set `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, and `PAYMENT_MODE=stripe`, and redeploy. Submit
`/feeds/google-merchant.xml` to Merchant Center only after card checkout is live.

## Local development

```bash
npm install
npm run dev            # http://localhost:4321
npm test               # catalog and pricing tests
npm run build && npm run test:e2e   # server checks: checkout, emails, WhatsApp, limits
npm start              # run the production server locally (PORT=3000)
```
