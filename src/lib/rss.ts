import rss from '@astrojs/rss';
import { published, byDateDesc } from './content';
import { SITE } from '../data/site';
import { entryUrl, type Lang } from '../i18n/routes';

export async function feed(lang: Lang, site: URL | undefined) {
  const posts = (await published('blog', lang)).sort(byDateDesc);
  return rss({
    title: lang === 'en' ? `${SITE.name} · Blog` : `${SITE.name} · Blog`,
    description: SITE.tagline[lang],
    site: site ?? SITE.url,
    customData: `<language>${lang === 'en' ? 'en' : 'fr'}</language>`,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.answer,
      pubDate: p.data.pubDate,
      link: entryUrl('blog', p.id),
      categories: [p.data.category, ...p.data.tags],
    })),
  });
}
