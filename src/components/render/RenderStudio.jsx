import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  Film,
  FolderOpen,
  Footprints,
  Grid3x3,
  House,
  Image as ImageIcon,
  Lock,
  Map as MapIcon,
  Minus,
  Moon,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Rotate3d,
  Save,
  Search,
  Square,
  Sun,
  Trash2,
  Undo2,
  Unlock,
  Wand2,
  X,
} from 'lucide-react';
import SceneViewport, { PREVIEW_QUALITY } from '../../render/SceneViewport';
import { PRODUCT_KINDS } from '../../render/scenes';
import { getPolygonLayout } from '../../render/kit';
import {
  ALL_CATALOG_ITEMS,
  ROOM_PRESET_STYLES,
  SUPPORT_SURFACE_SPECS,
  calculateItemAbsorption,
  calculateSceneObjectsAbsorption,
  createSceneItem,
  generateStarterSceneItems,
  getCatalogItem,
  getSupportSurfaceLevels,
} from '../../render/catalog';
import { CATALOG_GROUPS, catalogGroupOf } from '../../render/catalogExtra';
import { AUDIO_FINISHES } from '../../render/kitAudio';
import { ENVIRONMENTS } from '../../render/environment';
import { cachedThumbnail, requestThumbnail } from '../../render/thumbnails';
import { parseStudioFile, serializeStudio } from '../../render/studioFile';
import { OCTAVE_BANDS, calculatePolygonGeometry, calculateReverberationTimes, calculateRoomAbsorption } from '../../utils/acousticCalculations';
import { getDefaultPolygonMaterials } from '../../utils/defaultMaterials';
import { DIFFUSER_TYPE_LABELS, designFromConfig, loadDiffuserConfig } from '../diffusers/diffuserConfig';

/**
 * Estudio de renders de POZOLE Suite.
 *
 *   · Cuatro formas de ver la sala: Maqueta (gira alrededor), Recorrer (a la altura de los ojos,
 *     con W A S D o haciendo clic en el piso), Exterior (la sala cerrada en su entorno) y Planta
 *     (desde arriba, para acomodar). El cambio entre ellas es un viaje suave de la cámara.
 *   · Catálogo con miniaturas dibujadas por el propio motor; un clic agrega el objeto.
 *   · Inspector del objeto elegido, vistas guardadas, recorridos y exportación a imagen o video.
 *   · Guardar y abrir el proyecto como archivo .json, además del guardado automático.
 */

const STORAGE_KEY = 'pozole_render_studio_v5';
const HINTS_KEY = 'pozole_render_hints_v1';

const CARD = 'bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm';
const TITLE = 'text-[#1d1d1f] dark:text-white';
const MUTED = 'text-[#6e6e73] dark:text-slate-400';
const SOFT = 'bg-[#f5f5f7] dark:bg-[#18192a]';
const LINE = 'border-black/[0.07] dark:border-white/[0.08]';
const ACTIVE = 'bg-[#fff] dark:bg-[#2a2c44] shadow-sm text-[#1d1d1f] dark:text-white';
const IDLE = 'text-[#6e6e73] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white';

const THEMES = [
  { name: 'POZOLE', primary: '#7464cc', secondary: '#b3a7ec', neutral: '#e9e2d3', accent: '#d9a441', dark: '#3b3b45', wood: 'oak', wall: '#f1eee8', floor: 'planks' },
  { name: 'Académico', primary: '#2563eb', secondary: '#93c5fd', neutral: '#f1f5f9', accent: '#f59e0b', dark: '#334155', wood: 'birch', wall: '#f4f6f8', floor: 'tiles' },
  { name: 'Industrial', primary: '#1d4ed8', secondary: '#64748b', neutral: '#cbd5e1', accent: '#ea580c', dark: '#1e293b', wood: 'oak', wall: '#d6d9de', floor: 'concrete' },
  { name: 'Cine oscuro', primary: '#8b5cf6', secondary: '#6366f1', neutral: '#cbd5e1', accent: '#f59e0b', dark: '#1e1b2e', wood: 'walnut', wall: '#45434f', floor: 'carpet' },
  { name: 'Bosque', primary: '#3f7f6b', secondary: '#a9cdb9', neutral: '#ece7da', accent: '#c98a3d', dark: '#2d3b36', wood: 'ash', wall: '#eef0ea', floor: 'planks' },
];
const WOODS = [['oak', 'Roble'], ['walnut', 'Nogal'], ['birch', 'Abedul'], ['ash', 'Fresno']];
const FLOORS = [['planks', 'Madera'], ['walnut', 'Nogal'], ['carpet', 'Alfombra'], ['tiles', 'Baldosa'], ['concrete', 'Concreto']];
const WALLS = ['#f1eee8', '#f4f6f8', '#dfe5dc', '#d6d9de', '#45434f'];
const COLOR_ROLES = [['primary', 'Principal'], ['secondary', 'Secundario'], ['neutral', 'Neutro'], ['accent', 'Acento'], ['dark', 'Oscuro'], ['custom', 'Libre']];

const PRESETS = [
  { id: 'studio', label: 'Estudio', hint: 'Grabación y mezcla' },
  { id: 'cinema', label: 'Cine en casa', hint: 'Pantalla y butacas' },
  { id: 'meeting', label: 'Sala de juntas', hint: 'Mesa y videollamada' },
  { id: 'classroom', label: 'Aula', hint: 'Pupitres y tablero' },
  { id: 'industrial', label: 'Taller', hint: 'Máquinas y estantería' },
  { id: 'empty', label: 'Vacía', hint: 'Solo los muros' },
];

const VIEW_TABS = [
  { id: 'orbit', label: 'Maqueta', icon: Rotate3d, hint: 'Arrastra para girar · clic derecho o Ctrl para desplazar · rueda para acercar · doble clic en un objeto para centrarlo' },
  { id: 'walk', label: 'Recorrer', icon: Footprints, hint: 'W A S D para caminar · arrastra para mirar · clic en el piso para ir allí · Shift corre · R / F sube o baja la vista' },
  { id: 'exterior', label: 'Exterior', icon: House, hint: 'Así se ve la sala desde afuera · arrastra para rodearla' },
  { id: 'plan', label: 'Planta', icon: MapIcon, hint: 'Vista desde arriba · arrastra un objeto para moverlo · arrastra el fondo para desplazarte' },
];

const SIZES = [
  { id: '16:9', label: 'Panorámica', w: 1920, h: 1080 },
  { id: '4:3', label: 'Clásica', w: 2000, h: 1500 },
  { id: '1:1', label: 'Cuadrada', w: 1500, h: 1500 },
  { id: '4:5', label: 'Vertical', w: 1200, h: 1500 },
];
const IMAGE_QUALITIES = [
  { id: 'rapida', label: 'Rápida', samples: 40 },
  { id: 'alta', label: 'Alta', samples: 110 },
  { id: 'maxima', label: 'Máxima', samples: 240 },
];
const VIDEO_QUALITIES = [
  { id: 'borrador', label: 'Borrador', samples: 2 },
  { id: 'buena', label: 'Buena', samples: 5 },
  { id: 'alta', label: 'Alta', samples: 12 },
];
const VIDEO_SIZES = [
  { id: '720', label: '720p', w: 1280, h: 720, bitrate: 6e6 },
  { id: '1080', label: '1080p', w: 1920, h: 1080, bitrate: 10e6 },
];

const PRODUCT_FIELDS = {
  absorber: [['w', 'Ancho', 0.4, 1.2, 0.05, 'm'], ['h', 'Alto', 0.4, 2.4, 0.05, 'm'], ['t', 'Espesor', 0.03, 0.12, 0.005, 'm']],
  foam: [['w', 'Ancho', 0.4, 1.2, 0.05, 'm'], ['h', 'Alto', 0.4, 1.2, 0.05, 'm'], ['t', 'Espesor', 0.03, 0.1, 0.005, 'm']],
  perforated: [['w', 'Ancho', 0.5, 1.5, 0.05, 'm'], ['h', 'Alto', 0.6, 2.4, 0.05, 'm'], ['t', 'Espesor', 0.04, 0.1, 0.005, 'm']],
  membrane: [['w', 'Ancho', 0.5, 1.2, 0.05, 'm'], ['h', 'Alto', 0.6, 2.0, 0.05, 'm'], ['t', 'Profundidad', 0.08, 0.22, 0.01, 'm']],
  trap: [['side', 'Lado', 0.3, 0.7, 0.02, 'm'], ['h', 'Alto', 0.8, 2.6, 0.05, 'm']],
  tube: [['r', 'Radio', 0.15, 0.35, 0.01, 'm'], ['h', 'Alto', 0.8, 2.4, 0.05, 'm']],
  qrd: [['periods', 'Períodos', 1, 3, 1, ''], ['h', 'Alto', 0.4, 2.4, 0.05, 'm'], ['depth', 'Profundidad', 0.08, 0.3, 0.01, 'm']],
  skyline: [['cell', 'Lado del bloque', 0.05, 0.12, 0.005, 'm'], ['maxH', 'Altura máxima', 0.08, 0.3, 0.01, 'm']],
  prd: [['periods', 'Períodos', 1, 3, 1, ''], ['h', 'Alto', 0.4, 2.4, 0.05, 'm'], ['depth', 'Profundidad', 0.08, 0.3, 0.01, 'm']],
  mls: [['periods', 'Períodos', 1, 3, 1, ''], ['h', 'Alto', 0.4, 2.4, 0.05, 'm'], ['depth', 'Profundidad', 0.05, 0.2, 0.01, 'm']],
  poly: [['count', 'Cilindros', 1, 5, 1, ''], ['chord', 'Cuerda', 0.3, 0.9, 0.05, 'm'], ['sag', 'Flecha', 0.04, 0.25, 0.01, 'm'], ['h', 'Alto', 0.6, 2.4, 0.05, 'm']],
  slats: [['w', 'Ancho', 0.4, 2.4, 0.05, 'm'], ['h', 'Alto', 0.6, 2.6, 0.05, 'm']],
  cloud: [['count', 'Paneles', 1, 2, 1, ''], ['w', 'Largo', 0.6, 1.8, 0.05, 'm'], ['d', 'Ancho', 0.4, 1.2, 0.05, 'm']],
};
const PRODUCT_PRIMES = { qrd: [5, 7, 11, 13], skyline: [5, 7, 11], prd: [5, 7, 11, 13] };

