# Deploying DoseUses.com

Upload the contents of this folder to the web root, including the hidden `.htaccess` file.

The download `doseuses-site.zip` holds the whole site: unzip it and upload everything inside.

## Must do on the server / DNS
1. Point `doseuses.com` and `www.doseuses.com` at the host and issue an SSL certificate covering both.
2. `.htaccess` 301-redirects `http://`, `www.` and any other hostname (including allmedsmarket.com) to
   `https://doseuses.com/`, sends HSTS, serves `404.html` for missing pages, and sets cache headers.
   On Nginx or Cloudflare, recreate these rules there (Apache/LiteSpeed read `.htaccess` directly).
3. Contact-form messages go to doseuses@gmail.com (`TO_EMAIL` in `contact.php`), sent from
   noreply@doseuses.com, with a limit of 5 messages per visitor per hour. The host needs PHP
   with `mail()` enabled. Send a test message after upload and check Gmail's spam folder; adding the
   host's mail server to the doseuses.com SPF record keeps them out of spam.
4. Submit `https://doseuses.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Google Analytics
The Google tag for `G-W6QL588EEY` is installed right after `<head>` on every page (one tag per page).
After upload, open the site and check Realtime in Google Analytics to confirm visits arrive.

## Google Search Console
To verify with the HTML-tag method, send the `<meta name="google-site-verification" ...>` tag from
Search Console; it goes in every page's `<head>` and stays there after verification succeeds.
