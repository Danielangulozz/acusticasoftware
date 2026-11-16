import * as THREE from 'three';
import { rng } from './materials.js';
import { mergeStatic } from './optimize.js';

/**
 * Entorno exterior en 3D para las salas del Estudio de renders.
 *
 * Antes el «exterior» era una imagen plana pegada detrás del render: no giraba con la cámara ni
 * se veía por las ventanas. Ahora es geometría real: cielo (cúpula con degradado, sol, nubes y
 * estrellas), terreno que se pierde en la bruma, una plataforma alrededor de la casa y, según el
 * entorno, árboles, arbustos y colinas o una ciudad de fondo con las ventanas encendidas de noche.
 *
 *   environmentLighting(kind, { night, sun })   luz que corresponde a ese entorno
 *   buildEnvironment(M, kind, { W, D, night })   → { group, fog, sectors }
 *
 * Nada de esto proyecta sombra (queda fuera de los mapas de sombra), así que no encarece las
 * pasadas; los árboles llevan una mancha de contacto dibujada debajo.
 */

export const ENVIRONMENTS = {
  garden: { label: 'Jardín', hint: 'Césped, árboles y colinas' },
  city: { label: 'Ciudad', hint: 'Plaza con edificios al fondo' },
  sunset: { label: 'Atardecer', hint: 'Sol bajo y luz cálida' },
  studio: { label: 'Estudio', hint: 'Fondo liso, como foto de producto' },
};

/** Los identificadores antiguos de fondo siguen funcionando. */
export function normalizeEnvironment(id) {
  if (id === 'landscape') return 'garden';
  if (ENVIRONMENTS[id]) return id;
  return 'studio';
}

const SKY = {
  garden: { zenith: 0x2f6fd0, horizon: 0xbcd6ee, cloud: 0xffffff, clouds: 0.85, sun: 1 },
  city: { zenith: 0x3a74c8, horizon: 0xc6d6e6, cloud: 0xf6f7fb, clouds: 0.6, sun: 1 },
  sunset: { zenith: 0x35488f, horizon: 0xf2a56c, cloud: 0xffc79a, clouds: 0.9, sun: 1.2 },
  night: { zenith: 0x040714, horizon: 0x18213f, cloud: 0x232c4a, clouds: 0.35, sun: 0.35 },
};

const DAY_LIGHT = {
  sky: { intensity: 2.0, zenith: 0xdde8ff, horizon: 0xfff2e0, occlusion: 0.93 },
  key: { azimuth: 104, elevation: 46, intensity: 3.3, color: 0xfff0dc, soft: 3.2 },
  bounce: { color: 0xfff1e2, intensity: 1.35 },
  env: 0.22,
  exposure: 0.9,
  saturation: 1.06,
};

const LIGHT = {
  garden: DAY_LIGHT,
  studio: DAY_LIGHT,
  city: {
    ...DAY_LIGHT,
    sky: { intensity: 2.0, zenith: 0xd8e4ff, horizon: 0xf4f1ea, occlusion: 0.93 },
    key: { azimuth: 128, elevation: 44, intensity: 3.2, color: 0xfff4e6, soft: 3.2 },
  },
  sunset: {
    sky: { intensity: 1.5, zenith: 0x9aa6ee, horizon: 0xffc6a0, occlusion: 0.93 },
    key: { azimuth: 96, elevation: 15, intensity: 3.1, color: 0xffa868, soft: 2.4 },
    bounce: { color: 0xffd2ae, intensity: 1.0 },
    env: 0.2,
    exposure: 1.0,
    saturation: 1.1,
  },
  night: {
    sky: { intensity: 0.3, zenith: 0x8a9cff, horizon: 0x5b4fb0, minElevation: 0.25, occlusion: 0.9 },
    bounce: { color: 0x8f86d8, intensity: 0.16 },
    env: 0.05,
    exposure: 1.05,
    bloom: 0.55,
    bloomThreshold: 1.1,
    saturation: 1.08,
  },
};

