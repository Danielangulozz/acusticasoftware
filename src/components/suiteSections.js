import { BookMarked, Box, Grid3x3, Home, Image as ImageIcon, Layers, LayoutDashboard, LineChart, MessageSquare, TableProperties, Volume2, Waves } from 'lucide-react';

/**
 * Mapa único de la suite: de aquí salen el menú lateral, el título de la cabecera, la barra
 * «anterior / siguiente» y los enlaces directos (#geometria, #fichas/sabine…).
 *
 *   Proyecto      → por dónde empezar y cómo va la sala
 *   Tu sala       → los tres pasos para describirla
 *   Resultados    → lo que el software calcula con esa descripción
 *   Herramientas  → utilidades que no dependen de la sala
 *   Respaldo      → cómo se calcula cada cosa
 */
export const SECTION_GROUPS = [
  {
    title: 'Proyecto',
    items: [
      { id: 'welcome', label: 'Inicio', title: 'Inicio', hint: 'Por dónde empezar y salas de ejemplo', icon: Home },
      { id: 'overview', label: 'Resumen de la sala', title: 'Resumen de la sala', hint: 'El diagnóstico de un vistazo', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Tu sala',
    items: [
      { id: 'geometry', step: 1, label: 'Geometría', title: 'Paso 1 · Geometría', hint: 'Medidas y forma de la planta', icon: Box },
      { id: 'materials', step: 2, label: 'Materiales', title: 'Paso 2 · Materiales', hint: 'De qué están hechos piso, techo y paredes', icon: Layers },
      { id: 'source', step: 3, label: 'Fuente y oyente', title: 'Paso 3 · Fuente y oyente', hint: 'Potencia, dirección y distancia', icon: Volume2 },
    ],
  },
  {
    title: 'Resultados',
    items: [
      { id: 'results', step: 4, label: 'Reverberación', title: 'Paso 4 · Reverberación', hint: 'Tiempo de eco y niveles por banda', icon: TableProperties },
      { id: 'charts', step: 5, label: 'Gráficas', title: 'Paso 5 · Gráficas', hint: 'Curvas por frecuencia y distancia', icon: LineChart },
      { id: 'modes', label: 'Graves y modos propios', title: 'Graves y modos propios', hint: 'Resonancias de baja frecuencia', icon: Waves },
      { id: 'intelligibility', label: 'Inteligibilidad de la voz', title: 'Inteligibilidad de la voz', hint: 'Qué tan bien se entiende la palabra', icon: MessageSquare },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { id: 'diffusers', label: 'Diseño de difusores', title: 'Diseño de difusores', hint: 'QRD, PRD, MLS y lista de corte', icon: Grid3x3 },
      { id: 'renders', label: 'Estudio de renders', title: 'Estudio de renders', hint: 'Crea tus propias imágenes 3D', icon: ImageIcon, badge: 'Nuevo' },
    ],
  },
  {
    title: 'Respaldo técnico',
    items: [{ id: 'fichas', label: 'Fichas técnicas', title: 'Fichas técnicas', hint: 'Fórmulas, normas y comprobación', icon: BookMarked }],
  },
];

export const SECTIONS = SECTION_GROUPS.flatMap((g) => g.items);
export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
SECTION_BY_ID.all = { id: 'all', label: 'Vista completa', title: 'Todos los módulos en una página', hint: '' };

/** Recorrido lineal para los botones «anterior / siguiente» (configurar la sala y ver resultados). */
export const STEP_FLOW = ['overview', 'geometry', 'materials', 'source', 'results', 'charts', 'modes', 'intelligibility'].map((id) => SECTION_BY_ID[id]);

/** Alias aceptados en la URL (#geometria, #difusores, #fichas/sabine…). */
const HASH_ALIASES = {
  welcome: 'welcome', inicio: 'welcome',
  overview: 'overview', resumen: 'overview',
  geometry: 'geometry', geometria: 'geometry',
  materials: 'materials', materiales: 'materials',
  source: 'source', fuente: 'source',
  results: 'results', resultados: 'results', reverberacion: 'results',
  charts: 'charts', graficas: 'charts',
  modes: 'modes', modos: 'modes',
  intelligibility: 'intelligibility', inteligibilidad: 'intelligibility',
  diffusers: 'diffusers', difusores: 'diffusers',
  renders: 'renders', render: 'renders',
  fichas: 'fichas', formulas: 'fichas', metodologia: 'fichas',
  all: 'all',
};

export function sectionFromHash(hash) {
  const raw = String(hash || '').replace(/^#/, '').split('/')[0].trim().toLowerCase();
  return HASH_ALIASES[raw] || null;
}
