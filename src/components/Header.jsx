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
} from 'lucide-react';
import { ROOM_PRESETS } from '../utils/roomPresets';
import { PozoleLogo } from './PozoleLogo';

/**
 * Encabezado
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
}) {
  // Título legible según la sección activa
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
    <header className="bg-white/80 backdrop-blur-xl border-b border-black/[0.08] sticky top-0 z-30 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">

        {/* Lado Izquierdo: Botón Hamburguesa + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl transition border flex items-center justify-center active:scale-95 ${
              isSidebarOpen
                ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/30'
                : 'bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] border-black/[0.06]'
            }`}
            title={isSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral de módulos"}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* Contenedor del nombre POZOLE con Tooltip al hacer hover */}
            <div className="relative group cursor-pointer flex items-center gap-2">
              <PozoleLogo size={28} className="transition-transform duration-200 group-hover:scale-105" />
              <span className="text-sm font-black tracking-wider text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                POZOLE
              </span>

              {/* Tooltip Emergente al Hacer Hover */}
              <div className="absolute left-0 top-full mt-2 hidden group-hover:flex flex-col gap-1 w-72 p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.08] shadow-apple-lg z-50 text-xs transition-all pointer-events-none">
                <div className="font-bold text-[#0071e3] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>POZOLE</span>
                </div>
                <div className="text-[#1d1d1f] font-medium leading-snug">
                  Propagación de Ondas en Zonas y Optimización de Límites Espaciales
                </div>
                <div className="text-[10px] text-[#86868b] mt-1 pt-1 border-t border-black/[0.06]">
                  Simulador de acústica física e ingeniería de recintos
                </div>
              </div>
            </div>

            <ChevronRight className="hidden sm:inline-block w-3.5 h-3.5 text-slate-300" />
            <h2 className="text-sm font-bold text-[#1d1d1f] tracking-tight">
              {sectionTitles[activeSection] || 'Simulador'}
            </h2>
          </div>
        </div>

        {/* Lado Derecho: Selector de Preset + Botones de Acción */}
        <div className="flex items-center gap-2">

          {/* Selector de Presets rápido en barra superior */}
          <div className="hidden md:flex items-center">
            <select
              value={selectedPresetId || ''}
              onChange={(e) => onLoadPreset(e.target.value)}
              className="bg-[#f5f5f7] hover:bg-[#e8e8ed] text-xs font-semibold text-[#1d1d1f] px-3 py-1.5 rounded-xl border border-black/[0.06] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition cursor-pointer"
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-xs font-semibold border border-black/[0.06] transition"
            title="Ver ecuaciones teóricas"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Formulario</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={onExportCSV}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-emerald-700 text-xs font-semibold border border-black/[0.06] transition"
            title="Exportar archivo CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          {/* Informe Técnico Formal */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-apple-sm transition transform active:scale-95"
            title="Generar e imprimir informe técnico"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Informe Técnico</span>
          </button>

          {/* Restablecer Sala */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-xl bg-[#f5f5f7] hover:bg-rose-50 text-[#86868b] hover:text-rose-600 border border-black/[0.06] transition"
            title="Restablecer valores originales"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
