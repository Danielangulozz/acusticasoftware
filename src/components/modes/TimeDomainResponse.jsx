import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Play,
  Square,
  Volume2,
  VolumeX,
  Download,
  Info,
  Maximize2,
  Clock,
  Sparkles,
  Layers,
  MapPin,
  Sliders,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  calculateModalDamping,
  generateModeTimeResponse,
  generateSuperposedModesTimeResponse,
  modePressureShape,
} from '../../utils/modalCalculations';
import { downloadCsv } from '../../utils/csvUtils';

/**
 * ==============================================================================
 * PROGRAMA DE PRESIÓN ACÚSTICA EN EL DOMINIO DEL TIEMPO p(t)
 * ==============================================================================
 * Visualiza y simula la evolución de la presión sonora originada por las resonancias
 * de la sala formadas libremente en el dominio temporal tras cesar la excitación:
 *
 *   p_n(x, y, z, t) = P_0 * Psi_n(x,y,z) * exp(-delta * t) * cos(2*pi*f_n*t + phi)
 *
 * Incluye:
 * - Decaimiento exponencial y envolvente superior/inferior.
 * - Parámetros canónicos de amortiguamiento: delta, tau, Delta_f (-3 dB), Q, t_1/2.
 * - Influencia espacial del receptor Psi_n(x, y, z) con nodos y antinodos.
 * - Modo de superposición modal y batimiento acústico (beats).
 * - Sintetizador de audio interactivo (Web Audio API).
 * - Exportación de series temporales en formato CSV estándar en español.
 */
