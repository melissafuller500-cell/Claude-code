#!/usr/bin/env python3
"""Dosepedia static site builder. Reads data/, writes dist/.

Internal links are written relative to each page, so dist/ works on any host
or sub-path. Set DOSEPEDIA_LINKS=files to append index.html to directory links
(useful for opening dist/ straight from disk).
"""
import json, os, re, html, pathlib, datetime, markdown

SITE = "https://dosepedia.com"
ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"
FILE_LINKS = os.environ.get("DOSEPEDIA_LINKS") == "files"
CSS = (ROOT / "src/site.css").read_text()
JS = (ROOT / "src/site.js").read_text()
CONTACT = (ROOT / "src/contact.html").read_text()
FONT = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700;800'
        '&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap">')
FAVICON = ("data:image/svg+xml," + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%230B5563'/%3E"
           "%3Crect x='7' y='12' width='18' height='8' rx='4' fill='none' stroke='%23fff' stroke-width='2.4' transform='rotate(-35 16 16)'/%3E"
           "%3Cpath d='M13.7 12.7l4.6 6.6' stroke='%23fff' stroke-width='2.4'/%3E%3C/svg%3E")

PREFIX = "./"  # relative path from the page being built to the site root

def L(p=""):
    """Site-relative path ('drugs/x/') to a link relative to the current page."""
    p = p.lstrip("/")
    if FILE_LINKS and (p == "" or p.endswith("/")):
        p += "index.html"
    return PREFIX + p if p else PREFIX

def dl(d): return L("drugs/%s/" % d["slug"])
def cl(c): return L("class/%s/" % c["slug"])
def bl(p): return L("blog/%s/" % p["slug"])

def at(path):
    global PREFIX
    PREFIX = "../" * path.count("/") or "./"

ICON = {
    "az": '<path d="M4 19 8.5 5h1L14 19M5.6 14h6.8"/><path d="M16 5h5l-5 9h5"/><path d="M18.5 17v4M16.5 19h4"/>',
    "wd": '<path d="M12 3v4M12 17v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/>',
    "mix": '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
    "law": '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    "book": '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    "shield": '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    "nosell": '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    "phone": '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "alert": '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
}
def icon(k, s=22):
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[k]}</svg>')

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\[([^\]]+)\]\((/[^)]*)\)", lambda m: f'<a href="{L(m[2])}">{m[1]}</a>', t)
    return re.sub(r"\[\[(\d+)\]\]", r'<sup><a href="#src-\1" aria-label="Source \1">[\1]</a></sup>', t)

def plain(t):
    return re.sub(r"\[\[\d+\]\]|\*\*", "", t)

def table(tb):
    head = "".join(f"<th scope=\"col\">{inline(h)}</th>" for h in tb["head"])
    rows = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in tb["rows"])
    return f'<div class="tbl"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>'

def checker(t, table_too=True):
    chips = "".join(f'<button type="button" class="chip" data-i="{i}" aria-pressed="false">{inline(r[0])}</button>' for i, r in enumerate(t["rows"]))
    data = html.escape(json.dumps([[plain(c) for c in r] for r in t["rows"]]))
    return (f'<div class="chk" data-rows="{data}" hidden><p class="chk-q">Choose what it would be combined with:</p>'
            f'<div class="chips">{chips}</div><p class="chk-out" aria-live="polite"></p></div>' + (table(t) if table_too else ""))

def block(b):
    if "p" in b: return f"<p>{inline(b['p'])}</p>"
    if "ul" in b: return "<ul>" + "".join(f"<li>{inline(i)}</li>" for i in b["ul"]) + "</ul>"
    if "table" in b: return table(b["table"])
    if "warn" in b: return f'<p class="warn" role="note">{icon("alert", 20)}<span><strong>Warning:</strong> {inline(b["warn"])}</span></p>'
    if "boxed" in b or "emergency" in b:
        k = "boxed" if "boxed" in b else "emergency"
        cls = "boxed" if k == "boxed" else "emerg"
        items = "".join(f"<li>{inline(i)}</li>" for i in b[k]["items"])
        return f'<div class="{cls}"><h3>{inline(b[k]["title"])}</h3><ul>{items}</ul></div>'
    if "interactions" in b:
        return checker(b["interactions"])
    if "steps" in b:
        return '<ol class="steps">' + "".join(f"<li><strong>{inline(t)}</strong><span>{inline(x)}</span></li>" for t, x in b["steps"]) + "</ol>"
    if "timeline" in b:
        return '<ol class="tl">' + "".join(
            f"<li><b>{inline(s['when'])}</b><strong>{inline(s['title'])}</strong><span>{inline(s['text'])}</span></li>"
            for s in b["timeline"]) + "</ol>"
    raise ValueError(f"unknown block {b}")

def find_block(d, sid, kind):
    for s in d["sections"]:
        if s["id"] == sid:
            for b in s["blocks"]:
                if kind in b: return b[kind]
    return None

