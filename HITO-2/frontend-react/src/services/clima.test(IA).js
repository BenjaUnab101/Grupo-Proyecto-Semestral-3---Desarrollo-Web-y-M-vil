// TEC-18 (SCRUM-106) · Conservar Open-Meteo, responsive y accesibilidad.
// Ejecutar: node --test "src/**/*.test(IA).js"
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { obtenerPronostico } from './climaService.js';
import { obtenerCondicionClima, obtenerRecomendacionesClima } from '../utils/clima.js';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

const MOCK_OPEN_METEO_OK = {
  daily_units: {
    temperature_2m_max: '°C',
    precipitation_probability_max: '%',
    uv_index_max: '',
  },
  daily: {
    time: ['2026-11-04', '2026-11-05'],
    weather_code: [0, 61],
    temperature_2m_max: [21.5, 16.0],
    temperature_2m_min: [11.2, 6.5],
    precipitation_probability_max: [10, 80],
    uv_index_max: [7.2, 3.1],
  },
};

// ---------- CP-TEC-18-01: Flujo exitoso desde API/React ----------

test('CP-TEC-18-01: obtenerPronostico transforma respuesta válida de Open-Meteo', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  let urlSolicitada = '';
  globalThis.fetch = async (url) => {
    urlSolicitada = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => MOCK_OPEN_METEO_OK,
    };
  };

  const resultado = await obtenerPronostico();

  assert.match(urlSolicitada, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
  assert.match(urlSolicitada, /latitude=-33\.0153/);
  assert.match(urlSolicitada, /longitude=-71\.5500/);
  assert.match(urlSolicitada, /timezone=America%2FSantiago/);
  assert.equal(resultado.length, 2);
  assert.deepEqual(resultado[0], {
    fecha: '2026-11-04',
    codigoClima: 0,
    temperaturaMaxima: 21.5,
    temperaturaMinima: 11.2,
    probabilidadLluvia: 10,
    indiceUV: 7.2,
    unidades: {
      temperatura: '°C',
      probabilidadLluvia: '%',
      indiceUV: '',
    },
  });
});

test('CP-TEC-18-01: utilidades traducen códigos WMO y generan recomendaciones', () => {
  assert.equal(obtenerCondicionClima(0), 'Despejado');
  assert.equal(obtenerCondicionClima(61), 'Lluvia');
  assert.equal(obtenerCondicionClima(999), 'Condición no disponible');

  const recomendaciones = obtenerRecomendacionesClima({
    probabilidadLluvia: 75,
    indiceUV: 6,
    temperaturaMinima: 5,
  });

  assert.equal(recomendaciones.length, 3);
});

// ---------- CP-TEC-18-02: Entrada inválida, indisponibilidad o rechazo ----------

test('CP-TEC-18-02: error HTTP del servidor externo lanza excepción controlada', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({}),
  });

  await assert.rejects(
    () => obtenerPronostico(),
    /Error HTTP al consultar el pronóstico \(503\)\./
  );
});

test('CP-TEC-18-02: respuesta con formato JSON inválido o contrato corrupto es rechazada', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ daily: { time: ['2026-11-04'] } }), // faltan arreglos requeridos
  });

  await assert.rejects(
    () => obtenerPronostico(),
    /no tiene un formato válido/
  );
});

// ---------- CA3 y CA4: Responsive, accesibilidad y sin secretos ----------

test('CA3 y CA4: ClimaWidget incluye atribución, roles accesibles y no existen secretos hardcodeados', () => {
  const widget = leer('../components/ClimaWidget.jsx');
  const servicio = leer('./climaService.js');
  const css = leer('../styles/global.css');

  assert.match(widget, /role="alert"/);
  assert.match(widget, /role="status"/);
  assert.match(widget, /Open-Meteo\.com/);
  assert.match(css, /@media \(max-width: 992px\)/);
  assert.match(css, /@media \(max-width: 576px\)/);
  assert.doesNotMatch(servicio, /api_key|apikey|token|secret|password/i);
});
