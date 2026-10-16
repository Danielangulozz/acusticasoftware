/**
 * ==============================================================================
 * MÓDULO DE INTELIGIBILIDAD DE LA PALABRA (%ALCONS / STI / PEUTZ / LOGÁTOMOS)
 * Según normas ISO 9921, IEC 60268-16 y Modelo Clásico de V.M.A. Peutz
 * ==============================================================================
 * 
 * Implementa:
 * 1. Pérdida de Articulación de Consonantes (%ALcons) según el modelo de Peutz.
 * 2. Distancia Crítica (Dc) y Distancia Límite de Campo Reverberado (D_lim = 3.16 · Dc).
 * 3. Conversión de %ALcons a STI (Speech Transmission Index) y CIS (Common Intelligibility Scale).
 * 4. Escala de Calificación Cualitativa de Inteligibilidad (Excelente, Bueno, Regular, Pobre, Malo).
 * 5. Evaluación Experimental mediante Dictado de Logátomos (sílabas fonéticamente balanceadas).
 * 6. Comparación cuantitativa y de error (RMSE) entre datos experimentales y teóricos.
 * 7. Modelo dual: Estado Actual (Sin Acondicionamiento) vs Estado Tratado (Con Acondicionamiento).
 */

import { OCTAVE_BANDS, SPEED_OF_SOUND } from './acousticCalculations';

/**
 * Coeficiente de corrección del oyente 'a' en la fórmula de Peutz:
 * - Oyente entrenado / condiciones atentas: a = 1.5%
 * - Oyente estándar / promedio: a = 2.0%
 * - Sin corrección de aptitud: a = 0.0%
 */
export const PEUTZ_DEFAULT_LISTENER_CORRECTION = 1.5;

/**
 * Frecuencia central estándar recomendada para el cálculo de %ALcons:
 * 2000 Hz es la banda crítica de formantes de consonantes (/s/, /t/, /k/, /p/, /f/).
 */
export const ALCONS_CRITICAL_FREQUENCY = 2000;

/**
 * Calificaciones cualitativas de inteligibilidad según ISO 9921 e IEC 60268-16.
 */
export const INTELLIGIBILITY_QUALIFIERS = [
  {
    maxAlcons: 5.0,
    minSti: 0.75,
    rating: 'Excelente',
    description: 'Comunicación óptima sin esfuerzo. Todas las consonantes y matices son inteligibles.',
    badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    color: '#10b981',
  },
  {
    maxAlcons: 10.0,
    minSti: 0.60,
    rating: 'Bueno',
    description: 'Comprensión clara para la gran mayoría de oyentes. Adecuado para aulas de clase y conferencias.',
    badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    color: '#0071e3',
  },
  {
    maxAlcons: 15.0,
    minSti: 0.45,
    rating: 'Aceptable / Regular',
    description: 'Límite aceptable para salas de conferencias. Puede requerir concentración moderada del oyente.',
    badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    color: '#f59e0b',
  },
  {
    maxAlcons: 25.0,
    minSti: 0.30,
    rating: 'Pobre',
    description: 'Dificultad evidente para distinguir palabras. Se pierden consonantes finales y débiles.',
    badgeBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    color: '#f97316',
  },
  {
    maxAlcons: 100.0,
    minSti: 0.0,
    rating: 'Malo / Inaceptable',
    description: 'Mensaje ininteligible debido a excesiva reverberación o enmascaramiento.',
    badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    color: '#ef4444',
  },
];

/**
 * Obtiene la calificación cualitativa de inteligibilidad para un valor dado de %ALcons.
 * @param {number} alcons - Valor de %ALcons (0 - 100)
 */
export function getIntelligibilityRating(alcons) {
  const safeVal = Math.max(0, Number(alcons) || 0);
  for (const q of INTELLIGIBILITY_QUALIFIERS) {
    if (safeVal <= q.maxAlcons) {
      return q;
    }
  }
  return INTELLIGIBILITY_QUALIFIERS[INTELLIGIBILITY_QUALIFIERS.length - 1];
}

/**
 * Calcula la Distancia Crítica Dc [m] a partir del factor de directividad Q y la Constante de Sala R.
 * Fórmula analítica estándar: Dc = 0.141 · √(Q · R) = √( (Q · R) / (16 · π) )
 * 
 * @param {number} Q - Directividad de la fuente (típicamente Q=2 para voz humana sobre plano)
 * @param {number} R - Constante de la sala a la frecuencia de análisis (m²)
 * @returns {number} Distancia crítica Dc [m]
 */
