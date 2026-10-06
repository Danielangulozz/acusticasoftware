/**
 * ==============================================================================
 * MÓDULO DE ACÚSTICA ONDULATORIA Y MODOS PROPIOS (Acústica de Salas 2026)
 * ==============================================================================
 * Funciones puras y rigurosas para el cálculo analítico de modos normales de vibración,
 * densidad modal, frecuencia de Schroeder, criterio de Bonello y distribución de presión.
 */

// Bandas normalizadas de 1/3 de octava ISO 266 (desde 20 Hz hasta 20 kHz)
export const THIRD_OCTAVE_BANDS = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

/**
 * Calcula los límites inferior y superior de una banda de 1/3 de octava
 * f_low = fc * 2^(-1/6), f_high = fc * 2^(+1/6)
 */
export function getBandLimits(fc) {
  const factor = Math.pow(2, 1 / 6);
  return {
    fc,
    fLow: fc / factor,
    fHigh: fc * factor,
  };
}

/**
 * Velocidad del sonido en función de la temperatura en grados Celsius (°C)
 * c = 331.3 * sqrt(1 + T / 273.15)
 */
export function speedOfSoundFromTemperature(tempC = 20) {
  const t = Number(tempC);
  if (isNaN(t)) return 343.0;
  return Number((331.3 * Math.sqrt(1 + t / 273.15)).toFixed(2));
}

/**
 * Obtiene las dimensiones rectangulares Lx, Ly, Lz a partir del polígono de la sala
 * y verifica si la planta es estrictamente rectangular ortogonal.
 */
export function getRectangularDims(roomPolygon, fallbackHeight = 3.0) {
  const vertices = roomPolygon?.vertices || [];
  const H = Math.max(0.1, Number(roomPolygon?.height || fallbackHeight || 3.0));

  if (!vertices || vertices.length < 3) {
    return {
      Lx: 10.0,
      Ly: 6.0,
      Lz: H,
      isRectangular: true,
      hasCurvatures: false,
    };
  }

  const xs = vertices.map(v => Number(v.x) || 0);
  const ys = vertices.map(v => Number(v.y) || 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const Lx = Math.max(0.1, Number((maxX - minX).toFixed(3)));
  const Ly = Math.max(0.1, Number((maxY - minY).toFixed(3)));
  const Lz = H;

  // Verificación de rectangularidad estricta (4 vértices ortogonales alineados a ejes sin arcos)
  const curvatures = roomPolygon?.curvatures || {};
  const hasCurvatures = Object.values(curvatures).some(b => Math.abs(Number(b) || 0) > 0.01);

  let isRectangular = vertices.length === 4 && !hasCurvatures;
  if (isRectangular) {
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const dx = Math.abs(vertices[j].x - vertices[i].x);
      const dy = Math.abs(vertices[j].y - vertices[i].y);
      // Cada lado debe ser o casi horizontal o casi vertical
      const isOrthogonal = (dx < 0.01 && dy > 0.01) || (dy < 0.01 && dx > 0.01);
      if (!isOrthogonal) {
        isRectangular = false;
        break;
      }
    }
  }

  return {
    Lx,
    Ly,
    Lz,
    isRectangular,
    hasCurvatures,
    boundingBox: { minX, maxX, minY, maxY, width: Lx, length: Ly },
  };
}

/**
 * Frecuencia modal para los índices (nx, ny, nz):
 * f = (c/2) * sqrt( (nx/Lx)^2 + (ny/Ly)^2 + (nz/Lz)^2 )
 */
export function modeFrequency(nx, ny, nz, Lx, Ly, Lz, c = 343.0) {
  const ix = Math.max(0, parseInt(nx, 10) || 0);
  const iy = Math.max(0, parseInt(ny, 10) || 0);
  const iz = Math.max(0, parseInt(nz, 10) || 0);

  const lx = Math.max(0.001, Number(Lx) || 1);
  const ly = Math.max(0.001, Number(Ly) || 1);
  const lz = Math.max(0.001, Number(Lz) || 1);
  const speed = Math.max(1, Number(c) || 343);

  const termX = (ix / lx) ** 2;
  const termY = (iy / ly) ** 2;
  const termZ = (iz / lz) ** 2;

  const f = (speed / 2) * Math.sqrt(termX + termY + termZ);
  return Number(f.toFixed(2));
}

/**
 * Clasifica un modo según la cantidad de índices distintos de cero:
 * - 1 índice != 0: Axial
 * - 2 índices != 0: Tangencial
 * - 3 índices != 0: Oblicuo
 */
