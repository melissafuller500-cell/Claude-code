"""Blog: one answer-first guide per substance (SEO, AEO and GEO structured), plus index, feed, and llms.txt.

Each guide is assembled from the sourced content of the matching profile, restructured as
question-led sections with a direct answer, key takeaways, quick-facts table, FAQ schema, and citations.
"""
import html
import json
import re
from email.utils import format_datetime
from datetime import datetime, timezone

from dp import SITE, DATE, DATE_H, CLUSTERS, CLUSTER_LABEL, SCHED_KEY, SCHED_LABEL, KINDS, esc, attr, sched_badge, jsonld

STRIP_SUP = re.compile(r"<sup>.*?</sup>", re.S)


def text(h):
    h = STRIP_SUP.sub("", h)
    h = re.sub(r"<svg.*?</svg>", "", h, flags=re.S)
    h = re.sub(r"<[^>]+>", "", h)
    return html.unescape(re.sub(r"\s+", " ", h)).strip()


def inner(h):
    """Keep simple inline markup (strong, a) but drop citations."""
    return STRIP_SUP.sub("", h).strip()


def section(s, sid):
    m = re.search(rf'<section id="{sid}">(.*?)</section>', s, re.S)
    return m.group(1) if m else ""


def paras(sec):
    return [inner(p) for p in re.findall(r"<p>(.*?)</p>", sec, re.S)]


def parse_profile(s):
    """Parse a rendered drug profile (old or new) into a content model."""
    P = {}
    h1 = re.search(r"<h1>(.*?)<small>(.*?)</small></h1>", s, re.S)
    P["name"], P["aka"] = text(h1.group(1)), text(h1.group(2))
    P["quick"] = text(re.search(r'<p class="quick">(.*?)</p>', s, re.S).group(1))
    P["eyebrow"] = text(re.search(r'<p class="eyebrow">(.*?)&middot;', s, re.S).group(1))
    P["kind_label"] = text(re.search(r'<span class="kind k-[a-z]+">(.*?)</span>', s).group(1))
    P["snap"] = dict((text(a), text(b)) for a, b in re.findall(r"<div><dt>(.*?)</dt><dd>(.*?)</dd></div>", re.search(r'<dl class="snap">(.*?)</dl>', s, re.S).group(1)))
    P["facts"] = [(text(a), text(b)) for a, b in re.findall(r"<div><dt>(.*?)</dt><dd>(.*?)</dd></div>", section(s, "facts"))]
    u = section(s, "uses")
    P["uses_h2"] = text(re.search(r"<h2>(.*?)</h2>", u).group(1)) if u else ""
    P["uses"] = paras(u)
    P["effects"] = paras(section(s, "effects"))
    r = section(s, "risks")
    bx = re.search(r'<div class="boxed">.*?<ul>(.*?)</ul></div>', r, re.S)
    P["boxed"] = [inner(x) for x in re.findall(r"<li>(.*?)</li>", bx.group(1), re.S)] if bx else []
    r_nobox = re.sub(r'<div class="boxed">.*?</div>', "", r, flags=re.S)
    P["risks"] = [x for x in paras(r_nobox)]
    P["warns"] = [inner(x) for x in re.findall(r'<p class="warn" role="note">.*?<span>(.*?)</span></p>', r, re.S)]
    it = section(s, "interactions")
    tb = re.search(r"<tbody>(.*?)</tbody>", it, re.S)
    P["inter_head"] = [text(x) for x in re.findall(r"<th[^>]*>(.*?)</th>", it)][:3]
    P["inter"] = [[text(c) for c in re.findall(r"<td>(.*?)</td>", row, re.S)] for row in re.findall(r"<tr>(.*?)</tr>", tb.group(1), re.S)] if tb else []
    od = section(s, "overdose")
    P["overdose_h2"] = text(re.search(r"<h2>(.*?)</h2>", od).group(1))
    P["overdose"] = paras(re.sub(r'<div class="emerg">.*?</div>', "", od, flags=re.S))
    em = re.search(r'<div class="emerg"><h3>(.*?)</h3><ul>(.*?)</ul></div>', od, re.S)
    P["emerg"] = (text(em.group(1)), [inner(x) for x in re.findall(r"<li>(.*?)</li>", em.group(2), re.S)]) if em else ("", [])
    w = section(s, "withdrawal")
    P["wd_h2"] = text(re.search(r"<h2>(.*?)</h2>", w).group(1))
    P["wd_intro"] = paras(re.sub(r"<ol.*?</ol>", "", w, flags=re.S))[:1]
    P["wd_tl"] = [(text(a), text(b), text(c)) for a, b, c in re.findall(r"<li><b>(.*?)</b><strong>(.*?)</strong><span>(.*?)</span></li>", w, re.S)]
    la = section(s, "legal-access") or section(s, "legal-us")
    P["legal"] = paras(la)[:2]
    P["legal_li"] = [inner(x) for x in re.findall(r"<li>(.*?)</li>", la, re.S)][:3]
    ls = section(s, "legal-status")
    P["intl"] = [[text(c) for c in re.findall(r"<td>(.*?)</td>", row, re.S)] for row in re.findall(r"<tr>(.*?)</tr>", (re.search(r"<tbody>(.*?)</tbody>", ls, re.S) or re.search("()", "")).group(1), re.S)]
    P["faq"] = [(text(q), text(a)) for q, a in re.findall(r"<details><summary>(.*?)</summary><p>(.*?)</p></details>", section(s, "faq"), re.S)]
    P["sources"] = [(html.unescape(u), text(t), text(p)) for u, t, p in re.findall(r'<li id="src-\d+"><a href="([^"]+)" rel="noopener">(.*?)</a>\. <span>(.*?)</span></li>', section(s, "sources"), re.S)]
    return P


