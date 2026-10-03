# Cahier des charges — Site Noé Tech Growth (noetechgrowth.com)

Document destiné à Claude Code. Il décrit la refonte du fichier `index.html` existant (landing page unique) en un site statique multi-pages avec blog, optimisé SEO, AEO et GEO.

**Source de contenu :** le fichier `index.html` actuel et son dossier `assets/`. Tout le texte, les données des outils (clauses, relances, secteurs, balance âgée, quiz) et les traductions anglaises (`data-en`) s'y trouvent. On réutilise ce contenu, on ne le réécrit pas, sauf indication contraire ci-dessous.

---

## 1. Objectif et cible

- **Objectif unique du site :** obtenir des demandes de diagnostic de 45 minutes.
- **Cible :** dirigeants et gérants de PME B2B de 10 à 50 employés au Cameroun (BTP, services aux entreprises, négoce, transport, cabinets).
- **Contexte d'usage :** majoritairement mobile Android d'entrée ou de milieu de gamme, données mobiles payantes, WhatsApp comme canal principal.
- **Objectif secondaire :** être trouvé et cité sur les questions de retard de paiement, de recouvrement et de contrats au Cameroun et en zone OHADA (Google, Bing, assistants IA).

## 2. Décisions à valider par Noé avant le build

Chaque ligne a une valeur par défaut. Claude Code applique la valeur par défaut si Noé ne répond pas, et la signale dans son compte rendu.

| # | Décision | Valeur par défaut |
|---|---|---|
| D1 | Le diagnostic de 45 min est-il gratuit ou payant ? | Gratuit, écrit explicitement sur chaque bouton et dans la FAQ |
| D2 | Rythme du blog | 1 question-réponse courte par jour ouvré + 1 article de fond par semaine |
| D3 | Hébergeur | Cloudflare Pages |
| D4 | Adresse e-mail affichée | `contact@noetechgrowth.com` (à créer), à la place de l'adresse Gmail |
| D5 | Service de réception du formulaire | Un service de formulaire sans serveur compatible avec l'hébergeur retenu |
| D6 | Mesure d'audience | Outil léger sans bannière de cookies (par défaut celui de l'hébergeur) |
| D7 | Palette | Celle du fichier actuel (nuit / forêt / feuille / étincelle) |
| D8 | Identité légale (forme, RCCM, NIU, adresse) | Champs laissés en `À COMPLÉTER`, page non indexée tant qu'ils sont vides |

## 3. Stack et contraintes techniques

- **Générateur :** Astro, dernière version stable. Vérifier la documentation officielle au moment du build pour les API (collections de contenu, i18n, sitemap, RSS).
- **Sortie :** 100 % statique. Aucune base de données, aucun CMS.
- **Contenu :** Markdown ou MDX dans le dépôt, validé par un schéma typé.
- **JavaScript :** zéro JS par défaut. Les outils interactifs sont des îlots chargés seulement sur les pages qui les utilisent, et seulement quand ils entrent dans l'écran.
- **Pas de framework d'interface lourd.** JS natif, repris et nettoyé depuis le fichier existant.
- **CSS :** un fichier global de variables et de base, puis des styles par composant. Pas de framework CSS.
- **Polices :** hébergées en local, format `woff2`, sous-ensemble latin. Deux familles maximum : Archivo (titres) et Instrument Sans (texte). IBM Plex Mono est remplacée par la pile monospace du système. `font-display: swap`, préchargement de la seule police du titre principal.
- **Images :** composant d'image d'Astro, formats AVIF et WebP, `width` et `height` toujours renseignés, chargement différé hors du premier écran.
- **Dépôt :** Git, déploiement automatique à chaque `push` sur la branche principale. C'est ce qui permet de publier un article par simple ajout de fichier.

### Arborescence du dépôt

