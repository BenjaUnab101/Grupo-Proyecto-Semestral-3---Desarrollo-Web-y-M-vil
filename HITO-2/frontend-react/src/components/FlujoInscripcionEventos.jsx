import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  obtenerActividades,
  obtenerAlumnos,
  obtenerCategoriasActividad,
  registrarPagoInscripcion,
  obtenerMisPagos,
  obtenerPagosInscripciones,
  consultarComprobantePago,
  actualizarEstadoPago,
  filtrarActividadesPortal,
} from '../services/eventosApi.js';
import { mensajeDeError } from '../services/http.js';
import { normalizarRut, validarRutCampo } from '../utils/validaciones.js';
import { formatearFecha, formatearFechaHora } from '../utils/fechas.js';
import { useSesion } from '../context/sesionContexto.js';

// HU-20 / HU-23: inscripción a actividades escolares con pago SIMULADO y comprobante verificable.
// - Visitante: ve el catálogo y se le pide iniciar sesión para inscribir.
// - Apoderado: elige a uno de SUS hijos (vienen en la sesión) y ve "Mis comprobantes".
// - Personal del jardín: elige cualquier alumno y ve todas las inscripciones; dirección además
//   confirma o cancela pagos. Los permisos los vuelve a revisar la API en cada petición.
// CalendarioSeccion lo monta con key = cuenta: al cambiar de sesión el estado parte de cero.
const METODOS = { transferencia: 'Transferencia Simulada', exento: 'Exento / Actividad Gratuita' };
const COLOR_ESTADO = { confirmado: 'bg-success', cancelado: 'bg-danger', pendiente: 'bg-warning text-dark', pagado: 'bg-primary' };

