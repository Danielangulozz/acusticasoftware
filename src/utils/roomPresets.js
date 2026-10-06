/**
 * ==============================================================================
 * PRESETS DE RECINTOS TÍPICOS DE INGENIERÍA ACÚSTICA
 * ==============================================================================
 * Permite cargar rápidamente escenarios realistas para comparar comportamiento.
 */

export const ROOM_PRESETS = [
  {
    id: 'classroom',
    name: 'Aula de Clases / Conferencia',
    category: 'Voz / Palabra',
    description: 'Recinto mediano optimizado para inteligibilidad de la palabra (STI > 0.65). Techo acústico y suelo duro.',
    icon: 'GraduationCap',
    dimensions: { length: 9.0, width: 6.5, height: 3.2 },
    source: { lw: 85, directivity: 2, distance: 4.5, name: 'Orador / Profesor' },
    materials: {
      floor: {
        materialId: 'ceramic_tile',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
      },
      ceiling: {
        materialId: 'mineral_fiber_ceiling_tiles',
        coefficients: { 125: 0.45, 250: 0.60, 500: 0.75, 1000: 0.85, 2000: 0.88, 4000: 0.90 },
      },
      wallNorth: {
        materialId: 'plaster_on_solid',
        coefficients: { 125: 0.02, 250: 0.02, 500: 0.03, 1000: 0.04, 2000: 0.04, 4000: 0.03 },
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
        materialId: 'glass_single_4mm',
        coefficients: { 125: 0.18, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
      },
    },
    roomType: 'speech',
  },
  {
    id: 'recording_studio',
    name: 'Estudio de Grabación / Control Room',
    category: 'Producción Musical',
    description: 'Sala seca con alta absorción en todas las frecuencias, trampas de graves y paneles fonoabsorbentes.',
    icon: 'Mic',
    dimensions: { length: 5.5, width: 4.2, height: 2.8 },
    source: { lw: 90, directivity: 1, distance: 2.0, name: 'Monitores de Estudio' },
    materials: {
      floor: {
        materialId: 'carpet_thick_with_underlay',
        coefficients: { 125: 0.08, 250: 0.24, 500: 0.57, 1000: 0.69, 2000: 0.71, 4000: 0.73 },
      },
      ceiling: {
        materialId: 'rockwool_panel_50mm_cavity',
        coefficients: { 125: 0.30, 250: 0.65, 500: 0.95, 1000: 0.98, 2000: 0.96, 4000: 0.95 },
      },
      wallNorth: {
        materialId: 'rockwool_panel_50mm_cavity',
        coefficients: { 125: 0.30, 250: 0.65, 500: 0.95, 1000: 0.98, 2000: 0.96, 4000: 0.95 },
      },
      wallSouth: {
        materialId: 'perforated_panel_absorber',
        coefficients: { 125: 0.40, 250: 0.80, 500: 0.85, 1000: 0.65, 2000: 0.45, 4000: 0.30 },
      },
      wallEast: {
        materialId: 'acoustic_foam_50mm',
        coefficients: { 125: 0.12, 250: 0.30, 500: 0.65, 1000: 0.85, 2000: 0.90, 4000: 0.92 },
      },
      wallWest: {
        materialId: 'acoustic_foam_50mm',
        coefficients: { 125: 0.12, 250: 0.30, 500: 0.65, 1000: 0.85, 2000: 0.90, 4000: 0.92 },
      },
    },
    roomType: 'studio',
  },
  {
    id: 'concert_hall',
    name: 'Sala de Conciertos Sinfónica',
    category: 'Música Clásica',
    description: 'Gran volumen con superficies reflectantes y difusoras de madera para lograr calidez y envolvencia.',
    icon: 'Music',
    dimensions: { length: 28.0, width: 18.0, height: 12.0 },
    source: { lw: 105, directivity: 2, distance: 15.0, name: 'Orquesta Sinfónica' },
    materials: {
      floor: {
        materialId: 'wood_parquet_on_concrete',
        coefficients: { 125: 0.04, 250: 0.04, 500: 0.07, 1000: 0.06, 2000: 0.06, 4000: 0.07 },
      },
      ceiling: {
        materialId: 'wood_paneling_cavity',
        coefficients: { 125: 0.35, 250: 0.25, 500: 0.18, 1000: 0.12, 2000: 0.10, 4000: 0.09 },
      },
      wallNorth: {
        materialId: 'wood_paneling_cavity',
        coefficients: { 125: 0.35, 250: 0.25, 500: 0.18, 1000: 0.12, 2000: 0.10, 4000: 0.09 },
      },
      wallSouth: {
        materialId: 'wood_paneling_cavity',
        coefficients: { 125: 0.35, 250: 0.25, 500: 0.18, 1000: 0.12, 2000: 0.10, 4000: 0.09 },
      },
      wallEast: {
        materialId: 'brick_bare',
        coefficients: { 125: 0.03, 250: 0.03, 500: 0.03, 1000: 0.04, 2000: 0.05, 4000: 0.07 },
      },
      wallWest: {
        materialId: 'brick_bare',
        coefficients: { 125: 0.03, 250: 0.03, 500: 0.03, 1000: 0.04, 2000: 0.05, 4000: 0.07 },
      },
    },
    roomType: 'music',
  },
  {
    id: 'sports_gym',
    name: 'Gimnasio / Polideportivo',
    category: 'Industrial / Deportivo',
    description: 'Gran volumen y superficies muy duras reflectantes con tiempos de reverberación excesivos (efecto cóctel).',
    icon: 'Activity',
    dimensions: { length: 30.0, width: 20.0, height: 8.0 },
    source: { lw: 95, directivity: 1, distance: 10.0, name: 'Megafonía / Ruido' },
    materials: {
      floor: {
        materialId: 'wood_parquet_on_concrete',
        coefficients: { 125: 0.04, 250: 0.04, 500: 0.07, 1000: 0.06, 2000: 0.06, 4000: 0.07 },
      },
      ceiling: {
        materialId: 'concrete_bare',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.03 },
      },
      wallNorth: {
        materialId: 'brick_painted',
        coefficients: { 125: 0.01, 250: 0.02, 500: 0.02, 1000: 0.03, 2000: 0.04, 4000: 0.05 },
      },
      wallSouth: {
        materialId: 'brick_painted',
        coefficients: { 125: 0.01, 250: 0.02, 500: 0.02, 1000: 0.03, 2000: 0.04, 4000: 0.05 },
      },
      wallEast: {
        materialId: 'glass_single_4mm',
        coefficients: { 125: 0.18, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
      },
      wallWest: {
        materialId: 'concrete_painted',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
      },
    },
    roomType: 'multipurpose',
  },
  {
    id: 'reverberation_chamber',
    name: 'Cámara Reverberante de Laboratorio',
    category: 'Laboratorio / Ensayos',
    description: 'Paredes y pisos de hormigón pulido ultra reflectantes no paralelos para medición de absorción ISO 354.',
    icon: 'Radio',
    dimensions: { length: 8.0, width: 6.0, height: 4.5 },
    source: { lw: 100, directivity: 1, distance: 3.5, name: 'Fuente Dodecaédrica' },
    materials: {
      floor: {
        materialId: 'concrete_painted',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.02, 4000: 0.02 },
      },
      ceiling: {
        materialId: 'concrete_painted',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.02, 4000: 0.02 },
      },
      wallNorth: {
        materialId: 'concrete_painted',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.02, 4000: 0.02 },
      },
      wallSouth: {
        materialId: 'concrete_painted',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.02, 4000: 0.02 },
      },
      wallEast: {
        materialId: 'concrete_painted',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.02, 4000: 0.02 },
      },
      wallWest: {
        materialId: 'concrete_painted',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.01, 2000: 0.02, 4000: 0.02 },
      },
    },
    roomType: 'multipurpose',
  },
  {
    id: 'course_cube_3x3x3',
    name: 'Ejercicio Curso 3×3×3 m (RT = 1.0 s)',
    category: 'Docencia / Modos Propios',
    description: 'Sala cúbica de 3×3×3 m con tiempo de reverberación de 1.0 s y c = 345 m/s. Escenario clásico con degeneraciones triples y severa infracción de Bonello.',
    icon: 'Waves',
    dimensions: { length: 3.0, width: 3.0, height: 3.0 },
    source: { lw: 90, directivity: 1, distance: 1.5, name: 'Fuente Central' },
    materials: {
      floor: {
        materialId: 'wood_parquet_on_concrete',
        coefficients: { 125: 0.08, 250: 0.08, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
      },
      ceiling: {
        materialId: 'plaster_on_solid',
        coefficients: { 125: 0.08, 250: 0.08, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
      },
      wallNorth: {
        materialId: 'plaster_on_solid',
        coefficients: { 125: 0.08, 250: 0.08, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
      },
      wallSouth: {
        materialId: 'plaster_on_solid',
        coefficients: { 125: 0.08, 250: 0.08, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
      },
      wallEast: {
        materialId: 'plaster_on_solid',
        coefficients: { 125: 0.08, 250: 0.08, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
      },
      wallWest: {
        materialId: 'plaster_on_solid',
        coefficients: { 125: 0.08, 250: 0.08, 500: 0.08, 1000: 0.08, 2000: 0.08, 4000: 0.08 },
      },
    },
    roomType: 'speech',
    modal: {
      c: 345,
      tempC: 23,
      nMax: 6,
      fMax: 400,
      t60Source: 'override',
      t60Override: 1.0,
      tolerance: 0.1,
    },
  },
  {
    id: 'insitu_4_5x9x2_7',
    name: 'Sala de Ensayo 4.5×9×2.7 m (In Situ)',
    category: 'Medición / Laboratorio',
    description: 'Recinto con proporciones 1 : 1.67 : 3.33 ideal para el despliegue de cuadrícula de 1.5 m, validación REW y corrección con proporciones de Bolt.',
    icon: 'MapPin',
    dimensions: { length: 9.0, width: 4.5, height: 2.7 },
    source: { lw: 94, directivity: 1, distance: 3.0, name: 'Fuente Dodecaédrica S0' },
    materials: {
      floor: {
        materialId: 'ceramic_tile',
        coefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
      },
      ceiling: {
        materialId: 'mineral_fiber_ceiling_tiles',
        coefficients: { 125: 0.35, 250: 0.50, 500: 0.70, 1000: 0.80, 2000: 0.85, 4000: 0.85 },
      },
      wallNorth: {
        materialId: 'gypsum_board_13mm',
        coefficients: { 125: 0.20, 250: 0.12, 500: 0.08, 1000: 0.06, 2000: 0.06, 4000: 0.05 },
      },
      wallSouth: {
        materialId: 'gypsum_board_13mm',
        coefficients: { 125: 0.20, 250: 0.12, 500: 0.08, 1000: 0.06, 2000: 0.06, 4000: 0.05 },
      },
      wallEast: {
        materialId: 'glass_single_4mm',
        coefficients: { 125: 0.18, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
      },
      wallWest: {
        materialId: 'curtains_heavy_draped',
        coefficients: { 125: 0.14, 250: 0.35, 500: 0.55, 1000: 0.72, 2000: 0.70, 4000: 0.65 },
      },
    },
    roomType: 'speech',
    modal: {
      c: 343,
      tempC: 20,
      nMax: 5,
      fMax: 350,
      t60Source: 'sabine',
      tolerance: 0.5,
    },
  },
];
