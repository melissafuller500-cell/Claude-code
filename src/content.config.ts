import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    author: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    category: z.string(),          // category slug, or "all" / "wholesale"
    cover: z.string().optional(),  // file name in src/assets/blog/
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
