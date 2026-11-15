import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, BookMarked, Check, ShieldCheck } from 'lucide-react';
import Tex from '../common/Tex';
import { FICHAS, GROUPS, buildContext, runCheck } from './fichasData';

/**
 * Fichas técnicas — el respaldo de cada número de la suite: qué fórmula se usa, por qué,
 * cuándo es válida, de dónde sale y una comprobación en vivo con la sala abierta.
 */

const CARD = 'bg-white dark:bg-[#121322] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-apple-sm transition-colors';
const TITLE = 'text-[#1d1d1f] dark:text-white';
const MUTED = 'text-[#86868b] dark:text-slate-400';
const LABEL = `text-[10px] font-bold uppercase tracking-wider ${MUTED}`;

const fmt = (v, d = 2) => (Number.isFinite(v) ? Number(v).toFixed(d) : '—');

const fichaFromHash = () => {
  const id = window.location.hash.split('/')[1];
  return FICHAS.some((x) => x.id === id) ? id : null;
};

export default function FichasModule({ onNavigate, ...data }) {
  const [active, setActive] = useState(() => fichaFromHash() || FICHAS[0].id);

  // Enlaces directos del tipo #fichas/sabine
  useEffect(() => {
    const onHash = () => {
      const id = fichaFromHash();
      if (id) setActive(id);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (id) => {
    setActive(id);
    window.history.replaceState({}, '', `${window.location.pathname}#fichas/${id}`);
    document.getElementById('ficha-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ctx = useMemo(() => buildContext(data), Object.values(data));
  const checks = useMemo(() => Object.fromEntries(FICHAS.map((x) => [x.id, runCheck(x, ctx)])), [ctx]);
  const verifiable = FICHAS.filter((x) => x.check);
  const passed = verifiable.filter((x) => checks[x.id]?.ok).length;

  const index = FICHAS.findIndex((x) => x.id === active);
  const ficha = FICHAS[index];
  const check = checks[ficha.id];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className={`${CARD} p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#a78bfa]">
              <BookMarked className="w-5 h-5" />
            </span>
            <h2 className={`text-xl font-bold ${TITLE}`}>Fichas técnicas</h2>
          </div>
          <p className={`text-xs sm:text-sm ${MUTED} mt-1 max-w-2xl`}>
            Cada número de la suite sale de una de estas fórmulas. Aquí está cuál es, por qué se eligió, cuándo vale y de dónde viene; y cada una se vuelve a calcular con los datos de tu sala para comprobar que el software hace exactamente eso.
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl border px-4 py-3 flex items-center gap-3 ${passed === verifiable.length ? 'border-emerald-500/30 bg-emerald-500/[0.07]' : 'border-amber-500/30 bg-amber-500/[0.07]'}`}>
          <ShieldCheck className={`w-8 h-8 ${passed === verifiable.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
          <div>
            <div className={`text-lg font-bold font-mono leading-none ${TITLE}`}>
              {passed} / {verifiable.length}
            </div>
            <div className={`text-[11px] ${MUTED} mt-1`}>cálculos comprobados con tu sala</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Índice */}
        <nav className={`${CARD} lg:col-span-4 xl:col-span-3 p-3 lg:sticky lg:top-20 max-h-72 lg:max-h-[calc(100vh-7rem)] overflow-y-auto`} aria-label="Índice de fichas técnicas">
          {GROUPS.map((group) => (
            <div key={group} className="mb-2 last:mb-0">
              <div className={`${LABEL} px-3 pt-2 pb-1`}>{group}</div>
              {FICHAS.filter((x) => x.group === group).map((x) => {
                const on = x.id === active;
                const c = checks[x.id];
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => select(x.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition ${
                      on ? 'bg-[#5833c7] text-white' : 'text-[#1d1d1f] dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="leading-snug">{x.title}</span>
                    {c && (c.ok ? <Check className={`w-3.5 h-3.5 shrink-0 ${on ? 'text-white' : 'text-emerald-500'}`} /> : <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${on ? 'text-white' : 'text-amber-500'}`} />)}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Ficha */}
        <article id="ficha-top" key={ficha.id} className="lg:col-span-8 xl:col-span-9 space-y-4 animate-fadeIn scroll-mt-24 min-w-0">
          <div className={`${CARD} p-6 sm:p-8 space-y-6`}>
            <header className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#5833c7]/10 dark:bg-[#5833c7]/25 text-[#5833c7] dark:text-[#c4b5fd]">{ficha.group}</span>
                <span className={`text-[10px] font-mono ${MUTED}`}>Ficha {String(index + 1).padStart(2, '0')} de {FICHAS.length}</span>
              </div>
              <h3 className={`text-2xl font-bold tracking-tight ${TITLE}`}>{ficha.title}</h3>
              <p className={`text-sm leading-relaxed ${MUTED}`}>{ficha.what}</p>
            </header>

            <section className="rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.06] dark:border-white/[0.08] px-5 py-4 space-y-2">
              <div className={LABEL}>Fórmula</div>
              <div className={`space-y-1 ${TITLE}`}>
                {ficha.formulas.map((tex) => (
                  <Tex key={tex}>{tex}</Tex>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className={LABEL}>Qué significa cada término</div>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {ficha.vars.map(([symbol, text, unit]) => (
                  <div key={symbol} className="flex items-baseline gap-3 py-1.5 border-b border-black/[0.05] dark:border-white/[0.05]">
                    <dt className={`shrink-0 min-w-[3.5rem] ${TITLE}`}>
                      <Tex inline>{symbol}</Tex>
                    </dt>
                    <dd className={`text-xs leading-snug ${MUTED} flex-1`}>{text}</dd>
                    <span className={`text-[11px] font-mono ${MUTED} shrink-0`}>{unit}</span>
                  </div>
                ))}
              </dl>
            </section>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="space-y-1.5">
                <div className={LABEL}>Por qué esta fórmula</div>
                <p className={`text-sm leading-relaxed ${TITLE} opacity-85`}>{ficha.why}</p>
              </section>
              <section className="space-y-1.5">
                <div className={LABEL}>Cuándo es válida</div>
                <p className={`text-sm leading-relaxed ${TITLE} opacity-85`}>{ficha.valid}</p>
              </section>
            </div>

            <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
              <p className={`text-xs ${MUTED} max-w-xl`}>
                <span className="font-semibold">Referencia: </span>
                {ficha.ref}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ficha.uses.map(([section, label]) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => onNavigate?.(section)}
                    className="text-[11px] font-semibold rounded-full border border-[#5833c7]/25 text-[#5833c7] dark:text-[#c4b5fd] px-3 py-1 hover:bg-[#5833c7]/10 transition"
                  >
                    Se usa en {label} →
                  </button>
                ))}
              </div>
            </footer>
          </div>

          {/* Comprobación en vivo */}
          {check && (
            <div className={`${CARD} p-6 sm:p-8 space-y-4`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className={`text-sm font-bold ${TITLE}`}>Comprobación con tu sala</h4>
                  <p className={`text-xs ${MUTED}`}>La misma cuenta, hecha paso a paso con los datos que tienes cargados ahora.</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                    check.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {check.ok ? <BadgeCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {check.ok ? 'Coincide con el software' : 'No coincide: revisar'}
                </span>
              </div>

              <div className={`rounded-2xl bg-[#fbfbfd] dark:bg-[#18192a] border border-black/[0.06] dark:border-white/[0.08] px-5 py-3 ${TITLE}`}>
                {check.steps.map((tex) => (
                  <Tex key={tex}>{tex}</Tex>
                ))}
              </div>

              <dl className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] px-4 py-3">
                  <dt className={`text-[11px] ${MUTED}`}>Calculado aquí con la fórmula</dt>
                  <dd className={`font-mono text-xl font-bold mt-0.5 ${TITLE}`}>
                    {fmt(check.manual, check.digits ?? 2)} <span className={`text-xs font-normal ${MUTED}`}>{check.unit}</span>
                  </dd>
                </div>
                <div className="rounded-2xl border border-[#5833c7]/25 bg-[#5833c7]/[0.05] dark:bg-[#5833c7]/15 px-4 py-3">
                  <dt className={`text-[11px] ${MUTED}`}>Valor que entrega el software · {check.label}</dt>
                  <dd className="font-mono text-xl font-bold mt-0.5 text-[#5833c7] dark:text-[#c4b5fd]">
                    {fmt(check.engine, check.digits ?? 2)} <span className={`text-xs font-normal ${MUTED}`}>{check.unit}</span>
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => select(FICHAS[index - 1].id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-black/[0.08] dark:border-white/10 text-[#1d1d1f] dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-40 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={index === FICHAS.length - 1}
              onClick={() => select(FICHAS[index + 1].id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#5833c7] hover:bg-[#4726aa] text-white disabled:opacity-40 transition"
            >
              Siguiente ficha <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
