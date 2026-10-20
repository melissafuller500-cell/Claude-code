"""Render 1200x630 Open Graph images, the PNG logo and app icons with Pillow.
Called by build.py; skipped with a warning when Pillow is missing.
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
TEAL, VIOLET, BG = (45, 212, 191), (139, 92, 246), (7, 11, 20)
FONT_DIRS = ["/usr/share/fonts/opentype/inter", "/usr/share/fonts/truetype/inter", os.path.expanduser("~/Library/Fonts"), "/Library/Fonts", "C:/Windows/Fonts"]

def font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p): return ImageFont.truetype(p, size)
    for n in ("DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"):
        try: return ImageFont.truetype(n, size)
        except OSError: pass
    return ImageFont.load_default(size=size)

BOLD = ["InterDisplay-Bold.otf", "Inter-Bold.otf", "Inter-Bold.ttf"]
SEMI = ["Inter-SemiBold.otf", "Inter-SemiBold.ttf", "Inter-Medium.otf"]

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def background():
    """Dark field with two colour glows and a projected double helix — the same motif as the site's 3D background."""
    img = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG)
    g = ImageDraw.Draw(glow)
    g.ellipse((700, -260, 1500, 540), fill=(18, 78, 84))
    g.ellipse((-300, 300, 500, 1000), fill=(46, 30, 92))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(160)), 0.9)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rnd = random.Random(7)
    for _ in range(140):
        x, y, r = rnd.randrange(W), rnd.randrange(H), rnd.choice((1, 1, 1.5, 2))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(200, 230, 255, rnd.randrange(30, 110)))
    cx, cy, R, turns = 930, 315, 120, 2.6
    pts = []
    for i in range(160):
        t = i / 159
        for s in (0, math.pi):
            a = t * turns * 2 * math.pi + s
            x3, y3, z3 = math.cos(a) * R, (t - .5) * 760, math.sin(a) * R
            ang = -0.55
            x = x3 * math.cos(ang) - y3 * math.sin(ang)
            y = x3 * math.sin(ang) + y3 * math.cos(ang)
            depth = (z3 + R) / (2 * R)
            pts.append((cx + x, cy + y, depth, t, s))
    for i in range(0, len(pts) - 1, 8):
        a, b = pts[i], pts[i + 1]
        d.line((a[0], a[1], b[0], b[1]), fill=(160, 200, 255, 34), width=2)
    for x, y, depth, t, s in sorted(pts, key=lambda p: p[2]):
        col = lerp(TEAL, VIOLET, t)
        r = 2.5 + depth * 4.5
        d.ellipse((x - r, y - r, x + r, y + r), fill=col + (int(70 + depth * 185),))
    img = img.convert("RGBA")
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.6)))
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for x in range(0, 820, 4):
        sd.rectangle((x, 0, x + 4, H), fill=BG + (int(150 * (1 - x / 820) ** 1.4),))
    img.alpha_composite(shade)
    return img

def mark(size):
    s = size
    m = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    grad = Image.new("RGBA", (s, s))
    gp = grad.load()
    for y in range(s):
        for x in range(s):
            gp[x, y] = lerp(TEAL, VIOLET, (x + y) / (2 * s)) + (255,)
    mask = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(mask)
    w = max(2, s // 11)
    md.ellipse((s * .09, s * .09, s * .91, s * .91), outline=255, width=w)
    md.ellipse((s * .09, s * .34, s * .91, s * .66), outline=180, width=max(1, w // 2))
    md.ellipse((s * .37, s * .37, s * .63, s * .63), fill=255)
    m.paste(grad, (0, 0), mask)
    return m

def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= width: cur = test
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def render(path, base, label, title, site, host):
    img = base.copy()
    d = ImageDraw.Draw(img)
    img.alpha_composite(mark(64), (72, 64))
    d.text((152, 76), site, font=font(BOLD, 38), fill=(232, 238, 246))
    lf = font(SEMI, 24)
    lw = d.textlength(label.upper(), font=lf)
    d.rounded_rectangle((72, 196, 72 + lw + 36, 240), radius=22, fill=(45, 212, 191, 40), outline=(45, 212, 191, 160), width=2)
    d.text((90, 204), label.upper(), font=lf, fill=(153, 246, 228))
    size = 68
    while True:
        tf = font(BOLD, size)
        lines = wrap(d, title, tf, 760)
        if len(lines) <= 3 or size <= 44: break
        size -= 4
    y = 270
    for ln in lines[:4]:
        d.text((72, y), ln, font=tf, fill=(244, 247, 251))
        y += int(size * 1.14)
    d.text((72, 548), host + "  ·  US & Canada  ·  Not medical advice", font=font(SEMI, 24), fill=(154, 169, 187))
    img.convert("RGB").quantize(colors=200, method=Image.Quantize.MEDIANCUT).save(path, optimize=True)

def render_all(out, jobs, site, host):
    os.makedirs(os.path.join(out, "og"), exist_ok=True)
    base = background()
    for key, label, title in jobs:
        render(os.path.join(out, "og", key + ".png"), base, label, title, site, host)
    a = os.path.join(out, "assets")
    for n, s in (("logo-512.png", 512), ("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)):
        bg = Image.new("RGBA", (s, s), BG + (255,))
        bg.alpha_composite(mark(int(s * .72)), (int(s * .14), int(s * .14)))
        bg.convert("RGB").save(os.path.join(a, n), optimize=True)
    ico = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    ico.alpha_composite(mark(64))
    ico.save(os.path.join(out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Rendered {len(jobs)} Open Graph images")
