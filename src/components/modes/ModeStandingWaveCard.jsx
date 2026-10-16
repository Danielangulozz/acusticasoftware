import React, { useState, useMemo } from 'react';
import {
  Waves,
  Eye,
  HelpCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Box,
  Compass,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

/**
 * ==============================================================================
 * COMPONENTE: ModeStandingWaveCard
 * ==============================================================================
 * Visualizador interactivo de ondas estacionarias 1D (con vientres V y nodos N)
 * y distribución de isóbaras 2D, replicando fielmente las diapositivas de clase
 * (USB Medellín: "Modos propios de vibración" y "Sala rectangular con paredes rígidas").
 *
 * Incluye el desglose pedagógico para salas de planta irregular (12 paredes, 51.3 m²).
 */
export default function ModeStandingWaveCard({
  mode,
  dimensions = { Lx: 10, Ly: 6, Lz: 3, isRectangular: true },
  geometry = {},
  roomPolygon = null,
  c = 343,
  onOpen3DView = () => {},
}) {
  const [showIrregularInfo, setShowIrregularInfo] = useState(false);
  const [viewMetric, setViewMetric] = useState('pressure_displacement'); // 'pressure_displacement' | 'isobars_2d'

  // Modo activo (por defecto el primer axial si no hay selección)
  const currentMode = mode || {
    nx: 1,
    ny: 0,
    nz: 0,
    frequency: (c / (2 * (dimensions.Lx || 10))),
    label: 'Axial X (1, 0, 0)',
    type: 'axial',
    weight: 1.0,
    color: '#5833c7',
  };

  const { nx = 0, ny = 0, nz = 0, frequency = 50, label = 'Modo' } = currentMode;
  const f = Math.max(1, frequency);
  const lambda = Number((c / f).toFixed(3)); // Longitud de onda en metros
  const halfLambda = Number((lambda / 2).toFixed(3)); // Distancia nodo-nodo
  const quarterLambda = Number((lambda / 4).toFixed(3)); // Distancia pared a primer nodo

  // Dimensión relevante para el perfil 1D (eje dominante)
  const { dominantAxis, axisLength, dominantN } = useMemo(() => {
    if (nx > 0 && ny === 0 && nz === 0) return { dominantAxis: 'X', axisLength: dimensions.Lx || 10, dominantN: nx };
    if (ny > 0 && nx === 0 && nz === 0) return { dominantAxis: 'Y', axisLength: dimensions.Ly || 6, dominantN: ny };
    if (nz > 0 && nx === 0 && ny === 0) return { dominantAxis: 'Z (Altura)', axisLength: dimensions.Lz || 3, dominantN: nz };
    if (nx >= ny && nx >= nz) return { dominantAxis: 'X (Dominante)', axisLength: dimensions.Lx || 10, dominantN: nx };
    if (ny >= nx && ny >= nz) return { dominantAxis: 'Y (Dominante)', axisLength: dimensions.Ly || 6, dominantN: ny };
    return { dominantAxis: 'Z (Dominante)', axisLength: dimensions.Lz || 3, dominantN: nz };
  }, [nx, ny, nz, dimensions]);

  const L = Math.max(0.1, axisLength);
  const n = Math.max(1, dominantN || 1);

  // Generación de la curva continua 1D de Presión y Desplazamiento
  const wavePoints = useMemo(() => {
    const pts = [];
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * L;
      // Condición de contorno rígida: p(x) = cos(n * pi * x / L)
      const p = Math.cos((n * Math.PI * x) / L);
      // Desplazamiento de partícula proporcional a -dp/dx = sin(n * pi * x / L)
      const xi = Math.sin((n * Math.PI * x) / L);
      pts.push({ x: Number(x.toFixed(3)), p: Number(p.toFixed(3)), xi: Number(xi.toFixed(3)) });
    }
    return pts;
  }, [L, n]);

  // Nodos (N: p = 0) y Vientres (V: |p| = 1)
  const nodesAndAntinodes = useMemo(() => {
    const nodes = [];
    const antinodes = [];

    // Vientres de presión en x = m * (L / n) donde m = 0, 1, ..., n
    for (let m = 0; m <= n; m++) {
      const x = (m * L) / n;
      const isWall = m === 0 || m === n;
      antinodes.push({
        id: `v-${m}`,
        index: m + 1,
        x: Number(x.toFixed(2)),
        isWall,
        label: isWall ? `V (Pared)` : `V${m + 1}`,
      });
    }

    // Nodos de presión en x = (m + 0.5) * (L / n) donde m = 0, ..., n-1
    for (let m = 0; m < n; m++) {
      const x = ((m + 0.5) * L) / n;
      nodes.push({
        id: `n-${m}`,
        index: m + 1,
        x: Number(x.toFixed(2)),
        label: `N${m + 1}`,
      });
    }

    return { nodes, antinodes };
  }, [L, n]);

  // Dimensiones del gráfico SVG 1D
  const svgW = 600;
  const svgH = 200;
  const padX = 55;
  const padY = 35;
  const plotW = svgW - 2 * padX;
  const plotH = svgH - 2 * padY;
  const midY = padY + plotH / 2;

  const toSvgX = (x) => padX + (x / L) * plotW;
  const toSvgY = (val) => midY - val * (plotH / 2.2);

  const pressurePath = useMemo(() => {
    return wavePoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.p).toFixed(1)}`).join(' ');
  }, [wavePoints, L, plotW, plotH, midY]);

  const displacementPath = useMemo(() => {
    return wavePoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.xi).toFixed(1)}`).join(' ');
  }, [wavePoints, L, plotW, plotH, midY]);

  // Mini Mapa 2D de Isóbaras (Grilla 32x18)
  const isobarGrid = useMemo(() => {
    const cols = 32;
    const rows = 18;
    const cells = [];
    const lx = dimensions.Lx || 10;
    const ly = dimensions.Ly || 6;

    for (let r = 0; r < rows; r++) {
      const y = (r / (rows - 1)) * ly;
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1)) * lx;
        // Presión modal en plano XY: cos(nx*pi*x/Lx) * cos(ny*pi*y/Ly)
        const pVal = Math.cos((nx * Math.PI * x) / lx) * Math.cos((ny * Math.PI * y) / ly);
        cells.push({ x: c, y: r, val: pVal });
      }
    }
    return { cols, rows, cells };
  }, [nx, ny, dimensions]);

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 shadow-apple-sm transition-all space-y-4">
      
      {/* Cabecera del Inspector Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-[#5833c7] text-white shadow-md shadow-[#5833c7]/25">
            <Waves className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#5833c7]/10 text-[#5833c7] dark:text-purple-300 font-mono">
                {currentMode.type ? currentMode.type.toUpperCase() : 'MODO PROPIO'}
              </span>
              <h3 className="text-lg font-black text-[#1d1d1f] dark:text-white">
                Modo ({nx}, {ny}, {nz}) &bull; <span className="text-[#5833c7] dark:text-purple-400 font-mono">{f.toFixed(2)} Hz</span>
              </h3>
            </div>
            <p className="text-xs text-[#86868b] dark:text-slate-400 mt-0.5">
              Onda estacionaria resonante entre paredes rígidas opuestas &bull; Eje {dominantAxis} ({L.toFixed(2)} m)
            </p>
          </div>
        </div>

        {/* Acciones de vista */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMetric('pressure_displacement')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                viewMetric === 'pressure_displacement'
                  ? 'bg-white dark:bg-[#1f2038] text-[#5833c7] dark:text-white shadow-xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Onda 1D (V / N)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('isobars_2d')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                viewMetric === 'isobars_2d'
                  ? 'bg-white dark:bg-[#1f2038] text-[#5833c7] dark:text-white shadow-xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Isóbaras 2D
            </button>
          </div>

          <button
            type="button"
            onClick={onOpen3DView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5833c7]/10 hover:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-300 text-xs font-bold transition-all"
            title="Abrir representación de superficie continua 3D (MATLAB)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver 3D MATLAB</span>
          </button>
        </div>
      </div>

      {/* Chips de Parámetros Físicos de la Onda */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          <span className="text-[10px] text-[#86868b] block font-mono">Longitud de Onda (λ)</span>
          <span className="text-sm font-black font-mono text-[#1d1d1f] dark:text-white">{lambda} m</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          <span className="text-[10px] text-[#86868b] block font-mono">Distancia N-N (λ / 2)</span>
          <span className="text-sm font-black font-mono text-[#0071e3] dark:text-sky-400">{halfLambda} m</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          <span className="text-[10px] text-[#86868b] block font-mono">Pared a Nodo (λ / 4)</span>
          <span className="text-sm font-black font-mono text-[#10b981] dark:text-emerald-400">{quarterLambda} m</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          <span className="text-[10px] text-[#86868b] block font-mono">Vientres (V) / Nodos (N)</span>
          <span className="text-sm font-black font-mono text-[#5833c7] dark:text-purple-300">
            {nodesAndAntinodes.antinodes.length} V &bull; {nodesAndAntinodes.nodes.length} N
          </span>
        </div>
      </div>

      {/* ÁREA DE GRÁFICA INTERACTIVA */}
      {viewMetric === 'pressure_displacement' ? (
        /* GRÁFICA 1D DE ONDA ESTACIONARIA (IDÉNTICA A DIAPOSITIVA 1 Y 3) */
        <div className="bg-[#fbfbfd] dark:bg-[#0c0d18] p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] relative overflow-hidden">
          
          {/* Leyenda superior */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono mb-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-[#5833c7] dark:text-purple-400">
                <span className="w-3 h-0.5 bg-[#5833c7] dark:bg-purple-400 rounded-full inline-block"></span>
                Presión Acústica p(x) [V = Máx en paredes]
              </span>
              <span className="flex items-center gap-1.5 font-bold text-[#10b981] dark:text-emerald-400">
                <span className="w-3 h-0.5 bg-[#10b981] dark:bg-emerald-400 border-dashed inline-block"></span>
                Desplazamiento ξ(x) [0 en paredes]
              </span>
            </div>
            <span className="text-[10px] text-[#86868b]">
              Condición rígida: ∂p/∂n = 0 &bull; Presión máxima en frontera
            </span>
          </div>

          {/* Canvas SVG de Onda Estacionaria */}
          <div className="w-full overflow-x-auto flex justify-center">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full max-w-[680px] h-[210px] select-none"
            >
              <defs>
                {/* Rayado de pared rígida tipo ingeniería */}
                <pattern id="rigidWallHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(100, 100, 100, 0.4)" strokeWidth="1.2" />
                </pattern>
                <linearGradient id="waveFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#5833c7" stopOpacity="0.15" />
                  <stop offset="50%" stopColor="#5833c7" stopOpacity="0.0" />
                  <stop offset="100%" stopColor="#5833c7" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* Pared Izquierda (x = 0) */}
              <rect x={padX - 16} y={padY - 15} width={16} height={plotH + 30} fill="url(#rigidWallHatch)" stroke="#86868b" strokeWidth="1.5" />
              <line x1={padX} y1={padY - 15} x2={padX} y2={padY + plotH + 15} stroke="#1d1d1f" strokeWidth="2.5" className="dark:stroke-white" />
              <text x={padX - 8} y={padY - 20} fontSize="8" fontWeight="bold" fill="#86868b" textAnchor="middle">x = 0</text>
              <text x={padX - 8} y={midY + 4} fontSize="8" fontWeight="bold" fill="#86868b" textAnchor="middle" transform={`rotate(-90 ${padX - 8} ${midY})`}>
                PARED RÍGIDA
              </text>

              {/* Pared Derecha (x = L) */}
              <rect x={padX + plotW} y={padY - 15} width={16} height={plotH + 30} fill="url(#rigidWallHatch)" stroke="#86868b" strokeWidth="1.5" />
              <line x1={padX + plotW} y1={padY - 15} x2={padX + plotW} y2={padY + plotH + 15} stroke="#1d1d1f" strokeWidth="2.5" className="dark:stroke-white" />
              <text x={padX + plotW + 8} y={padY - 20} fontSize="8" fontWeight="bold" fill="#86868b" textAnchor="middle">x = {L}m</text>
              <text x={padX + plotW + 8} y={midY + 4} fontSize="8" fontWeight="bold" fill="#86868b" textAnchor="middle" transform={`rotate(90 ${padX + plotW + 8} ${midY})`}>
                PARED RÍGIDA
              </text>

              {/* Eje central horizontal (p = 0 / línea nodal) */}
              <line x1={padX} y1={midY} x2={padX + plotW} y2={midY} stroke="#86868b" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.5" />

              {/* Líneas verticales de Nodos (N) */}
              {nodesAndAntinodes.nodes.map((node) => {
                const sx = toSvgX(node.x);
                return (
                  <g key={node.id}>
                    <line x1={sx} y1={padY - 6} x2={sx} y2={padY + plotH + 6} stroke="#0071e3" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                    {/* Badge Nodo N */}
                    <circle cx={sx} cy={midY} r="4.5" fill="#0071e3" stroke="white" strokeWidth="1.2" />
                    <rect x={sx - 12} y={padY + plotH + 10} width={24} height={13} rx={3} fill="#0071e3" />
                    <text x={sx} y={padY + plotH + 19} fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="mono">
                      {node.label}
                    </text>
                    <text x={sx} y={padY - 10} fill="#0071e3" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="mono">
                      {node.x}m
                    </text>
                  </g>
                );
              })}

              {/* Vientres de Presión (V: Máxima Presión) */}
              {nodesAndAntinodes.antinodes.map((anti) => {
                const sx = toSvgX(anti.x);
                return (
                  <g key={anti.id}>
                    <rect x={sx - 12} y={padY - 14} width={24} height={13} rx={3} fill="#5833c7" />
                    <text x={sx} y={padY - 5} fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="mono">
                      V
                    </text>
                  </g>
                );
              })}

              {/* Trazo de Desplazamiento de Partícula (Verde discontinuo) */}
              <path
                d={displacementPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity="0.85"
              />

              {/* Trazo de Presión Acústica (Púrpura sólido) */}
              <path
                d={pressurePath}
                fill="none"
                stroke="#5833c7"
                strokeWidth="2.5"
                className="dark:stroke-[#9d80f8]"
              />

              {/* Cota λ / 4 desde la pared izquierda al primer nodo */}
              {nodesAndAntinodes.nodes.length > 0 && (
                <g transform={`translate(0, ${midY - 45})`}>
                  <line x1={padX} y1="0" x2={toSvgX(nodesAndAntinodes.nodes[0].x)} y2="0" stroke="#f59e0b" strokeWidth="1.2" />
                  <circle cx={padX} cy="0" r="2" fill="#f59e0b" />
                  <circle cx={toSvgX(nodesAndAntinodes.nodes[0].x)} cy="0" r="2" fill="#f59e0b" />
                  <rect x={(padX + toSvgX(nodesAndAntinodes.nodes[0].x)) / 2 - 18} y="-11" width="36" height="11" rx="2" fill="rgba(245, 158, 11, 0.9)" />
                  <text x={(padX + toSvgX(nodesAndAntinodes.nodes[0].x)) / 2} y="-3" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">
                    λ/4 = {quarterLambda}m
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      ) : (
        /* VISTA 2D DE ISÓBARAS (IDÉNTICA A DIAPOSITIVA 1 Y 5: CAMPO SONORO RECINTO) */
        <div className="bg-[#fbfbfd] dark:bg-[#0c0d18] p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#1d1d1f] dark:text-white">
              Campo Sonoro 2D &bull; Recinto ({nx}, {ny}, 0) &bull; Distribución de Isóbaras
            </span>
            <span className="text-[#86868b] text-[11px]">
              Azul: Presión Negativa &bull; Verde: Nodal (p=0) &bull; Rojo: Máxima Presión
            </span>
          </div>

          <div className="relative w-full h-44 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 flex items-center justify-center bg-black">
            <div
              className="w-full h-full grid"
              style={{
                gridTemplateColumns: `repeat(${isobarGrid.cols}, 1fr)`,
                gridTemplateRows: `repeat(${isobarGrid.rows}, 1fr)`,
              }}
            >
              {isobarGrid.cells.map((cell, idx) => {
                // Mapeo Jet simplificado: -1 (azul), 0 (verde/cian), +1 (rojo)
                const val = cell.val;
                let bg = '';
                if (val < -0.33) {
                  bg = `rgb(0, ${Math.round(100 + (val + 1) * 155)}, 255)`;
                } else if (val < 0.33) {
                  bg = `rgb(0, 220, ${Math.round(150 - val * 200)})`;
                } else {
                  bg = `rgb(255, ${Math.round((1 - val) * 180)}, 0)`;
                }

                return (
                  <div
                    key={`cell-${idx}`}
                    style={{ backgroundColor: bg }}
                    className="w-full h-full"
                    title={`p = ${val.toFixed(2)}`}
                  />
                );
              })}
            </div>

            {/* Overlay de cotas de la sala */}
            <div className="absolute bottom-2 left-3 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-mono">
              Lx = {dimensions.Lx}m &bull; Ly = {dimensions.Ly}m
            </div>
            <div className="absolute top-2 right-3 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-mono">
              f = {f.toFixed(2)} Hz
            </div>
          </div>
        </div>
      )}

      {/* --- PANEL DE ORIENTACIÓN ACADÉMICA PARA SALAS IRREGULARES --- */}
      {/* Responde exactamente a la inquietud del usuario sobre la diapositiva 3: "Forma irregular no tiene validez :(" */}
      <div className="rounded-2xl border border-[#5833c7]/20 bg-[#5833c7]/[0.03] dark:bg-[#5833c7]/10 p-4 transition-all">
        <button
          type="button"
          onClick={() => setShowIrregularInfo(!showIrregularInfo)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-[#5833c7]/15 text-[#5833c7] dark:text-purple-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                <span>¿Por qué la diapositiva dice <em>"Forma irregular no tiene validez ☹"</em> y qué hacemos en tu sala?</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5833c7] text-white font-bold">
                  SALA ACTUAL: {roomPolygon?.vertices?.length || 12} PAREDES ({geometry.floorArea || 51.3} m²)
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] dark:text-slate-400">
                Haz clic para ver la fundamentación teórica que debes explicar en tu entrega académica.
              </p>
            </div>
          </div>

          <span className="p-1 rounded-lg text-[#86868b] group-hover:text-[#1d1d1f] dark:group-hover:text-white transition">
            {showIrregularInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showIrregularInfo && (
          <div className="mt-3.5 pt-3.5 border-t border-[#5833c7]/15 text-xs text-[#1d1d1f] dark:text-slate-200 space-y-3 animate-fadeIn">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>1. El porqué de la diapositiva del profesor:</strong>
                <p className="text-[11px] mt-0.5">
                  La ecuación diferencial de onda analítica en 3D <code>f = (c/2) √((nx/Lx)² + (ny/Ly)² + (nz/Lz)²)</code> se deduce imponiendo condiciones de contorno de <em>separación de variables cartesianas en paredes rectangulares paralelas y rígidas</em>. En recintos de planta irregular (como tu sala de 12 paredes y arco de 9.50m), las paredes inclinadas dispersan los rayos acústicos, por lo que <strong>las ondas estacionarias puras no pueden concentrarse en un bucle unidimensional cerrado</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-1">
                <span className="font-bold text-[#5833c7] dark:text-purple-300 block text-[11px]">
                  Ventaja Acústica Real
                </span>
                <p className="text-[11px] text-[#86868b] dark:text-slate-400 leading-relaxed">
                  ¡Tener una sala irregular es <strong>acústicamente excelente</strong>! Al no haber paredes paralelas opuestas, se eliminan los ecos flotantes (<em>flutter echoes</em>) y se mitigan las resonancias degeneradas agudas.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-1">
                <span className="font-bold text-[#0071e3] dark:text-sky-400 block text-[11px]">
                  Modos Verticales Z (100% Válidos)
                </span>
                <p className="text-[11px] text-[#86868b] dark:text-slate-400 leading-relaxed">
                  Dado que el piso y el techo de tu sala <strong>sí son horizontales y paralelos</strong> (a H = {dimensions.Lz || 3.0} m), los modos axiales <code>(0, 0, 1) = 57.2 Hz</code>, <code>(0, 0, 2) = 114.3 Hz</code>, etc., <strong>son 100% exactos y válidos experimentalmente</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-1">
                <span className="font-bold text-[#10b981] dark:text-emerald-400 block text-[11px]">
                  Método de Área Equivalente
                </span>
                <p className="text-[11px] text-[#86868b] dark:text-slate-400 leading-relaxed">
                  POZOLE modela tu sala conservando el volumen exacto (V = {geometry.volume || 153.8} m³) mediante dimensiones equivalentes (<code>Lx = {dimensions.Lx}m, Ly = {dimensions.Ly}m</code>). Esto predice con exactitud la <strong>Frecuencia de Schroeder</strong> y la <strong>Ley de Weyl</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
