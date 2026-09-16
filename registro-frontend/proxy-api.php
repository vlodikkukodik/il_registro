<?php
// JSON API reverse proxy for api.registro.vladinc.ru, used when the VPS IP
// is unreachable (geoblocking) directly from the browser. Only proxies
// /api/* JSON traffic — no HTML/asset rewriting needed.

$target = 'https://api.registro.vladinc.ru';

// The frontend calls this script as a path prefix (e.g.
// /registro/proxy-api.php/api/v1/auth/login), not via a query string, so
// pull the forwarded path out of REQUEST_URI relative to this script.
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = $requestUri;
if (strpos($path, $scriptDir . '/proxy-api.php') === 0) {
    $path = substr($path, strlen($scriptDir . '/proxy-api.php'));
}
$qs = $_SERVER['QUERY_STRING'] ?? '';

$url = $target . '/' . ltrim($path, '/') . ($qs ? '?' . $qs : '');

$headers = ['Host: api.registro.vladinc.ru'];
if (isset($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}
if (isset($_SERVER['HTTP_ACCEPT'])) {
    $headers[] = 'Accept: ' . $_SERVER['HTTP_ACCEPT'];
}
if (isset($_SERVER['HTTP_COOKIE'])) {
    $headers[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CUSTOMREQUEST => $_SERVER['REQUEST_METHOD'],
    CURLOPT_HTTPHEADER => $headers,
]);

if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Bad Gateway', 'detail' => curl_error($ch)]);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
foreach (explode("\r\n", $rawHeaders) as $line) {
    if (stripos($line, 'Set-Cookie:') === 0) {
        // Relay the backend's cookie as-is; it carries no Domain attribute
        // so the browser scopes it to this proxy's own origin (vladinc.ru).
        header($line, false);
    }
}

http_response_code($httpCode);
if ($contentType) {
    header('Content-Type: ' . $contentType);
}
echo substr($response, $headerSize);
