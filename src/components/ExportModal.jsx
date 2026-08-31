import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Copy, Check, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { OCTAVE_BANDS } from '../utils/acousticCalculations';

/**
 * Modal de Exportación Avanzada para Excel y Software de Análisis
 * Resuelve la separación de columnas en Excel español/internacional.
 */
export default function ExportModal({
  isOpen,
  onClose,
  geometry,
  dimensions,
  sourceReceiver,
  absorptionData,
  reverberationData,
  soundFieldData,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generar CSV compatible con Excel español (Separador ';' y BOM UTF-8)
  const handleDownloadExcelCSV = () => {
    // Encabezado sep=; fuerza a Excel a reconocer el separador de columnas inmediatamente
    let content = 'sep=;\r\n';
    content += 'REPORTE DE CÁLCULO POZOLE - Propagación de Ondas en Zonas y Optimización de Límites Espaciales;;;;;;;;;;;;\r\n';
    content += `Fecha;${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')};Integrantes;Daniel Angulo, Jeronimo Gomez, Brandon Guerra;;;;;;;;;\r\n`;
    content += `Largo (m);${dimensions.length};Ancho (m);${dimensions.width};Alto (m);${dimensions.height};Volumen (m³);${geometry.volume.toFixed(2)};Superficie (m²);${geometry.totalSurfaceArea.toFixed(2)};Recorrido Libre (m);${geometry.meanFreePath.toFixed(2)}\r\n`;
    content += `Fuente Lw (dB);${sourceReceiver.lw};Directividad Q;${sourceReceiver.directivity};Distancia r (m);${sourceReceiver.distance};;;;;;;\r\n\r\n`;

    // Encabezados de tabla
    content += 'Frecuencia (Hz);Absorción A (m² Sabine);Coeficiente Medio (ᾱ);Constante de Sala R (m²);RT Sabine (s);RT Norris-Eyring (s);RT Millington-Sette (s);Reflexiones n;Distancia Crítica Dc (m);Lp Directo (dB);Lp Reverberado (dB);Lp Total (dB);DRR (dB)\r\n';

    OCTAVE_BANDS.forEach((freq) => {
      const abs = absorptionData[freq] || {};
      const rt = reverberationData[freq] || {};
      const sf = soundFieldData[freq] || {};

      content += `${freq};${abs.equivalentAbsorption?.toFixed(2)};${abs.alphaMean?.toFixed(3)};${sf.roomConstant?.toFixed(2)};${rt.sabine?.toFixed(2)};${rt.eyring?.toFixed(2)};${rt.millington?.toFixed(2)};${Math.round(rt.reflectionsSabine || 0)};${sf.criticalDistance?.toFixed(2)};${sf.directIntensityLevel?.toFixed(1)};${sf.revIntensityLevel?.toFixed(1)};${sf.lpTotalWithAir?.toFixed(1)};${sf.drrDb?.toFixed(1)}\r\n`;
    });

    // UTF-8 BOM (\uFEFF) para que Excel reconozca tildes y caracteres especiales
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Acustica_Excel_${dimensions.length}x${dimensions.width}x${dimensions.height}m.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generar CSV Estándar Internacional (Separador ',')
  const handleDownloadStandardCSV = () => {
    let content = 'sep=,\r\n';
    content += 'Frecuencia (Hz),Absorcion A (m2 Sab),Coeficiente Medio (alpha),Constante Sala R (m2),RT Sabine (s),RT Norris-Eyring (s),RT Millington-Sette (s),Reflexiones n,Distancia Critica Dc (m),Lp Directo (dB),Lp Reverberado (dB),Lp Total (dB),DRR (dB)\r\n';

    OCTAVE_BANDS.forEach((freq) => {
      const abs = absorptionData[freq] || {};
      const rt = reverberationData[freq] || {};
      const sf = soundFieldData[freq] || {};

      content += `${freq},${abs.equivalentAbsorption?.toFixed(2)},${abs.alphaMean?.toFixed(3)},${sf.roomConstant?.toFixed(2)},${rt.sabine?.toFixed(2)},${rt.eyring?.toFixed(2)},${rt.millington?.toFixed(2)},${Math.round(rt.reflectionsSabine || 0)},${sf.criticalDistance?.toFixed(2)},${sf.directIntensityLevel?.toFixed(1)},${sf.revIntensityLevel?.toFixed(1)},${sf.lpTotalWithAir?.toFixed(1)},${sf.drrDb?.toFixed(1)}\r\n`;
    });

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Acustica_Standard_${dimensions.length}x${dimensions.width}x${dimensions.height}m.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copiar al Portapapeles (Formato Tab-Separated TSV para pegar directo en Excel con Ctrl+V)
  const handleCopyClipboard = () => {
    let content = 'Frecuencia (Hz)\tAbsorción A (m² Sab)\tCoeficiente ᾱ\tConstante R (m²)\tRT Sabine (s)\tRT Eyring (s)\tRT Millington (s)\tReflexiones n\tDistancia Crítica Dc (m)\tLp Directo (dB)\tLp Reverberado (dB)\tLp Total (dB)\tDRR (dB)\n';

    OCTAVE_BANDS.forEach((freq) => {
      const abs = absorptionData[freq] || {};
      const rt = reverberationData[freq] || {};
      const sf = soundFieldData[freq] || {};

      content += `${freq}\t${abs.equivalentAbsorption?.toFixed(2)}\t${abs.alphaMean?.toFixed(3)}\t${sf.roomConstant?.toFixed(2)}\t${rt.sabine?.toFixed(2)}\t${rt.eyring?.toFixed(2)}\t${rt.millington?.toFixed(2)}\t${Math.round(rt.reflectionsSabine || 0)}\t${sf.criticalDistance?.toFixed(2)}\t${sf.directIntensityLevel?.toFixed(1)}\t${sf.revIntensityLevel?.toFixed(1)}\t${sf.lpTotalWithAir?.toFixed(1)}\t${sf.drrDb?.toFixed(1)}\n`;
    });

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      
      <div className="bg-white border border-black/[0.08] rounded-3xl shadow-apple-lg w-full max-w-lg overflow-hidden animate-fadeIn">
        
        {/* Encabezado */}
        <div className="bg-white border-b border-black/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 text-[#34c759] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1d1d1f]">
                Exportar Datos Acústicos
              </h3>
              <p className="text-[11px] text-[#86868b]">
                Compatibilidad completa con Microsoft Excel y hojas de cálculo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-slate-500 hover:text-black transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Opciones de Exportación */}
        <div className="p-6 space-y-4">
          
          {/* Opción 1: CSV para Excel (Recomendada) */}
          <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/[0.06] hover:border-[#34c759] transition">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#1d1d1f]">
                    CSV Optimizado para Excel
                  </h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#34c759]/10 text-[#34c759]">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-[#86868b] mt-1">
                  Usa separador <code className="text-[#1d1d1f] font-mono font-bold">;</code> y codificación UTF-8 BOM. Se abre en columnas separadas (A, B, C...) automáticamente en Excel.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadExcelCSV}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#34c759] hover:bg-[#2db24f] text-white text-xs font-semibold shadow-apple-sm transition active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Descargar CSV para Excel (.csv)</span>
            </button>
          </div>

          {/* Opción 2: Copiar Tabla Directa */}
          <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/[0.06] hover:border-[#0071e3] transition">
            <div>
              <h4 className="text-sm font-bold text-[#1d1d1f]">
                Copiar Tabla al Portapapeles (TSV)
              </h4>
              <p className="text-xs text-[#86868b] mt-1">
                Copia la tabla formateada para pegar directamente con <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-[10px] font-mono">Ctrl + V</kbd> en cualquier celda de Excel o Google Sheets.
              </p>
            </div>

            <button
              onClick={handleCopyClipboard}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-semibold border border-black/[0.1] shadow-2xs transition active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#34c759]" />
                  <span className="text-[#34c759]">¡Copiado! Pega en Excel con Ctrl+V</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copiar Datos para Excel / Sheets</span>
                </>
              )}
            </button>
          </div>

          {/* Opción 3: CSV Estándar Internacional */}
          <div className="p-3.5 rounded-xl bg-[#f5f5f7] border border-black/[0.04] flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#1d1d1f]">CSV Estándar Internacional (Coma)</div>
              <div className="text-[10px] text-[#86868b]">Para MATLAB, Python, R o SPSS</div>
            </div>
            <button
              onClick={handleDownloadStandardCSV}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#1d1d1f] text-xs font-semibold border border-black/[0.08] shadow-2xs transition"
            >
              Descargar
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
