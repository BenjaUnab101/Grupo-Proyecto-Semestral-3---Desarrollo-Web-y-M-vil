// TEC-17: prueba de la interfaz con una API simulada (Playwright intercepta localhost:8000).
import { chromium } from 'playwright'
const [H, OUT] = process.argv.slice(2)
const API = 'http://localhost:8000/api/v1'
const r = []
const ok = (id, c, d) => { r.push(`${c ? 'PASA ' : 'FALLA'} ${id} — ${d}`) }

// ---------- API simulada (mismos contratos que el backend) ----------
function crearApi() {
  const s = {
    cuentas: [
      { usuario_id: 1, email: 'direccion@ejemplo.cl', rol: 'administrador', nombre: 'Dirección' },
      { usuario_id: 2, email: 'educadora@ejemplo.cl', rol: 'organizador', nombre: 'Educadora Demo' },
      { usuario_id: 5, email: 'demo1@ejemplo.cl', rol: 'apoderado', nombre: 'Apoderado Demo 1' },
    ],
    hijos: { 5: [{ id: 11, codigo: 'DEMO-A01', nombre: 'Alumno Demo A01' }, { id: 12, codigo: 'DEMO-A02', nombre: 'Alumno Demo A02' }] },
    comunicados: [
      { id: 1, titulo: 'Bienvenida demo', cuerpo: 'Texto general', nivel: 'General', alcance: 'Toda la comunidad', categoria: 'Aviso', es_urgente: false, publicado: true, fecha_publicacion: '2026-11-02T12:00:00Z', vigente_hasta: null },
      { id: 2, titulo: 'Reunión TEL demo', cuerpo: 'Texto TEL', nivel: 'Salas TEL', alcance: null, categoria: 'Reunión', es_urgente: true, publicado: true, fecha_publicacion: '2026-11-04T12:00:00Z', vigente_hasta: null },
      { id: 3, titulo: 'Preescolar demo', cuerpo: 'Texto preescolar', nivel: 'Preescolar', alcance: null, categoria: 'Aviso', es_urgente: false, publicado: true, fecha_publicacion: '2026-11-05T12:00:00Z', vigente_hasta: null },
    ],
    actividades: [
      { id: 21, codigo: 'DEMO-T1', titulo: 'Taller de cuentos demo', descripcion: 'Traer un cuento', fecha: '2026-11-10', hora: '10:00:00', lugar: 'Biblioteca', cupo_maximo: 10, inscripciones_abiertas: true, categoria_id: null, organizador_id: null, costo: 0, inscritos: 3 },
      { id: 22, codigo: 'DEMO-T2', titulo: 'Paseo al parque demo', descripcion: null, fecha: '2026-11-20', hora: null, lugar: 'Parque', cupo_maximo: 5, inscripciones_abiertas: true, categoria_id: null, organizador_id: null, costo: 0, inscritos: 4 },
    ],
    inscripciones: [],
    salas: ['Naranja', 'Azul', 'Verde', 'Amarilla', 'Roja', 'Morada', 'Fono 1', 'Fono 2'].map((n, i) => ({ id: i + 1, nombre: `Sala ${n}`, nivel: 'x', grupo_comunicados: 'Preescolar', capacidad: 15, matriculados: [15, 13, 14, 8, 15, 10, 12, 14][i] })),
    sigId: 100,
    fallar: {}, // ruta → 'abort' | número de estado
    demora: {}, // ruta → ms
    prohibirOrganizador: true,
    usuarioBorrado: null,
    llamadas: [],
  }
  const conCupos = (a) => ({ ...a, cupos_disponibles: a.cupo_maximo - a.inscritos })
  async function manejar(route) {
    const q = route.request()
    const url = new URL(q.url())
    const ruta = url.pathname.replace('/api/v1', '')
    const metodo = q.method()
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204 })
    const uid = Number(q.headers()['x-usuario-id'] || 0) || null
    s.llamadas.push(`${metodo} ${ruta}${url.search}${uid ? ` [u${uid}]` : ''}`)
    const clave = `${metodo} ${ruta}`
    if (s.demora[clave]) await new Promise((res) => setTimeout(res, s.demora[clave]))
    if (s.fallar[clave] === 'abort') return route.abort('connectionrefused')
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } })
    if (typeof s.fallar[clave] === 'number') return json(s.fallar[clave], { detail: 'Base de datos no disponible' })
    const cuerpo = q.postData() ? JSON.parse(q.postData()) : null
    const usuario = s.cuentas.find((c) => c.usuario_id === uid && uid !== s.usuarioBorrado)

    if (clave === 'GET /sesion/cuentas-demo') return json(200, s.cuentas)
    if (clave === 'GET /sesion/yo') {
      if (!usuario) return json(401, { detail: 'Debe identificarse con el encabezado X-Usuario-Id' })
      return json(200, { ...usuario, apoderado_id: usuario.rol === 'apoderado' ? 1 : null, hijos: s.hijos[uid] ?? [] })
    }
    if (clave === 'GET /salas/cupos') return json(200, s.salas.map((x) => ({ ...x, cupos_disponibles: x.capacidad - x.matriculados })))
    if (clave === 'GET /comunicados') return json(200, s.comunicados)
    if (clave === 'GET /apoderados/1/comunicados') return json(200, { apoderado_id: 1, niveles: ['General', 'Preescolar'], comunicados: s.comunicados.filter((c) => ['General', 'Preescolar'].includes(c.nivel)) })
    if (clave === 'POST /comunicados') {
      if (!usuario) return json(401, { detail: 'Debe identificarse con el encabezado X-Usuario-Id' })
      if (usuario.rol === 'apoderado') return json(403, { detail: 'Sin permiso para esta acción' })
      if (!cuerpo.titulo || cuerpo.titulo.trim().length < 3) return json(400, { detail: 'Datos de entrada inválidos', errores: [{ campo: 'body.titulo', mensaje: 'String should have at least 3 characters' }] })
      const nuevo = { ...cuerpo, autor_usuario_id: uid, id: ++s.sigId, publicado: true, fecha_publicacion: '2026-11-07T15:00:00Z' }
      s.comunicados.push(nuevo)
      return json(201, nuevo)
    }
    const mDel = clave.match(/^DELETE \/comunicados\/(\d+)$/)
    if (mDel) {
      if (!usuario) return json(401, { detail: 'Debe identificarse con el encabezado X-Usuario-Id' })
      const objetivo = s.comunicados.find((c) => c.id === Number(mDel[1]))
      if (objetivo && usuario.rol === 'organizador' && objetivo.autor_usuario_id !== uid) return json(403, { detail: 'Solo dirección o quien publicó el comunicado puede modificarlo o eliminarlo' })
      const i = s.comunicados.findIndex((c) => c.id === Number(mDel[1]))
      if (i < 0) return json(404, { detail: 'Comunicado no encontrado' })
      s.comunicados.splice(i, 1)
      return route.fulfill({ status: 204 })
    }
    if (clave === 'GET /eventos') return json(200, s.actividades.map(conCupos))
    // Rutas de HU-17/18/20/23 (eventosApi.js): una actividad escolar publicada y listas vacías.
    if (clave === 'GET /actividades') return json(200, [{ id: 1, titulo: 'Reunión de apoderados (HU-18)', fecha: '2026-11-12', hora: '18:30', lugar: 'Sala Azul', preparar: null, capacidad: 30, cupos_ocupados: 0, cupos_disponibles: 30, estado: 'publicada', categoria_id: 1, categoria_nombre: 'Reunión', organizador_id: 1, organizador_nombre: 'Educadora Demo' }])
    if (['GET /organizadores', 'GET /categorias-actividad', 'GET /pagos'].includes(clave)) return json(200, [])
    if (clave === 'GET /apoderados/1/inscripciones') return json(200, s.inscripciones)
    const mIns = clave.match(/^POST \/eventos\/(\d+)\/inscripciones$/)
    if (mIns) {
      const a = s.actividades.find((x) => x.id === Number(mIns[1]))
      if (a.inscritos >= a.cupo_maximo) return json(409, { detail: 'No quedan cupos disponibles para esta actividad' })
      a.inscritos++
      const ins = { id: ++s.sigId, actividad_id: a.id, alumno_id: cuerpo.alumno_id, alumno_nombre: 'x', estado: 'inscrita', creada_en: '', cancelada_en: null }
      s.inscripciones.push(ins)
      return json(201, { ...ins, apoderado_id: 1, actualizada_en: '', cupos_disponibles: a.cupo_maximo - a.inscritos })
    }
    const mCan = clave.match(/^POST \/inscripciones\/(\d+)\/cancelar$/)
    if (mCan) {
      const ins = s.inscripciones.find((x) => x.id === Number(mCan[1]))
      ins.estado = 'cancelada'
      s.actividades.find((x) => x.id === ins.actividad_id).inscritos--
      return json(200, { ...ins, apoderado_id: 1, actualizada_en: '', cupos_disponibles: 0 })
    }
    return json(404, { detail: 'Ruta simulada no encontrada: ' + clave })
  }
  return { s, manejar }
}

