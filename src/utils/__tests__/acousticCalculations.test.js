import { describe, it, expect } from 'vitest';
import { calculateCriticalDistance, calculateRoomConstant, calculateSoundFieldAtDistance } from '../acousticCalculations';
import { calculateDc } from '../intelligibilityUtils';

describe('campo sonoro: constante de sala y distancia crítica', () => {
  it('R = A / (1 − ᾱ)', () => {
    expect(calculateRoomConstant(50, 0.2)).toBeCloseTo(62.5, 6);
  });

  it('Dc = √(Q·R / 16π) ≈ 0.141·√(Q·R)', () => {
    expect(calculateCriticalDistance(1, 100)).toBeCloseTo(Math.sqrt(100 / (16 * Math.PI)), 9);
    expect(calculateCriticalDistance(2, 50)).toBeCloseTo(0.141 * Math.sqrt(100), 2);
  });

  it('en r = Dc el campo directo iguala al reverberado', () => {
    const Q = 2;
    const R = 69.7;
    const Dc = calculateCriticalDistance(Q, R);
    const field = calculateSoundFieldAtDistance(90, Q, R, Dc, 0);
    expect(field.directIntensityLevel).toBeCloseTo(field.revIntensityLevel, 6);
    expect(field.drrDb).toBeCloseTo(0, 6);
    // y el nivel total queda 3 dB por encima del campo reverberado
    expect(field.lpTotalIdeal - field.revIntensityLevel).toBeCloseTo(10 * Math.log10(2), 6);
  });

  it('coincide con la distancia crítica del módulo de inteligibilidad', () => {
    expect(calculateCriticalDistance(2, 1.58)).toBeCloseTo(calculateDc(2, 1.58), 2);
  });
});
