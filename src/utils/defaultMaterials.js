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
 * Paleta de colores cromática para el visualizador 3D según categoría de material
 */
export const MATERIAL_CATEGORY_COLORS = {
  [MATERIAL_CATEGORIES.STRUCTURAL]: {
    fill: 'rgba(148, 163, 184, 0.18)',
    hoverFill: 'rgba(148, 163, 184, 0.40)',
    stroke: 'rgba(100, 116, 139, 0.65)',
    glow: 'rgba(100, 116, 139, 0.4)',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
    hex: '#64748b',
  },
  [MATERIAL_CATEGORIES.FINISHES]: {
    fill: 'rgba(217, 119, 6, 0.16)',
    hoverFill: 'rgba(217, 119, 6, 0.38)',
    stroke: 'rgba(180, 83, 9, 0.65)',
    glow: 'rgba(217, 119, 6, 0.4)',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
    hex: '#d97706',
  },
  [MATERIAL_CATEGORIES.TEXTILES]: {
    fill: 'rgba(147, 51, 234, 0.18)',
    hoverFill: 'rgba(147, 51, 234, 0.40)',
    stroke: 'rgba(126, 34, 206, 0.65)',
    glow: 'rgba(147, 51, 234, 0.4)',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-300',
    hex: '#9333ea',
  },
  [MATERIAL_CATEGORIES.ABSORBERS]: {
    fill: 'rgba(16, 185, 129, 0.22)',
    hoverFill: 'rgba(16, 185, 129, 0.45)',
    stroke: 'rgba(5, 150, 105, 0.70)',
    glow: 'rgba(16, 185, 129, 0.4)',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    hex: '#10b981',
  },
  [MATERIAL_CATEGORIES.OPENINGS]: {
    fill: 'rgba(14, 165, 233, 0.20)',
    hoverFill: 'rgba(14, 165, 233, 0.42)',
    stroke: 'rgba(2, 132, 199, 0.70)',
    glow: 'rgba(14, 165, 233, 0.4)',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-300',
    hex: '#0ea5e9',
  },
  DEFAULT: {
    fill: 'rgba(0, 113, 227, 0.14)',
    hoverFill: 'rgba(0, 113, 227, 0.35)',
    stroke: 'rgba(0, 113, 227, 0.55)',
    glow: 'rgba(0, 113, 227, 0.4)',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-300',
    hex: '#0071e3',
  },
};

/**
 * Obtiene la configuración de color para un material
 */
export function getMaterialColor(materialId) {
  const mat = getMaterialById(materialId);
  return MATERIAL_CATEGORY_COLORS[mat?.category] || MATERIAL_CATEGORY_COLORS.DEFAULT;
}

/**
 * Catálogo de Sub-elementos y Aberturas estándar para paredes y superficies
 */
