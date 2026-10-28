import React, { useState } from 'react';
import { quadraticResidueSequence } from '../utils/diffuserCalculations';

const MODES = [
  {
    id: 'reflect',
    label: 'Reflejar',
    title: 'Superficie lisa',
    text: 'Toda la energía sale en una sola dirección. Útil para reforzar, pero genera ecos, focalizaciones y ecos flotantes entre paredes paralelas.',
  },
  {
    id: 'absorb',
    label: 'Absorber',
    title: 'Material poroso',
    text: 'Convierte la energía en calor. Controla el tiempo de reverberación, pero si se abusa la sala queda “seca” y sin vida.',
  },
  {
    id: 'diffuse',
    label: 'Difundir',
    title: 'Difusor de Schroeder',
    text: 'Reparte la energía de forma uniforme en muchas direcciones sin quitarla del campo sonoro. Envolvente, natural y sin ecos.',
  },
];

const SURFACE_Y = 250;
const HIT = { x: 300, y: SURFACE_Y };
const QRD = quadraticResidueSequence(11);

export default function ReflectionDemo() {
  const [mode, setMode] = useState('diffuse');
  const active = MODES.find((m) => m.id === mode);

  const out = mode === 'diffuse'
    ? [-70, -50, -30, -10, 10, 30, 50, 70].map((a) => ({ a, o: 0.85 }))
    : [{ a: 40, o: mode === 'absorb' ? 0.18 : 1 }];

  return (
    <div className="grid lg:grid-cols-5 gap-8 items-center">
      <div className="lg:col-span-2 space-y-6">
        <div className="inline-flex p-1 rounded-full bg-ink/[0.05] border border-ink/10" role="tablist" aria-label="Comportamiento de la superficie">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                mode === m.id ? 'bg-ink text-canvas' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div key={mode} className="animate-fadeIn space-y-2 min-h-[120px]">
          <h3 className="text-2xl font-bold text-ink">{active.title}</h3>
          <p className="text-ink/60 leading-relaxed">{active.text}</p>
        </div>
      </div>

      <div className="lg:col-span-3 rounded-3xl border border-ink/10 bg-surface overflow-hidden">
        <svg viewBox="0 0 600 320" className="w-full h-auto block" role="img" aria-label={`Diagrama: ${active.title}`}>
          <defs>
            <pattern id="porous" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" className="fill-accent" opacity="0.5" />
              <circle cx="6" cy="6" r="1" className="fill-accent" opacity="0.35" />
            </pattern>
          </defs>

          {/* Superficie */}
          {mode === 'reflect' && <rect x="40" y={SURFACE_Y} width="520" height="10" className="fill-ink/40" />}
          {mode === 'absorb' && <rect x="40" y={SURFACE_Y} width="520" height="40" fill="url(#porous)" className="stroke-accent" strokeOpacity="0.3" />}
          {mode === 'diffuse' && (
            <g>
              {QRD.concat(QRD).map((s, i) => {
                const w = 520 / 22;
                return <rect key={i} x={40 + i * w + 1} y={SURFACE_Y} width={w - 2} height={8 + s * 4} className="fill-brand" opacity={0.35 + s * 0.06} />;
              })}
            </g>
          )}

          {/* Rayo incidente */}
          <line x1="80" y1="40" x2={HIT.x} y2={HIT.y} strokeWidth="2" className="pz-ray stroke-ink" />
          <circle cx="80" cy="40" r="6" className="fill-ink" />
          <text x="94" y="36" className="fill-ink/50" fontSize="11" fontFamily="JetBrains Mono">FUENTE</text>

          {/* Rayos reflejados */}
          {out.map(({ a, o }, i) => {
            const rad = (a * Math.PI) / 180;
            const L = 210;
            return (
              <line
                key={`${mode}-${i}`}
                x1={HIT.x}
                y1={HIT.y}
                x2={HIT.x + Math.sin(rad) * L}
                y2={HIT.y - Math.cos(rad) * L}
                
                strokeOpacity={o}
                strokeWidth={mode === 'diffuse' ? 1.6 : 2}
                className={`pz-ray ${mode === 'diffuse' ? 'stroke-accent' : 'stroke-ink'}`}
              />
            );
          })}
          <circle cx={HIT.x} cy={HIT.y} r="4" className="fill-accent" />
        </svg>
      </div>
    </div>
  );
}