export function calculateDc(Q = 2, R = 1.58) {
  const safeQ = Math.max(1, Number(Q) || 2);
  const safeR = Math.max(0.01, Number(R) || 1.58);
  return 0.141 * Math.sqrt(safeQ * safeR);
}

/**
 * Calcula la Distancia Límite D_lim [m] (límite de validez del campo directo en Peutz).
 * D_lim = 3.16 · Dc ≈ √( (Q · R) / (5 · π) )
 * Más allá de D_lim, la inteligibilidad entra en la meseta reverberante saturada.
 * 
 * @param {number} Dc - Distancia crítica [m]
 * @returns {number} Distancia límite [m]
 */
export function calculateDLim(Dc) {
  const safeDc = Math.max(0.01, Number(Dc) || 0.1);
  return 3.16 * safeDc;
}

/**
 * Calcula el Porcentaje de Pérdida de Articulación de Consonantes (%ALcons) según el modelo de Peutz.
 * 
 * Fórmulas clásicas de Peutz:
 * 1. Para d <= D_lim (d <= 3.16 · Dc):
 *    %ALcons = (200 · d² · RT60²) / (V · Q) + a
 * 
 * 2. Para d > D_lim (d > 3.16 · Dc):
 *    %ALcons = 9 · RT60 + a
 * 
 * @param {number} distance - Distancia fuente-receptor d [m]
 * @param {number} RT60 - Tiempo de reverberación en la banda crítica (típicamente 2000 Hz) [s]
 * @param {number} volume - Volumen del recinto V [m³]
 * @param {number} Q - Factor de directividad de la fuente (ej. Q=2 para voz)
 * @param {number} a - Factor de corrección del oyente (típicamente 1.5%)
 * @param {number} R - Constante de la sala R [m²] (usada para calcular Dc con precisión)
 * @returns {{ alcons: number, isReverberantField: boolean, Dc: number, dLim: number }}
 */
export function calculatePeutzAlcons(
  distance,
  RT60,
  volume,
  Q = 2,
  a = PEUTZ_DEFAULT_LISTENER_CORRECTION,
  R = null
) {
  const d = Math.max(0.1, Number(distance) || 1.0);
  const rt = Math.max(0.05, Number(RT60) || 1.0);
  const V = Math.max(1.0, Number(volume) || 30.0);
  const q = Math.max(1, Number(Q) || 2);
  const listenerFactor = Math.max(0, Number(a) || 0);

  // Distancia crítica y límite
  let Dc;
  if (R && R > 0) {
    Dc = calculateDc(q, R);
  } else {
    // Estimación alternativa si no se provee R: Dc ≈ 0.057 · √( (Q · V) / RT60 )
    Dc = 0.057 * Math.sqrt((q * V) / rt);
  }
  const dLim = calculateDLim(Dc);

  let rawAlcons = 0;
  let isReverberantField = false;

  if (d <= dLim) {
    // Región de transición campo directo a reverberado
    rawAlcons = (200 * d * d * rt * rt) / (V * q) + listenerFactor;
    isReverberantField = false;
  } else {
    // Meseta profunda del campo reverberado
    rawAlcons = 9 * rt + listenerFactor;
    isReverberantField = true;
  }

  // Acotar físicamente entre listenerFactor y 100%
  const alcons = Math.min(100.0, Math.max(listenerFactor, Number(rawAlcons.toFixed(2))));

  return {
    alcons,
    isReverberantField,
    Dc: Number(Dc.toFixed(2)),
    dLim: Number(dLim.toFixed(2)),
    distance: Number(d.toFixed(2)),
    RT60: Number(rt.toFixed(2)),
    volume: Number(V.toFixed(1)),
    Q: q,
    a: listenerFactor,
  };
}

/**
 * Convierte %ALcons a Speech Transmission Index (STI) según la correlación de Farrell-Becker / IEC 60268-16:
 * STI = -0.1845 · ln(%ALcons) + 0.9482
 * (o aproximación clásica STI = (96 - 15 · ln(%ALcons)) / 100)
 * 
 * @param {number} alcons - Porcentaje de pérdida de consonantes (0 - 100)
 * @returns {number} STI (0.00 - 1.00)
 */
