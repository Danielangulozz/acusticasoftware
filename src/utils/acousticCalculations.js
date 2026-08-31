/**
 * ==============================================================================
 * MÓDULO DE CÁLCULOS ACÚSTICOS Y FÍSICA DE RECINTOS (Acústica de Recintos 2026)
 * ==============================================================================
 * 
 * Este archivo contiene todas las funciones matemáticas y modelos físicos
 * rigurosos para la simulación del campo sonoro en recintos cerrados.
 * 
 * Principios Físicos Implementados:
 * 1. Geometría ortogonal y cálculo de áreas individuales/totales.
 * 2. Absorción equivalente por bandas de octava y coeficiente medio de absorción.
 * 3. Modelos de tiempo de reverberación: Sabine, Norris-Eyring y Millington-Sette.
 * 4. Parámetros estadísticos del campo sonoro difuso (recorrido libre medio, cadencia de reflexiones).
 * 5. Propagación en campo libre, campo reverberado, distancia crítica y nivel de presión total.
 * 6. Atenuación atmosférica por absorción del aire (ISO 9613-1).
 */

// Bandas de frecuencia estándar de octava (Hz)
export const OCTAVE_BANDS = [125, 250, 500, 1000, 2000, 4000];

// Constantes Físicas Fundamentales
export const SPEED_OF_SOUND = 343.0; // Velocidad del sonido en aire a 20 °C [m/s]
export const AIR_DENSITY = 1.204;    // Densidad del aire a 20 °C y 1 atm [kg/m³]
export const I_0 = 1e-12;            // Intensidad acústica de referencia [W/m²]
export const W_0 = 1e-12;            // Potencia acústica de referencia [W]
export const P_0 = 2e-5;             // Presión acústica de referencia [Pa]

/**
 * Coeficientes típicos de absorción atmosférica del aire 'm' [m^-1]
 * a 20 °C y 50% de humedad relativa estándar.
 * Fuente: ISO 9613-1 / ANSI S1.26
 */
export const AIR_ABSORPTION_COEFFS = {
  125: 0.0001,
  250: 0.0003,
  500: 0.0007,
  1000: 0.0015,
  2000: 0.0035,
  4000: 0.0100,
};

/**
 * Identificadores y nombres en español de las 6 superficies del recinto
 */
export const ROOM_SURFACES = [
  { id: 'floor', name: 'Piso / Suelo', description: 'Superficie inferior (L × W)' },
  { id: 'ceiling', name: 'Techo / Plafón', description: 'Superficie superior (L × W)' },
  { id: 'wallNorth', name: 'Pared Frontal (Norte)', description: 'Frente al escenario/fuente (W × H)' },
  { id: 'wallSouth', name: 'Pared Posterior (Sur)', description: 'Fondo de la sala (W × H)' },
  { id: 'wallEast', name: 'Pared Lateral Derecha (Este)', description: 'Lateral derecho (L × H)' },
  { id: 'wallWest', name: 'Pared Lateral Izquierda (Oeste)', description: 'Lateral izquierdo (L × H)' },
];

/**
 * Directividades típicas de fuentes sonoras según su ubicación espacial (Q)
 */
export const DIRECTIVITY_PRESETS = [
  { value: 1, label: 'Q = 1 (Esférica / Centro del espacio)', desc: 'Radiación 4π estereorradianes (omnidireccional en espacio libre)' },
  { value: 2, label: 'Q = 2 (Semiesférica / Sobre piso o pared)', desc: 'Radiación 2π estereorradianes (1 plano reflectante)' },
  { value: 4, label: 'Q = 4 (Cuarto de esfera / En arista o borde)', desc: 'Radiación π estereorradianes (intersección de 2 planos reflectantes)' },
  { value: 8, label: 'Q = 8 (Octavo de esfera / En rincón o esquina)', desc: 'Radiación π/2 estereorradianes (intersección de 3 planos reflectantes)' },
];

