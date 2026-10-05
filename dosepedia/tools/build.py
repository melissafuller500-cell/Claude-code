#!/usr/bin/env python3
"""Build Dosepedia: base site (50 profiles) + 56 new profiles, images, and a blog guide per substance.

Usage:
  python3 tools/build.py              # writes dosepedia/site/ (deployable) and dosepedia/dist/*.zip
  python3 tools/build.py --index      # same, but lets search engines index pages (only after medical review)

Output:
  dosepedia/site/       pretty URLs (folder/index.html), for upload to the web host
  dist/dosepedia-site-upload.zip and dist/dosepedia-offline-preview.zip (links end in index.html for local browsing)
"""
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import dp
from dp import ROOT, BASE, SITE, DATE, CLUSTERS, CLUSTER_LABEL, SCHEDS, SCHED_LABEL, KINDS, Chrome, with_extra_css, og_image_tags, icon_links, esc
import drugpage
import hubs
import blog
import images
from records import all_records, page_data

OUT = ROOT / "site"
DIST = Path(os.environ.get("DOSEPEDIA_DIST", ROOT / "dist"))
INDEX = "--index" in sys.argv
ROBOTS = "index,follow,max-image-preview:large" if INDEX else "noindex,follow"


def rel_root(path):
    """Relative root prefix for a page path like 'drugs/x/index.html'."""
    if path == "404.html":
        return "/"
    depth = path.count("/")
    return "./" if depth == 0 else "../" * depth


TEXT_FIXES = [(re.compile(r"\bLsd\b"), "LSD"), (re.compile(r"\bDmt\b"), "DMT"), (re.compile(r"\bMdma\b"), "MDMA"), (re.compile(r"\bPcp\b"), "PCP"),
              (re.compile(r"\blsd\b"), "LSD"), (re.compile(r"\bdmt\b"), "DMT"), (re.compile(r"\bmdma\b"), "MDMA"), (re.compile(r"\bpcp\b"), "PCP")]


def fix_text(s):
    """Fix capitalization bugs in visible text only (not in URLs or attributes)."""
    def node(m):
        t = m.group(1)
        for rx, rep in TEXT_FIXES:
            t = rx.sub(rep, t)
        return ">" + t + "<"
    head, sep, body = s.partition("<body>")
    if not sep:
        return s
    body = re.sub(r">([^<]+)<", node, body)
    return head + sep + body


def finalize(s, path, chrome, search, og_image, og_alt):
    R = rel_root(path)
    s = re.sub(r"<style>.*?</style>", lambda m: chrome.style, s, count=1, flags=re.S)
    s = re.sub(r"<script>\(function\(\)\{.*?</script>\s*(?=</body>)", lambda m: chrome.js, s, count=1, flags=re.S)
    s = re.sub(r'(<script type="application/json" id="search-index">).*?(</script>)', lambda m: m.group(1) + search[R] + m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'<meta name="robots" content="[^"]*">', f'<meta name="robots" content="{ROBOTS}">', s, count=1)
    if 'property="og:image"' not in s:
        s = re.sub(r'(<meta property="og:url" content="[^"]*">\n?)', lambda m: m.group(1) + ("" if m.group(1).endswith("\n") else "\n") + og_image_tags(f"{SITE}/{og_image}", og_alt), s, count=1)
    if "apple-touch-icon" not in s:
        s = re.sub(r"(<link rel=\"icon\" href=\"data:[^\"]*\">\n)", lambda m: m.group(1) + icon_links(R), s, count=1)
    s = s.replace("synthetic THC..", "synthetic THC.")
    return fix_text(s)


