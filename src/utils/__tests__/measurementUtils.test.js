import { describe, it, expect } from 'vitest';
import {
  generateMeasurementGrid,
  parseFrequencyList,
  matchToTheoreticalModes,
  parseSplCsv,
  interpolateIdw2D,
  parseRewMeasurementText,
  mapCurveToThirdOctaveBands,
  detectSpectralPeaks,
  isPointInPolygon,
  minDistanceToWalls,
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

  it('parsea texto exportado de mediciones de REW (Room EQ Wizard) e ignora cabeceras', () => {
    const rewText = `
* Room EQ Wizard V5.20
* Dated: 15-Oct-2024
* Measurement: Mic Corner E1
Freq(Hz)  SPL(dB)  Phase(degrees)
20.00     65.4     12.3
25.10     72.8     -5.1
31.50     84.2     180.0
40.00     68.1     -90.2
    `;
    const parsed = parseRewMeasurementText(rewText);
    expect(parsed.length).toBe(4);
    expect(parsed[0]).toEqual({ freq: 20.0, spl: 65.4 });
    expect(parsed[2]).toEqual({ freq: 31.5, spl: 84.2 });
  });

  it('mapea curvas continuas a bandas de 1/3 de octava ISO', () => {
    const curve = [
      { freq: 60, spl: 75 },
      { freq: 63, spl: 77 },
      { freq: 66, spl: 76 },
      { freq: 125, spl: 82 },
    ];
    const bands = mapCurveToThirdOctaveBands(curve, [63, 125]);
    expect(bands[63]).toBeCloseTo(76.1, 1);
    expect(bands[125]).toBe(82);
  });

  it('detecta picos espectrales locales prominentes', () => {
    const freqs = [30, 35, 40, 45, 50, 55, 60];
    const spls = [70, 72, 85, 71, 68, 88, 70];
    const peaks = detectSpectralPeaks(freqs, spls, 5.0);
    expect(peaks.length).toBe(2);
    expect(peaks[0].freq).toBe(40);
    expect(peaks[0].spl).toBe(85);
    expect(peaks[1].freq).toBe(55);
    expect(peaks[1].spl).toBe(88);
  });

  it('evalúa correctamente si un punto está dentro de un polígono arbitrario (Ray-Casting)', () => {
    // Polígono en L
    const lShape = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 6 },
      { x: 0, y: 6 },
    ];
    // Puntos interiores
    expect(isPointInPolygon({ x: 1, y: 1 }, lShape)).toBe(true);
    expect(isPointInPolygon({ x: 4, y: 1 }, lShape)).toBe(true);
    expect(isPointInPolygon({ x: 1, y: 5 }, lShape)).toBe(true);

    // Puntos exteriores (en el recorte de la L o fuera de la caja)
    expect(isPointInPolygon({ x: 5, y: 5 }, lShape)).toBe(false);
    expect(isPointInPolygon({ x: -1, y: 2 }, lShape)).toBe(false);
    expect(isPointInPolygon({ x: 7, y: 1 }, lShape)).toBe(false);
  });

  it('genera cuadrícula de medición para recinto poligonal no rectangular garantizando que ningún punto esté fuera', () => {
    // Sala con forma de L (6 vértices)
    const lShape = [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 8 },
      { x: 0, y: 8 },
    ];

    const grid = generateMeasurementGrid(8, 8, 1.5, 0.7, 1.2, lShape);
    expect(grid.points.length).toBeGreaterThan(0);

    // 1. ABSOLUTAMENTE TODOS los puntos deben estar dentro del polígono
    grid.points.forEach(p => {
      const inside = isPointInPolygon({ x: p.x, y: p.y }, lShape);
      expect(inside).toBe(true);
      // Separación a las paredes
      const distWall = minDistanceToWalls(p.x, p.y, lShape);
      expect(distWall).toBeGreaterThanOrEqual(0.2);
    });

    // 2. La fuente S0 debe estar estrictamente dentro del polígono
    const sourceInside = isPointInPolygon({ x: grid.source.x, y: grid.source.y }, lShape);
    expect(sourceInside).toBe(true);
  });
});