// ==============================================================================
// 1. GEOMETRÍA DEL RECINTO
// ==============================================================================

/**
 * Calcula las propiedades geométricas de una sala paralelepipédica rectangular.
 * 
 * @param {number} length - Largo del recinto en metros (L)
 * @param {number} width  - Ancho del recinto en metros (W)
 * @param {number} height - Alto del recinto en metros (H)
 * @returns {Object} Geometría calculada (Volumen, Superficie Total y áreas individuales)
 */
export function calculateRoomGeometry(length, width, height) {
  const L = Math.max(0.1, Number(length) || 0);
  const W = Math.max(0.1, Number(width) || 0);
  const H = Math.max(0.1, Number(height) || 0);

  // Volumen: V = L · W · H [m³]
  const volume = L * W * H;

  // Áreas individuales de las 6 superficies [m²]
  const surfaceAreas = {
    floor: L * W,
    ceiling: L * W,
    wallNorth: W * H,
    wallSouth: W * H,
    wallEast: L * H,
    wallWest: L * H,
  };

  // Superficie total: S = 2(LW + LH + WH) [m²]
  const totalSurfaceArea = 2 * (L * W + L * H + W * H);

  // Recorrido libre medio estadístico: l = 4V / S [m]
  // Distancia promedio que recorre una onda sonora entre dos reflexiones consecutivas
  const meanFreePath = totalSurfaceArea > 0 ? (4 * volume) / totalSurfaceArea : 0;

  // Tiempo promedio entre reflexiones consecutivas: τ = l / c [s]
  const timeBetweenReflections = SPEED_OF_SOUND > 0 ? meanFreePath / SPEED_OF_SOUND : 0;

  // Número de reflexiones por segundo: N_sec = c / l [s^-1]
  const reflectionsPerSecond = meanFreePath > 0 ? SPEED_OF_SOUND / meanFreePath : 0;

  return {
    length: L,
    width: W,
    height: H,
    volume,
    surfaceAreas,
    totalSurfaceArea,
    meanFreePath,
    timeBetweenReflections,
    reflectionsPerSecond,
  };
}

// ==============================================================================
// 2. ABSORCIÓN ACÚSTICA EQUIVALENTE
// ==============================================================================

/**
 * Calcula la absorción equivalente A y el coeficiente medio de absorción ā por banda.
 * 
 * Ecuaciones:
 * A(f) = ∑ (S_i · α_i(f)) [m² Sabine o unidades de absorción métrica]
 * ā(f) = A(f) / S_total  [adimensional, 0 a 1]
 * 
 * @param {Object} surfaceAreas - Áreas individuales de cada superficie { floor, ceiling, ... }
 * @param {number} totalSurface - Superficie total del recinto (S)
 * @param {Object} materials - Configuración de coeficientes α por superficie y por banda
 * @returns {Object} Resultados de absorción por banda { [freq]: { A, alphaMean, absorptionBySurface } }
 */
export function calculateRoomAbsorption(surfaceAreas, totalSurface, materials) {
  const result = {};

  OCTAVE_BANDS.forEach((freq) => {
    let equivalentAbsorption = 0;
    const absorptionBySurface = {};

    ROOM_SURFACES.forEach(({ id }) => {
      const area = surfaceAreas[id] || 0;
      // Obtener el coeficiente de absorción para la superficie y frecuencia dada (entre 0 y 1)
      const rawCoeff = materials[id]?.coefficients?.[freq] ?? materials[id]?.[freq];
      const alpha = Math.min(0.9999, Math.max(0.0001, Number(rawCoeff) || 0.05));
      
      const surfaceAbs = area * alpha;
      absorptionBySurface[id] = surfaceAbs;
      equivalentAbsorption += surfaceAbs;
    });

    const alphaMean = totalSurface > 0 ? equivalentAbsorption / totalSurface : 0;

    result[freq] = {
      equivalentAbsorption,   // A = ∑ (S_i · α_i) [m² Sabine]
      alphaMean: Math.min(0.9999, alphaMean), // ā = A / S [adimensional]
      absorptionBySurface,    // Desglose por superficie [m² Sabine]
    };
  });

  return result;
}

