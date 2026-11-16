import * as THREE from 'three';
import { getMaterials } from './materials.js';
import * as K from './kit.js';
import { EXTRA_ITEM_LIGHTS, buildExtraObject } from './kitExtra.js';
import { createLRU, disposeObject, mergeStatic } from './optimize.js';
import { buildEnvironment, environmentLighting, normalizeEnvironment } from './environment.js';

/**
 * Escenas paramétricas del motor de renders.
 *
 *   buildRoomScene(opts)      sala en corte (estudio, cine en casa, sala de juntas) a la medida
 *   buildProductScene(opts)   un tratamiento suelto (panel, trampa, difusor…)
 *   buildDiffuserScene(d)     el difusor diseñado en la suite, con sus medidas reales
 *
 * Todas devuelven { scene, lighting, focus, view }: `focus` es la esfera a encuadrar y `view`
 * la cámara sugerida (azimut, elevación y zoom). `cameraFor` convierte eso en una cámara.
 */

const HALF_PI = Math.PI / 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const PALETTE = {
  purple: 0x7464cc,
  lilac: 0xb3a7ec,
  cream: 0xe9e2d3,
  sand: 0xcdbfa6,
  charcoal: 0x3b3b45,
  amber: 0xd9a441,
  graphite: 0x26262b,
};

export const DEFAULT_PALETTE = {
  primary: PALETTE.purple,
  secondary: PALETTE.lilac,
  neutral: PALETTE.cream,
  accent: PALETTE.amber,
  dark: PALETTE.charcoal,
  wood: 'oak',
  wall: 0xf1eee8,
  floor: 'planks',
};

export const DEFAULT_TREAT = { panels: true, diffusers: true, traps: true, clouds: true, slats: true, rugs: true };

/** Tipos de sala disponibles, con sus medidas de partida y los rangos en que el trazado funciona. */
export const ROOM_TYPES = {
  studio: { label: 'Estudio de grabación', dims: { W: 5.4, D: 4.4, H: 2.7 }, range: { W: [3.6, 8], D: [3.4, 7], H: [2.3, 3.6] } },
  cinema: { label: 'Cine en casa', dims: { W: 6.2, D: 4.4, H: 2.7 }, range: { W: [4.6, 9], D: [3.6, 6.5], H: [2.3, 3.6] } },
  meeting: { label: 'Sala de juntas', dims: { W: 6.0, D: 4.2, H: 2.7 }, range: { W: [4.4, 9], D: [3.4, 6.5], H: [2.3, 3.6] } },
  classroom: { label: 'Aula Universidad / Colegio', dims: { W: 7.6, D: 6.2, H: 3.1 }, range: { W: [5.0, 12], D: [4.5, 10], H: [2.5, 4.5] } },
  industrial: { label: 'Nave / Taller Industrial', dims: { W: 8.5, D: 6.6, H: 3.8 }, range: { W: [5.5, 16], D: [4.5, 14], H: [2.8, 6.0] } },
};

/* ------------------------------------------------------------------ cámara */

export function orbitCamera({ target, azimuth, elevation, distance, fov = 30, aspect = 1 }) {
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 700);
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);
  const t = target;
  camera.position.set(t.x + distance * Math.cos(el) * Math.sin(az), t.y + distance * Math.sin(el), t.z + distance * Math.cos(el) * Math.cos(az));
  camera.lookAt(t);
  camera.updateMatrixWorld();
  return camera;
}

/**
 * Cámara que encuadra la esfera `built.focus` desde la vista dada, o entra directamente
 * dentro del recinto cuando `view.firstPerson` está activo (`camX, camY, camZ` → `lookX, lookY, lookZ`).
 */
export function cameraFor(built, view = {}, aspect = 1) {
  if (view?.firstPerson && Number.isFinite(Number(view.camX)) && Number.isFinite(Number(view.camZ))) {
    const fov = Number(view.fov) || 58;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.08, 700);
    const camY = Number.isFinite(Number(view.camY)) ? Number(view.camY) : 1.55;
    const lookX = Number(view.lookX) || 0;
    const lookY = Number.isFinite(Number(view.lookY)) ? Number(view.lookY) : 1.38;
    const lookZ = Number(view.lookZ) || 0;
    camera.position.set(Number(view.camX), camY, Number(view.camZ));
    camera.lookAt(lookX, lookY, lookZ);
    camera.updateMatrixWorld();
    return camera;
  }

  const fov = built.fov ?? 30;
  const azimuth = view.azimuth ?? built.view.azimuth;
  const elevation = view.elevation ?? built.view.elevation;
  const zoom = view.zoom ?? built.view.zoom ?? 1;
  const half = THREE.MathUtils.degToRad(fov / 2);
  const fit = Math.min(half, Math.atan(Math.tan(half) * aspect));
  const distance = ((built.focus.radius / Math.sin(fit)) * (built.margin ?? 1)) / zoom;
  const target = new THREE.Vector3(
    built.focus.center.x + (Number(view.targetX) || 0),
    built.focus.center.y + (Number(view.targetY) || 0),
    built.focus.center.z + (Number(view.targetZ) || 0)
  );
  return orbitCamera({ target, azimuth, elevation, distance, fov, aspect });
}

/** Suelo invisible que solo recoge la sombra (sale en el canal alfa de la imagen). */
function shadowGround(y = 0, opacity = 0.4, color = 0x14112a) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity, color }));
  ground.rotation.x = -HALF_PI;
  ground.position.y = y;
  ground.receiveShadow = true;
  return ground;
}

const sphereOf = (object) => new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());

/* --------------------------------------------------------------- iluminación */

const DAYLIGHT = {
  sky: { intensity: 2.3, zenith: 0xdde8ff, horizon: 0xfff2e0 },
  key: { azimuth: 44, elevation: 50, intensity: 3.0, color: 0xfff0dc, soft: 3.5 },
  env: 0.22,
  exposure: 0.9,
  saturation: 1.06,
};

const NIGHT = {
  sky: { intensity: 0.3, zenith: 0x8a9cff, horizon: 0x5b4fb0, minElevation: 0.25 },
  env: 0.05,
  exposure: 1.05,
  bloom: 0.55,
  bloomThreshold: 1.1,
  saturation: 1.08,
};

const STUDIO_LIGHT = {
  sky: { intensity: 2.5, zenith: 0xf2f4ff, horizon: 0xfff6ea },
  key: { azimuth: -32, elevation: 46, intensity: 2.6, color: 0xfff4e6, soft: 7 },
  env: 0.3,
  exposure: 0.95,
};

function spot(parent, { pos, target, color = 0xffdcb0, intensity = 14, angle = 0.95, penumbra = 0.7, radius = 0.1 }) {
  const light = new THREE.SpotLight(color, intensity, 0, angle, penumbra, 2);
  light.position.set(...pos);
  light.target.position.set(...target);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 0.02;
  light.shadow.camera.near = 0.15;
  light.shadow.camera.far = 16;
  parent.add(light, light.target);
  return { light, radius };
}

function bulb(parent, { pos, color = 0xffdcb0, intensity = 2, distance = 6 }) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(...pos);
  parent.add(light);
  return light;
}

/* ================================================================== ESTUDIO */

