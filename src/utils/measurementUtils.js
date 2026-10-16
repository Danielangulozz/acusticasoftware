/**
 * ==============================================================================
 * UTILIDADES DE MEDICIÓN IN SITU Y COMPARATIVA MODAL
 * ==============================================================================
 * Generación de cuadrícula de medición según normativas, importación de datos
 * experimentales (SPL, REW, FEM/COMSOL), emparejamiento con modos teóricos e interpolación espacial.
 */

import { THIRD_OCTAVE_BANDS } from './modalCalculations.js';
import { parseCsvText } from './csvUtils.js';

/**
 * Determina si un punto 2D (x, y) se encuentra estrictamente dentro de un polígono arbitrario.
 * Algoritmo estándar de Ray-Casting (Even-Odd rule).
 *
 * @param {{x: number, y: number}} point - Coordenadas del punto a evaluar
 * @param {Array<{x: number, y: number}>} vertices - Vértices ordenados del polígono
 * @returns {boolean} true si el punto está dentro del polígono
 */
export function isPointInPolygon(point, vertices) {
  if (!vertices || vertices.length < 3) return false;
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distancia euclidiana mínima de un punto P a un segmento de recta AB.
 */
export function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Distancia mínima de un punto (px, py) a todas las paredes perimetrales de un polígono.
 */
export function minDistanceToWalls(px, py, vertices) {
  if (!vertices || vertices.length < 3) return 2.0;
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const d = distPointToSegment(px, py, vertices[i].x, vertices[i].y, vertices[j].x, vertices[j].y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Centroide geométrico de un polígono 2D.
 */
export function calcCentroid(vertices) {
  if (!vertices || vertices.length === 0) return { x: 5, y: 3 };
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
  if (Math.abs(signedArea) < 1e-6) {
    return {
      x: vertices.reduce((s, v) => s + v.x, 0) / n,
      y: vertices.reduce((s, v) => s + v.y, 0) / n,
    };
  }
  return {
    x: cx / (6 * signedArea),
    y: cy / (6 * signedArea),
  };
}

/**
 * Genera una cuadrícula uniforme de puntos de medición in situ dentro del recinto,
 * respetando una separación mínima a las paredes (margen >= 0.7 m), paso de 1.5 m,
 * e incorporando las esquinas críticas y la fuente acústica al centro o centroide.
 *
 * Compatible tanto con recintos rectangulares (Lx, Ly) como con polígonos libres arbitrarios.
 * Garantiza estrictamente que TODOS los puntos generados estén DENTRO del contorno real de la sala.
 * 
 * @param {number} Lx - Longitud en X (m)
 * @param {number} Ly - Longitud en Y (m)
 * @param {number} step - Paso de cuadrícula (m, por defecto 1.5 m)
 * @param {number} margin - Margen mínimo a las paredes (m, por defecto 0.7 m)
 * @param {number} heightZ - Altura del receptor (m, por defecto 1.2 m)
 * @param {Array<{x: number, y: number}>|null} polygonVertices - Vértices de la sala si es poligonal
 */
export function generateMeasurementGrid(Lx, Ly, step = 1.5, margin = 0.7, heightZ = 1.2, polygonVertices = null) {
  const isPolygon = Boolean(polygonVertices && Array.isArray(polygonVertices) && polygonVertices.length >= 3);

  let xMin = 0, xMax = Math.max(0.1, Number(Lx) || 10.0), yMin = 0, yMax = Math.max(0.1, Number(Ly) || 6.0);
  if (isPolygon) {
    const xs = polygonVertices.map(v => v.x);
    const ys = polygonVertices.map(v => v.y);
    xMin = Math.min(...xs);
    xMax = Math.max(...xs);
    yMin = Math.min(...ys);
    yMax = Math.max(...ys);
  }

  const polyW = Math.max(0.1, xMax - xMin);
  const polyH = Math.max(0.1, yMax - yMin);
  const m = Math.min(margin, Math.min(polyW, polyH) / 3);
  const s = Math.max(0.5, Number(step) || 1.5);
  const z = Number(heightZ) || 1.2;

  const points = [];
  const pointKeySet = new Set();

  const addPoint = (x, y, isCorner = false, customLabel = null) => {
    const rx = Number(x.toFixed(2));
    const ry = Number(y.toFixed(2));
    const key = `${rx},${ry}`;
    if (pointKeySet.has(key)) return;
    pointKeySet.add(key);

    const id = points.length + 1;
    points.push({
      id,
      label: customLabel || (isCorner ? `E${id}` : `P${id}`),
      x: rx,
      y: ry,
      z,
      isCorner,
      spl: {},
    });
  };

  if (!isPolygon) {
    // 1. Las 4 esquinas de la sala (a distancia del margen m)
    addPoint(m, m, true, 'E1 (SO)');
    addPoint(xMax - m, m, true, 'E2 (SE)');
    addPoint(xMax - m, yMax - m, true, 'E3 (NE)');
    addPoint(m, yMax - m, true, 'E4 (NO)');

    // 2. Cuadrícula uniforme interior centrada
    const xSpan = (xMax - 2 * m);
    const ySpan = (yMax - 2 * m);
    const numStepsX = Math.max(1, Math.floor(xSpan / s));
    const numStepsY = Math.max(1, Math.floor(ySpan / s));

    const actualStepX = xSpan / numStepsX;
    const actualStepY = ySpan / numStepsY;

    for (let ix = 0; ix <= numStepsX; ix++) {
      const px = m + ix * actualStepX;
      for (let iy = 0; iy <= numStepsY; iy++) {
        const py = m + iy * actualStepY;
        addPoint(px, py, false);
      }
    }
  } else {
    // --- MODO RECINTO POLIGONAL ARQUITECTÓNICO ---
    const n = polygonVertices.length;
    const centroid = calcCentroid(polygonVertices);

    // 1. Esquinas en vértices convexos del polígono (con separación mínima y límite de hasta 6 esquinas)
    for (let i = 0; i < n; i++) {
      if (points.filter(p => p.isCorner).length >= 6) break;
      const vi = polygonVertices[i];
      const prev = polygonVertices[(i - 1 + n) % n];
      const next = polygonVertices[(i + 1) % n];

      const v1 = { x: prev.x - vi.x, y: prev.y - vi.y };
      const v2 = { x: next.x - vi.x, y: next.y - vi.y };
      const l1 = Math.hypot(v1.x, v1.y) || 1;
      const l2 = Math.hypot(v2.x, v2.y) || 1;
      const bisector = { x: (v1.x / l1) + (v2.x / l2), y: (v1.y / l1) + (v2.y / l2) };
      const bLen = Math.hypot(bisector.x, bisector.y);

      let cornerPt = null;
      if (bLen > 0.05) {
        const bNorm = { x: bisector.x / bLen, y: bisector.y / bLen };
        const cand = { x: vi.x + bNorm.x * m, y: vi.y + bNorm.y * m };
        if (isPointInPolygon(cand, polygonVertices) && minDistanceToWalls(cand.x, cand.y, polygonVertices) >= 0.25) {
          cornerPt = cand;
        }
      }

      if (!cornerPt) {
        const toC = { x: centroid.x - vi.x, y: centroid.y - vi.y };
        const dC = Math.hypot(toC.x, toC.y) || 1;
        const cand = { x: vi.x + (toC.x / dC) * m, y: vi.y + (toC.y / dC) * m };
        if (isPointInPolygon(cand, polygonVertices) && minDistanceToWalls(cand.x, cand.y, polygonVertices) >= 0.2) {
          cornerPt = cand;
        }
      }

      if (cornerPt) {
        // Evitar esquinas demasiado juntas entre sí (< 0.9 m)
        const tooClose = points.some(p => p.isCorner && Math.hypot(p.x - cornerPt.x, p.y - cornerPt.y) < 0.9);
        if (!tooClose) {
          addPoint(cornerPt.x, cornerPt.y, true, `E${points.length + 1} (V${i + 1})`);
        }
      }
    }

    // 2. Cuadrícula uniforme interior estrictamente dentro del recinto
    const minWallDist = Math.max(0.3, Math.min(m * 0.7, 0.6));
    for (let x = xMin + minWallDist; x <= xMax - minWallDist + 0.01; x += s) {
      for (let y = yMin + minWallDist; y <= yMax - minWallDist + 0.01; y += s) {
        if (isPointInPolygon({ x, y }, polygonVertices)) {
          if (minDistanceToWalls(x, y, polygonVertices) >= minWallDist) {
            // Evitar solapamiento con esquinas ya situadas (< s * 0.45)
            const tooCloseToCorner = points.some(p => p.isCorner && Math.hypot(p.x - x, p.y - y) < s * 0.45);
            if (!tooCloseToCorner) {
              addPoint(x, y, false);
            }
          }
        }
      }
    }

    // Si por geometría compleja quedaron pocos puntos (< 4), hacer un paso más fino
    if (points.length < 4) {
      const finerStep = s * 0.6;
      for (let x = xMin + 0.3; x <= xMax - 0.3 + 0.01; x += finerStep) {
        for (let y = yMin + 0.3; y <= yMax - 0.3 + 0.01; y += finerStep) {
          if (isPointInPolygon({ x, y }, polygonVertices)) {
            if (minDistanceToWalls(x, y, polygonVertices) >= 0.25) {
              addPoint(x, y, false);
            }
          }
        }
      }
    }
  }

  // 3. Fuente acústica omnidireccional ubicada al centroide
  let srcX = isPolygon ? calcCentroid(polygonVertices).x : xMax / 2;
  let srcY = isPolygon ? calcCentroid(polygonVertices).y : yMax / 2;

  if (isPolygon) {
    if (!isPointInPolygon({ x: srcX, y: srcY }, polygonVertices) || minDistanceToWalls(srcX, srcY, polygonVertices) < 0.3) {
      if (points.length > 0) {
        const centroid = calcCentroid(polygonVertices);
        let bestDist = Infinity;
        let bestP = points[0];
        for (const p of points) {
          const d = Math.hypot(p.x - centroid.x, p.y - centroid.y);
          if (d < bestDist) {
            bestDist = d;
            bestP = p;
          }
        }
        srcX = bestP.x;
        srcY = bestP.y;
      }
    }
  }

  const source = {
    x: Number(srcX.toFixed(2)),
    y: Number(srcY.toFixed(2)),
    z: 1.2,
    label: 'Fuente S0',
  };

  return {
    points,
    source,
    numPoints: points.length,
    Lx: polyW,
    Ly: polyH,
    minX: xMin,
    minY: yMin,
    maxX: xMax,
    maxY: yMax,
    step: s,
    margin: m,
    isPolygon,
    vertices: isPolygon ? polygonVertices : null,
  };
}

/**
 * Construye una plantilla CSV de ejemplo para importar mediciones de SPL in situ por punto
 * @param {Array} points - Lista de puntos generados
 * @param {Array<number>} bands - Bandas de frecuencia a incluir
 */
export function buildSplTemplateCsv(points = [], bands = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500]) {
  const headers = ['Punto', 'X (m)', 'Y (m)', 'Z (m)', 'Esquina', ...bands.map(b => `${b} Hz`)];
  const rows = [headers];

  points.forEach((p, idx) => {
    // Generar valores base simulados creíbles (~65-85 dB)
    const baseSpl = 75 - (idx % 5) * 2;
    const bandValues = bands.map((b, bIdx) => (baseSpl + ((bIdx * 3) % 7) - 3).toFixed(1));
    rows.push([
      p.label || `P${p.id}`,
      p.x.toFixed(2),
      p.y.toFixed(2),
      p.z.toFixed(2),
      p.isCorner ? 'SI' : 'NO',
      ...bandValues,
    ]);
  });

  return rows;
}

/**
 * Genera datos de SPL simulados físicamente creíbles para cada punto y banda de 1/3 de octava,
 * modelando antinodos de alta presión en esquinas/límites (80-88 dB) y nodos en zonas intermedias (64-76 dB).
 */
export function generateSimulatedSplData(
  points = [],
  bands = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500],
  Lx = 10,
  Ly = 6,
  Lz = 3,
  c = 343,
  bounds = null
) {
  const minX = bounds?.minX !== undefined ? bounds.minX : 0;
  const minY = bounds?.minY !== undefined ? bounds.minY : 0;
  const lx = bounds ? Math.max(0.1, bounds.maxX - bounds.minX) : Math.max(0.1, Number(Lx) || 10);
  const ly = bounds ? Math.max(0.1, bounds.maxY - bounds.minY) : Math.max(0.1, Number(Ly) || 6);

  return points.map(p => {
    const spl = {};
    const relX = p.x - minX;
    const relY = p.y - minY;
    bands.forEach(b => {
      const kx = Math.max(1, Math.round((2 * b * lx) / c));
      const ky = Math.max(1, Math.round((2 * b * ly) / c));

      // Patrón de onda estacionaria 2D
      const waveX = Math.cos((kx * Math.PI * relX) / lx);
      const waveY = Math.cos((ky * Math.PI * relY) / ly);
      const modalShape = 0.5 * (Math.abs(waveX) + Math.abs(waveY));

      const cornerBonus = p.isCorner ? 6.5 : 0;
      const variation = Math.sin(relX * 2.3 + relY * 1.7 + b * 0.1) * 1.2;
      const level = 68.0 + (modalShape * 11.5) + cornerBonus + variation;

      spl[b] = Number(Math.max(50, Math.min(95, level)).toFixed(1));
    });

    return {
      ...p,
      spl,
    };
  });
}

/**
 * Parsea un texto CSV con datos de medición de SPL por punto
 * @param {string} csvText
 * @returns {{ points: Array, bands: Array<number> }}
 */
export function parseSplCsv(csvText) {
  const rows = parseCsvText(csvText);
  if (!rows || rows.length < 2) {
    throw new Error('El archivo CSV no contiene suficientes filas.');
  }

  const header = rows[0].map(h => h.trim());
  const freqCols = [];

  // Detectar columnas de frecuencia (ej. "50 Hz", "50", "63 Hz")
  header.forEach((col, idx) => {
    const num = parseFloat(col.replace(/hz/i, '').replace(/,/g, '.').trim());
    if (!isNaN(num) && num > 0) {
      freqCols.push({ index: idx, freq: num });
    }
  });

  const parsedPoints = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || !row[0]) continue;

    const label = row[0];
    const x = parseFloat(row[1]?.replace(/,/g, '.')) || 0;
    const y = parseFloat(row[2]?.replace(/,/g, '.')) || 0;
    const z = parseFloat(row[3]?.replace(/,/g, '.')) || 1.2;
    const isCorner = /si|yes|true/i.test(row[4] || '');

    const spl = {};
    freqCols.forEach(({ index, freq }) => {
      const val = parseFloat(row[index]?.replace(/,/g, '.'));
      if (!isNaN(val)) spl[freq] = val;
    });

    parsedPoints.push({
      id: r,
      label,
      x,
      y,
      z,
      isCorner,
      spl,
    });
  }

  return {
    points: parsedPoints,
    bands: freqCols.map(f => f.freq),
  };
}