export const DEFAULT_SUB_ELEMENTS_PRESETS = [
  {
    type: 'window_single',
    name: 'Ventana Vidrio Simple 4mm',
    category: 'Abertura',
    defaultArea: 2.0,
    materialId: 'glass_single_4mm',
    colorHex: '#38bdf8',
    coefficients: { 125: 0.18, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
  },
  {
    type: 'window_double',
    name: 'Ventana Doble Vidrio Acústico (DVH)',
    category: 'Abertura',
    defaultArea: 3.2,
    materialId: 'glass_double_insulated',
    colorHex: '#0284c7',
    coefficients: { 125: 0.15, 250: 0.08, 500: 0.05, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
  },
  {
    type: 'door_wood',
    name: 'Puerta de Madera Maciza',
    category: 'Abertura',
    defaultArea: 1.89,
    materialId: 'wooden_door_solid',
    colorHex: '#b45309',
    coefficients: { 125: 0.14, 250: 0.10, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
  },
  {
    type: 'panel_rockwool',
    name: 'Panel Absorbente Lana Mineral 50mm',
    category: 'Acústico',
    defaultArea: 2.4,
    materialId: 'mineral_wool_50mm',
    colorHex: '#10b981',
    coefficients: { 125: 0.30, 250: 0.75, 500: 0.95, 1000: 0.95, 2000: 0.90, 4000: 0.85 },
  },
  {
    type: 'acoustic_foam',
    name: 'Panel de Espuma Acústica Piramidal',
    category: 'Acústico',
    defaultArea: 1.5,
    materialId: 'acoustic_foam_polyurethane_50mm',
    colorHex: '#059669',
    coefficients: { 125: 0.15, 250: 0.35, 500: 0.70, 1000: 0.88, 2000: 0.92, 4000: 0.90 },
  },
  {
    type: 'curtain_heavy',
    name: 'Cortinado Textil Fruncido',
    category: 'Textil',
    defaultArea: 4.0,
    materialId: 'curtains_heavy_draped',
    colorHex: '#9333ea',
    coefficients: { 125: 0.14, 250: 0.35, 500: 0.55, 1000: 0.72, 2000: 0.70, 4000: 0.65 },
  },
];

/**
 * Genera la configuración de materiales por defecto para una sala equilibrada estándar
 */
export function getDefaultRoomMaterials() {
  return {
    floor: {
      materialId: 'wood_parquet_on_concrete',
      coefficients: { 125: 0.04, 250: 0.04, 500: 0.07, 1000: 0.06, 2000: 0.06, 4000: 0.07 },
      subElements: [],
    },
    ceiling: {
      materialId: 'mineral_fiber_ceiling_tiles',
      coefficients: { 125: 0.45, 250: 0.60, 500: 0.75, 1000: 0.85, 2000: 0.88, 4000: 0.90 },
      subElements: [],
    },
    wallNorth: {
      materialId: 'brick_painted',
      coefficients: { 125: 0.01, 250: 0.02, 500: 0.02, 1000: 0.03, 2000: 0.04, 4000: 0.05 },
      subElements: [
        {
          id: 'sub_wn_1',
          type: 'window_double',
          name: 'Ventana Doble Vidrio Acústico (DVH)',
          area: 3.0,
          colorHex: '#0284c7',
          coefficients: { 125: 0.15, 250: 0.08, 500: 0.05, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
        }
      ],
    },
    wallSouth: {
      materialId: 'curtains_heavy_draped',
      coefficients: { 125: 0.14, 250: 0.35, 500: 0.55, 1000: 0.72, 2000: 0.70, 4000: 0.65 },
      subElements: [
        {
          id: 'sub_ws_1',
          type: 'door_wood',
          name: 'Puerta de Madera Maciza',
          area: 1.89,
          colorHex: '#b45309',
          coefficients: { 125: 0.14, 250: 0.10, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
        }
      ],
    },
    wallEast: {
      materialId: 'gypsum_board_13mm',
      coefficients: { 125: 0.29, 250: 0.10, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09 },
      subElements: [
        {
          id: 'sub_we_1',
          type: 'panel_rockwool',
          name: 'Panel Absorbente Lana Mineral',
          area: 2.4,
          colorHex: '#10b981',
          coefficients: { 125: 0.30, 250: 0.75, 500: 0.95, 1000: 0.95, 2000: 0.90, 4000: 0.85 },
        }
      ],
    },
    wallWest: {
      materialId: 'gypsum_board_13mm',
      coefficients: { 125: 0.29, 250: 0.10, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09 },
      subElements: [],
    },
  };
}

/**
 * Ciclo de materiales por defecto para paredes de polígonos con N lados.
 * Rota entre materiales típicos para dar variedad visual.
 */
const WALL_MATERIAL_CYCLE = [
  { materialId: 'brick_painted', coefficients: { 125: 0.01, 250: 0.02, 500: 0.02, 1000: 0.03, 2000: 0.04, 4000: 0.05 } },
  { materialId: 'gypsum_board_13mm', coefficients: { 125: 0.29, 250: 0.10, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09 } },
  { materialId: 'plaster_on_solid', coefficients: { 125: 0.02, 250: 0.02, 500: 0.03, 1000: 0.04, 2000: 0.04, 4000: 0.03 } },
  { materialId: 'concrete_painted', coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 } },
];

/**
 * Genera la configuración de materiales por defecto para una sala poligonal con N paredes.
 * Preserva materiales existentes cuando sea posible (al agregar/quitar vértices).
 *
 * @param {number} numWalls - Número de paredes (= número de vértices del polígono)
 * @param {Object} [existingMaterials] - Materiales previos a preservar
 * @returns {Object} Configuración de materiales { floor, ceiling, wall_0, wall_1, ... }
 */
export function getDefaultPolygonMaterials(numWalls, existingMaterials = null) {
  const materials = {
    floor: existingMaterials?.floor || {
      materialId: 'wood_parquet_on_concrete',
      coefficients: { 125: 0.04, 250: 0.04, 500: 0.07, 1000: 0.06, 2000: 0.06, 4000: 0.07 },
      subElements: [],
    },
    ceiling: existingMaterials?.ceiling || {
      materialId: 'mineral_fiber_ceiling_tiles',
      coefficients: { 125: 0.45, 250: 0.60, 500: 0.75, 1000: 0.85, 2000: 0.88, 4000: 0.90 },
      subElements: [],
    },
  };

  for (let i = 0; i < numWalls; i++) {
    const wallId = `wall_${i}`;
    if (existingMaterials && existingMaterials[wallId]) {
      materials[wallId] = existingMaterials[wallId];
    } else {
      const cycled = WALL_MATERIAL_CYCLE[i % WALL_MATERIAL_CYCLE.length];
      materials[wallId] = {
        materialId: cycled.materialId,
        coefficients: { ...cycled.coefficients },
        subElements: [],
      };
    }
  }

  // Remove walls that no longer exist (if polygon shrank)
  if (existingMaterials) {
    Object.keys(existingMaterials).forEach((key) => {
      if (key.startsWith('wall_')) {
        const idx = parseInt(key.split('_')[1], 10);
        if (idx >= numWalls) {
          // Wall no longer exists — don't include it
        }
      }
    });
  }

  return materials;
}
