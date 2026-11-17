import { describe, it, expect } from 'vitest';
import { DOOR_TYPE_IDS } from '../openings.js';
import * as THREE from 'three';
import { ALL_CATALOG_ITEMS, createSceneItem, getSupportSurfaceLevels, calculateItemAbsorption } from '../catalog.js';
import { CATALOG_GROUPS, EXTRA_FURNITURE, catalogGroupOf } from '../catalogExtra.js';
import { EXTRA_TYPE_IDS } from '../kitExtra.js';
import { AUDIO_FINISHES } from '../kitAudio.js';
import { getMaterials } from '../materials.js';
import { buildItemModel, buildScene, DEFAULT_PALETTE } from '../scenes.js';

const M = getMaterials();

function measure(obj) {
  let meshes = 0;
  let finite = true;
  obj.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const arr = o.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) finite = false;
  });
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  return { meshes, finite, size };
}

describe('catálogo ampliado', () => {
  it('cada objeto nuevo tiene un modelo propio', () => {
    // Las puertas nuevas reutilizan el constructor de puertas del kit base (con su estilo)
    Object.keys(EXTRA_FURNITURE)
      .filter((id) => !DOOR_TYPE_IDS.has(id))
      .forEach((id) => expect(EXTRA_TYPE_IDS, id).toContain(id));
  });

  it('todos los objetos del catálogo se modelan con medidas razonables', () => {
    Object.keys(ALL_CATALOG_ITEMS).forEach((id) => {
      const model = buildItemModel(M, createSceneItem(id), { pal: DEFAULT_PALETTE });
      const { meshes, finite, size } = measure(model);
      expect(meshes, id).toBeGreaterThan(0);
      expect(finite, id).toBe(true);
      expect(Math.max(size.x, size.y, size.z), id).toBeGreaterThan(0.02);
      expect(Math.max(size.x, size.y, size.z), id).toBeLessThan(9);
    });
  });

  it('los equipos de sonido cambian con cada serie de acabado', () => {
    Object.keys(AUDIO_FINISHES).forEach((finish) => {
      const model = buildItemModel(M, createSceneItem('hifi_stack', { dims: { finish } }));
      expect(measure(model).meshes).toBeGreaterThan(3);
    });
  });

  it('cada objeto cae en una categoría del catálogo y aporta absorción', () => {
    const ids = new Set(CATALOG_GROUPS.map((g) => g.id));
    Object.values(ALL_CATALOG_ITEMS).forEach((def) => {
      expect(ids.has(catalogGroupOf(def)), def.id).toBe(true);
      const { byBand } = calculateItemAbsorption(createSceneItem(def.id));
      expect(byBand[500], def.id).toBeGreaterThanOrEqual(0);
    });
  });

  it('las mesas nuevas sirven de apoyo', () => {
    expect(getSupportSurfaceLevels(createSceneItem('dining_table'))[0].y).toBeCloseTo(0.75, 2);
    expect(getSupportSurfaceLevels(createSceneItem('kitchen_counter'))[0].y).toBeCloseTo(0.9, 2);
  });

  it('una sala con entorno exterior incluye cielo, terreno y muros que se pueden ocultar', () => {
    const items = ['bed_double', 'grand_piano', 'fridge', 'arch_door'].map((id) => createSceneItem(id));
    const built = buildScene({ kind: 'custom_room', W: 6, D: 5, H: 2.8, items, environment: 'garden', palette: DEFAULT_PALETTE });
    expect(built.env.sectors.length).toBeGreaterThan(0);
    expect(built.scene.getObjectByName('sky')).toBeDefined();
    expect(built.shell.userData.wallParts).toHaveLength(4);
    expect(built.itemObjects.size).toBe(4);
    // Mover un objeto reutiliza el modelo guardado
    const again = buildScene({ kind: 'custom_room', W: 6, D: 5, H: 2.8, items: items.map((it) => ({ ...it, x: 1 })), environment: 'garden', palette: DEFAULT_PALETTE });
    expect(again.shell).toBe(built.shell);
  });
});
