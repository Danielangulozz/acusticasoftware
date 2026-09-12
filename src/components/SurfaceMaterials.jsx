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
  Activity,
  Clock,
  Ruler,
  Volume2,
  Sparkles,
  Plus,
  Trash2,
  DoorClosed,
  AppWindow,
  SquareDashed,
  Sparkle
} from 'lucide-react';
import { OCTAVE_BANDS, ROOM_SURFACES } from '../utils/acousticCalculations';
import { DEFAULT_MATERIALS_DATABASE, MATERIAL_CATEGORIES, getMaterialById, DEFAULT_SUB_ELEMENTS_PRESETS } from '../utils/defaultMaterials';

/**
 * Componente de Materiales y Coeficientes de Absorción (α) con Sub-superficies (Puertas, Ventanas, Paneles)
 * Soporta polígonos dinámicos y dark mode.
 */
export default function SurfaceMaterials({
  materials = {},
  onChangeMaterials,
  surfaceAreas = {},
  surfacesList,
  selectedBand = 1000,
  setSelectedBand,
  absorptionData = {},
  reverberationData = {},
  soundFieldData = {},
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
  const [isSubElementsOpen, setIsSubElementsOpen] = useState(false);

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

  // Copiar a todas las paredes dinámicas
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
    setTimeout(() => setCopiedNotification(false), 2000);
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

  // Cálculo de sub-elementos
  const activeSubElements = currentSurfaceConfig.subElements || [];
  const activeSubAreaSum = activeSubElements.reduce((acc, el) => acc + (Number(el.area) || 0), 0);
  const activeBaseArea = Math.max(0, activeArea - activeSubAreaSum);

  // Coeficiente efectivo compuesto
  const baseAlpha = currentSurfaceConfig.coefficients?.[selectedBand] || 0.05;
  const subAbsSum = activeSubElements.reduce((acc, el) => {
    const a = el.coefficients?.[selectedBand] ?? baseAlpha;
    return acc + (Number(el.area) || 0) * a;
  }, 0);
  const totalSurfaceAbsAtBand = (activeBaseArea * baseAlpha) + subAbsSum;
  const effectiveAlphaAtBand = activeArea > 0 ? (totalSurfaceAbsAtBand / activeArea) : baseAlpha;

  // Métricas reactivas
  const currentAbs = absorptionData[selectedBand] || { equivalentAbsorption: 0, alphaMean: 0 };
  const currentRt = reverberationData[selectedBand] || { sabine: 0, eyring: 0, millington: 0 };
  const currentSf = soundFieldData[selectedBand] || { roomConstant: 0, criticalDistance: 0 };

  const wallCount = effectiveSurfaces.filter(s => s.id.startsWith('wall')).length;

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 shadow-apple-sm transition-all space-y-6">
      
      {/* Encabezado Principal y Selector de Banda Activa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight">
              2. Materiales y Coeficientes de Absorción (α)
            </h2>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              {effectiveSurfaces.length} superficies activas ({wallCount} paredes) · Impacto reactivo en tiempo real
            </p>
          </div>
        </div>

        {/* Píldora de Selección Rápida de Frecuencia */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap max-w-full">
          <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#18192a] p-1 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] overflow-x-auto no-scrollbar touch-scroll-x max-w-full">
            <span className="text-[11px] font-semibold text-[#86868b] dark:text-slate-400 px-2 hidden sm:inline">Banda Activa:</span>
            {OCTAVE_BANDS.map((freq) => (
              <button
                key={freq}
                onClick={() => setSelectedBand && setSelectedBand(freq)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xl transition ${
                  selectedBand === freq
                    ? 'bg-[#0071e3] text-white shadow-sm'
                    : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {freq >= 1000 ? `${freq / 1000}k` : `${freq}`} Hz
              </button>
            ))}
          </div>

          {/* Botón Replicar a todas las paredes */}
          <button
            onClick={handleCopyToAllWalls}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] hover:bg-[#e8e8ed] dark:hover:bg-[#222438] text-xs font-semibold text-[#1d1d1f] dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.08] transition active:scale-95"
            title={`Copiar material y coeficientes a las ${wallCount} paredes del recinto`}
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34c759]" />
                <span className="text-[#34c759] font-bold">¡Copiado a {wallCount} paredes!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Aplicar a {wallCount} paredes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tarjeta Flotante de Resultados Acústicos en Vivo para la Frecuencia Seleccionada */}
      <div className="bg-[#fbfbfd] dark:bg-[#161726] p-4 rounded-2xl border border-[#0071e3]/20 shadow-apple-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0071e3] text-white flex items-center justify-center font-black text-xs">
            {selectedBand >= 1000 ? `${selectedBand / 1000}k` : `${selectedBand}`}
          </div>
          <div>
            <div className="text-xs font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
              <span>Resultados para la Banda de {selectedBand} Hz</span>
              <span className="text-[10px] font-mono text-[#0071e3] dark:text-sky-400 bg-[#0071e3]/10 dark:bg-[#0071e3]/20 px-2 py-0.5 rounded-full font-bold">
                Evaluación reactiva
              </span>
            </div>
            <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-0.5">
              Absorción A = {currentAbs.equivalentAbsorption?.toFixed(2)} m² Sabine | Coef. Medio ᾱ = {currentAbs.alphaMean?.toFixed(3)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
          <div className="bg-white dark:bg-[#1c1e30] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-sans font-semibold">Constante R</div>
            <div className="font-bold text-[#1d1d1f] dark:text-white">{currentSf.roomConstant?.toFixed(2)} m²</div>
          </div>
          <div className="bg-white dark:bg-[#1c1e30] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-sans font-semibold">Distancia Crítica</div>
            <div className="font-bold text-[#34c759] dark:text-emerald-400">{currentSf.criticalDistance?.toFixed(2)} m</div>
          </div>
          <div className="bg-white dark:bg-[#1c1e30] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-sans font-semibold">RT Sabine</div>
            <div className="font-bold text-[#0071e3] dark:text-sky-400">{currentRt.sabine?.toFixed(2)} s</div>
          </div>
          <div className="bg-white dark:bg-[#1c1e30] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-[10px] text-[#86868b] dark:text-slate-400 font-sans font-semibold">RT Eyring / Mil.</div>
            <div className="font-bold text-[#ff9500] dark:text-amber-400">{currentRt.eyring?.toFixed(2)}s / {currentRt.millington?.toFixed(2)}s</div>
          </div>
        </div>
      </div>

      {/* Pestañas de Selección de Superficie (Piso, Techo, Paredes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {effectiveSurfaces.map((surf) => {
          const isActive = safeActiveId === surf.id;
          const surfArea = surfaceAreas[surf.id] || 0;
          const currentMat = getMaterialById(materials[surf.id]?.materialId);
          const alphaBand = materials[surf.id]?.coefficients?.[selectedBand] || 0.05;

          return (
            <button
              key={surf.id}
              onClick={() => setActiveSurfaceId(surf.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isActive
                  ? 'bg-white dark:bg-[#1a1c2e] border-[#0071e3] dark:border-sky-500 shadow-md ring-2 ring-[#0071e3]/20'
                  : 'bg-[#fbfbfd] dark:bg-[#161726] border-black/[0.06] dark:border-white/[0.08] hover:bg-[#f5f5f7] dark:hover:bg-[#1e2034]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? 'text-[#0071e3] dark:text-sky-400' : 'text-[#1d1d1f] dark:text-slate-200'}`}>
                    {surf.name.split('/')[0].split('(')[0]}
                  </span>
                  <span className="text-[10px] font-mono text-[#86868b] dark:text-slate-400">{surfArea.toFixed(1)} m²</span>
                </div>
                <p className="text-[11px] text-[#86868b] dark:text-slate-400 truncate mt-1" title={currentMat?.name || 'Material'}>
                  {currentMat?.name || 'Personalizado'}
                </p>
              </div>

              {/* Barra de Absorción Media para la Banda Seleccionada */}
              <div className="mt-3">
                <div className="flex justify-between text-[9px] text-[#86868b] dark:text-slate-400 font-mono mb-1">
                  <span>α @ {selectedBand}Hz</span>
                  <span className="text-[#1d1d1f] dark:text-white font-bold">{alphaBand.toFixed(2)}</span>
                </div>
                <div className="w-full bg-black/[0.06] dark:bg-white/[0.1] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#0071e3] dark:bg-sky-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, alphaBand * 100)}%` }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tarjeta de Configuración de la Superficie Activa */}
      <div className="bg-[#f5f5f7] dark:bg-[#161728] rounded-2xl p-5 sm:p-6 border border-black/[0.06] dark:border-white/[0.08]">
        
        {/* Barra Superior con Selector de Material */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] mb-5">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              {activeSurfaceMeta.name}
              <span className="text-xs font-mono font-medium text-[#0071e3] dark:text-sky-400 bg-[#0071e3]/10 dark:bg-[#0071e3]/20 px-2 py-0.5 rounded-md">
                Área = {activeArea.toFixed(2)} m²
              </span>
            </h3>
            <p className="text-xs text-[#86868b] dark:text-slate-400 mt-0.5">
              {activeSurfaceMeta.description}
            </p>
          </div>

          {/* Menú Desplegable de Materiales */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#86868b] dark:text-slate-400 hidden sm:inline">Material:</span>
            <select
              value={currentSurfaceConfig.materialId}
              onChange={(e) => handleSelectMaterial(safeActiveId, e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-[#1e2034] text-xs text-[#1d1d1f] dark:text-white font-semibold px-3.5 py-2 rounded-xl border border-black/[0.1] dark:border-white/[0.12] hover:border-black/[0.2] dark:hover:border-white/[0.25] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 shadow-2xs transition cursor-pointer max-w-full sm:max-w-xs"
            >
              <option value="custom" disabled={currentSurfaceConfig.materialId !== 'custom'}>
                ✏️ Valores Manuales / Personalizados
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

        {/* Inputs de Coeficiente por Banda de Octava */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {OCTAVE_BANDS.map((freq) => {
            const alpha = currentSurfaceConfig.coefficients[freq] || 0.05;
            const surfaceAbs = activeArea * alpha;
            const isSelected = selectedBand === freq;

            return (
              <div
                key={freq}
                onClick={() => setSelectedBand && setSelectedBand(freq)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#1a1c2e] border-[#0071e3] dark:border-sky-500 shadow-md ring-2 ring-[#0071e3]/30'
                    : 'bg-white dark:bg-[#1a1c2e] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.15]'
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-xs font-bold ${isSelected ? 'text-[#0071e3] dark:text-sky-400' : 'text-[#1d1d1f] dark:text-slate-200'}`}>
                    {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-[#0071e3] px-1.5 py-0.5 rounded-md">
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
                  className={`w-full font-mono text-center text-base font-bold py-1.5 px-2 rounded-lg border focus:outline-none transition ${
                    isSelected
                      ? 'bg-[#0071e3]/5 dark:bg-[#0071e3]/20 border-[#0071e3] text-[#0071e3] dark:text-sky-400'
                      : 'bg-[#fbfbfd] dark:bg-[#141524] border-black/[0.08] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white focus:border-[#0071e3]'
                  }`}
                />

                <div className="flex justify-between items-center text-[10px] font-mono text-[#86868b] dark:text-slate-400 mt-2 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <span>Aporte Sᵢ · α:</span>
                  <span className="text-[#1d1d1f] dark:text-slate-200 font-semibold">{surfaceAbs.toFixed(2)} m²</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Descripción del Material Seleccionado */}
        <div className="bg-white dark:bg-[#1a1c2e] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-xs text-[#86868b] dark:text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#0071e3] dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#1d1d1f] dark:text-white">{currentMatMeta.name}: </strong>
            <span>{currentMatMeta.description}</span>
          </div>
        </div>

        {/* --- SECCIÓN DE SUB-ELEMENTOS Y ABERTURAS (PUERTAS, VENTANAS, PANELES) --- */}
        <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <SquareDashed className="w-3.5 h-3.5 text-[#0071e3] dark:text-sky-400" />
                Sub-elementos en {activeSurfaceMeta.name.split('/')[0]}
              </span>
              <p className="text-[11px] text-[#86868b] dark:text-slate-400 mt-0.5">
                Incrusta aberturas o parches con área y coeficientes acústicos individuales.
              </p>
            </div>

            {/* Distribución Superficial y Toggle */}
            <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
              <span className="text-[#86868b] dark:text-slate-400">Base: <strong className="text-[#1d1d1f] dark:text-white">{activeBaseArea.toFixed(1)} m²</strong></span>
              <span className="text-[#86868b] dark:text-slate-600">•</span>
              <span className="text-[#86868b] dark:text-slate-400">Aberturas: <strong className="text-[#0071e3] dark:text-sky-400">{activeSubAreaSum.toFixed(1)} m²</strong></span>
              <button
                type="button"
                onClick={() => setIsSubElementsOpen(!isSubElementsOpen)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-[#1a1c2e] hover:bg-slate-100 dark:hover:bg-[#22253c] border border-black/[0.08] dark:border-white/[0.1] text-xs font-sans font-semibold text-[#0071e3] dark:text-sky-400 transition shadow-2xs"
              >
                <span>{isSubElementsOpen ? 'Ocultar' : `Gestionar (${activeSubElements.length})`}</span>
                {isSubElementsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Panel Desplegable de Sub-elementos */}
          {isSubElementsOpen && (
            <div className="animate-fadeIn space-y-3 pt-2">
              {/* Botones Rápidos para Añadir Sub-elementos */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[11px] font-semibold text-[#86868b] dark:text-slate-400 whitespace-nowrap">Añadir a la superficie:</span>
                {DEFAULT_SUB_ELEMENTS_PRESETS.map((preset) => (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleAddSubElement(safeActiveId, preset.type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1c2e] hover:bg-slate-100 dark:hover:bg-[#22253c] border border-black/[0.08] dark:border-white/[0.1] text-xs font-medium text-[#1d1d1f] dark:text-white transition-all shadow-2xs whitespace-nowrap active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.colorHex }}></span>
                    <span>+ {preset.name.split(' ')[0]} {preset.name.split(' ')[1] || ''}</span>
                  </button>
                ))}
              </div>

              {/* Lista de Sub-elementos Incrustados */}
              {activeSubElements.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-black/[0.1] dark:border-white/[0.1] bg-white/50 dark:bg-black/20 text-center text-xs text-[#86868b] dark:text-slate-400">
                  Esta superficie es 100% continua del material base. Haz clic arriba en <strong className="text-[#1d1d1f] dark:text-white">+ Añadir</strong> para incrustar una ventana, puerta o panel fonoabsorbente.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeSubElements.map((sub) => {
                    const subAlpha = sub.coefficients?.[selectedBand] || 0.05;
                    const subAbs = (Number(sub.area) || 0) * subAlpha;
                    return (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#1a1c2e] border border-black/[0.08] dark:border-white/[0.1] shadow-2xs flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.colorHex || '#0071e3' }}></span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white block truncate" title={sub.name}>
                                {sub.name}
                              </span>
                              <span className="text-[10px] text-[#86868b] dark:text-slate-400 font-medium">
                                {sub.category || 'Elemento'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubElement(safeActiveId, sub.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            title="Eliminar elemento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#86868b] dark:text-slate-400">Área:</span>
                            <input
                              type="number"
                              min="0.1"
                              max={activeArea}
                              step="0.1"
                              value={sub.area}
                              onChange={(e) => handleUpdateSubElementArea(safeActiveId, sub.id, e.target.value)}
                              className="w-16 font-mono font-bold text-xs bg-[#fbfbfd] dark:bg-[#141524] px-1.5 py-0.5 rounded border border-black/[0.1] dark:border-white/[0.12] text-center text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                            />
                            <span className="text-[10px] text-[#86868b] dark:text-slate-400 font-mono">m²</span>
                          </div>

                          <div className="text-right font-mono text-[11px]">
                            <span className="text-[#86868b] dark:text-slate-400">α: </span>
                            <strong className="text-[#0071e3] dark:text-sky-400">{subAlpha.toFixed(2)}</strong>
                            <span className="text-[10px] text-[#86868b] dark:text-slate-400 ml-1">({subAbs.toFixed(2)} m²)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resumen de Absorción Compuesta Ponderada de la Pared */}
              <div className="mt-3 p-3 rounded-xl bg-white dark:bg-[#1a1c2e] border border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1d1d1f] dark:text-white">Coeficiente Efectivo Compuesto (ᾱ @ {selectedBand}Hz):</span>
                  <span className="text-xs font-mono font-bold text-[#0071e3] dark:text-sky-400 bg-[#0071e3]/10 dark:bg-[#0071e3]/20 px-2 py-0.5 rounded-md">
                    ᾱ_efectivo = {effectiveAlphaAtBand.toFixed(3)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#86868b] dark:text-slate-400">
                  Absorción total cara = <strong className="text-[#1d1d1f] dark:text-white">{totalSurfaceAbsAtBand.toFixed(2)} m² Sabine</strong>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
