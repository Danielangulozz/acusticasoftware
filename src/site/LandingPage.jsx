import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  Ear,
  Grid3x3,
  Mic2,
  Ruler,
  Waves,
  MessageSquareText,
  FileStack,
  Send,
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
    text: 'Respuestas al impulso, RT60, EDT, C80 y D50 bajo ISO 3382, con malla de medición y mapas de nivel.',
    tags: ['ISO 3382', 'REW', 'Mapas SPL'],
  },
  {
    icon: AudioWaveform,
    title: 'Tratamiento acústico',
    text: 'Absorción por banda de octava, trampas de graves y paneles a medida para llevar el RT al óptimo de cada uso.',
    tags: ['Sabine', 'Eyring', 'Millington'],
  },
  {
    icon: Grid3x3,
    title: 'Difusores a medida',
    text: 'QRD, PRD, MLS, skyline y policilíndricos calculados para tu banda de frecuencia, con planos de corte.',
    tags: ['Schroeder', 'ISO 17497'],
    feature: true,
  },
  {
    icon: Waves,
    title: 'Control modal en graves',
    text: 'Modos propios, frecuencia de Schroeder, criterio de Bonello y proporciones de Bolt para salas pequeñas.',
    tags: ['Modos', 'Bonello', 'Bolt'],
  },
  {
    icon: MessageSquareText,
    title: 'Inteligibilidad de la palabra',
    text: 'Predicción de %ALcons y STI para aulas, auditorios y templos donde entender cada palabra importa.',
    tags: ['%ALcons', 'STI', 'ISO 9921'],
  },
  {
    icon: FileStack,
    title: 'Simulación e informes',
    text: 'Modelos 3D de la sala, comparativa antes/después e informe técnico listo para obra.',
    tags: ['3D', 'Informe técnico'],
  },
];

