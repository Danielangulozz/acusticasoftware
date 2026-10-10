import React, { useState, useMemo } from 'react';
import {
  Download,
  Filter,
  Search,
  ArrowUpDown,
  Layers,
  ChevronDown,
  Eye,
  Activity,
  Sparkles,
  Info
} from 'lucide-react';
import { downloadCsv } from '../../utils/csvUtils';

/**
 * Tabla interactiva y exhaustiva de Modos Propios (Normales de Vibración)
 */
export default function ModesTable({
  modes = [],
  selectedMode = null,
  onSelectMode = () => {},
  onSelectModeTime = () => {},
  schroederFreq = 385,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'axial' | 'tangential' | 'oblique'
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('frequency');
  const [sortAsc, setSortAsc] = useState(true);
  const [onlyBelowSchroeder, setOnlyBelowSchroeder] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filtrado y ordenamiento de modos
  const filteredModes = useMemo(() => {
    return modes.filter(m => {
      if (filterType !== 'all' && m.type !== filterType) return false;
      if (onlyBelowSchroeder && m.frequency > schroederFreq) return false;
      if (search) {
        const query = search.toLowerCase();
        const modeStr = `(${m.nx},${m.ny},${m.nz})`;
        const freqStr = `${m.frequency}`;
        const typeStr = m.label.toLowerCase();
        const detailStr = (m.detail || '').toLowerCase();
        if (!modeStr.includes(query) && !freqStr.includes(query) && !typeStr.includes(query) && !detailStr.includes(query)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'indices') {
        valA = a.nx * 10000 + a.ny * 100 + a.nz;
        valB = b.nx * 10000 + b.ny * 100 + b.nz;
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [modes, filterType, search, sortField, sortAsc, onlyBelowSchroeder, schroederFreq]);

  const totalPages = Math.max(1, Math.ceil(filteredModes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedModes = filteredModes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      '#',
      'nx',
      'ny',
      'nz',
      'Frecuencia f (Hz)',
      'Tipo de Modo',
      'Detalle',
      'kx (rad/m)',
      'ky (rad/m)',
      'kz (rad/m)',
      'k total (rad/m)',
      'Peso Energético'
    ];
    const rows = [headers];
    filteredModes.forEach(m => {
      rows.push([
        m.index,
        m.nx,
        m.ny,
        m.nz,
        m.frequency.toFixed(2),
        m.label,
        m.detail || '',
        m.kVector?.kx.toFixed(3) || '',
        m.kVector?.ky.toFixed(3) || '',
        m.kVector?.kz.toFixed(3) || '',
        m.kVector?.k.toFixed(3) || '',
        m.weight
      ]);
    });
    downloadCsv(rows, `POZOLE_Modos_Propios_${filteredModes.length}_modos.csv`, ';');
  };

  const countAxial = modes.filter(m => m.type === 'axial').length;
  const countTangential = modes.filter(m => m.type === 'tangential').length;
  const countOblique = modes.filter(m => m.type === 'oblique').length;

  return (
    <div className="bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6 shadow-apple-sm transition-colors">
      
      {/* Encabezado y Acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white">
              Catálogo de Modos Propios Calculados
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] dark:text-slate-400 mt-1">
            Total calculados: <strong className="text-[#1d1d1f] dark:text-white font-mono">{modes.length}</strong> modos &bull; Axiales: <strong className="text-[#5833c7] font-mono">{countAxial}</strong> &bull; Tangenciales: <strong className="text-[#10b981] font-mono">{countTangential}</strong> &bull; Oblicuos: <strong className="text-[#f59e0b] font-mono">{countOblique}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#1c1d2d] hover:bg-[#e8e8ed] dark:hover:bg-[#25263a] text-xs font-semibold text-[#1d1d1f] dark:text-white border border-black/[0.05] dark:border-white/[0.08] transition-all"
          >
            <Download className="w-4 h-4 text-[#5833c7]" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
          <input
            type="text"
            placeholder="Buscar por índice (1,0,0) o Hz..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#5833c7]"
          />
        </div>

        {/* Tipo de Modo */}
        <div className="flex items-center gap-1 bg-[#fbfbfd] dark:bg-[#18192a] p-1 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-xs">
          <button
            onClick={() => { setFilterType('all'); setPage(1); }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${filterType === 'all' ? 'bg-white dark:bg-[#25263a] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-[#86868b]'}`}
          >
            Todos
          </button>
          <button
            onClick={() => { setFilterType('axial'); setPage(1); }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${filterType === 'axial' ? 'bg-[#5833c7] text-white shadow-sm' : 'text-[#86868b]'}`}
          >
            Axial
          </button>
          <button
            onClick={() => { setFilterType('tangential'); setPage(1); }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${filterType === 'tangential' ? 'bg-[#10b981] text-white shadow-sm' : 'text-[#86868b]'}`}
          >
            Tang.
          </button>
          <button
            onClick={() => { setFilterType('oblique'); setPage(1); }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${filterType === 'oblique' ? 'bg-[#f59e0b] text-white shadow-sm' : 'text-[#86868b]'}`}
          >
            Oblic.
          </button>
        </div>

        {/* Checkbox sólo bajo Schroeder */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-xs text-[#1d1d1f] dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyBelowSchroeder}
            onChange={(e) => { setOnlyBelowSchroeder(e.target.checked); setPage(1); }}
            className="rounded border-gray-400 text-[#5833c7] focus:ring-[#5833c7]"
          />
          <span>Solo f ≤ fs ({schroederFreq} Hz)</span>
        </label>

        {/* Estado y contador */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.08] dark:border-white/[0.08] text-xs text-[#86868b]">
          <span>Coincidencias:</span>
          <span className="font-bold text-[#1d1d1f] dark:text-white font-mono">{filteredModes.length}</span>
        </div>
      </div>

      {/* Tabla de Modos */}
      <div className="overflow-x-auto mt-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f5f5f7] dark:bg-[#18192a] text-[#86868b] dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-black/[0.06] dark:border-white/[0.06]">
            <tr>
              <th className="py-3 px-3 text-center w-12">#</th>
              <th className="py-3 px-3 cursor-pointer select-none hover:text-[#1d1d1f] dark:hover:text-white" onClick={() => handleSort('indices')}>
                <div className="flex items-center gap-1">
                  <span>(nx, ny, nz)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer select-none hover:text-[#1d1d1f] dark:hover:text-white" onClick={() => handleSort('frequency')}>
                <div className="flex items-center gap-1">
                  <span>Frecuencia (Hz)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer select-none hover:text-[#1d1d1f] dark:hover:text-white" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">
                  <span>Clasificación</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">Vector de Onda k (rad/m)</th>
              <th className="py-3 px-3 text-center">Peso E.</th>
              <th className="py-3 px-3 text-center">Visualizar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] font-mono">
            {paginatedModes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#86868b] font-sans">
                  No se encontraron modos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paginatedModes.map((m) => {
                const isSelected = selectedMode && selectedMode.id === m.id;
                const isUnderSchroeder = m.frequency <= schroederFreq;

                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMode(m)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#5833c7]/15 dark:bg-[#5833c7]/25 font-bold'
                        : 'hover:bg-[#fbfbfd] dark:hover:bg-[#18192a]'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-[#86868b]">{m.index}</td>
                    <td className="py-2.5 px-3 font-bold text-[#1d1d1f] dark:text-white">
                      ({m.nx}, {m.ny}, {m.nz})
                    </td>
                    <td className="py-2.5 px-3 text-sm font-black">
                      <span className={isUnderSchroeder ? 'text-[#0071e3] dark:text-sky-400' : 'text-[#86868b]'}>
                        {m.frequency.toFixed(2)} Hz
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{
                          backgroundColor: `${m.color}20`,
                          color: m.color,
                        }}
                      >
                        {m.detail || m.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#86868b] text-[11px]">
                      kx={m.kVector?.kx.toFixed(2)}, ky={m.kVector?.ky.toFixed(2)}, kz={m.kVector?.kz.toFixed(2)} &bull; |k|={m.kVector?.k.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#86868b] text-xs">
                      {m.weight === 1.0 ? '1.0 (0 dB)' : m.weight === 0.5 ? '0.5 (-3 dB)' : '0.25 (-6 dB)'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMode(m);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-[#5833c7] text-white shadow-sm'
                              : 'bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-[#5833c7]/10'
                          }`}
                          title="Ver en Visor Espacial 2D"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectModeTime(m);
                          }}
                          className="p-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#1c1d2d] text-[#86868b] hover:text-[#5833c7] hover:bg-[#5833c7]/10 transition-all"
                          title="Ver en Dominio del Tiempo p(t)"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-[#86868b]">
          <div>
            Página <strong className="text-[#1d1d1f] dark:text-white">{currentPage}</strong> de {totalPages} ({filteredModes.length} modos)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] disabled:opacity-40 font-medium hover:bg-[#e8e8ed] dark:hover:bg-[#25263a] transition-all"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#18192a] disabled:opacity-40 font-medium hover:bg-[#e8e8ed] dark:hover:bg-[#25263a] transition-all"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
