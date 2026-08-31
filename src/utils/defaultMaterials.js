/**
 * ==============================================================================
 * BASE DE DATOS DE MATERIALES ACÚSTICOS Y COEFICIENTES DE ABSORCIÓN (α)
 * ==============================================================================
 * 
 * Coeficientes de absorción sonora en bandas de octava normalizadas (ISO 354).
 * Valores representativos de literatura estándar (Egan, Cox & D'Antonio, Vorländer, Harris).
 */

export const MATERIAL_CATEGORIES = {
  STRUCTURAL: 'Estructurales y Rígidos',
  FINISHES: 'Acabados y Maderas',
  TEXTILES: 'Textiles y Alfombras',
  ABSORBERS: 'Paneles y Fonoabsorbentes Especiales',
  OPENINGS: 'Vidrios y Aberturas',
};

export const DEFAULT_MATERIALS_DATABASE = [
  // --- ESTRUCTURALES Y RÍGIDOS ---
  {
    id: 'concrete_bare',
    name: 'Hormigón / Concreto visto liso',
    category: MATERIAL_CATEGORIES.STRUCTURAL,
    description: 'Hormigón vertido y alisado sin pintar.',
    coefficients: { 125: 0.01, 250: 0.01, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.03 },
  },
  {
    id: 'concrete_painted',
    name: 'Hormigón pintado o sellado',
    category: MATERIAL_CATEGORIES.STRUCTURAL,
    description: 'Hormigón con pintura de poro cerrado.',
    coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
  },
  {
    id: 'brick_bare',
    name: 'Ladrillo a la vista sin revoco',
    category: MATERIAL_CATEGORIES.STRUCTURAL,
    description: 'Ladrillo cerámico o común sin pintar.',
    coefficients: { 125: 0.03, 250: 0.03, 500: 0.03, 1000: 0.04, 2000: 0.05, 4000: 0.07 },
  },
  {
    id: 'brick_painted',
    name: 'Ladrillo revocado y pintado',
    category: MATERIAL_CATEGORIES.STRUCTURAL,
    description: 'Pared de ladrillo con enlucido de cemento/cal y pintura.',
    coefficients: { 125: 0.01, 250: 0.02, 500: 0.02, 1000: 0.03, 2000: 0.04, 4000: 0.05 },
  },
  {
    id: 'ceramic_tile',
    name: 'Baldosa cerámica / Porcelanato / Mármol',
    category: MATERIAL_CATEGORIES.STRUCTURAL,
    description: 'Piso o revestimiento cerámico de alta dureza reflectante.',
    coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
  },

  // --- ACABADOS Y MADERAS ---
  {
    id: 'gypsum_board_13mm',
    name: 'Placa de yeso laminado 13mm (Drywall)',
    category: MATERIAL_CATEGORIES.FINISHES,
    description: 'Placa de yeso estándar sobre estructura metálica con cámara de aire (resonador de membrana en bajas frecuencias).',
    coefficients: { 125: 0.29, 250: 0.10, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09 },
  },
  {
    id: 'plaster_on_solid',
    name: 'Enlucido de yeso sobre muro macizo',
    category: MATERIAL_CATEGORIES.FINISHES,
    description: 'Capa de yeso aplicada directamente sobre mampostería sólida.',
    coefficients: { 125: 0.02, 250: 0.02, 500: 0.03, 1000: 0.04, 2000: 0.04, 4000: 0.03 },
  },
  {
    id: 'wood_parquet_on_concrete',
    name: 'Piso de parquet de madera sobre hormigón',
    category: MATERIAL_CATEGORIES.FINISHES,
    description: 'Madera maciza encolada directamente a losa de hormigón.',
    coefficients: { 125: 0.04, 250: 0.04, 500: 0.07, 1000: 0.06, 2000: 0.06, 4000: 0.07 },
  },
  {
    id: 'wood_paneling_cavity',
    name: 'Panel de madera con cámara de aire (16mm)',
    category: MATERIAL_CATEGORIES.FINISHES,
    description: 'Madera contrachapada sobre rastreles de 50mm con lana mineral (absorbe bajas frecuencias).',
    coefficients: { 125: 0.35, 250: 0.25, 500: 0.18, 1000: 0.12, 2000: 0.10, 4000: 0.09 },
  },

  // --- TEXTILES Y ALFOMBRAS ---
  {
    id: 'carpet_thin_on_concrete',
    name: 'Moqueta / Alfombra delgada pegada',
    category: MATERIAL_CATEGORIES.TEXTILES,
    description: 'Alfombra de pelo corto (~5mm) pegada a hormigón.',
    coefficients: { 125: 0.02, 250: 0.06, 500: 0.14, 1000: 0.37, 2000: 0.60, 4000: 0.65 },
  },
  {
    id: 'carpet_thick_with_underlay',
    name: 'Alfombra gruesa con base de espuma (Underlay)',
    category: MATERIAL_CATEGORIES.TEXTILES,
    description: 'Alfombra de lana/poliamida de 10mm sobre sub-base amortiguante de 6mm.',
    coefficients: { 125: 0.08, 250: 0.24, 500: 0.57, 1000: 0.69, 2000: 0.71, 4000: 0.73 },
  },
  {
    id: 'curtains_cotton_light',
    name: 'Cortinas de algodón ligeras (plegado plano)',
    category: MATERIAL_CATEGORIES.TEXTILES,
    description: 'Cortina delgada (~200 g/m²) colgada plana.',
    coefficients: { 125: 0.03, 250: 0.04, 500: 0.11, 1000: 0.17, 2000: 0.24, 4000: 0.35 },
  },
  {
    id: 'curtains_heavy_draped',
    name: 'Cortinas pesadas de terciopelo (plegado 100%)',
    category: MATERIAL_CATEGORIES.TEXTILES,
    description: 'Terciopelo acústico pesado (~500 g/m²) con fruncido al 100% separado 10cm de pared.',
    coefficients: { 125: 0.14, 250: 0.35, 500: 0.55, 1000: 0.72, 2000: 0.70, 4000: 0.65 },
  },

  // --- FONOABSORBENTES ESPECIALES ---
  {
    id: 'acoustic_foam_50mm',
    name: 'Espuma acústica de poliuretano 50mm (Piramidal)',
    category: MATERIAL_CATEGORIES.ABSORBERS,
    description: 'Espuma porosa de celda abierta para tratamiento de medios y agudos.',
    coefficients: { 125: 0.12, 250: 0.30, 500: 0.65, 1000: 0.85, 2000: 0.90, 4000: 0.92 },
  },
  {
    id: 'rockwool_panel_50mm_cavity',
    name: 'Panel de lana de roca 50mm (70 kg/m³) con cámara',
    category: MATERIAL_CATEGORIES.ABSORBERS,
    description: 'Panel absorbente de alta densidad con tela acústica fono-transparente.',
    coefficients: { 125: 0.30, 250: 0.65, 500: 0.95, 1000: 0.98, 2000: 0.96, 4000: 0.95 },
  },
  {
    id: 'perforated_panel_absorber',
    name: 'Panel de madera microperforada con lana mineral',
    category: MATERIAL_CATEGORIES.ABSORBERS,
    description: 'Resonador de Helmholtz acoplado con absorbente poroso.',
    coefficients: { 125: 0.40, 250: 0.80, 500: 0.85, 1000: 0.65, 2000: 0.45, 4000: 0.30 },
  },
  {
    id: 'mineral_fiber_ceiling_tiles',
    name: 'Cielo raso acústico desmontable (Fibra mineral)',
    category: MATERIAL_CATEGORIES.ABSORBERS,
    description: 'Plafón acústico tipo Armstrong/Rockfon 15mm en perfilería suspendida a 200mm.',
    coefficients: { 125: 0.45, 250: 0.60, 500: 0.75, 1000: 0.85, 2000: 0.88, 4000: 0.90 },
  },
  {
    id: 'open_window_total_absorption',
    name: 'Ventana completamente abierta (Absorción perfecta)',
    category: MATERIAL_CATEGORIES.ABSORBERS,
    description: 'Energía sonora que sale al exterior sin retorno (α = 1.00 en todas las bandas).',
    coefficients: { 125: 1.00, 250: 1.00, 500: 1.00, 1000: 1.00, 2000: 1.00, 4000: 1.00 },
  },

  // --- VIDRIOS Y ABERTURAS ---
  {
    id: 'glass_single_4mm',
    name: 'Vidrio monolítico simple 4mm',
    category: MATERIAL_CATEGORIES.OPENINGS,
    description: 'Ventanal de vidrio ordinario simple.',
    coefficients: { 125: 0.18, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
  },
  {
    id: 'glass_double_insulated',
    name: 'Doble acristalamiento térmico/acústico (DVH 4/12/4)',
    category: MATERIAL_CATEGORIES.OPENINGS,
    description: 'Vidrio doble con cámara de aire hermética.',
    coefficients: { 125: 0.15, 250: 0.08, 500: 0.05, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
  },
  {
    id: 'wooden_door_solid',
    name: 'Puerta de madera maciza cerrada',
    category: MATERIAL_CATEGORIES.OPENINGS,
    description: 'Puerta batiente de roble/cedro de 45mm de espesor.',
    coefficients: { 125: 0.14, 250: 0.10, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
  },
];

/**
 * Obtiene un material por su ID o retorna valores por defecto
 */
export function getMaterialById(id) {
  return (
    DEFAULT_MATERIALS_DATABASE.find((mat) => mat.id === id) || {
      id: 'custom',
      name: 'Personalizado',
      category: 'Usuario',
      description: 'Coeficientes asignados manualmente por el usuario.',
      coefficients: { 125: 0.1, 250: 0.1, 500: 0.1, 1000: 0.1, 2000: 0.1, 4000: 0.1 },
    }
  );
}

/**
 * Genera la configuración de materiales por defecto para una sala equilibrada estándar
 */
export function getDefaultRoomMaterials() {
  return {
    floor: {
      materialId: 'wood_parquet_on_concrete',
      coefficients: { 125: 0.04, 250: 0.04, 500: 0.07, 1000: 0.06, 2000: 0.06, 4000: 0.07 },
    },
    ceiling: {
      materialId: 'mineral_fiber_ceiling_tiles',
      coefficients: { 125: 0.45, 250: 0.60, 500: 0.75, 1000: 0.85, 2000: 0.88, 4000: 0.90 },
    },
    wallNorth: {
      materialId: 'brick_painted',
      coefficients: { 125: 0.01, 250: 0.02, 500: 0.02, 1000: 0.03, 2000: 0.04, 4000: 0.05 },
    },
    wallSouth: {
      materialId: 'curtains_heavy_draped',
      coefficients: { 125: 0.14, 250: 0.35, 500: 0.55, 1000: 0.72, 2000: 0.70, 4000: 0.65 },
    },
    wallEast: {
      materialId: 'gypsum_board_13mm',
      coefficients: { 125: 0.29, 250: 0.10, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09 },
    },
    wallWest: {
      materialId: 'gypsum_board_13mm',
      coefficients: { 125: 0.29, 250: 0.10, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09 },
    },
  };
}
