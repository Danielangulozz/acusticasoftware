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
  Compass,
} from 'lucide-react';
import {
  boltDimensionsFromVolume,
  normalizeDimensionsToBolt,
  detectSimpleRatios,
  BOLT_ZONE_A_CONTOUR,
  BOLT_PRESETS,
} from '../../utils/proportions';
import ChartExportMenu from '../common/ChartExportMenu';

export default function BoltProportions({
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
  volume = 180,
  onApplyProportions = () => {},
}) {
  const { Lx = 10, Ly = 6, Lz = 3 } = dimensions;

  const [targetVolume, setTargetVolume] = useState(volume > 0 ? Number(volume.toFixed(1)) : 100);
  const [selectedPresetKey, setSelectedPresetKey] = useState('small');
  const [appliedFeedback, setAppliedFeedback] = useState(false);

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

  // Coordenadas y Auto-escalado dinámico SVG para el diagrama p-q de Bolt
  // Se auto-escala dinámicamente si (p, q) de la sala supera los límites canónicos (2.0 en p, 3.0 en q)
  const svgWidth = 460;
  const svgHeight = 310;
  const margin = { top: 30, right: 35, bottom: 45, left: 50 };

  const plotW = svgWidth - margin.left - margin.right;
  const plotH = svgHeight - margin.top - margin.bottom;

  const currentP = Number(currentNormalized.p);
  const currentQ = Number(currentNormalized.q);

  // Auto-escalado dinámico de los ejes para que la sala actual SIEMPRE sea visible
  const maxP = useMemo(() => {
    return Math.max(2.1, Math.ceil((currentP + 0.25) * 5) / 5);
  }, [currentP]);

  const maxQ = useMemo(() => {
    return Math.max(3.2, Math.ceil((currentQ + 0.4) * 2) / 2);
  }, [currentQ]);

  const minP = 1.0;
  const minQ = 1.0;

  const scaleP = (p) => margin.left + ((p - minP) / (maxP - minP)) * plotW;
  const scaleQ = (q) => margin.top + plotH - ((q - minQ) / (maxQ - minQ)) * plotH;

  // Generación de marcas dinámicas para los ejes
  const pTicks = useMemo(() => {
    const ticks = [];
    const step = maxP > 3.0 ? 0.5 : 0.2;
    for (let p = 1.0; p <= maxP + 0.01; p += step) {
      ticks.push(Number(p.toFixed(1)));
    }
    return ticks;
  }, [maxP]);

  const qTicks = useMemo(() => {
    const ticks = [];
    const step = maxQ > 4.5 ? 1.0 : 0.5;
    for (let q = 1.0; q <= maxQ + 0.01; q += step) {
      ticks.push(Number(q.toFixed(1)));
    }
    return ticks;
  }, [maxQ]);

  // Ruta del contorno de la Zona A de Bolt
  const zoneAPath = useMemo(() => {
    return BOLT_ZONE_A_CONTOUR.map((pt, idx) => {
      const x = scaleP(pt.p);
      const y = scaleQ(pt.q);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, [plotW, plotH, maxP, maxQ]);

  // Posición del punto de la sala actual garantizado dentro del canvas
  const currentPointX = scaleP(currentP);
  const currentPointY = scaleQ(currentQ);

  // Puntos de referencia canónicos (Bolt Sala Pequeña y Sala Grande)
  const boltSmallPoint = { x: scaleP(1.404), y: scaleQ(1.863) };
  const boltLargePoint = { x: scaleP(1.202), y: scaleQ(1.435) };

  const handleApply = () => {
    onApplyProportions({ Lx: suggested.L, Ly: suggested.W, Lz: suggested.H });
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 3000);
  };

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
              type="button"
              onClick={handleApply}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all ${
                appliedFeedback
                  ? 'bg-[#10b981] text-white shadow-[#10b981]/25 scale-[0.99]'
                  : 'bg-[#5833c7] hover:bg-[#4727a8] text-white shadow-[#5833c7]/20 active:scale-95'
              }`}
            >
              {appliedFeedback ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Dimensiones aplicadas al modelo 3D y Módulo 1!</span>
                </>
              ) : (
                <>
                  <span>Aplicar Estas Proporciones a la Sala</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
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

        {/* Columna 2: Diagrama p-q de Bolt (SVG con Auto-escalado Dinámico) */}
        <div id="bolt-proportions-diagram" className="space-y-3 p-5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                Diagrama de Área Aceptable (Bolt Zone A)
              </h4>
              <p className="text-[11px] text-[#86868b]">
                Eje X: p = W/H &bull; Eje Y: q = L/H (normalizado con H = 1.0)
              </p>
            </div>
            <div className="flex items-center gap-2">
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

              <ChartExportMenu
                targetId="bolt-proportions-diagram"
                filename="proporciones_bolt_pozole"
                title="Diagrama de Proporciones Bolt (Zona A)"
                headers={['Parámetro', 'Valor Sala Actual', 'Relación Normalizada', 'Sugerido Preset']}
                rows={[
                  ['Longitud (L)', `${Lx.toFixed(2)} m`, `q = ${currentNormalized.q}`, `${suggested.L.toFixed(2)} m`],
                  ['Anchura (W)', `${Ly.toFixed(2)} m`, `p = ${currentNormalized.p}`, `${suggested.W.toFixed(2)} m`],
                  ['Altura (H)', `${Lz.toFixed(2)} m`, '1.00', `${suggested.H.toFixed(2)} m`],
                  ['Volumen (V)', `${(Lx * Ly * Lz).toFixed(2)} m³`, '-', `${targetVolume.toFixed(2)} m³`],
                  ['Estado Zona A Bolt', currentNormalized.isInsideZoneA ? 'DENTRO' : 'FUERA', '-', 'DENTRO (Óptimo)'],
                ]}
                showLabels={false}
              />
            </div>
          </div>

          {/* Gráfico SVG del Plano p-q */}
          <div className="relative w-full aspect-[4/3] bg-white dark:bg-[#121322] rounded-xl border border-black/[0.06] dark:border-white/[0.06] p-2 flex items-center justify-center overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full select-none"
            >
              {/* Ejes y Cuadrícula */}
              <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke="#888888" strokeWidth="1" opacity="0.3" />
              <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke="#888888" strokeWidth="1" opacity="0.3" />

              {/* Ticks y etiquetas dinámicas en P */}
              {pTicks.map(p => {
                const x = scaleP(p);
                return (
                  <g key={`p-${p}`}>
                    <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#888888" strokeDasharray="2 3" opacity="0.12" />
                    <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 5} stroke="#888888" opacity="0.5" />
                    <text x={x} y={margin.top + plotH + 16} fontSize="10" fill="#86868b" textAnchor="middle" fontFamily="monospace">
                      {p.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Ticks y etiquetas dinámicas en Q */}
              {qTicks.map(q => {
                const y = scaleQ(q);
                return (
                  <g key={`q-${q}`}>
                    <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#888888" strokeDasharray="2 3" opacity="0.12" />
                    <line x1={margin.left - 5} y1={y} x2={margin.left} y2={y} stroke="#888888" opacity="0.5" />
                    <text x={margin.left - 8} y={y + 3} fontSize="10" fill="#86868b" textAnchor="end" fontFamily="monospace">
                      {q.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Etiquetas de ejes */}
              <text x={margin.left + plotW / 2} y={margin.top + plotH + 34} fontSize="11" fontWeight="bold" fill="#86868b" textAnchor="middle">
                Razón p = Ancho / Altura (W / H)
              </text>
              <text
                x={margin.left - 30}
                y={margin.top + plotH / 2}
                fontSize="11"
                fontWeight="bold"
                fill="#86868b"
                textAnchor="middle"
                transform={`rotate(-90, ${margin.left - 30}, ${margin.top + plotH / 2})`}
              >
                Razón q = Largo / Altura (L / H)
              </text>

              {/* Polígono de la Zona A de Bolt */}
              <path
                d={zoneAPath}
                fill="rgba(88, 51, 199, 0.18)"
                stroke="#5833c7"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <text
                x={scaleP(1.40)}
                y={scaleQ(1.80)}
                fill="#5833c7"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                Zona A de Bolt
              </text>

              {/* Puntos de Referencia Canónicos */}
              <g opacity="0.8">
                <circle cx={boltSmallPoint.x} cy={boltSmallPoint.y} r="4" fill="#0071e3" stroke="#fff" strokeWidth="1" />
                <text x={boltSmallPoint.x + 6} y={boltSmallPoint.y + 3} fontSize="8" fill="#0071e3" fontWeight="bold">
                  Sala Pequeña (1.40, 1.86)
                </text>

                <circle cx={boltLargePoint.x} cy={boltLargePoint.y} r="4" fill="#10b981" stroke="#fff" strokeWidth="1" />
                <text x={boltLargePoint.x + 6} y={boltLargePoint.y + 3} fontSize="8" fill="#10b981" fontWeight="bold">
                  Sala Grande (1.20, 1.44)
                </text>
              </g>

              {/* Punto de la sala actual (SIEMPRE VISIBLE gracias al auto-escalado) */}
              <g>
                <circle
                  cx={currentPointX}
                  cy={currentPointY}
                  r="14"
                  fill="none"
                  stroke={currentNormalized.isInsideZoneA ? '#10b981' : '#ef4444'}
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  className="animate-ping"
                />
                <circle
                  cx={currentPointX}
                  cy={currentPointY}
                  r="7.5"
                  fill={currentNormalized.isInsideZoneA ? '#10b981' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />

                {/* Etiqueta inteligente que evita desbordar los bordes */}
                <text
                  x={currentPointX > margin.left + plotW - 90 ? currentPointX - 12 : currentPointX + 12}
                  y={currentPointY < margin.top + 20 ? currentPointY + 16 : currentPointY - 10}
                  fontSize="10"
                  fontWeight="bold"
                  fill={currentNormalized.isInsideZoneA ? '#10b981' : '#ef4444'}
                  textAnchor={currentPointX > margin.left + plotW - 90 ? 'end' : 'start'}
                >
                  Sala Actual (p={currentP.toFixed(2)}, q={currentQ.toFixed(2)})
                </text>
              </g>
            </svg>
          </div>

          <div className="text-xs text-[#86868b] flex flex-wrap justify-between font-mono gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
            <span>Dimensiones: {currentNormalized.sortedDims[0].toFixed(2)}m × {currentNormalized.sortedDims[1].toFixed(2)}m × {currentNormalized.sortedDims[2].toFixed(2)}m</span>
            <span>Razón: 1 : {currentP.toFixed(2)} : {currentQ.toFixed(2)}</span>
          </div>

          {!currentNormalized.isInsideZoneA && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
              ⚠️ <strong>Fuera de Zona A de Bolt:</strong> La relación de aspecto actual ({currentP.toFixed(2)}, {currentQ.toFixed(2)}) favorece la formación de modos tangenciales agrupados. Considera aplicar las proporciones de Bolt recomendadas (ej. {suggested.name}: 1 : {suggested.ratios.w} : {suggested.ratios.l}).
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
