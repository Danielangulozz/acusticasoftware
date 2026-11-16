import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { projectUV, rng } from './materials.js';
// Los difusores se modelan con las mismas secuencias que calcula POZOLE Suite
import {
  quadraticResidueSequence,
  quadraticResidue2D,
  primitiveRoots,
  primitiveRootSequence,
  mlsSequence,
} from '../utils/diffuserCalculations.js';
import { getEdgeArcPoints } from '../utils/acousticCalculations.js';

/**
 * Kit de modelado paramétrico (metros, Y hacia arriba).
 *   · Piezas de pared: origen en el plano de la pared, crecen hacia +Z.
 *   · Piezas de piso: origen en el centro de su huella, crecen hacia +Y.
 */

const lit = (mesh) => {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const FABRIC_UV = { grain: 'y', along: 0.16, across: 0.16 };
const woodUV = (grain, r) => ({ grain, along: 1.5, across: 0.5, offset: [r(), r()] });

export function box(w, h, d, material, o = {}) {
  const { r = 0, seg = 2, uv = null, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = o;
  const radius = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const geo = radius > 0.0004 ? new RoundedBoxGeometry(w, h, d, seg, radius) : new THREE.BoxGeometry(w, h, d);
  if (uv) projectUV(geo, uv);
  const mesh = lit(new THREE.Mesh(geo, material));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

export function cyl(rTop, rBottom, h, material, o = {}) {
  const { seg = 28, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, open = false } = o;
  const mesh = lit(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open), material));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

export function ball(radius, material, o = {}) {
  const { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1 } = o;
  const mesh = lit(new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

export function place(obj, { x = 0, y = 0, z = 0, ry = 0 } = {}) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  return obj;
}

export function group(children, o) {
  const g = new THREE.Group();
  children.forEach((c) => c && g.add(c));
  return o ? place(g, o) : g;
}

/* ============================================================ TRATAMIENTOS */

/** Panel absorbente tapizado, separado de la pared por rastreles. */
export function absorber(M, { w = 0.6, h = 1.2, t = 0.055, color = 0x7a6bd1, frame = null } = {}) {
  const g = new THREE.Group();
  g.add(box(w - 0.06, h - 0.06, 0.016, M.plastic(0x202024, { roughness: 0.9 }), { z: 0.008 }));
  g.add(box(w, h, t, M.fabric(color), { r: 0.012, uv: FABRIC_UV, z: 0.016 + t / 2 }));
  if (frame) {
    const r = rng(21);
    const m = M.wood(frame, 1);
    const f = 0.018;
    const zc = 0.016 + t / 2;
    g.add(box(w + 2 * f, f, t + 0.006, m, { y: h / 2 + f / 2, z: zc, uv: woodUV('x', r) }));
    g.add(box(w + 2 * f, f, t + 0.006, m, { y: -h / 2 - f / 2, z: zc, uv: woodUV('x', r) }));
    g.add(box(f, h, t + 0.006, m, { x: w / 2 + f / 2, z: zc, uv: woodUV('y', r) }));
    g.add(box(f, h, t + 0.006, m, { x: -w / 2 - f / 2, z: zc, uv: woodUV('y', r) }));
  }
  return g;
}

/** Difusor QRD unidimensional: profundidades dₙ ∝ n² mod p. Devuelve también su ancho total. */
export function qrd(M, { p = 7, periods = 2, well = 0.064, fin = 0.008, h = 1.2, depth = 0.17, wood = 'oak' } = {}) {
  const seq = quadraticResidueSequence(p);
  const smax = Math.max(...seq);
  const n = p * periods;
  const W = n * (well + fin) + fin;
  const back = 0.012;
  const cap = 0.014;
  const g = new THREE.Group();
  const r = rng(p * 31 + periods);
  g.add(box(W, h, back, M.wood(wood, 1), { z: back / 2, uv: woodUV('y', r) }));
  for (const sy of [-1, 1]) {
    g.add(box(W, cap, depth, M.wood(wood, 2), { y: sy * (h / 2 - cap / 2), z: back + depth / 2, uv: woodUV('x', r) }));
  }
  for (let i = 0; i <= n; i++) {
    const x = -W / 2 + fin / 2 + i * (well + fin);
    g.add(box(fin, h - 2 * cap, depth, M.wood(wood, i % 4), { x, z: back + depth / 2, uv: woodUV('y', r) }));
  }
  for (let i = 0; i < n; i++) {
    const fill = depth - (seq[i % p] / smax) * (depth - 0.012);
    const x = -W / 2 + fin + well / 2 + i * (well + fin);
    g.add(box(well, h - 2 * cap, fill, M.wood(wood, (i * 3) % 4, { tint: i % 2 ? 0xffffff : 0xf3ece2 }), { x, z: back + fill / 2, uv: woodUV('y', r) }));
  }
  g.userData.width = W;
  return g;
}

/** Difusor bidimensional tipo skyline: alturas ∝ (m² + n²) mod p. */
export function skyline(M, { p = 7, cell = 0.085, maxH = 0.2, wood = 'oak', tiles = 1 } = {}) {
  const grid = quadraticResidue2D(p);
  const g = new THREE.Group();
  const r = rng(p * 13 + tiles);
  const side = p * cell * tiles;
  const back = 0.012;
  const tints = [0xffffff, 0xf4eadc, 0xe9dcc8, 0xfbf3e6, 0xeee0cb];
  g.add(box(side + 0.012, side + 0.012, back, M.wood(wood, 1), { z: back / 2, uv: woodUV('y', r) }));
  for (let m = 0; m < p * tiles; m++) {
    for (let n = 0; n < p * tiles; n++) {
      const s = grid[m % p][n % p];
      const hgt = 0.025 + (s / (p - 1)) * maxH;
      const x = -side / 2 + cell / 2 + n * cell;
      const y = -side / 2 + cell / 2 + m * cell;
      const mat = M.wood(wood, Math.floor(r() * 4), { tint: tints[Math.floor(r() * tints.length)] });
      g.add(box(cell - 0.002, cell - 0.002, hgt, mat, { r: 0.003, seg: 1, x, y, z: back + hgt / 2, uv: { grain: 'y', along: 0.9, across: 0.3, offset: [r(), r()] } }));
    }
  }
  g.userData.width = side;
  return g;
}

/** Difusor policilíndrico: segmento de cilindro de madera curvada. */
export function polycylinder(M, { chord = 0.6, sag = 0.13, h = 1.2, wood = 'oak', variant = 0 } = {}) {
  const R = (chord * chord) / (8 * sag) + sag / 2;
  const cy = sag - R;
  const thR = Math.atan2(-cy, chord / 2);
  const shape = new THREE.Shape();
  shape.moveTo(chord / 2, 0);
  shape.absarc(0, cy, R, thR, Math.PI - thR, false);
  shape.lineTo(chord / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 56 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, h / 2, 0);
  // UV: la veta corre vertical; en la cara curva se desarrolla por longitud de arco
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.abs(nor.getY(i)) > 0.9) {
      uv[i * 2] = x / 0.5;
      uv[i * 2 + 1] = z / 0.5;
    } else {
      uv[i * 2] = y / 1.5 + variant * 0.37;
      uv[i * 2 + 1] = (Math.atan2(x, z - cy) * R) / 0.5 + variant * 0.21;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const g = new THREE.Group();
  g.add(lit(new THREE.Mesh(geo, M.wood(wood, variant, { roughness: 0.42 }))));
  g.userData.width = chord;
  return g;
}

/** Trampa de graves de esquina (prisma triangular). Origen en la arista de la esquina, a nivel de piso. */
export function bassTrap(M, { side = 0.44, h = 2.4, color = 0x3d3d47, wood = 'oak' } = {}) {
  const tri = (s) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(s, 0);
    shape.lineTo(0, -s);
    shape.closePath();
    return shape;
  };
  const g = new THREE.Group();
  const capH = 0.018;
  const body = new THREE.ExtrudeGeometry(tri(side), { depth: h - 2 * capH, bevelEnabled: false });
  body.rotateX(-Math.PI / 2);
  body.translate(0, capH, 0);
  projectUV(body, FABRIC_UV);
  g.add(lit(new THREE.Mesh(body, M.fabric(color))));
  for (const y of [0, h - capH]) {
    const cap = new THREE.ExtrudeGeometry(tri(side + 0.02), { depth: capH, bevelEnabled: false });
    cap.rotateX(-Math.PI / 2);
    cap.translate(0, y, 0);
    projectUV(cap, { grain: 'x', along: 1.5, across: 0.5 });
    g.add(lit(new THREE.Mesh(cap, M.wood(wood, 3))));
  }
  return g;
}

/** Panel de listones de madera sobre fieltro (absorbente ranurado). */
export function slatWall(M, { w = 2.4, h = 2.2, slat = 0.027, gap = 0.014, depth = 0.022, wood = 'oak', felt = 0x26262b } = {}) {
  const g = new THREE.Group();
  const r = rng(Math.round(w * 100));
  g.add(box(w, h, 0.012, M.fabric(felt), { z: 0.006, uv: FABRIC_UV }));
  const pitch = slat + gap;
  const count = Math.floor((w + gap) / pitch);
  const x0 = -((count - 1) * pitch) / 2;
  for (let i = 0; i < count; i++) {
    g.add(box(slat, h, depth, M.wood(wood, i % 4), { r: 0.002, seg: 1, x: x0 + i * pitch, z: 0.012 + depth / 2, uv: woodUV('y', r) }));
  }
  return g;
}

/** Nube absorbente suspendida. En montaje de techo se coloca en `y = H - drop`; los tensores suben `drop` metros exactos hasta el techo. */
export function cloud(M, { w = 1.2, d = 0.8, t = 0.06, color = 0xe8e2d6, drop = 0.4 } = {}) {
  const g = new THREE.Group();
  const safeDrop = Math.max(0.05, Number(drop) || 0.4);
  g.add(box(w, t, d, M.fabric(color), { r: 0.014, uv: { grain: 'x', along: 0.22, across: 0.22 } }));
  const wire = M.metal(0x9a9aa2, { roughness: 0.3 });
  const wireLen = Math.max(0.02, safeDrop - t / 2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wx = sx * (w / 2 - 0.09);
      const wz = sz * (d / 2 - 0.09);
      g.add(cyl(0.0028, 0.0028, wireLen, wire, { seg: 6, x: wx, y: t / 2 + wireLen / 2, z: wz }));
      g.add(cyl(0.012, 0.012, 0.008, wire, { seg: 12, x: wx, y: t / 2 + 0.004, z: wz }));
      g.add(cyl(0.014, 0.014, 0.008, wire, { seg: 12, x: wx, y: safeDrop - 0.004, z: wz }));
    }
  }
  return g;
}

/** Bafles verticales colgantes. En montaje de techo (`y = H - drop`), el borde superior del bafle queda a `drop` metros bajo el techo y los cables suben hasta `H`. */
export function baffles(M, { count = 6, len = 1.4, h = 0.32, t = 0.04, pitch = 0.36, colors = [0x7a6bd1], drop = 0.3 } = {}) {
  const g = new THREE.Group();
  const safeDrop = Math.max(0.04, Number(drop) || 0.3);
  const wire = M.metal(0x9a9aa2, { roughness: 0.3 });
  for (let i = 0; i < count; i++) {
    const z = (i - (count - 1) / 2) * pitch;
    g.add(box(len, h, t, M.fabric(colors[i % colors.length]), { r: 0.012, y: -h / 2, z, uv: FABRIC_UV }));
    for (const sx of [-1, 1]) {
      const wx = sx * (len / 2 - 0.12);
      g.add(cyl(0.0025, 0.0025, safeDrop, wire, { seg: 6, x: wx, y: safeDrop / 2, z }));
      g.add(cyl(0.01, 0.01, 0.008, wire, { seg: 10, x: wx, y: safeDrop - 0.004, z }));
    }
  }
  return g;
}

/** Mosaico hexagonal de fieltro para pared. */
export function hexTiles(M, { cols = 7, rows = 4, radius = 0.2, colors, seed = 9, skip = 0.14 } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const dx = radius * Math.sqrt(3);
  const dy = radius * 1.5;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (r() < skip) continue;
      const x = (col - (cols - 1) / 2) * dx + (row % 2 ? dx / 2 : 0);
      const y = (row - (rows - 1) / 2) * dy;
      const t = 0.022 + (r() < 0.3 ? 0.02 : 0);
      const tile = cyl(radius - 0.006, radius - 0.006, t, M.fabric(colors[Math.floor(r() * colors.length)]), { seg: 6, x, y, z: t / 2 + 0.004, rx: Math.PI / 2 });
      g.add(tile);
    }
  }
  return g;
}

/* ================================================================== RECINTO */

/**
 * Cascarón en corte: piso + pared del fondo (z = −D/2) + pared izquierda (x = −W/2).
 * El interior queda entre x ∈ [−W/2, W/2], z ∈ [−D/2, D/2], y ∈ [0, H].
 */
export function roomShell(M, { W, D, H, wall = 0xf1eee8, floor = 'planks', floorColor = 0x8d8a86, t = 0.13, cut = 0x3a3842, skirting = 0xfaf9f6 } = {}) {
  const g = new THREE.Group();
  const paint = M.paint(wall);
  const slabH = 0.16;
  g.add(box(W + t, slabH, D + t, M.paint(0xdedbd4), { x: -t / 2, y: -slabH / 2 - 0.02, z: -t / 2 }));
  const finish = floor === 'planks' ? M.planks('oak') : floor === 'walnut' ? M.planks('walnut') : M.fabric(floorColor, { bump: 1.1 });
  const uv = floor === 'carpet' ? { grain: 'x', along: 0.3, across: 0.3 } : { grain: 'x', along: 2.8, across: 2.8 };
  g.add(box(W, 0.02, D, finish, { y: -0.01, uv }));
  g.add(box(W + t, H, t, paint, { x: -t / 2, y: H / 2, z: -D / 2 - t / 2 }));
  g.add(box(t, H, D, paint, { x: -W / 2 - t / 2, y: H / 2, z: 0 }));
  // Remate de las caras cortadas
  const capMat = M.plastic(cut, { roughness: 0.7 });
  g.add(box(W + t, 0.012, t, capMat, { x: -t / 2, y: H + 0.006, z: -D / 2 - t / 2 }));
  g.add(box(t, 0.012, D, capMat, { x: -W / 2 - t / 2, y: H + 0.006, z: 0 }));
  g.add(box(0.012, H, t, capMat, { x: W / 2 + 0.006, y: H / 2, z: -D / 2 - t / 2 }));
  g.add(box(t, H, 0.012, capMat, { x: -W / 2 - t / 2, y: H / 2, z: D / 2 + 0.006 }));
  // Zócalos
  const skirt = M.paint(skirting, { roughness: 0.6 });
  g.add(box(W, 0.08, 0.014, skirt, { y: 0.04, z: -D / 2 + 0.007 }));
  g.add(box(0.014, 0.08, D, skirt, { x: -W / 2 + 0.007, y: 0.04 }));
  return g;
}

/* ================================================================ MOBILIARIO */

export function desk(M, { w = 1.9, d = 0.82, h = 0.74, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const r = rng(7);
  const top = M.wood(wood, 2);
  const metal = M.metal(0x26262b);
  g.add(box(w, 0.036, d, top, { r: 0.008, y: h - 0.018, uv: woodUV('x', r) }));
  const legH = h - 0.036;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(box(0.05, legH, 0.05, metal, { x: sx * (w / 2 - 0.09), y: legH / 2, z: sz * (d / 2 - 0.08) }));
    g.add(box(0.05, 0.05, d - 0.16, metal, { x: sx * (w / 2 - 0.09), y: legH - 0.025 }));
  }
  g.add(box(w - 0.18, 0.05, 0.03, metal, { y: legH - 0.025, z: -(d / 2 - 0.08) }));
  // Repisa elevada para pantallas
  const shelfZ = -(d / 2 - 0.18);
  g.add(box(w * 0.74, 0.028, 0.32, top, { r: 0.006, y: h + 0.114, z: shelfZ, uv: woodUV('x', r) }));
  for (const sx of [-1, 1]) g.add(box(0.03, 0.1, 0.28, top, { x: sx * (w * 0.37 - 0.06), y: h + 0.05, z: shelfZ, uv: woodUV('z', r) }));
  // Teclado, controlador e interfaz
  const dark = M.plastic(0x1e1e22, { roughness: 0.5 });
  g.add(box(0.46, 0.018, 0.15, dark, { r: 0.006, x: -0.12, y: h + 0.009, z: 0.16 }));
  g.add(box(0.07, 0.022, 0.11, M.plastic(0xdcdce2), { r: 0.01, x: 0.26, y: h + 0.011, z: 0.17 }));
  g.add(box(0.3, 0.035, 0.2, dark, { r: 0.008, x: 0.62, y: h + 0.0175, z: 0.08 }));
  for (let i = 0; i < 4; i++) g.add(cyl(0.014, 0.014, 0.02, M.plastic(0xc9c9d0), { seg: 16, x: 0.53 + i * 0.06, y: h + 0.045, z: 0.05 }));
  g.add(box(0.2, 0.004, 0.06, M.glow(0x8767f9, 1.4), { x: 0.62, y: h + 0.037, z: 0.14 }));
  return g;
}

/** Pantalla con soporte; la imagen mira hacia +Z. Origen en la base del soporte. */
export function display(M, { w = 0.92, h = 0.39, kind = 'daw', glow = 1.15 } = {}) {
  const g = new THREE.Group();
  const dark = M.plastic(0x18181c, { roughness: 0.4 });
  g.add(box(0.28, 0.012, 0.19, dark, { r: 0.004, y: 0.006 }));
  g.add(box(0.045, 0.17, 0.03, dark, { y: 0.09, z: -0.04 }));
  const cy = 0.13 + h / 2;
  g.add(box(w, h, 0.024, dark, { r: 0.008, y: cy, z: -0.02 }));
  g.add(box(w - 0.02, h - 0.02, 0.002, M.screen(kind, glow), { y: cy, z: -0.007 }));
  return g;
}

/** Monitor de estudio (altavoz de campo cercano) mirando hacia +Z. Origen en su base. */
export function studioMonitor(M) {
  const g = new THREE.Group();
  g.add(box(0.21, 0.33, 0.27, M.plastic(0x2b2b31, { roughness: 0.62 }), { r: 0.02, seg: 3, y: 0.165 }));
  const front = 0.136;
  const rubber = M.plastic(0x121214, { roughness: 0.8 });
  const ring = lit(new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.009, 12, 40), rubber));
  ring.position.set(0, 0.125, front);
  g.add(ring);
  g.add(cyl(0.062, 0.022, 0.022, M.plastic(0xb9b9c2, { roughness: 0.45 }), { seg: 40, y: 0.125, z: front - 0.008, rx: Math.PI / 2 }));
  g.add(ball(0.024, rubber, { y: 0.125, z: front - 0.014, sz: 0.5 }));
  g.add(cyl(0.026, 0.026, 0.006, rubber, { seg: 32, y: 0.262, z: front, rx: Math.PI / 2 }));
  g.add(ball(0.013, M.plastic(0xc9c9d0, { roughness: 0.3 }), { y: 0.262, z: front + 0.002, sz: 0.6 }));
  g.add(ball(0.004, M.glow(0x8767f9, 3), { x: 0.075, y: 0.03, z: front }));
  return g;
}

export function speakerStand(M, { h = 0.9 } = {}) {
  const metal = M.metal(0x222226);
  return group([
    box(0.3, 0.02, 0.3, metal, { r: 0.004, y: 0.01 }),
    box(0.06, h - 0.032, 0.06, metal, { y: (h - 0.032) / 2 + 0.02 }),
    box(0.23, 0.012, 0.27, metal, { r: 0.003, y: h - 0.006 }),
  ]);
}

