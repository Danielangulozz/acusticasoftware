import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  Compass,
  Ear,
  Grid3x3,
  Mic2,
  Ruler,
  Waves,
  MessageSquareText,
  FileStack,
  Send,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import WaveFieldCanvas from './WaveFieldCanvas';
import ReflectionDemo from './ReflectionDemo';
import { SiteNav, SiteFooter, Reveal, Eyebrow } from './SiteChrome';
import { CONTACT_EMAIL, TEAM } from './siteConfig';
import { linkProps } from '../router';
import { useTheme } from '../theme';
import { quadraticResidueSequence } from '../utils/diffuserCalculations';

const SPACES = ['Estudios de grabación', 'Home studios', 'Auditorios', 'Aulas', 'Salas de ensayo', 'Restaurantes', 'Oficinas abiertas', 'Templos', 'Home cinema', 'Salas de conferencias'];

const SERVICES = [
  {
    icon: Mic2,
    title: 'Diagnóstico y medición in situ',
    idealFor: 'Salas construidas con eco, ruido o mala claridad',
    text: 'Medimos cómo suena hoy tu espacio (RT60, claridad C80/D50 y mapa de presión sonora) bajo norma ISO 3382 para saber exactamente qué corregir.',
    tags: ['ISO 3382', 'REW', 'Mapas SPL'],
    suiteHash: 'modes',
    suiteLabel: 'Ver panel in situ',
  },
  {
    icon: AudioWaveform,
    title: 'Tratamiento acústico y control de eco',
    idealFor: 'Estudios, restaurantes, oficinas y salas de ensayo',
    text: 'Calculamos cuántos metros cuadrados de paneles absorbentes y trampas de graves necesitas para llevar el tiempo de reverberación al punto ideal.',
    tags: ['Sabine', 'Eyring', 'Millington'],
    suiteHash: 'materials',
    suiteLabel: 'Simular materiales',
  },
  {
    icon: Grid3x3,
    title: 'Difusores acústicos a medida',
    idealFor: 'Salas de mezcla, control rooms, auditorios y cines',
    text: 'Diseñamos difusores QRD, PRD, MLS y policilíndricos para tu rango de frecuencias exacto, eliminando ecos sin apagar la vida de la sala.',
    tags: ['Schroeder', 'ISO 17497', 'Planos de corte'],
    feature: true,
    suiteHash: 'diffusers',
    suiteLabel: 'Diseñar difusor',
  },
  {
    icon: Waves,
    title: 'Control de graves y modos propios',
    idealFor: 'Cuartos pequeños, home studios y cabinas',
    text: 'Identificamos las frecuencias donde los graves retumban o se cancelan (frecuencia de Schroeder, criterio de Bonello y proporciones de Bolt).',
    tags: ['Modos (x,y,z)', 'Bonello', 'Bolt'],
    suiteHash: 'modes',
    suiteLabel: 'Analizar modos',
  },
  {
    icon: MessageSquareText,
    title: 'Claridad e inteligibilidad de la voz',
    idealFor: 'Aulas de clase, templos, auditorios y salas de juntas',
    text: 'Predecimos el porcentaje de pérdida de consonantes (%ALcons y STI) para garantizar que cada palabra se entienda desde la primera hasta la última fila.',
    tags: ['%ALcons', 'STI', 'ISO 9921'],
    suiteHash: 'intelligibility',
    suiteLabel: 'Evaluar voz',
  },
  {
    icon: FileStack,
    title: 'Simulación 3D e informe para obra',
    idealFor: 'Arquitectos, ingenieros e instituciones',
    text: 'Modelamos la geometría 2D/3D de tu recinto, comparamos el antes y después del tratamiento y entregamos memoria técnica lista para instalar.',
    tags: ['Modelo 3D', 'Informe PDF', 'CSV'],
    suiteHash: 'overview',
    suiteLabel: 'Ver vista 3D',
  },
];

