/**
 * ==============================================================================
 * GEOMETRÍA DEL EDITOR DE PLANTA (tipo CAD 2D)
 * ==============================================================================
 * Funciones puras usadas por RoomSketcher para trazar muros, líneas auxiliares,
 * imanes (OSNAP), modo ortogonal, entrada numérica dinámica y validación.
 *
 * Convención de coordenadas: las coordenadas "mundo" son las mismas que muestra
 * la cuadrícula del editor (X hacia la derecha, Y crece hacia ABAJO en pantalla).
 * Los ÁNGULOS se expresan como se perciben en pantalla: 0° = derecha, 90° = arriba.
 */

const EPS = 1e-9;

export const round2 = (v) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};
export const roundTo = (v, step) => {
  const r = Math.round(v / step) * step;
  return Object.is(r, -0) ? 0 : r;
};
export const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
export const samePoint = (a, b, tol = 1e-6) => dist(a, b) <= tol;
export const cleanPoint = (p) => ({ x: round2(p.x), y: round2(p.y) });

/** Ángulo en grados (0..360) tal como se ve en pantalla: 0° derecha, 90° arriba. */
export function screenAngleDeg(from, to) {
  const deg = (Math.atan2(-(to.y - from.y), to.x - from.x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Punto a una distancia y ángulo (convención de pantalla) desde `from`. */
export function polarPoint(from, length, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: from.x + length * Math.cos(rad), y: from.y - length * Math.sin(rad) };
}

/** Modo ortogonal: fuerza el tramo a horizontal o vertical respecto a `from`. */
export function applyOrtho(from, to) {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return dx >= dy ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
}

/** Proyección de P sobre el segmento AB (punto más cercano) y parámetro t. */
export function projectOnSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS) return { point: { ...a }, t: 0 };
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  return { point: { x: a.x + t * dx, y: a.y + t * dy }, t };
}

const NUM = '(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
const RE_LENGTH = new RegExp(`^${NUM}$`);
const RE_POLAR = new RegExp(`^${NUM}<${NUM}$`);
const RE_REL = new RegExp(`^@${NUM},${NUM}$`);
const RE_PAIR = new RegExp(`^${NUM},${NUM}$`);

/**
 * Interpreta lo que el usuario escribe mientras dibuja (entrada dinámica).
 *
 * Modo 'point' (muros, auxiliares, medir):
 *   "5"      → 5 m en la dirección actual del cursor
 *   "5<90"   → 5 m con ángulo de 90° (0° derecha, 90° arriba)
 *   "@3,2"   → desplazamiento relativo (dx, dy) en coordenadas de la cuadrícula
 *   "4,6"    → punto absoluto (x, y)
 * Modo 'rect' (rectángulo):
 *   "8,5"    → rectángulo de 8 m × 5 m hacia el lado donde está el cursor
 *
 * @returns {{ point: {x:number,y:number} } | { error: string }}
 */
export function parseDynamicInput(raw, { from, cursor, mode = 'point' }) {
  const s = String(raw || '').replace(/\s+/g, '');
  if (!s) return { error: 'Entrada vacía' };
  if (!from) return { error: 'Primero marca un punto de inicio' };

  let m;
  if (mode === 'rect' && (m = s.match(RE_PAIR))) {
    const w = Math.abs(parseFloat(m[1]));
    const h = Math.abs(parseFloat(m[2]));
    if (w <= 0 || h <= 0) return { error: 'Ancho y alto deben ser mayores que 0' };
    const sx = cursor && cursor.x < from.x ? -1 : 1;
    const sy = cursor && cursor.y < from.y ? -1 : 1;
    return { point: { x: from.x + sx * w, y: from.y + sy * h } };
  }

  if ((m = s.match(RE_LENGTH))) {
    const len = parseFloat(m[1]);
    if (!(len > 0)) return { error: 'La longitud debe ser mayor que 0' };
    const hasDir = cursor && dist(from, cursor) > 1e-6;
    const angle = hasDir ? screenAngleDeg(from, cursor) : 0;
    return { point: polarPoint(from, len, angle) };
  }

  if ((m = s.match(RE_POLAR))) {
    const len = parseFloat(m[1]);
    const ang = parseFloat(m[2]);
    if (!(len > 0)) return { error: 'La longitud debe ser mayor que 0' };
    return { point: polarPoint(from, len, ang) };
  }

  if ((m = s.match(RE_REL))) {
    const dx = parseFloat(m[1]);
    const dy = parseFloat(m[2]);
    if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return { error: 'El desplazamiento no puede ser 0,0' };
    return { point: { x: from.x + dx, y: from.y + dy } };
  }

  if ((m = s.match(RE_PAIR))) {
    return { point: { x: parseFloat(m[1]), y: parseFloat(m[2]) } };
  }

  return { error: `No entiendo "${s}". Usa 5 · 5<90 · @3,2 · 4,6` };
}

