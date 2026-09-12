import React, { useState } from 'react';
import {
  Github,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Waves,
  Music,
  Headphones,
  CheckCircle2,
  Code2,
  Sliders,
  Award
} from 'lucide-react';
import { PozoleLogo } from './PozoleLogo';

/**
 * Footer — Pie de Página Profesional y Personalizado
 * Desarrollado para Daniel Angulo (Ingeniería de Sonido - Acústica de Recintos)
 */
export default function Footer() {
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  return (
    <footer className="border-t border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#0c0d16]/90 backdrop-blur-xl py-6 text-xs text-[#86868b] dark:text-slate-400 mt-auto no-print transition-colors duration-300 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-5">


        {/* Lado Izquierdo: Branding POZOLE v3.0 */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <PozoleLogo size={22} className="shrink-0" />
            <span className="font-black text-[#1d1d1f] dark:text-white tracking-wider text-sm">POZOLE</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#5833c7]/10 dark:bg-[#8767f9]/20 border border-[#5833c7]/20 text-[#5833c7] dark:text-[#8767f9] font-mono text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5833c7] dark:bg-[#8767f9] animate-pulse" />
              v3.0
            </span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="text-[#86868b] dark:text-slate-400 text-xs max-w-sm sm:max-w-none">
            Propagación de Ondas en Zonas y Optimización de Límites Espaciales
          </span>
        </div>

        {/* Lado Derecho: Autor Daniel Angulo + Repositorio GitHub */}
        <div className="flex flex-wrap items-center justify-center gap-3">

          {/* Badge Interactivo del Autor con Hover Card Épica en Moradito Oscuro */}
          <div
            className="relative"
            onMouseEnter={() => setIsTooltipHovered(true)}
            onMouseLeave={() => setIsTooltipHovered(false)}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5833c7]/10 via-[#7c3aed]/10 to-[#4726aa]/10 hover:from-[#5833c7]/20 hover:via-[#7c3aed]/20 hover:to-[#4726aa]/20 border border-[#5833c7]/30 dark:border-[#8767f9]/30 text-[#1d1d1f] dark:text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-apple-sm hover:scale-[1.02] active:scale-95 group"
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#361b8c] to-[#5833c7] text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                DA
              </div>
              <span className="text-slate-500 dark:text-slate-400 font-normal">Hecho por:</span>
              <span className="font-extrabold text-[#5833c7] dark:text-[#8767f9] group-hover:underline decoration-2 underline-offset-2">
                Daniel Angulo
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            {/* Hover Popover Card ("Bien Bacano" en Moradito Oscuro Elegante) */}
            <div
              className={`absolute bottom-full right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mb-3 w-80 sm:w-88 p-4 rounded-2xl bg-white/95 dark:bg-[#121320]/95 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.12] shadow-apple-hover transition-all duration-300 z-50 pointer-events-auto ${isTooltipHovered
                ? 'opacity-100 translate-y-0 visible scale-100'
                : 'opacity-0 translate-y-2 invisible scale-95'
                }`}
            >
              {/* Barra superior con gradiente moradito acústico profesional */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#361b8c] via-[#5833c7] to-[#7c3aed] rounded-full mb-3" />

              {/* Encabezado con Avatar y Rol */}
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#361b8c] via-[#5833c7] to-[#7c3aed] text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-white/50 dark:ring-white/10">
                    DA
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#5833c7] border-2 border-white dark:border-[#121320] flex items-center justify-center">
                    <Waves className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-sm text-[#1d1d1f] dark:text-white truncate">
                      Daniel Angulo
                    </h4>
                    <span className="px-1.5 py-0.2 rounded bg-[#5833c7]/15 text-[#5833c7] dark:text-[#8767f9] font-mono text-[9px] font-bold">
                      Lead
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#5833c7] dark:text-[#8767f9] flex items-center gap-1 mt-0.5">
                    <Headphones className="w-3 h-3 shrink-0" />
                    Estudiante de Ingeniería de Sonido
                  </p>
                </div>
              </div>

              {/* Contexto Académico del Proyecto */}
              <div className="mt-3 p-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#181a28] border border-black/[0.04] dark:border-white/[0.06] text-[11px] leading-relaxed text-[#1d1d1f] dark:text-slate-200">
                <div className="flex items-center gap-1.5 font-bold text-[#1d1d1f] dark:text-white mb-1">
                  <GraduationCap className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#8767f9]" />
                  <span>Curso de Acústica de Recintos</span>
                </div>
                <p className="text-[#86868b] dark:text-slate-400 text-[10.5px]">
                  Software desarrollado para la simulación precisa de tiempos de reverberación (Sabine, Eyring, Millington), atenuación por distancia crítica y geometría de salas de planta arbitraria.
                </p>
              </div>

              {/* Tags de Tecnologías / Badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#5833c7]/10 text-[#5833c7] dark:text-[#8767f9] text-[9.5px] font-bold">
                  Acústica Física
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#7c3aed]/10 text-[#7c3aed] dark:text-purple-300 text-[9.5px] font-bold">
                  RT60 / Sab / Eyr / Mil
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#5833c7]/10 text-[#5833c7] dark:text-[#8767f9] text-[9.5px] font-bold">
                  Geometría Poligonal
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9.5px] font-bold">
                  React + Vite
                </span>
              </div>

              {/* Enlace directo a GitHub de Daniel */}
              <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                <a
                  href="https://github.com/Danielangulozz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#5833c7] dark:text-[#8767f9] hover:underline flex items-center gap-1"
                >
                  <Github className="w-3.5 h-3.5" />
                  github.com/Danielangulozz
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-[10px] text-[#86868b] dark:text-slate-500 font-mono">
                  2026
                </span>
              </div>

              {/* Flechita del popover */}
              <div className="absolute top-full right-8 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-white dark:bg-[#121320] border-r border-b border-black/[0.1] dark:border-white/[0.12] rotate-45" />
            </div>
          </div>

          <span className="text-[#86868b] dark:text-slate-600">•</span>

          {/* Botón / Enlace Directo al Repositorio de GitHub */}
          <a
            href="https://github.com/Danielangulozz/acusticasoftware"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#181926] hover:bg-[#e8e8ed] dark:hover:bg-[#222436] text-[#1d1d1f] dark:text-white border border-black/[0.08] dark:border-white/[0.1] transition-all duration-200 group active:scale-95 shadow-2xs hover:border-[#5833c7]/40 dark:hover:border-[#8767f9]/40"
            title="Ver repositorio de código abierto en GitHub"
          >
            <Github className="w-4 h-4 text-[#1d1d1f] dark:text-white transition-transform group-hover:scale-110" />
            <span className="font-semibold text-xs tracking-tight">
              Repositorio GitHub
            </span>
            <ExternalLink className="w-3 h-3 text-[#86868b] dark:text-slate-400 group-hover:text-[#5833c7] dark:group-hover:text-[#8767f9] transition-colors" />
          </a>

        </div>

      </div>
    </footer>
  );
}
