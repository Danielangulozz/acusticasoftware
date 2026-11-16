import * as THREE from 'three';
import * as K from './kit.js';
import { bar, cone, disc, extrudeShape, FAB, lathe, torus, tube, wuv } from './kitParts.js';

/**
 * Equipos de sonido e instrumentos del catálogo.
 *
 * Los equipos vienen en cuatro «series» de acabado inventadas para la empresa (no imitan ninguna
 * marca real): cambian materiales, colores del frente y de los medidores, como pasa entre
 * fabricantes. Se eligen con `dims.finish`.
 */

const { box, cyl, ball, place } = K;
const G = () => new THREE.Group();
const PI = Math.PI;

export const AUDIO_FINISHES = {
  negro: { label: 'Serie Obsidiana', hint: 'Negro mate, estilo estudio' },
  nogal: { label: 'Serie Nogal', hint: 'Madera y frente plateado, hi-fi clásico' },
  plata: { label: 'Serie Plata', hint: 'Aluminio cepillado, aire vintage' },
  blanco: { label: 'Serie Nieve', hint: 'Blanco minimalista' },
};

function finishMats(M, finish = 'negro') {
  switch (finish) {
    case 'nogal':
      return { body: M.wood('walnut', 0, { roughness: 0.45 }), face: M.metal(0xc9ccd2, { roughness: 0.32 }), trim: M.metal(0x2a2b30, { roughness: 0.4 }), knob: M.metal(0xd3d6db, { roughness: 0.25 }), glow: 0xffb347, grille: 0x4c4038 };
    case 'plata':
      return { body: M.metal(0xb4b8bf, { roughness: 0.35 }), face: M.metal(0xd5d8dd, { roughness: 0.28 }), trim: M.metal(0x2a2b30, { roughness: 0.4 }), knob: M.metal(0x9ca1a8, { roughness: 0.25 }), glow: 0xffc46b, grille: 0x5f6166 };
    case 'blanco':
      return { body: M.plastic(0xeeeeec, { roughness: 0.4 }), face: M.plastic(0xf7f7f5, { roughness: 0.35 }), trim: M.metal(0x9aa0a8, { roughness: 0.3 }), knob: M.plastic(0xdcdcd8, { roughness: 0.35 }), glow: 0xbfe3ff, grille: 0xd2d2ce };
    default:
      return { body: M.plastic(0x1b1c1f, { roughness: 0.5 }), face: M.metal(0x2a2b30, { roughness: 0.45 }), trim: M.metal(0x5a5d63, { roughness: 0.35 }), knob: M.metal(0x3a3c41, { roughness: 0.35 }), glow: 0x6fd3ff, grille: 0x2a2b2f };
  }
}

/** Parlante de cono (mira hacia +Z). */
function woofer(M, r) {
  const g = G();
  const rubber = M.plastic(0x141416, { roughness: 0.85 });
  g.add(torus(r * 0.9, r * 0.1, rubber, { seg: 32 }));
  g.add(lathe([[r * 0.84, 0], [r * 0.3, -r * 0.34], [r * 0.24, -r * 0.36]], M.plastic(0x232428, { roughness: 0.7 }), { seg: 32, rx: PI / 2 }));
  g.add(ball(r * 0.22, M.plastic(0x1a1b1e, { roughness: 0.5 }), { z: -r * 0.3, sz: 0.5 }));
  return g;
}

function tweeter(M, r) {
  const g = G();
  g.add(torus(r * 1.15, r * 0.18, M.plastic(0x141416, { roughness: 0.6 }), { seg: 24 }));
  g.add(ball(r * 0.75, M.metal(0xc9ccd2, { roughness: 0.3 }), { sz: 0.45 }));
  return g;
}

/** Caja acústica con sus parlantes al frente. */
function speakerBox(M, { w, h, d, mats, drivers }) {
  const g = G();
  g.add(box(w, h, d, mats.body, { r: 0.012, seg: 3, y: h / 2, uv: wuv('y') }));
  g.add(box(w - 0.012, h - 0.012, 0.006, mats.face === mats.body ? M.plastic(0x1e1f22) : mats.trim, { r: 0.006, y: h / 2, z: d / 2 }));
  drivers.forEach(([kind, r, y]) => g.add(place(kind === 'w' ? woofer(M, r) : tweeter(M, r), { y, z: d / 2 + 0.004 })));
  return g;
}

/* ============================================================ EQUIPOS HI-FI */