const PROCESS = [
  { n: '01', title: 'Escuchar', text: 'Entendemos el uso del espacio, el presupuesto y cómo debería sonar.' },
  { n: '02', title: 'Medir', text: 'Capturamos respuestas al impulso y la geometría real del recinto.' },
  { n: '03', title: 'Modelar', text: 'Simulamos reverberación, modos y campo sonoro en POZOLE Suite.' },
  { n: '04', title: 'Diseñar', text: 'Definimos absorción, difusión y ubicación con planos de fabricación.' },
  { n: '05', title: 'Verificar', text: 'Medimos de nuevo tras la instalación y entregamos el informe final.' },
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
      <section className="py-24 sm:py-32 border-t border-ink/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <Reveal className="max-w-2xl space-y-4">
            <Eyebrow index="02">ABSORBER NO LO ES TODO</Eyebrow>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
              Cada superficie decide <span className="font-serif-accent italic text-accent">a dónde</span> va el sonido.
            </h2>
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

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 pt-32">
        <div className="max-w-3xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink/[0.04] backdrop-blur px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] text-ink/70">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            ACÚSTICA DE RECINTOS · DISEÑO · SIMULACIÓN
          </div>
          <h1 style={{ fontSize: 'clamp(2.6rem, 7.4vw, 5.5rem)' }} className="leading-[1.02] font-extrabold tracking-[-0.035em] text-ink">
            Diseñamos cómo
            <br />
            <span className="font-serif-accent italic font-normal text-accent tracking-normal">suena</span> un espacio.
          </h1>
          <p className="text-base sm:text-lg text-ink/65 max-w-xl leading-relaxed">
            En POZOLE ACOUSTIC medimos, modelamos y tratamos recintos — estudios, auditorios, aulas y salas — con ingeniería acústica verificable y difusores calculados a la medida de cada proyecto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              {...linkProps('/', 'contacto')}
              className="group inline-flex justify-center items-center gap-2 rounded-full bg-ink text-canvas font-semibold px-6 py-3.5 hover:bg-accent transition-colors"
            >
              Hablemos de tu sala
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              {...linkProps('/suite', 'difusores')}
              className="inline-flex justify-center items-center gap-2 rounded-full border border-ink/20 bg-ink/[0.03] backdrop-blur text-ink font-semibold px-6 py-3.5 hover:bg-ink/[0.08] transition-colors"
            >
              Diseñar un difusor
            </a>
          </div>
        </div>

        <dl className="mt-16 sm:mt-24 grid grid-cols-2 lg:grid-cols-4 border-t border-ink/10">
          {[
            ['RT60', 'Sabine · Eyring · Millington'],
            ['20 Hz – fₛ', 'Modos propios y Bonello'],
            ['QRD · PRD · MLS', 'Difusores calculados'],
            ['%ALcons', 'Inteligibilidad de la palabra'],
          ].map(([k, v], i) => (
            <div key={k} className={`pt-5 pb-1 pr-4 ${i > 0 ? 'lg:pl-6 lg:border-l border-ink/10' : ''} ${i % 2 === 1 ? 'pl-4 border-l border-ink/10 lg:pl-6' : ''}`}>
              <dt className="font-mono text-sm sm:text-base text-ink">{k}</dt>
              <dd className="text-xs sm:text-[13px] text-ink/45 mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="absolute right-6 bottom-6 hidden lg:block font-mono text-[10px] tracking-[0.2em] text-ink/30">
        p(r,t) = Σ cos(kr − ωt) / √r · mueve el cursor
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
          <span key={i} className="flex items-center gap-10 text-ink/40 text-sm sm:text-base">
            {s}
            <span className="w-1 h-1 rounded-full bg-brand" />
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
              Ingeniería acústica de principio <span className="font-serif-accent italic font-normal text-ink/70">a fin.</span>
            </h2>
          </div>
          <p className="text-ink/55 leading-relaxed lg:max-w-md lg:justify-self-end">
            Del diagnóstico a la obra terminada. Cada decisión se respalda con medición, simulación y la teoría de acústica de recintos.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink/[0.07] rounded-3xl overflow-hidden border border-ink/[0.07]">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal
                key={s.title}
                delay={i * 60}
                className={`group relative p-7 sm:p-8 min-h-[260px] flex flex-col justify-between transition-colors ${s.feature ? 'bg-brand/[0.06] hover:bg-brand/[0.10]' : 'bg-surface hover:bg-surface2'
                  }`}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className={`w-11 h-11 grid place-items-center rounded-xl border ${s.feature ? 'border-brand/50 bg-brand/15 text-brand' : 'border-ink/10 bg-ink/[0.04] text-ink/80'}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="font-mono text-[11px] text-ink/25">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="text-xl font-bold text-ink">{s.title}</h3>
                  <p className="text-sm text-ink/55 leading-relaxed">{s.text}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-6">
                  {s.tags.map((t) => (
                    <span key={t} className="font-mono text-[10px] tracking-wide text-ink/50 border border-ink/10 rounded-full px-2 py-0.5">{t}</span>
                  ))}
                  {s.feature && (
                    <a {...linkProps('/suite', 'difusores')} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                      Probar <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
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
          <Eyebrow index="03">PROCESO</Eyebrow>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Medir antes de opinar.
          </h2>
          <p className="text-ink/55 leading-relaxed">Un flujo de trabajo cerrado: lo que diseñamos se vuelve a medir.</p>
        </Reveal>
        <ol className="grid md:grid-cols-5 gap-4">
          {PROCESS.map((p, i) => (
            <Reveal as="li" key={p.n} delay={i * 80} className="relative rounded-2xl border border-ink/10 bg-surface/90 backdrop-blur p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-accent">{p.n}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-ink/20 to-transparent" />
              </div>
              <h3 className="text-lg font-bold text-ink">{p.title}</h3>
              <p className="text-sm text-ink/55 leading-relaxed">{p.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

const PRIMES = [7, 11, 13, 17, 19, 23];

function DiffuserPromo() {
  const [idx, setIdx] = useState(3);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % PRIMES.length), 2200);
    return () => clearInterval(t);
  }, []);
  const p = PRIMES[idx];
  const seq = useMemo(() => quadraticResidueSequence(p), [p]);

  return (
    <section id="difusor-lab" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="relative rounded-[32px] border border-ink/10 overflow-hidden bg-gradient-to-br from-brand/[0.10] via-surface to-surface">
          <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-brand/25 blur-[120px] pointer-events-none" />
          <div className="relative grid lg:grid-cols-2 gap-10 p-8 sm:p-12 lg:p-16">
            <div className="space-y-6 self-center">
              <Eyebrow index="04">DIFUSOR LAB</Eyebrow>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
                Diseña tu propio difusor en <span className="font-serif-accent italic font-normal text-accent">segundos.</span>
              </h2>
              <p className="text-ink/60 leading-relaxed max-w-lg">
                Elige la banda de frecuencias y el laboratorio calcula el número primo, el ancho y la profundidad de cada ranura, predice la respuesta polar y el coeficiente de difusión, y te entrega la lista de corte.
              </p>
              <ul className="grid grid-cols-2 gap-2 text-sm text-ink/70">
                {['QRD 1D y 2D', 'PRD (raíces primitivas)', 'MLS binario', 'Policilíndrico', 'Respuesta polar', 'Lista de corte'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent" />{f}</li>
                ))}
              </ul>
              <a
                {...linkProps('/suite', 'difusores')}
                className="group inline-flex items-center gap-2 rounded-full bg-brand text-white font-semibold px-6 py-3.5 hover:bg-brand/90 transition-colors"
              >
                Diseñar en POZOLE Suite
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-canvas/70 p-6 sm:p-8 flex flex-col justify-between gap-6 min-h-[320px]">
              <div className="flex items-center justify-between font-mono text-[11px] text-ink/45">
                <span>QRD · sₙ = n² mod p</span>
                <span className="text-ink">p = {p}</span>
              </div>
              <div className="flex items-start gap-[3px] h-48" aria-label={`Perfil QRD con p = ${p}`}>
                {seq.map((s, i) => (
                  <div key={`${p}-${i}`} className="flex-1 h-full">
                    <div
                      className="w-full rounded-b-sm bg-gradient-to-b from-brand to-accent transition-all duration-700"
                      style={{ height: `${8 + (s / (p - 1)) * 92}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="font-mono text-[10px] text-ink/35 break-all leading-relaxed">{seq.join(' ')}</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SoftwarePromo() {
  const modules = [
    ['Geometría', 'Planta libre, paredes curvas, 3D'],
    ['Materiales', 'α por octava, ISO 354'],
    ['Reverberación', 'Sabine, Eyring, Millington'],
    ['Campo sonoro', 'Lp, Dc, constante de sala'],
    ['Modos propios', 'Schroeder, Bonello, Bolt'],
    ['Inteligibilidad', '%ALcons, logátomos'],
  ];
  return (
    <section id="software" className="py-24 sm:py-32 border-t border-ink/[0.06] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12">
        <Reveal className="lg:col-span-5 space-y-6">
          <Eyebrow index="05">SOFTWARE PROPIO</Eyebrow>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">POZOLE Suite</h2>
          <p className="text-ink/60 leading-relaxed">
            Nuestro simulador de acústica de recintos. Lo usamos en cada proyecto para predecir el comportamiento de la sala antes de construir — y está abierto para que lo explores.
          </p>
          <a
            {...linkProps('/suite')}
            className="group inline-flex items-center gap-2 rounded-full border border-ink/20 text-ink font-semibold px-6 py-3.5 hover:bg-ink hover:text-canvas transition-colors"
          >
            Abrir simulador
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </Reveal>
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-3">
          {modules.map(([t, d], i) => (
            <Reveal key={t} delay={i * 50} className="rounded-2xl border border-ink/10 bg-surface p-5 flex items-start gap-4">
              <span className="font-mono text-xs text-ink/30 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="font-semibold text-ink">{t}</div>
                <div className="text-sm text-ink/50 mt-0.5">{d}</div>
              </div>
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
