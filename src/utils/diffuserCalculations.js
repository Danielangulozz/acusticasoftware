/**
 * Diseño de difusores acústicos — POZOLE ACOUSTIC
 *
 * Implementa el procedimiento de la clase "Diseño de Difusores" (Acústica de Salas 2026-2):
 *   - QRD unidimensional y bidimensional (Schroeder, residuo cuadrático)
 *   - PRD (raíces primitivas)
 *   - MLS (secuencia de longitud máxima, binaria)
 *   - Policilíndrico (arcos convexos, R < 5 m)
 *
 * y la predicción de su respuesta polar con el modelo de Fraunhofer / Kirchhoff,
 * coeficiente de difusión direccional (AES-4id / ISO 17497-2) normalizado frente a
 * una superficie plana de igual tamaño y coeficiente de dispersión teórico
 * s = 1 - |(1/N) Σ e^{-2jk d_n}|².
 *
 * Unidades internas: metros, hertz, segundos.
 */

export const SPEED_OF_SOUND = 343;

/** Velocidad del sonido en aire en función de la temperatura (°C). */
export function speedOfSound(tempC = 20) {
  return 331.3 * Math.sqrt(1 + tempC / 273.15);
}

export function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

/** Primo más próximo mayor o igual a n (regla de la clase: si no es primo, el siguiente). */
export function nextPrime(n) {
  let k = Math.max(2, Math.ceil(n));
  while (!isPrime(k)) k++;
  return k;
}

/** Exponenciación modular segura para enteros pequeños. */
function modPow(base, exp, mod) {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1;
  }
  return result;
}

/** s_n = n² mod p, n = 0 … p-1 */
export function quadraticResidueSequence(p) {
  return Array.from({ length: p }, (_, n) => (n * n) % p);
}

/** s_{m,n} = (m² + n²) mod p — QRD bidimensional */
export function quadraticResidue2D(p) {
  return Array.from({ length: p }, (_, m) =>
    Array.from({ length: p }, (_, n) => (m * m + n * n) % p)
  );
}

/** g es raíz primitiva de p si g^n mod p genera p-1 residuos distintos. */
export function isPrimitiveRoot(g, p) {
  if (!isPrime(p) || g < 2 || g >= p) return false;
  const seen = new Set();
  for (let n = 1; n < p; n++) seen.add(modPow(g, n, p));
  return seen.size === p - 1;
}

export function primitiveRoots(p) {
  const roots = [];
  for (let g = 2; g < p; g++) if (isPrimitiveRoot(g, p)) roots.push(g);
  return roots;
}

/** s_n = g^n mod p, n = 1 … p-1 */
export function primitiveRootSequence(p, g) {
  return Array.from({ length: p - 1 }, (_, i) => modPow(g, i + 1, p));
}

// Taps de LFSR de Fibonacci para secuencias de longitud máxima (polinomios primitivos).
const MLS_TAPS = { 2: [2, 1], 3: [3, 2], 4: [4, 3], 5: [5, 3], 6: [6, 5], 7: [7, 6], 8: [8, 6, 5, 4], 9: [9, 5], 10: [10, 7] };

export const MLS_ORDERS = Object.keys(MLS_TAPS).map(Number);

/** Secuencia MLS de orden m (longitud 2^m − 1) con valores 0/1. */
export function mlsSequence(order) {
  const taps = MLS_TAPS[order];
  if (!taps) throw new Error(`Orden MLS no soportado: ${order}`);
  const len = (1 << order) - 1;
  let reg = (1 << order) - 1; // semilla no nula
  const out = [];
  for (let i = 0; i < len; i++) {
    out.push(reg & 1);
    let bit = 0;
    for (const t of taps) bit ^= (reg >> (order - t)) & 1;
    reg = (reg >> 1) | (bit << (order - 1));
  }
  return out;
}

