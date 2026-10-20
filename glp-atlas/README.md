# GLP Atlas — static site

Independent GLP-1, weight-loss and diabetes medicine reference for the US and Canada.
82 indexable pages generated from Python data files, with a WebGL 3D background, a command-palette search, and full SEO / AEO / GEO markup.

## Build

```bash
pip install pillow            # only needed for Open Graph images + icons
cd source && python3 build.py # writes ../public_html
```

Upload the **contents** of `public_html/` to your web root (Apache: `.htaccess` is included).
Preview locally: `cd public_html && python3 -m http.server 8000`.

## Layout

| Path | What it is |
| --- | --- |
| `source/build.py` | Generator + `CONFIG` (site name, domain, editor, reviewer, dates) |
| `source/data_*.py` | All content: medicines, comparisons, guides, pillars, questions, glossary |
| `source/og.py` | Renders 1200×630 social images, logo and app icons |
| `source/assets/` | `style.css` (design system), `app.js` (interactions), `bg3d.js` (WebGL background) |
| `keyword-map.csv` | Keyword → target page map |

## What's in the output

**Interaction & design** — dark/light themes (system default plus a toggle), a dependency-free WebGL double-helix particle scene (pauses in hidden tabs, still frame under reduced motion, falls back to CSS when WebGL is missing), a ⌘K / Ctrl K / `/` command palette that tolerates misspellings, a medicine finder with filter chips (state kept in the URL), a builder to compare any two medicines, a sticky table of contents with scrollspy, a reading-progress bar, copy-link heading anchors, share/print, scroll reveals and card tilt.

**SEO** — a single connected JSON-LD `@graph` per page (Organization, WebSite, Person, MedicalWebPage, BreadcrumbList, Drug, FAQPage, ItemList, DefinedTermSet), canonical URLs, `hreflang` en-US/en-CA/x-default, per-page OG/Twitter images, an image sitemap, `/index.html` → `/` redirects, HTTPS/host canonicalisation, cache and security headers. The build warns about over-long titles and descriptions.

**AEO** — every page opens with a self-contained "Quick answer / In short" block, marked up as `speakable`, and every page shows its FAQ, question-led headings, last-reviewed dates and author.

**GEO** — `llms.txt` (an index with a one-line summary per page), `llms-full.txt` (the full text of every page in Markdown), a `robots.txt` that explicitly welcomes AI search/answer crawlers, citable tables and sources, and entity-rich schema (`alternateName`, `drugClass`, `relatedDrug`, `knowsAbout`).

## Before launch

1. Set `REVIEWER` in `CONFIG` once a licensed clinician has signed off. Until then pages say "pending", which weakens E-E-A-T, and the editorial policy promises a review.
2. Confirm the final `DOMAIN` and `EMAIL`. Add real profiles to `SAME_AS`.
3. Set `FORM_ENDPOINT` (e.g. Formspree) so the contact form doesn't depend on mailto.
4. Re-verify prices and approval dates; they change often.
5. Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools.
