import { useEffect, useMemo, useState } from 'react';
import {
  obtenerActividades,
  obtenerEventosHU19,
  obtenerAlumnos,
  inscribirEnEvento,
  obtenerCategoriasActividad,
  registrarPagoInscripcion,
  obtenerPagosInscripciones,
  consultarComprobantePago,
  actualizarEstadoPago,
  filtrarActividadesPortal,
} from '../services/eventosApi';
import { normalizarRut, validarRutCampo } from '../utils/validaciones';

export default function FlujoInscripcionEventos({ onCambioInscripcion }) {
  const [actividades, setActividades] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // HU-23 CA2: Filtros por categoría, cupos y estado
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroCupos, setFiltroCupos] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('publicada');

  // Formulario de inscripción y pago simulado (HU-20 CA1, CA4 / HU-23 CA1, CA3)
  const [actividadSeleccionadaId, setActividadSeleccionadaId] = useState('');
  const [apoderadoRut, setApoderadoRut] = useState('12.345.678-5');
  const [apoderadoId, setApoderadoId] = useState(1);
  const [nombreParvulo, setNombreParvulo] = useState('');
  const [montoSimulado, setMontoSimulado] = useState(3500);
  const [metodoPago, setMetodoPago] = useState('Transferencia Simulada');

  // Comprobante verificable (HU-20 CA2, CA5)
  const [comprobanteActivo, setComprobanteActivo] = useState(null);
  const [codigoBusqueda, setCodigoBusqueda] = useState('');

  const cargarTodo = async () => {
    try {
      setCargando(true);
      setError('');
      const [actividadesAntiguas, cats, listaPagos] = await Promise.all([
        obtenerActividades(false),
        obtenerCategoriasActividad(true),
        obtenerPagosInscripciones(),
      ]);
      const acts = actividadesAntiguas.length > 0
        ? actividadesAntiguas
        : await obtenerEventosHU19();
      setActividades(acts);
      setCategorias(cats);
      setPagos(listaPagos);
      if (acts.some((actividad) => actividad.fuente === 'hu19')) {
        setAlumnos(await obtenerAlumnos());
      }

      const publicadasConCupo = acts.filter(
        (a) => a.estado === 'publicada' && a.cupos_disponibles > 0
      );
      if (publicadasConCupo.length > 0 && !actividadSeleccionadaId) {
        setActividadSeleccionadaId(String(publicadasConCupo[0].id));
      }
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servicio de inscripciones.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const actividadesFiltradas = useMemo(
    () =>
      filtrarActividadesPortal(actividades, {
        categoriaId: filtroCategoria,
        filtroCupos,
        estado: filtroEstado,
      }),
    [actividades, filtroCategoria, filtroCupos, filtroEstado]
  );

  const handleInscribir = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');

    if (!actividadSeleccionadaId) {
      setError('Selecciona una actividad escolar para inscribir.');
      return;
    }

    if (!nombreParvulo || nombreParvulo.trim().length < 2) {
      setError('Ingresa el nombre del párvulo (mínimo 2 caracteres).');
      return;
    }

    try {
      const actividad = actividades.find((a) => String(a.id) === String(actividadSeleccionadaId));
      if (actividad?.fuente === 'hu19') {
        const alumno = alumnos.find(
          (a) => a.nombre.trim().toLowerCase() === nombreParvulo.trim().toLowerCase()
        );
        if (!alumno) {
          setError('Para HU-19 usa el nombre exacto de un alumno demo, por ejemplo: Alumno Demo 01.');
          return;
        }
        const inscripcion = await inscribirEnEvento(actividad.id, alumno.id, apoderadoId);
        setNombreParvulo('');
        setMensajeExito(
          `Inscripción registrada. Cupos disponibles: ${inscripcion.cupos_disponibles}.`
        );
        await cargarTodo();
        if (onCambioInscripcion) await onCambioInscripcion();
        return;
      }

      const errorRut = validarRutCampo(apoderadoRut);
      if (errorRut) {
        setError(errorRut);
        return;
      }

      const rutFormateado = normalizarRut(apoderadoRut);
      const nuevoComprobante = await registrarPagoInscripcion({
        actividad_id: Number(actividadSeleccionadaId),
        apoderado_rut: rutFormateado,
        nombre_parvulo: nombreParvulo.trim(),
        monto: Number(montoSimulado) || 0,
        metodo_pago: metodoPago,
        estado_pago: 'pagado',
      });

      setComprobanteActivo(nuevoComprobante);
      setNombreParvulo('');
      setMensajeExito(
        `Inscripción registrada. Comprobante emitido: ${nuevoComprobante.codigo_comprobante}`
      );
      await cargarTodo();
      if (onCambioInscripcion) await onCambioInscripcion();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBuscarComprobante = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');
    try {
      const encontrado = await consultarComprobantePago(codigoBusqueda);
      setComprobanteActivo(encontrado);
      setMensajeExito(`Comprobante ${encontrado.codigo_comprobante} verificado en SQL.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCambiarEstadoPago = async (pagoId, nuevoEstado) => {
    setError('');
    setMensajeExito('');
    try {
      const actualizado = await actualizarEstadoPago(pagoId, nuevoEstado);
      setComprobanteActivo(actualizado);
      setMensajeExito(
        `Estado de inscripción actualizado a "${actualizado.estado_pago}".`
      );
      await cargarTodo();
      if (onCambioInscripcion) await onCambioInscripcion();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-4 pt-3 border-top" id="flujo-inscripcion-eventos">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
        <h3 className="h5 fw-bold mb-0" style={{ color: 'var(--pr-blue)' }}>
          Inscripción a Actividades y Comprobantes de Pago Simulado (Apoderados)
        </h3>
        <span className="pill-badge">Transacción Simulada · Sin Cobro Real</span>
      </div>

      <p className="text-muted small mb-3">
        Explora las actividades filtrando por categoría, disponibilidad de cupos y estado. Inscribe a tu pupilo y obtén un comprobante verificable sin cargos bancarios reales.
      </p>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}
      {mensajeExito && (
        <div className="alert alert-success py-2" role="status">
          {mensajeExito}
        </div>
      )}

      {/* HU-23 CA2 y CA5: Barra de filtros responsive */}
      <div className="card p-3 border-0 shadow-sm rounded-4 bg-light mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label htmlFor="filtro-cat-hu23" className="form-label small fw-bold mb-1">
              Filtrar por Categoría
            </label>
            <select
              id="filtro-cat-hu23"
              className="form-select form-select-sm"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label htmlFor="filtro-cupos-hu23" className="form-label small fw-bold mb-1">
              Disponibilidad de Cupos
            </label>
            <select
              id="filtro-cupos-hu23"
              className="form-select form-select-sm"
              value={filtroCupos}
              onChange={(e) => setFiltroCupos(e.target.value)}
            >
              <option value="todos">Todos los cupos</option>
              <option value="disponibles">Solo con cupos disponibles</option>
              <option value="agotados">Sin cupos (Agotados)</option>
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label htmlFor="filtro-estado-hu23" className="form-label small fw-bold mb-1">
              Estado del Evento
            </label>
            <select
              id="filtro-estado-hu23"
              className="form-select form-select-sm"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="publicada">Publicadas (Vigentes)</option>
              <option value="todas">Todos los estados</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="text-muted small">Cargando catálogo de eventos e inscripciones...</p>
      ) : (
        <div className="row g-4">
          {/* Catálogo filtrado de actividades con selección directa */}
          <div className="col-12 col-lg-7">
            <h4 className="h6 fw-bold mb-2">
              Actividades Encontradas ({actividadesFiltradas.length})
            </h4>
            {actividadesFiltradas.length === 0 ? (
              <p className="text-muted small border rounded-3 p-3 bg-white" role="status">
                No existen actividades que coincidan con los filtros seleccionados.
              </p>
            ) : (
              <div className="row g-3 mb-4">
                {actividadesFiltradas.map((act) => {
                  const sinCupo = act.cupos_disponibles <= 0 || act.estado !== 'publicada';
                  return (
                    <div key={act.id} className="col-12 col-md-6">
                      <div className="card h-100 p-3 border shadow-sm rounded-4 bg-white d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                          <strong className="small" style={{ color: 'var(--pr-blue)' }}>
                            {act.titulo}
                          </strong>
                          <span
                            className={`badge ${
                              act.cupos_disponibles > 0 ? 'bg-success' : 'bg-danger'
                            }`}
                          >
                            {act.cupos_disponibles}/{act.capacidad} cupos
                          </span>
                        </div>
                        <p className="text-muted small mb-2">
                          📅 {act.fecha} {act.hora ? `· ${act.hora}` : ''} <br />
                          📍 {act.lugar} · 🏷️ {act.categoria_nombre || 'General'}
                        </p>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm mt-auto"
                          disabled={sinCupo}
                          onClick={() => setActividadSeleccionadaId(String(act.id))}
                        >
                          {sinCupo ? 'No disponible' : 'Seleccionar para inscribir'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Listado de inscripciones y acciones Confirmar / Cancelar (HU-20 CA3 / HU-23 CA4) */}
            <h4 className="h6 fw-bold mb-2">
              Mis Inscripciones y Pagos Simulados ({pagos.length})
            </h4>
            {pagos.length === 0 ? (
              <p className="text-muted small">Aún no se registran inscripciones.</p>
            ) : (
              <div className="list-group shadow-sm">
                {pagos.map((p) => (
                  <div
                    key={p.id}
                    className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2 small"
                  >
                    <div>
                      <strong>{p.nombre_parvulo}</strong> ·{' '}
                      <span className="text-muted">{p.actividad_titulo}</span>
                      <div>
                        Código: <code>{p.codigo_comprobante}</code> · Monto: ${p.monto} ·{' '}
                        <span
                          className={`badge ${
                            p.estado_pago === 'confirmado'
                              ? 'bg-success'
                              : p.estado_pago === 'cancelado'
                              ? 'bg-danger'
                              : 'bg-primary'
                          }`}
                        >
                          {p.estado_pago}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setComprobanteActivo(p)}
                      >
                        Ver comprobante
                      </button>
                      {p.estado_pago !== 'confirmado' && p.estado_pago !== 'cancelado' && (
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          onClick={() => handleCambiarEstadoPago(p.id, 'confirmado')}
                        >
                          Confirmar
                        </button>
                      )}
                      {p.estado_pago !== 'cancelado' && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleCambiarEstadoPago(p.id, 'cancelado')}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna derecha: Formulario de inscripción + Verificador y Visor de Comprobante */}
          <div className="col-12 col-lg-5">
            <div className="card p-3 border shadow-sm rounded-4 mb-3">
              <h4 className="h6 fw-bold mb-3">Inscribir Alumno y Simular Pago</h4>
              <form onSubmit={handleInscribir}>
                <div className="mb-2">
                  <label htmlFor="insc-act" className="form-label small fw-bold mb-1">
                    Actividad publicada
                  </label>
                  <select
                    id="insc-act"
                    className="form-select form-select-sm"
                    value={actividadSeleccionadaId}
                    onChange={(e) => setActividadSeleccionadaId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione actividad...</option>
                    {actividades
                      .filter((a) => a.estado === 'publicada')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.titulo} ({a.cupos_disponibles} cupos libres)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label htmlFor="insc-rut" className="form-label small fw-bold mb-1">
                      {actividades.some((a) => a.fuente === 'hu19') ? 'ID Apoderado (demo)' : 'RUT Apoderado'}
                    </label>
                    <input
                      id="insc-rut"
                      type={actividades.some((a) => a.fuente === 'hu19') ? 'number' : 'text'}
                      className="form-control form-control-sm"
                      value={actividades.some((a) => a.fuente === 'hu19') ? apoderadoId : apoderadoRut}
                      onChange={(e) => (
                        actividades.some((a) => a.fuente === 'hu19')
                          ? setApoderadoId(e.target.value)
                          : setApoderadoRut(e.target.value)
                      )}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label htmlFor="insc-parvulo" className="form-label small fw-bold mb-1">
                      Nombre del Párvulo
                    </label>
                    <input
                      id="insc-parvulo"
                      type="text"
                      className="form-control form-control-sm"
                      placeholder={actividades.some((a) => a.fuente === 'hu19') ? 'Ej: Alumno Demo 01' : 'Ej: Sofía Pérez'}
                      value={nombreParvulo}
                      onChange={(e) => setNombreParvulo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-5">
                    <label htmlFor="insc-monto" className="form-label small fw-bold mb-1">
                      Aporte Simulado ($)
                    </label>
                    <input
                      id="insc-monto"
                      type="number"
                      min="0"
                      className="form-control form-control-sm"
                      value={montoSimulado}
                      onChange={(e) => setMontoSimulado(e.target.value)}
                    />
                  </div>
                  <div className="col-7">
                    <label htmlFor="insc-metodo" className="form-label small fw-bold mb-1">
                      Medio Simulado
                    </label>
                    <select
                      id="insc-metodo"
                      className="form-select form-select-sm"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                    >
                      <option value="Transferencia Simulada">Transferencia Simulada</option>
                      <option value="Exento / Actividad Gratuita">Exento / Gratuita</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-institucional-primary btn-sm w-100">
                  Confirmar Inscripción y Generar Comprobante
                </button>
              </form>
            </div>

            {/* Buscador de comprobante por código verificable (HU-20 CA2) */}
            <div className="card p-3 border shadow-sm rounded-4 mb-3">
              <h4 className="h6 fw-bold mb-2">Consultar Comprobante por Código</h4>
              <form onSubmit={handleBuscarComprobante} className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Ej: PR-COMP-20261106-A1B2C3"
                  value={codigoBusqueda}
                  onChange={(e) => setCodigoBusqueda(e.target.value)}
                  aria-label="Código verificable de comprobante"
                />
                <button type="submit" className="btn btn-outline-primary btn-sm">
                  Verificar
                </button>
              </form>
            </div>

            {/* Tarjeta de Comprobante Verificable */}
            {comprobanteActivo && (
              <div
                className="card p-3 border-2 border-primary shadow-sm rounded-4 bg-white"
                role="region"
                aria-label="Comprobante de inscripción y pago simulado"
              >
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                  <strong className="small" style={{ color: 'var(--pr-blue-dark)' }}>
                    🧾 Comprobante Oficial (Pago Simulado)
                  </strong>
                  <span className="badge bg-info text-dark">Verificable</span>
                </div>
                <dl className="row small mb-0">
                  <dt className="col-5 text-muted">ID Comprobante:</dt>
                  <dd className="col-7 fw-bold font-monospace">
                    {comprobanteActivo.codigo_comprobante}
                  </dd>
                  <dt className="col-5 text-muted">Actividad:</dt>
                  <dd className="col-7">{comprobanteActivo.actividad_titulo}</dd>
                  <dt className="col-5 text-muted">Párvulo:</dt>
                  <dd className="col-7">{comprobanteActivo.nombre_parvulo}</dd>
                  <dt className="col-5 text-muted">RUT Apoderado:</dt>
                  <dd className="col-7">{comprobanteActivo.apoderado_rut}</dd>
                  <dt className="col-5 text-muted">Monto Simulado:</dt>
                  <dd className="col-7">${comprobanteActivo.monto} CLP (Sin cobro real)</dd>
                  <dt className="col-5 text-muted">Estado:</dt>
                  <dd className="col-7 fw-bold text-uppercase">
                    {comprobanteActivo.estado_pago}
                  </dd>
                </dl>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