def lcname(n):
    return n if (n[:2].isupper() or n[0].isdigit()) else n[0].lower() + n[1:]


def post_slug(slug):
    return f"{slug}-explained"


def headline(r, P):
    n = r["name"]
    short = r.get("data", {}).get("short") or n
    ln = lcname(short)
    brand = next((a for a in r["aka_list"] if a and a[0].isupper() and a.lower() != n.lower() and len(a) < 20), None)
    k = r["kind"]
    if k == "rx":
        return f"{short}{f' ({brand})' if brand else ''}: what it treats, side effects, and how to use it safely"
    if k == "otc":
        return f"How much {ln} is safe? Dosing, side effects, and overdose signs"
    if k == "unregulated":
        return f"Is {ln} safe or legal? Effects, risks, and the law in 2026"
    return f"What is {ln}? Effects, dangers, overdose signs, and the law in 2026"


def meta_desc(r, P):
    d = P["quick"]
    if len(d) > 158:
        d = d[:155].rsplit(" ", 1)[0].rstrip(",;:") + "..."
    return d


def takeaways(r, P):
    n = r["name"]
    short = r.get("data", {}).get("short") or n
    sched = SCHED_LABEL[r["sched"]]
    t = []
    status = "not a federally controlled substance" if r["sched"] == "NC" else f"a {sched} controlled substance in the US"
    t.append(f"<strong>What it is:</strong> {esc(short)} is {article(P['eyebrow'].lower())} and {status}.")
    if r["kind"] in ("rx", "otc"):
        t.append(f"<strong>Main uses:</strong> {esc(r['medical'])}.")
    else:
        t.append(f"<strong>Medical use:</strong> {esc(r['medical']) if r['medical'] and r['medical'].lower() != 'none' else 'none accepted in the US'}.")
    on, du = P["snap"].get("Onset"), P["snap"].get("Duration")
    if on and du:
        t.append(f"<strong>Timing:</strong> effects start in {esc(on[0].lower() + on[1:])} and last {esc(du[0].lower() + du[1:])}.")
    if P["inter"]:
        danger = re.compile(r"contraindicated|dangerous|boxed|avoid|do not|fatal", re.I)
        x = next((row for row in P["inter"] if len(row) > 2 and danger.search(row[2])), P["inter"][0])
        t.append(f"<strong>Most dangerous mix:</strong> {esc(x[0])}, which can cause {esc(x[1][0].lower() + x[1][1:])}.")
    nl = P["snap"].get("Naloxone reverses it?")
    if nl:
        t.append(f"<strong>Naloxone:</strong> {esc(naloxone_sentence(nl))}")
    dep = P["snap"].get("Dependence risk")
    if dep:
        t.append(f"<strong>Dependence risk:</strong> {esc(dep)}.")
    t.append("<strong>Legal route:</strong> " + legal_sentence(r, short))
    return t


