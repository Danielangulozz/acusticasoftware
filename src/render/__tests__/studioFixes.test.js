import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { calculateItemAbsorption, createSceneItem } from '../catalog.js';
import { CameraRig } from '../cameraRig.js';
import * as K from '../kit.js';
const { getPolygonLayout } = K;
import { getMaterials } from '../materials.js';
import { buildItemModel, buildScene, DEFAULT_PALETTE } from '../scenes.js';
import { parseStudioFile, serializeStudio } from '../studioFile.js';
import { DOOR_STYLES, DOOR_TYPE_IDS, THROUGH_WALL_TYPES } from '../openings.js';
import { CEILING_FINISHES } from '../kitBuilding.js';

const M = getMaterials();
const room = { vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 4 }], height: 2.8, curvatures: {} };
const layout = getPolygonLayout(room);
const focus = { center: { x: 0, y: 0.9, z: 0 }, radius: 4.5 };

const colorsOf = (obj) => {
  const out = new Set();
  obj.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => m.color && out.add(m.color.getHex()));
  });
  return out;
};

describe('vistas guardadas', () => {
  it('respetan el modo con el que se guardaron, aunque la cámara quede pegada a un muro', () => {
    const rig = new CameraRig();
    rig.setScene({ layout, focus }, 16 / 9);
    // Casi sobre el muro del fondo: antes se decidía «afuera» y pasaba a Maqueta
    rig.adoptPose({ pos: [0, 1.6, -layout.D / 2 - 0.02], target: [0, 1.5, 1], fov: 60, mode: 'walk' }, { animate: false });
    expect(rig.mode).toBe('walk');
    expect(rig.isInside()).toBe(true);
    rig.adoptPose({ pos: [8, 6, 8], target: [0, 1, 0], fov: 40, mode: 'orbit' }, { animate: false });
    expect(rig.mode).toBe('orbit');
    expect(rig.getPose().mode).toBe('orbit');
  });

  it('el archivo de proyecto conserva el modo de cada vista y el nombre del proyecto', () => {
    const opts = { dims: { W: 6, D: 4, H: 2.8 }, projectName: 'Sala 5E', shots: [{ id: 'v', name: 'Hacia el ventanal', pose: { pos: [1, 1.6, 1], target: [0, 1.4, 0], fov: 55, mode: 'walk' } }] };
    const parsed = parseStudioFile(JSON.stringify(serializeStudio({ opts, items: [], polygon: room })));
    expect(parsed.shots[0].pose.mode).toBe('walk');
    expect(parsed.settings.projectName).toBe('Sala 5E');
  });
});

describe('caminar con toques cortos', () => {
  it('un toque de W avanza medio metro y uno de Q gira 15°', () => {
    const rig = new CameraRig();
    rig.setScene({ layout, focus }, 16 / 9);
    rig.setMode('walk', { animate: false });
    const w0 = { ...rig.walk };
    rig.tapWalk('KeyW');
    for (let i = 0; i < 10; i++) rig.update(0.05);
    expect(Math.hypot(rig.walk.x - w0.x, rig.walk.z - w0.z)).toBeCloseTo(0.5, 1);
    const yaw = rig.walk.yaw;
    rig.tapWalk('KeyQ');
    expect(rig.walk.yaw - yaw).toBeCloseTo(Math.PI / 12, 5);
  });
});

describe('puertas', () => {
  it('el color elegido pinta la hoja en vez de dejarla de madera', () => {
    const wood = buildItemModel(M, createSceneItem('arch_door', { colorRole: 'wood' }), { pal: DEFAULT_PALETTE });
    const grey = buildItemModel(M, createSceneItem('arch_door', { colorRole: 'custom', customColor: '#808080' }), { pal: DEFAULT_PALETTE });
    expect(colorsOf(grey).has(0x808080)).toBe(true);
    expect(colorsOf(wood).has(0x808080)).toBe(false);
  });

  it('todos los estilos se construyen y abren vano en el muro', () => {
    DOOR_STYLES.forEach(([style]) => {
      const model = buildItemModel(M, createSceneItem('arch_door', { dims: { doorStyle: style } }), { pal: DEFAULT_PALETTE });
      const box = new THREE.Box3().setFromObject(model);
      expect(box.isEmpty()).toBe(false);
    });
    ['door_metal', 'door_glass', 'door_sliding', 'door_technical'].forEach((id) => {
      expect(DOOR_TYPE_IDS.has(id)).toBe(true);
      expect(THROUGH_WALL_TYPES.has(id)).toBe(true);
    });
  });
});

describe('objetos nuevos', () => {
  it('arquitectura e instalaciones se arman dentro de la sala', () => {
    const items = ['column', 'column_round', 'beam', 'wall_lintel', 'ceiling_soffit', 'ceiling_zone', 'ac_grille', 'ceiling_speaker', 'door_glass'].map((id) => createSceneItem(id));
    const built = buildScene({ kind: 'custom_room', usePolygon: true, polygon: room, items });
    expect(built.itemObjects?.size ?? built.root.children.length).toBeGreaterThan(0);
    items.forEach((it) => {
      const model = buildItemModel(M, it, { pal: DEFAULT_PALETTE });
      expect(new THREE.Box3().setFromObject(model).isEmpty()).toBe(false);
    });
  });

  it('la zona de techo absorbe según su acabado y su área', () => {
    const grid = createSceneItem('ceiling_zone', { dims: { w: 2, d: 2 } });
    const plaster = createSceneItem('ceiling_zone', { dims: { w: 2, d: 2, ceilingFinish: 'plaster' }, coefficients: CEILING_FINISHES.find((f) => f[0] === 'plaster')[2] });
    expect(calculateItemAbsorption(grid).byBand[500]).toBeCloseTo(4 * 0.7, 5);
    expect(calculateItemAbsorption(plaster).byBand[500]).toBeLessThan(calculateItemAbsorption(grid).byBand[500]);
  });

  it('la cortina abierta deja libre el centro y la cerrada lo cubre', () => {
    // Se mide sobre el modelo sin fundir (cada pliegue es una malla propia)
    const foldsAtCenter = (open) => {
      let n = 0;
      K.drapedCurtain(M, { w: 2.8, h: 2.4, open }).traverse((o) => {
        if (!o.isMesh) return;
        const b = new THREE.Box3().setFromObject(o);
        if (b.max.y - b.min.y > 1 && b.min.x < 0.2 && b.max.x > -0.2) n++;
      });
      return n;
    };
    expect(foldsAtCenter(0)).toBeGreaterThan(0);
    expect(foldsAtCenter(1)).toBe(0);
  });
});
