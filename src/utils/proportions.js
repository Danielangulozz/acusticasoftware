/**
 * ==============================================================================
 * PROPORCIONES DE SALAS Y CRITERIOS ACÚSTICOS (BOLT)
 * ==============================================================================
 * Cálculos para proporciones dimensionales óptimas de salas rectangulares
 * según Richard H. Bolt (1946) y análisis de razones dimensionales.
 */

// Contorno de la Zona A de Bolt (coordenadas normalizadas p = W/H, q = L/H con H=1)
// Polígono representativo de la región de distribución modal uniforme de Bolt
export const BOLT_ZONE_A_CONTOUR = [
  { p: 1.20, q: 1.45 },
  { p: 1.25, q: 1.38 },
  { p: 1.35, q: 1.40 },
  { p: 1.45, q: 1.50 },
  { p: 1.55, q: 1.70 },
  { p: 1.62, q: 1.95 },
  { p: 1.60, q: 2.15 },
  { p: 1.50, q: 2.25 },
  { p: 1.38, q: 2.20 },
  { p: 1.28, q: 2.00 },
  { p: 1.20, q: 1.75 },
  { p: 1.18, q: 1.55 },
];

// Proporciones canónicas de Bolt y recomendaciones estándar
export const BOLT_PRESETS = {
  small: {
    name: 'Sala pequeña (Bolt)',
    description: 'Proporción 1 : 1.404 : 1.863 (estudios de locución, cabinas)',
    ratios: { h: 1, w: 1.404, l: 1.863 },
  },
  large: {
    name: 'Sala grande (Bolt)',
    description: 'Proporción 1 : 1.202 : 1.435 (salas de música, auditorios)',
    ratios: { h: 1, w: 1.202, l: 1.435 },
  },
  sepmeyer_b: {
    name: 'Sepmeyer B',
    description: 'Proporción 1 : 1.30 : 1.60',
    ratios: { h: 1, w: 1.30, l: 1.60 },
  },
  louden_1: {
    name: 'Louden 1',
    description: 'Proporción 1 : 1.40 : 1.90',
    ratios: { h: 1, w: 1.40, l: 1.90 },
  }
};

/**
 * Calcula las dimensiones óptimas (H, W, L) para un volumen dado V (m^3)
 * según el tipo de proporción seleccionada.
 * @param {number} volume - Volumen objetivo en m³
 * @param {'small' | 'large' | string} type - Tipo de proporción de Bolt
 * @returns {{ H: number, W: number, L: number, volume: number, ratios: object }}
 */
export function boltDimensionsFromVolume(volume, type = 'small') {
  const V = Math.max(0.1, Number(volume) || 27.0);
  const preset = BOLT_PRESETS[type] || BOLT_PRESETS.small;
  const { h, w, l } = preset.ratios;

  // V = (h*H) * (w*H) * (l*H) = (h * w * l) * H^3
  // H = cbrt(V / (w * l)) con h = 1
  const product = h * w * l;
  const H = Math.cbrt(V / product);
  const W = w * H;
  const L = l * H;

  return {
    H: Number(H.toFixed(2)),
    W: Number(W.toFixed(2)),
    L: Number(L.toFixed(2)),
    exactH: H,
    exactW: W,
    exactL: L,
    volume: Number((H * W * L).toFixed(2)),
    ratios: { ...preset.ratios },
    name: preset.name,
    description: preset.description,
  };
}

/**
 * Algoritmo Point-in-Polygon (Ray Casting) para verificar si el punto (p, q)
 * se encuentra dentro de la Zona A de Bolt.
 * @param {number} p - Razón W/H (debe ser >= 1)
 * @param {number} q - Razón L/H (debe ser >= p)
 * @returns {boolean}
 */
export function isInsideBoltZoneA(p, q) {
  const x = Number(p);
  const y = Number(q);
  if (isNaN(x) || isNaN(y)) return false;

  const polygon = BOLT_ZONE_A_CONTOUR;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].p, yi = polygon[i].q;
    const xj = polygon[j].p, yj = polygon[j].q;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Normaliza tres dimensiones (Lx, Ly, Lz) ordenándolas de menor a mayor
 * y dividiendo entre la menor dimensión (H = 1):
 * [1, p, q] con 1 <= p <= q.
 * @returns {{ h: number, p: number, q: number, sortedDims: [number, number, number] }}
 */
