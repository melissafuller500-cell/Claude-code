#!/usr/bin/env python3
"""Static site generator for the GLP-1 reference site.
Edit CONFIG, then run:  python3 build.py   ->  output in ../public_html  (upload its contents to your web root)
Assets (CSS / JS / 3D background) live in ./assets and are copied with a cache-busting hash.
"""
import json, os, re, shutil, html, hashlib, datetime
from data_drugs import DRUGS, CATS, BOXED_GLP1, GLP1_COMMON, GLP1_SERIOUS, GLP1_AVOID, INSULIN_COMMON, INSULIN_SERIOUS, INSULIN_AVOID
from data_pages import COMPARES, GUIDES, TRUST
from data_extra import ALIASES, PILLARS, QUESTIONS, GLOSSARY

# ======================= CONFIG — edit these =======================
CONFIG = {
    "SITE": "GLP Atlas",                       # brand name (placeholder — check domain availability)
    "DOMAIN": "https://www.glpatlas.com",      # final domain, no trailing slash
    "EMAIL": "editor@glpatlas.com",            # editorial contact
    "EDITOR": "Dr. George Grunberger",
    "REVIEWER": "",                            # e.g. "Jane Doe, PharmD" — leave empty until a real licensed reviewer signs off
    "PUBLISHED": "2026-10-20",                 # first publication date (schema datePublished)
    "UPDATED": "2026-10-20",
    "FORM_ENDPOINT": "",                       # e.g. Formspree URL; empty = mailto fallback
    "SAME_AS": [],                             # official social / directory profiles, e.g. ["https://www.linkedin.com/company/…"]
}
# ===================================================================

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public_html")
E = html.escape
C = CONFIG
REVIEWER_TXT = C["REVIEWER"] or "pending — clinician review in progress"
DRUG = {d["slug"]: d for d in DRUGS}
SITEMAP = []      # (path, og image url)
LLM_PAGES = []    # (title, path, markdown) for llms-full.txt
SEARCH = []       # command-palette index
WARNINGS = []
ASSET_V = {}      # asset name -> short content hash

WEIGHT = {"wegovy", "wegovy-pill", "zepbound", "foundayo", "saxenda", "cagrisema", "retatrutide"}

def url(path): return C["DOMAIN"] + path

def human_date(iso):
    d = datetime.date.fromisoformat(iso)
    return d.strftime("%B ") + str(d.day) + d.strftime(", %Y")

def slugify(s): return re.sub(r"[^a-z0-9]+", "-", re.sub(r"<[^>]+>", "", s).lower()).strip("-")

def re_strip(h): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h)).strip()

def lower_first(s): return s[0].lower() + s[1:] if len(s) > 1 and s[1].islower() else s

def join_and(items):
    items = list(items)
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]

def asset(name): return f"/assets/{name}?v={ASSET_V.get(name, '1')}"

# ---------------------------------------------------------------- building blocks
def crumbs_html(items):
    return '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + "".join(
        f'<li><a href="{p}">{E(n)}</a></li>' if i < len(items) - 1 else f'<li aria-current="page">{E(n)}</li>'
        for i, (n, p) in enumerate(items)) + "</ol></nav>"

def crumbs_ld(items, canonical):
    return {"@type": "BreadcrumbList", "@id": canonical + "#breadcrumb", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": url(p)} for i, (n, p) in enumerate(items)]}

def faq_block(faqs):
    if not faqs: return "", None
    h = '<section class="faq-wrap"><h2 id="faq">Frequently asked questions</h2><div class="faq">' + "".join(
        f'<details><summary>{E(f["q"])}</summary><div class="faq-a"><p>{E(f["a"])}</p></div></details>' for f in faqs) + "</div></section>"
    node = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in faqs]}
    return h, node

def with_toc(body, skip=("Related", "Related medicines", "More questions")):
    """Give every <h2> an id and return (html, [(id, text)]) for the in-page table of contents."""
    toc, seen = [], set()
    def rep(m):
        attrs, inner = m.group(1), m.group(2)
        hid = re.search(r'id="([^"]+)"', attrs)
        hid = hid.group(1) if hid else slugify(inner)
        while hid in seen: hid += "-2"
        seen.add(hid)
        text = re_strip(inner)
        if text not in skip: toc.append((hid, text))
        attrs = re.sub(r'\s*id="[^"]*"', "", attrs)
        return f'<h2 id="{hid}"{attrs}>{inner}</h2>'
    return re.sub(r"<h2([^>]*)>(.*?)</h2>", rep, body, flags=re.S), toc

def toc_html(toc):
    if len(toc) < 2: return ""
    return ('<nav class="toc" aria-label="On this page"><p class="toc-h">On this page</p><ol>' +
            "".join(f'<li><a href="#{i}">{E(t)}</a></li>' for i, t in toc) + "</ol></nav>")

def updated_box():
    return (f'<div class="meta"><span class="meta-i">✓</span><span>Last reviewed <time datetime="{C["UPDATED"]}">{human_date(C["UPDATED"])}</time>'
            f' · Written by <a href="/about/#editor">{E(C["EDITOR"])}</a> · Medical review: {E(REVIEWER_TXT)} · <a href="/editorial-policy/">How we review</a></span></div>')

def drug_attrs(d):
    use = "weight" if d["slug"] in WEIGHT else ("emergency" if d["slug"] == "glucagon" else "diabetes")
    route = "oral" if "tablet" in d["form"].lower() else "injection"
    f = d["freq"].lower()
    freq = " ".join(x for x in ("weekly", "daily") if x in f) or "other"
    if "meal" in f: freq += " daily"
    return use, route, freq

def card(d):
    use, route, freq = drug_attrs(d)
    hay = (d["name"] + " " + d["generic"] + " " + d["cls"] + " " + " ".join(ALIASES.get(d["slug"], []))).lower()
    return (f'<a class="card" href="/drugs/{d["slug"]}/" data-search="{E(hay)}" data-cat="{d["cat"]}" data-use="{use}" data-route="{route}" data-freq="{freq}">'
            f'<span class="tag t-{d["cat"]}">{E(CATS[d["cat"]].split(" (")[0])}</span>'
            f'<strong>{E(d["name"])}</strong><span class="card-sub">{E(d["generic"])} · {E(d["freq"])}</span><span class="card-go" aria-hidden="true">→</span></a>')

def link_card(href, tag, title, sub=""):
    return (f'<a class="card" href="{href}"><span class="tag">{E(tag)}</span><strong>{E(title)}</strong>'
            + (f'<span class="card-sub">{E(sub)}</span>' if sub else "") + '<span class="card-go" aria-hidden="true">→</span></a>')

def tldr(text, label="Quick answer"):
    return f'<div class="tldr"><p class="tldr-h">{E(label)}</p><p>{text}</p></div>'

def ext(href, text): return f'<a href="{href}" rel="nofollow noopener" target="_blank">{text}<span class="ext" aria-hidden="true">↗</span></a>'

# ---------------------------------------------------------------- page shell
NAV = [("/drugs/", "Medicines"), ("/compare/", "Compare"), ("/guides/", "Guides"), ("/questions/", "Questions"), ("/glossary/", "Glossary")]

def og_key(path):
    return "home" if path == "/" else path.strip("/").replace("/", "-").replace(".html", "")

