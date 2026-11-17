import * as THREE from 'three';
import * as K from './kit.js';
import { AUDIO_BUILDERS } from './kitAudio.js';
import { BUILDING_BUILDERS } from './kitBuilding.js';
import { add, bar, cone, disc, extrude, FAB, lathe, legs, lit, torus, tube, wuv } from './kitParts.js';

/**
 * Segunda parte del kit de modelado: los objetos que amplían el catálogo.
 *
 *   hogar y cocina · cómputo · dormitorio · sala, comedor y oficina · herramientas · decoración
 *   (los instrumentos y equipos de sonido están en kitAudio.js)
 *
 * Cada constructor recibe (M, c) con c = { w, h, d, t, dims, color, wood, pal, night, item } y
 * devuelve un grupo con el origen en el centro de su huella, creciendo hacia +Y y con el frente
 * hacia +Z. Las piezas de pared nacen en el plano del muro y crecen hacia +Z; las de techo
 * cuelgan hacia −Y. Todo es geometría propia: ningún modelo usa marcas ni logotipos.
 */

const { box, cyl, ball, place } = K;
const G = () => new THREE.Group();
const PI = Math.PI;

/* ============================================================ HOGAR Y COCINA */

function fridge(M, { w, h, d }) {
  const g = G();
  const steel = M.metal(0xc9cdd3, { roughness: 0.42 });
  const dark = M.plastic(0x2b2d31, { roughness: 0.6 });
  g.add(box(w, h - 0.06, d - 0.05, M.metal(0xb4b8be, { roughness: 0.5 }), { r: 0.012, y: (h - 0.06) / 2 + 0.06, z: -0.025 }));
  g.add(box(w - 0.04, 0.06, d - 0.1, dark, { y: 0.03 }));
  const freezer = (h - 0.08) * 0.32;
  const main = h - 0.08 - freezer - 0.012;
  g.add(box(w - 0.006, main, 0.05, steel, { r: 0.012, y: 0.07 + main / 2, z: d / 2 - 0.025 }));
  g.add(box(w - 0.006, freezer, 0.05, steel, { r: 0.012, y: 0.07 + main + 0.012 + freezer / 2, z: d / 2 - 0.025 }));
  const handle = M.metal(0x8f949b, { roughness: 0.3 });
  g.add(cyl(0.012, 0.012, main * 0.42, handle, { seg: 12, x: -w / 2 + 0.07, y: 0.07 + main * 0.72, z: d / 2 + 0.03 }));
  g.add(cyl(0.012, 0.012, freezer * 0.55, handle, { seg: 12, x: -w / 2 + 0.07, y: 0.07 + main + freezer * 0.42, z: d / 2 + 0.03 }));
  return g;
}

function washingMachine(M, { w, h, d }) {
  const g = G();
  const white = M.plastic(0xf1f2f4, { roughness: 0.38 });
  g.add(box(w, h - 0.03, d, white, { r: 0.014, y: (h - 0.03) / 2 + 0.03 }));
  g.add(box(w - 0.06, 0.03, d - 0.06, M.plastic(0x33353a), { y: 0.015 }));
  const cy = h * 0.47;
  const r = Math.min(w, h) * 0.3;
  g.add(torus(r, 0.028, M.metal(0xc4c8ce, { roughness: 0.28 }), { y: cy, z: d / 2 + 0.006, seg: 40 }));
  g.add(cyl(r - 0.012, r - 0.012, 0.02, M.plastic(0x16202c, { roughness: 0.12 }), { seg: 40, y: cy, z: d / 2 + 0.002, rx: PI / 2 }));
  g.add(box(w - 0.04, 0.11, 0.012, M.plastic(0xdfe1e5, { roughness: 0.4 }), { y: h - 0.085, z: d / 2 + 0.004 }));
  g.add(cyl(0.034, 0.034, 0.022, M.metal(0xb9bdc4, { roughness: 0.3 }), { seg: 24, x: w * 0.2, y: h - 0.085, z: d / 2 + 0.018, rx: PI / 2 }));
  g.add(box(0.12, 0.04, 0.004, M.glow(0x6fd3ff, 1.4), { x: -w * 0.18, y: h - 0.085, z: d / 2 + 0.012 }));
  return g;
}

function microwave(M, { w, h, d, night }) {
  const g = G();
  const body = M.plastic(0x26282c, { roughness: 0.45 });
  g.add(box(w, h, d, body, { r: 0.012, y: h / 2 }));
  g.add(box(w * 0.68, h - 0.05, 0.008, M.plastic(0x0d1116, { roughness: 0.1 }), { x: -w * 0.13, y: h / 2, z: d / 2 + 0.002 }));
  g.add(cyl(0.008, 0.008, h * 0.62, M.metal(0xb9bdc4, { roughness: 0.3 }), { seg: 10, x: w * 0.215, y: h / 2, z: d / 2 + 0.02 }));
  g.add(box(0.07, 0.03, 0.004, M.glow(0x7dffb0, night ? 2.2 : 1.5), { x: w * 0.37, y: h * 0.74, z: d / 2 + 0.003 }));
  for (let i = 0; i < 3; i++) g.add(box(0.07, 0.016, 0.006, M.plastic(0x3a3d43), { x: w * 0.37, y: h * 0.5 - i * 0.03, z: d / 2 + 0.003 }));
  return g;
}

function stoveOven(M, { w, h, d }) {
  const g = G();
  const steel = M.metal(0xc3c7cd, { roughness: 0.4 });
  const black = M.plastic(0x131417, { roughness: 0.22 });
  g.add(box(w, h - 0.03, d, steel, { r: 0.008, y: (h - 0.03) / 2 }));
  g.add(box(w, 0.03, d, black, { r: 0.006, y: h - 0.015 }));
  g.add(box(w - 0.1, h * 0.48, 0.012, M.plastic(0x0e1014, { roughness: 0.1 }), { y: h * 0.4, z: d / 2 + 0.002 }));
  g.add(cyl(0.011, 0.011, w - 0.16, M.metal(0x8f949b, { roughness: 0.3 }), { seg: 12, y: h * 0.7, z: d / 2 + 0.035, rz: PI / 2 }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const r = sz > 0 ? 0.085 : 0.07;
      g.add(torus(r, 0.008, M.metal(0x4a4d53, { roughness: 0.55 }), { x: sx * w * 0.24, y: h + 0.006, z: sz * d * 0.2, rx: PI / 2, seg: 28 }));
      g.add(disc(r * 0.45, M.plastic(0x2a2c30), { x: sx * w * 0.24, y: h + 0.004, z: sz * d * 0.2 }));
    }
  }
  for (let i = 0; i < 5; i++) g.add(cyl(0.018, 0.018, 0.02, black, { seg: 16, x: (i - 2) * w * 0.17, y: h - 0.075, z: d / 2 + 0.012, rx: PI / 2 }));
  return g;
}

function kitchenCounter(M, { w, h, d, wood }) {
  const g = G();
  const front = M.wood(wood, 1, { roughness: 0.5 });
  const top = M.concrete(0xe9e6df, { roughness: 0.35 });
  g.add(box(w, h - 0.14, d - 0.05, M.wood(wood, 0), { y: (h - 0.14) / 2 + 0.1, z: -0.025, uv: wuv('x') }));
  g.add(box(w - 0.06, 0.1, d - 0.12, M.plastic(0x2b2d31), { y: 0.05, z: -0.03 }));
  g.add(box(w + 0.03, 0.04, d + 0.02, top, { r: 0.006, y: h - 0.02 }));
  const doors = Math.max(2, Math.round(w / 0.5));
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    g.add(box(dw - 0.012, h - 0.17, 0.02, front, { r: 0.004, x, y: (h - 0.17) / 2 + 0.115, z: d / 2 - 0.045, uv: wuv('y') }));
    g.add(bar(0.006, 0.12, M.metal(0x8f949b, { roughness: 0.3 }), { x: x + (i % 2 ? -1 : 1) * (dw / 2 - 0.04), y: h * 0.62, z: d / 2 - 0.028 }));
  }
  // lavaplatos y grifo
  g.add(box(0.46, 0.012, d * 0.56, M.metal(0xb7bbc2, { roughness: 0.3 }), { x: -w * 0.2, y: h + 0.002 }));
  g.add(box(0.4, 0.02, d * 0.48, M.metal(0x7b8088, { roughness: 0.45 }), { x: -w * 0.2, y: h - 0.006 }));
  g.add(tube([[-w * 0.2, h, -d * 0.3], [-w * 0.2, h + 0.24, -d * 0.3], [-w * 0.2, h + 0.27, -d * 0.2], [-w * 0.2, h + 0.2, -d * 0.12]], 0.011, M.metal(0xc9cdd3, { roughness: 0.2 })));
  return g;
}