const PROCESS = [
  {
    n: '01',
    title: 'Escuchar tu necesidad',
    text: 'Conversamos sobre el uso de tu sala (música, voz, mezcla o restaurante), sus medidas y el resultado que buscas.',
    deliverable: 'Definición de metas acústicas',
  },
  {
    n: '02',
    title: 'Medir el espacio',
    text: 'Levantamos la geometría real y capturamos respuestas al impulso con micrófono de medición en distintos puntos.',
    deliverable: 'Diagnóstico acústico base',
  },
  {
    n: '03',
    title: 'Simular en POZOLE Suite',
    text: 'Modelamos la reverberación, los modos graves y la inteligibilidad para probar soluciones antes de fabricar.',
    deliverable: 'Simulación antes vs. después',
  },
  {
    n: '04',
    title: 'Diseñar el tratamiento',
    text: 'Especificamos materiales absorbentes, trampas y difusores a medida con ubicación exacta y lista de corte.',
    deliverable: 'Planos y guía de instalación',
  },
  {
    n: '05',
    title: 'Verificar resultados',
    text: 'Tras instalar el tratamiento, volvemos a medir para comprobar que la sala cumple con el objetivo diseñado.',
    deliverable: 'Informe técnico final',
  },
];

export default function LandingPage() {
  const [isDark, toggleTheme] = useTheme();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
  }, []);

  return (
    <div className="pz-site min-h-screen bg-canvas text-ink font-sans antialiased selection:bg-accent selection:text-canvas overflow-x-hidden">
      <SiteNav current="/" isDark={isDark} onToggleTheme={toggleTheme} />
      <Hero isDark={isDark} />
      <SpacesMarquee />
      <Services />
      <section id="como-funciona" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <Reveal className="max-w-2xl space-y-4">
            <Eyebrow index="02">CÓMO FUNCIONA EL TRATAMIENTO ACÚSTICO</Eyebrow>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
              Cada superficie decide <span className="font-serif-accent italic text-accent">a dónde</span> va el sonido.
            </h2>
            <p className="text-ink/60 leading-relaxed">
              Un buen diseño acústico no consiste en llenar todo de espuma: combina reflexión útil, absorción controlada y difusión matemática.
            </p>
          </Reveal>
          <Reveal delay={100}><ReflectionDemo /></Reveal>
        </div>
      </section>
      <Process />
      <DiffuserPromo />
      <SoftwarePromo />
      <Team />
      <Contact />
      <SiteFooter />
    </div>
  );
}

