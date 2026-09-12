import React from 'react';
import {
  Menu,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  BookOpen,
  Waves,
  Layers,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { ROOM_PRESETS } from '../utils/roomPresets';
import { PozoleLogo } from './PozoleLogo';

/**
 * Encabezado con soporte completo de Dark Mode y acciones rápidas
 */
export default function Header({
  onToggleSidebar,
  isSidebarOpen,
  activeSection,
  onReset,
  onExportCSV,
  onOpenReport,
  onOpenTheoryModal,
  onLoadPreset,
  selectedPresetId,
  isDarkMode,
  onToggleDarkMode,
}) {
  // Título según la sección activa
  const sectionTitles = {
    overview: 'Panel General y Vista 3D',
    geometry: '1. Dimensiones y Geometría',
    materials: '2. Materiales y Coeficientes',
    source: '3. Fuente Sonora y Receptor',
    results: '4. Parámetros Acústicos',
    charts: '5. Gráficas Interactivas',
    all: 'Estudio Completo de la Sala',
  };

  return (
    <header className="bg-white/85 dark:bg-[#0c0d16]/90 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] sticky top-0 z-30 px-2.5 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="flex items-center justify-between gap-1.5 sm:gap-4">

        {/* Lado Izquierdo: Botón Hamburguesa + Breadcrumbs */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl transition border flex items-center justify-center active:scale-95 shrink-0 ${isSidebarOpen
              ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30'
              : 'bg-[#f5f5f7] dark:bg-[#181a28] hover:bg-[#e8e8ed] dark:hover:bg-[#222438] text-[#1d1d1f] dark:text-slate-200 border-black/[0.06] dark:border-white/[0.08]'
              }`}
            title={isSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral de módulos"}
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Contenedor del nombre POZOLE con Tooltip al hacer hover */}
            <div className="relative group cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0">
              <PozoleLogo size={24} className="sm:w-7 sm:h-7 transition-transform duration-200 group-hover:scale-105" />
              <span className="text-xs sm:text-sm font-black tracking-wider text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#8767f9] transition-colors">
                POZOLE
              </span>

              {/* Tooltip Emergente al Hacer Hover */}
              <div className="absolute left-0 top-full mt-2 hidden group-hover:flex flex-col gap-1 w-72 p-3 bg-white/95 dark:bg-[#121320]/95 backdrop-blur-md rounded-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-apple-lg z-50 text-xs transition-all pointer-events-none">
                <div className="font-bold text-[#5833c7] dark:text-[#8767f9] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#8767f9]" />
                  <span>POZOLE</span>
                </div>
                <div className="text-[#1d1d1f] dark:text-slate-200 font-medium leading-snug">
                  Propagación de Ondas en Zonas y Optimización de Límites Espaciales
                </div>
                <div className="text-[10px] text-[#86868b] dark:text-slate-400 mt-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                  Simulador de acústica física e ingeniería de recintos
                </div>
              </div>
            </div>

            <ChevronRight className="hidden sm:inline-block w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white tracking-tight truncate max-w-[100px] xs:max-w-[160px] sm:max-w-none">
              {sectionTitles[activeSection] || 'Simulador'}
            </h2>
          </div>
        </div>

        {/* Lado Derecho: Selector de Preset + Botones de Acción */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          {/* Selector de Presets rápido en barra superior */}
          <div className="hidden md:flex items-center">
            <select
              value={selectedPresetId || ''}
              onChange={(e) => onLoadPreset(e.target.value)}
              className="bg-[#f5f5f7] dark:bg-[#181a28] hover:bg-[#e8e8ed] dark:hover:bg-[#202236] text-xs font-semibold text-[#1d1d1f] dark:text-slate-200 px-3 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#5833c7]/30 transition cursor-pointer"
            >
              <option value="" disabled>Escenario / Preset...</option>
              {ROOM_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Formulario Físico */}
          <button
            onClick={onOpenTheoryModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#181a28] hover:bg-[#e8e8ed] dark:hover:bg-[#202236] text-[#1d1d1f] dark:text-slate-200 text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] transition"
            title="Ver ecuaciones teóricas"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Formulario</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={onExportCSV}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#181a28] hover:bg-[#e8e8ed] dark:hover:bg-[#202236] text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] transition"
            title="Exportar archivo CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* Informe Técnico Formal */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] text-white text-xs font-semibold shadow-apple-sm transition transform active:scale-95"
            title="Generar e imprimir informe técnico"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Informe Técnico</span>
            <span className="inline sm:hidden text-[11px]">Informe</span>
          </button>

          {/* Botón Alternar Dark Mode / Light Mode */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-[#e8e8ed] dark:hover:bg-[#25283f] text-[#5833c7] dark:text-[#8767f9] border border-black/[0.06] dark:border-white/[0.08] transition shadow-2xs flex items-center justify-center active:scale-95"
            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-[#5833c7]" />
            )}
          </button>

          {/* Restablecer Sala */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#86868b] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-black/[0.06] dark:border-white/[0.08] transition"
            title="Restablecer valores originales"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
