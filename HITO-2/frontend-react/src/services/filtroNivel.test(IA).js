// HU-03 · Filtrar comunicados por nivel.
// Ejecutar: node --test "src/**/*.test(IA).js"
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FILTRO_TODOS,
  NIVELES,
  OPCIONES_FILTRO_NIVEL,
  INCLUIR_GENERALES_EN_NIVELES,
  filtrarPorNivel,
  ordenarComunicados,
} from './comunicados.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const datos = JSON.parse(leer('../data/comunicados.json'))

// Fixture controlado con un comunicado de cada nivel.
const muestra = [
  { id: 'g1', nivel: 'General', fecha: '2026-09-01' },
  { id: 't1', nivel: 'Salas TEL', fecha: '2026-09-02' },
  { id: 'p1', nivel: 'Preescolar', fecha: '2026-09-03' },
  { id: 'g2', nivel: 'General', fecha: '2026-09-04' },
]
const ids = (lista) => lista.map((c) => c.id)

test('CA1: las opciones son Todos, General, Salas TEL y Preescolar, con Todos primero', () => {
  assert.deepEqual(OPCIONES_FILTRO_NIVEL, ['Todos', 'General', 'Salas TEL', 'Preescolar'])
  assert.equal(OPCIONES_FILTRO_NIVEL[0], FILTRO_TODOS)
})

test('CP-HU-03-01: elegir "Salas TEL" deja solo comunicados de ese nivel', () => {
  const resultado = filtrarPorNivel(muestra, 'Salas TEL')
  assert.deepEqual(ids(resultado), ['t1'])
  assert.ok(resultado.every((c) => c.nivel === 'Salas TEL'))
})

test('CA1: cada nivel devuelve solo sus comunicados', () => {
  assert.deepEqual(ids(filtrarPorNivel(muestra, 'General')), ['g1', 'g2'])
  assert.deepEqual(ids(filtrarPorNivel(muestra, 'Preescolar')), ['p1'])
})

test('CP-HU-03-02: un nivel sin comunicados devuelve lista vacía (dispara el mensaje vacío)', () => {
  const sinTel = muestra.filter((c) => c.nivel !== 'Salas TEL')
  assert.deepEqual(filtrarPorNivel(sinTel, 'Salas TEL'), [])
})

test('CA4: "Todos" restaura la colección completa y en el mismo orden', () => {
  const filtrada = filtrarPorNivel(muestra, 'Preescolar')
  assert.equal(filtrada.length, 1)
  assert.deepEqual(ids(filtrarPorNivel(muestra, FILTRO_TODOS)), ids(muestra))
})

test('filtrar no muta la colección de origen', () => {
  const antes = ids(muestra)
  filtrarPorNivel(muestra, 'General')
  filtrarPorNivel(muestra, FILTRO_TODOS).pop()
  assert.deepEqual(ids(muestra), antes)
})

test('filtrar conserva el orden por fecha (más reciente primero)', () => {
  const ordenados = ordenarComunicados(muestra)
  assert.deepEqual(ids(filtrarPorNivel(ordenados, 'General')), ['g2', 'g1'])
})

test('entradas inválidas no rompen: no-arreglo da [], filtro desconocido equivale a Todos', () => {
  assert.deepEqual(filtrarPorNivel(null, 'General'), [])
  assert.deepEqual(ids(filtrarPorNivel(muestra, 'Nivel inventado')), ids(muestra))
  assert.deepEqual(ids(filtrarPorNivel([{ id: 'x' }, null], 'General')), [])
})

test('regla General: por defecto el filtro es estricto (decisión pendiente de encuesta)', () => {
  assert.equal(INCLUIR_GENERALES_EN_NIVELES, false)
  assert.deepEqual(ids(filtrarPorNivel(muestra, 'Salas TEL')), ['t1'])
})

test('regla General: si se activa, cada nivel incluye también los General', () => {
  const opciones = { incluirGenerales: true }
  assert.deepEqual(ids(filtrarPorNivel(muestra, 'Salas TEL', opciones)), ['g1', 't1', 'g2'])
  assert.deepEqual(ids(filtrarPorNivel(muestra, 'General', opciones)), ['g1', 'g2'])
})

test('datos: todo comunicado del JSON tiene un nivel válido', () => {
  for (const comunicado of datos) {
    assert.ok(NIVELES.includes(comunicado.nivel), `${comunicado.id} tiene nivel "${comunicado.nivel}"`)
  }
})

test('CP-HU-03-03 (estático): la lista se deriva en render, sin useEffect', () => {
  const board = leer('../components/ComunicadosBoard.jsx')
  const filtro = leer('../components/FiltroNivel.jsx')
  // Se busca el uso real (llamada o import), no menciones en comentarios.
  const usaHook = (codigo, hook) =>
    new RegExp(`\\b${hook}\\s*\\(`).test(codigo) ||
    new RegExp(`import[^;]*\\b${hook}\\b[^;]*from 'react'`).test(codigo)
  assert.equal(usaHook(board, 'useEffect'), false)
  assert.equal(usaHook(filtro, 'useEffect'), false)
  assert.equal(usaHook(filtro, 'useState'), false)
  assert.match(board, /useState\(FILTRO_TODOS\)/)
  assert.match(board, /const visibles = filtrarPorNivel\(ordenados, filtroActivo\)/)
})

test('CA1/CA4 (estático): FiltroNivel usa <button> con aria-pressed dentro de role="group"', () => {
  const filtro = leer('../components/FiltroNivel.jsx')
  assert.match(filtro, /role="group"/)
  assert.match(filtro, /<button/)
  assert.match(filtro, /type="button"/)
  assert.match(filtro, /aria-pressed=\{estaActivo\}/)
  assert.match(filtro, /onClick=\{\(\) => onCambiarFiltro\(opcion\)\}/)
})
