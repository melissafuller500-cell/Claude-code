/** Chemin de l'image Open Graph générée pour une page : /blog/x/ → /og/blog/x.png ; / → /og/index.png */
export const ogKey = (path: string) => {
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (clean === '') return 'index';
  if (clean === 'en') return 'en/index';
  return clean;
};
export const ogFor = (path: string) => `/og/${ogKey(path)}.png`;
