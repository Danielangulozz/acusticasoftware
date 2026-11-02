import React from 'react';
import {
  Box,
  Layers,
  Volume2,
  TableProperties,
  LineChart,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Printer,
  Waves,
  MessageSquare,
  Grid3x3,
} from 'lucide-react';
import RoomVisualizer from './RoomVisualizer';

/**
 * Panel de Resumen Ejecutivo y Diagnóstico Asistido (Dashboard)
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
  onChangeMaterials,
  selectedBand = 1000,
  onChangeSourceReceiver,
  schroederData = { fsApprox: 385, fsExact: 403 },
  bonelloResult = { complies: false, violations: [], degenerateGroups: [] },
  modalModes = [],
}) {
  const rt500 = reverberationData[500] || { sabine: 0, eyring: 0, millington: 0 };
  const field1k = soundFieldData[1000] || {};
  const avgRT500 = (rt500.sabine + rt500.eyring) / 2;
  const isRTInOptRange = avgRT500 >= optimumRT.min && avgRT500 <= optimumRT.max;
  const isTooReverberant = avgRT500 > optimumRT.max;
  const isDirectDominant = sourceReceiver.distance < criticalDistance;
  const surfaceCount = Object.keys(materials || {}).length || 6;
  const modesUnderFs = modalModes.filter((m) => m.frequency <= (schroederData?.fsApprox || 385)).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Banner Bento + Diagnóstico en Lenguaje Claro */}
      <div className="bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-6 sm:p-8 shadow-apple-sm relative overflow-hidden transition-colors space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa] text-xs font-bold font-mono tracking-wide uppercase mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resumen Ejecutivo en Vivo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1d1d1f] dark:text-white leading-tight">
              Diagnóstico General de tu Sala
            </h2>
            <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-300 mt-1.5 leading-relaxed">
              Aquí ves de un vistazo si el eco, el nivel sonoro y los graves están bajo control. Haz clic en cualquier paso para ajustar tu diseño.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('geometry')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-[#e8e8ed] dark:hover:bg-[#25283f] text-[#1d1d1f] dark:text-white text-xs font-bold border border-black/[0.06] dark:border-white/10 transition cursor-pointer"
            >
              <span>Editar Paso 1 (Geometría)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Ver Informe PDF</span>
            </button>
          </div>
        </div>

        {/* Semáforo de Diagnóstico Asistido */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isRTInOptRange
              ? 'bg-emerald-500/[0.07] border-emerald-500/25 text-emerald-950 dark:text-emerald-200'
              : 'bg-amber-500/[0.08] border-amber-500/30 text-amber-950 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {isRTInOptRange ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm leading-relaxed">
              {isRTInOptRange ? (
                <>
                  <strong>¡Buen equilibrio acústico!</strong> El tiempo de reverberación promedio a 500 Hz (
                  <strong>{avgRT500.toFixed(2)} s</strong>) está dentro del rango recomendado (
                  <strong>{optimumRT.min}s – {optimumRT.max}s</strong>).
                </>
              ) : isTooReverberant ? (
                <>
                  <strong>Atención: La sala tiene demasiado eco ({avgRT500.toFixed(2)} s).</strong> La meta ideal para este uso es{' '}
                  <strong>{optimumRT.optimal} s</strong> ({optimumRT.min}s – {optimumRT.max}s). Te recomendamos agregar paneles absorbentes o cortinas en el <strong>Paso 2 (Materiales)</strong>.
                </>
              ) : (
                <>
                  <strong>Atención: La sala está muy seca ({avgRT500.toFixed(2)} s).</strong> La meta ideal es{' '}
                  <strong>{optimumRT.optimal} s</strong>. Puedes usar materiales menos absorbentes o añadir difusores para recuperar naturalidad.
                </>
              )}
            </div>
          </div>
          {!isRTInOptRange && (
            <button
              type="button"
              onClick={() => setActiveSection('materials')}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 self-start sm:self-center transition cursor-pointer"
            >
              Corregir en Paso 2 →
            </button>
          )}
        </div>

        {/* 4 KPIs Principales con Explicación Clara */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-4 rounded-2xl border border-black/[0.05] dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
                1. Tiempo de Eco (RT₆₀)
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#0071e3] dark:text-sky-400 mt-1">
                {rt500.sabine.toFixed(2)}
                <span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> s</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] space-y-1">
              <div className="text-[11px] font-semibold">
                {isRTInOptRange ? (
                  <span className="text-[#10b981] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> En rango ideal ({optimumRT.optimal}s)
                  </span>
                ) : (
                  <span className="text-[#f59e0b] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Meta ideal: {optimumRT.optimal}s
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-[#86868b] dark:text-slate-400 leading-snug">
                Cuánto tarda un sonido en apagarse 60 dB a 500 Hz.
              </p>
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-4 rounded-2xl border border-black/[0.05] dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
                2. Distancia Crítica (Dc)
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#10b981] mt-1">
                {criticalDistance.toFixed(2)}
                <span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> m</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] space-y-1">
              <div className="text-[11px] font-semibold text-[#1d1d1f] dark:text-slate-200">
                {isDirectDominant ? '✓ Oyente en Sonido Directo' : '⚠ Oyente en Zona de Eco'}
              </div>
              <p className="text-[10.5px] text-[#86868b] dark:text-slate-400 leading-snug">
                Más allá de {criticalDistance.toFixed(1)} m el eco de la sala suena más fuerte que la fuente.
              </p>
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-4 rounded-2xl border border-black/[0.05] dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
                3. Volumen de Sala (V)
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#1d1d1f] dark:text-white mt-1">
                {geometry.volume.toFixed(1)}
                <span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> m³</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] space-y-1">
              <div className="text-[11px] font-semibold text-[#1d1d1f] dark:text-slate-200">
                Superficie total: {geometry.totalSurfaceArea.toFixed(1)} m²
              </div>
              <p className="text-[10.5px] text-[#86868b] dark:text-slate-400 leading-snug">
                A mayor volumen de aire, más tiempo tarda el sonido en decaer.
              </p>
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-4 rounded-2xl border border-black/[0.05] dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
                4. Nivel en el Oyente (Lp)
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#f59e0b] mt-1">
                {field1k.lpTotalWithAir?.toFixed(1) || 0}
                <span className="text-sm font-normal text-[#86868b] dark:text-slate-500"> dB</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] space-y-1">
              <div className="text-[11px] font-semibold text-[#1d1d1f] dark:text-slate-200">
                Fuente Lw = {sourceReceiver.lw} dB a {sourceReceiver.distance} m
              </div>
              <p className="text-[10.5px] text-[#86868b] dark:text-slate-400 leading-snug">
                Volumen total que percibe el receptor sumando sonido directo y reflejado.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fila Central: Visualizador 3D + Flujo de Pasos Guiado */}
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
            onChangeMaterials={onChangeMaterials}
            selectedBand={selectedBand}
          />
        </div>

        {/* Ruta Paso a Paso hacia los Módulos */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 px-1">
            Flujo de Trabajo Recomendado
          </div>

          {[
            {
              id: 'geometry',
              icon: Box,
              color: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-sky-400',
              title: 'Paso 1 · Geometría y Dimensiones',
              sub: `Planta de ${geometry.length.toFixed(1)}m × ${geometry.width.toFixed(1)}m × ${geometry.height.toFixed(1)}m (${geometry.volume.toFixed(1)} m³)`,
            },
            {
              id: 'materials',
              icon: Layers,
              color: 'bg-[#10b981]/10 text-[#10b981]',
              title: 'Paso 2 · Materiales y Absorción',
              sub: `${surfaceCount} caras configuradas (piso, techo, paredes y puertas)`,
            },
            {
              id: 'source',
              icon: Volume2,
              color: 'bg-[#f59e0b]/10 text-[#f59e0b]',
              title: 'Paso 3 · Fuente Sonora y Oyente',
              sub: `Potencia Lw = ${sourceReceiver.lw} dB · Directividad Q = ${sourceReceiver.directivity} · Dist. = ${sourceReceiver.distance}m`,
            },
            {
              id: 'results',
              icon: TableProperties,
              color: 'bg-[#5833c7]/10 text-[#5833c7] dark:text-purple-400',
              title: 'Paso 4 · Tablas de Reverberación',
              sub: 'Comparativa Sabine, Eyring y Millington por banda de octava',
            },
            {
              id: 'charts',
              icon: LineChart,
              color: 'bg-[#5856d6]/10 text-[#5856d6] dark:text-indigo-400',
              title: 'Paso 5 · Gráficas Acústicas',
              sub: 'Curvas de tiempo de eco (RT60) y caída de presión sonora con la distancia',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="w-full text-left p-3.5 rounded-2xl bg-white dark:bg-[#141622] border border-black/[0.08] dark:border-white/10 hover:border-[#5833c7] dark:hover:border-purple-400 shadow-apple-sm transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center font-bold shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-purple-300 transition truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#86868b] dark:text-slate-400 truncate">
                      {item.sub}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#5833c7] transition shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Laboratorios Especializados: Modos, Inteligibilidad y Difusores */}
      <div className="bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-6 shadow-apple-sm transition-colors space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/10">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#1d1d1f] dark:text-white">
              Laboratorios Especializados (Graves, Voz y Difusores)
            </h3>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              Herramientas avanzadas para evaluar resonancias en bajas frecuencias, claridad de la palabra y diseño de paneles difusores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSection('modes')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5833c7] hover:bg-[#4727a8] text-white text-xs font-bold transition cursor-pointer"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Lab Modos</span>
            </button>
            <button
              onClick={() => setActiveSection('intelligibility')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Lab Voz (%ALcons)</span>
            </button>
            <button
              onClick={() => setActiveSection('diffusers')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
            >
              <Grid3x3 className="w-3.5 h-3.5" />
              <span>Lab Difusores</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/10">
            <div className="text-[10px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Frec. de Schroeder (fs)
            </div>
            <div className="text-2xl font-black font-mono text-[#0071e3] dark:text-sky-400 mt-1">
              {schroederData?.fsApprox || 385} <span className="text-xs font-normal text-[#86868b]">Hz</span>
            </div>
            <div className="text-[10.5px] text-[#86868b] dark:text-slate-400 mt-1 leading-snug">
              Por debajo de {schroederData?.fsApprox || 385} Hz dominan los modos estacionarios (graves).
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/10">
            <div className="text-[10px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Modos en Zona Grave (f ≤ fs)
            </div>
            <div className="text-2xl font-black font-mono text-[#5833c7] dark:text-purple-400 mt-1">
              {modesUnderFs} <span className="text-xs font-normal text-[#86868b]">modos</span>
            </div>
            <div className="text-[10.5px] text-[#86868b] dark:text-slate-400 mt-1 leading-snug">
              Resonancias propias de la sala ({modalModes.length} modos totales calculados).
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/10">
            <div className="text-[10px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Criterio de Bonello
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                  bonelloResult?.complies ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'
                }`}
              >
                {bonelloResult?.complies ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {bonelloResult?.complies ? 'CUMPLE' : 'NO CUMPLE'}
              </span>
            </div>
            <div className="text-[10.5px] text-[#86868b] dark:text-slate-400 mt-1.5 leading-snug">
              Evalúa si los modos suben de forma uniforme sin huecos tonales.
            </div>
          </div>

          <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/10">
            <div className="text-[10px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
              Coincidencias Modales
            </div>
            <div className="text-2xl font-black font-mono text-[#f59e0b] mt-1">
              {bonelloResult?.degenerateGroups?.length || 0} <span className="text-xs font-normal text-[#86868b]">grupos</span>
            </div>
            <div className="text-[10.5px] text-[#86868b] dark:text-slate-400 mt-1 leading-snug">
              Frecuencias donde varios modos se acumulan y colorean el sonido.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
