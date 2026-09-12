import React, { useState } from 'react';
import { 
  X, Printer, FileText, CheckCircle, Waves, Building,
  Users, UserCheck, Star, Plus, Trash2, Edit3, ShieldCheck,
  AlertTriangle, Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { OCTAVE_BANDS, ROOM_SURFACES } from '../utils/acousticCalculations';
import { getMaterialById } from '../utils/defaultMaterials';
import RoomVisualizer from './RoomVisualizer';

/**
 * Modal de Informe Técnico de Ingeniería Acústica
 * Incluye gestión de hasta 4 integrantes, designación de Líder firmante,
 * gráficos embebidos 3D y curvas RT60, y aislamiento absoluto de impresión.
 */
export default function ReportModal({
  isOpen,
  onClose,
  geometry,
  materials,
  sourceReceiver,
  absorptionData,
  reverberationData,
  soundFieldData,
  optimumRT,
  roomType,
  roomPolygon,
  selectedBand = 1000,
}) {
  // Estado de integrantes del informe (máximo 4)
  const [members, setMembers] = useState([
    { id: '1', name: 'Daniel Angulo', isLeader: true },
    { id: '2', name: 'Jeronimo Gomez', isLeader: false },
    { id: '3', name: 'Brandon Guerra', isLeader: false },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [showMemberEditor, setShowMemberEditor] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Asignar líder
  const handleSetLeader = (id) => {
    setMembers(prev => prev.map(m => ({
      ...m,
      isLeader: m.id === id,
    })));
  };

  // Actualizar nombre
  const handleUpdateName = (id, newName) => {
    setMembers(prev => prev.map(m => (m.id === id ? { ...m, name: newName } : m)));
  };

  // Añadir integrante
  const handleAddMember = (e) => {
    e?.preventDefault();
    if (!newMemberName.trim() || members.length >= 4) return;
    const newMember = {
      id: `m_${Date.now()}`,
      name: newMemberName.trim(),
      isLeader: members.length === 0,
    };
    setMembers(prev => [...prev, newMember]);
    setNewMemberName('');
  };

  // Eliminar integrante
  const handleRemoveMember = (id) => {
    if (members.length <= 1) return;
    setMembers(prev => {
      const filtered = prev.filter(m => m.id !== id);
      const hadLeader = prev.find(m => m.id === id)?.isLeader;
      if (hadLeader && filtered.length > 0) {
        filtered[0].isLeader = true;
      }
      return filtered;
    });
  };

  const leader = members.find(m => m.isLeader) || members[0] || { name: 'Daniel Angulo' };
  const coAuthors = members.filter(m => !m.isLeader);

  const rt500 = reverberationData[500] || { sabine: 0, eyring: 0, millington: 0 };
  const avgRT500 = (rt500.sabine + rt500.eyring) / 2;
  const isRTInOpt = avgRT500 >= optimumRT.min && avgRT500 <= optimumRT.max;
  const field1k = soundFieldData[1000] || {};

  const rtChartData = OCTAVE_BANDS.map((freq) => {
    const rt = reverberationData[freq] || {};
    return {
      frequency: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
      Sabine: Number((rt.sabine || 0).toFixed(2)),
      Eyring: Number((rt.eyring || 0).toFixed(2)),
      Millington: Number((rt.millington || 0).toFixed(2)),
      Optimo: Number((optimumRT.optimal || 0).toFixed(2)),
    };
  });

  const reportSurfaces = geometry?.surfacesList || ROOM_SURFACES;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print-modal-container">
      
      {/* Contenedor del Modal */}
      <div 
        id="printable-report-modal"
        className="bg-white dark:bg-[#121322] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-apple-lg w-full max-w-4xl max-h-[92vh] overflow-y-auto print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black print:overflow-visible"
      >
        
        {/* Barra Superior de Acciones (Oculta en Impresión) */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121322]/95 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] px-3.5 sm:px-6 py-3 sm:py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#5833c7]/10 dark:bg-[#8767f9]/20 text-[#5833c7] dark:text-[#8767f9] flex items-center justify-center font-bold shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white truncate">
                Informe Técnico de Simulación Acústica
              </h3>
              <p className="text-[10.5px] sm:text-[11px] text-[#86868b] dark:text-slate-400 truncate">
                Firma oficial: <strong className="text-[#5833c7] dark:text-[#8767f9]">{leader.name} (Líder)</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowMemberEditor(!showMemberEditor)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-[#e8e8ed] text-xs font-semibold text-[#1d1d1f] dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.08] transition"
              title="Configurar los integrantes y el líder firmante"
            >
              <Users className="w-3.5 h-3.5 text-[#5833c7] dark:text-[#8767f9]" />
              <span className="hidden sm:inline">Integrantes</span> ({members.length}/4)
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-xl bg-[#5833c7] hover:bg-[#4726aa] text-white text-xs font-semibold shadow-apple-sm transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span><span className="hidden sm:inline">Imprimir / </span>PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1e30] hover:bg-[#e8e8ed] text-slate-500 hover:text-black transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel de Configuración de Integrantes (Solo visible en pantalla) */}
        {showMemberEditor && (
          <div className="bg-[#f5f5f7] dark:bg-[#161726] p-4 border-b border-black/[0.06] dark:border-white/[0.08] print:hidden animate-fadeIn space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#5833c7]" />
                Integrantes del Informe (Máximo 4) · Selecciona el icono de estrella para designar al Líder
              </span>
              <span className="text-[11px] text-[#86868b] font-mono">{members.length} de 4 alumnos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {members.map((m, idx) => (
                <div 
                  key={m.id}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                    m.isLeader 
                      ? 'bg-white dark:bg-[#1f2136] border-[#5833c7] dark:border-[#8767f9] shadow-2xs' 
                      : 'bg-white/70 dark:bg-[#1a1c2e] border-black/[0.06] dark:border-white/[0.06]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSetLeader(m.id)}
                    className={`p-1.5 rounded-lg transition ${
                      m.isLeader 
                        ? 'bg-amber-500 text-white shadow-xs' 
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-400 hover:text-amber-500'
                    }`}
                    title={m.isLeader ? "Líder encargado (Firma el informe)" : "Hacer líder a este integrante"}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => handleUpdateName(m.id, e.target.value)}
                    className="flex-1 bg-transparent text-xs font-semibold text-[#1d1d1f] dark:text-white outline-none border-b border-transparent focus:border-[#5833c7]"
                    placeholder="Nombre del alumno..."
                  />

                  {m.isLeader && (
                    <span className="px-1.5 py-0.5 rounded bg-[#5833c7]/10 text-[#5833c7] dark:text-[#8767f9] text-[9.5px] font-bold">
                      Líder
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.id)}
                    disabled={members.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-20 transition"
                    title="Eliminar integrante"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Formulario para agregar nuevo integrante */}
            {members.length < 4 && (
              <form onSubmit={handleAddMember} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Nombre y apellido del nuevo integrante..."
                  className="flex-1 bg-white dark:bg-[#1a1c2e] px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-[#5833c7]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5833c7] text-white text-xs font-semibold shadow-2xs hover:bg-[#4726aa] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================
            HOJA DEL INFORME TÉCNICO OFICIAL (Optimizado para Impresión A4)
            ======================================================================== */}
        <div className="p-6 sm:p-10 space-y-6 print:p-0 print:space-y-5 text-[#1d1d1f] font-sans">
          
          {/* Encabezado Institucional del Reporte */}
          <div className="border-b-2 border-[#5833c7] pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="text-[11px] uppercase font-extrabold tracking-widest text-[#5833c7]">
                POZOLE • Propagación de Ondas en Zonas y Optimización de Límites Espaciales
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1d1d1f] dark:text-white mt-1">
                REPORTE DE CAMPO SONORO Y REVERBERACIÓN
              </h1>
              <p className="text-xs text-[#86868b] dark:text-slate-400 mt-1">
                Modelos de Sabine • Norris-Eyring • Millington-Sette • Campo Directo y Reverberado
              </p>
            </div>

            {/* Datos de los Integrantes y Líder */}
            <div className="text-left sm:text-right text-xs font-mono text-[#86868b] dark:text-slate-400">
              <div>Fecha: <strong className="text-[#1d1d1f] dark:text-white">{new Date().toLocaleDateString('es-ES')}</strong></div>
              <div className="font-bold text-[#5833c7] dark:text-[#8767f9] mt-1">
                Líder / Encargado: <span className="underline decoration-1">{leader.name}</span>
              </div>
              {coAuthors.length > 0 && (
                <div className="text-[11px] text-[#1d1d1f] dark:text-slate-300 mt-0.5">
                  Co-autores: {coAuthors.map(c => c.name).join(', ')}
                </div>
              )}
              <div className="text-[10px] text-[#86868b] mt-0.5">Curso de Acústica de Recintos</div>
            </div>
          </div>

          {/* 1. Características Geométricas */}
          <div className="print-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5833c7] mb-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-1">
              1. Características Geométricas de la Sala ({reportSurfaces.length - 2} Paredes Extruidas)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#f5f5f7] dark:bg-[#18192a] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[#86868b] dark:text-slate-400 block mb-0.5">Dimensiones (L × W × H):</span>
                <strong className="font-mono text-[#1d1d1f] dark:text-white font-bold">
                  {geometry.length.toFixed(1)}m × {geometry.width.toFixed(1)}m × {geometry.height.toFixed(1)}m
                </strong>
              </div>
              <div className="bg-[#f5f5f7] dark:bg-[#18192a] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[#86868b] dark:text-slate-400 block mb-0.5">Volumen de Sala (V):</span>
                <strong className="font-mono text-[#5833c7] dark:text-[#8767f9] font-bold">
                  {geometry.volume.toFixed(2)} m³
                </strong>
              </div>
              <div className="bg-[#f5f5f7] dark:bg-[#18192a] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[#86868b] dark:text-slate-400 block mb-0.5">Superficie Total (S):</span>
                <strong className="font-mono text-[#1d1d1f] dark:text-white font-bold">
                  {geometry.totalSurfaceArea.toFixed(2)} m²
                </strong>
              </div>
              <div className="bg-[#f5f5f7] dark:bg-[#18192a] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[#86868b] dark:text-slate-400 block mb-0.5">Recorrido Libre (l):</span>
                <strong className="font-mono text-[#1d1d1f] dark:text-white font-bold">
                  {geometry.meanFreePath.toFixed(2)} m
                </strong>
              </div>
            </div>
          </div>

          {/* 2. Materiales Asignados por Cara */}
          <div className="print-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5833c7] mb-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-1">
              2. Materiales y Coeficientes de Absorción por Superficie
            </h2>
            <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f5f7] dark:bg-[#18192a] text-[10px] uppercase font-mono text-[#86868b] dark:text-slate-400">
                  <tr>
                    <th className="p-2.5">Superficie</th>
                    <th className="p-2.5 text-right">Área (m²)</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 text-right">125 Hz</th>
                    <th className="p-2.5 text-right">250 Hz</th>
                    <th className="p-2.5 text-right">500 Hz</th>
                    <th className="p-2.5 text-right">1 kHz</th>
                    <th className="p-2.5 text-right">2 kHz</th>
                    <th className="p-2.5 text-right">4 kHz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] font-mono text-[11px]">
                  {reportSurfaces.map((surf) => {
                    const area = geometry.surfaceAreas[surf.id] || 0;
                    const matConfig = materials[surf.id] || {};
                    const matMeta = getMaterialById(matConfig.materialId);
                    const coeffs = matConfig.coefficients || {};

                    return (
                      <tr key={surf.id}>
                        <td className="p-2.5 font-sans font-semibold text-[#1d1d1f] dark:text-white">
                          {surf.name}
                        </td>
                        <td className="p-2.5 text-right text-[#86868b] dark:text-slate-400">
                          {area.toFixed(2)}
                        </td>
                        <td className="p-2.5 font-sans text-[#1d1d1f] dark:text-slate-300 truncate max-w-[140px]">
                          {matMeta.name}
                        </td>
                        {OCTAVE_BANDS.map((f) => (
                          <td key={f} className="p-2.5 text-right text-[#1d1d1f] dark:text-white">
                            {(coeffs[f] || 0.05).toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Resultados Acústicos Comparativos */}
          <div className="print-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5833c7] mb-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-1">
              3. Resultados Acústicos y Comparativa por Frecuencia
            </h2>
            <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#f5f5f7] dark:bg-[#18192a] text-[10px] uppercase text-[#86868b] dark:text-slate-400">
                  <tr>
                    <th className="p-2.5">Banda</th>
                    <th className="p-2.5 text-right">Absorción A</th>
                    <th className="p-2.5 text-right">Coef. ᾱ</th>
                    <th className="p-2.5 text-right">Constante R</th>
                    <th className="p-2.5 text-right text-[#5833c7]">RT Sabine</th>
                    <th className="p-2.5 text-right text-indigo-600">RT Eyring</th>
                    <th className="p-2.5 text-right text-emerald-600">RT Millington</th>
                    <th className="p-2.5 text-right">Dc (m)</th>
                    <th className="p-2.5 text-right">Lp Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] text-[11px]">
                  {OCTAVE_BANDS.map((freq) => {
                    const abs = absorptionData[freq] || {};
                    const rt = reverberationData[freq] || {};
                    const sf = soundFieldData[freq] || {};

                    return (
                      <tr key={freq}>
                        <td className="p-2.5 font-bold text-[#1d1d1f] dark:text-white">{freq} Hz</td>
                        <td className="p-2.5 text-right">{abs.equivalentAbsorption?.toFixed(2)} m²</td>
                        <td className="p-2.5 text-right">{abs.alphaMean?.toFixed(3)}</td>
                        <td className="p-2.5 text-right">{sf.roomConstant?.toFixed(1)} m²</td>
                        <td className="p-2.5 text-right font-bold text-[#5833c7] dark:text-[#8767f9]">{rt.sabine?.toFixed(2)} s</td>
                        <td className="p-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">{rt.eyring?.toFixed(2)} s</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{rt.millington?.toFixed(2)} s</td>
                        <td className="p-2.5 text-right">{sf.criticalDistance?.toFixed(2)} m</td>
                        <td className="p-2.5 text-right font-bold text-[#1d1d1f] dark:text-white">{sf.lpTotalWithAir?.toFixed(1)} dB</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3.1 Gráficas Técnicas: Curvas RT60 y Modelo Espacial 3D */}
          <div className="print-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5833c7] mb-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-1">
              3.1 Gráficas Técnicas: Curvas RT60 y Modelo Espacial 3D
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Curvas RT60 */}
              <div className="bg-[#f5f5f7] dark:bg-[#18192a] p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] print:bg-white print:border-black/20">
                <div className="text-[11px] font-bold text-[#1d1d1f] dark:text-white mb-1 flex items-center justify-between">
                  <span>Curvas RT60 vs Frecuencia</span>
                  <span className="text-[10px] text-[#86868b] font-mono">Sabine / Eyring / Millington</span>
                </div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rtChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" className="dark:stroke-white/10" />
                      <XAxis dataKey="frequency" tick={{ fontSize: 9, fill: '#86868b' }} tickLine={false} />
                      <YAxis unit="s" tick={{ fontSize: 9, fill: '#86868b' }} tickLine={false} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line type="monotone" dataKey="Sabine" name="Sabine" stroke="#5833c7" strokeWidth={2.2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Eyring" name="Eyring" stroke="#10b981" strokeWidth={1.8} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Millington" name="Millington" stroke="#f59e0b" strokeWidth={1.8} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Optimo" name="Óptimo" stroke="#ff3b30" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Modelo Espacial 3D */}
              <div className="bg-[#f5f5f7] dark:bg-[#18192a] p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] print:bg-white print:border-black/20 flex flex-col">
                <div className="text-[11px] font-bold text-[#1d1d1f] dark:text-white mb-1 flex items-center justify-between">
                  <span>Modelo Espacial 3D</span>
                  <span className="text-[10px] text-[#86868b] font-mono">
                    {geometry.length}m × {geometry.width}m × {geometry.height}m
                  </span>
                </div>
                <div className="h-52 w-full rounded-xl overflow-hidden bg-white dark:bg-[#0c0d18] border border-black/[0.06] dark:border-white/[0.08] relative print:border-black/20">
                  <RoomVisualizer
                    roomPolygon={roomPolygon || {
                      vertices: [
                        { x: 0, y: 0 },
                        { x: geometry.length, y: 0 },
                        { x: geometry.length, y: geometry.width },
                        { x: 0, y: geometry.width }
                      ],
                      height: geometry.height
                    }}
                    geometry={geometry}
                    sourceReceiver={sourceReceiver}
                    criticalDistance={field1k.criticalDistance}
                    materials={materials}
                    selectedBand={selectedBand}
                    isReportGraphic={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Diagnóstico y Veredicto */}
          <div className="bg-[#f5f5f7] dark:bg-[#161726] p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] text-xs print-avoid-break">
            <h3 className="font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider mb-2">
              4. Diagnóstico y Veredicto Acústico
            </h3>
            <div className="space-y-2 text-[#1d1d1f] dark:text-slate-300">
              <p>
                • <strong>Condiciones de Emisión:</strong> Fuente sonora con Lw = {sourceReceiver.lw} dB (Directividad Q = {sourceReceiver.directivity}) a distancia r = {sourceReceiver.distance} m.
              </p>
              <p>
                • <strong>Distancia Crítica (@ 1 kHz):</strong> Dc = {field1k.criticalDistance?.toFixed(2)} m. El receptor está a r = {sourceReceiver.distance} m, ubicándose en zona de <strong>{sourceReceiver.distance < field1k.criticalDistance ? 'Campo Directo' : 'Campo Reverberado'}</strong>.
              </p>
              <p>
                • <strong>Tiempo de Reverberación Promedio (500-1000 Hz):</strong> ≈ {avgRT500.toFixed(2)} s. 
                Objetivo para uso tipo "{roomType}": <strong>{optimumRT.min}s a {optimumRT.max}s</strong> (Óptimo teórico: {optimumRT.optimal}s).
              </p>
              <div className="mt-2 font-semibold text-[#5833c7] dark:text-[#8767f9] flex items-center gap-1.5">
                {isRTInOpt ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>El recinto cumple satisfactoriamente los criterios de inteligibilidad y confort acústico según ISO 3382 / DIN 18041.</span>
                  </>
                ) : avgRT500 > optimumRT.max ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Tiempo de reverberación elevado. Se recomienda añadir material fonoabsorbente (ej. paneles de lana de roca o plafón acústico).</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Recinto excesivamente seco para actividades musicales. Recomendado aumentar reflectividad.</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 5. Firmas Oficiales de Validación */}
          <div className="pt-8 border-t border-black/[0.08] dark:border-white/[0.08] print-avoid-break">
            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              {/* Firma del Líder / Encargado */}
              <div>
                <div className="border-b border-black/[0.3] dark:border-white/[0.3] w-56 mx-auto mb-2 h-10 flex items-end justify-center pb-1">
                  <span className="font-serif italic font-semibold text-sm text-[#1d1d1f] dark:text-white">
                    {leader.name}
                  </span>
                </div>
                <strong className="text-[#1d1d1f] dark:text-white block text-xs">{leader.name}</strong>
                <span className="text-[11px] text-[#5833c7] dark:text-[#8767f9] font-semibold block">
                  Líder / Encargado del Proyecto
                </span>
                <span className="text-[10px] text-[#86868b] dark:text-slate-400 block font-mono">
                  Estudiante de Ingeniería de Sonido
                </span>
              </div>

              {/* Firma del Docente / Revisor */}
              <div>
                <div className="border-b border-black/[0.3] dark:border-white/[0.3] w-56 mx-auto mb-2 h-10"></div>
                <strong className="text-[#1d1d1f] dark:text-white block text-xs">Docente / Revisor Técnico</strong>
                <span className="text-[11px] text-slate-500 block">Cátedra de Acústica de Recintos</span>
                <span className="text-[10px] text-[#86868b] dark:text-slate-400 block font-mono">
                  Evaluación y Aprobación
                </span>
              </div>
            </div>

            {/* Listado de co-autores al pie si los hay */}
            {coAuthors.length > 0 && (
              <div className="mt-4 text-center text-[10px] text-[#86868b] dark:text-slate-400">
                Co-autores y equipo de trabajo: {coAuthors.map(c => c.name).join(' · ')}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
