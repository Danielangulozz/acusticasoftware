import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Armchair,
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Film,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  Lock,
  Maximize2,
  Moon,
  MousePointer,
  Move,
  Palette,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Search,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Unlock,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import RenderViewport from '../../render/RenderViewport';
import { PRODUCT_KINDS, ROOM_TYPES, defaultViewFor } from '../../render/scenes';
import { getPolygonLayout, sampleWallPoint } from '../../render/kit';
import {
  DIFFUSER_CATALOG,
  FURNITURE_CATALOG,
  PANEL_CATALOG,
  ROOM_PRESET_STYLES,
  SUPPORT_SURFACE_SPECS,
  calculateItemAbsorption,
  calculateSceneObjectsAbsorption,
  createSceneItem,
  findSupportingSurface,
  generateStarterSceneItems,
  getCatalogItem,
  getSupportSurfaceLevels,
} from '../../render/catalog';
import {
  OCTAVE_BANDS,
  calculatePolygonGeometry,
  calculateReverberationTimes,
  calculateRoomAbsorption,
} from '../../utils/acousticCalculations';
import { DEFAULT_MATERIALS_DATABASE, getDefaultPolygonMaterials } from '../../utils/defaultMaterials';
import { loadRenderOptsFromCookie, saveRenderOptsToCookie } from '../../utils/cookieStorage';
import { DIFFUSER_TYPE_LABELS, designFromConfig, loadDiffuserConfig } from '../diffusers/diffuserConfig';

/**
 * Estudio de Renders y Diseño Acústico 3D — POZOLE Suite
 *
 * Interfaz centrada en el Viewport 3D (sin necesidad de hacer scroll fuera del visor):
 *  - Sincronización en cookies y localStorage de materiales de superficie y opciones de render.
 *  - Altura de separación del techo ajustable (`dims.drop`) con cables tensores dinámicos.
 *  - Puertas visibles en AMBOS lados de la pared (vano 3D real cortado en el muro) y ventanales panorámicos.
 *  - Amplio catálogo de objetos reales (TV, TV con base móvil, laptop, PC, cámaras, luces de estudio/sala,
 *    sillas de colegio con brazo, estanterías medias alargables, mesas de juntas alargables hasta 6 m).
 *  - Colocación de objetos sobre mesas y estanterías (detección automática en 3D/2D + selector de repisa).
 *  - Atajos de teclado: Ctrl+Z (Deshacer), Ctrl+Y (Rehacer), Supr (Borrar), Ctrl+D (Duplicar), R (Rotar), L (Bloquear).
 *  - Opción de Bloquear objetos (`locked`) para evitar movimientos accidentales.
 *  - Vista Cinemática en 1ª Persona que ENTRA realmente al recinto y recorre la ruta trazada en planta.
 */

const STORAGE_KEY = 'pozole_render_studio_v4';

const CARD =
  'bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm transition-colors';
const TITLE = 'text-[#1d1d1f] dark:text-white';
const MUTED = 'text-[#86868b] dark:text-slate-400';
const CHIP_ON =
  'border-[#5833c7] bg-[#5833c7]/10 dark:bg-[#5833c7]/25 text-[#5833c7] dark:text-[#c4b5fd]';
const CHIP_OFF =
  'border-black/[0.08] dark:border-white/10 text-[#1d1d1f] dark:text-slate-300 hover:border-[#5833c7]/40';

const PERF_MODES = [
  {
    id: 'eco',
    label: 'Ligero',
    badge: '⚡ Ligero',
    desc: 'Vista previa instantánea de bajo consumo de GPU/batería',
    previewMax: 540,
    previewSamples: 4,
    shadowSize: 512,
    skipBloom: true,
    debounceMs: 45,
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    badge: '⚖️ Fluido',
    desc: 'Equilibrio óptimo entre fluidez al mover y sombras suaves',
    previewMax: 760,
    previewSamples: 24,
    shadowSize: 1024,
    skipBloom: false,
    debounceMs: 80,
  },
  {
    id: 'ultra',
    label: 'Detallado',
    badge: '✨ Ultra',
    desc: 'Acumulación progresiva completa con oclusión ambiental y bloom',
    previewMax: 960,
    previewSamples: 72,
    shadowSize: 1024,
    skipBloom: false,
    debounceMs: 110,
  },
];

const THEMES = [
  {
    name: 'POZOLE',
    primary: '#7464cc',
    secondary: '#b3a7ec',
    neutral: '#e9e2d3',
    accent: '#d9a441',
    dark: '#3b3b45',
    wood: 'oak',
    wall: '#f1eee8',
    floor: 'planks',
  },
  {
    name: 'Académico',
    primary: '#2563eb',
    secondary: '#93c5fd',
    neutral: '#f1f5f9',
    accent: '#f59e0b',
    dark: '#334155',
    wood: 'birch',
    wall: '#f4f6f8',
    floor: 'tiles',
  },
  {
    name: 'Industrial',
    primary: '#1d4ed8',
    secondary: '#64748b',
    neutral: '#cbd5e1',
    accent: '#ea580c',
    dark: '#1e293b',
    wood: 'oak',
    wall: '#d6d9de',
    floor: 'concrete',
  },
  {
    name: 'Cine Oscuro',
    primary: '#8b5cf6',
    secondary: '#6366f1',
    neutral: '#cbd5e1',
    accent: '#f59e0b',
    dark: '#1e1b2e',
    wood: 'walnut',
    wall: '#45434f',
    floor: 'carpet',
  },
  {
    name: 'Bosque',
    primary: '#3f7f6b',
    secondary: '#a9cdb9',
    neutral: '#ece7da',
    accent: '#c98a3d',
    dark: '#2d3b36',
    wood: 'ash',
    wall: '#eef0ea',
    floor: 'planks',
  },
];

const WOODS = [
  ['oak', 'Roble'],
  ['walnut', 'Nogal'],
  ['birch', 'Abedul'],
  ['ash', 'Fresno'],
];
const FLOORS = [
  ['planks', 'Madera'],
  ['walnut', 'Nogal'],
  ['carpet', 'Alfombra'],
  ['tiles', 'Baldosa'],
  ['concrete', 'Concreto'],
];
const WALLS = ['#f1eee8', '#f4f6f8', '#dfe5dc', '#d6d9de', '#45434f'];

const COLOR_ROLES = [
  ['primary', 'Principal'],
  ['secondary', 'Secundario'],
  ['neutral', 'Neutro'],
  ['accent', 'Acento'],
  ['dark', 'Oscuro'],
  ['custom', 'Color libre'],
];

const SIZES = [
  { id: '4:3', label: 'Horizontal 4:3', w: 2000, h: 1500 },
  { id: '16:9', label: 'Panorámico 16:9', w: 1920, h: 1080 },
  { id: '1:1', label: 'Cuadrado 1:1', w: 1500, h: 1500 },
  { id: '4:5', label: 'Vertical 4:5', w: 1200, h: 1500 },
];
const QUALITIES = [
  { id: 'rapida', label: 'Rápida', samples: 90 },
  { id: 'alta', label: 'Alta', samples: 220 },
  { id: 'maxima', label: 'Máxima', samples: 420 },
];
const BACKGROUNDS = [
  { id: 'landscape', label: '🏞️ Paisaje' },
  { id: 'city', label: '🌆 Ciudad' },
  { id: 'sunset', label: '🌅 Atardecer' },
  { id: 'studio', label: '📸 Estudio' },
  { id: 'transparent', label: '🏁 Transp.' },
  { id: '#f5f5f7', label: '☀️ Claro' },
  { id: '#08080c', label: '🌙 Oscuro' },
];
const CAMERAS = [
  { label: 'Esquina', view: { firstPerson: false, azimuth: 40, elevation: 27, targetX: 0, targetZ: 0 } },
  { label: 'Frontal', view: { firstPerson: false, azimuth: 2, elevation: 20, targetX: 0, targetZ: 0 } },
  { label: 'Lateral', view: { firstPerson: false, azimuth: 86, elevation: 20, targetX: 0, targetZ: 0 } },
  { label: 'Cenital', view: { firstPerson: false, azimuth: 40, elevation: 68, targetX: 0, targetZ: 0 } },
];

// Paradas por defecto dentro del recinto (coordenadas normalizadas respecto a W y D para adaptarse a cualquier sala)
function createDefaultInteriorWaypoints(W = 5.4, D = 4.4) {
  const rx = Math.max(0.8, W * 0.3);
  const rz = Math.max(0.8, D * 0.3);
  return [
    { id: 'wp1', label: 'Entrada', x: -rx, z: rz, lookX: 0, lookZ: -rz * 0.5 },
    { id: 'wp2', label: 'Frente Izq.', x: -rx, z: -rz, lookX: rx * 0.5, lookZ: 0 },
    { id: 'wp3', label: 'Frente Der.', x: rx, z: -rz, lookX: 0, lookZ: rz * 0.5 },
    { id: 'wp4', label: 'Fondo Der.', x: rx, z: rz, lookX: -rx * 0.5, lookZ: -rz * 0.3 },
  ];
}

// Controles para el modo «Pieza suelta»
const PRODUCT_FIELDS = {
  absorber: [
    ['w', 'Ancho', 0.4, 1.2, 0.05, 'm'],
    ['h', 'Alto', 0.4, 2.4, 0.05, 'm'],
    ['t', 'Espesor', 0.03, 0.12, 0.005, 'm'],
  ],
  foam: [
    ['w', 'Ancho', 0.4, 1.2, 0.05, 'm'],
    ['h', 'Alto', 0.4, 1.2, 0.05, 'm'],
    ['t', 'Espesor', 0.03, 0.1, 0.005, 'm'],
  ],
  perforated: [
    ['w', 'Ancho', 0.5, 1.5, 0.05, 'm'],
    ['h', 'Alto', 0.6, 2.4, 0.05, 'm'],
    ['t', 'Espesor', 0.04, 0.1, 0.005, 'm'],
  ],
  membrane: [
    ['w', 'Ancho', 0.5, 1.2, 0.05, 'm'],
    ['h', 'Alto', 0.6, 2.0, 0.05, 'm'],
    ['t', 'Profundidad', 0.08, 0.22, 0.01, 'm'],
  ],
  trap: [
    ['side', 'Lado', 0.3, 0.7, 0.02, 'm'],
    ['h', 'Alto', 0.8, 2.6, 0.05, 'm'],
  ],
  tube: [
    ['r', 'Radio', 0.15, 0.35, 0.01, 'm'],
    ['h', 'Alto', 0.8, 2.4, 0.05, 'm'],
  ],
  qrd: [
    ['periods', 'Períodos', 1, 3, 1, ''],
    ['h', 'Alto', 0.4, 2.4, 0.05, 'm'],
    ['depth', 'Profundidad', 0.08, 0.3, 0.01, 'm'],
  ],
  skyline: [
    ['cell', 'Lado del bloque', 0.05, 0.12, 0.005, 'm'],
    ['maxH', 'Altura máxima', 0.08, 0.3, 0.01, 'm'],
  ],
  prd: [
    ['periods', 'Períodos', 1, 3, 1, ''],
    ['h', 'Alto', 0.4, 2.4, 0.05, 'm'],
    ['depth', 'Profundidad', 0.08, 0.3, 0.01, 'm'],
  ],
  mls: [
    ['periods', 'Períodos', 1, 3, 1, ''],
    ['h', 'Alto', 0.4, 2.4, 0.05, 'm'],
    ['depth', 'Profundidad', 0.05, 0.2, 0.01, 'm'],
  ],
  poly: [
    ['count', 'Cilindros', 1, 5, 1, ''],
    ['chord', 'Cuerda', 0.3, 0.9, 0.05, 'm'],
    ['sag', 'Flecha', 0.04, 0.25, 0.01, 'm'],
    ['h', 'Alto', 0.6, 2.4, 0.05, 'm'],
  ],
  slats: [
    ['w', 'Ancho', 0.4, 2.4, 0.05, 'm'],
    ['h', 'Alto', 0.6, 2.6, 0.05, 'm'],
  ],
  cloud: [
    ['count', 'Paneles', 1, 2, 1, ''],
    ['w', 'Largo', 0.6, 1.8, 0.05, 'm'],
    ['d', 'Ancho', 0.4, 1.2, 0.05, 'm'],
  ],
};
const PRODUCT_PRIMES = { qrd: [5, 7, 11, 13], skyline: [5, 7, 11], prd: [5, 7, 11, 13] };