/**
 * Parámetros comunes de los difusores de Schroeder (QRD / PRD):
 *   W = c / (2 f_max) − T              ancho de ranura
 *   p ≥ 2·n·(f_max / f0)  → primo      ranuras por período (2n+1 lóbulos en f0)
 *   d_n = s_n · λ0 / (2p)              profundidad de cada ranura
 */
function schroederWellWidth(c, fMax, T) {
  return c / (2 * fMax) - T;
}

export function suggestedPrime(f0, fMax, lobeOrder = 2) {
  return nextPrime(2 * lobeOrder * (fMax / f0));
}

function depthsFromSequence(seq, c, f0, p) {
  const unit = c / (2 * p * f0); // λ0 / 2p
  return seq.map((s) => s * unit);
}

/**
 * Diseño completo de un difusor. Devuelve geometría, secuencia y elementos para el
 * modelo de dispersión.
 *
 * @param {object} cfg
 *   type: 'qrd' | 'qrd2d' | 'prd' | 'mls' | 'poly'
 *   f0, fMax, c, T (m), lobeOrder (n), periods (N), primeOverride, g, mlsOrder,
 *   panelHeight (m), poly: { radius, chord, count }
 */
export function designDiffuser(cfg) {
  const c = cfg.c ?? SPEED_OF_SOUND;
  const T = cfg.T ?? 0.005;
  const periods = Math.max(1, Math.round(cfg.periods ?? 1));
  const f0 = cfg.f0;
  const fMax = cfg.fMax;
  const lambda0 = c / f0;

  if (cfg.type === 'qrd' || cfg.type === 'qrd2d' || cfg.type === 'prd') {
    const W = schroederWellWidth(c, fMax, T);
    const pRaw = 2 * (cfg.lobeOrder ?? 2) * (fMax / f0);
    let p = cfg.primeOverride && isPrime(cfg.primeOverride) ? cfg.primeOverride : nextPrime(pRaw);
    if (cfg.type === 'prd' && p < 3) p = 3;

    let sequence;
    let sequence2D = null;
    let g = null;
    if (cfg.type === 'prd') {
      const roots = primitiveRoots(p);
      g = roots.includes(cfg.g) ? cfg.g : roots[0];
      sequence = primitiveRootSequence(p, g);
    } else if (cfg.type === 'qrd2d') {
      sequence2D = quadraticResidue2D(p);
      sequence = sequence2D[0];
    } else {
      sequence = quadraticResidueSequence(p);
    }

    const allS = sequence2D ? sequence2D.flat() : sequence;
    const depthUnit = c / (2 * p * f0);
    const depths = depthsFromSequence(sequence, c, f0, p);
    const depths2D = sequence2D ? sequence2D.map((row) => depthsFromSequence(row, c, f0, p)) : null;
    const maxDepth = Math.max(...allS) * depthUnit;
    const wellsPerPeriod = sequence.length;
    const periodWidth = wellsPerPeriod * (W + T);
    const totalWidth = periodWidth * periods;
    // Límite superior: cuando la ranura deja de ser < λ/2 aparece propagación transversal.
    const fUpper = c / (2 * (W + T));

    return {
      type: cfg.type,
      c,
      f0,
      fMax,
      T,
      lambda0,
      pRaw,
      p,
      g,
      W,
      sequence,
      sequence2D,
      depthUnit,
      depths,
      depths2D,
      maxDepth,
      wellsPerPeriod,
      periods,
      periodWidth,
      totalWidth,
      totalDepth: cfg.type === 'qrd2d' ? Math.ceil(periods) * periodWidth : (cfg.panelHeight ?? 0.6),
      fUpper,
      lobes: 2 * (cfg.lobeOrder ?? 2) + 1,
      validWidth: W > 0,
    };
  }

  if (cfg.type === 'mls') {
    const order = cfg.mlsOrder ?? 4;
    const sequence = mlsSequence(order);
    const W = lambda0 / 2 - T;
    const depthWell = lambda0 / 4;
    const depths = sequence.map((b) => (b ? depthWell : 0));
    const periodWidth = sequence.length * (W + T);
    return {
      type: 'mls',
      c,
      f0,
      fMax: 2 * f0, // una octava de margen útil
      T,
      lambda0,
      p: sequence.length,
      order,
      W,
      sequence,
      depthUnit: depthWell,
      depths,
      maxDepth: depthWell,
      wellsPerPeriod: sequence.length,
      periods,
      periodWidth,
      totalWidth: periodWidth * periods,
      totalDepth: cfg.panelHeight ?? 0.6,
      fUpper: 2 * f0,
      validWidth: W > 0,
    };
  }

  if (cfg.type === 'poly') {
    const { radius = 1.2, chord = 0.6, count = 4 } = cfg.poly ?? {};
    const R = Math.max(radius, chord / 2 + 1e-6);
    const sagitta = R - Math.sqrt(R * R - (chord / 2) ** 2);
    return {
      type: 'poly',
      c,
      f0,
      fMax,
      lambda0,
      radius: R,
      chord,
      count,
      sagitta,
      maxDepth: sagitta,
      periods: count,
      periodWidth: chord,
      totalWidth: chord * count,
      totalDepth: cfg.panelHeight ?? 0.6,
      // Un cilindro difunde bien cuando su cuerda es comparable o mayor a λ.
      fLower: c / chord,
      isReflector: R >= 5,
      validWidth: true,
    };
  }

  throw new Error(`Tipo de difusor desconocido: ${cfg.type}`);
}

