"""Regenerate the lists on hub pages (A to Z, clusters, schedules, legal status, tools, home) for all drugs."""
import json
import re

from dp import CLUSTERS, CLUSTER_LABEL, SCHEDS, SCHED_KEY, SCHED_LABEL, KINDS, esc, attr, sched_badge
from records import page_item

ARROW = None  # set by init(): the "Read profile" arrow svg used on cards


def init(base_drugs_index):
    global ARROW
    ARROW = re.search(r'<span class="more">Read profile (<svg.*?</svg>)</span>', base_drugs_index, re.S).group(1)


def card(r, R):
    return (f'<a class="card drug" href="{R}drugs/{r["slug"]}/" data-cluster="{r["cluster"]}" data-sched="{SCHED_KEY[r["sched"]]}" data-kind="{r["kind"]}" data-text="{attr(r["data_text"])}">'
            f'<div class="card-top">{sched_badge(r["sched"])}<span class="tag">{esc(CLUSTER_LABEL[r["cluster"]])}</span></div>'
            f'<h3>{esc(r["name"])}</h3><p class="brands">{esc(r["brands"])}</p><p>{esc(r["desc"])}</p><span class="more">Read profile {ARROW}</span></a>')


def sub_counts(s, n):
    s = re.sub(r"\b50 (prescription|Prescription|plain-language|drugs|substances|profiles)", rf"{n} \1", s)
    s = s.replace("All 50 drugs", f"All {n} drugs").replace("All 50 substances", f"All {n} substances")
    s = s.replace("<b data-count>50</b>", f"<b data-count>{n}</b>")
    return s


def drugs_index(s, recs):
    R = "../"
    s = sub_counts(s, len(recs))
    groups = {}
    for r in recs:
        L = r["name"][0].upper()
        L = "0-9" if L.isdigit() else L
        groups.setdefault(L, []).append(r)
    letters = ["0-9"] + [chr(c) for c in range(65, 91)]
    az = "".join(f'<a href="#l-{"0" if L == "0-9" else L}">{L}</a>' if L in groups else f"<span>{L}</span>" for L in letters)
    s = re.sub(r'<nav class="az" aria-label="Letters">.*?</nav>', f'<nav class="az" aria-label="Letters">{az}</nav>', s, flags=re.S)
    secs = "".join(f'<section id="l-{"0" if L == "0-9" else L}" class="letter"><h2>{L}</h2><div class="grid g3">' + "".join(card(r, R) for r in groups[L]) + "</div></section>" for L in letters if L in groups)
    s = re.sub(r"<div data-filter-list>.*?</div>\s*<p class=\"empty\"", f'<div data-filter-list>{secs}</div>\n<p class="empty"', s, flags=re.S)
    return s


def class_page(s, key, recs, new_names):
    R = "../../"
    members = [r for r in recs if r["cluster"] == key]
    s = re.sub(r"Drug cluster &middot; \d+ substances", f"Drug cluster &middot; {len(members)} substances", s)
    rows = "".join(f'<tr><td><a href="{R}drugs/{r["slug"]}/">{esc(r["name"])}</a></td><td>{esc(r["aka"])}</td><td>{esc(r["type"])}</td>'
                   f'<td><a href="{R}schedules/{SCHED_KEY[r["sched"]]}/">{SCHED_LABEL[r["sched"]]}</a></td><td>{esc(r["medical"])}</td></tr>' for r in members)
    s = re.sub(r"(<h2>Compare the .*?</h2>\s*<div class=\"tbl\"><table><thead>.*?</thead><tbody>).*?(</tbody>)", lambda m: m.group(1) + rows + m.group(2), s, count=1, flags=re.S)
    cards = "".join(card(r, R) for r in members)
    i = s.index('<div class="grid g3 mt">')
    j = s.index("</main>")
    s = s[:i] + f'<div class="grid g3 mt">{cards}</div></div>\n' + s[j:]
    if new_names and "Also profiled on Dosepedia" not in s:
        lst = ", ".join(new_names[:-1]) + (", and " if len(new_names) > 2 else " and ") + new_names[-1] if len(new_names) > 1 else new_names[0]
        k = s.index('<div class="prose">')
        k2 = s.index("</p>", k) + 4
        s = s[:k2] + f"<p>Also profiled on Dosepedia in this cluster: {esc(lst)}.</p>" + s[k2:]
    return s


