#!/usr/bin/env python3
"""Dosepedia static site builder. Reads data/, writes dist/.

Internal links are written relative to each page, so dist/ works on any host
or sub-path. Set DOSEPEDIA_LINKS=files to append index.html to directory links
(useful for opening dist/ straight from disk).
"""
import json, os, re, html, pathlib, datetime, shutil, markdown

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
def sl(k): return L("schedules/%s/" % SCHED_SLUG[k])

def at(path):
    global PREFIX
    PREFIX = "../" * path.count("/") or "./"

E = html.escape

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
    "cmp": '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M6.5 8h0M17.5 8h0"/>',
    "heart": '<path d="M3 12h4l2-4 3 8 2-4h7"/>',
    "gloss": '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    "pill": '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="m9.7 8.7 4.6 6.6"/>',
}
def icon(k, s=22):
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[k]}</svg>')

def inline(t):
    t = E(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\[([^\]]+)\]\((/[^)]*)\)", lambda m: f'<a href="{L(m[2])}">{m[1]}</a>', t)
    return re.sub(r"\[\[(\d+)\]\]", r'<sup><a href="#src-\1" aria-label="Source \1">[\1]</a></sup>', t)

def plain(t):
    return re.sub(r"\[\[\d+\]\]|\*\*", "", t)

def table(tb):
    head = "".join(f"<th scope=\"col\">{inline(h)}</th>" for h in tb["head"])
    rows = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in tb["rows"])
    return f'<div class="tbl"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>'

def checker(t):
    chips = "".join(f'<button type="button" class="chip" data-i="{i}" aria-pressed="false">{inline(r[0])}</button>' for i, r in enumerate(t["rows"]))
    data = E(json.dumps([[plain(c) for c in r] for r in t["rows"]]))
    return (f'<div class="chk" data-rows="{data}" data-label="{E(t["head"][2])}" hidden><p class="chk-q">Choose what it would be combined with:</p>'
            f'<div class="chips">{chips}</div><p class="chk-out" aria-live="polite"></p></div>' + table(t))

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

# ---------- substance helpers ----------

SCHED_ORDER = ["I", "II", "III", "IV", "V", ""]
SCHED_SLUG = {"I": "schedule-i", "II": "schedule-ii", "III": "schedule-iii", "IV": "schedule-iv", "V": "schedule-v", "": "not-federally-controlled"}
SCHED_NAME = {"I": "Schedule I", "II": "Schedule II", "III": "Schedule III", "IV": "Schedule IV", "V": "Schedule V", "": "Not federally controlled"}
SCHED_INFO = {
    "I": ("No currently accepted medical use in the US and a high potential for abuse. These drugs cannot be prescribed; they can be used only in DEA-registered research.",
          "Cannot be prescribed. Research only, under DEA registration."),
    "II": ("Accepted medical use but a high potential for abuse that may lead to severe psychological or physical dependence.",
           "Written or electronic prescription; no refills. Prescribers can issue up to a 90-day supply as several dated prescriptions."),
    "III": ("Accepted medical use, with moderate to low potential for physical and psychological dependence.",
            "Prescription required; up to five refills within six months."),
    "IV": ("Accepted medical use, with a low potential for abuse relative to Schedule III.",
           "Prescription required; up to five refills within six months."),
    "V": ("Accepted medical use, with a lower potential for abuse than Schedule IV. Includes some low-dose codeine cough preparations.",
          "Prescription usually required; refills as authorized. Some states allow limited pharmacist sales of certain products."),
    "": ("Not listed in any federal schedule. Some are prescription medicines, some are veterinary drugs, and some are sold without regulation. States may control them, and federal scheduling may be pending.",
         "Depends on the substance and the state."),
}
KIND_LABEL = {"rx": "Prescription medicine", "nomed": "No US medical route", "unregulated": "Unapproved or unregulated"}

def sched_badge(d, cls="sched"):
    us = d["schedule"]["us"]
    if not us:
        return f'<span class="{cls} none" title="Not federally controlled" aria-label="Not federally controlled">NC</span>'
    lbl = f"US {d['schedule']['label']} controlled substance"
    return f'<span class="{cls}" title="{lbl}" aria-label="{lbl}">{us}</span>'

def also(d):
    return d["brands"] if d.get("brands") else d.get("aka", [])

def schema(d, url):
    page = {"@type": "MedicalWebPage", "@id": url, "url": url, "name": d["name"],
            "description": d["description"], "inLanguage": "en", "dateModified": d["updated"],
            "about": {"@id": url + "#drug"}, "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE},
            "citation": [s[2] for s in d["sources"]]}
    if d.get("reviewer"):
        r = d["reviewer"]
        page["lastReviewed"] = r["date"]
        page["reviewedBy"] = {"@type": "Person", "name": r["name"], "jobTitle": r["title"], "url": SITE + r["url"]}
    drug = {"@type": "Drug", "@id": url + "#drug", "name": d["name"], "alternateName": also(d) + d.get("aka", []) if d.get("brands") else d.get("aka", []),
            "drugClass": d.get("subclass") or d["class"]["name"],
            "legalStatus": {"@type": "DrugLegalStatus", "name": d["schedule"]["label"], "applicableLocation": {"@type": "Country", "name": "US"}}}
    if d.get("kind") == "rx":
        drug["prescriptionStatus"] = "https://schema.org/PrescriptionOnly"
        drug["nonProprietaryName"] = d["name"]
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in d["faq"]]}
    crumbs_ld = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Drugs", "item": SITE + "/drugs/"},
        {"@type": "ListItem", "position": 2, "name": d["class"]["name"], "item": f"{SITE}/class/{d['class']['slug']}/"},
        {"@type": "ListItem", "position": 3, "name": d["name"], "item": url}]}
    return json.dumps({"@context": "https://schema.org", "@graph": [page, drug, faq, crumbs_ld]}, separators=(",", ":"))

