/**
 * Ampliación del catálogo del Estudio de renders: hogar, cocina, cómputo, dormitorio, oficina,
 * herramientas, decoración, equipos de sonido e instrumentos.
 *
 * Los Sabines por unidad son valores de orden de magnitud para objetos de ese tamaño y material
 * (tapizados absorben mucho; electrodomésticos y metal casi nada). Sirven para que el cálculo de
 * reverberación reaccione de forma razonable al amoblar, no como dato de laboratorio.
 */

const S = (a, b, c, d, e, f) => ({ 125: a, 250: b, 500: c, 1000: d, 2000: e, 4000: f });
const HARD = S(0.02, 0.02, 0.03, 0.03, 0.04, 0.04);
const SMALL = S(0.01, 0.01, 0.01, 0.02, 0.02, 0.02);
const WOODY = S(0.12, 0.1, 0.08, 0.08, 0.08, 0.08);
const SOFT = S(0.2, 0.4, 0.6, 0.7, 0.75, 0.75);

const item = (id, group, name, subtitle, mount, defaultDims, extra = {}) => ({
  id,
  category: 'furniture',
  subCategory: group,
  group,
  name,
  subtitle,
  mount,
  defaultDims,
  colorRole: extra.colorRole ?? 'primary',
  sabines: extra.sabines ?? HARD,
  description: extra.description ?? subtitle,
  ...(extra.finishes ? { finishes: extra.finishes } : {}),
});

const ALL_FINISHES = ['negro', 'nogal', 'plata', 'blanco'];
const PIANO_FINISHES = ['negro', 'nogal', 'blanco'];

