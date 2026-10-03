# Compte rendu de livraison — noetechgrowth.com

Date : 3 octobre 2026 · Branche : `claude/sharp-newton-ryr740` · Générateur : Astro 7.3.5 (dernière version stable)

Les sept phases du cahier des charges sont livrées dans ce dépôt. Le site compte **69 pages** (FR + EN),
toutes construites en HTML statique et lisibles sans JavaScript. Le cahier des charges et le fichier
`index.html` d'origine sont archivés dans `docs/`.

## 1. Résultats mesurés

Lighthouse 12, profil mobile (4G lente, appareil milieu de gamme), sur le build de production :

| Page | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | CLS | Poids |
|---|---|---|---|---|---|---|---|
| Accueil `/` | 100 | 100 | 100 | 100 | 1,7 s | 0,013 | 90 Ko |
| Outil `/outils/test-contrat/` | 100 | 100 | 100 | 100 | 1,5 s | 0,001 | 81 Ko |
| Guide `/guides/injonction-de-payer-ohada/` | 100 | 100 | 100 | 100 | 1,5 s | 0,006 | 82 Ko |
| Outil EN `/en/tools/late-payment-calculator/` | 100 | 100 | 100 | 100 | 1,5 s | 0,021 | 81 Ko |
| Article `/blog/client-ne-paie-pas-apres-60-jours/`* | 100 | 100 | 100 | 100 | 1,5 s | 0,007 | — |
| Article `/blog/calculer-delai-moyen-de-paiement/`* | 100 | 100 | 100 | 100 | 1,4 s | 0,007 | — |

\* articles publiés temporairement pour la mesure, puis remis en brouillon.

| Budget (section 14) | Cible | Mesuré |
|---|---|---|
| Poids total de l'accueil | < 500 Ko | 90 Ko (sans portrait ; voir § 5) |
| JavaScript sur l'accueil | < 40 Ko compressé | 5,8 Ko gzip |
| JavaScript sur un article | 0 Ko hors bouton Copier | 0 Ko ; 1,0 Ko si l'article contient un modèle à copier |
| Requêtes vers des domaines tiers | 0 hors mesure d'audience | 0 |
| INP | < 200 ms | TBT = 0 ms sur toutes les pages mesurées |

Autres vérifications (section 18) :

- **HTML valide** sur les 69 pages (html-validate, règles standard).
- **Aucun texte utile absent du HTML sans JavaScript** : calculateur pré-calculé, 6 questions du test et leurs conseils,
  6 clauses, 5 messages de relance, 8 lignes de balance âgée, tous présents dans le HTML servi.
- **`npm run verify`** (script livré) : liens internes, `hreflang` réciproques avec `x-default`, canonique absolue,
  un seul `<h1>`, hiérarchie de titres sans saut, JSON-LD valide, FAQPage identique au texte affiché, texte français
  résiduel sur `/en/`, budgets JS. Résultat : **0 erreur**. Le script a d'ailleurs trouvé et fait corriger un vrai
  défaut (page de catégorie qui déclarait une traduction inexistante).