// ==============================================================================
// 3. MODELOS DE TIEMPO DE REVERBERACIÓN (RT60)
// ==============================================================================

/**
 * Calcula el tiempo de reverberación RT60 (en segundos) según los tres modelos clásicos:
 * 
 * 1. SABINE (1898):
 *    - Air OFF: RT = (0.161 · V) / A
 *    - Air ON:  RT = (0.161 · V) / (A + 4mV)
 * 
 * 2. NORRIS-EYRING (1930):
 *    - Air OFF: RT = (0.161 · V) / (-S · ln(1 - ā))
 *    - Air ON:  RT = (0.161 · V) / (-S · ln(1 - ā) + 4mV)
 * 
 * 3. MILLINGTON-SETTE (1932):
 *    - Air OFF: RT = (0.161 · V) / (-∑[S_i · ln(1 - α_i)])
 *    - Air ON:  RT = (0.161 · V) / (-∑[S_i · ln(1 - α_i)] + 4mV)
 * 
 * @param {number} volume - Volumen del recinto V [m³]
 * @param {number} totalSurface - Superficie total S [m²]
 * @param {Object} surfaceAreas - Áreas individuales S_i [m²]
 * @param {Object} absorptionData - Datos de absorción calculados por calculateRoomAbsorption
 * @param {Object} materials - Coeficientes α por superficie
 * @param {boolean} includeAirAbsorption - Si se incluye la corrección 4mV de disipación en el aire
 * @returns {Object} Tiempos de reverberación por banda para cada modelo
 */
export function calculateReverberationTimes(
  volume,
  totalSurface,
  surfaceAreas,
  absorptionData,
  materials,
  includeAirAbsorption = true
) {
  const results = {};

  OCTAVE_BANDS.forEach((freq) => {
    const { equivalentAbsorption: A, alphaMean } = absorptionData[freq];
    const m = includeAirAbsorption ? (AIR_ABSORPTION_COEFFS[freq] || 0) : 0;
    const airDissipationTerm = 4 * m * volume; // 4mV [m²]

    // -------------------------------------------------------------
    // 1. Modelo de Sabine
    // RT_sab = 0.161 · V / (A + 4mV)
    // -------------------------------------------------------------
    const denomSabine = A + airDissipationTerm;
    const rtSabine = denomSabine > 0 ? (0.161 * volume) / denomSabine : 0;

    // -------------------------------------------------------------
    // 2. Modelo de Norris-Eyring
    // RT_eyr = 0.161 · V / (-S · ln(1 - ā) + 4mV)
    // -------------------------------------------------------------
    const safeAlphaMean = Math.min(0.9999, Math.max(0.0001, alphaMean));
    const eyringAbsorptionTerm = -totalSurface * Math.log(1 - safeAlphaMean);
    const denomEyring = eyringAbsorptionTerm + airDissipationTerm;
    const rtEyring = denomEyring > 0 ? (0.161 * volume) / denomEyring : 0;

    // -------------------------------------------------------------
    // 3. Modelo de Millington-Sette
    // RT_mil = 0.161 · V / (-∑ [S_i · ln(1 - α_i)] + 4mV)
    // -------------------------------------------------------------
    let millingtonAbsorptionTerm = 0;
    ROOM_SURFACES.forEach(({ id }) => {
      const area = surfaceAreas[id] || 0;
      const rawCoeff = materials[id]?.coefficients?.[freq] ?? materials[id]?.[freq];
      const alpha = Math.min(0.9999, Math.max(0.0001, Number(rawCoeff) || 0.05));
      millingtonAbsorptionTerm += -area * Math.log(1 - alpha);
    });

    const denomMillington = millingtonAbsorptionTerm + airDissipationTerm;
    const rtMillington = denomMillington > 0 ? (0.161 * volume) / denomMillington : 0;

    // Recorrido libre medio l = 4V/S y reflexiones durante el tiempo de reverberación
    const meanFreePath = totalSurface > 0 ? (4 * volume) / totalSurface : 0;
    const reflectionsSabine = meanFreePath > 0 ? (SPEED_OF_SOUND * rtSabine) / meanFreePath : 0;
    const reflectionsEyring = meanFreePath > 0 ? (SPEED_OF_SOUND * rtEyring) / meanFreePath : 0;
    const reflectionsMillington = meanFreePath > 0 ? (SPEED_OF_SOUND * rtMillington) / meanFreePath : 0;

    results[freq] = {
      sabine: Math.max(0.01, rtSabine),
      eyring: Math.max(0.01, rtEyring),
      millington: Math.max(0.01, rtMillington),
      airDissipationTerm,
      reflectionsSabine,
      reflectionsEyring,
      reflectionsMillington,
    };
  });

  return results;
}

