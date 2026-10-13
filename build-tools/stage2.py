"""Stage 2 for the DoseUses build: dropdown header with current-page state, price section and
"without a prescription" FAQ on prescription substance pages, contact email.

usage: python3 -I stage2.py <site_dir> <alprazolam.json>
"""
import glob
import html
import json
import os
import re
import sys

ROOT, ALP = sys.argv[1], sys.argv[2]
os.chdir(ROOT)
MARK = "<!-- nav:v2 -->"

CLUSTERS = [
    ("Opioids", "class/opioids/"),
    ("Benzodiazepines and sedatives", "class/benzodiazepines-sedatives/"),
    ("Stimulants", "class/stimulants/"),
    ("Gabapentinoids, dissociatives, and others", "class/gabapentinoids-dissociatives/"),
    ("Cannabis and psychedelics", "class/cannabis-psychedelics/"),
    ("Anabolic steroids", "class/anabolic-steroids/"),
    ("Emerging and unscheduled substances", "class/emerging/"),
]
NAV = [
    ("drugs", "Drugs A to Z", "drugs/", [("All drugs A to Z", "drugs/")] + CLUSTERS, ("drugs/", "class/")),
    ("interactions", "Interactions", "interactions/", None, ("interactions/",)),
    ("compare", "Compare", "compare/", None, ("compare/",)),
    ("withdrawal", "Withdrawal", "withdrawal/", None, ("withdrawal/",)),
    ("legal", "Legal status", "legal-status/", [
        ("Drug schedules explained", "legal-status/"),
        ("Schedule I drugs", "schedules/schedule-i/"),
        ("Schedule II drugs", "schedules/schedule-ii/"),
        ("Schedule III drugs", "schedules/schedule-iii/"),
        ("Schedule IV drugs", "schedules/schedule-iv/"),
        ("Schedule V drugs", "schedules/schedule-v/"),
        ("Not federally controlled", "schedules/not-federally-controlled/"),
    ], ("legal-status/", "schedules/")),
    ("guides", "Guides", "blog/", [
        ("Blog", "blog/"),
        ("Telehealth rules for 2026", "blog/telehealth-controlled-medicines-2026/"),
        ("Glossary", "glossary/"),
        ("About us", "about/"),
        ("Editorial policy", "editorial-policy/"),
        ("Medical review team", "medical-review-team/"),
        ("Contact", "contact/"),
    ], ("blog/", "glossary/", "about/", "editorial-policy/", "medical-review-team/", "contact/")),
]
CHEVRON = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>')
SOS = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
       'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-4 3 8 2-4h7"/></svg>')

NAV_CSS = (
    ".nv{position:relative;display:flex;align-items:center}"
    ".nv-t{display:grid;place-items:center;width:1.6rem;height:1.6rem;margin-left:-.45rem;padding:0;border:0;border-radius:50%;"
    "background:none;color:var(--muted);cursor:pointer}"
    ".nv-t:hover,.nv-t:focus-visible{background:var(--tint-2);color:var(--brand)}"
    ".nv-t svg{transition:transform .2s}.nv.open>.nv-t svg{transform:rotate(180deg)}"
    ".top nav a.on{background:var(--tint);color:var(--brand);font-weight:700}"
    ".sub{display:none;flex-direction:column;position:absolute;top:calc(100% + .45rem);left:0;min-width:16rem;padding:.4rem;"
    "background:var(--surface);border:1px solid var(--rule);border-radius:12px;box-shadow:var(--shadow-lg);z-index:40}"
    ".sub::before{content:\"\";position:absolute;left:0;right:0;top:-.5rem;height:.5rem}"
    ".top nav .sub a{border-radius:8px;padding:.5rem .75rem;font-size:.93rem;font-weight:400}"
    ".top nav .sub a[aria-current]{font-weight:700}"
    ".top nav .sub a[aria-current]::before{content:\"\";display:inline-block;width:.4rem;height:.4rem;margin-right:.5rem;"
    "border-radius:50%;background:var(--brand);vertical-align:middle}"
    ".nv.open>.sub{display:flex}"
    "@media (hover:hover) and (min-width:901px){.nv:hover>.sub{display:flex}.nv:hover>.nv-t svg{transform:rotate(180deg)}}"
    "@media (max-width:900px){.nv{flex-wrap:wrap}.nv>a{flex:1}.nv-t{width:2.4rem;height:2.4rem;margin:0}"
    ".sub{position:static;flex-basis:100%;min-width:0;margin:0 0 .25rem .75rem;padding:0 0 0 .5rem;border:0;"
    "border-left:2px solid var(--rule);border-radius:0;box-shadow:none}.sub::before{display:none}}"
)
NAV_JS = (
    "<script>(function(){var d=document;function all(s){return [].slice.call(d.querySelectorAll(s))}"
    "function shut(x){x.classList.remove('open');x.querySelector('.nv-t').setAttribute('aria-expanded','false')}"
    "all('.nv-t').forEach(function(b){b.addEventListener('click',function(){var n=b.parentNode,o=!n.classList.contains('open');"
    "all('.nv.open').forEach(shut);if(o){n.classList.add('open');b.setAttribute('aria-expanded','true')}})});"
    "d.addEventListener('click',function(e){if(!e.target.closest('.nv,.menu'))all('.nv.open').forEach(shut)});"
    "d.addEventListener('keydown',function(e){if(e.key==='Escape'){var o=d.querySelector('.nv.open');if(o){shut(o);o.querySelector('.nv-t').focus()}}});"
    "if(matchMedia('(max-width:900px)').matches){var h=d.querySelector('.nv .sub [aria-current]');"
    "if(h){var n=h.closest('.nv');n.classList.add('open');n.querySelector('.nv-t').setAttribute('aria-expanded','true')}}"
    "})();</script>"
)


