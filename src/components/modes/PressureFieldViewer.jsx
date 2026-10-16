import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Layers,
  Eye,
  Crosshair,
  Volume2,
  Activity,
  Maximize2,
  Sparkles,
  Box,
  Compass,
  Grid3X3,
} from 'lucide-react';
import ChartExportMenu from '../common/ChartExportMenu';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { modePressureShape } from '../../utils/modalCalculations';

/**
 * Colormap Jet clásico: t en [-1, 1] -> [R, G, B]
 */
function getJetColor(val) {
  const t = Math.max(0, Math.min(1, (val + 1) / 2));
  let r = 0, g = 0, b = 0;

  if (t < 0.125) {
    b = 0.5 + 4 * t;
  } else if (t < 0.375) {
    b = 1;
    g = 4 * (t - 0.125);
  } else if (t < 0.625) {
    b = 1 - 4 * (t - 0.375);
    g = 1;
    r = 4 * (t - 0.375);
  } else if (t < 0.875) {
    g = 1 - 4 * (t - 0.625);
    r = 1;
  } else {
    r = 1 - 2 * (t - 0.875);
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

export default function PressureFieldViewer({
  modes = [],
  selectedMode = null,
  onSelectMode = () => {},
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
}) {
  const { Lx = 10, Ly = 6, Lz = 3 } = dimensions;

  // Modo actual seleccionado
  const currentMode = selectedMode || modes[0] || { id: '1-0-0', nx: 1, ny: 0, nz: 0, frequency: 50, label: 'Axial' };

  // Modo de renderizado: '2d_slice' (Corte 2D) | '3d_surface' (Superficie MATLAB) | '3d_box' (Caja FEM/COMSOL)
  const [renderView, setRenderView] = useState('2d_slice');

  // Estados de control de vista
  const [slicePlane, setSlicePlane] = useState('XY'); // 'XY' | 'XZ' | 'YZ'
  const [slicePos, setSlicePos] = useState(1.2); // Altura Z por defecto 1.2 m
  const [showNodeLines, setShowNodeLines] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slowMoFactor, setSlowMoFactor] = useState(0.0005); // Factor para cámara lenta visible
  const [superposeModes, setSuperposeModes] = useState(false);

  // Cámara 3D (para Vista B y Vista C)
  const [rotX, setRotX] = useState(32); // Pitch
  const [rotY, setRotY] = useState(45); // Yaw
  const [zoom3D, setZoom3D] = useState(1.0);
  const [showInternalSlice3D, setShowInternalSlice3D] = useState(true);

  // FIX DEL BUG DE LA SONDA:
  // No inicializar en (Lx/2, Ly/2) porque para el modo (1,0,0) cae exactamente en un nodo (ψ = 0),
  // resultando en una gráfica de p(t) plana en cero. Inicializamos en esquina próxima.
  const [probePoint, setProbePoint] = useState(() => ({
    x: Math.max(0.4, Number((Lx * 0.15).toFixed(2))),
    y: Math.max(0.4, Number((Ly * 0.15).toFixed(2))),
    z: Math.min(1.5, Number((Lz * 0.5).toFixed(2))),
  }));

  const canvas2DRef = useRef(null);
  const canvas3DRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimestampRef = useRef(null);

  // Dimensiones del plano actual para 2D
  const { dimU, dimV, uLabel, vLabel, maxSlice } = useMemo(() => {
    if (slicePlane === 'XY') {
      return { dimU: Lx, dimV: Ly, uLabel: 'X (m)', vLabel: 'Y (m)', maxSlice: Lz };
    }
    if (slicePlane === 'XZ') {
      return { dimU: Lx, dimV: Lz, uLabel: 'X (m)', vLabel: 'Z (m)', maxSlice: Ly };
    }
    return { dimU: Ly, dimV: Lz, uLabel: 'Y (m)', vLabel: 'Z (m)', maxSlice: Lx };
  }, [slicePlane, Lx, Ly, Lz]);

  // Resolución de renderizado 2D
  const resX = 180;
  const resY = Math.max(60, Math.round(resX * (dimV / dimU)));
  const spatialFieldRef = useRef(null);

  // Recalcular la matriz espacial 2D
  useEffect(() => {
    const grid = new Float32Array(resX * resY);
    const activeModes = superposeModes ? modes.slice(0, 3) : [currentMode];

    for (let iy = 0; iy < resY; iy++) {
      const v = (iy / (resY - 1)) * dimV;
      for (let ix = 0; ix < resX; ix++) {
        const u = (ix / (resX - 1)) * dimU;

        let x = 0, y = 0, z = 0;
        if (slicePlane === 'XY') {
          x = u; y = v; z = Math.min(Lz, Math.max(0, slicePos));
        } else if (slicePlane === 'XZ') {
          x = u; y = Math.min(Ly, Math.max(0, slicePos)); z = v;
        } else {
          x = Math.min(Lx, Math.max(0, slicePos)); y = u; z = v;
        }

        let totalShape = 0;
        activeModes.forEach(m => {
          totalShape += modePressureShape(x, y, z, m, Lx, Ly, Lz) * (m.weight || 1);
        });

        if (superposeModes && activeModes.length > 1) {
          totalShape /= activeModes.length;
        }

        grid[iy * resX + ix] = totalShape;
      }
    }

    spatialFieldRef.current = grid;
    if (renderView === '2d_slice') {
      render2DFrame(timeRef.current);
    }
  }, [currentMode, slicePlane, slicePos, dimU, dimV, Lx, Ly, Lz, resX, resY, superposeModes, modes, renderView]);

  // Renderizado del Corte 2D
  const render2DFrame = useCallback((tSec) => {
    const canvas = canvas2DRef.current;
    if (!canvas || !spatialFieldRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const f = currentMode.frequency || 50;
    const timeFactor = isPlaying ? Math.cos(2 * Math.PI * f * tSec) : 1.0;

    const grid = spatialFieldRef.current;
    const imgData = ctx.createImageData(resX, resY);
    const data = imgData.data;

    for (let i = 0; i < grid.length; i++) {
      const val = grid[i] * timeFactor;
      const [r, g, b] = getJetColor(val);

      const pIdx = i * 4;
      data[pIdx] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
      data[pIdx + 3] = 255;
    }

    const offCanvas = document.createElement('canvas');
    offCanvas.width = resX;
    offCanvas.height = resY;
    const offCtx = offCanvas.getContext('2d');
    offCtx.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

    // Dibujar líneas nodales (p = 0)
    if (showNodeLines) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.setLineDash([4, 4]);

      const nx = currentMode.nx || 0;
      if (nx > 0 && (slicePlane === 'XY' || slicePlane === 'XZ')) {
        for (let k = 1; k <= nx; k++) {
          const xPos = (canvas.width / nx) * (k - 0.5);
          ctx.beginPath();
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, canvas.height);
          ctx.stroke();
        }
      }

      const ny = currentMode.ny || 0;
      if (ny > 0 && slicePlane === 'XY') {
        for (let k = 1; k <= ny; k++) {
          const yPos = (canvas.height / ny) * (k - 0.5);
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(canvas.width, yPos);
          ctx.stroke();
        }
      }

      const nz = currentMode.nz || 0;
      if (nz > 0 && (slicePlane === 'XZ' || slicePlane === 'YZ')) {
        for (let k = 1; k <= nz; k++) {
          const zPos = (canvas.height / nz) * (k - 0.5);
          ctx.beginPath();
          ctx.moveTo(0, zPos);
          ctx.lineTo(canvas.width, zPos);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    // Dibujar sonda receptora
    let probeU = probePoint.x, probeV = probePoint.y;
    if (slicePlane === 'XZ') {
      probeU = probePoint.x; probeV = probePoint.z;
    } else if (slicePlane === 'YZ') {
      probeU = probePoint.y; probeV = probePoint.z;
    }

    const probeCanvasX = (probeU / dimU) * canvas.width;
    const probeCanvasY = (probeV / dimV) * canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(probeCanvasX, probeCanvasY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }, [currentMode, isPlaying, resX, resY, showNodeLines, slicePlane, dimU, dimV, probePoint]);

  // ============================================================================
  // RENDERIZADO 3D (VISTA B: Superficie MATLAB y VISTA C: Caja Volumétrica FEM)
  // ============================================================================
  const render3DFrame = useCallback((tSec) => {
    const canvas = canvas3DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const f = currentMode.frequency || 50;
    const timeFactor = isPlaying ? Math.cos(2 * Math.PI * f * tSec) : 1.0;

    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;
    const cosY = Math.cos(radY), sinY = Math.sin(radY);
    const cosX = Math.cos(radX), sinX = Math.sin(radX);

    // Centro del recinto
    const cx = Lx / 2, cy = Ly / 2, cz = Lz / 2;
    const maxDim = Math.max(Lx, Ly, Lz, 8);
    const baseScale = (Math.min(w, h) * 0.42 / maxDim) * zoom3D;

    // Función de proyección 3D a 2D Canvas
    const project = (x, y, z) => {
      const dx = x - cx;
      const dy = y - cy;
      const dz = z - cz;

      // Rotación Yaw (eje vertical Z en física acústica)
      const x1 = dx * cosY - dy * sinY;
      const y1 = dx * sinY + dy * cosY;
      const z1 = dz;

      // Rotación Pitch (inclinación)
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      const scrX = w / 2 + x2 * baseScale;
      const scrY = h / 2 - z2 * baseScale; // Invertir vertical

      return { x: scrX, y: scrY, depth: y2 };
    };

    // --------------------------------------------------------------------------
    // VISTA B: SUPERFICIE 3D ESTILO MATLAB
    // --------------------------------------------------------------------------
    if (renderView === '3d_surface') {
      const Nu = 40;
      const Nv = 28;
      const quads = [];

      for (let j = 0; j < Nv - 1; j++) {
        const v0 = (j / (Nv - 1)) * Ly;
        const v1 = ((j + 1) / (Nv - 1)) * Ly;

        for (let i = 0; i < Nu - 1; i++) {
          const u0 = (i / (Nu - 1)) * Lx;
          const u1 = ((i + 1) / (Nu - 1)) * Lx;

          const zSlice = Math.min(Lz, Math.max(0, slicePos));
          const p00 = modePressureShape(u0, v0, zSlice, currentMode, Lx, Ly, Lz) * timeFactor;
          const p10 = modePressureShape(u1, v0, zSlice, currentMode, Lx, Ly, Lz) * timeFactor;
          const p11 = modePressureShape(u1, v1, zSlice, currentMode, Lx, Ly, Lz) * timeFactor;
          const p01 = modePressureShape(u0, v1, zSlice, currentMode, Lx, Ly, Lz) * timeFactor;

          const avgP = (p00 + p10 + p11 + p01) / 4;
          const elevScale = (Lz * 0.8);

          const pt00 = project(u0, v0, cz + p00 * elevScale);
          const pt10 = project(u1, v0, cz + p10 * elevScale);
          const pt11 = project(u1, v1, cz + p11 * elevScale);
          const pt01 = project(u0, v1, cz + p01 * elevScale);

          const depth = (pt00.depth + pt10.depth + pt11.depth + pt01.depth) / 4;
          quads.push({ pts: [pt00, pt10, pt11, pt01], val: avgP, depth });
        }
      }

      // Ordenar por profundidad (Painter's Algorithm)
      quads.sort((a, b) => b.depth - a.depth);

      // Dibujar quads
      quads.forEach(q => {
        const [r, g, b] = getJetColor(q.val);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.6;

        ctx.beginPath();
        ctx.moveTo(q.pts[0].x, q.pts[0].y);
        ctx.lineTo(q.pts[1].x, q.pts[1].y);
        ctx.lineTo(q.pts[2].x, q.pts[2].y);
        ctx.lineTo(q.pts[3].x, q.pts[3].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Dibujar caja de referencia base
      ctx.strokeStyle = 'rgba(120, 120, 140, 0.4)';
      ctx.lineWidth = 1;
      const b0 = project(0, 0, cz);
      const b1 = project(Lx, 0, cz);
      const b2 = project(Lx, Ly, cz);
      const b3 = project(0, Ly, cz);

      ctx.beginPath();
      ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y); ctx.closePath();
      ctx.stroke();
    }

    // --------------------------------------------------------------------------
    // VISTA C: CAJA VOLUMÉTRICA 3D ESTILO FEM / COMSOL
    // --------------------------------------------------------------------------
    if (renderView === '3d_box') {
      const faces = [];
      const N = 16;

      // 1. Pared Piso (Z = 0)
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const x0 = (i / N) * Lx, x1 = ((i + 1) / N) * Lx;
          const y0 = (j / N) * Ly, y1 = ((j + 1) / N) * Ly;
          const val = modePressureShape((x0 + x1) / 2, (y0 + y1) / 2, 0, currentMode, Lx, Ly, Lz) * timeFactor;
          const p0 = project(x0, y0, 0), p1 = project(x1, y0, 0), p2 = project(x1, y1, 0), p3 = project(x0, y1, 0);
          faces.push({ pts: [p0, p1, p2, p3], val, depth: (p0.depth + p1.depth + p2.depth + p3.depth) / 4, type: 'boundary' });
        }
      }

      // 2. Pared Techo (Z = Lz)
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const x0 = (i / N) * Lx, x1 = ((i + 1) / N) * Lx;
          const y0 = (j / N) * Ly, y1 = ((j + 1) / N) * Ly;
          const val = modePressureShape((x0 + x1) / 2, (y0 + y1) / 2, Lz, currentMode, Lx, Ly, Lz) * timeFactor;
          const p0 = project(x0, y0, Lz), p1 = project(x1, y0, Lz), p2 = project(x1, y1, Lz), p3 = project(x0, y1, Lz);
          faces.push({ pts: [p0, p1, p2, p3], val, depth: (p0.depth + p1.depth + p2.depth + p3.depth) / 4, type: 'boundary' });
        }
      }

      // 3. Pared Lateral Oeste (X = 0)
      for (let j = 0; j < N; j++) {
        for (let k = 0; k < N; k++) {
          const y0 = (j / N) * Ly, y1 = ((j + 1) / N) * Ly;
          const z0 = (k / N) * Lz, z1 = ((k + 1) / N) * Lz;
          const val = modePressureShape(0, (y0 + y1) / 2, (z0 + z1) / 2, currentMode, Lx, Ly, Lz) * timeFactor;
          const p0 = project(0, y0, z0), p1 = project(0, y1, z0), p2 = project(0, y1, z1), p3 = project(0, y0, z1);
          faces.push({ pts: [p0, p1, p2, p3], val, depth: (p0.depth + p1.depth + p2.depth + p3.depth) / 4, type: 'boundary' });
        }
      }

      // 4. Pared Lateral Este (X = Lx)
      for (let j = 0; j < N; j++) {
        for (let k = 0; k < N; k++) {
          const y0 = (j / N) * Ly, y1 = ((j + 1) / N) * Ly;
          const z0 = (k / N) * Lz, z1 = ((k + 1) / N) * Lz;
          const val = modePressureShape(Lx, (y0 + y1) / 2, (z0 + z1) / 2, currentMode, Lx, Ly, Lz) * timeFactor;
          const p0 = project(Lx, y0, z0), p1 = project(Lx, y1, z0), p2 = project(Lx, y1, z1), p3 = project(Lx, y0, z1);
          faces.push({ pts: [p0, p1, p2, p3], val, depth: (p0.depth + p1.depth + p2.depth + p3.depth) / 4, type: 'boundary' });
        }
      }

      // 5. Plano de corte interno (si está habilitado)
      if (showInternalSlice3D) {
        const sliceZ = Math.min(Lz, Math.max(0, slicePos));
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const x0 = (i / N) * Lx, x1 = ((i + 1) / N) * Lx;
            const y0 = (j / N) * Ly, y1 = ((j + 1) / N) * Ly;
            const val = modePressureShape((x0 + x1) / 2, (y0 + y1) / 2, sliceZ, currentMode, Lx, Ly, Lz) * timeFactor;
            const p0 = project(x0, y0, sliceZ), p1 = project(x1, y0, sliceZ), p2 = project(x1, y1, sliceZ), p3 = project(x0, y1, sliceZ);
            faces.push({ pts: [p0, p1, p2, p3], val, depth: (p0.depth + p1.depth + p2.depth + p3.depth) / 4, type: 'internal' });
          }
        }
      }

      // Ordenar por profundidad
      faces.sort((a, b) => b.depth - a.depth);

      // Dibujar quads con transparencia para apreciar el volumen
      faces.forEach(f => {
        const [r, g, b] = getJetColor(f.val);
        const alpha = f.type === 'internal' ? 0.85 : 0.45;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.strokeStyle = f.type === 'internal' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.moveTo(f.pts[0].x, f.pts[0].y);
        ctx.lineTo(f.pts[1].x, f.pts[1].y);
        ctx.lineTo(f.pts[2].x, f.pts[2].y);
        ctx.lineTo(f.pts[3].x, f.pts[3].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Dibujar aristas de la caja
      const corners = [
        project(0, 0, 0), project(Lx, 0, 0), project(Lx, Ly, 0), project(0, Ly, 0),
        project(0, 0, Lz), project(Lx, 0, Lz), project(Lx, Ly, Lz), project(0, Ly, Lz),
      ];

      ctx.strokeStyle = '#5833c7';
      ctx.lineWidth = 1.8;
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      edges.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(corners[i].x, corners[i].y);
        ctx.lineTo(corners[j].x, corners[j].y);
        ctx.stroke();
      });
    }

  }, [currentMode, isPlaying, Lx, Ly, Lz, rotX, rotY, zoom3D, renderView, slicePos, showInternalSlice3D]);

  // Bucle de animación global
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (renderView === '2d_slice') render2DFrame(timeRef.current);
      else render3DFrame(timeRef.current);
      return;
    }

    const animate = (timestamp) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      timeRef.current += delta * slowMoFactor;
      if (renderView === '2d_slice') render2DFrame(timeRef.current);
      else render3DFrame(timeRef.current);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
    };
  }, [isPlaying, slowMoFactor, renderView, render2DFrame, render3DFrame]);

  // Click en el canvas 2D para mover sonda
  const handleCanvas2DClick = (e) => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const u = Number(((clickX / rect.width) * dimU).toFixed(2));
    const v = Number(((clickY / rect.height) * dimV).toFixed(2));

    if (slicePlane === 'XY') {
      setProbePoint({ x: u, y: v, z: slicePos });
    } else if (slicePlane === 'XZ') {
      setProbePoint({ x: u, y: slicePos, z: v });
    } else {
      setProbePoint({ x: slicePos, y: u, z: v });
    }
  };

  // Curva de presión p(t) en la sonda durante 2 periodos
  const probeCurve = useMemo(() => {
    const f = currentMode.frequency || 50;
    const period = 1 / f;
    const numPoints = 60;
    const curve = [];

    const shape = modePressureShape(probePoint.x, probePoint.y, probePoint.z, currentMode, Lx, Ly, Lz);

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * (2 * period);
      const p = shape * Math.cos(2 * Math.PI * f * t);
      curve.push({
        timeMs: Number((t * 1000).toFixed(2)),
        pressure: Number(p.toFixed(3)),
      });
    }

    return {
      curve,
      shape: Number(shape.toFixed(3)),
      periodMs: Number((period * 1000).toFixed(2)),
    };
  }, [probePoint, currentMode, Lx, Ly, Lz]);

  return (
    <div id="pressure-field-viewer-card" className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-6">
      
      {/* Encabezado y Selector de Modo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-400">
              <Eye className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Pestaña 5: Distribución Espacial de Presión (2D y 3D)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Visualización analítica del campo escalar ψ(x,y,z), cortes 2D, superficie 3D tipo MATLAB y volumen FEM/COMSOL.
          </p>
        </div>

        {/* Selector de Modo Activo */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-[#86868b] font-medium">Modo activo:</label>
          <select
            value={currentMode.id}
            onChange={(e) => {
              const m = modes.find(item => item.id === e.target.value);
              if (m) onSelectMode(m);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5833c7]"
          >
            {modes.slice(0, 60).map(m => (
              <option key={m.id} value={m.id}>
                ({m.nx},{m.ny},{m.nz}) &bull; {m.frequency.toFixed(1)} Hz &bull; {m.label}
              </option>
            ))}
          </select>

          <ChartExportMenu
            targetId="pressure-field-viewer-card"
            filename={`campo_presion_modo_${currentMode.id}`}
            title={`Distribución Espacial de Presión - Modo (${currentMode.nx},${currentMode.ny},${currentMode.nz})`}
            headers={['Tiempo t (ms)', 'Presión Instantánea p(t)', 'Amplitud Modal ψ(x,y,z)', 'Posición Sonda (x, y, z)', 'Frecuencia (Hz)', 'Modo']}
            rows={probeCurve.curve.map(pt => [
              pt.timeMs,
              pt.pressure,
              probeCurve.shape,
              `(${probePoint.x.toFixed(2)}, ${probePoint.y.toFixed(2)}, ${probePoint.z.toFixed(2)})`,
              Number(currentMode.frequency.toFixed(2)),
              `(${currentMode.nx},${currentMode.ny},${currentMode.nz})`
            ])}
            showLabels={false}
          />
        </div>
      </div>

      {/* SELECTOR DE VISTA (3 MODOS: 2D SLICE, 3D SURFACE MATLAB, 3D BOX FEM) */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-[#fbfbfd] dark:bg-[#18192a] p-2.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06]">
        
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRenderView('2d_slice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              renderView === '2d_slice'
                ? 'bg-[#5833c7] text-white shadow-xs'
                : 'bg-white dark:bg-[#25263a] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Vista A: Corte 2D (Planta / Alzado)</span>
          </button>

          <button
            type="button"
            onClick={() => setRenderView('3d_surface')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              renderView === '3d_surface'
                ? 'bg-[#5833c7] text-white shadow-xs'
                : 'bg-white dark:bg-[#25263a] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vista B: Superficie 3D (Estilo MATLAB)</span>
          </button>

          <button
            type="button"
            onClick={() => setRenderView('3d_box')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              renderView === '3d_box'
                ? 'bg-[#5833c7] text-white shadow-xs'
                : 'bg-white dark:bg-[#25263a] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Vista C: Prisma 3D (Estilo FEM / COMSOL)</span>
          </button>
        </div>

        {/* Botón de Animación Temporal */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isPlaying
                ? 'bg-[#ef4444] text-white shadow-xs'
                : 'bg-[#10b981] text-white shadow-xs'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pausar p(t)' : 'Animar p(t)'}</span>
          </button>
        </div>

      </div>

      {/* ÁREA DE RENDERIZADO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Visor Canvas (2 columnas) */}
        <div className="lg:col-span-2 space-y-3">
          
          {renderView === '2d_slice' ? (
            /* VISTA A: Canvas 2D */
            <div className="relative aspect-[16/10] bg-[#0c0d18] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center shadow-inner">
              <canvas
                ref={canvas2DRef}
                width={resX}
                height={resY}
                onClick={handleCanvas2DClick}
                className="w-full h-full object-contain cursor-crosshair"
              />
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-mono">
                Corte {slicePlane} en {slicePos.toFixed(2)} m &bull; Sonda ({probePoint.x}, {probePoint.y}, {probePoint.z})m
              </div>
            </div>
          ) : (
            /* VISTA B y C: Canvas 3D Interactivo */
            <div className="relative aspect-[16/10] bg-[#0c0d18] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center shadow-inner">
              <canvas
                ref={canvas3DRef}
                width={700}
                height={440}
                className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const origRotY = rotY;
                  const origRotX = rotX;
                  const onMove = (ev) => {
                    setRotY((origRotY + (ev.clientX - startX) * 0.5) % 360);
                    setRotX(Math.max(5, Math.min(85, origRotX - (ev.clientY - startY) * 0.3)));
                  };
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              />
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-mono flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[#5833c7]" />
                <span>
                  {renderView === '3d_surface'
                    ? `Superficie MATLAB 3D • Campo Sonoro (${currentMode.nx},${currentMode.ny},${currentMode.nz})`
                    : `Caja FEM 3D • Presión en Caras y Planos Internos`}
                </span>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/50 text-[#86868b] text-[10px] font-mono">
                Arrastra para orbitar 3D
              </div>
            </div>
          )}

          {/* Barra de Controles Inferior */}
          <div className="p-3.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Controles de Corte */}
            <div className="flex items-center gap-3">
              <span className="text-[#86868b] font-medium">Plano de Corte:</span>
              <div className="flex items-center gap-1">
                {['XY', 'XZ', 'YZ'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSlicePlane(p);
                      setSlicePos(p === 'XY' ? Math.min(1.2, Lz) : p === 'XZ' ? Ly / 2 : Lx / 2);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs transition-colors ${
                      slicePlane === p
                        ? 'bg-[#5833c7] text-white shadow-xs'
                        : 'bg-white dark:bg-[#25263a] text-[#86868b] border border-black/[0.06] dark:border-white/[0.06]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[#86868b]">Posición:</span>
                <input
                  type="range"
                  min="0"
                  max={maxSlice}
                  step="0.05"
                  value={slicePos}
                  onChange={(e) => setSlicePos(parseFloat(e.target.value))}
                  className="w-24 accent-[#5833c7]"
                />
                <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">{slicePos.toFixed(2)}m</span>
              </div>
            </div>

            {/* Opciones Adicionales */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[#86868b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNodeLines}
                  onChange={(e) => setShowNodeLines(e.target.checked)}
                  className="rounded text-[#5833c7] focus:ring-[#5833c7]"
                />
                <span>Líneas Nodales (p=0)</span>
              </label>

              {renderView === '3d_box' && (
                <label className="flex items-center gap-1.5 text-[#86868b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInternalSlice3D}
                    onChange={(e) => setShowInternalSlice3D(e.target.checked)}
                    className="rounded text-[#5833c7] focus:ring-[#5833c7]"
                  />
                  <span>Corte Interno</span>
                </label>
              )}
            </div>

          </div>

        </div>

        {/* Panel Lateral: Sonda y Gráfica p(t) Temporal (1 columna) */}
        <div className="space-y-4 p-5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06]">
          
          <div className="pb-2 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Sonda Receptora en Vivo</span>
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#0071e3]/15 text-[#0071e3] font-mono">
              ψ = {probeCurve.shape}
            </span>
          </div>

          {/* Coordenadas de la sonda */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
            <div className="p-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04]">
              <span className="text-[10px] text-[#86868b] block">X</span>
              <strong className="text-[#1d1d1f] dark:text-white">{probePoint.x}m</strong>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04]">
              <span className="text-[10px] text-[#86868b] block">Y</span>
              <strong className="text-[#1d1d1f] dark:text-white">{probePoint.y}m</strong>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-[#25263a] border border-black/[0.04]">
              <span className="text-[10px] text-[#86868b] block">Z</span>
              <strong className="text-[#1d1d1f] dark:text-white">{probePoint.z}m</strong>
            </div>
          </div>

          {/* Gráfico Recharts p(t) en la Sonda */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#86868b]">
              <span>Oscilación temporal p(t) en sonda:</span>
              <span className="font-mono text-[#0071e3] font-bold">T = {probeCurve.periodMs} ms</span>
            </div>

            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={probeCurve.curve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="timeMs" tick={{ fontSize: 9 }} stroke="#86868b" unit="ms" />
                  <YAxis domain={[-1, 1]} tick={{ fontSize: 9 }} stroke="#86868b" />
                  <ReferenceLine y={0} stroke="#86868b" strokeDasharray="3 3" opacity={0.6} />
                  <Line
                    type="monotone"
                    dataKey="pressure"
                    stroke="#0071e3"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Escala Colormap Jet */}
          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#86868b] block">Escala de Presión Sonora (Jet):</span>
            <div className="h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 via-green-400 to-red-600 shadow-inner"></div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#86868b]">
              <span>-1 (Antinodo -)</span>
              <span>0 (Nodo)</span>
              <span>+1 (Antinodo +)</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
