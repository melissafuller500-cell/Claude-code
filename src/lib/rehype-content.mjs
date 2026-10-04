/**
 * Plugins rehype maison (aucune dépendance) appliqués au Markdown des collections :
 *  1. Blocs ```modele → encadré « Modèle à copier » avec bouton Copier.
 *  2. Première occurrence de chaque terme du glossaire → lien vers sa page (section 10).
 *  3. Tableaux enveloppés pour défiler horizontalement sur mobile.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src/content/glossaire');
const BASE = { fr: '/glossaire/', en: '/en/glossary/' };
const WA = '237653400504';
const MAIL = 'contact@noetechgrowth.com';
const SKIP = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'figure', 'button', 'th', 'aside']);

function readFrontmatter(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) {
      try { v = JSON.parse(v); } catch { v = []; }
    } else v = v.replace(/^["']|["']$/g, '');
    out[kv[1]] = v;
  }
  return out;
}

let cache;
function glossary() {
  if (cache) return cache;
  cache = { fr: [], en: [] };
  for (const lang of ['fr', 'en']) {
    const dir = path.join(ROOT, lang);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const fm = readFrontmatter(path.join(dir, f));
      if (fm.draft === 'true') continue;
      const words = [fm.term, ...(Array.isArray(fm.aliases) ? fm.aliases : [])].filter(Boolean);
      cache[lang].push({ url: `${BASE[lang]}${f.replace(/\.md$/, '')}/`, words });
    }
  }
  return cache;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const h = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const txt = (value) => ({ type: 'text', value });
const textOf = (n) => (n.type === 'text' ? n.value : (n.children || []).map(textOf).join(''));

function infoFromFile(file) {
  const p = (file?.path || file?.history?.[0] || '').replace(/\\/g, '/');
  const m = p.match(/\/content\/(blog|guides|secteurs|glossaire)\/(fr|en)\//);
  return m ? { collection: m[1], lang: m[2], self: p.split('/').pop().replace(/\.md$/, '') } : null;
}

export function rehypeContent() {
  return (tree, file) => {
    const info = infoFromFile(file);
    const lang = info?.lang ?? 'fr';
    const L = lang === 'en' ? { tpl: 'Template to copy', copy: 'Copy' } : { tpl: 'Modèle à copier', copy: 'Copier' };

    // 4 : encadré d'appel au diagnostic au milieu du texte, à la place d'un paragraphe « [[cta]] »
    const C = lang === 'en'
      ? { title: 'What are late payments costing you?', text: 'In 45 minutes we look at your actual payment times and one standard contract. You leave with a figure. The diagnostic is free.', btn: 'Book the free 45-minute diagnostic', diag: '/en/diagnostic/#formulaire', wa: 'Message on WhatsApp', mail: 'Send an email', waMsg: 'Hello Noé, I’d like to book the free 45-min diagnostic.', subj: 'Free 45-min diagnostic' }
      : { title: 'Combien vous coûtent vos retards de paiement ?', text: 'En 45 minutes, on regarde vos délais réels et un contrat type. Vous repartez avec une estimation chiffrée. Le diagnostic est gratuit.', btn: 'Réserver le diagnostic gratuit de 45 minutes', diag: '/diagnostic/#formulaire', wa: 'Écrire sur WhatsApp', mail: 'Envoyer un e-mail', waMsg: 'Bonjour Noé, je souhaite réserver le diagnostic gratuit de 45 min.', subj: 'Diagnostic gratuit de 45 min' };
    const ctaBox = () => h('aside', { className: ['ctabox', 'ctabox-md'], ariaLabel: C.title }, [
      h('p', { className: ['h'] }, [txt(C.title)]),
      h('p', { className: ['muted'] }, [txt(C.text)]),
      h('p', { className: ['ctas'] }, [
        h('a', { className: ['btn'], href: C.diag, dataTrack: 'cta_click', dataSrc: 'content-mid' }, [txt(C.btn)]),
        h('a', { className: ['btn', 'ghost', 'sm'], href: `https://wa.me/${WA}?text=${encodeURIComponent(C.waMsg)}`, target: '_blank', rel: 'noopener', dataTrack: 'whatsapp_click', dataSrc: 'content-mid' }, [txt(C.wa)]),
        h('a', { className: ['btn', 'ghost', 'sm'], href: `mailto:${MAIL}?subject=${encodeURIComponent(C.subj)}`, dataTrack: 'email_click', dataSrc: 'content-mid' }, [txt(C.mail)]),
      ]),
    ]);
    const walkCta = (node) => {
      if (!node.children) return;
      node.children = node.children.map((c) => (c.type === 'element' && c.tagName === 'p' && textOf(c).trim() === '[[cta]]' ? ctaBox() : (walkCta(c), c)));
    };
    walkCta(tree);

    // 1 + 3 : modèles et tableaux
    let n = 0;
    const walkBlocks = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === 'element' && child.tagName === 'pre') {
          const code = child.children?.[0];
          const cls = code?.properties?.className || [];
          if (cls.includes('language-modele')) {
            const id = `tpl-${++n}`;
            return h('figure', { className: ['tpl'] }, [
              h('figcaption', {}, [h('span', {}, [txt(L.tpl)]), h('button', { type: 'button', className: ['copy'], dataCopy: `#${id}`, dataTrack: 'template_copy' }, [txt(L.copy)])]),
              h('pre', { id }, [txt(textOf(code).replace(/\n$/, ''))]),
            ]);
          }
        }
        if (child.type === 'element' && child.tagName === 'table') {
          return h('div', { className: ['tbl-wrap'], tabIndex: 0, role: 'region', ariaLabel: lang === 'en' ? 'Table' : 'Tableau' }, [child]);
        }
        walkBlocks(child);
        return child;
      });
    };
    walkBlocks(tree);

    // 2 : glossaire (articles, guides, secteurs ; jamais sur sa propre page)
    if (!info || info.collection === 'glossaire') return;
    const pending = glossary()[lang].filter((t) => !t.url.endsWith(`/${info.self}/`));
    if (!pending.length) return;
    const used = new Set();
    const link = (node) => {
      if (!node.children || (node.type === 'element' && SKIP.has(node.tagName))) return;
      const out = [];
      for (const child of node.children) {
        if (child.type !== 'text') { link(child); out.push(child); continue; }
        let rest = child.value;
        for (;;) {
          const left = pending.filter((t) => !used.has(t.url));
          if (!left.length) break;
          const alts = left.flatMap((t) => t.words.map((w) => ({ w, t }))).sort((a, b) => b.w.length - a.w.length);
          const re = new RegExp(`(?<![\\p{L}\\p{N}])(${alts.map((a) => esc(a.w)).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
          const m = rest.match(re);
          if (!m) break;
          const hit = alts.find((a) => a.w.toLowerCase() === m[1].toLowerCase());
          used.add(hit.t.url);
          if (m.index) out.push(txt(rest.slice(0, m.index)));
          out.push(h('a', { href: hit.t.url, className: ['gloss'] }, [txt(m[1])]));
          rest = rest.slice(m.index + m[1].length);
        }
        if (rest) out.push(txt(rest));
      }
      node.children = out;
    };
    link(tree);
  };
}