/** Silla de trabajo; el respaldo queda hacia +Z. */
export function taskChair(M, { color = 0x35353d } = {}) {
  const g = new THREE.Group();
  const f = M.fabric(color);
  const metal = M.metal(0x2a2a2f);
  g.add(box(0.5, 0.075, 0.48, f, { r: 0.03, seg: 3, y: 0.49, uv: FABRIC_UV }));
  g.add(box(0.46, 0.52, 0.06, f, { r: 0.03, seg: 3, y: 0.84, z: 0.25, rx: 0.14, uv: FABRIC_UV }));
  g.add(cyl(0.026, 0.026, 0.32, metal, { y: 0.29 }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(box(0.3, 0.026, 0.04, metal, { r: 0.008, x: Math.cos(a) * 0.15, y: 0.1, z: Math.sin(a) * 0.15, ry: -a }));
    g.add(ball(0.03, M.plastic(0x141416), { x: Math.cos(a) * 0.3, y: 0.03, z: Math.sin(a) * 0.3 }));
  }
  return g;
}

/** Sofá de dos puestos; el frente mira hacia −Z. */
export function sofa(M, { w = 1.8, color = 0xd6cfc1, pillows = [0xd9a441, 0x8f80dd] } = {}) {
  const g = new THREE.Group();
  const f = M.fabric(color, { bump: 0.9 });
  const o = { uv: FABRIC_UV, seg: 3 };
  g.add(box(w, 0.2, 0.86, f, { ...o, r: 0.04, y: 0.22 }));
  g.add(box(w, 0.5, 0.2, f, { ...o, r: 0.07, y: 0.52, z: 0.33 }));
  for (const sx of [-1, 1]) g.add(box(0.2, 0.42, 0.86, f, { ...o, r: 0.07, x: sx * (w / 2 - 0.1), y: 0.4 }));
  const cw = (w - 0.44) / 2 - 0.006;
  for (const sx of [-1, 1]) {
    g.add(box(cw, 0.15, 0.62, f, { ...o, r: 0.055, x: sx * (cw / 2 + 0.003), y: 0.395, z: -0.07 }));
    g.add(box(cw, 0.36, 0.15, f, { ...o, r: 0.06, x: sx * (cw / 2 + 0.003), y: 0.63, z: 0.2, rx: 0.16 }));
  }
  const leg = M.wood('walnut', 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.02, 0.014, 0.12, leg, { seg: 14, x: sx * (w / 2 - 0.1), y: 0.06, z: sz * 0.36 }));
  if (pillows[0]) g.add(box(0.38, 0.38, 0.11, M.fabric(pillows[0], { bump: 0.9 }), { ...o, r: 0.05, x: -cw * 0.62, y: 0.64, z: 0.06, rx: 0.32, rz: 0.12 }));
  if (pillows[1]) g.add(box(0.34, 0.34, 0.1, M.fabric(pillows[1], { bump: 0.9 }), { ...o, r: 0.05, x: cw * 0.7, y: 0.62, z: 0.07, rx: 0.3, rz: -0.18 }));
  return g;
}

export function rug(M, { w = 2.6, d = 1.8, color = 0xd9d4ca } = {}) {
  return box(w, 0.014, d, M.fabric(color, { bump: 1.4 }), { r: 0.006, seg: 1, y: 0.007, uv: { grain: 'x', along: 0.35, across: 0.35 } });
}

export function floorLamp(M, { glow = 0.7 } = {}) {
  const metal = M.metal(0x2a2a2f);
  const shade = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.9, emissive: 0xffd9a0, emissiveIntensity: glow });
  return group([
    cyl(0.15, 0.15, 0.02, metal, { seg: 40, y: 0.01 }),
    cyl(0.011, 0.011, 1.46, metal, { seg: 12, y: 0.75 }),
    cyl(0.15, 0.2, 0.27, shade, { seg: 40, y: 1.58 }),
  ]);
}

export function plant(M, { h = 1.5, pot = 0xebe6dc, seed = 3 } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  g.add(cyl(0.19, 0.14, 0.36, M.paint(pot, { roughness: 0.55 }), { seg: 40, y: 0.18 }));
  g.add(cyl(0.176, 0.176, 0.02, M.plastic(0x3b2d22, { roughness: 1 }), { seg: 40, y: 0.352 }));
  g.add(cyl(0.012, 0.02, h - 0.36, M.plastic(0x6a5340, { roughness: 0.9 }), { seg: 10, y: 0.36 + (h - 0.36) / 2 }));
  const greens = [0x4f8a57, 0x5d9a62, 0x447a4f, 0x6aa56a];
  const leafGeo = new THREE.SphereGeometry(1, 18, 10);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const ang = i * 2.39996;
    const len = 0.34 - 0.14 * t + r() * 0.04;
    const leaf = lit(new THREE.Mesh(leafGeo, M.leaf(greens[i % greens.length])));
    leaf.scale.set(len * 0.42, 0.01, len * 0.5);
    leaf.rotation.set(-(0.35 + 0.5 * t + r() * 0.2), ang, 0, 'YXZ');
    const reach = len * 0.52;
    leaf.position.set(Math.sin(ang) * reach, 0.6 + t * (h - 0.62), Math.cos(ang) * reach);
    g.add(leaf);
  }
  return g;
}

/** Mueble bajo con objetos decorativos. El frente mira hacia +Z. */
export function sideboard(M, { w = 1.5, h = 0.52, d = 0.42, wood = 'walnut' } = {}) {
  const g = new THREE.Group();
  const r = rng(17);
  const m = M.wood(wood, 1);
  g.add(box(w, h, d, m, { r: 0.008, y: 0.14 + h / 2, uv: woodUV('x', r) }));
  const seam = M.plastic(0x1a1210, { roughness: 1 });
  for (const x of [-w / 6, w / 6]) g.add(box(0.004, h - 0.04, 0.004, seam, { x, y: 0.14 + h / 2, z: d / 2 }));
  const leg = M.metal(0x26262b);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.014, 0.014, 0.14, leg, { seg: 12, x: sx * (w / 2 - 0.1), y: 0.07, z: sz * (d / 2 - 0.07) }));
  const top = 0.14 + h;
  // libros apilados + jarrón + parlante pequeño
  const books = [0x8f80dd, 0xd9a441, 0xe9e2d3, 0x3d3d47];
  books.forEach((c, i) => g.add(box(0.24 - i * 0.012, 0.028, 0.17, M.paint(c, { roughness: 0.7 }), { r: 0.003, seg: 1, x: -w / 2 + 0.26, y: top + 0.014 + i * 0.028, z: 0, ry: (i - 1.5) * 0.06 })));
  g.add(cyl(0.05, 0.075, 0.24, M.paint(0xe9e4da, { roughness: 0.4 }), { seg: 32, x: w / 2 - 0.25, y: top + 0.12 }));
  g.add(cyl(0.03, 0.05, 0.05, M.paint(0xe9e4da, { roughness: 0.4 }), { seg: 32, x: w / 2 - 0.25, y: top + 0.265 }));
  return g;
}

/* --------------------------------------------------------------- cine en casa */

/** Fila de butacas reclinables; el frente mira hacia −Z. */
export function cinemaRow(M, { seats = 3, color = 0x4a3f55 } = {}) {
  const g = new THREE.Group();
  const f = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 });
  const sw = 0.62;
  const arm = 0.14;
  const total = seats * sw + (seats + 1) * arm;
  for (let i = 0; i <= seats; i++) {
    const x = -total / 2 + arm / 2 + i * (sw + arm);
    g.add(box(arm, 0.58, 0.9, f, { r: 0.05, seg: 3, x, y: 0.29 }));
    if (i < seats) {
      const cx = x + arm / 2 + sw / 2;
      g.add(box(sw - 0.01, 0.3, 0.74, f, { r: 0.06, seg: 3, x: cx, y: 0.27, z: -0.06 }));
      g.add(box(sw - 0.01, 0.74, 0.2, f, { r: 0.07, seg: 3, x: cx, y: 0.66, z: 0.34, rx: 0.2 }));
      g.add(box(sw - 0.1, 0.2, 0.13, f, { r: 0.05, seg: 3, x: cx, y: 1.0, z: 0.41, rx: 0.2 }));
    }
  }
  g.userData.width = total;
  return g;
}

export function towerSpeaker(M, { h = 1.05 } = {}) {
  const g = new THREE.Group();
  g.add(box(0.22, h, 0.3, M.plastic(0x1d1d21, { roughness: 0.5 }), { r: 0.015, seg: 3, y: h / 2 }));
  const cone = M.plastic(0x8d8d96, { roughness: 0.45 });
  const rubber = M.plastic(0x0f0f11, { roughness: 0.8 });
  [0.3, 0.52, 0.74].forEach((t) => {
    const ring = lit(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.009, 10, 36), rubber));
    ring.position.set(0, h * t, 0.151);
    g.add(ring);
    g.add(cyl(0.064, 0.02, 0.02, cone, { seg: 36, y: h * t, z: 0.143, rx: Math.PI / 2 }));
  });
  g.add(cyl(0.024, 0.024, 0.006, rubber, { seg: 28, y: h * 0.9, z: 0.151, rx: Math.PI / 2 }));
  return g;
}

/* ----------------------------------------------------------- sala de reuniones */

export function meetingTable(M, { w = 3.0, d = 1.15, h = 0.74, wood = 'oak', withChairs = false, chairColor = 0x3b3b45 } = {}) {
  const g = new THREE.Group();
  const r = rng(5);
  const woodMat = M.wood(wood, 2);
  g.add(box(w, 0.042, d, woodMat, { r: 0.012, y: h - 0.021, uv: woodUV('x', r) }));
  const leg = M.plastic(0x2b2b31, { roughness: 0.6 });
  const silver = M.metal(0x94a3b8, { roughness: 0.35 });

  // Pedestales adaptativos según el largo de la mesa (si es muy larga añade pedestal central)
  const legSpan = Math.max(0.45, w / 2 - 0.42);
  const legPositions = w > 3.8 ? [-legSpan, 0, legSpan] : [-legSpan, legSpan];
  legPositions.forEach((lx) => {
    g.add(box(0.08, h - 0.04, d * 0.62, leg, { r: 0.01, x: lx, y: (h - 0.04) / 2 }));
    g.add(box(0.18, 0.022, d * 0.72, leg, { r: 0.006, x: lx, y: 0.011 }));
  });
  g.add(box(Math.max(0.4, w - 0.75), 0.06, 0.06, leg, { y: h - 0.1 }));

  // Cajas multimedia de conexiones en el centro de la mesa
  const hatchCount = Math.max(1, Math.floor(w / 1.6));
  for (let i = 0; i < hatchCount; i++) {
    const hx = (i - (hatchCount - 1) / 2) * (w / (hatchCount + 0.4));
    g.add(box(0.28, 0.006, 0.12, silver, { r: 0.002, x: hx, y: h + 0.002 }));
  }

  // Si se activa con sillas integradas, genera sillas proporcionalmente al largo `w`
  if (withChairs) {
    const perSide = Math.max(2, Math.floor((w - 0.35) / 0.72));
    const spacing = (w - 0.55) / Math.max(1, perSide - 1);
    for (let i = 0; i < perSide; i++) {
      const cx = perSide === 1 ? 0 : -(w - 0.55) / 2 + i * spacing;
      g.add(place(shellChair(M, { color: chairColor }), { x: cx, z: d / 2 + 0.32, ry: 0 }));
      g.add(place(shellChair(M, { color: chairColor }), { x: cx, z: -(d / 2 + 0.32), ry: Math.PI }));
    }
    // Sillas de cabecera en ambos extremos
    g.add(place(shellChair(M, { color: chairColor }), { x: w / 2 + 0.34, z: 0, ry: Math.PI / 2 }));
    g.add(place(shellChair(M, { color: chairColor }), { x: -(w / 2 + 0.34), z: 0, ry: -Math.PI / 2 }));
  }

  g.userData.width = w;
  g.userData.surfaceHeights = [h];
  return g;
}

/** Silla de reunión; el respaldo queda hacia +Z. */
export function shellChair(M, { color = 0x8f80dd } = {}) {
  const g = new THREE.Group();
  const shell = M.plastic(color, { roughness: 0.6 });
  const metal = M.metal(0x2a2a2f);
  g.add(box(0.46, 0.05, 0.44, shell, { r: 0.022, seg: 3, y: 0.46 }));
  g.add(box(0.44, 0.36, 0.045, shell, { r: 0.022, seg: 3, y: 0.7, z: 0.22, rx: 0.16 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.011, 0.011, 0.45, metal, { seg: 10, x: sx * 0.19, y: 0.225, z: sz * 0.18, rz: sx * -0.06, rx: sz * 0.06 }));
  return g;
}

export function pendant(M, { drop = 0.6, glow = 1.2 } = {}) {
  const shade = M.metal(0x2a2a2f, { roughness: 0.5 });
  return group([
    cyl(0.003, 0.003, drop, shade, { seg: 6, y: drop / 2 + 0.16 }),
    cyl(0.05, 0.16, 0.16, shade, { seg: 40, y: 0.08 }),
    cyl(0.14, 0.14, 0.006, M.glow(0xffe2b5, glow), { seg: 40, y: 0.004 }),
  ]);
}

/** Pantalla mural (TV / proyección). Origen en el plano de la pared, centrada. */
export function wallScreen(M, { w = 1.7, h = 0.96, kind = 'chart', glow = 1 } = {}) {
  return group([
    box(w, h, 0.04, M.plastic(0x141417, { roughness: 0.4 }), { r: 0.008, z: 0.03 }),
    box(w - 0.03, h - 0.03, 0.002, M.screen(kind, glow), { z: 0.051 }),
  ]);
}

/* ------------------------------------------------------------------ extras */

export function coffeeTable(M, { r = 0.4, h = 0.36, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  g.add(cyl(r, r, 0.03, M.wood(wood, 2), { seg: 64, y: h - 0.015 }));
  const leg = M.metal(0x26262b);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    g.add(cyl(0.012, 0.012, h - 0.03, leg, { seg: 10, x: Math.cos(a) * r * 0.62, y: (h - 0.03) / 2, z: Math.sin(a) * r * 0.62 }));
  }
  g.add(cyl(0.06, 0.045, 0.09, M.paint(0xebe6dc, { roughness: 0.5 }), { seg: 28, x: 0.08, y: h + 0.045, z: -0.05 }));
  return g;
}

export function roundRug(M, { r = 0.95, color = 0xe3d6b8 } = {}) {
  const mesh = cyl(r, r, 0.012, M.fabric(color, { bump: 1.4 }), { seg: 72, y: 0.006 });
  projectUV(mesh.geometry, { grain: 'x', along: 0.35, across: 0.35 });
  return mesh;
}

/** Puf cilíndrico tapizado. */
export function pouf(M, { r = 0.24, h = 0.38, color = 0xd9a441 } = {}) {
  const pts = [];
  const c = 0.06;
  pts.push(new THREE.Vector2(0, 0));
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, c + Math.sin(a) * c));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, h - c + Math.sin(a) * c));
  }
  pts.push(new THREE.Vector2(0, h));
  const geo = new THREE.LatheGeometry(pts, 48);
  projectUV(geo, FABRIC_UV);
  return lit(new THREE.Mesh(geo, M.fabric(color, { bump: 0.9 })));
}

/** Teclado en soporte de tijera. Las teclas quedan hacia +Z. */
export function keyboardStand(M) {
  const g = new THREE.Group();
  const dark = M.plastic(0x1c1c20, { roughness: 0.5 });
  const metal = M.metal(0x2a2a2f);
  const top = 0.74;
  g.add(box(1.32, 0.085, 0.3, dark, { r: 0.012, y: top + 0.043 }));
  g.add(box(1.24, 0.014, 0.115, M.plastic(0xf2f2f4, { roughness: 0.35 }), { y: top + 0.09, z: 0.085 }));
  const pattern = [1, 1, 0, 1, 1, 1, 0];
  const keyW = 1.24 / 36;
  for (let i = 0; i < 35; i++) {
    if (!pattern[i % 7]) continue;
    g.add(box(keyW * 0.55, 0.012, 0.07, dark, { x: -0.62 + (i + 1) * keyW, y: top + 0.102, z: 0.064 }));
  }
  for (const s of [-1, 1]) {
    g.add(box(0.03, 0.98, 0.03, metal, { y: 0.37, z: 0, rz: s * 0.72 }));
    g.add(box(0.03, 0.03, 0.34, metal, { x: s * 0.32, y: 0.015 }));
    g.add(box(0.03, 0.03, 0.3, metal, { x: s * 0.32, y: top - 0.015 }));
  }
  return g;
}

/** Tira LED (caja emisiva delgada). */
export function ledStrip(M, { len = 1, color = 0xffc98a, intensity = 4, vertical = false, t = 0.012 } = {}) {
  const mesh = vertical ? box(t, len, t, M.glow(color, intensity)) : box(len, t, t, M.glow(color, intensity));
  mesh.castShadow = false;
  return mesh;
}


/* ===================================================== DIFUSORES A MEDIDA */
/* Construidos con las dimensiones exactas que entrega `designDiffuser` de la suite. */

/** Difusor de ranuras (QRD 1D, PRD o MLS): aletas de espesor T y fondos a la profundidad dₙ. */
export function diffuserFromDesign1D(M, design, { wood = 'oak' } = {}) {
  const { W, T, depths, periods } = design;
  const h = design.totalDepth || 0.6;
  const depth = Math.max(design.maxDepth, 0.02);
  const fin = Math.max(T, 0);
  const n = depths.length * periods;
  const total = n * (W + fin) + fin;
  const back = 0.012;
  const cap = 0.014;
  const g = new THREE.Group();
  const r = rng(n * 7 + 3);
  g.add(box(total, h, back, M.wood(wood, 1), { z: back / 2, uv: woodUV('y', r) }));
  for (const sy of [-1, 1]) g.add(box(total, cap, depth, M.wood(wood, 2), { y: sy * (h / 2 - cap / 2), z: back + depth / 2, uv: woodUV('x', r) }));
  if (fin > 0.0005) {
    for (let i = 0; i <= n; i++) {
      g.add(box(fin, h - 2 * cap, depth, M.wood(wood, i % 4), { x: -total / 2 + fin / 2 + i * (W + fin), z: back + depth / 2, uv: woodUV('y', r) }));
    }
  }
  for (let i = 0; i < n; i++) {
    const fill = depth - depths[i % depths.length];
    if (fill < 0.002) continue;
    const x = -total / 2 + fin + W / 2 + i * (W + fin);
    g.add(box(W, h - 2 * cap, fill, M.wood(wood, (i * 3) % 4, { tint: i % 2 ? 0xffffff : 0xf3ece2 }), { x, z: back + fill / 2, uv: woodUV('y', r) }));
  }
  g.userData.width = total;
  g.userData.height = h;
  return g;
}

