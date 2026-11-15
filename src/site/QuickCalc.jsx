import React, { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { OCTAVE_BANDS, getOptimumReverberationTime } from '../utils/acousticCalculations';
import { eyring } from './caseStudy';
import { linkProps } from '../router';

/**
 * Calculadora exprés de RT60: una primera estimación con Norris-Eyring y un coeficiente
 * medio por banda según el estado de la sala. El análisis completo vive en POZOLE Suite.
 */
const FINISHES = [
  { id: 'dura', label: 'Vacía y dura', hint: 'Concreto, baldosa, vidrio', alpha: [0.03, 0.03, 0.04, 0.05, 0.06, 0.06] },
  { id: 'amoblada', label: 'Amoblada', hint: 'Muebles, cortinas, alfombra', alpha: [0.1, 0.12, 0.15, 0.18, 0.2, 0.22] },
  { id: 'tratada', label: 'Tratada', hint: 'Paneles y trampas', alpha: [0.22, 0.32, 0.42, 0.46, 0.46, 0.45] },
];

const USES = [
  { id: 'speech', label: 'Voz' },
  { id: 'music', label: 'Música en vivo' },
  { id: 'studio', label: 'Estudio' },
];

const fmt = (v, d = 2) => v.toFixed(d).replace('.', ',');

export default function QuickCalc() {
  const [dims, setDims] = useState({ length: 6, width: 4, height: 2.7 });
  const [finish, setFinish] = useState('dura');
  const [use, setUse] = useState('speech');

  const result = useMemo(() => {
    const { length, width, height } = dims;
    const volume = length * width * height;
    const surface = 2 * length * width + 2 * (length + width) * height;
    const alpha = FINISHES.find((f) => f.id === finish).alpha;
    const rt = alpha.map((a) => eyring(volume, surface, a * surface));
    const mid = (rt[2] + rt[3]) / 2;
    const opt = getOptimumReverberationTime(volume, use);
    // Absorción media que haría falta para llegar al óptimo (Eyring despejado)
    const neededAlpha = 1 - Math.exp((-0.161 * volume) / (surface * opt.optimal));
    const currentAlpha = (alpha[2] + alpha[3]) / 2;
    const extraArea = Math.max(0, ((neededAlpha - currentAlpha) * surface) / 0.9);
    const verdict = mid > opt.max ? 'alta' : mid < opt.min ? 'baja' : 'ok';
    return { volume, rt, mid, opt, extraArea, verdict };
  }, [dims, finish, use]);

  const max = Math.max(...result.rt, result.opt.max) * 1.1;
  const verdictUI = {
    alta: { text: 'Demasiada reverberación', cls: 'bg-accent/15 text-accent' },
    ok: { text: 'Dentro del rango recomendado', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    baja: { text: 'Sala muy seca', cls: 'bg-brand/10 text-brand' },
  }[result.verdict];

  const slider = (key, label, min, max2, step) => (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-xs">
        <span className="text-ink/55">{label}</span>
        <span className="font-mono font-semibold text-ink">{fmt(dims[key], 1)} m</span>
      </span>
      <input
        type="range"
        min={min}
        max={max2}
        step={step}
        value={dims[key]}
        onChange={(e) => setDims((d) => ({ ...d, [key]: Number(e.target.value) }))}
        className="w-full accent-brand"
      />
    </label>
  );

  return (
    <div className="rounded-[28px] border border-ink/10 bg-surface overflow-hidden shadow-[0_30px_80px_-40px_rgb(var(--pz-brand)/0.45)]">
      {/* Barra de ventana, como una vista previa del simulador */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-ink/[0.08] bg-surface2">
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="ml-3 font-mono text-[11px] text-ink/45">POZOLE Suite · calculadora exprés de RT60</span>
      </div>

      <div className="grid md:grid-cols-2">
        <div className="p-6 sm:p-7 space-y-5 md:border-r border-ink/[0.08]">
          {slider('length', 'Largo', 2, 20, 0.1)}
          {slider('width', 'Ancho', 2, 15, 0.1)}
          {slider('height', 'Alto', 2.2, 6, 0.1)}

          <div className="space-y-2">
            <div className="text-xs text-ink/55">¿Cómo está la sala hoy?</div>
            <div className="grid grid-cols-3 gap-1.5">
              {FINISHES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFinish(f.id)}
                  aria-pressed={finish === f.id}
                  className={`rounded-xl border px-2 py-2 text-left transition-colors ${finish === f.id ? 'border-brand bg-brand/10' : 'border-ink/10 hover:border-ink/25'}`}
                >
                  <div className="text-xs font-semibold text-ink">{f.label}</div>
                  <div className="text-[10px] text-ink/45 leading-tight mt-0.5">{f.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-ink/55">¿Para qué la usas?</div>
            <div className="inline-flex p-1 rounded-full bg-ink/[0.05] border border-ink/10">
              {USES.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUse(u.id)}
                  aria-pressed={use === u.id}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${use === u.id ? 'bg-ink text-canvas' : 'text-ink/60 hover:text-ink'}`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-5 bg-canvas/40">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-ink/45">RT60 ESTIMADO · MEDIOS</div>
              <div className="font-mono text-5xl font-bold tracking-tight text-ink mt-1">
                {fmt(result.mid)} <span className="text-2xl text-ink/55">s</span>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${verdictUI.cls}`}>{verdictUI.text}</span>
          </div>

          <div>
            <div className="flex items-end gap-2 h-28" aria-hidden="true">
              {result.rt.map((t, i) => (
                <div key={OCTAVE_BANDS[i]} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-brand to-brand/60 transition-all duration-300" style={{ height: `${Math.min(100, (t / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              {OCTAVE_BANDS.map((f) => (
                <span key={f} className="flex-1 text-center font-mono text-[10px] text-ink/45">{f >= 1000 ? `${f / 1000}k` : f}</span>
              ))}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-ink/10 bg-surface p-3">
              <dt className="text-[11px] text-ink/50">Recomendado para este uso</dt>
              <dd className="font-mono font-semibold text-ink mt-0.5">{fmt(result.opt.min)} – {fmt(result.opt.max)} s</dd>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-surface p-3">
              <dt className="text-[11px] text-ink/50">Absorbente a añadir</dt>
              <dd className="font-mono font-semibold text-ink mt-0.5">{result.extraArea < 0.5 ? 'Ninguno' : `≈ ${Math.round(result.extraArea)} m²`}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
            <a {...linkProps('/suite', 'geometry')} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              Analizarla a fondo en POZOLE Suite
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <span className="text-[11px] text-ink/40">Volumen: {Math.round(result.volume)} m³ · Norris-Eyring</span>
          </div>
        </div>
      </div>
    </div>
  );
}
