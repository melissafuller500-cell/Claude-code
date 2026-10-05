"""Unified summary records for all drugs (existing profiles parsed from the base site + new data)."""
import html
import json
import re

from dp import BASE, CLUSTER_LABEL, SCHED_FROM_KEY, KIND_FROM_LABEL, KINDS, SCHED_LABEL, first_sentence
from data import opioids, sedatives, stimulants, others, psychedelics, steroids, emerging

NEW_MODULES = [opioids, sedatives, stimulants, others, psychedelics, steroids, emerging]

# Extra interaction groups for existing drugs (used by the combination checker)
EXTRA_GROUPS = {"methadone": ["qt"]}


def unesc(s):
    return html.unescape(s)


def page_data(path):
    s = (BASE / path).read_text()
    m = re.search(r'<script type="application/json" id="page-data">(.*?)</script>', s, re.S)
    return json.loads(m.group(1))


def existing():
    s = (BASE / "drugs/index.html").read_text()
    pd = {x["slug"]: x for x in page_data("interactions/index.html")["items"]}
    types = {}
    for f in (BASE / "class").glob("*/index.html"):
        for m in re.finditer(r'<tr><td><a href="\.\./\.\./drugs/([^/]+)/">[^<]*</a></td><td>([^<]*)</td><td>([^<]*)</td><td>.*?</td><td>([^<]*)</td></tr>', f.read_text()):
            types[m.group(1)] = (unesc(m.group(2)), unesc(m.group(3)), unesc(m.group(4)))
    out = []
    for m in re.finditer(r'<a class="card drug" href="\.\./drugs/([^/]+)/" data-cluster="([^"]+)" data-sched="([^"]+)" data-kind="([^"]+)" data-text="([^"]*)">.*?<h3>(.*?)</h3><p class="brands">(.*?)</p><p>(.*?)</p>', s, re.S):
        slug, cl, sk, kind, text, name, brands, desc = m.groups()
        p = pd[slug]
        aka_full, typ, medical = types.get(slug, (p["aka"], "", p["medical"]))
        out.append(dict(slug=slug, name=unesc(name), cluster=cl, sched=SCHED_FROM_KEY[sk], kind=kind, data_text=unesc(text),
                        brands=unesc(brands), desc=unesc(desc), aka=p["aka"], aka_list=[a.strip() for a in p["aka"].split(",")],
                        type=typ or p.get("type", ""), medical=p["medical"], onset=p["onset"], duration=p["duration"],
                        half_life=p["half_life"], naloxone=p["naloxone"], dependence=p["dependence"],
                        groups=p["groups"] + EXTRA_GROUPS.get(slug, []), new=False))
    return out


def new_records():
    out = []
    for mod in NEW_MODULES:
        for d in mod.DRUGS:
            aka_all = d["aka"] + d.get("street", [])
            out.append(dict(slug=d["slug"], name=d["name"], cluster=d["cluster"], sched=d["sched"], kind=d["kind"],
                            data_text=" ".join([d["name"]] + aka_all).lower() + " ",
                            brands=", ".join(aka_all[:3]), desc=first_sentence(d["quick"]), aka=", ".join(d["aka"][:3]),
                            aka_list=aka_all, type=d["cls"], medical=d["medical"], onset=d["snap"]["onset"], duration=d["snap"]["duration"],
                            half_life=d["half_life"], naloxone=d["snap"]["naloxone"], dependence=d["snap"]["dependence"],
                            groups=d["groups"], new=True, data=d))
    return out


def sort_key(r):
    n = r["name"].lower()
    return (0 if n[0].isdigit() else 1, n)


def all_records():
    recs = existing() + new_records()
    slugs = [r["slug"] for r in recs]
    dup = {s for s in slugs if slugs.count(s) > 1}
    assert not dup, dup
    recs.sort(key=sort_key)
    by_cluster = {c: [r for r in recs if r["cluster"] == c] for c in CLUSTER_LABEL}
    return recs, by_cluster


def page_item(r, R="../"):
    """Item for the interactions/compare page-data JSON."""
    return {"slug": r["slug"], "name": r["name"], "url": f"{R}drugs/{r['slug']}/", "cluster": CLUSTER_LABEL[r["cluster"]],
            "sched": SCHED_LABEL[r["sched"]], "kind": KINDS[r["kind"]], "aka": r["aka"], "onset": r["onset"], "duration": r["duration"],
            "half_life": r["half_life"], "naloxone": r["naloxone"], "dependence": r["dependence"], "medical": r["medical"], "groups": r["groups"]}
