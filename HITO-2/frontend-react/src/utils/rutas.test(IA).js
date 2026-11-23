// Navegación por apartados (utils/rutas.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RUTAS, hrefDeRuta, rutaDesdeHash, rutasDelMenu, tituloDocumento } from './rutas.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

test('lee la ruta desde el hash', () => {
  assert.equal(rutaDesdeHash('#/calendario'), 'calendario')
  assert.equal(rutaDesdeHash('#/Matricula'), 'matricula')
  assert.equal(rutaDesdeHash('#/contacto?codigo=X'), 'contacto')
})

test('vacío o desconocido lleva al inicio', () => {
  for (const hash of ['', '#', '#/', undefined, null, '#/no-existe']) assert.equal(rutaDesdeHash(hash), 'inicio')
})

test('las anclas antiguas de la página única siguen funcionando', () => {
  assert.equal(rutaDesdeHash('#matricula'), 'matricula')
  assert.equal(rutaDesdeHash('#informacion'), 'nosotros')
  assert.equal(rutaDesdeHash('#cupos-salas'), 'cupos')
  assert.equal(rutaDesdeHash('#panel-direccion'), 'panel')
})

test('href de ida y vuelta para todas las rutas', () => {
  assert.equal(hrefDeRuta('inicio'), '#/')
  for (const { id } of RUTAS) assert.equal(rutaDesdeHash(hrefDeRuta(id)), id)
})

test('el Panel aparece en el menú solo para el personal; Inicio nunca (es el logo)', () => {
  assert.ok(!rutasDelMenu(false).some((r) => r.id === 'panel'))
  assert.ok(rutasDelMenu(true).some((r) => r.id === 'panel'))
  assert.ok(!rutasDelMenu(true).some((r) => r.id === 'inicio'))
})

test('título de la pestaña', () => {
  assert.equal(tituloDocumento('calendario'), 'Calendario · Pequeños Reyes')
  assert.equal(tituloDocumento('inicio'), 'Pequeños Reyes · Escuela de Lenguaje')
})

test('cada ruta tiene su página en PaginaPrincipal', () => {
  const pagina = leer('../pages/PaginaPrincipal.jsx')
  for (const { id } of RUTAS) assert.match(pagina, new RegExp(`^\\s+${id}: `, 'm'), id)
})
