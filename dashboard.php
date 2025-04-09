<?php
session_start();

// Verificar si el usuario ha iniciado sesión, sino redirigir al login
if (!isset($_SESSION['usuario'])) {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Dashboard - Climático</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Estilos para el dashboard responsivo */
    .dashboard-container {
      width: 100%;
      height: 100vh;
      background-color: #fff;
    }
    
    .dashboard-inner {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }
    
    .dashboard-inner iframe {
      width: 90vw;
      height: 90vh;
      border: none;
    }
  </style>
</head>
<body>
  <div class="dashboard-container">
    <div class="dashboard-inner">
      <iframe title="Dashboard - Climático" src="https://app.powerbi.com/view?r=eyJrIjoiZDQ5OGYwM2MtNDcxNC00ZTQwLWE1OWItZjJhMzI3ZWJlY2VlIiwidCI6IjU5ODY5YzBkLWQ0ZDktNGRlZC1hNDg0LTI1YzFhMmU0YTU0MCJ9" allowfullscreen="true"></iframe>
    </div>
  </div>
</body>
</html>
