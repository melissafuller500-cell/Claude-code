"""Shared helpers and reusable text blocks for new drug records.

Text fields may contain citation tokens:
  [^1], [^2] ...  -> the drug's own sources (1-based, in the order listed)
  [^dea], [^tele] -> generic sources defined in GENERIC_SOURCES
The renderer numbers every cited source in order and builds the Sources list.
"""

DAILYMED = "https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query="


def label(brand, generic, query=None):
    q = (query or generic).replace(" ", "+")
    return (f"{brand} ({generic}) prescription information" if brand else f"{generic} prescribing information",
            DAILYMED + q, "DailyMed, US National Library of Medicine.")


GENERIC_SOURCES = {
    "dea": ("Controlled Substance Schedules", "https://www.deadiversion.usdoj.gov/schedules/", "DEA Diversion Control Division."),
    "refill34": ("21 CFR 1306.22, Refilling of prescriptions (Schedules III and IV)", "https://www.ecfr.gov/current/title-21/chapter-II/part-1306/section-1306.22", "Electronic Code of Federal Regulations."),
    "refill2": ("21 CFR 1306.12, Refilling prescriptions; issuance of multiple prescriptions (Schedule II)", "https://www.ecfr.gov/current/title-21/chapter-II/part-1306/section-1306.12", "Electronic Code of Federal Regulations."),
    "tele": ("Prescribing controlled substances via telehealth", "https://telehealth.hhs.gov/providers/telehealth-policy/prescribing-controlled-substances-via-telehealth", "US Department of Health and Human Services."),
    "besafe": ("BeSafeRx: Your Source for Online Pharmacy Information", "https://www.fda.gov/drugs/quick-tips-buying-medicines-over-internet/besaferx-your-source-online-pharmacy-information", "US Food and Drug Administration."),
    "nabp": ("Safe Pharmacy", "https://safe.pharmacy/", "National Association of Boards of Pharmacy."),
    "onepill": ("One Pill Can Kill", "https://www.dea.gov/onepill", "US Drug Enforcement Administration."),
    "unodc": ("International drug control conventions", "https://www.unodc.org/unodc/en/commissions/CND/conventions.html", "United Nations Office on Drugs and Crime."),
    "samhsa": ("National Helpline", "https://www.samhsa.gov/find-help/helplines/national-helpline", "Substance Abuse and Mental Health Services Administration."),
    "findtx": ("FindTreatment.gov", "https://findtreatment.gov/", "Substance Abuse and Mental Health Services Administration."),
    "naloxone": ("Information about naloxone and nalmefene", "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/information-about-naloxone", "US Food and Drug Administration."),
    "possession": ("21 U.S.C. 844, Penalties for simple possession", "https://www.law.cornell.edu/uscode/text/21/844", "Legal Information Institute, Cornell Law School."),
    "trafficking": ("21 U.S.C. 841, Prohibited acts A (trafficking penalties)", "https://www.law.cornell.edu/uscode/text/21/841", "Legal Information Institute, Cornell Law School."),
    "cdcopioid": ("CDC Clinical Practice Guideline for Prescribing Opioids for Pain, 2022", "https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm", "Centers for Disease Control and Prevention, MMWR."),
    "opibenzo": ("FDA warns about serious risks and death when combining opioid pain or cough medicines with benzodiazepines", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-warns-about-serious-risks-and-death-when-combining-opioid-pain-or", "US Food and Drug Administration, 2016."),
    "benzobox": ("FDA requiring Boxed Warning updated to improve safe use of benzodiazepine drug class", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-requiring-boxed-warning-updated-improve-safe-use-benzodiazepine-drug-class", "US Food and Drug Administration, 2020."),
    "asam": ("Joint Clinical Practice Guideline on Benzodiazepine Tapering", "https://www.asam.org/quality-care/clinical-guidelines/benzodiazepine-tapering", "American Society of Addiction Medicine, 2025."),
    "sleepbox": ("FDA adds Boxed Warning for risk of serious injuries caused by sleepwalking with certain prescription insomnia medicines", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-adds-boxed-warning-risk-serious-injuries-caused-sleepwalking-certain-prescription-insomnia", "US Food and Drug Administration, 2019."),
    "stimbox": ("FDA updating warnings to improve safe use of prescription stimulants used to treat ADHD and other conditions", "https://www.fda.gov/drugs/drug-safety-and-availability/fda-updating-warnings-improve-safe-use-prescription-stimulants-used-treat-adhd-and-other-conditions", "US Food and Drug Administration, 2023."),
    "nidapsy": ("Psychedelic and Dissociative Drugs", "https://nida.nih.gov/research-topics/psychedelic-dissociative-drugs-medicines", "National Institute on Drug Abuse."),
    "hemp": ("New federal restrictions on hemp and hemp-derived products", "https://www.dlapiper.com/insights/publications/2025/11/new-federal-restrictions-on-hemp-and-hemp-derived-products", "DLA Piper, November 2025."),
    "steroids": ("Anabolic Steroids", "https://medlineplus.gov/anabolicsteroids.html", "MedlinePlus, US National Library of Medicine."),
    "nidasteroids": ("Anabolic Steroids", "https://nida.nih.gov/research-topics/anabolic-steroids", "National Institute on Drug Abuse."),
    "otc": ("Understanding Over-the-Counter Medicines", "https://www.fda.gov/drugs/buying-using-medicine-safely/understanding-over-counter-medicines", "US Food and Drug Administration."),
}

# Standard opioid withdrawal timeline (wording matches existing Dosepedia profiles)
def opioid_tl(early="12 to 24 hours", peak="Days 2 to 4", late="1 to 2 weeks"):
    return [
        (early, "Early symptoms", "Anxiety, restlessness, yawning, sweating, runny nose, watery eyes, and muscle aches."),
        (peak, "Peak withdrawal", "Diarrhea, stomach cramps, nausea and vomiting, goosebumps, dilated pupils, fast heartbeat, and strong cravings. Rarely dangerous in healthy adults, but dehydration can be serious."),
        (late, "Lingering symptoms", "Poor sleep, low mood, low energy, and cravings can continue for weeks. Tolerance falls quickly, which raises the risk of overdose if use restarts."),
    ]


def opioid_withdrawal(name, early="12 to 24 hours", peak="Days 2 to 4", late="1 to 2 weeks", extra=None):
    w = {
        "intro": f"People who take {name} regularly for more than a few weeks become physically dependent, even when they take it exactly as prescribed. Dependence is not the same as addiction, but it means stopping suddenly causes withdrawal.[^1]",
        "tl": opioid_tl(early, peak, late),
        "warn": f"After a break, the body loses tolerance within days. Returning to a previous dose of {name} can cause a fatal overdose.",
        "after": ["The FDA warns against stopping opioids abruptly in people who are physically dependent. A prescriber can taper the dose gradually, often by 10% or less per month for long-term users, and medicines such as clonidine or lofexidine can ease symptoms. For opioid use disorder, buprenorphine and methadone cut the risk of death roughly in half.[^cdcopioid]"],
    }
    if extra:
        w["after"].append(extra)
    return w


def benzo_tl(start="Days 1 to 3"):
    return [
        (start, "Symptoms begin", "Rebound anxiety, insomnia, restlessness, sweating, and tremor."),
        ("Weeks 1 to 4", "Acute withdrawal", "Panic, irritability, muscle pain, nausea, sensitivity to light and sound, and in severe cases seizures or delirium."),
        ("Months", "Protracted symptoms in some people", "A minority have lingering anxiety, poor sleep, low mood, or tingling that can last weeks to more than 12 months."),
    ]


def benzo_withdrawal(name, start="Days 1 to 3", note=""):
    return {
        "intro": f"People who take {name} regularly, even as prescribed, can become physically dependent within weeks. {note}".strip() + "[^benzobox]",
        "tl": benzo_tl(start),
        "warn": f"Stopping {name} abruptly after regular use can cause seizures. The dose should be reduced gradually under the care of a prescriber.",
        "after": ["A 2025 joint guideline led by the American Society of Addiction Medicine advises tapering gradually, usually by 5% to 10% every 2 to 4 weeks and rarely faster than 25% every 2 weeks, adjusted to how the person feels.[^asam]"],
    }


OPIOID_BOXED = [
    "Addiction, abuse, and misuse, which can lead to overdose and death.",
    "Life-threatening slowed breathing, especially when starting treatment or after a dose increase.",
    "Accidental ingestion, especially by children, can cause a fatal overdose.",
    "Use with benzodiazepines or other central nervous system depressants, including alcohol, can cause profound sedation, slowed breathing, coma, and death.[^opibenzo]",
    "Prolonged use during pregnancy can cause neonatal opioid withdrawal syndrome, which may be life-threatening if not recognized and treated.",
]

BENZO_BOXED = [
    "Use with opioids can cause profound sedation, slowed breathing, coma, and death.[^opibenzo]",
    "Abuse, misuse, and addiction, which can lead to overdose and death, especially with alcohol, opioids, or other drugs.[^benzobox]",
    "Physical dependence: stopping suddenly or reducing the dose quickly can cause life-threatening withdrawal reactions, including seizures.",
]

OPIOID_INTER = [
    ("Benzodiazepines (alprazolam, diazepam, clonazepam)", "Profound sedation, slowed breathing, coma, death", "Boxed warning; avoid unless no alternative"),
    ("Alcohol", "Stronger sedation and slowed breathing", "Avoid"),
    ("Gabapentin, pregabalin, sleep medicines, muscle relaxants", "Additive sedation and breathing problems", "Use caution; lower doses"),
]

BENZO_INTER = [
    ("Opioids (oxycodone, hydrocodone, fentanyl, heroin)", "Profound sedation, slowed breathing, coma, death", "Boxed warning; avoid unless no alternative"),
    ("Alcohol", "Deeper sedation, blackouts, slowed breathing", "Avoid"),
    ("Other sedatives (sleep medicines, gabapentinoids, muscle relaxants, antihistamines)", "Additive drowsiness and impaired coordination", "Use caution"),
]
