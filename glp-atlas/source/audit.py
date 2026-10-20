#!/usr/bin/env python3
"""Pre-launch audit of the built site (../public_html). Mirrors the SEO / AEO / GEO / trust checks of common
site-audit tools so you can verify a build before uploading it.   Run:  python3 audit.py
"""
import os, re, sys, html, json
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "public_html")
sys.path.insert(0, HERE)
from build import CONFIG
DOMAIN = CONFIG["DOMAIN"]
HOST = urlparse(DOMAIN).netloc

def strip(h): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()

def main_html(h):
    m = re.search(r"<main[^>]*>(.*)</main>", h, re.S)
    return m.group(1) if m else h

def load():
    pages = {}
    for dp, _, fs in os.walk(ROOT):
        for f in fs:
            if f.endswith(".html"):
                p = os.path.join(dp, f)
                rel = "/" + os.path.relpath(p, ROOT).replace("\\", "/")
                pages[rel.replace("index.html", "")] = open(p, encoding="utf-8").read()
    return pages

CHECKS = []
MANUAL = []   # owner actions that code cannot complete (not scored)
def check(name, cat):
    def deco(fn): CHECKS.append((name, cat, fn)); return fn
    return deco

def indexable(h): return 'name="robots" content="noindex' not in h

@check("Canonical URL absolute & self-referencing", "Technical SEO")
def _(p, h):
    m = re.search(r'<link rel="canonical" href="([^"]+)"', h)
    if not m: return "missing"
    if m.group(1) != DOMAIN + p: return f"points to {m.group(1)}"

@check("Title 30–60 characters", "Technical SEO")
def _(p, h):
    t = html.unescape(re.search(r"<title>(.*?)</title>", h, re.S).group(1))
    if not 30 <= len(t) <= 60: return f"{len(t)} chars: {t}"

@check("Meta description 70–160 characters", "Technical SEO")
def _(p, h):
    m = re.search(r'<meta name="description" content="([^"]*)"', h)
    n = len(html.unescape(m.group(1))) if m else 0
    if not 70 <= n <= 160: return f"{n} chars"

@check("Exactly one H1 and no skipped heading levels", "Technical SEO")
def _(p, h):
    levels = [int(x) for x in re.findall(r"<h([1-6])[\s>]", main_html(h))]
    if levels.count(1) != 1: return f"{levels.count(1)} h1"
    for a, b in zip(levels, levels[1:]):
        if b > a + 1: return f"h{a} -> h{b}"

@check("No render-blocking scripts in <head>", "Speed & performance")
def _(p, h):
    head = h.split("</head>")[0]
    bad = [s for s in re.findall(r"<script\b[^>]*\bsrc=[^>]*>", head) if " defer" not in s and " async" not in s and 'type="module"' not in s]
    if bad: return f"{len(bad)} blocking"

@check("Author / byline", "GEO · AI search")
def _(p, h):
    if p in ("/",) : return
    if 'class="byline"' not in h and "Written by" not in h: return "no byline"

@check("Visible + machine-readable date", "GEO · AI search")
def _(p, h):
    if "<time datetime=" not in main_html(h): return "no <time> in content"

@check("Cites authoritative external sources", "GEO · AI search")
def _(p, h):
    m = main_html(h)
    ext = [u for u in re.findall(r'href="(https?://[^"]+)"', m) if HOST not in u and not re.search(r"wa\.me|facebook\.com/sharer|linkedin\.com/sharing|twitter\.com/intent|x\.com/intent", u)]
    if not ext: return "no outbound citations"

@check("TL;DR on long pages (800+ words)", "AEO · answer engines")
def _(p, h):
    m = main_html(h)
    if len(strip(m).split()) >= 800 and 'class="tldr' not in m: return "no summary"

@check("Visuals on long pages (500+ words)", "Content quality")
def _(p, h):
    m = main_html(h)
    if len(strip(m).split()) >= 500 and not re.search(r"<(img|video|picture)\b|<svg[^>]*role=\"img\"", m): return "no image/figure"

@check("Blog posts have BlogPosting schema", "Structured data")
def _(p, h):
    if re.match(r"^/blog/[^/]+/$", p) and '"BlogPosting"' not in h: return "missing BlogPosting"

@check("Share links on content pages", "Social (SMO)")
def _(p, h):
    if not re.match(r"^/(drugs|compare|guides|questions|blog)/[^/]+/$|^/(semaglutide|tirzepatide|insulin|diabetes-injections|weight-loss-injections)/$", p): return
    if "wa.me" not in h or "linkedin.com/sharing" not in h: return "no share links"

@check("Primary CTA above the fold (home)", "Trust, local & conversion")
def _(p, h):
    if p != "/": return
    hero = re.search(r'<section class="hero">(.*?)</section>', h, re.S)
    if not hero or 'class="btn' not in hero.group(1): return "no CTA in hero"

