"""Generate all site images: logo and icons, per-drug illustrations (SVG), social cards and blog covers (PNG).

Everything is drawn programmatically from the site palette and fonts, so images are consistent,
lightweight, and reproducible. Run through build.py.
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

TOOLS = Path(__file__).resolve().parent
FONTS = TOOLS / "fonts"
SERIF = str(FONTS / "Fraunces-SemiBold.ttf")
SANS = str(FONTS / "AtkinsonHyperlegible-Regular.ttf")
SANS_B = str(FONTS / "AtkinsonHyperlegible-Bold.ttf")

BRAND = (11, 85, 99)
INK = (16, 34, 42)
PAPER = (246, 248, 247)
ACCENT = (232, 169, 58)

# cluster: (main color, light tint)
PALETTE = {
    "opioids": ("#0B5563", "#DDEFEC"),
    "benzodiazepines-sedatives": ("#3B4F9C", "#E3E8F7"),
    "stimulants": ("#B4561B", "#FBE9DC"),
    "gabapentinoids-dissociatives": ("#6B4C9A", "#EDE6F6"),
    "cannabis-psychedelics": ("#2F7D4F", "#E1F2E7"),
    "anabolic-steroids": ("#8A3B3B", "#F6E3E3"),
    "emerging": ("#8A6512", "#F8EFD6"),
}
LEAF = {"cannabis", "kratom", "khat", "salvia", "ayahuasca", "ibogaine", "cbd", "delta-8-thc", "hhc", "7-hydroxymitragynine", "cocaine", "mescaline", "dronabinol"}
MUSHROOM = {"psilocybin", "amanita-muscaria"}
GAS = {"nitrous-oxide"}


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def font(path, size):
    return ImageFont.truetype(path, size)


# ------------------------------------------------------------ molecule motif
def molecule(slug):
    """Deterministic pseudo-molecule: fused hexagon rings plus side chains. Returns atoms [(x,y)] and bonds [(i,j,double)] in unit space."""
    rnd = random.Random("dosepedia:" + slug)
    r = 1.0
    atoms, bonds, index = [], [], {}

    def add(p):
        key = (round(p[0], 2), round(p[1], 2))
        if key not in index:
            index[key] = len(atoms)
            atoms.append(p)
        return index[key]

    def ring(cx, cy):
        ids = [add((cx + r * math.cos(math.radians(60 * k + 30)), cy + r * math.sin(math.radians(60 * k + 30)))) for k in range(6)]
        for k in range(6):
            a, b = ids[k], ids[(k + 1) % 6]
            if not any({a, b} == {x, y} for x, y, _ in bonds):
                bonds.append((a, b, k % 2 == 0 and rnd.random() < 0.7))
        return ids

    n_rings = rnd.choice([1, 2, 2, 3])
    centers = [(0.0, 0.0)]
    dirs = [(math.sqrt(3) * r, 0), (math.sqrt(3) / 2 * r, 1.5 * r), (-math.sqrt(3) / 2 * r, 1.5 * r)]
    for _ in range(n_rings - 1):
        dx, dy = rnd.choice(dirs)
        cx, cy = centers[-1]
        nc = (cx + dx, cy + dy)
        if nc not in centers:
            centers.append(nc)
    for c in centers:
        ring(*c)
    # side chains from outer atoms
    for _ in range(rnd.randint(2, 4)):
        base = rnd.randrange(len(atoms))
        bx, by = atoms[base]
        cx = sum(c[0] for c in centers) / len(centers)
        cy = sum(c[1] for c in centers) / len(centers)
        ang = math.atan2(by - cy, bx - cx) + rnd.uniform(-0.35, 0.35)
        prev = base
        for step in range(rnd.randint(1, 3)):
            ang += rnd.choice([-1, 1]) * math.radians(60) * (step > 0)
            p = (atoms[prev][0] + r * math.cos(ang), atoms[prev][1] + r * math.sin(ang))
            nid = add(p)
            bonds.append((prev, nid, rnd.random() < 0.2))
            prev = nid
    xs = [a[0] for a in atoms]; ys = [a[1] for a in atoms]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1
    atoms = [((x - cx) / span, (y - cy) / span) for x, y in atoms]
    hetero = rnd.sample(range(len(atoms)), k=min(len(atoms), rnd.randint(2, 4)))
    return atoms, bonds, hetero


def mol_svg(slug, cx, cy, size, color, sw=5):
    atoms, bonds, hetero = molecule(slug)
    P = [(cx + x * size, cy + y * size) for x, y in atoms]
    out = []
    for a, b, dbl in bonds:
        (x1, y1), (x2, y2) = P[a], P[b]
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
        if dbl:
            dx, dy = x2 - x1, y2 - y1
            L = math.hypot(dx, dy) or 1
            ox, oy = -dy / L * sw * 1.6, dx / L * sw * 1.6
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            # inner offset line, shortened
            out.append(f'<line x1="{x1 + ox + dx * .18:.1f}" y1="{y1 + oy + dy * .18:.1f}" x2="{x2 + ox - dx * .18:.1f}" y2="{y2 + oy - dy * .18:.1f}" opacity=".55"/>')
    dots = "".join(f'<circle cx="{P[i][0]:.1f}" cy="{P[i][1]:.1f}" r="{sw * 1.6:.1f}" class="h"/>' for i in hetero)
    return f'<g stroke="{color}" stroke-width="{sw}" stroke-linecap="round" fill="none">{"".join(out)}</g><g class="atoms">{dots}</g>'


def motif_svg(slug, kind, color, cx, cy, s):
    if slug in MUSHROOM:
        return (f'<g fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">'
                f'<path d="M{cx - s} {cy}c0-{s * .8} {s * .45}-{s * 1.1} {s}-{s * 1.1}s{s} {s * .3} {s} {s * 1.1}z"/>'
                f'<path d="M{cx - s * .3} {cy}v{s * .75}a{s * .3} {s * .2} 0 0 0 {s * .6} 0v-{s * .75}"/>'
                f'<circle cx="{cx - s * .45}" cy="{cy - s * .5}" r="{s * .1}" fill="{color}"/><circle cx="{cx + s * .2}" cy="{cy - s * .75}" r="{s * .09}" fill="{color}"/><circle cx="{cx + s * .55}" cy="{cy - s * .35}" r="{s * .08}" fill="{color}"/></g>')
    if slug in LEAF:
        return (f'<g fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">'
                f'<path d="M{cx} {cy + s}C{cx - s} {cy + s * .2} {cx - s * .7} {cy - s * .8} {cx} {cy - s}C{cx + s * .7} {cy - s * .8} {cx + s} {cy + s * .2} {cx} {cy + s}z"/>'
                f'<path d="M{cx} {cy + s * 1.25}V{cy - s * .7}M{cx} {cy}l{s * .4}-{s * .4}M{cx} {cy + s * .45}l-{s * .4}-{s * .4}M{cx} {cy - s * .35}l-{s * .3}-{s * .3}"/></g>')
    if slug in GAS:
        return (f'<g fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round">'
                f'<circle cx="{cx - s * .35}" cy="{cy + s * .2}" r="{s * .55}"/><circle cx="{cx + s * .45}" cy="{cy - s * .35}" r="{s * .4}"/><circle cx="{cx + s * .35}" cy="{cy + s * .65}" r="{s * .22}"/></g>')
    return mol_svg(slug, cx, cy, s * 2.5, color, sw=6)


def capsule_svg(x, y, color):
    return (f'<g transform="translate({x} {y}) rotate(-35)"><rect x="-26" y="-11" width="52" height="22" rx="11" fill="#fff" stroke="{color}" stroke-width="4"/>'
            f'<path d="M0 -11v22" stroke="{color}" stroke-width="4"/><rect x="0" y="-9" width="24" height="18" rx="9" fill="{color}" opacity=".9"/></g>')


def drug_svg(r):
    color, tint = PALETTE[r["cluster"]]
    code = r["sched"]
    motif = motif_svg(r["slug"], r["kind"], color, 120, 112, 52)
    badge = (f'<g><circle cx="196" cy="196" r="26" fill="{color}"/><text x="196" y="{204 if len(code) < 3 else 203}" text-anchor="middle" '
             f'font-family="Georgia,serif" font-weight="700" font-size="{22 if len(code) < 3 else 18}" fill="#fff">{code}</text></g>')
    pill = capsule_svg(50, 196, color) if r["kind"] in ("rx", "otc") else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="{r["name"]} illustration">'
            f'<style>.bg{{fill:url(#g)}}.h{{fill:{color}}}@media (prefers-color-scheme:dark){{.bg{{fill:#132229}}}}</style>'
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="{tint}"/></linearGradient></defs>'
            f'<rect class="bg" width="240" height="240" rx="32"/>'
            f'<circle cx="120" cy="112" r="86" fill="{tint}" opacity=".7"/>{motif}{pill}{badge}</svg>')


# ------------------------------------------------------------ raster helpers
def lin_grad(w, h, c1, c2, diag=True):
    base = Image.new("RGB", (w, h), c1)
    top = Image.new("RGB", (w, h), c2)
    mask = Image.new("L", (w, h))
    md = mask.load()
    for yy in range(h):
        for xx in range(0, w, 4):
            t = ((xx / w) * 0.6 + (yy / h) * 0.4) if diag else yy / h
            v = int(255 * t)
            for k in range(4):
                if xx + k < w:
                    md[xx + k, yy] = v
    return Image.composite(top, base, mask)


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def fit_text(draw, text, path, max_w, max_lines, start, minsize):
    size = start
    while size >= minsize:
        f = font(path, size)
        lines = wrap(draw, text, f, max_w)
        if len(lines) <= max_lines and all(draw.textlength(l, font=f) <= max_w for l in lines):
            return f, lines
        size -= 4
    f = font(path, minsize)
    lines = wrap(draw, text, f, max_w)[:max_lines]
    lines[-1] = lines[-1].rstrip(".,") + "…"
    return f, lines


def draw_mol(img, slug, cx, cy, size, color, width, alpha=255, scale=3):
    """Draw molecule motif anti-aliased by supersampling."""
    W, H = img.size
    big = Image.new("RGBA", (W * scale, H * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    atoms, bonds, hetero = molecule(slug)
    P = [((cx + x * size) * scale, (cy + y * size) * scale) for x, y in atoms]
    col = color + (alpha,)
    for a, b, dbl in bonds:
        d.line([P[a], P[b]], fill=col, width=width * scale)
        for p in (P[a], P[b]):
            rr = width * scale / 2
            d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=col)
        if dbl:
            (x1, y1), (x2, y2) = P[a], P[b]
            dx, dy = x2 - x1, y2 - y1
            L = math.hypot(dx, dy) or 1
            ox, oy = -dy / L * width * scale * 1.7, dx / L * width * scale * 1.7
            d.line([(x1 + ox + dx * .18, y1 + oy + dy * .18), (x2 + ox - dx * .18, y2 + oy - dy * .18)], fill=color + (int(alpha * .55),), width=width * scale)
    for i in hetero:
        p = P[i]; rr = width * scale * 1.7
        d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=ACCENT + (alpha,))
    small = big.resize((W, H), Image.LANCZOS)
    img.paste(small, (0, 0), small)


def draw_logo(img, x, y, s, inverted=False):
    """Dosepedia mark: rounded square with a tilted capsule (matches the SVG favicon)."""
    scale = 4
    big = Image.new("RGBA", (s * scale, s * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    S = s * scale
    bg, fg = ((255, 255, 255, 255), BRAND + (255,)) if inverted else (BRAND + (255,), (255, 255, 255, 255))
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 9 / 32), fill=bg)
    cap = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cap)
    u = S / 32
    cd.rounded_rectangle([7 * u, 12 * u, 25 * u, 20 * u], radius=int(4 * u), outline=fg, width=int(2.4 * u))
    cap = cap.rotate(35, resample=Image.BICUBIC, center=(16 * u, 16 * u))
    big.alpha_composite(cap)
    d = ImageDraw.Draw(big)
    d.line([(13.7 * u, 12.7 * u), (18.3 * u, 19.3 * u)], fill=fg, width=int(2.4 * u))
    small = big.resize((s, s), Image.LANCZOS)
    img.paste(small, (x, y), small)


def wordmark(draw, x, y, size, color_main, color_bold):
    f1, f2 = font(SANS, size), font(SANS_B, size)
    draw.text((x, y), "Dose", font=f1, fill=color_main)
    draw.text((x + draw.textlength("Dose", font=f1), y), "pedia", font=f2, fill=color_bold)


def pill(draw, x, y, text, fnt, fg, bg, pad=(18, 9)):
    w = draw.textlength(text, font=fnt)
    h = fnt.size
    draw.rounded_rectangle([x, y, x + w + pad[0] * 2, y + h + pad[1] * 2], radius=(h + pad[1] * 2) // 2, fill=bg)
    draw.text((x + pad[0], y + pad[1] - 2), text, font=fnt, fill=fg)
    return x + w + pad[0] * 2 + 12


def save_png(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)


# ------------------------------------------------------------ cards
def og_drug(r, path, cluster_label, sched_label, kind_label):
    W, H = 1200, 630
    color = hexrgb(PALETTE[r["cluster"]][0])
    img = lin_grad(W, H, (8, 52, 61), tuple(int(c * .85) for c in color)).convert("RGBA")
    d = ImageDraw.Draw(img)
    # motif on the right
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([800, 95, 1240, 535], fill=(255, 255, 255, 22))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(30)))
    draw_mol(img, r["slug"], 975, 315, 330, (255, 255, 255), 9, alpha=200)
    d = ImageDraw.Draw(img)
    draw_logo(img, 70, 62, 58, inverted=True)
    wordmark(d, 142, 68, 40, (220, 236, 238), (255, 255, 255))
    d.text((72, 168), cluster_label.upper(), font=font(SANS_B, 26), fill=(127, 211, 198))
    fT, lines = fit_text(d, r["name"], SERIF, 640, 2, 96, 56)
    y = 210
    for ln in lines:
        d.text((70, y), ln, font=fT, fill=(255, 255, 255))
        y += int(fT.size * 1.1)
    if r["brands"]:
        fB, bl = fit_text(d, r["brands"], SANS, 640, 1, 34, 24)
        d.text((72, y + 10), bl[0], font=fB, fill=(214, 230, 232))
    fp = font(SANS_B, 26)
    x = pill(d, 70, 488, sched_label, fp, INK, (255, 255, 255))
    pill(d, x, 488, kind_label, fp, (255, 255, 255), (255, 255, 255, 40) if False else tuple(min(255, int(c * 1.25)) for c in color))
    d.text((70, 566), "Uses, risks, interactions, withdrawal, and the law  ·  dosepedia.com", font=font(SANS, 22), fill=(190, 214, 218))
    save_png(img, path)


def og_page(title, subtitle, path, slug="dosepedia", color="#0B5563"):
    W, H = 1200, 630
    c = hexrgb(color)
    img = lin_grad(W, H, (8, 52, 61), tuple(int(v * .85) for v in c)).convert("RGBA")
    draw_mol(img, slug, 990, 320, 320, (255, 255, 255), 9, alpha=170)
    d = ImageDraw.Draw(img)
    draw_logo(img, 70, 62, 58, inverted=True)
    wordmark(d, 142, 68, 40, (220, 236, 238), (255, 255, 255))
    fT, lines = fit_text(d, title, SERIF, 700, 3, 84, 50)
    y = 190
    for ln in lines:
        d.text((70, y), ln, font=fT, fill=(255, 255, 255)); y += int(fT.size * 1.12)
    if subtitle:
        fS, sl = fit_text(d, subtitle, SANS, 700, 2, 30, 24)
        y += 14
        for ln in sl:
            d.text((72, y), ln, font=fS, fill=(214, 230, 232)); y += int(fS.size * 1.3)
    d.text((70, 566), "Independent, sourced drug reference  ·  dosepedia.com", font=font(SANS, 22), fill=(190, 214, 218))
    save_png(img, path)


def blog_cover(r, headline, path, cluster_label, label="GUIDE"):
    W, H = 1200, 630
    color_hex, tint_hex = PALETTE[r["cluster"]]
    color, tint = hexrgb(color_hex), hexrgb(tint_hex)
    img = lin_grad(W, H, (255, 255, 255), tint).convert("RGBA")
    d = ImageDraw.Draw(img)
    d.ellipse([760, 90, 1200, 530], fill=tint + (255,))
    img_m = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_mol(img_m, r["slug"], 980, 310, 300, color, 10, alpha=255)
    img.alpha_composite(img_m)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, 14, H], radius=0, fill=color)
    draw_logo(img, 70, 58, 50)
    wordmark(d, 132, 63, 34, INK, BRAND)
    x = pill(d, 70, 150, label, font(SANS_B, 22), (255, 255, 255), color)
    d.text((x + 4, 157), cluster_label, font=font(SANS_B, 22), fill=color)
    fT, lines = fit_text(d, headline, SERIF, 700, 4, 64, 40)
    y = 215
    for ln in lines:
        d.text((70, y), ln, font=fT, fill=INK); y += int(fT.size * 1.14)
    d.text((70, 568), f"{r['name']}  ·  Sourced from FDA, DEA, CDC, and NIDA  ·  dosepedia.com", font=font(SANS, 22), fill=(82, 100, 108))
    save_png(img, path)


def icons(out):
    out.mkdir(parents=True, exist_ok=True)
    for size, name in ((32, "favicon-32.png"), (180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw_logo(img, 0, 0, size)
        img.save(out / name, optimize=True)
    # horizontal logo for structured data (Organization.logo)
    img = Image.new("RGBA", (600, 160), (255, 255, 255, 255))
    draw_logo(img, 20, 20, 120)
    d = ImageDraw.Draw(img)
    wordmark(d, 160, 42, 64, INK, BRAND)
    img.save(out / "logo.png", optimize=True)
    (out / "logo.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#0B5563"/>'
        '<rect x="7" y="12" width="18" height="8" rx="4" fill="none" stroke="#fff" stroke-width="2.4" transform="rotate(-35 16 16)"/>'
        '<path d="M13.7 12.7l4.6 6.6" stroke="#fff" stroke-width="2.4"/></svg>')
