#!/usr/bin/env python3
"""Static site generator for the GLP-1 reference site.
Edit CONFIG, then run:  python3 build.py   ->  output in ../public_html  (upload its contents to your web root)
Assets (CSS / JS / 3D background) live in ./assets and are copied with a cache-busting hash.
"""
import json, os, re, shutil, html, hashlib, datetime
from data_drugs import DRUGS, CATS, BOXED_GLP1, GLP1_COMMON, GLP1_SERIOUS, GLP1_AVOID, INSULIN_COMMON, INSULIN_SERIOUS, INSULIN_AVOID
from data_pages import COMPARES, GUIDES, TRUST
from data_extra import ALIASES, PILLARS, QUESTIONS, GLOSSARY
from blog_glp1 import POSTS_GLP1
from blog_other import POSTS_OTHER
POSTS = POSTS_GLP1 + POSTS_OTHER
POST_BY_DRUG = {bp["drug"]: bp for bp in POSTS}

# ======================= CONFIG — edit these =======================
CONFIG = {
    "SITE": "GLP Atlas",                       # brand name (placeholder — check domain availability)
    "DOMAIN": "https://www.glpatlas.com",      # final domain, no trailing slash
    "EMAIL": "contact@glpatlas.com",           # main editorial contact (shown everywhere)
    "EMAIL_ALT": "glp1atlas@gmail.com",        # secondary contact (contact page + schema)
    "EDITOR": "Dr. George Grunberger",
    "REVIEWER": "",                            # e.g. "Jane Doe, PharmD" — leave empty until a real licensed reviewer signs off
    "PUBLISHED": "2026-10-20",                 # first publication date (schema datePublished)
    "UPDATED": "2026-10-20",
    "HOSTING": "hostinger",                    # "hostinger" / any Apache-LiteSpeed host (.htaccess + PHP), or "netlify" (_headers)
    "FORM_ENDPOINT": "php",                    # "php" = built-in /contact.php mailer (Hostinger), "netlify" = Netlify Forms, a https:// Formspree URL, or "" = mailto
    "GOOGLE_VERIFY": "",                       # Search Console "HTML tag" content value (or verify by DNS)
    "BING_VERIFY": "",                         # Bing Webmaster Tools msvalidate.01 content value
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

# ---------------------------------------------------------------- citations, sharing, figures
SRC = {
    "drugsfda": ("Drugs@FDA — approval history and labels", "https://www.accessdata.fda.gov/scripts/cder/daf/"),
    "dpd": ("Health Canada Drug Product Database", "https://health-products.canada.ca/dpd-bdpp/"),
    "dailymed": ("DailyMed — FDA prescribing information (NIH)", "https://dailymed.nlm.nih.gov/dailymed/"),
    "ctgov": ("ClinicalTrials.gov — registered trials", "https://clinicaltrials.gov/"),
    "safepharm": ("NABP safe.pharmacy — verify an online pharmacy", "https://safe.pharmacy/"),
    "besaferx": ("FDA BeSafeRx — buying medicines online safely", "https://www.fda.gov/drugs/quick-tips-buying-medicines-over-internet/besaferx-your-source-online-pharmacy-information"),
    "fdaglp1": ("FDA — concerns with unapproved GLP-1 drugs used for weight loss", "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss"),
    "medwatch": ("FDA MedWatch — report a side effect", "https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program"),
    "medeffect": ("Health Canada MedEffect — report a side effect", "https://www.canada.ca/en/health-canada/services/drugs-health-products/medeffect-canada.html"),
    "cabuy": ("Health Canada — buying drugs over the internet", "https://www.canada.ca/en/health-canada/services/buying-drugs-over-internet.html"),
    "napra": ("NAPRA — Canada's pharmacy regulatory authorities", "https://www.napra.ca/"),
    "novocare": ("NovoCare — Novo Nordisk patient and self-pay programs", "https://www.novocare.com/"),
    "lillydirect": ("LillyDirect — Eli Lilly self-pay pharmacy", "https://www.lillydirect.com/"),
    "medicare": ("Medicare.gov — drug coverage", "https://www.medicare.gov/"),
    "niddk": ("NIDDK (NIH) — diabetes overview", "https://www.niddk.nih.gov/health-information/diabetes"),
    "niddkins": ("NIDDK (NIH) — insulin, medicines and other diabetes treatments", "https://www.niddk.nih.gov/health-information/diabetes/overview/insulin-medicines-treatments"),
    "medline": ("MedlinePlus (NIH) — diabetes medicines", "https://medlineplus.gov/diabetesmedicines.html"),
    "legitscript": ("LegitScript — healthcare merchant certification", "https://www.legitscript.com/"),
    "netlify": ("Netlify privacy policy (our host)", "https://www.netlify.com/privacy/"),
}

def label_src(d):
    q = d["short"].split(" (")[0].replace(" ", "+")
    return (f'{d["short"]} prescribing information (DailyMed)', f"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query={q}")

def sources(*items, title="Sources", intro=""):
    """items: SRC keys or (text, href) tuples."""
    links = [SRC[i] if isinstance(i, str) else i for i in items]
    return (f'<section class="src"><h2 id="sources">{E(title)}</h2>{intro}<p class="note">Checked against these primary sources on '
            f'<time datetime="{C["UPDATED"]}">{human_date(C["UPDATED"])}</time>.</p><ul>' +
            "".join(f"<li>{ext(E(h), E(t))}</li>" for t, h in dict.fromkeys(links)) + "</ul></section>")

def share(path, title):
    from urllib.parse import quote
    u, t = quote(url(path), safe=""), quote(title, safe="")
    links = [("WhatsApp", f"https://wa.me/?text={t}%20{u}"), ("Facebook", f"https://www.facebook.com/sharer/sharer.php?u={u}"),
             ("LinkedIn", f"https://www.linkedin.com/sharing/share-offsite/?url={u}"), ("X", f"https://twitter.com/intent/tweet?url={u}&amp;text={t}"),
             ("Email", f"mailto:?subject={t}&amp;body={u}")]
    return ('<div class="page-tools" aria-label="Share this page"><span class="pt-h">Share</span>' +
            "".join(f'<a class="chip" href="{h}" rel="noopener nofollow" target="_blank">{n}</a>' for n, h in links) +
            '<button type="button" class="chip" data-share>Copy link</button><button type="button" class="chip" data-print>Print</button></div>')

def auto_faq(body):
    """FAQPage node from question-style headings that are followed by a paragraph."""
    qa = [(re_strip(q), re_strip(a)) for q, a in re.findall(r"<h[23][^>]*>([^<]*\?)</h[23]>\s*<p>(.*?)</p>", body, re.S)]
    if len(qa) < 2: return None
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]}

