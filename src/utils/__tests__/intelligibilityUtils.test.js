import { describe, it, expect } from 'vitest';
import {
  calculateDc,
  calculateDLim,
  calculatePeutzAlcons,
  alconsToSti,
  stiToCis,
  getIntelligibilityRating,
  generateAlconsDistanceCurve,
  calculateExperimentalAlcons,
  compareExperimentalVsAnalytical,
  USB_MEDELLIN_EXAMPLE_DATA,
} from '../intelligibilityUtils.js';
import {
  calculateOccupancyAbsorption,
  DEFAULT_PEOPLE_CATALOG,
  DEFAULT_OBJECTS_CATALOG,
} from '../defaultMaterials.js';

describe('Inteligibilidad de la Palabra (%ALcons / Peutz / ISO 9921 / Logátomos)', () => {
  it('calcula la distancia crítica Dc y la distancia límite D_lim según Peutz', () => {
    // Para el ejemplo de la USB Medellín: Q = 2, R = 1.58 m²
    // Dc = 0.141 * sqrt(2 * 1.58) = 0.141 * sqrt(3.16) = 0.141 * 1.7776 = 0.2506 ≈ 0.25 m
    const Dc = calculateDc(2, 1.58);
    expect(Dc).toBeCloseTo(0.25, 2);

    // D_lim = 3.16 * 0.2506 = 0.792 ≈ 0.79 m
    const dLim = calculateDLim(Dc);
    expect(dLim).toBeCloseTo(0.79, 2);
  });

  it('calcula %ALcons en campo cercano/directo (d <= D_lim) y en campo reverberado (d > D_lim)', () => {
    const RT60 = 3.14; // s
    const V = 30.0; // m³
    const Q = 2;
    const a = 1.5;
    const R = 1.58;

    // Caso 1: d = 0.5 m <= D_lim (0.79 m)
    // %ALcons = (200 * 0.5^2 * 3.14^2) / (30 * 2) + 1.5 = (50 * 9.8596) / 60 + 1.5 = 8.216 + 1.5 = 9.72%
    const resNear = calculatePeutzAlcons(0.5, RT60, V, Q, a, R);
    expect(resNear.isReverberantField).toBe(false);
    expect(resNear.alcons).toBeCloseTo(9.72, 1);

    // Caso 2: d = 2.0 m > D_lim (0.79 m) (meseta del campo reverberado)
    // %ALcons = 9 * 3.14 + 1.5 = 28.26 + 1.5 = 29.76%
    const resFar = calculatePeutzAlcons(2.0, RT60, V, Q, a, R);
    expect(resFar.isReverberantField).toBe(true);
    expect(resFar.alcons).toBeCloseTo(29.76, 1);
  });

  it('convierte %ALcons a STI, CIS y califica la inteligibilidad según ISO 9921 / IEC 60268-16', () => {
    // %ALcons <= 5% -> Excelente
    const rExc = getIntelligibilityRating(4.5);
    expect(rExc.rating).toBe('Excelente');
    const stiExc = alconsToSti(4.5);
    expect(stiExc).toBeGreaterThanOrEqual(0.65);

    // %ALcons = 8% -> Bueno
    const rGood = getIntelligibilityRating(8.0);
    expect(rGood.rating).toBe('Bueno');

    // %ALcons = 12% -> Aceptable / Regular
    const rFair = getIntelligibilityRating(12.0);
    expect(rFair.rating).toBe('Aceptable / Regular');

    // %ALcons = 18% -> Pobre
    const rPoor = getIntelligibilityRating(18.0);
    expect(rPoor.rating).toBe('Pobre');

    // %ALcons = 30% -> Malo / Inaceptable
    const rBad = getIntelligibilityRating(30.0);
    expect(rBad.rating).toBe('Malo / Inaceptable');
    const stiBad = alconsToSti(30.0);
    expect(stiBad).toBeLessThan(0.40);

    // CIS
    const cis = stiToCis(0.5);
    expect(cis).toBeCloseTo(0.70, 1); // 1 + log10(0.5) = 1 - 0.301 = 0.699
  });

  it('calcula %ALcons experimental a partir de un dictado de logátomos', () => {
    // 50 logátomos dictados, 38 identificados correctamente -> 12 errores -> (12 / 50) * 100 = 24.0%
    const alconsExp1 = calculateExperimentalAlcons(38, 50);
    expect(alconsExp1).toBe(24.0);

    // 50 dictados, 35 correctos -> 15 errores -> 30.0%
    const alconsExp2 = calculateExperimentalAlcons(35, 50);
    expect(alconsExp2).toBe(30.0);

    // Todos correctos -> 0.0%
    expect(calculateExperimentalAlcons(50, 50)).toBe(0.0);
  });

  it('compara datos experimentales con el modelo analítico calculando residuos y RMSE', () => {
    const expData = [
      { distance: 1.0, alconsExp: 24.0 },
      { distance: 2.0, alconsExp: 28.0 },
      { distance: 3.0, alconsExp: 30.0 },
    ];
    const comparison = compareExperimentalVsAnalytical(expData, 3.14, 30.0, 2, 1.5, 1.58);

    expect(comparison.count).toBe(3);
    expect(comparison.rows.length).toBe(3);
    expect(comparison.rmse).toBeGreaterThan(0);
    expect(comparison.meanAbsError).toBeGreaterThan(0);
    // Verificar que cada fila contenga errores calculados
    comparison.rows.forEach(r => {
      expect(typeof r.absError).toBe('number');
      expect(typeof r.relErrorPercent).toBe('number');
      expect(typeof r.residual).toBe('number');
    });
  });

  it('verifica los datos y resultados exactos del ejemplo de la Universidad de San Buenaventura Medellín', () => {
    const usb = USB_MEDELLIN_EXAMPLE_DATA;
    expect(usb.dimensions.volume).toBe(30.0);
    expect(usb.dimensions.totalSurfaceArea).toBe(59.0);
    expect(usb.source.Q).toBe(2);

    // Absorción total a 2000 Hz debe ser 1.54 m²
    expect(usb.octaveAbsorption[2000].Atot).toBe(1.54);
    // Constante de sala a 2000 Hz debe ser 1.58 m²
    expect(usb.roomConstant2000).toBe(1.58);
    // RT60 Sabine a 2000 Hz: (0.161 * 30) / 1.54 ≈ 3.136 s
    expect(usb.RT60_untreated).toBeCloseTo(3.14, 2);
    // Distancia crítica a 2000 Hz: 0.141 * sqrt(2 * 1.58) = 0.25 m
    expect(usb.Dc_untreated).toBe(0.25);

    // Con acondicionamiento acústico (cielo raso fonoabsorbente):
    // RT60 se reduce a ~0.39 s (óptimo para aulas) y la inteligibilidad mejora radicalmente
    expect(usb.treatment.RT60_treated).toBeLessThan(0.5);
    expect(usb.treatment.Dc_treated).toBeGreaterThan(usb.Dc_untreated);
  });

  it('calcula absorción aportada por personas y objetos en la sala', () => {
    // 20 estudiantes sentados en sillas de madera + 1 profesor de pie + 10 mesas
    const people = {
      person_seated_wood: 20,
      person_standing: 1,
    };
    const objects = {
      desk_table_wood: 10,
    };

    const occAbs = calculateOccupancyAbsorption(people, objects);

    // A 1000 Hz:
    // 20 * 0.50 (estudiante) = 10.0
    // 1 * 0.98 (profesor) = 0.98
    // 10 * 0.10 (mesa) = 1.00
    // Total = 11.98 m² Sabine
    expect(occAbs[1000]).toBeCloseTo(11.98, 1);

    // A 2000 Hz:
    // 20 * 0.50 = 10.0
    // 1 * 1.13 = 1.13
    // 10 * 0.12 = 1.20
    // Total = 12.33 m² Sabine
    expect(occAbs[2000]).toBeCloseTo(12.33, 1);
  });
});