function blender(M, { h }) {
  const g = G();
  g.add(cyl(0.07, 0.085, h * 0.3, M.plastic(0x26282c, { roughness: 0.4 }), { seg: 24, y: h * 0.15 }));
  g.add(cyl(0.075, 0.055, h * 0.58, M.glass(0xd9f2ff, { opacity: 0.5 }), { seg: 24, y: h * 0.6 }));
  g.add(cyl(0.06, 0.05, h * 0.3, M.plastic(0xd9534f, { roughness: 0.5 }), { seg: 20, y: h * 0.47 }));
  g.add(cyl(0.079, 0.079, h * 0.06, M.plastic(0x1a1b1e), { seg: 24, y: h * 0.92 }));
  g.add(disc(0.018, M.glow(0x7dffb0, 1.4), { y: h * 0.16, z: 0.082, rx: PI / 2 }));
  return g;
}

function kettleToaster(M) {
  const g = G();
  const steel = M.metal(0xcfd3d9, { roughness: 0.25 });
  g.add(cyl(0.065, 0.085, 0.2, steel, { seg: 28, x: -0.14, y: 0.1 }));
  g.add(cyl(0.05, 0.065, 0.02, M.plastic(0x1e1f22), { seg: 24, x: -0.14, y: 0.21 }));
  g.add(torus(0.06, 0.011, M.plastic(0x1e1f22), { x: -0.225, y: 0.12, arc: PI, rz: PI / 2, seg: 16 }));
  g.add(cone(0.02, 0.05, steel, { x: -0.07, y: 0.17, rz: -1.1 }));
  g.add(box(0.26, 0.17, 0.15, M.plastic(0xe9e2d3, { roughness: 0.4 }), { r: 0.03, seg: 3, x: 0.14, y: 0.085 }));
  for (const sz of [-1, 1]) g.add(box(0.2, 0.006, 0.03, M.plastic(0x1e1f22), { x: 0.14, y: 0.171, z: sz * 0.035 }));
  g.add(box(0.012, 0.05, 0.02, M.plastic(0x1e1f22), { x: 0.275, y: 0.1 }));
  g.userData.width = 0.56;
  return g;
}

function standingFan(M, { h }) {
  const g = G();
  const white = M.plastic(0xeceef1, { roughness: 0.4 });
  const steel = M.metal(0xb9bdc4, { roughness: 0.3 });
  g.add(cyl(0.2, 0.22, 0.03, white, { seg: 32, y: 0.015 }));
  g.add(cyl(0.016, 0.02, h - 0.3, steel, { seg: 14, y: (h - 0.3) / 2 + 0.03 }));
  const head = G();
  for (const r of [0.2, 0.14, 0.07]) {
    head.add(torus(r, 0.005, steel, { z: 0.05, seg: 36 }));
    head.add(torus(r, 0.005, steel, { z: -0.05, seg: 36 }));
  }
  head.add(torus(0.2, 0.008, white, { seg: 36 }));
  for (let i = 0; i < 3; i++) {
    const blade = box(0.15, 0.055, 0.004, M.plastic(0x8fb4d9, { roughness: 0.3 }), { r: 0.002, x: 0.085 });
    const arm = G();
    arm.add(blade);
    blade.rotation.x = 0.35;
    arm.rotation.z = (i / 3) * PI * 2;
    head.add(arm);
  }
  head.add(cyl(0.04, 0.05, 0.1, white, { seg: 20, z: -0.08, rx: PI / 2 }));
  head.add(ball(0.028, white, { z: 0.02 }));
  g.add(place(head, { y: h - 0.22 }));
  head.rotation.x = -0.12;
  return g;
}

function waterDispenser(M, { w, h, d }) {
  const g = G();
  const white = M.plastic(0xf1f2f4, { roughness: 0.4 });
  const bodyH = h * 0.72;
  g.add(box(w, bodyH, d, white, { r: 0.02, seg: 3, y: bodyH / 2 }));
  g.add(box(w * 0.7, bodyH * 0.24, 0.02, M.plastic(0xd9dce1), { y: bodyH * 0.62, z: d / 2 + 0.002 }));
  for (const [sx, color] of [[-1, 0x2f7de1], [1, 0xd9534f]]) g.add(box(0.035, 0.05, 0.03, M.plastic(color), { x: sx * 0.06, y: bodyH * 0.66, z: d / 2 + 0.02 }));
  g.add(cyl(0.13, 0.13, h * 0.22, M.glass(0x7fc4ff, { opacity: 0.6 }), { seg: 28, y: bodyH + h * 0.12 }));
  g.add(ball(0.13, M.glass(0x7fc4ff, { opacity: 0.6 }), { y: bodyH + h * 0.23, sy: 0.5 }));
  return g;
}

function robotVacuum(M) {
  const g = G();
  g.add(cyl(0.17, 0.17, 0.075, M.plastic(0x1e1f22, { roughness: 0.3 }), { seg: 40, y: 0.045 }));
  g.add(cyl(0.05, 0.05, 0.02, M.plastic(0x33353a), { seg: 24, y: 0.092 }));
  g.add(torus(0.12, 0.004, M.glow(0x6fd3ff, 1.6), { y: 0.084, rx: PI / 2, seg: 40 }));
  g.userData.width = 0.36;
  return g;
}

/* ================================================================== CÓMPUTO */

function pcTower(M, { w, h, d, night }) {
  const g = G();
  const dark = M.plastic(0x17181b, { roughness: 0.4 });
  g.add(box(w, h - 0.02, d, dark, { r: 0.008, y: (h - 0.02) / 2 + 0.02 }));
  for (const sz of [-1, 1]) g.add(box(w - 0.02, 0.02, 0.03, M.plastic(0x0c0c0e), { y: 0.01, z: sz * (d / 2 - 0.05) }));
  g.add(box(0.006, h - 0.08, d - 0.07, M.glass(0xbcd6ff, { opacity: 0.5 }), { x: -w / 2 - 0.001, y: h / 2 + 0.01 }));
  g.add(box(0.004, h - 0.14, d - 0.14, M.glow(0x8b5cf6, night ? 2.2 : 1.4), { x: -w / 2 + 0.03, y: h / 2 + 0.01 }));
  for (let i = 0; i < 3; i++) g.add(torus(0.05, 0.007, M.glow(i === 1 ? 0x38bdf8 : 0xa78bfa, night ? 2.4 : 1.6), { y: 0.1 + i * 0.125, z: d / 2 + 0.003, seg: 28 }));
  g.add(disc(0.008, M.glow(0xffffff, 1.5), { x: w * 0.3, y: h - 0.03, z: d / 2 + 0.002, rx: PI / 2 }));
  return g;
}

/** Monitor de escritorio: base, cuello y panel. Devuelve el grupo con el panel mirando a +Z. */
function monitorPanel(M, { w = 0.62, kind = 'daw', glow = 1.3, lift = 0.11 }) {
  const g = G();
  const dark = M.plastic(0x17181b, { roughness: 0.4 });
  const ph = w * 0.58;
  g.add(box(0.26, 0.012, 0.18, dark, { r: 0.004, y: 0.006 }));
  g.add(box(0.04, lift + ph * 0.4, 0.02, dark, { y: (lift + ph * 0.4) / 2, z: -0.04 }));
  g.add(box(w, ph, 0.022, dark, { r: 0.008, y: lift + ph / 2, z: -0.015 }));
  g.add(box(w - 0.016, ph - 0.016, 0.002, M.screen(kind, glow), { y: lift + ph / 2, z: -0.003 }));
  return g;
}

function monitorSingle(M, { w, dims, night }) {
  const g = monitorPanel(M, { w, kind: dims.screenKind || 'daw', glow: night ? 2 : 1.3 });
  g.userData.width = w;
  return g;
}