def simple_ld(kind, path, name):
    url = f"{SITE}/{path}"
    return json.dumps({"@context": "https://schema.org", "@type": kind, "@id": url, "url": url, "name": name,
                       "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE}}, separators=(",", ":"))

JUMP = {"uses": "Uses", "effects": "Effects", "dosage": "Dosing", "risks": "Risks", "interactions": "Mixing", "overdose": "Overdose",
        "withdrawal": "Withdrawal", "legal-access": "Getting it legally", "buy-online": "Ordering online", "legal-us": "US law",
        "treatment": "Getting help", "legal-status": "Other countries"}
NAV = [("drugs/", "Drugs A to Z"), ("interactions/", "Interactions"), ("compare/", "Compare"), ("withdrawal/", "Withdrawal"), ("legal-status/", "Legal status")]
INDEX = []  # search index, filled in main()

def nice(iso):
    return datetime.date.fromisoformat(iso).strftime("%B %-d, %Y")

def crumbs(*items):
    li = "".join(f'<li><a href="{L(p)}">{E(n)}</a></li>' for p, n in items[:-1])
    return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{li}<li aria-current="page">{E(items[-1])}</li></ol></nav>'

def search_box(id_, big=False):
    ph = "Search 50 drugs, brands, or street names" if big else "Search drugs"
    return (f'<div class="find{" big" if big else ""}"><label class="vh" for="{id_}">Search Dosepedia</label>{icon("search", 22 if big else 18)}'
            f'<input id="{id_}" type="search" placeholder="{ph}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="{id_}-list" aria-autocomplete="list">'
            f'<ul id="{id_}-list" role="listbox" hidden></ul></div>')

def shell(path, title, desc, robots, ld, main, og="article", data=None):
    url = f"{SITE}/{path}"
    idx = json.dumps([dict(x, u=L(x["u"])) for x in INDEX], separators=(",", ":")).replace("</", "<\\/")
    nav = "".join(f'<a href="{L(p)}"{" aria-current=page" if path.startswith(p) else ""}>{n}</a>' for p, n in NAV)
    nav += f'<a class="sos" href="{L("overdose/")}"{" aria-current=page" if path.startswith("overdose/") else ""}>{icon("heart", 16)}Overdose help</a>'
    pdata = json.dumps(data, separators=(",", ":")).replace("</", "<\\/") if data is not None else ""
    extra = f'<script type="application/json" id="page-data">{pdata}</script>' if data is not None else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta name="robots" content="{robots}">
<meta name="theme-color" content="#0B5563">
<link rel="canonical" href="{url}">
<link rel="icon" href="{FAVICON}">
<link rel="alternate" type="application/rss+xml" title="Dosepedia blog" href="{SITE}/blog/feed.xml">
<meta property="og:type" content="{og}"><meta property="og:site_name" content="Dosepedia"><meta property="og:title" content="{E(title.split(' | ')[0])}">
<meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{url}">
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
<main id="main">
{main}
</main>
<footer class="foot"><div class="wrap">
<div class="foot-grid">
<div><a class="mark" href="{L()}"><span class="logo" aria-hidden="true"></span><span>Dose<b>pedia</b></span></a>
<p>An independent, educational reference on prescription and controlled substances, written from primary sources.</p></div>
<nav aria-label="Reference"><h2>Reference</h2>{"".join(f'<a href="{L(p)}">{n}</a>' for p, n in NAV)}<a href="{L('overdose/')}">Overdose help</a><a href="{L('glossary/')}">Glossary</a><a href="{L('blog/')}">Blog</a></nav>
<nav aria-label="Clusters"><h2>Drug clusters</h2>{"".join(f'<a href="{L(f"class/{s}/")}">{E(n)}</a>' for s, n in CLUSTER_NAV)}</nav>
<nav aria-label="About"><h2>About</h2><a href="{L('about/')}">About us</a><a href="{L('editorial-policy/')}">Editorial policy</a><a href="{L('medical-review-team/')}">Medical review team</a><a href="{L('contact/')}">Contact</a></nav>
<div class="help"><h2>Get help now</h2><p><a href="tel:911">911</a> Emergency</p><p><a href="tel:18002221222">1-800-222-1222</a> Poison Help</p><p><a href="tel:988">988</a> Crisis line</p><p><a href="tel:18006624357">1-800-662-4357</a> SAMHSA</p></div>
</div>
<p class="fine">Dosepedia is an educational reference. It does not sell or supply medicines and is not a substitute for advice from a doctor or pharmacist. Information current as of October 2026. &copy; {datetime.date.today().year} Dosepedia.</p>
</div></footer>
{CONTACT}
<script type="application/json" id="search-index">{idx}</script>
{extra}
<script>{JS}</script>
</body>
</html>"""

CLUSTER_NAV = []  # (slug, name), filled in main()

# ---------- substance pages ----------

def status_line(d):
    rev = d.get("reviewer")
    if rev:
        return (f'<p class="status">{icon("shield", 16)} Medically reviewed by <a href="{L(rev["url"])}">{E(rev["name"])}, '
                f'{E(rev["title"])}</a>. Updated {nice(d["updated"])}.</p>')
    return f'<p class="status draft">Draft, awaiting medical review. Updated {nice(d["updated"])}.</p>'

def page_title(d):
    if d["kind"] == "rx":
        b = f" ({d['brands'][0]})" if d.get("brands") and d["brands"][0].lower() != d["name"].lower() and "discontinued" not in d["brands"][0] else ""
        return f"{d['name']}{b}: Uses, Risks, Withdrawal, How to Get It Legally | Dosepedia"
    return f"{d['name']}: Effects, Risks, Overdose, and Legal Status | Dosepedia"

def substance(d, subs):
    path = f"drugs/{d['slug']}/"
    at(path)
    robots = "index,follow,max-snippet:-1" if d.get("reviewer") else "noindex,follow"
    toc = '<li><a href="#facts">At a glance</a></li>'
    toc += "".join(f'<li><a href="#{s["id"]}">{E(JUMP.get(s["id"], s["q"]))}</a></li>' for s in d["sections"])
    toc += '<li><a href="#faq">Common questions</a></li><li><a href="#sources">Sources</a></li>'
    jump = "".join(f'<a class="chip" href="#{s["id"]}">{JUMP[s["id"]]}</a>' for s in d["sections"] if s["id"] in JUMP)
    body = "".join(f'<section id="{s["id"]}"><h2>{E(s["q"])}</h2>{"".join(block(b) for b in s["blocks"])}</section>' for s in d["sections"])
    facts = "".join(f'<div><dt>{E(k)}</dt><dd>{E(v)}</dd></div>' for k, v in d["facts"])
    faq = "".join(f"<details><summary>{E(q)}</summary><p>{E(a)}</p></details>" for q, a in d["faq"])
    src = "".join(f'<li id="src-{i}"><a href="{E(u)}" rel="noopener">{E(t)}</a>. <span>{E(p)}.</span></li>' for i, (t, p, u) in enumerate(d["sources"], 1))
    names = also(d)
    small = (", ".join(names[:5]) if d.get("brands") else "Also called " + ", ".join(names[:5])) if names else ""
    kind_tag = f'<span class="kind k-{d["kind"]}">{KIND_LABEL[d["kind"]]}</span>'
    related = [x for x in subs if x["class"]["slug"] == d["class"]["slug"] and x["slug"] != d["slug"]][:6]
    rel = "".join(f'<a class="mini" href="{dl(x)}">{sched_badge(x, "sched xs")}<span><b>{E(x["name"])}</b><i>{E(", ".join(also(x)[:2]))}</i></span></a>' for x in related)
    p = d["profile"]
    snap = "".join(f'<div><dt>{k}</dt><dd>{E(v)}</dd></div>' for k, v in [("Onset", p["onset"]), ("Duration", p["duration"]), ("Naloxone reverses it?", p["naloxone"]), ("Dependence risk", p["dependence"])])
    main = f"""<div class="hero-sm"><div class="wrap">
{crumbs(("drugs/", "Drugs"), (f"class/{d['class']['slug']}/", d['class']['name']), d['name'])}
<div class="title">{sched_badge(d)}
<div><p class="eyebrow">{E(d.get('subclass', ''))} &middot; <a href="{sl(d['schedule']['us'])}">{d['schedule']['label']}</a></p>
<h1>{E(d['name'])} <small>{E(small)}</small></h1></div></div>
<p class="quick">{E(d['quick'])}</p>
<div class="meta-row">{kind_tag}{status_line(d)}</div>
<dl class="snap">{snap}</dl>
<nav class="jump" aria-label="Jump to a topic">{jump}</nav>
</div></div>
<div class="wrap layout">
<nav class="toc" aria-label="On this page"><p>On this page</p><ol>{toc}</ol>
<a class="toc-help" href="tel:18002221222">{icon("phone", 16)}<span>Poison Help<b>1-800-222-1222</b></span></a>
<a class="toc-cta" href="{L('interactions/')}?a={d['slug']}">{icon("mix", 16)}<span>Check a combination</span></a>
<a class="toc-cta" href="{L('compare/')}?a={d['slug']}">{icon("cmp", 16)}<span>Compare with another drug</span></a></nav>
<article>
<section id="facts"><h2>{E(d['name'])} at a glance</h2><dl class="facts">{facts}</dl></section>
{body}
<section id="faq"><h2>Common questions about {E(d['name'] if d['name'].isupper() else d['name'].lower())}</h2><div class="faq">{faq}</div></section>
<section id="sources"><h2>Sources</h2><ol class="src">{src}</ol></section>
{f'<section class="related" aria-label="Related"><h2>More in {E(d["class"]["name"])}</h2><div class="minis">{rel}</div></section>' if rel else ''}
</article>
</div>"""
    return shell(path, page_title(d), d["description"], robots, schema(d, SITE + "/" + path), main)

def drug_card(d, h="h3"):
    q = d["quick"].split(". ")[0] + "."
    names = ", ".join(also(d)[:3])
    attrs = f'data-cluster="{d["class"]["slug"]}" data-sched="{SCHED_SLUG[d["schedule"]["us"]]}" data-kind="{d["kind"]}" data-text="{E((d["name"] + " " + " ".join(also(d)) + " " + " ".join(d.get("aka", []))).lower())}"'
    return (f'<a class="card drug" href="{dl(d)}" {attrs}>'
            f'<div class="card-top">{sched_badge(d, "sched sm")}<span class="tag">{E(d["class"]["name"])}</span></div>'
            f'<{h}>{E(d["name"])}</{h}><p class="brands">{E(names)}</p>'
            f'<p>{E(q)}</p><span class="more">Read profile {icon("arrow", 16)}</span></a>')

def page_head(title, lede, *crumb, eyebrow=""):
    eb = f'<p class="eyebrow">{eyebrow}</p>' if eyebrow else ""
    return (f'<div class="hero-sm"><div class="wrap">{crumbs(*crumb) if crumb else ""}{eb}<h1>{title}</h1>'
            f'<p class="quick">{lede}</p></div></div>')

# ---------- home ----------

def home(subs, classes, posts):
    at("")
    topics = [("drugs/", "az", "Drugs A to Z", "50 profiles of prescription and controlled substances, filterable by class and schedule."),
              ("interactions/", "mix", "Combination checker", "Pick any two substances and see how dangerous the mix is, and why."),
              ("compare/", "cmp", "Compare drugs", "Put up to three drugs side by side: onset, duration, half-life, schedule, and risks."),
              ("overdose/", "heart", "Overdose help", "Step-by-step guide to recognizing and responding to an overdose, including naloxone."),
              ("withdrawal/", "wd", "Withdrawal", "What to expect when stopping, drug by drug, and why tapering matters."),
              ("legal-status/", "law", "Legal status", "The five US drug schedules, what each allows, and 2026 changes.")]
    tcards = "".join(f'<a class="card topic" href="{L(p)}"><span class="ico">{icon(i, 26)}</span><h3>{t}</h3><p>{x}</p>'
                     f'<span class="more">Open {icon("arrow", 16)}</span></a>' for p, i, t, x in topics)
    ccards = ""
    for c in classes:
        mem = [d for d in subs if d["class"]["slug"] == c["slug"]]
        chips = "".join(f'<span>{E(d["name"])}</span>' for d in mem[:6]) + (f'<span class="more-n">+{len(mem) - 6}</span>' if len(mem) > 6 else "")
        ccards += (f'<a class="card cluster c-{c["slug"]}" href="{cl(c)}"><span class="count">{len(mem)}</span><h3>{E(c["name"])}</h3>'
                   f'<p>{E(c["intro"].split(". ")[0])}.</p><div class="names">{chips}</div></a>')
    pcards = "".join(f'<li><a href="{bl(p)}"><time datetime="{p["date"]}">{nice(p["date"])}</time>'
                     f'<strong>{E(p["title"])}</strong><span>{E(p["description"])}</span></a></li>' for p in posts[:3])
    n_src = len({s[2] for d in subs for s in d["sources"]})
    opts = "".join(f'<option value="{d["slug"]}">{E(d["name"])}</option>' for d in subs)
    main = f"""<section class="hero"><div class="wrap">
<div class="hero-copy">
<p class="eyebrow">Independent drug reference</p>
<h1>Clear, sourced answers about <em>drugs and medicines</em>.</h1>
<p class="lede">Uses, risks, interactions, overdose, withdrawal, and the law for 50 prescription and controlled substances. Written in plain language from FDA labels, DEA rules, and clinical guidelines.</p>
{search_box("q2", big=True)}
<p class="hint">Popular: <a href="{L('drugs/amphetamine/')}">Adderall</a>, <a href="{L('drugs/alprazolam/')}">Xanax</a>, <a href="{L('drugs/oxycodone/')}">oxycodone</a>, <a href="{L('drugs/gabapentin/')}">gabapentin</a>, <a href="{L('drugs/kratom/')}">kratom</a>, <a href="{L('drugs/psilocybin/')}">psilocybin</a></p>
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
<section class="stats"><div class="wrap">
<div><b>{len(subs)}</b><span>substance profiles</span></div><div><b>{len(classes)}</b><span>drug clusters</span></div><div><b>{n_src}</b><span>primary sources cited</span></div><div><b>0</b><span>products sold or promoted</span></div>
</div></section>
<section class="band"><div class="wrap">
<div class="quick-check card">
<div><p class="eyebrow">Combination checker</p><h2>Is it safe to mix these?</h2><p>Choose two substances to see how they interact and why. Based on how each drug works and on FDA warnings.</p></div>
<form class="qc" action="{L('interactions/')}" method="get">
<label><span class="vh">First substance</span><select name="a" required><option value="">First substance</option>{opts}</select></label>
<span class="plus" aria-hidden="true">+</span>
<label><span class="vh">Second substance</span><select name="b" required><option value="">Second substance</option><option value="alcohol">Alcohol</option><option value="ssri">SSRI or SNRI antidepressant</option><option value="maoi">MAOI antidepressant</option>{opts}</select></label>
<button class="btn" type="submit">Check</button>
</form>
</div>
</div></section>
<section class="band alt"><div class="wrap">
<div class="band-head"><h2>Explore by drug cluster</h2><a class="link" href="{L('drugs/')}">All 50 drugs {icon("arrow", 16)}</a></div>
<div class="grid g3 clusters">{ccards}</div>
</div></section>
<section class="band"><div class="wrap">
<div class="band-head"><h2>Tools and guides</h2><p>Interactive tools built on the same sourced data as every profile.</p></div>
<div class="grid g3">{tcards}</div>
</div></section>
<section class="band alt"><div class="wrap trust">
<div><p class="eyebrow">How we work</p><h2>Built to be trusted, not to sell</h2><p>Dosepedia has no pharmacy, no affiliate links, and nothing to sell. Our job is to explain what the evidence and the law say, clearly enough to act on safely.</p><a class="btn" href="{L('editorial-policy/')}">Read our editorial policy</a></div>
<ul class="points">
<li>{icon("book")}<div><strong>Primary sources only</strong><span>FDA prescribing information, DEA rules and the Federal Register, NIDA, CDC, and clinical guidelines. Every claim is cited.</span></div></li>
<li>{icon("shield")}<div><strong>Medical review</strong><span>Profiles are marked as drafts and kept out of search engines until a licensed clinician has reviewed them.</span></div></li>
<li>{icon("nosell")}<div><strong>Safety first, never sales</strong><span>We explain the legal routes to treatment, how to spot illegal sellers, and how to respond to an overdose.</span></div></li>
</ul>
</div></section>
<section class="band"><div class="wrap">
<div class="band-head"><h2>Latest updates</h2><a class="link" href="{L('blog/')}">All posts {icon("arrow", 16)}</a></div>
<ul class="news">{pcards}</ul>
</div></section>
<section class="band pt0"><div class="wrap"><div class="alert-band">
<span class="ico">{icon("alert", 28)}</span>
<div><h2>One fake pill can kill</h2><p>Pills sold outside a pharmacy are often counterfeit and can contain fentanyl or nitazenes. They cannot be told apart by appearance. Carry naloxone and know the signs of an overdose.</p></div>
<a class="btn light" href="{L('overdose/')}">Overdose guide</a>
</div></div></section>"""
    ld = json.dumps({"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "Dosepedia", "inLanguage": "en"},
        {"@type": "Organization", "@id": SITE + "/#org", "name": "Dosepedia", "url": SITE + "/"}]}, separators=(",", ":"))
    return shell("", "Dosepedia: Clear, Sourced Facts About Drugs and Medicines",
                 "Plain-language facts on 50 prescription and controlled substances: uses, risks, interactions, overdose, withdrawal, and US legal status.",
                 "index,follow", ld, main, og="website")

# ---------- hubs ----------

def drugs_index(subs, classes):
    path = "drugs/"; at(path)
    cchips = '<button type="button" class="chip" data-f="cluster" data-v="" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" class="chip" data-f="cluster" data-v="{c["slug"]}" aria-pressed="false">{E(c["name"])}</button>' for c in classes)
    schips = '<button type="button" class="chip" data-f="sched" data-v="" aria-pressed="true">Any</button>' + "".join(
        f'<button type="button" class="chip" data-f="sched" data-v="{SCHED_SLUG[k]}" aria-pressed="false">{"Not controlled" if not k else "Schedule " + k}</button>' for k in SCHED_ORDER)
    letters = sorted({d["name"][0].upper() for d in subs})
    az = "".join(f'<a href="#l-{c}">{c}</a>' if c in letters else f'<span>{c}</span>' for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    groups = "".join(f'<section id="l-{c}" class="letter"><h2>{c}</h2><div class="grid g3">'
                     + "".join(drug_card(d) for d in subs if d["name"][0].upper() == c) + "</div></section>" for c in letters)
    main = page_head("Drugs A to Z", f"{len(subs)} plain-language profiles of prescription and controlled substances. Filter by cluster or schedule, or type to narrow the list.",
                     ("", "Home"), "Drugs") + f"""<div class="wrap pad">
<div class="filters" data-filter-root>
<label class="ff"><span class="vh">Filter drugs</span>{icon("search", 18)}<input type="search" data-q placeholder="Type to filter, e.g. Xanax, opioid, molly"></label>
<div class="frow"><span>Cluster</span><div class="chips">{cchips}</div></div>
<div class="frow"><span>US schedule</span><div class="chips">{schips}</div></div>
<p class="fcount" aria-live="polite"><b data-count>{len(subs)}</b> substances shown</p>
</div>
<nav class="az" aria-label="Letters">{az}</nav>
<div data-filter-list>{groups}</div>
<p class="empty" data-empty hidden>No substances match. Try clearing a filter.</p>
</div>"""
    return shell(path, "Drugs A to Z: 50 Prescription and Controlled Substances | Dosepedia", "Browse and filter 50 plain-language profiles of prescription and controlled substances by drug class and US schedule.",
                 "index,follow", simple_ld("CollectionPage", path, "Drugs A to Z"), main, og="website")

def class_page(c, subs):
    path = f"class/{c['slug']}/"; at(path)
    members = [d for d in subs if d["class"]["slug"] == c["slug"]]
    rows = "".join(f'<tr><td><a href="{dl(d)}">{E(d["name"])}</a></td><td>{E(", ".join(also(d)[:3]))}</td><td>{E(d.get("subclass", ""))}</td>'
                   f'<td><a href="{sl(d["schedule"]["us"])}">{d["schedule"]["label"]}</a></td><td>{E(d["profile"]["medical"])}</td></tr>' for d in members)
    main = page_head(E(c["name"]), E(c["intro"]), ("", "Home"), ("drugs/", "Drugs"), c["name"], eyebrow=f"Drug cluster &middot; {len(members)} substances") + f"""<div class="wrap pad"><div class="prose">
{"".join(block(b) for b in c.get("blocks", []))}
</div>
<h2>Compare the {E(c['name'].lower())} at a glance</h2>
<div class="tbl"><table><thead><tr><th scope="col">Substance</th><th scope="col">Also known as</th><th scope="col">Type</th><th scope="col">US status</th><th scope="col">Medical use</th></tr></thead><tbody>{rows}</tbody></table></div>
<div class="grid g3 mt">{"".join(drug_card(d) for d in members)}</div></div>"""
    return shell(path, f"{c['name']}: Uses, Risks, and Legal Status | Dosepedia", c["description"],
                 "index,follow", simple_ld("CollectionPage", path, c["name"]), main)

def schedule_page(k, subs):
    path = f"schedules/{SCHED_SLUG[k]}/"; at(path)
    members = [d for d in subs if d["schedule"]["us"] == k]
    what, rx_rules = SCHED_INFO[k]
    nav = "".join(f'<a class="chip"{" aria-current=page" if kk == k else ""} href="{sl(kk)}">{"Not controlled" if not kk else "Schedule " + kk}</a>' for kk in SCHED_ORDER)
    title = SCHED_NAME[k]
    main = page_head(f"{title} {'drugs' if k else 'substances'}", E(what), ("", "Home"), ("legal-status/", "Legal status"), title, eyebrow="US Controlled Substances Act") + f"""<div class="wrap pad">
<nav class="jump" aria-label="Schedules">{nav}</nav>
<div class="grid g2 mt">
<div class="card flat"><h3>What it means</h3><p>{E(what)}</p></div>
<div class="card flat"><h3>Prescribing and refills</h3><p>{E(rx_rules)}</p></div>
</div>
<h2>{len(members)} {title.lower() if k else "substances not federally controlled"} on Dosepedia</h2>
<div class="grid g3">{"".join(drug_card(d) for d in members)}</div>
<p class="note">Source: <a href="https://www.deadiversion.usdoj.gov/schedules/" rel="noopener">DEA Diversion Control Division, Controlled Substance Schedules</a>. Some substances are listed in different schedules depending on the product or formulation; see each profile.</p>
</div>"""
    return shell(path, f"{title} Drugs: Rules, Examples, and Penalties | Dosepedia", f"Which substances are {title} in the US, what the schedule means, and the prescribing and refill rules that apply.",
                 "index,follow", simple_ld("CollectionPage", path, title), main)

def withdrawal_hub(subs, classes):
    path = "withdrawal/"; at(path)
    opts, panels = "", ""
    for c in classes:
        grp = ""
        for d in subs:
            if d["class"]["slug"] != c["slug"]: continue
            sec = next((s for s in d["sections"] if s["id"] == "withdrawal"), None)
            tl = find_block(d, "withdrawal", "timeline")
            if not tl: continue
            grp += f'<option value="{d["slug"]}">{E(d["name"])}</option>'
            intro = inline(re.sub(r"\[\[\d+\]\]", "", next((b["p"] for b in sec["blocks"] if "p" in b), "")))
            panels += (f'<section class="panel" data-panel="{d["slug"]}" hidden><div class="panel-head">{sched_badge(d, "sched sm")}<h2>{E(sec["q"])}</h2>'
                       f'<a class="link" href="{dl(d)}#withdrawal">Full guide {icon("arrow", 16)}</a></div><p>{intro}</p>{block({"timeline": tl})}</section>')
        if grp: opts += f'<optgroup label="{E(c["name"])}">{grp}</optgroup>'
    main = page_head("Withdrawal timelines", "Stopping some substances after regular use causes withdrawal. Choose one to see what to expect and when, then read the full guide for tapering advice.",
                     ("", "Home"), "Withdrawal") + f"""<div class="wrap pad">
<div class="grid g3 facts-row">
<div class="card flat"><h3>Don't stop sedatives suddenly</h3><p>Abruptly stopping benzodiazepines, barbiturates, GHB, or high-dose gabapentinoids after regular use can cause seizures. Talk to the prescriber first.</p></div>
<div class="card flat"><h3>Tolerance falls fast</h3><p>After a break from opioids, tolerance drops within days. Returning to a previous dose can be fatal. Keep naloxone nearby.</p></div>
<div class="card flat"><h3>Free, confidential help</h3><p>SAMHSA's National Helpline is free and open 24/7: <a href="tel:18006624357">1-800-662-4357</a>. In a crisis, call or text <a href="tel:988">988</a>.</p></div>
</div>
<div class="picker" data-picker><label for="wd-pick">Choose a substance</label><select id="wd-pick">{opts}</select></div>
{panels}
</div>"""
    return shell(path, "Withdrawal Timelines and Safe Tapering, Drug by Drug | Dosepedia",
                 "Withdrawal timelines, symptoms, and why gradual tapering under a prescriber matters, for 50 substances.",
                 "index,follow", simple_ld("CollectionPage", path, "Withdrawal"), main)

EXTRAS = [  # selectable non-profile items for the combination checker
    {"slug": "alcohol", "name": "Alcohol", "groups": ["depressant", "alcohol"]},
    {"slug": "ssri", "name": "SSRI or SNRI antidepressant", "groups": ["serotonergic", "ssri"]},
    {"slug": "maoi", "name": "MAOI antidepressant", "groups": ["maoi"]},
    {"slug": "lithium", "name": "Lithium", "groups": ["lithium"]},
]

def tool_data(subs):
    return {"items": [{"slug": d["slug"], "name": d["name"], "url": dl(d), "cluster": d["class"]["name"], "sched": d["schedule"]["label"],
                       "kind": KIND_LABEL[d["kind"]], "aka": ", ".join(also(d)[:3]), **d["profile"]} for d in subs] + EXTRAS}

def interactions_hub(subs, classes):
    path = "interactions/"; at(path)
    def opts(extra=True):
        o = '<optgroup label="Common">' + "".join(f'<option value="{x["slug"]}">{E(x["name"])}</option>' for x in EXTRAS) + "</optgroup>" if extra else ""
        for c in classes:
            o += f'<optgroup label="{E(c["name"])}">' + "".join(f'<option value="{d["slug"]}">{E(d["name"])}</option>' for d in subs if d["class"]["slug"] == c["slug"]) + "</optgroup>"
        return o
    tables = "".join(f'<li><a href="{dl(d)}#interactions">{E(d["name"])}</a></li>' for d in subs)
    main = page_head("Combination checker", "Pick any two substances to see how risky the combination is and why. The checker uses how each drug acts in the body and FDA warnings, so it flags the most dangerous mixes first.",
                     ("", "Home"), "Interactions") + f"""<div class="wrap pad">
<div class="combo card" data-combo>
<div class="combo-pick">
<label><span>First substance</span><select data-a><option value="">Choose…</option>{opts()}</select></label>
<button type="button" class="swap" data-swap aria-label="Swap">{icon("mix", 20)}</button>
<label><span>Second substance</span><select data-b><option value="">Choose…</option>{opts()}</select></label>
</div>
<div class="combo-out" data-out aria-live="polite"><p class="combo-empty">Choose two substances to see the result.</p></div>
</div>
<div class="legend"><span class="lv lv-danger">Dangerous</span><span class="lv lv-high">High risk</span><span class="lv lv-caution">Caution</span><span class="lv lv-low">Low known risk</span></div>
<p class="warn" role="note">{icon("alert", 20)}<span><strong>Not a complete check.</strong> This tool groups substances by how they act. It cannot account for doses, health conditions, or every enzyme interaction, and street drugs often contain other substances. A pharmacist can check your full medication list.</span></p>
<h2>Interaction tables for each substance</h2>
<p>Every profile has a detailed table of specific interactions from its FDA label or public health sources.</p>
<ul class="cols">{tables}</ul>
</div>"""
    return shell(path, "Drug Combination Checker: Is It Safe to Mix? | Dosepedia",
                 "Check how risky it is to combine any two of 50 drugs, alcohol, or antidepressants. Based on pharmacology and FDA warnings.",
                 "index,follow", simple_ld("WebApplication", path, "Combination checker"), main, data=tool_data(subs))

def compare_page(subs, classes):
    path = "compare/"; at(path)
    o = ""
    for c in classes:
        o += f'<optgroup label="{E(c["name"])}">' + "".join(f'<option value="{d["slug"]}">{E(d["name"])}</option>' for d in subs if d["class"]["slug"] == c["slug"]) + "</optgroup>"
    sels = "".join(f'<label><span>Drug {i}</span><select data-c="{i}"><option value="">{"Choose…" if i < 3 else "Optional"}</option>{o}</select></label>' for i in (1, 2, 3))
    popular = [("oxycodone", "hydrocodone", ""), ("amphetamine", "methylphenidate", "lisdexamfetamine"), ("alprazolam", "clonazepam", "lorazepam"),
               ("gabapentin", "pregabalin", ""), ("fentanyl", "nitazenes", "heroin"), ("ketamine", "esketamine", "")]
    pop = "".join(f'<a class="chip" href="?a={a}&b={b}{"&c=" + c if c else ""}">{" vs ".join(next(d["name"] for d in subs if d["slug"] == s) for s in (a, b, c) if s)}</a>' for a, b, c in popular)
    main = page_head("Compare drugs side by side", "Choose two or three substances to compare how fast they work, how long they last, how they are regulated, and whether naloxone reverses an overdose.",
                     ("", "Home"), "Compare") + f"""<div class="wrap pad">
<div class="cmp-pick card">{sels}</div>
<div class="jump"><span class="muted">Popular comparisons:</span>{pop}</div>
<div class="cmp-out" data-cmp aria-live="polite"><p class="combo-empty">Choose at least two substances.</p></div>
</div>"""
    return shell(path, "Compare Drugs Side by Side: Onset, Half-Life, Schedule | Dosepedia",
                 "Compare up to three drugs side by side: onset, duration, half-life, US schedule, medical use, dependence risk, and naloxone response.",
                 "index,follow", simple_ld("WebApplication", path, "Compare drugs"), main, data=tool_data(subs))

def legal_hub(subs):
    path = "legal-status/"; at(path)
    sch = "".join(f'<li><span class="sched sm{" none" if not k else ""}">{k or "NC"}</span><div><strong><a href="{sl(k)}">{SCHED_NAME[k]}</a></strong><span>{E(SCHED_INFO[k][0])}</span>'
                  f'<em>{sum(1 for d in subs if d["schedule"]["us"] == k)} on Dosepedia</em></div></li>' for k in SCHED_ORDER)
    rows = "".join(f'<tr data-sched="{SCHED_SLUG[d["schedule"]["us"]]}"><td><a href="{dl(d)}">{E(d["name"])}</a></td><td>{d["schedule"]["label"]}</td><td>{KIND_LABEL[d["kind"]]}</td>'
                   f'<td><a href="{dl(d)}#{"legal-access" if d["kind"] == "rx" else "legal-us"}">{"How to get it legally" if d["kind"] == "rx" else "US law"}</a></td></tr>' for d in subs)
    main = page_head("Legal status", "The Controlled Substances Act sorts drugs into five schedules. The schedule decides whether a substance can be prescribed, how it can be refilled, and the penalties for possessing it without a prescription.",
                     ("", "Home"), "Legal status") + f"""<div class="wrap pad">
<div class="news-box"><p class="eyebrow">2026 changes</p><ul>
<li><strong>Medical marijuana to Schedule III</strong> (April 2026); adult-use cannabis remains Schedule I. <a href="{L('drugs/cannabis/')}#legal-us">Details</a></li>
<li><strong>Hemp THC products restricted</strong> from November 12, 2026. <a href="{L('drugs/cannabis/')}#legal-us">Details</a></li>
<li><strong>Tianeptine proposed for Schedule I</strong> (July 2026). <a href="{L('drugs/tianeptine/')}#legal-us">Details</a></li>
<li><strong>7-OH kratom compounds scheduled</strong> (August 2026). <a href="{L('drugs/kratom/')}#legal-us">Details</a></li>
<li><strong>Xylazine bill passed the House</strong> (September 2026). <a href="{L('drugs/xylazine/')}#legal-us">Details</a></li>
<li><strong>Telehealth prescribing flexibilities</strong> run through December 31, 2026. <a href="{L('blog/telehealth-controlled-medicines-2026/')}">Details</a></li>
</ul></div>
<div class="two">
<div>
<h2>The US drug schedules</h2>
<ol class="schedules">{sch}</ol>
<p class="note">Source: <a href="https://www.deadiversion.usdoj.gov/schedules/" rel="noopener">DEA Diversion Control Division</a>.</p>
</div>
<div>
<h2>All 50 substances</h2>
<div class="filters slim" data-table-filter><div class="chips">{'<button type="button" class="chip" data-v="" aria-pressed="true">All</button>' + "".join(f'<button type="button" class="chip" data-v="{SCHED_SLUG[k]}" aria-pressed="false">{"NC" if not k else k}</button>' for k in SCHED_ORDER)}</div></div>
<div class="tbl scroll"><table><thead><tr><th scope="col">Substance</th><th scope="col">US status</th><th scope="col">Type</th><th scope="col">Access</th></tr></thead><tbody data-rows>{rows}</tbody></table></div>
<div class="card flat"><h3>The legal route to a prescription medicine</h3>
<ol class="steps"><li><strong>See a licensed clinician</strong><span>In person or, through December 31, 2026, by telemedicine under federal flexibilities.</span></li>
<li><strong>Get a prescription</strong><span>Controlled medicines need a clinician registered with the DEA.</span></li>
<li><strong>Fill it at a licensed pharmacy</strong><span>In person or by mail from a pharmacy licensed in your state.</span></li></ol></div>
</div>
</div>
</div>"""
    return shell(path, "US Drug Schedules and Legal Status, Updated for 2026 | Dosepedia",
                 "The five US controlled-substance schedules explained, 2026 legal changes, and the federal status of 50 substances.",
                 "index,follow", simple_ld("WebPage", path, "Legal status"), main)

OD = {
    "opioid": ("Opioids", "Oxycodone, fentanyl, heroin, methadone, tramadol, kratom, nitazenes, or pills not from a pharmacy",
               ["Pinpoint pupils", "Will not wake up or respond to a loud voice or a firm rub on the breastbone", "Slow, shallow, or stopped breathing; gurgling or snoring", "Blue or gray lips and fingertips", "Limp body"],
               ["Call 911.", "Give naloxone: one spray in one nostril. If no response in 2 to 3 minutes, give another dose in the other nostril.", "Give rescue breaths if trained, or place the person in the recovery position.", "Stay until help arrives. Naloxone can wear off before the opioid does."]),
    "depressant": ("Sedatives or alcohol", "Xanax, Valium, sleeping pills, GHB, gabapentin, carisoprodol, phenobarbital, or heavy drinking",
                   ["Extreme drowsiness or cannot be woken", "Confusion, slurred speech, poor coordination", "Slow or irregular breathing", "Vomiting while drowsy"],
                   ["Call 911 if the person cannot be woken or is breathing slowly.", "Give naloxone if opioids or street pills could be involved. It is harmless otherwise.", "Place them in the recovery position so they cannot choke on vomit.", "Do not let them sleep it off alone."]),
    "stimulant": ("Stimulants", "Cocaine, methamphetamine, Adderall, MDMA, or synthetic cathinones",
                  ["Chest pain or a racing, irregular heartbeat", "Very hot skin or not sweating in heat", "Severe agitation, paranoia, or confusion", "Seizure, collapse, or signs of stroke"],
                  ["Call 911.", "Move them somewhere cool and calm; cool the skin with water. Do not restrain them.", "If they become unresponsive, give naloxone, since stimulants are often contaminated with fentanyl.", "If they have a seizure, clear the area and time it; do not put anything in their mouth."]),
    "psychedelic": ("Psychedelics or dissociatives", "LSD, psilocybin, ketamine, PCP, DMT, or synthetic cannabinoids",
                    ["Extreme panic or terror", "Dangerous behavior or no awareness of danger", "Very high temperature, seizure, or chest pain", "Unresponsive or breathing poorly"],
                    ["Call 911 for any physical danger sign or if they could harm themselves or others.", "Move them to a quiet, safe place and speak calmly. Do not leave them alone.", "Place an unresponsive person in the recovery position.", "Give naloxone if they are unresponsive and opioids could be involved."]),
    "unknown": ("I don't know", "Unknown pills or powders, or several substances",
                ["Cannot be woken", "Slow, noisy, or stopped breathing", "Chest pain, seizure, or very high temperature", "Blue or gray lips"],
                ["Call 911 and tell them what you see.", "If they are unresponsive or breathing poorly, give naloxone. It is safe even if no opioid was taken.", "Place them in the recovery position.", "Stay with them and keep any packaging or pills for the paramedics."]),
}

def overdose_page(subs):
    path = "overdose/"; at(path)
    btns = "".join(f'<button type="button" class="od-btn" data-od="{k}" aria-pressed="{str(k == "opioid").lower()}"><b>{E(v[0])}</b><span>{E(v[1])}</span></button>' for k, v in OD.items())
    panes = "".join(f'<div class="od-pane" data-pane="{k}"{"" if k == "opioid" else " hidden"}><div class="two"><div><h3>Signs</h3><ul class="signs">{"".join(f"<li>{E(s)}</li>" for s in v[2])}</ul></div>'
                    f'<div><h3>What to do now</h3><ol class="steps">{"".join(f"<li><strong>{E(s)}</strong></li>" for s in v[3])}</ol></div></div></div>' for k, v in OD.items())
    main = f"""<div class="sos-hero"><div class="wrap">
{crumbs(("", "Home"), "Overdose help")}
<p class="eyebrow">Emergency guide</p>
<h1>Someone may be overdosing. Here's what to do.</h1>
<div class="sos-call"><a class="btn big danger" href="tel:911">{icon("phone", 20)} Call 911</a><a class="btn big ghost" href="tel:18002221222">Poison Help 1-800-222-1222</a></div>
<p class="quick">If the person is unresponsive or breathing slowly, call 911 first. Then pick what they may have taken.</p>
</div></div>
<div class="wrap pad">
<div class="od-pick" role="group" aria-label="What did they take?">{btns}</div>
<div class="od-panes card" aria-live="polite">{panes}</div>
<div class="grid g2 mt">
<div class="card"><h2 class="h3">How to give naloxone nasal spray</h2>
<ol class="steps"><li><strong>Lay the person on their back</strong><span>Tilt the head back and support the neck.</span></li>
<li><strong>Insert the nozzle in one nostril</strong><span>Until your fingers touch the bottom of the nose.</span></li>
<li><strong>Press the plunger firmly</strong><span>The full dose sprays at once.</span></li>
<li><strong>Wait 2 to 3 minutes</strong><span>If there is no response, give a second dose in the other nostril.</span></li>
<li><strong>Recovery position</strong><span>Turn them on their side, top knee bent, and stay with them.</span></li></ol>
<p class="note">Naloxone (Narcan and generics) is sold without a prescription. It only reverses opioids, but it is safe to give when you are not sure.</p></div>
<div class="card"><h2 class="h3">Staying safer</h2>
<ul><li><strong>Never use alone.</strong> If you do, call a never-use-alone hotline or tell someone.</li>
<li><strong>Test your drugs.</strong> Fentanyl, xylazine, and nitazene test strips are legal in most states.</li>
<li><strong>Start low, go slow.</strong> Tolerance drops after a break, and potency varies batch to batch.</li>
<li><strong>Don't mix.</strong> Opioids with sedatives or alcohol cause most overdose deaths. <a href="{L('interactions/')}">Check a combination</a>.</li>
<li><strong>Good Samaritan laws</strong> in most states protect people who call 911 for an overdose from some drug charges.</li></ul></div>
</div>
<h2>Overdose guides by substance</h2>
<ul class="cols">{"".join(f'<li><a href="{dl(d)}#overdose">{E(d["name"])}</a></li>' for d in subs)}</ul>
</div>"""
    return shell(path, "Overdose Help: Signs, Naloxone, and What to Do | Dosepedia",
                 "What to do right now if someone may be overdosing: signs for opioids, sedatives, stimulants, and psychedelics, how to give naloxone, and the recovery position.",
                 "index,follow", simple_ld("WebPage", path, "Overdose help"), main)

GLOSSARY = [
    ("Addiction", "A treatable brain condition, also called substance use disorder, in which a person continues using a substance despite harm. Different from physical dependence."),
    ("Agonist", "A drug that activates a receptor. Oxycodone is a full opioid agonist; buprenorphine is a partial agonist."),
    ("Antagonist", "A drug that blocks a receptor. Naloxone is an opioid antagonist."),
    ("Benzodiazepine", "A class of sedatives that enhance GABA, such as alprazolam and diazepam."),
    ("Boxed warning", "The FDA's strongest label warning, printed in a black box at the top of the prescribing information."),
    ("CNS depressant", "Any substance that slows the central nervous system, including opioids, sedatives, alcohol, and GHB. Combining them is a leading cause of overdose."),
    ("Contingency management", "A treatment that gives rewards for drug-free tests. The most effective treatment for stimulant use disorder."),
    ("Controlled substance", "A drug regulated under the Controlled Substances Act and placed in one of five schedules."),
    ("CYP3A4 and CYP2D6", "Liver enzymes that break down many drugs. Medicines that block or speed them up can raise or lower drug levels."),
    ("DEA registration", "Federal registration a clinician needs to prescribe controlled substances."),
    ("Dependence (physical)", "The body's adaptation to a drug, so that stopping causes withdrawal. It can happen with prescribed use and is not the same as addiction."),
    ("Dissociative", "A drug, such as ketamine or PCP, that causes feelings of detachment from the body and surroundings."),
    ("Fentanyl test strip", "A paper strip that detects fentanyl in a drug sample. Legal in most states."),
    ("Half-life", "The time it takes for the level of a drug in the blood to fall by half. After about five half-lives, most of a drug is gone."),
    ("Harm reduction", "Practical strategies, such as naloxone, test strips, and syringe services, that reduce the harms of drug use."),
    ("Naloxone", "A medicine that rapidly reverses opioid overdose. Sold without a prescription as Narcan and generics."),
    ("Nitazenes", "A class of synthetic opioids, some stronger than fentanyl, found in counterfeit pills."),
    ("Opioid use disorder", "Addiction to opioids. Treated most effectively with buprenorphine or methadone."),
    ("PDMP", "Prescription drug monitoring program: a state database of controlled-substance prescriptions that clinicians and pharmacists check."),
    ("Precipitated withdrawal", "Sudden withdrawal caused by taking buprenorphine or naloxone while full opioids are still active."),
    ("Prodrug", "An inactive drug that the body converts into an active one, such as lisdexamfetamine to dextroamphetamine, or codeine to morphine."),
    ("REMS", "Risk Evaluation and Mitigation Strategy: an FDA safety program that restricts how certain drugs are prescribed or dispensed."),
    ("Schedule", "One of five categories in the Controlled Substances Act, from Schedule I (no accepted medical use) to Schedule V (lowest potential for abuse)."),
    ("Serotonin syndrome", "A dangerous excess of serotonin, causing agitation, fever, sweating, muscle twitching, and fast heartbeat, often from combining serotonergic drugs."),
    ("Taper", "A gradual dose reduction to stop a medicine safely and minimize withdrawal."),
    ("Telemedicine flexibilities", "Temporary federal rules allowing controlled medicines to be prescribed after a video or phone visit, extended through December 31, 2026."),
    ("Tolerance", "Needing more of a drug to get the same effect. Tolerance falls after a break, which raises overdose risk."),
    ("Xylazine", "A veterinary sedative found in illicit fentanyl that is not reversed by naloxone and causes severe wounds."),
]

def glossary_page():
    path = "glossary/"; at(path)
    items = "".join(f'<div class="term" data-term="{E((t + " " + x).lower())}"><dt id="{re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")}">{E(t)}</dt><dd>{E(x)}</dd></div>' for t, x in GLOSSARY)
    main = page_head("Glossary", "Plain definitions of the medical and legal terms used across Dosepedia.", ("", "Home"), "Glossary") + f"""<div class="wrap pad narrowish">
<label class="ff">{icon("search", 18)}<span class="vh">Filter terms</span><input type="search" data-gq placeholder="Filter terms, e.g. half-life"></label>
<dl class="gloss">{items}</dl><p class="empty" data-gempty hidden>No terms match.</p></div>"""
    ld = json.dumps({"@context": "https://schema.org", "@type": "DefinedTermSet", "name": "Dosepedia glossary", "url": f"{SITE}/{path}",
                     "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t, "description": x} for t, x in GLOSSARY]}, separators=(",", ":"))
    return shell(path, "Drug and Medicine Glossary | Dosepedia", "Plain-language definitions of pharmacology and drug law terms: half-life, tolerance, schedules, REMS, naloxone, and more.", "index,follow", ld, main)

# ---------- about pages ----------

ABOUT = {
    "about/": ("About Dosepedia", "An independent, plain-language reference on prescription and controlled substances.", """
<p>Dosepedia exists because people look up drugs at important moments: before starting a new prescription, when worried about a combination, when trying to stop, or when someone they love is in danger. The answers they find are often either too technical to use or not trustworthy. We write pages that are both accurate and readable.</p>
<h2>What we cover</h2>
<ul><li>50 prescription and controlled substances across seven clusters, from opioids and stimulants to psychedelics and emerging drugs such as nitazenes and xylazine.</li><li>What each is used for, how it is prescribed, and its risks, interactions, and overdose signs.</li><li>Withdrawal, and why tapering should happen with a prescriber.</li><li>The legal routes to a prescription, US legal status, and how to recognise illegal sellers.</li></ul>
<h2>What we don't do</h2>
<p>We do not sell, supply, or ship medicines, and we have no affiliate relationships with pharmacies or telehealth providers. We never give dosing guidance for illegal drugs. We cannot give personal medical advice. For decisions about your treatment, talk to a doctor or pharmacist.</p>"""),
    "editorial-policy/": ("Editorial policy", "How we research, write, review, and correct every page.", """
<h2>Sources</h2>
<p>We rely on primary sources: FDA-approved prescribing information, DEA rules and Federal Register notices, the National Institute on Drug Abuse, the CDC, and guidelines from clinical societies. Every factual claim on a profile links to its source.</p>
<h2>Prescription versus illegal drugs</h2>
<p>For approved medicines, we summarize dosing exactly as the FDA label describes it, framed as how clinicians prescribe, never as personal advice. For substances with no medical route, we do not publish doses. We focus on risks, overdose response, the law, and where to find help.</p>
<h2>Plain language</h2>
<p>We write for adults without medical training. We define terms, avoid jargon, and put the most important safety information first.</p>
<h2>Medical review</h2>
<p>Profiles are published as drafts and marked <em>noindex</em>, which keeps them out of search results, until a licensed clinician has reviewed them. Reviewed pages show the reviewer's name and the review date.</p>
<h2>Keeping up with the law</h2>
<p>Drug law changed quickly in 2026. We date every profile and update legal sections when the DEA, FDA, or Congress acts.</p>
<h2>Independence</h2>
<p>We do not accept payment for coverage, sell medicines, or use affiliate links.</p>
<h2>Corrections</h2>
<p>If you find an error, please <a href="@contact/">contact us</a>. We review every report and update the page and its date when we make a correction.</p>"""),
    "medical-review-team/": ("Medical review team", "The licensed clinicians who check our drug profiles.", """
<p>Every Dosepedia profile is reviewed by a licensed clinician, such as a physician, pharmacist, or nurse practitioner, before it is marked as reviewed and opened to search engines.</p>
<p class="status draft">Our review team is being assembled. Until then, every profile is clearly labelled as a draft.</p>
<h2>What reviewers check</h2>
<ul><li>That dosing figures, warnings, and interactions match the current FDA label.</li><li>That legal and regulatory statements reflect current DEA and federal rules.</li><li>That safety information is complete, prominent, and easy to understand.</li></ul>
<h2>Join the team</h2>
<p>Licensed clinicians interested in reviewing can <a href="@contact/">get in touch</a>.</p>"""),
}

def about_page(path, title, lede, body):
    at(path)
    body = re.sub(r'href="@([^"]*)"', lambda m: f'href="{L(m[1])}"', body)
    main = page_head(title, lede, ("", "Home"), title) + f'<div class="wrap pad"><div class="prose">{body}</div></div>'
    return shell(path, f"{title} | Dosepedia", lede, "index,follow", simple_ld("AboutPage", path, title), main, og="website")

def contact_page():
    path = "contact/"; at(path)
    form = CONTACT.split('<form', 1)[1].split('</form>', 1)[0]
    form = re.sub(r'<div class="dlg-head">.*?</div>', "", form, flags=re.S)
    main = page_head("Contact", "Send a correction, a question about the site, or feedback. We read every message.", ("", "Home"), "Contact") + \
        f'<div class="wrap pad"><div class="contact-card"><form class="form"{form}</form></div></div>'
    return shell(path, "Contact | Dosepedia", "Contact Dosepedia with corrections, questions, or feedback.", "index,follow",
                 simple_ld("ContactPage", path, "Contact"), main, og="website")

def not_found():
    global PREFIX
    PREFIX = "/"  # served at any depth, so use root-absolute links
    main = f"""<div class="wrap nf"><p class="eyebrow">Error 404</p><h1>We couldn't find that page.</h1>
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
<h1>{E(p['title'])}</h1>
<p class="by">By {E(p['author'])} &middot; <time datetime="{p['date']}">{nice(p['date'])}</time> &middot; {mins} min read</p>{status}</div></div>
<div class="wrap narrow"><article class="post prose">{body}</article></div>"""
    return shell(path, f"{p['title']} | Dosepedia", p["description"], "index,follow,max-snippet:-1" if p["live"] else "noindex,follow", ld, main)

def blog_index(posts):
    path = "blog/"; at(path)
    items = "".join(f'<li><a href="{bl(p)}"><time datetime="{p["date"]}">{nice(p["date"])}</time>'
                    f'<strong>{E(p["title"])}</strong><span>{E(p["description"])}</span></a></li>' for p in posts)
    ld = json.dumps({"@context": "https://schema.org", "@type": "Blog", "@id": SITE + "/blog/", "url": SITE + "/blog/", "name": "Dosepedia blog",
                     "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE}}, separators=(",", ":"))
    main = page_head("Blog", "Rule changes, safety alerts, and plain answers to questions about controlled substances in the United States.", ("", "Home"), "Blog") + \
        f'<div class="wrap pad"><ul class="news">{items or "<li>No posts yet.</li>"}</ul></div>'
    return shell(path, "Blog: Drug Law Changes and Safety Updates | Dosepedia", "News and explainers on US controlled-substance rules, safety alerts, and how to get prescribed medicines legally.", "index,follow", ld, main, og="website")

# ---------- build ----------

def write(path, text):
    out = DIST / (path + "index.html" if path == "" or path.endswith("/") else path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text)

def main():
    subs = sorted((json.loads(f.read_text()) for f in (ROOT / "data/substances").glob("*.json")), key=lambda d: d["name"].lower())
    order = ["opioids", "benzodiazepines-sedatives", "stimulants", "gabapentinoids-dissociatives", "cannabis-psychedelics", "anabolic-steroids", "emerging"]
    classes = sorted((json.loads(f.read_text()) for f in (ROOT / "data/classes").glob("*.json")), key=lambda c: order.index(c["slug"]) if c["slug"] in order else 99)
    known = {c["slug"] for c in classes}
    for d in subs:
        if d["class"]["slug"] not in known:
            raise SystemExit(f"{d['slug']}: no data/classes/{d['class']['slug']}.json")
    CLUSTER_NAV.extend((c["slug"], c["name"]) for c in classes)
    posts = sorted((read_post(f) for f in (ROOT / "data/blog").glob("*.md")), key=lambda p: p["date"], reverse=True)
    INDEX.extend({"t": d["name"], "k": " ".join(also(d) + d.get("aka", []) + [d["class"]["name"], d.get("subclass", "")]), "s": ", ".join(also(d)[:2]) or d["class"]["name"], "u": f"drugs/{d['slug']}/"} for d in subs)
    INDEX.extend({"t": c["name"], "k": "class cluster", "s": "Drug cluster", "u": f"class/{c['slug']}/"} for c in classes)
    INDEX.extend({"t": n, "k": "tool topic", "s": "Tool", "u": p} for p, n in NAV[1:] + [("overdose/", "Overdose help"), ("glossary/", "Glossary")])
    INDEX.extend({"t": SCHED_NAME[k], "k": "schedule law", "s": "US schedule", "u": f"schedules/{SCHED_SLUG[k]}/"} for k in SCHED_ORDER)
    INDEX.extend({"t": p["title"], "k": "blog", "s": "Blog", "u": f"blog/{p['slug']}/"} for p in posts)
    if DIST.exists(): shutil.rmtree(DIST)
    today = datetime.date.today().isoformat()
    sm = [(SITE + "/", today)]
    write("", home(subs, classes, posts))
    pages = [("drugs/", drugs_index(subs, classes)), ("withdrawal/", withdrawal_hub(subs, classes)), ("interactions/", interactions_hub(subs, classes)),
             ("compare/", compare_page(subs, classes)), ("legal-status/", legal_hub(subs)), ("overdose/", overdose_page(subs)),
             ("glossary/", glossary_page()), ("contact/", contact_page())]
    pages += [(f"class/{c['slug']}/", class_page(c, subs)) for c in classes]
    pages += [(f"schedules/{SCHED_SLUG[k]}/", schedule_page(k, subs)) for k in SCHED_ORDER]
    pages += [(p, about_page(p, *v)) for p, v in ABOUT.items()]
    for p, text in pages:
        write(p, text)
        sm.append((f"{SITE}/{p}", today))
    for d in subs:
        write(f"drugs/{d['slug']}/", substance(d, subs))
        if d.get("reviewer"): sm.append((f"{SITE}/drugs/{d['slug']}/", d["updated"]))
    for p in posts:
        write(f"blog/{p['slug']}/", post_page(p))
        if p["live"]: sm.append((f"{SITE}/blog/{p['slug']}/", p.get("updated", p["date"])))
    write("blog/", blog_index(posts))
    write("404.html", not_found())
    live = [p for p in posts if p["live"]]
    sm.append((SITE + "/blog/", live[0]["date"] if live else today))
    rss = "".join(f"<item><title>{E(p['title'])}</title><link>{SITE}/blog/{p['slug']}/</link><guid>{SITE}/blog/{p['slug']}/</guid>"
                  f"<pubDate>{datetime.datetime.fromisoformat(p['date']).strftime('%a, %d %b %Y 00:00:00 +0000')}</pubDate><description>{E(p['description'])}</description></item>" for p in live)
    write("blog/feed.xml", f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Dosepedia blog</title><link>{SITE}/blog/</link><description>Drug law changes and safety updates</description>{rss}</channel></rss>')
    urls = "".join(f"<url><loc>{u}</loc><lastmod>{m}</lastmod></url>" for u, m in sm)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    n = sum(1 for _ in DIST.rglob("*.html"))
    print(f"built {n} pages: {len(subs)} substances, {len(classes)} clusters, {len(SCHED_ORDER)} schedule pages")

if __name__ == "__main__":
    main()
