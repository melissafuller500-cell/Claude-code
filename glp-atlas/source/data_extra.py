# Keyword expansion: aliases per drug, pillar (head-term) pages, question pages, glossary.

# Alternate names, international brands, common misspellings and search phrases.
# Rendered as an "Also searched as" line, in <meta name="keywords"> and as schema alternateName.
ALIASES = {
"ozempic": ["Ozempic pen","Ozempic shot","Ozempic injection","Ozempik","Ozempics","Ozempic semaglutide","semaglutide injection","semaglitude","semiglutide","semaglutid","Ozempic for diabetes","Ozempic 0.25 mg","Ozempic 0.5 mg","Ozempic 1 mg","Ozempic 2 mg","generic Ozempic","Ozempic price","Ozempic cost","buy Ozempic"],
"ozempic-tablets": ["Ozempic pill","Ozempic tablet","oral Ozempic","Rybelsus","Rybelsus 3 mg","Rybelsus 7 mg","Rybelsus 14 mg","oral semaglutide","semaglutide tablets","semaglutide pill","Rybelsis","Rybelus"],
"wegovy": ["Wegovy pen","Wegovy shot","Wegovy injection","Wegovy HD","Wegovy 7.2 mg","Wegovy 2.4 mg","Wegovey","Wegovi","Wegovy semaglutide","semaglutide for weight loss","weight loss injection","weight loss shot","Wegovy price","Wegovy cost","buy Wegovy","Wegovy NovoCare"],
"wegovy-pill": ["Wegovy tablet","oral Wegovy","Wegovy 25 mg","weight loss pill semaglutide","Wegovy pill price","Wegovy pill side effects","Wegovy pills"],
"mounjaro": ["Mounjaro pen","Mounjaro shot","Mounjaro injection","Monjaro","Mounjauro","Mounjaro tirzepatide","tirzepatide injection","tirzepatid","terzepatide","Mounjaro for weight loss","Mounjaro price","Mounjaro KwikPen"],
"zepbound": ["Zepbound pen","Zepbound vial","Zepbound injection","Zepbond","Zepboud","Zepbound tirzepatide","tirzepatide for weight loss","Zepbound price","Zepbound cost","Zepbound LillyDirect","Zepbound sleep apnea","buy Zepbound"],
"foundayo": ["orforglipron","Foundayo pill","Foundayo tablet","Lilly weight loss pill","Foundayo price","Foundayo side effects","orforglipron price","Fondayo","Foundyo"],
"victoza": ["liraglutide","generic liraglutide","Victoza pen","Victosa","liraglutide injection"],
"saxenda": ["Saxenda pen","generic Saxenda","liraglutide 3 mg","liraglutide for weight loss","Saxsenda","Saxenda price"],
"trulicity": ["dulaglutide","Trulicity pen","Truclicity","Trulicty","Trulicity 4.5 mg","Trulicity price"],
"byetta-bydureon": ["Byetta","Bydureon","Bydureon BCise","exenatide","exenatide weekly","Byeta"],
"soliqua": ["lixisenatide","Adlyxin","insulin glargine and lixisenatide","Soliqua pen"],
"xultophy": ["insulin degludec and liraglutide","Xultophy pen","IDegLira"],
"insulin-lispro": ["Humalog","Admelog","Lyumjev","Humalog KwikPen","lispro","mealtime insulin","rapid-acting insulin"],
"insulin-aspart": ["NovoLog","NovoRapid","Fiasp","aspart","NovoLog FlexPen","fast-acting insulin"],
"insulin-glulisine": ["Apidra","glulisine","Apidra SoloStar"],
"regular-insulin": ["Humulin R","Novolin R","regular insulin","short-acting insulin","U-500 insulin","over the counter insulin"],
"nph-insulin": ["Humulin N","Novolin N","NPH","intermediate-acting insulin","cloudy insulin"],
"insulin-glargine": ["Lantus","Basaglar","Semglee","Rezvoglar","Toujeo","Lantus SoloStar","long-acting insulin","basal insulin","Levemir replacement","insulin glargine biosimilar"],
"insulin-degludec": ["Tresiba","degludec","Tresiba FlexTouch","ultra long-acting insulin"],
"insulin-icodec": ["Awiqli","icodec","weekly insulin","once weekly insulin","insulin icodec-abae"],
"premixed-insulin": ["Humalog Mix 75/25","NovoLog Mix 70/30","Humulin 70/30","Novolin 70/30","70/30 insulin","mixed insulin"],
"symlin": ["pramlintide","SymlinPen","amylin"],
"glucagon": ["GlucaGen","Gvoke","Baqsimi","Zegalogue","dasiglucagon","glucagon pen","nasal glucagon","emergency glucagon"],
"cagrisema": ["cagrilintide","cagrilintide semaglutide","CagriSema approval","CagriSema release date","Cagri Sema"],
"retatrutide": ["retatrutide FDA approval","retatrutide release date","triple G","retatrutide results","Retatrutid","reta"],
}