def dose_chart(d):
    """Step chart of the label titration, drawn as accessible inline SVG (theme-aware via CSS classes)."""
    pts = []
    for lab, val in d["dosing"]:
        m = re.match(r"(\d+(?:\.\d+)?)\s*(mg|mcg)\b", val)  # only rows that state a dose, not "increase by…"
        if m: pts.append((lab, float(m.group(1)), m.group(0)))
    units = {re.sub(r"[\d.\s]", "", p[2]) for p in pts}
    if len(pts) < 3 or len(units) != 1: return ""
    W, H, top, base = 720, 260, 40, 200
    n, mx = len(pts), max(p[1] for p in pts)
    bw = (W - 40) / n
    bars = ""
    for i, (lab, v, txt) in enumerate(pts):
        h = max(8, (base - top) * v / mx)
        x = 20 + i * bw + 8
        bars += (f'<rect class="bar" x="{x:.0f}" y="{base - h:.0f}" width="{bw - 16:.0f}" height="{h:.0f}" rx="8"/>'
                 f'<text class="val" x="{x + (bw - 16) / 2:.0f}" y="{base - h - 10:.0f}">{E(txt)}</text>'
                 f'<text class="lab" x="{x + (bw - 16) / 2:.0f}" y="{base + 24:.0f}">{E(lab if len(lab) < 18 else lab[:16] + "…")}</text>')
    desc = "; ".join(f"{lab}: {txt}" for lab, _, txt in pts)
    return (f'<figure class="chart"><svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="dc-t dc-d"><title id="dc-t">{E(d["short"])} dose steps</title>'
            f'<desc id="dc-d">{E(desc)}</desc><defs><linearGradient id="dcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g1"/><stop offset="1" class="g2"/></linearGradient></defs>'
            f'<line class="axis" x1="20" y1="{base}" x2="{W - 20}" y2="{base}"/>{bars}</svg>'
            f'<figcaption>{E(d["short"])} label titration, step by step. Doses go up only as tolerated and as your prescriber decides.</figcaption></figure>')

def steps_svg(title, desc, steps, caption, sid):
    """Four-step infographic as accessible inline SVG. steps: [(heading, line1, line2)]"""
    W, n = 720, len(steps)
    w = (W - 20 - 14 * (n - 1)) / n
    g = ""
    for i, (h, l1, l2) in enumerate(steps):
        x = 10 + i * (w + 14)
        g += (f'<rect class="box" x="{x:.0f}" y="10" width="{w:.0f}" height="150" rx="16"/><circle class="dot" cx="{x + 30:.0f}" cy="44" r="16"/>'
              f'<text class="num" x="{x + 30:.0f}" y="50">{i + 1}</text><text class="h" x="{x + 16:.0f}" y="90">{E(h)}</text>'
              f'<text class="t" x="{x + 16:.0f}" y="116">{E(l1)}</text><text class="t" x="{x + 16:.0f}" y="136">{E(l2)}</text>')
    return (f'<figure class="chart steps-fig"><svg viewBox="0 0 {W} 170" role="img" aria-labelledby="{sid}-t {sid}-d"><title id="{sid}-t">{E(title)}</title>'
            f'<desc id="{sid}-d">{E(desc)}</desc>{g}</svg><figcaption>{E(caption)}</figcaption></figure>')

def mechanism_fig():
    return steps_svg("How GLP-1 medicines work", "GLP-1 medicines raise insulin after meals, lower glucagon, slow stomach emptying and reduce appetite.",
                     [("More insulin", "released after meals,", "only when sugar is high"), ("Less glucagon", "so the liver makes", "less sugar"),
                      ("Slower stomach", "food leaves the stomach", "more slowly"), ("Less appetite", "the brain signals", "fullness sooner")],
                     "The four main actions of GLP-1 receptor agonists, as described on their labels.", "mech")

def amylin_fig():
    return steps_svg("How amylin analogs work", "Pramlintide slows stomach emptying, lowers glucagon after meals, increases fullness and reduces the after-meal glucose rise.",
                     [("Slower stomach", "food is absorbed", "more gradually"), ("Less glucagon", "after meals, so the", "liver adds less sugar"),
                      ("More fullness", "smaller portions", "feel satisfying"), ("Smaller spike", "after-meal glucose", "rises less")],
                     "The main actions of pramlintide, an amylin analog used with mealtime insulin.", "amy")

def glucagon_fig():
    return steps_svg("What to do in severe low blood sugar", "Give glucagon, call emergency services, turn the person on their side, give sugar once they can swallow.",
                     [("Give glucagon", "follow the device's", "own instructions"), ("Call 911", "even if the person", "wakes up"),
                      ("Turn on side", "they may vomit", "as they recover"), ("Give sugar", "once awake and", "able to swallow")],
                     "General emergency steps — always follow the instructions supplied with your glucagon product.", "gluc")

INSULIN_PROFILE = [  # typical action, hours (onset, peak start, peak end, duration) — approximate label ranges
    ("insulin-lispro", "Rapid-acting (lispro, aspart, glulisine)", .25, 1, 2, 4),
    ("regular-insulin", "Short-acting (regular)", .5, 2, 3, 6),
    ("nph-insulin", "Intermediate (NPH)", 2, 4, 12, 16),
    ("insulin-glargine", "Long-acting (glargine)", 2, None, None, 24),
    ("insulin-degludec", "Ultra-long (degludec)", 1, None, None, 42),
    ("insulin-icodec", "Once-weekly (icodec)", 2, None, None, 48),
]

def insulin_chart(d):
    if d["cat"] != "insulin": return ""
    same = {"insulin-aspart": "insulin-lispro", "insulin-glulisine": "insulin-lispro"}.get(d["slug"], d["slug"])
    W, row, left = 720, 34, 250
    H = 50 + row * len(INSULIN_PROFILE)
    sx = lambda h: left + (W - left - 30) * min(h, 48) / 48
    g = ""
    for i, (slug, lab, on, p1, p2, dur) in enumerate(INSULIN_PROFILE):
        y = 30 + i * row
        cur = " cur" if slug == same else ""
        g += f'<text class="lab lab-l{cur}" x="{left - 12}" y="{y + 15}">{E(lab)}</text>'
        g += f'<rect class="bar{cur}" x="{sx(on):.0f}" y="{y + 4}" width="{sx(dur) - sx(on):.0f}" height="16" rx="8"/>'
        if p1 is not None: g += f'<rect class="peak" x="{sx(p1):.0f}" y="{y + 4}" width="{max(sx(p2) - sx(p1), 4):.0f}" height="16" rx="6"/>'
        if slug == "insulin-icodec": g += f'<text class="val" x="{sx(48) - 6:.0f}" y="{y + 16}" text-anchor="end">≈ 1 week →</text>'
    ticks = "".join(f'<line class="tick" x1="{sx(h):.0f}" y1="24" x2="{sx(h):.0f}" y2="{H - 14}"/><text class="lab" x="{sx(h):.0f}" y="{H}">{h} h</text>' for h in (0, 12, 24, 36, 48))
    return (f'<figure class="chart ins"><svg viewBox="0 0 {W} {H + 6}" role="img" aria-labelledby="ic-t ic-d"><title id="ic-t">How long each insulin type works</title>'
            '<desc id="ic-d">Approximate duration of action: rapid-acting about 4 hours, regular about 6 hours, NPH 12 to 18 hours with a peak at 4 to 12 hours, '
            'glargine about 24 hours, degludec up to 42 hours, icodec about one week.</desc>'
            f'<defs><linearGradient id="dcg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="g1"/><stop offset="1" class="g2"/></linearGradient></defs>{ticks}{g}</svg>'
            '<figcaption>Typical time-action profiles from product labels (darker band = peak). Your response can differ — follow your own plan.</figcaption></figure>')

# ---------------------------------------------------------------- page shell
AC = ' aria-current="page"'
CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'

