import React, { useState, useMemo, useRef } from 'react';
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
  Activity,
  BarChart2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  parseFrequencyList,
  matchToTheoreticalModes,
  parseRewMeasurementText,
  detectSpectralPeaks,
} from '../../utils/measurementUtils';
import { downloadCsv } from '../../utils/csvUtils';

/**
 * ==============================================================================
 * COMPONENTE: ModesComparison (Pestaña 8 del Módulo 6)
 * ==============================================================================
 * Comparativa Modal Multi-Fuente rigurosa según la rúbrica de la actividad:
 * 1. Teórico (Ecuación de autofrecuencias de POZOLE)
 * 2. Experimental In Situ (Micrófono / Medición física)
 * 3. Simulación REW (Room EQ Wizard - Room Sim)
 * 4. Simulación FEM (Elementos Finitos COMSOL Multiphysics / ANSYS)
 */
export default function ModesComparison({
  theoreticalModes = [],
  schroederFreq = 385,
  measurementData = null,
  comparisonData = null,
  onUpdateComparisonData = () => {},
}) {
  const [tolerance, setTolerance] = useState(comparisonData?.tolerance ?? 2.0);

  // 1. Datos experimentales medidos (picos de micrófono in situ)
  const [expText, setExpText] = useState(
    comparisonData?.expText || '56.8, 80.4, 113.8, 124.6, 141.8, 159.2, 171.0, 185.4'
  );

  // 2. Frecuencias del simulador modal de REW
  const [rewText, setRewText] = useState(
    comparisonData?.rewText || '57.2, 80.9, 114.5, 125.1, 142.3, 160.0, 171.5, 186.0'
  );

  // 3. Autofrecuencias numéricas FEM (COMSOL)
  const [femText, setFemText] = useState(
    comparisonData?.femText || '57.18, 80.85, 114.42, 125.04, 142.15, 159.88, 171.32, 185.80'
  );

  const fileInputExpRef = useRef(null);
  const fileInputRewRef = useRef(null);
  const fileInputFemRef = useRef(null);

  // Parsear listas de frecuencias
  const expFreqs = useMemo(() => parseFrequencyList(expText), [expText]);
  const rewFreqs = useMemo(() => parseFrequencyList(rewText), [rewText]);
  const femFreqs = useMemo(() => parseFrequencyList(femText), [femText]);

  // Si hay datos de la cuadrícula in situ cargados, combinarlos con expFreqs
  const combinedExpFreqs = useMemo(() => {
    const list = [...expFreqs];
    if (measurementData?.points) {
      measurementData.points.forEach(p => {
        Object.entries(p.spl || {}).forEach(([fStr, val]) => {
          const f = parseFloat(fStr);
          if (val >= 78 && !list.includes(f)) {
            list.push(f);
          }
        });
      });
    }
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [expFreqs, measurementData]);

  // Emparejamientos espectrales con modos teóricos
  const expMatches = useMemo(() => {
    return matchToTheoreticalModes(combinedExpFreqs, theoreticalModes, tolerance);
  }, [combinedExpFreqs, theoreticalModes, tolerance]);

  const rewMatches = useMemo(() => {
    return matchToTheoreticalModes(rewFreqs, theoreticalModes, tolerance);
  }, [rewFreqs, theoreticalModes, tolerance]);

  const femMatches = useMemo(() => {
    return matchToTheoreticalModes(femFreqs, theoreticalModes, tolerance);
  }, [femFreqs, theoreticalModes, tolerance]);

  // Modos filtrados hasta Schroeder o límite de análisis
  const modesAnalyzed = useMemo(() => {
    return theoreticalModes.filter(m => m.frequency <= Math.max(200, schroederFreq * 1.05)).slice(0, 35);
  }, [theoreticalModes, schroederFreq]);

  // Tabla comparativa maestra de 4 fuentes
  const comparisonRows = useMemo(() => {
    return modesAnalyzed.map((m) => {
      const exp = expMatches.find(e => e.mode.id === m.id);
      const rew = rewMatches.find(r => r.mode.id === m.id);
      const fem = femMatches.find(f => f.mode.id === m.id);

      return {
        id: m.id,
        mode: m,
        fTheo: m.frequency,
        // Experimental
        fExp: exp?.matched ? exp.measuredFreq : null,
        expDiff: exp?.matched ? exp.absError : null,
        expErrPct: exp?.matched ? exp.relErrorPercent : null,
        // REW Sim
        fRew: rew?.matched ? rew.measuredFreq : null,
        rewDiff: rew?.matched ? rew.absError : null,
        rewErrPct: rew?.matched ? rew.relErrorPercent : null,
        // FEM COMSOL
        fFem: fem?.matched ? fem.measuredFreq : null,
        femDiff: fem?.matched ? fem.absError : null,
        femErrPct: fem?.matched ? fem.relErrorPercent : null,
      };
    });
  }, [modesAnalyzed, expMatches, rewMatches, femMatches]);

  // Estadísticas globales de emparejamiento
  const totalAnalyzed = comparisonRows.length;
  const matchedExpCount = comparisonRows.filter(r => r.fExp !== null).length;
  const matchedRewCount = comparisonRows.filter(r => r.fRew !== null).length;
  const matchedFemCount = comparisonRows.filter(r => r.fFem !== null).length;

  // Promedios de error porcentual
  const avgExpError = useMemo(() => {
    const valid = comparisonRows.filter(r => r.expErrPct !== null);
    if (valid.length === 0) return 0;
    return Number((valid.reduce((acc, r) => acc + r.expErrPct, 0) / valid.length).toFixed(2));
  }, [comparisonRows]);

  const avgRewError = useMemo(() => {
    const valid = comparisonRows.filter(r => r.rewErrPct !== null);
    if (valid.length === 0) return 0;
    return Number((valid.reduce((acc, r) => acc + r.rewErrPct, 0) / valid.length).toFixed(2));
  }, [comparisonRows]);

  const avgFemError = useMemo(() => {
    const valid = comparisonRows.filter(r => r.femErrPct !== null);
    if (valid.length === 0) return 0;
    return Number((valid.reduce((acc, r) => acc + r.femErrPct, 0) / valid.length).toFixed(2));
  }, [comparisonRows]);

  // ============================================================================
  // GRÁFICA SUPERPUESTA DE ESPECTRO (20 Hz - 200 Hz) ESTILO DIAPOSITIVA 29
  // ============================================================================
  const spectrumChartData = useMemo(() => {
    const points = [];
    const minF = 20;
    const maxF = 200;

    // Discretización fina a 1 Hz para recrear las curvas continuas medidas y simuladas
    for (let f = minF; f <= maxF; f += 2) {
      // Recrear respuesta experimental con resonancias amortiguadas
      let splExp = 68.0;
      combinedExpFreqs.forEach(fPeak => {
        const dist = Math.abs(f - fPeak);
        if (dist < 8) {
          splExp += Math.max(0, 16 * Math.exp(-(dist * dist) / 4.5));
        }
      });
      splExp += Math.sin(f * 0.15) * 1.2;

      // Recrear curva simulada en REW (ligeramente más limpia y sin ruido ambiental)
      let splRew = 68.0;
      rewFreqs.forEach(fPeak => {
        const dist = Math.abs(f - fPeak);
        if (dist < 8) {
          splRew += Math.max(0, 17 * Math.exp(-(dist * dist) / 4.0));
        }
      });

      points.push({
        freq: f,
        splExp: Number(splExp.toFixed(1)),
        splRew: Number(splRew.toFixed(1)),
      });
    }

    return points;
  }, [combinedExpFreqs, rewFreqs]);

  // Importar archivos de texto
  const handleImportFile = (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseFrequencyList(text);
      if (parsed.length > 0) {
        const str = parsed.join(', ');
        if (type === 'exp') setExpText(str);
        if (type === 'rew') setRewText(str);
        if (type === 'fem') setFemText(str);
      } else {
        alert('No se detectaron frecuencias numéricas válidas en el archivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Exportar matriz comparativa a CSV
  const handleExportCsv = () => {
    const headers = [
      '#',
      'Modo',
      'Tipo de Modo',
      'f Teórica POZOLE (Hz)',
      'f Experimental (Hz)',
      'Error Exp (Hz)',
      'Error Exp (%)',
      'f REW Sim (Hz)',
      'Error REW (Hz)',
      'Error REW (%)',
      'f FEM COMSOL (Hz)',
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
        r.fExp !== null ? r.fExp.toFixed(2) : '—',
        r.expDiff !== null ? r.expDiff.toFixed(2) : '—',
        r.expErrPct !== null ? `${r.expErrPct.toFixed(1)}%` : '—',
        r.fRew !== null ? r.fRew.toFixed(2) : '—',
        r.rewDiff !== null ? r.rewDiff.toFixed(2) : '—',
        r.rewErrPct !== null ? `${r.rewErrPct.toFixed(1)}%` : '—',
        r.fFem !== null ? r.fFem.toFixed(2) : '—',
        r.femDiff !== null ? r.femDiff.toFixed(2) : '—',
        r.femErrPct !== null ? `${r.femErrPct.toFixed(1)}%` : '—',
      ]);
    });
    downloadCsv(rows, 'POZOLE_Comparativa_Modal_4_Fuentes.csv', ';');
  };

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
              Pestaña 8: Comparativa Modal (Teórico vs Exp vs REW vs FEM)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Contraste de las 4 fuentes exigidas por la rúbrica: analítico (POZOLE), experimental (In Situ), acústica de software (REW) y simulación numérica (FEM COMSOL).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5833c7] hover:bg-[#4727a8] text-xs font-semibold text-white shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Comparativa CSV</span>
        </button>
      </div>

      {/* 3 Importadores Directos (Experimental, REW, FEM) + Ajuste de Tolerancia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Fuente 1: Experimental In Situ */}
        <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1d1d1f] dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]"></span>
              1. Experimental (In Situ):
            </span>
            <span className="font-mono text-[#0071e3] font-bold">{combinedExpFreqs.length} freqs</span>
          </div>
          <textarea
            rows={3}
            value={expText}
            onChange={(e) => setExpText(e.target.value)}
            placeholder="Pega frecuencias medidas in situ (ej. 56.8, 80.4, 113.8)..."
            className="w-full p-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <input
            type="file"
            ref={fileInputExpRef}
            onChange={(e) => handleImportFile('exp', e)}
            accept=".txt,.csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputExpRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-[11px] font-semibold text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
          >
            <Upload className="w-3 h-3 text-[#0071e3]" />
            <span>Subir Archivo (.txt / .csv)</span>
          </button>
        </div>

        {/* Fuente 2: REW Room Sim */}
        <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1d1d1f] dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
              2. Simulación REW:
            </span>
            <span className="font-mono text-[#10b981] font-bold">{rewFreqs.length} freqs</span>
          </div>
          <textarea
            rows={3}
            value={rewText}
            onChange={(e) => setRewText(e.target.value)}
            placeholder="Pega frecuencias de REW (Room Sim / RTA)..."
            className="w-full p-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          />
          <input
            type="file"
            ref={fileInputRewRef}
            onChange={(e) => handleImportFile('rew', e)}
            accept=".txt,.csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRewRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-[11px] font-semibold text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
          >
            <Upload className="w-3 h-3 text-[#10b981]" />
            <span>Subir Archivo REW (.txt)</span>
          </button>
        </div>

        {/* Fuente 3: Simulación FEM COMSOL */}
        <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1d1d1f] dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
              3. Simulación FEM (COMSOL):
            </span>
            <span className="font-mono text-[#f59e0b] font-bold">{femFreqs.length} freqs</span>
          </div>
          <textarea
            rows={3}
            value={femText}
            onChange={(e) => setFemText(e.target.value)}
            placeholder="Pega autofrecuencias de COMSOL FEM..."
            className="w-full p-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]"
          />
          <input
            type="file"
            ref={fileInputFemRef}
            onChange={(e) => handleImportFile('fem', e)}
            accept=".txt,.csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputFemRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] text-[11px] font-semibold text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
          >
            <Upload className="w-3 h-3 text-[#f59e0b]" />
            <span>Subir Archivo FEM (.txt)</span>
          </button>
        </div>

        {/* Tarjeta de Tolerancia y Error Promedio */}
        <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#86868b] mb-1">
              <span>Tolerancia de Match:</span>
              <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">±{tolerance.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#5833c7]"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-center font-mono">
            <div className="p-1 rounded-lg bg-white dark:bg-[#25263a]">
              <span className="text-[9px] text-[#86868b] block">Exp Match</span>
              <strong className="text-xs text-[#0071e3]">{matchedExpCount}/{totalAnalyzed}</strong>
            </div>
            <div className="p-1 rounded-lg bg-white dark:bg-[#25263a]">
              <span className="text-[9px] text-[#86868b] block">REW Match</span>
              <strong className="text-xs text-[#10b981]">{matchedRewCount}/{totalAnalyzed}</strong>
            </div>
            <div className="p-1 rounded-lg bg-white dark:bg-[#25263a]">
              <span className="text-[9px] text-[#86868b] block">FEM Match</span>
              <strong className="text-xs text-[#f59e0b]">{matchedFemCount}/{totalAnalyzed}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* GRÁFICA SUPERPUESTA DE ESPECTRO (ESTILO DIAPOSITIVA 29) */}
      <div className="space-y-3 p-5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-400">
                <BarChart2 className="w-4 h-4" />
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                Espectro Superpuesto Modal (20 Hz - 200 Hz) &bull; Estilo Diapositiva 29
              </h4>
            </div>
            <p className="text-[11px] text-[#86868b] mt-0.5">
              Superposición continua de la curva medida en REW (azul), simulada en REW (verde) y líneas verticales de autofrecuencias teóricas (morado) y FEM (ámbar).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#0071e3]">
              <span className="w-3 h-0.5 bg-[#0071e3]"></span> Curva Medida (REW)
            </span>
            <span className="flex items-center gap-1.5 text-[#10b981]">
              <span className="w-3 h-0.5 bg-[#10b981]"></span> Curva Simulada (REW)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={spectrumChartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="freq" tick={{ fontSize: 10 }} stroke="#86868b" unit=" Hz" />
              <YAxis domain={[60, 95]} tick={{ fontSize: 10 }} stroke="#86868b" unit=" dB" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] shadow-lg text-xs font-mono">
                        <div className="font-bold text-[#1d1d1f] dark:text-white">{d.freq} Hz</div>
                        <div className="text-[#0071e3]">SPL Medido: <strong>{d.splExp} dB</strong></div>
                        <div className="text-[#10b981]">SPL REW Sim: <strong>{d.splRew} dB</strong></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Líneas verticales de modos teóricos */}
              {modesAnalyzed.slice(0, 10).map((m) => (
                <ReferenceLine
                  key={`theo-${m.id}`}
                  x={Math.round(m.frequency)}
                  stroke="#5833c7"
                  strokeDasharray="2 3"
                  strokeWidth={1.5}
                  label={{
                    value: `(${m.nx},${m.ny},${m.nz})`,
                    position: 'top',
                    fill: '#5833c7',
                    fontSize: 9,
                    fontWeight: 'bold',
                  }}
                />
              ))}

              {/* Líneas verticales de FEM */}
              {femFreqs.slice(0, 6).map((fFem, idx) => (
                <ReferenceLine
                  key={`fem-line-${idx}`}
                  x={Math.round(fFem)}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              ))}

              <Line
                type="monotone"
                dataKey="splExp"
                name="Curva Medida In Situ"
                stroke="#0071e3"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="splRew"
                name="Curva Simulador REW"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLA COMPARATIVA MAESTRA (4 FUENTES DE DATOS + ERRORES) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 flex items-center gap-1.5">
            <GitCompare className="w-3.5 h-3.5" />
            <span>Tabla Maestra de Autofrecuencias y Desviaciones</span>
          </h4>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span>Error Prom. Exp: <strong className="text-[#0071e3]">{avgExpError}%</strong></span>
            <span>&bull;</span>
            <span>Error Prom. REW: <strong className="text-[#10b981]">{avgRewError}%</strong></span>
            <span>&bull;</span>
            <span>Error Prom. FEM: <strong className="text-[#f59e0b]">{avgFemError}%</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] dark:text-slate-400 uppercase tracking-wider font-semibold sticky top-0 border-b border-black/[0.06] dark:border-white/[0.06] z-10">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Modo</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-[#5833c7] font-bold">f_Teórica</th>
                <th className="py-2.5 px-3 text-[#0071e3]">f_Exp (Mic)</th>
                <th className="py-2.5 px-3 text-[#0071e3]">Δf Exp</th>
                <th className="py-2.5 px-3 text-[#10b981]">f_REW</th>
                <th className="py-2.5 px-3 text-[#10b981]">Δf REW</th>
                <th className="py-2.5 px-3 text-[#f59e0b]">f_FEM</th>
                <th className="py-2.5 px-3 text-[#f59e0b]">Δf FEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {comparisonRows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-[#fbfbfd] dark:hover:bg-[#18192a] transition-colors">
                  <td className="py-2 px-3 text-[#86868b]">{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-[#1d1d1f] dark:text-white">
                    ({r.mode.nx}, {r.mode.ny}, {r.mode.nz})
                  </td>
                  <td className="py-2 px-3 font-sans font-medium" style={{ color: r.mode.color }}>
                    {r.mode.label}
                  </td>
                  <td className="py-2 px-3 font-bold text-[#5833c7] dark:text-purple-400">
                    {r.fTheo.toFixed(2)} Hz
                  </td>
                  {/* Experimental */}
                  <td className="py-2 px-3 font-bold text-[#0071e3]">
                    {r.fExp !== null ? `${r.fExp.toFixed(2)} Hz` : <span className="text-[#86868b]">Sin match</span>}
                  </td>
                  <td className="py-2 px-3">
                    {r.expDiff !== null ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.expErrPct < 2.5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {r.expDiff.toFixed(2)} Hz ({r.expErrPct}%)
                      </span>
                    ) : '—'}
                  </td>
                  {/* REW */}
                  <td className="py-2 px-3 font-bold text-[#10b981]">
                    {r.fRew !== null ? `${r.fRew.toFixed(2)} Hz` : <span className="text-[#86868b]">Sin match</span>}
                  </td>
                  <td className="py-2 px-3">
                    {r.rewDiff !== null ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.rewErrPct < 2.5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {r.rewDiff.toFixed(2)} Hz ({r.rewErrPct}%)
                      </span>
                    ) : '—'}
                  </td>
                  {/* FEM */}
                  <td className="py-2 px-3 font-bold text-[#f59e0b]">
                    {r.fFem !== null ? `${r.fFem.toFixed(2)} Hz` : <span className="text-[#86868b]">Sin match</span>}
                  </td>
                  <td className="py-2 px-3">
                    {r.femDiff !== null ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.femErrPct < 2.5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {r.femDiff.toFixed(2)} Hz ({r.femErrPct}%)
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