// ==============================================================================
// 4. POTENCIA ACÚSTICA, CONSTANTE DE SALA Y CAMPO SONORO
// ==============================================================================

/**
 * Convierte Nivel de Potencia Acústica Lw (dB) a Potencia Acústica W (Watts).
 * W = W_0 · 10^(Lw / 10) = 10^((Lw - 120) / 10)
 */
export function lwToPowerWatts(lw) {
  const safeLw = Number(lw) || 0;
  return W_0 * Math.pow(10, safeLw / 10);
}

/**
 * Convierte Potencia Acústica W (Watts) a Nivel de Potencia Acústica Lw (dB).
 * Lw = 10 · log10(W / W_0) = 120 + 10 · log10(W)
 */
export function powerWattsToLw(watts) {
  const safeW = Math.max(1e-12, Number(watts) || 1e-12);
  return 10 * Math.log10(safeW / W_0);
}

/**
 * Calcula la Constante de Sala R [m²] para una banda de frecuencia dada.
 * R = A / (1 - ā)
 * 
 * La constante de sala representa la capacidad de absorción del recinto ajustada
 * por la fracción de energía no absorbida en cada impacto.
 * 
 * @param {number} A - Absorción equivalente [m² Sabine]
 * @param {number} alphaMean - Coeficiente de absorción medio ā
 * @returns {number} Constante de sala R [m²]
 */
export function calculateRoomConstant(A, alphaMean) {
  const safeAlpha = Math.min(0.9999, Math.max(0.0001, alphaMean));
  const denominator = 1 - safeAlpha;
  return denominator > 0 ? A / denominator : A * 10000;
}

/**
 * Calcula la Distancia Crítica Dc [m] (donde la energía de campo directo iguala a la de campo reverberado).
 * 
 * Fórmula:
 * Dc = 0.057 · √(Q · R)
 * 
 * @param {number} directivity - Factor de directividad de la fuente Q (1, 2, 4, 8)
 * @param {number} roomConstant - Constante de sala R [m²]
 * @returns {number} Distancia crítica Dc [m]
 */
export function calculateCriticalDistance(directivity, roomConstant) {
  const Q = Math.max(1, Number(directivity) || 1);
  const R = Math.max(0.01, Number(roomConstant) || 0.01);
  return 0.057 * Math.sqrt(Q * R);
}

/**
 * Calcula la Intensidad Acústica y Niveles de Presión Sonora en un punto a distancia r.
 * 
 * Fórmulas Físicas:
 * 1. Campo Directo (Free Field):
 *    I_f = (W · Q) / (4 · π · r²)  [W/m²]
 *    L_I,f = Lw + 10 · log10( Q / (4 · π · r²) ) [dB]
 * 
 * 2. Campo Reverberado (Diffuse Field):
 *    I_r = (4 · W) / R  [W/m²]
 *    L_I,r = Lw + 10 · log10( 4 / R ) [dB]
 * 
 * 3. Nivel de Presión Sonora Total Lp:
 *    Lp(r) = Lw + 10 · log10( (Q / (4 · π · r²)) + (4 / R) ) - m_dB · r
 *    Donde a distancia r = Dc, el campo directo es igual al campo reverberado y Lp(Dc) = Lp,rev + 3 dB.
 * 
 * @param {number} lw - Nivel de potencia de la fuente Lw [dB]
 * @param {number} directivity - Directividad Q (1, 2, 4, 8)
 * @param {number} roomConstant - Constante de sala R [m²]
 * @param {number} distance - Distancia fuente-receptor r [m]
 * @param {number} airAbsorptionCoeff - Coeficiente m [m^-1]
 * @returns {Object} Métricas completas de campo sonoro en el receptor
 */