export function classifyMode(nx, ny, nz) {
  const ix = Math.max(0, parseInt(nx, 10) || 0);
  const iy = Math.max(0, parseInt(ny, 10) || 0);
  const iz = Math.max(0, parseInt(nz, 10) || 0);

  const nonZeroCount = (ix > 0 ? 1 : 0) + (iy > 0 ? 1 : 0) + (iz > 0 ? 1 : 0);

  if (nonZeroCount === 1) {
    const axis = ix > 0 ? 'X' : iy > 0 ? 'Y' : 'Z';
    return {
      type: 'axial',
      axis,
      label: 'Axial',
      detail: `Axial (${axis})`,
      color: '#5833c7', // Morado POZOLE
      weight: 1.0,      // Mayor energía modal (+3 dB en relación a tangenciales)
    };
  }
  if (nonZeroCount === 2) {
    const plane = ix === 0 ? 'YZ' : iy === 0 ? 'XZ' : 'XY';
    return {
      type: 'tangential',
      plane,
      label: 'Tangencial',
      detail: `Tangencial (${plane})`,
      color: '#10b981', // Verde esmeralda
      weight: 0.5,
    };
  }
  if (nonZeroCount === 3) {
    return {
      type: 'oblique',
      label: 'Oblicuo',
      detail: 'Oblicuo (XYZ)',
      color: '#f59e0b', // Ámbar
      weight: 0.25,
    };
  }

  return {
    type: 'none',
    label: 'Fundamental Nulo (0,0,0)',
    detail: 'DC',
    color: '#86868b',
    weight: 0,
  };
}

/**
 * Componentes del vector de onda modal k = (kx, ky, kz) y magnitud k
 * kx = nx * pi / Lx, ky = ny * pi / Ly, kz = nz * pi / Lz [rad/m]
 */
export function waveVector(nx, ny, nz, Lx, Ly, Lz) {
  const ix = Math.max(0, parseInt(nx, 10) || 0);
  const iy = Math.max(0, parseInt(ny, 10) || 0);
  const iz = Math.max(0, parseInt(nz, 10) || 0);

  const lx = Math.max(0.001, Number(Lx) || 1);
  const ly = Math.max(0.001, Number(Ly) || 1);
  const lz = Math.max(0.001, Number(Lz) || 1);

  const kx = (ix * Math.PI) / lx;
  const ky = (iy * Math.PI) / ly;
  const kz = (iz * Math.PI) / lz;
  const k = Math.sqrt(kx * kx + ky * ky + kz * kz);

  return {
    kx,
    ky,
    kz,
    k,
  };
}

/**
 * Genera el conjunto completo de modos propios hasta nMax o fMax.
 * Excluye rigurosamente el modo estático trivial (0, 0, 0).
 */
export function computeModes({
  Lx = 10,
  Ly = 6,
  Lz = 3,
  c = 343.0,
  nMax = 4,
  fMax = null,
}) {
  const validNMax = Math.min(12, Math.max(1, parseInt(nMax, 10) || 4));
  const maxF = fMax !== null && !isNaN(fMax) && fMax > 0 ? Number(fMax) : null;
  const modes = [];

  for (let nx = 0; nx <= validNMax; nx++) {
    for (let ny = 0; ny <= validNMax; ny++) {
      for (let nz = 0; nz <= validNMax; nz++) {
        if (nx === 0 && ny === 0 && nz === 0) continue; // Excluir (0,0,0)

        const f = modeFrequency(nx, ny, nz, Lx, Ly, Lz, c);
        if (maxF !== null && f > maxF) continue;

        const classification = classifyMode(nx, ny, nz);
        const kVec = waveVector(nx, ny, nz, Lx, Ly, Lz);

        modes.push({
          id: `${nx}-${ny}-${nz}`,
          nx,
          ny,
          nz,
          freq: f,
          frequency: f,
          type: classification.type,
          axis: classification.axis,
          plane: classification.plane,
          label: classification.label,
          detail: classification.detail,
          color: classification.color,
          weight: classification.weight,
          kVector: kVec,
        });
      }
    }
  }

  // Ordenar de menor a mayor frecuencia
  modes.sort((a, b) => a.frequency - b.frequency);

  // Agregar índice secuencial 1..M
  return modes.map((m, idx) => ({
    ...m,
    index: idx + 1,
  }));
}

/**
 * Frecuencia de Schroeder:
 * Fórmula aproximada estándar de la práctica: fs ≈ 2000 * sqrt(T60 / V)
 * Fórmula teórica completa: fs_exact = sqrt(c^3 / (4 * ln(10))) * sqrt(T60 / V)
 */
