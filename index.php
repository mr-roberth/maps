<?php
session_start();

// Si el usuario ya inició sesión, redirigir al dashboard
if (isset($_SESSION['usuario'])) {
    header("Location: dashboard.php");
    exit();
}

$error = ""; // Variable para almacenar el mensaje de error

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Recibir las variables del formulario
    $usuario = trim($_POST['usuario']);
    $password = trim($_POST['password']);

    // Configuración de la conexión a la base de datos
    $host = "198.45.114.194";
    $dbUser = "mrrobert_root";           // Cambia según la configuración de tu servidor
    $dbPassword = "Sysadm2227";           // Cambia según la configuración de tu servidor
    $dbName = "mrrobert_gporres"; // Cambia por el nombre real de tu base de datos

    // Crear la conexión
    $conn = new mysqli($host, $dbUser, $dbPassword, $dbName);

    // Verificar conexión
    if($conn->connect_error) {
        die("Error de conexión: " . $conn->connect_error);
    }

    // Preparar la consulta para evitar inyecciones SQL
    $stmt = $conn->prepare("SELECT * FROM Users WHERE usuario = ? AND password = ?");
    $stmt->bind_param("ss", $usuario, $password);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if ($resultado->num_rows > 0) {
        // Credenciales correctas, iniciar sesión y redirigir al dashboard
        $_SESSION['usuario'] = $usuario;
        header("Location: dashboard.php");
        exit();
    } else {
        // Credenciales incorrectas
        $error = "Usuario o contraseña incorrectos.";
    }

    $stmt->close();
    $conn->close();
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Login - Climático</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Reinicio de márgenes y ajustes básicos */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      font-family: Arial, sans-serif;
      background-color: #f0f2f5;
    }

    /* Contenedor general para centrar el contenido en toda la pantalla */
    .container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100vh;
      padding: 20px;
    }

    /* Estilos para el formulario de login */
    .login-container {
      background-color: #fff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    .login-container img {
      width: 100px;
      height: 100px;
      object-fit: cover;
      border-radius: 50%;
      margin-bottom: 20px;
    }

    .login-container input {
      width: 100%;
      padding: 12px;
      margin-bottom: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }

    .login-container button {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 4px;
      background-color: #4CAF50;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      font-weight: bold;
    }

    .login-container button:hover {
      background-color: #45a049;
    }

    .login-container .error {
      color: red;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <!-- Contenedor principal de login -->
  <div class="container">
    <div class="login-container">
      <!-- Logo o imagen -->
      <img src="https://grupoporres.com.mx/assets/images/resources/logo.png" alt="Logo">
      <!-- Formulario de login -->
      <form action="login.php" method="post">
        <input type="text" name="usuario" placeholder="Usuario" required>
        <input type="password" name="password" placeholder="Contraseña" required>
        <button type="submit">Iniciar sesión</button>
      </form>
      <!-- Mensaje de error -->
      <?php if ($error !== "") { echo "<div class='error'>$error</div>"; } ?>
    </div>
  </div>
</body>
</html>
