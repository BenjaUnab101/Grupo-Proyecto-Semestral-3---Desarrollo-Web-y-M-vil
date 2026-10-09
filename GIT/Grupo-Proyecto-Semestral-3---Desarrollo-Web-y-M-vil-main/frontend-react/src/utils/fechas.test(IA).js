// HU-04 · Calendario de actividades con aviso de próximas a vencer.
// Ejecutar: npm test   (o: node --test "src/**/*.test(IA).js")
// Para comprobar que no depende de la zona del computador, se puede correr también con
// TZ=UTC, TZ=America/Santiago o TZ=Asia/Tokyo antepuesto al comando (Linux/macOS).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DIAS_PROXIMA,
  ZONA_HORARIA,
  actividadesVigentes,
  diasHasta,
  esProxima,
  formatearFecha,
  obtenerHoy,
  parseFechaISO,
} from './fechas.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const actividadesDemo = JSON.parse(leer('../data/actividades.json'))

// Fecha base de prueba documentada en docs/HU-04-calendario.md.
const HOY = '2026-10-09'
const ids = (lista) => lista.map((a) => a.id)

// ---------- CA4 / CA-C: ayer, hoy, +7, +8 ----------

test('CA4: diasHasta cuenta días calendario (ayer -1, hoy 0, +7, +8)', () => {
  assert.equal(diasHasta('2026-10-08', HOY), -1)
  assert.equal(diasHasta('2026-10-09', HOY), 0)
  assert.equal(diasHasta('2026-10-16', HOY), 7)
  assert.equal(diasHasta('2026-10-17', HOY), 8)
})

test('CA2: «Próxima» incluye de 0 a 7 días; excluye +8 y ayer', () => {
  assert.equal(DIAS_PROXIMA, 7)
  assert.equal(esProxima(diasHasta('2026-10-09', HOY)), true) // hoy
  assert.equal(esProxima(diasHasta('2026-10-16', HOY)), true) // +7
  assert.equal(esProxima(diasHasta('2026-10-17', HOY)), false) // +8
  assert.equal(esProxima(diasHasta('2026-10-08', HOY)), false) // ayer
  assert.equal(esProxima(null), false)
})

test('CA4: diasHasta cruza meses, años y años bisiestos', () => {
  assert.equal(diasHasta('2026-11-01', '2026-10-31'), 1)
  assert.equal(diasHasta('2027-01-01', '2026-12-31'), 1)
  assert.equal(diasHasta('2028-03-01', '2028-02-28'), 2) // 2028 es bisiesto
})

test('CA-C: los cambios de hora de Chile no alteran el conteo de días', () => {
  // Inicio del horario de verano 2026 (domingo 6 de septiembre): ese día dura 23 h.
  assert.equal(diasHasta('2026-09-07', '2026-09-05'), 2)
  assert.equal(diasHasta('2026-09-12', '2026-09-05'), 7)
  // Fin del horario de verano 2026 (domingo 5 de abril): ese día dura 25 h.
  assert.equal(diasHasta('2026-04-06', '2026-04-04'), 2)
  assert.equal(diasHasta('2026-04-11', '2026-04-04'), 7)
})

test('CA4: obtenerHoy usa America/Santiago y no la zona UTC del equipo', () => {
  assert.equal(ZONA_HORARIA, 'America/Santiago')
  // 2026-10-10 02:30 UTC = 2026-10-09 23:30 en Santiago (UTC-3): aún es día 9.
  assert.equal(obtenerHoy(new Date('2026-10-10T02:30:00Z')), '2026-10-09')
  // 2026-10-10 03:30 UTC = 2026-10-10 00:30 en Santiago: ya es día 10.
  assert.equal(obtenerHoy(new Date('2026-10-10T03:30:00Z')), '2026-10-10')
  // En invierno (UTC-4): 2026-07-15 03:30 UTC = 14 de julio 23:30 en Santiago.
  assert.equal(obtenerHoy(new Date('2026-07-15T03:30:00Z')), '2026-07-14')
})

test('CA4: una fecha AAAA-MM-DD no se desplaza al día anterior al formatearla', () => {
  assert.equal(formatearFecha('2026-10-09'), 'viernes, 9 de octubre de 2026')
  assert.equal(formatearFecha('2026-01-01'), 'jueves, 1 de enero de 2026')
  assert.equal(formatearFecha('2026-12-31'), 'jueves, 31 de diciembre de 2026')
})

// ---------- CA-C: fecha vacía o inválida ----------

test('CA-C: fechas vacías o inválidas devuelven null y no rompen', () => {
  for (const valor of ['', '   ', null, undefined, '2026-02-30', '09-10-2026', '2026-10-9', 20261009]) {
    assert.equal(parseFechaISO(valor), null, `parseFechaISO(${JSON.stringify(valor)})`)
    assert.equal(diasHasta(valor, HOY), null)
    assert.equal(formatearFecha(valor), null)
  }
  assert.equal(diasHasta('2026-10-09', ''), null)
})

