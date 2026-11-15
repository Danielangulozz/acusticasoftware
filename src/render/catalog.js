import { OCTAVE_BANDS } from '../utils/acousticCalculations.js';

/**
 * Catálogo completo de objetos 3D personalizables para el Estudio de Renders y Simulación Acústica:
 *   1. Mobiliario y equipamiento (`furniture`)
 *   2. Paneles absorbentes, trampas de graves y nubes de techo (`panels`)
 *   3. Difusores acústicos 1D, 2D y policilíndricos (`diffusers`)
 *
 * Cada elemento incluye:
 *   - Dimensiones por defecto y rangos editables
 *   - Modo de montaje (`floor`, `wall`, `corner`, `ceiling`, `free`)
 *   - Coeficientes de absorción α(f) por banda de octava (125..4000 Hz) o Sabines equivalentes
 *   - Coeficientes de dispersión/difusión s(f) (para difusores y mobiliario irregular)
 */

export const SCENE_CATEGORIES = [
  { id: 'panels', label: 'Paneles y Trampas', shortLabel: 'Paneles' },
  { id: 'diffusers', label: 'Difusores', shortLabel: 'Difusores' },
  { id: 'furniture', label: 'Mobiliario', shortLabel: 'Muebles' },
];

// ============================================================================
// 1. CATÁLOGO DE PANELES ABSORBENTES, TRAMPAS Y NUBES
// ============================================================================
export const PANEL_CATALOG = {
  panel_porous_50: {
    id: 'panel_porous_50',
    category: 'panels',
    name: 'Panel Absorbente Poroso 50 mm',
    subtitle: 'Lana mineral / fibra de vidrio tapizada (Medios y Agudos)',
    mount: 'wall',
    defaultDims: { w: 0.6, h: 1.2, t: 0.05 },
    colorRole: 'primary',
    frame: true,
    // Coeficientes α por m² de área frontal
    coefficients: { 125: 0.22, 250: 0.62, 500: 0.88, 1000: 0.95, 2000: 0.92, 4000: 0.88 },
    description: 'Absorbente poroso estándar para control de primeras reflexiones y flutter echo.',
  },
  panel_broadband_100: {
    id: 'panel_broadband_100',
    category: 'panels',
    name: 'Panel Broadband 100 mm (Banda Ancha)',
    subtitle: 'Lana de roca alta densidad + cámara de aire (Graves a Agudos)',
    mount: 'wall',
    defaultDims: { w: 0.6, h: 1.2, t: 0.10 },
    colorRole: 'neutral',
    frame: true,
    coefficients: { 125: 0.58, 250: 0.88, 500: 0.98, 1000: 0.99, 2000: 0.95, 4000: 0.90 },
    description: 'Panel de gran espesor con absorción extendida hasta bajas frecuencias (125–250 Hz).',
  },
  panel_foam_pyramid: {
    id: 'panel_foam_pyramid',
    category: 'panels',
    name: 'Espuma Acústica Piramidal 50 mm',
    subtitle: 'Poliuretano de celda abierta con relieve piramidal (Agudos)',
    mount: 'wall',
    defaultDims: { w: 0.6, h: 0.6, t: 0.05 },
    colorRole: 'dark',
    frame: false,
    coefficients: { 125: 0.10, 250: 0.25, 500: 0.52, 1000: 0.78, 2000: 0.92, 4000: 0.96 },
    description: 'Eficaz en altas frecuencias (≥ 1 kHz); baja absorción en graves.',
  },
  panel_perforated_helmholtz: {
    id: 'panel_perforated_helmholtz',
    category: 'panels',
    name: 'Panel de Madera Perforada (Helmholtz)',
    subtitle: 'Resonador selectivo con velo acústico posterior (Medios-Graves)',
    mount: 'wall',
    defaultDims: { w: 0.9, h: 1.2, t: 0.06 },
    colorRole: 'wood',
    frame: true,
    coefficients: { 125: 0.38, 250: 0.74, 500: 0.84, 1000: 0.56, 2000: 0.32, 4000: 0.20 },
    description: 'Absorbe selectivamente entre 200 Hz y 800 Hz conservando la viveza en agudos.',
  },
  panel_slats: {
    id: 'panel_slats',
    category: 'panels',
    name: 'Panel de Listones sobre Fieltro PET',
    subtitle: 'Alistonado de madera con respaldo fonoabsorbente',
    mount: 'wall',
    defaultDims: { w: 1.2, h: 2.2, t: 0.035 },
    colorRole: 'wood',
    frame: false,
    coefficients: { 125: 0.25, 250: 0.52, 500: 0.74, 1000: 0.68, 2000: 0.56, 4000: 0.48 },
    description: 'Combina absorción media con micro-dispersión frontal por las ranuras de madera.',
  },
  panel_membrane: {
    id: 'panel_membrane',
    category: 'panels',
    name: 'Trampa Diafragmática (Membrana Graves)',
    subtitle: 'Panel sellado resonante sintonizado a bajas frecuencias',
    mount: 'wall',
    defaultDims: { w: 0.6, h: 1.2, t: 0.12 },
    colorRole: 'dark',
    frame: true,
    coefficients: { 125: 0.78, 250: 0.62, 500: 0.30, 1000: 0.16, 2000: 0.10, 4000: 0.08 },
    description: 'Diseñado específicamente para amortiguar modos axiales y exceso de energía en 63–250 Hz.',
  },
  hex_felt: {
    id: 'hex_felt',
    category: 'panels',
    name: 'Mosaico Hexagonal de Fieltro PET',
    subtitle: 'Celdas decorativas de poliéster reciclado de alta densidad',
    mount: 'wall',
    defaultDims: { w: 1.4, h: 1.0, t: 0.025, cols: 5, rows: 4 },
    colorRole: 'primary',
    frame: false,
    coefficients: { 125: 0.08, 250: 0.20, 500: 0.44, 1000: 0.68, 2000: 0.80, 4000: 0.86 },
    description: 'Tratamiento ligero para control de eco de aleteo y reverberación en frecuencias vocales.',
  },
  trap_corner: {
    id: 'trap_corner',
    category: 'panels',
    name: 'Trampa de Graves Esquinera (Superchunk)',
    subtitle: 'Prisma triangular de esquina para nodos de presión modal',
    mount: 'corner',
    defaultDims: { w: 0.45, h: 2.2, t: 0.45 },
    colorRole: 'dark',
    frame: true,
    coefficients: { 125: 0.76, 250: 0.92, 500: 0.96, 1000: 0.90, 2000: 0.82, 4000: 0.75 },
    description: 'Se ubica en las intersecciones de paredes donde los modos propios tienen máxima presión.',
  },
  trap_tube: {
    id: 'trap_tube',
    category: 'panels',
    name: 'Trampa Cilíndrica (Tube Trap)',
    subtitle: 'Columna absorbente/difusora de graves con tapas de madera',
    mount: 'corner',
    defaultDims: { w: 0.40, h: 1.8, t: 0.40 },
    colorRole: 'primary',
    frame: true,
    coefficients: { 125: 0.70, 250: 0.88, 500: 0.85, 1000: 0.70, 2000: 0.58, 4000: 0.48 },
    description: 'Cilindro resonante y poroso que puede colocarse en esquinas o libre en el piso.',
  },
  cloud_ceiling: {
    id: 'cloud_ceiling',
    category: 'panels',
    name: 'Nube Acústica Suspendida (Cloud)',
    subtitle: 'Panel horizontal colgado del techo sobre zona de escucha',
    mount: 'ceiling',
    defaultDims: { w: 1.2, d: 0.9, t: 0.06, drop: 0.35 },
    colorRole: 'neutral',
    frame: false,
    coefficients: { 125: 0.45, 250: 0.82, 500: 0.96, 1000: 0.98, 2000: 0.94, 4000: 0.90 },
    description: 'Intercepta la reflexión primaria del techo gracias al plenum de aire superior.',
  },
  baffles_ceiling: {
    id: 'baffles_ceiling',
    category: 'panels',
    name: 'Bafles Verticales Colgantes',
    subtitle: 'Conjunto de pantallas absorbentes por ambas caras en techo',
    mount: 'ceiling',
    defaultDims: { w: 1.6, d: 1.2, h: 0.32, t: 0.04, drop: 0.30, baffleCount: 5 },
    colorRole: 'secondary',
    frame: false,
    coefficients: { 125: 0.32, 250: 0.66, 500: 0.90, 1000: 0.94, 2000: 0.90, 4000: 0.84 },
    description: 'Ideal para salas de juntas, aulas y espacios amplios al absorber por ambas caras.',
  },
};

