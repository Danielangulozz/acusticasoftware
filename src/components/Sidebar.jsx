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
}) {
  // Secciones de la suite acústica
  const navigationItems = [
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
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Contenedor Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white/95 backdrop-blur-2xl border-r border-black/[0.08] flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-apple-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Parte Superior: Marca y Presets */}
        <div className="p-5 flex flex-col gap-4 border-b border-black/[0.06]">
          
          {/* Logo y Nombre de la Aplicación (con Hover Tooltip) */}
          <div className="flex items-center justify-between">
            <div className="relative group cursor-pointer flex items-center gap-3">
              <PozoleLogo size={36} className="transition-transform duration-200 group-hover:scale-105 shrink-0" />
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#1d1d1f] leading-tight group-hover:text-[#0071e3] transition-colors">
                  POZOLE
                </h1>
                <p className="text-[10px] font-semibold text-[#86868b] truncate max-w-[130px]" title="Propagación de Ondas en Zonas y Optimización de Límites Espaciales">
                  Propagación de Ondas...
                </p>
              </div>

              {/* Tooltip Emergente al Hacer Hover */}
              <div className="absolute left-0 top-full mt-2 hidden group-hover:flex flex-col gap-1 w-64 p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.08] shadow-apple-lg z-50 text-xs transition-all pointer-events-none">
                <div className="font-bold text-[#0071e3] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>POZOLE</span>
                </div>
                <div className="text-[#1d1d1f] font-medium leading-snug">
                  Propagación de Ondas en Zonas y Optimización de Límites Espaciales
                </div>
              </div>
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-black/[0.04] transition"
              title="Ocultar menú lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Selector de Escenarios / Presets Estilo Apple */}
          <div className="relative">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] block mb-1">
              Cargar Escenario
            </label>
            <div className="relative">
              <select
                value={selectedPresetId || ''}
                onChange={(e) => {
                  onLoadPreset(e.target.value);
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full bg-[#f5f5f7] text-xs font-semibold text-[#1d1d1f] pl-3 pr-8 py-2.5 rounded-xl border border-black/[0.08] hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition appearance-none cursor-pointer"
              >
                <option value="" disabled>Seleccionar Recinto...</option>
                {ROOM_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

        </div>

        {/* Lista de Navegación por Módulos */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">
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
                    ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                    : 'text-[#1d1d1f] hover:bg-black/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg transition ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-black/[0.04] text-slate-600 group-hover:bg-black/[0.08]'
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
                        isActive ? 'text-white/80' : 'text-[#86868b]'
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
                        : 'bg-black/[0.05] text-[#86868b]'
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
        <div className="p-3 mx-3 mb-2 bg-[#f5f5f7] rounded-xl border border-black/[0.06]">
          <div className="flex items-center justify-between text-[10px] font-semibold text-[#86868b] uppercase tracking-wider mb-2">
            <span>Estado Acústico</span>
            <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse"></span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-black/[0.04] shadow-2xs">
              <div className="text-[10px] text-[#86868b]">RT (500Hz)</div>
              <div className="text-xs font-bold text-[#0071e3] font-mono">
                {rt500.toFixed(2)}s
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-black/[0.04] shadow-2xs">
              <div className="text-[10px] text-[#86868b]">Dist. Crítica</div>
              <div className="text-xs font-bold text-[#34c759] font-mono">
                {criticalDistance.toFixed(2)}m
              </div>
            </div>
          </div>
        </div>

        {/* Parte Inferior: Acciones Rápidas y Reportes */}
        <div className="p-3 border-t border-black/[0.06] bg-white flex flex-col gap-1.5">
          <button
            onClick={onOpenReport}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Informe Técnico</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onOpenTheory}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[11px] font-semibold border border-black/[0.04] transition"
              title="Ver ecuaciones y teoría"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Teoría</span>
            </button>
            <button
              onClick={onExportCSV}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[11px] font-semibold border border-black/[0.04] transition"
              title="Descargar archivo de datos"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
          </div>

          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-[10px] font-medium text-[#86868b] hover:text-rose-600 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer sala</span>
          </button>
        </div>

      </aside>
    </>
  );
}
