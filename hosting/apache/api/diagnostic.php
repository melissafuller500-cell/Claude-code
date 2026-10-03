<?php
/**
 * Réception du formulaire de diagnostic sur un hébergement Apache + PHP (cPanel, etc.).
 * Équivalent de functions/api/diagnostic.js (Cloudflare Pages). Envoi par la fonction mail() du serveur.
 * Si les e-mails n'arrivent pas : vérifier dans cPanel que l'adresse contact@noetechgrowth.com existe
 * et que les enregistrements SPF/DKIM du domaine sont actifs.
 */
declare(strict_types=1);

const TO = 'contact@noetechgrowth.com';
const FROM = 'Site Noé Tech Growth <contact@noetechgrowth.com>';
const THANKS = ['fr' => '/diagnostic/merci/', 'en' => '/en/diagnostic/thank-you/'];
const LIMITS = ['secteur' => 120, 'retard' => 20, 'taille' => 20, 'prenom' => 80, 'entreprise' => 120, 'ville' => 80, 'contact' => 120, 'message' => 2000, 'lang' => 2];

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); header('Allow: POST'); exit; }

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');
$raw = $_POST;
if (!$raw && str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) $raw = json_decode((string) file_get_contents('php://input'), true) ?: [];

$d = [];
foreach (LIMITS as $k => $max) $d[$k] = mb_substr(trim(str_replace(["\r", "\0"], '', (string) ($raw[$k] ?? ''))), 0, $max);
$d['lang'] = $d['lang'] === 'en' ? 'en' : 'fr';

function done(array $d, bool $json): void {
  if ($json) { header('Content-Type: application/json; charset=utf-8'); echo '{"ok":true}'; exit; }
  header('Location: ' . THANKS[$d['lang']], true, 303); exit;
}
function fail(array $d, bool $json, bool $invalid): void {
  http_response_code($invalid ? 422 : 502);
  if ($json) { header('Content-Type: application/json; charset=utf-8'); echo json_encode(['ok' => false, 'error' => $invalid ? 'invalid' : 'delivery_failed']); exit; }
  $en = $d['lang'] === 'en';
  header('Content-Type: text/html; charset=utf-8');
  $msg = $invalid
    ? ($en ? 'Please go back and check your first name and your phone number or email.' : 'Revenez en arrière et vérifiez votre prénom et votre téléphone ou e-mail.')
    : ($en ? 'The message could not be sent. Please write to me on WhatsApp or by email instead.' : 'Le message n’a pas pu partir. Écrivez-moi plutôt sur WhatsApp ou par e-mail.');
  echo '<!doctype html><html lang="' . $d['lang'] . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Noé Tech Growth</title><style>body{margin:0;background:#06110B;color:#EDF3E6;font:18px/1.6 system-ui,sans-serif;padding:32px 16px}main{max-width:560px;margin:auto}a{color:#A3D65C}</style></head><body><main><h1>'
    . ($en ? 'Something went wrong' : 'Un problème est survenu') . '</h1><p>' . $msg . '</p><p><a href="https://wa.me/237653400504">WhatsApp +237 653 40 05 04</a><br><a href="mailto:' . TO . '">' . TO . '</a></p><p><a href="' . ($en ? '/en/diagnostic/' : '/diagnostic/') . '">' . ($en ? 'Back to the form' : 'Retour au formulaire') . '</a></p></main></body></html>';
  exit;
}

// Champ piège rempli : on fait semblant d'accepter, sans rien envoyer.
if (trim((string) ($raw['website'] ?? '')) !== '') done($d, $wantsJson);
if ($d['prenom'] === '' || !preg_match('/^\s*(\+?[0-9][0-9 ().-]{7,19}|[^@\s]+@[^@\s]+\.[^@\s]+)\s*$/u', $d['contact'])) fail($d, $wantsJson, true);

$body = implode("\n", [
  'Prénom : ' . $d['prenom'],
  'Entreprise : ' . ($d['entreprise'] ?: '—'),
  'Ville : ' . ($d['ville'] ?: '—'),
  'Contact : ' . $d['contact'],
  'Secteur : ' . $d['secteur'],
  'Clients en retard : ' . $d['retard'],
  "Taille de l'équipe : " . $d['taille'],
  'Langue : ' . $d['lang'],
  '',
  $d['message'] ?: '(pas de message)',
]);
$subject = 'Diagnostic : ' . $d['prenom'] . ($d['entreprise'] ? ' (' . $d['entreprise'] . ')' : '');
$headers = ['From: ' . FROM, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit'];
if (filter_var($d['contact'], FILTER_VALIDATE_EMAIL)) $headers[] = 'Reply-To: ' . $d['contact'];
$ok = mail(TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));
$ok ? done($d, $wantsJson) : fail($d, $wantsJson, false);
