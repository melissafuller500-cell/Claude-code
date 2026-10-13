"""Convert the 1200x630 share/blog card PNGs to JPEG and update every reference to them.

The cards are dithered palette PNGs; the grain makes them ~220 KB each. Blurring only the flat
background (text and edges are kept from the original) and saving as JPEG gives ~65 KB with no
visible change.

usage: python3 -I compress_cards.py <site_dir>
"""
import glob
import os
import re
import sys

from PIL import Image, ImageChops, ImageFilter

ROOT = sys.argv[1]
os.chdir(ROOT)

cards = [f for f in glob.glob("assets/img/og/**/*.png", recursive=True) + glob.glob("assets/img/blog/*.png")
         if Image.open(f).size == (1200, 630)]
for f in cards:
    rgb = Image.open(f).convert("RGB")
    soft = rgb.filter(ImageFilter.GaussianBlur(1.2))
    edges = ImageChops.difference(rgb, soft).convert("L").point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(5))
    Image.composite(rgb, soft, edges).save(f[:-4] + ".jpg", quality=82, optimize=True, progressive=True)
    os.remove(f)

pat = re.compile(r"(assets/img/(?:og|blog)/[A-Za-z0-9/_.-]+?)\.png")
changed = 0
for f in glob.glob("**/*", recursive=True):
    if os.path.isfile(f) and f.endswith((".html", ".xml", ".txt", ".webmanifest", ".json")):
        s = open(f, encoding="utf-8").read()
        t = pat.sub(r"\1.jpg", s).replace('content="image/png"', 'content="image/jpeg"')
        if t != s:
            open(f, "w", encoding="utf-8").write(t)
            changed += 1
print({"cards": len(cards), "files_updated": changed})