# Head-term pillar pages. "drugs" = slugs listed as cards; body = HTML.
PILLARS = [
{"slug":"semaglutide","title":"Semaglutide: every brand, dose, use and price (2026)","h1":"Semaglutide — the complete guide",
 "desc":"Semaglutide explained: Ozempic, Wegovy, Wegovy HD, Wegovy pill and Ozempic tablets — uses, doses, side effects, generics and cost in the US and Canada.",
 "kw":["semaglutide","semaglutide injection","semaglutide pill","semaglutide for weight loss","semaglutide dosage","semaglutide side effects","semaglutide cost","generic semaglutide","semaglutide brands","semaglitude"],
 "drugs":["ozempic","ozempic-tablets","wegovy","wegovy-pill","cagrisema"],
 "body":"""<p>Semaglutide is a GLP-1 receptor agonist made by Novo Nordisk. It mimics a gut hormone that raises insulin release after meals, lowers glucagon, slows stomach emptying and reduces appetite.</p>
<h2>Semaglutide brands</h2><table class="t"><thead><tr><th>Brand</th><th>Form</th><th>Approved for (US)</th></tr></thead><tbody>
<tr><td><a href="/drugs/ozempic/">Ozempic</a></td><td>Weekly injection, 0.25–2 mg</td><td>Type 2 diabetes; heart and kidney risk reduction</td></tr>
<tr><td><a href="/drugs/ozempic-tablets/">Ozempic tablets</a> (formerly Rybelsus)</td><td>Daily tablet, 1.5/4/9 mg</td><td>Type 2 diabetes</td></tr>
<tr><td><a href="/drugs/wegovy/">Wegovy</a> / Wegovy HD</td><td>Weekly injection, up to 2.4 mg or 7.2 mg</td><td>Weight management; heart risk; MASH</td></tr>
<tr><td><a href="/drugs/wegovy-pill/">Wegovy pill</a></td><td>Daily tablet, up to 25 mg</td><td>Weight management</td></tr></tbody></table>
<h2>Is there generic semaglutide?</h2><p>In Canada, yes — Health Canada authorized generics in April, May and June 2026. In the US, no FDA-approved generic exists; key patents run into the early 2030s. Compounded and "research" semaglutide are not approved products.</p>
<h2>How long does semaglutide stay in your body?</h2><p>Its half-life is about one week, so it takes roughly five weeks after the last weekly dose to leave the body.</p>"""},
{"slug":"tirzepatide","title":"Tirzepatide: Mounjaro and Zepbound explained (2026)","h1":"Tirzepatide — Mounjaro and Zepbound",
 "desc":"Tirzepatide (Mounjaro, Zepbound): how the dual GIP/GLP-1 drug works, doses, results, side effects, vials vs pens and cost.",
 "kw":["tirzepatide","tirzepatide injection","tirzepatide for weight loss","tirzepatide dosage","tirzepatide vs semaglutide","tirzepatide cost","terzepatide","tirzepatid"],
 "drugs":["mounjaro","zepbound","retatrutide"],
 "body":"""<p>Tirzepatide, made by Eli Lilly, activates two gut-hormone receptors — GIP and GLP-1. It is sold as <a href="/drugs/mounjaro/">Mounjaro</a> for type 2 diabetes and <a href="/drugs/zepbound/">Zepbound</a> for weight management and obstructive sleep apnea in the US.</p>
<h2>Doses</h2><p>Both start at 2.5 mg weekly for 4 weeks, rise to 5 mg, then by 2.5 mg steps every 4 weeks or more, up to 15 mg weekly.</p>
<h2>Tirzepatide vs semaglutide</h2><p>In head-to-head research tirzepatide produced more average weight loss than semaglutide 2.4 mg. See <a href="/compare/wegovy-vs-zepbound/">Wegovy vs Zepbound</a>.</p>
<h2>Birth control</h2><p>Tirzepatide can make oral contraceptives less effective. The label advises switching to a non-oral method or adding a barrier method for 4 weeks after starting and for 4 weeks after each dose increase.</p>"""},
{"slug":"diabetes-injections","title":"Diabetes injections: the full list for type 2 and type 1 diabetes","h1":"Diabetes injections — every option",
 "desc":"Complete list of diabetes injections in 2026: GLP-1s (Ozempic, Mounjaro, Trulicity, Victoza), insulins (Lantus, Humalog, Tresiba, Awiqli), combinations and glucagon.",
 "kw":["diabetes injections","type 2 diabetes injections","weekly diabetes injection","diabetes shot","diabetic injections list","insulin injections","non-insulin diabetes injections","diabetes pen"],
 "drugs":["ozempic","mounjaro","trulicity","victoza","soliqua","xultophy","insulin-glargine","insulin-degludec","insulin-icodec","insulin-lispro","insulin-aspart","symlin","glucagon"],
 "body":"""<h2>Non-insulin injections (GLP-1 and dual agonists)</h2><p>Weekly: <a href="/drugs/ozempic/">Ozempic</a>, <a href="/drugs/mounjaro/">Mounjaro</a>, <a href="/drugs/trulicity/">Trulicity</a>, Bydureon BCise. Daily: <a href="/drugs/victoza/">Victoza / liraglutide</a>. These lower blood sugar and often body weight, with low risk of hypoglycemia on their own.</p>
<h2>Insulins</h2><p>Basal (long-acting): <a href="/drugs/insulin-glargine/">glargine</a>, <a href="/drugs/insulin-degludec/">degludec</a>, and the once-weekly <a href="/drugs/insulin-icodec/">Awiqli</a>. Mealtime: <a href="/drugs/insulin-lispro/">lispro</a>, <a href="/drugs/insulin-aspart/">aspart</a>, <a href="/drugs/insulin-glulisine/">glulisine</a>. Human insulins: <a href="/drugs/regular-insulin/">regular</a>, <a href="/drugs/nph-insulin/">NPH</a>, <a href="/drugs/premixed-insulin/">premixed</a>.</p>
<h2>Combinations</h2><p><a href="/drugs/soliqua/">Soliqua</a> (glargine + lixisenatide) and <a href="/drugs/xultophy/">Xultophy</a> (degludec + liraglutide).</p>
<h2>Other</h2><p><a href="/drugs/symlin/">Symlin</a> (pramlintide) with mealtime insulin, and <a href="/drugs/glucagon/">glucagon</a> for emergencies.</p>"""},
{"slug":"weight-loss-injections","title":"Weight loss injections and pills approved in 2026","h1":"Weight loss injections and pills",
 "desc":"Every FDA-approved weight loss injection and GLP-1 pill in 2026: Wegovy, Wegovy HD, Zepbound, Saxenda, Wegovy pill and Foundayo — results, doses and cost.",
 "kw":["weight loss injections","weight loss shots","weight loss injection names","best weight loss injection","GLP-1 weight loss","weight loss pill","GLP-1 pill","skinny jab","fat loss injection"],
 "drugs":["wegovy","zepbound","saxenda","wegovy-pill","foundayo","cagrisema","retatrutide"],
 "body":"""<table class="t"><thead><tr><th>Medicine</th><th>Type</th><th>How often</th></tr></thead><tbody>
<tr><td><a href="/drugs/zepbound/">Zepbound</a></td><td>Tirzepatide injection</td><td>Weekly</td></tr>
<tr><td><a href="/drugs/wegovy/">Wegovy / Wegovy HD</a></td><td>Semaglutide injection</td><td>Weekly</td></tr>
<tr><td><a href="/drugs/saxenda/">Saxenda</a> (generic available)</td><td>Liraglutide injection</td><td>Daily</td></tr>
<tr><td><a href="/drugs/wegovy-pill/">Wegovy pill</a></td><td>Oral semaglutide</td><td>Daily, fasting</td></tr>
<tr><td><a href="/drugs/foundayo/">Foundayo</a></td><td>Orforglipron tablet</td><td>Daily, any time</td></tr></tbody></table>
<p>Ozempic and Mounjaro are diabetes brands; prescribing them for weight loss is off-label. CagriSema and retatrutide are not approved.</p>
<h2>Who qualifies?</h2><p>US labels cover adults with a BMI of 30 or more, or 27 or more with a weight-related condition such as high blood pressure, type 2 diabetes or high cholesterol. Some products are also approved for adolescents.</p>"""},
{"slug":"insulin","title":"Insulin types, brands and prices: a complete guide","h1":"Insulin — types, brands and how they differ",
 "desc":"All insulin types explained: rapid, short, intermediate, long-acting, once-weekly and premixed — brands, timing, storage and $35 cost programs.",
 "kw":["insulin types","insulin brands","long acting insulin","rapid acting insulin","insulin chart","insulin cost","cheapest insulin","insulin pen","weekly insulin"],
 "drugs":["insulin-lispro","insulin-aspart","insulin-glulisine","regular-insulin","nph-insulin","insulin-glargine","insulin-degludec","insulin-icodec","premixed-insulin"],
 "body":"""<table class="t"><thead><tr><th>Type</th><th>Examples</th><th>Role</th></tr></thead><tbody>
<tr><td>Rapid-acting</td><td>Humalog, Admelog, Lyumjev, NovoLog, Fiasp, Apidra</td><td>Mealtime</td></tr>
<tr><td>Short-acting</td><td>Humulin R, Novolin R</td><td>Mealtime</td></tr>
<tr><td>Intermediate</td><td>Humulin N, Novolin N</td><td>Basal</td></tr>
<tr><td>Long-acting</td><td>Lantus, Basaglar, Semglee, Rezvoglar, Toujeo, Tresiba</td><td>Basal, daily</td></tr>
<tr><td>Once-weekly</td><td>Awiqli (US approval March 2026)</td><td>Basal, weekly</td></tr>
<tr><td>Premixed</td><td>Humalog Mix 75/25, NovoLog Mix 70/30, 70/30</td><td>Basal + mealtime</td></tr></tbody></table>
<p>Never switch insulin type, brand or concentration without your prescriber.</p>"""},
]