def article(phrase):
    return ("an " if phrase[:1] in "aeiou" else "a ") + phrase


def naloxone_sentence(v):
    lv = v.lower()
    if lv.startswith("yes"):
        return "it reverses an overdose" + (" (" + v[3:].strip(" ()") + ")." if len(v) > 4 else ".")
    if lv.startswith("partly"):
        return "it partly reverses an overdose" + (" (" + v[6:].strip(" ()") + ")." if len(v) > 7 else ".")
    if lv.startswith("no"):
        return "it does not reverse this drug, but give it whenever opioids could be involved."
    if "reversal agent" in lv:
        return "this is the reversal medicine for opioid overdose."
    return v + "."


def legal_sentence(r, short):
    k, sc = r["kind"], r["sched"]
    n = lcname(short)
    if k == "otc":
        return f"sold without a prescription; follow the Drug Facts label."
    if k == "rx":
        return ("prescription only, filled by a licensed pharmacy." if sc == "NC"
                else "only with a prescription from a DEA-registered clinician, filled by a licensed pharmacy.")
    if sc == "I":
        return "none. Schedule I substances cannot be prescribed."
    if sc == "NC":
        return f"{n} is not federally scheduled as of October 2026, but state bans, FDA restrictions, and pending federal action can apply; check current status."
    return "no approved US product for personal use; possession without a prescription is a crime."


def tbl(head, rows):
    h = "".join(f'<th scope="col">{esc(x)}</th>' for x in head)
    b = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in row) + "</tr>" for row in rows)
    return f'<div class="tbl"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'