def menu():
    """Header menu: (label, href or None, columns [(heading, [(title, path, hint)])], 'all' link, mega?)"""
    by_cat = lambda k: [(d["short"], f'/drugs/{d["slug"]}/', d["generic"]) for d in DRUGS if d["cat"] == k]
    short = lambda c: c.split(" (")[0].replace(" & incretin medicines", "")
    return [
        ("Medicines", "/drugs/", [(short(CATS[k]), by_cat(k)) for k in CATS], ("/drugs/", f"All {len(DRUGS)} medicines"), True),
        ("Topics", None, [("Topic guides", [(pl["h1"].split(" —")[0], f'/{pl["slug"]}/', "") for pl in PILLARS] + [("Glossary", "/glossary/", "A–Z definitions")])], None, False),
        ("Compare", "/compare/", [("Comparisons", [(c["title"].split(":")[0], f'/compare/{c["slug"]}/', "") for c in COMPARES] +
                                   [("Compare any two medicines", "/compare/#builder", "Interactive tool")])], ("/compare/", "All comparisons"), False),
        ("Guides", "/guides/", [("Buy safely", [(g["title"], f'/guides/{g["slug"]}/', "") for g in GUIDES])], ("/guides/", "All guides"), False),
        ("Questions", "/questions/", [("Questions", [(q[1], f"/questions/{q[0]}/", "") for q in QUESTIONS])], ("/questions/", f"All {len(QUESTIONS)} questions"), True),
        ("Blog", "/blog/", [(BLOG_CATS[k], [(bp["title"].split(":")[0], post_path(bp), "") for bp in POSTS if DRUG[bp["drug"]]["cat"] == k]) for k in BLOG_CATS],
         ("/blog/", f"All {len(POSTS)} posts"), True),
        ("About", "/about/", [("Who we are", [(TRUST[k][0], f"/{k}/", "") for k in TRUST] + [("Contact", "/contact/", "")])], None, False),
    ]

def nav_html(path):
    out = []
    for label, href, cols, all_link, mega in menu():
        paths = [p for _, items in (cols or []) for _, p, _ in items]
        exact = href == path
        in_sec = exact or path in paths or (href and href != "/about/" and path.startswith(href))
        cur = ' aria-current="page"' if exact else (' aria-current="true"' if in_sec else "")
        cls = "ni" + (" has-sub" if cols else "") + (" mega" if mega else "") + (" is-active" if in_sec else "")
        sid = "sub-" + slugify(label)
        top = (f'<a class="nl" href="{href}"{cur}>{label}</a>' if href else
               f'<button type="button" class="nl nl-btn" aria-expanded="false" aria-controls="{sid}"{cur}>{label}{CHEV}</button>')
        if not cols:
            out.append(f'<li class="{cls}">{top}</li>'); continue
        tog = f'<button type="button" class="nt" aria-expanded="false" aria-controls="{sid}" aria-label="Show {label} pages">{CHEV}</button>' if href else ""
        body = ""
        for head, items in cols:
            body += f'<div class="sub-col"><p class="sub-h">{E(head)}</p><ul>'
            for t, p, hint in items:
                here = p == path
                body += (f'<li><a href="{p}"{AC if here else ""}><span>{E(t)}</span>'
                         + (f'<small>{E(hint)}</small>' if hint else "") + ('<em class="here">You are here</em>' if here else "") + "</a></li>")
            body += "</ul></div>"
        foot = f'<a class="sub-all" href="{all_link[0]}">{E(all_link[1])} →</a>' if all_link else ""
        out.append(f'<li class="{cls}">{top}{tog}<div class="sub" id="{sid}"><div class="sub-in">{body}</div>{foot}</div></li>')
    return '<ul class="nav">' + "".join(out) + "</ul>"

def og_key(path):
    return "home" if path == "/" else path.strip("/").replace("/", "-").replace(".html", "")

SEO_TITLES = {
    "/compare/wegovy-vs-zepbound/": "Wegovy vs Zepbound: Semaglutide vs Tirzepatide",
    "/diabetes-injections/": "Diabetes Injections: Full List for Type 1 & Type 2",
    "/guides/compounded-and-counterfeit-glp1/": "Compounded & Counterfeit GLP-1s: The Real Risks",
    "/questions/glp1-pregnancy/": "Can You Take Ozempic or Wegovy While Pregnant?",
}
SEO_DESC = {
    "/diabetes-injections/": "Every diabetes injection in the US and Canada: GLP-1s, dual agonists, insulins, combinations and glucagon — uses, dosing, side effects and cost.",
    "/guides/how-to-buy-glp1-legally-usa/": "The legal ways to buy Wegovy, Zepbound, Ozempic, Mounjaro and GLP-1 pills in the US: prescriptions, pharmacies, telehealth and manufacturer self-pay.",
}