const b = await chromium.launch()

async function abrir({ ancho = 1100, preparar } = {}) {
  const api = crearApi()
  preparar?.(api.s)
  const ctx = await b.newContext({ viewport: { width: ancho, height: 1000 }, timezoneId: 'America/Santiago' })
  const p = await ctx.newPage()
  const errores = []
  p.on('pageerror', (e) => errores.push(e.message))
  await ctx.route(`${API}/**`, api.manejar)
  await ctx.route('https://api.open-meteo.com/**', (route) => route.abort())
  await ctx.route('https://fonts.**', (route) => route.abort())
  await p.goto(`${H}/index.html?hoy=2026-11-07`)
  return { api, ctx, p, errores }
}
const elegir = async (p, uid) => {
  await p.selectOption('#cuenta-demo', String(uid))
  await p.waitForFunction((u) => document.querySelector('#cuenta-demo')?.value === String(u) && !document.querySelector('#cuenta-demo').disabled, uid)
  await p.waitForTimeout(250)
}
const texto = (p, sel) => p.locator(sel).first().innerText()

// ---------- 1. Visitante: datos desde la API ----------
{
  const { api, p, errores } = await abrir()
  await p.waitForSelector('#cupos-salas .card')
  await p.waitForSelector('#comunicados .comunicado')
  await p.waitForSelector('#calendario .actividad')
  const nSalas = await p.locator('#cupos-salas .card').count()
  ok('CA2 cupos desde GET /salas/cupos', nSalas === 8 && (await p.locator('#cupos-salas').innerText()).includes('Sala Azul'), `${nSalas} salas`)
  ok('CA2 comunicados desde GET /comunicados', (await p.locator('#comunicados .comunicado').count()) === 3, 'los 3 de la API')
  ok('CA2 calendario: eventos (/eventos) + actividades escolares (/actividades)', (await p.locator('#calendario .actividad').count()) === 3 && (await p.locator('#calendario').innerText()).includes('Reunión de apoderados (HU-18)') && (await texto(p, '#calendario .actividad')).includes('10:00 h'), '2 eventos HU-19 + 1 actividad HU-18')
  ok('visitante no ve formulario ni inscripciones', (await p.locator('.form-publicar').count()) === 0 && (await p.locator('.inscripciones').count()) === 0, 'solo lectura')
  ok('cuentas demo desde la API', (await p.locator('#cuenta-demo option').count()) === 4, (await p.locator('#cuenta-demo option').allInnerTexts()).join(' | '))
  ok('CA1 llamadas a la API', ['GET /salas/cupos', 'GET /comunicados', 'GET /eventos?proximas=true', 'GET /sesion/cuentas-demo'].every((x) => api.s.llamadas.includes(x)), api.s.llamadas.join(', '))
  ok('sin errores JS (visitante)', errores.length === 0, errores.join(' / ') || 'ninguno')
  await p.screenshot({ path: `${OUT}/01-visitante.png`, fullPage: false })
  await p.locator('#comunicados').screenshot({ path: `${OUT}/02-comunicados-visitante.png` })
}

