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
npm run package    # build + paquets prêts à déployer dans release/
```

Node 22.12 ou plus récent.

## Mettre en ligne

`npm run package` construit le site et prépare deux paquets dans `release/` :

### Option A — hébergement classique (cPanel, Apache + PHP) : le plus simple

1. **Sauvegarder l'ancien site WordPress** (cPanel > Sauvegarde), puis vider le dossier `public_html`.
2. Dans cPanel > Comptes de messagerie, **créer l'adresse `contact@noetechgrowth.com`** (le formulaire y envoie les demandes).
3. Gestionnaire de fichiers > `public_html` > Téléverser `noetechgrowth-hebergement-classique.zip`, puis « Extraire ».
   Vérifier que le fichier caché `.htaccess` est bien présent (afficher les fichiers cachés).
4. Activer le certificat SSL (cPanel > SSL/TLS Status ou AutoSSL) : le `.htaccess` redirige tout vers `https://noetechgrowth.com`.
5. Tester : envoyer le formulaire de `/diagnostic/` et vérifier la réception dans la boîte `contact@`.

Le formulaire passe par `api/diagnostic.php` (fonction `mail()` du serveur) ; les événements de conversion sont
écrits dans `api/data/events.csv` (non accessible depuis le web). PHP 8.0 minimum.

### Option B — Cloudflare Pages (D3)

1. Cloudflare > Workers & Pages > Create > Pages > connecter ce dépôt GitHub.
   Build command : `npm run build` · Output directory : `dist` · Branche de production : `main`.
   Chaque `push` sur `main` reconstruit et publie le site.
   (Sans GitHub : `npx wrangler pages deploy dist` depuis le contenu de `noetechgrowth-cloudflare-pages.zip`.)
2. Secrets du formulaire (Settings > Variables and Secrets) : `RESEND_API_KEY` (compte [Resend](https://resend.com),
   domaine vérifié), `FORM_TO` = `contact@noetechgrowth.com`, `FORM_FROM` = `Site Noé Tech Growth <contact@noetechgrowth.com>`,
   et en option `FORM_WEBHOOK_URL`.
3. Activer *Web Analytics* (sans cookie). Les événements de conversion vont dans Workers Analytics Engine (`wrangler.toml`).
4. Custom domains : `noetechgrowth.com` et `www.noetechgrowth.com`.

Dans les deux cas, si l'envoi du formulaire échoue, le visiteur se voit proposer d'envoyer le même message sur WhatsApp.

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

## Visuels

`src/assets/brand/` : `noe-cutout.webp` (hero), `noe-portrait.jpg` (À propos), `logo-mark.webp` (logo), convertis
automatiquement en AVIF/WebP aux bonnes tailles. Sources d'origine dans `assets-src/`. Après un changement de logo
ou de portrait : `npm run icons` (favicon, icône Apple, logo 512 px, visuels des images de partage).