// ---------- CA1 / CA3: filtrado y orden ----------

const muestra = [
  { id: 'mas8', fecha: '2026-10-17' },
  { id: 'ayer', fecha: '2026-10-08' },
  { id: 'mas7', fecha: '2026-10-16' },
  { id: 'hoy-tarde', fecha: '2026-10-09', hora: '18:00' },
  { id: 'sin-fecha', fecha: '' },
  { id: 'hoy-sin-hora', fecha: '2026-10-09' },
  { id: 'invalida', fecha: '2026-02-30' },
  { id: 'hoy-temprano', fecha: '2026-10-09', hora: '08:30' },
]

test('CA1: solo desde hoy en adelante y en orden ascendente', () => {
  const resultado = actividadesVigentes(muestra, HOY)
  assert.deepEqual(ids(resultado), ['hoy-temprano', 'hoy-tarde', 'hoy-sin-hora', 'mas7', 'mas8'])
  assert.deepEqual(resultado.map((a) => a.diasRestantes), [0, 0, 0, 7, 8])
})

test('CA1: excluye ayer y las actividades sin fecha válida', () => {
  const resultado = ids(actividadesVigentes(muestra, HOY))
  for (const id of ['ayer', 'sin-fecha', 'invalida']) assert.ok(!resultado.includes(id), id)
})

test('CA1: no muta el arreglo de entrada', () => {
  const antes = JSON.stringify(muestra)
  actividadesVigentes(muestra, HOY)
  assert.equal(JSON.stringify(muestra), antes)
})

test('CA3: lista vacía, solo pasadas o valor no-arreglo devuelven []', () => {
  assert.deepEqual(actividadesVigentes([], HOY), [])
  assert.deepEqual(actividadesVigentes([{ id: 'x', fecha: '2026-01-01' }], HOY), [])
  assert.deepEqual(actividadesVigentes(null, HOY), [])
})

// ---------- CP-HU-04-01: fixture actividades.json con fecha base ----------

test('CP-HU-04-01: con actividades.json y hoy=2026-10-09 se listan 7 en orden', () => {
  const resultado = actividadesVigentes(actividadesDemo, HOY)
  assert.deepEqual(ids(resultado), [
    'demo-act-03', 'demo-act-04', 'demo-act-05', 'demo-act-06',
    'demo-act-07', 'demo-act-08', 'demo-act-09',
  ])
  const fechas = resultado.map((a) => a.fecha)
  assert.deepEqual(fechas, [...fechas].sort())
})

test('CP-HU-04-02: con hoy=2026-10-09 son «Próxima» hoy, +3, +5 y +7, pero no +8', () => {
  const proximas = actividadesVigentes(actividadesDemo, HOY).filter((a) => esProxima(a.diasRestantes))
  assert.deepEqual(ids(proximas), ['demo-act-03', 'demo-act-04', 'demo-act-05', 'demo-act-06'])
})

test('CP-HU-04-03: con hoy=2027-01-01 no quedan actividades futuras', () => {
  assert.deepEqual(actividadesVigentes(actividadesDemo, '2027-01-01'), [])
})

test('fixtures: actividades.json está identificado como demo, con ids únicos y fechas válidas', () => {
  const idsDemo = ids(actividadesDemo)
  assert.equal(new Set(idsDemo).size, idsDemo.length)
  for (const a of actividadesDemo) {
    assert.equal(a.demo, true, a.id)
    assert.match(a.id, /^demo-act-\d{2}$/)
    assert.ok(parseFechaISO(a.fecha), `${a.id} tiene fecha válida`)
  }
})

// ---------- Contratos de componentes (estático) ----------

test('contrato: Agenda → Calendario → ActividadItem, derivado en render y sin useEffect', () => {
  const agenda = leer('../components/Agenda.jsx')
  const calendario = leer('../components/Calendario.jsx')
  const item = leer('../components/ActividadItem.jsx')
  const usaHook = (codigo, hook) =>
    new RegExp(`\\b${hook}\\s*\\(`).test(codigo) ||
    new RegExp(`import[^;]*\\b${hook}\\b[^;]*from 'react'`).test(codigo)

  for (const codigo of [agenda, calendario, item]) {
    assert.equal(usaHook(codigo, 'useEffect'), false)
    assert.equal(usaHook(codigo, 'useState'), false)
  }
  assert.match(agenda, /<Calendario actividades=\{proximas\} \/>/)
  assert.match(agenda, /const proximas = actividadesVigentes\(actividades, fechaBase\)/)
  assert.match(calendario, /<ActividadItem/)
  assert.match(calendario, /No hay actividades programadas/)
  assert.match(item, />Próxima</)
})
