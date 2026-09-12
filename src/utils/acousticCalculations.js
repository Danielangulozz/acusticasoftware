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
 * Identificadores y nombres en español de las 6 superficies del recinto (Compatibilidad legacy)
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
 * Genera la lista dinámica de superficies para un polígono de N vértices.
 * Produce: floor, ceiling, wall_0, wall_1, ..., wall_{N-1}
 *
 * @param {Array<{x: number, y: number}>} vertices - Vértices del polígono en metros
 * @param {number} height - Altura de extrusión H [m]
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function generateRoomSurfaces(vertices, height) {
  const n = vertices.length;
  const surfaces = [
    { id: 'floor', name: 'Piso / Suelo', description: `Polígono de ${n} lados` },
    { id: 'ceiling', name: 'Techo / Plafón', description: `Polígono de ${n} lados` },
  ];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = vertices[j].x - vertices[i].x;
    const dy = vertices[j].y - vertices[i].y;
    const wallLen = Math.sqrt(dx * dx + dy * dy);
    surfaces.push({
      id: `wall_${i}`,
      name: `Pared ${i + 1} (${wallLen.toFixed(1)}m)`,
      description: `${wallLen.toFixed(2)}m × ${height.toFixed(1)}m`,
      wallLength: wallLen,
    });
  }
  return surfaces;
}

// ==============================================================================
// GEOMETRÍA DE POLÍGONO LIBRE (PLANTA IRREGULAR)
// ==============================================================================

/**
 * Calcula el área de un polígono simple usando la fórmula del Shoelace (Gauss).
 * @param {Array<{x: number, y: number}>} vertices
 * @returns {number} Área absoluta en m²
 */
export function polygonArea(vertices) {
  const n = vertices.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Calcula el centroide (centro de masa geométrico) de un polígono simple.
 * @param {Array<{x: number, y: number}>} vertices
 * @returns {{x: number, y: number}}
 */
export function polygonCentroid(vertices) {
  const n = vertices.length;
  let cx = 0, cy = 0, signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    signedArea += cross;
    cx += (vertices[i].x + vertices[j].x) * cross;
    cy += (vertices[i].y + vertices[j].y) * cross;
  }
  signedArea /= 2;
  if (Math.abs(signedArea) < 1e-10) {
    // Degenerate polygon fallback
    cx = vertices.reduce((s, v) => s + v.x, 0) / n;
    cy = vertices.reduce((s, v) => s + v.y, 0) / n;
    return { x: cx, y: cy };
  }
  cx /= (6 * signedArea);
  cy /= (6 * signedArea);
  return { x: cx, y: cy };
}

/**
 * Determina si los vértices de un polígono 2D están ordenados en sentido antihorario (CCW).
 * @param {Array<{x: number, y: number}>} vertices
 * @returns {boolean}
 */
export function isPolygonCCW(vertices) {
  if (!vertices || vertices.length < 3) return true;
  let signedArea = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    signedArea += (vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y);
  }
  return signedArea > 0;
}

/**
 * Genera puntos muestreados a lo largo de un arco de pared curva.
 * Flecha positiva (+bulge) arquea hacia el exterior del recinto (expansión),
 * y flecha negativa (-bulge) arquea hacia el interior (contracción).
 *
 * @param {{x: number, y: number}} v0 - Vértice inicial
 * @param {{x: number, y: number}} v1 - Vértice final
 * @param {number} bulge - Flecha / altura del arco en metros (positivo hacia afuera)
 * @param {number} steps - Número de subdivisiones
 * @param {boolean} isCCW - Si el polígono tiene orientación antihoraria
 * @returns {Array<{x: number, y: number}>} Puntos muestreados a lo largo del arco
 */
export function getEdgeArcPoints(v0, v1, bulge = 0, steps = 4, isCCW = true) {
  if (!v0 || !v1) return [];
  if (Math.abs(bulge) < 0.01) return [v0, v1];
  const dx = v1.x - v0.x;
  const dy = v1.y - v0.y;
  const chordLen = Math.hypot(dx, dy);
  if (chordLen < 0.01) return [v0, v1];

  // Para orientación antihoraria (CCW), la normal exterior (apuntando a la derecha de la marcha de la arista) es (dy/L, -dx/L)
  // Para orientación horaria (CW), es (-dy/L, dx/L)
  const sign = isCCW ? 1 : -1;
  const nx = (sign * dy) / chordLen;
  const ny = (-sign * dx) / chordLen;

  const pts = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const arcOffset = 4 * t * (1 - t) * bulge;
    pts.push({
      x: Number((v0.x + t * dx + nx * arcOffset).toFixed(4)),
      y: Number((v0.y + t * dy + ny * arcOffset).toFixed(4)),
    });
  }
  return pts;
}

