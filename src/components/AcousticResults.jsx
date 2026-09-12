import React from 'react';
import { 
  TableProperties, 
  Activity, 
  Clock, 
  Volume2, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Ruler, 
  Target
} from 'lucide-react';
import { OCTAVE_BANDS } from '../utils/acousticCalculations';

/**
 * Componente de Resultados y Parámetros Acústicos
 * Con soporte completo de Dark Mode y paleta morada POZOLE.
 */
export default function AcousticResults({
  absorptionData,
  reverberationData,
  soundFieldData,
  optimumRT,
  roomType,
  setRoomType,
  selectedBand,
  setSelectedBand,
}) {
  const activeBand = selectedBand || 500;
  const rtActive = reverberationData[activeBand] || { sabine: 0, eyring: 0, millington: 0 };
  const absActive = absorptionData[activeBand] || { equivalentAbsorption: 0, alphaMean: 0 };
  const fieldActive = soundFieldData[activeBand] || {
    criticalDistance: 0,
    lpTotalWithAir: 0,
    directIntensityLevel: 0,
    revIntensityLevel: 0,
    drrDb: 0,
    roomConstant: 0,
    distance: 3.0,
  };

  const avgRT = (rtActive.sabine + rtActive.eyring) / 2;
  const isRTInOptRange = avgRT >= optimumRT.min && avgRT <= optimumRT.max;
  const isRTTooLive = avgRT > optimumRT.max;

  const bandLabel = activeBand >= 1000 ? `${activeBand / 1000} kHz` : `${activeBand} Hz`;

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 shadow-apple-sm transition-colors">
      
      {/* Encabezado con Selector de Uso y Selector de Banda Activa */}
      <div className="flex flex-col gap-4 pb-5 border-b border-black/[0.06] dark:border-white/[0.06] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] flex items-center justify-center font-bold">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight">
                4. Resultados y Parámetros Acústicos Calculados
              </h2>
              <p className="text-xs text-[#86868b] dark:text-slate-400">
                Modelos de reverberación (Sabine, Eyring, Millington-Sette) y campo sonoro reactivos a la banda activa
              </p>
            </div>
          </div>

          {/* Selector de Uso de Sala para RT Óptimo */}
          <div className="flex items-center gap-2 bg-[#f5f5f7] dark:bg-[#181a28] px-3.5 py-1.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] self-start sm:self-auto">
            <Target className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
            <span className="text-xs font-semibold text-[#86868b] dark:text-slate-400">Uso:</span>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#1d1d1f] dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="speech" className="dark:bg-[#181a28]">Voz / Conferencias (Aulas)</option>
              <option value="music" className="dark:bg-[#181a28]">Música Clásica / Concierto</option>
              <option value="studio" className="dark:bg-[#181a28]">Estudio / Grabación</option>
              <option value="multipurpose" className="dark:bg-[#181a28]">Polivalente / Teatro</option>
            </select>
          </div>
        </div>

        {/* Barra de Selección Rápida de Banda de Octava */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
          <span className="text-xs font-semibold text-[#86868b] dark:text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#8767f9]" />
            Banda analizada en tarjetas KPI:
          </span>
          <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#181a28] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
            {OCTAVE_BANDS.map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setSelectedBand && setSelectedBand(freq)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  activeBand === freq
                    ? 'bg-[#5833c7] text-white shadow-xs'
                    : 'text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {freq >= 1000 ? `${freq / 1000}k` : freq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- TARJETAS KPI DINÁMICAS SEGÚN LA BANDA SELECCIONADA --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* KPI 1: Tiempo de Reverberación RT60 */}
        <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#8767f9]" /> RT₆₀ @ {bandLabel}
              </span>
              <span className="text-[10px] font-mono text-[#86868b] dark:text-slate-400 bg-white dark:bg-[#20233c] px-2 py-0.5 rounded-md border border-black/[0.04] dark:border-white/[0.06]">
                Opt: {optimumRT.optimal}s
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#1d1d1f] dark:text-white font-mono tracking-tight">
                {rtActive.sabine.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#86868b] dark:text-slate-400">seg (Sabine)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px] font-mono">
              <div className="text-[#86868b] dark:text-slate-400">
                Eyring: <strong className="text-[#34c759]">{rtActive.eyring.toFixed(2)}s</strong>
              </div>
              <div className="text-[#86868b] dark:text-slate-400">
                Millington: <strong className="text-[#ff9500]">{rtActive.millington.toFixed(2)}s</strong>
              </div>
            </div>
          </div>

          {/* Estado de Conformidad */}
          <div className={`mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px] flex items-center gap-1.5 font-medium ${
            isRTInOptRange ? 'text-[#34c759]' : isRTTooLive ? 'text-[#ff9500]' : 'text-[#5833c7] dark:text-[#8767f9]'
          }`}>
            {isRTInOptRange ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Dentro del rango óptimo ({optimumRT.min}s - {optimumRT.max}s)</span>
              </>
            ) : isRTTooLive ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Sala reverberante (requiere absorción)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Sala seca (absorción elevada)</span>
              </>
            )}
          </div>
        </div>

        {/* KPI 2: Absorción Total A */}
        <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#8767f9]" /> Absorción A @ {bandLabel}
              </span>
              <span className="text-[10px] font-mono text-[#5833c7] dark:text-[#8767f9] bg-[#5833c7]/10 dark:bg-[#8767f9]/20 px-2 py-0.5 rounded-md font-semibold">
                ᾱ = {absActive.alphaMean.toFixed(2)}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#1d1d1f] dark:text-white font-mono tracking-tight">
                {absActive.equivalentAbsorption.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#86868b] dark:text-slate-400">m² Sabine</span>
            </div>

            <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
              Constante de Sala (R): <strong className="text-[#1d1d1f] dark:text-white font-mono">{fieldActive.roomConstant?.toFixed(2)} m²</strong>
            </div>
          </div>

          <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
            <span>Régimen de sala:</span>
            <strong className="text-[#1d1d1f] dark:text-white">
              {absActive.alphaMean < 0.2 ? 'Reflectante (Difuso)' : absActive.alphaMean > 0.4 ? 'Absorbente' : 'Equilibrado'}
            </strong>
          </div>
        </div>

        {/* KPI 3: Distancia Crítica Dc */}
        <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-[#34c759]" /> Distancia Crítica (Dc)
              </span>
              <span className="text-[10px] font-mono text-[#34c759] bg-[#34c759]/10 px-2 py-0.5 rounded-md font-semibold">
                If = Ir
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#34c759] font-mono tracking-tight">
                {fieldActive.criticalDistance.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#86868b] dark:text-slate-400">metros (@ {bandLabel})</span>
            </div>

            <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] font-mono">
              Dc = 0.057 · √(Q · R)
            </div>
          </div>

          <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
            <span>Radio de reverberación:</span>
            <strong className="text-[#34c759] font-mono">
              {fieldActive.criticalDistance.toFixed(2)} m
            </strong>
          </div>
        </div>

        {/* KPI 4: Nivel de Presión Sonora Total Lp */}
        <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#ff9500]" /> Nivel Total (Lp)
              </span>
              <span className="text-[10px] font-mono text-[#86868b] dark:text-slate-400 bg-white dark:bg-[#20233c] px-2 py-0.5 rounded-md border border-black/[0.04] dark:border-white/[0.06]">
                r = {fieldActive.distance}m
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#ff9500] font-mono tracking-tight">
                {fieldActive.lpTotalWithAir.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-[#86868b] dark:text-slate-400">dB SPL (@ {bandLabel})</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px] font-mono">
              <div className="text-[#86868b] dark:text-slate-400">
                Directo: <strong className="text-[#1d1d1f] dark:text-white">{fieldActive.directIntensityLevel.toFixed(1)} dB</strong>
              </div>
              <div className="text-[#86868b] dark:text-slate-400">
                Reverb: <strong className="text-[#1d1d1f] dark:text-white">{fieldActive.revIntensityLevel.toFixed(1)} dB</strong>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#86868b] dark:text-slate-400 mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
            <span>Relación Directo/Rev (DRR):</span>
            <strong className={`font-mono ${fieldActive.drrDb >= 0 ? 'text-[#34c759]' : 'text-[#5833c7] dark:text-[#8767f9]'}`}>
              {fieldActive.drrDb > 0 ? `+${fieldActive.drrDb.toFixed(1)}` : fieldActive.drrDb.toFixed(1)} dB
            </strong>
          </div>
        </div>

      </div>

      {/* --- TABLA COMPLETA POR BANDAS DE OCTAVA --- */}
      <div className="bg-white dark:bg-[#16182a] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden shadow-2xs">
        
        <div className="px-5 py-3.5 bg-[#fbfbfd] dark:bg-[#1a1d32] border-b border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
            <span>Tabla Comparativa Completa por Bandas de Octava</span>
          </div>
          <span className="text-[11px] text-[#86868b] dark:text-slate-400 font-mono">
            Haz clic en una banda para destacarla
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1d1d1f] dark:text-white">
            <thead className="bg-[#f5f5f7] dark:bg-[#1c1e34] text-[11px] text-[#86868b] dark:text-slate-400 uppercase font-mono border-b border-black/[0.06] dark:border-white/[0.06]">
              <tr>
                <th className="px-4 py-3">Frecuencia</th>
                <th className="px-3 py-3 text-right">Abs. A (m² Sab)</th>
                <th className="px-3 py-3 text-right">Coef. ᾱ</th>
                <th className="px-3 py-3 text-right">Const. R (m²)</th>
                <th className="px-3 py-3 text-right text-[#5833c7] dark:text-[#8767f9] font-bold">RT Sabine (s)</th>
                <th className="px-3 py-3 text-right text-[#34c759] font-bold">RT Eyring (s)</th>
                <th className="px-3 py-3 text-right text-[#ff9500] font-bold">RT Millington (s)</th>
                <th className="px-3 py-3 text-right">Refl. n</th>
                <th className="px-3 py-3 text-right text-[#34c759] font-bold">Dc (m)</th>
                <th className="px-3 py-3 text-right">Lp,dir (dB)</th>
                <th className="px-3 py-3 text-right">Lp,rev (dB)</th>
                <th className="px-4 py-3 text-right text-[#ff9500] font-bold">Lp Total (dB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] font-mono">
              {OCTAVE_BANDS.map((freq) => {
                const abs = absorptionData[freq] || {};
                const rt = reverberationData[freq] || {};
                const sf = soundFieldData[freq] || {};
                const isSelected = selectedBand === freq;

                return (
                  <tr
                    key={freq}
                    onClick={() => setSelectedBand(freq)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected 
                        ? 'bg-[#5833c7]/10 dark:bg-[#8767f9]/20 font-bold' 
                        : 'hover:bg-[#fbfbfd] dark:hover:bg-[#1a1d32]'
                    }`}
                  >
                    <td className="px-4 py-3 font-sans font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#5833c7] dark:bg-[#8767f9]' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                      {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{abs.equivalentAbsorption?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-medium">{abs.alphaMean?.toFixed(3)}</td>
                    <td className="px-3 py-3 text-right font-medium">{sf.roomConstant?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#5833c7] dark:text-[#8767f9] font-bold">{rt.sabine?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#34c759] font-bold">{rt.eyring?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#ff9500] font-bold">{rt.millington?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#86868b] dark:text-slate-400">{Math.round(rt.reflectionsSabine || 0)}</td>
                    <td className="px-3 py-3 text-right text-[#34c759] font-bold">{sf.criticalDistance?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#86868b] dark:text-slate-400">{sf.directIntensityLevel?.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right text-[#86868b] dark:text-slate-400">{sf.revIntensityLevel?.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-[#ff9500] font-bold">{sf.lpTotalWithAir?.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