def schema(d, url):
    page = {"@type": "MedicalWebPage", "@id": url, "url": url, "name": f"{d['name']} ({d['brands'][0]})",
            "description": d["description"], "inLanguage": "en", "dateModified": d["updated"],
            "about": {"@id": url + "#drug"}, "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE},
            "citation": [s[2] for s in d["sources"]]}
    if d.get("reviewer"):
        r = d["reviewer"]
        page["lastReviewed"] = r["date"]
        page["reviewedBy"] = {"@type": "Person", "name": r["name"], "jobTitle": r["title"], "url": SITE + r["url"]}
    drug = {"@type": "Drug", "@id": url + "#drug", "name": d["name"], "nonProprietaryName": d["name"],
            "alternateName": d["brands"], "drugClass": d["class"]["name"], "prescriptionStatus": "https://schema.org/PrescriptionOnly",
            "legalStatus": {"@type": "DrugLegalStatus", "name": d["schedule"]["label"],
                            "applicableLocation": {"@type": "Country", "name": "US"}}}
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q,
           "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in d["faq"]]}
    crumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Drugs", "item": SITE + "/drugs/"},
        {"@type": "ListItem", "position": 2, "name": d["class"]["name"], "item": f"{SITE}/class/{d['class']['slug']}/"},
        {"@type": "ListItem", "position": 3, "name": d["name"], "item": url}]}
    return json.dumps({"@context": "https://schema.org", "@graph": [page, drug, faq, crumbs]}, separators=(",", ":"))