/**
 * Calcula la geometría completa de una sala definida por un polígono libre extruido a altura H,
 * con soporte para aristas curvas (flecha de curvatura en metros).
 *
 * @param {Array<{x: number, y: number}>} vertices - Vértices del polígono de planta (en metros)
 * @param {number} height - Altura del recinto H [m]
 * @param {Object} curvatures - Diccionario opcional { [edgeIndex]: bulge } con flecha de arco en metros
 * @returns {Object} Geometría calculada con surfaceAreas dinámicas, surfacesList, etc.
 */
export function calculatePolygonGeometry(vertices, height, curvatures = {}) {
  const n = vertices.length;
  const H = Math.max(0.5, Number(height) || 3);

  // Área base del polígono plano (Gauss/Shoelace)
  let floorArea = polygonArea(vertices);

  // Perímetro y longitudes de aristas individuales (incluyendo arcos si hay curvatura)
  const wallLengths = [];
  let perimeter = 0;
  let curvedSegmentsAreaDelta = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = vertices[j].x - vertices[i].x;
    const dy = vertices[j].y - vertices[i].y;
    const chordLen = Math.hypot(dx, dy);
    
    // Curvatura / flecha del arco en metros (positivo = hacia afuera, negativo = hacia adentro)
    const bulge = Number(curvatures[i] || 0);
    let arcLen = chordLen;
    if (Math.abs(bulge) > 0.01 && chordLen > 0.1) {
      // Longitud de arco de círculo: L_arc ≈ c + (8 * h²) / (3 * c)
      arcLen = chordLen + (8 * bulge * bulge) / (3 * chordLen);
      // Área de segmento circular añadida o sustraída: A_seg ≈ (2/3) * c * h
      curvedSegmentsAreaDelta += (2 / 3) * chordLen * bulge;
    }

    wallLengths.push(arcLen);
    perimeter += arcLen;
  }

  // Área de planta ajustada por los segmentos circulares
  floorArea = Math.max(1.0, floorArea + curvedSegmentsAreaDelta);

  // Volumen = Área de planta × Altura
  const volume = floorArea * H;

  // Áreas individuales de cada superficie
  const surfaceAreas = {
    floor: floorArea,
    ceiling: floorArea,
  };
  const surfaceDimensionsLabels = {
    floor: `Planta base, ${floorArea.toFixed(1)} m²`,
    ceiling: `Plafón superior, ${floorArea.toFixed(1)} m²`,
  };

  for (let i = 0; i < n; i++) {
    const wallId = `wall_${i}`;
    const wallArea = wallLengths[i] * H;
    const bulge = Number(curvatures[i] || 0);
    surfaceAreas[wallId] = wallArea;
    surfaceDimensionsLabels[wallId] = Math.abs(bulge) > 0.01
      ? `${wallLengths[i].toFixed(2)}m (Arco h=${bulge > 0 ? '+' : ''}${bulge.toFixed(2)}m) × ${H.toFixed(1)}m`
      : `${wallLengths[i].toFixed(2)}m × ${H.toFixed(1)}m`;
  }

  // Superficie total
  const totalSurfaceArea = Object.values(surfaceAreas).reduce((sum, a) => sum + a, 0);

  // Recorrido libre medio: l = 4V / S
  const meanFreePath = totalSurfaceArea > 0 ? (4 * volume) / totalSurfaceArea : 0;
  const timeBetweenReflections = SPEED_OF_SOUND > 0 ? meanFreePath / SPEED_OF_SOUND : 0;
  const reflectionsPerSecond = meanFreePath > 0 ? SPEED_OF_SOUND / meanFreePath : 0;

  // Dimensiones de bounding box
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const bbWidth = maxX - minX;
  const bbLength = maxY - minY;

  // Lista dinámica de superficies
  const surfacesList = generateRoomSurfaces(vertices, H);

  // Centroide
  const centroid = polygonCentroid(vertices);

  return {
    shape: 'polygon',
    vertices,
    height: H,
    length: bbLength,
    width: bbWidth,
    volume,
    surfaceAreas,
    surfaceDimensionsLabels,
    totalSurfaceArea,
    meanFreePath,
    timeBetweenReflections,
    reflectionsPerSecond,
    wallLengths,
    perimeter,
    floorArea,
    surfacesList,
    centroid,
    boundingBox: { minX, maxX, minY, maxY, width: bbWidth, length: bbLength },
  };
}

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
// TIPOS Y FORMAS DE SALA PARAMÉTRICAS
// ==============================================================================

