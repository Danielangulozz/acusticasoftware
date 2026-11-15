import { describe, it, expect } from 'vitest';
import { computeCase, eyring, VOLUME, SURFACE } from '../caseStudy';

describe('caso de estudio del sitio (antes / después)', () => {
  const c = computeCase();

  it('Eyring coincide con Sabine cuando la absorción es baja', () => {
    const A = 2; // ᾱ ≈ 0.02
    const sabine = (0.161 * VOLUME) / A;
    expect(eyring(VOLUME, SURFACE, A)).toBeGreaterThan(sabine * 0.97);
    expect(eyring(VOLUME, SURFACE, A)).toBeLessThan(sabine);
  });

  it('la sala sin tratar es claramente reverberante', () => {
    expect(c.beforeMid).toBeGreaterThan(1.4);
    expect(c.beforeMid).toBeLessThan(2.2);
  });

  it('el tratamiento baja el RT60 en todas las bandas', () => {
    c.bands.forEach((_, i) => expect(c.after[i]).toBeLessThan(c.before[i]));
  });

  it('el resultado en medios queda dentro del objetivo ITU-R BS.1116 (±0.05 s)', () => {
    expect(c.afterMid).toBeGreaterThanOrEqual(c.targetMin);
    expect(c.afterMid).toBeLessThanOrEqual(c.targetMax);
    // de 250 Hz a 4 kHz también debe cumplir la tolerancia
    c.after.slice(1).forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(c.targetMin);
      expect(t).toBeLessThanOrEqual(c.targetMax);
    });
  });
});
