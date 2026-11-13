// HU-18 (SCRUM-98) · Crear, editar y publicar actividades escolares.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  publicarActividad,
  cancelarActividad,
} from './eventosApi.js';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

test('CP-HU-18-01: ciclo completo crear, editar, publicar, cancelar y filtrar solo publicadas', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  const llamadas = [];
  globalThis.fetch = async (url, options = {}) => {
    llamadas.push({ url: String(url), method: options.method || 'GET', headers: options.headers });
    if (String(url).endsWith('/publicar')) {
      return { ok: true, status: 200, json: async () => ({ id: 10, estado: 'publicada' }) };
    }
    if (String(url).endsWith('/cancelar')) {
      return { ok: true, status: 200, json: async () => ({ id: 10, estado: 'cancelada' }) };
    }
    return {
      ok: true,
      status: options.method === 'POST' ? 201 : 200,
      json: async () => ({
        id: 10,
        estado: 'borrador',
        ...(options.body ? JSON.parse(options.body) : {}),
      }),
    };
  };

  const creada = await crearActividad({
    titulo: 'Taller Sensorial',
    fecha: '2026-11-20',
    lugar: 'Sala 2',
    capacidad: 15,
    categoria_id: 1,
    organizador_id: 1,
  });
  assert.equal(creada.id, 10);
  // Cierre H-01: el rol ya no viaja en X-Rol; el servidor lo toma de la sesión.
  assert.equal(llamadas[0].headers['X-Rol'], undefined);

  const editada = await actualizarActividad(10, { lugar: 'Patio Central', capacidad: 20 });
  assert.equal(editada.lugar, 'Patio Central');
  assert.equal(llamadas[1].method, 'PATCH');

  const publicada = await publicarActividad(10);
  assert.equal(publicada.estado, 'publicada');

  const cancelada = await cancelarActividad(10);
  assert.equal(cancelada.estado, 'cancelada');

  globalThis.fetch = async (url) => {
    llamadas.push({ url: String(url), method: 'GET' });
    return { ok: true, status: 200, json: async () => [{ id: 10, estado: 'publicada' }] };
  };

  const visiblesFamilias = await obtenerActividades(true, 1);
  assert.equal(visiblesFamilias.length, 1);
  assert.match(llamadas[llamadas.length - 1].url, /solo_publicadas=true/);
  assert.match(llamadas[llamadas.length - 1].url, /categoria_id=1/);
});

test('CP-HU-18-02: rechazo HTTP 400/403/409 en actividades propaga mensaje claro', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({
      detail: 'Permiso denegado: se requiere perfil de organizador o dirección para gestionar actividades',
    }),
  });

  await assert.rejects(
    () => crearActividad({ titulo: 'Evento' }, 'apoderado'),
    /Permiso denegado/
  );

  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      detail: 'No se puede publicar una actividad que fue cancelada',
    }),
  });

  await assert.rejects(() => publicarActividad(10), /fue cancelada/);
});

test('CA5: App.jsx integra GestionActividades y sincroniza Agenda con actividadesCalendario', () => {
  // Desde TEC-17 el calendario vive en pages/CalendarioSeccion.jsx (App.jsx solo arma la página).
  const appCode = leer('../pages/CalendarioSeccion.jsx');
  const compCode = leer('../components/GestionActividades.jsx');
  assert.match(appCode, /<GestionActividades onCambioActividades=\{alCambiarActividades\} actualizacion=\{cambiosActividades\} \/>/);
  assert.match(appCode, /<Agenda actividades=\{actividadesCalendario\}/);
  assert.match(compCode, /Publicar/);
  assert.match(compCode, /Cancelar/);
});
