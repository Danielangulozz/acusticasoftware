import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Eye, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Play, 
  Pause, 
  Maximize2, 
  Compass, 
  Layers, 
  Radio, 
  Move,
  Sparkles,
  Info
} from 'lucide-react';

/**
 * Visualizador 3D Interactivo de la Sala Acústica
 * Incluye: Rotación Orbital 3D con Mouse/Touch, Zoom con Rueda, Auto-Rotación Cinemática,
 * Proyección en Perspectiva Real, Cálculo de Profundidad (Painter's Algorithm) y Auto-Ajuste de Escala.
 */
export default function RoomVisualizer({ dimensions, sourceReceiver, criticalDistance, onChangeSourceReceiver }) {
  // Dimensiones físicas de la sala
  const L = Math.max(1, Number(dimensions?.length) || 10);
  const W = Math.max(1, Number(dimensions?.width) || 6);
  const H = Math.max(1, Number(dimensions?.height) || 3);
  const r = Math.max(0.1, Number(sourceReceiver?.distance) || 3);
  const Q = Number(sourceReceiver?.directivity) || 1;
  const Dc = Math.max(0.1, Number(criticalDistance) || 2.5);

  // Estados de control de la cámara 3D
  const [rotX, setRotX] = useState(25);  // Elevación / Pitch en grados
  const [rotY, setRotY] = useState(45);  // Azimuth / Yaw en grados
  const [zoom, setZoom] = useState(1.0);  // Factor de zoom
  const [pan, setPan] = useState({ x: 0, y: 0 }); // Desplazamiento
  const [autoRotate, setAutoRotate] = useState(false);
  const [showRays, setShowRays] = useState(true);
  const [viewPreset, setViewPreset] = useState('3d'); // '3d', 'top', 'front', 'side'

  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  // Auto-rotación cinemática continua
  useEffect(() => {
    if (!autoRotate) return;

    let lastTime = performance.now();
    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setRotY((prev) => (prev + delta * 20) % 360);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [autoRotate]);

  // Manejo de interacción de arrastre (Orbit Drag) con Mouse y Touch
  const handleMouseDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return; // Solo clic primario o rueda
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    if (autoRotate) setAutoRotate(false);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey) {
      // Si presiona Shift, hace Pan
      setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    } else {
      // Rotación 3D orbital
      setRotY((prev) => (prev + deltaX * 0.7) % 360);
      setRotX((prev) => Math.max(-85, Math.min(85, prev - deltaY * 0.7)));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Soporte para gestos táctiles en móviles y tablets
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (autoRotate) setAutoRotate(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - lastMousePosRef.current.x;
    const deltaY = e.touches[0].clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    setRotY((prev) => (prev + deltaX * 0.7) % 360);
    setRotX((prev) => Math.max(-85, Math.min(85, prev - deltaY * 0.7)));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Zoom interactivo con la rueda del ratón (independiente del scroll de la página)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelNonPassive = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.max(0.4, Math.min(3.5, prev * zoomFactor)));
    };

    el.addEventListener('wheel', handleWheelNonPassive, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNonPassive);
    };
  }, []);

  // Preset Views (Vistas Predefinidas)
  const setPreset = (preset) => {
    setViewPreset(preset);
    setAutoRotate(false);
    if (preset === '3d') {
      setRotX(25);
      setRotY(45);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    } else if (preset === 'top') {
      setRotX(90);
      setRotY(0);
      setZoom(1.05);
      setPan({ x: 0, y: 0 });
    } else if (preset === 'front') {
      setRotX(0);
      setRotY(0);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    } else if (preset === 'side') {
      setRotX(0);
      setRotY(90);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
  };

  const resetView = () => {
    setPreset('3d');
  };

  // ============================================================================
  // MATRIZ DE TRANSFORMACIÓN Y PROYECCIÓN 3D
  // ============================================================================

  // Dimensiones normalizadas y escalado dinámico
  const maxDimension = Math.max(L, W, H, 1);
  const baseScale = 220 / maxDimension;
  const currentScale = baseScale * zoom;

  // Centro de pantalla (Viewport SVG 800 x 520 para máxima amplitud)
  const cx = 400 + pan.x;
  const cy = 260 + pan.y;

  // Ángulos en radianes
  const radX = (rotX * Math.PI) / 180;
  const radY = (rotY * Math.PI) / 180;

  const sinX = Math.sin(radX);
  const cosX = Math.cos(radX);
  const sinY = Math.sin(radY);
  const cosY = Math.cos(radY);

  // Función de proyección 3D: convierte (x, y, z) respecto al centro de la sala a coordenadas 2D (px, py, depth)
  const project3D = useCallback(
    (x, y, z) => {
      // 1. Centrar respecto al centro geométrico del recinto
      const localX = x - L / 2;
      const localY = y - W / 2;
      const localZ = z - H / 2;

      // 2. Rotación Azimuth (alrededor del eje Z vertical / Yaw)
      const x1 = localX * cosY - localY * sinY;
      const y1 = localX * sinY + localY * cosY;
      const z1 = localZ;

      // 3. Rotación Elevación (alrededor del eje X / Pitch)
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX; // Profundidad relativa a la cámara

      // 4. Proyección Ortográfica Escalada con perspectiva ligera
      const perspective = 1000;
      const depthFactor = perspective / (perspective + z2 * 0.5);

      const px = cx + x2 * currentScale * depthFactor;
      const py = cy - y2 * currentScale * depthFactor;

      return { x: px, y: py, depth: z2 };
    },
    [L, W, H, cosX, sinX, cosY, sinY, cx, cy, currentScale]
  );

  // 8 Vértices del recinto en 3D
  const vertices = useMemo(() => {
    return {
      v000: project3D(0, 0, 0), // Suelo Frente-Izquierda
      vL00: project3D(L, 0, 0), // Suelo Frente-Derecha
      vLW0: project3D(L, W, 0), // Suelo Fondo-Derecha
      v0W0: project3D(0, W, 0), // Suelo Fondo-Izquierda
      v00H: project3D(0, 0, H), // Techo Frente-Izquierda
      vL0H: project3D(L, 0, H), // Techo Frente-Derecha
      vLWH: project3D(L, W, H), // Techo Fondo-Derecha
      v0WH: project3D(0, W, H), // Techo Fondo-Izquierda
    };
  }, [project3D, L, W, H]);

  // 6 Caras de la sala con cálculo de profundidad promedio (Painter's Algorithm)
  const faces = useMemo(() => {
    const { v000, vL00, vLW0, v0W0, v00H, vL0H, vLWH, v0WH } = vertices;

    const list = [
      {
        id: 'floor',
        name: 'Piso / Suelo',
        points: `${v000.x},${v000.y} ${vL00.x},${vL00.y} ${vLW0.x},${vLW0.y} ${v0W0.x},${v0W0.y}`,
        depth: (v000.depth + vL00.depth + vLW0.depth + v0W0.depth) / 4,
        fill: 'rgba(0, 113, 227, 0.08)',
        stroke: 'rgba(0, 113, 227, 0.4)',
        type: 'floor',
      },
      {
        id: 'ceiling',
        name: 'Techo',
        points: `${v00H.x},${v00H.y} ${vL0H.x},${vL0H.y} ${vLWH.x},${vLWH.y} ${v0WH.x},${v0WH.y}`,
        depth: (v00H.depth + vL0H.depth + vLWH.depth + v0WH.depth) / 4,
        fill: 'rgba(52, 199, 89, 0.06)',
        stroke: 'rgba(52, 199, 89, 0.3)',
        type: 'ceiling',
      },
      {
        id: 'wallNorth',
        name: 'Pared Frontal (Norte)',
        points: `${v000.x},${v000.y} ${vL00.x},${vL00.y} ${vL0H.x},${vL0H.y} ${v00H.x},${v00H.y}`,
        depth: (v000.depth + vL00.depth + vL0H.depth + v00H.depth) / 4,
        fill: 'rgba(0, 0, 0, 0.02)',
        stroke: 'rgba(0, 0, 0, 0.15)',
        type: 'wall',
      },
      {
        id: 'wallSouth',
        name: 'Pared Posterior (Sur)',
        points: `${v0W0.x},${v0W0.y} ${vLW0.x},${vLW0.y} ${vLWH.x},${vLWH.y} ${v0WH.x},${v0WH.y}`,
        depth: (v0W0.depth + vLW0.depth + vLWH.depth + v0WH.depth) / 4,
        fill: 'rgba(0, 0, 0, 0.03)',
        stroke: 'rgba(0, 0, 0, 0.18)',
        type: 'wall',
      },
      {
        id: 'wallEast',
        name: 'Pared Lateral Derecha (Este)',
        points: `${vL00.x},${vL00.y} ${vLW0.x},${vLW0.y} ${vLWH.x},${vLWH.y} ${vL0H.x},${vL0H.y}`,
        depth: (vL00.depth + vLW0.depth + vLWH.depth + vL0H.depth) / 4,
        fill: 'rgba(0, 0, 0, 0.025)',
        stroke: 'rgba(0, 0, 0, 0.15)',
        type: 'wall',
      },
      {
        id: 'wallWest',
        name: 'Pared Lateral Izquierda (Oeste)',
        points: `${v000.x},${v000.y} ${v0W0.x},${v0W0.y} ${v0WH.x},${v0WH.y} ${v00H.x},${v00H.y}`,
        depth: (v000.depth + v0W0.depth + v0WH.depth + v00H.depth) / 4,
        fill: 'rgba(0, 0, 0, 0.025)',
        stroke: 'rgba(0, 0, 0, 0.15)',
        type: 'wall',
      },
    ];

    // Ordenar de mayor profundidad (más atrás) a menor profundidad (más adelante)
    return list.sort((a, b) => a.depth - b.depth);
  }, [vertices]);

  // Posición 3D de la Fuente según directividad Q
  let srcX = L * 0.28;
  let srcY = W * 0.5;
  let srcZ = H * 0.45;
  if (Q === 8) {
    srcX = 0.4; srcY = 0.4; srcZ = 0.4;
  } else if (Q === 4) {
    srcX = 0.4; srcY = W * 0.5; srcZ = 0.4;
  } else if (Q === 2) {
    srcX = L * 0.28; srcY = W * 0.5; srcZ = 0.15;
  }

  // Posición 3D del Receptor a distancia r
  const angleRad = Math.PI / 10;
  const maxRoomDist = Math.sqrt(L * L + W * W + H * H) * 0.92;
  const clampedR = Math.min(r, maxRoomDist);
  const recX = Math.min(L - 0.3, srcX + clampedR * Math.cos(angleRad));
  const recY = Math.min(W - 0.3, srcY + clampedR * Math.sin(angleRad));
  const recZ = Math.min(H - 0.3, srcZ + 0.1);

  const srcPoint = project3D(srcX, srcY, srcZ);
  const recPoint = project3D(recX, recY, recZ);

  // Distancia crítica 3D representada como radio en pantalla
  const dcPointX = project3D(srcX + Dc, srcY, srcZ);
  const dcRadius = Math.max(14, Math.abs(dcPointX.x - srcPoint.x));

  // Rayos de reflexión de primer orden (suelo y pared este)
  const floorBouncePoint = project3D((srcX + recX) / 2, (srcY + recY) / 2, 0);

  return (
    <div className="bg-white rounded-3xl border border-black/[0.08] p-5 sm:p-7 shadow-apple-sm transition-all flex flex-col">
      
      {/* Barra Superior con Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] tracking-tight">
              Visualizador 3D Interactivo de la Sala
            </h3>
            <p className="text-xs text-[#86868b]">
              Arrastra para rotar en 3D • Rueda del ratón para Zoom • Fuente (S), Receptor (R) y Distancia Crítica (Dc)
            </p>
          </div>
        </div>

        {/* Barra de Herramientas de Cámara */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          
          {/* Píldoras de Vistas Predefinidas */}
          <div className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-xl border border-black/[0.04]">
            <button
              onClick={() => setPreset('3d')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                viewPreset === '3d' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              3D
            </button>
            <button
              onClick={() => setPreset('top')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                viewPreset === 'top' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Planta
            </button>
            <button
              onClick={() => setPreset('front')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                viewPreset === 'front' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Frontal
            </button>
            <button
              onClick={() => setPreset('side')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                viewPreset === 'side' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Lateral
            </button>
          </div>

          {/* Botón Auto-Rotación */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-xl border transition ${
              autoRotate
                ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                : 'bg-[#f5f5f7] text-[#1d1d1f] border-black/[0.06] hover:bg-[#e8e8ed]'
            }`}
            title={autoRotate ? "Detener auto-rotación" : "Giro automático continuo"}
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Botones Zoom In / Out */}
          <button
            onClick={() => setZoom((prev) => Math.min(3.0, prev * 1.15))}
            className="p-1.5 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] border border-black/[0.06] transition"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(0.4, prev * 0.85))}
            className="p-1.5 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] border border-black/[0.06] transition"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Restablecer Cámara */}
          <button
            onClick={resetView}
            className="p-1.5 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] hover:text-black border border-black/[0.06] transition"
            title="Restablecer posición inicial"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lienzo SVG Interactivo 3D con Soporte Completo de Mouse y Touch */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[400px] sm:h-[480px] bg-[#fbfbfd] rounded-2xl border border-black/[0.06] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      >
        {/* Trama de Fondo Sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-70 pointer-events-none"></div>

        <svg
          viewBox="0 0 800 520"
          className="w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradientes Suaves */}
            <linearGradient id="rayDirectGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff9500" />
              <stop offset="100%" stopColor="#0071e3" />
            </linearGradient>
            <linearGradient id="rayReflectGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff9500" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#34c759" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0071e3" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* 1. RENDERIZADO DE CARAS POSTERIORES (Painter's Algorithm) */}
          {faces.slice(0, 3).map((face) => (
            <polygon
              key={face.id}
              points={face.points}
              fill={face.fill}
              stroke={face.stroke}
              strokeWidth="1.2"
              strokeDasharray={face.type === 'ceiling' ? '3 3' : undefined}
            />
          ))}

          {/* 2. RECORRIDO DE RAYOS ACÚSTICOS INTERNOS */}
          {showRays && (
            <>
              {/* Rayo de Reflexión de Primer Orden (Suelo) */}
              <polyline
                points={`${srcPoint.x},${srcPoint.y} ${floorBouncePoint.x},${floorBouncePoint.y} ${recPoint.x},${recPoint.y}`}
                fill="none"
                stroke="url(#rayReflectGrad)"
                strokeWidth="1.4"
                strokeDasharray="4 3"
                opacity="0.6"
              />

              {/* Rayo de Sonido Directo (S -> R) */}
              <line
                x1={srcPoint.x}
                y1={srcPoint.y}
                x2={recPoint.x}
                y2={recPoint.y}
                stroke="url(#rayDirectGrad)"
                strokeWidth="2.5"
                strokeDasharray="6 3"
              />

              {/* Etiqueta de Distancia sobre el Rayo Directo */}
              <g transform={`translate(${(srcPoint.x + recPoint.x) / 2}, ${(srcPoint.y + recPoint.y) / 2 - 12})`}>
                <rect x="-30" y="-12" width="60" height="20" rx="6" fill="#ffffff" stroke="#ff9500" strokeWidth="1.2" />
                <text x="0" y="2" fill="#ff9500" fontSize="10" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" className="font-mono">
                  r = {r.toFixed(1)}m
                </text>
              </g>
            </>
          )}

          {/* 3. HALO DE DISTANCIA CRÍTICA (Dc) EN 3D */}
          <ellipse
            cx={srcPoint.x}
            cy={srcPoint.y}
            rx={dcRadius}
            ry={dcRadius * Math.max(0.4, cosX)}
            fill="#34c759"
            fillOpacity="0.08"
            stroke="#34c759"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={srcPoint.x + dcRadius + 6}
            y={srcPoint.y - 6}
            fill="#34c759"
            fontSize="11"
            fontWeight="bold"
            className="font-mono select-none"
          >
            Dc = {Dc.toFixed(2)}m
          </text>

          {/* 4. MARCADOR DE FUENTE SONORA (S) */}
          <g transform={`translate(${srcPoint.x}, ${srcPoint.y})`}>
            {/* Ondas esféricas animadas */}
            <circle cx="0" cy="0" r="16" fill="none" stroke="#ff9500" strokeWidth="1.5" opacity="0.3" className="animate-ping" />
            <circle cx="0" cy="0" r="9" fill="#ff9500" stroke="#ffffff" strokeWidth="2.5" />
            <text x="0" y="3.5" fill="#ffffff" fontSize="9" fontWeight="black" textAnchor="middle" alignmentBaseline="middle">
              S
            </text>
          </g>
          <text
            x={srcPoint.x}
            y={srcPoint.y + 22}
            fill="#1d1d1f"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            className="font-mono select-none"
          >
            Fuente (Q={Q})
          </text>

          {/* 5. MARCADOR DE RECEPTOR ACÚSTICO (R) */}
          <g transform={`translate(${recPoint.x}, ${recPoint.y})`}>
            <circle cx="0" cy="0" r="9" fill="#0071e3" stroke="#ffffff" strokeWidth="2.5" />
            <text x="0" y="3.5" fill="#ffffff" fontSize="9" fontWeight="black" textAnchor="middle" alignmentBaseline="middle">
              R
            </text>
          </g>
          <text
            x={recPoint.x}
            y={recPoint.y + 22}
            fill="#0071e3"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            className="font-mono select-none"
          >
            Receptor {r < Dc ? '(Directo)' : '(Reverberado)'}
          </text>

          {/* 6. RENDERIZADO DE CARAS FRONTALES (Painter's Algorithm) */}
          {faces.slice(3).map((face) => (
            <polygon
              key={face.id}
              points={face.points}
              fill={face.fill}
              stroke={face.stroke}
              strokeWidth="1.4"
            />
          ))}

          {/* 7. COTAS Y DIMENSIONES DINÁMICAS (Largo, Ancho, Alto) */}
          <g className="font-mono text-xs select-none" fill="#86868b">
            {/* Cota Largo (L) */}
            <text
              x={(vertices.v000.x + vertices.vL00.x) / 2}
              y={(vertices.v000.y + vertices.vL00.y) / 2 + 18}
              textAnchor="middle"
              fontWeight="bold"
            >
              L = {L}m
            </text>

            {/* Cota Ancho (W) */}
            <text
              x={(vertices.v000.x + vertices.v0W0.x) / 2 - 20}
              y={(vertices.v000.y + vertices.v0W0.y) / 2 + 14}
              textAnchor="middle"
              fontWeight="bold"
            >
              W = {W}m
            </text>

            {/* Cota Alto (H) */}
            <text
              x={vertices.v000.x - 26}
              y={(vertices.v000.y + vertices.v00H.y) / 2}
              textAnchor="middle"
              fontWeight="bold"
            >
              H = {H}m
            </text>
          </g>
        </svg>

        {/* Guía Flotante de Controles */}
        <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-black/[0.06] text-[11px] text-[#86868b] flex items-center gap-2 shadow-2xs">
          <Move className="w-3.5 h-3.5 text-[#0071e3]" />
          <span>Arrastra para rotar • Rueda para Zoom ({Math.round(zoom * 100)}%)</span>
        </div>

        {/* Leyenda Minimalista Flotante */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-black/[0.06] text-[11px] flex items-center gap-4 text-[#1d1d1f] shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500]"></span>
            <span>Fuente (S)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]"></span>
            <span>Receptor (R)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#34c759]"></span>
            <span>Halo Dc ({Dc.toFixed(2)}m)</span>
          </div>
        </div>

      </div>

      {/* Controles Interactivos Directos de Fuente & Receptor (Sincronización 3D en tiempo real) */}
      {onChangeSourceReceiver && (
        <div className="mt-4 p-4 bg-[#f5f5f7] rounded-2xl border border-black/[0.06] flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xs">
          
          {/* Directividad Q */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-bold text-[#1d1d1f] whitespace-nowrap">Directividad Q:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-black/[0.06] w-full lg:w-auto">
              {[1, 2, 4, 8].map((qVal) => (
                <button
                  key={qVal}
                  onClick={() => onChangeSourceReceiver({ ...sourceReceiver, directivity: qVal })}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition ${
                    Q === qVal
                      ? 'bg-[#ff9500] text-white shadow-xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                  title={`Q = ${qVal}`}
                >
                  Q={qVal}
                </button>
              ))}
            </div>
          </div>

          {/* Slider Distancia r */}
          <div className="flex items-center gap-3 w-full lg:w-auto flex-1 max-w-sm">
            <span className="text-xs font-bold text-[#1d1d1f] whitespace-nowrap">Distancia r:</span>
            <input
              type="range"
              min="0.2"
              max={Math.max(15, Math.sqrt(L * L + W * W + H * H))}
              step="0.1"
              value={r}
              onChange={(e) => onChangeSourceReceiver({ ...sourceReceiver, distance: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
              className="w-full accent-[#0071e3] cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-[#0071e3] whitespace-nowrap bg-white px-2.5 py-1 rounded-lg border border-black/[0.06] shadow-2xs">
              {r.toFixed(1)} m
            </span>
          </div>

          {/* Input Potencia Lw */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-bold text-[#1d1d1f] whitespace-nowrap">Potencia Lw:</span>
            <input
              type="number"
              min="40"
              max="150"
              step="1"
              value={sourceReceiver?.lw || 90}
              onChange={(e) => onChangeSourceReceiver({ ...sourceReceiver, lw: parseFloat(e.target.value) || 90 })}
              className="w-16 bg-white text-xs font-mono font-bold text-[#1d1d1f] px-2 py-1 rounded-lg border border-black/[0.08] text-center focus:outline-none focus:border-[#ff9500] shadow-2xs"
            />
            <span className="text-xs font-mono text-[#86868b]">dB</span>
          </div>

        </div>
      )}

    </div>
  );
}