// ============================================================================
// 2. CATÁLOGO DE DIFUSORES ACÚSTICOS
// ============================================================================
export const DIFFUSER_CATALOG = {
  diffuser_qrd1d: {
    id: 'diffuser_qrd1d',
    category: 'diffusers',
    name: 'Difusor QRD 1D (Schroeder)',
    subtitle: 'Secuencia de residuo cuadrático unidimensional (dispersión hemisférica)',
    mount: 'wall',
    defaultDims: { w: 0.92, h: 1.2, t: 0.17, p: 7, periods: 2, well: 0.06, orientation: 'vertical' },
    colorRole: 'wood',
    // Absorción parásita por resonancia en los pozos + madera
    coefficients: { 125: 0.18, 250: 0.26, 500: 0.22, 1000: 0.16, 2000: 0.12, 4000: 0.10 },
    scattering: { 125: 0.15, 250: 0.45, 500: 0.82, 1000: 0.90, 2000: 0.88, 4000: 0.78 },
    description: 'Dispersa las reflexiones en un plano sin apagar la energía acústica de la sala.',
  },
  diffuser_skyline: {
    id: 'diffuser_skyline',
    category: 'diffusers',
    name: 'Difusor QRD 2D (Skyline)',
    subtitle: 'Matriz bidimensional de bloques sintonizados (dispersión omnidireccional)',
    mount: 'wall',
    defaultDims: { w: 0.60, h: 0.60, t: 0.18, p: 7, cell: 0.085, tiles: 1 },
    colorRole: 'wood',
    coefficients: { 125: 0.14, 250: 0.22, 500: 0.20, 1000: 0.15, 2000: 0.12, 4000: 0.10 },
    scattering: { 125: 0.12, 250: 0.38, 500: 0.78, 1000: 0.92, 2000: 0.94, 4000: 0.88 },
    description: 'Difunde el sonido tanto horizontal como verticalmente; ideal para pared trasera o techo.',
  },
  diffuser_prd: {
    id: 'diffuser_prd',
    category: 'diffusers',
    name: 'Difusor de Raíz Primitiva (PRD 1D)',
    subtitle: 'Elimina el haz especular mediante secuencia de raíz primitiva g^n mod p',
    mount: 'wall',
    defaultDims: { w: 0.86, h: 1.2, t: 0.16, p: 7, periods: 2, well: 0.06 },
    colorRole: 'wood',
    coefficients: { 125: 0.16, 250: 0.24, 500: 0.22, 1000: 0.16, 2000: 0.12, 4000: 0.10 },
    scattering: { 125: 0.15, 250: 0.42, 500: 0.80, 1000: 0.88, 2000: 0.86, 4000: 0.76 },
    description: 'Suprime la reflexión en la dirección especular redirigiendo energía a ángulos laterales.',
  },
  diffuser_mls: {
    id: 'diffuser_mls',
    category: 'diffusers',
    name: 'Difusor Binario MLS',
    subtitle: 'Secuencia de longitud máxima de 2 niveles (baja profundidad)',
    mount: 'wall',
    defaultDims: { w: 0.90, h: 1.2, t: 0.10, order: 3, periods: 2, well: 0.06 },
    colorRole: 'wood',
    coefficients: { 125: 0.12, 250: 0.18, 500: 0.16, 1000: 0.14, 2000: 0.10, 4000: 0.09 },
    scattering: { 125: 0.10, 250: 0.30, 500: 0.68, 1000: 0.76, 2000: 0.65, 4000: 0.52 },
    description: 'Difusor compacto de perfil bajo para salas con espacio reducido.',
  },
  diffuser_poly: {
    id: 'diffuser_poly',
    category: 'diffusers',
    name: 'Difusor Policilíndrico Curvo',
    subtitle: 'Arco convexo de madera laminada (dispersión suave + absorción en graves)',
    mount: 'wall',
    defaultDims: { w: 0.55, h: 1.4, t: 0.14, chord: 0.55, sag: 0.14, polyCount: 2 },
    colorRole: 'wood',
    coefficients: { 125: 0.35, 250: 0.28, 500: 0.18, 1000: 0.12, 2000: 0.10, 4000: 0.08 },
    scattering: { 125: 0.25, 250: 0.55, 500: 0.75, 1000: 0.82, 2000: 0.85, 4000: 0.85 },
    description: 'Dispersa uniformemente y actúa como resonador diafragmático en bajas frecuencias.',
  },
  diffuser_suite: {
    id: 'diffuser_suite',
    category: 'diffusers',
    name: 'Mi Difusor Diseñado en la Suite',
    subtitle: 'Sincronizado automáticamente con el módulo «Diseño de difusores»',
    mount: 'wall',
    defaultDims: { w: 0.80, h: 0.80, t: 0.16 },
    colorRole: 'wood',
    coefficients: { 125: 0.16, 250: 0.24, 500: 0.20, 1000: 0.15, 2000: 0.12, 4000: 0.10 },
    scattering: { 125: 0.20, 250: 0.50, 500: 0.85, 1000: 0.90, 2000: 0.88, 4000: 0.80 },
    description: 'Coloca en cualquier pared de tu sala el difusor exacto que diseñaste en el laboratorio.',
  },
};