const DIM_LABELS = { w: 'Ancho', d: 'Fondo', h: 'Alto', t: 'Espesor', drop: 'Separación del techo', spread: 'Separación', r: 'Radio', chord: 'Cuerda', sag: 'Flecha', cell: 'Lado del bloque', maxH: 'Altura máxima', well: 'Ancho de ranura' };
const INT_DIMS = { seats: ['Butacas', 2, 8], cols: ['Columnas', 1, 8], rows: ['Filas', 1, 8], periods: ['Períodos', 1, 4], baffleCount: ['Bafles', 2, 12], polyCount: ['Cilindros', 1, 5], tiles: ['Módulos', 1, 4], order: ['Orden', 2, 5] };
const BOOL_DIMS = { withChairs: 'Con sillas', mirror: 'Con espejo', stands: 'Con pedestales', riser: 'Sobre tarima' };
const SCREEN_KINDS = [['daw', 'Audio'], ['movie', 'Película'], ['chart', 'Gráficas'], ['lecture', 'Clase']];
const REPEATABLE = new Set(['school_arm_chair', 'student_desk', 'dining_chair', 'shell_chair', 'visitor_chair', 'bar_stool']);
const FLOOR_ANCHORED = new Set(['arch_door', 'double_door', 'floor_to_ceiling_window']);

const DEFAULTS = {
  mode: 'room',
  usePolygon: true,
  customPolygon: null,
  syncSurfaceMaterials: true,
  roomType: 'studio',
  dims: { W: 5.4, D: 4.4, H: 2.7 },
  product: 'qrd',
  productParams: {},
  palette: { ...THEMES[0] },
  night: false,
  environment: 'garden',
  sunHour: null,
  previewQuality: 'auto',
  size: '16:9',
  imageQuality: 'alta',
  format: 'png',
  transparent: false,
  dof: 'none',
  shots: [],
  tourLoop: true,
  video: { size: '1080', quality: 'buena', duration: null },
};

const hexNum = (value) => parseInt(String(value || '#7464cc').replace('#', ''), 16);
const fmt = (v, d = 1) => Number(v || 0).toFixed(d).replace('.', ',');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, step) => Math.round(v / step) * step;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return DEFAULTS;
    return { ...DEFAULTS, ...saved, dims: { ...DEFAULTS.dims, ...(saved.dims || {}) }, palette: { ...DEFAULTS.palette, ...(saved.palette || {}) }, video: { ...DEFAULTS.video, ...(saved.video || {}) } };
  } catch {
    return DEFAULTS;
  }
}

