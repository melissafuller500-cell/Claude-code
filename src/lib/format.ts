import type { Lang } from '../i18n/routes';

export const fmtDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Nombre groupé par milliers : espace fine insécable en français, virgule en anglais. */
export const fmtN = (n: number, lang: Lang = 'fr') =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');

export const fmtF = (n: number, lang: Lang = 'fr') => `${fmtN(n, lang)} FCFA`;