function studioRoom(M, { W, D, H, treat, pal, night, furniture }) {
  const g = new THREE.Group();
  const practicals = [];
  g.add(K.roomShell(M, { W, D, H, wall: pal.wall, floor: pal.floor, floorColor: pal.floorColor }));
  const back = -D / 2;
  const front = D / 2;
  const left = -W / 2;
  const right = W / 2;
  const cx = W >= 5 ? 0.25 : 0;
  const lounge = furniture && D >= 3.8;
  const slatW = Math.min(2.9, W - 2.3);
  const slatH = Math.min(2.25, H - 0.4);
  const slatY = slatH / 2 + 0.1;

  if (furniture) {
    const deskW = Math.min(1.9, W - 1.9);
    g.add(K.place(K.desk(M, { w: deskW, wood: pal.wood }), { x: cx, z: back + 0.95 }));
    g.add(K.place(K.display(M, { glow: night ? 1.7 : 1.15 }), { x: cx, y: 0.868, z: back + 0.72 }));
    const spread = Math.min(1.22, W / 2 - 0.55 - Math.abs(cx));
    if (spread > deskW / 2 + 0.1) {
      for (const sx of [-1, 1]) {
        g.add(K.place(K.speakerStand(M), { x: cx + sx * spread, z: back + 0.58, ry: -sx * 0.45 }));
        g.add(K.place(K.studioMonitor(M), { x: cx + sx * spread, y: 0.9, z: back + 0.58, ry: -sx * 0.45 }));
      }
    }
    g.add(K.place(K.taskChair(M), { x: cx + 0.05, z: back + 1.78, ry: 0.35 }));
    g.add(K.place(K.plant(M), { x: right - 0.45, z: back + 0.45 }));
    if (lounge) {
      g.add(K.place(K.sofa(M, { color: pal.neutral === PALETTE.cream ? 0xd6cfc1 : pal.neutral, pillows: [pal.accent, pal.secondary] }), { x: left + 0.5, z: front - 1.22, ry: -HALF_PI }));
      g.add(K.place(K.floorLamp(M, { glow: night ? 2.2 : 0.7 }), { x: left + 0.32, z: front - 0.2 }));
      if (W >= 4.6) g.add(K.place(K.coffeeTable(M, { wood: pal.wood }), { x: left + 1.5, z: front - 1.22 }));
    }
    if (W >= 5 && D >= 4.2) {
      g.add(K.place(K.keyboardStand(M), { x: right - 0.65, z: front - 1.45, ry: -HALF_PI }));
      g.add(K.place(K.pouf(M, { color: pal.accent }), { x: right - 1.35, z: front - 1.4 }));
    }
  }

  if (treat.rugs) {
    g.add(K.place(K.rug(M, { w: Math.min(3.0, W - 1.4), d: Math.min(2.3, D - 1.9), color: 0xcfc9dd }), { x: cx, z: back + 1.45 }));
    if (lounge && W >= 4.6) g.add(K.place(K.roundRug(M, { r: 0.95 }), { x: left + 1.45, z: front - 1.2 }));
  }
  if (treat.slats && slatW > 1) g.add(K.place(K.slatWall(M, { w: slatW, h: slatH, wood: pal.wood }), { x: cx, y: slatY, z: back }));
  if (treat.traps) g.add(K.place(K.bassTrap(M, { h: H - 0.2, color: pal.dark, wood: pal.wood }), { x: left, z: back }));
  if (treat.panels) {
    // Pared frontal: a los lados de los listones
    const ph = Math.min(1.5, H - 1.1);
    for (const sx of [-1, 1]) {
      const x = cx + sx * (slatW / 2 + 0.5);
      const limit = W / 2 - (sx < 0 && treat.traps ? 0.52 : 0.08);
      if (Math.abs(x) + 0.32 < limit) g.add(K.place(K.absorber(M, { color: pal.neutral, h: ph }), { x, y: 0.55 + ph / 2, z: back }));
    }
    // Pared lateral: primeras reflexiones
    const y = Math.min(1.4, H - 1.25);
    g.add(K.place(K.absorber(M, { color: pal.primary }), { x: left, y, z: back + 0.9, ry: HALF_PI }));
    if (D >= 3.6) g.add(K.place(K.absorber(M, { color: pal.secondary }), { x: left, y, z: back + 1.6, ry: HALF_PI }));
  }
  if (treat.diffusers) {
    const y = Math.min(1.72, H - 0.95);
    const zq = front - 1.62;
    if (zq - 0.55 > back + 1.95) g.add(K.place(K.qrd(M, { p: 7, periods: 2, h: 1.1, wood: pal.wood }), { x: left, y, z: zq, ry: HALF_PI }));
    if (D >= 4.2) g.add(K.place(K.skyline(M, { p: 7, cell: 0.08, wood: pal.wood }), { x: left, y, z: front - 0.7, ry: HALF_PI }));
    else if (zq - 0.55 <= back + 1.95) g.add(K.place(K.skyline(M, { p: 7, cell: 0.08, wood: pal.wood }), { x: left, y, z: front - 0.75, ry: HALF_PI }));
  }
  if (treat.clouds && W >= 4) {
    const w = Math.min(1.25, (W - 1.6) / 2);
    for (const sx of [-1, 1]) g.add(K.place(K.cloud(M, { w, d: 0.85, color: pal.neutral, drop: 0.32 }), { x: cx + sx * (w / 2 + 0.035), y: H - 0.35, z: back + 1.35 }));
  }

  if (night) {
    practicals.push(spot(g, { pos: [cx, H - 0.41, back + 1.42], target: [cx, 0, back + 1.2], intensity: 17, angle: 0.95, radius: 0.12 }));
    practicals.push(spot(g, { pos: [right - 1.15, H - 0.08, front - 1.4], target: [right - 1.0, 0, front - 1.4], intensity: 13, angle: 0.75, radius: 0.12 }));
    bulb(g, { pos: [cx, 1.2, back + 1.1], color: 0xb9a8ff, intensity: 0.9, distance: 2.6 });
    if (lounge) {
      practicals.push(spot(g, { pos: [left + 0.32, 1.52, front - 0.2], target: [left + 0.9, 0, front - 0.8], intensity: 9, angle: 1.25, penumbra: 0.9, radius: 0.07 }));
      bulb(g, { pos: [left + 0.42, 1.75, front - 0.25], intensity: 1.6, distance: 3.2 });
    }
    if (treat.slats && slatW > 1) {
      g.add(K.place(K.ledStrip(M, { len: slatW, color: 0xa58cff, intensity: 6 }), { x: cx, y: slatY + slatH / 2 + 0.03, z: back + 0.05 }));
      for (const t of [-0.38, -0.13, 0.13, 0.38]) bulb(g, { pos: [cx + t * slatW, slatY + slatH / 2 - 0.05, back + 0.22], color: 0x9d86ff, intensity: 0.75, distance: 2.4 });
    }
  }
  return { group: g, practicals };
}

/* ============================================================= CINE EN CASA */

function cinemaRoom(M, { W, D, H, treat, pal, night, furniture }) {
  const g = new THREE.Group();
  const practicals = [];
  const wall = pal.wall === DEFAULT_PALETTE.wall ? 0x45434f : pal.wall;
  g.add(K.roomShell(M, { W, D, H, wall, floor: 'carpet', floorColor: 0x4a4d5c, skirting: 0x2c2b33, cut: 0x1f1e25 }));
  const back = -D / 2;
  const left = -W / 2;
  const right = W / 2;
  const fabricUV = { grain: 'y', along: 0.16, across: 0.16 };

  // Pared de pantalla (izquierda)
  const screenW = Math.min(3.1, D - 1.3);
  if (treat.panels) g.add(K.group([K.box(D - 0.2, H - 0.2, 0.05, M.fabric(0x2c2b36), { r: 0.01, uv: fabricUV, z: 0.03 })], { x: left, y: H / 2 - 0.05, z: 0, ry: HALF_PI }));
  g.add(K.place(K.wallScreen(M, { w: screenW, h: screenW / 2.35, kind: 'movie', glow: night ? 2.4 : 1.35 }), { x: left + 0.05, y: 1.5, z: 0, ry: HALF_PI }));
  if (furniture) {
    g.add(K.place(K.sideboard(M, { w: Math.min(2.3, D - 2.1), h: 0.34, d: 0.4, wood: 'walnut' }), { x: left + 0.32, z: 0, ry: HALF_PI }));
    const tz = screenW / 2 + 0.31;
    if (tz < D / 2 - 0.2) for (const sz of [-1, 1]) g.add(K.place(K.towerSpeaker(M), { x: left + 0.32, z: sz * tz, ry: HALF_PI - sz * 0.2 }));

    // Butacas: una o dos filas; la segunda sobre tarima
    const seats = D >= 5.6 ? 4 : 3;
    g.add(K.place(K.cinemaRow(M, { seats, color: 0x5a5560 }), { x: left + 3.25, z: 0, ry: HALF_PI }));
    if (W >= 6) {
      const rx = Math.min(left + 5.2, right - 1.0);
      g.add(K.place(K.box(1.75, 0.28, D - 0.8, M.fabric(0x3f4250, { bump: 1.1 }), { r: 0.01, uv: { grain: 'x', along: 0.3, across: 0.3 } }), { x: rx, y: 0.14, z: 0 }));
      g.add(K.place(K.cinemaRow(M, { seats, color: 0x5a5560 }), { x: rx, y: 0.28, z: 0, ry: HALF_PI }));
      g.add(K.place(K.ledStrip(M, { len: D - 0.8, color: 0xffb45e, intensity: night ? 5 : 2 }), { x: rx - 0.88, y: 0.2, z: 0, ry: HALF_PI }));
      if (night) bulb(g, { pos: [rx - 0.8, 0.45, 0], color: 0xffb45e, intensity: 0.7, distance: 2.6 });
    }
  }

  // Pared del fondo: absorbentes, columnas de listones con LED y difusión hacia atrás
  const count = clamp(Math.round((W - 1.5) / 1.18), 2, 6);
  const ph = H - 0.6;
  let x = left + 0.55;
  for (let i = 0; i < count; i++) {
    if (treat.panels) g.add(K.place(K.absorber(M, { w: 0.8, h: ph, color: i % 2 ? pal.dark : pal.primary }), { x, y: 0.2 + ph / 2, z: back }));
    x += 0.59;
    if (treat.slats) {
      g.add(K.place(K.slatWall(M, { w: 0.3, h: ph, wood: 'walnut' }), { x, y: 0.2 + ph / 2, z: back }));
      for (const s of [-1, 1]) g.add(K.place(K.ledStrip(M, { len: ph, vertical: true, color: 0xffb45e, intensity: night ? 5 : 1.6 }), { x: x + s * 0.17, y: 0.2 + ph / 2, z: back + 0.03 }));
      if (night && i % 2 === 0) bulb(g, { pos: [x, 1.3, back + 0.35], color: 0xffb060, intensity: 0.8, distance: 2.6 });
    }
    x += 0.59;
  }
  if (treat.diffusers && x + 0.12 + 0.52 < right) g.add(K.place(K.qrd(M, { p: 7, periods: 2, h: ph, wood: 'walnut' }), { x: x + 0.12, y: 0.2 + ph / 2, z: back }));

  if (night) {
    practicals.push(spot(g, { pos: [left + 0.5, 1.5, 0], target: [right - 0.1, 0.6, 0], color: 0xffc9a0, intensity: 26, angle: 1.2, penumbra: 1, radius: 0.5 }));
    bulb(g, { pos: [left + 0.7, 1.5, 0], color: 0xffb58a, intensity: 2.0, distance: 4.5 });
  }
  return { group: g, practicals, exposure: night ? 1.3 : 1.02, sky: night ? undefined : 2.6 };
}