function monitorDual(M, { w, dims, night }) {
  const g = G();
  const one = (w - 0.04) / 2;
  for (const sx of [-1, 1]) {
    const m = monitorPanel(M, { w: one, kind: sx < 0 ? dims.screenKind || 'daw' : 'chart', glow: night ? 2 : 1.3 });
    g.add(place(m, { x: sx * (one / 2 + 0.01), z: -0.02, ry: -sx * 0.22 }));
  }
  g.userData.width = w;
  return g;
}

function allInOne(M, { w, night }) {
  const g = G();
  const alu = M.metal(0xd3d7dc, { roughness: 0.3 });
  const ph = w * 0.6;
  g.add(box(0.2, 0.01, 0.17, alu, { r: 0.004, y: 0.005 }));
  g.add(box(0.11, 0.14, 0.012, alu, { y: 0.075, z: -0.05, rx: 0.2 }));
  g.add(box(w, ph, 0.014, alu, { r: 0.01, y: 0.13 + ph / 2, z: -0.03 }));
  g.add(box(w - 0.02, ph * 0.82, 0.002, M.screen('chart', night ? 2 : 1.3), { y: 0.13 + ph * 0.57, z: -0.022 }));
  g.add(box(0.3, 0.008, 0.11, alu, { r: 0.004, x: -0.03, y: 0.004, z: 0.17 }));
  g.add(box(0.06, 0.02, 0.1, M.plastic(0xf1f2f4), { r: 0.012, x: 0.2, y: 0.01, z: 0.17 }));
  g.userData.width = w;
  return g;
}

function keyboardMouse(M) {
  const g = G();
  g.add(box(0.74, 0.004, 0.3, M.fabric(0x26272b), { r: 0.002, y: 0.002 }));
  g.add(box(0.42, 0.018, 0.14, M.plastic(0x1e1f22, { roughness: 0.5 }), { r: 0.005, x: -0.12, y: 0.012 }));
  g.add(box(0.39, 0.004, 0.11, M.plastic(0x33353a), { x: -0.12, y: 0.022 }));
  g.add(box(0.062, 0.03, 0.11, M.plastic(0x1e1f22, { roughness: 0.35 }), { r: 0.014, seg: 3, x: 0.22, y: 0.018 }));
  g.add(box(0.008, 0.003, 0.02, M.glow(0x8b5cf6, 1.6), { x: 0.22, y: 0.034, z: -0.02 }));
  g.userData.width = 0.74;
  return g;
}

function printer(M, { w, h, d }) {
  const g = G();
  const body = M.plastic(0xe8eaed, { roughness: 0.45 });
  const dark = M.plastic(0x2b2d31, { roughness: 0.5 });
  g.add(box(w, h * 0.7, d, body, { r: 0.012, y: h * 0.35 }));
  g.add(box(w - 0.02, h * 0.28, d * 0.85, dark, { r: 0.008, y: h * 0.84, z: -d * 0.05 }));
  g.add(box(w * 0.7, 0.004, d * 0.5, M.paint(0xffffff, { roughness: 0.8 }), { y: h * 0.9, z: -d * 0.36, rx: -0.7 }));
  g.add(box(w * 0.74, 0.012, d * 0.34, dark, { y: h * 0.18, z: d / 2 + d * 0.12 }));
  g.add(box(w * 0.66, 0.003, d * 0.3, M.paint(0xffffff, { roughness: 0.8 }), { y: h * 0.19, z: d / 2 + d * 0.1 }));
  g.add(box(0.09, 0.05, 0.004, M.glow(0x6fd3ff, 1.4), { x: w * 0.28, y: h * 0.52, z: d / 2 + 0.002 }));
  return g;
}

function routerWifi(M) {
  const g = G();
  const dark = M.plastic(0x17181b, { roughness: 0.4 });
  g.add(box(0.24, 0.035, 0.15, dark, { r: 0.008, y: 0.02 }));
  for (const sx of [-1, 0, 1]) g.add(cyl(0.005, 0.007, 0.16, dark, { seg: 8, x: sx * 0.09, y: 0.115, z: -0.06, rz: -sx * 0.18 }));
  for (let i = 0; i < 5; i++) g.add(box(0.008, 0.004, 0.002, M.glow(i < 3 ? 0x7dffb0 : 0x6fd3ff, 1.8), { x: -0.06 + i * 0.03, y: 0.024, z: 0.076 }));
  g.userData.width = 0.26;
  return g;
}

function serverRack(M, { w, h, d, night }) {
  const g = G();
  const dark = M.plastic(0x141518, { roughness: 0.5 });
  g.add(box(w, h, d, dark, { r: 0.008, y: h / 2 }));
  g.add(box(w - 0.08, h - 0.12, 0.01, M.plastic(0x0b0b0d, { roughness: 0.3 }), { y: h / 2, z: d / 2 + 0.002 }));
  const units = Math.max(6, Math.floor((h - 0.2) / 0.09));
  for (let i = 0; i < units; i++) {
    const y = 0.14 + i * ((h - 0.24) / units);
    g.add(box(w - 0.12, 0.05, 0.008, M.metal(0x3a3d43, { roughness: 0.5 }), { y, z: d / 2 + 0.008 }));
    for (let k = 0; k < 4; k++) g.add(box(0.012, 0.008, 0.003, M.glow((i + k) % 3 ? 0x7dffb0 : 0x6fd3ff, night ? 2.4 : 1.6), { x: -w / 2 + 0.1 + k * 0.03, y, z: d / 2 + 0.013 }));
  }
  g.add(bar(0.008, h * 0.2, M.metal(0x8f949b), { x: w / 2 - 0.05, y: h / 2, z: d / 2 + 0.02 }));
  return g;
}

function gameConsole(M) {
  const g = G();
  g.add(box(0.07, 0.3, 0.27, M.plastic(0xf1f2f4, { roughness: 0.35 }), { r: 0.012, seg: 3, x: -0.12, y: 0.16 }));
  g.add(box(0.045, 0.31, 0.24, M.plastic(0x17181b, { roughness: 0.3 }), { r: 0.008, x: -0.12, y: 0.16 }));
  g.add(box(0.1, 0.012, 0.16, M.plastic(0x17181b), { x: -0.12, y: 0.006 }));
  g.add(box(0.003, 0.2, 0.004, M.glow(0x6fd3ff, 1.8), { x: -0.083, y: 0.17, z: 0.1 }));
  const pad = G();
  pad.add(box(0.15, 0.03, 0.07, M.plastic(0xf1f2f4, { roughness: 0.4 }), { r: 0.014, seg: 3, y: 0.022 }));
  for (const sx of [-1, 1]) {
    pad.add(box(0.045, 0.035, 0.09, M.plastic(0xf1f2f4, { roughness: 0.4 }), { r: 0.016, seg: 3, x: sx * 0.062, y: 0.02, z: 0.03 }));
    pad.add(cyl(0.012, 0.012, 0.012, M.plastic(0x17181b), { seg: 14, x: sx * 0.03, y: 0.042, z: 0.012 }));
  }
  g.add(place(pad, { x: 0.1, z: 0.05, ry: 0.4 }));
  g.userData.width = 0.42;
  return g;
}

/* =============================================================== DORMITORIO */

function bed(M, { w, d, h, color, wood, pal }, pillows = 2) {
  const g = G();
  const frame = M.wood(wood, 0);
  const sheet = M.fabric(0xf4f1ea, { bump: 0.5 });
  const duvet = M.fabric(color, { bump: 0.9 });
  const base = Math.max(0.2, h - 0.24);
  g.add(box(w + 0.06, 0.16, d + 0.04, frame, { r: 0.012, y: base - 0.08, uv: wuv('z') }));
  g.add(legs(M.wood(wood, 1), w - 0.04, d - 0.1, base - 0.16, { r: 0.03 }));
  g.add(box(w + 0.06, 0.62, 0.06, frame, { r: 0.02, y: base + 0.31 - 0.16, z: -d / 2 - 0.01, uv: wuv('x') }));
  g.add(box(w, 0.22, d - 0.02, sheet, { r: 0.05, seg: 3, y: base + 0.11, uv: FAB }));
  g.add(box(w + 0.03, 0.09, d * 0.66, duvet, { r: 0.04, seg: 3, y: base + 0.235, z: d * 0.16, uv: FAB }));
  g.add(box(w + 0.03, 0.05, 0.22, M.fabric(pal.neutral, { bump: 0.7 }), { r: 0.025, seg: 3, y: base + 0.27, z: -d * 0.12, uv: FAB }));
  const pw = pillows === 1 ? Math.min(0.62, w - 0.2) : (w - 0.16) / 2 - 0.02;
  for (let i = 0; i < pillows; i++) {
    const x = pillows === 1 ? 0 : (i ? 1 : -1) * (pw / 2 + 0.02);
    g.add(box(pw, 0.12, 0.38, sheet, { r: 0.055, seg: 3, x, y: base + 0.27, z: -d / 2 + 0.26, rx: -0.16, uv: FAB }));
  }
  return g;
}

