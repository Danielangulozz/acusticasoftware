import { designDiffuser } from '../../utils/diffuserCalculations';

/**
 * Configuración del módulo de difusores (lo que el usuario mueve en pantalla) y su paso al
 * diseño calculado. Se guarda en el navegador para que el Estudio de renders pueda dibujar
 * «mi difusor» con las mismas medidas.
 */
const STORAGE_KEY = 'pozole_diffuser_cfg_v1';

export const DIFFUSER_DEFAULTS = {
  type: 'qrd',
  f0: 500,
  fMax: 2000,
  c: 343,
  Tmm: 5,
  lobeOrder: 2,
  periods: 1,
  primeOverride: 0,
  g: 0,
  mlsOrder: 4,
  panelHeight: 60,
  poly: { radius: 1.2, chord: 0.6, count: 4 },
};

export const DIFFUSER_TYPE_LABELS = { qrd: 'QRD 1D', qrd2d: 'QRD 2D (skyline)', prd: 'PRD', mls: 'MLS', poly: 'Policilíndrico' };

/** Diseño completo (secuencia, profundidades, anchos…) a partir de la configuración de pantalla. */
export function designFromConfig(cfg) {
  return designDiffuser({
    type: cfg.type,
    f0: cfg.f0,
    fMax: Math.max(cfg.fMax, cfg.f0 * 1.2),
    c: cfg.c,
    T: cfg.Tmm / 1000,
    lobeOrder: cfg.lobeOrder,
    periods: cfg.periods,
    primeOverride: cfg.primeOverride || undefined,
    g: cfg.g || undefined,
    mlsOrder: cfg.mlsOrder,
    panelHeight: cfg.panelHeight / 100,
    poly: cfg.poly,
  });
}

export function loadDiffuserConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DIFFUSER_DEFAULTS;
    const saved = JSON.parse(raw);
    return { ...DIFFUSER_DEFAULTS, ...saved, poly: { ...DIFFUSER_DEFAULTS.poly, ...saved.poly } };
  } catch {
    return DIFFUSER_DEFAULTS;
  }
}

export function saveDiffuserConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* almacenamiento no disponible */
  }
}
