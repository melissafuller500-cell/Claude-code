"""Stage 4 for the DoseUses build: performance and meta fixes.

- Moves the script shared by every page (plus the header and contact scripts) into assets/site.js,
  loaded with defer and cached, and the search index into assets/search-index.json, fetched the
  first time someone types in a search box.
- Progress bar: no layout reads during scroll, animates with transform (composited).
- Adds twitter:title / twitter:description; sets the homepage description; fetchpriority on hero art.

usage: python3 -I stage4.py <site_dir>
"""
import glob
import hashlib
import json
import os
import re
import sys

os.chdir(sys.argv[1])

HOME_DESC = ("Xanax, Adderall, oxycodone and 50+ controlled meds: uses, dosage, side effects, withdrawal, "
             "and how to get a prescription online and buy legally for less.")

MAIN_RE = re.compile(r"<script>(\(function\(\)\{\nvar d=document;.*?)</script>", re.S)
NAV_RE = re.compile(r"<script>(\(function\(\)\{var d=document;function all\(s\).*?)</script>", re.S)
CONTACT_RE = re.compile(r"<script>(\(function\(\)\{\[\]\.forEach\.call\(document\.querySelectorAll\('form\[action=.*?)</script>", re.S)
INDEX_RE = re.compile(r'<script type="application/json" id="search-index">(.*?)</script>\n?', re.S)

OLD_PROG = ("if(bar){var up=function(){var h=d.documentElement,m=h.scrollHeight-h.clientHeight;"
            "bar.style.width=(m>0?h.scrollTop/m*100:0)+'%'};addEventListener('scroll',up,{passive:true});up()}")
NEW_PROG = ("if(bar){var max=0,tick=0;function measure(){var h=d.documentElement;max=h.scrollHeight-h.clientHeight}"
            "function paint(){tick=0;bar.style.transform='scaleX('+(max>0?Math.min(1,scrollY/max):0)+')'}"
            "function on(){if(!tick)tick=requestAnimationFrame(paint)}"
            "addEventListener('scroll',on,{passive:true});"
            "addEventListener('resize',function(){measure();on()});addEventListener('load',function(){measure();on()});"
            "requestAnimationFrame(function(){measure();paint()})}")
OLD_SRC = "var src=d.getElementById('search-index');if(!src)return;\nvar idx=JSON.parse(src.textContent);"
NEW_SRC = ("if(!d.querySelector('.find'))return;\n"
           "var idx=null,loading=null;function load(cb){if(idx)return cb();"
           "if(!loading)loading=fetch('/assets/search-index.json?v=__IDXV__').then(function(r){return r.json()})"
           ".then(function(j){idx=j});loading.then(cb,function(){})}")
OLD_SHOW = "if(!v){hide();return}"
NEW_SHOW = "if(!v){hide();return}\nif(!idx){load(show);return}"
OLD_FOCUS = "q.addEventListener('input',show);q.addEventListener('focus',show);"
NEW_FOCUS = "q.addEventListener('input',show);q.addEventListener('focus',function(){load(function(){});show()});"

OLD_PROG_CSS = ".prog i{display:block;height:100%;width:0;"
NEW_PROG_CSS = ".prog i{display:block;height:100%;width:100%;transform:scaleX(0);transform-origin:0 50%;will-change:transform;"


def prefix_for(path):
    if path == "404.html":
        return "/"
    depth = path.count("/")
    return "../" * depth if depth else "./"


def meta_content(s, attr):
    m = re.search(rf'<meta {attr} content="([^"]*)"', s)
    return m.group(1) if m else None


files = sorted(glob.glob("**/*.html", recursive=True))
sample = open("drugs/alprazolam/index.html", encoding="utf-8").read()

# Shared search index with root-relative links.
items = json.loads(INDEX_RE.search(sample).group(1))
for it in items:
    it["u"] = "/" + re.sub(r"^(\.\./)+|^\./", "", it["u"])
index_json = json.dumps(items, separators=(",", ":"), ensure_ascii=False)
open("assets/search-index.json", "w", encoding="utf-8").write(index_json)
idxv = hashlib.sha1(index_json.encode()).hexdigest()[:8]

main = MAIN_RE.search(sample).group(1)
for old, new in ((OLD_PROG, NEW_PROG), (OLD_SRC, NEW_SRC), (OLD_SHOW, NEW_SHOW), (OLD_FOCUS, NEW_FOCUS)):
    assert old in main, old[:50]
    main = main.replace(old, new)
main = main.replace("__IDXV__", idxv)
js = "\n".join([main, NAV_RE.search(sample).group(1), CONTACT_RE.search(sample).group(1)]) + "\n"
open("assets/site.js", "w", encoding="utf-8").write(js)
jsv = hashlib.sha1(js.encode()).hexdigest()[:8]

stats = {"pages": 0, "twitter": 0, "before": 0, "after": 0}
for f in files:
    s = open(f, encoding="utf-8").read()
    stats["before"] += len(s)
    p = prefix_for(f)
    if "assets/site.js" not in s:
        s = INDEX_RE.sub("", s, count=1)
        s = MAIN_RE.sub("", s, count=1)
        s = NAV_RE.sub("", s, count=1)
        s = CONTACT_RE.sub("", s, count=1)
        s = s.replace("</body>", f'<script src="{p}assets/site.js?v={jsv}" defer></script>\n</body>', 1)
        s = s.replace(OLD_PROG_CSS, NEW_PROG_CSS)
        s = s.replace(".hero-art svg{animation:float", ".hero-art svg{will-change:transform;animation:float")
        stats["pages"] += 1

    if f == "index.html":
        old = meta_content(s, 'name="description"')
        s = s.replace(f'content="{old}"', f'content="{HOME_DESC}"')

    if 'name="twitter:title"' not in s and 'name="twitter:card"' in s:
        title = meta_content(s, 'property="og:title"') or re.search(r"<title>(.*?)</title>", s).group(1)
        desc = meta_content(s, 'property="og:description"') or meta_content(s, 'name="description"') or ""
        tags = f'<meta name="twitter:title" content="{title}">\n<meta name="twitter:description" content="{desc}">\n'
        s = re.sub(r'(<meta name="twitter:card"[^>]*>\n?)', lambda m: m.group(1) + tags, s, count=1)
        stats["twitter"] += 1

    s = re.sub(r'(<img src="\.\./\.\./assets/img/drugs/[^"]+\.svg" alt="[^"]*" width="216" height="216")>',
               r'\1 fetchpriority="high">', s)
    open(f, "w", encoding="utf-8").write(s)
    stats["after"] += len(s)
print(stats, {"site.js": len(js), "search-index.json": len(index_json)})