def page(path, title, desc, body, *, crumbs=None, nodes=None, kw=None, kind="MedicalWebPage", label="Guide",
         og_title=None, body_class="", article=True, search=None):
    canonical = url(path)
    indexable = path.endswith("/")
    suffix = f" | {C['SITE']}"
    if path == "/":
        full_title = f"{C['SITE']}: GLP-1, Weight-Loss & Diabetes Medicine Guide"
    else:
        full_title = title + suffix if len(title) + len(suffix) <= 62 else title
    if indexable:
        if len(full_title) > 65: WARNINGS.append(f"title {len(full_title)} chars: {path}")
        if not 70 <= len(desc) <= 165: WARNINGS.append(f"description {len(desc)} chars: {path}")
    key = og_key(path)
    og_img = url(f"/og/{key}.png")
    OG_JOBS.append((key, label, og_title or title))
    kwtag = f'\n<meta name="keywords" content="{E(", ".join(dict.fromkeys(kw[:14])))}">' if kw else ""
    robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" if indexable else "noindex"

    # --- one connected JSON-LD graph per page
    org = {"@type": "Organization", "@id": url("/#org"), "name": C["SITE"], "url": url("/"), "email": C["EMAIL"],
           "logo": {"@type": "ImageObject", "url": url("/assets/logo-512.png"), "width": 512, "height": 512},
           "publishingPrinciples": url("/editorial-policy/"), "correctionsPolicy": url("/editorial-policy/#corrections"),
           "ethicsPolicy": url("/editorial-policy/"), "actionableFeedbackPolicy": url("/contact/"),
           "areaServed": [{"@type": "Country", "name": "United States"}, {"@type": "Country", "name": "Canada"}],
           "knowsAbout": ["GLP-1 receptor agonists", "Semaglutide", "Tirzepatide", "Orforglipron", "Insulin", "Type 2 diabetes", "Obesity medicine"]}
    if C["SAME_AS"]: org["sameAs"] = C["SAME_AS"]
    site = {"@type": "WebSite", "@id": url("/#website"), "url": url("/"), "name": C["SITE"], "inLanguage": "en",
            "publisher": {"@id": url("/#org")}, "description": "Independent reference on GLP-1, incretin and insulin medicines for the United States and Canada."}
    editor = {"@type": "Person", "@id": url("/about/#editor"), "name": C["EDITOR"], "url": url("/about/"), "jobTitle": "Editor",
              "worksFor": {"@id": url("/#org")}}
    wp = {"@type": kind, "@id": canonical + "#webpage", "url": canonical, "name": title, "description": desc,
          "isPartOf": {"@id": url("/#website")}, "inLanguage": "en", "datePublished": C["PUBLISHED"], "dateModified": C["UPDATED"],
          "publisher": {"@id": url("/#org")},
          "primaryImageOfPage": {"@type": "ImageObject", "url": og_img, "width": 1200, "height": 630},
          "speakable": {"@type": "SpeakableSpecification", "cssSelector": ["h1", ".tldr"]}}
    if article:
        wp["author"] = {"@id": url("/about/#editor")}
    if kind == "MedicalWebPage":
        wp["lastReviewed"] = C["UPDATED"]
        wp["audience"] = {"@type": "Audience", "audienceType": "Patients and caregivers",
                          "geographicArea": [{"@type": "Country", "name": "United States"}, {"@type": "Country", "name": "Canada"}]}
        if C["REVIEWER"]: wp["reviewedBy"] = {"@type": "Person", "name": C["REVIEWER"]}
    graph = [org, site, editor, wp]
    crumb_nav = ""
    if crumbs:
        graph.append(crumbs_ld(crumbs, canonical))
        wp["breadcrumb"] = {"@id": canonical + "#breadcrumb"}
        crumb_nav = crumbs_html(crumbs)
    for n in nodes or []:
        n = dict(n)
        if n.pop("_about", False): wp["about"] = {"@id": n["@id"]}; wp["mainEntity"] = {"@id": n["@id"]}
        graph.append(n)
    ld = '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False).replace("</", "<\\/") + "</script>"

    cur = ' aria-current="page"'
    nav = "".join(f'<a href="{h}"{cur if path.startswith(h) else ""}>{t}</a>' for h, t in NAV)
    og_type = "website" if path == "/" else "article"
    art_meta = (f'\n<meta property="article:published_time" content="{C["PUBLISHED"]}"><meta property="article:modified_time" content="{C["UPDATED"]}">'
                f'<meta property="article:author" content="{url("/about/")}">') if og_type == "article" else ""
    doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(full_title)}</title>