export function schroederFrequency(T60, volume, c = 343.0) {
  const t = Math.max(0.01, Number(T60) || 1.0);
  const v = Math.max(0.1, Number(volume) || 27.0);
  const speed = Math.max(1, Number(c) || 343.0);

  // Fórmula empírica clásica (Schroeder 1954/1996)
  const approx = 2000 * Math.sqrt(t / v);

  // Fórmula analítica exacta
  const exactFactor = Math.sqrt((speed ** 3) / (4 * Math.LN10));
  const exact = exactFactor * Math.sqrt(t / v);

  const fsApprox = Number(approx.toFixed(1));
  const fsExact = Number(exact.toFixed(1));

  return {
    approx: fsApprox,
    exact: fsExact,
    fsApprox,
    fsExact,
    fs: fsApprox,
    exactFactor: Number(exactFactor.toFixed(1)),
    T60: Number(t.toFixed(2)),
    volume: Number(v.toFixed(1)),
  };
}

/**
 * Densidad modal acumulada teórica N(f) (fórmula asintótica de Weyl extendida):
 * N(f) = (4*pi/3)*V*(f/c)^3 + (pi/4)*S*(f/c)^2 + (1/8)*L*(f/c)
 */
export function modalDensityN(f, volume, totalSurface, totalPerimeter, c = 343.0) {
  const freq = Math.max(0, Number(f) || 0);
  const V = Math.max(0, Number(volume) || 0);
  const S = Math.max(0, Number(totalSurface) || 0);
  const L = Math.max(0, Number(totalPerimeter) || 0);
  const speed = Math.max(1, Number(c) || 343.0);

  const ratio = freq / speed;
  const termV = (4 * Math.PI / 3) * V * Math.pow(ratio, 3);
  const termS = (Math.PI / 4) * S * Math.pow(ratio, 2);
  const termL = (1 / 8) * L * ratio;

  return Number((termV + termS + termL).toFixed(2));
}

/**
 * Derivada analítica de la densidad modal dN/df (modos por Hz):
 * dN/df = (4*pi*V/c^3)*f^2 + (pi*S / (2*c^2))*f + L / (8*c)
 */
export function modalDensityDerivative(f, volume, totalSurface, totalPerimeter, c = 343.0) {
  const freq = Math.max(0, Number(f) || 0);
  const V = Math.max(0, Number(volume) || 0);
  const S = Math.max(0, Number(totalSurface) || 0);
  const L = Math.max(0, Number(totalPerimeter) || 0);
  const speed = Math.max(1, Number(c) || 343.0);

  const termV = (4 * Math.PI * V / Math.pow(speed, 3)) * (freq * freq);
  const termS = (Math.PI * S / (2 * Math.pow(speed, 2))) * freq;
  const termL = L / (8 * speed);

  return Number((termV + termS + termL).toFixed(3));
}

/**
 * Agrupa y cuenta modos por bandas de 1/3 de octava ISO.
 * Produce repeticiones por banda, desglose por tipo y conteo acumulado.
 */
export function countModesByBand(modes = [], maxBandFreq = 1000) {
  const relevantBands = THIRD_OCTAVE_BANDS.filter(fc => fc <= maxBandFreq * 1.5);
  let cumulative = 0;

  const bandData = relevantBands.map((fc) => {
    const { fLow, fHigh } = getBandLimits(fc);

    const modesInBand = modes.filter(m => m.frequency >= fLow && m.frequency < fHigh);
    const count = modesInBand.length;
    cumulative += count;

    const axial = modesInBand.filter(m => m.type === 'axial').length;
    const tangential = modesInBand.filter(m => m.type === 'tangential').length;
    const oblique = modesInBand.filter(m => m.type === 'oblique').length;

    return {
      fc,
      bandLabel: fc >= 1000 ? `${fc / 1000}k` : `${fc}`,
      fLow: Number(fLow.toFixed(1)),
      fHigh: Number(fHigh.toFixed(1)),
      count,
      cumulative,
      axial,
      tangential,
      oblique,
      modes: modesInBand,
    };
  });

  return bandData;
}

/**
 * Detecta modos degenerados (múltiples modos con la misma frecuencia dentro de una tolerancia)
 */
export function findDegenerateModes(modes = [], tol = 0.5) {
  const tolerance = Math.max(0.01, Number(tol) || 0.5);
  const groups = [];
  const visited = new Set();

  for (let i = 0; i < modes.length; i++) {
    if (visited.has(modes[i].id)) continue;

    const cluster = [modes[i]];
    visited.add(modes[i].id);

    for (let j = i + 1; j < modes.length; j++) {
      if (visited.has(modes[j].id)) continue;
      if (Math.abs(modes[j].frequency - modes[i].frequency) <= tolerance) {
        cluster.push(modes[j]);
        visited.add(modes[j].id);
      }
    }

    if (cluster.length > 1) {
      groups.push({
        frequency: modes[i].frequency,
        multiplicity: cluster.length,
        modes: cluster,
      });
    }
  }

  return groups;
}

