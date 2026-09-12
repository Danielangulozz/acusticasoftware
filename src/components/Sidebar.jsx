import React from 'react';
import {
  LayoutDashboard,
  Box,
  Layers,
  Volume2,
  TableProperties,
  LineChart,
  BookOpen,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Waves,
  Sparkles,
  Sliders,
  ChevronRight,
  X,
  Eye,
  CheckCircle2,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { ROOM_PRESETS } from '../utils/roomPresets';
import { PozoleLogo } from './PozoleLogo';

/**
 * Componente de Navegación Lateral (Sidebar) estilo Apple / Tesla
 * Permite cambiar de módulo de forma instantánea sin scroll excesivo.
 */
export default function Sidebar({
  activeSection,
  setActiveSection,
  isOpen,
  onClose,
  geometry,
  rt500,
  criticalDistance,
  selectedPresetId,
  onLoadPreset,
  onOpenReport,
  onOpenTheory,
  onExportCSV,
  onReset,
  isDarkMode,
  onToggleDarkMode,
}) {
  // Secciones de la suite acústica
  const navigationItems = [
    {
      id: 'welcome',
      label: 'Inicio',
      subtitle: 'Presentación y acceso',
      icon: Sparkles,
      badge: 'POZOLE',
    },
    {
      id: 'overview',
      label: 'Panel General',
      subtitle: 'Resumen ejecutivo y 3D',
      icon: LayoutDashboard,
      badge: 'Resumen',
    },
    {
      id: 'geometry',
      label: '1. Geometría de Sala',
      subtitle: `${geometry.length}m × ${geometry.width}m × ${geometry.height}m (${geometry.volume.toFixed(0)}m³)`,
      icon: Box,
    },
    {
      id: 'materials',
      label: '2. Materiales y Caras',
      subtitle: 'Coeficientes α por octava',
      icon: Layers,
    },
    {
      id: 'source',
      label: '3. Fuente y Receptor',
      subtitle: 'Potencia Lw, Directividad Q, Distancia r',
      icon: Volume2,
    },
    {
      id: 'results',
      label: '4. Resultados y Tablas',
      subtitle: 'Sabine, Eyring, Millington',
      icon: TableProperties,
    },
    {
      id: 'charts',
      label: '5. Gráficas Acústicas',
      subtitle: 'RT vs Freq, Lp vs Distancia',
      icon: LineChart,
    },
    {
      id: 'all',
      label: 'Vista de Estudio Completo',
      subtitle: 'Ver todos los módulos juntos',
      icon: Sliders,
      badge: 'Todo',
    },
  ];

  return (
    <>
      {/* Fondo semitransparente móvil cuando el sidebar está abierto */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Contenedor Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white/95 dark:bg-[#0c0d18]/95 backdrop-blur-2xl border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-apple-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Parte Superior: Marca */}
        <div className="p-5 flex flex-col gap-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          
          {/* Logo y Nombre de la Aplicación */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => { setActiveSection('welcome'); if (window.innerWidth < 1024) onClose(); }}
              className="relative group cursor-pointer flex items-center gap-3"
            >
              <PozoleLogo size={36} className="transition-transform duration-200 group-hover:scale-105 shrink-0" />
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-tight group-hover:text-[#5833c7] dark:group-hover:text-[#9d7eff] transition-colors">
                  POZOLE
                </h1>
                <p className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 truncate max-w-[130px]" title="Propagación de Ondas en Zonas y Optimización de Límites Espaciales">
                  Propagación de Ondas...
                </p>
              </div>

              {/* Tooltip Emergente al Hacer Hover */}
              <div className="absolute left-0 top-full mt-2 hidden group-hover:flex flex-col gap-1 w-64 p-3 bg-white/95 dark:bg-[#121324]/95 backdrop-blur-md rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-apple-lg z-50 text-xs transition-all pointer-events-none">
                <div className="font-bold text-[#5833c7] dark:text-[#9d7eff] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#9d7eff]" />
                  <span>POZOLE</span>
                </div>
                <div className="text-[#1d1d1f] dark:text-slate-200 font-medium leading-snug">
                  Propagación de Ondas en Zonas y Optimización de Límites Espaciales
                </div>
              </div>
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] transition"
              title="Ocultar menú lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Navegación por Módulos */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#86868b] dark:text-slate-500">
            Módulos del Sistema
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full group text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between relative ${
                  isActive
                    ? 'bg-[#5833c7] text-white shadow-sm font-semibold'
                    : 'text-[#1d1d1f] dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg transition ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 group-hover:bg-black/[0.08] dark:group-hover:bg-white/[0.1]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate leading-tight">
                      {item.label}
                    </div>
                    <div
                      className={`text-[10px] truncate leading-tight mt-0.5 ${
                        isActive ? 'text-white/80' : 'text-[#86868b] dark:text-slate-400'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {/* Badge opcional */}
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ml-1 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#86868b] dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tarjeta de Resumen Rápido / KPIs de Bolsillo */}
        <div className="p-3 mx-3 mb-2 bg-[#f5f5f7] dark:bg-[#151624] rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center justify-between text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider mb-2">
            <span>Estado Acústico</span>
            <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse"></span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white dark:bg-[#1a1c2c] p-2 rounded-lg border border-black/[0.04] dark:border-white/[0.06] shadow-2xs">
              <div className="text-[10px] text-[#86868b] dark:text-slate-400">RT (500Hz)</div>
              <div className="text-xs font-bold text-[#5833c7] dark:text-[#9d7eff] font-mono">
                {rt500.toFixed(2)}s
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a1c2c] p-2 rounded-lg border border-black/[0.04] dark:border-white/[0.06] shadow-2xs">
              <div className="text-[10px] text-[#86868b] dark:text-slate-400">Dist. Crítica</div>
              <div className="text-xs font-bold text-[#34c759] dark:text-emerald-400 font-mono">
                {criticalDistance.toFixed(2)}m
              </div>
            </div>
          </div>
        </div>

        {/* Parte Inferior: Acciones Rápidas y Reportes */}
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0e0f1c] flex flex-col gap-1.5">
          <button
            onClick={onOpenReport}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#5833c7] hover:bg-[#4a2bb0] text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Informe Técnico</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onOpenTheory}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#f5f5f7] dark:bg-[#181928] hover:bg-[#e8e8ed] dark:hover:bg-[#222438] text-[#1d1d1f] dark:text-slate-200 text-[11px] font-semibold border border-black/[0.04] dark:border-white/[0.06] transition"
              title="Ver ecuaciones y teoría"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Teoría</span>
            </button>
            <button
              onClick={onExportCSV}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#f5f5f7] dark:bg-[#181928] hover:bg-[#e8e8ed] dark:hover:bg-[#222438] text-[#1d1d1f] dark:text-slate-200 text-[11px] font-semibold border border-black/[0.04] dark:border-white/[0.06] transition"
              title="Descargar archivo de datos"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#86868b] dark:text-slate-400 hover:text-[#5833c7] dark:hover:text-[#8767f9] transition py-0.5"
              title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#5833c7]" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-1 text-[10px] font-medium text-[#86868b] dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
              title="Restablecer sala a valores iniciales"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
