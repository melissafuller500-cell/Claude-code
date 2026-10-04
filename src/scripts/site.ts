// Runs on every page. Small, dependency-free behavior:
// header/mobile cart totals, vehicle bar and fitment filtering, the price
// calculator on cards and product pages, add-to-cart feedback, mobile menu.
import { quoteOrder, tierIndex, unitPrice, nextTierNudge } from '../../lib/pricing.mjs';
import {
  getCart, addToCart, getVehicle, setVehicle, vehicleLabel, fitsVehicle, loadCatalogData, usd,
} from './store';
import { track } from './analytics';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Cart totals (header, mobile bar) ─────────────────────────
async function renderCartTotals() {
  const cart = getCart();
  let subtotal = 0;
  let count = 0;
  let threshold = 250;
  if (cart.length) {
    try {
      const data = await loadCatalogData();
      const q = quoteOrder(cart, data.items, data.shipping);
      subtotal = q.subtotal;
      threshold = data.shipping.free_shipping_threshold;
      count = q.lines.reduce((s, l) => s + l.qty, 0);
    } catch {
      return;
    }
  }
  const left = Math.max(0, Math.round((threshold - subtotal) * 100) / 100);
  document.querySelectorAll<HTMLElement>('[data-cart-total]').forEach((el) => (el.textContent = usd(subtotal)));
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-cart-link]').forEach((el) =>
    el.setAttribute('aria-label', `Cart, ${count} item${count === 1 ? '' : 's'}, total ${usd(subtotal)}`),
  );
  document.querySelectorAll<HTMLElement>('[data-free-ship-msg]').forEach((el) => {
    el.innerHTML = left > 0
      ? `Add <span class="tag-mono text-white">${usd(left)}</span> more for free shipping.`
      : '<span class="font-semibold text-[#5fd08f]">Free shipping unlocked.</span>';
  });
  document.querySelectorAll<HTMLElement>('[data-free-ship-bar]').forEach((el) => {
    el.style.width = `${Math.min(100, (subtotal / threshold) * 100)}%`;
    el.classList.toggle('bg-ok-green', left === 0 && subtotal > 0);
    el.classList.toggle('bg-line-yellow', !(left === 0 && subtotal > 0));
    el.parentElement?.setAttribute('aria-valuenow', String(subtotal));
  });
}

// ── Vehicle bar + filtering ──────────────────────────────────
let showAll = false;
function renderVehicle() {
  const v = getVehicle();
  const vGlobal = v;
  document.querySelectorAll<HTMLElement>('[data-vehicle-bar]').forEach((bar) => {
    bar.hidden = !v;
    const label = bar.querySelector('[data-vehicle-label]');
    if (label && v) label.textContent = vehicleLabel(v);
  });
  document.querySelectorAll<HTMLElement>('[data-vehicle-button-label]').forEach((el) => {
    el.textContent = v ? vehicleLabel(v) : el.dataset.default ?? 'Select vehicle';
  });

  document.querySelectorAll<HTMLElement>('[data-vehicle-filter]').forEach((scope) => {
    // On a vehicle page, a saved vehicle of a different model does not filter.
    const v = vGlobal && (!scope.dataset.make || (scope.dataset.make === vGlobal.make && scope.dataset.model === vGlobal.model)) ? vGlobal : null;
    const inStockOnly = scope.querySelector<HTMLInputElement>('[data-filter-stock]')?.checked ?? false;
    const maxPrice = Number(scope.querySelector<HTMLSelectElement>('[data-filter-price]')?.value || 0);
    const useVehicle = !!v && !showAll;
    let shown = 0;
    let hiddenByVehicle = 0;
    scope.querySelectorAll<HTMLElement>('[data-fitment]').forEach((card) => {
      const fits = v ? fitsVehicle(card.dataset.fitment, v) : false;
      const badge = card.querySelector<HTMLElement>('[data-fit-badge]');
      if (badge) badge.hidden = !(fits && card.dataset.fitment !== 'U');
      card.dataset.fits = String(fits);
      let visible = true;
      if (useVehicle && !fits) {
        visible = false;
        hiddenByVehicle++;
      }
      if (inStockOnly && card.dataset.instock !== 'true') visible = false;
      if (maxPrice && Number(card.dataset.price) > maxPrice) visible = false;
      card.hidden = !visible;
      if (visible) shown++;
    });
    scope.querySelectorAll<HTMLElement>('[data-group]').forEach((g) => {
      g.hidden = !g.querySelector('[data-fitment]:not([hidden])');
    });
    const note = scope.querySelector<HTMLElement>('[data-filter-note]');
    if (note) {
      note.hidden = !v;
      if (v) {
        note.querySelector('[data-filter-note-text]')!.textContent = showAll
          ? `Showing all parts. Parts that fit your ${vehicleLabel(v)} are marked.`
          : `Showing ${shown} part${shown === 1 ? '' : 's'} that fit your ${vehicleLabel(v)}${hiddenByVehicle ? `. ${hiddenByVehicle} other part${hiddenByVehicle === 1 ? '' : 's'} hidden.` : '.'}`;
        const t = note.querySelector<HTMLButtonElement>('[data-filter-toggle]');
        if (t) t.textContent = showAll ? 'Show only parts that fit' : 'Show all parts';
      }
    }
    const empty = scope.querySelector<HTMLElement>('[data-filter-empty]');
    if (empty) empty.hidden = shown > 0 || !scope.querySelector('[data-fitment]');
    const count = scope.querySelector<HTMLElement>('[data-filter-count]');
    if (count) count.textContent = `${shown} product${shown === 1 ? '' : 's'}`;
  });

  // Product page: does this part fit the chosen vehicle?
  document.querySelectorAll<HTMLElement>('[data-fit-check]').forEach((el) => {
    if (!v) {
      el.hidden = true;
      return;
    }
    const fits = fitsVehicle(el.dataset.fitCheck, v);
    el.hidden = false;
    el.className = `mt-3 flex items-center gap-2 rounded px-3 py-2 text-sm font-medium ${fits ? 'bg-[#e7f5ec] text-ok-green' : 'bg-[#fdecea] text-alert-red'}`;
    el.textContent = fits ? `Fits your ${vehicleLabel(v)}` : `Not listed for your ${vehicleLabel(v)}. Check the fitment table below.`;
  });
}