def url_of(path):
    return "" if path == "index.html" else path[: -len("index.html")]


def build_nav(path, p, extra_on):
    here = url_of(path)
    out = []
    for key, label, href, sub, prefixes in NAV:
        in_section = any(here.startswith(x) for x in prefixes)
        cur = ' aria-current="page"' if here == href else (' class="on"' if in_section else "")
        top = f'<a href="{p}{href}"{cur}>{label}</a>'
        if not sub:
            out.append(top)
            continue
        items = []
        for sl, sh in sub:
            if sh == here:
                a = ' aria-current="page"'
            elif sh == extra_on:
                a = ' aria-current="true"'
            else:
                a = ""
            items.append(f'<a href="{p}{sh}"{a}>{sl}</a>')
        out.append(
            f'<div class="nv">{top}<button type="button" class="nv-t" aria-expanded="false" aria-controls="sub-{key}">'
            f'<span class="vh">Show {label} pages</span>{CHEVRON}</button>'
            f'<div class="sub" id="sub-{key}">{"".join(items)}</div></div>'
        )
    cur = ' aria-current="page"' if here == "overdose/" else ""
    out.append(f'<a class="sos" href="{p}overdose/"{cur}>{SOS}Overdose help</a>')
    return f'<nav id="nav-main" aria-label="Main">{"".join(out)}</nav>'


def prefix_for(path):
    depth = path.count("/")
    return "../" * depth if depth else "./"


# ---------- substance template additions ----------
FENTANYL_CLUSTERS = {"opioids", "benzodiazepines-sedatives", "stimulants"}


def src_num(s, needle):
    for n, href in re.findall(r'<li id="src-(\d+)"><a href="([^"]+)"', s):
        if needle in href:
            return n
    return None


def cite(n):
    return f'<sup><a href="#src-{n}" aria-label="Source {n}">[{n}]</a></sup>' if n else ""


def add_faq(s, question, answer, after_re=None):
    det = f"<details><summary>{html.escape(question, quote=False)}</summary><p>{html.escape(answer, quote=False)}</p></details>"
    m = re.search(r'(<section id="faq">.*?<div class="faq">)(.*?)(</div></section>)', s, re.S)
    if not m:
        return s, False
    body = m.group(2)
    pos = None
    if after_re:
        mm = re.search(after_re, body)
        if mm:
            pos = body.find("</details>", mm.end()) + len("</details>")
    body = body[:pos] + det + body[pos:] if pos else body + det
    s = s[: m.start(2)] + body + s[m.end(2):]

    def upd(mj):
        data = json.loads(mj.group(1))
        for node in data["@graph"]:
            if node.get("@type") == "FAQPage":
                qs = node["mainEntity"]
                idx = len(qs)
                if after_re:
                    for i, q in enumerate(qs):
                        if re.search(after_re.replace("<summary>", ""), q["name"]):
                            idx = i + 1
                qs.insert(idx, {"@type": "Question", "name": question, "acceptedAnswer": {"@type": "Answer", "text": answer}})
        return '<script type="application/ld+json">' + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "</script>"

    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', upd, s, count=1, flags=re.S)
    return s, True


