import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Copy,
  Check,
  Info,
  Sliders,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  SquareDashed,
  Sparkles,
} from 'lucide-react';
import { OCTAVE_BANDS, ROOM_SURFACES } from '../utils/acousticCalculations';
import {
  DEFAULT_MATERIALS_DATABASE,
  MATERIAL_CATEGORIES,
  getMaterialById,
  DEFAULT_SUB_ELEMENTS_PRESETS,
} from '../utils/defaultMaterials';

/**
 * Módulo 2: Materiales y Caras (SurfaceMaterials)
 * Diseño Bento Grid limpio, intuitivo y optimizado para reducir la sobrecarga cognitiva.
 */
export default function SurfaceMaterials({
  materials = {},
  onChangeMaterials,
  surfaceAreas = {},
  surfacesList,
  selectedBand = 1000,
  setSelectedBand,
}) {
  // Lista dinámica de superficies
  const effectiveSurfaces = useMemo(() => {
    if (surfacesList && surfacesList.length > 0) return surfacesList;
    return ROOM_SURFACES;
  }, [surfacesList]);

  // Superficie activa con fallback seguro
  const [activeSurfaceId, setActiveSurfaceId] = useState(() => {
    return effectiveSurfaces[0]?.id || 'floor';
  });

  // Asegurar que activeSurfaceId siempre exista si cambian los vértices
  useEffect(() => {
    if (!materials[activeSurfaceId] && effectiveSurfaces.length > 0) {
      setActiveSurfaceId(effectiveSurfaces[0].id);
    }
  }, [materials, activeSurfaceId, effectiveSurfaces]);

  const [copiedNotification, setCopiedNotification] = useState(false);
  const safeActiveId = materials[activeSurfaceId] ? activeSurfaceId : (effectiveSurfaces[0]?.id || 'floor');

  const handleSelectMaterial = (surfaceId, materialId) => {
    const selectedMat = getMaterialById(materialId);
    onChangeMaterials({
      ...materials,
      [surfaceId]: {
        ...materials[surfaceId],
        materialId: selectedMat.id,
        coefficients: { ...selectedMat.coefficients },
      },
    });
  };

  const handleCoefficientChange = (surfaceId, freq, value) => {
    const parsedVal = parseFloat(value);
    const safeVal = isNaN(parsedVal) ? 0 : Math.min(1.0, Math.max(0.001, parsedVal));

    onChangeMaterials({
      ...materials,
      [surfaceId]: {
        ...materials[surfaceId],
        materialId: 'custom',
        coefficients: {
          ...materials[surfaceId]?.coefficients,
          [freq]: safeVal,
        },
      },
    });
  };

  // Copiar material y coeficientes a todas las paredes dinámicas
  const handleCopyToAllWalls = () => {
    const activeConf = materials[safeActiveId] || {};
    const currentCoeffs = activeConf.coefficients || {};
    const currentMatId = activeConf.materialId || 'custom';

    const wallSurfaces = effectiveSurfaces.filter((s) => s.id.startsWith('wall'));
    if (wallSurfaces.length === 0) return;

    const updated = { ...materials };
    wallSurfaces.forEach((wall) => {
      updated[wall.id] = {
        ...updated[wall.id],
        materialId: currentMatId,
        coefficients: { ...currentCoeffs },
      };
    });

    onChangeMaterials(updated);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2200);
  };

  const handleAddSubElement = (surfaceId, presetType) => {
    const preset = DEFAULT_SUB_ELEMENTS_PRESETS.find((p) => p.type === presetType) || DEFAULT_SUB_ELEMENTS_PRESETS[0];
    const currentSubs = materials[surfaceId]?.subElements || [];
    const newElement = {
      id: `sub_${Date.now()}`,
      type: preset.type,
      name: preset.name,
      category: preset.category,
      area: Number(preset.defaultArea) || 2.0,
      colorHex: preset.colorHex,
      coefficients: { ...preset.coefficients },
    };
    onChangeMaterials({
      ...materials,
      [surfaceId]: {
        ...materials[surfaceId],
        subElements: [...currentSubs, newElement],
      },
    });
  };

  const handleRemoveSubElement = (surfaceId, subId) => {
    const currentSubs = materials[surfaceId]?.subElements || [];
    onChangeMaterials({
      ...materials,
      [surfaceId]: {
        ...materials[surfaceId],
        subElements: currentSubs.filter((s) => s.id !== subId),
      },
    });
  };

  const handleUpdateSubElementArea = (surfaceId, subId, newArea) => {
    const num = Math.max(0.01, parseFloat(newArea) || 0.1);
    const currentSubs = materials[surfaceId]?.subElements || [];
    onChangeMaterials({
      ...materials,
      [surfaceId]: {
        ...materials[surfaceId],
        subElements: currentSubs.map((s) => (s.id === subId ? { ...s, area: num } : s)),
      },
    });
  };

  const currentSurfaceConfig = materials[safeActiveId] || {
    materialId: 'custom',
    coefficients: { 125: 0.1, 250: 0.1, 500: 0.1, 1000: 0.1, 2000: 0.1, 4000: 0.1 },
    subElements: [],
  };

  const currentMatMeta = getMaterialById(currentSurfaceConfig.materialId);
  const activeArea = surfaceAreas[safeActiveId] || 0;
  const activeSurfaceMeta = effectiveSurfaces.find((s) => s.id === safeActiveId) || { name: safeActiveId, description: '' };

  // Sub-elementos y área efectiva
  const activeSubElements = currentSurfaceConfig.subElements || [];
  const activeSubAreaSum = activeSubElements.reduce((acc, el) => acc + (Number(el.area) || 0), 0);
  const activeBaseArea = Math.max(0, activeArea - activeSubAreaSum);

  // Coeficiente efectivo compuesto para la banda activa
  const baseAlpha = currentSurfaceConfig.coefficients?.[selectedBand] || 0.05;
  const subAbsSum = activeSubElements.reduce((acc, el) => {
    const a = el.coefficients?.[selectedBand] ?? baseAlpha;
    return acc + (Number(el.area) || 0) * a;
  }, 0);
  const totalSurfaceAbsAtBand = (activeBaseArea * baseAlpha) + subAbsSum;
  const effectiveAlphaAtBand = activeArea > 0 ? (totalSurfaceAbsAtBand / activeArea) : baseAlpha;

  const wallCount = effectiveSurfaces.filter(s => s.id.startsWith('wall')).length;

  return (
    <div className="bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-6 sm:p-8 shadow-apple-sm transition-all space-y-6">

      {/* 1. Encabezado Bento Limpio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1d1d1f] dark:text-white tracking-tight">
              2. Materiales y Caras
            </h2>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              {effectiveSurfaces.length} superficies activas ({wallCount} paredes) &bull; Coeficientes de absorción α por octava
            </p>
          </div>
        </div>

        {/* Acciones Rápidas del Encabezado */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyToAllWalls}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#0A0C14] hover:bg-slate-200 dark:hover:bg-[#1c1e30] text-xs font-bold text-[#1d1d1f] dark:text-slate-200 border border-black/[0.06] dark:border-white/10 transition active:scale-95"
            title={`Copiar material y coeficientes a las ${wallCount} paredes`}
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#10b981]" />
                <span className="text-[#10b981]">¡Copiado a {wallCount} paredes!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Aplicar a todas las paredes ({wallCount})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Selector Horizontal de Superficies (Pills) */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 mb-2">
          Seleccionar Superficie
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar touch-scroll-x">
          {effectiveSurfaces.map((surf) => {
            const isActive = safeActiveId === surf.id;
            const surfArea = surfaceAreas[surf.id] || 0;
            const currentMat = getMaterialById(materials[surf.id]?.materialId);

            return (
              <button
                key={surf.id}
                onClick={() => setActiveSurfaceId(surf.id)}
                className={`px-4 py-2.5 rounded-2xl border text-left shrink-0 transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-[#5833c7] text-white border-[#5833c7] shadow-md shadow-[#5833c7]/20 font-bold'
                    : 'bg-[#fbfbfd] dark:bg-[#0A0C14] border-black/[0.06] dark:border-white/10 text-[#1d1d1f] dark:text-slate-300 hover:border-black/[0.15] dark:hover:border-white/20'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>{surf.name.split('/')[0].split('(')[0]}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-px rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#86868b] dark:text-slate-400'
                    }`}>
                      {surfArea.toFixed(1)} m²
                    </span>
                  </div>
                  <div className={`text-[10px] truncate max-w-[140px] font-normal ${
                    isActive ? 'text-white/80' : 'text-[#86868b] dark:text-slate-400'
                  }`}>
                    {currentMat?.name || 'Personalizado'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Cuadrícula Bento de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* Columna Izquierda (7 cols): Material y Coeficientes */}
        <div className="lg:col-span-7 bg-[#fbfbfd] dark:bg-[#0A0C14] p-5 sm:p-6 rounded-2xl border border-black/[0.06] dark:border-white/10 space-y-4">
          
          {/* Fila Superior: Nombre de Superficie y Selector de Material */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div>
              <div className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <span>{activeSurfaceMeta.name}</span>
                <span className="text-xs font-mono font-bold text-[#5833c7] dark:text-[#a78bfa] bg-[#5833c7]/10 dark:bg-[#5833c7]/20 px-2 py-0.5 rounded-md">
                  {activeArea.toFixed(2)} m²
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] dark:text-slate-400 mt-0.5">
                {activeSurfaceMeta.description || 'Configuración acústica de esta cara'}
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={currentSurfaceConfig.materialId}
                onChange={(e) => handleSelectMaterial(safeActiveId, e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-[#141622] text-xs text-[#1d1d1f] dark:text-white font-bold px-3.5 py-2 rounded-xl border border-black/[0.1] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#5833c7]/30 shadow-2xs transition cursor-pointer max-w-full"
              >
                <option value="custom" disabled={currentSurfaceConfig.materialId !== 'custom'}>
                  ✏️ Coeficientes Personalizados
                </option>
                {Object.entries(MATERIAL_CATEGORIES).map(([catKey, catName]) => (
                  <optgroup key={catKey} label={catName} className="font-bold text-slate-800 dark:text-slate-200">
                    {DEFAULT_MATERIALS_DATABASE.filter((m) => m.category === catName).map((mat) => (
                      <option key={mat.id} value={mat.id} className="text-[#1d1d1f] dark:text-white">
                        {mat.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Breve descripción del material */}
          <div className="p-3 bg-white dark:bg-[#141622] rounded-xl border border-black/[0.04] dark:border-white/[0.06] text-xs text-[#86868b] dark:text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1d1d1f] dark:text-white">{currentMatMeta.name}: </strong>
              <span>{currentMatMeta.description}</span>
            </div>
          </div>

          {/* Cuadrícula de Coeficientes de Absorción α (125 a 4000 Hz) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400">
                Coeficientes de Absorción (α) por Banda
              </span>
              <span className="text-[10px] text-[#86868b] dark:text-slate-400 font-mono">
                Valores de 0.00 a 1.00
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {OCTAVE_BANDS.map((freq) => {
                const alpha = currentSurfaceConfig.coefficients[freq] || 0.05;
                const surfaceAbs = activeArea * alpha;
                const isSelected = selectedBand === freq;

                return (
                  <div
                    key={freq}
                    onClick={() => setSelectedBand && setSelectedBand(freq)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-[#141622] border-[#5833c7] dark:border-[#a78bfa] ring-2 ring-[#5833c7]/20 shadow-xs'
                        : 'bg-white dark:bg-[#141622] border-black/[0.06] dark:border-white/10 hover:border-black/[0.15]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold font-mono ${
                        isSelected ? 'text-[#5833c7] dark:text-[#a78bfa]' : 'text-[#1d1d1f] dark:text-slate-300'
                      }`}>
                        {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-[#5833c7] px-1.5 py-px rounded-md">
                          Activa
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      min="0.00"
                      max="1.00"
                      step="0.01"
                      value={alpha}
                      onFocus={() => setSelectedBand && setSelectedBand(freq)}
                      onChange={(e) => handleCoefficientChange(safeActiveId, freq, e.target.value)}
                      className="w-full font-mono text-center text-sm font-bold py-1 px-1.5 rounded-lg border bg-[#fbfbfd] dark:bg-[#0A0C14] border-black/[0.08] dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#5833c7]"
                    />

                    {/* Barra visual de absorción */}
                    <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-1 mt-2 overflow-hidden">
                      <div
                        className="bg-[#5833c7] dark:bg-[#a78bfa] h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, alpha * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-[#86868b] dark:text-slate-400 mt-1.5">
                      <span>Aporte:</span>
                      <span className="text-[#1d1d1f] dark:text-slate-200 font-bold">{surfaceAbs.toFixed(2)} m²</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha (5 cols): Sub-elementos y Aberturas */}
        <div className="lg:col-span-5 bg-[#fbfbfd] dark:bg-[#0A0C14] p-5 sm:p-6 rounded-2xl border border-black/[0.06] dark:border-white/10 space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div>
              <div className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <SquareDashed className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa]" />
                <span>Aberturas & Sub-elementos</span>
              </div>
              <p className="text-[11px] text-[#86868b] dark:text-slate-400 mt-0.5">
                Ventanas, puertas o paneles incrustados
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#5833c7] dark:text-[#a78bfa] bg-[#5833c7]/10 dark:bg-[#5833c7]/20 px-2.5 py-0.5 rounded-full">
              {activeSubElements.length} {activeSubElements.length === 1 ? 'elemento' : 'elementos'}
            </span>
          </div>

          {/* Resumen Superficial */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-white dark:bg-[#141622] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
            <div>
              <div className="text-[10px] text-[#86868b] dark:text-slate-400">Base</div>
              <div className="font-bold text-[#1d1d1f] dark:text-white mt-0.5">{activeBaseArea.toFixed(1)} m²</div>
            </div>
            <div>
              <div className="text-[10px] text-[#86868b] dark:text-slate-400">Aberturas</div>
              <div className="font-bold text-[#5833c7] dark:text-[#a78bfa] mt-0.5">{activeSubAreaSum.toFixed(1)} m²</div>
            </div>
            <div>
              <div className="text-[10px] text-[#86868b] dark:text-slate-400">ᾱ Efectivo</div>
              <div className="font-bold text-[#10b981] mt-0.5">{effectiveAlphaAtBand.toFixed(2)}</div>
            </div>
          </div>

          {/* Botones de Inserción Rápida */}
          <div>
            <div className="text-[11px] font-semibold text-[#86868b] dark:text-slate-400 mb-2">
              Añadir a esta superficie:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_SUB_ELEMENTS_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleAddSubElement(safeActiveId, preset.type)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#141622] hover:bg-slate-100 dark:hover:bg-[#1e2034] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white font-medium transition active:scale-95 text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: preset.colorHex }} />
                  <span className="truncate">{preset.name.split(' ')[0]} {preset.name.split(' ')[1] || ''}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Sub-elementos Activos */}
          <div className="space-y-2 pt-1">
            {activeSubElements.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-black/[0.1] dark:border-white/10 text-center text-xs text-[#86868b] dark:text-slate-400 bg-white/40 dark:bg-black/20">
                100% material continuo. Pulsa un botón arriba para incrustar una ventana, puerta o panel fonoabsorbente.
              </div>
            ) : (
              activeSubElements.map((sub) => {
                const subAlpha = sub.coefficients?.[selectedBand] || 0.05;
                return (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#141622] border border-black/[0.06] dark:border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.colorHex || '#5833c7' }} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                          {sub.name}
                        </div>
                        <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-mono">
                          α = {subAlpha.toFixed(2)} @ {selectedBand}Hz
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={activeArea}
                          value={sub.area}
                          onChange={(e) => handleUpdateSubElementArea(safeActiveId, sub.id, e.target.value)}
                          className="w-14 bg-[#fbfbfd] dark:bg-[#0A0C14] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white px-1.5 py-1 rounded border border-black/[0.08] dark:border-white/10 text-right focus:outline-none focus:border-[#5833c7]"
                        />
                        <span className="text-[11px] font-mono text-[#86868b]">m²</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSubElement(safeActiveId, sub.id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Eliminar elemento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
