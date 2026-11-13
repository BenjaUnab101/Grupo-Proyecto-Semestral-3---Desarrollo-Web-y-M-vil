# Cambios · portal de apoderados, inscripciones y limpieza

## 1. Portal de apoderados y cuentas para iniciar sesión
- `HITO-3/backend/.env.example`: `DEMO_PASSWORD=PequenosReyes2026` con la lista de cuentas.
- Nuevo `GET /auth/cuentas-prueba` (solo development/test; 404 en producción): correos y roles para la pantalla de login, nunca contraseñas.
- Frontend reorganizado según el diagrama (Portal apoderados → Sesión apoderado → Autenticación):
  - `services/auth.js` (reemplaza `authApi.js` y `sesionApi.js`).
  - `hooks/useSesionApoderado.js`: login, logout y errores del portal.
  - `context/SesionProvider.jsx`: solo sesión real con token; también controla el modal del portal.
  - `LoginForm.jsx`: muestra las cuentas de prueba (clic = completa el correo).
  - `PortalApoderados.jsx`: apoderado ve a sus hijos; personal/dirección ve accesos a sus herramientas.
  - `BarraSesion.jsx` reemplaza `BarraSesionDemo.jsx`: muestra la cuenta y "Cerrar sesión".
  - Se eliminó el envío de `X-Usuario-Id` desde React: todas las llamadas usan `Authorization: Bearer`.

## 2. Inscripción a actividades y comprobantes de pago simulados
- `sql/seed/S006__actividades_escolares_demo.sql`: 4 categorías y 4 actividades (fechas relativas).
- `sql/seed/S007__documentos_demo.sql`: documentos institucionales iniciales.
- `sql/migraciones/V008__pagos_por_usuario.sql`: cada comprobante guarda la cuenta que lo emitió.
- Nuevo `GET /pagos/mios`: "Mis comprobantes" de la cuenta de la sesión.
- Servicio `migraciones` en `docker-compose.yml`: aplica migraciones y semillas automáticamente en cada arranque.