import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronsLeftRight } from 'lucide-react';
import { computeCase, ROOM, TREATMENT, VOLUME } from './caseStudy';
import { RenderTag } from './Render';
import { linkProps } from '../router';
import { CountUp, prefersReducedMotion, useInView } from './motion';

const fmt = (v) => v.toFixed(2).replace('.', ',');

/** Comparador deslizante: la misma sala y la misma cámara, sin y con tratamiento. */
function CompareSlider({ isDark }) {
  const [pos, setPos] = useState(52);
  const box = useRef(null);
  const touched = useRef(false);
  const [viewRef, inView] = useInView({ margin: '0px 0px -35% 0px' });
  const suffix = isDark ? '-noche' : '';

  // La primera vez que se ve, el divisor barre de lado a lado para invitar a arrastrarlo
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return undefined;
    const keys = [52, 88, 22, 52];
    const span = 900;
    let raf = 0;
    const t0 = performance.now() + 350;
    const tick = (now) => {
      if (touched.current) return;
      const t = Math.max(0, now - t0);
      const seg = Math.min(keys.length - 2, Math.floor(t / span));
      const u = Math.min(1, (t - seg * span) / span);
      const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      setPos(keys[seg] + (keys[seg + 1] - keys[seg]) * eased);
      if (t < span * (keys.length - 1)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const move = (clientX) => {
    const rect = box.current.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={(el) => {
        box.current = el;
        viewRef.current = el;
      }}
      className="relative aspect-[4/3] select-none touch-pan-y cursor-ew-resize"
      onPointerDown={(e) => {
        touched.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) move(e.clientX);
      }}
    >
      <img src={`/renders/estudio-tratado${suffix}.webp`} alt="Estudio con tratamiento acústico" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 w-full h-full object-contain" />
      <img
        src={`/renders/estudio-vacio${suffix}.webp`}
        alt="El mismo estudio sin tratamiento"
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <span className={`absolute left-3 top-3 rounded-full bg-surface/85 backdrop-blur border border-ink/10 px-3 py-1 text-[11px] font-semibold text-ink/70 transition-opacity ${pos < 14 ? 'opacity-0' : ''}`}>Antes</span>
      <span className={`absolute right-3 top-3 rounded-full bg-brand text-white px-3 py-1 text-[11px] font-semibold transition-opacity ${pos > 86 ? 'opacity-0' : ''}`}>Después</span>

      <div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-[6%] -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-ink/50 to-transparent" />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface border border-ink/15 shadow-lg grid place-items-center text-ink">
          <ChevronsLeftRight className="w-5 h-5" />
        </div>
      </div>

      {/* Control accesible por teclado */}
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(pos)}
        onChange={(e) => {
          touched.current = true;
          setPos(Number(e.target.value));
        }}
        aria-label="Comparar la sala antes y después del tratamiento"
        className="absolute inset-x-0 bottom-0 w-full opacity-0 focus-visible:opacity-100 accent-brand"
      />
    </div>
  );
}