/* =========================================================== SALA DE JUNTAS */

function meetingRoom(M, { W, D, H, treat, pal, night, furniture }) {
  const g = new THREE.Group();
  const practicals = [];
  g.add(K.roomShell(M, { W, D, H, wall: pal.wall, floor: pal.floor === 'planks' ? 'carpet' : pal.floor, floorColor: 0xc4c0b8 }));
  const back = -D / 2;
  const left = -W / 2;
  const right = W / 2;
  const tx = 0.25;
  const len = clamp(W - 3.0, 1.8, 4.2);
  const n = Math.max(2, Math.round(len));
  const dxs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * ((len - 1.04) / Math.max(1, n - 1)));

  if (furniture) {
    g.add(K.place(K.meetingTable(M, { w: len, wood: pal.wood }), { x: tx }));
    const chairColors = [pal.primary, pal.secondary, 0xe6dfd0];
    dxs.forEach((dx, i) => {
      g.add(K.place(K.shellChair(M, { color: chairColors[i % 3] }), { x: tx + dx, z: 0.86 }));
      g.add(K.place(K.shellChair(M, { color: chairColors[(i + 1) % 3] }), { x: tx + dx, z: -0.86, ry: Math.PI }));
    });
    g.add(K.place(K.shellChair(M, { color: pal.accent }), { x: tx + len / 2 + 0.36, ry: HALF_PI }));
    g.add(K.place(K.sideboard(M, { w: 1.6, wood: pal.wood }), { x: right - 1.3, z: back + 0.24 }));
    g.add(K.place(K.plant(M, { h: 1.7, seed: 8 }), { x: left + 0.45, z: back + 0.45 }));
    // Lámparas colgantes sobre la mesa
    const px = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 0.95);
    px.forEach((dx) => {
      g.add(K.place(K.pendant(M, { drop: Math.max(0.3, H - 1.75), glow: night ? 3 : 1.2 }), { x: tx + dx, y: 1.55, z: 0 }));
      if (night) practicals.push(spot(g, { pos: [tx + dx, 1.54, 0], target: [tx + dx, 0, 0], intensity: 7, angle: 1.05, penumbra: 0.8, radius: 0.08 }));
    });
  }

  // Pared de presentación: pantalla entre paneles de listones
  g.add(K.place(K.wallScreen(M, { w: Math.min(1.9, D - 2.2), h: Math.min(1.9, D - 2.2) * 0.563, kind: 'chart', glow: night ? 1.5 : 1.0 }), { x: left, y: 1.5, z: 0, ry: HALF_PI }));
  if (treat.slats && D >= 3.8) for (const sz of [-1, 1]) g.add(K.place(K.slatWall(M, { w: 0.85, h: Math.min(2.3, H - 0.4), wood: pal.wood }), { x: left, y: Math.min(2.3, H - 0.4) / 2 + 0.1, z: sz * Math.min(1.5, D / 2 - 0.6), ry: HALF_PI }));

  // Pared del fondo: mosaico de fieltro y absorbente enmarcado
  if (treat.panels) {
    const wide = W >= 5.6;
    const felt = [pal.primary, pal.secondary, pal.neutral, pal.accent, pal.dark, pal.secondary, pal.neutral];
    g.add(K.place(K.hexTiles(M, { cols: wide ? 7 : 5, rows: 4, radius: 0.22, colors: felt, skip: 0.1 }), { x: right - (wide ? 1.55 : 1.2), y: Math.min(1.62, H - 1.05), z: back }));
    if (W >= 5.4) g.add(K.place(K.absorber(M, { w: 1.2, h: 0.9, color: pal.neutral, frame: pal.wood }), { x: left + 1.65, y: 1.5, z: back }));
  }
  // Bafles colgantes sobre la mesa
  if (treat.clouds) g.add(K.place(K.baffles(M, { count: 6, len, h: 0.3, pitch: 0.3, drop: 0.28, colors: [pal.secondary, pal.primary, pal.neutral] }), { x: tx, y: H - 0.58, z: 0 }));

  if (night) {
    bulb(g, { pos: [left + 0.6, 1.5, 0], color: 0xdfe4ff, intensity: 1.2, distance: 3.5 });
    for (const t of [0.2, 0.52, 0.72, 0.9]) bulb(g, { pos: [left + t * W, H - 0.35, back + 0.55], color: 0xffe2bd, intensity: 1.3, distance: 3.2 });
  }
  return { group: g, practicals };
}

const ROOM_BUILDERS = { studio: studioRoom, cinema: cinemaRoom, meeting: meetingRoom };

export function buildRoomScene(opts = {}) {
  const type = ROOM_BUILDERS[opts.type] ? opts.type : 'studio';
  const spec = ROOM_TYPES[type];
  const dim = (k) => clamp(Number(opts[k]) || spec.dims[k], spec.range[k][0], spec.range[k][1]);
  const W = dim('W');
  const D = dim('D');
  const H = dim('H');
  const night = Boolean(opts.night);
  const treated = opts.treated !== false;
  const treat = treated ? { ...DEFAULT_TREAT, ...opts.treat } : { panels: false, diffusers: false, traps: false, clouds: false, slats: false, rugs: false };
  const pal = { ...DEFAULT_PALETTE, ...opts.palette };

  const M = getMaterials();
  const scene = new THREE.Scene();
  const built = ROOM_BUILDERS[type](M, { W, D, H, treat, pal, night, furniture: opts.furniture !== false });
  scene.add(built.group);
  scene.add(shadowGround(-0.18, night ? 0.3 : 0.42));

  const base = night ? NIGHT : DAYLIGHT;
  const lighting = { ...base, practicals: built.practicals };
  if (built.exposure) lighting.exposure = built.exposure;
  if (built.sky && lighting.sky) lighting.sky = { ...lighting.sky, intensity: built.sky };

  // Se encuadra el cascarón (piso + dos paredes), con la mirada un poco por debajo del centro
  const half = new THREE.Vector3(W / 2 + 0.13, H / 2 + 0.1, D / 2 + 0.13);
  const focus = new THREE.Sphere(new THREE.Vector3(-0.07, H * 0.3, -0.07), half.length());
  return { scene, lighting, focus, margin: 0.84, fov: 30, view: { azimuth: 40, elevation: 27, zoom: 1 }, dims: { W, D, H } };
}

/* ================================================================ PRODUCTOS */

export const PRODUCT_KINDS = {
  absorber: { label: 'Panel poroso tapizado', params: { w: 0.6, h: 1.2, t: 0.055, frame: true } },
  foam: { label: 'Espuma piramidal', params: { w: 0.6, h: 0.6, t: 0.05 } },
  perforated: { label: 'Madera perforada (Helmholtz)', params: { w: 0.9, h: 1.2, t: 0.06 } },
  membrane: { label: 'Trampa diafragmática', params: { w: 0.6, h: 1.2, t: 0.12 } },
  trap: { label: 'Trampa esquinera', params: { side: 0.5, h: 1.7, corner: true } },
  tube: { label: 'Tube Trap cilíndrico', params: { r: 0.22, h: 1.8 } },
  qrd: { label: 'Difusor QRD 1D', params: { p: 7, periods: 2, h: 1.2, depth: 0.17 } },
  skyline: { label: 'Difusor skyline 2D', params: { p: 7, cell: 0.085, maxH: 0.2 } },
  prd: { label: 'Difusor PRD 1D', params: { p: 7, periods: 2, h: 1.2, depth: 0.16 } },
  mls: { label: 'Difusor binario MLS', params: { order: 3, periods: 2, h: 1.2, depth: 0.10 } },
  poly: { label: 'Difusor policilíndrico', params: { chord: 0.5, sag: 0.13, h: 1.3, count: 3 } },
  slats: { label: 'Panel de listones', params: { w: 0.9, h: 1.6 } },
  cloud: { label: 'Nube de techo', params: { w: 1.2, d: 0.8, count: 2 } },
};