def simple_ld(kind, path, name):
    url = f"{SITE}/{path}"
    return json.dumps({"@context": "https://schema.org", "@type": kind, "@id": url, "url": url, "name": name,
                       "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE}}, separators=(",", ":"))

JUMP = {"uses": "Uses", "dosage": "Dosing", "risks": "Risks", "interactions": "Mixing", "overdose": "Overdose",
        "withdrawal": "Withdrawal", "legal-access": "Buying legally", "buy-online": "Ordering online", "legal-status": "Legal status"}
NAV = [("drugs/", "Drugs A to Z"), ("withdrawal/", "Withdrawal"), ("interactions/", "Interactions"),
       ("legal-status/", "Legal status"), ("blog/", "Blog")]
INDEX = []  # search index, filled in main()

def nice(iso):
    return datetime.date.fromisoformat(iso).strftime("%B %-d, %Y")

def crumbs(*items):
    li = "".join(f'<li><a href="{L(p)}">{html.escape(n)}</a></li>' for p, n in items[:-1])
    return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{li}<li aria-current="page">{html.escape(items[-1])}</li></ol></nav>'

def search_box(id_, big=False):
    ph = "Search a drug, brand, or topic" if big else "Search drugs"
    return (f'<div class="find{" big" if big else ""}"><label class="vh" for="{id_}">Search Dosepedia</label>{icon("search", 18 if not big else 22)}'
            f'<input id="{id_}" type="search" placeholder="{ph}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="{id_}-list" aria-autocomplete="list">'
            f'<ul id="{id_}-list" role="listbox" hidden></ul></div>')

def shell(path, title, desc, robots, ld, main, og="article", wide=False):
    url = f"{SITE}/{path}"
    idx = json.dumps([dict(x, u=L(x["u"])) for x in INDEX], separators=(",", ":")).replace("</", "<\\/")
    nav = "".join(f'<a href="{L(p)}"{" aria-current=page" if path.startswith(p) else ""}>{n}</a>' for p, n in NAV)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="robots" content="{robots}">
<meta name="theme-color" content="#0B5563">
<link rel="canonical" href="{url}">
<link rel="icon" href="{FAVICON}">
<link rel="alternate" type="application/rss+xml" title="Dosepedia blog" href="{SITE}/blog/feed.xml">
<meta property="og:type" content="{og}"><meta property="og:site_name" content="Dosepedia"><meta property="og:title" content="{html.escape(title.split(' | ')[0])}">
<meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}">
{FONT}
<style>{CSS}</style>
<script type="application/ld+json">{ld}</script>
</head>
<body>
<div class="prog" aria-hidden="true"><i></i></div>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="mark" href="{L()}" aria-label="Dosepedia home"><span class="logo" aria-hidden="true"></span><span>Dose<b>pedia</b></span></a>
{search_box("q")}
<button type="button" class="menu" aria-expanded="false" aria-controls="nav-main"><span class="vh">Menu</span><i></i></button>
<nav id="nav-main" aria-label="Main">{nav}</nav>
</div></header>
<main id="main"{' class="wrap"' if not wide else ''}>
{main}
</main>
<footer class="foot"><div class="wrap">
<div class="foot-grid">
<div><a class="mark" href="{L()}"><span class="logo" aria-hidden="true"></span><span>Dose<b>pedia</b></span></a>
<p>An independent, educational reference on prescription and controlled medicines, written from primary sources.</p></div>
<nav aria-label="Reference"><h2>Reference</h2>{nav}</nav>
<nav aria-label="About"><h2>About</h2><a href="{L('about/')}">About us</a><a href="{L('editorial-policy/')}">Editorial policy</a><a href="{L('medical-review-team/')}">Medical review team</a><a href="{L('contact/')}">Contact</a></nav>
<div class="help"><h2>Get help now</h2><p><a href="tel:911">911</a> Emergency</p><p><a href="tel:18002221222">1-800-222-1222</a> Poison Help</p><p><a href="tel:988">988</a> Crisis line, call or text</p></div>
</div>
<p class="fine">Dosepedia is an educational reference. It does not sell or supply medicines and is not a substitute for advice from a doctor or pharmacist. &copy; {datetime.date.today().year} Dosepedia.</p>
</div></footer>
{CONTACT}
<script type="application/json" id="search-index">{idx}</script>
<script>{JS}</script>
</body>
</html>"""

# ---------- substance pages ----------

def status_line(d):
    rev = d.get("reviewer")
    if rev:
        return (f'<p class="status">{icon("shield", 16)} Medically reviewed by <a href="{L(rev["url"])}">{html.escape(rev["name"])}, '
                f'{html.escape(rev["title"])}</a>. Updated {nice(d["updated"])}.</p>')
    return f'<p class="status draft">Draft, awaiting medical review. Updated {nice(d["updated"])}.</p>'

def sched_badge(d, cls="sched"):
    lbl = f"US {d['schedule']['label']} controlled substance"
    return f'<span class="{cls}" title="{lbl}" aria-label="{lbl}">{d["schedule"]["us"]}</span>'

def substance(d):
    path = f"drugs/{d['slug']}/"
    at(path)
    robots = "index,follow,max-snippet:-1" if d.get("reviewer") else "noindex,follow"
    toc = '<li><a href="#facts">At a glance</a></li>'
    toc += "".join(f'<li><a href="#{s["id"]}">{html.escape(JUMP.get(s["id"], s["q"]))}</a></li>' for s in d["sections"])
    toc += '<li><a href="#faq">Common questions</a></li><li><a href="#sources">Sources</a></li>'
    jump = "".join(f'<a class="chip" href="#{s["id"]}">{JUMP[s["id"]]}</a>' for s in d["sections"] if s["id"] in JUMP)
    body = "".join(f'<section id="{s["id"]}"><h2>{html.escape(s["q"])}</h2>{"".join(block(b) for b in s["blocks"])}</section>'
                   for s in d["sections"])
    facts = "".join(f'<div><dt>{html.escape(k)}</dt><dd>{html.escape(v)}</dd></div>' for k, v in d["facts"])
    faq = "".join(f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in d["faq"])
    src = "".join(f'<li id="src-{i}"><a href="{html.escape(u)}" rel="noopener">{html.escape(t)}</a>. <span>{html.escape(p)}.</span></li>'
                  for i, (t, p, u) in enumerate(d["sources"], 1))
    title = f"{d['name']} ({d['brands'][0]}): Uses, Risks, Withdrawal, How to Buy Legally | Dosepedia"
    main = f"""<div class="hero-sm"><div class="wrap">
{crumbs(("drugs/", "Drugs"), (f"class/{d['class']['slug']}/", d['class']['name']), d['name'])}
<div class="title">{sched_badge(d)}
<div><p class="eyebrow">{html.escape(d['class']['name'][:-1] if d['class']['name'].endswith('s') else d['class']['name'])} &middot; {d['schedule']['label']}</p>
<h1>{d['name']} <small>{", ".join(d['brands'])}</small></h1></div></div>
<p class="quick">{html.escape(d['quick'])}</p>
{status_line(d)}
<nav class="jump" aria-label="Jump to a topic">{jump}</nav>
</div></div>
<div class="wrap layout">
<nav class="toc" aria-label="On this page"><p>On this page</p><ol>{toc}</ol>
<a class="toc-help" href="tel:18002221222">{icon("phone", 16)}<span>Poison Help<b>1-800-222-1222</b></span></a></nav>
<article>
<section id="facts"><h2>{d['name']} at a glance</h2><dl class="facts">{facts}</dl></section>
{body}
<section id="faq"><h2>Common questions about {d['name'].lower()}</h2><div class="faq">{faq}</div></section>
<section id="sources"><h2>Sources</h2><ol class="src">{src}</ol></section>
</article>
</div>"""
    return shell(path, title, d["description"], robots, schema(d, SITE + "/" + path), main, wide=True)

def drug_card(d, h="h3"):
    q = d["quick"].split(". ")[0] + "."
    return (f'<a class="card drug" href="{dl(d)}">'
            f'<div class="card-top">{sched_badge(d, "sched sm")}<span class="tag">{html.escape(d["class"]["name"])}</span></div>'
            f'<{h}>{html.escape(d["name"])}</{h}><p class="brands">{html.escape(", ".join(d["brands"]))}</p>'
            f'<p>{html.escape(q)}</p><span class="more">Read profile {icon("arrow", 16)}</span></a>')

# ---------- hub pages ----------

def home(subs, posts):
    at("")
    topics = [("drugs/", "az", "Drugs A to Z", "Profiles of prescription and controlled medicines, written from FDA labels."),
              ("withdrawal/", "wd", "Withdrawal", "What to expect when stopping, how long it lasts, and why tapering matters."),
              ("interactions/", "mix", "Interactions", "Check what a medicine should never be mixed with before it happens."),
              ("legal-status/", "law", "Legal status", "Drug schedules explained, and the legal ways to get a prescription filled.")]
    tcards = "".join(f'<a class="card topic" href="{L(p)}"><span class="ico">{icon(i, 26)}</span><h3>{t}</h3><p>{x}</p>'
                     f'<span class="more">Explore {icon("arrow", 16)}</span></a>' for p, i, t, x in topics)
    dcards = "".join(drug_card(d) for d in subs)
    pcards = "".join(f'<li><a href="{bl(p)}"><time datetime="{p["date"]}">{nice(p["date"])}</time>'
                     f'<strong>{html.escape(p["title"])}</strong><span>{html.escape(p["description"])}</span></a></li>' for p in posts[:3])
    main = f"""<section class="hero"><div class="wrap">
<div class="hero-copy">
<p class="eyebrow">Independent drug reference</p>
<h1>Clear, sourced answers about <em>prescription drugs</em>.</h1>
<p class="lede">Uses, risks, interactions, withdrawal, and the legal way to get a prescription filled. Written in plain language from FDA labels, DEA rules, and clinical guidelines.</p>
{search_box("q2", big=True)}
<p class="hint">Try <a href="{L('drugs/alprazolam/')}">alprazolam</a>, <a href="{L('drugs/alprazolam/')}">Xanax</a>, or <a href="{L('class/benzodiazepines/')}">benzodiazepines</a></p>
</div>
<div class="hero-art" aria-hidden="true">
<svg viewBox="0 0 400 360" fill="none">
<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--brand)"/><stop offset="1" stop-color="var(--brand-2)"/></linearGradient></defs>
<g stroke="url(#g1)" stroke-width="3" stroke-linejoin="round">
<path d="M150 70l52 30v60l-52 30-52-30v-60z"/><path d="M202 100l52-30 52 30v60l-52 30-52-30" opacity=".85"/>
<path d="M254 190v60l-52 30" opacity=".6"/><path d="M98 160l-46 26M150 70V20" opacity=".7"/>
<path d="M163 84l29 17M163 176l29-17M110 101v52" opacity=".4"/>
</g>
<g fill="var(--surface)" stroke="url(#g1)" stroke-width="3">
<circle cx="150" cy="70" r="9"/><circle cx="202" cy="100" r="7"/><circle cx="254" cy="70" r="7"/><circle cx="306" cy="160" r="9"/>
<circle cx="254" cy="250" r="7"/><circle cx="202" cy="280" r="10"/><circle cx="52" cy="186" r="8"/><circle cx="150" cy="20" r="6"/>
</g>
<rect x="250" y="250" width="120" height="48" rx="24" transform="rotate(-28 310 274)" fill="var(--brand)" opacity=".9"/>
<path d="M310 250v48" transform="rotate(-28 310 274)" stroke="var(--paper)" stroke-width="3"/>
<circle cx="70" cy="290" r="26" fill="var(--brand-2)" opacity=".25"/><circle cx="340" cy="60" r="14" fill="var(--accent)" opacity=".7"/>
</svg></div>
</div></section>
<section class="help-strip" aria-label="Emergency numbers"><div class="wrap">
<span class="lbl">{icon("phone", 18)} In the US, help is free and 24/7</span>
<a href="tel:911"><b>911</b> Emergency</a><a href="tel:18002221222"><b>1-800-222-1222</b> Poison Help</a><a href="tel:988"><b>988</b> Crisis line</a><a href="tel:18006624357"><b>1-800-662-4357</b> SAMHSA helpline</a>
</div></section>
<section class="band"><div class="wrap">
<div class="band-head"><h2>Start with a topic</h2><p>Every page answers the questions people actually ask, with sources you can check.</p></div>
<div class="grid g4">{tcards}</div>
</div></section>
<section class="band alt"><div class="wrap">
<div class="band-head"><h2>Drug profiles</h2><a class="link" href="{L('drugs/')}">See all drugs {icon("arrow", 16)}</a></div>
<div class="grid g3">{dcards}<div class="card soon"><h3>More profiles coming</h3><p>We publish each profile only after checking it against the FDA label and current DEA rules.</p><button type="button" class="link" data-contact>Suggest a medicine {icon("arrow", 16)}</button></div></div>
</div></section>
<section class="band"><div class="wrap trust">
<div><p class="eyebrow">How we work</p><h2>Built to be trusted, not to sell</h2><p>Dosepedia has no pharmacy, no affiliate links, and nothing to sell. Our job is to explain what the evidence and the law say, clearly enough to act on safely.</p><a class="btn" href="{L('editorial-policy/')}">Read our editorial policy</a></div>
<ul class="points">
<li>{icon("book")}<div><strong>Primary sources only</strong><span>FDA prescribing information, DEA and federal regulations, and guidelines from clinical societies. Every claim is cited.</span></div></li>
<li>{icon("shield")}<div><strong>Medical review</strong><span>Profiles are marked as drafts and kept out of search engines until a licensed clinician has reviewed them.</span></div></li>
<li>{icon("nosell")}<div><strong>We never sell medicine</strong><span>We explain the legal routes to a prescription and how to spot illegal online sellers.</span></div></li>
</ul>
</div></section>
<section class="band alt"><div class="wrap">
<div class="band-head"><h2>Latest updates</h2><a class="link" href="{L('blog/')}">All posts {icon("arrow", 16)}</a></div>
<ul class="news">{pcards}</ul>
</div></section>
<section class="band"><div class="wrap"><div class="alert-band">
<span class="ico">{icon("alert", 28)}</span>
<div><h2>One fake pill can kill</h2><p>Pills sold outside a pharmacy are often counterfeit and can contain fentanyl. They cannot be told apart by appearance. Only buy from a licensed pharmacy with a valid prescription.</p></div>
<a class="btn light" href="https://www.dea.gov/onepill" rel="noopener">DEA guidance</a>
</div></div></section>"""
    ld = json.dumps({"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "Dosepedia", "inLanguage": "en"},
        {"@type": "Organization", "@id": SITE + "/#org", "name": "Dosepedia", "url": SITE + "/"}]}, separators=(",", ":"))
    return shell("", "Dosepedia: Clear, Sourced Facts About Prescription Drugs",
                 "Plain-language facts on prescription and controlled medicines: uses, risks, interactions, withdrawal, and how to get them legally in the US.",
                 "index,follow", ld, main, og="website", wide=True)

def page_head(title, lede, *crumb, eyebrow=""):
    eb = f'<p class="eyebrow">{eyebrow}</p>' if eyebrow else ""
    return (f'<div class="hero-sm"><div class="wrap">{crumbs(*crumb) if crumb else ""}{eb}<h1>{title}</h1>'
            f'<p class="quick">{lede}</p></div></div>')

def drugs_index(subs, classes):
    path = "drugs/"; at(path)
    letters = sorted({d["name"][0].upper() for d in subs})
    az = "".join(f'<a href="#l-{c}">{c}</a>' if c in letters else f'<span>{c}</span>' for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    groups = "".join(f'<section id="l-{c}" class="letter"><h2>{c}</h2><div class="grid g3">'
                     + "".join(drug_card(d) for d in subs if d["name"][0].upper() == c) + "</div></section>" for c in letters)
    cls = "".join(f'<a class="chip" href="{cl(c)}">{html.escape(c["name"])}</a>' for c in classes)
    main = page_head("Drugs A to Z", "Plain-language profiles of prescription and controlled medicines. Each covers uses, risks, interactions, overdose, withdrawal, and legal access.",
                     ("", "Home"), "Drugs") + f"""<div class="wrap pad">
