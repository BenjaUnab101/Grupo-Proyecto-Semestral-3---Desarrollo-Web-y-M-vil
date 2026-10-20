// Función pura requerida por las notas técnicas
export function estadoCupos(sala) {
  const cap = Number(sala.capacidad) || 0;
  const mat = Number(sala.matriculados) || 0;

  if (cap <= 0) {
    return {
      texto: 'Sin información',
      claseBadge: 'bg-secondary',
      cuposDisponibles: 0,
      porcentaje: 100,
    };
  }

  const cupos = Math.max(0, cap - mat);
  const porcentaje = Math.min(100, Math.max(0, Math.round((mat / cap) * 100)));

  if (cupos === 0) {
    return {
      texto: 'Sin cupos',
      claseBadge: 'bg-danger text-white',
      cuposDisponibles: 0,
      porcentaje,
    };
  }

  if (cupos >= 1 && cupos <= 3) {
    return {
      texto: 'Últimos cupos',
      claseBadge: 'bg-warning text-dark',
      cuposDisponibles: cupos,
      porcentaje,
    };
  }

  return {
    texto: 'Cupos disponibles',
    claseBadge: 'bg-success text-white',
    cuposDisponibles: cupos,
    porcentaje,
  };
}

export default function SalaCard({ sala }) {
  const estado = estadoCupos(sala);

  return (
    <div className="card h-100 border-0 shadow-sm rounded-4 p-3 bg-white">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h3 className="h6 fw-bold mb-0" style={{ color: 'var(--pr-blue)' }}>
            {sala.nombre}
          </h3>
          <span className={`badge px-2 py-1 rounded-pill ${estado.claseBadge}`}>
            {estado.texto}
          </span>
        </div>

        <p className="small text-muted mb-2">
          Capacidad: <strong>{sala.capacidad}</strong> | Matriculados: <strong>{sala.matriculados}</strong>
        </p>

        {/* Equivalente textual accesible y barra de ocupación (CA2 / CA3) */}
        <div className="mt-auto">
          <div className="d-flex justify-content-between small text-secondary mb-1">
            <span>Ocupación:</span>
            <span>{estado.porcentaje}% ({sala.matriculados}/{sala.capacidad})</span>
          </div>
          <div
            className="progress"
            style={{ height: '8px' }}
            role="progressbar"
            aria-valuenow={estado.porcentaje}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Ocupación de ${sala.nombre}: ${estado.porcentaje}%`}
          >
            <div
              className={`progress-bar ${estado.porcentaje >= 100 ? 'bg-danger' : estado.porcentaje >= 80 ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${estado.porcentaje}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
