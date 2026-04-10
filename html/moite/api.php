<?php
session_start();
header('Content-Type: application/json');

// --- CONFIGURATION ---
// Постави тук генерирания от теб хеш
$PASSWORD_HASH = '$2y$10$tkFBHm81forKJoMGr89Yr.khYaNz9rsqZAyUYlZiR9odAcSxkMuT2';

$dataFile = 'navhub-data.json';

// --- AUTH HELPER ---
function isAuthenticated() {
    return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

function requireAuth() {
    if (!isAuthenticated()) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

// --- DATA HANDLING ---
$defaultTools = [
    [
        'id' => 'trans',
        'icon' => '🖨️',
        'title' => 'Transliteration',
        'desc' => 'Кирилица → Латиница (за URL slug)',
        'file' => 'transliteration-tool.html',
        'keywords' => 'кирилица латиница slug транслитерация'
    ]
];

if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([
        'tools' => $defaultTools,
        'order' => []
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function readData() {
    global $dataFile;
    if (!file_exists($dataFile)) return ['tools' => [], 'order' => []];
    $content = file_get_contents($dataFile);
    return json_decode($content, true);
}

function writeData($data) {
    global $dataFile;
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// --- ACTION HANDLING ---
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($action) {
        case 'login':
            if ($method !== 'POST') throw new Exception('Invalid method');
            $pass = $input['password'] ?? '';

            // ПОПРАВЕНО: Използваме сигурната функция за проверка на хеш
            if (password_verify($pass, $PASSWORD_HASH)) {
                $_SESSION['logged_in'] = true;
                echo json_encode(['success' => true]);
            } else {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Invalid password']);
            }
            break;

        case 'check_auth':
            echo json_encode(['authenticated' => isAuthenticated()]);
            break;

        case 'logout':
            session_destroy();
            echo json_encode(['success' => true]);
            break;

        case 'get':
            requireAuth();
            $data = readData();
            echo json_encode($data);
            break;

        case 'add':
            requireAuth();
            if ($method !== 'POST') throw new Exception('Invalid method');
            $data = readData();

            $newTool = [
                'id' => 'tool-' . time(),
                'icon' => $input['icon'] ?? '🎯',
                'title' => $input['title'] ?? 'New Tool',
                'desc' => $input['desc'] ?? '',
                'file' => $input['file'] ?? '',
                'keywords' => $input['keywords'] ?? ''
            ];

            $data['tools'][] = $newTool;
            writeData($data);
            echo json_encode(['success' => true, 'tool' => $newTool]);
            break;

        case 'update':
            requireAuth();
            if ($method !== 'POST') throw new Exception('Invalid method');
            $data = readData();
            $id = $input['id'] ?? '';

            $updated = false;
            foreach ($data['tools'] as $key => $tool) {
                if ($tool['id'] === $id) {
                    $data['tools'][$key] = array_merge($tool, $input);
                    $updated = true;
                    break;
                }
            }

            if ($updated) {
                writeData($data);
                echo json_encode(['success' => true]);
            } else {
                throw new Exception('Tool not found');
            }
            break;

        case 'delete':
            requireAuth();
            if ($method !== 'POST') throw new Exception('Invalid method');
            $data = readData();
            $id = $input['id'] ?? '';

            $data['tools'] = array_values(array_filter($data['tools'], function($tool) use ($id) {
                return $tool['id'] !== $id;
            }));

            writeData($data);
            echo json_encode(['success' => true]);
            break;

        case 'saveOrder':
            requireAuth();
            if ($method !== 'POST') throw new Exception('Invalid method');
            $data = readData();
            $data['order'] = $input['order'] ?? [];
            writeData($data);
            echo json_encode(['success' => true]);
            break;

        default:
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
