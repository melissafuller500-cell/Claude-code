"""Rebrand Dosepedia -> DoseUses and apply the SEO fixes to a built copy of the site.

usage: python3 -I build_doseuses.py <site_dir>   (edits files in place)
"""
import glob
import html
import json
import os
import re
import sys

ROOT = sys.argv[1]
os.chdir(ROOT)

# Brand names people actually search, mapped to the profile they belong to.
PRIORITY_BRANDS = {
    "hydrocodone": ["Norco", "Vicodin"],
    "oxycodone": ["OxyContin", "Percocet"],
}
NOT_BRANDS = {"DXM", "Lean"}
SEARCHED = ("Xanax Adderall Valium Klonopin Ativan Ambien Percocet Vicodin Norco OxyContin Ultram "
            "Suboxone Ritalin Vyvanse Focalin Lyrica Neurontin Soma Provigil Spravato").split()

FONT_FACE = (
    "@font-face{font-family:'Atkinson Hyperlegible Next';font-style:normal;font-weight:400 800;font-display:optional;"
    "src:url({p}assets/fonts/atkinson-hyperlegible-next.woff2) format('woff2')}"
    "@font-face{font-family:'Fraunces';font-style:normal;font-weight:500 700;font-display:optional;"
    "src:url({p}assets/fonts/fraunces.woff2) format('woff2')}"
)
GOOGLE_FONTS = re.compile(
    r'<link rel="preconnect" href="https://fonts.googleapis.com">\s*'
    r'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\s*'
    r'<link rel="stylesheet" href="https://fonts.googleapis.com/css2[^"]*">'
)


def prefix_for(path):
    depth = path.count("/")
    return "../" * depth if depth else "./"


def set_title(s, new):
    old = re.search(r"<title>(.*?)</title>", s).group(1)
    old_core = old.rsplit(" | ", 1)[0]
    new_core = new.rsplit(" | ", 1)[0]
    s = s.replace(f"<title>{old}</title>", f"<title>{new}</title>", 1)
    for attr in ('property="og:title"', 'name="twitter:title"'):
        s = re.sub(rf'(<meta {attr} content=")[^"]*(")', lambda m: m.group(1) + new_core + m.group(2), s)
    return s.replace(f'"headline":"{old_core}"', f'"headline":"{new_core}"')


def set_description(s, new):
    old = re.search(r'<meta name="description" content="([^"]*)"', s).group(1)
    return s.replace(f'"{old}"', f'"{new}"').replace(f'content="{old}"', f'content="{new}"')


def set_h1(s, new_inner):
    return re.sub(r"<h1>(.*?)</h1>", lambda m: f"<h1>{new_inner}</h1>", s, count=1)


# ---------- drug pages ----------
def drug_brand(s, slug):
    title = re.search(r"<title>(.*?)</title>", s).group(1)
    alt = re.search(r'"alternateName":(\[[^\]]*\])', s)
    alt = json.loads(alt.group(1)) if alt else []
    if '"prescriptionStatus"' not in s or not alt:
        return None, title
    if slug in PRIORITY_BRANDS:
        return PRIORITY_BRANDS[slug], title
    m = re.match(r"[^(]+\(([^)]+)\)", title)
    if m:
        first = m.group(1).split(",")[0].strip()
        if first in alt and first not in NOT_BRANDS:
            return [first], title
    hit = [b for b in SEARCHED if b in alt]
    return (hit[:1] or None), title


def heading_rules(B, BX):
    """B = brand label or None; returns (regex, builder(x)) pairs for H2 text."""
    cap = lambda x: x[:1].upper() + x[1:]
    lead = lambda x: B if B else cap(x)
    full = lambda x: BX(x) if B else x
    return [
        (r"What is (.+) used for\?", lambda x: f"{lead(x)} uses: what {x} is prescribed for" if B else f"{cap(x)} uses: what it is used for"),
        (r"How is (.+) usually prescribed\?", lambda x: f"{lead(x)} dosage: how {x} is usually prescribed" if B else f"{cap(x)} dosage: how it is usually prescribed"),
        (r"What are the risks and side effects of (.+)\?", lambda x: f"{cap(full(x))} side effects and risks"),
        (r"What are the risks of (.+)\?", lambda x: f"{cap(full(x))} side effects and risks"),
        (r"What should not be mixed with (.+)\?", lambda x: f"{lead(x)} interactions: what not to mix with {x}" if B else f"{cap(x)} interactions: what not to mix with it"),
        (r"What is dangerous to mix with (.+)\?", lambda x: f"{lead(x)} interactions: what is dangerous to mix with {x}" if B else f"{cap(x)} interactions: what is dangerous to mix with it"),
        (r"What does (?:a )?(.+) overdose look like\?", lambda x: f"{lead(x)} overdose: signs of {x} overdose and what to do" if B else f"{cap(x)} overdose: signs and what to do"),
        (r"What is (.+) withdrawal like, and how long does it last\?", lambda x: f"{lead(x)} withdrawal timeline: how long {x} withdrawal lasts" if B else f"{cap(x)} withdrawal timeline: symptoms and how long it lasts"),
        (r"What are the effects of (.+), and how long do they last\?", lambda x: f"{cap(full(x))} effects and how long they last"),
        (r"How do you get (.+) legally in the US\?", lambda x: f"How to get prescribed {full(x)} legally in the US"),
        (r"Can you order (.+) online\?", lambda x: f"Can you order {full(x)} online legally?"),
        (r"Is (.+) legal in other countries\?", lambda x: f"Is {B} legal? {cap(x)} legal status in other countries" if B else f"{cap(x)} legal status in other countries"),
        (r"Is (.+) legal in the US\?", lambda x: f"Is {full(x)} legal in the US? Schedule and legal status"),
        (r"Is (.+) addictive\?", lambda x: f"Is {full(x)} addictive?"),
        (r"Common questions about (.+)", lambda x: f"Common questions about {full(x)}"),
        (r"(.+) at a glance", lambda x: f"{cap(full(x))} at a glance: schedule, half-life, and class"),
    ]


