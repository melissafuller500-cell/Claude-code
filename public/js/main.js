/* Invest n Returns — shared interactions (public site, auth, app). No dependencies. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var lang = root.lang === 'fr' ? 'fr' : 'en';
  var csrf = ($('meta[name="csrf-token"]') || {}).content || '';
  var T = function (en, fr) { return lang === 'fr' ? fr : en; };

  function num(v) { var n = parseFloat(String(v || '').replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
  function fmt(n, dec) {
    return n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }).replace(/[  ]/g, ' ');
  }
  function usd(n, dec) { var s = fmt(Math.abs(n), dec); return (n < 0 ? '−' : '') + (lang === 'fr' ? s + ' $' : '$' + s); }
  window.INR = { fmt: fmt, usd: usd, lang: lang, csrf: csrf, T: T };

  // ---------- toast ----------
  function toast(msg) {
    var z = $('.toast-zone'); if (!z) return;
    var el = d.createElement('div'); el.className = 'toast'; el.textContent = msg; z.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 2800);
  }
  window.INR.toast = toast;

  // ---------- theme ----------
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme');
      if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('inr-theme', next); } catch (e) { /* ignore */ }
    });
  });

  // Remember language choice for app pages.
  $$('.lang a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () { d.cookie = 'inr_lang=' + a.getAttribute('data-lang') + ';path=/;max-age=31536000;samesite=lax'; });
  });

  // ---------- header: scrolled state + progress ----------
  var header = $('[data-header]'), prog = $('[data-progress]');
  if (header) {
    var onScroll = function () {
      var y = window.scrollY;
      header.classList.toggle('scrolled', y > 8);
      if (prog) { var h = d.documentElement.scrollHeight - window.innerHeight; prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')'; }
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // ---------- mobile drawer ----------
  var drawer = $('#drawer'), openBtn = $('[data-menu-open]');
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open'); openBtn && openBtn.setAttribute('aria-expanded', 'false');
    setTimeout(function () { drawer.hidden = true; }, 300); d.body.style.overflow = '';
    openBtn && openBtn.focus();
  }
  if (drawer && openBtn) {
    openBtn.addEventListener('click', function () {
      drawer.hidden = false; requestAnimationFrame(function () { drawer.classList.add('open'); });
      openBtn.setAttribute('aria-expanded', 'true'); d.body.style.overflow = 'hidden';
      var first = $('a,button', drawer); first && first.focus();
    });
    $$('[data-menu-close]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawer); });
    drawer.addEventListener('click', function (e) { if (e.target === drawer) closeDrawer(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });
  }

  // ---------- counters ----------
  function animateCount(el) {
    if (el.dataset.done) return; el.dataset.done = '1';
    var target = parseFloat(el.dataset.count) || 0, dec = parseInt(el.dataset.dec || '0', 10);
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', compact = el.hasAttribute('data-compact');
    var show = function (v) {
      var s;
      if (compact && v >= 1e6) s = fmt(v / 1e6, 1) + 'M';
      else if (compact && v >= 1e3) s = fmt(v / 1e3, v >= 1e5 ? 0 : 1) + 'k';
      else s = fmt(v, dec);
      el.textContent = pre + s + suf;
    };
    if (reduced) return show(target);
    var t0 = performance.now(), dur = 1600;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      show(target * e); if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- reveal on scroll ----------
  var revealables = $$('.reveal, .bar, .step, [data-count]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; el.classList.add('in');
        if (el.hasAttribute('data-count')) animateCount(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    // Stagger siblings inside grids.
    $$('.projects, .assets, .steps, .kpis, .feature-grid, .strip, .faq').forEach(function (g) {
      $$(':scope > .reveal', g).forEach(function (c, i) { if (!c.style.getPropertyValue('--d')) c.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms'); });
    });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); if (el.hasAttribute('data-count')) animateCount(el); });
  }

  // ---------- tilt + magnetic ----------
  if (finePointer && !reduced) {
    $$('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.15).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  // ---------- weekly payout simulator (home) ----------
  var simData = $('#sim-data');
  if (simData) {
    var sim; try { sim = JSON.parse(simData.textContent); } catch (e) { sim = null; }
    var sel = $('#p-asset'), amtEl = $('#p-amt'), cta = $('#p-cta');
    if (sim && sim.assets.length && sel) {
      sel.innerHTML = '';
      sim.assets.forEach(function (a, i) {
        var o = d.createElement('option'); o.value = i; o.textContent = (lang === 'fr' ? a.fr : a.en) + ' — ' + a.r + (lang === 'fr' ? ' %/an' : '%/yr'); sel.appendChild(o);
      });
      var t0 = Date.now();
      var draw = function () {
        var p = sim.assets[+sel.value] || sim.assets[0], amt = num(amtEl.value), wk = amt * p.r / 100 / 52;
        $('#p-week').textContent = usd(wk, 2);
        $('#p-rate').textContent = lang === 'fr' ? p.r + ' %' : p.r + '%';
        if (cta) cta.href = sim.base + p.slug + '#reserve';
        var W = 520, H = 150, pad = 4, max = wk * 52 || 1, bw = (W - pad * 2) / 52, out = '', pts = [];
        for (var y = 1; y <= 3; y++) { var gy = H - (H - 10) * y / 3; out += '<line x1="0" x2="' + W + '" y1="' + gy + '" y2="' + gy + '" stroke="rgba(255,255,255,.08)"/>'; }
        for (var i = 0; i < 52; i++) {
          var h = (H - 10) * (wk * (i + 1)) / max, x = pad + i * bw;
          out += '<rect x="' + (x + 1).toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="rgba(214,165,72,' + (0.25 + 0.6 * i / 51).toFixed(2) + ')"><animate attributeName="height" from="0" to="' + h.toFixed(1) + '" dur="' + (reduced ? '0.01' : '0.6') + 's" begin="' + (i * 0.012).toFixed(3) + 's" fill="freeze"/><animate attributeName="y" from="' + H + '" to="' + (H - h).toFixed(1) + '" dur="' + (reduced ? '0.01' : '0.6') + 's" begin="' + (i * 0.012).toFixed(3) + 's" fill="freeze"/></rect>';
          pts.push((x + bw / 2).toFixed(1) + ',' + (H - h).toFixed(1));
        }
        out += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#7fd3a4" stroke-width="2"/>';
        var last = pts[51].split(','); out += '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="#7fd3a4"/>';
        $('#p-chart').innerHTML = out;
        $('#p-total').textContent = T('52-week total ', 'Total 52 sem. ') + usd(wk * 52, 0);
      };
      var tick = function () {
        var p = sim.assets[+sel.value] || sim.assets[0], perSec = num(amtEl.value) * p.r / 100 / (365 * 24 * 3600);
        $('#p-tick').textContent = usd(perSec * (Date.now() - t0) / 1000, 6);
      };
      draw(); tick(); setInterval(tick, 100);
      sel.addEventListener('change', function () { t0 = Date.now(); draw(); });
      amtEl.addEventListener('input', function () { t0 = Date.now(); draw(); });
    }
  }

  // ---------- target return calculator ----------
  $$('[data-calc]').forEach(function (box) {
    var BASE = { 12: 20, 24: 30, 36: 40, 48: 50, 60: 56 }, RATE = { USD: 1, USDT: 1, EUR: 1.08, XAF: 1 / 600 };
    var TIERS = [[50000, 4, 'Platinum'], [10000, 2, 'Gold'], [1000, 1, 'Silver'], [0, 0, 'Standard']];
    var term = 36, amtI = $('#c-amt', box), curS = $('#c-cur', box);
    function calc() {
      var amt = num(amtI.value), cur = curS.value, u = amt * RATE[cur];
      var tier = TIERS.filter(function (t) { return u >= t[0]; })[0];
      var pct = Math.min(60, BASE[term] + tier[1]), yrs = term / 12, yr = (Math.pow(1 + pct / 100, 1 / yrs) - 1) * 100;
      $('#c-pct', box).textContent = lang === 'fr' ? pct + ' %' : pct + '%';
      $('#c-gain', box).textContent = '+' + fmt(amt * pct / 100) + ' ' + cur;
      $('#c-yr', box).textContent = '≈ ' + fmt(yr, 1) + T('% a year', ' % par an');
      $('#c-tier', box).textContent = T('Tier: ', 'Palier ') + tier[2] + (tier[1] ? T(' · +' + tier[1] + ' pts from lower fees', ' · +' + tier[1] + ' pts grâce aux frais réduits') : T(' · from 1,000 USD: +1 pt', ' · dès 1 000 USD : +1 pt'));
      $$('.ladder i', box).forEach(function (i, k) { i.className = (k <= [12, 24, 36, 48, 60].indexOf(term)) ? 'on' : ''; });
    }
    $$('.terms button', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        term = +btn.dataset.m;
        $$('.terms button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
        calc();
      });
    });
    amtI.addEventListener('input', calc); curS.addEventListener('change', calc); calc();
  });

  // ---------- marketplace: instant search + auto-apply filters ----------
  var lf = $('[data-live-filter]');
  if (lf) {
    var grid = $('[data-grid]'), q = $('#f-q', lf), countEl = $('[data-result-count]'), emptyEl = $('[data-empty]');
    $$('select', lf).forEach(function (s) { s.addEventListener('change', function () { lf.submit(); }); });
    if (grid && q) {
      q.addEventListener('input', function () {
        var term = q.value.trim().toLowerCase(), n = 0;
        $$('.proj', grid).forEach(function (c) { var ok = !term || c.dataset.search.indexOf(term) > -1; c.hidden = !ok; if (ok) n++; });
        if (countEl) countEl.textContent = n;
        if (emptyEl) emptyEl.hidden = n > 0;
      });
    }
  }

  // ---------- reserve form live estimate ----------
  $$('[data-reserve]').forEach(function (f) {
    var rate = parseFloat(f.dataset.rate) || 0, min = parseFloat(f.dataset.min) || 0, max = parseFloat(f.dataset.max) || Infinity;
    var input = $('input[name="amount"]', f), wk = $('#r-week', f), yr = $('#r-year', f);
    function upd() {
      var a = num(input.value);
      if (wk) wk.textContent = usd(a * rate / 100 / 52, 2);
      if (yr) yr.textContent = usd(a * rate / 100, 0);
      input.closest('.amt-input').style.borderColor = a && (a < min || a > max) ? 'var(--warn)' : '';
    }
    $$('[data-amt]', f).forEach(function (b) { b.addEventListener('click', function () { input.value = b.dataset.amt; upd(); input.focus(); }); });
    input.addEventListener('input', upd); upd();
    f.addEventListener('submit', function (e) {
      var a = num(input.value);
      if (a < min) { e.preventDefault(); toast(T('Minimum is ', 'Le minimum est de ') + usd(min, 0)); input.focus(); }
      else if (a > max) { e.preventDefault(); toast(T('Only ', 'Seulement ') + usd(max, 0) + T(' left on this project', ' restants sur ce projet')); input.focus(); }
    });
  });

  // ---------- watchlist hearts ----------
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-save]'); if (!b) return;
    e.preventDefault();
    fetch('/dashboard/watchlist/' + encodeURIComponent(b.dataset.save), { method: 'POST', headers: { 'X-CSRF-Token': csrf, Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        $$('[data-save="' + b.dataset.save + '"]').forEach(function (x) {
          x.classList.toggle('on', j.saved); x.setAttribute('aria-pressed', String(j.saved));
          x.classList.remove('pop'); void x.offsetWidth; x.classList.add('pop');
          var lbl = $('span', x); if (lbl) lbl.textContent = j.saved ? T('Saved', 'Enregistré') : T('Save', 'Enregistrer');
        });
        toast(j.saved ? T('Added to your watchlist', 'Ajouté à vos favoris') : T('Removed from your watchlist', 'Retiré de vos favoris'));
      })
      .catch(function () { toast(T('Could not update the watchlist. Please reload.', 'Impossible de mettre à jour les favoris. Rechargez la page.')); });
  });

  // ---------- form validation ----------
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  $$('form[data-validate]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      var bad = [];
      $$('[required]', f).forEach(function (el) {
        if (el.disabled) return;
        var ok = el.type === 'checkbox' ? el.checked : String(el.value).trim() !== '';
        if (ok && el.type === 'email') ok = EMAIL.test(el.value.trim());
        if (ok && el.minLength > 0 && el.type === 'password') ok = el.value.length >= el.minLength;
        el.classList.toggle('invalid', !ok); if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.preventDefault();
        var msg = $('.error[data-client]', f);
        if (!msg) { msg = d.createElement('p'); msg.className = 'error show full'; msg.setAttribute('role', 'alert'); msg.setAttribute('data-client', ''); f.insertBefore(msg, f.firstElementChild ? f.firstElementChild.nextSibling : null); }
        msg.textContent = T('Please complete the highlighted fields.', 'Merci de compléter les champs en surbrillance.');
        msg.classList.add('show'); bad[0].focus();
        return;
      }
      var btn = $('button[type="submit"]', f);
      if (btn) { setTimeout(function () { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = T('Please wait…', 'Patientez…'); }, 0); }
    });
    $$('input,select,textarea', f).forEach(function (el) { el.addEventListener('input', function () { el.classList.remove('invalid'); }); });
  });
  // Re-enable buttons when navigating back (bfcache).
  window.addEventListener('pageshow', function () { $$('button[data-label]').forEach(function (b) { b.disabled = false; b.textContent = b.dataset.label; }); });

  // ---------- confirm / prompt forms ----------
  d.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.dataset.confirm && !window.confirm(f.dataset.confirm)) { e.preventDefault(); return; }
    if (f.dataset.prompt) {
      var v = window.prompt(f.dataset.prompt, '');
      if (v === null) { e.preventDefault(); return; }
      var field = f.querySelector('[name="' + f.dataset.promptField + '"]'); if (field) field.value = v;
    }
  }, true);

  // ---------- password helpers ----------
  $$('[data-pw-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.previousElementSibling; var show = i.type === 'password'; i.type = show ? 'text' : 'password';
      b.setAttribute('aria-label', show ? T('Hide password', 'Masquer le mot de passe') : T('Show password', 'Afficher le mot de passe'));
    });
  });
  $$('[data-pw-meter]').forEach(function (bar) {
    var input = bar.closest('form').querySelector('input[name="password"]'); if (!input) return;
    input.addEventListener('input', function () {
      var v = input.value, s = 0;
      if (v.length >= 10) s++; if (v.length >= 14) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      bar.style.width = (s / 5 * 100) + '%';
      bar.style.background = s <= 2 ? 'var(--warn)' : s === 3 ? 'var(--accent)' : 'var(--leaf)';
    });
  });

  // ---------- copy ----------
  d.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]'); if (!c) return;
    var text = c.getAttribute('data-copy');
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast(T('Copied', 'Copié') + ': ' + text); });
  });
  $$('[data-fill]').forEach(function (b) { b.addEventListener('click', function () { var t = $(b.dataset.fill); if (t) { t.value = b.dataset.value; t.focus(); } }); });

  // ---------- auth demo ticker ----------
  $$('[data-ticker]').forEach(function (el) {
    var rate = parseFloat(el.dataset.rate) || 0.0003, t0 = Date.now();
    setInterval(function () { el.textContent = usd((Date.now() - t0) / 1000 * rate * 10, 4); }, 80);
  });

  // ---------- flash auto-hide ----------
  $$('[data-autohide]').forEach(function (el) { setTimeout(function () { el.style.transition = 'opacity .6s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 650); }, 7000); });
})();