- **Parcours testé au navigateur** (Chromium, 360 px) : lien d'évitement au premier Tab, menu mobile plein écran
  (ouverture, fermeture par Échap), calculateur (résultat annoncé aux lecteurs d'écran), jauge reliée, bouton
  flottant WhatsApp masqué quand le formulaire est à l'écran, validation du formulaire avec focus sur le champ en
  erreur. Aucune erreur JavaScript, aucun défilement horizontal à 360 px.
- **Fonction du formulaire testée** : envoi accepté, redirection vers la page de confirmation sans JavaScript (FR et EN),
  champ piège qui écarte le spam sans rien envoyer, champ invalide refusé, erreur de livraison signalée.

## 2. Décisions D1 à D8 : valeurs par défaut appliquées

| # | Valeur appliquée | Où la changer |
|---|---|---|
| D1 | Diagnostic **gratuit**. Libellé unique de l'appel principal : « Réserver le diagnostic gratuit de 45 min » / « Book the free 45-min diagnostic ». Question dédiée dans la FAQ. | `src/i18n/ui.ts`, `src/data/faq.ts` |
| D2 | 1 question-réponse par jour ouvré + 1 article de fond par semaine, écrit dans `CONTRIBUTING.md`. | `CONTRIBUTING.md` |
| D3 | **Cloudflare Pages** (`wrangler.toml`, `_headers`, `_redirects`, fonctions dans `functions/`). | — |
| D4 | `contact@noetechgrowth.com` partout, à la place de l'adresse Gmail. **Adresse à créer.** | `src/data/site.ts` |
| D5 | Fonction Cloudflare Pages sur le même domaine (`/api/diagnostic`), qui transmet par e-mail via Resend et, en option, vers un webhook. **Secrets à renseigner** (voir README). | `functions/api/diagnostic.js` |
| D6 | Cloudflare Web Analytics (sans cookie) pour les visites, à activer dans le tableau de bord ; événements de conversion comptés par `/api/event` dans Workers Analytics Engine. | `functions/api/event.js` |
| D7 | Palette d'origine conservée. Trois teintes ajustées pour le contraste AA : `--ink-mute` éclairci (#8FA493), vert et orange foncés pour le texte sur fond papier. | `src/styles/global.css` |
| D8 | Forme, RCCM, NIU, adresse en « À COMPLÉTER ». Les mentions légales sont en `noindex` et hors sitemap tant qu'un champ est vide ; elles redeviennent indexables automatiquement. | `src/data/editorial.ts` → `LEGAL` |

## 3. Éléments à compléter par Noé

1. **Identité légale (D8)** : forme juridique, RCCM, NIU, adresse → `src/data/editorial.ts`.
2. ~~Visuels~~ **fait** : logo officiel, portrait détouré (hero) et portrait (À propos) intégrés en AVIF/WebP ;
   favicon, icône Apple, logo 512 px des données structurées et images de partage régénérés depuis le vrai logo ;
   photo de Noé ajoutée à l'entité `Person` (JSON-LD). Sources d'origine conservées dans `assets-src/`.
3. **Preuves** : aucun témoignage ni cas chiffré n'a été fourni, la section n'est donc pas affichée. Ajouter des
   éléments réels dans `PROOFS` (`src/data/editorial.ts`) pour l'afficher.
4. **Profils publics** (LinkedIn, etc.) de Noé et de l'entreprise : `sameAs` dans `src/data/site.ts`. Ils
   alimentent les données structurées et la page À propos. Aucun n'a été inventé.
5. **Formulaire** : créer la boîte `contact@noetechgrowth.com` chez l'hébergeur. Sur un hébergement classique
   (cPanel), rien d'autre à faire : `api/diagnostic.php` envoie les demandes à cette adresse (testé : e-mail bien
   formé, `Reply-To` du visiteur, spam écarté, confirmation avec et sans JavaScript). Sur Cloudflare Pages, renseigner
   les secrets Resend (README). Si l'hébergeur retenu n'est pas Cloudflare, mettre à jour `LEGAL.host` dans
   `src/data/editorial.ts` (mentions légales et confidentialité).
6. **Redirections de l'ancien site WordPress** : l'ancien site n'était pas joignable depuis l'environnement de build.
   Des règles génériques WordPress sont en place (`/wp-admin/*`, `/feed/`, `/category/*`, `/contact/`…). Exporter le
   sitemap de l'ancien site (ou la liste des pages de la Search Console), lancer
   `node scripts/build-redirects.mjs ancien-sitemap.xml`, relire `public/_redirects`, pousser.
7. **Relecture humaine des trois articles d'exemple** (en brouillon) avant de passer `draft: false`.
8. **Relecture du contenu juridique** des guides par un professionnel du droit avant mise en ligne (voir § 4).
9. **Relecture de la page À propos** : les paragraphes « Parcours » reformulent la formation et les certifications
   existantes ; les compléter avec des éléments factuels (année, établissement) si souhaité.
10. **Après la mise en ligne** : déclarer le site et `https://noetechgrowth.com/sitemap-index.xml` dans Google Search
    Console et Bing Webmaster Tools ; tester l'aperçu des liens dans WhatsApp, LinkedIn et Facebook (les images
    Open Graph 1200 × 630 de ~37 Ko par page sont prêtes, mais l'aperçu ne se teste que sur le domaine en ligne).

## 4. Sources vérifiées et corrections de contenu

- **Repère des 200 jours** : source retrouvée et liée — Financial Afrik, 26 février 2026, citant la direction de la
  Trésorerie du Minfi (réunion du 6 février 2026). La section est donc affichée, avec le lien. La même source donne
  160 jours en 2024, ajouté au graphique.
- **Correction juridique importante** : l'Acte uniforme OHADA sur le recouvrement a été **révisé le 17 octobre 2023**
  (publié au Journal officiel de l'OHADA le 15 novembre 2023). Le délai d'opposition à l'injonction de payer est
  passé de **15 à 10 jours**. Le site d'origine indiquait 15 jours : c'est corrigé partout (guide, glossaire).
- Références citées avec numéro d'article : art. 1 (créance certaine, liquide, exigible), art. 3 (juridiction du
  domicile du débiteur), art. 4 (requête et décompte), art. 7 (signification sous trois mois), art. 10 (opposition
  sous dix jours), art. 16 (formule exécutoire). Elles ont été recoupées sur plusieurs sources secondaires, car le
  texte officiel n'était pas téléchargeable depuis l'environnement de build : **à confirmer sur le texte officiel**
  (lien SenLII fourni dans chaque guide) — c'est l'objet du point 8 ci-dessus.
