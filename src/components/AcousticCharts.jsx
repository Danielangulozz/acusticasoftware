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
 * Con soporte completo de Dark Mode y paleta unificada POZOLE.
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
  geometry,
  materials,
}) {
  const [activeChartTab, setActiveChartTab] = useState('rt_vs_freq'); // 'rt_vs_freq', 'lp_vs_dist', 'abs_breakdown'

  // Paleta de colores para desglose por superficies
  const SURFACE_PALETTE = [
    '#5833c7', // Piso
    '#8767f9', // Techo
    '#3b82f6', // Pared 1
    '#10b981', // Pared 2
    '#f59e0b', // Pared 3
    '#ef4444', // Pared 4
    '#ec4899', // Pared 5
    '#8b5cf6', // Pared 6
    '#06b6d4', // Pared 7
    '#14b8a6', // Pared 8
    '#6366f1', // Pared 9
    '#f97316', // Pared 10
  ];

  // Identificación dinámica de todas las superficies de la sala
  const surfaceKeys = React.useMemo(() => {
    if (geometry?.surfacesList && geometry.surfacesList.length > 0) {
      return geometry.surfacesList.map((s) => s.id);
    }
    const sample = absorptionData[500]?.absorptionBySurface || {};
    const keys = Object.keys(sample);
    return keys.length > 0 ? keys : ['floor', 'ceiling', 'wall_0', 'wall_1', 'wall_2', 'wall_3'];
  }, [geometry?.surfacesList, absorptionData]);

  const getSurfaceLabel = (key) => {
    if (key === 'floor') return 'Piso';
    if (key === 'ceiling') return 'Techo';
    if (key.startsWith('wall_')) {
      const idx = parseInt(key.replace('wall_', ''), 10);
      return `Pared ${idx + 1}`;
    }
    const legacy = {
      wallNorth: 'Pared Norte',
      wallSouth: 'Pared Sur',
      wallEast: 'Pared Este',
      wallWest: 'Pared Oeste',
    };
    return legacy[key] || key;
  };

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

  // Datos Gráfico 3: Aporte por Superficie (Dinámico para cualquier número de paredes)
  const absBreakdownData = OCTAVE_BANDS.map((freq) => {
    const abs = absorptionData[freq] || {};
    const bySurface = abs.absorptionBySurface || {};
    const row = {
      frequency: freq >= 1000 ? `${freq / 1000}k Hz` : `${freq} Hz`,
      Total: Number((abs.equivalentAbsorption || 0).toFixed(2)),
    };
    surfaceKeys.forEach((key) => {
      const label = getSurfaceLabel(key);
      row[label] = Number((bySurface[key] || 0).toFixed(2));
    });
    return row;
  });

  // Tooltip Estilo Apple para RT
  const CustomRTTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#16182a]/95 backdrop-blur-md p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-apple-lg text-xs font-mono text-[#1d1d1f] dark:text-white">
          <div className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1.5 border-b border-black/[0.06] dark:border-white/[0.06] pb-1">
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
          <div className="mt-2 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06] text-[10px] text-[#86868b] dark:text-slate-400">
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
        <div className="bg-white/95 dark:bg-[#16182a]/95 backdrop-blur-md p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-apple-lg text-xs font-mono text-[#1d1d1f] dark:text-white">
          <div className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1.5 border-b border-black/[0.06] dark:border-white/[0.06] pb-1">
            Distancia: {data.distance} m
          </div>
          <div className="flex justify-between items-center gap-4 text-[#ff9500]">
            <span>Lp Total:</span>
            <span className="font-bold">{data.lpTotal} dB</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-[#5833c7] dark:text-[#8767f9]">
            <span>Lp Directo (If):</span>
            <span className="font-bold">{data.lpDirect} dB</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-[#34c759]">
            <span>Lp Reverb (Ir):</span>
            <span className="font-bold">{data.lpReverberant} dB</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-[#86868b] dark:text-slate-400 mt-1.5 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
            <span>Relación DRR:</span>
            <span className="font-bold text-[#1d1d1f] dark:text-white">{data.drr} dB</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-6 sm:p-8 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado con Pestañas de Gráficas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa] flex items-center justify-center font-bold">
            <LineChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1d1d1f] dark:text-white tracking-tight">
              5. Visualización Gráfica Interactiva
            </h2>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              Curvas de decaimiento temporal (RT₆₀), propagación espacial (Lp vs r) y absorción
            </p>
          </div>
        </div>

        {/* Selector de Pestaña Estilo Píldora */}
        <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#0A0C14] p-1.5 rounded-2xl border border-black/[0.04] dark:border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveChartTab('rt_vs_freq')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeChartTab === 'rt_vs_freq'
                ? 'bg-[#5833c7] text-white shadow-sm font-bold'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            1. RT₆₀ vs Frecuencia
          </button>
          <button
            onClick={() => setActiveChartTab('lp_vs_dist')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeChartTab === 'lp_vs_dist'
                ? 'bg-[#5833c7] text-white shadow-sm font-bold'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            2. Lp vs Distancia (Dc)
          </button>
          <button
            onClick={() => setActiveChartTab('abs_breakdown')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeChartTab === 'abs_breakdown'
                ? 'bg-[#5833c7] text-white shadow-sm font-bold'
                : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
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
            <div className="text-xs text-[#1d1d1f] dark:text-white font-medium">
              Comparación de modelos: <strong className="text-[#5833c7] dark:text-[#8767f9]">Sabine</strong> vs{' '}
              <strong className="text-[#34c759]">Norris-Eyring</strong> vs{' '}
              <strong className="text-[#ff9500]">Millington-Sette</strong>
            </div>
            <div className="text-xs text-[#86868b] dark:text-slate-400 font-mono flex items-center gap-1.5">
              <span>Zona sombreada: Rango óptimo</span>
              <span className="w-3 h-3 bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 rounded"></span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rtChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" className="dark:stroke-white/10" vertical={false} />
                <XAxis 
                  dataKey="frequency" 
                  tickLine={false} 
                  axisLine={{ stroke: '#e5e5ea' }}
                  tick={{ fill: '#86868b', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={{ stroke: '#e5e5ea' }}
                  tick={{ fill: '#86868b', fontSize: 11, fontFamily: 'monospace' }}
                  unit="s"
                />
                <Tooltip content={<CustomRTTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                />
                
                {/* Zona de Tolerancia Óptima DIN 18041 */}
                <ReferenceArea 
                  y1={optimumRT.min} 
                  y2={optimumRT.max} 
                  fill="#34c759" 
                  fillOpacity={0.1} 
                  stroke="#34c759" 
                  strokeOpacity={0.2} 
                />
                <ReferenceLine 
                  y={optimumRT.optimal} 
                  stroke="#34c759" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                />

                <Line 
                  type="monotone" 
                  dataKey="Sabine" 
                  name="Sabine" 
                  stroke="#5833c7" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#5833c7' }} 
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Eyring" 
                  name="Norris-Eyring" 
                  stroke="#34c759" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#34c759' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Millington" 
                  name="Millington-Sette" 
                  stroke="#ff9500" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#ff9500' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* --- GRÁFICO 2: Lp vs DISTANCIA --- */}
      {activeChartTab === 'lp_vs_dist' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 px-1">
            <div className="text-xs text-[#1d1d1f] dark:text-white font-medium">
              Atenuación espacial de presión sonora a <strong>{selectedBand} Hz</strong> (Lw={currentLw}dB, Q={currentQ})
            </div>
            <div className="text-xs font-mono text-[#5833c7] dark:text-[#a78bfa] flex items-center gap-2">
              <span>Distancia Crítica Dc: <strong>{criticalDistance} m</strong></span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" className="dark:stroke-white/10" vertical={false} />
                <XAxis 
                  dataKey="distance" 
                  tickLine={false} 
                  axisLine={{ stroke: '#e5e5ea' }}
                  tick={{ fill: '#86868b', fontSize: 11, fontFamily: 'monospace' }}
                  unit="m"
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={{ stroke: '#e5e5ea' }}
                  tick={{ fill: '#86868b', fontSize: 11, fontFamily: 'monospace' }}
                  unit="dB"
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomDistanceTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                />

                {/* Línea vertical de Distancia Crítica Dc */}
                <ReferenceLine 
                  x={criticalDistance} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{ 
                    value: `Dc = ${criticalDistance}m`, 
                    fill: '#f59e0b', 
                    fontSize: 10, 
                    position: 'top',
                    fontFamily: 'monospace'
                  }} 
                />

                {/* Línea horizontal del nivel de campo reverberado puro */}
                <ReferenceLine 
                  y={revLevel} 
                  stroke="#10b981" 
                  strokeDasharray="2 2" 
                  strokeWidth={1}
                />

                <Line 
                  type="monotone" 
                  dataKey="lpTotal" 
                  name="Nivel Total Lp" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lpDirect" 
                  name="Sonido Directo" 
                  stroke="#5833c7" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lpReverberant" 
                  name="Sonido Reverberado" 
                  stroke="#10b981" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* --- GRÁFICO 3: DESGLOSE DE ABSORCIÓN --- */}
      {activeChartTab === 'abs_breakdown' && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-4 px-1">
            <div className="text-xs text-[#1d1d1f] dark:text-white font-medium">
              Absorción acústica equivalente acumulada (m² Sabine) por superficie del recinto
            </div>
            <span className="text-xs text-[#86868b] dark:text-slate-400 font-mono">
              Total = Σ(Si · αi)
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absBreakdownData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" className="dark:stroke-white/10" vertical={false} />
                <XAxis 
                  dataKey="frequency" 
                  tickLine={false} 
                  axisLine={{ stroke: '#e5e5ea' }}
                  tick={{ fill: '#86868b', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={{ stroke: '#e5e5ea' }}
                  tick={{ fill: '#86868b', fontSize: 11, fontFamily: 'monospace' }}
                  unit="m²"
                />
                <Tooltip 
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: '#141622',
                    color: '#fff',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                />

                {surfaceKeys.map((key, idx) => {
                  const label = getSurfaceLabel(key);
                  const color = SURFACE_PALETTE[idx % SURFACE_PALETTE.length];
                  const isLast = idx === surfaceKeys.length - 1;
                  return (
                    <Bar
                      key={key}
                      dataKey={label}
                      name={label}
                      stackId="a"
                      fill={color}
                      radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
