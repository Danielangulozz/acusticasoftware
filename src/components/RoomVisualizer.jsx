import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Eye, RotateCcw, ZoomIn, ZoomOut, Play, Pause, 
  Layers, Radio, Info, Ruler, Compass, Volume2, Mic, Maximize2,
  Grid3X3
} from 'lucide-react';
import { getMaterialById, getMaterialColor } from '../utils/defaultMaterials';
import { polygonCentroid, getEdgeArcPoints, isPolygonCCW } from '../utils/acousticCalculations';
import RoomVisualizerModal from './RoomVisualizerModal';

/**
 * Visualizador 3D Interactivo de la Sala Acústica
 * Fondo Blanco en Modo Claro, altura compacta para optimizar el viewport,
 * y colores morados profesionales.
 */
export default function RoomVisualizer({ 
  roomPolygon,
  geometry,
  dimensions,
  sourceReceiver, 
  criticalDistance, 
  onChangeSourceReceiver,
  materials = {},
  selectedBand = 1000,
  isReportGraphic = false, // Modo sin controles UI para informe técnico imprimible
}) {
  // Vertices de polígono con fallback seguro
  const vertices = useMemo(() => {
    if (roomPolygon?.vertices && roomPolygon.vertices.length >= 3) {
      return roomPolygon.vertices;
    }
    const L = dimensions?.length || 10;
    const W = dimensions?.width || 6;
    return [
      { x: 0, y: 0 },
      { x: L, y: 0 },
      { x: L, y: W },
      { x: 0, y: W }
    ];
  }, [roomPolygon, dimensions]);

  const H = roomPolygon?.height || dimensions?.height || 3.0;
  const r = Math.max(0.1, Number(sourceReceiver?.distance) || 3);
  const Q = Number(sourceReceiver?.directivity) || 1;
  const Dc = Math.max(0.1, Number(criticalDistance) || 2.5);

  // Estados de cámara
  const [hoveredFace, setHoveredFace] = useState(null);
  const [rotX, setRotX] = useState(28);
  const [rotY, setRotY] = useState(42);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [showRays, setShowRays] = useState(true);
  const [viewPreset, setViewPreset] = useState('3d');
  const [ceilingMode, setCeilingMode] = useState('translucent');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  // Auto-rotación
  useEffect(() => {
    if (!autoRotate) return;
    let lastTime = performance.now();
    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setRotY((prev) => (prev + delta * 18) % 360);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [autoRotate]);

  const dragRafRef = useRef(null);
  const pendingDeltaRef = useRef({ x: 0, y: 0, isShift: false });

  // Manejo de eventos de ratón para órbita 3D
  const handleMouseDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    if (autoRotate) setAutoRotate(false);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    pendingDeltaRef.current.x += deltaX;
    pendingDeltaRef.current.y += deltaY;
    pendingDeltaRef.current.isShift = e.shiftKey;

    if (!dragRafRef.current) {
      dragRafRef.current = requestAnimationFrame(() => {
        const { x: dx, y: dy, isShift } = pendingDeltaRef.current;
        pendingDeltaRef.current = { x: 0, y: 0, isShift: false };
        dragRafRef.current = null;

        if (isShift) {
          setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        } else {
          setRotY((prev) => (prev + dx * 0.7) % 360);
          setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.7)));
        }
      });
    }
  };

  const handleMouseUp = () => { 
    isDraggingRef.current = false; 
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.35, Math.min(3.0, prev - e.deltaY * 0.0012)));
  };

  // Manejo táctil
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (autoRotate) setAutoRotate(false);
    }
  };
  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - lastMousePosRef.current.x;
    const deltaY = e.touches[0].clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setRotY((prev) => (prev + deltaX * 0.7) % 360);
    setRotX((prev) => Math.max(-85, Math.min(85, prev - deltaY * 0.7)));
  };
  const handleTouchEnd = () => { isDraggingRef.current = false; };

  const applyViewPreset = (preset) => {
    setViewPreset(preset);
    setPan({ x: 0, y: 0 });
    setAutoRotate(false);
    switch (preset) {
      case 'top': setRotX(89); setRotY(0); break;
      case 'front': setRotX(0); setRotY(0); break;
      case 'side': setRotX(0); setRotY(90); break;
      default: setRotX(28); setRotY(42); break;
    }
  };

  const resetCamera = () => {
    setRotX(28); setRotY(42); setZoom(1.0); setPan({ x: 0, y: 0 });
    setAutoRotate(false); setViewPreset('3d');
  };

  // Dimensiones compactas del lienzo SVG
  const SVG_W = 600, SVG_H = 320;
  const CX = SVG_W / 2 + pan.x;
  const CY = SVG_H / 2 + pan.y;

  // Centroide y caja delimitadora
  const centroid = useMemo(() => polygonCentroid(vertices), [vertices]);
  const bb = geometry?.boundingBox || { width: 10, length: 6 };
  const maxDim = Math.max(bb.width || 10, bb.length || 6, H, 4);

  // Proyección 3D isométrica
  const project3D = useCallback((x3d, y3d, z3d) => {
    const cx = x3d - centroid.x;
    const cy = y3d - centroid.y;
    const cz = z3d - H / 2;

    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    const rx1 = cx * Math.cos(radY) - cy * Math.sin(radY);
    const ry1 = cx * Math.sin(radY) + cy * Math.cos(radY);
    const rz1 = cz;

    const ry2 = ry1 * Math.cos(radX) - rz1 * Math.sin(radX);
    const rz2 = ry1 * Math.sin(radX) + rz1 * Math.cos(radX);

    const scale = (205 / maxDim) * zoom;
    const perspective = 650;
    const fov = perspective / (perspective + ry2);

    return {
      x: CX + rx1 * scale * fov,
      y: CY - rz2 * scale * fov,
      depth: ry2,
    };
  }, [rotX, rotY, zoom, CX, CY, centroid, H, maxDim]);

  // Pilares verticales en las esquinas
  const cornerPillars = useMemo(() => {
    return vertices.map((v, i) => {
      const p0 = project3D(v.x, v.y, 0);
      const p1 = project3D(v.x, v.y, H);
      const avgDepth = (p0.depth + p1.depth) / 2;
      return { p0, p1, index: i, depth: avgDepth, v };
    });
  }, [vertices, H, project3D]);

  const isCCW = useMemo(() => isPolygonCCW(vertices), [vertices]);

  // Caras poligonales con soporte para arcos curvos continuos y estancos
  const faces = useMemo(() => {
    if (vertices.length < 3) return [];
    const allFaces = [];
    const curvatures = roomPolygon?.curvatures || {};

    // Muestreo del perímetro de suelo y techo con puntos de arcos curvos continuos
    const sampledPerimeter = [];
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const v0 = vertices[i];
      const v1 = vertices[j];
      const bulge = curvatures[i] || 0;
      if (Math.abs(bulge) > 0.02) {
        const arcPts = getEdgeArcPoints(v0, v1, bulge, 12, isCCW);
        for (let k = 0; k < arcPts.length - 1; k++) {
          sampledPerimeter.push(arcPts[k]);
        }
      } else {
        sampledPerimeter.push(v0);
      }
    }

    // Piso (z = 0)
    const floorVerts3D = sampledPerimeter.map(v => project3D(v.x, v.y, 0));
    const floorCenterDepth = floorVerts3D.reduce((s, p) => s + p.depth, 0) / Math.max(1, floorVerts3D.length);
    allFaces.push({
      id: 'floor',
      name: 'Piso / Suelo',
      points: floorVerts3D.map(p => `${p.x},${p.y}`).join(' '),
      rawPoints: floorVerts3D,
      depth: floorCenterDepth,
      type: 'floor',
      area: geometry?.floorArea || geometry?.surfaceAreas?.floor || 0,
      dimLabel: geometry?.surfaceDimensionsLabels?.floor || 'Planta base',
    });

    // Techo (z = H)
    const ceilingVerts3D = sampledPerimeter.map(v => project3D(v.x, v.y, H));
    const ceilingCenterDepth = ceilingVerts3D.reduce((s, p) => s + p.depth, 0) / Math.max(1, ceilingVerts3D.length);
    if (ceilingMode !== 'hidden') {
      allFaces.push({
        id: 'ceiling',
        name: `Techo (H = ${H.toFixed(1)}m)`,
        points: ceilingVerts3D.map(p => `${p.x},${p.y}`).join(' '),
        rawPoints: ceilingVerts3D,
        depth: ceilingCenterDepth,
        type: 'ceiling',
        area: geometry?.floorArea || geometry?.surfaceAreas?.ceiling || 0,
        dimLabel: geometry?.surfaceDimensionsLabels?.ceiling || `Elevado a H = ${H.toFixed(1)}m`,
      });
    }

    // Paredes extruidas (arcos continuos sin louvers ni artefactos de acordeón)
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const v0 = vertices[i];
      const v1 = vertices[j];
      const bulge = curvatures[i] || 0;
      const wallId = `wall_${i}`;
      const dx = v1.x - v0.x;
      const dy = v1.y - v0.y;
      const chordLen = Math.sqrt(dx * dx + dy * dy);
      const isCurved = Math.abs(bulge) > 0.02;

      if (isCurved) {
        const arcPts = getEdgeArcPoints(v0, v1, bulge, 12, isCCW);
        const arcLen = chordLen + (8 * bulge * bulge) / (3 * Math.max(0.01, chordLen));

        // Arco inferior en el piso (z = 0)
        const botPoints = arcPts.map(pt => project3D(pt.x, pt.y, 0));
        // Arco superior en el techo (z = H) en reversa para cerrar la cinta poligonal
        const topPointsRev = [...arcPts].reverse().map(pt => project3D(pt.x, pt.y, H));

        const fullRing = [...botPoints, ...topPointsRev];
        const centerDepth = fullRing.reduce((s, p) => s + p.depth, 0) / Math.max(1, fullRing.length);

        allFaces.push({
          id: wallId,
          name: `Pared ${i + 1} (Arco ${arcLen.toFixed(1)}m)`,
          points: fullRing.map(p => `${p.x},${p.y}`).join(' '),
          rawPoints: fullRing,
          depth: centerDepth,
          type: 'wall',
          wallIndex: i,
          isCurved: true,
          area: geometry?.surfaceAreas?.[wallId] || (arcLen * H),
          dimLabel: `${arcLen.toFixed(1)}m × ${H.toFixed(1)}m (Flecha ${bulge > 0 ? '+' : ''}${bulge.toFixed(1)}m)`,
        });
      } else {
        const bl = project3D(v0.x, v0.y, 0);
        const br = project3D(v1.x, v1.y, 0);
        const tr = project3D(v1.x, v1.y, H);
        const tl = project3D(v0.x, v0.y, H);
        const centerDepth = (bl.depth + br.depth + tr.depth + tl.depth) / 4;

        allFaces.push({
          id: wallId,
          name: `Pared ${i + 1} (${chordLen.toFixed(1)}m)`,
          points: `${bl.x},${bl.y} ${br.x},${br.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`,
          rawPoints: [bl, br, tr, tl],
          depth: centerDepth,
          type: 'wall',
          wallIndex: i,
          isCurved: false,
          area: geometry?.surfaceAreas?.[wallId] || (chordLen * H),
          dimLabel: `${chordLen.toFixed(1)}m × ${H.toFixed(1)}m`,
        });
      }
    }

    allFaces.sort((a, b) => b.depth - a.depth);
    return allFaces;
  }, [vertices, H, project3D, geometry, ceilingMode, roomPolygon?.curvatures, isCCW]);

  // Bounding box y extremos del polígono
  const xs = useMemo(() => vertices.map(v => v.x), [vertices]);
  const ys = useMemo(() => vertices.map(v => v.y), [vertices]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Posicionamiento físico de la fuente sonora según Directividad Q y norma ISO 3382
  const sourceWorld = useMemo(() => {
    if (sourceReceiver?.sourcePos) {
      return sourceReceiver.sourcePos;
    }
    let sx = centroid.x;
    let sy = centroid.y;
    let sz = Math.min(1.5, H * 0.5); // 1.5m altura estándar ISO 3382

    if (Q === 8) {
      // En esquina triédrica (π/2 estereorradianes, piso + 2 paredes)
      sx = minX + 0.35;
      sy = minY + 0.35;
      sz = 0.2;
    } else if (Q === 4) {
      // En arista diédrica (π estereorradianes, intersección pared-piso)
      sx = centroid.x;
      sy = minY + 0.25;
      sz = 0.2;
    } else if (Q === 2) {
      // En pared o suelo (2π estereorradianes)
      sx = centroid.x;
      sy = minY + 0.65;
      sz = 0.2;
    } else {
      // Q = 1: Espacio libre (4π estereorradianes), alejado > 1.5m de paredes
      sx = centroid.x - Math.min(1.5, (maxX - minX) * 0.2);
      sy = centroid.y;
      sz = Math.min(1.5, H * 0.5);
    }
    return { x: sx, y: sy, z: sz };
  }, [sourceReceiver?.sourcePos, Q, centroid, minX, maxX, minY, H]);

  // Posicionamiento físico del receptor según distancia r y altura de oyente ISO (1.2m)
  const receiverWorld = useMemo(() => {
    if (sourceReceiver?.receiverPos) {
      return sourceReceiver.receiverPos;
    }
    const maxSpan = Math.max(1, (maxX - minX) * 0.85);
    const effectiveDist = Math.min(r, maxSpan);

    let rx = sourceWorld.x + effectiveDist;
    let ry = sourceWorld.y;

    // Si choca con la pared este, orientarlo en diagonal respetando la sala
    if (rx > maxX - 0.5) {
      rx = maxX - 0.6;
      ry = Math.min(maxY - 0.6, sourceWorld.y + Math.max(0.4, effectiveDist * 0.35));
    }
    const rz = Math.min(1.2, H * 0.45); // 1.2m altura estándar oyente sentado ISO 3382
    return { x: rx, y: ry, z: rz };
  }, [sourceReceiver?.receiverPos, sourceWorld, r, minX, maxX, maxY, H]);

  // Proyección 3D de fuente y receptor
  const sourcePos = useMemo(() => {
    return project3D(sourceWorld.x, sourceWorld.y, sourceWorld.z);
  }, [sourceWorld, project3D]);
  const sourceFloorPos = useMemo(() => {
    return project3D(sourceWorld.x, sourceWorld.y, 0);
  }, [sourceWorld, project3D]);

  const receiverPos = useMemo(() => {
    return project3D(receiverWorld.x, receiverWorld.y, receiverWorld.z);
  }, [receiverWorld, project3D]);
  const receiverFloorPos = useMemo(() => {
    return project3D(receiverWorld.x, receiverWorld.y, 0);
  }, [receiverWorld, project3D]);

  // Grilla métrica 3D proyectada en el piso
  const floor3DGrid = useMemo(() => {
    const lines = [];
    const step = 1.0;
    const startX = Math.floor(minX);
    const endX = Math.ceil(maxX);
    const startY = Math.floor(minY);
    const endY = Math.ceil(maxY);

    for (let x = startX; x <= endX; x += step) {
      const p1 = project3D(x, startY, 0.01);
      const p2 = project3D(x, endY, 0.01);
      lines.push({ p1, p2 });
    }
    for (let y = startY; y <= endY; y += step) {
      const p1 = project3D(startX, y, 0.01);
      const p2 = project3D(endX, y, 0.01);
      lines.push({ p1, p2 });
    }
    return lines;
  }, [minX, maxX, minY, maxY, project3D]);

  // Esfera/círculo de Distancia Crítica (Dc) alrededor de la fuente en el suelo
  const dcCircle = useMemo(() => {
    const steps = 36;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = sourceWorld.x + Dc * Math.cos(angle);
      const py = sourceWorld.y + Dc * Math.sin(angle);
      const p = project3D(px, py, 0.02);
      points.push(`${p.x},${p.y}`);
    }
    return points.join(' ');
  }, [sourceWorld, Dc, project3D]);

  // Estilo cromático para cada cara
  const getFaceStyle = (face) => {
    const isHovered = hoveredFace === face.id;
    const matConfig = materials?.[face.id];
    const matColor = matConfig ? getMaterialColor(matConfig.materialId) : null;

    if (face.type === 'floor') {
      return {
        fill: isHovered ? 'rgba(88, 51, 199, 0.18)' : 'rgba(88, 51, 199, 0.08)',
        stroke: isHovered ? '#5833c7' : 'rgba(88, 51, 199, 0.5)',
        strokeWidth: isHovered ? 2.5 : 1.5,
      };
    }

    if (face.type === 'ceiling') {
      if (ceilingMode === 'wireframe') {
        return {
          fill: 'none',
          stroke: isHovered ? '#8767f9' : 'rgba(88, 51, 199, 0.7)',
          strokeWidth: isHovered ? 2.5 : 1.5,
          strokeDasharray: '4,4',
        };
      }
      return {
        fill: isHovered ? 'rgba(135, 103, 249, 0.25)' : 'rgba(88, 51, 199, 0.12)',
        stroke: isHovered ? '#8767f9' : 'rgba(88, 51, 199, 0.75)',
        strokeWidth: isHovered ? 2.5 : 1.5,
      };
    }

    // Paredes
    const baseColor = matColor?.hex || '#5833c7';
    let r_ = 88, g_ = 51, b_ = 199;
    if (baseColor.startsWith('#') && baseColor.length >= 7) {
      r_ = parseInt(baseColor.slice(1, 3), 16);
      g_ = parseInt(baseColor.slice(3, 5), 16);
      b_ = parseInt(baseColor.slice(5, 7), 16);
    }

    return {
      fill: isHovered
        ? `rgba(${r_},${g_},${b_},0.45)`
        : `rgba(${r_},${g_},${b_},0.15)`,
      stroke: isHovered
        ? `rgba(${r_},${g_},${b_},0.95)`
        : `rgba(${r_},${g_},${b_},0.6)`,
      strokeWidth: isHovered ? 2.5 : 1.2,
    };
  };

  // Tooltip HUD
  const tooltipInfo = useMemo(() => {
    if (!hoveredFace) return null;
    const face = faces.find(f => f.id === hoveredFace);
    if (!face) return null;
    const matConfig = materials?.[face.id];
    const matInfo = matConfig ? getMaterialById(matConfig.materialId) : null;
    const alpha = matConfig?.coefficients?.[selectedBand] ?? '—';
    return {
      name: face.name,
      material: matInfo?.name || 'Manual / Personalizado',
      area: (face.area || 0).toFixed(1),
      dims: face.dimLabel,
      alpha: typeof alpha === 'number' ? alpha.toFixed(2) : alpha,
      type: face.type,
    };
  }, [hoveredFace, faces, materials, selectedBand]);

  if (isReportGraphic) {
    return (
      <div className="w-full h-full bg-white select-none overflow-hidden relative flex items-center justify-center">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full object-contain">
          <defs>
            <pattern id="reportFloorTiles3d" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect width="18" height="18" fill="rgba(88, 51, 199, 0.04)" />
              <line x1="0" y1="0" x2="18" y2="0" stroke="rgba(88, 51, 199, 0.12)" strokeWidth="0.5" />
              <line x1="0" y1="0" x2="0" y2="18" stroke="rgba(88, 51, 199, 0.12)" strokeWidth="0.5" />
            </pattern>
            <pattern id="reportCeilingTiles3d" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="rgba(135, 103, 249, 0.08)" />
              <rect x="1" y="1" width="14" height="14" fill="none" stroke="rgba(88, 51, 199, 0.2)" strokeWidth="0.5" strokeDasharray="2,2" />
            </pattern>
          </defs>

          <rect width={SVG_W} height={SVG_H} fill="#ffffff" />

          {/* Grilla 3D proyectada en el piso */}
          {floor3DGrid.map((l, i) => (
            <line
              key={`floor-grid-rep-${i}`}
              x1={l.p1.x} y1={l.p1.y}
              x2={l.p2.x} y2={l.p2.y}
              stroke="rgba(88, 51, 199, 0.18)"
              strokeWidth={0.7}
            />
          ))}

          {/* Caras ordenadas por profundidad */}
          {faces.map((face) => {
            const style = getFaceStyle(face);
            const isFloor = face.type === 'floor';
            const isCeiling = face.type === 'ceiling';

            return (
              <g key={`rep-${face.id}`}>
                {isFloor && (
                  <polygon points={face.points} fill="url(#reportFloorTiles3d)" />
                )}
                {isCeiling && (
                  <polygon points={face.points} fill="url(#reportCeilingTiles3d)" />
                )}
                <polygon
                  points={face.points}
                  fill={isFloor ? 'none' : style.fill}
                  stroke={style.stroke}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Pilares verticales */}
          {cornerPillars.map((pillar) => (
            <g key={`rep-pillar-${pillar.index}`}>
              <line
                x1={pillar.p0.x} y1={pillar.p0.y}
                x2={pillar.p1.x} y2={pillar.p1.y}
                stroke="rgba(88, 51, 199, 0.4)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <circle cx={pillar.p0.x} cy={pillar.p0.y} r={2.5} fill="#5833c7" opacity={0.8} />
              <circle cx={pillar.p1.x} cy={pillar.p1.y} r={2.5} fill="#8767f9" opacity={0.8} />
            </g>
          ))}

          {/* Dc Circle */}
          <polyline
            points={dcCircle}
            fill="rgba(245, 158, 11, 0.05)"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />

          {/* Vástagos */}
          <line x1={sourceFloorPos.x} y1={sourceFloorPos.y} x2={sourcePos.x} y2={sourcePos.y} stroke="#5833c7" strokeWidth={1.2} strokeDasharray="2,2" />
          <line x1={receiverFloorPos.x} y1={receiverFloorPos.y} x2={receiverPos.x} y2={receiverPos.y} stroke="#10b981" strokeWidth={1.2} strokeDasharray="2,2" />

          {/* Fuente y Receptor */}
          <circle cx={sourcePos.x} cy={sourcePos.y} r={6} fill="#5833c7" />
          <circle cx={sourcePos.x} cy={sourcePos.y} r={2.5} fill="white" />
          <text x={sourcePos.x} y={sourcePos.y - 9} fill="#5833c7" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="Inter, system-ui">
            Fuente S
          </text>

          <circle cx={receiverPos.x} cy={receiverPos.y} r={5.5} fill="#10b981" />
          <circle cx={receiverPos.x} cy={receiverPos.y} r={2.5} fill="white" />
          <text x={receiverPos.x} y={receiverPos.y - 9} fill="#10b981" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="Inter, system-ui">
            Receptor R
          </text>

          {/* Rayo acústico r */}
          <line x1={sourcePos.x} y1={sourcePos.y} x2={receiverPos.x} y2={receiverPos.y} stroke="#5833c7" strokeWidth={1.5} strokeDasharray="4,3" />
          <rect x={(sourcePos.x + receiverPos.x) / 2 - 20} y={(sourcePos.y + receiverPos.y) / 2 - 8} width={40} height={16} rx={4} fill="rgba(255,255,255,0.9)" stroke="#5833c7" strokeWidth={0.8} />
          <text x={(sourcePos.x + receiverPos.x) / 2} y={(sourcePos.y + receiverPos.y) / 2 + 3.5} fill="#5833c7" fontSize="8.5" fontWeight="800" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
            r={r.toFixed(1)}m
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#121322] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm overflow-hidden transition-colors">
      
      {/* Barra de Controles Compacta */}
      <div className="px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] flex items-center justify-center font-bold">
            <Eye className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[#1d1d1f] dark:text-white">
            Vista 3D (H={H.toFixed(1)}m)
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Techo selector */}
          <div className="flex items-center bg-[#f5f5f7] dark:bg-[#181a28] p-0.5 rounded-lg border border-black/[0.04] dark:border-white/[0.06]">
            <button
              onClick={() => setCeilingMode('translucent')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                ceilingMode === 'translucent'
                  ? 'bg-white dark:bg-[#25283e] text-[#5833c7] dark:text-[#8767f9] shadow-2xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
              title="Techo translúcido"
            >
              Techo █
            </button>
            <button
              onClick={() => setCeilingMode('wireframe')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                ceilingMode === 'wireframe'
                  ? 'bg-white dark:bg-[#25283e] text-[#5833c7] dark:text-[#8767f9] shadow-2xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
              title="Techo alámbrico"
            >
              Alámbrico ╌
            </button>
            <button
              onClick={() => setCeilingMode('hidden')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                ceilingMode === 'hidden'
                  ? 'bg-white dark:bg-[#25283e] text-rose-500 shadow-2xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
              title="Sin techo"
            >
              Sin Techo ✕
            </button>
          </div>

          {/* Vistas */}
          <button
            onClick={() => applyViewPreset('3d')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
              viewPreset === '3d'
                ? 'bg-[#5833c7] text-white'
                : 'bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b]'
            }`}
          >
            3D
          </button>
          <button
            onClick={() => applyViewPreset('top')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
              viewPreset === 'top'
                ? 'bg-[#5833c7] text-white'
                : 'bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b]'
            }`}
          >
            Planta
          </button>

          {/* Auto-rotar */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1 rounded-lg border transition ${
              autoRotate ? 'bg-[#5833c7]/10 text-[#5833c7] border-[#5833c7]/30' : 'bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b] border-black/[0.04]'
            }`}
            title="Auto-rotar"
          >
            {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

          {/* Zoom & Reset */}
          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.2))}
            className="p-1 rounded-lg bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b] hover:text-[#1d1d1f]"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.35, z - 0.2))}
            className="p-1 rounded-lg bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b] hover:text-[#1d1d1f]"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          {/* Reset cámara */}
          <button
            onClick={resetCamera}
            className="p-1 rounded-lg bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b] hover:text-[#1d1d1f]"
            title="Reset cámara"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Botón Maximizar / Modal 3D Grande */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] hover:bg-[#5833c7]/20 text-[10px] font-bold border border-[#5833c7]/30 transition active:scale-95"
            title="Abrir estudio 3D ampliado con parámetros de visualización"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Ampliar</span>
          </button>
        </div>
      </div>

      {/* Viewport SVG 3D con Fondo Blanco en Modo Claro */}
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-[#0c0d18] select-none overflow-hidden transition-colors"
        style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ aspectRatio: `${SVG_W}/${SVG_H}` }}>
          <defs>
            {/* Trama técnica para piso en modo claro */}
            <pattern id="lightFloorTiles3d" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect width="18" height="18" fill="rgba(88, 51, 199, 0.04)" />
              <line x1="0" y1="0" x2="18" y2="0" stroke="rgba(88, 51, 199, 0.12)" strokeWidth="0.5" />
              <line x1="0" y1="0" x2="0" y2="18" stroke="rgba(88, 51, 199, 0.12)" strokeWidth="0.5" />
            </pattern>

            {/* Trama técnica para techo */}
            <pattern id="lightCeilingTiles3d" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="rgba(135, 103, 249, 0.08)" />
              <rect x="1" y="1" width="14" height="14" fill="none" stroke="rgba(88, 51, 199, 0.2)" strokeWidth="0.5" strokeDasharray="2,2" />
            </pattern>
          </defs>

          {/* Fondo blanco luminoso */}
          <rect width={SVG_W} height={SVG_H} fill="#ffffff" className="dark:fill-[#0c0d18]" />

          {/* Grilla 3D proyectada en el piso */}
          {floor3DGrid.map((l, i) => (
            <line
              key={`floor-grid-${i}`}
              x1={l.p1.x} y1={l.p1.y}
              x2={l.p2.x} y2={l.p2.y}
              stroke="rgba(88, 51, 199, 0.2)"
              strokeWidth={0.7}
              className="dark:stroke-[#8767f9]/30"
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Caras ordenadas por profundidad */}
          {faces.map((face) => {
            const style = getFaceStyle(face);
            const isFloor = face.type === 'floor';
            const isCeiling = face.type === 'ceiling';

            return (
              <g key={face.id}>
                {isFloor && (
                  <polygon
                    points={face.points}
                    fill="url(#lightFloorTiles3d)"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {isCeiling && ceilingMode === 'translucent' && (
                  <polygon
                    points={face.points}
                    fill="url(#lightCeilingTiles3d)"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <polygon
                  points={face.points}
                  fill={isFloor ? 'none' : style.fill}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray || 'none'}
                  strokeLinejoin="round"
                  style={{ cursor: 'pointer', transition: 'all 0.1s ease' }}
                  onMouseEnter={() => setHoveredFace(face.id)}
                  onMouseLeave={() => setHoveredFace(null)}
                />
              </g>
            );
          })}

          {/* Pilares verticales en las esquinas */}
          {cornerPillars.map((pillar) => (
            <g key={`pillar-${pillar.index}`} style={{ pointerEvents: 'none' }}>
              <line
                x1={pillar.p0.x} y1={pillar.p0.y}
                x2={pillar.p1.x} y2={pillar.p1.y}
                stroke={ceilingMode === 'hidden' ? 'rgba(88, 51, 199, 0.2)' : 'rgba(88, 51, 199, 0.5)'}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <circle cx={pillar.p0.x} cy={pillar.p0.y} r={2.5} fill="#5833c7" opacity={0.7} />
              {ceilingMode !== 'hidden' && (
                <circle cx={pillar.p1.x} cy={pillar.p1.y} r={2.5} fill="#8767f9" opacity={0.7} />
              )}
            </g>
          ))}

          {/* Distancia Crítica Dc en el suelo */}
          {showRays && (
            <polyline
              points={dcCircle}
              fill="rgba(245, 158, 11, 0.05)"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4,4"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Vástago vertical de Fuente (altura hs) */}
          <line
            x1={sourceFloorPos.x} y1={sourceFloorPos.y}
            x2={sourcePos.x} y2={sourcePos.y}
            stroke="#5833c7" strokeWidth={1.2}
            strokeDasharray="2,2"
            style={{ pointerEvents: 'none' }}
          />
          <circle cx={sourceFloorPos.x} cy={sourceFloorPos.y} r={3} fill="rgba(88, 51, 199, 0.4)" style={{ pointerEvents: 'none' }} />

          {/* Vástago vertical de Receptor (altura hr) */}
          <line
            x1={receiverFloorPos.x} y1={receiverFloorPos.y}
            x2={receiverPos.x} y2={receiverPos.y}
            stroke="#10b981" strokeWidth={1.2}
            strokeDasharray="2,2"
            style={{ pointerEvents: 'none' }}
          />
          <circle cx={receiverFloorPos.x} cy={receiverFloorPos.y} r={3} fill="rgba(16, 185, 129, 0.4)" style={{ pointerEvents: 'none' }} />

          {/* Fuente sonora */}
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={sourcePos.x} cy={sourcePos.y} r={6.5} fill="#5833c7" />
            <circle cx={sourcePos.x} cy={sourcePos.y} r={3} fill="white" />
            <text
              x={sourcePos.x} y={sourcePos.y - 10}
              fill="#5833c7" fontSize="8" fontWeight="700"
              textAnchor="middle" fontFamily="Inter, system-ui"
            >
              Fuente (Lw={sourceReceiver?.lw || 90}dB)
            </text>
          </g>

          {/* Receptor */}
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={receiverPos.x} cy={receiverPos.y} r={5.5} fill="#10b981" />
            <circle cx={receiverPos.x} cy={receiverPos.y} r={2.5} fill="white" />
            <text
              x={receiverPos.x} y={receiverPos.y - 9}
              fill="#10b981" fontSize="8" fontWeight="700"
              textAnchor="middle" fontFamily="Inter, system-ui"
            >
              Receptor
            </text>
          </g>

          {/* Línea de distancia directa r */}
          {showRays && (
            <g style={{ pointerEvents: 'none' }}>
              <line
                x1={sourcePos.x} y1={sourcePos.y}
                x2={receiverPos.x} y2={receiverPos.y}
                stroke="#5833c7" strokeWidth={1.2}
                strokeDasharray="4,3"
              />
              <rect
                x={(sourcePos.x + receiverPos.x) / 2 - 18}
                y={(sourcePos.y + receiverPos.y) / 2 - 7}
                width={36} height={14} rx={3}
                fill="rgba(255,255,255,0.9)" stroke="rgba(88, 51, 199, 0.4)" strokeWidth={0.5}
              />
              <text
                x={(sourcePos.x + receiverPos.x) / 2}
                y={(sourcePos.y + receiverPos.y) / 2 + 3}
                fill="#5833c7" fontSize="7.5" fontWeight="700"
                fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
              >
                r={r.toFixed(1)}m
              </text>
            </g>
          )}

          {/* Etiqueta Piso */}
          {(() => {
            const fc = project3D(centroid.x, centroid.y, 0);
            return (
              <text
                x={fc.x} y={fc.y + 3}
                fill="rgba(88, 51, 199, 0.35)" fontSize="9.5" fontWeight="800"
                textAnchor="middle" fontFamily="Inter, system-ui"
                style={{ pointerEvents: 'none' }}
              >
                PISO ({(geometry?.floorArea || 0).toFixed(1)} m²)
              </text>
            );
          })()}

          {/* Etiqueta Techo */}
          {ceilingMode !== 'hidden' && (() => {
            const cc = project3D(centroid.x, centroid.y, H);
            return (
              <text
                x={cc.x} y={cc.y - 3}
                fill="rgba(88, 51, 199, 0.45)" fontSize="9" fontWeight="800"
                textAnchor="middle" fontFamily="Inter, system-ui"
                style={{ pointerEvents: 'none' }}
              >
                TECHO · H={H.toFixed(1)}m
              </text>
            );
          })()}

          {/* Tooltip HUD al pasar el ratón */}
          {tooltipInfo && (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={14} y={SVG_H - 74} width={200} height={62} rx={10}
                fill="rgba(255,255,255,0.96)" stroke="#5833c7" strokeWidth={1}
                className="dark:fill-[#121424] dark:stroke-[#8767f9]"
              />
              <circle cx={26} cy={SVG_H - 58} r={3} fill="#5833c7" />
              <text x={34} y={SVG_H - 55} fill="#1d1d1f" fontSize="9.5" fontWeight="800" className="dark:fill-white" fontFamily="Inter, system-ui">
                {tooltipInfo.name}
              </text>
              <text x={26} y={SVG_H - 42} fill="#5833c7" fontSize="8" fontWeight="600" className="dark:fill-[#8767f9]" fontFamily="Inter, system-ui">
                {tooltipInfo.material}
              </text>
              <text x={26} y={SVG_H - 29} fill="#86868b" fontSize="7.5" fontWeight="500" fontFamily="'JetBrains Mono', monospace">
                {tooltipInfo.dims} · {tooltipInfo.area} m² · α({selectedBand}Hz)={tooltipInfo.alpha}
              </text>
            </g>
          )}

          {/* Orientación */}
          <text
            x={SVG_W - 10} y={SVG_H - 10}
            fill="rgba(0,0,0,0.3)" fontSize="7.5" fontWeight="600"
            textAnchor="end" fontFamily="'JetBrains Mono', monospace"
            className="dark:fill-white/30"
            style={{ pointerEvents: 'none' }}
          >
            θ {rotX.toFixed(0)}° φ {rotY.toFixed(0)}° · H={H.toFixed(1)}m
          </text>
        </svg>
      </div>

      {/* Info bar inferior compacta */}
      <div className="px-4 py-1.5 border-t border-black/[0.04] dark:border-white/[0.06] bg-[#fafbfc] dark:bg-[#101222] flex flex-wrap items-center justify-between text-[10px] text-[#86868b] dark:text-slate-400 font-medium">
        <div className="flex items-center gap-3">
          <span>r = <strong className="text-[#1d1d1f] dark:text-white font-mono">{r.toFixed(1)}m</strong></span>
          <span>Dc = <strong className="text-amber-600 font-mono">{Dc.toFixed(2)}m</strong></span>
          <span>V = <strong className="text-[#5833c7] dark:text-[#8767f9] font-mono">{(geometry?.volume || 0).toFixed(1)}m³</strong></span>
        </div>
        <span>{vertices.length} paredes</span>
      </div>

      {/* Modal 3D Inmersivo Ampliado */}
      <RoomVisualizerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomPolygon={roomPolygon}
        geometry={geometry}
        dimensions={dimensions}
        sourceReceiver={sourceReceiver}
        criticalDistance={criticalDistance}
        onChangeSourceReceiver={onChangeSourceReceiver}
        materials={materials}
        selectedBand={selectedBand}
      />

    </div>
  );
}