/**
 * Discretiza la superficie del difusor (corte 1D) en elementos para el modelo de
 * Fraunhofer. Cada elemento: { x (centro), w (ancho), d (profundidad), well }.
 *   well = true  → ranura de reacción local: R = e^{-2jkd} (independiente del ángulo)
 *   well = false → superficie rígida a profundidad d: fase depende de cosθ + cosψ
 */
export function surfaceElements(design, { row = 0 } = {}) {
  const els = [];
  if (design.type === 'poly') {
    const segs = 24;
    const { radius: R, chord, count, sagitta } = design;
    for (let k = 0; k < count; k++) {
      for (let i = 0; i < segs; i++) {
        const u = -chord / 2 + ((i + 0.5) * chord) / segs;
        const h = Math.sqrt(R * R - u * u) - (R - sagitta); // altura sobre la base
        els.push({ x: k * chord + chord / 2 + u, w: chord / segs, d: sagitta - h, well: false });
      }
    }
    return center(els);
  }

  const depths = design.depths2D ? design.depths2D[row % design.depths2D.length] : design.depths;
  const { W, T, periods } = design;
  let x = 0;
  for (let m = 0; m < periods; m++) {
    for (let n = 0; n < depths.length; n++) {
      if (T > 0) {
        els.push({ x: x + T / 2, w: T, d: 0, well: false });
        x += T;
      }
      els.push({ x: x + W / 2, w: W, d: depths[n], well: true });
      x += W;
    }
  }
  return center(els);
}

function center(els) {
  const minX = Math.min(...els.map((e) => e.x - e.w / 2));
  const maxX = Math.max(...els.map((e) => e.x + e.w / 2));
  const mid = (minX + maxX) / 2;
  return els.map((e) => ({ ...e, x: e.x - mid }));
}

/** Superficie plana de referencia del mismo ancho. */
export function flatElements(design) {
  const total = design.totalWidth;
  const n = 32;
  return Array.from({ length: n }, (_, i) => ({ x: -total / 2 + ((i + 0.5) * total) / n, w: total / n, d: 0, well: false }));
}

const DEG = Math.PI / 180;

function sinc(x) {
  return Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x;
}

