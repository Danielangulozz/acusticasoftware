import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts';
import { Download, FileCode2, RotateCcw, BookOpen, AlertTriangle, Info, Grid3x3 } from 'lucide-react';
import { ProfileView, IsoView, PolarPlot, HemisphereMap, diffuserPalette } from './DiffuserViews';
import {
  designDiffuser,
  surfaceElements,
  flatElements,
  polarResponse,
  defaultAngles,
  diffusionCoefficient,
  normalizedDiffusion,
  frequencySweep,
  hemisphereMap,
  fabricationList,
  primitiveRoots,
  suggestedPrime,
  MLS_ORDERS,
} from '../../utils/diffuserCalculations';

/**
 * Módulo 8 — Diseño de Difusores
 * QRD 1D/2D, PRD, MLS y policilíndrico según la clase de Diseño de Difusores,
 * con respuesta polar (Fraunhofer), coeficiente de difusión (AES-4id) y lista de corte.
 */

const TYPES = [
  { id: 'qrd', label: 'QRD 1D', hint: 'sₙ = n² mod p' },
  { id: 'qrd2d', label: 'QRD 2D', hint: 'sₘₙ = (m² + n²) mod p' },
  { id: 'prd', label: 'PRD', hint: 'sₙ = gⁿ mod p' },
  { id: 'mls', label: 'MLS', hint: 'binaria 2ᵐ − 1' },
  { id: 'poly', label: 'Policilíndrico', hint: 'R < 5 m' },
];

const DEFAULTS = {
  type: 'qrd',
  f0: 500,
  fMax: 2000,
  c: 343,
  Tmm: 5,
  lobeOrder: 2,
  periods: 1,
  primeOverride: 0,
  g: 0,
  mlsOrder: 4,
  panelHeight: 60,
  poly: { radius: 1.2, chord: 0.6, count: 4 },
};

// Ejemplos resueltos en la clase de Diseño de Difusores
const CLASS_EXAMPLES = {
  qrd: { f0: 500, fMax: 2000, c: 340, Tmm: 5, lobeOrder: 2, periods: 1, primeOverride: 0 },
  qrd2d: { f0: 250, fMax: 1000, c: 340, Tmm: 5, lobeOrder: 2, periods: 1, primeOverride: 0 },
  prd: { f0: 500, fMax: 2000, c: 340, Tmm: 5, primeOverride: 7, g: 3, periods: 1 },
  mls: { f0: 500, c: 343, Tmm: 5, mlsOrder: 4, periods: 1 },
  poly: { f0: 250, fMax: 4000, c: 343, poly: { radius: 1.2, chord: 0.6, count: 4 } },
};

const PRIMES = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

const CARD = 'bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 shadow-apple-sm transition-colors min-w-0';
const TITLE = 'text-[#1d1d1f] dark:text-white';
const MUTED = 'text-[#86868b] dark:text-slate-400';
const SELECT = 'apple-input w-full px-3 py-2 text-sm';

const fmtCm = (m, dec = 1) => `${(m * 100).toFixed(dec)} cm`;