function productItem(M, kind, p, pal) {
  const g = new THREE.Group();
  switch (kind) {
    case 'absorber':
      g.add(K.place(K.absorber(M, { w: p.w, h: p.h, t: p.t, color: pal.primary, frame: p.frame ? pal.wood : null }), { y: p.h / 2 + 0.02, ry: 0.35 }));
      break;
    case 'foam':
      g.add(K.place(K.foamPyramidPanel(M, { w: p.w, h: p.h, t: p.t, color: pal.dark }), { y: p.h / 2 + 0.02, ry: 0.35 }));
      break;
    case 'perforated':
      g.add(K.place(K.perforatedPanel(M, { w: p.w, h: p.h, t: p.t, wood: pal.wood }), { y: p.h / 2 + 0.02, ry: 0.35 }));
      break;
    case 'membrane':
      g.add(K.place(K.membranePanel(M, { w: p.w, h: p.h, t: p.t, color: pal.dark, wood: pal.wood }), { y: p.h / 2 + 0.02, ry: 0.35 }));
      break;
    case 'trap': {
      if (p.corner) {
        const wall = M.paint(0xf1eee8);
        const cut = M.plastic(0x3a3842, { roughness: 0.7 });
        const wh = p.h + 0.25;
        g.add(K.box(1.25, wh, 0.07, wall, { x: 0.59, y: wh / 2, z: -0.035 }));
        g.add(K.box(0.07, wh, 1.18, wall, { x: -0.035, y: wh / 2, z: 0.59 }));
        g.add(K.box(1.25, 0.01, 0.07, cut, { x: 0.59, y: wh + 0.005, z: -0.035 }));
        g.add(K.box(0.07, 0.01, 1.18, cut, { x: -0.035, y: wh + 0.005, z: 0.59 }));
      }
      g.add(K.bassTrap(M, { side: p.side, h: p.h, color: pal.primary, wood: pal.wood }));
      break;
    }
    case 'tube':
      g.add(K.place(K.tubeTrap(M, { r: p.r, h: p.h, color: pal.primary, wood: pal.wood }), { ry: 0.35 }));
      break;
    case 'qrd':
      g.add(K.place(K.qrd(M, { p: p.p, periods: p.periods, h: p.h, depth: p.depth, wood: pal.wood }), { y: p.h / 2, ry: 0.5 }));
      break;
    case 'skyline': {
      const side = p.p * p.cell;
      g.add(K.place(K.skyline(M, { p: p.p, cell: p.cell, maxH: p.maxH, wood: pal.wood }), { y: side / 2, ry: 0.5 }));
      break;
    }
    case 'prd':
      g.add(K.place(K.prdDiffuser(M, { p: p.p, periods: p.periods, h: p.h, depth: p.depth, wood: pal.wood }), { y: p.h / 2, ry: 0.5 }));
      break;
    case 'mls':
      g.add(K.place(K.mlsDiffuser(M, { order: p.order, periods: p.periods, h: p.h, depth: p.depth, wood: pal.wood }), { y: p.h / 2, ry: 0.5 }));
      break;
    case 'poly': {
      const row = new THREE.Group();
      for (let i = 0; i < p.count; i++) row.add(K.place(K.polycylinder(M, { chord: p.chord, sag: p.sag, h: p.h, wood: pal.wood, variant: i }), { x: (i - (p.count - 1) / 2) * p.chord, y: p.h / 2 }));
      row.rotation.y = 0.45;
      g.add(row);
      break;
    }
    case 'slats':
      g.add(K.place(K.slatWall(M, { w: p.w, h: p.h, wood: pal.wood }), { y: p.h / 2, ry: 0.5 }));
      break;
    case 'cloud':
    default:
      g.add(K.place(K.cloud(M, { w: p.w, d: p.d, color: pal.neutral, drop: 0.42 }), { x: p.count > 1 ? -0.22 : 0, y: 0.95, z: p.count > 1 ? -0.25 : 0, ry: 0.4 }));
      if (p.count > 1) g.add(K.place(K.cloud(M, { w: p.w * 0.75, d: p.d * 0.75, color: pal.secondary, drop: 0.62 }), { x: 0.48, y: 0.62, z: 0.3, ry: -0.2 }));
      break;
  }
  return g;
}

const PRODUCT_VIEW = {
  absorber: { azimuth: 14, elevation: 12 },
  foam: { azimuth: 16, elevation: 15 },
  perforated: { azimuth: 12, elevation: 14 },
  membrane: { azimuth: 14, elevation: 13 },
  trap: { azimuth: 52, elevation: 16 },
  tube: { azimuth: 28, elevation: 16 },
  qrd: { azimuth: 6, elevation: 13 },
  skyline: { azimuth: 10, elevation: 20 },
  prd: { azimuth: 6, elevation: 13 },
  mls: { azimuth: 8, elevation: 14 },
  poly: { azimuth: 4, elevation: 13 },
  slats: { azimuth: 8, elevation: 12 },
  cloud: { azimuth: 12, elevation: 9 },
};

function productBuilt(item, view) {
  const scene = new THREE.Scene();
  scene.add(item);
  scene.add(shadowGround(0, 0.38));
  return { scene, lighting: STUDIO_LIGHT, focus: sphereOf(item), margin: 1.08, fov: 26, view: { zoom: 1, ...view } };
}

export function buildProductScene({ kind = 'qrd', params = {}, palette = {} } = {}) {
  const k = PRODUCT_KINDS[kind] ? kind : 'qrd';
  const p = { ...PRODUCT_KINDS[k].params, ...params };
  const pal = { ...DEFAULT_PALETTE, ...palette };
  return productBuilt(productItem(getMaterials(), k, p, pal), PRODUCT_VIEW[k]);
}

/** El difusor diseñado en la suite (objeto de `designDiffuser`), de pie y con sus medidas reales. */
export function buildDiffuserScene(design, { wood = 'oak' } = {}) {
  const M = getMaterials();
  const piece = K.diffuserFromDesign(M, design, { wood });
  const item = new THREE.Group();
  item.add(K.place(piece, { y: (piece.userData.height || 0.6) / 2, ry: 0.45 }));
  return productBuilt(item, { azimuth: 8, elevation: design.type === 'qrd2d' ? 18 : 13 });
}

/* ============================================== TOMAS DEL SITIO (public/renders) */

function composed(id, title, assemble, view) {
  return { id, title, width: 1200, height: 1200, build: () => productBuilt(assemble(getMaterials()), view) };
}

const room = (id, title, type, extra) => ({ id, title, width: 2000, height: 1500, build: () => buildRoomScene({ type, ...extra }) });