def page(path, title, desc, body, *, crumbs=None, nodes=None, kw=None, kind="MedicalWebPage", label="Guide",
         og_title=None, body_class="", article=True, search=None, noindex=False):
    canonical = url(path)
    title, desc = SEO_TITLES.get(path, title), SEO_DESC.get(path, desc)
    indexable = path.endswith("/") and not noindex
    suffix = f" | {C['SITE']}"
    if path == "/":
        full_title = f"{C['SITE']}: GLP-1, Weight-Loss & Diabetes Medicine Guide"
    else:
        full_title = title + suffix if len(title) + len(suffix) <= 60 else title
    if indexable:
        if not 30 <= len(full_title) <= 60: WARNINGS.append(f"title {len(full_title)} chars: {path}")
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
    org["contactPoint"] = [{"@type": "ContactPoint", "contactType": "editorial", "email": C["EMAIL"], "availableLanguage": ["en", "fr"],
                            "areaServed": ["US", "CA"], "url": url("/contact/")}]
    if C.get("EMAIL_ALT"): org["contactPoint"].append({"@type": "ContactPoint", "contactType": "customer support", "email": C["EMAIL_ALT"], "availableLanguage": ["en", "fr"]})
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

    nav = nav_html(path)
    verify = "".join(f'\n<meta name="{n}" content="{E(C[k])}">' for k, n in (("GOOGLE_VERIFY", "google-site-verification"), ("BING_VERIFY", "msvalidate.01")) if C.get(k) and path == "/")
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
<meta name="author" content="{E(C['EDITOR'])}">{verify}
<meta name="theme-color" content="#070b14" media="(prefers-color-scheme: dark)"><meta name="theme-color" content="#f3f6fb" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="dark light">
<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="{E(C['SITE'])}"><meta property="og:locale" content="en_US"><meta property="og:locale:alternate" content="en_CA">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{E(og_title or title)}">{art_meta}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{E(title)}"><meta name="twitter:description" content="{E(desc)}"><meta name="twitter:image" content="{og_img}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt">
<link rel="alternate" type="application/rss+xml" title="{E(C['SITE'])} blog" href="/blog/feed.xml">
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
<div class="foot-brand"><strong>{E(C['SITE'])}</strong><p>Independent information on GLP-1, incretin and insulin medicines for the US and Canada. We do not sell or ship medicines.</p><p class="foot-mail"><a href="mailto:{E(C['EMAIL'])}">{E(C['EMAIL'])}</a></p><p class="small">Last site-wide review: <time datetime="{C['UPDATED']}">{human_date(C['UPDATED'])}</time></p></div>
<div><strong>Topics</strong><a href="/semaglutide/">Semaglutide</a><a href="/tirzepatide/">Tirzepatide</a><a href="/diabetes-injections/">Diabetes injections</a><a href="/weight-loss-injections/">Weight loss injections</a><a href="/insulin/">Insulin</a></div>
<div><strong>Site</strong><a href="/drugs/">All medicines</a><a href="/compare/">Comparisons</a><a href="/guides/">Guides</a><a href="/questions/">Questions</a><a href="/blog/">Blog</a><a href="/glossary/">Glossary</a></div>
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
    if path.endswith("/"):
        d = os.path.join(OUT, path.strip("/"))
        os.makedirs(d, exist_ok=True)
        target = os.path.join(d, "index.html")
    else:
        target = os.path.join(OUT, path.strip("/"))
    if indexable:
        SITEMAP.append((path, og_img))
        LLM_PAGES.append((title, path, desc, body))
        if search is not False:
            SEARCH.append(search or {"t": title, "u": path, "k": label, "s": ""})
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
    if len(title) > 60: title = title.replace("Uses, ", "")
    if len(title) > 60: title = f'{d["short"]}: Uses, Dosage, Side Effects & Cost'
    if pipeline: title = f'{d["short"]}: Approval Status, Trial Results & Availability'
    desc = f'{d["short"]} ({d["generic"]}) by {d["maker"]}: what it treats, label dosing, side effects, cost and legal ways to get it in the US and Canada.'
    if len(desc) > 160: desc = f'{d["short"]} ({d["generic"]}): what it treats, label dosing, side effects, cost and legal ways to get it in the US and Canada.'
    if pipeline: desc = f'{d["short"]} ({d["generic"]}) status in 2026: FDA review, trial results and why online sellers are not legitimate.'
    cls = lower_first(d["cls"])
    art = "an" if cls[0].lower() in "aeiou" else "a"
    uses = [lower_first(u) for u in d["uses"]]
    gen = "" if d["generic"].lower() == d["short"].lower() else f' ({E(d["generic"])})'
    if pipeline:
        summary = (f'<strong>{E(d["short"])}</strong>{gen} is an investigational {E(cls)} from {E(d["maker"])}. '
                   f'It is not approved and cannot legally be bought outside a registered clinical trial. {E(d["us"])}')
    else:
        summary = (f'<strong>{E(d["short"])}</strong>{gen} is {art} {E(cls)} made by {E(d["maker"])}, used for {E(join_and(uses))}. '
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
    bp = POST_BY_DRUG.get(d["slug"])
    if bp: b += f'<p class="callout">Practical guide: <a href="{post_path(bp)}">{E(bp["title"])}</a></p>'
    b += '<section><h2 id="uses">What it is used for</h2><ul class="checks">' + "".join(f"<li>{E(u)}</li>" for u in d["uses"]) + "</ul></section>"
    b += (f'<section><h2 id="dosage">{E(d["short"])} dosage</h2><p class="note">Per the official label. Your prescriber sets your dose — never change it on your own.</p>'
          f'<div class="tbl"><table class="t steps"><caption class="sr">{E(d["short"])} label dosing schedule</caption><tbody>' +
          "".join(f'<tr><th scope="row"><span class="step">{i + 1}</span>{E(a)}</th><td>{E(v)}</td></tr>' for i, (a, v) in enumerate(d["dosing"])) + "</tbody></table></div>" + dose_chart(d))
    b += f'<h3>How to take it</h3><p>{E(d["take"])}</p><h3>Storage</h3><p>{E(d["store"])}</p></section>'
    if not dose_chart(d) and d["cat"] in ("glp1", "pipeline"): b += '<section><h2 id="how-it-works">How it works</h2>' + mechanism_fig() + "</section>"
    if d["slug"] == "glucagon": b += '<section><h2 id="emergency-steps">Emergency steps</h2>' + glucagon_fig() + "</section>"
    if is_ins: b += '<section><h2 id="insulin-types">How long it works compared with other insulins</h2>' + insulin_chart(d) + "</section>"
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
    b += sources(label_src(d), "drugsfda", "dpd", "ctgov" if pipeline else ("medwatch" if not is_ins else "niddkins"), "medeffect")
    rel = [DRUG.get(r) for r in d["related"] if r in DRUG]
    rc = [c for c in COMPARES if c["slug"] in d["related"]]
    if rel or rc:
        b += '<section><h2>Related</h2><div class="grid">' + (link_card(post_path(bp), "Blog", bp["title"]) if bp else "") + "".join(card(r) for r in rel) + \
             "".join(link_card(f'/compare/{c["slug"]}/', "Compare", c["title"]) for c in rc) + "</div></section>"
    b += share(p, title)
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
    b += sources(label_src(a), label_src(bd), "drugsfda", "dpd")
    b += f'<section><h2>Related</h2><div class="grid">{card(a)}{card(bd)}{link_card("/compare/#builder", "Tool", "Compare any two medicines")}</div></section>'
    b += share(p, c["title"])
    b, toc = with_toc(b)
    nodes = [{"@type": "ItemList", "@id": url(p) + "#compared", "name": c["title"], "itemListElement": [
        {"@type": "ListItem", "position": 1, "item": {"@type": "Drug", "name": a["short"], "nonProprietaryName": a["generic"], "url": url(f'/drugs/{a["slug"]}/')}},
        {"@type": "ListItem", "position": 2, "item": {"@type": "Drug", "name": bd["short"], "nonProprietaryName": bd["generic"], "url": url(f'/drugs/{bd["slug"]}/')}}]}]
    page(p, c["title"], c["desc"], doc_layout(b, toc), crumbs=[("Home", "/"), ("Compare", "/compare/"), (c["title"].split(":")[0], p)],
         nodes=nodes, label="Comparison", search={"t": c["title"], "u": p, "k": "Compare", "s": a["generic"] + " " + bd["generic"]})

GUIDE_SRC = {
    "how-to-buy-glp1-legally-usa": ("safepharm", "besaferx", "novocare", "lillydirect", "fdaglp1"),
    "how-to-buy-glp1-legally-canada": ("cabuy", "napra", "dpd", "medeffect"),
    "glp1-cost-without-insurance": ("novocare", "lillydirect", "medicare", "safepharm"),
    "compounded-and-counterfeit-glp1": ("fdaglp1", "besaferx", "safepharm", "medwatch", "medeffect"),
    "glp1-side-effects": ("dailymed", "medwatch", "medeffect", "fdaglp1"),
    "glp1-pipeline-2026": ("ctgov", "drugsfda", "fdaglp1"),
}

def guide_page(g):
    p = f'/guides/{g["slug"]}/'
    first = re.search(r"<p>(.*?)</p>", g["body"], re.S)
    b = f'<header class="doc-head"><span class="tag">Guide</span><h1>{E(g["title"])}</h1>{updated_box()}<p class="lead">{E(g["desc"])}</p></header>'
    if first: b += tldr(first.group(1), "Key point")
    b += g["body"].replace(first.group(0), "", 1) if first else g["body"]
    b += sources(*GUIDE_SRC.get(g["slug"], ("drugsfda", "dpd")))
    b += share(p, g["title"])
    b, toc = with_toc(b)
    fq = auto_faq(g["body"])
    page(p, g["title"], g["desc"], doc_layout(b, toc), crumbs=[("Home", "/"), ("Guides", "/guides/"), (g["title"], p)], label="Guide", nodes=[fq] if fq else None,
         search={"t": g["title"], "u": p, "k": "Guide", "s": g["desc"]})

def fill(s): return s.format(SITE=E(C["SITE"]), EMAIL=E(C["EMAIL"]), EMAIL_ALT=E(C.get("EMAIL_ALT") or C["EMAIL"]), EDITOR=E(C["EDITOR"]),
                             REVIEWER=E(REVIEWER_TXT), UPDATED=human_date(C["UPDATED"]))

TRUST_TITLES = {
    "about": "About GLP Atlas: Independent GLP-1 Medicine Reference",
    "editorial-policy": "Editorial Policy: How We Research and Review",
    "medical-disclaimer": "Medical Disclaimer: Information, Not Medical Advice",
    "affiliate-disclosure": "Affiliate Disclosure: How GLP Atlas Is Funded",
    "privacy": "Privacy Policy: What Data GLP Atlas Collects",
}
TRUST_SRC = {"about": ("drugsfda", "dpd", "dailymed"), "editorial-policy": ("drugsfda", "dpd", "dailymed", "ctgov"),
             "medical-disclaimer": ("medwatch", "medeffect"), "affiliate-disclosure": ("legitscript", "safepharm"), "privacy": ("netlify",)}

def trust_pages():
    kinds = {"about": "AboutPage"}
    for slug, (t, desc, body) in TRUST.items():
        p = f"/{slug}/"
        body = fill(body)
        long_desc = desc if len(desc) >= 70 else f"{desc} {C['SITE']} is an independent GLP-1, weight-loss and diabetes medicine reference for the US and Canada."
        b = f'<header class="doc-head"><span class="tag">About {E(C["SITE"])}</span><h1>{E(t)}</h1>{updated_box()}</header>{body}' + sources(*TRUST_SRC.get(slug, ("drugsfda",)))
        page(p, TRUST_TITLES.get(slug, t), long_desc, f'<article class="doc doc-narrow">{b}</article>', og_title=t,
             crumbs=[("Home", "/"), (t, p)], kind=kinds.get(slug, "WebPage"), label="About", search={"t": t, "u": p, "k": "Site", "s": ""})
    ep = C["FORM_ENDPOINT"]
    if ep == "php":
        form_tag = ('<form class="form" name="contact" method="POST" action="/contact.php" data-guard>'
                    '<input type="hidden" name="ts" value="">')
    elif ep == "netlify":
        form_tag = '<form class="form" name="contact" method="POST" action="/contact/thanks/" data-netlify="true" netlify-honeypot="bot-field"><input type="hidden" name="form-name" value="contact">'
    elif ep:
        form_tag = f'<form class="form" action="{E(ep)}" method="POST">'
    else:
        form_tag = f'<form class="form" action="mailto:{E(C["EMAIL"])}" method="POST" enctype="text/plain">'
    alt = f' or <a href="mailto:{E(C["EMAIL_ALT"])}">{E(C["EMAIL_ALT"])}</a>' if C.get("EMAIL_ALT") else ""
    intro = tldr(f'Write to <a href="mailto:{E(C["EMAIL"])}">{E(C["EMAIL"])}</a>{alt}, or use the form below. We answer corrections within 5 business days.', "How to reach us")
    alt_card = f'<div><b>General enquiries</b><a href="mailto:{E(C["EMAIL_ALT"])}">{E(C["EMAIL_ALT"])}</a></div>' if C.get("EMAIL_ALT") else ""
    body = f'''<header class="doc-head"><span class="tag">Contact</span><h1>Contact the editors</h1>{updated_box()}</header>
{intro}
<div class="warn" role="note"><strong>We do not sell, ship or broker medicines and cannot answer requests to buy them.</strong> For medical questions, ask your doctor or pharmacist. In an emergency call 911.</div>
<div class="contact-cards"><div><b>Editorial &amp; corrections</b><a href="mailto:{E(C['EMAIL'])}">{E(C['EMAIL'])}</a></div>{alt_card}<div><b>Response time</b>Within 5 business days</div></div>
<h2 id="form">Send a message</h2>
<p>Use this form for corrections, editorial questions, press and partnership enquiries. Please do not include personal health information.</p>
{form_tag}
<p class="form-msg" role="status" hidden></p>
<p class="hp" aria-hidden="true"><label>Leave this field empty<input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
<label>Name<input name="name" autocomplete="name" required></label><label>Email<input type="email" name="email" autocomplete="email" required></label>
<label>Topic<select name="topic"><option>Correction</option><option>Editorial question</option><option>Press</option><option>Partnership / advertising</option></select></label>
<label>Message<textarea name="message" rows="6" required></textarea></label>
<p class="note">By sending this form you agree that we store your message to reply to you. See our <a href="/privacy/">privacy policy</a>.</p>
<button class="btn" type="submit">Send message</button></form>
''' + sources("medwatch", "medeffect", title="Had a side effect? Report it", intro="<p>We cannot give medical advice. Tell your prescriber or pharmacist, and report it to the regulator so it is tracked nationally.</p>")
    page("/contact/", "Contact the GLP Atlas Editors: Corrections & Press",
         f"Contact the {C['SITE']} editorial team at {C['EMAIL']} for corrections, editorial questions, press and partnership enquiries. We do not sell medicines.",
         f'<article class="doc doc-narrow">{body}</article>', og_title="Contact the editors",
         crumbs=[("Home", "/"), ("Contact", "/contact/")], kind="ContactPage", label="Contact", search={"t": "Contact the editors", "u": "/contact/", "k": "Site", "s": "email corrections press " + C["EMAIL"]})
    page("/contact/thanks/", "Message sent", "Thank you — your message reached the editors.",
         f'<section class="hero hero-404"><p class="eyebrow">Message sent</p><h1>Thank you — we got your message</h1><p class="hero-sub">The editors reply within 5 business days from {E(C["EMAIL"])}.</p>'
         '<p><a class="btn" href="/">Back to the homepage</a> <a class="btn btn-ghost" href="/drugs/">Browse medicines</a></p></section>',
         kind="WebPage", label="Contact", body_class="home", article=False, noindex=True)

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
         f'<p class="lead">{len(DRUGS)} medicines available or in development in the United States and Canada. Filter by what they treat, how they are taken, and how often.</p>' + updated_box() + '</header>'
         '<div class="finder"><div class="field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
         '<input class="search" id="drug-q" type="search" placeholder="Search by brand, generic or misspelling…" aria-label="Search medicines"></div>' + CHIPS +
         '<p class="count" aria-live="polite"><span data-count>' + str(len(DRUGS)) + '</span> medicines shown</p></div>')
    for k, v in CATS.items():
        b += f'<section class="drug-group reveal"><h2>{E(v)}</h2><div class="grid">' + "".join(card(d) for d in DRUGS if d["cat"] == k) + "</div></section>"
    b += '<p class="empty" hidden>No medicine matches those filters. <button type="button" class="chip" data-reset>Clear filters</button></p>'
    b += sources("drugsfda", "dailymed", "dpd", "ctgov")
    page("/drugs/", "All GLP-1, Incretin & Insulin Medicines (A–Z)",
         "Every GLP-1, incretin, insulin and diabetes injectable in the US and Canada, with uses, label dosing, side effects and legal access.", b,
         crumbs=[("Home", "/"), ("Medicines", "/drugs/")], kind="CollectionPage", label="Medicines",
         nodes=[item_list("All medicines", [(d["name"], f'/drugs/{d["slug"]}/') for d in DRUGS])],
         search={"t": "All medicines (A–Z)", "u": "/drugs/", "k": "Hub", "s": "list finder"})

    opts = "".join(f'<optgroup label="{E(v)}">' + "".join(f'<option value="{d["slug"]}">{E(d["name"])}</option>' for d in DRUGS if d["cat"] == k) + "</optgroup>" for k, v in CATS.items())
    b = ('<header class="hub-head"><span class="eyebrow">Side by side</span><h1>GLP-1 comparisons</h1>'
         '<p class="lead">Editor-written comparisons of the most-searched pairs, plus a builder to line up any two medicines from the label facts.</p>' + updated_box() + '</header>'
         '<section><h2>Editorial comparisons</h2><div class="grid">' +
         "".join(link_card(f'/compare/{c["slug"]}/', "Compare", c["title"], c["desc"]) for c in COMPARES) + "</div></section>"
         f'<section class="builder reveal" id="builder"><h2>Compare any two medicines</h2><p class="note">Facts pulled from each medicine page. Pick two to see them side by side.</p>'
         f'<div class="cmp-pick"><label>First medicine<select id="cmpA">{opts}</select></label>'
         '<button type="button" class="ibtn swap" id="cmpSwap" aria-label="Swap medicines">⇄</button>'
         f'<label>Second medicine<select id="cmpB">{opts}</select></label></div>'
         '<div id="cmpOut" class="cmp-out" aria-live="polite"><noscript><p>Turn on JavaScript to use the comparison builder, or open the editorial comparisons above.</p></noscript></div></section>'
         + sources("drugsfda", "dailymed", "dpd"))
    page("/compare/", "GLP-1 Comparisons: Ozempic, Wegovy, Zepbound & More",
         "Side-by-side comparisons of Ozempic, Wegovy, Zepbound, Mounjaro, Foundayo and Saxenda, plus a tool to compare any two GLP-1 or insulin medicines.", b,
         crumbs=[("Home", "/"), ("Compare", "/compare/")], kind="CollectionPage", label="Compare",
         nodes=[item_list("Comparisons", [(c["title"], f'/compare/{c["slug"]}/') for c in COMPARES])],
         search={"t": "Compare any two medicines", "u": "/compare/", "k": "Tool", "s": "comparison builder vs versus"})

    b = ('<header class="hub-head"><span class="eyebrow">Buy safely</span><h1>GLP-1 guides</h1>'
         '<p class="lead">Practical, source-based guides on legal access, real costs, side effects and how to avoid counterfeit pens.</p>' + updated_box() + '</header>'
         '<div class="grid grid-lg">' + "".join(link_card(f'/guides/{g["slug"]}/', "Guide", g["title"], g["desc"]) for g in GUIDES) + "</div>"
         + sources("safepharm", "besaferx", "cabuy", "fdaglp1"))
    page("/guides/", "GLP-1 Guides: Buying Legally, Cost & Safety",
         "Guides on buying GLP-1 medicines legally in the US and Canada, costs without insurance, side effects and counterfeit risks.", b,
         crumbs=[("Home", "/"), ("Guides", "/guides/")], kind="CollectionPage", label="Guides",
         nodes=[item_list("Guides", [(g["title"], f'/guides/{g["slug"]}/') for g in GUIDES])],
         search={"t": "All guides", "u": "/guides/", "k": "Hub", "s": ""})

