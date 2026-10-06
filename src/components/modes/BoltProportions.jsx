import React, { useState, useMemo } from 'react';
import {
  Ruler,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Info,
  Maximize2,
  Box,
} from 'lucide-react';
import {
  boltDimensionsFromVolume,
  normalizeDimensionsToBolt,
  detectSimpleRatios,
  BOLT_ZONE_A_CONTOUR,
  BOLT_PRESETS,
} from '../../utils/proportions';

export default function BoltProportions({
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
  volume = 180,
  onApplyProportions = () => {},
}) {
  const { Lx = 10, Ly = 6, Lz = 3 } = dimensions;

  const [targetVolume, setTargetVolume] = useState(volume > 0 ? Number(volume.toFixed(1)) : 100);
  const [selectedPresetKey, setSelectedPresetKey] = useState('small');

  // Dimensiones sugeridas para el volumen objetivo
  const suggested = useMemo(() => {
    return boltDimensionsFromVolume(targetVolume, selectedPresetKey);
  }, [targetVolume, selectedPresetKey]);

  // Análisis de la sala actual en el diagrama de Bolt
  const currentNormalized = useMemo(() => {
    return normalizeDimensionsToBolt(Lx, Ly, Lz);
  }, [Lx, Ly, Lz]);

  // Detección de razones simples en la sala actual
  const simpleRatios = useMemo(() => {
    return detectSimpleRatios(Lx, Ly, Lz);
  }, [Lx, Ly, Lz]);

  // Coordenadas SVG para el diagrama p-q de Bolt
  // Rango p: [1.0, 2.0], Rango q: [1.0, 3.0]
  const svgWidth = 420;
  const svgHeight = 280;
  const margin = { top: 25, right: 30, bottom: 40, left: 45 };

  const plotW = svgWidth - margin.left - margin.right;
  const plotH = svgHeight - margin.top - margin.bottom;

  const scaleP = (p) => margin.left + ((p - 1.0) / 1.0) * plotW;
  const scaleQ = (q) => margin.top + plotH - ((q - 1.0) / 2.0) * plotH;

  // Ruta del contorno de la Zona A
  const zoneAPath = useMemo(() => {
    return BOLT_ZONE_A_CONTOUR.map((pt, idx) => {
      const x = scaleP(pt.p);
      const y = scaleQ(pt.q);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, [plotW, plotH]);

  const currentPointX = scaleP(currentNormalized.p);
  const currentPointY = scaleQ(currentNormalized.q);

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-400">
              <Ruler className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Criterio de Proporciones Dimensionales de Bolt (1946)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Optimización de las relaciones de aspecto alto : ancho : largo (1 : p : q) para evitar acumulaciones modales y degeneraciones severas.
          </p>
        </div>
      </div>

      {/* Grid: Calculadora vs Diagrama p-q */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Columna 1: Calculadora de Dimensiones Óptimas */}
        <div className="space-y-4 p-5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5833c7]" />
              <span>Calculadora de Proporciones Óptimas</span>
            </h4>
            <span className="text-[11px] text-[#86868b]">Basado en V (m³)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#86868b] font-medium mb-1">Volumen Objetivo (m³):</label>
              <input
                type="number"
                min="5"
                max="5000"
                step="5"
                value={targetVolume}
                onChange={(e) => setTargetVolume(parseFloat(e.target.value) || 27)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] font-mono font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5833c7]"
              />
            </div>

            <div>
              <label className="block text-[#86868b] font-medium mb-1">Criterio / Proporción:</label>
              <select
                value={selectedPresetKey}
                onChange={(e) => setSelectedPresetKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5833c7]"
              >
                {Object.entries(BOLT_PRESETS).map(([key, val]) => (
                  <option key={key} value={key}>{val.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarjeta con dimensiones calculadas */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
            <div className="text-[11px] font-bold text-[#5833c7] dark:text-purple-400 uppercase tracking-wider">
              {suggested.name} &bull; 1 : {suggested.ratios.w} : {suggested.ratios.l}
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded-lg bg-[#fbfbfd] dark:bg-[#18192a]">
                <div className="text-[10px] text-[#86868b] uppercase">Altura H (m)</div>
                <div className="text-lg font-black text-[#1d1d1f] dark:text-white">{suggested.H} m</div>
              </div>
              <div className="p-2 rounded-lg bg-[#fbfbfd] dark:bg-[#18192a]">
                <div className="text-[10px] text-[#86868b] uppercase">Ancho W (m)</div>
                <div className="text-lg font-black text-[#1d1d1f] dark:text-white">{suggested.W} m</div>
              </div>
              <div className="p-2 rounded-lg bg-[#fbfbfd] dark:bg-[#18192a]">
                <div className="text-[10px] text-[#86868b] uppercase">Largo L (m)</div>
                <div className="text-lg font-black text-[#1d1d1f] dark:text-white">{suggested.L} m</div>
              </div>
            </div>

            <button
              onClick={() => onApplyProportions({ Lx: suggested.L, Ly: suggested.W, Lz: suggested.H })}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#5833c7] hover:bg-[#4727a8] text-white font-bold text-xs shadow-md shadow-[#5833c7]/20 transition-all"
            >
              <span>Aplicar Estas Proporciones a la Sala</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Advertencia de Razones Simples */}
          {simpleRatios.hasIssues && (
            <div className="p-3.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#ef4444]">
                <AlertTriangle className="w-4 h-4" />
                <span>Problema Detectado en la Sala Actual</span>
              </div>
              <div className="space-y-1 pt-1">
                {simpleRatios.issues.map((issue, idx) => (
                  <p key={idx} className="text-[#1d1d1f] dark:text-slate-300">
                    &bull; {issue.message} <span className="font-mono text-[#86868b]">({issue.details})</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna 2: Diagrama p-q de Bolt (SVG) */}
        <div className="space-y-3 p-5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                Diagrama de Área Aceptable (Bolt Zone A)
              </h4>
              <p className="text-[11px] text-[#86868b]">
                Eje X: p = W/H &bull; Eje Y: q = L/H (con H = 1.0)
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              currentNormalized.isInsideZoneA
                ? 'bg-[#10b981]/20 text-[#10b981]'
                : 'bg-[#ef4444]/20 text-[#ef4444]'
            }`}>
              {currentNormalized.isInsideZoneA ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DENTRO DE ZONA A</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>FUERA DE ZONA A</span>
                </>
              )}
            </span>
          </div>

          {/* Gráfico SVG del Plano p-q */}
          <div className="relative w-full aspect-[4/3] bg-white dark:bg-[#121322] rounded-xl border border-black/[0.06] dark:border-white/[0.06] p-2 flex items-center justify-center">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full"
            >
              {/* Ejes y Cuadrícula */}
              <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke="#888888" strokeWidth="1" opacity="0.3" />
              <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke="#888888" strokeWidth="1" opacity="0.3" />

              {/* Ticks y etiquetas en P */}
              {[1.0, 1.2, 1.4, 1.6, 1.8, 2.0].map(p => {
                const x = scaleP(p);
                return (
                  <g key={p}>
                    <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 5} stroke="#888888" opacity="0.5" />
                    <text x={x} y={margin.top + plotH + 16} fontSize="10" fill="#86868b" textAnchor="middle" fontFamily="monospace">
                      {p.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Ticks y etiquetas en Q */}
              {[1.0, 1.5, 2.0, 2.5, 3.0].map(q => {
                const y = scaleQ(q);
                return (
                  <g key={q}>
                    <line x1={margin.left - 5} y1={y} x2={margin.left} y2={y} stroke="#888888" opacity="0.5" />
                    <text x={margin.left - 8} y={y + 3} fontSize="10" fill="#86868b" textAnchor="end" fontFamily="monospace">
                      {q.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Polígono de la Zona A de Bolt */}
              <path
                d={zoneAPath}
                fill="rgba(88, 51, 199, 0.15)"
                stroke="#5833c7"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <text
                x={scaleP(1.4)}
                y={scaleQ(1.8)}
                fill="#5833c7"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                Zona A (Bolt)
              </text>

              {/* Punto de la sala actual */}
              {currentNormalized.p >= 1.0 && currentNormalized.p <= 2.0 && currentNormalized.q >= 1.0 && currentNormalized.q <= 3.0 && (
                <g>
                  <circle
                    cx={currentPointX}
                    cy={currentPointY}
                    r="7"
                    fill={currentNormalized.isInsideZoneA ? '#10b981' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <text
                    x={currentPointX}
                    y={currentPointY - 10}
                    fontSize="11"
                    fontWeight="bold"
                    fill={currentNormalized.isInsideZoneA ? '#10b981' : '#ef4444'}
                    textAnchor="middle"
                  >
                    Sala Actual ({currentNormalized.p}, {currentNormalized.q})
                  </text>
                </g>
              )}
            </svg>
          </div>

          <div className="text-xs text-[#86868b] flex justify-between font-mono">
            <span>Dimensiones: {currentNormalized.sortedDims[0].toFixed(2)}m × {currentNormalized.sortedDims[1].toFixed(2)}m × {currentNormalized.sortedDims[2].toFixed(2)}m</span>
            <span>Razón: 1 : {currentNormalized.p} : {currentNormalized.q}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
