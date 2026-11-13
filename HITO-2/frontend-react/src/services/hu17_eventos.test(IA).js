// HU-17 (SCRUM-97) · Gestión de organizadores, perfiles y categorías.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  obtenerOrganizadores,
  crearOrganizador,
  actualizarOrganizador,
  obtenerCategoriasActividad,
  crearCategoriaActividad,
  actualizarCategoriaActividad,
} from './eventosApi.js';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

test('CP-HU-17-01: flujo exitoso crear, editar y listar organizadores y categorías desde servicio React', async (t) => {
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
      json: async () => ({ id: 1, ...(options.body ? JSON.parse(options.body) : {}) }),
    };
  };

  const orgCreado = await crearOrganizador({
    nombre: 'Camila Soto',
    email: 'camila.soto@pequenosreyes.cl',
    rol_perfil: 'Educadora',
  });
  assert.equal(orgCreado.id, 1);
  // Cierre H-01: el rol ya no viaja en X-Rol; el servidor lo toma de la sesión.
  assert.equal(llamadas[0].headers['X-Rol'], undefined);

  const orgEditado = await actualizarOrganizador(1, { rol_perfil: 'Coordinación' });
  assert.equal(orgEditado.rol_perfil, 'Coordinación');
  assert.equal(llamadas[1].method, 'PATCH');

  const catCreada = await crearCategoriaActividad({ nombre: 'Fonoaudiología' });
  assert.equal(catCreada.nombre, 'Fonoaudiología');

  const catEditada = await actualizarCategoriaActividad(1, { descripcion: 'Sesiones TEL' });
  assert.equal(catEditada.descripcion, 'Sesiones TEL');

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => [{ id: 1, nombre: 'Camila Soto' }],
  });
  const listaOrgs = await obtenerOrganizadores();
  const listaCats = await obtenerCategoriasActividad();
  assert.equal(listaOrgs.length, 1);
  assert.equal(listaCats.length, 1);
});

test('CP-HU-17-02: rechazo por permiso insuficiente (403) o duplicado (409) propaga detalle de dominio', async (t) => {
  const fetchOriginal = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({
      detail: 'Permiso denegado: solo la dirección puede gestionar organizadores y categorías',
    }),
  });

  await assert.rejects(
    () => crearOrganizador({ nombre: 'Test', email: 'a@b.cl', rol_perfil: 'Educadora' }, 'apoderado'),
    /Permiso denegado/
  );

  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      detail: 'Ya existe una categoría de actividad con ese nombre',
    }),
  });

  await assert.rejects(
    () => crearCategoriaActividad({ nombre: 'Fonoaudiología' }),
    /Ya existe una categoría/
  );
});

test('CA4: GestionOrganizadores está integrado en App.jsx y expone formularios y alertas accesibles', () => {
  // Desde TEC-17 el calendario vive en pages/CalendarioSeccion.jsx (App.jsx solo arma la página).
  const appCode = leer('../pages/CalendarioSeccion.jsx');
  const compCode = leer('../components/GestionOrganizadores.jsx');
  assert.match(appCode, /<GestionOrganizadores onCambioCatalogo=\{alCambiarActividades\} \/>/);
  assert.match(compCode, /role="alert"/);
  assert.match(compCode, /Editar/);
});
