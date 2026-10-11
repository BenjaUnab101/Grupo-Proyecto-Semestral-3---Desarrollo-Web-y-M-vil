export default function NivelCard({ nombre, edad, descripcion }) {
  return (
    <div className="card h-100 border-0 shadow-sm rounded-4 p-3 bg-white">
      <div className="card-body d-flex flex-column">
        <span className="pill-badge mb-2 align-self-start">{edad}</span>
        <h3 className="h5 fw-bold mb-2" style={{ color: 'var(--pr-blue)' }}>
          {nombre}
        </h3>
        <p className="card-text text-muted small flex-grow-1">
          {descripcion}
        </p>
      </div>
    </div>
  );
}