def add_source(s, title, publisher, href):
    nums = [int(n) for n in re.findall(r'<li id="src-(\d+)">', s)]
    n = max(nums) + 1
    li = (f'<li id="src-{n}"><a href="{html.escape(href)}" rel="noopener">{html.escape(title)}</a>. '
          f'<span>{html.escape(publisher)}.</span></li>')
    i = s.find("</ol></section>", s.find('<section id="sources">'))
    s = s[:i] + li + s[i:]
    s = re.sub(r'("citation":\[[^\]]*)\]', lambda m: m.group(1) + f',"{href}"]', s, count=1)
    return s, n


def inline(t, offset_map):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return re.sub(r"\[\[(\d+)\]\]", lambda m: cite(offset_map.get(m.group(1))), t)


def blocks_html(blocks, offset_map):
    out = []
    for b in blocks:
        if "p" in b:
            out.append(f"<p>{inline(b['p'], offset_map)}</p>")
        elif "ul" in b:
            out.append("<ul>" + "".join(f"<li>{inline(i, offset_map)}</li>" for i in b["ul"]) + "</ul>")
        elif "warn" in b:
            out.append(f'<p class="warn" role="note"><strong>Warning:</strong> {inline(b["warn"], offset_map)}</p>')
        elif "table" in b:
            t = b["table"]
            head = "".join(f'<th scope="col">{inline(h, offset_map)}</th>' for h in t["head"])
            rows = "".join("<tr>" + "".join(f"<td>{inline(c, offset_map)}</td>" for c in r) + "</tr>" for r in t["rows"])
            out.append(f'<div class="tbl"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>')
    return "".join(out)


def generic_price(B, x, sched, cost, besafe):
    label = f"{B} ({x})" if B else x
    lead = B or x[:1].upper() + x[1:]
    parts = []
    if cost:
        parts.append(f"<p>{cost[:1].upper() + cost[1:]}</p>")
    parts.append(
        "<p>What you pay depends on the strength, the number of doses, your insurance plan, and the pharmacy. "
        "Cash prices for the same prescription can differ several times over between pharmacies in the same town, "
        "so check current prices before you fill it.</p>"
    )
    mail = ("Check your insurer's mail-order pharmacy, which may charge a lower copay."
            if sched == "Schedule II" else
            "Ask about a 90-day supply or your insurer's mail-order pharmacy, which often lowers the cost per dose when your prescriber agrees it is appropriate.")
    parts.append(
        "<p><strong>Ways to pay less, legally:</strong></p><ul>"
        f"<li>Ask the prescriber whether a generic {html.escape(x)} is available. FDA-approved generics work the same way as the brand and usually cost much less.</li>"
        "<li>Compare cash prices between pharmacies before you fill the prescription.</li>"
        "<li>Use a free prescription discount card, such as GoodRx or SingleCare, when you pay cash. These cards cannot be combined with insurance on the same fill.</li>"
        "<li>For brand-name medicines, check the manufacturer's savings program or patient assistance program.</li>"
        f"<li>{mail}</li></ul>"
    )
    parts.append(
        '<p class="warn" role="note"><strong>Warning:</strong> A price far below what licensed pharmacies charge, '
        "especially with no prescription required, is a strong sign of an illegal seller and counterfeit medicine."
        f"{cite(besafe)}</p>"
    )
    h2 = f"{lead} price: how much does {html.escape(label)} cost without insurance?"
    return f'<section id="price"><h2>{h2}</h2>{"".join(parts)}</section>'


def no_rx_answer(B, x, sched, cluster):
    label = f"{B} ({x})" if B else x
    route = ("The legal route is a visit with a licensed clinician, in person or by telehealth, and a prescription "
             "filled at a state-licensed pharmacy. The FDA's BeSafeRx tool and the NABP's safe pharmacy list help "
             "confirm an online pharmacy is real.")
    if sched.startswith("Schedule"):
        risk = ("the DEA warns that pills sold this way are often counterfeit and can contain fentanyl"
                if cluster in FENTANYL_CLUSTERS else
                "the FDA warns that products sold this way are often counterfeit, contaminated, or the wrong strength")
        return (f"No. {label} is a {sched} controlled substance in the US, so it is illegal to buy or possess it "
                f"without a valid prescription. Websites and social media sellers that offer it without one are not "
                f"legal pharmacies, and {risk}. {route}")
    return (f"No. {label} is a prescription-only medicine in the US, and a pharmacy may dispense it only with a "
            f"valid prescription. The FDA warns that websites selling prescription medicines without one are often "
            f"illegal and that their products can be counterfeit, contaminated, or the wrong strength. {route}")


