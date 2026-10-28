import { describe, it, expect } from 'vitest';
import {
  nextPrime,
  quadraticResidueSequence,
  quadraticResidue2D,
  primitiveRoots,
  primitiveRootSequence,
  mlsSequence,
  designDiffuser,
  surfaceElements,
  frequencySweep,
  theoreticalScattering,
  diffusionCoefficient,
} from '../diffuserCalculations';

describe('secuencias numéricas (ejemplos de la clase)', () => {
  it('QRD p=17 coincide con la tabla de la diapositiva', () => {
    expect(quadraticResidueSequence(17)).toEqual([0, 1, 4, 9, 16, 8, 2, 15, 13, 13, 15, 2, 8, 16, 9, 4, 1]);
  });

  it('QRD 2D fila m=1 y m=4', () => {
    const s = quadraticResidue2D(17);
    expect(s[1]).toEqual([1, 2, 5, 10, 0, 9, 3, 16, 14, 14, 16, 3, 9, 0, 10, 5, 2]);
    expect(s[4]).toEqual([16, 0, 3, 8, 15, 7, 1, 14, 12, 12, 14, 1, 7, 15, 8, 3, 0]);
  });

  it('PRD g=3, p=7 → 3 2 6 4 5 1', () => {
    expect(primitiveRoots(7)).toContain(3);
    expect(primitiveRootSequence(7, 3)).toEqual([3, 2, 6, 4, 5, 1]);
  });

  it('MLS de orden m tiene longitud 2^m−1 y balance de unos', () => {
    for (const m of [3, 4, 5, 7]) {
      const s = mlsSequence(m);
      expect(s).toHaveLength(2 ** m - 1);
      expect(s.filter(Boolean)).toHaveLength(2 ** (m - 1));
    }
  });

  it('nextPrime sube al siguiente primo', () => {
    expect(nextPrime(16)).toBe(17);
    expect(nextPrime(17)).toBe(17);
  });
});

describe('designDiffuser', () => {
  it('QRD 1D: f0=500, fmax=2000 → p=17, W≈8 cm, ancho total ≈144.5 cm', () => {
    const d = designDiffuser({ type: 'qrd', f0: 500, fMax: 2000, c: 340, T: 0.005, lobeOrder: 2, periods: 1 });
    expect(d.p).toBe(17);
    expect(d.W).toBeCloseTo(0.08, 3);
    expect(d.totalWidth * 100).toBeCloseTo(144.5, 1);
    expect(d.depths[4] * 100).toBeCloseTo(16 * 340 / (2 * 17 * 500) * 100, 6);
  });

  it('QRD 2D: f0=250, fmax=1000 → W=16.5 cm, profundidad unitaria 4 cm', () => {
    const d = designDiffuser({ type: 'qrd2d', f0: 250, fMax: 1000, c: 340, T: 0.005, lobeOrder: 2, periods: 1 });
    expect(d.p).toBe(17);
    expect(d.W).toBeCloseTo(0.165, 3);
    expect(d.depthUnit * 100).toBeCloseTo(4, 6);
    expect(d.maxDepth * 100).toBeCloseTo(64, 6);
  });

  it('PRD: p=7, g=3 → d(s=3) ≈ 14.6 cm', () => {
    const d = designDiffuser({ type: 'prd', f0: 500, fMax: 2000, c: 340, T: 0.005, primeOverride: 7, g: 3 });
    expect(d.sequence).toEqual([3, 2, 6, 4, 5, 1]);
    expect(d.depths[0] * 100).toBeCloseTo(14.57, 1);
  });
});

describe('dispersión', () => {
  it('la superficie plana tiene scattering nulo', () => {
    expect(theoreticalScattering([0, 0, 0], 1000, 343)).toBeCloseTo(0, 9);
  });

  it('respuesta uniforme da d=1; un solo lóbulo da d≈0', () => {
    expect(diffusionCoefficient([1, 1, 1, 1])).toBeCloseTo(1, 9);
    expect(diffusionCoefficient([1, 0, 0, 0])).toBeCloseTo(0, 9);
  });

  it('el QRD difunde más que la placa plana en su banda de diseño', () => {
    const d = designDiffuser({ type: 'qrd', f0: 500, fMax: 2000, c: 343, T: 0.005, periods: 1 });
    const sweep = frequencySweep(d);
    const mid = sweep.filter((b) => b.freq >= 500 && b.freq <= 2000);
    mid.forEach((b) => expect(b.diffusion).toBeGreaterThan(b.flat));
    expect(surfaceElements(d).length).toBe(34);
  });
});
