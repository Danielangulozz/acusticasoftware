import { OCTAVE_BANDS } from '../utils/acousticCalculations';

/**
 * Caso de estudio conceptual del sitio: el estudio de los renders (5.4 × 4.4 × 2.7 m).
 * No es un proyecto real: es un modelo, y sus cifras salen de aplicar Norris-Eyring
 * a las superficies de abajo. Cambia áreas o coeficientes y la página se recalcula sola.
 */
export const ROOM = { length: 5.4, width: 4.4, height: 2.7 };

const { length: L, width: W, height: H } = ROOM;
export const VOLUME = L * W * H;
export const SURFACE = 2 * L * W + 2 * (L + W) * H;

// Sala sin tratar — coeficientes α por octava (125 Hz … 4 kHz), valores típicos de tablas
const BASE = [
  { area: 2 * (L + W) * H - 4, alpha: [0.02, 0.02, 0.03, 0.04, 0.05, 0.05] }, // muros de mampostería enlucida
  { area: L * W, alpha: [0.29, 0.1, 0.05, 0.04, 0.07, 0.09] }, // cielo en placa de yeso
  { area: L * W, alpha: [0.04, 0.04, 0.07, 0.06, 0.06, 0.07] }, // piso de madera
  { area: 4, alpha: [0.2, 0.15, 0.1, 0.08, 0.07, 0.06] }, // puerta y ventana
];
const WALL = BASE[0].alpha;
const CEILING = BASE[1].alpha;
const FLOOR = BASE[2].alpha;
const FURNITURE = [0.5, 0.7, 0.9, 1.0, 1.0, 1.0]; // sofá, silla y escritorio, en m² Sabine

/** Tratamiento instalado. `over` es la superficie que cada elemento tapa. */
export const TREATMENT = [
  { name: 'Panel de listones en la pared frontal', area: 6.5, alpha: [0.3, 0.65, 0.85, 0.8, 0.7, 0.6], over: WALL },
  { name: 'Paneles absorbentes de 100 mm', area: 4.7, alpha: [0.45, 0.9, 1, 1, 1, 0.95], over: WALL },
  { name: 'Absorción de banda ancha en la pared trasera', area: 8, alpha: [0.6, 0.95, 1, 1, 1, 0.95], over: WALL, hidden: true },
  { name: 'Trampas de graves en las cuatro esquinas', area: 6.2, alpha: [0.65, 0.85, 0.9, 0.9, 0.85, 0.8], over: WALL },
  { name: 'Nubes suspendidas (absorben por ambas caras)', area: 3.4, alpha: [0.35, 0.8, 1, 1, 1, 0.95], over: null },
  { name: 'Cielo absorbente perimetral', area: 5, alpha: [0.5, 0.85, 0.95, 0.95, 0.95, 0.9], over: CEILING, hidden: true },
  { name: 'Alfombras', area: 9.7, alpha: [0.05, 0.1, 0.25, 0.4, 0.55, 0.6], over: FLOOR },
  { name: 'Difusores QRD y skyline', area: 2.8, alpha: [0.2, 0.25, 0.25, 0.2, 0.18, 0.15], over: WALL },
];

/** Tiempo de reverberación de Norris-Eyring: T = 0.161·V / (−S·ln(1 − ᾱ)) */
export function eyring(volume, surface, absorption) {
  const mean = Math.min(0.99, absorption / surface);
  return (0.161 * volume) / (-surface * Math.log(1 - mean));
}

function absorptionByBand(withTreatment) {
  return OCTAVE_BANDS.map((_, i) => {
    let A = FURNITURE[i] + BASE.reduce((sum, s) => sum + s.area * s.alpha[i], 0);
    if (withTreatment) {
      A += TREATMENT.reduce((sum, t) => sum + t.area * (t.alpha[i] - (t.over ? t.over[i] : 0)), 0);
    }
    return A;
  });
}

const mid = (values) => (values[2] + values[3]) / 2; // promedio 500 Hz – 1 kHz

export function computeCase() {
  const before = absorptionByBand(false).map((A) => eyring(VOLUME, SURFACE, A));
  const after = absorptionByBand(true).map((A) => eyring(VOLUME, SURFACE, A));
  // Objetivo para salas de escucha crítica (ITU-R BS.1116): Tm = 0.25·(V/100)^(1/3) ± 0.05 s
  const target = 0.25 * Math.cbrt(VOLUME / 100);
  return {
    bands: OCTAVE_BANDS,
    before,
    after,
    beforeMid: mid(before),
    afterMid: mid(after),
    target,
    targetMin: target - 0.05,
    targetMax: target + 0.05,
    treatedArea: TREATMENT.reduce((sum, t) => sum + t.area, 0),
  };
}