<meta name="description" content="{E(desc)}">{kwtag}
<link rel="canonical" href="{canonical}">
<meta name="robots" content="{robots}">
<link rel="alternate" hreflang="en-us" href="{canonical}"><link rel="alternate" hreflang="en-ca" href="{canonical}"><link rel="alternate" hreflang="x-default" href="{canonical}">
<meta name="author" content="{E(C['EDITOR'])}">
<meta name="theme-color" content="#070b14" media="(prefers-color-scheme: dark)"><meta name="theme-color" content="#f3f6fb" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="dark light">
<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="{E(C['SITE'])}"><meta property="og:locale" content="en_US"><meta property="og:locale:alternate" content="en_CA">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{E(og_title or title)}">{art_meta}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{E(title)}"><meta name="twitter:description" content="{E(desc)}"><meta name="twitter:image" content="{og_img}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{asset('style.css')}">
<script>(function(d){{d.className+=' js';try{{var t=localStorage.getItem('theme');if(t)d.setAttribute('data-theme',t)}}catch(e){{}}}})(document.documentElement)</script>
{ld}
</head>
<body class="{body_class}">
<a class="skip" href="#main">Skip to content</a>
<canvas id="bg3d" aria-hidden="true"></canvas><div class="bg-veil" aria-hidden="true"></div>
<div class="progress" aria-hidden="true"><span></span></div>
<header class="top"><div class="wrap bar">
<a class="logo" href="/" aria-label="{E(C['SITE'])} home"><svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><circle cx="16" cy="16" r="13" fill="none" stroke="url(#lg)" stroke-width="3"/><ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="url(#lg)" stroke-width="1.6" opacity=".7"/><circle cx="16" cy="16" r="4.2" fill="url(#lg)"/></svg><span>{E(C['SITE'])}</span></a>
<nav class="main" id="mainnav" aria-label="Main">{nav}</nav>
<div class="actions">
<button class="sbtn" type="button" data-open-palette aria-label="Search the site"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="sbtn-t">Search</span><kbd>⌘K</kbd></button>
<button class="ibtn" type="button" id="theme" aria-label="Toggle dark mode"><svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>
<button class="ibtn menu" type="button" aria-controls="mainnav" aria-expanded="false" aria-label="Open menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
</div>
</div></header>
<main id="main" class="wrap" tabindex="-1">{crumb_nav}{body}</main>
<footer class="foot"><div class="wrap">
<div class="cols">
<div class="foot-brand"><strong>{E(C['SITE'])}</strong><p>Independent information on GLP-1, incretin and insulin medicines for the US and Canada. We do not sell or ship medicines.</p><p class="small">Last site-wide review: <time datetime="{C['UPDATED']}">{human_date(C['UPDATED'])}</time></p></div>
<div><strong>Topics</strong><a href="/semaglutide/">Semaglutide</a><a href="/tirzepatide/">Tirzepatide</a><a href="/diabetes-injections/">Diabetes injections</a><a href="/weight-loss-injections/">Weight loss injections</a><a href="/insulin/">Insulin</a></div>
<div><strong>Site</strong><a href="/drugs/">All medicines</a><a href="/compare/">Comparisons</a><a href="/guides/">Guides</a><a href="/questions/">Questions</a><a href="/glossary/">Glossary</a></div>
<div><strong>Trust</strong><a href="/about/">About</a><a href="/editorial-policy/">Editorial policy</a><a href="/medical-disclaimer/">Medical disclaimer</a><a href="/affiliate-disclosure/">Affiliate disclosure</a><a href="/privacy/">Privacy</a><a href="/contact/">Contact</a></div>
</div>
<p class="small">Information only — not medical advice. Always follow your prescriber and the official label. In an emergency call 911. © 2026 {E(C['SITE'])}.</p>
</div></footer>
<a class="fab" href="/contact/" aria-label="Contact the editors"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg><span>Contact</span></a>
<button class="totop" type="button" aria-label="Back to top"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg></button>
<dialog class="palette" id="palette" aria-label="Search">
<div class="pal-in"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" id="pal-q" placeholder="Search medicines, questions, guides…" autocomplete="off" spellcheck="false" aria-label="Search" aria-controls="pal-list" aria-autocomplete="list"><kbd>Esc</kbd></div>
<ul class="pal-list" id="pal-list" role="listbox"></ul>
<p class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span></p>
</dialog>
<script src="{asset('app.js')}" defer></script>
<script src="{asset('bg3d.js')}" defer></script>
</body></html>"""
    if indexable:
        d = os.path.join(OUT, path.strip("/"))
        os.makedirs(d, exist_ok=True)
        target = os.path.join(d, "index.html")
        SITEMAP.append((path, og_img))
        LLM_PAGES.append((title, path, desc, body))
        if search is not False:
            SEARCH.append(search or {"t": title, "u": path, "k": label, "s": ""})
    else:
        target = os.path.join(OUT, path.strip("/"))
    with open(target, "w") as f:
        f.write(doc)

OG_JOBS = []

def doc_layout(body, toc):
    """Article + sticky table of contents."""
    return f'<div class="doc-layout"><article class="doc">{body}</article><aside class="side">{toc_html(toc)}</aside></div>'

# ---------------------------------------------------------------- drug pages
def drug_node(d, p):
    use, route, _ = drug_attrs(d)
    al = ALIASES.get(d["slug"], [])
    n = {"@type": "Drug", "@id": url(p) + "#drug", "_about": True, "name": d["short"], "nonProprietaryName": d["generic"],
         "description": "; ".join(d["uses"]), "url": url(p),
         "drugClass": {"@type": "DrugClass", "name": d["cls"]},
         "manufacturer": {"@type": "Organization", "name": d["maker"]}, "dosageForm": d["form"],
         "administrationRoute": "Oral" if route == "oral" else ("Nasal or subcutaneous" if d["slug"] == "glucagon" else "Subcutaneous"),
         "doseSchedule": {"@type": "DoseSchedule", "frequency": d["freq"], "targetPopulation": "Adults"},
         "isAvailableGenerically": d["slug"] in ("victoza", "saxenda", "glucagon"),
         "relatedDrug": [{"@id": url(f"/drugs/{r}/") + "#drug"} for r in d["related"] if r in DRUG]}
    if al: n["alternateName"] = al[:20]
    if d["cat"] == "pipeline":
        n["legalStatus"] = "Investigational — not approved"
    else:
        n["prescriptionStatus"] = "https://schema.org/PrescriptionOnly"
    if d.get("boxed") or d.get("boxed_note"):
        n["warning"] = d.get("boxed_note", BOXED_GLP1)
    return n

def drug_page(d):
    p = f'/drugs/{d["slug"]}/'
    is_ins = d["cat"] == "insulin"
    common = INSULIN_COMMON if is_ins else GLP1_COMMON
    serious = INSULIN_SERIOUS if is_ins else GLP1_SERIOUS
    avoid = INSULIN_AVOID if is_ins else GLP1_AVOID
    pipeline = d["cat"] == "pipeline"
    title = f'{d["short"]} ({d["generic"]}): Uses, Dosage, Side Effects & Cost'
    if len(title) > 62: title = f'{d["short"]}: Uses, Dosage, Side Effects & Cost'
    if pipeline: title = f'{d["short"]}: Approval Status, Trial Results & Availability'
    desc = f'{d["short"]} ({d["generic"]}) by {d["maker"]}: what it treats, label dosing, side effects, cost and legal ways to get it in the US and Canada.'
    if len(desc) > 160: desc = f'{d["short"]} ({d["generic"]}): what it treats, label dosing, side effects, cost and legal ways to get it in the US and Canada.'
    if pipeline: desc = f'{d["short"]} ({d["generic"]}) status in 2026: FDA review, trial results and why online sellers are not legitimate.'
    cls = lower_first(d["cls"])
    art = "an" if cls[0].lower() in "aeiou" else "a"
    uses = [lower_first(u) for u in d["uses"]]
    if pipeline:
        summary = (f'<strong>{E(d["short"])}</strong> ({E(d["generic"])}) is an investigational {E(cls)} from {E(d["maker"])}. '
                   f'It is not approved and cannot legally be bought outside a registered clinical trial. {E(d["us"])}')
    else:
        summary = (f'<strong>{E(d["short"])}</strong> ({E(d["generic"])}) is {art} {E(cls)} made by {E(d["maker"])}, used for {E(join_and(uses))}. '
                   f'Schedule: {E(d["freq"].lower())}. It is prescription-only in the US and Canada.')
    al = ALIASES.get(d["slug"], [])
    b = f'<header class="doc-head"><span class="tag t-{d["cat"]}">{E(CATS[d["cat"]])}</span><h1>{E(d["name"])}</h1>'
    b += f'<p class="lead">{E(d["generic"])} · {E(d["cls"])} · {E(d["maker"])}</p>{updated_box()}</header>'
    b += tldr(summary, "In short")
    b += f'''<div class="facts"><div><b>Form</b>{E(d["form"])}</div><div><b>How often</b>{E(d["freq"])}</div>
<div><b>United States</b>{E(d["us"])}</div><div><b>Canada</b>{E(d["ca"])}</div><div><b>Prescription</b>{"Investigational — not sold" if pipeline else "Required"}</div></div>'''
    if d.get("boxed"):
        b += f'<div class="warn" role="note"><strong>⚠ {E(d.get("boxed_note", BOXED_GLP1))}</strong></div>'
    elif d.get("boxed_note"):
        b += f'<div class="warn" role="note"><strong>⚠ {E(d["boxed_note"])}</strong></div>'
    b += '<section><h2 id="uses">What it is used for</h2><ul class="checks">' + "".join(f"<li>{E(u)}</li>" for u in d["uses"]) + "</ul></section>"
    b += (f'<section><h2 id="dosage">{E(d["short"])} dosage</h2><p class="note">Per the official label. Your prescriber sets your dose — never change it on your own.</p>'
          f'<div class="tbl"><table class="t steps"><caption class="sr">{E(d["short"])} label dosing schedule</caption><tbody>' +
          "".join(f'<tr><th scope="row"><span class="step">{i + 1}</span>{E(a)}</th><td>{E(v)}</td></tr>' for i, (a, v) in enumerate(d["dosing"])) + "</tbody></table></div>")
    b += f'<h3>How to take it</h3><p>{E(d["take"])}</p><h3>Storage</h3><p>{E(d["store"])}</p></section>'
    if not pipeline:
        b += ('<section><h2 id="side-effects">Side effects</h2><div class="two"><div class="pane"><h3>Common</h3><ul>' + "".join(f"<li>{E(x)}</li>" for x in common) +
              '</ul></div><div class="pane pane-alert"><h3>Serious — get medical help</h3><ul>' + "".join(f"<li>{E(x)}</li>" for x in serious) +
              '</ul></div></div><h3>Who should not use it</h3><ul class="crosses">' + "".join(f"<li>{E(x)}</li>" for x in avoid) + "</ul></section>")
    else:
        b += '<section><h2 id="side-effects">Safety</h2><p>Safety data come from clinical trials only. Gastrointestinal effects were the most common, as with other incretin medicines.</p></section>'
    b += f'<section><h2 id="cost">Cost</h2><p>{E(d["cost"])}</p><p><a class="more" href="/guides/glp1-cost-without-insurance/">GLP-1 cost without insurance →</a></p></section>'
    if pipeline:
        b += (f'<section><h2 id="buy">Can you buy {E(d["short"])}?</h2><p>No. It is not approved, so there is no legal way to purchase or order it outside a registered clinical trial. '
              f'Search {ext("https://clinicaltrials.gov/search?term=" + E(d["generic"]), "ClinicalTrials.gov")} for trials near you.</p>'
              '<p><a class="more" href="/guides/compounded-and-counterfeit-glp1/">Why online "research" versions are dangerous →</a></p></section>')
    else:
        b += f'''<section><h2 id="buy">How to buy {E(d["short"])} legally</h2>
<ol class="nums"><li>Get a prescription from your doctor or a licensed telehealth provider.</li>
<li>Fill it at a licensed pharmacy{", or through the manufacturer's self-pay pharmacy" if d["maker"].startswith(("Novo", "Eli")) else ""}.</li>
<li>Verify any online pharmacy first (US: {ext("https://safe.pharmacy/", "safe.pharmacy")}; Canada: your provincial pharmacy college register).</li></ol>
<p><a class="more" href="/guides/how-to-buy-glp1-legally-usa/">Buying legally in the USA →</a> <a class="more" href="/guides/how-to-buy-glp1-legally-canada/">Buying legally in Canada →</a></p>
<!-- AFFILIATE SLOT: insert a LegitScript-certified telehealth/pharmacy partner block here, with rel="sponsored" -->
</section>'''
    rq = [q for q in QUESTIONS if d["slug"] in q[3]]
    if rq:
        b += '<section><h2 id="questions">Common questions</h2><ul class="qlinks">' + "".join(f'<li><a href="/questions/{q[0]}/">{E(q[1])}</a></li>' for q in rq) + '</ul></section>'
    fh, fnode = faq_block(d["faqs"])
    b += fh
    if al:
        b += '<p class="also"><strong>Also searched as:</strong> ' + E(", ".join(al)) + '</p>'
    q = d["short"].split(" (")[0].replace(" ", "+")
    b += f'''<section class="src"><h2 id="sources">Sources</h2><ul>
<li>{ext(f"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query={q}", "FDA prescribing information (DailyMed)")}</li>
<li>{ext("https://www.accessdata.fda.gov/scripts/cder/daf/", "Drugs@FDA")}</li>
<li>{ext("https://health-products.canada.ca/dpd-bdpp/", "Health Canada Drug Product Database")}</li></ul></section>'''
    rel = [DRUG.get(r) for r in d["related"] if r in DRUG]
    rc = [c for c in COMPARES if c["slug"] in d["related"]]
    if rel or rc:
        b += '<section><h2>Related</h2><div class="grid">' + "".join(card(r) for r in rel) + \
             "".join(link_card(f'/compare/{c["slug"]}/', "Compare", c["title"]) for c in rc) + "</div></section>"
    b += '<div class="page-tools"><button type="button" class="chip" data-share>Share this page</button><button type="button" class="chip" data-print>Print</button></div>'
    b, toc = with_toc(b)
    nodes = [drug_node(d, p)]
    if fnode: nodes.append(fnode)
    page(p, title, desc, doc_layout(b, toc), crumbs=[("Home", "/"), ("Medicines", "/drugs/"), (d["short"], p)],
         nodes=nodes, kw=[d["short"], d["generic"]] + al, label=CATS[d["cat"]].split(" (")[0], og_title=f'{d["short"]} ({d["generic"]})',
         search={"t": d["name"], "u": p, "k": "Medicine", "s": " ".join([d["generic"], d["cls"], d["maker"]] + al)})

# ---------------------------------------------------------------- other pages
def compare_page(c):
    a, bd = DRUG[c["a"]], DRUG[c["b"]]
    p = f'/compare/{c["slug"]}/'
    b = f'<header class="doc-head"><span class="tag">Comparison</span><h1>{E(c["title"])}</h1>{updated_box()}</header>'
    b += tldr(E(c["desc"]) + " " + E(re_strip(c["body"])))
    b += f'<section><h2 id="side-by-side">Side by side</h2><div class="tbl"><table class="t cmp"><caption class="sr">{E(a["short"])} compared with {E(bd["short"])}</caption><thead><tr><th scope="col">Feature</th><th scope="col"><a href="/drugs/{a["slug"]}/">{E(a["short"])}</a></th><th scope="col"><a href="/drugs/{bd["slug"]}/">{E(bd["short"])}</a></th></tr></thead><tbody>' + \
         "".join(f'<tr><th scope="row">{E(r[0])}</th><td>{E(r[1])}</td><td>{E(r[2])}</td></tr>' for r in c["rows"]) + "</tbody></table></div></section>"
    b += '<section><h2 id="which-one">Which one is right for you?</h2>' + c["body"] + '<div class="warn" role="note">Both are prescription medicines. Which one fits depends on your diagnosis, history and coverage — decide with your prescriber.</div></section>'
    b += f'<section><h2>Related</h2><div class="grid">{card(a)}{card(bd)}{link_card("/compare/#builder", "Tool", "Compare any two medicines")}</div></section>'
    b, toc = with_toc(b)
    nodes = [{"@type": "ItemList", "@id": url(p) + "#compared", "name": c["title"], "itemListElement": [
        {"@type": "ListItem", "position": 1, "item": {"@type": "Drug", "name": a["short"], "nonProprietaryName": a["generic"], "url": url(f'/drugs/{a["slug"]}/')}},
        {"@type": "ListItem", "position": 2, "item": {"@type": "Drug", "name": bd["short"], "nonProprietaryName": bd["generic"], "url": url(f'/drugs/{bd["slug"]}/')}}]}]
    page(p, c["title"], c["desc"], doc_layout(b, toc), crumbs=[("Home", "/"), ("Compare", "/compare/"), (c["title"].split(":")[0], p)],
         nodes=nodes, label="Comparison", search={"t": c["title"], "u": p, "k": "Compare", "s": a["generic"] + " " + bd["generic"]})

def guide_page(g):
    p = f'/guides/{g["slug"]}/'
    first = re.search(r"<p>(.*?)</p>", g["body"], re.S)
    b = f'<header class="doc-head"><span class="tag">Guide</span><h1>{E(g["title"])}</h1>{updated_box()}<p class="lead">{E(g["desc"])}</p></header>'
    if first: b += tldr(first.group(1), "Key point")
    b += g["body"].replace(first.group(0), "", 1) if first else g["body"]
    b, toc = with_toc(b)
    page(p, g["title"], g["desc"], doc_layout(b, toc), crumbs=[("Home", "/"), ("Guides", "/guides/"), (g["title"], p)], label="Guide",
         search={"t": g["title"], "u": p, "k": "Guide", "s": g["desc"]})

def fill(s): return s.format(SITE=E(C["SITE"]), EMAIL=E(C["EMAIL"]), EDITOR=E(C["EDITOR"]), REVIEWER=E(REVIEWER_TXT))

def trust_pages():
    kinds = {"about": "AboutPage"}
    for slug, (t, desc, body) in TRUST.items():
        p = f"/{slug}/"
        body = fill(body)
        if slug == "about":
            body = body.replace(f"Editor: {E(C['EDITOR'])}.", f'<span id="editor">Editor: <strong>{E(C["EDITOR"])}</strong></span>.')
        if slug == "editorial-policy":
            body = body.replace("<li>Corrections:", '<li id="corrections">Corrections:')
        long_desc = desc if len(desc) >= 70 else f"{desc} {C['SITE']} is an independent GLP-1, weight-loss and diabetes medicine reference for the US and Canada."
        page(p, t, long_desc, f'<article class="doc doc-narrow"><header class="doc-head"><h1>{E(t)}</h1></header>{body}</article>',
             crumbs=[("Home", "/"), (t, p)], kind=kinds.get(slug, "WebPage"), label="About", article=False, search={"t": t, "u": p, "k": "Site", "s": ""})
    action = C["FORM_ENDPOINT"] or f"mailto:{C['EMAIL']}"
    enc = "" if C["FORM_ENDPOINT"] else ' enctype="text/plain"'
    body = f'''<article class="doc doc-narrow"><header class="doc-head"><h1>Contact the editors</h1></header>
<div class="warn" role="note"><strong>We do not sell, ship or broker medicines and cannot answer requests to buy them.</strong> For medical questions, ask your doctor or pharmacist. In an emergency call 911.</div>
<p>Use this form for corrections, editorial questions, press and partnership enquiries. Email: <a href="mailto:{E(C['EMAIL'])}">{E(C['EMAIL'])}</a></p>
<form class="form" action="{E(action)}" method="post"{enc}>
<label>Name<input name="name" autocomplete="name" required></label><label>Email<input type="email" name="email" autocomplete="email" required></label>
<label>Topic<select name="topic"><option>Correction</option><option>Editorial question</option><option>Press</option><option>Partnership / advertising</option></select></label>
<label>Message<textarea name="message" rows="6" required></textarea></label><button class="btn" type="submit">Send message</button></form></article>'''
    page("/contact/", "Contact", f"Contact the {C['SITE']} editorial team for corrections, editorial questions, press and partnership enquiries. We do not sell medicines.", body,
         crumbs=[("Home", "/"), ("Contact", "/contact/")], kind="ContactPage", label="Contact", article=False, search={"t": "Contact the editors", "u": "/contact/", "k": "Site", "s": "email corrections press"})

def item_list(name, items):
    return {"@type": "ItemList", "@id": url("/") + "#list-" + slugify(name), "name": name, "numberOfItems": len(items),
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": url(u), "name": n} for i, (n, u) in enumerate(items)]}

CHIPS = '''<div class="filters" role="group" aria-label="Filter medicines">
<div class="fgroup" data-key="use"><span>Use</span><button type="button" class="chip on" data-val="">All</button><button type="button" class="chip" data-val="weight">Weight management</button><button type="button" class="chip" data-val="diabetes">Type 2 / diabetes</button><button type="button" class="chip" data-val="emergency">Emergency</button></div>
<div class="fgroup" data-key="route"><span>Form</span><button type="button" class="chip on" data-val="">Any</button><button type="button" class="chip" data-val="oral">Pill</button><button type="button" class="chip" data-val="injection">Injection</button></div>
<div class="fgroup" data-key="freq"><span>Schedule</span><button type="button" class="chip on" data-val="">Any</button><button type="button" class="chip" data-val="weekly">Weekly</button><button type="button" class="chip" data-val="daily">Daily</button></div>
</div>'''

def hubs():
    b = ('<header class="hub-head"><span class="eyebrow">Medicine finder</span><h1>All GLP-1, incretin and insulin medicines</h1>'
         f'<p class="lead">{len(DRUGS)} medicines available or in development in the United States and Canada. Filter by what they treat, how they are taken, and how often.</p></header>'
         '<div class="finder"><div class="field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
         '<input class="search" id="drug-q" type="search" placeholder="Search by brand, generic or misspelling…" aria-label="Search medicines"></div>' + CHIPS +
         '<p class="count" aria-live="polite"><span data-count>' + str(len(DRUGS)) + '</span> medicines shown</p></div>')
    for k, v in CATS.items():
        b += f'<section class="drug-group reveal"><h2>{E(v)}</h2><div class="grid">' + "".join(card(d) for d in DRUGS if d["cat"] == k) + "</div></section>"
    b += '<p class="empty" hidden>No medicine matches those filters. <button type="button" class="chip" data-reset>Clear filters</button></p>'
    page("/drugs/", "All GLP-1, Incretin & Insulin Medicines (A–Z)",
         "Every GLP-1, incretin, insulin and diabetes injectable in the US and Canada, with uses, label dosing, side effects and legal access.", b,
         crumbs=[("Home", "/"), ("Medicines", "/drugs/")], kind="CollectionPage", label="Medicines", article=False,
         nodes=[item_list("All medicines", [(d["name"], f'/drugs/{d["slug"]}/') for d in DRUGS])],
         search={"t": "All medicines (A–Z)", "u": "/drugs/", "k": "Hub", "s": "list finder"})

    opts = "".join(f'<optgroup label="{E(v)}">' + "".join(f'<option value="{d["slug"]}">{E(d["name"])}</option>' for d in DRUGS if d["cat"] == k) + "</optgroup>" for k, v in CATS.items())
    b = ('<header class="hub-head"><span class="eyebrow">Side by side</span><h1>GLP-1 comparisons</h1>'
         '<p class="lead">Editor-written comparisons of the most-searched pairs, plus a builder to line up any two medicines from the label facts.</p></header>'
         '<section><h2>Editorial comparisons</h2><div class="grid">' +
         "".join(link_card(f'/compare/{c["slug"]}/', "Compare", c["title"], c["desc"]) for c in COMPARES) + "</div></section>"
         f'<section class="builder reveal" id="builder"><h2>Compare any two medicines</h2><p class="note">Facts pulled from each medicine page. Pick two to see them side by side.</p>'
         f'<div class="cmp-pick"><label>First medicine<select id="cmpA">{opts}</select></label>'
         '<button type="button" class="ibtn swap" id="cmpSwap" aria-label="Swap medicines">⇄</button>'
         f'<label>Second medicine<select id="cmpB">{opts}</select></label></div>'
         '<div id="cmpOut" class="cmp-out" aria-live="polite"><noscript><p>Turn on JavaScript to use the comparison builder, or open the editorial comparisons above.</p></noscript></div></section>')
    page("/compare/", "GLP-1 Comparisons: Ozempic, Wegovy, Zepbound & More",
         "Side-by-side comparisons of Ozempic, Wegovy, Zepbound, Mounjaro, Foundayo and Saxenda, plus a tool to compare any two GLP-1 or insulin medicines.", b,
         crumbs=[("Home", "/"), ("Compare", "/compare/")], kind="CollectionPage", label="Compare", article=False,
         nodes=[item_list("Comparisons", [(c["title"], f'/compare/{c["slug"]}/') for c in COMPARES])],
         search={"t": "Compare any two medicines", "u": "/compare/", "k": "Tool", "s": "comparison builder vs versus"})

    b = ('<header class="hub-head"><span class="eyebrow">Buy safely</span><h1>GLP-1 guides</h1>'
         '<p class="lead">Practical, source-based guides on legal access, real costs, side effects and how to avoid counterfeit pens.</p></header>'
         '<div class="grid grid-lg">' + "".join(link_card(f'/guides/{g["slug"]}/', "Guide", g["title"], g["desc"]) for g in GUIDES) + "</div>")
    page("/guides/", "GLP-1 Guides: Buying Legally, Cost & Safety",
         "Guides on buying GLP-1 medicines legally in the US and Canada, costs without insurance, side effects and counterfeit risks.", b,
         crumbs=[("Home", "/"), ("Guides", "/guides/")], kind="CollectionPage", label="Guides", article=False,
         nodes=[item_list("Guides", [(g["title"], f'/guides/{g["slug"]}/') for g in GUIDES])],
         search={"t": "All guides", "u": "/guides/", "k": "Hub", "s": ""})

NEWS = [("2026-02-04", "Feb 4", "<strong>Ozempic tablets</strong> replace Rybelsus as the name for oral semaglutide in diabetes.", "/drugs/ozempic-tablets/"),
        ("2026-03-19", "Mar 19", "<strong>Wegovy HD</strong> 7.2 mg approved.", "/drugs/wegovy/"),
        ("2026-03-26", "Mar 26", "<strong>Awiqli</strong>, the first once-weekly insulin, approved in the US.", "/drugs/insulin-icodec/"),
        ("2026-04-01", "Apr 1", "<strong>Foundayo</strong> (orforglipron) approved — a weight-loss pill with no fasting rule.", "/drugs/foundayo/"),
        ("2026-04-28", "Apr–Jun", "<strong>Canada</strong> became the first G7 country with generic semaglutide.", "/questions/generic-ozempic-canada/")]

def home():
    feat = ["wegovy", "zepbound", "ozempic", "mounjaro", "wegovy-pill", "foundayo"]
    stats = [(len(DRUGS), "medicines"), (len(COMPARES) + 1, "comparisons"), (len(QUESTIONS), "answered questions"), (len(GUIDES), "buying & safety guides")]
    quick = ["Ozempic", "Wegovy", "Zepbound", "Foundayo", "Mounjaro", "Insulin"]
    b = f'''<section class="hero">
<p class="eyebrow"><span class="dot"></span><span>Updated <time datetime="{C["UPDATED"]}">{human_date(C["UPDATED"])}</time> · United States &amp; Canada</span></p>
<h1>GLP-1, weight-loss and diabetes medicines — <span class="grad">explained clearly</span></h1>
<p class="hero-sub">Approvals, label dosing, side effects, costs and the legal ways to get every GLP-1, incretin and insulin medicine in the United States and Canada.</p>
<div class="hero-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input class="search" type="search" data-palette placeholder="Search Ozempic, Zepbound, Foundayo…" aria-label="Search medicines and questions"><kbd>⌘K</kbd></div>
<div class="quick">{"".join(f'<button type="button" class="chip" data-palette-q="{q}">{q}</button>' for q in quick)}</div>
<dl class="stats">{"".join(f'<div><dt>{t}</dt><dd data-count-to="{n}">{n}</dd></div>' for n, t in stats)}</dl>
</section>
<section class="reveal">{tldr('A <strong>GLP-1 receptor agonist</strong> is a medicine that mimics the gut hormone GLP-1: it raises insulin after meals, lowers glucagon, slows stomach emptying and reduces appetite. Semaglutide (Ozempic, Wegovy) and tirzepatide (Mounjaro, Zepbound) are the best known; all are prescription-only in the US and Canada. <a href="/questions/what-is-glp1/">Read the full answer →</a>', "What is a GLP-1?")}</section>
<section class="reveal"><div class="sec-head"><h2>Most searched</h2><a class="more" href="/drugs/">All {len(DRUGS)} medicines →</a></div><div class="grid">{"".join(card(DRUG[s]) for s in feat)}</div></section>
<section class="reveal"><div class="sec-head"><h2>What changed in 2026</h2></div><ol class="timeline">{"".join(f'<li><time datetime="{iso}">{lab}</time><a href="{h}">{t}</a></li>' for iso, lab, t, h in NEWS)}</ol></section>
<section class="reveal"><div class="sec-head"><h2>Explore by topic</h2></div><div class="grid">{"".join(link_card(f'/{pl["slug"]}/', "Topic", pl["h1"]) for pl in PILLARS)}</div></section>
<section class="reveal split"><div><div class="sec-head"><h2>Top questions</h2><a class="more" href="/questions/">All questions →</a></div><ul class="qlinks">{"".join(f'<li><a href="/questions/{q[0]}/">{E(q[1])}</a></li>' for q in QUESTIONS[:8])}</ul></div>
<div class="cta-panel"><span class="eyebrow">Interactive</span><h2>Compare any two medicines</h2><p>Line up dosing schedules, approvals and availability for any pair — from Wegovy vs Zepbound to Lantus vs Tresiba.</p><a class="btn" href="/compare/#builder">Open the comparison builder</a></div></section>
<section class="reveal"><div class="sec-head"><h2>Compare</h2><a class="more" href="/compare/">All comparisons →</a></div><div class="grid">{"".join(link_card(f'/compare/{c["slug"]}/', "Compare", c["title"]) for c in COMPARES)}</div></section>
<section class="reveal"><div class="sec-head"><h2>Buy safely</h2><a class="more" href="/guides/">All guides →</a></div><div class="grid">{"".join(link_card(f'/guides/{g["slug"]}/', "Guide", g["title"]) for g in GUIDES[:4])}</div></section>'''
    page("/", "GLP-1, weight-loss & diabetes medicines explained",
         "Independent US & Canada guide to GLP-1 and diabetes medicines — Ozempic, Wegovy, Zepbound, Mounjaro, Foundayo, insulin: dosing, side effects, cost, legal access.",
         b, kind="WebPage", label="US & Canada", body_class="home", article=False,
         og_title="GLP-1, weight-loss & diabetes medicines — explained clearly",
         nodes=[item_list("Most searched medicines", [(DRUG[s]["name"], f"/drugs/{s}/") for s in feat])],
         kw=["GLP-1", "semaglutide", "tirzepatide", "Ozempic", "Wegovy", "Zepbound", "Mounjaro", "Foundayo", "diabetes injections", "weight loss injections", "insulin"],
         search={"t": "Home", "u": "/", "k": "Site", "s": ""})

def pillar_page(pl):
    p = f'/{pl["slug"]}/'
    first = re.search(r"<p>(.*?)</p>", pl["body"], re.S)
    b = f'<header class="doc-head"><span class="tag">Topic</span><h1>{E(pl["h1"])}</h1>{updated_box()}<p class="lead">{E(pl["desc"])}</p></header>'
    if first: b += tldr(first.group(1), "In short")
    b += pl["body"].replace(first.group(0), "", 1) if first else pl["body"]
    b += '<section><h2 id="medicines">Medicines in this group</h2><div class="grid">' + "".join(card(DRUG[s]) for s in pl["drugs"]) + '</div></section>'
    rq = [q for q in QUESTIONS if set(q[3]) & set(pl["drugs"])][:10]
    if rq:
        b += '<section><h2 id="popular-questions">Popular questions</h2><ul class="qlinks">' + "".join(f'<li><a href="/questions/{q[0]}/">{E(q[1])}</a></li>' for q in rq) + '</ul></section>'
    b, toc = with_toc(b)
    kw = pl["kw"] + [a for s in pl["drugs"] for a in ALIASES.get(s, [])[:4]]
    node = {"@type": "ItemList", "@id": url(p) + "#medicines", "name": f'Medicines: {pl["h1"].split(" —")[0]}',
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": {"@type": "Drug", "@id": url(f"/drugs/{s}/") + "#drug", "name": DRUG[s]["short"],
                                 "nonProprietaryName": DRUG[s]["generic"], "url": url(f"/drugs/{s}/")}} for i, s in enumerate(pl["drugs"])]}
    page(p, pl["title"], pl["desc"], doc_layout(b, toc), crumbs=[("Home", "/"), (pl["h1"].split(" —")[0], p)], nodes=[node], kw=kw, label="Topic",
         og_title=pl["h1"], search={"t": pl["h1"], "u": p, "k": "Topic", "s": " ".join(pl["kw"])})

def question_pages():
    for slug, qn, ans, rel, kw in QUESTIONS:
        p = f'/questions/{slug}/'
        plain = re_strip(ans)
        desc = (plain[:155].rsplit(" ", 1)[0] + "…") if len(plain) > 158 else plain
        if len(desc) < 70: desc = f"{qn} {desc} Plain-English answer based on official labels, for readers in the US and Canada."[:160]
        b = f'<header class="doc-head"><span class="tag">Question</span><h1>{E(qn)}</h1>{updated_box()}</header>'
        b += f'<div class="tldr answer"><p class="tldr-h">Short answer</p>{ans}</div>'
        b += '<p class="note">General information based on official labels. Your prescriber or pharmacist can advise on your situation.</p>'
        b += '<section><h2>Related medicines</h2><div class="grid">' + "".join(card(DRUG[r]) for r in rel if r in DRUG) + '</div></section>'
        others = [q for q in QUESTIONS if q[0] != slug and set(q[3]) & set(rel)][:6]
        if others:
            b += '<section><h2>More questions</h2><ul class="qlinks">' + "".join(f'<li><a href="/questions/{q[0]}/">{E(q[1])}</a></li>' for q in others) + '</ul></section>'
        b += '<div class="page-tools"><button type="button" class="chip" data-share>Share this answer</button></div>'
        faq = {"@type": "FAQPage", "@id": url(p) + "#faq", "mainEntity": [{"@type": "Question", "name": qn, "acceptedAnswer": {"@type": "Answer", "text": plain}}]}
        page(p, qn, desc, f'<article class="doc doc-narrow">{b}</article>', crumbs=[("Home", "/"), ("Questions", "/questions/"), (qn, p)], nodes=[faq],
             kw=kw + [DRUG[r]["short"] for r in rel if r in DRUG], label="Question",
             search={"t": qn, "u": p, "k": "Question", "s": " ".join(kw)})
    b = ('<header class="hub-head"><span class="eyebrow">Answers</span><h1>Questions people ask about GLP-1s and diabetes injections</h1>'
         f'<p class="lead">{len(QUESTIONS)} short, label-based answers: missed doses, alcohol, side effects, stopping, pregnancy, storage and cost.</p></header>'
         '<div class="finder"><div class="field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
         '<input class="search" type="search" data-filter=".qlist li" placeholder="Search questions…" aria-label="Search questions"></div></div><ul class="qlist qlinks">' +
         "".join(f'<li data-q="{E((q[1] + " " + " ".join(q[4])).lower())}"><a href="/questions/{q[0]}/">{E(q[1])}</a></li>' for q in QUESTIONS) + '</ul>'
         '<p class="empty" hidden>No question matches. Try the <button type="button" class="linkish" data-open-palette>site search</button>.</p>')
    page("/questions/", "Questions About Ozempic, Wegovy, Zepbound & Insulin",
         "Answers to the most-searched questions about semaglutide, tirzepatide, GLP-1 pills and insulin: missed doses, alcohol, side effects, stopping, pregnancy and cost.", b,
         crumbs=[("Home", "/"), ("Questions", "/questions/")], kind="CollectionPage", label="Questions", article=False,
         nodes=[item_list("Questions", [(q[1], f"/questions/{q[0]}/") for q in QUESTIONS])],
         kw=[k for q in QUESTIONS for k in q[4]][:40], search={"t": "All questions", "u": "/questions/", "k": "Hub", "s": "faq"})

def glossary_page():
    letters = sorted({t[0].upper() for t, _ in GLOSSARY})
    b = ('<header class="doc-head"><span class="tag">Reference</span><h1>GLP-1 and diabetes glossary</h1>'
         f'<p class="lead">{len(GLOSSARY)} plain-English definitions of the terms you will meet on labels, in trials and at the pharmacy.</p></header>'
         '<div class="finder"><div class="field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
         '<input class="search" type="search" data-filter=".gl > div" placeholder="Filter terms…" aria-label="Filter glossary terms"></div>'
         '<nav class="az" aria-label="Jump to letter">' + "".join(f'<a href="#letter-{l}">{l}</a>' for l in letters) + '</nav></div><dl class="gl">')
    seen = set()
    for t, dfn in GLOSSARY:
        l = t[0].upper()
        anchor = f' id="letter-{l}"' if l not in seen else ""
        seen.add(l)
        b += f'<div data-q="{E((t + " " + dfn).lower())}"{anchor}><dt id="{E(slugify(t))}">{E(t)}</dt><dd>{E(dfn)}</dd></div>'
        SEARCH.append({"t": t, "u": f"/glossary/#{slugify(t)}", "k": "Glossary", "s": dfn})
    b += '</dl><p class="empty" hidden>No term matches.</p>'
    node = {"@type": "DefinedTermSet", "@id": url("/glossary/") + "#terms", "_about": True, "name": "GLP-1 and diabetes glossary",
            "hasDefinedTerm": [{"@type": "DefinedTerm", "@id": url("/glossary/#" + slugify(t)), "name": t, "description": dfn,
                                "inDefinedTermSet": {"@id": url("/glossary/") + "#terms"}} for t, dfn in GLOSSARY]}
    page("/glossary/", "GLP-1 and Diabetes Glossary",
         "Plain-English definitions of GLP-1 and diabetes terms: GLP-1, GIP, A1C, basal insulin, titration, half-life, boxed warning, compounded drugs and more.",
         f'<article class="doc doc-narrow">{b}</article>', crumbs=[("Home", "/"), ("Glossary", "/glossary/")], nodes=[node], label="Glossary",
         kw=[t for t, _ in GLOSSARY], search={"t": "Glossary", "u": "/glossary/", "k": "Hub", "s": "definitions terms"})

# ---------------------------------------------------------------- machine-readable outputs
def to_md(h):
    """Lightweight HTML -> Markdown for llms-full.txt (input is our own, well-formed markup)."""
    h = re.sub(r"<(script|style|svg|button|noscript|select)[^>]*>.*?</\1>", "", h, flags=re.S)
    h = re.sub(r'<nav class="(toc|crumbs|az)".*?</nav>', "", h, flags=re.S)
    h = re.sub(r'<caption[^>]*>.*?</caption>', "", h, flags=re.S)
    h = re.sub(r"<h1[^>]*>(.*?)</h1>", r"\n# \1\n", h, flags=re.S)
    h = re.sub(r"<h2[^>]*>(.*?)</h2>", r"\n## \1\n", h, flags=re.S)
    h = re.sub(r"<h3[^>]*>(.*?)</h3>", r"\n### \1\n", h, flags=re.S)
    h = re.sub(r"<tr[^>]*>(.*?)</tr>", lambda m: "| " + " | ".join(re_strip(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", m.group(1), re.S)) + " |\n", h, flags=re.S)
    h = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: f"[{re_strip(m.group(2))}]({m.group(1) if m.group(1).startswith('http') else url(m.group(1))})", h, flags=re.S)
    h = re.sub(r"<li[^>]*>", "\n- ", h)
    h = re.sub(r"<(dt)[^>]*>(.*?)</dt>", r"\n**\2**: ", h, flags=re.S)
    h = re.sub(r"</?(strong|b)>", "**", h)
    h = re.sub(r"<(p|div|section|ul|ol|table|dl|header)[^>]*>", "\n", h)
    h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h).replace("→", "").replace("↗", "")
    h = re.sub(r"[ \t]+", " ", h)
    h = re.sub(r"\n\s*\n+", "\n\n", h)
    return h.strip()

def root_files():
    sm = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
          "".join(f"  <url><loc>{url(p)}</loc><lastmod>{C['UPDATED']}</lastmod><image:image><image:loc>{img}</image:loc></image:image></url>\n" for p, img in SITEMAP) + "</urlset>\n")
    open(f"{OUT}/sitemap.xml", "w").write(sm)
    bots = ["Googlebot", "Bingbot", "Applebot", "DuckDuckBot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User",
            "ClaudeBot", "Claude-SearchBot", "Claude-User", "Google-Extended", "Applebot-Extended", "Amazonbot", "CCBot", "Meta-ExternalAgent", "MistralAI-User", "DuckAssistBot"]
    open(f"{OUT}/robots.txt", "w").write("# Search engines and AI assistants are welcome to read and cite this site.\n\n" +
                                         "".join(f"User-agent: {b}\nAllow: /\n\n" for b in bots) + f"User-agent: *\nAllow: /\n\nSitemap: {url('/sitemap.xml')}\n")
    intro = (f"# {C['SITE']}\n\n> Independent reference on GLP-1, incretin and insulin medicines for the United States and Canada: label dosing, safety, cost and legal access. "
             f"Does not sell medicines. Last reviewed {C['UPDATED']}. Editor: {C['EDITOR']}. Medical review: {REVIEWER_TXT}.\n\n"
             "Facts come from FDA and Health Canada labels, manufacturer releases and peer-reviewed trials. When citing, please link the specific page and its review date. "
             f"Full text of every page: {url('/llms-full.txt')}\n\n")
    llms = intro + "## Medicines\n" + \
           "".join(f"- [{d['name']}]({url('/drugs/' + d['slug'] + '/')}): {d['generic']}, {d['cls']}, {d['freq'].lower()}; {d['maker']}\n" for d in DRUGS) + "\n## Comparisons\n" + \
           "".join(f"- [{c['title']}]({url('/compare/' + c['slug'] + '/')}): {c['desc']}\n" for c in COMPARES) + "\n## Guides\n" + \
           "".join(f"- [{g['title']}]({url('/guides/' + g['slug'] + '/')}): {g['desc']}\n" for g in GUIDES) + "\n## Topics\n" + \
           "".join(f"- [{pl['title']}]({url('/' + pl['slug'] + '/')}): {pl['desc']}\n" for pl in PILLARS) + "\n## Questions\n" + \
           "".join(f"- [{q[1]}]({url('/questions/' + q[0] + '/')}): {re_strip(q[2])}\n" for q in QUESTIONS) + \
           "\n## Optional\n- [Glossary](" + url("/glossary/") + ")\n- [Editorial policy](" + url("/editorial-policy/") + ")\n- [Medical disclaimer](" + url("/medical-disclaimer/") + ")\n"
    open(f"{OUT}/llms.txt", "w").write(llms)
    full = intro + "\n\n".join(f"---\nURL: {url(p)}\nTitle: {t}\nSummary: {d}\nLast reviewed: {C['UPDATED']}\n\n{to_md(b)}" for t, p, d, b in LLM_PAGES) + "\n"
    open(f"{OUT}/llms-full.txt", "w").write(full)
    with open(f"{OUT}/assets/search.json", "w") as f:
        json.dump(SEARCH, f, ensure_ascii=False, separators=(",", ":"))
    with open(f"{OUT}/assets/drugs.json", "w") as f:
        json.dump({d["slug"]: {"name": d["name"], "short": d["short"], "generic": d["generic"], "cls": d["cls"], "maker": d["maker"], "cat": CATS[d["cat"]],
                               "form": d["form"], "freq": d["freq"], "uses": d["uses"], "us": d["us"], "ca": d["ca"], "top": d["dosing"][-1],
                               "boxed": d.get("boxed_note", BOXED_GLP1) if (d.get("boxed") or d.get("boxed_note")) else "", "cost": d["cost"]} for d in DRUGS},
                  f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    with open(f"{OUT}/assets/compares.json", "w") as f:
        json.dump({c["a"] + "|" + c["b"]: f"/compare/{c['slug']}/" for c in COMPARES}, f)
    manifest = {"name": C["SITE"], "short_name": C["SITE"], "description": "GLP-1, weight-loss and diabetes medicine guide for the US and Canada.",
                "start_url": "/", "scope": "/", "display": "standalone", "background_color": "#070b14", "theme_color": "#070b14",
                "icons": [{"src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png"},
                          {"src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png"},
                          {"src": "/assets/favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}
    open(f"{OUT}/site.webmanifest", "w").write(json.dumps(manifest, indent=1))
    host = C["DOMAIN"].split("//")[1]
    host_re = host.replace(".", "\\.")
    open(f"{OUT}/_headers", "w").write(NETLIFY_HEADERS)  # Netlify / Cloudflare Pages (ignored by Apache)
    open(f"{OUT}/.htaccess", "w").write(f"""# Force HTTPS + canonical host
