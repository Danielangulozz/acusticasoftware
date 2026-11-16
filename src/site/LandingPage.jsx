import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, Compass, Ear, Plus, Ruler, Send } from 'lucide-react';
import ReflectionDemo from './ReflectionDemo';
import BeforeAfter from './BeforeAfter';
import QuickCalc from './QuickCalc';
import Render, { RenderTag } from './Render';
import { SiteNav, SiteFooter, Eyebrow } from './SiteChrome';
import { Reveal, Words, useScrollSteps } from './motion';
import { BRAND, CONTACT_EMAIL, TEAM } from './siteConfig';
import { FAQ, PLANS, PROCESS, PRODUCTS, SERVICES, SPACES, SPACES_MARQUEE } from './content';
import { linkProps, navigate } from '../router';
import { useTheme } from '../theme';
import { quadraticResidueSequence } from '../utils/diffuserCalculations';

const SECTION = 'py-24 sm:py-32 scroll-mt-16';
const BAND = `${SECTION} pz-band`;
const WRAP = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
const H2 = 'text-4xl sm:text-5xl tracking-tight text-ink';
/**
 * Palabra destacada: misma tipografía y color que el título, con un subrayado morado trazado a
 * mano que se dibuja cuando la sección entra en pantalla y se vuelve a trazar al pasar el mouse.
 * La puntuación final queda fuera del trazo.
 */
function Accent({ children }) {
  const text = String(children);
  const [, word, tail] = text.match(/^(.*?)([.,;:!?¿¡]*)$/s);
  return (
    <>
      <span className="pz-mark">
        {word}
        <svg className="pz-mark-line" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path pathLength="1" d="M4 15.5C38 10.5 77 8.2 116 9.4c27 .8 51 2.6 79 6.1" />
          <path pathLength="1" d="M30 19.5c35-4.4 81-6.4 124-4.6 12 .5 24 1.4 34 2.6" />
        </svg>
      </span>
      {tail}
    </>
  );
}

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
      <SiteNav isDark={isDark} onToggleTheme={toggleTheme} />
      <Hero />
      <SpacesMarquee />

      <section id="antes-despues" className="py-24 sm:py-32 scroll-mt-16">
        <div className={`${WRAP} space-y-12`}>
          <Reveal className="grid lg:grid-cols-2 gap-6 items-end">
            <div className="space-y-4">
              <Eyebrow>RESULTADOS</Eyebrow>
              <h2 className={H2}>
                La misma sala. Otro sonido.
              </h2>
            </div>
            <p className="text-ink/70 leading-relaxed lg:max-w-md lg:justify-self-end">
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
            <Eyebrow>CÓMO FUNCIONA EL TRATAMIENTO ACÚSTICO</Eyebrow>
            <h2 className={H2}>
              Cada superficie decide a dónde va el sonido.
            </h2>
            <p className="text-ink/70 leading-relaxed">
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

// La portada usa el mismo margen que el menú y que todas las secciones
const HERO_WRAP = WRAP;

const HERO_POINTS = [
  ['Control de reverberación', 'RT60 calculado con Sabine, Eyring y Millington según el uso de la sala.'],
  ['Claridad en graves', 'Modos propios, criterio de Bonello y proporciones de sala.'],
  ['Difusores a medida', 'QRD, PRD y MLS con respuesta polar y planos de corte.'],
  ['Voz entendible', '%ALcons y STI para aulas, auditorios y salas de juntas.'],
];

