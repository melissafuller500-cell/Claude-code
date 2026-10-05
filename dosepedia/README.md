# Dosepedia

A static, plain-language reference site on prescription and controlled medicines.

## Build

```sh
pip install markdown
python3 build.py              # writes dist/
DOSEPEDIA_LINKS=files python3 build.py   # links end in index.html, for opening dist/ from disk
```

Preview locally: `cd dist && python3 -m http.server` and open http://localhost:8000.

## Content

- `data/substances/*.json` — 50 substance profiles. Each has a `kind`: `rx` (prescription medicine, with dosing, legal access, and online ordering sections), `nomed` (no US medical route: effects, US law and penalties, getting help), or `unregulated` (kratom, tianeptine, xylazine). Pages stay `noindex` and show a *Draft* badge until `reviewer` is set. The `profile` block feeds the compare tool and combination checker.
- `data/classes/*.json` — the 7 drug clusters (every substance's `class.slug` must have a file).
- `tools/profiles/` — the generator that wrote the substance JSON from shared templates.
- `data/blog/*.md` — posts with front matter; only `status: published` posts go into the sitemap and RSS feed.
- `src/` — shared CSS, JS, and the contact dialog.

## Pages generated

Home, filterable Drugs A–Z, 50 substance profiles, 7 cluster pages, 6 schedule pages, combination checker, compare tool, withdrawal timelines, overdose guide, legal status, glossary, blog, about pages, contact, 404, plus `sitemap.xml`, `robots.txt`, and `blog/feed.xml` (78 HTML pages).

Legal content is current as of October 2026 (medical marijuana to Schedule III, hemp THC limits, tianeptine and 7-OH scheduling, xylazine bill, telehealth flexibilities through December 31, 2026).

Internal links are relative, so `dist/` can be hosted at a domain root or a sub-path. The contact form posts to `/contact.php`, which needs a server-side handler on the host.