@check("Forms submit securely with spam protection", "Security & best practice")
def _(p, h):
    for f in re.findall(r"<form\b[^>]*>.*?</form>", h, re.S):
        tag = re.match(r"<form\b[^>]*>", f).group(0)
        act = re.search(r'action="([^"]*)"', tag)
        net = "data-netlify" in tag
        same_origin = act and act.group(1).startswith("/") and DOMAIN.startswith("https://")  # posts to this HTTPS site (e.g. /contact.php)
        if not net and not same_origin and (not act or not act.group(1).startswith("https://")): return "insecure or missing action"
        if "honeypot" not in tag and "bot-field" not in f and "h-captcha" not in f and "cf-turnstile" not in f: return "no spam protection"

@check("FAQ schema where questions are answered", "AEO · answer engines")
def _(p, h):
    qs = re.findall(r"<(?:h2|h3|summary)[^>]*>([^<]*\?)\s*<", main_html(h))
    if len(qs) >= 2 and '"FAQPage"' not in h: return f"{len(qs)} questions, no FAQPage"

@check("No placeholder / template leftovers", "Content quality")
def _(p, h):
    for pat in (r"lorem ipsum", r"\[your [a-z ]+\]", r"\[client[a-z ]*\]", r"\{\{[^}]+\}\}", r"example\.com", r"123-456-7890", r"john doe"):
        if re.search(pat, strip(h), re.I): return f"found {pat}"

@check("Readable (≤ 25 words per sentence)", "Content quality")
def _(p, h):
    blocks = [strip(b) for b in re.findall(r"<(?:p|li|dd)\b[^>]*>(.*?)</(?:p|li|dd)>", main_html(h), re.S)]
    sents = [s for b in blocks for s in re.split(r"(?<=[.!?;:])\s+", b) if len(s.split()) > 2]
    if sents and sum(len(s.split()) for s in sents) / len(sents) > 25: return "long sentences"

@check("Healthy text-to-code ratio (≥ 10%)", "Content quality")
def _(p, h):
    r = len(strip(re.sub(r"<(script|style)[^>]*>.*?</\1>", "", h, flags=re.S))) / max(len(h), 1)
    if r < .10: return f"{r:.1%} text"

@check("Images have alt text", "Accessibility")
def _(p, h):
    if re.search(r"<img(?![^>]*\balt=)[^>]*>", h): return "img without alt"

@check("Current page marked in navigation", "Accessibility")
def _(p, h):
    nav = re.search(r'<nav class="main".*?</nav>', h, re.S)
    if p != "/" and nav and 'aria-current="page"' not in nav.group(0): return "no aria-current in menu"

def site_checks(pages):
    out = []
    sm = open(os.path.join(ROOT, "sitemap.xml")).read()
    locs = re.findall(r"<loc>([^<]+)</loc>", sm)
    off = [u for u in locs if not u.startswith(DOMAIN)]
    idx = [p for p, h in pages.items() if indexable(h)]
    missing = [p for p in idx if DOMAIN + p not in locs]
    out.append(("XML sitemap valid & complete", "Technical SEO", None if not off and not missing else f"{len(off)} off-domain, {len(missing)} missing"))
    rb = open(os.path.join(ROOT, "robots.txt")).read()
    out.append(("robots.txt allows crawl + absolute sitemap", "Technical SEO", None if f"Sitemap: {DOMAIN}/sitemap.xml" in rb and "Disallow: /\n" not in rb else "check robots.txt"))
    home = pages["/"]
    ver = "google-site-verification" in home or "msvalidate.01" in home
    MANUAL.append(("Search Console / Bing verification", "done in Google/Bing dashboards — paste codes in CONFIG GOOGLE_VERIFY / BING_VERIFY, or verify by DNS" if not ver else None))
    out.append(("llms.txt present", "GEO · AI search", None if os.path.exists(os.path.join(ROOT, "llms.txt")) else "missing"))
    return out

def run():
    pages = load()
    total = fails = 0
    report = []
    for name, cat, fn in CHECKS:
        bad = []
        for p, h in sorted(pages.items()):
            if not indexable(h): continue
            r = fn(p, h)
            if r: bad.append((p, r))
        n = sum(1 for h in pages.values() if indexable(h))
        total += 1; fails += bool(bad)
        report.append((name, cat, bad, n))
    for name, cat, res in site_checks(pages):
        total += 1; fails += bool(res)
        report.append((name, cat, [("site", res)] if res else [], 1))
    for name, cat, bad, n in report:
        print(("PASS " if not bad else "FAIL ") + f"[{cat}] {name}" + (f" — {len(bad)}/{n}" if bad else ""))
        for p, r in bad[:6]: print(f"       {p}: {r}")
        if len(bad) > 6: print(f"       … +{len(bad) - 6} more")
    for name, todo in MANUAL:
        if todo: print(f"TODO [owner action] {name}: {todo}")
    print(f"\n{total - fails}/{total} checks pass ({round(100 * (total - fails) / total)}%)")
    return fails

if __name__ == "__main__":
    sys.exit(1 if run() else 0)
