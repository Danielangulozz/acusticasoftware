import { describe, it, expect } from 'vitest';
import { FICHAS, buildContext, runCheck } from '../fichasData';
import { texToMathML } from '../../common/Tex';
import {
  AIR_ABSORPTION_COEFFS,
  OCTAVE_BANDS,
  calculatePolygonGeometry,
  calculateReverberationTimes,
  calculateRoomAbsorption,
  calculateRoomConstant,
  calculateSoundFieldAtDistance,
  getOptimumReverberationTime,
} from '../../../utils/acousticCalculations';
import { getDefaultPolygonMaterials } from '../../../utils/defaultMaterials';
import { computeModes, getRectangularDims, schroederFrequency } from '../../../utils/modalCalculations';

/** Reproduce la cadena de cálculo de App.jsx para una sala dada. */
function project({ w, d, h, roomType = 'speech', band = 1000, air = true, source = { lw: 90, directivity: 2, distance: 4 } }) {
  const roomPolygon = { vertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: d }, { x: 0, y: d }], height: h, curvatures: {} };
  const geometry = calculatePolygonGeometry(roomPolygon.vertices, h, {});
  const materials = getDefaultPolygonMaterials(4);
  const absorptionData = calculateRoomAbsorption(geometry.surfaceAreas, geometry.totalSurfaceArea, materials);
  const reverberationData = calculateReverberationTimes(geometry.volume, geometry.totalSurfaceArea, geometry.surfaceAreas, absorptionData, materials, air);
  const soundFieldData = {};
  OCTAVE_BANDS.forEach((freq) => {
    const R = calculateRoomConstant(absorptionData[freq].equivalentAbsorption, absorptionData[freq].alphaMean);
    soundFieldData[freq] = { ...calculateSoundFieldAtDistance(source.lw, source.directivity, R, source.distance, air ? AIR_ABSORPTION_COEFFS[freq] : 0), roomConstant: R };
  });
  const modalSettings = { c: 343, tempC: 20, nMax: 5, fMax: 400 };
  const modalDimensions = getRectangularDims(roomPolygon, h, geometry.floorArea, 'equivalent', modalSettings);
  const t60ForSchroeder = (reverberationData[500].sabine + reverberationData[1000].sabine) / 2;
  return {
    geometry,
    materials,
    absorptionData,
    reverberationData,
    soundFieldData,
    sourceReceiver: source,
    includeAirAbsorption: air,
    selectedBand: band,
    roomType,
    optimumRT: getOptimumReverberationTime(geometry.volume, roomType),
    modalDimensions,
    modalSettings,
    t60ForSchroeder,
    schroederData: schroederFrequency(t60ForSchroeder, modalDimensions.volume || geometry.volume, modalSettings.c),
    calculatedModes: computeModes({ Lx: modalDimensions.Lx, Ly: modalDimensions.Ly, Lz: modalDimensions.Lz, c: 343, nMax: 5, fMax: 400 }),
  };
}

const ROOMS = [
  { w: 10, d: 6, h: 3 },
  { w: 5.4, d: 4.4, h: 2.7, roomType: 'studio', band: 500, air: false },
  { w: 28, d: 18, h: 12, roomType: 'music', band: 2000, source: { lw: 100, directivity: 1, distance: 25 } },
  { w: 4, d: 3, h: 2.5, roomType: 'multipurpose', band: 125, source: { lw: 80, directivity: 4, distance: 0.6 } },
];

describe('fichas técnicas', () => {
  it('cada ficha tiene su contenido completo y fórmulas que se pueden dibujar', () => {
    const ids = new Set();
    FICHAS.forEach((x) => {
      expect(ids.has(x.id)).toBe(false);
      ids.add(x.id);
      ['title', 'what', 'why', 'valid', 'ref'].forEach((k) => expect(x[k].length).toBeGreaterThan(10));
      expect(x.formulas.length).toBeGreaterThan(0);
      [...x.formulas, ...x.vars.map((v) => v[0])].forEach((tex) => {
        const html = texToMathML(tex);
        expect(html.startsWith('<math')).toBe(true);
        expect(html, `${x.id}: ${tex}`).not.toContain('<merror>');
      });
    });
  });

  ROOMS.forEach((room) => {
    it(`la cuenta manual coincide con el motor · sala ${room.w} × ${room.d} × ${room.h} m`, () => {
      const ctx = buildContext(project(room));
      FICHAS.filter((x) => x.check).forEach((x) => {
        const r = runCheck(x, ctx);
        expect(r.error, `${x.id}: ${r.error}`).toBeUndefined();
        expect(r.ok, `${x.id}: manual ${r.manual} vs motor ${r.engine}`).toBe(true);
        r.steps.forEach((tex) => expect(texToMathML(tex), `${x.id}: ${tex}`).not.toContain('<merror>'));
      });
    });
  });
});
