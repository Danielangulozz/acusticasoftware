import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Sliders,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { parseFrequencyList, matchToTheoreticalModes } from '../../utils/measurementUtils';
import { downloadCsv } from '../../utils/csvUtils';

export default function ModesComparison({
  theoreticalModes = [],
  schroederFreq = 385,
  measurementData = null,
}) {
  const [tolerance, setTolerance] = useState(2.0);
  const [rewText, setRewText] = useState('57.2, 80.9, 114.5, 125.1, 142.3, 160.0');
  const [femText, setFemText] = useState('57.3, 57.3, 80.89, 114.45, 125.0, 142.1');

  // Parsear frecuencias pegadas
  const rewFreqs = useMemo(() => parseFrequencyList(rewText), [rewText]);
  const femFreqs = useMemo(() => parseFrequencyList(femText), [femText]);

  // Extraer frecuencias medidas in-situ a partir de picos o valores ingresados
  const measuredFreqs = useMemo(() => {
    if (!measurementData?.points) return [];
    // Recolectar valores de frecuencia de los puntos
    const fSet = new Set();
    measurementData.points.forEach(p => {
      Object.entries(p.spl || {}).forEach(([fStr, val]) => {
        if (val >= 75) fSet.add(parseFloat(fStr)); // umbral de resonancia representativo
      });
    });
    return Array.from(fSet).sort((a, b) => a - b);
  }, [measurementData]);

  // Emparejamientos
  const rewMatches = useMemo(() => {
    return matchToTheoreticalModes(rewFreqs, theoreticalModes, tolerance);
  }, [rewFreqs, theoreticalModes, tolerance]);

  const femMatches = useMemo(() => {
    return matchToTheoreticalModes(femFreqs, theoreticalModes, tolerance);
  }, [femFreqs, theoreticalModes, tolerance]);

  // Modos combinados para la tabla
  const comparisonRows = useMemo(() => {
    return theoreticalModes.slice(0, 50).map((m, idx) => {
      const rew = rewMatches[idx];
      const fem = femMatches[idx];

      return {
        mode: m,
        fTheo: m.frequency,
        fRew: rew?.matched ? rew.measuredFreq : null,
        rewDiff: rew?.matched ? rew.absError : null,
        rewErrPct: rew?.matched ? rew.relErrorPercent : null,
        fFem: fem?.matched ? fem.measuredFreq : null,
        femDiff: fem?.matched ? fem.absError : null,
        femErrPct: fem?.matched ? fem.relErrorPercent : null,
      };
    });
  }, [theoreticalModes, rewMatches, femMatches]);

  // Estadísticas globales
  const totalAnalyzed = comparisonRows.length;
  const matchedRewCount = comparisonRows.filter(r => r.fRew !== null).length;
  const matchedFemCount = comparisonRows.filter(r => r.fFem !== null).length;

  const handleExportCsv = () => {
    const headers = [
      '#',
      'Modo',
      'Tipo',
      'f Teórica (Hz)',
      'f REW (Hz)',
      'Error REW (Hz)',
      'Error REW (%)',
      'f FEM (Hz)',
      'Error FEM (Hz)',
      'Error FEM (%)',
    ];
    const rows = [headers];
    comparisonRows.forEach(r => {
      rows.push([
        r.mode.index,
        `(${r.mode.nx},${r.mode.ny},${r.mode.nz})`,
        r.mode.label,
        r.fTheo.toFixed(2),
        r.fRew !== null ? r.fRew.toFixed(2) : '—',
        r.rewDiff !== null ? r.rewDiff.toFixed(2) : '—',
        r.rewErrPct !== null ? `${r.rewErrPct.toFixed(1)}%` : '—',
        r.fFem !== null ? r.fFem.toFixed(2) : '—',
        r.femDiff !== null ? r.femDiff.toFixed(2) : '—',
        r.femErrPct !== null ? `${r.femErrPct.toFixed(1)}%` : '—',
      ]);
    });
    downloadCsv(rows, 'POZOLE_Comparativa_Modal_Teorico_REW_FEM.csv', ';');
  };

  // Datos para el gráfico de dispersión / alineación
  const scatterTheo = theoreticalModes.slice(0, 40).map(m => ({ x: m.frequency, y: 1, name: `Teórico (${m.nx},${m.ny},${m.nz})` }));
  const scatterRew = rewFreqs.filter(f => f <= schroederFreq * 1.2).map(f => ({ x: f, y: 2, name: `REW ${f} Hz` }));
  const scatterFem = femFreqs.filter(f => f <= schroederFreq * 1.2).map(f => ({ x: f, y: 3, name: `FEM ${f} Hz` }));

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#10b981]/10 dark:bg-[#10b981]/20 text-[#10b981] dark:text-emerald-400">
              <GitCompare className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Comparativa Multi-Fuente: Teórico vs REW vs FEM (COMSOL)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Validación experimental cruzada con tolerancia de emparejamiento espectral ajustable (±{tolerance} Hz).
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] hover:bg-[#e8e8ed] dark:hover:bg-[#25263a] text-xs font-semibold text-[#1d1d1f] dark:text-white border border-black/[0.05] dark:border-white/[0.08] transition-all"
        >
          <Download className="w-4 h-4 text-[#10b981]" />
          <span>Exportar Comparativa CSV</span>
        </button>
      </div>

      {/* Inputs para pegar listas de frecuencias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Input REW */}
        <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1d1d1f] dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
              Medición Experimental (REW / RTA):
            </span>
            <span className="font-mono text-[#10b981]">{rewFreqs.length} detectados</span>
          </div>
          <textarea
            rows={3}
            value={rewText}
            onChange={(e) => setRewText(e.target.value)}
            placeholder="Pega frecuencias (ej. 57.2, 80.9, 114.5)..."
            className="w-full p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          />
        </div>

        {/* Input FEM */}
        <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1d1d1f] dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
              Simulación FEM (COMSOL / Ansys):
            </span>
            <span className="font-mono text-[#f59e0b]">{femFreqs.length} detectados</span>
          </div>
          <textarea
            rows={3}
            value={femText}
            onChange={(e) => setFemText(e.target.value)}
            placeholder="Pega autofrecuencias FEM (tolera comentarios % o líneas)..."
            className="w-full p-2.5 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]"
          />
        </div>

        {/* Ajustes de Tolerancia y KPIs */}
        <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#86868b] mb-1">
              <span>Tolerancia de Emparejamiento:</span>
              <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">±{tolerance.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#10b981]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-xs">
            <div className="bg-white dark:bg-[#25263a] p-2 rounded-xl text-center">
              <div className="text-[10px] text-[#86868b]">Match REW</div>
              <div className="text-base font-bold text-[#10b981] font-mono">
                {matchedRewCount}/{totalAnalyzed}
              </div>
            </div>
            <div className="bg-white dark:bg-[#25263a] p-2 rounded-xl text-center">
              <div className="text-[10px] text-[#86868b]">Match FEM</div>
              <div className="text-base font-bold text-[#f59e0b] font-mono">
                {matchedFemCount}/{totalAnalyzed}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Gráfica de Alineación Espectral (Scatter Chart) */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-[#86868b] dark:text-slate-400">
          Alineación Espectral Cruzada (Eje Horizontal: Frecuencia Hz)
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                type="number"
                dataKey="x"
                name="Frecuencia"
                unit=" Hz"
                tick={{ fontSize: 10, fill: '#86868b', fontFamily: 'monospace' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                ticks={[1, 2, 3]}
                tickFormatter={(val) => (val === 1 ? 'Teórico' : val === 2 ? 'REW' : 'FEM')}
                tick={{ fontSize: 11, fill: '#86868b', fontWeight: 'bold' }}
                domain={[0.5, 3.5]}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Teórico" data={scatterTheo} fill="#5833c7" shape="diamond" />
              <Scatter name="REW Exp." data={scatterRew} fill="#10b981" shape="circle" />
              <Scatter name="FEM" data={scatterFem} fill="#f59e0b" shape="triangle" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla Detallada de Comparación y Errores */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400">
          Tabla de Modos, Valores Contrastados y Porcentajes de Discrepancia
        </h4>

        <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] dark:text-slate-400 uppercase tracking-wider font-semibold sticky top-0 border-b border-black/[0.06] dark:border-white/[0.06]">
              <tr>
                <th className="py-2.5 px-3 text-center">#</th>
                <th className="py-2.5 px-3">Modo</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 font-bold text-[#5833c7]">f Teórica</th>
                <th className="py-2.5 px-3 text-center text-[#10b981]">f REW</th>
                <th className="py-2.5 px-3 text-center">Error REW</th>
                <th className="py-2.5 px-3 text-center text-[#f59e0b]">f FEM</th>
                <th className="py-2.5 px-3 text-center">Error FEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {comparisonRows.map((r) => (
                <tr key={r.mode.id} className="hover:bg-[#fbfbfd] dark:hover:bg-[#18192a] transition-colors">
                  <td className="py-2 px-3 text-center text-[#86868b]">{r.mode.index}</td>
                  <td className="py-2 px-3 font-bold text-[#1d1d1f] dark:text-white">
                    ({r.mode.nx}, {r.mode.ny}, {r.mode.nz})
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <span className="text-[11px] font-semibold" style={{ color: r.mode.color }}>
                      {r.mode.label}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-[#5833c7]">
                    {r.fTheo.toFixed(2)} Hz
                  </td>
                  
                  {/* REW */}
                  <td className="py-2 px-3 text-center font-bold text-[#10b981]">
                    {r.fRew !== null ? `${r.fRew.toFixed(2)} Hz` : <span className="text-gray-300 dark:text-gray-600 font-sans">—</span>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {r.rewDiff !== null ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.rewDiff < 0.5 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                      }`}>
                        Δ={r.rewDiff.toFixed(2)}Hz ({r.rewErrPct.toFixed(1)}%)
                      </span>
                    ) : '—'}
                  </td>

                  {/* FEM */}
                  <td className="py-2 px-3 text-center font-bold text-[#f59e0b]">
                    {r.fFem !== null ? `${r.fFem.toFixed(2)} Hz` : <span className="text-gray-300 dark:text-gray-600 font-sans">—</span>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {r.femDiff !== null ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.femDiff < 0.5 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                      }`}>
                        Δ={r.femDiff.toFixed(2)}Hz ({r.femErrPct.toFixed(1)}%)
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