function orient(a, b, c) {
  const v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (Math.abs(v) < 1e-9) return 0;
  return v > 0 ? 1 : -1;
}

function onSegment(a, b, p) {
  return (
    Math.min(a.x, b.x) - 1e-9 <= p.x && p.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= p.y && p.y <= Math.max(a.y, b.y) + 1e-9
  );
}

/** ¿Se tocan o cruzan los segmentos AB y CD? (incluye solapes colineales). */
export function segmentsIntersect(a, b, c, d) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return false;
}

/** ¿El polígono cerrado tiene paredes que se cruzan (o de longitud cero)? */
export function polygonSelfIntersects(vertices) {
  const n = vertices?.length || 0;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    if (samePoint(vertices[i], vertices[(i + 1) % n])) return true;
  }
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Saltar aristas contiguas (comparten vértice)
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsIntersect(a, b, vertices[j], vertices[(j + 1) % n])) return true;
    }
  }
  return false;
}

/**
 * ¿Agregar el tramo (último punto → candidate) cruzaría la polilínea abierta?
 * Si `closing` es true, el candidato es el primer punto (cierre del recinto).
 */
export function segmentCrossesPolyline(points, candidate, closing = false) {
  const n = points.length;
  if (n < 2) return false;
  const last = points[n - 1];
  if (samePoint(last, candidate)) return true;
  // Tramos existentes: (p0,p1), (p1,p2) ... (p[n-2], p[n-1])
  for (let i = 0; i < n - 2; i++) {
    // Al cerrar, el primer tramo comparte el punto inicial con el nuevo tramo
    if (closing && i === 0) continue;
    if (segmentsIntersect(points[i], points[i + 1], last, candidate)) return true;
  }
  if (!closing) {
    // El nuevo tramo no puede volver a tocar un punto ya usado (salvo cierre explícito)
    for (let i = 0; i < n - 1; i++) {
      if (samePoint(points[i], candidate)) return true;
    }
  }
  return false;
}