def substance(path, s, alp, stats):
    if '"prescriptionStatus":"https://schema.org/PrescriptionOnly"' not in s or 'id="legal-access"' not in s:
        return s
    if 'id="price"' in s:
        return s
    sched = re.search(r'"legalStatus":\{"@type":"DrugLegalStatus","name":"([^"]+)"', s).group(1)
    x = re.search(r'"nonProprietaryName":"([^"]+)"', s).group(1).lower()
    cl = re.search(r'href="\.\./\.\./class/([^/]+)/"', s)
    cluster = cl.group(1) if cl else ""
    hm = re.search(r"<h2>Common questions about (.+?) \((.+?)\)</h2>", s)
    B = hm.group(1) if hm else None
    cm = re.search(r"<li><strong>Cost:</strong> (.*?)</li>", s)
    cost = cm.group(1) if cm else ""
    besafe = src_num(s, "besaferx")

    if path == "drugs/alprazolam/index.html":
        src = alp["sources"]
        s, n12 = add_source(s, src[-1][0], src[-1][1], src[-1][2])
        own = {str(i + 1): src_num(s, row[2].split("?")[0][:60]) for i, row in enumerate(src)}
        own["12"] = str(n12)
        sec = next(t for t in alp["sections"] if t["id"] == "price")
        h2 = "Xanax price: how much does Xanax (alprazolam) cost without insurance?"
        price = f'<section id="price"><h2>{h2}</h2>{blocks_html(sec["blocks"], own)}</section>'
        cost_q = dict(alp["faq"]).get("How much does alprazolam cost without insurance?")
    else:
        price = generic_price(B, x, sched, cost, besafe)
        cost_q = None

    i = s.find('<section id="legal-status">')
    if i < 0:
        i = s.find('<section id="faq">')
    s = s[:i] + price + s[i:]
    s = s.replace('<li><a href="#legal-status">', '<li><a href="#price">Price</a></li><li><a href="#legal-status">', 1)
    s = s.replace('<a class="chip" href="#legal-status">', '<a class="chip" href="#price">Price</a><a class="chip" href="#legal-status">', 1)
    stats["price"] += 1

    label = f"{B} ({x})" if B else x
    q = f"Can you buy {label} without a prescription?"
    old = re.search(r"<summary>(Can you (?:buy|purchase|get) [^<]*without a prescription\?)</summary>", s)
    if old:
        s = s.replace(f"<summary>{old.group(1)}</summary>", f"<summary>{html.escape(q, quote=False)}</summary>")
        s = s.replace(f'"name":"{old.group(1)}"', f'"name":"{q}"')
    else:
        s, ok = add_faq(s, q, no_rx_answer(B, x, sched, cluster), after_re=r"<summary>Can you (?:buy|order) [^<]*online")
    stats["faq"] += 1
    if cost_q:
        s, _ = add_faq(s, f"How much does {label} cost without insurance?", cost_q, after_re=r"<summary>Can you buy [^<]*without a prescription")
    return s


def main():
    alp = json.load(open(ALP, encoding="utf-8"))
    stats = {"nav": 0, "price": 0, "faq": 0}
    for f in sorted(glob.glob("**/*.html", recursive=True)):
        s = open(f, encoding="utf-8").read()
        if MARK in s:
            continue
        p = prefix_for(f) if f != "404.html" else "/"
        extra = None
        if f.startswith("drugs/") and f != "drugs/index.html":
            cl = re.search(r'href="\.\./\.\./class/([^/]+)/"', s)
            extra = f"class/{cl.group(1)}/" if cl else None
            s = substance(f, s, alp, stats)
        s, n = re.subn(r'<nav id="nav-main" aria-label="Main">.*?</nav>', lambda m: build_nav(f, p, extra), s, count=1, flags=re.S)
        if n:
            s = s.replace("</style>", NAV_CSS + "</style>", 1)
            s = s.replace("</body>", NAV_JS + MARK + "\n</body>", 1)
            stats["nav"] += 1
        open(f, "w", encoding="utf-8").write(s)
    php = open("contact.php", encoding="utf-8").read()
    open("contact.php", "w", encoding="utf-8").write(php.replace("const CONTACT_TO = 'contact@doseuses.com';", "const CONTACT_TO = 'doseuses@gmail.com';"))
    print(stats)


main()