def schedule_page(s, code, recs):
    R = "../../"
    members = [r for r in recs if r["sched"] == code]
    label = "substances not federally controlled" if code == "NC" else f"{SCHED_LABEL[code]} substances"
    s = re.sub(r"<h2>\d+ [^<]* on Dosepedia</h2>", f"<h2>{len(members)} {label} on Dosepedia</h2>", s)
    cards = "".join(card(r, R) for r in members)
    s = re.sub(r'(on Dosepedia</h2>\s*<div class="grid g3">).*?(</div>\s*<p class="note">)', lambda m: m.group(1) + cards + m.group(2), s, count=1, flags=re.S)
    return s


def legal_status(s, recs):
    R = "../"
    s = sub_counts(s, len(recs))
    counts = [sum(1 for r in recs if r["sched"] == c) for c, _, _ in SCHEDS]
    it = iter(counts)
    s = re.sub(r"<em>\d+ on Dosepedia</em>", lambda m: f"<em>{next(it)} on Dosepedia</em>", s)
    rows = []
    for r in recs:
        if r["kind"] in ("rx", "otc"):
            acc = f'<a href="{R}drugs/{r["slug"]}/#legal-access">{"How to buy it safely" if r["kind"] == "otc" else "How to get it legally"}</a>'
        else:
            acc = f'<a href="{R}drugs/{r["slug"]}/#legal-us">US law</a>'
        rows.append(f'<tr data-sched="{SCHED_KEY[r["sched"]]}"><td><a href="{R}drugs/{r["slug"]}/">{esc(r["name"])}</a></td><td>{SCHED_LABEL[r["sched"]]}</td><td>{KINDS[r["kind"]]}</td><td>{acc}</td></tr>')
    s = re.sub(r"(<tbody data-rows>).*?(</tbody>)", lambda m: m.group(1) + "".join(rows) + m.group(2), s, count=1, flags=re.S)
    return s


def cluster_optgroups(recs, include=None):
    out = []
    for key, label in CLUSTERS:
        ms = [r for r in recs if r["cluster"] == key and (include is None or r["slug"] in include)]
        if ms:
            out.append(f'<optgroup label="{attr(label)}">' + "".join(f'<option value="{r["slug"]}">{esc(r["name"])}</option>' for r in ms) + "</optgroup>")
    return "".join(out)


def replace_optgroups(s, groups_html):
    # Every select that lists clusters: replace from the first cluster optgroup to </select>
    return re.sub(r'<optgroup label="Opioids">.*?(</select>)', lambda m: groups_html + m.group(1), s, flags=re.S)


