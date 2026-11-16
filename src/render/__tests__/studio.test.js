import { describe, it, expect } from 'vitest';
import { createSceneItem } from '../catalog.js';
import { parseStudioFile, serializeStudio, STUDIO_FILE_KIND } from '../studioFile.js';
import { CameraRig, constrainToRoom, pathPresets, pointInOutline, samplePath } from '../cameraRig.js';
import { muxMp4 } from '../videoExport.js';
import { getPolygonLayout } from '../kit.js';

const room = { vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 4 }], height: 2.8, curvatures: {} };
const layout = getPolygonLayout(room);
const focus = { center: { x: 0, y: 0.9, z: 0 }, radius: 4.5 };

describe('archivo de proyecto del estudio', () => {
  it('guarda y vuelve a abrir la sala con sus objetos y vistas', () => {
    const items = [createSceneItem('bed_double', { x: 1, z: -0.5, rotation: 90, dims: { w: 1.8 } }), createSceneItem('hifi_stack', { y: 0.5, dims: { finish: 'nogal' } })];
    items[1].enabled = false;
    const opts = { dims: { W: 6, D: 4, H: 2.8 }, roomType: 'studio', palette: { name: 'POZOLE', primary: '#7464cc' }, environment: 'city', night: true, shots: [{ id: 'v1', name: 'Vista 1', pose: { pos: [1, 1.6, 1], target: [0, 1.4, 0], fov: 62 } }] };
    const text = JSON.stringify(serializeStudio({ opts, items, polygon: room }));
    const parsed = parseStudioFile(text);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0].dims.w).toBe(1.8);
    expect(parsed.items[0].rotation).toBe(90);
    expect(parsed.items[1].dims.finish).toBe('nogal');
    expect(parsed.items[1].enabled).toBe(false);
    expect(parsed.polygon.vertices).toHaveLength(4);
    expect(parsed.settings.environment).toBe('city');
    expect(parsed.shots[0].pose.fov).toBe(62);
  });

  it('rechaza archivos ajenos y descarta objetos desconocidos', () => {
    expect(() => parseStudioFile('{ no es json')).toThrow(/JSON/);
    expect(() => parseStudioFile(JSON.stringify({ kind: 'otra-cosa' }))).toThrow(/no es un proyecto/);
    const parsed = parseStudioFile(JSON.stringify({ kind: STUDIO_FILE_KIND, items: [{ typeId: 'sofa' }, { typeId: 'nave_espacial' }, null] }));
    expect(parsed.items).toHaveLength(1);
    expect(parsed.skipped).toBe(2);
  });
});

describe('cámara del estudio', () => {
  it('sabe si un punto está dentro de la sala y no deja atravesar muros', () => {
    expect(pointInOutline(0, 0, layout.outlinePoints)).toBe(true);
    expect(pointInOutline(5, 0, layout.outlinePoints)).toBe(false);
    const p = constrainToRoom(2.99, 0, layout, 0.3);
    expect(p.x).toBeLessThanOrEqual(2.7 + 1e-6);
  });

  it('cambia de modo viajando sin saltos y camina dentro de la sala', () => {
    const rig = new CameraRig();
    rig.setScene({ layout, focus }, 16 / 9);
    const start = rig.getPose();
    rig.setMode('walk');
    rig.update(0.1);
    const mid = rig.getPose();
    expect(mid.pos).not.toEqual(start.pos);
    for (let i = 0; i < 30; i++) rig.update(0.1);
    expect(rig.isInside()).toBe(true);
    const keys = new Set(['KeyW']);
    for (let i = 0; i < 80; i++) rig.update(0.05, keys);
    expect(rig.isInside()).toBe(true);
  });

  it('los recorridos son continuos y pasan por sus tomas', () => {
    const presets = pathPresets({ layout, focus });
    ['orbit', 'walk', 'reveal', 'drone'].forEach((id) => expect(presets[id].keys.length).toBeGreaterThan(2));
    const path = presets.reveal;
    const a = samplePath(path, 0);
    expect(a.pos[0]).toBeCloseTo(path.keys[0].pos[0], 5);
    let prev = a;
    for (let u = 0.01; u <= 1; u += 0.01) {
      const p = samplePath(path, u);
      expect(Math.hypot(p.pos[0] - prev.pos[0], p.pos[1] - prev.pos[1], p.pos[2] - prev.pos[2])).toBeLessThan(1.2);
      prev = p;
    }
  });
});

describe('video MP4', () => {
  it('arma un contenedor con su índice apuntando a los datos', () => {
    const samples = [0, 1, 2].map((i) => ({ data: new Uint8Array([0, 0, 0, 2, 0x65 + i, 0x88]), key: i === 0, timestamp: (i * 1e6) / 30 }));
    const blob = muxMp4({ samples, avcC: new Uint8Array([1, 100, 0, 40, 255, 225, 0, 0, 1, 0, 0]), width: 640, height: 360, fps: 30 });
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBeGreaterThan(400);
  });
});
