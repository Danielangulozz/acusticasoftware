import { describe, it, expect } from 'vitest';
import {
  boltDimensionsFromVolume,
  isInsideBoltZoneA,
  detectSimpleRatios,
  normalizeDimensionsToBolt,
} from '../proportions.js';

describe('Proporciones de Salas y Criterio de Bolt (proportions.js)', () => {
  it('calcula dimensiones óptimas de Bolt para V = 27 m³ en sala pequeña (1 : 1.404 : 1.863)', () => {
    // V = 27 m3 -> H ≈ 2.18, W ≈ 3.06, L ≈ 4.06
    const res = boltDimensionsFromVolume(27, 'small');
    expect(res.H).toBeCloseTo(2.18, 1);
    expect(res.W).toBeCloseTo(3.06, 1);
    expect(res.L).toBeCloseTo(4.06, 1);
    expect(res.volume).toBeCloseTo(27.0, 0);
  });

  it('determina si un punto (p, q) está dentro o fuera de la Zona A de Bolt', () => {
    // El punto de la sala pequeña de Bolt (1.404, 1.863) está dentro de la Zona A
    expect(isInsideBoltZoneA(1.404, 1.863)).toBe(true);

    // Un cubo p=1, q=1 está claramente fuera
    expect(isInsideBoltZoneA(1.0, 1.0)).toBe(false);

    // Un pasillo desproporcionado p=1.2, q=5.0 está fuera
    expect(isInsideBoltZoneA(1.2, 5.0)).toBe(false);
  });

  it('detecta salas cúbicas e idénticas en detectSimpleRatios', () => {
    const cube = detectSimpleRatios(3, 3, 3);
    expect(cube.isCube).toBe(true);
    expect(cube.hasIssues).toBe(true);
    expect(cube.issues.some(i => i.type === 'CUBE')).toBe(true);

    const squareFloor = detectSimpleRatios(4, 4, 2.5);
    expect(squareFloor.isCube).toBe(false);
    expect(squareFloor.hasTwoEqual).toBe(true);
    expect(squareFloor.issues.some(i => i.type === 'SQUARE_FLOOR')).toBe(true);
  });

  it('detecta razones armónicas y enteras como 1:2 o 1:3', () => {
    const ratio1to2 = detectSimpleRatios(3, 6, 2.5);
    expect(ratio1to2.issues.some(i => i.type === 'INTEGER_RATIO')).toBe(true);
  });

  it('normaliza dimensiones ordenándolas con H = 1', () => {
    const norm = normalizeDimensionsToBolt(4, 2, 3);
    // dims ordenadas: [2, 3, 4] -> H=2, p = 3/2 = 1.5, q = 4/2 = 2.0
    expect(norm.h).toBe(1.0);
    expect(norm.p).toBe(1.5);
    expect(norm.q).toBe(2.0);
  });
});