/**
 * Presión dispersada en campo lejano (Fraunhofer):
 *   p(θ) ∝ Σ R_e · w_e · sinc(k w_e (sinθ + sinψ)/2) · e^{j k x_e (sinθ + sinψ)}
 * Devuelve |p|² por ángulo de recepción θ (grados, −90…90).
 */
export function polarResponse(elements, freq, c, incidenceDeg = 0, angles = defaultAngles()) {
  const k = (2 * Math.PI * freq) / c;
  const sPsi = Math.sin(incidenceDeg * DEG);
  const cPsi = Math.cos(incidenceDeg * DEG);
  return angles.map((thDeg) => {
    const th = thDeg * DEG;
    const u = Math.sin(th) + sPsi;
    const v = Math.cos(th) + cPsi;
    let re = 0;
    let im = 0;
    for (const e of elements) {
      const phaseDepth = e.well ? -2 * k * e.d : -k * e.d * v;
      const phase = k * e.x * u + phaseDepth;
      const amp = e.w * sinc((k * e.w * u) / 2);
      re += amp * Math.cos(phase);
      im += amp * Math.sin(phase);
    }
    return re * re + im * im;
  });
}

export function defaultAngles(step = 5) {
  const out = [];
  for (let a = -90; a <= 90; a += step) out.push(a);
  return out;
}

/**
 * Coeficiente de difusión direccional (AES-4id / ISO 17497-2):
 *   d = [(Σ I_i)² − Σ I_i²] / [(n − 1) Σ I_i²],   I_i = 10^{L_i/10} = |p_i|²
 */
export function diffusionCoefficient(intensities) {
  const n = intensities.length;
  let sum = 0;
  let sumSq = 0;
  for (const I of intensities) {
    sum += I;
    sumSq += I * I;
  }
  if (sumSq === 0 || n < 2) return 0;
  return (sum * sum - sumSq) / ((n - 1) * sumSq);
}

/** d_n = (d − d_ref) / (1 − d_ref) */
export function normalizedDiffusion(d, dRef) {
  if (dRef >= 1) return 0;
  return Math.max(0, (d - dRef) / (1 - dRef));
}

/** s = 1 − |(1/N) Σ e^{−2jk d_n}|² (coeficiente de dispersión teórico, incidencia normal) */
export function theoreticalScattering(depths, freq, c) {
  const k = (2 * Math.PI * freq) / c;
  let re = 0;
  let im = 0;
  for (const d of depths) {
    re += Math.cos(-2 * k * d);
    im += Math.sin(-2 * k * d);
  }
  const N = depths.length;
  return 1 - (re * re + im * im) / (N * N);
}

export const THIRD_OCTAVE_BANDS = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000];

/** Barrido en frecuencia: difusión normalizada, difusión del difusor, de la placa plana y scattering. */
export function frequencySweep(design, { incidenceDeg = 0, bands = THIRD_OCTAVE_BANDS } = {}) {
  const els = surfaceElements(design);
  const flat = flatElements(design);
  const depthSet = design.type === 'poly'
    ? els.map((e) => e.d)
    : design.depths2D
      ? design.depths2D.flat()
      : design.depths;
  return bands.map((f) => {
    const d = diffusionCoefficient(polarResponse(els, f, design.c, incidenceDeg));
    const dRef = diffusionCoefficient(polarResponse(flat, f, design.c, incidenceDeg));
    return {
      freq: f,
      diffusion: d,
      flat: dRef,
      normalized: normalizedDiffusion(d, dRef),
      scattering: Math.max(0, theoreticalScattering(depthSet, f, design.c)),
    };
  });
}

/**
 * Mapa hemisférico para QRD 2D: |p(u, v)|² con u = sinθ cosφ, v = sinθ sinφ
 * (incidencia normal). Devuelve matriz res×res normalizada a 1; fuera del círculo → null.
 */
