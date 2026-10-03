<?php
/**
 * Événements de conversion (sans cookie, sans identifiant) sur hébergement Apache + PHP.
 * Une ligne CSV par événement dans api/data/events.csv (dossier protégé par .htaccess).
 */
declare(strict_types=1);
const ALLOWED = ['cta_click', 'form_submit', 'whatsapp_click', 'email_click', 'calculator_use', 'quiz_complete', 'template_copy'];
http_response_code(204);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') exit;
$e = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($e) || !in_array($e['name'] ?? '', ALLOWED, true)) exit;
$clip = fn($v) => str_replace([',', "\n", "\r", '"'], ' ', mb_substr((string) ($v ?? ''), 0, 200));
$dir = __DIR__ . '/data';
if (!is_dir($dir)) @mkdir($dir, 0750, true);
@file_put_contents($dir . '/events.csv', implode(',', [gmdate('c'), $clip($e['name']), $clip($e['path'] ?? ''), $clip($e['lang'] ?? ''), $clip($e['src'] ?? $e['target'] ?? $e['score'] ?? '')]) . "\n", FILE_APPEND | LOCK_EX);
