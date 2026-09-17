<?php
// Temporary remote diagnostic logger for the iPad blank-page investigation.
// Accepts a JSON body and appends it (with a server timestamp) to a local
// log file. No auth: this is a short-lived debugging aid, not a permanent
// endpoint — remove once the investigation concludes.
header('Access-Control-Allow-Origin: *');
$body = file_get_contents('php://input');
$line = date('c') . ' ' . $_SERVER['REMOTE_ADDR'] . ' ' . $body . "\n";
file_put_contents(__DIR__ . '/remote-log.txt', $line, FILE_APPEND | LOCK_EX);
http_response_code(204);
