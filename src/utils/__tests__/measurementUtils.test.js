import { describe, it, expect } from 'vitest';
import {
  generateMeasurementGrid,
  parseFrequencyList,
  matchToTheoreticalModes,
  parseSplCsv,
  interpolateIdw2D,
} from '../measurementUtils.js';

describe('Utilidades de Medición In Situ (measurementUtils.js)', () => {
  it('genera cuadrícula de medición para sala 4.5 x 9 m con margen >= 0.7 m y fuente al centro', () => {
    const grid = generateMeasurementGrid(4.5, 9.0, 1.5, 0.7, 1.2);
    expect(grid.points.length).toBeGreaterThan(4);
    expect(grid.source.x).toBeCloseTo(2.25, 2);
    expect(grid.source.y).toBeCloseTo(4.5, 2);

    // Todos los puntos deben estar dentro de los límites y respetar margen
    grid.points.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0.7 - 0.01);
      expect(p.x).toBeLessThanOrEqual(4.5 - 0.7 + 0.01);
      expect(p.y).toBeGreaterThanOrEqual(0.7 - 0.01);
      expect(p.y).toBeLessThanOrEqual(9.0 - 0.7 + 0.01);
    });

    // Debe contener las 4 esquinas marcadas
    const corners = grid.points.filter(p => p.isCorner);
    expect(corners.length).toBe(4);
  });

  it('parsea listas de frecuencias pegadas (tipo REW, FEM o COMSOL con %)', () => {
    const rawText = `
      % Frecuencias obtenidas en COMSOL Multiphysics
      % Modo, Frecuencia (Hz)
      57.2, 57.2, 80.894, 114.4
      # Otra medición
      125.0; 160.2
    `;
    const freqs = parseFrequencyList(rawText);
    expect(freqs).toEqual([57.2, 57.2, 80.89, 114.4, 125.0, 160.2]);
  });

  it('empareja modos teóricos con frecuencias medidas dentro de tolerancia', () => {
    const theoreticalModes = [
      { nx: 1, ny: 0, nz: 0, freq: 57.5 },
      { nx: 0, ny: 1, nz: 0, freq: 80.5 },
      { nx: 1, ny: 1, nz: 0, freq: 99.0 },
    ];
    const measuredFreqs = [57.2, 81.0, 150.0];

    const matched = matchToTheoreticalModes(measuredFreqs, theoreticalModes, 1.5);
    expect(matched.length).toBe(3);

    // Modo 1: 57.5 emparejado con 57.2 (|57.2 - 57.5| = 0.3)
    expect(matched[0].matched).toBe(true);
    expect(matched[0].measuredFreq).toBe(57.2);
    expect(matched[0].absError).toBeCloseTo(0.3, 2);

    // Modo 2: 80.5 emparejado con 81.0 (|81.0 - 80.5| = 0.5)
    expect(matched[1].matched).toBe(true);
    expect(matched[1].measuredFreq).toBe(81.0);

    // Modo 3: 99.0 sin coincidencia cercana
    expect(matched[2].matched).toBe(false);
    expect(matched[2].measuredFreq).toBe(null);
  });

  it('interpola espacialmente con IDW en 2D', () => {
    const known = [
      { x: 1, y: 1, value: 70 },
      { x: 3, y: 3, value: 80 },
    ];
    const res = interpolateIdw2D(known, 4, 4, 10);
    expect(res).toBeDefined();
    expect(res.grid.length).toBe(10 * 10);
    expect(res.minVal).toBeGreaterThanOrEqual(70);
    expect(res.maxVal).toBeLessThanOrEqual(80);
  });
});
