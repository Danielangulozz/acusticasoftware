import React, { useState, useMemo, useCallback } from 'react';
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

import {
  OCTAVE_BANDS,
  calculateRoomGeometry,
  calculateRoomAbsorption,
  calculateReverberationTimes,
  calculateRoomConstant,
  calculateCriticalDistance,
  calculateSoundFieldAtDistance,
  getOptimumReverberationTime,
  AIR_ABSORPTION_COEFFS,
} from './utils/acousticCalculations';
import { getDefaultRoomMaterials } from './utils/defaultMaterials';
import { ROOM_PRESETS } from './utils/roomPresets';

/**
 * Componente Principal de la Suite Acústica
 * Diseño Minimalista estilo Apple / Tesla con Navegación por Sidebar y Google Fonts
 */
export default function App() {
  // Estado de navegación lateral (abierto por defecto en pantallas grandes >= 1024px)
  const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'geometry', 'materials', 'source', 'results', 'charts', 'all'
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  // 1. Dimensiones de la Sala (m)
  const [dimensions, setDimensions] = useState({
    length: 10.0,
    width: 6.0,
    height: 3.0,
  });

  // 2. Materiales y coeficientes de absorción
  const [materials, setMaterials] = useState(getDefaultRoomMaterials());

  // 3. Fuente Sonora y Receptor
  const [sourceReceiver, setSourceReceiver] = useState({
    lw: 90.0,         // Nivel de potencia acústica (dB)
    directivity: 1,   // Directividad Q (1, 2, 4, 8)
    distance: 3.0,    // Distancia r (m)
    name: 'Fuente Omnidireccional',
  });

  // 4. Parámetros de Simulación
  const [includeAirAbsorption, setIncludeAirAbsorption] = useState(true);
  const [roomType, setRoomType] = useState('speech'); // 'speech', 'music', 'studio', 'multipurpose'
  const [selectedBand, setSelectedBand] = useState(1000);
  const [selectedPresetId, setSelectedPresetId] = useState('');

  // Modales
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // ============================================================================
  // CÁLCULOS FÍSICOS REACTIVOS
  // ============================================================================

  // 1. Geometría ortogonal
  const geometry = useMemo(() => {
    return calculateRoomGeometry(dimensions.length, dimensions.width, dimensions.height);
  }, [dimensions.length, dimensions.width, dimensions.height]);

  // 2. Absorción equivalente A(f) y coeficiente medio ā(f)
  const absorptionData = useMemo(() => {
    return calculateRoomAbsorption(
      geometry.surfaceAreas,
      geometry.totalSurfaceArea,
      materials
    );
  }, [geometry.surfaceAreas, geometry.totalSurfaceArea, materials]);

  // 3. Tiempos de Reverberación RT60 (Sabine, Norris-Eyring, Millington-Sette)
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

  // 4. Campo Sonoro, Constante de Sala R, Distancia Crítica Dc y Lp(r)
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

      results[freq] = {
        ...field,
        roomConstant: R,
      };
    });

    return results;
  }, [
    absorptionData,
    sourceReceiver.lw,
    sourceReceiver.directivity,
    sourceReceiver.distance,
    includeAirAbsorption,
  ]);

  // 5. Tiempo de reverberación óptimo de diseño según volumen y uso
  const optimumRT = useMemo(() => {
    return getOptimumReverberationTime(geometry.volume, roomType);
  }, [geometry.volume, roomType]);

  const activeCriticalDistance = soundFieldData[selectedBand]?.criticalDistance || 2.5;
  const maxRoomDimension = Math.sqrt(
    dimensions.length * dimensions.length +
    dimensions.width * dimensions.width +
    dimensions.height * dimensions.height
  );

  const rt500Sabine = reverberationData[500]?.sabine || 0;

  // ============================================================================
  // ACCIONES Y EXPORTACIONES
  // ============================================================================

  const handleLoadPreset = useCallback((presetId) => {
    const preset = ROOM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setDimensions({ ...preset.dimensions });
      setMaterials({ ...preset.materials });
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
    setDimensions({ length: 10.0, width: 6.0, height: 3.0 });
    setMaterials(getDefaultRoomMaterials());
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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased flex flex-col lg:flex-row">

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
      />

      {/* Área de Contenido Principal (margen dinámico según estado del Sidebar) */}
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
        />

        {/* Contenido Dinámico según la Sección Seleccionada */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* 1. Panel General / Overview */}
          {activeSection === 'overview' && (
            <OverviewDashboard
              geometry={geometry}
              dimensions={dimensions}
              sourceReceiver={sourceReceiver}
              absorptionData={absorptionData}
              reverberationData={reverberationData}
              soundFieldData={soundFieldData}
              optimumRT={optimumRT}
              criticalDistance={activeCriticalDistance}
              setActiveSection={setActiveSection}
              onOpenReport={() => setIsReportOpen(true)}
            />
          )}

          {/* 2. Geometría y Sala */}
          {activeSection === 'geometry' && (
            <div className="space-y-6 animate-fadeIn">
              <RoomDimensions
                dimensions={dimensions}
                onChange={setDimensions}
                geometry={geometry}
              />
              <RoomVisualizer
                dimensions={dimensions}
                sourceReceiver={sourceReceiver}
                criticalDistance={activeCriticalDistance}
                onChangeSourceReceiver={setSourceReceiver}
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
              />
            </div>
          )}

          {/* 7. Vista Completa (Todo el Estudio) */}
          {activeSection === 'all' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <RoomDimensions
                    dimensions={dimensions}
                    onChange={setDimensions}
                    geometry={geometry}
                  />
                </div>
                <div className="lg:col-span-6">
                  <RoomVisualizer
                    dimensions={dimensions}
                    sourceReceiver={sourceReceiver}
                    criticalDistance={activeCriticalDistance}
                    onChangeSourceReceiver={setSourceReceiver}
                  />
                </div>
              </div>

              <SurfaceMaterials
                materials={materials}
                onChangeMaterials={setMaterials}
                surfaceAreas={geometry.surfaceAreas}
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
              />
            </div>
          )}

        </main>

        {/* Pie de Página */}
        <footer className="border-t border-black/[0.06] bg-white py-6 text-center text-xs text-[#86868b] mt-auto no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
              <span className="font-extrabold text-[#1d1d1f] tracking-wide">POZOLE</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-[#86868b]">
                Propagación de Ondas en Zonas y Optimización de Límites Espaciales
              </span>
            </div>

            {/* Integrantes del Equipo (3 personas) */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-bold text-[#1d1d1f] mr-1">Integrantes:</span>
              <span className="px-3 py-1 rounded-xl bg-[#f5f5f7] border border-black/[0.06] font-mono text-[11px] font-bold text-[#1d1d1f] shadow-2xs hover:border-[#0071e3]/40 transition">
                Daniel Angulo
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#f5f5f7] border border-black/[0.06] font-mono text-[11px] font-bold text-[#1d1d1f] shadow-2xs hover:border-[#0071e3]/40 transition">
                Jeronimo Gomez
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#f5f5f7] border border-black/[0.06] font-mono text-[11px] font-bold text-[#1d1d1f] shadow-2xs hover:border-[#0071e3]/40 transition">
                Brandon Guerra
              </span>
            </div>
          </div>
        </footer>

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
      />

    </div>
  );
}