<nav class="az" aria-label="Letters">{az}</nav>
<div class="by-class"><span>Browse by class:</span>{cls}</div>
{groups}
</div>"""
    return shell(path, "Drugs A to Z | Dosepedia", "Browse plain-language profiles of prescription and controlled medicines, A to Z.",
                 "index,follow", simple_ld("CollectionPage", path, "Drugs A to Z"), main, og="website", wide=True)

def class_page(c, subs):
    path = f"class/{c['slug']}/"; at(path)
    members = [d for d in subs if d["class"]["slug"] == c["slug"]]
    rows = "".join(f'<tr><td><a href="{dl(d)}">{d["name"]}</a></td><td>{html.escape(", ".join(d["brands"]))}</td>'
                   f'<td>{d["schedule"]["label"]}</td></tr>' for d in members)
    main = page_head(c["name"], html.escape(c["intro"]), ("", "Home"), ("drugs/", "Drugs"), c["name"], eyebrow="Drug class") + f"""<div class="wrap pad"><div class="prose">
{"".join(block(b) for b in c.get("blocks", []))}
<h2>{c['name']} on Dosepedia</h2>
<div class="tbl"><table><thead><tr><th scope="col">Medicine</th><th scope="col">Brand names</th><th scope="col">US status</th></tr></thead><tbody>{rows}</tbody></table></div>
</div><div class="grid g3 mt">{"".join(drug_card(d) for d in members)}</div></div>"""
    return shell(path, f"{c['name']}: How They Work, Risks, and Legal Status | Dosepedia", c["description"],
                 "index,follow", simple_ld("CollectionPage", path, c["name"]), main, wide=True)

def withdrawal_hub(subs):
    path = "withdrawal/"; at(path)
    cards = ""
    for d in subs:
        tl = find_block(d, "withdrawal", "timeline")
        if not tl: continue
        cards += (f'<section class="panel"><div class="panel-head">{sched_badge(d, "sched sm")}<h2>{d["name"]} withdrawal</h2>'
                  f'<a class="link" href="{dl(d)}#withdrawal">Full guide {icon("arrow", 16)}</a></div>{block({"timeline": tl})}</section>')
    main = page_head("Withdrawal", "Stopping some medicines after regular use can cause withdrawal. Knowing the timeline, and why a slow taper matters, makes it safer.",
                     ("", "Home"), "Withdrawal") + f"""<div class="wrap pad">
