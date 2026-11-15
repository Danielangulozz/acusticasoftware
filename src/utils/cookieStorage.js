/**
 * Utilidad de persistencia en Cookies del navegador para POZOLE Suite.
 *
 * Guarda y restaura la selección de materiales de superficie del usuario (`materials`),
 * el polígono/dimensiones básicas del recinto y las preferencias del Estudio de Renders
 * en cookies reales (`document.cookie`) con expiración de 365 días.
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año en segundos
const MATERIALS_COOKIE = 'pozole_user_materials_v3';
const RENDER_OPTS_COOKIE = 'pozole_render_opts_v3';
const memoryCookies = new Map();

export function setCookieJSON(name, value, maxAgeSeconds = COOKIE_MAX_AGE) {
  try {
    const serialized = encodeURIComponent(JSON.stringify(value));
    memoryCookies.set(name, serialized);
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=${serialized}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
    }
    return true;
  } catch (err) {
    console.warn(`No se pudo guardar la cookie ${name}:`, err);
    return false;
  }
}

export function getCookieJSON(name) {
  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const prefix = `${name}=`;
      const parts = document.cookie.split(';');
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith(prefix)) {
          const raw = decodeURIComponent(part.substring(prefix.length));
          return JSON.parse(raw);
        }
      }
    }
    if (memoryCookies.has(name)) {
      return JSON.parse(decodeURIComponent(memoryCookies.get(name)));
    }
    return null;
  } catch (err) {
    console.warn(`No se pudo leer la cookie ${name}:`, err);
    return null;
  }
}

/**
 * Compacta el objeto `materials` para que quepa holgadamente dentro del límite de 4 KB de una cookie HTTP,
 * preservando el `materialId`, nombre personalizado, coeficientes editados y `subElements` (puertas, ventanas, etc.)
 * de cada superficie (`ceiling`, `floor`, `wall_0..N`).
 */
export function saveMaterialsToCookie(materials) {
  if (!materials || typeof materials !== 'object') return false;
  const compact = {};
  Object.entries(materials).forEach(([surfaceKey, cfg]) => {
    if (!cfg || typeof cfg !== 'object') return;
    const entry = {
      m: cfg.materialId || 'plaster_gypsum_smooth',
    };
    if (cfg.customName) entry.n = cfg.customName;
    if (cfg.isCustom && cfg.coefficients) entry.c = cfg.coefficients;
    if (Array.isArray(cfg.subElements) && cfg.subElements.length > 0) {
      entry.s = cfg.subElements.map((sub) => ({
        id: sub.id,
        m: sub.materialId,
        a: Number(sub.area) || 0,
        n: sub.customName || undefined,
      }));
    }
    compact[surfaceKey] = entry;
  });
  return setCookieJSON(MATERIALS_COOKIE, compact);
}

/**
 * Restaura el objeto `materials` desde la cookie `pozole_user_materials_v3` y reconstruye sus coeficientes
 * a partir del catálogo base si no fueron personalizados.
 */
export function loadMaterialsFromCookie(defaultDatabase = []) {
  const compact = getCookieJSON(MATERIALS_COOKIE);
  if (!compact || typeof compact !== 'object') return null;

  const byId = {};
  (Array.isArray(defaultDatabase) ? defaultDatabase : []).forEach((item) => {
    byId[item.id] = item;
  });

  const restored = {};
  Object.entries(compact).forEach(([surfaceKey, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const matId = entry.m || 'plaster_gypsum_smooth';
    const dbMat = byId[matId];
    restored[surfaceKey] = {
      materialId: matId,
      customName: entry.n || dbMat?.name || matId,
      isCustom: Boolean(entry.c),
      coefficients: entry.c || (dbMat?.coefficients ? { ...dbMat.coefficients } : { 125: 0.02, 250: 0.02, 500: 0.03, 1000: 0.04, 2000: 0.04, 4000: 0.05 }),
      subElements: Array.isArray(entry.s)
        ? entry.s.map((sub, idx) => {
            const subDb = byId[sub.m];
            return {
              id: sub.id || `sub_${idx}_${Date.now()}`,
              materialId: sub.m,
              area: Number(sub.a) || 1.5,
              customName: sub.n || subDb?.name || sub.m,
              coefficients: subDb?.coefficients
                ? { ...subDb.coefficients }
                : { 125: 0.1, 250: 0.1, 500: 0.1, 1000: 0.1, 2000: 0.1, 4000: 0.1 },
            };
          })
        : [],
    };
  });

  return Object.keys(restored).length > 0 ? restored : null;
}

export function saveRenderOptsToCookie(opts) {
  if (!opts || typeof opts !== 'object') return;
  const slim = {
    mode: opts.mode,
    perfMode: opts.perfMode,
    usePolygon: opts.usePolygon,
    syncSurfaceMaterials: opts.syncSurfaceMaterials,
    cutMode: opts.cutMode,
    roomType: opts.roomType,
    dims: opts.dims,
    palette: opts.palette,
    night: opts.night,
    background: opts.background,
  };
  setCookieJSON(RENDER_OPTS_COOKIE, slim);
}

export function loadRenderOptsFromCookie() {
  return getCookieJSON(RENDER_OPTS_COOKIE);
}
