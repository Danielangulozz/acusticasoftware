/**
 * Imagen de portada del sitio (public/renders/hero-estudio*.webp), dibujada con el motor propio.
 *
 * Desde la consola del navegador, con `vite dev` en marcha:
 *   const { hero } = await import('/tools/render-lab/hero.js');
 *   await hero({ w: 960, h: 540, passes: 30 });                       // prueba rápida → node_modules/.cache/pozole-qa/
 *   await hero({ w: 3840, h: 2160, passes: 260, save: 'hero-estudio' }); // final 4K → public/renders/
 */
import { RenderEngine, tick } from '../../src/render/engine.js';
import { buildScene, cameraFor } from '../../src/render/scenes.js';
import { createSceneItem } from '../../src/render/catalog.js';
import { setWallCut } from '../../src/render/kit.js';

export const HERO_DIMS = { W: 6.2, D: 5.2, H: 3.0 };

// Tonos sobrios: muros grafito, tela en carbón y ciruela, madera de nogal y acentos ámbar
const PALETTE = { primary: 0x8c8174, secondary: 0x5b4f86, neutral: 0xd8d0c0, accent: 0xd9a441, dark: 0x2a2930, wood: 'walnut', wall: 0x55525c, floor: 'planks' };

export function heroItems({ W, D, H } = HERO_DIMS) {
  const backZ = -D / 2;
  const leftX = -W / 2;
  const rightX = W / 2;
  return [
    // Puesto de mezcla
    createSceneItem('desk', { x: 0, z: backZ + 1.2, dims: { w: 1.9, d: 0.85, h: 0.75 } }),
    createSceneItem('studio_monitors', { x: 0, z: backZ + 0.8, dims: { w: 2.1, d: 0.4, h: 1.18, spread: 2.2 } }),
    createSceneItem('task_chair', { x: 0.1, z: backZ + 2.0, rotation: 14 }),
    createSceneItem('rug', { x: 0, z: backZ + 1.8, colorRole: 'dark', dims: { w: 3.2, d: 2.4, h: 0.015 } }),
    createSceneItem('rack', { x: rightX - 0.6, z: backZ + 0.7, rotation: -30 }),
    createSceneItem('floor_lamp', { x: rightX - 0.45, z: 0.35 }),
    createSceneItem('floor_lamp', { x: leftX + 0.5, z: 0.9 }),
    createSceneItem('sofa', { x: leftX + 0.6, z: 1.55, rotation: -90, colorRole: 'secondary', dims: { w: 1.9, d: 0.88, h: 0.8 } }),
    createSceneItem('plant', { x: rightX - 0.45, z: 1.9 }),
    // Pared frontal: listones de nogal tras los monitores, absorbentes a los lados y difusores arriba
    createSceneItem('panel_slats', { wallIndex: 0, along: 0, elevation: 1.3, dims: { w: 2.6, h: 2.3, t: 0.035 } }),
    createSceneItem('panel_broadband_100', { wallIndex: 0, along: -1.95, elevation: 1.45, count: 1, colorRole: 'primary', dims: { w: 0.7, h: 1.6, t: 0.1 } }),
    createSceneItem('panel_broadband_100', { wallIndex: 0, along: 1.95, elevation: 1.45, count: 1, colorRole: 'primary', dims: { w: 0.7, h: 1.6, t: 0.1 } }),
    createSceneItem('trap_corner', { cornerIndex: 0, dims: { w: 0.5, h: H - 0.1, t: 0.5 } }),
    createSceneItem('trap_corner', { cornerIndex: 1, dims: { w: 0.5, h: H - 0.1, t: 0.5 } }),
    // Nube sobre el punto de escucha
    createSceneItem('cloud_ceiling', { x: 0, z: backZ + 1.6, colorRole: 'neutral', dims: { w: 1.6, d: 1.2, t: 0.08, drop: 0.4 } }),
    // Pared izquierda: QRD y paneles de primera reflexión
    createSceneItem('diffuser_qrd1d', { wallIndex: 3, along: 0.55, elevation: 1.5, count: 3, spacing: 0.05, colorRole: 'wood', dims: { w: 0.62, h: 1.5, t: 0.18, p: 7, periods: 1, well: 0.08 } }),
    createSceneItem('panel_broadband_100', { wallIndex: 3, along: -1.4, elevation: 1.4, count: 2, spacing: 0.12, colorRole: 'secondary', dims: { w: 0.6, h: 1.2, t: 0.1 } }),
    // Pared derecha: ventana y difusores skyline
    createSceneItem('arch_window', { wallIndex: 1, along: 0.9, elevation: 1.5 }),
    createSceneItem('diffuser_skyline', { wallIndex: 1, along: -1.0, elevation: 1.55, count: 2, spacing: 0.06, colorRole: 'wood', dims: { w: 0.6, h: 0.6, t: 0.18, p: 7, cell: 0.085, tiles: 1 } }),
  ];
}

let engine = null;
const getEngine = () => (engine ??= new RenderEngine(document.createElement('canvas')));

export async function hero({
  w = 960,
  h = 540,
  passes = 30,
  night = true,
  environment = 'city',
  cam = { firstPerson: true, camX: 2.15, camY: 1.42, camZ: 2.05, lookX: -1.5, lookY: 1.25, lookZ: -1.9, fov: 58 },
  save = null,
  quality = 0.86,
  tag = 'hero',
  items = null,
} = {}) {
  const e = getEngine();
  const built = buildScene({ kind: 'custom_room', usePolygon: false, ...HERO_DIMS, cutMode: 'auto', items: items ?? heroItems(), palette: PALETTE, environment, night });
  e.setSize(w, h, w > 2000 ? 4096 : 2048);
  e.load(built);
  setWallCut(built.shell, () => true);
  built.shell.userData.ceiling.visible = true;
  e.invalidateShadows();
  e.setProbePosition({ x: 0, y: 1.5, z: 0 });
  e.setCamera(cameraFor(built, cam, w / h));
  const t0 = performance.now();
  while (e.samples < passes) {
    e.step(Math.min(6, passes - e.samples));
    await tick();
  }
  e.present(null);
  const ms = Math.round(performance.now() - t0);
  if (save) {
    const blob = await e.toBlob('image/webp', quality);
    const res = await fetch(`/__render-lab/save?dir=renders&name=${save}.webp`, { method: 'POST', body: blob });
    return { ms, ...(await res.json()) };
  }
  const blob = await e.toBlob('image/jpeg', 0.9);
  const res = await fetch(`/__render-lab/save?dir=qa&name=${tag}.jpg`, { method: 'POST', body: blob });
  return { ms, ...(await res.json()) };
}
