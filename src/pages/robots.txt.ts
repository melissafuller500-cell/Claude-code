import type { APIRoute } from 'astro';

const AI_BOTS = ['GPTBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'OAI-SearchBot', 'ChatGPT-User'];
const PRIVATE = ['/api/', '/cart/', '/checkout/', '/quick-order/', '/search/'];

export const GET: APIRoute = ({ site }) => {
  const rules = (agent: string) => [`User-agent: ${agent}`, 'Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`), ''].join('\n');
  const body = [rules('*'), ...AI_BOTS.map(rules), `Sitemap: ${new URL('/sitemap-index.xml', site).href}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