/** Iluminación de un entorno. `sun` ({ azimuth, elevation }) permite mover el sol a mano. */
export function environmentLighting(kind = 'studio', { night = false, sun = null } = {}) {
  const base = night ? LIGHT.night : LIGHT[normalizeEnvironment(kind)] ?? DAY_LIGHT;
  const lighting = { ...base, sky: { ...base.sky } };
  if (base.key) {
    lighting.key = { ...base.key };
    if (sun && Number.isFinite(Number(sun.azimuth))) lighting.key.azimuth = Number(sun.azimuth);
    if (sun && Number.isFinite(Number(sun.elevation))) {
      const el = Math.min(85, Math.max(6, Number(sun.elevation)));
      lighting.key.elevation = el;
      // Sol bajo: menos intenso y más cálido, como al final de la tarde
      if (el < 22 && kind !== 'sunset') lighting.key.intensity = base.key.intensity * (0.72 + 0.28 * (el / 22));
    }
  }
  // Luz indirecta medida en la propia escena (dos rebotes): reemplaza casi todo el relleno artificial
  lighting.gi = { intensity: night ? 1.25 : 1.0, bounces: 2 };
  if (lighting.bounce) lighting.bounce = { ...lighting.bounce, intensity: lighting.bounce.intensity * 0.3 };
  lighting.vignette = 0.14;
  return lighting;
}

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // Solo la rotación de la cámara: la cúpula queda siempre centrada en quien mira
    vec4 p = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0);
    gl_Position = p.xyww;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uCloud;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSun;
  uniform float uClouds;
  uniform float uStars;
  varying vec3 vDir;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(17.3, 9.1);
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec3 d = normalize(vDir);
    float up = clamp(d.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(up, 0.5));
    float sd = max(dot(d, uSunDir), 0.0);
    // resplandor ancho alrededor del sol
    col += uSunColor * (pow(sd, 10.0) * 0.22 + pow(sd, 90.0) * 0.5) * uSun;
    if (uClouds > 0.0 && d.y > 0.0) {
      vec2 p = d.xz / (d.y + 0.2) * 1.1;
      float n = fbm(p + vec2(3.7, 1.9));
      float cover = smoothstep(0.5, 0.8, n) * smoothstep(0.03, 0.26, d.y) * uClouds;
      vec3 lit = uCloud * (0.86 + 0.3 * pow(sd, 4.0));
      col = mix(col, lit, cover * 0.88);
    }
    col += uSunColor * smoothstep(0.99925, 0.99975, sd) * 7.0 * uSun;
    if (uStars > 0.0 && d.y > 0.0) {
      vec2 sp = d.xz / (d.y + 0.4) * 190.0;
      float s = hash(floor(sp));
      col += vec3(0.8, 0.86, 1.0) * smoothstep(0.9972, 1.0, s) * uStars * smoothstep(0.0, 0.25, d.y);
    }
    col = mix(uGround, col, smoothstep(-0.05, 0.015, d.y));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function skyDome(sky, sunDir, sunColor, ground, night) {
  const material = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(sky.zenith) },
      uHorizon: { value: new THREE.Color(sky.horizon) },
      uGround: { value: new THREE.Color(ground) },
      uCloud: { value: new THREE.Color(sky.cloud) },
      uSunDir: { value: sunDir.clone().normalize() },
      uSunColor: { value: new THREE.Color(sunColor) },
      uSun: { value: sky.sun },
      uClouds: { value: sky.clouds },
      uStars: { value: night ? 1 : 0 },
    },
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 20), material);
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.castShadow = false;
  dome.receiveShadow = false;
  dome.name = 'sky';
  return dome;
}

const still = (mesh, receive = false) => {
  mesh.castShadow = false;
  mesh.receiveShadow = receive;
  return mesh;
};