BLOG_CATS = {"glp1": "GLP-1 & combinations", "insulin": "Insulin", "other": "Rescue & add-on", "pipeline": "Pipeline"}

def post_path(bp): return f'/blog/{bp["slug"]}/'

def words(h): return len(re_strip(h).split())

def blog_post_page(bp):
    d = DRUG[bp["drug"]]
    p = post_path(bp)
    cat = BLOG_CATS[d["cat"]]
    body_html = "".join(f"<h2>{E(h)}</h2>{html_}" for h, html_ in bp["sections"])
    minutes = max(3, round((words(body_html) + words(bp["tldr"]) + 120) / 220))
    b = (f'<header class="doc-head"><span class="tag t-{d["cat"]}">Blog · {E(cat)}</span><h1>{E(bp["title"])}</h1>{updated_box()}'
         f'<p class="lead">{E(bp["desc"])}</p><p class="read-time">{minutes} min read</p></header>')
    b += tldr(E(bp["tldr"]), "Key takeaways")
    b += (f'<section><h2 id="at-a-glance">{E(d["short"])} at a glance</h2><div class="tbl"><table class="t"><tbody>'
          f'<tr><th scope="row">Generic name</th><td>{E(d["generic"])}</td></tr><tr><th scope="row">Made by</th><td>{E(d["maker"])}</td></tr>'
          f'<tr><th scope="row">Type</th><td>{E(d["cls"])}</td></tr><tr><th scope="row">Form</th><td>{E(d["form"])}</td></tr>'
          f'<tr><th scope="row">How often</th><td>{E(d["freq"])}</td></tr><tr><th scope="row">United States</th><td>{E(d["us"])}</td></tr>'
          f'<tr><th scope="row">Canada</th><td>{E(d["ca"])}</td></tr></tbody></table></div>'
          f'<p><a class="more" href="/drugs/{d["slug"]}/">Full {E(d["short"])} reference: uses, dosing, side effects →</a></p></section>')
    fig = dose_chart(d) or insulin_chart(d) or {"glucagon": glucagon_fig, "symlin": amylin_fig}.get(d["slug"], mechanism_fig if d["cat"] in ("glp1", "pipeline") else str)()
    secs = bp["sections"]
    for i, (h, html_) in enumerate(secs):
        b += f"<section><h2>{E(h)}</h2>{html_}" + (fig if i == 1 else "") + "</section>"
    if d.get("boxed") or d.get("boxed_note"):
        b += f'<div class="warn" role="note"><strong>⚠ {E(d.get("boxed_note", BOXED_GLP1))}</strong></div>'
    fh, fnode = faq_block(bp["faqs"])
    b += fh
    rq = [q for q in QUESTIONS if d["slug"] in q[3]][:4]
    rc = [c for c in COMPARES if d["slug"] in (c["a"], c["b"])]
    more = [x for x in POSTS if x is not bp and DRUG[x["drug"]]["cat"] == d["cat"]][:3]
    b += ('<section><h2>Keep reading</h2><div class="grid">' + card(d) +
          "".join(link_card(f'/compare/{c["slug"]}/', "Compare", c["title"]) for c in rc) +
          "".join(link_card(f"/questions/{q[0]}/", "Question", q[1]) for q in rq) +
          "".join(link_card(post_path(x), "Blog", x["title"]) for x in more) + "</div></section>")
    b += sources(label_src(d), "drugsfda", "dpd", "ctgov" if d["cat"] == "pipeline" else "medwatch", "medeffect")
    b += '<p class="note">General information based on the official label. It does not replace advice from your prescriber or pharmacist.</p>'
    b += share(p, bp["title"])
    b, toc = with_toc(b, skip=("Keep reading",))
    article = {"@type": "BlogPosting", "@id": url(p) + "#article", "_about": True, "headline": bp["title"], "description": bp["desc"],
               "url": url(p), "image": url(f"/og/{og_key(p)}.png"), "datePublished": C["PUBLISHED"], "dateModified": C["UPDATED"],
               "author": {"@id": url("/about/#editor")}, "publisher": {"@id": url("/#org")}, "mainEntityOfPage": {"@id": url(p) + "#webpage"},
               "isPartOf": {"@id": url("/blog/") + "#blog"}, "articleSection": cat, "keywords": ", ".join([d["short"], d["generic"]] + bp["tags"]),
               "wordCount": words(b), "inLanguage": "en", "about": {"@id": url(f'/drugs/{d["slug"]}/') + "#drug", "@type": "Drug", "name": d["short"]}}
    nodes = [article] + ([fnode] if fnode else [])
    page(p, bp["title"], bp["desc"], doc_layout(b, toc), crumbs=[("Home", "/"), ("Blog", "/blog/"), (bp["title"].split(":")[0], p)],
         nodes=nodes, kw=[d["short"], d["generic"]] + bp["tags"], label="Blog · " + cat, og_title=bp["title"],
         search={"t": bp["title"], "u": p, "k": "Blog", "s": " ".join([d["short"], d["generic"]] + bp["tags"])})