export default function DiffuserModule({ isDarkMode = false }) {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [view, setView] = useState('profile');
  const [freq, setFreq] = useState(1000);
  const [incidence, setIncidence] = useState(0);
  const profileRef = useRef(null);
  const pal = diffuserPalette(isDarkMode);

  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v }));
  const setPoly = (k) => (v) => setCfg((c) => ({ ...c, poly: { ...c.poly, [k]: v } }));

  const design = useMemo(
    () =>
      designDiffuser({
        type: cfg.type,
        f0: cfg.f0,
        fMax: Math.max(cfg.fMax, cfg.f0 * 1.2),
        c: cfg.c,
        T: cfg.Tmm / 1000,
        lobeOrder: cfg.lobeOrder,
        periods: cfg.periods,
        primeOverride: cfg.primeOverride || undefined,
        g: cfg.g || undefined,
        mlsOrder: cfg.mlsOrder,
        panelHeight: cfg.panelHeight / 100,
        poly: cfg.poly,
      }),
    [cfg]
  );

  const deferredDesign = useDeferredValue(design);
  const deferredFreq = useDeferredValue(freq);

  const polar = useMemo(() => {
    const angles = defaultAngles(2);
    const coarse = defaultAngles(5);
    const els = surfaceElements(deferredDesign);
    const flat = flatElements(deferredDesign);
    const d = diffusionCoefficient(polarResponse(els, deferredFreq, deferredDesign.c, incidence, coarse));
    const dRef = diffusionCoefficient(polarResponse(flat, deferredFreq, deferredDesign.c, incidence, coarse));
    return {
      angles,
      diffuser: polarResponse(els, deferredFreq, deferredDesign.c, incidence, angles),
      flat: polarResponse(flat, deferredFreq, deferredDesign.c, incidence, angles),
      d,
      dRef,
      dn: normalizedDiffusion(d, dRef),
    };
  }, [deferredDesign, deferredFreq, incidence]);

  const sweep = useMemo(() => frequencySweep(deferredDesign, { incidenceDeg: incidence }), [deferredDesign, incidence]);

  const hemi = useMemo(() => {
    if (deferredDesign.type !== 'qrd2d') return null;
    const cells = deferredDesign.p ** 2 * deferredDesign.periods ** 2;
    return hemisphereMap(deferredDesign, deferredFreq, cells > 2000 ? 41 : 61);
  }, [deferredDesign, deferredFreq]);

  const fab = useMemo(() => fabricationList(design, cfg.panelHeight / 100), [design, cfg.panelHeight]);

  const isSchroeder = ['qrd', 'qrd2d', 'prd'].includes(design.type);
  const roots = design.type === 'prd' ? primitiveRoots(design.p) : [];
  const warnings = [];
  if (!design.validWidth) warnings.push('El ancho de ranura W es negativo: baja f_max o el espesor T.');
  if (isSchroeder && design.W < 0.025) warnings.push('W es muy pequeño (< 2.5 cm): las ranuras estrechas generan pérdidas por viscosidad y absorción no deseada.');
  if (design.type === 'poly' && design.isReflector) warnings.push('Con R ≥ 5 m el cilindro se comporta como reflector plano.');
  if (design.maxDepth > 0.4) warnings.push(`Profundidad máxima de ${fmtCm(design.maxDepth)}: considera subir f₀ o usar un difusor 2D para ahorrar fondo.`);

  const exportCSV = () => {
    const rows = [
      ['POZOLE ACUSTIC — Diseño de Difusores'],
      ['Tipo', TYPES.find((t) => t.id === design.type)?.label],
      ['c (m/s)', design.c],
      ['f0 (Hz)', design.f0],
      ['fmax (Hz)', design.fMax ?? ''],
      ['p', design.p ?? ''],
      ['g', design.g ?? ''],
      ['W (cm)', design.W ? (design.W * 100).toFixed(2) : ''],
      ['T (mm)', cfg.Tmm],
      ['Profundidad máxima (cm)', (design.maxDepth * 100).toFixed(2)],
      ['Ancho total (cm)', (design.totalWidth * 100).toFixed(2)],
      [],
    ];
    if (design.sequence2D) {
      rows.push(['Profundidades 2D (cm) — fila m, columna n']);
      design.depths2D.forEach((r, m) => rows.push([`m=${m}`, ...r.map((d) => (d * 100).toFixed(2))]));
    } else if (design.sequence) {
      rows.push(['n', 's_n', 'd_n (cm)', 'relleno d_max - d_n (cm)']);
      design.sequence.forEach((s, i) => rows.push([i, s, (design.depths[i] * 100).toFixed(2), ((design.maxDepth - design.depths[i]) * 100).toFixed(2)]));
    }
    rows.push([], ['Frecuencia (Hz)', 'd difusor', 'd plano', 'd normalizado', 's teórico']);
    sweep.forEach((b) => rows.push([b.freq, b.diffusion.toFixed(3), b.flat.toFixed(3), b.normalized.toFixed(3), b.scattering.toFixed(3)]));
    download(rows.map((r) => r.join(';')).join('\n'), `difusor_${design.type}.csv`, 'text/csv;charset=utf-8');
  };

  const exportSVG = () => {
    const svg = profileRef.current;
    if (!svg) return;
    download(new XMLSerializer().serializeToString(svg), `perfil_${design.type}.svg`, 'image/svg+xml');
  };

  const tickStyle = { fill: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: 10, fontFamily: 'JetBrains Mono' };
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div className="space-y-6">
      {/* Encabezado del módulo */}
      <div className={`${CARD} space-y-5`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3]">
                <Grid3x3 className="w-5 h-5" />
              </span>
              <h2 className={`text-xl font-bold ${TITLE}`}>Diseño de Difusores Acústicos</h2>
            </div>
            <p className={`text-xs sm:text-sm ${MUTED} mt-1`}>
              Procedimiento de Schroeder, respuesta polar por modelo de Fraunhofer y coeficiente de difusión AES-4id / ISO 17497-2.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCfg((c) => ({ ...c, ...CLASS_EXAMPLES[c.type] }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#5833c7] hover:opacity-90 text-white text-xs font-semibold transition-all"
            >
              <BookOpen className="w-4 h-4" /> Ejemplo de clase
            </button>
            <button
              onClick={() => setCfg((c) => ({ ...DEFAULTS, type: c.type }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/[0.08] dark:border-white/10 text-[#1d1d1f] dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restablecer
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold" role="tablist" aria-label="Tipo de difusor">
          {TYPES.map((t) => {
            const active = cfg.type === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setCfg((c) => ({ ...c, type: t.id, primeOverride: 0, g: 0 }))}
                className={`flex flex-col items-start px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#5833c7] text-white shadow-sm'
                    : 'bg-[#f5f5f7] dark:bg-[#18192a] text-[#1d1d1f] dark:text-slate-300 hover:bg-[#e8e8ed] dark:hover:bg-[#222438]'
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-[10px] font-mono font-normal ${active ? 'text-white/75' : MUTED}`}>{t.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Parámetros */}
        <aside className={`${CARD} lg:col-span-4 lg:sticky lg:top-20 space-y-5`}>
          <SectionLabel>Banda de diseño</SectionLabel>
          <Field label="Frecuencia de diseño f₀" unit="Hz" value={cfg.f0} min={63} max={2000} step={1} onChange={set('f0')} />
          {design.type !== 'mls' && <Field label="Frecuencia máxima f_max" unit="Hz" value={cfg.fMax} min={500} max={8000} step={10} onChange={set('fMax')} />}
          <Field label="Velocidad del sonido c" unit="m/s" value={cfg.c} min={330} max={355} step={1} onChange={set('c')} />

          {design.type !== 'poly' && (
            <>
              <SectionLabel>Construcción</SectionLabel>
              <Field label="Espesor de aletas T" unit="mm" value={cfg.Tmm} min={0} max={10} step={0.5} onChange={set('Tmm')} />
              {design.type !== 'qrd2d' && <Field label="Alto del panel" unit="cm" value={cfg.panelHeight} min={20} max={240} step={5} onChange={set('panelHeight')} />}
              <Field label={design.type === 'qrd2d' ? 'Períodos por lado N' : 'Períodos N'} unit="" value={cfg.periods} min={1} max={design.type === 'qrd2d' ? 3 : 6} step={1} onChange={set('periods')} />
            </>
          )}

          {isSchroeder && (
            <>
              <SectionLabel>Secuencia</SectionLabel>
              {design.type !== 'prd' && <Field label="Grado de difusión n (2n+1 lóbulos)" unit="" value={cfg.lobeOrder} min={1} max={4} step={1} onChange={set('lobeOrder')} />}
              <label className="block space-y-1.5">
                <span className={`text-xs font-medium ${MUTED}`}>Número primo p</span>
                <select value={cfg.primeOverride} onChange={(e) => setCfg((c) => ({ ...c, primeOverride: Number(e.target.value), g: 0 }))} className={SELECT}>
                  <option value={0}>Automático (p = {suggestedPrime(cfg.f0, Math.max(cfg.fMax, cfg.f0 * 1.2), cfg.lobeOrder)})</option>
                  {PRIMES.map((p) => <option key={p} value={p}>p = {p}</option>)}
                </select>
              </label>
              {design.type === 'prd' && (
                <label className="block space-y-1.5">
                  <span className={`text-xs font-medium ${MUTED}`}>Raíz primitiva g</span>
                  <select value={design.g} onChange={(e) => set('g')(Number(e.target.value))} className={SELECT}>
                    {roots.map((g) => <option key={g} value={g}>g = {g}</option>)}
                  </select>
                </label>
              )}
            </>
          )}

          {design.type === 'mls' && (
            <>
              <SectionLabel>Secuencia</SectionLabel>
              <label className="block space-y-1.5">
                <span className={`text-xs font-medium ${MUTED}`}>Orden m (longitud 2ᵐ − 1)</span>
                <select value={cfg.mlsOrder} onChange={(e) => set('mlsOrder')(Number(e.target.value))} className={SELECT}>
                  {MLS_ORDERS.filter((m) => m <= 7).map((m) => <option key={m} value={m}>m = {m} → {2 ** m - 1} tramos</option>)}
                </select>
              </label>
            </>
          )}

          {design.type === 'poly' && (
            <>
              <SectionLabel>Geometría</SectionLabel>
              <Field label="Radio de curvatura R" unit="m" value={cfg.poly.radius} min={0.2} max={6} step={0.05} onChange={setPoly('radius')} />
              <Field label="Cuerda de cada cilindro" unit="m" value={cfg.poly.chord} min={0.2} max={1.5} step={0.05} onChange={setPoly('chord')} />
              <Field label="Número de cilindros" unit="" value={cfg.poly.count} min={1} max={10} step={1} onChange={setPoly('count')} />
              <Field label="Alto del panel" unit="cm" value={cfg.panelHeight} min={20} max={240} step={5} onChange={set('panelHeight')} />
            </>
          )}
        </aside>

        {/* Resultados */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isSchroeder && <Kpi label="Ranuras por período" value={`p = ${design.p}`} sub={design.type === 'prd' ? `g = ${design.g} · ${design.p - 1} ranuras` : `${design.lobes} lóbulos en f₀`} />}
            {design.type === 'mls' && <Kpi label="Longitud MLS" value={`${design.p} tramos`} sub={`orden m = ${design.order}`} />}
            {design.type === 'poly' && <Kpi label="Flecha del arco" value={fmtCm(design.sagitta)} sub={`R = ${design.radius.toFixed(2)} m`} />}
            {design.W !== undefined && <Kpi label="Ancho de ranura W" value={fmtCm(design.W)} sub={design.type === 'mls' ? 'λ₀/2 − T' : 'c / 2f_max − T'} />}
            {design.type === 'poly' && <Kpi label="Cuerda" value={fmtCm(design.chord)} sub={`${design.count} cilindros`} />}
            <Kpi label="Profundidad máxima" value={fmtCm(design.maxDepth)} sub={isSchroeder ? `λ₀/2p = ${fmtCm(design.depthUnit, 2)}` : design.type === 'mls' ? 'λ₀/4' : 'fondo del panel'} />
            <Kpi label="Ancho total" value={fmtCm(design.totalWidth)} sub={design.type === 'qrd2d' ? 'por lado' : `${design.periods} período(s)`} accent />
          </div>

          {warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 space-y-1.5">
              {warnings.map((w) => (
                <p key={w} className="text-xs sm:text-sm text-amber-700 dark:text-amber-200/90 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{w}</p>
              ))}
            </div>
          )}

          <Card
            title="Geometría"
            right={
              <div className="inline-flex p-1 rounded-xl bg-[#f5f5f7] dark:bg-[#18192a] text-xs font-semibold">
                {[['profile', 'Corte'], ['iso', '3D']].map(([id, l]) => (
                  <button key={id} onClick={() => setView(id)} className={`px-3 py-1 rounded-lg transition ${view === id ? 'bg-[#5833c7] text-white' : `${MUTED} hover:text-[#1d1d1f] dark:hover:text-white`}`}>{l}</button>
                ))}
              </div>
            }
          >
            <div className="rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#121322] p-2">
              {view === 'profile' ? <ProfileView ref={profileRef} design={design} isDark={isDarkMode} /> : <IsoView design={design} isDark={isDarkMode} />}
            </div>
            {design.type === 'qrd2d' && view === 'profile' && (
              <p className={`text-xs ${MUTED} mt-2`}>Corte por la fila m = 0. Cambia a 3D para ver la matriz completa (vista tipo skyline).</p>
            )}
          </Card>

          <div className="grid xl:grid-cols-5 gap-6">
            <Card title="Respuesta polar" className="xl:col-span-2">
              <PolarPlot angles={polar.angles} diffuser={polar.diffuser} flat={polar.flat} incidence={incidence} isDark={isDarkMode} />
              <div className={`flex items-center justify-center gap-4 text-[11px] font-mono ${MUTED} mt-1`}>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: pal.amber }} /> difusor</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t border-dashed" style={{ borderColor: pal.flat }} /> superficie plana</span>
              </div>
              <div className="mt-4 space-y-3">
                <Slider label="Frecuencia" value={freq} min={100} max={8000} step={10} unit="Hz" onChange={setFreq} log />
                <Slider label="Ángulo de incidencia ψ" value={incidence} min={-60} max={60} step={5} unit="°" onChange={setIncidence} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Mini label="d difusor" value={polar.d.toFixed(2)} />
                <Mini label="d plano" value={polar.dRef.toFixed(2)} />
                <Mini label="d normalizado" value={polar.dn.toFixed(2)} accent />
              </div>
            </Card>

            <Card title="Coeficientes vs frecuencia" className="xl:col-span-3">
              <div className="h-[300px] -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sweep} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="freq" tick={tickStyle} tickFormatter={(f) => (f >= 1000 ? `${f / 1000}k` : f)} interval={1} stroke={gridColor} />
                    <YAxis domain={[0, 1]} tick={tickStyle} stroke={gridColor} width={36} />
                    {design.fMax && (
                      <ReferenceArea x1={nearestBand(sweep, design.f0)} x2={nearestBand(sweep, design.fUpper ? Math.min(design.fMax, design.fUpper) : design.fMax)} fill={pal.purple} fillOpacity={0.08} />
                    )}
                    <Tooltip
                      contentStyle={{ background: isDarkMode ? '#18192a' : '#ffffff', border: `1px solid ${gridColor}`, borderRadius: 12, fontSize: 12 }}
                      labelFormatter={(f) => `${f} Hz`}
                      formatter={(v, name) => [Number(v).toFixed(3), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="normalized" name="Difusión normalizada dₙ" stroke={pal.amber} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="scattering" name="Dispersión teórica s" stroke={pal.purple} strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="flat" name="d placa plana" stroke={pal.flat} strokeDasharray="4 4" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className={`text-xs ${MUTED} mt-3 flex gap-2`}><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Bandas de 1/3 de octava, 37 receptores de −90° a 90°. La zona sombreada es el rango de diseño f₀ – f_max. Modelo de Fraunhofer: aproximado en baja frecuencia.</p>
            </Card>
          </div>

          {hemi && (
            <Card title={`Mapa hemisférico · ${deferredFreq} Hz`}>
              <div className="grid sm:grid-cols-[minmax(0,260px)_1fr] gap-6 items-center">
                <HemisphereMap map={hemi} isDark={isDarkMode} />
                <div className={`space-y-3 text-sm ${MUTED} leading-relaxed`}>
                  <p>Proyección de la energía dispersada sobre la semiesfera frontal (u = sin θ cos φ, v = sin θ sin φ) en incidencia normal. El centro es la dirección especular.</p>
                  <p>Un QRD 2D reparte la energía en una cuadrícula de lóbulos en ambos planos; uno 1D solo difunde en el plano perpendicular a las ranuras.</p>
                  <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${isDarkMode ? '#121322' : '#f5f5fa'}, ${pal.purple}, ${pal.amber})` }} />
                  <div className="flex justify-between font-mono text-[10px]"><span>−30 dB</span><span>0 dB</span></div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid xl:grid-cols-2 gap-6">
            <Card title={design.type === 'poly' ? 'Parámetros' : 'Secuencia y profundidades'}>
              {design.type === 'poly' ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Pair k="Radio R" v={`${design.radius.toFixed(2)} m`} />
                  <Pair k="Flecha" v={fmtCm(design.sagitta)} />
                  <Pair k="Difunde desde ≈" v={`${Math.round(design.fLower)} Hz`} />
                  <Pair k="Comportamiento" v={design.isReflector ? 'Reflector' : 'Difusor'} />
                </dl>
              ) : design.sequence2D ? (
                <Matrix seq={design.sequence2D} unit={design.depthUnit} />
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className={`${MUTED} text-left`}>
                        <th className="py-2 px-1 font-normal">n</th>
                        <th className="py-2 px-1 font-normal">sₙ</th>
                        <th className="py-2 px-1 font-normal">dₙ (cm)</th>
                        <th className="py-2 px-1 font-normal">relleno (cm)</th>
                        <th className="py-2 px-1 font-normal w-1/3" />
                      </tr>
                    </thead>
                    <tbody>
                      {design.sequence.map((s, i) => (
                        <tr key={i} className="border-t border-black/[0.05] dark:border-white/[0.05]">
                          <td className={`py-1.5 px-1 ${MUTED}`}>{design.type === 'prd' ? i + 1 : i}</td>
                          <td className={`py-1.5 px-1 font-semibold ${TITLE}`}>{s}</td>
                          <td className="py-1.5 px-1 text-[#5833c7] dark:text-[#a78bfa] font-semibold">{(design.depths[i] * 100).toFixed(1)}</td>
                          <td className={`py-1.5 px-1 ${MUTED}`}>{((design.maxDepth - design.depths[i]) * 100).toFixed(1)}</td>
                          <td className="py-1.5 px-1">
                            <div className="h-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                              <div className="h-full rounded-full" style={{ width: `${(design.depths[i] / (design.maxDepth || 1)) * 100}%`, background: `linear-gradient(90deg, ${pal.purple}, ${pal.amber})` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card
              title="Lista de corte"
              right={
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="inline-flex items-center gap-1.5 text-xs rounded-xl bg-[#5833c7] hover:bg-[#4a2bb0] text-white font-semibold px-3 py-1.5 transition"><Download className="w-3.5 h-3.5" /> CSV</button>
                  <button
                    onClick={exportSVG}
                    disabled={view !== 'profile'}
                    title={view !== 'profile' ? 'Cambia a la vista de corte para exportar' : 'Descargar perfil en SVG'}
                    className="inline-flex items-center gap-1.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/10 text-[#1d1d1f] dark:text-slate-200 px-3 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-40 transition"
                  >
                    <FileCode2 className="w-3.5 h-3.5" /> SVG
                  </button>
                </div>
              }
            >
              <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {fab.map((f) => (
                  <li key={f.item} className="py-2.5 flex items-start justify-between gap-4 text-sm">
                    <div>
                      <div className={`font-medium ${TITLE}`}>{f.item}</div>
                      <div className={`text-xs font-mono ${MUTED} mt-0.5`}>{f.size}</div>
                    </div>
                    <span className="font-mono font-semibold text-[#5833c7] dark:text-[#a78bfa] shrink-0">× {f.qty}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Theory type={design.type} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function nearestBand(sweep, f) {
  return sweep.reduce((best, b) => (Math.abs(Math.log(b.freq / f)) < Math.abs(Math.log(best / f)) ? b.freq : best), sweep[0].freq);
}

function download(content, filename, type) {
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' + content : content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SectionLabel({ children }) {
  return <div className={`text-[10px] font-bold uppercase tracking-wider ${MUTED} pt-1 first:pt-0`}>{children}</div>;
}

function Field({ label, unit, value, min, max, step, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs font-medium ${MUTED}`}>{label}</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            className="apple-input w-20 text-right px-2 py-1 text-sm font-mono"
          />
          {unit && <span className={`text-[11px] ${MUTED} w-7`}>{unit}</span>}
        </span>
      </div>
      <input type="range" className="w-full accent-[#0071e3]" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange, log }) {
  // Escala logarítmica opcional para frecuencia
  const toPos = (v) => (log ? (Math.log(v / min) / Math.log(max / min)) * 1000 : v);
  const fromPos = (p) => (log ? Math.round((min * Math.pow(max / min, p / 1000)) / step) * step : p);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className={MUTED}>{label}</span>
        <span className={`font-mono font-semibold ${TITLE}`}>{value} {unit}</span>
      </div>
      <input
        type="range"
        className="w-full accent-[#0071e3]"
        min={log ? 0 : min}
        max={log ? 1000 : max}
        step={log ? 1 : step}
        value={toPos(value)}
        onChange={(e) => onChange(fromPos(Number(e.target.value)))}
        aria-label={label}
      />
    </div>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${accent ? 'border-[#5833c7]/30 bg-[#5833c7]/[0.06] dark:bg-[#5833c7]/15' : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121322] shadow-apple-sm'}`}>
      <div className={`text-[11px] font-medium ${MUTED}`}>{label}</div>
      <div className={`text-xl sm:text-2xl font-bold font-mono mt-1 tracking-tight ${accent ? 'text-[#5833c7] dark:text-[#a78bfa]' : TITLE}`}>{value}</div>
      {sub && <div className={`text-[11px] font-mono ${MUTED} mt-1 truncate`}>{sub}</div>}
    </div>
  );
}

function Mini({ label, value, accent }) {
  return (
    <div className={`rounded-xl border px-2 py-2 ${accent ? 'border-[#5833c7]/30 bg-[#5833c7]/[0.06] dark:bg-[#5833c7]/15' : 'border-black/[0.06] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#18192a]'}`}>
      <div className={`text-[10px] ${MUTED}`}>{label}</div>
      <div className={`font-mono text-base font-bold ${accent ? 'text-[#5833c7] dark:text-[#a78bfa]' : TITLE}`}>{value}</div>
    </div>
  );
}

function Pair({ k, v }) {
  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#18192a] p-3">
      <dt className={`text-[11px] ${MUTED}`}>{k}</dt>
      <dd className={`font-mono font-semibold mt-0.5 ${TITLE}`}>{v}</dd>
    </div>
  );
}

function Card({ title, right, className = '', children }) {
  return (
    <section className={`${CARD} ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className={`text-sm font-bold ${TITLE}`}>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Matrix({ seq, unit }) {
  const p = seq.length;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="grid gap-[2px] min-w-[320px]" style={{ gridTemplateColumns: `repeat(${p}, minmax(0, 1fr))` }}>
          {seq.flat().map((s, i) => (
            <div
              key={i}
              className="aspect-square grid place-items-center text-[9px] font-mono rounded-[3px]"
              style={{ background: `rgba(88,51,199,${0.08 + (s / (p - 1)) * 0.85})`, color: s / (p - 1) > 0.45 ? '#fff' : undefined }}
              title={`s = ${s} · d = ${(s * unit * 100).toFixed(1)} cm`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
      <p className={`text-xs font-mono ${MUTED}`}>dₘₙ = sₘₙ · {(unit * 100).toFixed(2)} cm · pasa el cursor sobre una celda</p>
    </div>
  );
}

function Theory({ type }) {
  const blocks = {
    qrd: [
      ['Ancho de ranura', 'W = c / (2·f_max) − T'],
      ['Número primo', 'p ≥ 2n·(f_max / f₀) → siguiente primo'],
      ['Secuencia', 'sₙ = n² mod p,  n = 0 … p−1'],
      ['Profundidad', 'dₙ = sₙ · λ₀ / (2p)'],
      ['Ancho total', 'W_T = p·(W + T)·N'],
    ],
    qrd2d: [
      ['Ancho de celda', 'W = c / (2·f_max) − T'],
      ['Secuencia', 'sₘₙ = (m² + n²) mod p'],
      ['Profundidad', 'dₘₙ = sₘₙ · λ₀ / (2p)'],
      ['Lado total', 'W_T = p·(W + T)·N'],
    ],
    prd: [
      ['Secuencia', 'sₙ = gⁿ mod p,  n = 1 … p−1'],
      ['Raíz primitiva', 'g genera los p−1 residuos distintos'],
      ['Profundidad', 'dₙ = sₙ · λ₀ / (2p)'],
      ['Uso', 'Cancelador de eco: reflexión especular mínima en f₀'],
    ],
    mls: [
      ['Secuencia', 'LFSR de orden m, longitud 2ᵐ − 1, valores {0, 1}'],
      ['Ancho', 'W = λ₀/2 − T'],
      ['Profundidad', 'd = λ₀/4 donde sₙ = 1'],
      ['Rango útil', '≈ 1 octava alrededor de f₀'],
    ],
    poly: [
      ['Radio', 'R < 5 m difunde; R ≥ 5 m refleja como plano'],
      ['Flecha', 'h = R − √(R² − (c/2)²)'],
      ['Cobertura', 'Menor R → mayor cobertura y menor nivel por reflexión'],
    ],
  }[type];
  const common = [
    ['Presión dispersada (Fraunhofer)', 'p(θ) ∝ Σ Rₑ·wₑ·sinc(k wₑ (sinθ+sinψ)/2)·e^{jk xₑ (sinθ+sinψ)}'],
    ['Coef. de difusión (AES-4id)', 'd = [(Σ Iᵢ)² − Σ Iᵢ²] / [(n−1) Σ Iᵢ²]'],
    ['Normalizado', 'dₙ = (d − d_plano) / (1 − d_plano)'],
    ['Dispersión teórica', 's = 1 − |(1/N) Σ e^{−2jk dₙ}|²'],
  ];
  return (
    <Card title="Fundamento teórico">
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
        {[...blocks, ...common].map(([k, f]) => (
          <div key={k} className="py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
            <div className={`text-[11px] ${MUTED}`}>{k}</div>
            <div className={`font-mono text-[13px] mt-0.5 break-words ${TITLE}`}>{f}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