<div class="grid g3 facts-row">
<div class="card flat"><h3>Don't stop suddenly</h3><p>Abruptly stopping benzodiazepines, and some other medicines, after regular use can cause seizures. Talk to the prescriber first.</p></div>
<div class="card flat"><h3>Taper with a prescriber</h3><p>A gradual, individual reduction plan lowers the risk of severe symptoms. Slower is often better.</p></div>
<div class="card flat"><h3>Free, confidential help</h3><p>SAMHSA's National Helpline is free and open 24/7: <a href="tel:18006624357">1-800-662-4357</a>. In a crisis, call or text <a href="tel:988">988</a>.</p></div>
</div>
{cards}
</div>"""
    return shell(path, "Drug Withdrawal: Timelines, Symptoms, and Safe Tapering | Dosepedia",
                 "Withdrawal timelines, symptoms, and why gradual tapering under a prescriber matters, drug by drug.",
                 "index,follow", simple_ld("CollectionPage", path, "Withdrawal"), main, wide=True)

def interactions_hub(subs):
    path = "interactions/"; at(path)
    have = [(d, find_block(d, "interactions", "interactions")) for d in subs]
    have = [(d, t) for d, t in have if t]
    tabs = "".join(f'<button type="button" class="chip" role="tab" aria-selected="{str(i == 0).lower()}" aria-controls="ix-{d["slug"]}" id="tab-{d["slug"]}">{d["name"]}</button>'
                   for i, (d, _) in enumerate(have))
    panels = "".join(f'<section class="panel" role="tabpanel" id="ix-{d["slug"]}" aria-labelledby="tab-{d["slug"]}"{"" if i == 0 else " hidden"}>'
                     f'<div class="panel-head">{sched_badge(d, "sched sm")}<h2>What not to mix with {d["name"].lower()}</h2>'
                     f'<a class="link" href="{dl(d)}#interactions">Full profile {icon("arrow", 16)}</a></div>{checker(t)}</section>'
                     for i, (d, t) in enumerate(have))
    main = page_head("Interaction checker", "Pick a medicine, then what it might be combined with, to see what can happen and what the FDA label advises.",
                     ("", "Home"), "Interactions") + f"""<div class="wrap pad">
