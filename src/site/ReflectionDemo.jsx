import React, { useState } from 'react';
import { CheckCircle2, Info, Sparkles } from 'lucide-react';
import { quadraticResidueSequence } from '../utils/diffuserCalculations';

const MODES = [
  {
    id: 'reflect',
    label: '1. Reflejar',
    title: 'Superficie dura y lisa (Concreto, vidrio, yeso)',
    badge: 'Rebote directo (Especular)',
    text: 'Casi toda la energía rebota en un solo ángulo como un espejo. Es útil para proyectar la voz al fondo de un auditorio, pero sin control genera eco flotante y sonido metálico.',
    whenToUse: 'Techos reflectores en auditorios o salas muy apagadas.',
    effectLabel: 'Ondas concentradas en una sola dirección (Eco duro)',
  },
  {
    id: 'absorb',
    label: '2. Absorber',
    title: 'Material poroso (Lana mineral, espuma, cortinas)',
    badge: 'Amortiguamiento de energía',
    text: 'Atrapa parte de la onda sonora y reduce el tiempo de reverberación (RT60). Elimina el eco molesto, pero si cubres toda la sala con absorbentes quedará "muerta" y sin naturalidad.',
    whenToUse: 'Primeras reflexiones, control de eco en aulas, oficinas y estudios.',
    effectLabel: 'Rebote muy débil (Energía disipada dentro del panel)',
  },
  {
    id: 'diffuse',
    label: '3. Difundir',
    title: 'Difusor de Schroeder (QRD / PRD / MLS)',
    badge: 'Dispersión uniforme 180°',
    text: 'Gracias a ranuras de distinta profundidad calculadas matemáticamente, divide el rebote en muchas direcciones al mismo tiempo. Elimina los ecos sin apagar la vida ni el brillo del recinto.',
    whenToUse: 'Pared trasera de estudios de mezcla, salas de ensayo, cines y auditorios.',
    effectLabel: 'Energía repartida suavemente en todas direcciones',
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
    <div className="grid lg:grid-cols-12 gap-8 items-center">
      <div className="lg:col-span-5 space-y-5">
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-ink/50">
            Haz clic para comparar el efecto en la onda:
          </div>
          <div className="inline-flex flex-wrap p-1 rounded-2xl bg-ink/[0.05] border border-ink/10 gap-1" role="tablist" aria-label="Comportamiento de la superficie">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  mode === m.id ? 'bg-ink text-canvas shadow-sm' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div key={mode} className="animate-fadeIn rounded-3xl border border-ink/10 bg-surface p-6 space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/25 px-3 py-1 text-xs font-mono font-semibold text-brand">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{active.badge}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-ink leading-snug">{active.title}</h3>
          <p className="text-sm sm:text-base text-ink/65 leading-relaxed">{active.text}</p>
          <div className="pt-3 border-t border-ink/[0.08] flex items-start gap-2.5 text-xs sm:text-sm text-ink/75">
            <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-ink">Dónde se aplica: </span>
              <span>{active.whenToUse}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 rounded-3xl border border-ink/10 bg-surface overflow-hidden p-4 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-ink/55 pb-2 border-b border-ink/[0.07]">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ink inline-block" />
            Onda entrante (Fuente)
          </span>
          <span className="flex items-center gap-2 text-accent font-semibold">
            <Info className="w-3.5 h-3.5" />
            {active.effectLabel}
          </span>
        </div>

        <svg viewBox="0 0 600 320" className="w-full h-auto block" role="img" aria-label={`Diagrama: ${active.title}`}>
          <defs>
            <pattern id="porous" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" className="fill-accent" opacity="0.5" />
              <circle cx="6" cy="6" r="1" className="fill-accent" opacity="0.35" />
            </pattern>
          </defs>

          {/* Superficie */}
          {mode === 'reflect' && (
            <g>
              <rect x="40" y={SURFACE_Y} width="520" height="12" rx="3" className="fill-ink/40" />
              <text x="300" y="286" textAnchor="middle" className="fill-ink/50" fontSize="11" fontFamily="JetBrains Mono">
                PARED LISA (CONCRETO / VIDRIO)
              </text>
            </g>
          )}
          {mode === 'absorb' && (
            <g>
              <rect x="40" y={SURFACE_Y} width="520" height="40" rx="4" fill="url(#porous)" className="stroke-accent" strokeOpacity="0.4" />
              <text x="300" y="308" textAnchor="middle" className="fill-ink/55" fontSize="11" fontFamily="JetBrains Mono">
                PANEL ABSORBENTE POROSO (DISIPA ENERGÍA)
              </text>
            </g>
          )}
          {mode === 'diffuse' && (
            <g>
              {QRD.concat(QRD).map((s, i) => {
                const w = 520 / 22;
                return <rect key={i} x={40 + i * w + 1} y={SURFACE_Y} width={w - 2} height={8 + s * 4} rx="1.5" className="fill-brand" opacity={0.4 + s * 0.06} />;
              })}
              <text x="300" y="310" textAnchor="middle" className="fill-ink/55" fontSize="11" fontFamily="JetBrains Mono">
                RANURAS DE DIFUSOR QRD (PROFUNDIDADES VARIABLES)
              </text>
            </g>
          )}

          {/* Rayo incidente */}
          <line x1="80" y1="40" x2={HIT.x} y2={HIT.y} strokeWidth="2.2" className="pz-ray stroke-ink" />
          <circle cx="80" cy="40" r="6" className="fill-ink" />
          <text x="94" y="38" className="fill-ink/75 font-semibold" fontSize="11" fontFamily="JetBrains Mono">1. SONIDO DIRECTO</text>

          {/* Rayos reflejados */}
          {out.map(({ a, o }, i) => {
            const rad = (a * Math.PI) / 180;
            const L = mode === 'absorb' ? 115 : 205;
            return (
              <line
                key={`${mode}-${i}`}
                x1={HIT.x}
                y1={HIT.y}
                x2={HIT.x + Math.sin(rad) * L}
                y2={HIT.y - Math.cos(rad) * L}
                strokeOpacity={o}
                strokeWidth={mode === 'diffuse' ? 1.8 : 2.4}
                className={`pz-ray ${mode === 'diffuse' ? 'stroke-accent' : 'stroke-ink'}`}
              />
            );
          })}
          <circle cx={HIT.x} cy={HIT.y} r="5" className="fill-accent" />
          <text x="445" y="65" className="fill-accent font-semibold" fontSize="11" fontFamily="JetBrains Mono">
            {mode === 'reflect' ? '2. REBOTE FUERTE (ECO)' : mode === 'absorb' ? '2. REBOTE ATENUADO' : '2. SONIDO DIFUSO 180°'}
          </text>
        </svg>
      </div>
    </div>
  );
}