```
src/
  content/
    blog/fr/…   blog/en/…
    guides/fr/… guides/en/…
    secteurs/fr/… secteurs/en/…
    glossaire/fr/… glossaire/en/…
  data/            # clauses, relances, quiz, balance âgée (JSON, FR + EN)
  components/      # Header, Footer, Cta, Calculator, Quiz, ArticleCard, JsonLd…
  layouts/         # Base, Page, Article, Guide
  pages/           # routes FR à la racine, routes EN sous /en/
  styles/
public/
  fonts/ images/ robots.txt llms.txt _redirects
```

## 4. Arborescence du site et URLs

URLs en minuscules, sans accent, avec tirets, terminées par `/`. Français à la racine, anglais sous `/en/`.

| URL (FR) | Rôle | Intention de recherche visée |
|---|---|---|
| `/` | Landing page raccourcie | « encaisser plus vite », nom de marque |
| `/diagnostic/` | Page de conversion : déroulé, préparation, formulaire | « diagnostic trésorerie PME » |
| `/offres/` | Les trois étapes et leurs prix | « audit créances prix » |
| `/outils/calculateur-retard-paiement/` | Calculateur | « coût retard de paiement » |
| `/outils/test-contrat/` | Quiz en 6 questions | « mon contrat me protège-t-il » |
| `/outils/modele-conditions-paiement/` | Générateur de clauses | « modèle clause paiement » |
| `/outils/calendrier-relances/` | Scripts de relance | « modèle relance facture impayée » |
| `/guides/injonction-de-payer-ohada/` | Guide de fond | « injonction de payer OHADA » |
| `/guides/paiement-etat-cameroun/` | Guide du circuit public | « délai paiement État Cameroun » |
| `/guides/balance-agee/` | Guide du suivi des impayés | « balance âgée Excel » |
| `/secteurs/` + `/secteurs/[slug]/` | Une page par secteur | « impayés BTP Cameroun », etc. |
| `/glossaire/` + `/glossaire/[terme]/` | Une page par terme | définitions |
| `/blog/` | Index paginé (12 par page) | — |
| `/blog/categorie/[slug]/` | Index par catégorie | — |
| `/blog/[slug]/` | Article | une question par article |
| `/a-propos/` | Noé Mbwang, parcours, méthode | nom du fondateur |
| `/mentions-legales/` et `/confidentialite/` | Obligations | — |
| `/404/` | Page d'erreur avec liens utiles | — |

**Redirections :** l'ancien site WordPress est sur le même domaine. Récupérer la liste de ses URLs (sitemap de l'ancien site, Search Console) et écrire une redirection 301 pour chacune vers la page équivalente, ou vers `/` à défaut. Aucune ancienne URL ne doit renvoyer une erreur 404.

## 5. Design

### 5.1 Ce qu'on garde du fichier actuel

- Les variables de couleur (`--night`, `--forest`, `--leaf`, `--spark`, `--gold`, `--paper`, etc.).
- La bande claire « papier » pour alterner avec le fond sombre.
- Les boutons en pilule, les rayons, la grille.
- La jauge liée au calculateur (« un seul chiffre à faire baisser ») : c'est l'élément signature.

### 5.2 Ce qu'on supprime

- Le canvas de particules du hero (`#flux`).
- **Le compteur « Factures encaissées pendant votre visite »** : chiffre fictif, à retirer sans remplacement.
- La parallaxe du hero, le mot « NOÉ » en fond, les feuilles et l'anneau décoratifs.
- Les boutons magnétiques, l'inclinaison 3D des cartes, le halo qui suit la souris.
- Le bandeau défilant.
- La tige de navigation latérale.
- La mention « Places limitées ».

### 5.3 Règles

