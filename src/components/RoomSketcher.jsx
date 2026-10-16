import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  Plus, Minus, RotateCcw, RotateCw, Grid3X3, Maximize2, Move,
  Pentagon, Square, Hexagon, Triangle, Layers, Ruler,
  Radio, Volume2, Mic, Check, ZoomIn, ZoomOut, Crosshair,
  MousePointer, Hand, Undo2, Redo2, Download, Upload, CheckCircle2,
  PenTool, Magnet, Compass, Trash2, Eye, EyeOff, Sparkles, AlertTriangle,
  HelpCircle, Terminal, AlignCenter, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';
import { polygonArea, polygonCentroid, getEdgeArcPoints, isPolygonCCW } from '../utils/acousticCalculations';
import { getMaterialById, getMaterialColor } from '../utils/defaultMaterials';
import {
  screenAngleDeg,
  polarPoint,
  applyOrtho,
  projectOnSegment,
  parseDynamicInput,
  polygonSelfIntersects,
  segmentCrossesPolyline,
  findSnap,
  rectangleFromCorners,
  dist,
  round2,
  cleanPoint,
  splitSegmentAtPoint,
  moveEdgeParallel,
  rotatePolygon,
  nudgeVertex,
  getEdgeNormal,
  centerPolygonAtOrigin,
  findSmartStrokeSnap,
  getAdaptiveGridStep,
  pointInPolygon,
  findSafeInteriorPoint,
} from '../utils/sketchGeometry';

// Presets arquitectónicos
const SHAPE_PRESETS = [
  {
    id: 'rectangle',
    name: 'Rectangular',
    icon: Square,
    vertices: (L, W) => [
      { x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: W }, { x: 0, y: W }
    ],
  },
  {
    id: 'l_shape',
    name: 'Forma L',
    icon: Pentagon,
    vertices: (L, W) => {
      const hL = Number((L * 0.5).toFixed(1)), hW = Number((W * 0.5).toFixed(1));
      return [
        { x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: hW },
        { x: hL, y: hW }, { x: hL, y: W }, { x: 0, y: W }
      ];
    },
  },
  {
    id: 't_shape',
    name: 'Forma T',
    icon: Hexagon,
    vertices: (L, W) => {
      const qL = Number((L * 0.25).toFixed(1)), threeQL = Number((L * 0.75).toFixed(1)), hW = Number((W * 0.4).toFixed(1));
      return [
        { x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: hW },
        { x: threeQL, y: hW }, { x: threeQL, y: W }, { x: qL, y: W },
        { x: qL, y: hW }, { x: 0, y: hW }
      ];
    },
  },
  {
    id: 'u_shape',
    name: 'Forma U',
    icon: Hexagon,
    vertices: (L, W) => {
      const qL = Number((L * 0.25).toFixed(1)), threeQL = Number((L * 0.75).toFixed(1)), hW = Number((W * 0.5).toFixed(1));
      return [
        { x: 0, y: 0 }, { x: qL, y: 0 }, { x: qL, y: hW },
        { x: threeQL, y: hW }, { x: threeQL, y: 0 }, { x: L, y: 0 },
        { x: L, y: W }, { x: 0, y: W }
      ];
    },
  },
  {
    id: 'trapezoid',
    name: 'Trapezoidal',
    icon: Triangle,
    vertices: (L, W) => {
      const offset = Number((L * 0.15).toFixed(1));
      return [
        { x: offset, y: 0 }, { x: Number((L - offset).toFixed(1)), y: 0 },
        { x: L, y: W }, { x: 0, y: W }
      ];
    },
  },
];

/**
 * RoomSketcher — Editor 2D Arquitectónico de Planta Libre con Modo CAD
 * Herramientas de trazo de muros (L), rectángulos (R), líneas guía (X) y medición (M).
 * Con imanes OSNAP, modo ortogonal (F8/Shift), entrada dinámica y validación de cierre.
 */