def drug_page(path, s, stats):
    slug = path.split("/")[1]
    brands, old_title = drug_brand(s, slug)
    B = brands[0] if brands else None
    BT = ", ".join(brands) if brands else None
    BX = (lambda x: f"{B} ({x})") if B else (lambda x: x)

    m = re.match(r"(.+?) \((.+?)\): Uses, Risks, Withdrawal, How to Get It Legally \| Dosepedia$", old_title)
    if m:
        generic = m.group(1)
        s = set_title(s, f"{BT} ({generic}): Uses, Dosage, Side Effects, Withdrawal | DoseUses")
        s = set_description(
            s,
            f"{BT} ({generic.lower()}) uses, dosage, side effects, withdrawal timeline, interactions with alcohol "
            f"and other drugs, half-life, overdose signs, and US schedule and prescription rules.",
        )
        stats["titles"] += 1

    rules = heading_rules(B, BX)
    has_halflife = "Half-life" in s

    def fix_h2(mh):
        attrs, inner = mh.group(1), mh.group(2)
        if "<" in inner:
            return mh.group(0)
        text = html.unescape(inner)
        for rx, build in rules:
            mm = re.fullmatch(rx, text)
            if mm:
                new = build(mm.group(1))
                if rx.endswith("at a glance") and not has_halflife:
                    new = new.replace(": schedule, half-life, and class", "")
                stats["h2"] += 1
                return f"<h2{attrs}>{html.escape(new, quote=False)}</h2>"
        return mh.group(0)

    s = re.sub(r"<h2([^>]*)>(.*?)</h2>", fix_h2, s)
    s = s.replace(">Dosing</a>", ">Dosage</a>")

    # FAQ questions carry the brand name too (visible <summary> and FAQPage schema stay in sync).
    if B:
        generic_name = re.search(r'"nonProprietaryName":"([^"]+)"', s)
        alt_names = json.loads(re.search(r'"alternateName":(\[[^\]]*\])', s).group(1))
        names = {generic_name.group(1), generic_name.group(1).lower()} if generic_name else set()
        for q in set(re.findall(r"<summary>(.*?)</summary>", s)):
            for n in sorted(names, key=len, reverse=True):
                if re.search(rf"\b{re.escape(n)}\b", q) and not any(b in q for b in alt_names):
                    nq = re.sub(rf"\b{re.escape(n)}\b", f"{B} ({n})", q, count=1)
                    s = s.replace(f"<summary>{q}</summary>", f"<summary>{nq}</summary>")
                    s = s.replace(f'"name":"{q}"', f'"name":"{nq}"')
                    stats["faq"] += 1
                    break
    return s


# ---------- hub pages ----------
def class_brands():
    out = {}
    for f in glob.glob("drugs/*/index.html"):
        s = open(f, encoding="utf-8").read()
        cl = re.search(r'href="\.\./\.\./class/([^/]+)/"', s)
        alt = re.search(r'"alternateName":(\[[^\]]*\])', s)
        if cl and alt:
            for b in json.loads(alt.group(1)):
                if b in SEARCHED:
                    out.setdefault(cl.group(1), []).append(b)
    return {k: sorted(v, key=SEARCHED.index) for k, v in out.items()}


CLASS_LABEL = {
    "benzodiazepines-sedatives": ("Benzodiazepines List", "Benzodiazepines and sedatives list"),
    "opioids": ("Opioids List", "Opioids list"),
    "stimulants": ("Stimulants List", "Stimulants list"),
    "gabapentinoids-dissociatives": ("Gabapentinoids and Dissociatives List", "Gabapentinoids, dissociatives, and others list"),
    "cannabis-psychedelics": ("Cannabis and Psychedelics List", "Cannabis and psychedelics list"),
    "anabolic-steroids": ("Anabolic Steroids List", "Anabolic steroids list"),
    "emerging": ("Emerging and Unscheduled Substances List", "Emerging and unscheduled substances list"),
}
ROMAN = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5"}