def blog_index():
    chips = '<div class="fgroup" data-blog-filter><span>Topic</span><button type="button" class="chip on" data-val="">All</button>' + \
            "".join(f'<button type="button" class="chip" data-val="{k}">{E(v)}</button>' for k, v in BLOG_CATS.items()) + "</div>"
    b = ('<header class="hub-head"><span class="eyebrow">Blog</span><h1>GLP-1 and diabetes medicine blog</h1>'
         f'<p class="lead">{len(POSTS)} practical guides — one for every medicine we cover: the first weeks, dose steps, side effects, storage and the questions to ask your prescriber.</p>'
         + updated_box() + '</header>')
    b += tldr("Each post is written for one medicine and stays within its official label: how to start, what each dose step feels like, how to handle side effects, "
              "storage, cost and the questions to ask your prescriber. Every post links to the full medicine reference and to its sources.", "About this blog")
    b += ('<div class="finder"><div class="field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
          '<input class="search" type="search" data-filter=".posts > a" placeholder="Search the blog…" aria-label="Search blog posts"></div>' + chips + '</div>')
    b += '<div class="grid grid-lg posts">' + "".join(
        f'<a class="card post-card" href="{post_path(bp)}" data-cat="{DRUG[bp["drug"]]["cat"]}" data-q="{E((bp["title"] + " " + bp["desc"] + " " + " ".join(bp["tags"])).lower())}">'
        f'<img class="thumb" src="/og/{og_key(post_path(bp))}.png" alt="{E(bp["title"])}" width="1200" height="630" loading="lazy" decoding="async">'
        f'<span class="tag t-{DRUG[bp["drug"]]["cat"]}">{E(BLOG_CATS[DRUG[bp["drug"]]["cat"]])}</span><strong>{E(bp["title"])}</strong>'
        f'<span class="card-sub">{E(bp["desc"])}</span><span class="card-go" aria-hidden="true">→</span></a>' for bp in POSTS) + "</div>"
    b += '<p class="empty" hidden>No post matches. <button type="button" class="linkish" data-open-palette>Search the whole site</button>.</p>'
    b += f'<p class="note">Subscribe with any feed reader: <a href="/blog/feed.xml">RSS feed</a>.</p>'
    b += sources("dailymed", "drugsfda", "dpd", "medwatch")
    blog = {"@type": "Blog", "@id": url("/blog/") + "#blog", "name": f'{C["SITE"]} blog', "url": url("/blog/"), "publisher": {"@id": url("/#org")},
            "inLanguage": "en", "blogPost": [{"@type": "BlogPosting", "@id": url(post_path(bp)) + "#article", "headline": bp["title"], "url": url(post_path(bp)),
                                              "datePublished": C["PUBLISHED"], "author": {"@id": url("/about/#editor")}} for bp in POSTS]}
    page("/blog/", "GLP-1 & Diabetes Medicine Blog: Practical Guides",
         "Practical guides for every GLP-1, insulin and diabetes medicine: first weeks, dose steps, side effects, storage and questions to ask, for the US and Canada.",
         b, crumbs=[("Home", "/"), ("Blog", "/blog/")], kind="CollectionPage", label="Blog", nodes=[blog],
         search={"t": "Blog — all posts", "u": "/blog/", "k": "Hub", "s": "articles posts guides"})

