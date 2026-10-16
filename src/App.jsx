import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewDashboard from './components/OverviewDashboard';
import RoomDimensions from './components/RoomDimensions';
import RoomVisualizer from './components/RoomVisualizer';
import SurfaceMaterials from './components/SurfaceMaterials';
import SourceReceiver from './components/SourceReceiver';
import AcousticResults from './components/AcousticResults';
import AcousticCharts from './components/AcousticCharts';
import ReportModal from './components/ReportModal';
import TheoryModal from './components/TheoryModal';
import ExportModal from './components/ExportModal';
import Footer from './components/Footer';
import WelcomeHero from './components/WelcomeHero';

import {
  OCTAVE_BANDS,
  calculatePolygonGeometry,
  calculateRoomAbsorption,
  calculateReverberationTimes,
  calculateRoomConstant,
  calculateCriticalDistance,
  calculateSoundFieldAtDistance,
  getOptimumReverberationTime,
  AIR_ABSORPTION_COEFFS,
} from './utils/acousticCalculations';
import { getDefaultPolygonMaterials } from './utils/defaultMaterials';
import { ROOM_PRESETS } from './utils/roomPresets';
import ModesModule from './components/modes/ModesModule';
import IntelligibilityModule from './components/IntelligibilityModule';
import ActiveRoom3DPreview from './components/ActiveRoom3DPreview';
import {
  getRectangularDims,
  computeModes,
  schroederFrequency,
  evaluateBonello,
} from './utils/modalCalculations';

const STORAGE_KEY_V3 = 'pozole_project_state_v3';

// Carga segura del estado inicial persistente
function loadSavedProjectState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V3);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('No se pudo restaurar estado de pozole_project_state_v3:', err);
    return null;
  }
}

/**
 * Componente Principal de la Suite Acústica — POZOLE v3.0
 * Ahora con polígono de planta libre (editor de geometría arbitraria) y Dark Mode
 */