export function normalizeDimensionsToBolt(Lx, Ly, Lz) {
  const x = Math.max(0.01, Number(Lx) || 1);
  const y = Math.max(0.01, Number(Ly) || 1);
  const z = Math.max(0.01, Number(Lz) || 1);

  const dims = [x, y, z].sort((a, b) => a - b);
  const H = dims[0];
  const p = Number((dims[1] / H).toFixed(3));
  const q = Number((dims[2] / H).toFixed(3));

  return {
    h: 1.0,
    p,
    q,
    sortedDims: dims,
    isInsideZoneA: isInsideBoltZoneA(p, q),
  };
}

/**
 * Detecta si existen razones dimensionales simples o problemáticas (números enteros o casi enteros),
 * o dimensiones idénticas que generen degeneraciones modales severas.
 * @param {number} Lx
 * @param {number} Ly
 * @param {number} Lz
 * @param {number} tolerance - Tolerancia para detectar razones enteras (ej. 0.05 = ±5%)
 */
export function detectSimpleRatios(Lx, Ly, Lz, tolerance = 0.05) {
  const x = Math.max(0.01, Number(Lx) || 1);
  const y = Math.max(0.01, Number(Ly) || 1);
  const z = Math.max(0.01, Number(Lz) || 1);

  const dims = [
    { label: 'Lx', val: x },
    { label: 'Ly', val: y },
    { label: 'Lz', val: z }
  ];

  const issues = [];
  let isCube = false;
  let hasTwoEqual = false;

  // 1. Verificación de dimensiones idénticas
  const dX_Y = Math.abs(x - y) / Math.max(x, y);
  const dX_Z = Math.abs(x - z) / Math.max(x, z);
  const dY_Z = Math.abs(y - z) / Math.max(y, z);

  if (dX_Y < 0.01 && dX_Z < 0.01) {
    isCube = true;
    issues.push({
      type: 'CUBE',
      severity: 'CRITICAL',
      message: 'Sala cúbica (Lx ≈ Ly ≈ Lz). Coincidencia modal máxima y degeneraciones triples.',
      details: `Lx = ${x.toFixed(2)}m, Ly = ${y.toFixed(2)}m, Lz = ${z.toFixed(2)}m`
    });
  } else {
    if (dX_Y < 0.01) {
      hasTwoEqual = true;
      issues.push({
        type: 'SQUARE_FLOOR',
        severity: 'HIGH',
        message: 'Planta cuadrada (Lx ≈ Ly). Genera modos degenerados axiales y tangenciales dobles.',
        details: `Lx = Ly = ${x.toFixed(2)}m`
      });
    }
    if (dX_Z < 0.01) {
      hasTwoEqual = true;
      issues.push({
        type: 'EQUAL_PAIR',
        severity: 'HIGH',
        message: 'Longitud igual a altura (Lx ≈ Lz). Fuerte degeneración modal.',
        details: `Lx = Lz = ${x.toFixed(2)}m`
      });
    }
    if (dY_Z < 0.01) {
      hasTwoEqual = true;
      issues.push({
        type: 'EQUAL_PAIR',
        severity: 'HIGH',
        message: 'Ancho igual a altura (Ly ≈ Lz). Fuerte degeneración modal.',
        details: `Ly = Lz = ${y.toFixed(2)}m`
      });
    }
  }

  // 2. Verificación de razones enteras (1:2, 1:3, 1:4, 2:3)
  const checkRatio = (d1, d2) => {
    const r = d1.val / d2.val;
    const testIntegers = [1, 2, 3, 4];
    for (const n of testIntegers) {
      if (Math.abs(r - n) <= tolerance && n !== 1) {
        issues.push({
          type: 'INTEGER_RATIO',
          severity: 'HIGH',
          message: `Razón dimensional casi entera entre ${d1.label} y ${d2.label} (~${n}:1).`,
          details: `${d1.label}/${d2.label} = ${r.toFixed(2)} ≈ ${n}`
        });
      }
    }
    // Razón 1.5 (3:2)
    if (Math.abs(r - 1.5) <= tolerance) {
      issues.push({
        type: 'HARMONIC_RATIO',
        severity: 'MEDIUM',
        message: `Razón armónica 3:2 entre ${d1.label} y ${d2.label}.`,
        details: `${d1.label}/${d2.label} = ${r.toFixed(2)} ≈ 1.5`
      });
    }
  };

  checkRatio(dims[0], dims[1]);
  checkRatio(dims[1], dims[0]);
  checkRatio(dims[0], dims[2]);
  checkRatio(dims[2], dims[0]);
  checkRatio(dims[1], dims[2]);
  checkRatio(dims[2], dims[1]);

  return {
    isCube,
    hasTwoEqual,
    hasIssues: issues.length > 0,
    issues,
  };
}
