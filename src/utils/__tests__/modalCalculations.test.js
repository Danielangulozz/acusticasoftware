import { describe, it, expect } from 'vitest';
import {
  modeFrequency,
  classifyMode,
  waveVector,
  computeModes,
  schroederFrequency,
  getBandLimits,
  THIRD_OCTAVE_BANDS,
  countModesByBand,
  findDegenerateModes,
  evaluateBonello,
  getRectangularDims,
  modalDensityN,
  modalDensityDerivative,
  modePressureShape,
  calculateModalDamping,
  generateModeTimeResponse,
  generateSuperposedModesTimeResponse,
} from '../modalCalculations.js';

describe('Cálculos Modales (modalCalculations)', () => {
  it('calcula la frecuencia modal (0,0,1) = 57.5 Hz para sala 3x3x3 m con c = 345 m/s', () => {
    // f = (c / 2) * sqrt((nx/Lx)^2 + (ny/Ly)^2 + (nz/Lz)^2)
    // f = (345 / 2) * (1 / 3) = 172.5 / 3 = 57.5 Hz
    const f = modeFrequency(0, 0, 1, 3, 3, 3, 345);
    expect(f).toBeCloseTo(57.5, 2);
  });

  it('clasifica correctamente modos axiales, tangenciales y oblicuos', () => {
    const axialX = classifyMode(1, 0, 0);
    expect(axialX.type).toBe('axial');
    expect(axialX.axis).toBe('X');

    const axialZ = classifyMode(0, 0, 2);
    expect(axialZ.type).toBe('axial');
    expect(axialZ.axis).toBe('Z');

    const tangentialXY = classifyMode(1, 1, 0);
    expect(tangentialXY.type).toBe('tangential');
    expect(tangentialXY.plane).toBe('XY');

    const oblique = classifyMode(1, 1, 1);
    expect(oblique.type).toBe('oblique');
  });

  it('calcula vector de onda (k_x, k_y, k_z, k)', () => {
    const wv = waveVector(1, 0, 0, 5, 4, 3);
    expect(wv.kx).toBeCloseTo(Math.PI / 5, 4);
    expect(wv.ky).toBe(0);
    expect(wv.kz).toBe(0);
    expect(wv.k).toBeCloseTo(Math.PI / 5, 4);
  });

  it('excluye el modo trivial (0,0,0) y ordena por frecuencia ascendente', () => {
    const modes = computeModes({ Lx: 4, Ly: 3, Lz: 2.5, c: 343, nMax: 3, fMax: 100 });
    expect(modes.length).toBeGreaterThan(0);
    expect(modes.some(m => m.nx === 0 && m.ny === 0 && m.nz === 0)).toBe(false);

    for (let i = 1; i < modes.length; i++) {
      expect(modes[i].freq).toBeGreaterThanOrEqual(modes[i - 1].freq);
    }
  });

  it('calcula la frecuencia de Schroeder fs ≈ 385 Hz para sala 3x3x3 m y T = 1 s', () => {
    // V = 27 m3, T = 1 s
    // fs ≈ 2000 * sqrt(1 / 27) = 2000 / 5.19615 = 384.9 Hz ≈ 385 Hz
    const res = schroederFrequency(1.0, 27.0, 343);
    expect(res.fsApprox).toBeCloseTo(384.9, 0);
    expect(Math.round(res.fsApprox)).toBe(385);
    expect(res.fsExact).toBeGreaterThan(390); // versión 2093*sqrt(T/V) ≈ 403 Hz
  });

  it('calcula límites de bandas de 1/3 de octava según ISO 266', () => {
    const b100 = getBandLimits(100);
    expect(b100.fc).toBe(100);
    expect(b100.fLow).toBeCloseTo(100 / Math.pow(2, 1 / 6), 2);
    expect(b100.fHigh).toBeCloseTo(100 * Math.pow(2, 1 / 6), 2);
  });

  it('encuentra degeneraciones en sala cúbica 3x3x3 m', () => {
    const modes = computeModes({ Lx: 3, Ly: 3, Lz: 3, c: 343, nMax: 2, fMax: 150 });
    const degGroups = findDegenerateModes(modes, 0.1);
    expect(degGroups.length).toBeGreaterThan(0);
    // (1,0,0), (0,1,0), (0,0,1) tienen exactamente la misma frecuencia
    const firstGroup = degGroups.find(g => g.modes.length === 3);
    expect(firstGroup).toBeDefined();
  });

  it('determina que sala cúbica 3x3x3 m NO CUMPLE el criterio de Bonello', () => {
    const modes = computeModes({ Lx: 3, Ly: 3, Lz: 3, c: 343, nMax: 6, fMax: 200 });
    const bonello = evaluateBonello(modes, 200, 0.1);
    expect(bonello.complies).toBe(false);
    expect(bonello.violations.length).toBeGreaterThan(0);
  });

  it('valida polígono rectangular vs irregular en getRectangularDims', () => {
    const rectPoly = {
      vertices: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 4 },
        { x: 0, y: 4 },
      ],
      height: 3,
      curvatures: {},
    };
    const dims = getRectangularDims(rectPoly);
    expect(dims.isRectangular).toBe(true);
    expect(dims.Lx).toBe(5);
    expect(dims.Ly).toBe(4);
    expect(dims.Lz).toBe(3);

    const nonRectPoly = {
      vertices: [
        { x: 0, y: 0 },
        { x: 5, y: 1 }, // no ortogonal
        { x: 5, y: 4 },
        { x: 0, y: 4 },
      ],
      height: 3,
    };
    const nonRectDims = getRectangularDims(nonRectPoly);
    expect(nonRectDims.isRectangular).toBe(false);
  });

  it('valida función de forma espacial y distribución de presión', () => {
    const mode = { nx: 1, ny: 0, nz: 0, Lx: 4, Ly: 3, Lz: 3 };
    // En x = 0 (pared), cos(0) = 1
    const pWall = modePressureShape(0, 1.5, 1.5, mode, 4, 3, 3);
    expect(Math.abs(pWall)).toBeCloseTo(1, 4);

    // En x = 2 (centro), cos(pi * 2 / 4) = cos(pi/2) = 0 (nodo)
    const pNode = modePressureShape(2, 1.5, 1.5, mode, 4, 3, 3);
    expect(Math.abs(pNode)).toBeCloseTo(0, 4);
  });

  it('calcula amortiguamiento modal: delta ≈ 6.908 / T60, tau, y ancho de banda a -3 dB', () => {
    // Para T60 = 1.0 s: delta = 3 * ln(10) ≈ 6.9078 s^-1
    // tau = 1 / delta ≈ 0.1448 s
    // bandwidth = delta / pi ≈ 2.20 Hz
    const d1 = calculateModalDamping(1.0);
    expect(d1.delta).toBeCloseTo(6.9078, 3);
    expect(d1.tau).toBeCloseTo(0.1448, 3);
    expect(d1.bandwidth).toBeCloseTo(2.199, 2);

    // Para T60 = 2.0 s: delta debe ser exactamente la mitad
    const d2 = calculateModalDamping(2.0);
    expect(d2.delta).toBeCloseTo(3.4539, 3);
  });

  it('genera la respuesta de presión libre p(t) y su envolvente exponencial', () => {
    const mode = { nx: 1, ny: 0, nz: 0, frequency: 50 };
    const resp = generateModeTimeResponse({
      mode,
      Lx: 3.43,
      Ly: 3,
      Lz: 3,
      x: 0, // antinodo en la pared (cos = 1)
      y: 0,
      z: 0,
      T60: 1.0,
      durationMs: 200,
      numPoints: 100,
      initialPressure: 2.0,
    });

    expect(resp).toBeDefined();
    expect(resp.samples.length).toBe(100);
    // En t = 0, p(0) = P0 * cos(0) * exp(0) * cos(0) = 2.0
    expect(resp.samples[0].pressure).toBeCloseTo(2.0, 3);
    expect(resp.samples[0].envelopeUpper).toBeCloseTo(2.0, 3);

    // A lo largo del tiempo, la envolvente debe decrecer estrictamente
    const sFirst = resp.samples[0];
    const sLast = resp.samples[resp.samples.length - 1];
    expect(sLast.envelopeUpper).toBeLessThan(sFirst.envelopeUpper);

    // Cada muestra p(t) debe estar acotada por la envolvente [-env, +env]
    resp.samples.forEach(s => {
      expect(s.pressure).toBeLessThanOrEqual(s.envelopeUpper + 0.0001);
      expect(s.pressure).toBeGreaterThanOrEqual(s.envelopeLower - 0.0001);
    });
  });

  it('calcula la superposición de 2 modos y detecta frecuencia de batimiento', () => {
    const mode1 = { id: '1-0-0', nx: 1, ny: 0, nz: 0, frequency: 50 };
    const mode2 = { id: '0-1-0', nx: 0, ny: 1, nz: 0, frequency: 55 };

    const superposed = generateSuperposedModesTimeResponse({
      modes: [mode1, mode2],
      Lx: 4,
      Ly: 4,
      Lz: 3,
      x: 0,
      y: 0,
      z: 0,
      T60: 1.0,
      durationMs: 300,
      numPoints: 150,
      initialPressure: 1.0,
    });

    expect(superposed).toBeDefined();
    expect(superposed.beatFreq).toBeCloseTo(5.0, 2); // 55 - 50 = 5 Hz
    expect(superposed.beatPeriodMs).toBeCloseTo(200.0, 1); // 1 / 5 = 200 ms
    expect(superposed.samples.length).toBe(150);
  });
});