function loadHints() {
  try {
    return JSON.parse(localStorage.getItem(HINTS_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Sol según la hora del día (6 h a 18 h): sale por un lado, sube al mediodía y baja por el otro. */
function sunForHour(hour) {
  if (hour === null || hour === undefined) return null;
  const t = clamp((hour - 6) / 12, 0, 1);
  return { azimuth: 60 + t * 240, elevation: 8 + 62 * Math.sin(Math.PI * t) };
}

function rectPolygon({ W, D, H }) {
  return { vertices: [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: D }, { x: 0, y: D }], height: H, curvatures: {} };
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function RenderStudio({
  geometry,
  roomPolygon,
  materials,
  includeAirAbsorption = true,
  optimumRT,
  sceneObjects,
  onChangeSceneObjects,
  applySceneObjectsToProject = true,
  onToggleApplySceneObjects,
  isDarkMode = false,
}) {
  const [opts, setOpts] = useState(loadState);
  // Acepta un objeto o una función del estado anterior (para cambios seguidos sin pisarse)
  const patch = (changes) => setOpts((o) => ({ ...o, ...(typeof changes === 'function' ? changes(o) : changes) }));
  const [viewMode, setViewMode] = useState('orbit');
  const [panel, setPanel] = useState('add');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [exportTab, setExportTab] = useState(null); // 'image' | 'video' | null
  const [fileMenu, setFileMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [presets, setPresets] = useState({});
  const [hints, setHints] = useState(loadHints);
  const [showBands, setShowBands] = useState(false);
  const viewport = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [opts]);

  const notify = (text, tone = 'ok') => {
    setToast({ text, tone, at: Date.now() });
  };
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  /* --------------------------------------------------------------- sala activa */

  const hasProjectPlan = roomPolygon?.vertices?.length >= 3;
  const activePolygon = useMemo(() => {
    if (opts.usePolygon && hasProjectPlan) return roomPolygon;
    if (opts.customPolygon?.vertices?.length >= 3) return opts.customPolygon;
    return rectPolygon({ W: Number(opts.dims.W) || 5.4, D: Number(opts.dims.D) || 4.4, H: Number(opts.dims.H) || 2.7 });
  }, [opts.usePolygon, hasProjectPlan, roomPolygon, opts.customPolygon, opts.dims]);
  const layout = useMemo(() => getPolygonLayout(activePolygon), [activePolygon]);

  /* ----------------------------------------------------- objetos con historial */

  const [localItems, setLocalItems] = useState(() => generateStarterSceneItems('studio', { W: layout.W, D: layout.D, H: layout.H, wallCount: layout.walls.length }));
  const items = Array.isArray(sceneObjects) ? sceneObjects : localItems;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const historyRef = useRef({ past: [], future: [], lastKey: null, lastTs: 0 });
  const [, bump] = useState(0);

  const setItemsRaw = (next) => (onChangeSceneObjects ? onChangeSceneObjects(next) : setLocalItems(next));
  const commitItems = (updater, { continuousKey = null } = {}) => {
    const current = itemsRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    if (next === current) return;
    const now = performance.now();
    const h = historyRef.current;
    if (!continuousKey || h.lastKey !== continuousKey || now - h.lastTs > 450) {
      h.past = [...h.past.slice(-60), current];
      h.future = [];
      bump((n) => n + 1);
    }
    h.lastKey = continuousKey;
    h.lastTs = now;
    itemsRef.current = next;
    setItemsRaw(next);
  };
  const undo = () => {
    const h = historyRef.current;
    if (!h.past.length) return;
    h.future = [itemsRef.current, ...h.future.slice(0, 60)];
    const prev = h.past[h.past.length - 1];
    h.past = h.past.slice(0, -1);
    h.lastKey = null;
    itemsRef.current = prev;
    setItemsRaw(prev);
    bump((n) => n + 1);
  };
  const redo = () => {
    const h = historyRef.current;
    if (!h.future.length) return;
    h.past = [...h.past.slice(-60), itemsRef.current];
    const next = h.future[0];
    h.future = h.future.slice(1);
    h.lastKey = null;
    itemsRef.current = next;
    setItemsRaw(next);
    bump((n) => n + 1);
  };

  const selectedItem = useMemo(() => items.find((it) => it.id === selectedItemId) || null, [items, selectedItemId]);
  useEffect(() => {
    if (selectedItemId && !selectedItem) setSelectedItemId(null);
  }, [selectedItemId, selectedItem]);

  const updateItem = (id, changes) =>
    commitItems(
      (prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                ...changes,
                dims: changes.dims ? { ...it.dims, ...changes.dims } : it.dims,
                coefficients: changes.coefficients ? { ...it.coefficients, ...changes.coefficients } : it.coefficients,
              }
            : it
        ),
      { continuousKey: `edit_${id}` }
    );

  /** Punto del piso frente a la cámara, dentro de la sala, para poner un objeto nuevo. */
  const dropPoint = () => {
    const pose = viewport.current?.getPose();
    let x = 0;
    let z = 0;
    if (pose) {
      const inside = viewMode === 'walk';
      if (inside) {
        const dx = pose.target[0] - pose.pos[0];
        const dz = pose.target[2] - pose.pos[2];
        const len = Math.hypot(dx, dz) || 1;
        x = pose.pos[0] + (dx / len) * 1.4;
        z = pose.pos[2] + (dz / len) * 1.4;
      } else {
        x = pose.target[0];
        z = pose.target[2];
      }
    }
    // Busca en espiral el primer lugar libre cerca de ese punto (sin caer encima de otro mueble)
    const others = itemsRef.current
      .filter((it) => it.enabled !== false && (it.mount === 'floor' || it.mount === 'corner') && !(Number(it.y) > 0.05))
      .map((it) => ({ x: Number(it.x) || 0, z: Number(it.z) || 0, r: Math.hypot(Number(it.dims?.w) || 0.6, Number(it.dims?.d) || 0.6) / 2 }));
    const limX = layout.W / 2 - 0.4;
    const limZ = layout.D / 2 - 0.4;
    for (let k = 0; k < 60; k++) {
      const a = k * 2.399963;
      const rr = 0.35 * Math.sqrt(k);
      const px = clamp(x + Math.cos(a) * rr, -limX, limX);
      const pz = clamp(z + Math.sin(a) * rr, -limZ, limZ);
      if (others.every((o) => Math.hypot(o.x - px, o.z - pz) > o.r + 0.35)) return { x: round(px, 0.05), z: round(pz, 0.05) };
    }
    return { x: round(clamp(x, -limX, limX), 0.05), z: round(clamp(z, -limZ, limZ), 0.05) };
  };

  const addItem = (typeId) => {
    const def = getCatalogItem(typeId);
    const sel = selectedItem;
    const small = def.mount === 'floor' && !SUPPORT_SURFACE_SPECS[typeId] && (Number(def.defaultDims?.h) || 1) < 0.75;
    const surface = small && sel && SUPPORT_SURFACE_SPECS[sel.typeId] ? sel : null;
    let place = { x: 0, z: 0, y: 0, rotation: 0 };
    if (surface) {
      const levels = getSupportSurfaceLevels(surface);
      place = { x: Number(surface.x) || 0, z: Number(surface.z) || 0, y: levels[levels.length - 1]?.y ?? 0.75, rotation: Number(surface.rotation) || 0 };
    } else if (def.mount === 'floor' || def.mount === 'ceiling') {
      place = { ...place, ...dropPoint() };
    }
    const item = createSceneItem(typeId, {
      ...place,
      wallIndex: 0,
      cornerIndex: itemsRef.current.filter((it) => it.mount === 'corner').length % Math.max(1, layout.corners.length),
      elevation: def.mount === 'wall' ? (FLOOR_ANCHORED.has(typeId) ? (Number(def.defaultDims?.h) || 2.05) / 2 : Math.min(1.4, layout.H * 0.5)) : 0,
    });
    commitItems((prev) => [...prev, item]);
    setSelectedItemId(item.id);
    notify(surface ? `${def.name} quedó sobre ${surface.name}.` : `${def.name} agregado.`);
  };

  const duplicateItem = (item) => {
    if (!item) return;
    const copy = createSceneItem(item.typeId, {
      ...item,
      id: undefined,
      locked: false,
      name: `${item.name} (copia)`,
      along: item.mount === 'wall' ? clamp((Number(item.along) || 0) + 0.65, -layout.W / 2 + 0.3, layout.W / 2 - 0.3) : item.along,
      x: item.mount !== 'wall' ? clamp((Number(item.x) || 0) + 0.45, -layout.W / 2 + 0.25, layout.W / 2 - 0.25) : item.x,
      z: item.mount !== 'wall' ? clamp((Number(item.z) || 0) + 0.35, -layout.D / 2 + 0.25, layout.D / 2 - 0.25) : item.z,
      dims: { ...item.dims },
      coefficients: item.coefficients ? { ...item.coefficients } : null,
      sabines: item.sabines ? { ...item.sabines } : null,
    });
    commitItems((prev) => [...prev, copy]);
    setSelectedItemId(copy.id);
  };
  const deleteItem = (id) => {
    const target = itemsRef.current.find((it) => it.id === id);
    if (!target || target.locked) return;
    commitItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };
  const toggleLock = (id) => commitItems((prev) => prev.map((it) => (it.id === id ? { ...it, locked: !it.locked } : it)));
  const rotateItem = (item, delta = 45) => {
    if (!item || item.locked || item.mount === 'wall' || item.mount === 'corner') return;
    updateItem(item.id, { rotation: (((Number(item.rotation) || 0) + delta) % 360 + 360) % 360 });
  };

  const applyPreset = (presetId) => {
    viewport.current?.stop();
    if (presetId === 'empty') {
      commitItems([]);
      setSelectedItemId(null);
      notify('La sala quedó vacía. Ctrl+Z la devuelve.');
      return;
    }
    if (presetId === 'project') {
      const pl = getPolygonLayout(roomPolygon);
      patch({ usePolygon: true, customPolygon: null });
      commitItems(generateStarterSceneItems(opts.roomType in ROOM_PRESET_STYLES ? opts.roomType : 'studio', { W: pl.W, D: pl.D, H: pl.H, wallCount: pl.walls.length }));
      notify('Se amobló la planta de tu proyecto. Ctrl+Z deshace.');
      return;
    }
    const style = ROOM_PRESET_STYLES[presetId] || ROOM_PRESET_STYLES.studio;
    patch({ roomType: presetId, usePolygon: false, customPolygon: null, dims: { ...style.dims }, palette: { ...style.palette } });
    commitItems(generateStarterSceneItems(presetId, { ...style.dims, wallCount: 4 }));
    setSelectedItemId(null);
    notify(`Plantilla «${style.label}» cargada. Ctrl+Z deshace.`);
  };

  /* ---------------------------------------------------------------- atajos */

  const shortcuts = useRef({});
  shortcuts.current = { undo, redo, selectedItem, duplicateItem, deleteItem, toggleLock, rotateItem, updateItem, viewMode, playing, layout };
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      const s = shortcuts.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        s.undo();
        return;
      }
      if ((mod && key === 'y') || (mod && e.shiftKey && key === 'z')) {
        e.preventDefault();
        s.redo();
        return;
      }
      if (e.key === 'Escape') {
        if (s.playing) viewport.current?.stop();
        else setSelectedItemId(null);
        return;
      }
      const sel = s.selectedItem;
      if (!sel) return;
      if (mod && key === 'd') {
        e.preventDefault();
        s.duplicateItem(sel);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        s.deleteItem(sel.id);
      } else if (s.viewMode !== 'walk' && !mod) {
        // En «Recorrer» las letras y flechas mueven la cámara
        if (key === 'r') s.rotateItem(sel, e.shiftKey ? -45 : 45);
        else if (key === 'l') s.toggleLock(sel.id);
        else if (e.key.startsWith('Arrow') && !sel.locked && sel.mount !== 'corner') {
          e.preventDefault();
          const step = e.shiftKey ? 0.2 : 0.05;
          const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
          const dz = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
          if (sel.mount === 'wall') s.updateItem(sel.id, { along: round((Number(sel.along) || 0) + dx, 0.05), elevation: FLOOR_ANCHORED.has(sel.typeId) ? sel.elevation : round(clamp((Number(sel.elevation) || 1.35) - dz, 0.25, s.layout.H - 0.25), 0.05) });
          else s.updateItem(sel.id, { x: round(clamp((Number(sel.x) || 0) + dx, -s.layout.W / 2 + 0.15, s.layout.W / 2 - 0.15), 0.05), z: round(clamp((Number(sel.z) || 0) + dz, -s.layout.D / 2 + 0.15, s.layout.D / 2 - 0.15), 0.05) });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ------------------------------------------------------------- escena 3D */

  const [diffuserCfg, setDiffuserCfg] = useState(() => loadDiffuserConfig());
  useEffect(() => {
    setDiffuserCfg(loadDiffuserConfig());
  }, [opts.mode]);
  const diffuserDesign = useMemo(() => (diffuserCfg ? designFromConfig(diffuserCfg) : null), [diffuserCfg]);

  const palette = useMemo(() => {
    const p = opts.palette;
    return { primary: hexNum(p.primary), secondary: hexNum(p.secondary), neutral: hexNum(p.neutral), accent: hexNum(p.accent), dark: hexNum(p.dark || '#3b3b45'), wood: p.wood, wall: hexNum(p.wall), floor: p.floor };
  }, [opts.palette]);

  const productParams = { ...(PRODUCT_KINDS[opts.product]?.params || PRODUCT_KINDS.qrd.params), ...(opts.productParams[opts.product] || {}) };
  const sun = useMemo(() => sunForHour(opts.sunHour), [opts.sunHour]);
  const syncMaterials = opts.usePolygon && hasProjectPlan && opts.syncSurfaceMaterials !== false;

  const spec = useMemo(() => {
    if (opts.mode === 'room') {
      return {
        kind: 'custom_room',
        usePolygon: true,
        roomPolygon: activePolygon,
        syncSurfaceMaterials: syncMaterials,
        materials: syncMaterials ? materials : null,
        cutMode: 'auto',
        items,
        diffuserDesign,
        night: opts.night,
        palette,
        environment: opts.environment,
        sun,
      };
    }
    if (opts.mode === 'diffuser' && diffuserDesign?.validWidth) return { kind: 'diffuser', design: diffuserDesign, wood: opts.palette.wood };
    return { kind: 'product', item: opts.product, params: productParams, palette };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.mode, activePolygon, syncMaterials, materials, items, diffuserDesign, opts.night, palette, opts.environment, sun, opts.product, opts.productParams, opts.palette.wood]);

  // Recorridos ya armados para la sala actual (dependen de su tamaño)
  useEffect(() => {
    setPresets(viewport.current?.presets() ?? {});
  }, [layout, opts.mode]);

  const flat = opts.mode !== 'room' || opts.environment === 'studio';
  const previewMatte = flat ? (opts.night || isDarkMode ? '#141526' : '#eeecf3') : null;
  const size = SIZES.find((s) => s.id === opts.size) ?? SIZES[0];
  const aspect = size.w / size.h;

  /* ------------------------------------------------------- impacto acústico */

  const acoustic = useMemo(() => {
    const geo = opts.usePolygon && hasProjectPlan && geometry?.volume ? geometry : calculatePolygonGeometry(activePolygon.vertices, activePolygon.height, activePolygon.curvatures || {});
    // Con la planta del proyecto se calcula siempre con sus materiales reales (igual que el resto de la
    // suite), aunque el render no los dibuje; las plantillas usan materiales de referencia
    const onProject = opts.usePolygon && hasProjectPlan;
    const mats = onProject && materials && Object.keys(materials).length ? materials : getDefaultPolygonMaterials(activePolygon.vertices.length);
    const { totalByBand } = calculateSceneObjectsAbsorption(items);
    const base = calculateReverberationTimes(geo.volume, geo.totalSurfaceArea, geo.surfaceAreas, calculateRoomAbsorption(geo.surfaceAreas, geo.totalSurfaceArea, mats, null), mats, includeAirAbsorption, null);
    const treated = calculateReverberationTimes(geo.volume, geo.totalSurfaceArea, geo.surfaceAreas, calculateRoomAbsorption(geo.surfaceAreas, geo.totalSurfaceArea, mats, totalByBand), mats, includeAirAbsorption, totalByBand);
    return { totalByBand, base, treated };
  }, [opts.usePolygon, hasProjectPlan, geometry, activePolygon, materials, items, includeAirAbsorption]);

  /* ----------------------------------------------------------- vistas y recorridos */

  const myPath = opts.shots.length >= 2 ? { id: 'mine', label: 'Mis vistas', hint: 'Une tus vistas guardadas en orden', loop: opts.tourLoop, duration: Math.max(6, opts.shots.length * 4), keys: opts.shots.map((s) => s.pose) } : null;
  const allPaths = { ...presets, ...(myPath ? { mine: myPath } : {}) };

  const play = (path) => {
    if (!path) return;
    if (playing === path.id) {
      viewport.current?.stop();
      return;
    }
    setPlaying(path.id);
    viewport.current?.play(path, { onEnd: () => setPlaying(null) });
  };

  const saveShot = () => {
    const pose = viewport.current?.getPose();
    if (!pose) return;
    const n = opts.shots.length + 1;
    patch({ shots: [...opts.shots, { id: `vista_${Date.now().toString(36)}`, name: `Vista ${n}`, pose }] });
    notify(`Vista ${n} guardada.`);
  };

  /* ------------------------------------------------------------ archivo */

  const saveFile = () => {
    const data = serializeStudio({ opts, items, polygon: activePolygon });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `pozole-estudio-${opts.roomType || 'sala'}-${stamp}.json`);
    setFileMenu(false);
    notify('Proyecto guardado como archivo .json.');
  };

  const openFile = async (file) => {
    if (!file) return;
    try {
      const parsed = parseStudioFile(await file.text());
      viewport.current?.stop();
      commitItems(parsed.items);
      setSelectedItemId(null);
      patch({
        ...parsed.settings,
        palette: { ...DEFAULTS.palette, ...(parsed.settings.palette || {}) },
        usePolygon: false,
        customPolygon: parsed.polygon,
        dims: parsed.dims,
        shots: parsed.shots,
        mode: 'room',
      });
      notify(`Se abrió «${file.name}» con ${parsed.items.length} objetos${parsed.skipped ? ` (${parsed.skipped} no reconocidos)` : ''}.`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setFileMenu(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  const viewTab = VIEW_TABS.find((v) => v.id === viewMode) ?? VIEW_TABS[0];
  const hintVisible = opts.mode === 'room' && !hints[viewMode] && !playing;
  const rt500 = acoustic.base[500]?.sabine || 0;
  const rt500t = acoustic.treated[500]?.sabine || 0;

  return (
    <div className="space-y-3">
      {/* ================================================== barra superior */}
      <div className={`${CARD} px-3 py-2 flex flex-wrap items-center gap-2`}>
        <Segmented
          value={opts.mode}
          onChange={(m) => {
            viewport.current?.stop();
            patch({ mode: m });
            setSelectedItemId(null);
          }}
          options={[
            ['room', 'Sala', Box],
            ['product', 'Pieza', Grid3x3],
            ['diffuser', 'Mi difusor', Wand2],
          ]}
        />

        {opts.mode === 'room' && (
          <div className="order-last sm:order-none w-full sm:w-auto sm:flex-1 flex sm:justify-center overflow-x-auto [scrollbar-width:none]">
            <Segmented value={viewMode} onChange={(m) => setViewMode(m)} options={VIEW_TABS.map((v) => [v.id, v.label, v.icon])} strong />
          </div>
        )}
        {opts.mode !== 'room' && <div className="flex-1" />}

        <div className="flex items-center gap-1.5">
          {opts.mode === 'room' && (
            <>
              <IconButton title="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={undo} icon={Undo2} />
              <IconButton title="Rehacer (Ctrl+Y)" disabled={!canRedo} onClick={redo} icon={Redo2} />
              <div className="relative" data-menu>
                <button type="button" onClick={() => setFileMenu((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${SOFT} ${TITLE} hover:bg-black/[0.06] dark:hover:bg-white/10 cursor-pointer`}>
                  <FolderOpen className="w-3.5 h-3.5" /> Archivo <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
                {fileMenu && (
                  <Menu onClose={() => setFileMenu(false)}>
                    <MenuItem icon={Save} label="Guardar proyecto" hint="Descarga un archivo .json" onClick={saveFile} />
                    <MenuItem icon={FolderOpen} label="Abrir proyecto…" hint="Un .json guardado antes" onClick={() => fileInput.current?.click()} />
                    <MenuItem icon={FilePlus2} label="Empezar sala vacía" hint="Ctrl+Z la devuelve" onClick={() => { setFileMenu(false); applyPreset('empty'); }} />
                    <p className={`px-3 pt-2 pb-1 text-[11px] ${MUTED} border-t ${LINE} mt-1`}>Los cambios también se guardan solos en este navegador.</p>
                  </Menu>
                )}
                <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => openFile(e.target.files?.[0])} />
              </div>
            </>
          )}
          <button type="button" onClick={() => setExportTab('image')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* ================================================== visor */}
        <div className="lg:col-span-8 min-w-0 space-y-2">
          <div className={`${CARD} p-2`}>
            <div className="relative rounded-2xl overflow-hidden mx-auto" style={{ maxWidth: aspect < 1 ? `${aspect * 640}px` : '100%', background: flat ? previewMatte : '#9cb6d4' }}>
              <SceneViewport
                ref={viewport}
                spec={spec}
                selectedItemId={opts.mode === 'room' ? selectedItemId : null}
                onSelectItem={opts.mode === 'room' ? setSelectedItemId : null}
                onMoveItem={opts.mode === 'room' ? updateItem : null}
                mode={opts.mode === 'room' ? viewMode : 'orbit'}
                onModeChange={setViewMode}
                moveTool={viewMode === 'plan' ? 'move' : 'auto'}
                matte={previewMatte}
                aspect={aspect}
                quality={opts.previewQuality}
              >
                {hintVisible && (
                  <div className="absolute top-3 left-3 right-14 sm:right-auto sm:max-w-md hidden sm:flex items-start gap-2 rounded-xl bg-black/55 backdrop-blur px-3 py-2 text-[11.5px] leading-snug text-white/90">
                    <span>{viewTab.hint}</span>
                    <button type="button" aria-label="Ocultar ayuda" onClick={() => { const next = { ...hints, [viewMode]: true }; setHints(next); try { localStorage.setItem(HINTS_KEY, JSON.stringify(next)); } catch { /* */ } }} className="shrink-0 rounded-md p-0.5 hover:bg-white/15 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {playing && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur pl-3 pr-1 py-1 text-[12px] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    {allPaths[playing]?.label ?? 'Recorrido'}
                    <button type="button" onClick={() => viewport.current?.stop()} className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 px-2.5 py-1 font-semibold cursor-pointer">
                      <Square className="w-3 h-3" /> Detener
                    </button>
                  </div>
                )}
                <div className="absolute right-3 bottom-3 flex flex-col gap-1 rounded-2xl bg-black/45 backdrop-blur p-1 text-white">
                  {viewMode !== 'walk' && <OverlayButton title="Acercar" icon={Plus} onClick={() => viewport.current?.zoomBy(1.2)} />}
                  {viewMode !== 'walk' && <OverlayButton title="Alejar" icon={Minus} onClick={() => viewport.current?.zoomBy(1 / 1.2)} />}
                  <OverlayButton title="Volver a la vista inicial" icon={RotateCcw} onClick={() => viewport.current?.resetView()} />
                  {opts.mode === 'room' && <OverlayButton title={opts.night ? 'Ver de día' : 'Ver de noche'} icon={opts.night ? Sun : Moon} onClick={() => patch({ night: !opts.night })} />}
                </div>
                {opts.mode === 'room' && selectedItem && !playing && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-0.5 rounded-full bg-[#141526]/85 backdrop-blur pl-3 pr-1 py-1 text-white shadow-lg max-w-[calc(100%-6rem)]">
                    <span className="truncate text-[12px] font-semibold mr-1.5">{selectedItem.name}</span>
                    {selectedItem.mount !== 'wall' && selectedItem.mount !== 'corner' && <PillButton title="Girar 45° (R)" icon={RotateCw} disabled={selectedItem.locked} onClick={() => rotateItem(selectedItem)} />}
                    <PillButton title="Duplicar (Ctrl+D)" icon={Copy} onClick={() => duplicateItem(selectedItem)} />
                    <PillButton title={selectedItem.locked ? 'Desbloquear (L)' : 'Bloquear (L)'} icon={selectedItem.locked ? Lock : Unlock} onClick={() => toggleLock(selectedItem.id)} />
                    <PillButton title="Eliminar (Supr)" icon={Trash2} disabled={selectedItem.locked} onClick={() => deleteItem(selectedItem.id)} danger />
                    <PillButton title="Quitar selección (Esc)" icon={X} onClick={() => setSelectedItemId(null)} />
                  </div>
                )}
                {toast && (
                  <div className={`absolute left-3 top-3 max-w-[80%] rounded-xl px-3 py-2 text-[12px] font-medium shadow-lg ${toast.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-white/95 text-[#1d1d1f] dark:bg-[#1c1d30]/95 dark:text-white'}`} style={{ marginTop: hintVisible ? 52 : 0 }}>
                    {toast.text}
                  </div>
                )}
              </SceneViewport>
            </div>
          </div>

          {opts.mode === 'room' && (
            <div className={`${CARD} px-4 py-2.5`}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
                <div className="flex items-center gap-1">
                  {(viewMode === 'orbit' || viewMode === 'exterior') &&
                    [
                      ['Esquina', 40, 27],
                      ['Frente', 0, 18],
                      ['Lado', 90, 18],
                      ['Arriba', 40, 68],
                    ].map(([label, az, el]) => (
                      <button key={label} type="button" onClick={() => viewport.current?.frame(az, viewMode === 'exterior' ? Math.min(el, 35) : el)} className={`rounded-lg px-2 py-1 font-medium ${IDLE} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer`}>
                        {label}
                      </button>
                    ))}
                  {viewMode === 'walk' && <span className={MUTED}>Estás dentro de la sala, a la altura de los ojos.</span>}
                  {viewMode === 'plan' && <span className={MUTED}>Vista de planta: arrastra los objetos para acomodarlos.</span>}
                </div>
                <button type="button" onClick={() => setShowBands((v) => !v)} className="inline-flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer">
                  <span className={MUTED}>{opts.usePolygon && hasProjectPlan ? 'Tu sala' : 'Esta plantilla'} · reverberación a 500 Hz</span>
                  <span className={`font-mono ${MUTED}`}>{fmt(rt500, 2)} s</span>
                  <span className={MUTED}>→</span>
                  <span className="font-mono font-semibold text-[#5833c7] dark:text-[#c4b5fd]">{fmt(rt500t, 2)} s</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition ${showBands ? 'rotate-180' : ''} ${MUTED}`} />
                </button>
              </div>
              {showBands && (
                <div className={`mt-2.5 pt-2.5 border-t ${LINE} space-y-2`}>
                  <p className={`text-[11.5px] ${MUTED}`}>
                    Tiempo de reverberación (Sabine) de la sala sola y con los objetos que pusiste. Verde: dentro del rango recomendado para el uso de la sala.
                    {opts.usePolygon && hasProjectPlan
                      ? ' «Sala sola» es el mismo valor que muestra el panel lateral; los objetos solo cuentan allí si activas la opción de abajo.'
                      : ' Es una plantilla con materiales de referencia, no tu proyecto: para comparar con el panel lateral elige «Mi proyecto» en Sala.'}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className={`text-[10.5px] ${MUTED}`}>
                          <th className="py-1 text-left font-sans font-semibold">Banda</th>
                          {OCTAVE_BANDS.map((f) => (
                            <th key={f} className="py-1 text-right font-semibold">{f >= 1000 ? `${f / 1000}k` : f}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className={`py-1 font-sans ${MUTED}`}>Sala sola</td>
                          {OCTAVE_BANDS.map((f) => (
                            <td key={f} className={`py-1 text-right ${MUTED}`}>{fmt(acoustic.base[f]?.sabine, 2)}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className={`py-1 font-sans font-semibold ${TITLE}`}>Con objetos</td>
                          {OCTAVE_BANDS.map((f) => {
                            const rt = acoustic.treated[f]?.sabine || 0;
                            const ok = rt >= (optimumRT?.min ?? 0.3) && rt <= (optimumRT?.max ?? 0.8);
                            return (
                              <td key={f} className={`py-1 text-right font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{fmt(rt, 2)}</td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {onToggleApplySceneObjects && (
                    <Toggle label="Usar estos objetos en los cálculos de toda la suite" checked={applySceneObjectsToProject} onChange={onToggleApplySceneObjects} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================== panel lateral */}
        <div className={`lg:col-span-4 min-w-0 relative ${opts.mode === 'room' ? 'lg:min-h-[540px]' : ''}`}>
          {opts.mode === 'room' && (
            <div className={`${CARD} flex flex-col h-[640px] lg:h-auto lg:absolute lg:inset-0 overflow-hidden`}>
              {selectedItem ? (
                <Inspector
                  item={selectedItem}
                  layout={layout}
                  items={items}
                  palette={opts.palette}
                  onBack={() => setSelectedItemId(null)}
                  onChange={(changes) => updateItem(selectedItem.id, changes)}
                  onDuplicate={() => duplicateItem(selectedItem)}
                  onDelete={() => deleteItem(selectedItem.id)}
                  onToggleLock={() => toggleLock(selectedItem.id)}
                  onFocus={() => viewport.current?.focusItem(selectedItem.id)}
                />
              ) : (
                <>
                  <div className={`grid grid-cols-4 gap-1 p-1.5 m-2 mb-0 rounded-2xl ${SOFT}`}>
                    {[
                      ['add', 'Agregar'],
                      ['room', 'Sala'],
                      ['objects', 'Objetos'],
                      ['tour', 'Recorridos'],
                    ].map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setPanel(id)} className={`rounded-xl py-1.5 text-[12px] font-semibold transition cursor-pointer ${panel === id ? ACTIVE : IDLE}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3.5">
                    {panel === 'add' && <CatalogPanel palette={palette} onAdd={addItem} />}
                    {panel === 'room' && (
                      <RoomPanel
                        opts={opts}
                        patch={patch}
                        layout={layout}
                        hasProjectPlan={hasProjectPlan}
                        applyPreset={applyPreset}
                      />
                    )}
                    {panel === 'objects' && (
                      <ObjectsPanel
                        items={items}
                        onSelect={(id) => {
                          setSelectedItemId(id);
                          viewport.current?.focusItem(id);
                        }}
                        onToggleLock={toggleLock}
                        onToggleVisible={(it) => updateItem(it.id, { enabled: it.enabled === false })}
                        onDelete={deleteItem}
                        onClear={() => applyPreset('empty')}
                      />
                    )}
                    {panel === 'tour' && (
                      <TourPanel
                        presets={presets}
                        myPath={myPath}
                        playing={playing}
                        onPlay={play}
                        onVideo={(path) => {
                          patch({ video: { ...opts.video, path: path.id, duration: null } });
                          setExportTab('video');
                        }}
                        shots={opts.shots}
                        onSaveShot={saveShot}
                        onGoShot={(s) => viewport.current?.setPose(s.pose)}
                        onRenameShot={(id, name) => patch({ shots: opts.shots.map((s) => (s.id === id ? { ...s, name } : s)) })}
                        onDeleteShot={(id) => patch({ shots: opts.shots.filter((s) => s.id !== id) })}
                        loop={opts.tourLoop}
                        onLoop={(v) => patch({ tourLoop: v })}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {opts.mode === 'product' && (
            <div className={`${CARD} p-4 space-y-4`}>
              <h3 className={`text-sm font-bold ${TITLE}`}>Tratamiento individual</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PRODUCT_KINDS).map(([id, k]) => (
                  <button key={id} type="button" onClick={() => patch({ product: id })} className={`rounded-xl border px-2.5 py-2 text-[12px] font-medium text-left transition cursor-pointer ${opts.product === id ? 'border-[#5833c7] bg-[#5833c7]/10 text-[#5833c7] dark:text-[#c4b5fd]' : `${LINE} ${TITLE} hover:border-[#5833c7]/40`}`}>
                    {k.label}
                  </button>
                ))}
              </div>
              {PRODUCT_PRIMES[opts.product] && (
                <Field label="Número primo p">
                  <Segmented value={productParams.p} onChange={(p) => patch({ productParams: { ...opts.productParams, [opts.product]: { ...opts.productParams[opts.product], p } } })} options={PRODUCT_PRIMES[opts.product].map((p) => [p, String(p)])} />
                </Field>
              )}
              {(PRODUCT_FIELDS[opts.product] || PRODUCT_FIELDS.absorber).map(([key, label, min, max, step, unit]) => (
                <Range key={key} label={label} unit={unit} value={productParams[key]} min={min} max={max} step={step} decimals={step >= 1 ? 0 : step >= 0.05 ? 2 : 3} onChange={(v) => patch({ productParams: { ...opts.productParams, [opts.product]: { ...opts.productParams[opts.product], [key]: v } } })} />
              ))}
              <FinishPicker opts={opts} patch={patch} />
            </div>
          )}

          {opts.mode === 'diffuser' && (
            <div className={`${CARD} p-4 space-y-3`}>
              <h3 className={`text-sm font-bold ${TITLE}`}>Mi difusor</h3>
              {diffuserDesign?.validWidth ? (
                <>
                  <p className={`text-xs ${MUTED} leading-relaxed`}>Se dibuja el último diseño de «Diseño de difusores», con sus medidas reales.</p>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Tipo', DIFFUSER_TYPE_LABELS[diffuserDesign.type]],
                      ['Ancho total', `${fmt(diffuserDesign.totalWidth * 100)} cm`],
                      ['Profundidad', `${fmt(diffuserDesign.maxDepth * 100)} cm`],
                      ['Banda', `${diffuserCfg.f0} – ${diffuserDesign.fMax ?? '—'} Hz`],
                    ].map(([k, v]) => (
                      <div key={k} className={`rounded-xl ${SOFT} px-3 py-2`}>
                        <dt className={MUTED}>{k}</dt>
                        <dd className={`font-mono font-semibold ${TITLE}`}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className={`text-xs ${MUTED}`}>Aún no hay un diseño válido guardado.</p>
              )}
              <a href="#diffusers" className="inline-flex text-xs font-semibold text-[#5833c7] dark:text-[#c4b5fd] hover:underline">Abrir el diseñador de difusores →</a>
              <FinishPicker opts={opts} patch={patch} />
            </div>
          )}
        </div>
      </div>

      {exportTab && (
        <ExportDialog
          tab={exportTab}
          setTab={setExportTab}
          onClose={() => setExportTab(null)}
          opts={opts}
          patch={patch}
          viewport={viewport}
          paths={allPaths}
          flat={flat}
          isDarkMode={isDarkMode}
          roomMode={opts.mode === 'room'}
          fileBase={opts.mode === 'room' ? `sala-${opts.roomType || 'pozole'}` : opts.mode === 'diffuser' ? 'mi-difusor' : opts.product}
        />
      )}
    </div>
  );
}

/* ============================================================ panel: catálogo */

function CatalogPanel({ palette, onAdd }) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(ALL_CATALOG_ITEMS)
      .filter((def) => group === 'all' || catalogGroupOf(def) === group)
      .filter((def) => !q || `${def.name} ${def.subtitle ?? ''} ${def.description ?? ''}`.toLowerCase().includes(q));
  }, [group, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar: cama, piano, nevera, panel…" className={`w-full pl-8 pr-8 py-2 rounded-xl ${SOFT} border ${LINE} text-[13px] ${TITLE} focus:outline-none focus:border-[#5833c7]`} />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] cursor-pointer" aria-label="Borrar búsqueda">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
        {CATALOG_GROUPS.map((g) => (
          <button key={g.id} type="button" onClick={() => setGroup(g.id)} className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition cursor-pointer ${group === g.id ? 'bg-[#1d1d1f] text-white dark:bg-white dark:text-[#121322]' : `${SOFT} ${IDLE}`}`}>
            {g.label}
          </button>
        ))}
      </div>
      <p className={`text-[11.5px] ${MUTED}`}>{list.length} objetos · un clic lo agrega frente a la cámara. Si tienes una mesa elegida, los objetos pequeños quedan encima.</p>
      <div className="grid grid-cols-2 gap-2">
        {list.map((def) => (
          <button key={def.id} type="button" onClick={() => onAdd(def.id)} title={def.description || def.subtitle} className={`group text-left rounded-2xl border ${LINE} hover:border-[#5833c7]/60 hover:shadow-sm transition overflow-hidden cursor-pointer bg-[#fbfbfd] dark:bg-[#17192b]`}>
            <Thumb key={`${def.id}|${palette.primary}|${palette.wood}`} typeId={def.id} palette={palette} />
            <div className="px-2.5 pb-2 pt-1">
              <div className={`text-[12px] font-semibold leading-tight ${TITLE} line-clamp-2`}>{def.name}</div>
              <div className={`text-[10.5px] ${MUTED} mt-0.5`}>{def.mount === 'wall' ? 'En muro' : def.mount === 'ceiling' ? 'Del techo' : def.mount === 'corner' ? 'En esquina' : 'En piso'}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Thumb({ typeId, palette }) {
  const ref = useRef(null);
  const [url, setUrl] = useState(() => cachedThumbnail(typeId, { palette }));
  useEffect(() => {
    if (url || !ref.current) return undefined;
    let alive = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        requestThumbnail(typeId, { palette }).then((u) => alive && setUrl(u));
      },
      { rootMargin: '160px' }
    );
    io.observe(ref.current);
    return () => {
      alive = false;
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);
  return (
    <div ref={ref} className="aspect-[4/3] grid place-items-center">
      {url ? <img src={url} alt="" className="w-full h-full object-contain transition group-hover:scale-[1.04]" draggable={false} /> : <div className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.06] animate-pulse" />}
    </div>
  );
}

/* ================================================================= panel: sala */

function RoomPanel({ opts, patch, layout, hasProjectPlan, applyPreset }) {
  const usingPlan = opts.usePolygon && hasProjectPlan;
  return (
    <div className="space-y-5">
      <Section title="Plantilla" hint="Cambia la sala y sus muebles. Se puede deshacer.">
        <div className="grid grid-cols-2 gap-1.5">
          {hasProjectPlan && <PresetCard label="Mi proyecto" hint="La planta que dibujaste" active={usingPlan} onClick={() => applyPreset('project')} />}
          {PRESETS.map((p) => (
            <PresetCard key={p.id} label={p.label} hint={p.hint} active={!usingPlan && !opts.customPolygon && opts.roomType === p.id && p.id !== 'empty'} onClick={() => applyPreset(p.id)} />
          ))}
        </div>
      </Section>

      <Section title="Medidas" hint={`${fmt(layout.W)} × ${fmt(layout.D)} m, ${fmt(layout.H)} m de alto`}>
        {hasProjectPlan && <Toggle label="Usar la planta de mi proyecto" checked={usingPlan} onChange={(v) => patch({ usePolygon: v, customPolygon: v ? null : opts.customPolygon })} />}
        {!usingPlan && opts.customPolygon && (
          <div className={`rounded-xl ${SOFT} px-3 py-2 text-[12px] ${MUTED} flex items-center justify-between gap-2`}>
            Planta abierta desde un archivo.
            <button type="button" onClick={() => patch({ customPolygon: null })} className="font-semibold text-[#5833c7] dark:text-[#c4b5fd] cursor-pointer">Usar medidas libres</button>
          </div>
        )}
        {!usingPlan && !opts.customPolygon && (
          <div className="space-y-2.5">
            {[
              ['W', 'Largo', 2.5, 16],
              ['D', 'Ancho', 2.5, 14],
              ['H', 'Alto', 2.2, 6],
            ].map(([k, label, min, max]) => (
              <Range key={k} label={label} unit="m" value={opts.dims[k]} min={min} max={max} step={0.1} onChange={(v) => patch({ dims: { ...opts.dims, [k]: v } })} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Exterior y luz">
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(ENVIRONMENTS).map(([id, env]) => (
            <button key={id} type="button" onClick={() => patch({ environment: id })} className={`flex items-center gap-2 rounded-xl border p-2 text-left transition cursor-pointer ${opts.environment === id ? 'border-[#5833c7] ring-1 ring-[#5833c7]/40' : `${LINE} hover:border-[#5833c7]/40`}`}>
              <span className="w-8 h-8 rounded-lg shrink-0" style={{ background: ENV_SWATCH[id] }} />
              <span>
                <span className={`block text-[12px] font-semibold ${TITLE}`}>{env.label}</span>
                <span className={`block text-[10.5px] ${MUTED} leading-tight`}>{env.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <Field label="Momento">
          <Segmented value={opts.night ? 'night' : 'day'} onChange={(v) => patch({ night: v === 'night' })} options={[['day', 'Día', Sun], ['night', 'Noche', Moon]]} />
        </Field>
        {!opts.night && opts.environment !== 'studio' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className={MUTED}>Hora del sol</span>
              <span className={`font-mono ${TITLE}`}>{opts.sunHour === null ? 'Automática' : `${Math.floor(opts.sunHour)}:${String(Math.round((opts.sunHour % 1) * 60)).padStart(2, '0')}`}</span>
            </div>
            <input type="range" className="w-full accent-[#5833c7]" min={6.5} max={17.5} step={0.25} value={opts.sunHour ?? 10} onChange={(e) => patch({ sunHour: Number(e.target.value) })} />
            {opts.sunHour !== null && (
              <button type="button" onClick={() => patch({ sunHour: null })} className="text-[11.5px] font-semibold text-[#5833c7] dark:text-[#c4b5fd] cursor-pointer">Volver a la luz automática</button>
            )}
          </div>
        )}
      </Section>

      <Section title="Acabados">
        <FinishPicker opts={opts} patch={patch} withWalls />
      </Section>

      <Section title="Vista previa" hint="Si el equipo va lento, usa «Rápida».">
        <Segmented value={opts.previewQuality} onChange={(v) => patch({ previewQuality: v })} options={Object.entries(PREVIEW_QUALITY).map(([id, q]) => [id, q.label])} full />
        {hasProjectPlan && usingPlan && <Toggle label="Usar los materiales de mi proyecto en muros y piso" checked={opts.syncSurfaceMaterials !== false} onChange={(v) => patch({ syncSurfaceMaterials: v })} />}
      </Section>
    </div>
  );
}

const ENV_SWATCH = {
  garden: 'linear-gradient(180deg,#6fa0e0 0%,#bcd6ee 55%,#6f9a55 56%,#5c8a48 100%)',
  city: 'linear-gradient(180deg,#5d8fd6 0%,#c6d6e6 50%,#9aa3b0 51%,#c7c9cf 100%)',
  sunset: 'linear-gradient(180deg,#35488f 0%,#f2a56c 58%,#8c7a5a 59%,#6c6048 100%)',
  studio: 'linear-gradient(180deg,#f4f2f8 0%,#e3e0ea 100%)',
};

function FinishPicker({ opts, patch, withWalls = false }) {
  const set = (changes) => patch({ palette: { ...opts.palette, name: '', ...changes } });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {THEMES.map((t) => (
          <button key={t.name} type="button" onClick={() => patch({ palette: { ...t } })} className={`inline-flex items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 py-1 text-[11.5px] font-medium transition cursor-pointer ${opts.palette.name === t.name ? 'border-[#5833c7] text-[#5833c7] dark:text-[#c4b5fd]' : `${LINE} ${TITLE}`}`}>
            <span className="flex -space-x-1">
              {[t.primary, t.secondary, t.accent].map((c) => (
                <span key={c} className="w-3 h-3 rounded-full ring-1 ring-white dark:ring-[#121322]" style={{ background: c }} />
              ))}
            </span>
            {t.name}
          </button>
        ))}
      </div>
      {withWalls && (
        <Field label="Piso" stacked>
          <Segmented value={opts.palette.floor} onChange={(v) => set({ floor: v })} options={FLOORS} wrap />
        </Field>
      )}
      <Field label="Madera" stacked>
        <Segmented value={opts.palette.wood} onChange={(v) => set({ wood: v })} options={WOODS} wrap />
      </Field>
      {withWalls && (
        <Field label="Muros">
          <div className="flex items-center gap-1.5">
            {WALLS.map((c) => (
              <button key={c} type="button" aria-label={`Muros ${c}`} onClick={() => set({ wall: c })} className={`w-6 h-6 rounded-full border cursor-pointer ${opts.palette.wall === c ? 'ring-2 ring-[#5833c7] ring-offset-1 dark:ring-offset-[#121322]' : 'border-black/15 dark:border-white/20'}`} style={{ background: c }} />
            ))}
            <input type="color" aria-label="Color libre de muros" value={opts.palette.wall || '#f1eee8'} onChange={(e) => set({ wall: e.target.value })} className="w-6 h-6 rounded-full border-0 bg-transparent p-0 cursor-pointer" />
          </div>
        </Field>
      )}
    </div>
  );
}

/* ============================================================== panel: objetos */

function ObjectsPanel({ items, onSelect, onToggleLock, onToggleVisible, onDelete, onClear }) {
  if (!items.length) return <p className={`text-[13px] ${MUTED} text-center py-10`}>La sala está vacía. Agrega objetos desde «Agregar».</p>;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-[12px] ${MUTED}`}>{items.length} objetos en la sala</span>
        <button type="button" onClick={onClear} className="text-[12px] font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">Vaciar</button>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className={`group flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-black/[0.035] dark:hover:bg-white/[0.05] ${it.enabled === false ? 'opacity-50' : ''}`}>
            <button type="button" onClick={() => onSelect(it.id)} className="flex-1 min-w-0 text-left cursor-pointer">
              <span className={`block truncate text-[12.5px] font-medium ${TITLE}`}>{it.name}{Number(it.count) > 1 ? ` ×${it.count}` : ''}</span>
              <span className={`block text-[10.5px] ${MUTED}`}>{CATALOG_GROUPS.find((g) => g.id === catalogGroupOf(getCatalogItem(it.typeId)))?.label}</span>
            </button>
            {it.locked && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            <div className="flex items-center opacity-60 group-hover:opacity-100">
              <SmallIcon title={it.enabled === false ? 'Mostrar' : 'Ocultar'} icon={it.enabled === false ? EyeOff : Eye} onClick={() => onToggleVisible(it)} />
              <SmallIcon title={it.locked ? 'Desbloquear' : 'Bloquear'} icon={it.locked ? Lock : Unlock} onClick={() => onToggleLock(it.id)} />
              <SmallIcon title="Eliminar" icon={Trash2} disabled={it.locked} onClick={() => onDelete(it.id)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================================================== panel: recorridos */

function TourPanel({ presets, myPath, playing, onPlay, onVideo, shots, onSaveShot, onGoShot, onRenameShot, onDeleteShot, loop, onLoop }) {
  const list = Object.values(presets);
  return (
    <div className="space-y-5">
      <Section title="Recorridos listos" hint="Míralos aquí y conviértelos en video.">
        <div className="space-y-1.5">
          {list.map((p) => (
            <PathRow key={p.id} path={p} playing={playing === p.id} onPlay={() => onPlay(p)} onVideo={() => onVideo(p)} />
          ))}
        </div>
      </Section>
      <Section title="Mis vistas" hint="Guarda encuadres que te gusten; con dos o más se arma tu propio recorrido.">
        <button type="button" onClick={onSaveShot} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#5833c7]/50 py-2 text-[12.5px] font-semibold text-[#5833c7] dark:text-[#c4b5fd] hover:bg-[#5833c7]/5 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Guardar la vista actual
        </button>
        {shots.length > 0 && (
          <ul className="space-y-1">
            {shots.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-black/[0.035] dark:hover:bg-white/[0.05]">
                <span className={`w-5 text-center text-[11px] font-mono ${MUTED}`}>{i + 1}</span>
                <input value={s.name} onChange={(e) => onRenameShot(s.id, e.target.value)} className={`flex-1 min-w-0 bg-transparent text-[12.5px] ${TITLE} focus:outline-none`} />
                <SmallIcon title="Ir a esta vista" icon={Crosshair} onClick={() => onGoShot(s)} />
                <SmallIcon title="Borrar" icon={Trash2} onClick={() => onDeleteShot(s.id)} />
              </li>
            ))}
          </ul>
        )}
        {myPath && (
          <>
            <PathRow path={myPath} playing={playing === 'mine'} onPlay={() => onPlay(myPath)} onVideo={() => onVideo(myPath)} />
            <Toggle label="Volver al inicio al terminar (bucle)" checked={loop} onChange={onLoop} />
          </>
        )}
      </Section>
    </div>
  );
}

function PathRow({ path, playing, onPlay, onVideo }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl border ${LINE} px-3 py-2`}>
      <button type="button" onClick={onPlay} aria-label={playing ? 'Detener' : 'Reproducir'} className={`w-8 h-8 shrink-0 grid place-items-center rounded-full cursor-pointer ${playing ? 'bg-rose-500 text-white' : 'bg-[#5833c7] text-white hover:bg-[#4726aa]'}`}>
        {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-[12.5px] font-semibold ${TITLE}`}>{path.label}</div>
        <div className={`text-[11px] ${MUTED} truncate`}>{path.hint} · {Math.round(path.duration)} s</div>
      </div>
      <button type="button" onClick={onVideo} className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold ${IDLE} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer`}>
        <Film className="w-3.5 h-3.5" /> Video
      </button>
    </div>
  );
}

/* ================================================================== inspector */

function Inspector({ item, layout, items, palette, onBack, onChange, onDuplicate, onDelete, onToggleLock, onFocus }) {
  const def = getCatalogItem(item.typeId);
  const locked = Boolean(item.locked);
  const { W, D, H, walls, corners } = layout;
  const dims = item.dims || {};
  const base = def.defaultDims || {};
  const sabine500 = calculateItemAbsorption(item).byBand[500] || 0;
  const surfaces = items.filter((it) => it.id !== item.id && it.enabled !== false && SUPPORT_SURFACE_SPECS[it.typeId]);
  const canStack = item.mount === 'floor' && !SUPPORT_SURFACE_SPECS[item.typeId] && surfaces.length > 0;
  const dimKeys = Object.keys(dims).filter((k) => typeof dims[k] === 'number' && DIM_LABELS[k] && !(k === 'drop' && item.mount !== 'ceiling'));
  const range = (k) => {
    const ref = Number(base[k]) || Number(dims[k]) || 1;
    if (k === 'drop') return [0.02, Math.max(0.4, H - 1.3)];
    if (k === 'h' && item.mount === 'wall') return [0.15, H - 0.1];
    const max = k === 'w' ? Math.min(Math.max(ref * 2.6, 0.5), item.typeId === 'meeting_table' ? 6 : W) : k === 'd' ? Math.min(Math.max(ref * 2.6, 0.4), D) : Math.min(Math.max(ref * 2.4, 0.3), H);
    return [Math.max(0.02, ref * 0.35), max];
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${LINE}`}>
        <button type="button" onClick={onBack} className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-[12px] font-medium ${IDLE} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer`}>
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <span className={`text-[11px] ${MUTED} ml-auto`}>{CATALOG_GROUPS.find((g) => g.id === catalogGroupOf(def))?.label}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3.5 space-y-5">
        <div className="flex gap-3 items-center">
          <div className={`w-20 shrink-0 rounded-xl ${SOFT}`}>
            <Thumb key={`${item.typeId}|${palette.primary}|${palette.wood}`} typeId={item.typeId} palette={palette} />
          </div>
          <div className="min-w-0 flex-1">
            <input value={item.name} onChange={(e) => onChange({ name: e.target.value })} className={`w-full bg-transparent text-[15px] font-bold ${TITLE} focus:outline-none border-b border-transparent focus:border-[#5833c7]`} />
            <p className={`text-[11.5px] ${MUTED} mt-0.5 line-clamp-2`}>{def.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1">
          <ActionButton icon={Crosshair} label="Centrar" onClick={onFocus} />
          <ActionButton icon={Copy} label="Duplicar" onClick={onDuplicate} />
          <ActionButton icon={locked ? Lock : Unlock} label={locked ? 'Bloqueado' : 'Bloquear'} onClick={onToggleLock} active={locked} />
          <ActionButton icon={item.enabled === false ? EyeOff : Eye} label={item.enabled === false ? 'Oculto' : 'Visible'} onClick={() => onChange({ enabled: item.enabled === false })} />
          <ActionButton icon={Trash2} label="Eliminar" onClick={onDelete} disabled={locked} danger />
        </div>
        {locked && <p className={`text-[11.5px] ${MUTED} -mt-3`}>Está bloqueado: no se mueve ni se borra hasta que lo desbloquees.</p>}

        <fieldset disabled={locked} className="space-y-5 disabled:opacity-60">
          <Section title="Posición">
            {item.mount === 'wall' && (
              <>
                <Field label="Muro">
                  <Segmented value={((Number(item.wallIndex) || 0) % walls.length + walls.length) % walls.length} onChange={(v) => onChange({ wallIndex: v, along: 0 })} options={walls.map((w) => [w.index, `${w.index + 1}`])} wrap />
                </Field>
                <Range label="A lo largo del muro" unit="m" value={Number(item.along) || 0} min={-(walls[Number(item.wallIndex) % walls.length]?.length ?? W) / 2} max={(walls[Number(item.wallIndex) % walls.length]?.length ?? W) / 2} step={0.05} decimals={2} onChange={(v) => onChange({ along: v })} />
                {!FLOOR_ANCHORED.has(item.typeId) && <Range label="Altura del centro" unit="m" value={Number(item.elevation) || 1.35} min={0.2} max={H - 0.15} step={0.05} decimals={2} onChange={(v) => onChange({ elevation: v })} />}
              </>
            )}
            {item.mount === 'corner' && (
              <Field label="Esquina">
                <Segmented value={((Number(item.cornerIndex) || 0) % corners.length + corners.length) % corners.length} onChange={(v) => onChange({ cornerIndex: v })} options={corners.map((c) => [c.index, `${c.index + 1}`])} wrap />
              </Field>
            )}
            {(item.mount === 'floor' || item.mount === 'ceiling' || item.mount === 'free') && (
              <>
                <Range label="Izquierda · derecha" unit="m" value={Number(item.x) || 0} min={-W / 2} max={W / 2} step={0.05} decimals={2} onChange={(v) => onChange({ x: v })} />
                <Range label="Fondo · frente" unit="m" value={Number(item.z) || 0} min={-D / 2} max={D / 2} step={0.05} decimals={2} onChange={(v) => onChange({ z: v })} />
                <Range label="Giro" unit="°" value={(((Number(item.rotation) || 0) % 360) + 360) % 360} min={0} max={345} step={15} decimals={0} onChange={(v) => onChange({ rotation: v })} />
                {item.mount === 'floor' && <Range label="Altura sobre el piso" unit="m" value={Number(item.y) || 0} min={0} max={Math.max(0.5, H - 0.4)} step={0.01} decimals={2} onChange={(v) => onChange({ y: v })} />}
              </>
            )}
            {canStack && (
              <Field label="Poner sobre" stacked>
                <div className="flex flex-wrap gap-1">
                  <Chip active={(Number(item.y) || 0) < 0.02} onClick={() => onChange({ y: 0 })}>El piso</Chip>
                  {surfaces.slice(0, 6).map((s) => {
                    const lv = getSupportSurfaceLevels(s);
                    const top = lv[lv.length - 1];
                    return (
                      <Chip key={s.id} active={Math.hypot((Number(s.x) || 0) - (Number(item.x) || 0), (Number(s.z) || 0) - (Number(item.z) || 0)) < 0.3 && Math.abs((Number(item.y) || 0) - top.y) < 0.04} onClick={() => onChange({ x: Number(s.x) || 0, z: Number(s.z) || 0, y: top.y, rotation: Number(s.rotation) || 0 })}>
                        {s.name}
                      </Chip>
                    );
                  })}
                </div>
              </Field>
            )}
          </Section>

          {(dimKeys.length > 0 || Object.keys(INT_DIMS).some((k) => dims[k] !== undefined)) && (
            <Section title="Tamaño">
              {dimKeys.map((k) => {
                const [min, max] = range(k);
                return <Range key={k} label={DIM_LABELS[k]} unit="m" value={Number(dims[k])} min={round(min, 0.01)} max={round(max, 0.05)} step={k === 'drop' ? 0.02 : 0.01} decimals={2} onChange={(v) => onChange({ dims: { [k]: v } })} />;
              })}
              {Object.entries(INT_DIMS)
                .filter(([k]) => typeof dims[k] === 'number')
                .map(([k, [label, min, max]]) => (
                  <Range key={k} label={label} unit="" value={Number(dims[k])} min={min} max={max} step={1} decimals={0} onChange={(v) => onChange({ dims: { [k]: v } })} />
                ))}
              {(def.category === 'panels' || def.category === 'diffusers' || REPEATABLE.has(item.typeId)) && (
                <Range label="Cantidad en fila" unit="" value={Number(item.count) || 1} min={1} max={8} step={1} decimals={0} onChange={(v) => onChange({ count: v })} />
              )}
              {Object.entries(BOOL_DIMS)
                .filter(([k]) => typeof dims[k] === 'boolean')
                .map(([k, label]) => (
                  <Toggle key={k} label={label} checked={dims[k]} onChange={(v) => onChange({ dims: { [k]: v } })} />
                ))}
              {typeof dims.screenKind === 'string' && (
                <Field label="Pantalla" stacked>
                  <Segmented value={dims.screenKind} onChange={(v) => onChange({ dims: { screenKind: v } })} options={SCREEN_KINDS} wrap />
                </Field>
              )}
            </Section>
          )}

          <Section title="Apariencia">
            {def.finishes && (
              <Field label="Serie" stacked>
                <div className="grid grid-cols-2 gap-1.5">
                  {def.finishes.map((f) => (
                    <button key={f} type="button" onClick={() => onChange({ dims: { finish: f } })} className={`rounded-xl border px-2.5 py-1.5 text-left cursor-pointer ${dims.finish === f ? 'border-[#5833c7] ring-1 ring-[#5833c7]/40' : `${LINE} hover:border-[#5833c7]/40`}`}>
                      <span className={`block text-[12px] font-semibold ${TITLE}`}>{AUDIO_FINISHES[f].label}</span>
                      <span className={`block text-[10.5px] ${MUTED} leading-tight`}>{AUDIO_FINISHES[f].hint}</span>
                    </button>
                  ))}
                </div>
              </Field>
            )}
            <Field label="Color" stacked>
              <div className="flex flex-wrap items-center gap-1">
                {COLOR_ROLES.map(([role, label]) => (
                  <Chip key={role} active={(item.colorRole || 'primary') === role} onClick={() => onChange({ colorRole: role })}>
                    {role !== 'custom' && <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-[-1px] ring-1 ring-black/10" style={{ background: `#${(palette[role] ?? 0).toString(16).padStart(6, '0')}` }} />}
                    {label}
                  </Chip>
                ))}
                {item.colorRole === 'custom' && <input type="color" aria-label="Color libre" value={item.customColor || '#7464cc'} onChange={(e) => onChange({ customColor: e.target.value })} className="w-7 h-6 rounded border-0 bg-transparent cursor-pointer" />}
              </div>
            </Field>
            <Field label="Madera" stacked>
              <Segmented value={item.wood || ''} onChange={(v) => onChange({ wood: v || null })} options={[['', 'La de la sala'], ...WOODS]} wrap />
            </Field>
          </Section>

          <Section title="Acústica">
            {item.coefficients ? (
              <Range
                label="Absorción a 500 Hz (α)"
                unit=""
                value={item.coefficients[500] ?? 0.7}
                min={0.05}
                max={0.99}
                step={0.01}
                decimals={2}
                onChange={(v) =>
                  onChange({
                    coefficients: { 125: clamp(v * 0.45, 0.05, 0.99), 250: clamp(v * 0.75, 0.05, 0.99), 500: v, 1000: clamp(v * 1.05, 0.05, 0.99), 2000: clamp(v * 1.05, 0.05, 0.99), 4000: clamp(v, 0.05, 0.99) },
                  })
                }
              />
            ) : null}
            <p className={`text-[12px] ${MUTED}`}>
              Aporta unos <span className={`font-mono font-semibold ${TITLE}`}>{fmt(sabine500, 2)} m²</span> de absorción a 500 Hz{Number(item.count) > 1 ? ` (las ${item.count} piezas)` : ''}.
            </p>
          </Section>
        </fieldset>
      </div>
    </div>
  );
}

/* ============================================================= exportación */

function ExportDialog({ tab, setTab, onClose, opts, patch, viewport, paths, flat, isDarkMode, roomMode, fileBase }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const size = SIZES.find((s) => s.id === opts.size) ?? SIZES[0];
  const iq = IMAGE_QUALITIES.find((q) => q.id === opts.imageQuality) ?? IMAGE_QUALITIES[1];
  const video = opts.video;
  const pathList = Object.values(paths);
  const path = paths[video.path] ?? pathList[0];
  const vs = VIDEO_SIZES.find((s) => s.id === video.size) ?? VIDEO_SIZES[1];
  const vq = VIDEO_QUALITIES.find((q) => q.id === video.quality) ?? VIDEO_QUALITIES[1];
  const duration = video.duration ?? path?.duration ?? 12;
  const setVideo = (changes) => patch((o) => ({ video: { ...o.video, ...changes } }));

  useEffect(() => () => result?.url && URL.revokeObjectURL(result.url), [result]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const matteFor = () => (flat ? (opts.transparent ? null : opts.night || isDarkMode ? '#141526' : '#f3f1f7') : null);

  const renderImage = async () => {
    setBusy(true);
    setProgress(0);
    setError(null);
    setResult(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const type = opts.format === 'jpg' ? 'image/jpeg' : opts.format === 'webp' ? 'image/webp' : 'image/png';
      const blob = await viewport.current.renderImage({ width: size.w, height: size.h, samples: iq.samples, type, quality: 0.93, matte: opts.format === 'png' ? matteFor() : matteFor() ?? '#f3f1f7', signal: ctrl.signal, onProgress: setProgress, dof: opts.dof });
      if (!blob) return;
      const name = `pozole-${fileBase}-${size.w}x${size.h}.${opts.format}`;
      downloadBlob(blob, name);
      setResult({ kind: 'image', url: URL.createObjectURL(blob), name, kb: Math.round(blob.size / 1024) });
    } catch (err) {
      setError(err.message || 'No se pudo renderizar la imagen.');
    } finally {
      setBusy(false);
    }
  };

  const renderVideo = async () => {
    if (!path) return;
    setBusy(true);
    setProgress(0);
    setError(null);
    setResult(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const out = await viewport.current.renderVideo({ path: { ...path, duration }, width: vs.w, height: vs.h, fps: 30, samples: vq.samples, bitrate: vs.bitrate, matte: matteFor() ?? '#f3f1f7', signal: ctrl.signal, onProgress: setProgress });
      if (!out) return;
      const name = `pozole-recorrido-${path.id}-${vs.id}p.${out.ext}`;
      downloadBlob(out.blob, name);
      setResult({ kind: 'video', url: URL.createObjectURL(out.blob), name, kb: Math.round(out.blob.size / 1024) });
    } catch (err) {
      setError(err.message || 'No se pudo crear el video.');
    } finally {
      setBusy(false);
    }
  };

  const frames = Math.round(duration * 30);
  const estimate = Math.max(5, Math.round((frames * vq.samples * (vs.w > 1500 ? 0.028 : 0.016) + frames * 0.012) / 5) * 5);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 backdrop-blur-[2px] p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className={`${CARD} w-full max-w-[540px] max-h-[92vh] overflow-y-auto p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <Segmented
            value={tab}
            onChange={(t) => {
              if (!busy) {
                setTab(t);
                setResult(null);
              }
            }}
            options={[['image', 'Imagen', ImageIcon], ...(roomMode ? [['video', 'Video', Film]] : [])]}
            strong
          />
          <IconButton title="Cerrar" icon={X} onClick={onClose} disabled={busy} />
        </div>

        {tab === 'image' && (
          <div className="space-y-4">
            <p className={`text-[12.5px] ${MUTED}`}>Se renderiza exactamente lo que ves en el visor, con más pasadas para afinar sombras y bordes.</p>
            <Field label="Formato de imagen" stacked>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZES.map((s) => (
                  <button key={s.id} type="button" onClick={() => patch({ size: s.id })} className={`rounded-xl border px-2 py-2 text-center cursor-pointer ${opts.size === s.id ? 'border-[#5833c7] ring-1 ring-[#5833c7]/40' : `${LINE} hover:border-[#5833c7]/40`}`}>
                    <span className="mx-auto mb-1 block rounded-[3px] border-2 border-current opacity-60" style={{ width: s.w >= s.h ? 26 : 26 * (s.w / s.h), height: s.w >= s.h ? 26 * (s.h / s.w) : 26 }} />
                    <span className={`block text-[11.5px] font-semibold ${TITLE}`}>{s.label}</span>
                    <span className={`block text-[10px] ${MUTED}`}>{s.w}×{s.h}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Calidad">
              <Segmented value={opts.imageQuality} onChange={(v) => patch({ imageQuality: v })} options={IMAGE_QUALITIES.map((q) => [q.id, q.label])} />
            </Field>
            <Field label="Archivo">
              <Segmented value={opts.format} onChange={(v) => patch({ format: v })} options={[['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP']]} />
            </Field>
            <Field label="Desenfoque de cámara">
              <Segmented value={opts.dof ?? 'none'} onChange={(v) => patch({ dof: v })} options={[['none', 'Ninguno'], ['soft', 'Suave'], ['strong', 'Marcado']]} />
            </Field>
            {opts.dof && opts.dof !== 'none' && <p className={`text-[11.5px] ${MUTED} -mt-2`}>Enfoca el objeto que tengas seleccionado (o lo del centro de la imagen); lo de adelante y atrás se suaviza como en una foto. Con calidad Alta o Máxima se ve más limpio.</p>}
            {flat && opts.format === 'png' && <Toggle label="Fondo transparente" checked={opts.transparent} onChange={(v) => patch({ transparent: v })} />}
            <PrimaryAction busy={busy} progress={progress} onClick={renderImage} onCancel={() => abortRef.current?.abort()} icon={Download} label="Renderizar y descargar" />
          </div>
        )}

        {tab === 'video' && (
          <div className="space-y-4">
            <p className={`text-[12.5px] ${MUTED}`}>El video se dibuja cuadro por cuadro, así que sale fluido aunque el equipo sea lento. Mientras se crea, no cierres la pestaña.</p>
            <Field label="Recorrido" stacked>
              <div className="grid grid-cols-2 gap-1.5">
                {pathList.map((p) => (
                  <button key={p.id} type="button" onClick={() => setVideo({ path: p.id, duration: null })} className={`rounded-xl border px-2.5 py-2 text-left cursor-pointer ${path?.id === p.id ? 'border-[#5833c7] ring-1 ring-[#5833c7]/40' : `${LINE} hover:border-[#5833c7]/40`}`}>
                    <span className={`block text-[12px] font-semibold ${TITLE}`}>{p.label}</span>
                    <span className={`block text-[10.5px] ${MUTED} leading-tight`}>{p.hint}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Range label="Duración" unit="s" value={duration} min={5} max={40} step={1} decimals={0} onChange={(v) => setVideo({ duration: v })} />
            <Field label="Resolución">
              <Segmented value={vs.id} onChange={(v) => setVideo({ size: v })} options={VIDEO_SIZES.map((s) => [s.id, s.label])} />
            </Field>
            <Field label="Calidad">
              <Segmented value={vq.id} onChange={(v) => setVideo({ quality: v })} options={VIDEO_QUALITIES.map((q) => [q.id, q.label])} />
            </Field>
            <p className={`text-[11.5px] ${MUTED}`}>{frames} cuadros a 30 por segundo · tardará alrededor de {estimate >= 60 ? `${Math.round(estimate / 60)} min` : `${estimate} s`} en este equipo.</p>
            <PrimaryAction busy={busy} progress={progress} onClick={renderVideo} onCancel={() => abortRef.current?.abort()} icon={Film} label="Crear video" />
          </div>
        )}

        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-700 dark:text-rose-300">{error}</p>}
        {result && (
          <div className={`rounded-2xl border ${LINE} p-2 space-y-2`}>
            {result.kind === 'image' ? <img src={result.url} alt="Render" className="w-full rounded-xl" /> : <video src={result.url} className="w-full rounded-xl" controls autoPlay loop muted playsInline />}
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <span className={`text-[11.5px] ${MUTED} truncate`}>
                <Check className="w-3.5 h-3.5 inline text-emerald-500 mr-1" />
                {result.name} · {result.kb >= 1024 ? `${fmt(result.kb / 1024, 1)} MB` : `${result.kb} KB`}
              </span>
              <a href={result.url} download={result.name} className="shrink-0 text-[12px] font-semibold text-[#5833c7] dark:text-[#c4b5fd] hover:underline">Descargar otra vez</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryAction({ busy, progress = 0, onClick, onCancel, icon: Icon, label }) {
  return busy ? (
    <div className="flex gap-2">
      <div className="relative flex-1 overflow-hidden rounded-xl bg-[#5833c7]/25 py-2.5 text-center text-[13px] font-bold text-[#3d2394] dark:text-white">
        <div className="absolute inset-y-0 left-0 bg-[#5833c7]/45 transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
        <span className="relative">Trabajando… {Math.round(progress * 100)} %</span>
      </div>
      <button type="button" onClick={onCancel} className={`rounded-xl px-3 text-[12.5px] font-semibold ${SOFT} ${TITLE} cursor-pointer`}>Cancelar</button>
    </div>
  ) : (
    <button type="button" onClick={onClick} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] py-2.5 text-[13px] font-bold text-white cursor-pointer">
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

/* ===================================================== controles pequeños */

function Segmented({ value, onChange, options, strong = false, full = false, wrap = false }) {
  return (
    <div className={`${full ? 'grid' : wrap ? 'flex flex-wrap' : 'inline-flex'} gap-0.5 rounded-xl ${SOFT} p-0.5`} style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` } : undefined}>
      {options.map(([id, label, Icon]) => (
        <button key={String(id)} type="button" onClick={() => onChange(id)} className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] px-2.5 ${strong ? 'py-1.5 text-[12.5px]' : 'py-1 text-[12px]'} font-semibold transition cursor-pointer ${value === id ? ACTIVE : IDLE}`}>
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h4 className={`text-[12.5px] font-bold ${TITLE}`}>{title}</h4>
        {hint && <p className={`text-[11.5px] ${MUTED}`}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, stacked = false }) {
  return (
    <div className={stacked ? 'space-y-1.5' : 'flex items-center justify-between gap-3'}>
      <span className={`text-[12px] ${MUTED}`}>{label}</span>
      {children}
    </div>
  );
}

function Range({ label, unit, value, min, max, step, decimals = 1, onChange }) {
  const v = Number(value) || 0;
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-[12px]">
        <span className={MUTED}>{label}</span>
        <span className={`font-mono ${TITLE}`}>
          {fmt(v, decimals)}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input type="range" className="w-full accent-[#5833c7]" min={min} max={max} step={step} value={clamp(v, min, max)} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-left ${SOFT} ${TITLE} cursor-pointer`}>
      {label}
      <span className={`relative w-8 h-[18px] rounded-full shrink-0 transition ${checked ? 'bg-[#5833c7]' : 'bg-black/15 dark:bg-white/15'}`}>
        <span className={`absolute top-[3px] w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-[17px]' : 'left-[3px]'}`} />
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-2 py-1 text-[11.5px] font-medium transition cursor-pointer ${active ? 'bg-[#5833c7] text-white' : `${SOFT} ${IDLE}`}`}>
      {children}
    </button>
  );
}

function PresetCard({ label, hint, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border px-2.5 py-2 text-left transition cursor-pointer ${active ? 'border-[#5833c7] ring-1 ring-[#5833c7]/40' : `${LINE} hover:border-[#5833c7]/40`}`}>
      <span className={`block text-[12px] font-semibold ${TITLE}`}>{label}</span>
      <span className={`block text-[10.5px] ${MUTED}`}>{hint}</span>
    </button>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled = false, active = false, danger = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px] font-medium transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${active ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : danger ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10' : `${IDLE} hover:bg-black/[0.04] dark:hover:bg-white/[0.06]`}`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function IconButton({ icon: Icon, title, onClick, disabled = false }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`p-2 rounded-xl ${IDLE} hover:bg-black/[0.05] dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer`}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

function SmallIcon({ icon: Icon, title, onClick, disabled = false }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className="p-1 rounded-lg text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer">
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function OverlayButton({ icon: Icon, title, onClick }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="p-1.5 rounded-xl hover:bg-white/15 cursor-pointer">
      <Icon className="w-4 h-4" />
    </button>
  );
}

function PillButton({ icon: Icon, title, onClick, disabled = false, danger = false }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`p-1.5 rounded-full disabled:opacity-30 cursor-pointer ${danger ? 'hover:bg-rose-500/30 text-rose-200' : 'hover:bg-white/15'}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Menu({ children, onClose }) {
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest?.('[data-menu]')) onClose();
    };
    const t = setTimeout(() => window.addEventListener('pointerdown', close), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', close);
    };
  }, [onClose]);
  return (
    <div className={`absolute right-0 mt-2 w-64 z-40 rounded-2xl bg-white dark:bg-[#16182b] border ${LINE} shadow-2xl p-1.5`}>
      {children}
    </div>
  );
}

function MenuItem({ icon: Icon, label, hint, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer">
      <Icon className={`w-4 h-4 mt-0.5 ${MUTED}`} />
      <span>
        <span className={`block text-[12.5px] font-semibold ${TITLE}`}>{label}</span>
        <span className={`block text-[11px] ${MUTED}`}>{hint}</span>
      </span>
    </button>
  );
}

