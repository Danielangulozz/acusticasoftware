import React from 'react';
import { 
  Volume2, 
  Layers, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  User, 
  Users,
  GraduationCap, 
  Building2,
  Compass,
  Cpu
} from 'lucide-react';
import { PozoleLogo } from './PozoleLogo';
import RoomVisualizer from './RoomVisualizer';

/**
 * WelcomeHero — Página de Bienvenida y Presentación del Simulador POZOLE
 * Desarrollado por el equipo de Ingeniería de Sonido: Daniel Angulo, Jeronimo Gomez y Brandon Guerra
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
  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto py-2">
      
      {/* Hero Principal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#faf9fe] to-[#f4f0ff] dark:from-[#111322] dark:via-[#141628] dark:to-[#1a1735] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-10 shadow-apple-lg">
        
        {/* Glow de fondo decorativo */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#5833c7]/10 dark:bg-[#8767f9]/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Columna Izquierda: Información, Título y Autor */}
          <div className="lg:col-span-6 space-y-5 text-center sm:text-left">
            
            {/* Tag Superior */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5833c7]/10 dark:bg-[#8767f9]/20 border border-[#5833c7]/20 text-[#5833c7] dark:text-[#8767f9] text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#5833c7] dark:bg-[#8767f9] animate-ping" />
              <span>Simulador de Ingeniería Acústica · v3.0</span>
            </div>

            {/* Logo y Nombre */}
            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <PozoleLogo size={42} className="shrink-0" />
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1d1d1f] dark:text-white">
                  POZOLE
                </h1>
              </div>
              <p className="text-sm font-semibold text-[#5833c7] dark:text-[#8767f9]">
                Propagación de Ondas en Zonas y Optimización de Límites Espaciales
              </p>
            </div>

            <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-300 leading-relaxed max-w-xl">
              Suite integral para el cálculo de tiempos de reverberación, modelado de geometrías complejas, 
              atenuación de campo sonoro directo/reverberado y cumplimiento de normativas internacionales 
              (ISO 3382, ISO 3741 y DIN 18041).
            </p>

            {/* Tarjeta Destacada de Integrantes del Grupo */}
            <div className="p-4 rounded-2xl bg-white/85 dark:bg-[#181a2e]/90 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.08] shadow-2xs space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] dark:text-white">
                  <Users className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
                  <span>Integrantes del Proyecto</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] text-[10px] font-bold font-mono">
                  Acústica de Recintos 2026
                </span>
              </div>

              {/* Lista de los 3 Integrantes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Daniel Angulo', initials: 'DA', color: 'from-[#361b8c] to-[#5833c7]' },
                  { name: 'Jeronimo Gomez', initials: 'JG', color: 'from-[#059669] to-[#10b981]' },
                  { name: 'Brandon Guerra', initials: 'BG', color: 'from-[#d97706] to-[#f59e0b]' },
                ].map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-2 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] hover:border-[#5833c7]/30 transition group"
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${member.color} text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs`}>
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate group-hover:text-[#5833c7] dark:group-hover:text-[#8767f9] transition-colors">
                        {member.name}
                      </p>
                      <p className="text-[10px] text-[#86868b] dark:text-slate-400 truncate font-mono">
                        Ing. de Sonido
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#86868b] dark:text-slate-400 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                <GraduationCap className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#8767f9] shrink-0" />
                <span>Facultad de Ingeniería · Asignatura: Acústica de Recintos</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={onEnterStudio || onEnter}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#5833c7] hover:bg-[#4726aa] text-white font-bold text-sm shadow-apple-sm hover:shadow-apple-hover transition transform active:scale-95"
              >
                <span>Entrar al Estudio Acústico</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Columna Derecha: Vista 3D Giratoria en Vivo */}
          <div className="lg:col-span-6 space-y-2">
            <div className="text-xs font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
              <span>Recinto Tridimensional en Tiempo Real</span>
              <span className="text-[10px] text-[#5833c7] dark:text-[#8767f9] font-mono font-bold">
                {geometry?.volume ? geometry.volume.toFixed(1) : '180'} m³ · ISO 3382
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm bg-white dark:bg-[#0c0d18]">
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
            <p className="text-[10px] text-[#86868b] text-center font-mono">
              Orbita con el ratón o usa los botones de la barra superior
            </p>
          </div>

        </div>

      </div>

      {/* Características del Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Característica 1 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm space-y-2">
          <div className="w-9 h-9 rounded-xl bg-[#5833c7]/10 text-[#5833c7] dark:text-[#8767f9] flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Geometría Arbitraria y Curva
          </h3>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
            Dibuja plantas de N lados, aplica curvatura a paredes y escala aristas con cálculo exacto mediante algoritmo de Gauss.
          </p>
        </div>

        {/* Característica 2 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Modelos de Reverberación
          </h3>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
            Comparación rigurosa de fórmulas clásicas: Sabine, Norris-Eyring y Millington-Sette por 6 bandas de octava (125 Hz a 4 kHz).
          </p>
        </div>

        {/* Característica 3 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Volume2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Directividad Q e ISO 3382
          </h3>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
            Atenuación espacial directa y cálculo de distancia crítica Dc. Verificación automática de directividades Q = 1, 2, 4 y 8.
          </p>
        </div>

        {/* Característica 4 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
            Informe Técnico Imprimible
          </h3>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
            Genera memorias acústicas formales con tablas completas, gráficas 3D, curvas de absorción y firmas técnicas.
          </p>
        </div>

      </div>

    </div>
  );
}