/**
 * Parsea una lista de frecuencias en texto plano (pegadas desde REW, COMSOL, o texto).
 * Tolera comentarios con %, # o //, separadores como comas, tabulaciones o saltos de línea.
 * @param {string} text
 * @returns {Array<number>} Lista ordenada de frecuencias válidas
 */
export function parseFrequencyList(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split(/\r\n|\n|\r/);
  const freqs = [];

  for (const line of lines) {
    let clean = line.trim();
    if (!clean) continue;
    // Omitir líneas de comentario
    if (clean.startsWith('%') || clean.startsWith('#') || clean.startsWith('//') || clean.startsWith('*')) {
      continue;
    }
    // Omitir encabezados típicos de texto
    if (/frecuencia|frequency|hz|mode|eigenfrequency/i.test(clean) && !/[0-9]/.test(clean)) {
      continue;
    }

    // Separar números por comas, espacios, punto y coma o tabulación
    const tokens = clean.split(/[,;\t\s]+/);
    for (const token of tokens) {
      if (!token) continue;
      const num = parseFloat(token.replace(/,/g, '.'));
      if (!isNaN(num) && num > 0 && num < 100000) {
        freqs.push(Number(num.toFixed(2)));
      }
    }
  }

  // Ordenar ascendente y eliminar duplicados exactos muy cercanos (< 0.01 Hz)
  freqs.sort((a, b) => a - b);
  return freqs;
}