def render_post(r, P, related, chrome, search_json):
    R = "../../"
    slug = r["slug"]
    ps = post_slug(slug)
    short = r.get("data", {}).get("short") or r["name"]
    n = lcname(short)
    H = headline(r, P)
    desc = meta_desc(r, P)
    url = f"{SITE}/blog/{ps}/"
    prof = f"{R}drugs/{slug}/"
    cover = f"assets/img/blog/{slug}.png"
    secs = []

    what = P["uses"][:2] if r["kind"] in ("rx", "otc") else (P["uses"][:1] + P["effects"][:1])
    facts_rows = [[a, b] for a, b in P["facts"]][:9]
    secs.append(("what", f"What is {n}?", "".join(f"<p>{x}</p>" for x in what) + "<h3>Quick facts</h3>" + tbl(("Fact", f"{short}"), facts_rows)))

    timing = []
    on, du = P["snap"].get("Onset"), P["snap"].get("Duration")
    hl = next((b for a, b in P["facts"] if a.lower().startswith("half-life")), None)
    if on: timing.append(f"<li><strong>Starts working:</strong> {esc(on)}</li>")
    if du: timing.append(f"<li><strong>Effects last:</strong> {esc(du)}</li>")
    if hl: timing.append(f"<li><strong>Half-life:</strong> {esc(hl)}</li>")
    stay = next((a for q, a in P["faq"] if "system" in q.lower() or "how long" in q.lower() or "detect" in q.lower()), None)
    secs.append(("timing", f"How long does {n} last?", "<ul>" + "".join(timing) + "</ul>" + (f"<p>{esc(stay)}</p>" if stay else "")
                 + "<p>Timing varies with the dose, the form, how it is taken, liver and kidney function, age, and other drugs taken at the same time.</p>"))

    rk = ""
    if P["boxed"]:
        rk += f"<p>The FDA requires boxed warnings, its strongest, on {esc(n)} products, including:</p><ul>" + "".join(f"<li>{x}</li>" for x in P["boxed"][:4]) + "</ul>"
    rk += "".join(f"<p>{x}</p>" for x in P["risks"][:3])
    for wn in P["warns"][:1]:
        rk += f'<p class="warn" role="note"><span>{wn}</span></p>'
    secs.append(("risks", f"What are the biggest risks of {n}?", rk))

    if P["inter"]:
        secs.append(("mixing", f"What should you never mix with {n}?", tbl(P["inter_head"] or ("Combined with", "What happens", "Guidance"), P["inter"][:6])
                     + f'<p>Check any combination with the <a href="{R}interactions/?a={slug}">Dosepedia combination checker</a> or ask a pharmacist.</p>'))

    eh, items = P["emerg"]
    od = "".join(f"<p>{x}</p>" for x in P["overdose"][:1])
    if items:
        od += f'<div class="emerg"><h3>{esc(eh)}</h3><ul>' + "".join(f"<li>{x}</li>" for x in items) + "</ul></div>"
    secs.append(("overdose", f"What are the signs of {article(n + ' overdose')}, and what should you do?", od))

    wd = "".join(f"<p>{x}</p>" for x in P["wd_intro"])
    if P["wd_tl"]:
        wd += '<ol class="tl">' + "".join(f"<li><b>{esc(a)}</b><strong>{esc(b)}</strong><span>{esc(c)}</span></li>" for a, b, c in P["wd_tl"]) + "</ol>"
    secs.append(("stopping", P["wd_h2"], wd + f'<p>See the <a href="{R}withdrawal/?d={slug}">withdrawal timelines</a> and the <a href="{prof}#withdrawal">full {esc(n)} withdrawal guide</a>.</p>'))

    lg = "".join(f"<p>{x}</p>" for x in P["legal"][:1])
    if P["legal_li"]:
        lg += "<ul>" + "".join(f"<li>{x}</li>" for x in P["legal_li"]) + "</ul>"
    if P["intl"]:
        lg += "<h3>Outside the United States</h3>" + tbl(("Country", "Status"), P["intl"])
    secs.append(("legal", f"Is {n} legal?", lg))

    faq = "".join(f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in P["faq"])
    secs.append(("faq", f"Frequently asked questions about {n}", f'<div class="faq">{faq}</div>'))

    src = "".join(f'<li><a href="{attr(u)}" rel="noopener">{esc(t)}</a>, {esc(p.rstrip("."))}.</li>' for u, t, p in P["sources"][:8])
    secs.append(("sources", "Sources", f"<ol>{src}</ol>"))

    toc = "".join(f'<li><a href="#{i}">{esc(h)}</a></li>' for i, h, _ in secs if i not in ("sources",))
    body = "".join(f'<h2 id="{i}">{esc(h)}</h2>{c}' for i, h, c in secs)
    take = "".join(f"<li>{x}</li>" for x in takeaways(r, P))
    rel = "".join(post_card(x, R, small=True) for x in related)
    cta = (f'<div class="cta-row"><a href="{prof}">Full {esc(short)} profile</a><a href="{R}interactions/?a={slug}">Check a combination</a>'
           f'<a href="{R}compare/?a={slug}">Compare drugs</a><a href="{R}overdose/">Overdose help</a></div>')
    wc = len(text(body).split())
    mins = max(3, round(wc / 230))
    main = (f'<div class="hero-sm"><div class="wrap narrow"><nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="{R}">Home</a></li><li><a href="{R}blog/">Blog</a></li><li><a href="{R}blog/#c-{r["cluster"]}">{esc(CLUSTER_LABEL[r["cluster"]])}</a></li><li aria-current="page">{esc(short)}</li></ol></nav>\n'
            f'<p class="eyebrow">{esc(CLUSTER_LABEL[r["cluster"]])} guide &middot; {"Not federally controlled" if r["sched"] == "NC" else SCHED_LABEL[r["sched"]]}</p>'
            f"<h1>{esc(H)}</h1>\n"
            f'<p class="by">By Dosepedia Editorial Team &middot; <time datetime="{DATE}">{DATE_H}</time> &middot; {mins} min read</p><p class="status draft">Draft, awaiting medical review.</p>'
            f'<figure class="post-cover"><img src="{R}{cover}" alt="{attr(short)}: {attr(H)}" width="1200" height="630" fetchpriority="high"></figure></div></div>\n'
            f'<div class="wrap narrow"><article class="post prose">'
            f'<p class="answer"><strong>Short answer:</strong> {esc(P["quick"])}</p>'
            f'<div class="takeaways"><h2>Key takeaways</h2><ul>{take}</ul></div>'
            f'<nav class="post-toc" aria-label="In this guide"><strong>In this guide</strong><ol>{toc}</ol></nav>'
            f"{body}{cta}"
            f'<p class="reviewed">This guide summarizes the sourced <a href="{prof}">Dosepedia {esc(short)} profile</a>, written from FDA labels, DEA rules, and federal health agencies. It is educational and is not medical advice. Last updated {DATE_H}.</p>'
            f'<section class="related" aria-label="Related guides"><h2>Related guides</h2><div class="grid g3">{rel}</div></section>'
            f"</article></div>")

    img_abs = f"{SITE}/{cover}"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BlogPosting", "@id": url, "url": url, "mainEntityOfPage": url, "headline": H, "description": desc,
         "image": {"@type": "ImageObject", "url": img_abs, "width": 1200, "height": 630},
         "datePublished": DATE, "dateModified": DATE, "inLanguage": "en", "articleSection": CLUSTER_LABEL[r["cluster"]],
         "keywords": ", ".join([short] + r["aka_list"][:4] + [CLUSTER_LABEL[r["cluster"]], "side effects", "overdose", "withdrawal", "legal status"]),
         "wordCount": wc,
         "author": {"@type": "Organization", "name": "Dosepedia Editorial Team", "url": f"{SITE}/editorial-policy/"},
         "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE, "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/img/logo.png", "width": 600, "height": 160}},
         "about": {"@type": "Drug", "@id": f"{SITE}/drugs/{slug}/#drug", "name": r["name"], "url": f"{SITE}/drugs/{slug}/"},
         "isBasedOn": f"{SITE}/drugs/{slug}/",
         "citation": [u for u, _, _ in P["sources"]],
         "speakable": {"@type": "SpeakableSpecification", "cssSelector": [".answer", ".takeaways"]}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in P["faq"]]},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Blog", "item": f"{SITE}/blog/"},
            {"@type": "ListItem", "position": 2, "name": CLUSTER_LABEL[r["cluster"]], "item": f"{SITE}/blog/#c-{r['cluster']}"},
            {"@type": "ListItem", "position": 3, "name": H, "item": url}]}]}
    head = chrome.head(R, H, desc, f"blog/{ps}/", image=cover, image_alt=f"{short}: {H}", ld=ld,
                       extra=f'<meta property="article:published_time" content="{DATE}"><meta property="article:section" content="{attr(CLUSTER_LABEL[r["cluster"]])}">\n')
    return head + chrome.body(R, main, nav=None, search_json=search_json), dict(slug=ps, title=H, desc=desc, url=url, cover=cover, words=wc)


