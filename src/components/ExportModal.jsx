import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Copy, Check, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { OCTAVE_BANDS } from '../utils/acousticCalculations';
import { getMaterialById } from '../utils/defaultMaterials';

/**
 * Modal de Exportación Avanzada para Excel y Software de Análisis
 * Compatible con Excel en español (separador ';') y estándar internacional (',').
 * Incluye geometría completa del polígono, paredes curvas, materiales y matriz acústica.
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
  roomPolygon,
  materials,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const vertices = roomPolygon?.vertices || [];
  const curvatures = roomPolygon?.curvatures || {};
  const height = roomPolygon?.height || dimensions?.height || 3.0;
  const numWalls = vertices.length || 4;

  // Generador de bloques de datos unificados
  const buildExportData = (sep = ';') => {
    let rows = [];

    // 1. Encabezado institucional y autoría
    rows.push(['POZOLE - Propagación de Ondas en Zonas y Optimización de Límites Espaciales']);
    rows.push(['Software de Simulación Acústica ISO 3382']);
    rows.push(['Equipo / Autores', 'Daniel Angulo, Jeronimo Gomez, Brandon Guerra (Ingeniería de Sonido)']);
    rows.push(['Fecha y Hora', `${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`]);
    rows.push([]);

    // 2. Parámetros Generales del Recinto
    rows.push(['1. DATOS GENERALES DEL RECINTO']);
    rows.push(['Parámetro', 'Valor', 'Unidad']);
    rows.push(['Vértices Polígono', vertices.map(v => `(${v.x}, ${v.y})`).join(' -> '), 'm']);
    rows.push(['Número de Paredes', numWalls, 'paredes']);
    rows.push(['Altura del Recinto (H)', Number(height).toFixed(2), 'm']);
    rows.push(['Área de Planta', (geometry?.floorArea || 0).toFixed(2), 'm²']);
    rows.push(['Volumen Total (V)', (geometry?.volume || 0).toFixed(2), 'm³']);
    rows.push(['Superficie Total (S)', (geometry?.totalSurfaceArea || 0).toFixed(2), 'm²']);
    rows.push(['Recorrido Libre Medio (l)', (geometry?.meanFreePath || 0).toFixed(2), 'm']);
    rows.push([]);

    // 3. Inventario Detallado de Superficies y Materiales
    rows.push(['2. INVENTARIO DE SUPERFICIES Y COEFICIENTES DE ABSORCIÓN']);
    rows.push([
      'Superficie', 'Tipo', 'Longitud (m)', 'Flecha Curvatura (m)', 'Área (m²)', 
      'Material Asignado', 'α 125Hz', 'α 250Hz', 'α 500Hz', 'α 1000Hz', 'α 2000Hz', 'α 4000Hz'
    ]);

    // Piso
    const floorMat = materials?.floor ? getMaterialById(materials.floor.materialId) : null;
    const floorCoeffs = materials?.floor?.coefficients || {};
    rows.push([
      'Piso / Suelo', 'Plano', '-', '-', (geometry?.floorArea || 0).toFixed(2),
      floorMat?.name || 'Manual',
      (floorCoeffs[125] ?? 0.05).toFixed(2), (floorCoeffs[250] ?? 0.05).toFixed(2),
      (floorCoeffs[500] ?? 0.05).toFixed(2), (floorCoeffs[1000] ?? 0.05).toFixed(2),
      (floorCoeffs[2000] ?? 0.05).toFixed(2), (floorCoeffs[4000] ?? 0.05).toFixed(2)
    ]);

    // Techo
    const ceilingMat = materials?.ceiling ? getMaterialById(materials.ceiling.materialId) : null;
    const ceilingCoeffs = materials?.ceiling?.coefficients || {};
    rows.push([
      'Techo', 'Plano', '-', '-', (geometry?.floorArea || 0).toFixed(2),
      ceilingMat?.name || 'Manual',
      (ceilingCoeffs[125] ?? 0.05).toFixed(2), (ceilingCoeffs[250] ?? 0.05).toFixed(2),
      (ceilingCoeffs[500] ?? 0.05).toFixed(2), (ceilingCoeffs[1000] ?? 0.05).toFixed(2),
      (ceilingCoeffs[2000] ?? 0.05).toFixed(2), (ceilingCoeffs[4000] ?? 0.05).toFixed(2)
    ]);

    // Paredes
    for (let i = 0; i < numWalls; i++) {
      const j = (i + 1) % numWalls;
      const wallId = `wall_${i}`;
      const v0 = vertices[i] || { x: 0, y: 0 };
      const v1 = vertices[j] || { x: 0, y: 0 };
      const chordLen = Math.hypot(v1.x - v0.x, v1.y - v0.y);
      const bulge = Number(curvatures[i] || 0);
      const isCurved = Math.abs(bulge) > 0.01;
      const arcLen = isCurved ? chordLen + (8 * bulge * bulge) / (3 * Math.max(0.01, chordLen)) : chordLen;
      const wallArea = geometry?.surfaceAreas?.[wallId] || (arcLen * height);
      const wallMat = materials?.[wallId] ? getMaterialById(materials[wallId].materialId) : null;
      const wallCoeffs = materials?.[wallId]?.coefficients || {};

      rows.push([
        `Pared ${i + 1} (V${i + 1} -> V${j + 1})`,
        isCurved ? 'Curva (Arco)' : 'Recta',
        arcLen.toFixed(2),
        isCurved ? bulge.toFixed(2) : '0.00',
        wallArea.toFixed(2),
        wallMat?.name || 'Manual',
        (wallCoeffs[125] ?? 0.05).toFixed(2), (wallCoeffs[250] ?? 0.05).toFixed(2),
        (wallCoeffs[500] ?? 0.05).toFixed(2), (wallCoeffs[1000] ?? 0.05).toFixed(2),
        (wallCoeffs[2000] ?? 0.05).toFixed(2), (wallCoeffs[4000] ?? 0.05).toFixed(2)
      ]);
    }
    rows.push([]);

    // 4. Parámetros de Fuente Sonora y Receptor
    rows.push(['3. PARÁMETROS DE FUENTE SONORA Y RECEPTOR (ISO 3382)']);
    rows.push(['Elemento', 'Posición X (m)', 'Posición Y (m)', 'Altura Z (m)', 'Parámetros Acústicos']);
    const sPos = sourceReceiver?.sourcePos || { x: 2, y: 2, z: 1.5 };
    const rPos = sourceReceiver?.receiverPos || { x: 5, y: 2, z: 1.2 };
    rows.push([
      'Fuente Sonora (S)', sPos.x.toFixed(2), sPos.y.toFixed(2), (sPos.z ?? 1.5).toFixed(2),
      `Potencia Lw = ${sourceReceiver?.lw || 90} dB | Directividad Q = ${sourceReceiver?.directivity || 1}`
    ]);
    rows.push([
      'Receptor (R)', rPos.x.toFixed(2), rPos.y.toFixed(2), (rPos.z ?? 1.2).toFixed(2),
      `Distancia directa r = ${Number(sourceReceiver?.distance || 3).toFixed(2)} m`
    ]);
    rows.push([]);

    // 5. Matriz Acústica Completa por Banda de Octava
    rows.push(['4. RESULTADOS ACÚSTICOS POR BANDA DE OCTAVA']);
    rows.push([
      'Frecuencia (Hz)', 'Absorción A (m² Sab)', 'Coeficiente Medio (ᾱ)', 'Constante Sala R (m²)',
      'RT60 Sabine (s)', 'RT60 Norris-Eyring (s)', 'RT60 Millington-Sette (s)', 'Reflexiones n',
      'Distancia Crítica Dc (m)', 'Lp Directo (dB)', 'Lp Reverberado (dB)', 'Lp Total (dB)', 'DRR (dB)'
    ]);

    OCTAVE_BANDS.forEach((freq) => {
      const abs = absorptionData?.[freq] || {};
      const rt = reverberationData?.[freq] || {};
      const sf = soundFieldData?.[freq] || {};

      rows.push([
        freq,
        abs.equivalentAbsorption?.toFixed(2) ?? '—',
        abs.alphaMean?.toFixed(3) ?? '—',
        sf.roomConstant?.toFixed(2) ?? '—',
        rt.sabine?.toFixed(2) ?? '—',
        rt.eyring?.toFixed(2) ?? '—',
        rt.millington?.toFixed(2) ?? '—',
        Math.round(rt.reflectionsSabine || 0),
        sf.criticalDistance?.toFixed(2) ?? '—',
        sf.directIntensityLevel?.toFixed(1) ?? '—',
        sf.revIntensityLevel?.toFixed(1) ?? '—',
        sf.lpTotalWithAir?.toFixed(1) ?? '—',
        sf.drrDb?.toFixed(1) ?? '—'
      ]);
    });

    return rows.map(r => r.join(sep)).join('\r\n');
  };

  // Generar CSV compatible con Excel español (Separador ';' y BOM UTF-8)
  const handleDownloadExcelCSV = () => {
    let content = 'sep=;\r\n' + buildExportData(';');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POZOLE_Acustica_${numWalls}paredes_${(geometry?.volume || 0).toFixed(0)}m3.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generar CSV Estándar Internacional (Separador ',')
  const handleDownloadStandardCSV = () => {
    let content = 'sep=,\r\n' + buildExportData(',');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POZOLE_Acustica_Standard_${numWalls}paredes.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copiar al Portapapeles (Formato Tab-Separated TSV para pegar directo en Excel con Ctrl+V)
  const handleCopyClipboard = () => {
    const content = buildExportData('\t');
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
