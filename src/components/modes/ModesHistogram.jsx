import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BarChart3, Layers, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { countModesByBand } from '../../utils/modalCalculations';
import { downloadCsv } from '../../utils/csvUtils';

/**
 * Histograma de Modos Propios por Bandas de 1/3 de Octava (ISO 266)
 * Incluye línea de referencia de Schroeder y tabla detallada Frecuencia / Repeticiones / Total.
 */
export default function ModesHistogram({
  modes = [],
  schroederFreq = 385,
  fMax = 500,
}) {
  const [onlyActiveBands, setOnlyActiveBands] = useState(true);

  // Conteo de modos agrupados por banda de 1/3 de octava
  const bandData = useMemo(() => {
    const rawBands = countModesByBand(modes, Math.max(fMax, schroederFreq * 1.2));
    if (onlyActiveBands) {
      return rawBands.filter(b => b.count > 0 || b.fc <= schroederFreq);
    }
    return rawBands;
  }, [modes, schroederFreq, fMax, onlyActiveBands]);

  const handleExportCsv = () => {
    const headers = [
      'Banda fc (Hz)',
      'f_inferior (Hz)',
      'f_superior (Hz)',
      'Modos Axiales',
      'Modos Tangenciales',
      'Modos Oblicuos',
      'Total en Banda',
      'Acumulado N(f)'
    ];
    const rows = [headers];
    bandData.forEach(b => {
      rows.push([
        b.fc,
        b.fLow.toFixed(2),
        b.fHigh.toFixed(2),
        b.axialCount,
        b.tangentialCount,
        b.obliqueCount,
        b.count,
        b.cumulativeCount
      ]);
    });
    downloadCsv(rows, `POZOLE_Histograma_Modos_1-3_Octava.csv`, ';');
  };

  // Custom Tooltip para Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-black/[0.08] dark:border-white/[0.08] text-xs">
          <div className="font-bold text-[#1d1d1f] dark:text-white border-b border-black/[0.06] dark:border-white/[0.06] pb-1.5 mb-2 flex items-center justify-between gap-4">
            <span className="text-sm font-mono">{label} Hz (1/3 oct)</span>
            <span className="text-[10px] text-[#86868b] font-mono">
              [{data.fLow.toFixed(1)} - {data.fHigh.toFixed(1)} Hz]
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#5833c7] dark:text-purple-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#5833c7]"></span>
                Axiales:
              </span>
              <span className="font-bold font-mono text-[#1d1d1f] dark:text-white">{data.axialCount}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#10b981] dark:text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span>
                Tangenciales:
              </span>
              <span className="font-bold font-mono text-[#1d1d1f] dark:text-white">{data.tangentialCount}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#f59e0b] dark:text-amber-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></span>
                Oblicuos:
              </span>
              <span className="font-bold font-mono text-[#1d1d1f] dark:text-white">{data.obliqueCount}</span>
            </div>
            <div className="pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between font-bold">
              <span className="text-[#1d1d1f] dark:text-white">Total Banda:</span>
              <span className="font-mono text-base text-[#0071e3] dark:text-sky-400">{data.count}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#86868b]">
              <span>Acumulados hasta banda:</span>
              <span className="font-mono">{data.cumulativeCount}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Histograma de Modos por Bandas de 1/3 de Octava
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Distribución modal normalizada ISO 266 con segregación por tipo de onda y corte de Schroeder (fs = {schroederFreq} Hz).
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-[#86868b] dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyActiveBands}
              onChange={(e) => setOnlyActiveBands(e.target.checked)}
              className="rounded border-gray-400 text-[#0071e3] focus:ring-[#0071e3]"
            />
            <span>Ocultar bandas vacías</span>
          </label>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] hover:bg-[#e8e8ed] dark:hover:bg-[#25263a] text-xs font-semibold text-[#1d1d1f] dark:text-white border border-black/[0.05] dark:border-white/[0.08] transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Gráfica Recharts */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bandData}
            margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
            <XAxis
              dataKey="fc"
              tick={{ fontSize: 11, fill: '#86868b', fontFamily: 'monospace' }}
              tickLine={false}
              unit="Hz"
              angle={-35}
              textAnchor="end"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#86868b', fontFamily: 'monospace' }}
              tickLine={false}
              allowDecimals={false}
              label={{ value: 'Nº de Modos', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#86868b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            <ReferenceLine
              x={bandData.find(b => b.fLow <= schroederFreq && b.fHigh > schroederFreq)?.fc || schroederFreq}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `fs ≈ ${schroederFreq} Hz`,
                position: 'top',
                fill: '#ef4444',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />
            <Bar dataKey="axialCount" name="Axial" stackId="a" fill="#5833c7" radius={[0, 0, 0, 0]} />
            <Bar dataKey="tangentialCount" name="Tangencial" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="obliqueCount" name="Oblicuo" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla Sincronizada de Frecuencias y Repeticiones */}
      <div className="pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Tabla de Frecuencias, Repeticiones y Acumulado</span>
        </h4>
        <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] dark:text-slate-400 uppercase tracking-wider font-semibold sticky top-0 border-b border-black/[0.06] dark:border-white/[0.06]">
              <tr>
                <th className="py-2.5 px-3">Banda fc (Hz)</th>
                <th className="py-2.5 px-3">Intervalo [fLow - fHigh]</th>
                <th className="py-2.5 px-3 text-center text-[#5833c7]">Axiales</th>
                <th className="py-2.5 px-3 text-center text-[#10b981]">Tangenciales</th>
                <th className="py-2.5 px-3 text-center text-[#f59e0b]">Oblicuos</th>
                <th className="py-2.5 px-3 text-center font-bold text-[#1d1d1f] dark:text-white">Total Banda</th>
                <th className="py-2.5 px-3 text-center text-[#0071e3]">Acumulado N(f)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {bandData.map((b) => {
                const isUnderSchroeder = b.fc <= schroederFreq;
                return (
                  <tr
                    key={b.fc}
                    className={`hover:bg-[#fbfbfd] dark:hover:bg-[#18192a] transition-colors ${
                      b.count > 0 ? '' : 'opacity-40'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-[#1d1d1f] dark:text-white">
                      {b.fc} Hz {b.fc === schroederFreq && '⭐'}
                    </td>
                    <td className="py-2 px-3 text-[#86868b] text-[11px]">
                      {b.fLow.toFixed(1)} – {b.fHigh.toFixed(1)} Hz
                    </td>
                    <td className="py-2 px-3 text-center font-semibold text-[#5833c7]">
                      {b.axialCount || '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold text-[#10b981]">
                      {b.tangentialCount || '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold text-[#f59e0b]">
                      {b.obliqueCount || '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-[#1d1d1f] dark:text-white">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        b.count > 0 ? 'bg-black/[0.05] dark:bg-white/[0.08]' : ''
                      }`}>
                        {b.count}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-[#0071e3] dark:text-sky-400">
                      {b.cumulativeCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
