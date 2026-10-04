/**
 * llms.txt généré au build (section 12) : présentation courte et pages de référence,
 * articles compris, pour rester à jour à chaque publication.
 */
import { published, byDateDesc } from '../lib/content';
import { SITE } from '../data/site';
import { PAGES } from '../data/pages';
import { ROUTES, entryUrl } from '../i18n/routes';

const abs = (p: string) => new URL(p, SITE.url).href;

export async function GET() {
  const guides = await published('guides', 'fr');
  const sectors = (await published('secteurs', 'fr')).sort((a, b) => a.data.order - b.data.order);
  const posts = (await published('blog', 'fr')).sort(byDateDesc);
  const postsEn = (await published('blog', 'en')).sort(byDateDesc);
  const tools = (['calculateur', 'test', 'clauses', 'relances'] as const).map((k) => `- [${PAGES[k].fr.title}](${abs(ROUTES[k].fr)})`);
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.tagline.fr} Fondateur : ${SITE.founder.name} (${SITE.founder.education.fr}). Diagnostic gratuit de 45 minutes ; offres à prix affichés en FCFA. Version anglaise sous /en/.`,
    '',
    `Contact : ${SITE.email} · WhatsApp ${SITE.whatsapp.display}. Le contenu est une information générale, pas un conseil juridique. Toutes les pages sont lisibles sans JavaScript.`,
    '',
    '## Pages de référence',
    '',
    `- [Diagnostic gratuit de 45 minutes](${abs(ROUTES.diagnostic.fr)}): déroulé, préparation, formulaire`,
    `- [Offres et prix](${abs(ROUTES.offres.fr)}): audit 50 000 FCFA, système de 150 000 à 250 000 FCFA, suivi 35 000 FCFA par mois`,
    `- [À propos de ${SITE.founder.name}](${abs(ROUTES.apropos.fr)})`,
    '',
    '## Guides',
    '',
    ...guides.map((g) => `- [${g.data.title}](${abs(entryUrl('guides', g.id))}): ${g.data.description}`),
    '',
    '## Outils',
    '',
    ...tools,
    '',
    '## Secteurs',
    '',
    ...sectors.map((s) => `- [${s.data.name}](${abs(entryUrl('secteurs', s.id))})`),
    '',
    '## Articles',
    '',
    ...posts.map((p) => `- [${p.data.title}](${abs(entryUrl('blog', p.id))}): ${p.data.description}`),
    '',
    '## English',
    '',
    `- [Home](${abs('/en/')}) · [Guides](${abs(ROUTES.guides.en)}) · [Tools](${abs(ROUTES.outils.en)}) · [Glossary](${abs(ROUTES.glossaire.en)})`,
    ...postsEn.map((p) => `- [${p.data.title}](${abs(entryUrl('blog', p.id))})`),
    '',
    `- [Glossaire](${abs(ROUTES.glossaire.fr)}) · [Blog](${abs(ROUTES.blog.fr)}) · [Flux RSS](${abs('/rss.xml')}) · [Plan du site](${abs('/sitemap-index.xml')})`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