// ---------- 2. Dirección: publicar (400 y éxito) y eliminar ----------
{
  const { api, p, errores } = await abrir()
  await p.waitForSelector('#comunicados .comunicado')
  await elegir(p, 1)
  await p.waitForSelector('.form-publicar')
  await p.fill('#pub-titulo', 'ab')
  await p.fill('#pub-cuerpo', 'Mensaje de prueba')
  await p.click('.form-publicar button[type=submit]')
  await p.waitForSelector('#pub-titulo-error')
  ok('CA3 400 → error junto al campo', (await texto(p, '#pub-titulo-error')) === 'Debe tener al menos 3 caracteres.' && (await p.getAttribute('#pub-titulo', 'aria-invalid')) === 'true', await texto(p, '#pub-titulo-error'))
  await p.locator('.form-publicar').screenshot({ path: `${OUT}/03-publicar-400.png` })
  await p.fill('#pub-titulo', 'Suspensión de clases demo')
  ok('al corregir se quita el error', (await p.locator('#pub-titulo-error').count()) === 0, 'error desaparece al escribir')
  await p.selectOption('#pub-nivel', 'Preescolar')
  await p.check('#pub-urgente')
  await p.click('.form-publicar button[type=submit]')
  await p.waitForSelector('.form-publicar .alert-success')
  await p.waitForFunction(() => document.querySelectorAll('#comunicados .comunicado').length === 4)
  const post = api.s.llamadas.find((x) => x.startsWith('POST /comunicados'))
  ok('HU-21 CA5 publicar → la lista se actualiza sola', (await p.locator('#comunicados .comunicado').count()) === 4 && (await texto(p, '#comunicados .comunicado')).includes('Suspensión de clases demo'), `${post}; 4 comunicados, el nuevo arriba`)
  ok('formulario se limpia tras publicar', (await p.inputValue('#pub-titulo')) === '', 'título vacío')
  await p.locator('#comunicados').screenshot({ path: `${OUT}/04-publicado.png` })
  p.once('dialog', (d) => d.accept())
  await p.locator('#comunicados .comunicado__eliminar').first().click()
  await p.waitForFunction(() => document.querySelectorAll('#comunicados .comunicado').length === 3)
  ok('eliminar (editor) → DELETE y lista actualizada', api.s.llamadas.some((x) => x.startsWith('DELETE /comunicados/101')), 'quedan 3')
  ok('sin errores JS (dirección)', errores.length === 0, errores.join(' / ') || 'ninguno')
}

