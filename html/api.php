<?php
header('Content-Type: application/json');

$dataFile = 'navhub-data.json';

// Default tools
$defaultTools = [
    [
        'id' => 'trans',
        'icon' => '🖨️',
        'title' => 'Transliteration',
        'desc' => 'Кирилица → Латиница (за URL slug)',
        'file' => 'transliteration-tool.html',
        'keywords' => 'кирилица латиница slug транслитерация'
    ],
    [
        'id' => 'watermark',
        'icon' => '📃',
        'title' => 'Watermark PDF',
        'desc' => 'Добавяне на водни знаци в PDF файлове',
        'file' => 'watermark.html',
        'keywords' => 'pdf водни знаци watermark документи'
    ],
    [
        'id' => 'urldec',
        'icon' => '🌍',
        'title' => 'URL Decoder',
        'desc' => 'Декодиране на URL адреси и htaccess',
        'file' => 'url-decoder-htaccess.html',
        'keywords' => 'url decoder htaccess декодиране'
    ],
    [
        'id' => 'genpar',
        'icon' => '🔐',
        'title' => 'Генератор на Пароли',
        'desc' => 'Създаване на силни и сигурни пароли',
        'file' => 'gen_par.html',
        'keywords' => 'пароли генератор сигурност password'
    ],
    [
        'id' => 'bash',
        'icon' => '🎨',
        'title' => 'Bash Prompt Теми',
        'desc' => 'Галерия с красиви Bash prompt теми',
        'file' => 'bash_promt.html',
        'keywords' => 'bash prompt terminal тема shell'
    ],
    [
        'id' => 'emoji',
        'icon' => '🤡',
        'title' => 'Emoji Library',
        'desc' => 'Емоджита, които могат да се копират',
        'file' => 'emoji.html',
        'keywords' => 'emoji емоджи икони копиране'
    ],
    [
        'id' => 'wordcloud',
        'icon' => '☁️',
        'title' => 'Word Cloud',
        'desc' => 'Създаване на облак от думи',
        'file' => 'word-cloud.html',
        'keywords' => 'облак думи визуализация текст'
    ]
];

// Initialize data file if it doesn't exist
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([
        'tools' => $defaultTools,
        'order' => []
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Read current data
function readData() {
    global $dataFile;
    $content = file_get_contents($dataFile);
    return json_decode($content, true);
}

// Write data
function writeData($data) {
    global $dataFile;
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get':
        // GET all tools
        $data = readData();
        echo json_encode($data);
        break;

    case 'add':
        // ADD new tool
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
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
        }
        break;

    case 'update':
        // UPDATE tool
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $data = readData();
            
            $id = $input['id'] ?? '';
            foreach ($data['tools'] as $key => $tool) {
                if ($tool['id'] === $id) {
                    $data['tools'][$key] = array_merge($tool, $input);
                    break;
                }
            }
            
            writeData($data);
            echo json_encode(['success' => true]);
        }
        break;

    case 'delete':
        // DELETE tool
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $data = readData();
            
            $id = $input['id'] ?? '';
            $data['tools'] = array_values(array_filter($data['tools'], function($tool) use ($id) {
                return $tool['id'] !== $id;
            }));
            
            writeData($data);
            echo json_encode(['success' => true]);
        }
        break;

    case 'saveOrder':
        // SAVE order
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $data = readData();
            
            $data['order'] = $input['order'] ?? [];
            writeData($data);
            
            echo json_encode(['success' => true]);
        }
        break;

    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}
?>
