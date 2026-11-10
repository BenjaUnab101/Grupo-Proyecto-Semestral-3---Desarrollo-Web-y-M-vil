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
    // TEC-06: códigos WMO documentados por Open-Meteo que faltaban en el mapa.
    56: 'Llovizna engelante',
    57: 'Llovizna engelante',
    61: 'Lluvia',
    63: 'Lluvia',
    65: 'Lluvia intensa',
    66: 'Lluvia engelante',
    67: 'Lluvia engelante',
    71: 'Nieve',
    73: 'Nieve',
    75: 'Nieve intensa',
    77: 'Granos de nieve',
    80: 'Chubascos',
    81: 'Chubascos',
    82: 'Chubascos intensos',
    85: 'Chubascos de nieve',
    86: 'Chubascos de nieve',
    95: 'Tormenta',
    96: 'Tormenta con granizo',
    99: 'Tormenta con granizo',
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
// ---------------------------------------------------------------------------
// HU-06 (SCRUM-53) · Clima previsto en cada actividad del calendario.
// ---------------------------------------------------------------------------

// CA1/CA2: une actividad y pronóstico por FECHA CIVIL ("AAAA-MM-DD"). Open-Meteo se consulta con
// timezone=America/Santiago, así que daily.time ya son fechas de Santiago: se comparan como texto,
// sin convertir a UTC. Sin pronóstico para ese día -> null (no se inventa clima).
export function climaParaFecha(pronostico, fecha) {
  if (!Array.isArray(pronostico) || typeof fecha !== 'string') return null;
  return pronostico.find((dia) => dia?.fecha === fecha) ?? null;
}

// CA1/CA3: resumen para la insignia. Las recomendaciones mantienen el orden definido en
// obtenerRecomendacionesClima (1° lluvia, 2° sol, 3° abrigo): la primera es la principal y las
// demás quedan accesibles. Un dato nulo no se muestra como 0 ni dispara recomendaciones.
export function resumenClimaActividad(dia) {
  if (!dia) return null;
  const condicion = obtenerCondicionClima(dia.codigoClima);
  const maxima = Number.isFinite(dia.temperaturaMaxima) ? Math.round(dia.temperaturaMaxima) : null;
  const recomendaciones = obtenerRecomendacionesClima({
    probabilidadLluvia: dia.probabilidadLluvia ?? null,
    indiceUV: dia.indiceUV ?? null,
    temperaturaMinima: dia.temperaturaMinima ?? null,
  });
  if (condicion === 'Condición no disponible' && maxima === null && recomendaciones.length === 0) return null;
  return { condicion, maxima, principal: recomendaciones[0] ?? null, otras: recomendaciones.slice(1) };
}
