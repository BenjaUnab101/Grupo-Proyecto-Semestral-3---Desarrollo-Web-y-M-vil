// HU-20 (SCRUM-100) · Pagos simulados y comprobantes de actividades.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registrarPagoInscripcion,
  consultarComprobantePago,
  actualizarEstadoPago,
} from './eventosApi.js';

test('CP-HU-20-01: registra pago simulado, retorna comprobante verificable y permite transición autorizada', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('/comprobante/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 5,
          codigo_comprobante: 'PR-COMP-20261106-ABC123',
          estado_pago: 'confirmado',
          es_simulado: true,
        }),
      };
    }
    if (options.method === 'PATCH') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 5,
          codigo_comprobante: 'PR-COMP-20261106-ABC123',
          estado_pago: JSON.parse(options.body).estado_pago,
        }),
      };
    }
    return {
      ok: true,
      status: 201,
      json: async () => ({
        id: 5,
        codigo_comprobante: 'PR-COMP-20261106-ABC123',
        estado_pago: 'pagado',
        es_simulado: true,
        ...JSON.parse(options.body),
      }),
    };
  };

  const creado = await registrarPagoInscripcion({
    actividad_id: 1,
    apoderado_rut: '12.345.678-5',
    nombre_parvulo: 'Sofía Pérez',
    monto: 3500,
  });
  assert.match(creado.codigo_comprobante, /^PR-COMP-/);
  assert.equal(creado.es_simulado, true);

  const confirmado = await actualizarEstadoPago(5, 'confirmado');
  assert.equal(confirmado.estado_pago, 'confirmado');

  const verificado = await consultarComprobantePago('PR-COMP-20261106-ABC123');
  assert.equal(verificado.codigo_comprobante, 'PR-COMP-20261106-ABC123');
});

test('CP-HU-20-02: rechaza código de comprobante vacío, inexistente (404) o transición ilegal (409)', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  await assert.rejects(() => consultarComprobantePago('   '), /código de comprobante válido/);

  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ detail: 'Comprobante de pago simulado no encontrado' }),
  });

  await assert.rejects(
    () => consultarComprobantePago('PR-COMP-NO-EXISTE'),
    /Comprobante de pago simulado no encontrado/
  );

  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      detail: "Transición de estado no autorizada: no se puede pasar de 'cancelado' a 'confirmado'",
    }),
  });

  await assert.rejects(() => actualizarEstadoPago(5, 'confirmado'), /Transición de estado no autorizada/);
});
