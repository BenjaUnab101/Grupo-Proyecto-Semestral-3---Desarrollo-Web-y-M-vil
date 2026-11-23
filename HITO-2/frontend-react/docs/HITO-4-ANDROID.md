# Hito 4 · App Android (React + Capacitor)

La aplicación React del portal se empaqueta como app Android con **Capacitor 8**. Es un segundo
cliente de la **misma API REST del Hito 3** (FastAPI + PostgreSQL + MongoDB): lo que se hace en el
teléfono se guarda en el backend y se ve también en la web.

```
React web (navegador)      App Android (Capacitor)
            \                  /
             API REST FastAPI (/api/v1)
              /              \
        PostgreSQL         MongoDB
```

## 1. Requisitos
- Node.js 22 o superior y npm.
- Android Studio (2025.2.1 o posterior) con Android SDK Platform, Build-Tools, Platform-Tools y un
  emulador creado en *Device Manager*.
- El backend del Hito 3 levantado: `cd HITO-3/backend && cp .env.example .env && docker compose up --build -d`.
  Si ya tenían un `.env` creado antes, revisen que `CORS_ORIGINS` incluya `https://localhost`
  (ver `.env.example`); si no, Android recibe un error de CORS.

## 2. Configurar la dirección de la API
En `HITO-2/frontend-react/.env` (copiar desde `.env.example`):

| Dónde corre la app | Variable | Valor |
|---|---|---|
| Navegador en el PC | `VITE_API_WEB` | `http://localhost:8000/api/v1` |
| Emulador Android | `VITE_API_ANDROID` | `http://10.0.2.2:8000/api/v1` |
| Teléfono físico (misma Wi-Fi) | `VITE_API_ANDROID` | `http://IP-DEL-PC:8000/api/v1` |

`src/services/http.js` elige la variable según la plataforma (`window.Capacitor` existe solo dentro
de la app). Para un teléfono físico, además, en `HITO-3/backend/.env` poner `BIND_HOST=0.0.0.0`,
reiniciar con `docker compose up -d` y permitir el puerto 8000 en el firewall de Windows.

`capacitor.config.json` activa `server.cleartext` y `android.allowMixedContent` **solo para el
laboratorio** (API por HTTP sin TLS). En una app publicada se usaría HTTPS y se quitarían.

## 3. Generar e instalar la APK
Desde `HITO-2/frontend-react`:

```bash
npm install                 # instala también Capacitor (actualiza package-lock.json)
npx cap add android         # SOLO la primera vez: crea la carpeta android/
npm run android:sync        # = npm run build + npx cap sync android
npm run android:abrir       # abre el proyecto en Android Studio
```

En Android Studio:
- **Probar:** elegir el emulador y presionar ▶ *Run*.
- **APK:** menú *Build › Generate App Bundles or APKs › Generate APKs*. Queda en
  `android/app/build/outputs/apk/debug/app-debug.apk` (se puede copiar al teléfono e instalar).

Cada vez que cambie el código React o el `.env`: `npm run android:sync` y volver a ejecutar.
**No** repetir `npx cap add android`.

## 4. Flujos móviles (caso 3.6 · Agenda de actividades y eventos)
Cuenta de prueba: `apoderado.demo1@ejemplo.cl` / `PequenosReyes2026`.

1. **Explorar eventos:** *Calendario* muestra las actividades con fecha, lugar y cupos (`GET /eventos`, `GET /actividades`).
2. **Iniciar sesión:** botón *Portal familias* (`POST /auth/login`, `GET /auth/yo`).
3. **Inscribir y consultar estado:** en *Eventos del jardín: inscribir a mis hijos* se inscribe o cancela
   (`POST /eventos/{id}/inscripciones`, `POST /inscripciones/{id}/cancelar`, `GET /apoderados/{id}/inscripciones`).
   Si no quedan cupos la API responde 409 y la app muestra el motivo.
4. **Comprobantes:** flujo de inscripción con pago simulado y *Mis comprobantes* (`POST /pagos`, `GET /pagos/mios`, `GET /pagos/comprobante/{codigo}`).
5. **Nueva función: recordatorio en el teléfono** (ver punto 5).

Comprobación entre clientes: inscribir desde el teléfono y recargar la web en el PC con la misma
cuenta; la inscripción y los cupos actualizados aparecen allí (y en Swagger `GET /api/v1/eventos`).

## 5. Nueva función: recordatorio en el teléfono 🔔
Problema: los apoderados olvidan actividades que se avisan con días de anticipación. En la app,
junto a cada hijo **inscrito** aparece el botón **🔔 Recordarme**:

- Programa una **notificación local de Android** para **el día anterior a las 18:00**, con el nombre
  de la actividad, del hijo, la hora y el lugar. Si esa hora ya pasó, avisa **una hora antes**.
- La primera vez Android pide permiso de notificaciones; si se rechaza, la app explica cómo activarlo.
- Muestra *🔔 Recordatorio activo* y permite **🔕 Quitar aviso**. Al cancelar la inscripción el aviso se borra solo.
- *Probar notificación* envía un aviso en 5 segundos (útil para la demostración).
- En el navegador estos botones no aparecen: es una función propia del teléfono.

Archivos:
| Archivo | Rol |
|---|---|
| `src/utils/recordatorios.js` | Reglas puras: cuándo avisar, id y texto de la notificación. |
| `src/utils/recordatorios.test(IA).js` | 7 pruebas con `node --test` (incluye cambio de mes y actividades ya iniciadas). |
| `src/services/recordatorios.js` | Habla con el plugin `@capacitor/local-notifications` (permiso, programar, cancelar, pendientes). |
| `src/components/InscripcionesActividades.jsx` | Botones *Recordarme / Quitar aviso* y aviso de confirmación o error. |

El recordatorio vive en el teléfono (no se guarda en el backend): es una preferencia del dispositivo,
mientras que la inscripción sí se persiste en PostgreSQL mediante la API.

## 6. Problemas comunes
| Síntoma | Solución |
|---|---|
| "No hay conexión con el servidor" en el emulador | Abrir `http://10.0.2.2:8000/health` en el Chrome del emulador. Revisar `VITE_API_ANDROID` y ejecutar `npm run android:sync`. |
| Funciona en la web pero no en Android | CORS: `CORS_ORIGINS` debe incluir `https://localhost`. Reiniciar la API. |
| Teléfono físico no conecta | `BIND_HOST=0.0.0.0`, IP correcta del PC, misma Wi-Fi y firewall abierto en el puerto 8000. |
| No llega la notificación | Ajustes › Apps › Pequeños Reyes › Notificaciones: activar. En modo ahorro de batería puede llegar con unos minutos de retraso. |
| Cambios de React no aparecen en la APK | Falta `npm run android:sync` antes de volver a ejecutar. |

## 7. Uso de IA
Completar por el equipo: qué partes fueron generadas o asistidas por IA (configuración de Capacitor,
servicio y reglas del recordatorio, esta guía) y cómo se revisaron (pruebas `npm test`, ejecución en
emulador, prueba en teléfono).
