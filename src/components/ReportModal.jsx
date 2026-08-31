import React from 'react';
import { X, Printer, FileText, CheckCircle, Waves, Building } from 'lucide-react';
import { OCTAVE_BANDS, ROOM_SURFACES } from '../utils/acousticCalculations';
import { getMaterialById } from '../utils/defaultMaterials';

/**
 * Modal de Informe Técnico de Ingeniería Acústica
 * Estilo Minimalista Apple / Tesla + Optimizado para Impresión
 */
export default function ReportModal({
  isOpen,
  onClose,
  geometry,
  materials,
  sourceReceiver,
  absorptionData,
  reverberationData,
  soundFieldData,
  optimumRT,
  roomType,
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const rt500 = reverberationData[500] || { sabine: 0, eyring: 0, millington: 0 };
  const avgRT500 = (rt500.sabine + rt500.eyring) / 2;
  const isRTInOpt = avgRT500 >= optimumRT.min && avgRT500 <= optimumRT.max;
  const field1k = soundFieldData[1000] || {};

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Contenedor del Modal */}
      <div className="bg-white border border-black/[0.08] rounded-3xl shadow-apple-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Barra Superior Flotante (Oculta en Impresión) */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-black/[0.06] px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">
              Informe Técnico de Simulación Acústica
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-apple-sm transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-slate-500 hover:text-black transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido del Documento */}
        <div className="p-6 sm:p-10 space-y-6 print:p-8 print:space-y-6 text-[#1d1d1f] font-sans">
          
          {/* Encabezado Institucional */}
          <div className="border-b-2 border-[#0071e3] pb-4 flex justify-between items-start">
            <div>
              <div className="text-[11px] uppercase font-extrabold tracking-widest text-[#0071e3]">
                POZOLE • Propagación de Ondas en Zonas y Optimización de Límites Espaciales
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1d1d1f] mt-1">
                REPORTE DE CAMPO SONORO Y REVERBERACIÓN
              </h1>
              <p className="text-xs text-[#86868b] mt-1">
                Modelos de Sabine • Norris-Eyring • Millington-Sette • Campo Directo y Reverberado
              </p>
            </div>
            <div className="text-right text-xs font-mono text-[#86868b] hidden sm:block">
              <div>Fecha: {new Date().toLocaleDateString('es-ES')}</div>
              <div className="font-bold text-[#1d1d1f] mt-1">Integrantes:</div>
              <div>Daniel Angulo</div>
              <div>Jeronimo Gomez</div>
              <div>Brandon Guerra</div>
            </div>
          </div>

          {/* 1. Geometría */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0071e3] mb-2 border-b border-black/[0.06] pb-1">
              1. Características Geométricas de la Sala
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                <span className="text-[#86868b] block mb-0.5">Dimensiones (L × W × H):</span>
                <strong className="font-mono text-[#1d1d1f] font-bold">
                  {geometry.length}m × {geometry.width}m × {geometry.height}m
                </strong>
              </div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                <span className="text-[#86868b] block mb-0.5">Volumen (V):</span>
                <strong className="font-mono text-[#0071e3] font-bold">
                  {geometry.volume.toFixed(2)} m³
                </strong>
              </div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                <span className="text-[#86868b] block mb-0.5">Superficie Total (S):</span>
                <strong className="font-mono text-[#1d1d1f] font-bold">
                  {geometry.totalSurfaceArea.toFixed(2)} m²
                </strong>
              </div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                <span className="text-[#86868b] block mb-0.5">Recorrido Libre (l):</span>
                <strong className="font-mono text-[#1d1d1f] font-bold">
                  {geometry.meanFreePath.toFixed(2)} m
                </strong>
              </div>
            </div>
          </div>

          {/* 2. Materiales */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0071e3] mb-2 border-b border-black/[0.06] pb-1">
              2. Materiales y Coeficientes de Absorción Asignados
            </h2>
            <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f5f7] text-[10px] uppercase font-mono text-[#86868b]">
                  <tr>
                    <th className="p-2.5">Superficie</th>
                    <th className="p-2.5 text-right">Área (m²)</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 text-right">125 Hz</th>
                    <th className="p-2.5 text-right">250 Hz</th>
                    <th className="p-2.5 text-right">500 Hz</th>
                    <th className="p-2.5 text-right">1 kHz</th>
                    <th className="p-2.5 text-right">2 kHz</th>
                    <th className="p-2.5 text-right">4 kHz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] font-mono text-[11px]">
                  {ROOM_SURFACES.map((surf) => {
                    const area = geometry.surfaceAreas[surf.id] || 0;
                    const matConfig = materials[surf.id] || {};
                    const matMeta = getMaterialById(matConfig.materialId);
                    const coeffs = matConfig.coefficients || {};

                    return (
                      <tr key={surf.id}>
                        <td className="p-2.5 font-sans font-semibold text-[#1d1d1f]">
                          {surf.name}
                        </td>
                        <td className="p-2.5 text-right text-[#86868b]">
                          {area.toFixed(2)}
                        </td>
                        <td className="p-2.5 font-sans text-[#1d1d1f] truncate max-w-[140px]">
                          {matMeta.name}
                        </td>
                        {OCTAVE_BANDS.map((f) => (
                          <td key={f} className="p-2.5 text-right text-[#1d1d1f]">
                            {(coeffs[f] || 0.05).toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Tabla Completa de Parámetros Acústicos */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0071e3] mb-2 border-b border-black/[0.06] pb-1">
              3. Resultados Acústicos y Comparativa por Frecuencia
            </h2>
            <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#f5f5f7] text-[10px] uppercase text-[#86868b]">
                  <tr>
                    <th className="p-2.5 font-sans">Banda (Hz)</th>
                    <th className="p-2.5 text-right">Abs. A (m² Sab)</th>
                    <th className="p-2.5 text-right">Coef. ᾱ</th>
                    <th className="p-2.5 text-right">Const. R (m²)</th>
                    <th className="p-2.5 text-right font-bold text-[#0071e3]">RT Sabine (s)</th>
                    <th className="p-2.5 text-right font-bold text-[#34c759]">RT Eyring (s)</th>
                    <th className="p-2.5 text-right font-bold text-[#ff9500]">RT Millington (s)</th>
                    <th className="p-2.5 text-right">Dc (m)</th>
                    <th className="p-2.5 text-right font-bold text-[#ff9500]">Lp Total (dB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] text-[11px]">
                  {OCTAVE_BANDS.map((freq) => {
                    const abs = absorptionData[freq] || {};
                    const rt = reverberationData[freq] || {};
                    const sf = soundFieldData[freq] || {};

                    return (
                      <tr key={freq}>
                        <td className="p-2.5 font-bold font-sans text-[#1d1d1f]">
                          {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                        </td>
                        <td className="p-2.5 text-right">{abs.equivalentAbsorption?.toFixed(2)}</td>
                        <td className="p-2.5 text-right">{abs.alphaMean?.toFixed(3)}</td>
                        <td className="p-2.5 text-right">{sf.roomConstant?.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-[#0071e3]">{rt.sabine?.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-[#34c759]">{rt.eyring?.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-[#ff9500]">{rt.millington?.toFixed(2)}</td>
                        <td className="p-2.5 text-right">{sf.criticalDistance?.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-[#ff9500]">{sf.lpTotalWithAir?.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Diagnóstico y Veredicto */}
          <div className="bg-[#f5f5f7] p-5 rounded-2xl border border-black/[0.06] text-xs">
            <h3 className="font-bold text-[#1d1d1f] uppercase tracking-wider mb-2">
              4. Diagnóstico y Veredicto Acústico
            </h3>
            <div className="space-y-2 text-[#1d1d1f]">
              <p>
                • <strong>Condiciones de Emisión:</strong> Fuente sonora con Lw = {sourceReceiver.lw} dB (Directividad Q = {sourceReceiver.directivity}) a distancia r = {sourceReceiver.distance} m.
              </p>
              <p>
                • <strong>Distancia Crítica (@ 1 kHz):</strong> Dc = {field1k.criticalDistance?.toFixed(2)} m. El receptor está a r = {sourceReceiver.distance} m, ubicándose en zona de <strong>{sourceReceiver.distance < field1k.criticalDistance ? 'Campo Directo' : 'Campo Reverberado'}</strong>.
              </p>
              <p>
                • <strong>Tiempo de Reverberación Promedio (500-1000 Hz):</strong> ≈ {avgRT500.toFixed(2)} s. 
                Objetivo para uso tipo "{roomType}": <strong>{optimumRT.min}s a {optimumRT.max}s</strong> (Óptimo teórico: {optimumRT.optimal}s).
              </p>
              <p className="mt-2 font-semibold text-[#0071e3]">
                {isRTInOpt
                  ? '✅ El recinto cumple satisfactoriamente los criterios de inteligibilidad y confort acústico según ISO 3382 / DIN 18041.'
                  : avgRT500 > optimumRT.max
                  ? '⚠️ Tiempo de reverberación elevado. Se recomienda añadir material fonoabsorbente (ej. paneles de lana de roca o plafón acústico).'
                  : 'ℹ️ Recinto excesivamente seco para actividades musicales. Recomendado aumentar reflectividad.'}
              </p>
            </div>
          </div>

          {/* Firmas de Revisión */}
          <div className="pt-8 border-t border-black/[0.08] grid grid-cols-2 gap-8 text-center text-xs text-[#86868b]">
            <div>
              <div className="border-b border-black/[0.2] w-48 mx-auto mb-1"></div>
              <span>Ingeniero / Alumno Responsable</span>
            </div>
            <div>
              <div className="border-b border-black/[0.2] w-48 mx-auto mb-1"></div>
              <span>Docente / Revisor Técnico</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
