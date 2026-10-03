#!/usr/bin/env node
/**
 * Crée un article en brouillon avec le frontmatter prérempli.
 *   npm run new:post "Que faire si un client conteste une facture ?"
 *   npm run new:post "How do I chase an invoice?" -- --en --fond --cat=relances
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const title = args.find((a) => !a.startsWith('--'));
if (!title) {
  console.error('Usage : npm run new:post "Titre formulé comme la question du lecteur" [-- --en] [--fond] [--cat=contrats|suivi|relances|clients-publics|ohada|tresorerie]');
  process.exit(1);
}
const lang = args.includes('--en') ? 'en' : 'fr';
const format = args.includes('--fond') ? 'fond' : 'qr';
const cat = (args.find((a) => a.startsWith('--cat=')) || '--cat=relances').slice(6);
const slug = title
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/['’]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .split('-').filter((w) => !['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'a', 'the', 'an', 'si'].includes(w)).join('-')
  .slice(0, 70).replace(/-+$/, '');
const dir = path.join('src/content/blog', lang);
const file = path.join(dir, `${slug}.md`);
if (fs.existsSync(file)) { console.error(`Existe déjà : ${file}`); process.exit(1); }

// Recherche rapide de doublons (règle éditoriale : pas de sujet déjà traité).
const words = slug.split('-').filter((w) => w.length > 4);
const similar = fs.readdirSync(dir).filter((f) => words.filter((w) => f.includes(w)).length >= 2);
if (similar.length) console.warn(`⚠ Sujets proches déjà présents : ${similar.join(', ')}`);
if (title.length > 60) console.warn(`⚠ Titre de ${title.length} caractères : 60 maximum.`);

const today = new Date().toISOString().slice(0, 10);
const en = lang === 'en';
const body = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${en ? 'TODO: 150 to 160 characters.' : 'À RÉDIGER : 150 à 160 caractères.'}"
answer: "${en ? 'TODO: a direct, self-contained answer of 40 to 60 words, understandable without the rest of the page.' : 'À RÉDIGER : réponse directe et autonome de 40 à 60 mots, compréhensible sans le reste de la page.'}"
format: "${format}"
category: "${cat}"
tags: []
pubDate: ${today}
lang: "${lang}"
translationKey: "${slug}"
tool: "relances"
# guide: "balance-agee"
sources: []
# sources:
#   - title: "Titre exact de la source, date"
#     url: "https://…"
draft: true
---

${en ? 'Opening paragraph: restate the question and why it matters.' : 'Paragraphe d’ouverture : reformuler la question et dire pourquoi elle compte.'}

## ${en ? 'First sub-question, phrased the way people ask it?' : 'Première sous-question, formulée comme on la pose ?'}

${en ? 'Text.' : 'Texte.'}

[[cta]]

## ${en ? 'Worked example' : 'Exemple chiffré'}

*${en ? 'Fictional example.' : 'Exemple fictif.'}* ${en ? 'Figures in FCFA.' : 'Chiffres en FCFA.'}

\`\`\`modele
${en ? 'Template to copy (clause, message, table line), if the topic lends itself to one.' : 'Modèle à copier (clause, message, ligne de tableau), si le sujet s’y prête.'}
\`\`\`
`;
fs.writeFileSync(file, body);
console.log(`✓ ${file} créé (brouillon). Format ${format === 'qr' ? '300 à 500 mots' : '1 000 à 1 800 mots'}.`);
