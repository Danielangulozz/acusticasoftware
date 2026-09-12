import React from 'react';
import {
  Box,
  Layers,
  Volume2,
  TableProperties,
  LineChart,
  Clock,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Maximize2,
  Activity,
  Printer
} from 'lucide-react';
import RoomVisualizer from './RoomVisualizer';

/**
 * Panel de Resumen Ejecutivo y Visión General (Dashboard)
 */
export default function OverviewDashboard({
  geometry,
  dimensions,
  roomPolygon,
  sourceReceiver,
  absorptionData,
  reverberationData,
  soundFieldData,
  optimumRT,
  criticalDistance,
  setActiveSection,
  onOpenReport,
  materials,
  selectedBand = 1000,
  onChangeSourceReceiver,
}) {
  const rt500 = reverberationData[500] || { sabine: 0, eyring: 0, millington: 0 };
  const abs500 = absorptionData[500] || { equivalentAbsorption: 0, alphaMean: 0 };
  const field1k = soundFieldData[1000] || {};
  const avgRT500 = (rt500.sabine + rt500.eyring) / 2;
  const isRTInOptRange = avgRT500 >= optimumRT.min && avgRT500 <= optimumRT.max;
  const isDirectDominant = sourceReceiver.distance < criticalDistance;
  const surfaceCount = Object.keys(materials || {}).length || 6;

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Hero Banner */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-10 shadow-apple-sm relative overflow-hidden transition-colors">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400 text-xs font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulación en Tiempo Real</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#1d1d1f] dark:text-white leading-tight">
            Modelo de Campo Sonoro y Reverberación
          </h2>
          <p className="text-sm sm:text-base text-[#86868b] dark:text-slate-400 mt-2 font-normal leading-relaxed">
            Plataforma de alta precisión para el análisis modal, absorción equivalente y propagación en recintos de geometría ortogonal o libre.
          </p>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.06]">

          <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[11px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Tiempo de Rev. (RT₆₀)
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#0071e3] dark:text-sky-400 mt-1">
              {rt500.sabine.toFixed(2)}<span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> s</span>
            </div>
            <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
              {isRTInOptRange ? (
                <span className="text-[#34c759] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Óptimo ({optimumRT.optimal}s)
                </span>
              ) : (
                <span className="text-[#ff9500] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Meta: {optimumRT.optimal}s
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[11px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Distancia Crítica (Dc)
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#34c759] dark:text-emerald-400 mt-1">
              {criticalDistance.toFixed(2)}<span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> m</span>
            </div>
            <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-1 font-medium">
              {isDirectDominant ? 'Receptor en Campo Directo' : 'Receptor en Campo Reverberado'}
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[11px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Volumen de Sala (V)
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1d1d1f] dark:text-white mt-1">
              {geometry.volume.toFixed(1)}<span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> m³</span>
            </div>
            <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-1 font-medium">
              S = {geometry.totalSurfaceArea.toFixed(1)} m²
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[11px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Nivel Sonoro (Lp @ 1kHz)
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#ff9500] dark:text-amber-400 mt-1">
              {field1k.lpTotalWithAir?.toFixed(1) || 0}<span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> dB</span>
            </div>
            <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-1 font-medium">
              Lw = {sourceReceiver.lw} dB @ {sourceReceiver.distance}m
            </div>
          </div>

        </div>
      </div>

      {/* Fila Central: Visualizador 3D + Accesos Directos a Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Visualizador 3D */}
        <div className="lg:col-span-7">
          <RoomVisualizer
            roomPolygon={roomPolygon}
            geometry={geometry}
            dimensions={dimensions}
            sourceReceiver={sourceReceiver}
            criticalDistance={criticalDistance}
            onChangeSourceReceiver={onChangeSourceReceiver}
            materials={materials}
            selectedBand={selectedBand}
          />
        </div>

        {/* Tarjetas de Acceso Rápido a Módulos */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">

          <button
            onClick={() => setActiveSection('geometry')}
            className="w-full text-left p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#0071e3] dark:hover:border-sky-500 shadow-apple-sm transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400 flex items-center justify-center font-bold">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] dark:group-hover:text-sky-400 transition">
                  1. Geometría y Dimensiones
                </h4>
                <p className="text-xs text-[#86868b] dark:text-slate-400">
                  {geometry.length.toFixed(1)}m × {geometry.width.toFixed(1)}m × {geometry.height.toFixed(1)}m ({geometry.volume.toFixed(1)} m³)
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0071e3] transition" />
          </button>

          <button
            onClick={() => setActiveSection('materials')}
            className="w-full text-left p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#0071e3] dark:hover:border-sky-500 shadow-apple-sm transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#34c759]/10 dark:bg-[#34c759]/20 text-[#34c759] dark:text-emerald-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] dark:group-hover:text-sky-400 transition">
                  2. Materiales y Coeficientes α
                </h4>
                <p className="text-xs text-[#86868b] dark:text-slate-400">
                  {surfaceCount} superficies configuradas
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0071e3] transition" />
          </button>

          <button
            onClick={() => setActiveSection('source')}
            className="w-full text-left p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#0071e3] dark:hover:border-sky-500 shadow-apple-sm transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ff9500]/10 dark:bg-[#ff9500]/20 text-[#ff9500] dark:text-amber-400 flex items-center justify-center font-bold">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] dark:group-hover:text-sky-400 transition">
                  3. Fuente Sonora y Receptor
                </h4>
                <p className="text-xs text-[#86868b] dark:text-slate-400">
                  Lw = {sourceReceiver.lw} dB, Q = {sourceReceiver.directivity}, r = {sourceReceiver.distance}m
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0071e3] transition" />
          </button>

          <button
            onClick={() => setActiveSection('charts')}
            className="w-full text-left p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#0071e3] dark:hover:border-sky-500 shadow-apple-sm transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#5856d6]/10 dark:bg-[#5856d6]/20 text-[#5856d6] dark:text-indigo-400 flex items-center justify-center font-bold">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] dark:group-hover:text-sky-400 transition">
                  5. Gráficas y Curvas de Decaimiento
                </h4>
                <p className="text-xs text-[#86868b] dark:text-slate-400">
                  Curvas RT vs f y Lp vs distancia
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0071e3] transition" />
          </button>

        </div>

      </div>

    </div>
  );
}