function bunkBed(M, { w, d, h, color, wood }) {
  const g = G();
  const frame = M.wood(wood, 0);
  const post = M.wood(wood, 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.07, h, 0.07, post, { r: 0.008, x: sx * (w / 2), y: h / 2, z: sz * (d / 2), uv: wuv('y') }));
  [0.3, h * 0.62].forEach((y, level) => {
    g.add(box(w, 0.1, d, frame, { r: 0.008, y, uv: wuv('z') }));
    g.add(box(w - 0.06, 0.16, d - 0.06, M.fabric(0xf4f1ea, { bump: 0.5 }), { r: 0.04, seg: 3, y: y + 0.13, uv: FAB }));
    g.add(box(w - 0.04, 0.06, d * 0.6, M.fabric(level ? color : 0xd9a441, { bump: 0.9 }), { r: 0.03, seg: 3, y: y + 0.22, z: d * 0.17, uv: FAB }));
    g.add(box(w * 0.6, 0.1, 0.34, M.fabric(0xffffff, { bump: 0.5 }), { r: 0.045, seg: 3, y: y + 0.24, z: -d / 2 + 0.24, uv: FAB }));
    for (const sz of [-1, 1]) g.add(box(w, 0.07, 0.03, frame, { y: y + 0.36, z: sz * (d / 2), uv: wuv('x') }));
  });
  // escalera
  for (const sz of [-1, 1]) g.add(box(0.035, h * 0.72, 0.035, post, { x: w / 2 + 0.03, y: h * 0.36, z: d * 0.24 + sz * 0.18, uv: wuv('y') }));
  for (let i = 0; i < 4; i++) g.add(box(0.03, 0.03, 0.36, post, { x: w / 2 + 0.03, y: 0.22 + i * 0.26, z: d * 0.24 }));
  return g;
}

function nightstand(M, { w, d, h, wood }) {
  const g = G();
  g.add(box(w, h - 0.12, d, M.wood(wood, 0), { r: 0.01, y: (h - 0.12) / 2 + 0.12, uv: wuv('x') }));
  g.add(legs(M.wood(wood, 1), w, d, 0.12, { r: 0.018 }));
  for (const fy of [0.34, 0.7]) {
    g.add(box(w - 0.04, (h - 0.12) * 0.36, 0.014, M.wood(wood, 2), { r: 0.004, y: 0.12 + (h - 0.12) * fy, z: d / 2 + 0.002, uv: wuv('x') }));
    g.add(cyl(0.012, 0.012, 0.02, M.metal(0xc9a24a, { roughness: 0.3 }), { seg: 14, y: 0.12 + (h - 0.12) * fy, z: d / 2 + 0.02, rx: PI / 2 }));
  }
  return g;
}

function wardrobe(M, { w, d, h, wood }) {
  const g = G();
  g.add(box(w, h - 0.08, d, M.wood(wood, 0), { r: 0.01, y: (h - 0.08) / 2 + 0.08, uv: wuv('y') }));
  g.add(box(w - 0.06, 0.08, d - 0.08, M.plastic(0x2b2d31), { y: 0.04 }));
  const doors = Math.max(2, Math.round(w / 0.55));
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    g.add(box(dw - 0.012, h - 0.12, 0.018, M.wood(wood, 1 + (i % 2)), { r: 0.004, x, y: (h - 0.12) / 2 + 0.1, z: d / 2 + 0.002, uv: wuv('y') }));
    g.add(bar(0.007, 0.22, M.metal(0x8f949b, { roughness: 0.3 }), { x: x + (i % 2 ? -1 : 1) * (dw / 2 - 0.045), y: h * 0.5, z: d / 2 + 0.022 }));
  }
  return g;
}

function dresser(M, { w, d, h, wood, dims }) {
  const g = G();
  g.add(box(w, h - 0.1, d, M.wood(wood, 0), { r: 0.01, y: (h - 0.1) / 2 + 0.1, uv: wuv('x') }));
  g.add(legs(M.wood(wood, 1), w - 0.04, d - 0.04, 0.1, { r: 0.02 }));
  const rows = 3;
  const rh = (h - 0.14) / rows;
  for (let r = 0; r < rows; r++) {
    for (const sx of [-1, 1]) {
      const y = 0.12 + rh * (r + 0.5);
      g.add(box(w / 2 - 0.03, rh - 0.02, 0.014, M.wood(wood, 2), { r: 0.004, x: sx * (w / 4 - 0.005), y, z: d / 2 + 0.002, uv: wuv('x') }));
      g.add(cyl(0.011, 0.011, 0.02, M.metal(0xc9a24a, { roughness: 0.3 }), { seg: 14, x: sx * (w / 4 - 0.005), y, z: d / 2 + 0.02, rx: PI / 2 }));
    }
  }
  if (dims.mirror !== false) {
    g.add(box(w * 0.62, 0.7, 0.03, M.wood(wood, 1), { r: 0.012, y: h + 0.4, z: -d / 2 + 0.03, uv: wuv('x') }));
    g.add(box(w * 0.62 - 0.06, 0.64, 0.004, M.plastic(0xcfdbe8, { roughness: 0.06 }), { y: h + 0.4, z: -d / 2 + 0.047 }));
  }
  return g;
}

function clothesRack(M, { w, h, pal }) {
  const g = G();
  const steel = M.metal(0x2b2d31, { roughness: 0.4 });
  for (const sx of [-1, 1]) {
    g.add(bar(0.012, h, steel, { x: sx * (w / 2), y: h / 2 }));
    g.add(box(0.03, 0.02, 0.5, steel, { x: sx * (w / 2), y: 0.01 }));
  }
  g.add(bar(0.012, w, steel, { y: h - 0.02, rz: PI / 2 }));
  g.add(box(w, 0.012, 0.36, M.wood('oak', 0), { y: 0.14, uv: wuv('x') }));
  const colors = [pal.primary, pal.neutral, pal.accent, pal.dark, pal.secondary, 0xffffff];
  const n = Math.max(4, Math.round(w / 0.16));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.12 + (i * (w - 0.24)) / (n - 1);
    const len = 0.62 + ((i * 7) % 4) * 0.09;
    g.add(box(0.028, len, 0.4, M.fabric(colors[i % colors.length], { bump: 0.7 }), { r: 0.012, x, y: h - 0.07 - len / 2, uv: FAB }));
  }
  return g;
}

/* ================================================= SALA, COMEDOR Y OFICINA */

function diningChair(M, { color, wood }) {
  const g = G();
  const wd = M.wood(wood, 1);
  g.add(box(0.42, 0.04, 0.42, wd, { r: 0.012, y: 0.44, uv: wuv('x') }));
  g.add(box(0.38, 0.03, 0.38, M.fabric(color, { bump: 0.7 }), { r: 0.014, seg: 3, y: 0.475, uv: FAB }));
  g.add(legs(wd, 0.38, 0.38, 0.42, { r: 0.017 }));
  for (const sx of [-1, 1]) g.add(box(0.03, 0.46, 0.03, wd, { x: sx * 0.185, y: 0.67, z: -0.19, uv: wuv('y') }));
  g.add(box(0.4, 0.16, 0.022, wd, { r: 0.008, y: 0.8, z: -0.19, uv: wuv('x') }));
  return g;
}

