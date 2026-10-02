# Noé Tech Growth · site

Site vitrine bilingue (FR/EN) de Noé Tech Growth. Un seul fichier `index.html`, sans build ni dépendance, plus le dossier `assets/`.

## Mettre en ligne
Déposez `index.html` et `assets/` tels quels sur n'importe quel hébergement statique (Netlify Drop, Vercel, GitHub Pages, cPanel). Rien à compiler.

## Modifier
- **Numéro WhatsApp** : constante `WA_NUMBER` en haut du script (chiffres uniquement, format international), et le numéro affiché dans la section Contact et le pied de page.
- **Textes** : chaque texte français a sa traduction anglaise dans l'attribut `data-en` du même élément.
- **Couleurs et polices** : variables CSS dans le bloc `:root` en tête du fichier.

## Assets
- `logo-mark.webp` : pictogramme du logo détouré.
- `noe-cutout.webp` : portrait détouré utilisé dans le hero.
- `noe-portrait.jpg` : portrait original (section À propos).
- `brand-badge.webp` : visuel du logo (image de partage réseaux sociaux).
- `favicon.png`.