function bookshelfSpeakers(M, { w, dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  const stands = dims.stands !== false;
  const lift = stands ? 0.62 : 0;
  const metal = M.metal(0x222226, { roughness: 0.4 });
  for (const sx of [-1, 1]) {
    const s = G();
    if (stands) {
      s.add(box(0.26, 0.02, 0.26, metal, { r: 0.004, y: 0.01 }));
      s.add(box(0.05, lift - 0.04, 0.05, metal, { y: lift / 2 }));
      s.add(box(0.2, 0.014, 0.22, metal, { y: lift - 0.007 }));
    }
    s.add(place(speakerBox(M, { w: 0.2, h: 0.32, d: 0.26, mats, drivers: [['w', 0.072, 0.11], ['t', 0.016, 0.255]] }), { y: lift }));
    g.add(place(s, { x: sx * (w / 2 - 0.13), ry: -sx * 0.32 }));
  }
  g.userData.width = w;
  return g;
}

function hifiStack(M, { w, d, dims, night }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  const glow = M.glow(mats.glow, night ? 2.4 : 1.6);
  const dark = M.plastic(0x101113, { roughness: 0.3 });
  // amplificador
  const ah = 0.13;
  g.add(box(w, ah, d, mats.body, { r: 0.006, y: ah / 2 + 0.012, uv: wuv('x') }));
  g.add(box(w - 0.01, ah - 0.012, 0.012, mats.face, { r: 0.004, y: ah / 2 + 0.012, z: d / 2 }));
  for (const sx of [-1, 1]) {
    g.add(box(0.1, 0.05, 0.004, glow, { x: sx * w * 0.2, y: ah * 0.62 + 0.012, z: d / 2 + 0.007 }));
    g.add(box(0.002, 0.04, 0.003, dark, { x: sx * w * 0.2 + 0.015, y: ah * 0.62 + 0.012, z: d / 2 + 0.01, rz: 0.5 }));
  }
  g.add(cyl(0.032, 0.034, 0.03, mats.knob, { seg: 32, x: 0, y: ah * 0.55 + 0.012, z: d / 2 + 0.02, rx: PI / 2 }));
  for (let i = 0; i < 4; i++) g.add(cyl(0.012, 0.012, 0.018, mats.knob, { seg: 16, x: -w * 0.36 + i * w * 0.24, y: ah * 0.2 + 0.012, z: d / 2 + 0.014, rx: PI / 2 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.018, 0.018, 0.012, dark, { seg: 12, x: sx * (w / 2 - 0.05), y: 0.006, z: sz * (d / 2 - 0.05) }));
  // fuente / reproductor encima
  const ph = 0.075;
  const y0 = ah + 0.024;
  g.add(box(w, ph, d * 0.92, mats.body, { r: 0.006, y: y0 + ph / 2, uv: wuv('x') }));
  g.add(box(w - 0.01, ph - 0.01, 0.01, mats.face, { r: 0.003, y: y0 + ph / 2, z: d * 0.46 }));
  g.add(box(w * 0.32, 0.024, 0.003, M.glow(mats.glow, night ? 2 : 1.3), { x: w * 0.14, y: y0 + ph * 0.55, z: d * 0.46 + 0.006 }));
  g.add(box(w * 0.36, 0.006, 0.004, dark, { x: -w * 0.2, y: y0 + ph * 0.6, z: d * 0.46 + 0.006 }));
  return g;
}

function turntable(M, { w, d, dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish === 'negro' ? 'nogal' : dims.finish);
  const h = 0.09;
  g.add(box(w, h, d, mats.body, { r: 0.01, y: h / 2 + 0.02, uv: wuv('x') }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.025, 0.03, 0.02, M.plastic(0x141416), { seg: 16, x: sx * (w / 2 - 0.05), y: 0.01, z: sz * (d / 2 - 0.05) }));
  const px = -w * 0.08;
  g.add(cyl(0.15, 0.15, 0.022, M.metal(0xb9bdc4, { roughness: 0.3 }), { seg: 48, x: px, y: h + 0.031 }));
  g.add(cyl(0.148, 0.148, 0.004, M.plastic(0x0d0d0f, { roughness: 0.25 }), { seg: 48, x: px, y: h + 0.044 }));
  g.add(cyl(0.045, 0.045, 0.002, M.paint(0xd9a441, { roughness: 0.6 }), { seg: 32, x: px, y: h + 0.047 }));
  g.add(cyl(0.004, 0.004, 0.02, M.metal(0xd3d6db), { seg: 8, x: px, y: h + 0.052 }));
  const ax = w / 2 - 0.07;
  const az = -d / 2 + 0.08;
  g.add(cyl(0.02, 0.022, 0.04, mats.trim, { seg: 16, x: ax, y: h + 0.04, z: az }));
  g.add(tube([[ax, h + 0.06, az], [ax - 0.02, h + 0.062, az + 0.12], [px + 0.1, h + 0.06, 0.06]], 0.004, M.metal(0xd3d6db, { roughness: 0.2 })));
  g.add(box(0.018, 0.012, 0.03, M.plastic(0x141416), { x: px + 0.1, y: h + 0.052, z: 0.07 }));
  return g;
}

function soundbar(M, { w, dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  g.add(box(w, 0.07, 0.1, mats.body, { r: 0.03, seg: 4, y: 0.035 }));
  g.add(box(w - 0.04, 0.05, 0.004, M.fabric(mats.grille, { bump: 0.6 }), { r: 0.01, y: 0.036, z: 0.05 }));
  g.add(box(0.04, 0.004, 0.002, M.glow(mats.glow, 1.6), { x: w * 0.4, y: 0.012, z: 0.052 }));
  g.userData.width = w;
  return g;
}

function paSpeaker(M, { h, dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  const metal = M.metal(0x1e1f22, { roughness: 0.4 });
  const cabH = 0.62;
  const pole = h - cabH;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    g.add(bar(0.012, 0.75, metal, { x: Math.cos(a) * 0.24, y: 0.32, z: Math.sin(a) * 0.24, rz: Math.cos(a) * 0.8, rx: -Math.sin(a) * 0.8 }));
  }
  g.add(bar(0.02, pole, metal, { y: pole / 2 }));
  const cab = G();
  cab.add(box(0.38, cabH, 0.34, mats.body, { r: 0.02, seg: 3, y: cabH / 2 }));
  cab.add(box(0.36, cabH - 0.02, 0.008, M.metal(0x2a2b2f, { roughness: 0.6 }), { y: cabH / 2, z: 0.171 }));
  cab.add(place(woofer(M, 0.15), { y: 0.2, z: 0.176 }));
  cab.add(cone(0.12, 0.1, M.plastic(0x141416, { roughness: 0.7 }), { seg: 4, y: 0.48, z: 0.16, rx: -PI / 2, ry: PI / 4 }));
  cab.add(box(0.04, 0.02, 0.004, M.glow(mats.glow, 1.6), { x: 0.13, y: 0.04, z: 0.172 }));
  g.add(place(cab, { y: pole }));
  return g;
}

function paSubwoofer(M, { w, h, d, dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  g.add(box(w, h, d, mats.body, { r: 0.02, seg: 3, y: h / 2 }));
  g.add(box(w - 0.02, h - 0.02, 0.008, M.metal(0x2a2b2f, { roughness: 0.6 }), { y: h / 2, z: d / 2 }));
  g.add(place(woofer(M, Math.min(w, h) * 0.38), { y: h / 2, z: d / 2 + 0.006 }));
  return g;
}

/* ===================================================== ESTUDIO Y PRODUCCIÓN */

function mixingConsole(M, { w, d, h, dims, night }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  const dark = M.plastic(0x121315, { roughness: 0.4 });
  // mueble
  for (const sx of [-1, 1]) g.add(box(0.06, h - 0.05, d, mats.body, { r: 0.01, x: sx * (w / 2 - 0.03), y: (h - 0.05) / 2, uv: wuv('y') }));
  g.add(box(w - 0.12, 0.5, 0.04, mats.body, { y: 0.3, z: -d / 2 + 0.06, uv: wuv('x') }));
  // superficie inclinada con los canales
  const top = G();
  const depth = d - 0.1;
  top.add(box(w, 0.06, depth, mats.face, { r: 0.008 }));
  const channels = Math.max(8, Math.round((w - 0.5) / 0.07));
  const pitch = (w - 0.5) / channels;
  const knob = mats.knob;
  const capColors = [0xe9e9e9, 0xd9534f, 0x2f7de1, 0xe8c21c];
  for (let i = 0; i < channels; i++) {
    const x = -w / 2 + 0.06 + pitch * (i + 0.5);
    top.add(box(0.008, 0.002, depth * 0.3, dark, { x, y: 0.031, z: depth * 0.28 }));
    top.add(box(0.03, 0.022, 0.018, M.plastic(capColors[i % 4 === 3 ? 1 : 0], { roughness: 0.4 }), { x, y: 0.042, z: depth * (0.2 + ((i * 7) % 5) * 0.03) }));
    for (let k = 0; k < 6; k++) top.add(cyl(0.011, 0.012, 0.018, knob, { seg: 8, x, y: 0.04, z: -depth * 0.42 + k * depth * 0.085 }));
  }
  // sección master
  const mx = w / 2 - 0.22;
  top.add(box(0.34, 0.004, depth * 0.9, dark, { x: mx, y: 0.031 }));
  for (const fx of [-0.05, 0.05]) top.add(box(0.035, 0.024, 0.02, M.plastic(0xd9534f), { x: mx + fx, y: 0.042, z: depth * 0.25 }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) top.add(box(0.03, 0.012, 0.03, M.glow([0x7dffb0, 0xffb347, 0x6fd3ff][r], night ? 1.8 : 1.1), { x: mx - 0.09 + c * 0.06, y: 0.036, z: -depth * 0.3 + r * 0.06 }));
  top.rotation.x = 0.16;
  g.add(place(top, { y: h - 0.02, z: 0.03 }));
  // puente de medidores
  const bridgeY = h + 0.12;
  g.add(box(w - 0.1, 0.12, 0.08, mats.body, { r: 0.008, y: bridgeY, z: -d / 2 + 0.08, rx: -0.2, uv: wuv('x') }));
  for (let i = 0; i < channels; i++) {
    const x = -w / 2 + 0.06 + pitch * (i + 0.5);
    const lvl = 0.04 + ((i * 13) % 7) * 0.008;
    g.add(box(0.012, lvl, 0.004, M.glow(mats.glow, night ? 2.4 : 1.6), { x, y: bridgeY - 0.03 + lvl / 2, z: -d / 2 + 0.125, rx: -0.2 }));
  }
  return g;
}

function audioInterface(M, { dims, night }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  g.add(box(0.3, 0.055, 0.2, mats.body, { r: 0.01, y: 0.03 }));
  g.add(box(0.29, 0.05, 0.004, mats.face, { y: 0.03, z: 0.1 }));
  g.add(cyl(0.032, 0.032, 0.018, mats.knob, { seg: 32, x: 0.07, y: 0.065 }));
  for (const x of [-0.11, -0.05]) g.add(cyl(0.012, 0.012, 0.012, mats.knob, { seg: 16, x, y: 0.062, z: 0.03 }));
  for (let i = 0; i < 8; i++) g.add(box(0.008, 0.002, 0.006, M.glow(i < 6 ? 0x7dffb0 : 0xffb347, night ? 2.4 : 1.6), { x: -0.08 + i * 0.012, y: 0.059, z: -0.04 }));
  for (const x of [-0.1, -0.04]) g.add(torus(0.012, 0.004, M.metal(0x8f949b), { x, y: 0.03, z: 0.103, seg: 16 }));
  g.userData.width = 0.3;
  return g;
}

function midiController(M, { pal, night, dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  g.add(box(0.5, 0.045, 0.26, mats.body, { r: 0.01, y: 0.024 }));
  const colors = [pal.primary, pal.accent, pal.secondary, 0x7dffb0];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.add(box(0.045, 0.012, 0.045, M.glow(colors[(r + c) % 4], night ? 1.8 : 1.1), { r: 0.006, x: -0.18 + c * 0.055, y: 0.05, z: -0.085 + r * 0.055 }));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) g.add(cyl(0.012, 0.012, 0.016, mats.knob, { seg: 12, x: 0.07 + c * 0.05, y: 0.054, z: -0.08 + r * 0.06 }));
  for (let c = 0; c < 4; c++) g.add(box(0.012, 0.016, 0.02, M.plastic(0xe9e9e9), { x: 0.07 + c * 0.05, y: 0.052, z: 0.07 }));
  g.userData.width = 0.5;
  return g;
}

function headphonesStand(M, { dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  g.add(cyl(0.08, 0.09, 0.02, mats.body, { seg: 28, y: 0.01 }));
  g.add(bar(0.01, 0.28, mats.trim, { y: 0.15 }));
  g.add(box(0.05, 0.018, 0.12, mats.body, { r: 0.008, y: 0.29 }));
  g.add(torus(0.1, 0.014, M.plastic(0x1b1c1f, { roughness: 0.6 }), { y: 0.205, arc: PI, seg: 24 }));
  for (const sx of [-1, 1]) g.add(cyl(0.05, 0.05, 0.04, M.fabric(0x26272b, { bump: 0.6 }), { seg: 24, x: sx * 0.1, y: 0.19, rz: PI / 2 }));
  return g;
}

function djBooth(M, { w, d, h, dims, night, pal }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  g.add(box(w, h - 0.03, d - 0.04, mats.body, { r: 0.012, y: (h - 0.03) / 2, z: -0.02 }));
  g.add(box(w - 0.1, 0.012, 0.004, M.glow(pal.primary, night ? 2.6 : 1.6), { y: h * 0.35, z: d / 2 - 0.018 }));
  g.add(box(w + 0.02, 0.03, d, M.plastic(0x141416, { roughness: 0.5 }), { y: h - 0.015 }));
  const top = h;
  g.add(box(0.72, 0.05, 0.38, M.plastic(0x1b1c1f, { roughness: 0.4 }), { r: 0.01, y: top + 0.025 }));
  for (const sx of [-1, 1]) {
    g.add(cyl(0.1, 0.1, 0.02, M.metal(0x9ca1a8, { roughness: 0.25 }), { seg: 40, x: sx * 0.22, y: top + 0.06 }));
    g.add(torus(0.1, 0.004, M.glow(mats.glow, night ? 2.4 : 1.4), { x: sx * 0.22, y: top + 0.07, rx: PI / 2, seg: 40 }));
  }
  for (let i = 0; i < 4; i++) g.add(box(0.012, 0.014, 0.05, M.plastic(0xe9e9e9), { x: -0.045 + i * 0.03, y: top + 0.057, z: 0.08 }));
  g.add(place(K.laptopProp(M, { w: 0.34, d: 0.24, glow: night ? 2 : 1.3 }), { x: w / 2 - 0.28, y: top, z: -0.06, ry: -0.3 }));
  return g;
}

/* ============================================================== INSTRUMENTOS */

function pianoFinish(M, finish) {
  if (finish === 'nogal') return M.wood('walnut', 0, { roughness: 0.32 });
  if (finish === 'blanco') return M.plastic(0xf4f4f2, { roughness: 0.16 });
  return M.plastic(0x0b0b0d, { roughness: 0.12 });
}

/** Teclado de piano de ancho dado; las teclas blancas apuntan hacia +Z. */
function keyboard(M, width, depth = 0.15) {
  const g = G();
  const white = M.plastic(0xf7f6f2, { roughness: 0.3 });
  const black = M.plastic(0x101012, { roughness: 0.25 });
  const kw = 0.0235;
  const n = Math.max(14, Math.floor(width / kw));
  const x0 = -(n * kw) / 2;
  g.add(box(n * kw, 0.022, depth, white, { y: 0.011 }));
  for (let i = 1; i < n; i++) g.add(box(0.0012, 0.0015, depth, M.plastic(0x9a9a96), { x: x0 + i * kw, y: 0.0225 }));
  for (let i = 0; i < n - 1; i++) {
    if ([0, 1, 3, 4, 5].includes(i % 7)) g.add(box(0.013, 0.012, depth * 0.62, black, { x: x0 + (i + 1) * kw, y: 0.028, z: -depth * 0.19 }));
  }
  return g;
}

function bench(M, mat, w = 0.62) {
  const g = G();
  g.add(box(w, 0.06, 0.34, mat, { r: 0.01, y: 0.47 }));
  g.add(box(w - 0.04, 0.04, 0.3, M.fabric(0x1b1c1f, { bump: 0.6 }), { r: 0.015, y: 0.515, uv: FAB }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.04, 0.44, 0.04, mat, { x: sx * (w / 2 - 0.04), y: 0.22, z: sz * 0.13 }));
  return g;
}

function uprightPiano(M, { w, d, h, dims }) {
  const g = G();
  const body = pianoFinish(M, dims.finish);
  const gold = M.metal(0xd4af37, { roughness: 0.3 });
  const back = 0.34;
  g.add(box(w, h, back, body, { r: 0.01, y: h / 2, z: -d / 2 + back / 2 }));
  g.add(box(w, 0.1, d - back + 0.02, body, { r: 0.008, y: 0.67, z: -d / 2 + back + (d - back) / 2 - 0.01 }));
  g.add(place(keyboard(M, w - 0.14, d - back - 0.04), { y: 0.72, z: -d / 2 + back + (d - back - 0.04) / 2 }));
  for (const sx of [-1, 1]) {
    g.add(box(0.05, 0.16, d - back + 0.02, body, { r: 0.008, x: sx * (w / 2 - 0.025), y: 0.78, z: -d / 2 + back + (d - back) / 2 - 0.01 }));
    g.add(box(0.06, 0.62, 0.06, body, { r: 0.01, x: sx * (w / 2 - 0.06), y: 0.31, z: d / 2 - 0.08 }));
  }
  g.add(box(w - 0.1, 0.2, 0.02, body, { r: 0.006, y: 0.95, z: -d / 2 + back + 0.012, rx: -0.12 }));
  for (const x of [-0.06, 0, 0.06]) g.add(box(0.025, 0.012, 0.07, gold, { r: 0.004, x, y: 0.06, z: -d / 2 + back + 0.04 }));
  g.add(place(bench(M, body), { z: d / 2 + 0.36 }));
  return g;
}

function grandPiano(M, { w, d, h, dims }) {
  const g = G();
  const body = pianoFinish(M, dims.finish);
  const L = d;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, 0.3 * L);
  shape.bezierCurveTo(w, 0.55 * L, 0.55 * w, 0.55 * L, 0.5 * w, 0.8 * L);
  shape.bezierCurveTo(0.45 * w, L, 0.1 * w, L * 1.02, 0, L * 0.98);
  shape.closePath();
  const thick = 0.3;
  const caseMesh = extrudeShape(shape, thick, body, { curveSegments: 16 });
  caseMesh.geometry.rotateX(-PI / 2);
  caseMesh.geometry.translate(-w / 2, h - thick, L * 0.42);
  g.add(caseMesh);
  // tapa abierta sobre la bisagra izquierda
  const lid = extrudeShape(shape, 0.02, body, { curveSegments: 16 });
  lid.geometry.rotateX(-PI / 2);
  lid.geometry.translate(0, 0, L * 0.42);
  const hinge = G();
  hinge.add(lid);
  hinge.position.set(-w / 2, h, 0);
  hinge.rotation.z = 0.5;
  g.add(hinge);
  g.add(bar(0.008, 0.62, M.plastic(0x101012), { x: w * 0.15, y: h + 0.27, z: -L * 0.15, rz: 0.55 }));
  // patas y teclado
  const legAt = (x, z) => g.add(cyl(0.05, 0.035, h - thick, body, { seg: 16, x, y: (h - thick) / 2, z }));
  legAt(-w / 2 + 0.1, L * 0.42 - 0.12);
  legAt(w / 2 - 0.1, L * 0.42 - 0.12);
  legAt(-w * 0.1, -L * 0.45);
  g.add(box(w, 0.1, 0.3, body, { r: 0.008, y: h - 0.24, z: L * 0.42 + 0.14 }));
  g.add(place(keyboard(M, w - 0.12, 0.16), { y: h - 0.19, z: L * 0.42 + 0.14 }));
  g.add(box(0.12, 0.5, 0.06, body, { y: 0.25, z: L * 0.42 - 0.02 }));
  for (const x of [-0.04, 0, 0.04]) g.add(box(0.022, 0.012, 0.06, M.metal(0xd4af37, { roughness: 0.3 }), { x, y: 0.03, z: L * 0.42 + 0.04 }));
  g.add(place(bench(M, body, 0.7), { z: L * 0.42 + 0.62 }));
  return g;
}

function digitalPiano(M, { w, dims, night }) {
  const g = G();
  const body = dims.finish === 'blanco' ? M.plastic(0xf2f2f0, { roughness: 0.35 }) : dims.finish === 'nogal' ? M.wood('walnut', 1) : M.plastic(0x1b1c1f, { roughness: 0.4 });
  g.add(box(w, 0.08, 0.34, body, { r: 0.01, y: 0.78 }));
  g.add(place(keyboard(M, w - 0.12, 0.14), { y: 0.81, z: 0.08 }));
  g.add(box(w, 0.06, 0.06, body, { r: 0.01, y: 0.85, z: -0.14 }));
  g.add(box(0.08, 0.02, 0.003, M.glow(0x6fd3ff, night ? 2 : 1.3), { y: 0.86, z: -0.109 }));
  for (const sx of [-1, 1]) g.add(box(0.04, 0.74, 0.32, body, { x: sx * (w / 2 - 0.04), y: 0.37, z: -0.01 }));
  g.add(box(w - 0.1, 0.36, 0.02, body, { y: 0.48, z: -0.14 }));
  return g;
}

/** Contorno de caja de guitarra o violín (ancho máximo 1, alto 1, cintura natural). */
function bodyShape(width, height, { upper = 0.78 } = {}) {
  const hw = (t) => {
    const a = (t - 0.3) / 0.3;
    const b = (t - 0.76) / 0.24;
    const lw = a * a < 1 ? Math.sqrt(1 - a * a) : 0;
    const uw = b * b < 1 ? upper * Math.sqrt(1 - b * b) : 0;
    return Math.max(lw, uw);
  };
  const N = 30;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    shape.lineTo((hw(t) * width) / 2, t * height);
  }
  for (let i = N - 1; i >= 1; i--) {
    const t = i / N;
    shape.lineTo((-hw(t) * width) / 2, t * height);
  }
  shape.closePath();
  return shape;
}

function stringed(M, { bw, bh, thick, neck, top, sideMat, hole = true, pickups = false }) {
  const g = G();
  g.add(extrudeShape(bodyShape(bw, bh), thick, sideMat, { center: true }));
  g.add(extrudeShape(bodyShape(bw - 0.012, bh - 0.012), 0.004, top, { z: thick / 2, x: 0, y: 0.006 }));
  if (hole) g.add(disc(bw * 0.12, M.plastic(0x0d0b09, { roughness: 0.9 }), { y: bh * 0.66, z: thick / 2 + 0.005, rx: PI / 2 }));
  if (pickups) for (const y of [0.42, 0.6]) g.add(box(0.075, 0.02, 0.008, M.plastic(0x141416), { y: bh * y, z: thick / 2 + 0.006 }));
  g.add(box(0.07, 0.014, 0.008, M.wood('walnut', 2), { y: bh * 0.3, z: thick / 2 + 0.008 }));
  g.add(box(0.05, neck, 0.024, M.wood('walnut', 1), { y: bh + neck / 2 - 0.02, z: thick / 2 - 0.008 }));
  g.add(box(0.085, 0.17, 0.018, M.wood('walnut', 0), { r: 0.01, y: bh + neck + 0.06, z: thick / 2 - 0.016, rx: -0.2 }));
  for (let i = 0; i < 6; i++) g.add(box(0.0012, bh * 0.68 + neck, 0.0012, M.metal(0xd3d6db, { roughness: 0.2 }), { x: -0.018 + i * 0.0072, y: bh * 0.3 + (bh * 0.68 + neck) / 2, z: thick / 2 + 0.012 }));
  return g;
}

/** Soporte en A con el instrumento recostado. */
function onStand(M, instrument, lean = 0.22) {
  const g = G();
  const metal = M.metal(0x1e1f22, { roughness: 0.4 });
  for (const sx of [-1, 1]) g.add(bar(0.009, 0.42, metal, { x: sx * 0.13, y: 0.2, z: 0.06, rz: sx * 0.25 }));
  g.add(bar(0.009, 0.62, metal, { y: 0.3, z: -0.12, rx: 0.32 }));
  g.add(box(0.3, 0.02, 0.05, M.fabric(0x141416), { y: 0.08, z: 0.08 }));
  instrument.rotation.x = -lean;
  g.add(place(instrument, { y: 0.07, z: 0.08 }));
  return g;
}

function acousticGuitar(M, { color }) {
  const inst = stringed(M, { bw: 0.39, bh: 0.5, thick: 0.1, neck: 0.46, top: M.wood('birch', 2, { roughness: 0.4 }), sideMat: M.wood('walnut', 0, { roughness: 0.4 }) });
  return onStand(M, inst);
}

function electricGuitar(M, { color }) {
  const inst = stringed(M, { bw: 0.33, bh: 0.44, thick: 0.045, neck: 0.48, top: M.plastic(color, { roughness: 0.18 }), sideMat: M.plastic(color, { roughness: 0.2 }), hole: false, pickups: true });
  return onStand(M, inst, 0.18);
}

function electricBass(M, { color }) {
  const inst = stringed(M, { bw: 0.34, bh: 0.46, thick: 0.045, neck: 0.66, top: M.plastic(color, { roughness: 0.18 }), sideMat: M.plastic(color, { roughness: 0.2 }), hole: false, pickups: true });
  return onStand(M, inst, 0.16);
}

function cello(M) {
  const g = G();
  const wood = M.wood('walnut', 0, { roughness: 0.35, tint: 0xd08a5a });
  const inst = G();
  inst.add(extrudeShape(bodyShape(0.44, 0.76, { upper: 0.82 }), 0.13, wood, { center: true }));
  for (const sx of [-1, 1]) inst.add(box(0.012, 0.11, 0.004, M.plastic(0x0d0b09), { x: sx * 0.07, y: 0.4, z: 0.067, rz: sx * 0.12 }));
  inst.add(box(0.05, 0.08, 0.02, M.wood('ash', 0), { y: 0.28, z: 0.07 }));
  inst.add(box(0.045, 0.5, 0.03, M.plastic(0x101012, { roughness: 0.3 }), { y: 0.95, z: 0.05 }));
  inst.add(ball(0.04, wood, { y: 1.28, z: 0.02, sx: 0.7 }));
  inst.add(bar(0.006, 0.2, M.metal(0xc9ccd2), { y: -0.08 }));
  for (let i = 0; i < 4; i++) inst.add(box(0.0014, 0.95, 0.0014, M.metal(0xd3d6db, { roughness: 0.2 }), { x: -0.012 + i * 0.008, y: 0.75, z: 0.075 }));
  inst.rotation.x = -0.18;
  g.add(place(inst, { y: 0.18 }));
  g.add(cyl(0.12, 0.14, 0.03, M.wood('walnut', 1), { seg: 20, y: 0.015, z: 0.02 }));
  return g;
}

function cajon(M, { wood }) {
  const g = G();
  g.add(box(0.3, 0.48, 0.3, M.wood(wood, 1), { r: 0.008, y: 0.24, uv: wuv('y') }));
  g.add(box(0.29, 0.47, 0.006, M.wood('walnut', 0), { y: 0.24, z: 0.151, uv: wuv('y') }));
  g.add(disc(0.055, M.plastic(0x0d0b09, { roughness: 0.9 }), { y: 0.26, z: -0.152, rx: -PI / 2 }));
  return g;
}

function electronicDrums(M, { color }) {
  const g = G();
  const metal = M.metal(0x2b2d31, { roughness: 0.4 });
  const pad = M.plastic(0x141416, { roughness: 0.7 });
  const rim = M.plastic(color, { roughness: 0.4 });
  for (const sx of [-1, 1]) g.add(bar(0.02, 0.9, metal, { x: sx * 0.45, y: 0.45, z: -0.1 }));
  g.add(bar(0.02, 0.9, metal, { y: 0.88, z: -0.1, rz: PI / 2 }));
  const padAt = (x, y, z, r) => {
    g.add(cyl(r, r, 0.04, rim, { seg: 24, x, y, z, rx: 0.25 }));
    g.add(cyl(r - 0.012, r - 0.012, 0.042, pad, { seg: 24, x, y, z, rx: 0.25 }));
  };
  padAt(-0.2, 0.62, 0.15, 0.14);
  padAt(-0.12, 0.84, -0.02, 0.11);
  padAt(0.12, 0.84, -0.02, 0.11);
  padAt(0.34, 0.58, 0.12, 0.13);
  for (const [x, y] of [[-0.45, 1.05], [0.45, 1.1], [-0.42, 0.85]]) g.add(cyl(0.17, 0.17, 0.01, pad, { seg: 24, x, y, z: -0.02, rx: 0.15 }));
  g.add(box(0.2, 0.32, 0.2, metal, { y: 0.16, z: 0.1 }));
  g.add(box(0.16, 0.2, 0.012, pad, { y: 0.2, z: 0.2 }));
  g.add(box(0.24, 0.14, 0.04, M.plastic(0x1b1c1f), { r: 0.008, x: 0.36, y: 0.98, z: -0.08 }));
  g.add(box(0.06, 0.03, 0.004, M.glow(0x6fd3ff, 1.6), { x: 0.36, y: 1.0, z: -0.058 }));
  g.add(cyl(0.16, 0.16, 0.06, M.fabric(0x1e293b), { seg: 18, y: 0.5, z: 0.58 }));
  g.add(bar(0.018, 0.47, M.metal(0xd4d4dc), { y: 0.235, z: 0.58 }));
  return g;
}

function bassAmp(M, { w, h, d, dims }) {
  const g = G();
  const mats = finishMats(M, dims.finish);
  const tolex = M.plastic(0x18181b, { roughness: 0.65 });
  const cabH = h - 0.26;
  g.add(box(w, cabH, d, tolex, { r: 0.018, y: cabH / 2 }));
  g.add(box(w - 0.05, cabH - 0.05, 0.012, M.metal(0x3a3c41, { roughness: 0.7 }), { y: cabH / 2, z: d / 2 }));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.add(place(woofer(M, Math.min(w, cabH) * 0.2), { x: sx * w * 0.22, y: cabH / 2 + sy * cabH * 0.23, z: d / 2 + 0.008 }));
  g.add(box(w, 0.24, d * 0.8, tolex, { r: 0.014, y: cabH + 0.13 }));
  g.add(box(w - 0.04, 0.08, 0.01, mats.face, { y: cabH + 0.15, z: d * 0.4 }));
  for (let i = 0; i < 7; i++) g.add(cyl(0.012, 0.012, 0.016, mats.knob, { seg: 12, x: -w * 0.36 + i * w * 0.12, y: cabH + 0.15, z: d * 0.4 + 0.012, rx: PI / 2 }));
  return g;
}

export const AUDIO_BUILDERS = {
  bookshelf_speakers: bookshelfSpeakers,
  hifi_stack: hifiStack,
  turntable,
  soundbar,
  pa_speaker: paSpeaker,
  pa_subwoofer: paSubwoofer,
  mixing_console: mixingConsole,
  audio_interface: audioInterface,
  midi_controller: midiController,
  headphones_stand: headphonesStand,
  dj_booth: djBooth,
  upright_piano: uprightPiano,
  grand_piano: grandPiano,
  digital_piano: digitalPiano,
  acoustic_guitar: acousticGuitar,
  electric_guitar: electricGuitar,
  electric_bass: electricBass,
  cello,
  cajon,
  electronic_drums: electronicDrums,
  bass_amp: bassAmp,
};