def rss():
    from email.utils import format_datetime
    pub = format_datetime(datetime.datetime.fromisoformat(C["UPDATED"] + "T09:00:00+00:00"))
    items = "".join(f"<item><title>{E(bp['title'])}</title><link>{url(post_path(bp))}</link><guid isPermaLink=\"true\">{url(post_path(bp))}</guid>"
                    f"<pubDate>{pub}</pubDate><description>{E(bp['desc'])}</description><category>{E(BLOG_CATS[DRUG[bp['drug']]['cat']])}</category></item>\n" for bp in POSTS)
    xml = (f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
           f'<title>{E(C["SITE"])} blog</title><link>{url("/blog/")}</link><description>Practical guides to GLP-1, insulin and diabetes medicines (US &amp; Canada).</description>'
           f'<language>en</language><lastBuildDate>{pub}</lastBuildDate><atom:link href="{url("/blog/feed.xml")}" rel="self" type="application/rss+xml"/>\n{items}</channel></rss>\n')
    open(f"{OUT}/blog/feed.xml", "w").write(xml)

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
<div class="hero-cta"><a class="btn" href="/drugs/">Find your medicine</a><a class="btn btn-ghost" href="/compare/#builder">Compare two medicines</a></div>
<div class="quick"><span class="quick-h">Popular:</span>{"".join(f'<button type="button" class="chip" data-palette-q="{q}">{q}</button>' for q in quick)}</div>
<p class="bg-hint" aria-hidden="true"><span class="h-mouse">Move your cursor or click the background — the molecules react.</span><span class="h-touch">Tap the background to send a pulse through the molecules.</span></p>
<dl class="stats">{"".join(f'<div><dt>{t}</dt><dd data-count-to="{n}">{n}</dd></div>' for n, t in stats)}</dl>
</section>
<section class="reveal">{tldr('A <strong>GLP-1 receptor agonist</strong> is a medicine that mimics the gut hormone GLP-1: it raises insulin after meals, lowers glucagon, slows stomach emptying and reduces appetite. Semaglutide (Ozempic, Wegovy) and tirzepatide (Mounjaro, Zepbound) are the best known; all are prescription-only in the US and Canada. <a href="/questions/what-is-glp1/">Read the full answer →</a>', "What is a GLP-1?")}{mechanism_fig()}</section>
<section class="reveal"><div class="sec-head"><h2>Most searched</h2><a class="more" href="/drugs/">All {len(DRUGS)} medicines →</a></div><div class="grid">{"".join(card(DRUG[s]) for s in feat)}</div></section>
<section class="reveal"><div class="sec-head"><h2>What changed in 2026</h2></div><ol class="timeline">{"".join(f'<li><time datetime="{iso}">{lab}</time><a href="{h}">{t}</a></li>' for iso, lab, t, h in NEWS)}</ol></section>
<section class="reveal"><div class="sec-head"><h2>Explore by topic</h2></div><div class="grid">{"".join(link_card(f'/{pl["slug"]}/', "Topic", pl["h1"]) for pl in PILLARS)}</div></section>
<section class="reveal split"><div><div class="sec-head"><h2>Top questions</h2><a class="more" href="/questions/">All questions →</a></div><ul class="qlinks">{"".join(f'<li><a href="/questions/{q[0]}/">{E(q[1])}</a></li>' for q in QUESTIONS[:8])}</ul></div>
<div class="cta-panel"><span class="eyebrow">Interactive</span><h2>Compare any two medicines</h2><p>Line up dosing schedules, approvals and availability for any pair — from Wegovy vs Zepbound to Lantus vs Tresiba.</p><a class="btn" href="/compare/#builder">Open the comparison builder</a></div></section>
<section class="reveal"><div class="sec-head"><h2>Compare</h2><a class="more" href="/compare/">All comparisons →</a></div><div class="grid">{"".join(link_card(f'/compare/{c["slug"]}/', "Compare", c["title"]) for c in COMPARES)}</div></section>
<section class="reveal"><div class="sec-head"><h2>Buy safely</h2><a class="more" href="/guides/">All guides →</a></div><div class="grid">{"".join(link_card(f'/guides/{g["slug"]}/', "Guide", g["title"]) for g in GUIDES[:4])}</div></section>
<section class="reveal"><div class="sec-head"><h2>From the blog</h2><a class="more" href="/blog/">All {len(POSTS)} posts →</a></div><div class="grid">{"".join(link_card(post_path(POST_BY_DRUG[s]), "Blog", POST_BY_DRUG[s]["title"]) for s in ("wegovy", "zepbound", "foundayo", "insulin-icodec"))}</div></section>
<section class="reveal trust-strip"><div><span class="eyebrow">Editorial standards</span><h2>Where our facts come from</h2>
<p>Every page is written from official labels and regulators, carries its review date, and is signed by our editor, <a href="/about/#editor">{E(C["EDITOR"])}</a>. We never sell medicines.</p></div>
<ul class="src-logos">{"".join(f'<li>{ext(E(SRC[k][1]), E(SRC[k][0].split(" — ")[0]))}</li>' for k in ("drugsfda", "dailymed", "dpd", "ctgov", "safepharm"))}</ul></section>'''
    page("/", "GLP-1, weight-loss & diabetes medicines explained",
         "Independent US & Canada guide to GLP-1 and diabetes medicines — Ozempic, Wegovy, Zepbound, Mounjaro, Foundayo, insulin: dosing, side effects, cost, access.",
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
    b += sources(*[label_src(DRUG[s]) for s in pl["drugs"][:4]], "drugsfda", "dpd", "niddkins" if pl["slug"] == "insulin" else "niddk")
    b += share(p, pl["title"])
    b, toc = with_toc(b)
    fq = auto_faq(pl["body"])
    kw = pl["kw"] + [a for s in pl["drugs"] for a in ALIASES.get(s, [])[:4]]
    node = {"@type": "ItemList", "@id": url(p) + "#medicines", "name": f'Medicines: {pl["h1"].split(" —")[0]}',
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": {"@type": "Drug", "@id": url(f"/drugs/{s}/") + "#drug", "name": DRUG[s]["short"],
                                 "nonProprietaryName": DRUG[s]["generic"], "url": url(f"/drugs/{s}/")}} for i, s in enumerate(pl["drugs"])]}
    page(p, pl["title"], pl["desc"], doc_layout(b, toc), crumbs=[("Home", "/"), (pl["h1"].split(" —")[0], p)], nodes=[node] + ([fq] if fq else []), kw=kw, label="Topic",
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
        b += sources(*[label_src(DRUG[r]) for r in rel[:3] if r in DRUG], "fdaglp1" if "compound" in slug or "fake" in slug or "generic" in slug else "medwatch", "dpd")
        b += share(p, qn)
        faq = {"@type": "FAQPage", "@id": url(p) + "#faq", "mainEntity": [{"@type": "Question", "name": qn, "acceptedAnswer": {"@type": "Answer", "text": plain}}]}
        page(p, qn, desc, f'<article class="doc doc-narrow">{b}</article>', crumbs=[("Home", "/"), ("Questions", "/questions/"), (qn, p)], nodes=[faq],
             kw=kw + [DRUG[r]["short"] for r in rel if r in DRUG], label="Question",
             search={"t": qn, "u": p, "k": "Question", "s": " ".join(kw)})
    b = ('<header class="hub-head"><span class="eyebrow">Answers</span><h1>Questions people ask about GLP-1s and diabetes injections</h1>'
         f'<p class="lead">{len(QUESTIONS)} short, label-based answers: missed doses, alcohol, side effects, stopping, pregnancy, storage and cost.</p>' + updated_box() + '</header>'
         '<div class="finder"><div class="field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
         '<input class="search" type="search" data-filter=".qlist li" placeholder="Search questions…" aria-label="Search questions"></div></div><ul class="qlist qlinks">' +
         "".join(f'<li data-q="{E((q[1] + " " + " ".join(q[4])).lower())}"><a href="/questions/{q[0]}/">{E(q[1])}</a></li>' for q in QUESTIONS) + '</ul>'
         '<p class="empty" hidden>No question matches. Try the <button type="button" class="linkish" data-open-palette>site search</button>.</p>'
         + sources("dailymed", "drugsfda", "dpd", "medwatch"))
    page("/questions/", "Questions About Ozempic, Wegovy, Zepbound & Insulin",
         "Answers to the most-searched questions about semaglutide, tirzepatide, GLP-1 pills and insulin: missed doses, alcohol, side effects, pregnancy and cost.", b,
         crumbs=[("Home", "/"), ("Questions", "/questions/")], kind="CollectionPage", label="Questions",
         nodes=[item_list("Questions", [(q[1], f"/questions/{q[0]}/") for q in QUESTIONS])],
         kw=[k for q in QUESTIONS for k in q[4]][:40], search={"t": "All questions", "u": "/questions/", "k": "Hub", "s": "faq"})

def glossary_page():
    letters = sorted({t[0].upper() for t, _ in GLOSSARY})
    b = ('<header class="doc-head"><span class="tag">Reference</span><h1>GLP-1 and diabetes glossary</h1>'
         f'<p class="lead">{len(GLOSSARY)} plain-English definitions of the terms you will meet on labels, in trials and at the pharmacy.</p>{updated_box()}</header>'
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
    b += '</dl><p class="empty" hidden>No term matches.</p>' + sources("niddk", "medline", "drugsfda")
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
           "".join(f"- [{q[1]}]({url('/questions/' + q[0] + '/')}): {re_strip(q[2])}\n" for q in QUESTIONS) + "\n## Blog\n" + \
           "".join(f"- [{bp['title']}]({url(post_path(bp))}): {bp['desc']}\n" for bp in POSTS) + \
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
    if C["HOSTING"] == "netlify":
        open(f"{OUT}/_headers", "w").write(NETLIFY_HEADERS)
    if C["FORM_ENDPOINT"] == "php":
        php = open(os.path.join(HERE, "contact_php.txt")).read()
        for k in ("EMAIL", "EMAIL_ALT", "SITE"): php = php.replace(f"__{k}__", C.get(k) or C["EMAIL"])
        open(f"{OUT}/contact.php", "w").write(php)
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
ExpiresByType text/html "access plus 0 seconds"
ExpiresByType application/rss+xml "access plus 1 hour"
</IfModule>
<IfModule mod_headers.c>
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
Header set X-Frame-Options "SAMEORIGIN"
Header set Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
# HTML is always revalidated, so visitors see a new upload immediately (assets are versioned with ?v=hash)
<FilesMatch "\\.html$">
Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
<FilesMatch "\\.(txt|xml|php)$">
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
    for bp in POSTS: blog_post_page(bp)
    blog_index()
    trust_pages()
    page("/404.html", "Page not found", "Page not found.",
         '<section class="hero hero-404"><p class="eyebrow">Error 404</p><h1>This page drifted out of orbit</h1><p class="hero-sub">The link may be old or mistyped. Search the site or browse all medicines.</p>'
         '<p><button type="button" class="btn" data-open-palette>Search the site</button> <a class="btn btn-ghost" href="/drugs/">Browse all medicines</a></p></section>',
         kind="WebPage", label="Not found", body_class="home", article=False)
    root_files()
    rss()
    try:
        import og
        og.render_all(OUT, OG_JOBS, C["SITE"], C["DOMAIN"].split("//")[1])
    except ImportError as e:
        print(f"! OG images skipped ({e}). Install Pillow: pip install pillow")
    for w in WARNINGS: print("! " + w)
    print(f"Built {len(SITEMAP)} indexable pages into {os.path.relpath(OUT)}")

if __name__ == "__main__":
    build()