function diningTable(M, { w, d, h, color, wood, dims }) {
  const g = G();
  g.add(box(w, 0.04, d, M.wood(wood, 0), { r: 0.012, y: h - 0.02, uv: wuv('x') }));
  g.add(box(w - 0.2, 0.07, d - 0.2, M.wood(wood, 1), { y: h - 0.075, uv: wuv('x') }));
  g.add(legs(M.wood(wood, 1), w - 0.12, d - 0.12, h - 0.04, { r: 0.03 }));
  if (dims.withChairs !== false) {
    const perSide = Math.max(1, Math.round(w / 0.65));
    for (let i = 0; i < perSide; i++) {
      const x = -w / 2 + (w / perSide) * (i + 0.5);
      g.add(place(diningChair(M, { color, wood }), { x, z: -d / 2 - 0.16, ry: 0 }));
      g.add(place(diningChair(M, { color, wood }), { x, z: d / 2 + 0.16, ry: PI }));
    }
    if (w >= 1.8) {
      g.add(place(diningChair(M, { color, wood }), { x: -w / 2 - 0.16, ry: PI / 2 }));
      g.add(place(diningChair(M, { color, wood }), { x: w / 2 + 0.16, ry: -PI / 2 }));
    }
  }
  return g;
}

function sectionalSofa(M, { w, d, color, pal }) {
  const g = G();
  const f = M.fabric(color, { bump: 0.9 });
  const o = { uv: FAB, seg: 3 };
  const seatD = 0.9;
  g.add(box(w, 0.22, seatD, f, { ...o, r: 0.04, y: 0.23, z: -(d - seatD) / 2 }));
  g.add(box(w, 0.5, 0.2, f, { ...o, r: 0.07, y: 0.55, z: -d / 2 + 0.1 }));
  g.add(box(0.2, 0.42, seatD, f, { ...o, r: 0.07, x: -w / 2 + 0.1, y: 0.42, z: -(d - seatD) / 2 }));
  // chaise
  const cw = 0.95;
  g.add(box(cw, 0.22, d, f, { ...o, r: 0.04, x: w / 2 - cw / 2, y: 0.23 }));
  g.add(box(0.2, 0.42, d, f, { ...o, r: 0.07, x: w / 2 - 0.1, y: 0.42 }));
  const n = Math.max(2, Math.round((w - cw - 0.2) / 0.75));
  const cu = (w - cw - 0.22) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.21 + cu * (i + 0.5);
    g.add(box(cu - 0.01, 0.15, 0.64, f, { ...o, r: 0.055, x, y: 0.405, z: -(d - seatD) / 2 + 0.04 }));
    g.add(box(cu - 0.01, 0.36, 0.15, f, { ...o, r: 0.06, x, y: 0.64, z: -d / 2 + 0.27, rx: 0.16 }));
  }
  g.add(box(cw - 0.22, 0.15, d - 0.3, f, { ...o, r: 0.055, x: w / 2 - cw / 2 - 0.09, y: 0.405, z: 0.1 }));
  g.add(box(0.4, 0.4, 0.12, M.fabric(pal.accent, { bump: 0.9 }), { ...o, r: 0.05, x: -w / 2 + 0.5, y: 0.66, z: -d / 2 + 0.36, rx: 0.3, rz: 0.1 }));
  g.add(box(0.36, 0.36, 0.11, M.fabric(pal.secondary, { bump: 0.9 }), { ...o, r: 0.05, x: w / 2 - 0.55, y: 0.64, z: -d / 2 + 0.38, rx: 0.3, rz: -0.14 }));
  return g;
}

function beanBag(M, { w, color }) {
  const g = G();
  const f = M.fabric(color, { bump: 1.0 });
  g.add(ball(w / 2, f, { y: w * 0.3, sy: 0.62 }));
  g.add(ball(w * 0.36, f, { y: w * 0.56, z: -w * 0.14, sy: 0.8 }));
  return g;
}

function tvConsole(M, { w, d, h, wood }) {
  const g = G();
  const wd = M.wood(wood, 0);
  g.add(box(w, 0.03, d, wd, { r: 0.008, y: h - 0.015, uv: wuv('x') }));
  g.add(box(w, 0.03, d, wd, { r: 0.008, y: 0.115, uv: wuv('x') }));
  for (const fx of [-0.5, -0.17, 0.17, 0.5]) g.add(box(0.025, h - 0.13, d - 0.02, wd, { x: fx * (w - 0.025), y: (h - 0.13) / 2 + 0.115, uv: wuv('y') }));
  g.add(box(w - 0.03, h - 0.13, 0.012, M.wood(wood, 2), { y: (h - 0.13) / 2 + 0.115, z: -d / 2 + 0.012, uv: wuv('x') }));
  for (const sx of [-1, 1]) g.add(box(w * 0.33 - 0.03, h - 0.17, 0.016, M.wood(wood, 1), { r: 0.004, x: sx * w * 0.335, y: (h - 0.13) / 2 + 0.115, z: d / 2 - 0.012, uv: wuv('x') }));
  g.add(legs(M.metal(0x2b2d31), w - 0.16, d - 0.1, 0.1, { r: 0.012 }));
  g.add(box(0.36, 0.06, 0.24, M.plastic(0x17181b, { roughness: 0.3 }), { r: 0.006, y: 0.165 }));
  g.add(box(0.05, 0.004, 0.002, M.glow(0x6fd3ff, 1.6), { x: 0.12, y: 0.165, z: 0.121 }));
  return g;
}

function cubeShelf(M, { w, d, h, wood, pal }) {
  const g = G();
  const wd = M.wood(wood, 0);
  const cols = Math.max(2, Math.round(w / 0.38));
  const rows = Math.max(2, Math.round(h / 0.38));
  const cw = w / cols;
  const ch = h / rows;
  for (let i = 0; i <= cols; i++) g.add(box(0.022, h, d, wd, { x: -w / 2 + i * cw, y: h / 2, uv: wuv('y') }));
  for (let j = 0; j <= rows; j++) g.add(box(w + 0.022, 0.022, d, wd, { y: j * ch, uv: wuv('x') }));
  const fills = [pal.primary, pal.accent, pal.neutral, pal.secondary, pal.dark];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const k = (i * 3 + j * 5) % 7;
      const x = -w / 2 + cw * (i + 0.5);
      const y = j * ch + 0.011;
      if (k < 2) g.add(box(cw - 0.06, ch - 0.07, d - 0.04, M.fabric(fills[(i + j) % fills.length], { bump: 0.7 }), { r: 0.012, x, y: y + (ch - 0.07) / 2, uv: FAB }));
      else if (k < 5) for (let b = 0; b < 4; b++) g.add(box(0.035, ch * (0.55 + ((b * 3 + k) % 3) * 0.08), d * 0.6, M.paint(fills[(b + k) % fills.length], { roughness: 0.7 }), { x: x - cw * 0.3 + b * 0.045, y: y + ch * 0.32, z: -d * 0.1 }));
    }
  }
  return g;
}

function lDesk(M, { w, d, h, wood }) {
  const g = G();
  const top = M.wood(wood, 0);
  const steel = M.metal(0x2b2d31, { roughness: 0.4 });
  const depth = 0.68;
  g.add(box(w, 0.035, depth, top, { r: 0.008, y: h - 0.018, z: -(d - depth) / 2, uv: wuv('x') }));
  g.add(box(depth, 0.035, d - depth, top, { r: 0.008, x: w / 2 - depth / 2, y: h - 0.018, z: depth / 2, uv: wuv('z') }));
  const leg = (x, z) => g.add(box(0.05, h - 0.035, 0.05, steel, { x, y: (h - 0.035) / 2, z }));
  leg(-w / 2 + 0.06, -d / 2 + 0.06);
  leg(-w / 2 + 0.06, -d / 2 + depth - 0.06);
  leg(w / 2 - 0.06, -d / 2 + 0.06);
  leg(w / 2 - 0.06, d / 2 - 0.06);
  leg(w / 2 - depth + 0.06, d / 2 - 0.06);
  g.add(box(0.4, 0.5, 0.5, M.wood(wood, 1), { r: 0.008, x: -w / 2 + 0.3, y: h - 0.285, z: -(d - depth) / 2, uv: wuv('y') }));
  return g;
}

function standingDesk(M, { w, d, h, wood }) {
  const g = G();
  const steel = M.metal(0xdfe2e6, { roughness: 0.35 });
  g.add(box(w, 0.03, d, M.wood(wood, 0), { r: 0.012, y: h - 0.015, uv: wuv('x') }));
  for (const sx of [-1, 1]) {
    g.add(box(0.07, 0.025, d * 0.86, steel, { r: 0.006, x: sx * (w / 2 - 0.14), y: 0.0125 }));
    g.add(box(0.075, h * 0.5, 0.05, steel, { x: sx * (w / 2 - 0.14), y: h * 0.25 + 0.02 }));
    g.add(box(0.06, h * 0.5, 0.038, steel, { x: sx * (w / 2 - 0.14), y: h * 0.72 }));
  }
  g.add(box(w - 0.3, 0.04, 0.05, steel, { y: h - 0.05 }));
  g.add(box(0.1, 0.02, 0.03, M.plastic(0x17181b), { x: w / 2 - 0.2, y: h - 0.04, z: d / 2 - 0.01 }));
  return g;
}

