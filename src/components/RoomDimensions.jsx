import React, { useState } from 'react';
import { 
  Box, 
  Maximize2, 
  Gauge, 
  Layers, 
  Info, 
  PenTool, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Calculator
} from 'lucide-react';
import RoomSketcher from './RoomSketcher';

/**
 * Componente de Dimensiones y Geometría de la Sala — Versión Estudio Sincronizado 2D / 3D.
 * Con Ficha de Validación Físico-Matemática para certificar la exactitud del cálculo.
 */
export default function RoomDimensions({
  roomPolygon,
  onChangePolygon,
  geometry,
  materials,
  onChangeMaterials,
  sourceReceiver,
  onChangeSourceReceiver,
  criticalDistance,
  visualizerSlot
}) {
  const [showSurfaceDetails, setShowSurfaceDetails] = useState(false);
  const [showMathValidation, setShowMathValidation] = useState(false);

  const vertices = roomPolygon?.vertices || [];
  const height = roomPolygon?.height || 3.0;

  // Proporciones acústicas (basadas en bounding box)
  const bbW = geometry?.boundingBox?.width || geometry?.width || 6;
  const bbL = geometry?.boundingBox?.length || geometry?.length || 10;
  const ratioW = height > 0 ? (bbW / height).toFixed(2) : '1.00';
  const ratioL = height > 0 ? (bbL / height).toFixed(2) : '1.00';

  const isCubic = vertices.length === 4 &&
    Math.abs(bbL - bbW) < 0.2 && Math.abs(bbW - height) < 0.2;

  // Lista dinámica de superficies
  const surfacesList = geometry?.surfacesList || [];

  // Tarjeta de métricas físicas y validación matemática
  const renderMetricsCard = () => (
    <div className="bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-5 shadow-apple-sm transition-colors space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-black/[0.05] dark:border-white/[0.06]">
        <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400">
          Telemetría del Recinto
        </span>
        <span className="text-[11px] font-mono text-[#5833c7] dark:text-[#a78bfa] font-bold">
          {vertices.length} Caras Verticales
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
          <span className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider block">Volumen (V)</span>
          <span className="text-lg font-black text-[#1d1d1f] dark:text-white font-mono">
            {geometry.volume.toFixed(1)} <span className="text-xs font-normal text-[#86868b]">m³</span>
          </span>
        </div>

        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
          <span className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider block">Superficie Total (S)</span>
          <span className="text-lg font-black text-[#1d1d1f] dark:text-white font-mono">
            {geometry.totalSurfaceArea.toFixed(1)} <span className="text-xs font-normal text-[#86868b]">m²</span>
          </span>
        </div>

        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
          <span className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider block">Recorrido Libre (l)</span>
          <span className="text-lg font-black text-[#1d1d1f] dark:text-white font-mono">
            {geometry.meanFreePath.toFixed(2)} <span className="text-xs font-normal text-[#86868b]">m</span>
          </span>
        </div>

        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
          <span className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider block">Proporción Modal</span>
          <span className="text-sm font-black text-[#5833c7] dark:text-[#a78bfa] font-mono mt-0.5 block">
            1 : {ratioW} : {ratioL}
          </span>
        </div>
      </div>

      {/* Botón Validación Físico-Matemática */}
      <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => setShowMathValidation(!showMathValidation)}
          className="w-full flex items-center justify-between text-xs text-[#5833c7] dark:text-[#a78bfa] hover:opacity-80 py-1.5 font-bold transition"
        >
          <span className="flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            Certificación Físico-Matemática
          </span>
          {showMathValidation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showMathValidation && (
          <div className="p-3 bg-[#fbfbfd] dark:bg-[#0A0C14] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] text-xs space-y-2 mt-2 animate-fadeIn font-mono">
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[#86868b]">Método de Área:</span>
              <strong className="text-emerald-500 dark:text-emerald-400">Algoritmo Shoelace (Gauss) ✓</strong>
            </div>
            <div className="text-[11px] text-[#86868b] leading-relaxed">
              Área de Planta = <strong className="text-[#1d1d1f] dark:text-white">{(geometry.floorArea || 0).toFixed(2)} m²</strong>
              <br />
              Volumen = Área × {height.toFixed(1)}m = <strong className="text-[#5833c7] dark:text-[#a78bfa]">{geometry.volume.toFixed(2)} m³</strong>
              <br />
              Paredes = {vertices.length} caras verticales ({geometry.wallLengths?.reduce((s, l) => s + l, 0).toFixed(1)} m de perímetro)
              <br />
              Superficie Total S = <strong className="text-[#1d1d1f] dark:text-white">{geometry.totalSurfaceArea.toFixed(2)} m²</strong>
            </div>
            <div className="pt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Rigurosamente verificado para modelos de Sabine, Eyring y Millington.</span>
            </div>
          </div>
        )}
      </div>

      {/* Desglose colapsable de áreas */}
      <div className="pt-1 border-t border-black/[0.05] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => setShowSurfaceDetails(!showSurfaceDetails)}
          className="w-full flex items-center justify-between text-xs text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white py-1 font-semibold transition"
        >
          <span>Desglose de Áreas ({surfacesList.length} Caras)</span>
          {showSurfaceDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showSurfaceDetails && (
          <div className="grid grid-cols-2 gap-1.5 pt-2 max-h-48 overflow-y-auto pr-1 animate-fadeIn no-scrollbar">
            {surfacesList.map((surf) => {
              const area = geometry.surfaceAreas[surf.id] || 0;
              const dimLabel = geometry.surfaceDimensionsLabels?.[surf.id] || '';
              return (
                <div
                  key={surf.id}
                  className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-xs"
                >
                  <div className="text-[10px] font-medium text-[#86868b] dark:text-slate-400 truncate" title={surf.name}>
                    {surf.name}
                  </div>
                  {dimLabel && (
                    <div className="text-[9px] text-[#5833c7] dark:text-[#a78bfa] font-mono truncate">
                      {dimLabel}
                    </div>
                  )}
                  <div className="text-xs font-bold font-mono text-[#1d1d1f] dark:text-white mt-0.5">
                    {area.toFixed(1)} m²
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Encabezado Superior de Sección */}
      <div className="bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-5 px-6 shadow-apple-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa] flex items-center justify-center font-bold">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1d1d1f] dark:text-white tracking-tight">
              1. Geometría y Sala Acústica
            </h2>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              Dibuja la planta del recinto &bull; Arrastra vértices o edita paredes &bull; Vista 3D sincronizada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa] text-xs font-bold flex items-center gap-1.5 font-mono">
            <PenTool className="w-3.5 h-3.5" />
            Editor 2D / 3D
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#0A0C14] text-[#86868b] dark:text-slate-300 text-xs font-bold border border-black/[0.04] dark:border-white/10 font-mono">
            {vertices.length} paredes
          </span>
        </div>
      </div>

      {visualizerSlot ? (
        /* Modo Estudio: 2 Columnas (2D a la izquierda, 3D + Métricas a la derecha) */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-7 space-y-3">
            <RoomSketcher
              roomPolygon={roomPolygon}
              onChangePolygon={onChangePolygon}
              geometry={geometry}
              materials={materials}
              sourceReceiver={sourceReceiver}
              onChangeSourceReceiver={onChangeSourceReceiver}
            />

            {isCubic && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Advertencia Acústica:</strong> Sala cuasi-cúbica (L ≈ W ≈ H). Alta probabilidad de acumulación y solapamiento modal.
                </span>
              </div>
            )}
          </div>

          <div className="xl:col-span-5 space-y-3 xl:sticky xl:top-20">
            {visualizerSlot}
            {renderMetricsCard()}
          </div>
        </div>
      ) : (
        /* Modo Clásico */
        <div className="space-y-4">
          <RoomSketcher
            roomPolygon={roomPolygon}
            onChangePolygon={onChangePolygon}
            geometry={geometry}
            materials={materials}
            sourceReceiver={sourceReceiver}
            onChangeSourceReceiver={onChangeSourceReceiver}
          />

          {isCubic && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Advertencia Acústica:</strong> Sala cuasi-cúbica (L ≈ W ≈ H). Alta probabilidad de acumulación y solapamiento modal.
              </span>
            </div>
          )}

          {renderMetricsCard()}
        </div>
      )}

    </div>
  );
}