Options -Indexes
RewriteEngine On
RewriteCond %{{HTTPS}} off [OR]
RewriteCond %{{HTTP_HOST}} !^{host_re}$ [NC]
RewriteRule ^(.*)$ https://{host}/$1 [L,R=301]
# /path/index.html -> /path/  (one canonical URL per page)
RewriteCond %{{THE_REQUEST}} \\s/+(.*?/)?index\\.html[\\s?] [NC]
RewriteRule ^ /%1 [L,R=301]
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddType application/manifest+json .webmanifest
AddType text/plain .txt
AddDefaultCharset utf-8
AddCharset utf-8 .txt .json .css .js .xml
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript image/svg+xml application/xml text/xml text/plain application/json application/manifest+json application/ld+json
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType text/javascript "access plus 1 year"
ExpiresByType image/svg+xml "access plus 30 days"
ExpiresByType image/png "access plus 30 days"
ExpiresByType image/x-icon "access plus 30 days"
ExpiresByType application/json "access plus 1 day"
ExpiresByType text/html "access plus 1 hour"
</IfModule>
<IfModule mod_headers.c>
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
Header set X-Frame-Options "SAMEORIGIN"
Header set Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
<FilesMatch "\\.(txt|xml)$">
Header set X-Robots-Tag "noindex"
</FilesMatch>
<FilesMatch "^(llms|llms-full)\\.txt$">
Header unset X-Robots-Tag
</FilesMatch>
</IfModule>
""")

NETLIFY_HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/assets/*.css
  Cache-Control: public, max-age=31536000
/assets/*.js
  Cache-Control: public, max-age=31536000
/llms.txt
  Content-Type: text/plain; charset=utf-8
/llms-full.txt
  Content-Type: text/plain; charset=utf-8
"""