// ── Price calculator ─────────────────────────────────────────
function animateNumber(el: HTMLElement, from: number, to: number) {
  if (reduceMotion() || from === to) {
    el.textContent = usd(to);
    return;
  }
  const start = performance.now();
  const dur = 450;
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = usd(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  el.animate?.([{ transform: 'translateY(-2px)', color: '#1E8E4E' }, { transform: 'none' }], { duration: 600 });
}

function bindBuyBoxes() {
  document.querySelectorAll<HTMLElement>('[data-buy]').forEach((box) => {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    const prices = JSON.parse(box.dataset.prices!) as { min: number; price: number }[];
    const input = box.querySelector<HTMLInputElement>('[data-qty]')!;
    const unitEl = box.querySelector<HTMLElement>('[data-unit-price]');
    const totalEl = box.querySelector<HTMLElement>('[data-line-total]');
    const nudgeEl = box.querySelector<HTMLElement>('[data-nudge]');
    const errEl = box.querySelector<HTMLElement>('[data-qty-error]');
    const addBtn = box.querySelector<HTMLButtonElement>('[data-add]');
    const cells = [...box.querySelectorAll<HTMLElement>('[data-tier-i]')];
    let lastUnit = unitPrice(prices, 1);

    const valid = (q: number) => Number.isInteger(q) && q >= 1 && q <= 9999;
    const update = () => {
      const q = Number(input.value);
      const ok = valid(q);
      input.setAttribute('aria-invalid', String(!ok));
      if (errEl) {
        errEl.hidden = ok;
        errEl.textContent = ok ? '' : 'Enter a quantity from 1 to 9999.';
      }
      if (addBtn) addBtn.disabled = !ok || box.dataset.instock !== 'true';
      if (!ok) return;
      const i = tierIndex(prices, q);
      cells.forEach((c, ci) => {
        const active = ci === i;
        c.classList.toggle('bg-line-yellow', active);
        c.classList.toggle('bg-surface-0', !active);
        if (active) c.setAttribute('aria-current', 'true');
        else c.removeAttribute('aria-current');
        c.querySelector('[data-tier-min]')?.classList.toggle('text-ink-900', active);
        c.querySelector('[data-tier-min]')?.classList.toggle('text-text-600', !active);
      });
      const unit = prices[i].price;
      if (unitEl) {
        if (unit !== lastUnit) animateNumber(unitEl, lastUnit, unit);
        else unitEl.textContent = usd(unit);
      }
      lastUnit = unit;
      if (totalEl) totalEl.textContent = usd(Math.round(unit * 100 * q) / 100);
      if (nudgeEl) {
        const n = nextTierNudge(prices, q);
        nudgeEl.hidden = !n;
        if (n) nudgeEl.textContent = `Add ${n.n} more to pay ${usd(n.price)} each.`;
      }
    };
    const setQ = (q: number) => {
      input.value = String(Math.max(1, Math.min(9999, q)));
      update();
    };
    box.querySelector('[data-dec]')?.addEventListener('click', () => setQ((Number(input.value) || 1) - 1));
    box.querySelector('[data-inc]')?.addEventListener('click', () => setQ((Number(input.value) || 0) + 1));
    box.querySelectorAll<HTMLButtonElement>('[data-set-qty]').forEach((b) =>
      b.addEventListener('click', () => setQ(Number(b.dataset.setQty))),
    );
    input.addEventListener('input', update);
    cells.forEach((c) => c.addEventListener('click', () => setQ(prices[Number(c.dataset.tierI)].min)));
    addBtn?.addEventListener('click', () => {
      const q = Number(input.value);
      if (!valid(q) || box.dataset.instock !== 'true') return;
      addToCart(box.dataset.sku!, q);
      track('add_to_cart', { value: unitPrice(prices, q) * q, items: [{ item_id: box.dataset.sku, quantity: q }] });
      const label = addBtn.querySelector('[data-add-label]') ?? addBtn;
      const prev = label.textContent;
      label.textContent = 'Added ✓';
      setTimeout(() => (label.textContent = prev), 1400);
    });
    update();
  });

  // One-tap add buttons (frequently bought together, kits)
  document.querySelectorAll<HTMLButtonElement>('[data-quick-add]').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => {
      const skus = b.dataset.quickAdd!.split(',').filter(Boolean);
      skus.forEach((s) => addToCart(s, 1));
      const prev = b.textContent;
      b.textContent = 'Added ✓';
      setTimeout(() => (b.textContent = prev), 1400);
    });
  });
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer: number | undefined;
function showToast(text: string) {
  const t = document.querySelector<HTMLElement>('[data-toast]');
  if (!t) return;
  t.querySelector('[data-toast-text]')!.textContent = text;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    t.classList.remove('is-visible');
    setTimeout(() => (t.hidden = true), 250);
  }, 3200);
}