def hub_page(path, s, cb):
    parts = path.split("/")
    if path == "index.html":
        s = set_title(s, "DoseUses: Drug Uses, Dosage, Side Effects and Withdrawal")
        s = set_description(
            s,
            "Look up drug uses, dosage, side effects, withdrawal timelines, interactions, overdose signs, half-life, "
            "and legal status for Xanax, Adderall, oxycodone, and 100+ more prescription and controlled substances.",
        )
        s = set_h1(s, "Drug uses, dosage, side effects, and withdrawal, <em>clearly sourced</em>.")
        s = s.replace(
            '<p class="lede">Uses, risks, interactions, overdose, withdrawal, and the law for 106 prescription and controlled substances. Written in plain language from FDA labels, DEA rules, and clinical guidelines.</p>',
            '<p class="lede">Drug uses, dosage, side effects, interactions, overdose, withdrawal, and the law for 106 prescription and controlled substances, including Xanax, Adderall, and oxycodone. Every fact is clearly sourced from FDA labels, DEA rules, and clinical guidelines and written in plain language.</p>',
        )
        s = re.sub(r'(<section class="stats">.*?</section>)', lambda m: re.sub(r"<b>(\d+)</b>", r'<data value="\1">\1</data>', m.group(1)), s, flags=re.S)
        s = s.replace(".stats b{", ".stats data{")
    elif path == "drugs/index.html":
        s = set_title(s, "Controlled Substances List: 106 Drugs A to Z, Brand and Generic | DoseUses")
        s = set_h1(s, "Drugs A to Z: controlled substances list")
    elif path == "interactions/index.html":
        s = set_title(s, "Drug Interaction Checker: Is It Safe to Mix? | DoseUses")
        s = set_h1(s, "Drug interaction checker")
    elif path == "legal-status/index.html":
        s = set_title(s, "Drug Schedules Explained: US Legal Status, Updated for 2026 | DoseUses")
        s = set_h1(s, "Drug schedules explained: US legal status")
    elif parts[0] == "class" and parts[1] in CLASS_LABEL:
        t, h = CLASS_LABEL[parts[1]]
        brands = cb.get(parts[1], [])[:4]
        tail = ", ".join(brands) + " and More" if brands else "Uses, Risks, and Legal Status"
        s = set_title(s, f"{t}: {tail} | DoseUses")
        s = set_h1(s, h)
    elif parts[0] == "schedules":
        sch = parts[1].replace("schedule-", "")
        if sch in ROMAN:
            R = sch.upper()
            s = set_title(s, f"Schedule {R} Drugs List (Schedule {ROMAN[sch]}): Examples, Rules, Penalties | DoseUses")
            s = set_h1(s, f"Schedule {R} drugs list (Schedule {ROMAN[sch]})")
        else:
            s = set_title(s, "Drugs Not Federally Controlled: Examples, Rules, and Penalties | DoseUses")
    return s


# ---------- site-wide ----------
def common(path, s):
    p = prefix_for(path)
    s = s.replace("Dose<b>pedia</b>", "Dose<i>Uses</i>")
    s = s.replace(".mark b{color:var(--brand);font-weight:inherit}", ".mark i{color:var(--brand);font-weight:inherit;font-style:normal}")
    s = s.replace("dosepedia.com", "doseuses.com").replace("Dosepedia", "DoseUses")

    if path != "404.html":
        s = s.replace('<meta name="robots" content="noindex,follow">', '<meta name="robots" content="index,follow,max-image-preview:large">')

    s, n = GOOGLE_FONTS.subn(
        f'<link rel="preload" href="{p}assets/fonts/atkinson-hyperlegible-next.woff2" as="font" type="font/woff2" crossorigin>\n'
        f'<link rel="preload" href="{p}assets/fonts/fraunces.woff2" as="font" type="font/woff2" crossorigin>',
        s,
    )
    if n:
        s = s.replace("<style>", "<style>" + FONT_FACE.replace("{p}", p), 1)

    if 'href="/favicon.ico"' not in s and "favicon.ico" not in s:
        s = s.replace('<link rel="icon" ', f'<link rel="icon" href="{p if path != "404.html" else "/"}favicon.ico" sizes="48x48">\n<link rel="icon" ', 1)

    # Footer column labels are not page topics: keep them out of the H2 outline.
    def foot(m):
        return m.group(0).replace("<h2>", '<p class="fh">').replace("</h2>", "</p>")
    s = re.sub(r'<footer class="foot">.*?</footer>', foot, s, flags=re.S)
    s = s.replace(".foot h2{", ".foot .fh{")
    return s


def main():
    stats = {"titles": 0, "h2": 0, "faq": 0, "files": 0}
    cb = class_brands()
    for f in sorted(glob.glob("**/*", recursive=True)):
        if os.path.isdir(f) or not f.endswith((".html", ".xml", ".txt", ".webmanifest")):
            continue
        s = open(f, encoding="utf-8").read()
        o = s
        if f.endswith(".html"):
            if f.startswith("drugs/") and f != "drugs/index.html":
                s = drug_page(f, s, stats)
            s = hub_page(f, s, cb)
            s = common(f, s)
        else:
            s = s.replace("dosepedia.com", "doseuses.com").replace("Dosepedia", "DoseUses")
        if s != o:
            open(f, "w", encoding="utf-8").write(s)
            stats["files"] += 1
    print(stats)


main()
