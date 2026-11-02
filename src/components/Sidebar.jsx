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
  X,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  MessageSquare,
  Home,
  Grid3x3,
} from 'lucide-react';
import { PozoleLogo } from './PozoleLogo';
import { linkProps } from '../router';

/**
 * Componente de Navegación Lateral (Sidebar) agrupado por etapas lógicas
 * Facilita entender el flujo de trabajo paso a paso sin saturación visual.
 */
export default function Sidebar({
  activeSection,
  setActiveSection,
  isOpen,
  onClose,
  geometry,
  rt500,
  optimumRT,
  criticalDistance,
  onOpenReport,
  onOpenTheory,
  onExportCSV,
  onReset,
  isDarkMode,
  onToggleDarkMode,
  schroederFreq,
}) {
  // Grupos lógicos para guiar al usuario paso a paso
  const navigationGroups = [
    {
      title: 'Inicio y Resumen',
      items: [
        {
          id: 'welcome',
          label: 'Guía de Inicio',
          subtitle: 'Pasos rápidos y ejemplos',
          icon: Sparkles,
        },
        {
          id: 'overview',
          label: 'Panel General',
          subtitle: 'Diagnóstico y vista 3D',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Paso a Paso · Configura tu Sala',
      items: [
        {
          id: 'geometry',
          step: '1',
          label: 'Geometría de Sala',
          subtitle: `Planta 2D/3D · ${geometry.volume.toFixed(0)} m³`,
          icon: Box,
        },
        {
          id: 'materials',
          step: '2',
          label: 'Materiales y Caras',
          subtitle: 'Piso, techo y paredes (α)',
          icon: Layers,
        },
        {
          id: 'source',
          step: '3',
          label: 'Fuente y Oyente',
          subtitle: 'Ubicación, potencia y distancia',
          icon: Volume2,
        },
      ],
    },
    {
      title: 'Paso a Paso · Evalúa Resultados',
      items: [
        {
          id: 'results',
          step: '4',
          label: 'Resultados y Tablas',
          subtitle: 'Eco RT60 y niveles dB',
          icon: TableProperties,
        },
        {
          id: 'charts',
          step: '5',
          label: 'Gráficas Acústicas',
          subtitle: 'Curvas por frecuencia y distancia',
          icon: LineChart,
        },
      ],
    },
    {
      title: 'Laboratorios Especializados',
      items: [
        {
          id: 'modes',
          label: 'Modos Propios (Graves)',
          subtitle: `Resonancias · fs ≈ ${schroederFreq || 385} Hz`,
          icon: Waves,
        },
        {
          id: 'intelligibility',
          label: 'Inteligibilidad (Voz)',
          subtitle: 'Claridad de palabra (%ALcons)',
          icon: MessageSquare,
        },
        {
          id: 'diffusers',
          label: 'Diseño de Difusores',
          subtitle: 'QRD, PRD, MLS y corte',
          icon: Grid3x3,
        },
      ],
    },
    {
      title: 'Vista Integrada',
      items: [
        {
          id: 'all',
          label: 'Todo en una pantalla',
          subtitle: 'Ver todos los módulos seguidos',
          icon: Sliders,
        },
      ],
    },
  ];

  const isRtOptimal = optimumRT
    ? rt500 >= optimumRT.min && rt500 <= optimumRT.max
    : true;
  const rtStatusLabel = !optimumRT
    ? 'Activo'
    : isRtOptimal
      ? 'Óptimo'
      : rt500 > optimumRT.max
        ? 'Eco alto'
        : 'Muy seco';

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
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white/95 dark:bg-[#0A0C14] backdrop-blur-2xl border-r border-black/[0.08] dark:border-white/10 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-apple-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Parte Superior: Marca */}
        <div className="p-4 pb-3 flex flex-col gap-2 border-b border-black/[0.06] dark:border-white/10">
          <div className="flex items-center justify-between">
            <div
              onClick={() => { setActiveSection('welcome'); if (window.innerWidth < 1024) onClose(); }}
              className="relative group cursor-pointer flex items-center gap-2.5"
            >
              <PozoleLogo size={34} className="transition-transform duration-200 group-hover:scale-105 shrink-0" />
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-tight group-hover:text-[#5833c7] dark:group-hover:text-[#9d7eff] transition-colors">
                  POZOLE Suite
                </h1>
                <p className="text-[10px] font-medium text-[#86868b] dark:text-slate-400">
                  Simulador de Acústica de Recintos
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] transition"
              title="Ocultar menú lateral"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <a
            {...linkProps('/')}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold text-[#1d1d1f] dark:text-slate-200 bg-[#f5f5f7] dark:bg-[#181928] hover:bg-[#e8e8ed] dark:hover:bg-[#222438] border border-black/[0.04] dark:border-white/[0.06] transition"
          >
            <Home className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#9d7eff]" />
            <span>Volver al sitio POZOLE ACUSTIC</span>
          </a>
        </div>

        {/* Lista de Navegación Agrupada */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-2.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-500">
                {group.title}
              </div>

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`w-full group text-left px-2.5 py-2 rounded-xl transition-all duration-150 flex items-center justify-between relative ${
                      isActive
                        ? 'bg-[#5833c7] text-white shadow-xs font-semibold'
                        : 'text-[#1d1d1f] dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 group-hover:bg-black/[0.08] dark:group-hover:bg-white/[0.1]'
                        }`}
                      >
                        {item.step ? (
                          <span className="font-mono text-xs font-bold">{item.step}</span>
                        ) : (
                          <Icon className="w-3.5 h-3.5" />
                        )}
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
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Widget compacto: ESTADO ACÚSTICO EN VIVO */}
        <div className="p-2.5 mx-3 mb-2 bg-[#f5f5f7] dark:bg-[#141622] rounded-2xl border border-black/[0.06] dark:border-white/10">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider mb-1.5">
            <span>Estado de tu Sala</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                isRtOptimal
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isRtOptimal ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
              {rtStatusLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div
              className="bg-white dark:bg-[#0A0C14] p-2 rounded-xl border border-black/[0.04] dark:border-white/[0.06]"
              title="Tiempo de reverberación a 500 Hz (cuánto tarda en apagarse el sonido)"
            >
              <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-medium">Eco RT60 (500Hz)</div>
              <div className="text-xs font-bold text-[#10b981] dark:text-emerald-400 font-mono mt-0.5">
                {rt500.toFixed(2)} s
              </div>
            </div>
            <div
              className="bg-white dark:bg-[#0A0C14] p-2 rounded-xl border border-black/[0.04] dark:border-white/[0.06]"
              title="Distancia hasta donde el sonido directo supera al eco de la sala"
            >
              <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-medium">Dist. Crítica</div>
              <div className="text-xs font-bold text-[#8b5cf6] dark:text-purple-400 font-mono mt-0.5">
                {criticalDistance.toFixed(2)} m
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
            <span>Generar Informe PDF</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onOpenTheory}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#f5f5f7] dark:bg-[#181928] hover:bg-[#e8e8ed] dark:hover:bg-[#222438] text-[#1d1d1f] dark:text-slate-200 text-[11px] font-semibold border border-black/[0.04] dark:border-white/[0.06] transition"
              title="Ver fórmulas y explicación teórica"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Fórmulas</span>
            </button>
            <button
              onClick={onExportCSV}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#f5f5f7] dark:bg-[#181928] hover:bg-[#e8e8ed] dark:hover:bg-[#222438] text-[#1d1d1f] dark:text-slate-200 text-[11px] font-semibold border border-black/[0.04] dark:border-white/[0.06] transition"
              title="Exportar tablas a Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar CSV</span>
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
              onClick={() => {
                if (window.confirm('¿Deseas restablecer todos los parámetros del proyecto a los valores iniciales?')) {
                  onReset();
                }
              }}
              className="flex items-center gap-1 text-[10px] font-medium text-[#86868b] dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
              title="Restablecer sala a valores iniciales"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
