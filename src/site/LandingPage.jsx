import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCircle2, Compass, Ear, Plus, Ruler, Send } from 'lucide-react';
import WaveFieldCanvas from './WaveFieldCanvas';
import ReflectionDemo from './ReflectionDemo';
import BeforeAfter from './BeforeAfter';
import QuickCalc from './QuickCalc';
import Render, { RenderTag } from './Render';
import { SiteNav, SiteFooter, Eyebrow } from './SiteChrome';
import { Parallax, Reveal, Words, useScrollSteps } from './motion';
import { BRAND, CONTACT_EMAIL, TEAM } from './siteConfig';
import { FAQ, HERO_HOTSPOTS, PLANS, PROCESS, PRODUCTS, SERVICES, SPACES, SPACES_MARQUEE } from './content';
import { linkProps, navigate } from '../router';
import { useTheme } from '../theme';
import { quadraticResidueSequence } from '../utils/diffuserCalculations';

const SECTION = 'py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16';
const WRAP = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
const H2 = 'text-4xl sm:text-5xl font-bold tracking-tight text-ink';
const Accent = ({ children, muted }) => <span className={`font-serif-accent italic font-normal ${muted ? 'text-ink/70' : 'text-accent'}`}>{children}</span>;

export default function LandingPage() {
  const [isDark, toggleTheme] = useTheme();
  const [interest, setInterest] = useState('');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
  }, []);

  const quote = (topic) => {
    setInterest(topic);
    navigate('/', { hash: 'contacto' });
  };

  return (
    <div className="pz-site min-h-screen bg-canvas text-ink font-sans antialiased selection:bg-accent selection:text-canvas overflow-x-hidden">
      <SiteNav current="/" isDark={isDark} onToggleTheme={toggleTheme} />
      <Hero isDark={isDark} />
      <SpacesMarquee />

      <section id="antes-despues" className="py-24 sm:py-32 scroll-mt-16">
        <div className={`${WRAP} space-y-12`}>
          <Reveal className="grid lg:grid-cols-2 gap-6 items-end">
            <div className="space-y-4">
              <Eyebrow index="01">RESULTADOS</Eyebrow>
              <h2 className={H2}>
                La misma sala. <Accent>Otro</Accent> sonido.
              </h2>
            </div>
            <p className="text-ink/60 leading-relaxed lg:max-w-md lg:justify-self-end">
              Desliza para ver cómo cambia un estudio de 64 m³ con el tratamiento que calculamos, y cuánto baja su tiempo de reverberación en cada banda.
            </p>
          </Reveal>
          <Reveal delay={80} variant="scale">
            <BeforeAfter isDark={isDark} />
          </Reveal>
        </div>
      </section>

      <Services />
      <Treatments onQuote={quote} />
      <Spaces isDark={isDark} />

      <section id="como-funciona" className={SECTION}>
        <div className={`${WRAP} space-y-12`}>
          <Reveal className="max-w-2xl space-y-4">
            <Eyebrow index="05">CÓMO FUNCIONA EL TRATAMIENTO ACÚSTICO</Eyebrow>
            <h2 className={H2}>
              Cada superficie decide <Accent>a dónde</Accent> va el sonido.
            </h2>
            <p className="text-ink/60 leading-relaxed">
              Un buen diseño acústico no consiste en llenar todo de espuma: combina reflexión útil, absorción controlada y difusión matemática.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <ReflectionDemo />
          </Reveal>
        </div>
      </section>

      <Process />
      <DiffuserPromo />
      <SoftwarePromo />
      <Plans onQuote={quote} />
      <Faq />
      <Team />
      <Contact interest={interest} />
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------------- HERO */

function Hotspot({ x, y, label, side, delay = 0 }) {
  return (
    <a {...linkProps('/', 'tratamientos')} className="pz-pop-in group absolute -translate-x-1/2 -translate-y-1/2 hidden sm:block" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}ms` }} aria-label={label}>
      <span className="relative flex h-3.5 w-3.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent ring-[3px] ring-surface" />
      </span>
      <span
        className={`absolute whitespace-nowrap rounded-full bg-surface/90 backdrop-blur border border-ink/10 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-lg shadow-ink/5 transition-colors group-hover:border-accent hidden md:block ${
          side === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : 'bottom-full mb-2 left-1/2 -translate-x-1/2'
        }`}
      >
        {label}
      </span>
    </a>
  );
}

function Hero({ isDark }) {
  return (
    <section className="relative overflow-hidden">
      <WaveFieldCanvas dark={isDark} className="absolute inset-0 w-full h-full opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/60 to-transparent pointer-events-none" />

      <div className={`relative ${WRAP} pt-28 sm:pt-32 lg:pt-36 pb-14 sm:pb-20`}>
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-4 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="pz-enter inline-flex items-center gap-2 rounded-full border border-ink/15 bg-surface/60 backdrop-blur px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] text-ink/75">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              CONSULTORÍA ACÚSTICA · DIFUSORES A MEDIDA
            </div>
            <h1 style={{ fontSize: 'clamp(2.6rem, 6.4vw, 5rem)' }} className="leading-[1.03] font-extrabold tracking-[-0.035em] text-ink">
              <Words text="Diseñamos cómo" start={120} />
              <br />
              <span className="pz-word font-serif-accent italic font-normal text-accent tracking-normal" style={{ animationDelay: '280ms' }}>suena</span>{' '}
              <Words text="tu espacio." start={360} />
            </h1>
            <p className="pz-enter text-base sm:text-lg text-ink/70 max-w-xl leading-relaxed" style={{ animationDelay: '520ms' }}>
              Medimos, simulamos y acondicionamos estudios de grabación, auditorios, aulas y restaurantes. Cada panel y cada difusor que proponemos sale de un cálculo, no de una suposición.
            </p>
            <div className="pz-enter flex flex-col sm:flex-row flex-wrap gap-3 pt-1" style={{ animationDelay: '640ms' }}>
              <a
                {...linkProps('/', 'contacto')}
                className="group inline-flex justify-center items-center gap-2.5 rounded-full bg-brand text-white font-semibold px-6 py-3.5 hover:bg-brand/90 transition-colors shadow-lg shadow-brand/25"
              >
                Cotizar mi proyecto
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                {...linkProps('/suite')}
                className="group inline-flex justify-center items-center gap-2 rounded-full border border-ink/20 bg-surface/60 backdrop-blur text-ink font-semibold px-6 py-3.5 hover:bg-ink hover:text-canvas transition-colors"
              >
                <Compass className="w-4 h-4" />
                Probar el simulador gratis
              </a>
            </div>
            <ul className="pz-enter flex flex-wrap gap-x-5 gap-y-2 pt-1 text-[13px] text-ink/60" style={{ animationDelay: '760ms' }}>
              {['Medición bajo ISO 3382', 'Simulación antes de fabricar', 'Difusores calculados a medida'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <Parallax speed={-0.55} className="lg:col-span-6 relative lg:-mr-10 xl:-mr-24">
            <div className="absolute inset-[6%] pz-halo blur-2xl pointer-events-none" />
            <div className="relative pz-hero-in">
            <div className="relative pz-float">
              <Render
                name="estudio-tratado"
                themed
                isDark={isDark}
                eager
                alt="Maqueta 3D de un estudio de grabación con paneles absorbentes, difusores QRD, trampas de graves y nubes de techo"
                className="aspect-[4/3]"
              />
              {HERO_HOTSPOTS.map((h, i) => (
                <Hotspot key={h.label} {...h} delay={1300 + i * 170} />
              ))}
            </div>
            </div>
            <RenderTag className="absolute -bottom-3 right-[12%]" />
          </Parallax>
        </div>

        <dl className="mt-14 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 border-t border-ink/10 pt-6">
          {[
            ['Control de reverberación (RT60)', 'Reverberación calculada con Sabine, Eyring y Millington según el uso del recinto.'],
            ['Claridad en graves', 'Modos propios, criterio de Bonello y proporciones óptimas de sala.'],
            ['Difusores calculados', 'QRD, PRD y MLS con respuesta polar y planos de corte listos.'],
            ['Voz entendible', '%ALcons y STI para aulas, auditorios y salas de conferencias.'],
          ].map(([k, v], i) => (
            <div key={k} className={`pz-enter pr-4 ${i > 0 ? 'lg:pl-6 lg:border-l border-ink/10' : ''}`} style={{ animationDelay: `${900 + i * 100}ms` }}>
              <dt className="font-mono text-xs sm:text-sm font-semibold text-ink flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                {k}
              </dt>
              <dd className="text-xs sm:text-[13px] text-ink/55 mt-1.5 leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>

        <a {...linkProps('/', 'antes-despues')} className="mt-10 hidden lg:inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-ink/45 hover:text-ink transition-colors">
          <ArrowDown className="w-3.5 h-3.5 motion-safe:animate-bounce" />
          VER EL ANTES Y EL DESPUÉS
        </a>
      </div>
    </section>
  );
}

function SpacesMarquee() {
  const row = [...SPACES_MARQUEE, ...SPACES_MARQUEE];
  return (
    <div className="border-y border-ink/[0.06] py-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="pz-marquee flex w-max gap-10 whitespace-nowrap">
        {row.map((s, i) => (
          <span key={i} className="flex items-center gap-10 text-ink/45 text-sm sm:text-base font-medium">
            {s}
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- SERVICIOS */

function Services() {
  return (
    <section id="servicios" className={SECTION}>
      <div className={`${WRAP} space-y-14`}>
        <Reveal className="grid lg:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <Eyebrow index="02">QUÉ HACEMOS</Eyebrow>
            <h2 className={H2}>
              Soluciones claras para cada <Accent muted>problema acústico.</Accent>
            </h2>
          </div>
          <p className="text-ink/60 leading-relaxed lg:max-w-md lg:justify-self-end">
            Desde medir por qué tu sala retumba hasta entregar los paneles y difusores instalados. Puedes probar cada herramienta directamente en nuestro simulador.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal
                key={s.title}
                delay={i * 50}
                className={`group relative rounded-3xl p-7 flex flex-col justify-between border transition-all hover:-translate-y-0.5 ${
                  s.feature ? 'border-brand/40 bg-brand/[0.06] hover:bg-brand/[0.10]' : 'border-ink/10 bg-surface hover:border-ink/20'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`w-11 h-11 grid place-items-center rounded-xl border ${s.feature ? 'border-brand/50 bg-brand/15 text-brand' : 'border-ink/10 bg-ink/[0.04] text-ink/80'}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="font-mono text-[11px] text-ink/30">0{i + 1}</span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold text-ink">{s.title}</h3>
                    <p className="text-xs font-medium text-accent">Ideal para: {s.idealFor}</p>
                  </div>
                  <p className="text-sm text-ink/60 leading-relaxed">{s.text}</p>
                </div>
                <div className="pt-6 mt-6 border-t border-ink/[0.07] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <span key={t} className="font-mono text-[10px] tracking-wide text-ink/55 border border-ink/10 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                  <a {...linkProps('/suite', s.suiteHash)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline ml-auto">
                    {s.suiteLabel} <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- TRATAMIENTOS */

function Treatments({ onQuote }) {
  return (
    <section id="tratamientos" className={SECTION}>
      <div className={`${WRAP} space-y-14`}>
        <Reveal className="grid lg:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <Eyebrow index="03">TRATAMIENTOS A MEDIDA</Eyebrow>
            <h2 className={H2}>
              Cada pieza se calcula para <Accent>tu sala.</Accent>
            </h2>
          </div>
          <p className="text-ink/60 leading-relaxed lg:max-w-md lg:justify-self-end">
            Absorción, control de graves y difusión. Definimos medidas, cantidades y ubicación a partir de la simulación, y los difusores salen con su lista de corte.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCTS.map((p, i) => (
            <Reveal as="article" key={p.id} delay={(i % 4) * 60} className="group rounded-3xl border border-ink/10 bg-surface overflow-hidden flex flex-col hover:border-ink/20 transition-colors">
              <div className="relative aspect-square bg-gradient-to-b from-ink/[0.015] to-ink/[0.07]">
                <Render
                  name={`producto-${p.id}`}
                  alt={`Render de ${p.name.toLowerCase()}`}
                  className="pz-pop absolute inset-2 group-hover:scale-[1.06]"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col gap-3">
                <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                <p className="text-sm text-ink/60 leading-relaxed flex-1">{p.text}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.specs.map((s) => (
                    <span key={s} className="font-mono text-[10px] tracking-wide text-ink/55 border border-ink/10 rounded-full px-2 py-0.5">{s}</span>
                  ))}
                </div>
                <button type="button" onClick={() => onQuote(p.name)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline self-start">
                  Cotizar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Reveal>
          ))}

          <Reveal delay={180} className="rounded-3xl border border-brand/40 bg-brand/[0.06] p-7 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <span className="w-11 h-11 grid place-items-center rounded-xl border border-brand/50 bg-brand/15 text-brand">
                <Ear className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-bold text-ink">¿No sabes cuál necesitas?</h3>
              <p className="text-sm text-ink/60 leading-relaxed">Empieza por un diagnóstico: medimos la sala y te decimos qué tratamiento, cuánto y dónde.</p>
            </div>
            <button
              type="button"
              onClick={() => onQuote('Diagnóstico acústico')}
              className="group inline-flex justify-center items-center gap-2 rounded-full bg-brand text-white font-semibold px-5 py-3 hover:bg-brand/90 transition-colors"
            >
              Pedir un diagnóstico
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>

        <p className="text-xs text-ink/40 flex flex-wrap items-center gap-x-4 gap-y-1">
          <RenderTag />
          <span>Los valores indicados son típicos de referencia; el desempeño final se define en el diseño de cada proyecto.</span>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ ESPACIOS */

function Spaces({ isDark }) {
  const [active, setActive] = useState(SPACES[0].id);
  const space = SPACES.find((s) => s.id === active);

  return (
    <section id="espacios" className={`${SECTION} pz-grid-bg`}>
      <div className={`${WRAP} space-y-12`}>
        <Reveal className="max-w-2xl space-y-4">
          <Eyebrow index="04">ESPACIOS QUE TRATAMOS</Eyebrow>
          <h2 className={H2}>
            Un objetivo acústico distinto para <Accent>cada uso.</Accent>
          </h2>
          <p className="text-ink/60 leading-relaxed">No suena igual una sala de mezcla que una sala de juntas. Así se ve el tratamiento cuando se diseña para lo que ocurre adentro.</p>
        </Reveal>

        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <Reveal variant="left" className="lg:col-span-7 relative">
            <div className="absolute inset-[10%] pz-halo blur-2xl pointer-events-none" />
            <Render
              key={space.id}
              name={space.render}
              themed
              isDark={isDark}
              alt={`Maqueta 3D: ${space.tab.toLowerCase()} con tratamiento acústico`}
              className="relative aspect-[4/3] animate-fadeIn"
            />
            <RenderTag className="absolute bottom-0 left-4" />
          </Reveal>

          <Reveal delay={80} variant="right" className="lg:col-span-5 space-y-3" role="tablist" aria-label="Tipos de espacio">
            {SPACES.map((s) => {
              const open = s.id === active;
              return (
                <div key={s.id} className={`rounded-3xl border transition-colors ${open ? 'border-brand/40 bg-surface shadow-[0_20px_50px_-30px_rgb(var(--pz-brand)/0.5)]' : 'border-ink/10 bg-surface/70 hover:border-ink/25'}`}>
                  <button type="button" role="tab" aria-selected={open} onClick={() => setActive(s.id)} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left">
                    <span className={`font-bold ${open ? 'text-ink' : 'text-ink/70'}`}>{s.tab}</span>
                    <Plus className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-45 text-brand' : 'text-ink/40'}`} />
                  </button>
                  {open && (
                    <div className="px-6 pb-6 space-y-4 animate-fadeIn">
                      <p className="text-xl font-semibold text-ink leading-snug">{s.title}</p>
                      <p className="text-sm text-ink/60 leading-relaxed">{s.text}</p>
                      <ul className="space-y-1.5 text-sm text-ink/75">
                        {s.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <dl className="grid grid-cols-2 gap-2 pt-1">
                        {s.targets.map(([k, v]) => (
                          <div key={k} className="rounded-2xl border border-ink/10 bg-canvas/60 px-3 py-2.5">
                            <dt className="text-[11px] text-ink/50">{k}</dt>
                            <dd className="font-mono text-sm font-semibold text-ink mt-0.5">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              );
            })}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- PROCESO */

function Process() {
  // La línea se llena y los pasos se encienden a medida que la sección cruza la pantalla
  const [ref, reached] = useScrollSteps(PROCESS.length);
  return (
    <section id="proceso" className={SECTION}>
      <div className={`${WRAP} space-y-14`}>
        <Reveal className="max-w-2xl space-y-4">
          <Eyebrow index="06">PASO A PASO</Eyebrow>
          <h2 className={H2}>Medir antes de opinar.</h2>
          <p className="text-ink/60 leading-relaxed">Nuestro proceso de consultoría en 5 etapas claras: sin adivinanzas, todo verificado con instrumentos y simulación.</p>
        </Reveal>
        <div ref={ref} className="space-y-6">
          <div className="hidden md:block relative h-px bg-ink/10" aria-hidden="true">
            <div className="pz-progress-line absolute inset-0 bg-gradient-to-r from-brand to-accent" />
          </div>
          <ol className="grid md:grid-cols-5 gap-4">
            {PROCESS.map((p, i) => {
              const on = i < reached;
              return (
                <Reveal
                  as="li"
                  key={p.n}
                  delay={i * 70}
                  className={`relative rounded-2xl border bg-surface p-6 flex flex-col justify-between gap-4 ${on ? 'border-brand/40 shadow-[0_18px_40px_-28px_rgb(var(--pz-brand)/0.7)]' : 'border-ink/10'}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg font-mono text-xs font-bold grid place-items-center transition-colors duration-500 ${on ? 'bg-brand text-white' : 'bg-brand/15 text-brand'}`}>{p.n}</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-ink/20 to-transparent" />
                    </div>
                    <h3 className="text-lg font-bold text-ink">{p.title}</h3>
                    <p className="text-sm text-ink/60 leading-relaxed">{p.text}</p>
                  </div>
                  <div className={`pt-3 border-t border-ink/[0.07] flex items-center gap-1.5 text-[11px] font-mono transition-colors duration-500 ${on ? 'text-accent' : 'text-ink/35'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{p.deliverable}</span>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- DIFUSOR LAB */

const PRIMES = [7, 11, 13, 17, 19, 23];

function DiffuserPromo() {
  const [idx, setIdx] = useState(2);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % PRIMES.length), 2600);
    return () => clearInterval(t);
  }, [autoPlay]);

  const p = PRIMES[idx];
  const seq = useMemo(() => quadraticResidueSequence(p), [p]);

  return (
    <section id="difusor-lab" className={SECTION}>
      <div className={WRAP}>
        <Reveal variant="scale" className="relative rounded-[32px] border border-ink/10 overflow-hidden bg-gradient-to-br from-brand/[0.10] via-surface to-surface">
          <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-brand/25 blur-[120px] pointer-events-none" />
          <div className="relative grid lg:grid-cols-12 gap-10 p-6 sm:p-12 lg:p-14 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Eyebrow index="07">LABORATORIO DE DIFUSORES</Eyebrow>
              <h2 className={H2}>
                Diseña tu propio difusor en <Accent>segundos.</Accent>
              </h2>
              <p className="text-ink/65 leading-relaxed">
                Solo indica el rango de frecuencias que necesitas controlar. El laboratorio calcula el ancho y la profundidad exacta de cada ranura, grafica cómo se dispersa el sonido y genera la <strong className="font-semibold text-ink">lista de piezas para carpintería o corte láser</strong>.
              </p>
              <ul className="grid sm:grid-cols-2 gap-2.5 text-sm text-ink/75">
                {[
                  ['QRD 1D y 2D (skyline)', 'Dispersión en uno o dos planos'],
                  ['PRD (raíces primitivas)', 'Elimina la reflexión especular'],
                  ['MLS binario', 'Bajo espesor para espacios reducidos'],
                  ['Policilíndrico', 'Superficies curvas suaves'],
                  ['Diagrama polar en vivo', 'Visualiza hacia dónde va el sonido'],
                  ['Lista de corte CSV / SVG', 'Medidas listas para fabricar'],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-2 rounded-xl border border-ink/[0.07] bg-canvas/50 p-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-ink text-xs">{title}</div>
                      <div className="text-[11px] text-ink/50">{desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <a {...linkProps('/suite', 'diffusers')} className="group inline-flex items-center gap-2 rounded-full bg-brand text-white font-semibold px-6 py-3.5 hover:bg-brand/90 transition-colors">
                Abrir laboratorio de difusores
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['producto-qrd', 'QRD · una dimensión'],
                  ['producto-skyline', 'Skyline · dos dimensiones'],
                ].map(([name, label]) => (
                  <figure key={name} className="rounded-2xl border border-ink/10 bg-canvas/70 overflow-hidden">
                    <Render name={name} alt={`Render de difusor ${label}`} className="aspect-square p-1" />
                    <figcaption className="px-3 pb-3 font-mono text-[10px] tracking-[0.12em] uppercase text-ink/50">{label}</figcaption>
                  </figure>
                ))}
              </div>

              <div className="rounded-2xl border border-ink/10 bg-canvas/80 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-ink">Perfil de ranuras QRD</div>
                    <div className="text-[11px] text-ink/50 font-mono">sₙ = n² mod p</div>
                  </div>
                  <div className="flex items-center gap-1 bg-ink/[0.05] p-1 rounded-xl border border-ink/10">
                    {PRIMES.map((prime, i) => (
                      <button
                        key={prime}
                        type="button"
                        onClick={() => {
                          setAutoPlay(false);
                          setIdx(i);
                        }}
                        aria-pressed={idx === i}
                        className={`px-2 py-1 rounded-lg font-mono text-xs font-semibold transition ${idx === i ? 'bg-brand text-white' : 'text-ink/60 hover:text-ink'}`}
                        title={`Ver difusor de ${prime} ranuras`}
                      >
                        {prime}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-[3px] h-28 bg-ink/[0.03] rounded-xl p-2 border border-ink/[0.06]" aria-label={`Perfil QRD con p = ${p}`}>
                  {seq.map((s, i) => (
                    <div key={`${p}-${i}`} className="flex-1 h-full">
                      <div className="w-full rounded-b-sm bg-gradient-to-b from-brand to-accent transition-all duration-500" style={{ height: `${8 + (s / (p - 1)) * 92}%` }} title={`Ranura ${i + 1}: s = ${s}`} />
                    </div>
                  ))}
                </div>
                <div className="font-mono text-[11px] text-ink/60 break-all leading-relaxed">{seq.join(' · ')}</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ SOFTWARE */

function SoftwarePromo() {
  const modules = [
    ['1. Geometría 2D / 3D', 'Dibuja salas rectangulares, en L, trapecios o paredes curvas.', 'geometry'],
    ['2. Materiales y absorción', 'Catálogo ISO 354 para piso, techo, muros, puertas y ventanas.', 'materials'],
    ['3. Fuente y receptor', 'Ajusta potencia sonora (Lw), directividad (Q) y distancia crítica.', 'source'],
    ['4. Tiempo de reverberación', 'Compara Sabine, Eyring y Millington contra el RT60 ideal.', 'results'],
    ['5. Modos propios (graves)', 'Frecuencia de Schroeder, criterio de Bonello y mapa de presión.', 'modes'],
    ['6. Inteligibilidad de voz', 'Porcentaje %ALcons, STI, ocupación de personas y logátomos.', 'intelligibility'],
    ['Estudio de renders', 'Crea imágenes 3D de tu sala tratada o de un difusor a tu medida.', 'renders'],
    ['Fichas técnicas', 'Cada fórmula, su norma y una comprobación con tus propios datos.', 'fichas'],
  ];

  return (
    <section id="software" className={SECTION}>
      <div className={`${WRAP} space-y-12`}>
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <Reveal className="lg:col-span-7 space-y-4">
            <Eyebrow index="08">SIMULADOR WEB GRATUITO</Eyebrow>
            <h2 className={H2}>
              Empieza ahora: ¿cuánto <Accent>resuena</Accent> tu sala?
            </h2>
            <p className="text-ink/60 leading-relaxed max-w-2xl">
              Mueve las medidas y obtén una primera estimación al instante. Cuando quieras el análisis completo, POZOLE Suite te guía desde la geometría hasta el informe técnico imprimible.
            </p>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:justify-self-end">
            <a {...linkProps('/suite')} className="group inline-flex items-center gap-2 rounded-full bg-ink text-canvas font-semibold px-6 py-3.5 hover:bg-accent transition-colors">
              Entrar a POZOLE Suite
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </Reveal>
        </div>

        <Reveal variant="scale">
          <QuickCalc />
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {modules.map(([t, d, hash], i) => (
            <Reveal key={t} delay={i * 50}>
              <a {...linkProps('/suite', hash)} className="group h-full rounded-2xl border border-ink/10 bg-surface hover:border-brand/50 p-5 flex flex-col justify-between gap-4 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink group-hover:text-brand transition-colors">{t}</span>
                    <ArrowUpRight className="w-4 h-4 text-ink/30 group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-ink/55 leading-relaxed">{d}</p>
                </div>
                <span className="text-[11px] font-mono text-brand/80 group-hover:text-brand">Abrir módulo en el simulador →</span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- PLANES */

function Plans({ onQuote }) {
  return (
    <section id="planes" className={SECTION}>
      <div className={`${WRAP} space-y-14`}>
        <Reveal className="max-w-2xl space-y-4">
          <Eyebrow index="09">CÓMO TRABAJAR CON NOSOTROS</Eyebrow>
          <h2 className={H2}>
            Elige hasta dónde quieres que <Accent>lleguemos.</Accent>
          </h2>
          <p className="text-ink/60 leading-relaxed">Cada proyecto se cotiza según el tamaño de la sala y su uso. Estos son los tres alcances con los que trabajamos.</p>
        </Reveal>

        <div className="grid lg:grid-cols-3 gap-4 items-stretch">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.name}
              delay={i * 70}
              className={`relative rounded-3xl border p-7 sm:p-8 flex flex-col gap-6 ${
                plan.featured ? 'border-brand/50 bg-surface shadow-[0_30px_70px_-35px_rgb(var(--pz-brand)/0.6)] lg:-my-3' : 'border-ink/10 bg-surface'
              }`}
            >
              {plan.featured && <span className="absolute -top-3 left-7 rounded-full bg-brand text-white text-[11px] font-semibold px-3 py-1">El más solicitado</span>}
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] tracking-[0.2em] text-ink/40">0{i + 1}</div>
                <h3 className="text-2xl font-bold text-ink">{plan.name}</h3>
                <p className="text-sm text-ink/60">{plan.tagline}</p>
              </div>
              <ul className="space-y-2.5 text-sm text-ink/75 flex-1">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? 'text-brand' : 'text-accent'}`} />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onQuote(`Plan ${plan.name}`)}
                className={`group inline-flex justify-center items-center gap-2 rounded-full font-semibold px-5 py-3 transition-colors ${
                  plan.featured ? 'bg-brand text-white hover:bg-brand/90' : 'border border-ink/20 text-ink hover:bg-ink hover:text-canvas'
                }`}
              >
                Solicitar cotización
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- FAQ */

function Faq() {
  return (
    <section id="preguntas" className={SECTION}>
      <div className={`${WRAP} grid lg:grid-cols-12 gap-10`}>
        <Reveal className="lg:col-span-4 space-y-4">
          <Eyebrow index="10">PREGUNTAS FRECUENTES</Eyebrow>
          <h2 className={H2}>
            Lo que casi todos <Accent>preguntan.</Accent>
          </h2>
        </Reveal>
        <div className="lg:col-span-8 space-y-2.5">
          {FAQ.map((item, i) => (
            <Reveal as="details" key={item.q} delay={i * 40} className="group rounded-2xl border border-ink/10 bg-surface px-6 py-4 open:border-ink/20">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-ink">
                {item.q}
                <Plus className="w-4 h-4 shrink-0 text-ink/40 transition-transform group-open:rotate-45 group-open:text-brand" />
              </summary>
              <p className="mt-3 text-sm text-ink/65 leading-relaxed max-w-3xl">{item.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- EQUIPO */

function Team() {
  return (
    <section id="equipo" className={SECTION}>
      <div className={`${WRAP} space-y-12`}>
        <Reveal className="space-y-4 max-w-2xl">
          <Eyebrow index="11">EQUIPO</Eyebrow>
          <h2 className={H2}>
            Ingenieros que <Accent>escuchan.</Accent>
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-4">
          {TEAM.map((m, i) => {
            const initials = m.name.split(' ').map((w) => w[0]).join('');
            return (
              <Reveal key={m.name} delay={i * 80} className="group rounded-3xl border border-ink/10 bg-surface p-6 space-y-6 hover:border-ink/20 transition-colors">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand/[0.14] to-surface2 border border-ink/[0.06] grid place-items-center relative overflow-hidden">
                  <Ear className="absolute w-40 h-40 text-ink/[0.03] -right-6 -bottom-6" />
                  <span className="font-display text-5xl font-extrabold text-ink/90 tracking-tight">{initials}</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-ink">{m.name}</div>
                  <div className="text-sm text-ink/50">{m.role}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ CONTACTO */

function Contact({ interest }) {
  const [form, setForm] = useState({ name: '', email: '', space: 'Estudio de grabación', message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Al pulsar «Cotizar» en un tratamiento o plan, el mensaje llega con ese interés ya escrito
  useEffect(() => {
    if (!interest) return;
    setForm((f) => (f.message && !f.message.startsWith('Me interesa:') ? f : { ...f, message: `Me interesa: ${interest}.\n` }));
  }, [interest]);

  const submit = (e) => {
    e.preventDefault();
    const subject = `Proyecto acústico — ${form.space}`;
    const body = `Nombre: ${form.name}\nCorreo: ${form.email}\nEspacio: ${form.space}\n\n${form.message}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const input = 'w-full rounded-xl bg-ink/[0.04] border border-ink/10 px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition';

  return (
    <section id="contacto" className={`${SECTION} relative overflow-hidden`}>
      <div className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full bg-brand/15 blur-[130px] pointer-events-none" />
      <div className={`relative ${WRAP} grid lg:grid-cols-2 gap-12`}>
        <Reveal variant="left" className="space-y-6">
          <Eyebrow index="12">CONTACTO</Eyebrow>
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink">
            ¿Cómo quieres que <Accent>suene</Accent> tu sala?
          </h2>
          <p className="text-ink/60 leading-relaxed max-w-md">Cuéntanos qué espacio tienes y para qué lo usas. Te respondemos con una propuesta de diagnóstico.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 font-mono text-sm text-ink/80 hover:text-accent transition-colors">
            {CONTACT_EMAIL} <ArrowUpRight className="w-4 h-4" />
          </a>
          <ul className="space-y-2 pt-2 text-sm text-ink/65">
            {['Respuesta con una propuesta de alcance', 'Primera estimación con tu plano o tus medidas', `Simulación de tu sala en ${BRAND.name} Suite`].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100} variant="right">
          <form onSubmit={submit} className="rounded-3xl border border-ink/10 bg-surface p-6 sm:p-8 space-y-4 shadow-[0_30px_80px_-45px_rgb(var(--pz-brand)/0.5)]">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-sm">
                <span className="text-ink/60">Nombre</span>
                <input required value={form.name} onChange={set('name')} className={input} placeholder="Tu nombre" autoComplete="name" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-ink/60">Correo</span>
                <input required type="email" value={form.email} onChange={set('email')} className={input} placeholder="tu@correo.com" autoComplete="email" />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="text-ink/60">Tipo de espacio</span>
              <select value={form.space} onChange={set('space')} className={`${input} appearance-none`}>
                {SPACES_MARQUEE.map((s) => (
                  <option key={s} className="bg-surface">{s}</option>
                ))}
                <option className="bg-surface">Otro</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-ink/60">Cuéntanos del proyecto</span>
              <textarea value={form.message} onChange={set('message')} rows={4} className={`${input} resize-none`} placeholder="Dimensiones aproximadas, uso, problemas que notas…" />
            </label>
            <button type="submit" className="group w-full inline-flex justify-center items-center gap-2 rounded-full bg-brand text-white font-semibold px-6 py-3.5 hover:bg-brand/90 transition-colors">
              Enviar solicitud
              <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-xs text-ink/35 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" /> Se abrirá tu cliente de correo con el mensaje listo.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
