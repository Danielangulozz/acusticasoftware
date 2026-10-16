import { describe, it, expect } from 'vitest';
import {
  screenAngleDeg,
  polarPoint,
  applyOrtho,
  projectOnSegment,
  parseDynamicInput,
  segmentsIntersect,
  polygonSelfIntersects,
  segmentCrossesPolyline,
  findSnap,
  rectangleFromCorners,
  splitSegmentAtPoint,
  moveEdgeParallel,
  rotatePolygon,
  nudgeVertex,
  getEdgeNormal,
  centerPolygonAtOrigin,
  findSmartStrokeSnap,
  getAdaptiveGridStep,
  round2,
  pointInPolygon,
  findSafeInteriorPoint,
} from '../sketchGeometry';

describe('sketchGeometry utils', () => {
  describe('screenAngleDeg and polarPoint', () => {
    it('calculates screen angle correctly (0° right, 90° up)', () => {
      const from = { x: 0, y: 0 };
      expect(screenAngleDeg(from, { x: 5, y: 0 })).toBe(0);
      expect(screenAngleDeg(from, { x: 0, y: -5 })).toBe(90); // Y decreases upwards in screen
      expect(screenAngleDeg(from, { x: -5, y: 0 })).toBe(180);
      expect(screenAngleDeg(from, { x: 0, y: 5 })).toBe(270);
    });

    it('creates polar point accurately', () => {
      const from = { x: 2, y: 2 };
      const pRight = polarPoint(from, 5, 0);
      expect(round2(pRight.x)).toBe(7);
      expect(round2(pRight.y)).toBe(2);

      const pUp = polarPoint(from, 5, 90);
      expect(round2(pUp.x)).toBe(2);
      expect(round2(pUp.y)).toBe(-3);
    });
  });

  describe('applyOrtho', () => {
    it('locks to horizontal when dx >= dy', () => {
      const from = { x: 0, y: 0 };
      const to = { x: 5, y: 2 };
      const ortho = applyOrtho(from, to);
      expect(ortho).toEqual({ x: 5, y: 0 });
    });

    it('locks to vertical when dy > dx', () => {
      const from = { x: 0, y: 0 };
      const to = { x: 2, y: 6 };
      const ortho = applyOrtho(from, to);
      expect(ortho).toEqual({ x: 0, y: 6 });
    });
  });

  describe('parseDynamicInput', () => {
    const from = { x: 1, y: 1 };

    it('parses distance in cursor direction', () => {
      const cursor = { x: 10, y: 1 };
      const res = parseDynamicInput('5', { from, cursor });
      expect(res.error).toBeUndefined();
      expect(round2(res.point.x)).toBe(6);
      expect(round2(res.point.y)).toBe(1);
    });

    it('parses polar coordinates (dist < angle)', () => {
      const res = parseDynamicInput('4<90', { from, cursor: null });
      expect(res.error).toBeUndefined();
      expect(round2(res.point.x)).toBe(1);
      expect(round2(res.point.y)).toBe(-3);
    });

    it('parses relative displacement @dx,dy', () => {
      const res = parseDynamicInput('@3,2', { from, cursor: null });
      expect(res.error).toBeUndefined();
      expect(round2(res.point.x)).toBe(4);
      expect(round2(res.point.y)).toBe(3);
    });

    it('parses absolute coordinate pair x,y', () => {
      const res = parseDynamicInput('8,5', { from, cursor: null, mode: 'point' });
      expect(res.error).toBeUndefined();
      expect(res.point).toEqual({ x: 8, y: 5 });
    });

    it('parses rectangle dimensions in rect mode', () => {
      const cursor = { x: 10, y: 8 };
      const res = parseDynamicInput('6,4', { from, cursor, mode: 'rect' });
      expect(res.error).toBeUndefined();
      expect(res.point).toEqual({ x: 7, y: 5 });
    });

    it('returns friendly error for invalid input', () => {
      const res = parseDynamicInput('invalid', { from });
      expect(res.error).toBeDefined();
    });
  });

  describe('segmentsIntersect and self-intersection validation', () => {
    it('detects intersecting cross segments', () => {
      const a = { x: 0, y: 0 }, b = { x: 4, y: 4 };
      const c = { x: 0, y: 4 }, d = { x: 4, y: 0 };
      expect(segmentsIntersect(a, b, c, d)).toBe(true);
    });

    it('detects parallel non-intersecting segments', () => {
      const a = { x: 0, y: 0 }, b = { x: 4, y: 0 };
      const c = { x: 0, y: 2 }, d = { x: 4, y: 2 };
      expect(segmentsIntersect(a, b, c, d)).toBe(false);
    });

    it('verifies valid polygon does not self-intersect', () => {
      const rect = [
        { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 4 }
      ];
      expect(polygonSelfIntersects(rect)).toBe(false);
    });

    it('detects self-intersecting polygon (bowtie / figure 8)', () => {
      const bowtie = [
        { x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 4, y: 0 }
      ];
      expect(polygonSelfIntersects(bowtie)).toBe(true);
    });

    it('checks if a segment crosses existing polyline', () => {
      const polyline = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
      ];
      // Candidate crosses first wall (x=0 to x=5 at y=0)
      const badCandidate = { x: 2, y: -2 };
      expect(segmentCrossesPolyline(polyline, badCandidate)).toBe(true);

      // Candidate goes cleanly to { x: 0, y: 5 }
      const goodCandidate = { x: 0, y: 5 };
      expect(segmentCrossesPolyline(polyline, goodCandidate)).toBe(false);
    });
  });

  describe('findSnap', () => {
    const endpoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const segments = [{ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }];

    it('snaps to nearest endpoint within tolerance', () => {
      const snap = findSnap({ x: 0.1, y: 0.1 }, { endpoints, segments, tolerance: 0.3 });
      expect(snap.type).toBe('endpoint');
      expect(snap.point).toEqual({ x: 0, y: 0 });
    });

    it('snaps to midpoint when closer to middle of segment', () => {
      const snap = findSnap({ x: 5.1, y: 0.1 }, { endpoints, segments, tolerance: 0.3 });
      expect(snap.type).toBe('midpoint');
      expect(snap.point).toEqual({ x: 5, y: 0 });
    });

    it('snaps to grid when no geometry snap is in range', () => {
      const snap = findSnap({ x: 2.37, y: 4.82 }, { endpoints, segments, tolerance: 0.3, gridStep: 0.5 });
      expect(snap.type).toBe('grid');
      expect(snap.point).toEqual({ x: 2.5, y: 5.0 });
    });
  });

  describe('rectangleFromCorners', () => {
    it('produces 4 vertices from 2 diagonal corners', () => {
      const p1 = { x: 2, y: 1 };
      const p2 = { x: 8, y: 5 };
      const rect = rectangleFromCorners(p1, p2);
      expect(rect).toHaveLength(4);
      expect(rect[0]).toEqual({ x: 2, y: 1 });
      expect(rect[1]).toEqual({ x: 8, y: 1 });
      expect(rect[2]).toEqual({ x: 8, y: 5 });
      expect(rect[3]).toEqual({ x: 2, y: 5 });
    });
  });

  describe('Phase 2 Advanced CAD Geometry Helpers', () => {
    it('splits segment at exact clicked location with safety margin', () => {
      const v1 = { x: 0, y: 0 };
      const v2 = { x: 10, y: 0 };
      const clickPt = { x: 3.42, y: 0.1 };
      const splitPt = splitSegmentAtPoint(v1, v2, clickPt, 0.2);
      expect(splitPt.x).toBe(3.42);
      expect(splitPt.y).toBe(0);

      // Clamping near start point
      const nearStart = { x: 0.05, y: 0 };
      const clampedStart = splitSegmentAtPoint(v1, v2, nearStart, 0.2);
      expect(clampedStart.x).toBe(0.2);
    });

    it('moves an edge parallel by a given delta vector', () => {
      const rect = [
        { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 4 }
      ];
      // Mover la pared superior (V1->V2) 1 metro hacia abajo (+1 en Y)
      const moved = moveEdgeParallel(rect, 0, { x: 0, y: 1 });
      expect(moved[0]).toEqual({ x: 0, y: 1 });
      expect(moved[1]).toEqual({ x: 6, y: 1 });
      expect(moved[2]).toEqual({ x: 6, y: 4 });
      expect(moved[3]).toEqual({ x: 0, y: 4 });
    });

    it('rotates a polygon by 90 degrees around center', () => {
      const rect = [
        { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 2 }
      ];
      const rotated = rotatePolygon(rect, 90, { x: 2, y: 1 });
      expect(rotated).toHaveLength(4);
      // Tras rotar 90°, el ancho de 4 pasa a ser altura y viceversa
      const w = Math.hypot(rotated[1].x - rotated[0].x, rotated[1].y - rotated[0].y);
      expect(round2(w)).toBe(4);
    });

    it('nudges a vertex accurately in 4 directions', () => {
      const verts = [{ x: 5, y: 5 }];
      expect(nudgeVertex(verts, 0, 'up', 0.1)[0]).toEqual({ x: 5, y: 4.9 });
      expect(nudgeVertex(verts, 0, 'down', 0.1)[0]).toEqual({ x: 5, y: 5.1 });
      expect(nudgeVertex(verts, 0, 'left', 0.1)[0]).toEqual({ x: 4.9, y: 5 });
      expect(nudgeVertex(verts, 0, 'right', 0.1)[0]).toEqual({ x: 5.1, y: 5 });
    });

    it('calculates edge normal vector accurately', () => {
      const v1 = { x: 0, y: 0 };
      const v2 = { x: 10, y: 0 };
      const normal = getEdgeNormal(v1, v2, 0.5);
      expect(normal.x).toBe(0);
      expect(normal.y).toBe(0.5);
    });

    it('centers polygon bounding box at (0, 0)', () => {
      const offsetPoly = [
        { x: 5, y: 8 }, { x: 9, y: 8 }, { x: 9, y: 12 }, { x: 5, y: 12 }
      ];
      const centered = centerPolygonAtOrigin(offsetPoly);
      expect(centered[0]).toEqual({ x: 0, y: 0 });
      expect(centered[1]).toEqual({ x: 4, y: 0 });
      expect(centered[2]).toEqual({ x: 4, y: 4 });
      expect(centered[3]).toEqual({ x: 0, y: 4 });
    });
  });

  describe('findSmartStrokeSnap (Seguir lo recto del trazo sin saltar a esquinas de cuadrante)', () => {
    const from = { x: 3.4, y: 5.5 };

    it('engancha trazo vertical hacia arriba manteniendo X exactamente recto', () => {
      // El cursor se mueve hacia arriba (Y menor en pantalla) con una leve desviación en X
      const cursor = { x: 3.46, y: 2.1 };
      const res = findSmartStrokeSnap(cursor, from, { gridStep: 0.5 });
      expect(res).not.toBeNull();
      expect(res.isStraight).toBe(true);
      expect(res.axis).toBe('v');
      // Debe mantener X exactamente en from.x (3.4), no desviarse a la esquina de cuadrícula 3.5
      expect(res.point.x).toBe(3.4);
      // La coordenada Y debe avanzar limpiamente
      expect(res.point.y).toBeLessThan(from.y);
      expect(res.angle).toBe(90);
    });

    it('engancha trazo horizontal hacia la derecha manteniendo Y exactamente recto', () => {
      const cursor = { x: 8.2, y: 5.56 };
      const res = findSmartStrokeSnap(cursor, from, { gridStep: 0.5 });
      expect(res).not.toBeNull();
      expect(res.isStraight).toBe(true);
      expect(res.axis).toBe('h');
      // Debe mantener Y exactamente en from.y (5.5)
      expect(res.point.y).toBe(5.5);
      expect(res.point.x).toBeGreaterThan(from.x);
      expect(res.angle).toBe(0);
    });

    it('alinea con el eje X de un vértice de referencia existente (Smart Alignment)', () => {
      const p1 = { x: 0, y: 0 };
      const fromPt = { x: 6, y: 4 };
      // El cursor se mueve horizontalmente hacia la izquierda y se acerca a la vertical de p1
      const cursor = { x: 0.12, y: 4.04 };
      const res = findSmartStrokeSnap(cursor, fromPt, {
        referencePoints: [p1],
        gridStep: 0.5,
        alignTolerance: 0.35,
      });
      expect(res).not.toBeNull();
      expect(res.type).toBe('aligned-x');
      expect(res.point.x).toBe(0);
      expect(res.point.y).toBe(4);
    });

    it('engancha a 90° perpendicular relativo de la pared anterior (tomar direccion del trazo)', () => {
      // Supongamos un muro previo inclinado de P0 a P1 con vector a 45°
      // P0 = (0, 0), P1 = (2, -2) -> en pantalla screenAngleDeg es 45°
      const p0 = { x: 0, y: 0 };
      const fromPt = { x: 2, y: -2 };
      // La perpendicular a 45° es 45° + 90° = 135° (arriba a la izquierda)
      // Situamos el cursor cerca de 135°
      const cursor = { x: 0.65, y: -3.45 };
      const res = findSmartStrokeSnap(cursor, fromPt, {
        previousPoint: p0,
        gridStep: 0.10,
        angleToleranceDeg: 9.5,
      });
      expect(res).not.toBeNull();
      expect(res.isStraight).toBe(true);
      expect(res.axis).toBe('relative-perp');
      expect(res.type).toBe('perp-prev');
      expect(res.angle).toBe(135);
    });

    it('engancha a extensión colineal relativa (0°) de la pared anterior', () => {
      const p0 = { x: 0, y: 0 };
      const fromPt = { x: 3, y: -3 }; // 45°
      // Cursor continuando en la misma dirección a 45°
      const cursor = { x: 5.8, y: -5.9 };
      const res = findSmartStrokeSnap(cursor, fromPt, {
        previousPoint: p0,
        gridStep: 0.10,
        angleToleranceDeg: 9.5,
      });
      expect(res).not.toBeNull();
      expect(res.isStraight).toBe(true);
      expect(res.axis).toBe('relative-parallel');
      expect(res.type).toBe('parallel-prev');
      expect(res.angle).toBe(45);
    });
  });

  describe('getAdaptiveGridStep (resolución adaptativa según zoom)', () => {
    it('retorna resolución quirúrgica de 2 cm (0.02m) en zoom muy cercano (>= 3.5)', () => {
      expect(getAdaptiveGridStep(4.0)).toBe(0.02);
      expect(getAdaptiveGridStep(3.5)).toBe(0.02);
    });

    it('retorna 5 cm (0.05m) en zoom >= 2.2', () => {
      expect(getAdaptiveGridStep(2.5)).toBe(0.05);
      expect(getAdaptiveGridStep(2.2)).toBe(0.05);
    });

    it('retorna 10 cm (0.10m) en zoom >= 1.5', () => {
      expect(getAdaptiveGridStep(1.8)).toBe(0.10);
      expect(getAdaptiveGridStep(1.5)).toBe(0.10);
    });

    it('retorna 20 cm (0.20m) en zoom >= 1.1', () => {
      expect(getAdaptiveGridStep(1.2)).toBe(0.20);
    });

    it('retorna 50 cm (0.50m) en zoom estándar (0.7 a 1.0)', () => {
      expect(getAdaptiveGridStep(1.0)).toBe(0.50);
      expect(getAdaptiveGridStep(0.8)).toBe(0.50);
    });

    it('retorna 1.00m en zoom alejado (< 0.7)', () => {
      expect(getAdaptiveGridStep(0.5)).toBe(1.00);
      expect(getAdaptiveGridStep(0.25)).toBe(1.00);
    });
  });

  describe('findSafeInteriorPoint', () => {
    it('retorna el punto preferido si ya se encuentra dentro del polígono', () => {
      const rect = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 6 }, { x: 0, y: 6 }];
      const pref = { x: 3, y: 3, z: 1.5 };
      const safe = findSafeInteriorPoint(rect, pref);
      expect(safe.x).toBe(3);
      expect(safe.y).toBe(3);
      expect(safe.z).toBe(1.5);
    });

    it('ubica un punto interior seguro en un polígono en forma de L si el centroide o punto previo está fuera', () => {
      // Forma L donde (4, 4) está en el hueco recortado exterior
      const lShape = [
        { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 2 },
        { x: 2, y: 2 }, { x: 2, y: 6 }, { x: 0, y: 6 }
      ];
      const outsidePoint = { x: 4, y: 4, z: 1.5 };
      expect(pointInPolygon(outsidePoint, lShape)).toBe(false);

      const safe = findSafeInteriorPoint(lShape, outsidePoint);
      expect(pointInPolygon(safe, lShape)).toBe(true);
      expect(safe.z).toBe(1.5);
    });

    it('garantiza que el punto generado en una sala irregular de 12 paredes siempre esté dentro', () => {
      const irregular12 = [
        { x: -0.5, y: 5.5 },
        { x: 0.5, y: 2.5 },
        { x: 1.5, y: 2.5 },
        { x: 1.2, y: 0.0 },
        { x: 2.4, y: 0.0 },
        { x: 3.2, y: 2.2 },
        { x: 3.5, y: 2.2 },
        { x: 4.8, y: 2.2 },
        { x: 5.3, y: 2.6 },
        { x: 5.8, y: 2.6 },
        { x: 6.8, y: 5.8 },
        { x: 3.2, y: 6.2 }
      ];
      const safe = findSafeInteriorPoint(irregular12);
      expect(pointInPolygon(safe, irregular12)).toBe(true);
    });
  });
});

