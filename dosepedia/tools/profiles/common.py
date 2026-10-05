"""Shared templates for Dosepedia substance profiles. Writes data/substances/<slug>.json."""
import json, re, pathlib

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/substances"
UPDATED = "2026-10-05"

CLUSTERS = {
    "opioids": "Opioids",
    "benzodiazepines-sedatives": "Benzodiazepines and sedatives",
    "stimulants": "Stimulants",
    "gabapentinoids-dissociatives": "Gabapentinoids, dissociatives, and others",
    "cannabis-psychedelics": "Cannabis and psychedelics",
    "anabolic-steroids": "Anabolic steroids",
    "emerging": "Emerging and unscheduled substances",
}
LABEL = {"I": "Schedule I", "II": "Schedule II", "III": "Schedule III", "IV": "Schedule IV", "V": "Schedule V", "": "Not federally controlled"}

S = {  # shared sources: key -> (title, publisher, url)
    "dea": ("Controlled Substance Schedules", "DEA Diversion Control Division", "https://www.deadiversion.usdoj.gov/schedules/"),
    "cfr22": ("21 CFR 1306.22, Refilling of prescriptions (Schedules III and IV)", "Electronic Code of Federal Regulations", "https://www.ecfr.gov/current/title-21/chapter-II/part-1306/section-1306.22"),
    "cfr12": ("21 CFR 1306.12, Refilling prescriptions; issuance of multiple prescriptions (Schedule II)", "Electronic Code of Federal Regulations", "https://www.ecfr.gov/current/title-21/chapter-II/part-1306/section-1306.12"),
    "tele": ("Prescribing controlled substances via telehealth", "US Department of Health and Human Services", "https://telehealth.hhs.gov/providers/telehealth-policy/prescribing-controlled-substances-via-telehealth"),
    "poison": ("Poison Help", "Health Resources and Services Administration", "https://poisonhelp.hrsa.gov/"),
    "besaferx": ("BeSafeRx: Your Source for Online Pharmacy Information", "US Food and Drug Administration", "https://www.fda.gov/drugs/quick-tips-buying-medicines-over-internet/besaferx-your-source-online-pharmacy-information"),
    "nabp": ("Safe Pharmacy", "National Association of Boards of Pharmacy", "https://safe.pharmacy/"),
    "onepill": ("One Pill Can Kill", "US Drug Enforcement Administration", "https://www.dea.gov/onepill"),
    "naloxone": ("Information about naloxone and nalmefene", "US Food and Drug Administration", "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/information-about-naloxone"),
    "samhsa": ("National Helpline", "Substance Abuse and Mental Health Services Administration", "https://www.samhsa.gov/find-help/helplines/national-helpline"),
    "findtx": ("FindTreatment.gov", "Substance Abuse and Mental Health Services Administration", "https://findtreatment.gov/"),
    "cdc22": ("CDC Clinical Practice Guideline for Prescribing Opioids for Pain, 2022", "Centers for Disease Control and Prevention, MMWR", "https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm"),
    "fdaopbz": ("FDA warns about serious risks and death when combining opioid pain or cough medicines with benzodiazepines", "US Food and Drug Administration, 2016", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-warns-about-serious-risks-and-death-when-combining-opioid-pain-or"),
    "fdabz": ("FDA requiring Boxed Warning updated to improve safe use of benzodiazepine drug class", "US Food and Drug Administration, 2020", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-requiring-boxed-warning-updated-improve-safe-use-benzodiazepine-drug-class"),
    "asam_bz": ("Joint Clinical Practice Guideline on Benzodiazepine Tapering", "American Society of Addiction Medicine, 2025", "https://www.asam.org/quality-care/clinical-guidelines/benzodiazepine-tapering"),
    "fdastim": ("FDA updating warnings to improve safe use of prescription stimulants used to treat ADHD and other conditions", "US Food and Drug Administration, 2023", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-updating-warnings-improve-safe-use-prescription-stimulants-used-treat-adhd-and-other-conditions"),
    "fdazdrug": ("FDA adds Boxed Warning for risk of serious injuries caused by sleepwalking with certain prescription insomnia medicines", "US Food and Drug Administration, 2019", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-adds-boxed-warning-risk-serious-injuries-caused-sleepwalking-certain-prescription-insomnia"),
    "fdagaba": ("FDA warns about serious breathing problems with seizure and nerve pain medicines gabapentin and pregabalin", "US Food and Drug Administration, 2019", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-warns-about-serious-breathing-problems-seizure-and-nerve-pain-medicines-gabapentin-neurontin"),
    "fdakids": ("FDA restricts use of prescription codeine pain and cough medicines and tramadol pain medicines in children", "US Food and Drug Administration, 2017", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-restricts-use-prescription-codeine-pain-and-cough-medicines-and"),
    "usc844": ("21 U.S.C. 844, Penalties for simple possession", "Legal Information Institute, Cornell Law School", "https://www.law.cornell.edu/uscode/text/21/844"),
    "usc841": ("21 U.S.C. 841, Prohibited acts A (trafficking penalties)", "Legal Information Institute, Cornell Law School", "https://www.law.cornell.edu/uscode/text/21/841"),
    "un": ("International drug control conventions", "United Nations Office on Drugs and Crime", "https://www.unodc.org/unodc/en/commissions/CND/conventions.html"),
    "nida_fent": ("Fentanyl DrugFacts", "National Institute on Drug Abuse", "https://nida.nih.gov/research-topics/fentanyl"),
    "nida_halluc": ("Psychedelic and Dissociative Drugs", "National Institute on Drug Abuse", "https://nida.nih.gov/research-topics/psychedelic-dissociative-drugs-medicines"),
    "xylazine_fda": ("FDA alerts health care professionals of risks to patients exposed to xylazine in illicit drugs", "US Food and Drug Administration", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-alerts-health-care-professionals-risks-patients-exposed-xylazine-illicit-drugs"),
    "bup_tele": ("Expansion of Buprenorphine Treatment via Telemedicine Encounter, final rule", "Federal Register, January 17, 2025", "https://www.govinfo.gov/content/pkg/FR-2025-01-17/html/2025-01049.htm"),
    "mat_act": ("Waiver Elimination (MAT Act)", "Substance Abuse and Mental Health Services Administration", "https://www.samhsa.gov/substance-use/treatment/resources/mat-act"),
    "otp": ("Medications for the Treatment of Opioid Use Disorder, final rule (42 CFR Part 8)", "Federal Register, February 2, 2024", "https://www.federalregister.gov/documents/2024/02/02/2024-01693/medications-for-the-treatment-of-opioid-use-disorder"),
    "mj_rule": ("Rescheduling of FDA-approved products containing marijuana and state-licensed medical marijuana to Schedule III", "Federal Register, April 28, 2026", "https://www.federalregister.gov/documents/2026/04/28/2026-08176/schedules-of-controlled-substances-rescheduling-of-food-and-drug-administration-approved-products"),
    "ketamine_fda": ("FDA warns patients and health care providers about potential risks associated with compounded ketamine", "US Food and Drug Administration, 2023", "https://www.fda.gov/drugs/human-drug-compounding/fda-warns-patients-and-health-care-providers-about-potential-risks-associated-compounded-ketamine"),
}

def label_src(brand, name):
    t = f"{brand} ({name.lower()}) prescribing information" if brand and brand.lower() != name.lower() else f"{name} prescribing information"
    return (t, "DailyMed, US National Library of Medicine",
            "https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=" + name.split(" (")[0].lower().replace(" ", "+"))

# ---------- citation renumbering ----------

def finalize(d, extra):
    """Replace [[key]] citations with [[n]] in order of first use and build the sources list."""
    pool = {**S, **extra}
    order = []
    def num(m):
        k = m.group(1)
        if k.isdigit(): return m.group(0)
        if k not in pool: raise KeyError(f"{d['slug']}: unknown source {k}")
        if k not in order: order.append(k)
        return f"[[{order.index(k) + 1}]]"
    s = re.sub(r"\[\[([a-z0-9_]+)\]\]", num, json.dumps(d))
    d = json.loads(s)
    d["sources"] = [list(pool[k]) for k in order]
    return d

def strip_cites(t):
    return re.sub(r"\[\[[a-z0-9_]+\]\]", "", t)

# ---------- shared blocks ----------

def emergency(kind, name):
    n = name.lower()
    if kind == "opioid":
        return {"emergency": {"title": "If someone may have overdosed", "items": [
            "Call 911 if the person is unresponsive, cannot be woken, has blue or gray lips, or is breathing slowly or not at all.",
            "Give naloxone (Narcan or a generic nasal spray, sold without a prescription) into one nostril. If there is no response after 2 to 3 minutes, give another dose.",
            "If you are trained, give rescue breaths. Otherwise place the person on their side so they do not choke.",
            f"Stay with them. Naloxone can wear off before {n} does, so the overdose can return even after the person wakes up.",
            "Most states have Good Samaritan laws that protect people who call 911 for an overdose from some drug charges."]}}
    if kind == "depressant":
        return {"emergency": {"title": "If someone may have overdosed", "items": [
            "Call 911 if the person is unresponsive, hard to wake, or breathing slowly.",
            "For advice when the person is awake and stable, call Poison Help at 1-800-222-1222 (US, free, 24 hours).",
            f"If opioids could be involved, including pills not from a pharmacy, give naloxone if you have it. Naloxone does not reverse {n}, but it will not harm the person.",
            "Stay with the person and place them on their side if they are drowsy or vomiting."]}}
    if kind == "stimulant":
        return {"emergency": {"title": "If someone may be overdosing", "items": [
            "Call 911 for chest pain, a seizure, trouble breathing, signs of a stroke (face drooping, weakness on one side, slurred speech), a very high body temperature, or if the person collapses.",
            "Move them somewhere cool and calm, loosen tight clothing, and cool the skin with water. Do not try to hold them down.",
            "If they become unresponsive or their breathing slows, give naloxone. Street stimulants are often contaminated with fentanyl.",
            "For advice when the person is awake and stable, call Poison Help at 1-800-222-1222."]}}
    if kind == "psychedelic":
        return {"emergency": {"title": "If someone is having a dangerous reaction", "items": [
            "Call 911 for a seizure, chest pain, a very high temperature, trouble breathing, unresponsiveness, or if the person may harm themselves or others.",
            "Move them to a quiet, safe place away from roads, water, heights, and crowds. Stay with them and speak calmly.",
            "Do not leave the person alone and do not give them other drugs or alcohol to calm them down.",
            "If they become unresponsive, place them on their side and give naloxone in case opioids are involved."]}}
    if kind == "dissociative":
        return {"emergency": {"title": "If someone may have overdosed", "items": [
            "Call 911 if the person is unresponsive, breathing slowly, having a seizure, very hot, or violently agitated.",
            "Place an unresponsive person on their side so they do not choke if they vomit.",
            "Keep them away from roads, water, and heights. People on dissociatives often cannot feel pain or judge danger.",
            "If opioids could be involved, give naloxone. It will not harm the person."]}}
    if kind == "cannabis":
        return {"emergency": {"title": "If someone has taken too much", "items": [
            "Call 911 for chest pain, a seizure, trouble breathing, unresponsiveness, or if a child may have eaten a cannabis product.",
            "For an adult who is awake but anxious or sick, move them to a calm place and stay with them. Symptoms usually ease over several hours.",
            "Call Poison Help at 1-800-222-1222 for advice, including for any child or pet exposure.",
            "Do not drive. Edibles can keep building for hours after they are eaten."]}}
    if kind == "steroid":
        return {"emergency": {"title": "When to get emergency help", "items": [
            "Call 911 for chest pain, sudden shortness of breath, signs of a stroke (face drooping, arm weakness, slurred speech), or fainting.",
            "Call 911 for coughing, throat tightness, or trouble breathing during or right after an injection.",
            "Get urgent care for a painful, swollen leg, which can signal a blood clot, or for yellowing of the skin or eyes.",
            "Call Poison Help at 1-800-222-1222 if a child has touched or swallowed a testosterone gel or other product."]}}
    raise ValueError(kind)

def legal_access(name, sched, *, fake=None, cost=None, extra=None, controlled=True):
    n = name.lower()
    if controlled:
        intro = (f"In the United States, {n} is a {LABEL[sched]} controlled substance. The only legal way to get it is with a prescription "
                 f"from a clinician registered with the Drug Enforcement Administration (DEA), filled by a licensed pharmacy. Depending on state law, "
                 f"that can be a physician, nurse practitioner, or physician assistant.[[dea]]")
    else:
        intro = (f"In the United States, {n} is a prescription-only medicine. It is not a federal controlled substance, so the only legal way to get it is "
                 f"with a prescription from a licensed clinician, filled by a licensed pharmacy.")
    refill = {
        "II": "**Refills:** Schedule II prescriptions cannot be refilled. A prescriber can write several prescriptions at once, with dates when each may be filled, for up to a 90-day supply in total.[[cfr12]]",
        "III": "**Refills:** a Schedule III prescription can be refilled up to five times within six months of the date it was written. After that, a new prescription is needed.[[cfr22]]",
        "IV": "**Refills:** a Schedule IV prescription can be refilled up to five times within six months of the date it was written. After that, a new prescription is needed.[[cfr22]]",
        "V": "**Refills:** Schedule V prescriptions can be refilled as the prescriber authorizes. Some states set stricter limits.",
        "": "**Refills:** refills follow ordinary prescription rules, but some states treat it as a controlled substance with tighter limits.",
    }[sched]
    items = [refill]
    if controlled:
        items.append("**Telehealth:** federal flexibilities let DEA-registered clinicians prescribe Schedule II to V medicines after a telemedicine visit, without a prior in-person exam, through December 31, 2026. A permanent DEA rule was under final review in late 2026. State rules can be stricter.[[tele]]")
        items.append("**Monitoring:** prescribers and pharmacists in most states check a prescription drug monitoring program, a database of controlled-substance prescriptions, before prescribing or dispensing.")
    items.append("**Pharmacies:** a legitimate pharmacy always requires a valid prescription, has a licensed pharmacist available, and is licensed in the state it ships to. The FDA's BeSafeRx tool and the NABP's safe pharmacy list help confirm a pharmacy is real.[[besaferx]][[nabp]]")
    if cost: items.append(f"**Cost:** {cost}")
    blocks = [{"p": intro}, {"ul": items + (extra or [])}]
    if fake:
        blocks.append({"warn": f"Pills sold as {fake} outside a pharmacy are often counterfeit. The DEA reports that fake pills frequently contain fentanyl or methamphetamine, and they cannot be told apart by appearance.[[onepill]]"})
    blocks.append({"p": "**Traveling:** keep the medicine in its original pharmacy container and carry a copy of the prescription. Check the rules of the destination country before travel, because many countries restrict controlled medicines or require a permit."})
    return {"id": "legal-access", "q": f"How do you get {n} legally in the US?", "blocks": blocks}

def buy_online(name, *, extra_first=None):
    n = name.lower()
    return {"id": "buy-online", "q": f"Can you order {n} online?", "blocks": [
        {"p": f"Yes, but only with a valid prescription and only from a pharmacy licensed in your state. Many licensed pharmacies, including mail-order pharmacies run by insurers, fill {n} prescriptions online and ship them. Buying {n} from a website that does not require a prescription is illegal, and the product is often fake.[[besaferx]][[onepill]]"},
        *(extra_first or []),
        {"steps": [
            ["See a licensed clinician", f"A clinician evaluates you in person or by telemedicine and decides whether {n} is appropriate."],
            ["The prescription goes to a pharmacy", "Prescriptions for controlled medicines are usually sent electronically, straight from the prescriber to the pharmacy you choose."],
            ["The pharmacy checks and fills it", "A pharmacist verifies the prescription and your identity, then dispenses the medicine in person or by mail."]]},
        {"p": "**Signs that an online seller is illegal:**"},
        {"ul": [
            f"It sells {n} with no prescription, or after only a short online questionnaire.",
            "It takes orders through social media, messaging apps, or email.",
            "It asks for payment in cryptocurrency, gift cards, or money transfers.",
            "It has no US street address, no state pharmacy license, and no pharmacist to speak to.",
            "Its prices are far below those of ordinary pharmacies, or it ships from another country."]},
        {"p": "The FDA's BeSafeRx tool links to each state's license lookup, and the National Association of Boards of Pharmacy lists verified online pharmacies.[[besaferx]][[nabp]]"}]}

def penalties_block(name, trafficking=None):
    n = name.lower()
    items = ["**Possession:** under federal law, a first conviction for possessing any controlled substance without a valid prescription can bring up to one year in prison and a minimum fine of $1,000. Penalties rise with prior convictions.[[usc844]]"]
    if trafficking:
        items.append(f"**Trafficking:** {trafficking}[[usc841]]")
    else:
        items.append("**Selling or sharing:** distribution carries much heavier federal penalties, which increase with the amount involved and are higher still if the drug causes death or serious injury.[[usc841]]")
    items.append("**State law:** states set their own penalties, and most drug cases are prosecuted under state law. Penalties range from a civil fine to long prison terms depending on the state, the amount, and prior record.")
    return {"ul": items}

def help_section(name, extra=None):
    n = name.lower()
    return {"id": "treatment", "q": f"Where can someone get help with {n} use?", "blocks": [
        *(extra or []),
        {"ul": [
            "**SAMHSA National Helpline:** 1-800-662-4357. Free, confidential, 24 hours a day, in English and Spanish. It gives referrals to local treatment and support.[[samhsa]]",
            "**FindTreatment.gov:** a federal locator for state-licensed treatment programs, searchable by location, payment, and type of care.[[findtx]]",
            "**988 Suicide and Crisis Lifeline:** call or text 988 for a mental health or substance use crisis.",
            "**Your own clinician:** a primary care doctor can screen, treat, and refer, and can discuss medicines that support recovery where they exist."]}]}

def intl(*rows):
    return {"id": "legal-status", "q": None, "blocks": [{"table": {"head": ["Country", "Status"], "rows": [list(r) for r in rows]}},
            {"p": "Laws change and differ in detail. Check current rules before carrying any controlled medicine across a border.[[un]]"}]}

# ---------- profile builders ----------

def _base(slug, name, brands, cluster, subclass, sched, kind, quick, description, facts, profile, aka=None):
    return {"slug": slug, "name": name, "brands": brands, "aka": aka or [], "kind": kind,
            "class": {"name": CLUSTERS[cluster], "slug": cluster}, "subclass": subclass,
            "schedule": {"us": sched, "label": LABEL[sched]}, "reviewer": None, "updated": UPDATED,
            "description": description, "quick": quick, "facts": facts, "profile": profile}

def rx(slug, name, brands, cluster, subclass, sched, *, quick, description, facts, profile, uses, dosing, risks,
       interactions, overdose, withdrawal, access, online, intl_rows, faq, src=None, controlled=True, label=True, title_brand=None):
    d = _base(slug, name, brands, cluster, subclass, sched, "rx", quick, description, facts, profile)
    n = name.lower()
    extra = dict(src or {})
    if label: extra = {"label": label_src(title_brand or (brands[0] if brands else name), name), **extra}
    dose_intro = dosing.get("intro", f"The figures below come from the FDA-approved label and describe how prescribers typically use {n}. They are not personal dosing advice. A prescriber sets the dose for each person and adjusts it over time.[[label]]")
    secs = [
        {"id": "uses", "q": f"What is {n} used for?", "blocks": [{"p": p} for p in uses]},
        {"id": "dosage", "q": f"How is {n} usually prescribed?", "blocks": [{"p": dose_intro}, {"table": {"head": dosing["head"], "rows": dosing["rows"]}}] + [{"p": p} for p in dosing.get("after", [])]},
        {"id": "risks", "q": f"What are the risks and side effects of {n}?", "blocks": risks},
        {"id": "interactions", "q": f"What should not be mixed with {n}?", "blocks": [
            {"interactions": {"head": ["Combined with", "What happens", "Label guidance"], "rows": interactions}},
            {"p": "This is not a full list. A pharmacist can check a complete medication list, including supplements and over-the-counter products.[[label]]" if label else "This is not a full list. A pharmacist can check a complete medication list, including supplements and over-the-counter products."}]},
        {"id": "overdose", "q": overdose.get("q", f"What does {n} overdose look like?"), "blocks": [{"p": overdose["signs"]}, emergency(overdose["kind"], name)] + [{"p": p} for p in overdose.get("after", [])]},
        {"id": "withdrawal", "q": withdrawal.get("q", f"What is {n} withdrawal like, and how long does it last?"), "blocks": withdrawal["blocks"]},
        access, online,
    ]
    lsec = intl(*intl_rows); lsec["q"] = f"Is {n} legal in other countries?"
    secs.append(lsec)
    d["sections"] = [s for s in secs if s]
    d["faq"] = faq
    return write(finalize(d, extra))

def nomed(slug, name, aka, cluster, subclass, sched, *, quick, description, facts, profile, what, effects, risks,
          interactions, overdose, dependence, legal_us, help_extra=None, intl_rows, faq, src=None, kind="nomed", brands=None, guidance_head="Why it matters"):
    d = _base(slug, name, brands or [], cluster, subclass, sched, kind, quick, description, facts, profile, aka)
    n = name.lower()
    secs = [
        {"id": "uses", "q": what.get("q", f"What is {n}?"), "blocks": [{"p": p} if isinstance(p, str) else p for p in what["blocks"]]},
        {"id": "effects", "q": effects.get("q", f"What are the effects of {n}, and how long do they last?"), "blocks": [{"p": p} if isinstance(p, str) else p for p in effects["blocks"]]},
        {"id": "risks", "q": f"What are the risks of {n}?", "blocks": risks},
        {"id": "interactions", "q": f"What is dangerous to mix with {n}?", "blocks": [
            {"interactions": {"head": ["Combined with", "What happens", guidance_head], "rows": interactions}},
            {"p": "This is not a full list. Unregulated drugs often contain other substances, which makes any combination less predictable."}]},
        {"id": "overdose", "q": overdose.get("q", f"What does {n} overdose look like?"), "blocks": [{"p": overdose["signs"]}, emergency(overdose["kind"], name)] + [{"p": p} for p in overdose.get("after", [])]},
        {"id": "withdrawal", "q": dependence.get("q", f"Is {n} addictive, and what is withdrawal like?"), "blocks": dependence["blocks"]},
        {"id": "legal-us", "q": legal_us.get("q", f"Is {n} legal in the US?"), "blocks": legal_us["blocks"]},
        help_section(name, help_extra),
    ]
    lsec = intl(*intl_rows); lsec["q"] = f"Is {n} legal in other countries?"
    secs.append(lsec)
    d["sections"] = secs
    d["faq"] = faq
    return write(finalize(d, src or {}))

def write(d):
    # sanity: every interactions row has 3 cells, faq pairs, facts pairs
    for s in d["sections"]:
        for b in s["blocks"]:
            if "interactions" in b: assert all(len(r) == 3 for r in b["interactions"]["rows"]), d["slug"]
    assert all(len(f) == 2 for f in d["facts"]) and all(len(f) == 2 for f in d["faq"]), d["slug"]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{d['slug']}.json").write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    return d

def P(onset, duration, half, naloxone, dependence, medical, groups):
    """Comparison profile used by the compare tool and the combination checker."""
    return {"onset": onset, "duration": duration, "half_life": half, "naloxone": naloxone,
            "dependence": dependence, "medical": medical, "groups": groups}
