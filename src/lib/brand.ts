import type { ImageMetadata } from 'astro';

/**
 * Visuels de marque facultatifs. Déposer les fichiers réels dans src/assets/brand/ :
 *  - noe-cutout.(webp|png)   portrait détouré pour le hero
 *  - noe-portrait.(jpg|webp) portrait pour la page À propos
 *  - logo-mark.(webp|png|svg) logo officiel
 * Tant qu'un fichier manque, un visuel neutre le remplace (aucune image inventée).
 */
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/brand/*.{webp,png,jpg,jpeg,avif,svg}', { eager: true });
const find = (name: string) => {
  const key = Object.keys(files).find((k) => k.split('/').pop()!.replace(/\.[^.]+$/, '') === name);
  return key ? files[key].default : undefined;
};

export const brand = {
  cutout: find('noe-cutout'),
  portrait: find('noe-portrait'),
  logo: find('logo-mark'),
};