function filingCabinet(M, { w, d, h }) {
  const g = G();
  const steel = M.metal(0x9aa0a8, { roughness: 0.55 });
  g.add(box(w, h, d, steel, { r: 0.008, y: h / 2 }));
  const n = Math.max(2, Math.round(h / 0.33));
  for (let i = 0; i < n; i++) {
    const y = (h / n) * (i + 0.5);
    g.add(box(w - 0.03, h / n - 0.02, 0.012, M.metal(0xb1b6bd, { roughness: 0.5 }), { r: 0.004, y, z: d / 2 + 0.002 }));
    g.add(box(0.14, 0.018, 0.02, M.metal(0x4a4d53, { roughness: 0.4 }), { r: 0.004, y: y + 0.04, z: d / 2 + 0.016 }));
    g.add(box(0.07, 0.04, 0.002, M.paint(0xffffff, { roughness: 0.8 }), { y: y - 0.03, z: d / 2 + 0.009 }));
  }
  return g;
}

function receptionCounter(M, { w, d, h, color, wood }) {
  const g = G();
  g.add(box(w, h - 0.04, 0.06, M.plastic(color, { roughness: 0.5 }), { r: 0.01, y: (h - 0.04) / 2, z: d / 2 - 0.03 }));
  g.add(box(w - 0.3, 0.012, 0.004, M.glow(0xffffff, 1.2), { y: 0.06, z: d / 2 + 0.002 }));
  g.add(box(w + 0.04, 0.04, 0.34, M.wood(wood, 0), { r: 0.008, y: h - 0.02, z: d / 2 - 0.15, uv: wuv('x') }));
  g.add(box(w - 0.04, 0.035, d - 0.1, M.wood(wood, 1), { r: 0.008, y: 0.74, z: -0.06, uv: wuv('x') }));
  for (const sx of [-1, 1]) g.add(box(0.04, 0.74, d - 0.1, M.wood(wood, 1), { x: sx * (w / 2 - 0.02), y: 0.37, z: -0.06, uv: wuv('y') }));
  return g;
}

function bench(M, { w, d, h, wood }) {
  const g = G();
  const steel = M.metal(0x2b2d31, { roughness: 0.45 });
  const slats = 4;
  for (let i = 0; i < slats; i++) g.add(box(w, 0.035, d / slats - 0.015, M.wood(wood, i % 3), { r: 0.008, y: h - 0.018, z: -d / 2 + (d / slats) * (i + 0.5), uv: wuv('x') }));
  for (const sx of [-1, 1]) {
    g.add(box(0.04, h - 0.035, d - 0.06, steel, { x: sx * (w / 2 - 0.14), y: (h - 0.035) / 2 }));
    g.add(box(0.06, 0.02, d, steel, { x: sx * (w / 2 - 0.14), y: 0.01 }));
  }
  return g;
}

function coatRack(M, { h, wood, pal }) {
  const g = G();
  const wd = M.wood(wood, 1);
  g.add(cyl(0.02, 0.026, h, wd, { seg: 14, y: h / 2 }));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    g.add(cyl(0.012, 0.016, 0.42, wd, { seg: 10, x: Math.cos(a) * 0.17, y: 0.08, z: Math.sin(a) * 0.17, rz: Math.cos(a) * 1.1, rx: -Math.sin(a) * 1.1 }));
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    g.add(cyl(0.008, 0.01, 0.2, wd, { seg: 8, x: Math.cos(a) * 0.08, y: h - 0.12 - (i % 2) * 0.16, z: Math.sin(a) * 0.08, rz: -Math.cos(a) * 0.9, rx: Math.sin(a) * 0.9 }));
  }
  g.add(box(0.36, 0.7, 0.07, M.fabric(pal.dark, { bump: 0.8 }), { r: 0.03, seg: 3, x: 0.13, y: h - 0.56, uv: FAB }));
  return g;
}

function foldingScreen(M, { w, h, color, wood }) {
  const g = G();
  const panels = 3;
  const pw = w / panels;
  let x = -w / 2 + pw * 0.48;
  for (let i = 0; i < panels; i++) {
    const p = G();
    const wd = M.wood(wood, i % 3);
    for (const sx of [-1, 1]) p.add(box(0.03, h, 0.03, wd, { x: sx * (pw / 2 - 0.015), y: h / 2, uv: wuv('y') }));
    for (const y of [0.06, h - 0.015]) p.add(box(pw, 0.03, 0.03, wd, { y, uv: wuv('x') }));
    p.add(box(pw - 0.06, h - 0.1, 0.012, M.fabric(color, { bump: 0.8 }), { y: h / 2 + 0.03, uv: FAB }));
    g.add(place(p, { x, z: i % 2 ? 0.08 : -0.08, ry: i % 2 ? -0.42 : 0.42 }));
    x += pw * 0.94;
  }
  g.userData.width = w;
  return g;
}

function standingMirror(M, { w, h, wood }) {
  const g = G();
  const m = G();
  m.add(box(w, h, 0.03, M.wood(wood, 0), { r: 0.012, y: h / 2, uv: wuv('y') }));
  m.add(box(w - 0.07, h - 0.07, 0.004, M.plastic(0xcfdbe8, { roughness: 0.06 }), { y: h / 2, z: 0.017 }));
  m.rotation.x = -0.14;
  g.add(m);
  g.add(box(w * 0.7, 0.02, 0.02, M.wood(wood, 1), { y: 0.01, z: -h * 0.16 }));
  g.add(cyl(0.01, 0.01, h * 0.8, M.wood(wood, 1), { seg: 8, y: h * 0.39, z: -h * 0.105, rx: 0.14 }));
  return g;
}

function wallShelf(M, { w, wood, pal }) {
  const g = G();
  g.add(box(w, 0.03, 0.22, M.wood(wood, 0), { r: 0.006, z: 0.11, uv: wuv('x') }));
  const colors = [pal.primary, pal.accent, pal.neutral, pal.dark, pal.secondary];
  for (let i = 0; i < 6; i++) g.add(box(0.03, 0.2 + (i % 3) * 0.025, 0.15, M.paint(colors[i % colors.length], { roughness: 0.7 }), { x: -w * 0.34 + i * 0.034, y: 0.115 + (i % 3) * 0.0125, z: 0.11 }));
  g.add(place(K.plant(M, { h: 0.3 }), { x: w * 0.3, y: 0.015, z: 0.11 }));
  g.userData.width = w;
  return g;
}