export function alconsToSti(alcons) {
  const safeAlcons = Math.max(0.5, Math.min(100.0, Number(alcons) || 1.5));
  const sti = -0.1845 * Math.log(safeAlcons) + 0.9482;
  return Number(Math.max(0.0, Math.min(1.0, sti)).toFixed(2));
}

/**
 * Convierte STI a CIS (Common Intelligibility Scale):
 * CIS = 1 + log10(STI)
 * 
 * @param {number} sti - Valor de STI (0.00 - 1.00)
 * @returns {number} CIS (0.00 - 1.00)
 */
export function stiToCis(sti) {
  const safeSti = Math.max(0.01, Math.min(1.0, Number(sti) || 0.5));
  const cis = 1 + Math.log10(safeSti);
  return Number(Math.max(0.0, Math.min(1.0, cis)).toFixed(2));
}

/**
 * Genera la curva continua de %ALcons y STI en función de la distancia d desde 0.5m hasta dMax.
 * 
 * @param {number} RT60 - Tiempo de reverberación (s)
 * @param {number} volume - Volumen de la sala (m³)
 * @param {number} Q - Directividad de la fuente
 * @param {number} a - Factor de corrección del oyente
 * @param {number} R - Constante de sala (m²)
 * @param {number} dMax - Distancia máxima a evaluar (m)
 * @param {number} numPoints - Número de puntos muestreados
 * @returns {Array<object>} Array de puntos { d, alcons, sti, rating, isReverberantField }
 */
export function generateAlconsDistanceCurve(
  RT60,
  volume,
  Q = 2,
  a = PEUTZ_DEFAULT_LISTENER_CORRECTION,
  R = null,
  dMax = 10,
  numPoints = 50
) {
  const maxDist = Math.max(2.0, Number(dMax) || 10);
  const step = (maxDist - 0.5) / (numPoints - 1);
  const curve = [];

  for (let i = 0; i < numPoints; i++) {
    const d = Number((0.5 + i * step).toFixed(2));
    const result = calculatePeutzAlcons(d, RT60, volume, Q, a, R);
    const sti = alconsToSti(result.alcons);
    const cis = stiToCis(sti);
    const ratingObj = getIntelligibilityRating(result.alcons);

    curve.push({
      distance: d,
      dLabel: `${d}m`,
      alcons: result.alcons,
      sti,
      cis,
      rating: ratingObj.rating,
      color: ratingObj.color,
      isReverberantField: result.isReverberantField,
      Dc: result.Dc,
      dLim: result.dLim,
    });
  }

  return curve;
}

/**
 * Calcula el %ALcons experimental a partir de un ensayo de dictado de logátomos:
 * %ALcons_exp = (Errores / Total_Logátomos) · 100 = ( (Total - Aciertos) / Total ) · 100
 * 
 * @param {number} correctCount - Número de logátomos o consonantes identificadas correctamente
 * @param {number} totalCount - Número total de logátomos dictados (ej. 25, 50, 100)
 * @returns {number} %ALcons experimental (0.0% - 100.0%)
 */
export function calculateExperimentalAlcons(correctCount, totalCount) {
  const total = Math.max(1, parseInt(totalCount, 10) || 50);
  const correct = Math.max(0, Math.min(total, parseInt(correctCount, 10) || 0));
  const errors = total - correct;
  const raw = (errors / total) * 100;
  return Number(raw.toFixed(1));
}

/**
 * Banco oficial de Logátomos en Español (sílabas Consonante-Vocal-Consonante fonéticamente balanceadas).
 * Utilizado para el ensayo experimental de articulación subjetiva según ISO 9921 / ANSI S3.2.
 */
