# Images

Drop source images here (2000px on the long side, JPG/PNG/WebP). The build
creates AVIF and WebP copies at 400, 800, and 1200px automatically. Until a
file exists, the site shows a neutral placeholder tile.

| Folder | File name | Used for |
| --- | --- | --- |
| `products/` | The file name in the product's `image_main` column, e.g. `bs-caf-0012.webp` | Product page and cards |
| `products/` | The kit slug, e.g. `front-end-kit-toyota-camry-2018-2024.jpg` | Kit page and cards |
| `categories/` | The category slug, e.g. `cabin-air-filters.jpg` | Category tiles (16) |
| `blog/` | The article file name without `.md`, e.g. `signs-of-a-failing-ignition-coil.jpg` | Blog covers |
| `site/` | `hero.jpg` | Home page hero background |

Rules from the specification: no images copied from other websites, no other
companies' brand names, logos, or part numbers, and no vehicle badges.
Products with `image_type` = `illustrative` show "Image for illustration".