export const ROOM_SHAPES = {
  SHOEBOX: 'shoebox',
  TRAPEZOIDAL: 'trapezoidal',
  SLOPED: 'sloped',
};

export const ROOM_SHAPE_PRESETS = [
  {
    id: ROOM_SHAPES.SHOEBOX,
    name: 'Prisma Rectangular (Shoebox)',
    subtitle: 'Estándar',
    description: 'Sala paralelepípeda ortogonal clásica (aulas, oficinas, habitaciones).',
  },
  {
    id: ROOM_SHAPES.TRAPEZOIDAL,
    name: 'Sala Trapezoidal (En Abanico)',
    subtitle: 'Auditorios y Teatros',
    description: 'Paredes laterales en ángulo para evitar ecos flotantes y optimizar cobertura.',
  },
  {
    id: ROOM_SHAPES.SLOPED,
    name: 'Techo Inclinado (Shed / Sloped)',
    subtitle: 'Estudios de Grabación',
    description: 'Diferencial de altura piso-techo para romper modos axiales verticales.',
  },
];

// ==============================================================================
// 1. GEOMETRÍA DEL RECINTO
// ==============================================================================

/**
 * Calcula las propiedades geométricas de una sala paralelepipédica, trapezoidal o con techo inclinado.
 * 
 * @param {number|Object} lengthOrDimensions - Largo o bien objeto con dimensiones y tipo de forma
 * @param {number} [width]  - Ancho en metros
 * @param {number} [height] - Alto en metros
 * @returns {Object} Geometría calculada (Volumen, Superficie Total y áreas individuales)
 */