export function calculateSoundFieldAtDistance(
  lw,
  directivity,
  roomConstant,
  distance,
  airAbsorptionCoeff = 0
) {
  const Lw = Number(lw) || 90;
  const Q = Math.max(1, Number(directivity) || 1);
  const R = Math.max(0.01, Number(roomConstant) || 0.01);
  const r = Math.max(0.1, Number(distance) || 1.0);
  const W = lwToPowerWatts(Lw);

  // Término de campo directo: Q / (4πr²)
  const directGeomTerm = Q / (4 * Math.PI * r * r);
  const directIntensity = (W * Q) / (4 * Math.PI * r * r); // I_f [W/m²]
  const directIntensityLevel = Lw + 10 * Math.log10(Math.max(1e-12, directGeomTerm));

  // Término de campo reverberado: 4 / R
  const revGeomTerm = 4 / R;
  const revIntensity = (4 * W) / R; // I_r [W/m²]
  const revIntensityLevel = Lw + 10 * Math.log10(Math.max(1e-12, revGeomTerm));

  // Nivel de Presión Sonora Total sin corrección de aire
  const totalGeomTerm = directGeomTerm + revGeomTerm;
  const lpTotalIdeal = Lw + 10 * Math.log10(Math.max(1e-12, totalGeomTerm));

  // Atenuación atmosférica adicional: ΔL_air = (m · r) · 4.343 dB/m o m_dB · r
  // m está en [m^-1] de intensidad, equivalente a ~ 4.3429 * m [dB/m]
  const airAttenuationDb = 4.342945 * (airAbsorptionCoeff || 0) * r;
  const lpTotalWithAir = Math.max(0, lpTotalIdeal - airAttenuationDb);

  // Relación Directo/Reverberado (DRR en dB)
  // DRR = 10 · log10( I_f / I_r ) = 10 · log10( (Q · R) / (16 · π · r²) )
  const drrDb = directIntensityLevel - revIntensityLevel;

  // Distancia Crítica para este R y Q
  const criticalDistance = calculateCriticalDistance(Q, R);

  return {
    powerWatts: W,
    directIntensity,
    directIntensityLevel,
    revIntensity,
    revIntensityLevel,
    lpTotalIdeal,
    lpTotalWithAir,
    airAttenuationDb,
    drrDb,
    criticalDistance,
    distance: r,
    directGeomTerm,
    revGeomTerm,
  };
}

// ==============================================================================
// 5. GENERACIÓN DE CURVAS PARA GRÁFICAS INTERACTIVAS
// ==============================================================================

/**
 * Genera la serie de datos para la curva Lp vs Distancia (r) en una banda dada.
 * 
 * Muestra:
 * - Nivel de Presión Total Lp(r)
 * - Nivel de Campo Directo Lp,dir(r) (asíntota -6 dB/dd)
 * - Nivel de Campo Reverberado Lp,rev (asíntota constante)
 * - Marcador de Distancia Crítica Dc
 * 
 * @param {number} lw - Nivel de potencia acústica Lw [dB]
 * @param {number} directivity - Factor Q
 * @param {number} roomConstant - Constante de sala R [m²]
 * @param {number} maxDistance - Distancia máxima para graficar (ej: diagonal de la sala)
 * @param {number} airAbsorptionCoeff - Coeficiente m [m^-1]
 * @param {number} steps - Número de puntos a interpolar
 * @returns {Array<Object>} Arreglo con datos para Recharts
 */