- **Tailles de texte :** corps 17 px, minimum absolu 14 px, y compris étiquettes et légendes.
- **Contraste :** niveau AA sur tous les textes.
- **Hero :** titre, une phrase d'accroche, un paragraphe de deux phrases maximum, un bouton principal, un bouton secondaire, le portrait détouré sur fond simple. Aucun élément ne chevauche le texte sur mobile.
- **Animations autorisées :** apparition douce au défilement, transitions de survol, remplissage de la jauge et du réservoir. Toutes désactivées avec `prefers-reduced-motion`.
- **Navigation :** Offres, Outils, Ressources (guides, secteurs, glossaire), Blog, sélecteur FR/EN, bouton « Diagnostic ». Menu mobile en panneau plein écran sur fond opaque.
- **Pied de page :** liens vers toutes les sections, coordonnées, mentions légales, flux RSS.

## 6. Landing page (`/`)

Ordre des sections. Le contenu vient du fichier existant, raccourci.

1. **Hero** — selon 5.3. Bouton principal : « Réserver le diagnostic de 45 min » avec la mention de prix selon D1.
2. **Pour qui** — liste « Vous êtes au bon endroit si » et « Ce n'est pas pour vous si ». Remontée depuis la 11e position.
3. **Le problème** — les trois fuites et les quatre coûts.
4. **Calculateur** — version actuelle, avec lien vers la page outil complète.
5. **Les trois chantiers** — version condensée : trois cartes (contrats, suivi, relances), la jauge, un lien vers chaque outil. Les démonstrations complètes (clauses, balance âgée, relances) partent sur les pages outils et guides. Un seul `<h2>` dans le code, pas de doublon mobile/ordinateur.
6. **Repère chiffré** — la statistique des 200 jours, avec un lien cliquable vers la source. Si la source n'est pas retrouvée et vérifiée, la section est retirée.
7. **Preuves** — emplacement pour témoignages ou cas chiffrés. **Ne rien inventer.** Tant que Noé n'a fourni aucun élément réel, la section n'est pas affichée.
8. **Offres** — les trois étapes avec prix, fusionnées avec l'ancienne section « Méthode » (plus de répétition).
9. **À propos** — court, avec lien vers `/a-propos/`.
10. **FAQ** — 6 questions maximum sur la landing page. Les autres vont sur `/diagnostic/` et `/offres/`.
11. **Contact** — formulaire selon la section 12.

Sortent de la landing page : OHADA, clients publics, secteurs, glossaire, test contrat complet.

## 7. Pages secondaires

- **Outils :** chaque outil a sa page avec un titre, 150 à 300 mots d'explication en HTML statique, l'outil, puis un appel au diagnostic. Les données (clauses, scripts de relance, questions du quiz, lignes de la balance âgée) sont **rendues dans le HTML au build**, puis rendues interactives. Aucune donnée ne doit exister seulement en JavaScript.
- **Guides :** contenu long (1 200 à 2 000 mots), sommaire ancré, encadré « En bref » de 50 mots en tête, sources en bas, avertissement « information générale, pas un conseil juridique ».
- **Secteurs :** une page par secteur présent dans les onglets du fichier actuel. Structure fixe : où l'argent se bloque, les clauses qui comptent, un exemple chiffré en FCFA, liens vers les outils.
- **Glossaire :** une page par terme, avec définition en une phrase, explication, exemple, termes liés.
- **À propos :** parcours, méthode, certifications, photo, liens vers les profils publics. Rester factuel sur la formation (Master en Droit Public International et Science Politique) : ne pas écrire « avocat » ni suggérer une activité de conseil juridique.
- **Mentions légales et confidentialité :** identité de l'éditeur (D8), hébergeur, données collectées par le formulaire, durée de conservation, contact.

## 8. Blog

### 8.1 Schéma de contenu (frontmatter)

```yaml
title: ""            # 60 caractères max, formulé comme la question du lecteur
description: ""      # 150 à 160 caractères
answer: ""           # réponse directe, 40 à 60 mots, affichée en tête d'article
format: "qr"         # "qr" (question-réponse) ou "fond"
category: ""         # contrats | suivi | relances | clients-publics | ohada | tresorerie
tags: []
pubDate: 2026-01-01
updatedDate:         # optionnel, affiché si présent
lang: "fr"
translationKey: ""   # identique entre la version FR et la version EN
sources:             # obligatoire dès qu'un chiffre ou un texte de loi est cité
  - title: ""
    url: ""
draft: false
```