export function hemisphereMap(design, freq, res = 61) {
  const k = (2 * Math.PI * freq) / design.c;
  const pitch = design.W + design.T;
  const grid = design.depths2D ?? [design.depths];
  const P = design.periods;
  const cells = [];
  const nRows = grid.length;
  const nCols = grid[0].length;
  const reps = design.depths2D ? P : 1;
  for (let pm = 0; pm < reps; pm++)
    for (let pn = 0; pn < P; pn++)
      for (let m = 0; m < nRows; m++)
        for (let n = 0; n < nCols; n++) {
          cells.push({
            x: (pn * nCols + n) * pitch,
            y: (pm * nRows + m) * pitch,
            phase: -2 * k * grid[m][n],
          });
        }
  const cx = ((P * nCols) * pitch) / 2;
  const cy = ((reps * nRows) * pitch) / 2;
  const out = [];
  let max = 0;
  for (let i = 0; i < res; i++) {
    const row = [];
    const v = -1 + (2 * i) / (res - 1);
    for (let j = 0; j < res; j++) {
      const u = -1 + (2 * j) / (res - 1);
      if (u * u + v * v > 1) {
        row.push(null);
        continue;
      }
      let re = 0;
      let im = 0;
      for (const c of cells) {
        const ph = k * ((c.x - cx) * u + (c.y - cy) * v) + c.phase;
        re += Math.cos(ph);
        im += Math.sin(ph);
      }
      const I = re * re + im * im;
      if (I > max) max = I;
      row.push(I);
    }
    out.push(row);
  }
  return out.map((row) => row.map((I) => (I === null ? null : I / (max || 1))));
}

/** Lista de corte / fabricación (cm). */
export function fabricationList(design, panelHeight = 0.6) {
  const cm = (m) => Math.round(m * 1000) / 10;
  if (design.type === 'poly') {
    const arc = 2 * design.radius * Math.asin(design.chord / (2 * design.radius));
    return [
      { item: 'Láminas curvas (contrachapado flexible)', qty: design.count, size: `${cm(arc)} × ${cm(panelHeight)} cm` },
      { item: 'Costillas / cerchas de arco', qty: design.count * 3, size: `cuerda ${cm(design.chord)} cm, flecha ${cm(design.sagitta)} cm` },
      { item: 'Panel base', qty: 1, size: `${cm(design.totalWidth)} × ${cm(panelHeight)} cm` },
    ];
  }
  if (design.type === 'qrd2d') {
    const counts = new Map();
    design.depths2D.flat().forEach((d) => {
      const h = cm(design.maxDepth - d);
      counts.set(h, (counts.get(h) || 0) + design.periods * design.periods);
    });
    const blocks = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([h, q]) => ({
      item: h === 0 ? 'Celda a ras (sin bloque)' : `Bloque skyline h = ${h} cm`,
      qty: q,
      size: `${cm(design.W)} × ${cm(design.W)} × ${h} cm`,
    }));
    return [
      { item: 'Panel base', qty: 1, size: `${cm(design.totalWidth)} × ${cm(design.totalWidth)} cm` },
      ...blocks,
    ];
  }
  const wells = design.depths.length * design.periods;
  const counts = new Map();
  design.depths.forEach((d) => {
    const h = cm(design.maxDepth - d);
    if (h > 0) counts.set(h, (counts.get(h) || 0) + design.periods);
  });
  return [
    { item: 'Separadores (aletas)', qty: wells + 1, size: `${cm(design.maxDepth)} × ${cm(panelHeight)} cm, e = ${cm(design.T) * 10} mm` },
    { item: 'Panel posterior', qty: 1, size: `${cm(design.totalWidth)} × ${cm(panelHeight)} cm` },
    ...[...counts.entries()].sort((a, b) => a[0] - b[0]).map(([h, q]) => ({
      item: `Taco de fondo de ranura (relleno ${h} cm)`,
      qty: q,
      size: `${cm(design.W)} × ${h} × ${cm(panelHeight)} cm`,
    })),
  ];
}
