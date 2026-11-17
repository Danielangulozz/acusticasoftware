import { ALL_CATALOG_ITEMS, createSceneItem } from './catalog.js';

/**
 * Archivo de proyecto del Estudio de renders (.json), como el «Guardar / Cargar» del dibujo de
 * planta: la sala (planta y medidas), los objetos con su posición y acabado, el entorno, la paleta
 * y las vistas guardadas. Al abrirlo se revisa todo: lo que no se reconoce se descarta.
 */

export const STUDIO_FILE_KIND = 'pozole-estudio-3d';
export const STUDIO_FILE_VERSION = 1;

const SETTINGS = ['projectName', 'roomType', 'palette', 'night', 'environment', 'sunHour', 'size', 'imageQuality', 'format', 'previewQuality'];
const VIEW_MODE_IDS = ['orbit', 'walk', 'exterior', 'plan'];
const NUM_FIELDS = ['x', 'y', 'z', 'rotation', 'along', 'elevation', 'wallIndex', 'cornerIndex', 'count', 'spacing'];
const STR_FIELDS = ['name', 'mount', 'colorRole', 'customColor', 'wood'];
const BOOL_FIELDS = ['locked', 'frame'];

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const short = (v, max = 120) => String(v ?? '').slice(0, max);

export function serializeStudio({ opts, items, polygon }) {
  return {
    kind: STUDIO_FILE_KIND,
    version: STUDIO_FILE_VERSION,
    app: 'POZOLE ACÚSTICA · Estudio de renders',
    savedAt: new Date().toISOString(),
    room: { polygon, dims: opts.dims, usesProjectPlan: Boolean(opts.usePolygon) },
    settings: Object.fromEntries(SETTINGS.filter((k) => opts[k] !== undefined).map((k) => [k, opts[k]])),
    shots: opts.shots ?? [],
    items,
  };
}

function cleanMap(src, { numbers = false } = {}) {
  if (!src || typeof src !== 'object') return undefined;
  const out = {};
  Object.entries(src).forEach(([k, v]) => {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (!numbers && typeof v === 'boolean') out[k] = v;
    else if (!numbers && typeof v === 'string') out[k] = short(v, 40);
  });
  return out;
}

function cleanItem(raw) {
  if (!raw || typeof raw !== 'object' || !ALL_CATALOG_ITEMS[raw.typeId]) return null;
  const overrides = { id: typeof raw.id === 'string' ? short(raw.id, 80) : undefined };
  NUM_FIELDS.forEach((k) => {
    if (raw[k] !== undefined) overrides[k] = num(raw[k]);
  });
  STR_FIELDS.forEach((k) => {
    if (typeof raw[k] === 'string') overrides[k] = short(raw[k]);
  });
  BOOL_FIELDS.forEach((k) => {
    if (typeof raw[k] === 'boolean') overrides[k] = raw[k];
  });
  overrides.dims = cleanMap(raw.dims);
  overrides.coefficients = cleanMap(raw.coefficients, { numbers: true });
  overrides.sabines = cleanMap(raw.sabines, { numbers: true });
  const item = createSceneItem(raw.typeId, overrides);
  if (raw.enabled === false) item.enabled = false;
  return item;
}

function cleanPolygon(p) {
  if (!p || !Array.isArray(p.vertices) || p.vertices.length < 3) return null;
  const vertices = p.vertices.map((v) => ({ x: num(v?.x, NaN), y: num(v?.y, NaN) }));
  if (vertices.some((v) => !Number.isFinite(v.x) || !Number.isFinite(v.y))) return null;
  return { vertices, height: Math.min(30, Math.max(2, num(p.height, 2.7))), curvatures: cleanMap(p.curvatures, { numbers: true }) ?? {} };
}

function cleanPose(p) {
  const v3 = (a) => (Array.isArray(a) && a.length === 3 && a.every((n) => Number.isFinite(Number(n))) ? a.map(Number) : null);
  const pos = v3(p?.pos);
  const target = v3(p?.target);
  if (!pos || !target) return null;
  return VIEW_MODE_IDS.includes(p.mode) ? { pos, target, fov: num(p.fov, 50), mode: p.mode } : { pos, target, fov: num(p.fov, 50) };
}

/** Lee un archivo de proyecto. Lanza un Error con un mensaje para el usuario si no sirve. */
export function parseStudioFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no se pudo leer: no es un JSON válido.');
  }
  if (!data || data.kind !== STUDIO_FILE_KIND) throw new Error('Este archivo no es un proyecto del Estudio de renders de POZOLE.');
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.map(cleanItem).filter(Boolean);
  const dims = data.room?.dims ?? {};
  const settings = {};
  SETTINGS.forEach((k) => {
    if (data.settings?.[k] !== undefined) settings[k] = data.settings[k];
  });
  if (settings.palette && typeof settings.palette !== 'object') delete settings.palette;
  if (settings.projectName !== undefined) settings.projectName = short(settings.projectName, 60);
  const shots = (Array.isArray(data.shots) ? data.shots : [])
    .map((s, i) => {
      const pose = cleanPose(s?.pose);
      return pose ? { id: short(s.id || `vista_${i}`, 40), name: short(s.name || `Vista ${i + 1}`, 40), pose } : null;
    })
    .filter(Boolean);
  return {
    items,
    skipped: rawItems.length - items.length,
    polygon: cleanPolygon(data.room?.polygon),
    dims: { W: num(dims.W, 5.4), D: num(dims.D, 4.4), H: num(dims.H, 2.7) },
    settings,
    shots,
  };
}
