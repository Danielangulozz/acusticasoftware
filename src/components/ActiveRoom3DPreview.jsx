import React, { useState, useMemo } from 'react';
import {
  Box,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Volume2,
  Clock,
  Sparkles,
  Maximize2,
  Compass,
  Radio,
  MapPin,
  Eye,
} from 'lucide-react';
import { polygonCentroid } from '../utils/acousticCalculations';
import { pointInPolygon, findSafeInteriorPoint } from '../utils/sketchGeometry';

/**
 * ==============================================================================
 * COMPONENTE: ActiveRoom3DPreview
 * ==============================================================================
 * Mini-Visor 3D Persistente y Tarjeta de Sincronización de Sala Activa.
 * Brinda certeza visual inmediata de que el Módulo 6 (y módulos 2 a 5) están
 * calculando sobre la sala viva diseñada en el Módulo 1.
 */
export default function ActiveRoom3DPreview({
  roomPolygon,
  geometry,
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
  rt60 = 1.0,
  sourceReceiver = null,
  measurementData = null,
  probePoint = null,
  activeSection = 'modes',
  onNavigateToGeometry = () => {},
  className = '',
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [rotY, setRotY] = useState(38);
  const [rotX, setRotX] = useState(26);

  const Lx = Math.max(0.1, Number(geometry?.length || dimensions?.Lx || 10));
  const Ly = Math.max(0.1, Number(geometry?.width || dimensions?.Ly || 6));
  const Lz = Math.max(0.1, Number(roomPolygon?.height || geometry?.height || dimensions?.Lz || 3));
  const volume = Number((geometry?.volume || (Lx * Ly * Lz)).toFixed(1));
  const surface = Number((geometry?.totalSurfaceArea || (2 * (Lx * Ly + Lx * Lz + Ly * Lz))).toFixed(1));

  // Vértices 2D de la planta
  const vertices = useMemo(() => {
    if (roomPolygon?.vertices && roomPolygon.vertices.length >= 3) {
      return roomPolygon.vertices;
    }
    return [
      { x: 0, y: 0 },
      { x: Lx, y: 0 },
      { x: Lx, y: Ly },
      { x: 0, y: Ly },
    ];
  }, [roomPolygon, Lx, Ly]);

  const centroid = useMemo(() => polygonCentroid(vertices), [vertices]);

  // Proyección isométrica / 3D simplificada a coordenadas SVG
  const project3D = (x, y, z) => {
    // Centrar en el centroide de la sala
    const dx = x - centroid.x;
    const dy = y - centroid.y;
    const dz = z - Lz / 2;

    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    // Rotación Yaw (Y)
    const x1 = dx * Math.cos(radY) - dy * Math.sin(radY);
    const y1 = dx * Math.sin(radY) + dy * Math.cos(radY);
    const z1 = dz;

    // Rotación Pitch (X)
    const x2 = x1;
    const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);

    // Escala de proyección para encajar en el canvas SVG (360 x 180)
    const maxDim = Math.max(Lx, Ly, Lz * 1.4, 6);
    const scale = 140 / maxDim;

    const svgX = 180 + x2 * scale;
    const svgY = 95 - y2 * scale; // Invertir eje Y vertical

    return { x: svgX, y: svgY, depth: z2 };
  };

  // Puntos proyectados de piso y techo
  const floorPts = useMemo(() => vertices.map(v => project3D(v.x, v.y, 0)), [vertices, rotX, rotY, centroid, Lz, Lx, Ly]);
  const ceilPts = useMemo(() => vertices.map(v => project3D(v.x, v.y, Lz)), [vertices, rotX, rotY, centroid, Lz, Lx, Ly]);

  const floorSvgPath = useMemo(() => {
    return floorPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
  }, [floorPts]);

  const ceilSvgPath = useMemo(() => {
    return ceilPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
  }, [ceilPts]);

  // Proyección de fuente sonora S0 y receptor R sincronizados
  const sourceActual = useMemo(() => {
    if (sourceReceiver?.sourcePos && (vertices.length < 3 || pointInPolygon(sourceReceiver.sourcePos, vertices))) {
      return sourceReceiver.sourcePos;
    }
    if (measurementData?.source && (vertices.length < 3 || pointInPolygon(measurementData.source, vertices))) {
      return measurementData.source;
    }
    return findSafeInteriorPoint(vertices, sourceReceiver?.sourcePos);
  }, [sourceReceiver?.sourcePos, measurementData?.source, vertices]);

  const sourceProjected = useMemo(() => {
    return project3D(sourceActual.x, sourceActual.y, sourceActual.z || 1.5);
  }, [sourceActual, rotX, rotY, centroid, Lz, Lx, Ly]);

  const receiverActual = useMemo(() => {
    if (sourceReceiver?.receiverPos && (vertices.length < 3 || pointInPolygon(sourceReceiver.receiverPos, vertices))) {
      return sourceReceiver.receiverPos;
    }
    const cand = { x: sourceActual.x + 2.0, y: sourceActual.y, z: 1.2 };
    return findSafeInteriorPoint(vertices, cand);
  }, [sourceReceiver?.receiverPos, sourceActual, vertices]);

  const receiverProjected = useMemo(() => {
    return project3D(receiverActual.x, receiverActual.y, receiverActual.z || 1.2);
  }, [receiverActual, rotX, rotY, centroid, Lz, Lx, Ly]);

  // Proyección de sonda receptora (probe)
  const probeProjected = useMemo(() => {
    if (!probePoint) return null;
    return project3D(probePoint.x, probePoint.y, probePoint.z);
  }, [probePoint, rotX, rotY, centroid, Lz, Lx, Ly]);

  return (
    <div className={`bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden shadow-apple-sm transition-all ${className}`}>
      
      {/* Barra superior de sincronización */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#5833c7]/[0.06] via-transparent to-[#0071e3]/[0.04] dark:from-[#5833c7]/15 dark:to-transparent border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        
        {/* Identificador de sala viva */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#5833c7] text-white shadow-xs">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] dark:text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                Sala Activa Módulo 1 Sincronizada
              </span>
              <span className="text-[11px] font-mono font-bold text-[#1d1d1f] dark:text-white">
                {Lx.toFixed(1)}m × {Ly.toFixed(1)}m × {Lz.toFixed(1)}m
              </span>
            </div>
            <div className="text-xs text-[#86868b] dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Volumen: <strong className="text-[#1d1d1f] dark:text-white">{volume} m³</strong></span>
              <span>&bull;</span>
              <span>Superficie: <strong className="text-[#1d1d1f] dark:text-white">{surface} m²</strong></span>
              <span>&bull;</span>
              <span>RT₆₀: <strong className="text-[#0071e3] dark:text-sky-400 font-mono">{Number(rt60).toFixed(2)}s</strong></span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToGeometry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#18192a] hover:bg-[#f5f5f7] dark:hover:bg-[#25263a] text-xs font-semibold text-[#5833c7] dark:text-purple-300 border border-black/[0.08] dark:border-white/[0.08] shadow-2xs transition-all"
            title="Ir al Módulo 1 para modificar la geometría de la sala"
          >
            <span>Editar Dimensiones</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#86868b] transition-colors"
            title={isCollapsed ? 'Desplegar Mini-Visor 3D' : 'Plegar Mini-Visor 3D'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Contenido 3D desplegable */}
      {!isCollapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Mini Canvas SVG 3D interactivo */}
          <div className="md:col-span-8 bg-[#fbfbfd] dark:bg-[#0c0d18] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-2 relative overflow-hidden flex items-center justify-center">
            
            <svg
              viewBox="0 0 360 190"
              className="w-full h-44 sm:h-48 select-none cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startY = e.clientY;
                const origRotY = rotY;
                const origRotX = rotX;
                const onMove = (ev) => {
                  setRotY((origRotY + (ev.clientX - startX) * 0.6) % 360);
                  setRotX(Math.max(5, Math.min(85, origRotX - (ev.clientY - startY) * 0.4)));
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            >
              {/* Ejes de referencia en esquina */}
              <g opacity="0.6" transform="translate(30, 160)">
                <line x1="0" y1="0" x2="20" y2="0" stroke="#ef4444" strokeWidth="1.5" />
                <text x="23" y="3" fontSize="8" fill="#ef4444" fontWeight="bold">X</text>
                <line x1="0" y1="0" x2="0" y2="-20" stroke="#10b981" strokeWidth="1.5" />
                <text x="-3" y="-23" fontSize="8" fill="#10b981" fontWeight="bold">Z</text>
                <line x1="0" y1="0" x2="-14" y2="10" stroke="#0071e3" strokeWidth="1.5" />
                <text x="-20" y="16" fontSize="8" fill="#0071e3" fontWeight="bold">Y</text>
              </g>

              {/* Piso */}
              <path
                d={floorSvgPath}
                fill="#5833c7"
                fillOpacity="0.12"
                stroke="#5833c7"
                strokeWidth="1.5"
              />

              {/* Aristas verticales (columnas de esquinas) */}
              {floorPts.map((pFloor, i) => {
                const pCeil = ceilPts[i];
                return (
                  <line
                    key={`col-${i}`}
                    x1={pFloor.x}
                    y1={pFloor.y}
                    x2={pCeil.x}
                    y2={pCeil.y}
                    stroke="#5833c7"
                    strokeWidth="1.2"
                    strokeOpacity="0.5"
                    strokeDasharray={i % 2 === 0 ? '' : '3 3'}
                  />
                );
              })}

              {/* Techo translúcido */}
              <path
                d={ceilSvgPath}
                fill="#0071e3"
                fillOpacity="0.08"
                stroke="#0071e3"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Cajas de dimensiones en las aristas principales */}
              {floorPts.length >= 2 && (
                <text
                  x={(floorPts[0].x + floorPts[1].x) / 2}
                  y={(floorPts[0].y + floorPts[1].y) / 2 + 10}
                  fontSize="8"
                  fontWeight="bold"
                  fill="#5833c7"
                  textAnchor="middle"
                >
                  Lx = {Lx}m
                </text>
              )}

              {/* Overlays de Módulo 6: Fuente S0 y Sonda Receptora */}
              {showOverlays && (
                <>
                  {/* Línea de distancia entre Fuente y Receptor */}
                  <line
                    x1={sourceProjected.x}
                    y1={sourceProjected.y}
                    x2={receiverProjected.x}
                    y2={receiverProjected.y}
                    stroke="#5833c7"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />

                  {/* Fuente Sonora S0 */}
                  <g transform={`translate(${sourceProjected.x}, ${sourceProjected.y})`}>
                    <circle r="6" fill="#5833c7" stroke="#ffffff" strokeWidth="1.5" />
                    <circle r="12" fill="none" stroke="#5833c7" strokeWidth="1" strokeOpacity="0.4" className="animate-ping" />
                    <text y="-8" fontSize="8" fontWeight="bold" fill="#5833c7" textAnchor="middle">S₀ (Fuente)</text>
                  </g>

                  {/* Receptor R */}
                  <g transform={`translate(${receiverProjected.x}, ${receiverProjected.y})`}>
                    <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                    <text y="-7" fontSize="7" fontWeight="bold" fill="#10b981" textAnchor="middle">R (Micro)</text>
                  </g>

                  {/* Sonda Receptora (Probe) */}
                  {probeProjected && (
                    <g transform={`translate(${probeProjected.x}, ${probeProjected.y})`}>
                      <circle r="5" fill="#0071e3" stroke="#ffffff" strokeWidth="1.5" />
                      <text y="-7" fontSize="7" fontWeight="bold" fill="#0071e3" textAnchor="middle">Sonda</text>
                    </g>
                  )}

                  {/* Puntos de la Cuadrícula In Situ */}
                  {measurementData?.points && measurementData.points.slice(0, 16).map(p => {
                    const ptProj = project3D(p.x, p.y, p.z || 1.2);
                    return (
                      <circle
                        key={`grid-pt-${p.id}`}
                        cx={ptProj.x}
                        cy={ptProj.y}
                        r="2.5"
                        fill={p.isCorner ? '#f59e0b' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        opacity="0.8"
                      />
                    );
                  })}
                </>
              )}
            </svg>

            {/* Controles de cámara flotantes */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/80 dark:bg-[#18192a]/80 backdrop-blur-sm px-2 py-1 rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-[10px] text-[#86868b] font-mono">
              <Compass className="w-3 h-3 text-[#5833c7]" />
              <span>Arrastra para rotar órbita 3D</span>
            </div>
          </div>

          {/* Ficha técnica compacta */}
          <div className="md:col-span-4 space-y-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#86868b] flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#5833c7]" />
                <span>Geometría &bull; Modo 3D Vivo</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-[#86868b] block text-[10px]">Longitud (Lx):</span>
                  <strong className="text-[#1d1d1f] dark:text-white">{Lx} m</strong>
                </div>
                <div>
                  <span className="text-[#86868b] block text-[10px]">Ancho (Ly):</span>
                  <strong className="text-[#1d1d1f] dark:text-white">{Ly} m</strong>
                </div>
                <div>
                  <span className="text-[#86868b] block text-[10px]">Altura (Lz):</span>
                  <strong className="text-[#1d1d1f] dark:text-white">{Lz} m</strong>
                </div>
                <div>
                  <span className="text-[#86868b] block text-[10px]">Recorrido (l):</span>
                  <strong className="text-[#0071e3] dark:text-sky-400">{(4 * volume / surface).toFixed(2)} m</strong>
                </div>
              </div>
            </div>

            {/* Toggle de superposición */}
            <button
              type="button"
              onClick={() => setShowOverlays(!showOverlays)}
              className={`w-full py-2 px-3 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition-all ${
                showOverlays
                  ? 'bg-[#5833c7]/10 dark:bg-[#5833c7]/20 border-[#5833c7]/30 text-[#5833c7] dark:text-purple-300'
                  : 'bg-white dark:bg-[#18192a] border-black/[0.08] dark:border-white/[0.08] text-[#86868b]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Superponer Fuente S₀ y Sonda</span>
              </span>
              <span className="font-mono text-[10px] uppercase font-bold">
                {showOverlays ? 'Activado' : 'Oculto'}
              </span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