def copy_assets():
    src = os.path.join(HERE, "assets")
    dst = os.path.join(OUT, "assets")
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        data = open(os.path.join(src, name), "rb").read()
        ASSET_V[name] = hashlib.md5(data).hexdigest()[:8]
        open(os.path.join(dst, name), "wb").write(data)

def build():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    copy_assets()
    home(); hubs()
    for d in DRUGS: drug_page(d)
    for c in COMPARES: compare_page(c)
    for g in GUIDES: guide_page(g)
    for pl in PILLARS: pillar_page(pl)
    question_pages(); glossary_page()
    trust_pages()
    page("/404.html", "Page not found", "Page not found.",
         '<section class="hero hero-404"><p class="eyebrow">Error 404</p><h1>This page drifted out of orbit</h1><p class="hero-sub">The link may be old or mistyped. Search the site or browse all medicines.</p>'
         '<p><button type="button" class="btn" data-open-palette>Search the site</button> <a class="btn btn-ghost" href="/drugs/">Browse all medicines</a></p></section>',
         kind="WebPage", label="Not found", body_class="home", article=False)
    root_files()
    try:
        import og
        og.render_all(OUT, OG_JOBS, C["SITE"], C["DOMAIN"].split("//")[1])
    except ImportError as e:
        print(f"! OG images skipped ({e}). Install Pillow: pip install pillow")
    for w in WARNINGS: print("! " + w)
    print(f"Built {len(SITEMAP)} indexable pages into {os.path.relpath(OUT)}")

if __name__ == "__main__":
    build()
