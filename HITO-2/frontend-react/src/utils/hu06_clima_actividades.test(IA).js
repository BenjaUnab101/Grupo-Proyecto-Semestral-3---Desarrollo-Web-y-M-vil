// HU-06 (SCRUM-53) · Clima previsto en cada actividad del calendario.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { climaParaFecha, resumenClimaActividad } from './clima.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

// Pronóstico con la forma que entrega services/climaService.js (adaptarPronostico). Datos ficticios.
const PRONOSTICO = [
  { fecha: '2026-11-10', codigoClima: 0, temperaturaMaxima: 27.6, temperaturaMinima: 12, probabilidadLluvia: 0, indiceUV: 9 },
  { fecha: '2026-11-11', codigoClima: 63, temperaturaMaxima: 15.2, temperaturaMinima: 5, probabilidadLluvia: 80, indiceUV: 7 },
  { fecha: '2026-11-12', codigoClima: 2, temperaturaMaxima: null, temperaturaMinima: null, probabilidadLluvia: null, indiceUV: null },
]

test('CP-HU-06-01 (CA1): actividad dentro del pronóstico -> condición, máxima y recomendación principal', () => {
  const resumen = resumenClimaActividad(climaParaFecha(PRONOSTICO, '2026-11-10'))
  assert.deepEqual(resumen, {
    condicion: 'Despejado',
    maxima: 28,
    principal: 'Se recomienda protección frente al sol.',
    otras: [],
  })
})

test('CA3: varias recomendaciones -> orden definido (lluvia, sol, abrigo) y las demás accesibles', () => {
  const resumen = resumenClimaActividad(climaParaFecha(PRONOSTICO, '2026-11-11'))
  assert.equal(resumen.principal, 'Llevar protección para la lluvia.')
  assert.deepEqual(resumen.otras, ['Se recomienda protección frente al sol.', 'Se recomienda llevar ropa abrigada.'])
})

test('CP-HU-06-02 (CA2): fuera del rango, sin pronóstico o API caída -> sin insignia', () => {
  assert.equal(climaParaFecha(PRONOSTICO, '2026-12-01'), null)
  assert.equal(climaParaFecha([], '2026-11-10'), null) // API fallida: PaginaPrincipal pasa []
  assert.equal(climaParaFecha(undefined, '2026-11-10'), null)
  assert.equal(resumenClimaActividad(null), null)
})

test('CA2: datos nulos no se muestran como 0 ni disparan recomendaciones', () => {
  const resumen = resumenClimaActividad(climaParaFecha(PRONOSTICO, '2026-11-12'))
  assert.equal(resumen.maxima, null)
  assert.equal(resumen.principal, null)
  assert.equal(resumen.condicion, 'Parcialmente nublado')
  assert.equal(resumenClimaActividad({ fecha: '2026-11-13', codigoClima: 999 }), null)
})

test('Unión por fecha civil: compara "AAAA-MM-DD" sin convertir a UTC', () => {
  assert.equal(climaParaFecha(PRONOSTICO, '2026-11-11')?.codigoClima, 63)
  assert.equal(climaParaFecha(PRONOSTICO, '2026-11-11T00:00:00Z'), null)
})

test('Notas técnicas: useClima una vez en PaginaPrincipal y el pronóstico baja por props', () => {
  const pagina = leer('../pages/PaginaPrincipal.jsx')
  assert.equal((pagina.match(/useClima\(\)/g) ?? []).length, 1)
  assert.match(pagina, /pronostico=\{error \? \[\] : pronostico\}/)
  assert.match(leer('../components/Agenda.jsx'), /<Calendario actividades=\{proximas\} pronostico=\{pronostico\} \/>/)
  assert.match(leer('../components/Calendario.jsx'), /climaDelDia=\{climaParaFecha\(pronostico, actividad\.fecha\)\}/)
  const item = leer('../components/ActividadItem.jsx')
  assert.match(item, /\{clima && \(/)
  assert.match(item, /<details/)
})

test('TEC-06: el mapa WMO cubre todos los códigos documentados por Open-Meteo', async () => {
  const { obtenerCondicionClima } = await import('./clima.js')
  const documentados = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]
  for (const codigo of documentados) assert.notEqual(obtenerCondicionClima(codigo), 'Condición no disponible', String(codigo))
  assert.equal(obtenerCondicionClima(4), 'Condición no disponible') // código no documentado: no se inventa
})