export default function TimeDomainResponse({
  modes = [],
  selectedMode = null,
  dimensions = { Lx: 10, Ly: 6, Lz: 3 },
  t60 = 1.0,
  receiverPos = { x: 2, y: 2, z: 1.5 },
}) {
  const Lx = Math.max(0.1, Number(dimensions.Lx) || 10);
  const Ly = Math.max(0.1, Number(dimensions.Ly) || 6);
  const Lz = Math.max(0.1, Number(dimensions.Lz) || 3);

  // Modo individual seleccionado (por defecto el primer modo o el modo seleccionado en la tabla)
  const [selectedModeId, setSelectedModeId] = useState(
    selectedMode?.id || modes[0]?.id || (modes.length > 0 ? `${modes[0].nx}-${modes[0].ny}-${modes[0].nz}` : null)
  );

  useEffect(() => {
    if (selectedMode?.id) {
      setSelectedModeId(selectedMode.id);
    }
  }, [selectedMode]);

  // Modo de superposición multicomponente
  const [isSuperposition, setIsSuperposition] = useState(false);
  const [superposedModeIds, setSuperposedModeIds] = useState(() => {
    return modes.slice(0, 2).map((m) => m.id);
  });

  // Coordenadas espaciales del oyente / receptor (x, y, z)
  const [pos, setPos] = useState({
    x: Number(receiverPos?.x ?? 0),
    y: Number(receiverPos?.y ?? 0),
    z: Number(receiverPos?.z ?? 0),
  });

  // Parámetros de la simulación temporal
  const [durationMs, setDurationMs] = useState(250); // Ventana en milisegundos
  const [initialPressure, setInitialPressure] = useState(1.0); // P0 en Pa
  const [phaseDeg, setPhaseDeg] = useState(0); // Fase phi en grados
  const [t60Override, setT60Override] = useState(t60 || 1.0);
  const [useGlobalT60, setUseGlobalT60] = useState(true);

  // Estado del motor de audio (Web Audio API)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef([]);

  // Mantener sincronizado el T60 si se usa el global
  useEffect(() => {
    if (useGlobalT60 && t60) {
      setT60Override(t60);
    }
  }, [useGlobalT60, t60]);

  // Modo actualmente activo para análisis individual
  const currentMode = useMemo(() => {
    if (!modes || modes.length === 0) return null;
    return modes.find((m) => m.id === selectedModeId) || modes[0];
  }, [modes, selectedModeId]);

  // Modos seleccionados para superposición
  const activeSuperposedModes = useMemo(() => {
    if (!modes || modes.length === 0) return [];
    return modes.filter((m) => superposedModeIds.includes(m.id));
  }, [modes, superposedModeIds]);

  const effectiveT60 = useGlobalT60 ? t60 : t60Override;

  // Cálculo de amortiguamiento físico
  const dampingMetrics = useMemo(() => {
    return calculateModalDamping(effectiveT60);
  }, [effectiveT60]);

  // Generación de la serie temporal para modo individual
  const singleTimeResponse = useMemo(() => {
    if (!currentMode) return null;
    return generateModeTimeResponse({
      mode: currentMode,
      Lx,
      Ly,
      Lz,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      T60: effectiveT60,
      durationMs,
      numPoints: 600,
      initialPressure,
      phase: (phaseDeg * Math.PI) / 180,
    });
  }, [currentMode, Lx, Ly, Lz, pos, effectiveT60, durationMs, initialPressure, phaseDeg]);

  // Generación de la serie temporal para superposición de modos
  const superposedTimeResponse = useMemo(() => {
    if (!isSuperposition || activeSuperposedModes.length === 0) return null;
    return generateSuperposedModesTimeResponse({
      modes: activeSuperposedModes,
      Lx,
      Ly,
      Lz,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      T60: effectiveT60,
      durationMs,
      numPoints: 600,
      initialPressure,
    });
  }, [isSuperposition, activeSuperposedModes, Lx, Ly, Lz, pos, effectiveT60, durationMs, initialPressure]);

  // Conjunto de datos a graficar
  const activeChartData = useMemo(() => {
    if (isSuperposition && superposedTimeResponse) {
      return superposedTimeResponse.samples;
    }
    return singleTimeResponse?.samples || [];
  }, [isSuperposition, superposedTimeResponse, singleTimeResponse]);

  // Factor de forma espacial local Psi_n(x, y, z)
  const currentPsi = useMemo(() => {
    if (!currentMode) return 1;
    return modePressureShape(pos.x, pos.y, pos.z, currentMode, Lx, Ly, Lz);
  }, [currentMode, pos, Lx, Ly, Lz]);

  // Presets rápidos de posición espacial
  const applyPositionPreset = (type) => {
    if (type === 'corner') {
      setPos({ x: 0, y: 0, z: 0 }); // Esquina: todos los cos son 1 (Antinodo absoluto)
    } else if (type === 'center') {
      setPos({
        x: Number((Lx / 2).toFixed(2)),
        y: Number((Ly / 2).toFixed(2)),
        z: Number((Lz / 2).toFixed(2)),
      });
    } else if (type === 'wallX') {
      setPos({
        x: Number(Lx.toFixed(2)),
        y: Number((Ly / 2).toFixed(2)),
        z: Number((Lz / 2).toFixed(2)),
      });
    }
  };

  // Toggle de selección en superposición
  const handleToggleSuperposedMode = (modeId) => {
    setSuperposedModeIds((prev) => {
      if (prev.includes(modeId)) {
        if (prev.length === 1) return prev; // Mantener al menos 1
        return prev.filter((id) => id !== modeId);
      } else {
        if (prev.length >= 4) return [...prev.slice(1), modeId]; // Máx 4 modos a la vez
        return [...prev, modeId];
      }
    });
  };

  // Exportar datos temporales a CSV
  const handleExportCsv = () => {
    const filename = isSuperposition
      ? `presion_temporal_superposicion_${activeSuperposedModes.length}modos.csv`
      : `presion_temporal_modo_${currentMode?.id || 'libre'}.csv`;

    const headers = [
      'Tiempo [s]',
      'Tiempo [ms]',
      'Presion Instantanea [Pa]',
      'Envolvente Superior [Pa]',
      'Envolvente Inferior [Pa]',
      'Factor Amortiguamiento exp(-delta*t)',
      'Nivel Relativo [dB]',
    ];

    const rows = [headers];
    activeChartData.forEach((s) => {
      rows.push([
        s.t.toFixed(6),
        s.tMs.toFixed(3),
        s.pressure.toFixed(4),
        s.envelopeUpper.toFixed(4),
        s.envelopeLower.toFixed(4),
        s.decayFactor.toFixed(4),
        s.levelDb ?? '',
      ]);
    });

    downloadCsv(rows, filename, ';');
  };

  // Limpiar nodos de audio al desmontar
  const stopAudio = () => {
    try {
      activeNodesRef.current.forEach((n) => {
        try {
          n.stop?.();
          n.disconnect?.();
        } catch (_) {}
      });
      activeNodesRef.current = [];
    } catch (_) {}
    setIsPlayingAudio(false);
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Reproducir oscilación amortiguada con Web Audio API
  const handlePlayAudio = () => {
    stopAudio();

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        alert('Web Audio API no está disponible en este navegador.');
        return;
      }

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const decayDuration = Math.min(5.0, Math.max(0.2, effectiveT60)); // Reproducir decaimiento según T60

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(audioVolume * 0.4, now);
      masterGain.connect(ctx.destination);

      const modesToPlay = isSuperposition ? activeSuperposedModes : [currentMode];

      modesToPlay.forEach((m) => {
        if (!m) return;
        const freq = Math.max(20, Math.min(3000, m.frequency));
        const shape = modePressureShape(pos.x, pos.y, pos.z, m, Lx, Ly, Lz);
        const spatialGain = Math.max(0.01, Math.abs(shape));

        const osc = ctx.createOscillator();
        const modeGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Envolvente de decaimiento exponencial idéntica a exp(-delta * t):
        // En t = T60, la ganancia decae 60 dB (factor 0.001)
        modeGain.gain.setValueAtTime(spatialGain, now);
        modeGain.gain.exponentialRampToValueAtTime(0.0001, now + decayDuration);

        osc.connect(modeGain);
        modeGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + decayDuration + 0.05);

        activeNodesRef.current.push(osc, modeGain);
      });

      activeNodesRef.current.push(masterGain);
      setIsPlayingAudio(true);

      setTimeout(() => {
        setIsPlayingAudio(false);
      }, decayDuration * 1000);
    } catch (err) {
      console.error('Error al sintetizar audio de modo:', err);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          ENCABEZADO Y TEORÍA CANÓNICA
          ========================================================================= */}
      <div className="bg-gradient-to-r from-purple-900/10 via-[#5833c7]/10 to-indigo-900/10 dark:from-purple-950/30 dark:via-[#5833c7]/20 dark:to-indigo-950/30 rounded-3xl border border-[#5833c7]/20 p-6 shadow-apple-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="p-3 rounded-2xl bg-[#5833c7] text-white shadow-lg shadow-[#5833c7]/30 shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-widest uppercase text-[#5833c7] dark:text-purple-300">
                  Respuesta Dinámica Libre &bull; Dominio del Tiempo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                  Oscilador Damped
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#1d1d1f] dark:text-white mt-0.5">
                Presión Acústica Libre de Resonancias p(t)
              </h3>
              <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Evolución transitoria libre de las ondas estacionarias de la sala al cesar la excitación. Cada modo propio decae a una frecuencia natural <strong className="text-[#1d1d1f] dark:text-white">f<sub>n</sub></strong> modulada por su tasa de amortiguamiento exponencial <strong className="text-[#1d1d1f] dark:text-white">&delta; = 3&middot;ln(10) / RT<sub>60</sub></strong> y por la función de forma modal espacial <strong className="text-[#1d1d1f] dark:text-white">&Psi;<sub>n</sub>(x, y, z)</strong> en la posición del receptor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#5833c7] text-xs font-bold text-[#1d1d1f] dark:text-white transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-[#5833c7]" />
              <span>Exportar Serie CSV</span>
            </button>
          </div>
        </div>

        {/* Ecuación canónica desplegada */}
        <div className="mt-4 pt-4 border-t border-[#5833c7]/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-mono bg-white/70 dark:bg-black/30 px-3.5 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-[#5833c7] dark:text-purple-300 font-bold">
            p(x, y, z, t) = P₀ &middot; &Psi;(x, y, z) &middot; e<sup>-&delta;&middot;t</sup> &middot; cos(2&pi;f t + &phi;)
          </div>
          <div className="flex items-center gap-4 text-[#86868b] dark:text-slate-400 text-[11px]">
            <span><strong>&delta;</strong> = {dampingMetrics.delta} s⁻¹</span>
            <span>&bull;</span>
            <span><strong>&tau;</strong> = {dampingMetrics.tauMs} ms</span>
            <span>&bull;</span>
            <span><strong>&Delta;f</strong> = {dampingMetrics.bandwidth} Hz</span>
            <span>&bull;</span>
            <span><strong>RT₆₀</strong> = {effectiveT60.toFixed(2)} s</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE CONTROL Y SELECTOR DE MODOS
          ========================================================================= */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 shadow-apple-sm space-y-4">
        
        {/* Fila 1: Selector de Modo / Modo de Superposición */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#86868b]">Modo de Análisis:</span>
            <div className="inline-flex p-1 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.06] dark:border-white/[0.06]">
              <button
                onClick={() => setIsSuperposition(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !isSuperposition
                    ? 'bg-[#5833c7] text-white shadow-md shadow-[#5833c7]/25'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                Modo Individual
              </button>
              <button
                onClick={() => setIsSuperposition(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSuperposition
                    ? 'bg-[#5833c7] text-white shadow-md shadow-[#5833c7]/25'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Superposición & Batimiento</span>
              </button>
            </div>
          </div>

          {/* Selector de modo individual o chips de superposición */}
          {!isSuperposition ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#86868b]">Seleccionar Resonancia:</span>
              <select
                value={selectedModeId || ''}
                onChange={(e) => setSelectedModeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono font-bold text-[#1d1d1f] dark:text-white cursor-pointer"
              >
                {modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    ({m.nx}, {m.ny}, {m.nz}) &bull; {m.frequency.toFixed(1)} Hz &bull; {m.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#86868b]">
              <Sparkles className="w-4 h-4 text-[#5833c7]" />
              <span>Selecciona hasta 4 modos simultáneos para observar interferencia:</span>
            </div>
          )}
        </div>

        {/* Chips de selección para superposición */}
        {isSuperposition && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {modes.slice(0, 15).map((m) => {
              const isSelected = superposedModeIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => handleToggleSuperposedMode(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-[#5833c7] text-white border-[#5833c7] shadow-sm'
                      : 'bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] border-black/[0.06] dark:border-white/[0.06] hover:text-[#1d1d1f] dark:hover:text-white'
                  }`}
                >
                  ({m.nx},{m.ny},{m.nz}) {m.frequency.toFixed(0)}Hz
                </button>
              );
            })}
          </div>
        )}

        {/* Fila 2: Posición del Receptor (x, y, z) y Ventana Temporal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          
          {/* Posición del oyente */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5 text-[#1d1d1f] dark:text-white">
                <MapPin className="w-3.5 h-3.5 text-[#5833c7]" />
                Posición Receptor (x, y, z):
              </span>
              <span className="font-mono text-[#5833c7] dark:text-purple-300 font-bold">
                ({pos.x}m, {pos.y}m, {pos.z}m)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#86868b]">
                  <span>X [0..{Lx}m]</span>
                  <span>{pos.x}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Lx}
                  step="0.1"
                  value={pos.x}
                  onChange={(e) => setPos({ ...pos, x: parseFloat(e.target.value) })}
                  className="w-full accent-[#5833c7]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#86868b]">
                  <span>Y [0..{Ly}m]</span>
                  <span>{pos.y}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Ly}
                  step="0.1"
                  value={pos.y}
                  onChange={(e) => setPos({ ...pos, y: parseFloat(e.target.value) })}
                  className="w-full accent-[#5833c7]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#86868b]">
                  <span>Z [0..{Lz}m]</span>
                  <span>{pos.z}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Lz}
                  step="0.1"
                  value={pos.z}
                  onChange={(e) => setPos({ ...pos, z: parseFloat(e.target.value) })}
                  className="w-full accent-[#5833c7]"
                />
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#86868b]">Presets:</span>
              <button
                onClick={() => applyPositionPreset('corner')}
                className="px-2 py-0.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] hover:bg-[#5833c7]/10 hover:text-[#5833c7] text-[10px] font-bold text-[#86868b] transition-all"
              >
                Esquina (Antinodo Máx)
              </button>
              <button
                onClick={() => applyPositionPreset('center')}
                className="px-2 py-0.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] hover:bg-[#5833c7]/10 hover:text-[#5833c7] text-[10px] font-bold text-[#86868b] transition-all"
              >
                Centro de Sala
              </button>
              <button
                onClick={() => applyPositionPreset('wallX')}
                className="px-2 py-0.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] hover:bg-[#5833c7]/10 hover:text-[#5833c7] text-[10px] font-bold text-[#86868b] transition-all"
              >
                Pared Frontal
              </button>
            </div>
          </div>

          {/* Ventana de visualización temporal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5 text-[#1d1d1f] dark:text-white">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
                Ventana de Tiempo:
              </span>
              <span className="font-mono text-[#0071e3] font-bold">{durationMs} ms</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {[50, 100, 250, 500, 1000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setDurationMs(ms)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold transition-all border ${
                    durationMs === ms
                      ? 'bg-[#0071e3] text-white border-[#0071e3]'
                      : 'bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] border-black/[0.05] dark:border-white/[0.05] hover:text-[#1d1d1f] dark:hover:text-white'
                  }`}
                >
                  {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="20"
              max="1500"
              step="10"
              value={durationMs}
              onChange={(e) => setDurationMs(parseInt(e.target.value, 10))}
              className="w-full accent-[#0071e3]"
            />
          </div>

          {/* Controles de síntesis de audio */}
          <div className="space-y-2 bg-[#fbfbfd] dark:bg-[#18192a] p-3 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#10b981]" />
                Escucha Acústica
              </span>
              <span className="text-[10px] font-mono text-[#86868b]">Web Audio API</span>
            </div>

            <div className="flex items-center gap-2">
              {!isPlayingAudio ? (
                <button
                  onClick={handlePlayAudio}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold transition-all shadow-md shadow-[#10b981]/25 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Reproducir Resonancia</span>
                </button>
              ) : (
                <button
                  onClick={stopAudio}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold transition-all shadow-md shadow-[#ef4444]/25 active:scale-95 animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Detener</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#86868b]">
              <span>Volumen:</span>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                className="w-20 accent-[#10b981]"
              />
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          TARJETAS KPI DE FÍSICA Y AMORTIGUAMIENTO
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Frecuencia Modal */}
        <div className="bg-white dark:bg-[#121322] p-4 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
            Frecuencia Modal
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#5833c7] dark:text-purple-400">
            {isSuperposition ? 'Múltiple' : `${currentMode?.frequency?.toFixed(1) || 0}`}
            {!isSuperposition && <span className="text-xs font-normal text-[#86868b] ml-0.5">Hz</span>}
          </div>
          <div className="text-[10px] text-[#86868b] mt-1">
            {isSuperposition
              ? `${activeSuperposedModes.length} modos superpuestos`
              : `Periodo T = ${singleTimeResponse?.periodMs || 0} ms`}
          </div>
        </div>

        {/* Tasa de Amortiguamiento delta */}
        <div className="bg-white dark:bg-[#121322] p-4 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
            Amortiguamiento (&delta;)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#10b981]">
            {dampingMetrics.delta}
            <span className="text-xs font-normal text-[#86868b] ml-0.5">s⁻¹</span>
          </div>
          <div className="text-[10px] text-[#86868b] mt-1 font-mono">
            &delta; = 3&middot;ln(10) / RT₆₀
          </div>
        </div>

        {/* Constante de Relajación tau */}
        <div className="bg-white dark:bg-[#121322] p-4 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
            Constante Relajación (&tau;)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#0071e3]">
            {dampingMetrics.tauMs}
            <span className="text-xs font-normal text-[#86868b] ml-0.5">ms</span>
          </div>
          <div className="text-[10px] text-[#86868b] mt-1">
            Caída a 1/e (36.8% amp.)
          </div>
        </div>

        {/* Ancho de Banda modal Delta_f */}
        <div className="bg-white dark:bg-[#121322] p-4 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
            Ancho de Banda (&Delta;f)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#f59e0b]">
            {dampingMetrics.bandwidth}
            <span className="text-xs font-normal text-[#86868b] ml-0.5">Hz</span>
          </div>
          <div className="text-[10px] text-[#86868b] mt-1 font-mono">
            &Delta;f₋₃dB ≈ 2.2 / RT₆₀
          </div>
        </div>

        {/* Factor de Forma Espacial Psi */}
        <div className="bg-white dark:bg-[#121322] p-4 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
            Forma Espacial (&Psi;)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#1d1d1f] dark:text-white">
            {isSuperposition ? 'Variante' : currentPsi.toFixed(3)}
          </div>
          <div className="text-[10px] text-[#86868b] mt-1">
            {Math.abs(currentPsi) > 0.8
              ? 'Antinodo (Máximo)'
              : Math.abs(currentPsi) < 0.2
              ? 'Cerca a Nodo (Mínimo)'
              : 'Zona Intermedia'}
          </div>
        </div>

        {/* Factor de Calidad Q o Batimiento */}
        <div className="bg-white dark:bg-[#121322] p-4 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] mb-1">
            {isSuperposition && superposedTimeResponse?.beatFreq ? 'Batimiento (Beats)' : 'Factor Calidad (Q)'}
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#ec4899]">
            {isSuperposition && superposedTimeResponse?.beatFreq
              ? `${superposedTimeResponse.beatFreq} Hz`
              : singleTimeResponse?.qualityFactor || 0}
          </div>
          <div className="text-[10px] text-[#86868b] mt-1">
            {isSuperposition && superposedTimeResponse?.beatPeriodMs
              ? `Periodo batimiento: ${superposedTimeResponse.beatPeriodMs} ms`
              : `Agudeza de resonancia modal`}
          </div>
        </div>

      </div>

      {/* =========================================================================
          GRÁFICA DE ALTA RESOLUCIÓN: PRESIÓN p(t) Y ENVOLVENTES EXPONENCIALES
          ========================================================================= */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h4 className="text-base sm:text-lg font-black text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <span>Oscilación Libre y Envolvente de Decaimiento</span>
              {!isSuperposition && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: currentMode?.color || '#5833c7' }}
                >
                  Modo ({currentMode?.nx},{currentMode?.ny},{currentMode?.nz}) &bull; {currentMode?.detail}
                </span>
              )}
            </h4>
            <p className="text-xs text-[#86868b] mt-0.5">
              Trazo de la presión instantánea en azul/púrpura acotado por las envolventes exponenciales superior e inferior (&plusmn;P<sub>local</sub>&middot;e<sup>-&delta;&middot;t</sup>) en esmeralda.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#8b5cf6]">
              <span className="w-3 h-1 bg-[#8b5cf6] rounded-full inline-block" />
              <span>p(t) Instantánea</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[#10b981]">
              <span className="w-3 h-1 bg-[#10b981] rounded-full inline-block border-t border-dashed" />
              <span>Envolvente &plusmn;e<sup>-&delta;t</sup></span>
            </div>
          </div>
        </div>

        {/* Contenedor Recharts */}
        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activeChartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-black/[0.05] dark:text-white/[0.05]"
              />

              <XAxis
                dataKey="tMs"
                stroke="#86868b"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `${val} ms`}
              />

              <YAxis
                stroke="#86868b"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `${val.toFixed(2)} Pa`}
                domain={['auto', 'auto']}
              />

              <ReferenceLine y={0} stroke="#86868b" strokeDasharray="2 2" opacity={0.6} />

              <Tooltip content={<CustomTimeTooltip />} />

              {/* Envolvente superior */}
              <Line
                type="monotone"
                dataKey="envelopeUpper"
                name="Envolvente Superior"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />

              {/* Envolvente inferior */}
              <Line
                type="monotone"
                dataKey="envelopeLower"
                name="Envolvente Inferior"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />

              {/* Curva central de presión sonora p(t) */}
              <Line
                type="monotone"
                dataKey="pressure"
                name="Presión Sonora p(t)"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie de gráfica con notas explicativas */}
        <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#86868b]">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#5833c7] shrink-0" />
            <span>
              La presión decae <strong>60 dB</strong> en exactamente <strong>{effectiveT60.toFixed(2)} segundos</strong>. En t = {dampingMetrics.tauMs} ms, la amplitud cae a 1/e (&asymp; 36.8%).
            </span>
          </div>
          <div className="font-mono text-[11px] text-[#5833c7] dark:text-purple-300">
            {singleTimeResponse?.cyclesInWindow} ciclos en esta ventana de {durationMs} ms
          </div>
        </div>

      </div>

      {/* =========================================================================
          PANEL EXPLICATIVO ACADÉMICO: FÍSICA DE ONDAS Y RESONANCIAS LIBRES
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Tarjeta 1: Función de Onda Espacio-Temporal */}
        <div className="bg-white dark:bg-[#121322] p-5 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm space-y-3">
          <h5 className="font-bold text-sm text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span>Significado Físico de &Psi;(x, y, z)</span>
          </h5>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
            La autofunción espacial <strong className="text-[#1d1d1f] dark:text-white">&Psi;<sub>n</sub>(x, y, z) = cos(n<sub>x</sub>&pi;x / L<sub>x</sub>) &middot; cos(n<sub>y</sub>&pi;y / L<sub>y</sub>) &middot; cos(n<sub>z</sub>&pi;z / L<sub>z</sub>)</strong> determina si el oyente se encuentra en un <span className="text-[#10b981] font-bold">antinodo</span> (|&Psi;| = 1, presión máxima) o en un <span className="text-[#ef4444] font-bold">nodo</span> (&Psi; = 0, silencio / cancelación modal).
          </p>
          <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] text-xs font-mono space-y-1">
            <div className="text-[#5833c7] dark:text-purple-300 font-bold">En tu posición actual:</div>
            <div>&bull; &Psi;(x={pos.x}, y={pos.y}, z={pos.z}) = <strong>{currentPsi.toFixed(4)}</strong></div>
            <div>&bull; Pico local inicial = <strong>{(initialPressure * currentPsi).toFixed(4)} Pa</strong></div>
          </div>
        </div>

        {/* Tarjeta 2: Relación entre T60 y Ancho de Banda */}
        <div className="bg-white dark:bg-[#121322] p-5 rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm space-y-3">
          <h5 className="font-bold text-sm text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0071e3]" />
            <span>Dualidad Tiempo-Frecuencia (Fourier)</span>
          </h5>
          <p className="text-xs text-[#86868b] dark:text-slate-400 leading-relaxed">
            Por el principio de incertidumbre de la transformada de Fourier, un decaimiento temporal lento (sala muy viva, RT₆₀ alto) se traduce en resonancias muy estrechas y agudas en frecuencia (<strong className="text-[#1d1d1f] dark:text-white">&Delta;f &approx; 2.2 / RT₆₀</strong>). Cuanto más absorbente la sala (RT₆₀ bajo), mayor amortiguamiento y modos más anchos que se solapan fácilmente.
          </p>
          <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] text-xs font-mono space-y-1">
            <div>&bull; Factor Q = &pi;&middot;f / &delta; = <strong>{singleTimeResponse?.qualityFactor || 0}</strong></div>
            <div>&bull; Semivida modal t<sub>1/2</sub> = <strong>{dampingMetrics.halfLifeMs} ms</strong></div>
          </div>
        </div>

      </div>

    </div>
  );
}

/**
 * Tooltip personalizado de Recharts para visualización en el dominio del tiempo
 */
function CustomTimeTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  return (
    <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-3.5 rounded-2xl border border-black/[0.1] dark:border-white/[0.1] shadow-xl text-xs space-y-2">
      <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-1.5">
        <span className="font-bold text-[#86868b]">Tiempo (t):</span>
        <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">
          {dataPoint.tMs} ms <span className="text-[10px] text-[#86868b]">({dataPoint.t} s)</span>
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#8b5cf6] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
            Presión p(t):
          </span>
          <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">
            {dataPoint.pressure} Pa
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#10b981] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            Envolvente:
          </span>
          <span className="font-mono font-bold text-[#10b981]">
            &plusmn;{dataPoint.envelopeUpper} Pa
          </span>
        </div>

        {dataPoint.levelDb !== undefined && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-[#86868b]">Atenuación:</span>
            <span className="font-mono font-bold text-[#f59e0b]">
              {dataPoint.levelDb.toFixed(1)} dB
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
