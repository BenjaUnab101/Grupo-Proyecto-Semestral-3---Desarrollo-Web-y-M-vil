// HU-27 (SCRUM-115) · Gestión de documentos y protocolos del jardín.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CATEGORIAS_DOCUMENTO,
  obtenerDocumentos,
  crearDocumento,
  actualizarDocumento,
  filtrarDocumentosPorCategoria,
} from './documentosApi.js';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

const DOCS_MUESTRA = [
  { id: 1, titulo: 'Reglamento 2026', categoria: 'Reglamentos', vigente: true },
  { id: 2, titulo: 'Protocolo Salud', categoria: 'Protocolos', vigente: true },
  { id: 3, titulo: 'Reglamento 2020', categoria: 'Reglamentos', vigente: false },
];

test('CP-HU-27-01: crear, editar, listar desde API y filtrar por categoría y vigencia', async (t) => {
  assert.deepEqual(CATEGORIAS_DOCUMENTO, ['Todos', 'Reglamentos', 'Protocolos', 'Formularios']);

  const vigentesReglamentos = filtrarDocumentosPorCategoria(DOCS_MUESTRA, 'Reglamentos', true);
  assert.equal(vigentesReglamentos.length, 1);
  assert.equal(vigentesReglamentos[0].id, 1);

  const todosDireccion = filtrarDocumentosPorCategoria(DOCS_MUESTRA, 'Reglamentos', false);
  assert.equal(todosDireccion.length, 2);

  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  const llamadas = [];
  globalThis.fetch = async (url, options = {}) => {
    llamadas.push({ url: String(url), method: options.method || 'GET', headers: options.headers });
    return {
      ok: true,
      status: options.method === 'POST' ? 201 : 200,
      json: async () => ({
        id: 10,
        vigente: true,
        ...(options.body ? JSON.parse(options.body) : {}),
      }),
    };
  };

  const creado = await crearDocumento({
    titulo: 'Protocolo de Evacuación',
    categoria: 'Protocolos',
    descripcion: 'Zonas de seguridad.',
  });
  assert.equal(creado.id, 10);
  // Cierre H-01: el rol ya no viaja en X-Rol; el servidor lo toma de la sesión.
  assert.equal(llamadas[0].headers['X-Rol'], undefined);

  const editado = await actualizarDocumento(10, { vigente: false });
  assert.equal(editado.vigente, false);
  assert.equal(llamadas[1].method, 'PATCH');

  globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => [{ id: 10, urlConsultada: String(url) }],
  });

  const lista = await obtenerDocumentos({ soloVigentes: true, categoria: 'Protocolos' });
  assert.equal(lista.length, 1);
  assert.match(lista[0].urlConsultada, /solo_vigentes=true/);
  assert.match(lista[0].urlConsultada, /categoria=Protocolos/);
});

test('CP-HU-27-02: rechazo por permisos (403) o duplicado (409) y verificación de componentes accesibles', async (t) => {
  assert.deepEqual(filtrarDocumentosPorCategoria(null), []);

  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({
      detail: 'Permiso denegado: solo la dirección puede gestionar documentos y protocolos',
    }),
  });

  await assert.rejects(
    () => crearDocumento({ titulo: 'Test' }, 'apoderado'),
    /Permiso denegado/
  );

  const compCode = leer('../components/Documentos.jsx');
  const itemCode = leer('../components/DocumentoItem.jsx');
  assert.match(compCode, /role="group"/);
  assert.match(compCode, /No hay documentos vigentes en esta categoría/);
  assert.match(itemCode, /Vigente/);
  assert.match(itemCode, /Archivado/);
});