export const SITE_SHOTS = [
  room('estudio-tratado', 'Estudio · con tratamiento · día', 'studio'),
  room('estudio-vacio', 'Estudio · sin tratamiento · día', 'studio', { treated: false }),
  room('estudio-tratado-noche', 'Estudio · con tratamiento · noche', 'studio', { night: true }),
  room('estudio-vacio-noche', 'Estudio · sin tratamiento · noche', 'studio', { treated: false, night: true }),
  room('cine', 'Cine en casa · día', 'cinema'),
  room('cine-noche', 'Cine en casa · noche', 'cinema', { night: true }),
  room('juntas', 'Sala de juntas · día', 'meeting'),
  room('juntas-noche', 'Sala de juntas · noche', 'meeting', { night: true }),

  composed('producto-absorbente', 'Paneles absorbentes', (M) => {
    const g = new THREE.Group();
    g.add(K.place(K.absorber(M, { w: 0.6, h: 1.2, color: PALETTE.purple, frame: 'oak' }), { x: -0.36, y: 0.62, z: -0.22, ry: 0.32 }));
    g.add(K.place(K.absorber(M, { w: 0.6, h: 1.2, color: PALETTE.cream, frame: 'oak' }), { x: 0.26, y: 0.62, z: 0.0, ry: 0.1 }));
    g.add(K.place(K.absorber(M, { w: 0.6, h: 0.6, color: PALETTE.amber, frame: 'oak' }), { x: 0.78, y: 0.32, z: 0.3, ry: -0.24 }));
    return g;
  }, PRODUCT_VIEW.absorber),
  composed('producto-trampa', 'Trampas de graves', (M) => {
    const g = productItem(M, 'trap', PRODUCT_KINDS.trap.params, DEFAULT_PALETTE);
    g.add(K.place(K.absorber(M, { w: 0.5, h: 1.0, color: PALETTE.cream }), { x: 0.88, y: 1.05, z: 0 }));
    return g;
  }, PRODUCT_VIEW.trap),
  composed('producto-qrd', 'Difusor QRD', (M) => productItem(M, 'qrd', PRODUCT_KINDS.qrd.params, DEFAULT_PALETTE), PRODUCT_VIEW.qrd),
  composed('producto-skyline', 'Difusor skyline 2D', (M) => {
    const g = new THREE.Group();
    g.add(K.place(K.skyline(M, { p: 7, cell: 0.085, maxH: 0.2 }), { x: -0.2, y: 0.3, z: -0.1, ry: 0.5 }));
    g.add(K.place(K.skyline(M, { p: 7, cell: 0.085, maxH: 0.2, wood: 'walnut' }), { x: 0.44, y: 0.3, z: 0.26, ry: -0.18 }));
    return g;
  }, PRODUCT_VIEW.skyline),
  composed('producto-policilindrico', 'Difusor policilíndrico', (M) => productItem(M, 'poly', PRODUCT_KINDS.poly.params, DEFAULT_PALETTE), PRODUCT_VIEW.poly),
  composed('producto-listones', 'Panel de listones', (M) => {
    const g = new THREE.Group();
    g.add(K.place(K.slatWall(M, { w: 0.9, h: 1.6 }), { x: -0.2, y: 0.8, ry: 0.5 }));
    g.add(K.place(K.slatWall(M, { w: 0.6, h: 1.1, wood: 'walnut' }), { x: 0.56, y: 0.55, z: 0.36, ry: -0.2 }));
    return g;
  }, PRODUCT_VIEW.slats),
  composed('producto-nube', 'Nubes y bafles de techo', (M) => productItem(M, 'cloud', PRODUCT_KINDS.cloud.params, DEFAULT_PALETTE), PRODUCT_VIEW.cloud),
];

/* ====================================== SALA PERSONALIZADA (POLÍGONO + ÍTEMS) */

