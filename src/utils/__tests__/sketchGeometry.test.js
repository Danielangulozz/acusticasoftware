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
  round2,
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
});