Le build échoue si un champ obligatoire manque, si `answer` sort de la plage de longueur, ou si un article cite une source sans URL.

### 8.2 Gabarit d'article

1. Fil d'Ariane.
2. `<h1>` : la question.
3. Date de publication, date de mise à jour, temps de lecture, auteur avec lien vers `/a-propos/`.
4. Encadré « Réponse courte » : le champ `answer`.
5. Corps : sous-titres `<h2>` formulés comme des questions quand c'est naturel.
6. Un exemple chiffré en FCFA.
7. Un modèle à copier (clause, message, ligne de tableau) quand le sujet s'y prête, avec bouton « Copier ».
8. Encadré d'appel au diagnostic, placé une fois au milieu et une fois en fin.
9. Sources, en liste de liens.
10. Encadré auteur.
11. Trois articles liés de la même catégorie, plus un lien vers l'outil ou le guide correspondant.

### 8.3 Formats

- **Question-réponse (`qr`) :** 300 à 500 mots. Une seule question. Publication quotidienne possible.
- **Fond (`fond`) :** 1 000 à 1 800 mots. Un sujet traité complètement.

### 8.4 Règles éditoriales (à inscrire dans un `CONTRIBUTING.md`)

- Un article répond à une question réelle de dirigeant. Pas de sujet déjà traité : chercher dans le dépôt avant d'écrire.
- Toute référence juridique cite le texte et l'article exacts, vérifiés sur le texte officiel en vigueur, avec lien. En cas de doute, la phrase est retirée.
- Tout chiffre a une source datée, ou est présenté comme exemple fictif.
- Aucun témoignage, client ou résultat inventé.
- Chaque article se termine par l'avertissement « information générale, pas un conseil juridique » quand il touche au droit.
- Relecture humaine obligatoire avant de passer `draft` à `false`.

### 8.5 Fonctions

- Index paginé, filtres par catégorie, pages de catégorie indexables avec un texte d'introduction unique.
- Flux RSS FR et EN.
- Les brouillons ne sont ni construits ni listés dans le sitemap.
- Un script `npm run new:post "titre"` crée le fichier avec le frontmatter prérempli.

## 9. Langues

- Français par défaut à la racine, anglais sous `/en/` avec des slugs traduits.
- Les textes d'interface sont dans des fichiers de traduction, pas dans des attributs `data-en`.
- Balises `hreflang` (`fr`, `en`, `x-default`) sur chaque page qui a une traduction, reliées par `translationKey`.
- Attribut `lang` correct sur `<html>`.
- Le sélecteur de langue pointe vers la page équivalente, ou vers l'accueil de l'autre langue s'il n'y a pas de traduction.
- Un article peut exister en français seulement. Dans ce cas, aucune balise `hreflang` anglaise.
- Les `aria-label` sont traduits.

## 10. SEO technique