<div class="tabs"><span>Medicine:</span><div role="tablist" aria-label="Choose a medicine">{tabs}</div></div>
{panels}
<p class="warn" role="note">{icon("alert", 20)}<span><strong>Not a complete list.</strong> Only a pharmacist or prescriber can check your full medication list, including supplements and over-the-counter products.</span></p>
</div>"""
    return shell(path, "Drug Interaction Checker: What Not to Mix | Dosepedia",
                 "See which drugs, alcohol, and medicines interact with common controlled medicines, based on FDA labels.",
                 "index,follow", simple_ld("WebPage", path, "Interaction checker"), main, wide=True)

SCHEDULES = [
    ("I", "No currently accepted medical use in the US and a high potential for abuse.", "Heroin, LSD, MDMA"),
    ("II", "High potential for abuse, which may lead to severe dependence.", "Oxycodone, fentanyl, amphetamine, methylphenidate"),
    ("III", "Moderate to low potential for physical and psychological dependence.", "Buprenorphine, ketamine, anabolic steroids"),
    ("IV", "Low potential for abuse and low risk of dependence relative to Schedule III.", "Alprazolam, diazepam, tramadol, zolpidem"),
    ("V", "Lower potential for abuse than Schedule IV.", "Cough preparations with small amounts of codeine, pregabalin"),
]

def legal_hub(subs):
    path = "legal-status/"; at(path)
    sch = "".join(f'<li><span class="sched sm">{s}</span><div><strong>Schedule {s}</strong><span>{x}</span><em>Examples: {e}</em></div></li>' for s, x, e in SCHEDULES)
    rows = "".join(f'<tr><td><a href="{dl(d)}">{d["name"]}</a></td><td>{d["schedule"]["label"]}</td>'
                   f'<td><a href="{dl(d)}#legal-access">How to get it legally</a></td></tr>' for d in subs)
    main = page_head("Legal status", "In the US, the Controlled Substances Act sorts drugs into five schedules. The schedule decides who can prescribe a medicine, how it can be refilled, and what happens without a prescription.",
                     ("", "Home"), "Legal status") + f"""<div class="wrap pad two">
<div>
<h2>The five US drug schedules</h2>
<ol class="schedules">{sch}</ol>
<p class="note">Source: <a href="https://www.deadiversion.usdoj.gov/schedules/" rel="noopener">DEA Diversion Control Division, Controlled Substance Schedules</a>. Examples are illustrative, not a full list.</p>
</div>
<div>
<h2>Medicines on Dosepedia</h2>
<div class="tbl"><table><thead><tr><th scope="col">Medicine</th><th scope="col">US status</th><th scope="col">Access</th></tr></thead><tbody>{rows}</tbody></table></div>
<div class="card flat"><h3>The legal route is always the same</h3>
<ol class="steps"><li><strong>See a licensed clinician</strong><span>In person or, through December 31, 2026, by telemedicine under federal flexibilities.</span></li>
<li><strong>Get a prescription</strong><span>Controlled medicines need a clinician registered with the DEA.</span></li>
<li><strong>Fill it at a licensed pharmacy</strong><span>In person or by mail from a pharmacy licensed in your state.</span></li></ol>
<p>Read more in <a href="{L('blog/telehealth-controlled-medicines-2026/')}">our guide to telehealth prescribing in 2026</a>.</p></div>
</div>
</div>"""
    return shell(path, "US Drug Schedules and Legal Status Explained | Dosepedia",
                 "The five US controlled-substance schedules explained, with the legal status of each medicine on Dosepedia.",
                 "index,follow", simple_ld("WebPage", path, "Legal status"), main, wide=True)

# ---------- about pages ----------

ABOUT = {
    "about/": ("About Dosepedia", "An independent, plain-language reference on prescription and controlled medicines.", """
