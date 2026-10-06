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
 * Genera una cuadrícula uniforme de puntos de medición in situ dentro del recinto,
 * respetando una separación mínima a las paredes (margen >= 0.7 m), paso de 1.5 m,
 * e incorporando las 4 esquinas críticas y la fuente acústica al centro.
 * 
 * @param {number} Lx - Longitud en X (m)
 * @param {number} Ly - Longitud en Y (m)
 * @param {number} step - Paso de cuadrícula (m, por defecto 1.5 m)
 * @param {number} margin - Margen mínimo a las paredes (m, por defecto 0.7 m)
 * @param {number} heightZ - Altura del receptor (m, por defecto 1.2 m)
 */
export function generateMeasurementGrid(Lx, Ly, step = 1.5, margin = 0.7, heightZ = 1.2) {
  const xMax = Math.max(0.1, Number(Lx) || 5.0);
  const yMax = Math.max(0.1, Number(Ly) || 5.0);
  const m = Math.min(margin, Math.min(xMax, yMax) / 3);
  const s = Math.max(0.5, Number(step) || 1.5);
  const z = Number(heightZ) || 1.2;

  const points = [];
  const pointKeySet = new Set();

  const addPoint = (x, y, isCorner = false, customLabel = null) => {
    const rx = Number(Math.max(0, Math.min(xMax, x)).toFixed(2));
    const ry = Number(Math.max(0, Math.min(yMax, y)).toFixed(2));
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
      spl: {}, // Mapa de frecuencia central -> valor en dB
    });
  };

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

  // 3. Fuente acústica omnidireccional ubicada al centro
  const source = {
    x: Number((xMax / 2).toFixed(2)),
    y: Number((yMax / 2).toFixed(2)),
    z: 1.2,
    label: 'Fuente S0'
  };

  return {
    points,
    source,
    numPoints: points.length,
    Lx: xMax,
    Ly: yMax,
    step: s,
    margin: m,
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
  c = 343
) {
  const lx = Math.max(0.1, Number(Lx) || 10);
  const ly = Math.max(0.1, Number(Ly) || 6);

  return points.map(p => {
    const spl = {};
    bands.forEach(b => {
      const kx = Math.max(1, Math.round((2 * b * lx) / c));
      const ky = Math.max(1, Math.round((2 * b * ly) / c));

      // Patrón de onda estacionaria 2D
      const waveX = Math.cos((kx * Math.PI * p.x) / lx);
      const waveY = Math.cos((ky * Math.PI * p.y) / ly);
      const modalShape = 0.5 * (Math.abs(waveX) + Math.abs(waveY));

      const cornerBonus = p.isCorner ? 6.5 : 0;
      const variation = Math.sin(p.x * 2.3 + p.y * 1.7 + b * 0.1) * 1.2;
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
export function interpolateIdw2D(knownPoints, Lx, Ly, gridResolution = 40, power = 2) {
  const validPoints = (knownPoints || []).filter(p => !isNaN(p.value) && p.value !== null);
  if (validPoints.length === 0) return null;

  const nx = gridResolution;
  const ny = Math.max(5, Math.round(gridResolution * (Ly / Lx)));
  const dx = Lx / (nx - 1);
  const dy = Ly / (ny - 1);

  const grid = new Float32Array(nx * ny);
  let minVal = Infinity, maxVal = -Infinity;

  for (let iy = 0; iy < ny; iy++) {
    const y = iy * dy;
    for (let ix = 0; ix < nx; ix++) {
      const x = ix * dx;

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