/** Punto dentro del polígono (ray casting). */
export function pointInPolygon(p, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const vi = vertices[i];
    const vj = vertices[j];
    const intersect =
      vi.y > p.y !== vj.y > p.y &&
      p.x < ((vj.x - vi.x) * (p.y - vi.y)) / (vj.y - vi.y + 1e-12) + vi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Imanes (OSNAP). Devuelve el punto "imantado" más relevante cerca del cursor.
 * Prioridad: extremo > punto medio > perpendicular > cuadrícula.
 *
 * @param {{x,y}} cursor   Posición del cursor en mundo
 * @param {object} opts
 *   endpoints: puntos (vértices, extremos de guías, puntos ya trazados)
 *   segments:  [{a,b}] para punto medio y perpendicular
 *   from:      último punto trazado (para perpendicular)
 *   tolerance: radio de captura en metros
 *   gridStep:  paso de cuadrícula (null = sin cuadrícula)
 * @returns {{ point:{x,y}, type:'endpoint'|'midpoint'|'perpendicular'|'grid'|'none' }}
 */
export function findSnap(cursor, { endpoints = [], segments = [], from = null, tolerance = 0.3, gridStep = null } = {}) {
  let best = null;
  const consider = (point, type, rank) => {
    const d = dist(cursor, point);
    if (d > tolerance) return;
    if (!best || rank < best.rank || (rank === best.rank && d < best.d)) {
      best = { point, type, rank, d };
    }
  };

  endpoints.forEach((p) => consider(p, 'endpoint', 0));
  segments.forEach(({ a, b }) => consider({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 'midpoint', 1));
  if (from) {
    segments.forEach(({ a, b }) => {
      const { point, t } = projectOnSegment(from, a, b);
      if (t > 0.001 && t < 0.999 && dist(from, point) > 1e-6) consider(point, 'perpendicular', 2);
    });
  }

  if (best) return { point: best.point, type: best.type };
  if (gridStep) {
    return { point: { x: roundTo(cursor.x, gridStep), y: roundTo(cursor.y, gridStep) }, type: 'grid' };
  }
  return { point: { ...cursor }, type: 'none' };
}

/** Vértices de un rectángulo a partir de dos esquinas opuestas (mismo orden que el preset). */
export function rectangleFromCorners(a, b) {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ].map(cleanPoint);
}

/**
 * Proyecta un clic exacto sobre un segmento y devuelve el nuevo vértice clamped
 * garantizando una distancia mínima a los extremos para no generar vértices espurios.
 */
export function splitSegmentAtPoint(v1, v2, clickPoint, minMargin = 0.2) {
  const { t } = projectOnSegment(clickPoint, v1, v2);
  const totalLen = dist(v1, v2);
  if (totalLen <= minMargin * 2) {
    return cleanPoint({ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 });
  }
  const marginRatio = minMargin / totalLen;
  const clampedT = Math.max(marginRatio, Math.min(1 - marginRatio, t));
  return cleanPoint({
    x: v1.x + clampedT * (v2.x - v1.x),
    y: v1.y + clampedT * (v2.y - v1.y),
  });
}

/**
 * Desplaza una pared completa en paralelo aplicando un delta a ambos vértices contiguos.
 */
export function moveEdgeParallel(vertices, edgeIdx, delta) {
  const n = vertices.length;
  const i = edgeIdx;
  const j = (edgeIdx + 1) % n;
  return vertices.map((v, idx) => {
    if (idx === i || idx === j) {
      return cleanPoint({ x: v.x + delta.x, y: v.y + delta.y });
    }
    return { ...v };
  });
}

/**
 * Rota un polígono completo alrededor de un centro especificado (o su centroide).
 */
export function rotatePolygon(vertices, angleDeg, center) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = center ? center.x : vertices.reduce((s, v) => s + v.x, 0) / (vertices.length || 1);
  const cy = center ? center.y : vertices.reduce((s, v) => s + v.y, 0) / (vertices.length || 1);

  return vertices.map((v) => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    return cleanPoint({
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    });
  });
}

/**
 * Desplaza (nudge) un vértice seleccionado con flechas del teclado.
 */
export function nudgeVertex(vertices, idx, direction, step = 0.1) {
  if (idx < 0 || idx >= vertices.length) return vertices;
  const deltas = {
    up: { x: 0, y: -step },
    down: { x: 0, y: step },
    left: { x: -step, y: 0 },
    right: { x: step, y: 0 },
  };
  const d = deltas[direction] || { x: 0, y: 0 };
  return vertices.map((v, i) => (i === idx ? cleanPoint({ x: v.x + d.x, y: v.y + d.y }) : { ...v }));
}

/**
 * Devuelve el vector normal perpendicular a la arista (v1 -> v2) de magnitud `distance`.
 * En coordenadas de pantalla: vector perpendicular hacia la "derecha" del segmento.
 */
export function getEdgeNormal(v1, v2, distance = 0.2) {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const len = Math.hypot(dx, dy);
  if (len < EPS) return { x: 0, y: 0 };
  return cleanPoint({
    x: (-dy / len) * distance,
    y: (dx / len) * distance,
  });
}

/**
 * Traslada el polígono para que su esquina mínima (bounding box) quede exactamente en (0, 0).
 */
export function centerPolygonAtOrigin(vertices) {
  if (!vertices || vertices.length === 0) return [];
  const minX = Math.min(...vertices.map((v) => v.x));
  const minY = Math.min(...vertices.map((v) => v.y));
  return vertices.map((v) => cleanPoint({ x: v.x - minX, y: v.y - minY }));
}


