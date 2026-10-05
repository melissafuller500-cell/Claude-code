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

- `data/substances/*.json` — one drug profile per file. Pages stay `noindex` and show a *Draft* badge until `reviewer` is set.
- `data/classes/*.json` — drug-class pages (a basic page is generated for any class without a file).
- `data/blog/*.md` — posts with front matter; only `status: published` posts go into the sitemap and RSS feed.
- `src/` — shared CSS, JS, and the contact dialog.

## Pages generated

Home, Drugs A–Z, drug profiles, class pages, Withdrawal, Interaction checker, Legal status, Blog, About, Editorial policy, Medical review team, Contact, 404, plus `sitemap.xml`, `robots.txt`, and `blog/feed.xml`.

Internal links are relative, so `dist/` can be hosted at a domain root or a sub-path. The contact form posts to `/contact.php`, which needs a server-side handler on the host.
