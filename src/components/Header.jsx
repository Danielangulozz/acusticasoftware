import React from 'react';
import {
  Menu,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  BookOpen,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
  FolderOpen,
} from 'lucide-react';
import { ROOM_PRESETS } from '../utils/roomPresets';
import { PozoleLogo } from './PozoleLogo';

const WORKFLOW_STEPS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'geometry', step: '1', label: 'Geometría' },
  { id: 'materials', step: '2', label: 'Materiales' },
  { id: 'source', step: '3', label: 'Fuente' },
  { id: 'results', step: '4', label: 'Resultados' },
  { id: 'charts', step: '5', label: 'Gráficas' },
];

const LAB_SHORTCUTS = [
  { id: 'modes', label: 'Modos (Graves)' },
  { id: 'intelligibility', label: 'Voz (%ALcons)' },
  { id: 'diffusers', label: 'Difusores' },
];

/**
 * Encabezado superior con barra de progreso paso a paso, selector de salas de ejemplo y acciones rápidas.
 */
export default function Header({
  onToggleSidebar,
  isSidebarOpen,
  activeSection,
  setActiveSection,
  onReset,
  onExportCSV,
  onOpenReport,
  onOpenTheoryModal,
  onLoadPreset,
  selectedPresetId,
  isDarkMode,
  onToggleDarkMode,
  saveStatus = 'saved',
}) {
  const sectionTitles = {
    welcome: 'Guía de Inicio Rápido',
    overview: 'Panel General y Diagnóstico 3D',
    geometry: 'Paso 1 · Dimensiones y Geometría',
    materials: 'Paso 2 · Materiales y Absorción',
    source: 'Paso 3 · Fuente Sonora y Oyente',
    results: 'Paso 4 · Resultados y Reverberación',
    charts: 'Paso 5 · Gráficas Acústicas',
    modes: 'Lab · Modos Propios y Graves',
    intelligibility: 'Lab · Inteligibilidad de la Voz',
    diffusers: 'Lab · Diseño de Difusores',
    all: 'Vista de Estudio Completo',
  };

  return (
    <header className="bg-white/90 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/10 sticky top-0 z-30 transition-colors">
      {/* Fila Principal */}
      <div className="px-2.5 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Lado Izquierdo: Botón Menú + Ubicación Actual */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl transition border flex items-center justify-center active:scale-95 shrink-0 ${
              isSidebarOpen
                ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border-[#5833c7]/30'
                : 'bg-[#f5f5f7] dark:bg-[#141622] hover:bg-[#e8e8ed] dark:hover:bg-[#1c1d2d] text-[#1d1d1f] dark:text-slate-200 border-black/[0.06] dark:border-white/10'
            }`}
            title={isSidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú de pasos'}
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setActiveSection && setActiveSection('welcome')}
              className="flex items-center gap-1.5 sm:gap-2 shrink-0 group cursor-pointer"
              title="Ir a la Guía de Inicio"
            >
              <PozoleLogo size={24} className="sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-105" />
              <span className="text-xs sm:text-sm font-black tracking-wider text-[#1d1d1f] dark:text-white group-hover:text-[#5833c7] dark:group-hover:text-[#8767f9] transition-colors">
                POZOLE
              </span>
            </button>

            <ChevronRight className="hidden sm:inline-block w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
              {sectionTitles[activeSection] || 'Simulador'}
            </h2>

            {/* Indicador de autoguardado */}
            <div
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-500/20 ml-1 select-none"
              title="Tus cambios se guardan automáticamente en este navegador"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>{saveStatus === 'saving' ? 'Guardando...' : 'Autoguardado'}</span>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Sala de Ejemplo + Reportes */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Selector de Sala de Ejemplo (Preset) */}
          <div className="hidden md:flex items-center relative">
            <FolderOpen className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#a78bfa] absolute left-3 pointer-events-none" />
            <select
              value={selectedPresetId || ''}
              onChange={(e) => onLoadPreset(e.target.value)}
              className="bg-[#f5f5f7] dark:bg-[#141622] hover:bg-[#e8e8ed] dark:hover:bg-[#1c1d2d] text-xs font-semibold text-[#1d1d1f] dark:text-slate-200 pl-8 pr-3 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#5833c7]/30 transition cursor-pointer"
              title="Carga una sala real preconfigurada para explorar cómo funciona el simulador"
            >
              <option value="" disabled>Cargar sala de ejemplo...</option>
              {ROOM_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fórmulas */}
          <button
            onClick={onOpenTheoryModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#181a28] hover:bg-[#e8e8ed] dark:hover:bg-[#202236] text-[#1d1d1f] dark:text-slate-200 text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] transition"
            title="Ver formulario físico y explicación de ecuaciones"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden lg:inline">Fórmulas</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={onExportCSV}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#181a28] hover:bg-[#e8e8ed] dark:hover:bg-[#202236] text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] transition"
            title="Exportar datos a Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* Informe Técnico Formal */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] text-white text-xs font-semibold shadow-apple-sm transition transform active:scale-95"
            title="Generar e imprimir informe técnico en PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Informe PDF</span>
            <span className="inline sm:hidden text-[11px]">Informe</span>
          </button>

          {/* Modo Claro / Oscuro */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-[#e8e8ed] dark:hover:bg-[#25283f] text-[#5833c7] dark:text-[#8767f9] border border-black/[0.06] dark:border-white/[0.08] transition flex items-center justify-center active:scale-95"
            title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#5833c7]" />
            )}
          </button>

          {/* Reiniciar */}
          <button
            onClick={() => {
              if (window.confirm('¿Deseas restablecer todos los parámetros del proyecto a los valores iniciales?')) {
                onReset();
              }
            }}
            className="p-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#86868b] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-black/[0.06] dark:border-white/[0.08] transition"
            title="Reiniciar proyecto a valores de fábrica"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra Secundaria de Flujo Paso a Paso (Stepper Rápido) */}
      {setActiveSection && activeSection !== 'welcome' && (
        <div className="px-2.5 sm:px-6 py-1.5 bg-[#f5f5f7]/70 dark:bg-[#121422]/80 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-500 mr-1 hidden sm:inline">
              Ruta:
            </span>
            {WORKFLOW_STEPS.map((item, idx) => {
              const isActive = activeSection === item.id;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#5833c7] text-white shadow-2xs'
                        : 'text-[#1d1d1f]/75 dark:text-slate-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {item.step && (
                      <span
                        className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold inline-flex items-center justify-center ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-black/[0.07] dark:bg-white/10 text-[#1d1d1f] dark:text-slate-300'
                        }`}
                      >
                        {item.step}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </button>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-black/[0.08] dark:border-white/10 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-500 mr-1 hidden lg:inline">
              Labs:
            </span>
            {LAB_SHORTCUTS.map((lab) => {
              const isActive = activeSection === lab.id;
              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setActiveSection(lab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#5833c7] text-white shadow-2xs'
                      : 'bg-white/70 dark:bg-white/[0.04] text-[#5833c7] dark:text-[#a78bfa] border border-[#5833c7]/20 hover:bg-[#5833c7]/10'
                  }`}
                >
                  {lab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