function wallClock(M, { w }) {
  const g = G();
  const r = w / 2;
  g.add(cyl(r, r, 0.03, M.plastic(0x1e1f22, { roughness: 0.4 }), { seg: 48, z: 0.015, rx: PI / 2 }));
  g.add(cyl(r - 0.015, r - 0.015, 0.004, M.paint(0xfaf8f3, { roughness: 0.7 }), { seg: 48, z: 0.031, rx: PI / 2 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    g.add(box(0.006, i % 3 ? 0.02 : 0.035, 0.002, M.plastic(0x1e1f22), { x: Math.sin(a) * (r - 0.04), y: Math.cos(a) * (r - 0.04), z: 0.034, rz: -a }));
  }
  g.add(box(0.008, r * 0.5, 0.003, M.plastic(0x1e1f22), { x: -r * 0.17, y: r * 0.17, z: 0.036, rz: 0.78 }));
  g.add(box(0.005, r * 0.72, 0.003, M.plastic(0x1e1f22), { y: r * 0.36, z: 0.038 }));
  g.add(cyl(0.012, 0.012, 0.006, M.plastic(0xd9534f), { seg: 16, z: 0.039, rx: PI / 2 }));
  g.userData.width = w;
  return g;
}

function wallArt(M, { w, h, wood, pal }) {
  const g = G();
  g.add(box(w, h, 0.03, M.wood(wood, 0), { r: 0.006, z: 0.015, uv: wuv('x') }));
  g.add(box(w - 0.07, h - 0.07, 0.004, M.paint(0xf6f2ea, { roughness: 0.9 }), { z: 0.031 }));
  const blocks = [
    [-0.22, 0.12, 0.34, 0.42, pal.primary],
    [0.16, -0.1, 0.4, 0.3, pal.accent],
    [0.2, 0.2, 0.22, 0.2, pal.dark],
    [-0.2, -0.24, 0.26, 0.16, pal.secondary],
  ];
  blocks.forEach(([fx, fy, fw, fh, color], i) => g.add(box((w - 0.1) * fw, (h - 0.1) * fh, 0.002, M.paint(color, { roughness: 0.85 }), { x: (w - 0.1) * fx, y: (h - 0.1) * fy, z: 0.034 + i * 0.0005 })));
  g.userData.width = w;
  return g;
}

function trashBin(M, { h }) {
  const g = G();
  g.add(cyl(0.15, 0.12, h, M.metal(0x8f949b, { roughness: 0.5 }), { seg: 28, y: h / 2, open: true }));
  g.add(disc(0.12, M.plastic(0x1e1f22), { y: 0.006 }));
  g.add(torus(0.15, 0.008, M.metal(0xc9cdd3, { roughness: 0.3 }), { y: h, rx: PI / 2, seg: 32 }));
  return g;
}

function ceilingFan(M, { w, dims, wood, night }) {
  const g = G();
  const drop = Number(dims.drop) || 0.35;
  const steel = M.metal(0x2b2d31, { roughness: 0.4 });
  g.add(cyl(0.05, 0.06, 0.04, steel, { seg: 20, y: drop - 0.02 }));
  g.add(bar(0.012, drop - 0.12, steel, { y: (drop - 0.12) / 2 + 0.1 }));
  g.add(cyl(0.1, 0.09, 0.1, steel, { seg: 28, y: 0.06 }));
  for (let i = 0; i < 4; i++) {
    const arm = G();
    const blade = box(w / 2 - 0.1, 0.012, 0.14, M.wood(wood, i % 3), { r: 0.004, x: w / 4 + 0.05, uv: wuv('x') });
    blade.rotation.x = 0.16;
    arm.add(blade);
    arm.rotation.y = (i / 4) * PI * 2 + 0.3;
    arm.position.y = 0.07;
    g.add(arm);
  }
  g.add(ball(0.075, M.glow(0xfff1d6, night ? 2.6 : 1.3), { y: 0.0, sy: 0.55 }));
  return g;
}

function pendantLamp(M, { dims, color, night }) {
  const g = G();
  const drop = Number(dims.drop) || 0.7;
  g.add(cyl(0.05, 0.05, 0.025, M.metal(0x2b2d31), { seg: 20, y: drop - 0.012 }));
  g.add(bar(0.004, drop - 0.2, M.plastic(0x17181b), { y: (drop - 0.2) / 2 + 0.2 }));
  g.add(lathe([[0.03, 0.2], [0.06, 0.17], [0.2, 0.02], [0.21, 0], [0.19, 0.0], [0.05, 0.16], [0.02, 0.19]], M.metal(color, { roughness: 0.45 })));
  g.add(ball(0.045, M.glow(0xffe2b0, night ? 3 : 1.6), { y: 0.07 }));
  return g;
}

/* ============================================================= HERRAMIENTAS */

function toolbox(M, { w, d, h, color }) {
  const g = G();
  const red = M.metal(color, { roughness: 0.45 });
  g.add(box(w, h * 0.62, d, red, { r: 0.01, y: h * 0.31 }));
  g.add(box(w + 0.01, h * 0.34, d + 0.01, M.metal(color, { roughness: 0.4 }), { r: 0.014, y: h * 0.79 }));
  for (const sx of [-1, 1]) g.add(box(0.03, 0.05, 0.012, M.metal(0xc9cdd3, { roughness: 0.3 }), { x: sx * w * 0.3, y: h * 0.62, z: d / 2 + 0.006 }));
  g.add(tube([[-w * 0.24, h * 0.96, 0], [-w * 0.24, h * 1.16, 0], [w * 0.24, h * 1.16, 0], [w * 0.24, h * 0.96, 0]], 0.011, M.plastic(0x1e1f22), { tension: 0.1 }));
  g.userData.width = w;
  return g;
}

function toolChest(M, { w, d, h, color }) {
  const g = G();
  const red = M.metal(color, { roughness: 0.45 });
  g.add(box(w, h - 0.12, d, red, { r: 0.01, y: (h - 0.12) / 2 + 0.12 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.045, 0.045, 0.035, M.plastic(0x17181b), { seg: 16, x: sx * (w / 2 - 0.08), y: 0.05, z: sz * (d / 2 - 0.08), rz: PI / 2 }));
  const n = 6;
  const dh = (h - 0.2) / n;
  for (let i = 0; i < n; i++) {
    const y = 0.16 + dh * (i + 0.5);
    g.add(box(w - 0.04, dh - 0.014, 0.012, M.metal(color, { roughness: 0.4 }), { r: 0.003, y, z: d / 2 + 0.002 }));
    g.add(box(w - 0.1, 0.016, 0.018, M.metal(0xc9cdd3, { roughness: 0.25 }), { y: y + dh * 0.28, z: d / 2 + 0.014 }));
  }
  g.add(box(w + 0.02, 0.02, d + 0.02, M.plastic(0x17181b, { roughness: 0.7 }), { y: h + 0.01 }));
  g.add(bar(0.012, d * 0.7, M.metal(0xc9cdd3, { roughness: 0.25 }), { x: w / 2 + 0.03, y: h - 0.1, rx: PI / 2 }));
  return g;
}

function pegboardTools(M, { w, h }) {
  const g = G();
  g.add(box(w, h, 0.02, M.paint(0xd8cdb8, { roughness: 0.8 }), { z: 0.01 }));
  const steel = M.metal(0xb9bdc4, { roughness: 0.35 });
  const grip = (color) => M.plastic(color, { roughness: 0.5 });
  const z = 0.035;
  // martillo
  g.add(box(0.03, 0.32, 0.025, M.wood('oak', 1), { x: -w * 0.38, y: 0.02, z }));
  g.add(box(0.13, 0.04, 0.035, steel, { x: -w * 0.38, y: 0.19, z }));
  // llaves
  for (let i = 0; i < 4; i++) {
    const len = 0.16 + i * 0.035;
    g.add(box(0.018, len, 0.008, steel, { x: -w * 0.24 + i * 0.05, y: h * 0.2 - len / 2, z }));
    g.add(torus(0.016, 0.006, steel, { x: -w * 0.24 + i * 0.05, y: h * 0.2 + 0.012, z, seg: 14 }));
  }
  // destornilladores
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.014, 0.012, 0.09, grip([0xd9534f, 0xe8c21c, 0x2f7de1, 0x3fa46a][i]), { seg: 12, x: w * 0.06 + i * 0.045, y: h * 0.22, z }));
    g.add(cyl(0.004, 0.004, 0.12, steel, { seg: 8, x: w * 0.06 + i * 0.045, y: h * 0.22 - 0.105, z }));
  }
  // serrucho
  g.add(extrude([[0, 0], [0.42, 0.03], [0.42, 0.06], [0, 0.13]], 0.004, steel, { x: -w * 0.1, y: -h * 0.36, z }));
  g.add(box(0.1, 0.13, 0.025, M.wood('walnut', 0), { r: 0.02, x: -w * 0.1 - 0.04, y: -h * 0.36 + 0.065, z }));
  // nivel y cinta
  g.add(box(0.5, 0.045, 0.02, grip(0xe8c21c), { x: w * 0.16, y: -h * 0.1, z }));
  g.add(cyl(0.035, 0.035, 0.03, grip(0xe8c21c), { seg: 20, x: w * 0.38, y: h * 0.26, z, rx: PI / 2 }));
  g.userData.width = w;
  return g;
}

