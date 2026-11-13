// HU-23 (SCRUM-104) · Flujo React de eventos, inscripción y comprobante.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filtrarActividadesPortal, obtenerPagosInscripciones } from './eventosApi.js';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

const ACTIVIDADES_MUESTRA = [
  { id: 1, titulo: 'Taller TEL', categoria_id: 10, cupos_disponibles: 5, estado: 'publicada' },
  { id: 2, titulo: 'Salida Granja', categoria_id: 20, cupos_disponibles: 0, estado: 'publicada' },
  { id: 3, titulo: 'Evento Cancelado', categoria_id: 10, cupos_disponibles: 10, estado: 'cancelada' },
];

test('CP-HU-23-01: filtra actividades por categoría, disponibilidad de cupos y estado, y consulta inscripciones', async (t) => {
  // CA2: Filtro combinado por categoría, cupos y estado
  const soloConCupos = filtrarActividadesPortal(ACTIVIDADES_MUESTRA, {
    categoriaId: 'todas',
    filtroCupos: 'disponibles',
    estado: 'publicada',
  });
  assert.equal(soloConCupos.length, 1);
  assert.equal(soloConCupos[0].id, 1);

  const agotadasCat20 = filtrarActividadesPortal(ACTIVIDADES_MUESTRA, {
    categoriaId: '20',
    filtroCupos: 'agotados',
    estado: 'publicada',
  });
  assert.equal(agotadasCat20.length, 1);
  assert.equal(agotadasCat20[0].id, 2);

  // CA1: Flujo React -> API -> SQL -> React para listado de inscripciones
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => [
      {
        id: 99,
        urlConsultada: String(url),
        codigo_comprobante: 'PR-COMP-20261106-FFEEDD',
        estado_pago: 'confirmado',
      },
    ],
  });

  const lista = await obtenerPagosInscripciones({ actividadId: 1, apoderadoRut: '12.345.678-5' });
  assert.equal(lista.length, 1);
  assert.match(lista[0].urlConsultada, /actividad_id=1/);
  assert.match(lista[0].urlConsultada, /apoderado_rut=12\.345\.678-5/);
});

test('CP-HU-23-02: maneja entradas inválidas en filtros, error de red 503 y estructura responsive', async (t) => {
  assert.deepEqual(filtrarActividadesPortal(null), []);

  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ detail: 'Servicio no disponible' }),
  });

  // pedir() traduce cualquier 5xx a un mensaje para el usuario (TEC-17).
  await assert.rejects(() => obtenerPagosInscripciones(), (e) => e.estado === 500 && /no está disponible/.test(e.message));

  // CA4 y CA5: Verificar integración en App.jsx, acciones Confirmar/Cancelar y clases responsive
  // Desde TEC-17 el calendario vive en pages/CalendarioSeccion.jsx (App.jsx solo arma la página).
  const appCode = leer('../pages/CalendarioSeccion.jsx');
  const compCode = leer('../components/FlujoInscripcionEventos.jsx');
  assert.match(appCode, /<FlujoInscripcionEventos key=\{[^}]+\} actualizacion=\{cambiosActividades\} onCambioInscripcion=\{cargarActividadesCalendario\} \/>/);
  assert.match(compCode, /Confirmar/);
  assert.match(compCode, /Cancelar/);
  assert.match(compCode, /col-12 col-md-4/);
  assert.match(compCode, /col-12 col-lg-7/);
});
