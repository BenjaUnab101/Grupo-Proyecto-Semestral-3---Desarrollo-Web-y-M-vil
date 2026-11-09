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
import { useSesion } from '../context/sesionContexto.js';

export default function Documentos() {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  // Cierre H-01: la vista de dirección depende de la sesión iniciada, no de un selector.
  const { usuarioId, perfil } = useSesion() ?? {};

  // Formulario Dirección (HU-27 CA1, CA2)
  const [editId, setEditId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Reglamentos');
  const [descripcion, setDescripcion] = useState('');
  const [urlArchivo, setUrlArchivo] = useState('');
  const [vigente, setVigente] = useState(true);

  const esDireccion = perfil?.rol === 'administrador';

  // Carga de datos (patrón de hooks/useRecurso.js): el estado cambia solo dentro de las promesas.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vigente = true;
    obtenerDocumentos({ soloVigentes: !esDireccion })
      .then((remotos) => (Array.isArray(remotos) && remotos.length > 0 ? remotos : documentosFallback.map((d) => ({ ...d, vigente: true, fecha_actualizacion: '2026-09-01' }))))
      .catch(() => documentosFallback.map((d) => ({ ...d, vigente: true, fecha_actualizacion: '2026-09-01' })))
      .then((lista) => {
        if (!vigente) return;
        setDocumentos(lista);
        setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [esDireccion, version]);

  // Recarga tras una acción del usuario (patrón de hooks/useRecurso.js: el efecto vuelve a
  // pedir los datos y el estado solo cambia dentro de las promesas).
  const recargar = () => {
    setCargando(true);
    setError('');
    setVersion((v) => v + 1);
  };

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
        await actualizarDocumento(editId, payload, usuarioId);
        setMensajeExito('Documento institucional actualizado en PostgreSQL.');
      } else {
        await crearDocumento(payload, usuarioId);
        setMensajeExito('Documento institucional publicado en PostgreSQL.');
      }
      limpiarFormulario();
      recargar();
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
      await actualizarDocumento(doc.id, { vigente: !(doc.vigente !== false) }, usuarioId);
      setMensajeExito('Estado de vigencia actualizado.');
      recargar();
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

        {/* Cierre H-01/H-03: el perfil sale de la sesión iniciada, no de un selector. */}

        <span className={`badge ${esDireccion ? 'bg-success' : 'bg-secondary'}`} role="status">

          {esDireccion ? 'Vista de dirección (sesión iniciada)' : 'Solo lectura · inicia sesión con una cuenta autorizada para gestionar'}

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