// ── Mobile menu ──────────────────────────────────────────────
function bindHeader() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-nav-panel]');
  if (toggle && panel && !toggle.dataset.bound) {
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('hidden', !open);
      toggle.querySelector('.nav-icon-open')?.classList.toggle('hidden', open);
      toggle.querySelector('.nav-icon-close')?.classList.toggle('hidden', !open);
      const label = toggle.querySelector('[data-nav-label]');
      if (label) label.textContent = open ? 'Close menu' : 'Open menu';
    });
  }
  document.querySelectorAll<HTMLElement>('[data-vehicle-open]').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => window.dispatchEvent(new CustomEvent('vehicle:open')));
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-cart-link]').forEach((a) => {
    if (a.dataset.bound) return;
    a.dataset.bound = '1';
    a.addEventListener('click', (e) => {
      // Desktop: slide-over cart. Mobile and the cart page itself: full page.
      if (window.matchMedia('(min-width: 768px)').matches && !location.pathname.startsWith('/cart')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cart:open'));
      }
    });
  });
  document.querySelectorAll<HTMLElement>('[data-vehicle-clear]').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => setVehicle(null));
  });
  document.querySelectorAll<HTMLElement>('[data-filter-toggle]').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => {
      showAll = !showAll;
      renderVehicle();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-filter-stock], [data-filter-price]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('change', renderVehicle);
  });
  document.querySelectorAll<HTMLFormElement>('[data-search-form]').forEach((f) => {
    if (f.dataset.bound) return;
    f.dataset.bound = '1';
    f.addEventListener('submit', (e) => {
      const q = new FormData(f).get('q');
      if (!q || String(q).trim().length < 2) e.preventDefault();
    });
  });
  const view = document.querySelector<HTMLElement>('[data-track-view]');
  if (view && !view.dataset.tracked) {
    view.dataset.tracked = '1';
    track('view_item', { value: Number(view.dataset.price), items: [{ item_id: view.dataset.trackView }] });
  }
}

function init() {
  showAll = false;
  bindHeader();
  bindBuyBoxes();
  renderVehicle();
  renderCartTotals();
}

document.addEventListener('astro:page-load', init);
window.addEventListener('cart:change', renderCartTotals);
window.addEventListener('vehicle:change', () => {
  showAll = false;
  renderVehicle();
});
window.addEventListener('cart:added', (e) => {
  const { qty } = (e as CustomEvent).detail;
  showToast(`Added ${qty} to cart.`);
});
// Another tab changed the cart or vehicle
window.addEventListener('storage', (e) => {
  if (e.key === 'bs-cart') renderCartTotals();
  if (e.key === 'bs-vehicle') renderVehicle();
});
