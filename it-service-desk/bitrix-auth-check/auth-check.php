<?php
/**
 * Service Desk — Bitrix credential verification endpoint.
 * Deploy on the self-hosted Bitrix VM (jbmarks.sdinmotion.co.za) at a path
 * reachable over HTTPS, e.g.  /local/sdesk/auth-check.php
 *
 * The Railway backend calls this to verify a username+password against the
 * Bitrix user store (webhooks cannot check passwords). It returns the user
 * record on success. Protect it with a shared secret so only our backend
 * can call it.
 *
 * Security:
 *   - Set SDESK_AUTH_SECRET below to a long random value and set the SAME
 *     value as BITRIX_AUTH_SECRET on Railway; the backend sends it as a header.
 *   - Only responds to POST JSON { username, password }.
 *   - Never returns the password hash.
 */

define('STOP_STATISTICS', true);
define('NOT_CHECK_PERMISSIONS', true);

require($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

header('Content-Type: application/json');

// ---- Shared-secret gate ----
$SECRET = getenv('SDESK_AUTH_SECRET') ?: 'CHANGE_ME_set_a_long_random_secret';
$provided = $_SERVER['HTTP_X_SDESK_SECRET'] ?? '';
if (!hash_equals($SECRET, $provided)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'method_not_allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
$login = trim($body['username'] ?? '');
$password = (string)($body['password'] ?? '');

if ($login === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'missing_credentials']);
    exit;
}

// Bitrix authenticates by LOGIN. Allow login OR email: resolve email → login.
if (strpos($login, '@') !== false) {
    $rsUser = CUser::GetList('id', 'asc', ['=EMAIL' => $login], ['SELECT' => ['ID', 'LOGIN']]);
    if ($u = $rsUser->Fetch()) {
        $login = $u['LOGIN'];
    }
}

$USER_TMP = new CUser;
$result = $USER_TMP->Login($login, $password, 'N', 'N');

if (is_array($result) && $result['TYPE'] === 'ERROR') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'invalid_credentials']);
    exit;
}

$userId = $USER_TMP->GetID();
if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'invalid_credentials']);
    exit;
}

// Fetch the user record to return to the backend
$rs = CUser::GetByID($userId);
$arUser = $rs->Fetch();

// Log the user back out server-side (we only needed verification)
$USER_TMP->Logout();

echo json_encode([
    'success' => true,
    'user' => [
        'ID'             => $arUser['ID'],
        'NAME'           => $arUser['NAME'],
        'LAST_NAME'      => $arUser['LAST_NAME'],
        'EMAIL'          => $arUser['EMAIL'],
        'LOGIN'          => $arUser['LOGIN'],
        'WORK_POSITION'  => $arUser['WORK_POSITION'],
        'PERSONAL_PHOTO' => $arUser['PERSONAL_PHOTO'],
    ],
]);