/** Barras de RT60 por banda de octava: antes vs. después, con la franja objetivo. */
function BandChart({ data }) {
  const max = Math.max(...data.before) * 1.08;
  const W = 340;
  const H = 150;
  const y = (v) => H - (v / max) * H;
  const slot = W / data.bands.length;
  const [ref, inView] = useInView({ margin: '0px 0px -15% 0px' });
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H + 22}`} className={`w-full h-auto ${inView ? 'pz-in' : ''}`} role="img" aria-label="Tiempo de reverberación por banda de octava antes y después del tratamiento">
      <rect x="0" y={y(data.targetMax)} width={W} height={y(data.targetMin) - y(data.targetMax)} className="fill-accent/15" />
      <line x1="0" x2={W} y1={y(data.target)} y2={y(data.target)} className="stroke-accent" strokeWidth="1" strokeDasharray="3 4" />
      {[0.5, 1, 1.5].map((t) => (
        <g key={t}>
          <line x1="0" x2={W} y1={y(t)} y2={y(t)} className="stroke-ink/[0.07]" strokeWidth="1" />
          <text x={W} y={y(t) - 3} textAnchor="end" className="fill-ink/35" fontSize="8" fontFamily="JetBrains Mono, monospace">{fmt(t)} s</text>
        </g>
      ))}
      {data.bands.map((f, i) => {
        const x = i * slot + slot / 2;
        return (
          <g key={f}>
            <rect x={x - 15} y={y(data.before[i])} width="13" height={H - y(data.before[i])} rx="3" className="pz-bar fill-ink/20" style={{ transitionDelay: `${i * 70}ms` }} />
            <rect x={x + 2} y={y(data.after[i])} width="13" height={H - y(data.after[i])} rx="3" className="pz-bar fill-brand" style={{ transitionDelay: `${500 + i * 70}ms` }} />
            <text x={x} y={H + 14} textAnchor="middle" className="fill-ink/50" fontSize="9" fontFamily="JetBrains Mono, monospace">{f >= 1000 ? `${f / 1000}k` : f}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function BeforeAfter({ isDark }) {
  const data = useMemo(() => computeCase(), []);
  const reduction = Math.round((1 - data.afterMid / data.beforeMid) * 100);

  return (
    <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
      <div className="lg:col-span-7">
        <CompareSlider isDark={isDark} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <RenderTag />
          <span className="text-[13px] text-ink/70">Arrastra para comparar</span>
        </div>
      </div>

      <div className="lg:col-span-5 rounded-3xl pz-card p-6 sm:p-7 space-y-6">
        <div>
          <div className="text-[13px] font-medium text-ink/70">Tiempo de reverberación · 500 Hz – 1 kHz</div>
          <div className="mt-3 flex items-end gap-4 flex-wrap">
            <div>
              <div className="text-xs text-ink/60">Antes</div>
              <div className="font-mono text-3xl font-bold text-ink/55 line-through decoration-ink/30"><CountUp value={data.beforeMid} duration={900} /> s</div>
            </div>
            <div className="text-ink/50 text-2xl pb-1">→</div>
            <div>
              <div className="text-xs text-ink/60">Después</div>
              <div className="font-mono text-5xl font-bold text-ink tracking-tight"><CountUp from={data.beforeMid} value={data.afterMid} duration={2400} /> <span className="text-2xl text-ink/70">s</span></div>
            </div>
            <span className="ml-auto rounded-full bg-brand/10 text-brand font-mono text-sm font-bold px-3 py-1.5">−{reduction} %</span>
          </div>
        </div>

        <div>
          <BandChart data={data} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/70">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-ink/20" /> Sin tratar</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand" /> Tratada</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent/40" /> Objetivo {fmt(data.target)} ± 0,05 s</span>
          </div>
        </div>

        <details className="group rounded-2xl border border-ink/10 bg-canvas/60 px-4 py-3">
          <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-ink">
            Qué se instaló · {Math.round(data.treatedArea)} m² de tratamiento
            <span className="text-ink/55 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
          </summary>
          <ul className="mt-3 space-y-1.5 text-[13px] text-ink/75">
            {TREATMENT.map((t) => (
              <li key={t.name} className="flex justify-between gap-3">
                <span>{t.name}{t.hidden && <span className="text-ink/55"> · oculto en el corte</span>}</span>
                <span className="font-mono text-ink/65 shrink-0">{String(t.area).replace('.', ',')} m²</span>
              </li>
            ))}
          </ul>
        </details>

        <p className="text-[11px] leading-relaxed text-ink/60">
          Caso conceptual: sala de {String(ROOM.length).replace('.', ',')} × {String(ROOM.width).replace('.', ',')} × {String(ROOM.height).replace('.', ',')} m ({Math.round(VOLUME)} m³). Cifras estimadas con Norris-Eyring y coeficientes de absorción típicos; objetivo según ITU-R BS.1116 para salas de escucha crítica.
        </p>

        <a {...linkProps('/suite', 'results')} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          Haz este mismo análisis con tu sala
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}
