<?php
/* DoseUses contact form handler. Upload to the site root next to index.html. */
const TO_EMAIL   = 'doseuses@gmail.com';     // where messages are delivered
const FROM_EMAIL = 'noreply@doseuses.com';    // must be an address on your own domain
const TOPICS     = ['Get help', 'Question about the site', 'Report an error', 'Feedback', 'Partnership or press'];
const MAX_PER_HOUR = 5;                       // per visitor IP

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
$page = substr(preg_replace('/[^\w\/\-.]/', '', $_POST['page'] ?? ''), 0, 200);

function done($ok, $msg, $code = 200) {
    global $wantsJson, $page;
    if ($wantsJson) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $msg]);
    } else {
        // Browsers without JavaScript post the form normally: send them back to the page they came from.
        $back = preg_match('#^/[\w/\-.]*$#', $page) ? $page : '/contact/';
        header('Location: ' . $back . '?contact=' . ($ok ? 'sent' : 'error'), true, 303);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') done(false, 'Method not allowed.', 405);
if (!empty($_POST['website'])) done(true, 'Thanks, your message has been sent.');   // spam bot filled the hidden field

$topic   = trim($_POST['topic'] ?? '');
$email   = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');

if (!in_array($topic, TOPICS, true)) $topic = 'Get help';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) done(false, 'Please enter a valid email address.', 422);
if (mb_strlen($message) < 10)   done(false, 'Please write a little more so we can help.', 422);
if (mb_strlen($message) > 5000) done(false, 'Your message is too long. Please keep it under 5,000 characters.', 422);

// Simple rate limit, stored outside public_html when possible
$dir = is_writable(dirname(__DIR__)) ? dirname(__DIR__) . '/.contact-rate' : sys_get_temp_dir() . '/doseuses-rate';
@mkdir($dir, 0700, true);
$file = $dir . '/' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'x');
$times = array_filter(array_map('intval', @file($file, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - 3600);
if (count($times) >= MAX_PER_HOUR) done(false, 'Too many messages. Please try again in an hour.', 429);
$times[] = time();
@file_put_contents($file, implode("\n", $times), LOCK_EX);

$body = "Topic: $topic\nFrom: $email\nPage: $page\nSent: " . gmdate('Y-m-d H:i') . " UTC\n\n$message\n";
$headers = "From: DoseUses <" . FROM_EMAIL . ">\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\n";
$subject = '=?UTF-8?B?' . base64_encode("[DoseUses] $topic") . '?=';

if (!mail(TO_EMAIL, $subject, $body, $headers, '-f' . FROM_EMAIL)) done(false, 'Sorry, the message could not be sent. Please try again later.', 500);
done(true, 'Thanks, your message has been sent. We will reply by email.');