<p>Dosepedia exists because people look up medicines at important moments: before starting a new prescription, when worried about a combination, or when trying to stop. The answers they find are often either too technical to use or not trustworthy. We write pages that are both accurate and readable.</p>
<h2>What we cover</h2>
<ul><li>What each medicine is used for and how it is usually prescribed.</li><li>Risks, side effects, interactions, and the signs of an overdose.</li><li>Withdrawal, and why tapering should happen with a prescriber.</li><li>The legal routes to a prescription, and how to recognise illegal sellers.</li></ul>
<h2>What we don't do</h2>
<p>We do not sell, supply, or ship medicines, and we have no affiliate relationships with pharmacies or telehealth providers. We cannot give personal medical advice. For decisions about your treatment, talk to a doctor or pharmacist.</p>"""),
    "editorial-policy/": ("Editorial policy", "How we research, write, review, and correct every page.", """
<h2>Sources</h2>
<p>We rely on primary sources: FDA-approved prescribing information, DEA and federal regulations, and guidelines from clinical societies and public health agencies. Every factual claim on a drug profile links to its source.</p>
<h2>Plain language</h2>
<p>We write for adults without medical training. We define terms, avoid jargon, and put the most important safety information first.</p>
<h2>Medical review</h2>
<p>Profiles are published as drafts and marked <em>noindex</em>, which keeps them out of search results, until a licensed clinician has reviewed them. Reviewed pages show the reviewer's name and the review date.</p>
<h2>Independence</h2>
<p>We do not accept payment for coverage, sell medicines, or use affiliate links. Partnerships never influence what we write.</p>
<h2>Corrections</h2>
<p>If you find an error, please <a href="@contact/">contact us</a>. We review every report and update the page and its date when we make a correction.</p>"""),
    "medical-review-team/": ("Medical review team", "The licensed clinicians who check our drug profiles.", """
<p>Every Dosepedia drug profile is reviewed by a licensed clinician, such as a physician, pharmacist, or nurse practitioner, before it is marked as reviewed and opened to search engines.</p>
<p class="status draft">Our review team is being assembled. Until then, every profile is clearly labelled as a draft.</p>
<h2>What reviewers check</h2>
<ul><li>That dosing figures, warnings, and interactions match the current FDA label.</li><li>That legal and regulatory statements reflect current DEA and federal rules.</li><li>That safety information is complete, prominent, and easy to understand.</li></ul>
<h2>Join the team</h2>
<p>Licensed clinicians interested in reviewing can <a href="@contact/">get in touch</a>.</p>"""),
}

def about_page(path, title, lede, body, ld_kind="AboutPage"):
    at(path)
    body = re.sub(r'href="@([^"]*)"', lambda m: f'href="{L(m[1])}"', body)
    main = page_head(title, lede, ("", "Home"), title) + f'<div class="wrap pad"><div class="prose">{body}</div></div>'
    return shell(path, f"{title} | Dosepedia", lede, "index,follow", simple_ld(ld_kind, path, title), main, og="website", wide=True)

def contact_page():
    path = "contact/"; at(path)
    form = CONTACT.split('<form', 1)[1].split('</form>', 1)[0]
    form = re.sub(r'<div class="dlg-head">.*?</div>', "", form, flags=re.S)
    main = page_head("Contact", "Send a correction, a question about the site, or feedback. We read every message.", ("", "Home"), "Contact") + \
        f'<div class="wrap pad"><div class="contact-card"><form class="form"{form}</form></div></div>'
    return shell(path, "Contact | Dosepedia", "Contact Dosepedia with corrections, questions, or feedback.", "index,follow",
                 simple_ld("ContactPage", path, "Contact"), main, og="website", wide=True)

def not_found():
    global PREFIX
    PREFIX = "/"  # served at any depth, so use root-absolute links
    main = f"""<div class="nf"><p class="eyebrow">Error 404</p><h1>We couldn't find that page.</h1>
<p class="quick">It may have moved, or it may not be written yet. Try searching, or start from the drug list.</p>
{search_box("q3", big=True)}<p><a class="btn" href="{L()}">Go to the home page</a></p></div>"""
    return shell("404.html", "Page not found | Dosepedia", "Page not found.", "noindex", "{}", main)

# ---------- blog ----------

def read_post(f):
    raw = f.read_text()
    _, fm, body = raw.split("---", 2)
    meta = dict(l.split(":", 1) for l in fm.strip().splitlines())
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    meta["slug"] = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", f.stem)
    meta["md"] = body.strip()
    meta["live"] = meta.get("status") == "published"
    return meta

def post_page(p):
    path = f"blog/{p['slug']}/"; at(path)
    url = SITE + "/" + path
    body = re.sub(r'href="/([^"]*)"', lambda m: f'href="{L(m[1])}"', markdown.markdown(p["md"], extensions=["tables"]))
    ld = json.dumps({"@context": "https://schema.org", "@graph": [
        {"@type": "BlogPosting", "@id": url, "url": url, "headline": p["title"], "description": p["description"],
         "datePublished": p["date"], "dateModified": p.get("updated", p["date"]), "inLanguage": "en",
         "author": {"@type": "Organization", "name": p["author"], "url": SITE},
         "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Blog", "item": SITE + "/blog/"},
            {"@type": "ListItem", "position": 2, "name": p["title"], "item": url}]}]}, separators=(",", ":"))
    status = "" if p["live"] else '<p class="status draft">Draft, awaiting review.</p>'
    mins = max(1, round(len(p["md"].split()) / 220))
    main = f"""<div class="hero-sm"><div class="wrap narrow">{crumbs(("", "Home"), ("blog/", "Blog"), p['title'])}