const LIST = [
  // Cocina y hogar
  item('fridge', 'kitchen', 'Nevera de dos puertas', 'Congelador arriba, acero inoxidable', 'floor', { w: 0.7, d: 0.7, h: 1.8 }, { colorRole: 'neutral' }),
  item('washing_machine', 'kitchen', 'Lavadora de carga frontal', 'Con perilla y pantalla', 'floor', { w: 0.6, d: 0.6, h: 0.85 }, { colorRole: 'neutral' }),
  item('microwave', 'kitchen', 'Horno microondas', 'Para poner sobre el mesón', 'floor', { w: 0.5, d: 0.38, h: 0.3 }, { sabines: SMALL }),
  item('stove_oven', 'kitchen', 'Estufa con horno', 'Cuatro puestos y horno', 'floor', { w: 0.76, d: 0.62, h: 0.9 }),
  item('kitchen_counter', 'kitchen', 'Mueble de cocina con lavaplatos', 'Mesón, puertas y grifo', 'floor', { w: 2.4, d: 0.62, h: 0.9 }, { colorRole: 'wood', sabines: WOODY }),
  item('blender', 'kitchen', 'Licuadora', 'Pequeño electrodoméstico', 'floor', { w: 0.2, d: 0.2, h: 0.42 }, { sabines: SMALL }),
  item('kettle_toaster', 'kitchen', 'Hervidor y tostadora', 'Juego para el mesón', 'floor', { w: 0.56, d: 0.2, h: 0.25 }, { sabines: SMALL }),
  item('standing_fan', 'kitchen', 'Ventilador de pie', 'Rejilla y aspas', 'floor', { w: 0.45, d: 0.45, h: 1.25 }, { sabines: SMALL }),
  item('water_dispenser', 'kitchen', 'Dispensador de agua', 'Botellón y llaves fría y caliente', 'floor', { w: 0.32, d: 0.34, h: 1.1 }, { sabines: SMALL }),
  item('robot_vacuum', 'kitchen', 'Aspiradora robot', 'Disco bajo con luz', 'floor', { w: 0.36, d: 0.36, h: 0.1 }, { sabines: SMALL }),

  // Cómputo y video
  item('pc_tower', 'tech', 'Torre de computador', 'Panel de vidrio y ventiladores con luz', 'floor', { w: 0.22, d: 0.46, h: 0.48 }, { sabines: SMALL }),
  item('monitor_single', 'tech', 'Monitor de escritorio', 'Pantalla con base', 'floor', { w: 0.62, d: 0.2, h: 0.5 }, { sabines: SMALL }),
  item('monitor_dual', 'tech', 'Doble monitor', 'Dos pantallas en ángulo', 'floor', { w: 1.2, d: 0.25, h: 0.5 }, { sabines: SMALL }),
  item('all_in_one', 'tech', 'Computador todo en uno', 'Con teclado y mouse', 'floor', { w: 0.62, d: 0.4, h: 0.55 }, { sabines: SMALL }),
  item('keyboard_mouse', 'tech', 'Teclado y mouse', 'Sobre tapete de escritorio', 'floor', { w: 0.74, d: 0.3, h: 0.04 }, { sabines: SMALL }),
  item('printer', 'tech', 'Impresora multifunción', 'Con bandeja y hoja', 'floor', { w: 0.45, d: 0.38, h: 0.25 }, { sabines: SMALL }),
  item('router_wifi', 'tech', 'Router wifi', 'Tres antenas y luces', 'floor', { w: 0.26, d: 0.16, h: 0.2 }, { sabines: SMALL }),
  item('server_rack', 'tech', 'Rack de servidores', 'Gabinete con equipos y luces', 'floor', { w: 0.6, d: 1.0, h: 2.0 }),
  item('game_console', 'tech', 'Consola de videojuegos', 'Vertical, con control', 'floor', { w: 0.42, d: 0.3, h: 0.32 }, { sabines: SMALL }),

  // Dormitorio
  item('bed_single', 'bedroom', 'Cama sencilla', 'Con cabecero, cobija y almohada', 'floor', { w: 1.0, d: 2.0, h: 0.62 }, { sabines: S(0.25, 0.5, 0.8, 0.95, 1.0, 1.0) }),
  item('bed_double', 'bedroom', 'Cama doble', 'Con cabecero, cobija y dos almohadas', 'floor', { w: 1.6, d: 2.05, h: 0.62 }, { sabines: S(0.4, 0.8, 1.2, 1.45, 1.55, 1.55) }),
  item('bunk_bed', 'bedroom', 'Camarote', 'Dos camas y escalera', 'floor', { w: 1.0, d: 2.0, h: 1.75 }, { sabines: S(0.45, 0.9, 1.4, 1.7, 1.8, 1.8) }),
  item('nightstand', 'bedroom', 'Mesa de noche', 'Dos cajones', 'floor', { w: 0.48, d: 0.4, h: 0.55 }, { colorRole: 'wood', sabines: WOODY }),
  item('wardrobe', 'bedroom', 'Clóset de puertas', 'Ancho ajustable', 'floor', { w: 1.6, d: 0.6, h: 2.1 }, { colorRole: 'wood', sabines: S(0.15, 0.12, 0.1, 0.1, 0.1, 0.1) }),
  item('dresser', 'bedroom', 'Cómoda con espejo', 'Seis cajones', 'floor', { w: 1.1, d: 0.48, h: 0.8, mirror: true }, { colorRole: 'wood', sabines: WOODY }),
  item('clothes_rack', 'bedroom', 'Perchero con ropa', 'La ropa colgada absorbe bastante', 'floor', { w: 1.2, d: 0.5, h: 1.6 }, { sabines: S(0.2, 0.45, 0.75, 0.9, 0.95, 0.95) }),

  // Sala, comedor y oficina
  item('dining_table', 'living', 'Comedor con sillas', 'Largo ajustable, sillas automáticas', 'floor', { w: 1.6, d: 0.9, h: 0.75, withChairs: true }, { colorRole: 'primary', sabines: S(0.2, 0.28, 0.35, 0.4, 0.42, 0.42) }),
  item('dining_chair', 'living', 'Silla de comedor', 'Madera con cojín', 'floor', { w: 0.45, d: 0.45, h: 0.9 }, { sabines: S(0.03, 0.05, 0.08, 0.1, 0.1, 0.1) }),
  item('sectional_sofa', 'living', 'Sofá en L', 'Con chaise y cojines', 'floor', { w: 2.8, d: 1.7, h: 0.82 }, { colorRole: 'neutral', sabines: S(1.0, 1.5, 2.1, 2.4, 2.5, 2.5) }),
  item('bean_bag', 'living', 'Puff tipo pera', 'Tela suave', 'floor', { w: 0.8, d: 0.8, h: 0.7 }, { colorRole: 'accent', sabines: S(0.15, 0.3, 0.45, 0.55, 0.6, 0.6) }),
  item('tv_console', 'living', 'Mueble de TV', 'Repisas y puertas', 'floor', { w: 1.8, d: 0.42, h: 0.5 }, { colorRole: 'wood', sabines: WOODY }),
  item('cube_shelf', 'living', 'Biblioteca de cubos', 'Cajas de tela y libros: absorbe y difunde', 'floor', { w: 1.2, d: 0.36, h: 1.2 }, { colorRole: 'wood', sabines: S(0.25, 0.35, 0.45, 0.5, 0.5, 0.5) }),
  item('l_desk', 'office', 'Escritorio en L', 'Con cajonera', 'floor', { w: 1.6, d: 1.4, h: 0.75 }, { colorRole: 'wood', sabines: WOODY }),
  item('standing_desk', 'office', 'Escritorio elevable', 'Para trabajar de pie o sentado', 'floor', { w: 1.4, d: 0.7, h: 1.05 }, { colorRole: 'wood', sabines: WOODY }),
  item('filing_cabinet', 'office', 'Archivador metálico', 'Cuatro gavetas', 'floor', { w: 0.47, d: 0.62, h: 1.32 }),
  item('reception_counter', 'office', 'Mostrador de recepción', 'Frente de color con luz', 'floor', { w: 1.8, d: 0.8, h: 1.1 }, { sabines: WOODY }),
  item('bench', 'living', 'Banca de madera', 'Tablillas sobre estructura metálica', 'floor', { w: 1.4, d: 0.4, h: 0.45 }, { colorRole: 'wood', sabines: WOODY }),
  item('coat_rack', 'living', 'Perchero de pie', 'Con un abrigo colgado', 'floor', { w: 0.5, d: 0.5, h: 1.8 }, { colorRole: 'wood', sabines: S(0.05, 0.1, 0.18, 0.22, 0.24, 0.24) }),
  item('folding_screen', 'living', 'Biombo tapizado', 'Separa espacios y absorbe un poco', 'floor', { w: 1.6, d: 0.3, h: 1.7 }, { colorRole: 'secondary', sabines: S(0.2, 0.4, 0.65, 0.8, 0.85, 0.85) }),
  item('standing_mirror', 'decor', 'Espejo de pie', 'Marco de madera', 'floor', { w: 0.6, d: 0.4, h: 1.6 }, { sabines: SMALL }),

  // Decoración
  item('wall_shelf', 'decor', 'Repisa de pared', 'Con libros y una planta', 'wall', { w: 0.9, h: 0.3, t: 0.22 }, { colorRole: 'wood', sabines: S(0.03, 0.04, 0.05, 0.06, 0.06, 0.06) }),
  item('wall_clock', 'decor', 'Reloj de pared', 'Redondo', 'wall', { w: 0.36, h: 0.36, t: 0.04 }, { sabines: SMALL }),
  item('wall_art', 'decor', 'Cuadro decorativo', 'Composición con los colores de la sala', 'wall', { w: 0.9, h: 0.7, t: 0.03 }, { colorRole: 'wood', sabines: SMALL }),
  item('trash_bin', 'decor', 'Caneca', 'Metálica', 'floor', { w: 0.3, d: 0.3, h: 0.45 }, { sabines: SMALL }),
  item('plant_small', 'decor', 'Planta pequeña', 'Para mesas y repisas', 'floor', { w: 0.3, d: 0.3, h: 0.45 }, { sabines: SMALL }),

  // Iluminación
  item('ceiling_fan', 'lighting', 'Ventilador de techo con luz', 'Cuatro aspas de madera', 'ceiling', { w: 1.2, d: 1.2, h: 0.4, drop: 0.35 }, { colorRole: 'wood', sabines: SMALL }),
  item('pendant_lamp', 'lighting', 'Lámpara colgante', 'Pantalla metálica, ideal sobre comedores', 'ceiling', { w: 0.42, d: 0.42, h: 0.25, drop: 0.7 }, { colorRole: 'dark', sabines: SMALL }),

  // Taller y herramientas
  item('toolbox', 'tools', 'Caja de herramientas', 'Metálica con manija', 'floor', { w: 0.5, d: 0.24, h: 0.26 }, { colorRole: 'accent', sabines: SMALL }),
  item('tool_chest', 'tools', 'Gabinete de herramientas', 'Seis cajones y ruedas', 'floor', { w: 0.7, d: 0.46, h: 1.0 }, { colorRole: 'accent' }),
  item('pegboard_tools', 'tools', 'Tablero con herramientas', 'Martillo, llaves, destornilladores y serrucho', 'wall', { w: 1.2, h: 0.8, t: 0.05 }, { sabines: S(0.05, 0.06, 0.06, 0.06, 0.06, 0.06) }),
  item('step_ladder', 'tools', 'Escalera de tijera', 'Aluminio', 'floor', { w: 0.5, d: 0.6, h: 1.5 }, { sabines: SMALL }),
  item('power_drill', 'tools', 'Taladro', 'Inalámbrico', 'floor', { w: 0.2, d: 0.3, h: 0.25 }, { colorRole: 'accent', sabines: SMALL }),
  item('air_compressor', 'tools', 'Compresor de aire', 'Tanque horizontal con ruedas', 'floor', { w: 0.6, d: 0.35, h: 0.6 }, { colorRole: 'accent', sabines: SMALL }),
  item('sawhorse_table', 'tools', 'Mesa de trabajo en caballetes', 'Tablero sobre caballetes, con taladro', 'floor', { w: 1.6, d: 0.7, h: 0.8 }, { sabines: WOODY }),
  item('paint_set', 'tools', 'Pintura y rodillo', 'Dos galones y bandeja', 'floor', { w: 0.7, d: 0.6, h: 0.3 }, { sabines: SMALL }),

  // Equipos de sonido
  item('bookshelf_speakers', 'audio', 'Parlantes de estantería (par)', 'Sobre pedestales, separación ajustable', 'floor', { w: 1.6, d: 0.3, h: 0.95, finish: 'nogal', stands: true }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: S(0.04, 0.05, 0.05, 0.05, 0.05, 0.05) }),
  item('hifi_stack', 'audio', 'Equipo hi-fi', 'Amplificador con vúmetros y reproductor', 'floor', { w: 0.44, d: 0.36, h: 0.22, finish: 'plata' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: SMALL }),
  item('turntable', 'audio', 'Tocadiscos', 'Plato, disco y brazo', 'floor', { w: 0.45, d: 0.36, h: 0.15, finish: 'nogal' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: SMALL }),
  item('soundbar', 'audio', 'Barra de sonido', 'Para poner bajo el televisor', 'floor', { w: 0.9, d: 0.1, h: 0.07, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: SMALL }),
  item('pa_speaker', 'audio', 'Cabina activa en trípode', 'Sonido en vivo y eventos', 'floor', { w: 0.6, d: 0.6, h: 1.9, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: S(0.05, 0.06, 0.06, 0.06, 0.06, 0.06) }),
  item('pa_subwoofer', 'audio', 'Subwoofer de sonido en vivo', 'Parlante de 15 pulgadas', 'floor', { w: 0.55, d: 0.6, h: 0.6, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: S(0.06, 0.06, 0.05, 0.05, 0.05, 0.05) }),
  item('mixing_console', 'audio', 'Consola de mezcla grande', 'Canales, faders y puente de medidores', 'floor', { w: 2.0, d: 0.95, h: 0.85, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: S(0.15, 0.18, 0.2, 0.22, 0.22, 0.22) }),
  item('audio_interface', 'audio', 'Interfaz de audio', 'Dos entradas y medidores', 'floor', { w: 0.3, d: 0.2, h: 0.07, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: SMALL }),
  item('midi_controller', 'audio', 'Controlador MIDI de pads', 'Pads con luz y perillas', 'floor', { w: 0.5, d: 0.26, h: 0.06, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: SMALL }),
  item('headphones_stand', 'audio', 'Audífonos en soporte', 'Para el escritorio', 'floor', { w: 0.24, d: 0.16, h: 0.3, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: SMALL }),
  item('dj_booth', 'audio', 'Cabina de DJ', 'Controlador, portátil y franja de luz', 'floor', { w: 1.4, d: 0.7, h: 0.92, finish: 'negro' }, { colorRole: 'primary', finishes: ALL_FINISHES, sabines: S(0.1, 0.1, 0.1, 0.1, 0.1, 0.1) }),
  item('bass_amp', 'audio', 'Amplificador de bajo 4×10', 'Cabezal y gabinete', 'floor', { w: 0.6, d: 0.42, h: 0.86, finish: 'negro' }, { colorRole: 'dark', finishes: ALL_FINISHES, sabines: S(0.08, 0.08, 0.07, 0.07, 0.07, 0.07) }),

  // Instrumentos
  item('upright_piano', 'instruments', 'Piano vertical', 'Con banca', 'floor', { w: 1.5, d: 0.62, h: 1.25, finish: 'negro' }, { colorRole: 'dark', finishes: PIANO_FINISHES, sabines: S(0.2, 0.18, 0.15, 0.15, 0.15, 0.15) }),
  item('grand_piano', 'instruments', 'Piano de cola', 'Tapa abierta y banca', 'floor', { w: 1.5, d: 1.9, h: 1.0, finish: 'negro' }, { colorRole: 'dark', finishes: PIANO_FINISHES, sabines: S(0.35, 0.3, 0.25, 0.25, 0.25, 0.25) }),
  item('digital_piano', 'instruments', 'Piano digital', 'Mueble compacto', 'floor', { w: 1.36, d: 0.36, h: 0.88, finish: 'negro' }, { colorRole: 'dark', finishes: PIANO_FINISHES, sabines: SMALL }),
  item('acoustic_guitar', 'instruments', 'Guitarra acústica', 'En su soporte', 'floor', { w: 0.42, d: 0.4, h: 1.05 }, { colorRole: 'wood', sabines: SMALL }),
  item('electric_guitar', 'instruments', 'Guitarra eléctrica', 'En su soporte, color a elección', 'floor', { w: 0.36, d: 0.4, h: 1.0 }, { colorRole: 'accent', sabines: SMALL }),
  item('electric_bass', 'instruments', 'Bajo eléctrico', 'En su soporte', 'floor', { w: 0.36, d: 0.4, h: 1.2 }, { colorRole: 'primary', sabines: SMALL }),
  item('cello', 'instruments', 'Violonchelo', 'Apoyado en su base', 'floor', { w: 0.45, d: 0.4, h: 1.35 }, { colorRole: 'wood', sabines: SMALL }),
  item('cajon', 'instruments', 'Cajón peruano', 'Percusión de madera', 'floor', { w: 0.3, d: 0.3, h: 0.48 }, { colorRole: 'wood', sabines: SMALL }),
  item('electronic_drums', 'instruments', 'Batería electrónica', 'Pads, platillos y banqueta', 'floor', { w: 1.1, d: 1.0, h: 1.2 }, { colorRole: 'accent', sabines: S(0.06, 0.07, 0.08, 0.08, 0.08, 0.08) }),
];

