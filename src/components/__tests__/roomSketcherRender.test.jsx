import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import RoomSketcher from '../../components/RoomSketcher';

describe('RoomSketcher component mount & render test', () => {
  it('renders RoomSketcher without throwing ReferenceError or TypeError', () => {
    const props = {
      roomPolygon: {
        vertices: [
          { x: 0, y: 0 },
          { x: 8, y: 0 },
          { x: 8, y: 5 },
          { x: 0, y: 5 },
        ],
        height: 3.0,
        curvatures: {},
        guides: [],
      },
      onChangePolygon: () => {},
      geometry: { boundingBox: { width: 8, length: 5, height: 3 } },
      materials: {},
      sourceReceiver: {
        sourcePos: { x: 2, y: 2.5, z: 1.5 },
        receiverPos: { x: 5, y: 2.5, z: 1.2 },
        distance: 3.0,
      },
      onChangeSourceReceiver: () => {},
    };

    expect(() => {
      const html = renderToString(<RoomSketcher {...props} />);
      expect(html).toContain('svg');
    }).not.toThrow();
  });

  it('renders RoomSketcher with curved walls and guides without throwing', () => {
    const props = {
      roomPolygon: {
        vertices: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 6 },
          { x: 0, y: 6 },
        ],
        height: 3.5,
        curvatures: { 0: 0.5, 2: -0.3 },
        guides: [
          { id: 'g1', a: { x: 0, y: 3 }, b: { x: 10, y: 3 } }
        ],
      },
      onChangePolygon: () => {},
      geometry: { boundingBox: { width: 10, length: 6, height: 3.5 } },
      materials: { wall_0: { materialId: 'concrete_rough' } },
      sourceReceiver: {
        sourcePos: { x: 2, y: 3, z: 1.5 },
        receiverPos: { x: 7, y: 3, z: 1.2 },
        distance: 5.0,
      },
      onChangeSourceReceiver: () => {},
    };

    expect(() => {
      const html = renderToString(<RoomSketcher {...props} />);
      expect(html).toContain('guía');
      expect(html).toContain('Pared');
    }).not.toThrow();
  });

  it('renders safely even with empty vertices or minimal geometry', () => {
    const props = {
      roomPolygon: { vertices: [], height: 2.8, curvatures: {}, guides: [] },
      onChangePolygon: () => {},
      geometry: { boundingBox: { width: 5, length: 4, height: 2.8 } },
      materials: {},
      sourceReceiver: { sourcePos: { x: 1, y: 1, z: 1.5 }, receiverPos: { x: 3, y: 2, z: 1.2 }, distance: 2.2 },
      onChangeSourceReceiver: () => {},
    };

    expect(() => {
      const html = renderToString(<RoomSketcher {...props} />);
      expect(html).toContain('svg');
    }).not.toThrow();
  });
});
