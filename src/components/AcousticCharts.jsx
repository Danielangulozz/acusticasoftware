import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  BarChart,
  Bar,
} from 'recharts';
import { LineChart as LineChartIcon, Activity, Layers, Target, Info } from 'lucide-react';
import { OCTAVE_BANDS, ROOM_SURFACES, generateDistanceCurveData } from '../utils/acousticCalculations';

/**
 * Componente de Gráficas Acústicas Interactivas
 * Estilo Minimalista Apple / Tesla
 */
export default function AcousticCharts({
  reverberationData,
  absorptionData,
  soundFieldData,
  sourceReceiver,
  maxRoomDimension,
  optimumRT,
  selectedBand,
  setSelectedBand,
}) {
  const [activeChartTab, setActiveChartTab] = useState('rt_vs_freq'); // 'rt_vs_freq', 'lp_vs_dist', 'abs_breakdown'

  // Datos Gráfico 1: RT vs Frecuencia
  const rtChartData = OCTAVE_BANDS.map((freq) => {
    const rt = reverberationData[freq] || {};
    return {
      frequency: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
      freqNum: freq,
      Sabine: Number((rt.sabine || 0).toFixed(2)),
      Eyring: Number((rt.eyring || 0).toFixed(2)),
      Millington: Number((rt.millington || 0).toFixed(2)),
      Optimo: Number((optimumRT.optimal || 0).toFixed(2)),
      MinOpt: Number((optimumRT.min || 0).toFixed(2)),
      MaxOpt: Number((optimumRT.max || 0).toFixed(2)),
    };
  });

  // Datos Gráfico 2: Lp vs Distancia
  const currentSf = soundFieldData[selectedBand] || soundFieldData[1000] || {};
  const currentR = currentSf.roomConstant || 10;
  const currentLw = sourceReceiver.lw || 90;
  const currentQ = sourceReceiver.directivity || 1;

  const { curveData, criticalDistance, revLevel } = generateDistanceCurveData(
    currentLw,
    currentQ,
    currentR,
    Math.max(15, maxRoomDimension || 25),
    0.0015,
    50
  );

  // Datos Gráfico 3: Aporte por Superficie
  const absBreakdownData = OCTAVE_BANDS.map((freq) => {
    const abs = absorptionData[freq] || {};
    const bySurface = abs.absorptionBySurface || {};
    return {
      frequency: freq >= 1000 ? `${freq / 1000}k Hz` : `${freq} Hz`,
      Piso: Number((bySurface.floor || 0).toFixed(2)),
      Techo: Number((bySurface.ceiling || 0).toFixed(2)),
      Pared_Norte: Number((bySurface.wallNorth || 0).toFixed(2)),
      Pared_Sur: Number((bySurface.wallSouth || 0).toFixed(2)),
      Pared_Este: Number((bySurface.wallEast || 0).toFixed(2)),
      Pared_Oeste: Number((bySurface.wallWest || 0).toFixed(2)),
      Total: Number((abs.equivalentAbsorption || 0).toFixed(2)),
    };
  });

  // Tooltip Estilo Apple para RT
  const CustomRTTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-black/[0.08] shadow-apple-lg text-xs font-mono text-[#1d1d1f]">
          <div className="font-bold text-sm text-[#1d1d1f] mb-1.5 border-b border-black/[0.06] pb-1">
            Banda: {label} Hz
          </div>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center gap-4 my-1">
              <span style={{ color: entry.color }} className="font-semibold">
                {entry.name}:
              </span>
              <span className="font-bold">{entry.value} s</span>
            </div>
          ))}
          <div className="mt-2 pt-1.5 border-t border-black/[0.06] text-[10px] text-[#86868b]">
            Rango Óptimo: {optimumRT.min}s - {optimumRT.max}s
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip Estilo Apple para Distancia
  const CustomDistanceTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-black/[0.08] shadow-apple-lg text-xs font-mono text-[#1d1d1f]">
          <div className="font-bold text-sm text-[#1d1d1f] mb-1.5 border-b border-black/[0.06] pb-1">
            Distancia: {data.distance} m
          </div>
          <div className="flex justify-between items-center gap-4 text-[#ff9500]">
            <span>Lp Total:</span>
            <span className="font-bold">{data.lpTotal} dB</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-[#0071e3]">
            <span>Lp Directo (If):</span>
            <span className="font-bold">{data.lpDirect} dB</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-[#34c759]">
            <span>Lp Reverb (Ir):</span>
            <span className="font-bold">{data.lpReverberant} dB</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-[#86868b] mt-1.5 pt-1.5 border-t border-black/[0.06]">
            <span>Relación DRR:</span>
            <span className="font-bold text-[#1d1d1f]">{data.drr} dB</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 shadow-apple-sm transition-all">
      
      {/* Encabezado con Pestañas de Gráficas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
            <LineChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              5. Visualización Gráfica Interactiva
            </h2>
            <p className="text-xs text-[#86868b]">
              Curvas de decaimiento temporal (RT₆₀), propagación espacial (Lp vs r) y absorción
            </p>
          </div>
        </div>

        {/* Selector de Pestaña Estilo Píldora Apple */}
        <div className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-2xl border border-black/[0.04] self-start md:self-auto">
          <button
            onClick={() => setActiveChartTab('rt_vs_freq')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeChartTab === 'rt_vs_freq'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            1. RT₆₀ vs Frecuencia
          </button>
          <button
            onClick={() => setActiveChartTab('lp_vs_dist')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeChartTab === 'lp_vs_dist'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            2. Lp vs Distancia (Dc)
          </button>
          <button
            onClick={() => setActiveChartTab('abs_breakdown')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeChartTab === 'abs_breakdown'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            3. Aporte por Superficie
          </button>
        </div>
      </div>

      {/* --- GRÁFICO 1: RT vs FRECUENCIA --- */}
      {activeChartTab === 'rt_vs_freq' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 px-1">
            <div className="text-xs text-[#1d1d1f] font-medium">
              Comparación de modelos: <strong className="text-[#0071e3]">Sabine</strong> vs{' '}
              <strong className="text-[#34c759]">Norris-Eyring</strong> vs{' '}
              <strong className="text-[#ff9500]">Millington-Sette</strong>
            </div>
            <div className="text-xs text-[#86868b] font-mono flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#0071e3]/10 border border-[#0071e3]/40 rounded inline-block"></span>
              <span>Zona Óptima: {optimumRT.min}s a {optimumRT.max}s</span>
            </div>
          </div>

          <div className="w-full h-80 bg-[#fbfbfd] rounded-2xl p-4 border border-black/[0.06]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rtChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="frequency" stroke="#86868b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#86868b"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'RT60 (s)', angle: -90, position: 'insideLeft', fill: '#86868b', fontSize: 11 }}
                />
                <Tooltip content={<CustomRTTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                
                {/* Zona Óptima */}
                <ReferenceArea
                  y1={optimumRT.min}
                  y2={optimumRT.max}
                  fill="#0071e3"
                  fillOpacity={0.06}
                  stroke="#0071e3"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />

                <Line
                  type="monotone"
                  dataKey="Sabine"
                  name="Sabine"
                  stroke="#0071e3"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0071e3' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Eyring"
                  name="Norris-Eyring"
                  stroke="#34c759"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#34c759' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Millington"
                  name="Millington-Sette"
                  stroke="#ff9500"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ff9500' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs text-[#86868b]">
            <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04]">
              <strong className="text-[#0071e3] block mb-1">Sabine (1898):</strong>
              RT = 0.161 · V / A. Válido para absorción baja y distribuida (ᾱ &lt; 0.25).
            </div>
            <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04]">
              <strong className="text-[#34c759] block mb-1">Eyring (1930):</strong>
              RT = 0.161 · V / [-S · ln(1 - ᾱ)]. Corrige altas absorciones (si ᾱ → 1, RT → 0).
            </div>
            <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04]">
              <strong className="text-[#ff9500] block mb-1">Millington-Sette (1932):</strong>
              RT = 0.161 · V / [-∑ S_i · ln(1 - α_i)]. Ideal para salas con materiales dispares.
            </div>
          </div>
        </div>
      )}

      {/* --- GRÁFICO 2: Lp vs DISTANCIA --- */}
      {activeChartTab === 'lp_vs_dist' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 px-1">
            <div className="text-xs text-[#1d1d1f] font-medium">
              Curva de propagación espacial y Distancia Crítica{' '}
              <strong className="text-[#34c759] font-mono font-bold">Dc = {criticalDistance} m</strong>
            </div>

            {/* Selector de Banda para Curva de Distancia */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#86868b]">Banda evaluada:</span>
              <div className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-xl border border-black/[0.04]">
                {OCTAVE_BANDS.map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setSelectedBand(freq)}
                    className={`px-2.5 py-0.5 text-[11px] font-mono rounded-lg font-bold transition ${
                      selectedBand === freq
                        ? 'bg-white text-[#0071e3] shadow-xs'
                        : 'text-[#86868b] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {freq >= 1000 ? `${freq / 1000}k` : `${freq}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full h-80 bg-[#fbfbfd] rounded-2xl p-4 border border-black/[0.06]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="distance"
                  stroke="#86868b"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Distancia r (m)', position: 'insideBottomRight', offset: -5, fill: '#86868b', fontSize: 11 }}
                />
                <YAxis
                  stroke="#86868b"
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                  label={{ value: 'Nivel Lp (dB)', angle: -90, position: 'insideLeft', fill: '#86868b', fontSize: 11 }}
                />
                <Tooltip content={<CustomDistanceTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                {/* Marcador Vertical de Distancia Crítica Dc */}
                <ReferenceLine
                  x={criticalDistance}
                  stroke="#34c759"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Dc = ${criticalDistance}m`,
                    position: 'top',
                    fill: '#34c759',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* Marcador Vertical de Distancia del Receptor r */}
                <ReferenceLine
                  x={sourceReceiver.distance}
                  stroke="#ff9500"
                  strokeDasharray="2 2"
                  strokeWidth={1.5}
                  label={{
                    value: `Receptor r = ${sourceReceiver.distance}m`,
                    position: 'insideTopLeft',
                    fill: '#ff9500',
                    fontSize: 10,
                  }}
                />

                {/* Curva Total */}
                <Line
                  type="monotone"
                  dataKey="lpTotal"
                  name="Nivel Total Lp(r)"
                  stroke="#ff9500"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />

                {/* Asíntota Campo Directo (-6 dB/dd) */}
                <Line
                  type="monotone"
                  dataKey="lpDirect"
                  name="Campo Directo (If)"
                  stroke="#0071e3"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                />

                {/* Asíntota Campo Reverberado (Ir Constante) */}
                <Line
                  type="monotone"
                  dataKey="lpReverberant"
                  name="Campo Reverberado (Ir)"
                  stroke="#34c759"
                  strokeWidth={1.8}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs text-[#86868b]">
            <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04]">
              <strong className="text-[#34c759] block mb-1">Distancia Crítica (Dc):</strong>
              A r = Dc, la energía directa es idéntica a la reverberada (If = Ir). El nivel total resulta exactamente +3 dB sobre el campo reverberado.
            </div>
            <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04]">
              <strong className="text-[#ff9500] block mb-1">Propagación Espacial:</strong>
              Para r &lt; Dc, el nivel cae a razón de 6 dB por cada duplicación de distancia (ley del inverso del cuadrado). Para r &gt; Dc, el nivel se vuelve asintóticamente constante.
            </div>
          </div>
        </div>
      )}

      {/* --- GRÁFICO 3: DESGLOSE DE ABSORCIÓN --- */}
      {activeChartTab === 'abs_breakdown' && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-4 px-1 text-xs text-[#1d1d1f]">
            <span>Aporte de absorción equivalente (S_i · α_i) en m² Sabine por superficie</span>
            <span className="font-mono text-[#86868b]">Total = A(f)</span>
          </div>

          <div className="w-full h-80 bg-[#fbfbfd] rounded-2xl p-4 border border-black/[0.06]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absBreakdownData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="frequency" stroke="#86868b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#86868b"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Absorción (m² Sabine)', angle: -90, position: 'insideLeft', fill: '#86868b', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '16px', fontSize: '11px', fontFamily: 'monospace', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />

                <Bar dataKey="Piso" stackId="a" fill="#0071e3" />
                <Bar dataKey="Techo" stackId="a" fill="#34c759" />
                <Bar dataKey="Pared_Norte" stackId="a" fill="#5856d6" />
                <Bar dataKey="Pared_Sur" stackId="a" fill="#af52de" />
                <Bar dataKey="Pared_Este" stackId="a" fill="#ff2d55" />
                <Bar dataKey="Pared_Oeste" stackId="a" fill="#ff9500" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04] mt-4 text-xs text-[#86868b]">
            <strong className="text-[#1d1d1f]">Análisis de distribución de absorción: </strong>
            Permite detectar qué superficie domina la absorción acústica y evitar concentraciones asimétricas de tratamiento que produzcan ecos flotantes (flutter echo).
          </div>
        </div>
      )}

    </div>
  );
}
