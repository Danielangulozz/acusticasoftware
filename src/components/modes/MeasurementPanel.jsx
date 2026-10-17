import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Table,
  Eye,
  Radio,
  Sparkles,
  Layers,
  Activity,
  AlertCircle,
  Plus,
  Trash2,
  Move,
  MousePointerClick,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  ClipboardList,
  BarChart2,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import {
  generateMeasurementGrid,
  generateExperimentalSubgrid7,
  buildSplTemplateCsv,
  parseSplCsv,
  interpolateIdw2D,
  detectSpectralPeaks,
  matchToTheoreticalModes,
  generateSimulatedSplData,
  parseRewMeasurementText,
  mapCurveToThirdOctaveBands,
  isPointInPolygon,
  minDistanceToWalls,
  calcCentroid,
} from '../../utils/measurementUtils';
import { getEdgeArcPoints, isPolygonCCW } from '../../utils/acousticCalculations';
import { downloadCsv } from '../../utils/csvUtils';
import { THIRD_OCTAVE_BANDS } from '../../utils/modalCalculations';

export default function MeasurementPanel({
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
  geometry = {},
  roomPolygon = null,
  modes = [],
  measurementData = null,
  onUpdateMeasurementData = () => {},
}) {
  const vertices = useMemo(() => {
    if (roomPolygon?.vertices && roomPolygon.vertices.length >= 3) {
      return roomPolygon.vertices;
    }
    const L = dimensions?.Lx || 10;
    const W = dimensions?.Ly || 6;
    return [
      { x: 0, y: 0 },
      { x: L, y: 0 },
      { x: L, y: W },
      { x: 0, y: W },
    ];
  }, [roomPolygon, dimensions]);

  const isPolygonRoom = useMemo(() => {
    if (!roomPolygon?.vertices || roomPolygon.vertices.length < 3) return false;
    if (roomPolygon.vertices.length !== 4) return true;
    if (roomPolygon.curvatures && Object.values(roomPolygon.curvatures).some(c => Math.abs(c) > 0.01)) return true;
    const xs = roomPolygon.vertices.map(v => Number(v.x.toFixed(2)));
    const ys = roomPolygon.vertices.map(v => Number(v.y.toFixed(2)));
    const uniqueX = new Set(xs);
    const uniqueY = new Set(ys);
    return !(uniqueX.size === 2 && uniqueY.size === 2);
  }, [roomPolygon]);

  const xs = useMemo(() => vertices.map(v => v.x), [vertices]);
  const ys = useMemo(() => vertices.map(v => v.y), [vertices]);
  const minX = useMemo(() => Math.min(...xs), [xs]);
  const maxX = useMemo(() => Math.max(...xs), [xs]);
  const minY = useMemo(() => Math.min(...ys), [ys]);
  const maxY = useMemo(() => Math.max(...ys), [ys]);
  const roomW = useMemo(() => Math.max(0.1, maxX - minX), [maxX, minX]);
  const roomH = useMemo(() => Math.max(0.1, maxY - minY), [maxY, minY]);
  const Lx = roomW;
  const Ly = roomH;
  const Lz = dimensions?.Lz || 3;

  const bounds = useMemo(() => ({ minX, minY, maxX, maxY, width: roomW, height: roomH }), [minX, minY, maxX, maxY, roomW, roomH]);

  const pad = useMemo(() => Math.max(0.25, Math.min(roomW, roomH) * 0.04), [roomW, roomH]);
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = roomW + 2 * pad;
  const vbH = roomH + 2 * pad;

  const polygonSvgPath = useMemo(() => {
    if (!vertices || vertices.length < 3) return '';
    const curvatures = roomPolygon?.curvatures || {};
    const isCCW = isPolygonCCW(vertices);
    let path = `M ${vertices[0].x} ${vertices[0].y}`;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const v0 = vertices[i];
      const v1 = vertices[j];
      const bulge = curvatures[i] || 0;
      if (Math.abs(bulge) > 0.02) {
        const arcPts = getEdgeArcPoints(v0, v1, bulge, 12, isCCW);
        for (let k = 1; k < arcPts.length; k++) {
          path += ` L ${arcPts[k].x} ${arcPts[k].y}`;
        }
      } else {
        path += ` L ${v1.x} ${v1.y}`;
      }
    }
    path += ' Z';
    return path;
  }, [vertices, roomPolygon?.curvatures]);

  const [step, setStep] = useState(1.5);
  const [margin, setMargin] = useState(0.7);
  const [selectedPointId, setSelectedPointId] = useState(1);
  const [hoveredPointId, setHoveredPointId] = useState(null);
  const [selectedBand, setSelectedBand] = useState(63);
  const [draggingPointId, setDraggingPointId] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSourceLocked, setIsSourceLocked] = useState(false);
  const [isHoveredSource, setIsHoveredSource] = useState(false);
  const [showProtocolGuide, setShowProtocolGuide] = useState(false);
  const [tableBandRange, setTableBandRange] = useState('modal'); // 'modal' (20-500Hz) | 'all' (20-4000Hz)

  const [gridData, setGridData] = useState(() => {
    if (measurementData && measurementData.points?.length > 0) {
      const pointsOutside = measurementData.points.filter(p => !isPointInPolygon({ x: p.x, y: p.y }, vertices));
      const hasActualMeasurements = measurementData.points.some(p => Object.keys(p.spl || {}).length > 0);
      if (pointsOutside.length > 0 && !hasActualMeasurements) {
        return generateMeasurementGrid(roomW, roomH, 1.5, 0.7, 1.2, isPolygonRoom ? vertices : null);
      }
      return measurementData;
    }
    return generateMeasurementGrid(roomW, roomH, 1.5, 0.7, 1.2, isPolygonRoom ? vertices : null);
  });

  const [gridMode, setGridMode] = useState(() => {
    return gridData?.gridType || (gridData?.points?.length <= 7 ? 'experimental' : 'theoretical');
  });

  // Adaptar automáticamente la cuadrícula cuando cambia la geometría del recinto si no hay datos medidos
  const prevVerticesRef = useRef(vertices);
  useEffect(() => {
    const prev = prevVerticesRef.current;
    const verticesChanged = !prev || prev.length !== vertices.length ||
      vertices.some((v, idx) => !prev[idx] || Math.abs(v.x - prev[idx].x) > 0.02 || Math.abs(v.y - prev[idx].y) > 0.02);

    if (verticesChanged) {
      prevVerticesRef.current = vertices;
      const outside = (gridData.points || []).filter(p => !isPointInPolygon({ x: p.x, y: p.y }, vertices));
      const hasActualMeasurements = (gridData.points || []).some(p => Object.keys(p.spl || {}).length > 0);
      if (outside.length > 0 && !hasActualMeasurements) {
        if (gridMode === 'experimental') {
          const newGrid = generateExperimentalSubgrid7(roomW, roomH, isPolygonRoom ? vertices : null, 1.2);
          setGridData(newGrid);
          onUpdateMeasurementData(newGrid);
        } else {
          const newGrid = generateMeasurementGrid(roomW, roomH, step, margin, 1.2, isPolygonRoom ? vertices : null);
          setGridData(newGrid);
          onUpdateMeasurementData(newGrid);
        }
      }
    }
  }, [vertices, isPolygonRoom, roomW, roomH, step, margin, gridData.points, gridMode, onUpdateMeasurementData]);

  const fileInputRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const svgRef = useRef(null);

  // Cantidad de puntos fuera del polígono
  const pointsOutsideCount = useMemo(() => {
    if (!gridData?.points || !vertices || vertices.length < 3) return 0;
    return gridData.points.filter(p => !isPointInPolygon({ x: p.x, y: p.y }, vertices)).length;
  }, [gridData?.points, vertices]);

  // Todas las bandas de 1/3 de octava disponibles hasta 4000 Hz
  const allBands = useMemo(() => {
    return THIRD_OCTAVE_BANDS.filter(b => b <= 4000);
  }, []);

  // Bandas modales (hasta 500 Hz) para análisis modal estricto
  const modalBands = useMemo(() => {
    return THIRD_OCTAVE_BANDS.filter(b => b <= 500);
  }, []);

  // Bandas visibles en la tabla (conmutable entre modales y espectro completo)
  const displayTableBands = useMemo(() => {
    if (tableBandRange === 'modal') {
      return modalBands;
    }
    return allBands;
  }, [tableBandRange, modalBands, allBands]);

  // Cambiar a Malla Experimental Personalizada (7 Puntos Reales)
  const handleSetExperimental7Grid = () => {
    const existingSpls = gridData.points.map(p => p.spl || {});
    const subgrid = generateExperimentalSubgrid7(roomW, roomH, isPolygonRoom ? vertices : null, 1.2);
    // Conservar mediciones si ya existían
    const mergedPoints = subgrid.points.map((p, idx) => ({
      ...p,
      spl: existingSpls[idx] || {},
    }));
    const updated = {
      ...subgrid,
      points: mergedPoints,
      gridType: 'experimental',
    };
    setGridData(updated);
    setGridMode('experimental');
    setSelectedPointId(1);
    onUpdateMeasurementData(updated);
  };

  // Cambiar a Malla Teórica Completa (19 Puntos ISO)
  const handleSetTheoreticalGrid = () => {
    const newGrid = generateMeasurementGrid(roomW, roomH, step, margin, 1.2, isPolygonRoom ? vertices : null);
    const updated = { ...newGrid, gridType: 'theoretical' };
    setGridData(updated);
    setGridMode('theoretical');
    setSelectedPointId(1);
    onUpdateMeasurementData(updated);
  };

  // Eliminar puntos no medidos (deja exclusivamente los puntos que tienen mediciones registradas)
  const handleRemoveUnmeasuredPoints = () => {
    const measuredOnly = gridData.points.filter(p => Object.keys(p.spl || {}).length > 0);
    if (measuredOnly.length === 0) {
      alert('No se detectaron mediciones registradas aún. Por favor introduce datos en la tabla o carga tu archivo CSV primero.');
      return;
    }
    const updated = {
      ...gridData,
      points: measuredOnly,
      numPoints: measuredOnly.length,
      gridType: 'experimental',
    };
    setGridData(updated);
    setGridMode('experimental');
    setSelectedPointId(measuredOnly[0]?.id || 1);
    onUpdateMeasurementData(updated);
  };

  // Regenerar cuadrícula adaptada al recinto
  const handleRegenerateGrid = () => {
    if (gridMode === 'experimental') {
      handleSetExperimental7Grid();
    } else {
      handleSetTheoreticalGrid();
    }
  };

  // Descargar plantilla CSV
  const handleDownloadTemplate = () => {
    const rows = buildSplTemplateCsv(gridData.points, allBands);
    downloadCsv(rows, `Plantilla_Medicion_SPL_${roomW.toFixed(1)}x${roomH.toFixed(1)}m.csv`, ';');
  };

  // Comprobar si hay datos cargados en los puntos
  const hasLoadedData = useMemo(() => {
    return gridData.points.some(p => Object.keys(p.spl || {}).length > 0);
  }, [gridData.points]);

  // Cargar datos de muestra simulados basados en resonancias modales físicas
  const handleLoadSampleData = () => {
    const simulatedPoints = generateSimulatedSplData(gridData.points, allBands, roomW, roomH, Lz, 343, bounds);
    const updated = { ...gridData, points: simulatedPoints };
    setGridData(updated);
    onUpdateMeasurementData(updated);
  };

  // Limpiar mediciones
  const handleClearData = () => {
    const cleared = gridData.points.map(p => ({ ...p, spl: {} }));
    const updated = { ...gridData, points: cleared };
    setGridData(updated);
    onUpdateMeasurementData(updated);
  };

  // Convertir evento del ratón en coordenadas del SVG (metros en espacio del modelo)
  const getSvgCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const rawX = vbX + ((e.clientX - rect.left) / rect.width) * vbW;
    const rawY = vbY + ((e.clientY - rect.top) / rect.height) * vbH;
    return {
      x: Number(rawX.toFixed(2)),
      y: Number(rawY.toFixed(2)),
    };
  };

  // Agregar nuevo punto libre (dentro del recinto)
  const handleAddPoint = (x = null, y = null) => {
    const nextId = gridData.points.length > 0
      ? Math.max(...gridData.points.map(p => p.id)) + 1
      : 1;
    const centroid = calcCentroid(vertices);
    const posX = x !== null ? x : Number(centroid.x.toFixed(2));
    const posY = y !== null ? y : Number(centroid.y.toFixed(2));

    const newPoint = {
      id: nextId,
      label: `P${nextId}`,
      x: posX,
      y: posY,
      z: 1.2,
      isCorner: false,
      spl: {},
    };
    const updated = {
      ...gridData,
      points: [...gridData.points, newPoint],
      numPoints: gridData.points.length + 1,
    };
    setGridData(updated);
    setSelectedPointId(nextId);
    onUpdateMeasurementData(updated);
  };

  // Eliminar un punto individual
  const handleDeletePoint = (pointId, e) => {
    if (e) e.stopPropagation();
    const filtered = gridData.points.filter(p => p.id !== pointId);
    const updated = {
      ...gridData,
      points: filtered,
      numPoints: filtered.length,
    };
    setGridData(updated);
    if (selectedPointId === pointId) {
      setSelectedPointId(filtered[0]?.id || null);
    }
    onUpdateMeasurementData(updated);
  };

  // Vaciar todos los puntos de la sala
  const handleClearAllPoints = () => {
    if (window.confirm('¿Deseas vaciar todos los puntos de medición para colocarlos manualmente desde cero?')) {
      const updated = { ...gridData, points: [], numPoints: 0 };
      setGridData(updated);
      setSelectedPointId(null);
      onUpdateMeasurementData(updated);
    }
  };

  // Modificar propiedad de un punto (coordenadas, etiqueta, esEsquina)
  const handleUpdatePointProperty = (pointId, prop, val) => {
    const updatedPoints = gridData.points.map(p => {
      if (p.id === pointId) {
        let parsed = val;
        if (prop === 'x' || prop === 'y' || prop === 'z') {
          parsed = parseFloat(val);
          if (isNaN(parsed)) parsed = 0;
        }
        return {
          ...p,
          [prop]: parsed,
        };
      }
      return p;
    });
    const updated = { ...gridData, points: updatedPoints };
    setGridData(updated);
    onUpdateMeasurementData(updated);
  };

  // Clic en SVG (Modo Agregar)
  const handleSvgClick = (e) => {
    if (isAddMode) {
      const coords = getSvgCoords(e);
      if (coords) {
        handleAddPoint(coords.x, coords.y);
        setIsAddMode(false);
      }
    }
  };

  // Doble clic en SVG para agregar punto inmediatamente en esa coordenada
  const handleSvgDoubleClick = (e) => {
    const coords = getSvgCoords(e);
    if (coords) {
      handleAddPoint(coords.x, coords.y);
    }
  };

  // Iniciar arrastre con ratón
  const handleMouseDownPoint = (pointId, e) => {
    e.stopPropagation();
    setSelectedPointId(pointId);
    setDraggingPointId(pointId);
  };

  // Arrastrar fluido
  const handleMouseMoveSvg = (e) => {
    if (!draggingPointId) return;
    const coords = getSvgCoords(e);
    if (!coords) return;

    if (draggingPointId === 'source') {
      if (isSourceLocked) return;
      if (vertices.length >= 3 && !isPointInPolygon(coords, vertices)) return;
      setGridData(prev => {
        const updated = {
          ...prev,
          source: {
            ...prev.source,
            x: coords.x,
            y: coords.y,
          },
        };
        onUpdateMeasurementData(updated);
        return updated;
      });
      return;
    }

    if (vertices.length >= 3 && !isPointInPolygon(coords, vertices)) return;

    setGridData(prev => {
      const updatedPoints = prev.points.map(p => {
        if (p.id === draggingPointId) {
          return { ...p, x: coords.x, y: coords.y };
        }
        return p;
      });
      const updated = { ...prev, points: updatedPoints };
      onUpdateMeasurementData(updated);
      return updated;
    });
  };

  // Soltar arrastre
  const handleMouseUpSvg = () => {
    if (draggingPointId) {
      setDraggingPointId(null);
    }
  };

  // Modificar propiedades de la fuente acústica S0
  const handleUpdateSourceProperty = (prop, val) => {
    let parsed = val;
    if (prop === 'x' || prop === 'y' || prop === 'z') {
      parsed = parseFloat(val);
      if (isNaN(parsed)) parsed = 0;
    }
    const updated = {
      ...gridData,
      source: {
        ...gridData.source,
        [prop]: parsed,
      },
    };
    setGridData(updated);
    onUpdateMeasurementData(updated);
  };

  // Centrar la fuente en la sala (usando centroide físico)
  const handleCenterSource = () => {
    const centroid = calcCentroid(vertices);
    let cx = centroid.x;
    let cy = centroid.y;
    if (vertices.length >= 3 && (!isPointInPolygon({ x: cx, y: cy }, vertices) || minDistanceToWalls(cx, cy, vertices) < 0.3)) {
      if (gridData.points.length > 0) {
        let best = gridData.points[0];
        let bestD = Infinity;
        for (const p of gridData.points) {
          const d = Math.hypot(p.x - centroid.x, p.y - centroid.y);
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
        cx = best.x;
        cy = best.y;
      }
    }
    const updated = {
      ...gridData,
      source: {
        ...gridData.source,
        x: Number(cx.toFixed(2)),
        y: Number(cy.toFixed(2)),
      },
    };
    setGridData(updated);
    onUpdateMeasurementData(updated);
  };

  // Importar CSV o Archivo de Texto REW
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        
        // 1. Detección y parseo de formato REW (Frequency, SPL, Phase)
        const rewData = parseRewMeasurementText(text);
        if (rewData && rewData.length > 5) {
          const mappedBands = mapCurveToThirdOctaveBands(rewData, allBands);
          const targetId = (selectedPointId === 'source' || !selectedPointId)
            ? (gridData.points[0]?.id || 1)
            : selectedPointId;
          const targetPoint = gridData.points.find(p => p.id === targetId) || gridData.points[0];

          const updatedPoints = gridData.points.map(p => {
            if (p.id === targetId) {
              return {
                ...p,
                spl: { ...p.spl, ...mappedBands },
                rawCurve: rewData, // Guardar la curva continua completa para Salida Gráfica 2
              };
            }
            return p;
          });
          const updated = { ...gridData, points: updatedPoints };
          setGridData(updated);
          onUpdateMeasurementData(updated);
          setSelectedPointId(targetId);
          alert(`¡Curva REW importada exitosamente en el receptor "${targetPoint?.label || '#' + targetId}"!\n\n• ${rewData.length} lecturas procesadas.\n• Curva continua trazada en Salida Gráfica 2 (20 Hz - 200 Hz).\n• Matriz de 1/3 de octava actualizada con promedio energético ISO.\n• Heatmap 2D actualizado.`);
          return;
        }

        // 2. Formato matriz CSV multi-punto (compatible con matriz_insitu_completa.csv)
        const parsed = parseSplCsv(text, gridData.points);
        if (parsed && parsed.points?.length > 0) {
          const is7Pts = parsed.points.length === 7;
          const updated = {
            ...gridData,
            points: parsed.points,
            numPoints: parsed.points.length,
            gridType: is7Pts || parsed.points.length <= 7 ? 'experimental' : gridData.gridType,
          };
          setGridData(updated);
          if (is7Pts || parsed.points.length <= 7) {
            setGridMode('experimental');
          }
          onUpdateMeasurementData(updated);
          setSelectedPointId(parsed.points[0]?.id || 1);

          // Si la banda actual no tiene datos pero el archivo sí incluye otras, seleccionar primera con datos
          if (parsed.bands && parsed.bands.length > 0) {
            const hasCurrent = parsed.points.some(p => p.spl?.[selectedBand] !== undefined);
            if (!hasCurrent) {
              const firstWithData = parsed.bands.find(b => parsed.points.some(p => p.spl?.[b] !== undefined));
              if (firstWithData) setSelectedBand(firstWithData);
            }
          }

          alert(`¡Matriz in situ cargada exitosamente!\n\n• ${parsed.points.length} puntos procesados.\n• ${parsed.bands.length} bandas de frecuencia (desde ${parsed.bands[0]} Hz hasta ${parsed.bands[parsed.bands.length - 1]} Hz).\n• Valores asignados y Heatmap 2D actualizado en tiempo real.`);
          return;
        }
      } catch (err) {
        alert(`Error al importar el archivo: ${err.message}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Edición interactiva de SPL en la tabla
  const handleSplChange = (pointId, band, value) => {
    const num = parseFloat(value);
    const updatedPoints = gridData.points.map(p => {
      if (p.id === pointId) {
        return {
          ...p,
          spl: {
            ...p.spl,
            [band]: isNaN(num) ? 0 : num,
          },
        };
      }
      return p;
    });

    const updated = { ...gridData, points: updatedPoints };
    setGridData(updated);
    onUpdateMeasurementData(updated);
  };

  // Renderizar mapa de calor interpolado (IDW) de la banda seleccionada con recorte al recinto
  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sincronizar dimensiones del canvas con el viewBox del SVG para evitar distorsiones y desplazamientos
    const maxVbDim = Math.max(vbW, vbH, 1);
    const canvasRes = 600;
    canvas.width = Math.round(canvasRes * (vbW / maxVbDim));
    canvas.height = Math.round(canvasRes * (vbH / maxVbDim));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / vbW;
    const scaleY = canvas.height / vbH;
    const toPixelX = (x) => (x - vbX) * scaleX;
    const toPixelY = (y) => (y - vbY) * scaleY;

    // Extraer EXCLUSIVAMENTE los puntos que tengan medición real para la banda seleccionada
    // (evita inyectar valores ficticios por defecto y respeta los 7 puntos medidos reales)
    const knownPoints = (gridData.points || [])
      .filter(p => p.spl && p.spl[selectedBand] !== undefined && p.spl[selectedBand] !== null && !isNaN(Number(p.spl[selectedBand])))
      .map(p => ({
        x: p.x,
        y: p.y,
        value: Number(p.spl[selectedBand]),
      }));

    if (knownPoints.length === 0) {
      // Si ningún punto tiene medición en esta banda, dejar el lienzo limpio
      return;
    }

    const idw = interpolateIdw2D(knownPoints, roomW, roomH, 50, 2, bounds);
    if (!idw) return;

    const { grid, nx, ny, minVal, maxVal } = idw;
    const range = Math.max(1, maxVal - minVal);

    const imgData = ctx.createImageData(nx, ny);
    const d = imgData.data;

    for (let i = 0; i < grid.length; i++) {
      const norm = (grid[i] - minVal) / range; // 0..1
      // Colormap térmico: Azul -> Verde -> Rojo
      let r = 0, g = 0, b = 0;
      if (norm < 0.5) {
        b = Math.round(255 * (1 - 2 * norm));
        g = Math.round(255 * (2 * norm));
      } else {
        g = Math.round(255 * (2 * (1 - norm)));
        r = Math.round(255 * (2 * (norm - 0.5)));
      }

      const pIdx = i * 4;
      d[pIdx] = r;
      d[pIdx + 1] = g;
      d[pIdx + 2] = b;
      d[pIdx + 3] = 230; // semitransparente
    }

    const off = document.createElement('canvas');
    off.width = nx;
    off.height = ny;
    off.getContext('2d').putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Recorte estricto al contorno del recinto arquitectónico (incluidas paredes curvas)
    if (vertices && vertices.length >= 3) {
      ctx.beginPath();
      const curvatures = roomPolygon?.curvatures || {};
      const isCCW = isPolygonCCW(vertices);
      ctx.moveTo(toPixelX(vertices[0].x), toPixelY(vertices[0].y));
      for (let i = 0; i < vertices.length; i++) {
        const j = (i + 1) % vertices.length;
        const v0 = vertices[i];
        const v1 = vertices[j];
        const bulge = curvatures[i] || 0;
        if (Math.abs(bulge) > 0.02) {
          const arcPts = getEdgeArcPoints(v0, v1, bulge, 16, isCCW);
          for (let k = 1; k < arcPts.length; k++) {
            ctx.lineTo(toPixelX(arcPts[k].x), toPixelY(arcPts[k].y));
          }
        } else {
          ctx.lineTo(toPixelX(v1.x), toPixelY(v1.y));
        }
      }
      ctx.closePath();
      ctx.clip();
    }

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, toPixelX(minX), toPixelY(minY), roomW * scaleX, roomH * scaleY);
    ctx.restore();
  }, [gridData, selectedBand, vertices, roomPolygon?.curvatures, vbX, vbY, vbW, vbH, minX, minY, maxX, maxY, roomW, roomH, bounds]);

  // Punto seleccionado actualmente
  const selectedPoint = gridData.points.find(p => p.id === selectedPointId) || gridData.points[0];

  // Datos para la Salida Gráfica 2 (Paso 11): Espectro SPL vs Frecuencia (20 Hz a 200 Hz) con detección de picos
  const pointSpectrum = useMemo(() => {
    if (!selectedPoint) return { chartData: [], peaks: [], hasData: false, isContinuous: false, pointsCount: 0 };

    // Si el punto tiene una curva continua de REW importada (rawCurve)
    if (selectedPoint.rawCurve && Array.isArray(selectedPoint.rawCurve) && selectedPoint.rawCurve.length > 5) {
      // Filtrar lecturas entre 20 Hz y 200 Hz
      const continuousData = selectedPoint.rawCurve
        .filter(d => d.freq >= 19.5 && d.freq <= 200.5)
        .map(d => ({
          freq: Number(d.freq.toFixed(1)),
          freqLabel: `${Number(d.freq.toFixed(1))} Hz`,
          spl: Number(d.spl.toFixed(1)),
        }));

      if (continuousData.length > 0) {
        const freqs = continuousData.map(d => d.freq);
        const splVals = continuousData.map(d => d.spl);
        const peaks = detectSpectralPeaks(freqs, splVals, 2.5);

        return {
          chartData: continuousData,
          peaks,
          hasData: true,
          isContinuous: true,
          pointsCount: continuousData.length,
        };
      }
    }

    // Fallback: usar bandas de 1/3 de octava (ej. muestras o ingresadas manualmente)
    if (!selectedPoint.spl) return { chartData: [], peaks: [], hasData: false, isContinuous: false, pointsCount: 0 };
    const hasHighFreq = Object.keys(selectedPoint.spl).some(k => Number(k) > 200 && selectedPoint.spl[k] !== undefined && selectedPoint.spl[k] !== null);
    const relevantBands = hasHighFreq
      ? allBands.filter(b => selectedPoint.spl[b] !== undefined || b <= 500)
      : modalBands.filter(b => b <= 200);
    const chartData = relevantBands.map(b => ({
      freq: b,
      freqLabel: `${b} Hz`,
      spl: selectedPoint.spl[b] !== undefined ? selectedPoint.spl[b] : null,
    }));
    const validSpls = chartData.filter(d => d.spl !== null);
    const freqs = chartData.map(d => d.freq);
    const splVals = chartData.map(d => d.spl || 0);
    const peaks = validSpls.length >= 3 ? detectSpectralPeaks(freqs, splVals, 2.0) : [];

    return {
      chartData,
      peaks,
      hasData: validSpls.length > 0,
      isContinuous: false,
      pointsCount: chartData.length,
    };
  }, [selectedPoint, modalBands, allBands]);

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado con Selector de Malla: Teórica (19 Pts) vs Experimental (7 Pts) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400">
              <MapPin className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Pestaña 7: Medición In Situ (ISO / Cuadrícula Experimental)
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              gridMode === 'experimental'
                ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                : 'bg-[#5833c7]/15 text-[#5833c7] border border-[#5833c7]/30'
            }`}>
              {gridMode === 'experimental' ? 'Sub-malla: 7 Puntos Reales' : 'Malla Completa: 19 Puntos'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Alterna entre la cuadrícula teórica completa del polígono y la sub-malla experimental de 7 puntos medida in situ.
          </p>
        </div>

        {/* SELECTOR SEGMENTADO: Malla Teórica vs Sub-malla Experimental */}
        <div className="flex items-center p-1 bg-[#f5f5f7] dark:bg-[#18192a] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={handleSetTheoreticalGrid}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              gridMode === 'theoretical'
                ? 'bg-white dark:bg-[#25263a] text-[#5833c7] dark:text-purple-300 shadow-2xs'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            Malla Teórica (19 Pts)
          </button>
          <button
            type="button"
            onClick={handleSetExperimental7Grid}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              gridMode === 'experimental'
                ? 'bg-[#10b981] text-white shadow-2xs'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            Malla Experimental (7 Pts Reales)
          </button>
        </div>
      </div>

      {/* Barra de Acciones y Controles Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt"
            className="hidden"
          />

          {/* Botón Importar Matriz in situ / REW */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4324a3] text-xs font-bold text-white shadow-apple-sm transition-all"
            title="Cargar matriz_insitu_completa.csv o archivo de barrido continuo REW"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar Matriz In Situ (.csv)</span>
          </button>

          {/* Botón Ajustar a 7 Puntos Reales */}
          <button
            onClick={handleSetExperimental7Grid}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 shadow-2xs transition-all"
            title="Ajustar cuadrícula exactamente a los 7 puntos medidos en el área central transitable"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ajustar a 7 Puntos</span>
          </button>

          {/* Botón Eliminar Puntos Sin Datos */}
          <button
            onClick={handleRemoveUnmeasuredPoints}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-semibold text-[#86868b] hover:text-amber-700 dark:hover:text-amber-300 border border-black/[0.05] dark:border-white/[0.08] transition-all"
            title="Eliminar puntos que no tengan datos medidos para dejar limpia la sub-malla"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Limpiar Sin Datos</span>
          </button>

          {/* Botón Datos de Muestra */}
          <button
            onClick={handleLoadSampleData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5833c7]/15 to-[#0071e3]/15 hover:from-[#5833c7]/25 hover:to-[#0071e3]/25 text-xs font-semibold text-[#5833c7] dark:text-purple-300 border border-[#5833c7]/30 transition-all shadow-xs"
            title="Carga una simulación de onda estacionaria para ver el mapa de calor inmediatamente"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5833c7] dark:text-purple-400" />
            <span>Datos Muestra</span>
          </button>

          {/* Botón Plantilla CSV */}
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1c1d2d] hover:bg-[#f5f5f7] text-xs font-semibold text-[#1d1d1f] dark:text-white border border-black/[0.08] dark:border-white/[0.08] transition-all shadow-2xs"
            title="Descargar plantilla CSV con todos los puntos y bandas"
          >
            <Download className="w-3.5 h-3.5 text-[#5833c7]" />
            <span>Plantilla CSV</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Nuevo Punto Manual */}
          <button
            onClick={() => handleAddPoint()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#005bb5] text-xs font-semibold text-white shadow-2xs transition-all"
            title="Añadir un receptor libre en la sala"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Punto</span>
          </button>

          {/* Botón Colocar con Clic */}
          <button
            onClick={() => setIsAddMode(!isAddMode)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isAddMode
                ? 'bg-[#5833c7] text-white border-[#5833c7] ring-2 ring-[#5833c7]/30 shadow-xs'
                : 'bg-white dark:bg-[#1c1d2d] text-[#1d1d1f] dark:text-white border-black/[0.08] dark:border-white/[0.08] hover:bg-[#f5f5f7]'
            }`}
            title="Haz clic en cualquier punto del plano 2D para colocar un micrófono"
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>{isAddMode ? 'Clic en plano...' : 'Ubicar Clic'}</span>
          </button>

          {/* Bloquear / Desbloquear Fuente S0 */}
          <button
            onClick={() => setIsSourceLocked(!isSourceLocked)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isSourceLocked
                ? 'bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b] border-black/[0.05] dark:border-white/[0.08]'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50 shadow-2xs'
            }`}
            title={isSourceLocked ? 'Fuente fijada (clic para desbloquear y moverla)' : 'Fuente móvil (clic para fijarla y evitar que se mueva por error)'}
          >
            {isSourceLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{isSourceLocked ? 'Fuente Bloqueada' : 'Fuente Móvil'}</span>
          </button>

          {/* Botón Vaciar */}
          {gridData.points.length > 0 && (
            <button
              onClick={handleClearAllPoints}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1c1d2d] hover:bg-rose-50 text-xs font-semibold text-[#86868b] hover:text-rose-600 border border-black/[0.08] transition-all"
              title="Vaciar todos los puntos para comenzar de cero"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          )}
        </div>
      </div>

      {/* TARJETA COLAPSABLE: PROTOCOLO DE LABORATORIO EN 11 PASOS SEGÚN GUÍA */}
      <div className="bg-[#fbfbfd] dark:bg-[#18192a] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProtocolGuide(!showProtocolGuide)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400">
              <ClipboardList className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider block">
                Protocolo Experimental de Medición In Situ (11 Pasos de la Guía de Clase)
              </span>
              <span className="text-[11px] text-[#86868b]">
                Parámetros fijos: Fuente central dodecaedro a 1.5m (Ruido Rosa), sonómetro a 45°, ponderación Z, integración 10s Slow.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
              11 Pasos ISO
            </span>
            {showProtocolGuide ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
          </div>
        </button>

        {showProtocolGuide && (
          <div className="p-4 pt-1 border-t border-black/[0.04] dark:border-white/[0.04] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#5833c7] uppercase">Paso 1: Recinto &bull; Condiciones</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Dimensiones {Lx}m × {Ly}m × {Lz}m. Registrar temperatura ambiental (T = 20°C, c = 343 m/s).</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#5833c7] uppercase">Paso 2: Cuadrícula 1.5m</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Trazar cuadrícula uniforme con paso regular de 1.5 m ubicando puntos en intersecciones.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#5833c7] uppercase">Paso 3: Separación a Paredes</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Distancia mínima de seguridad a todas las paredes ≥ 0.7 m para evitar efectos de proximidad reactiva.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#5833c7] uppercase">Paso 4: 4 Esquinas Críticas</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Añadir puntos E1, E2, E3, E4 en las 4 esquinas a 0.7m (zona de antinodo máximo de presión para todos los modos axiales).</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#0071e3] uppercase">Paso 5: Fuente S₀ (Centro)</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Fuente dodecaedro omnidireccional en el centro geométrico ({Lx/2}m, {Ly/2}m) a h = 1.5 m emitiendo Ruido Rosa.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#0071e3] uppercase">Paso 6: Sonómetro &bull; Posición</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Micrófono en cada intersección a h = 1.5 m con inclinación fija de 45° respecto al plano horizontal.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#0071e3] uppercase">Paso 7: Ajustes del Equipo</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Ponderación frecuencial Z (Lineal/Plana, sin atenuar graves), constante temporal Slow, integración de 10 s.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#10b981] uppercase">Paso 8: Bandas de 1/3 Octava</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Medir y registrar los niveles de presión sonora SPL (dB) en bandas normalizadas de 20 Hz a 200 Hz.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#10b981] uppercase">Paso 9: Captura &bull; Carga REW</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Ingresar los datos en la matriz inferior o subir archivos exportados desde Room EQ Wizard (REW).</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-[#f59e0b] uppercase">Paso 10: Salida Gráfica 1 (Planta)</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Generar mapa de presiones continuo 2D por interpolación espacial IDW en colores térmicos para la banda elegida.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04] space-y-1 md:col-span-2">
              <span className="text-[10px] font-bold text-[#f59e0b] uppercase">Paso 11: Salida Gráfica 2 (SPL vs Frecuencia)</span>
              <p className="text-[#1d1d1f] dark:text-slate-300">Trazar curva de SPL (dB) vs Frecuencia (20 Hz - 200 Hz) para cada punto identificando los picos de resonancia modal.</p>
            </div>
          </div>
        )}
      </div>

      {/* Plano 2D SVG y Mapa de Calor IDW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        
        {/* Visor de Plano Interactivo (2 columnas) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#86868b] px-1 font-mono">
            <span>
              {isPolygonRoom
                ? `Planta Arquitectónica (${vertices.length} paredes · ${geometry?.floorArea ? geometry.floorArea.toFixed(1) + ' m² · ' : ''}${gridData.points.length} puntos)`
                : `Planta ${roomW.toFixed(2)}m × ${roomH.toFixed(2)}m (${gridData.points.length} puntos de medición)`}
            </span>
            <div className="flex items-center gap-2">
              <span>Banda Heatmap:</span>
              <select
                value={selectedBand}
                onChange={(e) => setSelectedBand(Number(e.target.value))}
                className="px-2 py-0.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-[#1d1d1f] dark:text-white"
              >
                {allBands.map(b => (
                  <option key={b} value={b}>{b} Hz</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advertencia si hay puntos fuera del perímetro */}
          {pointsOutsideCount > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3 animate-fadeIn shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Hay <strong>{pointsOutsideCount}</strong> puntos fuera del perímetro del modelo arquitectónico.
                </span>
              </div>
              <button
                onClick={handleRegenerateGrid}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-2xs shrink-0"
              >
                Adaptar al Recinto
              </button>
            </div>
          )}

          <div className="w-full flex items-center justify-center p-3 sm:p-4 bg-[#fbfbfd] dark:bg-[#0c0d18] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-inner min-h-[280px] sm:min-h-[340px]">
            <div
              className="relative overflow-hidden rounded-xl border border-black/[0.12] dark:border-white/[0.12] shadow-sm bg-white dark:bg-[#121424]"
              style={{
                aspectRatio: `${vbW} / ${vbH}`,
                width: '100%',
                maxWidth: `min(100%, calc(420px * ${vbW / vbH}))`,
                maxHeight: '420px',
              }}
            >
              {/* Canvas de fondo con Heatmap IDW recortado al polígono */}
              <canvas
                ref={heatmapCanvasRef}
                className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none"
              />

              {/* Capa vectorial SVG con Puntos y Fuente */}
              <svg
                ref={svgRef}
                className={`absolute inset-0 w-full h-full select-none ${isAddMode ? 'cursor-crosshair' : ''}`}
                viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                onClick={handleSvgClick}
                onDoubleClick={handleSvgDoubleClick}
                onMouseMove={handleMouseMoveSvg}
                onMouseUp={handleMouseUpSvg}
                onMouseLeave={handleMouseUpSvg}
              >
                <defs>
                  <clipPath id="roomFloorClip">
                    <path d={polygonSvgPath} />
                  </clipPath>
                </defs>

                {/* Relleno del suelo de la sala */}
                <path
                  d={polygonSvgPath}
                  fill="#5833c7"
                  fillOpacity="0.10"
                  className="dark:fill-[#8767f9] dark:fill-opacity-15"
                />

                {/* Contorno de Paredes del Recinto Arquitectónico */}
                <path
                  d={polygonSvgPath}
                  fill="none"
                  stroke="#5833c7"
                  strokeWidth={Math.min(roomW, roomH) * 0.012}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="dark:stroke-[#8767f9]"
                />

                {/* Vértices del recinto */}
                {vertices.map((v, i) => (
                  <g key={`v-mark-${i}`}>
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r={Math.min(roomW, roomH) * 0.014}
                      fill="#5833c7"
                      className="dark:fill-[#8767f9]"
                      opacity={0.8}
                    />
                    <text
                      x={v.x}
                      y={v.y - Math.min(roomW, roomH) * 0.02}
                      fill="#5833c7"
                      fontSize={Math.min(roomW, roomH) * 0.032}
                      fontWeight="bold"
                      textAnchor="middle"
                      className="dark:fill-[#8767f9] select-none"
                    >
                      V{i + 1}
                    </text>
                  </g>
                ))}

                {/* Margen de seguridad punteado para salas rectangulares */}
                {!isPolygonRoom && (
                  <rect
                    x={minX + margin}
                    y={minY + margin}
                    width={Math.max(0.1, roomW - 2 * margin)}
                    height={Math.max(0.1, roomH - 2 * margin)}
                    fill="none"
                    stroke="#5833c7"
                    strokeDasharray={`${Math.min(roomW, roomH) * 0.02} ${Math.min(roomW, roomH) * 0.02}`}
                    strokeWidth={Math.min(roomW, roomH) * 0.005}
                    opacity={0.5}
                  />
                )}

                {/* Fuente S0 configurable y arrastrable */}
                {gridData.source && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPointId('source');
                    }}
                    onMouseDown={(e) => {
                      if (!isSourceLocked) {
                        handleMouseDownPoint('source', e);
                      } else {
                        setSelectedPointId('source');
                      }
                    }}
                    onMouseEnter={() => setIsHoveredSource(true)}
                    onMouseLeave={() => setIsHoveredSource(false)}
                    className={isSourceLocked ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
                  >
                    {/* Área invisible amplia para facilitar clic y arrastre */}
                    <circle
                      cx={gridData.source.x}
                      cy={gridData.source.y}
                      r={Math.min(roomW, roomH) * 0.05}
                      fill="transparent"
                    />

                    {/* Halo de selección o hover */}
                    {(selectedPointId === 'source' || isHoveredSource) && (
                      <circle
                        cx={gridData.source.x}
                        cy={gridData.source.y}
                        r={Math.min(roomW, roomH) * 0.038}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={Math.min(roomW, roomH) * 0.006}
                        opacity={0.6}
                      />
                    )}

                    {/* Círculo de la fuente */}
                    <circle
                      cx={gridData.source.x}
                      cy={gridData.source.y}
                      r={Math.min(roomW, roomH) * (selectedPointId === 'source' || isHoveredSource ? 0.028 : 0.024)}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={Math.min(roomW, roomH) * 0.005}
                    />

                    {/* Etiqueta S0 con indicador de candado si está fija */}
                    <text
                      x={gridData.source.x}
                      y={gridData.source.y - Math.min(roomW, roomH) * 0.035}
                      fontSize={Math.min(roomW, roomH) * 0.035}
                      fontWeight="bold"
                      fill="#ef4444"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {gridData.source.label || 'S₀'}{isSourceLocked ? ' 🔒' : ''}
                    </text>
                  </g>
                )}

                {/* Aviso si no hay puntos */}
                {gridData.points.length === 0 && (
                  <text
                    x={minX + roomW / 2}
                    y={minY + roomH / 2}
                    fontSize={Math.min(roomW, roomH) * 0.04}
                    fill="#86868b"
                    textAnchor="middle"
                    className="select-none pointer-events-none font-semibold"
                  >
                    Doble clic para añadir receptor
                  </text>
                )}

                {/* Puntos de medición */}
                {gridData.points.map((p) => {
                  const isSelected = p.id === selectedPointId;
                  const isHovered = p.id === hoveredPointId;
                  const isOutside = vertices.length >= 3 && !isPointInPolygon({ x: p.x, y: p.y }, vertices);
                  const minDim = Math.min(roomW, roomH);
                  const baseR = minDim * 0.022;
                  const r = isSelected || isHovered ? baseR * 1.25 : baseR;
                  const strokeW = minDim * 0.005;
                  const pointColor = isOutside ? '#ef4444' : isSelected ? '#5833c7' : p.isCorner ? '#f59e0b' : '#0071e3';

                  return (
                    <g
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedPointId(p.id); }}
                      onMouseDown={(e) => handleMouseDownPoint(p.id, e)}
                      onMouseEnter={() => setHoveredPointId(p.id)}
                      onMouseLeave={() => setHoveredPointId(null)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {/* Área invisible amplia para facilitar clic y arrastre */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={baseR * 2.4}
                        fill="transparent"
                      />

                      {/* Halo suave en selección, hover o alerta fuera */}
                      {(isSelected || isHovered || isOutside) && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={r + strokeW * 2}
                          fill="none"
                          stroke={pointColor}
                          strokeWidth={strokeW * 1.5}
                          strokeDasharray={isOutside ? `${minDim * 0.015} ${minDim * 0.015}` : undefined}
                          opacity={isOutside ? 0.8 : 0.5}
                        />
                      )}

                      {/* Círculo del punto */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={r}
                        fill={pointColor}
                        stroke="#ffffff"
                        strokeWidth={strokeW}
                      />

                      {/* Etiqueta identificadora */}
                      <text
                        x={p.x}
                        y={p.y + baseR * 2.3}
                        fontSize={minDim * 0.032}
                        fontWeight={isSelected || isHovered || isOutside ? '800' : '600'}
                        fill={isSelected || isHovered || isOutside ? pointColor : '#1d1d1f'}
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {p.label}{isOutside ? ' ⚠️' : ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#86868b] px-1 font-mono gap-1">
            <div className="flex items-center gap-3">
              <span
                onClick={() => setSelectedPointId('source')}
                className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded-md transition-colors ${
                  selectedPointId === 'source'
                    ? 'bg-[#ef4444]/15 font-bold text-[#ef4444]'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="Clic para seleccionar y editar la fuente"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                Fuente S₀ {isSourceLocked ? '🔒' : '🔓'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                Esquinas Eᵢ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]"></span>
                Receptores Pᵢ
              </span>
            </div>
            <span className="text-[10px] text-[#86868b] italic">
              💡 Arrastra fuente o puntos • {isSourceLocked ? 'Fuente fija 🔒' : 'Fuente móvil 🔓'}
            </span>
          </div>
        </div>

        {/* Panel Lateral: Detalle del Elemento Seleccionado (1 columna) */}
        <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-4 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] space-y-4">
          {selectedPointId === 'source' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444] animate-pulse"></span>
                  <input
                    type="text"
                    value={gridData.source?.label || 'Fuente S0'}
                    onChange={(e) => handleUpdateSourceProperty('label', e.target.value)}
                    className="w-28 text-xs font-bold uppercase tracking-wider text-[#ef4444] bg-transparent border-b border-black/[0.1] dark:border-white/[0.1] focus:border-[#ef4444] focus:outline-none"
                    placeholder="Fuente S0"
                    title="Editar nombre de la fuente"
                  />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ef4444]/20 text-[#ef4444]">
                    Emisor
                  </span>
                </div>
                <button
                  onClick={() => setIsSourceLocked(!isSourceLocked)}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    isSourceLocked
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  }`}
                  title={isSourceLocked ? 'Fuente bloqueada (haz clic para desbloquear)' : 'Fuente desbloqueada (haz clic para bloquear)'}
                >
                  {isSourceLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Botón grande de bloqueo/desbloqueo */}
              <button
                onClick={() => setIsSourceLocked(!isSourceLocked)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  isSourceLocked
                    ? 'bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b] border-black/[0.08] dark:border-white/[0.08] hover:border-emerald-500 hover:text-emerald-600'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50 shadow-xs hover:bg-emerald-100'
                }`}
              >
                {isSourceLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                <span>{isSourceLocked ? 'Posición Bloqueada (Fija)' : 'Posición Desbloqueada (Arrastrable)'}</span>
              </button>

              {/* Coordenadas X, Y, Z de la fuente */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#86868b]">Coord X (m):</span>
                  <input
                    type="number"
                    step="0.05"
                    min={minX}
                    max={maxX}
                    disabled={isSourceLocked}
                    value={gridData.source?.x ?? Number(((minX + maxX) / 2).toFixed(2))}
                    onChange={(e) => handleUpdateSourceProperty('x', e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-right font-bold text-[#ef4444] focus:outline-none focus:border-[#ef4444] disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86868b]">Coord Y (m):</span>
                  <input
                    type="number"
                    step="0.05"
                    min={minY}
                    max={maxY}
                    disabled={isSourceLocked}
                    value={gridData.source?.y ?? Number(((minY + maxY) / 2).toFixed(2))}
                    onChange={(e) => handleUpdateSourceProperty('y', e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-right font-bold text-[#ef4444] focus:outline-none focus:border-[#ef4444] disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86868b]">Altura Z (m):</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max={Lz}
                    disabled={isSourceLocked}
                    value={gridData.source?.z ?? 1.2}
                    onChange={(e) => handleUpdateSourceProperty('z', e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-right font-bold text-[#ef4444] focus:outline-none focus:border-[#ef4444] disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Botón para centrar la fuente */}
              <button
                onClick={handleCenterSource}
                disabled={isSourceLocked}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] dark:bg-[#1c1d2d] dark:hover:bg-[#25263a] text-xs font-semibold text-[#1d1d1f] dark:text-white border border-black/[0.05] dark:border-white/[0.08] transition-all disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Centrar Fuente en la Sala</span>
              </button>

              <div className="p-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[11px] text-[#ef4444] leading-relaxed">
                ℹ️ <strong>Fuente omnidireccional S₀:</strong> Puedes arrastrarla directamente sobre el plano o ingresar sus coordenadas numéricas. Pulsa el botón de bloqueo para proteger su ubicación y evitar desplazarla accidentalmente al interactuar con los micrófonos.
              </div>
            </div>
          ) : !selectedPoint ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-xs text-[#86868b]">
                No hay puntos en la sala. Haz doble clic en el plano o pulsa el botón para añadir tu primer receptor.
              </p>
              <button
                onClick={() => handleAddPoint()}
                className="px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#005bb5] text-xs font-semibold text-white shadow-sm transition-all"
              >
                + Añadir Receptor
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedPoint.label}
                    onChange={(e) => handleUpdatePointProperty(selectedPoint.id, 'label', e.target.value)}
                    className="w-28 text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white bg-transparent border-b border-black/[0.1] dark:border-white/[0.1] focus:border-[#5833c7] focus:outline-none"
                    placeholder="Nombre"
                    title="Editar nombre del punto"
                  />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5833c7]/20 text-[#5833c7]">
                    #{selectedPoint.id}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeletePoint(selectedPoint.id, e)}
                  title="Eliminar este receptor"
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Coordenadas X, Y, Z interactivas */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#86868b]">Coord X (m):</span>
                  <input
                    type="number"
                    step="0.05"
                    min={minX}
                    max={maxX}
                    value={selectedPoint.x}
                    onChange={(e) => handleUpdatePointProperty(selectedPoint.id, 'x', e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-right font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#5833c7]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86868b]">Coord Y (m):</span>
                  <input
                    type="number"
                    step="0.05"
                    min={minY}
                    max={maxY}
                    value={selectedPoint.y}
                    onChange={(e) => handleUpdatePointProperty(selectedPoint.id, 'y', e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-right font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#5833c7]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86868b]">Altura Z (m):</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max={Lz}
                    value={selectedPoint.z}
                    onChange={(e) => handleUpdatePointProperty(selectedPoint.id, 'z', e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-right font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#5833c7]"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 text-[11px] text-[#86868b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selectedPoint.isCorner}
                    onChange={(e) => handleUpdatePointProperty(selectedPoint.id, 'isCorner', e.target.checked)}
                    className="rounded text-[#5833c7] focus:ring-[#5833c7]"
                  />
                  <span>Esquina crítica (+9 dB antinodo)</span>
                </label>

                {vertices.length >= 3 && !isPointInPolygon({ x: selectedPoint.x, y: selectedPoint.y }, vertices) && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-300 leading-snug flex items-start gap-1.5 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span>Este receptor está fuera de las paredes del recinto. Arrástralo adentro o pulsa "Adaptar al Recinto".</span>
                  </div>
                )}
              </div>

              {/* Espectro SPL del punto seleccionado */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#1d1d1f] dark:text-white">
                  <span>Niveles SPL por Banda (dB):</span>
                  <span className="text-[10px] font-mono text-[#86868b]">
                    {tableBandRange === 'modal' ? '20-500 Hz' : '20-4000 Hz'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {displayTableBands.map(b => (
                    <div
                      key={b}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs font-mono transition-colors ${
                        b === selectedBand
                          ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 border-[#0071e3]/40'
                          : 'bg-white dark:bg-[#25263a] border-black/[0.04] dark:border-white/[0.05]'
                      }`}
                    >
                      <span className={b === selectedBand ? 'text-[#0071e3] dark:text-sky-400 font-bold' : 'text-[#86868b]'}>{b} Hz:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedPoint.spl[b] ?? ''}
                        placeholder="—"
                        onChange={(e) => handleSplChange(selectedPoint.id, b, e.target.value)}
                        className="w-14 text-right bg-transparent font-bold text-[#0071e3] dark:text-sky-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#0071e3]/10 hover:bg-[#0071e3]/20 dark:bg-[#0071e3]/20 dark:hover:bg-[#0071e3]/30 text-xs font-semibold text-[#0071e3] dark:text-sky-300 border border-[#0071e3]/20 transition-all shadow-2xs"
                    title={`Importar archivo .txt exportado de REW directamente en ${selectedPoint.label}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Cargar REW (.txt) en {selectedPoint.label}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Tabla Completa de Mediciones Editable */}
      <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5" />
              <span>Matriz de Puntos y Valores de Presión Sonora (SPL dB)</span>
            </h4>
            {/* Selector de Rango de Bandas Visible en Tabla */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.06] dark:border-white/[0.06] text-[11px]">
              <button
                type="button"
                onClick={() => setTableBandRange('modal')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  tableBandRange === 'modal'
                    ? 'bg-white dark:bg-[#25263a] text-[#0071e3] dark:text-sky-400 shadow-2xs font-bold'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                20 - 500 Hz (Modales)
              </button>
              <button
                type="button"
                onClick={() => setTableBandRange('all')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  tableBandRange === 'all'
                    ? 'bg-white dark:bg-[#25263a] text-[#0071e3] dark:text-sky-400 shadow-2xs font-bold'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                20 - 4000 Hz (Espectro Completo)
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddPoint()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white text-[11px] font-semibold transition-all shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir Punto</span>
            </button>
            <span className="text-xs text-[#86868b] hidden sm:inline">Edita directamente cualquier celda</span>
          </div>
        </div>

        {!hasLoadedData && (
          <div className="p-3 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#0071e3] dark:text-sky-300">
            <span>
              💡 <strong>Matriz lista para capturar mediciones:</strong> Ingresa tus lecturas de sonómetro/micrófono directamente, importa un archivo CSV, o pulsa <strong>&ldquo;Datos Muestra&rdquo;</strong> para simular la distribución de presión sonora modal.
            </span>
            <button
              onClick={handleLoadSampleData}
              className="inline-flex items-center gap-1 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white font-semibold text-[11px] shrink-0 shadow-2xs transition-all"
            >
              <Sparkles className="w-3 h-3" />
              <span>Cargar Muestra</span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] dark:text-slate-400 uppercase tracking-wider font-semibold sticky top-0 border-b border-black/[0.06] dark:border-white/[0.06] z-10">
              <tr>
                <th className="py-2.5 px-3">Punto</th>
                <th className="py-2.5 px-3">X (m)</th>
                <th className="py-2.5 px-3">Y (m)</th>
                <th className="py-2.5 px-3">Tipo</th>
                {displayTableBands.map(b => (
                  <th
                    key={b}
                    className={`py-2.5 px-3 text-center whitespace-nowrap cursor-pointer transition-colors ${
                      b === selectedBand
                        ? 'text-[#0071e3] dark:text-sky-400 font-bold bg-[#0071e3]/10 dark:bg-[#0071e3]/20'
                        : 'hover:text-[#1d1d1f] dark:hover:text-white'
                    }`}
                    onClick={() => setSelectedBand(b)}
                    title={`Clic para ver mapa de calor en ${b} Hz`}
                  >
                    {b} Hz
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {gridData.points.length === 0 ? (
                <tr>
                  <td colSpan={displayTableBands.length + 5} className="py-10 text-center text-[#86868b] space-y-2">
                    <p className="font-semibold text-xs">No hay puntos de medición definidos en la sala.</p>
                    <p className="text-[11px]">Haz clic en &ldquo;Añadir Punto&rdquo; para colocar tus micrófonos o pulsa &ldquo;Malla ISO&rdquo; para regenerar la cuadrícula completa.</p>
                  </td>
                </tr>
              ) : (
                gridData.points.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPointId(p.id)}
                    className={`cursor-pointer transition-colors ${
                      p.id === selectedPointId
                        ? 'bg-[#5833c7]/15 dark:bg-[#5833c7]/25 font-bold'
                        : 'hover:bg-[#fbfbfd] dark:hover:bg-[#18192a]'
                    }`}
                  >
                    <td className="py-1 px-3">
                      <input
                        type="text"
                        value={p.label}
                        onChange={(e) => handleUpdatePointProperty(p.id, 'label', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 bg-transparent font-bold text-[#1d1d1f] dark:text-white border-b border-transparent hover:border-gray-300 focus:border-[#5833c7] focus:outline-none"
                        title="Clic para renombrar punto"
                      />
                    </td>
                    <td className="py-1 px-3">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max={Lx}
                        value={p.x}
                        onChange={(e) => handleUpdatePointProperty(p.id, 'x', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-14 bg-transparent text-[#86868b] border-b border-transparent hover:border-gray-300 focus:border-[#5833c7] focus:outline-none"
                        title="Coordenada X (m)"
                      />
                    </td>
                    <td className="py-1 px-3">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max={Ly}
                        value={p.y}
                        onChange={(e) => handleUpdatePointProperty(p.id, 'y', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-14 bg-transparent text-[#86868b] border-b border-transparent hover:border-gray-300 focus:border-[#5833c7] focus:outline-none"
                        title="Coordenada Y (m)"
                      />
                    </td>
                    <td
                      className="py-2 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePointProperty(p.id, 'isCorner', !p.isCorner);
                      }}
                      title="Clic para cambiar entre Esquina y Punto Normal"
                    >
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer select-none ${
                        p.isCorner ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#0071e3]/20 text-[#0071e3]'
                      }`}>
                        {p.isCorner ? 'Esquina' : 'Malla'}
                      </span>
                    </td>
                    {displayTableBands.map(b => (
                      <td
                        key={b}
                        className={`py-1 px-2 text-center transition-colors ${
                          b === selectedBand ? 'bg-[#0071e3]/5 dark:bg-[#0071e3]/10 font-bold' : ''
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          step="0.5"
                          value={p.spl[b] ?? ''}
                          placeholder="—"
                          onChange={(e) => handleSplChange(p.id, b, e.target.value)}
                          className={`w-12 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#5833c7] focus:outline-none font-medium ${
                            b === selectedBand ? 'text-[#0071e3] dark:text-sky-400 font-bold' : ''
                          }`}
                        />
                      </td>
                    ))}
                    <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDeletePoint(p.id, e)}
                        className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Eliminar este receptor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALIDA GRÁFICA OBLIGATORIA (PASO 11): ESPECTRO SPL VS FRECUENCIA CON DETECCIÓN DE PICOS */}
      <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-400">
                <BarChart2 className="w-4 h-4" />
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                Salida Gráfica 2 (Paso 11): Nivel de Presión Sonora SPL (dB) vs Frecuencia (20 Hz - 200 Hz)
              </h4>
            </div>
            <p className="text-[11px] text-[#86868b] mt-0.5">
              Respuesta espectral en el punto <strong className="text-[#0071e3]">{selectedPoint?.label || 'P1'}</strong> ({selectedPoint?.x}m, {selectedPoint?.y}m) con identificación automática de picos de resonancia modal.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {pointSpectrum.isContinuous && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0071e3]/15 text-[#0071e3] border border-[#0071e3]/20 flex items-center gap-1 font-mono">
                <Check className="w-3 h-3" />
                <span>Curva Continua REW ({pointSpectrum.pointsCount} pts)</span>
              </span>
            )}
            {pointSpectrum.peaks.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/20 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3 h-3" />
                <span>{pointSpectrum.peaks.length} picos modales detectados</span>
              </span>
            )}
            <span className="text-xs text-[#86868b] font-mono">Banda 20 - 200 Hz</span>
          </div>
        </div>

        {pointSpectrum.hasData ? (
          <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-3">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pointSpectrum.chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  {pointSpectrum.isContinuous ? (
                    <XAxis
                      dataKey="freq"
                      type="number"
                      domain={[20, 200]}
                      ticks={[20, 31.5, 50, 63, 80, 100, 125, 160, 200]}
                      tick={{ fontSize: 10 }}
                      stroke="#86868b"
                      unit=" Hz"
                    />
                  ) : (
                    <XAxis dataKey="freqLabel" tick={{ fontSize: 10 }} stroke="#86868b" />
                  )}
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="#86868b" unit=" dB" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] shadow-lg text-xs font-mono">
                            <div className="font-bold text-[#1d1d1f] dark:text-white">{d.freq} Hz</div>
                            <div className="text-[#0071e3] font-bold text-sm">{d.spl} dB SPL</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spl"
                    name="SPL Medido"
                    stroke="#0071e3"
                    strokeWidth={pointSpectrum.isContinuous ? 2 : 2.5}
                    dot={pointSpectrum.isContinuous ? false : { r: 4, fill: '#0071e3', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#5833c7' }}
                    isAnimationActive={false}
                  />
                  {pointSpectrum.peaks.map((p, idx) => (
                    <ReferenceDot
                      key={`peak-dot-${idx}`}
                      x={pointSpectrum.isContinuous ? p.freq : `${p.freq} Hz`}
                      y={p.spl}
                      r={5}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Listado de picos resonantes identificados */}
            {pointSpectrum.peaks.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-black/[0.04] dark:border-white/[0.04] text-xs">
                <span className="text-[#86868b] font-medium">Picos de resonancia identificados en este punto:</span>
                {pointSpectrum.peaks.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444] font-mono font-bold text-[11px] border border-[#ef4444]/20 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>
                    <span>{p.freq} Hz ({p.spl} dB)</span>
                    {p.prominence && <span className="text-[9px] opacity-75">+{p.prominence} dB</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] text-xs text-[#86868b] space-y-2">
            <p className="font-semibold">No hay mediciones registradas en el punto {selectedPoint?.label || 'seleccionado'}.</p>
            <p className="text-[11px]">Pulsa &ldquo;Datos Muestra&rdquo; arriba o importa un archivo de texto de REW para graficar el espectro continuo de presión sonora.</p>
          </div>
        )}
      </div>

    </div>
  );
}
