import React from 'react';
import { 
  Compass,
  Activity,
  Volume2,
  Printer,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PozoleLogo } from './PozoleLogo';
import RoomVisualizer from './RoomVisualizer';

/**
 * WelcomeHero — Página de Bienvenida y Presentación del Simulador POZOLE
 * Diseño Bento Grid inspirado en Linear y SaaS técnico de alto nivel.
 * Desarrollado por el equipo de Acústica de Recintos 2026: Daniel A., Jeronimo G., Brandon G.
 */
export default function WelcomeHero({
  onEnterStudio,
  onEnter,
  roomPolygon,
  geometry,
  dimensions,
  sourceReceiver,
  criticalDistance,
  materials,
  selectedBand = 1000,
}) {
  const handleEnter = onEnterStudio || onEnter;

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto py-1">
      
      {/* =========================================================================
          FILA SUPERIOR BENTO GRID: TARJETA PRESENTACIÓN + VISUALIZADOR 3D
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. TARJETA GRANDE IZQUIERDA (Presentación) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-apple-sm relative overflow-hidden transition-colors">
          
          <div className="space-y-4">
            {/* Etiqueta morada superior */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5833c7]/10 dark:bg-[#5833c7]/20 border border-[#5833c7]/30 text-[#5833c7] dark:text-[#a78bfa] text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#5833c7] dark:bg-[#a78bfa] animate-pulse" />
              <span>Simulador de Ingeniería Acústica • v3.0</span>
            </div>

            {/* Título y Subtítulo */}
            <div>
              <div className="flex items-center gap-3">
                <PozoleLogo size={40} className="shrink-0" />
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1d1d1f] dark:text-white">
                  POZOLE
                </h1>
              </div>
              <p className="text-sm sm:text-base font-semibold text-[#5833c7] dark:text-[#c4b5fd] mt-2">
                Propagación de Ondas en Zonas y Optimización de Límites Espaciales
              </p>
            </div>

            {/* Párrafo breve explicativo */}
            <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-300 leading-relaxed font-normal">
              Suite técnica para simulación de recintos cerrados, cálculo de tiempos de reverberación (Sabine, Eyring y Millington), análisis modal ondulatorio, atenuación sonora directa y distancia crítica con soporte de normativas ISO 3382 y DIN 18041.
            </p>
          </div>

          <div className="space-y-4 pt-6">
            {/* Integrantes en una sola línea muy discreta y compacta */}
            <div className="flex items-center gap-3 py-3 px-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06]">
              {/* Círculos pequeños con iniciales DA, JG, BG */}
              <div className="flex -space-x-1.5 shrink-0">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#361b8c] to-[#5833c7] text-white text-[10px] font-black ring-2 ring-white dark:ring-[#141622] shadow-xs"
                  title="Daniel Angulo"
                >
                  DA
                </span>
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#059669] to-[#10b981] text-white text-[10px] font-black ring-2 ring-white dark:ring-[#141622] shadow-xs"
                  title="Jeronimo Gomez"
                >
                  JG
                </span>
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#d97706] to-[#f59e0b] text-white text-[10px] font-black ring-2 ring-white dark:ring-[#141622] shadow-xs"
                  title="Brandon Guerra"
                >
                  BG
                </span>
              </div>

              {/* Texto explicativo en una sola línea */}
              <p className="text-[11px] sm:text-xs text-[#86868b] dark:text-slate-300 truncate">
                Desarrollado por el equipo de <span className="font-semibold text-[#1d1d1f] dark:text-white">Acústica de Recintos 2026</span> (Daniel A., Jeronimo G., Brandon G.)
              </p>
            </div>

            {/* Botón grande morado llamativo con flecha */}
            <button
              type="button"
              onClick={handleEnter}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#5833c7] hover:bg-[#4726aa] text-white font-bold text-sm sm:text-base shadow-lg shadow-[#5833c7]/25 hover:shadow-[#5833c7]/40 transition transform active:scale-95 cursor-pointer"
            >
              <span>Entrar al Estudio Acústico</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>

        {/* 2. TARJETA GRANDE DERECHA (Visualizador 3D) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-apple-sm transition-colors">
          
          {/* Header del visor 3D */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/10 mb-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-[#1d1d1f] dark:text-white">
              RECINTO TRIDIMENSIONAL EN TIEMPO REAL
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#10b981]">
              <span>r = 3.0m</span>
              <span className="text-[#86868b]">&bull;</span>
              <span>Dc = {criticalDistance ? criticalDistance.toFixed(2) : '0.51'}m</span>
              <span className="text-[#86868b]">&bull;</span>
              <span>V = {geometry?.volume ? geometry.volume.toFixed(1) : '180.0'}m³</span>
            </div>
          </div>

          {/* Canvas 3D con fondo casi negro */}
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

          <div className="pt-3 flex items-center justify-between text-[11px] text-[#86868b] dark:text-slate-400 font-mono">
            <span>Interacción orbital 3D / Proyección en planta</span>
            <span className="text-[#5833c7] dark:text-[#a78bfa] font-bold">Simulación Continua</span>
          </div>

        </div>

      </div>

      {/* =========================================================================
          FILA INFERIOR BENTO GRID: CUATRO TARJETAS PEQUEÑAS LIMPIAS
          Sin sombreado morado de fondo, texto gris plano para lectura fluida
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tarjeta 1: Geometría Arbitraria */}
        <div className="bg-white dark:bg-[#141622] p-5 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-apple-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f] dark:text-white flex items-center justify-center font-bold">
            <Compass className="w-4 h-4 text-[#86868b] dark:text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Geometría Arbitraria
          </h4>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed font-normal">
            Modelado paramétrico de plantas poligonales libres con N paredes, curvaturas acústicas continuas y algoritmo de Gauss para el volumen exacto.
          </p>
        </div>

        {/* Tarjeta 2: Modelos de Reverberación */}
        <div className="bg-white dark:bg-[#141622] p-5 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-apple-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f] dark:text-white flex items-center justify-center font-bold">
            <Activity className="w-4 h-4 text-[#86868b] dark:text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Modelos de Reverberación
          </h4>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed font-normal">
            Cálculo analítico multimodelo por octavas con fórmulas de Sabine, Norris-Eyring y Millington-Sette comparadas frente a valores objetivo de diseño.
          </p>
        </div>

        {/* Tarjeta 3: Directividad Q */}
        <div className="bg-white dark:bg-[#141622] p-5 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-apple-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f] dark:text-white flex items-center justify-center font-bold">
            <Volume2 className="w-4 h-4 text-[#86868b] dark:text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Directividad Q
          </h4>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed font-normal">
            Predicción de la presión sonora directa vs reverberada, cálculo de distancia crítica Dc y factores de directividad geométrica Q de 1 a 8.
          </p>
        </div>

        {/* Tarjeta 4: Informe Imprimible */}
        <div className="bg-white dark:bg-[#141622] p-5 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-apple-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f] dark:text-white flex items-center justify-center font-bold">
            <Printer className="w-4 h-4 text-[#86868b] dark:text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Informe Imprimible
          </h4>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed font-normal">
            Generador de memorias técnicas formales en PDF o impresión con tablas de absorción por superficie, gráficas de decaimiento y firmas periciales.
          </p>
        </div>

      </div>

    </div>
  );
}
