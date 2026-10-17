import React, { useState } from 'react';
import {
  Waves,
  TableProperties,
  BarChart3,
  ShieldCheck,
  Eye,
  Activity,
  Ruler,
  AlertTriangle,
  Sliders,
  Thermometer,
  Sparkles,
  MapPin,
  GitCompare,
  Copy,
  Check,
  Box,
} from 'lucide-react';
import ModesTable from './ModesTable';
import ModesHistogram from './ModesHistogram';
import ModalDensityChart from './ModalDensityChart';
import BonelloAnalysis from './BonelloAnalysis';
import TimeDomainResponse from './TimeDomainResponse';
import PressureFieldViewer from './PressureFieldViewer';
import BoltProportions from './BoltProportions';
import MeasurementPanel from './MeasurementPanel';
import ModesComparison from './ModesComparison';
import ActiveRoom3DPreview from '../ActiveRoom3DPreview';
import ModeStandingWaveCard from './ModeStandingWaveCard';
import { speedOfSoundFromTemperature } from '../../utils/modalCalculations';

export default function ModesModule({
  dimensions = { Lx: 10, Ly: 6, Lz: 3, isRectangular: true },
  geometry = {},
  roomPolygon = null,
  modes = [],
  schroederData = { fsApprox: 385, fsExact: 403, T60: 1.0 },
  bonelloResult = { complies: false },
  modalSettings = {
    c: 343,
    tempC: 20,
    nMax: 5,
    fMax: 400,
    t60Source: 'sabine',
    t60Override: 1.0,
    tolerance: 0.5,
  },
  onUpdateModalSettings = () => {},
  measurementData = null,
  onUpdateMeasurementData = () => {},
  comparisonData = null,
  onUpdateComparisonData = () => {},
  sourceReceiver = null,
  onChangeSourceReceiver = () => {},
  onApplyProportions = () => {},
  onNavigateToGeometry = () => {},
}) {
  const [activeTab, setActiveTab] = useState('table');
  const [selectedMode, setSelectedMode] = useState(null);
  const [tempInput, setTempInput] = useState(modalSettings.tempC ?? 20);
  const [copiedRew, setCopiedRew] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const {
    c = 343,
    nMax = 5,
    fMax = 400,
    t60Source = 'sabine',
    t60Override = 1.0,
    tolerance = 0.5,
  } = modalSettings;

  const schroederFreq = schroederData?.fsApprox || 385;

  const handleTempChange = (val) => {
    const t = parseFloat(val);
    setTempInput(val);
    if (!isNaN(t)) {
      const newC = speedOfSoundFromTemperature(t);
      onUpdateModalSettings({ ...modalSettings, tempC: t, c: newC });
    }
  };

  const handleCopyRewDimensions = () => {
    const text = `Lx=${dimensions.Lx}m, Ly=${dimensions.Ly}m, Lz=${dimensions.Lz}m`;
    navigator.clipboard.writeText(text);
    setCopiedRew(true);
    setTimeout(() => setCopiedRew(false), 2500);
  };

  const handleCopySingleVal = (label, val) => {
    navigator.clipboard.writeText(String(val));
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Las 8 sub-pestañas completas del Módulo 6
  const tabs = [
    { id: 'table', label: '1. Modos de Vibración (x,y,z)', shortLabel: '1. Modos (x,y,z)', icon: TableProperties },
    { id: 'histogram', label: '2. Repeticiones vs Frecuencia', shortLabel: '2. Histograma 1/3 Oct', icon: BarChart3 },
    { id: 'bonello', label: '3. Criterio de Bonello', shortLabel: '3. Bonello', icon: ShieldCheck, badge: bonelloResult.complies ? 'CUMPLE' : 'FALLA' },
    { id: 'time', label: '4. Presión Libre en el Tiempo p(t)', shortLabel: '4. Tiempo p(t)', icon: Activity },
    { id: 'pressure', label: '5. Distribución Espacial (2D y 3D)', shortLabel: '5. Espacial 2D/3D', icon: Eye },
    { id: 'bolt', label: '6. Proporciones de Bolt', shortLabel: '6. Bolt (Zona A)', icon: Ruler },
    { id: 'measurement', label: '7. Medición In Situ (ISO / Cuadrícula)', shortLabel: '7. In Situ (ISO)', icon: MapPin },
    { id: 'comparison', label: '8. Comparativa (Teórico / Exp / REW / FEM)', shortLabel: '8. Comparativa', icon: GitCompare },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. Mini-Visor 3D Persistente con Sincronización a la Sala del Módulo 1 */}
      <ActiveRoom3DPreview
        roomPolygon={roomPolygon}
        geometry={geometry}
        dimensions={dimensions}
        rt60={schroederData?.T60 || 1.0}
        sourceReceiver={sourceReceiver}
        measurementData={measurementData}
        probePoint={{ x: Math.max(0.4, Number((dimensions.Lx * 0.15).toFixed(2))), y: Math.max(0.4, Number((dimensions.Ly * 0.15).toFixed(2))), z: 1.5 }}
        activeSection="modes"
        onNavigateToGeometry={onNavigateToGeometry}
      />

      {/* PANEL DESTACADO: GEOMETRÍA MODAL DE REFERENCIA (PARA TEORÍA Y REW ROOM SIM) */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 shadow-apple-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-300">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-[#1d1d1f] dark:text-white">
                  Geometría Modal de Referencia para REW Room Sim y Cálculo Teórico
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5833c7]/10 text-[#5833c7] dark:bg-[#5833c7]/20 dark:text-purple-300 uppercase tracking-wide">
                  {dimensions.dimensionMode === 'inscribed' ? 'Zona Medida' : dimensions.dimensionMode === 'bounding' ? 'Bounding Box' : 'Volumen Equivalente'}
                </span>
              </div>
              <p className="text-xs text-[#86868b] mt-0.5">
                La ecuación analítica de modos propios requiere 3 dimensiones ortogonales (<code className="font-mono font-bold text-[#5833c7]">Lx, Ly, Lz</code>). Introduce exactamente estos 3 números en la herramienta <strong>Room Sim</strong> de REW.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyRewDimensions}
            className="self-start lg:self-center inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#5833c7] hover:bg-[#4324a3] text-white text-xs font-bold shadow-apple-sm transition active:scale-95 shrink-0"
            title="Copiar dimensiones formateadas para REW Room Sim"
          >
            {copiedRew ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedRew ? '¡Copiado para REW Room Sim!' : 'Copiar (Lx, Ly, Lz) para REW'}</span>
          </button>
        </div>

        {/* Selector de Criterios Físicos */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#1d1d1f] dark:text-slate-200">
            Criterio Dimensional para la Sala {!dimensions.isRectangular ? `Irregular (${geometry?.floorArea ? geometry.floorArea.toFixed(1) + ' m²' : ''}, V = ${(geometry?.volume || 153.8).toFixed(1)} m³)` : 'Rectangular'}:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {/* Opción a: Rectángulo Inscripto / Zona Medida */}
            <button
              type="button"
              onClick={() => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'inscribed' })}
              className={`p-3 rounded-2xl text-left border transition-all ${
                dimensions.dimensionMode === 'inscribed'
                  ? 'bg-[#5833c7]/10 border-[#5833c7] text-[#1d1d1f] dark:text-white shadow-xs'
                  : 'bg-[#fbfbfd] dark:bg-[#18192a] border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#5833c7] dark:text-purple-300">
                  a) Rectángulo Inscripto / Zona Medida
                </span>
                {dimensions.dimensionMode === 'inscribed' && <span className="w-2 h-2 rounded-full bg-[#5833c7]"></span>}
              </div>
              <p className="text-[11px] text-[#86868b] leading-tight mb-2">
                Área central rectangular transitable donde se colocaron los receptores reales in situ.
              </p>
              <div className="text-xs font-mono font-bold text-[#1d1d1f] dark:text-white">
                {dimensions.inscribedBox?.Lx || 6.21}m × {dimensions.inscribedBox?.Ly || 6.30}m × {dimensions.Lz}m
              </div>
            </button>

            {/* Opción b: Rectángulo de Volumen Equivalente */}
            <button
              type="button"
              onClick={() => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'equivalent' })}
              className={`p-3 rounded-2xl text-left border transition-all ${
                (dimensions.dimensionMode || 'equivalent') === 'equivalent'
                  ? 'bg-[#5833c7]/10 border-[#5833c7] text-[#1d1d1f] dark:text-white shadow-xs'
                  : 'bg-[#fbfbfd] dark:bg-[#18192a] border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#5833c7] dark:text-purple-300">
                  b) Rectángulo de Volumen Equivalente
                </span>
                {(dimensions.dimensionMode || 'equivalent') === 'equivalent' && <span className="w-2 h-2 rounded-full bg-[#5833c7]"></span>}
              </div>
              <p className="text-[11px] text-[#86868b] leading-tight mb-2">
                Conserva con exactitud matemática el volumen real del recinto (V = {(geometry.volume || 153.8).toFixed(1)} m³).
              </p>
              <div className="text-xs font-mono font-bold text-[#1d1d1f] dark:text-white">
                {dimensions.equivalentBox?.Lx || dimensions.Lx}m × {dimensions.equivalentBox?.Ly || dimensions.Ly}m × {dimensions.Lz}m
              </div>
            </button>

            {/* Opción c: Caja Envolvente Máxima */}
            <button
              type="button"
              onClick={() => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'bounding' })}
              className={`p-3 rounded-2xl text-left border transition-all ${
                dimensions.dimensionMode === 'bounding'
                  ? 'bg-[#5833c7]/10 border-[#5833c7] text-[#1d1d1f] dark:text-white shadow-xs'
                  : 'bg-[#fbfbfd] dark:bg-[#18192a] border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#5833c7] dark:text-purple-300">
                  c) Bounding Box Máximo
                </span>
                {dimensions.dimensionMode === 'bounding' && <span className="w-2 h-2 rounded-full bg-[#5833c7]"></span>}
              </div>
              <p className="text-[11px] text-[#86868b] leading-tight mb-2">
                Envolvente ortogonal exterior máxima de las paredes extremas (ΔX × ΔY).
              </p>
              <div className="text-xs font-mono font-bold text-[#1d1d1f] dark:text-white">
                {dimensions.boundingBox?.width || dimensions.Lx}m × {dimensions.boundingBox?.length || dimensions.Ly}m × {dimensions.Lz}m
              </div>
            </button>

            {/* Opción d: Personalizado / Manual */}
            <div className={`p-3 rounded-2xl border transition-all ${
              dimensions.dimensionMode === 'manual'
                ? 'bg-[#5833c7]/10 border-[#5833c7] text-[#1d1d1f] dark:text-white shadow-xs'
                : 'bg-[#fbfbfd] dark:bg-[#18192a] border-black/[0.06] dark:border-white/[0.06]'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <button
                  type="button"
                  onClick={() => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'manual', manualLx: modalSettings.manualLx || dimensions.Lx, manualLy: modalSettings.manualLy || dimensions.Ly, manualLz: modalSettings.manualLz || dimensions.Lz })}
                  className="text-xs font-black text-[#5833c7] dark:text-purple-300 hover:underline"
                >
                  d) Personalizado Manual
                </button>
                {dimensions.dimensionMode === 'manual' && <span className="w-2 h-2 rounded-full bg-[#5833c7]"></span>}
              </div>
              <p className="text-[11px] text-[#86868b] leading-tight mb-2">
                Ajuste fino de dimensiones para contrastar con REW Room Sim.
              </p>
              <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                <input
                  type="number"
                  step="0.05"
                  value={modalSettings.manualLx ?? dimensions.Lx}
                  onChange={(e) => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'manual', manualLx: parseFloat(e.target.value) || dimensions.Lx })}
                  className="w-full px-1.5 py-0.5 rounded bg-white dark:bg-[#25263a] border text-center font-bold"
                  title="Lx manual"
                />
                <input
                  type="number"
                  step="0.05"
                  value={modalSettings.manualLy ?? dimensions.Ly}
                  onChange={(e) => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'manual', manualLy: parseFloat(e.target.value) || dimensions.Ly })}
                  className="w-full px-1.5 py-0.5 rounded bg-white dark:bg-[#25263a] border text-center font-bold"
                  title="Ly manual"
                />
                <input
                  type="number"
                  step="0.05"
                  value={modalSettings.manualLz ?? dimensions.Lz}
                  onChange={(e) => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'manual', manualLz: parseFloat(e.target.value) || dimensions.Lz })}
                  className="w-full px-1.5 py-0.5 rounded bg-white dark:bg-[#25263a] border text-center font-bold"
                  title="Lz manual"
                />
              </div>
            </div>
          </div>
        </div>

        {/* TARJETAS KPI DE VALORES RESULTANTES PARA REW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
          {/* Lx */}
          <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.04] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-[#86868b]">
              <span className="font-bold">Longitud (Lx)</span>
              <button
                type="button"
                onClick={() => handleCopySingleVal('Lx', dimensions.Lx)}
                className="hover:text-[#5833c7] transition"
                title="Copiar Lx para REW"
              >
                {copiedField === 'Lx' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-xl font-black font-mono text-[#1d1d1f] dark:text-white mt-1">
              {dimensions.Lx} <span className="text-xs font-normal text-[#86868b]">m</span>
            </div>
          </div>

          {/* Ly */}
          <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.04] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-[#86868b]">
              <span className="font-bold">Anchura (Ly)</span>
              <button
                type="button"
                onClick={() => handleCopySingleVal('Ly', dimensions.Ly)}
                className="hover:text-[#5833c7] transition"
                title="Copiar Ly para REW"
              >
                {copiedField === 'Ly' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-xl font-black font-mono text-[#1d1d1f] dark:text-white mt-1">
              {dimensions.Ly} <span className="text-xs font-normal text-[#86868b]">m</span>
            </div>
          </div>

          {/* Lz */}
          <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.04] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-[#86868b]">
              <span className="font-bold">Altura (Lz)</span>
              <button
                type="button"
                onClick={() => handleCopySingleVal('Lz', dimensions.Lz)}
                className="hover:text-[#5833c7] transition"
                title="Copiar Lz para REW"
              >
                {copiedField === 'Lz' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-xl font-black font-mono text-[#1d1d1f] dark:text-white mt-1">
              {dimensions.Lz} <span className="text-xs font-normal text-[#86868b]">m</span>
            </div>
          </div>

          {/* Volumen Modal */}
          <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.04] flex flex-col justify-between">
            <div className="text-[11px] text-[#86868b] font-bold">Volumen Modal (V)</div>
            <div className="text-xl font-black font-mono text-[#0071e3] dark:text-sky-400 mt-1">
              {Number(dimensions.volume || (dimensions.Lx * dimensions.Ly * dimensions.Lz)).toFixed(1)} <span className="text-xs font-normal text-[#86868b]">m³</span>
            </div>
          </div>

          {/* Área Modal */}
          <div className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.04] flex flex-col justify-between">
            <div className="text-[11px] text-[#86868b] font-bold">Área en Planta (S)</div>
            <div className="text-xl font-black font-mono text-[#10b981] dark:text-emerald-400 mt-1">
              {Number(dimensions.Lx * dimensions.Ly).toFixed(1)} <span className="text-xs font-normal text-[#86868b]">m²</span>
            </div>
          </div>

          {/* Proporción */}
          <div className="p-3 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 border border-[#5833c7]/20 flex flex-col justify-between">
            <div className="text-[11px] text-[#5833c7] dark:text-purple-300 font-bold">Proporción 1:p:q</div>
            <div className="text-sm font-black font-mono text-[#5833c7] dark:text-purple-300 mt-1">
              1 : {(dimensions.Ly / dimensions.Lz).toFixed(2)} : {(dimensions.Lx / dimensions.Lz).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Barra Superior de Parámetros Globales del Módulo */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 shadow-apple-sm transition-colors space-y-4">
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-[#5833c7] text-white shadow-md shadow-[#5833c7]/25">
                <Waves className="w-5 h-5" />
              </span>
              <div>
                <div className="text-xs uppercase tracking-wider font-bold text-[#5833c7] dark:text-purple-400">
                  Módulo 6 &bull; Acústica Ondulatoria y Resonancias
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1d1d1f] dark:text-white">
                  Modos Propios de Vibración de la Sala
                </h2>
              </div>
            </div>

            {/* Píldora / Selector Informativo de Dimensiones Modales Equivalentes */}
            {!dimensions.isRectangular && (
              <div className="inline-flex items-center gap-2 p-2 px-3 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 border border-[#5833c7]/20 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#5833c7] shrink-0"></span>
                <span className="font-semibold text-[#5833c7] dark:text-purple-300">
                  Dimensiones Modales:
                </span>
                <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">
                  Lx = {dimensions.Lx} m, Ly = {dimensions.Ly} m, Lz = {dimensions.Lz} m (V = {(dimensions.volume || geometry.volume || 153.8).toFixed(1)} m³)
                </span>
                <select
                  value={dimensions.dimensionMode || 'equivalent'}
                  onChange={(e) => onUpdateModalSettings({ ...modalSettings, dimensionMode: e.target.value })}
                  className="ml-1 px-2 py-0.5 rounded-lg bg-white dark:bg-[#1f2038] border border-[#5833c7]/30 text-[11px] font-bold text-[#5833c7] dark:text-purple-200 cursor-pointer focus:outline-none"
                  title="Alternar método de cálculo modal"
                >
                  <option value="equivalent">Área Equivalente (Exacto V)</option>
                  <option value="bounding">Caja Envolvente (Bounding Box)</option>
                </select>
              </div>
            )}
          </div>

          {/* Parámetros en línea */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
            
            {/* Temperatura y c */}
            <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-2.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-[#86868b] font-medium mb-1">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-[#0071e3]" />
                  Temp / c:
                </span>
                <span className="font-mono font-bold text-[#1d1d1f] dark:text-white">{c} m/s</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="1"
                  value={tempInput}
                  onChange={(e) => handleTempChange(e.target.value)}
                  className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] font-mono text-center font-bold text-[#1d1d1f] dark:text-white"
                />
                <span className="text-[#86868b]">°C</span>
              </div>
            </div>

            {/* nMax */}
            <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-2.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[#86868b] font-medium mb-1">Índice Máx (n):</div>
              <select
                value={nMax}
                onChange={(e) => onUpdateModalSettings({ ...modalSettings, nMax: parseInt(e.target.value, 10) })}
                className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] font-mono font-bold text-[#1d1d1f] dark:text-white"
              >
                {[2, 3, 4, 5, 6, 7, 8, 10].map(n => (
                  <option key={n} value={n}>0 ≤ n ≤ {n}</option>
                ))}
              </select>
            </div>

            {/* fMax */}
            <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-2.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[#86868b] font-medium mb-1">Corte f_max:</div>
              <input
                type="number"
                step="25"
                value={fMax}
                onChange={(e) => onUpdateModalSettings({ ...modalSettings, fMax: parseFloat(e.target.value) || 300 })}
                className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] font-mono font-bold text-[#1d1d1f] dark:text-white"
              />
            </div>

            {/* T60 para Schroeder */}
            <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-2.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-[#86868b] font-medium mb-1">T60 (Schroeder):</div>
              <div className="flex items-center gap-1">
                <select
                  value={t60Source}
                  onChange={(e) => onUpdateModalSettings({ ...modalSettings, t60Source: e.target.value })}
                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] font-bold text-[#1d1d1f] dark:text-white text-[11px]"
                >
                  <option value="sabine">Sabine 500-1k</option>
                  <option value="eyring">Eyring</option>
                  <option value="override">Manual</option>
                </select>
                {t60Source === 'override' && (
                  <input
                    type="number"
                    step="0.1"
                    value={t60Override}
                    onChange={(e) => onUpdateModalSettings({ ...modalSettings, t60Override: parseFloat(e.target.value) || 1.0 })}
                    className="w-14 px-1 py-1 rounded-lg bg-white dark:bg-[#25263a] border border-black/[0.08] dark:border-white/[0.08] font-mono text-center font-bold text-[#0071e3]"
                  />
                )}
              </div>
            </div>

            {/* Schroeder KPI */}
            <div className="bg-[#0071e3]/10 dark:bg-[#0071e3]/20 p-2.5 rounded-2xl border border-[#0071e3]/20 flex flex-col justify-center">
              <div className="text-[10px] uppercase font-bold text-[#0071e3] dark:text-sky-400">
                Frec. Schroeder (fs)
              </div>
              <div className="text-lg font-black font-mono text-[#0071e3] dark:text-sky-400">
                {schroederFreq} <span className="text-xs font-normal">Hz</span>
              </div>
            </div>

          </div>

        </div>

        {/* NAVEGACIÓN REDISEÑADA DE 8 SUB-PESTAÑAS (GRID ADAPTABLE SIN DESBORDES NI RECORTES) */}
        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center text-center p-2.5 rounded-2xl text-xs font-bold transition-all relative ${
                    isActive
                      ? 'bg-[#5833c7] text-white shadow-md shadow-[#5833c7]/25 scale-[1.01]'
                      : 'bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-[#e8e8ed] dark:hover:bg-[#25263a]'
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="leading-tight text-[11px] font-semibold">{tab.shortLabel}</span>
                  {tab.badge && (
                    <span className={`mt-1 px-1.5 py-0.2 rounded-full text-[8px] font-black ${
                      tab.badge === 'CUMPLE'
                        ? 'bg-[#10b981] text-white'
                        : 'bg-[#ef4444] text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === 'table' && (
        <div className="space-y-6">
          {/* Visualizador Gráfico de Onda Estacionaria 1D e Isóbaras 2D (con respuesta pedagógica para salas irregulares) */}
          <ModeStandingWaveCard
            mode={selectedMode || modes[0]}
            dimensions={dimensions}
            geometry={geometry}
            roomPolygon={roomPolygon}
            c={c}
            onOpen3DView={() => setActiveTab('pressure')}
          />

          <ModesTable
            modes={modes}
            selectedMode={selectedMode}
            onSelectMode={(m) => {
              setSelectedMode(m);
            }}
            onSelectModeTime={(m) => {
              setSelectedMode(m);
              setActiveTab('time');
            }}
            schroederFreq={schroederFreq}
          />
        </div>
      )}

      {activeTab === 'histogram' && (
        <div className="space-y-6">
          <ModesHistogram
            modes={modes}
            schroederFreq={schroederFreq}
            fMax={fMax}
          />
          <ModalDensityChart
            modes={modes}
            dimensions={dimensions}
            volume={geometry.volume || (dimensions.Lx * dimensions.Ly * dimensions.Lz)}
            surface={geometry.totalSurfaceArea || (2 * (dimensions.Lx * dimensions.Ly + dimensions.Lx * dimensions.Lz + dimensions.Ly * dimensions.Lz))}
            perimeter={4 * (dimensions.Lx + dimensions.Ly + dimensions.Lz)}
            c={c}
            schroederFreq={schroederFreq}
            fMax={fMax}
          />
        </div>
      )}

      {activeTab === 'bonello' && (
        <BonelloAnalysis
          bonelloResult={bonelloResult}
          schroederFreq={schroederFreq}
          tolerance={tolerance}
          onChangeTolerance={(tol) => onUpdateModalSettings({ ...modalSettings, tolerance: tol })}
        />
      )}

      {activeTab === 'time' && (
        <TimeDomainResponse
          modes={modes}
          selectedMode={selectedMode}
          dimensions={dimensions}
          t60={schroederData?.T60 || modalSettings?.t60Override || 1.0}
        />
      )}

      {activeTab === 'pressure' && (
        <PressureFieldViewer
          modes={modes}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          dimensions={dimensions}
        />
      )}

      {activeTab === 'bolt' && (
        <BoltProportions
          dimensions={dimensions}
          volume={geometry.volume || (dimensions.Lx * dimensions.Ly * dimensions.Lz)}
          onApplyProportions={onApplyProportions}
        />
      )}

      {activeTab === 'measurement' && (
        <MeasurementPanel
          dimensions={dimensions}
          geometry={geometry}
          roomPolygon={roomPolygon}
          modes={modes}
          measurementData={measurementData}
          onUpdateMeasurementData={onUpdateMeasurementData}
        />
      )}

      {activeTab === 'comparison' && (
        <ModesComparison
          theoreticalModes={modes}
          schroederFreq={schroederFreq}
          measurementData={measurementData}
          comparisonData={comparisonData}
          onUpdateComparisonData={onUpdateComparisonData}
        />
      )}

    </div>
  );
}