// ---------- 3. Personal: 403 al borrar un comunicado de Dirección ----------
{
  const { p } = await abrir({ preparar: (s) => { s.comunicados.forEach((c) => { c.autor_usuario_id = 1 }) } })
  await p.waitForSelector('#comunicados .comunicado')
  await elegir(p, 2)
  await p.waitForSelector('.form-publicar')
  p.once('dialog', (d) => d.accept())
  await p.locator('#comunicados .comunicado__eliminar').first().click()
  await p.waitForSelector('#comunicados > .alert-danger')
  const t = await texto(p, '#comunicados > .alert-danger')
  ok('CA3 403 → motivo de la API, la lista no cambia', t === 'Solo dirección o quien publicó el comunicado puede modificarlo o eliminarlo' && (await p.locator('#comunicados .comunicado').count()) === 3, t)
}

// ---------- 4. 401: la cuenta ya no existe ----------
{
  const { api, p } = await abrir()
  await p.waitForSelector('#comunicados .comunicado')
  await elegir(p, 1)
  api.s.usuarioBorrado = 1
  await p.fill('#pub-titulo', 'Cuenta borrada')
  await p.fill('#pub-cuerpo', 'x')
  await p.click('.form-publicar button[type=submit]')
  await p.waitForFunction(() => !document.querySelector('.form-publicar'))
  ok('CA3 401 → vuelve a modo visitante', (await p.inputValue('#cuenta-demo')) === '' && (await p.locator('.form-publicar').count()) === 0, 'selector en "Visitante" y sin formulario')
}

// ---------- 5. Apoderado: pertinentes, inscribir, 409, cancelar ----------
{
  const { api, p, errores } = await abrir()
  await p.waitForSelector('#comunicados .comunicado')
  await elegir(p, 5)
  await p.waitForSelector('.inscripciones')
  await p.waitForFunction(() => document.querySelectorAll('#comunicados .comunicado').length === 2)
  ok('apoderado ve solo comunicados pertinentes', api.s.llamadas.includes('GET /apoderados/1/comunicados [u5]') && (await p.locator('#comunicados .comunicado').count()) === 2, 'General + Preescolar (sin Salas TEL)')
  const item = (i) => p.locator('.inscripciones__item').nth(i)
  // Taller (10 cupos, 3 inscritos): inscribir al primer hijo.
  await item(0).locator('button', { hasText: 'Inscribir' }).first().click()
  await p.locator('.inscripciones-bloque .alert-success').waitFor()
  await p.waitForFunction(() => document.querySelector('.inscripciones__item .badge')?.textContent === '6 de 10 cupos')
  await item(0).locator('strong', { hasText: 'Inscrito/a' }).waitFor()
  ok('HU-19 inscribir → cupos actualizados', (await item(0).innerText()).includes('Inscrito/a'), `badge: ${await item(0).locator('.badge').innerText()}`)
  // Paseo: la pantalla muestra 1 cupo, pero otra familia lo toma justo antes (carrera).
  api.s.actividades[1].inscritos = 5
  await item(1).locator('button', { hasText: 'Inscribir' }).first().click()
  await p.locator('.inscripciones-bloque .alert-danger').waitFor()
  await p.waitForFunction(() => document.querySelectorAll('.inscripciones__item .badge')[1]?.textContent === 'Sin cupos')
  ok('CA3 409 → motivo de la API y cupos refrescados', (await p.locator('.inscripciones-bloque .alert-danger').innerText()) === 'No quedan cupos disponibles para esta actividad' && (await item(1).locator('button[disabled]', { hasText: 'Sin cupos' }).count()) === 2, await p.locator('.inscripciones-bloque .alert-danger').innerText())
  await p.locator('#calendario').screenshot({ path: `${OUT}/05-inscripciones-409.png` })
  await item(0).locator('button', { hasText: 'Cancelar inscripción' }).click()
  await p.locator('.inscripciones-bloque .alert-success').waitFor()
  await p.waitForFunction(() => document.querySelector('.inscripciones__item .badge')?.textContent === '7 de 10 cupos')
  await item(0).locator('strong', { hasText: 'Inscrito/a' }).waitFor({ state: 'detached' })
  ok('HU-19 cancelar → libera el cupo', !(await item(0).innerText()).includes('Inscrito/a'), `badge: ${await item(0).locator('.badge').innerText()}`)
  ok('sin errores JS (apoderado)', errores.length === 0, errores.join(' / ') || 'ninguno')
}

