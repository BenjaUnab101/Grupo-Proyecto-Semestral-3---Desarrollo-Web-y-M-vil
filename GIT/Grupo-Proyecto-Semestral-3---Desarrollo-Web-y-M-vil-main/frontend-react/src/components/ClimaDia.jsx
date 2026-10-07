import {
  obtenerCondicionClima,
  obtenerRecomendacionesClima,
} from '../utils/clima';

function obtenerNombreDia(fecha) {
  if (!fecha) return 'Día no disponible';

  const fechaLocal = new Date(`${fecha}T12:00:00`);

  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(fechaLocal);
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

  const recomendaciones = obtenerRecomendacionesClima({
    probabilidadLluvia,
    indiceUV,
    temperaturaMinima,
  });

  return (
    <article className="clima-dia">
      <h3>{obtenerNombreDia(fecha)}</h3>

      <p className="clima-condicion">
        {obtenerCondicionClima(codigoClima)}
      </p>

      <div className="clima-temperaturas">
        <span>
          Máx:{' '}
          {temperaturaMaxima !== null
            ? `${temperaturaMaxima} °C`
            : 'N/D'}
        </span>

        <span>
          Mín:{' '}
          {temperaturaMinima !== null
            ? `${temperaturaMinima} °C`
            : 'N/D'}
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