export function calculateRoomGeometry(lengthOrDimensions, width, height) {
  let L, W, H, shape, wFront, wBack, hFront, hBack;

  if (typeof lengthOrDimensions === 'object' && lengthOrDimensions !== null) {
    shape = lengthOrDimensions.shape || ROOM_SHAPES.SHOEBOX;
    L = Math.max(0.5, Number(lengthOrDimensions.length) || 10);
    wFront = Math.max(0.5, Number(lengthOrDimensions.widthFront ?? lengthOrDimensions.width) || 6);
    wBack = Math.max(0.5, Number(lengthOrDimensions.widthBack ?? lengthOrDimensions.width) || 6);
    W = (wFront + wBack) / 2;
    hFront = Math.max(0.5, Number(lengthOrDimensions.heightFront ?? lengthOrDimensions.height) || 3);
    hBack = Math.max(0.5, Number(lengthOrDimensions.heightBack ?? lengthOrDimensions.height) || 3);
    H = (hFront + hBack) / 2;
  } else {
    shape = ROOM_SHAPES.SHOEBOX;
    L = Math.max(0.5, Number(lengthOrDimensions) || 10);
    W = Math.max(0.5, Number(width) || 6);
    H = Math.max(0.5, Number(height) || 3);
    wFront = W;
    wBack = W;
    hFront = H;
    hBack = H;
  }

  let volume = 0;
  const surfaceAreas = {};
  const surfaceDimensionsLabels = {};

  if (shape === ROOM_SHAPES.TRAPEZOIDAL) {
    // Sala Trapezoidal / Abanico (Paredes laterales divergentes o convergentes)
    const avgW = (wFront + wBack) / 2;
    const floorCeilArea = avgW * L;
    surfaceAreas.floor = floorCeilArea;
    surfaceAreas.ceiling = floorCeilArea;
    surfaceDimensionsLabels.floor = `${L.toFixed(1)}m × [${wFront.toFixed(1)}m a ${wBack.toFixed(1)}m]`;
    surfaceDimensionsLabels.ceiling = `${L.toFixed(1)}m × [${wFront.toFixed(1)}m a ${wBack.toFixed(1)}m]`;

    // Pared Norte (Frontal)
    surfaceAreas.wallNorth = wFront * H;
    surfaceDimensionsLabels.wallNorth = `${wFront.toFixed(1)}m × ${H.toFixed(1)}m`;

    // Pared Sur (Posterior)
    surfaceAreas.wallSouth = wBack * H;
    surfaceDimensionsLabels.wallSouth = `${wBack.toFixed(1)}m × ${H.toFixed(1)}m`;

    // Paredes laterales inclinadas (Este y Oeste)
    const lateralDelta = Math.abs(wBack - wFront) / 2;
    const sideWallLength = Math.sqrt(L * L + lateralDelta * lateralDelta);
    const sideWallArea = sideWallLength * H;
    surfaceAreas.wallEast = sideWallArea;
    surfaceAreas.wallWest = sideWallArea;
    surfaceDimensionsLabels.wallEast = `${sideWallLength.toFixed(2)}m (inclinada) × ${H.toFixed(1)}m`;
    surfaceDimensionsLabels.wallWest = `${sideWallLength.toFixed(2)}m (inclinada) × ${H.toFixed(1)}m`;

    volume = avgW * L * H;
  } else if (shape === ROOM_SHAPES.SLOPED) {
    // Sala con Techo Inclinado (Shed / Sloped Ceiling)
    surfaceAreas.floor = L * W;
    surfaceDimensionsLabels.floor = `${L.toFixed(1)}m × ${W.toFixed(1)}m`;

    // Techo es un plano inclinado a lo largo de L
    const deltaH = Math.abs(hBack - hFront);
    const roofSlopeLength = Math.sqrt(L * L + deltaH * deltaH);
    surfaceAreas.ceiling = roofSlopeLength * W;
    surfaceDimensionsLabels.ceiling = `${roofSlopeLength.toFixed(2)}m (inclinado) × ${W.toFixed(1)}m`;

    // Pared Norte (Frontal)
    surfaceAreas.wallNorth = W * hFront;
    surfaceDimensionsLabels.wallNorth = `${W.toFixed(1)}m × ${hFront.toFixed(1)}m`;

    // Pared Sur (Posterior)
    surfaceAreas.wallSouth = W * hBack;
    surfaceDimensionsLabels.wallSouth = `${W.toFixed(1)}m × ${hBack.toFixed(1)}m`;

    // Paredes laterales (Este y Oeste)
    const sideArea = ((hFront + hBack) / 2) * L;
    surfaceAreas.wallEast = sideArea;
    surfaceAreas.wallWest = sideArea;
    surfaceDimensionsLabels.wallEast = `${L.toFixed(1)}m × [${hFront.toFixed(1)}m a ${hBack.toFixed(1)}m]`;
    surfaceDimensionsLabels.wallWest = `${L.toFixed(1)}m × [${hFront.toFixed(1)}m a ${hBack.toFixed(1)}m]`;

    volume = L * W * ((hFront + hBack) / 2);
  } else {
    // Prisma Rectangular (Shoebox clásico)
    volume = L * W * H;

    surfaceAreas.floor = L * W;
    surfaceAreas.ceiling = L * W;
    surfaceAreas.wallNorth = W * H;
    surfaceAreas.wallSouth = W * H;
    surfaceAreas.wallEast = L * H;
    surfaceAreas.wallWest = L * H;

    surfaceDimensionsLabels.floor = `${L.toFixed(1)}m × ${W.toFixed(1)}m`;
    surfaceDimensionsLabels.ceiling = `${L.toFixed(1)}m × ${W.toFixed(1)}m`;
    surfaceDimensionsLabels.wallNorth = `${W.toFixed(1)}m × ${H.toFixed(1)}m`;
    surfaceDimensionsLabels.wallSouth = `${W.toFixed(1)}m × ${H.toFixed(1)}m`;
    surfaceDimensionsLabels.wallEast = `${L.toFixed(1)}m × ${H.toFixed(1)}m`;
    surfaceDimensionsLabels.wallWest = `${L.toFixed(1)}m × ${H.toFixed(1)}m`;
  }

  // Superficie total: suma de las 6 superficies individuales
  const totalSurfaceArea = Object.values(surfaceAreas).reduce((sum, area) => sum + area, 0);

  // Recorrido libre medio estadístico: l = 4V / S [m]
  const meanFreePath = totalSurfaceArea > 0 ? (4 * volume) / totalSurfaceArea : 0;

  // Tiempo promedio entre reflexiones consecutivas: τ = l / c [s]
  const timeBetweenReflections = SPEED_OF_SOUND > 0 ? meanFreePath / SPEED_OF_SOUND : 0;

  // Número de reflexiones por segundo: N_sec = c / l [s^-1]
  const reflectionsPerSecond = meanFreePath > 0 ? SPEED_OF_SOUND / meanFreePath : 0;

  return {
    shape,
    length: L,
    width: W,
    height: H,
    widthFront: wFront,
    widthBack: wBack,
    heightFront: hFront,
    heightBack: hBack,
    volume,
    surfaceAreas,
    surfaceDimensionsLabels,
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
 * Calcula la absorción equivalente A y el coeficiente medio de absorción ā por banda,
 * considerando tanto el material base de cada superficie como sus sub-elementos (puertas, ventanas, paneles).
 * 
 * @param {Object} surfaceAreas - Áreas individuales de cada superficie { floor, ceiling, ... }
 * @param {number} totalSurface - Superficie total del recinto (S)
 * @param {Object} materials - Configuración de coeficientes α por superficie y sub-elementos
 * @returns {Object} Resultados de absorción por banda
 */
export function calculateRoomAbsorption(surfaceAreas, totalSurface, materials) {
  const result = {};
  // Iterar sobre las claves reales de surfaceAreas (funciona con 6 caras fijas o N dinámicas)
  const surfaceIds = Object.keys(surfaceAreas);

  OCTAVE_BANDS.forEach((freq) => {
    let equivalentAbsorption = 0;
    const absorptionBySurface = {};
    const effectiveAlphaBySurface = {};

    surfaceIds.forEach((id) => {
      const totalArea = surfaceAreas[id] || 0;
      const matConfig = materials[id] || {};
      const subElements = Array.isArray(matConfig.subElements) ? matConfig.subElements : [];

      // Área ocupada por sub-elementos
      const subAreaSum = subElements.reduce((acc, el) => acc + (Number(el.area) || 0), 0);
      const baseArea = Math.max(0, totalArea - subAreaSum);

      // Coeficiente y absorción del material base
      const rawBaseCoeff = matConfig?.coefficients?.[freq] ?? matConfig?.[freq];
      const alphaBase = Math.min(0.9999, Math.max(0.0001, Number(rawBaseCoeff) || 0.05));
      let surfaceAbs = baseArea * alphaBase;

      // Absorción de cada sub-elemento
      subElements.forEach((el) => {
        const elArea = Number(el.area) || 0;
        const elRawCoeff = el.coefficients?.[freq] ?? alphaBase;
        const elAlpha = Math.min(0.9999, Math.max(0.0001, Number(elRawCoeff) || 0.05));
        surfaceAbs += elArea * elAlpha;
      });

      absorptionBySurface[id] = surfaceAbs;
      effectiveAlphaBySurface[id] = totalArea > 0 ? surfaceAbs / totalArea : alphaBase;
      equivalentAbsorption += surfaceAbs;
    });

    const alphaMean = totalSurface > 0 ? equivalentAbsorption / totalSurface : 0;

    result[freq] = {
      equivalentAbsorption,
      alphaMean: Math.min(0.9999, alphaMean),
      absorptionBySurface,
      effectiveAlphaBySurface,
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
 *    - Air OFF: RT = (0.161 · V) / (-∑[S_k · ln(1 - α_k)])
 *    - Air ON:  RT = (0.161 · V) / (-∑[S_k · ln(1 - α_k)] + 4mV)
 * 
 * @param {number} volume - Volumen del recinto V [m³]
 * @param {number} totalSurface - Superficie total S [m²]
 * @param {Object} surfaceAreas - Áreas individuales S_i [m²]
 * @param {Object} absorptionData - Datos de absorción calculados por calculateRoomAbsorption
 * @param {Object} materials - Coeficientes α por superficie y sub-elementos
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
    // RT_mil = 0.161 · V / (-∑ [S_k · ln(1 - α_k)] + 4mV)
    // Desglosa tanto el material base como cada sub-elemento incrustado
    // -------------------------------------------------------------
    let millingtonAbsorptionTerm = 0;
    // Iterate over dynamic surface keys (works with both legacy 6-face and polygon N-face)
    Object.keys(surfaceAreas).forEach((id) => {
      const totalArea = surfaceAreas[id] || 0;
      const matConfig = materials[id] || {};
      const subElements = Array.isArray(matConfig.subElements) ? matConfig.subElements : [];

      const subAreaSum = subElements.reduce((acc, el) => acc + (Number(el.area) || 0), 0);
      const baseArea = Math.max(0, totalArea - subAreaSum);

      const rawBaseCoeff = matConfig?.coefficients?.[freq] ?? matConfig?.[freq];
      const alphaBase = Math.min(0.9999, Math.max(0.0001, Number(rawBaseCoeff) || 0.05));

      if (baseArea > 0) {
        millingtonAbsorptionTerm += -baseArea * Math.log(1 - alphaBase);
      }

      subElements.forEach((el) => {
        const elArea = Number(el.area) || 0;
        const elRawCoeff = el.coefficients?.[freq] ?? alphaBase;
        const elAlpha = Math.min(0.9999, Math.max(0.0001, Number(elRawCoeff) || 0.05));
        if (elArea > 0) {
          millingtonAbsorptionTerm += -elArea * Math.log(1 - elAlpha);
        }
      });
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