export const parseSpectralPeaks = parseFrequencyList;

/**
 * Detecta picos espectrales locales en una serie de frecuencias y niveles SPL.
 * @param {Array<number>} freqs
 * @param {Array<number>} splValues
 * @param {number} minProminence - Prominencia mínima en dB sobre vecinos
 * @returns {Array<{ freq: number, spl: number }>}
 */
export function detectSpectralPeaks(freqs, splValues, minProminence = 2.0) {
  if (!freqs || !splValues || freqs.length !== splValues.length || freqs.length < 3) {
    return [];
  }

  const peaks = [];
  // Para datos continuos densos (como barridos de REW con paso < 1.5 Hz)
  const isDense = freqs.length > 25 && (freqs[freqs.length - 1] - freqs[0]) / freqs.length < 1.5;

  if (isDense) {
    const rawPeaks = [];
    for (let i = 2; i < freqs.length - 2; i++) {
      const current = splValues[i];
      const currentF = freqs[i];

      let isLocalMax = true;
      let leftMin = current;
      let rightMin = current;

      for (let j = i - 1; j >= 0 && currentF - freqs[j] <= 3.0; j--) {
        if (splValues[j] > current) {
          isLocalMax = false;
          break;
        }
        if (splValues[j] < leftMin) leftMin = splValues[j];
      }
      if (!isLocalMax) continue;

      for (let j = i + 1; j < freqs.length && freqs[j] - currentF <= 3.0; j++) {
        if (splValues[j] >= current) {
          isLocalMax = false;
          break;
        }
        if (splValues[j] < rightMin) rightMin = splValues[j];
      }
      if (!isLocalMax) continue;

      const prominence = current - Math.max(leftMin, rightMin);
      if (prominence >= minProminence) {
        rawPeaks.push({
          freq: Number(currentF.toFixed(1)),
          spl: Number(current.toFixed(1)),
          prominence: Number(prominence.toFixed(1)),
        });
      }
    }

    // Filtrar picos adyacentes en un margen de 2 Hz manteniendo el más alto
    for (const p of rawPeaks) {
      const existing = peaks.find(x => Math.abs(x.freq - p.freq) < 2.0);
      if (!existing) {
        peaks.push(p);
      } else if (p.spl > existing.spl) {
        existing.freq = p.freq;
        existing.spl = p.spl;
        existing.prominence = p.prominence;
      }
    }
  } else {
    // Algoritmo estándar para listas discretas de frecuencias (1/3 octava o puntos seleccionados)
    for (let i = 1; i < freqs.length - 1; i++) {
      const current = splValues[i];
      const prev = splValues[i - 1];
      const next = splValues[i + 1];

      if (current > prev && current > next) {
        const prominence = current - Math.max(prev, next);
        if (prominence >= minProminence) {
          peaks.push({
            freq: freqs[i],
            spl: Number(current.toFixed(1)),
            prominence: Number(prominence.toFixed(1))
          });
        }
      }
    }
  }

  return peaks;
}

