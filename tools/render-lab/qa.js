/**
 * Revisión visual rápida del motor (solo desarrollo).
 *
 * Desde la consola del navegador, con `vite dev` en marcha:
 *   const { qa } = await import('/tools/render-lab/qa.js');
 *   await qa('prueba', { preset: 'studio', environment: 'garden', views: ['doll', 'in', 'out'] });
 *
 * Dibuja la sala de ejemplo desde varias cámaras y guarda cada imagen en
 * node_modules/.cache/pozole-qa/ con el nombre `<tag>-<vista>.jpg`.
 */
import { RenderEngine } from '../../src/render/engine.js';
import { buildScene, cameraFor } from '../../src/render/scenes.js';
import { generateStarterSceneItems } from '../../src/render/catalog.js';
import { setWallCut } from '../../src/render/kit.js';

const PALETTE = { primary: 0x7464cc, secondary: 0xb3a7ec, neutral: 0xe9e2d3, accent: 0xd9a441, dark: 0x3b3b45, wood: 'oak', wall: 0xf1eee8, floor: 'planks' };

let engine = null;
export function getEngine() {
  if (!engine) engine = new RenderEngine(document.createElement('canvas'));
  return engine;
}

export async function saveCanvas(name, target = getEngine()) {
  const blob = await target.toBlob('image/jpeg', 0.9);
  const res = await fetch(`/__render-lab/save?dir=qa&name=${name}`, { method: 'POST', body: blob });
  return (await res.json()).file;
}

export async function qa(
  tag,
  {
    preset = 'studio',
    dims = { W: 5.4, D: 4.4, H: 2.7 },
    environment = 'garden',
    night = false,
    passes = 40,
    views = ['doll', 'in', 'out'],
    w = 760,
    h = 570,
    items = null,
    palette = PALETTE,
    extra = {},
    cams = {},
  } = {}
) {
  const e = getEngine();
  const list = items ?? generateStarterSceneItems(preset, { ...dims, wallCount: 4 });
  const built = buildScene({ kind: 'custom_room', usePolygon: false, ...dims, cutMode: 'auto', items: list, palette, environment, night, ...extra });
  e.setSize(w, h, 1024);
  e.load(built);
  const out = [];
  const shot = async (name) => {
    e.step(passes);
    e.present(null);
    out.push(await saveCanvas(name, e));
  };
  e.setProbePosition({ x: 0, y: Math.min(dims.H * 0.55, 1.6), z: 0 });
  const closed = (on) => {
    setWallCut(built.shell, () => true);
    built.shell.userData.ceiling.visible = on;
    e.invalidateShadows();
  };
  if (views.includes('doll')) {
    e.setCamera(cameraFor(built, cams.doll ?? {}, w / h));
    const cam = e.camera;
    setWallCut(built.shell, (p) => (cam.position.x - p.midX) * p.inX + (cam.position.z - p.midZ) * p.inZ > -0.05);
    built.shell.userData.ceiling.visible = false;
    e.invalidateShadows();
    await shot(`${tag}-doll.jpg`);
  }
  if (views.includes('in')) {
    closed(true);
    e.setCamera(cameraFor(built, cams.in ?? { firstPerson: true, camX: -1.9, camY: 1.6, camZ: 1.5, lookX: 1.4, lookY: 1.1, lookZ: -1.0, fov: 64 }, w / h));
    await shot(`${tag}-in.jpg`);
  }
  if (views.includes('out')) {
    closed(true);
    e.setProbePosition({ x: 7, y: 1.6, z: 6.3 });
    e.setCamera(cameraFor(built, cams.out ?? { firstPerson: true, camX: 9.5, camY: 1.7, camZ: 8.5, lookX: 0, lookY: 1.5, lookZ: 0, fov: 50 }, w / h));
    await shot(`${tag}-out.jpg`);
  }
  return { files: out, built };
}
