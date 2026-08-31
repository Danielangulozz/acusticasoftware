import React, { useState } from 'react';
import { 
  Layers, 
  Copy, 
  Check, 
  Info, 
  Sliders, 
  CheckCircle2,
  ChevronDown,
  Activity,
  Clock,
  Ruler,
  Volume2,
  Sparkles
} from 'lucide-react';
import { OCTAVE_BANDS, ROOM_SURFACES } from '../utils/acousticCalculations';
import { DEFAULT_MATERIALS_DATABASE, MATERIAL_CATEGORIES, getMaterialById } from '../utils/defaultMaterials';

/**
 * Componente de Materiales y Coeficientes de Absorción (α)
 * Estilo Minimalista Apple / Tesla con Selección e Integración Reactiva por Frecuencia
 */
export default function SurfaceMaterials({
  materials,
  onChangeMaterials,
  surfaceAreas,
  selectedBand = 1000,
  setSelectedBand,
  absorptionData = {},
  reverberationData = {},
  soundFieldData = {},
}) {
  const [activeSurfaceId, setActiveSurfaceId] = useState('ceiling');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handleSelectMaterial = (surfaceId, materialId) => {
    const selectedMat = getMaterialById(materialId);
    onChangeMaterials({
      ...materials,
      [surfaceId]: {
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
          ...materials[surfaceId].coefficients,
          [freq]: safeVal,
        },
      },
    });
  };

  const handleCopyToAllWalls = () => {
    const currentCoeffs = materials[activeSurfaceId].coefficients;
    const currentMatId = materials[activeSurfaceId].materialId;

    const updated = { ...materials };
    ['wallNorth', 'wallSouth', 'wallEast', 'wallWest'].forEach((wallId) => {
      updated[wallId] = {
        materialId: currentMatId,
        coefficients: { ...currentCoeffs },
      };
    });

    onChangeMaterials(updated);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const currentSurfaceConfig = materials[activeSurfaceId] || {
    materialId: 'custom',
    coefficients: { 125: 0.1, 250: 0.1, 500: 0.1, 1000: 0.1, 2000: 0.1, 4000: 0.1 },
  };

  const currentMatMeta = getMaterialById(currentSurfaceConfig.materialId);
  const activeArea = surfaceAreas[activeSurfaceId] || 0;

  // Datos reactivos de la frecuencia seleccionada
  const currentAbs = absorptionData[selectedBand] || { equivalentAbsorption: 0, alphaMean: 0 };
  const currentRt = reverberationData[selectedBand] || { sabine: 0, eyring: 0, millington: 0 };
  const currentSf = soundFieldData[selectedBand] || { roomConstant: 0, criticalDistance: 0 };

  return (
    <div className="bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 shadow-apple-sm transition-all space-y-6">
      
      {/* Encabezado Principal y Selector de Banda Activa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-black/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              2. Materiales y Coeficientes de Absorción (α)
            </h2>
            <p className="text-xs text-[#86868b]">
              Configura coeficientes por superficie y evalúa el impacto reactivo en la frecuencia seleccionada
            </p>
          </div>
        </div>

        {/* Píldora de Selección Rápida de Frecuencia */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-2xl border border-black/[0.04]">
            <span className="text-[11px] font-semibold text-[#86868b] px-2 hidden sm:inline">Banda Activa:</span>
            {OCTAVE_BANDS.map((freq) => (
              <button
                key={freq}
                onClick={() => setSelectedBand && setSelectedBand(freq)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xl transition ${
                  selectedBand === freq
                    ? 'bg-[#0071e3] text-white shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                {freq >= 1000 ? `${freq / 1000}k` : `${freq}`} Hz
              </button>
            ))}
          </div>

          {/* Botón Replicar a las 4 Paredes */}
          <button
            onClick={handleCopyToAllWalls}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-xs font-semibold text-[#1d1d1f] border border-black/[0.06] transition active:scale-95"
            title="Copiar los coeficientes de esta superficie a las 4 paredes laterales"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34c759]" />
                <span className="text-[#34c759]">¡Copiado a 4 paredes!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Aplicar a 4 paredes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tarjeta Flotante de Resultados Acústicos en Vivo para la Frecuencia Seleccionada */}
      <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-[#0071e3]/20 shadow-apple-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0071e3] text-white flex items-center justify-center font-black text-xs">
            {selectedBand >= 1000 ? `${selectedBand / 1000}k` : `${selectedBand}`}
          </div>
          <div>
            <div className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
              <span>Resultados para la Banda de {selectedBand} Hz</span>
              <span className="text-[10px] font-mono text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full font-bold">
                Evaluación en tiempo real
              </span>
            </div>
            <div className="text-[11px] text-[#86868b] mt-0.5">
              Absorción A = {currentAbs.equivalentAbsorption?.toFixed(2)} m² Sabine | Coef. Medio ᾱ = {currentAbs.alphaMean?.toFixed(3)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
          <div className="bg-white p-2.5 rounded-xl border border-black/[0.04]">
            <div className="text-[10px] text-[#86868b] font-sans font-semibold">Constante R</div>
            <div className="font-bold text-[#1d1d1f]">{currentSf.roomConstant?.toFixed(2)} m²</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-black/[0.04]">
            <div className="text-[10px] text-[#86868b] font-sans font-semibold">Distancia Crítica</div>
            <div className="font-bold text-[#34c759]">{currentSf.criticalDistance?.toFixed(2)} m</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-black/[0.04]">
            <div className="text-[10px] text-[#86868b] font-sans font-semibold">RT Sabine</div>
            <div className="font-bold text-[#0071e3]">{currentRt.sabine?.toFixed(2)} s</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-black/[0.04]">
            <div className="text-[10px] text-[#86868b] font-sans font-semibold">RT Eyring / Mil.</div>
            <div className="font-bold text-[#ff9500]">{currentRt.eyring?.toFixed(2)}s / {currentRt.millington?.toFixed(2)}s</div>
          </div>
        </div>
      </div>

      {/* Pestañas de Selección de Superficie (Piso, Techo, Paredes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ROOM_SURFACES.map((surf) => {
          const isActive = activeSurfaceId === surf.id;
          const surfArea = surfaceAreas[surf.id] || 0;
          const currentMat = getMaterialById(materials[surf.id]?.materialId);
          const alphaBand = materials[surf.id]?.coefficients?.[selectedBand] || 0.05;

          return (
            <button
              key={surf.id}
              onClick={() => setActiveSurfaceId(surf.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-[#0071e3] shadow-md ring-2 ring-[#0071e3]/20'
                  : 'bg-[#fbfbfd] border-black/[0.06] hover:bg-[#f5f5f7] hover:border-black/[0.12]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? 'text-[#0071e3]' : 'text-[#1d1d1f]'}`}>
                    {surf.name.split('/')[0].split('(')[0]}
                  </span>
                  <span className="text-[10px] font-mono text-[#86868b]">{surfArea.toFixed(1)} m²</span>
                </div>
                <p className="text-[11px] text-[#86868b] truncate mt-1" title={currentMat.name}>
                  {currentMat.name}
                </p>
              </div>

              {/* Barra de Absorción Media para la Banda Seleccionada */}
              <div className="mt-3">
                <div className="flex justify-between text-[9px] text-[#86868b] font-mono mb-1">
                  <span>α @ {selectedBand}Hz</span>
                  <span className="text-[#1d1d1f] font-bold">{alphaBand.toFixed(2)}</span>
                </div>
                <div className="w-full bg-black/[0.06] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#0071e3] h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, alphaBand * 100)}%` }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tarjeta de Configuración de la Superficie Activa */}
      <div className="bg-[#f5f5f7] rounded-2xl p-5 sm:p-6 border border-black/[0.06]">
        
        {/* Barra Superior con Selector de Material */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] mb-5">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
              {ROOM_SURFACES.find((s) => s.id === activeSurfaceId)?.name}
              <span className="text-xs font-mono font-medium text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-md">
                Área = {activeArea.toFixed(2)} m²
              </span>
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              {ROOM_SURFACES.find((s) => s.id === activeSurfaceId)?.description}
            </p>
          </div>

          {/* Menú Desplegable de Materiales */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#86868b] hidden sm:inline">Material:</span>
            <select
              value={currentSurfaceConfig.materialId}
              onChange={(e) => handleSelectMaterial(activeSurfaceId, e.target.value)}
              className="bg-white text-xs text-[#1d1d1f] font-semibold px-3.5 py-2 rounded-xl border border-black/[0.1] hover:border-black/[0.2] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 shadow-2xs transition cursor-pointer max-w-xs"
            >
              <option value="custom" disabled={currentSurfaceConfig.materialId !== 'custom'}>
                ✏️ Valores Manuales / Personalizados
              </option>
              {Object.entries(MATERIAL_CATEGORIES).map(([catKey, catName]) => (
                <optgroup key={catKey} label={catName} className="font-bold text-slate-800">
                  {DEFAULT_MATERIALS_DATABASE.filter((m) => m.category === catName).map((mat) => (
                    <option key={mat.id} value={mat.id} className="text-[#1d1d1f]">
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
                    ? 'bg-white border-[#0071e3] shadow-md ring-2 ring-[#0071e3]/30'
                    : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-xs font-bold ${isSelected ? 'text-[#0071e3]' : 'text-[#1d1d1f]'}`}>
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
                  onChange={(e) => handleCoefficientChange(activeSurfaceId, freq, e.target.value)}
                  className={`w-full font-mono text-center text-base font-bold py-1.5 px-2 rounded-lg border focus:outline-none transition ${
                    isSelected
                      ? 'bg-[#0071e3]/5 border-[#0071e3] text-[#0071e3]'
                      : 'bg-[#fbfbfd] border-black/[0.08] text-[#1d1d1f] focus:border-[#0071e3]'
                  }`}
                />

                <div className="flex justify-between items-center text-[10px] font-mono text-[#86868b] mt-2 pt-1.5 border-t border-black/[0.04]">
                  <span>Aporte Sᵢ · α:</span>
                  <span className="text-[#1d1d1f] font-semibold">{surfaceAbs.toFixed(2)} m²</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Descripción del Material Seleccionado */}
        <div className="bg-white p-3 rounded-xl border border-black/[0.06] text-xs text-[#86868b] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#1d1d1f]">{currentMatMeta.name}: </strong>
            <span>{currentMatMeta.description}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