/**
 * Empareja modos teóricos calculados con frecuencias experimentales o simuladas (REW / FEM).
 * Para cada modo teórico encuentra la frecuencia medida más cercana dentro de una tolerancia.
 * 
 * @param {Array<number>} measuredFreqs - Lista de frecuencias medidas/simuladas
 * @param {Array<object>} theoreticalModes - Lista de modos teóricos calculados
 * @param {number} toleranceHz - Tolerancia máxima en Hz para considerar emparejamiento (ej. 2.0 Hz)
 */
export function matchToTheoreticalModes(measuredFreqs = [], theoreticalModes = [], toleranceHz = 2.0) {
  if (!theoreticalModes || theoreticalModes.length === 0) return [];
  if (!measuredFreqs || measuredFreqs.length === 0) {
    return theoreticalModes.map(m => ({
      mode: m,
      theoreticalFreq: m.freq,
      measuredFreq: null,
      absError: null,
      relErrorPercent: null,
      matched: false,
    }));
  }

  const availableMeasured = [...measuredFreqs].sort((a, b) => a - b);
  const usedIndices = new Set();

  return theoreticalModes.map(m => {
    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < availableMeasured.length; i++) {
      if (usedIndices.has(i)) continue;
      const fMeas = availableMeasured[i];
      const diff = Math.abs(fMeas - m.freq);
      if (diff <= toleranceHz && diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    if (closestIndex !== -1) {
      usedIndices.add(closestIndex);
      const fMeas = availableMeasured[closestIndex];
      const absError = Number(minDiff.toFixed(2));
      const relErrorPercent = Number(((minDiff / m.freq) * 100).toFixed(2));

      return {
        mode: m,
        theoreticalFreq: m.freq,
        measuredFreq: fMeas,
        absError,
        relErrorPercent,
        matched: true,
      };
    }

    return {
      mode: m,
      theoreticalFreq: m.freq,
      measuredFreq: null,
      absError: null,
      relErrorPercent: null,
      matched: false,
    };
  });
}

/**
 * Interpolación espacial 2D por ponderación de distancia inversa (IDW - Inverse Distance Weighting).
 * Utilizada para reconstruir mapas de presión sonora (SPL) continuos a partir de la cuadrícula de puntos.
 * 
 * @param {Array<{ x: number, y: number, value: number }>} knownPoints - Puntos conocidos con su valor
 * @param {number} Lx - Ancho en X (m)
 * @param {number} Ly - Largo en Y (m)
 * @param {number} gridResolution - Número de celdas en el eje principal (ej. 40)
 * @param {number} power - Exponente de la distancia (típicamente p=2)
 */
export function interpolateIdw2D(knownPoints, Lx, Ly, gridResolution = 40, power = 2, bounds = null) {
  const validPoints = (knownPoints || []).filter(p => !isNaN(p.value) && p.value !== null);
  if (validPoints.length === 0) return null;

  const minX = bounds?.minX !== undefined ? bounds.minX : 0;
  const minY = bounds?.minY !== undefined ? bounds.minY : 0;
  const spanX = bounds ? Math.max(0.1, bounds.maxX - bounds.minX) : Math.max(0.1, Lx);
  const spanY = bounds ? Math.max(0.1, bounds.maxY - bounds.minY) : Math.max(0.1, Ly);

  const nx = gridResolution;
  const ny = Math.max(5, Math.round(gridResolution * (spanY / spanX)));
  const dx = spanX / (nx - 1);
  const dy = spanY / (ny - 1);

  const grid = new Float32Array(nx * ny);
  let minVal = Infinity, maxVal = -Infinity;

  for (let iy = 0; iy < ny; iy++) {
    const y = minY + iy * dy;
    for (let ix = 0; ix < nx; ix++) {
      const x = minX + ix * dx;

      let sumWeights = 0;
      let sumValues = 0;
      let exactMatch = null;

      for (const p of validPoints) {
        const distSq = (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y);
        if (distSq < 0.0001) {
          exactMatch = p.value;
          break;
        }
        const weight = 1 / Math.pow(distSq, power / 2);
        sumWeights += weight;
        sumValues += weight * p.value;
      }

      const val = exactMatch !== null ? exactMatch : (sumValues / sumWeights);
      grid[iy * nx + ix] = val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  }

  return {
    grid,
    nx,
    ny,
    dx,
    dy,
    minVal: Number(minVal.toFixed(1)),
    maxVal: Number(maxVal.toFixed(1)),
  };
}

/**
 * Parsea un archivo de texto exportado desde REW (Room EQ Wizard)
 * con formatos: "Freq(Hz) SPL(dB) [Phase(deg)]", CSV, TSV o punto y coma con decimales de coma.
 * @param {string} text
 * @returns {Array<{ freq: number, spl: number }>}
 */
export function parseRewMeasurementText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split(/\r\n|\n|\r/);
  const data = [];

  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    // Omitir encabezados y comentarios de REW (*, #, %, //)
    if (clean.startsWith('*') || clean.startsWith('#') || clean.startsWith('%') || clean.startsWith('//')) {
      continue;
    }
    // Omitir cabecera de texto si contiene palabras clave y no empieza por dígito
    if (/frequency|spl|phase|frecuencia|presion|fase|hz|db/i.test(clean) && !/^\s*\d/.test(clean)) {
      continue;
    }

    let parts = [];
    if (clean.includes('\t')) {
      parts = clean.split('\t').map(s => s.trim()).filter(Boolean);
    } else if (clean.includes(';')) {
      parts = clean.split(';').map(s => s.trim()).filter(Boolean);
    } else if (clean.includes(',') && !clean.includes(' ') && !clean.includes('\t')) {
      parts = clean.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      parts = clean.split(/\s+/).filter(Boolean);
    }

    if (parts.length >= 2) {
      const fStr = parts[0].replace(/,/g, '.');
      const sStr = parts[1].replace(/,/g, '.');
      const f = parseFloat(fStr);
      const s = parseFloat(sStr);
      if (!isNaN(f) && !isNaN(s) && f > 0 && f < 50000) {
        data.push({
          freq: Number(f.toFixed(2)),
          spl: Number(s.toFixed(1)),
        });
      }
    }
  }

  // Ordenar por frecuencia
  data.sort((a, b) => a.freq - b.freq);
  return data;
}

