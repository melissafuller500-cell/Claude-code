/* GLP Atlas — site interactions. Vanilla JS, no dependencies; every feature is progressive enhancement. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.\s/+-]/g, ' '); };

  /* ---------- theme */
  var themeBtn = $('#theme');
  function currentDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function syncThemeBtn() { if (themeBtn) themeBtn.setAttribute('aria-pressed', currentDark() ? 'true' : 'false'); }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = currentDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeBtn();
    d.dispatchEvent(new CustomEvent('themechange'));
  });
  syncThemeBtn();

  /* ---------- main menu: mobile panel + dropdowns (hover handled in CSS; taps, keyboard and Escape here) */
  var menuBtn = $('.menu'), nav = $('#mainnav');
  var mobile = window.matchMedia('(max-width: 1080px)');
  function setOpen(li, open) {
    li.classList.toggle('open', open);
    $$('[aria-expanded]', li).forEach(function (b) { if (b.parentNode === li) b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  }
  function closeAll(except) { $$('.ni.open').forEach(function (li) { if (li !== except) setOpen(li, false); }); }
  $$('.ni.has-sub').forEach(function (li) {
    $$('.nt, .nl-btn', li).forEach(function (b) {
      if (b.parentNode !== li) return;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !li.classList.contains('open');
        if (!mobile.matches) closeAll(li);
        setOpen(li, open);
      });
    });
    li.addEventListener('focusout', function (e) { if (!mobile.matches && !li.contains(e.relatedTarget)) setOpen(li, false); });
    li.addEventListener('mouseleave', function () { if (!mobile.matches) setOpen(li, false); });
  });
  // on phones, the section you are in starts expanded so the current page is visible
  if (mobile.matches) $$('.ni.has-sub.is-active').forEach(function (li) { setOpen(li, true); });
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = $('.ni.open') || (d.activeElement && d.activeElement.closest && d.activeElement.closest('.ni'));
    if (open && !mobile.matches) { setOpen(open, false); var t = $('.nl', open); if (t) t.focus(); }
    if (nav && nav.classList.contains('open')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); }
  });
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }
  d.addEventListener('click', function (e) {
    if (!e.target.closest('.ni')) { if (!mobile.matches) closeAll(); }
    if (nav && nav.classList.contains('open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) {
      nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- command palette */
  var pal = $('#palette'), palQ = $('#pal-q'), palList = $('#pal-list');
  var index = null, loading = null, results = [], sel = 0;
  var KIND_RANK = { Medicine: 0, Compare: 1, Tool: 1, Topic: 2, Question: 3, Guide: 3, Glossary: 4, Hub: 5, Site: 6 };
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = fetch('/assets/search.json').then(function (r) { return r.json(); }).then(function (j) {
      index = j.map(function (x) { x.h = norm(x.t + ' ' + x.s); x.n = norm(x.t); return x; });
      return index;
    }).catch(function () { index = []; return index; });
    return loading;
  }
  function score(x, q, terms) {
    for (var i = 0; i < terms.length; i++) if (x.h.indexOf(terms[i]) < 0) return null;
    var s = 1000;
    if (x.n.indexOf(q) === 0) s += 120; else if (x.n.indexOf(q) > -1) s += 70;
    if ((' ' + x.n).indexOf(' ' + terms[0]) > -1) s += 30;
    return s - (KIND_RANK[x.k] || 6) * 6 - x.t.length * .05;
  }
  function hl(t, terms) {
    var out = esc(t);
    terms.forEach(function (w) {
      if (w.length < 2) return;
      out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return out;
  }
  function render(q) {
    var nq = norm(q).trim(), terms = nq.split(/\s+/).filter(Boolean);
    var html = '';
    if (!nq) {
      results = index.filter(function (x) { return /^\/(drugs\/(wegovy|zepbound|ozempic|mounjaro|foundayo)|compare\/#?|questions\/what-is-glp1)\/?/.test(x.u) && x.k !== 'Hub'; }).slice(0, 8);
      html = '<li class="pal-h" role="presentation">Popular</li>';
    } else {
      results = index.map(function (x) { return { x: x, s: score(x, nq, terms) }; })
        .filter(function (r) { return r.s !== null; }).sort(function (a, b) { return b.s - a.s; })
        .slice(0, 14).map(function (r) { return r.x; });
    }
    sel = 0;
    if (!results.length) { palList.innerHTML = '<li class="pal-empty">No results for “' + esc(q) + '”. Try a brand or generic name.</li>'; return; }
    palList.innerHTML = html + results.map(function (x, i) {
      return '<li role="presentation"><a role="option" id="pal-' + i + '" href="' + esc(x.u) + '" aria-selected="' + (i === 0) + '"><span class="k">' + esc(x.k) +
        '</span><span class="ttl">' + hl(x.t, terms) + '</span><span class="ret" aria-hidden="true">↵</span></a></li>';
    }).join('');
    palQ.setAttribute('aria-activedescendant', 'pal-0');
  }
  function move(n) {
    var opts = $$('[role="option"]', palList);
    if (!opts.length) return;
    sel = (sel + n + opts.length) % opts.length;
    opts.forEach(function (o, i) { o.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
    opts[sel].scrollIntoView({ block: 'nearest' });
    palQ.setAttribute('aria-activedescendant', 'pal-' + sel);
  }
  function openPalette(q) {
    if (!pal || typeof pal.showModal !== 'function') { if (q) location.href = '/drugs/'; return; }
    if (!pal.open) pal.showModal();
    palQ.value = q || '';
    palList.innerHTML = '<li class="pal-empty">Loading…</li>';
    loadIndex().then(function () { render(palQ.value); });
    setTimeout(function () { palQ.focus(); palQ.setSelectionRange(palQ.value.length, palQ.value.length); }, 10);
  }
  if (pal) {
    palQ.addEventListener('input', function () { if (index) render(palQ.value); });
    palQ.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { var a = $('[aria-selected="true"]', palList); if (a) { e.preventDefault(); location.href = a.getAttribute('href'); pal.close(); } }
    });
    pal.addEventListener('click', function (e) { if (e.target === pal) pal.close(); });
    palList.addEventListener('click', function (e) { if (e.target.closest('a')) pal.close(); });
  }
  d.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); pal && pal.open ? pal.close() : openPalette(''); }
    else if (e.key === '/' && !typing) { e.preventDefault(); openPalette(''); }
  });
  $$('[data-open-palette]').forEach(function (b) { b.addEventListener('click', function () { openPalette(''); }); });
  $$('[data-palette-q]').forEach(function (b) { b.addEventListener('click', function () { openPalette(b.getAttribute('data-palette-q')); }); });
  $$('input[data-palette]').forEach(function (inp) {
    var go = function () { var v = inp.value; inp.value = ''; inp.blur(); openPalette(v); };
    inp.addEventListener('focus', go);
    inp.addEventListener('input', go);
  });
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $$('kbd').forEach(function (k) { if (k.textContent === '⌘K') k.textContent = 'Ctrl K'; });

  /* ---------- medicine finder (search + chips) */
  var dq = $('#drug-q');
  if (dq) {
    var state = { use: '', route: '', freq: '' };
    var cards = $$('.drug-group .card'), groups = $$('.drug-group'), countEl = $('[data-count]'), empty = $('.empty');
    var apply = function () {
      var q = norm(dq.value).trim(), terms = q.split(/\s+/).filter(Boolean), n = 0;
      cards.forEach(function (c) {
        var hay = norm(c.dataset.search);
        var ok = terms.every(function (t) { return hay.indexOf(t) > -1; }) &&
          (!state.use || c.dataset.use === state.use) && (!state.route || c.dataset.route === state.route) &&
          (!state.freq || (' ' + c.dataset.freq + ' ').indexOf(' ' + state.freq + ' ') > -1);
        c.hidden = !ok; if (ok) n++;
      });
      groups.forEach(function (g) { g.hidden = !$$('.card', g).some(function (c) { return !c.hidden; }); });
      if (countEl) countEl.textContent = n;
      if (empty) empty.hidden = n > 0;
      var params = new URLSearchParams();
      if (dq.value) params.set('q', dq.value);
      Object.keys(state).forEach(function (k) { if (state[k]) params.set(k, state[k]); });
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
    };
    var setChip = function (key, val) {
      state[key] = val;
      $$('.fgroup[data-key="' + key + '"] .chip').forEach(function (c) { var on = c.dataset.val === val; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    };
    $$('.fgroup').forEach(function (g) {
      $$('.chip', g).forEach(function (c) {
        c.setAttribute('aria-pressed', c.classList.contains('on'));
        c.addEventListener('click', function () { setChip(g.dataset.key, c.dataset.val); apply(); });
      });
    });
    var rs = $('[data-reset]');
    if (rs) rs.addEventListener('click', function () { dq.value = ''; Object.keys(state).forEach(function (k) { setChip(k, ''); }); apply(); });
    var p0 = new URLSearchParams(location.search);
    if (p0.get('q')) dq.value = p0.get('q');
    Object.keys(state).forEach(function (k) { if (p0.get(k)) setChip(k, p0.get(k)); });
    dq.addEventListener('input', apply);
    if (location.search) apply();
  }

  /* ---------- generic list filters (questions, glossary) */
  $$('input[data-filter]').forEach(function (inp) {
    var items = $$(inp.dataset.filter), empty = $('.empty');
    inp.addEventListener('input', function () {
      var terms = norm(inp.value).trim().split(/\s+/).filter(Boolean), n = 0;
      items.forEach(function (li) { var ok = terms.every(function (t) { return norm(li.dataset.q).indexOf(t) > -1; }); li.hidden = !ok; if (ok) n++; });
      if (empty) empty.hidden = n > 0;
    });
  });

  /* ---------- comparison builder */
  var cA = $('#cmpA'), cB = $('#cmpB'), cOut = $('#cmpOut');
  if (cA && cB && cOut) {
    var data = null, pairs = {};
    var p = new URLSearchParams(location.search);
    cA.value = p.get('a') || 'wegovy'; cB.value = p.get('b') || 'zepbound';
    if (!cA.value) cA.selectedIndex = 0;
    if (!cB.value) cB.selectedIndex = 1;
    var rows = [['Generic name', 'generic'], ['Drug class', 'cls'], ['Group', 'cat'], ['Maker', 'maker'], ['Form', 'form'], ['How often', 'freq'],
      ['Approved uses', 'uses'], ['Top label dose', 'top'], ['United States', 'us'], ['Canada', 'ca'], ['Boxed warning', 'boxed'], ['Cost', 'cost']];
    var cell = function (v, key) {
      if (key === 'top') return esc(v[0]) + ': ' + esc(v[1]);
      if (Array.isArray(v)) return '<ul>' + v.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      return v ? esc(v) : '<span class="note">None</span>';
    };
    var draw = function () {
      if (!data) return;
      var a = data[cA.value], b = data[cB.value];
      if (!a || !b) return;
      var key = pairs[cA.value + '|' + cB.value] || pairs[cB.value + '|' + cA.value];
      var same = cA.value === cB.value;
      cOut.innerHTML = '<div class="tbl"><table class="t cmp"><thead><tr><th scope="col">Feature</th><th scope="col"><a href="/drugs/' + cA.value + '/">' + esc(a.short) +
        '</a></th><th scope="col"><a href="/drugs/' + cB.value + '/">' + esc(b.short) + '</a></th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><th scope="row">' + r[0] + '</th><td>' + cell(a[r[1]], r[1]) + '</td><td>' + cell(b[r[1]], r[1]) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (same ? '<p class="note">Pick two different medicines to compare.</p>' : '') +
        '<div class="cmp-links">' + (key ? '<a class="btn" href="' + key + '">Read our editorial comparison</a>' : '') +
        '<a class="chip" href="/drugs/' + cA.value + '/">' + esc(a.short) + ' full guide →</a><a class="chip" href="/drugs/' + cB.value + '/">' + esc(b.short) + ' full guide →</a></div>' +
        '<p class="note">Label facts only — not a recommendation. Your prescriber decides what fits your diagnosis and history.</p>';
      history.replaceState(null, '', location.pathname + '?a=' + cA.value + '&b=' + cB.value + '#builder');
    };
    Promise.all([fetch('/assets/drugs.json').then(function (r) { return r.json(); }), fetch('/assets/compares.json').then(function (r) { return r.json(); })])
      .then(function (r) { data = r[0]; pairs = r[1]; draw(); }).catch(function () { cOut.innerHTML = '<p class="note">The comparison data could not be loaded.</p>'; });
    cA.addEventListener('change', draw); cB.addEventListener('change', draw);
    $('#cmpSwap').addEventListener('click', function () { var t = cA.value; cA.value = cB.value; cB.value = t; draw(); });
  }


  /* ---------- contact form: anti-bot timer + status messages (PHP mailer) */
  $$('form[data-guard]').forEach(function (f) {
    var ts = f.querySelector('input[name="ts"]'); if (ts) ts.value = Date.now();
    var msg = f.querySelector('.form-msg'), st = new URLSearchParams(location.search).get('form');
    var text = { invalid: 'Please fill in your name, a valid email and a message.', limit: 'Too many messages from this connection — please try again in an hour or email us directly.',
                 error: 'The message could not be sent. Please email us directly.' }[st];
    if (msg && text) { msg.textContent = text; msg.hidden = false; }
  });

  /* ---------- blog topic filter */
  var bf = $('[data-blog-filter]');
  if (bf) {
    var posts = $$('.posts > a'), pempty = $('.empty');
    $$('.chip', bf).forEach(function (c) {
      c.setAttribute('aria-pressed', c.classList.contains('on'));
      c.addEventListener('click', function () {
        $$('.chip', bf).forEach(function (x) { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); });
        var n = 0; posts.forEach(function (p) { var ok = !c.dataset.val || p.dataset.cat === c.dataset.val; p.hidden = !ok; if (ok) n++; });
        if (pempty) pempty.hidden = n > 0;
      });
    });
  }

  /* ---------- scroll: progress bar, back to top, TOC scrollspy */
  var bar = $('.progress span'), top = $('.totop'), doc = $('.doc');
  var tocLinks = $$('.toc a'), heads = tocLinks.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, h = root.scrollHeight - window.innerHeight;
    if (bar && doc) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    if (top) top.classList.toggle('show', y > 900);
    if (heads.length) {
      var cur = 0;
      for (var i = 0; i < heads.length; i++) if (heads[i].getBoundingClientRect().top < 140) cur = i;
      tocLinks.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- heading anchors */
  $$('.doc h2[id]').forEach(function (h) {
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'anchor'; b.textContent = '#'; b.setAttribute('aria-label', 'Copy link to “' + h.textContent + '”');
    b.addEventListener('click', function () {
      var link = location.origin + location.pathname + '#' + h.id;
      history.replaceState(null, '', '#' + h.id);
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { b.textContent = '✓'; setTimeout(function () { b.textContent = '#'; }, 1400); });
    });
    h.appendChild(b);
  });

  /* ---------- share / print */
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var data = { title: d.title, url: location.href.split('#')[0] };
      if (navigator.share) navigator.share(data).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(function () { var t = b.textContent; b.textContent = 'Link copied ✓'; setTimeout(function () { b.textContent = t; }, 1600); });
    });
  });
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { $$('.faq details').forEach(function (x) { x.open = true; }); window.print(); }); });

  /* ---------- reveal on scroll */
  var rv = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* ---------- animated counters */
  var nums = $$('[data-count-to]');
  if (nums.length && 'IntersectionObserver' in window && !reduce) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, to = +el.dataset.countTo, t0 = performance.now();
        (function tick(now) {
          var k = Math.min(1, (now - t0) / 1200), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
          el.textContent = v; if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    });
    nums.forEach(function (n) { n.textContent = '0'; co.observe(n); });
  }

  /* ---------- card tilt + spotlight */
  if (fine && !reduce) {
    d.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (x * 100) + '%'); c.style.setProperty('--my', (y * 100) + '%');
      c.style.transform = 'perspective(800px) rotateX(' + ((.5 - y) * 6).toFixed(2) + 'deg) rotateY(' + ((x - .5) * 8).toFixed(2) + 'deg) translateY(-3px)';
    }, { passive: true });
    d.addEventListener('pointerout', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
    });
  }
})();
