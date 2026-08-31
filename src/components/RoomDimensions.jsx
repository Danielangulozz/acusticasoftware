import React from 'react';
import { Box, Maximize2, MoveRight, Gauge, Scale, Layers, Info } from 'lucide-react';
import { ROOM_SURFACES } from '../utils/acousticCalculations';

/**
 * Componente de Dimensiones y Geometría de la Sala
 */
export default function RoomDimensions({ dimensions, onChange, geometry }) {
  const handleChange = (field, value) => {
    const val = parseFloat(value);
    onChange({
      ...dimensions,
      [field]: isNaN(val) ? '' : Math.max(0.1, val),
    });
  };

  // Proporciones acústicas relativas a la altura H
  const ratioW = geometry.height > 0 ? (geometry.width / geometry.height).toFixed(2) : '1.00';
  const ratioL = geometry.height > 0 ? (geometry.length / geometry.height).toFixed(2) : '1.00';

  const isCubic = Math.abs(geometry.length - geometry.width) < 0.2 && Math.abs(geometry.width - geometry.height) < 0.2;
  const isSquareFloor = Math.abs(geometry.length - geometry.width) < 0.2 && !isCubic;

  const scrollSection = (sectionId) => {
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 shadow-apple-sm transition-all">

      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-black/[0.06] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              1. Geometría y Dimensiones de la Sala
            </h2>
            <p className="text-xs text-[#86868b]">
              Configuración ortogonal (Largo × Ancho × Alto) y cálculo automático de áreas
            </p>
          </div>
        </div>

        {/* Badge de Proporción Modular */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f5f5f7] border border-black/[0.04] text-xs text-[#1d1d1f] font-mono">
          <Scale className="w-3.5 h-3.5 text-[#0071e3]" />
          <span>Proporción (1 : W/H : L/H) = <strong>1 : {ratioW} : {ratioL}</strong></span>
        </div>
      </div>

      {/* Controles de Entrada de Dimensiones (L, W, H) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">

        {/* Largo (L) */}
        <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/[0.06] hover:border-black/[0.15] transition">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Largo (L)
            </label>
            <span className="text-[10px] font-mono text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-md font-semibold">
              Eje X
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              min="0.5"
              max="150"
              step="0.1"
              value={dimensions.length}
              onChange={(e) => handleChange('length', e.target.value)}
              className="w-full bg-transparent text-2xl font-black text-[#1d1d1f] font-mono focus:outline-none"
            />
            <span className="text-xs font-bold text-[#86868b]">metros</span>
          </div>
        </div>

        {/* Ancho (W) */}
        <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/[0.06] hover:border-black/[0.15] transition">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Ancho (W)
            </label>
            <span className="text-[10px] font-mono text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-md font-semibold">
              Eje Y
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              min="0.5"
              max="150"
              step="0.1"
              value={dimensions.width}
              onChange={(e) => handleChange('width', e.target.value)}
              className="w-full bg-transparent text-2xl font-black text-[#1d1d1f] font-mono focus:outline-none"
            />
            <span className="text-xs font-bold text-[#86868b]">metros</span>
          </div>
        </div>

        {/* Alto (H) */}
        <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-black/[0.06] hover:border-black/[0.15] transition">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Alto (H)
            </label>
            <span className="text-[10px] font-mono text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-md font-semibold">
              Eje Z
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              min="0.5"
              max="60"
              step="0.1"
              value={dimensions.height}
              onChange={(e) => handleChange('height', e.target.value)}
              className="w-full bg-transparent text-2xl font-black text-[#1d1d1f] font-mono focus:outline-none"
            />
            <span className="text-xs font-bold text-[#86868b]">metros</span>
          </div>
        </div>

      </div>

      {/* Advertencias de Modos Propios si la sala es cúbica */}
      {isCubic && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Advertencia Acústica:</strong> El recinto es casi cúbico (L ≈ W ≈ H). Esto genera coincidencia de modos resonantes de baja frecuencia (ondas estacionarias acumuladas).
          </span>
        </div>
      )}
      {!isCubic && isSquareFloor && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Nota de Planta Cuadrada:</strong> Planta cuadrada (L ≈ W). Produce degeneración modal en el plano horizontal.
          </span>
        </div>
      )}

      {/* Tarjetas de Resumen Físico y Estadístico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">

        <div className="bg-[#f5f5f7] p-4 rounded-2xl border border-black/[0.04]">
          <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-[#0071e3]" /> Volumen (V)
          </div>
          <div className="text-xl font-black text-[#1d1d1f] font-mono mt-1.5">
            {geometry.volume.toFixed(2)} <span className="text-xs font-medium text-[#86868b]">m³</span>
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5 font-mono">V = L · W · H</div>
        </div>

        <div className="bg-[#f5f5f7] p-4 rounded-2xl border border-black/[0.04]">
          <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#0071e3]" /> Superficie Total (S)
          </div>
          <div className="text-xl font-black text-[#1d1d1f] font-mono mt-1.5">
            {geometry.totalSurfaceArea.toFixed(2)} <span className="text-xs font-medium text-[#86868b]">m²</span>
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5 font-mono">S = 2(LW + LH + WH)</div>
        </div>

        <div className="bg-[#f5f5f7] p-4 rounded-2xl border border-black/[0.04]">
          <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
            <MoveRight className="w-3.5 h-3.5 text-[#0071e3]" /> Recorrido Libre (l)
          </div>
          <div className="text-xl font-black text-[#1d1d1f] font-mono mt-1.5">
            {geometry.meanFreePath.toFixed(2)} <span className="text-xs font-medium text-[#86868b]">m</span>
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5 font-mono">l = 4V / S</div>
        </div>

        <div className="bg-[#f5f5f7] p-4 rounded-2xl border border-black/[0.04]">
          <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#0071e3]" /> Tiempo entre Refl. (τ)
          </div>
          <div className="text-xl font-black text-[#1d1d1f] font-mono mt-1.5">
            {(geometry.timeBetweenReflections * 1000).toFixed(1)} <span className="text-xs font-medium text-[#86868b]">ms</span>
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5 font-mono">{geometry.reflectionsPerSecond.toFixed(1)} refl/s</div>
        </div>

      </div>

      {/* Áreas Individuales de las 6 Caras */}
      <div className="bg-[#fbfbfd] rounded-2xl p-4 border border-black/[0.06]">
        <div className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider mb-3">
          Áreas Individuales de las 6 Superficies (Sᵢ):
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ROOM_SURFACES.map((surf) => {
            const area = geometry.surfaceAreas[surf.id] || 0;
            return (
              <div
                key={surf.id}
                className="bg-white p-3 rounded-xl border border-black/[0.06] shadow-2xs flex flex-col justify-between"
              >
                <span className="text-[11px] font-medium text-[#86868b] truncate" title={surf.name}>
                  {surf.name.split('/')[0].split('(')[0]}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-black font-mono text-[#1d1d1f]">
                    {area.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-medium text-[#86868b]">m²</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
