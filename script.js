document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById("loginButton");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginContainer = document.getElementById("loginContainer");
  const dashboardContainer = document.getElementById("dashboardContainer");
  const errorDiv = document.getElementById("loginError");

  loginButton.addEventListener('click', function() {
    const user = usernameInput.value;
    const pass = passwordInput.value;

    // Credenciales estáticas (¡PELIGRO! Esto no es seguro para producción)
    if (user === "admin" && pass === "Gporres2025") {
      loginContainer.style.display = "none";
      dashboardContainer.style.display = "block";
      errorDiv.textContent = ""; // Limpiar cualquier mensaje de error
    } else {
      errorDiv.textContent = "Usuario o contraseña incorrectos.";
    }
  });
});