export default function App() {
  // Estado de navegación lateral
  const [activeSection, setActiveSection] = useState('welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  // Estado del Modo Oscuro
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pozole_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pozole_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pozole_theme', 'light');
    }
  }, [isDarkMode]);

  // Carga única inicial de estado previo guardado
  const savedState = useMemo(() => loadSavedProjectState(), []);

  // 1. Polígono de planta libre + altura + curvaturas
  const [roomPolygon, setRoomPolygon] = useState(() => {
    return savedState?.roomPolygon || {
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 6 },
        { x: 0, y: 6 },
      ],
      height: 3.0,
      curvatures: {},
    };
  });

  // 2. Materiales y coeficientes de absorción (dinámicos según el número de paredes)
  const [materials, setMaterials] = useState(() => {
    if (savedState?.materials && Object.keys(savedState.materials).length > 0) {
      return savedState.materials;
    }
    const count = savedState?.roomPolygon?.vertices?.length || 4;
    return getDefaultPolygonMaterials(count);
  });

  // Sincronizar materiales cuando cambia el número de vértices
  const prevVertexCount = useRef(roomPolygon.vertices.length);
  useEffect(() => {
    const newCount = roomPolygon.vertices.length;
    if (newCount !== prevVertexCount.current) {
      setMaterials(prev => getDefaultPolygonMaterials(newCount, prev));
      prevVertexCount.current = newCount;
    }
  }, [roomPolygon.vertices.length]);

  // 3. Fuente Sonora y Receptor
  const [sourceReceiver, setSourceReceiver] = useState(() => {
    return savedState?.sourceReceiver || {
      lw: 90.0,
      directivity: 1,
      distance: 3.0,
      name: 'Fuente Omnidireccional',
    };
  });

  // 4. Parámetros de Simulación
  const [includeAirAbsorption, setIncludeAirAbsorption] = useState(() => {
    return savedState?.includeAirAbsorption !== undefined ? savedState.includeAirAbsorption : true;
  });
  const [roomType, setRoomType] = useState(() => savedState?.roomType || 'speech');
  const [selectedBand, setSelectedBand] = useState(() => savedState?.selectedBand || 1000);
  const [selectedPresetId, setSelectedPresetId] = useState(() => savedState?.selectedPresetId || '');

  // 5. Parámetros de Acústica Ondulatoria y Modos Propios
  const [modalSettings, setModalSettings] = useState(() => {
    return savedState?.modalSettings || {
      c: 343,
      tempC: 20,
      nMax: 5,
      fMax: 400,
      t60Source: 'sabine',
      t60Override: 1.0,
      tolerance: 0.5,
    };
  });

  // 6. Mediciones In Situ (Pestaña 7)
  const [measurementData, setMeasurementData] = useState(() => {
    if (savedState?.measurementData) return savedState.measurementData;
    if (typeof window !== 'undefined') {
      try {
        const legacy = localStorage.getItem('pozole_measurement_data');
        if (legacy) return JSON.parse(legacy);
      } catch (e) {}
    }
    return null;
  });

  // 7. Comparativa Multimétodo (Pestaña 8: Teórico vs Exp vs REW vs FEM)
  const [comparisonData, setComparisonData] = useState(() => {
    return savedState?.comparisonData || null;
  });

  // Estado del indicador visual de autoguardado ('saved' | 'saving')
  const [saveStatus, setSaveStatus] = useState('saved');
  const isInitialMount = useRef(true);

  // Sincronización automática a LocalStorage (pozole_project_state_v3)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const payload = {
          version: 3,
          savedAt: new Date().toISOString(),
          roomPolygon,
          materials,
          sourceReceiver,
          includeAirAbsorption,
          roomType,
          selectedBand,
          selectedPresetId,
          modalSettings,
          measurementData,
          comparisonData,
        };
        localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(payload));
        // Mantener compatibilidad con módulo de medición
        if (measurementData) {
          localStorage.setItem('pozole_measurement_data', JSON.stringify(measurementData));
        }
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error al guardar en localStorage:', err);
        setSaveStatus('saved');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    roomPolygon,
    materials,
    sourceReceiver,
    includeAirAbsorption,
    roomType,
    selectedBand,
    selectedPresetId,
    modalSettings,
    measurementData,
    comparisonData,
  ]);

  const handleUpdateMeasurementData = useCallback((data) => {
    setMeasurementData(data);
  }, []);

  // Modales
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // ============================================================================
  // CÁLCULOS FÍSICOS REACTIVOS (basados en polígono)
  // ============================================================================

  // 1. Geometría de polígono extruido con soporte de curvaturas
  const geometry = useMemo(() => {
    return calculatePolygonGeometry(roomPolygon.vertices, roomPolygon.height, roomPolygon.curvatures || {});
  }, [roomPolygon.vertices, roomPolygon.height, roomPolygon.curvatures]);

  // Compat shim: legacy 'dimensions' object for components that still need it
  const dimensions = useMemo(() => ({
    length: geometry.length,
    width: geometry.width,
    height: geometry.height || roomPolygon.height,
    shape: 'polygon',
  }), [geometry, roomPolygon.height]);

  // 2. Absorción equivalente A(f)
  const absorptionData = useMemo(() => {
    return calculateRoomAbsorption(
      geometry.surfaceAreas,
      geometry.totalSurfaceArea,
      materials
    );
  }, [geometry.surfaceAreas, geometry.totalSurfaceArea, materials]);

  // 3. Tiempos de Reverberación RT60
  const reverberationData = useMemo(() => {
    return calculateReverberationTimes(
      geometry.volume,
      geometry.totalSurfaceArea,
      geometry.surfaceAreas,
      absorptionData,
      materials,
      includeAirAbsorption
    );
  }, [
    geometry.volume,
    geometry.totalSurfaceArea,
    geometry.surfaceAreas,
    absorptionData,
    materials,
    includeAirAbsorption,
  ]);

  // 4. Campo Sonoro
  const soundFieldData = useMemo(() => {
    const results = {};
    OCTAVE_BANDS.forEach((freq) => {
      const { equivalentAbsorption: A, alphaMean } = absorptionData[freq] || {
        equivalentAbsorption: 10,
        alphaMean: 0.1,
      };
      const R = calculateRoomConstant(A, alphaMean);
      const airCoeff = includeAirAbsorption ? (AIR_ABSORPTION_COEFFS[freq] || 0) : 0;
      const field = calculateSoundFieldAtDistance(
        sourceReceiver.lw,
        sourceReceiver.directivity,
        R,
        sourceReceiver.distance,
        airCoeff
      );
      results[freq] = { ...field, roomConstant: R };
    });
    return results;
  }, [
    absorptionData,
    sourceReceiver.lw,
    sourceReceiver.directivity,
    sourceReceiver.distance,
    includeAirAbsorption,
  ]);

  // 5. RT óptimo
  const optimumRT = useMemo(() => {
    return getOptimumReverberationTime(geometry.volume, roomType);
  }, [geometry.volume, roomType]);

  const activeCriticalDistance = soundFieldData[selectedBand]?.criticalDistance || 2.5;
  const maxRoomDimension = Math.sqrt(
    (geometry.length || 10) ** 2 +
    (geometry.width || 6) ** 2 +
    (roomPolygon.height || 3) ** 2
  );

  const rt500Sabine = reverberationData[500]?.sabine || 0;

  // 6. Cálculos de Acústica Ondulatoria / Modos Propios
  const modalDimensions = useMemo(() => {
    return getRectangularDims(
      roomPolygon,
      dimensions.height,
      geometry.floorArea,
      modalSettings.dimensionMode || 'equivalent'
    );
  }, [roomPolygon, dimensions.height, geometry.floorArea, modalSettings.dimensionMode]);

  const t60ForSchroeder = useMemo(() => {
    if (modalSettings.t60Source === 'override') {
      return modalSettings.t60Override || 1.0;
    }
    if (modalSettings.t60Source === 'eyring') {
      const e500 = reverberationData[500]?.eyring || 1.0;
      const e1k = reverberationData[1000]?.eyring || 1.0;
      return (e500 + e1k) / 2;
    }
    const s500 = reverberationData[500]?.sabine || 1.0;
    const s1k = reverberationData[1000]?.sabine || 1.0;
    return (s500 + s1k) / 2;
  }, [modalSettings.t60Source, modalSettings.t60Override, reverberationData]);

  const schroederData = useMemo(() => {
    const v = modalDimensions.volume || geometry.volume || (modalDimensions.Lx * modalDimensions.Ly * modalDimensions.Lz);
    return schroederFrequency(t60ForSchroeder, v, modalSettings.c);
  }, [t60ForSchroeder, geometry.volume, modalDimensions, modalSettings.c]);

  const calculatedModes = useMemo(() => {
    return computeModes({
      Lx: modalDimensions.Lx,
      Ly: modalDimensions.Ly,
      Lz: modalDimensions.Lz,
      c: modalSettings.c,
      nMax: modalSettings.nMax,
      fMax: modalSettings.fMax,
    });
  }, [modalDimensions, modalSettings.c, modalSettings.nMax, modalSettings.fMax]);

  const bonelloResult = useMemo(() => {
    return evaluateBonello(calculatedModes, schroederData.fsApprox, modalSettings.tolerance);
  }, [calculatedModes, schroederData.fsApprox, modalSettings.tolerance]);

  const handleApplyProportions = useCallback(({ Lx, Ly, Lz }) => {
    setRoomPolygon({
      vertices: [
        { x: 0, y: 0 },
        { x: Lx, y: 0 },
        { x: Lx, y: Ly },
        { x: 0, y: Ly },
      ],
      height: Lz,
      curvatures: {},
    });
  }, []);

  // ============================================================================
  // ACCIONES
  // ============================================================================

  const handleLoadPreset = useCallback((presetId) => {
    const preset = ROOM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      // Convert preset dimensions to polygon vertices
      const L = preset.dimensions.length || 10;
      const W = preset.dimensions.width || 6;
      const H = preset.dimensions.height || 3;
      setRoomPolygon({
        vertices: [
          { x: 0, y: 0 },
          { x: L, y: 0 },
          { x: L, y: W },
          { x: 0, y: W },
        ],
        height: H,
      });
      const mergedMaterials = {};
      Object.keys(preset.materials).forEach((surfaceKey) => {
        mergedMaterials[surfaceKey] = {
          subElements: [],
          ...preset.materials[surfaceKey],
        };
      });
      // Remap legacy wallNorth/wallSouth/wallEast/wallWest to wall_0..wall_3
      const legacyMap = { wallNorth: 'wall_0', wallSouth: 'wall_2', wallEast: 'wall_1', wallWest: 'wall_3' };
      const remapped = {};
      Object.entries(mergedMaterials).forEach(([key, val]) => {
        remapped[legacyMap[key] || key] = val;
      });
      setMaterials(getDefaultPolygonMaterials(4, remapped));
      setSourceReceiver((prev) => ({
        ...prev,
        lw: preset.source.lw,
        directivity: preset.source.directivity,
        distance: preset.source.distance,
        name: preset.source.name,
      }));
      setRoomType(preset.roomType || 'speech');
      setSelectedPresetId(preset.id);

      if (preset.modal) {
        setModalSettings((prev) => ({
          ...prev,
          ...preset.modal,
        }));
      }
    }
  }, []);

  const handleReset = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_V3);
        localStorage.removeItem('pozole_measurement_data');
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }
    }

    setRoomPolygon({
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 6 },
        { x: 0, y: 6 },
      ],
      height: 3.0,
      curvatures: {},
    });
    setMaterials(getDefaultPolygonMaterials(4));
    setSourceReceiver({
      lw: 90.0,
      directivity: 1,
      distance: 3.0,
      name: 'Fuente Omnidireccional',
    });
    setModalSettings({
      c: 343,
      tempC: 20,
      nMax: 5,
      fMax: 400,
      t60Source: 'sabine',
      t60Override: 1.0,
      tolerance: 0.5,
    });
    setMeasurementData(null);
    setComparisonData(null);
    setRoomType('speech');
    setSelectedPresetId('');
    setSelectedBand(1000);
    setIncludeAirAbsorption(true);
    setSaveStatus('saved');
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0B0F19] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans antialiased flex flex-col lg:flex-row transition-colors duration-200">

      {/* Navegación Lateral (Sidebar) */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        geometry={geometry}
        rt500={rt500Sabine}
        criticalDistance={activeCriticalDistance}
        selectedPresetId={selectedPresetId}
        onLoadPreset={handleLoadPreset}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenTheory={() => setIsTheoryOpen(true)}
        onExportCSV={() => setIsExportOpen(true)}
        onReset={handleReset}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        schroederFreq={schroederData?.fsApprox}
        modalCount={calculatedModes.length}
      />

      {/* Área de Contenido Principal */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'ml-0'
        }`}>

        {/* Encabezado Superior */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          activeSection={activeSection}
          onReset={handleReset}
          onExportCSV={() => setIsExportOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
          onOpenTheoryModal={() => setIsTheoryOpen(true)}
          onLoadPreset={handleLoadPreset}
          selectedPresetId={selectedPresetId}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          saveStatus={saveStatus}
        />

        {/* Contenido Dinámico según la Sección Seleccionada */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Mini-Visor 3D persistente de sala para módulos 2 al 7 */}
          {['materials', 'source', 'results', 'charts', 'intelligibility'].includes(activeSection) && (
            <div className="animate-fadeIn">
              <ActiveRoom3DPreview
                dimensions={modalDimensions}
                geometry={geometry}
                roomPolygon={roomPolygon}
                activeRt60={reverberationData?.[500]?.sabine}
                isCollapsible={true}
                defaultOpen={false}
                onNavigateToGeometry={() => setActiveSection('geometry')}
              />
            </div>
          )}

          {/* 0. Pantalla de Bienvenida / Hero */}
          {activeSection === 'welcome' && (
            <WelcomeHero
              onEnter={() => setActiveSection('overview')}
              onOpenGeometry={() => setActiveSection('geometry')}
              onOpenResults={() => setActiveSection('results')}
              roomPolygon={roomPolygon}
              geometry={geometry}
              sourceReceiver={sourceReceiver}
              criticalDistance={activeCriticalDistance}
              materials={materials}
              selectedBand={selectedBand}
            />
          )}

          {/* 1. Panel General / Overview */}
          {activeSection === 'overview' && (
            <OverviewDashboard
              geometry={geometry}
              dimensions={dimensions}
              roomPolygon={roomPolygon}
              sourceReceiver={sourceReceiver}
              absorptionData={absorptionData}
              reverberationData={reverberationData}
              soundFieldData={soundFieldData}
              optimumRT={optimumRT}
              criticalDistance={activeCriticalDistance}
              setActiveSection={setActiveSection}
              onOpenReport={() => setIsReportOpen(true)}
              materials={materials}
              onChangeMaterials={setMaterials}
              selectedBand={selectedBand}
              onChangeSourceReceiver={setSourceReceiver}
              schroederData={schroederData}
              bonelloResult={bonelloResult}
              modalModes={calculatedModes}
            />
          )}

          {/* 2. Geometría y Sala (Estudio Compacto 2D + 3D Sincronizado) */}
          {activeSection === 'geometry' && (
            <div className="animate-fadeIn">
              <RoomDimensions
                roomPolygon={roomPolygon}
                onChangePolygon={setRoomPolygon}
                geometry={geometry}
                materials={materials}
                onChangeMaterials={setMaterials}
                sourceReceiver={sourceReceiver}
                onChangeSourceReceiver={setSourceReceiver}
                roomType={roomType}
                onChangeRoomType={setRoomType}
                modalSettings={modalSettings}
                onChangeModalSettings={setModalSettings}
                includeAirAbsorption={includeAirAbsorption}
                onChangeIncludeAirAbsorption={setIncludeAirAbsorption}
                selectedBand={selectedBand}
                onChangeSelectedBand={setSelectedBand}
                criticalDistance={activeCriticalDistance}
                visualizerSlot={
                  <RoomVisualizer
                    roomPolygon={roomPolygon}
                    geometry={geometry}
                    dimensions={dimensions}
                    sourceReceiver={sourceReceiver}
                    criticalDistance={activeCriticalDistance}
                    onChangeSourceReceiver={setSourceReceiver}
                    materials={materials}
                    onChangeMaterials={setMaterials}
                    selectedBand={selectedBand}
                  />
                }
              />
            </div>
          )}

          {/* 3. Materiales y Superficies */}
          {activeSection === 'materials' && (
            <div className="animate-fadeIn">
              <SurfaceMaterials
                materials={materials}
                onChangeMaterials={setMaterials}
                surfaceAreas={geometry.surfaceAreas}
                surfacesList={geometry.surfacesList}
                selectedBand={selectedBand}
                setSelectedBand={setSelectedBand}
                absorptionData={absorptionData}
                reverberationData={reverberationData}
                soundFieldData={soundFieldData}
              />
            </div>
          )}

          {/* 4. Fuente y Receptor */}
          {activeSection === 'source' && (
            <div className="animate-fadeIn">
              <SourceReceiver
                sourceReceiver={sourceReceiver}
                onChange={setSourceReceiver}
                includeAirAbsorption={includeAirAbsorption}
                setIncludeAirAbsorption={setIncludeAirAbsorption}
                criticalDistance={activeCriticalDistance}
                maxRoomDimension={maxRoomDimension}
                dimensions={dimensions}
                roomPolygon={roomPolygon}
                geometry={geometry}
                materials={materials}
                onChangeMaterials={setMaterials}
                selectedBand={selectedBand}
                soundFieldData={soundFieldData}
              />
            </div>
          )}

          {/* 5. Resultados y Tablas */}
          {activeSection === 'results' && (
            <div className="animate-fadeIn">
              <AcousticResults
                absorptionData={absorptionData}
                reverberationData={reverberationData}
                soundFieldData={soundFieldData}
                optimumRT={optimumRT}
                roomType={roomType}
                setRoomType={setRoomType}
                selectedBand={selectedBand}
                setSelectedBand={setSelectedBand}
                geometry={geometry}
                roomPolygon={roomPolygon}
                materials={materials}
              />
            </div>
          )}

          {/* 6. Gráficas Acústicas */}
          {activeSection === 'charts' && (
            <div className="animate-fadeIn">
              <AcousticCharts
                reverberationData={reverberationData}
                absorptionData={absorptionData}
                soundFieldData={soundFieldData}
                sourceReceiver={sourceReceiver}
                maxRoomDimension={maxRoomDimension}
                optimumRT={optimumRT}
                selectedBand={selectedBand}
                setSelectedBand={setSelectedBand}
                geometry={geometry}
                materials={materials}
              />
            </div>
          )}

          {/* 6. Acústica Ondulatoria y Modos Propios */}
          {activeSection === 'modes' && (
            <div className="animate-fadeIn">
              <ModesModule
                dimensions={modalDimensions}
                geometry={geometry}
                roomPolygon={roomPolygon}
                modes={calculatedModes}
                schroederData={schroederData}
                bonelloResult={bonelloResult}
                modalSettings={modalSettings}
                onUpdateModalSettings={setModalSettings}
                measurementData={measurementData}
                onUpdateMeasurementData={handleUpdateMeasurementData}
                comparisonData={comparisonData}
                onUpdateComparisonData={setComparisonData}
                sourceReceiver={sourceReceiver}
                onChangeSourceReceiver={setSourceReceiver}
                onApplyProportions={handleApplyProportions}
                onNavigateToGeometry={() => setActiveSection('geometry')}
              />
            </div>
          )}

          {/* 7. Inteligibilidad de la Palabra (%ALcons / Peutz / Logátomos) */}
          {activeSection === 'intelligibility' && (
            <div className="animate-fadeIn">
              <IntelligibilityModule
                geometry={geometry}
                absorptionData={absorptionData}
                reverberationData={reverberationData}
                soundFieldData={soundFieldData}
                materials={materials}
                onChangeMaterials={setMaterials}
                sourceReceiver={sourceReceiver}
                onLoadUsbPreset={() => handleLoadPreset('usb_medellin_example')}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {/* 8. Vista Completa (Todo el Estudio) */}
          {activeSection === 'all' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <RoomDimensions
                    roomPolygon={roomPolygon}
                    onChangePolygon={setRoomPolygon}
                    geometry={geometry}
                    materials={materials}
                    onChangeMaterials={setMaterials}
                    sourceReceiver={sourceReceiver}
                    onChangeSourceReceiver={setSourceReceiver}
                    roomType={roomType}
                    onChangeRoomType={setRoomType}
                    modalSettings={modalSettings}
                    onChangeModalSettings={setModalSettings}
                    includeAirAbsorption={includeAirAbsorption}
                    onChangeIncludeAirAbsorption={setIncludeAirAbsorption}
                    selectedBand={selectedBand}
                    onChangeSelectedBand={setSelectedBand}
                    criticalDistance={activeCriticalDistance}
                  />
                </div>
                <div className="lg:col-span-6">
                  <RoomVisualizer
                    roomPolygon={roomPolygon}
                    geometry={geometry}
                    dimensions={dimensions}
                    sourceReceiver={sourceReceiver}
                    criticalDistance={activeCriticalDistance}
                    onChangeSourceReceiver={setSourceReceiver}
                    materials={materials}
                    onChangeMaterials={setMaterials}
                    selectedBand={selectedBand}
                  />
                </div>
              </div>

              <SurfaceMaterials
                materials={materials}
                onChangeMaterials={setMaterials}
                surfaceAreas={geometry.surfaceAreas}
                surfacesList={geometry.surfacesList}
                selectedBand={selectedBand}
                setSelectedBand={setSelectedBand}
                absorptionData={absorptionData}
                reverberationData={reverberationData}
                soundFieldData={soundFieldData}
              />

              <SourceReceiver
                sourceReceiver={sourceReceiver}
                onChange={setSourceReceiver}
                includeAirAbsorption={includeAirAbsorption}
                setIncludeAirAbsorption={setIncludeAirAbsorption}
                criticalDistance={activeCriticalDistance}
                maxRoomDimension={maxRoomDimension}
                dimensions={dimensions}
                roomPolygon={roomPolygon}
                geometry={geometry}
                materials={materials}
                selectedBand={selectedBand}
              />

              <AcousticResults
                absorptionData={absorptionData}
                reverberationData={reverberationData}
                soundFieldData={soundFieldData}
                optimumRT={optimumRT}
                roomType={roomType}
                setRoomType={setRoomType}
                selectedBand={selectedBand}
                setSelectedBand={setSelectedBand}
                geometry={geometry}
                roomPolygon={roomPolygon}
                materials={materials}
              />

              <AcousticCharts
                reverberationData={reverberationData}
                absorptionData={absorptionData}
                soundFieldData={soundFieldData}
                sourceReceiver={sourceReceiver}
                maxRoomDimension={maxRoomDimension}
                optimumRT={optimumRT}
                selectedBand={selectedBand}
                setSelectedBand={setSelectedBand}
                geometry={geometry}
                materials={materials}
              />

              {/* Módulo Modal en la vista completa */}
              <div className="pt-6 border-t border-black/[0.08] dark:border-white/[0.08]">
                <ModesModule
                  dimensions={modalDimensions}
                  geometry={geometry}
                  roomPolygon={roomPolygon}
                  modes={calculatedModes}
                  schroederData={schroederData}
                  bonelloResult={bonelloResult}
                  modalSettings={modalSettings}
                  onUpdateModalSettings={setModalSettings}
                  measurementData={measurementData}
                  onUpdateMeasurementData={handleUpdateMeasurementData}
                  comparisonData={comparisonData}
                  onUpdateComparisonData={setComparisonData}
                  sourceReceiver={sourceReceiver}
                  onChangeSourceReceiver={setSourceReceiver}
                  onApplyProportions={handleApplyProportions}
                  onNavigateToGeometry={() => setActiveSection('geometry')}
                />
              </div>

              {/* Módulo de Inteligibilidad en la vista completa */}
              <div className="pt-6 border-t border-black/[0.08] dark:border-white/[0.08]">
                <IntelligibilityModule
                  geometry={geometry}
                  absorptionData={absorptionData}
                  reverberationData={reverberationData}
                  soundFieldData={soundFieldData}
                  materials={materials}
                  onChangeMaterials={setMaterials}
                  sourceReceiver={sourceReceiver}
                  onLoadUsbPreset={() => handleLoadPreset('usb_medellin_example')}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          )}

        </main>

        {/* Pie de Página */}
        <Footer />

      </div>

      {/* Modal de Informe Técnico */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        geometry={geometry}
        materials={materials}
        sourceReceiver={sourceReceiver}
        absorptionData={absorptionData}
        reverberationData={reverberationData}
        soundFieldData={soundFieldData}
        optimumRT={optimumRT}
        roomType={roomType}
        roomPolygon={roomPolygon}
        selectedBand={selectedBand}
        modalData={{
          dimensions: modalDimensions,
          modes: calculatedModes,
          schroederData,
          bonelloResult,
          modalSettings,
          measurementData,
          comparisonData,
        }}
      />

      {/* Modal de Formulario Físico */}
      <TheoryModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
      />

      {/* Modal de Exportación Excel / CSV / Copiar */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        geometry={geometry}
        dimensions={dimensions}
        sourceReceiver={sourceReceiver}
        absorptionData={absorptionData}
        reverberationData={reverberationData}
        soundFieldData={soundFieldData}
        roomPolygon={roomPolygon}
        materials={materials}
        modalData={{
          dimensions: modalDimensions,
          modes: calculatedModes,
          schroederData,
          bonelloResult,
          modalSettings,
          measurementData,
          comparisonData,
        }}
      />

    </div>
  );
}
