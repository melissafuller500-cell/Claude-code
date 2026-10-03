/**
 * Collections de contenu, validées au build (section 8.1). Le build échoue si un champ obligatoire
 * manque, si `answer` sort de 40 à 60 mots, si une description sort de 150 à 160 caractères,
 * ou si une source n'a pas d'URL valide.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const answer = z
  .string()
  .refine((s) => words(s) >= 40 && words(s) <= 60, { message: '`answer` doit compter de 40 à 60 mots.' });
const description = z
  .string()
  .refine((s) => s.length >= 150 && s.length <= 160, { message: '`description` doit compter de 150 à 160 caractères.' });
const title = z.string().min(5).max(60);
const source = z.object({ title: z.string().min(3), url: z.url() });
const lang = z.enum(['fr', 'en']);
const tool = z.enum(['calculateur', 'test', 'clauses', 'relances']);

const common = {
  title,
  description,
  lang,
  translationKey: z.string().min(2),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  draft: z.boolean().default(false),
};

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z
    .object({
      ...common,
      answer,
      format: z.enum(['qr', 'fond']),
      category: z.enum(['contrats', 'suivi', 'relances', 'clients-publics', 'ohada', 'tresorerie']),
      tags: z.array(z.string()).default([]),
      sources: z.array(source).default([]),
      /** Maillage (section 10) : au moins un outil ou un guide. */
      tool: tool.optional(),
      guide: z.string().optional(),
    })
    .refine((d) => Boolean(d.tool || d.guide), { message: 'Un article doit lier au moins un outil (`tool`) ou un guide (`guide`).' }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    ...common,
    answer,
    sources: z.array(source).min(1),
    tools: z.array(tool).min(1),
    glossary: z.array(z.string()).default([]),
    /** Démonstration interactive affichée après le texte (ex. balance âgée). */
    demo: z.enum(['balance-agee']).optional(),
  }),
});

const secteurs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/secteurs' }),
  schema: z.object({
    ...common,
    name: z.string(),
    answer,
    order: z.number(),
    tools: z.array(tool).min(1),
  }),
});

const glossaire = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/glossaire' }),
  schema: z.object({
    ...common,
    term: z.string(),
    /** Définition en une phrase (section 11). */
    definition: z.string().refine((s) => (s.match(/[.!?](\s|$)/g) || []).length === 1, { message: '`definition` : une seule phrase.' }),
    aliases: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, guides, secteurs, glossaire };
