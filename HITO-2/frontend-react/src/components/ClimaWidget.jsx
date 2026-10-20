import ClimaDia from './climaDia';

export default function ClimaWidget({
  pronostico,
  cargando,
  error,
  reintentar,
}) {
  if (cargando) {
    return (
      <section className="clima-widget">
        <div className="clima-loader">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">
              Cargando pronóstico...
            </span>
          </div>

          <p>Cargando pronóstico del clima...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="clima-widget">
        <div className="alert alert-danger" role="alert">
          <h3>No se pudo cargar el pronóstico</h3>

          <p>{error}</p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={reintentar}
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="clima-widget">
      <div className="clima-header">
        <h2>Pronóstico del clima</h2>
        <p>Viña del Mar · Próximos 7 días</p>
      </div>

      <div className="clima-grid">
        {pronostico.map((dia) => (
          <ClimaDia
            key={dia.fecha}
            dia={dia}
          />
        ))}
      </div>

      <p className="clima-atribucion">
        Datos meteorológicos: Open-Meteo.com
      </p>
    </section>
  );
}