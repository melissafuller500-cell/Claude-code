<?php
// Handles the site-wide "Contact us" form. Set CONTACT_TO to the inbox that should receive messages.
const CONTACT_TO = 'contact@doseuses.com';
const CONTACT_FROM = 'no-reply@doseuses.com';

function back(string $status): void {
    $page = $_POST['page'] ?? '/';
    if (!is_string($page) || !preg_match('#^/[A-Za-z0-9/_\-.]*$#', $page)) {
        $page = '/';
    }
    header('Location: ' . $page . '?contact=' . $status . '#contact', true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /contact/', true, 303);
    exit;
}

// Honeypot field: real visitors never fill it in.
if (!empty($_POST['website'])) {
    back('sent');
}

$topics = ['Report an error', 'Question about the site', 'Feedback', 'Partnership or press'];
$topic = in_array($_POST['topic'] ?? '', $topics, true) ? $_POST['topic'] : 'Feedback';
$email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$message = trim((string)($_POST['message'] ?? ''));

if (!$email || $message === '' || mb_strlen($message) > 5000) {
    back('error');
}

$body = "Topic: $topic\nFrom: $email\nPage: " . ($_POST['page'] ?? '') . "\n\n$message\n";
$headers = [
    'From' => CONTACT_FROM,
    'Reply-To' => $email,
    'Content-Type' => 'text/plain; charset=UTF-8',
];

$ok = mail(CONTACT_TO, '=?UTF-8?B?' . base64_encode("DoseUses contact: $topic") . '?=', $body, $headers);
back($ok ? 'sent' : 'error');