const DEFAULTS = {
  mode: 'room',
  perfMode: 'balanced',
  usePolygon: true,
  syncSurfaceMaterials: true,
  cutMode: 'auto',
  roomType: 'studio',
  dims: { ...ROOM_TYPES.studio.dims },
  product: 'qrd',
  productParams: {},
  palette: { ...THEMES[0] },
  night: false,
  size: '4:3',
  quality: 'alta',
  background: 'landscape',
  format: 'png',
};

const hex = (value) => parseInt(String(value || '#7464cc').replace('#', ''), 16);
const fmt = (v, d = 1) => Number(v || 0).toFixed(d).replace('.', ',');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function loadState() {
  try {
    const cookieOpts = loadRenderOptsFromCookie(null);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || cookieOpts;
    if (!saved) return DEFAULTS;
    return {
      ...DEFAULTS,
      ...saved,
      dims: { ...DEFAULTS.dims, ...(saved.dims || {}) },
      palette: { ...DEFAULTS.palette, ...(saved.palette || {}) },
    };
  } catch {
    return DEFAULTS;
  }
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
  // 3 pestañas limpias en el dock lateral: 'catalog' | 'plan' | 'room'
  const [dockTab, setDockTab] = useState('catalog');
  const [catalogGroup, setCatalogGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [interactionMode, setInteractionMode] = useState('auto'); // 'auto' | 'move'
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showAcousticDrawer, setShowAcousticDrawer] = useState(false);
  const [showExportPopover, setShowExportPopover] = useState(false);

  // Estado de Vista Cinemática (por defecto: Recorrido Interior que ENTRA a la sala)
  const [cinematicPlaying, setCinematicPlaying] = useState(false);
  const [cinematicMode, setCinematicMode] = useState('interior_path'); // 'interior_path' | 'orbit' | 'sweep'
  const [cinematicSpeed, setCinematicSpeed] = useState(1);
  const [cinematicProgress, setCinematicProgress] = useState(0);

  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const viewport = useRef(null);

  const patch = (changes) => setOpts((o) => ({ ...o, ...changes }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
      saveRenderOptsToCookie({
        mode: opts.mode,
        perfMode: opts.perfMode,
        usePolygon: opts.usePolygon,
        syncSurfaceMaterials: opts.syncSurfaceMaterials,
        cutMode: opts.cutMode,
        roomType: opts.roomType,
        night: opts.night,
        background: opts.background,
      });
    } catch {
      /* almacenamiento no disponible */
    }
  }, [opts]);

  // Polígono activo para el render (el real del proyecto o caja rectangular de plantilla/manual)
  const activePolygon = useMemo(() => {
    if (opts.usePolygon && roomPolygon?.vertices?.length >= 3) {
      return roomPolygon;
    }
    const W = Number(opts.dims.W) || 5.4;
    const D = Number(opts.dims.D) || 4.4;
    const H = Number(opts.dims.H) || 2.7;
    return {
      vertices: [
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: D },
        { x: 0, y: D },
      ],
      height: H,
      curvatures: {},
    };
  }, [opts.usePolygon, roomPolygon, opts.dims]);

  const layout = useMemo(() => getPolygonLayout(activePolygon), [activePolygon]);

  const [waypoints, setWaypoints] = useState(() =>
    createDefaultInteriorWaypoints(layout.W, layout.D)
  );

  // Reajustar waypoints si cambian mucho las dimensiones del recinto y quedan fuera
  useEffect(() => {
    const limX = Math.max(0.6, layout.W / 2 - 0.35);
    const limZ = Math.max(0.6, layout.D / 2 - 0.35);
    setWaypoints((prev) =>
      prev.map((wp) => ({
        ...wp,
        x: clamp(Number(wp.x ?? wp.targetX ?? 0), -limX, limX),
        z: clamp(Number(wp.z ?? wp.targetZ ?? 0), -limZ, limZ),
      }))
    );
  }, [layout.W, layout.D]);

  // Estado local de objetos si no viene controlado desde App.jsx
  const [localItems, setLocalItems] = useState(() =>
    generateStarterSceneItems('studio', {
      W: layout.W,
      D: layout.D,
      H: layout.H,
      wallCount: layout.walls.length,
    })
  );

  const items = Array.isArray(sceneObjects) ? sceneObjects : localItems;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // ==========================================================================
  // HISTORIAL UNDO / REDO (CTRL+Z / CTRL+Y)
  // ==========================================================================
  const historyRef = useRef({ past: [], future: [], lastContinuousTs: 0, lastContinuousId: null });
  const [, forceHistoryRender] = useState(0);

  const setItemsRaw = (nextItems) => {
    if (onChangeSceneObjects) {
      onChangeSceneObjects(nextItems);
    } else {
      setLocalItems(nextItems);
    }
  };

  const commitItems = (updater, { continuousKey = null } = {}) => {
    const current = itemsRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    if (next === current) return;

    const now = performance.now();
    const h = historyRef.current;
    const shouldPushSnapshot =
      !continuousKey ||
      h.lastContinuousId !== continuousKey ||
      now - h.lastContinuousTs > 450;

    if (shouldPushSnapshot) {
      h.past = [...h.past.slice(-45), current];
      h.future = [];
      forceHistoryRender((n) => n + 1);
    }
    h.lastContinuousId = continuousKey;
    h.lastContinuousTs = now;

    setItemsRaw(next);
  };

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const handleUndo = () => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const previous = h.past[h.past.length - 1];
    h.past = h.past.slice(0, -1);
    h.future = [itemsRef.current, ...h.future.slice(0, 45)];
    h.lastContinuousId = null;
    setItemsRaw(previous);
    forceHistoryRender((n) => n + 1);
  };

  const handleRedo = () => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future[0];
    h.future = h.future.slice(1);
    h.past = [...h.past.slice(-45), itemsRef.current];
    h.lastContinuousId = null;
    setItemsRaw(next);
    forceHistoryRender((n) => n + 1);
  };

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  const updateItemById = (id, changes) => {
    commitItems(
      (prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                ...changes,
                dims: changes.dims ? { ...it.dims, ...changes.dims } : it.dims,
                coefficients: changes.coefficients
                  ? { ...it.coefficients, ...changes.coefficients }
                  : it.coefficients,
              }
            : it
        ),
      { continuousKey: `edit_${id}` }
    );
  };

  const updateSelectedItem = (changes) => {
    if (!selectedItem) return;
    updateItemById(selectedItem.id, changes);
  };

  // Detecta mesas o estanterías disponibles en la escena para colocar objetos encima
  const availableSurfaces = useMemo(
    () => items.filter((it) => it.enabled !== false && SUPPORT_SURFACE_SPECS[it.typeId]),
    [items]
  );

  // Detecta si el objeto seleccionado está actualmente sobre una mesa o estantería
  const activeSupportForSelected = useMemo(() => {
    if (!selectedItem || selectedItem.mount !== 'floor') return null;
    return findSupportingSurface(selectedItem, selectedItem.x, selectedItem.z, items);
  }, [selectedItem, items]);

  const handlePlaceSelectedOnSurface = (surfaceItem, levelY = null) => {
    if (!selectedItem || !surfaceItem || selectedItem.id === surfaceItem.id) return;
    const levels = getSupportSurfaceLevels(surfaceItem);
    if (!levels.length) return;
    const targetY = levelY !== null ? levelY : levels[levels.length - 1].y;
    // Pequeño desplazamiento si ya hay objetos sobre esa superficie
    const itemsOnSurface = items.filter(
      (other) =>
        other.id !== selectedItem.id &&
        other. id !== surfaceItem.id &&
        Math.hypot((Number(other.x) || 0) - (Number(surfaceItem.x) || 0), (Number(other.z) || 0) - (Number(surfaceItem.z) || 0)) < 0.6
    );
    const offset = itemsOnSurface.length > 0 ? ((itemsOnSurface.length % 3) - 1) * 0.28 : 0;
    const rad = ((Number(surfaceItem.rotation) || 0) * Math.PI) / 180;
    const nextX = Math.round(((Number(surfaceItem.x) || 0) + Math.cos(rad) * offset) * 20) / 20;
    const nextZ = Math.round(((Number(surfaceItem.z) || 0) - Math.sin(rad) * offset) * 20) / 20;

    commitItems((prev) =>
      prev.map((it) =>
        it.id === selectedItem.id
          ? {
              ...it,
              mount: 'floor',
              x: nextX,
              z: nextZ,
              y: targetY,
              rotation: Number(surfaceItem.rotation) || 0,
            }
          : it
      )
    );
  };

  const handleAddItem = (typeId, targetSurface = null) => {
    const def = getCatalogItem(typeId);
    const isFloorAnchoredWall =
      typeId === 'arch_door' || typeId === 'double_door' || typeId === 'floor_to_ceiling_window';

    let initX = 0;
    let initZ = 0;
    let initY = 0;
    let initRot = 0;

    // Si el usuario pulsa "Poner en mesa/repisa" o tiene seleccionada una mesa/repisa al añadir un prop pequeño
    const autoSurface =
      targetSurface ||
      (selectedItem && SUPPORT_SURFACE_SPECS[selectedItem.typeId] && !SUPPORT_SURFACE_SPECS[typeId] && def.mount === 'floor'
        ? selectedItem
        : null);

    if (autoSurface && def.mount === 'floor') {
      const levels = getSupportSurfaceLevels(autoSurface);
      initX = Number(autoSurface.x) || 0;
      initZ = Number(autoSurface.z) || 0;
      initY = levels.length ? levels[levels.length - 1].y : 0.76;
      initRot = Number(autoSurface.rotation) || 0;
    }

    const newItem = createSceneItem(typeId, {
      wallIndex: 0,
      cornerIndex: 0,
      x: initX,
      z: initZ,
      y: initY,
      rotation: initRot,
      elevation:
        def.mount === 'wall'
          ? isFloorAnchoredWall
            ? (Number(def.defaultDims?.h) || 2.05) * 0.5
            : Math.min(1.38, layout.H * 0.5)
          : 0,
    });
    commitItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleDuplicateItem = (item) => {
    if (!item) return;
    const copy = createSceneItem(item.typeId, {
      ...item,
      id: undefined,
      locked: false,
      name: `${item.name} (Copia)`,
      along:
        item.mount === 'wall'
          ? clamp((Number(item.along) || 0) + 0.65, -layout.W / 2 + 0.3, layout.W / 2 - 0.3)
          : item.along,
      x: item.mount !== 'wall' ? clamp((Number(item.x) || 0) + 0.45, -layout.W / 2 + 0.25, layout.W / 2 - 0.25) : item.x,
      z: item.mount !== 'wall' ? clamp((Number(item.z) || 0) + 0.35, -layout.D / 2 + 0.25, layout.D / 2 - 0.25) : item.z,
      dims: { ...item.dims },
      coefficients: item.coefficients ? { ...item.coefficients } : null,
      sabines: item.sabines ? { ...item.sabines } : null,
    });
    commitItems((prev) => [...prev, copy]);
    setSelectedItemId(copy.id);
  };

  const handleDeleteItem = (id) => {
    const target = itemsRef.current.find((it) => it.id === id);
    if (!target || target.locked) return;
    commitItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleToggleLock = (id) => {
    const target = itemsRef.current.find((it) => it.id === id);
    if (!target) return;
    commitItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, locked: !it.locked } : it))
    );
  };

  // ==========================================================================
  // ATAJOS DE TECLADO GLOBALES (CTRL+Z, CTRL+Y, SUPR, CTRL+D, R, L, FLECHAS)
  // ==========================================================================
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y o Ctrl+Shift+Z
      if ((isMod && e.key.toLowerCase() === 'y') || (isMod && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      const sel = itemsRef.current.find((it) => it.id === selectedItemId);

      // Duplicar: Ctrl+D
      if (isMod && e.key.toLowerCase() === 'd' && sel) {
        e.preventDefault();
        handleDuplicateItem(sel);
        return;
      }

      // Borrar: Delete / Supr / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault();
        if (!sel.locked) {
          handleDeleteItem(sel.id);
        }
        return;
      }

      // Bloquear / Desbloquear: L
      if (!isMod && e.key.toLowerCase() === 'l' && sel) {
        e.preventDefault();
        handleToggleLock(sel.id);
        return;
      }

      // Rotar 45°: R
      if (!isMod && e.key.toLowerCase() === 'r' && sel && !sel.locked) {
        if (sel.mount !== 'wall' && sel.mount !== 'corner') {
          e.preventDefault();
          updateItemById(sel.id, { rotation: ((Number(sel.rotation) || 0) + 45) % 360 });
        }
        return;
      }

      // Escape: deseleccionar o salir de tour
      if (e.key === 'Escape') {
        if (cinematicPlaying) setCinematicPlaying(false);
        else if (selectedItemId) setSelectedItemId(null);
        return;
      }

      // Flechas para mover con precisión (Shift = paso de 20cm, normal = 5cm)
      if (sel && !sel.locked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 0.2 : 0.05;
        if (sel.mount === 'wall') {
          const deltaAlong = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
          const deltaElev = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
          updateItemById(sel.id, {
            along: Math.round(((Number(sel.along) || 0) + deltaAlong) * 20) / 20,
            elevation:
              sel.typeId === 'arch_door' || sel.typeId === 'double_door'
                ? sel.elevation
                : clamp(Math.round(((Number(sel.elevation) || 1.35) + deltaElev) * 20) / 20, 0.25, layout.H - 0.25),
          });
        } else if (sel.mount !== 'corner') {
          const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
          const dz = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
          updateItemById(sel.id, {
            x: clamp(Math.round(((Number(sel.x) || 0) + dx) * 20) / 20, -layout.W / 2 + 0.15, layout.W / 2 - 0.15),
            z: clamp(Math.round(((Number(sel.z) || 0) + dz) * 20) / 20, -layout.D / 2 + 0.15, layout.D / 2 - 0.15),
          });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId, cinematicPlaying, layout.W, layout.D, layout.H]);

  /**
   * Cambia de sala actualizando TANTO las paredes/piso/dimensiones como el mobiliario y tratamiento.
   */
  const handleSelectRoomPreset = (presetId) => {
    setCinematicPlaying(false);
    if (presetId === 'empty') {
      commitItems([]);
      setSelectedItemId(null);
      return;
    }

    if (presetId === 'project') {
      const polyLayout = getPolygonLayout(roomPolygon);
      patch({
        usePolygon: true,
        syncSurfaceMaterials: true,
        roomType: 'project',
      });
      const next = generateStarterSceneItems(opts.roomType === 'project' ? 'studio' : opts.roomType, {
        W: polyLayout.W,
        D: polyLayout.D,
        H: polyLayout.H,
        wallCount: polyLayout.walls.length,
      });
      commitItems(next);
      setSelectedItemId(next[0]?.id || null);
      setWaypoints(createDefaultInteriorWaypoints(polyLayout.W, polyLayout.D));
      return;
    }

    const presetStyle = ROOM_PRESET_STYLES[presetId] || ROOM_PRESET_STYLES.studio;
    const targetDims = presetStyle.dims;
    patch({
      roomType: presetId,
      usePolygon: false,
      dims: { ...targetDims },
      palette: { ...presetStyle.palette },
    });

    const next = generateStarterSceneItems(presetId, {
      W: targetDims.W,
      D: targetDims.D,
      H: targetDims.H,
      wallCount: 4,
    });
    commitItems(next);
    setSelectedItemId(next[0]?.id || null);
    setWaypoints(createDefaultInteriorWaypoints(targetDims.W, targetDims.D));
  };

  const diffuserCfg = useMemo(() => loadDiffuserConfig(), [opts.mode, items]);
  const diffuserDesign = useMemo(() => (diffuserCfg ? designFromConfig(diffuserCfg) : null), [diffuserCfg]);

  const productParams = {
    ...(PRODUCT_KINDS[opts.product]?.params || PRODUCT_KINDS.qrd.params),
    ...(opts.productParams[opts.product] || {}),
  };
  const setProductParam = (key, value) =>
    patch({
      productParams: {
        ...opts.productParams,
        [opts.product]: { ...opts.productParams[opts.product], [key]: value },
      },
    });

  const activePerf = PERF_MODES.find((m) => m.id === opts.perfMode) || PERF_MODES[1];

  const projectMaterialSummary = useMemo(() => {
    if (!materials) return [];
    const list = [];
    layout.walls.forEach((w, idx) => {
      const mId = materials[`wall_${idx}`]?.materialId;
      const matObj = DEFAULT_MATERIALS_DATABASE.find((m) => m.id === mId);
      const matName = matObj?.name || mId;
      if (matName) {
        list.push(`P${idx + 1}: ${matName.split('(')[0].trim()}`);
      }
    });
    return list;
  }, [materials, layout.walls]);

  const sceneKey = `${opts.mode}:${opts.product}:${diffuserDesign?.type ?? ''}`;
  const home = useMemo(
    () => defaultViewFor({ kind: opts.mode === 'room' ? 'custom_room' : opts.mode }),
    [sceneKey] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [view, setView] = useState(home);
  useEffect(() => setView(home), [home]);

  // Si estamos en cámara interior (firstPerson) o reproduciendo el recorrido interior, mostramos las 4 paredes completas
  const effectiveCutMode =
    view?.firstPerson || (cinematicPlaying && cinematicMode === 'interior_path')
      ? 'full'
      : opts.cutMode || 'auto';

  // Descripción de la escena para el motor Three.js
  const spec = useMemo(() => {
    const p = opts.palette;
    const palette = {
      primary: hex(p.primary),
      secondary: hex(p.secondary),
      neutral: hex(p.neutral),
      accent: hex(p.accent),
      dark: hex(p.dark || '#3b3b45'),
      wood: p.wood,
      wall: hex(p.wall),
      floor: p.floor,
    };
    if (opts.mode === 'room') {
      return {
        kind: 'custom_room',
        customMode: true,
        usePolygon: opts.usePolygon,
        syncSurfaceMaterials: opts.syncSurfaceMaterials !== false,
        materials,
        roomPolygon: activePolygon,
        cutMode: effectiveCutMode,
        W: layout.W,
        D: layout.D,
        H: layout.H,
        items,
        selectedItemId,
        diffuserDesign,
        night: opts.night,
        palette,
      };
    }
    if (opts.mode === 'diffuser' && diffuserDesign?.validWidth) {
      return { kind: 'diffuser', design: diffuserDesign, wood: p.wood };
    }
    return { kind: 'product', item: opts.product, params: productParams, palette };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.mode,
    opts.usePolygon,
    opts.syncSurfaceMaterials,
    materials,
    effectiveCutMode,
    activePolygon,
    layout.W,
    layout.D,
    layout.H,
    items,
    selectedItemId,
    diffuserDesign,
    opts.night,
    opts.palette,
    opts.product,
    opts.productParams,
  ]);

  const [settled, setSettled] = useState(spec);
  useEffect(() => {
    const t = setTimeout(() => setSettled(spec), activePerf.debounceMs);
    return () => clearTimeout(t);
  }, [spec, activePerf.debounceMs]);

  // Entra en primera persona al interior de la sala (en un punto dado o en la primera parada)
  const enterInteriorView = (wp = null) => {
    const stop = wp || waypoints[0] || { x: -layout.W * 0.25, z: layout.D * 0.25, lookX: 0, lookZ: 0 };
    const eyeY = clamp(layout.H * 0.56, 1.48, 1.72);
    setView({
      firstPerson: true,
      camX: Number(stop.x) || 0,
      camY: eyeY,
      camZ: Number(stop.z) || 0,
      lookX: Number(stop.lookX) || 0,
      lookY: eyeY - 0.1,
      lookZ: Number(stop.lookZ) || 0,
      fov: 58,
      azimuth: 40,
      elevation: 24,
      zoom: 1,
    });
  };

  // ==========================================================================
  // REPRODUCCIÓN DE VISTA CINEMÁTICA (ENTRA REALMENTE AL RECINTO EN 1ª PERSONA)
  // ==========================================================================
  useEffect(() => {
    if (!cinematicPlaying) return undefined;
    let rafId = null;
    let lastTime = performance.now();
    let progress = cinematicProgress;

    const animate = (now) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      // Ciclo completo de ~16s a velocidad 1x
      progress = (progress + (dt * cinematicSpeed) / 16) % 1;
      setCinematicProgress(progress);

      if (cinematicMode === 'interior_path' && waypoints.length >= 2) {
        const n = waypoints.length;
        const scaled = progress * n;
        const idx0 = Math.floor(scaled) % n;
        const idx1 = (idx0 + 1) % n;
        const idx2 = (idx0 + 2) % n;
        const localT = scaled - Math.floor(scaled);
        // Suavizado cosenoidal para el desplazamiento
        const mu = (1 - Math.cos(localT * Math.PI)) / 2;

        const p0 = waypoints[idx0];
        const p1 = waypoints[idx1];
        const p2 = waypoints[idx2];

        const camX = (Number(p0.x) || 0) + ((Number(p1.x) || 0) - (Number(p0.x) || 0)) * mu;
        const camZ = (Number(p0.z) || 0) + ((Number(p1.z) || 0) - (Number(p0.z) || 0)) * mu;
        const eyeY = clamp(layout.H * 0.56, 1.48, 1.72);

        // Dirección de mirada suave: combina el rumbo hacia la siguiente parada con un paneo hacia el centro de la sala
        const nextWayX = (Number(p1.x) || 0) + ((Number(p2.x) || 0) - (Number(p1.x) || 0)) * mu;
        const nextWayZ = (Number(p1.z) || 0) + ((Number(p2.z) || 0) - (Number(p1.z) || 0)) * mu;
        const lookX = nextWayX * 0.42 + 0 * 0.58;
        const lookZ = nextWayZ * 0.42 + 0 * 0.58;
        const lookY = eyeY - 0.12 + Math.sin(progress * Math.PI * 4) * 0.12;

        setView((v) => ({
          ...v,
          firstPerson: true,
          camX: Math.round(camX * 100) / 100,
          camY: Math.round(eyeY * 100) / 100,
          camZ: Math.round(camZ * 100) / 100,
          lookX: Math.round(lookX * 100) / 100,
          lookY: Math.round(lookY * 100) / 100,
          lookZ: Math.round(lookZ * 100) / 100,
          fov: 58,
        }));
      } else if (cinematicMode === 'orbit') {
        const az = (progress * 360) % 360;
        const el = 24 + Math.sin(progress * Math.PI * 2) * 8;
        setView((v) => ({
          ...v,
          firstPerson: false,
          azimuth: Math.round(az * 10) / 10,
          elevation: Math.round(el * 10) / 10,
          targetX: 0,
          targetZ: 0,
        }));
      } else if (cinematicMode === 'sweep') {
        const angle = progress * Math.PI * 2;
        const az = 38 + Math.sin(angle) * 44;
        const el = 22 + Math.cos(angle * 2) * 7;
        const zoom = 1.08 + Math.sin(angle) * 0.18;
        setView({
          firstPerson: false,
          azimuth: Math.round(az * 10) / 10,
          elevation: Math.round(el * 10) / 10,
          zoom: Math.round(zoom * 100) / 100,
          targetX: Math.round(Math.sin(angle) * (layout.W * 0.14) * 100) / 100,
          targetZ: Math.round(Math.cos(angle) * (layout.D * 0.14) * 100) / 100,
        });
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematicPlaying, cinematicMode, cinematicSpeed, waypoints, layout.W, layout.D, layout.H]);

  // ==========================================================================
  // CÁLCULO ACÚSTICO EN VIVO
  // ==========================================================================
  const acousticImpact = useMemo(() => {
    const simGeo =
      opts.usePolygon && geometry?.volume
        ? geometry
        : calculatePolygonGeometry(activePolygon.vertices, activePolygon.height, activePolygon.curvatures || {});
    const simMats =
      materials && Object.keys(materials).length > 0
        ? materials
        : getDefaultPolygonMaterials(activePolygon.vertices.length);

    const { totalByBand, byCategory, totalArea } = calculateSceneObjectsAbsorption(items);

    const baseAbs = calculateRoomAbsorption(simGeo.surfaceAreas, simGeo.totalSurfaceArea, simMats, null);
    const treatedAbs = calculateRoomAbsorption(simGeo.surfaceAreas, simGeo.totalSurfaceArea, simMats, totalByBand);

    const baseRT = calculateReverberationTimes(
      simGeo.volume,
      simGeo.totalSurfaceArea,
      simGeo.surfaceAreas,
      baseAbs,
      simMats,
      includeAirAbsorption,
      null
    );
    const treatedRT = calculateReverberationTimes(
      simGeo.volume,
      simGeo.totalSurfaceArea,
      simGeo.surfaceAreas,
      treatedAbs,
      simMats,
      includeAirAbsorption,
      totalByBand
    );

    return {
      volume: simGeo.volume,
      totalByBand,
      byCategory,
      totalArea,
      baseRT,
      treatedRT,
    };
  }, [opts.usePolygon, geometry, activePolygon, materials, items, includeAirAbsorption]);

  // Filtrado del catálogo
  const filteredCatalog = useMemo(() => {
    let source = [];
    if (catalogGroup === 'panels') {
      source = Object.values(PANEL_CATALOG);
    } else if (catalogGroup === 'diffusers') {
      source = Object.values(DIFFUSER_CATALOG);
    } else if (catalogGroup === 'all') {
      source = [
        ...Object.values(FURNITURE_CATALOG),
        ...Object.values(PANEL_CATALOG),
        ...Object.values(DIFFUSER_CATALOG),
      ];
    } else {
      source = Object.values(FURNITURE_CATALOG).filter(
        (it) => (it.subCategory || 'studio') === catalogGroup
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.subtitle && it.subtitle.toLowerCase().includes(q)) ||
        (it.description && it.description.toLowerCase().includes(q))
    );
  }, [catalogGroup, searchQuery]);

  const size = SIZES.find((s) => s.id === opts.size) ?? SIZES[0];
  const quality = QUALITIES.find((q) => q.id === opts.quality) ?? QUALITIES[1];
  const matte = opts.background === 'transparent' ? null : opts.background;

  const render = async () => {
    if (cinematicPlaying) setCinematicPlaying(false);
    setBusy(true);
    try {
      const type = opts.format === 'webp' ? 'image/webp' : 'image/png';
      const blob = await viewport.current.renderFinal({
        width: size.w,
        height: size.h,
        samples: quality.samples,
        type,
        matte,
      });
      if (!blob) return;
      const what =
        opts.mode === 'room' ? 'sala-personalizada' : opts.mode === 'diffuser' ? 'mi-difusor' : opts.product;
      const name = `pozole-${what}-${size.w}x${size.h}.${opts.format}`;
      const url = URL.createObjectURL(blob);
      if (last) URL.revokeObjectURL(last.url);
      setLast({ url, name, kb: Math.round(blob.size / 1024) });
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ====================================================================
          BARRA SUPERIOR COMPACTA: PLANTILLAS 1-CLIC + UNDO/REDO + MOTOR + EXPORTAR
         ==================================================================== */}
      <div className={`${CARD} px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5`}>
        {/* Izquierda: Selector de modo + Plantillas de Sala en 1 clic */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] text-[11px] font-bold">
            {[
              ['room', 'Sala 3D', Box],
              ['product', 'Pieza', Grid3x3],
              ['diffuser', 'Difusor', Wand2],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => patch({ mode: id })}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  opts.mode === id
                    ? 'bg-[#5833c7] text-white shadow-xs'
                    : `${MUTED} hover:text-[#1d1d1f] dark:hover:text-white`
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {opts.mode === 'room' && (
            <div className="flex flex-wrap items-center gap-1">
              {[
                ['project', '🏠 Mi Sala'],
                ['studio', '🎙️ Estudio'],
                ['classroom', '🎓 Colegio/Uni'],
                ['meeting', '💼 Juntas'],
                ['cinema', '🎬 Cine'],
                ['industrial', '🏭 Industrial'],
              ].map(([id, label]) => {
                const active =
                  (id === 'project' && opts.usePolygon) ||
                  (id !== 'project' && !opts.usePolygon && opts.roomType === id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectRoomPreset(id)}
                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                      active ? CHIP_ON : CHIP_OFF
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Derecha: Deshacer/Rehacer + Rendimiento + Exportar */}
        <div className="flex flex-wrap items-center gap-2">
          {opts.mode === 'room' && (
            <div className="inline-flex items-center rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#f5f5f7] dark:bg-[#18192a] p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Deshacer (Ctrl+Z)"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-35 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ctrl+Z</span>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Rehacer (Ctrl+Y)"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-35 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Motor GPU */}
          <div
            className="inline-flex items-center gap-0.5 bg-[#f5f5f7] dark:bg-[#18192a] p-0.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08]"
            title={activePerf.desc}
          >
            {PERF_MODES.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => patch({ perfMode: pm.id })}
                title={pm.desc}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
                  opts.perfMode === pm.id
                    ? pm.id === 'eco'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#5833c7] text-white'
                    : `${MUTED} hover:text-[#1d1d1f] dark:hover:text-white`
                }`}
              >
                {pm.badge}
              </button>
            ))}
          </div>

          {/* Botón Exportar con opciones desplegables sin salir del Viewport */}
          <div className="relative">
            <div className="inline-flex items-center rounded-xl bg-[#5833c7] text-white shadow-sm">
              <button
                type="button"
                onClick={render}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold hover:bg-[#4726aa] rounded-l-xl transition cursor-pointer disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                {busy ? 'Renderizando…' : 'Descargar PNG'}
              </button>
              <button
                type="button"
                onClick={() => setShowExportPopover((v) => !v)}
                title="Formato y calidad de exportación"
                className="px-2 py-1.5 border-l border-white/20 hover:bg-[#4726aa] rounded-r-xl transition cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showExportPopover && (
              <div className="absolute right-0 mt-2 w-72 z-30 rounded-2xl bg-white dark:bg-[#16182b] border border-black/10 dark:border-white/15 shadow-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${TITLE}`}>Ajustes de exportación</span>
                  <button
                    type="button"
                    onClick={() => setShowExportPopover(false)}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Choice
                  label="Proporción"
                  stacked
                  options={SIZES.map((s) => [s.id, s.label])}
                  value={opts.size}
                  onChange={(v) => patch({ size: v })}
                />
                <Choice
                  label="Calidad"
                  options={QUALITIES.map((q) => [q.id, q.label])}
                  value={opts.quality}
                  onChange={(v) => patch({ quality: v })}
                />
                <div className="flex items-center justify-between text-[11px]">
                  <span className={MUTED}>
                    {size.w}×{size.h} px · {quality.samples} pasadas
                  </span>
                  <button
                    type="button"
                    onClick={() => patch({ format: opts.format === 'png' ? 'webp' : 'png' })}
                    className="font-bold text-[#5833c7] dark:text-[#c4b5fd] underline cursor-pointer"
                  >
                    Formato: {opts.format.toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          ÁREA PRINCIPAL CENTRADA EN EL VIEWPORT (SIN SCROLL DE PÁGINA)
         ==================================================================== */}
      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* ------------------------------------------------------------------
            IZQUIERDA / CENTRO (8 COLUMNAS): VIEWPORT 3D PROTAGONISTA + HUD FLOTANTE
           ------------------------------------------------------------------ */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className={`${CARD} p-2.5`}>
            <div
              className="relative rounded-2xl overflow-hidden"
              style={
                matte && matte.startsWith('#')
                  ? { background: matte }
                  : {
                      background: `repeating-conic-gradient(${
                        isDarkMode ? '#1a1b2c 0 25%, #15162a 0 50%' : '#f3f3f6 0 25%, #fafafc 0 50%'
                      }) 0 0 / 22px 22px`,
                    }
              }
            >
              {/* HUD FLOTANTE SUPERIOR: HERRAMIENTA 3D + CÁMARA INTERIOR + TOUR CINEMÁTICO */}
              {opts.mode === 'room' && (
                <div className="absolute top-2.5 inset-x-2.5 z-10 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
                  {/* Selector Orbitar vs Mover Objetos + Vistas Rápidas */}
                  <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex items-center p-0.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                      <button
                        type="button"
                        onClick={() => setInteractionMode('auto')}
                        title="Arrastra para girar cámara (o arrastra el objeto seleccionado)"
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                          interactionMode !== 'move' ? 'bg-[#5833c7] text-white' : 'text-white/75 hover:text-white'
                        }`}
                      >
                        <MousePointer className="w-3 h-3" /> Orbitar
                      </button>
                      <button
                        type="button"
                        onClick={() => setInteractionMode(interactionMode === 'move' ? 'auto' : 'move')}
                        title="Arrastra cualquier mueble o panel directamente en 3D (Alt+arrastrar en techo cambia altura)"
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                          interactionMode === 'move' ? 'bg-emerald-600 text-white' : 'text-white/75 hover:text-white'
                        }`}
                      >
                        <Move className="w-3 h-3" /> Mover 3D
                      </button>
                    </div>

                    {/* Botón para Entrar / Salir de Vista en 1ª Persona dentro de la sala */}
                    <button
                      type="button"
                      onClick={() => {
                        setCinematicPlaying(false);
                        if (view?.firstPerson) {
                          setView(home);
                        } else {
                          enterInteriorView();
                        }
                      }}
                      title="Coloca la cámara dentro del recinto con las 4 paredes cerradas (arrastra para mirar 360°)"
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md backdrop-blur-md transition cursor-pointer ${
                        view?.firstPerson && !cinematicPlaying
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                          : 'bg-black/70 text-white hover:bg-[#5833c7]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {view?.firstPerson && !cinematicPlaying ? 'Salir al Exterior' : 'Entrar a Sala (1ª Persona)'}
                    </button>
                  </div>

                  {/* Controles de Tour Cinemático Interior + Zoom + Día/Noche */}
                  <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!cinematicPlaying) {
                          setCinematicMode('interior_path');
                          setCinematicPlaying(true);
                        } else {
                          setCinematicPlaying(false);
                        }
                      }}
                      title="Recorre el interior de la sala siguiendo la ruta trazada P1 → P2 → P3 → P4"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md backdrop-blur-md transition cursor-pointer ${
                        cinematicPlaying
                          ? 'bg-amber-500 text-white ring-2 ring-amber-200'
                          : 'bg-black/70 text-white hover:bg-[#5833c7]'
                      }`}
                    >
                      {cinematicPlaying ? <Pause className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                      {cinematicPlaying ? 'Detener Tour Interior' : 'Tour Cinemático Interior'}
                    </button>

                    <button
                      type="button"
                      onClick={() => patch({ night: !opts.night })}
                      title={opts.night ? 'Cambiar a Luz de Día' : 'Cambiar a Ambiente Nocturno'}
                      className="p-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white hover:text-amber-300 shadow-md cursor-pointer"
                    >
                      {opts.night ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5" />}
                    </button>

                    <div className="inline-flex items-center rounded-xl bg-black/70 backdrop-blur-md text-white text-[10.5px] font-mono shadow-md">
                      <button
                        type="button"
                        onClick={() =>
                          setView((v) => ({
                            ...v,
                            zoom: clamp(Math.round(((v.zoom || 1) - 0.15) * 100) / 100, 0.45, 3.0),
                          }))
                        }
                        className="p-1.5 hover:text-[#c4b5fd] cursor-pointer"
                        title="Alejar (Rueda del ratón)"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1">{Math.round((view.zoom || 1) * 100)}%</span>
                      <button
                        type="button"
                        onClick={() =>
                          setView((v) => ({
                            ...v,
                            zoom: clamp(Math.round(((v.zoom || 1) + 0.15) * 100) / 100, 0.45, 3.0),
                          }))
                        }
                        className="p-1.5 hover:text-[#c4b5fd] cursor-pointer"
                        title="Acercar (Rueda del ratón)"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* LIENZO WEBGL THREE.JS */}
              <div
                className="mx-auto"
                style={{ maxWidth: size.w >= size.h ? '100%' : `${(size.w / size.h) * 620}px` }}
              >
                <RenderViewport
                  ref={viewport}
                  spec={settled}
                  view={view}
                  onViewChange={(nextV) => {
                    if (cinematicPlaying) setCinematicPlaying(false);
                    setView(nextV);
                  }}
                  onSelectItem={opts.mode === 'room' ? (id) => setSelectedItemId(id) : null}
                  onMoveItem={opts.mode === 'room' ? updateItemById : null}
                  interactionMode={interactionMode}
                  matte={matte}
                  aspect={size.w / size.h}
                  previewMax={activePerf.previewMax}
                  previewSamples={activePerf.previewSamples}
                  shadowSize={activePerf.shadowSize}
                  skipBloom={activePerf.skipBloom}
                />
              </div>

              {/* ================================================================
                  BARRA CONTEXTUAL FLOTANTE INFERIOR PARA EL OBJETO SELECCIONADO
                  (Editar tamaño, alargar mesas/estantes, bajar del techo, poner en repisa o bloquear SIN salir del Viewport)
                 ================================================================ */}
              {opts.mode === 'room' && selectedItem && (
                <FloatingItemQuickBar
                  item={selectedItem}
                  layout={layout}
                  activeSupport={activeSupportForSelected}
                  availableSurfaces={availableSurfaces}
                  onPlaceOnSurface={handlePlaceSelectedOnSurface}
                  onChange={updateSelectedItem}
                  onToggleLock={() => handleToggleLock(selectedItem.id)}
                  onDuplicate={() => handleDuplicateItem(selectedItem)}
                  onDelete={() => handleDeleteItem(selectedItem.id)}
                  onClose={() => setSelectedItemId(null)}
                  onOpenAdvanced={() => setShowAdvancedModal((v) => !v)}
                  showAdvanced={showAdvancedModal}
                />
              )}
            </div>

            {/* PIE COMPACTO DEL VIEWPORT: CÁMARAS RÁPIDAS + FONDOS + ATAJOS */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pt-2">
              <div className="flex flex-wrap items-center gap-1">
                <span className={`text-[10px] font-bold ${MUTED} mr-0.5`}>Cámara:</span>
                {CAMERAS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => {
                      setCinematicPlaying(false);
                      setView((v) => ({ ...v, ...c.view }));
                    }}
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
                      !view?.firstPerson && Math.abs((view?.azimuth || 0) - c.view.azimuth) < 5 ? CHIP_ON : CHIP_OFF
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCinematicPlaying(false);
                    enterInteriorView();
                  }}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                    view?.firstPerson ? CHIP_ON : CHIP_OFF
                  }`}
                >
                  👁️ Interior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCinematicPlaying(false);
                    setView(home);
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${CHIP_OFF}`}
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <span className={`text-[10px] font-bold ${MUTED} mr-0.5`}>Fondo:</span>
                {BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => patch({ background: b.id })}
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
                      opts.background === b.id ? CHIP_ON : CHIP_OFF
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RESUMEN ACÚSTICO COMPACTO DE 1 LÍNEA (DESPLEGABLE SI EL USUARIO QUIERE VER LA TABLA COMPLETA) */}
          {opts.mode === 'room' && (
            <div className={`${CARD} px-4 py-2.5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className={`inline-flex items-center gap-1.5 font-bold ${TITLE}`}>
                    <Activity className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa]" />
                    RT60 (500 Hz):
                  </span>
                  <span className="font-mono text-[#86868b] dark:text-slate-400">
                    Vacía: <strong>{(acousticImpact.baseRT[500]?.sabine || 0).toFixed(2)}s</strong>
                  </span>
                  <span className="text-[#86868b]">→</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Con objetos 3D: {(acousticImpact.treatedRT[500]?.sabine || 0).toFixed(2)}s
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#5833c7]/10 text-[#5833c7] dark:text-[#c4b5fd]">
                    +{fmt(acousticImpact.totalByBand[500], 2)} m² Sabines ({items.filter((x) => x.enabled !== false).length} obj.)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`hidden xl:inline text-[10px] ${MUTED}`}>
                    Atajos: <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono">Ctrl+Z</kbd>{' '}
                    <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono">Supr</kbd>{' '}
                    <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono">L</kbd> Bloquear{' '}
                    <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono">R</kbd> Rotar
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAcousticDrawer((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5833c7] dark:text-[#c4b5fd] hover:underline cursor-pointer"
                  >
                    {showAcousticDrawer ? 'Ocultar bandas' : 'Ver bandas Hz'}
                    {showAcousticDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {showAcousticDrawer && (
                <div className="pt-3 mt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-[11px] ${MUTED}`}>
                      Absorción equivalente añadida por paneles, difusores y mobiliario relevante:
                    </span>
                    {onToggleApplySceneObjects && (
                      <button
                        type="button"
                        onClick={() => onToggleApplySceneObjects(!applySceneObjectsToProject)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                          applySceneObjectsToProject
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : CHIP_OFF
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {applySceneObjectsToProject ? 'Sincronizado con el proyecto ✓' : 'Aplicar al proyecto'}
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[10px] text-[#86868b] dark:text-slate-400">
                          <th className="py-1 text-left font-sans font-bold">Banda (Hz)</th>
                          {OCTAVE_BANDS.map((f) => (
                            <th key={f} className="py-1 text-right font-bold">
                              {f} Hz
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                        <tr>
                          <td className={`py-1 font-sans font-semibold ${MUTED}`}>+Sabines 3D</td>
                          {OCTAVE_BANDS.map((f) => (
                            <td key={f} className="py-1 text-right text-[#5833c7] dark:text-[#c4b5fd] font-semibold">
                              +{acousticImpact.totalByBand[f].toFixed(1)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className={`py-1 font-sans font-semibold ${MUTED}`}>RT60 Vacía</td>
                          {OCTAVE_BANDS.map((f) => (
                            <td key={f} className={`py-1 text-right ${MUTED}`}>
                              {(acousticImpact.baseRT[f]?.sabine || 0).toFixed(2)}s
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className={`py-1 font-sans font-bold ${TITLE}`}>RT60 Tratada</td>
                          {OCTAVE_BANDS.map((f) => {
                            const rt = acousticImpact.treatedRT[f]?.sabine || 0;
                            const optMin = optimumRT?.min ?? 0.3;
                            const optMax = optimumRT?.max ?? 0.8;
                            const ok = rt >= optMin && rt <= optMax;
                            return (
                              <td
                                key={f}
                                className={`py-1 text-right font-bold ${
                                  ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {rt.toFixed(2)}s
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------
            DERECHA (4 COLUMNAS): DOCK LATERAL COMPACTO CON SCROLL INTERNO
            (Nunca te obliga a hacer scroll fuera del Viewport 3D)
           ------------------------------------------------------------------ */}
        <div className="lg:col-span-4">
          {opts.mode === 'room' && (
            <div className={`${CARD} flex flex-col lg:h-[650px] overflow-hidden`}>
              {/* 3 Pestañas claras en la cabecera del Dock */}
              <div className="grid grid-cols-3 gap-1 p-1.5 border-b border-black/[0.07] dark:border-white/[0.08] bg-[#f8f8fa] dark:bg-[#151728] shrink-0">
                {[
                  ['catalog', '➕ Catálogo', Armchair],
                  ['plan', `🗺️ Planta / Cine`, Film],
                  ['room', '🎨 Sala / Muros', Ruler],
                ].map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDockTab(id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      dockTab === id
                        ? 'bg-[#5833c7] text-white shadow-xs'
                        : `${MUTED} hover:text-[#1d1d1f] dark:hover:text-white`
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>

              {/* CONTENIDO DEL DOCK CON SCROLL INTERNO INDEPENDIENTE */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
                {/* ==========================================================
                    TAB 1: CATÁLOGO AMPLIO DE OBJETOS REALES, MUEBLES Y TRATAMIENTO
                   ========================================================== */}
                {dockTab === 'catalog' && (
                  <>
                    {/* Buscador instantáneo */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar TV, laptop, cámara, luz, silla brazo, estante, puerta, bafle..."
                        className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#5833c7]"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtros rápidos por categoría */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        ['all', '✨ Todos'],
                        ['education', '🎓 Colegio/Uni'],
                        ['studio', '🪑 Muebles/Salas'],
                        ['media', '📺 TV/Cámaras/Props'],
                        ['lighting', '💡 Luces'],
                        ['architecture', '🚪 Puertas/Ventanas'],
                        ['industrial', '🏭 Industrial'],
                        ['panels', '🟣 Paneles/Techo'],
                        ['diffusers', '🟠 Difusores'],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCatalogGroup(id)}
                          className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer border ${
                            catalogGroup === id ? CHIP_ON : CHIP_OFF
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Grid de 2 columnas para ver muchos objetos sin hacer casi scroll */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredCatalog.map((catItem) => {
                        const isDiff = catItem.category === 'diffusers';
                        const isPanel = catItem.category === 'panels';
                        const isSmallProp =
                          catItem.mount === 'floor' &&
                          !SUPPORT_SURFACE_SPECS[catItem.id] &&
                          (catItem.subCategory === 'media' || catItem.id === 'desk_lamp');
                        const targetSurface =
                          selectedItem && SUPPORT_SURFACE_SPECS[selectedItem.typeId]
                            ? selectedItem
                            : availableSurfaces[0] || null;

                        return (
                          <div
                            key={catItem.id}
                            className="p-2.5 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#17192b] hover:border-[#5833c7]/50 transition flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    isDiff
                                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                      : isPanel
                                        ? 'bg-[#5833c7]/15 text-[#5833c7] dark:text-[#c4b5fd]'
                                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {catItem.mount === 'wall'
                                    ? 'Pared'
                                    : catItem.mount === 'ceiling'
                                      ? 'Techo ↕'
                                      : catItem.mount === 'corner'
                                        ? 'Esquina'
                                        : SUPPORT_SURFACE_SPECS[catItem.id]
                                          ? 'Soporte 📥'
                                          : 'Piso'}
                                </span>
                                {catItem.coefficients?.[500] !== undefined && (
                                  <span className="text-[9.5px] font-mono font-bold text-[#5833c7] dark:text-[#c4b5fd]">
                                    α={catItem.coefficients[500].toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs font-bold ${TITLE} mt-1 leading-snug`}>{catItem.name}</div>
                              <p className={`text-[10px] ${MUTED} line-clamp-2 mt-0.5`}>{catItem.subtitle}</p>
                            </div>

                            <div className="flex items-center gap-1 pt-1">
                              <button
                                type="button"
                                onClick={() => handleAddItem(catItem.id)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] text-white text-[10.5px] font-bold transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Añadir
                              </button>
                              {isSmallProp && targetSurface && (
                                <button
                                  type="button"
                                  onClick={() => handleAddItem(catItem.id, targetSurface)}
                                  title={`Colocar directamente sobre ${targetSurface.name}`}
                                  className="px-2 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold transition cursor-pointer shrink-0"
                                >
                                  📥 En mesa/repisa
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ==========================================================
                    TAB 2: PLANTA 2D UNIFICADA + RUTA DE TOUR CINEMÁTICO INTERIOR + LISTA DE OBJETOS
                   ========================================================== */}
                {dockTab === 'plan' && (
                  <>
                    {/* Controles del Tour Cinemático que ENTRA a la sala */}
                    <div className="p-3 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#17192b] space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${TITLE} flex items-center gap-1.5`}>
                          <Film className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#a78bfa]" />
                          Recorrido Cinemático Interior
                        </span>
                        <div className="inline-flex p-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold">
                          {[0.5, 1, 2].map((sp) => (
                            <button
                              key={sp}
                              type="button"
                              onClick={() => setCinematicSpeed(sp)}
                              className={`px-1.5 py-0.5 rounded-md cursor-pointer ${
                                cinematicSpeed === sp ? 'bg-[#5833c7] text-white' : MUTED
                              }`}
                            >
                              {sp}×
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        {[
                          ['interior_path', '🚶 Ruta Interior'],
                          ['orbit', '🔄 Órbita 360°'],
                          ['sweep', '🎥 Pendular'],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setCinematicMode(id)}
                            className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold transition cursor-pointer ${
                              cinematicMode === id ? CHIP_ON : CHIP_OFF
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCinematicPlaying((p) => !p)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs text-white transition cursor-pointer ${
                            cinematicPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#5833c7] hover:bg-[#4726aa]'
                          }`}
                        >
                          {cinematicPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {cinematicPlaying ? 'Pausar Tour' : 'Iniciar Tour en Sala'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCinematicPlaying(false);
                            enterInteriorView();
                          }}
                          title="Pararse dentro de la sala y girar 360° con el ratón"
                          className="px-2.5 py-2 rounded-xl border border-black/10 dark:border-white/15 text-[11px] font-bold hover:border-[#5833c7] transition cursor-pointer"
                        >
                          👁️ 1ª Persona
                        </button>
                      </div>
                    </div>

                    {/* Planta 2D Interactiva que muestra Objetos + Paradas de Cámara P1..P4 */}
                    <InteractiveFloorPlan2D
                      layout={layout}
                      items={items}
                      selectedItemId={selectedItemId}
                      onSelectItem={setSelectedItemId}
                      onUpdateItem={updateItemById}
                      waypoints={waypoints}
                      setWaypoints={setWaypoints}
                      showWaypoints={cinematicMode === 'interior_path'}
                      onJumpToWaypoint={(wp) => {
                        setCinematicPlaying(false);
                        enterInteriorView(wp);
                      }}
                    />

                    {/* Lista rápida de objetos con candado de bloqueo (🔒), visibilidad y borrado */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#86868b] dark:text-slate-400">
                        <span>Objetos en la sala ({items.length})</span>
                        {items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectRoomPreset('empty')}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            Vaciar sala
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                        {items.map((it) => {
                          const isSel = it.id === selectedItemId;
                          return (
                            <div
                              key={it.id}
                              onClick={() => setSelectedItemId(it.id)}
                              className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                                isSel
                                  ? 'border-[#5833c7] bg-[#5833c7]/10 dark:bg-[#5833c7]/20'
                                  : 'border-black/[0.06] dark:border-white/[0.06] bg-[#fbfbfd] dark:bg-[#17192b] hover:border-[#5833c7]/40'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {it.locked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                                <span className={`truncate font-semibold ${TITLE}`}>
                                  {it.name} {it.count > 1 ? `(×${it.count})` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLock(it.id)}
                                  title={it.locked ? 'Desbloquear objeto (L)' : 'Bloquear posición (L)'}
                                  className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${
                                    it.locked ? 'text-amber-500' : 'text-slate-400'
                                  }`}
                                >
                                  {it.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateItemById(it.id, { enabled: it.enabled === false })}
                                  title="Mostrar / Ocultar"
                                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
                                >
                                  {it.enabled === false ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateItem(it)}
                                  title="Duplicar (Ctrl+D)"
                                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={it.locked}
                                  onClick={() => handleDeleteItem(it.id)}
                                  title={it.locked ? 'Objeto bloqueado' : 'Eliminar (Supr)'}
                                  className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ==========================================================
                    TAB 3: GEOMETRÍA DEL RECINTO, PUERTAS/VENTANAS DE MATERIALES Y COLORES
                   ========================================================== */}
                {dockTab === 'room' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => patch({ usePolygon: true })}
                        className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                          opts.usePolygon ? CHIP_ON : CHIP_OFF
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>Planta Proyecto</span>
                          {opts.usePolygon && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <p className={`text-[10px] ${MUTED} mt-0.5`}>
                          {roomPolygon?.vertices?.length || 4} muros ({fmt(layout.W)}×{fmt(layout.D)}×{fmt(layout.H)}m)
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => patch({ usePolygon: false })}
                        className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                          !opts.usePolygon ? CHIP_ON : CHIP_OFF
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>Medidas Libres</span>
                          {!opts.usePolygon && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <p className={`text-[10px] ${MUTED} mt-0.5`}>Ajustar largo, ancho y alto</p>
                      </button>
                    </div>

                    {opts.usePolygon && (
                      <div className="space-y-2">
                        <Toggle
                          label="Sincronizar «Materiales» (Puerta en ambos lados, Vidrio, Muros)"
                          checked={opts.syncSurfaceMaterials !== false}
                          onChange={(v) => patch({ syncSurfaceMaterials: v })}
                        />
                        {opts.syncSurfaceMaterials !== false && projectMaterialSummary.length > 0 && (
                          <div className="rounded-xl bg-[#f5f5f7] dark:bg-[#17192b] px-3 py-2 text-[10px] text-[#86868b] dark:text-slate-400">
                            <span className="font-bold text-[#1d1d1f] dark:text-white">Guardado en Cookies ✓ · </span>
                            {projectMaterialSummary.join(' · ')}
                          </div>
                        )}
                      </div>
                    )}

                    {!opts.usePolygon && (
                      <div className="space-y-2 p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#17192b] border border-black/[0.06] dark:border-white/[0.08]">
                        {[
                          ['W', 'Largo (X)', 3.0, 16.0],
                          ['D', 'Ancho (Z)', 3.0, 14.0],
                          ['H', 'Altura (Y)', 2.2, 6.0],
                        ].map(([k, label, min, max]) => (
                          <Range
                            key={k}
                            label={label}
                            unit="m"
                            value={opts.dims[k]}
                            min={min}
                            max={max}
                            step={0.1}
                            onChange={(v) => patch({ dims: { ...opts.dims, [k]: v } })}
                          />
                        ))}
                      </div>
                    )}

                    <Choice
                      label="Corte de muros"
                      options={[
                        ['auto', 'Auto'],
                        ['back_left', '2 Muros'],
                        ['full', '4 Muros'],
                      ]}
                      value={opts.cutMode || 'auto'}
                      onChange={(v) => patch({ cutMode: v })}
                    />

                    {/* Paleta de colores, madera y piso */}
                    <div className="p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#17192b] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
                      <span className={`text-xs font-bold ${TITLE} block`}>Acabados del recinto</span>
                      <div className="flex flex-wrap gap-1">
                        {THEMES.map((t) => (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => patch({ palette: { ...t } })}
                            className={`inline-flex items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 py-1 text-[10.5px] font-semibold transition cursor-pointer ${
                              opts.palette.name === t.name ? CHIP_ON : CHIP_OFF
                            }`}
                          >
                            <span className="flex -space-x-1">
                              {[t.primary, t.secondary, t.accent].map((c) => (
                                <span
                                  key={c}
                                  className="w-3 h-3 rounded-full ring-1 ring-white dark:ring-[#121322]"
                                  style={{ background: c }}
                                />
                              ))}
                            </span>
                            {t.name}
                          </button>
                        ))}
                      </div>

                      <Choice
                        label="Piso"
                        stacked
                        options={FLOORS}
                        value={opts.palette.floor}
                        onChange={(v) => patch({ palette: { ...opts.palette, name: '', floor: v } })}
                      />
                      <Choice
                        label="Madera"
                        options={WOODS}
                        value={opts.palette.wood}
                        onChange={(v) => patch({ palette: { ...opts.palette, name: '', wood: v } })}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs ${MUTED}`}>Color muros</span>
                        <div className="flex items-center gap-1.5">
                          {WALLS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => patch({ palette: { ...opts.palette, name: '', wall: c } })}
                              className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                                opts.palette.wall === c
                                  ? 'ring-2 ring-[#5833c7] ring-offset-1'
                                  : 'border-black/15 dark:border-white/20'
                              }`}
                              style={{ background: c }}
                            />
                          ))}
                          <input
                            type="color"
                            value={opts.palette.wall || '#f1eee8'}
                            onChange={(e) => patch({ palette: { ...opts.palette, name: '', wall: e.target.value } })}
                            className="w-5 h-5 rounded-full border-0 bg-transparent p-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODO PIEZA SUELTA */}
          {opts.mode === 'product' && (
            <Panel icon={Grid3x3} title="Tratamiento individual">
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PRODUCT_KINDS).map(([id, k]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch({ product: id })}
                    className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold text-left transition cursor-pointer ${
                      opts.product === id ? CHIP_ON : CHIP_OFF
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              {PRODUCT_PRIMES[opts.product] && (
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-xs ${MUTED}`}>Número primo p</span>
                  <div className="inline-flex p-1 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] text-xs font-mono font-semibold">
                    {PRODUCT_PRIMES[opts.product].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProductParam('p', p)}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          productParams.p === p ? 'bg-[#5833c7] text-white' : MUTED
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(PRODUCT_FIELDS[opts.product] || PRODUCT_FIELDS.absorber).map(([key, label, min, max, step, unit]) => (
                <Range
                  key={key}
                  label={label}
                  unit={unit}
                  value={productParams[key]}
                  min={min}
                  max={max}
                  step={step}
                  decimals={step >= 1 ? 0 : step >= 0.05 ? 2 : 3}
                  onChange={(v) => setProductParam(key, v)}
                />
              ))}
            </Panel>
          )}

          {/* MODO MI DIFUSOR */}
          {opts.mode === 'diffuser' && (
            <Panel icon={Wand2} title="Mi difusor diseñado en la Suite">
              {diffuserDesign?.validWidth ? (
                <>
                  <p className={`text-xs ${MUTED} leading-relaxed`}>
                    Se dibuja el último diseño que hiciste en «Diseño de difusores», con sus medidas reales.
                  </p>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Tipo', DIFFUSER_TYPE_LABELS[diffuserDesign.type]],
                      ['Ancho total', `${fmt(diffuserDesign.totalWidth * 100)} cm`],
                      ['Profundidad', `${fmt(diffuserDesign.maxDepth * 100)} cm`],
                      ['Banda', `${diffuserCfg.f0} – ${diffuserDesign.fMax ?? '—'} Hz`],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#18192a] px-3 py-2"
                      >
                        <dt className={MUTED}>{k}</dt>
                        <dd className={`font-mono font-semibold ${TITLE}`}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className={`text-xs ${MUTED}`}>Aún no hay un diseño válido guardado.</p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * BARRA FLOTANTE DE EDICIÓN RÁPIDA EN EL VIEWPORT 3D
 * Permite alargar mesas/estantes, bajar paneles/bafles del techo, elegir repisa,
 * bloquear (🔒), rotar, duplicar o borrar sin hacer scroll ni cerrar el catálogo.
 * ============================================================================ */
function FloatingItemQuickBar({
  item,
  layout,
  activeSupport,
  availableSurfaces,
  onPlaceOnSurface,
  onChange,
  onToggleLock,
  onDuplicate,
  onDelete,
  onClose,
  onOpenAdvanced,
  showAdvanced,
}) {
  const def = getCatalogItem(item.typeId);
  const { W, D, H, walls } = layout;
  const isLocked = Boolean(item.locked);
  const isSupportItem = Boolean(SUPPORT_SURFACE_SPECS[item.typeId]);
  const isSmallFloorItem = item.mount === 'floor' && !isSupportItem;

  // Límites de ancho/largo según el tipo de objeto (ej. mesa de juntas hasta 6.0 m, ventanales/cortinas hasta 4.8 m)
  const maxW =
    item.typeId === 'meeting_table'
      ? Math.min(6.0, W - 0.4)
      : item.typeId === 'panoramic_window' ||
          item.typeId === 'floor_to_ceiling_window' ||
          item.typeId === 'draped_curtain' ||
          item.typeId === 'stage_curtain'
        ? 4.8
        : item.typeId === 'mid_shelf_credenza' || item.typeId === 'bookshelf' || item.typeId === 'industrial_shelving'
          ? 3.8
          : 3.4;

  const nearestSurface = useMemo(() => {
    if (!isSmallFloorItem || !availableSurfaces?.length) return null;
    let best = availableSurfaces[0];
    let bestDist = Infinity;
    availableSurfaces.forEach((s) => {
      if (s.id === item.id) return;
      const d = Math.hypot((Number(s.x) || 0) - (Number(item.x) || 0), (Number(s.z) || 0) - (Number(item.z) || 0));
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    });
    return best;
  }, [isSmallFloorItem, availableSurfaces, item]);

  return (
    <div className="absolute inset-x-2.5 bottom-10 z-20 rounded-2xl bg-[#101223]/90 backdrop-blur-md text-white border border-white/15 px-3 py-2 shadow-2xl space-y-2">
      {/* Fila Principal: Nombre + Controles Clave + Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleLock}
            title={isLocked ? 'Desbloquear objeto (Tecla L)' : 'Bloquear posición para que no se mueva (Tecla L)'}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
              isLocked
                ? 'bg-amber-500 text-black shadow-xs'
                : 'bg-white/10 text-white/85 hover:bg-white/20'
            }`}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {isLocked ? 'Bloqueado' : 'Bloquear'}
          </button>

          <span className="text-xs font-bold text-[#c4b5fd] truncate max-w-[180px]">{item.name}</span>
        </div>

        {/* Sliders rápidos en línea según el tipo de objeto */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {/* 1. ALTURA DE SEPARACIÓN DEL TECHO (Para Nubes, Bafles, Proyector, Luces de techo, Ducto) */}
          {item.mount === 'ceiling' && (
            <label className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
              <span className="text-amber-300 font-bold whitespace-nowrap">↕ Separación techo:</span>
              <input
                type="range"
                disabled={isLocked}
                min={0.02}
                max={Math.max(0.4, H - 1.35)}
                step={0.02}
                value={Number(item.dims?.drop) ?? 0.35}
                onChange={(e) => onChange({ dims: { drop: Number(e.target.value) } })}
                className="w-24 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono font-bold w-11 text-right">
                {fmt(Number(item.dims?.drop) ?? 0.35, 2)}m
              </span>
            </label>
          )}

          {/* 2. PARED DE MONTAJE Y ALTURA (Para objetos de pared) */}
          {item.mount === 'wall' && (
            <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl">
              <span className="text-white/70 font-semibold">Muro:</span>
              {walls.map((w) => (
                <button
                  key={w.index}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onChange({ wallIndex: w.index, along: 0 })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    Number(item.wallIndex) === w.index ? 'bg-[#5833c7] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  P{w.index + 1}
                </button>
              ))}
            </div>
          )}

          {/* 3. ALARGAR / CAMBIAR ANCHO (Mesas de juntas, Estanterías medias, Ventanales, Cortinas, Paneles) */}
          {item.dims?.w !== undefined && item.typeId !== 'diffuser_suite' && item.typeId !== 'classroom_desk_grid' && (
            <label className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
              <span className="text-white/75 font-semibold whitespace-nowrap">
                {item.typeId === 'meeting_table' ? '↔ Largo mesa:' : '↔ Ancho:'}
              </span>
              <input
                type="range"
                disabled={isLocked}
                min={0.25}
                max={maxW}
                step={0.05}
                value={Number(item.dims.w) || 0.8}
                onChange={(e) => onChange({ dims: { w: Number(e.target.value) } })}
                className="w-20 sm:w-24 accent-[#a78bfa] cursor-pointer"
              />
              <span className="font-mono font-bold w-10 text-right">{fmt(item.dims.w, 2)}m</span>
            </label>
          )}

          {/* Sillas automáticas en Mesa de Juntas */}
          {item.typeId === 'meeting_table' && (
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onChange({ dims: { withChairs: item.dims?.withChairs === false } })}
              className={`px-2 py-1 rounded-xl text-[10.5px] font-bold cursor-pointer transition ${
                item.dims?.withChairs !== false ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {item.dims?.withChairs !== false ? '✓ Con Sillas' : '+ Sillas'}
            </button>
          )}

          {/* Altura para Estanterías, Cortinas, Ventanales o Paneles */}
          {item.dims?.h !== undefined &&
            (isSupportItem ||
              item.mount === 'wall' ||
              item.typeId === 'rolling_tv_stand' ||
              item.typeId === 'studio_softbox_light' ||
              item.typeId === 'ring_light_stand' ||
              item.typeId === 'cinema_camera_tripod') && (
              <label className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
                <span className="text-white/75 font-semibold whitespace-nowrap">↕ Alto:</span>
                <input
                  type="range"
                  disabled={isLocked}
                  min={0.35}
                  max={Math.max(1.4, H - 0.1)}
                  step={0.05}
                  value={Number(item.dims.h) || 1.2}
                  onChange={(e) => onChange({ dims: { h: Number(e.target.value) } })}
                  className="w-16 sm:w-20 accent-[#a78bfa] cursor-pointer"
                />
                <span className="font-mono font-bold w-10 text-right">{fmt(item.dims.h, 2)}m</span>
              </label>
            )}

          {/* Repetición en fila para paneles, difusores, bafles o sillas */}
          {(item.category === 'panels' ||
            item.category === 'diffusers' ||
            item.typeId === 'school_arm_chair' ||
            item.typeId === 'student_desk') && (
            <label className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl">
              <span className="text-white/75 font-semibold">Cant:</span>
              <input
                type="range"
                disabled={isLocked}
                min={1}
                max={8}
                step={1}
                value={Number(item.count) || 1}
                onChange={(e) => onChange({ count: Number(e.target.value) })}
                className="w-14 accent-[#a78bfa] cursor-pointer"
              />
              <span className="font-mono font-bold">×{item.count || 1}</span>
            </label>
          )}
        </div>

        {/* Botones de Acción Rápida */}
        <div className="flex items-center gap-1">
          {item.mount !== 'wall' && item.mount !== 'corner' && (
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onChange({ rotation: ((Number(item.rotation) || 0) + 45) % 360 })}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 cursor-pointer"
              title="Rotar 45° (Tecla R)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
            title="Duplicar (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenAdvanced}
            className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition ${
              showAdvanced ? 'bg-[#5833c7] text-white' : 'bg-white/10 hover:bg-white/20 text-white/85'
            }`}
            title="Más ajustes (Color, repisas, absorción α)"
          >
            <Sliders className="w-3.5 h-3.5 inline mr-1" />
            Más
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 disabled:opacity-30 cursor-pointer"
            title={isLocked ? 'Desbloquea para eliminar' : 'Eliminar (Tecla Supr)'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/60 hover:text-white cursor-pointer"
            title="Cerrar barra (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-fila automática: Colocar objetos sobre Mesas o Estanterías (niveles de repisa) */}
      {isSmallFloorItem && (activeSupport || nearestSurface) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10 text-[10.5px]">
          {activeSupport ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-emerald-300 font-bold">
                📥 Sobre {activeSupport.item.name} — Elegir nivel/repisa:
              </span>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onChange({ y: 0 })}
                className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer ${
                  (Number(item.y) || 0) < 0.03 ? 'bg-[#5833c7] text-white' : 'bg-white/10 text-white/75 hover:bg-white/20'
                }`}
              >
                Piso (0m)
              </button>
              {activeSupport.levels.map((lv) => (
                <button
                  key={lv.label}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onChange({ y: lv.y })}
                  className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer ${
                    Math.abs((Number(item.y) || 0) - lv.y) < 0.04
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/10 text-white/75 hover:bg-white/20'
                  }`}
                >
                  {lv.label} ({fmt(lv.y, 2)}m)
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white/70">
                💡 Puedes arrastrar este objeto sobre una mesa/estantería o usar:
              </span>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onPlaceOnSurface(nearestSurface)}
                className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
              >
                📥 Colocar sobre {nearestSurface.name}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cajón desplegable "Más" para Color, Profundidad D y Coeficientes α(f) */}
      {showAdvanced && (
        <div className="pt-2 border-t border-white/15 grid sm:grid-cols-3 gap-3 text-[11px]">
          <div className="space-y-1.5">
            <span className="text-white/70 font-bold block">Posición fina / Altura Y</span>
            {item.mount === 'wall' ? (
              <label className="flex items-center justify-between gap-2">
                <span>Elevación muro:</span>
                <input
                  type="range"
                  disabled={isLocked}
                  min={0.25}
                  max={Math.max(0.5, H - 0.25)}
                  step={0.05}
                  value={Number(item.elevation) || 1.35}
                  onChange={(e) => onChange({ elevation: Number(e.target.value) })}
                  className="w-24 accent-[#a78bfa]"
                />
                <span className="font-mono">{fmt(item.elevation, 2)}m</span>
              </label>
            ) : (
              <label className="flex items-center justify-between gap-2">
                <span>Altura desde piso (Y):</span>
                <input
                  type="range"
                  disabled={isLocked}
                  min={0}
                  max={Math.max(0.5, H - 0.3)}
                  step={0.02}
                  value={Number(item.y) || 0}
                  onChange={(e) => onChange({ y: Number(e.target.value) })}
                  className="w-24 accent-[#a78bfa]"
                />
                <span className="font-mono">{fmt(item.y || 0, 2)}m</span>
              </label>
            )}
            {item.dims?.d !== undefined && (
              <label className="flex items-center justify-between gap-2">
                <span>Fondo / Profundidad (D):</span>
                <input
                  type="range"
                  disabled={isLocked}
                  min={0.25}
                  max={2.4}
                  step={0.05}
                  value={Number(item.dims.d) || 0.6}
                  onChange={(e) => onChange({ dims: { d: Number(e.target.value) } })}
                  className="w-24 accent-[#a78bfa]"
                />
                <span className="font-mono">{fmt(item.dims.d, 2)}m</span>
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-white/70 font-bold block">Color del objeto</span>
            <div className="flex flex-wrap gap-1">
              {COLOR_ROLES.map(([roleId, roleLabel]) => (
                <button
                  key={roleId}
                  type="button"
                  onClick={() => onChange({ colorRole: roleId })}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                    (item.colorRole || 'primary') === roleId
                      ? 'bg-[#5833c7] text-white'
                      : 'bg-white/10 text-white/75 hover:bg-white/20'
                  }`}
                >
                  {roleLabel}
                </button>
              ))}
              {item.colorRole === 'custom' && (
                <input
                  type="color"
                  value={item.customColor || '#7464cc'}
                  onChange={(e) => onChange({ customColor: e.target.value })}
                  className="w-6 h-5 rounded border-0 bg-transparent cursor-pointer"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-white/70 font-bold block">
              Absorción 500Hz: {item.coefficients ? `α = ${(item.coefficients[500] ?? 0.5).toFixed(2)}` : 'Sabines fijos'}
            </span>
            {item.coefficients ? (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.05}
                  max={0.99}
                  step={0.02}
                  value={item.coefficients[500] ?? 0.7}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChange({
                      coefficients: {
                        125: clamp(v * 0.45, 0.05, 0.99),
                        250: clamp(v * 0.75, 0.05, 0.99),
                        500: v,
                        1000: clamp(v * 1.05, 0.05, 0.99),
                        2000: clamp(v * 1.05, 0.05, 0.99),
                        4000: clamp(v, 0.05, 0.99),
                      },
                    });
                  }}
                  className="flex-1 accent-emerald-400"
                />
                {def.coefficients && (
                  <button
                    type="button"
                    onClick={() => onChange({ coefficients: { ...def.coefficients } })}
                    className="text-[10px] text-white/70 underline cursor-pointer"
                  >
                    Reset α
                  </button>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-white/60 block">
                Este objeto es decorativo/equipamiento o aporta absorción fija por unidad.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * PLANTA 2D INTERACTIVA UNIFICADA (OBJETOS + RUTA CINEMÁTICA INTERIOR P1..P4)
 * ============================================================================ */
function InteractiveFloorPlan2D({
  layout,
  items,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  waypoints = [],
  setWaypoints = null,
  showWaypoints = true,
  onJumpToWaypoint = null,
}) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { type: 'item', id } | { type: 'wp', index }

  const { W, D, outlinePoints, walls, corners } = layout;
  const pad = Math.max(W, D) * 0.22 + 0.5;
  const vbW = W + pad * 2;
  const vbD = D + pad * 2;
  const minX = -W / 2 - pad;
  const minZ = -D / 2 - pad;

  const clientToWorld = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    const nx = (clientX - rect.left) / Math.max(1, rect.width);
    const nz = (clientY - rect.top) / Math.max(1, rect.height);
    return {
      x: minX + nx * vbW,
      z: minZ + nz * vbD,
    };
  };

  const getItem2DPos = (item) => {
    if (item.mount === 'wall' && walls.length > 0) {
      const wInfo = walls[((Number(item.wallIndex) || 0) % walls.length + walls.length) % walls.length];
      const clampedAlong = clamp(Number(item.along) || 0, -wInfo.length / 2 + 0.1, wInfo.length / 2 - 0.1);
      const pt = sampleWallPoint(wInfo, clampedAlong);
      return {
        x: pt.x + pt.inX * 0.08,
        z: pt.z + pt.inZ * 0.08,
        angleDeg: (pt.rotationY * 180) / Math.PI,
      };
    }
    if (item.mount === 'corner' && corners.length > 0) {
      const cInfo = corners[((Number(item.cornerIndex) || 0) % corners.length + corners.length) % corners.length];
      return {
        x: cInfo.x + cInfo.inX * 0.22,
        z: cInfo.z + cInfo.inZ * 0.22,
        angleDeg: (cInfo.rotationY * 180) / Math.PI,
      };
    }
    return {
      x: Number(item.x) || 0,
      z: Number(item.z) || 0,
      angleDeg: Number(item.rotation) || 0,
    };
  };

  const polyPointsStr = outlinePoints.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`).join(' ');
  const wpPointsStr = waypoints.map((wp) => `${(Number(wp.x) || 0).toFixed(3)},${(Number(wp.z) || 0).toFixed(3)}`).join(' ');

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f5f5f7] dark:bg-[#0e101d] p-2.5">
      <div className="flex items-center justify-between text-[10px] text-[#86868b] dark:text-slate-400 mb-1.5 px-1">
        <span className="font-bold uppercase tracking-wider">
          Planta 2D (Arrastra muebles o nodos naranjas P1..P4)
        </span>
        {setWaypoints && showWaypoints && (
          <button
            type="button"
            onClick={() => setWaypoints(createDefaultInteriorWaypoints(W, D))}
            className="text-[#5833c7] dark:text-[#c4b5fd] font-bold hover:underline cursor-pointer"
          >
            Reset ruta
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`${minX} ${minZ} ${vbW} ${vbD}`}
        className="w-full h-52 touch-none select-none rounded-xl bg-white dark:bg-[#141628]"
        onPointerMove={(e) => {
          if (!dragging) return;
          const pt = clientToWorld(e.clientX, e.clientY);

          if (dragging.type === 'wp' && setWaypoints) {
            const limX = Math.max(0.4, W / 2 - 0.35);
            const limZ = Math.max(0.4, D / 2 - 0.35);
            const nx = Math.round(clamp(pt.x, -limX, limX) * 20) / 20;
            const nz = Math.round(clamp(pt.z, -limZ, limZ) * 20) / 20;
            setWaypoints((prev) =>
              prev.map((wp, idx) => (idx === dragging.index ? { ...wp, x: nx, z: nz } : wp))
            );
            return;
          }

          const item = items.find((it) => it.id === dragging.id);
          if (!item || item.locked) return;

          if (item.mount === 'wall' && walls.length > 0) {
            const wInfo = walls[((Number(item.wallIndex) || 0) % walls.length + walls.length) % walls.length];
            const vx = pt.x - wInfo.midX;
            const vz = pt.z - wInfo.midZ;
            const projAlong = vx * wInfo.tx + vz * wInfo.tz;
            const halfLim = Math.max(0.1, wInfo.length / 2 - 0.25);
            onUpdateItem(item.id, {
              along: Math.round(clamp(projAlong, -halfLim, halfLim) * 20) / 20,
            });
          } else if (item.mount === 'corner' && corners.length > 0) {
            let bestIdx = 0;
            let bestDist = Infinity;
            corners.forEach((c, idx) => {
              const dist = Math.hypot(pt.x - c.x, pt.z - c.z);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = idx;
              }
            });
            onUpdateItem(item.id, { cornerIndex: bestIdx });
          } else {
            const limX = W / 2 - 0.2;
            const limZ = D / 2 - 0.2;
            const nextX = Math.round(clamp(pt.x, -limX, limX) * 20) / 20;
            const nextZ = Math.round(clamp(pt.z, -limZ, limZ) * 20) / 20;
            if (item.mount === 'floor') {
              const support = findSupportingSurface(item, nextX, nextZ, items);
              if (support) {
                onUpdateItem(item.id, { x: nextX, z: nextZ, y: support.defaultY });
                return;
              }
            }
            onUpdateItem(item.id, { x: nextX, z: nextZ });
          }
        }}
        onPointerUp={() => setDragging(null)}
        onPointerCancel={() => setDragging(null)}
      >
        {/* Polígono del piso */}
        <polygon
          points={polyPointsStr}
          fill="rgba(88, 51, 199, 0.04)"
          stroke="#5833c7"
          strokeWidth={Math.max(W, D) * 0.012}
          strokeLinejoin="round"
        />

        {/* Etiquetas de Paredes P1..PN */}
        {walls.map((w) => {
          const lx = w.midX - w.inX * (Math.max(W, D) * 0.09);
          const lz = w.midZ - w.inZ * (Math.max(W, D) * 0.09);
          const rTag = Math.max(W, D) * 0.042;
          return (
            <g
              key={`wall-tag-${w.index}`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const sel = items.find((it) => it.id === selectedItemId);
                if (sel && sel.mount === 'wall' && !sel.locked) {
                  onUpdateItem(sel.id, { wallIndex: w.index, along: 0 });
                }
              }}
            >
              <circle cx={lx} cy={lz} r={rTag} fill="#5833c7" fillOpacity={0.14} />
              <text
                x={lx}
                y={lz + rTag * 0.34}
                textAnchor="middle"
                fontSize={rTag * 1.05}
                fontWeight="700"
                fill="#5833c7"
              >
                P{w.index + 1}
              </text>
            </g>
          );
        })}

        {/* Objetos colocados en planta */}
        {items.map((item) => {
          if (item.enabled === false) return null;
          const pos = getItem2DPos(item);
          const isSel = item.id === selectedItemId;
          const count = Math.max(1, Number(item.count) || 1);
          const unitW = Number(item.dims?.w) || 0.6;
          const totalW = unitW * count + (count - 1) * (Number(item.spacing) || 0.12);
          const depth =
            item.mount === 'wall'
              ? Math.max(0.16, Number(item.dims?.t) || 0.12)
              : Number(item.dims?.d) || Number(item.dims?.w) || 0.6;

          const fillCol =
            item.category === 'diffusers'
              ? '#d97706'
              : item.category === 'panels'
                ? '#5833c7'
                : '#059669';

          return (
            <g
              key={`plan2d-${item.id}`}
              transform={`translate(${pos.x}, ${pos.z}) rotate(${-pos.angleDeg})`}
              className={item.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                onSelectItem(item.id);
                if (!item.locked) {
                  setDragging({ type: 'item', id: item.id });
                }
              }}
            >
              <rect
                x={-totalW / 2}
                y={-depth / 2}
                width={totalW}
                height={depth}
                rx={Math.min(totalW, depth) * 0.18}
                fill={fillCol}
                fillOpacity={isSel ? 0.9 : 0.55}
                stroke={item.locked ? '#f59e0b' : isSel ? '#f59e0b' : '#ffffff'}
                strokeWidth={isSel ? Math.max(W, D) * 0.012 : Math.max(W, D) * 0.005}
              />
            </g>
          );
        })}

        {/* Ruta Cinemática Interior (P1 → P2 → P3 → P4) */}
        {showWaypoints && waypoints.length >= 2 && (
          <>
            <polyline
              points={`${wpPointsStr} ${(Number(waypoints[0].x) || 0).toFixed(3)},${(Number(waypoints[0].z) || 0).toFixed(3)}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={Math.max(W, D) * 0.01}
              strokeDasharray={`${Math.max(W, D) * 0.03} ${Math.max(W, D) * 0.02}`}
            />
            {waypoints.map((wp, idx) => {
              const rNode = Math.max(W, D) * 0.042;
              const cx = Number(wp.x) || 0;
              const cz = Number(wp.z) || 0;
              return (
                <g
                  key={wp.id}
                  transform={`translate(${cx}, ${cz})`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragging({ type: 'wp', index: idx });
                    if (onJumpToWaypoint) onJumpToWaypoint(wp);
                  }}
                >
                  <circle cx={0} cy={0} r={rNode} fill="#f59e0b" stroke="#ffffff" strokeWidth={rNode * 0.22} />
                  <text
                    x={0}
                    y={rNode * 0.36}
                    textAnchor="middle"
                    fontSize={rNode * 1.0}
                    fontWeight="800"
                    fill="#ffffff"
                  >
                    P{idx + 1}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- Controles UI */

function Panel({ icon: Icon, title, right, children }) {
  return (
    <section className={`${CARD} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={`flex items-center gap-2 text-sm font-bold ${TITLE}`}>
          <Icon className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa]" /> {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Range({ label, unit, value, min, max, step, decimals = 1, onChange }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-xs">
        <span className={MUTED}>{label}</span>
        <span className={`font-mono font-semibold ${TITLE}`}>
          {fmt(value, decimals)} {unit}
        </span>
      </span>
      <input
        type="range"
        className="w-full accent-[#5833c7]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold text-left transition cursor-pointer ${
        checked ? CHIP_ON : CHIP_OFF
      }`}
    >
      {label}
      <span
        className={`relative w-7 h-4 rounded-full shrink-0 transition ${
          checked ? 'bg-[#5833c7]' : 'bg-black/15 dark:bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
            checked ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function Choice({ label, options, value, onChange, stacked = false }) {
  return (
    <div className={stacked ? 'space-y-1.5' : 'flex items-center justify-between gap-3'}>
      <span className={`text-xs ${MUTED}`}>{label}</span>
      <div
        className={`${
          stacked ? 'flex flex-wrap' : 'inline-flex'
        } gap-1 p-1 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] text-[11px] font-semibold`}
      >
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              value === id
                ? 'bg-white dark:bg-[#2a2c44] shadow-sm ' + TITLE
                : MUTED + ' hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