/** Terreno grande con variación de tono por vértice para que no se note la repetición de la textura. */
function ground(material, r, { size = 560, tile = 5, y = -0.18, vary = 0.24 } = {}) {
  const seg = 44;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
    const v = 1 - vary / 2 + r() * vary;
    colors[i * 3] = v;
    colors[i * 3 + 1] = v * (0.98 + r() * 0.05);
    colors[i * 3 + 2] = v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = still(new THREE.Mesh(geo, material), true);
  mesh.position.y = y;
  mesh.name = 'ground';
  return mesh;
}

function blob(M, size, opacity = 0.34) {
  const mesh = still(new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.blobShadow(opacity)));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  mesh.renderOrder = 2;
  return mesh;
}

const GREENS = [0x587f4c, 0x638a55, 0x4d7445, 0x6f9558];

function tree(M, r, { h = 3.6, pine = false } = {}) {
  const g = new THREE.Group();
  const trunkH = h * (pine ? 0.26 : 0.42);
  const trunk = still(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, trunkH, 7), M.plastic(0x6f4e33, { roughness: 0.95 })));
  trunk.position.y = trunkH / 2;
  g.add(trunk);
  if (pine) {
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const rad = h * (0.26 - i * 0.06);
      const ch = h * 0.36;
      const cone = still(new THREE.Mesh(new THREE.ConeGeometry(rad, ch, 8), M.foliage(i % 2 ? 0x3f7a4c : 0x34693f)));
      cone.position.y = trunkH + ch / 2 + i * h * 0.2;
      g.add(cone);
    }
  } else {
    const blobs = 3 + Math.floor(r() * 2);
    for (let i = 0; i < blobs; i++) {
      const rad = h * (0.2 + r() * 0.1);
      const m = still(new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 2), M.foliage(GREENS[Math.floor(r() * GREENS.length)])));
      m.position.set((r() - 0.5) * h * 0.24, trunkH + rad * 0.55 + i * h * 0.12, (r() - 0.5) * h * 0.24);
      m.scale.y = 0.85 + r() * 0.25;
      g.add(m);
    }
  }
  g.add(blob(M, h * 1.05));
  return g;
}

function bush(M, r, { s = 0.55 } = {}) {
  const g = new THREE.Group();
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const rad = s * (0.6 + r() * 0.4);
    const m = still(new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 2), M.foliage(GREENS[Math.floor(r() * GREENS.length)])));
    m.position.set((r() - 0.5) * s * 1.3, rad * 0.62, (r() - 0.5) * s * 1.3);
    m.scale.y = 0.72;
    g.add(m);
  }
  g.add(blob(M, s * 3.1, 0.28));
  return g;
}

/** Edificio lejano: caja con la retícula de ventanas repetida según su tamaño real. */
function tower(M, { w, d, h, variant, tint, night }) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  for (let face = 0; face < 6; face++) {
    const span = face < 2 ? d : w;
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      if (face === 2 || face === 3) uv.setXY(i, 0.01, 0.01);
      else uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(span / 10)), uv.getY(i) * Math.max(1, Math.round(h / 24)));
    }
  }
  const mesh = still(new THREE.Mesh(geo, M.facade(variant, { tint, night })));
  mesh.position.y = h / 2;
  return mesh;
}

const SECTORS = 8;
const sectorOf = (x, z) => ((Math.round((Math.atan2(x, z) / (Math.PI * 2)) * SECTORS) % SECTORS) + SECTORS) % SECTORS;

/**
 * Construye el entorno. `sectors` son los grupos de vegetación cercana por rumbo: el visor
 * oculta los que quedan entre la cámara y la sala para que nunca tapen la vista.
 */
