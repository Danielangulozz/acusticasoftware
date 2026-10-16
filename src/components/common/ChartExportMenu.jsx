import React, { useState } from 'react';
import { Download, Image, FileSpreadsheet, ChevronDown, Check, Sparkles } from 'lucide-react';
import { downloadElementAsPng, downloadTableAsExcel, downloadTableAsCsv } from '../../utils/exportUtils';

/**
 * ==============================================================================
 * COMPONENTE: ChartExportMenu
 * ==============================================================================
 * Botón / Menú desplegable universal para exportar cualquier gráfico o tabla:
 * 1. Descargar Imagen PNG (Retina 2x para informes técnicos)
 * 2. Descargar Datos en Excel (.xls con formato)
 * 3. Descargar Datos en CSV (.csv con UTF-8 BOM)
 */
export default function ChartExportMenu({
  targetRef,
  targetId,
  title = 'Exportar',
  filename = 'grafica_pozole',
  headers = [],
  rows = [],
  onExportExcel,
  showLabels = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleDownloadPng = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    setIsOpen(false);
    const target = targetRef?.current || targetId;
    const ok = await downloadElementAsPng(target, `${filename}.png`);
    setDownloading(false);
    if (ok) {
      setSuccessMsg('PNG');
      setTimeout(() => setSuccessMsg(null), 2500);
    }
  };

  const handleDownloadExcel = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onExportExcel) {
      onExportExcel('excel');
    } else if (headers.length > 0 && rows.length > 0) {
      downloadTableAsExcel(headers, rows, `${filename}.xls`, title);
    }
    setSuccessMsg('Excel');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleDownloadCsv = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onExportExcel) {
      onExportExcel('csv');
    } else if (headers.length > 0 && rows.length > 0) {
      downloadTableAsCsv(headers, rows, `${filename}.csv`);
    }
    setSuccessMsg('CSV');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const hasData = Boolean(onExportExcel || (headers.length > 0 && rows.length > 0));

  return (
    <div className={`relative inline-flex items-center no-export ${className}`}>
      {/* Botón Principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/10 hover:bg-[#5833c7]/10 dark:hover:bg-[#5833c7]/20 text-[#86868b] hover:text-[#5833c7] dark:text-slate-300 dark:hover:text-purple-300 border border-black/[0.06] dark:border-white/10 text-xs font-semibold transition active:scale-95 shadow-2xs"
        title="Descargar gráfica como imagen PNG o datos en Excel"
      >
        {successMsg ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500 animate-scaleIn" />
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              ¡{successMsg} descargado!
            </span>
          </>
        ) : (
          <>
            <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
            {showLabels && <span>Exportar</span>}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </>
        )}
      </button>

      {/* Menú Flotante */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#18192a] rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-apple-lg p-1.5 z-50 text-xs animate-scaleIn">
            <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#86868b] tracking-wider border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
              Opciones de Descarga
            </div>

            {/* Descargar PNG */}
            <button
              type="button"
              onClick={handleDownloadPng}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#5833c7]/10 dark:hover:bg-[#5833c7]/20 text-[#1d1d1f] dark:text-white font-medium text-left transition"
            >
              <Image className="w-3.5 h-3.5 text-[#5833c7] dark:text-purple-300" />
              <span>Descargar Gráfica (PNG)</span>
            </button>

            {/* Descargar Excel */}
            {hasData && (
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/10 text-[#1d1d1f] dark:text-white font-medium text-left transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Descargar Datos (Excel)</span>
              </button>
            )}

            {/* Descargar CSV */}
            {hasData && (
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-blue-500/10 text-[#1d1d1f] dark:text-white font-medium text-left transition"
              >
                <Download className="w-3.5 h-3.5 text-[#0071e3] dark:text-sky-400" />
                <span>Descargar Datos (CSV)</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