// ============================================================================
// 3. CATÁLOGO DE MOBILIARIO Y EQUIPAMIENTO
// ============================================================================
export const FURNITURE_CATALOG = {
  desk: {
    id: 'desk',
    category: 'furniture',
    name: 'Mesa de Mezcla / Escritorio de Estudio',
    subtitle: 'Con monitor DAW, interfaz de audio y controlador',
    mount: 'floor',
    defaultDims: { w: 1.85, d: 0.82, h: 0.76 },
    colorRole: 'wood',
    // Sabines equivalentes (m²) aportados por unidad
    sabines: { 125: 0.18, 250: 0.22, 500: 0.25, 1000: 0.28, 2000: 0.30, 4000: 0.30 },
    description: 'Estación de trabajo central de producción o control.',
  },
  studio_monitors: {
    id: 'studio_monitors',
    category: 'furniture',
    name: 'Monitores de Estudio en Soportes (Par)',
    subtitle: 'Par de altavoces de campo cercano sobre pedestales',
    mount: 'floor',
    defaultDims: { w: 2.2, d: 0.4, h: 1.22, spread: 2.0 },
    colorRole: 'dark',
    sabines: { 125: 0.04, 250: 0.05, 500: 0.06, 1000: 0.06, 2000: 0.06, 4000: 0.06 },
    description: 'Par estéreo con apertura (spread) ajustable.',
  },
  task_chair: {
    id: 'task_chair',
    category: 'furniture',
    name: 'Silla Ergonómica Tapizada',
    subtitle: 'Silla de operador / ingeniero con respaldo textil',
    mount: 'floor',
    defaultDims: { w: 0.60, d: 0.60, h: 0.98 },
    colorRole: 'dark',
    sabines: { 125: 0.15, 250: 0.25, 500: 0.35, 1000: 0.42, 2000: 0.45, 4000: 0.45 },
    description: 'Asiento acolchado que aporta absorción equivalente en el punto de escucha.',
  },
  sofa: {
    id: 'sofa',
    category: 'furniture',
    name: 'Sofá Acústico Tapizado (2-3 Plazas)',
    subtitle: 'Mobiliario de alta absorción por volumen de espuma y textil',
    mount: 'floor',
    defaultDims: { w: 1.85, d: 0.88, h: 0.82 },
    colorRole: 'neutral',
    sabines: { 125: 0.65, 250: 0.95, 500: 1.35, 1000: 1.55, 2000: 1.65, 4000: 1.60 },
    description: 'Gran aportación de absorción de banda ancha en la zona posterior de la sala.',
  },
  bookshelf: {
    id: 'bookshelf',
    category: 'furniture',
    name: 'Estantería / Librero Acústico Irregular',
    subtitle: 'Estante con libros de profundidades variadas (absorción + difusión)',
    mount: 'floor',
    defaultDims: { w: 1.20, d: 0.36, h: 1.95 },
    colorRole: 'wood',
    sabines: { 125: 0.35, 250: 0.55, 500: 0.72, 1000: 0.80, 2000: 0.78, 4000: 0.75 },
    description: 'Actúa simultáneamente como absorbente poroso y difusor irregular.',
  },
  rack: {
    id: 'rack',
    category: 'furniture',
    name: 'Rack de Equipos Pro-Audio 19"',
    subtitle: 'Gabinete de procesadores analógicos con vúmetros LED',
    mount: 'floor',
    defaultDims: { w: 0.58, d: 0.55, h: 0.95 },
    colorRole: 'wood',
    sabines: { 125: 0.10, 250: 0.12, 500: 0.12, 1000: 0.10, 2000: 0.10, 4000: 0.10 },
    description: 'Mueble técnico para compresores, preamplificadores y conversores.',
  },
  subwoofer: {
    id: 'subwoofer',
    category: 'furniture',
    name: 'Subwoofer Activo de Estudio / Cine',
    subtitle: 'Recinto de graves de tiro frontal con puerto bass-reflex',
    mount: 'floor',
    defaultDims: { w: 0.42, d: 0.46, h: 0.45 },
    colorRole: 'dark',
    sabines: { 125: 0.05, 250: 0.05, 500: 0.04, 1000: 0.04, 2000: 0.04, 4000: 0.04 },
    description: 'Fuente de bajas frecuencias para monitoreo 2.1 o LFE.',
  },
  cinema_row: {
    id: 'cinema_row',
    category: 'furniture',
    name: 'Fila de Butacas Acústicas (Cine / Auditorio)',
    subtitle: 'Asientos reclinables tapizados con opción de tarima',
    mount: 'floor',
    defaultDims: { w: 2.4, d: 0.92, h: 1.05, seats: 3, riser: false },
    colorRole: 'primary',
    // Sabines por fila (escala según número de asientos)
    sabines: { 125: 0.85, 250: 1.35, 500: 1.85, 1000: 2.10, 2000: 2.25, 4000: 2.20 },
    description: 'Butacas de alta absorción textil para salas de proyección o auditorios.',
  },
  tower_speaker: {
    id: 'tower_speaker',
    category: 'furniture',
    name: 'Altavoz de Torre Hi-Fi / Cine',
    subtitle: 'Columna acústica de 3 vías',
    mount: 'floor',
    defaultDims: { w: 0.26, d: 0.32, h: 1.08 },
    colorRole: 'dark',
    sabines: { 125: 0.03, 250: 0.04, 500: 0.04, 1000: 0.04, 2000: 0.04, 4000: 0.04 },
    description: 'Columna de piso para escucha estéreo o canales frontales.',
  },
  meeting_table: {
    id: 'meeting_table',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Mesa de Juntas / Conferencia (Alargable)',
    subtitle: 'Mesa de madera alargable (1.8 a 6.0 m) con opción de sillas integradas',
    mount: 'floor',
    isSurfaceProvider: true,
    defaultDims: { w: 2.8, d: 1.15, h: 0.74, withChairs: false },
    colorRole: 'wood',
    sabines: { 125: 0.20, 250: 0.22, 500: 0.20, 1000: 0.18, 2000: 0.18, 4000: 0.18 },
    description: 'Superficie central alargable para salas corporativas o educativas; soporta objetos encima.',
  },
  shell_chair: {
    id: 'shell_chair',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Silla de Reunión / Aula',
    subtitle: 'Silla ligera tapizada (individual o en fila)',
    mount: 'floor',
    defaultDims: { w: 0.50, d: 0.50, h: 0.82 },
    colorRole: 'secondary',
    sabines: { 125: 0.10, 250: 0.16, 500: 0.22, 1000: 0.26, 2000: 0.28, 4000: 0.28 },
    description: 'Silla versátil para salas de conferencias, aulas o visitas.',
  },
  sideboard: {
    id: 'sideboard',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Credenza / Mueble Bajo (Alargable)',
    subtitle: 'Aparador de madera para colocar objetos encima',
    mount: 'floor',
    isSurfaceProvider: true,
    defaultDims: { w: 1.5, d: 0.42, h: 0.66 },
    colorRole: 'wood',
    sabines: { 125: 0.16, 250: 0.18, 500: 0.16, 1000: 0.15, 2000: 0.14, 4000: 0.14 },
    description: 'Mueble auxiliar para almacenamiento y apoyo de TV, libros o cafetera.',
  },
  keyboard_stand: {
    id: 'keyboard_stand',
    category: 'furniture',
    name: 'Sintetizador / Piano Digital en Soporte',
    subtitle: 'Teclado de 88 teclas sobre soporte metálico',
    mount: 'floor',
    defaultDims: { w: 1.32, d: 0.38, h: 0.84 },
    colorRole: 'dark',
    sabines: { 125: 0.04, 250: 0.05, 500: 0.06, 1000: 0.06, 2000: 0.06, 4000: 0.06 },
    description: 'Instrumento musical para zonas de grabación o composición.',
  },
  rug: {
    id: 'rug',
    category: 'furniture',
    name: 'Alfombra Acústica Rectangular',
    subtitle: 'Tejido denso para eliminar la reflexión especular del piso',
    mount: 'floor',
    defaultDims: { w: 2.6, d: 1.8, h: 0.02 },
    colorRole: 'neutral',
    // Usa coeficientes por área (w * d)
    coefficients: { 125: 0.08, 250: 0.22, 500: 0.45, 1000: 0.60, 2000: 0.68, 4000: 0.72 },
    description: 'Atenúa reflexiones de piso en frecuencias medias y altas.',
  },
  round_rug: {
    id: 'round_rug',
    category: 'furniture',
    name: 'Alfombra Circular Acústica',
    subtitle: 'Tapete circular de pelo denso',
    mount: 'floor',
    defaultDims: { w: 1.8, d: 1.8, h: 0.02, r: 0.9 },
    colorRole: 'accent',
    coefficients: { 125: 0.08, 250: 0.22, 500: 0.45, 1000: 0.60, 2000: 0.68, 4000: 0.72 },
    description: 'Tapete circular para zonas de descanso o instrumentos.',
  },
  coffee_table: {
    id: 'coffee_table',
    category: 'furniture',
    name: 'Mesa de Centro Circular',
    subtitle: 'Mesa auxiliar de madera',
    mount: 'floor',
    defaultDims: { w: 0.80, d: 0.80, h: 0.38, r: 0.40 },
    colorRole: 'wood',
    sabines: { 125: 0.03, 250: 0.03, 500: 0.03, 1000: 0.03, 2000: 0.03, 4000: 0.03 },
    description: 'Mesa pequeña para acompañar el sofá.',
  },
  pouf: {
    id: 'pouf',
    category: 'furniture',
    name: 'Puf Cilíndrico Tapizado',
    subtitle: 'Asiento compacto relleno de espuma',
    mount: 'floor',
    defaultDims: { w: 0.50, d: 0.50, h: 0.40, r: 0.25 },
    colorRole: 'accent',
    sabines: { 125: 0.12, 250: 0.22, 500: 0.30, 1000: 0.34, 2000: 0.35, 4000: 0.35 },
    description: 'Asiento auxiliar fonoabsorbente.',
  },
  plant: {
    id: 'plant',
    category: 'furniture',
    name: 'Planta Natural en Maceta',
    subtitle: 'Elemento orgánico decorativo y micro-dispersor',
    mount: 'floor',
    defaultDims: { w: 0.55, d: 0.55, h: 1.50 },
    colorRole: 'neutral',
    sabines: { 125: 0.02, 250: 0.04, 500: 0.08, 1000: 0.12, 2000: 0.16, 4000: 0.20 },
    description: 'Aporta confort visual y ligera dispersión en altas frecuencias.',
  },
  floor_lamp: {
    id: 'floor_lamp',
    category: 'furniture',
    name: 'Lámpara Cálida de Pie',
    subtitle: 'Luminaria ambiental (emite luz cálida en modo noche)',
    mount: 'floor',
    defaultDims: { w: 0.40, d: 0.40, h: 1.65 },
    colorRole: 'neutral',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Añade iluminación focal cálida a la escena.',
  },
  wall_screen: {
    id: 'wall_screen',
    category: 'furniture',
    subCategory: 'studio',
    name: 'Pantalla Mural / Proyección',
    subtitle: 'Monitor de gran formato o pantalla de cine en pared',
    mount: 'wall',
    defaultDims: { w: 1.90, h: 1.06, t: 0.05, screenKind: 'daw' },
    colorRole: 'dark',
    coefficients: { 125: 0.03, 250: 0.03, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Pantalla emisiva configurable (DAW, Película, Gráficas o Clase).',
  },
  drum_kit: {
    id: 'drum_kit',
    category: 'furniture',
    subCategory: 'studio',
    name: 'Batería Acústica Completa',
    subtitle: 'Bombo, caja, toms, platillos y banqueta de baterista',
    mount: 'floor',
    defaultDims: { w: 1.45, d: 1.25, h: 1.15 },
    colorRole: 'accent',
    sabines: { 125: 0.14, 250: 0.18, 500: 0.20, 1000: 0.18, 2000: 0.16, 4000: 0.15 },
    description: 'Set de percusión acústica para salas de grabación o ensayo.',
  },
  guitar_amp: {
    id: 'guitar_amp',
    category: 'furniture',
    subCategory: 'studio',
    name: 'Amplificador de Guitarra / Bajo',
    subtitle: 'Gabinete de válvulas con malla textil frontal',
    mount: 'floor',
    defaultDims: { w: 0.68, d: 0.28, h: 0.54 },
    colorRole: 'dark',
    sabines: { 125: 0.05, 250: 0.06, 500: 0.06, 1000: 0.05, 2000: 0.05, 4000: 0.05 },
    description: 'Amplificador de instrumento para estudio o escenario.',
  },
  mic_stand: {
    id: 'mic_stand',
    category: 'furniture',
    subCategory: 'studio',
    name: 'Micrófono de Estudio con Brazo',
    subtitle: 'Condensador vocal sobre pedestal boom',
    mount: 'floor',
    defaultDims: { w: 0.45, d: 0.45, h: 1.55 },
    colorRole: 'dark',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Punto de captación vocal o instrumental.',
  },

  // --- MUEBLERÍA DE UNIVERSIDAD / COLEGIO ---
  student_desk: {
    id: 'student_desk',
    category: 'furniture',
    subCategory: 'education',
    name: 'Pupitre Universitario / Escolar',
    subtitle: 'Escritorio individual de aula con silla integrada',
    mount: 'floor',
    defaultDims: { w: 0.68, d: 0.82, h: 0.75 },
    colorRole: 'primary',
    sabines: { 125: 0.12, 250: 0.18, 500: 0.24, 1000: 0.28, 2000: 0.30, 4000: 0.30 },
    description: 'Puesto individual de estudiante para colegios y universidades.',
  },
  classroom_desk_grid: {
    id: 'classroom_desk_grid',
    category: 'furniture',
    subCategory: 'education',
    name: 'Grupo de Pupitres de Aula (Matriz)',
    subtitle: 'Conjunto de pupitres en filas × columnas para llenar un salón',
    mount: 'floor',
    defaultDims: { w: 2.75, d: 2.20, h: 0.75, cols: 3, rows: 2 },
    colorRole: 'primary',
    // Sabines base por pupitre (se multiplica por cols * rows en calculateItemAbsorption)
    sabines: { 125: 0.12, 250: 0.18, 500: 0.24, 1000: 0.28, 2000: 0.30, 4000: 0.30 },
    description: 'Permite poblar rápidamente un aula escolar o universitaria.',
  },
  teacher_desk: {
    id: 'teacher_desk',
    category: 'furniture',
    subCategory: 'education',
    name: 'Escritorio de Profesor / Cátedra',
    subtitle: 'Mesa docente con cajonera lateral y computador portátil',
    mount: 'floor',
    defaultDims: { w: 1.55, d: 0.76, h: 0.75 },
    colorRole: 'wood',
    sabines: { 125: 0.18, 250: 0.22, 500: 0.25, 1000: 0.26, 2000: 0.26, 4000: 0.26 },
    description: 'Escritorio principal para el docente al frente del aula.',
  },
  whiteboard: {
    id: 'whiteboard',
    category: 'furniture',
    subCategory: 'education',
    name: 'Pizarra Acrílica / Tablero Universitario',
    subtitle: 'Tablero mural con marco de aluminio y bandeja de marcadores',
    mount: 'wall',
    defaultDims: { w: 2.40, h: 1.20, t: 0.03 },
    colorRole: 'neutral',
    coefficients: { 125: 0.02, 250: 0.02, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Superficie reflectante frontal típica de aulas y salones de clase.',
  },
  podium: {
    id: 'podium',
    category: 'furniture',
    subCategory: 'education',
    name: 'Atril / Podio de Auditorio',
    subtitle: 'Podio de madera para conferencista con micrófono',
    mount: 'floor',
    defaultDims: { w: 0.62, d: 0.48, h: 1.16 },
    colorRole: 'wood',
    sabines: { 125: 0.08, 250: 0.10, 500: 0.10, 1000: 0.10, 2000: 0.10, 4000: 0.10 },
    description: 'Atril de orador para aulas magnas, auditorios y salones.',
  },
  ceiling_projector: {
    id: 'ceiling_projector',
    category: 'furniture',
    subCategory: 'education',
    name: 'Proyector Multimedia de Techo',
    subtitle: 'Videoproyector suspendido con soporte telescópico',
    mount: 'ceiling',
    defaultDims: { w: 0.38, d: 0.32, h: 0.16, drop: 0.36 },
    colorRole: 'neutral',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Proyector audiovisual para aulas, salas de juntas y cines.',
  },
  locker_bank: {
    id: 'locker_bank',
    category: 'furniture',
    subCategory: 'education',
    name: 'Casilleros Metálicos Escolares (Lockers)',
    subtitle: 'Módulo de casilleros de acero de doble nivel',
    mount: 'floor',
    defaultDims: { w: 1.20, d: 0.46, h: 1.85, cols: 3 },
    colorRole: 'dark',
    sabines: { 125: 0.22, 250: 0.20, 500: 0.15, 1000: 0.12, 2000: 0.10, 4000: 0.10 },
    description: 'Mobiliario metálico escolar con resonancia ligera en bajas frecuencias.',
  },
  lab_bench: {
    id: 'lab_bench',
    category: 'furniture',
    subCategory: 'education',
    name: 'Mesa de Laboratorio Universitario',
    subtitle: 'Mesón fenólico con estante de reactivos y taburetes',
    mount: 'floor',
    defaultDims: { w: 2.10, d: 0.85, h: 0.88 },
    colorRole: 'dark',
    sabines: { 125: 0.18, 250: 0.20, 500: 0.22, 1000: 0.22, 2000: 0.20, 4000: 0.20 },
    description: 'Estación de trabajo para laboratorios de ciencias e ingeniería.',
  },

  // --- EQUIPAMIENTO Y MOBILIARIO INDUSTRIAL ---
  industrial_machine: {
    id: 'industrial_machine',
    category: 'furniture',
    subCategory: 'industrial',
    name: 'Maquinaria Industrial / Compresor / CNC',
    subtitle: 'Equipo pesado con motor, bancada antivibratoria y panel de control',
    mount: 'floor',
    defaultDims: { w: 1.45, d: 0.92, h: 1.35 },
    colorRole: 'accent',
    sabines: { 125: 0.15, 250: 0.18, 500: 0.20, 1000: 0.18, 2000: 0.16, 4000: 0.15 },
    description: 'Fuente de ruido o maquinaria principal en plantas y talleres industriales.',
  },
  hvac_duct: {
    id: 'hvac_duct',
    category: 'furniture',
    subCategory: 'industrial',
    name: 'Conducto de Ventilación Industrial HVAC',
    subtitle: 'Ducto aéreo de acero galvanizado con rejillas difusoras',
    mount: 'ceiling',
    defaultDims: { w: 2.80, d: 0.46, h: 0.34, drop: 0.38 },
    colorRole: 'neutral',
    sabines: { 125: 0.28, 250: 0.22, 500: 0.14, 1000: 0.10, 2000: 0.08, 4000: 0.08 },
    description: 'Ductería suspendida típica de naves industriales, aulas y auditorios.',
  },
  industrial_shelving: {
    id: 'industrial_shelving',
    category: 'furniture',
    subCategory: 'industrial',
    name: 'Estantería Pesada de Almacén (Rack)',
    subtitle: 'Rack industrial de carga con cajas y materiales (absorción + dispersión)',
    mount: 'floor',
    defaultDims: { w: 1.65, d: 0.58, h: 2.10 },
    colorRole: 'primary',
    sabines: { 125: 0.42, 250: 0.65, 500: 0.85, 1000: 0.92, 2000: 0.88, 4000: 0.82 },
    description: 'Estantería de planta con cajas que aporta absorción porosa y dispersión.',
  },
  workbench: {
    id: 'workbench',
    category: 'furniture',
    subCategory: 'industrial',
    name: 'Banco de Trabajo Mecánico / Taller',
    subtitle: 'Mesa robusta de taller con tablero portaherramientas',
    mount: 'floor',
    defaultDims: { w: 1.65, d: 0.75, h: 0.86 },
    colorRole: 'wood',
    sabines: { 125: 0.14, 250: 0.18, 500: 0.20, 1000: 0.20, 2000: 0.18, 4000: 0.18 },
    description: 'Estación de trabajo para talleres mecánicos, laboratorios o plantas.',
  },
  acoustic_barrier: {
    id: 'acoustic_barrier',
    category: 'furniture',
    subCategory: 'industrial',
    name: 'Barrera / Mampara Acústica Móvil',
    subtitle: 'Pantalla fonoabsorbente industrial con mirilla para aislar maquinaria',
    mount: 'floor',
    defaultDims: { w: 1.45, d: 0.36, h: 1.78 },
    colorRole: 'dark',
    sabines: { 125: 0.55, 250: 1.15, 500: 1.85, 1000: 2.10, 2000: 2.05, 4000: 1.90 },
    description: 'Atenúa la propagación directa del ruido industrial y absorbe energía.',
  },
  person_figure: {
    id: 'person_figure',
    category: 'furniture',
    subCategory: 'industrial',
    name: 'Persona / Estudiante / Operario (Escala 1:1)',
    subtitle: 'Ocupante de pie (aporta absorción equivalente humana en Sabines)',
    mount: 'floor',
    defaultDims: { w: 0.45, d: 0.35, h: 1.72 },
    colorRole: 'primary',
    sabines: { 125: 0.18, 250: 0.32, 500: 0.46, 1000: 0.52, 2000: 0.55, 4000: 0.52 },
    description: 'Permite evaluar el efecto acústico de la ocupación humana y dar escala.',
  },

  // --- ELEMENTOS ARQUITECTÓNICOS (PUERTAS, VENTANALES PANORÁMICOS, CORTINAS GRANDES) ---
  arch_door: {
    id: 'arch_door',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Puerta Acústica Estándar (Doble Cara)',
    subtitle: 'Puerta (0.92 × 2.05 m) visible por ambos lados de la pared con vano real',
    mount: 'wall',
    defaultDims: { w: 0.92, h: 2.05, t: 0.06 },
    colorRole: 'wood',
    coefficients: { 125: 0.14, 250: 0.10, 500: 0.06, 1000: 0.08, 2000: 0.10, 4000: 0.10 },
    description: 'Puerta estándar con marco, paneles y manijas en ambos lados del muro.',
  },
  double_door: {
    id: 'double_door',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Puerta Doble de Auditorio / Aula',
    subtitle: 'Doble hoja (1.65 × 2.10 m) con mirillas de vidrio en ambos lados',
    mount: 'wall',
    defaultDims: { w: 1.65, h: 2.10, t: 0.06 },
    colorRole: 'wood',
    coefficients: { 125: 0.14, 250: 0.10, 500: 0.06, 1000: 0.08, 2000: 0.10, 4000: 0.10 },
    description: 'Puerta doble acústica visible desde el interior y el exterior.',
  },
  arch_window: {
    id: 'arch_window',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Ventana Estándar de Vidrio',
    subtitle: 'Ventana (1.65 × 1.20 m) con marco de aluminio y abertura en pared',
    mount: 'wall',
    defaultDims: { w: 1.65, h: 1.20, t: 0.05 },
    colorRole: 'neutral',
    coefficients: { 125: 0.18, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
    description: 'Ventana acristalada con vano transparente hacia el exterior.',
  },
  panoramic_window: {
    id: 'panoramic_window',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Ventanal Panorámico Grande',
    subtitle: 'Ventanal ancho de 3-4 hojas (3.00 × 1.50 m, alargable)',
    mount: 'wall',
    defaultDims: { w: 3.00, h: 1.50, t: 0.06 },
    colorRole: 'neutral',
    coefficients: { 125: 0.16, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
    description: 'Gran ventanal panorámico horizontal que deja ver el paisaje o ciudad exterior.',
  },
  floor_to_ceiling_window: {
    id: 'floor_to_ceiling_window',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Ventanal Piso a Techo (Muro Cortina)',
    subtitle: 'Cristal arquitectónico de piso a techo (2.80 × 2.35 m, alargable)',
    mount: 'wall',
    defaultDims: { w: 2.80, h: 2.35, t: 0.06 },
    colorRole: 'neutral',
    coefficients: { 125: 0.15, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
    description: 'Ventanal de altura completa para salas modernas, oficinas o estudios.',
  },
  studio_visor_window: {
    id: 'studio_visor_window',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Visor Acústico de Estudio (Control Room)',
    subtitle: 'Doble cristal laminado inclinado con marco de madera (2.20 × 1.15 m)',
    mount: 'wall',
    defaultDims: { w: 2.20, h: 1.15, t: 0.08 },
    colorRole: 'wood',
    coefficients: { 125: 0.10, 250: 0.05, 500: 0.03, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Visor insonorizado entre sala de control y sala de grabación.',
  },
  draped_curtain: {
    id: 'draped_curtain',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Cortina Acústica Plisada Grande',
    subtitle: 'Cortinaje amplio (2.80 × 2.40 m, alargable) de alta absorción textil',
    mount: 'wall',
    defaultDims: { w: 2.80, h: 2.40, t: 0.08 },
    colorRole: 'primary',
    coefficients: { 125: 0.14, 250: 0.35, 500: 0.55, 1000: 0.72, 2000: 0.70, 4000: 0.65 },
    description: 'Cortina grande de piso a techo para cubrir ventanales o paredes reflectantes.',
  },
  stage_curtain: {
    id: 'stage_curtain',
    category: 'furniture',
    subCategory: 'architecture',
    name: 'Telón / Cortina Panorámica con Cenefa',
    subtitle: 'Gran telón acústico (3.80 × 2.55 m) para auditorios, cines o salones',
    mount: 'wall',
    defaultDims: { w: 3.80, h: 2.55, t: 0.10 },
    colorRole: 'accent',
    coefficients: { 125: 0.18, 250: 0.42, 500: 0.65, 1000: 0.78, 2000: 0.76, 4000: 0.72 },
    description: 'Cortinaje escénico pesado de gran formato.',
  },

  // --- SILLAS ESCOLARES CON BRAZO, EJECUTIVAS Y ESTANTERÍAS MEDIAS ALARGABLES ---
  school_arm_chair: {
    id: 'school_arm_chair',
    category: 'furniture',
    subCategory: 'education',
    name: 'Silla de Colegio / Universidad con Brazo',
    subtitle: 'Silla escolar con paleta de escritura en el brazo y parrilla inferior',
    mount: 'floor',
    defaultDims: { w: 0.62, d: 0.64, h: 0.82 },
    colorRole: 'primary',
    sabines: { 125: 0.10, 250: 0.15, 500: 0.20, 1000: 0.24, 2000: 0.26, 4000: 0.26 },
    description: 'Clásica silla universitaria con brazo-paleta de madera para tomar apuntes.',
  },
  ergonomic_chair: {
    id: 'ergonomic_chair',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Silla Ergonómica Ejecutiva / Gamer',
    subtitle: 'Respaldo alto de malla, apoyacabezas, soporte lumbar y ruedas',
    mount: 'floor',
    defaultDims: { w: 0.64, d: 0.64, h: 1.26 },
    colorRole: 'dark',
    sabines: { 125: 0.18, 250: 0.28, 500: 0.38, 1000: 0.45, 2000: 0.48, 4000: 0.48 },
    description: 'Silla de alto confort para estudio, oficina o dirección.',
  },
  visitor_chair: {
    id: 'visitor_chair',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Silla Interlocutora / Auditorio',
    subtitle: 'Silla acolchada con base trineo cromada y apoyabrazos',
    mount: 'floor',
    defaultDims: { w: 0.56, d: 0.56, h: 0.88 },
    colorRole: 'secondary',
    sabines: { 125: 0.12, 250: 0.20, 500: 0.28, 1000: 0.32, 2000: 0.34, 4000: 0.34 },
    description: 'Ideal para salas de espera, juntas, conferencias o visitas.',
  },
  bar_stool: {
    id: 'bar_stool',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Taburete Alto / Butaco de Estudio',
    subtitle: 'Asiento circular de madera con posapiés cromado (para músico o lab)',
    mount: 'floor',
    defaultDims: { w: 0.42, d: 0.42, h: 0.72 },
    colorRole: 'wood',
    sabines: { 125: 0.03, 250: 0.04, 500: 0.05, 1000: 0.05, 2000: 0.05, 4000: 0.05 },
    description: 'Taburete alto para guitarrista, locución o mesón de laboratorio.',
  },
  armchair_lounge: {
    id: 'armchair_lounge',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Poltrona / Sillón Individual Lounge',
    subtitle: 'Butaca amplia tapizada de descanso o recepción',
    mount: 'floor',
    defaultDims: { w: 0.86, d: 0.84, h: 0.78 },
    colorRole: 'accent',
    sabines: { 125: 0.32, 250: 0.48, 500: 0.68, 1000: 0.78, 2000: 0.82, 4000: 0.80 },
    description: 'Sillón individual de alta absorción por espuma.',
  },
  mid_shelf_credenza: {
    id: 'mid_shelf_credenza',
    category: 'furniture',
    subCategory: 'chairs_tables',
    name: 'Estantería Media Abierta (Alargable)',
    subtitle: '3 niveles de repisa para colocar laptops, TV, libros o cámaras encima',
    mount: 'floor',
    defaultDims: { w: 1.60, d: 0.42, h: 0.90 },
    colorRole: 'wood',
    isSurfaceProvider: true,
    sabines: { 125: 0.14, 250: 0.18, 500: 0.20, 1000: 0.20, 2000: 0.18, 4000: 0.18 },
    description: 'Estantería a media altura alargable en ancho y fondo; soporta objetos encima.',
  },

  // --- TV, TV EN BASE MÓVIL, LAPTOP, PC, CÁMARAS Y LUCES ---
  wall_tv: {
    id: 'wall_tv',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Smart TV 4K (Pared o Sobre Mueble)',
    subtitle: 'Televisor 65"-85" (se cuelga en pared o saca base si se pone en mesa/estante)',
    mount: 'floor',
    canPlaceOnSurface: true,
    defaultDims: { w: 1.46, d: 0.26, h: 0.84 },
    colorRole: 'dark',
    sabines: { 125: 0.02, 250: 0.02, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Televisor de pantalla plana que puedes poner sobre estanterías/mesas o en pared.',
  },
  rolling_tv_stand: {
    id: 'rolling_tv_stand',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'TV en Base Móvil con Ruedas',
    subtitle: 'Pantalla 65" en soporte rodante con bandeja y cámara de conferencia',
    mount: 'floor',
    defaultDims: { w: 1.48, d: 0.62, h: 1.72 },
    colorRole: 'dark',
    sabines: { 125: 0.04, 250: 0.04, 500: 0.04, 1000: 0.04, 2000: 0.04, 4000: 0.04 },
    description: 'Soporte móvil de TV muy usado en aulas universitarias, salas de juntas y estudios.',
  },
  laptop_prop: {
    id: 'laptop_prop',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Laptop / Portátil Abierta + Mouse',
    subtitle: 'Se posa automáticamente sobre mesas, escritorios o estanterías',
    mount: 'floor',
    canPlaceOnSurface: true,
    defaultDims: { w: 0.38, d: 0.26, h: 0.25 },
    colorRole: 'neutral',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.01, 4000: 0.01 },
    description: 'Computador portátil con pantalla iluminada para colocar sobre cualquier mueble.',
  },
  desktop_pc_setup: {
    id: 'desktop_pc_setup',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'PC de Escritorio + Monitor Ultrawide',
    subtitle: 'Monitor curvo, teclado, mouse y torre PC (para mesas o escritorios)',
    mount: 'floor',
    canPlaceOnSurface: true,
    defaultDims: { w: 1.05, d: 0.52, h: 0.48 },
    colorRole: 'dark',
    sabines: { 125: 0.02, 250: 0.02, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Estación completa de computador para poner encima de escritorios o bancos.',
  },
  books_decor_set: {
    id: 'books_decor_set',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Set de Libros y Planta para Estantería',
    subtitle: 'Libros apilados, cuadernos y maceta para poner en repisas o mesas',
    mount: 'floor',
    canPlaceOnSurface: true,
    defaultDims: { w: 0.54, d: 0.24, h: 0.28 },
    colorRole: 'primary',
    sabines: { 125: 0.02, 250: 0.03, 500: 0.04, 1000: 0.05, 2000: 0.05, 4000: 0.05 },
    description: 'Objetos reales para vestir estanterías medias, libreros o mesas.',
  },
  coffee_maker_station: {
    id: 'coffee_maker_station',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Cafetera Espresso y Tazas',
    subtitle: 'Estación de café para colocar sobre credenzas, estanterías o mesas',
    mount: 'floor',
    canPlaceOnSurface: true,
    defaultDims: { w: 0.46, d: 0.30, h: 0.34 },
    colorRole: 'dark',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.01, 4000: 0.01 },
    description: 'Detalle realista para salas de juntas, oficinas y estudios.',
  },
  ac_split_unit: {
    id: 'ac_split_unit',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Aire Acondicionado Mini-Split',
    subtitle: 'Unidad mural de climatización con display digital',
    mount: 'wall',
    defaultDims: { w: 0.96, h: 0.30, t: 0.22 },
    colorRole: 'neutral',
    coefficients: { 125: 0.04, 250: 0.04, 500: 0.04, 1000: 0.04, 2000: 0.04, 4000: 0.04 },
    description: 'Equipo de climatización de pared alta.',
  },
  cinema_camera_tripod: {
    id: 'cinema_camera_tripod',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Cámara de Cine / Video en Trípode',
    subtitle: 'Cámara profesional con lente telefoto, matte box y monitor LCD',
    mount: 'floor',
    defaultDims: { w: 0.55, d: 0.55, h: 1.55 },
    colorRole: 'dark',
    sabines: { 125: 0.02, 250: 0.02, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Cámara de producción audiovisual para sets, estudios o auditorios.',
  },
  ptz_conference_cam: {
    id: 'ptz_conference_cam',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Cámara de Streaming / Conferencia',
    subtitle: 'Cámara compacta en mini-trípode para poner en mesa o estantería',
    mount: 'floor',
    canPlaceOnSurface: true,
    defaultDims: { w: 0.24, d: 0.24, h: 0.38 },
    colorRole: 'dark',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.01, 4000: 0.01 },
    description: 'Cámara para clases híbridas, podcast o videoconferencia.',
  },
  studio_softbox_light: {
    id: 'studio_softbox_light',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Luz de Estudio Softbox LED',
    subtitle: 'Foco difusor de estudio en trípode (ilumina realmente la escena)',
    mount: 'floor',
    defaultDims: { w: 0.62, d: 0.52, h: 1.78 },
    colorRole: 'dark',
    sabines: { 125: 0.03, 250: 0.04, 500: 0.05, 1000: 0.05, 2000: 0.05, 4000: 0.05 },
    description: 'Iluminación continua profesional para estudios de grabación y video.',
  },
  ring_light_stand: {
    id: 'ring_light_stand',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Aro de Luz LED en Trípode',
    subtitle: 'Luminaria circular con soporte de cámara/móvil (emite luz real)',
    mount: 'floor',
    defaultDims: { w: 0.48, d: 0.45, h: 1.68 },
    colorRole: 'neutral',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.01, 4000: 0.01 },
    description: 'Aro de luz para streaming, locución o creación de contenido.',
  },
  ceiling_led_panel: {
    id: 'ceiling_led_panel',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Luminaria Panel LED Colgante (Techo)',
    subtitle: 'Lámpara lineal de techo con altura de descolgado ajustable',
    mount: 'ceiling',
    defaultDims: { w: 1.25, d: 0.30, h: 0.05, drop: 0.35 },
    colorRole: 'neutral',
    sabines: { 125: 0.02, 250: 0.02, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Iluminación arquitectónica suspendida para aulas, oficinas, talleres o estudios.',
  },
  track_spotlight_bar: {
    id: 'track_spotlight_bar',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Riel de Spots Dirigibles de Techo',
    subtitle: 'Barra de 4 proyectores LED con separación de techo ajustable',
    mount: 'ceiling',
    defaultDims: { w: 1.60, d: 0.18, h: 0.15, drop: 0.22 },
    colorRole: 'dark',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.01, 4000: 0.01 },
    description: 'Riel de iluminación escénica o de estudio.',
  },
  desk_lamp: {
    id: 'desk_lamp',
    category: 'furniture',
    subCategory: 'media_lights',
    name: 'Lámpara Articulada de Mesa / Estante',
    subtitle: 'Lámpara cálida de brazo móvil para escritorios o estanterías',
    mount: 'floor',
    canPlaceOnSurface: true,
    defaultDims: { w: 0.24, d: 0.24, h: 0.48 },
    colorRole: 'accent',
    sabines: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.01, 4000: 0.01 },
    description: 'Se posa automáticamente sobre mesas o repisas e ilumina con luz cálida.',
  },
};

export const FURNITURE_SUBCATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'chairs_tables', label: 'Sillas / Mesas / Estantes' },
  { id: 'media_lights', label: 'TV / Laptop / Cámaras / Luces' },
  { id: 'education', label: 'Universidad / Colegio' },
  { id: 'industrial', label: 'Industrial / Taller' },
  { id: 'studio', label: 'Estudio / Audio / Cine' },
  { id: 'architecture', label: 'Puertas / Ventanales / Cortinas' },
];

export const ROOM_PRESET_STYLES = {
  studio: {
    id: 'studio',
    label: 'Estudio de Grabación',
    dims: { W: 5.4, D: 4.4, H: 2.7 },
    palette: {
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
  },
  cinema: {
    id: 'cinema',
    label: 'Cine en Casa',
    dims: { W: 6.2, D: 4.5, H: 2.7 },
    palette: {
      name: 'Cine',
      primary: '#8b5cf6',
      secondary: '#6366f1',
      neutral: '#cbd5e1',
      accent: '#f59e0b',
      dark: '#1e1b2e',
      wood: 'walnut',
      wall: '#45434f',
      floor: 'carpet',
    },
  },
  meeting: {
    id: 'meeting',
    label: 'Sala de Juntas',
    dims: { W: 6.4, D: 4.4, H: 2.8 },
    palette: {
      name: 'Corporativo',
      primary: '#3d62b8',
      secondary: '#a9c1f0',
      neutral: '#e6e8ec',
      accent: '#e0a03a',
      dark: '#2b3548',
      wood: 'birch',
      wall: '#eef1f5',
      floor: 'carpet',
    },
  },
  classroom: {
    id: 'classroom',
    label: 'Aula Universidad / Colegio',
    dims: { W: 7.6, D: 6.2, H: 3.1 },
    palette: {
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
  },
  industrial: {
    id: 'industrial',
    label: 'Nave / Taller Industrial',
    dims: { W: 8.5, D: 6.6, H: 3.8 },
    palette: {
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
  },
};

export const ALL_CATALOG_ITEMS = {
  ...PANEL_CATALOG,
  ...DIFFUSER_CATALOG,
  ...FURNITURE_CATALOG,
};

export function getCatalogItem(typeId) {
  return ALL_CATALOG_ITEMS[typeId] || PANEL_CATALOG.panel_porous_50;
}

let idCounter = 1;
export function makeItemId(prefix = 'item') {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/**
 * Crea una instancia editable de un objeto 3D a partir del catálogo.
 */
export function createSceneItem(typeId, overrides = {}) {
  const def = getCatalogItem(typeId);
  const dims = { ...def.defaultDims, ...(overrides.dims || {}) };
  const coefficients = def.coefficients ? { ...def.coefficients, ...(overrides.coefficients || {}) } : null;
  const sabines = def.sabines ? { ...def.sabines, ...(overrides.sabines || {}) } : null;

  return {
    id: overrides.id || makeItemId(typeId),
    typeId: def.id,
    category: def.category,
    name: overrides.name || def.name,
    mount: overrides.mount || def.mount, // 'wall' | 'corner' | 'ceiling' | 'floor' | 'free'
    locked: Boolean(overrides.locked), // Bloquea el objeto para evitar movimientos o borrado accidental
    // Montaje en pared: wallIndex (0..N-1), along (-0.45..0.45 normalizado o metros), elevation (altura centro en m)
    wallIndex: overrides.wallIndex ?? 0,
    along: overrides.along ?? 0, // desplazamiento a lo largo de la pared en metros desde el centro de la pared
    elevation: overrides.elevation ?? (def.mount === 'wall' ? 1.35 : 0),
    // Montaje en esquina: cornerIndex (0..N-1)
    cornerIndex: overrides.cornerIndex ?? 0,
    // Posición libre / piso / techo en coordenadas del recinto centradas (x, z en m, y altura en m)
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    z: overrides.z ?? 0,
    rotation: overrides.rotation ?? 0, // grados (0..360)
    // Repetición en batería/fila (para paneles, difusores, sillas)
    count: overrides.count ?? 1,
    spacing: overrides.spacing ?? 0.12, // separación entre piezas repetidas (m)
    // Dimensiones y parámetros específicos
    dims,
    // Apariencia: 'primary' | 'secondary' | 'neutral' | 'accent' | 'dark' | 'wood' | 'custom'
    colorRole: overrides.colorRole || def.colorRole || 'primary',
    customColor: overrides.customColor || '#7464cc',
    wood: overrides.wood || null, // null = usa la madera del tema
    frame: overrides.frame !== undefined ? overrides.frame : Boolean(def.frame),
    // Propiedades acústicas editables
    coefficients,
    sabines,
  };
}

export const SUPPORT_SURFACE_SPECS = {
  mid_shelf_credenza: true,
  bookshelf: true,
  industrial_shelving: true,
  meeting_table: true,
  desk: true,
  teacher_desk: true,
  lab_bench: true,
  workbench: true,
  sideboard: true,
  coffee_table: true,
  student_desk: true,
};

const SURFACE_PROVIDER_TYPES = new Set(Object.keys(SUPPORT_SURFACE_SPECS));

/**
 * Devuelve las alturas de repisa o cubierta `[ { label, y } ]` que ofrece un mueble para colocar objetos encima.
 */
export function getSupportSurfaceLevels(item) {
  if (!item || !SURFACE_PROVIDER_TYPES.has(item.typeId)) return [];
  const h = Number(item.dims?.h) || 0.75;
  switch (item.typeId) {
    case 'mid_shelf_credenza':
      return [
        { label: 'Repisa Baja', y: 0.14 },
        { label: 'Repisa Media', y: Math.round((h * 0.52 + 0.015) * 100) / 100 },
        { label: 'Tope Superior', y: Math.round(h * 100) / 100 },
      ];
    case 'bookshelf':
      return [
        { label: 'Repisa Media', y: Math.round(h * 0.5 * 100) / 100 },
        { label: 'Tope Superior', y: Math.round(h * 100) / 100 },
      ];
    case 'industrial_shelving':
      return [
        { label: 'Nivel 1', y: 0.25 },
        { label: 'Nivel 2', y: Math.round((h * 0.48 + 0.025) * 100) / 100 },
        { label: 'Nivel 3', y: Math.round((h * 0.86 + 0.025) * 100) / 100 },
      ];
    default:
      return [{ label: 'Sobre Mesa', y: Math.round(h * 100) / 100 }];
  }
}

/**
 * Detecta si la posición `(x, z)` cae encima de alguna mesa, escritorio o estantería de la escena,
 * devolviendo el mueble soporte y sus niveles de altura disponibles para apilar el objeto.
 */
export function findSupportingSurface(targetItem, x, z, allItems = []) {
  if (!targetItem || SURFACE_PROVIDER_TYPES.has(targetItem.typeId)) return null;
  for (const other of allItems) {
    if (!other || other.id === targetItem.id || other.enabled === false) continue;
    if (!SURFACE_PROVIDER_TYPES.has(other.typeId)) continue;

    const ox = Number(other.x) || 0;
    const oz = Number(other.z) || 0;
    const ow = (Number(other.dims?.w) || 1.2) + 0.16;
    const od = (Number(other.dims?.d) || 0.6) + 0.16;
    const rotRad = ((Number(other.rotation) || 0) * Math.PI) / 180;
    const dx = x - ox;
    const dz = z - oz;
    const localX = dx * Math.cos(rotRad) - dz * Math.sin(rotRad);
    const localZ = dx * Math.sin(rotRad) + dz * Math.cos(rotRad);

    if (Math.abs(localX) <= ow / 2 && Math.abs(localZ) <= od / 2) {
      const levels = getSupportSurfaceLevels(other);
      if (levels.length > 0) {
        return {
          item: other,
          supportItem: other,
          levels,
          defaultY: levels[levels.length - 1].y,
        };
      }
    }
  }
  return null;
}

/**
 * Calcula el área efectiva y los Sabines A(f) [m²] aportados por un único ítem (considerando su repetición `count`).
 */
export function calculateItemAbsorption(item) {
  const def = getCatalogItem(item.typeId);
  const count = Math.max(1, Number(item.count) || 1);
  const dims = { ...def.defaultDims, ...(item.dims || {}) };
  const result = {};

  // Si el ítem define Sabines directos por unidad (ej. muebles, sofás, sillas, butacas, pupitres)
  if (item.sabines || def.sabines) {
    const baseSab = item.sabines || def.sabines;
    const seatScale =
      item.typeId === 'cinema_row'
        ? Math.max(1, Number(dims.seats) || 3) / 3
        : item.typeId === 'classroom_desk_grid'
          ? Math.max(1, Number(dims.cols) || 3) * Math.max(1, Number(dims.rows) || 2)
          : 1;
    OCTAVE_BANDS.forEach((f) => {
      result[f] = (Number(baseSab[f]) || 0.05) * count * seatScale;
    });
    return { area: 0, byBand: result };
  }

  // Si el ítem usa coeficientes α(f) por área efectiva
  const coeffs = item.coefficients || def.coefficients || { 125: 0.1, 250: 0.2, 500: 0.3, 1000: 0.3, 2000: 0.3, 4000: 0.3 };
  let unitArea = 0.72;

  if (item.typeId === 'trap_corner') {
    // Superficie frontal hipotenusa + laterales expuestos aprox.
    const side = Number(dims.w) || 0.45;
    const h = Number(dims.h) || 2.2;
    unitArea = side * Math.SQRT2 * h * 1.15;
  } else if (item.typeId === 'trap_tube') {
    const d = Number(dims.w) || 0.40;
    const h = Number(dims.h) || 1.8;
    unitArea = Math.PI * d * h;
  } else if (item.typeId === 'cloud_ceiling') {
    const w = Number(dims.w) || 1.2;
    const d = Number(dims.d) || 0.9;
    // Factor 1.25 por absorción en cara inferior + bordes y revés hacia el plenum
    unitArea = w * d * 1.25;
  } else if (item.typeId === 'baffles_ceiling') {
    const w = Number(dims.w) || 1.6;
    const h = Number(dims.h) || 0.32;
    const nBaffles = Math.max(1, Number(dims.baffleCount) || 5);
    // Ambas caras de cada bafle
    unitArea = w * h * 2 * nBaffles * 0.85;
  } else if (item.typeId === 'round_rug') {
    const r = Number(dims.r) || (Number(dims.w) || 1.8) / 2;
    unitArea = Math.PI * r * r;
  } else if (item.typeId === 'rug') {
    unitArea = (Number(dims.w) || 2.4) * (Number(dims.d) || 1.7);
  } else {
    // Paneles de pared y difusores: área frontal + bordes laterales expuestos
    const w = Number(dims.w) || 0.6;
    const h = Number(dims.h) || 1.2;
    const t = Number(dims.t) || 0.05;
    unitArea = w * h + 2 * (w + h) * t * 0.6;
  }

  const totalArea = unitArea * count;
  OCTAVE_BANDS.forEach((f) => {
    const alpha = Math.min(0.99, Math.max(0.01, Number(coeffs[f]) || 0.1));
    result[f] = totalArea * alpha;
  });

  return { area: totalArea, byBand: result };
}

/**
 * Calcula la absorción total combinada de todos los objetos 3D colocados en la escena.
 * Devuelve:
 *   - `totalByBand`: { 125, 250, 500, 1000, 2000, 4000 } en m² Sabines (listo para `calculateRoomAbsorption`)
 *   - `byCategory`: desglose por 'panels', 'diffusers', 'furniture'
 *   - `totalArea`: área total de tratamiento (m²)
 */
export function calculateSceneObjectsAbsorption(items = []) {
  const totalByBand = { 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0 };
  const byCategory = {
    panels: { 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0 },
    diffusers: { 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0 },
    furniture: { 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0 },
  };
  let totalArea = 0;

  if (!Array.isArray(items)) {
    return { totalByBand, byCategory, totalArea: 0 };
  }

  items.forEach((item) => {
    if (!item || item.enabled === false) return;
    const { area, byBand } = calculateItemAbsorption(item);
    const cat = byCategory[item.category] ? item.category : 'panels';
    totalArea += area;
    OCTAVE_BANDS.forEach((f) => {
      const val = byBand[f] || 0;
      totalByBand[f] += val;
      byCategory[cat][f] += val;
    });
  });

  return { totalByBand, byCategory, totalArea };
}

/**
 * Genera un conjunto inicial de muebles, paneles y difusores adaptado a las dimensiones
 * de la sala activa (`W`, `D`, `H` y número de paredes).
 */
export function generateStarterSceneItems(preset = 'studio', { W = 5.4, D = 4.4, H = 2.7, wallCount = 4 } = {}) {
  const safeW = Math.max(2.6, Number(W) || 5.4);
  const safeD = Math.max(2.6, Number(D) || 4.4);
  const safeH = Math.max(2.2, Number(H) || 2.7);
  const backZ = -safeD / 2;
  const frontZ = safeD / 2;
  const leftX = -safeW / 2;
  const rightX = safeW / 2;

  // Índices de pared estándar (en un polígono de 4 lados: 0=Fondo/Norte, 1=Derecha/Este, 2=Frente/Sur, 3=Izquierda/Oeste)
  const wBack = 0;
  const wRight = wallCount > 1 ? 1 : 0;
  const wFront = wallCount > 2 ? 2 : 0;
  const wLeft = wallCount > 3 ? 3 : 0;

  if (preset === 'empty') {
    return [];
  }

  if (preset === 'cinema') {
    return [
      createSceneItem('wall_screen', {
        name: 'Pantalla de Proyección',
        wallIndex: wLeft,
        along: 0,
        elevation: Math.min(1.45, safeH * 0.54),
        dims: { w: Math.min(2.8, safeD - 1.0), h: Math.min(1.5, (safeD - 1.0) * 0.52), t: 0.05, screenKind: 'movie' },
      }),
      createSceneItem('sideboard', {
        name: 'Mueble AV Frontal',
        x: leftX + 0.38,
        z: 0,
        rotation: 90,
        dims: { w: Math.min(2.0, safeD - 1.6), d: 0.40, h: 0.42 },
      }),
      createSceneItem('tower_speaker', {
        name: 'Torre Frontal Izq.',
        x: leftX + 0.42,
        z: -Math.min(1.45, safeD * 0.36),
        rotation: 80,
      }),
      createSceneItem('tower_speaker', {
        name: 'Torre Frontal Der.',
        x: leftX + 0.42,
        z: Math.min(1.45, safeD * 0.36),
        rotation: 100,
      }),
      createSceneItem('subwoofer', {
        name: 'Subwoofer LFE',
        x: leftX + 0.42,
        z: -Math.min(0.95, safeD * 0.24),
        rotation: 90,
      }),
      createSceneItem('cinema_row', {
        name: 'Fila Principal de Butacas',
        x: 0.2,
        z: 0,
        rotation: 90,
        dims: { w: Math.min(2.4, safeD - 0.9), d: 0.9, h: 1.0, seats: safeD >= 5 ? 4 : 3, riser: false },
      }),
      ...(safeW >= 5.5
        ? [
            createSceneItem('cinema_row', {
              name: 'Segunda Fila en Tarima',
              x: Math.min(rightX - 1.05, 1.85),
              z: 0,
              rotation: 90,
              dims: { w: Math.min(2.4, safeD - 0.9), d: 0.9, h: 1.0, seats: safeD >= 5 ? 4 : 3, riser: true },
            }),
          ]
        : []),
      createSceneItem('panel_broadband_100', {
        name: 'Paneles Laterales Broadband',
        wallIndex: wBack,
        along: -0.35,
        elevation: 1.35,
        count: 3,
        spacing: 0.28,
        colorRole: 'primary',
        dims: { w: 0.65, h: Math.min(1.6, safeH - 0.7), t: 0.10 },
      }),
      createSceneItem('diffuser_qrd1d', {
        name: 'Difusores QRD Posteriores',
        wallIndex: wBack,
        along: 1.25,
        elevation: 1.35,
        count: 1,
        dims: { w: 0.90, h: Math.min(1.5, safeH - 0.8), t: 0.17, p: 7, periods: 2, well: 0.06 },
      }),
      createSceneItem('trap_corner', {
        name: 'Trampa Esquinera Fondo-Izq',
        cornerIndex: 0,
        dims: { w: 0.42, h: safeH - 0.2, t: 0.42 },
      }),
    ];
  }

  if (preset === 'meeting') {
    const tableLen = Math.min(3.4, Math.max(1.8, safeW - 2.2));
    return [
      createSceneItem('meeting_table', {
        name: 'Mesa de Juntas Central',
        x: 0.15,
        z: 0,
        rotation: 0,
        dims: { w: tableLen, d: 1.1, h: 0.74 },
      }),
      createSceneItem('shell_chair', {
        name: 'Fila Sillas Norte',
        x: 0.15,
        z: -0.82,
        rotation: 0,
        count: Math.max(2, Math.round(tableLen / 0.85)),
        spacing: 0.25,
        colorRole: 'primary',
      }),
      createSceneItem('shell_chair', {
        name: 'Fila Sillas Sur',
        x: 0.15,
        z: 0.82,
        rotation: 180,
        count: Math.max(2, Math.round(tableLen / 0.85)),
        spacing: 0.25,
        colorRole: 'secondary',
      }),
      createSceneItem('wall_screen', {
        name: 'Pantalla de Presentación',
        wallIndex: wLeft,
        along: 0,
        elevation: 1.45,
        dims: { w: Math.min(1.8, safeD - 1.4), h: 1.0, t: 0.04, screenKind: 'chart' },
      }),
      createSceneItem('sideboard', {
        name: 'Credenza Lateral',
        x: rightX - 1.1,
        z: backZ + 0.30,
        rotation: 0,
      }),
      createSceneItem('plant', {
        name: 'Planta Esquina',
        x: leftX + 0.48,
        z: backZ + 0.48,
      }),
      createSceneItem('panel_slats', {
        name: 'Listones Acústicos Fieltro',
        wallIndex: wLeft,
        along: -Math.min(1.2, safeD * 0.32),
        elevation: 1.25,
        dims: { w: 0.8, h: Math.min(2.1, safeH - 0.4), t: 0.035 },
      }),
      createSceneItem('hex_felt', {
        name: 'Mosaico Hexagonal Fieltro PET',
        wallIndex: wBack,
        along: 0.5,
        elevation: 1.45,
        dims: { w: 1.4, h: 1.0, t: 0.025, cols: 6, rows: 4 },
      }),
      createSceneItem('panel_perforated_helmholtz', {
        name: 'Panel Madera Perforada',
        wallIndex: wBack,
        along: -1.1,
        elevation: 1.45,
        dims: { w: 1.1, h: 0.95, t: 0.06 },
      }),
      createSceneItem('baffles_ceiling', {
        name: 'Bafles Colgantes sobre Mesa',
        x: 0.15,
        z: 0,
        dims: { w: tableLen, d: 1.2, h: 0.30, t: 0.04, drop: 0.32, baffleCount: 6 },
      }),
    ];
  }

  if (preset === 'classroom') {
    const cols = safeD >= 5.2 ? 3 : 2;
    const rows = safeW >= 6.4 ? 3 : 2;
    return [
      createSceneItem('whiteboard', {
        name: 'Pizarra Acrílica Docente',
        wallIndex: wLeft,
        along: 0,
        elevation: 1.45,
        dims: { w: Math.min(2.6, safeD - 1.2), h: 1.20, t: 0.03 },
      }),
      createSceneItem('ceiling_projector', {
        name: 'Videoproyector de Aula',
        x: leftX + 2.2,
        z: 0,
        rotation: -90,
        dims: { w: 0.38, d: 0.32, h: 0.16, drop: 0.36 },
      }),
      createSceneItem('teacher_desk', {
        name: 'Escritorio de Profesor',
        x: leftX + 1.25,
        z: -Math.min(1.15, safeD * 0.25),
        rotation: 90,
      }),
      createSceneItem('task_chair', {
        name: 'Silla de Profesor',
        x: leftX + 0.65,
        z: -Math.min(1.15, safeD * 0.25),
        rotation: 90,
      }),
      createSceneItem('podium', {
        name: 'Atril / Podio de Clase',
        x: leftX + 1.10,
        z: Math.min(1.15, safeD * 0.26),
        rotation: 75,
      }),
      createSceneItem('classroom_desk_grid', {
        name: 'Matriz de Pupitres Universitarios',
        x: 0.65,
        z: 0,
        rotation: 90,
        colorRole: 'primary',
        dims: { w: cols * 0.92, d: rows * 1.12, h: 0.75, cols, rows },
      }),
      createSceneItem('locker_bank', {
        name: 'Casilleros Escolares (Lockers)',
        x: rightX - 0.85,
        z: backZ + 0.32,
        rotation: 0,
        dims: { w: 1.35, d: 0.46, h: 1.85, cols: 3 },
      }),
      createSceneItem('arch_window', {
        name: 'Ventana Acústica del Aula',
        wallIndex: wBack,
        along: -0.6,
        elevation: 1.48,
        dims: { w: 1.75, h: 1.20, t: 0.05 },
      }),
      createSceneItem('panel_perforated_helmholtz', {
        name: 'Paneles Helmholtz (Voz Docente)',
        wallIndex: wBack,
        along: 1.15,
        elevation: 1.42,
        count: 2,
        spacing: 0.16,
        dims: { w: 0.90, h: 1.20, t: 0.06 },
      }),
      createSceneItem('baffles_ceiling', {
        name: 'Bafles Fonoabsorbentes de Aula',
        x: 0.55,
        z: 0,
        dims: { w: Math.min(3.2, safeW - 2.2), d: Math.min(2.4, safeD - 1.6), h: 0.32, t: 0.04, drop: 0.30, baffleCount: 6 },
      }),
    ];
  }

  if (preset === 'industrial') {
    return [
      createSceneItem('industrial_machine', {
        name: 'Compresor / Generador Industrial',
        x: leftX + 1.45,
        z: -0.35,
        rotation: 90,
        colorRole: 'accent',
      }),
      createSceneItem('acoustic_barrier', {
        name: 'Mampara Acústica Móvil Frontal',
        x: leftX + 2.45,
        z: -0.35,
        rotation: 90,
        colorRole: 'dark',
      }),
      createSceneItem('acoustic_barrier', {
        name: 'Mampara Acústica Lateral',
        x: leftX + 1.45,
        z: 0.85,
        rotation: 0,
        colorRole: 'dark',
      }),
      createSceneItem('industrial_shelving', {
        name: 'Estantería Pesada de Almacén',
        x: rightX - 1.15,
        z: backZ + 0.42,
        rotation: 0,
      }),
      createSceneItem('workbench', {
        name: 'Banco de Trabajo Mecánico',
        x: 0.55,
        z: backZ + 0.52,
        rotation: 0,
      }),
      createSceneItem('person_figure', {
        name: 'Operario / Inspector Acústico',
        x: 0.55,
        z: backZ + 1.25,
        rotation: 180,
      }),
      createSceneItem('hvac_duct', {
        name: 'Ducto de Ventilación HVAC',
        x: 0,
        z: -safeD * 0.22,
        dims: { w: Math.min(3.8, safeW - 1.6), d: 0.48, h: 0.36, drop: 0.38 },
      }),
      createSceneItem('baffles_ceiling', {
        name: 'Bafles Industriales de Techo',
        x: 0.2,
        z: safeD * 0.16,
        colorRole: 'primary',
        dims: { w: Math.min(3.4, safeW - 2.0), d: 1.6, h: 0.36, t: 0.05, drop: 0.35, baffleCount: 7 },
      }),
      createSceneItem('panel_broadband_100', {
        name: 'Absorbentes Industriales Pared Norte',
        wallIndex: wBack,
        along: -1.2,
        elevation: 1.5,
        count: 3,
        spacing: 0.22,
        dims: { w: 0.70, h: 1.40, t: 0.10 },
      }),
      createSceneItem('trap_corner', {
        name: 'Trampa de Graves Industrial',
        cornerIndex: 0,
        dims: { w: 0.48, h: safeH - 0.25, t: 0.48 },
      }),
    ];
  }

  // Por defecto: 'studio' (Estudio de Grabación / Mezcla)
  const cx = safeW >= 4.8 ? 0.2 : 0;
  return [
    createSceneItem('desk', {
      name: 'Mesa de Producción / Consola',
      x: cx,
      z: backZ + 1.05,
      rotation: 0,
      dims: { w: Math.min(1.85, safeW - 1.6), d: 0.82, h: 0.75 },
    }),
    createSceneItem('studio_monitors', {
      name: 'Monitores de Campo Cercano',
      x: cx,
      z: backZ + 0.65,
      rotation: 0,
      dims: { w: 2.1, d: 0.4, h: 1.18, spread: Math.min(2.1, safeW - 1.2) },
    }),
    createSceneItem('task_chair', {
      name: 'Silla de Ingeniero',
      x: cx + 0.04,
      z: backZ + 1.82,
      rotation: 18,
    }),
    createSceneItem('rug', {
      name: 'Alfombra Zona de Mezcla',
      x: cx,
      z: backZ + 1.50,
      dims: { w: Math.min(2.8, safeW - 1.2), d: Math.min(2.1, safeD - 1.6), h: 0.015 },
    }),
    ...(safeD >= 3.8
      ? [
          createSceneItem('sofa', {
            name: 'Sofá de Escucha / Clientes',
            x: leftX + 0.56,
            z: frontZ - 1.15,
            rotation: -90,
            dims: { w: Math.min(1.8, safeD - 2.1), d: 0.86, h: 0.82 },
          }),
          createSceneItem('bookshelf', {
            name: 'Librero Difusor / Estantería',
            x: rightX - 0.68,
            z: frontZ - 0.45,
            rotation: 180,
            dims: { w: 1.1, d: 0.35, h: Math.min(1.9, safeH - 0.5) },
          }),
        ]
      : []),
    createSceneItem('rack', {
      name: 'Rack 19" Outboard',
      x: rightX - 0.52,
      z: backZ + 0.62,
      rotation: -35,
    }),
    createSceneItem('plant', {
      name: 'Planta Acústica',
      x: leftX + 0.45,
      z: frontZ - 0.32,
    }),
    // Tratamiento acústico
    createSceneItem('panel_slats', {
      name: 'Frente de Listones sobre Fieltro',
      wallIndex: wBack,
      along: cx,
      elevation: Math.min(1.25, safeH * 0.46),
      dims: { w: Math.min(2.4, safeW - 2.0), h: Math.min(2.1, safeH - 0.4), t: 0.035 },
    }),
    createSceneItem('trap_corner', {
      name: 'Trampa de Graves Esquina Izq.',
      cornerIndex: 0,
      dims: { w: 0.44, h: safeH - 0.2, t: 0.44 },
    }),
    createSceneItem('panel_broadband_100', {
      name: 'Paneles 1ª Reflexión Lateral',
      wallIndex: wLeft,
      along: -Math.min(0.65, safeD * 0.16),
      elevation: 1.32,
      count: 2,
      spacing: 0.14,
      colorRole: 'primary',
      dims: { w: 0.60, h: 1.20, t: 0.10 },
    }),
    createSceneItem('diffuser_qrd1d', {
      name: 'Difusor QRD 1D Lateral',
      wallIndex: wLeft,
      along: Math.min(0.85, safeD * 0.22),
      elevation: 1.38,
      dims: { w: 0.90, h: 1.15, t: 0.17, p: 7, periods: 2, well: 0.06 },
    }),
    createSceneItem('diffuser_skyline', {
      name: 'Difusor Skyline 2D',
      wallIndex: wLeft,
      along: Math.min(1.65, safeD * 0.38),
      elevation: 1.38,
      dims: { w: 0.60, h: 0.60, t: 0.18, p: 7, cell: 0.085, tiles: 1 },
    }),
    createSceneItem('cloud_ceiling', {
      name: 'Nubes Suspendidas sobre Mezcla',
      x: cx,
      z: backZ + 1.35,
      count: 2,
      spacing: 0.08,
      dims: { w: Math.min(1.15, (safeW - 1.4) / 2), d: 0.85, t: 0.06, drop: 0.34 },
    }),
  ];
}