/**
 * Mapea una curva continua o densa de puntos (f, SPL) a bandas de 1/3 de octava ISO
 * promediando energéticamente los puntos que caen dentro de cada banda [fLow, fHigh]
 * con fallback al punto más cercano si la densidad es menor a 1/3 octava.
 */
export function mapCurveToThirdOctaveBands(curve = [], bands = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500]) {
  if (!curve || curve.length === 0) return {};
  const factor = Math.pow(2, 1 / 6);
  const result = {};

  bands.forEach(fc => {
    const fLow = fc / factor;
    const fHigh = fc * factor;

    const pointsInBand = curve.filter(p => p.freq >= fLow && p.freq < fHigh);
    if (pointsInBand.length > 0) {
      // Promedio acústico energético ISO: 10 * log10( (1/N) * sum(10^(SPL / 10)) )
      const energySum = pointsInBand.reduce((acc, p) => acc + Math.pow(10, p.spl / 10), 0);
      const avgSpl = 10 * Math.log10(energySum / pointsInBand.length);
      result[fc] = Number(avgSpl.toFixed(1));
    } else {
      // Buscar el punto medido más próximo a la frecuencia central
      let closest = curve[0];
      let minDiff = Math.abs(curve[0].freq - fc);
      for (const p of curve) {
        const diff = Math.abs(p.freq - fc);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      if (minDiff <= fc * 0.45) {
        result[fc] = Number(closest.spl.toFixed(1));
      }
    }
  });

  return result;
}

