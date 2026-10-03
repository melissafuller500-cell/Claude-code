/**
 * Hero vivant, mais léger :
 *  - flux de particules (factures) qui convergent vers le disque du portrait ;
 *  - cartes d'exemple qui changent d'état (relance envoyée, facture payée) ;
 *  - parallaxe discrète au pointeur (souris uniquement).
 * Démarre après le chargement (n'affecte pas l'affichage initial), s'arrête hors écran et onglet masqué,
 * et ne fait rien si l'utilisateur a demandé moins d'animations.
 */
type P = { t: number; sy: number; sp: number; o: number; r: number; blue: boolean; dx: number; dy: number };

export function init(hero: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const en = document.documentElement.lang === 'en';
  const canvas = hero.querySelector<HTMLCanvasElement>('canvas[data-flux]');
  const stage = hero.querySelector<HTMLElement>('[data-stage]');
  const disc = stage?.querySelector<HTMLElement>('.disc');
  if (!canvas || !stage || !disc) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ---------- cartes d'exemple ----------
  const chips = (k: string) => stage.querySelector<HTMLElement>(`[data-chip="${k}"]`)!;
  const REM = en
    ? [['D-5 reminder', 'sent', 'blue', 'WhatsApp · before due date'], ['D+7 reminder', 'sent', 'blue', 'Email · on schedule'], ['D+15 call', 'scheduled', 'warn', 'Accountant · in writing']]
    : [['Relance J-5', 'envoyée', 'blue', 'WhatsApp · avant échéance'], ['Relance J+7', 'envoyée', 'blue', 'E-mail · à date fixe'], ['Appel J+15', 'planifié', 'warn', 'Comptable · confirmé par écrit']];
  const INV = [['F-1042', '4 200 000'], ['F-1038', '1 350 000'], ['F-1029', '2 800 000']];
  let step = 0;
  const flip = (el: HTMLElement, text: string) => { el.textContent = text; el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); };
  const cycle = () => {
    step++;
    const r = REM[step % REM.length];
    flip(chips('r-title'), r[0]);
    const st = chips('r-state');
    flip(st, r[1]);
    st.className = `pill ${r[2]} flip`;
    chips('r-meta').textContent = r[3];
    const i = INV[step % INV.length];
    flip(chips('i-title'), `${en ? 'Invoice' : 'Facture'} ${i[0]}`);
    chips('i-amount').textContent = `${en ? i[1].replace(/ /g, ',') : i[1]} FCFA`;
  };

  if (reduce) return; // décor statique, déjà complet en HTML

  // ---------- particules ----------
  let W = 0, H = 0, parts: P[] = [], traces: number[][][] = [], running = false, raf = 0, lastPulse = 0;
  const mouse = { x: -999, y: -999 };
  const target = { x: 0, y: 0 };
  const mobile = () => W < 700;
  const newPart = (t = 0): P => ({ t, sy: 0.08 + Math.random() * 0.84, sp: 0.0016 + Math.random() * 0.0026, o: Math.random() - 0.5, r: 0.7 + Math.random() * 1.6, blue: Math.random() < 0.18, dx: 0, dy: 0 });

  const size = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = Array.from({ length: mobile() ? 40 : 110 }, () => newPart(Math.random()));
    traces = Array.from({ length: mobile() ? 5 : 11 }, () => {
      let x = Math.random() * W, y = Math.random() * H;
      const pts = [[x, y]];
      for (let k = 0; k < 4; k++) { if (k % 2) y += (Math.random() - 0.5) * 160; else x += (Math.random() - 0.3) * 220; pts.push([x, y]); }
      return pts;
    });
    const cr = canvas.getBoundingClientRect(), dr = disc.getBoundingClientRect();
    target.x = dr.left - cr.left + dr.width * 0.5;
    target.y = dr.top - cr.top + dr.height * 0.55;
  };

  const frame = (now: number) => {
    if (!running) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(6,17,11,.26)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(163,214,92,.04)';
    ctx.lineWidth = 1;
    for (const tr of traces) {
      ctx.beginPath(); ctx.moveTo(tr[0][0], tr[0][1]);
      for (const p of tr) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    const vertical = mobile();
    for (const p of parts) {
      p.t += p.sp;
      if (p.t >= 1) {
        Object.assign(p, newPart(0));
        if (now - lastPulse > 650) { lastPulse = now; disc.classList.remove('pulse'); void disc.offsetWidth; disc.classList.add('pulse'); }
      }
      // Sur mobile, le flux descend du haut ; sur ordinateur, il arrive de la gauche.
      const sx = vertical ? W * p.sy : -20, sy = vertical ? -20 : H * p.sy;
      const c1x = vertical ? sx + p.o * 120 : W * 0.3, c1y = vertical ? H * 0.3 : sy + p.o * 160;
      const c2x = target.x + (vertical ? p.o * 160 : -W * 0.12), c2y = target.y + (vertical ? -H * 0.1 : p.o * 220);
      const u = p.t, iu = 1 - u;
      let x = iu * iu * iu * sx + 3 * iu * iu * u * c1x + 3 * iu * u * u * c2x + u * u * u * target.x;
      let y = iu * iu * iu * sy + 3 * iu * iu * u * c1y + 3 * iu * u * u * c2y + u * u * u * target.y;
      if (fine) {
        const ddx = x - mouse.x, ddy = y - mouse.y, d = Math.hypot(ddx, ddy) || 1;
        const f = d < 130 ? (1 - d / 130) * 50 : 0;
        p.dx += ((ddx / d) * f - p.dx) * 0.12; p.dy += ((ddy / d) * f - p.dy) * 0.12;
        x += p.dx; y += p.dy;
      }
      const a = Math.min(1, u * 5) * (1 - Math.max(0, u - 0.88) * 8) * (vertical ? 0.55 : 1);
      ctx.fillStyle = p.blue ? `rgba(90,180,255,${0.75 * a})` : `rgba(163,214,92,${0.6 * a})`;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };

  const start = () => { if (!running && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : visible && start()));
  new ResizeObserver(() => size()).observe(canvas);

  // ---------- parallaxe et pointeur (souris uniquement) ----------
  if (fine) {
    const planes = [...stage.querySelectorAll<HTMLElement>('.plane')];
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      const hr = hero.getBoundingClientRect();
      const px = (e.clientX - hr.left) / hr.width - 0.5, py = (e.clientY - hr.top) / hr.height - 0.5;
      for (const pl of planes) { const d = +(pl.dataset.d || 0); pl.style.transform = `translate3d(${(px * d * -12).toFixed(1)}px,${(py * d * -10).toFixed(1)}px,0)`; }
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; for (const pl of planes) pl.style.transform = ''; });
  }

  size();
  start();
  setInterval(() => { if (visible && !document.hidden) cycle(); }, 3800);
}
