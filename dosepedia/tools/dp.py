"""Shared constants, page chrome, and helpers for the Dosepedia build."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "base"
SITE = "https://dosepedia.com"
DATE = "2026-10-05"
DATE_H = "October 5, 2026"

CLUSTERS = [
    ("opioids", "Opioids"),
    ("benzodiazepines-sedatives", "Benzodiazepines and sedatives"),
    ("stimulants", "Stimulants"),
    ("gabapentinoids-dissociatives", "Gabapentinoids, dissociatives, and others"),
    ("cannabis-psychedelics", "Cannabis and psychedelics"),
    ("anabolic-steroids", "Anabolic steroids"),
    ("emerging", "Emerging and unscheduled substances"),
]
CLUSTER_LABEL = dict(CLUSTERS)
SCHEDS = [("I", "schedule-i", "Schedule I"), ("II", "schedule-ii", "Schedule II"), ("III", "schedule-iii", "Schedule III"),
          ("IV", "schedule-iv", "Schedule IV"), ("V", "schedule-v", "Schedule V"), ("NC", "not-federally-controlled", "Not federally controlled")]
SCHED_KEY = {a: b for a, b, c in SCHEDS}
SCHED_LABEL = {a: c for a, b, c in SCHEDS}
SCHED_FROM_KEY = {b: a for a, b, c in SCHEDS}
KINDS = {"rx": "Prescription medicine", "nomed": "No US medical route", "unregulated": "Unapproved or unregulated", "otc": "Over-the-counter medicine"}
KIND_FROM_LABEL = {v: k for k, v in KINDS.items()}

e = html.escape


def esc(s):
    """Escape text that has no markup."""
    return html.escape(s, quote=True)


def attr(s):
    return html.escape(s, quote=True)


def sched_badge(code, size="sm"):
    if code == "NC":
        return f'<span class="sched {size} none" title="Not federally controlled" aria-label="Not federally controlled">NC</span>'
    lbl = f"US Schedule {code} controlled substance"
    cls = f"sched {size}" if size else "sched"
    return f'<span class="{cls}" title="{lbl}" aria-label="{lbl}">{code}</span>'


def first_sentence(text):
    m = re.match(r"(.+?[.!?])(\s|$)", text)
    return m.group(1) if m else text


def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>"


# ---------------------------------------------------------------- chrome
class Chrome:
    """Header, footer, CSS and JS taken verbatim from an existing page."""

    def __init__(self):
        s = (BASE / "drugs/tramadol/index.html").read_text()
        self.style = re.search(r"<style>.*?</style>", s, re.S).group(0)
        self.fonts = re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?display=swap">', s).group(0)
        self.favicon = re.search(r'<link rel="icon" href="data:[^"]*">', s).group(0)
        hdr = s[s.index("<body>") + 7: s.index('<main id="main">')]
        self.header = hdr.replace("../../", "{R}").replace(" aria-current=page", "")
        ftr = s[s.index("</main>") + 8: s.index('<script type="application/json" id="search-index">')]
        self.footer = ftr.replace("../../", "{R}")
        self.js = s[s.index("<script>(function(){"): s.index("</body>")]

    def head(self, R, title, desc, path, og_type="article", image=None, image_alt="", ld=None, robots="noindex,follow", extra=""):
        url = SITE + "/" + path
        img = SITE + "/" + (image or "assets/img/og/default.png")
        t_full = title if title.endswith("| Dosepedia") else f"{title} | Dosepedia"
        og_t = title.replace(" | Dosepedia", "")
        return (
            "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
            f"<title>{esc(t_full)}</title>\n<meta name=\"description\" content=\"{attr(desc)}\">\n"
            f"<meta name=\"robots\" content=\"{robots}\">\n<meta name=\"theme-color\" content=\"#0B5563\">\n"
            f"<link rel=\"canonical\" href=\"{url}\">\n{self.favicon}\n"
            + icon_links(R) +
            "<link rel=\"alternate\" type=\"application/rss+xml\" title=\"Dosepedia blog\" href=\"https://dosepedia.com/blog/feed.xml\">\n"
            f"<meta property=\"og:type\" content=\"{og_type}\"><meta property=\"og:site_name\" content=\"Dosepedia\"><meta property=\"og:title\" content=\"{attr(og_t)}\">\n"
            f"<meta property=\"og:description\" content=\"{attr(desc)}\"><meta property=\"og:url\" content=\"{url}\">\n"
            + og_image_tags(img, image_alt or og_t) +
            f"{self.fonts}\n{self.style}\n"
            + (jsonld(ld) + "\n" if ld else "") + extra + "</head>\n"
        )

    def body(self, R, main, nav=None, search_json="[]"):
        hdr = self.header.replace("{R}", R)
        if nav:
            hdr = hdr.replace(f'<a href="{R}{nav}">', f'<a href="{R}{nav}" aria-current=page>', 1)
        ftr = self.footer.replace("{R}", R)
        return (f"<body>\n{hdr}<main id=\"main\">\n{main}\n</main>\n{ftr}"
                f"<script type=\"application/json\" id=\"search-index\">{search_json}</script>\n{self.js}</body>\n</html>\n")


def icon_links(R):
    return (f'<link rel="icon" type="image/png" sizes="32x32" href="{R}assets/img/favicon-32.png">'
            f'<link rel="apple-touch-icon" href="{R}assets/img/apple-touch-icon.png">'
            f'<link rel="manifest" href="{R}site.webmanifest">\n')


def og_image_tags(img_abs, alt):
    return (f'<meta property="og:image" content="{img_abs}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
            f'<meta property="og:image:alt" content="{attr(alt)}">\n'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{img_abs}">\n')


# Extra CSS appended to the shared stylesheet on every page
EXTRA_CSS = """
/* images and blog (added) */
.k-otc{color:var(--brand-2)}
.hero-sm>.wrap{position:relative}
.drug-art{position:absolute;right:1.25rem;top:3.25rem;width:13.5rem;margin:0;pointer-events:none}
.drug-art img{display:block;width:100%;height:auto;border-radius:28px;box-shadow:var(--shadow-lg)}
@media (min-width:1181px){.hero-sm>.wrap:has(.drug-art) .title{max-width:calc(100% - 15rem)}}
@media (max-width:1180px){.drug-art{display:none}}
.guide-link{display:flex;align-items:center;gap:.9rem;margin:2rem 0 0;padding:1rem 1.15rem;border:1px solid var(--rule);border-radius:var(--r);background:var(--surface);color:var(--ink);text-decoration:none}
.guide-link:hover{border-color:var(--brand)}
.guide-link img{width:5.5rem;height:auto;border-radius:10px;flex:none}
.guide-link b{display:block;font-family:var(--serif);font-weight:600;font-size:1.1rem;line-height:1.3}
.guide-link span{color:var(--muted);font-size:.92rem}
.card.post-card{padding:0;display:flex;flex-direction:column;border:1px solid var(--rule);border-radius:var(--r);background:var(--surface);color:var(--ink);text-decoration:none;overflow:hidden;transition:border-color .2s,box-shadow .2s}
.post-card:hover{border-color:var(--brand);box-shadow:var(--shadow)}
.post-card img{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover;background:var(--tint)}
.post-card .pc-body{display:flex;flex-direction:column;gap:.4rem;padding:1rem 1.15rem 1.2rem;flex:1}
.post-card h3{margin:0;font-size:1.12rem;line-height:1.3}
.post-card p{margin:0;color:var(--muted);font-size:.93rem}
.post-card .pc-meta{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;font-size:.8rem;color:var(--muted)}
.post-cover{margin:1.5rem 0 0}
.post-cover img{display:block;width:100%;height:auto;border-radius:var(--r);box-shadow:var(--shadow)}
.answer{font-size:1.15rem;line-height:1.6;border-left:4px solid var(--brand-2);padding:.25rem 0 .25rem 1.1rem;margin:2rem 0 1.5rem}
.takeaways{background:var(--tint-2);border:1px solid var(--rule);border-radius:var(--r);padding:1.1rem 1.35rem 1.2rem;margin:0 0 1.5rem}
.takeaways h2{margin:0 0 .6rem;font-size:1.2rem}
.takeaways ul{margin:0;padding-left:1.2rem}
.post-toc{font-size:.95rem;margin:0 0 1.5rem}
.post-toc ol{margin:.4rem 0 0;padding-left:1.2rem;columns:2;column-gap:2rem}
@media (max-width:700px){.post-toc ol{columns:1}}
.post .tbl{margin:1rem 0 1.5rem}
.post .cta-row{display:flex;flex-wrap:wrap;gap:.6rem;margin:2rem 0}
.post .cta-row a{display:inline-flex;align-items:center;padding:.6rem 1rem;border-radius:2rem;background:var(--tint);color:var(--brand);font-weight:700;text-decoration:none;font-size:.95rem}
.post .cta-row a:hover{background:var(--brand);color:var(--paper)}
.reviewed{font-size:.9rem;color:var(--muted);border-top:1px solid var(--rule);padding-top:1rem;margin-top:2.5rem}
"""


def with_extra_css(style_block):
    if "/* images and blog (added) */" in style_block:
        return style_block
    return style_block.replace("</style>", EXTRA_CSS + "</style>")
