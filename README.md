# Oleolab · Mapeo de Racks

Mini app móvil para levantar y consultar la ubicación física de materiales en almacén.

**No es inventario.** No controla cantidades ni existencias. Registra dónde puede encontrarse cada código mediante:

- Rack A–Z
- Posición
- Nivel
- Código de material
- Descripción
- Observaciones
- Capturista
- Fecha/hora

Un mismo código puede existir en múltiples ubicaciones.

## Frontend

GitHub Pages:

https://mr-roberth.github.io/maps/

La interfaz es mobile-first y conserva la ubicación activa para acelerar el recorrido del rack. Incluye selector A–Z, configuración dinámica de posiciones/niveles, mapa visual del rack, búsqueda por código, captura offline en cola y escaneo por cámara cuando el navegador soporta BarcodeDetector.

## Base de datos

Google Sheets:

https://docs.google.com/spreadsheets/d/12SCiQm8V1KWoDCcvSME3rLUsQUM7YNqKPbT7IsKf2s4/edit

Hojas:
- MAPEO: registros de ubicación.
- RACKS: estructura física por rack.
- CATALOGO: códigos/descripciones opcionales.
- CONFIG: parámetros de la solución.

## Activar GAS

El código ya está en `gas/Code.gs`.

1. Abre el Google Sheet.
2. Ve a **Extensiones > Apps Script**.
3. Sustituye el contenido de `Code.gs` por el archivo de este repositorio.
4. En Configuración del proyecto, activa la visualización del archivo de manifiesto y sustituye `appsscript.json` por `gas/appsscript.json`.
5. Ejecuta una vez la función `setup()` y autoriza el acceso al Sheet.
6. Revisa el registro de ejecución y copia el valor `MAPEO_API_KEY`.
7. **Implementar > Nueva implementación > Aplicación web**.
   - Ejecutar como: tú.
   - Quién tiene acceso: cualquiera.
8. Copia la URL terminada en `/exec`.
9. Abre la mini app en el celular. La URL del Web App ya está preconfigurada.
10. Toca ⚙ e introduce una sola vez la **MAPEO_API_KEY** y el nombre del capturista/dispositivo.
11. Pulsa **Probar**. La app mostrará el resultado dentro de la ventana de configuración y, al guardar, conservará la clave únicamente en el almacenamiento local de ese navegador.

Después de eso el sistema queda operativo.

## Flujo recomendado

1. Llegar al Rack.
2. Tocar **Configurar** y registrar posiciones/niveles observados.
3. Elegir posición y nivel.
4. Escanear o escribir cada código encontrado.
5. Guardar varios códigos sin cambiar de ubicación.
6. Usar **Siguiente** para recorrer N1 → N2 → ... → siguiente posición.
7. Consultar después cualquier código desde **Buscar**.

La app guarda registros pendientes localmente si se pierde la conexión y permite sincronizarlos al recuperar señal.


## Seguridad

El repositorio `maps` es público. Por esa razón la clave `MAPEO_API_KEY` **no se incluye en el código ni en Google Sheets**. La URL de GAS sí está preconfigurada porque no es un secreto. La clave permanece en Script Properties de Apps Script y, después de introducirla, en `localStorage` del celular.


## Enlace de activación del celular

La app admite una activación de una sola vez mediante el fragmento local `#k=...`.
Ese valor se guarda en `localStorage` del navegador y el fragmento se elimina de la barra de direcciones inmediatamente.
Así la API key no queda publicada en el repositorio ni en Google Sheets.

Después de la activación, la app se conecta automáticamente y no vuelve a pedir la clave en ese navegador.
