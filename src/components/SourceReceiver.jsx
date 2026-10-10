import React, { useMemo, useState } from 'react';
import {
  Volume2,
  Compass,
  Ruler,
  Wind,
  Activity,
  Radio,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Move,
  Building,
  Headphones,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import {
  DIRECTIVITY_PRESETS,
  SPEED_OF_SOUND,
  powerWattsToLw,
  lwToPowerWatts,
  polygonCentroid,
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
 * Módulo 3: Fuente Sonora, Directividad (Q) y Receptor (SourceReceiver)
 * Rediseñado con estética Bento Grid, sin saturación visual y con visualizador 3D colapsable.
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
  soundFieldData = {},
}) {
  const [show3DVisualizer, setShow3DVisualizer] = useState(false);

  // Vértices y geometría
  const vertices = useMemo(() => {
    if (roomPolygon?.vertices && roomPolygon.vertices.length >= 3) {
      return roomPolygon.vertices;
    }
    const L = dimensions?.length || 10;
    const W = dimensions?.width || 6;
    return [{ x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: W }, { x: 0, y: W }];
  }, [roomPolygon, dimensions]);

  const H = roomPolygon?.height || dimensions?.height || 3.0;
  const centroid = useMemo(() => polygonCentroid(vertices), [vertices]);
  const xs = useMemo(() => vertices.map((v) => v.x), [vertices]);
  const ys = useMemo(() => vertices.map((v) => v.y), [vertices]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const roomL = maxX - minX;
  const roomW = maxY - minY;

  // Posiciones de Fuente y Receptor con fallback seguro
  const sourcePos = useMemo(() => {
    if (sourceReceiver?.sourcePos) return sourceReceiver.sourcePos;
    return {
      x: Number((minX + Math.min(2.0, roomL * 0.25)).toFixed(2)),
      y: Number(centroid.y.toFixed(2)),
      z: 1.5,
    };
  }, [sourceReceiver?.sourcePos, minX, roomL, centroid]);

  const receiverPos = useMemo(() => {
    if (sourceReceiver?.receiverPos) return sourceReceiver.receiverPos;
    const initialDist = Math.min(3.0, Math.max(1.0, sourceReceiver?.distance || 3.0));
    return {
      x: Number((sourcePos.x + initialDist).toFixed(2)),
      y: Number(sourcePos.y.toFixed(2)),
      z: 1.2,
    };
  }, [sourceReceiver?.receiverPos, sourcePos, sourceReceiver?.distance]);

  // Distancia 3D
  const currentR3D = useMemo(() => {
    const dx = receiverPos.x - sourcePos.x;
    const dy = receiverPos.y - sourcePos.y;
    const dz = receiverPos.z - sourcePos.z;
    return Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }, [sourcePos, receiverPos]);

  const r = Number(sourceReceiver.distance || currentR3D.toFixed(2));
  const Dc = criticalDistance || 2.0;
  const isDirectDominant = r < Dc;

  // Verificaciones ISO 3382
  const sourceWallDist = useMemo(() => minDistanceToWalls(sourcePos.x, sourcePos.y, vertices), [sourcePos, vertices]);
  const receiverWallDist = useMemo(() => minDistanceToWalls(receiverPos.x, receiverPos.y, vertices), [receiverPos, vertices]);

  const isDistanceIsoCompliant = r >= 2.0;
  const isSourceWallCompliant = sourceWallDist >= 1.0;
  const isReceiverWallCompliant = receiverWallDist >= 1.0;
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

  // Presets ISO
  const applyIsoPreset = (type) => {
    if (type === 'iso3382') {
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

  // Nivel directo real calculado por el motor acústico (misma fuente que el Módulo 4)
  const lpDirect = soundFieldData[selectedBand]?.directIntensityLevel ?? 0;

  return (
    <div className="bg-white dark:bg-[#141622] rounded-3xl border border-black/[0.08] dark:border-white/10 p-6 sm:p-8 shadow-apple-sm transition-all space-y-6">

      {/* 1. Encabezado Bento Limpio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa] flex items-center justify-center font-bold">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1d1d1f] dark:text-white tracking-tight">
              3. Fuente y Receptor
            </h2>
            <p className="text-xs text-[#86868b] dark:text-slate-400">
              Potencia acústica Lw, directividad Q, geometría 3D y evaluación del campo sonoro
            </p>
          </div>
        </div>

        {/* Badge de Conformidad ISO 3382 */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
            isFullIsoCompliant
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          }`}>
            {isFullIsoCompliant ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>ISO 3382 Conforme</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Revisar Distancia ISO</span>
              </>
            )}
          </div>

          {!isFullIsoCompliant && (
            <button
              onClick={() => applyIsoPreset('iso3382')}
              className="px-3 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4727a8] text-white text-xs font-bold transition active:scale-95 flex items-center gap-1 shadow-sm"
              title="Alinear automáticamente a las normas ISO 3382"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-alinear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Presets Normalizados (Pills compactas) */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400 mb-2">
          Presets de Colocación Normalizada
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => applyIsoPreset('iso3382')}
            className={`p-3.5 rounded-2xl border text-left transition ${
              sourceReceiver.isoPreset === 'iso3382' || (isFullIsoCompliant && sourceReceiver.directivity === 1)
                ? 'bg-[#5833c7] text-white border-[#5833c7] shadow-md shadow-[#5833c7]/20'
                : 'bg-[#fbfbfd] dark:bg-[#0A0C14] border-black/[0.06] dark:border-white/10 hover:border-black/[0.15]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="text-xs font-bold">🏛️ ISO 3382 Auditorio</span>
            </div>
            <div className={`text-[10px] mt-1 font-mono ${sourceReceiver.isoPreset === 'iso3382' ? 'text-white/80' : 'text-[#86868b] dark:text-slate-400'}`}>
              hs = 1.5m &bull; hr = 1.2m &bull; r ≥ 2.0m &bull; Q = 1
            </div>
          </button>

          <button
            onClick={() => applyIsoPreset('control_room')}
            className={`p-3.5 rounded-2xl border text-left transition ${
              sourceReceiver.isoPreset === 'control_room'
                ? 'bg-[#5833c7] text-white border-[#5833c7] shadow-md shadow-[#5833c7]/20'
                : 'bg-[#fbfbfd] dark:bg-[#0A0C14] border-black/[0.06] dark:border-white/10 hover:border-black/[0.15]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              <span className="text-xs font-bold">🎙️ Estudio / Control Room</span>
            </div>
            <div className={`text-[10px] mt-1 font-mono ${sourceReceiver.isoPreset === 'control_room' ? 'text-white/80' : 'text-[#86868b] dark:text-slate-400'}`}>
              Sweet Spot en Dc ({Dc.toFixed(2)}m) &bull; Q = 2
            </div>
          </button>

          <button
            onClick={() => applyIsoPreset('iso3741')}
            className={`p-3.5 rounded-2xl border text-left transition ${
              sourceReceiver.isoPreset === 'iso3741' || sourceReceiver.directivity === 8
                ? 'bg-[#5833c7] text-white border-[#5833c7] shadow-md shadow-[#5833c7]/20'
                : 'bg-[#fbfbfd] dark:bg-[#0A0C14] border-black/[0.06] dark:border-white/10 hover:border-black/[0.15]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold">🧪 ISO 3741 Reverberante</span>
            </div>
            <div className={`text-[10px] mt-1 font-mono ${sourceReceiver.isoPreset === 'iso3741' ? 'text-white/80' : 'text-[#86868b] dark:text-slate-400'}`}>
              Fuente en rincón (Q = 8) &bull; r ≥ 2·Dc
            </div>
          </button>
        </div>
      </div>

      {/* 3. Cuadrícula Principal Bento (2 Columnas Simétricas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Columna 1: Fuente Sonora */}
        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-5 sm:p-6 rounded-2xl border border-black/[0.06] dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa]" />
              <span>Fuente Sonora</span>
            </div>
            <span className="text-[10px] font-mono text-[#86868b] dark:text-slate-400">
              W₀ = 10⁻¹² W
            </span>
          </div>

          {/* Potencia Acústica Lw / Watts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#141622] p-3 rounded-xl border border-black/[0.06] dark:border-white/10">
              <label className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 block mb-1">
                Nivel Potencia (Lw)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="30"
                  max="160"
                  step="0.5"
                  value={sourceReceiver.lw}
                  onChange={(e) => handleLwChange(e.target.value)}
                  className="w-full bg-transparent font-mono text-xl font-black text-[#1d1d1f] dark:text-white focus:outline-none"
                />
                <span className="text-xs font-bold text-[#86868b] font-mono">dB</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#141622] p-3 rounded-xl border border-black/[0.06] dark:border-white/10">
              <label className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 block mb-1">
                Potencia Acústica
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.0000001"
                  max="1000"
                  step="0.001"
                  value={currentWatts > 0.001 ? currentWatts.toFixed(4) : currentWatts.toExponential(3)}
                  onChange={(e) => handleWattsChange(e.target.value)}
                  className="w-full bg-transparent font-mono text-base font-bold text-[#1d1d1f] dark:text-white focus:outline-none"
                />
                <span className="text-xs font-bold text-[#86868b] font-mono">W</span>
              </div>
            </div>
          </div>

          {/* Factor de Directividad Q */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868b] dark:text-slate-400">
                Directividad (Q)
              </span>
              <span className="text-xs font-mono font-bold text-[#5833c7] dark:text-[#a78bfa]">
                Q = {sourceReceiver.directivity}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIRECTIVITY_PRESETS.map((preset) => {
                const isSelected = sourceReceiver.directivity === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleDirectivityChange(preset.value)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      isSelected
                        ? 'bg-[#5833c7] text-white border-[#5833c7] font-bold shadow-xs'
                        : 'bg-white dark:bg-[#141622] border-black/[0.06] dark:border-white/10 text-[#86868b] dark:text-slate-300 hover:border-black/[0.15]'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">Q = {preset.value}</div>
                    <div className={`text-[9px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-[#86868b] dark:text-slate-400'}`}>
                      {preset.value === 1 && 'Libre (4π)'}
                      {preset.value === 2 && 'Pared (2π)'}
                      {preset.value === 4 && 'Arista (π)'}
                      {preset.value === 8 && 'Rincón (π/2)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coordenadas 3D de la Fuente */}
          <div className="bg-white dark:bg-[#141622] p-3.5 rounded-xl border border-black/[0.06] dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#a78bfa]" />
                Coordenadas 3D (X, Y, Z)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                isSourceWallCompliant ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                Pared: {sourceWallDist.toFixed(1)}m {isSourceWallCompliant ? '✓' : '(ISO ≥ 1m)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-mono text-[#86868b] block mb-0.5 text-center">X (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sourcePos.x}
                  onChange={(e) => handleUpdateSourceCoords('x', e.target.value)}
                  className="w-full bg-[#fbfbfd] dark:bg-[#0A0C14] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white p-1.5 rounded border border-black/[0.08] dark:border-white/10 text-center focus:outline-none focus:border-[#5833c7]"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-[#86868b] block mb-0.5 text-center">Y (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sourcePos.y}
                  onChange={(e) => handleUpdateSourceCoords('y', e.target.value)}
                  className="w-full bg-[#fbfbfd] dark:bg-[#0A0C14] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white p-1.5 rounded border border-black/[0.08] dark:border-white/10 text-center focus:outline-none focus:border-[#5833c7]"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-[#86868b] block mb-0.5 text-center">Z / Altura (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={H}
                  value={sourcePos.z}
                  onChange={(e) => handleUpdateSourceCoords('z', e.target.value)}
                  className="w-full bg-[#fbfbfd] dark:bg-[#0A0C14] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white p-1.5 rounded border border-black/[0.08] dark:border-white/10 text-center focus:outline-none focus:border-[#5833c7]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna 2: Receptor Acústico */}
        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-5 sm:p-6 rounded-2xl border border-black/[0.06] dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#10b981]" />
              <span>Receptor (Oyente / Micrófono)</span>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              isDirectDominant ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-[#a78bfa]'
            }`}>
              {isDirectDominant ? 'Campo Directo (r < Dc)' : 'Campo Reverberado (r > Dc)'}
            </span>
          </div>

          {/* Slider de Distancia r */}
          <div className="bg-white dark:bg-[#141622] p-3.5 rounded-xl border border-black/[0.06] dark:border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-[#86868b] dark:text-slate-400">
                Distancia Directa (r)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.1"
                  max={maxRoomDimension || 50}
                  step="0.1"
                  value={r}
                  onChange={(e) => handleDistanceSliderChange(e.target.value)}
                  className="w-16 bg-[#fbfbfd] dark:bg-[#0A0C14] font-mono text-right text-sm font-bold text-[#1d1d1f] dark:text-white px-2 py-0.5 rounded border border-black/[0.08] dark:border-white/10 focus:outline-none focus:border-[#5833c7]"
                />
                <span className="text-xs font-mono font-bold text-[#86868b]">m</span>
              </div>
            </div>

            <input
              type="range"
              min="0.5"
              max={Math.max(15, maxRoomDimension || 30)}
              step="0.1"
              value={r}
              onChange={(e) => handleDistanceSliderChange(e.target.value)}
              className="w-full accent-[#5833c7] cursor-pointer"
            />

            <div className="flex justify-between items-center text-[10px] font-mono text-[#86868b] dark:text-slate-400 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
              <span>Distancia Crítica (Dc):</span>
              <span className="text-[#10b981] font-bold">{Dc.toFixed(2)} m</span>
            </div>
          </div>

          {/* Coordenadas 3D del Receptor */}
          <div className="bg-white dark:bg-[#141622] p-3.5 rounded-xl border border-black/[0.06] dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-[#10b981]" />
                Coordenadas 3D (X, Y, Z)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                isReceiverWallCompliant ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                Pared: {receiverWallDist.toFixed(1)}m {isReceiverWallCompliant ? '✓' : '(ISO ≥ 1m)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-mono text-[#86868b] block mb-0.5 text-center">X (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={receiverPos.x}
                  onChange={(e) => handleUpdateReceiverCoords('x', e.target.value)}
                  className="w-full bg-[#fbfbfd] dark:bg-[#0A0C14] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white p-1.5 rounded border border-black/[0.08] dark:border-white/10 text-center focus:outline-none focus:border-[#5833c7]"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-[#86868b] block mb-0.5 text-center">Y (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={receiverPos.y}
                  onChange={(e) => handleUpdateReceiverCoords('y', e.target.value)}
                  className="w-full bg-[#fbfbfd] dark:bg-[#0A0C14] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white p-1.5 rounded border border-black/[0.08] dark:border-white/10 text-center focus:outline-none focus:border-[#5833c7]"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-[#86868b] block mb-0.5 text-center">Z / Altura (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={H}
                  value={receiverPos.z}
                  onChange={(e) => handleUpdateReceiverCoords('z', e.target.value)}
                  className="w-full bg-[#fbfbfd] dark:bg-[#0A0C14] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white p-1.5 rounded border border-black/[0.08] dark:border-white/10 text-center focus:outline-none focus:border-[#5833c7]"
                />
              </div>
            </div>
          </div>

          {/* Opciones Ambientales Compactas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white dark:bg-[#141622] p-2.5 rounded-xl border border-black/[0.06] dark:border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-[#86868b] dark:text-slate-400 font-semibold">Vel. Sonido</span>
              <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">{SPEED_OF_SOUND} m/s</span>
            </div>

            <div className="bg-white dark:bg-[#141622] p-2.5 rounded-xl border border-black/[0.06] dark:border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-[#86868b] dark:text-slate-400 font-semibold">Absorción Aire (4mV)</span>
              <button
                type="button"
                onClick={() => setIncludeAirAbsorption(!includeAirAbsorption)}
                className={`w-8 h-[18px] shrink-0 rounded-full transition-colors relative ${
                  includeAirAbsorption ? 'bg-[#5833c7]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-white block absolute top-0.5 transition-transform ${
                    includeAirAbsorption ? 'left-4' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Mini Telemetría Bento de 4 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/10 text-center">
          <div className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">Distancia r</div>
          <div className="text-xl font-black font-mono text-[#1d1d1f] dark:text-white mt-0.5">{r.toFixed(2)} m</div>
        </div>

        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/10 text-center">
          <div className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">Distancia Crítica</div>
          <div className="text-xl font-black font-mono text-[#10b981] mt-0.5">{Dc.toFixed(2)} m</div>
        </div>

        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/10 text-center">
          <div className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">Nivel Directo (Lp,dir)</div>
          <div className="text-xl font-black font-mono text-[#5833c7] dark:text-[#a78bfa] mt-0.5">{lpDirect.toFixed(1)} dB</div>
        </div>

        <div className="bg-[#fbfbfd] dark:bg-[#0A0C14] p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/10 text-center">
          <div className="text-[10px] font-semibold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">Régimen Acústico</div>
          <div className="text-xs font-black font-mono mt-1 text-[#f59e0b]">
            {isDirectDominant ? 'Claridad Directa' : 'Campo Difuso'}
          </div>
        </div>
      </div>

      {/* 5. Visualizador 3D Opcional / Colapsable */}
      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => setShow3DVisualizer(!show3DVisualizer)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#0A0C14] hover:bg-slate-100 dark:hover:bg-[#141622] border border-black/[0.06] dark:border-white/10 text-xs font-bold text-[#1d1d1f] dark:text-white transition"
        >
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa]" />
            <span>Visualizador 3D Sincronizado del Recinto y Posicionamiento</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#5833c7] dark:text-[#a78bfa]">
            {show3DVisualizer ? 'Ocultar 3D' : 'Ver en 3D'}
            {show3DVisualizer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {show3DVisualizer && (
          <div className="mt-4 animate-fadeIn">
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
        )}
      </div>

    </div>
  );
}
