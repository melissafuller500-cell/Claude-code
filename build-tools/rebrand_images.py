"""Replace the baked-in "Dosepedia" wordmark and "dosepedia.com" footer text in PNG cards.

usage: python3 -I rebrand_images.py <font_ttf> <png> [<png> ...]   (edits files in place)
"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = sys.argv[1]


def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([weight])
    return f


def dist(a, b):
    return max(abs(a[i] - b[i]) for i in range(3))


def row_bg(px, y, x0, x1):
    a, b = px[x0, y], px[x1, y]
    return lambda x: tuple(round(a[i] + (b[i] - a[i]) * (x - x0) / (x1 - x0)) for i in range(3))


def text_cols(px, x0, x1, y0, y1, th=40):
    cols = []
    for x in range(x0 + 1, x1):
        for y in range(y0, y1):
            if dist(px[x, y], row_bg(px, y, x0, x1)(x)) > th:
                cols.append(x)
                break
    return cols


def clusters(cols, gap):
    out = []
    for c in cols:
        if out and c - out[-1][1] <= gap:
            out[-1][1] = c
        else:
            out.append([c, c])
    return out


def ink(px, x0, x1, y0, y1, bx0, bx1):
    best, col = 0, None
    for y in range(y0, y1):
        bg = row_bg(px, y, bx0, bx1)
        for x in range(x0, x1):
            d = dist(px[x, y], bg(x))
            if d > best:
                best, col = d, px[x, y]
    return col


def erase(px, x0, x1, y0, y1):
    for y in range(y0, y1):
        bg = row_bg(px, y, x0, x1)
        for x in range(x0 + 1, x1):
            px[x, y] = bg(x)


def rows_with_text(px, x0, x1, y0, y1, th=40):
    ys = [y for y in range(y0, y1) if any(dist(px[x, y], row_bg(px, y, x0, x1)(x)) > th for x in range(x0 + 1, x1))]
    return (min(ys), max(ys)) if ys else None


def fit_size(text_parts, width):
    for size in range(10, 120):
        w = sum(font(size, wt).getlength(t) for t, wt in text_parts)
        if w >= width:
            return size
    return None


def draw_parts(d, x, baseline, size, parts):
    for t, wt, color in parts:
        f = font(size, wt)
        d.text((x, baseline), t, font=f, fill=color, anchor="ls")
        x += f.getlength(t)


def patch_wordmark(im, px, region):
    x0, x1, y0, y1 = region
    cl = clusters(text_cols(px, x0, x1, y0, y1), 12)
    if len(cl) < 2:
        return False
    tx0, tx1 = cl[1][0], cl[-1][1]
    ty = rows_with_text(px, tx0 - 2, tx1 + 2, y0, y1)
    if not ty:
        return False
    old = [("Dose", 400), ("pedia", 700)]
    size = fit_size(old, tx1 - tx0)
    split = tx0 + round(font(size, 400).getlength("Dose"))
    c1 = ink(px, tx0, split - 2, ty[0], ty[1] + 1, tx0 - 4, tx1 + 4)
    c2 = ink(px, split + 2, tx1, ty[0], ty[1] + 1, tx0 - 4, tx1 + 4)
    top = font(size, 700).getbbox("Dosepedia", anchor="ls")[1]
    baseline = ty[0] - top
    erase(px, tx0 - 4, tx1 + 6, y0, y1)
    draw_parts(ImageDraw.Draw(im), tx0, baseline, size, [("Dose", 400, c1), ("Uses", 700, c2)])
    return True


def patch_domain(im, px, region):
    x0, x1, y0, y1 = region
    cols = text_cols(px, x0, x1, y0, y1)
    if not cols:
        return False
    end = cols[-1]
    cl = clusters(cols, 6)
    start = cl[-1][0]
    ty = rows_with_text(px, start - 2, end + 2, y0, y1)
    size = fit_size([("dosepedia.com", 400)], end - start)
    c = ink(px, start, end, ty[0], ty[1] + 1, start - 4, end + 4)
    top = font(size, 400).getbbox("dosepedia.com", anchor="ls")[1]
    baseline = ty[0] - top
    erase(px, start - 3, min(end + 6, im.width - 1), y0, y1)
    draw_parts(ImageDraw.Draw(im), start, baseline, size, [("doseuses.com", 400, c)])
    return True


for path in sys.argv[2:]:
    im = Image.open(path)
    mode = im.mode
    im = im.convert("RGB")
    px = im.load()
    W, H = im.size
    if (W, H) == (1200, 630):
        ok1 = patch_wordmark(im, px, (40, 420, 45, 140))
        ok2 = patch_domain(im, px, (40, 1180, 556, 606))
    elif (W, H) == (600, 160):
        ok1 = patch_wordmark(im, px, (5, 595, 10, 150))
        ok2 = True
    else:
        continue
    if not (ok1 and ok2):
        print("SKIPPED", path, ok1, ok2)
        continue
    (im.convert(mode) if mode in ("RGBA", "P", "L") else im).save(path, optimize=True)
    print("ok", path)
