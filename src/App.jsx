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

  // 1. Polígono de planta libre + altura + curvaturas
  const [roomPolygon, setRoomPolygon] = useState({
    vertices: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 6 },
      { x: 0, y: 6 },
    ],
    height: 3.0,
    curvatures: {},
  });

  // 2. Materiales y coeficientes de absorción (dinámicos según el número de paredes)
  const [materials, setMaterials] = useState(() => getDefaultPolygonMaterials(4));

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
  const [sourceReceiver, setSourceReceiver] = useState({
    lw: 90.0,
    directivity: 1,
    distance: 3.0,
    name: 'Fuente Omnidireccional',
  });

  // 4. Parámetros de Simulación
  const [includeAirAbsorption, setIncludeAirAbsorption] = useState(true);
  const [roomType, setRoomType] = useState('speech');
  const [selectedBand, setSelectedBand] = useState(1000);
  const [selectedPresetId, setSelectedPresetId] = useState('');

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
    }
  }, []);

  const handleReset = useCallback(() => {
    setRoomPolygon({
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 6 },
        { x: 0, y: 6 },
      ],
      height: 3.0,
    });
    setMaterials(getDefaultPolygonMaterials(4));
    setSourceReceiver({
      lw: 90.0,
      directivity: 1,
      distance: 3.0,
      name: 'Fuente Omnidireccional',
    });
    setRoomType('speech');
    setSelectedPresetId('');
    setSelectedBand(1000);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#090a10] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans antialiased flex flex-col lg:flex-row transition-colors duration-200">

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
        />

        {/* Contenido Dinámico según la Sección Seleccionada */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

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
              selectedBand={selectedBand}
              onChangeSourceReceiver={setSourceReceiver}
            />
          )}

          {/* 2. Geometría y Sala */}
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
                selectedBand={selectedBand}
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

          {/* 7. Vista Completa (Todo el Estudio) */}
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
      />

    </div>
  );
}
