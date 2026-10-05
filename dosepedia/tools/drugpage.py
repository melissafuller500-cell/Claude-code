"""Render a full drug profile page from a structured record (same layout as existing profiles)."""
import re
from dp import SITE, DATE, DATE_H, CLUSTER_LABEL, SCHED_LABEL, SCHED_KEY, KINDS, esc, attr, sched_badge, jsonld
from data.common import GENERIC_SOURCES

SVG = {
    "phone": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    "combo": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/></svg>',
    "cmp": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M6.5 8h0M17.5 8h0"/></svg>',
}


class Cites:
    def __init__(self, own):
        self.own = own  # list of (title,url,pub)
        self.order = []  # list of keys: int index (0-based own) or generic str

    def key_src(self, k):
        return self.own[k] if isinstance(k, int) else GENERIC_SOURCES[k]

    def num(self, tok):
        k = int(tok) - 1 if tok.isdigit() else tok
        if isinstance(k, int) and k >= len(self.own):
            raise ValueError(f"citation [^{tok}] out of range")
        # merge duplicates by URL
        url = self.key_src(k)[1]
        for i, kk in enumerate(self.order):
            if self.key_src(kk)[1] == url:
                return i + 1
        self.order.append(k)
        return len(self.order)

    def __call__(self, text):
        def rep(m):
            n = self.num(m.group(1))
            return f'<sup><a href="#src-{n}" aria-label="Source {n}">[{n}]</a></sup>'
        return re.sub(r"\[\^([a-z0-9]+)\]", rep, text)

    def finish(self):
        for i in range(len(self.own)):
            if not any(self.key_src(k)[1] == self.own[i][1] for k in self.order):
                self.order.append(i)
        items = []
        for n, k in enumerate(self.order, 1):
            t, u, p = self.key_src(k)
            items.append(f'<li id="src-{n}"><a href="{attr(u)}" rel="noopener">{esc(t)}</a>. <span>{esc(p)}</span></li>')
        return items, [self.key_src(k)[1] for k in self.order]


def lc(name):
    """Lowercase a drug name for mid-sentence use unless it is an acronym."""
    if re.match(r"^[0-9A-Z][0-9A-Z-]+( |$)", name) or name[:2].isupper():
        return name
    return name[0].lower() + name[1:]


def emerg_box(kind, n):
    if kind == "opioid":
        return ("If someone may have overdosed", [
            "Call 911 if the person is unresponsive, cannot be woken, has blue or gray lips, or is breathing slowly or not at all.",
            "Give naloxone (Narcan or a generic nasal spray, sold without a prescription) into one nostril. If there is no response after 2 to 3 minutes, give another dose.",
            "If you are trained, give rescue breaths. Otherwise place the person on their side so they do not choke.",
            f"Stay with them. Naloxone can wear off before {n} does, so the overdose can return even after the person wakes up.",
            "Most states have Good Samaritan laws that protect people who call 911 for an overdose from some drug charges."])
    if kind == "sedative":
        return ("If someone may have overdosed", [
            "Call 911 if the person is unresponsive, hard to wake, or breathing slowly.",
            "For advice when the person is awake and stable, call Poison Help at 1-800-222-1222 (US, free, 24 hours).",
            f"If opioids could be involved, including pills not from a pharmacy, give naloxone if you have it. Naloxone does not reverse {n}, but it will not harm the person.",
            "Stay with the person and place them on their side if they are drowsy or vomiting."])
    if kind == "stimulant":
        return ("If someone may be overdosing", [
            "Call 911 for chest pain, a seizure, trouble breathing, signs of a stroke (face drooping, weakness on one side, slurred speech), a very high body temperature, or if the person collapses.",
            "Move them somewhere cool and calm, loosen tight clothing, and cool the skin with water. Do not try to hold them down.",
            "If they become unresponsive or their breathing slows, give naloxone. Street stimulants are often contaminated with fentanyl.",
            "For advice when the person is awake and stable, call Poison Help at 1-800-222-1222."])
    if kind == "psychedelic":
        return ("If someone is having a dangerous reaction", [
            "Call 911 for a seizure, chest pain, a very high temperature, trouble breathing, unresponsiveness, or if the person may harm themselves or others.",
            "Move them to a quiet, safe place away from roads, water, heights, and crowds. Stay with them and speak calmly.",
            "Do not leave the person alone and do not give them other drugs or alcohol to calm them down.",
            "If they become unresponsive, place them on their side and give naloxone in case opioids are involved."])
    if kind == "cardiac":
        return ("If someone may have taken too much", [
            "Call 911 for fainting, a seizure, chest pain, a racing or irregular heartbeat, confusion, or if the person cannot be woken.",
            "If the person collapses and is not breathing normally, start CPR and use an AED if one is available.",
            "Give naloxone if opioids could be involved. It is safe even if they are not.",
            "For advice when the person is awake and stable, call Poison Help at 1-800-222-1222 (US, free, 24 hours). Bring the product packaging to the hospital."])
    if kind == "steroid":
        return ("When to get emergency help", [
            "Call 911 for chest pain, shortness of breath, sudden weakness or numbness on one side, trouble speaking, or a severe headache.",
            "Seek urgent care for yellow skin or eyes, dark urine, severe abdominal pain, or a painful, swollen leg.",
            "Seek care for a hot, painful, or swollen injection site, which may be an infection.",
            "If you have thoughts of harming yourself, call or text 988."])
    return ("If someone is unwell after using it", [
        "Call 911 if the person is unresponsive, having a seizure, struggling to breathe, or has chest pain.",
        "Place a drowsy or unconscious person on their side so they do not choke.",
        "Give naloxone if opioids could be involved. It is safe even if they are not.",
        "For advice when the person is awake and stable, call Poison Help at 1-800-222-1222 (US, free, 24 hours)."])


