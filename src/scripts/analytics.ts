// E-commerce events. No-ops until the visitor accepts cookies and an ID is configured.
type Params = Record<string, unknown>;
declare global {
  interface Window { gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void; dataLayer?: unknown[] }
}
const META: Record<string, string> = {
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
};
export function track(event: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase', params: Params = {}) {
  try {
    window.gtag?.('event', event, { currency: 'USD', ...params });
    if (window.fbq && META[event]) window.fbq('track', META[event], { currency: 'USD', value: params.value });
  } catch {
    /* analytics must never break the page */
  }
}