function stepLadder(M, { h }) {
  const g = G();
  const alu = M.metal(0xc9cdd3, { roughness: 0.4 });
  const spread = h * 0.3;
  const rail = (sz, sx) => {
    const len = Math.hypot(h, spread);
    g.add(box(0.045, len, 0.022, alu, { x: sx * 0.23, y: h / 2, z: sz * spread * 0.5, rx: -sz * Math.atan2(spread, h) }));
  };
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) rail(sz, sx);
  const steps = Math.max(3, Math.round(h / 0.3));
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    g.add(box(0.46, 0.022, 0.085, alu, { y: h * t, z: spread * (1 - t) }));
  }
  g.add(box(0.5, 0.05, 0.16, M.plastic(0xe8731c, { roughness: 0.5 }), { r: 0.01, y: h + 0.02 }));
  g.add(box(0.4, 0.012, 0.02, alu, { y: h * 0.42, z: 0 }));
  return g;
}

function powerDrill(M, { color }) {
  const g = G();
  const body = M.plastic(color, { roughness: 0.45 });
  const dark = M.plastic(0x1e1f22, { roughness: 0.6 });
  g.add(cyl(0.032, 0.032, 0.16, body, { seg: 18, y: 0.2, rx: PI / 2 }));
  g.add(cyl(0.02, 0.026, 0.05, dark, { seg: 16, y: 0.2, z: 0.1, rx: PI / 2 }));
  g.add(cyl(0.004, 0.004, 0.07, M.metal(0xb9bdc4), { seg: 8, y: 0.2, z: 0.155, rx: PI / 2 }));
  g.add(box(0.045, 0.14, 0.05, dark, { r: 0.012, y: 0.115, z: -0.02, rx: 0.2 }));
  g.add(box(0.07, 0.05, 0.1, body, { r: 0.008, y: 0.025, z: -0.03 }));
  g.userData.width = 0.2;
  return g;
}

function airCompressor(M, { w, h, color }) {
  const g = G();
  const tank = M.metal(color, { roughness: 0.4 });
  const r = h * 0.22;
  g.add(cyl(r, r, w - r * 2, tank, { seg: 28, y: r + 0.1, rz: PI / 2 }));
  for (const sx of [-1, 1]) g.add(ball(r, tank, { x: sx * (w / 2 - r), y: r + 0.1, sx: 0.55 }));
  g.add(box(w * 0.42, h * 0.3, r * 1.3, M.plastic(0x1e1f22, { roughness: 0.6 }), { r: 0.02, x: -w * 0.08, y: r * 2 + 0.1 + h * 0.15 }));
  g.add(cyl(0.05, 0.05, 0.1, M.metal(0xb9bdc4, { roughness: 0.35 }), { seg: 16, x: w * 0.2, y: r * 2 + 0.15 }));
  for (const sz of [-1, 1]) g.add(cyl(0.1, 0.1, 0.04, M.plastic(0x17181b), { seg: 20, x: -w / 2 + r, y: 0.1, z: sz * (r + 0.02), rx: PI / 2 }));
  g.add(box(0.04, 0.1, 0.04, M.plastic(0x17181b), { x: w / 2 - r, y: 0.05 }));
  g.add(tube([[w / 2 - r, r * 2 + 0.1, 0], [w / 2 + 0.1, h * 0.86, 0], [w / 2 + 0.16, h * 0.86, 0]], 0.012, M.metal(0x2b2d31)));
  return g;
}

function sawhorseTable(M, { w, d, h }) {
  const g = G();
  const wd = M.wood('ash', 1);
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.3);
    g.add(box(0.07, 0.045, d, wd, { x, y: h - 0.07, uv: wuv('z') }));
    for (const sz of [-1, 1]) for (const k of [-1, 1]) g.add(box(0.04, h - 0.06, 0.04, wd, { x: x + k * 0.16, y: (h - 0.09) / 2, z: sz * (d / 2 - 0.05), rz: k * 0.2, uv: wuv('y') }));
  }
  g.add(box(w, 0.04, d, M.wood('birch', 0), { r: 0.004, y: h - 0.02, uv: wuv('x') }));
  g.add(place(powerDrill(M, { color: 0xe8c21c }), { x: -w * 0.25, y: h, ry: 0.6 }));
  g.add(box(0.5, 0.004, 0.02, M.plastic(0xe8c21c), { x: w * 0.15, y: h + 0.004, z: d * 0.2, ry: 0.2 }));
  return g;
}

function paintSet(M, { pal }) {
  const g = G();
  const bucket = (x, z, color) => {
    g.add(cyl(0.14, 0.12, 0.26, M.paint(0xf4f4f4, { roughness: 0.5 }), { seg: 24, x, y: 0.13, z }));
    g.add(disc(0.128, M.paint(color, { roughness: 0.3 }), { x, y: 0.255, z }));
    g.add(torus(0.14, 0.004, M.metal(0xb9bdc4), { x, y: 0.3, z, arc: PI, seg: 20 }));
  };
  bucket(-0.18, 0, pal.primary);
  bucket(0.16, 0.12, pal.accent);
  g.add(box(0.4, 0.04, 0.3, M.plastic(0x2b2d31, { roughness: 0.6 }), { r: 0.01, x: 0.1, y: 0.02, z: -0.28 }));
  g.add(cyl(0.045, 0.045, 0.22, M.fabric(pal.primary, { bump: 0.8 }), { seg: 16, x: 0.1, y: 0.075, z: -0.3, rz: PI / 2 }));
  g.add(bar(0.006, 0.34, M.metal(0xb9bdc4), { x: 0.24, y: 0.16, z: -0.2, rx: 1.0 }));
  g.userData.width = 0.7;
  return g;
}

/* ================================================================= REGISTRO */

const BUILDERS = {
  // hogar y cocina
  fridge,
  washing_machine: washingMachine,
  microwave,
  stove_oven: stoveOven,
  kitchen_counter: kitchenCounter,
  blender,
  kettle_toaster: kettleToaster,
  standing_fan: standingFan,
  water_dispenser: waterDispenser,
  robot_vacuum: robotVacuum,
  // cómputo
  pc_tower: pcTower,
  monitor_single: monitorSingle,
  monitor_dual: monitorDual,
  all_in_one: allInOne,
  keyboard_mouse: keyboardMouse,
  printer,
  router_wifi: routerWifi,
  server_rack: serverRack,
  game_console: gameConsole,
  // dormitorio
  bed_single: (M, c) => bed(M, c, 1),
  bed_double: (M, c) => bed(M, c, 2),
  bunk_bed: bunkBed,
  nightstand,
  wardrobe,
  dresser,
  clothes_rack: clothesRack,
  // sala, comedor y oficina
  dining_table: diningTable,
  dining_chair: diningChair,
  sectional_sofa: sectionalSofa,
  bean_bag: beanBag,
  tv_console: tvConsole,
  cube_shelf: cubeShelf,
  l_desk: lDesk,
  standing_desk: standingDesk,
  filing_cabinet: filingCabinet,
  reception_counter: receptionCounter,
  bench,
  coat_rack: coatRack,
  folding_screen: foldingScreen,
  standing_mirror: standingMirror,
  // decoración
  wall_shelf: wallShelf,
  wall_clock: wallClock,
  wall_art: wallArt,
  trash_bin: trashBin,
  plant_small: (M, c) => K.plant(M, { h: c.h }),
  ceiling_fan: ceilingFan,
  pendant_lamp: pendantLamp,
  // herramientas
  toolbox,
  tool_chest: toolChest,
  pegboard_tools: pegboardTools,
  step_ladder: stepLadder,
  power_drill: powerDrill,
  air_compressor: airCompressor,
  sawhorse_table: sawhorseTable,
  paint_set: paintSet,
  ...AUDIO_BUILDERS,
  ...BUILDING_BUILDERS,
};

export const EXTRA_TYPE_IDS = Object.keys(BUILDERS);

/** Luces que aportan las lámparas de esta parte del catálogo (ver ITEM_LIGHTS en scenes.js). */
export const EXTRA_ITEM_LIGHTS = {
  pendant_lamp: (item, h, H) => ({ y: H - (Number(item.dims?.drop) || 0.7) + 0.05, color: 0xffe2b0, day: 0.7, night: 2.2, distance: 4.5 }),
  ceiling_fan: (item, h, H) => ({ y: H - (Number(item.dims?.drop) || 0.35) - 0.1, color: 0xfff1d6, day: 0.6, night: 2.0, distance: 5 }),
};

/** Construye un objeto de esta parte del catálogo, o null si el tipo pertenece al kit base. */
export function buildExtraObject(M, typeId, ctx) {
  const make = BUILDERS[typeId];
  return make ? make(M, ctx) : null;
}

export { add, lit };
