import { useEffect, useState } from 'react';
import {
  obtenerOrganizadores,
  crearOrganizador,
  actualizarOrganizador,
  obtenerCategoriasActividad,
  crearCategoriaActividad,
  actualizarCategoriaActividad,
} from '../services/eventosApi';

export default function GestionOrganizadores() {
  const [organizadores, setOrganizadores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [rolUsuario, setRolUsuario] = useState('direccion');

  // Formulario Organizador (Crear / Editar)
  const [editOrgId, setEditOrgId] = useState(null);
  const [nombreOrg, setNombreOrg] = useState('');
  const [emailOrg, setEmailOrg] = useState('');
  const [rolOrg, setRolOrg] = useState('Educadora');
  const [telefonoOrg, setTelefonoOrg] = useState('');

  // Formulario Categoría (Crear / Editar)
  const [editCatId, setEditCatId] = useState(null);
  const [nombreCat, setNombreCat] = useState('');
  const [descCat, setDescCat] = useState('');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError('');
      const [orgs, cats] = await Promise.all([
        obtenerOrganizadores(),
        obtenerCategoriasActividad(),
      ]);
      setOrganizadores(orgs);
      setCategorias(cats);
    } catch (err) {
      setError(err.message || 'Servicio de eventos no disponible.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const limpiarFormOrg = () => {
    setEditOrgId(null);
    setNombreOrg('');
    setEmailOrg('');
    setRolOrg('Educadora');
    setTelefonoOrg('');
  };

  const limpiarFormCat = () => {
    setEditCatId(null);
    setNombreCat('');
    setDescCat('');
  };

  const handleSubmitOrganizador = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMensajeExito('');
      const payload = {
        nombre: nombreOrg,
        email: emailOrg,
        rol_perfil: rolOrg,
        telefono: telefonoOrg || null,
      };
      if (editOrgId) {
        await actualizarOrganizador(editOrgId, payload, rolUsuario);
        setMensajeExito('Organizador actualizado correctamente.');
      } else {
        await crearOrganizador(payload, rolUsuario);
        setMensajeExito('Organizador registrado correctamente.');
      }
      limpiarFormOrg();
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitCategoria = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMensajeExito('');
      const payload = {
        nombre: nombreCat,
        descripcion: descCat || null,
      };
      if (editCatId) {
        await actualizarCategoriaActividad(editCatId, payload, rolUsuario);
        setMensajeExito('Categoría actualizada correctamente.');
      } else {
        await crearCategoriaActividad(payload, rolUsuario);
        setMensajeExito('Categoría registrada correctamente.');
      }
      limpiarFormCat();
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  };

  const iniciarEdicionOrg = (org) => {
    setEditOrgId(org.id);
    setNombreOrg(org.nombre);
    setEmailOrg(org.email);
    setRolOrg(org.rol_perfil);
    setTelefonoOrg(org.telefono || '');
  };

  const iniciarEdicionCat = (cat) => {
    setEditCatId(cat.id);
    setNombreCat(cat.nombre);
    setDescCat(cat.descripcion || '');
  };

  return (
    <div className="mt-4 pt-3 border-top" id="gestion-organizadores">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h3 className="h5 fw-bold mb-0" style={{ color: 'var(--pr-blue)' }}>
          Administración de Organizadores y Categorías (Dirección)
        </h3>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="selector-rol-hu17" className="small fw-semibold mb-0">
            Simular perfil:
          </label>
          <select
            id="selector-rol-hu17"
            className="form-select form-select-sm w-auto"
            value={rolUsuario}
            onChange={(e) => setRolUsuario(e.target.value)}
          >
            <option value="direccion">Dirección (Autorizado)</option>
            <option value="apoderado">Apoderado (Solo lectura)</option>
          </select>
        </div>
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
        <p className="text-muted small">Cargando organizadores y categorías...</p>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6">
              <div className="card p-3 border shadow-sm rounded-4 h-100">
                <h4 className="h6 fw-bold mb-3">
                  {editOrgId ? 'Editar Organizador' : 'Nuevo Organizador'}
                </h4>
                <form onSubmit={handleSubmitOrganizador}>
                  <div className="mb-2">
                    <label htmlFor="org-nombre" className="form-label small fw-bold mb-1">
                      Nombre Completo
                    </label>
                    <input
                      id="org-nombre"
                      type="text"
                      className="form-control form-control-sm"
                      value={nombreOrg}
                      onChange={(e) => setNombreOrg(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label htmlFor="org-email" className="form-label small fw-bold mb-1">
                      Correo Institucional
                    </label>
                    <input
                      id="org-email"
                      type="email"
                      className="form-control form-control-sm"
                      value={emailOrg}
                      onChange={(e) => setEmailOrg(e.target.value)}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label htmlFor="org-rol" className="form-label small fw-bold mb-1">
                        Perfil
                      </label>
                      <select
                        id="org-rol"
                        className="form-select form-select-sm"
                        value={rolOrg}
                        onChange={(e) => setRolOrg(e.target.value)}
                      >
                        <option value="Dirección">Dirección</option>
                        <option value="Educadora">Educadora</option>
                        <option value="Fonoaudióloga">Fonoaudióloga</option>
                        <option value="Coordinación">Coordinación</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label htmlFor="org-tel" className="form-label small fw-bold mb-1">
                        Teléfono
                      </label>
                      <input
                        id="org-tel"
                        type="text"
                        className="form-control form-control-sm"
                        value={telefonoOrg}
                        onChange={(e) => setTelefonoOrg(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn-institucional-primary btn-sm flex-grow-1">
                      {editOrgId ? 'Guardar Cambios' : 'Registrar Organizador'}
                    </button>
                    {editOrgId && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={limpiarFormOrg}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card p-3 border shadow-sm rounded-4 h-100">
                <h4 className="h6 fw-bold mb-3">
                  {editCatId ? 'Editar Categoría' : 'Nueva Categoría'}
                </h4>
                <form onSubmit={handleSubmitCategoria}>
                  <div className="mb-2">
                    <label htmlFor="cat-nombre" className="form-label small fw-bold mb-1">
                      Nombre de la Categoría
                    </label>
                    <input
                      id="cat-nombre"
                      type="text"
                      className="form-control form-control-sm"
                      value={nombreCat}
                      onChange={(e) => setNombreCat(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="cat-desc" className="form-label small fw-bold mb-1">
                      Descripción
                    </label>
                    <textarea
                      id="cat-desc"
                      className="form-control form-control-sm"
                      rows="2"
                      value={descCat}
                      onChange={(e) => setDescCat(e.target.value)}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn-institucional-primary btn-sm flex-grow-1">
                      {editCatId ? 'Guardar Cambios' : 'Registrar Categoría'}
                    </button>
                    {editCatId && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={limpiarFormCat}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-md-6">
              <h5 className="h6 fw-bold">Organizadores ({organizadores.length})</h5>
              {organizadores.length === 0 ? (
                <p className="text-muted small">Sin organizadores registrados.</p>
              ) : (
                <ul className="list-group list-group-flush border rounded-3">
                  {organizadores.map((org) => (
                    <li
                      key={org.id}
                      className="list-group-item d-flex justify-content-between align-items-center small"
                    >
                      <div>
                        <strong>{org.nombre}</strong> · <span className="badge bg-secondary">{org.rol_perfil}</span>
                        <div className="text-muted">{org.email}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => iniciarEdicionOrg(org)}
                      >
                        Editar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="col-12 col-md-6">
              <h5 className="h6 fw-bold">Categorías ({categorias.length})</h5>
              {categorias.length === 0 ? (
                <p className="text-muted small">Sin categorías registradas.</p>
              ) : (
                <ul className="list-group list-group-flush border rounded-3">
                  {categorias.map((cat) => (
                    <li
                      key={cat.id}
                      className="list-group-item d-flex justify-content-between align-items-center small"
                    >
                      <div>
                        <strong>{cat.nombre}</strong>
                        {cat.descripcion && <div className="text-muted">{cat.descripcion}</div>}
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => iniciarEdicionCat(cat)}
                      >
                        Editar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