export const OFFICIAL_LOGATOME_LISTS = {
  LIST_A: [
    'BAL', 'PES', 'KOT', 'DIF', 'ZUN', 'TOR', 'MIK', 'FEL', 'GAD', 'RUP',
    'CHAL', 'NOB', 'TEK', 'VUR', 'ZAP', 'LIN', 'MOS', 'DUL', 'KEX', 'JAP',
    'SEN', 'VOF', 'TIR', 'PAZ', 'MEL', 'GUK', 'CHOT', 'RAL', 'BIN', 'ZOD',
    'KUF', 'NER', 'TAS', 'JEL', 'PUG', 'VIX', 'LER', 'DON', 'KAP', 'MEZ',
    'SUT', 'FAL', 'GIB', 'YON', 'TOR', 'PEX', 'CHUD', 'VAM', 'REZ', 'KIL',
  ],
  LIST_B: [
    'PAR', 'KID', 'VOS', 'TEM', 'ZUL', 'BOK', 'FEL', 'NAR', 'GIP', 'LUD',
    'CHEP', 'RAZ', 'MIK', 'TOL', 'JUB', 'VAS', 'KEM', 'DOR', 'PEL', 'ZIN',
    'MAF', 'LUK', 'SEN', 'GOT', 'PIR', 'CHUB', 'VAK', 'REZ', 'TUM', 'JOL',
    'BIZ', 'NAD', 'KOR', 'PEL', 'VUF', 'LAN', 'MOK', 'ZET', 'DAR', 'SIP',
    'FUB', 'TER', 'GAL', 'YOK', 'PID', 'CHAS', 'ROK', 'VEM', 'NUL', 'KAZ',
  ],
};

/**
 * Compara mediciones experimentales con el modelo analítico de Peutz,
 * calculando el error absoluto, error relativo y Root Mean Square Error (RMSE).
 * 
 * @param {Array<{ distance: number, alconsExp: number }>} expMeasurements - Puntos medidos
 * @param {number} RT60 - Tiempo de reverberación (s)
 * @param {number} volume - Volumen del recinto (m³)
 * @param {number} Q - Directividad
 * @param {number} a - Corrección del oyente
 * @param {number} R - Constante de sala (m²)
 * @returns {Object} Tabla de comparación y métricas estadísticas de error
 */
export function compareExperimentalVsAnalytical(
  expMeasurements = [],
  RT60,
  volume,
  Q = 2,
  a = PEUTZ_DEFAULT_LISTENER_CORRECTION,
  R = null
) {
  if (!expMeasurements || expMeasurements.length === 0) {
    return { rows: [], rmse: 0, meanAbsError: 0, count: 0 };
  }

  let sumSqErr = 0;
  let sumAbsErr = 0;

  const rows = expMeasurements.map((m, idx) => {
    const d = Number(m.distance) || 1.0;
    const expVal = Number(m.alconsExp);
    const analytical = calculatePeutzAlcons(d, RT60, volume, Q, a, R);
    const theoVal = analytical.alcons;

    const absError = Number(Math.abs(expVal - theoVal).toFixed(2));
    const relErrorPercent = theoVal > 0 ? Number(((absError / theoVal) * 100).toFixed(1)) : 0;
    const residual = Number((expVal - theoVal).toFixed(2));

    sumSqErr += absError * absError;
    sumAbsErr += absError;

    return {
      id: idx + 1,
      distance: d,
      dLabel: `${d} m`,
      alconsExp: expVal,
      alconsTheo: theoVal,
      stiExp: alconsToSti(expVal),
      stiTheo: alconsToSti(theoVal),
      ratingExp: getIntelligibilityRating(expVal).rating,
      ratingTheo: getIntelligibilityRating(theoVal).rating,
      residual, // exp - theo (positivo = medición peor que teoría)
      absError,
      relErrorPercent,
      isReverberantField: analytical.isReverberantField,
    };
  });

  const count = rows.length;
  const rmse = Number(Math.sqrt(sumSqErr / count).toFixed(2));
  const meanAbsError = Number((sumAbsErr / count).toFixed(2));

  return {
    rows,
    rmse,
    meanAbsError,
    count,
  };
}

/**
 * ==============================================================================
 * DATOS OFICIALES DEL EJEMPLO: UNIVERSIDAD DE SAN BUENAVENTURA MEDELLÍN
 * ==============================================================================
 * Sala de clase 3×4×2.5 m (V = 30 m³, Stot = 59 m², Q = 2)
 * Reproducción exacta del ejercicio de diapositivas USB Medellín.
 */
