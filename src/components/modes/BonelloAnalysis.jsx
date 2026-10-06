import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Layers,
} from 'lucide-react';

/**
 * Análisis Riguroso y Visualización del Criterio de Bonello (1981)
 */
export default function BonelloAnalysis({
  bonelloResult = {
    complies: false,
    evaluatedBands: [],
    violations: [],
    degenerateGroups: [],
    fs: 385,
  },
  schroederFreq = 385,
  tolerance = 0.5,
  onChangeTolerance = () => {},
}) {
  const { complies, evaluatedBands = [], violations = [], degenerateGroups = [] } = bonelloResult;

  // Custom Tooltip para el diagrama de Bonello
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-black/[0.08] dark:border-white/[0.08] text-xs">
          <div className="font-bold text-[#1d1d1f] dark:text-white border-b border-black/[0.06] dark:border-white/[0.06] pb-1.5 mb-2 flex items-center justify-between gap-4">
            <span className="font-mono text-sm">{data.fc} Hz</span>
            {data.complies ? (
              <span className="text-[#10b981] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> CUMPLE
              </span>
            ) : (
              <span className="text-[#ef4444] font-bold flex items-center gap-1">
                <XCircle className="w-3 h-3" /> FALLA
              </span>
            )}
          </div>
          <div className="space-y-1 font-mono">
            <div className="flex justify-between gap-4 text-[#1d1d1f] dark:text-white">
              <span>Nº de Modos:</span>
              <span className="font-bold text-base">{data.count}</span>
            </div>
            {data.degenerates?.length > 0 && (
              <div className="text-[#f59e0b] flex justify-between gap-4">
                <span>Coincidencias modales:</span>
                <span className="font-bold">{data.degenerates.length} grupos</span>
              </div>
            )}
            {data.failures?.length > 0 && (
              <div className="mt-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1">
                {data.failures.map((f, i) => (
                  <div key={i} className="text-[#ef4444] font-sans text-[11px] leading-tight">
                    &bull; {f.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Tarjeta de Veredicto Principal */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${
        complies
          ? 'bg-gradient-to-br from-[#10b981]/10 via-[#10b981]/5 to-transparent border-[#10b981]/30 dark:border-[#10b981]/40'
          : 'bg-gradient-to-br from-[#ef4444]/10 via-[#ef4444]/5 to-transparent border-[#ef4444]/30 dark:border-[#ef4444]/40'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${
              complies ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/25' : 'bg-[#ef4444] text-white shadow-lg shadow-[#ef4444]/25'
            }`}>
              {complies ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-[#86868b] dark:text-slate-400">
                Evaluación Criterio de Bonello (ISO / Acústica Modal)
              </div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 ${
                complies ? 'text-[#10b981]' : 'text-[#ef4444]'
              }`}>
                {complies ? 'CUMPLE CON EL CRITERIO DE BONELLO' : 'NO CUMPLE CON EL CRITERIO DE BONELLO'}
              </h2>
              <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1 max-w-2xl">
                {complies
                  ? `La distribución de modos en bandas de 1/3 de octava es monótona no decreciente y no existen modos degenerados no permitidos hasta la frecuencia de Schroeder (${schroederFreq} Hz).`
                  : `Se identificaron ${violations.length} infracciones a las reglas modales. Esto provocará coloración tímbrica, frecuencias infladas o caídas acentuadas en la respuesta de graves.`}
              </p>
            </div>
          </div>

          {/* Selector de Tolerancia */}
          <div className="bg-white/80 dark:bg-[#18192a]/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shrink-0 self-stretch sm:self-auto">
            <div className="flex items-center justify-between gap-3 text-xs text-[#86868b] dark:text-slate-400 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#5833c7]" />
                Tolerancia Coincidencia:
              </span>
              <span className="font-mono text-[#1d1d1f] dark:text-white font-bold">{tolerance.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={tolerance}
              onChange={(e) => onChangeTolerance(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#5833c7]"
            />
            <div className="flex justify-between text-[10px] text-[#86868b] mt-1 font-mono">
              <span>0.10 Hz</span>
              <span>1.00 Hz</span>
              <span>2.00 Hz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica de Escalera de Bonello */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>
            <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white">
              Diagrama Escalonado de Bonello (Modos por Banda de 1/3 de Octava)
            </h3>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              Las barras deben ser siempre crecientes o iguales a la anterior. Las barras en <span className="text-[#ef4444] font-bold">ROJO</span> indican violación del criterio.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[#1d1d1f] dark:text-slate-300 font-medium">
              <span className="w-3 h-3 rounded bg-[#5833c7]"></span>
              Banda Conforme
            </span>
            <span className="flex items-center gap-1.5 text-[#ef4444] font-medium">
              <span className="w-3 h-3 rounded bg-[#ef4444]"></span>
              Infracción (Falla)
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={evaluatedBands}
              margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis
                dataKey="fc"
                tick={{ fontSize: 11, fill: '#86868b', fontFamily: 'monospace' }}
                unit="Hz"
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#86868b', fontFamily: 'monospace' }}
                allowDecimals={false}
                label={{ value: 'Nº de Modos', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#86868b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={evaluatedBands.find(b => b.fLow <= schroederFreq && b.fHigh > schroederFreq)?.fc || schroederFreq}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: `fs = ${schroederFreq} Hz`, position: 'top', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {evaluatedBands.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.complies ? '#5833c7' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detalle de Infracciones y Modos Degenerados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lista de Infracciones detectadas */}
        <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-3">
          <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
            <span>Detalle de Infracciones al Criterio ({violations.length})</span>
          </h4>

          {violations.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#10b981]/5 border border-[#10b981]/20 text-center text-xs text-[#10b981] font-medium">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2" />
              ¡Excelente! No se encontró ninguna violación de monotonía ni degeneraciones prohibidas.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {violations.map((v, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-[#ef4444]/5 dark:bg-[#ef4444]/10 border border-[#ef4444]/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#ef4444] font-mono">Banda {v.fc} Hz</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ef4444] text-white">
                      Regla {v.rule} ({v.type === 'monotonicity' ? 'Monotonía' : 'Coincidencia'})
                    </span>
                  </div>
                  <p className="text-[#1d1d1f] dark:text-slate-300 font-medium">
                    {v.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grupos de Modos Degenerados (Misma frecuencia) */}
        <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-3">
          <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f59e0b]" />
            <span>Grupos de Modos Degenerados ({degenerateGroups.length})</span>
          </h4>

          {degenerateGroups.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] text-center text-xs text-[#86868b]">
              No existen modos con frecuencias idénticas dentro de la tolerancia de ±{tolerance} Hz.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {degenerateGroups.map((g, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] text-xs flex items-center justify-between font-mono"
                >
                  <div>
                    <span className="font-bold text-[#0071e3] dark:text-sky-400">
                      ~{g.frequency.toFixed(1)} Hz
                    </span>
                    <div className="text-[11px] text-[#86868b] mt-0.5 font-sans">
                      {g.modes.map(m => `(${m.nx},${m.ny},${m.nz}) [${m.label}]`).join(' • ')}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-[#f59e0b]/20 text-[#f59e0b] font-bold text-xs shrink-0">
                    ×{g.multiplicity} modos
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Explicación Teórica */}
      <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] text-xs leading-relaxed text-[#86868b] dark:text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#5833c7] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#1d1d1f] dark:text-white">Fundamento del Criterio de Bonello (1981):</strong> Se considera el estándar de diseño acústico en bajas frecuencias para recintos críticos de grabación y escucha. Establece que (1) el número de modos propios dentro de cada tercio de octava debe aumentar de forma estrictamente monótona conforme sube la frecuencia, y (2) dos modos normales pueden compartir la misma frecuencia modal (degeneración) sólo si en dicha banda existen más de 5 modos simultáneos para enmascarar la resonancia.
        </div>
      </div>
    </div>
  );
}