def post_card(r, R, small=False):
    P = r["_post"]
    return (f'<a class="card post-card" href="{R}blog/{post_slug(r["slug"])}/" data-cluster="{r["cluster"]}" data-sched="{SCHED_KEY[r["sched"]]}" data-text="{attr(r["data_text"] + " " + P["title"].lower())}">'
            f'<img src="{R}assets/img/blog/{r["slug"]}.png" alt="" width="1200" height="630" loading="lazy" decoding="async">'
            f'<div class="pc-body"><div class="pc-meta">{sched_badge(r["sched"], "xs")}<span>{esc(CLUSTER_LABEL[r["cluster"]])}</span></div>'
            f'<h3>{esc(P["title"])}</h3>' + ("" if small else f'<p>{esc(P["desc"])}</p>') + "</div></a>")


def render_index(base_html, base_drugs_index, recs, chrome, search_json):
    R = "../"
    s = base_html
    filt = re.search(r'<div class="filters" data-filter-root>.*?<p class="fcount".*?</p>\s*</div>', base_drugs_index, re.S).group(0)
    filt = re.sub(r'placeholder="[^"]*"', 'placeholder="Search guides, e.g. Xanax, kratom, withdrawal"', filt)
    filt = re.sub(r"<b data-count>\d+</b> substances shown", f"<b data-count>{len(recs)}</b> guides shown", filt)
    filt = filt.replace('<span class="vh">Filter drugs</span>', '<span class="vh">Filter guides</span>')
    news = re.search(r'<ul class="news">.*?</ul>', s, re.S).group(0)
    groups = "".join(f'<section id="c-{key}" class="letter"><h2>{esc(label)}</h2><div class="grid g3">'
                     + "".join(post_card(r, R) for r in recs if r["cluster"] == key) + "</div></section>" for key, label in CLUSTERS)
    main = (f'<div class="hero-sm"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="{R}">Home</a></li><li aria-current="page">Blog</li></ol></nav>'
            f'<h1>Blog</h1><p class="quick">Plain-language guides to {len(recs)} prescription, over-the-counter, and controlled substances, plus rule changes and safety alerts. Every guide answers the key questions first and links to its sourced profile.</p></div></div>'
            f'<div class="wrap pad"><h2 class="vh">Latest news</h2>{news}<h2 class="mt">Substance guides</h2>{filt}'
            f'<div data-filter-list>{groups}</div><p class="empty" data-empty hidden>No guides match. Try clearing a filter.</p></div>')
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Blog", "@id": f"{SITE}/blog/", "url": f"{SITE}/blog/", "name": "Dosepedia blog", "inLanguage": "en",
         "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE, "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/img/logo.png"}},
         "blogPost": [{"@type": "BlogPosting", "headline": r["_post"]["title"], "url": r["_post"]["url"], "image": f"{SITE}/{r['_post']['cover']}", "datePublished": DATE} for r in recs]},
        {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": r["_post"]["url"]} for i, r in enumerate(recs)]}]}
    head = chrome.head(R, "Blog: Drug Guides, Rule Changes, and Safety Alerts", f"Answer-first guides to {len(recs)} prescription and controlled substances: what they are, risks, interactions, overdose signs, withdrawal, and the law in 2026.",
                       "blog/", og_type="website", image="assets/img/og/pages/blog.png", ld=ld)
    return head + chrome.body(R, main, nav=None, search_json=search_json)


def feed(recs, extra_items):
    now = format_datetime(datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc))
    items = []
    for t, u, d in extra_items:
        items.append(f"<item><title>{esc(t)}</title><link>{u}</link><guid>{u}</guid><pubDate>{now}</pubDate><description>{esc(d)}</description></item>")
    for r in recs:
        P = r["_post"]
        items.append(f'<item><title>{esc(P["title"])}</title><link>{P["url"]}</link><guid>{P["url"]}</guid><pubDate>{now}</pubDate>'
                     f'<category>{esc(CLUSTER_LABEL[r["cluster"]])}</category><description>{esc(P["desc"])}</description>'
                     f'<enclosure url="{SITE}/{P["cover"]}" type="image/png" length="{P.get("cover_bytes", 0)}"/></item>')
    return ('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Dosepedia blog</title>'
            f'<link>{SITE}/blog/</link><atom:link href="{SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>'
            f"<description>Drug guides, law changes, and safety updates</description><language>en-us</language><lastBuildDate>{now}</lastBuildDate>"
            + "".join(items) + "</channel></rss>")