function Hero({ isDark }) {
  return (
    <section className="relative min-h-[100svh] flex items-end overflow-hidden">
      <WaveFieldCanvas dark={isDark} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/40 to-transparent pointer-events-none" />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 pt-28 sm:pt-32">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink/[0.04] backdrop-blur px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] text-ink/75">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            CONSULTORÍA ACÚSTICA · DIFUSORES A MEDIDA · SIMULADOR WEB
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 7vw, 5.25rem)' }} className="leading-[1.03] font-extrabold tracking-[-0.035em] text-ink">
            Diseñamos cómo
            <br />
            <span className="font-serif-accent italic font-normal text-accent tracking-normal">suena</span> tu espacio.
          </h1>
          <p className="text-base sm:text-lg text-ink/70 max-w-2xl leading-relaxed">
            Medimos, simulamos y acondicionamos estudios de grabación, auditorios, aulas y restaurantes. Explora nuestro <strong className="text-ink font-semibold">simulador interactivo gratuito</strong> o cotiza el diseño acústico completo de tu sala.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
            <a
              {...linkProps('/suite')}
              className="group inline-flex justify-center items-center gap-2.5 rounded-full bg-brand text-white font-semibold px-6 py-3.5 hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20"
            >
              <Compass className="w-4 h-4" />
              Abrir Simulador POZOLE Suite
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              {...linkProps('/', 'contacto')}
              className="group inline-flex justify-center items-center gap-2 rounded-full bg-ink text-canvas font-semibold px-6 py-3.5 hover:bg-accent transition-colors"
            >
              Cotizar mi proyecto
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a
              {...linkProps('/suite', 'diffusers')}
              className="inline-flex justify-center items-center gap-2 rounded-full border border-ink/20 bg-ink/[0.03] backdrop-blur text-ink font-semibold px-5 py-3.5 hover:bg-ink/[0.08] transition-colors text-sm"
            >
              <Grid3x3 className="w-4 h-4 text-accent" />
              Diseñar un difusor
            </a>
          </div>
        </div>

        <dl className="mt-14 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 border-t border-ink/10 pt-6">
          {[
            ['Control de Eco (RT60)', 'Cálculo exacto de reverberación (Sabine, Eyring y Millington) según el uso del recinto.'],
            ['Claridad en Graves (20 Hz – fₛ)', 'Detección de resonancias modales, criterio de Bonello y proporciones óptimas.'],
            ['Difusores Calculados (QRD · MLS)', 'Diseño matemático de ranuras con respuesta polar y planos de corte listos.'],
            ['Voz Entendible (%ALcons · STI)', 'Evaluación de claridad de la palabra para aulas, auditorios y salas de conferencias.'],
          ].map(([k, v], i) => (
            <div key={k} className={`pr-4 ${i > 0 ? 'lg:pl-6 lg:border-l border-ink/10' : ''}`}>
              <dt className="font-mono text-xs sm:text-sm font-semibold text-ink flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                {k}
              </dt>
              <dd className="text-xs sm:text-[13px] text-ink/55 mt-1.5 leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="absolute right-6 bottom-6 hidden xl:block font-mono text-[10px] tracking-[0.18em] text-ink/35">
        Campo de ondas interactivo · mueve el cursor sobre el lienzo
      </div>
    </section>
  );
}

function SpacesMarquee() {
  const row = [...SPACES, ...SPACES];
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

function Services() {
  return (
    <section id="servicios" className="py-24 sm:py-32 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        <Reveal className="grid lg:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <Eyebrow index="01">QUÉ HACEMOS</Eyebrow>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
              Soluciones claras para cada <span className="font-serif-accent italic font-normal text-ink/70">problema acústico.</span>
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
                className={`group relative rounded-3xl p-7 flex flex-col justify-between border transition-all ${
                  s.feature
                    ? 'border-brand/40 bg-brand/[0.06] hover:bg-brand/[0.10]'
                    : 'border-ink/10 bg-surface hover:border-ink/20 hover:bg-surface2'
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
                    <p className="text-xs font-medium text-accent">
                      Ideal para: {s.idealFor}
                    </p>
                  </div>
                  <p className="text-sm text-ink/60 leading-relaxed">{s.text}</p>
                </div>

                <div className="pt-6 mt-6 border-t border-ink/[0.07] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <span key={t} className="font-mono text-[10px] tracking-wide text-ink/55 border border-ink/10 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                  <a
                    {...linkProps('/suite', s.suiteHash)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline ml-auto"
                  >
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

function Process() {
  return (
    <section id="proceso" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16 pz-grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        <Reveal className="max-w-2xl space-y-4">
          <Eyebrow index="03">PASO A PASO</Eyebrow>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Medir antes de opinar.
          </h2>
          <p className="text-ink/60 leading-relaxed">
            Nuestro proceso de consultoría en 5 etapas claras: sin adivinanzas, todo verificado con instrumentos y simulación.
          </p>
        </Reveal>
        <ol className="grid md:grid-cols-5 gap-4">
          {PROCESS.map((p, i) => (
            <Reveal as="li" key={p.n} delay={i * 70} className="relative rounded-2xl border border-ink/10 bg-surface/95 backdrop-blur p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-brand/15 text-brand font-mono text-xs font-bold grid place-items-center">
                    {p.n}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-ink/20 to-transparent" />
                </div>
                <h3 className="text-lg font-bold text-ink">{p.title}</h3>
                <p className="text-sm text-ink/60 leading-relaxed">{p.text}</p>
              </div>
              <div className="pt-3 border-t border-ink/[0.07] flex items-center gap-1.5 text-[11px] font-mono text-accent">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{p.deliverable}</span>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

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
    <section id="difusor-lab" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="relative rounded-[32px] border border-ink/10 overflow-hidden bg-gradient-to-br from-brand/[0.10] via-surface to-surface">
          <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-brand/25 blur-[120px] pointer-events-none" />
          <div className="relative grid lg:grid-cols-12 gap-10 p-6 sm:p-12 lg:p-14 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Eyebrow index="04">LABORATORIO DE DIFUSORES</Eyebrow>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
                Diseña tu propio difusor en <span className="font-serif-accent italic font-normal text-accent">segundos.</span>
              </h2>
              <p className="text-ink/65 leading-relaxed">
                Solo indica el rango de frecuencias que necesitas controlar. El laboratorio calcula automáticamente el ancho y la profundidad exacta de cada ranura, grafica cómo se dispersa el sonido y genera la **lista de piezas para carpintería o corte láser**.
              </p>
              <ul className="grid sm:grid-cols-2 gap-2.5 text-sm text-ink/75">
                {[
                  ['QRD 1D y 2D (Skyline)', 'Dispersión en 1 o 2 planos'],
                  ['PRD (Raíces primitivas)', 'Elimina la reflexión especular'],
                  ['MLS Binario', 'Bajo espesor para espacios reducidos'],
                  ['Policilíndrico', 'Superficies curvas suaves'],
                  ['Diagrama Polar en Vivo', 'Visualiza hacia dónde va el sonido'],
                  ['Lista de Corte CSV / SVG', 'Medidas listas para fabricar'],
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
              <a
                {...linkProps('/suite', 'diffusers')}
                className="group inline-flex items-center gap-2 rounded-full bg-brand text-white font-semibold px-6 py-3.5 hover:bg-brand/90 transition-colors"
              >
                Abrir Laboratorio de Difusores
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-ink/10 bg-canvas/80 p-6 sm:p-7 flex flex-col justify-between gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-ink/[0.08]">
                <div>
                  <div className="text-xs font-bold text-ink">Vista Previa Interactiva · Perfil de Ranuras QRD</div>
                  <div className="text-[11px] text-ink/50 font-mono">Fórmula de Schroeder: sₙ = n² mod p</div>
                </div>
                <div className="flex items-center gap-1 bg-ink/[0.05] p-1 rounded-xl border border-ink/10">
                  {PRIMES.map((primeVal, i) => (
                    <button
                      key={primeVal}
                      type="button"
                      onClick={() => {
                        setAutoPlay(false);
                        setIdx(i);
                      }}
                      className={`px-2 py-1 rounded-lg font-mono text-xs font-semibold transition ${
                        idx === i ? 'bg-brand text-white' : 'text-ink/60 hover:text-ink'
                      }`}
                      title={`Ver difusor de ${primeVal} ranuras`}
                    >
                      p={primeVal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-mono text-ink/50">
                  <span>Frente del panel (entrada del sonido)</span>
                  <span>{p} ranuras por período</span>
                </div>
                <div className="flex items-start gap-[3px] h-44 bg-ink/[0.03] rounded-xl p-2 border border-ink/[0.06]" aria-label={`Perfil QRD con p = ${p}`}>
                  {seq.map((s, i) => (
                    <div key={`${p}-${i}`} className="flex-1 h-full flex flex-col justify-start group relative">
                      <div
                        className="w-full rounded-b-sm bg-gradient-to-b from-brand to-accent transition-all duration-500"
                        style={{ height: `${8 + (s / (p - 1)) * 92}%` }}
                        title={`Ranura #${i + 1}: factor de profundidad s = ${s}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-ink/[0.03] border border-ink/[0.06] p-3 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink/45">
                  Secuencia de profundidades proporcionales (sₙ):
                </div>
                <div className="font-mono text-xs text-ink/80 break-all leading-relaxed">
                  {seq.join(' · ')}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SoftwarePromo() {
  const steps = [
    { step: 'Paso 1', title: 'Dibuja o elige tu sala', desc: 'Usa una planta predefinida o dibuja cualquier forma en 2D/3D.' },
    { step: 'Paso 2', title: 'Asigna materiales y fuente', desc: 'Elige de qué están hechas las paredes, el piso y el techo.' },
    { step: 'Paso 3', title: 'Obtén el diagnóstico e informe', desc: 'Revisa si el eco, los graves y la claridad cumplen la norma.' },
  ];

  const modules = [
    ['1. Geometría 2D / 3D', 'Dibuja salas rectangulares, en L, trapecios o paredes curvas.', 'geometry'],
    ['2. Materiales y Absorción', 'Catálogo ISO 354 para piso, techo, muros, puertas y ventanas.', 'materials'],
    ['3. Fuente y Receptor', 'Ajusta potencia sonora (Lw), directividad (Q) y distancia crítica.', 'source'],
    ['4. Tiempo de Reverberación', 'Compara Sabine, Eyring y Millington contra el RT60 ideal.', 'results'],
    ['5. Modos Propios (Graves)', 'Frecuencia de Schroeder, criterio de Bonello y mapa de presión.', 'modes'],
    ['6. Inteligibilidad de Voz', 'Porcentaje %ALcons, STI, ocupación de personas y logátomos.', 'intelligibility'],
  ];

  return (
    <section id="software" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <Reveal className="lg:col-span-7 space-y-4">
            <Eyebrow index="05">SIMULADOR WEB GRATUITO</Eyebrow>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
              POZOLE Suite: entiende la acústica de tu sala en <span className="font-serif-accent italic font-normal text-accent">3 pasos.</span>
            </h2>
            <p className="text-ink/60 leading-relaxed max-w-2xl">
              Nuestra plataforma interactiva guía paso a paso desde las dimensiones de la habitación hasta el informe técnico imprimible. Haz clic en cualquier módulo para abrirlo directamente.
            </p>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:justify-self-end">
            <a
              {...linkProps('/suite')}
              className="group inline-flex items-center gap-2 rounded-full bg-ink text-canvas font-semibold px-6 py-3.5 hover:bg-accent transition-colors"
            >
              Entrar a POZOLE Suite
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </Reveal>
        </div>

        {/* Ruta rápida en 3 pasos */}
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 60} className="rounded-2xl border border-brand/25 bg-brand/[0.05] p-5 flex items-start gap-4">
              <span className="px-2.5 py-1 rounded-lg bg-brand text-white font-mono text-xs font-bold shrink-0">
                {s.step}
              </span>
              <div>
                <div className="font-bold text-ink">{s.title}</div>
                <div className="text-xs sm:text-sm text-ink/60 mt-1 leading-relaxed">{s.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Módulos clicables */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {modules.map(([t, d, hash], i) => (
            <Reveal key={t} delay={i * 50}>
              <a
                {...linkProps('/suite', hash)}
                className="group h-full rounded-2xl border border-ink/10 bg-surface hover:border-brand/50 hover:bg-surface2 p-5 flex flex-col justify-between gap-4 transition-all block"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink group-hover:text-brand transition-colors">{t}</span>
                    <ArrowUpRight className="w-4 h-4 text-ink/30 group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-ink/55 leading-relaxed">{d}</p>
                </div>
                <span className="text-[11px] font-mono text-brand/80 group-hover:text-brand">
                  Abrir módulo en el simulador →
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  return (
    <section id="equipo" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <Reveal className="space-y-4 max-w-2xl">
          <Eyebrow index="06">EQUIPO</Eyebrow>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Ingenieros que <span className="font-serif-accent italic font-normal text-accent">escuchan.</span>
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

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', space: 'Estudio de grabación', message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const subject = `Proyecto acústico — ${form.space}`;
    const body = `Nombre: ${form.name}\nCorreo: ${form.email}\nEspacio: ${form.space}\n\n${form.message}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const input = 'w-full rounded-xl bg-ink/[0.04] border border-ink/10 px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition';

  return (
    <section id="contacto" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
        <Reveal className="space-y-6">
          <Eyebrow index="07">CONTACTO</Eyebrow>
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink">
            ¿Cómo quieres que <span className="font-serif-accent italic font-normal text-accent">suene</span> tu sala?
          </h2>
          <p className="text-ink/60 leading-relaxed max-w-md">
            Cuéntanos qué espacio tienes y para qué lo usas. Te respondemos con una propuesta de diagnóstico.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 font-mono text-sm text-ink/80 hover:text-accent transition-colors">
            {CONTACT_EMAIL} <ArrowUpRight className="w-4 h-4" />
          </a>
        </Reveal>

        <Reveal delay={100}>
          <form onSubmit={submit} className="rounded-3xl border border-ink/10 bg-surface p-6 sm:p-8 space-y-4">
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
                {SPACES.map((s) => <option key={s} className="bg-surface">{s}</option>)}
                <option className="bg-surface">Otro</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-ink/60">Cuéntanos del proyecto</span>
              <textarea value={form.message} onChange={set('message')} rows={4} className={`${input} resize-none`} placeholder="Dimensiones aproximadas, uso, problemas que notas…" />
            </label>
            <button type="submit" className="group w-full inline-flex justify-center items-center gap-2 rounded-full bg-ink text-canvas font-semibold px-6 py-3.5 hover:bg-accent transition-colors">
              Enviar solicitud
              <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-xs text-ink/35 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> Se abrirá tu cliente de correo con el mensaje listo.</p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
