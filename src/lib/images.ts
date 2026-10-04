import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

const sets = {
  products: import.meta.glob<{ default: ImageMetadata }>('/src/assets/products/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
  categories: import.meta.glob<{ default: ImageMetadata }>('/src/assets/categories/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
  blog: import.meta.glob<{ default: ImageMetadata }>('/src/assets/blog/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
  site: import.meta.glob<{ default: ImageMetadata }>('/src/assets/site/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
};
export type ImageSet = keyof typeof sets;
const stem = (p: string) => p.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '').toLowerCase();

/** Find a source image by the CSV path or a bare name: "/images/products/bs-caf-0012.webp" -> bs-caf-0012.* */
export function findImage(set: ImageSet, path: string | undefined): ImageMetadata | undefined {
  if (!path) return undefined;
  const want = stem(path);
  return Object.entries(sets[set]).find(([f]) => stem(f) === want)?.[1].default;
}

/** Absolute URL of a 1200px WebP for structured data and feeds, or null. */
export async function imageUrl(set: ImageSet, path: string | undefined, site: URL): Promise<string | null> {
  const img = findImage(set, path);
  if (!img) return null;
  const out = await getImage({ src: img, width: Math.min(1200, img.width), format: 'webp' });
  return new URL(out.src, site).href;
}
