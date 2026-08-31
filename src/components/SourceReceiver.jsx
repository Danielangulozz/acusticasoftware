import React from 'react';
import { 
  Volume2, 
  Compass, 
  Ruler, 
  Wind, 
  Activity, 
  Radio, 
  Sparkles,
  Info 
} from 'lucide-react';
import { 
  DIRECTIVITY_PRESETS, 
  SPEED_OF_SOUND, 
  powerWattsToLw, 
  lwToPowerWatts 
} from '../utils/acousticCalculations';

import RoomVisualizer from './RoomVisualizer';

/**
 * Componente de Parámetros de Fuente Sonora, Directividad y Receptor
 * Estilo Minimalista Apple / Tesla
 */
export default function SourceReceiver({
  sourceReceiver,
  onChange,
  includeAirAbsorption,
  setIncludeAirAbsorption,
  criticalDistance,
  maxRoomDimension,
  dimensions,
}) {
  const handleLwChange = (val) => {
    const num = parseFloat(val);
    onChange({
      ...sourceReceiver,
      lw: isNaN(num) ? 0 : num,
    });
  };

  const handleWattsChange = (val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const calculatedLw = powerWattsToLw(num);
      onChange({
        ...sourceReceiver,
        lw: Number(calculatedLw.toFixed(1)),
      });
    }
  };

  const handleDistanceChange = (val) => {
    const num = parseFloat(val);
    onChange({
      ...sourceReceiver,
      distance: isNaN(num) ? 0.1 : Math.max(0.1, num),
    });
  };

  const handleDirectivityChange = (qVal) => {
    onChange({
      ...sourceReceiver,
      directivity: Number(qVal),
    });
  };

  const currentWatts = lwToPowerWatts(sourceReceiver.lw);
  const r = sourceReceiver.distance || 1.0;
  const Dc = criticalDistance || 2.0;
  const isDirectDominant = r < Dc;

  return (
    <div className="bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 shadow-apple-sm transition-all">
      
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-5 border-b border-black/[0.06] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ff9500]/10 text-[#ff9500] flex items-center justify-center font-bold">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              3. Fuente Acústica, Directividad (Q) y Receptor
            </h2>
            <p className="text-xs text-[#86868b]">
              Potencia emitida (W / Lw), factor de ubicación espacial Q, distancia r y disipación del aire
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- COLUMNA 1: FUENTE SONORA --- */}
        <div className="bg-[#fbfbfd] p-5 sm:p-6 rounded-2xl border border-black/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#ff9500]" /> Parámetros de la Fuente
              </span>
              <span className="text-[11px] font-mono text-[#86868b]">
                W₀ = 10⁻¹² W (1 pW)
              </span>
            </div>

            {/* Inputs de Lw y Watts con sincronización bidireccional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              
              {/* Nivel de Potencia Lw (dB) */}
              <div className="bg-white p-4 rounded-xl border border-black/[0.06] shadow-2xs">
                <label className="text-xs font-semibold text-[#86868b] block mb-1">
                  Nivel de Potencia (Lw)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="30"
                    max="160"
                    step="0.5"
                    value={sourceReceiver.lw}
                    onChange={(e) => handleLwChange(e.target.value)}
                    className="w-full bg-[#fbfbfd] font-mono text-xl font-bold text-[#1d1d1f] px-3 py-1.5 rounded-lg border border-black/[0.08] focus:outline-none focus:border-[#ff9500]"
                  />
                  <span className="text-xs font-bold text-[#86868b] font-mono">dB</span>
                </div>
                <span className="text-[10px] text-[#86868b] font-mono mt-1.5 block">
                  Lw = 10 · log10(W / 10⁻¹²)
                </span>
              </div>

              {/* Potencia Acústica W (Watts) */}
              <div className="bg-white p-4 rounded-xl border border-black/[0.06] shadow-2xs">
                <label className="text-xs font-semibold text-[#86868b] block mb-1">
                  Potencia Real (W)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.0000001"
                    max="1000"
                    step="0.001"
                    value={currentWatts > 0.001 ? currentWatts.toFixed(4) : currentWatts.toExponential(3)}
                    onChange={(e) => handleWattsChange(e.target.value)}
                    className="w-full bg-[#fbfbfd] font-mono text-sm font-bold text-[#1d1d1f] px-3 py-2 rounded-lg border border-black/[0.08] focus:outline-none focus:border-[#ff9500]"
                  />
                  <span className="text-xs font-bold text-[#86868b] font-mono">W</span>
                </div>
                <span className="text-[10px] text-[#86868b] font-mono mt-1.5 block">
                  {currentWatts >= 1 ? `${currentWatts.toFixed(2)} W` : `${(currentWatts * 1000).toFixed(2)} mW`}
                </span>
              </div>

            </div>

            {/* Factor de Directividad Q */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-[#1d1d1f] flex items-center justify-between mb-2.5">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#ff9500]" />
                  Ubicación Espacial / Directividad (Q)
                </span>
                <span className="text-xs font-mono font-bold text-[#ff9500]">
                  Q = {sourceReceiver.directivity}
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIRECTIVITY_PRESETS.map((preset) => {
                  const isSelected = sourceReceiver.directivity === preset.value;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => handleDirectivityChange(preset.value)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-white border-[#ff9500] shadow-sm ring-2 ring-[#ff9500]/20'
                          : 'bg-white border-black/[0.06] text-[#86868b] hover:border-black/[0.15]'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs text-[#ff9500]">
                        Q = {preset.value}
                      </div>
                      <div className="text-[10px] text-[#1d1d1f] font-medium mt-1 leading-tight">
                        {preset.value === 1 && 'Espacio Libre (4π)'}
                        {preset.value === 2 && 'Pared o Piso (2π)'}
                        {preset.value === 4 && 'En Arista (π)'}
                        {preset.value === 8 && 'En Esquina (π/2)'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#86868b] mt-3 bg-white p-3 rounded-xl border border-black/[0.06]">
            {DIRECTIVITY_PRESETS.find((p) => p.value === sourceReceiver.directivity)?.desc}
          </p>
        </div>

        {/* --- COLUMNA 2: RECEPTOR Y ENTORNO --- */}
        <div className="bg-[#fbfbfd] p-5 sm:p-6 rounded-2xl border border-black/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#0071e3]" /> Posición del Receptor
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isDirectDominant 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                {isDirectDominant ? 'Dominio: Campo Directo' : 'Dominio: Campo Reverberado'}
              </span>
            </div>

            {/* Slider de Distancia r */}
            <div className="bg-white p-4 rounded-xl border border-black/[0.06] shadow-2xs mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-[#86868b]">
                  Distancia Fuente - Receptor (r)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.1"
                    max={maxRoomDimension || 50}
                    step="0.1"
                    value={r}
                    onChange={(e) => handleDistanceChange(e.target.value)}
                    className="w-20 bg-[#fbfbfd] font-mono text-right text-base font-bold text-[#1d1d1f] px-2.5 py-1 rounded-lg border border-black/[0.08] focus:outline-none focus:border-[#0071e3]"
                  />
                  <span className="text-xs font-bold text-[#86868b] font-mono">m</span>
                </div>
              </div>

              {/* Slider Nativo iOS */}
              <input
                type="range"
                min="0.2"
                max={Math.max(15, (maxRoomDimension || 30))}
                step="0.1"
                value={r}
                onChange={(e) => handleDistanceChange(e.target.value)}
                className="w-full accent-[#0071e3] cursor-pointer mt-1"
              />

              <div className="flex justify-between items-center text-[11px] font-mono text-[#86868b] mt-3 pt-2 border-t border-black/[0.04]">
                <span>Distancia Crítica (Dc @ 1kHz):</span>
                <span className="text-[#34c759] font-bold">{Dc.toFixed(2)} m</span>
              </div>
            </div>

            {/* Opciones Ambientales (Velocidad c y Absorción del Aire m) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              
              <div className="bg-white p-3.5 rounded-xl border border-black/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wind className="w-4 h-4 text-[#0071e3]" />
                  <div>
                    <div className="text-xs font-semibold text-[#1d1d1f]">Velocidad c</div>
                    <div className="text-[10px] text-[#86868b]">Aire a 20 °C</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#1d1d1f]">{SPEED_OF_SOUND} m/s</span>
              </div>

              {/* Toggle de Absorción Atmosférica 4mV */}
              <div className="bg-white p-3.5 rounded-xl border border-black/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-[#0071e3]" />
                  <div>
                    <div className="text-xs font-semibold text-[#1d1d1f]">Absorción Aire (m)</div>
                    <div className="text-[10px] text-[#86868b]">Término 4mV</div>
                  </div>
                </div>
                
                {/* Switch estilo iOS */}
                <button
                  type="button"
                  onClick={() => setIncludeAirAbsorption(!includeAirAbsorption)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    includeAirAbsorption ? 'bg-[#34c759]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      includeAirAbsorption ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* Estado en Tiempo Real */}
          <div className={`p-3.5 rounded-xl border text-xs font-medium mt-3 flex items-center justify-between ${
            isDirectDominant 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <span>
              {isDirectDominant ? '🎯 Receptor en zona de campo directo (r < Dc):' : '🌊 Receptor en zona reverberada (r > Dc):'}
            </span>
            <strong className="font-mono">
              {isDirectDominant ? 'Predomina sonido directo' : 'Predominan reflexiones'}
            </strong>
          </div>
        </div>

      </div>

      {/* Visualizador 3D Integrado en el Módulo de Fuente y Receptor */}
      {dimensions && (
        <div className="mt-8 border-t border-black/[0.06] pt-6">
          <RoomVisualizer
            dimensions={dimensions}
            sourceReceiver={sourceReceiver}
            criticalDistance={criticalDistance}
            onChangeSourceReceiver={onChange}
          />
        </div>
      )}

    </div>
  );
}
