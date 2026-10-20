export function obtenerCondicionClima(codigo) {
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

export function obtenerRecomendacionesClima({
  probabilidadLluvia,
  indiceUV,
  temperaturaMinima,
}) {
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