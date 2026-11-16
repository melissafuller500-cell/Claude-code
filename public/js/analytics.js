/* Loads Google Analytics 4, Google Tag Manager and the Meta Pixel when their IDs are set in Admin → Settings. */
(function () {
  'use strict';
  var el = document.currentScript, d = el && el.dataset;
  if (!d) return;
  if (d.ga4) {
    var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(d.ga4); document.head.appendChild(g);
    window.gtag('config', d.ga4, { anonymize_ip: true });
  }
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) { window.gtag = function () { window.dataLayer.push(arguments); }; window.gtag('js', new Date()); }
  if (d.gtm) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var t = document.createElement('script'); t.async = true; t.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(d.gtm); document.head.appendChild(t);
  }
  if (d.pixel) {
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    var f = document.createElement('script'); f.async = true; f.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(f);
    window.fbq('init', d.pixel); window.fbq('track', 'PageView');
  }
})();
