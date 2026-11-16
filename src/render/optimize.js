import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Optimización de escenas del motor de renders.
 *
 *   mergeStatic(obj)   funde todas las mallas de un objeto que comparten material en una sola
 *                      malla. Un mueble pasa de decenas de llamadas de dibujo a tres o cuatro,
 *                      y eso se nota tres veces: en la imagen y en cada mapa de sombras.
 *   createLRU(n)       caché pequeña con expulsión del menos usado (para prototipos de objetos).
 *
 * Las geometrías fundidas quedan marcadas con `userData.shared = true`: el motor no las libera
 * al cambiar de escena porque pertenecen a la caché.
 */

const KEEP_ATTRIBUTES = ['position', 'normal', 'uv'];
const _m = new THREE.Matrix4();

function bakedGeometry(mesh, toRoot) {
  const src = mesh.geometry;
  const geo = src.index ? src.toNonIndexed() : src.clone();
  Object.keys(geo.attributes).forEach((name) => {
    if (!KEEP_ATTRIBUTES.includes(name)) geo.deleteAttribute(name);
  });
  geo.morphAttributes = {};
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  }
  _m.multiplyMatrices(toRoot, mesh.matrixWorld);
  geo.applyMatrix4(_m);
  // Una escala negativa (pieza reflejada) invierte el sentido de los triángulos
  if (_m.determinant() < 0) {
    for (const name of KEEP_ATTRIBUTES) {
      const attr = geo.attributes[name];
      const size = attr.itemSize;
      const a = attr.array;
      for (let i = 0; i + 2 < attr.count; i += 3) {
        for (let k = 0; k < size; k++) {
          const p = (i + 1) * size + k;
          const q = (i + 2) * size + k;
          const tmp = a[p];
          a[p] = a[q];
          a[q] = tmp;
        }
      }
    }
  }
  geo.clearGroups();
  return geo;
}

/**
 * Devuelve un grupo nuevo, equivalente a `root`, con una malla por material.
 * Lo que no se puede fundir (mallas instanciadas, luces) se conserva tal cual.
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const kept = [];

  const visit = (o) => {
    if (o !== root && o.visible === false) return;
    if (o !== root && (o.isInstancedMesh || o.isLight || (o.isMesh && Array.isArray(o.material)) || o.isLine || o.isPoints)) {
      kept.push(o);
      return;
    }
    if (o.isMesh && o.geometry?.attributes?.position) {
      const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${o.renderOrder}|${o.layers.mask}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material: o.material, castShadow: o.castShadow, receiveShadow: o.receiveShadow, renderOrder: o.renderOrder, layers: o.layers.mask, geos: [] };
        buckets.set(key, bucket);
      }
      bucket.geos.push(bakedGeometry(o, toRoot));
    }
    o.children.forEach(visit);
  };
  visit(root);

  const out = new THREE.Group();
  out.name = root.name;
  out.userData = { ...root.userData };
  buckets.forEach((b) => {
    const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (b.geos.length > 1) b.geos.forEach((g) => g.dispose());
    if (!merged) return;
    merged.userData.shared = true;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.castShadow;
    mesh.receiveShadow = b.receiveShadow;
    mesh.renderOrder = b.renderOrder;
    mesh.layers.mask = b.layers;
    out.add(mesh);
  });
  kept.forEach((o) => {
    _m.multiplyMatrices(toRoot, o.matrixWorld);
    const copy = o.clone(true);
    _m.decompose(copy.position, copy.quaternion, copy.scale);
    copy.traverse((c) => {
      if (c.geometry) c.geometry.userData.shared = true;
    });
    out.add(copy);
  });
  // Las geometrías originales ya no hacen falta
  root.traverse((o) => {
    if (o.isMesh && !kept.includes(o) && !o.geometry.userData.shared) o.geometry.dispose();
  });
  return out;
}

/** Libera las geometrías (compartidas o no) de un objeto que sale de una caché. */
export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}

/** Caché LRU mínima: get/set y un `onEvict` para liberar lo que sale. */
export function createLRU(limit = 120, onEvict = null) {
  const map = new Map();
  return {
    get(key) {
      if (!map.has(key)) return undefined;
      const value = map.get(key);
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      while (map.size > limit) {
        const oldest = map.keys().next().value;
        const gone = map.get(oldest);
        map.delete(oldest);
        if (onEvict) onEvict(gone, oldest);
      }
      return value;
    },
    has: (key) => map.has(key),
    clear() {
      if (onEvict) map.forEach((v, k) => onEvict(v, k));
      map.clear();
    },
    get size() {
      return map.size;
    },
  };
}