- `<head>` valide et complet sur chaque page, généré par un composant unique : `charset`, `viewport`, `title`, `description`, URL canonique absolue, Open Graph (`og:title`, `og:description`, `og:url`, `og:type`, `og:image` en URL absolue, 1200 × 630), carte Twitter, `theme-color`, favicon.
- Image Open Graph générée par page (titre de l'article sur fond de marque). L'aperçu doit s'afficher dans WhatsApp : tester.
- Un seul `<h1>` par page, hiérarchie de titres sans saut.
- `sitemap.xml` automatique, déclaré dans `robots.txt`.
- Maillage interne : chaque article lie au moins un outil ou un guide et deux autres articles ; chaque guide lie les outils et le glossaire ; chaque terme du glossaire est lié à sa page lors de sa première occurrence dans un article.
- Fil d'Ariane visible sur toutes les pages sauf l'accueil.
- Pages d'index paginées avec URL canonique propre à chaque page.
- Pas de contenu dupliqué entre la landing page et les pages secondaires : la landing page résume et renvoie.
- Après mise en ligne : déclarer le site et le sitemap dans Google Search Console et Bing Webmaster Tools (tâche de Noé, à rappeler dans le compte rendu).

## 11. AEO — être repris comme réponse directe

- Chaque page de contenu commence par une réponse autonome de 40 à 60 mots, compréhensible sans le reste de la page.
- Les questions sont écrites comme les gens les posent (« Que faire si un client ne paie pas après 60 jours ? »).
- Listes numérotées pour les procédures, tableaux pour les comparaisons, définitions en une phrase pour le glossaire.
- Dates de publication et de mise à jour visibles et présentes dans les données structurées.

### Données structurées (JSON-LD), via un composant `JsonLd`

| Page | Types |
|---|---|
| Toutes | `Organization` (ou `ProfessionalService`) + `WebSite`, avec nom, URL, logo, zone desservie, coordonnées, `sameAs` |
| Accueil, À propos | `Person` pour Noé Mbwang (fonction, formation, `sameAs`), liée à l'organisation |
| Articles | `BlogPosting` : titre, description, auteur, éditeur, dates, image, langue |
| Guides | `Article` |
| Pages avec FAQ visible | `FAQPage`, strictement identique au texte affiché |
| Glossaire | `DefinedTerm` dans un `DefinedTermSet` |
| Offres | `Service` avec `Offer` (prix en XAF) |
| Toutes sauf accueil | `BreadcrumbList` |

Les données structurées ne contiennent rien qui ne soit pas visible sur la page. Valider chaque gabarit avec l'outil de test des résultats enrichis de Google et le validateur Schema.org.

## 12. GEO — être cité par les assistants IA

- **Contenu lisible sans JavaScript.** Tout le texte utile est dans le HTML servi.
- **`robots.txt` :** autoriser explicitement les robots de recherche et de citation des assistants IA (OpenAI, Anthropic, Perplexity, Google, Bing). Vérifier les noms d'agents à jour au moment du build.
- **`llms.txt` à la racine :** présentation du site en quelques lignes et liste des pages de référence. Coût faible, effet non prouvé : ne pas y passer de temps.
- **Phrases citables :** chaque guide et chaque article contient des affirmations courtes, précises et sourcées, qui gardent leur sens hors contexte.
- **Entité cohérente :** même nom (« Noé Tech Growth »), même description en une phrase et mêmes coordonnées sur le site, les données structurées et les profils externes.
- **Auteur identifié** sur chaque contenu, avec page auteur et liens vers les profils publics.
- **Données originales :** prévoir une page `/barometre/` (non construite en phase 1) pour publier des chiffres agrégés et anonymisés tirés des diagnostics. Prévoir seulement le gabarit.
- **Fraîcheur :** date de mise à jour modifiée uniquement quand le contenu change réellement.

## 13. Conversion et mesure

- **Formulaire de diagnostic :** vrai formulaire avec envoi vers le service retenu (D5), validation native, message de confirmation, protection anti-spam par champ piège. Champs : secteur, retard de paiement (oui / non / parfois), taille de l'équipe, prénom, entreprise, ville, téléphone ou e-mail, message.
- **Trois voies de contact, toujours visibles ensemble :** envoyer le formulaire, écrire sur WhatsApp (message prérempli avec le résultat du calculateur), envoyer un e-mail (`mailto:`).
- **Bouton flottant WhatsApp** sur mobile, masqué quand le formulaire est à l'écran.
- **Un seul libellé pour l'appel à l'action principal** dans tout le site.
- **Événements mesurés :** clic sur l'appel principal, envoi du formulaire, clic WhatsApp, clic e-mail, utilisation du calculateur, fin du quiz, copie d'un modèle.
- Le calculateur et le quiz fonctionnent hors ligne une fois la page chargée et n'envoient aucune donnée.

## 14. Performance

Budgets mesurés sur mobile, connexion 4G lente, appareil de milieu de gamme :

| Indicateur | Cible |
|---|---|
| Score Lighthouse mobile (performance, accessibilité, SEO, bonnes pratiques) | ≥ 95 chacun |
| LCP | < 2,5 s |
| CLS | < 0,05 |
| INP | < 200 ms |
| Poids total de la landing page | < 500 Ko |
| JavaScript sur la landing page | < 40 Ko compressé |
| JavaScript sur un article de blog | 0 Ko, hors bouton « Copier » |
| Requêtes vers des domaines tiers | 0, hors mesure d'audience |

## 15. Accessibilité

- Lien d'évitement, focus visible, navigation complète au clavier.
- Onglets, accordéons et sélecteurs conformes aux modèles ARIA, ou éléments natifs (`<details>`, `<input type="radio">`).
- Champs de formulaire avec `<label>`, erreurs annoncées.
- Texte alternatif sur les images porteuses de sens, vide sur les images décoratives.
- Les résultats du calculateur et du quiz sont annoncés aux lecteurs d'écran.
- Zones tactiles de 44 px minimum.

## 16. Interdits

- Inventer un témoignage, un client, un logo, un chiffre de résultat ou une statistique.
- Écrire une référence juridique non vérifiée.
- Afficher un compteur ou un indicateur qui ne mesure rien de réel.
- Ajouter une dépendance sans la justifier dans le compte rendu.
- Charger une police, un script ou une image depuis un domaine tiers.
- Modifier les prix ou les termes des offres.

## 17. Phases de livraison

Chaque phase se termine par un compte rendu : ce qui est fait, ce qui reste, les décisions par défaut appliquées, les scores Lighthouse.

1. **Socle.** Projet Astro, design system, en-tête, pied de page, composant `<head>`, i18n, déploiement. *Critère : une page vide se déploie, `<head>` valide, scores ≥ 95.*
2. **Landing page et diagnostic.** Sections 6 et 13. *Critère : formulaire reçu en test, aperçu WhatsApp correct, budgets de la section 14 tenus.*
3. **Outils.** Quatre pages outils, données rendues au build. *Critère : contenu lisible avec JavaScript désactivé.*
4. **Guides, secteurs, glossaire, à propos, pages légales.** *Critère : données structurées valides sur chaque gabarit.*
5. **Blog.** Collection, gabarits, index, catégories, RSS, script de création, `CONTRIBUTING.md`, trois articles d'exemple en brouillon. *Critère : publier un article se résume à ajouter un fichier et pousser.*
6. **Anglais.** Pages `/en/`, `hreflang`. *Critère : aucune page anglaise sans équivalent déclaré, aucun texte français résiduel.*
7. **Mise en ligne.** Redirections 301, `robots.txt`, `sitemap.xml`, `llms.txt`, bascule du domaine. *Critère : aucune ancienne URL en 404.*

## 18. Vérifications finales

- [ ] HTML valide sur chaque gabarit (validateur W3C).
- [ ] Aucun texte utile absent du HTML avec JavaScript désactivé.
- [ ] Données structurées sans erreur sur chaque type de page.
- [ ] `hreflang` réciproques et URL canoniques correctes.
- [ ] Aperçu de lien testé dans WhatsApp, LinkedIn et Facebook.
- [ ] Parcours complet testé au clavier et sur un écran de 360 px de large.
- [ ] Formulaire, lien WhatsApp et lien e-mail testés.
- [ ] Budgets de performance tenus sur la landing page, un outil et un article.
- [ ] Redirections de l'ancien site testées.
- [ ] Liste des éléments `À COMPLÉTER` remise à Noé (identité légale, preuves, source du chiffre repère, décisions D1 à D8).
