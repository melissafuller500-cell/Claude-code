import { PAGES } from '../data/pages';
import { r, type Lang, type RouteKey } from '../i18n/routes';
import type { Crumb } from '../components/Breadcrumbs.astro';

/** Fil d'Ariane à partir de clés de routes, plus d'éventuelles entrées finales libres. */
export function crumbs(lang: Lang, keys: RouteKey[], extra: Crumb[] = []): Crumb[] {
  return [
    { name: PAGES.home[lang].crumb, url: r('home', lang) },
    ...keys.map((k) => ({ name: PAGES[k][lang].crumb, url: r(k, lang) })),
    ...extra,
  ];
}
