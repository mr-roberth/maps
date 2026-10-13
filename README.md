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

## Activar / actualizar GAS

El frontend ya conoce la URL del Web App y en los dispositivos nuevos **solo solicita el nombre del capturista**.

Para aplicar este cambio al backend:

1. Abre el proyecto de Apps Script asociado.
2. Sustituye `Code.gs` por `gas/Code.gs` de este repositorio.
3. Ejecuta `setup()` una vez si el proyecto todavía no está inicializado.
4. Ve a **Implementar > Administrar implementaciones**.
5. Edita la Aplicación web y publica una **Nueva versión**.
6. Ejecutar como: tú.
7. Acceso: **Cualquiera**.
8. Conserva la misma URL `/exec`.

Después, cualquier celular nuevo abrirá la app, escribirá su nombre y podrá comenzar. No se solicita API key ni token.

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

La app de GitHub Pages es pública. Para cumplir el flujo solicitado de “solo nombre del capturista”, el Web App de GAS ya no valida una API key enviada por el navegador. Esto simplifica el uso en campo, pero significa que la URL del Web App debe tratarse como un endpoint operativo y conviene no difundirla fuera del equipo.