export const EXTRA_FURNITURE = Object.fromEntries(LIST.map((it) => [it.id, it]));

/** Muebles nuevos que sirven de apoyo para poner objetos encima. */
export const EXTRA_SURFACES = [
  'kitchen_counter',
  'nightstand',
  'dresser',
  'dining_table',
  'tv_console',
  'cube_shelf',
  'l_desk',
  'standing_desk',
  'reception_counter',
  'sawhorse_table',
  'dj_booth',
];

/* ------------------------------------------------------- categorías del catálogo */

export const CATALOG_GROUPS = [
  { id: 'all', label: 'Todo' },
  { id: 'treatment', label: 'Tratamiento acústico' },
  { id: 'audio', label: 'Equipos de sonido' },
  { id: 'instruments', label: 'Instrumentos' },
  { id: 'living', label: 'Sala y comedor' },
  { id: 'bedroom', label: 'Dormitorio' },
  { id: 'kitchen', label: 'Cocina y hogar' },
  { id: 'tech', label: 'Cómputo y video' },
  { id: 'office', label: 'Oficina y aula' },
  { id: 'lighting', label: 'Iluminación' },
  { id: 'tools', label: 'Taller' },
  { id: 'architecture', label: 'Puertas y ventanas' },
  { id: 'decor', label: 'Decoración' },
];

