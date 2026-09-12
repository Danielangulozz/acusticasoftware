import React, { useMemo } from 'react';
import { 
  Volume2, 
  Compass, 
  Ruler, 
  Wind, 
  Activity, 
  Radio, 
  Sparkles,
  Info,
  ShieldCheck,
  AlertTriangle,
  Move,
  Building,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { 
  DIRECTIVITY_PRESETS, 
  SPEED_OF_SOUND, 
  powerWattsToLw, 
  lwToPowerWatts,
  polygonCentroid
} from '../utils/acousticCalculations';

import RoomVisualizer from './RoomVisualizer';

/**
 * Distancia de un punto P a un segmento AB en 2D
 */
function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Distancia mínima de un punto (x, y) a las paredes de un polígono
 */
function minDistanceToWalls(px, py, vertices) {
  if (!vertices || vertices.length < 3) return 2.0;
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const d = distPointToSegment(px, py, vertices[i].x, vertices[i].y, vertices[j].x, vertices[j].y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Componente de Parámetros de Fuente Sonora, Directividad y Receptor
 * Con soporte completo de normas ISO 3382 / ISO 3741, Dark Mode y sincronización geométrica 2D/3D.
 */
export default function SourceReceiver({
  sourceReceiver,
  onChange,
  includeAirAbsorption,
  setIncludeAirAbsorption,
  criticalDistance,
  maxRoomDimension,
  dimensions,
  roomPolygon,
  geometry,
  materials,
  selectedBand = 1000,
}) {
  // Dimensiones del recinto y polígono
  const vertices = useMemo(() => {
    if (roomPolygon?.vertices && roomPolygon.vertices.length >= 3) {
      return roomPolygon.vertices;
    }
    const L = dimensions?.length || 10;
    const W = dimensions?.width || 6;
    return [
      { x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: W }, { x: 0, y: W }
    ];
  }, [roomPolygon, dimensions]);

  const H = roomPolygon?.height || dimensions?.height || 3.0;
  const centroid = useMemo(() => polygonCentroid(vertices), [vertices]);
  const xs = useMemo(() => vertices.map(v => v.x), [vertices]);
  const ys = useMemo(() => vertices.map(v => v.y), [vertices]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const roomL = maxX - minX;
  const roomW = maxY - minY;

  // Coordenadas actuales de Fuente y Receptor con fallback seguro
  const sourcePos = useMemo(() => {
    if (sourceReceiver?.sourcePos) return sourceReceiver.sourcePos;
    return {
      x: Number((minX + Math.min(2.0, roomL * 0.25)).toFixed(2)),
      y: Number((centroid.y).toFixed(2)),
      z: 1.5
    };
  }, [sourceReceiver?.sourcePos, minX, roomL, centroid]);

  const receiverPos = useMemo(() => {
    if (sourceReceiver?.receiverPos) return sourceReceiver.receiverPos;
    const initialDist = Math.min(3.0, Math.max(1.0, (sourceReceiver?.distance || 3.0)));
    return {
      x: Number((sourcePos.x + initialDist).toFixed(2)),
      y: Number((sourcePos.y).toFixed(2)),
      z: 1.2
    };
  }, [sourceReceiver?.receiverPos, sourcePos, sourceReceiver?.distance]);

  // Distancia euclidiana 3D real
  const currentR3D = useMemo(() => {
    const dx = receiverPos.x - sourcePos.x;
    const dy = receiverPos.y - sourcePos.y;
    const dz = receiverPos.z - sourcePos.z;
    return Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }, [sourcePos, receiverPos]);

  const r = Number(sourceReceiver.distance || currentR3D.toFixed(2));
  const Dc = criticalDistance || 2.0;
  const isDirectDominant = r < Dc;

  // Verificaciones de Cumplimiento ISO 3382
  const sourceWallDist = useMemo(() => minDistanceToWalls(sourcePos.x, sourcePos.y, vertices), [sourcePos, vertices]);
  const receiverWallDist = useMemo(() => minDistanceToWalls(receiverPos.x, receiverPos.y, vertices), [receiverPos, vertices]);
  
  const isDistanceIsoCompliant = r >= 2.0;
  const isSourceWallCompliant = sourceWallDist >= 1.0;
  const isReceiverWallCompliant = receiverWallDist >= 1.0;
  const isSourceHeightCompliant = Math.abs(sourcePos.z - 1.5) < 0.1 || (sourceReceiver.directivity > 1 && sourcePos.z <= 0.5);
  const isReceiverHeightCompliant = Math.abs(receiverPos.z - 1.2) < 0.1 || Math.abs(receiverPos.z - 1.5) < 0.1;

  const isFullIsoCompliant = isDistanceIsoCompliant && isSourceWallCompliant && isReceiverWallCompliant;

  // Handlers
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

  const handleDistanceSliderChange = (val) => {
    const newDist = parseFloat(val);
    if (isNaN(newDist) || newDist <= 0) return;
    
    // Desplazar el receptor a lo largo del vector desde la fuente para mantener la dirección
    const dx = receiverPos.x - sourcePos.x;
    const dy = receiverPos.y - sourcePos.y;
    const len2D = Math.sqrt(dx * dx + dy * dy) || 1;
    const dz = receiverPos.z - sourcePos.z;
    const target2DDist = Math.max(0.1, Math.sqrt(Math.max(0.01, newDist * newDist - dz * dz)));

    const newRx = Number((sourcePos.x + (dx / len2D) * target2DDist).toFixed(2));
    const newRy = Number((sourcePos.y + (dy / len2D) * target2DDist).toFixed(2));

    onChange({
      ...sourceReceiver,
      distance: Number(newDist.toFixed(2)),
      receiverPos: { ...receiverPos, x: newRx, y: newRy },
    });
  };

  const handleDirectivityChange = (qVal) => {
    onChange({
      ...sourceReceiver,
      directivity: Number(qVal),
    });
  };

  const handleUpdateSourceCoords = (key, val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newSource = { ...sourcePos, [key]: Number(num.toFixed(2)) };
    const dx = receiverPos.x - newSource.x;
    const dy = receiverPos.y - newSource.y;
    const dz = receiverPos.z - newSource.z;
    const newDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    onChange({
      ...sourceReceiver,
      sourcePos: newSource,
      distance: Number(newDist.toFixed(2)),
    });
  };

  const handleUpdateReceiverCoords = (key, val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newRec = { ...receiverPos, [key]: Number(num.toFixed(2)) };
    const dx = newRec.x - sourcePos.x;
    const dy = newRec.y - sourcePos.y;
    const dz = newRec.z - sourcePos.z;
    const newDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    onChange({
      ...sourceReceiver,
      receiverPos: newRec,
      distance: Number(newDist.toFixed(2)),
    });
  };

  // Cargar Presets de Ubicación ISO
  const applyIsoPreset = (type) => {
    if (type === 'iso3382') {
      // ISO 3382 Auditorio / Conferencia: Fuente a 1.5m de pared, micro a 1.2m, r >= 2.5m
      const sX = Number((minX + Math.max(1.5, roomL * 0.2)).toFixed(2));
      const sY = Number(centroid.y.toFixed(2));
      const sZ = 1.5;

      const rX = Number((maxX - Math.max(1.5, roomL * 0.25)).toFixed(2));
      const rY = Number(centroid.y.toFixed(2));
      const rZ = 1.2;

      const dist = Math.sqrt((rX - sX) ** 2 + (rY - sY) ** 2 + (rZ - sZ) ** 2);
      onChange({
        ...sourceReceiver,
        directivity: 1,
        sourcePos: { x: sX, y: sY, z: sZ },
        receiverPos: { x: rX, y: rY, z: rZ },
        distance: Number(dist.toFixed(2)),
        isoPreset: 'iso3382',
      });
    } else if (type === 'control_room') {
      // ISO Control Room / Estudio: Sweet Spot en distancia crítica
      const sX = Number((minX + Math.max(1.2, roomL * 0.2)).toFixed(2));
      const sY = Number(centroid.y.toFixed(2));
      const sZ = 1.4;

      const targetDist = Math.max(1.5, Math.min(roomL * 0.6, Dc));
      const rX = Number((sX + targetDist).toFixed(2));
      const rY = Number(centroid.y.toFixed(2));
      const rZ = 1.2;

      onChange({
        ...sourceReceiver,
        directivity: 2,
        sourcePos: { x: sX, y: sY, z: sZ },
        receiverPos: { x: rX, y: rY, z: rZ },
        distance: Number(targetDist.toFixed(2)),
        isoPreset: 'control_room',
      });
    } else if (type === 'iso3741') {
      // ISO 3741 Cámara Reverberante: Fuente en esquina (Q=8), receptor en campo reverberado r >= 2*Dc
      const sX = Number((minX + 0.4).toFixed(2));
      const sY = Number((minY + 0.4).toFixed(2));
      const sZ = 0.3;

      const targetDist = Math.max(3.0, Math.min(roomL * 0.75, Dc * 2.2));
      const rX = Number((minX + targetDist * 0.7).toFixed(2));
      const rY = Number((minY + targetDist * 0.7).toFixed(2));
      const rZ = 1.2;

      const realDist = Math.sqrt((rX - sX) ** 2 + (rY - sY) ** 2 + (rZ - sZ) ** 2);
      onChange({
        ...sourceReceiver,
        directivity: 8,
        sourcePos: { x: sX, y: sY, z: sZ },
        receiverPos: { x: rX, y: rY, z: rZ },
        distance: Number(realDist.toFixed(2)),
        isoPreset: 'iso3741',
      });
    }
  };

  const currentWatts = lwToPowerWatts(sourceReceiver.lw);

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-7 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-black/[0.06] dark:border-white/[0.06] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] flex items-center justify-center font-bold">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight">
              3. Fuente Acústica, Directividad (Q) y Receptor
            </h2>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              Ubicación física según ISO 3382 / ISO 3741, potencia Lw, directividad Q y distancia crítica Dc
            </p>
          </div>
        </div>

        {/* Badge de Conformidad ISO 3382 en el Encabezado */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
            isFullIsoCompliant
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
          }`}>
            {isFullIsoCompliant ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Norma ISO 3382: Cumplida</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Norma ISO 3382: Revisar Ubicación</span>
              </>
            )}
          </div>

          {!isFullIsoCompliant && (
            <button
              onClick={() => applyIsoPreset('iso3382')}
              className="px-3 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] text-white text-xs font-semibold shadow-2xs transition active:scale-95 flex items-center gap-1"
              title="Ajustar posiciones a los estándares de la norma ISO 3382"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-alinear ISO</span>
            </button>
          )}
        </div>
      </div>

      {/* --- PRESETS RÁPIDOS ISO 3382 / ISO 3741 --- */}
      <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
            Presets de Colocación Normalizada
          </span>
          <span className="text-[11px] text-[#86868b] dark:text-slate-400 font-mono">
            Normas ISO 3382-1 / ISO 3741
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Preset 1: ISO 3382 Auditorio */}
          <button
            onClick={() => applyIsoPreset('iso3382')}
            className={`p-3 rounded-xl border text-left transition ${
              sourceReceiver.isoPreset === 'iso3382' || (isFullIsoCompliant && sourceReceiver.directivity === 1)
                ? 'bg-white dark:bg-[#20233c] border-[#5833c7] dark:border-[#8767f9] shadow-sm ring-2 ring-[#5833c7]/20'
                : 'bg-white dark:bg-[#1a1c30] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.15]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
              <div className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                🏛️ ISO 3382 Sala / Auditorio
              </div>
            </div>
            <p className="text-[10px] text-[#86868b] dark:text-slate-400 mt-1">
              hs = 1.5m · hr = 1.2m (oyente sentado) · r ≥ 2.0m · d_pared ≥ 1.0m
            </p>
          </button>

          {/* Preset 2: ISO Control Room */}
          <button
            onClick={() => applyIsoPreset('control_room')}
            className={`p-3 rounded-xl border text-left transition ${
              sourceReceiver.isoPreset === 'control_room'
                ? 'bg-white dark:bg-[#20233c] border-[#5833c7] dark:border-[#8767f9] shadow-sm ring-2 ring-[#5833c7]/20'
                : 'bg-white dark:bg-[#1a1c30] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.15]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
              <div className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                🎙️ ISO Estudio / Control Room
              </div>
            </div>
            <p className="text-[10px] text-[#86868b] dark:text-slate-400 mt-1">
              Sweet spot calibrado a distancia crítica r ≈ Dc ({Dc.toFixed(2)}m) · Q = 2
            </p>
          </button>

          {/* Preset 3: ISO 3741 Cámara Reverberante */}
          <button
            onClick={() => applyIsoPreset('iso3741')}
            className={`p-3 rounded-xl border text-left transition ${
              sourceReceiver.isoPreset === 'iso3741' || sourceReceiver.directivity === 8
                ? 'bg-white dark:bg-[#20233c] border-[#5833c7] dark:border-[#8767f9] shadow-sm ring-2 ring-[#5833c7]/20'
                : 'bg-white dark:bg-[#1a1c30] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.15]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ff9500]" />
              <div className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                🧪 ISO 3741 Reverberante
              </div>
            </div>
            <p className="text-[10px] text-[#86868b] dark:text-slate-400 mt-1">
              Fuente en rincón (Q = 8) · Receptor en campo difuso r ≥ 2·Dc
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- COLUMNA 1: FUENTE SONORA --- */}
        <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-5 sm:p-6 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#ff9500]" /> Parámetros de la Fuente Sonora
              </span>
              <span className="text-[11px] font-mono text-[#86868b] dark:text-slate-400">
                W₀ = 10⁻¹² W (1 pW)
              </span>
            </div>

            {/* Inputs de Lw y Watts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-white dark:bg-[#1c1e34] p-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs">
                <label className="text-xs font-semibold text-[#86868b] dark:text-slate-400 block mb-1">
                  Nivel de Potencia (Lw)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="30" max="160" step="0.5"
                    value={sourceReceiver.lw}
                    onChange={(e) => handleLwChange(e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] font-mono text-xl font-bold text-[#1d1d1f] dark:text-white px-3 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.1] focus:outline-none focus:border-[#5833c7]"
                  />
                  <span className="text-xs font-bold text-[#86868b] font-mono">dB</span>
                </div>
                <span className="text-[10px] text-[#86868b] dark:text-slate-500 font-mono mt-1 block">
                  Lw = 10 · log10(W / 10⁻¹²)
                </span>
              </div>

              <div className="bg-white dark:bg-[#1c1e34] p-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs">
                <label className="text-xs font-semibold text-[#86868b] dark:text-slate-400 block mb-1">
                  Potencia Real (W)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.0000001" max="1000" step="0.001"
                    value={currentWatts > 0.001 ? currentWatts.toFixed(4) : currentWatts.toExponential(3)}
                    onChange={(e) => handleWattsChange(e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] font-mono text-sm font-bold text-[#1d1d1f] dark:text-white px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.1] focus:outline-none focus:border-[#5833c7]"
                  />
                  <span className="text-xs font-bold text-[#86868b] font-mono">W</span>
                </div>
                <span className="text-[10px] text-[#86868b] dark:text-slate-500 font-mono mt-1 block">
                  {currentWatts >= 1 ? `${currentWatts.toFixed(2)} W` : `${(currentWatts * 1000).toFixed(2)} mW`}
                </span>
              </div>
            </div>

            {/* Factor de Directividad Q */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-white flex items-center justify-between mb-2">
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
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-white dark:bg-[#20233c] border-[#ff9500] shadow-sm ring-2 ring-[#ff9500]/20'
                          : 'bg-white dark:bg-[#1c1e34] border-black/[0.06] dark:border-white/[0.08] text-[#86868b]'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs text-[#ff9500]">
                        Q = {preset.value}
                      </div>
                      <div className="text-[10px] text-[#1d1d1f] dark:text-slate-300 font-medium mt-0.5 leading-tight">
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

            {/* Coordenadas 3D de la Fuente */}
            <div className="bg-white dark:bg-[#1c1e34] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1">
                  <Move className="w-3 h-3 text-[#5833c7] dark:text-[#8767f9]" />
                  Posición 3D de la Fuente (X, Y, Z)
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  isSourceWallCompliant ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  Margen pared: {sourceWallDist.toFixed(1)}m {isSourceWallCompliant ? '✓' : '(ISO ≥ 1.0m)'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9.5px] font-mono text-[#86868b] block mb-0.5">X (m)</label>
                  <input
                    type="number" step="0.1"
                    value={sourcePos.x}
                    onChange={(e) => handleUpdateSourceCoords('x', e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white px-2 py-1 rounded border border-black/[0.08] dark:border-white/[0.1] text-center"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-mono text-[#86868b] block mb-0.5">Y (m)</label>
                  <input
                    type="number" step="0.1"
                    value={sourcePos.y}
                    onChange={(e) => handleUpdateSourceCoords('y', e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white px-2 py-1 rounded border border-black/[0.08] dark:border-white/[0.1] text-center"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-mono text-[#86868b] block mb-0.5">Altura Z (m)</label>
                  <input
                    type="number" step="0.1" min="0.1" max={H}
                    value={sourcePos.z}
                    onChange={(e) => handleUpdateSourceCoords('z', e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white px-2 py-1 rounded border border-black/[0.08] dark:border-white/[0.1] text-center"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- COLUMNA 2: RECEPTOR Y CAMPO ACÚSTICO --- */}
        <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-5 sm:p-6 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" /> Posición del Receptor
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isDirectDominant 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
              }`}>
                {isDirectDominant ? 'Dominio: Campo Directo' : 'Dominio: Campo Reverberado'}
              </span>
            </div>

            {/* Slider de Distancia r con Sincronización */}
            <div className="bg-white dark:bg-[#1c1e34] p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#86868b] dark:text-slate-400">
                  Distancia Directa Fuente - Receptor (r)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.1" max={maxRoomDimension || 50} step="0.1"
                    value={r}
                    onChange={(e) => handleDistanceSliderChange(e.target.value)}
                    className="w-20 bg-[#fbfbfd] dark:bg-[#141628] font-mono text-right text-base font-bold text-[#1d1d1f] dark:text-white px-2 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.1] focus:outline-none focus:border-[#5833c7]"
                  />
                  <span className="text-xs font-bold text-[#86868b] font-mono">m</span>
                </div>
              </div>

              <input
                type="range"
                min="0.5"
                max={Math.max(15, (maxRoomDimension || 30))}
                step="0.1"
                value={r}
                onChange={(e) => handleDistanceSliderChange(e.target.value)}
                className="w-full accent-[#5833c7] cursor-pointer mt-1"
              />

              <div className="flex justify-between items-center text-[11px] font-mono text-[#86868b] dark:text-slate-400 mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <span>Distancia Crítica (Dc @ 1kHz):</span>
                <span className="text-amber-600 font-bold">{Dc.toFixed(2)} m</span>
              </div>
            </div>

            {/* Coordenadas 3D del Receptor */}
            <div className="bg-white dark:bg-[#1c1e34] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1">
                  <Move className="w-3 h-3 text-[#10b981]" />
                  Posición 3D del Receptor (X, Y, Z)
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  isReceiverWallCompliant ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  Margen pared: {receiverWallDist.toFixed(1)}m {isReceiverWallCompliant ? '✓' : '(ISO ≥ 1.0m)'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9.5px] font-mono text-[#86868b] block mb-0.5">X (m)</label>
                  <input
                    type="number" step="0.1"
                    value={receiverPos.x}
                    onChange={(e) => handleUpdateReceiverCoords('x', e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white px-2 py-1 rounded border border-black/[0.08] dark:border-white/[0.1] text-center"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-mono text-[#86868b] block mb-0.5">Y (m)</label>
                  <input
                    type="number" step="0.1"
                    value={receiverPos.y}
                    onChange={(e) => handleUpdateReceiverCoords('y', e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white px-2 py-1 rounded border border-black/[0.08] dark:border-white/[0.1] text-center"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-mono text-[#86868b] block mb-0.5">Altura Z (m)</label>
                  <input
                    type="number" step="0.1" min="0.1" max={H}
                    value={receiverPos.z}
                    onChange={(e) => handleUpdateReceiverCoords('z', e.target.value)}
                    className="w-full bg-[#fbfbfd] dark:bg-[#141628] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white px-2 py-1 rounded border border-black/[0.08] dark:border-white/[0.1] text-center"
                  />
                </div>
              </div>
            </div>

            {/* Opciones Ambientales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-white dark:bg-[#1c1e34] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
                  <div>
                    <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white">Velocidad c</div>
                    <div className="text-[10px] text-[#86868b]">Aire a 20 °C</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#1d1d1f] dark:text-white">{SPEED_OF_SOUND} m/s</span>
              </div>

              <div className="bg-white dark:bg-[#1c1e34] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
                  <div>
                    <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white">Absorción Aire</div>
                    <div className="text-[10px] text-[#86868b]">Término 4mV</div>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIncludeAirAbsorption(!includeAirAbsorption)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    includeAirAbsorption ? 'bg-[#5833c7]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      includeAirAbsorption ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

          </div>

          {/* Estado de Campo Sonoro */}
          <div className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
            isDirectDominant 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
          }`}>
            <span>
              {isDirectDominant ? '🎯 Campo directo predominante (r < Dc):' : '🌊 Campo reverberado predominante (r > Dc):'}
            </span>
            <strong className="font-mono">
              {isDirectDominant ? 'Claridad directa' : 'Reflexiones múltiples'}
            </strong>
          </div>
        </div>

      </div>

      {/* --- AUDITOR DE CUMPLIMIENTO DE NORMAS ISO 3382 --- */}
      <div className="bg-[#fbfbfd] dark:bg-[#16182a] p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#5833c7] dark:text-[#8767f9]" />
            Auditoría de Normas Acústicas (ISO 3382-1 / ISO 3382-2)
          </span>
          <span className="text-[11px] font-mono text-[#86868b] dark:text-slate-400">
            Medición de Tiempo de Reverberación en Recintos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Criterio 1: Distancia r */}
          <div className={`p-2.5 rounded-xl border ${
            isDistanceIsoCompliant
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="font-bold flex items-center justify-between">
              <span>Distancia r ≥ 2.0 m</span>
              <span>{isDistanceIsoCompliant ? '✓ Cumple' : '⚠️ No Cumple'}</span>
            </div>
            <p className="text-[10.5px] mt-0.5 opacity-90">
              Actual: <strong>{r.toFixed(2)} m</strong>. Evita distorsiones en campo cercano reactivo.
            </p>
          </div>

          {/* Criterio 2: Margen Fuente a Pared */}
          <div className={`p-2.5 rounded-xl border ${
            isSourceWallCompliant
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="font-bold flex items-center justify-between">
              <span>Fuente a Pared ≥ 1.0 m</span>
              <span>{isSourceWallCompliant ? '✓ Cumple' : '⚠️ Advertencia'}</span>
            </div>
            <p className="text-[10.5px] mt-0.5 opacity-90">
              Margen: <strong>{sourceWallDist.toFixed(2)} m</strong>. Previene acoplamiento modal espurio.
            </p>
          </div>

          {/* Criterio 3: Margen Receptor a Pared */}
          <div className={`p-2.5 rounded-xl border ${
            isReceiverWallCompliant
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="font-bold flex items-center justify-between">
              <span>Micro a Pared ≥ 1.0 m</span>
              <span>{isReceiverWallCompliant ? '✓ Cumple' : '⚠️ Advertencia'}</span>
            </div>
            <p className="text-[10.5px] mt-0.5 opacity-90">
              Margen: <strong>{receiverWallDist.toFixed(2)} m</strong>. Evita reflexiones de borde inmediato.
            </p>
          </div>

          {/* Criterio 4: Alturas Normalizadas */}
          <div className={`p-2.5 rounded-xl border ${
            isSourceHeightCompliant && isReceiverHeightCompliant
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300'
          }`}>
            <div className="font-bold flex items-center justify-between">
              <span>Alturas ISO</span>
              <span>{isSourceHeightCompliant && isReceiverHeightCompliant ? '✓ Normalizada' : 'Personalizada'}</span>
            </div>
            <p className="text-[10.5px] mt-0.5 opacity-90">
              Fuente hs = <strong>{sourcePos.z.toFixed(1)}m</strong> · Receptor hr = <strong>{receiverPos.z.toFixed(1)}m</strong>
            </p>
          </div>
        </div>
      </div>

      {/* --- VISUALIZADOR 3D SINCRONIZADO --- */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider">
              Visualización 3D Sincronizada del Recinto y Posicionamiento Acústico
            </span>
          </div>
          <span className="text-[11px] text-[#86868b] dark:text-slate-400 font-mono">
            {vertices.length} paredes · {geometry?.floorArea ? geometry.floorArea.toFixed(1) : (roomL * roomW).toFixed(1)} m² de planta
          </span>
        </div>

        <RoomVisualizer
          roomPolygon={roomPolygon}
          geometry={geometry}
          dimensions={dimensions}
          sourceReceiver={sourceReceiver}
          criticalDistance={criticalDistance}
          onChangeSourceReceiver={onChange}
          materials={materials}
          selectedBand={selectedBand}
        />
      </div>

    </div>
  );
}
