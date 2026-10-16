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

      {/* Banner de Aviso de Planta No Rectangular si aplica */}
      {!dimensions.isRectangular && (
        <div className="p-4 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-start gap-3 text-xs text-[#1d1d1f] dark:text-slate-300">
          <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <strong className="text-[#f59e0b] font-bold block mb-0.5">
                Geometría No Rectangular o con Paredes Curvas
              </strong>
              La sala actual tiene una planta arquitectónica libre ({dimensions.floorArea ? `${dimensions.floorArea.toFixed(1)} m²` : ''}, V = {(dimensions.volume || geometry.volume || 153.8).toFixed(1)} m³). El cálculo analítico de modos propios se realiza mediante:
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[#86868b]">Modelo dimensional:</span>
              <button
                type="button"
                onClick={() => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'equivalent' })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  (dimensions.dimensionMode || 'equivalent') === 'equivalent'
                    ? 'bg-[#5833c7] text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                Área Equivalente (Exacto V) &bull; {dimensions.equivalentBox?.Lx || dimensions.Lx}m × {dimensions.equivalentBox?.Ly || dimensions.Ly}m
              </button>
              <button
                type="button"
                onClick={() => onUpdateModalSettings({ ...modalSettings, dimensionMode: 'bounding' })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  dimensions.dimensionMode === 'bounding'
                    ? 'bg-[#5833c7] text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                Caja Envolvente Máxima (Bounding Box) &bull; {dimensions.boundingBox?.width || dimensions.Lx}m × {dimensions.boundingBox?.length || dimensions.Ly}m
              </button>
            </div>
          </div>
        </div>
      )}

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
