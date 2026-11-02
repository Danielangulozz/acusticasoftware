import React from 'react';
import {
  Box,
  Layers,
  TableProperties,
  ArrowRight,
  Waves,
  MessageSquare,
  Grid3x3,
  FolderOpen,
  LayoutDashboard,
} from 'lucide-react';
import { PozoleLogo } from './PozoleLogo';
import RoomVisualizer from './RoomVisualizer';

const QUICK_PRESETS = [
  { id: 'classroom', label: 'Aula de Clases', sub: '9 × 6.5 × 3.2 m · Voz' },
  { id: 'recording_studio', label: 'Estudio de Grabación', sub: '5.5 × 4.2 × 2.8 m · Seco' },
  { id: 'concert_hall', label: 'Auditorio / Concierto', sub: '28 × 18 × 12 m · Música' },
  { id: 'usb_medellin_example', label: 'Sala USB Medellín', sub: '4 × 3 × 2.5 m · %ALcons' },
];

/**
 * WelcomeHero — Guía de Inicio Rápido e Introducción Intuitiva a POZOLE Suite
 */
export default function WelcomeHero({
  onEnterStudio,
  onEnter,
  onNavigate,
  onLoadPreset,
  selectedPresetId,
  roomPolygon,
  geometry,
  dimensions,
  sourceReceiver,
  criticalDistance,
  materials,
  selectedBand = 1000,
}) {
  const handleEnter = onEnterStudio || onEnter;
  const goTo = (section) => {
    if (onNavigate) onNavigate(section);
    else if (handleEnter) handleEnter();
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto py-1">
      {/* =========================================================================
          FILA SUPERIOR: BIENVENIDA + FLUJO EN 3 PASOS + VISUALIZADOR 3D
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. TARJETA IZQUIERDA: Cómo empezar paso a paso */}
        <div className="lg:col-span-6 bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-apple-sm transition-colors space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5833c7]/10 dark:bg-[#5833c7]/20 border border-[#5833c7]/30 text-[#5833c7] dark:text-[#a78bfa] text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#5833c7] dark:bg-[#a78bfa] animate-pulse" />
              <span>Guía Rápida · Simulador Acústico v3.0</span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <PozoleLogo size={38} className="shrink-0" />
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#1d1d1f] dark:text-white leading-tight">
                    POZOLE Suite
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold text-[#5833c7] dark:text-[#c4b5fd]">
                    Diseña, simula y diagnostica cualquier sala paso a paso
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-300 leading-relaxed">
              Sigue el orden de los <strong>3 pasos principales</strong> para evaluar tu espacio, o carga una sala de ejemplo con un clic para explorar los resultados al instante.
            </p>

            {/* 3 Pasos Clicables */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => goTo('geometry')}
                className="w-full text-left p-3.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#0A0C14] hover:bg-[#5833c7]/[0.06] dark:hover:bg-[#5833c7]/15 border border-black/[0.06] dark:border-white/10 hover:border-[#5833c7]/40 transition flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#5833c7] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#a78bfa] transition">
                      Define la Geometría de tu Sala
                    </div>
                    <div className="text-[11px] text-[#86868b] dark:text-slate-400 truncate">
                      Dibuja las paredes en 2D o elige una forma (rectangular, en L, trapecio)
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5833c7] group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => goTo('materials')}
                className="w-full text-left p-3.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#0A0C14] hover:bg-[#5833c7]/[0.06] dark:hover:bg-[#5833c7]/15 border border-black/[0.06] dark:border-white/10 hover:border-[#5833c7]/40 transition flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#5833c7]/15 text-[#5833c7] dark:text-[#a78bfa] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#a78bfa] transition">
                      Elige los Materiales y la Fuente Sonora
                    </div>
                    <div className="text-[11px] text-[#86868b] dark:text-slate-400 truncate">
                      Indica de qué son el piso, techo y muros, y dónde se ubica el oyente
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5833c7] group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => goTo('results')}
                className="w-full text-left p-3.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#0A0C14] hover:bg-[#5833c7]/[0.06] dark:hover:bg-[#5833c7]/15 border border-black/[0.06] dark:border-white/10 hover:border-[#5833c7]/40 transition flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#5833c7]/15 text-[#5833c7] dark:text-[#a78bfa] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#a78bfa] transition">
                      Revisa el Diagnóstico y Genera tu Informe
                    </div>
                    <div className="text-[11px] text-[#86868b] dark:text-slate-400 truncate">
                      Comprueba si el eco (RT60) es óptimo y descarga el reporte en PDF
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5833c7] group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/10">
            {/* Botones de Acción Principal */}
            <div className="grid sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => goTo('geometry')}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#5833c7] hover:bg-[#4726aa] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#5833c7]/20 transition transform active:scale-95 cursor-pointer"
              >
                <span>Empezar por Paso 1 (Geometría)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleEnter}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-[#e8e8ed] dark:hover:bg-[#25283f] text-[#1d1d1f] dark:text-white font-bold text-xs sm:text-sm border border-black/[0.08] dark:border-white/10 transition cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa]" />
                <span>Ver Panel General</span>
              </button>
            </div>

            {/* Créditos compactos del equipo */}
            <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex -space-x-1.5 shrink-0">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#5833c7] text-white text-[9px] font-black ring-2 ring-white dark:ring-[#141622]">DA</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] text-white text-[9px] font-black ring-2 ring-white dark:ring-[#141622]">JG</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f59e0b] text-white text-[9px] font-black ring-2 ring-white dark:ring-[#141622]">BG</span>
              </div>
              <p className="text-[11px] text-[#86868b] dark:text-slate-400 truncate">
                Equipo <strong className="text-[#1d1d1f] dark:text-white">Acústica de Recintos 2026</strong> · Daniel A., Jeronimo G., Brandon G.
              </p>
            </div>
          </div>
        </div>

        {/* 2. TARJETA DERECHA: Visualizador 3D + Salas de Ejemplo */}
        <div className="lg:col-span-6 bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-apple-sm transition-colors space-y-4">
          {/* Header del visor 3D */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/10">
            <div>
              <h3 className="text-xs font-bold tracking-wider uppercase text-[#1d1d1f] dark:text-white">
                Vista 3D de la Sala Activa
              </h3>
              <p className="text-[11px] text-[#86868b] dark:text-slate-400">
                Gira con el clic izquierdo · Haz zoom con la rueda del mouse
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#10b981] bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              <span title="Volumen total de aire en el recinto">V = {geometry?.volume ? geometry.volume.toFixed(1) : '180.0'} m³</span>
              <span className="text-[#86868b]">&bull;</span>
              <span title="Distancia crítica: hasta dónde predomina el sonido directo sobre el eco">
                Dc = {criticalDistance ? criticalDistance.toFixed(2) : '0.51'} m
              </span>
            </div>
          </div>

          {/* Canvas 3D */}
          <div className="rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] bg-[#0A0C14]">
            <RoomVisualizer
              roomPolygon={roomPolygon}
              geometry={geometry}
              dimensions={dimensions}
              sourceReceiver={sourceReceiver}
              criticalDistance={criticalDistance}
              materials={materials}
              selectedBand={selectedBand}
            />
          </div>

          {/* Selector Rápido de Salas de Ejemplo */}
          {onLoadPreset && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
                <FolderOpen className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#a78bfa]" />
                <span>¿Prefieres probar con una sala ya configurada? Haz clic en un ejemplo:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onLoadPreset(p.id);
                        goTo('overview');
                      }}
                      className={`text-left p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-[#5833c7] bg-[#5833c7]/10 dark:bg-[#5833c7]/20'
                          : 'border-black/[0.06] dark:border-white/10 bg-[#fbfbfd] dark:bg-[#0A0C14] hover:border-[#5833c7]/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{p.label}</div>
                      <div className="text-[10px] font-mono text-[#86868b] dark:text-slate-400 truncate mt-0.5">{p.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          FILA INFERIOR: LABORATORIOS ESPECIALIZADOS (ACCESO DIRECTO)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => goTo('modes')}
          className="text-left bg-white dark:bg-[#141622] p-5 rounded-2xl border border-black/[0.08] dark:border-white/10 hover:border-[#5833c7]/50 shadow-apple-sm transition group cursor-pointer flex flex-col justify-between gap-3"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa] flex items-center justify-center">
                <Waves className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#5833c7] dark:text-[#a78bfa] bg-[#5833c7]/10 px-2 py-0.5 rounded-full">
                Bajas Frecuencias
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#a78bfa] transition">
              Laboratorio de Modos Propios (Graves)
            </h4>
            <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
              Descubre dónde retumban o se cancelan los bajos en cuartos pequeños, evalúa el criterio de Bonello y optimiza las proporciones con el diagrama de Bolt.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#5833c7] dark:text-[#a78bfa] inline-flex items-center gap-1">
            Abrir análisis modal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => goTo('intelligibility')}
          className="text-left bg-white dark:bg-[#141622] p-5 rounded-2xl border border-black/[0.08] dark:border-white/10 hover:border-[#5833c7]/50 shadow-apple-sm transition group cursor-pointer flex flex-col justify-between gap-3"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Claridad de Palabra
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#a78bfa] transition">
              Laboratorio de Inteligibilidad (%ALcons y STI)
            </h4>
            <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
              Verifica si en un salón de clases, auditorio o templo se entienden claramente las consonantes, añade personas y compara antes vs. después del tratamiento.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#5833c7] dark:text-[#a78bfa] inline-flex items-center gap-1">
            Evaluar claridad de voz <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => goTo('diffusers')}
          className="text-left bg-white dark:bg-[#141622] p-5 rounded-2xl border border-black/[0.08] dark:border-white/10 hover:border-[#5833c7]/50 shadow-apple-sm transition group cursor-pointer flex flex-col justify-between gap-3"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Grid3x3 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Fabricación a Medida
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#a78bfa] transition">
              Laboratorio de Difusores (QRD / PRD / MLS)
            </h4>
            <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
              Calcula las ranuras y profundidades de tu difusor acústico según la banda de frecuencia, visualiza su respuesta polar y descarga la lista de corte.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#5833c7] dark:text-[#a78bfa] inline-flex items-center gap-1">
            Diseñar un difusor <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </span>
        </button>
      </div>
    </div>
  );
}