// ---------- 6. Servidor caído, reintentar, 503, cargando y vacío ----------
{
  const { api, p } = await abrir({ preparar: (s) => { s.fallar['GET /salas/cupos'] = 'abort'; s.fallar['GET /eventos'] = 503; s.comunicados = []; s.demora['GET /comunicados'] = 1500 } })
  await p.waitForSelector('#comunicados .estado-api--cargando')
  ok('estado cargando', (await texto(p, '#comunicados .estado-api--cargando')).includes('Cargando comunicados'), 'spinner + "Cargando comunicados…"')
  await p.waitForSelector('#cupos-salas .estado-api--error')
  ok('CA3 servidor apagado → sin conexión + Reintentar', (await texto(p, '#cupos-salas .estado-api--error')).includes('No hay conexión con el servidor') && (await p.locator('#cupos-salas .estado-api--error button').count()) === 1, (await texto(p, '#cupos-salas .estado-api--error')).replace(/\n/g, ' '))
  await p.waitForSelector('#calendario .estado-api--error')
  ok('CA3 503 → servicio no disponible', (await texto(p, '#calendario .estado-api--error')).includes('no está disponible'), 'mensaje de 503')
  await p.locator('#cupos-salas').screenshot({ path: `${OUT}/06-error-cupos.png` })
  await p.waitForSelector('#comunicados .muro__vacio')
  ok('estado vacío', (await texto(p, '#comunicados .muro__vacio')).includes('no hay comunicados'), await texto(p, '#comunicados .muro__vacio'))
  delete api.s.fallar['GET /salas/cupos']
  await p.click('#cupos-salas .estado-api--error button')
  await p.waitForSelector('#cupos-salas .card')
  ok('Reintentar recupera los datos', (await p.locator('#cupos-salas .card').count()) === 8, '8 salas tras reintentar')
}

// ---------- 7. Sin internet (offline) ----------
{
  const { ctx, p } = await abrir()
  await p.waitForSelector('#comunicados .comunicado')
  await elegir(p, 1)
  await ctx.setOffline(true)
  await p.fill('#pub-titulo', 'Sin internet')
  await p.fill('#pub-cuerpo', 'x')
  await p.click('.form-publicar button[type=submit]')
  await p.waitForSelector('.form-publicar .alert-danger')
  ok('CA3 offline → aviso sin conexión, sin perder lo escrito', (await texto(p, '.form-publicar .alert-danger')).includes('No hay conexión') && (await p.inputValue('#pub-titulo')) === 'Sin internet', await texto(p, '.form-publicar .alert-danger'))
}

// ---------- 8. Responsive 375 px ----------
{
  const { p, errores } = await abrir({ ancho: 375 })
  await p.waitForSelector('#comunicados .comunicado')
  await elegir(p, 5)
  await p.waitForSelector('.inscripciones')
  const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok('CA4 responsive 375 px sin scroll horizontal', desborde <= 0, `desborde ${desborde}px`)
  await p.locator('.barra-sesion').screenshot({ path: `${OUT}/07-movil-barra.png` })
  await p.locator('#calendario').screenshot({ path: `${OUT}/08-movil-inscripciones.png` })
  ok('sin errores JS (móvil)', errores.length === 0, errores.join(' / ') || 'ninguno')
}

await b.close()
console.log(r.join('\n'))
console.log(`\n${r.filter((x) => x.startsWith('PASA')).length}/${r.length} PASA`)
