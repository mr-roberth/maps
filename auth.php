<?php
// Establece el encabezado para que la respuesta sea en formato JSON.
header("Content-Type: application/json");

// Configuración de la conexión a la base de datos
$host = 'cloud3.googiehost.com';
$db   = 'mrrobert_gporres';          // Nombre de tu base de datos
$user = 'mrrobert_root';   // Tu usuario de MySQL
$pass = 'Sysadm2227';     // Tu contraseña de MySQL
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  // Muestra errores
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,        // Devuelve arrays asociativos
    PDO::ATTR_EMULATE_PREPARES   => false,                   // Usa sentencias preparadas nativas
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    // En caso de fallo en la conexión, se envía un mensaje de error
    echo json_encode(['success' => false, 'message' => 'Error en la conexión a la base de datos.']);
    exit();
}

// Recibe el JSON enviado por el JavaScript
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['username']) || !isset($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Faltan parámetros.']);
    exit();
}

$username = $data['username'];
$password = $data['password'];

// Consulta preparada para evitar inyección SQL
$stmt = $pdo->prepare("SELECT * FROM Users WHERE usuario = ?");
$stmt->execute([$username]);
$userData = $stmt->fetch();

// Comparación de credenciales
if ($userData && $userData['password'] === $password) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Usuario o contraseña incorrectos.']);
}
?>
