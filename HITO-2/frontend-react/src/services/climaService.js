const API_URL = 'https://api.open-meteo.com/v1/forecast';

// si cambio la linea 1 por la linea 5, el codigo no funciona y me da un error
// ideal para probar el error y la pestaña de "Reintentar" para la API
// const API_URL = 'https://api.open-meteo.com/v1/forecast-error';

export async function obtenerPronostico(signal) {
  const params = new URLSearchParams({
    latitude: '-33.0153',
    longitude: '-71.5500',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
    timezone: 'America/Santiago',
    forecast_days: '7',
  });

  const response = await fetch(`${API_URL}?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Error HTTP al consultar el pronóstico (${response.status}).`
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'La respuesta del servicio meteorológico no contiene JSON válido.'
    );
  }

  validarContrato(data);

  return adaptarPronostico(data);
}

function validarContrato(data) {
  if (!data || typeof data !== 'object') {
    throw new Error(
      'La respuesta del servicio meteorológico no es válida.'
    );
  }

  if (!data.daily || typeof data.daily !== 'object') {
    throw new Error(
      'La respuesta del servicio meteorológico no contiene datos diarios.'
    );
  }

  const campos = [
    'time',
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_probability_max',
    'uv_index_max',
  ];

  for (const campo of campos) {
    if (!Array.isArray(data.daily[campo])) {
      throw new Error(
        `El campo diario "${campo}" no tiene un formato válido.`
      );
    }
  }

  const cantidad = data.daily.time.length;

  for (const campo of campos) {
    if (data.daily[campo].length !== cantidad) {
      throw new Error(
        `Los datos diarios tienen longitudes incompatibles en "${campo}".`
      );
    }
  }

  if (cantidad === 0) {
    throw new Error(
      'El servicio meteorológico no devolvió días de pronóstico.'
    );
  }

  validarTipos(data.daily);
}

function validarTipos(daily) {
  for (let i = 0; i < daily.time.length; i++) {
    if (
      daily.time[i] !== null &&
      typeof daily.time[i] !== 'string'
    ) {
      throw new Error('Las fechas del pronóstico tienen un formato inválido.');
    }

    const camposNumericos = [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'uv_index_max',
    ];

    for (const campo of camposNumericos) {
      const valor = daily[campo][i];

      if (valor !== null && typeof valor !== 'number') {
        throw new Error(
          `El campo "${campo}" contiene un valor incompatible.`
        );
      }
    }
  }
}

function adaptarPronostico(data) {
  const { daily, daily_units = {} } = data;

  return daily.time.map((fecha, index) => ({
    fecha,
    codigoClima: daily.weather_code[index] ?? null,
    temperaturaMaxima: daily.temperature_2m_max[index] ?? null,
    temperaturaMinima: daily.temperature_2m_min[index] ?? null,
    probabilidadLluvia:
      daily.precipitation_probability_max[index] ?? null,
    indiceUV: daily.uv_index_max[index] ?? null,

    unidades: {
      temperatura: daily_units.temperature_2m_max ?? null,
      probabilidadLluvia:
        daily_units.precipitation_probability_max ?? null,
      indiceUV: daily_units.uv_index_max ?? null,
    },
  }));
}