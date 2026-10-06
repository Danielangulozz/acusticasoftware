import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Layers,
  Eye,
  Crosshair,
  Volume2,
  Activity,
  Maximize2,
  Sparkles,
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
} from 'recharts';
import { modePressureShape } from '../../utils/modalCalculations';

/**
 * Colormap Jet clásico: t en [-1, 1] -> [R, G, B]
 */
function getJetColor(val) {
  // Normalizar de [-1, 1] a [0, 1]
  const t = Math.max(0, Math.min(1, (val + 1) / 2));
  let r = 0, g = 0, b = 0;

  if (t < 0.125) {
    b = 0.5 + 4 * t;
  } else if (t < 0.375) {
    b = 1;
    g = 4 * (t - 0.125);
  } else if (t < 0.625) {
    b = 1 - 4 * (t - 0.375);
    g = 1;
    r = 4 * (t - 0.375);
  } else if (t < 0.875) {
    g = 1 - 4 * (t - 0.625);
    r = 1;
  } else {
    r = 1 - 2 * (t - 0.875);
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

/**
 * Visor de Campo de Presión Sonora 2D en Tiempo Real (Canvas + requestAnimationFrame)
 */
export default function PressureFieldViewer({
  modes = [],
  selectedMode = null,
  onSelectMode = () => {},
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
}) {
  const { Lx = 10, Ly = 6, Lz = 3 } = dimensions;

  // Modo actual
  const currentMode = selectedMode || modes[0] || { nx: 1, ny: 0, nz: 0, frequency: 50, label: 'Axial' };

  // Estados de control de vista
  const [slicePlane, setSlicePlane] = useState('XY'); // 'XY' | 'XZ' | 'YZ'
  const [slicePos, setSlicePos] = useState(1.2); // Altura Z por defecto 1.2 m
  const [showNodeLines, setShowNodeLines] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slowMoFactor, setSlowMoFactor] = useState(0.0005); // Factor para cámara lenta visible
  const [probePoint, setProbePoint] = useState({ x: Lx / 2, y: Ly / 2, z: 1.2 });
  const [superposeModes, setSuperposeModes] = useState(false);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimestampRef = useRef(null);

  // Dimensiones del plano actual
  const { dimU, dimV, uLabel, vLabel, maxSlice } = useMemo(() => {
    if (slicePlane === 'XY') {
      return { dimU: Lx, dimV: Ly, uLabel: 'X (m)', vLabel: 'Y (m)', maxSlice: Lz };
    }
    if (slicePlane === 'XZ') {
      return { dimU: Lx, dimV: Lz, uLabel: 'X (m)', vLabel: 'Z (m)', maxSlice: Ly };
    }
    return { dimU: Ly, dimV: Lz, uLabel: 'Y (m)', vLabel: 'Z (m)', maxSlice: Lx };
  }, [slicePlane, Lx, Ly, Lz]);

  // Resolución de renderizado
  const resX = 180;
  const resY = Math.max(60, Math.round(resX * (dimV / dimU)));

  // Matriz espacial precalculada (Float32Array) para evitar recalcular funciones trigonométricas en cada frame
  const spatialFieldRef = useRef(null);

  // Recalcular la matriz espacial únicamente cuando cambia el modo, plano o posición de corte
  useEffect(() => {
    const grid = new Float32Array(resX * resY);
    const activeModes = superposeModes ? modes.slice(0, 3) : [currentMode];

    for (let iy = 0; iy < resY; iy++) {
      const v = (iy / (resY - 1)) * dimV;
      for (let ix = 0; ix < resX; ix++) {
        const u = (ix / (resX - 1)) * dimU;

        let x = 0, y = 0, z = 0;
        if (slicePlane === 'XY') {
          x = u; y = v; z = Math.min(Lz, Math.max(0, slicePos));
        } else if (slicePlane === 'XZ') {
          x = u; y = Math.min(Ly, Math.max(0, slicePos)); z = v;
        } else {
          x = Math.min(Lx, Math.max(0, slicePos)); y = u; z = v;
        }

        let totalShape = 0;
        activeModes.forEach(m => {
          totalShape += modePressureShape(x, y, z, m, Lx, Ly, Lz) * (m.weight || 1);
        });

        // Normalizar si se superponen
        if (superposeModes && activeModes.length > 1) {
          totalShape /= activeModes.length;
        }

        grid[iy * resX + ix] = totalShape;
      }
    }

    spatialFieldRef.current = grid;
    renderCanvasFrame(timeRef.current);
  }, [currentMode, slicePlane, slicePos, dimU, dimV, Lx, Ly, Lz, resX, resY, superposeModes, modes]);

  // Función de renderizado directo sobre el canvas sin re-renderizado de React
  const renderCanvasFrame = useCallback((tSec) => {
    const canvas = canvasRef.current;
    if (!canvas || !spatialFieldRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const f = currentMode.frequency || 50;
    // Factor temporal cos(2*pi*f*t)
    const timeFactor = isPlaying ? Math.cos(2 * Math.PI * f * tSec) : 1.0;

    const grid = spatialFieldRef.current;
    const imgData = ctx.createImageData(resX, resY);
    const data = imgData.data;

    for (let i = 0; i < grid.length; i++) {
      const val = grid[i] * timeFactor;
      const [r, g, b] = getJetColor(val);

      const pIdx = i * 4;
      data[pIdx] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
      data[pIdx + 3] = 255;
    }

    // Dibujar datos interpolados en canvas temporal y escalar con smooth
    const offCanvas = document.createElement('canvas');
    offCanvas.width = resX;
    offCanvas.height = resY;
    const offCtx = offCanvas.getContext('2d');
    offCtx.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

    // Dibujar líneas nodales (p = 0) si está activo
    if (showNodeLines) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.setLineDash([4, 4]);

      // Nodos en X
      const nx = currentMode.nx || 0;
      if (nx > 0 && (slicePlane === 'XY' || slicePlane === 'XZ')) {
        for (let k = 1; k <= nx; k++) {
          const xPos = (canvas.width / nx) * (k - 0.5);
          ctx.beginPath();
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, canvas.height);
          ctx.stroke();
        }
      }

      // Nodos en Y
      const ny = currentMode.ny || 0;
      if (ny > 0 && slicePlane === 'XY') {
        for (let k = 1; k <= ny; k++) {
          const yPos = (canvas.height / ny) * (k - 0.5);
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(canvas.width, yPos);
          ctx.stroke();
        }
      }

      // Nodos en Z
      const nz = currentMode.nz || 0;
      if (nz > 0 && (slicePlane === 'XZ' || slicePlane === 'YZ')) {
        for (let k = 1; k <= nz; k++) {
          const zPos = (canvas.height / nz) * (k - 0.5);
          ctx.beginPath();
          ctx.moveTo(0, zPos);
          ctx.lineTo(canvas.width, zPos);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    // Dibujar punto de sonda (probe)
    let probeU = 0, probeV = 0;
    if (slicePlane === 'XY') {
      probeU = probePoint.x; probeV = probePoint.y;
    } else if (slicePlane === 'XZ') {
      probeU = probePoint.x; probeV = probePoint.z;
    } else {
      probeU = probePoint.y; probeV = probePoint.z;
    }

    const probeCanvasX = (probeU / dimU) * canvas.width;
    const probeCanvasY = (probeV / dimV) * canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(probeCanvasX, probeCanvasY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }, [currentMode, isPlaying, resX, resY, showNodeLines, slicePlane, dimU, dimV, probePoint]);

  // Bucle de animación con requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderCanvasFrame(timeRef.current);
      return;
    }

    const animate = (timestamp) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      timeRef.current += delta * slowMoFactor;
      renderCanvasFrame(timeRef.current);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
    };
  }, [isPlaying, slowMoFactor, renderCanvasFrame]);

  // Click en el canvas para mover el punto de sonda
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const u = Number(((clickX / rect.width) * dimU).toFixed(2));
    const v = Number(((clickY / rect.height) * dimV).toFixed(2));

    if (slicePlane === 'XY') {
      setProbePoint({ x: u, y: v, z: slicePos });
    } else if (slicePlane === 'XZ') {
      setProbePoint({ x: u, y: slicePos, z: v });
    } else {
      setProbePoint({ x: slicePos, y: u, z: v });
    }
  };

  // Curva de presión p(t) en el punto de sonda durante 2 periodos
  const probeCurve = useMemo(() => {
    const f = currentMode.frequency || 50;
    const period = 1 / f;
    const numPoints = 60;
    const curve = [];

    const shape = modePressureShape(probePoint.x, probePoint.y, probePoint.z, currentMode, Lx, Ly, Lz);

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * (2 * period); // 2 periodos
      const p = shape * Math.cos(2 * Math.PI * f * t);
      curve.push({
        timeMs: Number((t * 1000).toFixed(2)),
        pressure: Number(p.toFixed(3)),
      });
    }

    return {
      curve,
      shape: Number(shape.toFixed(3)),
      periodMs: Number((period * 1000).toFixed(2)),
    };
  }, [probePoint, currentMode, Lx, Ly, Lz]);

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado y Selector de Modo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-400">
              <Eye className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Visor de Distribución de Presión Acústica 2D
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Visualización analítica del campo escalar ψ(x,y,z) y oscilación temporal p(t) con líneas nodales (p=0).
          </p>
        </div>

        {/* Selector de Modo Activo */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-[#86868b] font-medium">Modo activo:</label>
          <select
            value={currentMode.id}
            onChange={(e) => {
              const m = modes.find(item => item.id === e.target.value);
              if (m) onSelectMode(m);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5833c7]"
          >
            {modes.slice(0, 60).map(m => (
              <option key={m.id} value={m.id}>
                ({m.nx},{m.ny},{m.nz}) &bull; {m.frequency.toFixed(1)} Hz &bull; {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Controles de Vista y Plano de Corte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] text-xs">
        
        {/* Selector de Plano */}
        <div>
          <label className="block text-[#86868b] font-semibold mb-1.5">Plano de Sección:</label>
          <div className="flex gap-1">
            {['XY', 'XZ', 'YZ'].map((plane) => (
              <button
                key={plane}
                onClick={() => { setSlicePlane(plane); setSlicePos(1.2); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  slicePlane === plane
                    ? 'bg-[#5833c7] text-white shadow-sm'
                    : 'bg-white dark:bg-[#25263a] text-[#86868b] border border-black/[0.05] dark:border-white/[0.05]'
                }`}
              >
                {plane === 'XY' ? 'Planta (XY)' : plane === 'XZ' ? 'Alzado (XZ)' : 'Alzado (YZ)'}
              </button>
            ))}
          </div>
        </div>

        {/* Slider de Posición de Corte */}
        <div>
          <div className="flex items-center justify-between text-[#86868b] font-semibold mb-1.5">
            <span>Posición de Corte:</span>
            <span className="font-mono text-[#1d1d1f] dark:text-white font-bold">{slicePos.toFixed(2)} m</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxSlice}
            step="0.05"
            value={slicePos}
            onChange={(e) => setSlicePos(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#5833c7]"
          />
          <div className="flex justify-between text-[10px] text-[#86868b] mt-1 font-mono">
            <span>0.0 m</span>
            <span>{(maxSlice / 2).toFixed(1)} m</span>
            <span>{maxSlice.toFixed(1)} m</span>
          </div>
        </div>

        {/* Controles de Animación Temporal */}
        <div>
          <label className="block text-[#86868b] font-semibold mb-1.5">Oscilación Temporal:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl font-bold transition-all ${
                isPlaying
                  ? 'bg-[#f59e0b] text-white shadow-sm'
                  : 'bg-[#5833c7] text-white shadow-sm'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pausar' : 'Animar (p(t))'}</span>
            </button>
            <button
              onClick={() => { timeRef.current = 0; renderCanvasFrame(0); }}
              className="p-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.05] dark:border-white/[0.05] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              title="Reiniciar t = 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Toggles Adicionales */}
        <div className="flex flex-col justify-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[#1d1d1f] dark:text-slate-300">
            <input
              type="checkbox"
              checked={showNodeLines}
              onChange={(e) => setShowNodeLines(e.target.checked)}
              className="rounded border-gray-400 text-[#5833c7] focus:ring-[#5833c7]"
            />
            <span>Mostrar líneas nodales (p=0)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none text-[#1d1d1f] dark:text-slate-300">
            <input
              type="checkbox"
              checked={superposeModes}
              onChange={(e) => setSuperposeModes(e.target.checked)}
              className="rounded border-gray-400 text-[#5833c7] focus:ring-[#5833c7]"
            />
            <span>Superponer 3 primeros modos</span>
          </label>
        </div>

      </div>

      {/* Área del Canvas y Barra de Color */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Canvas de Presión (Ocupa 3 columnas) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#86868b] px-1 font-mono">
            <span>Origen (0, 0)</span>
            <span>Haz clic para situar la sonda de medición</span>
            <span>{uLabel}: {dimU.toFixed(1)}m, {vLabel}: {dimV.toFixed(1)}m</span>
          </div>

          <div className="relative w-full aspect-[16/10] bg-black rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] shadow-inner cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={720}
              height={450}
              onClick={handleCanvasClick}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Barra de Color Jet */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-[11px] font-mono text-[#86868b]">-1.0 (Mín)</span>
            <div
              className="flex-1 h-3 rounded-full border border-black/10 dark:border-white/10"
              style={{
                background: 'linear-gradient(to right, #00008f, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000, #800000)'
              }}
            />
            <span className="text-[11px] font-mono text-[#86868b]">+1.0 (Máx)</span>
          </div>
        </div>

        {/* Panel Lateral: Sonda e Inspección de Punto (1 columna) */}
        <div className="space-y-4 bg-[#fbfbfd] dark:bg-[#18192a] p-4 rounded-2xl border border-black/[0.05] dark:border-white/[0.06]">
          <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <Crosshair className="w-4 h-4 text-[#5833c7]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
              Sonda de Medición
            </h4>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#86868b]">Posición X:</span>
              <span className="font-bold text-[#1d1d1f] dark:text-white">{probePoint.x.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Posición Y:</span>
              <span className="font-bold text-[#1d1d1f] dark:text-white">{probePoint.y.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Posición Z:</span>
              <span className="font-bold text-[#1d1d1f] dark:text-white">{probePoint.z.toFixed(2)} m</span>
            </div>
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex justify-between text-sm">
              <span className="text-[#86868b]">Amplitud ψ:</span>
              <span className={`font-bold ${Math.abs(probeCurve.shape) < 0.1 ? 'text-[#86868b]' : probeCurve.shape > 0 ? 'text-[#ef4444]' : 'text-[#0071e3]'}`}>
                {probeCurve.shape > 0 ? `+${probeCurve.shape}` : probeCurve.shape}
              </span>
            </div>
            <div className="text-[11px] text-[#86868b] font-sans">
              {Math.abs(probeCurve.shape) < 0.15 ? 'Zona nodal (cancelación acústica)' : Math.abs(probeCurve.shape) > 0.8 ? 'Vientre de presión (máxima energía modal)' : 'Zona de transición'}
            </div>
          </div>

          {/* Gráfica Live de p(t) en la Sonda */}
          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1">
            <div className="text-[11px] font-bold text-[#1d1d1f] dark:text-white">
              Presión Temporal p(t) [2 periodos]
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={probeCurve.curve}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#888888" opacity={0.15} />
                  <XAxis
                    dataKey="timeMs"
                    tick={{ fontSize: 9, fill: '#86868b', fontFamily: 'monospace' }}
                    unit="ms"
                  />
                  <YAxis
                    domain={[-1, 1]}
                    tick={{ fontSize: 9, fill: '#86868b', fontFamily: 'monospace' }}
                  />
                  <ReferenceLine y={0} stroke="#888888" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="pressure"
                    stroke="#5833c7"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
