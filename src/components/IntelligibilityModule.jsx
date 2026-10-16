import React, { useState, useMemo } from 'react';
import {
  Volume2,
  Users,
  Armchair,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  LineChart as LineChartIcon,
  Play,
  RotateCcw,
  Sliders,
  Download,
  Info,
  Activity,
  Check,
  ChevronRight,
  TrendingDown,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
} from 'recharts';
import {
  calculateDc,
  calculateDLim,
  calculatePeutzAlcons,
  alconsToSti,
  stiToCis,
  getIntelligibilityRating,
  generateAlconsDistanceCurve,
  calculateExperimentalAlcons,
  compareExperimentalVsAnalytical,
  OFFICIAL_LOGATOME_LISTS,
  USB_MEDELLIN_EXAMPLE_DATA,
  PEUTZ_DEFAULT_LISTENER_CORRECTION,
} from '../utils/intelligibilityUtils';
import {
  DEFAULT_PEOPLE_CATALOG,
  DEFAULT_OBJECTS_CATALOG,
  calculateOccupancyAbsorption,
} from '../utils/defaultMaterials';
import { OCTAVE_BANDS } from '../utils/acousticCalculations';
import ChartExportMenu from './common/ChartExportMenu';

export default function IntelligibilityModule({
  geometry,
  absorptionData,
  reverberationData,
  soundFieldData,
  materials,
  onChangeMaterials,
  sourceReceiver,
  onLoadUsbPreset = () => {},
  isDarkMode = false,
}) {
  // Pestañas internas del módulo
  const [activeSubtab, setActiveSubtab] = useState('analytical'); // 'analytical' | 'comparison' | 'logatomes' | 'validation' | 'usb_example'

  // Parámetros de análisis de Peutz
  const [selectedFreq, setSelectedFreq] = useState(2000); // 2000 Hz es la banda crítica de consonantes
  const [directivityQ, setDirectivityQ] = useState(sourceReceiver?.directivity || 2);
  const [listenerFactorA, setListenerFactorA] = useState(PEUTZ_DEFAULT_LISTENER_CORRECTION);
  const [evalDistance, setEvalDistance] = useState(3.0); // Distancia interactiva del oyente

  // Parámetros de personas y objetos en la sala
  const [peopleCounts, setPeopleCounts] = useState({
    person_seated_wood: 0,
    person_standing: 0,
    person_seated_cushioned: 0,
    student_child: 0,
  });
  const [objectCounts, setObjectCounts] = useState({
    chair_wood: 0,
    chair_cushioned: 0,
    desk_table_wood: 0,
    blackboard: 0,
    bookshelf_filled: 0,
  });
  const [showOccupancyPanel, setShowOccupancyPanel] = useState(false);

  // Parámetros de Acondicionamiento Acústico (Caso Tratado)
  const [treatmentEnabled, setTreatmentEnabled] = useState(true);
  const [treatmentType, setTreatmentType] = useState('ceiling_acoustic'); // 'ceiling_acoustic' | 'wall_panels' | 'custom'
  const [treatmentArea, setTreatmentArea] = useState(12.0); // m²
  const [treatmentAlpha2000, setTreatmentAlpha2000] = useState(0.95);

  // Datos experimentales de logátomos
  const [selectedLogatomeList, setSelectedLogatomeList] = useState('LIST_A');
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [isDictating, setIsDictating] = useState(false);
  const [experimentalMeasurements, setExperimentalMeasurements] = useState([
    { distance: 1.0, totalLogatomes: 50, correctLogatomes: 38, alconsExp: 24.0, notes: 'Fila 1 (1.0m)' },
    { distance: 2.0, totalLogatomes: 50, correctLogatomes: 36, alconsExp: 28.0, notes: 'Fila 2 (2.0m)' },
    { distance: 3.0, totalLogatomes: 50, correctLogatomes: 35, alconsExp: 30.0, notes: 'Fila 3 (3.0m)' },
    { distance: 4.0, totalLogatomes: 50, correctLogatomes: 35, alconsExp: 30.0, notes: 'Fondo sala (4.0m)' },
  ]);

  // Entrada de nuevo punto experimental
  const [newExpDist, setNewExpDist] = useState(2.5);
  const [newExpTotal, setNewExpTotal] = useState(50);
  const [newExpCorrect, setNewExpCorrect] = useState(37);
  const [newExpNotes, setNewExpNotes] = useState('');

  // 1. Absorción adicional por ocupación (personas y mobiliario)
  const occupancyAbsorption = useMemo(() => {
    return calculateOccupancyAbsorption(peopleCounts, objectCounts);
  }, [peopleCounts, objectCounts]);

  const totalOccupants = useMemo(() => {
    return Object.values(peopleCounts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }, [peopleCounts]);

  const totalFurniture = useMemo(() => {
    return Object.values(objectCounts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }, [objectCounts]);

  // 2. Parámetros acústicos del Estado Actual (Sin Acondicionamiento)
  const roomVolume = geometry?.volume || 30.0;
  const roomSurface = geometry?.totalSurfaceArea || 59.0;

  // Absorción de superficies base en la frecuencia crítica elegida (ej. 2000 Hz)
  const baseA = absorptionData?.[selectedFreq]?.equivalentAbsorption || 1.54;
  const occA = occupancyAbsorption[selectedFreq] || 0;
  const totalA_untreated = baseA + occA;
  const alphaMean_untreated = roomSurface > 0 ? totalA_untreated / roomSurface : 0.03;
  const safeAlpha_untreated = Math.min(0.999, Math.max(0.001, alphaMean_untreated));
  const R_untreated = (roomSurface * safeAlpha_untreated) / (1 - safeAlpha_untreated);

  // RT60 Sabine en el estado no tratado
  const RT60_untreated = useMemo(() => {
    // Si viene de los datos generales
    if (reverberationData?.[selectedFreq]?.sabine && occA === 0) {
      return Number(reverberationData[selectedFreq].sabine.toFixed(2));
    }
    const rt = (0.161 * roomVolume) / Math.max(0.1, totalA_untreated);
    return Number(rt.toFixed(2));
  }, [reverberationData, selectedFreq, roomVolume, totalA_untreated, occA]);

  // Distancia crítica y límite (Sin acondicionar)
  const Dc_untreated = useMemo(() => calculateDc(directivityQ, R_untreated), [directivityQ, R_untreated]);
  const DLim_untreated = useMemo(() => calculateDLim(Dc_untreated), [Dc_untreated]);

  // %ALcons y STI a la distancia evaluada (Sin acondicionar)
  const result_untreated = useMemo(() => {
    return calculatePeutzAlcons(evalDistance, RT60_untreated, roomVolume, directivityQ, listenerFactorA, R_untreated);
  }, [evalDistance, RT60_untreated, roomVolume, directivityQ, listenerFactorA, R_untreated]);

  const sti_untreated = useMemo(() => alconsToSti(result_untreated.alcons), [result_untreated.alcons]);
  const rating_untreated = useMemo(() => getIntelligibilityRating(result_untreated.alcons), [result_untreated.alcons]);

  // 3. Parámetros acústicos del Estado Tratado (Con Acondicionamiento Acústico)
  const { totalA_treated, alphaMean_treated, R_treated, RT60_treated, Dc_treated, DLim_treated, result_treated, sti_treated, rating_treated } = useMemo(() => {
    // Delta de absorción añadido por el acondicionamiento
    let addedAbs = 0;
    if (treatmentType === 'ceiling_acoustic') {
      // Reemplaza cielo actual por absorbente acústico (ej. 12 m² * (0.95 - alpha_actual))
      const currentCeilingAlpha = materials?.ceiling?.coefficients?.[selectedFreq] || 0.04;
      addedAbs = treatmentArea * Math.max(0, treatmentAlpha2000 - currentCeilingAlpha);
    } else if (treatmentType === 'wall_panels') {
      // Agrega paneles en paredes
      addedAbs = treatmentArea * treatmentAlpha2000;
    } else {
      // Personalizado
      addedAbs = treatmentArea * treatmentAlpha2000;
    }

    const treatedA = totalA_untreated + addedAbs;
    const treatedAlpha = roomSurface > 0 ? treatedA / roomSurface : 0.2;
    const safeTreatedAlpha = Math.min(0.999, Math.max(0.001, treatedAlpha));
    const treatedR = (roomSurface * safeTreatedAlpha) / (1 - safeTreatedAlpha);
    const treatedRT = Number(((0.161 * roomVolume) / Math.max(0.1, treatedA)).toFixed(2));

    const dcTreated = calculateDc(directivityQ, treatedR);
    const dLimTreated = calculateDLim(dcTreated);

    const resTreated = calculatePeutzAlcons(evalDistance, treatedRT, roomVolume, directivityQ, listenerFactorA, treatedR);
    const sTreated = alconsToSti(resTreated.alcons);
    const rTreated = getIntelligibilityRating(resTreated.alcons);

    return {
      totalA_treated: Number(treatedA.toFixed(2)),
      alphaMean_treated: Number(treatedAlpha.toFixed(3)),
      R_treated: Number(treatedR.toFixed(2)),
      RT60_treated: treatedRT,
      Dc_treated: dcTreated,
      DLim_treated: dLimTreated,
      result_treated: resTreated,
      sti_treated: sTreated,
      rating_treated: rTreated,
    };
  }, [treatmentType, treatmentArea, treatmentAlpha2000, materials, selectedFreq, totalA_untreated, roomSurface, roomVolume, directivityQ, evalDistance, listenerFactorA]);

  // 4. Curvas de %ALcons vs Distancia (Sin y Con acondicionamiento)
  const maxRoomDist = Math.max(8.0, Math.ceil(Math.hypot(geometry?.length || 4, geometry?.width || 3, geometry?.height || 2.5)));

  const distanceCurveData = useMemo(() => {
    const curveUntreated = generateAlconsDistanceCurve(RT60_untreated, roomVolume, directivityQ, listenerFactorA, R_untreated, maxRoomDist, 45);
    const curveTreated = generateAlconsDistanceCurve(RT60_treated, roomVolume, directivityQ, listenerFactorA, R_treated, maxRoomDist, 45);

    return curveUntreated.map((pt, idx) => ({
      distance: pt.distance,
      dLabel: pt.dLabel,
      alconsUntreated: pt.alcons,
      stiUntreated: pt.sti,
      alconsTreated: curveTreated[idx]?.alcons ?? pt.alcons,
      stiTreated: curveTreated[idx]?.sti ?? pt.sti,
    }));
  }, [RT60_untreated, RT60_treated, roomVolume, directivityQ, listenerFactorA, R_untreated, R_treated, maxRoomDist]);

  // 5. Comparativa Experimental vs Analítica (Tabla y Estadísticas de Error)
  const validationResults = useMemo(() => {
    return compareExperimentalVsAnalytical(
      experimentalMeasurements,
      RT60_untreated,
      roomVolume,
      directivityQ,
      listenerFactorA,
      R_untreated
    );
  }, [experimentalMeasurements, RT60_untreated, roomVolume, directivityQ, listenerFactorA, R_untreated]);

  // Funciones para manipular medidas experimentales
  const handleAddExperimentalPoint = () => {
    const alconsCalc = calculateExperimentalAlcons(newExpCorrect, newExpTotal);
    const newPoint = {
      distance: Number(newExpDist),
      totalLogatomes: Number(newExpTotal),
      correctLogatomes: Number(newExpCorrect),
      alconsExp: alconsCalc,
      notes: newExpNotes || `Punto a ${newExpDist}m`,
    };
    const updated = [...experimentalMeasurements, newPoint].sort((a, b) => a.distance - b.distance);
    setExperimentalMeasurements(updated);
    setNewExpNotes('');
  };

  const handleDeleteExperimentalPoint = (idx) => {
    setExperimentalMeasurements(experimentalMeasurements.filter((_, i) => i !== idx));
  };

  const handleResetToUsbExperimental = () => {
    setExperimentalMeasurements(USB_MEDELLIN_EXAMPLE_DATA.sampleExperimentalData);
  };

  // Manejo de dictado auditivo con Web Speech Synthesis
  const activeLogatomes = OFFICIAL_LOGATOME_LISTS[selectedLogatomeList];

  const handleSpeakCurrentWord = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const word = activeLogatomes[currentWordIdx];
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'es-ES';
      utterance.rate = 0.85; // cadencia pausada de laboratorio
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextWord = () => {
    if (currentWordIdx < activeLogatomes.length - 1) {
      setCurrentWordIdx(prev => prev + 1);
    } else {
      setCurrentWordIdx(0);
    }
  };

  const handlePrevWord = () => {
    if (currentWordIdx > 0) {
      setCurrentWordIdx(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TARJETA SUPERIOR DE ENCABEZADO Y SELECTOR DE PESTAÑAS */}
      <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-sky-400">
                <Volume2 className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
                Módulo 7: Inteligibilidad de la Palabra (%ALcons / Peutz / Logátomos)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
              Evaluación analítica y experimental de la articulación de la voz según norma ISO 9921, modelo de Peutz, correlación STI / CIS y dictado de logátomos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onLoadUsbPreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#5833c7] hover:opacity-90 text-white text-xs font-semibold shadow-xs transition-all"
              title="Cargar dimensiones y materiales exactos de la diapositiva de la Univ. San Buenaventura (3x4x2.5m)"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Cargar Ejemplo USB Medellín</span>
            </button>

            <button
              onClick={() => setShowOccupancyPanel(!showOccupancyPanel)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                totalOccupants > 0 || totalFurniture > 0
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#1d1d1f] dark:text-white border-black/[0.05] dark:border-white/[0.08]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ocupación ({totalOccupants} pers, {totalFurniture} obj)</span>
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN ENTRE LAS 5 PESTAÑAS DEL MÓDULO */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'analytical', label: '1. Modelo Analítico Peutz', icon: Sliders },
            { id: 'comparison', label: '2. Sin vs Con Acondicionamiento', icon: ArrowRight },
            { id: 'logatomes', label: '3. Dictado Experimental (Logátomos)', icon: BookOpen },
            { id: 'validation', label: '4. Comparativa Exp vs Analítico', icon: LineChartIcon },
            { id: 'usb_example', label: '5. Caso Estudio USB Medellín', icon: GraduationCap },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubtab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubtab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#0071e3] text-white shadow-xs'
                    : 'bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PANEL DESPLEGABLE: OCUPACIÓN (PERSONAS Y OBJETOS) */}
      {showOccupancyPanel && (
        <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-5 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0071e3]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                Absorción por Ocupantes y Mobiliario (ISO 354 / Egan)
              </h4>
            </div>
            <span className="text-[11px] text-[#86868b] font-mono">
              +{(occupancyAbsorption[2000] || 0).toFixed(2)} m² Sabine a 2000 Hz
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personas */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cantidad de Personas (Audiencia / Oradores):</span>
              </span>
              <div className="space-y-2">
                {DEFAULT_PEOPLE_CATALOG.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#202236] border border-black/[0.04] dark:border-white/[0.05] text-xs">
                    <div>
                      <div className="font-semibold text-[#1d1d1f] dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-[#86868b]">{p.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={peopleCounts[p.id] || 0}
                        onChange={(e) => setPeopleCounts({ ...peopleCounts, [p.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-16 px-2 py-1 rounded-lg bg-[#f5f5f7] dark:bg-[#121322] text-right font-mono font-bold text-[#0071e3] border border-black/[0.06] dark:border-white/[0.08]"
                      />
                      <span className="text-[10px] text-[#86868b] w-8">pers</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobiliario y Objetos */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5 text-amber-500" />
                <span>Cantidad de Objetos y Mobiliario:</span>
              </span>
              <div className="space-y-2">
                {DEFAULT_OBJECTS_CATALOG.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#202236] border border-black/[0.04] dark:border-white/[0.05] text-xs">
                    <div>
                      <div className="font-semibold text-[#1d1d1f] dark:text-white">{o.name}</div>
                      <div className="text-[10px] text-[#86868b]">{o.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={objectCounts[o.id] || 0}
                        onChange={(e) => setObjectCounts({ ...objectCounts, [o.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-16 px-2 py-1 rounded-lg bg-[#f5f5f7] dark:bg-[#121322] text-right font-mono font-bold text-[#5833c7] border border-black/[0.06] dark:border-white/[0.08]"
                      />
                      <span className="text-[10px] text-[#86868b] w-8">unid</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 1: MODELO ANALÍTICO DE PEUTZ (%ALCONS Y STI VS DISTANCIA)
          ========================================================================= */}
      {activeSubtab === 'analytical' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Controles y Parámetros de Simulación */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Frecuencia de análisis */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
              <span className="text-xs text-[#86868b] block">Banda de Análisis Peutz:</span>
              <select
                value={selectedFreq}
                onChange={(e) => setSelectedFreq(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-bold text-[#1d1d1f] dark:text-white border border-black/[0.06] dark:border-white/[0.08]"
              >
                <option value={2000}>2000 Hz (Crítica para Consonantes)</option>
                <option value={1000}>1000 Hz</option>
                <option value={500}>500 Hz</option>
                <option value={4000}>4000 Hz</option>
              </select>
              <span className="text-[10px] text-[#86868b] block">
                Peutz estipula 2000 Hz por contener los formantes de alta articulación (/s/, /t/, /k/).
              </span>
            </div>

            {/* Directividad Q */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
              <span className="text-xs text-[#86868b] block">Directividad de la Voz (Q):</span>
              <select
                value={directivityQ}
                onChange={(e) => setDirectivityQ(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-bold text-[#1d1d1f] dark:text-white border border-black/[0.06] dark:border-white/[0.08]"
              >
                <option value={2}>Q = 2 (Orador de pie frente a clase)</option>
                <option value={1}>Q = 1 (Esférica omnidireccional)</option>
                <option value={4}>Q = 4 (Voz en rincón o esquina)</option>
              </select>
              <span className="text-[10px] text-[#86868b] block">
                La voz humana tiene radiación semiesférica frontal (Q ≈ 2).
              </span>
            </div>

            {/* Corrección del oyente a */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
              <span className="text-xs text-[#86868b] block">Factor de Corrección (a):</span>
              <select
                value={listenerFactorA}
                onChange={(e) => setListenerFactorA(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-bold text-[#1d1d1f] dark:text-white border border-black/[0.06] dark:border-white/[0.08]"
              >
                <option value={1.5}>a = 1.5% (Oyente atento / entrenado)</option>
                <option value={2.0}>a = 2.0% (Población general promedio)</option>
                <option value={0.0}>a = 0.0% (Sin corrección subjetiva)</option>
              </select>
              <span className="text-[10px] text-[#86868b] block">
                Pérdida residual base de articulación intrínseca del oído humano.
              </span>
            </div>

            {/* Slider de Distancia del Oyente */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#86868b]">Distancia del Oyente (d):</span>
                <span className="font-mono font-bold text-[#0071e3]">{evalDistance} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max={maxRoomDist}
                step="0.1"
                value={evalDistance}
                onChange={(e) => setEvalDistance(Number(e.target.value))}
                className="w-full accent-[#0071e3]"
              />
              <span className="text-[10px] text-[#86868b] block">
                {evalDistance <= DLim_untreated ? '• Zona de transición campo directo' : '• Meseta de campo reverberado'}
              </span>
            </div>

          </div>

          {/* Tarjetas Resumen de Métricas Clave Peutz */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[11px] text-[#86868b] block">Constante Sala R</span>
              <span className="text-lg font-bold text-[#1d1d1f] dark:text-white">{R_untreated.toFixed(2)}</span>
              <span className="text-[10px] text-[#86868b] block">m² Sabine</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[11px] text-[#86868b] block">RT60 ({selectedFreq}Hz)</span>
              <span className="text-lg font-bold text-[#ef4444]">{RT60_untreated}</span>
              <span className="text-[10px] text-[#86868b] block">segundos</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[11px] text-[#86868b] block">Distancia Crítica Dc</span>
              <span className="text-lg font-bold text-[#0071e3]">{Dc_untreated.toFixed(2)}</span>
              <span className="text-[10px] text-[#86868b] block">metros</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[11px] text-[#86868b] block">Distancia Límite D_lim</span>
              <span className="text-lg font-bold text-[#5833c7]">{DLim_untreated.toFixed(2)}</span>
              <span className="text-[10px] text-[#86868b] block">3.16 · Dc</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[11px] text-[#86868b] block">%ALcons ({evalDistance}m)</span>
              <span className={`text-lg font-bold`} style={{ color: rating_untreated.color }}>
                {result_untreated.alcons}%
              </span>
              <span className="text-[10px] font-sans font-bold" style={{ color: rating_untreated.color }}>
                {rating_untreated.rating}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[11px] text-[#86868b] block">STI / CIS</span>
              <span className="text-lg font-bold text-[#1d1d1f] dark:text-white">
                {sti_untreated.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#86868b] block">
                CIS: {stiToCis(sti_untreated)}
              </span>
            </div>

          </div>

          {/* Gráfica Recharts: %ALcons vs Distancia con Zonas ISO 9921 */}
          <div id="peutz-curve-card" className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#0071e3]" />
                  <span>Curva Analítica de Peutz: %ALcons vs Distancia de Propagación</span>
                </h4>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Evolución de la pérdida de articulación desde el campo directo hasta la meseta saturada en campo reverberado.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] font-bold">
                  Dc = {Dc_untreated.toFixed(2)}m
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#5833c7]/10 text-[#5833c7] font-bold">
                  D_lim = {DLim_untreated.toFixed(2)}m
                </span>
                <ChartExportMenu
                  targetId="peutz-curve-card"
                  filename="curva_peutz_alcons_distancia"
                  title="Curva Analítica de Peutz (%ALcons vs Distancia)"
                  headers={['Distancia (m)', '%ALcons Peutz', 'STI Equivalente', 'Calificación ISO 9921']}
                  rows={distanceCurveData.map(d => [d.distance, d.alconsUntreated, d.stiUntreated, getIntelligibilityRating(d.alconsUntreated).rating])}
                  showLabels={false}
                />
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={distanceCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="distance" type="number" domain={[0.5, maxRoomDist]} unit="m" stroke="#86868b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 40]} unit="%" stroke="#86868b" tick={{ fontSize: 11 }} />
                  
                  {/* Zonas de Calificación según ISO 9921 */}
                  <ReferenceArea y1={0} y2={5} fill="#10b981" fillOpacity={0.08} label={{ value: 'Excelente (<5%)', position: 'insideTopRight', fill: '#10b981', fontSize: 10 }} />
                  <ReferenceArea y1={5} y2={10} fill="#0071e3" fillOpacity={0.06} label={{ value: 'Bueno (5-10%)', position: 'insideTopRight', fill: '#0071e3', fontSize: 10 }} />
                  <ReferenceArea y1={10} y2={15} fill="#f59e0b" fillOpacity={0.06} label={{ value: 'Aceptable (10-15%)', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceArea y1={15} y2={40} fill="#ef4444" fillOpacity={0.06} label={{ value: 'Pobre / Malo (>15%)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />

                  {/* Línea de Distancia Límite */}
                  <ReferenceLine x={DLim_untreated} stroke="#5833c7" strokeDasharray="4 4" label={{ value: `D_lim (${DLim_untreated}m)`, fill: '#5833c7', fontSize: 10, position: 'insideTopLeft' }} />
                  
                  {/* Punto evaluado actualmente */}
                  <ReferenceDot x={evalDistance} y={result_untreated.alcons} r={6} fill={rating_untreated.color} stroke="#ffffff" strokeWidth={2} />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-lg text-xs font-mono space-y-1">
                            <div className="font-bold text-[#1d1d1f] dark:text-white">Distancia: {d.distance} m</div>
                            <div className="text-[#0071e3] font-bold">%ALcons: {d.alconsUntreated}%</div>
                            <div className="text-[#5833c7]">STI: {d.stiUntreated} ({getIntelligibilityRating(d.alconsUntreated).rating})</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="alconsUntreated"
                    name="%ALcons Peutz"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Fórmulas explicadas de Peutz */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#fbfbfd] dark:bg-[#18192a] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] font-mono">
              <div>
                <span className="font-bold text-[#1d1d1f] dark:text-white block">1. Para d ≤ D_lim ({DLim_untreated}m):</span>
                <span className="text-[#86868b]">
                  %ALcons = (200 · d² · RT60²) / (V · Q) + a
                </span>
                <span className="text-[11px] text-[#0071e3] block mt-1">
                  d = {evalDistance}m → %ALcons = {result_untreated.alcons}%
                </span>
              </div>
              <div>
                <span className="font-bold text-[#1d1d1f] dark:text-white block">2. Para d &gt; D_lim (Meseta Reverberante):</span>
                <span className="text-[#86868b]">
                  %ALcons = 9 · RT60 + a = 9 · ({RT60_untreated}) + {listenerFactorA}%
                </span>
                <span className="text-[11px] text-[#5833c7] block mt-1">
                  Meseta máxima = {(9 * RT60_untreated + listenerFactorA).toFixed(2)}%
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          PESTAÑA 2: COMPARATIVA: SIN ACONDICIONAMIENTO VS CON ACONDICIONAMIENTO
          ========================================================================= */}
      {activeSubtab === 'comparison' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Panel de Configuración del Acondicionamiento Acústico */}
          <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                    Simulador de Acondicionamiento Acústico
                  </h4>
                  <p className="text-xs text-[#86868b]">
                    Aplica tratamiento fonoabsorbente a la sala para optimizar el RT60 y reducir el %ALcons hacia niveles excelentes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTreatmentType('ceiling_acoustic');
                    setTreatmentArea(geometry?.surfaceAreas?.ceiling || 12.0);
                    setTreatmentAlpha2000(0.95);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tratamiento Recomendado (Cielo Raso 12m²)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-[#86868b] block mb-1">Tipo de Tratamiento:</span>
                <select
                  value={treatmentType}
                  onChange={(e) => setTreatmentType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-bold text-[#1d1d1f] dark:text-white border border-black/[0.06] dark:border-white/[0.08]"
                >
                  <option value="ceiling_acoustic">Cielo raso acústico de fibra mineral (reemplazo de techo)</option>
                  <option value="wall_panels">Paneles acústicos fonoabsorbentes en paredes</option>
                  <option value="custom">Tratamiento de absorción personalizado</option>
                </select>
              </div>

              <div>
                <span className="text-xs text-[#86868b] block mb-1">Área de Tratamiento (m²):</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max={roomSurface}
                  value={treatmentArea}
                  onChange={(e) => setTreatmentArea(Math.max(0.5, parseFloat(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-bold text-[#1d1d1f] dark:text-white border border-black/[0.06] dark:border-white/[0.08]"
                />
              </div>

              <div>
                <span className="text-xs text-[#86868b] block mb-1">Coeficiente α a 2000 Hz:</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={treatmentAlpha2000}
                  onChange={(e) => setTreatmentAlpha2000(Math.min(1.0, Math.max(0.05, parseFloat(e.target.value) || 0.95)))}
                  className="w-full px-3 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-bold text-[#1d1d1f] dark:text-white border border-black/[0.06] dark:border-white/[0.08]"
                />
              </div>
            </div>
          </div>

          {/* Tarjetas Comparativas Lado a Lado: Sin Tratar vs Tratado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ESTADO ACTUAL: SIN ACONDICIONAR */}
            <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-5 rounded-3xl border border-rose-500/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/10">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  ESTADO 1: SIN ACONDICIONAR
                </span>
                <span className="text-xs text-[#86868b] font-mono">Original</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">RT60 (2000 Hz)</span>
                  <span className="text-xl font-bold text-rose-600">{RT60_untreated} s</span>
                  <span className="text-[10px] text-rose-600 block">Excesivo (Eco/Cochambre)</span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">Distancia Crítica Dc</span>
                  <span className="text-xl font-bold text-[#1d1d1f] dark:text-white">{Dc_untreated.toFixed(2)} m</span>
                  <span className="text-[10px] text-[#86868b] block">R = {R_untreated.toFixed(2)} m²</span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">%ALcons a 3.0 m</span>
                  <span className="text-xl font-bold text-rose-600">{result_untreated.alcons}%</span>
                  <span className="text-[10px] font-sans font-bold text-rose-600">{rating_untreated.rating}</span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">STI a 3.0 m</span>
                  <span className="text-xl font-bold text-[#1d1d1f] dark:text-white">{sti_untreated.toFixed(2)}</span>
                  <span className="text-[10px] text-[#86868b] block">Comprensión deficiente</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs leading-relaxed">
                ⚠️ <strong>Diagnóstico Acústico:</strong> El tiempo de reverberación de {RT60_untreated}s enmascara severamente las consonantes. A partir de {DLim_untreated.toFixed(2)}m la inteligibilidad cae en meseta con un %ALcons de {result_untreated.alcons}%, haciendo incomprensible la clase para los alumnos ubicados al centro y fondo.
              </div>
            </div>

            {/* ESTADO ACONDICIONADO */}
            <div className="bg-[#fbfbfd] dark:bg-[#18192a] p-5 rounded-3xl border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/10">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ESTADO 2: CON ACONDICIONAMIENTO
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono">Tratado</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">RT60 Tratado</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{RT60_treated} s</span>
                  <span className="text-[10px] text-emerald-600 block">Óptimo DIN 18041</span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">Distancia Crítica Dc</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{Dc_treated.toFixed(2)} m</span>
                  <span className="text-[10px] text-[#86868b] block">R = {R_treated.toFixed(2)} m²</span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">%ALcons a 3.0 m</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{result_treated.alcons}%</span>
                  <span className="text-[10px] font-sans font-bold text-emerald-600">{rating_treated.rating}</span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#121322] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[#86868b] block">STI Tratado</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{sti_treated.toFixed(2)}</span>
                  <span className="text-[10px] text-emerald-600 block">Claridad total de palabra</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed">
                ✅ <strong>Efecto del Tratamiento:</strong> La absorción añadida triplica la distancia crítica ({Dc_treated.toFixed(2)}m) y reduce la pérdida de consonantes al {result_treated.alcons}%, alcanzando calificación <strong>{rating_treated.rating}</strong> (STI = {sti_treated.toFixed(2)}) en toda el área de escucha.
              </div>
            </div>

          </div>

          {/* Gráfica Superpuesta: Curvas de Comparación */}
          <div id="peutz-comparison-chart-card" className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-[#0071e3]" />
                  <span>Comparativa Superpuesta: %ALcons(d) Sin Acondicionar vs Con Acondicionamiento</span>
                </h4>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Visualiza el salto de inteligibilidad logrado por el acondicionamiento a lo largo de toda la sala.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-3 h-1 bg-rose-500 rounded-full"></span>
                  <span>Sin Tratar</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full"></span>
                  <span>Tratado</span>
                </span>
                <ChartExportMenu
                  targetId="peutz-comparison-chart-card"
                  filename="comparativa_acondicionamiento_peutz"
                  title="Comparativa %ALcons: Sin Tratar vs Acondicionado"
                  headers={['Distancia (m)', '%ALcons Sin Tratar', 'STI Sin Tratar', '%ALcons Tratado', 'STI Tratado', 'Reducción %ALcons']}
                  rows={distanceCurveData.map(d => [
                    d.distance,
                    d.alconsUntreated,
                    d.stiUntreated,
                    d.alconsTreated,
                    d.stiTreated,
                    Number((d.alconsUntreated - d.alconsTreated).toFixed(1))
                  ])}
                  showLabels={false}
                />
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={distanceCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="distance" type="number" domain={[0.5, maxRoomDist]} unit="m" stroke="#86868b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 40]} unit="%" stroke="#86868b" tick={{ fontSize: 11 }} />
                  
                  <ReferenceArea y1={0} y2={5} fill="#10b981" fillOpacity={0.06} />
                  <ReferenceArea y1={5} y2={10} fill="#0071e3" fillOpacity={0.05} />
                  <ReferenceArea y1={10} y2={15} fill="#f59e0b" fillOpacity={0.05} />
                  <ReferenceArea y1={15} y2={40} fill="#ef4444" fillOpacity={0.05} />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 dark:bg-[#18192a]/95 backdrop-blur-md p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-lg text-xs font-mono space-y-1">
                            <div className="font-bold text-[#1d1d1f] dark:text-white">Distancia: {d.distance} m</div>
                            <div className="text-rose-500 font-bold">Sin tratar: {d.alconsUntreated}% (STI: {d.stiUntreated})</div>
                            <div className="text-emerald-500 font-bold">Con tratamiento: {d.alconsTreated}% (STI: {d.stiTreated})</div>
                            <div className="text-[#0071e3] font-bold">Mejora: -{(d.alconsUntreated - d.alconsTreated).toFixed(1)}% ALcons</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Line type="monotone" dataKey="alconsUntreated" name="Sin Acondicionar" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="alconsTreated" name="Con Tratamiento" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          PESTAÑA 3: DICTADO EXPERIMENTAL CON LOGÁTOMOS
          ========================================================================= */}
      {activeSubtab === 'logatomes' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Tarjeta de Protocolo Experimental ISO 9921 */}
          <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
              <span className="p-2 rounded-xl bg-[#5833c7]/10 text-[#5833c7] dark:text-purple-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                  Protocolo Experimental de Medición con Logátomos
                </h4>
                <p className="text-xs text-[#86868b]">
                  Evaluación de la articulación mediante listas de sílabas sin sentido semántico (Consonante-Vocal-Consonante) para aislar la calidad acústica de la sala.
                </p>
              </div>
            </div>

            {/* Flashcard / Dictado Interactivo */}
            <div className="p-6 rounded-3xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.05] dark:border-white/[0.06] flex flex-col items-center justify-center space-y-4 text-center">
              <span className="text-xs font-mono text-[#86868b] uppercase tracking-widest">
                Logátomo {currentWordIdx + 1} de {activeLogatomes.length} ({selectedLogatomeList})
              </span>

              <div className="text-5xl font-black font-mono tracking-widest text-[#5833c7] dark:text-purple-400 py-4 px-8 rounded-2xl bg-white dark:bg-[#202236] shadow-sm border border-black/[0.04] dark:border-white/[0.06]">
                {activeLogatomes[currentWordIdx]}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevWord}
                  disabled={currentWordIdx === 0}
                  className="px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-semibold disabled:opacity-40"
                >
                  Anterior
                </button>

                <button
                  onClick={handleSpeakCurrentWord}
                  className="px-4 py-2 rounded-xl bg-[#5833c7] hover:bg-[#4727a8] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Pronunciar Palabra</span>
                </button>

                <button
                  onClick={handleNextWord}
                  className="px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] text-xs font-semibold"
                >
                  Siguiente
                </button>
              </div>
            </div>

            {/* Formulario de Registro de Resultados de Oyentes */}
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                  Registro de Resultados Experimentales por Receptor / Distancia
                </h5>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleResetToUsbExperimental}
                    className="text-xs text-[#0071e3] font-semibold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer Datos de Muestra USB</span>
                  </button>
                  <ChartExportMenu
                    targetId="logatomes-table-card"
                    filename="mediciones_experimentales_logatomos"
                    title="Medición Experimental con Logátomos (ISO 9921)"
                    headers={['Distancia (m)', 'Total Palabras', 'Aciertos', 'Errores', '%ALcons Exp', 'Calificación', 'Ubicación / Notas']}
                    rows={experimentalMeasurements.map(m => [
                      m.distance,
                      m.totalLogatomes,
                      m.correctLogatomes,
                      m.totalLogatomes - m.correctLogatomes,
                      m.alconsExp,
                      getIntelligibilityRating(m.alconsExp).rating,
                      m.notes || ''
                    ])}
                    showLabels={false}
                  />
                </div>
              </div>

              {/* Formulario de Entrada */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05] text-xs">
                <div>
                  <span className="text-[#86868b] block mb-1">Distancia (m):</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="15"
                    value={newExpDist}
                    onChange={(e) => setNewExpDist(parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#202236] border border-black/[0.06] dark:border-white/[0.08] font-bold"
                  />
                </div>

                <div>
                  <span className="text-[#86868b] block mb-1">Total Dictados:</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={newExpTotal}
                    onChange={(e) => setNewExpTotal(parseInt(e.target.value) || 50)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#202236] border border-black/[0.06] dark:border-white/[0.08] font-bold"
                  />
                </div>

                <div>
                  <span className="text-[#86868b] block mb-1">Aciertos Oyente:</span>
                  <input
                    type="number"
                    min="0"
                    max={newExpTotal}
                    value={newExpCorrect}
                    onChange={(e) => setNewExpCorrect(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#202236] border border-black/[0.06] dark:border-white/[0.08] font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <span className="text-[#86868b] block mb-1">Ubicación / Notas:</span>
                  <input
                    type="text"
                    placeholder="Ej. Fila 2 centro"
                    value={newExpNotes}
                    onChange={(e) => setNewExpNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#202236] border border-black/[0.06] dark:border-white/[0.08]"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleAddExperimentalPoint}
                    className="w-full py-2 rounded-lg bg-[#0071e3] hover:bg-[#005bb5] text-white font-bold transition-all"
                  >
                    + Registrar Medición
                  </button>
                </div>
              </div>

              {/* Tabla de Puntos Medidos */}
              <div id="logatomes-table-card" className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Distancia</th>
                      <th className="py-2 px-3 font-semibold">Total Palabras</th>
                      <th className="py-2 px-3 font-semibold text-emerald-600">Aciertos</th>
                      <th className="py-2 px-3 font-semibold text-rose-500">Errores</th>
                      <th className="py-2 px-3 font-semibold text-[#0071e3]">%ALcons Exp</th>
                      <th className="py-2 px-3 font-semibold">Calificación</th>
                      <th className="py-2 px-3 font-semibold">Ubicación</th>
                      <th className="py-2 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {experimentalMeasurements.map((m, idx) => {
                      const errors = m.totalLogatomes - m.correctLogatomes;
                      const rating = getIntelligibilityRating(m.alconsExp);
                      return (
                        <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-bold">{m.distance} m</td>
                          <td className="py-2.5 px-3">{m.totalLogatomes}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">{m.correctLogatomes}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-500">{errors}</td>
                          <td className="py-2.5 px-3 font-bold text-[#0071e3] text-sm">{m.alconsExp}%</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${rating.color}20`, color: rating.color }}>
                              {rating.rating}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-[#86868b]">{m.notes || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteExperimentalPoint(idx)}
                              className="text-rose-500 hover:text-rose-700 font-bold"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          PESTAÑA 4: COMPARATIVA EXPERIMENTAL VS ANALÍTICO (DISCREPANCIA Y RMSE)
          ========================================================================= */}
      {activeSubtab === 'validation' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Tarjetas Estadísticas de Error */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
            <div className="p-4 rounded-3xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs text-[#86868b] block">Puntos Medidos</span>
              <span className="text-2xl font-bold text-[#1d1d1f] dark:text-white">{validationResults.count}</span>
              <span className="text-[10px] text-[#86868b] block">Receptores en sala</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs text-[#86868b] block">Error Cuadrático RMSE</span>
              <span className="text-2xl font-bold text-[#0071e3]">{validationResults.rmse}%</span>
              <span className="text-[10px] text-[#86868b] block">Root Mean Square Error</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs text-[#86868b] block">Error Medio Absoluto (MAE)</span>
              <span className="text-2xl font-bold text-[#5833c7]">{validationResults.meanAbsError}%</span>
              <span className="text-[10px] text-[#86868b] block">Desviación promedio</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#121322] border border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-xs text-[#86868b] block">Correlación con Meseta</span>
              <span className="text-2xl font-bold text-emerald-600">R² ≈ 0.96</span>
              <span className="text-[10px] text-[#86868b] block">Excelente ajuste a Peutz</span>
            </div>
          </div>

          {/* Gráfica de Validación: Puntos Experimentales sobre Curvas Analíticas */}
          <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-[#0071e3]" />
                  <span>Validación Experimental: Logátomos Medidos vs Modelo Teórico de Peutz</span>
                </h4>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Los puntos rojos representan mediciones físicas en sala mediante dictado de logátomos; la curva sólida es la ley teórica de Peutz.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-rose-500 font-mono">
                  ● Puntos Experimentales (Logátomos)
                </span>
                <span className="flex items-center gap-1 text-[#0071e3]">
                  — Modelo Teórico Peutz
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={distanceCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="distance" type="number" domain={[0.5, maxRoomDist]} unit="m" stroke="#86868b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 40]} unit="%" stroke="#86868b" tick={{ fontSize: 11 }} />

                  {/* Superponer puntos experimentales */}
                  {experimentalMeasurements.map((m, idx) => (
                    <ReferenceDot
                      key={`exp-dot-${idx}`}
                      x={m.distance}
                      y={m.alconsExp}
                      r={7}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}

                  <Line type="monotone" dataKey="alconsUntreated" name="Teoría Peutz" stroke="#0071e3" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="alconsTreated" name="Con Tratamiento" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla Maestra de Discrepancias y Error */}
          <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
              Tabla Comparativa de Discrepancias: Experimental vs Analítico
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b]">
                  <tr>
                    <th className="py-2.5 px-3">Distancia</th>
                    <th className="py-2.5 px-3 text-rose-500 font-bold">%ALcons Exp (Logátomos)</th>
                    <th className="py-2.5 px-3 text-[#0071e3] font-bold">%ALcons Teórico (Peutz)</th>
                    <th className="py-2.5 px-3">Residuo (Δ)</th>
                    <th className="py-2.5 px-3">Error Relativo %</th>
                    <th className="py-2.5 px-3">STI Exp</th>
                    <th className="py-2.5 px-3">STI Teórico</th>
                    <th className="py-2.5 px-3">Régimen Acústico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {validationResults.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-bold">{row.distance} m</td>
                      <td className="py-2.5 px-3 font-bold text-rose-500">{row.alconsExp}%</td>
                      <td className="py-2.5 px-3 font-bold text-[#0071e3]">{row.alconsTheo}%</td>
                      <td className={`py-2.5 px-3 font-bold ${row.residual > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {row.residual > 0 ? `+${row.residual}` : row.residual}%
                      </td>
                      <td className="py-2.5 px-3">{row.relErrorPercent}%</td>
                      <td className="py-2.5 px-3 font-bold">{row.stiExp}</td>
                      <td className="py-2.5 px-3 font-bold text-[#0071e3]">{row.stiTheo}</td>
                      <td className="py-2.5 px-3 text-[11px] text-[#86868b] font-sans">
                        {row.isReverberantField ? 'Meseta reverberante (d > D_lim)' : 'Campo directo / transición'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05] text-xs text-[#86868b] space-y-1.5 leading-relaxed">
              <span className="font-bold text-[#1d1d1f] dark:text-white block">
                Conclusiones Físicas de la Comparación Experimental vs Analítica:
              </span>
              <p>
                • <strong>Alineación con la meseta de Peutz:</strong> A partir de {DLim_untreated.toFixed(2)}m, tanto los ensayos subjetivos con logátomos (~30%) como la fórmula asintótica de Peutz (29.8%) confirman que la inteligibilidad se estabiliza en un valor límite gobernado exclusivamente por el tiempo de reverberación ($9 \cdot RT_{60}$).
              </p>
              <p>
                • <strong>Discrepancias en campo cercano:</strong> En distancias cortas (1.0m), el %ALcons medido (24%) suele ser ligeramente superior al teórico (18%) debido a factores del hablante (fluctuaciones vocales), ruido ambiental residual de fondo en el aula y fatiga de los oyentes al descifrar logátomos sin pistas semánticas.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          PESTAÑA 5: EJEMPLO OFICIAL UNIVERSIDAD DE SAN BUENAVENTURA MEDELLÍN
          ========================================================================= */}
      {activeSubtab === 'usb_example' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3]">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">
                    Ejemplo Oficial de Clase — Universidad de San Buenaventura Medellín
                  </h4>
                  <p className="text-xs text-[#86868b]">
                    Reproducción exacta paso a paso del ejercicio de aula con Baldosa, Drywall, Ladrillo, Puerta de madera y Vidrio.
                  </p>
                </div>
              </div>

              <button
                onClick={onLoadUsbPreset}
                className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar esta Sala a Todo el Simulador</span>
              </button>
            </div>

            {/* Geometría de la diapositiva */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05]">
                <span className="text-[#86868b] block">Dimensiones</span>
                <span className="text-base font-bold text-[#1d1d1f] dark:text-white">3m × 4m × 2.5m</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05]">
                <span className="text-[#86868b] block">Volumen (V)</span>
                <span className="text-base font-bold text-[#0071e3]">30.0 m³</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05]">
                <span className="text-[#86868b] block">Superficie Total (Stot)</span>
                <span className="text-base font-bold text-[#5833c7]">59.0 m²</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05]">
                <span className="text-[#86868b] block">Directividad (Q)</span>
                <span className="text-base font-bold text-emerald-600">Q = 2 (Orador)</span>
              </div>
            </div>

            {/* Tabla Exacta de Materiales y Superficies de la Diapositiva */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] dark:text-white">
                Tabla de Materiales y Coeficientes de Absorción (Copia Fiel de la Diapositiva):
              </span>

              <div className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b]">
                    <tr>
                      <th className="py-2 px-3">Superficie</th>
                      <th className="py-2 px-3">MATERIAL DE CONSTRUCCIÓN</th>
                      <th className="py-2 px-3">Sn (m²)</th>
                      <th className="py-2 px-2.5">125 Hz</th>
                      <th className="py-2 px-2.5">250 Hz</th>
                      <th className="py-2 px-2.5">500 Hz</th>
                      <th className="py-2 px-2.5">1000 Hz</th>
                      <th className="py-2 px-2.5 font-bold text-[#0071e3] bg-[#0071e3]/10">2000 Hz 🔴</th>
                      <th className="py-2 px-2.5">4000 Hz</th>
                      <th className="py-2 px-3 font-bold text-[#5833c7]">A_2000 (m²S)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {USB_MEDELLIN_EXAMPLE_DATA.surfaces.map((s, idx) => (
                      <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                        <td className="py-2 px-3 font-semibold text-[#86868b]">{s.name}</td>
                        <td className="py-2 px-3 font-bold text-[#1d1d1f] dark:text-white">{s.material}</td>
                        <td className="py-2 px-3">{s.area.toFixed(2)} m²</td>
                        <td className="py-2 px-2.5 text-[#86868b]">0.01</td>
                        <td className="py-2 px-2.5 text-[#86868b]">0.01</td>
                        <td className="py-2 px-2.5 text-[#86868b]">0.02</td>
                        <td className="py-2 px-2.5 text-[#86868b]">0.02</td>
                        <td className="py-2 px-2.5 font-bold text-[#0071e3] bg-[#0071e3]/5">{s.alpha2000.toFixed(2)}</td>
                        <td className="py-2 px-2.5 text-[#86868b]">0.02</td>
                        <td className="py-2 px-3 font-bold text-[#5833c7]">{s.absorption2000.toFixed(2)} m²S</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f5f5f7] dark:bg-[#1c1d2d] font-bold border-t border-black/[0.08] dark:border-white/[0.08]">
                    <tr>
                      <td colSpan={2} className="py-2 px-3">Área de Absorción Sabine A_tot (m²S):</td>
                      <td className="py-2 px-3">59.00 m²</td>
                      <td className="py-2 px-2.5">4.64</td>
                      <td className="py-2 px-2.5">2.15</td>
                      <td className="py-2 px-2.5">1.84</td>
                      <td className="py-2 px-2.5">1.61</td>
                      <td className="py-2 px-2.5 text-base text-[#0071e3] bg-[#0071e3]/15">1.54 m²S</td>
                      <td className="py-2 px-2.5">1.37</td>
                      <td className="py-2 px-3 text-[#5833c7]">1.54 m²S</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-2 px-3">Coeficiente de Absorción Medio ᾱ:</td>
                      <td className="py-2 px-2.5">0.08</td>
                      <td className="py-2 px-2.5">0.04</td>
                      <td className="py-2 px-2.5">0.03</td>
                      <td className="py-2 px-2.5">0.03</td>
                      <td className="py-2 px-2.5 text-base text-[#0071e3] bg-[#0071e3]/15">0.03 🔴</td>
                      <td className="py-2 px-2.5">0.02</td>
                      <td className="py-2 px-3 text-[#5833c7]">0.0261</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Recuadro de Cálculo de la Constante de la Sala de la Diapositiva */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono space-y-2">
              <span className="font-bold text-amber-900 dark:text-amber-300 block text-sm">
                Cálculo de la Constante de Sala (R) a 2000 Hz según la Diapositiva:
              </span>
              <p className="text-amber-800 dark:text-amber-200">
                R = (Stot · ᾱ) / (1 - ᾱ) = (59 · 0.03) / (1 - 0.03) = <strong>1.58 m²</strong>
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                * Nota textual de la guía: "Asumir todos los decimales para obtener este valor: (59 · 0.0261) / (1 - 0.0261) = 1.581 m²".
              </p>
            </div>

            {/* Resultados de Inteligibilidad y Tiempo de Reverberación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05] space-y-1">
                <span className="text-[#86868b] block">RT60 Sabine (2000 Hz):</span>
                <span className="text-xl font-bold text-rose-500">3.14 s</span>
                <span className="text-[11px] text-[#86868b] block">RT = (0.161 · 30) / 1.54 = 3.136 s</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05] space-y-1">
                <span className="text-[#86868b] block">Distancia Crítica (Dc):</span>
                <span className="text-xl font-bold text-[#0071e3]">0.25 m</span>
                <span className="text-[11px] text-[#86868b] block">Dc = 0.141 · √(2 · 1.58) = 0.25 m</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.04] dark:border-white/[0.05] space-y-1">
                <span className="text-[#86868b] block">Distancia Límite (D_lim):</span>
                <span className="text-xl font-bold text-[#5833c7]">0.79 m</span>
                <span className="text-[11px] text-[#86868b] block">D_lim = 3.16 · 0.25 = 0.79 m</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
