/**
 * Images Open Graph 1200 × 630 générées au build, une par page (section 10) :
 * titre de la page sur fond de marque. Satori produit un SVG (texte vectorisé), sharp le convertit en PNG.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { PAGES } from '../../data/pages';
import { CATEGORIES } from '../../data/editorial';
import { published } from '../../lib/content';
import { ogKey } from '../../lib/og';
import { ROUTES, LANGS, entryUrl, langOf, type Lang, type RouteKey } from '../../i18n/routes';

type Item = { title: string; eyebrow: string; lang: Lang; portrait?: boolean };

export const getStaticPaths: GetStaticPaths = async () => {
  const items: { key: string; props: Item }[] = [];
  const eyebrow = (lang: Lang, s: string) => `${s}`;
  for (const k of Object.keys(ROUTES) as RouteKey[]) {
    for (const lang of LANGS) {
      const m = PAGES[k][lang];
      items.push({ key: ogKey(ROUTES[k][lang]), props: { title: m.og ?? m.title, eyebrow: eyebrow(lang, k === 'home' ? (lang === 'en' ? 'B2B SMEs · Cameroon' : 'PME B2B · Cameroun') : m.crumb), lang, portrait: k === 'home' || k === 'apropos' || k === 'diagnostic' } });
    }
  }
  const label = {
    blog: { fr: 'Blog', en: 'Blog' },
    guides: { fr: 'Guide', en: 'Guide' },
    secteurs: { fr: 'Secteur', en: 'Sector' },
    glossaire: { fr: 'Glossaire', en: 'Glossary' },
  } as const;
  for (const c of ['blog', 'guides', 'secteurs', 'glossaire'] as const) {
    for (const e of await published(c)) {
      const lang = langOf(e.id);
      const d = e.data as { title: string; term?: string; category?: keyof typeof CATEGORIES };
      const eb = c === 'blog' && d.category ? CATEGORIES[d.category][lang].name : label[c][lang];
      items.push({ key: ogKey(entryUrl(c, e.id)), props: { title: c === 'glossaire' ? d.term! : d.title, eyebrow: eb, lang } });
    }
  }
  return items.map(({ key, props }) => ({ params: { slug: key }, props }));
};

const font = (name: string) => fs.readFileSync(path.resolve('src/og', name));
let logo: string | undefined;
let face: string | undefined;
let fonts: { name: string; data: Buffer; weight: 500 | 800; style: 'normal' }[] | undefined;

export const GET: APIRoute = async ({ props }) => {
  const { title, eyebrow, lang, portrait } = props as Item;
  fonts ??= [
    { name: 'Archivo', data: font('archivo-800.ttf'), weight: 800, style: 'normal' },
    { name: 'Archivo', data: font('archivo-500.ttf'), weight: 500, style: 'normal' },
  ];
  const size = portrait ? (title.length > 30 ? 52 : 72) : title.length > 70 ? 54 : title.length > 45 ? 64 : 76;
  const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });
  logo ??= `data:image/png;base64,${fs.readFileSync(path.resolve('src/og/logo-mark.png')).toString('base64')}`;
  face ??= `data:image/png;base64,${fs.readFileSync(path.resolve('src/og/noe-cutout.png')).toString('base64')}`;
  const leaf = { type: 'img', props: { src: logo, height: 96, width: Math.round(96 * 0.8), style: { objectFit: 'contain' } } };
  const tree = el(
    'div',
    { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: 'radial-gradient(circle at 85% 20%, #1B4128 0%, #06110B 60%)', color: '#EDF3E6', fontFamily: 'Archivo' },
    [
      el('div', { display: 'flex', alignItems: 'center', gap: 18 }, [
        leaf,
        el('div', { display: 'flex', flexDirection: 'column' }, [
          el('div', { fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }, 'NOÉ'),
          el('div', { fontSize: 20, fontWeight: 500, color: '#A3D65C', letterSpacing: 4 }, 'TECH GROWTH'),
        ]),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', gap: 22 }, [
        el('div', { fontSize: 26, fontWeight: 500, color: '#A3D65C', letterSpacing: 3, textTransform: 'uppercase' }, eyebrow),
        el('div', { fontSize: size, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 1040 }, title),
      ]),
      el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, fontWeight: 500, color: '#A9BCAA' }, [
        el('div', {}, 'noetechgrowth.com'),
        el('div', { display: 'flex', background: '#A3D65C', color: '#0B1A0F', padding: '12px 22px', borderRadius: 999, fontWeight: 800 }, lang === 'en' ? 'Free 45-min diagnostic' : 'Diagnostic gratuit de 45 min'),
      ]),
    ],
  );
  if (portrait) {
    const t = tree as { props: { children: unknown[]; style: Record<string, unknown> } };
    t.props.style.position = 'relative';
    t.props.children.push({ type: 'img', props: { src: face, width: 430, height: 575, style: { position: 'absolute', right: 40, bottom: 0 } } });
    // Le titre laisse la place au portrait.
    (t.props.children[1] as { props: { children: { props: { style: Record<string, unknown> } }[] } }).props.children[1].props.style.maxWidth = 640;
    // Pied : domaine et pastille côte à côte, à gauche du portrait.
    const foot = t.props.children[2] as { props: { style: Record<string, unknown> } };
    foot.props.style.justifyContent = 'flex-start';
    foot.props.style.gap = 28;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await satori(tree as any, { width: 1200, height: 630, fonts });
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: portrait ? 95 : 90, colours: 256 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
