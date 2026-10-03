# Publier sur le blog de Noé Tech Growth

Publier un article = ajouter un fichier Markdown, le faire relire, passer `draft` à `false`, pousser sur `main`.
Cloudflare Pages reconstruit et met en ligne le site automatiquement.

## Créer un article

```bash
npm run new:post "Que faire si un client conteste une facture ?"            # question-réponse, en français
npm run new:post "How do I chase an invoice?" -- --en --fond --cat=relances # article de fond, en anglais
```

Le fichier est créé dans `src/content/blog/fr/` (ou `en/`) en brouillon, avec le frontmatter prérempli.
Prévisualiser : `npm run dev`, puis ouvrir `http://localhost:4321/blog/`. Les brouillons s'affichent en local
(mention DRAFT), jamais en production.

## Le frontmatter (contrôlé au build)

| Champ | Règle |
|---|---|
| `title` | 60 caractères max, formulé comme la question du lecteur |
| `description` | 150 à 160 caractères |
| `answer` | réponse directe de 40 à 60 mots, affichée en tête d'article |
| `format` | `qr` (300 à 500 mots) ou `fond` (1 000 à 1 800 mots) |
| `category` | `contrats`, `suivi`, `relances`, `clients-publics`, `ohada`, `tresorerie` |
| `translationKey` | identique entre la version FR et la version EN d'un même article |
| `tool` / `guide` | au moins l'un des deux (maillage interne) |
| `sources` | obligatoire dès qu'un chiffre ou un texte de loi est cité ; chaque source a une URL |
| `updatedDate` | seulement quand le contenu change réellement |

**Le build échoue** si un champ obligatoire manque, si `answer` sort de 40 à 60 mots, si la description sort
de 150 à 160 caractères ou si une source n'a pas d'URL. Cela vaut aussi pour les brouillons : un brouillon
incomplet bloque la mise en ligne. Contrôle rapide avant de pousser : `node scripts/check-content.mjs`,
puis `npm run build`.

## Le corps de l'article

- Sous-titres `##` formulés comme des questions quand c'est naturel.
- Un paragraphe contenant seulement `[[cta]]` place l'encadré « diagnostic » au milieu de l'article. Un second
  encadré est ajouté automatiquement à la fin.
- Un bloc ` ```modele ` devient un encadré « Modèle à copier » avec bouton Copier.
- Un exemple chiffré en FCFA, présenté comme *exemple fictif* s'il n'est pas sourcé.
- Les termes du glossaire sont liés automatiquement à leur première occurrence. Ne pas les lier à la main.
- Procédures : listes numérotées. Comparaisons : tableaux.

## Règles éditoriales

1. Un article répond à une **question réelle de dirigeant**. Pas de sujet déjà traité : chercher dans
   `src/content/blog/` avant d'écrire (le script signale les sujets proches).
2. Toute référence juridique cite **le texte et l'article exacts**, vérifiés sur le texte officiel en vigueur,
   avec lien. En cas de doute, la phrase est retirée. Attention : l'Acte uniforme OHADA sur le recouvrement a été
   révisé le 17 octobre 2023 ; le délai d'opposition à l'injonction de payer est passé de 15 à 10 jours.
3. Tout chiffre a une **source datée**, ou est présenté comme **exemple fictif**.
4. **Aucun témoignage, client ou résultat inventé.**
5. Chaque article qui touche au droit se termine par l'avertissement « information générale, pas un conseil
   juridique » (ajouté automatiquement, sauf pour les catégories `suivi` et `tresorerie`).
6. Jamais « avocat » ni conseil juridique pour décrire Noé : il met en place contrats types, suivi et relances.
7. **Relecture humaine obligatoire** avant de passer `draft` à `false`.

## Rythme (D2)

1 question-réponse courte par jour ouvré, 1 article de fond par semaine.

## Traduire un article

Créer le fichier dans `src/content/blog/en/` avec un slug anglais et **le même `translationKey`**. Les balises
`hreflang` et le sélecteur de langue se mettent à jour seuls. Un article peut rester en français seulement :
il n'aura alors aucune balise `hreflang` anglaise.

## Autres contenus

- Guides : `src/content/guides/{fr,en}/` (1 200 à 2 000 mots, sources obligatoires).
- Secteurs : `src/content/secteurs/{fr,en}/` (structure fixe : où l'argent se bloque, clauses, exemple chiffré).
- Glossaire : `src/content/glossaire/{fr,en}/` (définition en une phrase, explication, exemple, termes liés).
- Données des outils : `src/data/*.json`. Textes d'interface : `src/i18n/ui.ts`. Coordonnées : `src/data/site.ts`.
- Preuves (témoignages réels uniquement) : `src/data/editorial.ts` → `PROOFS`. La section de l'accueil
  s'affiche dès qu'il y en a une.
- Identité légale (RCCM, NIU…) : `src/data/editorial.ts` → `LEGAL`. Les mentions légales deviennent
  indexables dès que tous les champs sont remplis.
