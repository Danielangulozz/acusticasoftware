import * as THREE from 'three';
import * as K from './kit.js';

/**
 * Arquitectura e instalaciones del Estudio de renders: columnas, vigas, dinteles, descuelgues
 * (escalones) del techo, zonas de techo con distinto acabado, rejillas de aire acondicionado y
 * parlantes de techo. Mismas reglas que kitExtra.js: (M, c) con c = { w, h, d, t, dims, color, … };
 * las piezas de techo nacen a `dims.drop` bajo el techo, así que se suben ese tanto para tocarlo.
 */

const { box, cyl } = K;
const G = () => new THREE.Group();

/** Acabados posibles de una zona de techo: [id, etiqueta, coeficientes α por banda]. */
export const CEILING_FINISHES = [
  ['grid', 'Reticular (placa acústica)', { 125: 0.3, 250: 0.55, 500: 0.7, 1000: 0.8, 2000: 0.8, 4000: 0.75 }],
  ['plaster', 'Yeso liso', { 125: 0.15, 250: 0.1, 500: 0.06, 1000: 0.05, 2000: 0.04, 4000: 0.04 }],
  ['wood', 'Listones de madera', { 125: 0.18, 250: 0.35, 500: 0.55, 1000: 0.6, 2000: 0.55, 4000: 0.5 }],
  ['absorbent', 'Absorbente (lana + tela)', { 125: 0.45, 250: 0.8, 500: 0.95, 1000: 0.95, 2000: 0.95, 4000: 0.9 }],
  ['reflective', 'Franja reflectante', { 125: 0.1, 250: 0.07, 500: 0.05, 1000: 0.04, 2000: 0.04, 4000: 0.04 }],
];
export const ceilingFinishCoefficients = (id) => (CEILING_FINISHES.find((f) => f[0] === id) ?? CEILING_FINISHES[0])[2];

const lift = (dims) => Number(dims?.drop) || 0.04;

function column(M, { w, d, h, dims, color }) {
  const g = G();
  const mat = M.concrete(color ?? 0xd5d7db);
  if (dims?.round) g.add(cyl(w / 2, w / 2, h, mat, { seg: 32, y: h / 2 }));
  else g.add(box(w, h, d, mat, { r: 0.006, y: h / 2 }));
  // Zócalo y capitel discretos
  g.add(box(w + 0.02, 0.08, (dims?.round ? w : d) + 0.02, M.paint(0x9a9ca2, { roughness: 0.6 }), { y: 0.04 }));
  g.userData.width = w;
  return g;
}

function beam(M, { w, d, h, dims, color }) {
  const g = G();
  g.add(box(w, h, d, M.concrete(color ?? 0xdcdee2), { r: 0.004, y: lift(dims) - h / 2 }));
  g.userData.width = w;
  return g;
}

function ceilingSoffit(M, { w, d, h, dims, color }) {
  const g = G();
  const y = lift(dims) - h / 2;
  g.add(box(w, h, d, M.paint(color ?? 0xf2f1ee, { roughness: 0.88 }), { r: 0.006, y }));
  // Junta de sombra perimetral, como en los descuelgues de drywall
  g.add(box(w + 0.02, 0.012, d + 0.02, M.plastic(0x2a2a30, { roughness: 0.8 }), { y: lift(dims) - 0.006 }));
  g.userData.width = w;
  return g;
}

function wallLintel(M, { w, h, t, color }) {
  const g = G();
  g.add(box(w, h, t, M.concrete(color ?? 0xd9dbdf), { r: 0.004, z: t / 2 }));
  g.userData.width = w;
  return g;
}

function ceilingZone(M, { w, d, dims, color, wood }) {
  const g = G();
  const finish = dims?.ceilingFinish || 'grid';
  const y = lift(dims) - 0.015;
  if (finish === 'grid') {
    const tile = M.paint(color ?? 0xf3f2ef, { roughness: 0.95 });
    const bar = M.metal(0xe6e7ea, { roughness: 0.45 });
    g.add(box(w, 0.02, d, tile, { y }));
    for (let x = -w / 2; x <= w / 2 + 1e-6; x += 0.6) g.add(box(0.024, 0.026, d, bar, { x: Math.min(x, w / 2), y: y - 0.004 }));
    for (let z = -d / 2; z <= d / 2 + 1e-6; z += 0.6) g.add(box(w, 0.026, 0.024, bar, { z: Math.min(z, d / 2), y: y - 0.004 }));
  } else if (finish === 'wood') {
    const slat = M.wood(wood || 'oak', 0, { roughness: 0.5 });
    g.add(box(w, 0.012, d, M.fabric(0x26252b, { bump: 0.4 }), { y: y + 0.01 }));
    const n = Math.max(3, Math.floor(w / 0.09));
    for (let i = 0; i < n; i++) g.add(box(0.045, 0.04, d, slat, { x: -w / 2 + (i + 0.5) * (w / n), y: y - 0.01 }));
  } else if (finish === 'absorbent') {
    g.add(box(w, 0.05, d, M.fabric(color ?? 0xd8d2c4, { bump: 0.5 }), { r: 0.01, y: y - 0.01 }));
  } else {
    g.add(box(w, 0.02, d, M.paint(color ?? (finish === 'reflective' ? 0xfafafa : 0xf4f3f0), { roughness: finish === 'reflective' ? 0.35 : 0.9 }), { y }));
  }
  g.userData.width = w;
  return g;
}

function acGrille(M, { w, d, dims }) {
  const g = G();
  const y = lift(dims) - 0.012;
  const frame = M.paint(0xf1f1f0, { roughness: 0.55 });
  g.add(box(w, 0.024, d, frame, { y }));
  g.add(box(w - 0.08, 0.02, d - 0.08, M.plastic(0x1e1f24, { roughness: 0.8 }), { y: y - 0.004 }));
  // Difusor de cuatro vías: aletas concéntricas
  for (let k = 1; k <= 4; k++) {
    const s = (k / 4.6) * (w - 0.1);
    for (const [sx, sz, len, horizontal] of [[0, s / 2, s, true], [0, -s / 2, s, true], [s / 2, 0, s, false], [-s / 2, 0, s, false]]) {
      g.add(box(horizontal ? len : 0.012, 0.016, horizontal ? 0.012 : len, frame, { x: sx, y: y - 0.016, z: sz }));
    }
  }
  g.userData.width = w;
  return g;
}

function ceilingSpeaker(M, { w, dims }) {
  const g = G();
  const y = lift(dims) - 0.01;
  const r = w / 2;
  g.add(cyl(r, r, 0.02, M.paint(0xf2f2f1, { roughness: 0.5 }), { seg: 40, y }));
  g.add(cyl(r * 0.84, r * 0.84, 0.012, M.metal(0xdcdde0, { roughness: 0.55 }), { seg: 40, y: y - 0.01 }));
  // Rejilla perforada (anillos)
  for (let k = 1; k <= 4; k++) g.add(cyl(r * 0.2 * k, r * 0.2 * k, 0.004, M.plastic(0xbfc1c6, { roughness: 0.6 }), { seg: 32, y: y - 0.017 - k * 0.0005, open: true }));
  g.userData.width = w;
  return g;
}

export const BUILDING_BUILDERS = {
  column,
  column_round: (M, c) => column(M, { ...c, dims: { ...c.dims, round: true } }),
  beam,
  ceiling_soffit: ceilingSoffit,
  wall_lintel: wallLintel,
  ceiling_zone: ceilingZone,
  ac_grille: acGrille,
  ceiling_speaker: ceilingSpeaker,
};
