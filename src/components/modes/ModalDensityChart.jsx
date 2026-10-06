import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, Info, Sparkles, TrendingUp } from 'lucide-react';
import { modalDensityN, modalDensityDerivative } from '../../utils/modalCalculations';

/**
 * Gráfica de Densidad Modal Teórica N(f) y dN/df vs Conteo Discreto Acumulado
 */
export default function ModalDensityChart({
  modes = [],
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
  volume = 180,
  surface = 216,
  perimeter = 76,
  c = 343,
  schroederFreq = 385,
  fMax = 400,
}) {
  const chartData = useMemo(() => {
    const maxFreq = Math.min(600, Math.max(fMax, schroederFreq * 1.1));
    const step = 5; // muestreo cada 5 Hz
    const points = [];

    const sortedModes = [...modes].sort((a, b) => a.frequency - b.frequency);

    for (let f = 10; f <= maxFreq; f += step) {
      // Modos reales calculados acumulados <= f
      const realCount = sortedModes.filter(m => m.frequency <= f).length;

      // Densidad teórica asintótica Weyl N(f)
      const theoreticalN = modalDensityN(f, volume, surface, perimeter, c);

      // Derivada teórica dN/df (modos por Hz)
      const dN_df = modalDensityDerivative(f, volume, surface, perimeter, c);

      points.push({
        freq: f,
        realCount,
        theoreticalN: Number(theoreticalN.toFixed(1)),
        dN_df: Number(dN_df.toFixed(3)),
      });
    }

    return points;
  }, [modes, volume, surface, perimeter, c, schroederFreq, fMax]);

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Densidad Modal Acumulada N(f) y dN/df (Ley de Weyl)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Comparación asintótica entre el conteo discreto exacto de modos y la fórmula continua de Weyl para volumen V={volume.toFixed(1)} m³, S={surface.toFixed(1)} m².
          </p>
        </div>
      </div>

      {/* Gráfica N(f) vs Real */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#86868b] dark:text-slate-400 px-1">
          <span>N(f) — Número Acumulado de Modos Propios</span>
          <span className="text-[#ef4444] font-mono">Corte Schroeder: {schroederFreq} Hz</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis
                dataKey="freq"
                tick={{ fontSize: 11, fill: '#86868b', fontFamily: 'monospace' }}
                unit=" Hz"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#86868b', fontFamily: 'monospace' }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono">
                        <div className="font-bold text-[#1d1d1f] dark:text-white mb-1.5 pb-1 border-b border-black/[0.06] dark:border-white/[0.06]">
                          f = {label} Hz
                        </div>
                        <div className="space-y-1">
                          <div className="text-[#0071e3] flex justify-between gap-4">
                            <span>N real discreto:</span>
                            <span className="font-bold">{payload[0]?.value}</span>
                          </div>
                          <div className="text-[#5833c7] dark:text-purple-400 flex justify-between gap-4">
                            <span>N(f) Weyl teórico:</span>
                            <span className="font-bold">{payload[1]?.value}</span>
                          </div>
                          <div className="text-[#10b981] flex justify-between gap-4 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                            <span>dN/df (modos/Hz):</span>
                            <span className="font-bold">{payload[0]?.payload?.dN_df}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
              <ReferenceLine
                x={schroederFreq}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{ value: `fs = ${schroederFreq} Hz`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
              />
              <Line
                type="stepAfter"
                dataKey="realCount"
                name="N(f) Conteo Discreto Exacto"
                stroke="#0071e3"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="theoreticalN"
                name="N(f) Teórica Asintótica (Weyl)"
                stroke="#5833c7"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica dN/df (Densidad por Hertz) */}
      <div className="space-y-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center justify-between text-xs font-semibold text-[#86868b] dark:text-slate-400 px-1">
          <span>dN/df — Tasa de Densidad Modal Instantánea (modos por Hertz)</span>
          <span className="text-xs text-[#86868b] font-mono">Crecimiento cuadrático ~ 4πVf²/c³</span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis
                dataKey="freq"
                tick={{ fontSize: 10, fill: '#86868b', fontFamily: 'monospace' }}
                unit=" Hz"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#86868b', fontFamily: 'monospace' }}
                unit=" m/Hz"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono">
                        <span className="font-bold text-[#1d1d1f] dark:text-white">f = {label} Hz</span>: {payload[0]?.value} modos/Hz
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                x={schroederFreq}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="dN_df"
                name="dN/df (modos/Hz)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Nota Explicativa */}
      <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] text-xs leading-relaxed text-[#86868b] dark:text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#1d1d1f] dark:text-white">Significado Físico:</strong> A frecuencias muy bajas (por debajo de ~60 Hz), la densidad modal es menor a 0.1 modos/Hz, lo que produce una respuesta altamente selectiva con picos aislados y cancelaciones profundas. Al alcanzar la <strong className="text-[#ef4444]">Frecuencia de Schroeder ({schroederFreq} Hz)</strong>, la densidad modal y el solapamiento entre resonancias son suficientes para que el campo sonoro se comporte de forma difusa y estadística (acústica geométrica).
        </div>
      </div>
    </div>
  );
}
