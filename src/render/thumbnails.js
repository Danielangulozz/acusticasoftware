import * as THREE from 'three';
import { RenderEngine, tick } from './engine.js';
import { getMaterials } from './materials.js';
import { buildItemModel, DEFAULT_PALETTE } from './scenes.js';
import { createSceneItem, getCatalogItem } from './catalog.js';
import { disposeObject } from './optimize.js';

/**
 * Miniaturas del catálogo: cada objeto se dibuja de verdad con el motor, con fondo transparente,
 * en un lienzo aparte. Se generan bajo pedido (cuando la tarjeta aparece en pantalla), de a una,
 * y quedan en memoria durante la sesión.
 */

const STUDIO = {
  sky: { intensity: 2.2, zenith: 0xf2f4ff, horizon: 0xfff6ea, occlusion: 0.9 },
  key: { azimuth: -32, elevation: 48, intensity: 2.4, color: 0xfff4e6, soft: 7 },
  bounce: { color: 0xffffff, intensity: 0.6 },
  env: 0.45,
  exposure: 0.98,
};

const cache = new Map();
const pending = new Map();
const queue = [];
let engine = null;
let running = false;

const paletteKey = (pal) => `${pal.primary}|${pal.secondary}|${pal.neutral}|${pal.accent}|${pal.dark}|${pal.wood}`;

function getEngine() {
  if (!engine) engine = new RenderEngine(document.createElement('canvas'), { msaa: 0 });
  return engine;
}

async function draw({ typeId, pal, width, height, overrides }) {
  const e = getEngine();
  const def = getCatalogItem(typeId);
  const M = getMaterials();
  const model = buildItemModel(M, createSceneItem(typeId, overrides), { pal });
  const scene = new THREE.Scene();
  scene.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22, color: 0x1a1530 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = def.mount === 'floor' || def.mount === 'corner' ? box.min.y : box.min.y - 0.02;
  ground.receiveShadow = true;
  if (def.mount === 'floor' || def.mount === 'corner') scene.add(ground);

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const wall = def.mount === 'wall';
  const ceiling = def.mount === 'ceiling';
  const az = THREE.MathUtils.degToRad(wall ? 18 : 34);
  const el = THREE.MathUtils.degToRad(wall ? 10 : ceiling ? -14 : 22);
  const fov = 28;
  const aspect = width / height;
  const half = THREE.MathUtils.degToRad(fov / 2);
  const fit = Math.min(half, Math.atan(Math.tan(half) * aspect));
  const dist = (sphere.radius / Math.sin(fit)) * 0.98;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 100);
  camera.position.set(sphere.center.x + dist * Math.cos(el) * Math.sin(az), sphere.center.y + dist * Math.sin(el), sphere.center.z + dist * Math.cos(el) * Math.cos(az));
  camera.lookAt(sphere.center);
  camera.updateMatrixWorld();

  e.setSize(width, height, 512);
  e.load({ scene, lighting: STUDIO });
  e.setCamera(camera);
  e.step(10);
  e.present(null);
  const blob = await e.toBlob('image/png');
  e.unload();
  disposeObject(model);
  ground.geometry.dispose();
  return blob ? URL.createObjectURL(blob) : null;
}

async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      // eslint-disable-next-line no-await-in-loop
      const url = await draw(job);
      cache.set(job.key, url);
      job.resolve(url);
    } catch (err) {
      job.resolve(null);
    }
    pending.delete(job.key);
    // eslint-disable-next-line no-await-in-loop
    await tick();
  }
  running = false;
}

/** URL de la miniatura (PNG transparente) de un objeto del catálogo. */
export function requestThumbnail(typeId, { palette = DEFAULT_PALETTE, width = 200, height = 150, overrides = {} } = {}) {
  const pal = { ...DEFAULT_PALETTE, ...palette };
  const key = `${typeId}|${paletteKey(pal)}|${width}x${height}|${JSON.stringify(overrides)}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (pending.has(key)) return pending.get(key);
  const promise = new Promise((resolve) => {
    queue.push({ key, typeId, pal, width, height, overrides, resolve });
  });
  pending.set(key, promise);
  pump();
  return promise;
}

/** Miniatura ya generada (sin esperar), o undefined. */
export function cachedThumbnail(typeId, { palette = DEFAULT_PALETTE, width = 200, height = 150, overrides = {} } = {}) {
  const pal = { ...DEFAULT_PALETTE, ...palette };
  return cache.get(`${typeId}|${paletteKey(pal)}|${width}x${height}|${JSON.stringify(overrides)}`);
}