# Question pages: (slug, question, short answer HTML, related drug slugs, extra keywords)
QUESTIONS = [
("ozempic-missed-dose","What if I miss an Ozempic dose?","<p>Take it as soon as possible within 5 days of the missed dose. If more than 5 days have passed, skip it and take the next dose on your usual day. Never take two doses to catch up.</p>",["ozempic"],["missed Ozempic dose","forgot Ozempic"]),
("wegovy-missed-dose","What if I miss a Wegovy dose?","<p>If the next scheduled dose is more than 2 days away, take the missed dose as soon as possible. If it is less than 2 days away, skip it. If you miss more than 2 weeks, contact your prescriber — you may need to restart at a lower dose.</p>",["wegovy"],["missed Wegovy dose","forgot Wegovy injection"]),
("zepbound-missed-dose","What if I miss a Zepbound or Mounjaro dose?","<p>Take it within 4 days (96 hours) of the missed dose. If more than 4 days have passed, skip it and take the next dose on your regular day.</p>",["zepbound","mounjaro"],["missed Zepbound dose","missed Mounjaro dose"]),
("trulicity-missed-dose","What if I miss a Trulicity dose?","<p>Take it if there are at least 3 days (72 hours) until your next scheduled dose; otherwise skip it and take the next one on schedule.</p>",["trulicity"],["missed Trulicity dose"]),
("alcohol-on-glp1","Can you drink alcohol on Ozempic, Wegovy or Zepbound?","<p>The labels do not ban alcohol, but alcohol can worsen nausea and, with insulin or sulfonylureas, raise the risk of low blood sugar. Heavy drinking also raises pancreatitis risk. Ask your prescriber what is safe for you.</p>",["ozempic","wegovy","zepbound"],["Ozempic and alcohol","Wegovy alcohol","Zepbound alcohol"]),
("how-long-semaglutide-stays-in-system","How long does semaglutide stay in your system?","<p>Semaglutide has a half-life of about one week, so it takes about five weeks after the last weekly injection to leave the body. Effects on appetite fade over that period.</p>",["ozempic","wegovy"],["how long does Ozempic stay in your system","Wegovy half-life"]),
("how-long-tirzepatide-stays-in-system","How long does tirzepatide stay in your system?","<p>Tirzepatide's half-life is about 5 days; it takes roughly 25–30 days after the last dose to clear.</p>",["zepbound","mounjaro"],["how long does Mounjaro stay in your system","Zepbound half-life"]),
("ozempic-face","What is 'Ozempic face'?","<p>A popular term for a hollow or aged facial look after rapid weight loss. It is caused by loss of facial fat, not by a direct effect of the drug, and can happen with any large weight loss.</p>",["ozempic","wegovy"],["Ozempic face","Wegovy face"]),
("glp1-hair-loss","Does Wegovy or Zepbound cause hair loss?","<p>Hair loss was reported more often than with placebo in weight-loss trials, mostly in people who lost a lot of weight quickly. It is usually temporary shedding linked to rapid weight loss.</p>",["wegovy","zepbound","foundayo"],["Ozempic hair loss","Zepbound hair loss"]),
("what-happens-when-you-stop-glp1","What happens when you stop Wegovy or Zepbound?","<p>Appetite returns over a few weeks and most people regain a large share of lost weight within a year, as shown in withdrawal studies. Blood sugar may rise in people with diabetes. Plan any stop with your prescriber.</p>",["wegovy","zepbound"],["stopping Ozempic","coming off Wegovy","weight regain after Zepbound"]),
("glp1-pregnancy","Can you take Ozempic or Wegovy while pregnant or trying to conceive?","<p>No. Semaglutide should be stopped at least 2 months before a planned pregnancy because of its long half-life. Tirzepatide can reduce oral contraceptive effectiveness. Talk to your prescriber before trying to conceive.</p>",["wegovy","ozempic","zepbound"],["Ozempic pregnancy","Wegovy and pregnancy","Mounjaro birth control"]),
("glp1-injection-sites","Where do you inject Ozempic, Wegovy or Zepbound?","<p>Under the skin of the stomach (at least 2 inches from the belly button), the front of the thigh, or the back of the upper arm (usually by someone else). Rotate sites each week.</p>",["ozempic","wegovy","zepbound"],["where to inject Ozempic","Wegovy injection site"]),
("glp1-constipation-nausea","How to manage nausea and constipation on GLP-1 medicines","<p>Eat smaller meals, stop when full, avoid greasy or very sweet foods, drink fluids and increase fibre gradually. Persistent vomiting, severe pain or signs of dehydration need medical attention.</p>",["wegovy","zepbound","ozempic"],["Ozempic nausea","Wegovy constipation","Zepbound side effects relief"]),
("what-is-glp1","What is a GLP-1 agonist?","<p>A medicine that mimics glucagon-like peptide-1, a gut hormone released after eating. GLP-1 agonists raise insulin when blood sugar is high, lower glucagon, slow stomach emptying and reduce appetite. Examples: semaglutide, liraglutide, dulaglutide; tirzepatide also acts on GIP.</p>",["ozempic","zepbound","foundayo"],["GLP-1 meaning","what are GLP-1 drugs","GLP-1 list"]),
("semaglutide-vs-tirzepatide","Semaglutide vs tirzepatide: which is stronger?","<p>Tirzepatide (Zepbound, Mounjaro) produced more average weight loss than semaglutide 2.4 mg (Wegovy) in head-to-head research. Semaglutide has more labeled outcome indications (heart, kidney, MASH). Wegovy HD 7.2 mg narrows the gap.</p>",["wegovy","zepbound"],["semaglutide or tirzepatide","Ozempic vs Mounjaro weight loss"]),
("ozempic-off-label-weight-loss","Can Ozempic be prescribed for weight loss?","<p>Ozempic is approved for type 2 diabetes. Doctors may prescribe it off-label, but insurers often refuse coverage for that use. Wegovy is the semaglutide brand approved for weight management.</p>",["ozempic","wegovy"],["Ozempic for weight loss","Ozempic without diabetes"]),
("generic-semaglutide-us","When will generic semaglutide be available in the US?","<p>Not yet. Novo Nordisk's key US patents run into the early 2030s. Canada approved generics in 2026. Compounded semaglutide is not a generic and is not FDA-approved.</p>",["ozempic","wegovy"],["generic Ozempic USA","generic Wegovy release date"]),
("generic-ozempic-canada","Generic Ozempic in Canada: what to know","<p>Health Canada authorized generic semaglutide from Dr. Reddy's (April 28, 2026) and Apotex (May 1, 2026) for type 2 diabetes, and the first generic for weight management on June 29, 2026. Ask your pharmacist about substitution under your plan.</p>",["ozempic","wegovy"],["Canada generic semaglutide","generic Wegovy Canada","Apotex semaglutide","Dr Reddy's semaglutide"]),
("fake-ozempic-pens","How to spot fake Ozempic or Wegovy pens","<p>Buy only from licensed pharmacies, check that the label, lot number and expiry are intact and match the box, and report anything unusual. Pens sold without a prescription, through social media or WhatsApp, or labeled for another country are red flags. Report suspected fakes to FDA MedWatch or Health Canada.</p>",["ozempic","wegovy"],["counterfeit Ozempic","fake Wegovy","fake Mounjaro pen"]),
("compounded-semaglutide-legal","Is compounded semaglutide legal?","<p>Compounded drugs are not FDA-approved. Since the FDA removed semaglutide and tirzepatide from its shortage list, routine copying of the approved products by compounders is restricted, and the FDA has issued warning letters to sellers. 'Research use only' products are not for human use.</p>",["ozempic","zepbound"],["compounded semaglutide","compounded tirzepatide","research peptides semaglutide"]),
("glp1-how-long-to-work","How long does it take for Wegovy or Zepbound to work?","<p>Appetite often changes within the first weeks, but the starting doses are for tolerance, not full effect. Most weight loss happens over months as the dose rises; trials measured results at about 68–72 weeks.</p>",["wegovy","zepbound"],["Wegovy results timeline","Zepbound first month"]),
("glp1-food-list","What to eat on GLP-1 medicines","<p>Prioritise protein, vegetables, whole grains and fluids; eat small portions slowly. Limit fried, fatty and very sugary foods, which often worsen nausea. A dietitian can help protect muscle during weight loss.</p>",["wegovy","zepbound"],["Ozempic diet","Wegovy meal plan","foods to avoid on Mounjaro"]),
("glp1-travel-storage","How to store and travel with GLP-1 pens","<p>Keep unopened pens refrigerated (36–46°F / 2–8°C), never frozen. In use, most pens tolerate room temperature for a limited time (Ozempic up to 56 days; Wegovy up to 28 days; Zepbound and Mounjaro up to 21 days). Carry them in hand luggage with the prescription label.</p>",["ozempic","wegovy","zepbound"],["Ozempic storage","flying with Wegovy","Mounjaro out of fridge"]),
("hypoglycemia-signs","Signs of low blood sugar (hypoglycemia)","<p>Shakiness, sweating, fast heartbeat, hunger, confusion, irritability and blurred vision. Treat with 15 g of fast-acting sugar and recheck in 15 minutes. Severe lows need <a href=\"/drugs/glucagon/\">glucagon</a> and emergency help.</p>",["glucagon","insulin-glargine"],["low blood sugar symptoms","hypoglycemia treatment"]),
("how-to-use-insulin-pen","How to use an insulin pen","<p>Attach a new needle, prime with 2 units, dial the dose, inject at 90 degrees into the stomach or thigh, hold for about 10 seconds, then remove and discard the needle. Rotate sites. Never share pens.</p>",["insulin-glargine","insulin-lispro"],["insulin pen instructions","how to inject insulin"]),
("glp1-insurance-coverage","Does insurance cover Wegovy, Zepbound or Ozempic?","<p>Coverage depends on the plan and the diagnosis. Diabetes uses (Ozempic, Mounjaro) are widely covered; weight-management coverage varies and often needs prior authorization. Medicare arrangements announced in 2025 changed access for some beneficiaries; check your plan's formulary.</p>",["wegovy","zepbound","ozempic"],["does insurance cover Wegovy","Zepbound prior authorization","Medicare Wegovy"]),
("glp1-who-qualifies","Who qualifies for Wegovy or Zepbound?","<p>Adults with a BMI of 30 or more, or 27 or more with at least one weight-related condition (such as high blood pressure, type 2 diabetes or high cholesterol), under US labels. A prescriber also checks contraindications such as a family history of medullary thyroid cancer.</p>",["wegovy","zepbound","foundayo"],["Wegovy BMI requirement","who can take Zepbound"]),
("glp1-telehealth","How to choose a GLP-1 telehealth provider","<p>Choose services whose prescribers are licensed in your state, that do a real medical assessment, dispense FDA-approved products through licensed pharmacies, and are LegitScript-certified. Avoid services selling 'research' or unbranded vials without clear sourcing.</p>",["wegovy","zepbound"],["online Wegovy prescription","GLP-1 telehealth","weight loss doctor online"]),
]

GLOSSARY = [
("A1C","A blood test showing average blood sugar over about 3 months."),
("Basal insulin","Long-acting insulin that covers background needs between meals and overnight."),
("BMI","Body mass index — weight in kilograms divided by height in metres squared."),
("Boxed warning","The FDA's strongest label warning."),
("Compounded drug","A drug mixed by a pharmacy for a patient; not FDA-approved."),
("GIP","Glucose-dependent insulinotropic polypeptide — a gut hormone targeted by tirzepatide."),
("GLP-1","Glucagon-like peptide-1 — a gut hormone that raises insulin, lowers appetite and slows digestion."),
("Half-life","Time for the amount of a drug in the body to fall by half."),
("Hypoglycemia","Low blood sugar."),
("MASH","Metabolic dysfunction-associated steatohepatitis — a form of fatty liver disease."),
("MTC","Medullary thyroid carcinoma — the cancer named in GLP-1 boxed warnings."),
("Off-label","Use of a drug for a purpose not on its approved label."),
("Prior authorization","Insurer approval needed before a drug is covered."),
("Titration","Gradual dose increases to improve tolerance."),
]