export function buildEnvironment(M, kind = 'garden', { W = 5.4, D = 4.4, night = false, sunDir = new THREE.Vector3(0.5, 0.7, 0.5), sunColor = 0xfff0dc } = {}) {
  const id = normalizeEnvironment(kind);
  if (id === 'studio') return null;
  const r = rng(id === 'city' ? 907 : 311);
  const sky = night ? SKY.night : SKY[id];
  const haze = night ? 0x10162c : id === 'sunset' ? 0xd9a98a : id === 'city' ? 0xbfcbd9 : 0xb7cfe2;

  const group = new THREE.Group();
  group.name = 'environment';
  group.add(skyDome(sky, sunDir, night ? 0xcdd6ff : sunColor, haze, night));

  const isCity = id === 'city';
  group.add(ground(isCity ? M.pavement(0xd7d9de) : M.grass(id === 'sunset' ? 0xb9a686 : 0x97a386), r, { tile: isCity ? 4 : 5 }));

  // Plataforma sobre la que se asienta la casa
  const half = Math.max(W, D) / 2;
  const apron = still(new THREE.Mesh(new THREE.BoxGeometry(W + 3.4, 0.05, D + 3.4), M.concrete(isCity ? 0xc9ccd2 : 0xd9d5cc)), true);
  apron.position.y = -0.155;
  apron.name = 'apron';
  group.add(apron);

  const buckets = Array.from({ length: SECTORS }, () => new THREE.Group());
  const put = (obj, x, z, ry = 0) => {
    obj.position.set(x, -0.18, z);
    obj.rotation.y = ry;
    buckets[sectorOf(x, z)].add(obj);
  };

  // Vegetación cercana: arbustos junto a la plataforma y árboles en un anillo que no tapa la sala
  const bushes = isCity ? 6 : 11;
  for (let i = 0; i < bushes; i++) {
    const a = r() * Math.PI * 2;
    const rad = half + 2.6 + r() * 4.2;
    put(bush(M, r, { s: 0.3 + r() * 0.24 }), Math.sin(a) * rad, Math.cos(a) * rad, r() * 6);
  }
  const trees = isCity ? 10 : 26;
  for (let i = 0; i < trees; i++) {
    const a = (i / trees) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const rad = half + 9 + r() * (isCity ? 8 : 22);
    put(tree(M, r, { h: 2.9 + r() * 1.5, pine: !isCity && r() > 0.72 }), Math.sin(a) * rad, Math.cos(a) * rad, r() * 6);
  }
  const sectors = buckets.map((bucket, k) => {
    const merged = mergeStatic(bucket);
    merged.name = `env_sector_${k}`;
    merged.userData.azimuth = (k / SECTORS) * Math.PI * 2;
    merged.traverse((o) => {
      if (o.isMesh) still(o);
    });
    group.add(merged);
    return merged;
  });

  // Fondo lejano
  const far = new THREE.Group();
  if (isCity) {
    const tints = [0xffffff, 0xe9dccb, 0xcfd8e4, 0xd9d2c6];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + (r() - 0.5) * 0.09;
      const rad = 38 + r() * 92;
      const w = 11 + r() * 13;
      const d = 11 + r() * 13;
      const h = 10 + r() * r() * 46;
      const b = tower(M, { w, d, h, variant: i % 3, tint: tints[i % tints.length], night });
      b.position.x = Math.sin(a) * rad;
      b.position.z = Math.cos(a) * rad;
      b.position.y += -0.18;
      b.rotation.y = a + (r() - 0.5) * 0.5;
      far.add(b);
    }
  } else {
    const hillColors = [0x7fa06a, 0x86a878, 0x8fb09a, 0x76996a];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.4;
      const rad = 120 + r() * 60;
      const size = 55 + r() * 45;
      const hill = still(new THREE.Mesh(new THREE.SphereGeometry(size, 18, 10), M.paint(hillColors[i % hillColors.length], { roughness: 1 })));
      hill.scale.y = 0.16 + r() * 0.14;
      hill.position.set(Math.sin(a) * rad, -3, Math.cos(a) * rad);
      far.add(hill);
    }
  }
  const farMerged = mergeStatic(far);
  farMerged.name = 'env_far';
  farMerged.traverse((o) => {
    if (o.isMesh) still(o);
  });
  group.add(farMerged);

  return { group, sectors, fog: new THREE.Fog(haze, isCity ? 34 : 30, isCity ? 190 : 215) };
}
