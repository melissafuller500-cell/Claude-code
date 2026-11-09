/* Dashboard + admin: live accrual, countdowns, SVG charts, sidebar. */
(function () {
  'use strict';
  var d = document, NS = 'http://www.w3.org/2000/svg';
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var I = window.INR || { fmt: function (n) { return String(n); }, usd: function (n) { return '$' + n; }, T: function (e) { return e; }, lang: 'en' };
  var COLORS = ['#b8862b', '#2f7a55', '#3a7aa8', '#a5532a', '#8a6a3a', '#d6b13a', '#3a8a8a', '#4a6fd1'];

  // ---------- sidebar (mobile) ----------
  var side = $('[data-side]'), sbtn = $('[data-side-toggle]');
  if (side && sbtn) {
    sbtn.addEventListener('click', function () { var o = side.classList.toggle('open'); sbtn.setAttribute('aria-expanded', String(o)); });
    d.addEventListener('click', function (e) { if (side.classList.contains('open') && !side.contains(e.target) && !sbtn.contains(e.target)) { side.classList.remove('open'); sbtn.setAttribute('aria-expanded', 'false'); } });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') side.classList.remove('open'); });
  }

  // ---------- live accrual ----------
  $$('[data-accrual]').forEach(function (el) {
    var annualCents = parseFloat(el.dataset.annualCents) || 0, since = parseFloat(el.dataset.since) || Date.now(), base = parseFloat(el.dataset.baseCents) || 0;
    var perMs = annualCents / (365 * 864e5);
    function tick() { var cents = base + Math.max(0, Date.now() - since) * perMs; el.textContent = I.usd(cents / 100, 4); }
    tick(); if (perMs > 0) setInterval(tick, 100);
  });

  // ---------- countdowns ----------
  var cds = $$('[data-countdown]');
  function cd() {
    cds.forEach(function (el) {
      var ms = parseFloat(el.dataset.countdown) - Date.now();
      if (ms <= 0) { el.textContent = I.T('Hold expired', 'Réservation expirée'); return; }
      var h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
      el.textContent = I.T('Hold expires in ', 'Expire dans ') + h + 'h ' + String(m).padStart(2, '0') + 'm ' + String(s).padStart(2, '0') + 's';
    });
  }
  if (cds.length) { cd(); setInterval(cd, 1000); }

  // ---------- helpers ----------
  function el(tag, attrs, parent) { var n = d.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function data(box) { try { return JSON.parse($('script[type="application/json"]', box).textContent); } catch (e) { return null; } }
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))); var n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function short(v) { return v >= 1e6 ? I.fmt(v / 1e6, 1) + 'M' : v >= 1e3 ? I.fmt(v / 1e3, v >= 1e4 ? 0 : 1) + 'k' : I.fmt(v, v < 10 ? 2 : 0); }
  function dlabel(ms) { return new Date(ms).toLocaleDateString(I.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' }); }
  function tipFor(box) { var t = d.createElement('div'); t.className = 'tip'; box.appendChild(t); return t; }

  // ---------- line chart (cumulative payouts) ----------
  $$('[data-line-chart]').forEach(function (box) {
    var D = data(box); if (!D || !D.series.length) return;
    var s = D.series.length === 1 ? [{ x: D.series[0].x - 7 * 864e5, y: 0 }].concat(D.series) : D.series;
    var W = 640, H = 240, L = 46, R = 10, Tp = 12, B = 26;
    var x0 = s[0].x, x1 = s[s.length - 1].x, ymax = niceMax(Math.max.apply(null, s.map(function (p) { return p.y; })));
    var X = function (x) { return L + (x1 === x0 ? 0 : (x - x0) / (x1 - x0)) * (W - L - R); };
    var Y = function (y) { return Tp + (1 - y / ymax) * (H - Tp - B); };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': I.T('Cumulative payouts chart', 'Graphique des versements cumulés') });
    var defs = el('defs', {}, svg), g = el('linearGradient', { id: 'ga', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#b8862b', 'stop-opacity': 0.35 }, g); el('stop', { offset: 1, 'stop-color': '#b8862b', 'stop-opacity': 0 }, g);
    for (var i = 0; i <= 4; i++) {
      var yv = ymax * i / 4, yy = Y(yv);
      el('line', { x1: L, x2: W - R, y1: yy, y2: yy, class: 'grid' }, svg);
      el('text', { x: L - 8, y: yy + 3, 'text-anchor': 'end', class: 'axis' }, svg).textContent = short(yv);
    }
    [0, Math.floor(s.length / 2), s.length - 1].forEach(function (k) { el('text', { x: X(s[k].x), y: H - 6, 'text-anchor': k === 0 ? 'start' : k === s.length - 1 ? 'end' : 'middle', class: 'axis' }, svg).textContent = dlabel(s[k].x); });
    var dpath = s.map(function (p, k) { return (k ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ');
    el('path', { d: dpath + ' L' + X(x1) + ' ' + Y(0) + ' L' + X(x0) + ' ' + Y(0) + ' Z', class: 'area' }, svg);
    var line = el('path', { d: dpath, class: 'line draw' }, svg);
    var dot = el('circle', { r: 5, fill: '#b8862b', stroke: '#fff', 'stroke-width': 2, cx: X(s[s.length - 1].x), cy: Y(s[s.length - 1].y) }, svg);
    box.insertBefore(svg, box.firstChild);
    try { var len = line.getTotalLength(); line.style.setProperty('--len', len); } catch (e) { line.classList.remove('draw'); }
    var tip = tipFor(box);
    svg.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, best = s[0];
      s.forEach(function (p) { if (Math.abs(X(p.x) - px) < Math.abs(X(best.x) - px)) best = p; });
      dot.setAttribute('cx', X(best.x)); dot.setAttribute('cy', Y(best.y));
      tip.textContent = dlabel(best.x) + ' · ' + I.usd(best.y, 2); tip.style.left = (X(best.x) / W * 100) + '%'; tip.style.top = (Y(best.y) / H * 100) + '%'; tip.classList.add('on');
    });
    svg.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
  });

  // ---------- bar chart (admin daily) ----------
  $$('[data-bar-chart]').forEach(function (box) {
    var D = data(box); if (!D) return;
    var s = D.series, W = 640, H = 240, L = 46, R = 6, Tp = 12, B = 26;
    var ymax = niceMax(Math.max.apply(null, s.map(function (p) { return p.y; }).concat([1])));
    var bw = (W - L - R) / s.length;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Daily reservations' });
    for (var i = 0; i <= 4; i++) { var yy = Tp + (1 - i / 4) * (H - Tp - B); el('line', { x1: L, x2: W - R, y1: yy, y2: yy, class: 'grid' }, svg); el('text', { x: L - 8, y: yy + 3, 'text-anchor': 'end', class: 'axis' }, svg).textContent = short(ymax * i / 4); }
    var tip = tipFor(box);
    s.forEach(function (p, k) {
      var h = (p.y / ymax) * (H - Tp - B), x = L + k * bw + 2;
      var r = el('rect', { x: x.toFixed(1), y: (H - B - h).toFixed(1), width: Math.max(1, bw - 4).toFixed(1), height: Math.max(h, p.y > 0 ? 2 : 0).toFixed(1), rx: 3, class: 'b' }, svg);
      r.style.animationDelay = (k * 18) + 'ms';
      r.addEventListener('pointerenter', function () { tip.textContent = dlabel(p.x) + ' · ' + I.usd(p.y, 0); tip.style.left = ((x + bw / 2) / W * 100) + '%'; tip.style.top = ((H - B - h) / H * 100) + '%'; tip.classList.add('on'); });
      r.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
    });
    [0, 14, s.length - 1].forEach(function (k) { if (s[k]) el('text', { x: L + k * bw + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis' }, svg).textContent = dlabel(s[k].x); });
    box.insertBefore(svg, box.firstChild);
  });

  // ---------- donut ----------
  $$('[data-donut]').forEach(function (box) {
    var D = data(box); if (!D || !D.items.length) return;
    var total = D.items.reduce(function (a, b) { return a + b.value; }, 0) || 1, R = 70, C = 2 * Math.PI * R, off = 0;
    var svg = el('svg', { viewBox: '0 0 180 180', role: 'img', 'aria-label': I.T('Allocation by asset class', 'Répartition par classe d’actifs') });
    el('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 20 }, svg);
    var ul = d.createElement('ul'); ul.className = 'legend';
    D.items.forEach(function (it, k) {
      var len = it.value / total * C, col = COLORS[k % COLORS.length];
      var c = el('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: col, 'stroke-width': 20, 'stroke-dasharray': len.toFixed(2) + ' ' + (C - len).toFixed(2), 'stroke-dashoffset': (-off).toFixed(2), transform: 'rotate(-90 90 90)', class: 'seg-arc' }, svg);
      c.style.animationDelay = (k * 120) + 'ms';
      off += len;
      var li = d.createElement('li'); li.innerHTML = '<i></i><span></span><b></b>';
      li.querySelector('i').style.background = col; li.querySelector('span').textContent = it.label;
      li.querySelector('b').textContent = Math.round(it.value / total * 100) + '% · ' + I.usd(it.value, 0);
      ul.appendChild(li);
    });
    var t = el('text', { x: 90, y: 86, 'text-anchor': 'middle', style: 'font:600 15px var(--mono);fill:var(--ink)' }, svg); t.textContent = I.usd(total, 0);
    var t2 = el('text', { x: 90, y: 104, 'text-anchor': 'middle', style: 'font:500 10px var(--mono);fill:var(--muted)' }, svg); t2.textContent = I.T('invested', 'investi');
    box.appendChild(svg); box.appendChild(ul);
  });
})();
