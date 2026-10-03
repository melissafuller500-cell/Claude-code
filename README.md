# noetechgrowth.com

Site statique multi-pages de **Noé Tech Growth** (Astro 7, 100 % statique, FR + EN), construit selon le cahier
des charges « refonte du fichier `index.html` ». Compte rendu complet : [`RAPPORT.md`](RAPPORT.md).
Publier un article : [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:4321 (les brouillons du blog sont visibles en local)
npm run build      # génère dist/
npm run preview    # sert dist/
npm run verify     # longueurs du contenu + build + contrôles (liens, hreflang, h1, JSON-LD, budgets JS)
npm run new:post "Titre formulé comme une question ?"
```

Node 22.12 ou plus récent.

## Déploiement (Cloudflare Pages, D3)

1. Cloudflare > Workers & Pages > Create > Pages > connecter ce dépôt GitHub.
2. Build command : `npm run build` · Output directory : `dist` · Branche de production : `main`.
3. Variables et secrets (Settings > Variables and Secrets) pour le formulaire (D5) :
   - `RESEND_API_KEY` : clé [Resend](https://resend.com) (envoi d'e-mail ; vérifier le domaine `noetechgrowth.com` chez Resend) ;
   - `FORM_TO` : `contact@noetechgrowth.com` ;
   - `FORM_FROM` : par exemple `Site Noé Tech Growth <site@noetechgrowth.com>` ;
   - `FORM_WEBHOOK_URL` (facultatif) : une URL qui reçoit aussi chaque demande en JSON (Google Sheets via Apps Script, Make…).
4. Mesure d'audience (D6) : activer *Web Analytics* sur le projet Pages (sans cookie, sans bannière).
   Les événements de conversion sont écrits dans Workers Analytics Engine (`EVENTS`, voir `wrangler.toml`).
5. Domaine : Custom domains > `noetechgrowth.com` et `www.noetechgrowth.com` (redirection de `www` vers l'apex).

Chaque `push` sur `main` reconstruit et publie le site.

## Arborescence

```
src/
  content/        blog, guides, secteurs, glossaire (fr/ et en/), schémas dans src/content.config.ts
  data/           données des outils (JSON FR + EN), FAQ, offres, pages, coordonnées
  components/     Head, Header, Footer, Calculator, Quiz, ClauseBuilder, Reminders, Gauge, DiagnosticForm, JsonLd…
  layouts/        Base, Tool
  views/          gabarits des pages, partagés entre FR et EN
  pages/          routes FR à la racine, routes EN sous /en/, images OG (/og/), RSS
  scripts/        JavaScript des îlots (chargés à l'approche de l'écran)
  i18n/           routes (slugs traduits) et textes d'interface
  styles/         variables et base
functions/api/    Cloudflare Pages Functions : formulaire et événements
public/           polices woff2, robots.txt, llms.txt, _redirects, _headers, icônes
scripts/          new-post, check-content, verify, build-redirects, build-icons
```

## Visuels à fournir

Déposer dans `src/assets/brand/` (le site les utilise automatiquement, en AVIF/WebP) :
`noe-cutout.webp` (portrait détouré du hero), `noe-portrait.jpg` (page À propos), `logo-mark.webp` (logo).
Pour les icônes, remplacer le dessin dans `scripts/build-icons.mjs` puis `npm run icons`.