// Grupo de los objetos que ya existían en el catálogo
const LEGACY_GROUP = {
  desk: 'audio',
  studio_monitors: 'audio',
  rack: 'audio',
  subwoofer: 'audio',
  tower_speaker: 'audio',
  mic_stand: 'audio',
  keyboard_stand: 'instruments',
  drum_kit: 'instruments',
  guitar_amp: 'instruments',
  sofa: 'living',
  bookshelf: 'living',
  cinema_row: 'living',
  shell_chair: 'living',
  sideboard: 'living',
  coffee_table: 'living',
  pouf: 'living',
  bar_stool: 'living',
  armchair_lounge: 'living',
  mid_shelf_credenza: 'living',
  rug: 'decor',
  round_rug: 'decor',
  plant: 'decor',
  books_decor_set: 'decor',
  person_figure: 'decor',
  floor_lamp: 'lighting',
  studio_softbox_light: 'lighting',
  ring_light_stand: 'lighting',
  ceiling_led_panel: 'lighting',
  track_spotlight_bar: 'lighting',
  desk_lamp: 'lighting',
  wall_screen: 'tech',
  ceiling_projector: 'tech',
  wall_tv: 'tech',
  rolling_tv_stand: 'tech',
  laptop_prop: 'tech',
  desktop_pc_setup: 'tech',
  cinema_camera_tripod: 'tech',
  ptz_conference_cam: 'tech',
  coffee_maker_station: 'kitchen',
  ac_split_unit: 'kitchen',
  meeting_table: 'office',
  task_chair: 'office',
  student_desk: 'office',
  classroom_desk_grid: 'office',
  teacher_desk: 'office',
  whiteboard: 'office',
  podium: 'office',
  locker_bank: 'office',
  lab_bench: 'office',
  school_arm_chair: 'office',
  ergonomic_chair: 'office',
  visitor_chair: 'office',
  industrial_machine: 'tools',
  hvac_duct: 'tools',
  industrial_shelving: 'tools',
  workbench: 'tools',
  acoustic_barrier: 'treatment',
};

export function catalogGroupOf(def) {
  if (!def) return 'decor';
  if (def.group) return def.group;
  if (def.category === 'panels' || def.category === 'diffusers') return 'treatment';
  if (def.subCategory === 'architecture') return 'architecture';
  return LEGACY_GROUP[def.id] ?? 'living';
}
