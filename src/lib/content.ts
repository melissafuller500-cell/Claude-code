import { getCollection, type CollectionEntry } from 'astro:content';
import { COLLECTION_BASE, entryUrl, langOf, slugOf, type CollectionName, type Lang } from '../i18n/routes';

type AnyEntry = CollectionEntry<'blog'> | CollectionEntry<'guides'> | CollectionEntry<'secteurs'> | CollectionEntry<'glossaire'>;

/** Brouillons visibles en développement seulement : ni construits ni listés en production. */
export const isVisible = (e: { data: { draft?: boolean } }) => import.meta.env.DEV || !e.data.draft;

export async function published<C extends CollectionName>(collection: C, lang?: Lang) {
  const all = (await getCollection(collection, (e: AnyEntry) => isVisible(e))) as CollectionEntry<C>[];
  return lang ? all.filter((e) => langOf(e.id) === lang) : all;
}

/** URL de l'entrée et de sa traduction (reliées par translationKey). */
export async function alternatesFor(collection: CollectionName, entry: AnyEntry) {
  const all = await published(collection);
  const out: { fr?: string; en?: string } = {};
  for (const e of all) if ((e.data as { translationKey: string }).translationKey === entry.data.translationKey) out[langOf(e.id)] = entryUrl(collection, e.id);
  return out;
}

export const findByKey = <C extends CollectionName>(list: CollectionEntry<C>[], key: string, lang: Lang) =>
  list.find((e) => (e.data as { translationKey: string }).translationKey === key && langOf(e.id) === lang);

export const readingTime = (body = '') => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

export const byDateDesc = (a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

export { entryUrl, slugOf, langOf, COLLECTION_BASE };
