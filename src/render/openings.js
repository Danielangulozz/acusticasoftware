/**
 * Tipos de objeto que abren un vano real en el muro (puertas y ventanas) y opciones de sus
 * variantes. Vive aparte, sin dependencias, para que lo usen el kit 3D, las escenas, el visor y
 * el Estudio sin crear importaciones circulares.
 */

/** Estilos de hoja de puerta: [id, etiqueta]. */
export const DOOR_STYLES = [
  ['wood', 'Madera'],
  ['metal', 'Metal'],
  ['aluminum', 'Aluminio y vidrio'],
  ['glass', 'Vidrio'],
  ['sliding', 'Corrediza'],
  ['technical', 'Cuarto técnico'],
];

export const DOOR_TYPE_IDS = new Set(['arch_door', 'double_door', 'door_metal', 'door_glass', 'door_sliding', 'door_technical']);
export const WINDOW_TYPE_IDS = new Set(['arch_window', 'panoramic_window', 'floor_to_ceiling_window', 'studio_visor_window']);

/** Van apoyados en el piso (su altura no se edita, se deriva de su alto). */
export const FLOOR_ANCHORED_TYPES = new Set([...DOOR_TYPE_IDS, 'floor_to_ceiling_window']);

/** Atraviesan el muro: se ven por ambos lados y recortan la pared. */
export const THROUGH_WALL_TYPES = new Set([...DOOR_TYPE_IDS, ...WINDOW_TYPE_IDS]);

export const CURTAIN_TYPE_IDS = new Set(['draped_curtain', 'stage_curtain']);

export const isDoorType = (typeId) => DOOR_TYPE_IDS.has(typeId);