def set_page_data(s, items):
    js = json.dumps({"items": items}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return re.sub(r'(<script type="application/json" id="page-data">).*?(</script>)', lambda m: m.group(1) + js + m.group(2), s, count=1, flags=re.S)


def tools_page(s, recs, base_items):
    s = sub_counts(s, len(recs))
    s = replace_optgroups(s, cluster_optgroups(recs))
    extras = [x for x in base_items if "kind" not in x]  # alcohol, SSRIs, MAOIs, lithium
    items = [page_item(r) for r in sorted(recs, key=lambda r: r["slug"])] + extras
    return set_page_data(s, items)


def withdrawal_page(s, recs, new_panels):
    s = sub_counts(s, len(recs))
    panels = {m.group(2): m.group(1) for m in re.finditer(r'(<section class="panel" data-panel="([^"]+)" hidden>.*?</section>)', s, re.S)}
    panels.update(new_panels)
    include = set(panels)
    s = replace_optgroups(s, cluster_optgroups(recs, include))
    ordered = [r["slug"] for key, _ in CLUSTERS for r in recs if r["cluster"] == key and r["slug"] in include]
    allp = "".join(panels[x] for x in ordered)
    i = s.index('<section class="panel"')
    j = s.rindex("</section>") + len("</section>")
    return s[:i] + allp + s[j:]


def home(s, recs, n_sources, news_html):
    R = "./"
    n = len(recs)
    s = sub_counts(s, n)
    s = s.replace("Search 50 drugs", f"Search {n} drugs")
    s = re.sub(r"<b>\d+</b><span>substance profiles</span>", f"<b>{n}</b><span>substance profiles</span>", s)
    s = re.sub(r"<b>\d+</b><span>primary sources cited</span>", f"<b>{n_sources}</b><span>primary sources cited</span>", s)
    s = s.replace("synthetic THC..", "synthetic THC.")
    # cluster cards
    def ccard(m):
        key = m.group(1)
        ms = [r for r in recs if r["cluster"] == key]
        names = "".join(f"<span>{esc(r['name'])}</span>" for r in ms[:6]) + (f'<span class="more-n">+{len(ms) - 6}</span>' if len(ms) > 6 else "")
        start = m.group(0)[:m.group(0).index('<span class="count">')]
        return f'{start}<span class="count">{len(ms)}</span>{m.group(2)}<div class="names">{names}</div></a>'
    s = re.sub(r'<a class="card cluster c-([a-z-]+)" href="\./class/[a-z-]+/"><span class="count">\d+</span>(<h3>.*?</p>)<div class="names">.*?</div></a>', ccard, s, flags=re.S)
    # quick-check selects (flat list)
    opts = "".join(f'<option value="{r["slug"]}">{esc(r["name"])}</option>' for r in recs)
    s = re.sub(r'(<select name="[ab]" required><option value="">[^<]*</option>).*?(</select>)', lambda m: m.group(1) + opts + m.group(2), s, flags=re.S)
    # popular links
    s = s.replace('<a href="./drugs/psilocybin/">psilocybin</a></p>', '<a href="./drugs/psilocybin/">psilocybin</a>, <a href="./drugs/naloxone/">Narcan</a>, <a href="./drugs/delta-8-thc/">delta-8</a></p>')
    # latest updates
    s = re.sub(r'(<div class="band-head"><h2>Latest updates</h2>.*?</div>\s*)<ul class="news">.*?</ul>', lambda m: m.group(1) + news_html, s, count=1, flags=re.S)
    return s


def search_index(recs, R):
    out = []
    for r in recs:
        k = " ".join(r["aka_list"]) + " " + CLUSTER_LABEL[r["cluster"]] + " " + r["type"]
        out.append({"t": r["name"], "k": k, "s": ", ".join(r["aka_list"][:2]), "u": f"{R}drugs/{r['slug']}/"})
    return json.dumps(out, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def withdrawal_panel(d, arrow):
    w = d["withdrawal"]
    from drugpage import lc
    n = lc(d.get("short", d["name"]))
    h2 = w.get("h2") or f"What is {n} withdrawal like, and how long does it last?"
    intro = re.sub(r"\[\^[a-z0-9]+\]", "", w["intro"])
    tl = "".join(f"<li><b>{esc(a)}</b><strong>{esc(b)}</strong><span>{esc(c)}</span></li>" for a, b, c in w["tl"])
    return (f'<section class="panel" data-panel="{d["slug"]}" hidden><div class="panel-head">{sched_badge(d["sched"])}<h2>{esc(h2)}</h2>'
            f'<a class="link" href="../drugs/{d["slug"]}/#withdrawal">Full guide {arrow}</a></div><p>{intro}</p><ol class="tl">{tl}</ol></section>')


COMBO_RULES = ("if(either(a,b,'antagonist','opioid')){var x=has(a,'antagonist')?a:b;return x.slug==='naloxone'?"
               "['caution','Reversal, then possible relapse into overdose','Naloxone is the antidote to opioid overdose. In someone dependent on opioids it causes sudden withdrawal, and it can wear off before the opioid does, so the overdose can return. Always call 911 after giving it.']:"
               "['danger','Blocked effect, sudden withdrawal, or overdose','Naltrexone blocks opioids. Taken with or soon after opioids it causes sudden withdrawal, and taking large amounts of opioids to override it, or using opioids after stopping it, can cause a fatal overdose.']}\n"
               "if(has(a,'qt')&&has(b,'qt'))return ['danger','Dangerous heart rhythms','Both can prolong the heart\\'s QT interval. Together they raise the risk of torsades de pointes and sudden cardiac death.'];\n")


def patch_js(js):
    if "'antagonist'" in js:
        return js
    anchor = "if(either(a,b,'partial-opioid','opioid')"
    assert anchor in js
    return js.replace(anchor, COMBO_RULES + anchor, 1)
