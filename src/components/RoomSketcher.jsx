import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  Plus, Minus, RotateCcw, Grid3X3, Maximize2, Move,
  Pentagon, Square, Hexagon, Triangle, Layers, Ruler,
  Radio, Volume2, Mic, Check, ZoomIn, ZoomOut, Crosshair,
  MousePointer, Hand, Undo2, Redo2, Download, Upload, CheckCircle2
} from 'lucide-react';
import { polygonArea, polygonCentroid, getEdgeArcPoints, isPolygonCCW } from '../utils/acousticCalculations';
import { getMaterialById, getMaterialColor } from '../utils/defaultMaterials';

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
 * RoomSketcher — Editor 2D Arquitectónico de Planta Libre
 * Con cuadrícula de alta visibilidad, zoom con scroll, pan con arrastre,
 * fit-to-view automático, y colocación interactiva de Fuente y Receptor según ISO 3382.
 */
export default function RoomSketcher({
  roomPolygon,
  onChangePolygon,
  geometry,
  materials,
  sourceReceiver,
  onChangeSourceReceiver,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [draggingEntity, setDraggingEntity] = useState(null); // 'source' | 'receiver' | null
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showAcousticNodes, setShowAcousticNodes] = useState(true);
  const [activePresetId, setActivePresetId] = useState('rectangle');
  const [editorTab, setEditorTab] = useState('walls'); // 'walls' | 'coords'
  const [isEditorExpanded, setIsEditorExpanded] = useState(true);

  // Estado para edición interactiva inline de longitud de pared (doble clic en cota)
  const [editingEdgeIdx, setEditingEdgeIdx] = useState(null);
  const [editingLengthStr, setEditingLengthStr] = useState('');

  // Pan con arrastre del canvas
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Refs para throttle con requestAnimationFrame (elimina micro-tirones y lag)
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

  // Cálculo de bounding box de los vértices y centroide
  const xs = useMemo(() => vertices.map(v => v.x), [vertices]);
  const ys = useMemo(() => vertices.map(v => v.y), [vertices]);
  const minX = vertices.length ? Math.min(...xs) : 0;
  const maxX = vertices.length ? Math.max(...xs) : 10;
  const minY = vertices.length ? Math.min(...ys) : 0;
  const maxY = vertices.length ? Math.max(...ys) : 6;
  const centroid = useMemo(() => polygonCentroid(vertices), [vertices]);

  // Posiciones de Fuente y Receptor
  const sourcePos = useMemo(() => {
    if (sourceReceiver?.sourcePos) return sourceReceiver.sourcePos;
    return {
      x: Number((minX + Math.min(2.0, (maxX - minX) * 0.25)).toFixed(2)),
      y: Number((centroid.y).toFixed(2)),
      z: 1.5,
    };
  }, [sourceReceiver?.sourcePos, minX, maxX, centroid]);

  const receiverPos = useMemo(() => {
    if (sourceReceiver?.receiverPos) return sourceReceiver.receiverPos;
    const initialDist = Math.min(3.0, (sourceReceiver?.distance || 3.0));
    return {
      x: Number((sourcePos.x + initialDist).toFixed(2)),
      y: Number((sourcePos.y).toFixed(2)),
      z: 1.2,
    };
  }, [sourceReceiver?.receiverPos, sourcePos, sourceReceiver?.distance]);

  // Puntos totales que delimitan la geometría visible (vértices + arcos de curvatura + nodos acústicos)
  const allBoundsPoints = useMemo(() => {
    const pts = [...vertices];
    if (sourcePos) pts.push(sourcePos);
    if (receiverPos) pts.push(receiverPos);
    
    // Incluir puntos de los arcos curvos
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
  }, [vertices, sourcePos, receiverPos, curvatures, isCCW]);

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

  // Canvas fijo en un tamaño virtual grande, el zoom/pan controla la vista
  const CANVAS_W = 800;
  const CANVAS_H = 500;

  // Escala y offset se calculan para centrar la geometría en el canvas virtual
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

    // Escala uniforme para que quepa en el canvas virtual
    const scaleX = CANVAS_W / totalX;
    const scaleY = CANVAS_H / totalY;
    const s = Math.min(scaleX, scaleY);

    // Centro de la geometría
    const geoCenterX = (bMinX + bMaxX) / 2;
    const geoCenterY = (bMinY + bMaxY) / 2;

    // offset para centrar la geometría en el canvas
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
    // Apply zoom centered on canvas center, then pan
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

  const GRID_STEP = 0.5; // metros

  // --- FIT TO VIEW: Reset zoom/pan to fit all geometry ---
  const fitToView = useCallback(() => {
    setUserZoom(1.0);
    setUserPan({ x: 0, y: 0 });
  }, []);

  // --- ZOOM CON RUEDA DEL MOUSE (centrado en cursor) ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
    wheelRafRef.current = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      
      // Posición del cursor en coordenadas SVG
      const mouseX = (e.clientX - rect.left) / rect.width * CANVAS_W;
      const mouseY = (e.clientY - rect.top) / rect.height * CANVAS_H;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;

      setUserZoom(prevZoom => {
        const newZoom = Math.max(0.25, Math.min(5.0, prevZoom * zoomFactor));
        
        // Ajustar pan para que el zoom sea centrado en el cursor
        setUserPan(prevPan => {
          const cx = CANVAS_W / 2;
          const cy = CANVAS_H / 2;
          // Punto fijo en el mundo que queremos mantener bajo el cursor
          const worldBefore_x = cx + (mouseX - cx - prevPan.x) / prevZoom;
          const worldBefore_y = cy + (mouseY - cy - prevPan.y) / prevZoom;
          // Dónde ese punto mundial termina con el nuevo zoom
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

  // Registrar evento de wheel con passive: false para poder hacer preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // --- PAN CON ARRASTRE DEL CANVAS (click izquierdo en espacio vacío o botón central) ---
  const handleCanvasPointerDown = useCallback((e) => {
    // No pan si estamos editando una cota inline
    if (editingEdgeIdx !== null) return;

    // Solo pan si es click en espacio vacío (no en un vértice/arista/cota)
    // o si es click central/derecho
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: userPan.x, panY: userPan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    // Click izquierdo en fondo vacío → pan (solo en el SVG root o el rect de fondo marcado)
    const target = e.target;
    const isBackgroundRect = target.dataset?.canvasBg === 'true';
    const isSvgRoot = target === svgRef.current;
    const isGridLine = target.tagName === 'line' && target.style?.pointerEvents === 'none';
    if (isSvgRoot || isBackgroundRect || isGridLine) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: userPan.x, panY: userPan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [userPan, editingEdgeIdx]);

  const handleCanvasPointerMove = useCallback((e) => {
    if (!isPanning) return;
    
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleFactorX = CANVAS_W / rect.width;
    const scaleFactorY = CANVAS_H / rect.height;
    
    const dx = (e.clientX - panStartRef.current.x) * scaleFactorX;
    const dy = (e.clientY - panStartRef.current.y) * scaleFactorY;
    
    setUserPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    });
  }, [isPanning]);

  const handleCanvasPointerUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }, [isPanning]);

  // --- GESTOS TÁCTILES PARA MÓVILES (PINCH-TO-ZOOM CON 2 DEDOS) ---
  const touchDistRef = useRef(null);
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && touchDistRef.current) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchDistRef.current;
      if (Math.abs(delta) > 3) {
        const factor = delta > 0 ? 1.03 : 0.97;
        setUserZoom((z) => Math.max(0.25, Math.min(5.0, Number((z * factor).toFixed(3)))));
        touchDistRef.current = dist;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchDistRef.current = null;
  }, []);

  // --- ARRASTRE DE VÉRTICES DE LA SALA CON RAF (FLUIDO 60FPS) ---
  const handlePointerDown = useCallback((idx, e) => {
    e.preventDefault();
    e.stopPropagation();
    pushHistory();
    setDraggingIdx(idx);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pushHistory]);

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
      
      const { x: rawWx, y: rawWy } = toWorld(sx, sy);

      const step = snapToGrid ? GRID_STEP : 0.1;
      const snappedX = Math.round(rawWx / step) * step;
      const snappedY = Math.round(rawWy / step) * step;

      const cleanX = Number(snappedX.toFixed(1));
      const cleanY = Number(snappedY.toFixed(1));

      const newVerts = [...vertices];
      newVerts[draggingIdx] = { x: cleanX, y: cleanY };
      onChangePolygon({ ...roomPolygon, vertices: newVerts });
      setActivePresetId('custom');
    });
  }, [draggingIdx, vertices, roomPolygon, onChangePolygon, snapToGrid, toWorld]);

  const handlePointerUp = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (draggingIdx !== null) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      setDraggingIdx(null);
    }
  }, [draggingIdx]);

  // --- APLICACIÓN INLINE DE LONGITUD DE PARED (DOBLE CLIC EN COTA) ---
  const handleApplyEdgeLength = useCallback((edgeIdx, newLenStr) => {
    const desiredLen = parseFloat(newLenStr);
    if (isNaN(desiredLen) || desiredLen <= 0.2) {
      setEditingEdgeIdx(null);
      return;
    }

    pushHistory();

    const N = vertices.length;

    // CASO 1: Polígono de 4 vértices (rectángulo o caja ortogonal)
    // Se ajusta la dimensión correspondiente (ancho o alto) alineando automáticamente
    // las paredes opuestas para que la sala conserve su ortogonalidad perfecta sin sesgarse.
    if (N === 4 && activePresetId !== 'trapezoid') {
      const i = edgeIdx;
      const j = (edgeIdx + 1) % 4;
      const vi = vertices[i];
      const vj = vertices[j];

      // Determinar si la pared editada es horizontal o vertical
      const isHorizontal = Math.abs(vj.x - vi.x) >= Math.abs(vj.y - vi.y);

      // Origen de referencia (esquina superior izquierda de la sala)
      const originX = Math.min(vertices[0].x, vertices[3].x);
      const originY = Math.min(vertices[0].y, vertices[1].y);

      // Dimensiones de ancho y alto
      const curWidth = Math.max(
        0.5,
        Math.hypot(vertices[1].x - vertices[0].x, vertices[1].y - vertices[0].y),
        Math.hypot(vertices[2].x - vertices[3].x, vertices[2].y - vertices[3].y)
      );
      const curHeight = Math.max(
        0.5,
        Math.hypot(vertices[2].x - vertices[1].x, vertices[2].y - vertices[1].y),
        Math.hypot(vertices[0].x - vertices[3].x, vertices[0].y - vertices[3].y)
      );

      let newVerts;
      if (isHorizontal) {
        // Modifica el ancho horizontal (pared superior o inferior)
        const targetW = Number(desiredLen.toFixed(1));
        const cleanH = Number(curHeight.toFixed(1));
        newVerts = [
          { x: Number(originX.toFixed(1)), y: Number(originY.toFixed(1)) },
          { x: Number((originX + targetW).toFixed(1)), y: Number(originY.toFixed(1)) },
          { x: Number((originX + targetW).toFixed(1)), y: Number((originY + cleanH).toFixed(1)) },
          { x: Number(originX.toFixed(1)), y: Number((originY + cleanH).toFixed(1)) }
        ];
      } else {
        // Modifica la altura vertical (pared izquierda o derecha)
        const cleanW = Number(curWidth.toFixed(1));
        const targetH = Number(desiredLen.toFixed(1));
        newVerts = [
          { x: Number(originX.toFixed(1)), y: Number(originY.toFixed(1)) },
          { x: Number((originX + cleanW).toFixed(1)), y: Number(originY.toFixed(1)) },
          { x: Number((originX + cleanW).toFixed(1)), y: Number((originY + targetH).toFixed(1)) },
          { x: Number(originX.toFixed(1)), y: Number((originY + targetH).toFixed(1)) }
        ];
      }

      onChangePolygon({ ...roomPolygon, vertices: newVerts });
      setEditingEdgeIdx(null);
      return;
    }

    // CASO 2: Polígonos de N vértices (Forma L, T, U, o polígonos libres)
    // Al redimensionar la pared i (vi -> vj), se desplaza el vértice vj y se arrastra
    // el vértice contiguo vk para que la pared perpendicular adyacente conserve
    // exactamente su longitud y dirección recta, absorbiendo el cambio sin distorsión.
    const i = edgeIdx;
    const j = (edgeIdx + 1) % N;
    const k = (j + 1) % N;
    const vi = vertices[i];
    const vj = vertices[j];
    const vk = vertices[k];

    const dx = vj.x - vi.x;
    const dy = vj.y - vi.y;
    const curDist = Math.hypot(dx, dy);
    if (curDist < 0.01) {
      setEditingEdgeIdx(null);
      return;
    }

    let newJx, newJy;
    if (Math.abs(dy) < 0.05) {
      // Arista puramente horizontal: mantener Y exactamente igual
      const dirX = vj.x >= vi.x ? 1 : -1;
      newJx = Number((vi.x + dirX * desiredLen).toFixed(1));
      newJy = vi.y;
    } else if (Math.abs(dx) < 0.05) {
      // Arista puramente vertical: mantener X exactamente igual
      const dirY = vj.y >= vi.y ? 1 : -1;
      newJx = vi.x;
      newJy = Number((vi.y + dirY * desiredLen).toFixed(1));
    } else {
      // Arista diagonal
      const ux = dx / curDist;
      const uy = dy / curDist;
      newJx = Number((vi.x + ux * desiredLen).toFixed(1));
      newJy = Number((vi.y + uy * desiredLen).toFixed(1));
    }

    const deltaX = newJx - vj.x;
    const deltaY = newJy - vj.y;

    const newVerts = [...vertices];
    newVerts[j] = { x: newJx, y: newJy };
    newVerts[k] = {
      x: Number((vk.x + deltaX).toFixed(1)),
      y: Number((vk.y + deltaY).toFixed(1)),
    };

    onChangePolygon({ ...roomPolygon, vertices: newVerts });
    setActivePresetId('custom');
    setEditingEdgeIdx(null);
  }, [vertices, roomPolygon, onChangePolygon, activePresetId, pushHistory]);

  // --- CONTROL DE CURVATURA DE PARED ---
  const handleCurvatureChange = useCallback((edgeIdx, val) => {
    pushHistory();
    const newCurvatures = { ...(roomPolygon.curvatures || {}) };
    if (Math.abs(val) < 0.05) {
      delete newCurvatures[edgeIdx];
    } else {
      newCurvatures[edgeIdx] = Number(val.toFixed(2));
    }
    onChangePolygon({ ...roomPolygon, curvatures: newCurvatures });
    setActivePresetId('custom');
  }, [roomPolygon, onChangePolygon, pushHistory]);

  const handleEntityPointerDown = (entity, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingEntity(entity);
    e.currentTarget.setPointerCapture(e.pointerId);
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
      const { x: rawWx, y: rawWy } = toWorld(sx, sy);
      const step = snapToGrid ? GRID_STEP : 0.1;
      const cleanX = Number((Math.round(rawWx / step) * step).toFixed(2));
      const cleanY = Number((Math.round(rawWy / step) * step).toFixed(2));

      if (draggingEntity === 'source') {
        const newSource = { ...sourcePos, x: cleanX, y: cleanY };
        const dx = receiverPos.x - newSource.x;
        const dy = receiverPos.y - newSource.y;
        const dz = receiverPos.z - newSource.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        onChangeSourceReceiver({
          ...sourceReceiver,
          sourcePos: newSource,
          distance: Number(dist.toFixed(2)),
        });
      } else if (draggingEntity === 'receiver') {
        const newRec = { ...receiverPos, x: cleanX, y: cleanY };
        const dx = newRec.x - sourcePos.x;
        const dy = newRec.y - sourcePos.y;
        const dz = newRec.z - sourcePos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        onChangeSourceReceiver({
          ...sourceReceiver,
          receiverPos: newRec,
          distance: Number(dist.toFixed(2)),
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

  // Agregar vértice en arista
  const addVertexOnEdge = useCallback((edgeIdx) => {
    pushHistory();
    const i = edgeIdx;
    const j = (edgeIdx + 1) % vertices.length;
    const midX = (vertices[i].x + vertices[j].x) / 2;
    const midY = (vertices[i].y + vertices[j].y) / 2;

    const step = snapToGrid ? GRID_STEP : 0.1;
    const snappedX = Math.round(midX / step) * step;
    const snappedY = Math.round(midY / step) * step;

    const newVerts = [...vertices];
    newVerts.splice(j, 0, {
      x: Number(snappedX.toFixed(1)),
      y: Number(snappedY.toFixed(1)),
    });
    // Limpiar curvatura de la arista dividida
    const newCurvatures = { ...(roomPolygon.curvatures || {}) };
    delete newCurvatures[edgeIdx];
    onChangePolygon({ ...roomPolygon, vertices: newVerts, curvatures: newCurvatures });
    setActivePresetId('custom');
  }, [vertices, roomPolygon, onChangePolygon, snapToGrid, pushHistory]);

  const removeVertex = useCallback((idx) => {
    if (vertices.length <= 3) return;
    pushHistory();
    const newVerts = vertices.filter((_, i) => i !== idx);
    const newCurvatures = { ...(roomPolygon.curvatures || {}) };
    delete newCurvatures[idx];
    onChangePolygon({ ...roomPolygon, vertices: newVerts, curvatures: newCurvatures });
    setActivePresetId('custom');
  }, [vertices, roomPolygon, onChangePolygon, pushHistory]);

  const addNewVertex = useCallback(() => {
    pushHistory();
    const last = vertices[vertices.length - 1] || { x: 5, y: 5 };
    const newVerts = [
      ...vertices,
      { x: Number((last.x + 2).toFixed(1)), y: Number((last.y).toFixed(1)) }
    ];
    onChangePolygon({ ...roomPolygon, vertices: newVerts });
    setActivePresetId('custom');
  }, [vertices, roomPolygon, onChangePolygon, pushHistory]);

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
  }, [roomPolygon, onChangePolygon, geometry, pushHistory]);

  // Cuadrícula arquitectónica visible y contrastada
  const { gridLines, intersectionDots } = useMemo(() => {
    if (!vertices.length) return { gridLines: [], intersectionDots: [] };
    const minXFloor = Math.floor(minXVal - 0.5);
    const maxXCeil = Math.ceil(maxXVal + 0.5);
    const minYFloor = Math.floor(minYVal - 0.5);
    const maxYCeil = Math.ceil(maxYVal + 0.5);
    const lines = [];
    const dots = [];

    // Líneas verticales
    for (let x = minXFloor; x <= maxXCeil; x += GRID_STEP) {
      const s1 = toScreen(x, minYFloor);
      const s2 = toScreen(x, maxYCeil);
      const isMajor = Math.abs(x % 1) < 0.05;
      const isFive = Math.abs(x % 5) < 0.05;
      lines.push({ x1: s1.x, y1: s1.y, x2: s2.x, y2: s2.y, major: isMajor, isFive, val: Math.round(x * 10) / 10, axis: 'x' });
    }
    // Líneas horizontales
    for (let y = minYFloor; y <= maxYCeil; y += GRID_STEP) {
      const s1 = toScreen(minXFloor, y);
      const s2 = toScreen(maxXCeil, y);
      const isMajor = Math.abs(y % 1) < 0.05;
      const isFive = Math.abs(y % 5) < 0.05;
      lines.push({ x1: s1.x, y1: s1.y, x2: s2.x, y2: s2.y, major: isMajor, isFive, val: Math.round(y * 10) / 10, axis: 'y' });
    }

    // Puntos de intersección CAD en metros enteros
    for (let x = Math.ceil(minXVal); x <= Math.floor(maxXVal); x += 1.0) {
      for (let y = Math.ceil(minYVal); y <= Math.floor(maxYVal); y += 1.0) {
        dots.push(toScreen(x, y));
      }
    }

    return { gridLines: lines, intersectionDots: dots };
  }, [vertices, minXVal, maxXVal, minYVal, maxYVal, toScreen]);

  // Aristas y cotas con soporte de curvaturas
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

  const area = useMemo(() => {
    let baseArea = polygonArea(vertices);
    edges.forEach((e) => {
      if (Math.abs(e.bulge) > 0.01) {
        // Delta de segmento circular aproximado = 2/3 * chord * bulge
        baseArea += (2 / 3) * e.chordLength * e.bulge;
      }
    });
    return Math.max(0.1, baseArea);
  }, [vertices, edges]);

  const perimeter = useMemo(() => edges.reduce((s, e) => s + e.length, 0), [edges]);

  // Trazado de polígono suavizado con arcos de curvatura
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

  // --- CONTROL DE ALTURA CON HISTORIAL ---
  const handleHeightChange = useCallback((newH) => {
    if (isNaN(newH) || newH <= 0) return;
    pushHistory();
    onChangePolygon({ ...roomPolygon, height: Number(newH.toFixed(2)) });
  }, [roomPolygon, onChangePolygon, pushHistory]);

  // --- GUARDAR Y EXPORTAR PLANO (.JSON LEGIBLE) ---
  const handleExportDrawing = useCallback(() => {
    const exportPayload = {
      software: 'POZOLE - Simulador Acústico ISO 3382',
      tipo_archivo: 'plano_geometria_sala',
      version: '1.0',
      fecha_guardado: new Date().toLocaleString(),
      sala: {
        tipo_forma: activePresetId,
        altura_metros: Number(height.toFixed(2)),
        area_m2: Number(area.toFixed(2)),
        volumen_m3: Number((area * height).toFixed(2)),
        numero_vertices: vertices.length,
        vertices: vertices.map((v, i) => ({
          vertice: `V${i + 1}`,
          x_metros: Number(v.x.toFixed(2)),
          y_metros: Number(v.y.toFixed(2)),
        })),
        curvaturas_aristas: curvatures || {},
        fuente_sonora: sourcePos ? {
          x_m: Number(sourcePos.x.toFixed(2)),
          y_m: Number(sourcePos.y.toFixed(2)),
          z_m: Number((sourcePos.z ?? 1.5).toFixed(2))
        } : null,
        microfono_receptor: receiverPos ? {
          x_m: Number(receiverPos.x.toFixed(2)),
          y_m: Number(receiverPos.y.toFixed(2)),
          z_m: Number((receiverPos.z ?? 1.2).toFixed(2))
        } : null
      }
    };

    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = `plano_sala_pozole_${activePresetId || 'geometria'}_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusMsg('Plano guardado exitosamente (.json)');
    setTimeout(() => setStatusMsg(null), 3500);
  }, [activePresetId, height, area, vertices, curvatures, sourcePos, receiverPos]);

  // --- CARGAR / SUBIR PLANO (.JSON O .TXT) ---
  const handleImportDrawing = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let parsedData;
        try {
          parsedData = JSON.parse(text);
        } catch (_) {
          // Intentar parsear como texto plano con coordenadas X, Y por línea
          const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
          const coords = [];
          for (const line of lines) {
            const nums = line.match(/[-+]?[0-9]*\.?[0-9]+/g);
            if (nums && nums.length >= 2) {
              coords.push({ x: parseFloat(nums[0]), y: parseFloat(nums[1]) });
            }
          }
          if (coords.length >= 3) {
            parsedData = { sala: { vertices: coords, altura_metros: 3.0 } };
          } else {
            alert('El archivo no contiene un formato JSON válido ni lista de coordenadas.');
            return;
          }
        }

        let parsedVerts = [];
        let parsedH = 3.0;
        let parsedCurv = {};
        let parsedSrc = null;
        let parsedRec = null;

        if (parsedData.sala) {
          const s = parsedData.sala;
          if (Array.isArray(s.vertices)) {
            parsedVerts = s.vertices.map(v => ({
              x: Number(v.x_metros ?? v.x ?? 0),
              y: Number(v.y_metros ?? v.y ?? 0)
            }));
          }
          if (s.altura_metros || s.height) {
            parsedH = Number(s.altura_metros || s.height);
          }
          if (s.curvaturas_aristas || s.curvatures) {
            parsedCurv = s.curvaturas_aristas || s.curvatures || {};
          }
          if (s.fuente_sonora) {
            parsedSrc = {
              x: Number(s.fuente_sonora.x_m ?? s.fuente_sonora.x ?? 2),
              y: Number(s.fuente_sonora.y_m ?? s.fuente_sonora.y ?? 2),
              z: Number(s.fuente_sonora.z_m ?? s.fuente_sonora.z ?? 1.5)
            };
          }
          if (s.microfono_receptor) {
            parsedRec = {
              x: Number(s.microfono_receptor.x_m ?? s.microfono_receptor.x ?? 4),
              y: Number(s.microfono_receptor.y_m ?? s.microfono_receptor.y ?? 2),
              z: Number(s.microfono_receptor.z_m ?? s.microfono_receptor.z ?? 1.2)
            };
          }
        } else if (Array.isArray(parsedData.vertices)) {
          parsedVerts = parsedData.vertices.map(v => ({
            x: Number(v.x ?? 0),
            y: Number(v.y ?? 0)
          }));
          if (parsedData.height) parsedH = Number(parsedData.height);
          if (parsedData.curvatures) parsedCurv = parsedData.curvatures;
        }

        if (!parsedVerts || parsedVerts.length < 3) {
          alert('El archivo debe contener un polígono con mínimo 3 vértices.');
          return;
        }

        const areNums = parsedVerts.every(v => !isNaN(v.x) && !isNaN(v.y));
        if (!areNums) {
          alert('Las coordenadas del polígono contienen valores no numéricos.');
          return;
        }

        pushHistory();

        onChangePolygon({
          vertices: parsedVerts,
          height: parsedH > 0 ? parsedH : 3.0,
          curvatures: parsedCurv
        });

        if (onChangeSourceReceiver && (parsedSrc || parsedRec)) {
          onChangeSourceReceiver(prev => ({
            ...prev,
            ...(parsedSrc ? { sourcePos: parsedSrc } : {}),
            ...(parsedRec ? { receiverPos: parsedRec } : {})
          }));
        }

        setActivePresetId(parsedData.sala?.tipo_forma || 'custom');
        setStatusMsg(`Plano "${file.name}" cargado (${parsedVerts.length} vértices, H=${parsedH}m)`);
        setTimeout(() => setStatusMsg(null), 4000);
        e.target.value = '';
      } catch (err) {
        alert('Error al leer el archivo. Asegúrate de que sea un archivo JSON de POZOLE válido.');
      }
    };
    reader.readAsText(file);
  }, [onChangePolygon, onChangeSourceReceiver, pushHistory]);

  // Teclas rápidas: Zoom (+, -, 0) y Deshacer/Rehacer (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setUserZoom(z => Math.min(5.0, Number((z * 1.15).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setUserZoom(z => Math.max(0.25, Number((z / 1.15).toFixed(2))));
      } else if (e.key === '0') {
        e.preventDefault();
        fitToView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitToView, handleUndo, handleRedo]);

  return (
    <div className="space-y-3">
      
      {/* Barra de Herramientas Compacta: Presets + Snap + Cotas + ISO Nodes + Deshacer/Rehacer + Guardar/Cargar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#161726] rounded-xl p-1 border border-black/[0.06] dark:border-white/[0.08] overflow-x-auto no-scrollbar touch-scroll-x max-w-full">
          {SHAPE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-[#222438] text-[#5833c7] dark:text-[#8767f9] shadow-2xs font-bold'
                    : 'text-[#1d1d1f]/70 dark:text-slate-400 hover:text-[#5833c7] hover:bg-white/50'
                }`}
                title={`Forma ${preset.name}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Toggle Nodo Acústicos (Fuente y Mic) */}
          <button
            onClick={() => setShowAcousticNodes(!showAcousticNodes)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              showAcousticNodes
                ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30 font-bold'
                : 'bg-white dark:bg-[#181a28] text-[#86868b] dark:text-slate-400 border-black/[0.06] dark:border-white/[0.08]'
            }`}
            title="Mostrar / ocultar Fuente y Micrófono en la planta 2D"
          >
            <Radio className="w-3.5 h-3.5 text-[#ff9500]" />
            <span className="hidden sm:inline">Fuente/Micro</span>
          </button>

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              snapToGrid
                ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30'
                : 'bg-white dark:bg-[#181a28] text-[#86868b] dark:text-slate-400 border-black/[0.06] dark:border-white/[0.08]'
            }`}
            title="Snap a cuadrícula de 0.5m"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap 0.5m</span>
          </button>

          <button
            onClick={() => setShowMeasurements(!showMeasurements)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              showMeasurements
                ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30'
                : 'bg-white dark:bg-[#181a28] text-[#86868b] dark:text-slate-400 border-black/[0.06] dark:border-white/[0.08]'
            }`}
            title="Mostrar u ocultar cotas de longitud"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cotas</span>
          </button>

          <div className="h-4 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />

          {/* Deshacer (Ctrl + Z) */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`px-2 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
              canUndo
                ? 'bg-white dark:bg-[#181a28] text-[#1d1d1f] dark:text-white border-black/[0.08] dark:border-white/[0.1] hover:bg-[#5833c7] hover:text-white hover:border-[#5833c7]'
                : 'opacity-35 cursor-not-allowed bg-transparent text-[#86868b] border-black/[0.04] dark:border-white/[0.04]'
            }`}
            title="Deshacer última acción (Ctrl + Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">Deshacer</span>
          </button>

          {/* Rehacer (Ctrl + Y) */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`px-2 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
              canRedo
                ? 'bg-white dark:bg-[#181a28] text-[#1d1d1f] dark:text-white border-black/[0.08] dark:border-white/[0.1] hover:bg-[#5833c7] hover:text-white hover:border-[#5833c7]'
                : 'opacity-35 cursor-not-allowed bg-transparent text-[#86868b] border-black/[0.04] dark:border-white/[0.04]'
            }`}
            title="Rehacer acción (Ctrl + Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">Rehacer</span>
          </button>

          <div className="h-4 w-px bg-black/[0.1] dark:bg-white/[0.1] mx-0.5" />

          {/* Guardar Plano (.json) */}
          <button
            onClick={handleExportDrawing}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border bg-white dark:bg-[#181a28] text-[#1d1d1f] dark:text-white border-black/[0.08] dark:border-white/[0.1] hover:bg-[#5833c7] hover:text-white hover:border-[#5833c7] shadow-2xs group"
            title="Guardar plano de la sala en archivo (.json legible)"
          >
            <Download className="w-3.5 h-3.5 text-[#5833c7] group-hover:text-white transition-colors" />
            <span className="hidden sm:inline">Guardar</span>
          </button>

          {/* Cargar Plano (.json / .txt) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border bg-white dark:bg-[#181a28] text-[#1d1d1f] dark:text-white border-black/[0.08] dark:border-white/[0.1] hover:bg-[#5833c7] hover:text-white hover:border-[#5833c7] shadow-2xs group"
            title="Subir y cargar plano guardado (.json o .txt)"
          >
            <Upload className="w-3.5 h-3.5 text-[#10b981] group-hover:text-white transition-colors" />
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

      {/* Lienzo SVG Dinámico — Con zoom scroll + pan drag */}
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-[#0c0d18] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden shadow-apple-sm transition-colors w-full flex flex-col touch-none"
        style={{ touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Banner flotante de notificación de estado (guardado / cargado / deshacer) */}
        {statusMsg && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all">
            <div className="px-3 py-1.5 rounded-xl bg-[#5833c7] text-white text-xs font-semibold shadow-xl flex items-center gap-1.5 border border-white/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{statusMsg}</span>
            </div>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full select-none h-[340px] sm:h-[420px]"
          style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
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
          onPointerCancel={(e) => {
            handleCanvasPointerUp(e);
            handlePointerUp(e);
            handleEntityPointerUp(e);
          }}
        >
          <defs>
            <linearGradient id="lightCanvasGlow2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8f9fe" />
            </linearGradient>

            <filter id="vertexGlowPurple2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Fondo */}
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#lightCanvasGlow2)" className="dark:fill-[#0c0d18]" data-canvas-bg="true" />

          {/* Cuadrícula Nítida y Visible */}
          {gridLines.map((line, i) => (
            <line
              key={i}
              x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
              stroke={
                line.isFive 
                  ? 'rgba(88, 51, 199, 0.45)' 
                  : line.major 
                    ? 'rgba(88, 51, 199, 0.22)' 
                    : 'rgba(0, 0, 0, 0.11)'
              }
              className={line.isFive ? 'dark:stroke-[#8767f9]/50' : line.major ? 'dark:stroke-[#8767f9]/30' : 'dark:stroke-white/[0.12]'}
              strokeWidth={line.isFive ? 1.2 : line.major ? 0.85 : 0.45}
              strokeDasharray={line.major ? 'none' : '2,2'}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Puntos de intersección CAD discretos a cada 1m */}
          {intersectionDots.map((d, i) => (
            <circle
              key={`dot-${i}`}
              cx={d.x} cy={d.y} r={1.2}
              fill="rgba(88, 51, 199, 0.35)"
              className="dark:fill-[#8767f9]/40"
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Marcadores métricos en el eje X */}
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

          {/* Marcadores métricos en el eje Y */}
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

          {/* Relleno del polígono con tinte morado suave */}
          <path
            d={polyPath}
            fill="rgba(88, 51, 199, 0.08)"
            stroke="rgba(88, 51, 199, 0.75)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />

          {/* Aristas — Clicables para agregar nuevos vértices y con soporte de arcos curvos */}
          {edges.map((edge, i) => {
            const s1 = toScreen(edge.from.x, edge.from.y);
            const s2 = toScreen(edge.to.x, edge.to.y);
            const isHovered = hoveredEdge === i;
            const wallId = `wall_${i}`;
            const matConfig = materials?.[wallId];
            const matInfo = matConfig ? getMaterialById(matConfig.materialId) : null;
            const matColor = matConfig ? getMaterialColor(matConfig.materialId) : null;
            const isCurved = Math.abs(edge.bulge) > 0.02;

            // Muestreo de arco si la pared tiene curvatura
            const arcPts = isCurved ? getEdgeArcPoints(edge.from, edge.to, edge.bulge, 16, isCCW) : null;
            const screenArcPts = isCurved ? arcPts.map(p => toScreen(p.x, p.y)) : null;
            const edgePathD = isCurved
              ? screenArcPts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
              : null;

            // Punto medio o ápice del arco para la etiqueta de cota
            const midScreen = isCurved
              ? screenArcPts[Math.floor(screenArcPts.length / 2)]
              : { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };

            const nx = -Math.sin(edge.angle) * 14;
            const ny = Math.cos(edge.angle) * 14;
            const badgeX = midScreen.x + nx;
            const badgeY = midScreen.y + ny;

            return (
              <g key={`edge-${i}`}>
                {/* Zona invisible ancha para clic / hover */}
                {isCurved ? (
                  <path
                    d={edgePathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    style={{ cursor: 'copy' }}
                    onMouseEnter={() => setHoveredEdge(i)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onClick={(e) => { e.stopPropagation(); addVertexOnEdge(i); }}
                  />
                ) : (
                  <line
                    x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                    stroke="transparent"
                    strokeWidth="18"
                    style={{ cursor: 'copy' }}
                    onMouseEnter={() => setHoveredEdge(i)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onClick={(e) => { e.stopPropagation(); addVertexOnEdge(i); }}
                  />
                )}

                {/* Trazo visible de la arista */}
                {isCurved ? (
                  <path
                    d={edgePathD}
                    fill="none"
                    stroke={isHovered ? '#5833c7' : (matColor?.hex || '#5833c7')}
                    strokeWidth={isHovered ? 3.5 : 2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none', transition: 'all 0.15s ease' }}
                  />
                ) : (
                  <line
                    x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                    stroke={isHovered ? '#5833c7' : (matColor?.hex || '#5833c7')}
                    strokeWidth={isHovered ? 3.5 : 2.2}
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none', transition: 'all 0.15s ease' }}
                  />
                )}

                {/* Cota métrica interactiva (Doble clic para editar longitud en línea) */}
                {showMeasurements && (
                  <g>
                    {editingEdgeIdx === i ? (
                      <foreignObject
                        x={badgeX - 28}
                        y={badgeY - 11}
                        width={56}
                        height={22}
                      >
                        <div className="flex items-center justify-center w-full h-full">
                          <input
                            autoFocus
                            type="number"
                            step="0.1"
                            min="0.2"
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
                          setEditingLengthStr(edge.length.toFixed(1));
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={badgeX - (isCurved ? 30 : 22)}
                          y={badgeY - 7}
                          width={isCurved ? 60 : 44}
                          height={14}
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
                          {edge.length.toFixed(1)}m{isCurved ? ' (arc)' : ''}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Tooltip de pared en hover */}
                {isHovered && (() => {
                  const mx = midScreen.x;
                  const my = midScreen.y;
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <circle cx={mx} cy={my} r={8} fill="#5833c7" />
                      <line x1={mx - 3} y1={my} x2={mx + 3} y2={my} stroke="white" strokeWidth={1.5} />
                      <line x1={mx} y1={my - 3} x2={mx + 3} y2={my} stroke="white" strokeWidth={1.5} />
                      <rect
                        x={mx - 60} y={my - 26}
                        width={120} height={18} rx={5}
                        fill="rgba(88, 51, 199, 0.96)"
                      />
                      <text
                        x={mx} y={my - 14}
                        fill="white" fontSize="8" fontWeight="700" fontFamily="Inter, system-ui"
                        textAnchor="middle"
                      >
                        Pared {i + 1}: {matInfo?.name || 'Material'} {isCurved ? `(Arco ${(edge.bulge > 0 ? '+' : '')}${edge.bulge.toFixed(1)}m)` : ''}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Vértices arrastrables */}
          {vertices.map((v, i) => {
            const s = toScreen(v.x, v.y);
            const isDragging = draggingIdx === i;
            const isHovered = hoveredIdx === i;

            return (
              <g key={`v-${i}`}>
                {(isDragging || isHovered) && (
                  <circle cx={s.x} cy={s.y} r={14} fill="rgba(88, 51, 199, 0.2)" filter="url(#vertexGlowPurple2)" />
                )}

                {/* Hit target táctil transparente ampliado para móviles */}
                <circle
                  cx={s.x} cy={s.y}
                  r={16}
                  fill="transparent"
                  style={{ cursor: 'grab', touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(i, e)}
                />

                <circle
                  cx={s.x} cy={s.y}
                  r={isDragging ? 8 : isHovered ? 7 : 5.5}
                  fill={isDragging ? '#5833c7' : isHovered ? '#7c3aed' : '#ffffff'}
                  stroke="#5833c7"
                  strokeWidth={isDragging ? 2.5 : 1.8}
                  style={{ cursor: 'grab', transition: 'r 0.1s, fill 0.1s' }}
                  onPointerDown={(e) => handlePointerDown(i, e)}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onContextMenu={(e) => { e.preventDefault(); removeVertex(i); }}
                  onDoubleClick={(e) => { e.preventDefault(); removeVertex(i); }}
                />

                <text
                  x={s.x} y={s.y - 10}
                  fill="#5833c7" fontSize="8" fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  V{i + 1}
                </text>

                {(isDragging || isHovered) && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={s.x + 10} y={s.y - 6}
                      width={52} height={14} rx={4}
                      fill="rgba(88, 51, 199, 0.95)"
                    />
                    <text
                      x={s.x + 36} y={s.y + 4}
                      fill="white" fontSize="8" fontWeight="700" fontFamily="'JetBrains Mono', monospace"
                      textAnchor="middle"
                    >
                      ({v.x.toFixed(1)}, {v.y.toFixed(1)})
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Información del polígono en el centroide */}
          {(() => {
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

          {/* NODOS ACÚSTICOS INTERACTIVOS (FUENTE Y RECEPTOR EN PLANTA 2D) */}
          {showAcousticNodes && (() => {
            const ss = toScreen(sourcePos.x, sourcePos.y);
            const rs = toScreen(receiverPos.x, receiverPos.y);

            return (
              <g>
                {/* Rayo Directo entre Fuente y Receptor */}
                <line
                  x1={ss.x} y1={ss.y}
                  x2={rs.x} y2={rs.y}
                  stroke="#5833c7" strokeWidth={1.5}
                  strokeDasharray="4,3"
                  style={{ pointerEvents: 'none' }}
                />

                {/* Etiqueta de Distancia r */}
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

                {/* Fuente S (Arrastrable) */}
                <g
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => handleEntityPointerDown('source', e)}
                >
                  <circle cx={ss.x} cy={ss.y} r={10} fill="#5833c7" stroke="white" strokeWidth={1.5} />
                  <circle cx={ss.x} cy={ss.y} r={4} fill="white" />
                  <rect
                    x={ss.x - 30} y={ss.y - 24}
                    width={60} height={14} rx={3}
                    fill="rgba(88, 51, 199, 0.95)"
                  />
                  <text
                    x={ss.x} y={ss.y - 14}
                    fill="white" fontSize="8" fontWeight="800"
                    fontFamily="Inter, system-ui" textAnchor="middle"
                  >
                    Fuente (S)
                  </text>
                </g>

                {/* Receptor R (Arrastrable) */}
                <g
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => handleEntityPointerDown('receiver', e)}
                >
                  <circle cx={rs.x} cy={rs.y} r={9} fill="#10b981" stroke="white" strokeWidth={1.5} />
                  <circle cx={rs.x} cy={rs.y} r={3.5} fill="white" />
                  <rect
                    x={rs.x - 26} y={rs.y - 22}
                    width={52} height={14} rx={3}
                    fill="rgba(16, 185, 129, 0.95)"
                  />
                  <text
                    x={rs.x} y={rs.y - 12}
                    fill="white" fontSize="8" fontWeight="800"
                    fontFamily="Inter, system-ui" textAnchor="middle"
                  >
                    Micro (R)
                  </text>
                </g>
              </g>
            );
          })()}

        </svg>

        {/* Overlay de controles de zoom dentro del canvas (esquina inferior derecha) */}
        <div className="absolute bottom-12 right-3 flex flex-col gap-1 z-10">
          <button
            onClick={() => setUserZoom(z => Math.min(5.0, Number((z * 1.2).toFixed(2))))}
            className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#5833c7] hover:bg-[#5833c7] hover:text-white transition-all shadow-sm"
            title="Acercar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setUserZoom(z => Math.max(0.25, Number((z / 1.2).toFixed(2))))}
            className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#5833c7] hover:bg-[#5833c7] hover:text-white transition-all shadow-sm"
            title="Alejar (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={fitToView}
            className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#5833c7] hover:bg-[#5833c7] hover:text-white transition-all shadow-sm"
            title="Ajustar a vista (0)"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Badge de zoom actual (esquina inferior izquierda) */}
        <div className="absolute bottom-12 left-3 z-10">
          <div className="px-2 py-1 rounded-lg bg-white/90 dark:bg-[#1a1c2e]/90 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.1] shadow-sm">
            <span className="text-[10px] font-bold font-mono text-[#5833c7] dark:text-[#8767f9]">
              {Math.round(userZoom * 100)}%
            </span>
          </div>
        </div>

        {/* Hint de interacción (esquina superior derecha, desaparece con la primera interacción) */}
        <div className="absolute top-2 right-3 z-10 pointer-events-none">
          <div className="px-2.5 py-1 rounded-lg bg-[#5833c7]/80 backdrop-blur-sm text-white text-[9px] font-semibold flex items-center gap-1.5 opacity-60">
            <Hand className="w-3 h-3" />
            <span>Scroll = Zoom · Arrastre = Pan</span>
          </div>
        </div>

        {/* Barra inferior compacta */}
        <div className="bg-[#fafbfc] dark:bg-[#101222] px-3.5 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#86868b] dark:text-slate-400 border-t border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span>Vértices: <strong className="text-[#1d1d1f] dark:text-white">{vertices.length}</strong></span>
            <span>Área: <strong className="text-[#1d1d1f] dark:text-white">{area.toFixed(1)} m²</strong></span>
            <span>Volumen: <strong className="text-[#5833c7] dark:text-[#8767f9] font-bold">{(area * height).toFixed(1)} m³</strong></span>
          </div>
          <span className="text-[10px] text-[#86868b] font-sans hidden sm:inline">
            Arrastre vértices · Clic arista = +pared · Doble clic cota = editar · Scroll = zoom
          </span>
        </div>
      </div>

      {/* Control de Altura (H) Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-[#121322] rounded-xl border border-black/[0.06] dark:border-white/[0.08] px-3 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-[#1d1d1f] dark:text-white">
            Altura (H):
          </label>
          <div className="flex items-center gap-1">
            {[2.5, 3.0, 3.5, 4.0].map((hVal) => (
              <button
                key={hVal}
                type="button"
                onClick={() => handleHeightChange(hVal)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                  Math.abs(height - hVal) < 0.05
                    ? 'bg-[#5833c7] text-white'
                    : 'bg-[#f5f5f7] dark:bg-[#1c1e30] text-[#86868b] hover:text-[#1d1d1f]'
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
            onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
            className="flex-1 sm:w-36 accent-[#5833c7] h-1.5 cursor-pointer"
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min="0.5" max="20" step="0.1"
              value={height}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) handleHeightChange(val);
              }}
              className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold text-center bg-[#f5f5f7] dark:bg-[#181a28] rounded-md border border-black/[0.08] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white"
            />
            <span className="text-xs text-[#86868b] font-semibold">m</span>
          </div>
        </div>
      </div>

      {/* Gestor de Paredes y Coordenadas */}
      <div className="bg-white dark:bg-[#121322] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-3 space-y-2.5 shadow-2xs">
        
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setEditorTab('walls'); setIsEditorExpanded(true); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                editorTab === 'walls' && isEditorExpanded
                  ? 'bg-[#5833c7] text-white shadow-xs'
                  : 'bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
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
                  : 'bg-[#f5f5f7] dark:bg-[#181a28] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Coordenadas X/Y ({vertices.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#86868b] font-mono hidden sm:inline">
              {editorTab === 'walls' ? 'Doble clic en cota o clic en Dividir' : 'Coordenadas en metros'}
            </span>
            <button
              type="button"
              onClick={() => setIsEditorExpanded(!isEditorExpanded)}
              className="p-1 rounded-lg text-[#86868b] hover:text-[#5833c7] text-xs font-bold transition"
              title={isEditorExpanded ? "Ocultar panel" : "Expandir panel"}
            >
              {isEditorExpanded ? '▲ Ocultar' : '▼ Mostrar'}
            </button>
          </div>
        </div>

        {isEditorExpanded && (
          <>
            {/* Pestaña 1: Editor de Paredes */}
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
                            ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/15 border-[#5833c7] shadow-xs'
                            : 'bg-[#fbfbfd] dark:bg-[#181a28] border-black/[0.06] dark:border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-[#5833c7]/15 text-[#5833c7] dark:text-[#8767f9] text-[9.5px] font-bold">
                                Pared {i + 1}
                              </span>
                              <span className="text-[10px] text-[#86868b] font-mono">
                                V{i + 1} → V{j + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-black text-[#1d1d1f] dark:text-white font-mono">
                                {edge.length.toFixed(1)} m {isCurved ? '(arco)' : ''}
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
                            title="Dividir esta pared e insertar un nuevo punto en la mitad"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Dividir</span>
                          </button>
                        </div>

                        {/* Control de curvatura / flecha de la pared */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.06] text-[10px]">
                          <span className="text-[#86868b] font-medium">Curvatura:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="range"
                              min="-2.0"
                              max="2.0"
                              step="0.1"
                              value={curvatures[i] || 0}
                              onChange={(e) => handleCurvatureChange(i, parseFloat(e.target.value))}
                              className="w-16 sm:w-24 accent-[#5833c7] h-1 cursor-pointer"
                              title="Flecha del arco (+ exterior, - interior)"
                            />
                            <span className={`font-mono font-bold min-w-[34px] text-right ${
                              isCurved ? 'text-[#5833c7] dark:text-[#8767f9]' : 'text-[#86868b]'
                            }`}>
                              {(curvatures[i] || 0) > 0 ? '+' : ''}{(curvatures[i] || 0).toFixed(1)}m
                            </span>
                            {isCurved && (
                              <button
                                type="button"
                                onClick={() => handleCurvatureChange(i, 0)}
                                className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b] hover:text-rose-500 transition text-[9px]"
                                title="Volver a recta"
                              >
                                Recta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#86868b] dark:text-slate-400">
                  Nota: Haz doble clic en la cota de una pared en el lienzo para ajustar su longitud exacta, o mueve el deslizador para generar paredes curvas convexas o cóncavas.
                </p>
              </div>
            )}

            {/* Pestaña 2: Coordenadas Numéricas (X, Y) */}
            {editorTab === 'coords' && (
              <div className="space-y-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {vertices.map((v, i) => (
                    <div key={i} className="flex items-center justify-between gap-1.5 bg-[#fbfbfd] dark:bg-[#181a28] rounded-xl p-1.5 px-2 border border-black/[0.06] dark:border-white/[0.06]">
                      <span className="text-[10px] font-bold text-[#5833c7] dark:text-[#8767f9] min-w-[18px]">
                        V{i + 1}
                      </span>

                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-[#86868b] font-mono">X:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={Number(v.x).toFixed(1)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val)) return;
                              pushHistory();
                              const newVerts = [...vertices];
                              newVerts[i] = { ...newVerts[i], x: Number(val.toFixed(1)) };
                              onChangePolygon({ ...roomPolygon, vertices: newVerts });
                              setActivePresetId('custom');
                            }}
                            className="w-12 px-1 py-0.5 text-[10px] font-mono bg-white dark:bg-[#202236] rounded border border-black/[0.08] dark:border-white/[0.1] text-center text-[#1d1d1f] dark:text-white"
                            title="Coordenada X (m)"
                          />
                        </div>

                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-[#86868b] font-mono">Y:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={Number(v.y).toFixed(1)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val)) return;
                              pushHistory();
                              const newVerts = [...vertices];
                              newVerts[i] = { ...newVerts[i], y: Number(val.toFixed(1)) };
                              onChangePolygon({ ...roomPolygon, vertices: newVerts });
                              setActivePresetId('custom');
                            }}
                            className="w-12 px-1 py-0.5 text-[10px] font-mono bg-white dark:bg-[#202236] rounded border border-black/[0.08] dark:border-white/[0.1] text-center text-[#1d1d1f] dark:text-white"
                            title="Coordenada Y (m)"
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

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={addNewVertex}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#5833c7]/10 hover:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#8767f9] text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Vértice Libre</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