export default function RoomSketcher({
  roomPolygon,
  onChangePolygon,
  geometry,
  materials,
  onChangeMaterials,
  sourceReceiver,
  onChangeSourceReceiver,
  roomType = 'speech',
  onChangeRoomType,
  modalSettings,
  onChangeModalSettings,
  includeAirAbsorption = true,
  onChangeIncludeAirAbsorption,
  selectedBand = 1000,
  onChangeSelectedBand,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const dynamicInputRef = useRef(null);

  // --- HERRAMIENTAS CAD ---
  // 'select' | 'wall' | 'rect' | 'guide' | 'measure'
  const [activeTool, setActiveTool] = useState('select');
  const [isOrtho, setIsOrtho] = useState(false);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [snapToGeometry, setSnapToGeometry] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showAcousticNodes, setShowAcousticNodes] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

  // Puntos en proceso de trazado
  const [drawPoints, setDrawPoints] = useState([]);
  // Extremo activo desde el cual se extiende el trazo: 'end' (Pn) | 'start' (P1) | null (soltado/libre)
  const [activeAnchor, setActiveAnchor] = useState('end');
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });
  const [currentSnap, setCurrentSnap] = useState({ point: { x: 0, y: 0 }, type: 'none' });
  const [dynamicInputStr, setDynamicInputStr] = useState('');
  const [dynamicInputError, setDynamicInputError] = useState(null);
  const [measuredResult, setMeasuredResult] = useState(null);
  const [activeTrackingGuide, setActiveTrackingGuide] = useState(null);

  // Estados de edición existentes
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [draggingEntity, setDraggingEntity] = useState(null); // 'source' | 'receiver' | null
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [activePresetId, setActivePresetId] = useState('rectangle');
  const [editorTab, setEditorTab] = useState('walls'); // 'walls' | 'coords'
  const [isEditorExpanded, setIsEditorExpanded] = useState(true);

  // Edición interactiva inline de longitud de pared (doble clic en cota)
  const [editingEdgeIdx, setEditingEdgeIdx] = useState(null);
  const [editingLengthStr, setEditingLengthStr] = useState('');

  // --- FASE 2 & 3 CAD: Selección de vértice, división exacta, línea de comandos y modal ---
  const [selectedVertexIdx, setSelectedVertexIdx] = useState(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCommandLine, setShowCommandLine] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [edgeHoverSplitPoint, setEdgeHoverSplitPoint] = useState(null);
  const commandInputRef = useRef(null);

  // Pan con arrastre del canvas
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasPannedRef = useRef(false);

  // Refs para throttle con requestAnimationFrame
  const rafRef = useRef(null);
  const entityRafRef = useRef(null);
  const wheelRafRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (entityRafRef.current) cancelAnimationFrame(entityRafRef.current);
      if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
    };
  }, []);

  const vertices = roomPolygon?.vertices || [];
  const height = roomPolygon?.height || 3.0;
  const curvatures = useMemo(() => roomPolygon?.curvatures || {}, [roomPolygon?.curvatures]);
  const guides = useMemo(() => roomPolygon?.guides || [], [roomPolygon?.guides]);
  const isCCW = useMemo(() => isPolygonCCW(vertices), [vertices]);

  // --- HISTORIAL DE DESHACER / REHACER (CTRL + Z / CTRL + Y) ---
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const fileInputRef = useRef(null);

  const pushHistory = useCallback(() => {
    const snapshot = {
      roomPolygon: JSON.parse(JSON.stringify(roomPolygon)),
      activePresetId,
    };
    historyRef.current = [...historyRef.current.slice(-49), snapshot];
    redoRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [roomPolygon, activePresetId]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const currentSnapshot = {
      roomPolygon: JSON.parse(JSON.stringify(roomPolygon)),
      activePresetId,
    };
    redoRef.current.push(currentSnapshot);
    setCanRedo(true);

    const prev = historyRef.current.pop();
    setCanUndo(historyRef.current.length > 0);

    if (prev?.roomPolygon) {
      onChangePolygon(prev.roomPolygon);
      setActivePresetId(prev.activePresetId || 'custom');
      setStatusMsg('Deshecho (Ctrl + Z)');
      setTimeout(() => setStatusMsg(null), 2200);
    }
  }, [roomPolygon, activePresetId, onChangePolygon]);

  const handleRedo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const currentSnapshot = {
      roomPolygon: JSON.parse(JSON.stringify(roomPolygon)),
      activePresetId,
    };
    historyRef.current.push(currentSnapshot);
    setCanUndo(true);

    const next = redoRef.current.pop();
    setCanRedo(redoRef.current.length > 0);

    if (next?.roomPolygon) {
      onChangePolygon(next.roomPolygon);
      setActivePresetId(next.activePresetId || 'custom');
      setStatusMsg('Rehecho (Ctrl + Y)');
      setTimeout(() => setStatusMsg(null), 2200);
    }
  }, [roomPolygon, activePresetId, onChangePolygon]);

  // Controles de zoom y paneo interactivo 2D
  const [userZoom, setUserZoom] = useState(1.0);
  const [userPan, setUserPan] = useState({ x: 0, y: 0 });

  // Bounding box de vértices y centroide
  const xs = useMemo(() => vertices.map(v => v.x), [vertices]);
  const ys = useMemo(() => vertices.map(v => v.y), [vertices]);
  const minX = vertices.length ? Math.min(...xs) : 0;
  const maxX = vertices.length ? Math.max(...xs) : 10;
  const minY = vertices.length ? Math.min(...ys) : 0;
  const maxY = vertices.length ? Math.max(...ys) : 6;
  const centroid = useMemo(() => polygonCentroid(vertices), [vertices]);

  // Posiciones de Fuente y Receptor (garantizadas dentro del recinto)
  const sourcePos = useMemo(() => {
    if (sourceReceiver?.sourcePos && (vertices.length < 3 || pointInPolygon(sourceReceiver.sourcePos, vertices))) {
      return sourceReceiver.sourcePos;
    }
    return findSafeInteriorPoint(vertices, sourceReceiver?.sourcePos);
  }, [sourceReceiver?.sourcePos, vertices]);

  const receiverPos = useMemo(() => {
    const initialDist = Math.min(3.0, Math.max(1.0, sourceReceiver?.distance || 3.0));
    if (sourceReceiver?.receiverPos && (vertices.length < 3 || pointInPolygon(sourceReceiver.receiverPos, vertices))) {
      return sourceReceiver.receiverPos;
    }
    const candidateR = {
      x: Number((sourcePos.x + initialDist).toFixed(2)),
      y: Number(sourcePos.y.toFixed(2)),
      z: 1.2,
    };
    if (vertices.length < 3 || pointInPolygon(candidateR, vertices)) {
      return candidateR;
    }
    return findSafeInteriorPoint(vertices, candidateR);
  }, [sourceReceiver?.receiverPos, sourcePos, sourceReceiver?.distance, vertices]);

  const isSourceInside = useMemo(() => {
    if (!vertices || vertices.length < 3) return true;
    return pointInPolygon(sourcePos, vertices);
  }, [sourcePos, vertices]);

  const isReceiverInside = useMemo(() => {
    if (!vertices || vertices.length < 3) return true;
    return pointInPolygon(receiverPos, vertices);
  }, [receiverPos, vertices]);

  const handleRecenterNodes = useCallback(() => {
    if (!vertices || vertices.length < 3 || !onChangeSourceReceiver) return;
    const safeS = findSafeInteriorPoint(vertices);
    const candidateR = { x: Number((safeS.x + 2.0).toFixed(2)), y: safeS.y, z: 1.2 };
    const safeR = findSafeInteriorPoint(vertices, candidateR);
    const distR = Math.hypot(safeR.x - safeS.x, safeR.y - safeS.y);
    onChangeSourceReceiver({
      ...sourceReceiver,
      sourcePos: safeS,
      receiverPos: safeR,
      distance: Number(distR.toFixed(2)),
    });
  }, [vertices, sourceReceiver, onChangeSourceReceiver]);

  // Puntos totales visibles para encuadre
  const allBoundsPoints = useMemo(() => {
    const pts = [...vertices];
    if (sourcePos) pts.push(sourcePos);
    if (receiverPos) pts.push(receiverPos);
    drawPoints.forEach(p => pts.push(p));
    guides.forEach(g => { pts.push(g.a); pts.push(g.b); });
    
    if (vertices.length >= 3) {
      for (let i = 0; i < vertices.length; i++) {
        const bulge = curvatures[i];
        if (bulge && Math.abs(bulge) > 0.05) {
          const v0 = vertices[i];
          const v1 = vertices[(i + 1) % vertices.length];
          const arcPts = getEdgeArcPoints(v0, v1, bulge, 12, isCCW);
          pts.push(...arcPts);
        }
      }
    }
    return pts;
  }, [vertices, sourcePos, receiverPos, drawPoints, guides, curvatures, isCCW]);

  const { bMinX, bMaxX, bMinY, bMaxY } = useMemo(() => {
    const bXs = allBoundsPoints.map(p => p.x);
    const bYs = allBoundsPoints.map(p => p.y);
    return {
      bMinX: bXs.length ? Math.min(...bXs) : 0,
      bMaxX: bXs.length ? Math.max(...bXs) : 10,
      bMinY: bYs.length ? Math.min(...bYs) : 0,
      bMaxY: bYs.length ? Math.max(...bYs) : 6,
    };
  }, [allBoundsPoints]);

  const CANVAS_W = 800;
  const CANVAS_H = 500;

  const { scale, offsetX, offsetY, minXVal, maxXVal, minYVal, maxYVal } = useMemo(() => {
    if (!vertices.length) {
      return { scale: 50, offsetX: 100, offsetY: 80, minXVal: -2, maxXVal: 12, minYVal: -2, maxYVal: 8 };
    }
    
    const spanX = Math.max(3.2, bMaxX - bMinX);
    const spanY = Math.max(2.6, bMaxY - bMinY);
    const marginX = Math.max(2.0, spanX * 0.2);
    const marginY = Math.max(2.0, spanY * 0.2);

    const totalX = spanX + 2 * marginX;
    const totalY = spanY + 2 * marginY;

    const scaleX = CANVAS_W / totalX;
    const scaleY = CANVAS_H / totalY;
    const s = Math.min(scaleX, scaleY);

    const geoCenterX = (bMinX + bMaxX) / 2;
    const geoCenterY = (bMinY + bMaxY) / 2;

    const ox = CANVAS_W / 2 - geoCenterX * s;
    const oy = CANVAS_H / 2 - geoCenterY * s;

    return {
      scale: s,
      offsetX: ox,
      offsetY: oy,
      minXVal: bMinX - marginX,
      maxXVal: bMaxX + marginX,
      minYVal: bMinY - marginY,
      maxYVal: bMaxY + marginY,
    };
  }, [vertices.length, bMinX, bMaxX, bMinY, bMaxY]);

  const toScreen = useCallback((wx, wy) => {
    const baseSx = wx * scale + offsetX;
    const baseSy = wy * scale + offsetY;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    return {
      x: cx + (baseSx - cx) * userZoom + userPan.x,
      y: cy + (baseSy - cy) * userZoom + userPan.y,
    };
  }, [scale, offsetX, offsetY, userZoom, userPan]);

  const toWorld = useCallback((sx, sy) => {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const baseSx = cx + (sx - cx - userPan.x) / userZoom;
    const baseSy = cy + (sy - cy - userPan.y) / userZoom;
    return {
      x: (baseSx - offsetX) / scale,
      y: (baseSy - offsetY) / scale,
    };
  }, [scale, offsetX, offsetY, userZoom, userPan]);

  // Cuadrícula y precisión adaptativa según zoom (0.02m a 1.00m con 2 decimales)
  const currentGridStep = useMemo(() => {
    return snapToGrid ? getAdaptiveGridStep(userZoom) : 0.05;
  }, [snapToGrid, userZoom]);

  // Índice del extremo más cercano al cursor (0 para P1 o N-1 para Pn)
  const closestEndpointIdx = useMemo(() => {
    if (drawPoints.length === 0) return null;
    if (drawPoints.length === 1) return 0;
    const dStart = dist(drawPoints[0], cursorWorld);
    const dEnd = dist(drawPoints[drawPoints.length - 1], cursorWorld);
    return dStart <= dEnd ? 0 : drawPoints.length - 1;
  }, [drawPoints, cursorWorld]);

  const fitToView = useCallback(() => {
    setUserZoom(1.0);
    setUserPan({ x: 0, y: 0 });
  }, []);

  // Aristas y cotas
  const edges = useMemo(() => {
    return vertices.map((v, i) => {
      const j = (i + 1) % vertices.length;
      const dx = vertices[j].x - v.x;
      const dy = vertices[j].y - v.y;
      const chordLen = Math.sqrt(dx * dx + dy * dy);
      const bulge = Number(curvatures[i] || 0);
      const arcLen = Math.abs(bulge) > 0.01
        ? chordLen + (8 * bulge * bulge) / (3 * Math.max(0.01, chordLen))
        : chordLen;

      return {
        from: v,
        to: vertices[j],
        chordLength: chordLen,
        length: arcLen,
        bulge,
        midX: (v.x + vertices[j].x) / 2,
        midY: (v.y + vertices[j].y) / 2,
        angle: Math.atan2(dy, dx),
      };
    });
  }, [vertices, curvatures]);

  // --- CÁLCULO DE IMANES INTELIGENTES (OSNAP) + ORTOGONAL ---
  const snapTargets = useMemo(() => {
    const endpoints = [...vertices];
    const segments = [];

    // Aristas de la sala existente
    for (let i = 0; i < vertices.length; i++) {
      const next = (i + 1) % vertices.length;
      segments.push({ a: vertices[i], b: vertices[next] });
    }

    // Puntos de trazado activo
    drawPoints.forEach(p => endpoints.push(p));
    for (let i = 0; i < drawPoints.length - 1; i++) {
      segments.push({ a: drawPoints[i], b: drawPoints[i + 1] });
    }

    // Líneas guía auxiliares
    guides.forEach(g => {
      endpoints.push(g.a);
      endpoints.push(g.b);
      segments.push({ a: g.a, b: g.b });
    });

    return { endpoints, segments };
  }, [vertices, drawPoints, guides]);

  const calculateSnappedCursor = useCallback((rawWorldPoint, referenceOrigin = null) => {
    const effectiveOrtho = isOrtho || isShiftDown;
    
    // Determinar punto de anclaje activo (según activeAnchor o extremo más cercano si está libre)
    let lastDrawPoint = referenceOrigin;
    let previousPoint = null;
    let oppositeClosingPt = null;

    if (!lastDrawPoint && drawPoints.length > 0 && activeTool === 'wall') {
      if (activeAnchor === 'start') {
        lastDrawPoint = drawPoints[0];
        previousPoint = drawPoints.length >= 2 ? drawPoints[1] : null;
        oppositeClosingPt = drawPoints[drawPoints.length - 1];
      } else if (activeAnchor === 'end') {
        lastDrawPoint = drawPoints[drawPoints.length - 1];
        previousPoint = drawPoints.length >= 2 ? drawPoints[drawPoints.length - 2] : null;
        oppositeClosingPt = drawPoints[0];
      } else {
        // activeAnchor === null (cursor libre/soltado): usar el extremo más cercano
        const dStart = dist(rawWorldPoint, drawPoints[0]);
        const dEnd = dist(rawWorldPoint, drawPoints[drawPoints.length - 1]);
        if (dStart <= dEnd) {
          lastDrawPoint = drawPoints[0];
          previousPoint = drawPoints.length >= 2 ? drawPoints[1] : null;
          oppositeClosingPt = drawPoints[drawPoints.length - 1];
        } else {
          lastDrawPoint = drawPoints[drawPoints.length - 1];
          previousPoint = drawPoints.length >= 2 ? drawPoints[drawPoints.length - 2] : null;
          oppositeClosingPt = drawPoints[0];
        }
      }
    }

    // 1. Detección prioritaria de cierre en el extremo opuesto si estamos dibujando muros
    if (drawPoints.length >= 3 && activeTool === 'wall' && oppositeClosingPt) {
      if (dist(rawWorldPoint, oppositeClosingPt) < (0.45 / userZoom)) {
        setActiveTrackingGuide(null);
        return { point: cleanPoint(oppositeClosingPt), snapType: 'endpoint', isClosing: true };
      }
    }

    // 2. Si OSNAP a extremos de geometría está activo y el cursor está cerca de algún vértice existente
    if (snapToGeometry) {
      const geomSnap = findSnap(rawWorldPoint, {
        endpoints: snapTargets.endpoints,
        segments: snapTargets.segments,
        from: lastDrawPoint,
        tolerance: 0.35 / userZoom,
        gridStep: null, // Evitar salto forzado a esquinas de cuadrícula aquí
      });
      if (geomSnap && geomSnap.type !== 'none' && geomSnap.type !== 'grid') {
        setActiveTrackingGuide(null);
        return { point: cleanPoint(geomSnap.point), snapType: geomSnap.type };
      }
    }

    // 3. RASTREO INTELIGENTE ORTOGONAL Y DEL TRAZO ("Seguir lo recto del trazo y ángulo relativo")
    // Resuelve el problema donde el trazo se va por las esquinas del cuadro/cuadrante más cercano
    // y rastrea la dirección perpendicular (90°) o extensión recta del trazo anterior
    if (lastDrawPoint) {
      // Puntos de referencia para alineación (ej: P1 y todos los vértices de la sala)
      const referencePoints = [...(drawPoints || []), ...(vertices || [])];
      const strokeSnap = findSmartStrokeSnap(rawWorldPoint, lastDrawPoint, {
        previousPoint,
        referencePoints,
        forceOrtho: effectiveOrtho,
        gridStep: snapToGrid ? currentGridStep : 0,
        angleToleranceDeg: Math.max(3.5, Math.min(10.0, 8.5 / Math.sqrt(userZoom))),
        alignTolerance: 0.35 / userZoom,
      });

      if (strokeSnap) {
        setActiveTrackingGuide({
          from: lastDrawPoint,
          to: strokeSnap.point,
          axis: strokeSnap.axis,
          angle: strokeSnap.angle,
          relAngle: strokeSnap.relAngle,
          isStraight: strokeSnap.isStraight,
          alignedWith: strokeSnap.alignedWith,
        });
        return { point: strokeSnap.point, snapType: strokeSnap.type };
      }
    }

    // 4. Si no hay trazo activo (o no hubo imán)
    setActiveTrackingGuide(null);
    if (snapToGrid) {
      const gridPoint = {
        x: Math.round(rawWorldPoint.x / currentGridStep) * currentGridStep,
        y: Math.round(rawWorldPoint.y / currentGridStep) * currentGridStep,
      };
      return { point: cleanPoint(gridPoint), snapType: 'grid' };
    }

    return { point: cleanPoint(rawWorldPoint), snapType: 'none' };
  }, [isOrtho, isShiftDown, drawPoints, activeAnchor, snapToGeometry, snapToGrid, snapTargets, userZoom, activeTool, vertices, currentGridStep]);

  // --- ZOOM CON RUEDA DEL MOUSE (centrado en cursor) ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
    wheelRafRef.current = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width * CANVAS_W;
      const mouseY = (e.clientY - rect.top) / rect.height * CANVAS_H;
      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;

      setUserZoom(prevZoom => {
        const newZoom = Math.max(0.25, Math.min(5.0, prevZoom * zoomFactor));
        setUserPan(prevPan => {
          const cx = CANVAS_W / 2;
          const cy = CANVAS_H / 2;
          const worldBefore_x = cx + (mouseX - cx - prevPan.x) / prevZoom;
          const worldBefore_y = cy + (mouseY - cy - prevPan.y) / prevZoom;
          const newScreenX = cx + (worldBefore_x - cx) * newZoom;
          const newScreenY = cy + (worldBefore_y - cy) * newZoom;
          return {
            x: mouseX - newScreenX,
            y: mouseY - newScreenY,
          };
        });
        return newZoom;
      });
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // --- PAN CON ARRASTRE DEL CANVAS ---
  const handleCanvasPointerDown = useCallback((e) => {
    if (editingEdgeIdx !== null) return;
    hasPannedRef.current = false;

    // Si es botón central, derecho o barra espaciadora -> Pan siempre
    if (e.button === 1 || e.button === 2 || isSpaceDown) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: userPan.x, panY: userPan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const target = e.target;
    const isBackgroundRect = target.dataset?.canvasBg === 'true';
    const isSvgRoot = target === svgRef.current;

    // Si estamos trazando con anclaje libre (activeAnchor === null), arrastrar en el fondo activa Pan para desplazarse a otro extremo
    if (activeTool === 'wall' && activeAnchor === null && (isSvgRoot || isBackgroundRect)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: userPan.x, panY: userPan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // En herramientas de dibujo (wall, rect, guide, measure), el clic izquierdo añade punto
    if (activeTool !== 'select') {
      return;
    }

    // En modo 'select', clic izquierdo en espacio vacío activa Pan y deselecciona vértice
    if (isSvgRoot || isBackgroundRect) {
      setSelectedVertexIdx(null);
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: userPan.x, panY: userPan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [userPan, editingEdgeIdx, activeTool, isSpaceDown, activeAnchor]);

  const handleCanvasPointerMove = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const sy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    const rawWorld = toWorld(sx, sy);

    const { point: snappedPt, snapType } = calculateSnappedCursor(rawWorld);
    setCursorWorld(snappedPt);
    setCurrentSnap({ point: snappedPt, type: snapType });

    // Preview de inserción de vértice exacto en la pared bajo el cursor
    if (activeTool === 'select' && hoveredEdge !== null && edges[hoveredEdge]) {
      const eObj = edges[hoveredEdge];
      const { point: projPt, t } = projectOnSegment(rawWorld, eObj.from, eObj.to);
      if (t >= 0.04 && t <= 0.96 && dist(rawWorld, projPt) < 0.45 / userZoom) {
        setEdgeHoverSplitPoint({ edgeIdx: hoveredEdge, point: cleanPoint(projPt) });
      } else {
        setEdgeHoverSplitPoint(null);
      }
    } else if (edgeHoverSplitPoint) {
      setEdgeHoverSplitPoint(null);
    }

    if (isPanning) {
      const scaleFactorX = CANVAS_W / rect.width;
      const scaleFactorY = CANVAS_H / rect.height;
      const dx = (e.clientX - panStartRef.current.x) * scaleFactorX;
      const dy = (e.clientY - panStartRef.current.y) * scaleFactorY;
      if (Math.hypot(dx, dy) > 4) {
        hasPannedRef.current = true;
      }
      setUserPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
    }
  }, [isPanning, toWorld, calculateSnappedCursor, activeTool, hoveredEdge, edges, userZoom, edgeHoverSplitPoint]);

  const handleCanvasPointerUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }, [isPanning]);

  // --- CLIC EN LIENZO PARA DIBUJAR SEGÚN HERRAMIENTA ACTIVA ---
  const handleCanvasClick = useCallback((e) => {
    if (isPanning || hasPannedRef.current) {
      hasPannedRef.current = false;
      return;
    }
    if (e.button !== 0) return; // Solo clic izquierdo

    // Obtener coordenadas exactas del evento con imanes aplicados
    const svg = svgRef.current;
    let clickPt = cursorWorld;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
      const sy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
      const rawW = toWorld(sx, sy);
      const { point: snapped } = calculateSnappedCursor(rawW);
      clickPt = snapped;
    }

    // HERRAMIENTA 1: MURO / POLILÍNEA CAD (L)
    if (activeTool === 'wall') {
      if (drawPoints.length === 0) {
        setDrawPoints([clickPt]);
        setActiveAnchor('end');
        setStatusMsg('Primer punto fijado (P1). Haz clic para la siguiente pared o escribe medida.');
        return;
      }

      const pStart = drawPoints[0];
      const pEnd = drawPoints[drawPoints.length - 1];
      const hitTol = 0.45 / userZoom;
      const dToStart = dist(clickPt, pStart);
      const dToEnd = dist(clickPt, pEnd);

      // CASO A: Cerrar recinto si se hace clic en el extremo opuesto con >= 3 puntos
      const isClosingAtStart = activeAnchor === 'end' && dToStart < hitTol && drawPoints.length >= 3;
      const isClosingAtEnd = activeAnchor === 'start' && dToEnd < hitTol && drawPoints.length >= 3;

      if (isClosingAtStart || isClosingAtEnd) {
        if (polygonSelfIntersects(drawPoints)) {
          setStatusMsg('⚠️ Error: Las paredes se cruzan entre sí. Corrige el trazado para cerrar.');
          setTimeout(() => setStatusMsg(null), 3500);
          return;
        }

        pushHistory();
        onChangePolygon({
          ...roomPolygon,
          vertices: drawPoints.map(cleanPoint),
          curvatures: {},
        });
        setActivePresetId('custom');
        setDrawPoints([]);
        setActiveAnchor('end');
        setActiveTrackingGuide(null);
        setActiveTool('select');
        setStatusMsg(`¡Recinto cerrado con éxito! (${drawPoints.length} paredes creadas)`);
        setTimeout(() => setStatusMsg(null), 3500);
        return;
      }

      // CASO B: Clic directo en el extremo inicial (P1) para continuar desde allí
      if (dToStart < hitTol) {
        setActiveAnchor('start');
        setStatusMsg('Extremo inicial P1 seleccionado como origen. Mueve el cursor y haz clic para continuar el trazo.');
        return;
      }

      // CASO C: Clic directo en el extremo final (Pn) para continuar desde allí
      if (dToEnd < hitTol) {
        setActiveAnchor('end');
        setStatusMsg(`Extremo final P${drawPoints.length} seleccionado como origen. Mueve el cursor y haz clic para continuar el trazo.`);
        return;
      }

      // CASO D: Clic en un vértice intermedio (P_i) para continuar el trazo desde ese punto
      for (let i = 1; i < drawPoints.length - 1; i++) {
        if (dist(clickPt, drawPoints[i]) < hitTol) {
          setDrawPoints(drawPoints.slice(0, i + 1));
          setActiveAnchor('end');
          setStatusMsg(`Continuando trazo desde P${i + 1}. Puntos posteriores eliminados.`);
          return;
        }
      }

      // CASO E: Añadir nueva pared al trazo
      // 1. Si estamos trazando desde el extremo inicial (P1): prepender punto
      if (activeAnchor === 'start') {
        if (segmentCrossesPolyline(drawPoints, clickPt, false)) {
          setStatusMsg('⚠️ Cruce no permitido: Esta pared intersecta otra pared.');
          setTimeout(() => setStatusMsg(null), 3000);
          return;
        }
        setDrawPoints(prev => [clickPt, ...prev]);
        setStatusMsg(`Pared añadida al inicio (${drawPoints.length + 1} puntos). Clic en P${drawPoints.length + 1} o C para cerrar.`);
        return;
      }

      // 2. Si estamos trazando desde el extremo final (Pn): apender punto
      if (activeAnchor === 'end') {
        if (segmentCrossesPolyline(drawPoints, clickPt, false)) {
          setStatusMsg('⚠️ Cruce no permitido: Esta pared intersecta otra pared.');
          setTimeout(() => setStatusMsg(null), 3000);
          return;
        }
        setDrawPoints(prev => [...prev, clickPt]);
        setStatusMsg(`Pared añadida (${drawPoints.length + 1} puntos). Clic en P1 o presiona C para cerrar.`);
        return;
      }

      // 3. Si el anclaje estaba libre (activeAnchor === null): conectar al extremo más cercano
      if (dToStart <= dToEnd) {
        if (segmentCrossesPolyline(drawPoints, clickPt, false)) {
          setStatusMsg('⚠️ Cruce no permitido: Esta pared intersecta otra pared.');
          setTimeout(() => setStatusMsg(null), 3000);
          return;
        }
        setDrawPoints(prev => [clickPt, ...prev]);
        setActiveAnchor('start');
        setStatusMsg(`Pared conectada al extremo inicial P1 (${drawPoints.length + 1} puntos).`);
      } else {
        if (segmentCrossesPolyline(drawPoints, clickPt, false)) {
          setStatusMsg('⚠️ Cruce no permitido: Esta pared intersecta otra pared.');
          setTimeout(() => setStatusMsg(null), 3000);
          return;
        }
        setDrawPoints(prev => [...prev, clickPt]);
        setActiveAnchor('end');
        setStatusMsg(`Pared conectada al extremo final P${drawPoints.length + 1} (${drawPoints.length + 1} puntos).`);
      }
    }

    // HERRAMIENTA 2: RECTÁNGULO CAD (R)
    if (activeTool === 'rect') {
      if (drawPoints.length === 0) {
        setDrawPoints([clickPt]);
        setStatusMsg('Esquina 1 fijada. Haz clic en la esquina opuesta o escribe Ancho,Alto.');
        return;
      }

      const p1 = drawPoints[0];
      const p2 = clickPt;
      const rectVerts = rectangleFromCorners(p1, p2);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);

      if (w < 0.2 || h < 0.2) {
        setStatusMsg('El rectángulo debe tener dimensiones mayores a 0.2m.');
        return;
      }

      pushHistory();
      onChangePolygon({
        ...roomPolygon,
        vertices: rectVerts,
        curvatures: {},
      });
      setActivePresetId('rectangle');
      setDrawPoints([]);
      setActiveTrackingGuide(null);
      setActiveTool('select');
      setStatusMsg(`Recinto rectangular creado (${w.toFixed(2)}m × ${h.toFixed(2)}m)`);
      setTimeout(() => setStatusMsg(null), 3500);
    }

    // HERRAMIENTA 3: LÍNEA AUXILIAR / GUÍA (X)
    if (activeTool === 'guide') {
      if (drawPoints.length === 0) {
        setDrawPoints([clickPt]);
        setStatusMsg('Origen de guía fijado. Haz clic para el punto final.');
        return;
      }

      const newGuide = {
        id: `guide_${Date.now()}`,
        a: drawPoints[0],
        b: clickPt,
      };
      pushHistory();
      const newGuides = [...guides, newGuide];
      onChangePolygon({ ...roomPolygon, guides: newGuides });
      setDrawPoints([]);
      setActiveTrackingGuide(null);
      setStatusMsg('Línea auxiliar añadida como referencia.');
      setTimeout(() => setStatusMsg(null), 2500);
    }

    // HERRAMIENTA 4: MEDIR / CINTA MÉTRICA (M)
    if (activeTool === 'measure') {
      if (drawPoints.length === 0) {
        setDrawPoints([clickPt]);
        setMeasuredResult(null);
        setStatusMsg('Punto 1 fijado. Haz clic en el punto 2 para medir.');
        return;
      }

      const p1 = drawPoints[0];
      const p2 = clickPt;
      const d = dist(p1, p2);
      const ang = screenAngleDeg(p1, p2);
      setMeasuredResult({ p1, p2, dist: d, angle: ang });
      setDrawPoints([]);
      setActiveTrackingGuide(null);
      setStatusMsg(`Medida: ${d.toFixed(2)}m (Ángulo: ${ang.toFixed(1)}°)`);
    }
  }, [isPanning, activeTool, drawPoints, activeAnchor, cursorWorld, userZoom, roomPolygon, onChangePolygon, guides, pushHistory, toWorld, calculateSnappedCursor]);

  // --- EJECUCIÓN DE ENTRADA DINÁMICA (CUANDO SE ESCRIBE 5 + ENTER) ---
  const handleExecuteDynamicInput = useCallback(() => {
    const rawStr = dynamicInputStr.trim();
    if (!rawStr) return;

    // Soporte para cerrar con 'c', 'close', 'cerrar'
    if (['c', 'close', 'cerrar'].includes(rawStr.toLowerCase()) && activeTool === 'wall' && drawPoints.length >= 3) {
      handleClosePolygonExplicit();
      setDynamicInputStr('');
      setDynamicInputError(null);
      return;
    }

    let anchorPt = null;
    let isPrepending = false;

    if (activeTool === 'wall' && drawPoints.length > 0) {
      if (activeAnchor === 'start') {
        anchorPt = drawPoints[0];
        isPrepending = true;
      } else if (activeAnchor === 'end') {
        anchorPt = drawPoints[drawPoints.length - 1];
        isPrepending = false;
      } else {
        const dStart = dist(cursorWorld, drawPoints[0]);
        const dEnd = dist(cursorWorld, drawPoints[drawPoints.length - 1]);
        if (dStart <= dEnd) {
          anchorPt = drawPoints[0];
          isPrepending = true;
        } else {
          anchorPt = drawPoints[drawPoints.length - 1];
          isPrepending = false;
        }
      }
    } else if (drawPoints.length > 0) {
      anchorPt = drawPoints[drawPoints.length - 1];
    }

    if (!anchorPt) {
      setDynamicInputError('Primero fija un punto en pantalla');
      return;
    }

    const parseResult = parseDynamicInput(rawStr, {
      from: anchorPt,
      cursor: cursorWorld,
      mode: activeTool === 'rect' ? 'rect' : 'point',
    });

    if (parseResult.error) {
      setDynamicInputError(parseResult.error);
      return;
    }

    const nextPt = cleanPoint(parseResult.point);
    setDynamicInputStr('');
    setDynamicInputError(null);

    // Simular el clic en `nextPt`
    if (activeTool === 'wall') {
      if (segmentCrossesPolyline(drawPoints, nextPt, false)) {
        setStatusMsg('⚠️ Cruce no permitido con la medida ingresada.');
        return;
      }
      if (isPrepending) {
        setDrawPoints(prev => [nextPt, ...prev]);
        setActiveAnchor('start');
        setStatusMsg('Pared añadida al inicio con medida exacta. Clic en extremo opuesto o C para cerrar.');
      } else {
        setDrawPoints(prev => [...prev, nextPt]);
        setActiveAnchor('end');
        setStatusMsg('Pared añadida con medida exacta. Siguiente tramo o C para cerrar.');
      }
    } else if (activeTool === 'rect') {
      const rectVerts = rectangleFromCorners(drawPoints[0], nextPt);
      pushHistory();
      onChangePolygon({ ...roomPolygon, vertices: rectVerts, curvatures: {} });
      setActivePresetId('rectangle');
      setDrawPoints([]);
      setActiveTool('select');
      setStatusMsg('Recinto rectangular creado con medida exacta.');
    } else if (activeTool === 'guide') {
      const newGuide = { id: `guide_${Date.now()}`, a: drawPoints[0], b: nextPt };
      pushHistory();
      onChangePolygon({ ...roomPolygon, guides: [...guides, newGuide] });
      setDrawPoints([]);
      setStatusMsg('Línea auxiliar fijada.');
    }
  }, [dynamicInputStr, drawPoints, cursorWorld, activeTool, activeAnchor, roomPolygon, onChangePolygon, guides, pushHistory]);

  // Deshacer el último punto del trazo en progreso
  const handleUndoLastPoint = useCallback(() => {
    setDrawPoints(prev => {
      if (prev.length <= 1) {
        setActiveAnchor('end');
        setActiveTrackingGuide(null);
        setStatusMsg('Trazo vaciado.');
        return [];
      }
      if (activeAnchor === 'start') {
        const next = prev.slice(1);
        setStatusMsg(`Punto inicial P1 eliminado. Quedan ${next.length} punto(s).`);
        return next;
      } else {
        const next = prev.slice(0, -1);
        setStatusMsg(`Punto P${prev.length} eliminado. Quedan ${next.length} punto(s).`);
        return next;
      }
    });
  }, [activeAnchor]);

  // Descartar trazo activo por completo
  const handleDiscardDrawing = useCallback(() => {
    setDrawPoints([]);
    setActiveAnchor('end');
    setActiveTrackingGuide(null);
    setMeasuredResult(null);
    setDynamicInputStr('');
    setDynamicInputError(null);
    setStatusMsg('Trazo descartado.');
    setTimeout(() => setStatusMsg(null), 1500);
  }, []);

  // Cancelar/soltar anclaje activo (en muros suelta el cursor sin borrar los puntos)
  const handleCancelDrawing = useCallback((forceDiscard = false) => {
    if (!forceDiscard && activeTool === 'wall' && drawPoints.length > 0) {
      if (activeAnchor !== null) {
        setActiveAnchor(null);
        setStatusMsg('Extremo soltado. Haz clic en P1, en Pn o en cualquier punto del lienzo para seguir dibujando.');
        return;
      }
      setStatusMsg('Trazo protegido. Para descartar todo pulsa el botón "Descartar" o escribe DESCARTAR.');
      return;
    }
    handleDiscardDrawing();
  }, [activeTool, drawPoints.length, activeAnchor, handleDiscardDrawing]);

  // Cerrar polilínea de muros explícitamente (tecla C o botón)
  const handleClosePolygonExplicit = useCallback(() => {
    if (drawPoints.length < 3) {
      setStatusMsg('Se necesitan mínimo 3 puntos para cerrar el recinto.');
      return;
    }
    if (polygonSelfIntersects(drawPoints)) {
      setStatusMsg('⚠️ Error: Las paredes se cruzan entre sí.');
      return;
    }
    pushHistory();
    onChangePolygon({
      ...roomPolygon,
      vertices: drawPoints.map(cleanPoint),
      curvatures: {},
    });
    setActivePresetId('custom');
    setDrawPoints([]);
    setActiveAnchor('end');
    setActiveTrackingGuide(null);
    setActiveTool('select');
    setStatusMsg(`¡Recinto cerrado con éxito! (${drawPoints.length} paredes)`);
    setTimeout(() => setStatusMsg(null), 3500);
  }, [drawPoints, roomPolygon, onChangePolygon, pushHistory]);

  // Limpiar líneas auxiliares
  const handleClearGuides = useCallback(() => {
    if (guides.length === 0) return;
    pushHistory();
    onChangePolygon({ ...roomPolygon, guides: [] });
    setStatusMsg('Líneas auxiliares eliminadas');
    setTimeout(() => setStatusMsg(null), 2000);
  }, [guides, roomPolygon, onChangePolygon, pushHistory]);

  // --- MODIFICACIONES DE VÉRTICES Y TRANSFORMACIONES DEL POLÍGONO ---
  const addVertexOnEdge = useCallback((edgeIdx, clickWorldPoint = null) => {
    pushHistory();
    const i = edgeIdx;
    const j = (edgeIdx + 1) % vertices.length;
    const v1 = vertices[i];
    const v2 = vertices[j];
    const insertPt = clickWorldPoint
      ? splitSegmentAtPoint(v1, v2, clickWorldPoint, 0.2)
      : cleanPoint({ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 });

    const newVerts = [...vertices];
    newVerts.splice(j, 0, insertPt);
    const newCurvatures = { ...(roomPolygon.curvatures || {}) };
    delete newCurvatures[edgeIdx];
    onChangePolygon({ ...roomPolygon, vertices: newVerts, curvatures: newCurvatures });
    setActivePresetId('custom');
    setSelectedVertexIdx(j);
    setStatusMsg(`Vértice V${j + 1} insertado en (${insertPt.x.toFixed(2)}m, ${insertPt.y.toFixed(2)}m)`);
    setTimeout(() => setStatusMsg(null), 2500);
  }, [vertices, roomPolygon, onChangePolygon, pushHistory]);

  const removeVertex = useCallback((idx) => {
    if (vertices.length <= 3) {
      setStatusMsg('⚠️ No se puede eliminar: Mínimo 3 vértices requeridos para cerrar el recinto.');
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }
    pushHistory();
    const newVerts = vertices.filter((_, i) => i !== idx);
    const newCurvatures = { ...(roomPolygon.curvatures || {}) };
    delete newCurvatures[idx];
    onChangePolygon({ ...roomPolygon, vertices: newVerts, curvatures: newCurvatures });
    setActivePresetId('custom');
    setSelectedVertexIdx(null);
    setStatusMsg(`Vértice V${idx + 1} eliminado.`);
    setTimeout(() => setStatusMsg(null), 2200);
  }, [vertices, roomPolygon, onChangePolygon, pushHistory]);

  const handleContinueDrawingFromVertex = useCallback((idx) => {
    if (idx < 0 || idx >= vertices.length) return;
    const startPt = vertices[idx];
    setDrawPoints([startPt]);
    setActiveTool('wall');
    setSelectedVertexIdx(null);
    setStatusMsg(`Continuando trazado desde V${idx + 1} (${startPt.x}m, ${startPt.y}m). Clic para siguiente pared o C para cerrar.`);
  }, [vertices]);

  const handleRotatePolygon = useCallback((angleDeg = 90) => {
    pushHistory();
    const newVerts = rotatePolygon(vertices, angleDeg, centroid);
    onChangePolygon({ ...roomPolygon, vertices: newVerts });
    setActivePresetId('custom');
    setStatusMsg(`Plano rotado ${angleDeg}°`);
    setTimeout(() => setStatusMsg(null), 2000);
  }, [vertices, centroid, roomPolygon, onChangePolygon, pushHistory]);

  const handleCenterPolygon = useCallback(() => {
    pushHistory();
    const newVerts = centerPolygonAtOrigin(vertices);
    onChangePolygon({ ...roomPolygon, vertices: newVerts });
    setActivePresetId('custom');
    fitToView();
    setStatusMsg('Plano centrado en origen (0,0)');
    setTimeout(() => setStatusMsg(null), 2000);
  }, [vertices, roomPolygon, onChangePolygon, fitToView, pushHistory]);

  const handleOffsetEdge = useCallback((edgeIdx, distance = 0.2) => {
    pushHistory();
    const i = edgeIdx;
    const j = (edgeIdx + 1) % vertices.length;
    const normal = getEdgeNormal(vertices[i], vertices[j], distance);
    const newVerts = moveEdgeParallel(vertices, edgeIdx, normal);
    onChangePolygon({ ...roomPolygon, vertices: newVerts });
    setActivePresetId('custom');
    setStatusMsg(`Pared ${edgeIdx + 1} desplazada ${distance > 0 ? '+' : ''}${distance}m en paralelo`);
    setTimeout(() => setStatusMsg(null), 2200);
  }, [vertices, roomPolygon, onChangePolygon, pushHistory]);

  // --- LÍNEA DE COMANDOS CAD (TIPO AUTOCAD) ---
  const executeCommand = useCallback((cmdStr) => {
    const raw = String(cmdStr || '').trim();
    if (!raw) return;
    const parts = raw.split(/\s+/);
    const cmd = parts[0].toUpperCase();
    const arg = parts.slice(1).join(' ');

    if (['L', 'LINE', 'LINEA', 'MURO'].includes(cmd)) {
      setActiveTool('wall');
      if (drawPoints.length > 0 && activeAnchor === null) {
        setActiveAnchor('end');
      }
      setStatusMsg(drawPoints.length > 0 ? `Continuando trazo de muros (${drawPoints.length} puntos)` : 'Muro CAD: haz clic para el primer punto');
    } else if (['R', 'REC', 'RECT', 'RECTANGULO'].includes(cmd)) {
      setActiveTool('rect');
      setStatusMsg('Herramienta Rectángulo activa (R)');
    } else if (['X', 'GUIA', 'XLINE', 'AUX'].includes(cmd)) {
      setActiveTool('guide');
      setStatusMsg('Herramienta Guía activa (X)');
    } else if (['M', 'MEDIR', 'DIST'].includes(cmd)) {
      setActiveTool('measure');
      setStatusMsg('Herramienta Medir activa (M)');
    } else if (['V', 'SEL', 'SELECT', 'SELECCIONAR'].includes(cmd)) {
      setActiveTool('select');
      setStatusMsg('Herramienta Selección activa (V)');
    } else if (['U', 'UNDO', 'DESHACER'].includes(cmd)) {
      if (drawPoints.length > 0) {
        handleUndoLastPoint();
      } else {
        handleUndo();
      }
    } else if (['DISCARD', 'DESCARTAR', 'BORRAR'].includes(cmd)) {
      handleDiscardDrawing();
    } else if (['C', 'CLOSE', 'CERRAR'].includes(cmd)) {
      if (drawPoints.length >= 3) {
        handleClosePolygonExplicit();
      } else {
        setStatusMsg('Se requieren mínimo 3 puntos trazados para cerrar el recinto');
      }
    } else if (['ESC', 'CANCEL', 'CANCELAR'].includes(cmd)) {
      handleCancelDrawing();
    } else if (['ROT', 'ROTATE', 'GIRAR', 'ROTAR'].includes(cmd)) {
      const ang = parseFloat(arg) || 90;
      handleRotatePolygon(ang);
    } else if (['CENTR', 'ORIGEN', 'CENTER', 'CENTRAR'].includes(cmd)) {
      handleCenterPolygon();
    } else if (['ORTO', 'ORTHO', 'F8'].includes(cmd)) {
      setIsOrtho(prev => !prev);
      setStatusMsg(isOrtho ? 'Modo Ortogonal desactivado' : 'Modo Ortogonal ACTIVADO (0°/90°)');
    } else if (['SNAP', 'OSNAP', 'F3'].includes(cmd)) {
      setSnapToGeometry(prev => !prev);
      setStatusMsg(snapToGeometry ? 'OSNAP desactivado' : 'OSNAP activado');
    } else if (['CLEAR', 'LIMPIAR'].includes(cmd)) {
      handleClearGuides();
    } else if (['H', 'ALTURA', 'HEIGHT'].includes(cmd)) {
      const hVal = parseFloat(arg);
      if (hVal > 0) {
        pushHistory();
        onChangePolygon({ ...roomPolygon, height: Number(hVal.toFixed(2)) });
        setStatusMsg(`Altura fijada en ${hVal}m`);
      }
    } else if (['AYUDA', 'HELP', '?'].includes(cmd)) {
      setShowShortcutsModal(true);
    } else {
      // Intentar procesar como entrada dinámica si hay un trazado en curso
      if (drawPoints.length > 0) {
        const lastPt = drawPoints[drawPoints.length - 1];
        const parseResult = parseDynamicInput(raw, {
          from: lastPt,
          cursor: cursorWorld,
          mode: activeTool === 'rect' ? 'rect' : 'point',
        });
        if (!parseResult.error) {
          const nextPt = cleanPoint(parseResult.point);
          if (activeTool === 'wall') {
            if (!segmentCrossesPolyline(drawPoints, nextPt, false)) {
              setDrawPoints(prev => [...prev, nextPt]);
              setStatusMsg(`Pared añadida con medida: (${nextPt.x}m, ${nextPt.y}m)`);
            } else {
              setStatusMsg('⚠️ Cruce no permitido con la medida ingresada');
            }
          }
        } else {
          setStatusMsg(`Comando no reconocido: "${raw}". Escribe AYUDA o ?`);
        }
      } else {
        setStatusMsg(`Comando no reconocido: "${raw}". Escribe AYUDA o ?`);
      }
    }
    setCommandInput('');
  }, [
    activeTool, drawPoints, cursorWorld, isOrtho, snapToGeometry, roomPolygon,
    onChangePolygon, handleClosePolygonExplicit, handleCancelDrawing, handleRotatePolygon,
    handleCenterPolygon, handleClearGuides, pushHistory
  ]);

  // --- ATAJOS DE TECLADO CAD GLOBALES ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si el usuario está escribiendo en un input ajeno (salvo entrada dinámica o consola)
      const isInput = e.target.tagName === 'INPUT' && e.target !== dynamicInputRef.current && e.target !== commandInputRef.current;
      if (isInput || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Shift') {
        setIsShiftDown(true);
      }

      // Si se está en la consola de comandos CAD, dejar que su propio onSubmit/onChange la gestione
      if (e.target === commandInputRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCommandLine(false);
        }
        return;
      }

      // F8: Alternar Modo Ortogonal
      if (e.key === 'F8') {
        e.preventDefault();
        setIsOrtho(prev => !prev);
        setStatusMsg(isOrtho ? 'Modo Ortogonal desactivado' : 'Modo Ortogonal ACTIVADO (0°/90°)');
        setTimeout(() => setStatusMsg(null), 2000);
        return;
      }

      // F3: Alternar Imanes OSNAP
      if (e.key === 'F3') {
        e.preventDefault();
        setSnapToGeometry(prev => !prev);
        setStatusMsg(snapToGeometry ? 'OSNAP desactivado' : 'OSNAP activado');
        setTimeout(() => setStatusMsg(null), 2000);
        return;
      }

      // Escape: Soltar anclaje de muros para elegir otro punto, deseleccionar vértice o cancelar
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedVertexIdx !== null) {
          setSelectedVertexIdx(null);
          return;
        }
        if (drawPoints.length > 0 && activeTool === 'wall') {
          if (activeAnchor !== null) {
            setActiveAnchor(null);
            setStatusMsg('Extremo soltado. Haz clic en P1, en Pn o en cualquier punto para seguir dibujando.');
            return;
          }
          setStatusMsg('Trazo protegido. Si deseas descartarlo por completo, usa el botón "Descartar".');
          return;
        }
        handleCancelDrawing();
        return;
      }

      // Barra espaciadora: Activar paneo interactivo (tipo CAD/Figma)
      if (e.code === 'Space' && document.activeElement !== dynamicInputRef.current && document.activeElement !== commandInputRef.current) {
        e.preventDefault();
        setIsSpaceDown(true);
      }

      // Delete o Backspace: Eliminar último punto del trazo en progreso O vértice seleccionado
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement !== dynamicInputRef.current) {
        if (drawPoints.length > 0) {
          e.preventDefault();
          handleUndoLastPoint();
          return;
        }
        if (selectedVertexIdx !== null && activeTool === 'select') {
          e.preventDefault();
          removeVertex(selectedVertexIdx);
          return;
        }
      }

      // Flechas del teclado: Desplazamiento fino (nudge) del vértice seleccionado (0.1m o 0.5m con Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedVertexIdx !== null && activeTool === 'select' && document.activeElement !== dynamicInputRef.current) {
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right';
        const step = e.shiftKey ? 0.5 : 0.1;
        pushHistory();
        const newVerts = nudgeVertex(vertices, selectedVertexIdx, dir, step);
        onChangePolygon({ ...roomPolygon, vertices: newVerts });
        setActivePresetId('custom');
        setStatusMsg(`V${selectedVertexIdx + 1} movido ${step}m (${dir})`);
        return;
      }

      // Tecla ?: Mostrar modal de atajos CAD
      if ((e.key === '?' || e.key === 'F1') && document.activeElement !== dynamicInputRef.current) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // C: Cerrar recinto si estamos dibujando muros
      if ((e.key === 'c' || e.key === 'C') && activeTool === 'wall' && drawPoints.length >= 3 && document.activeElement !== dynamicInputRef.current) {
        e.preventDefault();
        handleClosePolygonExplicit();
        return;
      }

      // Atajos de herramientas si no se está escribiendo en el dynamic input
      if (document.activeElement !== dynamicInputRef.current) {
        const k = e.key.toLowerCase();
        if (k === 'v') {
          setActiveTool('select');
          if (drawPoints.length > 0) {
            setStatusMsg('Modo Selección. Pulsa L o haz clic en Muro para continuar tu trazo.');
          }
        }
        else if (k === 'l') {
          setActiveTool('wall');
          if (drawPoints.length > 0 && activeAnchor === null) {
            setActiveAnchor('end');
          }
          setStatusMsg(drawPoints.length > 0 ? `Continuando trazo (${drawPoints.length} puntos)` : 'Muro CAD: haz clic para el primer punto');
        }
        else if (k === 'r') {
          setActiveTool('rect');
          setStatusMsg('Herramienta Rectángulo activa (R). Clic en esquina 1.');
        }
        else if (k === 'x') {
          setActiveTool('guide');
          setStatusMsg('Herramienta Guía activa (X).');
        }
        else if (k === 'm') {
          setActiveTool('measure');
          setStatusMsg('Herramienta Medir activa (M).');
        }

        // Si empieza a escribir un número mientras dibuja, enfocar entrada dinámica
        if (drawPoints.length > 0 && /^[0-9@<.,]$/.test(e.key)) {
          e.preventDefault();
          setDynamicInputStr(e.key);
          dynamicInputRef.current?.focus();
        }
      }

      // Deshacer / Rehacer
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftDown(false);
      }
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTool, drawPoints, activeAnchor, isOrtho, snapToGeometry, selectedVertexIdx, vertices,
    roomPolygon, onChangePolygon, handleCancelDrawing, handleUndoLastPoint, handleClosePolygonExplicit,
    handleUndo, handleRedo, removeVertex, pushHistory
  ]);

  // Arrastre de vértices en modo 'select'
  const handlePointerDown = useCallback((idx, e) => {
    if (activeTool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    pushHistory();
    setDraggingIdx(idx);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [activeTool, pushHistory]);

  const handlePointerMove = useCallback((e) => {
    if (draggingIdx === null) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = (clientX - rect.left) * (CANVAS_W / rect.width);
      const sy = (clientY - rect.top) * (CANVAS_H / rect.height);
      const rawW = toWorld(sx, sy);
      const { point: cleanP } = calculateSnappedCursor(rawW);

      const newVerts = [...vertices];
      newVerts[draggingIdx] = cleanP;
      onChangePolygon({ ...roomPolygon, vertices: newVerts });
      setActivePresetId('custom');
    });
  }, [draggingIdx, vertices, roomPolygon, onChangePolygon, toWorld, calculateSnappedCursor]);

  const handlePointerUp = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (draggingIdx !== null) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
      setDraggingIdx(null);
    }
  }, [draggingIdx]);

  // Edición interactiva inline de longitud de pared (Doble clic en cota)
  const handleApplyEdgeLength = useCallback((edgeIdx, newLenStr) => {
    const desiredLen = parseFloat(newLenStr);
    if (isNaN(desiredLen) || desiredLen <= 0.2) {
      setEditingEdgeIdx(null);
      return;
    }

    pushHistory();
    const N = vertices.length;

    if (N === 4 && activePresetId !== 'trapezoid') {
      const i = edgeIdx;
      const j = (edgeIdx + 1) % 4;
      const vi = vertices[i];
      const vj = vertices[j];
      const isHorizontal = Math.abs(vj.x - vi.x) >= Math.abs(vj.y - vi.y);
      const originX = Math.min(vertices[0].x, vertices[3].x);
      const originY = Math.min(vertices[0].y, vertices[1].y);
      const curWidth = Math.max(0.5, Math.hypot(vertices[1].x - vertices[0].x, vertices[1].y - vertices[0].y));
      const curHeight = Math.max(0.5, Math.hypot(vertices[2].x - vertices[1].x, vertices[2].y - vertices[1].y));

      let newVerts;
      if (isHorizontal) {
        const targetW = Number(desiredLen.toFixed(2));
        const cleanH = Number(curHeight.toFixed(2));
        newVerts = [
          { x: Number(originX.toFixed(2)), y: Number(originY.toFixed(2)) },
          { x: Number((originX + targetW).toFixed(2)), y: Number(originY.toFixed(2)) },
          { x: Number((originX + targetW).toFixed(2)), y: Number((originY + cleanH).toFixed(2)) },
          { x: Number(originX.toFixed(2)), y: Number((originY + cleanH).toFixed(2)) }
        ];
      } else {
        const cleanW = Number(curWidth.toFixed(2));
        const targetH = Number(desiredLen.toFixed(2));
        newVerts = [
          { x: Number(originX.toFixed(2)), y: Number(originY.toFixed(2)) },
          { x: Number((originX + cleanW).toFixed(2)), y: Number(originY.toFixed(2)) },
          { x: Number((originX + cleanW).toFixed(2)), y: Number((originY + targetH).toFixed(2)) },
          { x: Number(originX.toFixed(2)), y: Number((originY + targetH).toFixed(2)) }
        ];
      }
      onChangePolygon({ ...roomPolygon, vertices: newVerts });
      setEditingEdgeIdx(null);
      return;
    }

    const i = edgeIdx;
    const j = (edgeIdx + 1) % N;
    const k = (j + 1) % N;
    const vi = vertices[i];
    const vj = vertices[j];
    const vk = vertices[k];
    const dx = vj.x - vi.x;
    const dy = vj.y - vi.y;
    const curDist = Math.hypot(dx, dy);
    if (curDist < 0.01) { setEditingEdgeIdx(null); return; }

    let newJx, newJy;
    if (Math.abs(dy) < 0.05) {
      const dirX = vj.x >= vi.x ? 1 : -1;
      newJx = Number((vi.x + dirX * desiredLen).toFixed(2));
      newJy = vi.y;
    } else if (Math.abs(dx) < 0.05) {
      const dirY = vj.y >= vi.y ? 1 : -1;
      newJx = vi.x;
      newJy = Number((vi.y + dirY * desiredLen).toFixed(2));
    } else {
      const ux = dx / curDist;
      const uy = dy / curDist;
      newJx = Number((vi.x + ux * desiredLen).toFixed(2));
      newJy = Number((vi.y + uy * desiredLen).toFixed(2));
    }

    const deltaX = newJx - vj.x;
    const deltaY = newJy - vj.y;
    const newVerts = [...vertices];
    newVerts[j] = { x: newJx, y: newJy };
    newVerts[k] = { x: Number((vk.x + deltaX).toFixed(2)), y: Number((vk.y + deltaY).toFixed(2)) };

    onChangePolygon({ ...roomPolygon, vertices: newVerts });
    setActivePresetId('custom');
    setEditingEdgeIdx(null);
  }, [vertices, roomPolygon, onChangePolygon, activePresetId, pushHistory]);

  const handleCurvatureChange = useCallback((edgeIdx, val) => {
    pushHistory();
    const newCurvatures = { ...(roomPolygon.curvatures || {}) };
    if (Math.abs(val) < 0.05) delete newCurvatures[edgeIdx];
    else newCurvatures[edgeIdx] = Number(val.toFixed(2));
    onChangePolygon({ ...roomPolygon, curvatures: newCurvatures });
    setActivePresetId('custom');
  }, [roomPolygon, onChangePolygon, pushHistory]);

  const handleEntityPointerDown = (entity, e) => {
    if (activeTool !== 'select') {
      setActiveTool('select');
    }
    e.preventDefault();
    e.stopPropagation();
    setDraggingEntity(entity);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleEntityPointerMove = (e) => {
    if (!draggingEntity || !onChangeSourceReceiver) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (entityRafRef.current) cancelAnimationFrame(entityRafRef.current);
    entityRafRef.current = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = (clientX - rect.left) * (CANVAS_W / rect.width);
      const sy = (clientY - rect.top) * (CANVAS_H / rect.height);
      const rawW = toWorld(sx, sy);
      const cleanP = cleanPoint(rawW);

      if (draggingEntity === 'source') {
        const newSource = { ...sourcePos, x: cleanP.x, y: cleanP.y };
        const dx = receiverPos.x - newSource.x;
        const dy = receiverPos.y - newSource.y;
        const dz = receiverPos.z - newSource.z;
        const distR = Math.sqrt(dx * dx + dy * dy + dz * dz);
        onChangeSourceReceiver({
          ...sourceReceiver,
          sourcePos: newSource,
          distance: Number(distR.toFixed(2)),
        });
      } else if (draggingEntity === 'receiver') {
        const newRec = { ...receiverPos, x: cleanP.x, y: cleanP.y };
        const dx = newRec.x - sourcePos.x;
        const dy = newRec.y - sourcePos.y;
        const dz = newRec.z - sourcePos.z;
        const distR = Math.sqrt(dx * dx + dy * dy + dz * dz);
        onChangeSourceReceiver({
          ...sourceReceiver,
          receiverPos: newRec,
          distance: Number(distR.toFixed(2)),
        });
      }
    });
  };

  const handleEntityPointerUp = (e) => {
    if (entityRafRef.current) cancelAnimationFrame(entityRafRef.current);
    if (draggingEntity) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
      setDraggingEntity(null);
    }
  };

  const loadPreset = useCallback((presetId) => {
    const preset = SHAPE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    pushHistory();
    const bb = geometry?.boundingBox;
    const L = bb ? (bb.width || 10) : 10;
    const W = bb ? (bb.length || 6) : 6;
    const newVerts = preset.vertices(Math.max(4, L), Math.max(3, W));
    onChangePolygon({ ...roomPolygon, vertices: newVerts, curvatures: {} });
    setActivePresetId(presetId);
    setUserZoom(1.0);
    setUserPan({ x: 0, y: 0 });
    setDrawPoints([]);
  }, [roomPolygon, onChangePolygon, geometry, pushHistory]);

  // Cuadrícula CAD con resolución visual adaptativa según zoom
  const { gridLines, intersectionDots } = useMemo(() => {
    if (!vertices.length) return { gridLines: [], intersectionDots: [] };
    const minXFloor = Math.floor(minXVal - 0.5);
    const maxXCeil = Math.ceil(maxXVal + 0.5);
    const minYFloor = Math.floor(minYVal - 0.5);
    const maxYCeil = Math.ceil(maxYVal + 0.5);
    const lines = [];
    const dots = [];

    const visualStep = userZoom >= 2.5 ? 0.1 : (userZoom >= 1.2 ? 0.2 : 0.5);

    for (let x = minXFloor; x <= maxXCeil + 0.001; x = Number((x + visualStep).toFixed(2))) {
      const s1 = toScreen(x, minYFloor);
      const s2 = toScreen(x, maxYCeil);
      const isMajor = Math.abs(x % 1) < 0.05 || Math.abs(x % 1 - 1) < 0.05;
      const isFive = Math.abs(x % 5) < 0.05 || Math.abs(x % 5 - 5) < 0.05;
      lines.push({ x1: s1.x, y1: s1.y, x2: s2.x, y2: s2.y, major: isMajor, isFive, val: Number(x.toFixed(2)), axis: 'x' });
    }
    for (let y = minYFloor; y <= maxYCeil + 0.001; y = Number((y + visualStep).toFixed(2))) {
      const s1 = toScreen(minXFloor, y);
      const s2 = toScreen(maxXCeil, y);
      const isMajor = Math.abs(y % 1) < 0.05 || Math.abs(y % 1 - 1) < 0.05;
      const isFive = Math.abs(y % 5) < 0.05 || Math.abs(y % 5 - 5) < 0.05;
      lines.push({ x1: s1.x, y1: s1.y, x2: s2.x, y2: s2.y, major: isMajor, isFive, val: Number(y.toFixed(2)), axis: 'y' });
    }

    for (let x = Math.ceil(minXVal); x <= Math.floor(maxXVal); x += 1.0) {
      for (let y = Math.ceil(minYVal); y <= Math.floor(maxYVal); y += 1.0) {
        dots.push(toScreen(x, y));
      }
    }

    return { gridLines: lines, intersectionDots: dots };
  }, [vertices, minXVal, maxXVal, minYVal, maxYVal, toScreen, userZoom]);


  const area = useMemo(() => {
    let baseArea = polygonArea(vertices);
    edges.forEach((e) => {
      if (Math.abs(e.bulge) > 0.01) {
        baseArea += (2 / 3) * e.chordLength * e.bulge;
      }
    });
    return Math.max(0.1, baseArea);
  }, [vertices, edges]);

  const perimeter = useMemo(() => edges.reduce((s, e) => s + e.length, 0), [edges]);

  // Trazo del polígono cerrado
  const polyPath = useMemo(() => {
    if (!vertices.length) return '';
    let d = '';
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const v0 = vertices[i];
      const v1 = vertices[j];
      const bulge = Number(curvatures[i] || 0);
      const s0 = toScreen(v0.x, v0.y);
      if (i === 0) d += `M ${s0.x} ${s0.y}`;

      if (Math.abs(bulge) > 0.02) {
        const arcPts = getEdgeArcPoints(v0, v1, bulge, 12, isCCW);
        for (let k = 1; k < arcPts.length; k++) {
          const sp = toScreen(arcPts[k].x, arcPts[k].y);
          d += ` L ${sp.x} ${sp.y}`;
        }
      } else {
        const s1 = toScreen(v1.x, v1.y);
        d += ` L ${s1.x} ${s1.y}`;
      }
    }
    return d + ' Z';
  }, [vertices, curvatures, toScreen, isCCW]);

  const currentDistR = Number(sourceReceiver?.distance || Math.hypot(receiverPos.x - sourcePos.x, receiverPos.y - sourcePos.y).toFixed(2));

  // Exportar / Importar
  const handleExportDrawing = useCallback(() => {
    const exportPayload = {
      software: 'POZOLE - CAD Acústico ISO 3382',
      version: '3.0',
      fecha_guardado: new Date().toLocaleString(),
      sala: {
        tipo_uso: roomType || 'speech',
        tipo_forma: activePresetId,
        altura_metros: Number(height.toFixed(2)),
        area_m2: Number(area.toFixed(2)),
        volumen_m3: Number((area * height).toFixed(2)),
        vertices: vertices.map((v, i) => ({
          vertice: `V${i + 1}`,
          x_m: cleanPoint(v).x,
          y_m: cleanPoint(v).y,
        })),
        curvaturas_aristas: curvatures || {},
        lineas_auxiliares: guides || [],
      },
      tipo_sala: roomType || 'speech',
      materiales: materials || {},
      fuente_receptor: sourceReceiver || {},
      modalSettings: modalSettings || {},
      includeAirAbsorption: includeAirAbsorption !== undefined ? includeAirAbsorption : true,
      selectedBand: selectedBand || 1000,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modelo_sala_pozole_${activePresetId}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Modelo completo (geometría + materiales + fuente + tipo) guardado exitosamente (.json)');
    setTimeout(() => setStatusMsg(null), 3500);
  }, [activePresetId, height, area, vertices, curvatures, guides, materials, sourceReceiver, roomType, modalSettings, includeAirAbsorption, selectedBand]);

  const handleImportDrawing = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const s = parsed.sala || parsed;
        if (Array.isArray(s.vertices) && s.vertices.length >= 3) {
          pushHistory();
          const cleanVerts = s.vertices.map(v => cleanPoint({ x: v.x_m ?? v.x ?? 0, y: v.y_m ?? v.y ?? 0 }));
          
          // 1. Restaurar polígono
          onChangePolygon({
            vertices: cleanVerts,
            height: Number(s.altura_metros || s.height || 3.0),
            curvatures: s.curvaturas_aristas || s.curvatures || {},
            guides: s.lineas_auxiliares || [],
          });
          setActivePresetId(s.tipo_forma || 'custom');

          // 2. Restaurar materiales si vienen incluidos en el modelo
          const importedMats = parsed.materiales || parsed.materials;
          if (importedMats && onChangeMaterials) {
            onChangeMaterials(importedMats);
          }

          // 3. Restaurar fuente y receptor si vienen incluidos
          const importedSR = parsed.fuente_receptor || parsed.sourceReceiver;
          if (importedSR && onChangeSourceReceiver) {
            onChangeSourceReceiver(importedSR);
          }

          // 4. Restaurar tipo de uso / sala si viene incluido
          const importedRoomType = s.tipo_uso || parsed.tipo_sala || parsed.roomType || parsed.tipo_uso;
          if (importedRoomType && onChangeRoomType) {
            onChangeRoomType(importedRoomType);
          }

          // 5. Restaurar parámetros modales si vienen incluidos
          const importedModal = parsed.modalSettings;
          if (importedModal && onChangeModalSettings) {
            onChangeModalSettings(importedModal);
          }

          // 6. Restaurar absorción de aire
          if (parsed.includeAirAbsorption !== undefined && onChangeIncludeAirAbsorption) {
            onChangeIncludeAirAbsorption(parsed.includeAirAbsorption);
          }

          // 7. Restaurar banda
          if (parsed.selectedBand && onChangeSelectedBand) {
            onChangeSelectedBand(parsed.selectedBand);
          }

          setStatusMsg(`Modelo "${file.name}" cargado con geometría, materiales, tipo y fuente (${cleanVerts.length} vértices)`);
          setTimeout(() => setStatusMsg(null), 3500);
        }
      } catch (_) {
        alert('Formato de modelo no compatible.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  }, [onChangePolygon, onChangeMaterials, onChangeSourceReceiver, onChangeRoomType, onChangeModalSettings, onChangeIncludeAirAbsorption, onChangeSelectedBand, pushHistory]);

  // Cálculos en vivo para la línea elástica (rubberband)
  const rubberbandInfo = useMemo(() => {
    if (drawPoints.length === 0 || activeTool !== 'wall') return null;

    // Determinar el punto de anclaje de la línea elástica
    let anchorIdx = null;
    if (activeAnchor === 'start') {
      anchorIdx = 0;
    } else if (activeAnchor === 'end') {
      anchorIdx = drawPoints.length - 1;
    } else {
      anchorIdx = closestEndpointIdx;
    }

    if (anchorIdx === null || anchorIdx === undefined || !drawPoints[anchorIdx]) return null;

    const anchorPt = drawPoints[anchorIdx];
    const curr = cursorWorld;
    const d = dist(anchorPt, curr);
    const ang = screenAngleDeg(anchorPt, curr);

    const oppositeIdx = anchorIdx === 0 ? drawPoints.length - 1 : 0;
    const targetOpposite = drawPoints[oppositeIdx];
    const isClosingNear = drawPoints.length >= 3 && targetOpposite && dist(targetOpposite, curr) < (0.45 / userZoom);
    const isCrossing = segmentCrossesPolyline(drawPoints, curr, isClosingNear);

    return {
      fromScreen: toScreen(anchorPt.x, anchorPt.y),
      toScreen: toScreen(curr.x, curr.y),
      fromPoint: anchorPt,
      targetOpposite,
      anchorIdx,
      dist: d,
      angle: ang,
      isClosingNear,
      isCrossing,
      isDetached: activeAnchor === null,
    };
  }, [drawPoints, cursorWorld, toScreen, userZoom, activeTool, activeAnchor, closestEndpointIdx]);

  const effectiveOrtho = isOrtho || isShiftDown;

  return (
    <div className="space-y-3">

      {/* --- BARRA SUPERIOR DE HERRAMIENTAS CAD --- */}
      <div className="bg-white dark:bg-[#141622] rounded-2xl border border-black/[0.08] dark:border-white/10 p-2 sm:p-2.5 shadow-apple-sm flex flex-wrap items-center justify-between gap-2">
        
        {/* Grupo 1: Selector de Herramientas de Dibujo CAD */}
        <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#0A0C14] p-1 rounded-xl border border-black/[0.04] dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveTool('select');
              if (drawPoints.length > 0) {
                setStatusMsg('Modo Selección activo. Pulsa "Muro" (L) para continuar tu trazo.');
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTool === 'select'
                ? 'bg-[#5833c7] text-white shadow-xs'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
            title="Seleccionar y Mover (V / Esc)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Selección</span>
            <kbd className="text-[9px] opacity-70 font-mono">V</kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('wall');
              if (drawPoints.length > 0 && activeAnchor === null) {
                setActiveAnchor('end');
              }
              setStatusMsg(drawPoints.length > 0 ? `Continuando trazo de muros (${drawPoints.length} puntos)` : 'Muro CAD: haz clic para el primer punto');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTool === 'wall'
                ? 'bg-[#5833c7] text-white shadow-xs'
                : drawPoints.length > 0
                ? 'bg-[#5833c7]/20 text-[#a78bfa] border border-[#5833c7]/30'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
            title="Trazar Muros Punto a Punto (L)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Muro</span>
            {drawPoints.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <kbd className="text-[9px] opacity-70 font-mono">L</kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('rect');
              setStatusMsg('Rectángulo CAD: haz clic en esquina 1');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTool === 'rect'
                ? 'bg-[#5833c7] text-white shadow-xs'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
            title="Trazar Rectángulo con 2 esquinas (R)"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rectángulo</span>
            <kbd className="text-[9px] opacity-70 font-mono">R</kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('guide');
              setStatusMsg('Línea Auxiliar: traza una guía libre');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTool === 'guide'
                ? 'bg-[#0ea5e9] text-white shadow-xs'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
            title="Línea Auxiliar Libre (X)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Guía</span>
            <kbd className="text-[9px] opacity-70 font-mono">X</kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('measure');
              setStatusMsg('Herramienta Medir activa (M)');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTool === 'measure'
                ? 'bg-[#10b981] text-white shadow-xs'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
            title="Medir distancia y ángulo (M)"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Medir</span>
            <kbd className="text-[9px] opacity-70 font-mono">M</kbd>
          </button>
        </div>

        {/* Grupo 2: Presets Rápidos */}
        <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#0A0C14] p-1 rounded-xl border border-black/[0.04] dark:border-white/10 overflow-x-auto no-scrollbar">
          {SHAPE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePresetId === preset.id && activeTool === 'select';
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => { setActiveTool('select'); loadPreset(preset.id); }}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-[#141622] text-[#5833c7] dark:text-[#a78bfa] shadow-2xs font-bold'
                    : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
                title={`Preset ${preset.name}`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden xl:inline">{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* Grupo 2.5: Transformaciones y Utilidades CAD */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleRotatePolygon(90)}
            className="p-1.5 px-2 rounded-xl border border-black/[0.06] dark:border-white/10 text-xs font-bold text-[#86868b] dark:text-slate-300 hover:text-[#5833c7] dark:hover:text-white transition flex items-center gap-1"
            title="Rotar plano 90° alrededor del centroide"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Rotar 90°</span>
          </button>

          <button
            type="button"
            onClick={handleCenterPolygon}
            className="p-1.5 px-2 rounded-xl border border-black/[0.06] dark:border-white/10 text-xs font-bold text-[#86868b] dark:text-slate-300 hover:text-[#5833c7] dark:hover:text-white transition flex items-center gap-1"
            title="Centrar polígono en el origen (0,0)"
          >
            <AlignCenter className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Centrar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCommandLine(prev => !prev)}
            className={`p-1.5 px-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
              showCommandLine
                ? 'bg-[#5833c7] text-white border-[#5833c7]'
                : 'border-black/[0.06] dark:border-white/10 text-[#86868b] dark:text-slate-300 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
            title="Línea de Comandos AutoCAD (consola inferior)"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Comandos</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 px-2 rounded-xl border border-amber-500/30 text-xs font-bold text-amber-500 hover:bg-amber-500 hover:text-white transition flex items-center gap-1"
            title="Atajos de teclado y ayuda CAD (?)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atajos</span>
            <kbd className="text-[9px] font-mono opacity-80">?</kbd>
          </button>
        </div>

        {/* Grupo 3: Deshacer / Rehacer / Archivo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-xl border border-black/[0.06] dark:border-white/10 text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white disabled:opacity-30 transition"
            title="Deshacer (Ctrl + Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-xl border border-black/[0.06] dark:border-white/10 text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white disabled:opacity-30 transition"
            title="Rehacer (Ctrl + Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />

          <button
            type="button"
            onClick={handleExportDrawing}
            className="p-1.5 px-2 rounded-xl border border-black/[0.06] dark:border-white/10 text-xs font-bold text-[#5833c7] dark:text-[#a78bfa] hover:bg-[#5833c7] hover:text-white transition flex items-center gap-1"
            title="Guardar plano CAD (.json)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 px-2 rounded-xl border border-black/[0.06] dark:border-white/10 text-xs font-bold text-[#10b981] hover:bg-[#10b981] hover:text-white transition flex items-center gap-1"
            title="Cargar plano CAD (.json)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cargar</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt"
            className="hidden"
            onChange={handleImportDrawing}
          />
        </div>

      </div>

      {/* --- LIENZO SVG CAD --- */}
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-[#0c0d18] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden shadow-apple-sm transition-colors w-full flex flex-col touch-none"
        style={{ touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Banner de Estado Flotante */}
        {statusMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#141622]/95 backdrop-blur-md text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span>{statusMsg}</span>
            </div>
          </div>
        )}

        {/* --- CAJA FLOTANTE DE ENTRADA DINÁMICA Y CONTROL DE TRAZO BIDIRECCIONAL (CAD HUD) --- */}
        {drawPoints.length > 0 && (
          <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2 bg-[#141622]/95 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-2xl animate-fadeIn">
            {/* Indicador de estado del trazo y extremo activo */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className={`w-2 h-2 rounded-full ${activeAnchor ? 'bg-[#a78bfa] animate-pulse' : 'bg-cyan-400'}`} />
              <span className="font-bold text-slate-200">
                {activeTool !== 'wall'
                  ? 'Trazo en curso'
                  : activeAnchor === 'start'
                  ? 'Trazando desde P1 (Inicio)'
                  : activeAnchor === 'end'
                  ? `Trazando desde P${drawPoints.length} (Final)`
                  : 'Extremo libre (Haz clic para seguir)'}
              </span>
              <span className="text-slate-400 text-[10px]">({drawPoints.length} {drawPoints.length === 1 ? 'pto' : 'ptos'})</span>
            </div>

            {/* Selector interactivo de extremo para continuar desde el otro punto en muros */}
            {activeTool === 'wall' && drawPoints.length > 1 && (
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAnchor('start');
                    setStatusMsg('Origen de trazo cambiado a P1 (extremo inicial).');
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                    activeAnchor === 'start'
                      ? 'bg-[#5833c7] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="Continuar dibujando desde el extremo inicial P1"
                >
                  ◀ P1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAnchor('end');
                    setStatusMsg(`Origen de trazo cambiado a P${drawPoints.length} (extremo final).`);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                    activeAnchor === 'end'
                      ? 'bg-[#5833c7] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Continuar dibujando desde el extremo final P${drawPoints.length}`}
                >
                  P{drawPoints.length} ▶
                </button>
                {activeAnchor !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAnchor(null);
                      setStatusMsg('Extremo soltado (Esc). Haz clic en P1, en Pn o en el lienzo para continuar.');
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/10 transition"
                    title="Soltar cursor para moverte o elegir otro punto (Esc)"
                  >
                    Soltar (Esc)
                  </button>
                )}
              </div>
            )}

            {/* Entrada dinámica de medidas CAD */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleExecuteDynamicInput(); }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={dynamicInputRef}
                type="text"
                value={dynamicInputStr}
                onChange={(e) => { setDynamicInputStr(e.target.value); setDynamicInputError(null); }}
                placeholder={activeTool === 'rect' ? 'Ej: 8,5' : 'Ej: 5 o 5<90'}
                className="w-24 sm:w-28 bg-[#0A0C14] text-xs font-mono font-bold text-white px-2 py-1 rounded-lg border border-white/20 focus:outline-none focus:border-[#a78bfa]"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-[#5833c7] hover:bg-[#4727a8] text-white text-xs font-bold rounded-lg transition"
                title="Aplicar medida (Enter)"
              >
                ↵
              </button>
            </form>

            {/* Cerrar recinto (C) si >= 3 paredes */}
            {activeTool === 'wall' && drawPoints.length >= 3 && (
              <button
                type="button"
                onClick={handleClosePolygonExplicit}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm"
                title="Cerrar recinto uniendo los dos extremos (Tecla C)"
              >
                <Check className="w-3 h-3" />
                <span>Cerrar (C)</span>
              </button>
            )}

            {/* Deshacer último punto colocado */}
            <button
              type="button"
              onClick={handleUndoLastPoint}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1"
              title="Deshacer punto colocado (Backspace)"
            >
              <Undo2 className="w-3 h-3" />
              <span className="hidden sm:inline">Deshacer</span>
            </button>

            {/* Descartar trazo */}
            <button
              type="button"
              onClick={handleDiscardDrawing}
              className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-lg transition flex items-center gap-1"
              title="Descartar trazo por completo"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {dynamicInputError && (
              <span className="text-[10px] text-rose-400 font-sans">{dynamicInputError}</span>
            )}
          </div>
        )}

        {/* --- AVISO SI FUENTE O MICRO ESTÁN FUERA DEL RECINTO --- */}
        {showAcousticNodes && (!isSourceInside || !isReceiverInside) && (
          <div className="absolute top-14 left-3 z-30 bg-[#ef4444]/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-2xl flex items-center gap-2 text-xs animate-fadeIn font-sans font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
            <span>{!isSourceInside && !isReceiverInside ? 'Fuente y Micrófono fuera del recinto' : !isSourceInside ? 'Fuente acústica fuera de las paredes' : 'Micrófono fuera de las paredes'}</span>
            <button
              type="button"
              onClick={handleRecenterNodes}
              className="ml-1 px-2.5 py-1 bg-white text-[#ef4444] hover:bg-white/90 font-bold rounded-lg transition shadow-xs"
              title="Reubicar automáticamente en una posición interior segura"
            >
              Centrar en Sala
            </button>
          </div>
        )}

        {/* --- TARJETA CONTEXTUAL DE VÉRTICE SELECCIONADO (CAD HUD) --- */}
        {selectedVertexIdx !== null && activeTool === 'select' && vertices[selectedVertexIdx] && (
          <div className="absolute top-3 right-3 z-30 bg-[#141622]/95 backdrop-blur-md p-2 rounded-xl border border-amber-500/40 shadow-2xl flex items-center gap-2 text-xs animate-fadeIn">
            <div className="flex items-center gap-1.5 font-mono font-bold text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>V{selectedVertexIdx + 1}: ({vertices[selectedVertexIdx].x}m, {vertices[selectedVertexIdx].y}m)</span>
            </div>

            <div className="h-4 w-px bg-white/20" />

            <button
              type="button"
              onClick={() => handleContinueDrawingFromVertex(selectedVertexIdx)}
              className="px-2 py-1 bg-[#5833c7] hover:bg-[#4727a8] text-white font-bold rounded-lg transition flex items-center gap-1 shadow-xs"
              title="Continuar trazando paredes desde este vértice"
            >
              <PenTool className="w-3 h-3" />
              <span>Continuar trazo</span>
            </button>

            <button
              type="button"
              onClick={() => removeVertex(selectedVertexIdx)}
              disabled={vertices.length <= 3}
              className="px-2 py-1 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-30 text-white font-bold rounded-lg transition flex items-center gap-1"
              title="Eliminar vértice (Supr / Backspace)"
            >
              <Trash2 className="w-3 h-3" />
              <span>Eliminar</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedVertexIdx(null)}
              className="text-slate-400 hover:text-white px-1 font-bold"
              title="Cerrar selección (Esc)"
            >
              ✕
            </button>
          </div>
        )}

        {/* LIENZO SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full select-none h-[360px] sm:h-[440px]"
          style={{ cursor: isPanning ? 'grabbing' : isSpaceDown ? 'grab' : activeTool !== 'select' ? 'crosshair' : 'default', touchAction: 'none' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={(e) => {
            handleCanvasPointerMove(e);
            handlePointerMove(e);
            handleEntityPointerMove(e);
          }}
          onPointerUp={(e) => {
            handleCanvasPointerUp(e);
            handlePointerUp(e);
            handleEntityPointerUp(e);
          }}
          onClick={handleCanvasClick}
        >
          <defs>
            <linearGradient id="cadBgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8f9fe" />
            </linearGradient>

            <filter id="vertexGlowPurple" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Fondo del Lienzo */}
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#cadBgGlow)" className="dark:fill-[#0c0d18]" data-canvas-bg="true" />

          {/* Cuadrícula Arquitectónica */}
          {gridLines.map((line, i) => (
            <line
              key={i}
              x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
              stroke={line.isFive ? 'rgba(88, 51, 199, 0.45)' : line.major ? 'rgba(88, 51, 199, 0.2)' : 'rgba(0, 0, 0, 0.1)'}
              className={line.isFive ? 'dark:stroke-[#8767f9]/50' : line.major ? 'dark:stroke-[#8767f9]/30' : 'dark:stroke-white/[0.1]'}
              strokeWidth={line.isFive ? 1.2 : line.major ? 0.8 : 0.4}
              strokeDasharray={line.major ? 'none' : '2,2'}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Puntos de Intersección CAD */}
          {intersectionDots.map((d, i) => (
            <circle
              key={`dot-${i}`}
              cx={d.x} cy={d.y} r={1.2}
              fill="rgba(88, 51, 199, 0.35)"
              className="dark:fill-[#8767f9]/40"
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Marcadores métricos en ejes */}
          {gridLines.filter(l => l.axis === 'x' && l.major && l.val >= 0 && Math.round(l.val) % 2 === 0).map((l, idx) => (
            <text
              key={`x-label-${idx}`}
              x={l.x1}
              y={CANVAS_H - 6}
              fill="rgba(88, 51, 199, 0.6)"
              className="dark:fill-[#8767f9]/70"
              fontSize="9"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {l.val}m
            </text>
          ))}

          {gridLines.filter(l => l.axis === 'y' && l.major && l.val >= 0 && Math.round(l.val) % 2 === 0).map((l, idx) => (
            <text
              key={`y-label-${idx}`}
              x={14}
              y={l.y1 + 3}
              fill="rgba(88, 51, 199, 0.6)"
              className="dark:fill-[#8767f9]/70"
              fontSize="9"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {l.val}m
            </text>
          ))}

          {/* LÍNEAS GUÍA AUXILIARES (Libres, trazadas por el usuario con X) */}
          {showGuides && guides.map((g) => {
            const s1 = toScreen(g.a.x, g.a.y);
            const s2 = toScreen(g.b.x, g.b.y);
            const d = dist(g.a, g.b);
            return (
              <g key={g.id} style={{ pointerEvents: 'none' }}>
                <line
                  x1={s1.x} y1={s1.y}
                  x2={s2.x} y2={s2.y}
                  stroke="#0ea5e9"
                  strokeWidth="1.6"
                  strokeDasharray="5,4"
                  strokeOpacity="0.85"
                />
                <circle cx={s1.x} cy={s1.y} r={2.5} fill="#0ea5e9" />
                <circle cx={s2.x} cy={s2.y} r={2.5} fill="#0ea5e9" />
                <text
                  x={(s1.x + s2.x) / 2}
                  y={(s1.y + s2.y) / 2 - 5}
                  fill="#0ea5e9"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  guía {d.toFixed(1)}m
                </text>
              </g>
            );
          })}

          {/* Relleno del polígono de la sala */}
          <path
            d={polyPath}
            fill={drawPoints.length > 0 ? "rgba(88, 51, 199, 0.02)" : "rgba(88, 51, 199, 0.08)"}
            stroke={drawPoints.length > 0 ? "rgba(88, 51, 199, 0.25)" : "rgba(88, 51, 199, 0.75)"}
            strokeDasharray={drawPoints.length > 0 ? "4,4" : "none"}
            strokeWidth="2.2"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />

          {/* Aristas existentes de la sala */}
          {edges.map((edge, i) => {
            const s1 = toScreen(edge.from.x, edge.from.y);
            const s2 = toScreen(edge.to.x, edge.to.y);
            const isHovered = hoveredEdge === i;
            const wallId = `wall_${i}`;
            const matConfig = materials?.[wallId];
            const matColor = matConfig ? getMaterialColor(matConfig.materialId) : null;
            const isCurved = Math.abs(edge.bulge) > 0.02;

            const arcPts = isCurved ? getEdgeArcPoints(edge.from, edge.to, edge.bulge, 16, isCCW) : null;
            const screenArcPts = isCurved ? arcPts.map(p => toScreen(p.x, p.y)) : null;
            const edgePathD = isCurved
              ? screenArcPts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
              : null;

            const midScreen = isCurved
              ? screenArcPts[Math.floor(screenArcPts.length / 2)]
              : { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };

            const nx = -Math.sin(edge.angle) * 14;
            const ny = Math.cos(edge.angle) * 14;
            const badgeX = midScreen.x + nx;
            const badgeY = midScreen.y + ny;

            return (
              <g key={`edge-${i}`} opacity={drawPoints.length > 0 ? 0.35 : 1}>
                {activeTool === 'select' && (
                  isCurved ? (
                    <path
                      d={edgePathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="18"
                      style={{ cursor: 'copy' }}
                      onMouseEnter={() => setHoveredEdge(i)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        const svg = svgRef.current;
                        if (svg) {
                          const rect = svg.getBoundingClientRect();
                          const sx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
                          const sy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
                          addVertexOnEdge(i, toWorld(sx, sy));
                        } else {
                          addVertexOnEdge(i);
                        }
                      }}
                    />
                  ) : (
                    <line
                      x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                      stroke="transparent"
                      strokeWidth="18"
                      style={{ cursor: 'copy' }}
                      onMouseEnter={() => setHoveredEdge(i)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        const svg = svgRef.current;
                        if (svg) {
                          const rect = svg.getBoundingClientRect();
                          const sx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
                          const sy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
                          addVertexOnEdge(i, toWorld(sx, sy));
                        } else {
                          addVertexOnEdge(i);
                        }
                      }}
                    />
                  )
                )}

                {isCurved ? (
                  <path
                    d={edgePathD}
                    fill="none"
                    stroke={isHovered ? '#5833c7' : (matColor?.hex || '#5833c7')}
                    strokeWidth={isHovered ? 3.5 : 2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                ) : (
                  <line
                    x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                    stroke={isHovered ? '#5833c7' : (matColor?.hex || '#5833c7')}
                    strokeWidth={isHovered ? 3.5 : 2.2}
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {showMeasurements && (
                  <g>
                    {editingEdgeIdx === i ? (
                      <foreignObject x={badgeX - 32} y={badgeY - 11} width={64} height={22}>
                        <div className="flex items-center justify-center w-full h-full">
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={editingLengthStr}
                            onChange={(e) => setEditingLengthStr(e.target.value)}
                            onBlur={() => handleApplyEdgeLength(i, editingLengthStr)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleApplyEdgeLength(i, editingLengthStr);
                              if (e.key === 'Escape') setEditingEdgeIdx(null);
                            }}
                            className="w-full h-full text-center text-[10px] font-mono font-bold bg-white dark:bg-[#181a28] text-[#5833c7] dark:text-[#8767f9] border-2 border-[#5833c7] rounded-md shadow-lg outline-none px-0.5"
                          />
                        </div>
                      </foreignObject>
                    ) : (
                      <g
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingEdgeIdx(i);
                          setEditingLengthStr(edge.length.toFixed(2));
                        }}
                        style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                      >
                        <rect
                          x={badgeX - (isCurved ? 36 : 28)}
                          y={badgeY - 7.5}
                          width={isCurved ? 72 : 56}
                          height={15}
                          rx={4}
                          fill="rgba(255,255,255,0.96)"
                          stroke={isCurved ? '#5833c7' : 'rgba(0,0,0,0.12)'}
                          strokeWidth={isCurved ? 1 : 0.5}
                          className="dark:fill-[#161726] dark:stroke-white/20 hover:stroke-[#5833c7] transition"
                        />
                        <text
                          x={badgeX}
                          y={badgeY + 3.5}
                          fill="#1d1d1f"
                          fontSize="8.5"
                          fontWeight="700"
                          fontFamily="'JetBrains Mono', monospace"
                          textAnchor="middle"
                          className="dark:fill-white select-none pointer-events-none"
                        >
                          {edge.length.toFixed(2)}m{isCurved ? ' (arc)' : ''}
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* Indicador visual de corte exacto al pasar el cursor sobre una pared */}
          {edgeHoverSplitPoint && activeTool === 'select' && (() => {
            const sp = toScreen(edgeHoverSplitPoint.point.x, edgeHoverSplitPoint.point.y);
            return (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={sp.x} cy={sp.y} r={7} fill="#5833c7" stroke="white" strokeWidth={2} className="dark:fill-[#a78bfa]" />
                <circle cx={sp.x} cy={sp.y} r={12} fill="rgba(88, 51, 199, 0.2)" stroke="#5833c7" strokeWidth={1} strokeDasharray="2,2" />
                <g transform={`translate(${sp.x}, ${sp.y - 14})`}>
                  <rect x="-38" y="-9" width="76" height="18" rx="5" fill="#141622" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <text x="0" y="3.5" fill="#a78bfa" fontSize="8.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    + Dividir aquí
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Vértices de la sala */}
          {vertices.map((v, i) => {
            const s = toScreen(v.x, v.y);
            const isDragging = draggingIdx === i;
            const isHovered = hoveredIdx === i;
            const isSelected = selectedVertexIdx === i;

            return (
              <g key={`v-${i}`}>
                {(isDragging || isHovered || isSelected) && (
                  <circle
                    cx={s.x} cy={s.y}
                    r={isSelected ? 16 : 14}
                    fill={isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(88, 51, 199, 0.2)'}
                    stroke={isSelected ? '#f59e0b' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    strokeDasharray={isSelected ? '3,2' : 'none'}
                    filter={!isSelected ? 'url(#vertexGlowPurple)' : undefined}
                  />
                )}

                {activeTool === 'select' && (
                  <circle
                    cx={s.x} cy={s.y}
                    r={18}
                    fill="transparent"
                    style={{ cursor: 'pointer', touchAction: 'none' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVertexIdx(i);
                    }}
                    onPointerDown={(e) => {
                      setSelectedVertexIdx(i);
                      handlePointerDown(i, e);
                    }}
                  />
                )}

                <circle
                  cx={s.x} cy={s.y}
                  r={isDragging ? 8 : isSelected ? 7.5 : isHovered ? 7 : 5.5}
                  fill={isDragging ? '#5833c7' : isSelected ? '#f59e0b' : isHovered ? '#7c3aed' : '#ffffff'}
                  stroke={isSelected ? '#d97706' : '#5833c7'}
                  strokeWidth={isDragging || isSelected ? 2.5 : 1.8}
                  style={{ cursor: activeTool === 'select' ? 'pointer' : 'default', transition: 'r 0.1s, fill 0.1s' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVertexIdx(i);
                  }}
                  onPointerDown={(e) => {
                    setSelectedVertexIdx(i);
                    handlePointerDown(i, e);
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onContextMenu={(e) => { e.preventDefault(); removeVertex(i); }}
                  onDoubleClick={(e) => { e.preventDefault(); removeVertex(i); }}
                />

                <text
                  x={s.x} y={s.y - 10}
                  fill={isSelected ? '#f59e0b' : '#5833c7'}
                  fontSize="8" fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  V{i + 1}
                </text>

                {/* Badge flotante de coordenadas si está seleccionado */}
                {isSelected && activeTool === 'select' && (
                  <g transform={`translate(${s.x}, ${s.y + 18})`} style={{ pointerEvents: 'none' }}>
                    <rect
                      x="-54" y="-8" width="108" height="16" rx="4"
                      fill="#141622" stroke="#f59e0b" strokeWidth="1"
                    />
                    <text
                      x="0" y="3.5"
                      fill="#fef3c7" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle"
                    >
                      {v.x.toFixed(2)}m, {v.y.toFixed(2)}m
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Centroide con área */}
          {vertices.length >= 3 && Number.isFinite(centroid.x) && Number.isFinite(centroid.y) && (() => {
            const sc = toScreen(centroid.x, centroid.y);
            return (
              <g style={{ pointerEvents: 'none' }}>
                <text
                  x={sc.x} y={sc.y - 4}
                  fill="#5833c7" fontSize="11.5" fontWeight="800"
                  fontFamily="Inter, system-ui" textAnchor="middle"
                  opacity={0.85}
                >
                  {area.toFixed(1)} m²
                </text>
                <text
                  x={sc.x} y={sc.y + 9}
                  fill="#86868b" fontSize="8.5" fontWeight="600"
                  fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
                >
                  P={perimeter.toFixed(1)}m · V={(area * height).toFixed(1)}m³
                </text>
              </g>
            );
          })()}

          {/* --- TRAZADO CAD EN VIVO (POLILÍNEA DE MUROS / ANCLAJES BIDIRECCIONALES / RUBBERBAND) --- */}
          {drawPoints.length > 0 && (
            <g>
              {/* Tramos ya fijados en el dibujo */}
              {drawPoints.map((pt, idx) => {
                const s = toScreen(pt.x, pt.y);
                const nextPt = drawPoints[idx + 1];
                const nextS = nextPt ? toScreen(nextPt.x, nextPt.y) : null;
                const isStart = idx === 0;
                const isLast = idx === drawPoints.length - 1;
                const isEndpoint = isStart || isLast;
                const isActiveAnchor = (activeAnchor === 'start' && isStart) || (activeAnchor === 'end' && isLast);

                return (
                  <g key={`draw-pt-${idx}`}>
                    {nextS && (
                      <line
                        x1={s.x} y1={s.y}
                        x2={nextS.x} y2={nextS.y}
                        stroke="#5833c7"
                        strokeWidth="3.0"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Vértice con estilos interactivos */}
                    <circle
                      cx={s.x} cy={s.y}
                      r={isActiveAnchor ? 8 : isEndpoint ? 7 : 5}
                      fill={isActiveAnchor ? '#7c3aed' : isEndpoint ? '#5833c7' : '#8b5cf6'}
                      stroke="white"
                      strokeWidth={isActiveAnchor ? 2.5 : 2}
                      className={isEndpoint ? 'cursor-pointer' : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isStart) {
                          if (activeAnchor === 'end' && drawPoints.length >= 3) {
                            handleClosePolygonExplicit();
                          } else {
                            setActiveAnchor('start');
                            setStatusMsg('Continuando trazo desde el extremo inicial P1.');
                          }
                        } else if (isLast) {
                          if (activeAnchor === 'start' && drawPoints.length >= 3) {
                            handleClosePolygonExplicit();
                          } else {
                            setActiveAnchor('end');
                            setStatusMsg(`Continuando trazo desde el extremo final P${drawPoints.length}.`);
                          }
                        } else {
                          setDrawPoints(drawPoints.slice(0, idx + 1));
                          setActiveAnchor('end');
                          setStatusMsg(`Continuando trazo desde P${idx + 1}.`);
                        }
                      }}
                    />

                    {/* Etiqueta del vértice P1, P2... */}
                    <text
                      x={s.x} y={s.y - 12}
                      fill="#c4b5fd"
                      fontSize="9.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle"
                    >
                      P{idx + 1}
                    </text>

                    {/* Halo pulsante en el extremo activo */}
                    {isActiveAnchor && (
                      <circle
                        cx={s.x} cy={s.y} r={14}
                        fill="rgba(124, 58, 237, 0.2)"
                        stroke="#a78bfa" strokeWidth={1.5}
                        strokeDasharray="3,3"
                      >
                        <animate attributeName="r" values="11;16;11" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Si está soltado (activeAnchor === null), mostrar invitación interactiva en ambos extremos */}
                    {activeAnchor === null && isEndpoint && (
                      <g
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isStart) {
                            setActiveAnchor('start');
                            setStatusMsg('Continuando trazo desde el extremo inicial P1.');
                          } else {
                            setActiveAnchor('end');
                            setStatusMsg(`Continuando trazo desde el extremo final P${drawPoints.length}.`);
                          }
                        }}
                      >
                        <circle
                          cx={s.x} cy={s.y} r={16}
                          fill="rgba(56, 189, 248, 0.22)"
                          stroke="#38bdf8" strokeWidth={1.6}
                          strokeDasharray="3,3"
                        >
                          <animate attributeName="r" values="13;18;13" dur="1.8s" repeatCount="indefinite" />
                        </circle>
                        <g transform={`translate(${s.x}, ${s.y + (isStart ? -26 : 22)})`}>
                          <rect
                            x="-52" y="-9" width="104" height="18" rx="5"
                            fill="#141622" stroke="#38bdf8" strokeWidth="1.2"
                          />
                          <text x="0" y="3.5" fill="#bae6fd" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                            ▶ Seguir desde P{idx + 1}
                          </text>
                        </g>
                      </g>
                    )}

                    {/* Si un extremo está activo, mostrar en el extremo opuesto botón para cambiar de extremo */}
                    {activeAnchor !== null && !isActiveAnchor && isEndpoint && (
                      <g
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isStart) {
                            if (activeAnchor === 'end' && drawPoints.length >= 3) {
                              handleClosePolygonExplicit();
                            } else {
                              setActiveAnchor('start');
                              setStatusMsg('Cambiado a extremo P1.');
                            }
                          } else {
                            if (activeAnchor === 'start' && drawPoints.length >= 3) {
                              handleClosePolygonExplicit();
                            } else {
                              setActiveAnchor('end');
                              setStatusMsg(`Cambiado a extremo P${drawPoints.length}.`);
                            }
                          }
                        }}
                      >
                        <circle cx={s.x} cy={s.y} r={13} fill="rgba(167, 139, 250, 0.15)" stroke="#a78bfa" strokeWidth={1} strokeDasharray="2,2" />
                        <g transform={`translate(${s.x}, ${s.y + (isStart ? -24 : 20)})`}>
                          <rect x="-48" y="-8" width="96" height="16" rx="4" fill="#141622" stroke="#a78bfa" strokeWidth="1" />
                          <text x="0" y="3.5" fill="#e9d5ff" fontSize="8" fontWeight="bold" textAnchor="middle">
                            {drawPoints.length >= 3 ? 'Cerrar / Cambiar' : `Seguir desde P${idx + 1}`}
                          </text>
                        </g>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Tramo elástico (rubberband) */}
              {rubberbandInfo && (
                <g style={{ pointerEvents: 'none' }}>
                  {/* LÍNEA DE RASTREO POLAR / ORTOGONAL INFINITA (Smart Polar Tracking) */}
                  {activeTrackingGuide && activeTrackingGuide.isStraight && !rubberbandInfo.isDetached && (() => {
                    if (activeTrackingGuide.axis === 'h') {
                      const sLeft = toScreen(minXVal - 25, activeTrackingGuide.from.y);
                      const sRight = toScreen(maxXVal + 25, activeTrackingGuide.from.y);
                      return (
                        <g>
                          <line
                            x1={sLeft.x} y1={sLeft.y}
                            x2={sRight.x} y2={sRight.y}
                            stroke="#8767f9"
                            strokeWidth="1.2"
                            strokeDasharray="6,4"
                            opacity="0.65"
                          />
                          <circle cx={rubberbandInfo.toScreen.x} cy={rubberbandInfo.toScreen.y} r="10" fill="none" stroke="#8767f9" strokeWidth="1" strokeDasharray="3,3" />
                        </g>
                      );
                    }
                    if (activeTrackingGuide.axis === 'v') {
                      const sTop = toScreen(activeTrackingGuide.from.x, minYVal - 25);
                      const sBottom = toScreen(activeTrackingGuide.from.x, maxYVal + 25);
                      return (
                        <g>
                          <line
                            x1={sTop.x} y1={sTop.y}
                            x2={sBottom.x} y2={sBottom.y}
                            stroke="#8767f9"
                            strokeWidth="1.2"
                            strokeDasharray="6,4"
                            opacity="0.65"
                          />
                          <circle cx={rubberbandInfo.toScreen.x} cy={rubberbandInfo.toScreen.y} r="10" fill="none" stroke="#8767f9" strokeWidth="1" strokeDasharray="3,3" />
                        </g>
                      );
                    }
                    // Eje relativo perpendicular a la pared previa o colineal
                    const isRelPerp = activeTrackingGuide.axis === 'relative-perp';
                    const p1 = polarPoint(activeTrackingGuide.from, -30, activeTrackingGuide.angle);
                    const p2 = polarPoint(activeTrackingGuide.from, 30, activeTrackingGuide.angle);
                    const s1 = toScreen(p1.x, p1.y);
                    const s2 = toScreen(p2.x, p2.y);
                    const guideColor = isRelPerp ? '#f43f5e' : '#8767f9';
                    return (
                      <g>
                        <line
                          x1={s1.x} y1={s1.y}
                          x2={s2.x} y2={s2.y}
                          stroke={guideColor}
                          strokeWidth="1.4"
                          strokeDasharray={isRelPerp ? "5,3" : "6,4"}
                          opacity="0.8"
                        />
                        <circle cx={rubberbandInfo.toScreen.x} cy={rubberbandInfo.toScreen.y} r="10" fill="none" stroke={guideColor} strokeWidth="1.2" strokeDasharray="3,3" />
                      </g>
                    );
                  })()}

                  {/* GUÍA DE ALINEACIÓN CON OTRO VÉRTICE DE REFERENCIA (Smart Alignment Guide) */}
                  {activeTrackingGuide?.alignedWith && !rubberbandInfo.isDetached && (() => {
                    const sRef = toScreen(activeTrackingGuide.alignedWith.x, activeTrackingGuide.alignedWith.y);
                    const sCurr = rubberbandInfo.toScreen;
                    return (
                      <g>
                        <line
                          x1={sRef.x} y1={sRef.y}
                          x2={sCurr.x} y2={sCurr.y}
                          stroke="#10b981"
                          strokeWidth="1.5"
                          strokeDasharray="3,3"
                          opacity="0.85"
                        />
                        <circle cx={sRef.x} cy={sRef.y} r={6} fill="none" stroke="#10b981" strokeWidth={2} />
                        <circle cx={sRef.x} cy={sRef.y} r={11} fill="rgba(16,185,129,0.18)" />
                      </g>
                    );
                  })()}

                  {/* Línea elástica (rubberband) */}
                  <line
                    x1={rubberbandInfo.fromScreen.x}
                    y1={rubberbandInfo.fromScreen.y}
                    x2={rubberbandInfo.toScreen.x}
                    y2={rubberbandInfo.toScreen.y}
                    stroke={
                      rubberbandInfo.isDetached
                        ? '#38bdf8'
                        : rubberbandInfo.isCrossing
                        ? '#ef4444'
                        : rubberbandInfo.isClosingNear
                        ? '#10b981'
                        : activeTrackingGuide?.isStraight
                        ? (activeTrackingGuide.axis === 'relative-perp' ? '#f43f5e' : '#7c3aed')
                        : '#5833c7'
                    }
                    strokeWidth={rubberbandInfo.isDetached ? '1.5' : activeTrackingGuide?.isStraight ? '2.8' : '2.2'}
                    strokeDasharray={rubberbandInfo.isDetached ? '3,3' : rubberbandInfo.isCrossing ? '4,3' : '5,4'}
                    opacity={rubberbandInfo.isDetached ? 0.6 : 1}
                  />

                  {/* Badge de cota en vivo (distancia y ángulo) */}
                  <g transform={`translate(${(rubberbandInfo.fromScreen.x + rubberbandInfo.toScreen.x) / 2}, ${(rubberbandInfo.fromScreen.y + rubberbandInfo.toScreen.y) / 2 - 14})`}>
                    <rect
                      x={rubberbandInfo.isDetached ? "-60" : activeTrackingGuide?.isStraight ? "-64" : "-46"}
                      y="-10"
                      width={rubberbandInfo.isDetached ? "120" : activeTrackingGuide?.isStraight ? "128" : "92"}
                      height="20"
                      rx="6"
                      fill="#141622"
                      stroke={rubberbandInfo.isDetached ? "#38bdf8" : activeTrackingGuide?.axis === 'relative-perp' ? '#f43f5e' : activeTrackingGuide?.isStraight ? "#a78bfa" : "rgba(255,255,255,0.2)"}
                      strokeWidth={rubberbandInfo.isDetached ? "1.2" : activeTrackingGuide?.isStraight ? "1.5" : "1"}
                    />
                    <text
                      x="0" y="3.5"
                      fill={rubberbandInfo.isDetached ? "#7dd3fc" : rubberbandInfo.isCrossing ? '#f87171' : activeTrackingGuide?.axis === 'relative-perp' ? '#fda4af' : activeTrackingGuide?.isStraight ? '#c4b5fd' : '#ffffff'}
                      fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle"
                    >
                      {rubberbandInfo.isDetached ? `Conectar P${rubberbandInfo.anchorIdx + 1} · ` : ''}
                      {rubberbandInfo.dist.toFixed(2)}m · {
                        Number.isInteger(rubberbandInfo.angle) ? rubberbandInfo.angle : rubberbandInfo.angle.toFixed(1)
                      }°{
                        !rubberbandInfo.isDetached && activeTrackingGuide?.isStraight ? (
                          activeTrackingGuide.alignedWith ? ' ⇥ Alineado' :
                          activeTrackingGuide.axis === 'relative-perp' ? ' ⟂ 90° Perp' :
                          activeTrackingGuide.axis === 'relative-parallel' ? ' ∥ Paralela' :
                          activeTrackingGuide.axis === 'h' ? ' ⇄ Horiz' :
                          activeTrackingGuide.axis === 'v' ? ' ⇅ Vert' : ''
                        ) : ''
                      }
                    </text>
                  </g>

                  {/* Indicador de cierre si está cerca del extremo opuesto */}
                  {rubberbandInfo.isClosingNear && rubberbandInfo.targetOpposite && (() => {
                    const sOpp = toScreen(rubberbandInfo.targetOpposite.x, rubberbandInfo.targetOpposite.y);
                    return (
                      <g transform={`translate(${sOpp.x}, ${sOpp.y})`}>
                        <circle cx="0" cy="0" r="16" fill="rgba(16, 185, 129, 0.25)" stroke="#10b981" strokeWidth="2" strokeDasharray="3,3" />
                        <rect x="-35" y="-30" width="70" height="16" rx="4" fill="#10b981" />
                        <text x="0" y="-19" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">
                          Cerrar Recinto
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </g>
          )}

          {/* --- PREVISUALIZACIÓN DE RECTÁNGULO CAD (R) --- */}
          {drawPoints.length === 1 && activeTool === 'rect' && (() => {
            const p1 = drawPoints[0];
            const p2 = cursorWorld;
            const rVerts = rectangleFromCorners(p1, p2);
            const sVerts = rVerts.map(v => toScreen(v.x, v.y));
            const pathD = `M ${sVerts[0].x} ${sVerts[0].y} L ${sVerts[1].x} ${sVerts[1].y} L ${sVerts[2].x} ${sVerts[2].y} L ${sVerts[3].x} ${sVerts[3].y} Z`;
            const w = Math.abs(p2.x - p1.x);
            const h = Math.abs(p2.y - p1.y);

            return (
              <g style={{ pointerEvents: 'none' }}>
                <path
                  d={pathD}
                  fill="rgba(88, 51, 199, 0.12)"
                  stroke="#5833c7"
                  strokeWidth="2"
                  strokeDasharray="5,4"
                />
                <circle cx={sVerts[0].x} cy={sVerts[0].y} r={5} fill="#5833c7" />
                <circle cx={sVerts[2].x} cy={sVerts[2].y} r={5} fill="#5833c7" />
                <rect
                  x={(sVerts[0].x + sVerts[2].x) / 2 - 40}
                  y={(sVerts[0].y + sVerts[2].y) / 2 - 10}
                  width="80" height="20" rx="5"
                  fill="#141622" stroke="rgba(255,255,255,0.2)"
                />
                <text
                  x={(sVerts[0].x + sVerts[2].x) / 2}
                  y={(sVerts[0].y + sVerts[2].y) / 2 + 3}
                  fill="white" fontSize="9.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle"
                >
                  {w.toFixed(1)}m × {h.toFixed(1)}m
                </text>
              </g>
            );
          })()}

          {/* --- PREVISUALIZACIÓN DE GUÍA (X) O MEDIDA (M) --- */}
          {drawPoints.length === 1 && (activeTool === 'guide' || activeTool === 'measure') && (() => {
            const s1 = toScreen(drawPoints[0].x, drawPoints[0].y);
            const s2 = toScreen(cursorWorld.x, cursorWorld.y);
            const d = dist(drawPoints[0], cursorWorld);
            const isGuide = activeTool === 'guide';

            return (
              <g style={{ pointerEvents: 'none' }}>
                <line
                  x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                  stroke={isGuide ? '#0ea5e9' : '#10b981'}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
                <circle cx={s1.x} cy={s1.y} r={4.5} fill={isGuide ? '#0ea5e9' : '#10b981'} />
                <circle cx={s2.x} cy={s2.y} r={4.5} fill={isGuide ? '#0ea5e9' : '#10b981'} />
                <rect
                  x={(s1.x + s2.x) / 2 - 30} y={(s1.y + s2.y) / 2 - 18}
                  width="60" height="16" rx="4"
                  fill="#141622" stroke="rgba(255,255,255,0.2)"
                />
                <text
                  x={(s1.x + s2.x) / 2} y={(s1.y + s2.y) / 2 - 7}
                  fill={isGuide ? '#38bdf8' : '#34d399'}
                  fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle"
                >
                  {d.toFixed(2)} m
                </text>
              </g>
            );
          })()}

          {/* RESULTADO DE MEDICIÓN FIJADO */}
          {measuredResult && (() => {
            const s1 = toScreen(measuredResult.p1.x, measuredResult.p1.y);
            const s2 = toScreen(measuredResult.p2.x, measuredResult.p2.y);
            return (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#10b981" strokeWidth="2.5" />
                <circle cx={s1.x} cy={s1.y} r={5} fill="#10b981" stroke="white" strokeWidth={1.5} />
                <circle cx={s2.x} cy={s2.y} r={5} fill="#10b981" stroke="white" strokeWidth={1.5} />
                <rect
                  x={(s1.x + s2.x) / 2 - 45} y={(s1.y + s2.y) / 2 - 12}
                  width="90" height="20" rx="6"
                  fill="#064e3b" stroke="#10b981" strokeWidth={1.5}
                />
                <text
                  x={(s1.x + s2.x) / 2} y={(s1.y + s2.y) / 2 + 2}
                  fill="white" fontSize="9.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle"
                >
                  {measuredResult.dist.toFixed(2)}m ({Number.isInteger(measuredResult.angle) ? measuredResult.angle : measuredResult.angle.toFixed(1)}°)
                </text>
              </g>
            );
          })()}

          {/* --- MARCADOR DE IMÁN OSNAP TIPO AUTOCAD --- */}
          {activeTool !== 'select' && currentSnap.type !== 'none' && (() => {
            const sc = toScreen(currentSnap.point.x, currentSnap.point.y);
            if (currentSnap.type === 'endpoint') {
              return (
                <rect
                  x={sc.x - 5} y={sc.y - 5} width="10" height="10"
                  fill="none" stroke="#10b981" strokeWidth="2"
                  style={{ pointerEvents: 'none' }}
                />
              );
            }
            if (currentSnap.type === 'midpoint') {
              return (
                <polygon
                  points={`${sc.x},${sc.y - 6} ${sc.x - 6},${sc.y + 5} ${sc.x + 6},${sc.y + 5}`}
                  fill="none" stroke="#f59e0b" strokeWidth="2"
                  style={{ pointerEvents: 'none' }}
                />
              );
            }
            if (currentSnap.type === 'grid') {
              return (
                <circle
                  cx={sc.x} cy={sc.y} r="3"
                  fill="none" stroke="#5833c7" strokeWidth="1.5"
                  style={{ pointerEvents: 'none' }}
                />
              );
            }
            return null;
          })()}

          {/* NODOS ACÚSTICOS INTERACTIVOS (FUENTE Y RECEPTOR) */}
          {showAcousticNodes && (() => {
            const ss = toScreen(sourcePos.x, sourcePos.y);
            const rs = toScreen(receiverPos.x, receiverPos.y);

            return (
              <g>
                <line
                  x1={ss.x} y1={ss.y} x2={rs.x} y2={rs.y}
                  stroke="#5833c7" strokeWidth={1.5} strokeDasharray="4,3"
                  style={{ pointerEvents: 'none' }}
                />
                <rect
                  x={(ss.x + rs.x) / 2 - 20} y={(ss.y + rs.y) / 2 - 8}
                  width={40} height={16} rx={4}
                  fill="rgba(255,255,255,0.96)" stroke="#5833c7" strokeWidth={1}
                  className="dark:fill-[#16182a]"
                  style={{ pointerEvents: 'none' }}
                />
                <text
                  x={(ss.x + rs.x) / 2} y={(ss.y + rs.y) / 2 + 3.5}
                  fill="#5833c7" fontSize="8" fontWeight="800"
                  fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
                  className="dark:fill-[#8767f9]"
                  style={{ pointerEvents: 'none' }}
                >
                  r={currentDistR.toFixed(1)}m
                </text>

                {/* Fuente S */}
                <g
                  style={{ cursor: draggingEntity === 'source' ? 'grabbing' : 'grab' }}
                  onPointerDown={(e) => handleEntityPointerDown('source', e)}
                  onPointerMove={handleEntityPointerMove}
                  onPointerUp={handleEntityPointerUp}
                >
                  {!isSourceInside && (
                    <circle cx={ss.x} cy={ss.y} r={18} fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,2" />
                  )}
                  <circle cx={ss.x} cy={ss.y} r={11} fill="#5833c7" stroke="white" strokeWidth={2} />
                  <circle cx={ss.x} cy={ss.y} r={4} fill="white" />
                  <rect
                    x={ss.x - (isSourceInside ? 30 : 38)}
                    y={ss.y - 25}
                    width={isSourceInside ? 60 : 76}
                    height={15}
                    rx={4}
                    fill={isSourceInside ? "rgba(88, 51, 199, 0.95)" : "rgba(239, 68, 68, 0.95)"}
                  />
                  <text x={ss.x} y={ss.y - 14} fill="white" fontSize="8" fontWeight="800" fontFamily="Inter, system-ui" textAnchor="middle">
                    {isSourceInside ? "Fuente (S)" : "⚠️ S fuera"}
                  </text>
                </g>

                {/* Receptor R */}
                <g
                  style={{ cursor: draggingEntity === 'receiver' ? 'grabbing' : 'grab' }}
                  onPointerDown={(e) => handleEntityPointerDown('receiver', e)}
                  onPointerMove={handleEntityPointerMove}
                  onPointerUp={handleEntityPointerUp}
                >
                  {!isReceiverInside && (
                    <circle cx={rs.x} cy={rs.y} r={16} fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,2" />
                  )}
                  <circle cx={rs.x} cy={rs.y} r={10} fill="#10b981" stroke="white" strokeWidth={2} />
                  <circle cx={rs.x} cy={rs.y} r={3.5} fill="white" />
                  <rect
                    x={rs.x - (isReceiverInside ? 26 : 34)}
                    y={rs.y - 23}
                    width={isReceiverInside ? 52 : 68}
                    height={15}
                    rx={4}
                    fill={isReceiverInside ? "rgba(16, 185, 129, 0.95)" : "rgba(239, 68, 68, 0.95)"}
                  />
                  <text x={rs.x} y={rs.y - 12} fill="white" fontSize="8" fontWeight="800" fontFamily="Inter, system-ui" textAnchor="middle">
                    {isReceiverInside ? "Micro (R)" : "⚠️ R fuera"}
                  </text>
                </g>
              </g>
            );
          })()}

        </svg>

        {/* Overlay de controles de zoom */}
        <div className="absolute bottom-12 right-3 flex flex-col gap-1 z-10">
          <button
            type="button"
            onClick={() => setUserZoom(z => Math.min(5.0, Number((z * 1.2).toFixed(2))))}
            className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#5833c7] hover:bg-[#5833c7] hover:text-white transition shadow-sm"
            title="Acercar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setUserZoom(z => Math.max(0.25, Number((z / 1.2).toFixed(2))))}
            className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#5833c7] hover:bg-[#5833c7] hover:text-white transition shadow-sm"
            title="Alejar (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={fitToView}
            className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#5833c7] hover:bg-[#5833c7] hover:text-white transition shadow-sm"
            title="Ajustar a vista (0)"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Badge de zoom actual */}
        <div className="absolute bottom-12 left-3 z-10">
          <div className="px-2 py-1 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] shadow-sm">
            <span className="text-[10px] font-bold font-mono text-[#5833c7] dark:text-[#8767f9]">
              {Math.round(userZoom * 100)}%
            </span>
          </div>
        </div>

        {/* --- CONSOLA DE COMANDOS CAD (TIPO AUTOCAD) --- */}
        {showCommandLine && (
          <div className="bg-[#0A0C14] border-t border-white/10 px-3.5 py-1.5 flex items-center gap-2 text-xs font-mono animate-fadeIn z-10">
            <div className="flex items-center gap-1.5 text-[#a78bfa] font-bold shrink-0">
              <Terminal className="w-3.5 h-3.5" />
              <span>COMANDO &gt;</span>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); executeCommand(commandInput); }}
              className="flex-1 flex items-center gap-2"
            >
              <input
                ref={commandInputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Escribe: L, REC, X, M, C, ROT, CENTR, H 3.2, AYUDA o medida 5, 5<90..."
                className="flex-1 bg-transparent text-white placeholder-slate-500 text-xs font-mono outline-none border-none focus:ring-0"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-[#5833c7] hover:bg-[#4727a8] text-white text-[10px] font-bold rounded-lg transition"
              >
                ↵
              </button>
            </form>
            <button
              type="button"
              onClick={() => setShowCommandLine(false)}
              className="text-slate-500 hover:text-white text-xs px-1"
              title="Ocultar línea de comandos"
            >
              ✕
            </button>
          </div>
        )}

        {/* --- BARRA DE ESTADO CAD INFERIOR (TIPO AUTOCAD) --- */}
        <div className="bg-[#fafbfc] dark:bg-[#101222] px-3.5 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#86868b] dark:text-slate-400 border-t border-black/[0.04] dark:border-white/[0.06] gap-2">
          
          {/* Coordenadas en vivo del cursor */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] font-bold text-[#1d1d1f] dark:text-white">
              X: {cursorWorld.x.toFixed(2)}m
            </span>
            <span className="px-2 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] font-bold text-[#1d1d1f] dark:text-white">
              Y: {cursorWorld.y.toFixed(2)}m
            </span>
          </div>

          {/* Botones de estado (ORTO, OSNAP, GRID, etc.) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsOrtho(prev => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                effectiveOrtho
                  ? 'bg-[#5833c7] text-white shadow-2xs'
                  : 'bg-black/[0.05] dark:bg-white/[0.06] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
              title="Modo Ortogonal (F8 o Shift mantenido)"
            >
              <span>ORTO</span>
              <span className="text-[8px] opacity-70">F8</span>
            </button>

            <button
              type="button"
              onClick={() => setSnapToGeometry(prev => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                snapToGeometry
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-black/[0.05] dark:bg-white/[0.06] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
              title="Imanes a geometría (OSNAP F3)"
            >
              <Magnet className="w-3 h-3" />
              <span>SNAP</span>
              <span className="text-[8px] opacity-70">F3</span>
            </button>

            <button
              type="button"
              onClick={() => setSnapToGrid(prev => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                snapToGrid
                  ? 'bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa]'
                  : 'bg-black/[0.05] dark:bg-white/[0.06] text-[#86868b]'
              }`}
              title={`Snap a cuadrícula adaptativa (${currentGridStep.toFixed(2)}m según nivel de zoom)`}
            >
              GRID {currentGridStep.toFixed(2)}m
            </button>

            <button
              type="button"
              onClick={() => setShowMeasurements(prev => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                showMeasurements
                  ? 'bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa]'
                  : 'bg-black/[0.05] dark:bg-white/[0.06] text-[#86868b]'
              }`}
              title="Mostrar u ocultar cotas"
            >
              COTAS
            </button>

            <button
              type="button"
              onClick={() => setShowCommandLine(prev => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                showCommandLine
                  ? 'bg-[#5833c7] text-white shadow-2xs'
                  : 'bg-black/[0.05] dark:bg-white/[0.06] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
              title="Línea de Comandos AutoCAD"
            >
              <Terminal className="w-3 h-3" />
              <span>CMD</span>
            </button>

            {guides.length > 0 && (
              <button
                type="button"
                onClick={handleClearGuides}
                className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1"
                title="Borrar líneas guía"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar Guías ({guides.length})</span>
              </button>
            )}
          </div>

          {/* Telemetría rápida */}
          <div className="hidden lg:flex items-center gap-2 text-[10px]">
            <span>V: <strong className="text-[#1d1d1f] dark:text-white">{vertices.length}</strong></span>
            <span>Área: <strong className="text-[#1d1d1f] dark:text-white">{area.toFixed(1)}m²</strong></span>
            <span>Vol: <strong className="text-[#5833c7] dark:text-[#a78bfa]">{(area * height).toFixed(1)}m³</strong></span>
          </div>

        </div>

      </div>

      {/* --- CONTROL DE ALTURA (H) Y TELEMETRÍA --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-[#141622] rounded-xl border border-black/[0.06] dark:border-white/10 px-3 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-[#1d1d1f] dark:text-white">
            Altura del Recinto (H):
          </label>
          <div className="flex items-center gap-1">
            {[2.5, 3.0, 3.5, 4.0].map((hVal) => (
              <button
                key={hVal}
                type="button"
                onClick={() => { pushHistory(); onChangePolygon({ ...roomPolygon, height: hVal }); }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                  Math.abs(height - hVal) < 0.05
                    ? 'bg-[#5833c7] text-white'
                    : 'bg-[#f5f5f7] dark:bg-[#0A0C14] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {hVal}m
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <input
            type="range"
            min="1" max="10" step="0.1"
            value={height}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) onChangePolygon({ ...roomPolygon, height: Number(val.toFixed(2)) });
            }}
            className="flex-1 sm:w-36 accent-[#5833c7] h-1.5 cursor-pointer"
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min="0.5" max="20" step="0.1"
              value={height}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) onChangePolygon({ ...roomPolygon, height: Number(val.toFixed(2)) });
              }}
              className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold text-center bg-[#f5f5f7] dark:bg-[#0A0C14] rounded-md border border-black/[0.08] dark:border-white/10 text-[#1d1d1f] dark:text-white"
            />
            <span className="text-xs text-[#86868b] font-semibold">m</span>
          </div>
        </div>
      </div>

      {/* --- PANEL INFERIOR: GESTOR DE PAREDES Y COORDENADAS --- */}
      <div className="bg-white dark:bg-[#141622] rounded-2xl border border-black/[0.06] dark:border-white/10 p-3 space-y-2.5 shadow-2xs">
        
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/10 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setEditorTab('walls'); setIsEditorExpanded(true); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                editorTab === 'walls' && isEditorExpanded
                  ? 'bg-[#5833c7] text-white shadow-xs'
                  : 'bg-[#f5f5f7] dark:bg-[#0A0C14] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Paredes ({edges.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setEditorTab('coords'); setIsEditorExpanded(true); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                editorTab === 'coords' && isEditorExpanded
                  ? 'bg-[#5833c7] text-white shadow-xs'
                  : 'bg-[#f5f5f7] dark:bg-[#0A0C14] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Coordenadas X/Y ({vertices.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            className="p-1 rounded-lg text-[#86868b] hover:text-[#5833c7] text-xs font-bold transition"
          >
            {isEditorExpanded ? '▲ Ocultar' : '▼ Mostrar'}
          </button>
        </div>

        {isEditorExpanded && (
          <>
            {/* Pestaña 1: Editor de Paredes y Curvatura */}
            {editorTab === 'walls' && (
              <div className="space-y-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {edges.map((edge, i) => {
                    const j = (i + 1) % vertices.length;
                    const wallId = `wall_${i}`;
                    const matConfig = materials?.[wallId];
                    const matInfo = matConfig ? getMaterialById(matConfig.materialId) : null;
                    const isHovered = hoveredEdge === i;
                    const isCurved = Math.abs(edge.bulge) > 0.02;

                    return (
                      <div
                        key={`wall-card-${i}`}
                        onMouseEnter={() => setHoveredEdge(i)}
                        onMouseLeave={() => setHoveredEdge(null)}
                        className={`p-2.5 rounded-xl border transition flex flex-col justify-between gap-1.5 ${
                          isHovered
                            ? 'bg-[#5833c7]/10 dark:bg-[#5833c7]/20 border-[#5833c7] shadow-xs'
                            : 'bg-[#fbfbfd] dark:bg-[#0A0C14] border-black/[0.06] dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-px rounded bg-[#5833c7]/15 text-[#5833c7] dark:text-[#a78bfa] text-[9.5px] font-bold">
                                Pared {i + 1}
                              </span>
                              <span className="text-[10px] text-[#86868b] font-mono">
                                V{i + 1} → V{j + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-black text-[#1d1d1f] dark:text-white font-mono">
                                {edge.length.toFixed(2)} m {isCurved ? '(arco)' : ''}
                              </span>
                              <span className="text-[9.5px] text-[#86868b] truncate" title={matInfo?.name || 'Material'}>
                                • {matInfo?.name || 'Material'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => addVertexOnEdge(i)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#5833c7] hover:bg-[#4726aa] text-white text-[10.5px] font-semibold transition shrink-0 active:scale-95 shadow-2xs"
                            title="Dividir pared e insertar vértice en la mitad"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Dividir</span>
                          </button>
                        </div>

                        {/* Control de pared paralela y curvatura */}
                        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.06] text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[#86868b] font-medium">Paralela:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOffsetEdge(i, -0.2)}
                                className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] hover:bg-[#5833c7] hover:text-white transition font-mono font-bold"
                                title="Desplazar pared 0.2m hacia adentro (-0.2m)"
                              >
                                -0.2m
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOffsetEdge(i, 0.2)}
                                className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] hover:bg-[#5833c7] hover:text-white transition font-mono font-bold"
                                title="Desplazar pared 0.2m hacia afuera (+0.2m)"
                              >
                                +0.2m
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[#86868b] font-medium">Curvatura:</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="range"
                                min="-2.0" max="2.0" step="0.1"
                                value={curvatures[i] || 0}
                                onChange={(e) => handleCurvatureChange(i, parseFloat(e.target.value))}
                                className="w-16 sm:w-24 accent-[#5833c7] h-1 cursor-pointer"
                                title="Flecha del arco (+ exterior, - interior)"
                              />
                              <span className={`font-mono font-bold min-w-[34px] text-right ${
                                isCurved ? 'text-[#5833c7] dark:text-[#a78bfa]' : 'text-[#86868b]'
                              }`}>
                                {(curvatures[i] || 0) > 0 ? '+' : ''}{(curvatures[i] || 0).toFixed(1)}m
                              </span>
                              {isCurved && (
                                <button
                                  type="button"
                                  onClick={() => handleCurvatureChange(i, 0)}
                                  className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b] hover:text-rose-500 transition text-[9px]"
                                >
                                  Recta
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pestaña 2: Coordenadas Numéricas (X, Y) */}
            {editorTab === 'coords' && (
              <div className="space-y-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {vertices.map((v, i) => (
                    <div key={i} className="flex items-center justify-between gap-1.5 bg-[#fbfbfd] dark:bg-[#0A0C14] rounded-xl p-1.5 px-2 border border-black/[0.06] dark:border-white/10">
                      <span className="text-[10px] font-bold text-[#5833c7] dark:text-[#a78bfa] min-w-[18px]">
                        V{i + 1}
                      </span>

                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-[#86868b] font-mono">X:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={Number(v.x).toFixed(2)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val)) return;
                              pushHistory();
                              const newVerts = [...vertices];
                              newVerts[i] = { ...newVerts[i], x: Number(val.toFixed(2)) };
                              onChangePolygon({ ...roomPolygon, vertices: newVerts });
                              setActivePresetId('custom');
                            }}
                            className="w-14 px-1 py-0.5 text-[10px] font-mono bg-white dark:bg-[#141622] rounded border border-black/[0.08] dark:border-white/10 text-center text-[#1d1d1f] dark:text-white"
                          />
                        </div>

                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-[#86868b] font-mono">Y:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={Number(v.y).toFixed(2)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val)) return;
                              pushHistory();
                              const newVerts = [...vertices];
                              newVerts[i] = { ...newVerts[i], y: Number(val.toFixed(2)) };
                              onChangePolygon({ ...roomPolygon, vertices: newVerts });
                              setActivePresetId('custom');
                            }}
                            className="w-14 px-1 py-0.5 text-[10px] font-mono bg-white dark:bg-[#141622] rounded border border-black/[0.08] dark:border-white/10 text-center text-[#1d1d1f] dark:text-white"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeVertex(i)}
                        disabled={vertices.length <= 3}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-20 p-1 transition"
                        title={vertices.length <= 3 ? "Mínimo 3 vértices requeridos" : "Eliminar vértice"}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- MODAL DE ATAJOS Y CONTROL CAD 2D --- */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#141622] border border-white/15 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-white">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#0A0C14]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#a78bfa]" />
                <h3 className="font-bold text-sm tracking-wide">Guía de Control y Atajos CAD 2D</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              {/* Sección 1: Herramientas */}
              <div>
                <h4 className="font-bold text-[#a78bfa] uppercase tracking-wider text-[10.5px] mb-2 flex items-center gap-1.5">
                  <PenTool className="w-3 h-3" />
                  <span>Herramientas Principales</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Muro (Polilínea)</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 text-[#a78bfa] font-bold">L</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Rectángulo</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 text-[#a78bfa] font-bold">R</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Línea Guía Auxiliar</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 text-sky-400 font-bold">X</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Cinta Métrica</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 text-emerald-400 font-bold">M</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Pausar Trazo / Selección</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 font-bold">Esc / V</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Deshacer Último Punto</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 text-amber-400 font-bold">Backspace</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Cerrar Recinto</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 text-emerald-400 font-bold">C / Enter</kbd>
                  </div>
                </div>
              </div>

              {/* Sección 2: Precisión e Imanes */}
              <div>
                <h4 className="font-bold text-[#a78bfa] uppercase tracking-wider text-[10.5px] mb-2 flex items-center gap-1.5">
                  <Magnet className="w-3 h-3" />
                  <span>Imanes y Modos de Precisión</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Modo Orto (0° / 90°)</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 font-bold">F8 / Shift</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="font-sans">Imanes OSNAP</span>
                    <kbd className="px-1.5 py-0.5 bg-black/50 rounded border border-white/20 font-bold">F3</kbd>
                  </div>
                </div>
              </div>

              {/* Sección 3: Entrada Dinámica */}
              <div>
                <h4 className="font-bold text-[#a78bfa] uppercase tracking-wider text-[10.5px] mb-2 flex items-center gap-1.5">
                  <Compass className="w-3 h-3" />
                  <span>Entrada Numérica Dinámica</span>
                </h4>
                <div className="space-y-1.5 bg-white/[0.04] p-3 rounded-xl border border-white/5 font-mono text-[11px] text-slate-300">
                  <p><span className="text-white font-bold">5 ↵</span> : Traza 5 metros en la dirección del cursor.</p>
                  <p><span className="text-white font-bold">5&lt;90 ↵</span> : Traza 5 metros a 90° exactos (0° der, 90° arriba).</p>
                  <p><span className="text-white font-bold">@3,2 ↵</span> : Desplazamiento relativo (+3m en X, +2m en Y).</p>
                  <p><span className="text-white font-bold">8,5 ↵</span> : En herramienta Rectángulo, traza 8 m de ancho × 5 m de alto.</p>
                </div>
              </div>

              {/* Sección 4: Edición de Paredes y Vértices */}
              <div>
                <h4 className="font-bold text-[#a78bfa] uppercase tracking-wider text-[10.5px] mb-2 flex items-center gap-1.5">
                  <Move className="w-3 h-3" />
                  <span>Edición Directa en el Lienzo</span>
                </h4>
                <div className="space-y-1.5 bg-white/[0.04] p-3 rounded-xl border border-white/5 text-[11px] text-slate-300">
                  <p>• <strong className="text-white">Clic en cualquier pared</strong>: Inserta un nuevo vértice exactamente en el punto donde hiciste clic.</p>
                  <p>• <strong className="text-white">Clic en vértice</strong>: Lo selecciona para ajuste fino con halo distintivo.</p>
                  <p>• <strong className="text-white">Flechas ↑ ↓ ← →</strong>: Mueve el vértice seleccionado 0.1 m (<strong className="text-white">Shift + Flechas</strong>: 0.5 m).</p>
                  <p>• <strong className="text-white">Supr / Backspace</strong>: Elimina el vértice seleccionado (manteniendo mínimo 3).</p>
                  <p>• <strong className="text-white">Doble clic en cota</strong>: Escribe la medida numérica exacta para esa pared.</p>
                  <p>• <strong className="text-white">Botones ±0.2m</strong>: Desplaza la pared completa en paralelo en el panel inferior.</p>
                </div>
              </div>

              {/* Sección 5: Comandos de Consola */}
              <div>
                <h4 className="font-bold text-[#a78bfa] uppercase tracking-wider text-[10.5px] mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3 h-3" />
                  <span>Consola de Comandos AutoCAD (CMD)</span>
                </h4>
                <p className="text-[11px] text-slate-300 mb-1">
                  Activa la consola con el botón <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/20 text-[#a78bfa]">CMD</kbd> y escribe:
                </p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px] text-slate-300 bg-white/[0.04] p-2.5 rounded-xl border border-white/5">
                  <span>• L / MURO</span>
                  <span>• REC / RECTANGULO</span>
                  <span>• X / GUIA</span>
                  <span>• M / MEDIR</span>
                  <span>• C / CERRAR</span>
                  <span>• ROT (rotar 90°)</span>
                  <span>• CENTR (centrar 0,0)</span>
                  <span>• H 3.5 (altura)</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/10 bg-[#0A0C14] flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 bg-[#5833c7] hover:bg-[#4727a8] text-white font-bold text-xs rounded-xl transition shadow-xs"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
