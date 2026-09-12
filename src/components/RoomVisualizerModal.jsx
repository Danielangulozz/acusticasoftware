import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, RotateCcw, ZoomIn, ZoomOut, Play, Pause, 
  Layers, Radio, Ruler, Compass, Volume2, Mic, Maximize2, Sparkles,
  Grid3X3, Eye, ShieldCheck, Info
} from 'lucide-react';
import { getMaterialById, getMaterialColor } from '../utils/defaultMaterials';
import { polygonCentroid, getEdgeArcPoints, isPolygonCCW } from '../utils/acousticCalculations';

/**
 * Modal Ampliada de Estudio 3D Inmersivo para la Sala Acústica
 * Proporciona un viewport amplio con parámetros de visualización acústica avanzados,
 * inspector interactivo de características de superficies y órbita fluida a 60 FPS.
 */
export default function RoomVisualizerModal({
  isOpen,
  onClose,
  roomPolygon,
  geometry,
  dimensions,
  sourceReceiver,
  criticalDistance,
  onChangeSourceReceiver,
  materials = {},
  selectedBand = 1000,
}) {
  if (!isOpen) return null;

  // Vertices del polígono
  const vertices = useMemo(() => {
    if (roomPolygon?.vertices && roomPolygon.vertices.length >= 3) {
      return roomPolygon.vertices;
    }
    const L = dimensions?.length || 10;
    const W = dimensions?.width || 6;
    return [
      { x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: W }, { x: 0, y: W }
    ];
  }, [roomPolygon, dimensions]);

  const isCCW = useMemo(() => isPolygonCCW(vertices), [vertices]);

  const H = roomPolygon?.height || dimensions?.height || 3.0;
  const r = Math.max(0.1, Number(sourceReceiver?.distance) || 3);
  const Q = Number(sourceReceiver?.directivity) || 1;
  const Dc = Math.max(0.1, Number(criticalDistance) || 2.5);

  // Estados de cámara y visualización
  const [hoveredFace, setHoveredFace] = useState(null);
  const [selectedFaceId, setSelectedFaceId] = useState(null);
  const [rotX, setRotX] = useState(26);
  const [rotY, setRotY] = useState(40);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [showRays, setShowRays] = useState(true);
  const [showDc, setShowDc] = useState(true);
  const [showGrid3D, setShowGrid3D] = useState(true);
  const [gridStep, setGridStep] = useState(1.0); // 1.0m o 0.5m
  const [ceilingMode, setCeilingMode] = useState('translucent'); // 'translucent' | 'wireframe' | 'hidden' | 'solid'
  const [viewPreset, setViewPreset] = useState('3d');
  const [showInspector, setShowInspector] = useState(true);

  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);
  const dragRafRef = useRef(null);
  const pendingDeltaRef = useRef({ x: 0, y: 0, isShift: false });

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto-rotación
  useEffect(() => {
    if (!autoRotate) return;
    let lastTime = performance.now();
    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setRotY((prev) => (prev + delta * 15) % 360);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [autoRotate]);

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
          setRotY((prev) => (prev + dx * 0.6) % 360);
          setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.6)));
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
    setZoom((prev) => Math.max(0.4, Math.min(3.5, prev - e.deltaY * 0.0012)));
  };

  const applyViewPreset = (preset) => {
    setViewPreset(preset);
    setPan({ x: 0, y: 0 });
    setAutoRotate(false);
    switch (preset) {
      case 'top': setRotX(89); setRotY(0); break;
      case 'front': setRotX(0); setRotY(0); break;
      case 'side': setRotX(0); setRotY(90); break;
      default: setRotX(26); setRotY(40); break;
    }
  };

  const resetCamera = () => {
    setRotX(26); setRotY(40); setZoom(1.0); setPan({ x: 0, y: 0 });
    setAutoRotate(false); setViewPreset('3d');
  };

  // Dimensiones del lienzo SVG ampliado
  const SVG_W = 980, SVG_H = 580;
  const CX = SVG_W / 2 + pan.x;
  const CY = SVG_H / 2 + pan.y;

  const centroid = useMemo(() => polygonCentroid(vertices), [vertices]);
  const bb = geometry?.boundingBox || { width: 10, length: 6 };
  const maxDim = Math.max(bb.width || 10, bb.length || 6, H, 4);

  // Proyección 3D
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

    // Escala grande para viewport amplio
    const scale = (340 / maxDim) * zoom;
    const perspective = 850;
    const fov = perspective / (perspective + ry2);

    return {
      x: CX + rx1 * scale * fov,
      y: CY - rz2 * scale * fov,
      depth: ry2,
    };
  }, [rotX, rotY, zoom, CX, CY, centroid, H, maxDim]);

  const xs = useMemo(() => vertices.map(v => v.x), [vertices]);
  const ys = useMemo(() => vertices.map(v => v.y), [vertices]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  // Coordenadas del mundo de Fuente y Receptor
  const sourceWorld = useMemo(() => {
    if (sourceReceiver?.sourcePos) {
      return sourceReceiver.sourcePos;
    }
    let sx = centroid.x, sy = centroid.y, sz = 1.5;
    if (Q === 8) { sx = minX + 0.35; sy = minY + 0.35; sz = 0.2; }
    else if (Q === 4) { sx = centroid.x; sy = minY + 0.25; sz = 0.2; }
    else if (Q === 2) { sx = centroid.x; sy = minY + 0.65; sz = 0.2; }
    else { sx = centroid.x - Math.min(1.5, (maxX - minX) * 0.2); sy = centroid.y; sz = 1.5; }
    return { x: sx, y: sy, z: sz };
  }, [sourceReceiver, Q, centroid, minX, maxX, minY]);

  const receiverWorld = useMemo(() => {
    if (sourceReceiver?.receiverPos) {
      return sourceReceiver.receiverPos;
    }
    const maxSpan = Math.max(1, (maxX - minX) * 0.85);
    const effectiveDist = Math.min(r, maxSpan);
    let rx = sourceWorld.x + effectiveDist;
    let ry = sourceWorld.y;
    if (rx > maxX - 0.5) {
      rx = maxX - 0.6;
      ry = Math.min(maxY - 0.6, sourceWorld.y + Math.max(0.4, effectiveDist * 0.35));
    }
    return { x: rx, y: ry, z: 1.2 };
  }, [sourceReceiver, sourceWorld, r, minX, maxX, maxY]);

  const sourcePos = useMemo(() => project3D(sourceWorld.x, sourceWorld.y, sourceWorld.z), [sourceWorld, project3D]);
  const sourceFloorPos = useMemo(() => project3D(sourceWorld.x, sourceWorld.y, 0), [sourceWorld, project3D]);
  
  const receiverPos = useMemo(() => project3D(receiverWorld.x, receiverWorld.y, receiverWorld.z), [receiverWorld, project3D]);
  const receiverFloorPos = useMemo(() => project3D(receiverWorld.x, receiverWorld.y, 0), [receiverWorld, project3D]);

  // Caras poligonales con soporte para arcos curvos continuos
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
      area: geometry?.floorArea || 0,
      dimLabel: 'Planta base',
    });

    // Techo (z = H)
    if (ceilingMode !== 'hidden') {
      const ceilingVerts3D = sampledPerimeter.map(v => project3D(v.x, v.y, H));
      const ceilingCenterDepth = ceilingVerts3D.reduce((s, p) => s + p.depth, 0) / Math.max(1, ceilingVerts3D.length);
      allFaces.push({
        id: 'ceiling',
        name: `Techo (H = ${H.toFixed(1)}m)`,
        points: ceilingVerts3D.map(p => `${p.x},${p.y}`).join(' '),
        rawPoints: ceilingVerts3D,
        depth: ceilingCenterDepth,
        type: 'ceiling',
        area: geometry?.floorArea || 0,
        dimLabel: `Elevado a H = ${H.toFixed(1)}m`,
      });
    }

    // Paredes extruidas (arcos continuos sin persianas)
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

        // Base y coronamiento continuo
        const botPoints = arcPts.map(pt => project3D(pt.x, pt.y, 0));
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

  // Grilla 3D proyectada en el suelo
  const grid3DLines = useMemo(() => {
    if (!showGrid3D) return [];
    const lines = [];
    const step = gridStep;

    const startX = Math.floor(minX);
    const endX = Math.ceil(maxX);
    const startY = Math.floor(minY);
    const endY = Math.ceil(maxY);

    // Líneas X
    for (let x = startX; x <= endX; x += step) {
      const p1 = project3D(x, startY, 0.01);
      const p2 = project3D(x, endY, 0.01);
      lines.push({ p1, p2, val: x, axis: 'x' });
    }
    // Líneas Y
    for (let y = startY; y <= endY; y += step) {
      const p1 = project3D(startX, y, 0.01);
      const p2 = project3D(endX, y, 0.01);
      lines.push({ p1, p2, val: y, axis: 'y' });
    }
    return lines;
  }, [showGrid3D, gridStep, minX, maxX, minY, maxY, project3D]);

  // Disco de distancia crítica Dc
  const dcPoints = useMemo(() => {
    const steps = 48;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = sourceWorld.x + Dc * Math.cos(angle);
      const py = sourceWorld.y + Dc * Math.sin(angle);
      const p = project3D(px, py, 0.02);
      pts.push(`${p.x},${p.y}`);
    }
    return pts.join(' ');
  }, [sourceWorld, Dc, project3D]);

  // Estilo cromático con soporte para selección e inspección
  const getFaceStyle = (face) => {
    const isHovered = hoveredFace === face.id;
    const isSelected = selectedFaceId === face.id;
    const isActive = isHovered || isSelected;
    const matConfig = materials?.[face.id];
    const matColor = matConfig ? getMaterialColor(matConfig.materialId) : null;

    if (face.type === 'floor') {
      return {
        fill: isActive ? 'rgba(88, 51, 199, 0.22)' : 'rgba(88, 51, 199, 0.08)',
        stroke: isSelected ? '#f59e0b' : isActive ? '#5833c7' : 'rgba(88, 51, 199, 0.5)',
        strokeWidth: isActive ? 2.8 : 1.5,
      };
    }

    if (face.type === 'ceiling') {
      if (ceilingMode === 'wireframe') {
        return {
          fill: 'none',
          stroke: isSelected ? '#f59e0b' : isActive ? '#8767f9' : 'rgba(88, 51, 199, 0.7)',
          strokeWidth: isActive ? 2.8 : 1.5,
          strokeDasharray: '4,4',
        };
      }
      if (ceilingMode === 'solid') {
        return {
          fill: isActive ? 'rgba(135, 103, 249, 0.85)' : 'rgba(88, 51, 199, 0.65)',
          stroke: isSelected ? '#f59e0b' : '#8767f9',
          strokeWidth: isActive ? 2.8 : 2,
        };
      }
      return {
        fill: isActive ? 'rgba(135, 103, 249, 0.35)' : 'rgba(88, 51, 199, 0.14)',
        stroke: isSelected ? '#f59e0b' : isActive ? '#8767f9' : 'rgba(88, 51, 199, 0.75)',
        strokeWidth: isActive ? 2.8 : 1.5,
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
      fill: isActive ? `rgba(${r_},${g_},${b_},0.55)` : `rgba(${r_},${g_},${b_},0.18)`,
      stroke: isSelected ? '#f59e0b' : isActive ? `rgba(${r_},${g_},${b_},0.98)` : `rgba(${r_},${g_},${b_},0.65)`,
      strokeWidth: isActive ? 2.8 : 1.4,
    };
  };

  const activeFaceInfo = useMemo(() => {
    const targetId = selectedFaceId || hoveredFace;
    if (!targetId) return null;
    const face = faces.find(f => f.id === targetId);
    if (!face) return null;
    const matConfig = materials?.[face.id];
    const matInfo = matConfig ? getMaterialById(matConfig.materialId) : null;
    const matColor = matConfig ? getMaterialColor(matConfig.materialId) : null;
    const alpha = matConfig?.coefficients?.[selectedBand] ?? '—';
    return {
      id: face.id,
      name: face.name,
      material: matInfo?.name || 'Manual / Personalizado',
      color: matColor?.hex || '#5833c7',
      area: (face.area || 0).toFixed(1),
      dims: face.dimLabel,
      alpha: typeof alpha === 'number' ? alpha.toFixed(2) : alpha,
      type: face.type,
      coefficients: matConfig?.coefficients || {},
    };
  }, [selectedFaceId, hoveredFace, faces, materials, selectedBand]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#0e101d] rounded-2xl md:rounded-3xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl w-[96vw] max-w-7xl h-[92vh] max-h-[820px] flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-white/90 dark:bg-[#121424]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] flex items-center justify-center font-bold">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
                  Estudio 3D Inmersivo de Sala Acústica
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#5833c7]/10 text-[#5833c7] dark:text-[#8767f9] text-[10px] font-bold font-mono">
                  H={H.toFixed(1)}m · V={(geometry?.volume || 0).toFixed(1)}m³
                </span>
              </div>
              <p className="text-xs text-[#86868b] dark:text-slate-400">
                Órbita fluida a 60 FPS, inspección de materiales, áreas acústicas y cotas ISO 3382
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Inspector de Superficies */}
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                showInspector
                  ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30'
                  : 'bg-white dark:bg-[#181a2e] text-[#86868b] border-black/[0.08] dark:border-white/[0.08] hover:text-[#1d1d1f]'
              }`}
              title={showInspector ? "Ocultar panel de inspector lateral" : "Ver inspector de superficies"}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showInspector ? 'Ocultar Inspector' : 'Ver Inspector'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#5833c7]/15 text-[10px] font-mono">
                {faces.length}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
              title="Cerrar modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Herramientas Superior */}
        <div className="px-5 py-2 bg-[#fbfbfd] dark:bg-[#141628] border-b border-black/[0.04] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          {/* Vistas Canónicas */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#1c1e34] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
            <span className="px-2 text-[10px] font-bold text-[#86868b] dark:text-slate-400 uppercase">Cámara:</span>
            {['3d', 'top', 'front', 'side'].map((preset) => (
              <button
                key={preset}
                onClick={() => applyViewPreset(preset)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition capitalize ${
                  viewPreset === preset
                    ? 'bg-[#5833c7] text-white shadow-2xs'
                    : 'text-[#86868b] dark:text-slate-300 hover:text-[#1d1d1f]'
                }`}
              >
                {preset === 'top' ? 'Planta' : preset === 'front' ? 'Frente' : preset === 'side' ? 'Perfil' : '3D'}
              </button>
            ))}
          </div>

          {/* Selector de Techo */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#1c1e34] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
            <span className="px-2 text-[10px] font-bold text-[#86868b] dark:text-slate-400 uppercase">Techo:</span>
            {[
              { id: 'translucent', label: 'Translúcido' },
              { id: 'wireframe', label: 'Alámbrico' },
              { id: 'solid', label: 'Sólido' },
              { id: 'hidden', label: 'Oculto' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setCeilingMode(m.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                  ceilingMode === m.id
                    ? 'bg-[#5833c7] text-white'
                    : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Toggles Acústicos */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGrid3D(!showGrid3D)}
              className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 transition ${
                showGrid3D
                  ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30'
                  : 'bg-white dark:bg-[#1c1e34] text-[#86868b] border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Grilla</span>
            </button>

            <button
              onClick={() => setShowRays(!showRays)}
              className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 transition ${
                showRays
                  ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30'
                  : 'bg-white dark:bg-[#1c1e34] text-[#86868b] border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Rayo (r)</span>
            </button>

            <button
              onClick={() => setShowDc(!showDc)}
              className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 transition ${
                showDc
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  : 'bg-white dark:bg-[#1c1e34] text-[#86868b] border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Dc</span>
            </button>

            {/* Auto-rotar */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-1.5 rounded-xl border transition ${
                autoRotate
                  ? 'bg-[#5833c7]/15 text-[#5833c7] border-[#5833c7]/30'
                  : 'bg-white dark:bg-[#1c1e34] text-[#86868b] border-black/[0.06] dark:border-white/[0.08]'
              }`}
              title="Auto-rotación fluida"
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setZoom(z => Math.min(3.5, z + 0.2))}
                className="p-1.5 rounded-lg bg-white dark:bg-[#1c1e34] text-[#86868b] hover:text-[#1d1d1f]"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}
                className="p-1.5 rounded-lg bg-white dark:bg-[#1c1e34] text-[#86868b] hover:text-[#1d1d1f]"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetCamera}
                className="p-1.5 rounded-lg bg-white dark:bg-[#1c1e34] text-[#86868b] hover:text-[#1d1d1f]"
                title="Restablecer ángulo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Cuerpo Principal: Viewport 3D AMPLIO a la izquierda + Inspector colapsable a la derecha */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          
          {/* Viewport SVG 3D Ampliado Principal (HERO) */}
          <div
            ref={containerRef}
            className="flex-1 h-full min-w-0 relative bg-white dark:bg-[#0a0c16] select-none overflow-hidden flex items-center justify-center"
            style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full max-h-full"
            >
              <defs>
                <linearGradient id="modalGlowBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f8f9fe" />
                </linearGradient>
              </defs>

              <rect width={SVG_W} height={SVG_H} fill="url(#modalGlowBg)" className="dark:fill-[#0a0c16]" />

              {/* Grilla 3D proyectada en el piso */}
              {grid3DLines.map((l, i) => (
                <line
                  key={`grid3d-${i}`}
                  x1={l.p1.x} y1={l.p1.y}
                  x2={l.p2.x} y2={l.p2.y}
                  stroke="rgba(88, 51, 199, 0.18)"
                  strokeWidth={0.8}
                  className="dark:stroke-[#8767f9]/25"
                  style={{ pointerEvents: 'none' }}
                />
              ))}

              {/* Caras ordenadas por profundidad */}
              {faces.map((face) => {
                const style = getFaceStyle(face);
                return (
                  <polygon
                    key={face.id}
                    points={face.points}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.strokeDasharray || 'none'}
                    strokeLinejoin="round"
                    style={{ cursor: 'pointer', transition: 'all 0.12s ease' }}
                    onMouseEnter={() => setHoveredFace(face.id)}
                    onMouseLeave={() => setHoveredFace(null)}
                    onClick={() => setSelectedFaceId(prev => prev === face.id ? null : face.id)}
                  />
                );
              })}

              {/* Distancia Crítica Dc en el piso */}
              {showDc && (
                <polyline
                  points={dcPoints}
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5,4"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Vástago vertical de Fuente (altura hs = 1.5m) */}
              <line
                x1={sourceFloorPos.x} y1={sourceFloorPos.y}
                x2={sourcePos.x} y2={sourcePos.y}
                stroke="#5833c7" strokeWidth={1.5}
                strokeDasharray="2,2"
                style={{ pointerEvents: 'none' }}
              />
              <circle cx={sourceFloorPos.x} cy={sourceFloorPos.y} r={4} fill="rgba(88, 51, 199, 0.3)" style={{ pointerEvents: 'none' }} />

              {/* Vástago vertical de Receptor (altura hr = 1.2m) */}
              <line
                x1={receiverFloorPos.x} y1={receiverFloorPos.y}
                x2={receiverPos.x} y2={receiverPos.y}
                stroke="#10b981" strokeWidth={1.5}
                strokeDasharray="2,2"
                style={{ pointerEvents: 'none' }}
              />
              <circle cx={receiverFloorPos.x} cy={receiverFloorPos.y} r={4} fill="rgba(16, 185, 129, 0.3)" style={{ pointerEvents: 'none' }} />

              {/* Fuente Sonora */}
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={sourcePos.x} cy={sourcePos.y} r={8} fill="#5833c7" />
                <circle cx={sourcePos.x} cy={sourcePos.y} r={3.5} fill="white" />
                <rect
                  x={sourcePos.x - 45} y={sourcePos.y - 24}
                  width={90} height={16} rx={4}
                  fill="rgba(88, 51, 199, 0.95)"
                />
                <text
                  x={sourcePos.x} y={sourcePos.y - 13}
                  fill="white" fontSize="9" fontWeight="700"
                  textAnchor="middle" fontFamily="Inter, system-ui"
                >
                  Fuente ({sourceReceiver?.lw || 90}dB, Q={Q})
                </text>
              </g>

              {/* Receptor */}
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={receiverPos.x} cy={receiverPos.y} r={7} fill="#10b981" />
                <circle cx={receiverPos.x} cy={receiverPos.y} r={3} fill="white" />
                <rect
                  x={receiverPos.x - 30} y={receiverPos.y - 22}
                  width={60} height={15} rx={4}
                  fill="rgba(16, 185, 129, 0.95)"
                />
                <text
                  x={receiverPos.x} y={receiverPos.y - 11}
                  fill="white" fontSize="9" fontWeight="700"
                  textAnchor="middle" fontFamily="Inter, system-ui"
                >
                  Receptor (h=1.2m)
                </text>
              </g>

              {/* Rayo Directo */}
              {showRays && (
                <g style={{ pointerEvents: 'none' }}>
                  <line
                    x1={sourcePos.x} y1={sourcePos.y}
                    x2={receiverPos.x} y2={receiverPos.y}
                    stroke="#5833c7" strokeWidth={1.8}
                    strokeDasharray="5,4"
                  />
                  <rect
                    x={(sourcePos.x + receiverPos.x) / 2 - 24}
                    y={(sourcePos.y + receiverPos.y) / 2 - 9}
                    width={48} height={18} rx={5}
                    fill="rgba(255,255,255,0.95)" stroke="#5833c7" strokeWidth={1}
                  />
                  <text
                    x={(sourcePos.x + receiverPos.x) / 2}
                    y={(sourcePos.y + receiverPos.y) / 2 + 4}
                    fill="#5833c7" fontSize="9" fontWeight="800"
                    fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
                  >
                    r = {r.toFixed(1)}m
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Panel Lateral: Inspector de Superficies y Características (Colapsable) */}
          {showInspector && (
            <div className="w-72 lg:w-80 shrink-0 h-full border-l border-black/[0.06] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#111322] flex flex-col min-h-0 overflow-hidden transition-all">
              
              <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
                  <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    Superficies ({faces.length})
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#5833c7]/10 text-[#5833c7] dark:text-[#8767f9] text-[10px] font-bold font-mono">
                  α ({selectedBand} Hz)
                </span>
              </div>

              {/* Lista Scrollable de Superficies */}
              <div className="flex-1 min-h-0 p-2.5 overflow-y-auto space-y-1.5">
                {faces.map((face) => {
                  const matConfig = materials?.[face.id];
                  const matInfo = matConfig ? getMaterialById(matConfig.materialId) : null;
                  const matColor = matConfig ? getMaterialColor(matConfig.materialId) : null;
                  const alpha = matConfig?.coefficients?.[selectedBand] ?? '—';
                  const isSelected = selectedFaceId === face.id;
                  const isHovered = hoveredFace === face.id;

                  return (
                    <div
                      key={`inspector-${face.id}`}
                      onClick={() => setSelectedFaceId(prev => prev === face.id ? null : face.id)}
                      onMouseEnter={() => setHoveredFace(face.id)}
                      onMouseLeave={() => setHoveredFace(null)}
                      className={`p-2 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-[#5833c7]/15 dark:bg-[#8767f9]/20 border-[#f59e0b] shadow-xs'
                          : isHovered
                          ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/10 border-[#5833c7]/40'
                          : 'bg-white dark:bg-[#181a2e] border-black/[0.06] dark:border-white/[0.06] hover:border-[#5833c7]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: matColor?.hex || '#5833c7' }}
                          />
                          <span className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                            {face.name}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded bg-black/[0.04] dark:bg-white/[0.06] text-[10px] font-mono font-bold text-[#5833c7] dark:text-[#8767f9] shrink-0">
                          α={typeof alpha === 'number' ? alpha.toFixed(2) : alpha}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-[#86868b] dark:text-slate-400">
                        <span className="truncate max-w-[140px]" title={matInfo?.name || 'Material'}>
                          {matInfo?.name || 'Personalizado'}
                        </span>
                        <span className="font-mono font-semibold text-[#1d1d1f] dark:text-slate-200">
                          {(face.area || 0).toFixed(1)} m²
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ficha Detallada de la Superficie Activa */}
              {activeFaceInfo && (
                <div className="p-3 shrink-0 bg-white dark:bg-[#141628] border-t border-black/[0.06] dark:border-white/[0.08] text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1d1d1f] dark:text-white text-[11px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeFaceInfo.color }} />
                      {activeFaceInfo.name}
                    </span>
                    <span className="text-[10px] text-[#86868b] font-mono">
                      {activeFaceInfo.dims}
                    </span>
                  </div>

                  {/* Espectro de coeficientes de absorción */}
                  <div className="pt-0.5">
                    <span className="text-[9px] font-semibold text-[#86868b] uppercase block mb-1">
                      Coeficientes de absorción α:
                    </span>
                    <div className="grid grid-cols-6 gap-1 text-center font-mono text-[9px]">
                      {[125, 250, 500, 1000, 2000, 4000].map(freq => (
                        <div
                          key={`modal-band-${freq}`}
                          className={`p-1 rounded ${
                            freq === selectedBand
                              ? 'bg-[#5833c7] text-white font-bold'
                              : 'bg-black/[0.03] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-slate-300'
                          }`}
                        >
                          <div className="text-[8px] text-[#86868b] font-sans">{freq}</div>
                          <div>{(activeFaceInfo.coefficients[freq] ?? 0.05).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Modal con Métricas Físicas */}
        <div className="px-5 py-2.5 shrink-0 bg-[#fbfbfd] dark:bg-[#121424] border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between text-xs text-[#86868b] dark:text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span>r = <strong className="text-[#1d1d1f] dark:text-white font-bold">{r.toFixed(2)} m</strong></span>
            <span>Dc = <strong className="text-amber-600 font-bold">{Dc.toFixed(2)} m</strong></span>
            <span>Volumen V = <strong className="text-[#5833c7] dark:text-[#8767f9] font-bold">{(geometry?.volume || 0).toFixed(1)} m³</strong></span>
            <span>Superficie S = <strong className="text-[#1d1d1f] dark:text-white font-bold">{(geometry?.totalSurfaceArea || 0).toFixed(1)} m²</strong></span>
          </div>
          <span className="text-[11px] font-sans text-slate-500">
            Arrastra para orbitar en 3D · Clic en cualquier cara para inspección
          </span>
        </div>

      </div>
    </div>
  );
}