<h1>{html.escape(p['title'])}</h1>
<p class="by">By {html.escape(p['author'])} &middot; <time datetime="{p['date']}">{nice(p['date'])}</time> &middot; {mins} min read</p>{status}</div></div>
<div class="wrap narrow"><article class="post prose">{body}</article></div>"""
    return shell(path, f"{p['title']} | Dosepedia", p["description"], "index,follow,max-snippet:-1" if p["live"] else "noindex,follow", ld, main, wide=True)

def blog_index(posts):
    path = "blog/"; at(path)
    items = "".join(f'<li><a href="{bl(p)}"><time datetime="{p["date"]}">{nice(p["date"])}</time>'
                    f'<strong>{html.escape(p["title"])}</strong><span>{html.escape(p["description"])}</span></a></li>' for p in posts)
    ld = json.dumps({"@context": "https://schema.org", "@type": "Blog", "@id": SITE + "/blog/", "url": SITE + "/blog/", "name": "Dosepedia blog",
                     "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE}}, separators=(",", ":"))
    main = page_head("Blog", "Rule changes, safety alerts, and plain answers to questions about controlled medicines in the United States.", ("", "Home"), "Blog") + \
        f'<div class="wrap pad"><ul class="news">{items or "<li>No posts yet.</li>"}</ul></div>'
    return shell(path, "Blog: Drug Law Changes and Safety Updates | Dosepedia", "News and explainers on US controlled-substance rules, safety alerts, and how to get prescribed medicines legally.", "index,follow", ld, main, og="website", wide=True)

# ---------- build ----------

def write(path, text):
    out = DIST / (path + "index.html" if path == "" or path.endswith("/") else path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text)
    print("built", out.relative_to(DIST))

def main():
    subs = sorted((json.loads(f.read_text()) for f in (ROOT / "data/substances").glob("*.json")), key=lambda d: d["name"])
    classes = sorted((json.loads(f.read_text()) for f in (ROOT / "data/classes").glob("*.json")), key=lambda c: c["name"])
    known = {c["slug"] for c in classes}
    for d in subs:  # every class a drug links to gets a page, even without a data file
        if d["class"]["slug"] not in known:
            classes.append({**d["class"], "intro": f"Medicines in the {d['class']['name'].lower()} class.", "description": d["class"]["name"]})
            known.add(d["class"]["slug"])
    posts = sorted((read_post(f) for f in (ROOT / "data/blog").glob("*.md")), key=lambda p: p["date"], reverse=True)
    INDEX.extend({"t": d["name"], "k": " ".join(d["brands"] + [d["class"]["name"]]), "s": ", ".join(d["brands"]), "u": f"drugs/{d['slug']}/"} for d in subs)
    INDEX.extend({"t": c["name"], "k": "class", "s": "Drug class", "u": f"class/{c['slug']}/"} for c in classes)
    INDEX.extend({"t": n, "k": "topic", "s": "Topic", "u": p} for p, n in NAV[1:4])
    INDEX.extend({"t": p["title"], "k": "blog", "s": "Blog", "u": f"blog/{p['slug']}/"} for p in posts)
    today = datetime.date.today().isoformat()
    sm = [(SITE + "/", today)]
    write("", home(subs, posts))
    pages = [("drugs/", drugs_index(subs, classes)), ("withdrawal/", withdrawal_hub(subs)),
             ("interactions/", interactions_hub(subs)), ("legal-status/", legal_hub(subs)), ("contact/", contact_page())]
    pages += [(f"class/{c['slug']}/", class_page(c, subs)) for c in classes]
    pages += [(p, about_page(p, *v)) for p, v in ABOUT.items()]
    for p, text in pages:
        write(p, text)
        sm.append((f"{SITE}/{p}", today))
    for d in subs:
        write(f"drugs/{d['slug']}/", substance(d))
        if d.get("reviewer"): sm.append((f"{SITE}/drugs/{d['slug']}/", d["updated"]))
    for p in posts:
        write(f"blog/{p['slug']}/", post_page(p))
        if p["live"]: sm.append((f"{SITE}/blog/{p['slug']}/", p.get("updated", p["date"])))
    write("blog/", blog_index(posts))
    write("404.html", not_found())
    live = [p for p in posts if p["live"]]
    sm.append((SITE + "/blog/", live[0]["date"] if live else today))
    rss = "".join(f"<item><title>{html.escape(p['title'])}</title><link>{SITE}/blog/{p['slug']}/</link><guid>{SITE}/blog/{p['slug']}/</guid>"
                  f"<pubDate>{datetime.datetime.fromisoformat(p['date']).strftime('%a, %d %b %Y 00:00:00 +0000')}</pubDate><description>{html.escape(p['description'])}</description></item>" for p in live)
    write("blog/feed.xml", f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Dosepedia blog</title><link>{SITE}/blog/</link><description>Drug law changes and safety updates</description>{rss}</channel></rss>')
    urls = "".join(f"<url><loc>{u}</loc><lastmod>{m}</lastmod></url>" for u, m in sm)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")

if __name__ == "__main__":
    main()
