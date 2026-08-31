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
 * Estilo Minimalista Apple / Tesla
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
  const rt500 = reverberationData[500] || { sabine: 0, eyring: 0, millington: 0 };
  const abs500 = absorptionData[500] || { equivalentAbsorption: 0, alphaMean: 0 };
  const field500 = soundFieldData[500] || {
    criticalDistance: 0,
    lpTotalWithAir: 0,
    directIntensityLevel: 0,
    revIntensityLevel: 0,
    drrDb: 0,
    roomConstant: 0,
  };

  const avgRT500 = (rt500.sabine + rt500.eyring) / 2;
  const isRTInOptRange = avgRT500 >= optimumRT.min && avgRT500 <= optimumRT.max;
  const isRTTooLive = avgRT500 > optimumRT.max;

  return (
    <div className="bg-white rounded-3xl border border-black/[0.08] p-6 sm:p-8 shadow-apple-sm transition-all">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-black/[0.06] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              4. Resultados y Parámetros Acústicos Calculados
            </h2>
            <p className="text-xs text-[#86868b]">
              Modelos de reverberación (Sabine, Eyring, Millington-Sette) y campo sonoro por octavas
            </p>
          </div>
        </div>

        {/* Selector de Uso de Sala para RT Óptimo */}
        <div className="flex items-center gap-2 bg-[#f5f5f7] px-3.5 py-1.5 rounded-2xl border border-black/[0.04] self-start sm:self-auto">
          <Target className="w-4 h-4 text-[#0071e3]" />
          <span className="text-xs font-semibold text-[#86868b]">Uso:</span>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#1d1d1f] focus:outline-none cursor-pointer"
          >
            <option value="speech">Voz / Conferencias (Aulas)</option>
            <option value="music">Música Clásica / Concierto</option>
            <option value="studio">Estudio / Grabación</option>
            <option value="multipurpose">Polivalente / Teatro</option>
          </select>
        </div>
      </div>

      {/* --- TARJETAS KPI EJECUTIVAS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* KPI 1: Tiempo de Reverberación RT60 @ 500Hz */}
        <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" /> RT₆₀ @ 500 Hz
              </span>
              <span className="text-[10px] font-mono text-[#86868b] bg-white px-2 py-0.5 rounded-md border border-black/[0.04]">
                Opt: {optimumRT.optimal}s
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#1d1d1f] font-mono tracking-tight">
                {rt500.sabine.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#86868b]">seg (Sabine)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-black/[0.04] text-[11px] font-mono">
              <div className="text-[#86868b]">
                Eyring: <strong className="text-[#34c759]">{rt500.eyring.toFixed(2)}s</strong>
              </div>
              <div className="text-[#86868b]">
                Millington: <strong className="text-[#ff9500]">{rt500.millington.toFixed(2)}s</strong>
              </div>
            </div>
          </div>

          {/* Estado de Conformidad */}
          <div className={`mt-3 pt-2 border-t border-black/[0.04] text-[11px] flex items-center gap-1.5 font-medium ${
            isRTInOptRange ? 'text-[#34c759]' : isRTTooLive ? 'text-[#ff9500]' : 'text-[#0071e3]'
          }`}>
            {isRTInOptRange ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Dentro del rango óptimo ({optimumRT.min}s - {optimumRT.max}s)</span>
              </>
            ) : isRTTooLive ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Sala muy reverberante (requiere absorción)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Sala muy seca (absorción elevada)</span>
              </>
            )}
          </div>
        </div>

        {/* KPI 2: Absorción Total A @ 500Hz */}
        <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0071e3]" /> Absorción A @ 500Hz
              </span>
              <span className="text-[10px] font-mono text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-md font-semibold">
                ᾱ = {abs500.alphaMean.toFixed(2)}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#1d1d1f] font-mono tracking-tight">
                {abs500.equivalentAbsorption.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#86868b]">m² Sabine</span>
            </div>

            <div className="text-[11px] text-[#86868b] mt-3 pt-2 border-t border-black/[0.04]">
              Constante de Sala (R): <strong className="text-[#1d1d1f] font-mono">{field500.roomConstant?.toFixed(2)} m²</strong>
            </div>
          </div>

          <div className="text-[11px] text-[#86868b] mt-3 pt-2 border-t border-black/[0.04] flex items-center justify-between">
            <span>Régimen de sala:</span>
            <strong className="text-[#1d1d1f]">
              {abs500.alphaMean < 0.2 ? 'Reflectante (Difuso)' : abs500.alphaMean > 0.4 ? 'Absorbente' : 'Equilibrado'}
            </strong>
          </div>
        </div>

        {/* KPI 3: Distancia Crítica Dc */}
        <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-[#34c759]" /> Distancia Crítica (Dc)
              </span>
              <span className="text-[10px] font-mono text-[#34c759] bg-[#34c759]/10 px-2 py-0.5 rounded-md font-semibold">
                If = Ir
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#34c759] font-mono tracking-tight">
                {field500.criticalDistance.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#86868b]">metros (@ 500Hz)</span>
            </div>

            <div className="text-[11px] text-[#86868b] mt-3 pt-2 border-t border-black/[0.04] font-mono">
              Dc = 0.057 · √(Q · R)
            </div>
          </div>

          <div className="text-[11px] text-[#86868b] mt-3 pt-2 border-t border-black/[0.04] flex items-center justify-between">
            <span>Radio de reverberación:</span>
            <strong className="text-[#34c759] font-mono">
              {field500.criticalDistance.toFixed(2)} m
            </strong>
          </div>
        </div>

        {/* KPI 4: Nivel de Presión Sonora Total Lp */}
        <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#ff9500]" /> Nivel Total (Lp)
              </span>
              <span className="text-[10px] font-mono text-[#86868b] bg-white px-2 py-0.5 rounded-md border border-black/[0.04]">
                r = {field500.distance}m
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#ff9500] font-mono tracking-tight">
                {field500.lpTotalWithAir.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-[#86868b]">dB SPL</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-black/[0.04] text-[11px] font-mono">
              <div className="text-[#86868b]">
                Directo: <strong className="text-[#1d1d1f]">{field500.directIntensityLevel.toFixed(1)} dB</strong>
              </div>
              <div className="text-[#86868b]">
                Reverb: <strong className="text-[#1d1d1f]">{field500.revIntensityLevel.toFixed(1)} dB</strong>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#86868b] mt-3 pt-2 border-t border-black/[0.04] flex items-center justify-between">
            <span>Relación Directo/Rev (DRR):</span>
            <strong className={`font-mono ${field500.drrDb >= 0 ? 'text-[#34c759]' : 'text-[#0071e3]'}`}>
              {field500.drrDb > 0 ? `+${field500.drrDb.toFixed(1)}` : field500.drrDb.toFixed(1)} dB
            </strong>
          </div>
        </div>

      </div>

      {/* --- TABLA COMPLETA POR BANDAS DE OCTAVA --- */}
      <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden shadow-2xs">
        
        <div className="px-5 py-3.5 bg-[#fbfbfd] border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0071e3]" />
            <span>Tabla Comparativa Completa por Bandas de Octava</span>
          </div>
          <span className="text-[11px] text-[#86868b] font-mono">
            Haz clic en una banda para destacarla
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1d1d1f]">
            <thead className="bg-[#f5f5f7] text-[11px] text-[#86868b] uppercase font-mono border-b border-black/[0.06]">
              <tr>
                <th className="px-4 py-3">Frecuencia</th>
                <th className="px-3 py-3 text-right">Abs. A (m² Sab)</th>
                <th className="px-3 py-3 text-right">Coef. ᾱ</th>
                <th className="px-3 py-3 text-right">Const. R (m²)</th>
                <th className="px-3 py-3 text-right text-[#0071e3] font-bold">RT Sabine (s)</th>
                <th className="px-3 py-3 text-right text-[#34c759] font-bold">RT Eyring (s)</th>
                <th className="px-3 py-3 text-right text-[#ff9500] font-bold">RT Millington (s)</th>
                <th className="px-3 py-3 text-right">Refl. n</th>
                <th className="px-3 py-3 text-right text-[#34c759] font-bold">Dc (m)</th>
                <th className="px-3 py-3 text-right">Lp,dir (dB)</th>
                <th className="px-3 py-3 text-right">Lp,rev (dB)</th>
                <th className="px-4 py-3 text-right text-[#ff9500] font-bold">Lp Total (dB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] font-mono">
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
                      isSelected ? 'bg-[#0071e3]/10 font-bold' : 'hover:bg-[#fbfbfd]'
                    }`}
                  >
                    <td className="px-4 py-3 font-sans font-semibold text-[#1d1d1f] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#0071e3]' : 'bg-slate-300'}`}></span>
                      {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{abs.equivalentAbsorption?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-medium">{abs.alphaMean?.toFixed(3)}</td>
                    <td className="px-3 py-3 text-right font-medium">{sf.roomConstant?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#0071e3] font-bold">{rt.sabine?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#34c759] font-bold">{rt.eyring?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#ff9500] font-bold">{rt.millington?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#86868b]">{Math.round(rt.reflectionsSabine || 0)}</td>
                    <td className="px-3 py-3 text-right text-[#34c759] font-bold">{sf.criticalDistance?.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-[#86868b]">{sf.directIntensityLevel?.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right text-[#86868b]">{sf.revIntensityLevel?.toFixed(1)}</td>
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