def h1_text(s):
    m = re.search(r"<h1>(.*?)</h1>", s, re.S)
    t = re.sub(r"<small>.*?</small>", "", m.group(1)) if m else "Dosepedia"
    return blog.text(t)


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(BASE, OUT)
    chrome = Chrome()
    chrome.style = with_extra_css(chrome.style)
    chrome.js = hubs.patch_js(chrome.js)
    recs, by_cluster = all_records()
    R2 = {r["slug"]: r for r in recs}
    base_drugs_index = (BASE / "drugs/index.html").read_text()
    hubs.init(base_drugs_index)
    warn_svg = re.search(r'<p class="warn" role="note">(<svg.*?</svg>)', (BASE / "drugs/tramadol/index.html").read_text(), re.S).group(1)
    roots = ["./", "../", "../../", "/"]
    search = {R: hubs.search_index(recs, R) for R in roots}
    news_posts = []

    def guide_link(d, R):
        P = d if "slug" in d else d
        r = R2[P["slug"]]
        return (f'<a class="guide-link" href="{R}blog/{blog.post_slug(r["slug"])}/"><img src="{R}assets/img/blog/{r["slug"]}.png" alt="" width="1200" height="630" loading="lazy">'
                f'<div><b>Read the {esc(r.get("data", {}).get("short") or r["name"])} guide</b><span>Key takeaways, quick facts, and answers to common questions.</span></div></a>')

    ctx = dict(by_cluster=by_cluster, warn_svg=warn_svg, guide_link=guide_link)
    all_cites = set()

    # ---- new drug pages
    for r in recs:
        if not r["new"]:
            continue
        head, main_html, cites = drugpage.render(r["data"], ctx, chrome)
        all_cites.update(cites)
        page = head + chrome.body("../../", main_html, nav="drugs/", search_json=search["../../"])
        page = page.replace('<meta name="robots" content="noindex,follow">', f'<meta name="robots" content="{ROBOTS}">')
        p = OUT / "drugs" / r["slug"] / "index.html"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(fix_text(page))

    # ---- existing drug pages: art, guide link, structured data images
    for r in recs:
        if r["new"]:
            continue
        p = OUT / "drugs" / r["slug"] / "index.html"
        s = p.read_text()
        all_cites.update(re.findall(r'<li id="src-\d+"><a href="([^"]+)"', s))
        R = "../../"
        if "drug-art" not in s:
            s = s.replace('<p class="quick">', f'<figure class="drug-art" aria-hidden="true"><img src="{R}assets/img/drugs/{r["slug"]}.svg" alt="" width="216" height="216"></figure>\n<p class="quick">', 1)
        if "guide-link" not in s:
            s = s.replace('<section class="related"', guide_link(r, R) + '<section class="related"', 1)

        def add_img(m):
            d = json.loads(m.group(1))
            for g in d.get("@graph", []):
                if g.get("@type") == "MedicalWebPage":
                    g["primaryImageOfPage"] = f"{SITE}/assets/img/og/drugs/{r['slug']}.png"
                if g.get("@type") == "Drug":
                    g["image"] = f"{SITE}/assets/img/og/drugs/{r['slug']}.png"
            return dp.jsonld(d)
        s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', add_img, s, count=1, flags=re.S)
        p.write_text(finalize(s, f"drugs/{r['slug']}/index.html", chrome, search, f"assets/img/og/drugs/{r['slug']}.png", f"{r['name']}: Dosepedia drug profile"))

    # ---- hubs
    w = OUT / "drugs/index.html"
    w.write_text(hubs.drugs_index(w.read_text(), recs))
    for key, _ in CLUSTERS:
        p = OUT / "class" / key / "index.html"
        p.write_text(hubs.class_page(p.read_text(), key, recs, [r["name"] for r in recs if r["new"] and r["cluster"] == key]))
    for code, key, _ in SCHEDS:
        p = OUT / "schedules" / key / "index.html"
        p.write_text(hubs.schedule_page(p.read_text(), code, recs))
    p = OUT / "legal-status/index.html"
    p.write_text(hubs.legal_status(p.read_text(), recs))
    base_items = page_data("interactions/index.html")["items"]
    for t in ("interactions", "compare"):
        p = OUT / t / "index.html"
        p.write_text(hubs.tools_page(p.read_text(), recs, base_items))
    new_panels = {}
    no_panel = {"naloxone", "naltrexone", "ayahuasca", "2c-b", "ibogaine", "5-meo-dmt", "salvia", "cbd", "daridorexant", "solriamfetol",
                "zuranolone", "lacosamide", "brivaracetam", "cenobamate", "pseudoephedrine", "amanita-muscaria"}
    for r in recs:
        if r["new"] and r["slug"] not in no_panel:
            new_panels[r["slug"]] = hubs.withdrawal_panel(r["data"], hubs.ARROW)
    p = OUT / "withdrawal/index.html"
    p.write_text(hubs.withdrawal_page(p.read_text(), recs, new_panels))

    # ---- images (before blog so file sizes are known)
    img = OUT / "assets/img"
    images.icons(img)
    for r in recs:
        (img / "drugs").mkdir(parents=True, exist_ok=True)
        (img / "drugs" / f"{r['slug']}.svg").write_text(images.drug_svg(r))
        images.og_drug(r, img / "og/drugs" / f"{r['slug']}.png", CLUSTER_LABEL[r["cluster"]], SCHED_LABEL[r["sched"]], KINDS[r["kind"]])

    # ---- blog guides
    for r in recs:
        prof = (OUT / "drugs" / r["slug"] / "index.html").read_text()
        r["_P"] = blog.parse_profile(prof)
        r["_post"] = dict(title=blog.headline(r, r["_P"]), desc=blog.meta_desc(r, r["_P"]), url=f"{SITE}/blog/{blog.post_slug(r['slug'])}/",
                          cover=f"assets/img/blog/{r['slug']}.png")
    for r in recs:
        images.blog_cover(r, r["_post"]["title"], img / "blog" / f"{r['slug']}.png", CLUSTER_LABEL[r["cluster"]])
        r["_post"]["cover_bytes"] = (img / "blog" / f"{r['slug']}.png").stat().st_size
    for r in recs:
        related = [x for x in by_cluster[r["cluster"]] if x["slug"] != r["slug"]]
        i = [x["slug"] for x in by_cluster[r["cluster"]]].index(r["slug"])
        related = (related[i:] + related[:i])[:3]
        page, meta = blog.render_post(r, r["_P"], related, chrome, search["../../"])
        page = page.replace('<meta name="robots" content="noindex,follow">', f'<meta name="robots" content="{ROBOTS}">')
        p = OUT / "blog" / blog.post_slug(r["slug"]) / "index.html"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(fix_text(page))
    base_blog = (BASE / "blog/index.html").read_text()
    (OUT / "blog/index.html").write_text(finalize(blog.render_index(base_blog, base_drugs_index, recs, chrome, search["../"]), "blog/index.html", chrome, search, "assets/img/og/pages/blog.png", "Dosepedia blog"))
    tele = ("Can controlled medicines be prescribed by telehealth in 2026?", f"{SITE}/blog/telehealth-controlled-medicines-2026/",
            "Federal rules let DEA-registered clinicians prescribe controlled medicines after a telemedicine visit through December 31, 2026.")
    (OUT / "blog/feed.xml").write_text(blog.feed(recs, [tele]))

    # home "latest updates": telehealth news + newest guides for the new substances
    feat = [R2[s] for s in ("naloxone", "7-hydroxymitragynine", "delta-8-thc", "medetomidine") if s in R2]
    news = '<ul class="news">' + re.search(r'<ul class="news">(<li>.*?</li>)', (BASE / "index.html").read_text(), re.S).group(1) + "".join(
        f'<li><a href="./blog/{blog.post_slug(r["slug"])}/"><time datetime="{DATE}">{dp.DATE_H}</time><strong>{esc(r["_post"]["title"])}</strong><span>{esc(r["_post"]["desc"])}</span></a></li>' for r in feat) + "</ul>"

    # ---- all remaining pages: shared CSS/JS, search, icons, social images
    n_sources = len(all_cites)
    page_og = {}
    for f in sorted(OUT.rglob("*.html")):
        path = f.relative_to(OUT).as_posix()
        if path.startswith("drugs/") and path != "drugs/index.html":
            continue
        if path.startswith("blog/") and path not in ("blog/index.html", "blog/telehealth-controlled-medicines-2026/index.html"):
            continue
        if path == "blog/index.html":
            continue
        s = f.read_text()
        if path == "index.html":
            s = hubs.home(s, recs, n_sources, news)
        key = "home" if path == "index.html" else path.replace("/index.html", "").replace("/", "-").replace(".html", "")
        title = h1_text(s)
        sub = blog.text(re.search(r'<p class="(?:quick|lede)">(.*?)</p>', s, re.S).group(1)) if re.search(r'<p class="(?:quick|lede)">', s) else ""
        if key == "home":
            title, sub = "Clear, sourced answers about drugs and medicines", f"Uses, risks, interactions, overdose, withdrawal, and the law for {len(recs)} substances."
        color = images.PALETTE.get(key.replace("class-", ""), ("#0B5563",))[0]
        images.og_page(title, sub[:160], img / "og/pages" / f"{key}.png", slug=key, color=color)
        page_og[path] = f"assets/img/og/pages/{key}.png"
        s = finalize(s, path, chrome, search, page_og[path], title)
        if path == "index.html":
            s = s.replace('{"@type":"Organization","@id":"https://dosepedia.com/#org","name":"Dosepedia","url":"https://dosepedia.com/"}',
                          '{"@type":"Organization","@id":"https://dosepedia.com/#org","name":"Dosepedia","url":"https://dosepedia.com/","logo":"https://dosepedia.com/assets/img/logo.png"}')
        f.write_text(s)
    images.og_page("Blog: drug guides and safety updates", f"Answer-first guides to {len(recs)} substances", img / "og/pages/blog.png", slug="blog")

    # ---- sitemap, robots, llms.txt, manifest
    urls = []
    for f in sorted(OUT.rglob("*.html")):
        path = f.relative_to(OUT).as_posix()
        if path == "404.html":
            continue
        loc = SITE + "/" + path.replace("index.html", "")
        imgx = ""
        if path.startswith("drugs/") and path != "drugs/index.html":
            sl = path.split("/")[1]
            imgx = f"<image:image><image:loc>{SITE}/assets/img/og/drugs/{sl}.png</image:loc></image:image>"
        elif path.startswith("blog/") and path.count("/") == 2 and path.split("/")[1].endswith("-explained"):
            sl = path.split("/")[1][: -len("-explained")]
            imgx = f"<image:image><image:loc>{SITE}/assets/img/blog/{sl}.png</image:loc></image:image>"
        urls.append(f"<url><loc>{loc}</loc><lastmod>{DATE}</lastmod>{imgx}</url>")
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' + "".join(urls) + "</urlset>")
    (OUT / "robots.txt").write_text("User-agent: *\nAllow: /\n\n# AI and answer-engine crawlers are welcome to read and cite Dosepedia\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: https://dosepedia.com/sitemap.xml\n")
    (OUT / "llms.txt").write_text(blog.llms_txt(recs))
    (OUT / "site.webmanifest").write_text(json.dumps({"name": "Dosepedia", "short_name": "Dosepedia", "start_url": "/", "display": "standalone", "background_color": "#F6F8F7", "theme_color": "#0B5563",
                                                      "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=1))
    print(f"built {len(recs)} profiles ({sum(r['new'] for r in recs)} new), {len(recs)} guides, {n_sources} unique sources -> {OUT}")
    make_zips()


PREVIEW_RX = re.compile(r'((?:href|src|action)="|"u":"|"url":")((?:\.{1,2}/|/)[^"#?]*)([?#][^"]*)?"')


def to_preview(s):
    def rep(m):
        pre, path, tail = m.group(1), m.group(2), m.group(3) or ""
        if path.startswith("//") or not path.endswith("/"):
            return m.group(0)
        return f'{pre}{path}index.html{tail}"'
    return PREVIEW_RX.sub(rep, s)


def make_zips():
    DIST.mkdir(parents=True, exist_ok=True)
    site_zip = DIST / "dosepedia-site-upload.zip"
    prev_zip = DIST / "dosepedia-offline-preview.zip"
    with zipfile.ZipFile(site_zip, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(OUT.rglob("*")):
            if f.is_file():
                z.write(f, "dosepedia-site/" + f.relative_to(OUT).as_posix())
    with zipfile.ZipFile(prev_zip, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(OUT.rglob("*")):
            if not f.is_file():
                continue
            arc = "dosepedia-preview/" + f.relative_to(OUT).as_posix()
            if f.suffix == ".html":
                z.writestr(arc, to_preview(f.read_text()))
            else:
                z.write(f, arc)
    print("zips:", site_zip, prev_zip)


if __name__ == "__main__":
    main()
