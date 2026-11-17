import React from 'react';
import { FileSpreadsheet, FolderOpen, Menu, Moon, Printer, RotateCcw, Sun } from 'lucide-react';
import { ROOM_PRESETS } from '../utils/roomPresets';
import { SECTION_BY_ID } from './suiteSections';

/**
 * Cabecera de POZOLE Suite: dónde estás (título y una línea de ayuda) y las acciones del
 * proyecto. La navegación entre módulos vive solo en el menú lateral.
 */
export default function Header({
  onToggleSidebar,
  isSidebarOpen,
  activeSection,
  onReset,
  onExportCSV,
  onOpenReport,
  onLoadPreset,
  selectedPresetId,
  isDarkMode,
  onToggleDarkMode,
  saveStatus = 'saved',
}) {
  const section = SECTION_BY_ID[activeSection] ?? { title: 'POZOLE Suite', hint: '' };
  const ghost = 'bg-[#f5f5f7] dark:bg-surface hover:bg-[#e8e8ed] dark:hover:bg-surface2 border border-black/[0.06] dark:border-white/10 transition';

  return (
    <header className="bg-white/90 dark:bg-canvas/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/10 sticky top-0 z-30 transition-colors">
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Dónde estás */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl flex items-center justify-center active:scale-95 shrink-0 ${
              isSidebarOpen ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] border border-[#5833c7]/30 transition' : `${ghost} text-[#1d1d1f] dark:text-[#e4e6eb]`
            }`}
            title={isSidebarOpen ? 'Ocultar el menú' : 'Mostrar el menú'}
            aria-label={isSidebarOpen ? 'Ocultar el menú' : 'Mostrar el menú'}
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div role="heading" aria-level={1} className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white tracking-tight truncate">{section.title}</div>
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#86868b] dark:text-[#b0b3b8] shrink-0"
                title="Tus cambios se guardan automáticamente en este navegador"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                {saveStatus === 'saving' ? 'Guardando…' : 'Guardado'}
              </span>
            </div>
            {section.hint && <p className="hidden sm:block text-[11px] text-[#86868b] dark:text-[#b0b3b8] truncate">{section.hint}</p>}
          </div>
        </div>

        {/* Acciones del proyecto */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:flex items-center relative">
            <FolderOpen className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#a78bfa] absolute left-3 pointer-events-none" />
            <select
              value={selectedPresetId || ''}
              onChange={(e) => onLoadPreset(e.target.value)}
              className={`${ghost} text-xs font-semibold text-[#1d1d1f] dark:text-[#e4e6eb] pl-8 pr-3 py-1.5 rounded-xl max-w-[210px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5833c7]/30`}
              title="Carga una sala ya configurada para explorar el simulador"
            >
              <option value="" disabled>
                Cargar sala de ejemplo…
              </option>
              {ROOM_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={onExportCSV} className={`${ghost} hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#1d1d1f] dark:text-[#e4e6eb] text-xs font-semibold`} title="Exportar las tablas a Excel / CSV">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden lg:inline">Exportar</span>
          </button>

          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] text-white text-xs font-semibold shadow-apple-sm transition active:scale-95"
            title="Generar e imprimir el informe técnico en PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            Informe<span className="hidden sm:inline">&nbsp;PDF</span>
          </button>

          <button type="button" onClick={onToggleDarkMode} className={`${ghost} p-2 rounded-xl`} title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'} aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#5833c7]" />}
          </button>

          <button
            onClick={() => {
              if (window.confirm('¿Deseas restablecer todos los parámetros del proyecto a los valores iniciales?')) onReset();
            }}
            className={`${ghost} hidden sm:block p-2 rounded-xl text-[#86868b] dark:text-[#b0b3b8] hover:text-rose-600 dark:hover:text-rose-400`}
            title="Reiniciar el proyecto a los valores iniciales"
            aria-label="Reiniciar el proyecto"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