function resolveItemColor(item, pal) {
  if (item.colorRole === 'custom' && item.customColor) {
    const parsed = parseInt(String(item.customColor).replace('#', ''), 16);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (item.colorRole && typeof pal[item.colorRole] === 'number') {
    return pal[item.colorRole];
  }
  return pal.primary;
}

function buildSingleSceneObject(M, item, pal, night, diffuserDesign, practicals, parentGroup) {
  const dims = item.dims || {};
  const color = resolveItemColor(item, pal);
  const wood = item.wood || pal.wood || 'oak';
  const w = Number(dims.w) || 0.6;
  const h = Number(dims.h) || 1.2;
  const d = Number(dims.d) || 0.6;
  const t = Number(dims.t) || 0.055;

  const extra = buildExtraObject(M, item.typeId, { w, h, d, t, dims, color, wood, pal, night, item });
  if (extra) return extra;

  switch (item.typeId) {
    // 1. Paneles y Trampas
    case 'panel_porous_50':
    case 'panel_broadband_100':
      return K.absorber(M, { w, h, t, color, frame: item.frame ? wood : null });
    case 'panel_foam_pyramid':
      return K.foamPyramidPanel(M, { w, h, t, color });
    case 'panel_perforated_helmholtz':
      return K.perforatedPanel(M, { w, h, t, wood });
    case 'panel_slats':
      return K.slatWall(M, { w, h, depth: Math.max(0.018, t * 0.65), wood });
    case 'panel_membrane':
      return K.membranePanel(M, { w, h, t, color, wood });
    case 'hex_felt':
      return K.hexTiles(M, {
        cols: Math.max(2, Number(dims.cols) || 5),
        rows: Math.max(2, Number(dims.rows) || 4),
        radius: 0.2,
        colors: [color, pal.secondary, pal.neutral, pal.accent, pal.dark],
        skip: 0.1,
      });
    case 'trap_corner':
      return K.bassTrap(M, { side: w, h, color, wood });
    case 'trap_tube':
      return K.tubeTrap(M, { r: Math.max(0.12, w / 2), h, color, wood });
    case 'cloud_ceiling':
      return K.cloud(M, { w, d, t, color, drop: Number(dims.drop) || 0.35 });
    case 'baffles_ceiling':
      return K.baffles(M, {
        count: Math.max(2, Number(dims.baffleCount) || 5),
        len: w,
        h: Number(dims.h) || 0.32,
        t: Number(dims.t) || 0.04,
        pitch: Math.max(0.18, d / Math.max(2, Number(dims.baffleCount) || 5)),
        drop: Number(dims.drop) || 0.3,
        colors: [color, pal.secondary, pal.neutral],
      });

    // 2. Difusores
    case 'diffuser_qrd1d': {
      const qrdObj = K.qrd(M, {
        p: Number(dims.p) || 7,
        periods: Math.max(1, Number(dims.periods) || 2),
        well: Number(dims.well) || 0.06,
        h,
        depth: Math.max(0.05, t),
        wood,
      });
      if (dims.orientation === 'horizontal') {
        const wrap = new THREE.Group();
        qrdObj.rotation.z = HALF_PI;
        wrap.add(qrdObj);
        wrap.userData.width = h;
        return wrap;
      }
      return qrdObj;
    }
    case 'diffuser_skyline':
      return K.skyline(M, {
        p: Number(dims.p) || 7,
        cell: Number(dims.cell) || 0.085,
        maxH: Math.max(0.06, t),
        tiles: Math.max(1, Number(dims.tiles) || 1),
        wood,
      });
    case 'diffuser_prd':
      return K.prdDiffuser(M, {
        p: Number(dims.p) || 7,
        periods: Math.max(1, Number(dims.periods) || 2),
        well: Number(dims.well) || 0.06,
        h,
        depth: Math.max(0.05, t),
        wood,
      });
    case 'diffuser_mls':
      return K.mlsDiffuser(M, {
        order: Number(dims.order) || 3,
        periods: Math.max(1, Number(dims.periods) || 2),
        well: Number(dims.well) || 0.06,
        h,
        depth: Math.max(0.04, t),
        wood,
      });
    case 'diffuser_poly': {
      const pCount = Math.max(1, Number(dims.polyCount) || 2);
      const chord = Number(dims.chord) || w || 0.55;
      const sag = Number(dims.sag) || t || 0.14;
      const row = new THREE.Group();
      for (let i = 0; i < pCount; i++) {
        row.add(
          K.place(K.polycylinder(M, { chord, sag, h, wood, variant: i }), {
            x: (i - (pCount - 1) / 2) * chord,
            z: sag * 0.4,
          })
        );
      }
      row.userData.width = chord * pCount;
      return row;
    }
    case 'diffuser_suite': {
      if (diffuserDesign?.validWidth) {
        return K.diffuserFromDesign(M, diffuserDesign, { wood });
      }
      return K.qrd(M, { p: 7, periods: 2, h: 1.0, depth: 0.16, wood });
    }

    // 3. Mobiliario
    case 'desk': {
      const g = new THREE.Group();
      g.add(K.desk(M, { w, d, h, wood }));
      g.add(K.place(K.display(M, { glow: night ? 1.7 : 1.15 }), { y: h + 0.128, z: -0.22 }));
      return g;
    }
    case 'studio_monitors': {
      const g = new THREE.Group();
      const spread = Math.max(0.8, Number(dims.spread) || 2.0);
      const standH = Math.max(0.65, h - 0.32);
      for (const sx of [-1, 1]) {
        g.add(K.place(K.speakerStand(M, { h: standH }), { x: sx * (spread / 2), ry: -sx * 0.42 }));
        g.add(K.place(K.studioMonitor(M), { x: sx * (spread / 2), y: standH, ry: -sx * 0.42 }));
      }
      return g;
    }
    case 'task_chair':
      return K.taskChair(M, { color });
    case 'sofa':
      return K.sofa(M, { w, color, pillows: [pal.accent, pal.secondary] });
    case 'bookshelf':
      return K.bookshelf(M, { w, h, d, wood });
    case 'rack':
      return K.audioRack(M, { w, h, d, wood });
    case 'subwoofer':
      return K.subwoofer(M, { w, h, d });
    case 'cinema_row': {
      const seats = Math.max(2, Number(dims.seats) || 3);
      const row = K.cinemaRow(M, { seats, color });
      if (dims.riser) {
        const wrap = new THREE.Group();
        const rw = (row.userData.width || 2.2) + 0.35;
        wrap.add(
          K.box(1.65, 0.26, rw, M.fabric(0x3f4250, { bump: 1.1 }), {
            r: 0.01,
            y: 0.13,
            ry: HALF_PI,
            uv: { grain: 'x', along: 0.3, across: 0.3 },
          })
        );
        wrap.add(K.place(row, { y: 0.26 }));
        return wrap;
      }
      return row;
    }
    case 'tower_speaker':
      return K.towerSpeaker(M, { h });
    case 'meeting_table':
      return K.meetingTable(M, { w, d, h, wood, withChairs: Boolean(dims.withChairs), chairColor: color });
    case 'shell_chair':
      return K.shellChair(M, { color });
    case 'sideboard':
      return K.sideboard(M, { w, h: Math.max(0.32, h - 0.14), d, wood });
    case 'keyboard_stand':
      return K.keyboardStand(M);
    case 'rug':
      return K.rug(M, { w, d, color });
    case 'round_rug':
      return K.roundRug(M, { r: Number(dims.r) || w / 2, color });
    case 'coffee_table':
      return K.coffeeTable(M, { r: Number(dims.r) || w / 2, h, wood });
    case 'pouf':
      return K.pouf(M, { r: Number(dims.r) || w / 2, h, color });
    case 'plant':
      return K.plant(M, { h });
    case 'floor_lamp': {
      const lamp = K.floorLamp(M, { glow: night ? 2.2 : 0.7 });
      if (night && parentGroup && practicals) {
        const lx = Number(item.x) || 0;
        const lz = Number(item.z) || 0;
        bulb(parentGroup, { pos: [lx, 1.55, lz], intensity: 1.5, distance: 3.4 });
      }
      return lamp;
    }
    case 'wall_screen':
      return K.wallScreen(M, {
        w,
        h,
        kind: dims.screenKind || 'daw',
        glow: night ? 2.1 : 1.2,
      });
    case 'drum_kit':
      return K.drumKit(M, { color });
    case 'guitar_amp':
      return K.guitarAmp(M, { w, d, h });
    case 'mic_stand':
      return K.micStand(M, { h });

    // 4. Mobiliario de Universidad / Colegio
    case 'student_desk':
      return K.studentDesk(M, { w, d, h, color, wood });
    case 'classroom_desk_grid':
      return K.classroomDeskGrid(M, {
        cols: Math.max(1, Number(dims.cols) || 3),
        rows: Math.max(1, Number(dims.rows) || 2),
        color,
        wood,
      });
    case 'teacher_desk':
      return K.teacherDesk(M, { w, d, h, wood, color });
    case 'whiteboard':
      return K.whiteboard(M, { w, h });
    case 'podium':
      return K.podium(M, { w, d, h, wood });
    case 'ceiling_projector':
      return K.ceilingProjector(M, { w, d, drop: Number(dims.drop) || 0.36 });
    case 'locker_bank':
      return K.lockerBank(M, { w, d, h, cols: Math.max(2, Number(dims.cols) || 3), color });
    case 'lab_bench':
      return K.labBench(M, { w, d, h });
    case 'school_arm_chair':
      return K.schoolArmChair(M, { w, d, h, color, wood });

    // 5. Equipamiento Industrial
    case 'industrial_machine':
      return K.industrialMachine(M, { w, d, h, color });
    case 'hvac_duct':
      return K.hvacDuct(M, { w, d, h, drop: Number(dims.drop) || 0.38 });
    case 'industrial_shelving':
      return K.industrialShelving(M, { w, d, h });
    case 'workbench':
      return K.workbench(M, { w, d, h, wood });
    case 'acoustic_barrier':
      return K.acousticBarrier(M, { w, d, h, color });
    case 'person_figure':
      return K.personFigure(M, { h, color });

    // 6. Elementos Arquitectónicos (Puertas en ambos lados, Ventanales Panorámicos, Cortinas Grandes)
    case 'arch_door':
      return K.archDoor(M, { w, h, wood });
    case 'double_door':
      return K.doubleDoor(M, { w, h, wood });
    case 'arch_window':
      return K.archWindow(M, { w, h, double: true });
    case 'panoramic_window':
      return K.panoramicWindow(M, { w, h });
    case 'floor_to_ceiling_window':
      return K.floorToCeilingWindow(M, { w, h });
    case 'studio_visor_window':
      return K.studioVisorWindow(M, { w, h, wood });
    case 'draped_curtain':
      return K.drapedCurtain(M, { w, h, color });
    case 'stage_curtain':
      return K.stageCurtain(M, { w, h, color });

    // 7. Sillas adicionales, Estanterías Medias, TV, Laptop, Cámaras y Luces
    case 'ergonomic_chair':
      return K.ergonomicChair(M, { color });
    case 'visitor_chair':
      return K.visitorChair(M, { color });
    case 'bar_stool':
      return K.barStool(M, { h, color, wood });
    case 'armchair_lounge':
      return K.armchairLounge(M, { w, d, h, color, wood });
    case 'mid_shelf_credenza':
      return K.midShelfCredenza(M, { w, d, h, wood });
    case 'wall_tv':
      return K.wallTv(M, { w, h, stand: item.mount !== 'wall', glow: night ? 2.1 : 1.35 });
    case 'rolling_tv_stand':
      return K.rollingTvStand(M, { w, d, h, glow: night ? 2.1 : 1.35 });
    case 'laptop_prop':
      return K.laptopProp(M, { w, d, glow: night ? 2.0 : 1.35 });
    case 'desktop_pc_setup':
      return K.desktopPcSetup(M, { w, d, glow: night ? 2.0 : 1.35 });
    case 'books_decor_set':
      return K.booksDecorSet(M, { w, d, h });
    case 'coffee_maker_station':
      return K.coffeeMakerStation(M, { w, d, h });
    case 'ac_split_unit':
      return K.acSplitUnit(M, { w, h, d: t });
    case 'cinema_camera_tripod':
      return K.cinemaCameraTripod(M, { h });
    case 'ptz_conference_cam':
      return K.ptzConferenceCam(M, { h });
    case 'studio_softbox_light': {
      const sb = K.studioSoftboxLight(M, { h, glow: night ? 3.2 : 2.2 });
      if (parentGroup) {
        const lx = Number(item.x) || 0;
        const lz = Number(item.z) || 0;
        bulb(parentGroup, { pos: [lx, h - 0.1, lz], color: 0xfff5e0, intensity: night ? 2.4 : 0.9, distance: 4.8 });
      }
      return sb;
    }
    case 'ring_light_stand': {
      const rl = K.ringLightStand(M, { h, glow: night ? 3.4 : 2.4 });
      if (parentGroup) {
        const lx = Number(item.x) || 0;
        const lz = Number(item.z) || 0;
        bulb(parentGroup, { pos: [lx, h - 0.2, lz], color: 0xfff8eb, intensity: night ? 2.0 : 0.7, distance: 4.0 });
      }
      return rl;
    }
    case 'ceiling_led_panel': {
      const dropVal = Number(dims.drop) || 0.35;
      const clp = K.ceilingLedPanel(M, { w, d, drop: dropVal, glow: night ? 3.2 : 2.2 });
      if (parentGroup) {
        const lx = Number(item.x) || 0;
        const lz = Number(item.z) || 0;
        bulb(parentGroup, { pos: [lx, 2.2, lz], color: 0xfff6e5, intensity: night ? 2.5 : 0.85, distance: 5.5 });
      }
      return clp;
    }
    case 'track_spotlight_bar': {
      const dropVal = Number(dims.drop) || 0.22;
      const tsb = K.trackSpotlightBar(M, { w, drop: dropVal, glow: night ? 3.2 : 2.2 });
      if (parentGroup) {
        const lx = Number(item.x) || 0;
        const lz = Number(item.z) || 0;
        bulb(parentGroup, { pos: [lx, 2.2, lz], color: 0xffe4b5, intensity: night ? 2.2 : 0.75, distance: 5.0 });
      }
      return tsb;
    }
    case 'desk_lamp': {
      const dl = K.deskLamp(M, { h, glow: night ? 2.8 : 1.8 });
      if (parentGroup) {
        const lx = Number(item.x) || 0;
        const ly = (Number(item.y) || 0) + h * 0.85;
        const lz = Number(item.z) || 0;
        bulb(parentGroup, { pos: [lx, ly, lz], color: 0xffe0a3, intensity: night ? 1.5 : 0.5, distance: 3.0 });
      }
      return dl;
    }

    default:
      return K.absorber(M, { w, h, t, color });
  }
}

const THROUGH_WALL_OPENING_TYPES = new Set([
  'arch_door',
  'double_door',
  'arch_window',
  'panoramic_window',
  'floor_to_ceiling_window',
  'studio_visor_window',
]);

/* --------------------------------------------------- cachés de la sala a medida */

// Lo que sale de una caché no se libera al instante: la escena que está en pantalla puede
// seguir usándolo. Se libera dos construcciones después, cuando ya nadie lo referencia.
const retired = { old: [], next: [] };
const retire = (obj) => retired.next.push(obj);
function sweepRetired() {
  retired.old.forEach(disposeObject);
  retired.old = retired.next;
  retired.next = [];
}

const protoCache = createLRU(280, retire);
const shellCache = createLRU(4, retire);
const envCache = createLRU(3, (env) => retire(env.group));

const designIds = new WeakMap();
let designCounter = 0;
function designKey(design) {
  if (!design) return 0;
  if (!designIds.has(design)) designIds.set(design, ++designCounter);
  return designIds.get(design);
}

const paletteKey = (pal) => `${pal.primary}|${pal.secondary}|${pal.neutral}|${pal.accent}|${pal.dark}|${pal.wood}`;
const markShared = (root) =>
  root.traverse((o) => {
    if (o.geometry) o.geometry.userData.shared = true;
  });

/**
 * Prototipo de un objeto del catálogo, sin colocar: se modela una sola vez, se funde en pocas
 * mallas y queda en caché. Mover, girar o duplicar un objeto reutiliza el mismo prototipo.
 */
export function getItemPrototype(M, item, { pal = DEFAULT_PALETTE, night = false, diffuserDesign = null } = {}) {
  const key = JSON.stringify([
    item.typeId,
    item.dims || {},
    item.colorRole || '',
    item.colorRole === 'custom' ? item.customColor : '',
    item.wood || '',
    Boolean(item.frame),
    item.mount === 'wall',
    night,
    paletteKey(pal),
    item.typeId === 'diffuser_suite' ? designKey(diffuserDesign) : 0,
  ]);
  let proto = protoCache.get(key);
  if (!proto) {
    proto = mergeStatic(buildSingleSceneObject(M, item, pal, night, diffuserDesign, null, null));
    protoCache.set(key, proto);
  }
  return proto;
}

/** Modelo de un objeto del catálogo, nuevo y sin caché (para miniaturas). Quien lo pide lo libera. */
export function buildItemModel(M, item, { pal = DEFAULT_PALETTE, night = false, diffuserDesign = null } = {}) {
  return mergeStatic(buildSingleSceneObject(M, item, { ...DEFAULT_PALETTE, ...pal }, night, diffuserDesign, null, null));
}

/** Luces que aportan las lámparas del catálogo: [altura, color, intensidad de día, de noche, alcance]. */
const ITEM_LIGHTS = {
  floor_lamp: (item) => ({ y: 1.55, color: 0xffdcb0, day: 0, night: 1.5, distance: 3.4 }),
  studio_softbox_light: (item, h) => ({ y: h - 0.1, color: 0xfff5e0, day: 0.9, night: 2.4, distance: 4.8 }),
  ring_light_stand: (item, h) => ({ y: h - 0.2, color: 0xfff8eb, day: 0.7, night: 2.0, distance: 4.0 }),
  ceiling_led_panel: (item, h, H) => ({ y: H - (Number(item.dims?.drop) || 0.35) - 0.12, color: 0xfff6e5, day: 0.85, night: 2.5, distance: 5.5 }),
  track_spotlight_bar: (item, h, H) => ({ y: H - (Number(item.dims?.drop) || 0.22) - 0.14, color: 0xffe4b5, day: 0.75, night: 2.2, distance: 5.0 }),
  desk_lamp: (item, h) => ({ y: (Number(item.y) || 0) + h * 0.85, color: 0xffe0a3, day: 0.5, night: 1.5, distance: 3.0 }),
  ...EXTRA_ITEM_LIGHTS,
};
const MAX_ITEM_LIGHTS = 6;

// Focos de techo del modo noche: se reutilizan entre escenas para no reservar mapas de sombra cada vez
let nightSpots = null;
function getNightSpots() {
  if (!nightSpots) {
    nightSpots = [0, 1].map(() => {
      const light = new THREE.SpotLight(0xffdcb0, 14, 0, 0.95, 0.7, 2);
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.0006;
      light.shadow.normalBias = 0.02;
      light.shadow.camera.near = 0.15;
      light.shadow.camera.far = 16;
      light.userData.shared = true;
      return light;
    });
  }
  return nightSpots;
}

/** Coloca en la sala las piezas de un objeto (según su montaje y repetición) dentro de un contenedor. */
function placeSceneItem(M, item, { pal, night, diffuserDesign, layout }) {
  const { H, walls, corners } = layout;
  const proto = getItemPrototype(M, item, { pal, night, diffuserDesign });
  const count = Math.max(1, Math.min(12, Number(item.count) || 1));
  const spacing = Number(item.spacing) ?? 0.12;
  const rotRad = THREE.MathUtils.degToRad(Number(item.rotation) || 0);
  const container = new THREE.Group();
  container.name = `item_${item.id}`;
  const piece = () => proto.clone(true);

  if (item.mount === 'wall' && walls.length > 0) {
    const wIdx = ((Number(item.wallIndex) || 0) % walls.length + walls.length) % walls.length;
    const wInfo = walls[wIdx];
    const unitW = Number(proto.userData?.width) || Number(item.dims?.w) || 0.6;
    const pitch = unitW + spacing;
    const isThroughWall = THROUGH_WALL_OPENING_TYPES.has(item.typeId);
    const isDoor = item.typeId === 'arch_door' || item.typeId === 'double_door';
    container.userData.wallIndex = wIdx;

    for (let i = 0; i < count; i++) {
      const offsetAlong = (Number(item.along) || 0) + (i - (count - 1) / 2) * pitch;
      const clampedAlong = clamp(offsetAlong, -wInfo.length / 2 + 0.1, wInfo.length / 2 - 0.1);
      const pt = K.sampleWallPoint(wInfo, clampedAlong);

      // Puertas y ventanales se centran exactamente en el muro para verse en ambos lados; paneles van ligeramente al interior
      const px = isThroughWall ? pt.x : pt.x + pt.inX * 0.008;
      const pz = isThroughWall ? pt.z : pt.z + pt.inZ * 0.008;

      const unitH = Number(item.dims?.h) || (isDoor ? 2.05 : 1.2);
      const elev = isDoor
        ? unitH / 2
        : item.typeId === 'floor_to_ceiling_window'
          ? unitH / 2 + 0.04
          : clamp(Number(item.elevation) || 1.35, 0.15, H - 0.15);

      container.add(K.place(piece(), { x: px, y: elev, z: pz, ry: pt.rotationY + rotRad }));
    }
  } else if (item.mount === 'corner' && corners.length > 0) {
    const cIdx = ((Number(item.cornerIndex) || 0) % corners.length + corners.length) % corners.length;
    const cInfo = corners[cIdx];
    const isTube = item.typeId === 'trap_tube';
    const inwardShift = isTube ? (Number(item.dims?.w) || 0.4) * 0.62 : 0.01;
    container.add(
      K.place(piece(), {
        x: cInfo.x + cInfo.inX * inwardShift,
        y: Number(item.y) || 0,
        z: cInfo.z + cInfo.inZ * inwardShift,
        ry: cInfo.rotationY + rotRad,
      })
    );
  } else {
    // Techo, piso, sobre una mesa o repisa (item.y > 0) o libre
    const isCeiling = item.mount === 'ceiling';
    const drop = clamp(Number(item.dims?.drop ?? item.drop) || 0.35, 0.04, Math.max(0.1, H - 0.35));
    const unitW = Number(item.dims?.w) || (isCeiling ? 1.2 : 0.6);
    const pitch = unitW + spacing;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    const baseY = isCeiling ? H - drop : item.mount === 'free' ? Number(item.y) || 1.0 : Number(item.y) || 0;

    for (let i = 0; i < count; i++) {
      const shift = (i - (count - 1) / 2) * pitch;
      container.add(
        K.place(piece(), {
          x: (Number(item.x) || 0) + shift * cosR,
          y: baseY,
          z: (Number(item.z) || 0) - shift * sinR,
          ry: rotRad,
        })
      );
    }
  }

  // Etiquetar las mallas con el ID del objeto para seleccionarlo con un clic en 3D
  container.userData.sceneItemId = item.id;
  container.traverse((obj) => {
    if (obj.isMesh) obj.userData.sceneItemId = item.id;
  });
  return container;
}

// Color de la luz que rebota en el piso hacia el techo (el del piso, lavado con blanco)
const FLOOR_BOUNCE = { planks: 0xf6e7d2, walnut: 0xe4d0bd, carpet: 0xd6d6de, tiles: 0xf1f3f6, concrete: 0xe2e4e8 };

/**
 * Sala a la medida: planta poligonal del proyecto (o rectangular), objetos del catálogo y,
 * si se pide, un entorno exterior en 3D (`environment`: 'garden' | 'city' | 'sunset' | 'studio').
 *
 * Devuelve además `shell` (muros y techo que el visor muestra u oculta según la cámara),
 * `itemObjects` (Map id → objeto 3D) y `env` (sectores de vegetación).
 */
export function buildCustomRoomScene(opts = {}) {
  sweepRetired();
  const night = Boolean(opts.night);
  const pal = { ...DEFAULT_PALETTE, ...opts.palette };
  const M = getMaterials();
  const scene = new THREE.Scene();
  const g = new THREE.Group();
  const practicals = [];
  const items = Array.isArray(opts.items) ? opts.items : [];

  // 1. Determinar polígono de la sala (real del proyecto o rectangular a medida)
  const roomPolygon =
    opts.usePolygon && opts.roomPolygon?.vertices?.length >= 3
      ? opts.roomPolygon
      : {
          vertices: [
            { x: 0, y: 0 },
            { x: Number(opts.W) || 5.4, y: 0 },
            { x: Number(opts.W) || 5.4, y: Number(opts.D) || 4.4 },
            { x: 0, y: Number(opts.D) || 4.4 },
          ],
          height: Number(opts.H) || 2.7,
          curvatures: {},
        };

  const sync = opts.syncSurfaceMaterials !== false && Boolean(opts.usePolygon && opts.materials);
  const cutMode = opts.cutMode || 'auto';
  const openings = items
    .filter((it) => it && it.enabled !== false && it.mount === 'wall' && THROUGH_WALL_OPENING_TYPES.has(it.typeId))
    .map((it) => [it.typeId, it.wallIndex, it.along, it.elevation, it.dims?.w, it.dims?.h, it.count, it.spacing]);
  const shellKey = JSON.stringify([roomPolygon, sync ? opts.materials : 0, pal.wall, pal.floor, pal.floorColor, pal.wood, pal.primary, openings]);
  let shell = shellCache.get(shellKey);
  if (!shell) {
    shell = K.polygonRoomShell(M, {
      roomPolygon,
      materials: opts.materials || null,
      syncSurfaceMaterials: sync,
      sceneItems: items,
      wall: pal.wall,
      floor: pal.floor,
      floorColor: pal.floorColor || 0x8d8a86,
      wood: pal.wood || 'oak',
      primaryColor: pal.primary,
      cutMode,
    });
    // Cada muro (completo y recortado) queda en pocas mallas
    shell.userData.wallParts.forEach((part) => {
      for (const k of ['full', 'stub']) {
        const merged = mergeStatic(part[k]);
        shell.remove(part[k]);
        shell.add(merged);
        part[k] = merged;
      }
    });
    markShared(shell);
    shellCache.set(shellKey, shell);
  }
  // El cascarón en caché conserva lo que el visor haya ocultado: se devuelve a su estado inicial
  const wallCount = shell.userData.wallParts.length;
  K.setWallCut(shell, (part) => K.staticWallCut(cutMode, part, wallCount));
  shell.userData.ceiling.visible = cutMode === 'full' && Boolean(opts.ceiling);
  g.add(shell);

  const layout = shell.userData.layout || K.getPolygonLayout(roomPolygon);
  const { W, D, H } = layout;

  // 2. Colocar cada objeto 3D personalizable
  const itemObjects = new Map();
  let lightCount = 0;
  items.forEach((item) => {
    if (!item || item.enabled === false) return;
    const container = placeSceneItem(M, item, { pal, night, diffuserDesign: opts.diffuserDesign, layout });

    // Indicador del objeto seleccionado (solo para los visores que no dibujan el suyo)
    if (opts.selectedItemId && opts.selectedItemId === item.id && !opts.hideSelection) {
      const box3 = new THREE.Box3().setFromObject(container);
      if (!box3.isEmpty()) {
        const center = box3.getCenter(new THREE.Vector3());
        const size = box3.getSize(new THREE.Vector3());
        const ringR = Math.max(0.28, Math.hypot(size.x, size.z) * 0.54);
        const ringGeo = new THREE.RingGeometry(ringR - 0.025, ringR, 40);
        ringGeo.rotateX(-HALF_PI);
        const ringMesh = new THREE.Mesh(ringGeo, M.glow(0x8767f9, 2.2));
        ringMesh.position.set(center.x, Math.max(0.015, box3.min.y + 0.01), center.z);
        ringMesh.castShadow = false;
        ringMesh.receiveShadow = false;
        container.add(ringMesh);
      }
    }

    // Lámparas: una luz puntual por objeto, con tope para no encarecer el sombreado
    const lamp = ITEM_LIGHTS[item.typeId];
    if (lamp && lightCount < MAX_ITEM_LIGHTS) {
      const spec = lamp(item, Number(item.dims?.h) || 1.2, H);
      const intensity = night ? spec.night : spec.day;
      if (intensity > 0) {
        bulb(g, { pos: [Number(item.x) || 0, spec.y, Number(item.z) || 0], color: spec.color, intensity, distance: spec.distance });
        lightCount += 1;
      }
    }

    itemObjects.set(item.id, container);
    g.add(container);
  });

  // 3. Iluminación interior en modo Noche
  if (night) {
    const [a, b] = getNightSpots();
    const aimSpot = (light, pos, target, intensity, angle, radius) => {
      light.position.set(...pos);
      light.target.position.set(...target);
      light.intensity = intensity;
      light.angle = angle;
      g.add(light, light.target);
      practicals.push({ light, radius });
    };
    aimSpot(a, [0, H - 0.15, -D * 0.18], [0, 0, -D * 0.12], 18, 1.05, 0.14);
    aimSpot(b, [W * 0.22, H - 0.12, D * 0.2], [W * 0.15, 0, D * 0.18], 13, 0.9, 0.12);
    bulb(g, { pos: [0, H * 0.62, 0], color: 0xb9a8ff, intensity: 1.1, distance: Math.max(4, W) });
  }

  scene.add(g);

  // 4. Entorno exterior e iluminación
  const envId = opts.environment ? normalizeEnvironment(opts.environment) : 'studio';
  const lighting = { ...environmentLighting(envId, { night, sun: opts.sun }), practicals };
  if (lighting.bounce && FLOOR_BOUNCE[pal.floor]) lighting.bounce = { ...lighting.bounce, color: FLOOR_BOUNCE[pal.floor] };

  let env = null;
  if (envId !== 'studio') {
    const key = lighting.key;
    const sunDir = new THREE.Vector3(0.3, 0.8, 0.4);
    if (key) {
      const az = THREE.MathUtils.degToRad(key.azimuth);
      const el = THREE.MathUtils.degToRad(key.elevation);
      sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    }
    const envKey = JSON.stringify([envId, night, Math.round(W * 2), Math.round(D * 2), key?.azimuth ?? 0, key?.elevation ?? 0, key?.color ?? 0]);
    env = envCache.get(envKey);
    if (!env) {
      env = buildEnvironment(M, envId, { W, D, night, sunDir, sunColor: key?.color ?? 0xfff0dc });
      markShared(env.group);
      envCache.set(envKey, env);
    }
    env.sectors.forEach((s) => {
      s.visible = true;
    });
    scene.add(env.group);
    scene.fog = env.fog;
  } else {
    scene.add(shadowGround(-0.18, night ? 0.3 : 0.42));
  }

  const half = new THREE.Vector3(W / 2 + 0.18, H / 2 + 0.12, D / 2 + 0.18);
  const focus = new THREE.Sphere(new THREE.Vector3(0, H * 0.32, 0), half.length());
  return {
    scene,
    lighting,
    focus,
    margin: 0.86,
    fov: 30,
    view: { azimuth: 40, elevation: 27, zoom: 1 },
    dims: { W, D, H },
    layout,
    root: g,
    shell,
    itemObjects,
    env,
  };
}

/* ===================================================== API para los visores */

/** Construye la escena descrita por `spec` ({ kind: 'room' | 'custom_room' | 'product' | 'diffuser', … }). */
export function buildScene(spec) {
  if (spec.kind === 'custom_room') return buildCustomRoomScene(spec);
  if (spec.kind === 'room') {
    if (spec.customMode || Array.isArray(spec.items)) return buildCustomRoomScene(spec);
    return buildRoomScene(spec);
  }
  if (spec.kind === 'diffuser') return buildDiffuserScene(spec.design, spec);
  return buildProductScene({ kind: spec.item, params: spec.params, palette: spec.palette });
}

/** Cámara de partida de cada tipo de escena, sin tener que construirla. */
export function defaultViewFor(spec) {
  if (spec.kind === 'room' || spec.kind === 'custom_room') return { azimuth: 40, elevation: 27, zoom: 1 };
  if (spec.kind === 'diffuser') return { azimuth: 8, elevation: spec.design?.type === 'qrd2d' ? 18 : 13, zoom: 1 };
  return { zoom: 1, ...(PRODUCT_VIEW[spec.item] ?? PRODUCT_VIEW.qrd) };
}
