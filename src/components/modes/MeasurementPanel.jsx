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
} from 'lucide-react';
import {
  generateMeasurementGrid,
  buildSplTemplateCsv,
  parseSplCsv,
  interpolateIdw2D,
  detectSpectralPeaks,
  matchToTheoreticalModes,
  generateSimulatedSplData,
} from '../../utils/measurementUtils';
import { downloadCsv } from '../../utils/csvUtils';
import { THIRD_OCTAVE_BANDS } from '../../utils/modalCalculations';

export default function MeasurementPanel({
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
  modes = [],
  measurementData = null,
  onUpdateMeasurementData = () => {},
}) {
  const { Lx = 10, Ly = 6, Lz = 3 } = dimensions;

  const [step, setStep] = useState(1.5);
  const [margin, setMargin] = useState(0.7);
  const [selectedPointId, setSelectedPointId] = useState(1);
  const [hoveredPointId, setHoveredPointId] = useState(null);
  const [selectedBand, setSelectedBand] = useState(63);
  const [draggingPointId, setDraggingPointId] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSourceLocked, setIsSourceLocked] = useState(false);
  const [isHoveredSource, setIsHoveredSource] = useState(false);
  const [gridData, setGridData] = useState(() => {
    if (measurementData && measurementData.points?.length > 0) return measurementData;
    return generateMeasurementGrid(Lx, Ly, 1.5, 0.7, 1.2);
  });

  const fileInputRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const svgRef = useRef(null);

  // Bandas relevantes para análisis modal (hasta 500 Hz)
  const modalBands = useMemo(() => {
    return THIRD_OCTAVE_BANDS.filter(b => b <= 500);
  }, []);

  // Regenerar cuadrícula cuando cambian dimensiones si el usuario lo solicita
  const handleRegenerateGrid = () => {
    const newGrid = generateMeasurementGrid(Lx, Ly, step, margin, 1.2);
    setGridData(newGrid);
    onUpdateMeasurementData(newGrid);
  };

  // Descargar plantilla CSV
  const handleDownloadTemplate = () => {
    const rows = buildSplTemplateCsv(gridData.points, modalBands);
    downloadCsv(rows, `Plantilla_Medicion_SPL_${Lx}x${Ly}m.csv`, ';');
  };

  // Comprobar si hay datos cargados en los puntos
  const hasLoadedData = useMemo(() => {
    return gridData.points.some(p => Object.keys(p.spl || {}).length > 0);
  }, [gridData.points]);

  // Cargar datos de muestra simulados basados en resonancias modales físicas
  const handleLoadSampleData = () => {
    const simulatedPoints = generateSimulatedSplData(gridData.points, modalBands, Lx, Ly, Lz);
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

  // Convertir evento del ratón en coordenadas del SVG (metros)
  const getSvgCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const rawX = ((e.clientX - rect.left) / rect.width) * Lx;
    const rawY = ((e.clientY - rect.top) / rect.height) * Ly;
    return {
      x: Number(Math.max(0.05, Math.min(Lx - 0.05, rawX)).toFixed(2)),
      y: Number(Math.max(0.05, Math.min(Ly - 0.05, rawY)).toFixed(2)),
    };
  };

  // Agregar nuevo punto libre
  const handleAddPoint = (x = null, y = null) => {
    const nextId = gridData.points.length > 0
      ? Math.max(...gridData.points.map(p => p.id)) + 1
      : 1;
    const posX = x !== null ? x : Number((Lx / 2 + (Math.random() - 0.5) * 1.5).toFixed(2));
    const posY = y !== null ? y : Number((Ly / 2 + (Math.random() - 0.5) * 1.5).toFixed(2));

    const newPoint = {
      id: nextId,
      label: `P${nextId}`,
      x: Math.max(0.1, Math.min(Lx - 0.1, posX)),
      y: Math.max(0.1, Math.min(Ly - 0.1, posY)),
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

  // Centrar la fuente en la sala
  const handleCenterSource = () => {
    const updated = {
      ...gridData,
      source: {
        ...gridData.source,
        x: Number((Lx / 2).toFixed(2)),
        y: Number((Ly / 2).toFixed(2)),
      },
    };
    setGridData(updated);
    onUpdateMeasurementData(updated);
  };

  // Importar CSV
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseSplCsv(text);
        const updated = {
          ...gridData,
          points: parsed.points,
        };
        setGridData(updated);
        onUpdateMeasurementData(updated);
      } catch (err) {
        alert(`Error al importar el archivo CSV: ${err.message}`);
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

  // Renderizar mapa de calor interpolado (IDW) de la banda seleccionada
  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sincronizar resolución interna del canvas con las dimensiones geométricas reales de la sala
    const maxDim = Math.max(Lx, Ly, 1);
    const canvasRes = 600;
    canvas.width = Math.round(canvasRes * (Lx / maxDim));
    canvas.height = Math.round(canvasRes * (Ly / maxDim));

    // Extraer puntos con valor en la banda elegida
    const knownPoints = gridData.points.map(p => ({
      x: p.x,
      y: p.y,
      value: p.spl[selectedBand] !== undefined ? p.spl[selectedBand] : 70,
    }));

    const idw = interpolateIdw2D(knownPoints, Lx, Ly, 50, 2);
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
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }, [gridData, selectedBand, Lx, Ly]);

  // Punto seleccionado actualmente
  const selectedPoint = gridData.points.find(p => p.id === selectedPointId) || gridData.points[0];

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400">
              <MapPin className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Cuadrícula de Medición In Situ y Distribución Espacial SPL
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Receptores configurables: añade puntos libres, arrástralos sobre la planta, edita sus coordenadas o usa la cuadrícula automática.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt"
            className="hidden"
          />

          {/* Botón Nuevo Punto */}
          <button
            onClick={() => handleAddPoint()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#005bb5] text-xs font-semibold text-white shadow-sm transition-all"
            title="Añadir un punto de medición en la sala"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Punto</span>
          </button>

          {/* Botón Colocar con Clic */}
          <button
            onClick={() => setIsAddMode(!isAddMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isAddMode
                ? 'bg-[#5833c7] text-white border-[#5833c7] ring-2 ring-[#5833c7]/30 shadow-xs'
                : 'bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#1d1d1f] dark:text-white border-black/[0.05] dark:border-white/[0.08] hover:bg-[#e8e8ed] dark:hover:bg-[#25263a]'
            }`}
            title="Haz clic en cualquier punto del plano 2D para colocar un micrófono"
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>{isAddMode ? 'Haz clic en el plano' : 'Ubicar con Clic'}</span>
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

          {/* Botón Importar CSV */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] hover:bg-[#e8e8ed] dark:hover:bg-[#25263a] text-xs font-semibold text-[#1d1d1f] dark:text-white border border-black/[0.05] dark:border-white/[0.08] transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>CSV</span>
          </button>

          {/* Botón Plantilla CSV */}
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] hover:bg-[#e8e8ed] dark:hover:bg-[#25263a] text-xs font-semibold text-[#1d1d1f] dark:text-white border border-black/[0.05] dark:border-white/[0.08] transition-all"
            title="Descargar plantilla CSV para llenarla en Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#5833c7]" />
            <span>Plantilla</span>
          </button>

          {/* Botón Regenerar Malla */}
          <button
            onClick={handleRegenerateGrid}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4727a8] text-xs font-semibold text-white shadow-sm transition-all"
            title="Generar cuadrícula estándar con paso de 1.5m"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Malla ISO</span>
          </button>

          {/* Bloquear / Desbloquear Fuente S0 */}
          <button
            onClick={() => setIsSourceLocked(!isSourceLocked)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isSourceLocked
                ? 'bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b] border-black/[0.05] dark:border-white/[0.08] hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-[#86868b] hover:text-rose-600 dark:hover:text-rose-400 border border-black/[0.05] dark:border-white/[0.08] transition-all"
              title="Vaciar todos los puntos para definir los tuyos propios desde cero"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          )}
        </div>
      </div>

      {/* Plano 2D SVG y Mapa de Calor IDW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Visor de Plano Interactivo (2 columnas) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#86868b] px-1 font-mono">
            <span>Planta {Lx}m × {Ly}m ({gridData.points.length} puntos de medición)</span>
            <div className="flex items-center gap-2">
              <span>Banda Heatmap:</span>
              <select
                value={selectedBand}
                onChange={(e) => setSelectedBand(Number(e.target.value))}
                className="px-2 py-0.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-[#1d1d1f] dark:text-white"
              >
                {modalBands.map(b => (
                  <option key={b} value={b}>{b} Hz</option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full flex items-center justify-center p-3 sm:p-4 bg-[#fbfbfd] dark:bg-[#0c0d18] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-inner min-h-[280px] sm:min-h-[340px]">
            <div
              className="relative overflow-hidden rounded-xl border border-black/[0.12] dark:border-white/[0.12] shadow-sm"
              style={{
                aspectRatio: `${Lx} / ${Ly}`,
                width: '100%',
                maxWidth: `min(100%, calc(400px * ${Lx / Ly}))`,
                maxHeight: '400px',
              }}
            >
              {/* Canvas de fondo con Heatmap IDW */}
              <canvas
                ref={heatmapCanvasRef}
                className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
              />

              {/* Capa vectorial SVG con Puntos y Fuente */}
              <svg
                ref={svgRef}
                className={`absolute inset-0 w-full h-full select-none ${isAddMode ? 'cursor-crosshair' : ''}`}
                viewBox={`0 0 ${Lx} ${Ly}`}
                onClick={handleSvgClick}
                onDoubleClick={handleSvgDoubleClick}
                onMouseMove={handleMouseMoveSvg}
                onMouseUp={handleMouseUpSvg}
                onMouseLeave={handleMouseUpSvg}
              >
                {/* Contorno de Paredes */}
                <rect
                  x="0"
                  y="0"
                  width={Lx}
                  height={Ly}
                  fill="none"
                  stroke="#86868b"
                  strokeWidth={Math.min(Lx, Ly) * 0.008}
                />

                {/* Margen de seguridad punteado */}
                <rect
                  x={margin}
                  y={margin}
                  width={Math.max(0.1, Lx - 2 * margin)}
                  height={Math.max(0.1, Ly - 2 * margin)}
                  fill="none"
                  stroke="#5833c7"
                  strokeDasharray={`${Math.min(Lx, Ly) * 0.02} ${Math.min(Lx, Ly) * 0.02}`}
                  strokeWidth={Math.min(Lx, Ly) * 0.004}
                  opacity={0.5}
                />

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
                      r={Math.min(Lx, Ly) * 0.05}
                      fill="transparent"
                    />

                    {/* Halo de selección o hover */}
                    {(selectedPointId === 'source' || isHoveredSource) && (
                      <circle
                        cx={gridData.source.x}
                        cy={gridData.source.y}
                        r={Math.min(Lx, Ly) * 0.038}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={Math.min(Lx, Ly) * 0.006}
                        opacity={0.6}
                      />
                    )}

                    {/* Círculo de la fuente */}
                    <circle
                      cx={gridData.source.x}
                      cy={gridData.source.y}
                      r={Math.min(Lx, Ly) * (selectedPointId === 'source' || isHoveredSource ? 0.028 : 0.024)}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={Math.min(Lx, Ly) * 0.005}
                    />

                    {/* Etiqueta S0 con indicador de candado si está fija */}
                    <text
                      x={gridData.source.x}
                      y={gridData.source.y - Math.min(Lx, Ly) * 0.035}
                      fontSize={Math.min(Lx, Ly) * 0.035}
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
                    x={Lx / 2}
                    y={Ly / 2 + Math.min(Lx, Ly) * 0.1}
                    fontSize={Math.min(Lx, Ly) * 0.04}
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
                  const minDim = Math.min(Lx, Ly);
                  const baseR = minDim * 0.022;
                  const r = isSelected || isHovered ? baseR * 1.25 : baseR;
                  const strokeW = minDim * 0.005;
                  const pointColor = isSelected ? '#5833c7' : p.isCorner ? '#f59e0b' : '#0071e3';

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

                      {/* Halo suave en selección o hover */}
                      {(isSelected || isHovered) && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={r + strokeW * 2}
                          fill="none"
                          stroke={pointColor}
                          strokeWidth={strokeW * 1.5}
                          opacity={0.5}
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
                        fontWeight={isSelected || isHovered ? '800' : '600'}
                        fill={isSelected || isHovered ? pointColor : '#1d1d1f'}
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {p.label}
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
                    min="0"
                    max={Lx}
                    disabled={isSourceLocked}
                    value={gridData.source?.x ?? Number((Lx / 2).toFixed(2))}
                    onChange={(e) => handleUpdateSourceProperty('x', e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-right font-bold text-[#ef4444] focus:outline-none focus:border-[#ef4444] disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86868b]">Coord Y (m):</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max={Ly}
                    disabled={isSourceLocked}
                    value={gridData.source?.y ?? Number((Ly / 2).toFixed(2))}
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
                    min="0"
                    max={Lx}
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
                    min="0"
                    max={Ly}
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
              </div>

              {/* Espectro SPL del punto seleccionado */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
                <div className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                  Niveles SPL por Banda (dB):
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {modalBands.map(b => (
                    <div
                      key={b}
                      className="flex items-center justify-between px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.04] dark:border-white/[0.05] text-xs font-mono"
                    >
                      <span className="text-[#86868b]">{b} Hz:</span>
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
              </div>
            </>
          )}
        </div>

      </div>

      {/* Tabla Completa de Mediciones Editable */}
      <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5" />
            <span>Matriz de Puntos y Valores de Presión Sonora (SPL dB)</span>
          </h4>
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
                {modalBands.map(b => (
                  <th key={b} className="py-2.5 px-3 text-center whitespace-nowrap">{b} Hz</th>
                ))}
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {gridData.points.length === 0 ? (
                <tr>
                  <td colSpan={modalBands.length + 5} className="py-10 text-center text-[#86868b] space-y-2">
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
                    {modalBands.map(b => (
                      <td key={b} className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="0.5"
                          value={p.spl[b] ?? ''}
                          placeholder="—"
                          onChange={(e) => handleSplChange(p.id, b, e.target.value)}
                          className="w-12 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#5833c7] focus:outline-none font-medium"
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

    </div>
  );
}
