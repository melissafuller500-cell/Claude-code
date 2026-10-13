"""Stage 3 for the DoseUses build: Google tag, updated contact dialog and contact page form (AJAX send),
alt text on drug illustrations.

usage: python3 -I stage3.py <site_dir> <project_dir>
"""
import glob
import json
import os
import re
import sys

ROOT, PROJECT = sys.argv[1], sys.argv[2]
os.chdir(ROOT)

GTAG = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-W6QL588EEY"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-W6QL588EEY');
</script>"""

src = open(os.path.join(PROJECT, "src/contact.html"), encoding="utf-8").read()
DIALOG = re.search(r'<dialog class="dlg" id="contact".*?</dialog>', src, re.S).group(0)
FORM_INNER = re.search(r'<form method="post" action="/contact.php">(.*?)</form>', src, re.S).group(1)
PAGE_FORM_INNER = re.sub(r'<div class="dlg-head">.*?</div>', "", FORM_INNER, count=1, flags=re.S)
PAGE_INTRO = "We read every message and reply by email."

CSS = (".req{font-weight:400;color:var(--muted)}"
       ".dlg-msg{margin:0;font-size:.92rem;min-height:1.2em}"
       ".dlg-msg.ok{color:var(--brand);font-weight:700}"
       ".dlg-msg.err{color:var(--danger);font-weight:700}"
       ".send:disabled{opacity:.6;cursor:wait}")

# Sends any contact form in the background and shows the result in its status line.
JS = ("<script>(function(){[].forEach.call(document.querySelectorAll('form[action=\"/contact.php\"]'),function(f){"
      "var msg=f.querySelector('.dlg-msg'),btn=f.querySelector('.send'),pg=f.querySelector('[name=page]');"
      "if(!msg||!window.fetch)return;f.addEventListener('submit',function(e){e.preventDefault();"
      "if(pg&&!pg.value)pg.value=location.pathname;btn.disabled=true;msg.className='dlg-msg';msg.textContent='Sending...';"
      "fetch(f.action,{method:'POST',body:new FormData(f),headers:{'Accept':'application/json'}})"
      ".then(function(r){return r.json()}).then(function(r){msg.textContent=r.message;msg.classList.add(r.ok?'ok':'err');"
      "if(r.ok)f.reset()}).catch(function(){msg.textContent='Sorry, the message could not be sent. Please try again later.';"
      "msg.classList.add('err')}).then(function(){btn.disabled=false})})})})();</script>")
MARK = "<!-- contact:v2 -->"


def drug_alt(s):
    name = re.search(r'"nonProprietaryName":"([^"]+)"', s) or re.search(r'"@type":"Drug","@id":"[^"]*","name":"([^"]+)"', s)
    alt = re.search(r'"alternateName":(\[[^\]]*\])', s)
    if not name:
        return None
    brands = json.loads(alt.group(1)) if alt else []
    brand = f" ({brands[0]})" if brands and '"prescriptionStatus":"https://schema.org/PrescriptionOnly"' in s else ""
    return f"{name.group(1)}{brand} illustration"


stats = {"gtag": 0, "dialog": 0, "page_form": 0, "alt": 0}
for f in sorted(glob.glob("**/*.html", recursive=True)):
    s = open(f, encoding="utf-8").read()
    if "googletagmanager.com/gtag/js?id=G-W6QL588EEY" not in s:
        s = s.replace("<head>", "<head>\n" + GTAG, 1)
        stats["gtag"] += 1
    if MARK not in s:
        s, n = re.subn(r'<dialog class="dlg" id="contact".*?</dialog>', lambda m: DIALOG, s, count=1, flags=re.S)
        stats["dialog"] += n
        if f == "contact/index.html":
            s, n = re.subn(r'(<form class="form" method="post" action="/contact.php">).*?(</form>)',
                           lambda m: m.group(1) + PAGE_FORM_INNER + m.group(2), s, count=1, flags=re.S)
            s = s.replace('<p class="quick">Send a correction, a question about the site, or feedback. We read every message.</p>',
                          f'<p class="quick">{PAGE_INTRO}</p>')
            stats["page_form"] += n
        s = s.replace("</style>", CSS + "</style>", 1)
        s = s.replace("</body>", JS + MARK + "\n</body>", 1)
    if f.startswith("drugs/") and f != "drugs/index.html":
        alt = drug_alt(s)
        if alt:
            s, n = re.subn(r'(<img src="\.\./\.\./assets/img/drugs/[^"]+\.svg") alt=""', rf'\1 alt="{alt}"', s)
            stats["alt"] += n
    open(f, "w", encoding="utf-8").write(s)
print(stats)
