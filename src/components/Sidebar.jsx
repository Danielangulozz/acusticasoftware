import React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Moon, Sun, X } from 'lucide-react';
import { PozoleLogo } from './PozoleLogo';
import { SECTION_GROUPS } from './suiteSections';
import { linkProps } from '../router';

/**
 * Menú lateral de POZOLE Suite: una sola navegación, agrupada por lo que el usuario quiere
 * hacer (describir su sala → ver resultados → herramientas → respaldo técnico).
 */
export default function Sidebar({ activeSection, setActiveSection, isOpen, onClose, geometry, rt500, optimumRT, criticalDistance, onOpenReport, isDarkMode, onToggleDarkMode }) {
  const go = (id) => {
    setActiveSection(id);
    if (window.innerWidth < 1024) onClose();
  };

  const inRange = optimumRT && rt500 >= optimumRT.min && rt500 <= optimumRT.max;
  const status = !optimumRT ? null : inRange ? 'En rango' : rt500 > optimumRT.max ? 'Muy reverberante' : 'Muy seca';
  const plan = geometry ? [geometry.length, geometry.width].sort((a, b) => b - a) : [];
  const subtitleFor = (item) => (item.id === 'geometry' && geometry ? `${plan[0]} × ${plan[1]} × ${geometry.height} m · ${geometry.volume.toFixed(0)} m³` : item.hint);

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" />}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white/95 dark:bg-[#0A0C14] backdrop-blur-2xl border-r border-black/[0.08] dark:border-white/10 flex flex-col transition-transform duration-300 ease-in-out shadow-apple-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Marca */}
        <div className="p-4 flex items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/10">
          <button type="button" onClick={() => go('welcome')} className="group flex items-center gap-2.5 text-left">
            <PozoleLogo size={36} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <span>
              <span className="block text-sm font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-tight">POZOLE Suite</span>
              <span className="block text-[10px] font-semibold text-[#86868b] dark:text-slate-400">Simulador de acústica de recintos</span>
            </span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
            title="Ocultar menú"
            aria-label="Ocultar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Módulos de POZOLE Suite">
          {SECTION_GROUPS.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#86868b] dark:text-slate-500">{group.title}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full group text-left px-2.5 py-2 rounded-xl transition-colors flex items-center gap-2.5 ${
                      active ? 'bg-[#5833c7] text-white shadow-sm' : 'text-[#1d1d1f] dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 text-xs font-mono font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.step ?? <Icon className="w-3.5 h-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-tight truncate">{item.label}</span>
                      <span className={`block text-[10px] leading-tight mt-0.5 truncate ${active ? 'text-white/75' : 'text-[#86868b] dark:text-slate-500'}`}>{subtitleFor(item)}</span>
                    </span>
                    {item.badge && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-[#5833c7]/10 text-[#5833c7] dark:text-[#c4b5fd]'}`}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Estado de la sala + informe */}
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#141622] border border-black/[0.06] dark:border-white/10 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 mb-1.5">
              <span>Tu sala ahora</span>
              {status && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] ${inRange ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                  {inRange ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                  {status}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center">
              <div className="bg-white dark:bg-[#0A0C14] p-2 rounded-xl border border-black/[0.04] dark:border-white/[0.06]" title="Tiempo de reverberación a 500 Hz: cuánto tarda en apagarse el sonido">
                <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-medium">Reverberación (RT60)</div>
                <div className="text-xs font-bold font-mono mt-0.5 text-[#1d1d1f] dark:text-white">{rt500.toFixed(2)} s</div>
              </div>
              <div className="bg-white dark:bg-[#0A0C14] p-2 rounded-xl border border-black/[0.04] dark:border-white/[0.06]" title="Distancia hasta donde el sonido directo supera al de la sala">
                <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-medium">Dist. crítica</div>
                <div className="text-xs font-bold font-mono mt-0.5 text-[#1d1d1f] dark:text-white">{criticalDistance.toFixed(2)} m</div>
              </div>
            </div>
          </div>

          <button onClick={onOpenReport} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#5833c7] hover:bg-[#4a2bb0] text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]">
            <FileText className="w-3.5 h-3.5" />
            Generar informe PDF
          </button>

          <div className="flex items-center justify-between pt-1 text-[11px] font-semibold">
            <a {...linkProps('/')} className="inline-flex items-center gap-1 text-[#86868b] dark:text-slate-400 hover:text-[#5833c7] dark:hover:text-[#c4b5fd] transition">
              <ArrowLeft className="w-3 h-3" /> Sitio POZOLE ACÚSTICA
            </a>
            <button type="button" onClick={onToggleDarkMode} className="inline-flex items-center gap-1 text-[#86868b] dark:text-slate-400 hover:text-[#5833c7] dark:hover:text-[#c4b5fd] transition" title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              {isDarkMode ? 'Claro' : 'Oscuro'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