def ul(items):
    return "<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>"


def tbl(head, rows):
    h = "".join(f'<th scope="col">{esc(x)}</th>' for x in head)
    b = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="tbl"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'


def legal_list(items, C):
    out, bl = [], []
    for s in items:
        if "|" in s:
            k, v = s.split("|", 1)
            k = k.replace("<b>", "<strong>").replace("</b>", "</strong>")
            bl.append(C(f"{k} {v}"))
        else:
            if bl:
                out.append(ul(bl)); bl = []
            out.append(f"<p>{C(s)}</p>")
    if bl:
        out.append(ul(bl))
    return "".join(out)


def default_legal_us(d, n):
    sc = d["sched"]
    if sc == "I":
        return [f"{d['name']} is a Schedule I controlled substance under federal law, meaning it is considered to have a high potential for abuse and no currently accepted medical use. It cannot be prescribed, and possessing, making, or selling it is a federal crime.[^dea]",
                "<b>Possession:</b>|under federal law, a first conviction for possessing any controlled substance without a valid prescription can bring up to one year in prison and a minimum fine of $1,000. Penalties rise with prior convictions.[^possession]",
                "<b>State law:</b>|states set their own penalties, and most drug cases are prosecuted under state law."]
    return [f"{d['name']} is listed as {SCHED_LABEL[sc]} under federal law.[^dea]"]