export const USB_MEDELLIN_EXAMPLE_DATA = {
  name: 'Aula de Clase — Universidad de San Buenaventura Medellín',
  dimensions: {
    length: 4.0, // Largo (m)
    width: 3.0,  // Ancho (m)
    height: 2.5, // Alto (m)
    volume: 30.0, // V = 30 m³
    totalSurfaceArea: 59.0, // Stot = 59 m²
  },
  source: {
    Q: 2, // Directividad semiesférica (voz humana orador frente a la clase)
    lw: 85, // dB
    name: 'Profesor / Orador en Tarima',
  },
  // Desglose exacto de superficies según la tabla de clase
  surfaces: [
    { name: 'Piso', material: 'Baldosa', area: 12.0, alpha2000: 0.02, absorption2000: 0.24 },
    { name: 'Cielo', material: 'Drywall 1/2"', area: 12.0, alpha2000: 0.04, absorption2000: 0.48 },
    { name: 'Puertas', material: 'Puerta de madera sólida', area: 2.0, alpha2000: 0.04, absorption2000: 0.08 },
    { name: 'Muro 1', material: 'Pared de ladrillo pintada', area: 8.5, alpha2000: 0.02, absorption2000: 0.17 },
    { name: 'Muro 2', material: 'Pared de ladrillo pintada', area: 5.5, alpha2000: 0.02, absorption2000: 0.11 },
    { name: 'Muro 3', material: 'Pared de ladrillo pintada', area: 10.0, alpha2000: 0.02, absorption2000: 0.20 },
    { name: 'Muro 4', material: 'Pared de ladrillo pintada', area: 7.5, alpha2000: 0.02, absorption2000: 0.15 },
    { name: 'Ventanas', material: 'Vidrio 3 mm', area: 1.5, alpha2000: 0.07, absorption2000: 0.11 },
  ],
  // Coeficientes exactos por banda de octava según la tabla de Excel de clase
  octaveAbsorption: {
    125: { Atot: 4.64, alphaMean: 0.08 },
    250: { Atot: 2.15, alphaMean: 0.04 },
    500: { Atot: 1.84, alphaMean: 0.03 },
    1000: { Atot: 1.61, alphaMean: 0.03 },
    2000: { Atot: 1.54, alphaMean: 0.03 }, // Banda clave
    4000: { Atot: 1.37, alphaMean: 0.02 },
  },
  // Constante de sala exacta a 2000 Hz: R = (59 · 0.0261) / (1 - 0.0261) = 1.58 m²
  roomConstant2000: 1.58,
  // Tiempo de reverberación Sabine a 2000 Hz: RT = (0.161 · 30) / 1.54 = 3.14 s
  RT60_untreated: 3.14,
  // Distancia crítica calculada: Dc = 0.141 · √(2 · 1.58) = 0.25 m
  Dc_untreated: 0.25,
  // Distancia límite: D_lim = 3.16 · 0.25 = 0.79 m
  DLim_untreated: 0.79,

  // Acondicionamiento acústico propuesto (Cielo raso fonoabsorbente de fibra mineral en los 12 m²):
  treatment: {
    description: 'Instalación de cielo raso acústico de fibra mineral fonoabsorbente (α2000 = 0.95 en los 12 m² del techo)',
    treatedCeilingMaterial: 'Cielo raso acústico de fibra mineral fonoabsorbente',
    treatedCeilingArea: 12.0,
    alpha2000_new: 0.95,
    Atot_treated_2000: 12.46, // 1.54 - 0.48 + 12*0.95 = 12.46 m²
    alphaMean_treated: 0.21,
    roomConstant_treated: 15.79, // (59 · 0.211) / (1 - 0.211) = 15.79 m²
    RT60_treated: 0.39, // (0.161 · 30) / 12.46 ≈ 0.39 s (óptimo para aulas ISO 3382 / DIN 18041)
    Dc_treated: 0.79,
    DLim_treated: 2.50,
  },

  // Datos experimentales medidos con dictado de logátomos (50 logátomos por posición)
  sampleExperimentalData: [
    { distance: 1.0, totalLogatomes: 50, correctLogatomes: 38, alconsExp: 24.0, notes: 'Fila 1 (1.0m)' },
    { distance: 2.0, totalLogatomes: 50, correctLogatomes: 36, alconsExp: 28.0, notes: 'Fila 2 (2.0m)' },
    { distance: 3.0, totalLogatomes: 50, correctLogatomes: 35, alconsExp: 30.0, notes: 'Fila 3 (3.0m)' },
    { distance: 4.0, totalLogatomes: 50, correctLogatomes: 35, alconsExp: 30.0, notes: 'Fondo sala (4.0m)' },
  ],
};