/** Difusor bidimensional: bloques con la altura que deja cada profundidad dₘₙ (vista skyline). */
export function diffuserFromDesign2D(M, design, { wood = 'oak' } = {}) {
  const { W, T, depths2D, periods } = design;
  const pitch = W + T;
  const p = depths2D.length;
  const cells = p * periods;
  const side = cells * pitch;
  const back = 0.012;
  const depth = Math.max(design.maxDepth, 0.02);
  const g = new THREE.Group();
  const r = rng(p * 31 + periods);
  g.add(box(side + 0.012, side + 0.012, back, M.wood(wood, 1), { z: back / 2, uv: woodUV('y', r) }));
  // Una sola malla instanciada: admite miles de bloques sin miles de llamadas de dibujo
  const geo = new RoundedBoxGeometry(1, 1, 1, 1, 0.03);
  projectUV(geo, { grain: 'y', along: 6, across: 2.2 });
  const mesh = new THREE.InstancedMesh(geo, M.wood(wood, 0), cells * cells);
  const dummy = new THREE.Object3D();
  const tints = [0xffffff, 0xf4eadc, 0xe9dcc8, 0xfbf3e6, 0xeee0cb];
  const color = new THREE.Color();
  let k = 0;
  for (let m = 0; m < cells; m++) {
    for (let n = 0; n < cells; n++) {
      const hgt = 0.02 + (depth - depths2D[m % p][n % p]);
      dummy.position.set(-side / 2 + pitch / 2 + n * pitch, -side / 2 + pitch / 2 + m * pitch, back + hgt / 2);
      dummy.scale.set(Math.max(0.004, pitch - Math.max(T, 0.002)), Math.max(0.004, pitch - Math.max(T, 0.002)), hgt);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      mesh.setColorAt(k, color.setHex(tints[Math.floor(r() * tints.length)]));
      k++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Caja envolvente de las instancias, para el encuadre de sombras y cámara
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  g.add(mesh);
  g.userData.width = side;
  g.userData.height = side;
  return g;
}

/** Batería de policilindros con la cuerda, la flecha y la cantidad del diseño. */
export function diffuserFromDesignPoly(M, design, { wood = 'oak' } = {}) {
  const h = design.totalDepth || 0.6;
  const g = new THREE.Group();
  for (let i = 0; i < design.count; i++) {
    g.add(place(polycylinder(M, { chord: design.chord, sag: Math.max(design.sagitta, 0.004), h, wood, variant: i }), { x: (i - (design.count - 1) / 2) * design.chord }));
  }
  g.add(box(design.totalWidth, h, 0.012, M.wood(wood, 1), { z: -0.006, uv: woodUV('y', rng(5)) }));
  g.userData.width = design.totalWidth;
  g.userData.height = h;
  return g;
}

export function diffuserFromDesign(M, design, opts) {
  if (design.type === 'poly') return diffuserFromDesignPoly(M, design, opts);
  if (design.type === 'qrd2d') return diffuserFromDesign2D(M, design, opts);
  return diffuserFromDesign1D(M, design, opts);
}

/* ============================================ NUEVOS PANELES Y DIFUSORES 3D */

/** Espuma acústica piramidal 3D (celda abierta con relieve piramidal). */
export function foamPyramidPanel(M, { w = 0.6, h = 0.6, t = 0.05, color = 0x3b3b45 } = {}) {
  const g = new THREE.Group();
  const baseT = Math.max(0.014, t * 0.35);
  const tipH = Math.max(0.018, t - baseT);
  const mat = M.fabric(color, { bump: 0.7 });
  g.add(box(w, h, baseT, mat, { r: 0.004, z: baseT / 2, uv: FABRIC_UV }));

  const cell = 0.075;
  const cols = Math.max(2, Math.round(w / cell));
  const rows = Math.max(2, Math.round(h / cell));
  const cw = w / cols;
  const ch = h / rows;

  // Malla instanciada de pirámides (cono de 4 lados rotado 45°)
  const pyrGeo = new THREE.ConeGeometry(( Math.min(cw, ch) * 0.94 ) / Math.SQRT2, tipH, 4);
  pyrGeo.rotateY(Math.PI / 4);
  pyrGeo.rotateX(Math.PI / 2);
  const inst = new THREE.InstancedMesh(pyrGeo, mat, cols * rows);
  const dummy = new THREE.Object3D();
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + cw * (c + 0.5);
      const y = -h / 2 + ch * (r + 0.5);
      dummy.position.set(x, y, baseT + tipH / 2);
      dummy.updateMatrix();
      inst.setMatrixAt(k++, dummy.matrix);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  inst.computeBoundingBox();
  inst.computeBoundingSphere();
  g.add(inst);
  return g;
}

/** Panel resonador de Helmholtz de madera perforada / ranurada con velo acústico interior. */
export function perforatedPanel(M, { w = 0.9, h = 1.2, t = 0.06, wood = 'oak', felt = 0x1e1e24 } = {}) {
  const g = new THREE.Group();
  const r = rng(43);
  const woodMat = M.wood(wood, 2);
  const feltMat = M.fabric(felt, { bump: 0.5 });

  // Fondo fonoabsorbente oscuro
  g.add(box(w - 0.01, h - 0.01, t * 0.75, feltMat, { z: (t * 0.75) / 2, uv: FABRIC_UV }));

  // Marco perimetral de madera
  const f = 0.025;
  g.add(box(w, f, t, woodMat, { y: h / 2 - f / 2, z: t / 2, uv: woodUV('x', r) }));
  g.add(box(w, f, t, woodMat, { y: -h / 2 + f / 2, z: t / 2, uv: woodUV('x', r) }));
  g.add(box(f, h - 2 * f, t, woodMat, { x: w / 2 - f / 2, z: t / 2, uv: woodUV('y', r) }));
  g.add(box(f, h - 2 * f, t, woodMat, { x: -w / 2 + f / 2, z: t / 2, uv: woodUV('y', r) }));

  // Placa frontal ranurada/perforada (bandas horizontales y verticales que dejan ver las ranuras resonantes)
  const innerW = w - 2 * f;
  const innerH = h - 2 * f;
  const bandH = 0.042;
  const slotGap = 0.011;
  const pitch = bandH + slotGap;
  const rows = Math.max(2, Math.floor(innerH / pitch));
  const faceZ = t - 0.008;
  for (let i = 0; i < rows; i++) {
    const y = -innerH / 2 + pitch * (i + 0.5);
    g.add(box(innerW, bandH, 0.014, woodMat, { y, z: faceZ, uv: woodUV('x', r) }));
  }
  // Costillas verticales divisorias
  const cols = Math.max(2, Math.round(innerW / 0.22));
  for (let c = 1; c < cols; c++) {
    const x = -innerW / 2 + (innerW / cols) * c;
    g.add(box(0.016, innerH, 0.015, woodMat, { x, z: faceZ + 0.001, uv: woodUV('y', r) }));
  }
  return g;
}

/** Trampa diafragmática (panel resonante de membrana para bajas frecuencias). */
export function membranePanel(M, { w = 0.6, h = 1.2, t = 0.12, color = 0x3b3b45, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const r = rng(61);
  const frameMat = M.wood(wood, 1);
  const f = 0.028;

  // Caja sellada de madera profunda
  g.add(box(w, f, t, frameMat, { y: h / 2 - f / 2, z: t / 2, uv: woodUV('x', r) }));
  g.add(box(w, f, t, frameMat, { y: -h / 2 + f / 2, z: t / 2, uv: woodUV('x', r) }));
  g.add(box(f, h - 2 * f, t, frameMat, { x: w / 2 - f / 2, z: t / 2, uv: woodUV('y', r) }));
  g.add(box(f, h - 2 * f, t, frameMat, { x: -w / 2 + f / 2, z: t / 2, uv: woodUV('y', r) }));

  // Membrana frontal suspendida ligeramente remetida
  const memMat = M.plastic(color, { roughness: 0.65 });
  g.add(box(w - 2 * f, h - 2 * f, 0.016, memMat, { r: 0.004, z: t - 0.018 }));
  // Bisel interior de sujeción
  g.add(box(w - 2 * f - 0.06, h - 2 * f - 0.06, 0.006, M.fabric(color), { r: 0.004, z: t - 0.008, uv: FABRIC_UV }));
  return g;
}

/** Trampa de graves cilíndrica (Tube Trap) con tapas de madera. */
export function tubeTrap(M, { r = 0.20, h = 1.8, color = 0x7464cc, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const capH = 0.024;
  const bodyH = Math.max(0.2, h - 2 * capH);
  const body = cyl(r, r, bodyH, M.fabric(color, { bump: 0.65 }), { seg: 32, y: capH + bodyH / 2 });
  projectUV(body.geometry, FABRIC_UV);
  g.add(body);

  const woodMat = M.wood(wood, 2);
  g.add(cyl(r + 0.01, r + 0.01, capH, woodMat, { seg: 32, y: capH / 2 }));
  g.add(cyl(r + 0.01, r + 0.01, capH, woodMat, { seg: 32, y: h - capH / 2 }));
  // Anillo cromado superior
  g.add(cyl(0.022, 0.022, 0.015, M.metal(0x8a8a94), { seg: 16, y: h + 0.007 }));
  return g;
}

/** Difusor PRD 1D (Secuencia de Raíz Primitiva). */
export function prdDiffuser(M, { p = 7, periods = 2, well = 0.06, fin = 0.008, h = 1.2, depth = 0.16, wood = 'oak' } = {}) {
  const safeP = [5, 7, 11, 13, 17].includes(Number(p)) ? Number(p) : 7;
  const roots = primitiveRoots(safeP);
  const gRoot = roots[0] || 3;
  const seq = primitiveRootSequence(safeP, gRoot);
  const smax = Math.max(1, ...seq);
  const n = seq.length * periods;
  const W = n * (well + fin) + fin;
  const back = 0.012;
  const cap = 0.014;
  const g = new THREE.Group();
  const r = rng(safeP * 19 + periods);

  g.add(box(W, h, back, M.wood(wood, 1), { z: back / 2, uv: woodUV('y', r) }));
  for (const sy of [-1, 1]) {
    g.add(box(W, cap, depth, M.wood(wood, 2), { y: sy * (h / 2 - cap / 2), z: back + depth / 2, uv: woodUV('x', r) }));
  }
  for (let i = 0; i <= n; i++) {
    const x = -W / 2 + fin / 2 + i * (well + fin);
    g.add(box(fin, h - 2 * cap, depth, M.wood(wood, i % 4), { x, z: back + depth / 2, uv: woodUV('y', r) }));
  }
  for (let i = 0; i < n; i++) {
    const fill = depth - (seq[i % seq.length] / smax) * (depth - 0.012);
    const x = -W / 2 + fin + well / 2 + i * (well + fin);
    g.add(box(well, h - 2 * cap, fill, M.wood(wood, (i * 2) % 4, { tint: i % 2 ? 0xffffff : 0xf2eadf }), { x, z: back + fill / 2, uv: woodUV('y', r) }));
  }
  g.userData.width = W;
  return g;
}

/** Difusor Binario MLS (Secuencia de Longitud Máxima). */
export function mlsDiffuser(M, { order = 3, periods = 2, well = 0.06, fin = 0.006, h = 1.2, depth = 0.10, wood = 'oak' } = {}) {
  const safeOrder = [2, 3, 4].includes(Number(order)) ? Number(order) : 3;
  const seq = mlsSequence(safeOrder);
  const n = seq.length * periods;
  const W = n * (well + fin) + fin;
  const back = 0.012;
  const cap = 0.014;
  const g = new THREE.Group();
  const r = rng(safeOrder * 29 + periods);

  g.add(box(W, h, back, M.wood(wood, 1), { z: back / 2, uv: woodUV('y', r) }));
  for (const sy of [-1, 1]) {
    g.add(box(W, cap, depth, M.wood(wood, 2), { y: sy * (h / 2 - cap / 2), z: back + depth / 2, uv: woodUV('x', r) }));
  }
  for (let i = 0; i <= n; i++) {
    const x = -W / 2 + fin / 2 + i * (well + fin);
    g.add(box(fin, h - 2 * cap, depth, M.wood(wood, i % 4), { x, z: back + depth / 2, uv: woodUV('y', r) }));
  }
  for (let i = 0; i < n; i++) {
    const bit = seq[i % seq.length];
    const fill = bit ? depth : depth * 0.22;
    const x = -W / 2 + fin + well / 2 + i * (well + fin);
    g.add(box(well, h - 2 * cap, fill, M.wood(wood, i % 4, { tint: bit ? 0xffffff : 0xe8dec8 }), { x, z: back + fill / 2, uv: woodUV('y', r) }));
  }
  g.userData.width = W;
  return g;
}

/** Librero / Estantería acústica con libros de distintas profundidades (absorción + difusión). */
export function bookshelf(M, { w = 1.2, h = 1.9, d = 0.36, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const r = rng(73);
  const woodMat = M.wood(wood, 1);
  const t = 0.022;

  // Laterales y respaldo
  g.add(box(t, h, d, woodMat, { x: -w / 2 + t / 2, y: h / 2, uv: woodUV('y', r) }));
  g.add(box(t, h, d, woodMat, { x: w / 2 - t / 2, y: h / 2, uv: woodUV('y', r) }));
  g.add(box(w - 2 * t, h, 0.012, M.wood(wood, 3), { y: h / 2, z: -d / 2 + 0.006, uv: woodUV('y', r) }));

  // Repisas horizontales y libros irregulares
  const shelves = Math.max(3, Math.round(h / 0.38));
  const innerW = w - 2 * t;
  const bookColors = [0x7464cc, 0xd9a441, 0xb9573f, 0x3f7f6b, 0x3d62b8, 0xe9e2d3, 0x3b3b45];

  for (let s = 0; s <= shelves; s++) {
    const sy = t / 2 + (s / shelves) * (h - t);
    g.add(box(innerW, t, d, woodMat, { y: sy, uv: woodUV('x', r) }));

    if (s < shelves) {
      const shelfTop = sy + t / 2;
      const maxBookH = (h - t) / shelves - t - 0.03;
      let bx = -innerW / 2 + 0.03;
      while (bx < innerW / 2 - 0.06) {
        if (r() < 0.14) {
          bx += 0.06 + r() * 0.08;
          continue;
        }
        const bw = 0.024 + r() * 0.032;
        const bh = Math.max(0.14, maxBookH * (0.62 + r() * 0.34));
        const bd = d * (0.55 + r() * 0.35);
        const col = bookColors[Math.floor(r() * bookColors.length)];
        g.add(
          box(bw, bh, bd, M.paint(col, { roughness: 0.75 }), {
            r: 0.003,
            seg: 1,
            x: bx + bw / 2,
            y: shelfTop + bh / 2,
            z: -d / 2 + 0.015 + bd / 2,
          })
        );
        bx += bw + 0.003;
      }
    }
  }
  return g;
}

/** Rack de equipos Pro-Audio 19" con unidades outboard y vúmetros iluminados. */
export function audioRack(M, { w = 0.58, h = 0.95, d = 0.55, wood = 'walnut' } = {}) {
  const g = new THREE.Group();
  const r = rng(89);
  const cabMat = M.wood(wood, 2);
  const darkMetal = M.metal(0x1e1e24, { roughness: 0.45 });
  const silver = M.metal(0xb8b8c2, { roughness: 0.35 });
  const t = 0.024;

  // Gabinete exterior inclinado ligeramente o recto
  g.add(box(t, h, d, cabMat, { x: -w / 2 + t / 2, y: h / 2, uv: woodUV('y', r) }));
  g.add(box(t, h, d, cabMat, { x: w / 2 - t / 2, y: h / 2, uv: woodUV('y', r) }));
  g.add(box(w, t, d, cabMat, { y: h - t / 2, uv: woodUV('x', r) }));
  g.add(box(w, t, d, cabMat, { y: t / 2, uv: woodUV('x', r) }));
  g.add(box(w - 2 * t, h - 2 * t, d - 0.04, M.plastic(0x141418, { roughness: 0.8 }), { y: h / 2, z: -0.01 }));

  // Unidades de rack frontales (compresores, EQ, conversores)
  const units = Math.max(3, Math.floor((h - 0.12) / 0.14));
  const innerW = w - 2 * t - 0.01;
  const frontZ = d / 2 - 0.012;
  for (let u = 0; u < units; u++) {
    const uy = h - 0.10 - u * 0.135;
    const faceMat = u % 3 === 1 ? silver : darkMetal;
    g.add(box(innerW, 0.12, 0.012, faceMat, { r: 0.003, y: uy, z: frontZ }));
    // Vúmetros LED / VU iluminados
    const glowCol = u % 2 === 0 ? 0xffb84d : 0x5fd0c5;
    g.add(box(0.09, 0.045, 0.004, M.glow(glowCol, 1.6), { x: -innerW * 0.24, y: uy, z: frontZ + 0.007 }));
    g.add(box(0.09, 0.045, 0.004, M.glow(glowCol, 1.6), { x: -innerW * 0.02, y: uy, z: frontZ + 0.007 }));
    // Perillas (knobs)
    for (let k = 0; k < 3; k++) {
      g.add(cyl(0.014, 0.014, 0.018, u % 3 === 1 ? darkMetal : silver, { seg: 12, x: innerW * (0.16 + k * 0.11), y: uy, z: frontZ + 0.012, rx: Math.PI / 2 }));
    }
  }
  return g;
}

/** Subwoofer activo de estudio / cine con cono frontal y puerto bass-reflex. */
export function subwoofer(M, { w = 0.42, h = 0.45, d = 0.46 } = {}) {
  const g = new THREE.Group();
  const cab = M.plastic(0x1d1d22, { roughness: 0.55 });
  const rubber = M.plastic(0x101014, { roughness: 0.85 });
  const cone = M.plastic(0x32323a, { roughness: 0.45 });

  g.add(box(w, h, d, cab, { r: 0.018, seg: 2, y: h / 2 }));
  const frontZ = d / 2 + 0.002;
  const r = Math.min(w, h) * 0.34;
  const ring = lit(new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 12, 36), rubber));
  ring.position.set(0, h * 0.56, frontZ);
  g.add(ring);
  g.add(cyl(r * 0.92, r * 0.32, 0.03, cone, { seg: 32, y: h * 0.56, z: frontZ - 0.01, rx: Math.PI / 2 }));
  g.add(ball(r * 0.34, rubber, { y: h * 0.56, z: frontZ - 0.015, sz: 0.45 }));
  // Puerto bass-reflex inferior
  g.add(box(w * 0.62, 0.032, 0.02, M.plastic(0x09090c, { roughness: 0.95 }), { y: 0.065, z: frontZ - 0.006 }));
  g.add(ball(0.005, M.glow(0x8767f9, 2.5), { x: w * 0.36, y: 0.065, z: frontZ }));
  return g;
}

/* ======================================= ELEMENTOS ARQUITECTÓNICOS (PUERTAS, VENTANAS, CORTINAS) */

/**
 * Puerta arquitectónica de tamaño estándar (~0.92 × 2.05 m) visible por AMBOS LADOS de la pared
 * (marco que abraza todo el espesor del muro, hoja centrada, paneles y manijas tanto al interior +Z como al exterior -Z).
 */
export function archDoor(M, { w = 0.92, h = 2.05, wood = 'oak', wallThickness = 0.13 } = {}) {
  const g = new THREE.Group();
  const r = rng(104);
  const frameMat = M.wood(wood, 1, { roughness: 0.48 });
  const leafMat = M.wood(wood, 0, { roughness: 0.52 });
  const handleMat = M.metal(0xd4d4dc, { roughness: 0.22 });
  const darkSeal = M.plastic(0x232329, { roughness: 0.8 });

  const frameW = 0.055;
  const zMid = -wallThickness * 0.5;
  const depth = wallThickness + 0.042;
  const y0 = -h / 2;

  // Jambas laterales y dintel superior abrazando ambos lados de la pared
  g.add(box(frameW, h, depth, frameMat, { x: -w / 2 + frameW / 2, y: 0, z: zMid, uv: woodUV('y', r) }));
  g.add(box(frameW, h, depth, frameMat, { x: w / 2 - frameW / 2, y: 0, z: zMid, uv: woodUV('y', r) }));
  g.add(box(w + 0.03, frameW, depth, frameMat, { y: h / 2 - frameW / 2, z: zMid, uv: woodUV('x', r) }));

  // Hoja de la puerta centrada en el espesor del muro
  const leafW = w - frameW * 2 - 0.006;
  const leafH = h - frameW - 0.006;
  const leafThick = Math.max(0.058, wallThickness * 0.52);
  g.add(box(leafW, leafH, leafThick, leafMat, { y: -frameW / 2, z: zMid, uv: woodUV('y', r) }));
  // Junta acústica perimetral oscura
  g.add(box(leafW + 0.008, leafH + 0.008, leafThick * 0.5, darkSeal, { y: -frameW / 2, z: zMid }));

  // Paneles decorativos y manijas de acero inoxidable EN AMBOS LADOS DE LA PARED (+1 interior, -1 exterior)
  const hx = leafW * 0.36;
  const hy = y0 + 1.02;
  for (const side of [1, -1]) {
    const faceZ = zMid + side * (leafThick / 2 + 0.004);
    for (let i = 0; i < 3; i++) {
      const py = y0 + 0.38 + i * 0.56;
      g.add(box(leafW * 0.76, 0.38, 0.01, frameMat, { r: 0.004, y: py, z: faceZ, uv: woodUV('x', r) }));
    }
    // Roseta, eje y manija en ambos lados
    g.add(cyl(0.026, 0.026, 0.012, handleMat, { seg: 16, x: hx, y: hy, z: faceZ + side * 0.006, rx: Math.PI / 2 }));
    g.add(cyl(0.009, 0.009, 0.038, handleMat, { seg: 12, x: hx, y: hy, z: faceZ + side * 0.024, rx: Math.PI / 2 }));
    g.add(box(0.115, 0.018, 0.014, handleMat, { r: 0.006, x: hx - 0.045, y: hy, z: faceZ + side * 0.042 }));
    // Bisagras metálicas en el borde opuesto
    for (const by of [y0 + 0.32, y0 + 1.02, y0 + 1.72]) {
      g.add(cyl(0.007, 0.007, 0.08, handleMat, { seg: 10, x: -leafW / 2 - 0.004, y: by, z: faceZ }));
    }
  }

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Puerta doble acústica de auditorio / estudio / aula (~1.65 × 2.10 m) con mirillas de vidrio y manijas en ambos lados. */
export function doubleDoor(M, { w = 1.65, h = 2.10, wood = 'oak', wallThickness = 0.13 } = {}) {
  const g = new THREE.Group();
  const r = rng(109);
  const frameMat = M.wood(wood, 1, { roughness: 0.48 });
  const leafMat = M.wood(wood, 0, { roughness: 0.52 });
  const handleMat = M.metal(0xd4d4dc, { roughness: 0.22 });
  const glassMat = M.glass(0xbae6fd, { opacity: 0.36, roughness: 0.06 });

  const frameW = 0.058;
  const zMid = -wallThickness * 0.5;
  const depth = wallThickness + 0.044;
  const y0 = -h / 2;

  g.add(box(frameW, h, depth, frameMat, { x: -w / 2 + frameW / 2, y: 0, z: zMid, uv: woodUV('y', r) }));
  g.add(box(frameW, h, depth, frameMat, { x: w / 2 - frameW / 2, y: 0, z: zMid, uv: woodUV('y', r) }));
  g.add(box(w + 0.03, frameW, depth, frameMat, { y: h / 2 - frameW / 2, z: zMid, uv: woodUV('x', r) }));

  const leafW = (w - frameW * 2 - 0.012) / 2;
  const leafH = h - frameW - 0.006;
  const leafThick = Math.max(0.058, wallThickness * 0.52);

  for (const sx of [-1, 1]) {
    const lx = sx * (leafW / 2 + 0.003);
    g.add(box(leafW, leafH, leafThick, leafMat, { x: lx, y: -frameW / 2, z: zMid, uv: woodUV('y', r) }));
    // Mirilla vertical acústica
    g.add(box(0.16, 0.68, leafThick + 0.008, glassMat, { x: lx - sx * 0.08, y: 0.22, z: zMid }));
    // Manijas verticales / barras en ambos lados de la pared
    const hx = lx - sx * (leafW * 0.34);
    for (const side of [1, -1]) {
      const fz = zMid + side * (leafThick / 2 + 0.026);
      g.add(cyl(0.012, 0.012, 0.36, handleMat, { seg: 12, x: hx, y: y0 + 1.05, z: fz }));
      g.add(cyl(0.01, 0.01, 0.03, handleMat, { seg: 10, x: hx, y: y0 + 1.20, z: fz - side * 0.015, rx: Math.PI / 2 }));
      g.add(cyl(0.01, 0.01, 0.03, handleMat, { seg: 10, x: hx, y: y0 + 0.90, z: fz - side * 0.015, rx: Math.PI / 2 }));
    }
  }

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Ventana arquitectónica con marco de aluminio, parteluz y cristal translúcido reflectante (~1.65 × 1.20 m) en ambos lados del muro. */
export function archWindow(M, { w = 1.65, h = 1.20, open = false, double = false, wallThickness = 0.13 } = {}) {
  const g = new THREE.Group();
  const frameMat = M.metal(0x2c303a, { roughness: 0.38 });
  const sillMat = M.paint(0xe5e7eb, { roughness: 0.5 });
  const glassMat = M.glass(double ? 0x7dd3fc : 0xbae6fd, { opacity: double ? 0.38 : 0.28, roughness: 0.06 });

  const frameT = 0.048;
  const zMid = -wallThickness * 0.5;
  const depth = wallThickness + 0.032;

  g.add(box(w, frameT, depth, frameMat, { y: h / 2 - frameT / 2, z: zMid }));
  g.add(box(w, frameT, depth, frameMat, { y: -h / 2 + frameT / 2, z: zMid }));
  g.add(box(frameT, h, depth, frameMat, { x: -w / 2 + frameT / 2, z: zMid }));
  g.add(box(frameT, h, depth, frameMat, { x: w / 2 - frameT / 2, z: zMid }));
  g.add(box(0.036, h - frameT * 2, depth * 0.82, frameMat, { z: zMid }));

  // Alféizar visible tanto al interior como al exterior
  g.add(box(w + 0.08, 0.028, depth + 0.055, sillMat, { r: 0.006, y: -h / 2 - 0.01, z: zMid }));

  const paneW = (w - frameT * 2 - 0.036) / 2;
  const paneH = h - frameT * 2;
  g.add(box(paneW, paneH, 0.012, glassMat, { x: -paneW / 2 - 0.018, z: zMid - 0.012 }));
  if (double) {
    g.add(box(paneW, paneH, 0.01, glassMat, { x: -paneW / 2 - 0.018, z: zMid + 0.018 }));
  }
  const rightX = open ? paneW * 0.15 : paneW / 2 + 0.018;
  g.add(box(paneW, paneH, 0.012, glassMat, { x: rightX, z: zMid + 0.008 }));

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Ventanal panorámico horizontal de gran formato (~3.00 × 1.50 m) con múltiples hojas de cristal y perfiles finos. */
export function panoramicWindow(M, { w = 3.00, h = 1.50, wallThickness = 0.13 } = {}) {
  const g = new THREE.Group();
  const frameMat = M.metal(0x1e293b, { roughness: 0.32 });
  const sillMat = M.paint(0xe2e8f0, { roughness: 0.45 });
  const glassMat = M.glass(0x93c5fd, { opacity: 0.28, roughness: 0.05 });

  const frameT = 0.052;
  const zMid = -wallThickness * 0.5;
  const depth = wallThickness + 0.036;
  const panes = Math.max(3, Math.round(w / 0.95));

  g.add(box(w, frameT, depth, frameMat, { y: h / 2 - frameT / 2, z: zMid }));
  g.add(box(w, frameT, depth, frameMat, { y: -h / 2 + frameT / 2, z: zMid }));
  g.add(box(frameT, h, depth, frameMat, { x: -w / 2 + frameT / 2, z: zMid }));
  g.add(box(frameT, h, depth, frameMat, { x: w / 2 - frameT / 2, z: zMid }));
  g.add(box(w + 0.10, 0.03, depth + 0.06, sillMat, { r: 0.006, y: -h / 2 - 0.012, z: zMid }));

  const innerW = w - frameT * 2;
  const paneW = innerW / panes;
  const paneH = h - frameT * 2;

  for (let i = 0; i < panes; i++) {
    const px = -innerW / 2 + (i + 0.5) * paneW;
    g.add(box(paneW - 0.016, paneH, 0.014, glassMat, { x: px, z: zMid }));
    if (i > 0) {
      g.add(box(0.032, paneH, depth * 0.85, frameMat, { x: -innerW / 2 + i * paneW, z: zMid }));
    }
  }

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Ventanal piso a techo (Muro Cortina arquitectónico ~2.80 × 2.35 m) con travesaños y cristal panorámico. */
export function floorToCeilingWindow(M, { w = 2.80, h = 2.35, wallThickness = 0.13 } = {}) {
  const g = new THREE.Group();
  const frameMat = M.metal(0x18181b, { roughness: 0.3 });
  const glassMat = M.glass(0xbae6fd, { opacity: 0.26, roughness: 0.04 });

  const frameT = 0.05;
  const zMid = -wallThickness * 0.5;
  const depth = wallThickness + 0.038;
  const cols = Math.max(2, Math.round(w / 0.92));

  g.add(box(w, frameT, depth, frameMat, { y: h / 2 - frameT / 2, z: zMid }));
  g.add(box(w, frameT, depth, frameMat, { y: -h / 2 + frameT / 2, z: zMid }));
  g.add(box(frameT, h, depth, frameMat, { x: -w / 2 + frameT / 2, z: zMid }));
  g.add(box(frameT, h, depth, frameMat, { x: w / 2 - frameT / 2, z: zMid }));
  // Travesaño horizontal a altura de baranda (~0.85 m desde abajo)
  const transomY = -h / 2 + Math.min(0.85, h * 0.34);
  g.add(box(w - frameT * 2, 0.036, depth * 0.88, frameMat, { y: transomY, z: zMid }));

  const innerW = w - frameT * 2;
  const colW = innerW / cols;
  for (let i = 0; i < cols; i++) {
    const cx = -innerW / 2 + (i + 0.5) * colW;
    g.add(box(colW - 0.014, h - frameT * 2, 0.016, glassMat, { x: cx, z: zMid }));
    if (i > 0) {
      g.add(box(0.036, h - frameT * 2, depth * 0.9, frameMat, { x: -innerW / 2 + i * colW, z: zMid }));
    }
  }

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Visor acústico de estudio de grabación / Control Room (~2.20 × 1.15 m) con marco profundo de madera y doble cristal inclinado. */
export function studioVisorWindow(M, { w = 2.20, h = 1.15, wood = 'walnut', wallThickness = 0.13 } = {}) {
  const g = new THREE.Group();
  const r = rng(115);
  const woodFrame = M.wood(wood, 1, { roughness: 0.45 });
  const neoprene = M.plastic(0x18181b, { roughness: 0.85 });
  const glassMat = M.glass(0x7dd3fc, { opacity: 0.34, roughness: 0.04 });

  const frameT = 0.065;
  const zMid = -wallThickness * 0.5;
  const depth = wallThickness + 0.07;

  g.add(box(w, frameT, depth, woodFrame, { y: h / 2 - frameT / 2, z: zMid, uv: woodUV('x', r) }));
  g.add(box(w, frameT, depth, woodFrame, { y: -h / 2 + frameT / 2, z: zMid, uv: woodUV('x', r) }));
  g.add(box(frameT, h, depth, woodFrame, { x: -w / 2 + frameT / 2, z: zMid, uv: woodUV('y', r) }));
  g.add(box(frameT, h, depth, woodFrame, { x: w / 2 - frameT / 2, z: zMid, uv: woodUV('y', r) }));
  // Revestimiento absorbente perimetral interior entre ambos cristales
  g.add(box(w - frameT * 2, 0.012, depth * 0.65, neoprene, { y: -h / 2 + frameT + 0.006, z: zMid }));

  const paneW = w - frameT * 2;
  const paneH = h - frameT * 2;
  // Doble cristal acústico con ligera inclinación antirreflejo
  g.add(box(paneW, paneH, 0.012, glassMat, { z: zMid + 0.032, rx: 0.045 }));
  g.add(box(paneW, paneH, 0.012, glassMat, { z: zMid - 0.032, rx: -0.035 }));

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Cortina acústica pesada plisada de gran tamaño (~2.80 × 2.40 m por defecto) con riel superior metálico. */
export function drapedCurtain(M, { w = 2.80, h = 2.40, color = 0x5833c7 } = {}) {
  const g = new THREE.Group();
  const fab = M.fabric(color, { bump: 0.72 });
  const rodMat = M.metal(0x3a3b44, { roughness: 0.32 });

  // Barra superior reforzada y soportes
  g.add(cyl(0.016, 0.016, w + 0.18, rodMat, { seg: 16, y: h / 2 + 0.025, z: 0.055, rz: Math.PI / 2 }));
  // Pliegues verticales profundos y densos
  const folds = Math.max(12, Math.round(w / 0.105));
  const step = w / folds;
  for (let i = 0; i < folds; i++) {
    const x = -w / 2 + (i + 0.5) * step;
    const zOff = (i % 2 === 0 ? 1 : -1) * 0.024 + 0.055;
    g.add(cyl(step * 0.66, step * 0.72, h, fab, { seg: 14, x, y: 0, z: zOff }));
  }
  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Telón / Cortina panorámica pesada de piso a techo (~3.80 × 2.55 m) con cenefa superior para auditorios, cines o ventanales. */
export function stageCurtain(M, { w = 3.80, h = 2.55, color = 0x7f1d1d } = {}) {
  const g = new THREE.Group();
  const fab = M.fabric(color, { bump: 0.78 });
  const trimGold = M.metal(0xd97706, { roughness: 0.35 });
  const rodMat = M.metal(0x27272a, { roughness: 0.35 });

  g.add(box(w + 0.16, 0.04, 0.08, rodMat, { y: h / 2 + 0.01, z: 0.06 }));
  // Cenefa superior plisada (valance)
  const valH = Math.min(0.38, h * 0.16);
  const valFolds = Math.max(16, Math.round(w / 0.12));
  const vStep = w / valFolds;
  for (let i = 0; i < valFolds; i++) {
    const x = -w / 2 + (i + 0.5) * vStep;
    g.add(cyl(vStep * 0.68, vStep * 0.72, valH, fab, { seg: 12, x, y: h / 2 - valH / 2, z: 0.085 }));
  }
  g.add(box(w, 0.018, 0.02, trimGold, { y: h / 2 - valH + 0.01, z: 0.105 }));

  // Cuerpo completo plisado
  const folds = Math.max(16, Math.round(w / 0.11));
  const step = w / folds;
  for (let i = 0; i < folds; i++) {
    const x = -w / 2 + (i + 0.5) * step;
    const zOff = (i % 2 === 0 ? 1 : -1) * 0.026 + 0.055;
    g.add(cyl(step * 0.66, step * 0.72, h, fab, { seg: 14, x, y: 0, z: zOff }));
  }

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/* ======================================= MUEBLERÍA DE UNIVERSIDAD / COLEGIO */

/** Pupitre / escritorio individual de estudiante con silla ergonómica integrada. */
export function studentDesk(M, { w = 0.68, d = 0.52, h = 0.75, color = 0x3b82f6, wood = 'birch' } = {}) {
  const g = new THREE.Group();
  const r = rng(201);
  const topMat = M.wood(wood, 1, { roughness: 0.48 });
  const frameMat = M.metal(0x383a42, { roughness: 0.42 });
  const seatMat = M.plastic(color, { roughness: 0.5 });

  // Tablero del pupitre
  g.add(box(w, 0.024, d, topMat, { r: 0.008, y: h - 0.012, z: -0.12, uv: woodUV('x', r) }));
  // Cajonera / bandeja portacuadernos inferior
  g.add(box(w - 0.10, 0.08, d - 0.12, frameMat, { r: 0.005, y: h - 0.11, z: -0.10 }));
  // Patas tubulares del pupitre
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(cyl(0.014, 0.014, h - 0.02, frameMat, { seg: 10, x: sx * (w / 2 - 0.05), y: (h - 0.02) / 2, z: -0.12 + sz * (d / 2 - 0.05) }));
    }
  }
  // Cuaderno y lápiz sobre el pupitre
  g.add(box(0.21, 0.012, 0.28, M.paint(0xf8fafc, { roughness: 0.7 }), { x: -0.06, y: h + 0.006, z: -0.10, ry: 0.08 }));

  // Silla escolar detrás del pupitre (en +Z)
  const chairZ = 0.28;
  const seatH = 0.44;
  g.add(box(0.42, 0.028, 0.40, seatMat, { r: 0.012, y: seatH, z: chairZ }));
  g.add(box(0.40, 0.32, 0.026, seatMat, { r: 0.012, y: seatH + 0.20, z: chairZ + 0.18, rx: 0.08 }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(cyl(0.012, 0.01, seatH, frameMat, { seg: 10, x: sx * 0.17, y: seatH / 2, z: chairZ + sz * 0.16 }));
    }
  }
  g.userData.width = w;
  return g;
}

/** Matriz de pupitres de aula (filas × columnas) para poblar un salón de clase o auditorio universitario. */
export function classroomDeskGrid(M, { cols = 3, rows = 2, color = 0x3b82f6, wood = 'birch' } = {}) {
  const g = new THREE.Group();
  const pitchX = 0.92;
  const pitchZ = 1.12;
  const cCount = Math.max(1, Math.min(6, Math.round(cols)));
  const rCount = Math.max(1, Math.min(5, Math.round(rows)));
  for (let row = 0; row < rCount; row++) {
    for (let col = 0; col < cCount; col++) {
      const x = (col - (cCount - 1) / 2) * pitchX;
      const z = (row - (rCount - 1) / 2) * pitchZ;
      g.add(place(studentDesk(M, { color, wood }), { x, z }));
    }
  }
  g.userData.width = cCount * pitchX;
  return g;
}

/** Escritorio de profesor / cátedra universitaria con portátil, libros y faldón frontal. */
export function teacherDesk(M, { w = 1.55, d = 0.76, h = 0.75, wood = 'oak', color = 0x3b3b45 } = {}) {
  const g = new THREE.Group();
  const r = rng(211);
  const woodMat = M.wood(wood, 0);
  const darkMat = M.plastic(color, { roughness: 0.55 });
  const metalMat = M.metal(0x2c2d35, { roughness: 0.4 });

  // Tablero superior y faldón de privacidad frontal
  g.add(box(w, 0.034, d, woodMat, { r: 0.008, y: h - 0.017, uv: woodUV('x', r) }));
  g.add(box(w - 0.12, h * 0.55, 0.022, woodMat, { y: h * 0.58, z: -d / 2 + 0.05, uv: woodUV('x', r) }));
  // Cajonera lateral
  g.add(box(0.42, h - 0.08, d - 0.08, darkMat, { r: 0.008, x: w / 2 - 0.25, y: (h - 0.08) / 2, z: 0 }));
  // Patas izquierdas
  for (const sz of [-1, 1]) {
    g.add(box(0.045, h - 0.03, 0.045, metalMat, { x: -w / 2 + 0.06, y: (h - 0.03) / 2, z: sz * (d / 2 - 0.06) }));
  }
  // Portátil abierto sobre la mesa
  g.add(box(0.34, 0.012, 0.24, metalMat, { r: 0.004, x: -0.15, y: h + 0.006, z: 0.04 }));
  g.add(box(0.34, 0.22, 0.01, metalMat, { r: 0.004, x: -0.15, y: h + 0.11, z: -0.08, rx: -0.22 }));
  return g;
}

/** Pizarra acrílica / tablero universitario con marco de aluminio, bandeja de marcadores y gráficas acústicas. */
export function whiteboard(M, { w = 2.40, h = 1.20 } = {}) {
  const g = new THREE.Group();
  const alum = M.metal(0xcbd5e1, { roughness: 0.32 });
  const boardMat = M.screen('lecture', 0.55);
  const backing = M.plastic(0xffffff, { roughness: 0.18 });

  // Marco y superficie blanca brillante con contenido académico
  g.add(box(w, h, 0.024, alum, { r: 0.006, z: 0.012 }));
  g.add(box(w - 0.05, h - 0.05, 0.01, backing, { z: 0.022 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), boardMat);
  face.position.z = 0.028;
  g.add(face);

  // Bandeja inferior portamarcadores y borrador
  g.add(box(w * 0.55, 0.018, 0.065, alum, { y: -h / 2 + 0.01, z: 0.045 }));
  g.add(box(0.13, 0.032, 0.045, M.plastic(0x1e293b), { x: -0.22, y: -h / 2 + 0.03, z: 0.048 }));
  g.add(cyl(0.008, 0.008, 0.12, M.plastic(0xef4444), { x: 0.08, y: -h / 2 + 0.025, z: 0.048, rz: Math.PI / 2 }));
  g.add(cyl(0.008, 0.008, 0.12, M.plastic(0x2563eb), { x: 0.24, y: -h / 2 + 0.025, z: 0.048, rz: Math.PI / 2 }));

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Atril / podio de auditorio universitario con micrófono de cuello de ganso. */
export function podium(M, { w = 0.62, d = 0.48, h = 1.16, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const r = rng(223);
  const woodMat = M.wood(wood, 2);
  const metalMat = M.metal(0x22232a, { roughness: 0.35 });

  // Base, columna y mesa inclinada de lectura
  g.add(box(w, 0.05, d, woodMat, { r: 0.008, y: 0.025, uv: woodUV('x', r) }));
  g.add(box(w * 0.78, h - 0.12, d * 0.68, woodMat, { r: 0.01, y: (h - 0.06) / 2, uv: woodUV('y', r) }));
  g.add(box(w + 0.04, 0.032, d + 0.04, woodMat, { r: 0.008, y: h - 0.04, rx: 0.22, uv: woodUV('x', r) }));
  // Micrófono de conferencia
  g.add(cyl(0.006, 0.008, 0.28, metalMat, { x: 0.12, y: h + 0.10, z: -0.06, rx: 0.35 }));
  g.add(ball(0.016, metalMat, { x: 0.12, y: h + 0.23, z: -0.01 }));
  return g;
}

/** Proyector multimedia de techo con soporte telescópico y lente luminosa. */
export function ceilingProjector(M, { w = 0.38, d = 0.32, drop = 0.36 } = {}) {
  const g = new THREE.Group();
  const bodyMat = M.plastic(0xf1f5f9, { roughness: 0.35 });
  const darkMat = M.metal(0x27272a, { roughness: 0.4 });
  // En montaje 'ceiling', Y=0 del grupo está en `H - drop`
  g.add(cyl(0.022, 0.022, drop, darkMat, { seg: 14, y: drop / 2 }));
  g.add(cyl(0.075, 0.075, 0.02, darkMat, { seg: 18, y: drop - 0.01 }));
  g.add(box(w, 0.12, d, bodyMat, { r: 0.02, y: 0 }));
  // Lente frontal emisiva
  g.add(cyl(0.042, 0.048, 0.04, darkMat, { seg: 20, x: 0.06, y: 0, z: d / 2 + 0.01, rx: Math.PI / 2 }));
  g.add(ball(0.032, M.glow(0xe0f2fe, 2.8), { x: 0.06, y: 0, z: d / 2 + 0.025, sz: 0.4 }));
  return g;
}

/** Casilleros metálicos escolares / universitarios (Lockers). */
export function lockerBank(M, { w = 1.20, d = 0.46, h = 1.85, cols = 3, color = 0x475569 } = {}) {
  const g = new THREE.Group();
  const bodyMat = M.paint(color, { roughness: 0.52 });
  const doorMat = M.paint(0x64748b, { roughness: 0.45 });
  const handleMat = M.metal(0xcbd5e1, { roughness: 0.3 });

  g.add(box(w, h, d, bodyMat, { r: 0.008, y: h / 2 }));
  const nCols = Math.max(2, Math.round(cols));
  const colW = (w - 0.04) / nCols;
  for (let c = 0; c < nCols; c++) {
    const cx = -w / 2 + 0.02 + (c + 0.5) * colW;
    for (const row of [0, 1]) {
      const dh = (h - 0.12) / 2;
      const cy = 0.08 + dh / 2 + row * (dh + 0.02);
      g.add(box(colW - 0.016, dh, 0.016, doorMat, { r: 0.004, x: cx, y: cy, z: d / 2 + 0.006 }));
      g.add(box(0.016, 0.07, 0.02, handleMat, { x: cx + colW * 0.32, y: cy, z: d / 2 + 0.018 }));
    }
  }
  return g;
}

/** Mesa de laboratorio universitario con cubierta fenólica negra, estante central de reactivos y taburetes. */
export function labBench(M, { w = 2.10, d = 0.85, h = 0.88 } = {}) {
  const g = new THREE.Group();
  const topMat = M.plastic(0x1e293b, { roughness: 0.35 });
  const cabMat = M.paint(0xe2e8f0, { roughness: 0.55 });
  const metalMat = M.metal(0x64748b, { roughness: 0.35 });

  // Gabinete base y mesón resistente
  g.add(box(w - 0.16, h - 0.08, d - 0.18, cabMat, { r: 0.008, y: (h - 0.08) / 2 }));
  g.add(box(w, 0.04, d, topMat, { r: 0.008, y: h - 0.02 }));
  // Estante superior central de laboratorio
  g.add(cyl(0.016, 0.016, 0.42, metalMat, { x: -w * 0.35, y: h + 0.21 }));
  g.add(cyl(0.016, 0.016, 0.42, metalMat, { x: w * 0.35, y: h + 0.21 }));
  g.add(box(w * 0.82, 0.022, 0.22, topMat, { y: h + 0.42 }));
  // Taburetes de laboratorio a ambos lados
  for (const sx of [-0.55, 0.55]) {
    g.add(cyl(0.16, 0.16, 0.04, topMat, { seg: 18, x: sx, y: 0.58, z: d / 2 + 0.22 }));
    g.add(cyl(0.022, 0.022, 0.56, metalMat, { seg: 12, x: sx, y: 0.28, z: d / 2 + 0.22 }));
  }
  return g;
}

/* ======================================= EQUIPAMIENTO Y MOBILIARIO INDUSTRIAL */

/** Maquinaria industrial pesada (compresor / generador / unidad CNC) con motor, rejillas y panel de control. */
export function industrialMachine(M, { w = 1.45, d = 0.92, h = 1.35, color = 0xd97706 } = {}) {
  const g = new THREE.Group();
  const yellowHood = M.paint(color, { roughness: 0.48 });
  const darkSteel = M.metal(0x27272a, { roughness: 0.45 });
  const brightSteel = M.metal(0x94a3b8, { roughness: 0.32 });

  // Bancada antivibratoria inferior
  g.add(box(w + 0.06, 0.12, d + 0.06, darkSteel, { r: 0.01, y: 0.06 }));
  // Carcasa acústica / industrial principal
  const bodyW = w * 0.68;
  g.add(box(bodyW, h - 0.12, d, yellowHood, { r: 0.02, x: -w * 0.14, y: 0.12 + (h - 0.12) / 2 }));
  // Cilindro de motor eléctrico / tanque compresor lateral
  g.add(cyl(d * 0.32, d * 0.32, w * 0.38, darkSteel, { seg: 24, x: w * 0.28, y: 0.48, rz: Math.PI / 2 }));
  g.add(cyl(0.08, 0.08, 0.45, brightSteel, { seg: 16, x: -w * 0.28, y: h + 0.18, z: -d * 0.2 }));
  // Rejillas de ventilación y panel de control con luces piloto
  g.add(box(bodyW * 0.55, h * 0.38, 0.02, darkSteel, { x: -w * 0.22, y: h * 0.55, z: d / 2 + 0.005 }));
  g.add(box(0.26, 0.34, 0.04, brightSteel, { r: 0.006, x: w * 0.06, y: h * 0.62, z: d / 2 + 0.015 }));
  g.add(ball(0.016, M.glow(0x22c55e, 2.5), { x: w * 0.02, y: h * 0.70, z: d / 2 + 0.038 }));
  g.add(ball(0.016, M.glow(0xef4444, 2.5), { x: w * 0.10, y: h * 0.70, z: d / 2 + 0.038 }));
  return g;
}

/** Conducto de ventilación / climatización industrial HVAC suspendido de techo en acero galvanizado. */
export function hvacDuct(M, { w = 2.80, d = 0.46, h = 0.34, drop = 0.38 } = {}) {
  const g = new THREE.Group();
  const galv = M.metal(0x94a3b8, { roughness: 0.36 });
  const darkGrille = M.metal(0x334155, { roughness: 0.5 });

  // Conducto rectangular principal
  g.add(box(w, h, d, galv, { r: 0.012, y: 0 }));
  // Bridas de unión y varillas roscadas al techo
  const joints = Math.max(2, Math.round(w / 0.9));
  for (let i = 0; i <= joints; i++) {
    const x = -w / 2 + (i / joints) * w;
    g.add(box(0.025, h + 0.03, d + 0.03, galv, { x, y: 0 }));
    if (i > 0 && i < joints) {
      for (const sz of [-1, 1]) {
        g.add(cyl(0.006, 0.006, drop, galv, { x, y: h / 2 + drop / 2, z: sz * (d / 2 - 0.03) }));
      }
    }
  }
  // Rejillas difusoras laterales
  for (const sx of [-0.3, 0.3]) {
    g.add(box(0.36, h * 0.55, 0.02, darkGrille, { x: w * sx, y: 0, z: d / 2 + 0.008 }));
  }
  return g;
}

/** Estantería metálica pesada de almacén / planta industrial con cajas y materiales. */
export function industrialShelving(M, { w = 1.65, d = 0.58, h = 2.10 } = {}) {
  const g = new THREE.Group();
  const r = rng(307);
  const bluePost = M.paint(0x1d4ed8, { roughness: 0.45 });
  const orangeBeam = M.paint(0xea580c, { roughness: 0.45 });
  const crateMat = M.wood('birch', 2, { roughness: 0.72 });
  const boxMat = M.paint(0xc29b61, { roughness: 0.85 });

  // 4 postes verticales azules
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(0.045, h, 0.045, bluePost, { x: sx * (w / 2 - 0.025), y: h / 2, z: sz * (d / 2 - 0.025) }));
    }
  }
  // 3 niveles de largueros naranjas + cajas de almacén
  const levels = [0.22, h * 0.48, h * 0.86];
  levels.forEach((ly, idx) => {
    g.add(box(w, 0.05, d, orangeBeam, { y: ly }));
    if (idx < 2) {
      for (let c = 0; c < 3; c++) {
        const bw = (w - 0.28) / 3;
        const bh = 0.28 + (c % 2) * 0.08;
        const bx = -w / 2 + 0.14 + (c + 0.5) * bw;
        g.add(box(bw - 0.04, bh, d * 0.78, (c + idx) % 2 === 0 ? crateMat : boxMat, { r: 0.008, x: bx, y: ly + 0.025 + bh / 2, uv: woodUV('x', r) }));
      }
    }
  });
  return g;
}

/** Banco de trabajo mecánico / taller industrial con tablero grueso y panel portaherramientas. */
export function workbench(M, { w = 1.65, d = 0.75, h = 0.86, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const r = rng(319);
  const topMat = M.wood(wood, 0, { roughness: 0.5 });
  const steelFrame = M.metal(0x334155, { roughness: 0.45 });
  const redPeg = M.paint(0xb91c1c, { roughness: 0.5 });

  g.add(box(w, 0.05, d, topMat, { r: 0.008, y: h - 0.025, uv: woodUV('x', r) }));
  g.add(box(w - 0.12, 0.028, d - 0.12, steelFrame, { y: 0.22 }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(0.05, h - 0.05, 0.05, steelFrame, { x: sx * (w / 2 - 0.05), y: (h - 0.05) / 2, z: sz * (d / 2 - 0.05) }));
    }
  }
  // Tablero trasero portaherramientas
  g.add(box(w, 0.58, 0.025, redPeg, { y: h + 0.29, z: -d / 2 + 0.02 }));
  return g;
}

/** Barrera / mampara acústica móvil industrial con núcleo fonoabsorbente y mirilla translúcida. */
export function acousticBarrier(M, { w = 1.45, d = 0.36, h = 1.78, color = 0x475569 } = {}) {
  const g = new THREE.Group();
  const frameMat = M.metal(0x1e293b, { roughness: 0.42 });
  const coreMat = M.fabric(color, { bump: 0.55 });
  const glassMat = M.glass(0xbae6fd, { opacity: 0.38 });

  // Patas transversales de apoyo
  for (const sx of [-1, 1]) {
    g.add(box(0.06, 0.04, d, frameMat, { r: 0.008, x: sx * (w / 2 - 0.08), y: 0.02 }));
  }
  // Cuerpo fonoabsorbente inferior y superior
  g.add(box(w, h - 0.06, 0.075, coreMat, { r: 0.012, y: 0.04 + (h - 0.06) / 2 }));
  // Mirilla de inspección superior
  g.add(box(w * 0.55, 0.34, 0.09, glassMat, { y: h * 0.72 }));
  return g;
}

/** Figura humana estilizada a escala real (oyente / estudiante / operario) para referencia espacial y absorción por ocupante. */
export function personFigure(M, { h = 1.72, color = 0x5833c7 } = {}) {
  const g = new THREE.Group();
  const torsoMat = M.fabric(color, { bump: 0.3 });
  const pantsMat = M.fabric(0x334155, { bump: 0.3 });
  const headMat = M.paint(0xe6ccb2, { roughness: 0.65 });

  const legH = h * 0.46;
  const torsoH = h * 0.34;
  for (const sx of [-0.085, 0.085]) {
    g.add(cyl(0.058, 0.045, legH, pantsMat, { seg: 14, x: sx, y: legH / 2 }));
  }
  g.add(box(0.36, torsoH, 0.20, torsoMat, { r: 0.06, y: legH + torsoH / 2 }));
  g.add(ball(0.11, headMat, { y: legH + torsoH + 0.13 }));
  return g;
}

/* ======================================= INSTRUMENTOS Y ESTUDIO ADICIONAL */

/** Batería acústica completa sobre alfombra con bombo, caja, toms y platillos. */
export function drumKit(M, { color = 0x991b1b } = {}) {
  const g = new THREE.Group();
  const shellMat = M.plastic(color, { roughness: 0.25 });
  const headMat = M.paint(0xf8fafc, { roughness: 0.6 });
  const chrome = M.metal(0xd4d4dc, { roughness: 0.22 });
  const brass = M.metal(0xeab308, { roughness: 0.28 });

  // Bombo central
  g.add(cyl(0.28, 0.28, 0.44, shellMat, { seg: 24, y: 0.30, rx: Math.PI / 2 }));
  g.add(cyl(0.27, 0.27, 0.46, headMat, { seg: 24, y: 0.30, rx: Math.PI / 2 }));
  // Caja (Snare) y Tom de piso
  g.add(cyl(0.18, 0.18, 0.14, shellMat, { seg: 20, x: -0.32, y: 0.56, z: -0.22 }));
  g.add(cyl(0.21, 0.21, 0.38, shellMat, { seg: 20, x: 0.38, y: 0.36, z: -0.18 }));
  // Toms aéreos
  g.add(cyl(0.15, 0.15, 0.22, shellMat, { seg: 18, x: -0.15, y: 0.72, z: 0.02, rx: 0.25 }));
  g.add(cyl(0.16, 0.16, 0.24, shellMat, { seg: 18, x: 0.15, y: 0.72, z: 0.02, rx: 0.25 }));
  // Platillos (Hi-hat, Crash, Ride)
  for (const [cx, cy, cz, cr] of [[-0.48, 0.82, -0.18, 0.18], [-0.42, 1.08, 0.14, 0.23], [0.46, 1.02, 0.12, 0.26]]) {
    g.add(cyl(0.008, 0.008, cy, chrome, { seg: 10, x: cx, y: cy / 2, z: cz }));
    g.add(cyl(cr, cr, 0.008, brass, { seg: 24, x: cx, y: cy, z: cz, rx: 0.12 }));
  }
  // Banqueta del baterista
  g.add(cyl(0.16, 0.16, 0.06, M.fabric(0x1e293b), { seg: 18, y: 0.50, z: -0.52 }));
  g.add(cyl(0.018, 0.018, 0.48, chrome, { seg: 12, y: 0.24, z: -0.52 }));
  return g;
}

/** Amplificador de guitarra eléctrica / bajo con rejilla textil clásica. */
export function guitarAmp(M, { w = 0.68, d = 0.28, h = 0.54 } = {}) {
  const g = new THREE.Group();
  const tolex = M.plastic(0x18181b, { roughness: 0.65 });
  const grille = M.fabric(0x57534e, { bump: 0.7 });
  const goldPanel = M.metal(0xd97706, { roughness: 0.32 });

  g.add(box(w, h, d, tolex, { r: 0.018, y: h / 2 }));
  g.add(box(w - 0.06, h - 0.14, 0.015, grille, { y: h / 2 - 0.03, z: d / 2 - 0.002 }));
  g.add(box(w - 0.06, 0.055, 0.018, goldPanel, { y: h - 0.06, z: d / 2 }));
  return g;
}

/** Micrófono de condensador en soporte de brazo (boom stand) con filtro antipop. */
export function micStand(M, { h = 1.55 } = {}) {
  const g = new THREE.Group();
  const darkMetal = M.metal(0x27272a, { roughness: 0.4 });
  const chrome = M.metal(0xd4d4dc, { roughness: 0.25 });

  g.add(cyl(0.16, 0.17, 0.025, darkMetal, { seg: 20, y: 0.012 }));
  g.add(cyl(0.01, 0.012, h * 0.78, darkMetal, { seg: 12, y: h * 0.39 }));
  g.add(cyl(0.007, 0.007, 0.58, chrome, { seg: 12, y: h * 0.82, z: 0.12, rx: 1.05 }));
  g.add(cyl(0.024, 0.024, 0.14, chrome, { seg: 16, y: h * 0.92, z: 0.34 }));
  return g;
}

/* ======================================= SILLAS, ESTANTERÍAS MEDIAS, TV, LAPTOP, CÁMARAS Y LUCES */

/** Silla escolar / universitaria con brazo-paleta de escritura integrado y parrilla inferior porta-libros. */
export function schoolArmChair(M, { w = 0.62, d = 0.64, h = 0.82, color = 0x2563eb, wood = 'birch' } = {}) {
  const g = new THREE.Group();
  const r = rng(401);
  const shellMat = M.plastic(color, { roughness: 0.48 });
  const frameMat = M.metal(0x27272a, { roughness: 0.38 });
  const tabletMat = M.wood(wood, 1, { roughness: 0.45 });

  const seatH = 0.45;
  // Asiento y respaldo anatómico
  g.add(box(0.45, 0.032, 0.43, shellMat, { r: 0.014, y: seatH, z: 0.05 }));
  g.add(box(0.43, 0.34, 0.028, shellMat, { r: 0.014, y: seatH + 0.21, z: 0.25, rx: 0.1 }));

  // 4 patas tubulares inclinadas + canastilla metálica porta-libros debajo del asiento
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(cyl(0.012, 0.011, seatH, frameMat, { seg: 10, x: sx * 0.2, y: seatH / 2, z: 0.05 + sz * 0.19 }));
    }
  }
  // Parrilla inferior para útiles
  g.add(box(0.38, 0.012, 0.32, frameMat, { r: 0.003, y: 0.16, z: 0.05 }));

  // Brazo tubular derecho que sube hasta la paleta de escritura
  g.add(cyl(0.013, 0.013, 0.25, frameMat, { seg: 10, x: -0.22, y: seatH + 0.12, z: -0.08 }));
  g.add(cyl(0.012, 0.012, 0.34, frameMat, { seg: 10, x: -0.22, y: seatH + 0.23, z: -0.02, rx: Math.PI / 2 }));

  // Paleta de madera con forma ergonómica para escribir y apoyar cuaderno/laptop
  g.add(box(0.32, 0.022, 0.44, tabletMat, { r: 0.008, x: -0.14, y: seatH + 0.245, z: -0.11, ry: -0.08, uv: woodUV('x', r) }));
  // Cuaderno sobre el brazo
  g.add(box(0.18, 0.01, 0.24, M.paint(0xf8fafc, { roughness: 0.65 }), { x: -0.14, y: seatH + 0.26, z: -0.12, ry: -0.05 }));

  g.userData.width = w;
  return g;
}

/** Silla ergonómica ejecutiva / estudio de malla con cabecero, soporte lumbar y brazos ajustables. */
export function ergonomicChair(M, { color = 0x1e293b } = {}) {
  const g = new THREE.Group();
  const meshMat = M.fabric(color, { bump: 0.8 });
  const frameMat = M.plastic(0x18181b, { roughness: 0.4 });
  const chrome = M.metal(0xd4d4dc, { roughness: 0.25 });

  // Asiento acolchado, respaldo alto de malla y cabecero
  g.add(box(0.52, 0.07, 0.50, meshMat, { r: 0.028, y: 0.48, uv: FABRIC_UV }));
  g.add(box(0.48, 0.58, 0.045, meshMat, { r: 0.025, y: 0.84, z: 0.24, rx: 0.12, uv: FABRIC_UV }));
  g.add(box(0.38, 0.09, 0.04, frameMat, { r: 0.012, y: 0.72, z: 0.26 })); // Soporte lumbar
  g.add(box(0.28, 0.16, 0.045, meshMat, { r: 0.02, y: 1.21, z: 0.26, rx: -0.08, uv: FABRIC_UV })); // Cabecero

  // Apoyabrazos 4D
  for (const sx of [-1, 1]) {
    g.add(box(0.03, 0.22, 0.04, frameMat, { x: sx * 0.27, y: 0.58, z: 0.04 }));
    g.add(box(0.08, 0.025, 0.24, frameMat, { r: 0.008, x: sx * 0.27, y: 0.69, z: 0.02 }));
  }

  // Pistón neumático y estrella de 5 ruedas
  g.add(cyl(0.026, 0.028, 0.34, chrome, { y: 0.28 }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(box(0.32, 0.026, 0.042, chrome, { r: 0.008, x: Math.cos(a) * 0.16, y: 0.09, z: Math.sin(a) * 0.16, ry: -a }));
    g.add(ball(0.028, frameMat, { x: Math.cos(a) * 0.31, y: 0.028, z: Math.sin(a) * 0.31 }));
  }
  return g;
}

/** Silla interlocutora / auditorio con estructura trineo cromada. */
export function visitorChair(M, { color = 0x475569 } = {}) {
  const g = new THREE.Group();
  const fab = M.fabric(color, { bump: 0.65 });
  const chrome = M.metal(0xd4d4dc, { roughness: 0.25 });

  g.add(box(0.50, 0.065, 0.48, fab, { r: 0.022, y: 0.46, uv: FABRIC_UV }));
  g.add(box(0.48, 0.42, 0.055, fab, { r: 0.022, y: 0.76, z: 0.22, rx: 0.1, uv: FABRIC_UV }));
  // Base trineo continua
  for (const sx of [-1, 1]) {
    g.add(cyl(0.012, 0.012, 0.45, chrome, { x: sx * 0.23, y: 0.23, z: -0.20 }));
    g.add(cyl(0.012, 0.012, 0.46, chrome, { x: sx * 0.23, y: 0.012, z: 0.02, rx: Math.PI / 2 }));
    g.add(cyl(0.012, 0.012, 0.22, chrome, { x: sx * 0.23, y: 0.56, z: -0.02 }));
    g.add(box(0.045, 0.02, 0.32, M.plastic(0x1e293b), { r: 0.006, x: sx * 0.23, y: 0.66, z: 0.04 }));
  }
  return g;
}

/** Taburete alto / butaco de estudio o laboratorio con aro apoyapiés. */
export function barStool(M, { h = 0.72, color = 0x27272a, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const seatMat = M.wood(wood, 1, { roughness: 0.45 });
  const metal = M.metal(0x27272a, { roughness: 0.35 });
  const chrome = M.metal(0xd4d4dc, { roughness: 0.25 });

  g.add(cyl(0.18, 0.18, 0.042, seatMat, { seg: 28, y: h - 0.021 }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    g.add(cyl(0.013, 0.011, h - 0.03, metal, {
      seg: 10,
      x: Math.cos(a) * 0.14,
      y: (h - 0.03) / 2,
      z: Math.sin(a) * 0.14,
      rx: Math.sin(a) * 0.08,
      rz: -Math.cos(a) * 0.08,
    }));
  }
  const ring = lit(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.009, 10, 28), chrome));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = h * 0.34;
  g.add(ring);
  return g;
}

/** Poltrona / sillón individual lounge tapizado. */
export function armchairLounge(M, { w = 0.86, d = 0.84, h = 0.78, color = 0xd97706, wood = 'walnut' } = {}) {
  const g = new THREE.Group();
  const fab = M.fabric(color, { bump: 0.85 });
  const legMat = M.wood(wood, 0);

  g.add(box(w, 0.20, d, fab, { r: 0.04, y: 0.22, uv: FABRIC_UV }));
  g.add(box(w - 0.24, 0.14, d - 0.18, fab, { r: 0.045, y: 0.38, z: -0.05, uv: FABRIC_UV }));
  g.add(box(w, h - 0.26, 0.20, fab, { r: 0.055, y: 0.26 + (h - 0.26) / 2, z: d / 2 - 0.10, rx: 0.12, uv: FABRIC_UV }));
  for (const sx of [-1, 1]) {
    g.add(box(0.16, 0.42, d, fab, { r: 0.05, x: sx * (w / 2 - 0.08), y: 0.41, uv: FABRIC_UV }));
    for (const sz of [-1, 1]) {
      g.add(cyl(0.02, 0.014, 0.14, legMat, { seg: 12, x: sx * (w / 2 - 0.10), y: 0.07, z: sz * (d / 2 - 0.10) }));
    }
  }
  return g;
}

/**
 * Estantería media / Credenza abierta alargable (~1.60 × 0.42 × 0.90 m por defecto).
 * Permite alargar su ancho `w`, cambiar su altura `h` y profundidad `d`, y colocar objetos sobre cualquiera de sus 3 repisas.
 */
export function midShelfCredenza(M, { w = 1.60, d = 0.42, h = 0.90, wood = 'oak' } = {}) {
  const g = new THREE.Group();
  const r = rng(419);
  const woodMat = M.wood(wood, 1, { roughness: 0.48 });
  const frameMat = M.metal(0x27272a, { roughness: 0.38 });

  // Postes verticales en extremos (y centrales si se alarga más de 1.85 m)
  const postXs = w > 1.85 ? [-w / 2 + 0.025, 0, w / 2 - 0.025] : [-w / 2 + 0.025, w / 2 - 0.025];
  postXs.forEach((px) => {
    for (const sz of [-1, 1]) {
      g.add(box(0.032, h, 0.032, frameMat, { x: px, y: h / 2, z: sz * (d / 2 - 0.025) }));
    }
    g.add(box(0.032, 0.028, d - 0.05, frameMat, { x: px, y: 0.10 }));
    g.add(box(0.032, 0.028, d - 0.05, frameMat, { x: px, y: h - 0.02 }));
  });

  // 3 niveles de repisas horizontales gruesas de madera (Inferior, Media y Cubierta Superior)
  const shelfHeights = [0.12, h * 0.52, h - 0.015];
  shelfHeights.forEach((sy) => {
    g.add(box(w, 0.03, d, woodMat, { r: 0.006, y: sy, uv: woodUV('x', r) }));
  });

  g.userData.width = w;
  g.userData.surfaceHeights = [0.135, Math.round(h * 0.52 * 100) / 100 + 0.015, h];
  return g;
}

/** Smart TV 4K Pantalla Plana (65" – 85"), sirve tanto colgado en pared como apoyado con base sobre mesa o estantería. */
export function wallTv(M, { w = 1.46, h = 0.84, stand = false, glow = 1.35 } = {}) {
  const g = new THREE.Group();
  const bezel = M.plastic(0x111115, { roughness: 0.32 });
  const metal = M.metal(0x3f3f46, { roughness: 0.3 });
  const screenMat = M.screen('movie', glow);

  // Cuando stand=true (montado sobre piso/mesa/estantería), el origen Y=0 está en la base de las patas
  const centerY = stand ? h / 2 + 0.065 : 0;
  const centerZ = stand ? 0 : 0.028;

  g.add(box(w, h, 0.032, bezel, { r: 0.008, y: centerY, z: centerZ }));
  g.add(box(w - 0.026, h - 0.026, 0.004, screenMat, { y: centerY, z: centerZ + 0.016 }));

  if (stand) {
    for (const sx of [-1, 1]) {
      g.add(box(0.035, 0.07, 0.26, metal, { r: 0.006, x: sx * (w * 0.34), y: 0.012, z: 0 }));
      g.add(box(0.03, 0.065, 0.03, metal, { x: sx * (w * 0.34), y: 0.04, z: 0 }));
    }
  }
  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** TV de gran formato en base móvil con ruedas (Rolling TV Cart), bandeja central para laptop y cámara superior. */
export function rollingTvStand(M, { w = 1.48, d = 0.62, h = 1.72, glow = 1.35 } = {}) {
  const g = new THREE.Group();
  const steel = M.metal(0x1e2028, { roughness: 0.36 });
  const wheelMat = M.plastic(0x0f172a, { roughness: 0.6 });
  const bezel = M.plastic(0x111115, { roughness: 0.32 });

  // Base en H con 4 ruedas giratorias
  for (const sx of [-1, 1]) {
    g.add(box(0.065, 0.045, d, steel, { r: 0.01, x: sx * 0.46, y: 0.065 }));
    for (const sz of [-1, 1]) {
      g.add(cyl(0.032, 0.032, 0.024, wheelMat, { seg: 16, x: sx * 0.46, y: 0.032, z: sz * (d / 2 - 0.05), rz: Math.PI / 2 }));
    }
    // 2 columnas telescópicas verticales
    g.add(cyl(0.028, 0.032, h - 0.25, steel, { seg: 16, x: sx * 0.26, y: 0.08 + (h - 0.25) / 2, z: -0.04 }));
  }
  g.add(box(0.96, 0.045, 0.08, steel, { y: 0.065, z: -0.04 }));

  // Bandeja intermedia porta-laptop / control
  const trayY = h * 0.44;
  g.add(box(0.54, 0.018, 0.32, steel, { r: 0.006, y: trayY, z: 0.06 }));

  // Pantalla TV 65" montada arriba
  const tvH = Math.min(0.86, h * 0.48);
  const tvY = h - tvH / 2 - 0.08;
  g.add(box(w, tvH, 0.036, bezel, { r: 0.01, y: tvY, z: 0.02 }));
  g.add(box(w - 0.03, tvH - 0.03, 0.004, M.screen('chart', glow), { y: tvY, z: 0.04 }));

  // Cámara de videoconferencia en el borde superior
  g.add(box(0.16, 0.038, 0.045, steel, { r: 0.008, y: h - 0.04, z: 0.03 }));
  g.add(ball(0.014, M.glow(0x38bdf8, 2.2), { y: h - 0.04, z: 0.055 }));

  g.userData.width = w;
  return g;
}

/** Laptop / MacBook Pro abierta con pantalla encendida y mouse inalámbrico (ideal para colocar sobre mesas o estanterías). */
export function laptopProp(M, { w = 0.38, d = 0.26, glow = 1.35 } = {}) {
  const g = new THREE.Group();
  const alum = M.metal(0xcbd5e1, { roughness: 0.28 });
  const darkKey = M.plastic(0x1e293b, { roughness: 0.55 });
  const screenMat = M.screen('daw', glow);

  // Base con teclado y trackpad
  g.add(box(w, 0.012, d, alum, { r: 0.004, y: 0.006, z: 0.02 }));
  g.add(box(w * 0.84, 0.003, d * 0.48, darkKey, { y: 0.013, z: -0.01 }));
  // Pantalla abierta inclinada
  const lidH = w * 0.64;
  g.add(box(w, lidH, 0.008, alum, { r: 0.004, y: 0.012 + lidH / 2, z: -d / 2 + 0.01, rx: -0.22 }));
  g.add(box(w - 0.018, lidH - 0.018, 0.003, screenMat, { y: 0.012 + lidH / 2, z: -d / 2 + 0.016, rx: -0.22 }));
  // Mouse inalámbrico al lado derecho
  g.add(box(0.062, 0.022, 0.105, alum, { r: 0.01, x: w / 2 + 0.08, y: 0.011, z: 0.03 }));

  g.userData.width = w + 0.16;
  return g;
}

/** Estación de Computador de Escritorio (Monitor Ultrawide + Torre PC con cristal + Teclado y Mouse). */
export function desktopPcSetup(M, { w = 1.05, d = 0.52, glow = 1.35 } = {}) {
  const g = new THREE.Group();
  const dark = M.plastic(0x18181b, { roughness: 0.38 });
  const metal = M.metal(0x52525b, { roughness: 0.3 });

  // Monitor ultrawide en el centro-izquierda
  const monW = w * 0.68;
  const monH = 0.34;
  g.add(box(0.24, 0.012, 0.18, metal, { r: 0.004, x: -0.12, y: 0.006, z: -0.08 }));
  g.add(cyl(0.02, 0.022, 0.18, metal, { x: -0.12, y: 0.09, z: -0.10 }));
  g.add(box(monW, monH, 0.024, dark, { r: 0.008, x: -0.12, y: 0.14 + monH / 2, z: -0.06 }));
  g.add(box(monW - 0.018, monH - 0.018, 0.003, M.screen('daw', glow), { x: -0.12, y: 0.14 + monH / 2, z: -0.046 }));

  // Teclado y mouse sobre alfombrilla
  g.add(box(0.72, 0.004, 0.28, M.fabric(0x27272a), { r: 0.002, x: -0.08, y: 0.002, z: 0.11 }));
  g.add(box(0.38, 0.016, 0.13, dark, { r: 0.004, x: -0.16, y: 0.01, z: 0.11 }));
  g.add(box(0.06, 0.022, 0.10, dark, { r: 0.008, x: 0.14, y: 0.012, z: 0.11 }));

  // Torre PC a la derecha con iluminación interna
  const tx = w / 2 - 0.12;
  g.add(box(0.21, 0.44, 0.42, dark, { r: 0.008, x: tx, y: 0.22, z: -0.02 }));
  g.add(box(0.01, 0.36, 0.34, M.glow(0x8b5cf6, 1.8), { x: tx - 0.098, y: 0.22, z: -0.02 }));

  g.userData.width = w;
  return g;
}

/** Set de libros, cuadernos y maceta decorativa para colocar sobre estanterías medias o escritorios. */
export function booksDecorSet(M, { w = 0.54, d = 0.24, h = 0.28 } = {}) {
  const g = new THREE.Group();
  const colors = [0x5833c7, 0xd97706, 0x059669, 0x2563eb, 0xdc2626, 0xe2e8f0];

  // Libros verticales con sujetalibros
  for (let i = 0; i < 5; i++) {
    const bw = 0.028 + (i % 2) * 0.008;
    const bh = h * (0.78 + (i % 3) * 0.09);
    g.add(box(bw, bh, d * 0.82, M.paint(colors[i % colors.length], { roughness: 0.65 }), {
      r: 0.003,
      x: -w / 2 + 0.06 + i * 0.036,
      y: bh / 2,
    }));
  }
  // Pila horizontal de libros al centro
  for (let j = 0; j < 3; j++) {
    g.add(box(0.18, 0.026, 0.14, M.paint(colors[(j + 2) % colors.length], { roughness: 0.65 }), {
      r: 0.003,
      x: 0.02,
      y: 0.013 + j * 0.027,
      ry: (j - 1) * 0.08,
    }));
  }
  // Pequeña maceta suculenta a la derecha
  g.add(cyl(0.055, 0.042, 0.09, M.paint(0xf8fafc, { roughness: 0.4 }), { seg: 20, x: w / 2 - 0.08, y: 0.045 }));
  g.add(ball(0.052, M.leaf(0x16a34a), { x: w / 2 - 0.08, y: 0.11, sy: 0.85 }));

  g.userData.width = w;
  return g;
}

/** Estación de café (Cafetera espresso + termo + tazas) para credenzas, salas de juntas o estudios. */
export function coffeeMakerStation(M, { w = 0.46, d = 0.30, h = 0.34 } = {}) {
  const g = new THREE.Group();
  const dark = M.plastic(0x18181b, { roughness: 0.35 });
  const chrome = M.metal(0xe2e8f0, { roughness: 0.22 });
  const cupMat = M.paint(0xffffff, { roughness: 0.3 });

  // Bandeja base
  g.add(box(w, 0.016, d, dark, { r: 0.006, y: 0.008 }));
  // Cafetera espresso a la izquierda
  g.add(box(0.20, h - 0.02, 0.24, dark, { r: 0.012, x: -w * 0.22, y: (h - 0.02) / 2 + 0.016 }));
  g.add(box(0.16, 0.08, 0.06, chrome, { r: 0.006, x: -w * 0.22, y: h * 0.68, z: 0.11 }));
  // 2 tazas de cerámica a la derecha
  for (const sx of [0.06, 0.16]) {
    g.add(cyl(0.034, 0.028, 0.075, cupMat, { seg: 18, x: sx, y: 0.054, z: 0.03 }));
  }
  g.userData.width = w;
  return g;
}

/** Aire acondicionado Mini-Split de pared con display LED. */
export function acSplitUnit(M, { w = 0.96, h = 0.30, d = 0.22 } = {}) {
  const g = new THREE.Group();
  const bodyMat = M.plastic(0xf8fafc, { roughness: 0.28 });
  const louverMat = M.plastic(0xcbd5e1, { roughness: 0.4 });

  g.add(box(w, h, d, bodyMat, { r: 0.024, z: d / 2 }));
  g.add(box(w - 0.06, 0.022, 0.04, louverMat, { y: -h / 2 + 0.035, z: d - 0.01, rx: 0.35 }));
  g.add(box(0.065, 0.022, 0.004, M.glow(0x38bdf8, 2.2), { x: w * 0.34, y: 0.02, z: d + 0.002 }));

  g.userData.width = w;
  g.userData.height = h;
  return g;
}

/** Cámara de cine / video profesional sobre trípode con matte box y monitor LCD. */
export function cinemaCameraTripod(M, { h = 1.55 } = {}) {
  const g = new THREE.Group();
  const carbon = M.metal(0x1e2028, { roughness: 0.35 });
  const bodyMat = M.plastic(0x111115, { roughness: 0.45 });
  const lensGlass = M.glow(0x38bdf8, 1.6);

  const headY = h - 0.22;
  // 3 patas de trípode con cruceta intermedia
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    g.add(cyl(0.014, 0.01, headY, carbon, {
      seg: 12,
      x: Math.cos(a) * 0.18,
      y: headY / 2,
      z: Math.sin(a) * 0.18,
      rx: Math.sin(a) * 0.24,
      rz: -Math.cos(a) * 0.24,
    }));
  }
  // Cabezal fluido y cuerpo de cámara de cine
  g.add(cyl(0.055, 0.06, 0.09, carbon, { seg: 18, y: headY + 0.04 }));
  g.add(box(0.18, 0.17, 0.26, bodyMat, { r: 0.012, y: headY + 0.15 }));
  // Lente telefoto y parasol (matte box) hacia +Z
  g.add(cyl(0.052, 0.052, 0.16, carbon, { seg: 20, y: headY + 0.15, z: 0.19, rx: Math.PI / 2 }));
  g.add(box(0.16, 0.12, 0.05, bodyMat, { r: 0.006, y: headY + 0.15, z: 0.28 }));
  g.add(cyl(0.038, 0.038, 0.01, lensGlass, { seg: 18, y: headY + 0.15, z: 0.285, rx: Math.PI / 2 }));
  // Monitor superior externo encendido
  g.add(box(0.16, 0.10, 0.015, bodyMat, { r: 0.004, y: headY + 0.30, z: -0.02, rx: -0.2 }));
  g.add(box(0.145, 0.085, 0.004, M.screen('movie', 1.5), { y: headY + 0.30, z: -0.03, rx: -0.2 }));

  return g;
}

/** Cámara PTZ / Streaming compacta en mini-trípode (para mesa, estantería o piso). */
export function ptzConferenceCam(M, { h = 0.38 } = {}) {
  const g = new THREE.Group();
  const dark = M.metal(0x1e293b, { roughness: 0.35 });
  const silver = M.metal(0x94a3b8, { roughness: 0.3 });

  g.add(cyl(0.09, 0.10, 0.025, dark, { seg: 20, y: 0.012 }));
  g.add(cyl(0.016, 0.016, h - 0.14, dark, { seg: 14, y: (h - 0.14) / 2 + 0.02 }));
  g.add(box(0.13, 0.12, 0.13, silver, { r: 0.025, y: h - 0.06 }));
  g.add(cyl(0.038, 0.038, 0.05, dark, { seg: 18, y: h - 0.06, z: 0.065, rx: Math.PI / 2 }));
  g.add(ball(0.026, M.glow(0x38bdf8, 2.2), { y: h - 0.06, z: 0.088, sz: 0.4 }));
  return g;
}

/** Luz de estudio profesional Softbox LED en trípode (emite iluminación real en la escena). */
export function studioSoftboxLight(M, { h = 1.78, glow = 2.5 } = {}) {
  const g = new THREE.Group();
  const standMat = M.metal(0x1e2028, { roughness: 0.38 });
  const hoodMat = M.plastic(0x141418, { roughness: 0.7 });
  const diffuserGlow = M.glow(0xfff6e5, glow);

  const mastH = h - 0.25;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(cyl(0.011, 0.011, 0.42, standMat, {
      seg: 10,
      x: Math.cos(a) * 0.16,
      y: 0.14,
      z: Math.sin(a) * 0.16,
      rx: Math.sin(a) * 0.55,
      rz: -Math.cos(a) * 0.55,
    }));
  }
  g.add(cyl(0.016, 0.02, mastH, standMat, { seg: 14, y: mastH / 2 + 0.05 }));
  // Caja difusora Softbox inclinada ligeramente hacia abajo
  const boxGroup = new THREE.Group();
  boxGroup.position.set(0, h - 0.12, 0.06);
  boxGroup.rotation.x = 0.18;
  boxGroup.add(box(0.62, 0.46, 0.22, hoodMat, { r: 0.015 }));
  const face = box(0.58, 0.42, 0.012, diffuserGlow, { z: 0.11 });
  face.castShadow = false;
  boxGroup.add(face);
  g.add(boxGroup);

  return g;
}

/** Aro de luz LED (Ring Light) en trípode con soporte central de cámara/móvil. */
export function ringLightStand(M, { h = 1.68, glow = 2.8 } = {}) {
  const g = new THREE.Group();
  const standMat = M.metal(0x1e2028, { roughness: 0.38 });
  const ringGlow = M.glow(0xfff8eb, glow);

  const ringY = h - 0.22;
  g.add(cyl(0.18, 0.19, 0.022, standMat, { seg: 24, y: 0.011 }));
  g.add(cyl(0.014, 0.018, ringY - 0.20, standMat, { seg: 14, y: (ringY - 0.20) / 2 + 0.02 }));
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.024, 16, 40), ringGlow);
  torus.position.set(0, ringY, 0);
  torus.castShadow = false;
  g.add(torus);
  // Soporte de teléfono en el centro del aro
  g.add(box(0.075, 0.15, 0.012, standMat, { r: 0.008, y: ringY, z: 0.01 }));
  return g;
}

/** Luminaria lineal / Panel LED colgante de techo con cables de altura `drop` ajustable. */
export function ceilingLedPanel(M, { w = 1.25, d = 0.30, drop = 0.35, glow = 2.5 } = {}) {
  const g = new THREE.Group();
  const safeDrop = Math.max(0.04, Number(drop) || 0.35);
  const frameMat = M.metal(0x27272a, { roughness: 0.35 });
  const wireMat = M.metal(0x94a3b8, { roughness: 0.3 });
  const ledMat = M.glow(0xfff7e6, glow);

  // Carcasa superior y difusor inferior luminoso (en montaje de techo Y=0 está en H - drop)
  g.add(box(w, 0.038, d, frameMat, { r: 0.006, y: 0.019 }));
  const emitter = box(w - 0.04, 0.008, d - 0.04, ledMat, { y: -0.002 });
  emitter.castShadow = false;
  g.add(emitter);

  // Tensores de suspensión que suben `safeDrop` metros exactos hasta el techo
  for (const sx of [-1, 1]) {
    const wx = sx * (w / 2 - 0.14);
    g.add(cyl(0.0025, 0.0025, safeDrop, wireMat, { seg: 8, x: wx, y: safeDrop / 2 }));
    g.add(cyl(0.014, 0.014, 0.01, frameMat, { seg: 12, x: wx, y: safeDrop - 0.005 }));
  }
  g.userData.width = w;
  return g;
}

/** Riel de techo con 4 proyectores / spots dirigibles y altura `drop` ajustable. */
export function trackSpotlightBar(M, { w = 1.60, drop = 0.22, glow = 2.6 } = {}) {
  const g = new THREE.Group();
  const safeDrop = Math.max(0.04, Number(drop) || 0.22);
  const darkMetal = M.metal(0x18181b, { roughness: 0.35 });
  const bulbGlow = M.glow(0xffe4b5, glow);

  // Barra principal y tijas al techo
  g.add(box(w, 0.028, 0.036, darkMetal, { r: 0.004, y: 0 }));
  for (const sx of [-1, 1]) {
    g.add(cyl(0.008, 0.008, safeDrop, darkMetal, { seg: 10, x: sx * (w / 2 - 0.18), y: safeDrop / 2 }));
  }

  // 4 cabezales cilíndricos orientados
  const spots = 4;
  for (let i = 0; i < spots; i++) {
    const sx = -w * 0.38 + (i / (spots - 1)) * (w * 0.76);
    const dir = i % 2 === 0 ? 0.32 : -0.32;
    g.add(cyl(0.036, 0.036, 0.11, darkMetal, { seg: 16, x: sx, y: -0.07, rx: dir }));
    const lens = cyl(0.032, 0.032, 0.006, bulbGlow, { seg: 16, x: sx, y: -0.12, z: Math.sin(dir) * 0.05, rx: dir });
    lens.castShadow = false;
    g.add(lens);
  }
  g.userData.width = w;
  return g;
}

/** Lámpara arquitectónica articulada de escritorio / estantería con luz cálida. */
export function deskLamp(M, { h = 0.48, glow = 2.2 } = {}) {
  const g = new THREE.Group();
  const metal = M.metal(0x27272a, { roughness: 0.35 });
  const brass = M.metal(0xd97706, { roughness: 0.28 });
  const bulbGlow = M.glow(0xffe0a3, glow);

  g.add(cyl(0.095, 0.10, 0.02, metal, { seg: 24, y: 0.01 }));
  g.add(cyl(0.009, 0.009, h * 0.58, metal, { seg: 10, x: -0.03, y: h * 0.28, rz: 0.22 }));
  g.add(ball(0.016, brass, { x: -0.06, y: h * 0.55 }));
  g.add(cyl(0.008, 0.008, h * 0.48, metal, { seg: 10, x: 0.01, y: h * 0.74, rz: -0.42 }));
  g.add(cyl(0.035, 0.075, 0.11, metal, { seg: 20, x: 0.08, y: h * 0.88, rz: -0.35 }));
  const bulbMesh = ball(0.028, bulbGlow, { x: 0.09, y: h * 0.83 });
  bulbMesh.castShadow = false;
  g.add(bulbMesh);

  g.userData.width = 0.24;
  return g;
}

/* ========================================== CASCARÓN POLIGONAL PERSONALIZADO */

/**
 * Calcula la disposición 3D centrada de un `roomPolygon` (vértices 2D, altura H y curvaturas).
 * En el espacio 3D de Three.js:
 *   - X corresponde a X de planta centrada
 *   - Z corresponde a Y de planta centrada (así el norte/arriba del plano queda en -Z, al fondo)
 *   - Y es la altura vertical [0 .. H]
 */
export function getPolygonLayout(roomPolygon) {
  const rawVerts = Array.isArray(roomPolygon?.vertices) && roomPolygon.vertices.length >= 3
    ? roomPolygon.vertices
    : [
        { x: 0, y: 0 },
        { x: 5.4, y: 0 },
        { x: 5.4, y: 4.4 },
        { x: 0, y: 4.4 },
      ];
  const H = Math.max(2.0, Number(roomPolygon?.height) || 2.7);
  const curvatures = roomPolygon?.curvatures || {};

  // Orientación firmada en 2D para saber hacia dónde apunta la normal interior
  let signedArea2 = 0;
  for (let i = 0; i < rawVerts.length; i++) {
    const j = (i + 1) % rawVerts.length;
    signedArea2 += rawVerts[i].x * rawVerts[j].y - rawVerts[j].x * rawVerts[i].y;
  }
  const isCCW = signedArea2 >= 0;

  // Precalcular puntos del contorno incluyendo la curvatura real para obtener el centro exacto
  const preArcPts = [];
  for (let i = 0; i < rawVerts.length; i++) {
    const j = (i + 1) % rawVerts.length;
    const bulge = Number(curvatures[i] || 0);
    const pts = getEdgeArcPoints(rawVerts[i], rawVerts[j], bulge, Math.abs(bulge) > 0.01 ? 20 : 1, isCCW);
    pts.forEach((p) => preArcPts.push(p));
  }

  const xs = preArcPts.map((v) => Number(v.x) || 0);
  const ys = preArcPts.map((v) => Number(v.y) || 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const W = Math.max(1.5, maxX - minX);
  const D = Math.max(1.5, maxY - minY);

  // Vértices centrados en (x, z)
  const centeredVerts = rawVerts.map((v) => ({
    x: (Number(v.x) || 0) - cx,
    z: (Number(v.y) || 0) - cy,
  }));

  // Puntos del contorno completo (incluyendo subdivisión suave de paredes curvas)
  const outlinePoints = [];
  const walls = [];
  const sign = isCCW ? -1 : 1;

  for (let i = 0; i < rawVerts.length; i++) {
    const j = (i + 1) % rawVerts.length;
    const v0 = centeredVerts[i];
    const v1 = centeredVerts[j];
    const dx = v1.x - v0.x;
    const dz = v1.z - v0.z;
    const chordLength = Math.max(0.05, Math.hypot(dx, dz));
    const tx = dx / chordLength;
    const tz = dz / chordLength;

    // Normal interior de la cuerda
    const inX = sign * tz;
    const inZ = -sign * tx;
    const rotationY = Math.atan2(inX, inZ);
    const bulge = Number(curvatures[i] || 0);

    // Sub-segmentos de arista (24 segmentos para arcos curvos suaves)
    const arc2D = getEdgeArcPoints(
      { x: v0.x, y: v0.z },
      { x: v1.x, y: v1.z },
      bulge,
      Math.abs(bulge) > 0.015 ? 24 : 1,
      isCCW
    );
    const segments = [];
    let arcLength = 0;
    for (let s = 0; s < arc2D.length - 1; s++) {
      const p0 = { x: arc2D[s].x, z: arc2D[s].y };
      const p1 = { x: arc2D[s + 1].x, z: arc2D[s + 1].y };
      outlinePoints.push(p0);
      const sdx = p1.x - p0.x;
      const sdz = p1.z - p0.z;
      const segLen = Math.max(0.001, Math.hypot(sdx, sdz));
      const segTx = sdx / segLen;
      const segTz = sdz / segLen;
      const segInX = sign * segTz;
      const segInZ = -sign * segTx;
      const segRotationY = Math.atan2(segInX, segInZ);
      segments.push({
        p0,
        p1,
        segLen,
        startDist: arcLength,
        endDist: arcLength + segLen,
        tx: segTx,
        tz: segTz,
        inX: segInX,
        inZ: segInZ,
        rotationY: segRotationY,
      });
      arcLength += segLen;
    }

    // Punto medio y normal real en la mitad de la curva
    const midSeg = segments[Math.floor(segments.length / 2)] || segments[0];
    const midArc = arc2D[Math.floor(arc2D.length / 2)] || { x: (v0.x + v1.x) / 2, y: (v0.z + v1.z) / 2 };

    walls.push({
      index: i,
      label: `Pared ${i + 1}`,
      v0,
      v1,
      midX: midArc.x,
      midZ: midArc.y,
      length: arcLength || chordLength,
      chordLength,
      tx: midSeg ? midSeg.tx : tx,
      tz: midSeg ? midSeg.tz : tz,
      inX: midSeg ? midSeg.inX : inX,
      inZ: midSeg ? midSeg.inZ : inZ,
      rotationY: midSeg ? midSeg.rotationY : rotationY,
      bulge,
      segments,
    });
  }

  // Esquinas con bisectriz interior usando las normales reales de llegada/salida de cada pared
  const corners = centeredVerts.map((v, i) => {
    const prevWall = walls[(i - 1 + walls.length) % walls.length];
    const currWall = walls[i];
    const prevSeg = prevWall.segments[prevWall.segments.length - 1] || prevWall;
    const currSeg = currWall.segments[0] || currWall;
    const bx = prevSeg.inX + currSeg.inX;
    const bz = prevSeg.inZ + currSeg.inZ;
    const bLen = Math.hypot(bx, bz) || 1;
    const bisX = bx / bLen;
    const bisZ = bz / bLen;
    const rotationY = Math.atan2(bisX, bisZ) - Math.PI / 4;
    return {
      index: i,
      label: `Esquina ${i + 1}`,
      x: v.x,
      z: v.z,
      inX: bisX,
      inZ: bisZ,
      rotationY,
    };
  });

  return { cx, cy, W, D, H, isCCW, centeredVerts, outlinePoints, walls, corners };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Obtiene la posición 3D exacta `(x, z)` y la orientación tangente/normal `(inX, inZ, rotationY)`
 * sobre cualquier pared (recta o curva) a `alongMeters` desde su centro.
 */
export function sampleWallPoint(wInfo, alongMeters = 0) {
  if (!wInfo || !Array.isArray(wInfo.segments) || wInfo.segments.length === 0) {
    return { x: 0, z: 0, inX: 0, inZ: 1, tx: 1, tz: 0, rotationY: 0 };
  }
  const totalLen = Math.max(0.1, wInfo.length);
  const clamped = clamp(Number(alongMeters) || 0, -totalLen / 2 + 0.08, totalLen / 2 - 0.08);
  const targetDist = totalLen / 2 + clamped;

  let chosen = wInfo.segments[wInfo.segments.length - 1];
  for (const seg of wInfo.segments) {
    if (targetDist <= seg.endDist + 1e-5) {
      chosen = seg;
      break;
    }
  }
  const localT = clamp((targetDist - chosen.startDist) / Math.max(1e-4, chosen.segLen), 0, 1);
  return {
    x: chosen.p0.x + localT * (chosen.p1.x - chosen.p0.x),
    z: chosen.p0.z + localT * (chosen.p1.z - chosen.p0.z),
    inX: chosen.inX,
    inZ: chosen.inZ,
    tx: chosen.tx,
    tz: chosen.tz,
    rotationY: chosen.rotationY,
  };
}

// Clasificación de materiales del módulo "Materiales" de POZOLE para su representación 3D
const DOOR_MAT_IDS = new Set(['wooden_door_solid', 'puerta_madera_usb', 'door_wood']);
const WINDOW_MAT_IDS = new Set([
  'glass_single_4mm',
  'glass_double_insulated',
  'vidrio_3mm_usb',
  'open_window_total_absorption',
  'window_single',
  'window_double',
]);
const CURTAIN_MAT_IDS = new Set(['curtains_cotton_light', 'curtains_heavy_draped', 'curtain_heavy']);

function isOpeningOrDraperyMaterial(matId) {
  return DOOR_MAT_IDS.has(matId) || WINDOW_MAT_IDS.has(matId) || CURTAIN_MAT_IDS.has(matId);
}

function resolveStructuralWallMaterial(M, matId, fallbackWallColor, woodKind = 'oak') {
  switch (matId) {
    case 'brick_bare':
      return M.brick({ painted: false });
    case 'brick_painted':
      return M.brick({ painted: true, tint: fallbackWallColor });
    case 'concrete_bare':
      return M.concrete(0xb8bcc4);
    case 'wood_paneling_cavity':
    case 'wood_parquet_on_concrete':
      return M.wood(woodKind, 0, { roughness: 0.55 });
    case 'ceramic_tile':
    case 'baldosa_usb':
      return M.ceramicTiles(0xe5e7eb);
    case 'acoustic_foam_25mm':
    case 'mineral_wool_50mm':
    case 'fiberglass_panel_50mm':
      return M.fabric(0x4b5563, { bump: 0.6 });
    default:
      return M.paint(fallbackWallColor);
  }
}

function resolveFloorMaterialFromProject(M, matId, fallbackFloor, fallbackFloorColor) {
  if (matId) {
    if (matId.includes('carpet') || matId.includes('alfombra')) {
      return { mat: M.fabric(0x525666, { bump: 1.1 }), isCarpet: true };
    }
    if (matId.includes('wood') || matId.includes('parquet')) {
      return { mat: M.planks('oak'), isCarpet: false };
    }
    if (matId.includes('ceramic') || matId.includes('baldosa')) {
      return { mat: M.ceramicTiles(0xdfe3ea), isCarpet: false };
    }
    if (matId.includes('concrete')) {
      return { mat: M.concrete(0xb4b8c0), isCarpet: false };
    }
  }
  const mat =
    fallbackFloor === 'planks'
      ? M.planks('oak')
      : fallbackFloor === 'walnut'
        ? M.planks('walnut')
        : fallbackFloor === 'concrete'
          ? M.concrete(0xb4b8c0)
          : fallbackFloor === 'tiles'
            ? M.ceramicTiles(0xdfe3ea)
            : M.fabric(fallbackFloorColor, { bump: 1.1 });
  return { mat, isCarpet: fallbackFloor === 'carpet' };
}

/**
 * Construye una cinta extruida continua para una pared (recta o curva) entre las alturas [yBottom, yTop]
 * y el rango de distancia longitudinal [sStart, sEnd] sobre `wInfo.segments`.
 * `offset` la desplaza hacia el exterior del muro (revestimiento de fachada) y `extStart` / `extEnd`
 * fijan cuánto se prolonga en cada extremo para cerrar las esquinas.
 */
function buildWallRibbonMesh(
  wInfo,
  { yBottom = 0, yTop = 2.7, thickness = 0.13, sStart = 0, sEnd = null, offset = 0, extStart = null, extEnd = null },
  material
) {
  const maxS = wInfo.length;
  const a = clamp(sStart, 0, maxS);
  const b = clamp(sEnd ?? maxS, 0, maxS);
  const height = yTop - yBottom;
  if (b - a < 0.015 || height < 0.008) return null;

  // Recolectar puntos interiores y normales a lo largo del tramo [a, b]
  const innerPts = [];
  const outerPts = [];
  const steps = wInfo.segments.length > 1 ? Math.max(4, Math.ceil(((b - a) / maxS) * wInfo.segments.length)) : 1;

  const straight = wInfo.segments.length === 1 ? wInfo.segments[0] : null;
  for (let k = 0; k <= steps; k++) {
    const dist = a + (k / steps) * (b - a);
    const alongFromMid = dist - maxS / 2;
    // Un muro recto llega exactamente hasta sus esquinas (sampleWallPoint deja 8 cm de margen)
    const pt = straight
      ? {
          x: straight.p0.x + (dist / maxS) * (straight.p1.x - straight.p0.x),
          z: straight.p0.z + (dist / maxS) * (straight.p1.z - straight.p0.z),
          inX: straight.inX,
          inZ: straight.inZ,
        }
      : sampleWallPoint(wInfo, alongFromMid);
    // En los extremos de paredes rectas extendemos ligeramente para cerrar esquinas limpiamente
    let extX = 0;
    let extZ = 0;
    if (wInfo.segments.length === 1) {
      if (k === 0 && a <= 0.001) {
        const e = extStart ?? thickness * 0.45;
        extX = -wInfo.tx * e;
        extZ = -wInfo.tz * e;
      } else if (k === steps && b >= maxS - 0.001) {
        const e = extEnd ?? thickness * 0.45;
        extX = wInfo.tx * e;
        extZ = wInfo.tz * e;
      }
    }
    const ix = pt.x + extX - pt.inX * offset;
    const iz = pt.z + extZ - pt.inZ * offset;
    const ox = ix - pt.inX * thickness;
    const oz = iz - pt.inZ * thickness;
    innerPts.push({ x: ix, z: iz });
    outerPts.push({ x: ox, z: oz });
  }

  const shape = new THREE.Shape();
  shape.moveTo(innerPts[0].x, -innerPts[0].z);
  for (let i = 1; i < innerPts.length; i++) {
    shape.lineTo(innerPts[i].x, -innerPts[i].z);
  }
  for (let i = outerPts.length - 1; i >= 0; i--) {
    shape.lineTo(outerPts[i].x, -outerPts[i].z);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, yBottom, 0);
  projectUV(geo, { grain: 'x', along: 1.8, across: 1.8 });
  return lit(new THREE.Mesh(geo, material));
}

const CATALOG_DOOR_TYPES = new Set(['arch_door', 'double_door']);
const CATALOG_WINDOW_TYPES = new Set([
  'arch_window',
  'panoramic_window',
  'floor_to_ceiling_window',
  'studio_visor_window',
]);

/**
 * Construye los tramos de muro y zócalo de una pared (recta o curva) recortando limpiamente
 * los vanos de todas las puertas y ventanas (`openings`: `{ sLeft, sRight, yBottom, yTop }`)
 * para que las puertas se vean de ambos lados de la pared y los ventanales sean transparentes de lado a lado.
 */
function addWallWithOpenings(
  parentGroup,
  wInfo,
  { wallH, thickness, openings = [], wallMat, skirtMat, isFullWall, offset = 0, extStart = null, extEnd = null }
) {
  const L = wInfo.length;
  const ribbon = (range, material) => buildWallRibbonMesh(wInfo, { thickness, offset, extStart, extEnd, ...range }, material);
  const skirt = (range) => buildWallRibbonMesh(wInfo, { ...range, yBottom: 0, yTop: 0.08, thickness: -0.014 }, skirtMat);
  const add = (mesh) => {
    if (mesh) parentGroup.add(mesh);
  };

  if (!isFullWall || openings.length === 0) {
    add(ribbon({ yBottom: 0, yTop: wallH }, wallMat));
    if (isFullWall && skirtMat) add(skirt({}));
    return;
  }

  // Ordenar vanos de izquierda a derecha y acotarlos dentro de los márgenes estructurales del muro
  const sorted = openings
    .map((op) => ({
      sLeft: clamp(op.sLeft, 0.08, L - 0.08),
      sRight: clamp(op.sRight, 0.08, L - 0.08),
      yBottom: clamp(op.yBottom, 0, wallH),
      yTop: clamp(op.yTop, 0.1, wallH),
    }))
    .filter((op) => op.sRight - op.sLeft > 0.15)
    .sort((a, b) => a.sLeft - b.sLeft);

  let cursor = 0;
  sorted.forEach((op) => {
    const left = Math.max(cursor, op.sLeft);
    const right = Math.max(left, op.sRight);
    if (right - left < 0.12) return;

    // Tramo sólido antes del vano
    if (left - cursor > 0.02) {
      add(ribbon({ sStart: cursor, sEnd: left, yBottom: 0, yTop: wallH }, wallMat));
      if (skirtMat) add(skirt({ sStart: cursor, sEnd: left }));
    }

    // Antepecho inferior bajo el vano (si es ventana con alféizar > 0)
    if (op.yBottom > 0.02) {
      add(ribbon({ sStart: left, sEnd: right, yBottom: 0, yTop: op.yBottom }, wallMat));
      if (skirtMat && op.yBottom >= 0.08) add(skirt({ sStart: left, sEnd: right }));
    }

    // Dintel superior sobre la puerta o ventana
    if (wallH - op.yTop > 0.02) {
      add(ribbon({ sStart: left, sEnd: right, yBottom: op.yTop, yTop: wallH }, wallMat));
    }

    cursor = right;
  });

  // Tramo sólido final después del último vano
  if (L - cursor > 0.02) {
    add(ribbon({ sStart: cursor, sEnd: L, yBottom: 0, yTop: wallH }, wallMat));
    if (skirtMat) add(skirt({ sStart: cursor, sEnd: L }));
  }
}

/** Desplaza un contorno cerrado hacia afuera `d` metros (unión a inglete con límite). */
function offsetOutline(points, d, isCCW) {
  const n = points.length;
  const sign = isCCW ? -1 : 1;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const a = { x: p.x - prev.x, z: p.z - prev.z };
    const b = { x: next.x - p.x, z: next.z - p.z };
    const la = Math.hypot(a.x, a.z) || 1;
    const lb = Math.hypot(b.x, b.z) || 1;
    // normales exteriores de las dos aristas que se encuentran en el vértice
    const n1 = { x: (-sign * a.z) / la, z: (sign * a.x) / la };
    const n2 = { x: (-sign * b.z) / lb, z: (sign * b.x) / lb };
    let mx = n1.x + n2.x;
    let mz = n1.z + n2.z;
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-4) return { x: p.x + n1.x * d, z: p.z + n1.z * d };
    mx /= ml;
    mz /= ml;
    const cosHalf = Math.max(0.35, mx * n1.x + mz * n1.z);
    return { x: p.x + (mx * d) / cosHalf, z: p.z + (mz * d) / cosHalf };
  });
}

function outlineShape(points) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, -points[0].z);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, -points[i].z);
  shape.closePath();
  return shape;
}

/** Capa de los objetos que tapan el sol pero dejan pasar la luz del cielo (ver engine.js). */
const SUN_ONLY_LAYER = 1;

/**
 * Decide qué muros se levantan completos y cuáles quedan recortados a un zócalo.
 * `decide(part)` → true si el muro va completo. Devuelve true si algo cambió.
 */
export function setWallCut(shell, decide) {
  const parts = shell?.userData?.wallParts;
  if (!parts) return false;
  let changed = false;
  parts.forEach((part) => {
    const up = Boolean(decide(part));
    if (part.full.visible !== up) {
      part.full.visible = up;
      part.stub.visible = !up;
      changed = true;
    }
  });
  return changed;
}

/** Reglas fijas de corte (las que usaba el render estático). */
export function staticWallCut(cutMode, part, wallCount) {
  if (cutMode === 'full') return true;
  if (cutMode === 'none') return false;
  if (cutMode === 'back_left') return part.inZ > 0.15 || part.inX > 0.15 || part.index === 0 || part.index === wallCount - 1;
  return part.inX * 0.58 + part.inZ * 0.81 >= -0.05;
}

/**
 * Construye el cascarón 3D de una sala con cualquier planta poligonal (`roomPolygon`),
 * incluyendo paredes en ángulo o curvas suaves, sincronización automática con los materiales de
 * superficie del usuario (`materials`) y recorte de vanos reales para todas las puertas y
 * ventanales (sincronizados o del catálogo).
 *
 * Cada muro se construye dos veces: completo (`wall_i`) y recortado a un zócalo (`wall_stub_i`).
 * `cutMode` fija cuál se ve al principio ('auto' | 'back_left' | 'full' | 'none') y el visor puede
 * cambiarlo en cada cuadro con `setWallCut` para que la maqueta siempre deje ver el interior.
 * El techo y la cubierta (`userData.ceiling`) nacen ocultos: se muestran al entrar a la sala o al
 * verla desde afuera.
 */
export function polygonRoomShell(
  M,
  {
    roomPolygon,
    materials = null,
    syncSurfaceMaterials = false,
    sceneItems = [],
    wall = 0xf1eee8,
    floor = 'planks',
    floorColor = 0x8d8a86,
    wood = 'oak',
    primaryColor = 0x7464cc,
    t = 0.13,
    cut = 0x3a3842,
    skirting = 0xfaf9f6,
    cutMode = 'auto', // 'auto' | 'back_left' | 'full' | 'none'
    facade = 0xe8e2d6, // color del revestimiento exterior; null para no ponerlo
    ceilingColor = 0xffffff,
  } = {}
) {
  const layout = getPolygonLayout(roomPolygon);
  const { H, outlinePoints, walls, isCCW } = layout;
  const g = new THREE.Group();
  const capMat = M.plastic(cut, { roughness: 0.7 });
  const skirtMat = M.paint(skirting, { roughness: 0.6 });
  const facadeMat = facade !== null && facade !== undefined ? M.paint(facade, { roughness: 0.96 }) : null;
  const plinthMat = M.concrete(0xa7abb2);
  const cladding = 0.03;

  // Determinar el material general de las paredes del recinto (para que si el usuario puso "Puerta" o "Vidrio"
  // en una pared, el resto de esa pared conserve el material general del recinto)
  let generalWallMatId = 'plaster_gypsum_smooth';
  if (syncSurfaceMaterials && materials) {
    const counts = {};
    walls.forEach((_, i) => {
      const mId = materials[`wall_${i}`]?.materialId;
      if (mId && !isOpeningOrDraperyMaterial(mId)) {
        counts[mId] = (counts[mId] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) generalWallMatId = sorted[0][0];
  }
  const generalWallMat = syncSurfaceMaterials
    ? resolveStructuralWallMaterial(M, generalWallMatId, wall, wood)
    : M.paint(wall);

  const floorResolved = resolveFloorMaterialFromProject(
    M,
    syncSurfaceMaterials ? materials?.floor?.materialId : null,
    floor,
    floorColor
  );

  // 1. Piso poligonal extruido (incluyendo contorno curvo)
  if (outlinePoints.length >= 3) {
    const shape = outlineShape(outlinePoints);

    // Losa base estructural
    const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
    slabGeo.rotateX(-Math.PI / 2);
    slabGeo.translate(0, -0.18, 0);
    g.add(lit(new THREE.Mesh(slabGeo, M.paint(0xdedbd4))));

    // Acabado de piso superior
    const floorGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(0, -0.02, 0);
    const uvScale = floorResolved.isCarpet ? 0.3 : 2.6;
    projectUV(floorGeo, { grain: 'x', along: uvScale, across: uvScale });
    const floorMesh = lit(new THREE.Mesh(floorGeo, floorResolved.mat));
    floorMesh.name = 'floor';
    g.add(floorMesh);
  }

  // 2. Paredes perimetrales (rectas o curvas continuas + puertas/ventanas/cortinas de Materiales y Catálogo)
  const wallParts = [];
  walls.forEach((wInfo, idx) => {
    const full = new THREE.Group();
    full.name = `wall_${idx}`;
    const stub = new THREE.Group();
    stub.name = `wall_stub_${idx}`;

    const wallCfg = syncSurfaceMaterials && materials ? materials[`wall_${idx}`] : null;
    const wallMatId = wallCfg?.materialId || generalWallMatId;

    // Si la pared tiene asignada Puerta, Ventana o Cortina como material principal, la pared usa el material general del recinto
    const thisWallMat =
      syncSurfaceMaterials && !isOpeningOrDraperyMaterial(wallMatId)
        ? resolveStructuralWallMaterial(M, wallMatId, wall, wood)
        : generalWallMat;

    // Detectar qué elementos arquitectónicos (puerta, ventana, cortina) lleva esta pared en Materiales
    const archFeatures = [];
    if (syncSurfaceMaterials && wallCfg) {
      if (DOOR_MAT_IDS.has(wallMatId)) {
        archFeatures.push({ kind: 'door', matId: wallMatId });
      } else if (WINDOW_MAT_IDS.has(wallMatId)) {
        archFeatures.push({ kind: 'window', matId: wallMatId });
      } else if (CURTAIN_MAT_IDS.has(wallMatId)) {
        archFeatures.push({ kind: 'curtain', matId: wallMatId });
      }
      if (Array.isArray(wallCfg.subElements)) {
        wallCfg.subElements.forEach((sub) => {
          const sm = sub?.materialId;
          if (!sm) return;
          if (DOOR_MAT_IDS.has(sm)) archFeatures.push({ kind: 'door', matId: sm, area: sub.area });
          else if (WINDOW_MAT_IDS.has(sm)) archFeatures.push({ kind: 'window', matId: sm, area: sub.area });
          else if (CURTAIN_MAT_IDS.has(sm)) archFeatures.push({ kind: 'curtain', matId: sm, area: sub.area });
        });
      }
    }

    // Recolectar todos los vanos (aberturas de puertas y ventanas) en esta pared
    const wallOpenings = [];
    const placedSyncFeatures = [];

    archFeatures.forEach((feat, fIdx) => {
      const offsetAlong =
        archFeatures.length === 1
          ? 0
          : (fIdx - (archFeatures.length - 1) / 2) * Math.min(1.65, wInfo.length * 0.34);

      if (feat.kind === 'door' && wInfo.length >= 0.95) {
        const doorW = Math.min(0.92, wInfo.length - 0.25);
        const doorH = Math.min(2.05, H - 0.15);
        wallOpenings.push({
          sLeft: wInfo.length / 2 + offsetAlong - doorW / 2,
          sRight: wInfo.length / 2 + offsetAlong + doorW / 2,
          yBottom: 0,
          yTop: doorH,
        });
        placedSyncFeatures.push({ ...feat, offsetAlong, w: doorW, h: doorH, centerY: doorH / 2 });
      } else if (feat.kind === 'window' && wInfo.length >= 1.0) {
        const winW = Math.min(1.65, Math.max(0.85, wInfo.length * 0.42));
        const winH = Math.min(1.20, Math.max(0.75, H * 0.44));
        const winCenterY = Math.min(1.48, H * 0.54);
        wallOpenings.push({
          sLeft: wInfo.length / 2 + offsetAlong - winW / 2,
          sRight: wInfo.length / 2 + offsetAlong + winW / 2,
          yBottom: Math.max(0.25, winCenterY - winH / 2),
          yTop: Math.min(H - 0.12, winCenterY + winH / 2),
        });
        placedSyncFeatures.push({ ...feat, offsetAlong, w: winW, h: winH, centerY: winCenterY });
      } else if (feat.kind === 'curtain' && wInfo.length >= 0.9) {
        const curtW = Math.min(2.80, wInfo.length * 0.68);
        const curtH = Math.min(2.40, H - 0.16);
        placedSyncFeatures.push({ ...feat, offsetAlong, w: curtW, h: curtH, centerY: curtH / 2 + 0.06 });
      }
    });

    // También abrir vanos reales en el muro para las puertas y ventanales colocados desde el Catálogo 3D
    if (Array.isArray(sceneItems)) {
      sceneItems.forEach((item) => {
        if (!item || item.enabled === false || item.mount !== 'wall') return;
        const itemWallIdx = ((Number(item.wallIndex) || 0) % walls.length + walls.length) % walls.length;
        if (itemWallIdx !== idx) return;

        const isDoor = CATALOG_DOOR_TYPES.has(item.typeId);
        const isWin = CATALOG_WINDOW_TYPES.has(item.typeId);
        if (!isDoor && !isWin) return;

        const count = Math.max(1, Math.min(12, Number(item.count) || 1));
        const spacing = Number(item.spacing) ?? 0.12;
        const unitW = Number(item.dims?.w) || (isDoor ? 0.92 : 1.65);
        const unitH = Number(item.dims?.h) || (isDoor ? 2.05 : 1.25);
        const pitch = unitW + spacing;

        for (let i = 0; i < count; i++) {
          const along = (Number(item.along) || 0) + (i - (count - 1) / 2) * pitch;
          const clampedAlong = clamp(along, -wInfo.length / 2 + 0.1, wInfo.length / 2 - 0.1);
          const centerY = isDoor
            ? unitH / 2
            : item.typeId === 'floor_to_ceiling_window'
              ? unitH / 2 + 0.04
              : clamp(Number(item.elevation) || 1.4, unitH / 2 + 0.05, H - unitH / 2 - 0.05);

          wallOpenings.push({
            sLeft: wInfo.length / 2 + clampedAlong - unitW / 2,
            sRight: wInfo.length / 2 + clampedAlong + unitW / 2,
            yBottom: isDoor ? 0 : Math.max(0, centerY - unitH / 2),
            yTop: Math.min(H - 0.05, centerY + unitH / 2),
          });
        }
      });
    }

    // En las esquinas salientes el muro se prolonga su propio espesor para cerrarlas sin muescas
    const prev = walls[(idx - 1 + walls.length) % walls.length];
    const next = walls[(idx + 1) % walls.length];
    const convexStart = wInfo.tx * prev.inX + wInfo.tz * prev.inZ > 1e-3;
    const convexEnd = -(wInfo.tx * next.inX + wInfo.tz * next.inZ) > 1e-3;
    const endsFor = (reach) => ({ extStart: convexStart ? reach : 0, extEnd: convexEnd ? reach : 0 });

    // Muro completo con sus vanos y zócalo
    addWallWithOpenings(full, wInfo, {
      wallH: H,
      thickness: t,
      openings: wallOpenings,
      wallMat: thisWallMat,
      skirtMat,
      isFullWall: true,
      ...endsFor(t),
    });
    const fullCap = buildWallRibbonMesh(wInfo, { yBottom: H, yTop: H + 0.015, thickness: t + 0.006, ...endsFor(t + 0.006) }, capMat);
    if (fullCap) full.add(fullCap);

    // Revestimiento de fachada por la cara exterior, sobre un zócalo de concreto
    if (facadeMat) {
      const ends = endsFor(t + cladding);
      addWallWithOpenings(full, wInfo, {
        wallH: H + 0.015,
        thickness: cladding,
        offset: t,
        openings: wallOpenings,
        wallMat: facadeMat,
        skirtMat: null,
        isFullWall: true,
        ...ends,
      });
      const base = buildWallRibbonMesh(wInfo, { yBottom: -0.18, yTop: 0, thickness: cladding + 0.012, offset: t, ...endsFor(t + cladding + 0.012) }, plinthMat);
      if (base) full.add(base);
    }

    // Versión recortada: zócalo bajo con remate oscuro de corte arquitectónico
    addWallWithOpenings(stub, wInfo, { wallH: 0.14, thickness: t, wallMat: thisWallMat, skirtMat: null, isFullWall: false, ...endsFor(t) });
    const stubCap = buildWallRibbonMesh(wInfo, { yBottom: 0.14, yTop: 0.155, thickness: t + 0.006, ...endsFor(t + 0.006) }, capMat);
    if (stubCap) stub.add(stubCap);

    // Colocar los elementos arquitectónicos 3D sincronizados desde "Materiales"
    placedSyncFeatures.forEach((feat) => {
      const pt = sampleWallPoint(wInfo, feat.offsetAlong);
      if (feat.kind === 'door') {
        const doorObj = archDoor(M, { w: feat.w, h: feat.h, wood, wallThickness: t });
        full.add(place(doorObj, { x: pt.x, y: feat.centerY, z: pt.z, ry: pt.rotationY }));
      } else if (feat.kind === 'window') {
        const winObj = archWindow(M, {
          w: feat.w,
          h: feat.h,
          open: feat.matId === 'open_window_total_absorption',
          double: feat.matId === 'glass_double_insulated' || feat.matId === 'window_double',
          wallThickness: t,
        });
        full.add(place(winObj, { x: pt.x, y: feat.centerY, z: pt.z, ry: pt.rotationY }));
      } else if (feat.kind === 'curtain') {
        const curtObj = drapedCurtain(M, { w: feat.w, h: feat.h, color: primaryColor });
        full.add(
          place(curtObj, {
            x: pt.x + pt.inX * 0.015,
            y: feat.centerY,
            z: pt.z + pt.inZ * 0.015,
            ry: pt.rotationY,
          })
        );
      }
    });

    const part = { index: idx, full, stub, inX: wInfo.inX, inZ: wInfo.inZ, midX: wInfo.midX, midZ: wInfo.midZ };
    const up = staticWallCut(cutMode, part, walls.length);
    full.visible = up;
    stub.visible = !up;
    g.add(full, stub);
    wallParts.push(part);
  });

  // 3. Techo interior y cubierta (ocultos en la vista de maqueta)
  const ceiling = new THREE.Group();
  ceiling.name = 'ceiling';
  ceiling.visible = false;
  if (outlinePoints.length >= 3) {
    const inner = new THREE.ExtrudeGeometry(outlineShape(outlinePoints), { depth: 0.06, bevelEnabled: false });
    inner.rotateX(-Math.PI / 2);
    inner.translate(0, H, 0);
    ceiling.add(lit(new THREE.Mesh(inner, M.paint(ceilingColor))));

    const roofOutline = offsetOutline(outlinePoints, t + cladding + 0.12, isCCW);
    const roof = new THREE.ExtrudeGeometry(outlineShape(roofOutline), { depth: 0.16, bevelEnabled: false });
    roof.rotateX(-Math.PI / 2);
    roof.translate(0, H + 0.06, 0);
    projectUV(roof, { grain: 'x', along: 2.4, across: 2.4 });
    ceiling.add(lit(new THREE.Mesh(roof, M.concrete(0x9a9ea6))));
    ceiling.traverse((o) => {
      if (o.isMesh) o.layers.set(SUN_ONLY_LAYER);
    });
  }
  g.add(ceiling);

  g.userData.layout = layout;
  g.userData.wallParts = wallParts;
  g.userData.ceiling = ceiling;
  return g;
}