def render(d, ctx, chrome):
    """d: new drug record. ctx: dict with all records (for related), helpers. Returns (html, meta)."""
    name, slug = d["name"], d["slug"]
    n = lc(d.get("short", name))
    kind = d["kind"]
    rx = kind in ("rx", "otc")
    sc = d["sched"]
    controlled = sc != "NC"
    C = Cites(d["sources"])
    R = "../../"
    aka_all = d["aka"] + d.get("street", [])
    secs = []  # (id, toc label, html)

    # facts
    facts = "".join(f"<div><dt>{esc(a)}</dt><dd>{C(esc(b))}</dd></div>" for a, b in d["facts"])
    secs.append(("facts", "At a glance", f'<section id="facts"><h2>{esc(name)} at a glance</h2><dl class="facts">{facts}</dl></section>'))
    # uses
    uh = d.get("uses_h2") or (f"What is {n} used for?" if rx else f"What is {n}?")
    secs.append(("uses", "Uses", f'<section id="uses"><h2>{esc(uh)}</h2>' + "".join(f"<p>{C(p)}</p>" for p in d["uses"]) + "</section>"))
    if rx:
        ds = d["dosage"]
        dh = d.get("dosage_h2") or (f"How much {n} is safe to take?" if kind == "otc" else f"How is {n} usually prescribed?")
        intro = ds.get("intro") or f"The figures below come from the FDA-approved label and describe how prescribers typically use {n}. They are not personal dosing advice. A prescriber sets the dose for each person and adjusts it over time.[^1]"
        head = ds.get("head") or (("Product", "Typical adult dose", "Notes from the label") if kind == "rx" else ("Product or group", "Label directions", "Notes"))
        rows = [[C(esc(c)) for c in r] for r in ds["rows"]]
        secs.append(("dosage", "Dosing", f'<section id="dosage"><h2>{esc(dh)}</h2><p>{C(intro)}</p>{tbl(head, rows)}</section>'))
    else:
        secs.append(("effects", "Effects", f'<section id="effects"><h2>What are the effects of {esc(n)}, and how long do they last?</h2>' + "".join(f"<p>{C(p)}</p>" for p in d["effects"]) + "</section>"))
    # risks
    rh = f"What are the risks and side effects of {n}?" if rx else f"What are the risks of {n}?"
    rk = ""
    if d.get("boxed"):
        rk += f'<div class="boxed"><h3>{esc(d.get("boxed_title", "FDA boxed warnings"))}</h3>{ul([C(x) for x in d["boxed"]])}</div>'
    rk += "".join(f"<p>{C(p)}</p>" for p in d["risks"])
    if d.get("warn"):
        rk += f'<p class="warn" role="note">{ctx["warn_svg"]}<span><strong>Warning:</strong> {C(d["warn"])}</span></p>'
    secs.append(("risks", "Risks", f'<section id="risks"><h2>{esc(rh)}</h2>{rk}</section>'))
    # interactions
    lbl = d.get("inter_label") or ("Label guidance" if kind == "rx" else "Guidance")
    rows = d["inter"]
    import json as _j
    data_rows = attr(_j.dumps([list(r) for r in rows]))
    chips = "".join(f'<button type="button" class="chip" data-i="{i}" aria-pressed="false">{esc(r[0])}</button>' for i, r in enumerate(rows))
    ih = f"What should not be mixed with {n}?" if rx else f"What is dangerous to mix with {n}?"
    note = ("This is not a full list. A pharmacist can check a complete medication list, including supplements and over-the-counter products.[^1]" if rx
            else "This is not a full list. Combining substances raises the risk of harm, especially when the contents of street drugs are unknown.")
    secs.append(("interactions", "Mixing", f'<section id="interactions"><h2>{esc(ih)}</h2><div class="chk" data-rows="{data_rows}" data-label="{attr(lbl)}" hidden><p class="chk-q">Choose what it would be combined with:</p><div class="chips">{chips}</div><p class="chk-out" aria-live="polite"></p></div>'
                 + tbl(("Combined with", "What happens", lbl), [[esc(c) for c in r] for r in rows]) + f"<p>{C(note)}</p></section>"))
    # overdose
    oh = d.get("overdose_h2") or f"What does {n} overdose look like?"
    eh, eitems = emerg_box(d["emerg"], n)
    secs.append(("overdose", "Overdose", f'<section id="overdose"><h2>{esc(oh)}</h2><p>{C(d["overdose"])}</p><div class="emerg"><h3>{eh}</h3>{ul(eitems)}</div></section>'))
    # withdrawal
    w = d["withdrawal"]
    wh = w.get("h2") or f"What is {n} withdrawal like, and how long does it last?"
    tl = "".join(f"<li><b>{esc(a)}</b><strong>{esc(b)}</strong><span>{esc(c)}</span></li>" for a, b, c in w["tl"])
    wb = f'<p>{C(w["intro"])}</p><ol class="tl">{tl}</ol>'
    if w.get("warn"):
        wb += f'<p class="warn" role="note">{ctx["warn_svg"]}<span><strong>Warning:</strong> {C(w["warn"])}</span></p>'
    wb += "".join(f"<p>{C(p)}</p>" for p in w.get("after", []))
    secs.append(("withdrawal", "Withdrawal", f'<section id="withdrawal"><h2>{esc(wh)}</h2>{wb}</section>'))

    if rx:
        L = d.get("legal", {})
        if kind == "otc":
            lh = f"How do you buy {n} safely in the US?"
            body = f"<p>{C(L['intro'])}</p>" + ul([C(x) for x in L.get("bullets", [])] + ["<strong>Ask a pharmacist:</strong> a pharmacist can check whether it is safe with your other medicines and health conditions."])
            secs.append(("legal-access", "Buying it safely", f'<section id="legal-access"><h2>{esc(lh)}</h2>{body}</section>'))
            bo = f"<p>{C(d['buy_online'])}</p><p>The FDA's BeSafeRx tool explains how to recognize a safe online pharmacy.[^besafe]</p>"
            secs.append(("buy-online", "Ordering online", f'<section id="buy-online"><h2>Can you buy {esc(n)} online?</h2>{C(bo)}</section>'))
        else:
            lh = f"How do you get {n} legally in the US?"
            if L.get("intro"):
                intro = L["intro"]
            elif controlled:
                intro = f"In the United States, {n} is a {SCHED_LABEL[sc]} controlled substance. The only legal way to get it is with a prescription from a clinician registered with the Drug Enforcement Administration (DEA), filled by a licensed pharmacy. Depending on state law, that can be a physician, nurse practitioner, or physician assistant.[^dea]"
            else:
                intro = f"In the United States, {n} is a prescription-only medicine. It is not a federal controlled substance, so the only legal way to get it is with a prescription from a licensed clinician, filled by a licensed pharmacy."
            bl = []
            if sc == "II":
                bl.append("<strong>Refills:</strong> Schedule II prescriptions cannot be refilled. A prescriber can issue several prescriptions at once, each dated with the earliest fill date, for up to a 90-day supply.[^refill2]")
            elif sc in ("III", "IV"):
                bl.append(f"<strong>Refills:</strong> a {SCHED_LABEL[sc]} prescription can be refilled up to five times within six months of the date it was written. After that, a new prescription is needed.[^refill34]")
            elif sc == "V":
                bl.append("<strong>Refills:</strong> Schedule V prescriptions can be refilled as the prescriber authorizes, subject to state law.[^dea]")
            else:
                bl.append("<strong>Refills:</strong> refills follow ordinary prescription rules.")
            if controlled:
                bl.append("<strong>Telehealth:</strong> federal flexibilities let DEA-registered clinicians prescribe Schedule II to V medicines after a telemedicine visit, without a prior in-person exam, through December 31, 2026. A permanent DEA rule was under final review in late 2026. State rules can be stricter.[^tele]")
                bl.append("<strong>Monitoring:</strong> prescribers and pharmacists in most states check a prescription drug monitoring program, a database of controlled-substance prescriptions, before prescribing or dispensing.")
            bl.append("<strong>Pharmacies:</strong> a legitimate pharmacy always requires a valid prescription, has a licensed pharmacist available, and is licensed in the state it ships to. The FDA's BeSafeRx tool and the NABP's safe pharmacy list help confirm a pharmacy is real.[^besafe][^nabp]")
            if L.get("cost"):
                bl.append(f"<strong>Cost:</strong> {L['cost'][0].lower() + L['cost'][1:]}")
            bl += L.get("extra", [])
            body = f"<p>{C(intro)}</p>" + ul([C(x) for x in bl]) + "<p><strong>Traveling:</strong> keep the medicine in its original pharmacy container and carry a copy of the prescription. Check the rules of the destination country before travel, because many countries restrict controlled medicines or require a permit.</p>"
            secs.append(("legal-access", "Getting it legally", f'<section id="legal-access"><h2>{esc(lh)}</h2>{body}</section>'))
            bo = (f"<p>Yes, but only with a valid prescription and only from a pharmacy licensed in your state. Many licensed pharmacies, including mail-order pharmacies run by insurers, fill {n} prescriptions online and ship them. Buying {n} from a website that does not require a prescription is illegal, and the product is often fake.[^besafe][^onepill]</p>"
                  '<ol class="steps"><li><strong>See a licensed clinician</strong><span>A clinician evaluates you in person or by telemedicine and decides whether ' + esc(n) + ' is appropriate.</span></li>'
                  '<li><strong>The prescription goes to a pharmacy</strong><span>Prescriptions are usually sent electronically, straight from the prescriber to the pharmacy you choose.</span></li>'
                  '<li><strong>The pharmacy checks and fills it</strong><span>A pharmacist verifies the prescription and your identity, then dispenses the medicine in person or by mail.</span></li></ol>'
                  "<p><strong>Signs that an online seller is illegal:</strong></p><ul>"
                  f"<li>It sells {esc(n)} with no prescription, or after only a short online questionnaire.</li><li>It takes orders through social media, messaging apps, or email.</li><li>It asks for payment in cryptocurrency, gift cards, or money transfers.</li><li>It has no US street address, no state pharmacy license, and no pharmacist to speak to.</li><li>Its prices are far below those of ordinary pharmacies, or it ships from another country.</li></ul>"
                  "<p>The FDA's BeSafeRx tool links to each state's license lookup, and the National Association of Boards of Pharmacy lists verified online pharmacies.[^besafe][^nabp]</p>")
            secs.append(("buy-online", "Ordering online", f'<section id="buy-online"><h2>Can you order {esc(n)} online?</h2>{C(bo)}</section>'))
    else:
        lu = d.get("legal_us") or default_legal_us(d, n)
        secs.append(("legal-us", "US law", f'<section id="legal-us"><h2>Is {esc(n)} legal in the US?</h2>{legal_list(lu, C)}</section>'))
        th = d.get("treatment_h2") or f"Where can someone get help with {n} use?"
        if d.get("treatment_html"):
            tb = "<ul>" + "".join(d["treatment_html"]) + "</ul>"
        else:
            tb = (f"<p>{C(d['treatment_intro'])}</p>" if d.get("treatment_intro") else "") + ul([
                C("<strong>SAMHSA National Helpline:</strong> 1-800-662-4357. Free, confidential, 24 hours a day, in English and Spanish. It gives referrals to local treatment and support.[^samhsa]"),
                C("<strong>FindTreatment.gov:</strong> a federal locator for state-licensed treatment programs, searchable by location, payment, and type of care.[^findtx]"),
                "<strong>988 Suicide and Crisis Lifeline:</strong> call or text 988 for a mental health or substance use crisis.",
                "<strong>Your own clinician:</strong> a primary care doctor can screen, treat, and refer, and can discuss medicines that support recovery where they exist."])
        secs.append(("treatment", "Getting help", f'<section id="treatment"><h2>{esc(th)}</h2>{tb}</section>'))
    # legal status
    secs.append(("legal-status", "Other countries", f'<section id="legal-status"><h2>Is {esc(n)} legal in other countries?</h2>{tbl(("Country", "Status"), [[esc(a), esc(b)] for a, b in d["intl"]])}'
                 + C("<p>Laws change and differ in detail. Check current rules before carrying any controlled medicine across a border.[^unodc]</p>") + "</section>"))
    # faq
    faq = "".join(f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in d["faq"])
    secs.append(("faq", "Common questions", f'<section id="faq"><h2>Common questions about {esc(n)}</h2><div class="faq">{faq}</div></section>'))
    items, cite_urls = C.finish()
    secs.append(("sources", "Sources", f'<section id="sources"><h2>Sources</h2><ol class="src">{"".join(items)}</ol></section>'))

    # related
    rel = [x for x in ctx["by_cluster"][d["cluster"]] if x["slug"] != slug][:6]
    minis = "".join(f'<a class="mini" href="{R}drugs/{x["slug"]}/">{sched_badge(x["sched"], "xs")}<span><b>{esc(x["name"])}</b><i>{esc(", ".join(x["aka_list"][:2]))}</i></span></a>' for x in rel)
    related = f'<section class="related" aria-label="Related"><h2>More in {esc(CLUSTER_LABEL[d["cluster"]])}</h2><div class="minis">{minis}</div></section>'

    jump_ids = [s for s in secs if s[0] not in ("facts", "faq", "sources")]
    jump = "".join(f'<a class="chip" href="#{i}">{l}</a>' for i, l, _ in jump_ids)
    toc = "".join(f'<li><a href="#{i}">{l}</a></li>' for i, l, _ in secs)
    snap = d["snap"]
    snap_html = "".join(f"<div><dt>{a}</dt><dd>{esc(snap[k])}</dd></div>" for a, k in (("Onset", "onset"), ("Duration", "duration"), ("Naloxone reverses it?", "naloxone"), ("Dependence risk", "dependence")))
    sl = SCHED_LABEL[sc]
    eyebrow_sched = f'<a href="{R}schedules/{SCHED_KEY[sc]}/">{"Not federally controlled" if sc == "NC" else sl}</a>'
    h1_small = esc(", ".join(aka_all[:3]))
    art = f'<figure class="drug-art" aria-hidden="true"><img src="{R}assets/img/drugs/{slug}.svg" alt="" width="216" height="216"></figure>'
    guide = ctx["guide_link"](d, R)
    main = (f'<div class="hero-sm"><div class="wrap">\n'
            f'<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="{R}drugs/">Drugs</a></li><li><a href="{R}class/{d["cluster"]}/">{esc(CLUSTER_LABEL[d["cluster"]])}</a></li><li aria-current="page">{esc(name)}</li></ol></nav>\n'
            f'<div class="title">{sched_badge(sc, "")}\n<div><p class="eyebrow">{esc(d["cls"])} &middot; {eyebrow_sched}</p>\n'
            f'<h1>{esc(name)} <small>{h1_small}</small></h1></div></div>\n{art}\n'
            f'<p class="quick">{esc(d["quick"])}</p>\n'
            f'<div class="meta-row"><span class="kind k-{kind}">{KINDS[kind]}</span><p class="status draft">Draft, awaiting medical review. Updated {DATE_H}.</p></div>\n'
            f'<dl class="snap">{snap_html}</dl>\n<nav class="jump" aria-label="Jump to a topic">{jump}</nav>\n</div></div>\n'
            f'<div class="wrap layout">\n<nav class="toc" aria-label="On this page"><p>On this page</p><ol>{toc}</ol>\n'
            f'<a class="toc-help" href="tel:18002221222">{SVG["phone"]}<span>Poison Help<b>1-800-222-1222</b></span></a>\n'
            f'<a class="toc-cta" href="{R}interactions/?a={slug}">{SVG["combo"]}<span>Check a combination</span></a>\n'
            f'<a class="toc-cta" href="{R}compare/?a={slug}">{SVG["cmp"]}<span>Compare with another drug</span></a></nav>\n'
            f'<article>\n' + "".join(h for _, _, h in secs) + guide + related + "\n</article>\n</div>")

    url = f"{SITE}/drugs/{slug}/"
    img = f"assets/img/og/drugs/{slug}.png"
    drug_ld = {"@type": "Drug", "@id": url + "#drug", "name": name, "alternateName": aka_all, "drugClass": d["cls"],
               "legalStatus": {"@type": "DrugLegalStatus", "name": "Not federally controlled" if sc == "NC" else sl, "applicableLocation": {"@type": "Country", "name": "US"}},
               "image": f"{SITE}/{img}"}
    if kind == "rx":
        drug_ld["prescriptionStatus"] = "https://schema.org/PrescriptionOnly"; drug_ld["nonProprietaryName"] = name
    elif kind == "otc":
        drug_ld["prescriptionStatus"] = "https://schema.org/OTC"; drug_ld["nonProprietaryName"] = name
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "MedicalWebPage", "@id": url, "url": url, "name": name, "description": d["desc"], "inLanguage": "en", "dateModified": DATE,
         "about": {"@id": url + "#drug"}, "publisher": {"@type": "Organization", "name": "Dosepedia", "url": SITE}, "primaryImageOfPage": f"{SITE}/{img}", "citation": cite_urls},
        drug_ld,
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in d["faq"]]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Drugs", "item": f"{SITE}/drugs/"},
                                                        {"@type": "ListItem", "position": 2, "name": CLUSTER_LABEL[d["cluster"]], "item": f"{SITE}/class/{d['cluster']}/"},
                                                        {"@type": "ListItem", "position": 3, "name": name, "item": url}]}]}
    head = chrome.head(R, d["title"], d["desc"], f"drugs/{slug}/", image=img, image_alt=f"{name}: Dosepedia drug profile", ld=ld)
    return head, main, cite_urls
