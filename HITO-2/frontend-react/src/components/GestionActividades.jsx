import { useEffect, useState } from 'react';
import {
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  publicarActividad,
  cancelarActividad,
  obtenerCategoriasActividad,
  obtenerOrganizadores,
} from '../services/eventosApi';
import { useSesion } from '../context/sesionContexto.js';

export default function GestionActividades({ onCambioActividades, actualizacion = 0 }) {
  const [actividades, setActividades] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [organizadores, setOrganizadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  // Los permisos los decide el servidor según el rol de la sesión iniciada.
  const { perfil } = useSesion() ?? {};
  const puedeGestionar = ['administrador', 'organizador'].includes(perfil?.rol);

  const [editId, setEditId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('10:00');
  const [lugar, setLugar] = useState('');
  const [preparar, setPreparar] = useState('');
  const [capacidad, setCapacidad] = useState(15);
  const [categoriaId, setCategoriaId] = useState('');
  const [organizadorId, setOrganizadorId] = useState('');
  const [estadoInicial, setEstadoInicial] = useState('borrador');

  // Carga de datos (patrón de hooks/useRecurso.js): el estado cambia solo dentro de las promesas.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerActividades(false), obtenerCategoriasActividad(true), obtenerOrganizadores(true)])
      .then(([acts, cats, orgs]) => {
        if (!vigente) return;
        setActividades(acts);
        setCategorias(cats);
        setOrganizadores(orgs);
        if (cats.length > 0) setCategoriaId((actual) => actual || String(cats[0].id));
        if (orgs.length > 0) setOrganizadorId((actual) => actual || String(orgs[0].id));
      })
      .catch((err) => {
        if (vigente) setError(err.message || 'No fue posible cargar el panel de actividades.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [version, actualizacion]);

  // Recarga tras una acción del usuario (patrón de hooks/useRecurso.js: el efecto vuelve a
  // pedir los datos y el estado solo cambia dentro de las promesas).
  const recargar = () => {
    setCargando(true);
    setError('');
    setVersion((v) => v + 1);
  };

  const limpiarFormulario = () => {
    setEditId(null);
    setTitulo('');
    setFecha('');
    setHora('10:00');
    setLugar('');
    setPreparar('');
    setCapacidad(15);
    setEstadoInicial('borrador');
  };

  const notificarActualizacion = async () => {
    recargar();
    if (onCambioActividades) {
      await onCambioActividades();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMensajeExito('');
      const payload = {
        titulo,
        fecha,
        hora: hora || null,
        lugar,
        preparar: preparar || null,
        capacidad: Number(capacidad),
        categoria_id: Number(categoriaId),
        organizador_id: Number(organizadorId),
        estado: estadoInicial,
      };

      if (editId) {
        await actualizarActividad(editId, payload);
        setMensajeExito('Actividad escolar actualizada correctamente.');
      } else {
        await crearActividad(payload);
        setMensajeExito('Actividad escolar creada correctamente.');
      }
      limpiarFormulario();
      await notificarActualizacion();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublicar = async (id) => {
    try {
      setError('');
      setMensajeExito('');
      await publicarActividad(id);
      setMensajeExito('Actividad publicada y visible en el calendario de familias.');
      await notificarActualizacion();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelar = async (id) => {
    try {
      setError('');
      setMensajeExito('');
      await cancelarActividad(id);
      setMensajeExito('Actividad cancelada y retirada del calendario familiar.');
      await notificarActualizacion();
    } catch (err) {
      setError(err.message);
    }
  };

  const iniciarEdicion = (act) => {
    setEditId(act.id);
    setTitulo(act.titulo);
    setFecha(act.fecha);
    setHora(act.hora || '');
    setLugar(act.lugar);
    setPreparar(act.preparar || '');
    setCapacidad(act.capacidad);
    setCategoriaId(String(act.categoria_id));
    setOrganizadorId(String(act.organizador_id));
    setEstadoInicial(act.estado);
  };

  return (
    <div className="mt-4 pt-3 border-top" id="gestion-actividades">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h3 className="h5 fw-bold mb-0" style={{ color: 'var(--pr-blue)' }}>
          Gestión y Publicación de Actividades Escolares (Organizador)
        </h3>
        {/* Cierre H-01/H-03: el perfil sale de la sesión iniciada, no de un selector. */}
        <span className={`badge ${puedeGestionar ? 'bg-success' : 'bg-secondary'}`} role="status">
          {puedeGestionar ? 'Sesión de personal del jardín: puedes gestionar' : 'Solo lectura · inicia sesión con una cuenta autorizada para gestionar'}
        </span>
      </div>

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

      {cargando ? (
        <p className="text-muted small">Cargando actividades escolares...</p>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-lg-5">
            <div className="card p-3 border shadow-sm rounded-4">
              <h4 className="h6 fw-bold mb-3">
                {editId ? 'Editar Actividad Escolar' : 'Crear Actividad Escolar'}
              </h4>
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label htmlFor="act-titulo" className="form-label small fw-bold mb-1">
                    Título
                  </label>
                  <input
                    id="act-titulo"
                    type="text"
                    className="form-control form-control-sm"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label htmlFor="act-fecha" className="form-label small fw-bold mb-1">
                      Fecha
                    </label>
                    <input
                      id="act-fecha"
                      type="date"
                      className="form-control form-control-sm"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label htmlFor="act-hora" className="form-label small fw-bold mb-1">
                      Hora
                    </label>
                    <input
                      id="act-hora"
                      type="time"
                      className="form-control form-control-sm"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-8">
                    <label htmlFor="act-lugar" className="form-label small fw-bold mb-1">
                      Lugar
                    </label>
                    <input
                      id="act-lugar"
                      type="text"
                      className="form-control form-control-sm"
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-4">
                    <label htmlFor="act-cap" className="form-label small fw-bold mb-1">
                      Capacidad
                    </label>
                    <input
                      id="act-cap"
                      type="number"
                      min="1"
                      max="500"
                      className="form-control form-control-sm"
                      value={capacidad}
                      onChange={(e) => setCapacidad(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label htmlFor="act-cat" className="form-label small fw-bold mb-1">
                      Categoría
                    </label>
                    <select
                      id="act-cat"
                      className="form-select form-select-sm"
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                      required
                    >
                      <option value="">Seleccione...</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    {categorias.length === 0 && (
                      <p className="form-text text-danger mb-0">
                        No hay categorías activas. Dirección debe crearlas en «Administración de organizadores y categorías».
                      </p>
                    )}
                  </div>
                  <div className="col-6">
                    <label htmlFor="act-org" className="form-label small fw-bold mb-1">
                      Organizador
                    </label>
                    <select
                      id="act-org"
                      className="form-select form-select-sm"
                      value={organizadorId}
                      onChange={(e) => setOrganizadorId(e.target.value)}
                      required
                    >
                      <option value="">Seleccione...</option>
                      {organizadores.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nombre}
                        </option>
                      ))}
                    </select>
                    {organizadores.length === 0 && (
                      <p className="form-text text-danger mb-0">No hay organizadores activos.</p>
                    )}
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-7">
                    <label htmlFor="act-prep" className="form-label small fw-bold mb-1">
                      Indicaciones / Preparar
                    </label>
                    <input
                      id="act-prep"
                      type="text"
                      className="form-control form-control-sm"
                      value={preparar}
                      onChange={(e) => setPreparar(e.target.value)}
                    />
                  </div>
                  <div className="col-5">
                    <label htmlFor="act-estado" className="form-label small fw-bold mb-1">
                      Estado inicial
                    </label>
                    <select
                      id="act-estado"
                      className="form-select form-select-sm"
                      value={estadoInicial}
                      onChange={(e) => setEstadoInicial(e.target.value)}
                    >
                      <option value="borrador">Borrador</option>
                      <option value="publicada">Publicada</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn-institucional-primary btn-sm flex-grow-1">
                    {editId ? 'Guardar Cambios' : 'Guardar Actividad'}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={limpiarFormulario}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="col-12 col-lg-7">
            <h4 className="h6 fw-bold mb-2">
              Registro de Actividades ({actividades.length})
            </h4>
            {actividades.length === 0 ? (
              <p className="text-muted small">No hay actividades registradas en la base de datos.</p>
            ) : (
              <div className="list-group shadow-sm">
                {actividades.map((act) => (
                  <div
                    key={act.id}
                    className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2 small"
                  >
                    <div>
                      <strong>{act.titulo}</strong>{' '}
                      <span
                        className={`badge ${
                          act.estado === 'publicada'
                            ? 'bg-success'
                            : act.estado === 'cancelada'
                            ? 'bg-danger'
                            : 'bg-warning text-dark'
                        }`}
                      >
                        {act.estado}
                      </span>
                      <div className="text-muted">
                        📅 {act.fecha} {act.hora ? `· ${act.hora}` : ''} · 📍 {act.lugar} · Cupos:{' '}
                        {act.cupos_disponibles}/{act.capacidad}
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => iniciarEdicion(act)}
                      >
                        Editar
                      </button>
                      {act.estado !== 'publicada' && act.estado !== 'cancelada' && (
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          onClick={() => handlePublicar(act.id)}
                        >
                          Publicar
                        </button>
                      )}
                      {act.estado !== 'cancelada' && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleCancelar(act.id)}
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
        </div>
      )}
    </div>
  );
}