export function generateDistanceCurveData(
  lw,
  directivity,
  roomConstant,
  maxDistance = 25,
  airAbsorptionCoeff = 0.0015,
  steps = 60
) {
  const Q = Math.max(1, Number(directivity) || 1);
  const R = Math.max(0.01, Number(roomConstant) || 0.01);
  const maxR = Math.max(5, Number(maxDistance) || 25);
  const criticalDist = calculateCriticalDistance(Q, R);

  const points = [];
  const rMin = 0.2;
  const rMax = maxR * 1.1;

  // Distribución logarítmica/geométrica de puntos para mayor detalle cerca de la fuente
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Interpolación no lineal para poblar más puntos cerca de la fuente
    const r = Number((rMin * Math.pow(rMax / rMin, t)).toFixed(2));
    
    const field = calculateSoundFieldAtDistance(lw, Q, R, r, airAbsorptionCoeff);

    points.push({
      distance: r,
      lpTotal: Number(field.lpTotalWithAir.toFixed(2)),
      lpDirect: Number(field.directIntensityLevel.toFixed(2)),
      lpReverberant: Number(field.revIntensityLevel.toFixed(2)),
      drr: Number(field.drrDb.toFixed(2)),
      isCritical: Math.abs(r - criticalDist) < 0.25,
    });
  }

  // Asegurar que la distancia crítica exacta esté incluida como punto
  const dcField = calculateSoundFieldAtDistance(lw, Q, R, criticalDist, airAbsorptionCoeff);
  const dcPoint = {
    distance: Number(criticalDist.toFixed(2)),
    lpTotal: Number(dcField.lpTotalWithAir.toFixed(2)),
    lpDirect: Number(dcField.directIntensityLevel.toFixed(2)),
    lpReverberant: Number(dcField.revIntensityLevel.toFixed(2)),
    drr: 0.0,
    isCritical: true,
  };

  points.push(dcPoint);
  points.sort((a, b) => a.distance - b.distance);

  return {
    curveData: points,
    criticalDistance: Number(criticalDist.toFixed(2)),
    revLevel: Number(dcField.revIntensityLevel.toFixed(2)),
  };
}

/**
 * Calcula el Tiempo de Reverberación Óptimo sugerido según el volumen y el uso del recinto.
 * Referencias: DIN 18041, ISO 3382, Beranek.
 * 
 * @param {number} volume - Volumen del recinto en m³
 * @param {string} roomType - Tipo de recinto ('speech', 'music', 'multipurpose', 'studio')
 * @returns {Object} { min, opt, max } en segundos para frecuencias medias (500-1000 Hz)
 */
export function getOptimumReverberationTime(volume, roomType = 'speech') {
  const V = Math.max(10, Number(volume) || 100);
  const logV = Math.log10(V);

  let opt = 0.6;
  let tolerance = 0.15;

  switch (roomType) {
    case 'speech': // Aulas, conferencias, auditorios de palabra
      opt = Math.max(0.4, 0.32 * logV - 0.17);
      tolerance = 0.12;
      break;
    case 'music': // Salas de concierto, auditorios musicales
      opt = Math.max(0.8, 0.55 * logV - 0.10);
      tolerance = 0.20;
      break;
    case 'studio': // Estudios de grabación / Control rooms
      opt = Math.max(0.2, 0.25 * Math.pow(V / 100, 1 / 3));
      tolerance = 0.08;
      break;
    case 'multipurpose': // Polivalente / Teatro
    default:
      opt = Math.max(0.5, 0.45 * logV - 0.05);
      tolerance = 0.15;
      break;
  }

  return {
    optimal: Number(opt.toFixed(2)),
    min: Number(Math.max(0.1, opt * (1 - tolerance)).toFixed(2)),
    max: Number((opt * (1 + tolerance)).toFixed(2)),
  };
}