export default function FlujoInscripcionEventos({ onCambioInscripcion, actualizacion = 0 }) {
  const { perfil, abrirPortal, revisarError, actualizacionCatalogo = 0 } = useSesion() ?? {};
  const esPersonal = ['administrador', 'organizador'].includes(perfil?.rol);
  const esDireccion = perfil?.rol === 'administrador';

  const [datos, setDatos] = useState({ actividades: [], categorias: [], misPagos: [], todosLosPagos: [], alumnos: [] });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [cargaParcial, setCargaParcial] = useState([]); // consultas secundarias que fallaron
  const [aviso, setAviso] = useState(null); // { exito, texto }

  // Filtros (HU-23 CA2)
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroCupos, setFiltroCupos] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('publicada');

  // Formulario
  const [actividadId, setActividadId] = useState('');
  const [alumnoId, setAlumnoId] = useState('');
  const [rut, setRut] = useState('');
  const [metodo, setMetodo] = useState('transferencia');
  const [monto, setMonto] = useState(3500);
  const [enviando, setEnviando] = useState(false);

  // Comprobantes
  const [comprobante, setComprobante] = useState(null);
  const [codigoBusqueda, setCodigoBusqueda] = useState('');

  // Carga (patrón de hooks/useRecurso.js). Se repite al cambiar la sesión o tras una acción.
  const [version, setVersion] = useState(0);
  const usuarioId = perfil?.usuarioId;
  useEffect(() => {
    let vigente = true;
    // Solo el catálogo es imprescindible: si falla otra consulta (comprobantes, alumnos…) la
    // sección se muestra igual, con un aviso, en vez de quedar en blanco.
    const fallidas = [];
    const opcional = (promesa, nombre) => promesa.catch(() => { fallidas.push(nombre); return []; });
    Promise.all([
      obtenerActividades(false),
      opcional(obtenerCategoriasActividad(true), 'categorías'),
      usuarioId ? opcional(obtenerMisPagos(), 'tus comprobantes') : [],
      esPersonal ? opcional(obtenerPagosInscripciones({}), 'la lista de pagos') : [],
      esPersonal ? opcional(obtenerAlumnos(), 'la lista de alumnos') : [],
    ])
      .then(([actividades, categorias, misPagos, todosLosPagos, alumnos]) => {
        if (!vigente) return;
        // Los borradores son internos: el catálogo de familias no los muestra.
        setDatos({ actividades: actividades.filter((a) => a.estado !== 'borrador'), categorias, misPagos, todosLosPagos, alumnos });
        setErrorCarga(null);
        setCargaParcial(fallidas);
      })
      .catch((error) => {
        if (vigente) setErrorCarga(error);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [usuarioId, esPersonal, version, actualizacion, actualizacionCatalogo]);

  const recargar = () => {
    setCargando(true);
    setVersion((v) => v + 1);
  };

  const { actividades, categorias, misPagos, todosLosPagos, alumnos } = datos;
  const disponibles = actividades.filter((a) => a.estado === 'publicada' && a.cupos_disponibles > 0);
  // Si no hay una actividad elegida (o la elegida se llenó), se propone la primera con cupo.
  const actividadElegida = disponibles.find((a) => String(a.id) === actividadId) ?? disponibles[0];
  const opcionesAlumno = esPersonal ? alumnos : perfil?.hijos ?? [];
  const alumnoElegido = opcionesAlumno.find((a) => String(a.id) === alumnoId) ?? opcionesAlumno[0];

  const actividadesFiltradas = useMemo(
    () => filtrarActividadesPortal(actividades, { categoriaId: filtroCategoria, filtroCupos, estado: filtroEstado }),
    [actividades, filtroCategoria, filtroCupos, filtroEstado]
  );

  const ejecutar = async (accion) => {
    setAviso(null);
    try {
      await accion();
    } catch (error) {
      revisarError?.(error);
      setAviso({ exito: false, texto: error?.estado !== undefined ? mensajeDeError(error) : error.message });
    }
  };

  const handleInscribir = async (e) => {
    e.preventDefault();
    if (!actividadElegida) return setAviso({ exito: false, texto: 'No hay actividades con cupos disponibles.' });
    if (!alumnoElegido) return setAviso({ exito: false, texto: 'Selecciona al párvulo que vas a inscribir.' });
    const errorRut = validarRutCampo(rut);
    if (errorRut) return setAviso({ exito: false, texto: errorRut });

    setEnviando(true);
    await ejecutar(async () => {
      const nuevo = await registrarPagoInscripcion({
        actividad_id: actividadElegida.id,
        apoderado_rut: normalizarRut(rut),
        nombre_parvulo: alumnoElegido.nombre,
        monto: metodo === 'exento' ? 0 : Number(monto) || 0,
        metodo_pago: METODOS[metodo],
        estado_pago: metodo === 'exento' ? 'confirmado' : 'pagado',
      });
      setComprobante(nuevo);
      setAviso({ exito: true, texto: `Inscripción registrada. Guarda tu código de comprobante: ${nuevo.codigo_comprobante}` });
      recargar();
      onCambioInscripcion?.();
    });
    setEnviando(false);
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    ejecutar(async () => {
      const encontrado = await consultarComprobantePago(codigoBusqueda);
      setComprobante(encontrado);
      setAviso({ exito: true, texto: `Comprobante ${encontrado.codigo_comprobante} verificado en la base de datos.` });
    });
  };

  const handleEstado = (pagoId, estado) =>
    ejecutar(async () => {
      const actualizado = await actualizarEstadoPago(pagoId, estado);
      setComprobante(actualizado);
      setAviso({ exito: true, texto: `Estado del pago actualizado a «${actualizado.estado_pago}».` });
      recargar();
      onCambioInscripcion?.();
    });

  return (
    <div className="mt-4 pt-3 border-top" id="flujo-inscripcion-eventos">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
        <h3 className="h5 fw-bold mb-0" style={{ color: 'var(--pr-blue)' }}>
          Inscripción a actividades y comprobantes de pago simulados
        </h3>
        <span className="pill-badge">Transacción simulada · sin cobro real</span>
      </div>
      <p className="text-muted small mb-3">
        Explora las actividades por categoría, cupos y estado. Inscribe a tu hijo o hija y obtén un comprobante
        verificable, sin cargos bancarios reales.
      </p>

      {aviso && (
        <div className={`alert py-2 ${aviso.exito ? 'alert-success' : 'alert-danger'}`} role={aviso.exito ? 'status' : 'alert'}>
          {aviso.texto}
        </div>
      )}

      {cargaParcial.length > 0 && (
        <div className="alert alert-warning py-2" role="status">
          No pudimos cargar {cargaParcial.join(', ')}. El resto de la sección funciona;{' '}
          <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={recargar}>reintentar</button>.
        </div>
      )}

      <div className="card p-3 border-0 shadow-sm rounded-4 bg-light mb-4">
        <div className="row g-3 align-items-end">
          <Filtro id="filtro-cat-hu23" etiqueta="Categoría" valor={filtroCategoria} onCambio={setFiltroCategoria}
            opciones={[['todas', 'Todas las categorías'], ...categorias.map((c) => [String(c.id), c.nombre])]} />
          <Filtro id="filtro-cupos-hu23" etiqueta="Cupos" valor={filtroCupos} onCambio={setFiltroCupos}
            opciones={[['todos', 'Todos'], ['disponibles', 'Con cupos disponibles'], ['agotados', 'Sin cupos']]} />
          <Filtro id="filtro-estado-hu23" etiqueta="Estado" valor={filtroEstado} onCambio={setFiltroEstado}
            opciones={[['publicada', 'Publicadas (vigentes)'], ['cancelada', 'Canceladas'], ['todas', 'Todos los estados']]} />
        </div>
      </div>

      {errorCarga ? (
        <div className="alert alert-danger" role="alert">
          <p className="mb-2">No pudimos cargar las actividades. {mensajeDeError(errorCarga)}</p>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={recargar}>Reintentar</button>
        </div>
      ) : cargando && actividades.length === 0 ? (
        <p className="text-muted small d-flex align-items-center gap-2" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Cargando actividades…
        </p>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <h4 className="h6 fw-bold mb-2">Actividades encontradas ({actividadesFiltradas.length})</h4>
            {actividadesFiltradas.length === 0 ? (
              <p className="text-muted small border rounded-3 p-3 bg-white" role="status">
                No hay actividades que coincidan con los filtros seleccionados.
              </p>
            ) : (
              <div className="row g-3 mb-4">
                {actividadesFiltradas.map((act) => (
                  <TarjetaActividad key={act.id} act={act} elegida={Boolean(perfil) && actividadElegida?.id === act.id}
                    onElegir={() => (perfil ? setActividadId(String(act.id)) : abrirPortal())} />
                ))}
              </div>
            )}

            {perfil && (
              <ListaPagos titulo={`Mis comprobantes (${misPagos.length})`} pagos={misPagos}
                vacio="Aún no has emitido comprobantes con esta cuenta." onVer={setComprobante} />
            )}
            {esPersonal && (
              <ListaPagos titulo={`Todas las inscripciones y pagos (${todosLosPagos.length})`} pagos={todosLosPagos}
                vacio="Aún no se registran inscripciones." onVer={setComprobante}
                onEstado={esDireccion ? handleEstado : null} />
            )}
          </div>

          <div className="col-12 col-lg-5">
            <div className="card p-3 border shadow-sm rounded-4 mb-3">
              <h4 className="h6 fw-bold mb-3">Inscribir y simular pago</h4>
              {!perfil ? (
                <div className="text-center py-2">
                  <p className="small text-muted">Para inscribir y obtener un comprobante debes iniciar sesión.</p>
                  <button type="button" className="btn-institucional-primary btn-sm" onClick={abrirPortal}>
                    Iniciar sesión
                  </button>
                </div>
              ) : opcionesAlumno.length === 0 ? (
                <p className="small text-muted mb-0" role="status">
                  Tu cuenta no tiene párvulos asociados. Si es un error, contacta a la dirección.
                </p>
              ) : (
                <form onSubmit={handleInscribir} noValidate>
                  <Campo id="insc-act" etiqueta="Actividad">
                    <select id="insc-act" className="form-select form-select-sm" value={actividadElegida?.id ?? ''}
                      onChange={(e) => setActividadId(e.target.value)} disabled={disponibles.length === 0}>
                      {disponibles.length === 0 && <option value="">No hay actividades con cupos</option>}
                      {disponibles.map((a) => (
                        <option key={a.id} value={a.id}>{a.titulo} ({a.cupos_disponibles} cupos)</option>
                      ))}
                    </select>
                  </Campo>
                  <Campo id="insc-parvulo" etiqueta={esPersonal ? 'Párvulo (todos los alumnos)' : 'Párvulo'}>
                    <select id="insc-parvulo" className="form-select form-select-sm" value={alumnoElegido?.id ?? ''}
                      onChange={(e) => setAlumnoId(e.target.value)}>
                      {opcionesAlumno.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo id="insc-rut" etiqueta="RUT del apoderado">
                    <input id="insc-rut" type="text" className="form-control form-control-sm" placeholder="12.345.678-5"
                      value={rut} onChange={(e) => setRut(e.target.value)} autoComplete="off" />
                  </Campo>
                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <Campo id="insc-metodo" etiqueta="Medio simulado" sinMargen>
                        <select id="insc-metodo" className="form-select form-select-sm" value={metodo}
                          onChange={(e) => setMetodo(e.target.value)}>
                          <option value="transferencia">Transferencia simulada</option>
                          <option value="exento">Exento / gratuita</option>
                        </select>
                      </Campo>
                    </div>
                    <div className="col-5">
                      <Campo id="insc-monto" etiqueta="Aporte ($)" sinMargen>
                        <input id="insc-monto" type="number" min="0" max="500000" className="form-control form-control-sm"
                          value={metodo === 'exento' ? 0 : monto} disabled={metodo === 'exento'}
                          onChange={(e) => setMonto(e.target.value)} />
                      </Campo>
                    </div>
                  </div>
                  <button type="submit" className="btn-institucional-primary btn-sm w-100"
                    disabled={enviando || disponibles.length === 0} aria-busy={enviando}>
                    {enviando ? 'Registrando…' : 'Confirmar inscripción y generar comprobante'}
                  </button>
                </form>
              )}
            </div>

            <div className="card p-3 border shadow-sm rounded-4 mb-3">
              <h4 className="h6 fw-bold mb-2">Consultar comprobante por código</h4>
              {perfil ? (
                <form onSubmit={handleBuscar} className="d-flex gap-2">
                  <input type="text" className="form-control form-control-sm" placeholder="PR-COMP-20261106-A1B2C3"
                    value={codigoBusqueda} onChange={(e) => setCodigoBusqueda(e.target.value)}
                    aria-label="Código del comprobante" required />
                  <button type="submit" className="btn btn-outline-primary btn-sm">Verificar</button>
                </form>
              ) : (
                <p className="small text-muted mb-0">Inicia sesión para verificar un comprobante.</p>
              )}
            </div>

            {comprobante ? (
              <Comprobante pago={comprobante} />
            ) : (
              perfil && (
                <p className="small text-muted border rounded-4 p-3 bg-white mb-0">
                  Aquí aparecerá el comprobante cuando inscribas, verifiques un código o elijas «Ver» en una lista.
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Filtro({ id, etiqueta, valor, onCambio, opciones }) {
  return (
    <div className="col-12 col-md-4">
      <label htmlFor={id} className="form-label small fw-bold mb-1">{etiqueta}</label>
      <select id={id} className="form-select form-select-sm" value={valor} onChange={(e) => onCambio(e.target.value)}>
        {opciones.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
      </select>
    </div>
  );
}

function Campo({ id, etiqueta, sinMargen = false, children }) {
  return (
    <div className={sinMargen ? '' : 'mb-2'}>
      <label htmlFor={id} className="form-label small fw-bold mb-1">{etiqueta}</label>
      {children}
    </div>
  );
}

function TarjetaActividad({ act, elegida, onElegir }) {
  const disponible = act.estado === 'publicada' && act.cupos_disponibles > 0;
  return (
    <div className="col-12 col-md-6">
      <div className={`card h-100 p-3 shadow-sm rounded-4 bg-white d-flex flex-column ${elegida ? 'border-primary border-2' : 'border'}`}>
        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
          <strong className="small" style={{ color: 'var(--pr-blue)' }}>{act.titulo}</strong>
          <span className={`badge ${act.estado === 'cancelada' ? 'bg-secondary' : disponible ? 'bg-success' : 'bg-danger'}`}>
            {act.estado === 'cancelada' ? 'Cancelada' : `${act.cupos_disponibles}/${act.capacidad} cupos`}
          </span>
        </div>
        <p className="text-muted small mb-2">
          📅 {formatearFecha(act.fecha) ?? act.fecha}{act.hora ? ` · ${act.hora} h` : ''}<br />
          📍 {act.lugar}<br />
          🏷️ {act.categoria_nombre || 'Sin categoría'} · 👤 {act.organizador_nombre || 'Por definir'}
        </p>
        {act.preparar && <p className="small mb-2">🎒 {act.preparar}</p>}
        <button type="button" className="btn btn-outline-primary btn-sm mt-auto" disabled={!disponible} onClick={onElegir}>
          {!disponible ? 'No disponible' : elegida ? 'Seleccionada ✓' : 'Seleccionar para inscribir'}
        </button>
      </div>
    </div>
  );
}

function ListaPagos({ titulo, pagos, vacio, onVer, onEstado }) {
  return (
    <div className="mb-4">
      <h4 className="h6 fw-bold mb-2">{titulo}</h4>
      {pagos.length === 0 ? (
        <p className="text-muted small border rounded-3 p-3 bg-white mb-0" role="status">{vacio}</p>
      ) : (
        <div className="list-group shadow-sm">
          {pagos.map((p) => (
            <div key={p.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2 small">
              <div>
                <strong>{p.nombre_parvulo}</strong> · <span className="text-muted">{p.actividad_titulo}</span>
                <div>
                  <code>{p.codigo_comprobante}</code> · ${p.monto.toLocaleString('es-CL')} ·{' '}
                  <span className={`badge ${COLOR_ESTADO[p.estado_pago] ?? 'bg-secondary'}`}>{p.estado_pago}</span>
                </div>
              </div>
              <div className="d-flex gap-1">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onVer(p)}>Ver</button>
                {onEstado && !['confirmado', 'cancelado'].includes(p.estado_pago) && (
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={() => onEstado(p.id, 'confirmado')}>Confirmar</button>
                )}
                {onEstado && p.estado_pago !== 'cancelado' && (
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onEstado(p.id, 'cancelado')}>Cancelar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// La API guarda la fecha del pago sin zona horaria (UTC): se marca como UTC antes de formatear.
function fechaPago(valor) {
  const texto = String(valor ?? '');
  return formatearFechaHora(/(Z|[+-]\d{2}:?\d{2})$/.test(texto) ? texto : `${texto}Z`) || texto;
}

function Comprobante({ pago }) {
  const filas = [
    ['Código', <span className="fw-bold font-monospace">{pago.codigo_comprobante}</span>],
    ['Actividad', pago.actividad_titulo],
    ['Párvulo', pago.nombre_parvulo],
    ['RUT apoderado', pago.apoderado_rut],
    ['Monto', `$${pago.monto.toLocaleString('es-CL')} CLP (sin cobro real)`],
    ['Medio', pago.metodo_pago],
    ['Fecha', fechaPago(pago.fecha_transaccion)],
    ['Estado', <span className={`badge ${COLOR_ESTADO[pago.estado_pago] ?? 'bg-secondary'}`}>{pago.estado_pago}</span>],
  ];
  return (
    <div className="card p-3 border-2 border-primary shadow-sm rounded-4 bg-white" role="region" aria-label="Comprobante de pago simulado">
      <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
        <strong className="small" style={{ color: 'var(--pr-blue-dark)' }}>🧾 Comprobante (pago simulado)</strong>
        <span className="badge bg-info text-dark">Verificable</span>
      </div>
      <dl className="row small mb-0">
        {filas.map(([dt, dd]) => (
          <Fragment key={dt}>
            <dt className="col-5 text-muted">{dt}</dt>
            <dd className="col-7">{dd}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}