function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] flex flex-col overflow-hidden bg-[#0d0b12] text-white">
      {/* Render propio en 4K (tools/render-lab/hero.js); en pantallas normales baja la versión 1920 */}
      <img
        src="/renders/hero-estudio-1920.webp"
        srcSet="/renders/hero-estudio-1920.webp 1920w, /renders/hero-estudio.webp 3840w"
        sizes="100vw"
        alt="Render de un estudio de mezcla con tratamiento acústico: frente de listones de nogal, difusores QRD, trampas de graves y nube sobre el punto de escucha"
        fetchpriority="high"
        decoding="async"
        draggable={false}
        className="pz-hero-photo absolute inset-0 -z-10 w-full h-full object-cover object-[70%_center] select-none"
      />
      <div className="absolute inset-0 -z-10 bg-black/35 lg:bg-transparent lg:bg-gradient-to-r lg:from-black/80 lg:via-black/40 lg:to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      <div className={`${HERO_WRAP} w-full flex-1 flex items-center pt-28 pb-12`}>
        <div className="max-w-2xl space-y-7">
          <h1 style={{ fontSize: 'clamp(2.7rem, 6vw, 5.4rem)' }} className="leading-[1.02] text-white">
            <Words text="Diseñamos cómo" start={120} />
            <br />
            <span className="pz-word" style={{ animationDelay: '280ms' }}>
              <span className="font-serif-accent pr-[0.06em]">suena</span>
            </span>{' '}
            <Words text="tu espacio." start={360} />
          </h1>
          <p className="pz-enter text-lg sm:text-xl font-light text-white/80 max-w-xl leading-relaxed" style={{ animationDelay: '520ms' }}>
            Medimos, simulamos y acondicionamos estudios, auditorios, aulas y restaurantes. Cada panel y cada difusor sale de un cálculo, no de una suposición.
          </p>
          <div className="pz-enter flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-1" style={{ animationDelay: '640ms' }}>
            <a
              {...linkProps('/', 'contacto')}
              className="group inline-flex justify-center items-center gap-2.5 rounded-full bg-[#6d4ae6] text-white font-medium px-7 py-3.5 hover:bg-[#7c5cf0] transition-colors shadow-lg shadow-[#6d4ae6]/30"
            >
              Cotizar mi proyecto
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              {...linkProps('/suite')}
              className="group inline-flex justify-center items-center gap-2 rounded-full border border-white/30 sm:border-transparent px-6 sm:px-1 py-3.5 font-medium text-white/85 hover:text-white transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span className="sm:underline sm:underline-offset-[6px] sm:decoration-white/30 group-hover:decoration-white">Abrir el simulador</span>
            </a>
          </div>
        </div>
      </div>

      <div className={`${HERO_WRAP} w-full pb-8`}>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 border-t border-white/15 pt-6">
          {HERO_POINTS.map(([k, v], i) => (
            <div key={k} className="pz-enter" style={{ animationDelay: `${900 + i * 100}ms` }}>
              <dt className="text-[15px] font-medium text-white">{k}</dt>
              <dd className="hidden sm:block text-[13.5px] font-light text-white/60 mt-1 leading-relaxed max-w-[30ch]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[12px] text-white/50">Render conceptual · imagen de elaboración propia</p>
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
          <span key={i} className="flex items-center gap-10 text-ink/60 text-sm sm:text-base font-medium">
            {s}
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- SERVICIOS */

// Bento: el servicio insignia (difusores) ocupa el bloque grande y el resto se acomoda alrededor
const BENTO = [
  { id: 'diffusers', className: 'sm:col-span-2 lg:row-span-2', media: 'producto-qrd', brand: true },
  { id: 'measure', className: 'sm:col-span-2' },
  { id: 'treatment' },
  { id: 'bass' },
  { id: 'voice', className: 'sm:col-span-2' },
  { id: 'report', className: 'sm:col-span-2', media: 'estudio-tratado' },
];
const SERVICE_ORDER = { measure: 0, treatment: 1, diffusers: 2, bass: 3, voice: 4, report: 5 };

function Services() {
  return (
    <section id="servicios" className={BAND}>
      <div className={`${WRAP} space-y-12`}>
        <Reveal className="grid lg:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <Eyebrow>Qué hacemos</Eyebrow>
            <h2 className={H2}>
              Soluciones claras para cada problema <Accent>acústico.</Accent>
            </h2>
          </div>
          <p className="text-ink/70 leading-relaxed lg:max-w-md lg:justify-self-end">
            Desde medir por qué tu sala retumba hasta entregar los paneles y difusores instalados. Cada servicio tiene su herramienta en nuestro simulador para que lo pruebes.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(250px,auto)]">
          {BENTO.map((tile, i) => (
            <ServiceTile key={tile.id} s={SERVICES[SERVICE_ORDER[tile.id]]} {...tile} delay={i * 60} />
          ))}
        </div>
        <RenderTag className="block" />
      </div>
    </section>
  );
}

function ServiceTile({ s, className = '', media, brand, delay }) {
  const Icon = s.icon;
  const ideal = s.idealFor.charAt(0).toLowerCase() + s.idealFor.slice(1);
  return (
    <Reveal delay={delay} className={`group flex ${className}`}>
      <div
        className={`flex-1 rounded-3xl overflow-hidden flex ${brand ? 'pz-scope-brand flex-col' : 'pz-card pz-card-lift'} ${media && !brand ? 'flex-col sm:flex-row' : 'flex-col'
          }`}
      >
        {media && brand && (
          <div className="p-3 pb-0">
            <div className="rounded-[22px] overflow-hidden bg-gradient-to-b from-ink/[0.04] to-ink/[0.12] aspect-[16/10]">
              <Render name={media} alt={`Render de ${s.title.toLowerCase()}`} className="w-full h-full p-5" />
            </div>
          </div>
        )}
        <div className="p-7 flex-1 flex flex-col gap-3">
          <Icon className="w-6 h-6 text-brand" strokeWidth={1.75} />
          <h3 className={`${brand ? 'text-2xl sm:text-[28px]' : 'text-xl'} font-medium text-ink leading-snug`}>{s.title}</h3>
          <p className="text-[15px] text-ink/75 leading-relaxed">{s.text}</p>
          <p className="text-[13px] text-ink/70">Ideal para {ideal}.</p>
          <a {...linkProps('/suite', s.suiteHash)} className="mt-auto pt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline self-start">
            {s.suiteLabel} <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
        {media && !brand && (
          <div className="sm:w-[46%] p-3 sm:pl-0">
            <div className="rounded-[22px] overflow-hidden h-full min-h-[200px] bg-gradient-to-b from-brand/[0.06] to-brand/[0.14]">
              <Render name={media} alt={`Render de ${s.title.toLowerCase()}`} className="w-full h-full p-3" />
            </div>
          </div>
        )}
      </div>
    </Reveal>
  );
}

/* -------------------------------------------------------------- TRATAMIENTOS */

function Treatments({ onQuote }) {
  return (
    <section id="tratamientos" className={SECTION}>
      <div className={`${WRAP} space-y-14`}>
        <Reveal className="grid lg:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <Eyebrow>TRATAMIENTOS A MEDIDA</Eyebrow>
            <h2 className={H2}>
              Cada pieza se calcula para <Accent>tu sala.</Accent>
            </h2>
          </div>
          <p className="text-ink/70 leading-relaxed lg:max-w-md lg:justify-self-end">
            Absorción, control de graves y difusión. Definimos medidas, cantidades y ubicación a partir de la simulación, y los difusores salen con su lista de corte.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCTS.map((p, i) => (
            <Reveal as="article" key={p.id} delay={(i % 4) * 60} className="group pz-card pz-card-lift rounded-3xl overflow-hidden flex flex-col">
              <div className="p-3 pb-0">
                <div className="pz-morph relative aspect-square bg-gradient-to-b from-brand/[0.04] to-brand/[0.12]">
                  <Render name={`producto-${p.id}`} alt={`Render de ${p.name.toLowerCase()}`} className="pz-pop absolute inset-2" />
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-3">
                <h3 className="text-lg font-medium text-ink">{p.name}</h3>
                <p className="text-sm text-ink/70 leading-relaxed flex-1">{p.text}</p>
                <p className="text-[12px] text-ink/60">{p.specs.join(' · ')}</p>
                <button type="button" onClick={() => onQuote(p.name)} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline self-start">
                  Cotizar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Reveal>
          ))}

          <Reveal delay={180} className="pz-scope-brand rounded-3xl p-7 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <Ear className="w-7 h-7 text-brand" strokeWidth={1.75} />
              <h3 className="text-2xl font-medium text-ink">¿No sabes cuál necesitas?</h3>
              <p className="text-[15px] text-ink/75 leading-relaxed">Empieza por un diagnóstico: medimos la sala y te decimos qué tratamiento, cuánto y dónde.</p>
            </div>
            <button
              type="button"
              onClick={() => onQuote('Diagnóstico acústico')}
              className="group inline-flex justify-center items-center gap-2 rounded-full bg-[#fff] text-[#1b0f3d] font-medium px-5 py-3 hover:bg-[#f2b84b] transition-colors"
            >
              Pedir un diagnóstico
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>

        <p className="text-[12px] text-ink/70 flex flex-wrap items-center gap-x-4 gap-y-1">
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
    <section id="espacios" className={BAND}>
      <div className={`${WRAP} space-y-12`}>
        <Reveal className="max-w-2xl space-y-4">
          <Eyebrow>ESPACIOS QUE TRATAMOS</Eyebrow>
          <h2 className={H2}>
            Un objetivo acústico distinto para cada uso.
          </h2>
          <p className="text-ink/70 leading-relaxed">No suena igual una sala de mezcla que una sala de juntas. Así se ve el tratamiento cuando se diseña para lo que ocurre adentro.</p>
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
                <div key={s.id} className={`rounded-3xl transition-all ${open ? 'pz-card ring-1 ring-brand/30' : 'bg-surface/60 hover:bg-surface'}`}>
                  <button type="button" role="tab" aria-selected={open} onClick={() => setActive(s.id)} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left">
                    <span className={`font-medium ${open ? 'text-ink' : 'text-ink/75'}`}>{s.tab}</span>
                    <Plus className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-45 text-brand' : 'text-ink/55'}`} />
                  </button>
                  {open && (
                    <div className="px-6 pb-6 space-y-4 animate-fadeIn">
                      <p className="text-xl font-medium text-ink leading-snug">{s.title}</p>
                      <p className="text-sm text-ink/70 leading-relaxed">{s.text}</p>
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
                          <div key={k} className="rounded-2xl bg-ink/[0.04] px-3 py-2.5">
                            <dt className="text-[11px] text-ink/65">{k}</dt>
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
    <section id="proceso" className={BAND}>
      <div className={`${WRAP} space-y-14`}>
        <Reveal className="max-w-2xl space-y-4">
          <Eyebrow>PASO A PASO</Eyebrow>
          <h2 className={H2}>Medir antes de opinar.</h2>
          <p className="text-ink/70 leading-relaxed">Nuestro proceso de consultoría en 5 etapas claras: sin adivinanzas, todo verificado con instrumentos y simulación.</p>
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
                  className={`relative pz-card rounded-2xl p-6 flex flex-col justify-between gap-4 ${on ? 'ring-1 ring-brand/35' : ''}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg font-mono text-xs font-bold grid place-items-center transition-colors duration-500 ${on ? 'bg-brand text-white' : 'bg-brand/15 text-brand'}`}>{p.n}</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-ink/20 to-transparent" />
                    </div>
                    <h3 className="text-lg font-medium text-ink">{p.title}</h3>
                    <p className="text-sm text-ink/70 leading-relaxed">{p.text}</p>
                  </div>
                  <div className={`pt-3 border-t border-ink/[0.07] flex items-center gap-1.5 text-[12.5px] transition-colors duration-500 ${on ? 'text-brand' : 'text-ink/70'}`}>
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
        <Reveal variant="scale" className="pz-scope-brand relative rounded-[32px] overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-brand/30 blur-[120px] pointer-events-none" />
          <div className="relative grid lg:grid-cols-12 gap-10 p-6 sm:p-12 lg:p-14 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Eyebrow>LABORATORIO DE DIFUSORES</Eyebrow>
              <h2 className={H2}>
                Diseña tu propio difusor en <Accent>segundos.</Accent>
              </h2>
              <p className="text-ink/75 leading-relaxed">
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
                  <li key={title} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-ink text-sm">{title}</div>
                      <div className="text-[13px] text-ink/75">{desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <a {...linkProps('/suite', 'diffusers')} className="group inline-flex items-center gap-2 rounded-full bg-[#fff] text-[#1b0f3d] font-medium px-6 py-3.5 hover:bg-[#f2b84b] transition-colors">
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
                  <figure key={name} className="group space-y-2">
                    <div className="rounded-[22px] overflow-hidden bg-ink/[0.07]">
                      <Render name={name} alt={`Render de difusor ${label}`} className="aspect-square p-1" />
                    </div>
                    <figcaption className="px-1 text-[13px] text-ink/70">{label}</figcaption>
                  </figure>
                ))}
              </div>

              <div className="rounded-2xl bg-ink/[0.07] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-ink">Perfil de ranuras QRD</div>
                    <div className="text-[11px] text-ink/65 font-mono">sₙ = n² mod p</div>
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
                        className={`px-2 py-1 rounded-lg font-mono text-xs font-semibold transition ${idx === i ? 'bg-brand text-white' : 'text-ink/70 hover:text-ink'}`}
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
                <div className="font-mono text-[11px] text-ink/70 break-all leading-relaxed">{seq.join(' · ')}</div>
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
            <Eyebrow>SIMULADOR WEB GRATUITO</Eyebrow>
            <h2 className={H2}>
              Empieza ahora: ¿cuánto resuena tu sala?
            </h2>
            <p className="text-ink/70 leading-relaxed max-w-2xl">
              Mueve las medidas y obtén una primera estimación al instante. Cuando quieras el análisis completo, POZOLE Suite te guía desde la geometría hasta el informe técnico imprimible.
            </p>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:justify-self-end">
            <a {...linkProps('/suite')} className="group inline-flex items-center gap-2 rounded-full bg-brand text-white font-medium px-6 py-3.5 hover:bg-brand/90 transition-colors">
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
              <a {...linkProps('/suite', hash)} className="group h-full pz-card pz-card-lift rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink group-hover:text-brand transition-colors">{t}</span>
                    <ArrowUpRight className="w-4 h-4 text-ink/50 group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-ink/70 leading-relaxed">{d}</p>
                </div>
                <span className="text-[13px] text-brand">Abrir en el simulador →</span>
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
    <section id="planes" className={BAND}>
      <div className={`${WRAP} space-y-14`}>
        <Reveal className="max-w-2xl space-y-4">
          <Eyebrow>CÓMO TRABAJAR CON NOSOTROS</Eyebrow>
          <h2 className={H2}>
            Elige hasta dónde quieres que <Accent>lleguemos.</Accent>
          </h2>
          <p className="text-ink/70 leading-relaxed">Cada proyecto se cotiza según el tamaño de la sala y su uso. Estos son los tres alcances con los que trabajamos.</p>
        </Reveal>

        <div className="grid lg:grid-cols-3 gap-4 items-stretch">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.name}
              delay={i * 70}
              className={`relative rounded-3xl p-7 sm:p-8 flex flex-col gap-6 ${plan.featured ? 'pz-scope-brand lg:-my-3' : 'pz-card'}`}
            >
              <div className="space-y-1.5">
                {plan.featured && <div className="text-[13px] font-medium text-accent">El más solicitado</div>}
                <h3 className="text-2xl font-medium text-ink">{plan.name}</h3>
                <p className="text-sm text-ink/70">{plan.tagline}</p>
              </div>
              <ul className="space-y-2.5 text-sm text-ink/75 flex-1">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onQuote(`Plan ${plan.name}`)}
                className={`group inline-flex justify-center items-center gap-2 rounded-full font-medium px-5 py-3 transition-colors ${plan.featured ? 'bg-[#fff] text-[#1b0f3d] hover:bg-[#f2b84b]' : 'bg-brand text-white hover:bg-brand/90'
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
          <Eyebrow>PREGUNTAS FRECUENTES</Eyebrow>
          <h2 className={H2}>
            Lo que casi todos preguntan.
          </h2>
        </Reveal>
        <div className="lg:col-span-8 space-y-2.5">
          {FAQ.map((item, i) => (
            <Reveal as="details" key={item.q} delay={i * 40} className="group pz-card rounded-2xl px-6 py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-ink">
                {item.q}
                <Plus className="w-4 h-4 shrink-0 text-ink/55 transition-transform group-open:rotate-45 group-open:text-brand" />
              </summary>
              <p className="mt-3 text-sm text-ink/75 leading-relaxed max-w-3xl">{item.a}</p>
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
    <section id="equipo" className={BAND}>
      <div className={`${WRAP} space-y-12`}>
        <Reveal className="space-y-4 max-w-2xl">
          <Eyebrow>EQUIPO</Eyebrow>
          <h2 className={H2}>
            Ingenieros que escuchan.
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-4">
          {TEAM.map((m, i) => {
            const initials = m.name.split(' ').map((w) => w[0]).join('');
            return (
              <Reveal key={m.name} delay={i * 80} className="group pz-card rounded-3xl p-3 pb-6 space-y-5">
                <div className="rounded-[22px] overflow-hidden aspect-[4/3] bg-gradient-to-br from-brand/[0.22] to-brand/[0.06]">
                  <div className="w-full h-full grid place-items-center relative">
                    <Ear className="absolute w-40 h-40 text-brand/[0.08] -right-6 -bottom-6" />
                    <span className="text-5xl font-medium text-ink/90 tracking-tight">{initials}</span>
                  </div>
                </div>
                <div>
                  <div className="px-3 text-lg font-medium text-ink">{m.name}</div>
                  <div className="px-3 text-sm text-ink/75">{m.role}</div>
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

  const input = 'w-full rounded-xl bg-ink/[0.04] border border-ink/10 px-4 py-3 text-ink placeholder:text-ink/50 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition';

  return (
    <section id="contacto" className={`${SECTION} relative overflow-hidden`}>
      <div className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full bg-brand/15 blur-[130px] pointer-events-none" />
      <div className={`relative ${WRAP} grid lg:grid-cols-2 gap-12`}>
        <Reveal variant="left" className="space-y-6">
          <Eyebrow>CONTACTO</Eyebrow>
          <h2 className="text-4xl sm:text-6xl tracking-tight text-ink">
            ¿Cómo quieres que <Accent>suene</Accent> tu sala?
          </h2>
          <p className="text-ink/70 leading-relaxed max-w-md">Cuéntanos qué espacio tienes y para qué lo usas. Te respondemos con una propuesta de diagnóstico.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-base text-brand hover:underline">
            {CONTACT_EMAIL} <ArrowUpRight className="w-4 h-4" />
          </a>
          <ul className="space-y-2 pt-2 text-sm text-ink/75">
            {['Respuesta con una propuesta de alcance', 'Primera estimación con tu plano o tus medidas', `Simulación de tu sala en ${BRAND.name} Suite`].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100} variant="right">
          <form onSubmit={submit} className="pz-card rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-sm">
                <span className="text-ink/70">Nombre</span>
                <input required value={form.name} onChange={set('name')} className={input} placeholder="Tu nombre" autoComplete="name" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-ink/70">Correo</span>
                <input required type="email" value={form.email} onChange={set('email')} className={input} placeholder="tu@correo.com" autoComplete="email" />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="text-ink/70">Tipo de espacio</span>
              <select value={form.space} onChange={set('space')} className={`${input} appearance-none`}>
                {SPACES_MARQUEE.map((s) => (
                  <option key={s} className="bg-surface">{s}</option>
                ))}
                <option className="bg-surface">Otro</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-ink/70">Cuéntanos del proyecto</span>
              <textarea value={form.message} onChange={set('message')} rows={4} className={`${input} resize-none`} placeholder="Dimensiones aproximadas, uso, problemas que notas…" />
            </label>
            <button type="submit" className="group w-full inline-flex justify-center items-center gap-2 rounded-full bg-brand text-white font-medium px-6 py-3.5 hover:bg-brand/90 transition-colors">
              Enviar solicitud
              <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-xs text-ink/55 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" /> Se abrirá tu cliente de correo con el mensaje listo.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