/**
 * Evaluación rigurosa del Criterio de Bonello:
 * Se evalúa hasta la frecuencia de Schroeder (fs).
 * Regla 1: El número de modos por banda de 1/3 de octava debe ser monótono no decreciente (count[i] >= count[i-1]).
 * Regla 2: La coincidencia de 2 o más modos a la misma frecuencia (degeneración)
 *          solo es aceptable si en esa banda hay más de 5 modos.
 */
export function evaluateBonello(modes = [], fs = 385, tol = 0.5, maxFreqAnalysis = null) {
  const cutFreq = maxFreqAnalysis || fs;
  const tolerance = Math.max(0.01, Number(tol) || 0.5);

  // Filtrar modos hasta cutFreq
  const modesUpToCut = modes.filter(m => m.frequency <= cutFreq);

  // Bandas relevantes hasta la banda que contiene cutFreq
  const bands = countModesByBand(modesUpToCut, cutFreq);

  // Encontrar el primer índice donde comienza a haber al menos 1 modo
  const firstActiveIdx = bands.findIndex(b => b.count > 0);

  const evaluatedBands = [];
  const violations = [];
  let complies = true;

  if (firstActiveIdx === -1) {
    return {
      complies: false,
      reason: 'No se encontraron modos en el rango analizado.',
      evaluatedBands: [],
      violations: [{ fc: 0, reason: 'Sin modos en el rango' }],
      degenerateModes: [],
      totalModesAnalyzed: 0,
      fs: cutFreq,
    };
  }

  // Identificar todas las degeneraciones
  const degenerateGroups = findDegenerateModes(modesUpToCut, tolerance);

  // Evaluar desde la primera banda activa
  for (let i = firstActiveIdx; i < bands.length; i++) {
    const band = bands[i];
    const prevBand = i > firstActiveIdx ? bands[i - 1] : null;

    const bandFailures = [];

    // Regla 1: Monotonía no decreciente
    if (prevBand && band.count < prevBand.count) {
      bandFailures.push({
        type: 'monotonicity',
        rule: 1,
        message: `Disminución de modos: tiene ${band.count} modos vs ${prevBand.count} en la banda anterior de ${prevBand.fc} Hz.`,
      });
    }

    // Regla 2: Coincidencias / degeneración solo aceptables si hay > 5 modos en la banda
    const degeneratesInBand = degenerateGroups.filter(
      deg => deg.frequency >= band.fLow && deg.frequency < band.fHigh
    );

    if (degeneratesInBand.length > 0 && band.count <= 5) {
      const details = degeneratesInBand.map(d => `${d.multiplicity} modos en ~${d.frequency.toFixed(1)} Hz`).join(', ');
      bandFailures.push({
        type: 'degeneracy',
        rule: 2,
        message: `Modos degenerados (${details}) en banda con solo ${band.count} modos (mínimo exigido: > 5 modos).`,
      });
    }

    const bandComplies = bandFailures.length === 0;
    if (!bandComplies) {
      complies = false;
      bandFailures.forEach(f => {
        violations.push({
          fc: band.fc,
          ...f,
        });
      });
    }

    evaluatedBands.push({
      ...band,
      complies: bandComplies,
      failures: bandFailures,
      degenerates: degeneratesInBand,
    });
  }

  return {
    complies,
    totalModesAnalyzed: modesUpToCut.length,
    fs: cutFreq,
    tolerance,
    evaluatedBands,
    violations,
    degenerateGroups,
  };
}

/**
 * Presión acústica espacial para un modo propio en una posición (x, y, z):
 * psi(x, y, z) = cos(nx * pi * x / Lx) * cos(ny * pi * y / Ly) * cos(nz * pi * z / Lz)
 * En el dominio del tiempo: p(x, y, z, t) = A * psi(x, y, z) * cos(2 * pi * f * t)
 */
export function modePressureShape(x, y, z, mode, Lx, Ly, Lz) {
  const nx = mode.nx || 0;
  const ny = mode.ny || 0;
  const nz = mode.nz || 0;

  const lx = Math.max(0.001, Number(Lx) || 1);
  const ly = Math.max(0.001, Number(Ly) || 1);
  const lz = Math.max(0.001, Number(Lz) || 1);

  const cx = Math.cos((nx * Math.PI * x) / lx);
  const cy = Math.cos((ny * Math.PI * y) / ly);
  const cz = Math.cos((nz * Math.PI * z) / lz);

  return cx * cy * cz;
}

/**
 * Presión en un punto en el tiempo: p(t)
 */
export function modePressureAt(x, y, z, t, mode, Lx, Ly, Lz, amplitude = 1.0) {
  const shape = modePressureShape(x, y, z, mode, Lx, Ly, Lz);
  const f = mode.frequency || 50;
  return amplitude * shape * Math.cos(2 * Math.PI * f * t);
}
