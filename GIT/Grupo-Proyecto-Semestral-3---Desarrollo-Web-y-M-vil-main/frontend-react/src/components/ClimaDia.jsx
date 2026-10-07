function obtenerNombreDia(fecha) {
  if (!fecha) return 'Día no disponible';

  const fechaLocal = new Date(`${fecha}T12:00:00`);

  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(fechaLocal);
}

function obtenerCondicion(codigo) {
  const condiciones = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla',
    51: 'Llovizna',
    53: 'Llovizna',
    55: 'Llovizna',
    61: 'Lluvia',
    63: 'Lluvia',
    65: 'Lluvia intensa',
    71: 'Nieve',
    73: 'Nieve',
    75: 'Nieve intensa',
    80: 'Chubascos',
    81: 'Chubascos',
    82: 'Chubascos intensos',
    95: 'Tormenta',
    96: 'Tormenta',
    99: 'Tormenta',
  };

  return condiciones[codigo] || 'Condición no disponible';
}

function obtenerRecomendacion(probabilidadLluvia, indiceUV, temperaturaMinima) {
  const recomendaciones = [];

  if (probabilidadLluvia !== null && probabilidadLluvia >= 60) {
    recomendaciones.push('Llevar protección para la lluvia.');
  }

  if (indiceUV !== null && indiceUV >= 6) {
    recomendaciones.push('Se recomienda protección frente al sol.');
  }

  if (temperaturaMinima !== null && temperaturaMinima <= 7) {
    recomendaciones.push('Se recomienda llevar ropa abrigada.');
  }

  return recomendaciones;
}

export default function ClimaDia({ dia }) {
  const {
    fecha,
    codigoClima,
    temperaturaMaxima,
    temperaturaMinima,
    probabilidadLluvia,
    indiceUV,
  } = dia;

  const recomendaciones = obtenerRecomendacion(
    probabilidadLluvia,
    indiceUV,
    temperaturaMinima
  );

  return (
    <article className="clima-dia">
      <h3>{obtenerNombreDia(fecha)}</h3>

      <p className="clima-condicion">
        {obtenerCondicion(codigoClima)}
      </p>

      <div className="clima-temperaturas">
        <span>
          Máx: {temperaturaMaxima !== null ? `${temperaturaMaxima} °C` : 'N/D'}
        </span>

        <span>
          Mín: {temperaturaMinima !== null ? `${temperaturaMinima} °C` : 'N/D'}
        </span>
      </div>

      <p>
        Lluvia:{' '}
        {probabilidadLluvia !== null
          ? `${probabilidadLluvia}%`
          : 'N/D'}
      </p>

      <p>
        UV: {indiceUV !== null ? indiceUV : 'N/D'}
      </p>

      {recomendaciones.length > 0 && (
        <div className="clima-recomendaciones">
          <strong>Recomendación</strong>

          <ul>
            {recomendaciones.map((recomendacion) => (
              <li key={recomendacion}>{recomendacion}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}