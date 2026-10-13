# Deploying DoseUses.com

Upload the contents of this folder to the web root, including the hidden `.htaccess` file.

## Must do on the server / DNS
1. Point `doseuses.com` and `www.doseuses.com` at the host and issue an SSL certificate covering both.
2. `.htaccess` 301-redirects `http://`, `www.` and any other hostname (including allmedsmarket.com) to
   `https://doseuses.com/`, sends HSTS, serves `404.html` for missing pages, and sets cache headers.
   On Nginx or Cloudflare, recreate these rules there (Apache/LiteSpeed read `.htaccess` directly).
3. Edit `CONTACT_TO` in `contact.php` to the inbox that should receive contact-form messages. The
   host needs PHP with `mail()` enabled.
4. Submit `https://doseuses.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Google Analytics
Not installed yet: it needs your GA4 Measurement ID (`G-XXXXXXXXXX`).
