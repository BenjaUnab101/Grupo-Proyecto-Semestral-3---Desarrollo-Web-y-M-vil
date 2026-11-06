import { useEffect, useMemo, useState } from 'react';
import documentosFallback from '../data/documentos.json';
import DocumentoItem from './DocumentoItem.jsx';
import {
  CATEGORIAS_DOCUMENTO,
  obtenerDocumentos,
  crearDocumento,
  actualizarDocumento,
  filtrarDocumentosPorCategoria,
} from '../services/documentosApi.js';

export default function Documentos() {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [rolActivo, setRolActivo] = useState('apoderado');

  // Formulario Dirección (HU-27 CA1, CA2)
  const [editId, setEditId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Reglamentos');
  const [descripcion, setDescripcion] = useState('');
  const [urlArchivo, setUrlArchivo] = useState('');
  const [vigente, setVigente] = useState(true);

  const esDireccion = rolActivo === 'direccion';

  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      setError('');
      const remotos = await obtenerDocumentos({ soloVigentes: !esDireccion });
      if (Array.isArray(remotos) && remotos.length > 0) {
        setDocumentos(remotos);
      } else {
        setDocumentos(
          documentosFallback.map((d) => ({
            ...d,
            vigente: true,
            fecha_actualizacion: '2026-09-01',
          }))
        );
      }
    } catch {
      setDocumentos(
        documentosFallback.map((d) => ({
          ...d,
          vigente: true,
          fecha_actualizacion: '2026-09-01',
        }))
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDocumentos();
  }, [esDireccion]);

  const visibles = useMemo(
    () => filtrarDocumentosPorCategoria(documentos, categoriaActiva, !esDireccion),
    [documentos, categoriaActiva, esDireccion]
  );

  const limpiarFormulario = () => {
    setEditId(null);
    setTitulo('');
    setCategoria('Reglamentos');
    setDescripcion('');
    setUrlArchivo('');
    setVigente(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');
    try {
      const payload = {
        titulo,
        categoria,
        descripcion,
        url_archivo: urlArchivo || null,
        vigente,
      };
      if (editId) {
        await actualizarDocumento(editId, payload, rolActivo);
        setMensajeExito('Documento institucional actualizado en PostgreSQL.');
      } else {
        await crearDocumento(payload, rolActivo);
        setMensajeExito('Documento institucional publicado en PostgreSQL.');
      }
      limpiarFormulario();
      await cargarDocumentos();
    } catch (err) {
      setError(err.message);
    }
  };

  const iniciarEdicion = (doc) => {
    setEditId(doc.id);
    setTitulo(doc.titulo);
    setCategoria(doc.categoria);
    setDescripcion(doc.descripcion);
    setUrlArchivo(doc.url_archivo || '');
    setVigente(doc.vigente !== false);
  };

  const handleAlternarVigencia = async (doc) => {
    setError('');
    setMensajeExito('');
    try {
      await actualizarDocumento(doc.id, { vigente: !(doc.vigente !== false) }, rolActivo);
      setMensajeExito('Estado de vigencia actualizado.');
      await cargarDocumentos();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="btn-group flex-wrap" role="group" aria-label="Filtrar documentos por categoría">
          {CATEGORIAS_DOCUMENTO.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${
                categoriaActiva === cat ? 'btn-institucional-primary' : 'btn-outline-secondary'
              }`}
              aria-pressed={categoriaActiva === cat}
              onClick={() => setCategoriaActiva(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="d-flex align-items-center gap-2">
          <label htmlFor="selector-rol-hu27" className="small fw-semibold mb-0">
            Vista:
          </label>
          <select
            id="selector-rol-hu27"
            className="form-select form-select-sm w-auto"
            value={rolActivo}
            onChange={(e) => setRolActivo(e.target.value)}
          >
            <option value="apoderado">Familias (Solo vigentes)</option>
            <option value="direccion">Dirección (Administrar protocolos)</option>
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

      {esDireccion && (
        <div className="card p-3 border shadow-sm rounded-4 mb-4 bg-light">
          <h4 className="h6 fw-bold mb-3" style={{ color: 'var(--pr-blue)' }}>
            {editId ? 'Editar Documento o Protocolo' : 'Publicar Nuevo Documento o Protocolo'}
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="row g-2 mb-2">
              <div className="col-12 col-md-5">
                <label htmlFor="doc-titulo" className="form-label small fw-bold mb-1">
                  Título Oficial
                </label>
                <input
                  id="doc-titulo"
                  type="text"
                  className="form-control form-control-sm"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor="doc-cat" className="form-label small fw-bold mb-1">
                  Categoría
                </label>
                <select
                  id="doc-cat"
                  className="form-select form-select-sm"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="Reglamentos">Reglamentos</option>
                  <option value="Protocolos">Protocolos</option>
                  <option value="Formularios">Formularios</option>
                </select>
              </div>
              <div className="col-6 col-md-4">
                <label htmlFor="doc-url" className="form-label small fw-bold mb-1">
                  Enlace / Ruta PDF (opcional)
                </label>
                <input
                  id="doc-url"
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="/docs/protocolo.pdf"
                  value={urlArchivo}
                  onChange={(e) => setUrlArchivo(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-2">
              <label htmlFor="doc-desc" className="form-label small fw-bold mb-1">
                Descripción normativa
              </label>
              <textarea
                id="doc-desc"
                rows="2"
                className="form-control form-control-sm"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
              />
            </div>

            <div className="d-flex justify-content-between align-items-center">
              <div className="form-check">
                <input
                  id="doc-vigente"
                  type="checkbox"
                  className="form-check-input"
                  checked={vigente}
                  onChange={(e) => setVigente(e.target.checked)}
                />
                <label htmlFor="doc-vigente" className="form-check-label small">
                  Documento vigente para consulta pública
                </label>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn-institucional-primary btn-sm">
                  {editId ? 'Guardar Cambios' : 'Publicar Documento'}
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
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p className="text-muted small" role="status">
          Cargando documentos y protocolos...
        </p>
      ) : visibles.length === 0 ? (
        <p className="text-muted small border rounded-3 p-3 bg-white" role="status">
          No hay documentos vigentes en esta categoría.
        </p>
      ) : (
        <div className="row g-3">
          {visibles.map((documento) => (
            <DocumentoItem
              key={documento.id}
              documento={documento}
              modoDireccion={esDireccion}
              onEditar={iniciarEdicion}
              onAlternarVigencia={handleAlternarVigencia}
            />
          ))}
        </div>
      )}
    </div>
  );
}