def llms_txt(recs):
    lines = ["# Dosepedia", "",
             "> Independent, educational reference on prescription and controlled substances in the United States. Plain-language profiles written from primary sources (FDA prescribing information, DEA rules and the Federal Register, NIDA, CDC). Dosepedia sells nothing and does not give personal medical advice. Emergency: call 911; Poison Help 1-800-222-1222; SAMHSA helpline 1-800-662-4357.", "",
             "Profiles are drafts pending medical review; facts are current as of October 2026.", "",
             "## Tools", f"- [Drugs A to Z]({SITE}/drugs/): all {len(recs)} profiles", f"- [Combination checker]({SITE}/interactions/)", f"- [Compare drugs]({SITE}/compare/)",
             f"- [Overdose help]({SITE}/overdose/)", f"- [Withdrawal timelines]({SITE}/withdrawal/)", f"- [Legal status and US schedules]({SITE}/legal-status/)", f"- [Glossary]({SITE}/glossary/)", ""]
    for key, label in CLUSTERS:
        lines.append(f"## {label}")
        for r in recs:
            if r["cluster"] == key:
                lines.append(f"- [{r['name']}]({SITE}/drugs/{r['slug']}/): {r['desc']} Guide: {SITE}/blog/{post_slug(r['slug'])}/")
        lines.append("")
    lines += ["## About", f"- [Editorial policy]({SITE}/editorial-policy/)", f"- [Medical review team]({SITE}/medical-review-team/)", f"- [Blog]({SITE}/blog/)", ""]
    return "\n".join(lines)