- Circuit de la dépense publique : rattaché à la loi n° 2018/012 du 11 juillet 2018 (sans numéro d'article, faute de
  vérification sur le texte). Montant des impayés de l'État à fin mars 2026 (520 milliards FCFA) : Investir au Cameroun.
- Tous les autres chiffres du site sont présentés comme **exemples fictifs**.

## 5. Ce qui a été fait, phase par phase

| Phase | Livré | Critère |
|---|---|---|
| 1. Socle | Astro 7, design system (variables, base, composants), `<head>` unique, en-tête, pied de page, i18n à slugs traduits, polices locales woff2 (67 Ko au total, Archivo préchargée), `wrangler.toml` | ✓ `<head>` valide, scores 100 |
| 2. Accueil + diagnostic | 11 sections dans l'ordre demandé, page `/diagnostic/`, vrai formulaire (validation native, champ piège, confirmation, fonctionne sans JS), trois voies de contact toujours ensemble, bouton flottant WhatsApp, mesure des 7 événements | ✓ budgets tenus ; envoi réel à tester après configuration de Resend |
| 3. Outils | 4 pages outils + index, données rendues au build depuis `src/data/*.json`, îlots chargés à l'approche de l'écran | ✓ lisibles sans JS |
| 4. Contenus | 3 guides FR + 3 EN (1 200+ mots, sommaire, « En bref », sources, avertissement), 5 secteurs × 2, 9 termes de glossaire × 2, À propos, mentions légales, confidentialité, page Ressources | ✓ données structurées valides (Article, DefinedTerm, DefinedTermSet, Service/Offer en XAF, FAQPage, Person, BreadcrumbList, ProfessionalService, WebSite) |
| 5. Blog | Collection typée, gabarit d'article complet, index paginé (12/page), catégories avec intro unique (construites seulement si elles ont des articles), RSS FR et EN, `npm run new:post`, `CONTRIBUTING.md`, 3 articles d'exemple en brouillon | ✓ publier = ajouter un fichier et pousser |
| 6. Anglais | Toutes les pages ont leur version `/en/` à slug traduit, `hreflang` réciproques + `x-default`, `aria-label` traduits | ✓ aucune page EN sans équivalent, aucun texte français résiduel détecté |
| 7. Mise en ligne | `robots.txt` (robots de recherche et d'IA autorisés : Googlebot, Bingbot, Google-Extended, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot), `sitemap-index.xml`, `llms.txt`, `_redirects`, `_headers`, page 404 utile, images Open Graph par page | Bascule du domaine et liste réelle des anciennes URL : à faire (§ 3) |

Retiré, comme demandé : canvas de particules, compteur « Factures encaissées pendant votre visite », parallaxe,
mot « NOÉ » en fond, feuilles et anneau décoratifs, boutons magnétiques, inclinaison 3D, halo, bandeau défilant,
tige de navigation latérale, mention « Places limitées ». Gardé : palette, bande papier, boutons pilule, rayons,
grille, et la jauge reliée au calculateur.

Contenu repris du fichier d'origine sans réécriture, sauf : paragraphe du hero ramené à deux phrases ; FAQ répartie
sans doublon (6 questions sur l'accueil dont une nouvelle sur la gratuité, 4 sur `/diagnostic/`, 3 sur `/offres/`) ;
sections « Méthode » et « Offres » fusionnées ; champ « retard » du formulaire en oui / non / parfois comme demandé.
Prix et termes des offres inchangés.

## 6. Paquets prêts à déployer

`npm run package` produit dans `release/` :

- `noetechgrowth-hebergement-classique.zip` : à extraire dans `public_html` (Apache + PHP). Contient le site,
  un `.htaccess` généré (HTTPS, sans www, 404, 26 redirections 301, en-têtes de sécurité, cache, compression)
  et les scripts PHP du formulaire et des événements.
- `noetechgrowth-cloudflare-pages.zip` : `dist/`, `functions/` et `wrangler.toml` pour `wrangler pages deploy`.

Mesures après intégration des vraies images (Lighthouse mobile) : accueil 99/100/100/100 (LCP 1,8 s, 133 Ko),
`/en/` 99/100/100/100, À propos 100/100/100/100, diagnostic 100/100/100/100.

## 7. Dépendances (justification)

| Paquet | Pourquoi |
|---|---|
| `astro` | Générateur imposé par le cahier des charges. |
| `@astrojs/sitemap` | `sitemap.xml` automatique, filtré (404, confirmations, mentions incomplètes). |
| `@astrojs/rss` | Flux RSS FR et EN. |
| `@astrojs/markdown-remark` | Processeur Markdown officiel d'Astro. Depuis Astro 7, le processeur par défaut (Sätteri) n'exécute pas les plugins rehype ; celui-ci est nécessaire au plugin maison (modèles « Copier », liens automatiques du glossaire, encadré `[[cta]]`). |
| `satori` | Images Open Graph : transforme le titre de chaque page en image vectorielle avec la police Archivo intégrée. |
| `sharp` | Service d'images d'Astro (AVIF, WebP) et conversion des images Open Graph en PNG. |

Aucun framework d'interface, aucun framework CSS, aucun script tiers. Le JavaScript est natif.

## 8. Limites connues

- Les clics WhatsApp et e-mail ne sont pas comptés sur les pages sans JavaScript (articles, guides, secteurs) :
  c'est le prix du budget « 0 Ko » des articles. Les clics vers le diagnostic depuis ces pages sont comptés à
  l'arrivée sur `/diagnostic/`.
- Le menu mobile utilise l'API `popover` native (Chrome 114+, Safari 17+, Firefox 125+). Sur un navigateur plus
  ancien, la navigation s'affiche en ligne sous l'en-tête : elle reste utilisable.
- Un brouillon dont le frontmatter est incomplet bloque le build (règle voulue par la section 8.1).
- La page `/barometre/` est fournie comme gabarit non construit (`src/pages/_barometre.astro`), conformément à la
  phase 1.

## 9. Itération 2 — site actif et interactif (3 octobre 2026)

À la demande de Noé, le hero de la maquette d'origine est rétabli et l'interactivité renforcée, sans perdre en vitesse.

| Ajout | Détail | Coût |
|---|---|---|
| Hero vivant | Particules (factures) qui convergent vers le portrait, cartes « relance envoyée / facture payée » qui changent d'état, mot NOÉ en filigrane, parallaxe au pointeur (souris uniquement), preuves sous les boutons | ~3 Ko gzip, démarré 1,8 s après le chargement, arrêté hors écran et onglet masqué, désactivé si « réduire les animations » |
| Calculateur enrichi | Montant TTC expliqué, méthode de mesure du délai réel (formule pondérée), « agios économisés par an », curseur borné au retard réel, encart « la moyenne cache la répartition » | quelques centaines d'octets |
| Jauge narrative | Le délai baisse chantier après chantier au défilement (60 → 55 → 50 → 45 j) | dans le module existant |
| Compteur 200 jours + barres | Animés au défilement en CSS pur (aucun JavaScript) | 0 Ko |
| « Votre secteur en 10 secondes » | Sélecteur en CSS pur, lien vers chaque fiche secteur (maillage interne) | 0 Ko |
| Derniers articles sur l'accueil | 3 articles récents (fraîcheur, maillage) | 0 Ko |
| Survols | Cartes et offres qui se soulèvent légèrement (désactivé sans souris ou en mouvement réduit) | 0 Ko |

Non rétabli volontairement : le compteur « Factures encaissées pendant votre visite » (chiffre fictif, contraire à la règle « aucun indicateur qui ne mesure rien »),
le bandeau défilant et la tige latérale (bruit visuel, coût en JavaScript au défilement).

SEO / AEO / GEO :
- Titre d'accueil avec mots-clés : « Retards de paiement des PME au Cameroun · Noé Tech Growth ». La marque n'est ajoutée aux autres titres que s'ils restent sous 65 caractères (avant : jusqu'à 73).
- Organisation : `contactPoint` (e-mail, WhatsApp, langues), `knowsAbout`, `slogan`. Articles : `keywords`, `articleSection`, `wordCount`, `isPartOf`.
- `llms.txt` généré à chaque build (guides, outils, secteurs, tous les articles FR et EN).
- `sitemap.xml` : date réelle de dernière modification pour les guides, secteurs, glossaire et articles.
- Libellés accessibles alignés sur le texte visible (logo, sélecteur de langue) ; métriques de la police de repli recalculées (plus de saut de ligne au chargement).
- Blog : 6 articles FR publiés (dont 3 nouveaux : coût réel d'un retard, pièces pour prouver une créance, client qui conteste une facture) et 3 articles EN. **À relire par Noé** : ils sont en ligne dès le prochain déploiement.

Mesures (Lighthouse mobile, 3 passages sur l'accueil) : 99 / 100 / 100 / 100, LCP 1,95 s, TBT 0 ms, CLS 0,001, 154 Ko.
Articles et outils : 100 / 100 / 100 / 100. JavaScript de l'accueil : 8,8 Ko gzip (budget 40 Ko). 86 pages, HTML valide, 0 erreur au contrôle automatique.
