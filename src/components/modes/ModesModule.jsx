import React, { useState } from 'react';
import {
  Waves,
  TableProperties,
  BarChart3,
  ShieldCheck,
  Eye,
  MapPin,
  GitCompare,
  Ruler,
  AlertTriangle,
  Sliders,
  Thermometer,
  Sparkles,
} from 'lucide-react';
import ModesTable from './ModesTable';
import ModesHistogram from './ModesHistogram';
import ModalDensityChart from './ModalDensityChart';
import BonelloAnalysis from './BonelloAnalysis';
import PressureFieldViewer from './PressureFieldViewer';
import MeasurementPanel from './MeasurementPanel';
import ModesComparison from './ModesComparison';
import BoltProportions from './BoltProportions';
import { speedOfSoundFromTemperature } from '../../utils/modalCalculations';

export default function ModesModule({
  dimensions = { Lx: 10, Ly: 6, Lz: 3, isRectangular: true },
  geometry = {},
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
  onApplyProportions = () => {},
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

  const tabs = [
    { id: 'table', label: 'Modos y Tabla', icon: TableProperties },
    { id: 'histogram', label: 'Histograma y Densidad', icon: BarChart3 },
    { id: 'bonello', label: 'Criterio de Bonello', icon: ShieldCheck, badge: bonelloResult.complies ? 'CUMPLE' : 'FALLA' },
    { id: 'pressure', label: 'Campo de Presión 2D', icon: Eye },
    { id: 'measurement', label: 'Medición In Situ', icon: MapPin },
    { id: 'comparison', label: 'Comparativa REW / FEM', icon: GitCompare },
    { id: 'bolt', label: 'Proporciones de Bolt', icon: Ruler },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Banner de Aviso de Planta No Rectangular si aplica */}
      {!dimensions.isRectangular && (
        <div className="p-4 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-start gap-3 text-xs text-[#1d1d1f] dark:text-slate-300">
          <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#f59e0b] font-bold block mb-0.5">
              Geometría No Rectangular o con Paredes Curvas
            </strong>
            La sala actual tiene una planta arquitectónica libre. El cálculo analítico de modos propios se realiza sobre la <strong>caja delimitadora equivalente (Lx={dimensions.Lx}m, Ly={dimensions.Ly}m, Lz={dimensions.Lz}m)</strong>. Para cavidades marcadamente trapezoidales o acústicamente asimétricas, contrasta con los datos del módulo FEM.
          </div>
        </div>
      )}

      {/* Barra Superior de Parámetros Globales del Módulo */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 shadow-apple-sm transition-colors">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#5833c7] text-white shadow-md shadow-[#5833c7]/25">
              <Waves className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-[#5833c7] dark:text-purple-400">
                Módulo 6 &bull; Acústica Ondulatoria
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#1d1d1f] dark:text-white">
                Modos Propios y Resonancias de Sala
              </h2>
            </div>
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

        {/* Barra de Pestañas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#5833c7] text-white shadow-md shadow-[#5833c7]/25'
                    : 'bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-[#e8e8ed] dark:hover:bg-[#25263a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
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

      {/* Contenido de la Pestaña Activa */}
      {activeTab === 'table' && (
        <ModesTable
          modes={modes}
          selectedMode={selectedMode}
          onSelectMode={(m) => {
            setSelectedMode(m);
            setActiveTab('pressure');
          }}
          schroederFreq={schroederFreq}
        />
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

      {activeTab === 'pressure' && (
        <PressureFieldViewer
          modes={modes}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          dimensions={dimensions}
        />
      )}

      {activeTab === 'measurement' && (
        <MeasurementPanel
          dimensions={dimensions}
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
        />
      )}

      {activeTab === 'bolt' && (
        <BoltProportions
          dimensions={dimensions}
          volume={geometry.volume || (dimensions.Lx * dimensions.Ly * dimensions.Lz)}
          onApplyProportions={onApplyProportions}
        />
      )}

    </div>
  );
}
